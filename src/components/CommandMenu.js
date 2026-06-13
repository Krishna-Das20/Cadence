"use client";

import { useEffect, useState, useRef } from "react";

export default function CommandMenu({ isOpen, onClose, tasks, onSelectTask, onCreateTask, onCreateDept, onSignOut }) {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(10px)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        paddingTop: "15vh",
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "600px",
          height: "max-content",
          maxHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "16px",
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border-color)" }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              fontSize: "1.1rem",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid var(--border-color)",
              padding: "0.75rem 1rem",
            }}
          />
        </div>

        {/* Command Options & Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {search === "" && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--foreground-dimmed)", textTransform: "uppercase", padding: "0 0.5rem 0.5rem" }}>
                Commands
              </p>
              <div
                className="glass-card"
                style={{ padding: "0.75rem 1rem", cursor: "pointer", display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}
                onClick={() => {
                  onCreateTask();
                  onClose();
                }}
              >
                <span>➕ Create New Task</span>
                <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}>/task</kbd>
              </div>
              <div
                className="glass-card"
                style={{ padding: "0.75rem 1rem", cursor: "pointer", display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}
                onClick={() => {
                  onCreateDept();
                  onClose();
                }}
              >
                <span>🏢 Create Department</span>
                <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}>/dept</kbd>
              </div>
              <div
                className="glass-card"
                style={{ padding: "0.75rem 1rem", cursor: "pointer", display: "flex", justifyContent: "space-between", color: "#f87171" }}
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
              >
                <span>🚪 Sign Out</span>
                <kbd style={{ background: "rgba(255,255,255,0.1)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}>/exit</kbd>
              </div>
            </div>
          )}

          {/* Task Results */}
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--foreground-dimmed)", textTransform: "uppercase", padding: "0 0.5rem 0.5rem" }}>
              Tasks ({filteredTasks.length})
            </p>
            {filteredTasks.length === 0 ? (
              <p style={{ padding: "1rem", color: "var(--foreground-muted)", textAlign: "center", fontSize: "0.9rem" }}>
                No matching tasks found.
              </p>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="glass-card"
                  style={{
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    marginBottom: "0.5rem",
                    borderLeft: `3px solid ${
                      task.status === "COMPLETED"
                        ? "var(--success)"
                        : task.status === "IN_PROGRESS"
                        ? "var(--primary)"
                        : task.status === "BACKLOG"
                        ? "var(--danger)"
                        : "var(--warning)"
                    }`,
                  }}
                  onClick={() => {
                    onSelectTask(task);
                    onClose();
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>{task.title}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                      {task.status}
                    </span>
                  </div>
                  {task.description && (
                    <span style={{ fontSize: "0.8rem", color: "var(--foreground-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {task.description}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--border-color)", background: "rgba(0,0,0,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--foreground-dimmed)" }}>
          <span>Search for tasks, commands, or exit.</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
