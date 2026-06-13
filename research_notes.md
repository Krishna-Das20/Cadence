# AI Command Center - Research Notes

This document contains a comprehensive synthesis of the research conducted on existing project management tools, the technical specifications for the Model Context Protocol (MCP) integration, database authorization paradigms, and real-time updates using Server-Sent Events (SSE).

---

## 1. Product Analysis

### Linear.app & Plane.so (Software & Dev Teams)
*   **Key Philosophy:** High performance, keyboard-first navigation, and highly opinionated workflows. Linear succeeds by reducing friction for developers (minimizing clicks, loading data instantly using local-first replication, and keeping the UI clean).
*   **Core Feature Inspiration:** The "Command Menu" (`Ctrl+K` or `Cmd+K`) to trigger any action instantly. Simple states: Backlog, Todo, In Progress, Completed. 

### Shortcut.com, Monday.com & Clickup.com (Agile & All-in-One)
*   **Shortcut:** Dedicated agile workflows (sprints, epics) without Jira's legacy weight. 
*   **Monday:** Heavy emphasis on visual color-coded boards, highly intuitive for non-technical users. 
*   **ClickUp:** Dense feature set (docs, whiteboards, goals) trying to replace all tools. Can feel overwhelming.
*   **Our Focus:** Merge the speed, keyboard shortcuts, and clean design of Linear with the customizability of Plane and Discord-style permissions to build a high-performance AI Command Center.

---

## 2. Multi-Tenant Role-Based Access Control (RBAC) & Hierarchy

We need a system that supports strict hierarchical controls alongside fine-grained, temporary overrides (like Discord).

### The Hierarchy
1.  **Super Admin (Platform Level)**
    *   Maximum of 3 Super Admins at a time.
    *   Absolute power. Can create/manage all Organizations.
    *   Can promote users to Admins, Presidents, or Directors.
    *   Can see all organizations on the platform.
2.  **Admin (Platform/Cross-Org Level)**
    *   Can see multiple organizations on the platform.
    *   Can change the President and Directors of any organization.
    *   Can take up the role of Director or President inside an organization.
3.  **President (Org Level)**
    *   One President per organization.
    *   Appointed by Super Admin or Admin.
    *   Can assign Directors and Managers.
    *   Can see all departments in the organization.
    *   Can transfer their President role to another member (choosing to leave or demote themselves to a regular member).
4.  **Director (Org/Department Level)**
    *   Multiple Directors per organization.
    *   Appointed by Super Admin, Admin, or President.
    *   Can see all departments in the organization.
    *   Can assign Managers.
    *   Can transfer their Director role to another member.
5.  **Manager (Department Level)**
    *   Appointed by President or Directors.
    *   Manages tasks, assignments, and due dates within their assigned department(s).
6.  **Member / Newbie (Department Level)**
    *   Can only view and interact with their assigned department's board by default (Option 1).
    *   Progress of other departments is completely hidden.

### Discord-Like Permission Overrides
*   Users can be granted specific permission keys directly (e.g. `VIEW_ALL_DEPTS` or `CREATE_TASKS`) regardless of their base role.
*   **Granular Validation Rule:** A user cannot grant or revoke any permission that they themselves do not possess. E.g., a Director cannot grant `MANAGE_ORGANISATION` if they don't have it.

---

## 3. Server-Sent Events (SSE) for Real-Time Role & Access Updates

To make role and permission updates instantaneous, we use Server-Sent Events (SSE) to push changes down to the active client.

*   **In-Memory Client Registry:** The Express server tracks active connections at `/api/realtime/stream?userId=xyz`.
*   **Event Propagation:** When an Admin alters a user's permissions or changes a President:
    1.  The database (MongoDB Atlas) is updated.
    2.  An event is pushed to the target user's active SSE connection.
    3.  If multiple web app instances exist (e.g. Vercel / serverless / multi-container), a pub-sub channel (like MongoDB Change Streams or Redis Pub/Sub) distributes the event across all active instances.
    4.  The client receives the event (e.g., `PERMISSION_CHANGE`) and instantly hot-reloads its permission context, altering UI visibility and access without forcing a page refresh.

---

## 4. Model Context Protocol (MCP) Integration

The MCP connection allows AI coding tools (Antigravity, Cursor, Claude Code, etc.) to query assigned tasks and update progress directly from the command line or code editor.

```
+------------------+         HTTP API (JWT Token)         +--------------------+
|  Developer's AI  | -----------------------------------> | Deployed Backend   |
| (Cursor / Claude)|                                      | (MongoDB Atlas)    |
+------------------+                                      +--------------------+
```

### The Authentication Flow (Option A - Automated Local Callback)
1.  **Trigger:** Developer runs `npx ai-cc-cli login` in their terminal.
2.  **Server Start:** The CLI spawns a temporary HTTP server on `http://localhost:8372`.
3.  **OAuth/Web Login:** The CLI opens the default web browser to the Command Center auth page: `https://ai-command-center.com/auth/mcp?callback=http://localhost:8372`.
4.  **Exchange:** After the user logs in, the web app redirects the browser to `http://localhost:8372?token=JWT_ACCESS_TOKEN`.
5.  **Save Credentials:** The local CLI server captures the token, saves it to `~/.ai-command-center/token.json`, and shuts down.
6.  **Auto-Config:** The CLI automatically registers the MCP server in `~/.cursor/mcp.json` or Claude Desktop configs.

### Exposed MCP Tools
*   `list_assigned_tasks`: Lists active tasks assigned to the developer (Todo, In Progress, Backlog).
*   `accept_task(taskId)`: Accepts an assigned task, moving it from Todo to In Progress.
*   `update_task_status(taskId, status)`: Transitions a task (e.g. to Completed).
*   `add_task_comment(taskId, text)`: Logs notes, debug updates, or links PRs/commits directly to the task.

---

## 5. Auto-Backlog Daemon

*   **Logic:** A recurring background cron job (`node-cron` or serverless scheduler) checks for tasks where `status != "COMPLETED"`, `dueDate < now`, and transitions them to `BACKLOG` status.
*   **Real-time Notify:** Trigger a real-time SSE event to the assignee and the department managers when a task slips into the backlog.
