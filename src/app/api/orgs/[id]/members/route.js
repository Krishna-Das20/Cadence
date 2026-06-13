import db from "@/lib/db";
import { checkOrgPermission, canActorGrantOrgPermissions, PERMISSIONS } from "@/lib/permissions";
import sseHub from "@/lib/sseHub";
import { sendMail } from "@/lib/email";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * POST: Add/Invite a member to the organisation.
 * Requires ORG_MANAGE_ROLES permission.
 */
export async function POST(req, { params }) {
  try {
    const { id: orgId } = await params;
    const actorId = req.headers.get("x-user-id");

    if (!actorId) {
      throw new ApiError(401, "Unauthorized");
    }

    // Check permission
    const hasPermission = await checkOrgPermission(actorId, orgId, PERMISSIONS.ORG_MANAGE_ROLES);
    if (!hasPermission) {
      throw new ApiError(403, "Forbidden: You do not have permission to manage organisation members.");
    }

    const body = await req.json();
    const { email, orgRole } = body;

    if (!email) {
      throw new ApiError(400, "User email is required.");
    }

    // Find target user by email
    const targetUser = await db.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      throw new ApiError(404, "User not found. They must register an account first.");
    }

    // Check if already a member
    const existingMember = await db.orgMember.findUnique({
      where: {
        userId_organisationId: {
          userId: targetUser.id,
          organisationId: orgId,
        },
      },
    });

    if (existingMember) {
      throw new ApiError(409, "User is already a member of this organisation.");
    }

    // Add member
    const newMember = await db.orgMember.create({
      data: {
        userId: targetUser.id,
        organisationId: orgId,
        orgRole: orgRole || "MEMBER",
        permissionsAllowed: [],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            systemAccess: true,
          },
        },
      },
    });

    // Notify the user via SSE
    sseHub.sendToUser(targetUser.id, {
      type: "ORG_INVITE",
      orgId,
      message: `You have been added to organisation.`,
    });

    // Send invitation email using Resend
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
      await sendMail(
        targetUser.email,
        `Workspace Invitation - Cadence`,
        `<h1>Welcome to Cadence</h1>
         <p>Hi ${targetUser.name},</p>
         <p>You have been added to the workspace <strong>${orgId}</strong> as a <strong>${orgRole || "MEMBER"}</strong>.</p>
         <p>Log in to your account at <a href="${appUrl}/dashboard">${appUrl}</a> to view the workspace.</p>`
      );
    } catch (err) {
      console.error("[Invite Email Error]", err);
    }

    return handleApiResponse(newMember, "Member added successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT: Update member's role or permission overrides.
 * Requires ORG_MANAGE_ROLES permission.
 */
export async function PUT(req, { params }) {
  try {
    const { id: orgId } = await params;
    const actorId = req.headers.get("x-user-id");

    if (!actorId) {
      throw new ApiError(401, "Unauthorized");
    }

    // Check permission
    const hasPermission = await checkOrgPermission(actorId, orgId, PERMISSIONS.ORG_MANAGE_ROLES);
    if (!hasPermission) {
      throw new ApiError(403, "Forbidden: You do not have permission to manage roles.");
    }

    const body = await req.json();
    const { userId, orgRole, permissionsAllowed } = body;

    if (!userId) {
      throw new ApiError(400, "Target userId is required.");
    }

    // Prevent changing own role or permissions to prevent lockout
    if (userId === actorId) {
      // Check if trying to demote self from PRESIDENT
      const selfMember = await db.orgMember.findUnique({
        where: { userId_organisationId: { userId, organisationId: orgId } },
      });
      if (selfMember && selfMember.orgRole === "PRESIDENT" && orgRole !== "PRESIDENT") {
        throw new ApiError(400, "You cannot transfer the PRESIDENT role to yourself or demote yourself directly.");
      }
    }

    // Enforce: Cannot grant permissions that the actor does not possess
    if (permissionsAllowed && permissionsAllowed.length > 0) {
      const canGrant = await canActorGrantOrgPermissions(actorId, orgId, permissionsAllowed);
      if (!canGrant) {
        throw new ApiError(403, "Forbidden: You cannot grant permissions you do not possess yourself.");
      }
    }

    // Update member
    const updatedMember = await db.orgMember.update({
      where: {
        userId_organisationId: {
          userId,
          organisationId: orgId,
        },
      },
      data: {
        orgRole,
        permissionsAllowed: permissionsAllowed || undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            systemAccess: true,
          },
        },
      },
    });

    // Notify user via SSE
    sseHub.sendToUser(userId, {
      type: "PERMISSIONS_UPDATED",
      orgId,
      orgRole: updatedMember.orgRole,
      permissionsAllowed: updatedMember.permissionsAllowed,
      message: "Your roles/permissions in the organisation have been updated.",
    });

    // Send email update using Resend
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
      await sendMail(
        updatedMember.user.email,
        `Workspace Role Updated - Cadence`,
        `<h1>Workspace Update</h1>
         <p>Hi ${updatedMember.user.name},</p>
         <p>Your role/permissions in the workspace <strong>${orgId}</strong> have been updated.</p>
         <p><strong>New Role:</strong> ${updatedMember.orgRole}</p>
         <p><strong>Allowed Overrides:</strong> ${updatedMember.permissionsAllowed.length > 0 ? updatedMember.permissionsAllowed.join(", ") : "None"}</p>
         <p>View your updated workspace at <a href="${appUrl}/dashboard">${appUrl}</a>.</p>`
      );
    } catch (err) {
      console.error("[Update Email Error]", err);
    }

    return handleApiResponse(updatedMember, "Member updated successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
