// pages/dashboard/admin/smm-reports.js
import Head from "next/head";
import React, { useEffect, useState, useCallback } from "react";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";

/* ─── constants ─────────────────────────────────────────────── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CT_META = {
  reel:     { label:"Reels",    icon:"bi-camera-video-fill",  color:"#F59E0B", bg:"#FFFBEB", border:"#FDE68A" },
  post:     { label:"Posts",    icon:"bi-image-fill",         color:"#6366F1", bg:"#EEF2FF", border:"#C7D2FE" },
  carousel: { label:"Carousels",icon:"bi-images",             color:"#10B981", bg:"#ECFDF5", border:"#6EE7B7" },
  story:    { label:"Stories",  icon:"bi-phone-fill",         color:"#EC4899", bg:"#FDF2F8", border:"#FBCFE8" },
};

const STAGE_META = {
  S1:{ label:"S1 · Script",  color:"#F59E0B", bg:"#FEF3C7", icon:"bi-pencil-square"    },
  S2:{ label:"S2 · Shoot",   color:"#6366F1", bg:"#EEF2FF", icon:"bi-camera-fill"       },
  S3:{ label:"S3 · Edit",    color:"#10B981", bg:"#ECFDF5", icon:"bi-scissors"          },
  S4:{ label:"S4 · Live",    color:"#EC4899", bg:"#FDF2F8", icon:"bi-broadcast-pin"     },
};

const STATUS_META = {
  completed:  { label:"Done",        color:"#15803D", bg:"#DCFCE7" },
  in_progress:{ label:"In Progress", color:"#1D4ED8", bg:"#DBEAFE" },
  review:     { label:"Review",      color:"#B45309", bg:"#FEF3C7" },
  blocked:    { label:"Blocked",     color:"#DC2626", bg:"#FEE2E2" },
  todo:       { label:"To Do",       color:"#64748B", bg:"#F1F5F9" },
};

function pct(v, t) { return t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0; }

function ProgressBar({ value, max, color }) {
  const p = pct(value, max);
  return (
    <div style={{ height:8, borderRadius:8, background:"#F1F5F9", overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${p}%`, borderRadius:8,
        background:`linear-gradient(90deg,${color},${color}cc)`,
        transition:"width .5s ease" }} />
    </div>
  );
}

function Badge({ label, color, bg }) {
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
      background:bg, color, display:"inline-flex", alignItems:"center" }}>
      {label}
    </span>
  );
}

/* ─── Stage pill row inside each task card ───────────────────── */
function StagePills({ stages }) {
  const keys = ["S1","S2","S3","S4"];
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
      {keys.map((key, i) => {
        const stg  = stages?.[i];
        const meta = STAGE_META[key];
        if (!stg) return null;
        const isDone     = stg.done;
        const isApproved = stg.approved;
        const isRejected = stg.rejected;
        const names = stg.assigneeNames || [];

        let statusDot = "#94A3B8";
        if (isApproved) statusDot = "#22C55E";
        else if (isRejected) statusDot = "#EF4444";
        else if (isDone) statusDot = "#FBBF24";

        return (
          <div key={key} style={{ display:"flex", alignItems:"flex-start", gap:6, padding:"6px 10px",
            borderRadius:10, background: meta.bg, border:`1.5px solid ${meta.color}30`, minWidth:90 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:statusDot, flexShrink:0, marginTop:3 }} />
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:meta.color, letterSpacing:.4 }}>{key}</div>
              {names.length > 0
                ? names.map((n,j) => <div key={j} style={{ fontSize:10, color:"#374151", fontWeight:600 }}>{n}</div>)
                : <div style={{ fontSize:10, color:"#9CA3AF" }}>Unassigned</div>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function SmmReports() {
  const now = new Date();
  const [brands,        setBrands]        = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [month,         setMonth]         = useState(now.getMonth() + 1);
  const [year,          setYear]          = useState(now.getFullYear());
  const [report,        setReport]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [ctFilter,      setCtFilter]      = useState("all");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [stageFilter,   setStageFilter]   = useState("all");
  const [search,        setSearch]        = useState("");
  const [expandedTask,  setExpandedTask]  = useState(null);
  const [view,          setView]          = useState("grid"); // "grid" | "list"

  /* ── fetch brand list ── */
  useEffect(() => {
    setBrandsLoading(true);
    fetch("/api/admin/smm/report", { credentials:"include" })
      .then(r => r.json())
      .then(d => { if (d.success) setBrands(d.brands || []); })
      .catch(()=>{})
      .finally(() => setBrandsLoading(false));
  }, []);

  /* ── fetch report ── */
  const fetchReport = useCallback(async (bid, m, y) => {
    if (!bid) return;
    setLoading(true);
    setReport(null);
    try {
      const res  = await fetch(`/api/admin/smm/report?brandId=${bid}&month=${m}&year=${y}`, { credentials:"include" });
      const data = await res.json();
      if (data.success) setReport(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedBrand) fetchReport(selectedBrand._id, month, year);
  }, [selectedBrand, month, year, fetchReport]);

  /* ── derived task list (filters applied) ── */
  const allTasks  = report?.tasks || [];
  const filtered  = allTasks.filter(t => {
    if (ctFilter     !== "all" && t.contentType !== ctFilter)  return false;
    if (statusFilter !== "all" && t.status !== statusFilter)   return false;
    if (stageFilter  !== "all" && t.stage !== stageFilter)     return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(t.nomenclature || "").toLowerCase().includes(q) &&
          !(t.title || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const YEARS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>SMM Reports — Viralon Admin</title>
        <style>{`
          .smm-card { background:#fff; border-radius:16px; border:1px solid #F1F5F9; box-shadow:0 1px 8px rgba(0,0,0,.05); }
          .smm-btn  { border:none; cursor:pointer; border-radius:10px; padding:8px 16px;
                      font-size:12px; font-weight:700; transition:all .15s; display:inline-flex; align-items:center; gap:6px; }
          .smm-btn:disabled { opacity:.5; cursor:default; }
          .smm-input { padding:8px 12px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; transition:border .15s; }
          .smm-input:focus { border-color:#6366F1; }
          .smm-brand-card { border-radius:16px; border:2px solid transparent; cursor:pointer; transition:all .18s; padding:16px; }
          .smm-brand-card:hover { transform:translateY(-2px); box-shadow:0 6px 24px rgba(0,0,0,.1); }
          .smm-task-row { border-radius:14px; border:1.5px solid #F1F5F9; background:#fff; padding:14px 18px; transition:all .12s; }
          .smm-task-row:hover { border-color:#C7D2FE; box-shadow:0 2px 12px rgba(99,102,241,.08); }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="container-fluid" style={{ padding:"24px 20px" }}>

              {/* ── Page Header ── */}
              <div style={{ marginBottom:24 }}>
                <h4 style={{ margin:0, fontWeight:800, fontSize:22, color:"#111827" }}>
                  SMM Reports
                </h4>
                <p style={{ margin:"4px 0 0", fontSize:14, color:"#6B7280" }}>
                  Monthly deliverable tracking · brand-wise production pipeline
                </p>
              </div>

              {/* ── Brand Selector Grid ── */}
              {!selectedBrand && (
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <span style={{ fontWeight:700, fontSize:14, color:"#374151" }}>
                      {brandsLoading ? "Loading brands…" : `${brands.length} Brand${brands.length !== 1 ? "s" : ""} · Select one to view report`}
                    </span>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <select className="smm-input" value={month} onChange={e=>setMonth(+e.target.value)} style={{ width:130 }}>
                        {MONTHS.map((mo,i) => <option key={i} value={i+1}>{mo}</option>)}
                      </select>
                      <select className="smm-input" value={year} onChange={e=>setYear(+e.target.value)} style={{ width:90 }}>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  {brandsLoading ? (
                    <div style={{ textAlign:"center", padding:"60px 0" }}>
                      <div className="spinner-border text-primary" />
                    </div>
                  ) : brands.length === 0 ? (
                    <div className="smm-card" style={{ textAlign:"center", padding:"60px 20px", color:"#9CA3AF" }}>
                      <i className="bi bi-megaphone" style={{ fontSize:44, color:"#D1D5DB" }} />
                      <p style={{ marginTop:12, fontWeight:600, color:"#374151" }}>No SMM brands found</p>
                      <p style={{ fontSize:13 }}>Add brands with "Social Media" service from the Brands section.</p>
                    </div>
                  ) : (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
                      {brands.map(b => {
                        const total = (b.monthlyDeliverables?.reels || 0) +
                                      (b.monthlyDeliverables?.posts || 0) +
                                      (b.monthlyDeliverables?.carousels || 0) +
                                      (b.monthlyDeliverables?.stories || 0);
                        return (
                          <div key={b._id} className="smm-brand-card"
                            style={{ background:`${b.color}11`, borderColor:`${b.color}40` }}
                            onClick={() => setSelectedBrand(b)}>
                            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                              {b.logo ? (
                                <div style={{ width:44, height:44, borderRadius:12, background:"#fff",
                                  border:`1.5px solid ${b.color}30`, flexShrink:0,
                                  overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
                                  boxShadow:"0 1px 4px rgba(0,0,0,.08)", padding:4 }}>
                                  <img src={b.logo} alt={b.name}
                                    style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                                </div>
                              ) : (
                                <div style={{ width:44, height:44, borderRadius:12, background:b.color,
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  fontWeight:800, fontSize:17, color:"#fff", flexShrink:0 }}>
                                  {b.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight:800, fontSize:14, color:"#111827" }}>{b.name}</div>
                                <div style={{ fontSize:11, color:"#6B7280" }}>{total > 0 ? `${total} deliverables/mo` : "No targets set"}</div>
                              </div>
                            </div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              {Object.entries(CT_META).map(([ct, m]) => {
                                const val = b.monthlyDeliverables?.[ct === "reel" ? "reels" : ct === "post" ? "posts" : ct === "carousel" ? "carousels" : "stories"] || 0;
                                if (!val) return null;
                                return (
                                  <span key={ct} style={{ fontSize:10, fontWeight:700, padding:"2px 8px",
                                    borderRadius:20, background:m.bg, color:m.color }}>
                                    <i className={`bi ${m.icon}`} style={{ marginRight:3, fontSize:9 }} />
                                    {val} {m.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Report View ── */}
              {selectedBrand && (
                <div>
                  {/* ── Back + Brand header ── */}
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, flexWrap:"wrap" }}>
                    <button className="smm-btn"
                      style={{ background:"#F3F4F6", color:"#374151" }}
                      onClick={() => { setSelectedBrand(null); setReport(null); }}>
                      <i className="bi bi-arrow-left" /> All Brands
                    </button>

                    <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
                      {selectedBrand.logo ? (
                        <div style={{ width:40, height:40, borderRadius:10, background:"#fff",
                          border:`1.5px solid ${selectedBrand.color}40`, flexShrink:0,
                          overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
                          boxShadow:"0 1px 4px rgba(0,0,0,.08)", padding:3 }}>
                          <img src={selectedBrand.logo} alt={selectedBrand.name}
                            style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                        </div>
                      ) : (
                        <div style={{ width:40, height:40, borderRadius:10, background:selectedBrand.color,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontWeight:800, fontSize:15, color:"#fff", flexShrink:0 }}>
                          {selectedBrand.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span style={{ fontWeight:800, fontSize:18, color:"#111827" }}>{selectedBrand.name}</span>
                        <span style={{ fontSize:12, color:"#6B7280", marginLeft:10 }}>SMM Report</span>
                      </div>
                    </div>

                    {/* Month / Year picker */}
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <i className="bi bi-calendar3" style={{ color:"#9CA3AF", fontSize:14 }} />
                      <select className="smm-input" value={month} onChange={e=>setMonth(+e.target.value)} style={{ width:130 }}>
                        {MONTHS.map((mo,i) => <option key={i} value={i+1}>{mo}</option>)}
                      </select>
                      <select className="smm-input" value={year} onChange={e=>setYear(+e.target.value)} style={{ width:90 }}>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div style={{ textAlign:"center", padding:"80px 0" }}>
                      <div className="spinner-border text-primary" style={{ width:"2rem", height:"2rem" }} />
                      <p style={{ marginTop:12, color:"#6B7280" }}>Loading report…</p>
                    </div>
                  ) : !report ? null : (
                    <>
                      {/* ── Summary Cards ── */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
                        {[
                          { label:"Total Target",   value: report.summary.totalTarget,    icon:"bi-bullseye",          color:"#6366F1", bg:"#EEF2FF", border:"#C7D2FE" },
                          { label:"Tasks Created",  value: report.summary.totalCreated,   icon:"bi-plus-circle-fill",  color:"#0891B2", bg:"#ECFEFF", border:"#A5F3FC" },
                          { label:"Completed",      value: report.summary.totalCompleted, icon:"bi-check-circle-fill", color:"#15803D", bg:"#DCFCE7", border:"#BBF7D0" },
                          { label:"Pending",        value: report.summary.totalPending,   icon:"bi-hourglass-split",   color:"#B45309", bg:"#FEF3C7", border:"#FDE68A" },
                        ].map(s => (
                          <div key={s.label} style={{ padding:"16px 18px", borderRadius:14, background:s.bg,
                            border:`1.5px solid ${s.border}`, display:"flex", alignItems:"center", gap:12 }}>
                            <div style={{ width:42, height:42, borderRadius:11, background:"#fff",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              boxShadow:"0 1px 4px rgba(0,0,0,.08)", flexShrink:0 }}>
                              <i className={`bi ${s.icon}`} style={{ fontSize:19, color:s.color }} />
                            </div>
                            <div>
                              <div style={{ fontSize:24, fontWeight:900, color:"#111827", lineHeight:1.1 }}>{s.value}</div>
                              <div style={{ fontSize:11, color:"#6B7280", fontWeight:600, marginTop:2 }}>{s.label}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ── Deliverables Progress (content type cards) ── */}
                      <div className="smm-card" style={{ padding:"20px 24px", marginBottom:20 }}>
                        <div style={{ fontWeight:800, fontSize:15, color:"#111827", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
                          <i className="bi bi-bar-chart-fill" style={{ color:"#6366F1" }} />
                          Monthly Deliverables — {MONTHS[month-1]} {year}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
                          {Object.entries(CT_META).map(([ct, meta]) => {
                            const d = report.deliverables?.[ct] || {};
                            const { target=0, created=0, completed=0, inProgress=0, review=0, blocked=0, todo=0, pending=0 } = d;
                            if (target === 0 && created === 0) return null;
                            return (
                              <div key={ct} style={{ padding:"16px", borderRadius:14, background:meta.bg,
                                border:`1.5px solid ${meta.border}` }}>
                                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                    <i className={`bi ${meta.icon}`} style={{ fontSize:18, color:meta.color }} />
                                    <span style={{ fontWeight:800, fontSize:14, color:"#111827" }}>{meta.label}</span>
                                  </div>
                                  <span style={{ fontWeight:900, fontSize:20, color:meta.color }}>{created}/{target}</span>
                                </div>

                                <ProgressBar value={completed} max={target} color={meta.color} />
                                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, marginBottom:12 }}>
                                  <span style={{ fontSize:10, color:"#6B7280" }}>{pct(completed, target)}% completed</span>
                                  <span style={{ fontSize:10, color: pending > 0 ? "#B45309" : "#15803D", fontWeight:700 }}>
                                    {pending > 0 ? `${pending} pending` : "Target met ✓"}
                                  </span>
                                </div>

                                {/* Status breakdown chips */}
                                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                                  {[
                                    { label:"Done",     val:completed,  color:"#15803D", bg:"#DCFCE7" },
                                    { label:"Active",   val:inProgress, color:"#1D4ED8", bg:"#DBEAFE" },
                                    { label:"Review",   val:review,     color:"#B45309", bg:"#FEF3C7" },
                                    { label:"Blocked",  val:blocked,    color:"#DC2626", bg:"#FEE2E2" },
                                    { label:"To Do",    val:todo,       color:"#64748B", bg:"#F1F5F9" },
                                  ].filter(x => x.val > 0).map(x => (
                                    <span key={x.label} style={{ fontSize:10, fontWeight:700, padding:"2px 7px",
                                      borderRadius:20, background:x.bg, color:x.color }}>
                                      {x.val} {x.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Stage Pipeline ── */}
                      <div className="smm-card" style={{ padding:"20px 24px", marginBottom:20 }}>
                        <div style={{ fontWeight:800, fontSize:15, color:"#111827", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
                          <i className="bi bi-diagram-3-fill" style={{ color:"#6366F1" }} />
                          Stage Pipeline
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
                          {Object.entries(STAGE_META).map(([key, meta]) => {
                            const s = report.stageStats?.[key] || {};
                            const { total=0, done=0, approved=0, rejected=0, assignees=[] } = s;
                            const pending = total - done;
                            return (
                              <div key={key} style={{ padding:"16px", borderRadius:14,
                                background:meta.bg, border:`1.5px solid ${meta.color}30` }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                                  <i className={`bi ${meta.icon}`} style={{ color:meta.color, fontSize:16 }} />
                                  <span style={{ fontWeight:800, color:meta.color, fontSize:13 }}>{meta.label}</span>
                                </div>

                                <div style={{ display:"flex", gap:12, marginBottom:10 }}>
                                  <div style={{ textAlign:"center" }}>
                                    <div style={{ fontSize:22, fontWeight:900, color:"#111827" }}>{total}</div>
                                    <div style={{ fontSize:10, color:"#6B7280" }}>Tasks</div>
                                  </div>
                                  <div style={{ textAlign:"center" }}>
                                    <div style={{ fontSize:22, fontWeight:900, color:"#15803D" }}>{approved}</div>
                                    <div style={{ fontSize:10, color:"#6B7280" }}>Approved</div>
                                  </div>
                                  <div style={{ textAlign:"center" }}>
                                    <div style={{ fontSize:22, fontWeight:900, color:"#B45309" }}>{pending}</div>
                                    <div style={{ fontSize:10, color:"#6B7280" }}>Pending</div>
                                  </div>
                                </div>

                                <ProgressBar value={done} max={total} color={meta.color} />
                                <div style={{ fontSize:10, color:"#6B7280", marginTop:4, marginBottom:8 }}>
                                  {pct(done, total)}% submitted
                                </div>

                                {/* Assignees */}
                                {assignees.length > 0 && (
                                  <div style={{ borderTop:`1px solid ${meta.color}20`, paddingTop:8 }}>
                                    <div style={{ fontSize:10, fontWeight:700, color:"#374151", marginBottom:5 }}>ASSIGNED TO</div>
                                    {assignees.map((a, i) => (
                                      <div key={i} style={{ display:"flex", justifyContent:"space-between",
                                        fontSize:11, color:"#374151", fontWeight:600, marginBottom:3 }}>
                                        <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                                          <span style={{ width:6, height:6, borderRadius:"50%", background:meta.color, display:"inline-block" }} />
                                          {a.name}
                                        </span>
                                        <span style={{ background:meta.bg, color:meta.color, padding:"1px 6px",
                                          borderRadius:10, fontSize:10, fontWeight:700 }}>{a.count}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Task List with Filters ── */}
                      <div className="smm-card" style={{ padding:"20px 24px" }}>
                        {/* Filters row */}
                        <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center", marginBottom:16 }}>
                          <div style={{ fontWeight:800, fontSize:15, color:"#111827", flex:"1 0 auto" }}>
                            <i className="bi bi-list-task" style={{ color:"#6366F1", marginRight:8 }} />
                            Task List
                            <span style={{ fontSize:12, fontWeight:600, color:"#6B7280", marginLeft:8 }}>
                              {filtered.length} of {allTasks.length}
                            </span>
                          </div>

                          {/* Search */}
                          <div style={{ position:"relative" }}>
                            <i className="bi bi-search" style={{ position:"absolute", left:10, top:"50%",
                              transform:"translateY(-50%)", color:"#9CA3AF", fontSize:12 }} />
                            <input className="smm-input" value={search} onChange={e=>setSearch(e.target.value)}
                              placeholder="Search task/nomenclature…"
                              style={{ paddingLeft:30, width:220, fontSize:12 }} />
                          </div>

                          {/* Content type filter */}
                          <select className="smm-input" value={ctFilter} onChange={e=>setCtFilter(e.target.value)}
                            style={{ fontSize:12 }}>
                            <option value="all">All Types</option>
                            {Object.entries(CT_META).map(([ct,m]) => (
                              <option key={ct} value={ct}>{m.label}</option>
                            ))}
                          </select>

                          {/* Status filter */}
                          <select className="smm-input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
                            style={{ fontSize:12 }}>
                            <option value="all">All Status</option>
                            {Object.entries(STATUS_META).map(([s,m]) => (
                              <option key={s} value={s}>{m.label}</option>
                            ))}
                          </select>

                          {/* Stage filter */}
                          <select className="smm-input" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}
                            style={{ fontSize:12 }}>
                            <option value="all">All Stages</option>
                            {Object.entries(STAGE_META).map(([key,m]) => (
                              <option key={key} value={key}>{m.label}</option>
                            ))}
                          </select>

                          {/* Reset */}
                          {(ctFilter !== "all" || statusFilter !== "all" || stageFilter !== "all" || search) && (
                            <button className="smm-btn"
                              style={{ background:"#FEE2E2", color:"#DC2626" }}
                              onClick={() => { setCtFilter("all"); setStatusFilter("all"); setStageFilter("all"); setSearch(""); }}>
                              <i className="bi bi-x-circle" /> Reset
                            </button>
                          )}
                        </div>

                        {/* Tasks grouped by content type */}
                        {filtered.length === 0 ? (
                          <div style={{ textAlign:"center", padding:"40px 0", color:"#9CA3AF" }}>
                            <i className="bi bi-inbox" style={{ fontSize:40, color:"#D1D5DB" }} />
                            <p style={{ marginTop:10, fontWeight:600, color:"#374151" }}>No tasks match your filters</p>
                          </div>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            {/* Group by content type */}
                            {Object.entries(CT_META).map(([ct, meta]) => {
                              const ctTasks = filtered.filter(t => t.contentType === ct);
                              if (ctTasks.length === 0) return null;
                              const d = report.deliverables?.[ct] || {};
                              return (
                                <div key={ct} style={{ marginBottom:8 }}>
                                  {/* Content type header */}
                                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                                    background:meta.bg, borderRadius:10, marginBottom:8,
                                    border:`1px solid ${meta.border}` }}>
                                    <i className={`bi ${meta.icon}`} style={{ color:meta.color, fontSize:15 }} />
                                    <span style={{ fontWeight:800, color:meta.color, fontSize:13 }}>{meta.label}</span>
                                    <span style={{ fontSize:12, color:"#6B7280", fontWeight:600 }}>
                                      {ctTasks.length} tasks
                                    </span>
                                    <div style={{ marginLeft:"auto", display:"flex", gap:12, alignItems:"center" }}>
                                      <span style={{ fontSize:11, color:"#374151", fontWeight:700 }}>
                                        Target: {d.target || 0}
                                      </span>
                                      <span style={{ fontSize:11, color:"#15803D", fontWeight:700 }}>
                                        Done: {d.completed || 0}
                                      </span>
                                      <span style={{ fontSize:11, color:"#B45309", fontWeight:700 }}>
                                        Pending: {d.pending || 0}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Task rows */}
                                  {ctTasks.map(task => {
                                    const sm = STATUS_META[task.status] || STATUS_META.todo;
                                    const stm = STAGE_META[task.stage];
                                    const isExpanded = expandedTask === task._id;
                                    return (
                                      <div key={task._id} className="smm-task-row"
                                        style={{ marginBottom:6, cursor:"pointer" }}
                                        onClick={() => setExpandedTask(isExpanded ? null : task._id)}>

                                        {/* Task header row */}
                                        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                                          {/* Nomenclature */}
                                          {task.nomenclature && (
                                            <span style={{ fontWeight:800, fontSize:11, color:"#6366F1",
                                              background:"#EEF2FF", padding:"2px 8px", borderRadius:6, flexShrink:0 }}>
                                              {task.nomenclature}
                                            </span>
                                          )}

                                          {/* Title */}
                                          <span style={{ fontWeight:700, fontSize:13, color:"#111827", flex:1, minWidth:160 }}>
                                            {task.title}
                                          </span>

                                          {/* Status badge */}
                                          <Badge label={sm.label} color={sm.color} bg={sm.bg} />

                                          {/* Current stage badge */}
                                          {stm && (
                                            <Badge label={task.stage} color={stm.color} bg={stm.bg} />
                                          )}

                                          {/* Due date */}
                                          {(task.dueDate || task.scheduledFor) && (
                                            <span style={{ fontSize:11, color:"#6B7280", flexShrink:0 }}>
                                              <i className="bi bi-calendar3" style={{ marginRight:4 }} />
                                              {new Date(task.dueDate || task.scheduledFor)
                                                .toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                                            </span>
                                          )}

                                          {/* Expand chevron */}
                                          <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`}
                                            style={{ fontSize:12, color:"#9CA3AF", flexShrink:0 }} />
                                        </div>

                                        {/* Expanded: stage pills */}
                                        {isExpanded && (
                                          <div style={{ marginTop:4 }}>
                                            <StagePills stages={task.stages} />
                                            {task.description && (
                                              <div style={{ marginTop:8, fontSize:12, color:"#6B7280",
                                                lineHeight:1.5, borderTop:"1px solid #F1F5F9", paddingTop:8 }}>
                                                {task.description}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}

                            {/* Tasks with unknown content type */}
                            {(() => {
                              const otherTasks = filtered.filter(t => !CT_META[t.contentType]);
                              if (otherTasks.length === 0) return null;
                              return (
                                <div>
                                  <div style={{ fontSize:11, fontWeight:700, color:"#6B7280",
                                    textTransform:"uppercase", letterSpacing:.5, marginBottom:8, padding:"0 4px" }}>
                                    Other / Untagged ({otherTasks.length})
                                  </div>
                                  {otherTasks.map(task => {
                                    const sm = STATUS_META[task.status] || STATUS_META.todo;
                                    return (
                                      <div key={task._id} className="smm-task-row" style={{ marginBottom:6 }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                                          <span style={{ fontWeight:700, fontSize:13, color:"#111827", flex:1 }}>{task.title}</span>
                                          <Badge label={sm.label} color={sm.color} bg={sm.bg} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </>
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

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  const hasAdminAuth = cookie.includes("admin_auth=true");
  const hasAdminUser = cookie.includes("admin_user_token=");
  if (!hasAdminAuth && !hasAdminUser) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
