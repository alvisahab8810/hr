import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const STATUS_META = {
  todo:        { label: "To Do",       color: "#64748B", bg: "#F1F5F9" },
  in_progress: { label: "In Progress", color: "#1D4ED8", bg: "#DBEAFE" },
  review:      { label: "Review",      color: "#B45309", bg: "#FEF3C7" },
  completed:   { label: "Done",        color: "#15803D", bg: "#DCFCE7" },
  blocked:     { label: "Blocked",     color: "#DC2626", bg: "#FEE2E2" },
};

const PRIORITY_META = {
  low:    { label: "Low",    color: "#16A34A" },
  medium: { label: "Med",    color: "#2563EB" },
  high:   { label: "High",   color: "#D97706" },
  urgent: { label: "Urgent", color: "#E11D48" },
};

const DELIVERABLE_TYPES = [
  { key: "logo",         label: "Logo Design",        icon: "bi-pentagon-fill",     color: "#6366F1" },
  { key: "brandkit",     label: "Brand Kit",          icon: "bi-palette-fill",      color: "#EC4899" },
  { key: "social",       label: "Social Assets",      icon: "bi-images",            color: "#F59E0B" },
  { key: "presentation", label: "Presentations",      icon: "bi-easel-fill",        color: "#10B981" },
  { key: "print",        label: "Print / Collateral", icon: "bi-printer-fill",      color: "#8B5CF6" },
  { key: "motion",       label: "Motion Graphics",    icon: "bi-play-circle-fill",  color: "#EF4444" },
  { key: "web",          label: "Web Design",         icon: "bi-browser-chrome",    color: "#14B8A6" },
  { key: "other",        label: "Other",              icon: "bi-boxes",             color: "#94A3B8" },
];

const AV_COLORS = [["#EEF2FF","#4F46E5"],["#D1FAE5","#065F46"],["#FEE2E2","#DC2626"],["#FEF3C7","#B45309"],["#F3E8FF","#7C3AED"]];
function avCol(n) { return AV_COLORS[(n?.charCodeAt(0) || 0) % AV_COLORS.length]; }
function getInitials(name) { return (name || "?").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase(); }
function fmtDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }); }
function isOverdue(d) { return d && new Date(d) < new Date(); }

function getEmpName(t) {
  const a = t.assignedTo;
  if (!a) return "Unassigned";
  if (a.personal?.firstName) return `${a.personal.firstName} ${a.personal.lastName || ""}`.trim();
  return a.email || "—";
}

export default function BrandingPage() {
  const router = useRouter();
  const [tasks,      setTasks]      = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [brandFilter,setBrandFilter]= useState("");
  const [statusF,    setStatusF]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [td, bd] = await Promise.all([
        fetch("/api/admin/tasks?tags=branding&limit=300", { credentials: "include" }).then(r => r.json()),
        fetch("/api/admin/brands", { credentials: "include" }).then(r => r.json()),
      ]);
      if (td.success) setTasks(td.tasks || []);
      if (bd.success) setBrands((bd.brands || []).filter(b => (b.services || []).includes("branding")));
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = tasks.filter(t => {
    if (typeFilter  && t.contentType !== typeFilter)           return false;
    if (brandFilter && String(t.brandId?._id || t.brandId) !== brandFilter) return false;
    if (statusF     && t.status !== statusF)                   return false;
    return true;
  });

  const totalStats = {
    total:     tasks.length,
    active:    tasks.filter(t => t.status === "in_progress").length,
    review:    tasks.filter(t => t.status === "review").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Branding — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .brd-row { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:12px; border:1.5px solid #F1F5F9; margin-bottom:8px; cursor:pointer; transition:border-color .12s,box-shadow .12s; background:#fff; }
          .brd-row:hover { border-color:#C4B5FD; box-shadow:0 3px 14px rgba(124,58,237,.07); }
          .brd-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
          .brd-chip { display:inline-flex; align-items:center; gap:5px; padding:6px 12px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer; border:1.5px solid transparent; transition:all .14s; white-space:nowrap; }
          .brd-chip.active { border-color:currentColor; }
          .brd-select { padding:7px 10px; border-radius:9px; border:1.5px solid #E5E7EB; font-size:12px; outline:none; background:#fff; cursor:pointer; width:auto; }
          .brd-type-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
          .brd-avatar { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; flex-shrink:0; }
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
                <li className="breadcrumb-item active">Branding</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* ── Header ── */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20, alignItems: "flex-start" }}>
                <div>
                  <h5 className="admin-main-heading">Branding</h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Logo Design · Brand Kits · Social Assets · Print · Motion · Web</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select className="brd-select" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                    <option value="">All Brands</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  <select className="brd-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
                    <option value="">All Status</option>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => router.push("/dashboard/admin/tasks?mode=branding")}>
                    <i className="bi bi-plus-circle-fill" /> New Task
                  </button>
                </div>
              </div>

              {/* ── Stats ── */}
              <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
                {[
                  { label: "Total Tasks",  value: totalStats.total,     color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
                  { label: "In Progress",  value: totalStats.active,    color: "#1D4ED8", bg: "#DBEAFE", border: "#93C5FD" },
                  { label: "In Review",    value: totalStats.review,    color: "#B45309", bg: "#FEF3C7", border: "#FDE68A" },
                  { label: "Completed",    value: totalStats.completed, color: "#15803D", bg: "#DCFCE7", border: "#BBF7D0" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: 110, padding: "16px 18px", borderRadius: 14, background: s.bg, border: `1.5px solid ${s.border}` }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{loading ? "—" : s.value}</div>
                    <div style={{ fontSize: 11, color: s.color, opacity: .75, fontWeight: 700 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Category filter chips ── */}
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 20 }}>
                <div className={`brd-chip ${!typeFilter ? "active" : ""}`}
                  style={{ background: !typeFilter ? "#F5F3FF" : "#F8FAFC", color: "#7C3AED" }}
                  onClick={() => setTypeFilter("")}>
                  <i className="bi bi-grid-1x2-fill" style={{ fontSize: 11 }} /> All
                </div>
                {DELIVERABLE_TYPES.map(d => {
                  const cnt = tasks.filter(t => t.contentType === d.key).length;
                  return (
                    <div key={d.key} className={`brd-chip ${typeFilter === d.key ? "active" : ""}`}
                      style={{ background: typeFilter === d.key ? d.color + "18" : "#F8FAFC", color: typeFilter === d.key ? d.color : "#64748B" }}
                      onClick={() => setTypeFilter(t => t === d.key ? "" : d.key)}>
                      <i className={`bi ${d.icon}`} style={{ fontSize: 11 }} />
                      {d.label}
                      {cnt > 0 && <span style={{ background: typeFilter === d.key ? d.color : "#E2E8F0", color: typeFilter === d.key ? "#fff" : "#64748B", borderRadius: 10, fontSize: 10, fontWeight: 800, padding: "0px 5px", minWidth: 16, textAlign: "center" }}>{cnt}</span>}
                    </div>
                  );
                })}
              </div>

              {/* ── Task list ── */}
              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : visible.length === 0 ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "#94A3B8" }}>
                  <i className="bi bi-palette" style={{ fontSize: 44, display: "block", marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>No branding tasks found</div>
                  <div style={{ fontSize: 13 }}>Create your first branding task to start tracking work here.</div>
                </div>
              ) : (
                <div>
                  {visible.map(t => {
                    const sm       = STATUS_META[t.status]    || STATUS_META.todo;
                    const pm       = PRIORITY_META[t.priority] || PRIORITY_META.medium;
                    const typeInfo = DELIVERABLE_TYPES.find(d => d.key === t.contentType);
                    const empName  = getEmpName(t);
                    const [avBg, avFg] = avCol(empName);
                    const bName    = t.brandId?.name || "";
                    const bColor   = t.brandId?.color || "#7C3AED";
                    const overdue  = isOverdue(t.dueDate) && t.status !== "completed";
                    return (
                      <div key={t._id} className="brd-row" onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>

                        {/* Category icon */}
                        <div className="brd-type-icon" style={{ background: (typeInfo?.color || "#7C3AED") + "18" }}>
                          <i className={`bi ${typeInfo?.icon || "bi-palette-fill"}`} style={{ color: typeInfo?.color || "#7C3AED", fontSize: 15 }} />
                        </div>

                        {/* Brand dot */}
                        {bName && (
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: bColor + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: bColor, flexShrink: 0 }}>
                            {bName.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        {/* Title + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.nomenclature || t.title}
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center", flexWrap: "wrap" }}>
                            {typeInfo && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: typeInfo.color, background: typeInfo.color + "15", padding: "1px 7px", borderRadius: 5 }}>
                                {typeInfo.label}
                              </span>
                            )}
                            {bName && <span style={{ fontSize: 11, color: "#94A3B8" }}>{bName}</span>}
                            {t.taskId && <span style={{ fontSize: 10, color: "#CBD5E1", fontFamily: "monospace" }}>{t.taskId}</span>}
                          </div>
                        </div>

                        {/* Assignee */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <div className="brd-avatar" style={{ background: avBg, color: avFg }}>{getInitials(empName)}</div>
                          <span style={{ fontSize: 11, color: "#64748B", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{empName}</span>
                        </div>

                        {/* Due date */}
                        <div style={{ fontSize: 11, color: overdue ? "#EF4444" : "#94A3B8", fontWeight: overdue ? 700 : 400, flexShrink: 0, minWidth: 70, textAlign: "right" }}>
                          {overdue && <i className="bi bi-exclamation-circle me-1" />}
                          {fmtDate(t.dueDate)}
                        </div>

                        {/* Priority */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: pm.color, flexShrink: 0, minWidth: 44, textAlign: "center" }}>
                          {pm.label}
                        </div>

                        {/* Status */}
                        <span className="brd-badge" style={{ background: sm.bg, color: sm.color, flexShrink: 0 }}>
                          {sm.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </section>
        </div>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
}
