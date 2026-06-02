import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const CONTENT_META = {
  reel:     { label: "Reel",     icon: "bi-camera-video-fill", color: "#F59E0B" },
  post:     { label: "Post",     icon: "bi-image-fill",        color: "#6366F1" },
  carousel: { label: "Carousel", icon: "bi-images",            color: "#10B981" },
  story:    { label: "Story",    icon: "bi-phone-fill",        color: "#EC4899" },
};

const STAGE_COLORS = { S1: "#F59E0B", S2: "#6366F1", S3: "#10B981", S4: "#EC4899" };
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function ContentCalendarPage() {
  const router = useRouter();
  const today = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth());
  const [tasks,  setTasks]  = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandFilter, setBrandFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null); // { day, tasks[] }

  /* ── Fetch brands ── */
  useEffect(() => {
    fetch("/api/admin/brands", { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setBrands(d.brands || []); }).catch(() => {});
  }, []);

  /* ── Fetch tasks for the month (all production tasks across all departments) ── */
  useEffect(() => {
    setLoading(true);
    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    // Fetch production tasks from all departments; no taskType filter so stage-based tasks also appear
    const q = new URLSearchParams({ limit: 500, dateStart: start, dateEnd: end });
    if (brandFilter) q.set("brandId", brandFilter);

    fetch(`/api/admin/tasks?${q}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // Show tasks where S1 is approved OR task is completed (covers both new and old approval flows)
          const approved = (d.tasks || []).filter(t =>
            (t.taskType === "production" || t.contentType) &&
            ((t.stages || []).some(s => s.approved) || t.status === "completed")
          );
          setTasks(approved);
        }
      })
      .catch(() => toast.error("Failed to load calendar"))
      .finally(() => setLoading(false));
  }, [year, month, brandFilter]);

  /* ── Helpers ── */
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  /* ── Group tasks by day: scheduledFor → dueDate → stage deadline → doneAt → submittedAt → updatedAt → createdAt ── */
  const tasksByDay = {};
  for (const t of tasks) {
    let d = t.scheduledFor ? new Date(t.scheduledFor)
          : t.dueDate      ? new Date(t.dueDate)
          : null;
    if (!d && t.stages?.length) {
      const deadlines = t.stages.map(s => s.deadline).filter(Boolean).map(x => new Date(x));
      if (deadlines.length) d = deadlines.reduce((a, b) => a < b ? a : b);
    }
    if (!d && t.stages?.length) {
      const doneDates = t.stages.map(s => s.doneAt).filter(Boolean).map(x => new Date(x));
      if (doneDates.length) d = doneDates[0];
    }
    if (!d && t.submittedAt) d = new Date(t.submittedAt);
    if (!d && t.updatedAt)   d = new Date(t.updatedAt);
    if (!d && t.createdAt)   d = new Date(t.createdAt);
    if (!d) continue;
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    if (!tasksByDay[day]) tasksByDay[day] = [];
    tasksByDay[day].push(t);
  }

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDay     = getFirstDayOfMonth(year, month);
  const totalCells   = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Content Calendar — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
          .cal-cell { border-radius:12px; border:1.5px solid #F1F5F9; background:#fff; min-height:100px; padding:8px; transition:box-shadow .12s; }
          .cal-cell:hover { box-shadow:0 4px 16px rgba(99,102,241,.1); }
          .cal-cell.today { border-color:#6366F1; background:#F5F3FF; }
          .cal-cell.other-month { background:#FAFAFA; border-color:#F1F5F9; }
          .cal-day-num { font-size:12px; font-weight:700; color:#374151; margin-bottom:6px; }
          .cal-day-num.today { color:#6366F1; }
          .cal-event { border-radius:6px; padding:2px 6px; margin-bottom:3px; font-size:10px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; }
          .cal-event:hover { opacity:.85; }
          .cal-more { font-size:10px; color:#6366F1; font-weight:700; cursor:pointer; }
          .cal-hdr { font-size:11px; fontWeight:700; color:#64748B; text-align:center; padding:6px 0; }
          .cal-btn { border:none; cursor:pointer; border-radius:9px; padding:6px 12px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:5px; background:#F1F5F9; color:#475569; transition:all .14s; }
          .cal-btn:hover { background:#E2E8F0; }
          .cal-legend { display:flex; gap:10px; flexWrap:wrap; }
          .cal-leg-dot { display:inline-flex; align-items:center; gap:4px; font-size:11px; fontWeight:600; }
          .day-panel { position:fixed; right:0; top:0; bottom:0; width:340px; background:#fff; border-left:1.5px solid #F1F5F9; z-index:200; box-shadow:-8px 0 40px rgba(0,0,0,.08); overflow-y:auto; }
          .panel-task { background:#F8FAFC; border-radius:10px; padding:12px 14px; margin-bottom:10px; cursor:pointer; border:1.5px solid #F1F5F9; transition:border-color .12s; }
          .panel-task:hover { border-color:#6366F1; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home" style={selectedDay ? { marginRight: 340 } : {}}>
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/admin/tasks"><img src="/icons/home.svg" alt="" /> Task Management</Link>
                </li>
                <li className="breadcrumb-item active">Content Calendar</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* Header */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20 }}>
                <div className="mb-3" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <button className="cal-btn" onClick={prevMonth}><i className="bi bi-chevron-left" /></button>
                  <div>
                    <h5 className="admin-main-heading" style={{ margin: 0 }}>{MONTHS_FULL[month]} {year}</h5>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{tasks.length} approved content task{tasks.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button className="cal-btn" onClick={nextMonth}><i className="bi bi-chevron-right" /></button>
                  <button className="cal-btn" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>
                    Today
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ padding: "6px 10px", borderRadius: 9, border: "1.5px solid #E5E7EB", fontSize: 12, outline: "none", background: "#fff" }}
                    value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                    <option value="">All Brands</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Legend */}
              <div className="cal-legend" style={{ marginBottom: 16 }}>
                {Object.entries(CONTENT_META).map(([k, v]) => (
                  <span key={k} className="cal-leg-dot">
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: v.color, display: "inline-block" }} />
                    {v.label}
                  </span>
                ))}
                <span className="cal-leg-dot" style={{ marginLeft: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, border: "2px solid #6366F1", display: "inline-block" }} />
                  Today
                </span>
              </div>

              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : (
                <>
                  {/* Day headers */}
                  <div className="cal-grid" style={{ marginBottom: 4 }}>
                    {DAY_LABELS.map(d => (
                      <div key={d} className="cal-hdr">{d}</div>
                    ))}
                  </div>

                  {/* Calendar cells */}
                  <div className="cal-grid">
                    {Array.from({ length: totalCells }, (_, i) => {
                      const dayNum = i - firstDay + 1;
                      const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                      const isToday = isValid && year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate();
                      const dayTasks = isValid ? (tasksByDay[dayNum] || []) : [];
                      const preview = dayTasks.slice(0, 3);
                      const extra   = dayTasks.length - preview.length;

                      return (
                        <div
                          key={i}
                          className={`cal-cell ${isToday ? "today" : ""} ${!isValid ? "other-month" : ""}`}
                          style={{ cursor: isValid && dayTasks.length > 0 ? "pointer" : "default" }}
                          onClick={() => isValid && dayTasks.length > 0 && setSelectedDay({ day: dayNum, tasks: dayTasks })}
                        >
                          {isValid && (
                            <>
                              <div className={`cal-day-num ${isToday ? "today" : ""}`}>{dayNum}</div>
                              {preview.map(t => {
                                const ct    = CONTENT_META[t.contentType];
                                const brand = t.brandId;
                                const color = brand?.color || ct?.color || "#6366F1";
                                const stageColor = STAGE_COLORS[t.stage] || color;
                                return (
                                  <div key={t._id} className="cal-event"
                                    style={{ background: stageColor + "20", color: stageColor, borderLeft: `3px solid ${stageColor}` }}
                                    title={`${t.nomenclature || t.title}${brand ? ` · ${brand.name}` : ""}`}>
                                    {ct && <i className={`bi ${ct.icon}`} style={{ marginRight: 3, fontSize: 9 }} />}
                                    {t.nomenclature || t.title}
                                  </div>
                                );
                              })}
                              {extra > 0 && (
                                <div className="cal-more">+{extra} more</div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

            </div>
          </section>
        </div>
      </div>

      {/* ── Day detail panel ── */}
      {selectedDay && (
        <div className="day-panel">
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B" }}>
                {selectedDay.day} {MONTHS_FULL[month]}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>
                {selectedDay.tasks.length} task{selectedDay.tasks.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button onClick={() => setSelectedDay(null)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14 }}>
              <i className="bi bi-x" />
            </button>
          </div>

          <div style={{ padding: 16 }}>
            {selectedDay.tasks.map(t => {
              const ct    = CONTENT_META[t.contentType];
              const brand = t.brandId;
              const stage = t.stage;
              const stageColor = STAGE_COLORS[stage] || "#94A3B8";
              return (
                <div key={t._id} className="panel-task" onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    {brand && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: (brand.color || "#6366F1") + "20", color: brand.color || "#6366F1" }}>
                        {brand.name}
                      </span>
                    )}
                    {ct && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: ct.color + "18", color: ct.color }}>
                        <i className={`bi ${ct.icon}`} style={{ marginRight: 3 }} />{ct.label}
                      </span>
                    )}
                    {stage && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: stageColor + "20", color: stageColor }}>
                        {stage}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>
                    {t.nomenclature || t.title}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 6, background: "#F8FAFC", borderRadius: 6, padding: "6px 8px", lineHeight: 1.5, maxHeight: 60, overflowY: "auto" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Script</span>
                      {t.description.slice(0, 120)}{t.description.length > 120 ? "…" : ""}
                    </div>
                  )}
                  {t.pillar && (
                    <div style={{ fontSize: 10, color: "#6366F1", marginTop: 4, fontWeight: 600 }}>
                      <i className="bi bi-tag me-1" />{t.pillar}
                    </div>
                  )}
                  {t.tags?.length > 0 && (
                    <div style={{ fontSize: 10, color: "#6366F1", marginTop: 4, lineHeight: 1.6 }}>
                      {t.tags.slice(0, 5).map(tg => `#${tg}`).join(" ")}{t.tags.length > 5 ? " …" : ""}
                    </div>
                  )}
                  {t.stages?.[0]?.assignedTo?.length > 0 && (
                    <div style={{ fontSize: 10, color: "#64748B", marginTop: 3 }}>
                      <i className="bi bi-person me-1" />Content Team · {t.stages[0].done ? "Script Done" : "Writing…"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
