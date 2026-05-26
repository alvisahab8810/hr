import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const CONTENT_META = {
  reel:     { label: "Reel",     icon: "bi-camera-video-fill", color: "#F59E0B" },
  post:     { label: "Post",     icon: "bi-image-fill",        color: "#6366F1" },
  carousel: { label: "Carousel", icon: "bi-images",            color: "#10B981" },
  story:    { label: "Story",    icon: "bi-phone-fill",        color: "#EC4899" },
};
const STAGE_META = {
  S1: { label: "S1 Script",  color: "#F59E0B", bg: "#FFFBEB" },
  S2: { label: "S2 Shoot",   color: "#6366F1", bg: "#EEF2FF" },
  S3: { label: "S3 Edit",    color: "#10B981", bg: "#ECFDF5" },
  S4: { label: "S4 Live",    color: "#EC4899", bg: "#FDF2F8" },
};
const STATUS_META = {
  todo:        { label: "To Do",   color: "#64748B", bg: "#F1F5F9" },
  in_progress: { label: "Active",  color: "#1D4ED8", bg: "#DBEAFE" },
  review:      { label: "Review",  color: "#B45309", bg: "#FEF3C7" },
  completed:   { label: "Done",    color: "#15803D", bg: "#DCFCE7" },
  blocked:     { label: "Blocked", color: "#DC2626", bg: "#FEE2E2" },
};

const TABS = [
  { key: "overview",  label: "Overview",  icon: "bi-grid-1x2-fill" },
  { key: "pipeline",  label: "Pipeline",  icon: "bi-funnel-fill" },
  { key: "schedule",  label: "Schedule",  icon: "bi-calendar-week" },
  { key: "tasks",     label: "All Tasks", icon: "bi-list-task" },
  { key: "settings",  label: "Settings",  icon: "bi-gear-fill" },
];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function BrandDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [brand,      setBrand]      = useState(null);
  const [tasks,      setTasks]      = useState([]);
  const [taskStats,  setTaskStats]  = useState([]);
  const [stageStats, setStageStats] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState("overview");

  /* GSC settings state */
  const [gscSites,      setGscSites]      = useState([]);
  const [gscSitesLoading, setGscSitesLoading] = useState(false);
  const [gscSelectedSite, setGscSelectedSite] = useState("");
  const [gscSaving,     setGscSaving]     = useState(false);
  const [gscDisconnecting, setGscDisconnecting] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Handle OAuth callback query params
    const { gsc, msg, email, tab: qTab } = router.query;
    if (gsc === "connected") {
      toast.success(`Google Search Console connected${email ? ` as ${email}` : ""}!`);
    } else if (gsc === "error") {
      toast.error(`GSC connection failed: ${msg || "Unknown error"}`);
    }
    if (qTab) setTab(qTab);

    Promise.all([
      fetch(`/api/admin/brands/${id}`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/admin/tasks?brandId=${id}&limit=200`, { credentials: "include" }).then(r => r.json()),
    ]).then(([bData, tData]) => {
      if (bData.success) {
        setBrand(bData.brand);
        setTaskStats(bData.taskStats || []);
        setStageStats(bData.stageStats || []);
        if (bData.brand?.gsc?.siteUrl) setGscSelectedSite(bData.brand.gsc.siteUrl);
        if (bData.brand?.gsc?.email) {
          setGscSitesLoading(true);
          fetch(`/api/admin/brands/${id}/gsc/sites`, { credentials: "include" })
            .then(r => r.json())
            .then(d => { if (d.success) setGscSites(d.sites || []); })
            .catch(() => {})
            .finally(() => setGscSitesLoading(false));
        }
      }
      if (tData.success) setTasks(tData.tasks || []);
    }).catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const loadGscSites = useCallback(async () => {
    if (!id) return;
    setGscSitesLoading(true);
    try {
      const res  = await fetch(`/api/admin/brands/${id}/gsc/sites`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setGscSites(data.sites || []);
      else toast.error(data.message || "Could not load GSC sites");
    } catch { toast.error("Network error"); }
    finally { setGscSitesLoading(false); }
  }, [id]);

  const saveGscSite = async () => {
    if (!gscSelectedSite) return;
    setGscSaving(true);
    try {
      const res  = await fetch(`/api/admin/brands/${id}/gsc/save`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteUrl: gscSelectedSite }) });
      const data = await res.json();
      if (data.success) {
        toast.success("GSC property saved!");
        setBrand(b => ({ ...b, gsc: { ...(b.gsc || {}), siteUrl: gscSelectedSite } }));
      } else toast.error(data.message || "Failed to save");
    } catch { toast.error("Network error"); }
    finally { setGscSaving(false); }
  };

  const disconnectGsc = async () => {
    if (!confirm("Disconnect Google Search Console from this brand?")) return;
    setGscDisconnecting(true);
    try {
      const res  = await fetch(`/api/admin/brands/${id}/gsc/disconnect`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        toast.success("GSC disconnected");
        setBrand(b => ({ ...b, gsc: { siteUrl: "", email: "", connectedAt: null } }));
        setGscSites([]);
        setGscSelectedSite("");
      } else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setGscDisconnecting(false); }
  };

  if (loading) return (
    <div className="leaves-management-admin">
      <Head><title>Brand — Task Management</title><link rel="stylesheet" href="/asets/css/bootstrap.min.css" /><link rel="stylesheet" href="/asets/css/main.css" /><link rel="stylesheet" href="/asets/css/admin.css" /><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" /></Head>
      <div className="add-employee-area"><div className="main-nav"><SmartLeftbar /><LeftbarMobile /><Dashnav />
        <section className="content home"><div style={{ padding: 80, textAlign: "center", color: "#94A3B8" }}>
          <div className="spinner-border text-primary" /><div style={{ marginTop: 14 }}>Loading brand…</div>
        </div></section></div></div>
    </div>
  );

  if (!brand) return null;

  const color = brand.color || "#6366F1";
  const d = brand.monthlyDeliverables || {};
  const totalMonthly = (d.reels || 0) + (d.posts || 0) + (d.carousels || 0) + (d.stories || 0);
  const totalTasks = tasks.length;
  const doneTasks  = tasks.filter(t => t.status === "completed").length;
  const pct        = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;

  const stageData = (stageKey) => {
    const st = stageStats.find(s => s._id === stageKey);
    return st?.count || 0;
  };

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>{brand.name} — Brands</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .bd-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
          .bd-btn { border:none; cursor:pointer; border-radius:10px; padding:7px 14px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px; transition:all .14s; }
          .bd-btn-primary { background:#4F46E5; color:#fff; }
          .bd-btn-ghost { background:#F1F5F9; color:#475569; }
          .bd-btn-ghost:hover { background:#E2E8F0; }
          .bd-tab { padding:8px 16px; border-radius:10px; border:1.5px solid #E5E7EB; background:#fff; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all .14s; }
          .bd-tab.active { background:#4F46E5; color:#fff; border-color:#4F46E5; }
          .bd-stat { border-radius:12px; padding:14px 16px; border:1.5px solid; flex:1; }
          .bd-progress { height:8px; border-radius:4px; background:#F1F5F9; overflow:hidden; }
          .bd-progress-fill { height:100%; border-radius:4px; }
          .bd-task-row { display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid #F8FAFC; cursor:pointer; }
          .bd-task-row:hover { background:#FAFBFF; }
          .bd-task-row:last-child { border-bottom:none; }
          .sched-dot { width:26px; height:26px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:11px; border:2px solid; }
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
                <li className="breadcrumb-item">
                  <Link href="/dashboard/admin/tasks/brands">Brands</Link>
                </li>
                <li className="breadcrumb-item active">{brand.name}</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* Brand hero */}
              <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #F1F5F9", overflow: "hidden", marginBottom: 24 }}>
                <div style={{ height: 8, background: color }} />
                <div style={{ padding: "24px 28px", display: "flex", alignItems: "flex-start", gap: 20 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color, flexShrink: 0 }}>
                    {brand.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <h4 style={{ fontWeight: 900, color: "#1E293B", margin: 0 }}>{brand.name}</h4>
                      {!brand.isActive && <span className="bd-badge" style={{ background: "#F1F5F9", color: "#94A3B8" }}>Inactive</span>}
                    </div>
                    {brand.clientId && (
                      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 8 }}>
                        <i className="bi bi-building" style={{ marginRight: 6 }} />
                        {brand.clientId.name || brand.clientId.company}
                      </div>
                    )}
                    {brand.notes && (
                      <div style={{ fontSize: 13, color: "#94A3B8" }}>{brand.notes}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="bd-btn bd-btn-ghost"
                      onClick={() => router.push(`/dashboard/admin/tasks/brands`)}>
                      <i className="bi bi-arrow-left" /> Back
                    </button>
                    <button className="bd-btn bd-btn-primary"
                      onClick={() => router.push(`/dashboard/admin/tasks`)}>
                      <i className="bi bi-plus-circle" /> New Task
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                {TABS.map(t => (
                  <button key={t.key} className={`bd-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                    <i className={`bi ${t.icon}`} /> {t.label}
                  </button>
                ))}
              </div>

              {/* ── OVERVIEW TAB ── */}
              {tab === "overview" && (
                <div>
                  {/* Stats row */}
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
                    <div className="bd-stat" style={{ background: color + "10", borderColor: color + "30" }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color }}>{totalTasks}</div>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Total Tasks</div>
                    </div>
                    <div className="bd-stat" style={{ background: "#DCFCE7", borderColor: "#BBF7D0" }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#15803D" }}>{doneTasks}</div>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Completed</div>
                    </div>
                    <div className="bd-stat" style={{ background: "#EEF2FF", borderColor: "#C7D2FE" }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#4F46E5" }}>{totalMonthly}</div>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Monthly Target</div>
                    </div>
                    <div className="bd-stat" style={{ background: "#FEF3C7", borderColor: "#FDE68A" }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#B45309" }}>{brand.weeklySchedule?.length || 0}</div>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Posts / Week</div>
                    </div>
                  </div>

                  {/* Completion progress */}
                  <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #F1F5F9", padding: 20, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, color: "#1E293B" }}>Task Completion</span>
                      <span style={{ fontWeight: 800, color: "#10B981" }}>{pct}%</span>
                    </div>
                    <div className="bd-progress">
                      <div className="bd-progress-fill" style={{ width: `${pct}%`, background: "#10B981" }} />
                    </div>
                  </div>

                  {/* Monthly deliverables */}
                  <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #F1F5F9", padding: 20 }}>
                    <div style={{ fontWeight: 700, color: "#1E293B", marginBottom: 14 }}>Monthly Deliverables</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {[
                        { key: "reels", label: "Reels", ...CONTENT_META.reel },
                        { key: "posts", label: "Posts", ...CONTENT_META.post },
                        { key: "carousels", label: "Carousels", ...CONTENT_META.carousel },
                        { key: "stories", label: "Stories", ...CONTENT_META.story },
                      ].map(({ key, label, icon, color: c }) => (
                        <div key={key} style={{ flex: 1, minWidth: 100, padding: "14px 16px", borderRadius: 12, background: c + "12", border: `1.5px solid ${c}30`, textAlign: "center" }}>
                          <i className={`bi ${icon}`} style={{ color: c, fontSize: 20, display: "block", marginBottom: 6 }} />
                          <div style={{ fontSize: 22, fontWeight: 900, color: c }}>{d[key] || 0}</div>
                          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PIPELINE TAB ── */}
              {tab === "pipeline" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                  {Object.entries(STAGE_META).map(([key, meta]) => {
                    const stageTasks = tasks.filter(t => t.stage === key);
                    return (
                      <div key={key} style={{ background: meta.bg, borderRadius: 16, border: `1.5px solid ${meta.color}30`, overflow: "hidden" }}>
                        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${meta.color}20`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 800, color: meta.color, fontSize: 13 }}>{meta.label}</span>
                          <span style={{ background: meta.color, color: "#fff", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 800 }}>{stageTasks.length}</span>
                        </div>
                        {stageTasks.length === 0 ? (
                          <div style={{ padding: "20px 14px", textAlign: "center", color: "#CBD5E1", fontSize: 12 }}>Empty</div>
                        ) : (
                          stageTasks.slice(0, 8).map(t => {
                            const sm = STATUS_META[t.status] || {};
                            return (
                              <div key={t._id} style={{ margin: "8px 8px 0", padding: "8px 10px", background: "#fff", borderRadius: 10, border: "1.5px solid #F1F5F9", cursor: "pointer" }}
                                onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>{t.nomenclature || t.title}</div>
                                <span className="bd-badge" style={{ background: sm.bg, color: sm.color, fontSize: 10 }}>{sm.label}</span>
                              </div>
                            );
                          })
                        )}
                        {stageTasks.length > 8 && (
                          <div style={{ padding: "6px 14px 10px", fontSize: 11, color: meta.color, fontWeight: 700 }}>+{stageTasks.length - 8} more</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── SCHEDULE TAB ── */}
              {tab === "schedule" && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", padding: 24 }}>
                  <div style={{ fontWeight: 700, color: "#1E293B", marginBottom: 20 }}>Weekly Posting Schedule</div>
                  {!brand.weeklySchedule?.length ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>
                      <i className="bi bi-calendar-x" style={{ fontSize: 40 }} />
                      <div style={{ marginTop: 12 }}>No weekly schedule configured</div>
                      <button className="bd-btn bd-btn-primary" style={{ marginTop: 16 }}
                        onClick={() => router.push("/dashboard/admin/tasks/brands")}>
                        <i className="bi bi-pencil" /> Edit Brand
                      </button>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ borderCollapse: "separate", borderSpacing: "6px" }}>
                        <thead>
                          <tr>
                            <th style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textAlign: "left", paddingBottom: 8, width: 90 }}>Type / Day</th>
                            {DAYS.map(d => (
                              <th key={d} style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textAlign: "center", width: 50, paddingBottom: 8 }}>{d}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(CONTENT_META).map(([ct, meta]) => (
                            <tr key={ct}>
                              <td style={{ fontSize: 11, fontWeight: 700, color: meta.color, paddingRight: 8 }}>
                                <i className={`bi ${meta.icon}`} style={{ marginRight: 5 }} />{meta.label}
                              </td>
                              {DAYS.map(day => {
                                const on = (brand.weeklySchedule || []).some(s => s.day === day && s.contentType === ct);
                                return (
                                  <td key={day} style={{ textAlign: "center" }}>
                                    <div className="sched-dot" style={{
                                      background: on ? meta.color : "transparent",
                                      borderColor: on ? meta.color : "#E5E7EB",
                                      color: on ? "#fff" : "#E5E7EB",
                                    }}>
                                      {on && <i className={`bi ${meta.icon}`} style={{ fontSize: 10 }} />}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── SETTINGS TAB ── */}
              {tab === "settings" && (
                <div style={{ maxWidth: 620 }}>
                  {/* GSC Card */}
                  <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", overflow: "hidden", marginBottom: 20 }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="bi bi-graph-up-arrow" style={{ color: "#16A34A", fontSize: 16 }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B" }}>Google Search Console</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>Connect to show SEO data in the client portal</div>
                      </div>
                    </div>
                    <div style={{ padding: "20px" }}>
                      {brand.gsc?.email ? (
                        /* ── Connected state ── */
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 14px", background: "#F0FDF4", borderRadius: 10, border: "1.5px solid #BBF7D0" }}>
                            <i className="bi bi-check-circle-fill" style={{ color: "#16A34A", fontSize: 16 }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>Connected</div>
                              <div style={{ fontSize: 11, color: "#166534" }}>{brand.gsc.email}</div>
                            </div>
                            <button onClick={disconnectGsc} disabled={gscDisconnecting}
                              style={{ marginLeft: "auto", background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <i className="bi bi-x-circle" /> {gscDisconnecting ? "…" : "Disconnect"}
                            </button>
                          </div>

                          {/* Site picker */}
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                              GSC Property (website URL)
                            </div>
                            {brand.gsc?.siteUrl && (
                              <div style={{ fontSize: 12, color: "#15803D", fontWeight: 600, marginBottom: 8 }}>
                                <i className="bi bi-check2-circle me-1" />Current: {brand.gsc.siteUrl}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <select value={gscSelectedSite} onChange={e => setGscSelectedSite(e.target.value)}
                                style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 12, outline: "none", background: "#fff" }}>
                                <option value="">— Select a property —</option>
                                {gscSites.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={loadGscSites} disabled={gscSitesLoading}
                                style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                <i className={`bi ${gscSitesLoading ? "bi-arrow-repeat" : "bi-arrow-clockwise"}`} />
                                {gscSitesLoading ? "Loading…" : "Load sites"}
                              </button>
                              <button onClick={saveGscSite} disabled={gscSaving || !gscSelectedSite}
                                style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: !gscSelectedSite ? 0.5 : 1 }}>
                                <i className="bi bi-check2" /> {gscSaving ? "Saving…" : "Save"}
                              </button>
                            </div>
                            {gscSites.length === 0 && !gscSitesLoading && (
                              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>
                                Click "Load sites" to list available GSC properties from the connected account.
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        /* ── Not connected state ── */
                        <div style={{ textAlign: "center", padding: "16px 0" }}>
                          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20, lineHeight: 1.6 }}>
                            Connect a Google account that has access to this brand's Google Search Console property.
                            The client will then see live SEO data (clicks, impressions, keywords, pages) in their portal.
                          </div>
                          <a href={`/api/admin/brands/${id}/gsc/connect`}
                            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "10px 20px", fontWeight: 700, fontSize: 13, color: "#1E293B", textDecoration: "none", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
                            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                            Connect Google Account
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* siteUrl manual override */}
                  <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #F1F5F9", padding: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Manual Site URL Override</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 10 }}>
                      If the site picker is empty, enter the exact GSC property URL manually (e.g. <code>https://example.com/</code> or <code>sc-domain:example.com</code>).
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={gscSelectedSite} onChange={e => setGscSelectedSite(e.target.value)}
                        placeholder="https://tourwatchout.com/"
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none" }} />
                      <button onClick={saveGscSite} disabled={gscSaving || !gscSelectedSite}
                        style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !gscSelectedSite ? 0.5 : 1 }}>
                        {gscSaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ALL TASKS TAB ── */}
              {tab === "tasks" && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", overflow: "hidden" }}>
                  {tasks.length === 0 ? (
                    <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                      <i className="bi bi-inbox" style={{ fontSize: 44 }} />
                      <div style={{ marginTop: 14, fontWeight: 700, color: "#1E293B" }}>No tasks for this brand yet</div>
                    </div>
                  ) : (
                    tasks.map(t => {
                      const sm    = STATUS_META[t.status] || {};
                      const stage = STAGE_META[t.stage];
                      const ct    = CONTENT_META[t.contentType];
                      return (
                        <div key={t._id} className="bd-task-row" onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                          {stage && <div style={{ width: 4, height: 32, borderRadius: 2, background: stage.color, flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 2 }}>{t.nomenclature || t.title}</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {stage && <span className="bd-badge" style={{ background: stage.bg, color: stage.color, fontSize: 10 }}>{stage.label}</span>}
                              {ct    && <span className="bd-badge" style={{ background: ct.color + "18", color: ct.color, fontSize: 10 }}><i className={`bi ${ct.icon}`} style={{ fontSize: 9 }} /> {ct.label}</span>}
                            </div>
                          </div>
                          <span className="bd-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                          <span style={{ fontSize: 11, color: "#94A3B8" }}>{fmtDate(t.dueDate)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
