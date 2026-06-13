import db from "@/lib/db";
import { checkDeptPermission, PERMISSIONS } from "@/lib/permissions";
import sseHub from "@/lib/sseHub";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * PATCH: Update a task's status or details.
 * Access: Assignee, Department Manager, or System Admin.
 */
export async function PATCH(req, { params }) {
  try {
    const { taskId } = await params;
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

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

    // Check permissions
    const isAssignee = task.assigneeId === userId;
    const isManager = await checkDeptPermission(userId, task.departmentId, PERMISSIONS.TASK_UPDATE);
    const isAdmin = systemAccess === "SUPER_ADMIN" || systemAccess === "ADMIN";

    if (!isAssignee && !isManager && !isAdmin) {
      throw new ApiError(403, "Forbidden: You are not authorized to update this task.");
    }

    const body = await req.json();
    const { title, description, status, assigneeId, dueDate } = body;

    // Enforce: Only the assigned user can transition a task to IN_PROGRESS (Ongoing)
    if (status === "IN_PROGRESS") {
      const targetAssigneeId = assigneeId !== undefined ? (assigneeId || null) : task.assigneeId;
      if (targetAssigneeId !== userId) {
        throw new ApiError(403, "Forbidden: Only the assigned user can move a task to the Ongoing (IN_PROGRESS) section.");
      }
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);

    if (status !== undefined) {
      const validStatuses = ["BACKLOG", "TODO", "IN_PROGRESS", "COMPLETED"];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, `Invalid task status: ${status}`);
      }
      updateData.status = status;

      // Handle lifecycle timestamps
      if (status === "COMPLETED") {
        updateData.completedAt = new Date();
      } else if (status === "IN_PROGRESS" && !task.acceptedAt) {
        updateData.acceptedAt = new Date();
      }
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
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
      message: `Task "${updatedTask.title}" was updated.`,
    });

    return handleApiResponse(updatedTask, "Task updated successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
