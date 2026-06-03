import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
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

export default function WeeklyTrackerPage() {
  const router = useRouter();
  const [brands,       setBrands]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [brandFilter,  setBrandFilter]  = useState("");

  const weekDates = getWeekDates(weekOffset);
  const weekStart = weekDates[0].date;
  const weekEnd   = weekDates[6].date;

  /* ── Fetch brands only ── */
  useEffect(() => {
    fetch("/api/admin/brands", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.success) setBrands(d.brands || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getScheduledContent = (brand, dayLabel) =>
    (brand.weeklySchedule || []).filter(s => s.day === dayLabel);

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
          .wt-task { border-radius:8px; padding:4px 7px; margin-bottom:4px; font-size:10px; font-weight:600; cursor:pointer; transition:opacity .12s; border:1px solid; }
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
                    <option value="">All Brands</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#64748B" }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#E5E7EB", display: "inline-block", border: "1.5px dashed #94A3B8" }} />
                  Scheduled (from brand plan)
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
                                <div style={{ fontSize: 10, color: "#94A3B8" }}>
                                  {(brand.weeklySchedule || []).length} post/wk
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Day columns */}
                          {weekDates.map(({ label, date }) => {
                            const isToday   = date.toDateString() === new Date().toDateString();
                            const scheduled = getScheduledContent(brand, label);

                            return (
                              <td key={label} className={isToday ? "today-col" : ""}>
                                <div className="wt-cell">
                                  {/* Scheduled slots (from brand weekly plan) */}
                                  {scheduled.map((slot, si) => {
                                    const ct = CONTENT_META[slot.contentType] || {};
                                    return (
                                      <div key={si} className="wt-slot"
                                        style={{ background: (ct.color || "#94A3B8") + "12", color: ct.color || "#94A3B8", border: `1px dashed ${ct.color || "#94A3B8"}40` }}>
                                        <i className={`bi ${ct.icon || "bi-dot"}`} style={{ fontSize: 10 }} />
                                        {ct.label || slot.contentType}
                                      </div>
                                    );
                                  })}

                                  {/* Empty */}
                                  {scheduled.length === 0 && (
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
