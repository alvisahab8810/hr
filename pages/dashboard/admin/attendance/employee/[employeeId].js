import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getMonthDays(month) {
  const [year, m] = month.split("-");
  const daysInMonth = new Date(year, m, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return days;
}

function formatTime(t) {
  if (!t) return "--";
  return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isFutureDate(dateKey) {
  return dateKey > getTodayDateString();
}

function isSundayKey(dateKey) {
  return new Date(dateKey + "T00:00:00").getDay() === 0;
}

// Local-component date-string (matches utils/payroll/generateSalaryForMonth.js's toDateStr)
function toDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayMeta(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  return {
    dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
    dayFull: d.toLocaleDateString("en-US", { weekday: "long" }),
    dayNum:  d.getDate(),
    month:   d.toLocaleDateString("en-US", { month: "short" }),
  };
}

function resolveStatus(dateKey, rec) {
  if (isFutureDate(dateKey)) {
    return { effective: "future", label: "–", cls: "future" };
  }
  const apiStatus = rec?.status || "";
  if (apiStatus) {
    switch (apiStatus) {
      case "On Time":
      case "Present":      return { effective: "present",  label: apiStatus,       cls: "ontime"  };
      case "Late":         return { effective: "late",     label: "Late",          cls: "late"    };
      case "Half Day":     return { effective: "halfday",  label: "Half Day",      cls: "halfday" };
      case "Week Off":     return { effective: "weekoff",  label: "Week Off",      cls: "weekoff" };
      case "Holiday":      return { effective: "holiday",  label: "Holiday",       cls: "holiday" };
      case "Casual Leave": return { effective: "leave",    label: "Casual Leave",  cls: "leave"   };
      case "Sick Leave":   return { effective: "leave",    label: "Sick Leave",    cls: "leave"   };
      case "Leave":        return { effective: "leave",    label: "Leave",         cls: "leave"   };
      default:             break;
    }
  }
  if (isSundayKey(dateKey)) return { effective: "weekoff", label: "Week Off", cls: "weekoff" };
  return { effective: "absent", label: "Absent", cls: "absent" };
}

function buildSummary(days, monthDays) {
  let present = 0, absent = 0, late = 0, leave = 0, weekoff = 0, halfday = 0;
  monthDays.forEach((dk) => {
    const { effective } = resolveStatus(dk, days?.[dk]);
    if (effective === "future")  return;
    if (effective === "present") present++;
    if (effective === "late")    { present++; late++; }
    if (effective === "absent")  absent++;
    if (effective === "leave")   leave++;
    if (effective === "weekoff") weekoff++;
    if (effective === "halfday") halfday++;
  });
  return { present, absent, late, leave, weekoff, halfday };
}

// ─── CSV export for individual employee ───────────────────────────────────────
function exportEmployeeCSV({ employeeName, designation, type, days, monthDays, statusFilter }) {
  const safe = (val) => {
    const s = String(val ?? "--").trim();
    if (!s || s === "undefined" || s === "null") return "--";
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const fmtTime = (t) => {
    if (!t) return "--";
    try { return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return "--"; }
  };

  const headers = [
    "Date", "Day", "Status", "Check In", "Check Out", "Work Hours", "Lunch", "Late Mark", "Half Day"
  ];

  // Apply same filter as the UI
  const filtered = monthDays.filter((dk) => {
    if (statusFilter === "all") return true;
    const { effective } = resolveStatus(dk, days?.[dk]);
    if (statusFilter === "present") return effective === "present" || effective === "late";
    return effective === statusFilter;
  });

  const rows = filtered
    .filter((dk) => !isFutureDate(dk)) // never export future dates
    .map((dk) => {
      const rec      = days?.[dk];
      const meta     = getDayMeta(dk);
      const resolved = resolveStatus(dk, rec);

      let workHours = "--";
      if (rec?.checkIn && rec?.checkOut) {
        const mins = Math.round((new Date(rec.checkOut) - new Date(rec.checkIn)) / 60000);
        if (mins > 0) workHours = `${Math.floor(mins / 60)}h ${mins % 60}m`;
      }

      const lateMark = resolved.effective === "late" ? "Yes" : "No";
      const halfDay  = resolved.label === "Half Day"  ? "Yes" : "No";
      const lunch    = rec?.lunchStatus === "On Lunch"
        ? `On Lunch (${rec.lunch})`
        : rec?.lunch || "--";

      return [
        safe(dk),
        safe(meta.dayFull),
        safe(resolved.label),
        safe(fmtTime(rec?.checkIn)),
        safe(fmtTime(rec?.checkOut)),
        safe(workHours),
        safe(lunch),
        safe(lateMark),
        safe(halfDay),
      ].join(",");
    });

  const empLabel = employeeName ? `${employeeName} (${designation || ""} · ${type || ""})` : "Employee";

  // Add employee info as first line comment
  const csv = [
    `# ${empLabel}`,
    `# Exported: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
    headers.join(","),
    ...rows,
  ].join("\n");

  const blob     = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url      = URL.createObjectURL(blob);
  const link     = document.createElement("a");
  const safeName = (employeeName || "employee").toLowerCase().replace(/\s+/g, "-");
  link.href      = url;
  link.download  = `attendance_${safeName}_${filtered[0]?.slice(0, 7) || "unknown"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── component ────────────────────────────────────────────────────────────────
export default function EmployeeAttendance() {
  const router = useRouter();
  const { employeeId } = router.query;
  const monthInputRef  = useRef(null);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [exporting,    setExporting]    = useState(false);

  // Dates before the employee's joining date never existed for them —
  // exclude entirely from display, summary counts, and CSV export.
  const joinDateStr = data?.employee?.dateOfJoining ? toDateStr(data.employee.dateOfJoining) : null;
  const allMonthDays = getMonthDays(month);
  const monthDays = joinDateStr ? allMonthDays.filter((dk) => dk >= joinDateStr) : allMonthDays;
  const summary   = data?.days ? buildSummary(data.days, monthDays) : null;

  useEffect(() => {
    if (!employeeId || !month) return;
    fetchAttendance();
  }, [employeeId, month]);

  async function fetchAttendance() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/attendance/employee/monthly?employeeId=${employeeId}&month=${month}`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (json?.success) setData(json);
      else setData(null);
    } catch (err) {
      console.error("Employee attendance error", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!data?.days) return;
    setExporting(true);
    try {
      exportEmployeeCSV({
        employeeName: data.employee?.name,
        designation:  data.employee?.designation,
        type:         data.employee?.type,
        days:         data.days,
        monthDays,
        statusFilter,
      });
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  }

  const filteredDays = monthDays.filter((dk) => {
    if (statusFilter === "all") return true;
    const { effective } = resolveStatus(dk, data?.days?.[dk]);
    if (statusFilter === "present") return effective === "present" || effective === "late";
    return effective === statusFilter;
  });

  const visibleCount = filteredDays.filter((dk) => !isFutureDate(dk)).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .att-table-wrap { border-radius: 12px; overflow: hidden; border: 1px solid #F0F0F0; }
          .att-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
          .att-table thead tr { background: #FAFAFA; border-bottom: 1.5px solid #EFEFEF; }
          .att-table thead th {
            padding: 13px 20px; font-weight: 600; color: #6B7280;
            text-align: center; white-space: nowrap; font-size: 12px;
            text-transform: uppercase; letter-spacing: 0.4px;
          }
          .att-table thead th:first-child { text-align: left; }
          .att-table tbody tr { border-bottom: 1px solid #F5F5F5; transition: background 0.15s; }
          .att-table tbody tr:last-child { border-bottom: none; }
          .att-table tbody tr:hover { background: #F8F9FF !important; }
          .att-table td { padding: 14px 20px; color: #374151; text-align: center; vertical-align: middle; white-space: nowrap; }
          .att-table td:first-child { text-align: left; }
          .row-sunday  td { background: #FFFBEB; }
          .row-today   td { background: #EEF2FF; }
          .row-future     { opacity: 0.4; }
          .row-weekend td { background: #FAFAFA; }
          .status-pill { display: inline-block; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
          .status-pill.ontime  { background: #DCFCE7; color: #15803D; }
          .status-pill.late    { background: #FEF3C7; color: #B45309; }
          .status-pill.absent  { background: #FEE2E2; color: #DC2626; }
          .status-pill.leave   { background: #FEE2E2; color: #DC2626; }
          .status-pill.halfday { background: #F3E8FF; color: #7C3AED; }
          .status-pill.weekoff { background: #FEF9C3; color: #92400E; }
          .status-pill.holiday { background: #DBEAFE; color: #1D4ED8; }
          .status-pill.future  { background: #F3F4F6; color: #D1D5DB; }
          .lunch-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11.5px; font-weight: 600; }
          .lunch-pill.active { background: #FEF3C7; color: #B45309; }
          .lunch-pill.done   { background: #DCFCE7; color: #15803D; }
          .date-box { display: flex; align-items: center; gap: 8px; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 8px 14px; cursor: pointer; position: relative; font-size: 13px; font-weight: 500; color: #374151; background: #fff; transition: border-color 0.2s; }
          .date-box:hover { border-color: #4F46E5; }
          .summary-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 20px; }
          @media (max-width: 1000px) { .summary-strip { grid-template-columns: repeat(4, 1fr); } }
          @media (max-width: 600px)  { .summary-strip { grid-template-columns: repeat(2, 1fr); } }
          .summary-card { background: #fff; border: 1px solid #F0F0F0; border-radius: 12px; padding: 14px 12px; text-align: center; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
          .summary-card:hover { border-color: #4F46E5; box-shadow: 0 2px 10px rgba(79,70,229,0.08); }
          .summary-card.active { border-color: #4F46E5; background: #EEF2FF; }
          .summary-card .s-val { font-size: 22px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
          .summary-card .s-label { font-size: 11px; color: #9CA3AF; font-weight: 500; }
          .filter-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
          .filter-chip { padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1.5px solid #E5E7EB; background: #fff; color: #6B7280; transition: all 0.15s; }
          .filter-chip.active { background: #4F46E5; color: #fff; border-color: #4F46E5; }
          .filter-chip:hover:not(.active) { border-color: #4F46E5; color: #4F46E5; }
          .export-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: #EEF2FF; color: #4F46E5; transition: background 0.2s; }
          .export-btn:hover:not(:disabled) { background: #E0E7FF; }
          .export-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        `}</style>
      </Head>

      <div className="dashboard-container add-employee-area admin-attendance-page">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/admin/attendance">
                    <img src="/icons/attendance.svg" alt="" /> Attendance
                  </Link>
                </li>
                <li className="breadcrumb-item active">Employee Attendance</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="admin-attendance-summary">

                {/* ── Header ── */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:24 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:52, height:52, borderRadius:14, background:"#EEF2FF", color:"#4F46E5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, flexShrink:0 }}>
                      {(data?.employee?.name || "?").split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h5 style={{ fontWeight:700, color:"#111827", margin:0, fontSize:20 }}>
                        {data?.employee?.name || "Employee Attendance"}
                      </h5>
                      <p className="text-muted mb-0" style={{ fontSize:13 }}>
                        {data?.employee?.designation}
                        {data?.employee?.type && (
                          <> · <span style={{ color:"#4F46E5", fontWeight:500 }}>{data.employee.type}</span></>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: month picker + export */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <div className="date-box" onClick={() => monthInputRef.current?.showPicker()}>
                      <input ref={monthInputRef} type="month" value={month}
                        onChange={(e) => { setMonth(e.target.value); setStatusFilter("all"); }}
                        style={{ position:"absolute", opacity:0, pointerEvents:"none" }} />
                      <i className="bi bi-calendar" style={{ color:"#4F46E5" }}></i>
                      <span>{new Date(`${month}-01`).toLocaleDateString("en-US", { month:"long", year:"numeric" })}</span>
                      <i className="bi bi-chevron-down" style={{ fontSize:11, color:"#9CA3AF" }}></i>
                    </div>

                    {/* Export button */}
                    <button
                      className="export-btn"
                      onClick={handleExport}
                      disabled={!data?.days || exporting}
                      title={statusFilter !== "all"
                        ? `Export filtered (${statusFilter}) records`
                        : "Export all attendance for this month"}
                    >
                      {exporting ? (
                        <><div className="spinner-border spinner-border-sm" role="status"></div> Exporting...</>
                      ) : (
                        <>
                          <i className="bi bi-download"></i>
                          Export{statusFilter !== "all" ? ` (${statusFilter})` : ""}
                          {visibleCount > 0 && (
                            <span style={{
                              background:"#4F46E5", color:"#fff",
                              borderRadius:20, padding:"1px 7px",
                              fontSize:10, fontWeight:700, marginLeft:4,
                            }}>
                              {visibleCount}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Summary strip ── */}
                {summary && (
                  <div className="summary-strip">
                    {[
                      { key:"all",     val: monthDays.filter(d => !isFutureDate(d)).length, label:"Total Days", color:"#374151" },
                      { key:"present", val: summary.present,  label:"Present",  color:"#15803D" },
                      { key:"absent",  val: summary.absent,   label:"Absent",   color:"#DC2626" },
                      { key:"late",    val: summary.late,     label:"Late",     color:"#B45309" },
                      { key:"leave",   val: summary.leave,    label:"On Leave", color:"#DC2626" },
                      { key:"weekoff", val: summary.weekoff,  label:"Week Off", color:"#92400E" },
                      { key:"halfday", val: summary.halfday,  label:"Half Day", color:"#7C3AED" },
                    ].map((s) => (
                      <div key={s.key}
                        className={`summary-card ${statusFilter === s.key ? "active" : ""}`}
                        onClick={() => setStatusFilter(s.key)}>
                        <div className="s-val" style={{ color:s.color }}>{s.val}</div>
                        <div className="s-label">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Filter chips ── */}
                <div className="filter-chips">
                  {[
                    { key:"all",     label:"All Days"  },
                    { key:"present", label:"Present"   },
                    { key:"absent",  label:"Absent"    },
                    { key:"late",    label:"Late"       },
                    { key:"leave",   label:"Leave"      },
                    { key:"weekoff", label:"Week Off"   },
                    { key:"halfday", label:"Half Day"   },
                  ].map((f) => (
                    <button key={f.key}
                      className={`filter-chip ${statusFilter === f.key ? "active" : ""}`}
                      onClick={() => setStatusFilter(f.key)}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* ── Table header row ── */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <h5 style={{ fontWeight:700, color:"#111827", margin:0, fontSize:15 }}>Monthly Attendance</h5>
                  <span className="text-muted" style={{ fontSize:12 }}>
                    {visibleCount} days
                    {statusFilter !== "all" && (
                      <span style={{ color:"#4F46E5", fontWeight:600, marginLeft:6 }}>
                        · filtered: {statusFilter}
                      </span>
                    )}
                  </span>
                </div>

                {/* ── Table ── */}
                <div className="att-table-wrap">
                  <table className="att-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign:"left", paddingLeft:20 }}>Date</th>
                        <th>Day</th>
                        <th>Status</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Lunch</th>
                        <th>Work Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign:"center", padding:"36px", color:"#9CA3AF" }}>
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            Loading attendance...
                          </td>
                        </tr>
                      ) : !data?.days ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign:"center", padding:"40px", color:"#9CA3AF" }}>
                            No attendance data found
                          </td>
                        </tr>
                      ) : (
                        filteredDays.map((dateKey) => {
                          const rec      = data.days[dateKey];
                          const meta     = getDayMeta(dateKey);
                          const resolved = resolveStatus(dateKey, rec);
                          const isFut    = isFutureDate(dateKey);
                          const isSun    = meta.dayName === "Sun";
                          const isSat    = meta.dayName === "Sat";
                          const isTod    = dateKey === getTodayDateString();

                          const rowClass = isFut ? "row-future"
                            : isTod ? "row-today"
                            : isSun ? "row-sunday"
                            : isSat ? "row-weekend" : "";

                          let workHours = "--";
                          if (rec?.checkIn && rec?.checkOut) {
                            const mins = Math.round(
                              (new Date(rec.checkOut) - new Date(rec.checkIn)) / 60000
                            );
                            if (mins > 0) workHours = `${Math.floor(mins/60)}h ${mins % 60}m`;
                          }

                          return (
                            <tr key={dateKey} className={rowClass}>
                              <td style={{ paddingLeft:20 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                                  <div style={{
                                    width:38, height:38, borderRadius:10, flexShrink:0,
                                    background: isTod ? "#EEF2FF" : isSun ? "#FFFBEB" : isSat ? "#FFF7ED" : "#F9FAFB",
                                    display:"flex", flexDirection:"column",
                                    alignItems:"center", justifyContent:"center",
                                  }}>
                                    <span style={{
                                      fontSize:14, fontWeight:700, lineHeight:1,
                                      color: isTod ? "#4F46E5" : isSun ? "#EF4444" : isSat ? "#D97706" : "#111827",
                                    }}>
                                      {meta.dayNum}
                                    </span>
                                    <span style={{ fontSize:9, color:"#9CA3AF", lineHeight:1, marginTop:1 }}>
                                      {meta.month}
                                    </span>
                                  </div>
                                  <div>
                                    <div style={{ fontWeight:600, fontSize:13, color:"#111827" }}>{dateKey}</div>
                                    {isTod && (
                                      <div style={{ fontSize:10, color:"#4F46E5", fontWeight:600 }}>Today</div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span style={{
                                  fontWeight:600, fontSize:13,
                                  color: isSun ? "#EF4444" : isSat ? "#D97706" : "#374151",
                                }}>
                                  {meta.dayFull}
                                </span>
                              </td>

                              <td>
                                {isFut ? (
                                  <span style={{ fontSize:13, color:"#D1D5DB" }}>—</span>
                                ) : (
                                  <span className={`status-pill ${resolved.cls}`}>
                                    {resolved.label}
                                  </span>
                                )}
                              </td>

                              <td style={{ fontWeight: isFut ? 400 : 500, color: isFut ? "#D1D5DB" : "#374151" }}>
                                {isFut ? "—" : formatTime(rec?.checkIn)}
                              </td>

                              <td style={{ fontWeight: isFut ? 400 : 500, color: isFut ? "#D1D5DB" : "#374151" }}>
                                {isFut ? "—" : formatTime(rec?.checkOut)}
                              </td>

                              <td>
                                {isFut ? "—" :
                                  rec?.lunchStatus === "On Lunch"
                                    ? <span className="lunch-pill active">{rec.lunch}</span>
                                    : rec?.lunch
                                    ? <span className="lunch-pill done">{rec.lunch}</span>
                                    : "--"
                                }
                              </td>

                              <td style={{ color: isFut ? "#D1D5DB" : "#6B7280", fontWeight:500 }}>
                                {isFut ? "—" : workHours}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Status logic note */}
                <div style={{
                  marginTop:14, padding:"10px 16px", background:"#F9FAFB",
                  borderRadius:8, border:"1px solid #F0F0F0", fontSize:12, color:"#6B7280",
                }}>
                  <strong style={{ color:"#374151" }}>Status logic:</strong>
                  {" "}Sunday with no record = <span style={{ color:"#92400E", fontWeight:600 }}>Week Off</span>
                  {" "}· Sunday with applied leave = <span style={{ color:"#DC2626", fontWeight:600 }}>Leave (deductible)</span>
                  {" "}· Weekday with no record = <span style={{ color:"#DC2626", fontWeight:600 }}>Absent</span>
                  {" "}·{" "}
                  <span style={{ color:"#4F46E5", fontWeight:600, cursor:"pointer" }} onClick={handleExport}>
                    <i className="bi bi-download me-1"></i>
                    Export {statusFilter !== "all" ? `filtered (${statusFilter})` : "full month"} →
                  </span>
                </div>

              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}


// import { useRouter } from "next/router";
// import { useState, useEffect, useRef } from "react";
// import Head from "next/head";
// import Link from "next/link";
// import SmartLeftbar from "@/components/SmartLeftbar";
// import LeftbarMobile from "@/components/LeftbarMobile";
// import Dashnav from "@/components/Dashnav";

// export default function EmployeeAttendance() {
//   const router = useRouter();
//   const { employeeId } = router.query;

//   const monthInputRef = useRef(null);

//   const [month, setMonth] = useState(() => {
//     const d = new Date();
//     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
//   });

//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(false);

//   /* ================= FETCH ================= */

//   useEffect(() => {
//     if (!employeeId || !month) return;
//     fetchAttendance();
//   }, [employeeId, month]);

//   async function fetchAttendance() {
//     try {
//       setLoading(true);

//       const res = await fetch(
//         `/api/admin/attendance/employee/monthly?employeeId=${employeeId}&month=${month}`,
//         { credentials: "include" }
//       );

//       const json = await res.json();
//       if (json?.success) setData(json);
//       else setData(null);
//     } catch (err) {
//       console.error("Employee attendance error", err);
//       setData(null);
//     } finally {
//       setLoading(false);
//     }
//   }

//   /* ================= HELPERS ================= */

//   function getMonthDays(month) {
//     const [year, m] = month.split("-");
//     const daysInMonth = new Date(year, m, 0).getDate();
//     const days = [];

//     for (let d = 1; d <= daysInMonth; d++) {
//       days.push(
//         `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
//       );
//     }
//     return days;
//   }

//   function formatTime(t) {
//     if (!t) return "--";
//     return new Date(t).toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//   }

//   function getStatusClass(status) {
//     switch (status) {
//       case "On Time":
//       case "Present":
//         return "ontime";
//       case "Late":
//         return "late";
//       case "Half Day":
//         return "halfday";
//       case "Week Off":
//         return "weekoff";
//       case "Holiday":
//         return "holiday";
//       default:
//         return "absent";
//     }
//   }

//   /* ================= RENDER ================= */

//   return (
//     <>
//       <Head>
//         <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
//         <link rel="stylesheet" href="/asets/css/main.css" />
//         <link rel="stylesheet" href="/asets/css/admin.css" />
//         <link
//           rel="stylesheet"
//           href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
//         />
//       </Head>

//       <div className="dashboard-container add-employee-area admin-attendance-page">
//         <div className="main-nav">
//           <SmartLeftbar />
//           <LeftbarMobile />
//           <Dashnav />

//           <section className="content home">
//             {/* ===== BREADCRUMB ===== */}
//             <div className="breadcrum-bx">
//               <ul className="breadcrumb bg-white">
//                 <li className="breadcrumb-item">
//                   <Link href="/dashboard/admin/attendance">
//                     <img src="/icons/attendance.svg" /> Attendance
//                   </Link>
//                 </li>
//                 <li className="breadcrumb-item active">
//                   Employee Attendance
//                 </li>
//               </ul>
//             </div>

//             {/* ===== HEADER ===== */}
//             <div className="block-header add-emp-area">
//               <div className="admin-attendance-summary">
//                 <div className="attendance-topbar pb-0">
//                   <div>
//                     <h5 className="admin-main-heading mb-0">
//                       {data?.employee?.name || "Employee Attendance"}
//                     </h5>
//                     <p className="text-muted">
//                       {data?.employee?.designation} ·{" "}
//                       {data?.employee?.type}
//                     </p>
//                   </div>

//                   {/* MONTH PICKER */}
//                   <div
//                     className="date-box"
//                     onClick={() => monthInputRef.current?.showPicker()}
//                   >
//                     <input
//                       ref={monthInputRef}
//                       type="month"
//                       value={month}
//                       onChange={(e) => setMonth(e.target.value)}
//                       style={{ position: "absolute", opacity: 0 }}
//                     />
//                     <i className="bi bi-calendar"></i>
//                     <span>
//                       {new Date(`${month}-01`).toLocaleDateString("en-US", {
//                         month: "long",
//                         year: "numeric",
//                       })}
//                     </span>
//                     <i className="bi bi-chevron-down"></i>
//                   </div>
//                 </div>

//                 {/* ===== TABLE ===== */}
//                 <div className="today-attendance-table">
//                   <h5 className="admin-main-heading">Monthly Attendance</h5>

//                   <div className="table-wrapper">
//                     <table>
//                       <thead>
//                         <tr>
//                           <th>Date</th>
//                           <th>Day</th>
//                           <th>Status</th>
//                           <th>Check In</th>
//                           <th>Check Out</th>
//                           <th>Lunch</th>
//                         </tr>
//                       </thead>

//                       <tbody>
//                         {loading ? (
//                           <tr>
//                             <td colSpan="6">Loading...</td>
//                           </tr>
//                         ) : !data?.days ? (
//                           <tr>
//                             <td colSpan="6">No data found</td>
//                           </tr>
//                         ) : (
//                           getMonthDays(month).map((dateKey) => {
//                             const rec = data.days[dateKey];
//                             const dayName = new Date(dateKey).toLocaleDateString(
//                               "en-US",
//                               { weekday: "short" }
//                             );

//                             return (
//                               <tr key={dateKey}>
//                                 <td>{dateKey}</td>
//                                 <td>{dayName}</td>

//                                 <td>
//                                   <span
//                                     className={`status-pill ${getStatusClass(
//                                       rec?.status
//                                     )}`}
//                                   >
//                                     {rec?.status || "Absent"}
//                                   </span>
//                                 </td>

//                                 <td>{formatTime(rec?.checkIn)}</td>
//                                 <td>{formatTime(rec?.checkOut)}</td>

//                                 <td>
//                                   {rec?.lunchStatus === "On Lunch" ? (
//                                     <span className="lunch-pill active">
//                                       {rec.lunch}
//                                     </span>
//                                   ) : rec?.lunch ? (
//                                     <span className="lunch-pill done">
//                                       {rec.lunch}
//                                     </span>
//                                   ) : (
//                                     "--"
//                                   )}
//                                 </td>
//                               </tr>
//                             );
//                           })
//                         )}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </section>
//         </div>
//       </div>
//     </>
//   );
// }
