"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");

    if (!savedUser || !savedToken) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    if (parsedUser.systemAccess !== "SUPER_ADMIN" && parsedUser.systemAccess !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    setUser(parsedUser);
    setToken(savedToken);
    fetchUsers(savedToken);
  }, []);

  const fetchUsers = async (authToken = token) => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.data);
      } else {
        alert(data.message || "Failed to fetch users.");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSystemRole = async (targetUserId, newRole) => {
    if (!targetUserId || !newRole) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          systemAccess: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully updated user access role to ${newRole}`);
        fetchUsers();
      } else {
        alert(data.message || "Failed to update role.");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#ffffff", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "0.9rem", color: "var(--foreground-muted)" }}>Loading user data...</span>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user.systemAccess === "SUPER_ADMIN";

  return (
    <div className="dashboard-grid" style={{ minHeight: "100vh" }}>
      {/* Left Sidebar */}
      <aside style={{ borderRight: "1px solid var(--border-color)", padding: "1.5rem 1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem", background: "rgba(0,0,0,0.2)" }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "800", letterSpacing: "0.05em", color: "#ffffff" }}>
            CADENCE <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--secondary)" }}>ADMIN</span>
          </h2>
        </div>

        {/* User Card */}
        <div className="glass-card" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>{user.name}</span>
            <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", wordBreak: "break-all" }}>{user.email}</span>
            
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <span className={`badge badge-${user.systemAccess.toLowerCase().replace("_", "-")}`}>
                {user.systemAccess}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--foreground-dimmed)" }}>
            Navigation
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <Link 
              href="/dashboard" 
              className="glass-card" 
              style={{ 
                padding: "0.6rem 0.8rem", 
                cursor: "pointer", 
                border: "1px solid transparent", 
                background: "rgba(255,255,255,0.01)", 
                color: "var(--foreground-muted)", 
                fontSize: "0.8rem", 
                display: "flex", 
                alignItems: "center", 
                gap: "0.5rem",
                textDecoration: "none",
                fontWeight: "500",
                borderRadius: "6px"
              }}
            >
              📊 Back to Dashboard
            </Link>
            
            <Link 
              href="/admin/workspaces" 
              className="glass-card" 
              style={{ 
                padding: "0.6rem 0.8rem", 
                cursor: "pointer", 
                border: "1px solid transparent", 
                background: "rgba(255,255,255,0.01)", 
                color: "var(--foreground-muted)", 
                fontSize: "0.8rem", 
                display: "flex", 
                alignItems: "center", 
                gap: "0.5rem",
                textDecoration: "none",
                fontWeight: "500",
                borderRadius: "6px"
              }}
            >
              🏢 Manage Workspaces
            </Link>

            <Link 
              href="/admin/users" 
              className="glass-card" 
              style={{ 
                padding: "0.6rem 0.8rem", 
                cursor: "pointer", 
                border: "1px solid var(--border-focus)", 
                background: "rgba(255,255,255,0.04)", 
                color: "#ffffff", 
                fontSize: "0.8rem", 
                display: "flex", 
                alignItems: "center", 
                gap: "0.5rem",
                textDecoration: "none",
                fontWeight: "600",
                borderRadius: "6px"
              }}
            >
              👤 Manage Users & Admins
            </Link>
          </div>
        </div>

        <button 
          className="btn-secondary" 
          style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.08)" }}
          onClick={() => {
            localStorage.clear();
            router.push("/login");
          }}
        >
          🚪 Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem", height: "100vh", overflowY: "auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="glow-text-primary" style={{ fontSize: "1.75rem", margin: 0 }}>Platform Users & Admin Control</h1>
            <p style={{ color: "var(--foreground-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              View platform users and promote or demote administrator capabilities.
            </p>
          </div>
        </header>

        {/* Toolbar */}
        <section className="glass-panel" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input 
              type="text" 
              placeholder="Search platform users by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", paddingLeft: "2.5rem" }}
            />
            <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--foreground-muted)", fontSize: "1rem" }}>
              🔍
            </span>
          </div>
        </section>

        {/* Users List Grid */}
        <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.5fr 2fr 1.5fr 2fr", padding: "0.5rem 1rem", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--foreground-dimmed)", letterSpacing: "0.05em" }}>
            <span>User Details</span>
            <span>Email</span>
            <span>System Access</span>
            <span style={{ textAlign: "right" }}>Promotion Controls</span>
          </div>

          {filteredUsers.map((u) => {
            const isSelf = u.id === user.id;
            return (
              <div key={u.id} className="glass-panel" style={{ display: "grid", gridTemplateColumns: "2.5fr 2fr 1.5fr 2fr", alignItems: "center", padding: "1rem" }}>
                <div>
                  <h4 style={{ fontSize: "0.9rem", color: "#ffffff" }}>
                    {u.name} {isSelf && <span style={{ fontSize: "0.75rem", color: "var(--secondary)", fontWeight: "500" }}>(You)</span>}
                  </h4>
                  <span style={{ fontSize: "0.7rem", color: "var(--foreground-muted)" }}>ID: {u.id}</span>
                </div>

                <div style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", wordBreak: "break-all", paddingRight: "0.5rem" }}>
                  {u.email}
                </div>

                <div>
                  <span className={`badge badge-${u.systemAccess.toLowerCase().replace("_", "-")}`}>
                    {u.systemAccess}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  {isSelf ? (
                    <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", fontStyle: "italic" }}>Cannot self-modify</span>
                  ) : !isSuperAdmin ? (
                    <span style={{ fontSize: "0.75rem", color: "var(--foreground-dimmed)" }}>Super Admin Only</span>
                  ) : (
                    <>
                      {u.systemAccess === "USER" && (
                        <button 
                          className="btn-primary" 
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleUpdateSystemRole(u.id, "ADMIN")}
                        >
                          🛡️ Make Admin
                        </button>
                      )}
                      {u.systemAccess === "ADMIN" && (
                        <>
                          <button 
                            className="btn-primary" 
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", background: "var(--foreground)", color: "var(--bg-main)" }}
                            onClick={() => handleUpdateSystemRole(u.id, "SUPER_ADMIN")}
                          >
                            👑 Make Super Admin
                          </button>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: "var(--danger)" }}
                            onClick={() => handleUpdateSystemRole(u.id, "USER")}
                          >
                            Demote to User
                          </button>
                        </>
                      )}
                      {u.systemAccess === "SUPER_ADMIN" && (
                        <button 
                          className="btn-secondary" 
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleUpdateSystemRole(u.id, "ADMIN")}
                        >
                          Demote to Admin
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--foreground-muted)" }}>
              No users found matching your query.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
