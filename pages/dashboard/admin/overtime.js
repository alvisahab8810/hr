// pages/dashboard/admin/overtime.js
import { toast } from "react-toastify";
import React, { useEffect, useState, useMemo } from "react";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Head from "next/head";
import Link from "next/link";

// ── OT Timer (shared util) ────────────────────────────────────────────────────
function getOTWindow(ot) {
  const d  = new Date(ot.date);
  const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const start = new Date(`${ds}T${ot.startTime}:00`);
  const end   = new Date(`${ds}T${ot.endTime}:00`);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
}
function fmtMs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
function AdminOTTimer({ ot }) {
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
        background:"#DCFCE7", borderRadius:8, padding:"8px 14px",
        fontSize:13, color:"#15803D", fontWeight:700, marginTop:10 }}>
        <i className="bi bi-check-circle-fill" /> OT Completed
      </div>
    );
  }
  if (now < start) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6,
        background:"#FEF9C3", borderRadius:8, padding:"8px 14px",
        fontSize:13, color:"#92400E", fontWeight:600, marginTop:10 }}>
        <i className="bi bi-clock-fill" /> Starts in {fmtMs(start - now)}
      </div>
    );
  }
  const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  return (
    <div style={{ background:"#EEF2FF", borderRadius:10, padding:"12px 14px", marginTop:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:"#DC2626", flexShrink:0,
          display:"inline-block", animation:"otPulse 1s ease-in-out infinite" }} />
        <span style={{ fontFamily:"monospace", fontSize:20, fontWeight:800, color:"#4F46E5", letterSpacing:1 }}>
          {fmtMs(elapsedMs)}
        </span>
        <span style={{ fontSize:11, color:"#6B7280", marginLeft:"auto" }}>
          {fmtMs(Math.max(0, end - now))} left
        </span>
      </div>
      <div style={{ background:"#C7D2FE", borderRadius:4, height:5, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%",
          background:"linear-gradient(90deg,#6366F1,#4F46E5)", borderRadius:4 }} />
      </div>
    </div>
  );
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const getEmpName = (ot) => {
  if (ot.employee?.personal?.firstName)
    return `${ot.employee.personal.firstName} ${ot.employee.personal.lastName || ""}`.trim();
  if (ot.employee?.firstName)
    return `${ot.employee.firstName} ${ot.employee.lastName || ""}`.trim();
  return ot.employee?.email || "—";
};

const getInitials = (name) =>
  name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0,2).toUpperCase();

const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],
  ["#FDF4FF","#A21CAF"],["#ECFDF5","#059669"],
];
const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const OT_TYPE_META = {
  "Weekend":       { bg:"#FEF3C7", color:"#B45309", icon:"bi-calendar-x"      },
  "Holiday":       { bg:"#DBEAFE", color:"#1D4ED8", icon:"bi-calendar-heart"  },
  "Weeknight":     { bg:"#F3E8FF", color:"#7C3AED", icon:"bi-moon-stars-fill" },
  "Regular":       { bg:"#DCFCE7", color:"#15803D", icon:"bi-clock-fill"      },
  "Late Night Work":{ bg:"#1E1B4B22", color:"#4338CA", icon:"bi-moon-fill"   },
  "Client Deadline":{ bg:"#FFF7ED",  color:"#C2410C", icon:"bi-alarm-fill"   },
  "Weekday OT":    { bg:"#F0FDF4", color:"#166534", icon:"bi-clock-history"  },
};
const otMeta = (type) => OT_TYPE_META[type] || { bg:"#F3F4F6", color:"#6B7280", icon:"bi-clock" };

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
const formatDay = (d) =>
  new Date(d).toLocaleDateString("en-IN", { weekday:"short" });

const formatTime = (t) => {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
};

const calcMins = (start, end) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
};

const minsToLabel = (mins) => {
  if (!mins) return "--";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
};

export default function AdminOvertime() {
  const today = new Date();
  const [month,        setMonth]        = useState(today.getMonth());
  const [year,         setYear]         = useState(today.getFullYear());
  const [overtimeList, setOvertimeList] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [processing,   setProcessing]   = useState(null);

  // Drawer state
  const [drawer,       setDrawer]       = useState(null); // employee group object
  // Reject modal (inside drawer)
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectRemark, setRejectRemark] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchOT = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("employeeToken");
      const res   = await fetch(`/api/admin/overtime/list?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOvertimeList(data.overtimeRequests);
      else toast.error("Failed to load overtime requests");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOT(); }, [month, year]);

  // ── Group by employee ──────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map();
    for (const ot of overtimeList) {
      const empId = ot.employee?._id || ot.employee || "unknown";
      if (!map.has(empId)) {
        map.set(empId, {
          empId,
          name: getEmpName(ot),
          dept: ot.employee?.professional?.department || ot.employee?.department || "",
          entries: [],
        });
      }
      map.get(empId).entries.push(ot);
    }
    return Array.from(map.values());
  }, [overtimeList]);

  // Filter groups by search + status
  const filteredGroups = useMemo(() => {
    return grouped
      .map(g => {
        const entries = g.entries.filter(ot => {
          const matchStatus = statusFilter === "all" || ot.status === statusFilter;
          const q = search.toLowerCase();
          const matchSearch = !q ||
            g.name.toLowerCase().includes(q) ||
            (ot.project||"").toLowerCase().includes(q);
          return matchStatus && matchSearch;
        });
        return { ...g, entries };
      })
      .filter(g => g.entries.length > 0);
  }, [grouped, search, statusFilter]);

  // Keep drawer entries in sync after approve/reject
  const drawerGroup = drawer
    ? filteredGroups.find(g => g.empId === drawer.empId) || drawer
    : null;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const pendingCnt  = overtimeList.filter(o => o.status === "Pending").length;
  const approvedCnt = overtimeList.filter(o => o.status === "Approved").length;
  const totalMins   = overtimeList
    .filter(o => o.status === "Approved")
    .reduce((s, o) => s + calcMins(o.startTime, o.endTime), 0);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      const res  = await fetch("/api/admin/overtime/approve", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Failed to approve"); return; }
      setOvertimeList(prev => prev.map(ot => ot._id === id ? { ...ot, status:"Approved" } : ot));
      toast.success("Overtime approved");
    } catch { toast.error("Something went wrong"); }
    finally { setProcessing(null); }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectRemark.trim()) { toast.error("Please enter a rejection reason"); return; }
    const id = rejectTarget._id;
    setProcessing(id);
    try {
      const res  = await fetch("/api/admin/overtime/reject", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ id, remark: rejectRemark }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Failed to reject"); return; }
      setOvertimeList(prev => prev.map(ot => ot._id === id ? { ...ot, status:"Rejected", adminRemark: rejectRemark } : ot));
      setRejectTarget(null); setRejectRemark("");
      toast.success("Overtime rejected");
    } catch { toast.error("Something went wrong"); }
    finally { setProcessing(null); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const groupStats = (entries) => ({
    total:    entries.length,
    pending:  entries.filter(e => e.status === "Pending").length,
    approved: entries.filter(e => e.status === "Approved").length,
    rejected: entries.filter(e => e.status === "Rejected").length,
    totalMins: entries.filter(e => e.status === "Approved")
                      .reduce((s, e) => s + calcMins(e.startTime, e.endTime), 0),
  });

  return (
    <section className="over-time-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* ── Topbar ── */
          .ot-topbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:24px; }
          .ot-select {
            padding:8px 14px; border-radius:10px; border:1.5px solid #E5E7EB;
            font-size:13px; font-weight:500; color:#374151; background:#fff; outline:none; cursor:pointer;
          }
          .ot-select:focus { border-color:#4F46E5; }
          .ot-search-wrap { position:relative; }
          .ot-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; font-size:13px; }
          .ot-search {
            padding:8px 14px 8px 34px; border-radius:10px; border:1.5px solid #E5E7EB;
            font-size:13px; color:#374151; outline:none; width:220px;
          }
          .ot-search:focus { border-color:#4F46E5; }
          .ot-tabs { display:flex; background:#F3F4F6; border-radius:12px; padding:3px; gap:3px; margin-left:auto; }
          .ot-tab {
            padding:6px 18px; border-radius:9px; font-size:12px; font-weight:600;
            border:none; background:transparent; color:#6B7280; cursor:pointer; transition:all .15s; white-space:nowrap;
          }
          .ot-tab.active { background:#fff; color:#111827; box-shadow:0 1px 4px rgba(0,0,0,.1); }

          /* ── Stats ── */
          .ot-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
          @media(max-width:900px){ .ot-stats{ grid-template-columns:repeat(2,1fr); } }
          .ot-stat {
            background:#fff; border:1px solid #F0F0F0; border-radius:14px;
            padding:18px 20px; display:flex; align-items:center; gap:14px;
          }
          .ot-stat-icon { width:46px; height:46px; border-radius:14px;
            display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
          .ot-stat-val   { font-size:20px; font-weight:700; color:#111827; line-height:1; margin-bottom:3px; }
          .ot-stat-label { font-size:11.5px; color:#9CA3AF; font-weight:500; }

          /* ── Employee grid ── */
          .ot-emp-grid {
            display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px;
          }

          /* ── Employee card ── */
          .ot-emp-card {
            background:#fff; border:1.5px solid #F0F0F0; border-radius:16px;
            overflow:hidden; cursor:pointer;
            transition:box-shadow .2s, border-color .2s, transform .15s;
          }
          .ot-emp-card:hover {
            box-shadow:0 6px 28px rgba(99,102,241,.13);
            border-color:#C7D2FE; transform:translateY(-2px);
          }
          .ot-emp-card-top { padding:18px 18px 14px; display:flex; align-items:center; gap:13px; }
          .ot-emp-avatar {
            width:46px; height:46px; border-radius:14px;
            display:flex; align-items:center; justify-content:center;
            font-size:16px; font-weight:800; flex-shrink:0;
          }
          .ot-emp-name { font-size:14px; font-weight:700; color:#111827; }
          .ot-emp-dept { font-size:11px; color:#9CA3AF; margin-top:2px; }
          .ot-emp-total-hrs {
            margin-left:auto; text-align:right; flex-shrink:0;
          }
          .ot-emp-hrs-val   { font-size:20px; font-weight:800; color:#4F46E5; line-height:1; }
          .ot-emp-hrs-label { font-size:10px; color:#9CA3AF; font-weight:500; }

          /* Mini status pills row */
          .ot-emp-pills {
            display:flex; gap:6px; padding:0 18px 14px; flex-wrap:wrap;
          }
          .ot-mini-pill {
            padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700;
            display:inline-flex; align-items:center; gap:4px;
          }
          .ot-mini-pill.pending  { background:#FEF9C3; color:#854D0E; }
          .ot-mini-pill.approved { background:#DCFCE7; color:#166534; }
          .ot-mini-pill.rejected { background:#FEE2E2; color:#991B1B; }

          /* Card footer bar */
          .ot-emp-card-footer {
            padding:10px 18px; background:#F9FAFB; border-top:1px solid #F3F4F6;
            display:flex; align-items:center; justify-content:space-between;
          }
          .ot-emp-card-footer span { font-size:12px; color:#6B7280; }
          .ot-emp-card-footer .arrow { color:#9CA3AF; font-size:13px; transition:transform .15s; }
          .ot-emp-card:hover .arrow { transform:translateX(3px); color:#4F46E5; }

          /* ── DRAWER ── */
          .ot-drawer-backdrop {
            position:fixed; inset:0; background:rgba(0,0,0,.35);
            z-index:1040; backdrop-filter:blur(2px);
          }
          .ot-drawer {
            position:fixed; right:0; top:0; bottom:0; z-index:1041;
            width:100%; max-width:560px;
            background:#fff; box-shadow:-8px 0 40px rgba(0,0,0,.14);
            display:flex; flex-direction:column;
            animation:drawerIn .28s cubic-bezier(0.22,1,0.36,1);
          }
          @keyframes drawerIn { from{ transform:translateX(100%); } to{ transform:translateX(0); } }

          .ot-drawer-head {
            padding:20px 24px 16px;
            border-bottom:1px solid #F0F0F0;
            flex-shrink:0;
          }
          .ot-drawer-head-top {
            display:flex; align-items:center; gap:13px; margin-bottom:14px;
          }
          .ot-drawer-avatar {
            width:48px; height:48px; border-radius:14px;
            display:flex; align-items:center; justify-content:center;
            font-size:17px; font-weight:800; flex-shrink:0;
          }
          .ot-drawer-close {
            margin-left:auto; width:32px; height:32px; border-radius:9px;
            border:none; background:#F3F4F6; color:#6B7280;
            display:flex; align-items:center; justify-content:center;
            font-size:14px; cursor:pointer; flex-shrink:0;
          }
          .ot-drawer-close:hover { background:#E5E7EB; }

          /* Summary pills inside drawer */
          .ot-drawer-summary {
            display:flex; gap:10px; flex-wrap:wrap;
          }
          .ot-drawer-sum-pill {
            padding:6px 14px; border-radius:10px; font-size:12px; font-weight:700;
            display:flex; align-items:center; gap:6px;
          }

          /* Drawer body — scrollable */
          .ot-drawer-body { flex:1; overflow-y:auto; padding:20px 24px; }

          /* Individual OT entry card */
          .ot-entry {
            border:1.5px solid #F0F0F0; border-radius:14px; overflow:hidden; margin-bottom:14px;
          }
          .ot-entry-strip { height:3px; }
          .ot-entry-strip.pending  { background:linear-gradient(90deg,#FCD34D,#F59E0B); }
          .ot-entry-strip.approved { background:linear-gradient(90deg,#4ADE80,#16A34A); }
          .ot-entry-strip.rejected { background:linear-gradient(90deg,#F87171,#DC2626); }
          .ot-entry-body { padding:14px 16px; }

          .ot-entry-head {
            display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px;
          }
          .ot-entry-date {
            font-size:13px; font-weight:700; color:#111827;
          }
          .ot-entry-day { font-size:11px; color:#9CA3AF; margin-top:1px; }

          .ot-entry-hrs {
            background:#EEF2FF; border-radius:8px;
            padding:4px 11px; font-size:15px; font-weight:800; color:#4F46E5;
          }

          .ot-entry-tags { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:10px; }
          .ot-entry-badge {
            padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600;
            display:inline-flex; align-items:center; gap:4px;
          }
          .ot-entry-status {
            padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700;
            display:inline-flex; align-items:center; gap:4px;
          }
          .ot-entry-status.pending  { background:#FEF9C3; color:#854D0E; }
          .ot-entry-status.approved { background:#DCFCE7; color:#166534; }
          .ot-entry-status.rejected { background:#FEE2E2; color:#991B1B; }

          .ot-entry-time {
            display:flex; align-items:center; gap:8px;
            background:#F9FAFB; border-radius:9px; padding:9px 12px; margin-bottom:9px;
          }
          .ot-entry-time-col { flex:1; text-align:center; }
          .ot-entry-time-lbl { font-size:9px; color:#9CA3AF; font-weight:600; text-transform:uppercase; }
          .ot-entry-time-val { font-size:13px; font-weight:700; color:#111827; margin-top:1px; }
          .ot-entry-time-arrow { color:#D1D5DB; font-size:14px; }
          .ot-entry-time-dur {
            background:#EEF2FF; color:#4F46E5; border-radius:7px;
            padding:3px 9px; font-size:11px; font-weight:700; white-space:nowrap;
          }

          .ot-entry-project {
            background:#F9FAFB; border-radius:8px; padding:7px 11px;
            font-size:12px; color:#374151; border-left:3px solid #E5E7EB;
            display:flex; align-items:center; gap:7px; margin-bottom:9px;
          }
          .ot-entry-approver { font-size:11px; color:#9CA3AF; display:flex; align-items:center; gap:5px; margin-bottom:9px; }

          .ot-entry-remark {
            background:#FFF1F2; border:1px solid #FECDD3; border-radius:8px;
            padding:8px 12px; font-size:12px; color:#9F1239;
            display:flex; align-items:flex-start; gap:6px; margin-top:6px;
          }

          .ot-entry-actions { display:flex; gap:8px; margin-top:10px; justify-content:flex-end; }
          .ot-btn {
            display:inline-flex; align-items:center; gap:5px;
            padding:6px 16px; border-radius:9px; border:none;
            font-size:12px; font-weight:600; cursor:pointer; transition:all .15s;
          }
          .ot-btn:disabled { opacity:.5; cursor:not-allowed; }
          .ot-btn-approve { background:#DCFCE7; color:#15803D; border:1px solid #BBF7D0; }
          .ot-btn-approve:hover:not(:disabled) { background:#BBF7D0; }
          .ot-btn-reject  { background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; }
          .ot-btn-reject:hover:not(:disabled)  { background:#FECACA; }

          /* ── Reject modal (inside drawer) ── */
          .ot-rmodal-backdrop {
            position:fixed; inset:0; z-index:1060; background:rgba(0,0,0,.5);
            display:flex; align-items:center; justify-content:center;
          }
          .ot-rmodal {
            background:#fff; border-radius:18px; width:100%; max-width:440px;
            margin:0 16px; box-shadow:0 16px 48px rgba(0,0,0,.2); overflow:hidden;
          }
          .ot-rmodal-head {
            display:flex; justify-content:space-between; align-items:center;
            padding:16px 22px; border-bottom:1px solid #F0F0F0;
          }
          .ot-rmodal-close {
            width:30px; height:30px; border-radius:8px; border:none;
            background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px;
            display:flex; align-items:center; justify-content:center;
          }
          .ot-textarea {
            width:100%; padding:12px 14px; border-radius:10px;
            border:1.5px solid #E5E7EB; font-size:13px; color:#374151;
            resize:none; outline:none; min-height:90px; line-height:1.5;
          }
          .ot-textarea:focus { border-color:#DC2626; }

          /* Empty / Loading */
          .ot-empty { text-align:center; padding:60px 20px; }
          .ot-empty i { font-size:52px; color:#E5E7EB; display:block; margin-bottom:14px; }
          .ot-empty p { color:#9CA3AF; font-size:14px; }
          .ot-loading { text-align:center; padding:60px; color:#9CA3AF; }

          @keyframes otPulse {
            0%,100% { opacity:1; transform:scale(1); }
            50% { opacity:.4; transform:scale(1.4); }
          }
        `}</style>
      </Head>

      <div className="main-nav">
        <SmartLeftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item">
                <Link href="/dashboard/dashboard"><img src="/icons/home.svg" alt="" /> Home</Link>
              </li>
              <li className="breadcrumb-item active">Overtime</li>
            </ul>
          </div>

          <div className="block-header add-emp-area">

            {/* ── Topbar ── */}
            <div className="ot-topbar">
              <select className="ot-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select className="ot-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              <div className="ot-search-wrap">
                <i className="bi bi-search ot-search-icon" />
                <input className="ot-search" type="text" placeholder="Search employee or project…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              <div className="ot-tabs">
                {[
                  { key:"all",      label:"All" },
                  { key:"Pending",  label:`Pending${pendingCnt > 0 ? ` · ${pendingCnt}` : ""}` },
                  { key:"Approved", label:"Approved" },
                  { key:"Rejected", label:"Rejected" },
                ].map(t => (
                  <button key={t.key}
                    className={`ot-tab ${statusFilter === t.key ? "active" : ""}`}
                    onClick={() => setStatusFilter(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="ot-stats">
              {[
                { icon:"bi-people-fill",       bg:"#EEF2FF", ic:"#4F46E5", val: grouped.length,            label:"Employees" },
                { icon:"bi-hourglass-split",    bg:"#FEF9C3", ic:"#B45309", val: pendingCnt,                label:"Pending Requests" },
                { icon:"bi-check-circle-fill",  bg:"#DCFCE7", ic:"#15803D", val: approvedCnt,              label:"Approved" },
                { icon:"bi-stopwatch-fill",     bg:"#F3E8FF", ic:"#7C3AED", val: minsToLabel(totalMins),   label:"Total Approved Hrs" },
              ].map((s, i) => (
                <div key={i} className="ot-stat">
                  <div className="ot-stat-icon" style={{ background:s.bg, color:s.ic }}>
                    <i className={`bi ${s.icon}`} />
                  </div>
                  <div>
                    <div className="ot-stat-val">{s.val}</div>
                    <div className="ot-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Section header ── */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <h5 style={{ fontWeight:700, color:"#111827", margin:0, fontSize:15 }}>
                Overtime by Employee
                <span style={{ color:"#9CA3AF", fontWeight:400, marginLeft:8, fontSize:14 }}>
                  {MONTHS[month]} {year}
                </span>
              </h5>
              <span style={{ color:"#9CA3AF", fontSize:12 }}>
                {filteredGroups.length} employee{filteredGroups.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* ── Employee Cards Grid ── */}
            {loading ? (
              <div className="ot-loading">
                <div className="spinner-border text-primary mb-3" role="status" />
                <p style={{ color:"#9CA3AF" }}>Loading overtime…</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="ot-empty">
                <i className="bi bi-clock-history" />
                <p>No overtime records for {MONTHS[month]} {year}</p>
              </div>
            ) : (
              <div className="ot-emp-grid">
                {filteredGroups.map(group => {
                  const [bg, fc] = avatarColor(group.name);
                  const st = groupStats(group.entries);
                  const approvedMins = st.totalMins;
                  return (
                    <div key={group.empId} className="ot-emp-card"
                      onClick={() => setDrawer(group)}>

                      {/* Live OT indicator */}
                      {(() => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const hasActive = group.entries.some(ot => {
                          if (ot.status !== "Approved") return false;
                          const ds = new Date(ot.date).toISOString().split("T")[0];
                          if (ds !== todayStr) return false;
                          const { start, end } = getOTWindow(ot);
                          const now = new Date();
                          return now >= start && now < end;
                        });
                        if (!hasActive) return null;
                        return (
                          <div style={{ background:"#DC2626", color:"#fff", fontSize:10, fontWeight:800,
                            padding:"4px 14px", display:"flex", alignItems:"center", gap:6,
                            letterSpacing:.5 }}>
                            <span style={{ width:6, height:6, borderRadius:"50%", background:"#fff",
                              display:"inline-block", animation:"otPulse 1s ease-in-out infinite" }} />
                            LIVE OT IN PROGRESS
                          </div>
                        );
                      })()}

                      <div className="ot-emp-card-top">
                        <div className="ot-emp-avatar" style={{ background:bg, color:fc }}>
                          {getInitials(group.name)}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div className="ot-emp-name">{group.name}</div>
                          {group.dept && <div className="ot-emp-dept">{group.dept}</div>}
                        </div>
                        <div className="ot-emp-total-hrs">
                          <div className="ot-emp-hrs-val">{minsToLabel(approvedMins) || "—"}</div>
                          <div className="ot-emp-hrs-label">Approved OT</div>
                        </div>
                      </div>

                      {/* Status pills */}
                      <div className="ot-emp-pills">
                        {st.pending  > 0 && <span className="ot-mini-pill pending">
                          <i className="bi bi-clock-fill" style={{ fontSize:9 }} />
                          {st.pending} Pending
                        </span>}
                        {st.approved > 0 && <span className="ot-mini-pill approved">
                          <i className="bi bi-check-circle-fill" style={{ fontSize:9 }} />
                          {st.approved} Approved
                        </span>}
                        {st.rejected > 0 && <span className="ot-mini-pill rejected">
                          <i className="bi bi-x-circle-fill" style={{ fontSize:9 }} />
                          {st.rejected} Rejected
                        </span>}
                      </div>

                      <div className="ot-emp-card-footer">
                        <span>{st.total} request{st.total !== 1 ? "s" : ""} this month</span>
                        <span className="arrow">View details <i className="bi bi-arrow-right" /></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </section>

        {/* ══════════════════════════════════════════
            SIDE DRAWER — Employee OT Detail
        ══════════════════════════════════════════ */}
        {drawerGroup && (
          <>
            <div className="ot-drawer-backdrop" onClick={() => setDrawer(null)} />
            <div className="ot-drawer">

              {/* Drawer header */}
              <div className="ot-drawer-head">
                <div className="ot-drawer-head-top">
                  {(() => {
                    const [bg, fc] = avatarColor(drawerGroup.name);
                    const st = groupStats(drawerGroup.entries);
                    return (
                      <>
                        <div className="ot-drawer-avatar" style={{ background:bg, color:fc }}>
                          {getInitials(drawerGroup.name)}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:800, fontSize:16, color:"#111827" }}>{drawerGroup.name}</div>
                          {drawerGroup.dept && <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{drawerGroup.dept}</div>}
                        </div>
                        <button className="ot-drawer-close" onClick={() => setDrawer(null)}>
                          <i className="bi bi-x-lg" />
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* Summary strip */}
                {(() => {
                  const st = groupStats(drawerGroup.entries);
                  return (
                    <div className="ot-drawer-summary">
                      <div className="ot-drawer-sum-pill" style={{ background:"#EEF2FF", color:"#4F46E5" }}>
                        <i className="bi bi-stopwatch-fill" />
                        {minsToLabel(st.totalMins) || "0h"} approved OT
                      </div>
                      {st.pending  > 0 && (
                        <div className="ot-drawer-sum-pill" style={{ background:"#FEF9C3", color:"#854D0E" }}>
                          <i className="bi bi-clock-fill" /> {st.pending} pending
                        </div>
                      )}
                      <div className="ot-drawer-sum-pill" style={{ background:"#F3F4F6", color:"#374151" }}>
                        {st.total} total
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Drawer body — individual entries */}
              <div className="ot-drawer-body">
                {drawerGroup.entries
                  .slice()
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(ot => {
                    const om  = otMeta(ot.otType);
                    const cls = ot.status?.toLowerCase();
                    const mins = calcMins(ot.startTime, ot.endTime);
                    return (
                      <div key={ot._id} className="ot-entry">
                        <div className={`ot-entry-strip ${cls}`} />
                        <div className="ot-entry-body">

                          {/* Date + hours */}
                          <div className="ot-entry-head">
                            <div>
                              <div className="ot-entry-date">{formatDate(ot.date)}</div>
                              <div className="ot-entry-day">{formatDay(ot.date)}</div>
                            </div>
                            <div className="ot-entry-hrs">{minsToLabel(mins)}</div>
                          </div>

                          {/* Tags */}
                          <div className="ot-entry-tags">
                            <span className="ot-entry-badge" style={{ background:om.bg, color:om.color }}>
                              <i className={`bi ${om.icon}`} style={{ fontSize:10 }} />
                              {ot.otType || "Regular"}
                            </span>
                            <span className={`ot-entry-status ${cls}`}>
                              <i className={`bi bi-${
                                ot.status==="Approved" ? "check-circle-fill" :
                                ot.status==="Rejected" ? "x-circle-fill" : "clock-fill"
                              }`} />
                              {ot.status}
                            </span>
                          </div>

                          {/* Time */}
                          <div className="ot-entry-time">
                            <div className="ot-entry-time-col">
                              <div className="ot-entry-time-lbl">Start</div>
                              <div className="ot-entry-time-val">{formatTime(ot.startTime)}</div>
                            </div>
                            <i className="bi bi-arrow-right ot-entry-time-arrow" />
                            <div className="ot-entry-time-col">
                              <div className="ot-entry-time-lbl">End</div>
                              <div className="ot-entry-time-val">{formatTime(ot.endTime)}</div>
                            </div>
                            <div className="ot-entry-time-dur">{minsToLabel(mins)}</div>
                          </div>

                          {/* Project */}
                          {ot.project && (
                            <div className="ot-entry-project">
                              <i className="bi bi-briefcase" />
                              {ot.project}
                            </div>
                          )}

                          {/* Authoriser */}
                          {ot.otApprover && (
                            <div className="ot-entry-approver">
                              <i className="bi bi-person-check" />
                              Authorized by <strong style={{ color:"#374151" }}>{ot.otApprover}</strong>
                            </div>
                          )}

                          {/* Rejection remark */}
                          {ot.status === "Rejected" && ot.adminRemark && (
                            <div className="ot-entry-remark">
                              <i className="bi bi-exclamation-circle-fill" style={{ flexShrink:0, marginTop:1 }} />
                              <span><strong>Reason:</strong> {ot.adminRemark}</span>
                            </div>
                          )}

                          {/* Live timer — approved OT on today's date */}
                          {ot.status === "Approved" && (() => {
                            const otDay = new Date(ot.date).toISOString().split("T")[0];
                            const todayStr = new Date().toISOString().split("T")[0];
                            if (otDay !== todayStr) return null;
                            return <AdminOTTimer ot={ot} />;
                          })()}

                          {/* Actions */}
                          {ot.status === "Pending" && (
                            <div className="ot-entry-actions">
                              <button className="ot-btn ot-btn-approve"
                                disabled={processing === ot._id}
                                onClick={() => handleApprove(ot._id)}>
                                {processing === ot._id
                                  ? <div className="spinner-border spinner-border-sm" role="status" />
                                  : <><i className="bi bi-check-lg" /> Approve</>}
                              </button>
                              <button className="ot-btn ot-btn-reject"
                                disabled={processing === ot._id}
                                onClick={() => { setRejectTarget(ot); setRejectRemark(""); }}>
                                <i className="bi bi-x-lg" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════
            REJECT CONFIRM MODAL
        ══════════════════════════════════════════ */}
        {rejectTarget && (
          <div className="ot-rmodal-backdrop" onClick={() => setRejectTarget(null)}>
            <div className="ot-rmodal" onClick={e => e.stopPropagation()}>
              <div className="ot-rmodal-head">
                <div style={{ fontWeight:700, color:"#DC2626", fontSize:15 }}>
                  <i className="bi bi-x-circle-fill me-2" />Reject Overtime
                </div>
                <button className="ot-rmodal-close" onClick={() => setRejectTarget(null)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <div style={{ padding:"16px 22px" }}>
                {/* Summary */}
                <div style={{ background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:12,
                  padding:"12px 16px", marginBottom:14,
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:700, color:"#111827", fontSize:13 }}>{drawerGroup?.name}</div>
                    <div style={{ color:"#6B7280", fontSize:11, marginTop:2 }}>
                      {rejectTarget.otType} · {formatDate(rejectTarget.date)}
                    </div>
                  </div>
                  <div style={{ fontWeight:800, fontSize:17, color:"#7C3AED" }}>
                    {minsToLabel(calcMins(rejectTarget.startTime, rejectTarget.endTime))}
                  </div>
                </div>
                <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:7 }}>
                  Rejection Reason <span style={{ color:"#DC2626" }}>*</span>
                </label>
                <textarea className="ot-textarea"
                  placeholder="Explain why this overtime request is rejected…"
                  value={rejectRemark}
                  onChange={e => setRejectRemark(e.target.value)}
                />
                <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4, textAlign:"right" }}>
                  {rejectRemark.length > 0 ? `${rejectRemark.length} chars` : "Required"}
                </div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", padding:"14px 22px",
                borderTop:"1px solid #F0F0F0" }}>
                <button onClick={() => { setRejectTarget(null); setRejectRemark(""); }}
                  style={{ padding:"9px 22px", borderRadius:10, border:"none",
                    background:"#F3F4F6", color:"#374151", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  Cancel
                </button>
                <button
                  disabled={!rejectRemark.trim() || processing === rejectTarget._id}
                  onClick={handleReject}
                  style={{ padding:"9px 22px", borderRadius:10, border:"none",
                    background:"#DC2626", color:"#fff", fontSize:13, fontWeight:600,
                    cursor:"pointer", display:"flex", alignItems:"center", gap:6,
                    opacity: (!rejectRemark.trim() || processing === rejectTarget._id) ? 0.55 : 1 }}>
                  {processing === rejectTarget._id
                    ? <><div className="spinner-border spinner-border-sm" role="status" /> Rejecting…</>
                    : <><i className="bi bi-x-circle" /> Reject</>}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
