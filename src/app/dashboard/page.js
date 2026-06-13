"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KanbanBoard from "@/components/KanbanBoard";
import CommandMenu from "@/components/CommandMenu";

const PERMISSION_GROUPS = [
  {
    title: "Organisation Administration",
    permissions: [
      { value: "ORG_EDIT", label: "Edit Organisation", desc: "Modify organisation details, name and metadata" },
      { value: "ORG_MANAGE_ROLES", label: "Manage Roles & Permissions", desc: "Manage member roles and custom permission overrides" },
      { value: "ORG_DELETE", label: "Delete Organisation", desc: "Permanently delete the organisation" },
    ]
  },
  {
    title: "Department Management",
    permissions: [
      { value: "DEPT_CREATE", label: "Create Departments", desc: "Create new departments inside the organisation" },
      { value: "DEPT_EDIT", label: "Edit Departments", desc: "Modify department settings and names" },
      { value: "DEPT_MANAGE_ROLES", label: "Manage Department Roles", desc: "Manage roles and assignments within departments" },
    ]
  },
  {
    title: "Task Operations",
    permissions: [
      { value: "TASK_CREATE", label: "Create Tasks", desc: "Create and publish new tasks" },
      { value: "TASK_EDIT", label: "Edit Tasks", desc: "Modify details, descriptions, or deadlines of tasks" },
      { value: "TASK_ASSIGN", label: "Assign Tasks", desc: "Assign and reassign tasks to members" },
      { value: "TASK_UPDATE", label: "Update Tasks Status", desc: "Mark tasks as complete or update progress" },
    ]
  }
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [depts, setDepts] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("ALL");
  const [tasks, setTasks] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Modals & Menu triggers
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  // Platform Admin state
  const [platformUsers, setPlatformUsers] = useState([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");

  // Form states
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskDeptId, setNewTaskDeptId] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Workspace discovery and joining states
  const [activeEmptyTab, setActiveEmptyTab] = useState("create"); // "create" or "join"
  const [activeModalTab, setActiveModalTab] = useState("create"); // "create" or "join"
  const [discoverableOrgs, setDiscoverableOrgs] = useState([]);
  const [loadingDiscoverable, setLoadingDiscoverable] = useState(false);
  const [joiningOrgId, setJoiningOrgId] = useState(null);

  // Refs for SSE
  const sseRef = useRef(null);

  // Load User & Token from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");

    if (!savedUser || !savedToken) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(savedUser));
    setToken(savedToken);

    // Fetch Organisations
    fetchOrgs(savedToken);
  }, []);

  // Set up Server-Sent Events (SSE)
  useEffect(() => {
    if (!token || !user) return;

    if (sseRef.current) {
      sseRef.current.close();
    }

    const sse = new EventSource(`/api/realtime/stream?token=${token}`);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[SSE Event Received]", data);

        if (data.type === "TASK_CREATED") {
          setTasks((prev) => {
            if (prev.some((t) => t.id === data.task.id)) return prev;
            return [data.task, ...prev];
          });
        } else if (data.type === "TASK_UPDATED") {
          setTasks((prev) =>
            prev.map((t) => (t.id === data.task.id ? { ...t, ...data.task } : t))
          );
        } else if (data.type === "PERMISSIONS_UPDATED") {
          // If the update is for the current user, refresh page context
          if (data.userId === user.id) {
            alert(`Your permissions were updated. Role: ${data.orgRole}`);
            fetchOrgs(token);
          }
        }
      } catch (err) {
        // Ping comment frames fall here gracefully
      }
    };

    sse.onerror = (err) => {
      console.error("SSE stream errored:", err);
    };

    return () => {
      sse.close();
    };
  }, [token, user]);

  // Fetch Orgs helper
  const fetchOrgs = async (authToken) => {
    try {
      setLoadingOrgs(true);
      const res = await fetch("/api/orgs", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        let loadedOrgs = data.data;
        const activeOrgId = localStorage.getItem("activeOrgId");
        const matchedOrg = activeOrgId ? loadedOrgs.find((o) => o.id === activeOrgId) : null;

        if (matchedOrg) {
          setOrgs(loadedOrgs);
          handleSelectOrg(matchedOrg, authToken);
        } else if (activeOrgId) {
          try {
            const orgRes = await fetch(`/api/orgs/${activeOrgId}`, {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            const orgData = await orgRes.json();
            if (orgRes.ok && orgData.success) {
              const adminViewOrg = orgData.data;
              loadedOrgs = [adminViewOrg, ...loadedOrgs];
              setOrgs(loadedOrgs);
              handleSelectOrg(adminViewOrg, authToken);
            } else {
              setOrgs(loadedOrgs);
              if (loadedOrgs.length > 0) {
                handleSelectOrg(loadedOrgs[0], authToken);
              }
            }
          } catch (err) {
            console.error(err);
            setOrgs(loadedOrgs);
            if (loadedOrgs.length > 0) {
              handleSelectOrg(loadedOrgs[0], authToken);
            }
          }
        } else {
          setOrgs(loadedOrgs);
          if (loadedOrgs.length > 0) {
            handleSelectOrg(loadedOrgs[0], authToken);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  // Select Org helper
  const handleSelectOrg = async (org, authToken = token) => {
    setSelectedOrg(org);
    setSelectedDeptId("ALL");
    fetchDepts(org.id, authToken);
    fetchTasks(org.id, "ALL", authToken);
  };

  // Fetch Depts
  const fetchDepts = async (orgId, authToken = token) => {
    try {
      const res = await fetch(`/api/orgs/${orgId}/departments`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDepts(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Tasks
  const fetchTasks = async (orgId, deptId, authToken = token) => {
    try {
      let url = `/api/tasks?organisationId=${orgId}`;
      if (deptId !== "ALL") {
        url = `/api/tasks?departmentId=${deptId}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Change department filter
  const handleDeptFilterChange = (deptId) => {
    setSelectedDeptId(deptId);
    if (selectedOrg) {
      fetchTasks(selectedOrg.id, deptId);
    }
  };

  // Move / Drag and Drop task status
  const handleMoveTask = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to update task status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Org
  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newOrgName, description: newOrgDesc }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrgs((prev) => [...prev, data.data]);
        setSelectedOrg(data.data);
        setShowOrgModal(false);
        setNewOrgName("");
        setNewOrgDesc("");
        // Reload departments/tasks
        handleSelectOrg(data.data);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Fetch discoverable organizations (workspaces user is not a member of)
  const fetchDiscoverableOrgs = async (authToken = token) => {
    try {
      setLoadingDiscoverable(true);
      const res = await fetch("/api/orgs/discover", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscoverableOrgs(data.data);
      } else {
        console.error("Failed to fetch discoverable workspaces", data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDiscoverable(false);
    }
  };

  // Join a workspace
  const handleJoinOrg = async (orgId) => {
    try {
      setJoiningOrgId(orgId);
      const res = await fetch(`/api/orgs/${orgId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Joined workspace successfully!");
        setShowOrgModal(false);
        // Refresh orgs
        fetchOrgs(token);
      } else {
        alert(data.message || "Failed to join workspace");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setJoiningOrgId(null);
    }
  };

  // Fetch discoverable workspaces when switching tabs or when the workspace creation modal opens to join tab
  useEffect(() => {
    if (token) {
      if ((orgs.length === 0 && activeEmptyTab === "join") || (showOrgModal && activeModalTab === "join")) {
        fetchDiscoverableOrgs(token);
      }
    }
  }, [activeEmptyTab, activeModalTab, showOrgModal, orgs.length, token]);

  // Create Department
  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!selectedOrg) return;
    try {
      const res = await fetch(`/api/orgs/${selectedOrg.id}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newDeptName, description: newDeptDesc }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDepts((prev) => [...prev, data.data]);
        setShowDeptModal(false);
        setNewDeptName("");
        setNewDeptDesc("");
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    const deptId = newTaskDeptId || (depts.length > 0 ? depts[0].id : "");
    if (!deptId) {
      alert("Please create a department first.");
      return;
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          departmentId: deptId,
          title: newTaskTitle,
          description: newTaskDesc,
          assigneeId: newTaskAssigneeId || undefined,
          dueDate: newTaskDueDate,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowTaskModal(false);
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskAssigneeId("");
        setNewTaskDueDate("");
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Invite Member
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!selectedOrg) return;
    try {
      const res = await fetch(`/api/orgs/${selectedOrg.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, orgRole: inviteRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Member added successfully!");
        setInviteEmail("");
        // Refresh organization members
        fetchOrgs(token);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTogglePermission = (permValue) => {
    setSelectedPermissions((prev) =>
      prev.includes(permValue)
        ? prev.filter((p) => p !== permValue)
        : [...prev, permValue]
    );
  };

  // Update Member Role/Overrides
  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!selectedOrg || !selectedMember) return;

    try {
      const res = await fetch(`/api/orgs/${selectedOrg.id}/members`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedMember.userId,
          orgRole: memberRole,
          permissionsAllowed: selectedPermissions,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Member overrides updated successfully!");
        setShowMemberModal(false);
        fetchOrgs(token);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Fetch all platform users (Admins only)
  const fetchPlatformUsers = async (authToken = token) => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlatformUsers(data.data);
      } else {
        alert(data.message || "Failed to fetch platform users.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update user role (Super Admins only)
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ systemAccess: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        fetchPlatformUsers();
      } else {
        alert(data.message || "Failed to update user access level.");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenAdminModal = () => {
    setShowAdminModal(true);
    fetchPlatformUsers();
  };

  // Authorize Local CLI callback redirection
  const handleAuthorizeCLI = () => {
    const cliCallbackUrl = `http://localhost:8989/callback?token=${token}`;
    window.open(cliCallbackUrl, "_blank");
  };

  // Sign out
  const handleSignOut = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/login");
  };

  // Listen for Ctrl+K command menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!user || loadingOrgs) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--foreground-muted)" }}>
        Loading Cadence workspace...
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div className="glass-panel" style={{ maxWidth: "450px", width: "100%", padding: "3rem 2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "center" }}>
          <div>
            <div style={{
              background: "#ffffff",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "1.5rem",
              color: "#0a0b10",
              marginBottom: "1rem",
              boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)",
            }}>
              Ω
            </div>
            <h2>{activeEmptyTab === "create" ? "Create Workspace" : "Join Workspace"}</h2>
            <p style={{ color: "var(--foreground-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              {activeEmptyTab === "create" 
                ? "To get started, create your first developer organisation workspace."
                : "Search and join an existing workspace registered on the platform."}
            </p>
          </div>

          {/* Tab Selection */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
            <button
              onClick={() => setActiveEmptyTab("create")}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                color: activeEmptyTab === "create" ? "var(--primary)" : "var(--foreground-muted)",
                fontWeight: activeEmptyTab === "create" ? "600" : "400",
                borderBottom: activeEmptyTab === "create" ? "2px solid var(--primary)" : "none",
                paddingBottom: "0.5rem",
                cursor: "pointer",
                fontSize: "0.9rem",
                transition: "all 0.2s ease"
              }}
            >
              Create Workspace
            </button>
            <button
              onClick={() => setActiveEmptyTab("join")}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                color: activeEmptyTab === "join" ? "var(--primary)" : "var(--foreground-muted)",
                fontWeight: activeEmptyTab === "join" ? "600" : "400",
                borderBottom: activeEmptyTab === "join" ? "2px solid var(--primary)" : "none",
                paddingBottom: "0.5rem",
                cursor: "pointer",
                fontSize: "0.9rem",
                transition: "all 0.2s ease"
              }}
            >
              Join Workspace
            </button>
          </div>

          {activeEmptyTab === "create" ? (
            <form onSubmit={handleCreateOrg} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "left" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", fontWeight: "500" }}>Organisation Name</label>
                <input type="text" required placeholder="e.g. Acme Corp" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--foreground-muted)", fontWeight: "500" }}>Description</label>
                <textarea placeholder="Optional workspace description" value={newOrgDesc} onChange={e => setNewOrgDesc(e.target.value)} style={{ width: "100%", minHeight: "80px", background: "rgba(0, 0, 0, 0.3)", border: "1px solid var(--border-color)", color: "#fff", borderRadius: "6px", padding: "0.6rem 1rem", fontSize: "0.9rem", resize: "vertical" }} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
                Create Workspace
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", textAlign: "left", maxHeight: "300px", overflowY: "auto", paddingRight: "0.5rem" }}>
              {loadingDiscoverable ? (
                <p style={{ color: "var(--foreground-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem" }}>
                  Finding available workspaces...
                </p>
              ) : discoverableOrgs.length === 0 ? (
                <p style={{ color: "var(--foreground-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem" }}>
                  No workspaces available to join. Try creating one!
                </p>
              ) : (
                discoverableOrgs.map((org) => {
                  const president = org.members?.find(m => m.orgRole === "PRESIDENT")?.user?.name || "Unknown Owner";
                  return (
                    <div key={org.id} className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxWidth: "70%" }}>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem", color: "#fff" }}>{org.name}</span>
                        {org.description && (
                          <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {org.description}
                          </span>
                        )}
                        <span style={{ fontSize: "0.65rem", color: "var(--foreground-dimmed)" }}>
                          Owner: {president}
                        </span>
                      </div>
                      <button
                        className="btn-primary"
                        style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
                        onClick={() => handleJoinOrg(org.id)}
                        disabled={joiningOrgId === org.id}
                      >
                        {joiningOrgId === org.id ? "Joining..." : "Join"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <button className="btn-secondary" style={{ width: "100%" }} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!selectedOrg) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--foreground-muted)" }}>
        Loading workspace settings...
      </div>
    );
  }

  // Find user's member role in selected org
  const selfMembership = selectedOrg.members?.find((m) => m.userId === user.id);
  const selfRole = selfMembership ? selfMembership.orgRole : "MEMBER";

  return (
    <div className="dashboard-grid">
      {/* Sidebar Panel */}
      <aside className="glass-panel" style={{
        borderRadius: 0,
        borderTop: "none",
        borderBottom: "none",
        borderLeft: "none",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        padding: "1.5rem",
        gap: "1.5rem",
      }}>
        {/* Workspace Selector / Admin View Header */}
        {!selfMembership ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--secondary)" }}>
              Admin View Mode
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="glass-card" style={{ flex: 1, padding: "0.5rem 0.75rem", fontWeight: "600", fontSize: "0.85rem", color: "#fff", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                🏢 {selectedOrg.name}
              </div>
              <button 
                className="btn-secondary" 
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", cursor: "pointer" }} 
                onClick={() => {
                  localStorage.removeItem("activeOrgId");
                  router.push("/admin/workspaces");
                }}
                title="Exit Admin View"
              >
                🚪
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--foreground-dimmed)" }}>
              Select Workspace
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select
                value={selectedOrg.id}
                onChange={(e) => {
                  const org = orgs.find((o) => o.id === e.target.value);
                  if (org) handleSelectOrg(org);
                }}
                style={{ flex: 1, padding: "0.5rem" }}
              >
                {orgs.filter(o => o.members?.some(m => m.userId === user.id)).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <button className="btn-secondary" style={{ padding: "0.5rem 0.75rem" }} onClick={() => { setActiveModalTab("create"); setShowOrgModal(true); }}>
                ➕
              </button>
            </div>
          </div>
        )}

        {/* User Identity Details */}
        <div className="glass-card" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>{user.name}</span>
            <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>{user.email}</span>
            
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <span className={`badge badge-${user.systemAccess.toLowerCase().replace("_", "-")}`}>
                {user.systemAccess}
              </span>
              {selfMembership && (
                <span className="badge" style={{ background: "rgba(6,182,212,0.1)", color: "var(--secondary)", border: "1px solid rgba(6,182,212,0.2)" }}>
                  {selfRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Platform Settings Button (For Admin / Super Admin) */}
        {/* Admin Panels Navigation (For Admin / Super Admin) */}
        {(user.systemAccess === "SUPER_ADMIN" || user.systemAccess === "ADMIN") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--foreground-dimmed)" }}>
              Admin Panel
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <Link 
                href="/admin/workspaces" 
                className="glass-card" 
                style={{ 
                  padding: "0.6rem 0.8rem", 
                  cursor: "pointer", 
                  border: "1px solid var(--border-color)", 
                  background: "rgba(255,255,255,0.02)", 
                  color: "var(--foreground)", 
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
                  border: "1px solid var(--border-color)", 
                  background: "rgba(255,255,255,0.02)", 
                  color: "var(--foreground)", 
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
        )}

        {/* Departments List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--foreground-dimmed)" }}>
              Departments
            </span>
            <button
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.75rem", cursor: "pointer", fontWeight: "600" }}
              onClick={() => setShowDeptModal(true)}
            >
              Create
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", overflowY: "auto" }}>
            <div
              className="glass-card"
              style={{
                padding: "0.5rem 0.75rem",
                cursor: "pointer",
                border: "none",
                background: selectedDeptId === "ALL" ? "var(--primary-glow)" : "rgba(255,255,255,0.02)",
                color: selectedDeptId === "ALL" ? "var(--primary)" : "var(--foreground)",
                fontWeight: selectedDeptId === "ALL" ? "600" : "500",
              }}
              onClick={() => handleDeptFilterChange("ALL")}
            >
              🏢 All Departments
            </div>

            {depts.map((d) => (
              <div
                key={d.id}
                className="glass-card"
                style={{
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  border: "none",
                  background: selectedDeptId === d.id ? "var(--primary-glow)" : "rgba(255,255,255,0.02)",
                  color: selectedDeptId === d.id ? "var(--primary)" : "var(--foreground)",
                  fontWeight: selectedDeptId === d.id ? "600" : "500",
                }}
                onClick={() => handleDeptFilterChange(d.id)}
              >
                📁 {d.name}
              </div>
            ))}
          </div>
        </div>

        {/* Local CLI Connection */}
        <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <h4 style={{ fontSize: "0.85rem", color: "var(--secondary)" }}>Local IDE Connection</h4>
          <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", lineHeight: "1.4" }}>
            Run the login command in your local IDE terminal to bind this session context:
          </p>
          <code style={{ fontSize: "0.75rem", background: "rgba(0,0,0,0.3)", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--border-color)", wordBreak: "break-all" }}>
            npm run cli login
          </code>
          <button className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }} onClick={handleAuthorizeCLI}>
            🔑 Authorize CLI
          </button>
        </div>

        {/* Sign Out */}
        <button className="btn-secondary" style={{ width: "100%", padding: "0.5rem" }} onClick={handleSignOut}>
          🚪 Sign Out
        </button>
      </aside>

      {/* Main Panel Content */}
      <main style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem", height: "100vh", overflowY: "auto" }}>
        
        {/* Dashboard Top Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="glow-text-primary" style={{ fontSize: "1.75rem" }}>{selectedOrg.name}</h1>
            <p style={{ color: "var(--foreground-muted)", fontSize: "0.9rem" }}>{selectedOrg.description}</p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={() => setIsCommandMenuOpen(true)}>
              🔍 Search <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "0.15rem 0.35rem", borderRadius: "4px", fontSize: "0.75rem" }}>Ctrl+K</kbd>
            </button>
            <button className="btn-secondary" onClick={() => setShowMemberModal(true)}>
              👥 Members & Roles
            </button>
            <button className="btn-primary" onClick={() => setShowTaskModal(true)}>
              ➕ Create Task
            </button>
          </div>
        </header>

        {/* Kanban Board Area */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.25rem" }}>Kanban Tasks</h2>
            <span style={{ fontSize: "0.85rem", color: "var(--foreground-muted)" }}>
              Filter: {selectedDeptId === "ALL" ? "All Departments" : depts.find(d => d.id === selectedDeptId)?.name}
            </span>
          </div>

          <KanbanBoard
            tasks={tasks}
            onMoveTask={handleMoveTask}
            onSelectTask={(t) => {
              alert(`Task Details:\n\nTitle: ${t.title}\nDescription: ${t.description}\nStatus: ${t.status}\nAssigner: ${t.assigner?.name || "System/Unknown"}\nDue Date: ${t.dueDate}`);
            }}
          />
        </section>
      </main>

      {/* --- MODALS --- */}

      {/* Create Org Modal */}
      {showOrgModal && (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowOrgModal(false)}>
          <div className="glass-panel" style={{ width: "450px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{activeModalTab === "create" ? "Create Workspace" : "Join Workspace"}</h3>
              <button style={{ background: "none", border: "none", color: "var(--foreground-muted)", cursor: "pointer", fontSize: "1.25rem" }} onClick={() => setShowOrgModal(false)}>×</button>
            </div>
            
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              <button
                onClick={() => setActiveModalTab("create")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  color: activeModalTab === "create" ? "var(--primary)" : "var(--foreground-muted)",
                  fontWeight: activeModalTab === "create" ? "600" : "400",
                  borderBottom: activeModalTab === "create" ? "2px solid var(--primary)" : "none",
                  paddingBottom: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  transition: "all 0.2s ease"
                }}
              >
                Create
              </button>
              <button
                onClick={() => setActiveModalTab("join")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  color: activeModalTab === "join" ? "var(--primary)" : "var(--foreground-muted)",
                  fontWeight: activeModalTab === "join" ? "600" : "400",
                  borderBottom: activeModalTab === "join" ? "2px solid var(--primary)" : "none",
                  paddingBottom: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  transition: "all 0.2s ease"
                }}
              >
                Join
              </button>
            </div>

            {activeModalTab === "create" ? (
              <form onSubmit={handleCreateOrg} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Name</label>
                  <input type="text" required value={newOrgName} onChange={e => setNewOrgName(e.target.value)} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Description</label>
                  <textarea value={newOrgDesc} onChange={e => setNewOrgDesc(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowOrgModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Create</button>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.5rem" }}>
                {loadingDiscoverable ? (
                  <p style={{ color: "var(--foreground-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
                    Finding workspaces...
                  </p>
                ) : discoverableOrgs.length === 0 ? (
                  <p style={{ color: "var(--foreground-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
                    No workspaces available to join.
                  </p>
                ) : (
                  discoverableOrgs.map((org) => {
                    const president = org.members?.find(m => m.orgRole === "PRESIDENT")?.user?.name || "Unknown Owner";
                    return (
                      <div key={org.id} className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxWidth: "70%" }}>
                          <span style={{ fontWeight: "600", fontSize: "0.9rem", color: "#fff" }}>{org.name}</span>
                          {org.description && (
                            <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {org.description}
                            </span>
                          )}
                          <span style={{ fontSize: "0.65rem", color: "var(--foreground-dimmed)" }}>
                            Owner: {president}
                          </span>
                        </div>
                        <button
                          className="btn-primary"
                          style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}
                          onClick={() => handleJoinOrg(org.id)}
                          disabled={joiningOrgId === org.id}
                        >
                          {joiningOrgId === org.id ? "Joining..." : "Join"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Dept Modal */}
      {showDeptModal && (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowDeptModal(false)}>
          <form className="glass-panel" style={{ width: "400px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }} onClick={e => e.stopPropagation()} onSubmit={handleCreateDept}>
            <h3>Create Department</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Name</label>
              <input type="text" required value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Description</label>
              <textarea value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="button" className="btn-secondary" onClick={() => setShowDeptModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowTaskModal(false)}>
          <form className="glass-panel" style={{ width: "450px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }} onClick={e => e.stopPropagation()} onSubmit={handleCreateTask}>
            <h3>Create Task</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Department</label>
              <select value={newTaskDeptId} onChange={e => setNewTaskDeptId(e.target.value)} required>
                <option value="">Select Department...</option>
                {depts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Title</label>
              <input type="text" required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Description</label>
              <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Assignee User ID (Optional)</label>
              <select value={newTaskAssigneeId} onChange={e => setNewTaskAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {selectedOrg.members?.map(m => {
                  if (!m.user) return null;
                  return (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name} ({m.user.email})
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>Due Date</label>
              <input type="datetime-local" required value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="button" className="btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Member Overrides & Invites Modal */}
      {showMemberModal && (
        <div style={{ position: "fixed", top:0, left:0, right:0, bottom:0, background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowMemberModal(false)}>
          <div className="glass-panel" style={{ width: "600px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>Organisation Members</h3>
            
            {/* Direct Add/Invite form */}
            <form onSubmit={handleInviteMember} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Add Member by Email</label>
                <input type="email" placeholder="user@example.com" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Org Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="MEMBER">MEMBER</option>
                  <option value="DIRECTOR">DIRECTOR</option>
                  <option value="PRESIDENT">PRESIDENT</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">Add</button>
            </form>

            {/* Members List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "var(--foreground-dimmed)" }}>
                Active Members & Custom Overrides
              </span>
              
              {selectedOrg.members?.map((m) => {
                if (!m.user) return null;
                return (
                  <div key={m.id} className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ fontSize: "0.9rem" }}>{m.user.name} <span style={{ fontSize: "0.75rem", color: "var(--secondary)" }}>({m.orgRole})</span></h4>
                      <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Email: {m.user.email}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "0.25rem" }}>
                        Overrides: {m.permissionsAllowed.length > 0 ? m.permissionsAllowed.join(", ") : "None"}
                      </p>
                    </div>
                    <button className="btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }} onClick={() => {
                      setSelectedMember(m);
                      setMemberRole(m.orgRole);
                      setSelectedPermissions(m.permissionsAllowed || []);
                    }}>
                      ⚙️ Edit
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Inline Sub-Form to edit selected member overrides */}
            {selectedMember && (
              <form onSubmit={handleUpdateMember} style={{ background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h4 style={{ color: "var(--secondary)", fontSize: "1rem", margin: 0 }}>Edit {selectedMember.user?.name || "Unknown"} Roles & Overrides</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--foreground-muted)" }}>Organisation Role</label>
                  <select value={memberRole} onChange={e => setMemberRole(e.target.value)} style={{ width: "100%" }}>
                    <option value="MEMBER">MEMBER</option>
                    <option value="DIRECTOR">DIRECTOR</option>
                    <option value="PRESIDENT">PRESIDENT</option>
                  </select>
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                  <h5 style={{ fontSize: "0.8rem", color: "#ffffff", marginBottom: "0.25rem" }}>Permission Overrides</h5>
                  <p style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", marginBottom: "1rem" }}>
                    Explicit overrides that apply specifically to this member, bypassing their default role permissions.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.title}>
                        <div style={{ fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)", marginBottom: "0.5rem" }}>
                          {group.title}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
                          {group.permissions.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.value);
                            return (
                              <label
                                key={perm.value}
                                style={{
                                  background: isChecked ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.01)",
                                  border: isChecked ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(255, 255, 255, 0.04)",
                                  borderRadius: "8px",
                                  padding: "0.75rem 1rem",
                                  display: "flex",
                                  gap: "0.75rem",
                                  alignItems: "flex-start",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.value)}
                                  style={{
                                    marginTop: "0.25rem",
                                    cursor: "pointer",
                                    accentColor: "#ffffff",
                                  }}
                                />
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                  <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#ffffff" }}>{perm.label}</span>
                                  <span style={{ fontSize: "0.65rem", color: "var(--foreground-muted)", lineHeight: "1.3" }}>{perm.desc}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                  <button type="button" className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }} onClick={() => setSelectedMember(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>Save Overrides</button>
                </div>
              </form>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn-secondary" onClick={() => setShowMemberModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Administration Modal */}
      {showAdminModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAdminModal(false)}>
          <div className="glass-panel" style={{ width: "650px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0 }}>Platform Administration</h3>
              <span className="badge badge-super-admin" style={{ fontSize: "0.75rem" }}>{user.systemAccess} Mode</span>
            </div>

            {/* User Search Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <input 
                type="text" 
                placeholder="Filter members by name or email..." 
                value={adminSearchQuery} 
                onChange={e => setAdminSearchQuery(e.target.value)} 
                style={{ width: "100%", padding: "0.6rem 1rem", fontSize: "0.9rem" }}
              />
            </div>

            {/* Members List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.5rem" }}>
              {platformUsers
                .filter(u => 
                  u.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || 
                  u.email.toLowerCase().includes(adminSearchQuery.toLowerCase())
                )
                .map(u => (
                  <div key={u.id} className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{u.name}</span>
                        {u.id === user.id && <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>(You)</span>}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>{u.email}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--foreground-dimmed)" }}>Registered: {new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {/* Access Level Badge */}
                      <span className={`badge badge-${u.systemAccess.toLowerCase().replace("_", "-")}`}>
                        {u.systemAccess}
                      </span>

                      {/* Super Admin Actions */}
                      {user.systemAccess === "SUPER_ADMIN" && u.id !== user.id && (
                        u.systemAccess === "USER" ? (
                          <button 
                            className="btn-primary" 
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                            onClick={() => handleUpdateUserRole(u.id, "ADMIN")}
                          >
                            Upgrade to Admin
                          </button>
                        ) : u.systemAccess === "ADMIN" ? (
                          <button 
                            className="btn-secondary" 
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.2)" }}
                            onClick={() => handleUpdateUserRole(u.id, "USER")}
                          >
                            Downgrade to User
                          </button>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAdminModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Command Menu Component */}
      <CommandMenu
        isOpen={isCommandMenuOpen}
        onClose={() => setIsCommandMenuOpen(false)}
        tasks={tasks}
        onSelectTask={(t) => {
          alert(`Task Details:\n\nTitle: ${t.title}\nDescription: ${t.description}\nStatus: ${t.status}`);
        }}
        onCreateTask={() => setShowTaskModal(true)}
        onCreateDept={() => setShowDeptModal(true)}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
