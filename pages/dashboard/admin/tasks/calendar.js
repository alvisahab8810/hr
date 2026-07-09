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

// S1=orange, S2=blue, S3=yellow, S4=green  (matches list & weekly tracker)
const STAGE_FILL = { S1: "#F97316", S2: "#3B82F6", S3: "#EAB308", S4: "#22C55E" };
const STAGE_IDX  = { S1: 0, S2: 1, S3: 2, S4: 3 };

function getTaskStageStyle(task) {
  const stages = task.stages || [];
  const hasAssignee = s => Array.isArray(s?.assignedTo) ? s.assignedTo.length > 0 : !!s?.assignedTo;
  // Highest approved stage → solid fill (matches weekly tracker)
  for (const key of ["S4","S3","S2","S1"]) {
    const s = stages[STAGE_IDX[key]];
    if (s?.approved) {
      const c = STAGE_FILL[key];
      return { bg: c, border: c, color: "#fff", key };
    }
  }
  // Highest assigned (not approved) → white bg, colored border
  for (const key of ["S4","S3","S2","S1"]) {
    const s = stages[STAGE_IDX[key]];
    if (hasAssignee(s) && !s?.approved) {
      const c = STAGE_FILL[key];
      return { bg: "#fff", border: c, color: "#1E293B", key };
    }
  }
  return { bg: "#F1F5F9", border: "#D1D5DB", color: "#9CA3AF", key: null };
}
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
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const smBrands = (d.brands || []).filter(
            b => (b.services || []).includes("socialMedia") && (b.weeklySchedule || []).length > 0
          );
          setBrands(smBrands);
          // Auto-select Viralon or first brand — never "All"
          setBrandFilter(prev => {
            if (prev && smBrands.find(b => String(b._id) === prev)) return prev;
            const viralon = smBrands.find(b => /viralon/i.test(b.name));
            return String(viralon?._id || smBrands[0]?._id || "");
          });
        }
      })
      .catch(() => {});
  }, []);

  /* ── Fetch tasks for the month (all production tasks across all departments) ── */
  useEffect(() => {
    setLoading(true);
    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    // Fetch production tasks from all departments; no taskType filter so stage-based tasks also appear
    const q = new URLSearchParams({ limit: 500, dateStart: start, dateEnd: end });
    if (brandFilter) q.set("brandId", brandFilter);

    const CAL_MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const mAbbr  = CAL_MONTHS[month];
    const yShort = String(year).slice(2);
    const monthRx = new RegExp(`${mAbbr}'${yShort}`, "i");

    fetch(`/api/admin/tasks?${q}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const filtered = (d.tasks || []).filter(t => {
            if (!(t.taskType === "production" || t.contentType)) return false;
            // Use nomenclature as the definitive month marker to prevent
            // stage-deadline bleed (June tasks with July S3/S4 deadlines
            // were filling July calendar slots before this fix).
            if (t.nomenclature) return monthRx.test(t.nomenclature);
            // Fallback for tasks without nomenclature: check dueDate month
            if (t.dueDate) {
              const dd = new Date(t.dueDate);
              return dd.getMonth() === month && dd.getFullYear() === year;
            }
            return false;
          });
          setTasks(filtered);
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

  /* ── Group tasks by day using brand schedule (monthSlotIndex) ── */
  function calMonthSlotIndex(dayNum, contentType, weeklySchedule) {
    const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const target = new Date(year, month, dayNum);
    const start  = new Date(year, month, 1);
    let count = 0;
    const cur = new Date(start);
    while (cur <= target) {
      const lbl = DAY_NAMES[cur.getDay()];
      count += weeklySchedule.filter(s => s.day === lbl && s.contentType === contentType).length;
      cur.setDate(cur.getDate() + 1);
    }
    return count - 1;
  }

  const tasksByDay = (() => {
    const result = {};
    const daysInMonth = getDaysInMonth(year, month);

    // Build brand task groups (sorted by taskId)
    const taskGroups = {};
    tasks.forEach(t => {
      if (!t.brandId) return;
      const bId = typeof t.brandId === "object" ? String(t.brandId._id || t.brandId) : String(t.brandId);
      if (!taskGroups[bId]) taskGroups[bId] = {};
      const ct = t.contentType || "__unknown";
      if (!taskGroups[bId][ct]) taskGroups[bId][ct] = [];
      taskGroups[bId][ct].push(t);
    });
    Object.values(taskGroups).forEach(byType =>
      Object.values(byType).forEach(arr => arr.sort((a, b) => (a.taskId || "").localeCompare(b.taskId || "")))
    );

    // Walk each day of the month, assign tasks via schedule slot index
    const CAL_MONTH_DLVR_KEY = { reel: "reels", post: "posts", carousel: "carousels", story: "stories" };
    const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    brands.forEach(brand => {
      const bId = String(brand._id);
      if (!taskGroups[bId]) return;
      const schedule = brand.weeklySchedule || [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dayLabel = DAY_NAMES[new Date(year, month, day).getDay()];
        schedule.filter(s => s.day === dayLabel).forEach(slot => {
          const ct = slot.contentType;
          const ctTasks = taskGroups[bId]?.[ct];
          if (!ctTasks || !ctTasks.length) return;
          const idx = calMonthSlotIndex(day, ct, schedule);
          if (idx < 0 || idx >= ctTasks.length) return;
          // Respect monthly deliverable cap
          const dlvrKey = CAL_MONTH_DLVR_KEY[ct];
          if (dlvrKey) {
            const limit = brand.monthlyDeliverables?.[dlvrKey];
            if (limit != null && idx >= limit) return;
          }
          if (!result[day]) result[day] = [];
          result[day].push(ctTasks[idx]);
        });
      }
    });
    return result;
  })();

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
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{tasks.length} content task{tasks.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button className="cal-btn" onClick={nextMonth}><i className="bi bi-chevron-right" /></button>
                  <button className="cal-btn" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>
                    Today
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ padding: "6px 10px", borderRadius: 9, border: "1.5px solid #E5E7EB", fontSize: 12, fontWeight: 600, outline: "none", background: "#fff" }}
                    value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Legend */}
              <div className="cal-legend" style={{ marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                {[
                  { label: "S1 Assigned", bg: "#fff",     border: "#F97316" },
                  { label: "S1 Approved", bg: "#F97316",  border: "#F97316" },
                  { label: "S2 Assigned", bg: "#fff",     border: "#3B82F6" },
                  { label: "S2 Approved", bg: "#3B82F6",  border: "#3B82F6" },
                  { label: "S3 Assigned", bg: "#fff",     border: "#EAB308" },
                  { label: "S3 Approved", bg: "#EAB308",  border: "#EAB308" },
                  { label: "S4 Assigned", bg: "#fff",     border: "#22C55E" },
                  { label: "S4 Approved", bg: "#22C55E",  border: "#22C55E" },
                ].map(l => (
                  <span key={l.label} className="cal-leg-dot">
                    <span style={{ width: 18, height: 12, borderRadius: 3, background: l.bg, border: `1.5px solid ${l.border}`, display: "inline-block" }} />
                    {l.label}
                  </span>
                ))}
                <span className="cal-leg-dot" style={{ marginLeft: 6 }}>
                  <span style={{ width: 18, height: 12, borderRadius: 3, background: "#F1F5F9", border: "1.5px solid #D1D5DB", display: "inline-block" }} />
                  No stage yet
                </span>
                <span className="cal-leg-dot" style={{ marginLeft: 6 }}>
                  <span style={{ width: 18, height: 12, borderRadius: 3, background: "#F8FAFC", border: "1px dashed #D1D5DB", display: "inline-block" }} />
                  Scheduled (plan)
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
                  {(() => {
                    // Pre-compute planned slots for the filtered brand (if any)
                    const CAL_DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                    const filteredBrand = brandFilter
                      ? brands.find(b => String(b._id) === brandFilter)
                      : null;

                    return (
                      <div className="cal-grid">
                        {Array.from({ length: totalCells }, (_, i) => {
                          const dayNum  = i - firstDay + 1;
                          const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                          const isToday = isValid && year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate();
                          const dayTasks = isValid ? (tasksByDay[dayNum] || []) : [];

                          // Planned slots for the filtered brand on this day,
                          // capped by the brand's monthly deliverable for each content type.
                          const CAL_DLVR_KEY = { reel: "reels", post: "posts", carousel: "carousels", story: "stories" };
                          const CAL_MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                          const calMonthLabel = `${CAL_MONTHS[month]}'${String(year).slice(2)}`;
                          let unfilledSlots = [];
                          if (isValid && filteredBrand) {
                            const dayLabel = CAL_DAY_NAMES[new Date(year, month, dayNum).getDay()];
                            const scheduled = (filteredBrand.weeklySchedule || []).filter(s => s.day === dayLabel);
                            const rem = {};
                            dayTasks.forEach(t => { rem[t.contentType] = (rem[t.contentType] || 0) + 1; });
                            unfilledSlots = scheduled.reduce((acc, slot) => {
                              const ct = slot.contentType;
                              const slotIdx = calMonthSlotIndex(dayNum, ct, filteredBrand.weeklySchedule || []);
                              const dlvrKey = CAL_DLVR_KEY[ct];
                              if (dlvrKey) {
                                const limit = filteredBrand.monthlyDeliverables?.[dlvrKey];
                                if (limit != null && slotIdx >= limit) return acc;
                              }
                              if ((rem[ct] || 0) > 0) { rem[ct]--; return acc; }
                              acc.push({ ...slot, slotIdx });
                              return acc;
                            }, []);
                          }

                          const allItems = dayTasks.length + unfilledSlots.length;
                          const preview  = dayTasks.slice(0, 3);
                          const extra    = dayTasks.length - preview.length;
                          // Show up to (3 - tasks shown) planned slots
                          const slotsToShow = unfilledSlots.slice(0, Math.max(0, 3 - preview.length));
                          const extraSlots  = unfilledSlots.length - slotsToShow.length;

                          return (
                            <div
                              key={i}
                              className={`cal-cell ${isToday ? "today" : ""} ${!isValid ? "other-month" : ""}`}
                              style={{ cursor: isValid && allItems > 0 ? "pointer" : "default" }}
                              onClick={() => isValid && dayTasks.length > 0 && setSelectedDay({ day: dayNum, tasks: dayTasks })}
                            >
                              {isValid && (
                                <>
                                  <div className={`cal-day-num ${isToday ? "today" : ""}`}>{dayNum}</div>

                                  {/* Actual tasks — pipeline stage colors */}
                                  {preview.map(t => {
                                    const ct  = CONTENT_META[t.contentType] || {};
                                    const sty = getTaskStageStyle(t);
                                    const nom = t.nomenclature || t.title || "";
                                    const ctLower = (t.contentType || "").toLowerCase();
                                    let suffix = nom.toLowerCase().startsWith(ctLower) ? nom.slice(ctLower.length).trim() : nom;
                                    suffix = suffix.replace(/\b[a-z]/g, c => c.toUpperCase());
                                    const label = suffix ? `${ct.label || t.contentType} ${suffix}` : (ct.label || t.contentType || nom);
                                    return (
                                      <div key={t._id} className="cal-event"
                                        style={{ background: sty.bg, color: sty.color, border: `1.5px solid ${sty.border}`, display: "flex", alignItems: "center", gap: 4 }}
                                        title={`${nom}${t.brandId ? ` · ${t.brandId.name}` : ""}`}>
                                        {ct.icon && <i className={`bi ${ct.icon}`} style={{ fontSize: 9, flexShrink: 0 }} />}
                                        {label}
                                      </div>
                                    );
                                  })}
                                  {extra > 0 && <div className="cal-more">+{extra} more</div>}

                                  {/* Planned slots — gray dashed (no task yet) */}
                                  {slotsToShow.map((slot, si) => {
                                    const ct = CONTENT_META[slot.contentType] || {};
                                    const slotLabel = `${ct.label || slot.contentType} ${slot.slotIdx + 1} ${calMonthLabel}`;
                                    return (
                                      <div key={`slot-${si}`} className="cal-event"
                                        style={{ background: "#F8FAFC", color: "#94A3B8", border: "1px dashed #D1D5DB", display: "flex", alignItems: "center", gap: 4 }}>
                                        {ct.icon && <i className={`bi ${ct.icon}`} style={{ fontSize: 9, flexShrink: 0 }} />}
                                        {slotLabel}
                                      </div>
                                    );
                                  })}
                                  {extraSlots > 0 && <div className="cal-more">+{extraSlots} more</div>}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
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
              const ct    = CONTENT_META[t.contentType] || {};
              const brand = t.brandId;
              const sty   = getTaskStageStyle(t);

              // Format title: "post1 jun'26" → "Post 1 Jun'26"
              const nom     = t.nomenclature || t.title || "";
              const ctLower = (t.contentType || "").toLowerCase();
              let suffix    = nom.toLowerCase().startsWith(ctLower) ? nom.slice(ctLower.length).trim() : nom;
              suffix        = suffix.replace(/\b[a-z]/g, c => c.toUpperCase());
              const displayTitle = suffix ? `${ct.label || t.contentType} ${suffix}` : nom;

              // Filter out system/content-type tags
              const SYSTEM_TAGS = ["production","reel","post","carousel","story","seo","ads","branding","general"];
              const displayTags = (t.tags || []).filter(tg => !SYSTEM_TAGS.includes(tg.toLowerCase()));

              // Stage dots
              const STAGE_KEYS_P = ["S1","S2","S3","S4"];
              const STAGE_NAMES_P = ["Script","Shoot","Edit","Posted"];

              return (
                <div key={t._id} className="panel-task"
                  style={{ borderLeft: `4px solid ${sty.border}`, cursor: "pointer" }}
                  onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>

                  {/* Brand + Content type badges */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
                    {brand && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: (brand.color || "#6366F1") + "18", color: brand.color || "#6366F1" }}>
                        {brand.name}
                      </span>
                    )}
                    {ct.label && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ct.color + "18", color: ct.color }}>
                        <i className={`bi ${ct.icon}`} style={{ marginRight: 3 }} />{ct.label}
                      </span>
                    )}
                  </div>

                  {/* Formatted title */}
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 8 }}>
                    {displayTitle}
                  </div>

                  {/* Pipeline stage dots */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                    {STAGE_KEYS_P.map((key, i) => {
                      const stg = t.stages?.[i] || {};
                      const c   = STAGE_FILL[key];
                      const approved  = !!stg.approved;
                      const rejected  = !!stg.rejected;
                      const pending   = stg.done && !approved && !rejected;
                      const hasAssign = Array.isArray(stg.assignedTo) ? stg.assignedTo.length > 0 : !!stg.assignedTo;
                      const bg    = rejected ? "#DC2626" : approved ? c : pending ? "#fff" : hasAssign ? "#fff" : "#F1F5F9";
                      const bdr   = rejected ? "#DC2626" : (approved || pending || hasAssign) ? c : "#E5E7EB";
                      const col   = rejected ? "#fff"    : approved ? "#fff" : pending ? c : hasAssign ? c : "#CBD5E1";
                      const icon  = rejected ? "✗" : approved ? "✓" : pending ? "⏳" : i + 1;
                      return (
                        <div key={key} title={STAGE_NAMES_P[i]}
                          style={{ width: 26, height: 26, borderRadius: 7, border: `2px solid ${bdr}`, background: bg, color: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>
                          {icon}
                        </div>
                      );
                    })}
                  </div>

                  {/* Description */}
                  {t.description && (
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, background: "#F8FAFC", borderRadius: 8, padding: "7px 10px", lineHeight: 1.6 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>Description</div>
                      {t.description}
                    </div>
                  )}

                  {/* Pillar / keyword */}
                  {t.pillar && (
                    <div style={{ fontSize: 10, color: "#8B5CF6", marginBottom: 4, fontWeight: 600 }}>
                      <i className="bi bi-tag-fill me-1" />{t.pillar}
                    </div>
                  )}

                  {/* Hashtags (system tags filtered out) */}
                  {displayTags.length > 0 && (
                    <div style={{ fontSize: 10, color: "#6366F1", lineHeight: 1.8, marginBottom: 4, wordBreak: "break-word" }}>
                      {displayTags.slice(0, 8).map(tg => `#${tg}`).join(" ")}
                      {displayTags.length > 8 ? " …" : ""}
                    </div>
                  )}

                  {/* View task link */}
                  <div style={{ fontSize: 10, color: "#6366F1", fontWeight: 700, marginTop: 6, display: "flex", alignItems: "center", gap: 3 }}>
                    <i className="bi bi-box-arrow-up-right" style={{ fontSize: 9 }} />View task
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
