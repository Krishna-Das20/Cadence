import db from "@/lib/db";
import { checkOrgPermission, PERMISSIONS } from "@/lib/permissions";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * GET: Fetch a single organisation.
 * Access: Admins/Super Admins, or organisation members.
 */
export async function GET(req, { params }) {
  try {
    const { id: orgId } = await params;
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const isAdmin = systemAccess === "SUPER_ADMIN" || systemAccess === "ADMIN";

    // If not admin, check if user is a member of the organisation
    if (!isAdmin) {
      const membership = await db.orgMember.findUnique({
        where: {
          userId_organisationId: {
            userId,
            organisationId: orgId,
          },
        },
      });

      if (!membership) {
        throw new ApiError(403, "Forbidden: You do not have access to this organisation.");
      }
    }

    const org = await db.organisation.findUnique({
      where: { id: orgId },
      include: {
        members: {
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
        },
        departments: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!org) {
      throw new ApiError(404, "Organisation not found");
    }

    return handleApiResponse(org, "Organisation retrieved successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT: Update organisation details (name, description).
 * Access: Admins/Super Admins, or members with ORG_EDIT permission.
 */
export async function PUT(req, { params }) {
  try {
    const { id: orgId } = await params;
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    // Enforce 16kb payload limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      throw new ApiError(413, "Payload too large. Limit is 16kb.");
    }

    const isAdmin = systemAccess === "SUPER_ADMIN" || systemAccess === "ADMIN";
    const hasPermission = isAdmin || await checkOrgPermission(userId, orgId, PERMISSIONS.ORG_EDIT);

    if (!hasPermission) {
      throw new ApiError(403, "Forbidden: You do not have permission to edit this organisation.");
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      throw new ApiError(400, "Organisation name is required.");
    }

    const updatedOrg = await db.organisation.update({
      where: { id: orgId },
      data: {
        name,
        description: description ?? "",
      },
    });

    return handleApiResponse(updatedOrg, "Organisation updated successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE: Delete an organisation.
 * Access: Admins/Super Admins, or members with ORG_DELETE permission.
 */
export async function DELETE(req, { params }) {
  try {
    const { id: orgId } = await params;
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const isAdmin = systemAccess === "SUPER_ADMIN" || systemAccess === "ADMIN";
    const hasPermission = isAdmin || await checkOrgPermission(userId, orgId, PERMISSIONS.ORG_DELETE);

    if (!hasPermission) {
      throw new ApiError(403, "Forbidden: You do not have permission to delete this organisation.");
    }

    await db.organisation.delete({
      where: { id: orgId },
    });

    return handleApiResponse(null, "Organisation deleted successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
