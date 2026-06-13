"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminWorkspacesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Workspace Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");

  // Edit Workspace Form States
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Delete Confirm State
  const [orgToDelete, setOrgToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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
    fetchWorkspaces(savedToken);
  }, []);

  const fetchWorkspaces = async (authToken = token) => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/orgs", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkspaces(data.data);
      } else {
        alert(data.message || "Failed to fetch workspaces.");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!createName) return;

    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createName,
          description: createDesc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Workspace created successfully!");
        setShowCreateModal(false);
        setCreateName("");
        setCreateDesc("");
        fetchWorkspaces();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditWorkspace = async (e) => {
    e.preventDefault();
    if (!selectedOrg || !editName) return;

    try {
      const res = await fetch(`/api/orgs/${selectedOrg.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Workspace updated successfully!");
        setSelectedOrg(null);
        fetchWorkspaces();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteWorkspace = async (e) => {
    e.preventDefault();
    if (!orgToDelete) return;
    if (deleteConfirmText.toLowerCase() !== "delete") {
      alert("Please type 'delete' to confirm deletion.");
      return;
    }

    try {
      const res = await fetch(`/api/orgs/${orgToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Workspace deleted successfully!");
        setOrgToDelete(null);
        setDeleteConfirmText("");
        fetchWorkspaces();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEnterWorkspace = (orgId) => {
    localStorage.setItem("activeOrgId", orgId);
    router.push("/dashboard");
  };

  // Filter workspaces based on search query
  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#ffffff", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "0.9rem", color: "var(--foreground-muted)" }}>Loading workspace data...</span>
        </div>
      </div>
    );
  }

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
              🏢 Manage Workspaces
            </Link>

            <Link 
              href="/admin/users" 
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
            <h1 className="glow-text-primary" style={{ fontSize: "1.75rem", margin: 0 }}>Platform Workspaces</h1>
            <p style={{ color: "var(--foreground-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Overview and administrative management of all workspaces inside Cadence.
            </p>
          </div>

          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ Create Workspace
          </button>
        </header>

        {/* Toolbar */}
        <section className="glass-panel" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input 
              type="text" 
              placeholder="Search workspaces by name or description..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", paddingLeft: "2.5rem" }}
            />
            <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--foreground-muted)", fontSize: "1rem" }}>
              🔍
            </span>
          </div>
        </section>

        {/* Workspaces Grid */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {filteredWorkspaces.map((w) => {
            const president = w.members?.find((m) => m.orgRole === "PRESIDENT")?.user?.name || "Unknown Owner";
            const memberCount = w.members?.length || 0;
            const deptCount = w.departments?.length || 0;

            return (
              <div key={w.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", color: "#ffffff", marginBottom: "0.5rem" }}>{w.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", height: "40px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {w.description || "No description provided."}
                  </p>
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span style={{ color: "var(--foreground-muted)" }}>President:</span>
                    <span style={{ fontWeight: "600", color: "#ffffff" }}>{president}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span style={{ color: "var(--foreground-muted)" }}>Departments:</span>
                    <span style={{ fontWeight: "600", color: "var(--secondary)" }}>{deptCount}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span style={{ color: "var(--foreground-muted)" }}>Total Members:</span>
                    <span style={{ fontWeight: "600", color: "var(--primary)" }}>{memberCount}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
                    onClick={() => handleEnterWorkspace(w.id)}
                  >
                    🔑 Enter
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
                    onClick={() => {
                      setSelectedOrg(w);
                      setEditName(w.name);
                      setEditDesc(w.description);
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.2)" }}
                    onClick={() => setOrgToDelete(w)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

          {filteredWorkspaces.length === 0 && (
            <div className="glass-panel" style={{ gridColumn: "1 / -1", padding: "3rem", textAlign: "center", color: "var(--foreground-muted)" }}>
              No workspaces found matching your query.
            </div>
          )}
        </section>
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCreateModal(false)}>
          <div className="glass-panel" style={{ width: "450px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>Create Workspace</h3>
            
            <form onSubmit={handleCreateWorkspace} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Workspace Name</label>
                <input type="text" required value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Acme Corp" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Description</label>
                <textarea rows={3} value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Describe the workspace..." />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Workspace Modal */}
      {selectedOrg && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSelectedOrg(null)}>
          <div className="glass-panel" style={{ width: "450px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>Edit Workspace</h3>
            
            <form onSubmit={handleEditWorkspace} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Workspace Name</label>
                <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Description</label>
                <textarea rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedOrg(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Workspace Modal */}
      {orgToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setOrgToDelete(null)}>
          <div className="glass-panel" style={{ width: "450px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", color: "var(--danger)" }}>Delete Workspace?</h3>
            
            <p style={{ fontSize: "0.85rem", color: "var(--foreground-muted)" }}>
              Are you sure you want to permanently delete **{orgToDelete.name}**? This action cannot be undone. All departments, members, tasks, and data inside it will be permanently deleted.
            </p>

            <form onSubmit={handleDeleteWorkspace} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                  Type <strong>delete</strong> to confirm:
                </label>
                <input 
                  type="text" 
                  required 
                  value={deleteConfirmText} 
                  onChange={e => setDeleteConfirmText(e.target.value)} 
                  placeholder="delete" 
                  style={{ borderColor: deleteConfirmText.toLowerCase() === "delete" ? "var(--danger)" : "var(--border-color)" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => { setOrgToDelete(null); setDeleteConfirmText(""); }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: "var(--danger)", color: "#ffffff" }}>Permanently Delete</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
