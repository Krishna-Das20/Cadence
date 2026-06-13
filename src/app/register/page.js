"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const router = useRouter();

  // Load Google 3P SDK dynamically
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
          setError(null);
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to register.");
      }

      // Save token in cookies for Next.js middleware / proxy
      document.cookie = `token=${data.data.token}; path=/; max-age=86400; SameSite=Strict; Secure`;
      
      // Save details locally
      localStorage.setItem("user", JSON.stringify(data.data.user));
      localStorage.setItem("token", data.data.token);

      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div className="glass-panel" style={{
        maxWidth: "450px",
        width: "100%",
        padding: "3rem 2.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            background: "#ffffff",
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "1.25rem",
            color: "#0a0b10",
            marginBottom: "1rem",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)",
          }}>
            Ω
          </div>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Create Account</h2>
          <p style={{ color: "var(--foreground-muted)", fontSize: "0.9rem" }}>
            Register to join the Cadence platform
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--danger-glow)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "var(--danger)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            fontSize: "0.85rem",
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", fontWeight: "500" }}>
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", fontWeight: "500" }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", fontWeight: "500" }}>
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? "Creating Account..." : "Register"}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: "100%",
              gap: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.29 1.5-.143 2.766-.99 3.6l3.15 2.443c1.84-1.7 2.985-4.2 2.985-7.9z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.15-2.44c-1.12.75-2.58 1.21-4.81 1.21c-3.69 0-6.8-2.49-7.92-5.85H.825v2.53C2.805 20.48 7.005 24 12 24z"/>
              <path fill="#FBBC05" d="M4.08 14.01c-.28-.84-.44-1.75-.44-2.69s.16-1.85.44-2.69V6.1H.825A11.96 11.96 0 0 0 0 12c0 2.12.55 4.12 1.52 5.9l2.56-1.89z"/>
              <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0C7.005 0 2.805 3.52.825 7.47l3.255 2.53c1.12-3.36 4.23-5.85 7.92-5.85z"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <p style={{ color: "var(--foreground-muted)", fontSize: "0.85rem", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#ffffff", fontWeight: "600", textDecoration: "none" }}>
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
}
