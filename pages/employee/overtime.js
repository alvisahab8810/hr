// pages/employee/overtime.js
import { toast } from "react-toastify";
import Dashnav from "@/components/Dashnav";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import EmployeeLeftbar from "@/components/employee/Leftbar";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function calcDuration(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  const h = Math.floor(diff / 60), mn = diff % 60;
  return { label: h > 0 ? `${h}h ${mn > 0 ? mn + "m" : ""}`.trim() : `${mn}m`, overnight: diff > 12 * 60 };
}

function minsLabel(m) {
  if (!m) return "";
  const h = Math.floor(m / 60), mn = m % 60;
  return h > 0 ? `${h}h${mn > 0 ? ` ${mn}m` : ""}` : `${mn}m`;
}

// Only rule: block 6:00 PM – 6:59 PM (the 1-hour buffer after office closes)
function isValidOTStartTime(timeStr) {
  if (!timeStr) return true;
  const [h] = timeStr.split(":").map(Number);
  return h !== 18; // 18 = 6 PM hour
}

// ── OT Window (includes approved extensions) ──────────────────────────────────
function getOTWindow(ot) {
  const d  = new Date(ot.date);
  const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const start = new Date(`${ds}T${ot.startTime}:00`);
  let   end   = new Date(`${ds}T${ot.endTime}:00`);
  if (end <= start) end.setDate(end.getDate() + 1);
  const extMins = (ot.extensions || [])
    .filter(e => e.status === "Approved")
    .reduce((s, e) => s + (e.extraMins || 0), 0);
  if (extMins > 0) end = new Date(end.getTime() + extMins * 60 * 1000);
  return { start, end };
}

function fmtMs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

// ── OT Timer component ────────────────────────────────────────────────────────
function OTTimer({ ot, compact = false }) {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const { start, end } = getOTWindow(ot);
  const totalMs   = end - start;
  const elapsedMs = now - start;
  if (now >= end) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6,
        background:"#DCFCE7", borderRadius:8, padding: compact ? "3px 10px" : "8px 14px",
        fontSize: compact ? 11 : 13, color:"#15803D", fontWeight:700 }}>
        <i className="bi bi-check-circle-fill" /> OT Completed
      </div>
    );
  }
  if (now < start) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:7,
        background:"#2C2269", borderRadius:10,
        padding: compact ? "4px 10px" : "9px 14px",
        fontSize: compact ? 11 : 13, color:"#fff", fontWeight:700,
        boxShadow:"0 2px 8px rgba(44,34,105,.35)" }}>
        <i className="bi bi-alarm-fill" style={{ opacity:.8 }} />
        Starts in {fmtMs(start - now)}
      </div>
    );
  }
  const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  return (
    <div style={{ background:"linear-gradient(135deg,#2C2269,#3D2F8A)", borderRadius:12,
      padding: compact ? "5px 11px" : "12px 16px", minWidth: compact ? 0 : 200,
      boxShadow:"0 2px 10px rgba(44,34,105,.3)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: compact ? 0 : 6 }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:"#FCD34D", flexShrink:0,
          display:"inline-block", animation:"otPulse 1s ease-in-out infinite" }} />
        <span style={{ fontFamily:"monospace", fontSize: compact ? 13 : 22,
          fontWeight:800, color:"#fff", letterSpacing:2 }}>
          {fmtMs(elapsedMs)}
        </span>
        {!compact && (
          <span style={{ fontSize:11, color:"rgba(255,255,255,.6)", marginLeft:"auto" }}>
            {fmtMs(Math.max(0, end - now))} left
          </span>
        )}
      </div>
      {!compact && (
        <div style={{ background:"rgba(255,255,255,.2)", borderRadius:4, height:5, overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%",
            background:"linear-gradient(90deg,#FCD34D,#2563EB)", borderRadius:4,
            transition:"width .5s ease" }} />
        </div>
      )}
    </div>
  );
}

// ── Custom AM/PM Time Picker ──────────────────────────────────────────────────
function TimePicker({ value, onChange, label, required }) {
  const parseVal = (v) => {
    if (!v) return { h12: "", min: "", ampm: "AM" };
    const [h, m] = v.split(":").map(Number);
    return { h12: String(h % 12 || 12), min: String(m).padStart(2, "0"), ampm: h >= 12 ? "PM" : "AM" };
  };
  const initial = parseVal(value);
  const [h12,  setH12]  = React.useState(initial.h12);
  const [min,  setMin]  = React.useState(initial.min);
  const [ampm, setAmpm] = React.useState(initial.ampm);

  const emit = (newH12, newMin, newAmpm) => {
    if (newH12 && newMin) {
      let h = Number(newH12) % 12;
      if (newAmpm === "PM") h += 12;
      onChange(`${String(h).padStart(2, "0")}:${newMin}`);
    } else {
      onChange("");
    }
  };

  const handleH12  = (v) => { setH12(v);  emit(v,   min,  ampm); };
  const handleMin  = (v) => { setMin(v);  emit(h12,  v,    ampm); };
  const handleAMPM = (v) => { setAmpm(v); emit(h12,  min,  v);    };

  return (
    <div>
      <span style={{ fontSize:12.5, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>
        {label} {required && <span style={{ color:"#DC2626" }}>*</span>}
      </span>
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        <select className="reim-input" style={{ flex:1, padding:"9px 8px", textAlign:"center", minWidth:0 }}
          value={h12 || ""} onChange={e => handleH12(e.target.value)}>
          <option value="">HH</option>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
            <option key={h} value={String(h)}>{String(h).padStart(2,"0")}</option>
          ))}
        </select>
        <span style={{ fontWeight:700, color:"#9CA3AF", fontSize:18, flexShrink:0 }}>:</span>
        <select className="reim-input" style={{ flex:1, padding:"9px 8px", textAlign:"center", minWidth:0 }}
          value={min || ""} onChange={e => handleMin(e.target.value)}>
          <option value="">MM</option>
          {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:"1.5px solid #E5E7EB", flexShrink:0 }}>
          {["AM","PM"].map(s => (
            <button key={s} type="button" onClick={() => handleAMPM(s)}
              style={{ padding:"9px 12px", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, transition:"all .15s",
                background: ampm === s ? "#4F46E5" : "#fff", color: ampm === s ? "#fff" : "#6B7280" }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      {h12 && min && (
        <div style={{ fontSize:11, color:"#4F46E5", fontWeight:600, marginTop:5 }}>
          ⏰ {h12.padStart(2,"0")}:{min} {ampm}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Overtime() {
  const [showOTModal,   setShowOTModal]   = useState(false);
  const [project,       setProject]       = useState("");
  const [date,          setDate]          = useState("");
  const [otType,        setOtType]        = useState("");
  const [startTime,     setStartTime]     = useState("");
  const [endTime,       setEndTime]       = useState("");
  const [reason,        setReason]        = useState("");
  const [otApprover,    setOtApprover]    = useState("");
  const [tasks,         setTasks]         = useState("");
  const [overtimeList,  setOvertimeList]  = useState([]);
  const [remarkModal,   setRemarkModal]   = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [holidays,      setHolidays]      = useState([]);
  const [holidayWarning,setHolidayWarning]= useState("");

  // Extension modal state
  const [extendTarget,   setExtendTarget]   = useState(null); // OT being extended
  const [extendMins,     setExtendMins]     = useState("60");
  const [extendReason,   setExtendReason]   = useState("");
  const [submittingExt,  setSubmittingExt]  = useState(false);

  // ── Fetch OT list ────────────────────────────────────────────────────────
  const fetchOT = useCallback(async () => {
    try {
      const token = localStorage.getItem("employeeToken");
      const res   = await fetch("/api/employee/overtime/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setOvertimeList(data.overtimeRequests);
    } catch (err) {
      console.error("Failed to load OT list:", err);
    }
  }, []);

  useEffect(() => { fetchOT(); }, [fetchOT]);

  useEffect(() => {
    fetch("/api/payroll/holidays/upcoming")
      .then(r => r.json())
      .then(d => { if (d.success) setHolidays(d.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!date) { setHolidayWarning(""); return; }
    const matched = holidays.find(h => {
      const s = new Date(h.startDate).toISOString().slice(0, 10);
      const e = new Date(h.endDate).toISOString().slice(0, 10);
      return date >= s && date <= e;
    });
    if (matched) {
      setHolidayWarning(`${matched.name} is a public holiday. OT on this date will be treated as Holiday OT.`);
      if (!otType) setOtType("Holiday OT");
    } else {
      setHolidayWarning("");
    }
  }, [date, holidays]);

  const duration = calcDuration(startTime, endTime);

  const filteredOT = selectedMonth
    ? overtimeList.filter(ot => (ot.date ? new Date(ot.date).toISOString().slice(0, 7) : "") === selectedMonth)
    : overtimeList;

  const pendingCount = overtimeList.filter(ot => ot.status === "Pending").length;

  const resetForm = () => {
    setProject(""); setDate(""); setOtType(""); setStartTime("");
    setEndTime(""); setReason(""); setTasks(""); setOtApprover("");
    setHolidayWarning("");
  };

  // ── Submit new OT ────────────────────────────────────────────────────────
  const handleCreateOT = async () => {
    if (!project || !date || !otType || !startTime || !endTime || !reason || !tasks || !otApprover) {
      toast.error("Please fill all required fields"); return;
    }

    // Block 6:00 PM – 6:59 PM start times
    if (!isValidOTStartTime(startTime)) {
      toast.error("OT cannot start between 6:00 PM and 6:59 PM. The first hour after office is not counted as OT. Please start from 7:00 PM.");
      return;
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    const actualMins = diffMins === 0 ? 0 : diffMins > 0 ? diffMins : diffMins + 24 * 60;

    if (actualMins === 0) { toast.error("Start and end time cannot be the same"); return; }
    if (actualMins > 16 * 60) { toast.error("OT duration cannot exceed 16 hours"); return; }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("employeeToken");
      const res   = await fetch("/api/employee/overtime/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project, date, otType, startTime, endTime, reason, tasks, otApprover }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message); return; }
      toast.success("Overtime request submitted — awaiting admin approval");
      setOvertimeList(prev => [data.overtime, ...prev]);
      setShowOTModal(false);
      resetForm();
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  };

  // ── Submit extension request ──────────────────────────────────────────────
  const handleExtend = async () => {
    if (!extendTarget || !extendMins) return;
    setSubmittingExt(true);
    try {
      const token = localStorage.getItem("employeeToken");
      const res   = await fetch("/api/employee/overtime/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otId: extendTarget._id, extraMins: Number(extendMins), reason: extendReason }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message); return; }
      toast.success("Extension request sent — awaiting admin approval");
      setOvertimeList(prev => prev.map(ot => ot._id === extendTarget._id ? data.overtime : ot));
      setExtendTarget(null); setExtendMins("60"); setExtendReason("");
    } catch { toast.error("Something went wrong"); }
    finally { setSubmittingExt(false); }
  };

  // ── Helpers for extension display ─────────────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];

  const canExtend = (ot) => {
    if (ot.status !== "Approved") return false;
    const ds = new Date(ot.date).toISOString().split("T")[0];
    if (ds !== todayStr) return false;
    const hasPending = (ot.extensions || []).some(e => e.status === "Pending");
    return !hasPending;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section className="over-time-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* ── Brand palette ──
             Primary dark purple : #2C2269
             Active blue         : #2563EB
             Soft purple bg      : #EDE9F8
             Deep purple text    : #1E1552
          */

          /* ── Alert banners (modal) ── */
          .ot-alert { display:flex; align-items:flex-start; gap:12px;
            border-radius:12px; padding:12px 14px; margin-bottom:10px; }
          .ot-alert-icon { width:32px; height:32px; border-radius:9px; flex-shrink:0;
            display:flex; align-items:center; justify-content:center; font-size:14px; margin-top:1px; }
          .ot-alert-title { font-size:13px; font-weight:700; margin-bottom:2px; }
          .ot-alert-body  { font-size:12px; line-height:1.6; }
          .ot-alert-info  { background:#EDE9F8; border:1.5px solid #C4B5FD; color:#1E1552; }
          .ot-alert-info .ot-alert-icon { background:#C4B5FD; color:#2C2269; }
          .ot-alert-error { background:#FFF1F2; border:1.5px solid #FECDD3; color:#9F1239; }
          .ot-alert-error .ot-alert-icon { background:#FFE4E6; color:#E11D48; }
          .ot-alert-warn  { background:#FFFBEB; border:1.5px solid #FDE68A; color:#78350F; }
          .ot-alert-warn .ot-alert-icon  { background:#FEF3C7; color:#B45309; }
          .ot-alert-holiday { background:#FFF7ED; border:1.5px solid #FDBA74; color:#9A3412; }
          .ot-alert-holiday .ot-alert-icon { background:#FFEDD5; color:#C2410C; }

          /* ── Duration row ── */
          .ot-duration-row { display:flex; align-items:center; gap:10px;
            background:#EDE9F8; border-radius:10px; padding:9px 14px;
            font-size:13px; color:#2C2269; font-weight:600; }

          /* ── Active OT banner ── */
          .ot-active-banner {
            background: linear-gradient(135deg, #2C2269 0%, #3D2F8A 60%, #2563EB 100%);
            border-radius:18px; padding:22px 26px; margin-bottom:20px;
            display:flex; align-items:center; gap:20px; color:#fff;
            box-shadow: 0 8px 32px rgba(44,34,105,0.28);
            position:relative; overflow:hidden;
          }
          .ot-active-banner::before {
            content:""; position:absolute; top:-30px; right:-30px;
            width:140px; height:140px; border-radius:50%;
            background:rgba(255,255,255,0.06); pointer-events:none;
          }
          .ot-active-banner-icon { width:54px; height:54px; border-radius:16px;
            background:rgba(255,255,255,0.15); border:1.5px solid rgba(255,255,255,0.2);
            display:flex; align-items:center; justify-content:center;
            font-size:22px; flex-shrink:0; backdrop-filter:blur(4px); }
          .ot-active-banner-info { flex:1; min-width:0; }
          .ot-active-banner-title { font-size:10px; font-weight:700; letter-spacing:.12em;
            text-transform:uppercase; opacity:0.7; margin-bottom:4px; }
          .ot-active-banner-project { font-size:18px; font-weight:800; letter-spacing:-.3px; }
          .ot-active-banner-time { font-size:12px; opacity:0.65; margin-top:4px; }

          /* ── Pending approval banner ── */
          .ot-pending-alert { display:flex; align-items:flex-start; gap:12px;
            background:linear-gradient(135deg,#FFFBEB,#FEF9C3);
            border:2px solid #FCD34D; border-radius:14px;
            padding:14px 18px; margin-bottom:18px;
            box-shadow:0 2px 12px rgba(253,211,77,.2); }
          .ot-pending-alert-icon { width:38px; height:38px; border-radius:11px;
            background:#FEF3C7; display:flex; align-items:center; justify-content:center;
            font-size:17px; color:#D97706; flex-shrink:0; }
          .ot-pending-alert-title { font-size:13px; font-weight:800; color:#92400E; }
          .ot-pending-alert-body  { font-size:12px; color:#B45309; margin-top:3px; line-height:1.5; }

          /* ── OT Policy grid ── */
          .ot-policy-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
            gap:10px; margin-bottom:20px; }
          .ot-policy-card { background:#fff; border-radius:14px; border:1.5px solid #EDE9F8;
            padding:14px 16px; display:flex; align-items:flex-start; gap:12px;
            box-shadow:0 1px 6px rgba(44,34,105,.06); }
          .ot-policy-card-icon { width:36px; height:36px; border-radius:10px; flex-shrink:0;
            display:flex; align-items:center; justify-content:center; font-size:15px; }
          .ot-policy-card-title { font-size:11px; font-weight:700; color:#2C2269; margin-bottom:3px;
            text-transform:uppercase; letter-spacing:.04em; }
          .ot-policy-card-body  { font-size:12px; color:#374151; line-height:1.5; }

          /* ── Extension pills ── */
          .ot-ext-pill { display:inline-flex; align-items:center; gap:4px;
            padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; margin-top:3px; }
          .ot-ext-pill.pending  { background:#FEF9C3; color:#854D0E; }
          .ot-ext-pill.approved { background:#DCFCE7; color:#166534; }
          .ot-ext-pill.rejected { background:#FEE2E2; color:#991B1B; }

          /* ── Extend button ── */
          .ot-extend-btn { display:inline-flex; align-items:center; gap:5px;
            background:#EDE9F8; color:#2C2269; border:1.5px solid #C4B5FD;
            border-radius:8px; padding:5px 11px; font-size:11px; font-weight:700;
            cursor:pointer; margin-top:5px; transition:all .15s; }
          .ot-extend-btn:hover { background:#2C2269; color:#fff; border-color:#2C2269; }

          /* ── Table scroll fix ── */
          .ot-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:0 0 12px 12px; }
          .ot-table-wrap .reim-table { min-width:680px; }

          /* ── Section head row ── */
          .ot-section-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

          @keyframes otPulse {
            0%,100% { opacity:1; transform:scale(1); }
            50% { opacity:.4; transform:scale(1.4); }
          }

          /* ══════════════════════════════
             MOBILE (≤ 640px)
          ══════════════════════════════ */
          @media (max-width: 640px) {
            /* Page heading */
            .reim-page-head { margin-bottom:14px; }
            .reim-page-head h2 { font-size:20px; }

            /* Pending banner */
            .ot-pending-alert { padding:12px 13px; gap:10px; border-radius:12px; }
            .ot-pending-alert-icon { width:32px; height:32px; font-size:14px; }
            .ot-pending-alert-title { font-size:12px; }
            .ot-pending-alert-body { font-size:11px; }

            /* Active OT banner — stack vertically */
            .ot-active-banner {
              flex-direction:column; align-items:flex-start;
              padding:16px 18px; gap:14px; border-radius:16px;
            }
            .ot-active-banner-icon { width:44px; height:44px; font-size:18px; }
            .ot-active-banner-project { font-size:16px; }
            .ot-active-banner-time { font-size:11px; }
            .ot-active-banner .ot-timer-wrap { width:100%; }

            /* Policy grid — 1 column on mobile */
            .ot-policy-grid { grid-template-columns:1fr; gap:8px; }
            .ot-policy-card { padding:11px 13px; border-radius:12px; }
            .ot-policy-card-icon { width:32px; height:32px; font-size:13px; }
            .ot-policy-card-title { font-size:10px; }
            .ot-policy-card-body { font-size:11.5px; }

            /* Section head — stack title & controls */
            .reim-section-head { flex-direction:column; gap:12px; }
            .ot-section-actions { width:100%; justify-content:space-between; }
            .ot-section-actions input[type="month"] { font-size:12px; }

            /* Submit button — compact on mobile */
            .reim-submit-btn { padding:8px 12px; font-size:12px; white-space:nowrap; }

            /* Duration row */
            .ot-duration-row { font-size:12px; }

            /* Extend btn in table */
            .ot-extend-btn { font-size:10px; padding:4px 8px; }
          }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/home.svg" alt="" /> Overtime
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="reim-page-head">
                <h2>Overtime</h2>
                <p>Request overtime approval</p>
              </div>

              {/* ── Pending approval alert ── */}
              {pendingCount > 0 && (
                <div className="ot-pending-alert">
                  <div className="ot-pending-alert-icon">
                    <i className="bi bi-exclamation-triangle-fill" />
                  </div>
                  <div>
                    <div className="ot-pending-alert-title">
                      ⚠ Approval Required — {pendingCount} Pending Request{pendingCount > 1 ? "s" : ""}
                    </div>
                    <div className="ot-pending-alert-body">
                      You have {pendingCount} overtime request{pendingCount > 1 ? "s" : ""} waiting for admin approval.
                      <strong> Do not start overtime work until you receive approval.</strong> Your request will be reviewed shortly.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Active OT Banner ── */}
              {(() => {
                const activeOT = overtimeList.find(ot => {
                  if (ot.status !== "Approved") return false;
                  const ds = new Date(ot.date).toISOString().split("T")[0];
                  return ds === todayStr;
                });
                if (!activeOT) return null;
                const { start, end } = getOTWindow(activeOT);
                const now = new Date();
                const isActive   = now >= start && now < end;
                const isUpcoming = now < start;
                if (!isActive && !isUpcoming) return null;
                const pendingExt = (activeOT.extensions || []).find(e => e.status === "Pending");
                return (
                  <div className="ot-active-banner">
                    <div className="ot-active-banner-icon">{isActive ? "🔴" : "⏰"}</div>
                    <div className="ot-active-banner-info">
                      <div className="ot-active-banner-title">
                        {isActive ? "OVERTIME IN PROGRESS" : "OVERTIME SCHEDULED TODAY"}
                      </div>
                      <div className="ot-active-banner-project">{activeOT.project}</div>
                      <div className="ot-active-banner-time">
                        {fmtTime(activeOT.startTime)} → {fmtTime(activeOT.endTime)} · {activeOT.otType}
                        {(activeOT.extensions || []).filter(e => e.status === "Approved").length > 0 && (
                          <span style={{ marginLeft:6, background:"rgba(255,255,255,0.2)", borderRadius:4, padding:"1px 6px", fontSize:10 }}>
                            +{minsLabel((activeOT.extensions || []).filter(e => e.status === "Approved").reduce((s,e)=>s+e.extraMins,0))} extended
                          </span>
                        )}
                      </div>
                      {pendingExt && (
                        <div style={{ marginTop:5, fontSize:11, background:"rgba(255,255,255,0.15)", borderRadius:6, padding:"3px 8px", display:"inline-flex", alignItems:"center", gap:5 }}>
                          <i className="bi bi-clock-fill" /> Extension of +{minsLabel(pendingExt.extraMins)} pending admin approval…
                        </div>
                      )}
                      {!pendingExt && isActive && (
                        <button className="ot-extend-btn" style={{ marginTop:8, background:"rgba(255,255,255,0.15)", color:"#fff", border:"1.5px solid rgba(255,255,255,0.3)" }}
                          onClick={() => setExtendTarget(activeOT)}>
                          <i className="bi bi-plus-circle-fill" /> Request Extension
                        </button>
                      )}
                    </div>
                    <div className="ot-timer-wrap"><OTTimer ot={activeOT} /></div>
                  </div>
                );
              })()}

              {/* ── OT Policy Cards ── */}
              <div className="ot-policy-grid" style={{ marginBottom:20 }}>
                {[
                  { icon:"bi-clock", bg:"#EDE9F8", ic:"#2C2269",
                    title:"Office Hours", body:"10:00 AM – 6:00 PM (Mon – Sat)" },
                  { icon:"bi-slash-circle", bg:"#FEE2E2", ic:"#DC2626",
                    title:"OT Blocked Zone", body:"6:00 PM – 6:59 PM — first hour after office is NOT counted as OT" },
                  { icon:"bi-check-circle-fill", bg:"#DCFCE7", ic:"#15803D",
                    title:"Valid OT Slot", body:"7:00 PM onwards — any day including weekends & holidays" },
                  { icon:"bi-shield-lock-fill", bg:"#EDE9F8", ic:"#2563EB",
                    title:"Approval First", body:"Admin must approve before you start overtime work" },
                  { icon:"bi-currency-rupee", bg:"#FEF3C7", ic:"#B45309",
                    title:"OT Pay Rate", body:"1.5× your hourly rate for all approved OT hours" },
                ].map((p, i) => (
                  <div key={i} className="ot-policy-card">
                    <div className="ot-policy-card-icon" style={{ background:p.bg, color:p.ic }}>
                      <i className={`bi ${p.icon}`} />
                    </div>
                    <div>
                      <div className="ot-policy-card-title">{p.title}</div>
                      <div className="ot-policy-card-body">{p.body}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="reim-section">
                <div className="reim-section-head">
                  <div>
                    <h4>My Overtime Requests</h4>
                    <p>View your overtime request history</p>
                  </div>
                  <div className="ot-section-actions">
                    <div style={{ display:"flex", alignItems:"center", gap:8, background:"#F9FAFB",
                      border:"1.5px solid #E5E7EB", borderRadius:10, padding:"6px 12px", flex:1, maxWidth:180 }}>
                      <i className="bi bi-calendar3" style={{ color:"#6B7280", fontSize:14 }} />
                      <input type="month" value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        style={{ border:"none", background:"transparent", outline:"none",
                          fontSize:13, color:"#374151", fontWeight:600, cursor:"pointer", width:"100%" }} />
                    </div>
                    <button className="reim-submit-btn" onClick={() => setShowOTModal(true)}>
                      <img src="/icons/employee/plus.svg" alt="" /> Submit Overtime
                    </button>
                  </div>
                </div>

                <div className="ot-table-wrap">
                <table className="reim-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>OT Type</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>OT Access Given By</th>
                      <th>Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOT.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign:"center" }}>No overtime requests for this month</td>
                      </tr>
                    ) : (
                      filteredOT.map(ot => {
                        const dur = calcDuration(ot.startTime, ot.endTime);
                        const otDay = ot.date ? new Date(ot.date).toISOString().split("T")[0] : "";
                        const exts  = ot.extensions || [];
                        return (
                          <tr key={ot._id}>
                            <td>{new Date(ot.date).toLocaleDateString("en-GB")}</td>
                            <td>
                              <div style={{ fontWeight:600, color:"#111827", fontSize:13 }}>{ot.project}</div>
                              {ot.reason && (
                                <div style={{ fontSize:11, color:"#6B7280", marginTop:3, display:"flex", alignItems:"flex-start", gap:4 }}>
                                  <i className="bi bi-chat-left-text" style={{ color:"#9CA3AF", flexShrink:0, marginTop:1 }} />
                                  <span style={{ lineHeight:1.5 }}>{ot.reason}</span>
                                </div>
                              )}
                              {ot.tasks && (
                                <div style={{ fontSize:11, color:"#6B7280", marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                                  <i className="bi bi-list-task" style={{ color:"#9CA3AF" }} />
                                  <span>{ot.tasks}</span>
                                </div>
                              )}
                            </td>
                            <td><span className="tag blue">{ot.otType}</span></td>
                            <td>
                              {fmtTime(ot.startTime)} – {fmtTime(ot.endTime)}
                              {dur?.overnight && (
                                <span style={{ fontSize:10, background:"#EEF2FF", color:"#4F46E5",
                                  borderRadius:4, padding:"1px 5px", marginLeft:4, fontWeight:700 }}>
                                  +1 day
                                </span>
                              )}
                              <br />
                              <small className="text-muted">{dur?.label || "--"}</small>
                              {/* Extension pills */}
                              {exts.length > 0 && (
                                <div style={{ marginTop:4 }}>
                                  {exts.map((ext, i) => (
                                    <div key={i} className={`ot-ext-pill ${ext.status.toLowerCase()}`}>
                                      <i className={`bi bi-${ext.status==="Approved"?"plus-circle-fill":ext.status==="Rejected"?"x-circle-fill":"clock-fill"}`} style={{ fontSize:9 }} />
                                      +{minsLabel(ext.extraMins)} {ext.status}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Timer for today's active OT */}
                              {ot.status === "Approved" && otDay === todayStr && (
                                <div style={{ marginTop:6 }}><OTTimer ot={ot} compact /></div>
                              )}
                              {/* Extend button */}
                              {canExtend(ot) && (
                                <button className="ot-extend-btn" onClick={() => setExtendTarget(ot)}>
                                  <i className="bi bi-plus-circle" /> Extend OT
                                </button>
                              )}
                            </td>
                            <td>
                              {ot.status === "Rejected" ? (
                                <button className="reim-view-remark-btn" onClick={() => setRemarkModal(ot)}>
                                  View Remark
                                </button>
                              ) : (
                                <div>
                                  <span className={`tag ${ot.status==="Approved"?"green":ot.status==="Pending"?"blue":"red"}`}>
                                    {ot.status}
                                  </span>
                                  {ot.status === "Pending" && (
                                    <div style={{ fontSize:11, color:"#D97706", marginTop:4, fontWeight:700,
                                      display:"flex", alignItems:"center", gap:4 }}>
                                      <i className="bi bi-clock-fill" style={{ fontSize:10 }} />
                                      Awaiting admin approval
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td><span className="tag blue">{ot.otApprover || "-"}</span></td>
                            <td>{ot.approvedBy?.name || "Admin"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ═══ OT Modal ═══ */}
        {showOTModal && (
          <div className="reim-modal-root">
            <div className="reim-modal-backdrop" onClick={() => { setShowOTModal(false); resetForm(); }} />
            <div className="reim-modal-card">
              <div className="reim-modal-header">
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"#EEF2FF",
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <i className="bi bi-clock-history" style={{ color:"#4F46E5", fontSize:16 }} />
                  </div>
                  <div>
                    <div className="reim-modal-title" style={{ fontSize:16, marginBottom:1 }}>New OT Request</div>
                    <div style={{ fontSize:11, color:"#9CA3AF", fontWeight:500 }}>Submit overtime for admin approval</div>
                  </div>
                </div>
                <button type="button" className="reim-modal-close"
                  onClick={() => { setShowOTModal(false); resetForm(); }}>✕</button>
              </div>

              <form onSubmit={e => { e.preventDefault(); handleCreateOT(); }}>
                <div className="reim-modal-body">

                  {/* Holiday warning */}
                  {holidayWarning && (
                    <div className="ot-alert ot-alert-holiday">
                      <div className="ot-alert-icon"><i className="bi bi-calendar-x-fill" /></div>
                      <div>
                        <div className="ot-alert-title">Public Holiday</div>
                        <div className="ot-alert-body">{holidayWarning}</div>
                      </div>
                    </div>
                  )}

                  {/* OT time rule notice */}
                  <div className="ot-alert ot-alert-info">
                    <div className="ot-alert-icon"><i className="bi bi-info-circle-fill" /></div>
                    <div>
                      <div className="ot-alert-title">OT Hours Policy</div>
                      <div className="ot-alert-body">
                        Start time between <strong>6:00 PM – 6:59 PM</strong> is not allowed.
                        The first hour after office close is not counted as OT. Start from <strong>7:00 PM</strong> onwards.
                      </div>
                    </div>
                  </div>

                  <div className="reim-form-group">
                    <label>Brand Name *</label>
                    <input type="text" className="reim-input" placeholder="Enter Brand name"
                      value={project} onChange={e => setProject(e.target.value)} required />
                  </div>

                  <div className="reim-form-row date-amount-row">
                    <div className="reim-form-group">
                      <label>Date *</label>
                      <input type="date" className="reim-input" value={date}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={e => setDate(e.target.value)} required />
                    </div>
                    <div className="reim-form-group">
                      <label>OT Type *</label>
                      <select className="reim-input" value={otType} onChange={e => setOtType(e.target.value)} required>
                        <option value="">Select type</option>
                        <option>Weekday OT</option>
                        <option>Weekend OT</option>
                        <option>Holiday OT</option>
                        <option>Client Deadline</option>
                        <option>Campaign Launch</option>
                        <option>Design Revisions</option>
                        <option>Content Shoot / Edit</option>
                        <option>Production Deployment</option>
                        <option>Bug Fix / Hotfix</option>
                        <option>Client Escalation</option>
                        <option>Emergency Fix</option>
                        <option>Late Night Work</option>
                        <option>Early Morning Work</option>
                      </select>
                    </div>
                  </div>

                  <div className="reim-form-row date-amount-row">
                    <TimePicker label="Start Time" required value={startTime} onChange={v => {
                      setStartTime(v);
                      if (v && !isValidOTStartTime(v)) {
                        // warn inline — toast on submit
                      }
                    }} />
                    <div>
                      <TimePicker label="End Time" required value={endTime} onChange={setEndTime} />
                      {duration?.overnight && (
                        <div style={{ marginTop:4, fontSize:11 }}>
                          <span style={{ background:"#EEF2FF", color:"#4F46E5", borderRadius:5, padding:"1px 6px", fontWeight:700 }}>
                            +1 day (overnight)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start-time INVALID — 6 PM block */}
                  {startTime && !isValidOTStartTime(startTime) && (
                    <div className="ot-alert ot-alert-error">
                      <div className="ot-alert-icon"><i className="bi bi-x-circle-fill" /></div>
                      <div>
                        <div className="ot-alert-title">Cannot Apply OT at This Time</div>
                        <div className="ot-alert-body">
                          Start time <strong>6:00 PM – 6:59 PM</strong> is not permitted.
                          The first hour after office close is not counted as OT.
                          Please change your start time to <strong>7:00 PM or later</strong>.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Start-time VALID — approval reminder */}
                  {startTime && isValidOTStartTime(startTime) && (
                    <div className="ot-alert ot-alert-warn">
                      <div className="ot-alert-icon"><i className="bi bi-shield-exclamation" /></div>
                      <div>
                        <div className="ot-alert-title">Admin Approval Required</div>
                        <div className="ot-alert-body">
                          This request will be sent to admin for review.
                          <strong> Do not begin overtime work until you receive approval.</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {duration && (
                    <div className="ot-duration-row">
                      <i className="bi bi-stopwatch-fill" />
                      <span>Duration: <strong>{duration.label}</strong></span>
                      {duration.overnight && (
                        <span style={{ fontSize:11, background:"#C7D2FE", color:"#3730A3",
                          borderRadius:6, padding:"2px 8px", marginLeft:4 }}>
                          Overnight shift
                        </span>
                      )}
                    </div>
                  )}

                  <div className="reim-form-group">
                    <label>Reason *</label>
                    <textarea className="reim-input" rows="3" placeholder="Reason for OT request"
                      value={reason} onChange={e => setReason(e.target.value)} required />
                  </div>

                  <div className="reim-form-row date-amount-row">
                    <div className="reim-form-group">
                      <label>Tasks *</label>
                      <input type="text" className="reim-input" placeholder="Type task ID or name"
                        value={tasks} onChange={e => setTasks(e.target.value)} required />
                    </div>
                    <div className="reim-form-group">
                      <label>OT Access Given By *</label>
                      <select className="reim-input" value={otApprover} onChange={e => setOtApprover(e.target.value)} required>
                        <option value="">Select person</option>
                        <option value="Ivan Sinha">Ivan Sinha</option>
                        <option value="Ishan Sinha">Ishan Sinha</option>
                        <option value="Riya Tiwari">Riya Tiwari</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="reim-modal-footer">
                  <button type="button" className="reim-cancel-btn"
                    onClick={() => { setShowOTModal(false); resetForm(); }}>
                    Cancel
                  </button>
                  <button type="submit" className="reim-create-btn"
                    disabled={submitting || (startTime && !isValidOTStartTime(startTime))}>
                    {submitting ? "Submitting…" : "Create Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ Extend OT Modal ═══ */}
        {extendTarget && (
          <div className="reim-modal-root">
            <div className="reim-modal-backdrop" onClick={() => { setExtendTarget(null); setExtendReason(""); }} />
            <div className="reim-modal-card" style={{ maxWidth:420 }}>
              <div className="reim-modal-header">
                <div className="reim-modal-title">
                  <i className="bi bi-plus-circle-fill me-2" style={{ color:"#4F46E5" }} />
                  <span>Request OT Extension</span>
                </div>
                <button type="button" className="reim-modal-close"
                  onClick={() => { setExtendTarget(null); setExtendReason(""); }}>✕</button>
              </div>
              <div className="reim-modal-body">
                {/* Current OT info */}
                <div style={{ background:"#EEF2FF", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#4F46E5" }}>{extendTarget.project}</div>
                  <div style={{ fontSize:11, color:"#6B7280", marginTop:2 }}>
                    {fmtTime(extendTarget.startTime)} → {fmtTime(extendTarget.endTime)} · {extendTarget.otType}
                  </div>
                </div>

                <div className="reim-form-group">
                  <label style={{ fontSize:12.5, fontWeight:600, color:"#374151" }}>
                    Extra Time Needed *
                  </label>
                  <select className="reim-input" value={extendMins} onChange={e => setExtendMins(e.target.value)}>
                    <option value="30">+ 30 minutes</option>
                    <option value="60">+ 1 hour</option>
                    <option value="90">+ 1.5 hours</option>
                    <option value="120">+ 2 hours</option>
                    <option value="180">+ 3 hours</option>
                  </select>
                </div>

                <div className="reim-form-group">
                  <label style={{ fontSize:12.5, fontWeight:600, color:"#374151" }}>
                    Reason for Extension
                  </label>
                  <textarea className="reim-input" rows="3"
                    placeholder="Why do you need more time?"
                    value={extendReason} onChange={e => setExtendReason(e.target.value)} />
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:8,
                  background:"#FFFBEB", border:"1px solid #FCD34D", borderRadius:9,
                  padding:"9px 13px", fontSize:12, color:"#92400E" }}>
                  <i className="bi bi-info-circle-fill" style={{ color:"#D97706" }} />
                  Extension will start only after admin approves this request.
                </div>
              </div>
              <div className="reim-modal-footer">
                <button type="button" className="reim-cancel-btn"
                  onClick={() => { setExtendTarget(null); setExtendReason(""); }}>
                  Cancel
                </button>
                <button className="reim-create-btn" disabled={submittingExt} onClick={handleExtend}>
                  {submittingExt ? "Sending…" : "Send Extension Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Remark modal */}
      {remarkModal && (
        <div className="leave-modal-root">
          <div className="leave-modal-backdrop" onClick={() => setRemarkModal(null)} />
          <div className="leave-modal-card">
            <div className="leave-modal-header">
              <span>Rejection Remark</span>
              <button className="leave-modal-close" onClick={() => setRemarkModal(null)}>✕</button>
            </div>
            <div className="leave-modal-body">
              <p>{remarkModal.adminRemark || "No remark provided"}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
