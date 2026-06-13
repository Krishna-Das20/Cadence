import db from "@/lib/db";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";
import { sendMail } from "@/lib/email";
import sseHub from "@/lib/sseHub";

/**
 * POST: Join a workspace.
 * Adds the authenticated user as a MEMBER of the organisation.
 * Sends email notification to the organisation PRESIDENT using Resend.
 */
export async function POST(req, { params }) {
  try {
    const { id: orgId } = await params;
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const org = await db.organisation.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!org) {
      throw new ApiError(404, "Workspace not found.");
    }

    // Check if already a member
    const existingMember = org.members.find((m) => m.userId === userId);
    if (existingMember) {
      throw new ApiError(400, "You are already a member of this workspace.");
    }

    // Add user as MEMBER
    const newMember = await db.orgMember.create({
      data: {
        userId,
        organisationId: orgId,
        orgRole: "MEMBER",
        permissionsAllowed: [],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify President/Owner of the organization
    const president = org.members.find((m) => m.orgRole === "PRESIDENT");
    if (president && president.user) {
      // Send email notification to President
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
        await sendMail(
          president.user.email,
          `New Member Joined Workspace - ${org.name}`,
          `<h1>New Workspace Member</h1>
           <p>Hi ${president.user.name},</p>
           <p>A new user, <strong>${newMember.user.name}</strong> (${newMember.user.email}), has joined your workspace <strong>${org.name}</strong>.</p>
           <p>Manage members and configure roles on your <a href="${appUrl}/dashboard">Cadence Dashboard</a>.</p>`
        );
      } catch (err) {
        console.error("[Join Email Error]", err);
      }

      // Send a real-time SSE notification
      sseHub.sendToUser(president.userId, {
        type: "MEMBER_JOINED",
        orgId,
        message: `${newMember.user.name} has joined the workspace.`,
      });
    }

    return handleApiResponse(newMember, "Joined workspace successfully", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
