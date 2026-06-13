import db from "@/lib/db";
import { checkOrgPermission, PERMISSIONS } from "@/lib/permissions";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

/**
 * GET: List all departments in an organisation.
 * Requires the user to be a member of the organisation (or system admin).
 */
export async function GET(req, { params }) {
  try {
    const { id: orgId } = await params;
    const userId = req.headers.get("x-user-id");
    const systemAccess = req.headers.get("x-user-access");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    // Check membership (unless admin)
    if (systemAccess !== "SUPER_ADMIN" && systemAccess !== "ADMIN") {
      const membership = await db.orgMember.findUnique({
        where: {
          userId_organisationId: {
            userId,
            organisationId: orgId,
          },
        },
      });
      if (!membership) {
        throw new ApiError(403, "Forbidden: You are not a member of this organisation.");
      }
    }

    const departments = await db.department.findMany({
      where: { organisationId: orgId },
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
    });

    return handleApiResponse(departments, "Departments retrieved successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST: Create a new department.
 * Requires DEPT_CREATE permission.
 */
export async function POST(req, { params }) {
  try {
    const { id: orgId } = await params;
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    // Check permission
    const hasPermission = await checkOrgPermission(userId, orgId, PERMISSIONS.DEPT_CREATE);
    if (!hasPermission) {
      throw new ApiError(403, "Forbidden: You do not have permission to create departments.");
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      throw new ApiError(400, "Department name is required.");
    }

    const newDept = await db.department.create({
      data: {
        organisationId: orgId,
        name,
        description: description || "",
      },
    });

    return handleApiResponse(newDept, "Department created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
