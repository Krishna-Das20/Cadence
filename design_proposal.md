# AI Command Center - Product Requirements & Technical Design Proposal

This document outlines the product requirements, system architecture, database models, permission schemas, real-time sync mechanisms, and Developer MCP integrations for the **AI Command Center** platform.

---

## 1. Product Overview

The **AI Command Center** is a high-performance, developer-focused project management platform. It combines the speed, keyboard-centric navigation, and minimalist design of tools like **Linear** and **Plane** with a highly customizable, hierarchical permission system inspired by **Discord**. 

A core differentiator is its **Model Context Protocol (MCP)** integration, allowing developers to fetch tasks, accept work, and update task statuses directly inside their AI coding environments (e.g., Cursor, Claude Code, Antigravity) via a secure CLI login.

---

## 2. Core Features & Task Lifecycle

### Multi-Tenant Structure
*   **Organizations:** The top-level container (e.g., a company or open-source community).
*   **Departments:** Sub-divisions within an organization (e.g., Technical, Creative, Marketing, Operations, HR).
*   **Kanban Board:** Each department has a board tracking tasks through four primary states:
    1.  `TODO`: Tasks created by leaders/managers and awaiting assignee acceptance.
    2.  `IN_PROGRESS`: Tasks currently being worked on.
    3.  `COMPLETED`: Finished tasks.
    4.  `BACKLOG`: Tasks that missed their due date.

### Task Transition Rules
*   **Assignment & Acceptance:** A task is assigned to a member. The task remains in the `TODO` state until the member explicitly **accepts** the task (either via the Web UI or MCP), which automatically moves it to `IN_PROGRESS`.
*   **Auto-Backlog Daemon:** A background cron job runs hourly. Any task in `TODO` or `IN_PROGRESS` whose `dueDate` is in the past is automatically transitioned to the `BACKLOG` state, and a notification is sent to the assignee and department manager.

---

## 3. Strict Role & Permission Hierarchy

We implement a multi-layered hierarchy that combines structural roles with granular, Discord-like permission overrides.

```
       [ Super Admin ] (Max 3, Platform-wide)
              |
          [ Admin ] (Platform-wide)
              |
        [ President ] (1 per Org)
              |
        [ Directors ] (Multiple per Org)
              |
         [ Managers ] (Department-level)
              |
      [ Members / Guests ] (Department-level)
```

### Roles and Capabilities
1.  **Super Admin (Platform Level)**
    *   Maximum of **3 users** at any time.
    *   Absolute platform power. Can create new Admins, Presidents, and Directors.
    *   Can view all Organizations on the platform.
2.  **Admin (Platform Level)**
    *   Can see all organizations on the platform.
    *   Can replace the President or Directors of an organization at any time.
    *   Can take on the role of President or Director inside an organization.
3.  **President (Organization Level)**
    *   Exactly **1 user** per organization.
    *   Appointed by Super Admin or Admin.
    *   Can assign Directors and Managers.
    *   Has full visibility over all departments in the organization.
    *   Can transfer the "President" role to another member (choosing to either leave the org or demote themselves to a regular member).
4.  **Director (Organization Level)**
    *   Multiple Directors permitted per organization.
    *   Appointed by Super Admin, Admin, or President.
    *   Has full visibility over all departments in the organization.
    *   Can assign Managers.
    *   Can transfer their Director role to another member.
5.  **Manager (Department Level)**
    *   Appointed by President or Directors.
    *   Can create, edit, assign, and delete tasks in their assigned department(s).
6.  **Members / Newbies (Department Level)**
    *   Can only view and interact with their assigned department's board.
    *   Boards of other departments are completely invisible (unless explicit override permissions are granted).

### Granular Permission Overrides
Administrators, Presidents, and Directors can grant specific permission overrides directly to a user without changing their overall role. 
*   **Safety Rule:** A user cannot grant or revoke any permission that they themselves do not possess.
*   *Example:* A Director who lacks the `MANAGE_ORGANISATION` permission cannot grant `MANAGE_ORGANISATION` to a Manager.

---

## 4. Database Schema Design (Prisma + MongoDB)

The schema utilizes MongoDB ObjectIds and implements explicit relation linking.

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

enum SystemAccess {
  SUPER_ADMIN
  ADMIN
  USER
}

enum OrgRole {
  PRESIDENT
  DIRECTOR
  MEMBER
}

enum DeptRole {
  MANAGER
  MEMBER
}

enum TaskStatus {
  BACKLOG
  TODO
  IN_PROGRESS
  COMPLETED
}

model User {
  id               String             @id @default(auto()) @map("_id") @db.ObjectId
  email            String             @unique
  name             String
  password         String
  systemAccess     SystemAccess       @default(USER)
  orgMemberships   OrgMember[]
  deptMemberships  DeptMember[]
  assignedTasks    Task[]             @relation("TaskAssignee")
  assignedByTasks  Task[]             @relation("TaskAssigner")
  apiTokens        ApiToken[]
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
}

model Organisation {
  id          String      @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String
  members     OrgMember[]
  departments Department[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model OrgMember {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  userId         String       @db.ObjectId
  organisationId String       @db.ObjectId
  orgRole        OrgRole      @default(MEMBER)
  
  // Discord-like overrides: list of permission strings
  permissionsAllowed String[] @default([])

  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organisation   Organisation @relation(fields: [organisationId], references: [id], onDelete: Cascade)

  @@unique([userId, organisationId])
}

model Department {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  organisationId String       @db.ObjectId
  name           String
  description    String
  members        DeptMember[]
  tasks          Task[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organisation   Organisation @relation(fields: [organisationId], references: [id], onDelete: Cascade)
}

model DeptMember {
  id           String     @id @default(auto()) @map("_id") @db.ObjectId
  userId       String     @db.ObjectId
  departmentId String     @db.ObjectId
  deptRole     DeptRole   @default(MEMBER)
  
  // Department-level overrides (e.g. ["CREATE_TASKS", "ASSIGN_TASKS"])
  permissionsAllowed String[] @default([])

  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  @@unique([userId, departmentId])
}

model Task {
  id           String     @id @default(auto()) @map("_id") @db.ObjectId
  departmentId String     @db.ObjectId
  title        String
  description  String
  status       TaskStatus @default(TODO)
  assigneeId   String?    @db.ObjectId
  assignerId   String     @db.ObjectId
  dueDate      DateTime
  acceptedAt   DateTime?
  completedAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  assignee     User?      @relation("TaskAssignee", fields: [assigneeId], references: [id])
  assigner     User       @relation("TaskAssigner", fields: [assignerId], references: [id])
}

model ApiToken {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  userId      String   @db.ObjectId
  tokenHash   String   @unique
  name        String
  createdAt   DateTime @default(now())
  expiresAt   DateTime

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 5. Instantaneous Access Updates (Server-Sent Events)

To ensure that role updates and permission overrides take effect instantly across all client browsers without page reloads, the platform uses a Server-Sent Events (SSE) sync registry.

### Flow Architecture
1.  **Client Connection:** The React client initiates an SSE connection upon login:
    `const eventSource = new EventSource('/api/realtime/stream');`
2.  **Server Registry:** The Express backend caches active connection streams in memory:
    `const activeConnections = new Map<string, Response>();` (keyed by `userId`).
3.  **Real-time Push:** When an Admin alters a user's role or permission overrides:
    *   The backend saves the updates to MongoDB.
    *   It identifies if the target user has an active connection in the `activeConnections` map.
    *   It pushes a lightweight payload down the SSE stream:
        `data: { "type": "PERMISSIONS_UPDATED", "userId": "user_123" }`
4.  **Client Hot-reload:** The client React app receives this message, immediately invalidates its permissions cache (re-fetching the updated permissions silently in the background), and updates the UI (menu options, visibility of departments) on the fly.
5.  **Multi-Instance Scaling:** If deployed on multiple server instances, a Redis Pub/Sub channel or MongoDB Change Stream is used to broadcast permission updates to all servers, ensuring the event reaches whichever server holds the active user's connection.

---

## 6. Developer MCP (Model Context Protocol) Integration

The platform includes a CLI tool (`ai-cc-cli`) that serves as a bridge between your local AI IDE (Cursor, Claude Code, Antigravity) and the remote Command Center.

### Setup and Authentication Flow (Option A)
1.  **Command Execution:** The developer runs `npx ai-cc-cli login` in their local terminal.
2.  **Temporary Server:** The CLI initializes a temporary callback server on `http://localhost:8372`.
3.  **Authentication:** The CLI automatically opens the developer's default browser to the web app's login portal:
    `https://ai-command-center.com/auth/mcp?callback=http://localhost:8372`
4.  **Token Exchange:** Once the developer logs in, the web app redirects the browser to `http://localhost:8372?token=JWT_ACCESS_TOKEN`.
5.  **Save Credentials:** The local CLI server captures the token, saves it securely to `~/.ai-command-center/token.json`, and shuts down.
6.  **Auto-Configuration:** The CLI appends the MCP server configuration block to the client configuration file (e.g. `~/.cursor/mcp.json` or Claude Desktop's config file).

### Exposed MCP Tools for AI Agents
*   `list_assigned_tasks`: Lists all active tasks assigned to the authenticated user.
*   `accept_task(taskId)`: Accepts a task in `TODO` state, moving it to `IN_PROGRESS` and setting the `acceptedAt` timestamp.
*   `update_task_status(taskId, status)`: Transitions a task to `COMPLETED`.
*   `add_task_comment(taskId, text)`: Logs notes, debug updates, or links commits directly to the task.
