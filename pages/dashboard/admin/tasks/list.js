import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

/* ─── Constants ─────────────────────────────────────────── */

const TABS = [
  { key: "smm",      label: "Social Media", icon: "bi-instagram",   color: "#E1306C", bg: "#FFF0F5", border: "#F9A8D4" },
  { key: "seo",      label: "SEO",          icon: "bi-search",      color: "#10B981", bg: "#ECFDF5", border: "#6EE7B7" },
  { key: "ads",      label: "Ads",          icon: "bi-megaphone",   color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { key: "branding", label: "Branding",     icon: "bi-palette",     color: "#8B5CF6", bg: "#F5F3FF", border: "#C4B5FD" },
];

const STAGE_META = {
  S1: { label: "Script/Concept", color: "#F59E0B", bg: "#FEF3C7", border: "#FDE68A" },
  S2: { label: "Shoot/Design",   color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
  S3: { label: "Edit/Develop",   color: "#10B981", bg: "#DCFCE7", border: "#BBF7D0" },
  S4: { label: "Posted/Live",    color: "#EC4899", bg: "#FCE7F3", border: "#FBCFE8" },
};

const STATUS_META = {
  todo:        { label: "To Do",       color: "#64748B", bg: "#F1F5F9" },
  in_progress: { label: "In Progress", color: "#1D4ED8", bg: "#DBEAFE" },
  review:      { label: "Review",      color: "#B45309", bg: "#FEF3C7" },
  completed:   { label: "Done",        color: "#15803D", bg: "#DCFCE7" },
  blocked:     { label: "Blocked",     color: "#DC2626", bg: "#FEE2E2" },
};

const CONTENT_META = {
  reel:     { label: "Reel",     icon: "bi-camera-video-fill", color: "#F59E0B" },
  post:     { label: "Post",     icon: "bi-image-fill",        color: "#6366F1" },
  carousel: { label: "Carousel", icon: "bi-images",            color: "#10B981" },
  story:    { label: "Story",    icon: "bi-phone-fill",        color: "#EC4899" },
};

const SEO_CAT_META = {
  blog:      { label: "Blog",      color: "#6366F1", bg: "#EEF2FF" },
  technical: { label: "Technical", color: "#EF4444", bg: "#FEF2F2" },
  onpage:    { label: "On-Page",   color: "#3B82F6", bg: "#DBEAFE" },
  offpage:   { label: "Off-Page",  color: "#F59E0B", bg: "#FFFBEB" },
  backlinks: { label: "Backlinks", color: "#10B981", bg: "#ECFDF5" },
  keywords:  { label: "Keywords",  color: "#8B5CF6", bg: "#F5F3FF" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STAGE_KEYS = ["S1","S2","S3","S4"];
const STAGE_NAMES_DEFAULT = ["Script/Concept","Shoot/Design","Edit/Develop","Posted/Live"];
const STAGE_COLORS = ["#F59E0B","#6366F1","#10B981","#EC4899"];
const STAGE_DEPT_KEYWORDS = [
  ["content"], ["production", "design", "creative"],
  ["edit", "post", "editing"], ["digital", "marketing"],
];
const AVATAR_COLORS_LIST = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],["#FCE7F3","#BE185D"],
];

function avatarColor(name) { return AVATAR_COLORS_LIST[(name?.charCodeAt(0) || 0) % AVATAR_COLORS_LIST.length]; }
function getInitials(name) { return (name || "?").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase(); }
function filterByDept(employees, keywords) {
  return employees.filter(emp => {
    const dept = (emp.professional?.department || "").toLowerCase();
    return keywords.some(kw => dept.includes(kw));
  });
}
function normalizeAssignedTo(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(item => typeof item === "object" ? String(item._id || item) : String(item)).filter(Boolean);
  return [typeof v === "object" ? String(v._id || v) : String(v)].filter(Boolean);
}
function getStageEmps(stg, employees) {
  const ids = normalizeAssignedTo(stg?.assignedTo);
  return ids.map(id => employees.find(e => String(e._id) === id)).filter(Boolean);
}
function empShortName(emp) {
  return (emp?.personal?.firstName || emp?.firstName || "").trim();
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} '${String(dt.getFullYear()).slice(2)}`;
}
function fmtDateTimeInput(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 16);
}
function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const pad = n => String(n).padStart(2,"0");
  return `${pad(dt.getDate())}-${pad(dt.getMonth()+1)}-${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function isOverdue(t) {
  return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
}
function getEmpName(t) {
  const a = t.assignedTo;
  if (!a) return "Unassigned";
  if (a.personal?.firstName) return `${a.personal.firstName} ${a.personal.lastName || ""}`.trim();
  return a.email || "—";
}

/* ─── Component ─────────────────────────────────────────── */

export default function TasksListPage() {
  const router = useRouter();

  const [activeTab,  setActiveTab]  = useState("smm");
  const [tasks,      setTasks]      = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [adminUser,  setAdminUser]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);

  const [filters, setFilters] = useState({ search: "", brandId: "", status: "", assignedTo: "", dateFrom: "", dateTo: "" });
  const [hideCompleted, setHideCompleted] = useState(false);

  /* Stage editor */
  const [stageModal,        setStageModal]        = useState(false);
  const [stageTask,         setStageTask]         = useState(null);
  const [stageIdx,          setStageIdx]          = useState(0);
  const [stageForm,         setStageForm]         = useState({ name: "", assignedTo: [], deadline: "" });
  const [stageSaving,       setStageSaving]       = useState(false);
  const [stageRejectMode,   setStageRejectMode]   = useState(false);
  const [stageRejectReason, setStageRejectReason] = useState("");

  useEffect(() => {
    fetch("/api/admin-users/me", { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setAdminUser(d.user); }).catch(() => {});
    Promise.all([
      fetch("/api/admin/brands",          { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/assets/employees",{ credentials: "include" }).then(r => r.json()),
    ]).then(([bData, eData]) => {
      if (bData.success) setBrands(bData.brands || []);
      if (eData.success) setEmployees(eData.employees || []);
    }).catch(() => {});
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit: 25 });
      if (filters.search)    q.set("search",    filters.search);
      if (filters.brandId)   q.set("brandId",   filters.brandId);
      if (filters.status)    q.set("status",    filters.status);
      if (filters.assignedTo) q.set("assignedTo", filters.assignedTo);
      if (filters.dateFrom)   q.set("dateStart", new Date(filters.dateFrom).toISOString());
      if (filters.dateTo)     q.set("dateEnd",   new Date(filters.dateTo + "T23:59:59").toISOString());
      if (hideCompleted)     q.set("hideCompleted", "true");
      // Tab-specific filter
      if (activeTab === "smm")      q.set("taskType", "production");
      else if (activeTab === "seo") q.set("tags", "seo");
      else if (activeTab === "ads") q.set("tags", "ads");
      else if (activeTab === "branding") q.set("tags", "branding");

      const res  = await fetch(`/api/admin/tasks?${q}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) { setTasks(data.tasks || []); setPagination(data.pagination || {}); }
      else toast.error("Failed to load tasks");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, [filters, hideCompleted, page, activeTab]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  function switchTab(tab) {
    setActiveTab(tab);
    setPage(1);
    setFilters({ search: "", brandId: "", status: "", assignedTo: "", dateFrom: "", dateTo: "" });
  }

  /* Stage editor helpers */
  const openStageEditor = (task, idx) => {
    const stg = task.stages?.[idx] || {};
    setStageTask(task); setStageIdx(idx);
    setStageForm({ name: stg.name || STAGE_NAMES_DEFAULT[idx], assignedTo: normalizeAssignedTo(stg.assignedTo), deadline: fmtDateTimeInput(stg.deadline) });
    setStageRejectMode(false); setStageRejectReason(""); setStageModal(true);
  };

  const buildStages = (task, overrideIdx, overrideData) =>
    STAGE_KEYS.map((_, i) => {
      const s = task.stages?.[i] || {};
      if (i === overrideIdx) return { ...overrideData };
      return { name: s.name || STAGE_NAMES_DEFAULT[i], assignedTo: normalizeAssignedTo(s.assignedTo), deadline: s.deadline || null, done: s.done || false, doneAt: s.doneAt || null, approved: s.approved || false, rejected: s.rejected || false, rejectReason: s.rejectReason || "", proofUrls: s.proofUrls || [] };
    });

  const saveStage = async () => {
    if (!stageTask) return;
    setStageSaving(true);
    try {
      const cur    = stageTask.stages?.[stageIdx] || {};
      const stages = buildStages(stageTask, stageIdx, { name: stageForm.name, assignedTo: stageForm.assignedTo, deadline: stageForm.deadline || null, done: cur.done || false, doneAt: cur.doneAt || null, approved: cur.approved || false, rejected: cur.rejected || false, rejectReason: cur.rejectReason || "", proofUrls: cur.proofUrls || [] });
      const res  = await fetch(`/api/admin/tasks/${stageTask._id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages, performedByName: adminUser?.name || "Admin" }) });
      const data = await res.json();
      if (data.success) { toast.success("Stage saved!"); setStageModal(false); fetchTasks(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setStageSaving(false); }
  };

  const approveStage = async () => {
    if (!stageTask) return;
    setStageSaving(true);
    try {
      const cur    = stageTask.stages?.[stageIdx] || {};
      const stages = buildStages(stageTask, stageIdx, { name: stageForm.name, assignedTo: stageForm.assignedTo, deadline: stageForm.deadline || null, done: true, doneAt: cur.doneAt || new Date().toISOString(), approved: true, rejected: false, rejectReason: "", proofUrls: cur.proofUrls || [] });
      const updates = { stages, performedByName: adminUser?.name || "Admin" };
      if (stageIdx === 3) {
        updates.stage  = "S4";
        updates.status = "completed";
      } else {
        updates.stage = STAGE_KEYS[stageIdx + 1];
        if (stageIdx === 0) {
          updates.status = "in_progress";
        } else if (stageIdx === 1) {
          const nextStg      = stageTask.stages?.[stageIdx + 1] || {};
          const nextAssigned = normalizeAssignedTo(nextStg.assignedTo);
          updates.status = nextAssigned.length > 0 ? "in_progress" : "review";
        } else {
          // S3 approved → always goes to client review
          updates.status = "review";
        }
      }
      const res  = await fetch(`/api/admin/tasks/${stageTask._id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const data = await res.json();
      if (data.success) { toast.success("Stage approved!"); setStageModal(false); fetchTasks(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setStageSaving(false); }
  };

  const rejectStage = async () => {
    if (!stageRejectReason.trim() || !stageTask) return;
    setStageSaving(true);
    try {
      const cur    = stageTask.stages?.[stageIdx] || {};
      const stages = buildStages(stageTask, stageIdx, { name: stageForm.name, assignedTo: stageForm.assignedTo, deadline: stageForm.deadline || null, done: false, doneAt: null, approved: false, rejected: true, rejectReason: stageRejectReason.trim(), proofUrls: cur.proofUrls || [] });
      const res  = await fetch(`/api/admin/tasks/${stageTask._id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages, performedByName: adminUser?.name || "Admin" }) });
      const data = await res.json();
      if (data.success) { toast.success("Stage rejected"); setStageModal(false); setStageRejectMode(false); setStageRejectReason(""); fetchTasks(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setStageSaving(false); }
  };

  const currentTab = TABS.find(t => t.key === activeTab) || TABS[0];

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Tasks — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .tl-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
          .tl-btn { border:none; cursor:pointer; border-radius:10px; padding:7px 14px; font-size:13px; font-weight:600; transition:all .15s; display:inline-flex; align-items:center; gap:5px; }
          .tl-btn-primary { background:#4F46E5; color:#fff; }
          .tl-btn-ghost { background:#F1F5F9; color:#475569; }
          .tl-btn-ghost:hover { background:#E2E8F0; }
          .tl-input { padding:7px 11px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; background:#fff; }
          .tl-input:focus { border-color:#6366F1; }
          .tl-select { padding:7px 10px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:12px; outline:none; background:#fff; cursor:pointer; }
          .tl-table { width:100%; border-collapse:collapse; }
          .tl-table th { padding:10px 12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#94A3B8; border-bottom:2px solid #F1F5F9; background:#FAFAFA; text-align:left; white-space:nowrap; }
          .tl-table td { padding:11px 12px; border-bottom:1px solid #F8FAFC; font-size:13px; vertical-align:middle; }
          .tl-table tr:hover td { background:#FAFBFF; }
          .stage-dot { width:22px; height:22px; border-radius:6px; border:2px solid; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; transition:all .12s; }
          .stage-dot:hover { transform:scale(1.12); }
          .tl-page-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid #E5E7EB; background:#fff; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center; }
          .tl-page-btn.active { background:#4F46E5; color:#fff; border-color:#4F46E5; }
          .tl-page-btn:disabled { opacity:.4; cursor:default; }
          .tl-overlay { position:fixed; inset:0; background:rgba(15,15,35,.55); backdrop-filter:blur(4px); z-index:1050; display:flex; align-items:center; justify-content:center; padding:16px; }
          .tl-modal { background:#fff; border-radius:20px; width:100%; max-width:480px; box-shadow:0 24px 64px rgba(0,0,0,.18); }
          .tl-field-label { font-size:10.5px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:.06em; display:block; margin-bottom:5px; }
          .tl-field-input { padding:8px 12px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; width:100%; background:#fff; }
          .tl-field-input:focus { border-color:#6366F1; }
          .overdue-row td { background:#FFF5F5 !important; }
          .tl-tab { display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; border:1.5px solid transparent; transition:all .14s; white-space:nowrap; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/admin/tasks"><img src="/icons/home.svg" alt="" /> Task Management</Link>
                </li>
                <li className="breadcrumb-item active">Tasks</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* ── Header ── */}
              <div className="attendance-topbar leave-management-topbar" style={{ flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">Tasks</h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                    {pagination.total || 0} task{pagination.total !== 1 ? "s" : ""} · {currentTab.label}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="tl-btn tl-btn-ghost" style={{ fontSize: 12 }}
                    onClick={() => setHideCompleted(h => !h)}>
                    <i className={`bi ${hideCompleted ? "bi-eye" : "bi-eye-slash"}`} />
                    {hideCompleted ? "Show completed" : "Hide completed"}
                  </button>
                  <button className="invite-btn tl-btn-primary"
                    onClick={() => router.push("/dashboard/admin/tasks?create=1")}>
                    <i className="bi bi-plus-circle" /> New Task
                  </button>
                </div>
              </div>

              {/* ── Tabs ── */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {TABS.map(tab => {
                  const active = activeTab === tab.key;
                  return (
                    <button key={tab.key} className="tl-tab"
                      onClick={() => switchTab(tab.key)}
                      style={{
                        background: active ? tab.bg : "#fff",
                        color: active ? tab.color : "#64748B",
                        borderColor: active ? tab.border : "#E5E7EB",
                        boxShadow: active ? `0 0 0 3px ${tab.color}18` : "none",
                      }}>
                      <i className={`bi ${tab.icon}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── Filters ── */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <i className="bi bi-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 13 }} />
                  <input className="tl-input" style={{ paddingLeft: 28, width: 190 }}
                    placeholder="Search tasks…" value={filters.search}
                    onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
                </div>
                <select className="tl-select" value={filters.brandId}
                  onChange={e => { setFilters(f => ({ ...f, brandId: e.target.value })); setPage(1); }}>
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <select className="tl-select" value={filters.status}
                  onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
                  <option value="">All Status</option>
                  {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="tl-select" value={filters.assignedTo}
                  onChange={e => { setFilters(f => ({ ...f, assignedTo: e.target.value })); setPage(1); }}>
                  <option value="">All Assignees</option>
                  {employees.map(emp => {
                    const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                    return <option key={emp._id} value={emp._id}>{n}</option>;
                  })}
                </select>
                <input type="date" className="tl-select" style={{ cursor: "pointer" }} value={filters.dateFrom}
                  onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
                  title="From date" />
                <input type="date" className="tl-select" style={{ cursor: "pointer" }} value={filters.dateTo}
                  onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }}
                  title="To date" />
                {(Object.values(filters).some(Boolean) || hideCompleted) && (
                  <button className="tl-btn tl-btn-ghost" style={{ fontSize: 12 }}
                    onClick={() => { setFilters({ search: "", brandId: "", status: "", assignedTo: "", dateFrom: "", dateTo: "" }); setHideCompleted(false); setPage(1); }}>
                    <i className="bi bi-x-circle" /> Clear
                  </button>
                )}
              </div>

              {/* ── Table ── */}
              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" />
                  <div style={{ marginTop: 10 }}>Loading…</div>
                </div>
              ) : tasks.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <i className={`bi ${currentTab.icon}`} style={{ fontSize: 44, color: currentTab.color + "60" }} />
                  <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: "#1E293B" }}>No {currentTab.label} tasks</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>Create one with the New Task button above</div>
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>

                    {/* ══ SOCIAL MEDIA TABLE ══ */}
                    {activeTab === "smm" && (
                      <table className="tl-table">
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}>ID</th>
                            <th style={{ width: 170 }}>Title</th>
                            <th style={{ width: 130 }}>Brand</th>
                            <th style={{ width: 90 }}>Type</th>
                            <th style={{ width: 110 }}>Pipeline</th>
                            <th style={{ width: 100 }}>Scheduled</th>
                            <th style={{ width: 110 }}>S1 Script</th>
                            <th style={{ width: 110 }}>S2 Shoot</th>
                            <th style={{ width: 110 }}>S3 Edit</th>
                            <th style={{ width: 110 }}>S4 Posted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => {
                            const over = isOverdue(t);
                            const ct   = CONTENT_META[t.contentType];
                            return (
                              <tr key={t._id} className={over ? "overdue-row" : ""}
                                style={{ cursor: "pointer" }}
                                onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#6366F1", fontSize: 12 }}>
                                  #{String(t._id).slice(-4).toUpperCase()}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>
                                    {over && <i className="bi bi-exclamation-circle-fill text-danger me-1" style={{ fontSize: 10 }} />}
                                    {t.nomenclature || t.title}
                                  </div>
                                  {t.nomenclature && <div style={{ fontSize: 10, color: "#94A3B8" }}>{t.title}</div>}
                                  {t.status === "review" && (
                                    <span style={{ display: "inline-flex", gap: 4, marginTop: 3, padding: "2px 7px", borderRadius: 20, background: "#DBEAFE", color: "#1D4ED8", fontSize: 10, fontWeight: 700 }}>
                                      <i className="bi bi-hourglass-split" />Client Review
                                    </span>
                                  )}
                                  {t.status === "todo" && t.reviewNote && (
                                    <span style={{ display: "inline-flex", gap: 4, marginTop: 3, padding: "2px 7px", borderRadius: 20, background: "#FEF3C7", color: "#B45309", fontSize: 10, fontWeight: 700 }}>
                                      <i className="bi bi-arrow-counterclockwise" />Client Revision
                                    </span>
                                  )}
                                  {t.status === "completed" && (
                                    <span style={{ display: "inline-flex", gap: 4, marginTop: 3, padding: "2px 7px", borderRadius: 20, background: "#DCFCE7", color: "#15803D", fontSize: 10, fontWeight: 700 }}>
                                      <i className="bi bi-check-circle-fill" />Done
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {t.brandId
                                    ? <span className="tl-badge" style={{ background: (t.brandId.color || "#6366F1") + "20", color: t.brandId.color || "#6366F1" }}>{t.brandId.name}</span>
                                    : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                <td>
                                  {ct ? <span style={{ color: ct.color, fontWeight: 700, fontSize: 12 }}><i className={`bi ${ct.icon} me-1`} />{ct.label}</span> : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                {/* Pipeline dots */}
                                <td onClick={e => e.stopPropagation()}>
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {STAGE_KEYS.map((key, i) => {
                                      const meta = STAGE_META[key];
                                      const stg  = t.stages?.[i] || {};
                                      const done = stg.done; const approved = stg.approved; const rejected = stg.rejected;
                                      const pending = done && !approved && !rejected;
                                      const bg = rejected ? "#DC2626" : pending ? "#F59E0B" : approved ? "#10B981" : done ? meta.color : t.stage === key ? meta.color : "transparent";
                                      const border = rejected ? "#DC2626" : pending ? "#F59E0B" : approved ? "#10B981" : done ? meta.color : t.stage === key ? meta.color : "#E5E7EB";
                                      return (
                                        <div key={key} className="stage-dot"
                                          style={{ background: bg, borderColor: border, color: (done || t.stage === key) ? "#fff" : "#CBD5E1" }}
                                          onClick={() => openStageEditor(t, i)}>
                                          {rejected ? "✗" : pending ? "?" : done ? "✓" : i + 1}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap" }}>
                                  {t.scheduledFor ? fmtDate(t.scheduledFor) : t.dueDate ? fmtDate(t.dueDate) : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                {STAGE_KEYS.map((key, i) => {
                                  const stg  = t.stages?.[i] || {};
                                  const emps = getStageEmps(stg, employees);
                                  return (
                                    <td key={key} onClick={e => { e.stopPropagation(); openStageEditor(t, i); }} style={{ cursor: "pointer" }}>
                                      {emps.length > 0 ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                          {emps.slice(0, 3).map(emp => {
                                            const n = empShortName(emp);
                                            const [bg, fg] = avatarColor(n);
                                            return <div key={emp._id} title={n} style={{ width: 22, height: 22, borderRadius: 6, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 }}>{getInitials(n)}</div>;
                                          })}
                                          {stg.deadline && <div style={{ fontSize: 9, color: "#94A3B8", whiteSpace: "nowrap", marginLeft: 2 }}>{fmtDate(stg.deadline)}</div>}
                                        </div>
                                      ) : <span style={{ color: "#CBD5E1" }}>—</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* ══ SEO TABLE ══ */}
                    {activeTab === "seo" && (
                      <table className="tl-table">
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}>ID</th>
                            <th>Title</th>
                            <th style={{ width: 130 }}>Brand</th>
                            <th style={{ width: 110 }}>Category</th>
                            <th style={{ width: 140 }}>Assignee</th>
                            <th style={{ width: 110 }}>Due Date</th>
                            <th style={{ width: 110 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => {
                            const over    = isOverdue(t);
                            const empName = getEmpName(t);
                            const sm      = (t.status === "todo" && t.reviewNote)
                              ? { label: "Client Revision", color: "#B45309", bg: "#FEF3C7" }
                              : STATUS_META[t.status] || STATUS_META.todo;
                            const seoCat  = t.seoCategory || (t.tags || []).find(tag => SEO_CAT_META[tag]) || "";
                            const catMeta = SEO_CAT_META[seoCat];
                            return (
                              <tr key={t._id} className={over ? "overdue-row" : ""}
                                style={{ cursor: "pointer" }}
                                onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#10B981", fontSize: 12 }}>
                                  #{String(t._id).slice(-4).toUpperCase()}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>
                                    {over && <i className="bi bi-exclamation-circle-fill text-danger me-1" style={{ fontSize: 10 }} />}
                                    {t.title}
                                  </div>
                                  {t.pillar && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}><i className="bi bi-key me-1" />{t.pillar}</div>}
                                </td>
                                <td>
                                  {t.brandId
                                    ? <span className="tl-badge" style={{ background: (t.brandId.color || "#10B981") + "20", color: t.brandId.color || "#10B981" }}>{t.brandId.name}</span>
                                    : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                <td>
                                  {catMeta
                                    ? <span className="tl-badge" style={{ background: catMeta.bg, color: catMeta.color }}>{catMeta.label}</span>
                                    : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 7, ...(() => { const [bg,fg]=avatarColor(empName); return {background:bg,color:fg}; })(), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 }}>{getInitials(empName)}</div>
                                    <span style={{ fontSize: 12, color: "#374151" }}>{empName}</span>
                                  </div>
                                </td>
                                <td style={{ fontSize: 12, color: over ? "#DC2626" : "#64748B", fontWeight: over ? 700 : 400 }}>
                                  {over && <i className="bi bi-exclamation-circle me-1" style={{ fontSize: 10 }} />}
                                  {fmtDate(t.dueDate)}
                                </td>
                                <td>
                                  <span className="tl-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* ══ ADS / BRANDING TABLE ══ */}
                    {(activeTab === "ads" || activeTab === "branding") && (
                      <table className="tl-table">
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}>ID</th>
                            <th>Title</th>
                            <th style={{ width: 130 }}>Brand</th>
                            <th style={{ width: 140 }}>Assignee</th>
                            <th style={{ width: 110 }}>Due Date</th>
                            <th style={{ width: 90 }}>Priority</th>
                            <th style={{ width: 110 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => {
                            const over    = isOverdue(t);
                            const empName = getEmpName(t);
                            const sm      = (t.status === "todo" && t.reviewNote)
                              ? { label: "Client Revision", color: "#B45309", bg: "#FEF3C7" }
                              : STATUS_META[t.status] || STATUS_META.todo;
                            const PCOLOR  = { low: "#16A34A", medium: "#2563EB", high: "#D97706", urgent: "#E11D48" };
                            return (
                              <tr key={t._id} className={over ? "overdue-row" : ""}
                                style={{ cursor: "pointer" }}
                                onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                <td style={{ fontFamily: "monospace", fontWeight: 700, color: currentTab.color, fontSize: 12 }}>
                                  #{String(t._id).slice(-4).toUpperCase()}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>
                                    {over && <i className="bi bi-exclamation-circle-fill text-danger me-1" style={{ fontSize: 10 }} />}
                                    {t.title}
                                  </div>
                                  {t.description && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{t.description.slice(0, 70)}</div>}
                                </td>
                                <td>
                                  {t.brandId
                                    ? <span className="tl-badge" style={{ background: (t.brandId.color || currentTab.color) + "20", color: t.brandId.color || currentTab.color }}>{t.brandId.name}</span>
                                    : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 7, ...(() => { const [bg,fg]=avatarColor(empName); return {background:bg,color:fg}; })(), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 }}>{getInitials(empName)}</div>
                                    <span style={{ fontSize: 12, color: "#374151" }}>{empName}</span>
                                  </div>
                                </td>
                                <td style={{ fontSize: 12, color: over ? "#DC2626" : "#64748B", fontWeight: over ? 700 : 400 }}>
                                  {fmtDate(t.dueDate)}
                                </td>
                                <td>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: PCOLOR[t.priority] || "#64748B" }}>{(t.priority || "—").charAt(0).toUpperCase() + (t.priority || "").slice(1)}</span>
                                </td>
                                <td>
                                  <span className="tl-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>
                        {((page - 1) * 25) + 1}–{Math.min(page * 25, pagination.total)} of {pagination.total}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="tl-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><i className="bi bi-chevron-left" /></button>
                        {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                          .map((p, i, arr) => (
                            <span key={p} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: "#CBD5E1" }}>…</span>}
                              <button className={`tl-page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                            </span>
                          ))}
                        <button className="tl-page-btn" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}><i className="bi bi-chevron-right" /></button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </section>
        </div>
      </div>

      {/* ════ STAGE EDITOR MODAL ════ */}
      {stageModal && stageTask && (
        <div className="tl-overlay" onClick={() => setStageModal(false)}>
          <div className="tl-modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: STAGE_COLORS[stageIdx], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{stageIdx + 1}</div>
                <h6 style={{ margin: 0, fontWeight: 800, color: "#1E293B", fontSize: 15 }}>Edit Stage S{stageIdx + 1}</h6>
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#64748B" }} onClick={() => setStageModal(false)}>✕</button>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", marginBottom: 14, borderLeft: `3px solid ${STAGE_COLORS[stageIdx]}` }}>
                <div style={{ fontSize: 10.5, color: "#94A3B8", marginBottom: 3 }}>Task</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#4F46E5", fontSize: 14 }}>
                  #{stageTask._id?.slice(-4).toUpperCase()} · {stageTask.nomenclature || stageTask.title}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="tl-field-label">Stage Name</label>
                <input className="tl-field-input" value={stageForm.name} onChange={e => setStageForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="tl-field-label">Assignees · {["Content","Production","Editing","Digital Mktg"][stageIdx]}</label>
                <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, maxHeight: 130, overflowY: "auto" }}>
                  {filterByDept(employees, STAGE_DEPT_KEYWORDS[stageIdx]).map((emp, ei, arr) => {
                    const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                    const checked = stageForm.assignedTo.includes(emp._id);
                    return (
                      <label key={emp._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer", borderBottom: ei < arr.length - 1 ? "1px solid #F8FAFC" : "none", background: checked ? STAGE_COLORS[stageIdx] + "12" : "transparent" }}>
                        <input type="checkbox" checked={checked} style={{ accentColor: STAGE_COLORS[stageIdx], width: 14, height: 14 }}
                          onChange={e => setStageForm(f => ({ ...f, assignedTo: e.target.checked ? [...f.assignedTo, emp._id] : f.assignedTo.filter(id => id !== emp._id) }))} />
                        <span style={{ fontSize: 13, color: checked ? "#1E293B" : "#374151", fontWeight: checked ? 700 : 400 }}>{n || "Employee"}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="tl-field-label">Deadline</label>
                <input type="datetime-local" className="tl-field-input" value={stageForm.deadline} onChange={e => setStageForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              {(() => {
                const stg = stageTask?.stages?.[stageIdx] || {};
                if (stg.done && !stg.approved && !stg.rejected) return (
                  <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, color: "#B45309", fontSize: 13, marginBottom: 8 }}><i className="bi bi-hourglass-split me-2" />Pending Review</div>
                    {stg.proofUrls?.length > 0 && stg.proofUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 11, color: "#4F46E5", marginBottom: 2 }}><i className="bi bi-link-45deg" />{url}</a>
                    ))}
                    {!stageRejectMode ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={approveStage} disabled={stageSaving} style={{ flex: 1, background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          <i className="bi bi-check2-circle me-1" />Approve
                        </button>
                        <button onClick={() => setStageRejectMode(true)} style={{ flex: 1, background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 8, padding: "8px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          <i className="bi bi-x-circle me-1" />Reject
                        </button>
                      </div>
                    ) : (
                      <div>
                        <textarea placeholder="Rejection reason…" value={stageRejectReason} onChange={e => setStageRejectReason(e.target.value)} style={{ width: "100%", padding: "8px", border: "1.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, resize: "vertical", minHeight: 60, marginBottom: 6, outline: "none", fontFamily: "inherit" }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setStageRejectMode(false); setStageRejectReason(""); }} style={{ flex: 1, background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 8, padding: "7px 0", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                          <button onClick={rejectStage} disabled={stageSaving || !stageRejectReason.trim()} style={{ flex: 1, background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "7px 0", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: !stageRejectReason.trim() ? 0.5 : 1 }}>Confirm Reject</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
                if (stg.approved) return <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, fontWeight: 700, color: "#15803D" }}><i className="bi bi-check-circle-fill me-2" />Approved</div>;
                if (stg.rejected) return <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}><i className="bi bi-x-circle-fill me-2" />Rejected</div>{stg.rejectReason && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 3 }}>Reason: {stg.rejectReason}</div>}</div>;
                return null;
              })()}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
                <button style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => setStageModal(false)}>Cancel</button>
                <button style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={saveStage} disabled={stageSaving}>
                  {stageSaving ? <div className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> : <i className="bi bi-check2" />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
