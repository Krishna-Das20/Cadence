import db from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { ApiError, handleApiError, handleApiResponse } from "@/lib/apiErrors";

export async function POST(req) {
  try {
    // Enforce 16kb payload limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      throw new ApiError(413, "Payload too large. Limit is 16kb.");
    }

    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      throw new ApiError(400, "Name, email, and password are required.");
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(409, "User with this email already exists.");
    }

    // Auto-promote first 3 registered users to SUPER_ADMIN to seed platform
    const userCount = await db.user.count();
    const systemAccess = userCount < 3 ? "SUPER_ADMIN" : "USER";

    const hashedPassword = hashPassword(password);

    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        systemAccess,
      },
    });

    // Generate JWT token
    const tokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      systemAccess: newUser.systemAccess,
    };
    const token = await signToken(tokenPayload);

    // Prepare response data
    const userData = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      systemAccess: newUser.systemAccess,
      createdAt: newUser.createdAt,
    };

    return handleApiResponse({ user: userData, token }, "Registration successful", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
