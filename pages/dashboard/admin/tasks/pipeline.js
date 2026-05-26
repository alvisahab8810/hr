import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const STAGES = [
  { key: "S1", label: "Script / Concept",  sub: "Ideation & scripting",      color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", icon: "bi-lightbulb-fill" },
  { key: "S2", label: "Shoot / Design",    sub: "Production & design work",  color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE", icon: "bi-camera-fill" },
  { key: "S3", label: "Edit / Develop",    sub: "Post-production & dev",     color: "#10B981", bg: "#ECFDF5", border: "#BBF7D0", icon: "bi-scissors" },
  { key: "S4", label: "Posted / Live",     sub: "Published & live content",  color: "#EC4899", bg: "#FDF2F8", border: "#FBCFE8", icon: "bi-broadcast" },
];

const CONTENT_META = {
  reel:     { label: "Reel",     icon: "bi-camera-video-fill", color: "#F59E0B" },
  post:     { label: "Post",     icon: "bi-image-fill",        color: "#6366F1" },
  carousel: { label: "Carousel", icon: "bi-images",            color: "#10B981" },
  story:    { label: "Story",    icon: "bi-phone-fill",        color: "#EC4899" },
};

const STATUS_META = {
  todo:        { label: "To Do",       color: "#64748B", bg: "#F1F5F9" },
  in_progress: { label: "In Progress", color: "#1D4ED8", bg: "#DBEAFE" },
  review:      { label: "Review",      color: "#B45309", bg: "#FEF3C7" },
  completed:   { label: "Done",        color: "#15803D", bg: "#DCFCE7" },
  blocked:     { label: "Blocked",     color: "#DC2626", bg: "#FEE2E2" },
};

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return `${dt.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getMonth()]}`;
}

function isOverdue(t) {
  return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
}

function getEmpName(t) {
  const a = t.assignedTo;
  if (!a) return null;
  if (a.personal?.firstName) return `${a.personal.firstName} ${a.personal.lastName || ""}`.trim();
  return a.email || null;
}

export default function PipelinePage() {
  const router = useRouter();

  const [tasks,      setTasks]      = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [adminUser,  setAdminUser]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [brandFilter, setBrandFilter] = useState("");
  const [typeFilter,  setTypeFilter]  = useState("");
  const [dragOver,   setDragOver]   = useState(null); // stage key
  const [dragging,   setDragging]   = useState(null); // task id

  /* ── Fetch ── */
  useEffect(() => {
    fetch("/api/admin-users/me", { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setAdminUser(d.user); }).catch(() => {});
    fetch("/api/admin/brands", { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setBrands(d.brands || []); }).catch(() => {});
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: 200 });
      if (brandFilter) q.set("brandId", brandFilter);
      if (typeFilter)  q.set("contentType", typeFilter);
      const res  = await fetch(`/api/admin/tasks?${q}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setTasks(data.tasks || []);
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }, [brandFilter, typeFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* ── Group by stage (tasks with no stage go to "unassigned") ── */
  const tasksByStage = (stageKey) =>
    tasks.filter(t => t.stage === stageKey);

  const unstaged = tasks.filter(t => !t.stage);

  /* ── Move task to stage via drag or button ── */
  const moveToStage = async (taskId, stage) => {
    try {
      const res  = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, performedById: adminUser?._id, performedByModel: "AdminUser", performedByName: adminUser?.name || "Admin" }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t._id === taskId ? { ...t, stage } : t));
      } else toast.error("Failed");
    } catch { toast.error("Network error"); }
  };

  /* ── Drag & drop handlers ── */
  const onDragStart = (e, taskId) => {
    setDragging(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e, stageKey) => {
    e.preventDefault();
    setDragOver(stageKey);
  };

  const onDrop = (e, stageKey) => {
    e.preventDefault();
    if (dragging) moveToStage(dragging, stageKey);
    setDragOver(null);
    setDragging(null);
  };

  const onDragEnd = () => {
    setDragOver(null);
    setDragging(null);
  };

  const stageTotals = STAGES.reduce((acc, s) => {
    acc[s.key] = tasksByStage(s.key).length;
    return acc;
  }, {});

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Pipeline — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .pl-badge { display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; white-space:nowrap; }
          .pl-btn { border:none; cursor:pointer; border-radius:9px; padding:6px 12px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:5px; transition:all .14s; }
          .pl-btn-ghost { background:#F1F5F9; color:#475569; }
          .pl-btn-ghost:hover { background:#E2E8F0; }
          .pl-select { padding:6px 10px; border-radius:9px; border:1.5px solid #E5E7EB; font-size:12px; outline:none; background:#fff; cursor:pointer; }
          .pl-col { border-radius:18px; border:2px solid; min-height:200px; transition:background .15s; }
          .pl-col.drag-over { filter:brightness(.97); }
          .pl-col-header { padding:16px 16px 12px; border-bottom:1px solid; }
          .pl-card { background:#fff; border-radius:12px; border:1.5px solid #F1F5F9; padding:12px 14px; margin:0 10px 10px; cursor:grab; transition:box-shadow .12s; }
          .pl-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
          .pl-card:active { cursor:grabbing; box-shadow:0 8px 24px rgba(0,0,0,.12); }
          .pl-card.dragging { opacity:.5; }
          .pl-empty { padding:24px 16px; text-align:center; color:#CBD5E1; font-size:12px; }
          .pl-move-btns { display:flex; gap:3px; flex-wrap:wrap; }
          .pl-move-btn { font-size:9px; padding:2px 5px; border:1px solid; border-radius:5px; cursor:pointer; font-weight:700; background:transparent; transition:all .1s; }
          .kanban-wrap { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; align-items:start; }
          @media(max-width:900px) { .kanban-wrap { grid-template-columns:repeat(2,1fr); } }
          @media(max-width:600px) { .kanban-wrap { grid-template-columns:1fr; } }
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
                <li className="breadcrumb-item active">Pipeline Stages</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* Topbar */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">Pipeline Stages</h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                    {tasks.length} tasks · drag cards to move between S1 → S4 stages
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select className="pl-select" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                    <option value="">All Brands</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  <select className="pl-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    {Object.entries(CONTENT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button className="pl-btn pl-btn-ghost" onClick={fetchTasks}>
                    <i className="bi bi-arrow-clockwise" />
                  </button>
                </div>
              </div>

              {/* Stage summary pills */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                {STAGES.map(s => (
                  <div key={s.key} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                    borderRadius: 30, background: s.bg, border: `1.5px solid ${s.border}`,
                  }}>
                    <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 14 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.key} {s.label}</span>
                    <span style={{
                      background: s.color, color: "#fff", borderRadius: 20,
                      padding: "1px 8px", fontSize: 11, fontWeight: 800,
                    }}>{stageTotals[s.key]}</span>
                  </div>
                ))}
                {unstaged.length > 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                    borderRadius: 30, background: "#F8FAFC", border: "1.5px solid #E5E7EB",
                  }}>
                    <i className="bi bi-question-circle" style={{ color: "#94A3B8", fontSize: 14 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>Unstaged</span>
                    <span style={{ background: "#94A3B8", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>
                      {unstaged.length}
                    </span>
                  </div>
                )}
              </div>

              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" />
                  <div style={{ marginTop: 10 }}>Loading pipeline…</div>
                </div>
              ) : (
                /* ─── KANBAN ─── */
                <div className="kanban-wrap">
                  {STAGES.map(stage => {
                    const cols = tasksByStage(stage.key);
                    const isDrop = dragOver === stage.key;
                    return (
                      <div
                        key={stage.key}
                        className={`pl-col ${isDrop ? "drag-over" : ""}`}
                        style={{ background: isDrop ? stage.bg : "#FAFAFA", borderColor: isDrop ? stage.color : "#F1F5F9" }}
                        onDragOver={e => onDragOver(e, stage.key)}
                        onDrop={e => onDrop(e, stage.key)}
                      >
                        {/* Column header */}
                        <div className="pl-col-header" style={{ borderColor: stage.border }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 10, background: stage.color + "22",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <i className={`bi ${stage.icon}`} style={{ color: stage.color, fontSize: 14 }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: "#1E293B" }}>{stage.key} — {stage.label}</div>
                                <div style={{ fontSize: 10, color: "#94A3B8" }}>{stage.sub}</div>
                              </div>
                            </div>
                            <span style={{
                              background: stage.color, color: "#fff", borderRadius: 20,
                              padding: "2px 10px", fontSize: 12, fontWeight: 800,
                            }}>{cols.length}</span>
                          </div>
                        </div>

                        {/* Drop zone hint */}
                        {isDrop && (
                          <div style={{ margin: "8px 10px", padding: "10px", borderRadius: 10, border: `2px dashed ${stage.color}`, textAlign: "center", fontSize: 12, color: stage.color, fontWeight: 600 }}>
                            Drop here to move to {stage.key}
                          </div>
                        )}

                        {/* Cards */}
                        <div style={{ paddingTop: 10, paddingBottom: 6 }}>
                          {cols.length === 0 && !isDrop ? (
                            <div className="pl-empty">
                              <i className={`bi ${stage.icon}`} style={{ fontSize: 22, marginBottom: 6, display: "block" }} />
                              No tasks in {stage.key}
                            </div>
                          ) : (
                            cols.map(t => {
                              const sm  = STATUS_META[t.status] || {};
                              const ct  = CONTENT_META[t.contentType];
                              const emp = getEmpName(t);
                              const due = fmtDate(t.dueDate);
                              const ov  = isOverdue(t);
                              return (
                                <div
                                  key={t._id}
                                  className={`pl-card ${dragging === t._id ? "dragging" : ""}`}
                                  draggable
                                  onDragStart={e => onDragStart(e, t._id)}
                                  onDragEnd={onDragEnd}
                                >
                                  {/* Brand + type */}
                                  <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
                                    {t.brandId && (
                                      <span className="pl-badge" style={{ background: (t.brandId.color || "#6366F1") + "20", color: t.brandId.color || "#6366F1" }}>
                                        {t.brandId.name}
                                      </span>
                                    )}
                                    {ct && (
                                      <span className="pl-badge" style={{ background: ct.color + "18", color: ct.color }}>
                                        <i className={`bi ${ct.icon}`} style={{ fontSize: 9 }} /> {ct.label}
                                      </span>
                                    )}
                                  </div>

                                  {/* Title */}
                                  <div style={{ fontWeight: 700, fontSize: 12, color: "#1E293B", marginBottom: 6, lineHeight: 1.4 }}>
                                    {ov && <i className="bi bi-exclamation-circle-fill text-danger me-1" style={{ fontSize: 10 }} />}
                                    {t.nomenclature || t.title}
                                  </div>

                                  {/* Status + due */}
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span className="pl-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                                    {due && (
                                      <span style={{ fontSize: 10, color: ov ? "#DC2626" : "#94A3B8", fontWeight: ov ? 700 : 400 }}>
                                        <i className="bi bi-calendar3" style={{ marginRight: 3 }} />{due}
                                      </span>
                                    )}
                                  </div>

                                  {/* Assignee */}
                                  {emp && (
                                    <div style={{ fontSize: 10, color: "#64748B", marginBottom: 8 }}>
                                      <i className="bi bi-person" style={{ marginRight: 4 }} />{emp}
                                    </div>
                                  )}

                                  {/* Move buttons */}
                                  <div className="pl-move-btns">
                                    {STAGES.filter(s => s.key !== stage.key).map(s => (
                                      <button key={s.key} className="pl-move-btn"
                                        style={{ color: s.color, borderColor: s.color + "60" }}
                                        onClick={() => moveToStage(t._id, s.key)}
                                        title={`Move to ${s.label}`}>
                                        → {s.key}
                                      </button>
                                    ))}
                                    <button className="pl-move-btn" style={{ color: "#94A3B8", borderColor: "#E5E7EB" }}
                                      onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                      <i className="bi bi-eye" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
