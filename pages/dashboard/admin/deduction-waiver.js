// pages/dashboard/admin/deduction-waiver.js
import Head from "next/head";
import React, { useEffect, useState, useCallback } from "react";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { toast } from "react-toastify";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DEDUCTION_LINES = [
  { key: "absent",      label: "Absent Days",   icon: "bi-person-x-fill",    color: "#DC2626", bg: "#FEE2E2" },
  { key: "halfDay",     label: "Half Day",      icon: "bi-calendar-half",    color: "#1D4ED8", bg: "#DBEAFE" },
  { key: "late",        label: "Late Penalty",  icon: "bi-alarm-fill",       color: "#D97706", bg: "#FEF3C7" },
  { key: "lunch",       label: "Lunch Penalty", icon: "bi-cup-hot-fill",     color: "#A21CAF", bg: "#FDF4FF" },
  { key: "unpaidLeave", label: "Unpaid Leave",  icon: "bi-calendar-x-fill",  color: "#059669", bg: "#ECFDF5" },
  { key: "other",       label: "Other",         icon: "bi-dash-circle-fill", color: "#6B7280", bg: "#F3F4F6" },
];

// Local-component date-string (matches utils/payroll/generateSalaryForMonth.js's toDateStr)
function toDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const empName = (e) => e ? `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email || "—" : "—";
const getInitials = (name) => name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();
const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],
];
const avatarBg = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });
}

function fmtTime(dateVal) {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtMins(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// Compute approximate absent dates: Mon–Sat working days with no attendance record,
// never before the employee's joining date
function getAbsentDates(attendanceRecords, month, year, joinDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const presentDates = new Set(attendanceRecords.map(a => a.date));
  const absentDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    if (dateObj > today) break;
    if (dateObj.getDay() === 0) continue; // Sunday
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (joinDateStr && dateStr < joinDateStr) continue; // before employment started
    if (!presentDates.has(dateStr)) absentDates.push(dateStr);
  }
  return absentDates;
}

// Compute half-day absent dates: attendance records with isHalfDay=true and no startTime
function getHalfDayDates(attendanceRecords) {
  return attendanceRecords
    .filter(a => a.isHalfDay && !a.startTime)
    .map(a => a.date)
    .sort();
}

// Get lunch break duration for an attendance record (longest lunch break in ms)
function getLunchBreakMs(record) {
  if (!record?.breaks?.length) return 0;
  const lunchBreaks = record.breaks.filter(b => b.type === "lunch" && b.start && b.end);
  if (!lunchBreaks.length) return 0;
  return lunchBreaks.reduce((sum, b) => sum + (new Date(b.end) - new Date(b.start)), 0);
}

export default function AdminDeductionWaiver() {
  const today = new Date();
  const [month,        setMonth]        = useState(today.getMonth());
  const [year,         setYear]         = useState(today.getFullYear());
  const [reports,      setReports]      = useState([]);
  const [waivers,      setWaivers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [processing,   setProcessing]   = useState(null);
  const [overrideModal,setOverrideModal]= useState(null);
  const [remark,       setRemark]       = useState("");
  const [search,       setSearch]       = useState("");
  const [expandedId,   setExpandedId]   = useState(null);

  const years = Array.from({ length: 3 }, (_, i) => today.getFullYear() - i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/admin/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
    } catch {}
    try {
      const res  = await fetch(`/api/admin/deduction-waiver/report?month=${month}&year=${year}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
        setWaivers(data.waivers || []);
      } else toast.error("Failed to load data");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOverride = async () => {
    if (!overrideModal) return;
    setProcessing(`override_${overrideModal.empId}_${overrideModal.key}`);
    try {
      const res  = await fetch("/api/admin/deduction-waiver/override", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId:    overrideModal.empId,
          month,
          year,
          deductionType: overrideModal.key,
          amount:        overrideModal.amount,
          adminRemark:   remark || "Waived by admin",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${overrideModal.label} deduction waived for ${overrideModal.empName}`);
        setOverrideModal(null); setRemark(""); fetchData();
      } else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setProcessing(null); }
  };

  // Waive a single instance (one late day, one lunch day, one absent day)
  const handleInstanceWaive = async ({ empId, empName, key, label, instanceAmount, existingWaived, totalRemaining }) => {
    const procKey = `inst_${empId}_${key}_${instanceAmount}`;
    setProcessing(procKey);
    const originalTotal = totalRemaining + existingWaived;
    const newTotal = Math.min(existingWaived + instanceAmount, originalTotal);
    try {
      const res = await fetch("/api/admin/deduction-waiver/override", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empId, month, year,
          deductionType: key,
          amount: newTotal,
          adminRemark: `Admin waived 1 ${label} instance`,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success(`1 ${label} instance waived for ${empName}`); fetchData(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setProcessing(null); }
  };

  const waiverMap = {};
  waivers.forEach(w => {
    const empId = w.employee?._id?.toString() || "";
    waiverMap[`${empId}_${w.deductionType}`] = w;
  });

  const filteredReports = reports.filter(r => {
    if (!search.trim()) return true;
    const name = empName(r.employee).toLowerCase();
    const id   = (r.employee?.employeeId || "").toLowerCase();
    return name.includes(search.toLowerCase()) || id.includes(search.toLowerCase());
  });

  const totalDeductionAllEmp = reports.reduce((s, r) => s + (r.deductions?.total || 0), 0);
  const totalWaivedAllEmp    = waivers.filter(w => w.status === "Approved").reduce((s, w) => s + (w.amount || 0), 0);
  const withDeductions       = reports.filter(r => (r.deductions?.total || 0) > 0).length;

  const STATS = [
    { accent: "indigo", icon: "bi-people-fill",        val: reports.length,                  label: "Employees",
      pct: 100 },
    { accent: "red",    icon: "bi-dash-circle-fill",   val: `₹${fmt(totalDeductionAllEmp)}`, label: "Total Deductions",
      pct: 100 },
    { accent: "orange", icon: "bi-person-exclamation", val: withDeductions,                  label: "With Deductions",
      pct: reports.length ? (withDeductions / reports.length) * 100 : 0 },
    { accent: "green",  icon: "bi-shield-check-fill",  val: `₹${fmt(totalWaivedAllEmp)}`,    label: "Total Waived",
      pct: totalDeductionAllEmp ? Math.min(100, (totalWaivedAllEmp / totalDeductionAllEmp) * 100) : 0 },
  ];

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Deduction Waivers — Admin</title>
        <style>{`
        .dw-card  { background:#fff; border-radius:16px; border:1px solid #F1F5F9; box-shadow:0 1px 8px rgba(0,0,0,.06); }
        .dw-badge { display:inline-flex; align-items:center; gap:4px;
                    padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
        .dw-chip  { display:inline-flex; align-items:center; gap:4px;
                    padding:3px 8px; border-radius:7px; font-size:11px; font-weight:700; }
        .dw-row   { padding:16px 20px; border-bottom:1px solid #F8FAFC; transition:background .12s; }
        .dw-row:last-child { border-bottom:none; }
        .dw-btn   { border:none; cursor:pointer; border-radius:9px; padding:6px 13px;
                    font-size:12px; font-weight:700; transition:all .15s; display:inline-flex; align-items:center; gap:4px; }
        .dw-btn:disabled { opacity:.5; cursor:default; }
        .dw-btn:hover:not(:disabled) { filter:brightness(0.93); transform:translateY(-1px); }
        .dw-tab   { padding:7px 18px; border-radius:10px; border:none; cursor:pointer;
                    font-size:13px; font-weight:700; transition:all .15s; }
        .dw-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5);
                      z-index:1050; display:flex; align-items:center; justify-content:center; padding:16px; }
        .dw-modal { background:#fff; border-radius:20px; width:100%; max-width:460px;
                    box-shadow:0 24px 64px rgba(0,0,0,.2); overflow:hidden; }
        .dw-ded-row { display:flex; justify-content:space-between; align-items:flex-start;
                      padding:11px 0; border-bottom:1px solid #F3F4F6; gap:10px; }
        .dw-ded-row:last-child { border-bottom:none; }
        .dw-expand-btn { background:none; border:none; cursor:pointer; color:#9CA3AF;
                         font-size:13px; padding:4px 8px; border-radius:7px; transition:background .12s; }
        .dw-expand-btn:hover { background:#F3F4F6; color:#374151; }
        .dw-empty { text-align:center; padding:52px 20px; color:#9CA3AF; }
        .dw-stat {
          box-sizing:border-box; height:104px; border-radius:16px;
          padding:17px 18px 16px; display:flex; flex-direction:column;
          justify-content:space-between; border:1px solid;
          box-shadow:0 3px 12px rgba(15,23,42,.06); position:relative;
          overflow:hidden; transition:transform .2s ease, box-shadow .2s ease;
        }
        .dw-stat:hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(15,23,42,.12); }
        .dw-stat::before { content:""; position:absolute; top:0; left:0; right:0; height:3px; }
        .dw-stat.indigo::before { background:#4F46E5; }
        .dw-stat.indigo { background:linear-gradient(160deg,#fff 55%,#EEF2FF 165%); border-color:#C7D2FE; }
        .dw-stat.red::before { background:#DC2626; }
        .dw-stat.red { background:linear-gradient(160deg,#fff 55%,#FEE2E2 165%); border-color:#FECACA; }
        .dw-stat.orange::before { background:#EA580C; }
        .dw-stat.orange { background:linear-gradient(160deg,#fff 55%,#FFEDD5 165%); border-color:#FED7AA; }
        .dw-stat.green::before { background:#16A34A; }
        .dw-stat.green { background:linear-gradient(160deg,#fff 55%,#DCFCE7 165%); border-color:#BBF7D0; }
        .dw-stat-top { display:flex; align-items:center; gap:14px; }
        .dw-stat-icon { width:46px; height:46px; border-radius:13px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:19px; flex-shrink:0; }
        .dw-stat.indigo .dw-stat-icon { background:#4F46E5; box-shadow:0 6px 16px #4F46E533; }
        .dw-stat.red .dw-stat-icon { background:#DC2626; box-shadow:0 6px 16px #DC262633; }
        .dw-stat.orange .dw-stat-icon { background:#EA580C; box-shadow:0 6px 16px #EA580C33; }
        .dw-stat.green .dw-stat-icon { background:#16A34A; box-shadow:0 6px 16px #16A34A33; }
        .dw-stat-body { flex:1; min-width:0; }
        .dw-stat-val { font-size:22px; font-weight:900; color:#0F172A; line-height:1.05; letter-spacing:-.6px; white-space:nowrap; }
        .dw-stat-label { font-size:12px; color:#475569; font-weight:700; margin-top:3px; white-space:nowrap; }
        .dw-stat-track { height:6px; background:#F1F5F9; border-radius:6px; }
        .dw-stat-fill { height:6px; border-radius:6px; transition:width .4s; }
        .dw-stat.indigo .dw-stat-fill { background:#4F46E5; }
        .dw-stat.red .dw-stat-fill { background:#DC2626; }
        .dw-stat.orange .dw-stat-fill { background:#EA580C; }
        .dw-stat.green .dw-stat-fill { background:#16A34A; }
        .override-btn { background:linear-gradient(135deg,#818CF8,#6366F1); color:#fff; }
        .override-btn:hover:not(:disabled) { background:linear-gradient(135deg,#6366F1,#4F46E5); }
        .dw-detail-list { margin-top:8px; display:flex; flex-direction:column; gap:5px; }
        .dw-detail-item { display:flex; align-items:center; gap:8px; background:#F8FAFC;
                          border-radius:8px; padding:6px 10px; font-size:11.5px; color:#374151; }
        .dw-detail-note { font-size:11px; color:#9CA3AF; margin-top:4px; font-style:italic; }
      `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="container-fluid" style={{ padding: "24px 20px" }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: 22 }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: 22, color: "#111827" }}>Deduction Waivers</h4>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6B7280" }}>
                Review deductions, approve employee requests, or override any deduction directly
              </p>
            </div>

            {/* ── Stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20, alignItems: "start" }}>
              {STATS.map((s, i) => (
                <div key={i} className={`dw-stat ${s.accent}`}>
                  <div className="dw-stat-top">
                    <div className="dw-stat-icon">
                      <i className={`bi ${s.icon}`} />
                    </div>
                    <div className="dw-stat-body">
                      <div className="dw-stat-val">{s.val}</div>
                      <div className="dw-stat-label">{s.label}</div>
                    </div>
                  </div>
                  <div className="dw-stat-track">
                    <div className="dw-stat-fill" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filters ── */}
            <div className="dw-card" style={{ padding: "13px 18px", marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <select value={month} onChange={e => setMonth(Number(e.target.value))}
                style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid #E5E7EB", fontSize: 13, fontWeight: 600, cursor:"pointer" }}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid #E5E7EB", fontSize: 13, fontWeight: 600, cursor:"pointer" }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search employee…"
                style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 13, minWidth: 180 }}
              />
            </div>

            {/* ── All Deductions ── */}
            <div className="dw-card" style={{ overflow: "hidden" }}>
                {loading ? (
                  <div className="dw-empty"><div className="spinner-border text-primary" /><p style={{ marginTop: 12 }}>Loading…</p></div>
                ) : filteredReports.length === 0 ? (
                  <div className="dw-empty">
                    <i className="bi bi-file-earmark-x" style={{ fontSize: 48, color: "#D1D5DB" }} />
                    <p style={{ marginTop: 12, fontSize: 15 }}>No salary reports for {MONTHS[month]} {year}</p>
                    <p style={{ fontSize: 13, color:"#9CA3AF" }}>No salary data found for this period.</p>
                  </div>
                ) : filteredReports.map(r => {
                  const name    = empName(r.employee);
                  const inits   = getInitials(name);
                  const avatar  = r.employee?.personal?.avatar || null;
                  const [abg, acol] = avatarBg(name);
                  const deductions  = r.deductions || {};
                  const activeLines = DEDUCTION_LINES.filter(l => (deductions[l.key] || 0) > 0);
                  const empId       = r.employee?._id?.toString() || "";
                  const empWaivers  = waivers.filter(w => w.employee?._id?.toString() === empId);
                  const isExpanded  = expandedId === r._id;
                  const hasWaived   = empWaivers.some(w => w.status === "Approved");
                  const attRecords  = r.attendanceRecords || [];
                  const leaveDateMap = r.leaveDateMap || {};

                  // Pre-compute detail data for each deduction type
                  const lateDays    = attRecords.filter(a => {
                    if (a.latePenaltyApplied || (a.latePenaltyAmount || 0) > 0) return true;
                    if (!a.startTime) return false;
                    const t = new Date(a.startTime);
                    return t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
                  });
                  const lunchDays    = attRecords.filter(a => (a.deductions || 0) > 0);
                  const joinDateStr  = r.employee?.professional?.dateOfJoining
                    ? toDateStr(r.employee.professional.dateOfJoining)
                    : null;
                  const absentDates  = getAbsentDates(attRecords, month, year, joinDateStr);
                  const halfDayDates = getHalfDayDates(attRecords);

                  return (
                    <div key={r._id} className="dw-row">
                      {/* ── Employee row header ── */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                        onClick={() => setExpandedId(isExpanded ? null : r._id)}>

                        <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, position:"relative" }}>
                          {avatar && (
                            <img src={avatar} alt="" style={{ width:44, height:44, borderRadius:12, objectFit:"cover", border:`2px solid ${abg}`, position:"absolute", inset:0 }}
                              onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                          )}
                          <div style={{ width:44, height:44, borderRadius:12, background:abg, position:"absolute", inset:0,
                            display: avatar ? "none" : "flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:acol }}>
                            {inits}
                          </div>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{name}</span>
                            {r.employee?.employeeId && (
                              <span style={{ fontSize: 11, color: "#9CA3AF", background: "#F3F4F6", padding: "2px 7px", borderRadius: 6, fontWeight: 600 }}>
                                #{r.employee.employeeId}
                              </span>
                            )}
                            {hasWaived && (
                              <span className="dw-badge" style={{ background: "#DCFCE7", color: "#15803D" }}>
                                <i className="bi bi-shield-check-fill" style={{ fontSize: 9 }} />
                                Waiver active
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                              Net Pay: <strong style={{ color: "#15803D" }}>₹{fmt(r.netPay)}</strong>
                            </span>
                            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                              Deductions: <strong style={{ color: "#DC2626" }}>₹{fmt(deductions.total)}</strong>
                            </span>
                            {(deductions.waived || 0) > 0 && (
                              <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                                Waived: <strong style={{ color: "#15803D" }}>₹{fmt(deductions.waived)}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <button className="dw-expand-btn">
                          <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`} style={{ fontSize: 14 }} />
                        </button>
                      </div>

                      {/* ── Expanded deduction breakdown ── */}
                      {isExpanded && (
                        <div style={{ marginTop: 14, paddingLeft: 56, paddingRight: 4 }}>
                          {activeLines.length === 0 ? (
                            <p style={{ fontSize: 13, color: "#9CA3AF" }}>No deductions applied this month.</p>
                          ) : activeLines.map(line => {
                            const amount        = deductions[line.key] || 0;
                            const waiver        = waiverMap[`${empId}_${line.key}`];
                            const existingWaived = (waiver?.status === "Approved" ? waiver.amount : 0) || 0;
                            const procKey       = `override_${empId}_${line.key}`;

                            // Per-instance coverage (greedy oldest-first)
                            const PER_LATE = 250;
                            const coveredLateCount = Math.min(Math.floor(existingWaived / PER_LATE), lateDays.length);

                            let lunchAcc = 0;
                            const lunchCovered = new Set();
                            [...lunchDays].sort((a, b) => a.date > b.date ? 1 : -1).forEach(a => {
                              if (lunchAcc + (a.deductions || 0) <= existingWaived + 0.5) {
                                lunchAcc += (a.deductions || 0);
                                lunchCovered.add(a._id?.toString());
                              }
                            });

                            const originalAbsentTotal = amount + existingWaived;
                            const perAbsent = absentDates.length > 0 ? Math.round(originalAbsentTotal / absentDates.length) : 0;
                            const coveredAbsentCount = perAbsent > 0 ? Math.min(Math.floor(existingWaived / perAbsent), absentDates.length) : 0;

                            const instArgs = { empId, empName: name, key: line.key, label: line.label, existingWaived, totalRemaining: amount };

                            return (
                              <div key={line.key} className="dw-ded-row">
                                {/* Left: type icon + label + detail dates */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 9, background: line.bg, flexShrink: 0,
                                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <i className={`bi ${line.icon}`} style={{ fontSize: 15, color: line.color }} />
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{line.label}</div>
                                  </div>

                                  {/* ── Absent detail rows ── */}
                                  {line.key === "absent" && absentDates.length > 0 && (
                                    <div className="dw-detail-list">
                                      {absentDates.map((d, i) => {
                                        const leave = leaveDateMap[d];
                                        const leaveColor = leave?.status === "Approved" ? "#15803D" : leave?.status === "Rejected" ? "#DC2626" : "#D97706";
                                        const leaveBg   = leave?.status === "Approved" ? "#DCFCE7" : leave?.status === "Rejected" ? "#FEE2E2"  : "#FEF3C7";
                                        const isCovered = i < coveredAbsentCount;
                                        const instProcKey = `inst_${empId}_absent_${d}`;
                                        return (
                                          <div key={d} className="dw-detail-item" style={{ background: isCovered ? "#F0FDF4" : "#F8FAFC" }}>
                                            <i className="bi bi-calendar-x" style={{ color: isCovered ? "#15803D" : "#DC2626", fontSize: 12 }} />
                                            <span style={{ fontWeight: 600, textDecoration: isCovered ? "line-through" : "none", color: isCovered ? "#9CA3AF" : "#374151" }}>{fmtDate(d)}</span>
                                            {leave ? (
                                              <>
                                                <span style={{ color: "#9CA3AF" }}>—</span>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280" }}>{leave.leaveType}</span>
                                                <span style={{ padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 800, background: leaveBg, color: leaveColor }}>{leave.status}</span>
                                              </>
                                            ) : (
                                              <span style={{ color: "#9CA3AF" }}>— No check-in</span>
                                            )}
                                            {perAbsent > 0 && <span style={{ marginLeft: "auto", color: isCovered ? "#9CA3AF" : "#DC2626", fontWeight: 700, textDecoration: isCovered ? "line-through" : "none", fontSize: 11 }}>−₹{fmt(perAbsent)}</span>}
                                            {isCovered ? (
                                              <span style={{ color: "#15803D", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}><i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} /> Waived</span>
                                            ) : (
                                              <button className="dw-btn override-btn" disabled={!!processing} style={{ padding: "3px 9px", fontSize: 11 }}
                                                onClick={() => handleInstanceWaive({ ...instArgs, instanceAmount: perAbsent })}>
                                                {processing === instProcKey ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} /> : <><i className="bi bi-shield-check" style={{ fontSize: 10 }} /> Waive</>}
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                      <p className="dw-detail-note">* Excludes Sundays; may include holidays</p>
                                    </div>
                                  )}

                                  {/* ── Half Day detail rows ── */}
                                  {line.key === "halfDay" && halfDayDates.length > 0 && (
                                    <div className="dw-detail-list">
                                      {halfDayDates.map((d, i) => {
                                        const hdWaiver = waiverMap[`${empId}_halfDay`];
                                        const hdWaived = (hdWaiver?.status === "Approved" ? hdWaiver.amount : 0) || 0;
                                        const originalHdTotal = (deductions.halfDay || 0) + hdWaived;
                                        const perHalfDay = halfDayDates.length > 0 ? Math.round(originalHdTotal / halfDayDates.length) : 0;
                                        const coveredHdCount = perHalfDay > 0 ? Math.min(Math.floor(hdWaived / perHalfDay), halfDayDates.length) : 0;
                                        const isCovered = i < coveredHdCount;
                                        const instProcKey = `inst_${empId}_halfDay_${d}`;
                                        return (
                                          <div key={d} className="dw-detail-item" style={{ background: isCovered ? "#F0FDF4" : "#F8FAFC" }}>
                                            <i className="bi bi-calendar-half" style={{ color: isCovered ? "#15803D" : "#1D4ED8", fontSize: 12 }} />
                                            <span style={{ fontWeight: 600, textDecoration: isCovered ? "line-through" : "none", color: isCovered ? "#9CA3AF" : "#374151" }}>{fmtDate(d)}</span>
                                            <span style={{ color: "#9CA3AF" }}>— Half day absent</span>
                                            {perHalfDay > 0 && <span style={{ marginLeft: "auto", color: isCovered ? "#9CA3AF" : "#DC2626", fontWeight: 700, textDecoration: isCovered ? "line-through" : "none", fontSize: 11 }}>−₹{fmt(perHalfDay)}</span>}
                                            {isCovered ? (
                                              <span style={{ color: "#15803D", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}><i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} /> Waived</span>
                                            ) : (
                                              <button className="dw-btn override-btn" disabled={!!processing} style={{ padding: "3px 9px", fontSize: 11 }}
                                                onClick={() => handleInstanceWaive({ ...instArgs, instanceAmount: perHalfDay })}>
                                                {processing === instProcKey ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} /> : <><i className="bi bi-shield-check" style={{ fontSize: 10 }} /> Waive</>}
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                      <p className="dw-detail-note">* Half day absent — 50% day deduction</p>
                                    </div>
                                  )}

                                  {/* ── Late detail rows ── */}
                                  {line.key === "late" && lateDays.length > 0 && (
                                    <div className="dw-detail-list">
                                      {lateDays.map((a, i) => {
                                        const isCovered = i < coveredLateCount;
                                        const instProcKey = `inst_${empId}_late_${a.date}`;
                                        return (
                                          <div key={a._id} className="dw-detail-item" style={{ background: isCovered ? "#F0FDF4" : "#F8FAFC" }}>
                                            <i className="bi bi-alarm" style={{ color: isCovered ? "#15803D" : "#D97706", fontSize: 12 }} />
                                            <span style={{ fontWeight: 600, textDecoration: isCovered ? "line-through" : "none", color: isCovered ? "#9CA3AF" : "#374151" }}>{fmtDate(a.date)}</span>
                                            <span style={{ color: "#9CA3AF" }}>— Check-in:</span>
                                            <span style={{ fontWeight: 700, color: isCovered ? "#9CA3AF" : "#D97706" }}>{fmtTime(a.startTime)}</span>
                                            <span style={{ marginLeft: "auto", color: isCovered ? "#9CA3AF" : "#DC2626", fontWeight: 700, textDecoration: isCovered ? "line-through" : "none", fontSize: 11 }}>−₹{fmt(PER_LATE)}</span>
                                            {isCovered ? (
                                              <span style={{ color: "#15803D", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}><i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} /> Waived</span>
                                            ) : (
                                              <button className="dw-btn override-btn" disabled={!!processing} style={{ padding: "3px 9px", fontSize: 11 }}
                                                onClick={() => handleInstanceWaive({ ...instArgs, instanceAmount: PER_LATE })}>
                                                {processing === instProcKey ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} /> : <><i className="bi bi-shield-check" style={{ fontSize: 10 }} /> Waive</>}
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* ── Lunch detail rows ── */}
                                  {line.key === "lunch" && lunchDays.length > 0 && (
                                    <div className="dw-detail-list">
                                      {lunchDays.map(a => {
                                        const lunchMs  = getLunchBreakMs(a);
                                        const lunchBrk = a.breaks?.find(b => b.type === "lunch" && b.start);
                                        const isCovered = lunchCovered.has(a._id?.toString());
                                        const instProcKey = `inst_${empId}_lunch_${a.date}`;
                                        return (
                                          <div key={a._id} className="dw-detail-item" style={{ background: isCovered ? "#F0FDF4" : "#F8FAFC" }}>
                                            <i className="bi bi-cup-hot" style={{ color: isCovered ? "#15803D" : "#A21CAF", fontSize: 12 }} />
                                            <span style={{ fontWeight: 600, textDecoration: isCovered ? "line-through" : "none", color: isCovered ? "#9CA3AF" : "#374151" }}>{fmtDate(a.date)}</span>
                                            {lunchBrk?.start && <><span style={{ color: "#9CA3AF" }}>— Start:</span><span style={{ fontWeight: 700, color: isCovered ? "#9CA3AF" : "#A21CAF" }}>{fmtTime(lunchBrk.start)}</span></>}
                                            {lunchBrk?.end  && <><span style={{ color: "#9CA3AF" }}>End:</span><span style={{ fontWeight: 700, color: isCovered ? "#9CA3AF" : "#A21CAF" }}>{fmtTime(lunchBrk.end)}</span></>}
                                            {lunchMs > 0 && <span style={{ color: "#6B7280" }}>({fmtMins(lunchMs)})</span>}
                                            <span style={{ marginLeft: "auto", color: isCovered ? "#9CA3AF" : "#DC2626", fontWeight: 700, textDecoration: isCovered ? "line-through" : "none", fontSize: 11 }}>−₹{fmt(a.deductions)}</span>
                                            {isCovered ? (
                                              <span style={{ color: "#15803D", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}><i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} /> Waived</span>
                                            ) : (
                                              <button className="dw-btn override-btn" disabled={!!processing} style={{ padding: "3px 9px", fontSize: 11 }}
                                                onClick={() => handleInstanceWaive({ ...instArgs, instanceAmount: a.deductions || 0 })}>
                                                {processing === instProcKey ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} /> : <><i className="bi bi-shield-check" style={{ fontSize: 10 }} /> Waive</>}
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Right: total remaining amount + Waive All button */}
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0, paddingTop: 4 }}>
                                  <span style={{ fontWeight: 800, fontSize: 15, color: "#DC2626" }}>₹{fmt(amount)}</span>
                                  <button className="dw-btn override-btn"
                                    disabled={!!processing}
                                    onClick={() => { setOverrideModal({ empId, empName: name, key: line.key, label: line.label, amount }); setRemark(""); }}>
                                    {processing === procKey
                                      ? <span className="spinner-border spinner-border-sm" />
                                      : <><i className="bi bi-shield-check" /> Waive All</>}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </section>
        </div>
      </div>

      {/* ══════════════════════════════════
          ADMIN OVERRIDE MODAL
      ══════════════════════════════════ */}
      {overrideModal && (
        <div className="dw-overlay" onClick={() => setOverrideModal(null)}>
          <div className="dw-modal" onClick={e => e.stopPropagation()}>
            <div style={{ background: "linear-gradient(135deg,#818CF8,#6366F1)", padding: "22px 26px" }}>
              <i className="bi bi-shield-check-fill" style={{ fontSize: 32, color: "#fff", display: "block", marginBottom: 8 }} />
              <h5 style={{ margin: 0, color: "#fff", fontWeight: 800 }}>Admin Waiver Override</h5>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.85)", fontSize: 13 }}>
                Waive this deduction directly — no employee request needed
              </p>
            </div>
            <div style={{ padding: "22px 26px" }}>
              <div style={{ background: "#EEF2FF", borderRadius: 12, padding: "13px 16px", marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{overrideModal.empName}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{overrideModal.label} deduction</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#DC2626" }}>₹{fmt(overrideModal.amount)}</div>
                </div>
              </div>

              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "11px 14px", marginBottom: 18 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
                  <i className="bi bi-info-circle-fill" style={{ marginRight: 5, verticalAlign: "middle" }} />
                  This will immediately mark the deduction as <strong>waived</strong>. The amount will be excluded when salary is next generated for {MONTHS[month]} {year}.
                </p>
              </div>

              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5 }}>
                Reason / note (optional)
              </label>
              <textarea rows={3} value={remark} onChange={e => setRemark(e.target.value)}
                placeholder="E.g. Approved by management, special case, medical emergency…"
                style={{ width: "100%", borderRadius: 10, border: "1.5px solid #E5E7EB", padding: "10px 12px",
                  fontSize: 13, resize: "none", boxSizing: "border-box", outline: "none" }} />

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="dw-btn" onClick={() => setOverrideModal(null)}
                  style={{ flex: 1, background: "#F3F4F6", color: "#374151", padding: "10px" }}>Cancel</button>
                <button className="dw-btn override-btn"
                  disabled={processing === `override_${overrideModal.empId}_${overrideModal.key}`}
                  onClick={handleOverride}
                  style={{ flex: 2, padding: "10px", fontSize: 13 }}>
                  {processing === `override_${overrideModal.empId}_${overrideModal.key}`
                    ? <span className="spinner-border spinner-border-sm" />
                    : <><i className="bi bi-shield-check" /> Waive Deduction</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
