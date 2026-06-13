import db from "@/lib/db";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * GET: Retrieve a list of all registered platform users.
 * Access restricted to SUPER_ADMIN and ADMIN system access levels.
 */
export async function GET(req) {
  try {
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized: Missing authentication context.");
    }

    if (systemAccess !== "SUPER_ADMIN" && systemAccess !== "ADMIN") {
      throw new ApiError(403, "Forbidden: Only platform administrators can view platform members.");
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        systemAccess: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return handleApiResponse(users, "Platform members retrieved successfully.", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
