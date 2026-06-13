import db from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

export async function POST(req) {
  try {
    // Enforce 16kb payload limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      throw new ApiError(413, "Payload too large. Limit is 16kb.");
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required.");
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || !verifyPassword(password, user.password)) {
      throw new ApiError(401, "Invalid email or password.");
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      systemAccess: user.systemAccess,
    };
    const token = await signToken(tokenPayload);

    // Prepare response data
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      systemAccess: user.systemAccess,
      createdAt: user.createdAt,
    };

    return handleApiResponse({ user: userData, token }, "Login successful", 200);
  } catch (error) {
    return handleApiError(error);
  }
}
