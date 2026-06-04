import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Head from "next/head";
import Link from "next/link";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getMonthDays(dateStr) {
  const year  = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7)) - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d  = new Date(year, month, day);
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    days.push({
      dayNumber: day,
      dateKey:   `${year}-${mm}-${dd}`,
      dayName:   d.toLocaleDateString("en-US", { weekday: "short" }),
    });
  }
  return days;
}

function isFutureDate(dateKey) {
  return dateKey > getTodayDateString();
}

function isSunday(dayName) { return dayName === "Sun"; }

function isThirdSaturday(year, monthIndex, dayNumber) {
  const d = new Date(year, monthIndex, dayNumber);
  if (d.getDay() !== 6) return false;
  let count = 0;
  for (let i = 1; i <= dayNumber; i++) {
    if (new Date(year, monthIndex, i).getDay() === 6) count++;
  }
  return count === 3;
}

function getStatusClass(status) {
  switch (status) {
    case "On Time":  return "ontime";
    case "Late":     return "late";
    case "Absent":   return "absent";
    case "Leave":    return "leave";
    case "Half Day": return "halfday";
    case "Week Off": return "weekoff";
    case "Holiday":  return "holiday";
    default:         return "na";
  }
}

// ─── component ────────────────────────────────────────────────────────────────
export default function AttendanceDashboard() {
  const router      = useRouter();
  const dateInputRef = useRef(null);
  const fromRef      = useRef(null);
  const toRef        = useRef(null);

  const [view,   setView]   = useState("today");
  const [date,   setDate]   = useState(getTodayDateString());

  const year       = Number(date.slice(0, 4));
  const monthIndex = Number(date.slice(5, 7)) - 1;
  const monthDays  = getMonthDays(date);

  const [todayEmployees,    setTodayEmployees]    = useState([]);
  const [loadingTodayTable, setLoadingTodayTable] = useState(false);
  const [todaySummary,      setTodaySummary]      = useState(null);
  const [loadingTodaySummary, setLoadingTodaySummary] = useState(false);
  const [monthlyData,       setMonthlyData]       = useState([]);
  const [loadingMonth,      setLoadingMonth]       = useState(false);

  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    department: "", designation: "", employeeType: "", status: "",
  });

  // ── Export date range state ────────────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [exportTo, setExportTo] = useState(getTodayDateString());
  const [exportLoading, setExportLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (view === "today") { fetchTodaySummary(); fetchTodayAttendance(); }
    if (view === "month") { fetchMonthlyAttendance(); }
  }, [view, date]);

  // Auto-refresh today view every 60 s to keep lunch durations live
  useEffect(() => {
    if (view !== "today") return;
    const id = setInterval(() => { fetchTodayAttendance(); }, 60000);
    return () => clearInterval(id);
  }, [view, date]);

  async function fetchTodaySummary() {
    try {
      setLoadingTodaySummary(true);
      const res  = await fetch(`/api/admin/attendance/today/summary?date=${date}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setTodaySummary(data);
    } catch (err) { console.error(err); }
    finally { setLoadingTodaySummary(false); }
  }

  async function fetchTodayAttendance() {
    try {
      setLoadingTodayTable(true);
      const query = new URLSearchParams({ ...filters, date }).toString();
      const res   = await fetch(`/api/admin/attendance/today/list?${query}`, { credentials: "include" });
      const data  = await res.json();
      if (data.success) setTodayEmployees(data.employees);
    } catch (err) { console.error(err); }
    finally { setLoadingTodayTable(false); }
  }

  async function fetchMonthlyAttendance() {
    try {
      setLoadingMonth(true);
      const month = date.slice(0, 7);
      const res   = await fetch(`/api/admin/attendance/monthly?month=${month}`, { credentials: "include" });
      const data  = await res.json();
      if (data.success) setMonthlyData(data.employees);
    } catch (err) { console.error(err); }
    finally { setLoadingMonth(false); }
  }

  async function handleExport() {
    if (!exportFrom || !exportTo) return;
    if (exportFrom > exportTo) { alert("Start date cannot be after end date"); return; }
    setExportLoading(true);
    try {
      window.open(
        `/api/admin/attendance/export/range?from=${exportFrom}&to=${exportTo}`,
        "_blank"
      );
    } finally {
      setTimeout(() => { setExportLoading(false); setShowExportModal(false); }, 800);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* ════════════════════════════════════════════
             TOPBAR
          ════════════════════════════════════════════ */
          .attendance-topbar {
            display: flex; justify-content: space-between; align-items: center;
            flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
          }
          .attendance-toggle {
            display: flex; background: #F3F4F6; border-radius: 10px; padding: 3px; gap: 3px;
          }
          .attendance-toggle button {
            border: none; background: transparent; padding: 7px 22px;
            border-radius: 8px; font-size: 13px; font-weight: 600;
            color: #6B7280; cursor: pointer; transition: all 0.2s;
          }
          .attendance-toggle button.active {
            background: #fff; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          }
          .attendance-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

          .date-box {
            display: flex; align-items: center; gap: 8px;
            border: 1.5px solid #E5E7EB; border-radius: 10px;
            padding: 8px 14px; cursor: pointer; position: relative;
            font-size: 13px; font-weight: 500; color: #374151;
            background: #fff; transition: border-color 0.2s;
          }
          .date-box:hover { border-color: #4F46E5; }

          .filter-btn, .export-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 10px;
            font-size: 13px; font-weight: 600; cursor: pointer; border: none;
          }
          .filter-btn  { background: #F3F4F6; color: #374151; }
          .filter-btn:hover  { background: #E5E7EB; }
          .export-btn  { background: #EEF2FF; color: #4F46E5; }
          .export-btn:hover  { background: #E0E7FF; }

          /* ════════════════════════════════════════════
             SUMMARY CARDS
          ════════════════════════════════════════════ */
          .today-attendance-cards {
            display: grid; grid-template-columns: repeat(4, 1fr);
            gap: 16px; margin-bottom: 24px;
          }
          @media (max-width: 900px) { .today-attendance-cards { grid-template-columns: repeat(2,1fr); } }
          .attendance-card {
            background: #fff; border-radius: 14px; padding: 18px 20px;
            display: flex; justify-content: space-between; align-items: center;
            border: 1px solid #F0F0F0; transition: box-shadow 0.2s;
          }
          .attendance-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
          .card-left { display: flex; align-items: center; gap: 12px; }
          .icon-circle {
            width: 44px; height: 44px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          }
          .icon-circle.green  { background: #DCFCE7; }
          .icon-circle.red    { background: #FEE2E2; }
          .icon-circle.orange { background: #FEF3C7; }
          .icon-circle.blue   { background: #DBEAFE; }
          .icon-circle img    { width: 22px; height: 22px; }
          .card-left h6 { font-size: 12px; color: #6B7280; font-weight: 500; margin: 0 0 3px; }
          .card-left p  { font-size: 11px; color: #9CA3AF; margin: 0; }
          .card-count   { font-size: 28px; font-weight: 700; color: #111827; line-height: 1; }
          .highlight-percentages { color: #16A34A; font-weight: 600; }
          .late-arrivals         { color: #D97706; font-weight: 600; }
          .approval-pending      { color: #DC2626 !important; font-size: 11px; font-weight: 500; }
          .admin-main-heading    { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 16px; }

          /* ════════════════════════════════════════════
             TODAY TABLE
          ════════════════════════════════════════════ */
          .att-table-wrap { border-radius: 12px; overflow: hidden; border: 1px solid #F0F0F0; }
          .att-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
          .att-table thead tr { background: #FAFAFA; border-bottom: 1.5px solid #EFEFEF; }
          .att-table thead th {
            padding: 13px 16px; font-weight: 600; color: #6B7280;
            text-align: center; white-space: nowrap; font-size: 12px;
            text-transform: uppercase; letter-spacing: 0.4px;
          }
          .att-table thead th:first-child { text-align: left; padding-left: 20px; }
          .att-table tbody tr { border-bottom: 1px solid #F5F5F5; transition: background 0.15s; cursor: pointer; }
          .att-table tbody tr:last-child { border-bottom: none; }
          .att-table tbody tr:hover { background: #F8F9FF; }
          .att-table td { padding: 13px 16px; color: #374151; text-align: center; vertical-align: middle; white-space: nowrap; }
          .att-table td:first-child { text-align: left; padding-left: 20px; }

          .emp-cell    { display: flex; align-items: center; gap: 10px; }
          .avatar      {
            width: 36px; height: 36px; border-radius: 50%;
            background: #EEF2FF; color: #4F46E5;
            font-size: 12px; font-weight: 700;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; text-transform: uppercase;
          }
          .emp-name  { font-weight: 600; color: #111827; font-size: 13.5px; }

          .status-pill {
            display: inline-block; padding: 4px 12px; border-radius: 20px;
            font-size: 11.5px; font-weight: 600; white-space: nowrap;
          }
          .status-pill.ontime  { background: #DCFCE7; color: #15803D; }
          .status-pill.late    { background: #FEF3C7; color: #B45309; }
          .status-pill.absent  { background: #FEE2E2; color: #DC2626; }
          .status-pill.leave   { background: #FEE2E2; color: #DC2626; }
          .status-pill.halfday { background: #F3E8FF; color: #7C3AED; }
          .status-pill.weekoff { background: #FEF9C3; color: #92400E; }
          .status-pill.holiday { background: #DBEAFE; color: #1D4ED8; }
          .status-pill.future  { background: #F3F4F6; color: #9CA3AF; }
          .status-pill.na      { background: #F3F4F6; color: #9CA3AF; }

          .lunch-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
          .lunch-pill.active { background: #FEF3C7; color: #B45309; }
          .lunch-pill.done   { background: #DCFCE7; color: #15803D; }
          @keyframes lunchAdminBlink { 0%,100%{opacity:1} 50%{opacity:0.6} }

          .type-pill { background: #F3F4F6; color: #374151; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }

          /* ════════════════════════════════════════════
             MONTHLY CALENDAR TABLE
             KEY FIX: solid white background on sticky cols
          ════════════════════════════════════════════ */
          .calendar-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #F0F0F0; }
          .calendar-table   { border-collapse: collapse; font-size: 12px; min-width: 100%; }
          .calendar-table thead tr { background: #FAFAFA; }
          .calendar-table thead th {
            padding: 10px 6px; text-align: center; font-size: 11px;
            font-weight: 600; color: #6B7280;
            border-bottom: 1.5px solid #EFEFEF; white-space: nowrap;
          }

          /* ── STICKY COLS — solid bg, no transparency ── */
          .cal-sticky-1 {
            position: sticky; left: 0; z-index: 3;
            background: #FAFAFA !important;
            border-right: 1px solid #E5E7EB;
            min-width: 180px; text-align: left !important;
          }
          .cal-sticky-2 {
            position: sticky; left: 180px; z-index: 3;
            background: #FAFAFA !important;
            border-right: 1px solid #E5E7EB;
            min-width: 160px;
          }
          .cal-sticky-3 {
            position: sticky; left: 340px; z-index: 3;
            background: #FAFAFA !important;
            border-right: 1px solid #E5E7EB;
            min-width: 80px;
          }
          /* tbody rows — white bg */
          .calendar-table tbody .cal-sticky-1 { background: #fff !important; }
          .calendar-table tbody .cal-sticky-2 { background: #fff !important; }
          .calendar-table tbody .cal-sticky-3 { background: #fff !important; }
          /* hover — keep sticky solid */
          .calendar-table tbody tr:hover .cal-sticky-1 { background: #F8F9FF !important; }
          .calendar-table tbody tr:hover .cal-sticky-2 { background: #F8F9FF !important; }
          .calendar-table tbody tr:hover .cal-sticky-3 { background: #F8F9FF !important; }

          .calendar-table td {
            padding: 9px 6px; text-align: center;
            border-bottom: 1px solid #F5F5F5; vertical-align: middle;
          }
          .calendar-table td.cal-sticky-1 { padding-left: 14px; }
          .calendar-table tbody tr { transition: background 0.15s; cursor: pointer; }
          .calendar-table tbody tr:hover { background: #F8F9FF; }
          .calendar-table tbody tr:last-child td { border-bottom: none; }
          .day-head   { min-width: 38px; }
          .day-number { font-weight: 700; font-size: 12px; color: #374151; }
          .day-name   { font-size: 10px; color: #9CA3AF; display: block; }

          .day-badge {
            display: inline-flex; width: 28px; height: 28px; border-radius: 50%;
            align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700;
          }
          .day-badge.present  { background: #DCFCE7; color: #15803D; }
          .day-badge.late     { background: #FEF3C7; color: #B45309; }
          .day-badge.absent   { background: #FEE2E2; color: #DC2626; }
          .day-badge.weekoff  { background: #FEF9C3; color: #92400E; }
          .day-badge.halfday  { background: #F3E8FF; color: #7C3AED; }
          .day-badge.holiday  { background: #DBEAFE; color: #1D4ED8; }
          .day-badge.leave    { background: #FEE2E2; color: #DC2626; }
          .day-badge.future   { background: #F3F4F6; color: #D1D5DB; }
          .day-badge.na       { background: #F3F4F6; color: #D1D5DB; }

          /* ════════════════════════════════════════════
             LEGEND
          ════════════════════════════════════════════ */
          .month-attendance-legend {
            display: flex; flex-wrap: wrap; gap: 16px;
            margin-top: 16px; padding: 14px 16px;
            background: #FAFAFA; border-radius: 10px; border: 1px solid #F0F0F0;
          }
          .legend-item  { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6B7280; }
          .legend-badge {
            display: inline-flex; width: 24px; height: 24px; border-radius: 50%;
            align-items: center; justify-content: center; font-size: 9px; font-weight: 700;
          }
          .legend-badge.present  { background: #DCFCE7; color: #15803D; }
          .legend-badge.absent   { background: #FEE2E2; color: #DC2626; }
          .legend-badge.late     { background: #FEF3C7; color: #B45309; }
          .legend-badge.holiday  { background: #DBEAFE; color: #1D4ED8; }
          .legend-badge.weekoff  { background: #FEF9C3; color: #92400E; }
          .legend-badge.halfday  { background: #F3E8FF; color: #7C3AED; }
          .legend-badge.leave    { background: #FEE2E2; color: #DC2626; }
          .legend-badge.na       { background: #F3F4F6; color: #9CA3AF; }

          /* ════════════════════════════════════════════
             SECTION HEADER
          ════════════════════════════════════════════ */
          .section-header {
            display: flex; justify-content: space-between;
            align-items: center; margin-bottom: 14px;
          }

          /* ════════════════════════════════════════════
             FILTER PANEL (SIDE DRAWER)
          ════════════════════════════════════════════ */
          .admin-filter-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 998; }
          .admin-filter-overlay.open { display: block; }
          .admin-filter-panel {
            position: fixed; top: 0; right: -360px; width: 340px; height: 100vh;
            background: #fff; z-index: 999; box-shadow: -4px 0 24px rgba(0,0,0,0.1);
            transition: right 0.3s ease; display: flex; flex-direction: column;
          }
          .admin-filter-panel.open { right: 0; }
          .admin-filter-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #F0F0F0; }
          .admin-filter-header h6 { font-weight: 700; font-size: 15px; color: #111827; margin: 0; }
          .admin-filter-header .close-btn { background: #F3F4F6; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 14px; color: #6B7280; }
          .admin-filter-body { flex: 1; padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
          .filter-group { display: flex; flex-direction: column; gap: 6px; }
          .filter-group label { font-size: 12px; font-weight: 600; color: #374151; }
          .filter-group select, .filter-group input[type="date"] {
            padding: 9px 12px; border-radius: 9px; border: 1.5px solid #E5E7EB;
            font-size: 13px; color: #374151; background: #fff; outline: none;
          }
          .filter-group select:focus,
          .filter-group input[type="date"]:focus { border-color: #4F46E5; }
          .admin-filter-footer { padding: 20px 24px; border-top: 1px solid #F0F0F0; display: flex; gap: 10px; }
          .apply-btn { flex: 1; background: #4F46E5; color: #fff; border: none; border-radius: 10px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
          .apply-btn:hover { background: #4338CA; }
          .reset-btn { background: #F3F4F6; color: #374151; border: none; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
          .reset-btn:hover { background: #E5E7EB; }

          /* ════════════════════════════════════════════
             EXPORT MODAL
          ════════════════════════════════════════════ */
          .modal-backdrop {
            position: fixed; inset: 0; background: rgba(0,0,0,0.45);
            z-index: 1040; display: flex; align-items: center; justify-content: center;
          }
          .export-modal {
            background: #fff; border-radius: 16px; padding: 28px;
            width: 100%; max-width: 460px; margin: 0 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          }
          .export-modal h5 { font-weight: 700; color: #111827; margin: 0 0 4px; font-size: 17px; }
          .export-modal p  { color: #6B7280; font-size: 13px; margin: 0 0 20px; }
          .date-range-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .date-range-field { display: flex; flex-direction: column; gap: 6px; }
          .date-range-field label { font-size: 12px; font-weight: 600; color: #374151; }
          .date-range-field input[type="date"] {
            padding: 10px 12px; border-radius: 10px;
            border: 1.5px solid #E5E7EB; font-size: 13px;
            color: #374151; background: #fff; outline: none; width: 100%;
          }
          .date-range-field input[type="date"]:focus { border-color: #4F46E5; }
          .export-preview {
            background: #F9FAFB; border: 1px solid #F0F0F0; border-radius: 10px;
            padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #374151;
          }
          .export-preview strong { color: #111827; }
          .export-modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
          .btn-cancel {
            background: #F3F4F6; color: #374151; border: none;
            border-radius: 10px; padding: 10px 20px;
            font-size: 13px; font-weight: 600; cursor: pointer;
          }
          .btn-cancel:hover { background: #E5E7EB; }
          .btn-export-confirm {
            background: #4F46E5; color: #fff; border: none;
            border-radius: 10px; padding: 10px 24px;
            font-size: 13px; font-weight: 600; cursor: pointer;
            display: flex; align-items: center; gap: 6px;
          }
          .btn-export-confirm:hover { background: #4338CA; }
          .btn-export-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
        `}</style>
      </Head>

      <div className="dashboard-container add-employee-area admin-attendance-page">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            {/* ── Breadcrumb ── */}
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/attendance.svg" alt="" /> Attendance Summary
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="admin-attendance-summary">

                {/* ── Topbar ── */}
                <div className="attendance-topbar">
                  <div className="attendance-toggle">
                    <button className={view === "today" ? "active" : ""} onClick={() => setView("today")}>Today</button>
                    <button className={view === "month" ? "active" : ""} onClick={() => setView("month")}>This Month</button>
                  </div>

                  <div className="attendance-actions">
                    {/* Date picker */}
                    <div className="date-box" onClick={() => dateInputRef.current?.showPicker()}>
                      <input ref={dateInputRef} type="date" value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                      <i className="bi bi-calendar" style={{ color: "#4F46E5" }}></i>
                      <span>{new Date(date + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}</span>
                      <i className="bi bi-chevron-down" style={{ fontSize: 11, color: "#9CA3AF" }}></i>
                    </div>

                    <button className="filter-btn" onClick={() => setShowFilter(true)}>
                      <i className="bi bi-funnel"></i> Filter
                    </button>

                    {/* Export — opens date-range modal */}
                    <button className="export-btn" onClick={() => setShowExportModal(true)}>
                      <i className="bi bi-download"></i> Export
                    </button>
                  </div>
                </div>

                {/* ── Section title ── */}
                <h5 className="admin-main-heading">
                  Attendance – {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h5>

                {/* ── Summary cards ── */}
                <div className="today-attendance-cards">
                  <div className="attendance-card">
                    <div className="card-left">
                      <div className="icon-circle green"><img src="/icons/admin/icon1.svg" alt="" /></div>
                      <div>
                        <h6>Total Present Today</h6>
                        <p><span className="highlight-percentages">{todaySummary?.presentPercentage ?? 0}%</span> of total</p>
                      </div>
                    </div>
                    <div className="card-count">{loadingTodaySummary ? "--" : (todaySummary?.present ?? 0)}</div>
                  </div>

                  <div className="attendance-card">
                    <div className="card-left">
                      <div className="icon-circle red"><img src="/icons/admin/icon2.svg" alt="" /></div>
                      <div>
                        <h6>Total Absent Today</h6>
                        <p className="approval-pending">1 leave approval pending</p>
                      </div>
                    </div>
                    <div className="card-count">
                      <span className="approval-pending">{loadingTodaySummary ? "--" : (todaySummary?.absent ?? 0)}</span>
                    </div>
                  </div>

                  <div className="attendance-card">
                    <div className="card-left">
                      <div className="icon-circle orange"><img src="/icons/admin/icon3.svg" alt="" /></div>
                      <div>
                        <h6>Late Arrivals Today</h6>
                        <p><span className="late-arrivals">{todaySummary?.latePercentage ?? 0}%</span> of total</p>
                      </div>
                    </div>
                    <div className="card-count">{loadingTodaySummary ? "--" : (todaySummary?.late ?? 0)}</div>
                  </div>

                  <div className="attendance-card">
                    <div className="card-left">
                      <div className="icon-circle blue"><img src="/icons/admin/icon4.svg" alt="" /></div>
                      <div>
                        <h6>Holidays This Month</h6>
                        <p>{todaySummary?.holidayLabel ?? "--"}</p>
                      </div>
                    </div>
                    <div className="card-count">{loadingTodaySummary ? "--" : (todaySummary?.holidays ?? 0)}</div>
                  </div>
                </div>

                {/* ══════════════ TODAY VIEW ══════════════ */}
                {view === "today" && (
                  <div className="today-attendance-table">
                    <div className="section-header">
                      <h5 className="admin-main-heading mb-0">Attendance Status</h5>
                      <span className="text-muted" style={{ fontSize: 12 }}>{todayEmployees.length} employees</span>
                    </div>

                    <div className="att-table-wrap">
                      <table className="att-table">
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", paddingLeft: 20 }}>Employee</th>
                            <th>Designation</th>
                            <th>Type</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Lunch</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingTodayTable ? (
                            <tr>
                              <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#9CA3AF" }}>
                                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                Loading...
                              </td>
                            </tr>
                          ) : todayEmployees.length === 0 ? (
                            <tr>
                              <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#9CA3AF" }}>
                                No records found
                              </td>
                            </tr>
                          ) : (
                            todayEmployees.map((emp, idx) => (
                              <tr key={idx}
                                onClick={() => router.push(`/dashboard/admin/attendance/employee/${emp.employeeId}`)}>
                                <td style={{ paddingLeft: 20 }}>
                                  <div className="emp-cell">
                                    {emp.avatar
                                      ? <img src={emp.avatar} alt="avatar" style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", border:"1.5px solid #E5E7EB", flexShrink:0 }} />
                                      : <div className="avatar">{(emp.name || "NA").split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                                    }
                                    <span className="emp-name">{emp.name || "N/A"}</span>
                                  </div>
                                </td>
                                <td style={{ color: "#6B7280", fontSize: 13 }}>{emp.designation}</td>
                                <td><span className="type-pill">{emp.type}</span></td>
                                <td style={{ fontWeight: 500 }}>{emp.checkIn || "--"}</td>
                                <td style={{ fontWeight: 500 }}>{emp.checkOut || "--"}</td>
                                <td>
                                  {emp.lunchStatus === "On Lunch" ? (() => {
                                    // Parse "XX min" to check if overdue (>45 min)
                                    const mins = parseInt(emp.lunch) || 0;
                                    const overdue = mins > 45;
                                    const warn    = mins > 35;
                                    return (
                                      <span className={`lunch-pill active`} style={
                                        overdue ? { background:"#FEE2E2", color:"#DC2626", animation:"lunchAdminBlink 1.2s ease-in-out infinite" }
                                        : warn   ? { background:"#FEF3C7", color:"#B45309" }
                                        : {}
                                      }>
                                        {overdue && "⚠ "}{emp.lunch}
                                        {overdue && " — Exceeded!"}
                                      </span>
                                    );
                                  })() : emp.lunch && emp.lunch !== "--" ? (
                                    <span className="lunch-pill done">{emp.lunch}</span>
                                  ) : "--"}
                                </td>
                                <td>
                                  {/* Show "On Lunch" status when employee is on break */}
                                  {emp.lunchStatus === "On Lunch" ? (
                                    <span className="status-pill" style={{ background:"#FEF3C7", color:"#B45309" }}>
                                      On Lunch
                                    </span>
                                  ) : (
                                    <span className={`status-pill ${getStatusClass(emp.status)}`}>
                                      {emp.status}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ══════════════ MONTH VIEW ══════════════ */}
                {view === "month" && (
                  <>
                    <div className="month-attendance-table">
                      <div className="section-header">
                        <h5 className="admin-main-heading mb-0">Monthly Attendance Calendar</h5>
                        <span className="text-muted" style={{ fontSize: 12 }}>{monthlyData.length} employees</span>
                      </div>

                      <div className="calendar-wrapper">
                        <table className="calendar-table">
                          <thead>
                            <tr>
                              {/* Sticky headers — solid bg */}
                              <th className="cal-sticky-1" style={{ textAlign: "left", paddingLeft: 14 }}>Employee</th>
                              <th className="cal-sticky-2">Designation</th>
                              <th className="cal-sticky-3">Type</th>

                              {monthDays.map((d) => {
                                const isWeekend = d.dayName === "Sun" || d.dayName === "Sat";
                                const isToday   = d.dateKey === getTodayDateString();
                                return (
                                  <th key={d.dateKey} className="day-head"
                                    style={{
                                      background: isToday ? "#EEF2FF" : isWeekend ? "#FAFAFA" : undefined,
                                    }}>
                                    <div className="day-number" style={{ color: isToday ? "#4F46E5" : undefined }}>
                                      {d.dayNumber}
                                    </div>
                                    <span className="day-name" style={{ color: d.dayName === "Sun" ? "#EF4444" : undefined }}>
                                      {d.dayName}
                                    </span>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {loadingMonth ? (
                              <tr>
                                <td colSpan="35" style={{ textAlign: "center", padding: "30px", color: "#9CA3AF" }}>
                                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                  Loading...
                                </td>
                              </tr>
                            ) : monthlyData.length === 0 ? (
                              <tr>
                                <td colSpan="35" style={{ textAlign: "center", padding: "40px", color: "#9CA3AF" }}>
                                  No data found
                                </td>
                              </tr>
                            ) : (
                              monthlyData.map((emp, idx) => (
                                <tr key={idx}
                                  onClick={() => router.push(`/dashboard/admin/attendance/employee/${emp.employeeId}`)}>
                                  {/* Sticky cells — explicit solid bg */}
                                  <td className="cal-sticky-1">
                                    <div className="emp-cell">
                                      {emp.avatar
                                        ? <img src={emp.avatar} alt="avatar" style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover", border:"1.5px solid #E5E7EB", flexShrink:0 }} />
                                        : <div className="avatar" style={{ width:30, height:30, fontSize:10 }}>{emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                                      }
                                      <span style={{ fontWeight:600, fontSize:12.5, color:"#111827" }}>{emp.name}</span>
                                    </div>
                                  </td>
                                  <td className="cal-sticky-2" style={{ color: "#6B7280", fontSize: 12, textAlign: "center" }}>
                                    {emp.designation}
                                  </td>
                                  <td className="cal-sticky-3" style={{ textAlign: "center" }}>
                                    <span className="type-pill" style={{ fontSize: 10, padding: "2px 8px" }}>{emp.type}</span>
                                  </td>

                                  {monthDays.map((d) => {
                                    // Future → blank
                                    if (isFutureDate(d.dateKey)) {
                                      return (
                                        <td key={d.dateKey}>
                                          <span className="day-badge future" style={{ fontSize: 13 }}>–</span>
                                        </td>
                                      );
                                    }

                                    let status = emp.days?.[d.dateKey];

                                    if (!status) {
                                      if (isSunday(d.dayName)) {
                                        status = "WO";
                                      } else if (isThirdSaturday(year, monthIndex, d.dayNumber)) {
                                        status = "HD";
                                      } else {
                                        status = "A";
                                      }
                                    }

                                    const cls =
                                      status === "P"  ? "present" :
                                      status === "L"  ? "late"    :
                                      status === "WO" ? "weekoff" :
                                      status === "HD" ? "halfday" :
                                      status === "H"  ? "holiday" :
                                      (status === "CL" || status === "SL") ? "leave" :
                                      "absent";

                                    return (
                                      <td key={d.dateKey}>
                                        <span className={`day-badge ${cls}`}>{status}</span>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="month-attendance-legend">
                      {[
                        { cls: "present", l: "P",  text: "Present"      },
                        { cls: "absent",  l: "A",  text: "Absent"       },
                        { cls: "late",    l: "L",  text: "Late"         },
                        { cls: "holiday", l: "H",  text: "Holiday"      },
                        { cls: "weekoff", l: "WO", text: "Week Off"     },
                        { cls: "halfday", l: "HD", text: "Half Day"     },
                        { cls: "leave",   l: "CL", text: "Casual Leave" },
                        { cls: "leave",   l: "SL", text: "Sick Leave"   },
                        { cls: "na",      l: "–",  text: "Future Date"  },
                      ].map((item, i) => (
                        <div key={i} className="legend-item">
                          <span className={`legend-badge ${item.cls}`}>{item.l}</span>
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

              </div>
            </div>
          </section>

          {/* ── Filter overlay + panel ── */}
          <div className={`admin-filter-overlay ${showFilter ? "open" : ""}`} onClick={() => setShowFilter(false)}></div>
          <div className={`admin-filter-panel ${showFilter ? "open" : ""}`}>
            <div className="admin-filter-header">
              <h6>Filter Employees</h6>
              <button className="close-btn" onClick={() => setShowFilter(false)}>✕</button>
            </div>
            <div className="admin-filter-body">
              {[
                { label: "Department",        key: "department",   opts: ["HR","IT","Marketing","Design","Operations"] },
                { label: "Designation",       key: "designation",  opts: ["Developer","Designer","Manager","Intern"] },
                { label: "Employee Type",     key: "employeeType", opts: ["Office","Remote","Hybrid"] },
                { label: "Employment Status", key: "status",       opts: ["Permanent","Probation","Contract","Intern"] },
              ].map((f) => (
                <div key={f.key} className="filter-group">
                  <label>{f.label}</label>
                  <select value={filters[f.key]} onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}>
                    <option value="">All {f.label}s</option>
                    {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div className="filter-group">
                <label>Attendance Status</label>
                <select onChange={(e) => setFilters({ ...filters, attendanceStatus: e.target.value })}>
                  <option value="">All</option>
                  <option value="On Time">On Time</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>
            </div>
            <div className="admin-filter-footer">
              <button className="apply-btn" onClick={() => {
                setShowFilter(false);
                if (view === "today") fetchTodayAttendance();
                if (view === "month") fetchMonthlyAttendance();
              }}>Apply Filters</button>
              <button className="reset-btn" onClick={() => setFilters({ department:"", designation:"", employeeType:"", status:"" })}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          EXPORT DATE RANGE MODAL
      ══════════════════════════════════════════════ */}
      {showExportModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false); }}>
          <div className="export-modal">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h5>Export Attendance</h5>
                <p>Select a date range to export all employee attendance records</p>
              </div>
              <button onClick={() => setShowExportModal(false)}
                style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", flexShrink: 0, fontSize: 14, color: "#6B7280" }}>
                ✕
              </button>
            </div>

            {/* Quick range presets */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { label: "This Month", action: () => {
                  const d = new Date(); d.setDate(1);
                  setExportFrom(d.toISOString().slice(0, 10));
                  setExportTo(getTodayDateString());
                }},
                { label: "Last Month", action: () => {
                  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
                  const from = d.toISOString().slice(0, 10);
                  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                  setExportFrom(from);
                  setExportTo(last.toISOString().slice(0, 10));
                }},
                { label: "Last 7 Days", action: () => {
                  const to   = new Date();
                  const from = new Date(); from.setDate(from.getDate() - 6);
                  setExportFrom(from.toISOString().slice(0, 10));
                  setExportTo(to.toISOString().slice(0, 10));
                }},
                { label: "Last 30 Days", action: () => {
                  const to   = new Date();
                  const from = new Date(); from.setDate(from.getDate() - 29);
                  setExportFrom(from.toISOString().slice(0, 10));
                  setExportTo(to.toISOString().slice(0, 10));
                }},
              ].map((p) => (
                <button key={p.label} onClick={p.action}
                  style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px solid #E5E7EB", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date inputs */}
            <div className="date-range-row">
              <div className="date-range-field">
                <label>From Date</label>
                <input type="date" value={exportFrom}
                  max={exportTo || getTodayDateString()}
                  onChange={(e) => setExportFrom(e.target.value)} />
              </div>
              <div className="date-range-field">
                <label>To Date</label>
                <input type="date" value={exportTo}
                  min={exportFrom}
                  max={getTodayDateString()}
                  onChange={(e) => setExportTo(e.target.value)} />
              </div>
            </div>

            {/* Preview */}
            {exportFrom && exportTo && (
              <div className="export-preview">
                <i className="bi bi-info-circle me-2" style={{ color: "#4F46E5" }}></i>
                Exporting <strong>all employees</strong> attendance from{" "}
                <strong>{new Date(exportFrom + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                {" "}to{" "}
                <strong>{new Date(exportTo + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                {" "}
                ({Math.ceil((new Date(exportTo) - new Date(exportFrom)) / 86400000) + 1} days)
              </div>
            )}

            {/* Actions */}
            <div className="export-modal-actions">
              <button className="btn-cancel" onClick={() => setShowExportModal(false)}>Cancel</button>
              <button className="btn-export-confirm" disabled={!exportFrom || !exportTo || exportLoading}
                onClick={handleExport}>
                {exportLoading ? (
                  <><div className="spinner-border spinner-border-sm" role="status"></div> Exporting...</>
                ) : (
                  <><i className="bi bi-download"></i> Export CSV</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}












// import { useRouter } from "next/router";
// import { useState, useEffect } from "react";
// import Dashnav from "@/components/Dashnav";
// import SmartLeftbar from "@/components/SmartLeftbar";
// import LeftbarMobile from "@/components/LeftbarMobile";
// import Head from "next/head";
// import Link from "next/link";

// import { useRef } from "react";

// export default function AttendanceDashboard() {
//   const [view, setView] = useState("today"); // default = Today
//   // const [date, setDate] = useState("2025-10-01");

//   const dateInputRef = useRef(null);
//   const router = useRouter();

//   const [date, setDate] = useState(getTodayDateString());

//   // ✅ DERIVED DATE VALUES (USED BY MONTHLY CALENDAR)
//   const year = Number(date.slice(0, 4));
//   const monthIndex = Number(date.slice(5, 7)) - 1; // 0-based

//   const [todayEmployees, setTodayEmployees] = useState([]);
//   const [loadingTodayTable, setLoadingTodayTable] = useState(false);

//   const [todaySummary, setTodaySummary] = useState(null);
//   const [loadingTodaySummary, setLoadingTodaySummary] = useState(false);

//   const [monthlyData, setMonthlyData] = useState([]);
//   const [loadingMonth, setLoadingMonth] = useState(false);

//   const monthDays = getMonthDays(date);

//   const [showFilter, setShowFilter] = useState(false);

//   const [filters, setFilters] = useState({
//     department: "",
//     designation: "",
//     employeeType: "",
//     status: "",
//   });

//   // const isWeekend = ["Sat", "Sun"].includes(d.dayName);

//   function getTodayDateString() {
//     const now = new Date();
//     const yyyy = now.getFullYear();
//     const mm = String(now.getMonth() + 1).padStart(2, "0");
//     const dd = String(now.getDate()).padStart(2, "0");
//     return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
//   }

//   async function fetchTodaySummary() {
//   try {
//     setLoadingTodaySummary(true);

//     const res = await fetch(
//       `/api/admin/attendance/today/summary?date=${date}`,
//       { credentials: "include" }
//     );

//     const data = await res.json();

//     if (data.success) {
//       setTodaySummary(data);
//     }
//   } catch (err) {
//     console.error("Today summary error", err);
//   } finally {
//     setLoadingTodaySummary(false);
//   }
// }


//   // useEffect(() => {
//   //   if (view === "today") {
//   //     fetchTodaySummary();
//   //     fetchTodayAttendance();
//   //   }
//   // }, [view]);

//   useEffect(() => {
//     if (view === "today") {
//       fetchTodaySummary();
//       fetchTodayAttendance();
//     }

//     if (view === "month") {
//       fetchMonthlyAttendance();
//     }
//   }, [view, date]);

//   // async function fetchTodayAttendance() {
//   //   try {
//   //     setLoadingTodayTable(true);
//   //     const res = await fetch("/api/admin/attendance/today/list", {
//   //       credentials: "include",
//   //     });
//   //     const data = await res.json();
//   //     if (data.success) {
//   //       setTodayEmployees(data.employees);
//   //     }
//   //   } catch (err) {
//   //     console.error("Today table error", err);
//   //   } finally {
//   //     setLoadingTodayTable(false);
//   //   }
//   // }

//   async function fetchTodayAttendance() {
//     try {
//       setLoadingTodayTable(true);

//      const query = new URLSearchParams({
//   ...filters,
//   date, // ✅ pass selected date
// }).toString();

// const res = await fetch(
//   `/api/admin/attendance/today/list?${query}`,
//   { credentials: "include" }
// );


//       const data = await res.json();
//       if (data.success) {
//         setTodayEmployees(data.employees);
//       }
//     } catch (err) {
//       console.error("Today table error", err);
//     } finally {
//       setLoadingTodayTable(false);
//     }
//   }

//   async function fetchMonthlyAttendance() {
//     try {
//       setLoadingMonth(true);

//       const month = date.slice(0, 7); // YYYY-MM

//       const res = await fetch(`/api/admin/attendance/monthly?month=${month}`, {
//         credentials: "include",
//       });

//       const data = await res.json();

//       if (data.success) {
//         setMonthlyData(data.employees);
//       }
//     } catch (err) {
//       console.error("Monthly attendance error", err);
//     } finally {
//       setLoadingMonth(false);
//     }
//   }

//   function getMonthDays(dateStr) {
//     const year = Number(dateStr.slice(0, 4));
//     const month = Number(dateStr.slice(5, 7)) - 1; // 0-based

//     const daysInMonth = new Date(year, month + 1, 0).getDate();
//     const days = [];

//     for (let day = 1; day <= daysInMonth; day++) {
//       const d = new Date(year, month, day);

//       const yyyy = year;
//       const mm = String(month + 1).padStart(2, "0");
//       const dd = String(day).padStart(2, "0");

//       days.push({
//         dayNumber: day,
//         dateKey: `${yyyy}-${mm}-${dd}`, // ✅ LOCAL DATE (NO UTC SHIFT)
//         dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
//       });
//     }

//     return days;
//   }

//   function getStatusClass(status) {
//     switch (status) {
//       case "On Time":
//         return "ontime";
//       case "Late":
//         return "late";
//       case "Absent":
//         return "absent";
//       case "Leave":
//         return "leave";
//       case "Half Day":
//         return "halfday";
//       case "Week Off":
//         return "weekoff";
//       case "Holiday":
//         return "holiday";
//       case "NA":
//       default:
//         return "na";
//     }
//   }

//   // this is for sunday ////

//   function isSunday(dayName) {
//     return dayName === "Sun";
//   }

//   function isThirdSaturday(year, monthIndex, dayNumber) {
//     const d = new Date(year, monthIndex, dayNumber);
//     if (d.getDay() !== 6) return false; // Saturday = 6

//     // Count Saturdays up to this date
//     let saturdayCount = 0;
//     for (let i = 1; i <= dayNumber; i++) {
//       const temp = new Date(year, monthIndex, i);
//       if (temp.getDay() === 6) saturdayCount++;
//     }

//     return saturdayCount === 3;
//   }

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
//             {/* Breadcrumb */}
//             <div className="breadcrum-bx">
//               <ul className="breadcrumb bg-white">
//                 <li className="breadcrumb-item">
//                   <Link href="/dashboard/dashboard">
//                     <img src="/icons/attendance.svg" /> Attendance Summary
//                   </Link>
//                 </li>
//               </ul>
//             </div>

//             {/* ================= ADMIN ATTENDANCE HEADER ================= */}
//             <div className="block-header add-emp-area">
//               <div className="admin-attendance-summary">
//                 {/* Breadcrumb already exists above */}

//                 <div className="attendance-topbar">
//                   {/* LEFT: TOGGLE */}
//                   <div className="attendance-toggle">
//                     <button
//                       className={view === "today" ? "active" : ""}
//                       onClick={() => setView("today")}
//                     >
//                       Today
//                     </button>

//                     <button
//                       className={view === "month" ? "active" : ""}
//                       onClick={() => setView("month")}
//                     >
//                       This month
//                     </button>
//                   </div>

//                   {/* RIGHT: ACTIONS */}
//                   <div className="attendance-actions">
//                     <div
//                       className="date-box"
//                       onClick={() => dateInputRef.current?.showPicker()}
//                       style={{ cursor: "pointer" }}
//                     >
//                       <input
//                         ref={dateInputRef}
//                         type="date"
//                         value={date}
//                         onChange={(e) => setDate(e.target.value)}
//                         style={{
//                           position: "absolute",
//                           opacity: 0,
//                           pointerEvents: "none",
//                         }}
//                       />

//                       <i className="bi bi-calendar"></i>
//                       {/* <span>01 October 2025</span> */}

//                       <span>
//                         {new Date(date).toLocaleDateString("en-US", {
//                           day: "2-digit",
//                           month: "long",
//                           year: "numeric",
//                         })}
//                       </span>

//                       <i className="bi bi-chevron-down"></i>
//                     </div>

//                     <button
//                       className="filter-btn"
//                       onClick={() => setShowFilter(true)}
//                     >
//                       <i className="bi bi-funnel"></i> Filter
//                     </button>

//                     <button
//                       className="export-btn"
//                       onClick={() => {
//                         const month = date.slice(0, 7); // YYYY-MM
//                         window.open(
//                           `/api/admin/attendance/export/monthly?month=${month}`,
//                           "_blank",
//                         );
//                       }}
//                     >
//                       <i className="bi bi-download"></i> Attendance Export
//                     </button>
//                   </div>
//                 </div>

//                 {/* <h5 className="admin-main-heading">
//                   Todays Attendance Highlights
//                 </h5> */}

//                 <h5 className="admin-main-heading">
//                   Attendance –{" "}
//                   {new Date(date).toLocaleDateString("en-US", {
//                     month: "long",
//                     year: "numeric",
//                   })}
//                 </h5>

//                 {/* ================= TODAY ATTENDANCE HIGHLIGHTS ================= */}
//                 <div className="today-attendance-cards">
//                   {/* CARD 1 */}
//                   <div className="attendance-card green">
//                     <div className="card-left">
//                       <div className="icon-circle green">
//                         <img src="/icons/admin/icon1.svg"></img>
//                       </div>
//                       <div>
//                         <h6>Total Present Today</h6>
//                         {/* <p><span className="highlight-percentages">86.4% </span>of total days</p> */}

//                         <p>
//                           <span className="highlight-percentages">
//                             {todaySummary?.presentPercentage ?? 0}%
//                           </span>{" "}
//                           of total days
//                         </p>
//                       </div>
//                     </div>
//                     {/* <div className="card-count">18</div> */}

//                     <div className="card-count">
//                       {loadingTodaySummary
//                         ? "--"
//                         : (todaySummary?.present ?? 0)}
//                     </div>
//                   </div>

//                   {/* CARD 2 */}
//                   <div className="attendance-card red">
//                     <div className="card-left">
//                       <div className="icon-circle red">
//                         <img src="/icons/admin/icon2.svg"></img>
//                       </div>
//                       <div>
//                         <h6>Total Absent Today</h6>
//                         <p className="approval-pending">
//                           1 leave approval pending
//                         </p>
//                       </div>
//                     </div>
//                     <div className="card-count">
//                       <span className="approval-pending">
//                         {loadingTodaySummary
//                           ? "--"
//                           : (todaySummary?.absent ?? 0)}
//                       </span>
//                     </div>
//                   </div>

//                   {/* CARD 3 */}
//                   <div className="attendance-card orange">
//                     <div className="card-left">
//                       <div className="icon-circle orange">
//                         <img src="/icons/admin/icon3.svg"></img>
//                       </div>
//                       <div>
//                         <h6>Late Arrivals Today</h6>
//                         {/* <p><span className="late-arrivals">3.1%</span> of total days</p> */}

//                         <p>
//                           <span className="late-arrivals">
//                             {todaySummary?.latePercentage ?? 0}%
//                           </span>{" "}
//                           of total days
//                         </p>
//                       </div>
//                     </div>
//                     <div className="card-count">
//                       {loadingTodaySummary ? "--" : (todaySummary?.late ?? 0)}
//                     </div>
//                   </div>

//                   {/* CARD 4 */}
//                   <div className="attendance-card blue">
//                     <div className="card-left">
//                       <div className="icon-circle blue">
//                         <img src="/icons/admin/icon4.svg"></img>
//                       </div>
//                       <div>
//                         <h6>Holidays This Month</h6>
//                         {/* <p>2nd October</p>
//                          */}

//                         <p>{todaySummary?.holidayLabel ?? "--"}</p>
//                       </div>
//                     </div>
//                     <div className="card-count">
//                       {loadingTodaySummary
//                         ? "--"
//                         : (todaySummary?.holidays ?? 0)}
//                     </div>
//                   </div>
//                 </div>

//                 {view === "today" && (
//                   <>
//                     {/* ================= TODAY ATTENDANCE TABLE ================= */}
//                     <div className="today-attendance-table">
//                       <h5 className="admin-main-heading">Attendance Status</h5>

//                       <div className="table-wrapper">
//                         <table>
//                           <thead>
//                             <tr>
//                               <th>Employee Name</th>
//                               <th>Designation</th>
//                               <th>Type</th>
//                               <th>Check In Time</th>
//                               <th>Check Out Time</th>
//                               <th>Lunch</th>

//                               <th>Status</th>
//                             </tr>
//                           </thead>

//                           <tbody>
//                             {loadingTodayTable ? (
//                               <tr>
//                                 <td colSpan="5">Loading...</td>
//                               </tr>
//                             ) : todayEmployees.length === 0 ? (
//                               <tr>
//                                 <td colSpan="5">No attendance found</td>
//                               </tr>
//                             ) : (
//                               todayEmployees.map((emp, idx) => (
//                                  <tr
//                                       key={idx}
//                                       style={{ cursor: "pointer" }}
//                                       onClick={() =>
//                                         router.push(`/dashboard/admin/attendance/employee/${emp.employeeId}`)
//                                       }
//                                     >
//                                   <td>
//                                     <div className="emp-cell">
//                                       <div className="avatar">
//                                         {(emp.name || "NA")
//                                           .split(" ")
//                                           .map((n) => n[0])
//                                           .join("")}
//                                       </div>
//                                       <span>{emp.name || "N/A"}</span>
//                                     </div>
//                                   </td>
//                                   <td>{emp.designation}</td>
//                                   <td>{emp.type}</td>
//                                   <td>{emp.checkIn || "--"}</td>
//                                   <td>{emp.checkOut || "--"}</td>

//                                   <td>
//                                     {emp.lunchStatus === "On Lunch" ? (
//                                       <span className="lunch-pill active">
//                                         {emp.lunch}
//                                       </span>
//                                     ) : emp.lunch !== "--" ? (
//                                       <span className="lunch-pill done">
//                                         {emp.lunch}
//                                       </span>
//                                     ) : (
//                                       "--"
//                                     )}
//                                   </td>

//                                   <td>
//                                     <span
//                                       className={`status-pill ${getStatusClass(emp.status)}`}
//                                     >
//                                       {emp.status}
//                                     </span>
//                                   </td>
//                                 </tr>
//                               ))
//                             )}
//                           </tbody>
//                         </table>
//                       </div>
//                     </div>
//                   </>
//                 )}

//                 {view === "month" && (
//                   <>
//                     {/* ================= THIS MONTH ATTENDANCE CALENDAR ================= */}
//                     <div className="month-attendance-table">
//                       <h5 className="admin-main-heading">Attendance Status</h5>

//                       <div className="calendar-wrapper">
//                         <table className="calendar-table">
//                           <thead>
//                             <tr>
//                               <th className="sticky-col name-col">
//                                 Employee Name
//                               </th>
//                               <th className="sticky-col">Designation</th>
//                               <th className="sticky-col">Type</th>

//                               {/* DAYS HEADER */}
//                               {monthDays.map((d) => (
//                                 <th key={d.dateKey} className="day-head">
//                                   <div className="day-number">
//                                     {d.dayNumber}
//                                   </div>
//                                   <span className="day-name">{d.dayName}</span>
//                                 </th>
//                               ))}
//                             </tr>
//                           </thead>

//                           {/* <tbody>
//                             <tr>
//                               <td className="sticky-col name-col">
//                                 <div className="emp-cell">
//                                   <div className="avatar">IS</div>
//                                   <span>Ivan Sinha</span>
//                                 </div>
//                               </td>
//                               <td className="sticky-col">Founder & CEO</td>
//                               <td className="sticky-col">Office</td>

//                               {[...Array(18)].map((_, i) => (
//                                 <td key={i}>
//                                   <span className="day-badge present">P</span>
//                                 </td>
//                               ))}
//                             </tr>

//                             <tr>
//                               <td className="sticky-col name-col">
//                                 <div className="emp-cell">
//                                   <div className="avatar purple">IS</div>
//                                   <span>Ishan Sinha</span>
//                                 </div>
//                               </td>
//                               <td className="sticky-col">Digital Strategist</td>
//                               <td className="sticky-col">Office</td>

//                               {[...Array(18)].map((_, i) => (
//                                 <td key={i}>
//                                   <span className="day-badge late">L</span>
//                                 </td>
//                               ))}
//                             </tr>
//                           </tbody> */}

//                           <tbody>
//                             {loadingMonth ? (
//                               <tr>
//                                 <td colSpan="25">Loading...</td>
//                               </tr>
//                             ) : monthlyData.length === 0 ? (
//                               <tr>
//                                 <td colSpan="25">No data</td>
//                               </tr>
//                             ) : (
//                               monthlyData.map((emp, idx) => (
//                                 <tr key={idx}>
//                                   <td className="sticky-col name-col">
//                                     <div className="emp-cell">
//                                       <div className="avatar">
//                                         {emp.name
//                                           .split(" ")
//                                           .map((n) => n[0])
//                                           .join("")}
//                                       </div>
//                                       <span>{emp.name}</span>
//                                     </div>
//                                   </td>

//                                   <td className="sticky-col">
//                                     {emp.designation}
//                                   </td>
//                                   <td className="sticky-col">{emp.type}</td>
//                                   {monthDays.map((d) => {
//                                     let status = emp.days[d.dateKey]; // P / L if exists

//                                     // 🧠 APPLY CORPORATE RULES ONLY IF NO ATTENDANCE
//                                     if (!status) {
//                                       if (isSunday(d.dayName)) {
//                                         status = "WO";
//                                       } else if (
//                                         isThirdSaturday(
//                                           year,
//                                           monthIndex,
//                                           d.dayNumber,
//                                         )
//                                       ) {
//                                         status = "HD";
//                                       } else {
//                                         status = "A";
//                                       }
//                                     }

//                                     return (
//                                       <td key={d.dateKey}>
//                                         <span
//                                           className={`day-badge ${
//                                             status === "P"
//                                               ? "present"
//                                               : status === "L"
//                                                 ? "late"
//                                                 : status === "WO"
//                                                   ? "weekoff"
//                                                   : status === "HD"
//                                                     ? "halfday"
//                                                     : "absent"
//                                           }`}
//                                         >
//                                           {status}
//                                         </span>
//                                       </td>
//                                     );
//                                   })}
//                                 </tr>
//                               ))
//                             )}
//                           </tbody>
//                         </table>
//                       </div>

//                       {/* FOOTER */}
//                       {/* <div className="calendar-footer">
//                         <span>Showing 1 to 10 out of 60 records</span>

//                         <div className="pagination">
//                           <button>&lsaquo;</button>
//                           <button className="active">1</button>
//                           <button>2</button>
//                           <button>3</button>
//                           <button>&rsaquo;</button>
//                         </div>
//                       </div> */}
//                     </div>

//                     {/* ================= MONTH ATTENDANCE LEGEND ================= */}
//                     <div className="month-attendance-legend">
//                       <div className="legend-item">
//                         <span className="legend-badge present">P</span>
//                         <span>Present</span>
//                       </div>

//                       <div className="legend-item">
//                         <span className="legend-badge absent">A</span>
//                         <span>Absent</span>
//                       </div>

//                       <div className="legend-item">
//                         <span className="legend-badge late">L</span>
//                         <span>Late</span>
//                       </div>

//                       <div className="legend-item">
//                         <span className="legend-badge holiday">H</span>
//                         <span>Holiday</span>
//                       </div>

//                       <div className="legend-item">
//                         <span className="legend-badge weekoff">WO</span>
//                         <span>Week Off</span>
//                       </div>

//                       <div className="legend-item">
//                         <span className="legend-badge halfday">HD</span>
//                         <span>Half Day</span>
//                       </div>

//                       <div className="legend-item">
//                         <span className="legend-badge leave">CL</span>
//                         <span>Casual Leave</span>
//                       </div>

//                       <div className="legend-item">
//                         <span className="legend-badge leave">SL</span>
//                         <span>Sick Leave</span>
//                       </div>

//                       <div className="legend-item">
//                         <span className="legend-badge na">NA</span>
//                         <span>Not Applicable</span>
//                       </div>
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>
//           </section>

//           {/* ===== FILTER OVERLAY ===== */}
//           <div
//             className={`admin-filter-overlay ${showFilter ? "open" : ""}`}
//             onClick={() => setShowFilter(false)}
//           ></div>

//           {/* ===== FILTER TOP PANEL ===== */}
//           <div className={`admin-filter-panel ${showFilter ? "open" : ""}`}>
//             <div className="admin-filter-header">
//               <h6>Filter Employees</h6>
//               <button
//                 className="close-btn"
//                 onClick={() => setShowFilter(false)}
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="admin-filter-body">
//               {/* Department */}
//               <div className="filter-group">
//                 <label>Department *</label>
//                 <select
//                   value={filters.department}
//                   onChange={(e) =>
//                     setFilters({ ...filters, department: e.target.value })
//                   }
//                 >
//                   <option value="">Select Department</option>
//                   <option value="HR">HR</option>
//                   <option value="IT">IT</option>
//                   <option value="Marketing">Marketing</option>
//                 </select>
//               </div>

//               {/* Designation */}
//               <div className="filter-group">
//                 <label>Designation *</label>
//                 <select
//                   value={filters.designation}
//                   onChange={(e) =>
//                     setFilters({ ...filters, designation: e.target.value })
//                   }
//                 >
//                   <option value="">Select Designation</option>
//                   <option value="Developer">Developer</option>
//                   <option value="Designer">Designer</option>
//                   <option value="Manager">Manager</option>
//                 </select>
//               </div>

//               {/* Employee Type */}
//               <div className="filter-group">
//                 <label>Employee Type *</label>
//                 <select
//                   value={filters.employeeType}
//                   onChange={(e) =>
//                     setFilters({ ...filters, employeeType: e.target.value })
//                   }
//                 >
//                   <option value="">Select Type</option>
//                   <option value="Office">Office</option>
//                   <option value="Remote">Remote</option>
//                   <option value="Hybrid">Hybrid</option>
//                 </select>
//               </div>

//               {/* Status */}
//               <div className="filter-group">
//                 <label>Employment Status *</label>
//                 <select
//                   value={filters.status}
//                   onChange={(e) =>
//                     setFilters({ ...filters, status: e.target.value })
//                   }
//                 >
//                   <option value="">Select Status</option>
//                   <option value="Permanent">Permanent</option>
//                   <option value="Probation">Probation</option>
//                   <option value="Contract">Contract</option>
//                   <option value="Intern">Intern</option>
//                 </select>
//               </div>
//             </div>

//             <div className="admin-filter-footer">
//               <button
//                 className="apply-btn"
//                 onClick={() => {
//                   setShowFilter(false);
//                   if (view === "today") fetchTodayAttendance();
//                   if (view === "month") fetchMonthlyAttendance();
//                 }}
//               >
//                 Apply Filters
//               </button>

//               <button
//                 className="reset-btn"
//                 onClick={() =>
//                   setFilters({
//                     department: "",
//                     designation: "",
//                     employeeType: "",
//                     status: "",
//                   })
//                 }
//               >
//                 Reset
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }









