// pages/dashboard/admin/users.js
import Head from "next/head";
import React, { useEffect, useState, useCallback } from "react";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { toast } from "react-toastify";

const ROLES = ["Manager", "HR", "Accountant", "Viewer"];

const PERMISSIONS = [
  { key: "dashboard",    label: "Dashboard",     icon: "bi-house-fill"          },
  { key: "employees",    label: "Employees",     icon: "bi-people-fill"         },
  { key: "attendance",   label: "Attendance",    icon: "bi-calendar-check-fill" },
  { key: "leaves",       label: "Leaves",        icon: "bi-calendar-minus-fill" },
  { key: "salaryReport", label: "Salary Report", icon: "bi-cash-stack"          },
  { key: "reimbursement",label: "Reimbursement", icon: "bi-receipt"             },
  { key: "overtime",     label: "Overtime",      icon: "bi-clock-history"       },
  { key: "deductions",   label: "Deductions",    icon: "bi-shield-check-fill"   },
  { key: "holidays",     label: "Holidays",      icon: "bi-calendar-event-fill" },
  { key: "tasks",        label: "Tasks",         icon: "bi-check2-square"       },
  { key: "projects",     label: "Projects",      icon: "bi-kanban-fill"         },
  { key: "clients",      label: "Clients",       icon: "bi-briefcase-fill"      },
  { key: "community",   label: "Community",     icon: "bi-chat-dots-fill"      },
];

const ACTION_META = {
  task_created:            { icon: "bi-plus-circle-fill",    color: "#15803D", bg: "#DCFCE7", label: "Task Created"           },
  task_assigned:           { icon: "bi-person-check-fill",   color: "#4F46E5", bg: "#EEF2FF", label: "Task Assigned"          },
  reassigned:              { icon: "bi-arrow-repeat",        color: "#7C3AED", bg: "#F5F3FF", label: "Reassigned"             },
  status_changed:          { icon: "bi-arrow-left-right",    color: "#0EA5E9", bg: "#F0F9FF", label: "Status Changed"         },
  priority_changed:        { icon: "bi-flag-fill",           color: "#B45309", bg: "#FEF3C7", label: "Priority Changed"       },
  due_date_changed:        { icon: "bi-calendar-check-fill", color: "#0891B2", bg: "#ECFEFF", label: "Due Date Changed"       },
  title_changed:           { icon: "bi-pencil-fill",         color: "#F97316", bg: "#FFF7ED", label: "Title Changed"          },
  task_deleted:            { icon: "bi-trash3-fill",         color: "#DC2626", bg: "#FEE2E2", label: "Task Deleted"           },
  comment_added:           { icon: "bi-chat-left-text-fill", color: "#6366F1", bg: "#EEF2FF", label: "Comment Added"          },
  leave_approved:          { icon: "bi-check-circle-fill",   color: "#15803D", bg: "#DCFCE7", label: "Leave Approved"         },
  leave_rejected:          { icon: "bi-x-circle-fill",       color: "#DC2626", bg: "#FEE2E2", label: "Leave Rejected"         },
  overtime_approved:       { icon: "bi-check-circle-fill",   color: "#15803D", bg: "#DCFCE7", label: "OT Approved"            },
  overtime_rejected:       { icon: "bi-x-circle-fill",       color: "#DC2626", bg: "#FEE2E2", label: "OT Rejected"            },
  reimbursement_approved:  { icon: "bi-check-circle-fill",   color: "#059669", bg: "#D1FAE5", label: "Reimbursement Approved" },
  reimbursement_rejected:  { icon: "bi-x-circle-fill",       color: "#B91C1C", bg: "#FEE2E2", label: "Reimbursement Rejected" },
};

const CATEGORY_TABS = [
  { key: "all",           label: "All Activity"  },
  { key: "task",          label: "Tasks"         },
  { key: "comment",       label: "Comments"      },
  { key: "leave",         label: "Leaves"        },
  { key: "overtime",      label: "Overtime"      },
  { key: "reimbursement", label: "Reimbursement" },
];

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    + " · " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateOnly(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const ROLE_COLORS = {
  Manager:   ["#EEF2FF", "#4F46E5"],
  HR:        ["#FEF3C7", "#B45309"],
  Accountant:["#DCFCE7", "#15803D"],
  Viewer:    ["#F3F4F6", "#6B7280"],
};

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });

const emptyPerms = () => Object.fromEntries(PERMISSIONS.map(p => [p.key, false]));

export default function AdminUsers() {
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState("All");
  const [createModal,   setCreateModal]   = useState(false);
  const [editUser,      setEditUser]      = useState(null);   // user being permission-edited
  const [deleteConfirm, setDeleteConfirm] = useState(null);   // user to delete
  const [submitting,    setSubmitting]    = useState(false);
  const [resending,     setResending]     = useState(null);
  const [trackUser,     setTrackUser]     = useState(null);
  const [trackLogs,     setTrackLogs]     = useState([]);
  const [trackLoading,  setTrackLoading]  = useState(false);
  const [trackCategory, setTrackCategory] = useState("all");
  const [trackDate,     setTrackDate]     = useState({ start: "", end: "" });
  const [trackPreset,      setTrackPreset]      = useState("all");
  const [trackStats,       setTrackStats]       = useState({ total: 0, taskCount: 0, today: 0, thisWeek: 0 });
  const [trackPage,        setTrackPage]        = useState(1);
  const [trackHasMore,     setTrackHasMore]     = useState(false);
  const [trackLoadingMore, setTrackLoadingMore] = useState(false);
  const TRACK_LIMIT = 50;

  // Create form state
  const [form, setForm] = useState({ name: "", email: "", role: "Manager", permissions: emptyPerms() });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/admin-users", { credentials: "include" });
      const data = await res.json();
      if (data.success) setUsers(data.users);
      else toast.error("Failed to load users");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return toast.error("Name and email required");
    setSubmitting(true);
    try {
      const res  = await fetch("/api/admin/admin-users", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Invitation sent successfully!");
        setCreateModal(false);
        setForm({ name: "", email: "", role: "Manager", permissions: emptyPerms() });
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to create user");
      }
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handlePermissionSave = async () => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const res  = await fetch(`/api/admin/admin-users/${editUser._id}`, {
        method:      "PATCH",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ permissions: editUser.permissions }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Permissions updated");
        setEditUser(null);
        fetchUsers();
      } else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const res  = await fetch(`/api/admin/admin-users/${deleteConfirm._id}`, {
        method: "DELETE", credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("User removed");
        setDeleteConfirm(null);
        fetchUsers();
      } else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleResend = async (user) => {
    setResending(user._id);
    try {
      const res  = await fetch("/api/admin/admin-users/resend-invite", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ id: user._id }),
      });
      const data = await res.json();
      if (data.success) toast.success("Invitation resent!");
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setResending(null); }
  };

  const toYMD = (d) => d.toISOString().slice(0, 10);

  const DAY_PRESETS = [
    { key: "all",    label: "All Time" },
    { key: "today",  label: "Today"    },
    { key: "yesterday", label: "Yesterday" },
    { key: "7d",     label: "Last 7 Days" },
    { key: "30d",    label: "Last 30 Days" },
    { key: "month",  label: "This Month" },
  ];

  const presetToDates = (preset) => {
    const now = new Date();
    if (preset === "today") {
      const d = toYMD(now);
      return { start: d, end: d };
    }
    if (preset === "yesterday") {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const d = toYMD(y);
      return { start: d, end: d };
    }
    if (preset === "7d") {
      const from = new Date(now); from.setDate(from.getDate() - 6);
      return { start: toYMD(from), end: toYMD(now) };
    }
    if (preset === "30d") {
      const from = new Date(now); from.setDate(from.getDate() - 29);
      return { start: toYMD(from), end: toYMD(now) };
    }
    if (preset === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toYMD(from), end: toYMD(now) };
    }
    return { start: "", end: "" };
  };

  const openTrack = async (user) => {
    setTrackUser(user);
    setTrackCategory("all");
    setTrackDate({ start: "", end: "" });
    setTrackPreset("all");
    setTrackLogs([]);
    setTrackStats({ total: 0, taskCount: 0, today: 0, thisWeek: 0 });
    setTrackPage(1);
    setTrackHasMore(false);
    setTrackLoading(true);
    try {
      const res  = await fetch(`/api/admin/admin-users/activity?userId=${user._id}&page=1&limit=${TRACK_LIMIT}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setTrackLogs(data.logs || []);
        if (data.stats) setTrackStats(data.stats);
        setTrackHasMore((data.logs || []).length === TRACK_LIMIT && data.total > TRACK_LIMIT);
      }
    } catch { /* silent */ }
    finally { setTrackLoading(false); }
  };

  const fetchTrackLogs = async (userId, category, dateStart, dateEnd) => {
    setTrackLoading(true);
    setTrackPage(1);
    setTrackHasMore(false);
    try {
      const params = new URLSearchParams({ userId, page: 1, limit: TRACK_LIMIT });
      if (category && category !== "all") params.set("category", category);
      if (dateStart) params.set("dateStart", dateStart);
      if (dateEnd)   params.set("dateEnd",   dateEnd);
      const res  = await fetch(`/api/admin/admin-users/activity?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setTrackLogs(data.logs || []);
        if (data.stats) setTrackStats(data.stats);
        setTrackHasMore((data.logs || []).length === TRACK_LIMIT && data.total > TRACK_LIMIT);
      }
    } catch { /* silent */ }
    finally { setTrackLoading(false); }
  };

  const loadMoreLogs = async () => {
    if (!trackUser || trackLoadingMore) return;
    setTrackLoadingMore(true);
    const nextPage = trackPage + 1;
    try {
      const params = new URLSearchParams({ userId: trackUser._id, page: nextPage, limit: TRACK_LIMIT });
      if (trackCategory && trackCategory !== "all") params.set("category", trackCategory);
      if (trackDate.start) params.set("dateStart", trackDate.start);
      if (trackDate.end)   params.set("dateEnd",   trackDate.end);
      const res  = await fetch(`/api/admin/admin-users/activity?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setTrackLogs(prev => [...prev, ...(data.logs || [])]);
        setTrackPage(nextPage);
        setTrackHasMore((data.logs || []).length === TRACK_LIMIT && (trackLogs.length + (data.logs || []).length) < data.total);
      }
    } catch { /* silent */ }
    finally { setTrackLoadingMore(false); }
  };

  const togglePerm = (key, target = "form") => {
    if (target === "form") {
      setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
    } else {
      setEditUser(u => ({ ...u, permissions: { ...u.permissions, [key]: !u.permissions[key] } }));
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchName  = u.name.toLowerCase().includes(q);
    const matchEmail = u.email.toLowerCase().includes(q);
    const matchRole  = roleFilter === "All" || u.role === roleFilter;
    return (matchName || matchEmail) && matchRole;
  });

  const activeCount  = users.filter(u => u.status === "Active").length;
  const pendingCount = users.filter(u => u.status === "Pending").length;

  const stats = [
    { accent: "indigo", icon: "bi-people-fill",         val: users.length,  label: "Total Users",    pct: 100 },
    { accent: "green",  icon: "bi-check-circle-fill",   val: activeCount,   label: "Active",          pct: users.length ? (activeCount / users.length) * 100 : 0 },
    { accent: "orange", icon: "bi-hourglass-split",      val: pendingCount,  label: "Pending Invite",  pct: users.length ? (pendingCount / users.length) * 100 : 0 },
  ];

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>User Management — Viralon Admin</title>
        <style>{`
          .um-card { background:#fff; border-radius:16px; border:1px solid #F1F5F9; box-shadow:0 1px 8px rgba(0,0,0,.05); }
          .um-input { width:100%; padding:9px 13px; border-radius:10px; border:1.5px solid #E5E7EB;
                      font-size:13px; outline:none; transition:border .15s; }
          .um-input:focus { border-color:#6366F1; }
          .um-btn { border:none; cursor:pointer; border-radius:10px; padding:9px 18px;
                    font-size:13px; font-weight:700; transition:all .15s; display:inline-flex; align-items:center; gap:6px; }
          .um-btn:disabled { opacity:.5; cursor:default; }
          .um-overlay { position:fixed; inset:0; background:rgba(15,15,35,.55); backdrop-filter:blur(4px);
                        z-index:1050; display:flex; align-items:center; justify-content:center; padding:16px; }
          @keyframes slideInRight { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
          .um-drawer { animation: slideInRight .28s cubic-bezier(.22,.61,.36,1) both; }
          .um-modal { background:#fff; border-radius:20px; width:100%; max-width:520px;
                      box-shadow:0 24px 64px rgba(0,0,0,.18); overflow:hidden; max-height:90vh; overflow-y:auto; }
          .um-perm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:8px; }
          .um-perm-item { display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:10px;
                          border:1.5px solid #E5E7EB; cursor:pointer; transition:all .15s; user-select:none; }
          .um-perm-item.checked { background:#EEF2FF; border-color:#818CF8; }
          .um-perm-item:hover { border-color:#A5B4FC; }
          .um-row { padding:16px 20px; border-bottom:1px solid #F8FAFC; display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
          .um-row:last-child { border-bottom:none; }
          .um-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px;
                      border-radius:20px; font-size:11px; font-weight:700; }
          .um-check { width:18px; height:18px; border-radius:5px; border:2px solid #D1D5DB;
                      display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; }
          .um-check.on { background:#6366F1; border-color:#6366F1; }

          .um-stat {
            box-sizing:border-box; height:104px; border-radius:16px;
            padding:17px 18px 16px; display:flex; flex-direction:column;
            justify-content:space-between; border:1px solid;
            box-shadow:0 3px 12px rgba(15,23,42,.06); position:relative;
            overflow:hidden; transition:transform .2s ease, box-shadow .2s ease;
          }
          .um-stat:hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(15,23,42,.12); }
          .um-stat::before { content:""; position:absolute; top:0; left:0; right:0; height:3px; }
          .um-stat-top { display:flex; align-items:center; gap:14px; }
          .um-stat-icon { width:46px; height:46px; border-radius:13px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:19px; flex-shrink:0; }
          .um-stat-body { flex:1; min-width:0; }
          .um-stat-val { font-size:22px; font-weight:900; color:#0F172A; line-height:1.05; letter-spacing:-.6px; white-space:nowrap; }
          .um-stat-label { font-size:12px; color:#475569; font-weight:700; margin-top:3px; white-space:nowrap; }
          .um-stat-track { height:6px; background:#F1F5F9; border-radius:6px; }
          .um-stat-fill { height:6px; border-radius:6px; transition:width .4s; }

          .um-stat.indigo::before { background:#4F46E5; }
          .um-stat.indigo { background:linear-gradient(160deg,#fff 55%,#EEF2FF 165%); border-color:#C7D2FE; }
          .um-stat.indigo .um-stat-icon { background:#4F46E5; box-shadow:0 6px 16px #4F46E533; }
          .um-stat.indigo .um-stat-fill { background:#4F46E5; }

          .um-stat.green::before { background:#16A34A; }
          .um-stat.green { background:linear-gradient(160deg,#fff 55%,#DCFCE7 165%); border-color:#BBF7D0; }
          .um-stat.green .um-stat-icon { background:#16A34A; box-shadow:0 6px 16px #16A34A33; }
          .um-stat.green .um-stat-fill { background:#16A34A; }

          .um-stat.orange::before { background:#EA580C; }
          .um-stat.orange { background:linear-gradient(160deg,#fff 55%,#FFEDD5 165%); border-color:#FED7AA; }
          .um-stat.orange .um-stat-icon { background:#EA580C; box-shadow:0 6px 16px #EA580C33; }
          .um-stat.orange .um-stat-fill { background:#EA580C; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="container-fluid" style={{ padding:"24px 20px" }}>

              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:12 }}>
                <div>
                  <h4 style={{ margin:0, fontWeight:800, fontSize:22, color:"#111827" }}>User Management</h4>
                  <p style={{ margin:"4px 0 0", fontSize:14, color:"#6B7280" }}>
                    Invite team members and control their access permissions
                  </p>
                </div>
                <button className="um-btn"
                  onClick={() => { setCreateModal(true); setForm({ name:"", email:"", role:"Manager", permissions:emptyPerms() }); }}
                  style={{ background:"linear-gradient(135deg,#4F46E5,#818CF8)", color:"#fff",
                    boxShadow:"0 4px 14px rgba(99,102,241,.3)", padding:"10px 20px", fontSize:14 }}>
                  <i className="bi bi-person-plus-fill" /> Invite User
                </button>
              </div>

              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20, alignItems:"start" }}>
                {stats.map((s, i) => (
                  <div key={i} className={`um-stat ${s.accent}`}>
                    <div className="um-stat-top">
                      <div className="um-stat-icon"><i className={`bi ${s.icon}`} /></div>
                      <div className="um-stat-body">
                        <div className="um-stat-val">{s.val}</div>
                        <div className="um-stat-label">{s.label}</div>
                      </div>
                    </div>
                    <div className="um-stat-track">
                      <div className="um-stat-fill" style={{ width:`${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="um-card" style={{ padding:"13px 18px", marginBottom:14, display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
                <div style={{ position:"relative", flex:"1 1 220px" }}>
                  <i className="bi bi-search" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
                    fontSize:13, color:"#9CA3AF" }} />
                  <input className="um-input" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    style={{ paddingLeft:32 }} />
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {["All", ...ROLES].map(r => (
                    <button key={r} className="um-btn"
                      onClick={() => setRoleFilter(r)}
                      style={{
                        padding:"7px 14px", fontSize:12,
                        background: roleFilter === r ? "#6366F1" : "#F3F4F6",
                        color:      roleFilter === r ? "#fff"    : "#374151",
                      }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* User list */}
              <div className="um-card" style={{ overflow:"hidden" }}>
                {loading ? (
                  <div style={{ textAlign:"center", padding:"52px 20px", color:"#9CA3AF" }}>
                    <div className="spinner-border text-primary" />
                    <p style={{ marginTop:12 }}>Loading users…</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"52px 20px", color:"#9CA3AF" }}>
                    <i className="bi bi-people" style={{ fontSize:48, color:"#D1D5DB" }} />
                    <p style={{ marginTop:12, fontSize:15, fontWeight:600, color:"#374151" }}>
                      {users.length === 0 ? "No users yet" : "No users match your filter"}
                    </p>
                    {users.length === 0 && (
                      <p style={{ fontSize:13, marginTop:4 }}>Click "Invite User" to get started.</p>
                    )}
                  </div>
                ) : filtered.map(u => {
                  const [rbg, rcol] = ROLE_COLORS[u.role] || ROLE_COLORS.Viewer;
                  const activePCount = PERMISSIONS.filter(p => u.permissions?.[p.key]).length;

                  return (
                    <div key={u._id} className="um-row">
                      {/* Avatar */}
                      <div style={{ width:46, height:46, borderRadius:12, background: rbg, flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:rcol }}>
                        {u.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:160 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ fontWeight:700, fontSize:14, color:"#111827" }}>{u.name}</span>
                          <span className="um-badge" style={{ background:rbg, color:rcol }}>
                            {u.role}
                          </span>
                          <span className="um-badge"
                            style={{ background: u.status==="Active" ? "#DCFCE7" : "#FEF3C7",
                                     color:      u.status==="Active" ? "#15803D" : "#B45309" }}>
                            <span style={{ width:5, height:5, borderRadius:"50%",
                              background: u.status==="Active" ? "#22C55E" : "#F59E0B",
                              display:"inline-block" }} />
                            {u.status}
                          </span>
                        </div>
                        <div style={{ fontSize:12, color:"#9CA3AF", marginTop:3 }}>{u.email}</div>
                        <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>
                          {activePCount} permission{activePCount !== 1 ? "s" : ""} · Invited {fmt(u.createdAt)}
                        </div>
                      </div>

                      {/* Permission tags */}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4, maxWidth:280 }}>
                        {PERMISSIONS.filter(p => u.permissions?.[p.key]).slice(0, 5).map(p => (
                          <span key={p.key} style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:6,
                            background:"#F3F4F6", color:"#374151", display:"inline-flex", alignItems:"center", gap:3 }}>
                            <i className={`bi ${p.icon}`} style={{ fontSize:9, color:"#6366F1" }} />
                            {p.label}
                          </span>
                        ))}
                        {activePCount > 5 && (
                          <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:6,
                            background:"#EEF2FF", color:"#4F46E5" }}>
                            +{activePCount - 5} more
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap" }}>
                        <button className="um-btn"
                          onClick={() => openTrack(u)}
                          style={{ background:"#F0FDF4", color:"#15803D", padding:"7px 12px", fontSize:12 }}>
                          <i className="bi bi-activity" /> Track
                        </button>
                        <button className="um-btn"
                          onClick={() => setEditUser({ ...u, permissions: { ...emptyPerms(), ...(u.permissions || {}) } })}
                          style={{ background:"#EEF2FF", color:"#4F46E5", padding:"7px 12px", fontSize:12 }}>
                          <i className="bi bi-shield-lock" /> Permissions
                        </button>

                        {u.status === "Pending" && (
                          <button className="um-btn"
                            disabled={resending === u._id}
                            onClick={() => handleResend(u)}
                            style={{ background:"#FEF3C7", color:"#B45309", padding:"7px 12px", fontSize:12 }}>
                            {resending === u._id
                              ? <span className="spinner-border spinner-border-sm" />
                              : <><i className="bi bi-envelope-arrow-up" /> Resend</>}
                          </button>
                        )}

                        <button className="um-btn"
                          onClick={() => setDeleteConfirm(u)}
                          style={{ background:"#FEE2E2", color:"#DC2626", padding:"7px 12px", fontSize:12 }}>
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ══ CREATE / INVITE MODAL ══ */}
      {createModal && (
        <div className="um-overlay" onClick={() => setCreateModal(false)}>
          <div className="um-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ background:"linear-gradient(135deg,#4F46E5,#818CF8)", padding:"24px 28px" }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,.2)",
                display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                <i className="bi bi-person-plus-fill" style={{ fontSize:20, color:"#fff" }} />
              </div>
              <h5 style={{ margin:0, color:"#fff", fontWeight:800, fontSize:18 }}>Invite New User</h5>
              <p style={{ margin:"4px 0 0", color:"rgba(255,255,255,.8)", fontSize:13 }}>
                An invitation email will be sent with a password setup link
              </p>
            </div>

            <form onSubmit={handleCreate} style={{ padding:"24px 28px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>
                    Full Name <span style={{ color:"#EF4444" }}>*</span>
                  </label>
                  <input className="um-input" value={form.name} onChange={e => setForm(f=>({...f, name:e.target.value}))}
                    placeholder="John Smith" required />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>
                    Role <span style={{ color:"#EF4444" }}>*</span>
                  </label>
                  <select className="um-input" value={form.role} onChange={e => setForm(f=>({...f, role:e.target.value}))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>
                  Email Address <span style={{ color:"#EF4444" }}>*</span>
                </label>
                <input className="um-input" type="email" value={form.email}
                  onChange={e => setForm(f=>({...f, email:e.target.value}))}
                  placeholder="user@company.com" required />
              </div>

              {/* Permissions */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:"#374151" }}>Access Permissions</label>
                  <div style={{ display:"flex", gap:8 }}>
                    <button type="button" style={{ fontSize:11, color:"#6366F1", background:"none", border:"none", cursor:"pointer", fontWeight:700 }}
                      onClick={() => setForm(f => ({ ...f, permissions: Object.fromEntries(PERMISSIONS.map(p=>[p.key,true])) }))}>
                      Select All
                    </button>
                    <span style={{ color:"#E5E7EB" }}>|</span>
                    <button type="button" style={{ fontSize:11, color:"#9CA3AF", background:"none", border:"none", cursor:"pointer", fontWeight:700 }}
                      onClick={() => setForm(f => ({ ...f, permissions: emptyPerms() }))}>
                      Clear
                    </button>
                  </div>
                </div>
                <div className="um-perm-grid">
                  {PERMISSIONS.map(p => {
                    const checked = !!form.permissions[p.key];
                    return (
                      <div key={p.key} className={`um-perm-item ${checked ? "checked" : ""}`}
                        onClick={() => togglePerm(p.key, "form")}>
                        <div className={`um-check ${checked ? "on" : ""}`}>
                          {checked && <i className="bi bi-check" style={{ fontSize:11, color:"#fff", fontWeight:800 }} />}
                        </div>
                        <i className={`bi ${p.icon}`} style={{ fontSize:13, color: checked ? "#6366F1" : "#9CA3AF" }} />
                        <span style={{ fontSize:12, fontWeight:600, color: checked ? "#4338CA" : "#374151" }}>
                          {p.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button type="button" className="um-btn" onClick={() => setCreateModal(false)}
                  style={{ flex:1, background:"#F3F4F6", color:"#374151" }}>Cancel</button>
                <button type="submit" className="um-btn" disabled={submitting}
                  style={{ flex:2, background:"linear-gradient(135deg,#4F46E5,#818CF8)", color:"#fff" }}>
                  {submitting
                    ? <><span className="spinner-border spinner-border-sm" /> Sending…</>
                    : <><i className="bi bi-send-fill" /> Send Invitation</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ EDIT PERMISSIONS MODAL ══ */}
      {editUser && (
        <div className="um-overlay" onClick={() => setEditUser(null)}>
          <div className="um-modal" onClick={e => e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#1E1B4B,#4F46E5)", padding:"24px 28px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:ROLE_COLORS[editUser.role]?.[0] || "#F3F4F6",
                  display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16,
                  color:ROLE_COLORS[editUser.role]?.[1] || "#374151", flexShrink:0 }}>
                  {editUser.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div>
                  <h5 style={{ margin:0, color:"#fff", fontWeight:800 }}>{editUser.name}</h5>
                  <p style={{ margin:0, color:"rgba(255,255,255,.7)", fontSize:13 }}>{editUser.email} · {editUser.role}</p>
                </div>
              </div>
            </div>

            <div style={{ padding:"24px 28px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>Access Permissions</span>
                <div style={{ display:"flex", gap:8 }}>
                  <button type="button" style={{ fontSize:11, color:"#6366F1", background:"none", border:"none", cursor:"pointer", fontWeight:700 }}
                    onClick={() => setEditUser(u => ({ ...u, permissions: Object.fromEntries(PERMISSIONS.map(p=>[p.key,true])) }))}>
                    Select All
                  </button>
                  <span style={{ color:"#E5E7EB" }}>|</span>
                  <button type="button" style={{ fontSize:11, color:"#9CA3AF", background:"none", border:"none", cursor:"pointer", fontWeight:700 }}
                    onClick={() => setEditUser(u => ({ ...u, permissions: emptyPerms() }))}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="um-perm-grid" style={{ marginBottom:24 }}>
                {PERMISSIONS.map(p => {
                  const checked = !!editUser.permissions?.[p.key];
                  return (
                    <div key={p.key} className={`um-perm-item ${checked ? "checked" : ""}`}
                      onClick={() => togglePerm(p.key, "edit")}>
                      <div className={`um-check ${checked ? "on" : ""}`}>
                        {checked && <i className="bi bi-check" style={{ fontSize:11, color:"#fff" }} />}
                      </div>
                      <i className={`bi ${p.icon}`} style={{ fontSize:13, color: checked ? "#6366F1" : "#9CA3AF" }} />
                      <span style={{ fontSize:12, fontWeight:600, color: checked ? "#4338CA" : "#374151" }}>{p.label}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button className="um-btn" onClick={() => setEditUser(null)}
                  style={{ flex:1, background:"#F3F4F6", color:"#374151" }}>Cancel</button>
                <button className="um-btn" disabled={submitting} onClick={handlePermissionSave}
                  style={{ flex:2, background:"linear-gradient(135deg,#4F46E5,#818CF8)", color:"#fff" }}>
                  {submitting
                    ? <><span className="spinner-border spinner-border-sm" /> Saving…</>
                    : <><i className="bi bi-shield-check-fill" /> Save Permissions</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TRACK ACTIVITY DRAWER ══ */}
      {trackUser && (
        <div
          style={{ position:"fixed", inset:0, background:"rgba(15,15,35,.5)", backdropFilter:"blur(3px)",
            zIndex:1050, display:"flex", justifyContent:"flex-end" }}
          onClick={() => setTrackUser(null)}>
          <div className="um-drawer"
            style={{ background:"#fff", width:"min(820px,100vw)", height:"100vh",
              boxShadow:"-8px 0 48px rgba(0,0,0,.25)", overflow:"hidden",
              display:"flex", flexDirection:"column",
              borderRadius:"20px 0 0 20px" }}
            onClick={e => e.stopPropagation()}>

            {/* ── HEADER ── */}
            <div style={{ background:"linear-gradient(135deg,#0F0C29 0%,#302B63 50%,#24243e 100%)",
              padding:"28px 32px 0", flexShrink:0, position:"relative", overflow:"hidden" }}>

              {/* decorative circles */}
              <div style={{ position:"absolute", top:-60, right:-60, width:220, height:220,
                borderRadius:"50%", background:"rgba(255,255,255,.04)" }} />
              <div style={{ position:"absolute", top:20, right:80, width:100, height:100,
                borderRadius:"50%", background:"rgba(99,102,241,.15)" }} />

              {/* Top row: avatar + info + close */}
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", gap:18 }}>
                  {/* Avatar */}
                  <div style={{ width:64, height:64, borderRadius:18,
                    background:"linear-gradient(135deg,#6366F1,#818CF8)",
                    boxShadow:"0 8px 24px rgba(99,102,241,.4)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:900, fontSize:22, color:"#fff", flexShrink:0, letterSpacing:1 }}>
                    {trackUser.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <span style={{ color:"#fff", fontWeight:800, fontSize:20, letterSpacing:".2px" }}>
                        {trackUser.name}
                      </span>
                      <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                        background:"rgba(99,102,241,.3)", color:"#C7D2FE", letterSpacing:.5 }}>
                        {trackUser.role.toUpperCase()}
                      </span>
                      <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
                        background: trackUser.status==="Active" ? "rgba(34,197,94,.2)" : "rgba(251,191,36,.2)",
                        color: trackUser.status==="Active" ? "#86EFAC" : "#FDE68A" }}>
                        {trackUser.status}
                      </span>
                    </div>
                    <div style={{ color:"rgba(255,255,255,.5)", fontSize:13, marginTop:4 }}>
                      <i className="bi bi-envelope" style={{ marginRight:5 }} />
                      {trackUser.email}
                    </div>
                    <div style={{ color:"rgba(255,255,255,.35)", fontSize:11, marginTop:3 }}>
                      <i className="bi bi-calendar3" style={{ marginRight:4 }} />
                      Member since {fmt(trackUser.createdAt)}
                    </div>
                  </div>
                </div>
                <button onClick={() => setTrackUser(null)}
                  style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.15)",
                    borderRadius:12, width:38, height:38, color:"rgba(255,255,255,.8)",
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, transition:"all .15s" }}>
                  <i className="bi bi-x-lg" style={{ fontSize:15 }} />
                </button>
              </div>

              {/* Stats strip — values come from server-side counts, not the paginated log list */}
              <div style={{ display:"flex", gap:0, borderTop:"1px solid rgba(255,255,255,.08)", paddingTop:0, marginBottom:0 }}>
                {[
                  { icon:"bi-activity",      label:"Total Actions", value: trackStats.total,     accent:"#818CF8" },
                  { icon:"bi-check2-square", label:"Task Actions",  value: trackStats.taskCount,  accent:"#34D399" },
                  { icon:"bi-sun",           label:"Today",         value: trackStats.today,      accent:"#FBBF24" },
                  { icon:"bi-calendar-week", label:"This Week",     value: trackStats.thisWeek,   accent:"#F472B6" },
                ].map((s, i) => (
                  <div key={s.label} style={{ flex:1, padding:"16px 20px", borderLeft: i>0 ? "1px solid rgba(255,255,255,.07)" : "none",
                    borderTop:"1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <div style={{ width:28, height:28, borderRadius:8,
                        background:`${s.accent}22`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <i className={`bi ${s.icon}`} style={{ fontSize:13, color:s.accent }} />
                      </div>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, letterSpacing:.3 }}>
                        {s.label.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize:28, fontWeight:900, color:"#fff", lineHeight:1 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CONTROLS ── */}
            <div style={{ background:"#FAFAFA", borderBottom:"1px solid #EFEFEF",
              padding:"10px 24px 0", flexShrink:0 }}>

              {/* Row 1: Category tabs + date range */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center", paddingBottom:10 }}>
                {/* Category segmented control */}
                <div style={{ display:"flex", background:"#F1F3F6", borderRadius:10, padding:3, gap:2, flexWrap:"wrap" }}>
                  {CATEGORY_TABS.map(t => (
                    <button key={t.key}
                      onClick={() => {
                        setTrackCategory(t.key);
                        fetchTrackLogs(trackUser._id, t.key, trackDate.start, trackDate.end);
                      }}
                      style={{ padding:"6px 14px", fontSize:12, fontWeight:700, border:"none", cursor:"pointer",
                        borderRadius:8, transition:"all .15s",
                        background: trackCategory===t.key ? "#fff" : "transparent",
                        color:      trackCategory===t.key ? "#4F46E5" : "#6B7280",
                        boxShadow:  trackCategory===t.key ? "0 1px 6px rgba(0,0,0,.1)" : "none" }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Custom date range */}
                <div style={{ display:"flex", gap:6, marginLeft:"auto", alignItems:"center" }}>
                  <i className="bi bi-calendar3" style={{ fontSize:13, color:"#9CA3AF" }} />
                  <input type="date" value={trackDate.start} className="um-input"
                    style={{ padding:"6px 10px", fontSize:12, width:132, borderRadius:9 }}
                    onChange={e => {
                      const v = e.target.value;
                      setTrackDate(d => ({ ...d, start: v }));
                      setTrackPreset("custom");
                      fetchTrackLogs(trackUser._id, trackCategory, v, trackDate.end);
                    }} />
                  <span style={{ fontSize:12, color:"#9CA3AF", fontWeight:600 }}>—</span>
                  <input type="date" value={trackDate.end} className="um-input"
                    style={{ padding:"6px 10px", fontSize:12, width:132, borderRadius:9 }}
                    onChange={e => {
                      const v = e.target.value;
                      setTrackDate(d => ({ ...d, end: v }));
                      setTrackPreset("custom");
                      fetchTrackLogs(trackUser._id, trackCategory, trackDate.start, v);
                    }} />
                  {(trackDate.start || trackDate.end) && (
                    <button className="um-btn"
                      style={{ padding:"5px 10px", fontSize:11, background:"#FEE2E2", color:"#DC2626", borderRadius:8 }}
                      onClick={() => {
                        setTrackDate({ start:"", end:"" });
                        setTrackPreset("all");
                        fetchTrackLogs(trackUser._id, trackCategory, "", "");
                      }}>
                      <i className="bi bi-x-circle" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Quick day preset pills */}
              <div style={{ display:"flex", gap:6, paddingBottom:10, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:600, alignSelf:"center", marginRight:2 }}>
                  <i className="bi bi-lightning-charge-fill" style={{ marginRight:3, color:"#FBBF24" }} />
                  Quick:
                </span>
                {DAY_PRESETS.map(p => {
                  const active = trackPreset === p.key;
                  return (
                    <button key={p.key}
                      onClick={() => {
                        const dates = presetToDates(p.key);
                        setTrackPreset(p.key);
                        setTrackDate(dates);
                        fetchTrackLogs(trackUser._id, trackCategory, dates.start, dates.end);
                      }}
                      style={{
                        padding:"4px 13px", fontSize:11, fontWeight:700,
                        border: active ? "1.5px solid #6366F1" : "1.5px solid #E5E7EB",
                        borderRadius:20, cursor:"pointer", transition:"all .15s",
                        background: active ? "#EEF2FF" : "#fff",
                        color:      active ? "#4F46E5" : "#6B7280",
                        boxShadow:  active ? "0 1px 6px rgba(99,102,241,.15)" : "none",
                      }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── TIMELINE ── */}
            <div style={{ overflowY:"auto", flex:1, padding:"24px 32px", background:"#FAFBFF" }}>
              {trackLoading ? (
                <div style={{ textAlign:"center", padding:"60px 0" }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:"#EEF2FF",
                    display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                    <div className="spinner-border text-primary" style={{ width:"1.4rem", height:"1.4rem" }} />
                  </div>
                  <p style={{ color:"#6B7280", fontWeight:600, fontSize:14 }}>Loading activity log…</p>
                </div>
              ) : trackLogs.length === 0 ? (
                <div style={{ textAlign:"center", padding:"72px 20px" }}>
                  <div style={{ width:72, height:72, borderRadius:20, background:"#F1F5F9",
                    display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
                    <i className="bi bi-graph-up" style={{ fontSize:32, color:"#CBD5E1" }} />
                  </div>
                  <p style={{ fontWeight:800, color:"#1E293B", fontSize:16, margin:"0 0 8px" }}>
                    No activity recorded yet
                  </p>
                  <p style={{ color:"#94A3B8", fontSize:13, margin:0, lineHeight:1.6 }}>
                    Every task action performed by <strong>{trackUser.name}</strong> will appear here<br/>
                    in real-time with full date & time details.
                  </p>
                </div>
              ) : (
                <div>
                  {trackLogs.map((log, idx) => {
                    const meta = ACTION_META[log.action] || {
                      icon: "bi-circle-fill", color: "#6B7280", bg: "#F3F4F6", label: log.action
                    };
                    const dt = new Date(log.createdAt);
                    const showDateSep = idx === 0 ||
                      new Date(trackLogs[idx-1].createdAt).toDateString() !== dt.toDateString();

                    return (
                      <React.Fragment key={log._id || idx}>
                        {showDateSep && (
                          <div style={{ display:"flex", alignItems:"center", gap:12,
                            margin: idx === 0 ? "0 0 20px" : "28px 0 20px" }}>
                            <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,#E2E8F0)" }} />
                            <span style={{ fontSize:11, fontWeight:800, color:"#64748B",
                              background:"#fff", padding:"5px 14px", borderRadius:20,
                              border:"1.5px solid #E2E8F0", letterSpacing:.4, whiteSpace:"nowrap",
                              boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
                              {fmtDateOnly(dt)}
                            </span>
                            <div style={{ flex:1, height:1, background:"linear-gradient(90deg,#E2E8F0,transparent)" }} />
                          </div>
                        )}

                        <div style={{ display:"flex", gap:14, marginBottom:10 }}>
                          {/* Left: icon + vertical connector */}
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, width:44 }}>
                            <div style={{ width:44, height:44, borderRadius:14,
                              background:`linear-gradient(135deg,${meta.bg},${meta.bg})`,
                              border:`2px solid ${meta.color}30`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              boxShadow:`0 2px 8px ${meta.color}20` }}>
                              <i className={`bi ${meta.icon}`} style={{ fontSize:17, color:meta.color }} />
                            </div>
                            {idx < trackLogs.length - 1 && (
                              <div style={{ width:2, flex:1, minHeight:12, marginTop:4,
                                background:`linear-gradient(${meta.color}40,transparent)`, borderRadius:2 }} />
                            )}
                          </div>

                          {/* Right: card */}
                          <div style={{ flex:1, background:"#fff", borderRadius:14,
                            border:"1.5px solid #F1F5F9", padding:"14px 18px", minWidth:0,
                            boxShadow:"0 2px 8px rgba(0,0,0,.04)",
                            borderLeft:`4px solid ${meta.color}` }}>

                            {/* Top row */}
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                              flexWrap:"wrap", gap:6, marginBottom:8 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontSize:10, fontWeight:800, letterSpacing:1,
                                  textTransform:"uppercase", color:meta.color }}>
                                  {meta.label}
                                </span>
                                <span style={{ fontSize:10, padding:"2px 8px", borderRadius:6,
                                  background:meta.bg, color:meta.color, fontWeight:700 }}>
                                  {log.category}
                                </span>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:5,
                                background:"#F8FAFC", padding:"4px 10px", borderRadius:8 }}>
                                <i className="bi bi-clock-fill" style={{ fontSize:10, color:"#94A3B8" }} />
                                <span style={{ fontSize:11, color:"#64748B", fontWeight:700 }}>
                                  {dt.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                                </span>
                              </div>
                            </div>

                            {/* Description */}
                            <p style={{ margin:"0 0 8px", fontSize:13.5, color:"#0F172A",
                              lineHeight:1.6, fontWeight:600 }}>
                              {log.description}
                            </p>

                            {/* Change indicator */}
                            {(log.metadata?.fromValue || log.metadata?.toValue) && (
                              <div style={{ display:"flex", alignItems:"center", gap:8,
                                flexWrap:"wrap", marginBottom:8 }}>
                                {log.metadata.fromValue && (
                                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:8,
                                    background:"#FEF2F2", color:"#DC2626", fontWeight:700,
                                    border:"1px solid #FEE2E2" }}>
                                    {log.metadata.fromValue}
                                  </span>
                                )}
                                <i className="bi bi-arrow-right-short" style={{ fontSize:16, color:"#94A3B8" }} />
                                {log.metadata.toValue && (
                                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:8,
                                    background:"#F0FDF4", color:"#15803D", fontWeight:700,
                                    border:"1px solid #DCFCE7" }}>
                                    {log.metadata.toValue}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Footer meta */}
                            {(log.metadata?.taskTitle || log.metadata?.employeeName) && (
                              <div style={{ display:"flex", gap:12, flexWrap:"wrap",
                                paddingTop:8, borderTop:"1px solid #F1F5F9", marginTop:4 }}>
                                {log.metadata.taskTitle && (
                                  <span style={{ fontSize:11, color:"#6366F1", fontWeight:600 }}>
                                    <i className="bi bi-check2-square" style={{ marginRight:4 }} />
                                    {log.metadata.taskTitle}
                                  </span>
                                )}
                                {log.metadata.employeeName && (
                                  <span style={{ fontSize:11, color:"#10B981", fontWeight:600 }}>
                                    <i className="bi bi-person-fill" style={{ marginRight:4 }} />
                                    {log.metadata.employeeName}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Pagination footer */}
                  <div style={{ textAlign:"center", padding:"24px 0 16px" }}>
                    {trackHasMore ? (
                      <button
                        onClick={loadMoreLogs}
                        disabled={trackLoadingMore}
                        style={{ padding:"10px 28px", borderRadius:12, border:"1.5px solid #E5E7EB",
                          background:"#fff", color:"#4F46E5", fontWeight:700, fontSize:13,
                          cursor: trackLoadingMore ? "default" : "pointer",
                          display:"inline-flex", alignItems:"center", gap:8,
                          boxShadow:"0 2px 8px rgba(99,102,241,.1)",
                          opacity: trackLoadingMore ? .6 : 1, transition:"all .15s" }}>
                        {trackLoadingMore
                          ? <><span className="spinner-border spinner-border-sm" style={{ width:"1rem", height:"1rem" }} /> Loading…</>
                          : <><i className="bi bi-chevron-down" /> Load More · showing {trackLogs.length} of {trackStats.total}</>}
                      </button>
                    ) : (
                      <div style={{ color:"#CBD5E1", fontSize:12, fontWeight:600 }}>
                        <i className="bi bi-check-circle-fill" style={{ marginRight:6, color:"#BBF7D0" }} />
                        All {trackStats.total} action{trackStats.total !== 1 ? "s" : ""} loaded
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {deleteConfirm && (
        <div className="um-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="um-modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"28px 28px 0" }}>
              <div style={{ width:52, height:52, borderRadius:14, background:"#FEE2E2",
                display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                <i className="bi bi-trash3-fill" style={{ fontSize:24, color:"#DC2626" }} />
              </div>
              <h5 style={{ margin:"0 0 8px", fontWeight:800, fontSize:17, color:"#111827" }}>
                Remove {deleteConfirm.name}?
              </h5>
              <p style={{ margin:"0 0 24px", fontSize:14, color:"#6B7280", lineHeight:1.6 }}>
                This will permanently remove <strong>{deleteConfirm.email}</strong> from the panel.
                They will lose all access immediately.
              </p>
            </div>
            <div style={{ display:"flex", gap:10, padding:"0 28px 28px" }}>
              <button className="um-btn" onClick={() => setDeleteConfirm(null)}
                style={{ flex:1, background:"#F3F4F6", color:"#374151" }}>Cancel</button>
              <button className="um-btn" disabled={submitting} onClick={handleDelete}
                style={{ flex:2, background:"linear-gradient(135deg,#EF4444,#DC2626)", color:"#fff" }}>
                {submitting
                  ? <span className="spinner-border spinner-border-sm" />
                  : <><i className="bi bi-trash3" /> Yes, Remove</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
