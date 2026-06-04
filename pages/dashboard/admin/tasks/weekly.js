import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
// Maps content type key to monthlyDeliverables field name
const DELIVERABLE_KEY = { reel: "reels", post: "posts", carousel: "carousels", story: "stories" };

const CONTENT_META = {
  reel:     { label: "Reel",     icon: "bi-camera-video-fill", color: "#F59E0B" },
  post:     { label: "Post",     icon: "bi-image-fill",        color: "#6366F1" },
  carousel: { label: "Carousel", icon: "bi-images",            color: "#10B981" },
  story:    { label: "Story",    icon: "bi-phone-fill",        color: "#EC4899" },
};

const STATUS_META = {
  todo:        { label: "To Do",       color: "#64748B", bg: "#F1F5F9", dot: "#94A3B8" },
  in_progress: { label: "In Progress", color: "#1D4ED8", bg: "#DBEAFE", dot: "#3B82F6" },
  review:      { label: "Review",      color: "#B45309", bg: "#FEF3C7", dot: "#F59E0B" },
  completed:   { label: "Done",        color: "#15803D", bg: "#DCFCE7", dot: "#10B981" },
  blocked:     { label: "Blocked",     color: "#DC2626", bg: "#FEE2E2", dot: "#EF4444" },
};

function getWeekDates(weekOffset = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
  return DAYS.map((d, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return { label: d, date };
  });
}

function fmtShort(date) {
  return `${date.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][date.getMonth()]}`;
}

// S1=orange, S2=blue, S3=yellow, S4=green
const STAGE_FILL  = ["#F97316", "#3B82F6", "#EAB308", "#22C55E"];

function getTaskStageStyle(task) {
  const stages = task.stages || [];
  const hasAssignee = (s) => Array.isArray(s?.assignedTo) ? s.assignedTo.length > 0 : !!s?.assignedTo;

  // Highest approved stage → filled color
  for (let i = 3; i >= 0; i--) {
    if (stages[i]?.approved) {
      return { bg: STAGE_FILL[i], border: STAGE_FILL[i], color: "#fff" };
    }
  }
  // Highest assigned (not approved) stage → border only
  for (let i = 3; i >= 0; i--) {
    if (hasAssignee(stages[i]) && !stages[i]?.approved) {
      return { bg: "#fff", border: STAGE_FILL[i], color: "#000" };
    }
  }
  // Default gray
  return { bg: "#F1F5F9", border: "#D1D5DB", color: "#9CA3AF" };
}

export default function WeeklyTrackerPage() {
  const router = useRouter();
  const [brands,       setBrands]       = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [brandFilter,  setBrandFilter]  = useState("");

  const weekDates = getWeekDates(weekOffset);
  const weekStart = weekDates[0].date;
  const weekEnd   = weekDates[6].date;

  /* ── Fetch brands — only Social Media brands with a weekly schedule ── */
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
            if (prev && smBrands.find(b => b._id === prev)) return prev;
            const viralon = smBrands.find(b => /viralon/i.test(b.name));
            return viralon?._id || smBrands[0]?._id || "";
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── Fetch all production tasks for the month(s) the visible week touches ── */
  useEffect(() => {
    // Expand to full month(s) so week-2/3/4 tasks are available when navigating
    const firstDay = weekDates[0].date;
    const lastDay  = weekDates[6].date;
    const monthStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1);
    // If the week crosses a month boundary (e.g. Jun 30 – Jul 6) include both months
    const monthEnd = new Date(lastDay.getFullYear(), lastDay.getMonth() + 1, 0, 23, 59, 59, 999);

    fetch(
      `/api/admin/tasks?taskType=production&dateStart=${monthStart.toISOString()}&dateEnd=${monthEnd.toISOString()}&limit=500`,
      { credentials: "include" }
    )
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks || []); })
      .catch(() => {});
  }, [weekOffset]);

  const getScheduledContent = (brand, dayLabel) =>
    (brand.weeklySchedule || []).filter(s => s.day === dayLabel);

  // For a given date + contentType, count how many times that contentType was
  // scheduled in the brand's weeklySchedule from the 1st of that month up to
  // and including that date.  The result (0-based) is the task-list index that
  // belongs on this day.
  //
  // Example – Episoul, Reel schedule: Wed + Sat
  //   Wed Jun 3  → 1 slot counted (Jun 3 itself) → index 0 → OR001
  //   Sat Jun 6  → 2 slots counted (Jun 3, Jun 6) → index 1 → OR002
  //   Wed Jun 10 → 3 slots counted                → index 2 → OR003
  function monthSlotIndex(date, contentType, weeklySchedule) {
    const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    let count = 0;
    const cur = new Date(monthStart);
    while (cur <= date) {
      const label = DAY_NAMES[cur.getDay()];
      count += weeklySchedule.filter(s => s.day === label && s.contentType === contentType).length;
      cur.setDate(cur.getDate() + 1);
    }
    return count - 1; // 0-based
  }

  // Place tasks in the correct day column using the brand schedule as the
  // authoritative posting calendar — deadline dates are irrelevant here.
  const tasksByBrandDay = (() => {
    const result = {};

    // Group tasks by brandId → contentType → monthKey (YYYY-M)
    // This prevents June tasks from bleeding into July columns when a week spans two months.
    const taskGroups = {};
    tasks.forEach(t => {
      if (!t.brandId) return;
      const bId = typeof t.brandId === "object" ? String(t.brandId._id || t.brandId) : String(t.brandId);
      const ct  = t.contentType || "__unknown";
      const d   = t.dueDate      ? new Date(t.dueDate)
                : t.scheduledFor ? new Date(t.scheduledFor)
                : t.createdAt    ? new Date(t.createdAt)
                : null;
      if (!d) return;
      const mk = `${d.getFullYear()}-${d.getMonth()}`; // month key
      if (!taskGroups[bId])       taskGroups[bId] = {};
      if (!taskGroups[bId][ct])   taskGroups[bId][ct] = {};
      if (!taskGroups[bId][ct][mk]) taskGroups[bId][ct][mk] = [];
      taskGroups[bId][ct][mk].push(t);
    });
    // Sort each month group by taskId (CO001 < CO002 < …)
    Object.values(taskGroups).forEach(byType =>
      Object.values(byType).forEach(byMonth =>
        Object.values(byMonth).forEach(arr =>
          arr.sort((a, b) => (a.taskId || "").localeCompare(b.taskId || ""))
        )
      )
    );

    // Walk through every day of the current week and assign tasks to schedule slots
    brands.forEach(brand => {
      const bId = String(brand._id);
      if (!taskGroups[bId]) return;
      const schedule = brand.weeklySchedule || [];

      weekDates.forEach(({ label, date }) => {
        const mk = `${date.getFullYear()}-${date.getMonth()}`; // month of this column
        const slotsToday = schedule.filter(s => s.day === label);
        slotsToday.forEach(slot => {
          const ct = slot.contentType;
          const ctTasks = taskGroups[bId]?.[ct]?.[mk]; // only this month's tasks
          if (!ctTasks || ctTasks.length === 0) return;

          const idx = monthSlotIndex(date, ct, schedule);
          if (idx < 0 || idx >= ctTasks.length) return;

          // Respect monthly deliverable cap — hide tasks beyond the limit
          const dlvrKey = DELIVERABLE_KEY[ct];
          if (dlvrKey) {
            const limit = brand.monthlyDeliverables?.[dlvrKey];
            if (limit != null && idx >= limit) return;
          }

          const task    = ctTasks[idx];
          const dateKey = date.toDateString();
          if (!result[bId]) result[bId] = {};
          if (!result[bId][dateKey]) result[bId][dateKey] = [];
          result[bId][dateKey].push(task);
        });
      });
    });

    return result;
  })();

  const displayBrands = brandFilter
    ? brands.filter(b => b._id === brandFilter)
    : brands;

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Weekly Tracker — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .wt-table { width:100%; border-collapse:collapse; }
          .wt-table th { padding:10px 8px; font-size:11px; font-weight:700; color:#64748B; border-bottom:2px solid #F1F5F9; background:#FAFAFA; text-align:center; }
          .wt-table th.brand-col { text-align:left; width:160px; }
          .wt-table td { padding:8px; border-bottom:1px solid #F8FAFC; vertical-align:top; }
          .wt-table tr:hover td { background:#FAFBFF; }
          .wt-cell { min-height:56px; }
          .wt-slot { border-radius:8px; padding:4px 7px; margin-bottom:4px; font-size:10px; font-weight:700; display:flex; align-items:center; gap:4px; }
          .wt-task { border-radius:8px; padding:4px 7px; margin-bottom:4px; font-size:10px; font-weight:600; cursor:pointer; transition:opacity .12s; border:1px solid; display:flex; align-items:center; gap:5px; }
          .wt-task:hover { opacity:.8; }
          .wt-btn { border:none; cursor:pointer; border-radius:9px; padding:6px 12px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:5px; background:#F1F5F9; color:#475569; }
          .wt-btn:hover { background:#E2E8F0; }
          .wt-select { padding:6px 10px; border-radius:9px; border:1.5px solid #E5E7EB; font-size:12px; outline:none; background:#fff; cursor:pointer; }
          .today-col { background:#F5F3FF !important; }
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
                <li className="breadcrumb-item active">Weekly Tracker</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* Header */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button className="wt-btn" onClick={() => setWeekOffset(w => w - 1)}>
                    <i className="bi bi-chevron-left" />
                  </button>
                  <div>
                    <h5 className="admin-main-heading" style={{ margin: 0 }}>Weekly Tracker</h5>
                    <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                      {fmtShort(weekStart)} – {fmtShort(weekEnd)}
                      {weekOffset === 0 && <span style={{ color: "#6366F1", fontWeight: 700, marginLeft: 6 }}>· This Week</span>}
                    </p>
                  </div>
                  <button className="wt-btn" onClick={() => setWeekOffset(w => w + 1)}>
                    <i className="bi bi-chevron-right" />
                  </button>
                  {weekOffset !== 0 && (
                    <button className="wt-btn" onClick={() => setWeekOffset(0)}>Today</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="wt-select" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { label: "S1 Assigned",  bg: "#fff",     border: "#F97316", color: "#000" },
                  { label: "S1 Approved",  bg: "#F97316",  border: "#F97316", color: "#fff" },
                  { label: "S2 Assigned",  bg: "#fff",     border: "#3B82F6", color: "#000" },
                  { label: "S2 Approved",  bg: "#3B82F6",  border: "#3B82F6", color: "#fff" },
                  { label: "S3 Assigned",  bg: "#fff",     border: "#EAB308", color: "#000" },
                  { label: "S3 Approved",  bg: "#EAB308",  border: "#EAB308", color: "#fff" },
                  { label: "S4 Assigned",  bg: "#fff",     border: "#22C55E", color: "#000" },
                  { label: "S4 Approved",  bg: "#22C55E",  border: "#22C55E", color: "#fff" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, color: "#64748B" }}>
                    <span style={{ width: 20, height: 14, borderRadius: 3, background: l.bg, border: `1.5px solid ${l.border}`, display: "inline-block" }} />
                    {l.label}
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, color: "#64748B" }}>
                  <span style={{ width: 20, height: 14, borderRadius: 3, background: "#F8FAFC", border: "1.5px dashed #D1D5DB", display: "inline-block" }} />
                  Scheduled (plan)
                </div>
              </div>

              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : displayBrands.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <i className="bi bi-bookmark-x" style={{ fontSize: 44 }} />
                  <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: "#1E293B" }}>No brands configured</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    <Link href="/dashboard/admin/tasks/brands" style={{ color: "#6366F1" }}>Add brands</Link> with weekly schedules to see the tracker
                  </div>
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", overflow: "auto" }}>
                  <table className="wt-table">
                    <thead>
                      <tr>
                        <th className="brand-col">Brand</th>
                        {weekDates.map(({ label, date }) => {
                          const isToday = date.toDateString() === new Date().toDateString();
                          return (
                            <th key={label} style={{ color: isToday ? "#6366F1" : "#64748B" }}>
                              <div>{label}</div>
                              <div style={{ fontSize: 10, fontWeight: 400 }}>{fmtShort(date)}</div>
                              {isToday && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1", margin: "2px auto 0" }} />}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {displayBrands.map(brand => (
                        <tr key={brand._id}>
                          {/* Brand column */}
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 8, height: 32, borderRadius: 4, background: brand.color || "#6366F1", flexShrink: 0 }} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#1E293B" }}>{brand.name}</div>
                                <div style={{ fontSize: 10, color: "#1E293B" }}>
                                  {(brand.weeklySchedule || []).length} post/wk
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Day columns */}
                          {weekDates.map(({ label, date }) => {
                            const isToday   = date.toDateString() === new Date().toDateString();
                            const scheduled = getScheduledContent(brand, label);
                            const bId       = String(brand._id);
                            const dayTasks  = (tasksByBrandDay[bId]?.[date.toDateString()] || []);

                            // Planned slots: not covered by an actual task AND within monthly deliverable limit.
                            const WK_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                            const wkMonthLabel = `${WK_MONTHS[date.getMonth()]}'${String(date.getFullYear()).slice(2)}`;
                            const remainingCounts = {};
                            dayTasks.forEach(t => {
                              remainingCounts[t.contentType] = (remainingCounts[t.contentType] || 0) + 1;
                            });
                            const unfilledSlots = scheduled.reduce((acc, slot) => {
                              const ct = slot.contentType;
                              const slotIdx = monthSlotIndex(date, ct, brand.weeklySchedule || []);
                              const dlvrKey = DELIVERABLE_KEY[ct];
                              if (dlvrKey) {
                                const limit = brand.monthlyDeliverables?.[dlvrKey];
                                if (limit != null && slotIdx >= limit) return acc;
                              }
                              if ((remainingCounts[ct] || 0) > 0) {
                                remainingCounts[ct]--;
                                return acc;
                              }
                              acc.push({ ...slot, slotIdx });
                              return acc;
                            }, []);

                            return (
                              <td key={label} className={isToday ? "today-col" : ""}>
                                <div className="wt-cell">
                                  {/* Actual production tasks — pipeline stage colors */}
                                  {dayTasks.map(t => {
                                    const ct  = CONTENT_META[t.contentType] || {};
                                    const sty = getTaskStageStyle(t);
                                    // Format: "Reel 1 Jun'26" from nomenclature "reel1 jun'26"
                                    const nom = t.nomenclature || t.title || "";
                                    const ctLower = (t.contentType || "").toLowerCase();
                                    let suffix = nom.toLowerCase().startsWith(ctLower)
                                      ? nom.slice(ctLower.length).trim()
                                      : nom;
                                    // Capitalise each word: "1 jun'26" → "1 Jun'26"
                                    suffix = suffix.replace(/\b[a-z]/g, c => c.toUpperCase());
                                    const displayLabel = suffix
                                      ? `${ct.label || t.contentType} ${suffix}`
                                      : (ct.label || t.contentType);
                                    return (
                                      <div key={t._id} className="wt-task"
                                        style={{ background: sty.bg, borderColor: sty.border, color: sty.color }}
                                        onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                        <i className={`bi ${ct.icon || "bi-list-task"}`} style={{ fontSize: 10 }} />
                                        {displayLabel}
                                      </div>
                                    );
                                  })}

                                  {/* Planned slots not yet covered by actual tasks */}
                                  {unfilledSlots.map((slot, si) => {
                                    const ct = CONTENT_META[slot.contentType] || {};
                                    const slotLabel = `${ct.label || slot.contentType} ${slot.slotIdx + 1} ${wkMonthLabel}`;
                                    return (
                                      <div key={si} className="wt-slot"
                                        style={{ background: "#F8FAFC", color: "#94A3B8", border: "1px dashed #D1D5DB" }}>
                                        <i className={`bi ${ct.icon || "bi-dot"}`} style={{ fontSize: 10 }} />
                                        {slotLabel}
                                      </div>
                                    );
                                  })}

                                  {/* Empty */}
                                  {unfilledSlots.length === 0 && dayTasks.length === 0 && (
                                    <div style={{ fontSize: 10, color: "#E5E7EB", textAlign: "center", paddingTop: 6 }}>—</div>
                                  )}
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
          </section>
        </div>
      </div>
    </div>
  );
}
