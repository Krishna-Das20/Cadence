import db from "@/lib/db";
import crypto from "crypto";
import { hashPassword, signToken } from "@/lib/auth";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

export async function POST(req) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      throw new ApiError(413, "Payload too large. Limit is 16kb.");
    }

    const { access_token } = await req.json();

    if (!access_token) {
      throw new ApiError(400, "Missing required field: access_token");
    }

    // Verify token with Google API
    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
    );

    if (!googleRes.ok) {
      throw new ApiError(401, "Unauthorized: Invalid Google access token.");
    }

    const googleUser = await googleRes.json();
    const { email, name } = googleUser;

    if (!email) {
      throw new ApiError(400, "Google account did not return a valid email address.");
    }

    // Check if user already exists
    let user = await db.user.findUnique({
      where: { email },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Auto-promote first 3 registered users to SUPER_ADMIN to seed platform
      const userCount = await db.user.count();
      const systemAccess = userCount < 3 ? "SUPER_ADMIN" : "USER";

      // Generate a secure random password to satisfy db constraint
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = hashPassword(randomPassword);

      user = await db.user.create({
        data: {
          name: name || email.split("@")[0],
          email,
          password: hashedPassword,
          systemAccess,
        },
      });
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

    return handleApiResponse(
      { user: userData, token },
      isNewUser ? "Registration via Google successful" : "Login via Google successful",
      isNewUser ? 201 : 200
    );
  } catch (error) {
    return handleApiError(error);
  }
}
