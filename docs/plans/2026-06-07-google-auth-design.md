# Design Spec — Google Sign-in Implementation

This document outlines the design for integrating Google Sign-in into the AI Command Center application.

## Goal
Implement a modern, popup-based "Sign in with Google" button on the Login and Register pages using Google Identity Services (GIS). This OAuth flow registers new users dynamically and logs in existing users without forcing a full-page redirect.

## Selected Approach
**Google Identity Services (GIS) Token Flow**
1. Load client SDK script (`https://accounts.google.com/gsi/client`) in the browser.
2. Initialise token client using the Google Client ID.
3. Open popups on button click to request scopes (`email`, `profile`).
4. Exchange the obtained `access_token` with the server-side API `/api/auth/google`.
5. The server checks Google's userInfo endpoint, validates the user, creates/logs them in, and issues our JWT token.

## Proposed Components

### 1. API Route
- **File**: `src/app/api/auth/google/route.js`
- **Method**: `POST`
- **Payload**: `{ access_token: string }`
- **Flow**:
  1. Fetch `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`.
  2. If request fails, return `401 Unauthorized`.
  3. Search for existing user with fetched `email` in database.
  4. If not found:
     - Count total users in database (auto-seed first 3 as `SUPER_ADMIN`).
     - Generate a randomized password using native `crypto` module.
     - Create user record with name, email, img, and password hash.
  5. Sign JWT session token.
  6. Return standard envelope with user info and token.

### 2. Login & Register UI
- **Files**: `src/app/login/page.js`, `src/app/register/page.js`
- **Changes**:
  - Dynamically load script `https://accounts.google.com/gsi/client`.
  - Add Google Sign-in button styled as a glassmorphic element.
  - Implement authentication callback that sends the Google token to the backend, writes the session cookie, and redirects to `/dashboard`.

### 3. Environment Variables
- **File**: `.env`
- **Vars**:
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID="753552498060-lfnd23mossrkji8dg313ivese96j1670.apps.googleusercontent.com"`
