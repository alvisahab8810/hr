// pages/employee/dashboard.js
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Dashnav from "@/components/Dashnav";
import Head from "next/head";
import { getSocket } from "@/utils/socket";
import Leftbar from "@/components/employee/Leftbar";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import TimeTracker from "@/components/employee/TimeTracker";

const fmtShort = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const holidayStatus = (h) => {
  const now   = new Date(); now.setHours(0,0,0,0);
  const start = new Date(h.startDate); start.setHours(0,0,0,0);
  const end   = new Date(h.endDate);   end.setHours(0,0,0,0);
  if (start <= now && end >= now) return "today";
  if (end < now)                  return "passed";
  return "upcoming";
};

function calcCompletion(emp) {
  if (!emp) return 0;
  const checks = [
    emp?.personal?.mobile, emp?.personal?.email, emp?.personal?.dob,
    emp?.personal?.address, emp?.personal?.city, emp?.personal?.state,
    emp?.personal?.maritalStatus, emp?.professional?.department,
    emp?.professional?.designation, emp?.professional?.dateOfJoining,
    emp?.salary?.bankName, emp?.salary?.accountNumber, emp?.salary?.ifscCode,
    emp?.salary?.panNumber, emp?.documents?.appointmentLetter,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const getInitials = (f, l) =>
  `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "?";

export default function EmployeeDashboard() {
  const [employee,           setEmployee]           = useState(null);
  const [holidays,           setHolidays]           = useState([]);
  const [loadingHolidays,    setLoadingHolidays]    = useState(true);
  const [announcements,      setAnnouncements]      = useState([]);
  const [loadingAnnounce,    setLoadingAnnounce]    = useState(true);
  const [today,              setToday]              = useState("");
  const [showReminder,       setShowReminder]       = useState(false);
  const [triggeredToday,     setTriggeredToday]     = useState(false);
  const [employeeStatus,     setEmployeeStatus]     = useState({});
  const [summary,            setSummary]            = useState({ total:0, checkedIn:0, yetToCheckIn:0, leaveTaken:0 });

  // ── Employee ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    fetch("/api/employee/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setEmployee(d.employee); })
      .catch(console.error);
  }, []);

  // ── Holidays ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/payroll/holidays/upcoming")
      .then(r => r.json())
      .then(d => { if (d.success) setHolidays(d.data); })
      .catch(console.error)
      .finally(() => setLoadingHolidays(false));
  }, []);

  // ── Announcements ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/announcements/active")
      .then(r => r.json())
      .then(d => { if (d.success) setAnnouncements(d.announcements); })
      .catch(console.error)
      .finally(() => setLoadingAnnounce(false));
  }, []);

  // ── Attendance overview ───────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/payroll/attendance/overview")
      .then(r => r.json())
      .then(d => { if (d.success) setSummary(d.summary); })
      .catch(console.error);
  }, []);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/socket");
    const socket = getSocket();
    const onConnect      = () => socket.emit("admin:requestSnapshot");
    const onStatusUpdate = (data) => setEmployeeStatus(prev => ({ ...prev, [data.employeeId]: data }));
    const onSnapshot     = (snap) => {
      const m = {}; snap.forEach(i => { m[i.employeeId] = i; }); setEmployeeStatus(m);
    };
    socket.on("connect",                onConnect);
    socket.on("employeeStatusUpdate",   onStatusUpdate);
    socket.on("employeeStatusSnapshot", onSnapshot);
    return () => {
      socket.off("connect", onConnect);
      socket.off("employeeStatusUpdate", onStatusUpdate);
      socket.off("employeeStatusSnapshot", onSnapshot);
    };
  }, []);

  // ── Date ticker ───────────────────────────────────────────────────────────
  useEffect(() => {
    const opts = { weekday:"long", year:"numeric", month:"long", day:"numeric" };
    const tick = () => setToday(new Date().toLocaleDateString("en-US", opts));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  // ── Lunch reminder ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 13 && now.getMinutes() === 30 && !triggeredToday) {
        new Audio("/sounds/lunch-warning.mp3").play().catch(() => {});
        setShowReminder(true);
        setTriggeredToday(true);
        setTimeout(() => setTriggeredToday(false), 86400000);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [triggeredToday]);

  const completion = calcCompletion(employee);
  const name       = employee ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim() : "";

  if (!employee) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  );

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* ══════════════════════════════════════════
             EMPLOYEE DASHBOARD
          ══════════════════════════════════════════ */

          /* Profile hero card */
          .ed-hero {
            background: linear-gradient(135deg, #1e1b4b 0%, #4F46E5 55%, #7C3AED 100%);
            border-radius: 18px; padding: 24px 28px;
            display: flex; align-items: center; gap: 20px;
            margin-bottom: 20px; flex-wrap: wrap;
            position: relative; overflow: hidden;
          }
          .ed-hero::before {
            content: ""; position: absolute;
            width: 300px; height: 300px; border-radius: 50%;
            background: rgba(255,255,255,.04);
            top: -100px; right: -80px; pointer-events: none;
          }
          .ed-hero-avatar {
            width: 64px; height: 64px; border-radius: 50%;
            background: rgba(255,255,255,.2);
            display: flex; align-items: center; justify-content: center;
            font-size: 22px; font-weight: 800; color: #fff;
            border: 3px solid rgba(255,255,255,.35); flex-shrink: 0;
          }
          .ed-hero-info { flex: 1; min-width: 0; }
          .ed-hero-name { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 2px; }
          .ed-hero-role { font-size: 13px; color: rgba(255,255,255,.7); margin-bottom: 8px; }
          .ed-hero-badge {
            display: inline-flex; align-items: center; gap: 5px;
            background: rgba(255,255,255,.15); color: #fff;
            padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
          }

          /* Profile completion in hero */
          .ed-hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
          @media(max-width:600px){ .ed-hero-right{ align-items:flex-start; width:100%; } }
          .ed-view-profile-btn {
            display: inline-flex; align-items: center; gap: 6px;
            background: rgba(255,255,255,.15); color: #fff;
            border: 1.5px solid rgba(255,255,255,.3);
            padding: 8px 18px; border-radius: 10px;
            font-size: 13px; font-weight: 600; text-decoration: none;
            transition: background .2s;
          }
          .ed-view-profile-btn:hover { background: rgba(255,255,255,.25); color: #fff; }
          .ed-complete-btn {
            display: inline-flex; align-items: center; gap: 6px;
            background: #FCD34D; color: #92400E;
            border: none; padding: 8px 18px; border-radius: 10px;
            font-size: 12px; font-weight: 700; text-decoration: none;
            transition: background .2s;
          }
          .ed-complete-btn:hover { background: #FDE68A; color: #92400E; }

          /* Completion bar in hero */
          .ed-hero-progress-wrap { width: 180px; }
          @media(max-width:600px){ .ed-hero-progress-wrap{ width:100%; } }
          .ed-hero-progress-label { display:flex; justify-content:space-between; font-size:11px; color:rgba(255,255,255,.8); margin-bottom:5px; font-weight:600; }
          .ed-hero-progress-bg { height:6px; background:rgba(255,255,255,.2); border-radius:10px; }
          .ed-hero-progress-fill { height:100%; border-radius:10px; background:linear-gradient(90deg,#4ADE80,#22C55E); transition:width .6s; }

          /* Quick stats strip */
          .ed-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
          @media(max-width:768px){ .ed-stats{ grid-template-columns:repeat(2,1fr); } }
          @media(max-width:400px){ .ed-stats{ grid-template-columns:1fr 1fr; } }
          .ed-stat {
            background:#fff; border:1px solid #F0F0F0; border-radius:14px;
            padding:16px 18px; display:flex; align-items:center; gap:12px;
          }
          .ed-stat-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
          .ed-stat-val   { font-size:18px; font-weight:800; color:#111827; line-height:1; }
          .ed-stat-label { font-size:11px; color:#9CA3AF; font-weight:500; margin-top:2px; }

          /* Main grid */
          .ed-grid { display:grid; grid-template-columns:1fr 380px; gap:20px; }
          @media(max-width:1024px){ .ed-grid{ grid-template-columns:1fr; } }

          /* Cards */
          .ed-card { background:#fff; border:1px solid #F0F0F0; border-radius:16px; overflow:hidden; }
          .ed-card-header {
            padding:16px 20px; display:flex; justify-content:space-between; align-items:center;
            border-bottom:1px solid #F5F5F5;
          }
          .ed-card-header h5 { font-weight:700; color:#111827; margin:0; font-size:14px; }
          .ed-card-body { padding:16px 20px; }

          /* Holiday list */
          .ed-holiday-item {
            display:flex; align-items:center; justify-content:space-between;
            padding:10px 14px; border-radius:10px; margin-bottom:8px;
            background:#F9FAFB; transition:background .15s;
          }
          .ed-holiday-item:last-child { margin-bottom:0; }
          .ed-holiday-item.today-item { background:#EEF2FF; }
          .ed-holiday-name { font-weight:600; color:#111827; font-size:13px; }
          .ed-holiday-desc { font-size:11px; color:#9CA3AF; margin-top:1px; }
          .ed-holiday-date {
            font-weight:600; font-size:11px; padding:4px 10px; border-radius:8px;
            white-space:nowrap; flex-shrink:0;
            background:#fff; color:#374151; border:1px solid #E5E7EB;
          }
          .ed-holiday-date.today-badge { background:#4F46E5; color:#fff; border:none; }
          .ed-holiday-tag { font-size:10px; font-weight:700; padding:2px 7px; border-radius:6px; margin-right:6px; flex-shrink:0; }

          /* Announcements */
          .ed-announce-item { padding:12px 0; border-bottom:1px solid #F5F5F5; }
          .ed-announce-item:last-child { border-bottom:none; padding-bottom:0; }
          .ed-announce-title { font-weight:700; color:#111827; font-size:13px; margin-bottom:3px; }
          .ed-announce-msg   { font-size:12.5px; color:#6B7280; line-height:1.5; margin-bottom:4px; }
          .ed-announce-date  { font-size:11px; color:#9CA3AF; }
          .ed-high-badge { background:#FEE2E2; color:#DC2626; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; }

          /* Quick links */
          .ed-quick-links { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
          @media(max-width:400px){ .ed-quick-links{ grid-template-columns:repeat(2,1fr); } }
          .ed-quick-link {
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            padding:14px 8px; border-radius:12px; border:1.5px solid #F0F0F0;
            text-decoration:none; gap:6px; transition:all .15s; background:#fff;
          }
          .ed-quick-link:hover { border-color:#4F46E5; background:#EEF2FF; }
          .ed-quick-link i { font-size:20px; color:#4F46E5; }
          .ed-quick-link span { font-size:11px; font-weight:600; color:#374151; text-align:center; }

          /* Profile incomplete nudge */
          .ed-nudge {
            display:flex; align-items:center; gap:12px;
            background:#FFFBEB; border:1.5px solid #FCD34D; border-radius:12px;
            padding:12px 16px; margin-bottom:20px;
          }
          .ed-nudge i { color:#D97706; font-size:18px; flex-shrink:0; }
          .ed-nudge-text { flex:1; font-size:12.5px; color:#92400E; }
          .ed-nudge-text strong { display:block; margin-bottom:1px; }
          .ed-nudge-btn {
            padding:6px 14px; border-radius:8px; border:none;
            background:#D97706; color:#fff; font-size:12px; font-weight:600;
            cursor:pointer; white-space:nowrap; text-decoration:none;
          }

          /* Timetracker row */
          .ed-breadcrumb-row {
            display:flex; align-items:center; justify-content:space-between;
            flex-wrap:wrap; gap:10px; margin-bottom:20px;
          }

          /* Responsive tweaks */
          @media(max-width:576px){
            .ed-hero { padding:18px; gap:14px; }
            .ed-hero-name { font-size:16px; }
            .ed-stat { padding:12px 14px; }
            .ed-stat-val { font-size:16px; }
          }
        `}</style>
      </Head>

      <div className="main-nav">
        <Leftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          {/* ── Breadcrumb + TimeTracker ── */}
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white d-flex align-items-center justify-content-between flex-wrap gap-2">
              <li className="breadcrumb-item">
                <Link href="/employee/dashboard">
                  <img src="/icons/home.svg" alt="" /> Home
                </Link>
              </li>
              <li style={{ marginLeft:"auto" }}>
                <TimeTracker />
              </li>
            </ul>
          </div>

          <div className="block-header">

            {/* ── Profile incomplete nudge ── */}
            {completion < 100 && (
              <div className="ed-nudge">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <div className="ed-nudge-text">
                  <strong>Profile {completion}% complete</strong>
                  Complete your profile for accurate payroll & HR records.
                </div>
                <Link href="/employee/complete-profile" className="ed-nudge-btn">
                  Complete →
                </Link>
              </div>
            )}

            {/* ── Hero card ── */}
            <div className="ed-hero">
              <div className="ed-hero-avatar">
                {getInitials(employee?.firstName, employee?.lastName)}
              </div>
              <div className="ed-hero-info">
                <div className="ed-hero-name">Welcome back, {employee.firstName}!</div>
                <div className="ed-hero-role">
                  {employee?.professional?.designation || "Employee"}
                  {employee?.professional?.department && ` · ${employee.professional.department}`}
                </div>
                {employee?.employeeId && (
                  <span className="ed-hero-badge">
                    <i className="bi bi-person-badge"></i> {employee.employeeId}
                  </span>
                )}
              </div>

              <div className="ed-hero-right">
                {/* Completion progress */}
                <div className="ed-hero-progress-wrap">
                  <div className="ed-hero-progress-label">
                    <span>Profile</span>
                    <span>{completion}%</span>
                  </div>
                  <div className="ed-hero-progress-bg">
                    <div className="ed-hero-progress-fill" style={{ width:`${completion}%` }}></div>
                  </div>
                </div>

                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <Link href="/employee/profile" className="ed-view-profile-btn">
                    <i className="bi bi-person-circle"></i> My Profile
                  </Link>
                  {completion < 100 && (
                    <Link href="/employee/complete-profile" className="ed-complete-btn">
                      <i className="bi bi-pencil-fill"></i> Complete
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* ── Quick stats ── */}
            {/* <div className="ed-stats">
              {[
                { icon:"bi-calendar-check", bg:"#EEF2FF", ic:"#4F46E5", val: summary.checkedIn    ?? "—", label:"Present Today"   },
                { icon:"bi-calendar-x",     bg:"#FEE2E2", ic:"#DC2626", val: summary.yetToCheckIn ?? "—", label:"Yet to Check In" },
                { icon:"bi-palm",           bg:"#FEF3C7", ic:"#B45309", val: summary.leaveTaken   ?? "—", label:"Leaves Taken"    },
                { icon:"bi-clock-history",  bg:"#F3E8FF", ic:"#7C3AED", val: "OT",                        label:"Overtime →", href:"/employee/overtime" },
              ].map((s, i) => (
                <div key={i} className="ed-stat">
                  <div className="ed-stat-icon" style={{ background:s.bg, color:s.ic }}>
                    <i className={`bi ${s.icon}`}></i>
                  </div>
                  <div>
                    <div className="ed-stat-val">{s.val ?? "—"}</div>
                    <div className="ed-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div> */}

            {/* ── Quick links ── */}
            <div className="ed-card" style={{ marginBottom:20 }}>
              <div className="ed-card-header">
                <h5><i className="bi bi-grid-3x3-gap me-2" style={{ color:"#4F46E5" }}></i>Quick Access</h5>
              </div>
              <div className="ed-card-body">
                <div className="ed-quick-links">
                  {[
                    { href:"/employee/attendance-summary", icon:"bi-calendar3",        label:"Attendance"     },
                    { href:"/employee/leaves-management",  icon:"bi-calendar-minus",    label:"Leaves"         },
                    { href:"/employee/reimbursement",      icon:"bi-receipt",           label:"Reimbursement"  },
                    { href:"/employee/overtime",           icon:"bi-clock-history",     label:"Overtime"       },
                    { href:"/employee/profile",            icon:"bi-person-circle",     label:"My Profile"     },
                    { href:"/employee/complete-profile",   icon:"bi-folder2-open",      label:"Documents"      },
                  ].map((l) => (
                    <Link key={l.href} href={l.href} className="ed-quick-link">
                      <i className={`bi ${l.icon}`}></i>
                      <span>{l.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Main grid: Holidays + Announcements ── */}
            <div className="ed-grid">
              {/* Holidays */}
              <div className="ed-card">
                <div className="ed-card-header">
                  <h5>
                    <i className="bi bi-calendar-heart me-2" style={{ color:"#4F46E5" }}></i>
                    Upcoming Holidays {new Date().getFullYear()}
                  </h5>
                  <span style={{ background:"#EEF2FF", color:"#4F46E5", borderRadius:20, padding:"2px 12px", fontSize:12, fontWeight:700 }}>
                    {holidays.length}
                  </span>
                </div>
                <div className="ed-card-body">
                  {loadingHolidays ? (
                    <div style={{ textAlign:"center", padding:"24px 0", color:"#9CA3AF" }}>
                      <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                      <div style={{ fontSize:12 }}>Loading…</div>
                    </div>
                  ) : holidays.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"24px 0", color:"#9CA3AF" }}>
                      <i className="bi bi-calendar-x" style={{ fontSize:32, display:"block", marginBottom:8 }}></i>
                      No upcoming holidays
                    </div>
                  ) : (
                    holidays.slice(0, 6).map((h, i) => {
                      const st      = holidayStatus(h);
                      const isToday = st === "today";
                      const isMulti = h.totalDays > 1;
                      return (
                        <div key={i} className={`ed-holiday-item ${isToday ? "today-item" : ""}`}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                            {isMulti && (
                              <span className="ed-holiday-tag" style={{ background:isToday?"#DBEAFE":"#EEF2FF", color:isToday?"#1D4ED8":"#4F46E5" }}>
                                {h.totalDays}d
                              </span>
                            )}
                            <div style={{ minWidth:0 }}>
                              <div className="ed-holiday-name">{h.name}</div>
                              {h.description && <div className="ed-holiday-desc">{h.description}</div>}
                            </div>
                          </div>
                          <span className={`ed-holiday-date ${isToday ? "today-badge" : ""}`}>
                            {isMulti
                              ? `${fmtShort(h.startDate)} – ${fmtShort(h.endDate)}`
                              : fmtShort(h.startDate)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Announcements */}
              <div className="ed-card">
                <div className="ed-card-header">
                  <h5><i className="bi bi-megaphone me-2" style={{ color:"#4F46E5" }}></i>Announcements</h5>
                </div>
                <div className="ed-card-body">
                  {loadingAnnounce ? (
                    <div style={{ textAlign:"center", padding:"24px 0", color:"#9CA3AF" }}>
                      <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"24px 0", color:"#9CA3AF" }}>
                      <i className="bi bi-megaphone" style={{ fontSize:32, display:"block", marginBottom:8 }}></i>
                      No announcements
                    </div>
                  ) : (
                    announcements.map((a) => (
                      <div key={a._id} className="ed-announce-item">
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:4 }}>
                          <div className="ed-announce-title">{a.title}</div>
                          {a.priority === "high" && <span className="ed-high-badge">High</span>}
                        </div>
                        <div className="ed-announce-msg">{a.message}</div>
                        <div className="ed-announce-date">
                          {new Date(a.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>

      {/* ── Lunch reminder ── */}
      {showReminder && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000 }}>
          <div style={{ background:"#fff", borderRadius:18, padding:"28px 32px", width:300, textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,.2)", animation:"fadeIn .3s" }}>
            <img src="/icons/alarm.png" alt="" width={36} style={{ marginBottom:12 }} />
            <h5 style={{ fontWeight:800, color:"#111827" }}>Lunch Time!</h5>
            <p style={{ fontSize:32, fontWeight:700, color:"#4F46E5", margin:"8px 0" }}>01:30 PM</p>
            <p style={{ fontSize:13, color:"#6B7280", marginBottom:20 }}>
              Your lunch break starts now. Deductions apply if you exceed the allowed break.
            </p>
            <button onClick={() => setShowReminder(false)}
              style={{ background:"#4F46E5", color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", fontWeight:700, cursor:"pointer", width:"100%" }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import Dashnav from "@/components/Dashnav";
// import Head from "next/head";
// import { getSocket } from "@/utils/socket";
// import DateTimeGreeting from "@/components/DateTimeGreeting";
// import Leftbar from "@/components/employee/Leftbar";
// import LeftbarMobile from "@/components/employee/LeftbarMobile";
// import TimeTracker from "@/components/employee/TimeTracker";

// // ─── helpers ──────────────────────────────────────────────────────────────────
// const fmtShort = (d) =>
//   new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// const holidayStatus = (h) => {
//   const now   = new Date(); now.setHours(0, 0, 0, 0);
//   const start = new Date(h.startDate); start.setHours(0, 0, 0, 0);
//   const end   = new Date(h.endDate);   end.setHours(0, 0, 0, 0);
//   if (start <= now && end >= now) return "today";
//   if (end < now)                  return "passed";
//   return "upcoming";
// };

// export default function EmployeeDashboard() {

//   const [employeeStatus, setEmployeeStatus] = useState({});
//   const [holidays, setHolidays]             = useState([]);
//   const [loadingHolidays, setLoadingHolidays] = useState(true);
//   const [error, setError]                   = useState("");

//   const [employee, setEmployee]             = useState(null);
//   const [today, setToday]                   = useState("");
//   const [showReminder, setShowReminder]     = useState(false);
//   const [triggeredToday, setTriggeredToday] = useState(false);

//   const [announcements, setAnnouncements]         = useState([]);
//   const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

//   const [summary, setSummary] = useState({
//     total: 0,
//     checkedIn: 0,
//     yetToCheckIn: 0,
//     leaveTaken: 0,
//   });
//   const [pendingLeaves, setPendingLeaves] = useState([]);

//   // ── Fetch attendance + leaves on load ────────────────────────────────────
//   useEffect(() => {
//     fetchAttendanceOverview();
//     fetchPendingLeaves();
//   }, []);

//   const fetchAttendanceOverview = async () => {
//     try {
//       const res  = await fetch("/api/payroll/attendance/overview");
//       const data = await res.json();
//       if (data.success) setSummary(data.summary);
//     } catch (err) {
//       console.error("Error fetching overview:", err);
//     }
//   };

//   const fetchPendingLeaves = async () => {
//     try {
//       const res  = await fetch("/api/payroll/leave/pending");
//       const data = await res.json();
//       if (data.success) setPendingLeaves(data.data);
//     } catch (err) {
//       console.error("Error fetching pending leaves:", err);
//     }
//   };

//   // ── Socket ────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     fetch("/api/socket");
//     const socket = getSocket();

//     const onConnect = () => {
//       console.log("✅ Employee connected to socket server");
//       socket.emit("admin:requestSnapshot");
//     };
//     const onStatusUpdate = (data) => {
//       setEmployeeStatus((prev) => ({ ...prev, [data.employeeId]: data }));
//     };
//     const onSnapshot = (snapshot) => {
//       const statusMap = {};
//       snapshot.forEach((item) => { statusMap[item.employeeId] = item; });
//       setEmployeeStatus(statusMap);
//     };

//     socket.on("connect",                onConnect);
//     socket.on("employeeStatusUpdate",   onStatusUpdate);
//     socket.on("employeeStatusSnapshot", onSnapshot);

//     return () => {
//       socket.off("connect",                onConnect);
//       socket.off("employeeStatusUpdate",   onStatusUpdate);
//       socket.off("employeeStatusSnapshot", onSnapshot);
//     };
//   }, []);

//   // ── Fetch holidays ────────────────────────────────────────────────────────
//   const fetchHolidays = async () => {
//     try {
//       setLoadingHolidays(true);
//       const res  = await fetch("/api/payroll/holidays/upcoming");
//       const data = await res.json();
//       if (data.success) {
//         setHolidays(data.data);
//       } else {
//         setError("Failed to load holidays.");
//       }
//     } catch (err) {
//       console.error("Error fetching holidays:", err);
//       setError("Something went wrong while fetching holidays.");
//     } finally {
//       setLoadingHolidays(false);
//     }
//   };

//   useEffect(() => { fetchHolidays(); }, []);

//   // ── Today date ────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
//     setToday(new Date().toLocaleDateString("en-US", opts));

//     const interval = setInterval(() => {
//       setToday(new Date().toLocaleDateString("en-US", opts));
//     }, 1000 * 60);

//     return () => clearInterval(interval);
//   }, []);

//   // ── Fetch employee profile ────────────────────────────────────────────────
//   useEffect(() => {
//     const fetchEmployee = async () => {
//       try {
//         const token = localStorage.getItem("employeeToken");
//         const res   = await fetch("/api/employee/me", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const data = await res.json();
//         if (data.success) setEmployee(data.employee);
//       } catch (err) {
//         console.error("Failed to fetch employee:", err);
//       }
//     };
//     fetchEmployee();
//   }, []);

//   // ── Fetch announcements ───────────────────────────────────────────────────
//   useEffect(() => {
//     const fetchAnnouncements = async () => {
//       try {
//         const res  = await fetch("/api/announcements/active");
//         const data = await res.json();
//         if (data.success) setAnnouncements(data.announcements);
//       } catch (err) {
//         console.error("Failed to load announcements", err);
//       } finally {
//         setLoadingAnnouncements(false);
//       }
//     };
//     fetchAnnouncements();
//   }, []);

//   // ── Lunch time warning ────────────────────────────────────────────────────
//   useEffect(() => {
//     const checkLunchWarning = () => {
//       const now = new Date();
//       if (now.getHours() === 13 && now.getMinutes() === 30 && !triggeredToday) {
//         const audio = new Audio("/sounds/lunch-warning.mp3");
//         audio.play();
//         setShowReminder(true);
//         setTriggeredToday(true);
//         setTimeout(() => setTriggeredToday(false), 24 * 60 * 60 * 1000);
//       }
//     };
//     const interval = setInterval(checkLunchWarning, 1000);
//     return () => clearInterval(interval);
//   }, [triggeredToday]);

//   if (!employee) return <p className="text-white">Loading...</p>;

//   // ─────────────────────────────────────────────────────────────────────────
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

//       <div className="main-nav">
//         <Leftbar />
//         <LeftbarMobile />
//         <Dashnav />

//         <section className="content home">
//           {/* ── Breadcrumb ── */}
//           <div className="breadcrum-bx">
//             <ul className="breadcrumb bg-white d-flex align-items-center justify-content-between">
//               <li className="breadcrumb-item">
//                 <Link href="/dashboard/dashboard">
//                   <img src="/icons/home.svg" alt="" /> Home
//                 </Link>
//               </li>
//               <li>
//                 <TimeTracker />
//               </li>
//             </ul>
//           </div>

//           <div className="block-header">
//             {/* ── Welcome ── */}
//             <div className="emp-name-bx">
//               <h3 className="fw-bold text-dark mb-0">
//                 Welcome back, {employee.firstName}!
//               </h3>
//               <span className="text-dark">{today}</span>
//             </div>

//             {/* ── Main row ── */}
//             <div className="holidays-row">
//               <div className="row">

//                 {/* ── Holidays card ── */}
//                 <div className="col-md-7 pr-0 pl-0">
//                   <div className="col-md-12">
//                     <div className="items-home card border-0 rounded-4 p-4">
//                       {/* Header */}
//                       <div className="d-flex justify-content-between align-items-center mb-3">
//                         <h5 className="fw-bold mb-0">
//                           Upcoming Holidays ({new Date().getFullYear()})
//                         </h5>
//                         <span className="badge">{holidays.length}</span>
//                       </div>

//                       {/* Content */}
//                       {loadingHolidays ? (
//                         <div className="text-center py-4">
//                           <div className="spinner-border text-primary" role="status"></div>
//                           <p className="mt-2 text-muted small">Loading holidays...</p>
//                         </div>
//                       ) : error ? (
//                         <p className="text-danger text-center">{error}</p>
//                       ) : holidays.length === 0 ? (
//                         <div className="text-center py-4">
//                           <img
//                             src="/no-holidays.png"
//                             alt="No Holidays"
//                             style={{ width: "90px", opacity: 0.8 }}
//                           />
//                           <p className="mt-2 text-muted">No upcoming holidays</p>
//                         </div>
//                       ) : (
//                         <ul className="list-group list-group-flush">
//                           {holidays.slice(0, 5).map((holiday, idx) => {
//                             const status  = holidayStatus(holiday);
//                             const isToday = status === "today";
//                             const isMulti = holiday.totalDays > 1;

//                             return (
//                               <li
//                                 key={idx}
//                                 className="list-group-item border-0 d-flex justify-content-between align-items-center px-3 py-3 mt-2"
//                                 style={{ backgroundColor: "#F9FAFB", borderRadius: "8px" }}
//                               >
//                                 {/* Left: name + description */}
//                                 <div className="d-flex align-items-center gap-2 flex-grow-1">
//                                   {isMulti && (
//                                     <span
//                                       style={{
//                                         background: isToday ? "#DBEAFE" : "#EEF2FF",
//                                         color:      isToday ? "#1D4ED8" : "#4F46E5",
//                                         fontWeight: 700,
//                                         fontSize: 10,
//                                         padding: "2px 6px",
//                                         borderRadius: 6,
//                                         flexShrink: 0,
//                                       }}
//                                     >
//                                       {holiday.totalDays}d
//                                     </span>
//                                   )}
//                                   <div>
//                                     <h6 className="mb-0 fw-semibold text-dark" style={{ fontSize: 13 }}>
//                                       {holiday.name}
//                                     </h6>
//                                     {holiday.description && (
//                                       <small className="text-muted" style={{ fontSize: 11 }}>
//                                         {holiday.description}
//                                       </small>
//                                     )}
//                                   </div>
//                                 </div>

//                                 {/* Right: date badge */}
//                                 <span
//                                   style={{
//                                     background:  isToday ? "#4F46E5" : "#fff",
//                                     color:       isToday ? "#fff"    : "#374151",
//                                     border:      isToday ? "none"    : "1px solid #E5E7EB",
//                                     fontWeight: 600,
//                                     fontSize: 11,
//                                     padding: "4px 10px",
//                                     borderRadius: 8,
//                                     whiteSpace: "nowrap",
//                                     flexShrink: 0,
//                                   }}
//                                 >
//                                   {isMulti
//                                     ? `${fmtShort(holiday.startDate)} – ${fmtShort(holiday.endDate)}`
//                                     : fmtShort(holiday.startDate)}
//                                 </span>
//                               </li>
//                             );
//                           })}
//                         </ul>
//                       )}

//                       {holidays.length > 5 && (
//                         <div className="text-center mt-3">
//                           {/* <a href="/employee/holidays" className="text-primary fw-semibold text-decoration-none">View All →</a> */}
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>

//                 {/* ── Announcements card ── */}
//                 <div className="col-md-5 pl-0">
//                   <div className="items-home card border-0 rounded-4 p-4">
//                     <h5 className="mb-3">📢 Announcements</h5>

//                     {loadingAnnouncements && <p className="text-muted">Loading announcements...</p>}

//                     {!loadingAnnouncements && announcements.length === 0 && (
//                       <p className="text-muted">No announcements available.</p>
//                     )}

//                     {announcements.map((a) => (
//                       <div
//                         key={a._id}
//                         className={`announcement-item ${a.priority === "high" ? "high-priority" : ""}`}
//                       >
//                         <div className="d-flex justify-content-between align-items-center">
//                           <h6 className="fw-bold mb-1">{a.title}</h6>
//                           {a.priority === "high" && (
//                             <span className="badge bg-danger">High</span>
//                           )}
//                         </div>
//                         <p className="mb-1">{a.message}</p>
//                         <small className="text-muted">
//                           Posted on {new Date(a.createdAt).toLocaleDateString()}
//                         </small>
//                         <hr />
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//               </div>
//             </div>
//           </div>

//           {/* ── Lunch reminder popup ── */}
//           {showReminder && (
//             <>
//               <div className="overlay">
//                 <div className="popup-card">
//                   <h3 className="popup-title d-flex align-items-center gap-3">
//                     <img src="/icons/alarm.png" alt="Alarm" width="30" />
//                     Lunch Time Alert
//                   </h3>
//                   <div className="popup-time">
//                     <span className="popup-text">01:30 PM</span>
//                   </div>
//                   <p className="popup-desc">
//                     Your lunch break is starting now. <br />
//                     Deductions will apply if you exceed the allowed break.
//                   </p>
//                   <button className="popup-btn" onClick={() => setShowReminder(false)}>
//                     Got it
//                   </button>
//                 </div>
//               </div>

//               <style jsx>{`
//                 .overlay {
//                   position: fixed;
//                   inset: 0;
//                   background: rgba(0, 0, 0, 0.5);
//                   display: flex;
//                   align-items: center;
//                   justify-content: center;
//                   z-index: 2000;
//                 }
//                 .popup-card {
//                   background: #fff;
//                   border-radius: 16px;
//                   box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
//                   padding: 24px 28px;
//                   width: 300px;
//                   text-align: center;
//                   animation: fadeIn 0.3s ease-out;
//                 }
//                 .popup-title {
//                   font-size: 1.4rem;
//                   font-weight: bold;
//                   margin: 0 0 16px;
//                   color: #333;
//                 }
//                 .popup-time {
//                   display: flex;
//                   align-items: center;
//                   justify-content: center;
//                   gap: 8px;
//                   margin-bottom: 10px;
//                 }
//                 .popup-text {
//                   font-size: 1.8rem;
//                   font-weight: 600;
//                   color: #222;
//                 }
//                 .popup-desc {
//                   font-size: 0.9rem;
//                   color: #666;
//                   margin: 10px 0 20px;
//                 }
//                 .popup-btn {
//                   background: #6c63ff;
//                   color: #fff;
//                   border: none;
//                   border-radius: 8px;
//                   padding: 10px 20px;
//                   font-size: 1rem;
//                   font-weight: 500;
//                   cursor: pointer;
//                   transition: background 0.3s ease;
//                 }
//                 .popup-btn:hover {
//                   background: #5848d9;
//                 }
//                 @keyframes fadeIn {
//                   from { opacity: 0; transform: translateY(-20px); }
//                   to   { opacity: 1; transform: translateY(0); }
//                 }
//               `}</style>
//             </>
//           )}
//         </section>
//       </div>
//     </>
//   );
// }
