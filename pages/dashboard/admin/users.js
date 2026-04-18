// pages/dashboard/admin/users.js
import Head from "next/head";
import React, { useEffect, useState, useCallback } from "react";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { toast } from "react-toastify";

const ROLES = ["Manager", "HR", "Accountant", "Viewer"];

const PERMISSIONS = [
  { key: "dashboard",    label: "Dashboard",     icon: "bi-house-fill"         },
  { key: "employees",    label: "Employees",     icon: "bi-people-fill"        },
  { key: "attendance",   label: "Attendance",    icon: "bi-calendar-check-fill"},
  { key: "leaves",       label: "Leaves",        icon: "bi-calendar-minus-fill"},
  { key: "salaryReport", label: "Salary Report", icon: "bi-cash-stack"         },
  { key: "reimbursement",label: "Reimbursement", icon: "bi-receipt"            },
  { key: "overtime",     label: "Overtime",      icon: "bi-clock-history"      },
  { key: "deductions",   label: "Deductions",    icon: "bi-shield-check-fill"  },
  { key: "holidays",     label: "Holidays",      icon: "bi-calendar-event-fill"},
];

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

  const stats = [
    { label: "Total Users",    value: users.length,                                             icon: "bi-people-fill",   bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" },
    { label: "Active",         value: users.filter(u => u.status === "Active").length,          icon: "bi-check-circle-fill", bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0" },
    { label: "Pending Invite", value: users.filter(u => u.status === "Pending").length,         icon: "bi-hourglass-split",   bg: "#FEF3C7", color: "#B45309", border: "#FDE68A" },
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
          .um-stat { display:flex; align-items:center; gap:14px; padding:18px 20px;
                     border-radius:16px; border:1.5px solid; }
          .um-check { width:18px; height:18px; border-radius:5px; border:2px solid #D1D5DB;
                      display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; }
          .um-check.on { background:#6366F1; border-color:#6366F1; }
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
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
                {stats.map(s => (
                  <div key={s.label} className="um-stat" style={{ background:s.bg, borderColor:s.border }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:"#fff",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow:"0 1px 4px rgba(0,0,0,.08)", flexShrink:0 }}>
                      <i className={`bi ${s.icon}`} style={{ fontSize:20, color:s.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize:22, fontWeight:800, color:"#111827", lineHeight:1.2 }}>{s.value}</div>
                      <div style={{ fontSize:11, color:"#6B7280", fontWeight:500, marginTop:2 }}>{s.label}</div>
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
