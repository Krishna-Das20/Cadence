# Google Sign-in Integration Implementation Plan

> **For Antigravity:** REQUIRED SUB-SKILL: Load executing-plans to implement this plan task-by-task.

**Goal:** Build a popup-based "Sign in with Google" button on the Login and Register pages that registers and authenticates users using Google Identity Services (GIS).

**Architecture:** A client-side Google popup flow obtains an access token, which is sent via POST to a server-side route `/api/auth/google/route.js`. The server queries Google's userInfo API, verifies the email, registers new users (with dynamic passwords and system access seeding), and issues an application JWT.

**Tech Stack:** Next.js (App Router), Prisma, MongoDB Atlas, Google Identity Services, `jose`.

---

## Path Convention
All paths are relative to the project root: `c:/Users/KIIT/Downloads/FED/AI Command Center`.

---

## Tasks

### Task 1: Environment Configuration
**Files:**
* Modify: `.env`

**Step 1: Configure client ID variable**
Append the client ID variable to `.env`:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID="753552498060-lfnd23mossrkji8dg313ivese96j1670.apps.googleusercontent.com"
```

**Step 2: Commit**
```bash
git add .env
git commit -m "chore: add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env"
```

---

### Task 2: Google Authentication API Route
**Files:**
* Create: `src/app/api/auth/google/route.js`

**Step 1: Write Route Handler**
Create: `src/app/api/auth/google/route.js`
```javascript
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
```

**Step 2: Commit**
```bash
git add src/app/api/auth/google/route.js
git commit -m "feat: implement Google authentication exchange API route"
```

---

### Task 3: Login Page Integration
**Files:**
* Modify: `src/app/login/page.js`

**Step 1: Write Google Sign-in Handler and Button**
Add Google script loader and initiate popup trigger client flow:
Modify: `src/app/login/page.js`
1. Add state for Google SDK loaded: `const [gapiLoaded, setGapiLoaded] = useState(false);`
2. Load Google Identity Services script dynamically on mount:
   ```javascript
   useEffect(() => {
     if (typeof window !== "undefined") {
       const script = document.createElement("script");
       script.src = "https://accounts.google.com/gsi/client";
       script.async = true;
       script.defer = true;
       script.onload = () => setGapiLoaded(true);
       document.body.appendChild(script);
     }
   }, []);
   ```
3. Add the token flow trigger:
   ```javascript
   const handleGoogleLogin = () => {
     if (!gapiLoaded || !window.google) {
       alert("Google Sign-In is still loading. Please try again in a moment.");
       return;
     }

     const client = window.google.accounts.oauth2.initTokenClient({
       client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "753552498060-lfnd23mossrkji8dg313ivese96j1670.apps.googleusercontent.com",
       scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
       callback: async (tokenResponse) => {
         if (tokenResponse.error) {
           setError(tokenResponse.error_description || "Google authorization failed.");
           return;
         }
         
         if (tokenResponse.access_token) {
           setLoading(true);
           try {
             const res = await fetch("/api/auth/google", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ access_token: tokenResponse.access_token }),
             });
             const data = await res.json();
             if (!res.ok) {
               throw new Error(data.message || "Google auth exchange failed.");
             }

             document.cookie = `token=${data.data.token}; path=/; max-age=86400; SameSite=Strict; Secure`;
             localStorage.setItem("user", JSON.stringify(data.data.user));
             localStorage.setItem("token", data.data.token);
             router.push("/dashboard");
           } catch (err) {
             setError(err.message);
           } finally {
             setLoading(false);
           }
         }
       },
     });
     client.requestAccessToken();
   };
   ```
4. Insert a premium "Sign in with Google" button below the submit button:
   ```javascript
   <button
     type="button"
     className="btn-secondary"
     onClick={handleGoogleLogin}
     style={{
       width: "100%",
       display: "flex",
       alignItems: "center",
       justifyContent: "center",
       gap: "0.75rem",
       border: "1px solid var(--border-color)",
       marginTop: "0.5rem"
     }}
   >
     <svg width="18" height="18" viewBox="0 0 24 24">
       <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.29 1.5-.143 2.766-.99 3.6l3.15 2.443c1.84-1.7 2.985-4.2 2.985-7.9c0 0 0 0 0 0z"/>
       <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.15-2.44c-1.12.75-2.58 1.21-4.81 1.21c-3.69 0-6.8-2.49-7.92-5.85H.825v2.53C2.805 20.48 7.005 24 12 24z"/>
       <path fill="#FBBC05" d="M4.08 14.01c-.28-.84-.44-1.75-.44-2.69s.16-1.85.44-2.69V6.1H.825A11.96 11.96 0 0 0 0 12c0 2.12.55 4.12 1.52 5.9l2.56-1.89z"/>
       <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0C7.005 0 2.805 3.52.825 7.47l3.255 2.53c1.12-3.36 4.23-5.85 7.92-5.85z"/>
     </svg>
     Continue with Google
   </button>
   ```

**Step 2: Commit**
```bash
git add src/app/login/page.js
git commit -m "feat: add Google Sign-in to Login page"
```

---

### Task 4: Register Page Integration
**Files:**
* Modify: `src/app/register/page.js`

**Step 1: Write Google Sign-in Handler and Button**
Apply identical Google script loader, token flow trigger, and "Continue with Google" button logic:
Modify: `src/app/register/page.js`
1. Add state for Google SDK loaded: `const [gapiLoaded, setGapiLoaded] = useState(false);`
2. Load script tag dynamically on mount.
3. Add `handleGoogleLogin` method.
4. Render "Continue with Google" button below the register submit button.

**Step 2: Commit**
```bash
git add src/app/register/page.js
git commit -m "feat: add Google Sign-in to Register page"
```

---

### Task 5: E2E Verification
**Step 1: Compile optimized production build**
Run: `npm run build`
Expected: Production build compiles successfully.

**Step 2: Commit**
```bash
git add .
git commit -m "chore: verify Google Sign-in implementation build"
```
