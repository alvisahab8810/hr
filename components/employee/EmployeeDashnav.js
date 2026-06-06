"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const TYPE_ICON = {
  task_assigned:         { icon: "bi-person-check-fill",   color: "#4F46E5" },
  task_reassigned:       { icon: "bi-arrow-left-right",    color: "#7C3AED" },
  task_status_changed:   { icon: "bi-arrow-repeat",        color: "#0284C7" },
  task_comment_added:    { icon: "bi-chat-dots-fill",      color: "#0891B2" },
  task_overdue:          { icon: "bi-exclamation-circle-fill", color: "#DC2626" },
  task_due_soon:         { icon: "bi-clock-fill",          color: "#D97706" },
  task_completed:        { icon: "bi-check-circle-fill",   color: "#16A34A" },
  task_blocked:          { icon: "bi-x-circle-fill",       color: "#DC2626" },
  task_request_reviewed: { icon: "bi-star-fill",           color: "#D97706" },
  default:               { icon: "bi-bell-fill",           color: "#6366F1" },
};

function timeAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function authH() {
  const t = typeof window !== "undefined" ? localStorage.getItem("employeeToken") : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function EmployeeDashnav() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [data, setData]       = useState({ recent: [], total: 0, dmUnread: 0 });
  const [marking, setMarking] = useState(false);
  const dropRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const r = await fetch("/api/employee/notifications", { headers: authH() });
      if (r.ok) {
        const d = await r.json();
        if (d.success) setData({ recent: d.recent || [], total: d.total || 0, dmUnread: d.dmUnread || 0 });
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30000);
    return () => clearInterval(iv);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAllRead() {
    setMarking(true);
    try {
      await fetch("/api/employee/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify({ markRead: true }),
      });
      setData(d => ({ ...d, recent: [], total: d.dmUnread, taskUnread: 0 }));
    } catch {}
    setMarking(false);
  }

  const total = data.total;

  return (
    <div className="main-nav dash-nav">
      <nav className="navbar">
        <div className="main-container">
          <div className="col-12">
            <div className="navbar-header">
              <a href="#" className="bars" />
              <a className="navbar-brand" href="/employee/dashboard">
                <img src="/assets/images/logo.png" width="100" alt="Viralon" />
              </a>
            </div>

            <ul className="nav navbar-nav navbar-left" />

            <ul className="nav navbar-nav navbar-right mobile-none"
              style={{ display: "flex", alignItems: "center", gap: 8 }}>

              {/* DM badge */}
              {data.dmUnread > 0 && (
                <li style={{ listStyle: "none" }}>
                  <a href="/employee/community"
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, background:"rgba(255,255,255,.15)", border:"1.5px solid rgba(255,255,255,.25)", color:"#fff", fontSize:12, fontWeight:600, textDecoration:"none" }}>
                    <i className="bi bi-chat-dots-fill" style={{ fontSize:14 }} />
                    {data.dmUnread} DM{data.dmUnread > 1 ? "s" : ""}
                  </a>
                </li>
              )}

              {/* Notification bell */}
              <li style={{ listStyle: "none" }} ref={dropRef}>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setOpen(o => !o)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", width:36, height:36, borderRadius:8, background: total > 0 ? "#EEF2FF" : "rgba(255,255,255,.15)", border:"1.5px solid rgba(255,255,255,.25)", position:"relative", cursor:"pointer", outline:"none" }}>
                    <i className="bi bi-bell-fill" style={{ fontSize:15, color: total > 0 ? "#4F46E5" : "#fff" }} />
                    {total > 0 && (
                      <span style={{ position:"absolute", top:-5, right:-5, background:"#EF4444", color:"#fff", fontSize:9, fontWeight:800, minWidth:16, height:16, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #fff", padding:"0 3px" }}>
                        {total > 99 ? "99+" : total}
                      </span>
                    )}
                  </button>

                  {open && (
                    <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"#fff", border:"1.5px solid #E2E8F0", borderRadius:14, minWidth:300, maxWidth:360, boxShadow:"0 10px 32px rgba(0,0,0,.14)", zIndex:9999, overflow:"hidden" }}>

                      {/* Header */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px 10px", borderBottom:"1px solid #F1F5F9" }}>
                        <div style={{ fontSize:12, fontWeight:800, color:"#0f172a", display:"flex", alignItems:"center", gap:6 }}>
                          <i className="bi bi-bell-fill" style={{ color:"#4F46E5", fontSize:13 }} />
                          Notifications
                          {data.recent.length > 0 && (
                            <span style={{ background:"#EEF2FF", color:"#4F46E5", fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:20 }}>
                              {data.recent.length}
                            </span>
                          )}
                        </div>
                        {data.recent.length > 0 && (
                          <button onClick={markAllRead} disabled={marking}
                            style={{ fontSize:10.5, fontWeight:700, color:"#4F46E5", background:"none", border:"none", cursor:"pointer", opacity: marking ? .5 : 1 }}>
                            {marking ? "Marking…" : "Mark all read"}
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div style={{ maxHeight:320, overflowY:"auto" }}>
                        {data.recent.length === 0 ? (
                          <div style={{ padding:"28px 16px", textAlign:"center" }}>
                            <i className="bi bi-check2-all" style={{ fontSize:26, color:"#22C55E", display:"block", marginBottom:6 }} />
                            <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>All caught up!</div>
                            <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>No new notifications</div>
                          </div>
                        ) : (
                          data.recent.map((n, i) => {
                            const meta = TYPE_ICON[n.type] || TYPE_ICON.default;
                            return (
                              <div key={n._id}
                                onClick={() => { if (n.taskId) router.push(`/employee/tasks`); setOpen(false); }}
                                style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 16px", cursor: n.taskId ? "pointer" : "default", borderBottom: i < data.recent.length - 1 ? "1px solid #F8FAFC" : "none", transition:"background .15s" }}
                                onMouseEnter={e => { if (n.taskId) e.currentTarget.style.background = "#F8FAFC"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <div style={{ width:30, height:30, borderRadius:"50%", background: meta.color + "15", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                                  <i className={`bi ${meta.icon}`} style={{ fontSize:13, color:meta.color }} />
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:11, fontWeight:700, color:meta.color, marginBottom:2 }}>{n.label}</div>
                                  <div style={{ fontSize:11.5, color:"#374151", lineHeight:1.45, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                                    {n.message}
                                  </div>
                                  <div style={{ fontSize:10, color:"#94a3b8", marginTop:3 }}>{timeAgo(n.at)}</div>
                                </div>
                                <div style={{ width:7, height:7, borderRadius:"50%", background:"#4F46E5", flexShrink:0, marginTop:6 }} />
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div style={{ padding:"9px 16px 11px", borderTop:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span onClick={() => { router.push("/employee/tasks"); setOpen(false); }}
                          style={{ fontSize:12, fontWeight:700, color:"#4F46E5", cursor:"pointer" }}>
                          View all notifications →
                        </span>
                        {data.dmUnread > 0 && (
                          <span onClick={() => { router.push("/employee/community"); setOpen(false); }}
                            style={{ fontSize:11, color:"#64748b", cursor:"pointer" }}>
                            <i className="bi bi-chat-dots me-1" />{data.dmUnread} unread DM{data.dmUnread > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}
