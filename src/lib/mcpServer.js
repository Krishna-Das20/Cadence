import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import db from "./db.js";
import { verifyToken } from "./auth.js";
import sseHub from "./sseHub.js";

// Initialize the MCP Server
const server = new Server(
  {
    name: "ai-command-center-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to authenticate user from token parameter
async function authenticate(token) {
  if (!token) {
    throw new McpError(ErrorCode.InvalidParams, "Authentication token is required.");
  }
  const payload = await verifyToken(token);
  if (!payload) {
    throw new McpError(ErrorCode.InvalidRequest, "Unauthorized: Invalid or expired token.");
  }
  return payload;
}

// Set up list tools request handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_assigned_tasks",
        description: "List all tasks currently assigned to the authenticated user.",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "User JWT authentication token",
            },
          },
          required: ["token"],
        },
      },
      {
        name: "accept_task",
        description: "Accept an assigned task, changing its status to IN_PROGRESS.",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "User JWT authentication token",
            },
            taskId: {
              type: "string",
              description: "The unique ID of the task to accept",
            },
          },
          required: ["token", "taskId"],
        },
      },
      {
        name: "update_task_status",
        description: "Update the status of a task (e.g. to TODO, IN_PROGRESS, COMPLETED, or BACKLOG).",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "User JWT authentication token",
            },
            taskId: {
              type: "string",
              description: "The unique ID of the task to update",
            },
            status: {
              type: "string",
              enum: ["TODO", "IN_PROGRESS", "COMPLETED", "BACKLOG"],
              description: "The target status for the task",
            },
          },
          required: ["token", "taskId", "status"],
        },
      },
    ],
  };
});

// Set up call tool request handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_assigned_tasks": {
        const payload = await authenticate(args.token);
        const tasks = await db.task.findMany({
          where: { assigneeId: payload.userId },
          include: {
            assigner: { select: { name: true, email: true } },
            department: { select: { name: true } },
          },
          orderBy: { dueDate: "asc" },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      case "accept_task": {
        const payload = await authenticate(args.token);
        const { taskId } = args;

        // Verify task exists and is assigned to the user
        const task = await db.task.findUnique({
          where: { id: taskId },
          include: { department: { select: { organisationId: true } } },
        });

        if (!task) {
          throw new McpError(ErrorCode.InvalidParams, `Task with ID "${taskId}" not found.`);
        }

        if (task.assigneeId !== payload.userId) {
          throw new McpError(ErrorCode.InvalidRequest, "Forbidden: You are not the assignee for this task.");
        }

        const updatedTask = await db.task.update({
          where: { id: taskId },
          data: {
            status: "IN_PROGRESS",
            acceptedAt: new Date(),
          },
        });

        // Broadcast to SSE if anyone is listening (in-process fallback)
        const orgMembers = await db.orgMember.findMany({
          where: { organisationId: task.department.organisationId },
          select: { userId: true },
        });
        sseHub.broadcastToOrg(orgMembers, {
          type: "TASK_UPDATED",
          task: updatedTask,
        });

        return {
          content: [
            {
              type: "text",
              text: `Success: Task "${task.title}" accepted. Status set to IN_PROGRESS.`,
            },
          ],
        };
      }

      case "update_task_status": {
        const payload = await authenticate(args.token);
        const { taskId, status } = args;

        const task = await db.task.findUnique({
          where: { id: taskId },
          include: { department: { select: { organisationId: true } } },
        });

        if (!task) {
          throw new McpError(ErrorCode.InvalidParams, `Task with ID "${taskId}" not found.`);
        }

        // Authorization check: must be assignee or department manager
        const isAssignee = task.assigneeId === payload.userId;
        const isAssigner = task.assignerId === payload.userId;
        
        if (!isAssignee && !isAssigner) {
          throw new McpError(ErrorCode.InvalidRequest, "Forbidden: You are not authorized to update this task.");
        }

        // Restrict IN_PROGRESS transition to assignee only
        if (status === "IN_PROGRESS" && !isAssignee) {
          throw new McpError(ErrorCode.InvalidRequest, "Forbidden: Only the assigned user can move a task to Ongoing (IN_PROGRESS).");
        }

        const updateData = { status };
        if (status === "COMPLETED") {
          updateData.completedAt = new Date();
        } else if (status === "IN_PROGRESS" && !task.acceptedAt) {
          updateData.acceptedAt = new Date();
        }

        const updatedTask = await db.task.update({
          where: { id: taskId },
          data: updateData,
        });

        // Broadcast to SSE if anyone is listening (in-process fallback)
        const orgMembers = await db.orgMember.findMany({
          where: { organisationId: task.department.organisationId },
          select: { userId: true },
        });
        sseHub.broadcastToOrg(orgMembers, {
          type: "TASK_UPDATED",
          task: updatedTask,
        });

        return {
          content: [
            {
              type: "text",
              text: `Success: Task "${task.title}" status updated to ${status}.`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool name: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(ErrorCode.InternalError, error.message || "An unexpected error occurred.");
  }
});

export default server;
