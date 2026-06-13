import db from "./db";

// Standard defined permissions
export const PERMISSIONS = {
  ORG_EDIT: "ORG_EDIT",
  ORG_MANAGE_ROLES: "ORG_MANAGE_ROLES",
  ORG_DELETE: "ORG_DELETE",
  DEPT_CREATE: "DEPT_CREATE",
  DEPT_EDIT: "DEPT_EDIT",
  DEPT_MANAGE_ROLES: "DEPT_MANAGE_ROLES",
  TASK_CREATE: "TASK_CREATE",
  TASK_EDIT: "TASK_EDIT",
  TASK_ASSIGN: "TASK_ASSIGN",
  TASK_UPDATE: "TASK_UPDATE",
};

/**
 * Checks if a user has a specific organization-level permission.
 */
export async function checkOrgPermission(userId, orgId, requiredPermission) {
  // 1. Fetch user to check global System Access
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { systemAccess: true },
  });

  if (!user) return false;

  // Global admins have all permissions
  if (user.systemAccess === "SUPER_ADMIN" || user.systemAccess === "ADMIN") {
    return true;
  }

  // 2. Fetch organisation membership details
  const membership = await db.orgMember.findUnique({
    where: {
      userId_organisationId: {
        userId,
        organisationId: orgId,
      },
    },
  });

  if (!membership) return false;

  // Organisation PRESIDENT inherits all permissions for that org
  if (membership.orgRole === "PRESIDENT") {
    return true;
  }

  // Organisation DIRECTOR inherits standard management permissions
  if (membership.orgRole === "DIRECTOR") {
    const directorPermissions = [
      PERMISSIONS.ORG_EDIT,
      PERMISSIONS.ORG_MANAGE_ROLES,
      PERMISSIONS.DEPT_CREATE,
      PERMISSIONS.DEPT_EDIT,
      PERMISSIONS.TASK_CREATE,
      PERMISSIONS.TASK_EDIT,
      PERMISSIONS.TASK_ASSIGN,
      PERMISSIONS.TASK_UPDATE,
    ];
    if (directorPermissions.includes(requiredPermission)) {
      return true;
    }
  }

  // Check direct overrides (Discord-style permissionsAllowed list)
  if (membership.permissionsAllowed.includes(requiredPermission)) {
    return true;
  }

  return false;
}

/**
 * Checks if a user has a specific department-level permission.
 */
export async function checkDeptPermission(userId, deptId, requiredPermission) {
  // 1. Check global system access
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { systemAccess: true },
  });

  if (!user) return false;

  if (user.systemAccess === "SUPER_ADMIN" || user.systemAccess === "ADMIN") {
    return true;
  }

  // Fetch department to get organisation boundary
  const dept = await db.department.findUnique({
    where: { id: deptId },
    select: { organisationId: true },
  });

  if (!dept) return false;

  // 2. Inherit permissions from Organisation level
  // If user is Org PRESIDENT or DIRECTOR, they have full control over all departments
  const orgMembership = await db.orgMember.findUnique({
    where: {
      userId_organisationId: {
        userId,
        organisationId: dept.organisationId,
      },
    },
  });

  if (orgMembership) {
    if (orgMembership.orgRole === "PRESIDENT") return true;
    if (orgMembership.orgRole === "DIRECTOR") {
      const directorDeptPermissions = [
        PERMISSIONS.DEPT_EDIT,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_EDIT,
        PERMISSIONS.TASK_ASSIGN,
        PERMISSIONS.TASK_UPDATE,
      ];
      if (directorDeptPermissions.includes(requiredPermission)) {
        return true;
      }
    }
  }

  // 3. Check Department level details
  const deptMembership = await db.deptMember.findUnique({
    where: {
      userId_departmentId: {
        userId,
        departmentId: deptId,
      },
    },
  });

  if (!deptMembership) return false;

  // Department MANAGER has full rights within the department
  if (deptMembership.deptRole === "MANAGER") {
    return true;
  }

  // Check direct overrides at the department level
  if (deptMembership.permissionsAllowed.includes(requiredPermission)) {
    return true;
  }

  return false;
}

/**
 * Validates whether an actor can grant a list of permissions to another user.
 * Implements: "Cannot grant permissions actor does not possess."
 */
export async function canActorGrantOrgPermissions(actorId, orgId, targetPermissions) {
  // Check global system access
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { systemAccess: true },
  });

  if (actor && (actor.systemAccess === "SUPER_ADMIN" || actor.systemAccess === "ADMIN")) {
    return true;
  }

  // Check if they are president
  const actorMembership = await db.orgMember.findUnique({
    where: {
      userId_organisationId: {
        userId: actorId,
        organisationId: orgId,
      },
    },
  });

  if (!actorMembership) return false;
  if (actorMembership.orgRole === "PRESIDENT") return true;

  // For every permission in the list, verify the actor actually possesses it
  for (const perm of targetPermissions) {
    const hasPerm = await checkOrgPermission(actorId, orgId, perm);
    if (!hasPerm) return false;
  }

  return true;
}
