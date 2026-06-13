import db from "@/lib/db";
import { checkDeptPermission, PERMISSIONS } from "@/lib/permissions";
import sseHub from "@/lib/sseHub";
import { sendMail } from "@/lib/email";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * GET: List tasks.
 * Expects query parameters: departmentId or organisationId.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const organisationId = searchParams.get("organisationId");
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    let tasksQueryWhere = {};

    if (departmentId) {
      // 1. Verify user belongs to the department or organization
      const dept = await db.department.findUnique({
        where: { id: departmentId },
      });
      if (!dept) {
        throw new ApiError(404, "Department not found.");
      }

      if (systemAccess !== "SUPER_ADMIN" && systemAccess !== "ADMIN") {
        // Must belong to the org or the department
        const orgMember = await db.orgMember.findUnique({
          where: { userId_organisationId: { userId, organisationId: dept.organisationId } },
        });
        const deptMember = await db.deptMember.findUnique({
          where: { userId_departmentId: { userId, departmentId } },
        });

        if (!orgMember && !deptMember) {
          throw new ApiError(403, "Forbidden: You do not have access to this department.");
        }
      }

      tasksQueryWhere.departmentId = departmentId;
    } else if (organisationId) {
      // 2. Verify organization membership
      if (systemAccess !== "SUPER_ADMIN" && systemAccess !== "ADMIN") {
        const orgMember = await db.orgMember.findUnique({
          where: { userId_organisationId: { userId, organisationId } },
        });
        if (!orgMember) {
          throw new ApiError(403, "Forbidden: You do not have access to this organisation.");
        }
      }

      tasksQueryWhere.department = {
        organisationId: organisationId,
      };
    } else {
      // 3. Fallback: return tasks assigned to or created by the user
      tasksQueryWhere = {
        OR: [{ assigneeId: userId }, { assignerId: userId }],
      };
    }

    const tasks = await db.task.findMany({
      where: tasksQueryWhere,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        assigner: {
          select: { id: true, name: true, email: true },
        },
        department: {
          select: { id: true, name: true, organisationId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return handleApiResponse(tasks, "Tasks retrieved successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST: Create a task.
 * Requires TASK_CREATE permission in the department.
 */
export async function POST(req) {
  try {
    // Enforce 16kb payload limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      throw new ApiError(413, "Payload too large. Limit is 16kb.");
    }

    const userId = req.headers.get("x-user-id");
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const body = await req.json();
    const { departmentId, title, description, assigneeId, dueDate } = body;

    if (!departmentId || !title || !dueDate) {
      throw new ApiError(400, "departmentId, title, and dueDate are required.");
    }

    // Check permission
    const hasPermission = await checkDeptPermission(userId, departmentId, PERMISSIONS.TASK_CREATE);
    if (!hasPermission) {
      throw new ApiError(403, "Forbidden: You do not have permission to create tasks in this department.");
    }

    // Verify assignee exists (if provided)
    if (assigneeId) {
      const assigneeExists = await db.user.findUnique({ where: { id: assigneeId } });
      if (!assigneeExists) {
        throw new ApiError(404, "Assignee user not found.");
      }
    }

    const newTask = await db.task.create({
      data: {
        departmentId,
        title,
        description: description || "",
        assigneeId: assigneeId || null,
        assignerId: userId,
        dueDate: new Date(dueDate),
        status: "TODO",
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

    // Notify assignee via SSE if assigned
    if (assigneeId && newTask.assignee) {
      sseHub.sendToUser(assigneeId, {
        type: "TASK_ASSIGNED",
        task: newTask,
        message: `You have been assigned a new task: "${title}".`,
      });

      // Send email using Resend
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
        await sendMail(
          newTask.assignee.email,
          `New Task Assigned: ${title}`,
          `<h1>Task Assignment</h1>
           <p>Hi ${newTask.assignee.name},</p>
           <p>You have been assigned a new task in Cadence:</p>
           <p><strong>Title:</strong> ${title}</p>
           <p><strong>Description:</strong> ${description || "No description provided."}</p>
           <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
           <p>View and accept this task on your <a href="${appUrl}/dashboard">Cadence Dashboard</a>.</p>`
        );
      } catch (err) {
        console.error("[Task Email Error]", err);
      }
    }

    // Broadcast update to all org members active connections
    const dept = await db.department.findUnique({
      where: { id: departmentId },
      select: { organisationId: true },
    });
    if (dept) {
      const orgMembers = await db.orgMember.findMany({
        where: { organisationId: dept.organisationId },
        select: { userId: true },
      });
      sseHub.broadcastToOrg(orgMembers, {
        type: "TASK_CREATED",
        task: newTask,
      });
    }

    return handleApiResponse(newTask, "Task created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
