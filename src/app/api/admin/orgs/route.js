import db from "@/lib/db";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * GET: List all organisations on the platform.
 * Access: Admins and Super Admins only.
 */
export async function GET(req) {
  try {
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const isAdmin = systemAccess === "SUPER_ADMIN" || systemAccess === "ADMIN";
    if (!isAdmin) {
      throw new ApiError(403, "Forbidden: Administrative access required.");
    }

    const orgs = await db.organisation.findMany({
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
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return handleApiResponse(orgs, "All organisations retrieved successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
