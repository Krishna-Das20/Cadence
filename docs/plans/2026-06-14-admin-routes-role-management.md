# Admin Routes & Workspace/User Role Management Implementation Plan

> **For Antigravity:** REQUIRED SUB-SKILL: Load executing-plans to implement this plan task-by-task.

**Goal:** Create separate dedicated routes for admins/super-admins to manage all workspaces and platform users/admin promotions, while restricting the personal dashboard to only show workspaces where the user is an explicit member.

**Architecture:** Implement `/admin/workspaces` and `/admin/users` as new Next.js pages with a premium monochromatic sidebar matching the dashboard. Restrict the `/api/orgs` GET endpoint to only return workspaces where the user is explicitly in the membership table, and create `/api/admin/orgs` and `/api/orgs/[id]` API handlers to perform administrative CRUD operations.

**Tech Stack:** Next.js (App Router), Prisma Client (MongoDB), Vanilla CSS.

---

### Task 1: API Route Extensions

**Files:**
- Create: `src/app/api/admin/orgs/route.js`
- Create: `src/app/api/orgs/[id]/route.js`
- Modify: `src/app/api/orgs/route.js:15-65`

**Step 1: Write backend tests or verify endpoint requests**
Verify that `/api/orgs` restricted query works and returns only joined workspaces.
Ensure `x-user-id` and `x-user-access` are checked properly.

**Step 2: Verify custom org CRUD logic**
- Fetch all organizations through `/api/admin/orgs` (Admin only).
- Edit organization name and description through `PUT /api/orgs/[id]`.
- Cascade delete organization through `DELETE /api/orgs/[id]`.

---

### Task 2: Shared Sidebar Navigation Update

**Files:**
- Modify: `src/app/dashboard/page.js:585-600`

**Step 1: Update Dashboard Sidebar**
Import `Link` from `next/link` if not already present.
Replace the "Platform Settings" modal button with direct navigation links:
- `🏢 Manage Workspaces` (`/admin/workspaces`)
- `👤 Manage Users & Admins` (`/admin/users`)

**Step 2: Commit**
```bash
git add src/app/dashboard/page.js
git commit -m "feat: add admin navigation links to dashboard sidebar"
```

---

### Task 3: Admin Workspaces Management Page

**Files:**
- Create: `src/app/admin/workspaces/page.js`

**Step 1: Implement Workspace Management UI**
Create a new Next.js page that contains:
- Left Sidebar: Matching Apple-style monochromatic sidebar with user info card, navigation links, and back to dashboard link (`📊 Back to Dashboard`).
- Main Area: Glassmorphic panel displaying a table of all organizations, with search filters.
- Create Workspace form/modal.
- Edit Workspace modal (submits `PUT /api/orgs/[orgId]`).
- Delete Workspace button with double-confirmation modal (submits `DELETE /api/orgs/[orgId]`).
- **Enter/Join Workspace** action:
  - Hits `POST /api/orgs/[orgId]/members` to invite/add the logged-in admin user to the workspace as a `DIRECTOR` (if they are not already a member) and redirects them to `/dashboard` so it selected and loaded in their workspace dashboard.

**Step 2: Commit**
```bash
git add src/app/admin/workspaces/page.js
git commit -m "feat: implement admin workspaces management route"
```

---

### Task 4: Admin Users & Role Promotion Page

**Files:**
- Create: `src/app/admin/users/page.js`

**Step 1: Implement Admin User Promotions UI**
Create a new Next.js page that contains:
- Left Sidebar: Matching Apple-style monochromatic sidebar.
- Main Area: Glassmorphic panel displaying all platform users, their names, emails, system roles, and date registered.
- Search filter.
- Promotions panel (visible only to `SUPER_ADMIN`):
  - A Super Admin can promote/demote users: `USER` -> `ADMIN` -> `SUPER_ADMIN`.
  - Disable action buttons for user's own card to prevent self-lockout.
  - If user access is `ADMIN` (not `SUPER_ADMIN`), display role column and search controls but disable promotion buttons.

**Step 2: Commit**
```bash
git add src/app/admin/users/page.js
git commit -m "feat: implement admin users and role promotion route"
```

---

### Task 5: Build Verification & Deployment

**Step 1: Verify Next.js build compilation**
Run: `npm run build`
Expected: Compiled successfully with no typescript or router schema errors.

**Step 2: Push changes to GitHub**
Run: `git push origin main`
Expected: Changes pushed successfully to repository.
