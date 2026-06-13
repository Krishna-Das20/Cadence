import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-developer-command-center-token-key-2026"
);

// Define route categories
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/google",
];

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // Let public paths pass
  if (PUBLIC_PATHS.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  // Define matcher patterns for protection
  const isApiRoute = pathname.startsWith("/api/");
  const isDashboardRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/admin/");

  if (!isApiRoute && !isDashboardRoute) {
    return NextResponse.next();
  }

  // 1. Extract token from Authorization header, Cookie, or Query param (for EventSource)
  let token = null;

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    const cookieToken = req.cookies.get("token");
    if (cookieToken) {
      token = cookieToken.value;
    }
  }

  if (!token) {
    const queryToken = req.nextUrl.searchParams.get("token");
    if (queryToken) {
      token = queryToken;
    }
  }

  // 2. Reject if no token
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Missing authentication token.",
          errors: [],
          data: null,
        },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 3. Verify token
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);

    // Inject user details into headers for API routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-user-email", payload.email);
    requestHeaders.set("x-user-access", payload.systemAccess);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Invalid or expired authentication token.",
          errors: [],
          data: null,
        },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
