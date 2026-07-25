// pages/employee/dashboard.js
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import EmployeeDashnav from "@/components/employee/EmployeeDashnav";
import Head from "next/head";
import { getSocket } from "@/utils/socket";
import Leftbar from "@/components/employee/Leftbar";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import TimeTracker from "@/components/employee/TimeTracker";
import BirthdayCelebration from "@/components/BirthdayCelebration";
import { calcGrade, filterTasksByMonth } from "@/utils/tasks/employeeGrade";

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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmtMoney = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function getGrade(present, elapsed) {
  if (!elapsed || elapsed === 0) return { letter:"—", pct:0, color:"#9CA3AF", bg:"#F3F4F6", label:"No data yet" };
  const pct = Math.round((present / elapsed) * 100);
  if (pct >= 95) return { letter:"A", pct, color:"#15803D", bg:"#DCFCE7", label:"Excellent" };
  if (pct >= 85) return { letter:"B", pct, color:"#1D4ED8", bg:"#DBEAFE", label:"Good" };
  if (pct >= 75) return { letter:"C", pct, color:"#D97706", bg:"#FEF3C7", label:"Average" };
  return { letter:"D", pct, color:"#DC2626", bg:"#FEE2E2", label:"Needs Improvement" };
}

function isTaskDuePast(d) {
  const n = new Date(); n.setHours(0,0,0,0);
  const x = new Date(d); x.setHours(0,0,0,0);
  return x < n;
}
function isTaskDueToday(d) {
  if (!d) return false;
  const n = new Date(); n.setHours(0,0,0,0);
  const x = new Date(d); x.setHours(0,0,0,0);
  return x.getTime() === n.getTime();
}
function taskDeadlineText(d) {
  if (!d) return null;
  const n = new Date(); n.setHours(0,0,0,0);
  const x = new Date(d); x.setHours(0,0,0,0);
  const diff = Math.round((x - n) / 86400000);
  if (diff < 0)  return { text:`${-diff}d overdue`, color:"#EF4444" };
  if (diff === 0) return { text:"Due today",        color:"#F59E0B" };
  if (diff === 1) return { text:"Due tomorrow",     color:"#6B7280" };
  return { text: new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short"}), color:"#9CA3AF" };
}
const TASK_ST = {
  todo:        { label:"To Do",       bg:"#F3F4F6", color:"#374151" },
  in_progress: { label:"In Progress", bg:"#EEF2FF", color:"#4F46E5" },
  review:      { label:"In Review",   bg:"#FEF3C7", color:"#B45309" },
  completed:   { label:"Done",        bg:"#DCFCE7", color:"#15803D" },
  blocked:     { label:"Blocked",     bg:"#FEE2E2", color:"#DC2626" },
};
const PRIO_DOT = { low:"#9CA3AF", medium:"#3B82F6", high:"#F97316", urgent:"#EF4444" };

export default function EmployeeDashboard() {
  const router = useRouter();
  const [employee,           setEmployee]           = useState(null);
  const [holidays,           setHolidays]           = useState([]);
  const [loadingHolidays,    setLoadingHolidays]    = useState(true);
  const [announcements,      setAnnouncements]      = useState([]);
  const [loadingAnnounce,    setLoadingAnnounce]    = useState(true);
  const [today,              setToday]              = useState("");
  const [employeeStatus,     setEmployeeStatus]     = useState({});
  const [summary,            setSummary]            = useState({ total:0, checkedIn:0, yetToCheckIn:0, leaveTaken:0 });
  const [liveReport,         setLiveReport]         = useState(null);
  const [loadingLive,        setLoadingLive]        = useState(true);
  const [leaveBalance,       setLeaveBalance]       = useState(null);
  const [showSalary,         setShowSalary]         = useState(false);
  const [tasks,              setTasks]              = useState([]);
  const [loadingTasks,       setLoadingTasks]       = useState(true);
  const [todayBirthdays,     setTodayBirthdays]     = useState([]);
  const [isBirthdayPerson,   setIsBirthdayPerson]   = useState(false);

  // ── Tea Time ──────────────────────────────────────────────────────────────
  const TEA_H = 16, TEA_M_START = 30, TEA_M_END = 45;
  const [teaStatus,    setTeaStatus]    = useState("idle");
  const [teaRemaining, setTeaRemaining] = useState(0);
  const [teaCountdown, setTeaCountdown] = useState(0);
  const audioCtxRef    = useRef(null);
  const audioBufferRef = useRef(null);
  const scheduledRef   = useRef(false); // prevent double-scheduling per day

  // ── Pre-load MP3 + schedule via AudioContext (works in background/pinned tabs) ──
  const scheduleTeaMusic = useRef(async () => {
    if (typeof window === "undefined" || scheduledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      // Create/resume context (requires prior user gesture — login click counts)
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      // Fetch & decode MP3 once
      if (!audioBufferRef.current) {
        const resp = await fetch("/sounds/team-time-music.mp3");
        const raw  = await resp.arrayBuffer();
        audioBufferRef.current = await ctx.decodeAudioData(raw);
      }

      const now      = new Date();
      const teaStart = new Date();
      teaStart.setHours(TEA_H, TEA_M_START, 0, 0);
      const teaEnd   = new Date();
      teaEnd.setHours(TEA_H, TEA_M_END, 0, 0);

      const secsUntil  = (teaStart - now) / 1000;
      const secsPassed = (now - teaStart) / 1000;

      // Only schedule if tea time is today and hasn't ended yet
      if (now >= teaEnd) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      const gain = ctx.createGain();
      gain.gain.value = 1.0; // 100% volume
      source.connect(gain);
      gain.connect(ctx.destination);

      if (secsUntil > 0) {
        // Schedule for exact future 4:30:00 PM
        source.start(ctx.currentTime + secsUntil);
      } else if (secsPassed >= 0 && secsPassed < (TEA_M_END - TEA_M_START) * 60) {
        // Page loaded mid-tea-time — play immediately
        source.start();
      }

      scheduledRef.current = true;

      // Reset at midnight so next day it re-schedules
      const msToMidnight = new Date().setHours(24,0,0,0) - Date.now();
      setTimeout(() => { scheduledRef.current = false; }, msToMidnight);

    } catch (e) {
      console.log("Tea music scheduling failed:", e);
    }
  });

  // ── Trigger scheduling on first user interaction (unlocks AudioContext) ──
  useEffect(() => {
    const unlock = () => {
      scheduleTeaMusic.current();
      window.removeEventListener("click",   unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click",      unlock, { once: true });
    window.addEventListener("keydown",    unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });

    // Also try immediately in case context is already unlocked (page navigated from another)
    scheduleTeaMusic.current();

    return () => {
      window.removeEventListener("click",      unlock);
      window.removeEventListener("keydown",    unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // ── UI tick: update banner state every second ──────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now    = new Date();
      const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
      const nowSec   = h * 3600 + m * 60 + s;
      const startSec = TEA_H * 3600 + TEA_M_START * 60;
      const endSec   = TEA_H * 3600 + TEA_M_END   * 60;

      if (nowSec >= startSec && nowSec < endSec) {
        setTeaStatus("active");
        setTeaRemaining(endSec - nowSec);
      } else if (nowSec >= startSec - 15 * 60 && nowSec < startSec) {
        setTeaStatus("upcoming");
        setTeaCountdown(startSec - nowSec);
      } else {
        setTeaStatus("idle");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Employee — redirect to login if not authenticated ─────────────────────
  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    if (!token) { router.replace("/employee/login"); return; }
    fetch("/api/employee/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setEmployee(d.employee);
        else { localStorage.removeItem("employeeToken"); router.replace("/employee/login"); }
      })
      .catch(() => router.replace("/employee/login"));
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

  // ── Live salary + leave balance ───────────────────────────────────────────
  useEffect(() => {
    const now   = new Date();
    const token = localStorage.getItem("employeeToken");
    const hdr   = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/employee/my-salary-live?month=${now.getMonth()}&year=${now.getFullYear()}`, { headers:hdr, credentials:"include" })
      .then(r => r.json())
      .then(d => { if (d.success) setLiveReport(d.report); })
      .catch(console.error)
      .finally(() => setLoadingLive(false));
    fetch("/api/employee/leave/balance", { headers:hdr, credentials:"include" })
      .then(r => r.json())
      .then(d => { if (d.success) setLeaveBalance(d.balance); })
      .catch(console.error);
    fetch("/api/employee/tasks", { headers:hdr, credentials:"include" })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks || []); })
      .catch(console.error)
      .finally(() => setLoadingTasks(false));
  }, []);

  // ── Birthdays ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/employee/birthdays/today")
      .then(r => r.json())
      .then(d => { if (d.success) setTodayBirthdays(d.birthdays || []); })
      .catch(console.error);
  }, []);

  // Check if the logged-in employee is a birthday person
  useEffect(() => {
    if (!employee) return;
    const dob = employee?.personal?.dob;
    if (!dob) return;
    const d = new Date(dob);
    const now = new Date();
    if (d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
      setIsBirthdayPerson(true);
    }
  }, [employee]);

  const completion = calcCompletion(employee);
  const name       = employee ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim() : "";

  const fmtCountdown = (secs) => {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

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
            overflow: hidden;
          }
          .ed-hero-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
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

          /* Summary stats grid */
          .ed-summary-grid {
            display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:20px;
          }
          @media(max-width:1200px){ .ed-summary-grid{ grid-template-columns:repeat(3,1fr); } }
          @media(max-width:600px){  .ed-summary-grid{ grid-template-columns:repeat(2,1fr); } }

          /* Main content grid */
          .ed-main-grid { display:grid; grid-template-columns:1fr 360px; gap:20px; }
          @media(max-width:1100px){ .ed-main-grid{ grid-template-columns:1fr; } }

          /* Stat card skeleton */
          .ed-skeleton { background:#F3F4F6; border-radius:8px; animation:pulse 1.5s ease-in-out infinite; }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

          /* Today checklist row */
          .ed-task-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #F5F5F5; }
          .ed-task-row:last-child { border-bottom:none; }

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

          /* ── Tea Time Card ── */
          .tea-card {
            background: #fff; border-radius: 16px; margin-bottom: 20px;
            border: 1.5px solid #EDE9F8; overflow: hidden;
            box-shadow: 0 2px 12px rgba(44,34,105,.08);
          }
          .tea-card-accent { height: 4px; background: linear-gradient(90deg,#2C2269,#4F46E5,#2563EB); }
          .tea-card-body {
            padding: 14px 16px;
            display: flex; align-items: center; gap: 12px;
          }
          .tea-card-icon {
            width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
            background: linear-gradient(135deg,#2C2269,#4F46E5);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 3px 10px rgba(44,34,105,.25);
          }
          .tea-card-icon i { font-size: 18px; color: #fff; }
          .tea-card-content { flex: 1; min-width: 0; }
          .tea-card-eyebrow {
            font-size: 9.5px; font-weight: 700; letter-spacing: .1em;
            color: #9CA3AF; text-transform: uppercase; margin-bottom: 2px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .tea-card-title {
            font-size: 13.5px; font-weight: 800; color: #1e1b4b;
            margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .tea-card-sub { font-size: 11.5px; color: #6B7280; line-height: 1.4; }
          .tea-card-badge {
            flex-shrink: 0; background: #EDE9F8; border-radius: 10px;
            padding: 8px 12px; text-align: center; border: 1px solid #C4B5FD;
            min-width: 70px;
          }
          .tea-card-badge-time { font-size: 12px; font-weight: 800; color: #2C2269; line-height: 1.35; }
          .tea-card-badge-label { font-size: 9.5px; color: #9CA3AF; font-weight: 600; margin-top: 2px; }

          /* Active state — brand dark gradient */
          .tea-active {
            border-radius: 16px; margin-bottom: 20px; overflow: hidden;
            box-shadow: 0 8px 28px rgba(44,34,105,.28);
          }
          .tea-active-inner {
            background: linear-gradient(135deg,#1e1b4b 0%,#2C2269 45%,#2563EB 100%);
            padding: 20px 24px; display: flex; align-items: center; gap: 18px;
            flex-wrap: wrap; position: relative; overflow: hidden;
          }
          .tea-active-inner::before {
            content:""; position:absolute; top:-50px; right:-50px;
            width:180px; height:180px; border-radius:50%;
            background:rgba(255,255,255,.05); pointer-events:none;
          }
          .tea-active-icon {
            width: 54px; height: 54px; border-radius: 16px; flex-shrink: 0;
            background: rgba(255,255,255,.15); border: 1.5px solid rgba(255,255,255,.25);
            display: flex; align-items: center; justify-content: center;
            animation: teaPulse 2s ease-in-out infinite;
          }
          .tea-active-icon i { font-size: 22px; color: #fff; }
          @keyframes teaPulse {
            0%,100% { transform:scale(1);   box-shadow:0 0 0 0   rgba(255,255,255,.2); }
            50%     { transform:scale(1.04); box-shadow:0 0 0 8px rgba(255,255,255,.0); }
          }
          .tea-active-info { flex: 1; min-width: 0; }
          .tea-active-eyebrow { font-size:10px; font-weight:800; letter-spacing:.14em; color:rgba(255,255,255,.6); text-transform:uppercase; margin-bottom:3px; }
          .tea-active-title  { font-size:19px; font-weight:900; color:#fff; margin-bottom:4px; }
          .tea-active-sub    { font-size:12.5px; color:rgba(255,255,255,.7); line-height:1.5; }
          .tea-timer-block   { flex-shrink:0; text-align:center; }
          .tea-timer-eyebrow { font-size:10px; font-weight:700; color:rgba(255,255,255,.55); letter-spacing:.08em; margin-bottom:6px; }
          .tea-timer-digits  {
            background:rgba(0,0,0,.3); border-radius:12px; padding:9px 18px;
            font-family:monospace; font-size:26px; font-weight:900;
            color:#C7D2FE; letter-spacing:3px;
            border:1px solid rgba(255,255,255,.12);
          }

          /* Upcoming pill */
          .tea-soon-pill {
            display:inline-flex; align-items:center; gap:6px;
            background:#2C2269; color:#fff; font-size:11px; font-weight:700;
            padding:5px 12px; border-radius:20px;
          }
          .tea-soon-dot { width:6px; height:6px; border-radius:50%; background:#A5B4FC; flex-shrink:0; }

          /* Responsive */
          @media(max-width:576px){
            .ed-hero { padding:18px; gap:14px; }
            .ed-hero-name { font-size:16px; }
            .ed-stat { padding:12px 14px; }
            .ed-stat-val { font-size:16px; }
            /* Tea card — already compact, just ensure no overflow */
            .tea-card-body { padding:12px 14px; gap:10px; }
            .tea-card-title { font-size:13px; }
            .tea-card-sub   { font-size:11px; }
            /* Active banner — stack timer below info on small screens */
            .tea-active-inner { padding:16px 14px; gap:12px; flex-direction:column; align-items:flex-start; }
            .tea-active-title { font-size:15px; }
            .tea-timer-block  { width:100%; display:flex; align-items:center; gap:10px; }
            .tea-timer-eyebrow{ margin-bottom:0; }
            .tea-timer-digits { font-size:20px; padding:7px 14px; flex:1; text-align:center; }
          }
        `}</style>
      </Head>

      <div className="main-nav">
        <Leftbar />
        <LeftbarMobile />
        <EmployeeDashnav />

        <section className="content home">
          {/* ── Breadcrumb ── */}
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item">
                <Link href="/employee/dashboard">
                  <img src="/icons/home.svg" alt="" /> Home
                </Link>
              </li>
            </ul>
          </div>

          <div className="block-header">
            {/* ── Birthday Celebration ── */}
            {isBirthdayPerson && (
              <BirthdayCelebration mode="self" employee={employee} />
            )}
            {!isBirthdayPerson && todayBirthdays.length > 0 && (
              <BirthdayCelebration mode="team" birthdays={todayBirthdays} />
            )}

            {/* ── Time Tracker — full-width card ── */}
            <div style={{ marginBottom:20 }}>
              <TimeTracker />
            </div>

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

            {/* ── Tea Time Announcement (always visible) ── */}
            {teaStatus === "active" ? (
              /* ACTIVE 4:30–4:45 PM — brand dark gradient with live countdown */
              <div className="tea-active">
                <div className="tea-active-inner">
                  <div className="tea-active-icon">
                    <i className="bi bi-cup-hot-fill" />
                  </div>
                  <div className="tea-active-info">
                    <div className="tea-active-eyebrow">Viralon · Daily Tea Break</div>
                    <div className="tea-active-title">Tea Time — Take a Break</div>
                    <div className="tea-active-sub">
                      Step away from your screen and recharge.
                      Break runs from <strong style={{ color:"#C7D2FE" }}>4:30 PM to 4:45 PM</strong> daily.
                    </div>
                  </div>
                  <div className="tea-timer-block">
                    <div className="tea-timer-eyebrow">TIME REMAINING</div>
                    <div className="tea-timer-digits">{fmtCountdown(teaRemaining)}</div>
                  </div>
                </div>
              </div>
            ) : (
              /* IDLE / UPCOMING — compact single-row card */
              <div className="tea-card">
                <div className="tea-card-accent" />
                <div className="tea-card-body">
                  <div className="tea-card-icon">
                    <i className="bi bi-cup-hot-fill" />
                  </div>
                  <div className="tea-card-content">
                    <div className="tea-card-eyebrow">Daily Announcement</div>
                    <div className="tea-card-title">Tea Break · 4:30 – 4:45 PM</div>
                    <div className="tea-card-sub">
                      Your daily 15-min reset. Relax, breathe and come back stronger.
                    </div>
                  </div>
                  <div className="tea-card-badge">
                    {teaStatus === "upcoming" ? (
                      <>
                        <div className="tea-card-badge-time" style={{ color:"#4F46E5", fontSize:14 }}>
                          {Math.ceil(teaCountdown / 60)}m
                        </div>
                        <div className="tea-card-badge-label">Soon</div>
                      </>
                    ) : (
                      <>
                        <div className="tea-card-badge-time">4:30<br />4:45</div>
                        <div className="tea-card-badge-label">PM · Daily</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Hero card ── */}
            <div className="ed-hero">
              <div className="ed-hero-avatar">
                {employee?.personal?.avatar
                  ? <img src={employee.personal.avatar} alt="avatar" />
                  : getInitials(employee?.firstName, employee?.lastName)
                }
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

            {/* ══════════════════════════════════════
                5 SUMMARY STAT CARDS
            ══════════════════════════════════════ */}
            <div className="ed-summary-grid">
              {loadingLive
                ? Array.from({length:5}).map((_,i) => (
                    <div key={i} style={{ background:"#fff", border:"1px solid #F0F0F0", borderRadius:14, padding:"16px 18px" }}>
                      <div className="ed-skeleton" style={{ width:40, height:40, borderRadius:12, marginBottom:10 }} />
                      <div className="ed-skeleton" style={{ width:"55%", height:18, borderRadius:6, marginBottom:6 }} />
                      <div className="ed-skeleton" style={{ width:"70%", height:12, borderRadius:4 }} />
                    </div>
                  ))
                : [
                    { label:"Present Days",    val: liveReport?.presentDays  ?? "—",
                      sub:`of ${liveReport?.elapsedWorkingDays || "—"} elapsed days`,
                      icon:"bi-check-circle-fill", bg:"#DCFCE7", color:"#15803D", border:"#BBF7D0" },
                    { label:"Absent Days",     val: liveReport?.absentDays   ?? "—",
                      sub:(liveReport?.absentDays||0) > 0 ? "Salary deducted" : "No absences",
                      icon:"bi-x-circle-fill",    bg:"#FEE2E2", color:"#DC2626", border:"#FECACA" },
                    { label:"Late Arrivals",   val: liveReport?.lateCount ?? "—",
                      sub:(liveReport?.lateCount||0) > 0 ? `₹${fmtMoney(liveReport?.deductions?.late)} deducted` : "No late arrivals",
                      icon:"bi-alarm-fill",      bg:"#FEF9C3", color:"#B45309", border:"#FDE68A" },
                    { label:"Deductions",      val:`₹${fmtMoney(liveReport?.deductions?.total)}`,
                      sub:"This month so far",
                      icon:"bi-dash-circle-fill", bg:"#FFF1F2", color:"#E11D48", border:"#FECDD3" },
                ].map((s, i) => (
                    <div key={i} style={{ background:"#fff", border:`1.5px solid ${s.border}`, borderRadius:14, padding:"16px 18px" }}>
                      <div style={{ width:42, height:42, borderRadius:12, background:s.bg, color:s.color,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, marginBottom:12, flexShrink:0 }}>
                        <i className={`bi ${s.icon}`} />
                      </div>
                      <div style={{ fontSize:22, fontWeight:800, color:"#111827", lineHeight:1 }}>{s.val}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginTop:5 }}>{s.label}</div>
                      <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>{s.sub}</div>
                    </div>
                  )).concat(
                    /* Net Salary card — hidden by default, eye icon to reveal */
                    <div key="net" style={{ background:"#fff", border:"1.5px solid #C7D2FE", borderRadius:14, padding:"16px 18px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                        <div style={{ width:42, height:42, borderRadius:12, background:"#EEF2FF", color:"#4F46E5",
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                          <i className="bi bi-wallet2" />
                        </div>
                        <button onClick={() => setShowSalary(v => !v)}
                          style={{ border:"none", background:"none", cursor:"pointer", color:"#9CA3AF", fontSize:16, padding:4, lineHeight:1 }}>
                          <i className={`bi bi-eye${showSalary ? "-slash" : ""}`} />
                        </button>
                      </div>
                      <div style={{ fontSize:22, fontWeight:800, color:"#111827", lineHeight:1, letterSpacing: showSalary ? 0 : 2 }}>
                        {showSalary ? `₹${fmtMoney(liveReport?.netPay)}` : "₹ ••••••"}
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginTop:5 }}>Net Salary</div>
                      <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>Estimated this month</div>
                    </div>
                  )
              }
            </div>

            {/* ══════════════════════════════════════
                MAIN 2-COLUMN GRID
            ══════════════════════════════════════ */}
            <div className="ed-main-grid">

              {/* ── LEFT COLUMN ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

                {/* Monthly Attendance Summary */}
                <div className="ed-card">
                  <div className="ed-card-header">
                    <h5>
                      <i className="bi bi-bar-chart-line me-2" style={{ color:"#4F46E5" }}></i>
                      Monthly Attendance — {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
                    </h5>
                    {liveReport?.isPartialMonth && (
                      <span style={{ background:"#EFF6FF", color:"#1E40AF", padding:"2px 8px", borderRadius:6, fontSize:10, fontWeight:700 }}>
                        Partial Month
                      </span>
                    )}
                  </div>
                  <div className="ed-card-body">
                    {liveReport ? (
                      <>
                        {/* Attendance progress bars */}
                        {[
                          { label:"Present", val:liveReport.presentDays, max:liveReport.elapsedWorkingDays, unit:"days",     color:"#22C55E" },
                          { label:"Absent",  val:liveReport.absentDays,  max:liveReport.elapsedWorkingDays, unit:"days",     color:"#EF4444" },
                          { label:"Late",    val:liveReport.lateCount,   max:Math.max(liveReport.elapsedWorkingDays,1), unit:"arrivals", color:"#F59E0B" },
                        ].map(bar => (
                          <div key={bar.label} style={{ marginBottom:16 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{bar.label}</span>
                              <span style={{ fontSize:13, fontWeight:800, color:"#111827" }}>
                                {bar.val} {bar.unit}
                              </span>
                            </div>
                            <div style={{ height:8, borderRadius:10, background:"#F3F4F6", overflow:"hidden" }}>
                              <div style={{
                                height:"100%", borderRadius:10, background:bar.color,
                                width:`${bar.max ? Math.min((bar.val/bar.max)*100, 100) : 0}%`,
                                transition:"width .7s ease"
                              }} />
                            </div>
                          </div>
                        ))}

                        {/* Deduction breakdown */}
                        <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid #F3F4F6" }}>
                          <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:".05em", marginBottom:12 }}>
                            Deduction Breakdown
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                            {[
                              { label:"Absent",       val:liveReport.deductions?.absent      || 0, color:"#DC2626" },
                              { label:"Late",         val:liveReport.deductions?.late        || 0, color:"#D97706" },
                              { label:"Unpaid Leave", val:liveReport.deductions?.unpaidLeave || 0, color:"#7C3AED" },
                              { label:"Half Day",     val:liveReport.deductions?.halfDay     || 0, color:"#1D4ED8" },
                              { label:"Lunch",        val:liveReport.deductions?.lunch       || 0, color:"#A21CAF" },
                              { label:"Total",        val:liveReport.deductions?.total       || 0, color:"#E11D48", bold:true },
                            ].map(d => (
                              <div key={d.label} style={{ background: d.bold ? "#FFF1F2" : "#F9FAFB", borderRadius:10, padding:"10px 12px",
                                border: d.bold ? "1px solid #FECDD3" : "none" }}>
                                <div style={{ fontSize:14, fontWeight:d.bold?800:700, color:d.val>0?d.color:"#9CA3AF" }}>
                                  ₹{fmtMoney(d.val)}
                                </div>
                                <div style={{ fontSize:10, color:"#9CA3AF", marginTop:2 }}>{d.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign:"center", padding:"24px 0", color:"#9CA3AF" }}>
                        <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
                        <div style={{ fontSize:12 }}>Loading attendance data…</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grade + Leave Balance — 2-col row */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

                  {/* Work Performance Grade */}
                  <div className="ed-card">
                    <div className="ed-card-header">
                      <h5><i className="bi bi-graph-up me-2" style={{ color:"#7C3AED" }}></i>Work Performance</h5>
                    </div>
                    <div className="ed-card-body" style={{ textAlign:"center" }}>
                      {loadingTasks ? (
                        <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      ) : (() => {
                        const now = new Date();
                        const g = calcGrade(filterTasksByMonth(tasks, now.getMonth(), now.getFullYear()));
                        const onTimePct = g.completed > 0 ? Math.round((g.aCnt / g.completed) * 100) : 0;
                        const bg = g.color + "22";
                        return (
                          <>
                            <div style={{
                              width:76, height:76, borderRadius:"50%",
                              background:bg, border:`3px solid ${g.color}`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              margin:"0 auto 12px", fontSize:32, fontWeight:900, color:g.color,
                            }}>
                              {g.letter}
                            </div>
                            <div style={{ fontSize:15, fontWeight:800, color:"#111827" }}>
                              {onTimePct >= 80 ? "On Track" : onTimePct >= 60 ? "Needs Attention" : g.total === 0 ? "No Tasks Yet" : "Behind Schedule"}
                            </div>
                            <div style={{ fontSize:12, color:"#9CA3AF", marginTop:3 }}>
                              {g.completed > 0 ? `${onTimePct}% on-time · ${g.completed} completed` : "No completed tasks yet"}
                            </div>
                            {/* Mini stat row */}
                            <div style={{ display:"flex", gap:0, marginTop:14, borderRadius:10, overflow:"hidden", border:"1px solid #F0F0F0" }}>
                              {[
                                { val: tasks.filter(t=>t.status==="todo").length,        label:"To Do",  color:"#6B7280", bg:"#F9FAFB" },
                                { val: tasks.filter(t=>t.status==="in_progress").length, label:"Active", color:"#4F46E5", bg:"#EEF2FF" },
                                { val: tasks.filter(t=>t.status==="completed").length,   label:"Done",   color:"#15803D", bg:"#DCFCE7" },
                              ].map((s,i) => (
                                <div key={i} style={{ flex:1, textAlign:"center", padding:"8px 4px", background:s.bg }}>
                                  <div style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.val}</div>
                                  <div style={{ fontSize:10, color:s.color, opacity:.8 }}>{s.label}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop:10, padding:"7px 10px", borderRadius:8, background:"#F9FAFB", fontSize:11, color:"#6B7280", lineHeight:1.5 }}>
                              {g.letter==="A+" || g.letter==="A" ? "Excellent! Submitting tasks on time." :
                               g.letter==="B+" || g.letter==="B" ? "Good work! Aim to submit before deadlines." :
                               g.total === 0 ? "No tasks assigned yet." :
                               "Focus on completing overdue tasks to improve."}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Leave Balance */}
                  <div className="ed-card">
                    <div className="ed-card-header">
                      <h5><i className="bi bi-calendar2-check me-2" style={{ color:"#059669" }}></i>Leave Balance</h5>
                    </div>
                    <div className="ed-card-body">
                      {leaveBalance ? (
                        [
                          { label:"Sick",   used:leaveBalance.sick?.used||0,   total:leaveBalance.sick?.total||6,   color:"#F59E0B" },
                          { label:"Casual", used:leaveBalance.casual?.used||0, total:leaveBalance.casual?.total||6, color:"#6366F1" },
                        ].map(lb => (
                          <div key={lb.label} style={{ marginBottom:16 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{lb.label}</span>
                              <span style={{ fontSize:11, color:"#9CA3AF" }}>
                                {lb.total - lb.used} left / {lb.total}
                              </span>
                            </div>
                            <div style={{ height:6, borderRadius:10, background:"#F3F4F6", overflow:"hidden" }}>
                              <div style={{
                                height:"100%", borderRadius:10, background:lb.color,
                                width:`${lb.total ? Math.min((lb.used/lb.total)*100,100) : 0}%`,
                                transition:"width .7s"
                              }} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* ── RIGHT COLUMN ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

                {/* Today's Tasks */}
                <div className="ed-card">
                  <div className="ed-card-header">
                    <h5><i className="bi bi-clipboard2-check me-2" style={{ color:"#4F46E5" }}></i>Today's Tasks</h5>
                    <Link href="/employee/tasks" style={{ fontSize:11, color:"#4F46E5", fontWeight:700, textDecoration:"none" }}>
                      View All →
                    </Link>
                  </div>
                  <div className="ed-card-body" style={{ padding:"14px 18px" }}>
                    {loadingTasks ? (
                      <div style={{ textAlign:"center", padding:"16px 0" }}>
                        <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      </div>
                    ) : (() => {
                      const todayTasks   = tasks.filter(t => isTaskDueToday(t.dueDate) && t.status !== "completed");
                      const inProgress   = tasks.filter(t => t.status === "in_progress" && !isTaskDueToday(t.dueDate));
                      const overdueTasks = tasks.filter(t => t.dueDate && isTaskDuePast(t.dueDate) && t.status !== "completed");
                      const showTasks    = [...todayTasks, ...inProgress].slice(0, 5);

                      if (tasks.length === 0) return (
                        <div style={{ textAlign:"center", padding:"20px 0", color:"#9CA3AF" }}>
                          <i className="bi bi-clipboard2" style={{ fontSize:32, display:"block", marginBottom:8 }} />
                          <div style={{ fontSize:13, fontWeight:600 }}>No tasks assigned yet</div>
                        </div>
                      );

                      return (
                        <>
                          {/* Overdue warning */}
                          {overdueTasks.length > 0 && (
                            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:9,
                              padding:"9px 12px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
                              <i className="bi bi-exclamation-triangle-fill" style={{ color:"#EF4444", fontSize:14, flexShrink:0 }} />
                              <span style={{ fontSize:12, color:"#B91C1C", fontWeight:600 }}>
                                {overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""} — submit now
                              </span>
                            </div>
                          )}

                          {/* Task list */}
                          {showTasks.length === 0 ? (
                            <div style={{ textAlign:"center", padding:"10px 0", color:"#9CA3AF", fontSize:12 }}>
                              No tasks due today
                            </div>
                          ) : showTasks.map((t) => {
                            const st = TASK_ST[t.status] || TASK_ST.todo;
                            const dl = t.dueDate ? taskDeadlineText(t.dueDate) : null;
                            return (
                              <div key={t._id} style={{ padding:"9px 0", borderBottom:"1px solid #F5F5F5" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ width:7, height:7, borderRadius:"50%", background:PRIO_DOT[t.priority]||"#9CA3AF", flexShrink:0 }} />
                                  <span style={{ fontSize:12, fontWeight:600, color:"#111827", flex:1, lineHeight:1.3 }}>
                                    {t.title}
                                  </span>
                                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:6,
                                    background:st.bg, color:st.color, flexShrink:0, whiteSpace:"nowrap" }}>
                                    {st.label}
                                  </span>
                                </div>
                                {(t.brandId || dl) && (
                                  <div style={{ display:"flex", gap:10, paddingLeft:15, marginTop:3 }}>
                                    {t.brandId?.name && (
                                      <span style={{ fontSize:10, color:"#6B7280" }}>{t.brandId.name}</span>
                                    )}
                                    {dl && (
                                      <span style={{ fontSize:10, color:dl.color, fontWeight:600 }}>{dl.text}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Summary counts */}
                          <div style={{ display:"flex", gap:0, marginTop:14, borderRadius:10, overflow:"hidden", border:"1px solid #F0F0F0" }}>
                            {[
                              { val:tasks.filter(t=>t.status==="todo").length,        label:"To Do",  color:"#6B7280", bg:"#F9FAFB" },
                              { val:tasks.filter(t=>t.status==="in_progress").length, label:"Active", color:"#4F46E5", bg:"#EEF2FF" },
                              { val:tasks.filter(t=>t.status==="review").length,      label:"Review", color:"#B45309", bg:"#FEF3C7" },
                              { val:tasks.filter(t=>t.status==="completed").length,   label:"Done",   color:"#15803D", bg:"#DCFCE7" },
                            ].map((s,i) => (
                              <div key={i} style={{ flex:1, textAlign:"center", padding:"8px 4px", background:s.bg }}>
                                <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{s.val}</div>
                                <div style={{ fontSize:9, color:s.color, opacity:.8, fontWeight:600 }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}

                    {/* Quick links */}
                    <div style={{ marginTop:14, display:"flex", gap:8, flexWrap:"wrap" }}>
                      {[
                        { href:"/employee/tasks",             icon:"bi-kanban",         label:"My Tasks",    bg:"#EEF2FF", color:"#4F46E5" },
                        { href:"/employee/leaves-management", icon:"bi-calendar-plus",  label:"Apply Leave", bg:"#ECFDF5", color:"#059669" },
                        { href:"/employee/deduction-waiver",  icon:"bi-shield-check",   label:"Deductions",  bg:"#FFF1F2", color:"#E11D48" },
                      ].map(a => (
                        <Link key={a.href} href={a.href} style={{
                          display:"inline-flex", alignItems:"center", gap:5,
                          fontSize:11, fontWeight:700, background:a.bg, color:a.color,
                          padding:"6px 12px", borderRadius:8, textDecoration:"none",
                        }}>
                          <i className={`bi ${a.icon}`} /> {a.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Upcoming Holidays */}
                <div className="ed-card">
                  <div className="ed-card-header">
                    <h5>
                      <i className="bi bi-calendar-heart me-2" style={{ color:"#4F46E5" }}></i>
                      Upcoming Holidays
                    </h5>
                    <span style={{ background:"#EEF2FF", color:"#4F46E5", borderRadius:20, padding:"2px 12px", fontSize:12, fontWeight:700 }}>
                      {holidays.length}
                    </span>
                  </div>
                  <div className="ed-card-body">
                    {loadingHolidays ? (
                      <div style={{ textAlign:"center", padding:"16px 0", color:"#9CA3AF" }}>
                        <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      </div>
                    ) : holidays.length === 0 ? (
                      <div style={{ textAlign:"center", padding:"16px 0", color:"#9CA3AF" }}>
                        <i className="bi bi-calendar-x" style={{ fontSize:28, display:"block", marginBottom:6 }}></i>
                        No Upcoming Holidays
                      </div>
                    ) : (
                      holidays.slice(0, 4).map((h, i) => {
                        const st = holidayStatus(h);
                        const isToday = st === "today";
                        const isMulti = h.totalDays > 1;
                        return (
                          <div key={i} className={`ed-holiday-item ${isToday?"today-item":""}`}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                              {isMulti && (
                                <span className="ed-holiday-tag" style={{ background:isToday?"#DBEAFE":"#EEF2FF", color:isToday?"#1D4ED8":"#4F46E5" }}>
                                  {h.totalDays}d
                                </span>
                              )}
                              <div className="ed-holiday-name">{h.name}</div>
                            </div>
                            <span className={`ed-holiday-date ${isToday?"today-badge":""}`}>
                              {isMulti ? `${fmtShort(h.startDate)} – ${fmtShort(h.endDate)}` : fmtShort(h.startDate)}
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
                      <div style={{ textAlign:"center", padding:"16px 0", color:"#9CA3AF" }}>
                        <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      </div>
                    ) : announcements.length === 0 ? (
                      <div style={{ textAlign:"center", padding:"16px 0", color:"#9CA3AF" }}>
                        <i className="bi bi-megaphone" style={{ fontSize:28, display:"block", marginBottom:6 }}></i>
                        No announcements
                      </div>
                    ) : (
                      announcements.slice(0, 3).map((a) => (
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

          </div>
        </section>
      </div>

      {/* Lunch reminder is now handled by TimeTracker component */}
    </>
  );
}












// // pages/employee/dashboard.js
// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import Dashnav from "@/components/Dashnav";
// import Head from "next/head";
// import { getSocket } from "@/utils/socket";
// import Leftbar from "@/components/employee/Leftbar";
// import LeftbarMobile from "@/components/employee/LeftbarMobile";
// import TimeTracker from "@/components/employee/TimeTracker";

// const fmtShort = (d) =>
//   new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// const holidayStatus = (h) => {
//   const now   = new Date(); now.setHours(0,0,0,0);
//   const start = new Date(h.startDate); start.setHours(0,0,0,0);
//   const end   = new Date(h.endDate);   end.setHours(0,0,0,0);
//   if (start <= now && end >= now) return "today";
//   if (end < now)                  return "passed";
//   return "upcoming";
// };

// function calcCompletion(emp) {
//   if (!emp) return 0;
//   const checks = [
//     emp?.personal?.mobile, emp?.personal?.email, emp?.personal?.dob,
//     emp?.personal?.address, emp?.personal?.city, emp?.personal?.state,
//     emp?.personal?.maritalStatus, emp?.professional?.department,
//     emp?.professional?.designation, emp?.professional?.dateOfJoining,
//     emp?.salary?.bankName, emp?.salary?.accountNumber, emp?.salary?.ifscCode,
//     emp?.salary?.panNumber, emp?.documents?.appointmentLetter,
//   ];
//   return Math.round((checks.filter(Boolean).length / checks.length) * 100);
// }

// const getInitials = (f, l) =>
//   `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "?";

// export default function EmployeeDashboard() {
//   const [employee,           setEmployee]           = useState(null);
//   const [holidays,           setHolidays]           = useState([]);
//   const [loadingHolidays,    setLoadingHolidays]    = useState(true);
//   const [announcements,      setAnnouncements]      = useState([]);
//   const [loadingAnnounce,    setLoadingAnnounce]    = useState(true);
//   const [today,              setToday]              = useState("");
//   const [showReminder,       setShowReminder]       = useState(false);
//   const [triggeredToday,     setTriggeredToday]     = useState(false);
//   const [employeeStatus,     setEmployeeStatus]     = useState({});
//   const [summary,            setSummary]            = useState({ total:0, checkedIn:0, yetToCheckIn:0, leaveTaken:0 });

//   // ── Employee ───────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const token = localStorage.getItem("employeeToken");
//     fetch("/api/employee/me", { headers: { Authorization: `Bearer ${token}` } })
//       .then(r => r.json())
//       .then(d => { if (d.success) setEmployee(d.employee); })
//       .catch(console.error);
//   }, []);

//   // ── Holidays ──────────────────────────────────────────────────────────────
//   useEffect(() => {
//     fetch("/api/payroll/holidays/upcoming")
//       .then(r => r.json())
//       .then(d => { if (d.success) setHolidays(d.data); })
//       .catch(console.error)
//       .finally(() => setLoadingHolidays(false));
//   }, []);

//   // ── Announcements ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     fetch("/api/announcements/active")
//       .then(r => r.json())
//       .then(d => { if (d.success) setAnnouncements(d.announcements); })
//       .catch(console.error)
//       .finally(() => setLoadingAnnounce(false));
//   }, []);

//   // ── Attendance overview ───────────────────────────────────────────────────
//   useEffect(() => {
//     fetch("/api/payroll/attendance/overview")
//       .then(r => r.json())
//       .then(d => { if (d.success) setSummary(d.summary); })
//       .catch(console.error);
//   }, []);

//   // ── Socket ────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     fetch("/api/socket");
//     const socket = getSocket();
//     const onConnect      = () => socket.emit("admin:requestSnapshot");
//     const onStatusUpdate = (data) => setEmployeeStatus(prev => ({ ...prev, [data.employeeId]: data }));
//     const onSnapshot     = (snap) => {
//       const m = {}; snap.forEach(i => { m[i.employeeId] = i; }); setEmployeeStatus(m);
//     };
//     socket.on("connect",                onConnect);
//     socket.on("employeeStatusUpdate",   onStatusUpdate);
//     socket.on("employeeStatusSnapshot", onSnapshot);
//     return () => {
//       socket.off("connect", onConnect);
//       socket.off("employeeStatusUpdate", onStatusUpdate);
//       socket.off("employeeStatusSnapshot", onSnapshot);
//     };
//   }, []);

//   // ── Date ticker ───────────────────────────────────────────────────────────
//   useEffect(() => {
//     const opts = { weekday:"long", year:"numeric", month:"long", day:"numeric" };
//     const tick = () => setToday(new Date().toLocaleDateString("en-US", opts));
//     tick();
//     const id = setInterval(tick, 60000);
//     return () => clearInterval(id);
//   }, []);

//   // ── Lunch reminder ────────────────────────────────────────────────────────
//   useEffect(() => {
//     const id = setInterval(() => {
//       const now = new Date();
//       if (now.getHours() === 13 && now.getMinutes() === 30 && !triggeredToday) {
//         new Audio("/sounds/lunch-warning.mp3").play().catch(() => {});
//         setShowReminder(true);
//         setTriggeredToday(true);
//         setTimeout(() => setTriggeredToday(false), 86400000);
//       }
//     }, 1000);
//     return () => clearInterval(id);
//   }, [triggeredToday]);

//   const completion = calcCompletion(employee);
//   const name       = employee ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim() : "";

//   if (!employee) return (
//     <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
//       <div className="spinner-border text-primary" role="status"></div>
//     </div>
//   );

//   return (
//     <>
//       <Head>
//         <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
//         <link rel="stylesheet" href="/asets/css/main.css" />
//         <link rel="stylesheet" href="/asets/css/admin.css" />
//         <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
//         <style>{`
//           /* ══════════════════════════════════════════
//              EMPLOYEE DASHBOARD
//           ══════════════════════════════════════════ */

//           /* Profile hero card */
//           .ed-hero {
//             background: linear-gradient(135deg, #1e1b4b 0%, #4F46E5 55%, #7C3AED 100%);
//             border-radius: 18px; padding: 24px 28px;
//             display: flex; align-items: center; gap: 20px;
//             margin-bottom: 20px; flex-wrap: wrap;
//             position: relative; overflow: hidden;
//           }
//           .ed-hero::before {
//             content: ""; position: absolute;
//             width: 300px; height: 300px; border-radius: 50%;
//             background: rgba(255,255,255,.04);
//             top: -100px; right: -80px; pointer-events: none;
//           }
//           .ed-hero-avatar {
//             width: 64px; height: 64px; border-radius: 50%;
//             background: rgba(255,255,255,.2);
//             display: flex; align-items: center; justify-content: center;
//             font-size: 22px; font-weight: 800; color: #fff;
//             border: 3px solid rgba(255,255,255,.35); flex-shrink: 0;
//           }
//           .ed-hero-info { flex: 1; min-width: 0; }
//           .ed-hero-name { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 2px; }
//           .ed-hero-role { font-size: 13px; color: rgba(255,255,255,.7); margin-bottom: 8px; }
//           .ed-hero-badge {
//             display: inline-flex; align-items: center; gap: 5px;
//             background: rgba(255,255,255,.15); color: #fff;
//             padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
//           }

//           /* Profile completion in hero */
//           .ed-hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
//           @media(max-width:600px){ .ed-hero-right{ align-items:flex-start; width:100%; } }
//           .ed-view-profile-btn {
//             display: inline-flex; align-items: center; gap: 6px;
//             background: rgba(255,255,255,.15); color: #fff;
//             border: 1.5px solid rgba(255,255,255,.3);
//             padding: 8px 18px; border-radius: 10px;
//             font-size: 13px; font-weight: 600; text-decoration: none;
//             transition: background .2s;
//           }
//           .ed-view-profile-btn:hover { background: rgba(255,255,255,.25); color: #fff; }
//           .ed-complete-btn {
//             display: inline-flex; align-items: center; gap: 6px;
//             background: #FCD34D; color: #92400E;
//             border: none; padding: 8px 18px; border-radius: 10px;
//             font-size: 12px; font-weight: 700; text-decoration: none;
//             transition: background .2s;
//           }
//           .ed-complete-btn:hover { background: #FDE68A; color: #92400E; }

//           /* Completion bar in hero */
//           .ed-hero-progress-wrap { width: 180px; }
//           @media(max-width:600px){ .ed-hero-progress-wrap{ width:100%; } }
//           .ed-hero-progress-label { display:flex; justify-content:space-between; font-size:11px; color:rgba(255,255,255,.8); margin-bottom:5px; font-weight:600; }
//           .ed-hero-progress-bg { height:6px; background:rgba(255,255,255,.2); border-radius:10px; }
//           .ed-hero-progress-fill { height:100%; border-radius:10px; background:linear-gradient(90deg,#4ADE80,#22C55E); transition:width .6s; }

//           /* Quick stats strip */
//           .ed-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
//           @media(max-width:768px){ .ed-stats{ grid-template-columns:repeat(2,1fr); } }
//           @media(max-width:400px){ .ed-stats{ grid-template-columns:1fr 1fr; } }
//           .ed-stat {
//             background:#fff; border:1px solid #F0F0F0; border-radius:14px;
//             padding:16px 18px; display:flex; align-items:center; gap:12px;
//           }
//           .ed-stat-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
//           .ed-stat-val   { font-size:18px; font-weight:800; color:#111827; line-height:1; }
//           .ed-stat-label { font-size:11px; color:#9CA3AF; font-weight:500; margin-top:2px; }

//           /* Main grid */
//           .ed-grid { display:grid; grid-template-columns:1fr 380px; gap:20px; }
//           @media(max-width:1024px){ .ed-grid{ grid-template-columns:1fr; } }

//           /* Cards */
//           .ed-card { background:#fff; border:1px solid #F0F0F0; border-radius:16px; overflow:hidden; }
//           .ed-card-header {
//             padding:16px 20px; display:flex; justify-content:space-between; align-items:center;
//             border-bottom:1px solid #F5F5F5;
//           }
//           .ed-card-header h5 { font-weight:700; color:#111827; margin:0; font-size:14px; }
//           .ed-card-body { padding:16px 20px; }

//           /* Holiday list */
//           .ed-holiday-item {
//             display:flex; align-items:center; justify-content:space-between;
//             padding:10px 14px; border-radius:10px; margin-bottom:8px;
//             background:#F9FAFB; transition:background .15s;
//           }
//           .ed-holiday-item:last-child { margin-bottom:0; }
//           .ed-holiday-item.today-item { background:#EEF2FF; }
//           .ed-holiday-name { font-weight:600; color:#111827; font-size:13px; }
//           .ed-holiday-desc { font-size:11px; color:#9CA3AF; margin-top:1px; }
//           .ed-holiday-date {
//             font-weight:600; font-size:11px; padding:4px 10px; border-radius:8px;
//             white-space:nowrap; flex-shrink:0;
//             background:#fff; color:#374151; border:1px solid #E5E7EB;
//           }
//           .ed-holiday-date.today-badge { background:#4F46E5; color:#fff; border:none; }
//           .ed-holiday-tag { font-size:10px; font-weight:700; padding:2px 7px; border-radius:6px; margin-right:6px; flex-shrink:0; }

//           /* Announcements */
//           .ed-announce-item { padding:12px 0; border-bottom:1px solid #F5F5F5; }
//           .ed-announce-item:last-child { border-bottom:none; padding-bottom:0; }
//           .ed-announce-title { font-weight:700; color:#111827; font-size:13px; margin-bottom:3px; }
//           .ed-announce-msg   { font-size:12.5px; color:#6B7280; line-height:1.5; margin-bottom:4px; }
//           .ed-announce-date  { font-size:11px; color:#9CA3AF; }
//           .ed-high-badge { background:#FEE2E2; color:#DC2626; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; }

//           /* Quick links */
//           .ed-quick-links { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
//           @media(max-width:400px){ .ed-quick-links{ grid-template-columns:repeat(2,1fr); } }
//           .ed-quick-link {
//             display:flex; flex-direction:column; align-items:center; justify-content:center;
//             padding:14px 8px; border-radius:12px; border:1.5px solid #F0F0F0;
//             text-decoration:none; gap:6px; transition:all .15s; background:#fff;
//           }
//           .ed-quick-link:hover { border-color:#4F46E5; background:#EEF2FF; }
//           .ed-quick-link i { font-size:20px; color:#4F46E5; }
//           .ed-quick-link span { font-size:11px; font-weight:600; color:#374151; text-align:center; }

//           /* Profile incomplete nudge */
//           .ed-nudge {
//             display:flex; align-items:center; gap:12px;
//             background:#FFFBEB; border:1.5px solid #FCD34D; border-radius:12px;
//             padding:12px 16px; margin-bottom:20px;
//           }
//           .ed-nudge i { color:#D97706; font-size:18px; flex-shrink:0; }
//           .ed-nudge-text { flex:1; font-size:12.5px; color:#92400E; }
//           .ed-nudge-text strong { display:block; margin-bottom:1px; }
//           .ed-nudge-btn {
//             padding:6px 14px; border-radius:8px; border:none;
//             background:#D97706; color:#fff; font-size:12px; font-weight:600;
//             cursor:pointer; white-space:nowrap; text-decoration:none;
//           }

//           /* Timetracker row */
//           .ed-breadcrumb-row {
//             display:flex; align-items:center; justify-content:space-between;
//             flex-wrap:wrap; gap:10px; margin-bottom:20px;
//           }

//           /* Responsive tweaks */
//           @media(max-width:576px){
//             .ed-hero { padding:18px; gap:14px; }
//             .ed-hero-name { font-size:16px; }
//             .ed-stat { padding:12px 14px; }
//             .ed-stat-val { font-size:16px; }
//           }
//         `}</style>
//       </Head>

//       <div className="main-nav">
//         <Leftbar />
//         <LeftbarMobile />
//         <Dashnav />

//         <section className="content home">
//           {/* ── Breadcrumb + TimeTracker ── */}
//           <div className="breadcrum-bx">
//             <ul className="breadcrumb bg-white d-flex align-items-center justify-content-between flex-wrap gap-2">
//               <li className="breadcrumb-item">
//                 <Link href="/employee/dashboard">
//                   <img src="/icons/home.svg" alt="" /> Home
//                 </Link>
//               </li>
//               <li style={{ marginLeft:"auto" }}>
//                 <TimeTracker />
//               </li>
//             </ul>
//           </div>

//           <div className="block-header">

//             {/* ── Profile incomplete nudge ── */}
//             {completion < 100 && (
//               <div className="ed-nudge">
//                 <i className="bi bi-exclamation-triangle-fill"></i>
//                 <div className="ed-nudge-text">
//                   <strong>Profile {completion}% complete</strong>
//                   Complete your profile for accurate payroll & HR records.
//                 </div>
//                 <Link href="/employee/complete-profile" className="ed-nudge-btn">
//                   Complete →
//                 </Link>
//               </div>
//             )}

//             {/* ── Hero card ── */}
//             <div className="ed-hero">
//               <div className="ed-hero-avatar">
//                 {getInitials(employee?.firstName, employee?.lastName)}
//               </div>
//               <div className="ed-hero-info">
//                 <div className="ed-hero-name">Welcome back, {employee.firstName}!</div>
//                 <div className="ed-hero-role">
//                   {employee?.professional?.designation || "Employee"}
//                   {employee?.professional?.department && ` · ${employee.professional.department}`}
//                 </div>
//                 {employee?.employeeId && (
//                   <span className="ed-hero-badge">
//                     <i className="bi bi-person-badge"></i> {employee.employeeId}
//                   </span>
//                 )}
//               </div>

//               <div className="ed-hero-right">
//                 {/* Completion progress */}
//                 <div className="ed-hero-progress-wrap">
//                   <div className="ed-hero-progress-label">
//                     <span>Profile</span>
//                     <span>{completion}%</span>
//                   </div>
//                   <div className="ed-hero-progress-bg">
//                     <div className="ed-hero-progress-fill" style={{ width:`${completion}%` }}></div>
//                   </div>
//                 </div>

//                 <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
//                   <Link href="/employee/profile" className="ed-view-profile-btn">
//                     <i className="bi bi-person-circle"></i> My Profile
//                   </Link>
//                   {completion < 100 && (
//                     <Link href="/employee/complete-profile" className="ed-complete-btn">
//                       <i className="bi bi-pencil-fill"></i> Complete
//                     </Link>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* ── Quick stats ── */}
//             {/* <div className="ed-stats">
//               {[
//                 { icon:"bi-calendar-check", bg:"#EEF2FF", ic:"#4F46E5", val: summary.checkedIn    ?? "—", label:"Present Today"   },
//                 { icon:"bi-calendar-x",     bg:"#FEE2E2", ic:"#DC2626", val: summary.yetToCheckIn ?? "—", label:"Yet to Check In" },
//                 { icon:"bi-palm",           bg:"#FEF3C7", ic:"#B45309", val: summary.leaveTaken   ?? "—", label:"Leaves Taken"    },
//                 { icon:"bi-clock-history",  bg:"#F3E8FF", ic:"#7C3AED", val: "OT",                        label:"Overtime →", href:"/employee/overtime" },
//               ].map((s, i) => (
//                 <div key={i} className="ed-stat">
//                   <div className="ed-stat-icon" style={{ background:s.bg, color:s.ic }}>
//                     <i className={`bi ${s.icon}`}></i>
//                   </div>
//                   <div>
//                     <div className="ed-stat-val">{s.val ?? "—"}</div>
//                     <div className="ed-stat-label">{s.label}</div>
//                   </div>
//                 </div>
//               ))}
//             </div> */}

//             {/* ── Quick links ── */}
//             <div className="ed-card" style={{ marginBottom:20 }}>
//               <div className="ed-card-header">
//                 <h5><i className="bi bi-grid-3x3-gap me-2" style={{ color:"#4F46E5" }}></i>Quick Access</h5>
//               </div>
//               <div className="ed-card-body">
//                 <div className="ed-quick-links">
//                   {[
//                     { href:"/employee/attendance-summary", icon:"bi-calendar3",        label:"Attendance"     },
//                     { href:"/employee/leaves-management",  icon:"bi-calendar-minus",    label:"Leaves"         },
//                     { href:"/employee/reimbursement",      icon:"bi-receipt",           label:"Reimbursement"  },
//                     { href:"/employee/overtime",           icon:"bi-clock-history",     label:"Overtime"       },
//                     { href:"/employee/profile",            icon:"bi-person-circle",     label:"My Profile"     },
//                     { href:"/employee/complete-profile",   icon:"bi-folder2-open",      label:"Documents"      },
//                   ].map((l) => (
//                     <Link key={l.href} href={l.href} className="ed-quick-link">
//                       <i className={`bi ${l.icon}`}></i>
//                       <span>{l.label}</span>
//                     </Link>
//                   ))}
//                 </div>
//               </div>
//             </div>

//             {/* ── Main grid: Holidays + Announcements ── */}
//             <div className="ed-grid">
//               {/* Holidays */}
//               <div className="ed-card">
//                 <div className="ed-card-header">
//                   <h5>
//                     <i className="bi bi-calendar-heart me-2" style={{ color:"#4F46E5" }}></i>
//                     Upcoming Holidays {new Date().getFullYear()}
//                   </h5>
//                   <span style={{ background:"#EEF2FF", color:"#4F46E5", borderRadius:20, padding:"2px 12px", fontSize:12, fontWeight:700 }}>
//                     {holidays.length}
//                   </span>
//                 </div>
//                 <div className="ed-card-body">
//                   {loadingHolidays ? (
//                     <div style={{ textAlign:"center", padding:"24px 0", color:"#9CA3AF" }}>
//                       <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
//                       <div style={{ fontSize:12 }}>Loading…</div>
//                     </div>
//                   ) : holidays.length === 0 ? (
//                     <div style={{ textAlign:"center", padding:"24px 0", color:"#9CA3AF" }}>
//                       <i className="bi bi-calendar-x" style={{ fontSize:32, display:"block", marginBottom:8 }}></i>
//                       No upcoming holidays
//                     </div>
//                   ) : (
//                     holidays.slice(0, 6).map((h, i) => {
//                       const st      = holidayStatus(h);
//                       const isToday = st === "today";
//                       const isMulti = h.totalDays > 1;
//                       return (
//                         <div key={i} className={`ed-holiday-item ${isToday ? "today-item" : ""}`}>
//                           <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
//                             {isMulti && (
//                               <span className="ed-holiday-tag" style={{ background:isToday?"#DBEAFE":"#EEF2FF", color:isToday?"#1D4ED8":"#4F46E5" }}>
//                                 {h.totalDays}d
//                               </span>
//                             )}
//                             <div style={{ minWidth:0 }}>
//                               <div className="ed-holiday-name">{h.name}</div>
//                               {h.description && <div className="ed-holiday-desc">{h.description}</div>}
//                             </div>
//                           </div>
//                           <span className={`ed-holiday-date ${isToday ? "today-badge" : ""}`}>
//                             {isMulti
//                               ? `${fmtShort(h.startDate)} – ${fmtShort(h.endDate)}`
//                               : fmtShort(h.startDate)}
//                           </span>
//                         </div>
//                       );
//                     })
//                   )}
//                 </div>
//               </div>

//               {/* Announcements */}
//               <div className="ed-card">
//                 <div className="ed-card-header">
//                   <h5><i className="bi bi-megaphone me-2" style={{ color:"#4F46E5" }}></i>Announcements</h5>
//                 </div>
//                 <div className="ed-card-body">
//                   {loadingAnnounce ? (
//                     <div style={{ textAlign:"center", padding:"24px 0", color:"#9CA3AF" }}>
//                       <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
//                     </div>
//                   ) : announcements.length === 0 ? (
//                     <div style={{ textAlign:"center", padding:"24px 0", color:"#9CA3AF" }}>
//                       <i className="bi bi-megaphone" style={{ fontSize:32, display:"block", marginBottom:8 }}></i>
//                       No announcements
//                     </div>
//                   ) : (
//                     announcements.map((a) => (
//                       <div key={a._id} className="ed-announce-item">
//                         <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:4 }}>
//                           <div className="ed-announce-title">{a.title}</div>
//                           {a.priority === "high" && <span className="ed-high-badge">High</span>}
//                         </div>
//                         <div className="ed-announce-msg">{a.message}</div>
//                         <div className="ed-announce-date">
//                           {new Date(a.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
//                         </div>
//                       </div>
//                     ))
//                   )}
//                 </div>
//               </div>
//             </div>

//           </div>
//         </section>
//       </div>

//       {/* ── Lunch reminder ── */}
//       {showReminder && (
//         <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000 }}>
//           <div style={{ background:"#fff", borderRadius:18, padding:"28px 32px", width:300, textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,.2)", animation:"fadeIn .3s" }}>
//             <img src="/icons/alarm.png" alt="" width={36} style={{ marginBottom:12 }} />
//             <h5 style={{ fontWeight:800, color:"#111827" }}>Lunch Time!</h5>
//             <p style={{ fontSize:32, fontWeight:700, color:"#4F46E5", margin:"8px 0" }}>01:30 PM</p>
//             <p style={{ fontSize:13, color:"#6B7280", marginBottom:20 }}>
//               Your lunch break starts now. Deductions apply if you exceed the allowed break.
//             </p>
//             <button onClick={() => setShowReminder(false)}
//               style={{ background:"#4F46E5", color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", fontWeight:700, cursor:"pointer", width:"100%" }}>
//               Got it
//             </button>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }




