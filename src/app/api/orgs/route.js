import db from "@/lib/db";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * GET: List organisations.
 * Non-admins see organisations they are members of.
 * Admins/Super Admins see all organisations.
 */
export async function GET(req) {
  try {
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    // Find memberships of the user
    const memberships = await db.orgMember.findMany({
      where: { userId },
      include: {
        organisation: {
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
          },
        },
      },
    });
    const orgs = memberships.map((m) => m.organisation);

    return handleApiResponse(orgs, "Organisations retrieved successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST: Create a new organisation.
 * Creator is automatically added as PRESIDENT.
 */
export async function POST(req) {
  try {
    // Enforce 16kb payload limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      throw new ApiError(413, "Payload too large. Limit is 16kb.");
    }

    const userId = req.headers.get("x-user-id");
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      throw new ApiError(400, "Organisation name is required.");
    }

    // Create organisation and add creator as PRESIDENT
    const newOrg = await db.organisation.create({
      data: {
        name,
        description: description || "",
        members: {
          create: {
            userId,
            orgRole: "PRESIDENT",
            permissionsAllowed: [],
          },
        },
      },
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
      },
    });

    return handleApiResponse(newOrg, "Organisation created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
