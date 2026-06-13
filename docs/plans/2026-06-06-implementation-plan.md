# AI Command Center Implementation Plan

> **For Antigravity:** REQUIRED SUB-SKILL: Load executing-plans to implement this plan task-by-task.

**Goal:** Build a developer-focused, multi-tenant AI Command Center Next.js application with a Kanban board, Discord-like role/permission override hierarchy, SSE updates, and an MCP server integration.

**Architecture:** A Next.js (App Router) full-stack application with MongoDB Atlas (via Prisma). It exposes REST APIs for authentication, organization management, department configuration, and task operations, alongside a dedicated SSE real-time sync hub and local CLI-driven MCP tools.

**Tech Stack:** Next.js (App Router), Prisma, MongoDB Atlas, JSON Web Tokens (JWT), Server-Sent Events, `@modelcontextprotocol/sdk`, `@prisma/client`.

---

## Path Convention
All paths in this plan are relative to the project root: `c:/Users/KIIT/Downloads/FED/AI Command Center`.

---

## Tasks

### Task 1: Next.js Project Scaffolding
**Files:**
* Create: `package.json` (via next-app CLI)
* Create: `src/app/page.js`
* Create: `src/app/globals.css`

**Step 1: Run project initialization**
Run the non-interactive Next.js setup inside the target folder:
Run: `npx create-next-app@latest ./ --js --eslint --app --src-dir --use-npm --disable-git --yes` in `c:/Users/KIIT/Downloads/FED/AI Command Center`
Expected: Next.js files scaffolded successfully.

**Step 2: Start dev server to verify setup**
Run: `npm run dev` in `c:/Users/KIIT/Downloads/FED/AI Command Center`
Expected: Dev server runs on port 3000.

**Step 3: Commit**
```bash
git add .
git commit -m "chore: scaffold Next.js app in AI Command Center"
```

---

### Task 2: CSS Theme & Core Layout Setup
**Files:**
* Modify: `src/app/globals.css`
* Modify: `src/app/layout.js`

**Step 1: Write globals.css with premium styling variables**
Implement clean dark/light mode glassmorphic styling, custom scrollbars, and premium typography using vanilla CSS variables.
Modify: `src/app/globals.css` with the CSS styling system.

**Step 2: Clean up layout.js**
Modify: `src/app/layout.js` to load the custom styling and render a layout container.

**Step 3: Verify style updates**
Run: Start dev server and check browser rendering.
Expected: Pages load without styling errors.

**Step 4: Commit**
```bash
git add src/app/globals.css src/app/layout.js
git commit -m "style: configure global CSS theme and core layout"
```

---

### Task 3: Prisma & MongoDB Atlas Setup
**Files:**
* Create: `prisma/schema.prisma`
* Create: `src/lib/db.js`
* Modify: `.env`

**Step 1: Configure Prisma schema folder preview and MongoDB**
Create: `prisma/schema.prisma`
```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
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

**Step 2: Generate Prisma Client & Push to DB**
Configure `.env` with MongoDB Atlas connection string.
Run: `npx prisma generate && npx prisma db push`
Expected: Prisma client generated and database synchronized successfully.

**Step 3: Setup Database Client Helper**
Create: `src/lib/db.js` exporting a singleton PrismaClient instance.

**Step 4: Commit**
```bash
git add prisma/schema.prisma src/lib/db.js
git commit -m "feat: setup Prisma models and MongoDB Atlas connection"
```

---

### Task 4: Authentication & Middleware API
**Files:**
* Create: `src/app/api/auth/register/route.js`
* Create: `src/app/api/auth/login/route.js`
* Create: `src/lib/auth.js`
* Create: `src/middleware.js`

**Step 1: Create JWT utility**
Create: `src/lib/auth.js` to handle token signing, validation, and user encryption.

**Step 2: Create Register Route**
Create: `src/app/api/auth/register/route.js` allowing registration. Auto-promote first 3 registered users to `SUPER_ADMIN` if the DB is empty (to seed platform).

**Step 3: Create Login Route**
Create: `src/app/api/auth/login/route.js` validating password and returning a JWT.

**Step 4: Create Next.js Auth Middleware**
Create: `src/middleware.js` to protect routing and inject auth credentials into headers.

**Step 5: Verify Auth endpoints**
Run API tests using curl.
Expected: Login/Register succeed and return proper tokens.

**Step 6: Commit**
```bash
git add src/lib/auth.js src/app/api/auth src/middleware.js
git commit -m "feat: add user registration, login, and auth middleware"
```

---

### Task 5: Server-Sent Events (SSE) Real-Time Hub
**Files:**
* Create: `src/app/api/realtime/stream/route.js`
* Create: `src/lib/sseHub.js`

**Step 1: Create Global Connection Hub**
Create: `src/lib/sseHub.js` to hold active user response streams in-memory and dispatch notifications.

**Step 2: Create SSE Route**
Create: `src/app/api/realtime/stream/route.js` to initiate SSE client connections.

**Step 3: Commit**
```bash
git add src/lib/sseHub.js src/app/api/realtime/stream/route.js
git commit -m "feat: implement real-time SSE stream registry"
```

---

### Task 6: Custom Permission Enforcer & Organisation API
**Files:**
* Create: `src/lib/permissions.js`
* Create: `src/app/api/orgs/route.js`
* Create: `src/app/api/orgs/[id]/members/route.js`

**Step 1: Write permissions helper**
Create: `src/lib/permissions.js` defining hierarchical roles validation and direct overrides. Implements: "Cannot grant permissions actor does not possess."

**Step 2: Implement Orgs API**
Create: `src/app/api/orgs/route.js` (POST to create org, GET to list).

**Step 3: Implement Org Member & Overrides API**
Create: `src/app/api/orgs/[id]/members/route.js` (PUT to update roles/overrides, POST to invite). Triggers SSE updates on role change.

**Step 4: Commit**
```bash
git add src/lib/permissions.js src/app/api/orgs
git commit -m "feat: add multi-tenant organization API and permission enforcers"
```

---

### Task 7: Department & Task Management API
**Files:**
* Create: `src/app/api/orgs/[id]/departments/route.js`
* Create: `src/app/api/tasks/route.js`
* Create: `src/app/api/tasks/[taskId]/accept/route.js`

**Step 1: Department CRUD**
Create: `src/app/api/orgs/[id]/departments/route.js` (GET/POST) to split organisations into departments.

**Step 2: Tasks CRUD**
Create: `src/app/api/tasks/route.js` (POST to create tasks, GET to list). Enforces visibility constraints.

**Step 3: Task Acceptance**
Create: `src/app/api/tasks/[taskId]/accept/route.js` (POST) to shift status to `IN_PROGRESS`.

**Step 4: Commit**
```bash
git add src/app/api/orgs/[id]/departments src/app/api/tasks
git commit -m "feat: add department configuration and task lifecycles"
```

---

### Task 8: Auto-Backlog Cron Job
**Files:**
* Create: `src/lib/backlogDaemon.js`
* Modify: `src/app/layout.js` (to kickstart daemon in development)

**Step 1: Implement backlog scanner**
Create: `src/lib/backlogDaemon.js` that scans tasks daily/hourly and transitions overdue tasks to `BACKLOG`.

**Step 2: Commit**
```bash
git add src/lib/backlogDaemon.js
git commit -m "feat: implement auto-backlog cron daemon"
```

---

### Task 9: MCP Developer CLI Setup
**Files:**
* Create: `bin/ai-cc-cli.js`
* Create: `src/lib/mcpServer.js`

**Step 1: Write CLI binary**
Create: `bin/ai-cc-cli.js` containing `login` (OAuth port callback listener) and `start-mcp` (stdio transport server).

**Step 2: Write MCP Server tools**
Create: `src/lib/mcpServer.js` integrating `@modelcontextprotocol/sdk` to define `list_assigned_tasks`, `accept_task`, and `update_task_status`.

**Step 3: Commit**
```bash
git add bin/ai-cc-cli.js src/lib/mcpServer.js
git commit -m "feat: implement CLI developer tool and stdio MCP server"
```

---

### Task 10: Frontend Kanban Board & UI Components
**Files:**
* Create: `src/app/dashboard/page.js`
* Create: `src/components/KanbanBoard.js`
* Create: `src/components/CommandMenu.js`

**Step 1: Create Command Menu**
Create: `src/components/CommandMenu.js` (`Ctrl+K` key handler) for fast navigation.

**Step 2: Create Kanban Board Component**
Create: `src/components/KanbanBoard.js` implementing a gorgeous CSS Grid layout with columns: Todo, Ongoing, Completed, Backlog.

**Step 3: Create Main Dashboard Page**
Create: `src/app/dashboard/page.js` hooking up SSE streams, org management modals, and the Kanban board.

**Step 4: Commit**
```bash
git add src/app/dashboard src/components
git commit -m "feat: build Kanban dashboard, command menu, and management UI"
```
