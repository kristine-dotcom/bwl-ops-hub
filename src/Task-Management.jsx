// ═══════════════════════════════════════════════════════════════════════════
// TASK MANAGEMENT - FULL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";

// Theme (use existing T object from main app)
const T = {
  bg:"#F5F5F0", surface:"#FFFFFF", border:"#E5E0D8", borderDark:"#C8C2B8",
  black:"#000000", orange:"#FF3300", orangeHov:"#CC2900", orangeSoft:"#FFF0ED",
  gray:"#6B7280", grayLight:"#9CA3AF", darkGray:"#374151",
  green:"#10B981", yellow:"#F59E0B", red:"#EF4444", purple:"#7C3AED",
  font:"'Space Grotesk','Arial Narrow',Arial,sans-serif",
  mono:"'JetBrains Mono','Courier New',monospace",
};

const ADMIN_PASSWORD = "admin2025";

// ─── API UTILITIES ────────────────────────────────────────────────────────────
const taskAPI = {
  getAll: async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    return data.success ? data.tasks : [];
  },
  
  create: async (task) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task })
    });
    const data = await res.json();
    return data.success ? data.task : null;
  },
  
  update: async (taskId, updates) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, updates })
    });
    const data = await res.json();
    return data.success ? data.task : null;
  },
  
  delete: async (taskId) => {
    const res = await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId })
    });
    const data = await res.json();
    return data.success;
  }
};

// ─── TEAM MEMBERS ─────────────────────────────────────────────────────────────
const TEAM_MEMBERS = [
  "Suki Santos",
  "Kristine Mirabueno",
  "Kristine Miel Zulaybar",
  "Caleb Bentil",
  "David Perlov",
  "Cyril Butanas",
  "Darlene Mae Malolos"
];

// ─── PRIORITY COLORS ──────────────────────────────────────────────────────────
const priorityColor = (p) => ({
  high: T.red,
  medium: T.yellow,
  low: T.green
}[p] || T.gray);

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric" 
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN GATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function AdminGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const attempt = () => {
    if (pw === ADMIN_PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setShaking(true);
      setPw("");
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{ 
      minHeight: "60vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center" 
    }}>
      <div style={{ 
        width: "100%", 
        maxWidth: 400, 
        background: T.surface, 
        border: `2px solid ${T.black}`, 
        padding: 32 
      }}>
        <div style={{ 
          fontSize: 32, 
          marginBottom: 8, 
          textAlign: "center" 
        }}>🔐</div>
        <div style={{ 
          fontSize: 12, 
          fontWeight: 700, 
          color: T.black, 
          fontFamily: T.mono, 
          marginBottom: 4, 
          letterSpacing: 2, 
          textAlign: "center" 
        }}>ADMIN ACCESS REQUIRED</div>
        <div style={{ 
          fontSize: 11, 
          color: T.gray, 
          fontFamily: T.mono, 
          marginBottom: 24, 
          textAlign: "center" 
        }}>Tasks module is restricted to admins only</div>
        
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && pw && attempt()}
          placeholder="Admin Password"
          autoFocus
          style={{
            width: "100%",
            background: T.bg,
            border: `2px solid ${error ? T.red : T.black}`,
            color: T.black,
            fontSize: 14,
            padding: "10px 14px",
            outline: "none",
            fontFamily: T.mono,
            letterSpacing: 2,
            textAlign: "center",
            marginBottom: 12,
            animation: shaking ? "shake 0.4s ease" : "none"
          }}
        />
        
        {error && (
          <div style={{ 
            fontSize: 11, 
            color: T.red, 
            fontFamily: T.mono, 
            marginBottom: 12, 
            textAlign: "center", 
            letterSpacing: 1 
          }}>✗ INCORRECT PASSWORD</div>
        )}
        
        <button
          onClick={attempt}
          disabled={!pw}
          style={{
            width: "100%",
            padding: "10px",
            background: pw ? T.orange : T.border,
            color: pw ? "#fff" : T.gray,
            border: `2px solid ${pw ? T.orange : T.black}`,
            fontSize: 11,
            fontWeight: 700,
            cursor: pw ? "pointer" : "not-allowed",
            letterSpacing: 2,
            fontFamily: T.mono
          }}
        >UNLOCK →</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function TaskCard({ task, onClick, allTasks }) {
  const blockedByTask = task.blockedBy 
    ? allTasks.find(t => t.id === task.blockedBy) 
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface,
        border: `2px solid ${T.black}`,
        padding: 14,
        marginBottom: 10,
        cursor: "pointer",
        transition: "all 0.15s"
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = T.orange;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = T.black;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Priority & Due Date */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 8 
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 8px",
          background: priorityColor(task.priority) + "20",
          color: priorityColor(task.priority),
          border: `1px solid ${priorityColor(task.priority)}`,
          fontFamily: T.mono,
          letterSpacing: 1
        }}>
          {task.priority.toUpperCase()}
        </span>
        
        {task.dueDate && (
          <span style={{
            fontSize: 10,
            color: isOverdue(task.dueDate) ? T.red : T.gray,
            fontFamily: T.mono,
            fontWeight: isOverdue(task.dueDate) ? 700 : 400
          }}>
            {isOverdue(task.dueDate) ? "⚠️ " : "📅 "}
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ 
        fontSize: 13, 
        fontWeight: 700, 
        color: T.black, 
        marginBottom: 6,
        lineHeight: 1.3
      }}>
        {task.title}
      </div>

      {/* Assignee */}
      <div style={{ 
        fontSize: 10, 
        color: T.gray, 
        fontFamily: T.mono, 
        marginBottom: 8 
      }}>
        👤 {task.assignee}
      </div>

      {/* Blocker Badge */}
      {blockedByTask && (
        <div style={{
          fontSize: 10,
          color: T.red,
          background: T.red + "10",
          border: `1px solid ${T.red}`,
          padding: "4px 8px",
          fontFamily: T.mono,
          marginBottom: 6
        }}>
          🔒 Blocked by: {blockedByTask.title}
        </div>
      )}

      {/* Source Badge */}
      {task.source !== "manual" && (
        <div style={{
          fontSize: 9,
          color: T.purple,
          fontFamily: T.mono,
          letterSpacing: 1
        }}>
          ⚡ Auto-imported from {task.source.toUpperCase()}
        </div>
      )}

      {/* Comments Count */}
      {task.comments && task.comments.length > 0 && (
        <div style={{
          fontSize: 10,
          color: T.gray,
          fontFamily: T.mono,
          marginTop: 6
        }}>
          💬 {task.comments.length} comment{task.comments.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE TASK MODAL
// ═══════════════════════════════════════════════════════════════════════════
function CreateTaskModal({ onClose, onCreate, allTasks }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignee: TEAM_MEMBERS[0],
    priority: "medium",
    dueDate: "",
    blockedBy: null
  });

  const handleCreate = () => {
    if (!formData.title.trim()) return;
    
    onCreate({
      ...formData,
      createdBy: "Admin",
      source: "manual"
    });
    
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 24
    }}>
      <div style={{
        background: T.surface,
        border: `2px solid ${T.black}`,
        maxWidth: 500,
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: `2px solid ${T.black}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: T.orange
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            fontFamily: T.mono,
            letterSpacing: 2
          }}>➕ CREATE NEW TASK</div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              padding: 4
            }}
          >✕</button>
        </div>

        {/* Form */}
        <div style={{ padding: 24 }}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.black,
              fontFamily: T.mono,
              display: "block",
              marginBottom: 6,
              letterSpacing: 1
            }}>TASK TITLE *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Review Q3 metrics report"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `2px solid ${T.black}`,
                fontSize: 13,
                outline: "none",
                fontFamily: T.body
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.black,
              fontFamily: T.mono,
              display: "block",
              marginBottom: 6,
              letterSpacing: 1
            }}>DESCRIPTION</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional details..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `2px solid ${T.black}`,
                fontSize: 13,
                outline: "none",
                fontFamily: T.body,
                resize: "vertical"
              }}
            />
          </div>

          {/* Assignee & Priority */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16
          }}>
            <div>
              <label style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.black,
                fontFamily: T.mono,
                display: "block",
                marginBottom: 6,
                letterSpacing: 1
              }}>ASSIGNEE *</label>
              <select
                value={formData.assignee}
                onChange={e => setFormData({ ...formData, assignee: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `2px solid ${T.black}`,
                  fontSize: 13,
                  outline: "none",
                  fontFamily: T.body
                }}
              >
                {TEAM_MEMBERS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.black,
                fontFamily: T.mono,
                display: "block",
                marginBottom: 6,
                letterSpacing: 1
              }}>PRIORITY</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `2px solid ${T.black}`,
                  fontSize: 13,
                  outline: "none",
                  fontFamily: T.body
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Due Date & Blocker */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 24
          }}>
            <div>
              <label style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.black,
                fontFamily: T.mono,
                display: "block",
                marginBottom: 6,
                letterSpacing: 1
              }}>DUE DATE</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `2px solid ${T.black}`,
                  fontSize: 13,
                  outline: "none",
                  fontFamily: T.mono
                }}
              />
            </div>

            <div>
              <label style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.black,
                fontFamily: T.mono,
                display: "block",
                marginBottom: 6,
                letterSpacing: 1
              }}>BLOCKED BY</label>
              <select
                value={formData.blockedBy || ""}
                onChange={e => setFormData({ 
                  ...formData, 
                  blockedBy: e.target.value ? parseInt(e.target.value) : null 
                })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `2px solid ${T.black}`,
                  fontSize: 13,
                  outline: "none",
                  fontFamily: T.body
                }}
              >
                <option value="">None</option>
                {allTasks
                  .filter(t => t.status !== "done")
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleCreate}
              disabled={!formData.title.trim()}
              style={{
                flex: 1,
                padding: "12px",
                background: formData.title.trim() ? T.orange : T.border,
                color: formData.title.trim() ? "#fff" : T.gray,
                border: `2px solid ${T.black}`,
                fontSize: 11,
                fontWeight: 700,
                cursor: formData.title.trim() ? "pointer" : "not-allowed",
                letterSpacing: 2,
                fontFamily: T.mono
              }}
            >CREATE TASK</button>
            <button
              onClick={onClose}
              style={{
                padding: "12px 20px",
                background: T.surface,
                color: T.black,
                border: `2px solid ${T.black}`,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: 2,
                fontFamily: T.mono
              }}
            >CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════
function TaskDetailModal({ task, onClose, onUpdate, onDelete, allTasks }) {
  const [comment, setComment] = useState("");
  const blockedByTask = task.blockedBy 
    ? allTasks.find(t => t.id === task.blockedBy) 
    : null;

  const addComment = () => {
    if (!comment.trim()) return;
    
    const newComment = {
      author: "Admin",
      text: comment,
      timestamp: new Date().toISOString()
    };
    
    onUpdate(task.id, {
      comments: [...(task.comments || []), newComment]
    });
    
    setComment("");
  };

  const changeStatus = (newStatus) => {
    onUpdate(task.id, { status: newStatus });
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 24
    }}>
      <div style={{
        background: T.surface,
        border: `2px solid ${T.black}`,
        maxWidth: 600,
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: `2px solid ${T.black}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: T.black
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            fontFamily: T.mono,
            letterSpacing: 2
          }}>TASK DETAILS</div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
              padding: 4
            }}
          >✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Title & Priority */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 8
            }}>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "3px 10px",
                background: priorityColor(task.priority) + "20",
                color: priorityColor(task.priority),
                border: `1px solid ${priorityColor(task.priority)}`,
                fontFamily: T.mono,
                letterSpacing: 1
              }}>
                {task.priority.toUpperCase()}
              </span>
              
              {task.dueDate && (
                <span style={{
                  fontSize: 11,
                  color: isOverdue(task.dueDate) ? T.red : T.gray,
                  fontFamily: T.mono,
                  fontWeight: isOverdue(task.dueDate) ? 700 : 400
                }}>
                  {isOverdue(task.dueDate) ? "⚠️ OVERDUE: " : "📅 Due: "}
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>
            
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: T.black,
              lineHeight: 1.3
            }}>{task.title}</div>
          </div>

          {/* Meta Info */}
          <div style={{
            background: T.bg,
            border: `1px solid ${T.border}`,
            padding: 12,
            marginBottom: 20,
            fontSize: 11,
            fontFamily: T.mono,
            color: T.gray
          }}>
            <div>👤 Assigned to: <strong style={{ color: T.black }}>{task.assignee}</strong></div>
            <div>🎯 Created by: {task.createdBy} on {formatDate(task.createdAt)}</div>
            {task.completedAt && (
              <div>✅ Completed: {formatDate(task.completedAt)}</div>
            )}
            {task.source !== "manual" && (
              <div>⚡ Source: Auto-imported from {task.source.toUpperCase()}</div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.black,
                fontFamily: T.mono,
                marginBottom: 8,
                letterSpacing: 1
              }}>DESCRIPTION</div>
              <div style={{
                fontSize: 13,
                color: T.darkGray,
                lineHeight: 1.6,
                background: T.bg,
                padding: 12,
                border: `1px solid ${T.border}`
              }}>{task.description}</div>
            </div>
          )}

          {/* Blocker */}
          {blockedByTask && (
            <div style={{
              marginBottom: 20,
              background: T.red + "10",
              border: `2px solid ${T.red}`,
              padding: 12
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.red,
                fontFamily: T.mono,
                marginBottom: 4,
                letterSpacing: 1
              }}>🔒 BLOCKED BY</div>
              <div style={{
                fontSize: 13,
                color: T.black,
                fontWeight: 600
              }}>{blockedByTask.title}</div>
              <div style={{
                fontSize: 11,
                color: T.gray,
                fontFamily: T.mono,
                marginTop: 4
              }}>Status: {blockedByTask.status}</div>
            </div>
          )}

          {/* Status Change Buttons */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.black,
              fontFamily: T.mono,
              marginBottom: 8,
              letterSpacing: 1
            }}>CHANGE STATUS</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["pending", "in_progress", "done"].map(status => (
                <button
                  key={status}
                  onClick={() => changeStatus(status)}
                  disabled={task.status === status}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: task.status === status 
                      ? T.black 
                      : T.surface,
                    color: task.status === status 
                      ? "#fff" 
                      : T.black,
                    border: `2px solid ${T.black}`,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: task.status === status ? "default" : "pointer",
                    letterSpacing: 1,
                    fontFamily: T.mono,
                    opacity: task.status === status ? 1 : 0.6
                  }}
                >
                  {status === "pending" && "PENDING"}
                  {status === "in_progress" && "IN PROGRESS"}
                  {status === "done" && "DONE"}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.black,
              fontFamily: T.mono,
              marginBottom: 8,
              letterSpacing: 1
            }}>💬 COMMENTS ({task.comments?.length || 0})</div>
            
            {/* Comment List */}
            {task.comments && task.comments.length > 0 && (
              <div style={{
                maxHeight: 200,
                overflowY: "auto",
                marginBottom: 12,
                background: T.bg,
                border: `1px solid ${T.border}`,
                padding: 12
              }}>
                {task.comments.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: i < task.comments.length - 1 ? 12 : 0,
                      paddingBottom: i < task.comments.length - 1 ? 12 : 0,
                      borderBottom: i < task.comments.length - 1 
                        ? `1px solid ${T.border}` 
                        : "none"
                    }}
                  >
                    <div style={{
                      fontSize: 10,
                      color: T.gray,
                      fontFamily: T.mono,
                      marginBottom: 4
                    }}>
                      <strong>{c.author}</strong> · {formatDate(c.timestamp)}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: T.black,
                      lineHeight: 1.5
                    }}>{c.text}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && comment.trim() && addComment()}
                placeholder="Add a comment..."
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: `2px solid ${T.black}`,
                  fontSize: 12,
                  outline: "none",
                  fontFamily: T.body
                }}
              />
              <button
                onClick={addComment}
                disabled={!comment.trim()}
                style={{
                  padding: "8px 16px",
                  background: comment.trim() ? T.orange : T.border,
                  color: comment.trim() ? "#fff" : T.gray,
                  border: `2px solid ${T.black}`,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: comment.trim() ? "pointer" : "not-allowed",
                  letterSpacing: 1,
                  fontFamily: T.mono
                }}
              >POST</button>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete this task?")) {
                onDelete(task.id);
                onClose();
              }
            }}
            style={{
              width: "100%",
              padding: "10px",
              background: T.surface,
              color: T.red,
              border: `2px solid ${T.red}`,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 2,
              fontFamily: T.mono
            }}
          >🗑️ DELETE TASK</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK BOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function TaskBoard({ tasks, onTaskClick }) {
  const columns = [
    { key: "pending", label: "📋 PENDING", color: T.gray },
    { key: "in_progress", label: "⚡ IN PROGRESS", color: T.yellow },
    { key: "done", label: "✅ DONE", color: T.green }
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 16,
      marginTop: 20
    }}>
      {columns.map(col => {
        const columnTasks = tasks.filter(t => t.status === col.key);
        
        return (
          <div key={col.key}>
            {/* Column Header */}
            <div style={{
              background: T.black,
              color: "#fff",
              padding: "10px 14px",
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: `2px solid ${T.black}`,
              borderBottom: `3px solid ${col.color}`
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: T.mono,
                letterSpacing: 2
              }}>{col.label}</span>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                background: col.color + "30",
                color: col.color,
                padding: "2px 8px",
                border: `1px solid ${col.color}`
              }}>{columnTasks.length}</span>
            </div>

            {/* Tasks */}
            <div style={{ minHeight: 200 }}>
              {columnTasks.length === 0 ? (
                <div style={{
                  background: T.bg,
                  border: `2px dashed ${T.border}`,
                  padding: 24,
                  textAlign: "center",
                  color: T.gray,
                  fontSize: 11,
                  fontFamily: T.mono
                }}>
                  No tasks
                </div>
              ) : (
                columnTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    allTasks={tasks}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TASK MANAGEMENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function TaskManagement() {
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Load tasks on mount
  useEffect(() => {
    if (adminUnlocked) {
      loadTasks();
    }
  }, [adminUnlocked]);

  const loadTasks = async () => {
    setLoading(true);
    const fetchedTasks = await taskAPI.getAll();
    setTasks(fetchedTasks);
    setLoading(false);
  };

  const handleCreateTask = async (taskData) => {
    const newTask = await taskAPI.create(taskData);
    if (newTask) {
      setTasks([...tasks, newTask]);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    const updatedTask = await taskAPI.update(taskId, updates);
    if (updatedTask) {
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
    }
  };

  const handleDeleteTask = async (taskId) => {
    const success = await taskAPI.delete(taskId);
    if (success) {
      setTasks(tasks.filter(t => t.id !== taskId));
    }
  };

  // Apply filters
  const filteredTasks = tasks.filter(t => {
    if (filterAssignee !== "all" && t.assignee !== filterAssignee) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  // Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
    overdue: tasks.filter(t => t.dueDate && isOverdue(t.dueDate) && t.status !== "done").length
  };

  if (!adminUnlocked) {
    return <AdminGate onUnlock={() => setAdminUnlocked(true)} />;
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: "50vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        fontSize: 14,
        color: T.gray,
        fontFamily: T.mono
      }}>
        Loading tasks...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: `2px solid ${T.black}`
      }}>
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: T.black,
            margin: "0 0 4px 0",
            fontFamily: T.font,
            letterSpacing: -1
          }}>TASK MANAGEMENT</h1>
          <p style={{
            fontSize: 12,
            color: T.gray,
            margin: 0,
            fontFamily: T.mono
          }}>Organize and track team assignments</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "10px 20px",
            background: T.orange,
            color: "#fff",
            border: `2px solid ${T.black}`,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 2,
            fontFamily: T.mono,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >➕ NEW TASK</button>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
        marginBottom: 24
      }}>
        <div style={{
          background: T.surface,
          border: `2px solid ${T.black}`,
          padding: 14,
          textAlign: "center"
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.black }}>{stats.total}</div>
          <div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono, letterSpacing: 1 }}>TOTAL</div>
        </div>
        <div style={{
          background: T.surface,
          border: `2px solid ${T.black}`,
          padding: 14,
          textAlign: "center",
          borderBottom: `3px solid ${T.gray}`
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.gray }}>{stats.pending}</div>
          <div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono, letterSpacing: 1 }}>PENDING</div>
        </div>
        <div style={{
          background: T.surface,
          border: `2px solid ${T.black}`,
          padding: 14,
          textAlign: "center",
          borderBottom: `3px solid ${T.yellow}`
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.yellow }}>{stats.inProgress}</div>
          <div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono, letterSpacing: 1 }}>IN PROGRESS</div>
        </div>
        <div style={{
          background: T.surface,
          border: `2px solid ${T.black}`,
          padding: 14,
          textAlign: "center",
          borderBottom: `3px solid ${T.green}`
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.green }}>{stats.done}</div>
          <div style={{ fontSize: 10, color: T.gray, fontFamily: T.mono, letterSpacing: 1 }}>DONE</div>
        </div>
        {stats.overdue > 0 && (
          <div style={{
            background: T.red + "10",
            border: `2px solid ${T.red}`,
            padding: 14,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: T.red }}>{stats.overdue}</div>
            <div style={{ fontSize: 10, color: T.red, fontFamily: T.mono, letterSpacing: 1 }}>OVERDUE</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{
        background: T.surface,
        border: `2px solid ${T.black}`,
        padding: 16,
        marginBottom: 24,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12
      }}>
        <div>
          <label style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.black,
            fontFamily: T.mono,
            display: "block",
            marginBottom: 6,
            letterSpacing: 1
          }}>FILTER BY ASSIGNEE</label>
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: `2px solid ${T.black}`,
              fontSize: 12,
              fontFamily: T.body
            }}
          >
            <option value="all">All Team Members</option>
            {TEAM_MEMBERS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.black,
            fontFamily: T.mono,
            display: "block",
            marginBottom: 6,
            letterSpacing: 1
          }}>FILTER BY PRIORITY</label>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: `2px solid ${T.black}`,
              fontSize: 12,
              fontFamily: T.body
            }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Board */}
      <TaskBoard
        tasks={filteredTasks}
        onTaskClick={setSelectedTask}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTask}
          allTasks={tasks}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          allTasks={tasks}
        />
      )}
    </div>
  );
}
