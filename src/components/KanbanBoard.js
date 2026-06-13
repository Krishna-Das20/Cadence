"use client";

export default function KanbanBoard({ tasks, onMoveTask, onSelectTask }) {
  const columns = [
    { id: "TODO", title: "Todo", color: "var(--warning)" },
    { id: "IN_PROGRESS", title: "Ongoing", color: "var(--primary)" },
    { id: "COMPLETED", title: "Completed", color: "var(--success)" },
    { id: "BACKLOG", title: "Backlog", color: "var(--danger)" },
  ];

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStatus) => {
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      onMoveTask(taskId, targetStatus);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter((t) => t.status === status);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "1.5rem",
      alignItems: "stretch",
      width: "100%",
      padding: "1rem 0",
    }}>
      {columns.map((col) => {
        const colTasks = getTasksByStatus(col.id);
        return (
          <div
            key={col.id}
            className="glass-panel"
            style={{
              padding: "1.25rem",
              borderRadius: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              minHeight: "500px",
              background: "rgba(13, 20, 38, 0.35)",
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: `2px solid ${col.color}`,
              paddingBottom: "0.5rem",
            }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: col.color }}></span>
                {col.title}
              </h3>
              <span style={{
                background: "rgba(255,255,255,0.06)",
                padding: "0.2rem 0.5rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "var(--foreground-muted)",
              }}>
                {colTasks.length}
              </span>
            </div>

            {/* Tasks List */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              flex: 1,
              overflowY: "auto",
            }}>
              {colTasks.length === 0 ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  border: "2px dashed rgba(255,255,255,0.03)",
                  borderRadius: "10px",
                  color: "var(--foreground-dimmed)",
                  fontSize: "0.85rem",
                  padding: "2rem 0",
                }}>
                  Drop tasks here
                </div>
              ) : (
                colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onSelectTask(task)}
                    className="glass-card"
                    style={{
                      cursor: "grab",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      borderRadius: "10px",
                      position: "relative",
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#ffffff", marginBottom: "0.25rem" }}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p style={{
                          fontSize: "0.8rem",
                          color: "var(--foreground-muted)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: "1.4",
                        }}>
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata: Assignee & Due Date */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.25rem",
                      fontSize: "0.75rem",
                      color: "var(--foreground-muted)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <span style={{
                          background: "var(--primary-glow)",
                          color: "var(--primary)",
                          borderRadius: "4px",
                          padding: "0.15rem 0.35rem",
                          fontWeight: "600",
                          border: "1px solid rgba(139, 92, 246, 0.15)",
                        }}>
                          {task.assignee?.name ? task.assignee.name.split(" ")[0] : "Unassigned"}
                        </span>
                      </div>
                      
                      <span style={{
                        color: new Date(task.dueDate) < new Date() && task.status !== "COMPLETED"
                          ? "var(--danger)"
                          : "var(--foreground-dimmed)",
                        fontWeight: "500",
                      }}>
                        📅 {formatDate(task.dueDate)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
