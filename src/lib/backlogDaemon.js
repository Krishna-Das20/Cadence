import db from "./db";
import sseHub from "./sseHub";

let daemonStarted = false;
let checkIntervalId = null;

export async function scanAndBacklogOverdueTasks() {
  try {
    const now = new Date();
    
    // Find tasks that are overdue and not completed/backlogged
    const overdueTasks = await db.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["COMPLETED", "BACKLOG"] },
      },
      include: {
        department: {
          select: { organisationId: true },
        },
      },
    });

    if (overdueTasks.length === 0) return;

    console.log(`[BacklogDaemon] Found ${overdueTasks.length} overdue tasks. Updating to BACKLOG...`);

    // Perform updates
    for (const task of overdueTasks) {
      const updatedTask = await db.task.update({
        where: { id: task.id },
        data: { status: "BACKLOG" },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          assigner: { select: { id: true, name: true, email: true } },
        },
      });

      // Fetch organization members to broadcast SSE update
      const orgMembers = await db.orgMember.findMany({
        where: { organisationId: task.department.organisationId },
        select: { userId: true },
      });

      sseHub.broadcastToOrg(orgMembers, {
        type: "TASK_UPDATED",
        task: updatedTask,
        message: `Task "${updatedTask.title}" has been moved to BACKLOG as it is overdue.`,
      });
    }
  } catch (error) {
    console.error("[BacklogDaemon] Error scanning overdue tasks:", error);
  }
}

export function startBacklogDaemon(intervalMs = 60000) {
  if (daemonStarted) return;
  daemonStarted = true;

  console.log(`[BacklogDaemon] Starting overdue task scanner daemon (interval: ${intervalMs}ms)...`);
  
  // Run scan immediately on start
  scanAndBacklogOverdueTasks();

  // Schedule periodic scans
  checkIntervalId = setInterval(scanAndBacklogOverdueTasks, intervalMs);
}

export function stopBacklogDaemon() {
  if (checkIntervalId) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
  }
  daemonStarted = false;
  console.log("[BacklogDaemon] Overdue task scanner daemon stopped.");
}
