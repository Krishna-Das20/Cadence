import db from "@/lib/db";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * GET: List all workspaces that the current user is NOT a member of.
 * Used for discovering organisations to join.
 */
export async function GET(req) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const orgs = await db.organisation.findMany({
      where: {
        members: {
          none: {
            userId: userId,
          },
        },
      },
      include: {
        members: {
          where: {
            orgRole: "PRESIDENT",
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return handleApiResponse(orgs, "Discovered organisations retrieved successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
