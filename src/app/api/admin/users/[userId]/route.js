import db from "@/lib/db";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * PATCH: Update a target user's system access role (SUPER_ADMIN, ADMIN, USER).
 * Access restricted strictly to SUPER_ADMIN.
 */
export async function PATCH(req, { params }) {
  try {
    const { userId: targetUserId } = await params;
    const actorId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!actorId) {
      throw new ApiError(401, "Unauthorized: Missing authentication context.");
    }

    // Only SUPER_ADMIN can change platform access levels
    if (systemAccess !== "SUPER_ADMIN") {
      throw new ApiError(403, "Forbidden: Only Super Administrators can alter user access levels.");
    }

    const body = await req.json();
    const { systemAccess: newRole } = body;

    const validRoles = ["SUPER_ADMIN", "ADMIN", "USER"];
    if (!newRole || !validRoles.includes(newRole)) {
      throw new ApiError(400, "Invalid system access level specified.");
    }

    // Prevent modifying one's own role to avoid self-lockout
    if (targetUserId === actorId) {
      throw new ApiError(400, "You cannot modify your own system access level.");
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new ApiError(404, "Target user not found.");
    }

    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: { systemAccess: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        systemAccess: true,
        createdAt: true,
      },
    });

    return handleApiResponse(
      updatedUser,
      `User system access level updated to ${newRole} successfully.`,
      200
    );
  } catch (error) {
    return handleApiError(error);
  }
}
