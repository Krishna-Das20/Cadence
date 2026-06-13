import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <main className="glass-panel" style={{
        maxWidth: "800px",
        width: "100%",
        padding: "3.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "2.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            background: "#ffffff",
            width: "50px",
            height: "50px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "1.5rem",
            color: "#0a0b10",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)",
          }}>
            Ω
          </div>
          <h1 className="glow-text-primary" style={{ fontSize: "2.2rem", margin: 0 }}>
            Cadence
          </h1>
        </div>

        <p style={{
          color: "var(--foreground-muted)",
          fontSize: "1.1rem",
          maxWidth: "600px",
          lineHeight: "1.7",
        }}>
          A developer-focused, multi-tenant workspace orchestrator. Manage departments, assign and track tasks with a real-time Kanban board, override Discord-like hierarchical permissions, and control your local machine context with a standard MCP server.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          width: "100%",
          margin: "1rem 0",
        }}>
          <div className="glass-card" style={{ textAlign: "left" }}>
            <h3 style={{ marginBottom: "0.5rem", color: "#ffffff" }}>Multi-Tenant</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)" }}>
              Isolated organisation boundaries for developers and departments.
            </p>
          </div>
          <div className="glass-card" style={{ textAlign: "left" }}>
            <h3 style={{ marginBottom: "0.5rem", color: "#ffffff" }}>Hierarchy Overrides</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)" }}>
              Fine-grained permission overrides mapped across organizational tiers.
            </p>
          </div>
          <div className="glass-card" style={{ textAlign: "left" }}>
            <h3 style={{ marginBottom: "0.5rem", color: "#ffffff" }}>Real-Time SSE</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)" }}>
              Server-Sent Events push updates instantly across boards and active clients.
            </p>
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: "1.25rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          <Link
            href="/login"
            className="btn-primary"
            style={{
              minWidth: "150px",
            }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="btn-secondary"
            style={{
              minWidth: "150px",
            }}
          >
            Register Account
          </Link>
        </div>
      </main>

      <footer style={{
        marginTop: "3rem",
        color: "var(--foreground-dimmed)",
        fontSize: "0.8rem",
      }}>
        Built with Next.js App Router, Prisma & MongoDB
      </footer>
    </div>
  );
}
