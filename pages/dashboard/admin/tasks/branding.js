import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
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

const DELIVERABLE_TYPES = [
  { key: "logo",         label: "Logo Design",       icon: "bi-pentagon-fill",       color: "#6366F1" },
  { key: "brandkit",     label: "Brand Kit",         icon: "bi-palette-fill",        color: "#EC4899" },
  { key: "social",       label: "Social Assets",     icon: "bi-images",              color: "#F59E0B" },
  { key: "presentation", label: "Presentations",     icon: "bi-easel-fill",          color: "#10B981" },
  { key: "print",        label: "Print / Collateral",icon: "bi-printer-fill",        color: "#8B5CF6" },
  { key: "motion",       label: "Motion Graphics",   icon: "bi-play-circle-fill",    color: "#EF4444" },
  { key: "web",          label: "Web Design",        icon: "bi-browser-chrome",      color: "#14B8A6" },
  { key: "other",        label: "Other",             icon: "bi-boxes",               color: "#94A3B8" },
];

const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],["#F3E8FF","#7C3AED"],
];
function avatarColor(name) { return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]; }
function getInitials(name) { return name?.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??"; }

export default function BrandingPage() {
  const router   = useRouter();
  const [tasks,      setTasks]      = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [empFilter,  setEmpFilter]  = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tasks?taskType=production&limit=200", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/assets/employees", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/brands", { credentials: "include" }).then(r => r.json()),
    ]).then(([td, ed, bd]) => {
      if (td.success) setTasks(td.tasks || []);
      if (ed.success) setEmployees(ed.employees || []);
      if (bd.success) setBrands(bd.brands || []);
    }).catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Group tasks by designer (assignedTo) ── */
  const byDesigner = employees.reduce((acc, emp) => {
    const myTasks = tasks.filter(t => {
      const match = String(t.assignedTo?._id || t.assignedTo) === String(emp._id);
      if (!match) return false;
      if (typeFilter && t.contentType !== typeFilter) return false;
      return true;
    });
    if (myTasks.length > 0 || !typeFilter) {
      acc.push({ emp, tasks: myTasks });
    }
    return acc;
  }, []);

  const totalStats = {
    total:     tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    active:    tasks.filter(t => t.status === "in_progress").length,
    review:    tasks.filter(t => t.status === "review").length,
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
          .br2-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
          .br2-card { background:#fff; border-radius:16px; border:1.5px solid #F1F5F9; overflow:hidden; margin-bottom:20px; }
          .br2-task { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid #F8FAFC; cursor:pointer; }
          .br2-task:hover { background:#FAFBFF; }
          .br2-task:last-child { border-bottom:none; }
          .br2-type-chip { display:inline-flex; align-items:center; gap:5px; padding:6px 12px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer; border:1.5px solid transparent; transition:all .14s; }
          .br2-type-chip.active { border-color: currentColor; }
          .br2-select { padding:7px 10px; border-radius:9px; border:1.5px solid #E5E7EB; font-size:12px; outline:none; background:#fff; cursor:pointer; }
          .br2-avatar { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; flex-shrink:0; }
          .br2-progress { height:6px; border-radius:4px; background:#F1F5F9; overflow:hidden; }
          .br2-progress-fill { height:100%; border-radius:4px; }
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

              {/* Header */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">Branding</h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Track design deliverables per designer — logos, brand kits, social assets &amp; more</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="br2-select" value={empFilter} onChange={e => setEmpFilter(e.target.value)}>
                    <option value="">All Designers</option>
                    {employees.map(emp => {
                      const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                      return <option key={emp._id} value={emp._id}>{n}</option>;
                    })}
                  </select>
                  <button className="invite-btn" style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => router.push("/dashboard/admin/tasks")}>
                    <i className="bi bi-plus-circle" /> New Deliverable
                  </button>
                </div>
              </div>

              {/* Summary stat row */}
              <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Total",      value: totalStats.total,     color: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE" },
                  { label: "Active",     value: totalStats.active,    color: "#1D4ED8", bg: "#DBEAFE", border: "#93C5FD" },
                  { label: "In Review",  value: totalStats.review,    color: "#B45309", bg: "#FEF3C7", border: "#FDE68A" },
                  { label: "Completed",  value: totalStats.completed, color: "#15803D", bg: "#DCFCE7", border: "#BBF7D0" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: 100, padding: "14px 16px", borderRadius: 12, background: s.bg, border: `1.5px solid ${s.border}` }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{loading ? "—" : s.value}</div>
                    <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Type filter chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                <div className={`br2-type-chip ${!typeFilter ? "active" : ""}`}
                  style={{ background: !typeFilter ? "#EEF2FF" : "#F8FAFC", color: "#6366F1" }}
                  onClick={() => setTypeFilter("")}>
                  All
                </div>
                {DELIVERABLE_TYPES.map(d => (
                  <div key={d.key} className={`br2-type-chip ${typeFilter === d.key ? "active" : ""}`}
                    style={{ background: typeFilter === d.key ? d.color + "20" : "#F8FAFC", color: d.color }}
                    onClick={() => setTypeFilter(t => t === d.key ? "" : d.key)}>
                    <i className={`bi ${d.icon}`} style={{ fontSize: 11 }} />
                    {d.label}
                  </div>
                ))}
              </div>

              {/* Designer cards */}
              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : byDesigner.filter(d => !empFilter || String(d.emp._id) === empFilter).length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <i className="bi bi-palette" style={{ fontSize: 44 }} />
                  <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: "#1E293B" }}>No branding tasks found</div>
                </div>
              ) : (
                byDesigner
                  .filter(d => !empFilter || String(d.emp._id) === empFilter)
                  .map(({ emp, tasks: dt }) => {
                    const name = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Designer";
                    const [bg, fg] = avatarColor(name);
                    const done = dt.filter(t => t.status === "completed").length;
                    const pct  = dt.length ? Math.round(done / dt.length * 100) : 0;
                    return (
                      <div key={emp._id} className="br2-card">
                        {/* Designer header */}
                        <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #F1F5F9" }}>
                          <div className="br2-avatar" style={{ background: bg, color: fg }}>{getInitials(name)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B" }}>{name}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>{emp.professional?.designation || "Designer"}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#4F46E5" }}>{dt.length}</div>
                            <div style={{ fontSize: 10, color: "#94A3B8" }}>deliverables</div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div style={{ padding: "10px 18px", borderBottom: "1px solid #F1F5F9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Completion</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>{pct}% · {done}/{dt.length}</span>
                          </div>
                          <div className="br2-progress">
                            <div className="br2-progress-fill" style={{ width: `${pct}%`, background: "#10B981" }} />
                          </div>
                        </div>

                        {/* Tasks */}
                        {dt.slice(0, 5).map(t => {
                          const sm = STATUS_META[t.status] || {};
                          const typeInfo = DELIVERABLE_TYPES.find(d => d.key === t.contentType);
                          return (
                            <div key={t._id} className="br2-task" onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                              <i className={`bi ${typeInfo?.icon || "bi-palette"}`} style={{ color: typeInfo?.color || "#94A3B8", fontSize: 14, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {t.nomenclature || t.title}
                                </div>
                                {t.brandId && <div style={{ fontSize: 10, color: t.brandId.color || "#94A3B8" }}>{t.brandId.name}</div>}
                              </div>
                              <span className="br2-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                            </div>
                          );
                        })}
                        {dt.length > 5 && (
                          <div style={{ padding: "8px 18px", fontSize: 12, color: "#6366F1", fontWeight: 700, cursor: "pointer" }}
                            onClick={() => router.push(`/dashboard/admin/tasks/list?assignedTo=${emp._id}`)}>
                            +{dt.length - 5} more deliverables →
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
