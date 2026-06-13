import db from "@/lib/db";
import { checkDeptPermission, PERMISSIONS } from "@/lib/permissions";
import sseHub from "@/lib/sseHub";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * POST: Accept a task.
 * Shifts task status to IN_PROGRESS and sets acceptedAt.
 * Access: Assignee of the task, or Department Manager, or System Admin.
 */
export async function POST(req, { params }) {
  try {
    const { taskId } = await params;
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    // Find the task
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        department: {
          select: { id: true, organisationId: true },
        },
      },
    });

    if (!task) {
      throw new ApiError(404, "Task not found.");
    }

    // Only the assigned user is authorized to accept this task
    const isAssignee = task.assigneeId === userId;

    if (!isAssignee) {
      throw new ApiError(403, "Forbidden: Only the assigned user can accept this task.");
    }

    // Update status to IN_PROGRESS
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        status: "IN_PROGRESS",
        acceptedAt: new Date(),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        assigner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Broadcast SSE update to all organization members
    const orgMembers = await db.orgMember.findMany({
      where: { organisationId: task.department.organisationId },
      select: { userId: true },
    });

    sseHub.broadcastToOrg(orgMembers, {
      type: "TASK_UPDATED",
      task: updatedTask,
      message: `Task "${updatedTask.title}" was accepted.`,
    });

    return handleApiResponse(updatedTask, "Task accepted successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
