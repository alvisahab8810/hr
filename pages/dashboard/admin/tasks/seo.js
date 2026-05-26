// pages/dashboard/admin/tasks/seo.js — SEO Hub
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const TABS = [
  { key: "overview",   label: "Overview",       icon: "bi-grid-1x2-fill",          color: "#6366F1" },
  { key: "blog",       label: "Blogs",          icon: "bi-file-text-fill",          color: "#6366F1" },
  { key: "technical",  label: "Technical SEO",  icon: "bi-code-slash",              color: "#EF4444" },
  { key: "onpage",     label: "On-Page",         icon: "bi-file-earmark-richtext",   color: "#3B82F6" },
  { key: "offpage",    label: "Off-Page",         icon: "bi-link-45deg",             color: "#F59E0B" },
  { key: "backlinks",  label: "Backlinks",        icon: "bi-arrow-left-right",        color: "#10B981" },
  { key: "keywords",   label: "Keywords",         icon: "bi-search",                 color: "#8B5CF6" },
];

const STATUS_META = {
  todo:        { label: "To Do",       bg: "#F1F5F9", color: "#64748B" },
  in_progress: { label: "In Progress", bg: "#DBEAFE", color: "#1D4ED8" },
  review:      { label: "Review",      bg: "#FEF3C7", color: "#B45309" },
  completed:   { label: "Completed",   bg: "#DCFCE7", color: "#15803D" },
  blocked:     { label: "Blocked",     bg: "#FEE2E2", color: "#DC2626" },
};

const PRIORITY_META = {
  low: { label: "Low", color: "#16A34A" },
  medium: { label: "Medium", color: "#2563EB" },
  high: { label: "High", color: "#D97706" },
  urgent: { label: "Urgent", color: "#E11D48" },
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}
function isOverdue(d) {
  if (!d) return false;
  return new Date(d) < new Date();
}
function getEmpName(t) {
  const a = t.assignedTo;
  if (!a) return "Unassigned";
  if (a.personal?.firstName) return `${a.personal.firstName} ${a.personal.lastName || ""}`.trim();
  return a.email || "—";
}
function getInitials(name) {
  return (name || "?").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();
}
const AV_COLORS = [["#EEF2FF","#4F46E5"],["#D1FAE5","#065F46"],["#FEE2E2","#DC2626"],["#FEF3C7","#B45309"],["#F3E8FF","#7C3AED"]];
function avCol(n) { return AV_COLORS[(n?.charCodeAt(0)||0) % AV_COLORS.length]; }

export default function SEOHubPage() {
  const [tab,      setTab]      = useState("overview");
  const [tasks,    setTasks]    = useState([]);
  const [brands,   setBrands]   = useState([]);
  const [brandId,  setBrandId]  = useState("");
  const [loading,  setLoading]  = useState(true);
  const [statusF,  setStatusF]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [td, bd] = await Promise.all([
        fetch(`/api/admin/tasks?tags=seo&limit=300${brandId ? `&brandId=${brandId}` : ""}`, { credentials: "include" }).then(r => r.json()),
        fetch("/api/admin/brands",  { credentials: "include" }).then(r => r.json()),
      ]);
      if (td.success) setTasks(td.tasks || []);
      if (bd.success) setBrands((bd.brands || []).filter(b => (b.services || []).includes("seo")));
    } catch {}
    setLoading(false);
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  // Filter to current tab's seoCategory (or all for overview)
  const visibleTasks = tasks.filter(t => {
    if (statusF && t.status !== statusF) return false;
    if (tab === "overview") return true;
    return t.seoCategory === tab || (t.tags || []).includes(tab);
  });

  // Per-category counts for overview
  const catCount = (key) => tasks.filter(t => t.seoCategory === key || (t.tags || []).includes(key));

  const selectedBrand = brands.find(b => b._id === brandId);

  const STAT_CATS = [
    { key: "blog",      label: "Blogs",     icon: "bi-file-text",           color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
    { key: "technical", label: "Technical", icon: "bi-code-slash",          color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
    { key: "onpage",    label: "On-Page",    icon: "bi-file-earmark-richtext",color:"#3B82F6", bg: "#DBEAFE", border: "#93C5FD" },
    { key: "offpage",   label: "Off-Page",   icon: "bi-link-45deg",          color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
    { key: "backlinks", label: "Backlinks",  icon: "bi-arrow-left-right",    color: "#10B981", bg: "#ECFDF5", border: "#6EE7B7" },
    { key: "keywords",  label: "Keywords",   icon: "bi-search",              color: "#8B5CF6", bg: "#F5F3FF", border: "#C4B5FD" },
  ];

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>SEO Hub — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .sh-tab { padding:8px 16px; border-radius:10px; border:1.5px solid #E5E7EB; background:#fff; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .14s; white-space:nowrap; }
          .sh-tab.active { background:#4F46E5; color:#fff; border-color:#4F46E5; }
          .sh-tab:not(.active):hover { border-color:#A5B4FC; color:#4F46E5; }
          .sh-card { background:#fff; border-radius:14px; border:1.5px solid #E5E7EB; padding:20px; }
          .sh-row { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:10px; border:1.5px solid #F1F5F9; margin-bottom:8px; transition:border-color .12s; }
          .sh-row:hover { border-color:#C7D2FE; }
          .sh-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
          .sh-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 32px; text-align:center; color:#94A3B8; }
          .sh-stat { border-radius:14px; padding:16px 20px; border:1.5px solid; display:flex; align-items:center; gap:12px; }
          .sh-select { padding:7px 12px; border:1.5px solid #E5E7EB; border-radius:10px; font-size:13px; outline:none; background:#fff; cursor:pointer; }
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
                <li className="breadcrumb-item active">SEO Hub</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* Header */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20, alignItems: "flex-start" }}>
                <div>
                  <h5 className="admin-main-heading">SEO Hub</h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Blogs · Technical · On-Page · Off-Page · Backlinks · Keywords</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Brand filter */}
                  <select value={brandId} onChange={e => setBrandId(e.target.value)} className="sh-select">
                    <option value="">All Brands</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  <Link href="/dashboard/admin/tasks?create=1">
                    <button style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="bi bi-plus-circle-fill" /> New SEO Task
                    </button>
                  </Link>
                </div>
              </div>

              {/* Stats row */}
              {!loading && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
                  {STAT_CATS.map(s => {
                    const catTasks = catCount(s.key);
                    const done = catTasks.filter(t => t.status === "completed").length;
                    const pending = catTasks.filter(t => t.status !== "completed").length;
                    return (
                      <div key={s.key} className="sh-stat" style={{ background: s.bg, borderColor: s.border, flex: 1, minWidth: 130, cursor: "pointer" }}
                        onClick={() => setTab(s.key)}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{catTasks.length}</div>
                          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{s.label}</div>
                          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{done} done · {pending} open</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {TABS.map(t => (
                  <button key={t.key} className={`sh-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                    <i className={`bi ${t.icon}`} /> {t.label}
                    {t.key !== "overview" && (
                      <span style={{ background: tab === t.key ? "rgba(255,255,255,.25)" : "#F1F5F9", color: tab === t.key ? "#fff" : "#64748B",
                        borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 700, marginLeft: 2 }}>
                        {catCount(t.key).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Overview ── */}
              {tab === "overview" && (
                <div>
                  {/* Brand-wise SEO settings */}
                  {brands.length > 0 && (
                    <div className="sh-card" style={{ marginBottom: 20 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="bi bi-building" style={{ color: "#6366F1" }} /> Brand SEO Configuration
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: "#F8FAFC" }}>
                              {["Brand","Blogs/mo","Technical","On-Page","Off-Page","Backlinks","Keywords","Tasks"].map(h => (
                                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#64748B", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {brands.map(b => {
                              const ss = b.seoSettings || {};
                              const bTasks = tasks.filter(t => (t.brandId?._id || t.brandId)?.toString() === b._id?.toString());
                              return (
                                <tr key={b._id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1E293B" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <div style={{ width: 28, height: 28, borderRadius: 8, background: (b.color || "#6366F1") + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: b.color || "#6366F1", flexShrink: 0 }}>
                                        {(b.name || "?").slice(0, 2).toUpperCase()}
                                      </div>
                                      {b.name}
                                    </div>
                                  </td>
                                  <td style={{ padding: "10px 12px", color: ss.blogCount > 0 ? "#1E293B" : "#CBD5E1", fontWeight: ss.blogCount > 0 ? 700 : 400 }}>{ss.blogCount > 0 ? ss.blogCount : "—"}</td>
                                  <td style={{ padding: "10px 12px" }}>{ss.technical?.enabled ? <span style={{ color: "#10B981", fontWeight: 700, fontSize: 12 }}>✓ Yes</span> : <span style={{ color: "#CBD5E1" }}>—</span>}</td>
                                  <td style={{ padding: "10px 12px" }}>{ss.onPage?.enabled    ? <span style={{ color: "#10B981", fontWeight: 700, fontSize: 12 }}>✓ Yes</span> : <span style={{ color: "#CBD5E1" }}>—</span>}</td>
                                  <td style={{ padding: "10px 12px" }}>{ss.offPage?.enabled   ? <span style={{ color: "#10B981", fontWeight: 700, fontSize: 12 }}>✓ Yes</span> : <span style={{ color: "#CBD5E1" }}>—</span>}</td>
                                  <td style={{ padding: "10px 12px", color: (ss.backlinks?.target || 0) > 0 ? "#1E293B" : "#CBD5E1", fontWeight: 700 }}>{(ss.backlinks?.target || 0) > 0 ? ss.backlinks.target + "/mo" : "—"}</td>
                                  <td style={{ padding: "10px 12px", color: (ss.keywords?.count || 0) > 0 ? "#1E293B" : "#CBD5E1", fontWeight: 700 }}>{(ss.keywords?.count || 0) > 0 ? ss.keywords.count : "—"}</td>
                                  <td style={{ padding: "10px 12px" }}>
                                    <span style={{ fontWeight: 700, color: "#4F46E5" }}>{bTasks.length}</span>
                                    <span style={{ color: "#94A3B8", fontSize: 11, marginLeft: 4 }}>({bTasks.filter(t => t.status === "completed").length} done)</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recent tasks overview */}
                  <div className="sh-card">
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <i className="bi bi-list-task" style={{ color: "#6366F1" }} /> Recent SEO Tasks
                      <Link href="/dashboard/admin/tasks/list" style={{ marginLeft: "auto", fontSize: 12, color: "#6366F1", fontWeight: 700, textDecoration: "none" }}>
                        View all →
                      </Link>
                    </div>
                    <TaskList tasks={tasks.slice(0, 10)} loading={loading} />
                  </div>
                </div>
              )}

              {/* ── Category tab content ── */}
              {tab !== "overview" && (() => {
                const tabMeta = TABS.find(t => t.key === tab);
                const tabBrand = selectedBrand;
                const ss = tabBrand?.seoSettings;

                return (
                  <div className="sh-card">
                    {/* Tab header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: tabMeta.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className={`bi ${tabMeta.icon}`} style={{ color: tabMeta.color, fontSize: 18 }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B" }}>{tabMeta.label}</div>
                          {tab === "blog" && ss?.blogCount > 0 && <div style={{ fontSize: 12, color: "#64748B" }}>Target: {ss.blogCount} blogs/month</div>}
                          {tab === "backlinks" && (ss?.backlinks?.target || 0) > 0 && <div style={{ fontSize: 12, color: "#64748B" }}>Target: {ss.backlinks.target}/month</div>}
                          {tab === "keywords" && (ss?.keywords?.count || 0) > 0 && <div style={{ fontSize: 12, color: "#64748B" }}>Tracking: {ss.keywords.count} keywords</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="sh-select" style={{ fontSize: 12 }}>
                          <option value="">All status</option>
                          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <Link href="/dashboard/admin/tasks?create=1">
                          <button style={{ background: tabMeta.color, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                            <i className="bi bi-plus-lg" /> New Task
                          </button>
                        </Link>
                      </div>
                    </div>

                    {/* Brand SEO settings context */}
                    {tabBrand && ss && tab === "blog" && ss.notes && (
                      <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", marginBottom: 16 }}>
                        <strong>SEO Notes:</strong> {ss.notes}
                      </div>
                    )}
                    {tabBrand && ss && tab === "technical" && ss.technical?.notes && (
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", marginBottom: 16 }}>
                        <strong>Technical SEO Notes:</strong> {ss.technical.notes}
                      </div>
                    )}
                    {tabBrand && ss && tab === "onpage" && ss.onPage?.notes && (
                      <div style={{ background: "#DBEAFE", border: "1px solid #93C5FD", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", marginBottom: 16 }}>
                        <strong>On-Page Notes:</strong> {ss.onPage.notes}
                      </div>
                    )}
                    {tabBrand && ss && tab === "offpage" && ss.offPage?.notes && (
                      <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", marginBottom: 16 }}>
                        <strong>Off-Page Notes:</strong> {ss.offPage.notes}
                      </div>
                    )}
                    {tabBrand && ss && tab === "backlinks" && ss.backlinks?.notes && (
                      <div style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", marginBottom: 16 }}>
                        <strong>Backlinks Notes:</strong> {ss.backlinks.notes}
                      </div>
                    )}
                    {tabBrand && ss && tab === "keywords" && ss.keywords?.notes && (
                      <div style={{ background: "#F5F3FF", border: "1px solid #C4B5FD", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", marginBottom: 16 }}>
                        <strong>Keywords Notes:</strong> {ss.keywords.notes}
                      </div>
                    )}

                    <TaskList tasks={visibleTasks} loading={loading} />
                  </div>
                );
              })()}

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TaskList({ tasks, loading }) {
  if (loading) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
      <div className="spinner-border spinner-border-sm text-primary" /> Loading…
    </div>
  );
  if (tasks.length === 0) return (
    <div className="sh-empty">
      <i className="bi bi-search" style={{ fontSize: 36, marginBottom: 12 }} />
      <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B", marginBottom: 4 }}>No tasks yet</div>
      <div style={{ fontSize: 13 }}>Create an SEO task to start tracking work here.</div>
    </div>
  );
  return (
    <div>
      {tasks.map(task => {
        const sm = STATUS_META[task.status]   || STATUS_META.todo;
        const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
        const name = getEmpName(task);
        const [avBg, avFg] = avCol(name);
        const bName = task.brandId?.name || "";
        const bColor = task.brandId?.color || "#6366F1";
        const overdue = isOverdue(task.dueDate) && task.status !== "completed";
        const seoCat = task.seoCategory || (task.tags || []).find(t => ["blog","technical","onpage","offpage","backlinks","keywords"].includes(t)) || "";
        return (
          <Link key={task._id} href={`/dashboard/admin/tasks/${task._id}`} style={{ textDecoration: "none" }}>
            <div className="sh-row" style={{ cursor: "pointer" }}>
              {/* Brand dot */}
              {bName && (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: bColor + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: bColor, flexShrink: 0 }}>
                  {bName.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Title + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {task.title}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                  {seoCat && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: "#4F46E5", borderRadius: 5, padding: "1px 7px" }}>
                      {seoCat.toUpperCase()}
                    </span>
                  )}
                  {bName && <span style={{ fontSize: 11, color: "#94A3B8" }}>{bName}</span>}
                </div>
              </div>

              {/* Assignee */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: avBg, color: avFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
                  {getInitials(name)}
                </div>
                <span style={{ fontSize: 11, color: "#64748B", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
              </div>

              {/* Due date */}
              <div style={{ fontSize: 11, color: overdue ? "#EF4444" : "#94A3B8", fontWeight: overdue ? 700 : 400, flexShrink: 0, minWidth: 70, textAlign: "right" }}>
                {overdue && <i className="bi bi-exclamation-circle me-1" />}
                {fmtDate(task.dueDate)}
              </div>

              {/* Priority */}
              <div style={{ fontSize: 11, fontWeight: 700, color: pm.color, flexShrink: 0, minWidth: 50, textAlign: "center" }}>
                {pm.label}
              </div>

              {/* Status */}
              <span className="sh-badge" style={{ background: sm.bg, color: sm.color, flexShrink: 0 }}>
                {sm.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
