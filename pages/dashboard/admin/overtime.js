// pages/dashboard/admin/overtime.js
import { toast } from "react-toastify";
import React, { useEffect, useState } from "react";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Head from "next/head";
import Link from "next/link";

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
  "Weekend":   { bg:"#FEF3C7", color:"#B45309", icon:"bi-calendar-x"       },
  "Holiday":   { bg:"#DBEAFE", color:"#1D4ED8", icon:"bi-calendar-heart"   },
  "Weeknight": { bg:"#F3E8FF", color:"#7C3AED", icon:"bi-moon-stars-fill"  },
  "Regular":   { bg:"#DCFCE7", color:"#15803D", icon:"bi-clock-fill"       },
};
const otMeta = (type) => OT_TYPE_META[type] || { bg:"#F3F4F6", color:"#6B7280", icon:"bi-clock" };

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });

const formatTime = (t) => {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  const suf = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${suf}`;
};

const calcHours = (start, end) => {
  if (!start || !end) return "--";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "--";
  const h = Math.floor(mins / 60);
  const mn = mins % 60;
  return h > 0 ? `${h}h ${mn > 0 ? mn+"m" : ""}`.trim() : `${mn}m`;
};

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function AdminOvertime() {
  const today = new Date();
  const [month,       setMonth]       = useState(today.getMonth());
  const [year,        setYear]        = useState(today.getFullYear());
  const [overtimeList,setOvertimeList]= useState([]);
  const [loading,     setLoading]     = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectRemark,setRejectRemark]= useState("");
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("all");
  const [processing,  setProcessing]  = useState(null);

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
    } catch (err) {
      console.error("Failed to load admin OT", err);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOT(); }, [month, year]);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApproveOT = async (id) => {
    setProcessing(id);
    try {
      const res  = await fetch("/api/admin/overtime/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Failed to approve overtime"); return; }
      setOvertimeList((prev) =>
        prev.map((ot) => (ot._id === id ? { ...ot, status: "Approved" } : ot))
      );
      toast.success("Overtime approved");
    } catch { toast.error("Something went wrong"); }
    finally { setProcessing(null); }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleRejectOT = async (id, remark) => {
    if (!remark?.trim()) { toast.error("Please enter a rejection reason"); return; }
    setProcessing(id);
    try {
      const res  = await fetch("/api/admin/overtime/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, remark }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Failed to reject overtime"); return; }
      setOvertimeList((prev) =>
        prev.map((ot) => (ot._id === id ? { ...ot, status: "Rejected", adminRemark: remark } : ot))
      );
      setRejectModal(null);
      setRejectRemark("");
      toast.success("Overtime rejected");
    } catch { toast.error("Something went wrong"); }
    finally { setProcessing(null); }
  };

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = overtimeList.filter((ot) => {
    const name = getEmpName(ot).toLowerCase();
    const proj = (ot.project || "").toLowerCase();
    const q    = search.toLowerCase();
    return (name.includes(q) || proj.includes(q)) &&
      (statusFilter === "all" || ot.status === statusFilter);
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const pendingCnt  = overtimeList.filter((o) => o.status === "Pending").length;
  const approvedCnt = overtimeList.filter((o) => o.status === "Approved").length;
  const totalHours  = overtimeList
    .filter((o) => o.status === "Approved")
    .reduce((s, o) => {
      const [sh, sm] = (o.startTime||"0:0").split(":").map(Number);
      const [eh, em] = (o.endTime  ||"0:0").split(":").map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return s + (diff > 0 ? diff : 0);
    }, 0);
  const totalHrsLabel = totalHours > 0
    ? `${Math.floor(totalHours/60)}h ${totalHours%60 > 0 ? totalHours%60+"m" : ""}`.trim()
    : "0h";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section className="over-time-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* ══════════════════════════════════════════
             OVERTIME PAGE
          ══════════════════════════════════════════ */
          .ot-topbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:24px; }
          .ot-select {
            padding:8px 14px; border-radius:10px; border:1.5px solid #E5E7EB;
            font-size:13px; font-weight:500; color:#374151; background:#fff;
            outline:none; cursor:pointer;
          }
          .ot-select:focus { border-color:#4F46E5; }
          .ot-search-wrap { position:relative; }
          .ot-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; font-size:13px; }
          .ot-search {
            padding:8px 14px 8px 34px; border-radius:10px; border:1.5px solid #E5E7EB;
            font-size:13px; color:#374151; outline:none; width:220px;
          }
          .ot-search:focus { border-color:#4F46E5; }

          /* Status tabs */
          .ot-tabs { display:flex; background:#F3F4F6; border-radius:12px; padding:3px; gap:3px; margin-left:auto; }
          .ot-tab {
            padding:6px 18px; border-radius:9px; font-size:12px; font-weight:600;
            border:none; background:transparent; color:#6B7280; cursor:pointer;
            transition:all .15s; white-space:nowrap;
          }
          .ot-tab.active           { background:#fff; color:#111827; box-shadow:0 1px 4px rgba(0,0,0,.1); }
          .ot-tab.active.pending   { background:#FEF9C3; color:#854D0E; }
          .ot-tab.active.approved  { background:#DCFCE7; color:#166534; }
          .ot-tab.active.rejected  { background:#FEE2E2; color:#991B1B; }

          /* Stats */
          .ot-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
          @media(max-width:900px){ .ot-stats{grid-template-columns:repeat(2,1fr);} }
          .ot-stat {
            background:#fff; border:1px solid #F0F0F0; border-radius:14px;
            padding:18px 20px; display:flex; align-items:center; gap:14px;
          }
          .ot-stat-icon {
            width:46px; height:46px; border-radius:14px;
            display:flex; align-items:center; justify-content:center;
            font-size:18px; flex-shrink:0;
          }
          .ot-stat-val   { font-size:20px; font-weight:700; color:#111827; line-height:1; margin-bottom:3px; }
          .ot-stat-label { font-size:11.5px; color:#9CA3AF; font-weight:500; }

          /* Section */
          .ot-section { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
          .ot-section h5 { font-weight:700; color:#111827; margin:0; font-size:15px; }

          /* Cards grid */
          .ot-grid {
            display:grid;
            grid-template-columns:repeat(auto-fill,minmax(340px,1fr));
            gap:16px;
          }

          /* Card */
          .ot-card {
            background:#fff; border:1px solid #F0F0F0; border-radius:16px;
            overflow:hidden; transition:box-shadow .2s, border-color .2s;
          }
          .ot-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.07); border-color:#E5E7EB; }

          /* Top strip */
          .ot-strip { height:4px; }
          .ot-strip.pending  { background:linear-gradient(90deg,#FCD34D,#F59E0B); }
          .ot-strip.approved { background:linear-gradient(90deg,#4ADE80,#16A34A); }
          .ot-strip.rejected { background:linear-gradient(90deg,#F87171,#DC2626); }

          .ot-card-body { padding:18px 20px; }

          /* Card header */
          .ot-card-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:14px; }
          .ot-card-emp  { display:flex; align-items:center; gap:10px; }
          .ot-avatar {
            width:38px; height:38px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-size:13px; font-weight:700; flex-shrink:0;
          }
          .ot-emp-name { font-weight:700; color:#111827; font-size:13.5px; line-height:1.2; }
          .ot-emp-dept { font-size:11px; color:#9CA3AF; margin-top:2px; }

          /* Hours pill — big */
          .ot-hours-pill {
            background:#F9FAFB; border:1.5px solid #E5E7EB;
            border-radius:10px; padding:6px 14px; text-align:center;
          }
          .ot-hours-val   { font-size:17px; font-weight:800; color:#4F46E5; line-height:1; }
          .ot-hours-label { font-size:10px; color:#9CA3AF; font-weight:500; margin-top:1px; }

          /* Tags row */
          .ot-tags { display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
          .ot-badge {
            display:inline-flex; align-items:center; gap:5px;
            padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600;
          }
          .ot-status-badge {
            display:inline-flex; align-items:center; gap:5px;
            padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700;
          }
          .ot-status-badge.pending  { background:#FEF9C3; color:#854D0E; }
          .ot-status-badge.approved { background:#DCFCE7; color:#166534; }
          .ot-status-badge.rejected { background:#FEE2E2; color:#991B1B; }

          /* Meta */
          .ot-meta { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:12px; }
          .ot-meta-item { display:flex; align-items:center; gap:5px; font-size:12px; color:#6B7280; }
          .ot-meta-item i { font-size:11px; color:#9CA3AF; }

          /* Time block */
          .ot-time-block {
            display:flex; align-items:center; gap:8px;
            background:#F9FAFB; border-radius:10px; padding:10px 14px;
            margin-bottom:12px;
          }
          .ot-time-from, .ot-time-to {
            flex:1; text-align:center;
          }
          .ot-time-label { font-size:10px; color:#9CA3AF; font-weight:600; text-transform:uppercase; margin-bottom:2px; }
          .ot-time-val   { font-size:14px; font-weight:700; color:#111827; }
          .ot-time-arrow { color:#9CA3AF; font-size:16px; }
          .ot-time-dur   { background:#EEF2FF; color:#4F46E5; border-radius:8px; padding:4px 10px; font-size:12px; font-weight:700; white-space:nowrap; }

          /* Project */
          .ot-project {
            background:#F9FAFB; border-radius:8px; padding:8px 12px;
            font-size:12.5px; color:#374151; margin-bottom:10px;
            display:flex; align-items:center; gap:8px;
            border-left:3px solid #E5E7EB;
          }
          .ot-project i { color:#9CA3AF; font-size:13px; }

          /* Approver */
          .ot-approver { display:flex; align-items:center; gap:6px; font-size:12px; color:#6B7280; margin-bottom:10px; }

          /* Remark */
          .ot-remark {
            background:#FFF1F2; border:1px solid #FECDD3; border-radius:8px;
            padding:8px 12px; font-size:12px; color:#9F1239;
            display:flex; align-items:flex-start; gap:6px; margin-top:8px;
          }

          /* Card footer */
          .ot-card-footer {
            display:flex; align-items:center; justify-content:flex-end; gap:8px;
            padding:12px 20px; border-top:1px solid #F5F5F5; background:#FAFAFA;
          }

          /* Buttons */
          .ot-btn {
            display:inline-flex; align-items:center; gap:5px;
            padding:6px 16px; border-radius:9px; border:none;
            font-size:12px; font-weight:600; cursor:pointer; transition:all .15s;
          }
          .ot-btn:disabled { opacity:.5; cursor:not-allowed; }
          .ot-btn-approve { background:#DCFCE7; color:#15803D; border:1px solid #BBF7D0; }
          .ot-btn-approve:hover { background:#BBF7D0; }
          .ot-btn-reject  { background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; }
          .ot-btn-reject:hover  { background:#FECACA; }

          /* Empty / Loading */
          .ot-empty { text-align:center; padding:60px 20px; }
          .ot-empty i { font-size:52px; color:#E5E7EB; display:block; margin-bottom:14px; }
          .ot-empty p { color:#9CA3AF; font-size:14px; }
          .ot-loading { text-align:center; padding:60px; color:#9CA3AF; }

          /* ── MODAL ───────────────────────────────── */
          .ot-backdrop {
            position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1040;
            display:flex; align-items:center; justify-content:center;
          }
          .ot-modal {
            background:#fff; border-radius:18px; width:100%; max-width:460px;
            margin:0 16px; box-shadow:0 16px 48px rgba(0,0,0,.18); overflow:hidden;
          }
          .ot-modal-header {
            display:flex; justify-content:space-between; align-items:center;
            padding:18px 24px; border-bottom:1px solid #F0F0F0;
          }
          .ot-modal-header h6 { font-weight:700; color:#DC2626; margin:0; font-size:15px; }
          .ot-modal-close {
            width:30px; height:30px; border-radius:8px; border:none;
            background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px;
            display:flex; align-items:center; justify-content:center;
          }
          .ot-modal-body { padding:20px 24px; }
          .ot-modal-footer { display:flex; gap:10px; justify-content:flex-end; padding:16px 24px; border-top:1px solid #F0F0F0; }

          .ot-reject-summary {
            background:#FFF1F2; border:1px solid #FECDD3; border-radius:12px;
            padding:14px 16px; margin-bottom:16px;
            display:flex; justify-content:space-between; align-items:center;
          }
          .ot-textarea {
            width:100%; padding:12px 14px; border-radius:10px;
            border:1.5px solid #E5E7EB; font-size:13px; color:#374151;
            resize:none; outline:none; min-height:100px; line-height:1.5;
          }
          .ot-textarea:focus { border-color:#DC2626; }
          .ot-modal-cancel {
            padding:9px 22px; border-radius:10px; border:none;
            background:#F3F4F6; color:#374151; font-size:13px; font-weight:600; cursor:pointer;
          }
          .ot-modal-cancel:hover { background:#E5E7EB; }
          .ot-modal-reject {
            padding:9px 22px; border-radius:10px; border:none;
            background:#DC2626; color:#fff; font-size:13px; font-weight:600; cursor:pointer;
            display:flex; align-items:center; gap:6px;
          }
          .ot-modal-reject:hover:not(:disabled) { background:#B91C1C; }
          .ot-modal-reject:disabled { opacity:.55; cursor:not-allowed; }
        `}</style>
      </Head>

      <div className="main-nav">
        <Leftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          {/* Breadcrumb */}
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item">
                <Link href="/dashboard/dashboard"><img src="/icons/home.svg" alt="" /> Home</Link>
              </li>
              <li className="breadcrumb-item active">Overtime Requests</li>
            </ul>
          </div>

          <div className="block-header add-emp-area">

            {/* ── Topbar ── */}
            <div className="ot-topbar">
              <select className="ot-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select className="ot-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>

              <div className="ot-search-wrap">
                <i className="bi bi-search ot-search-icon"></i>
                <input className="ot-search" type="text" placeholder="Search employee, project…"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              <div className="ot-tabs">
                {[
                  { key:"all",      label:"All",      cls:"" },
                  { key:"Pending",  label:`Pending${pendingCnt > 0 ? ` · ${pendingCnt}` : ""}`, cls:"pending" },
                  { key:"Approved", label:"Approved", cls:"approved" },
                  { key:"Rejected", label:"Rejected", cls:"rejected" },
                ].map((t) => (
                  <button key={t.key}
                    className={`ot-tab ${t.cls} ${statusFilter === t.key ? "active" : ""}`}
                    onClick={() => setStatusFilter(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="ot-stats">
              {[
                { icon:"bi-clock-history",     bg:"#EEF2FF", ic:"#4F46E5", val: overtimeList.length, label:"Total Requests"   },
                { icon:"bi-hourglass-split",   bg:"#FEF9C3", ic:"#B45309", val: pendingCnt,           label:"Awaiting Action"  },
                { icon:"bi-check-circle-fill", bg:"#DCFCE7", ic:"#15803D", val: approvedCnt,          label:"Approved"         },
                { icon:"bi-stopwatch-fill",    bg:"#F3E8FF", ic:"#7C3AED", val: totalHrsLabel,        label:"Total Approved Hrs"},
              ].map((s, i) => (
                <div key={i} className="ot-stat">
                  <div className="ot-stat-icon" style={{ background:s.bg, color:s.ic }}>
                    <i className={`bi ${s.icon}`}></i>
                  </div>
                  <div>
                    <div className="ot-stat-val">{s.val}</div>
                    <div className="ot-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Section ── */}
            <div className="ot-section">
              <h5>
                Overtime Requests
                <span style={{ color:"#9CA3AF", fontWeight:400, marginLeft:8, fontSize:14 }}>
                  {MONTHS[month]} {year}
                </span>
              </h5>
              <span style={{ color:"#9CA3AF", fontSize:12 }}>{filtered.length} requests</span>
            </div>

            {/* ── Cards ── */}
            {loading ? (
              <div className="ot-loading">
                <div className="spinner-border text-primary mb-3" role="status"></div>
                <p style={{ color:"#9CA3AF" }}>Loading overtime requests…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="ot-empty">
                <i className="bi bi-clock-history"></i>
                <p>No overtime requests for {MONTHS[month]} {year}</p>
              </div>
            ) : (
              <div className="ot-grid">
                {filtered.map((ot) => {
                  const name      = getEmpName(ot);
                  const [bg, fc]  = avatarColor(name);
                  const dept      = ot.employee?.professional?.department || "";
                  const om        = otMeta(ot.otType);
                  const statusCls = ot.status?.toLowerCase();
                  const hrs       = calcHours(ot.startTime, ot.endTime);

                  return (
                    <div key={ot._id} className="ot-card">
                      {/* Top strip */}
                      <div className={`ot-strip ${statusCls}`}></div>

                      <div className="ot-card-body">
                        {/* Header: employee + hours */}
                        <div className="ot-card-head">
                          <div className="ot-card-emp">
                            <div className="ot-avatar" style={{ background:bg, color:fc }}>
                              {getInitials(name)}
                            </div>
                            <div>
                              <div className="ot-emp-name">{name}</div>
                              {dept && <div className="ot-emp-dept">{dept}</div>}
                            </div>
                          </div>
                          <div className="ot-hours-pill">
                            <div className="ot-hours-val">{hrs}</div>
                            <div className="ot-hours-label">OT Hours</div>
                          </div>
                        </div>

                        {/* Tags: OT type + status */}
                        <div className="ot-tags">
                          <span className="ot-badge" style={{ background:om.bg, color:om.color }}>
                            <i className={`bi ${om.icon}`} style={{ fontSize:11 }}></i>
                            {ot.otType || "Regular"}
                          </span>
                          <span className={`ot-status-badge ${statusCls}`}>
                            <i className={`bi bi-${
                              ot.status === "Approved" ? "check-circle-fill" :
                              ot.status === "Rejected" ? "x-circle-fill" : "clock-fill"
                            }`}></i>
                            {ot.status}
                          </span>
                        </div>

                        {/* Date meta */}
                        <div className="ot-meta">
                          <div className="ot-meta-item">
                            <i className="bi bi-calendar-event"></i>
                            <span>{formatDate(ot.date)}</span>
                          </div>
                          {ot.otApprover && (
                            <div className="ot-meta-item">
                              <i className="bi bi-person-check"></i>
                              <span>Authorized by: <strong style={{ color:"#374151" }}>{ot.otApprover}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Time block */}
                        <div className="ot-time-block">
                          <div className="ot-time-from">
                            <div className="ot-time-label">Start</div>
                            <div className="ot-time-val">{formatTime(ot.startTime)}</div>
                          </div>
                          <i className="bi bi-arrow-right ot-time-arrow"></i>
                          <div className="ot-time-to">
                            <div className="ot-time-label">End</div>
                            <div className="ot-time-val">{formatTime(ot.endTime)}</div>
                          </div>
                          <div className="ot-time-dur">{hrs}</div>
                        </div>

                        {/* Project */}
                        {ot.project && (
                          <div className="ot-project">
                            <i className="bi bi-briefcase"></i>
                            <span>{ot.project}</span>
                          </div>
                        )}

                        {/* Rejection remark */}
                        {ot.status === "Rejected" && ot.adminRemark && (
                          <div className="ot-remark">
                            <i className="bi bi-exclamation-circle-fill" style={{ flexShrink:0, marginTop:1 }}></i>
                            <span><strong>Reason:</strong> {ot.adminRemark}</span>
                          </div>
                        )}
                      </div>

                      {/* Card footer — actions */}
                      {ot.status === "Pending" && (
                        <div className="ot-card-footer">
                          <button className="ot-btn ot-btn-approve"
                            disabled={processing === ot._id}
                            onClick={() => handleApproveOT(ot._id)}>
                            {processing === ot._id
                              ? <div className="spinner-border spinner-border-sm" role="status"></div>
                              : <><i className="bi bi-check-lg"></i>Approve</>}
                          </button>
                          <button className="ot-btn ot-btn-reject"
                            disabled={processing === ot._id}
                            onClick={() => { setRejectModal(ot); setRejectRemark(""); }}>
                            <i className="bi bi-x-lg"></i>Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary footer */}
            {!loading && filtered.length > 0 && (
              <div style={{
                marginTop:20, padding:"12px 20px", background:"#F9FAFB",
                borderRadius:10, border:"1px solid #F0F0F0",
                display:"flex", gap:24, flexWrap:"wrap", fontSize:13,
              }}>
                <span style={{ color:"#6B7280" }}>
                  <strong style={{ color:"#111827" }}>{filtered.length}</strong> requests shown
                </span>
                <span style={{ color:"#15803D" }}>
                  Approved: <strong>{filtered.filter(o=>o.status==="Approved").length}</strong>
                </span>
                <span style={{ color:"#B45309" }}>
                  Pending: <strong>{filtered.filter(o=>o.status==="Pending").length}</strong>
                </span>
                <span style={{ color:"#7C3AED" }}>
                  Total Approved Hours: <strong>{totalHrsLabel}</strong>
                </span>
              </div>
            )}

          </div>
        </section>

        {/* ══════════════════════════════════════════
            REJECT MODAL
        ══════════════════════════════════════════ */}
        {rejectModal && (
          <div className="ot-backdrop" onClick={() => setRejectModal(null)}>
            <div className="ot-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ot-modal-header">
                <h6><i className="bi bi-x-circle-fill me-2"></i>Reject Overtime</h6>
                <button className="ot-modal-close" onClick={() => setRejectModal(null)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="ot-modal-body">
                <div className="ot-reject-summary">
                  <div>
                    <div style={{ fontWeight:700, color:"#111827", fontSize:14 }}>{getEmpName(rejectModal)}</div>
                    <div style={{ color:"#6B7280", fontSize:12, marginTop:2 }}>
                      {rejectModal.otType} · {formatDate(rejectModal.date)}
                    </div>
                  </div>
                  <div style={{ fontWeight:800, fontSize:18, color:"#7C3AED" }}>
                    {calcHours(rejectModal.startTime, rejectModal.endTime)}
                  </div>
                </div>
                <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:8 }}>
                  Rejection Reason <span style={{ color:"#DC2626" }}>*</span>
                </label>
                <textarea className="ot-textarea"
                  placeholder="Explain why this overtime request is being rejected…"
                  value={rejectRemark}
                  onChange={(e) => setRejectRemark(e.target.value)}
                />
                <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4, textAlign:"right" }}>
                  {rejectRemark.length > 0 ? `${rejectRemark.length} chars` : "Required"}
                </div>
              </div>
              <div className="ot-modal-footer">
                <button className="ot-modal-cancel" onClick={() => { setRejectModal(null); setRejectRemark(""); }}>
                  Cancel
                </button>
                <button className="ot-modal-reject"
                  disabled={!rejectRemark.trim() || processing === rejectModal._id}
                  onClick={() => handleRejectOT(rejectModal._id, rejectRemark)}>
                  {processing === rejectModal._id
                    ? <><div className="spinner-border spinner-border-sm" role="status"></div> Rejecting…</>
                    : <><i className="bi bi-x-circle"></i> Reject</>}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}


// import { toast } from "react-toastify";

// import React, { useEffect, useState } from "react";
// import Dashnav from "@/components/Dashnav";
// import Leftbar from "@/components/Leftbar";
// import Head from "next/head";
// import Link from "next/link";

// export default function AdminOvertime() {
//   const [loading, setLoading] = useState(true);
//   const [overtimeList, setOvertimeList] = useState([]);

//   const [rejectModal, setRejectModal] = useState(null);
//   const [rejectRemark, setRejectRemark] = useState("");

//   useEffect(() => {
//     async function fetchAdminOT() {
//       try {
//         const token = localStorage.getItem("employeeToken");

//         const res = await fetch("/api/admin/overtime/list", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         const data = await res.json();
//         if (data.success) {
//           setOvertimeList(data.overtimeRequests);
//         }
//       } catch (err) {
//         console.error("Failed to load admin OT", err);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchAdminOT();
//   }, []);

//   //  this is reject ot

//   const handleRejectOT = async (id, remark) => {
//     if (!remark || remark.trim() === "") {
//       toast.error("Please enter a rejection remark");
//       return;
//     }

//     try {
//       const res = await fetch("/api/admin/overtime/reject", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id, remark }),
//       });

//       const data = await res.json();
//       if (!data.success) {
//         toast.error("Failed to reject overtime");
//         return;
//       }

//       // ✅ Update UI
//       setOvertimeList((prev) =>
//         prev.map((ot) =>
//           ot._id === id
//             ? { ...ot, status: "Rejected", adminRemark: remark }
//             : ot,
//         ),
//       );

//       setRejectModal(null);
//       setRejectRemark("");
//       toast.success("Overtime rejected successfully");
//     } catch (err) {
//       console.error(err);
//       toast.error("Something went wrong");
//     }
//   };

//   //  this is approve  ot

//   const handleApproveOT = async (id) => {
//     try {
//       const res = await fetch("/api/admin/overtime/approve", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id }),
//       });

//       const data = await res.json();
//       if (!data.success) {
//         toast.error("Failed to approve overtime");
//         return;
//       }

//       // ✅ Update UI instantly
//       setOvertimeList((prev) =>
//         prev.map((ot) => (ot._id === id ? { ...ot, status: "Approved" } : ot)),
//       );

//       toast.success("Overtime approved successfully");
//     } catch (err) {
//       console.error(err);
//       toast.error("Something went wrong");
//     }
//   };

//   const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("en-GB");

//   const formatTime = (time) => {
//     const [h, m] = time.split(":");
//     const hour = Number(h);
//     const suffix = hour >= 12 ? "PM" : "AM";
//     return `${hour % 12 || 12}:${m} ${suffix}`;
//   };

//   const calculateHours = (start, end) => {
//     const [sh, sm] = start.split(":").map(Number);
//     const [eh, em] = end.split(":").map(Number);
//     return `${(eh * 60 + em - (sh * 60 + sm)) / 60}h`;
//   };

//   return (
//     <section className="over-time-area">
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
//         <Dashnav />

//         <section className="content home">
//           {/* Breadcrumb */}
//           <div className="breadcrum-bx">
//             <ul className="breadcrumb bg-white">
//               <li className="breadcrumb-item">
//                 <Link href="/dashboard/dashboard">
//                   <img src="/icons/home.svg" /> Dashboard
//                 </Link>
//               </li>
//               <li className="breadcrumb-item active">Overtime Requests</li>
//             </ul>
//           </div>

//           {/* Page Header */}
//           <div className="block-header add-emp-area">
//             <div className="reim-page-head">
//               <h2>Overtime Requests</h2>
//               <p>Review and manage employee overtime requests</p>
//             </div>

//             {/* Table */}
//             <div className="reim-section">
//               <div className="reim-section-head">
//                 <div>
//                   <h4>All Overtime Requests</h4>
//                   <p>Pending, approved, and rejected overtime entries</p>
//                 </div>
//               </div>
//              <div className="table-scroll-x">
//               <table className="reim-table">
//                 <thead>
//                   <tr>
//                     <th>Employee</th>
//                     <th>Date</th>
//                     <th>Project</th>
//                     <th>OT Type</th>
//                     <th>Time</th>
//                      <th>OT Access Given By</th> {/* ✅ NEW */}
//                     <th>Status</th>
//                     <th>Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {loading ? (
//                     <tr>
//                       <td colSpan="8" style={{ textAlign: "center" }}>
//                         Loading overtime requests...
//                       </td>
//                     </tr>
//                   ) : overtimeList.length === 0 ? (
//                     <tr>
//                       <td colSpan="8" style={{ textAlign: "center" }}>
//                         No overtime requests found
//                       </td>
//                     </tr>
//                   ) : (
//                     overtimeList.map((ot) => (
//                       <tr key={ot._id}>
//                         {/* Employee */}
//                         <td>
//                           {ot.employee?.personal?.firstName}{" "}
//                           {ot.employee?.personal?.lastName}
//                         </td>

//                         {/* Date */}
//                         <td>{formatDate(ot.date)}</td>

//                         {/* Project */}
//                         <td>{ot.project}</td>

//                         {/* OT Type */}
//                         <td>
//                           <span className="tag blue">{ot.otType}</span>
//                         </td>

//                         {/* Time */}
//                         <td>
//                           {formatTime(ot.startTime)} – {formatTime(ot.endTime)}
//                           <br />
//                           <small className="text-muted">
//                             {calculateHours(ot.startTime, ot.endTime)}
//                           </small>
//                         </td>

//                         <td>
//   <span className="tag blue">
//     {ot.otApprover || "-"}
//   </span>
// </td>

//                         {/* Status */}
//                         <td>
//                           <span
//                             className={`tag ${
//                               ot.status === "Approved"
//                                 ? "green"
//                                 : ot.status === "Rejected"
//                                   ? "red"
//                                   : "blue"
//                             }`}
//                           >
//                             {ot.status}
//                           </span>
//                         </td>

//                         {/* Actions (UI only for now) */}
//                         <td>
//                           <div className="admin-reim-actions">
//                             {ot.status === "Pending" ? (
//                               <>
//                                 <button
//                                   className="btn-approve"
//                                   onClick={() => handleApproveOT(ot._id)}
//                                 >
//                                   <i className="bi bi-check-circle"></i>
//                                   Approve
//                                 </button>

//                                 <button
//                                   className="btn-reject"
//                                   onClick={() => setRejectModal(ot)}
//                                 >
//                                   <i className="bi bi-x-circle"></i>
//                                   Reject
//                                 </button>
//                               </>
//                             ) : (
//                               <span
//                                 className={`status-pill ${
//                                   ot.status === "Approved"
//                                     ? "approved"
//                                     : "rejected"
//                                 }`}
//                               >
//                                 <i className="bi bi-check-circle"></i>
//                                 {ot.status}
//                               </span>
//                             )}
//                           </div>
//                         </td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>

//               </div>
//             </div>
//           </div>
//         </section>

//         {rejectModal && (
//           <div className="leave-modal-root">
//             <div
//               className="leave-modal-backdrop"
//               onClick={() => setRejectModal(null)}
//             />

//             <div className="leave-modal-card">
//               <div className="leave-modal-header">
//                 <span>Reject Overtime Request</span>
//                 <button
//                   className="leave-modal-close"
//                   onClick={() => setRejectModal(null)}
//                 >
//                   ✕
//                 </button>
//               </div>

//               <div className="leave-modal-body">
//                 <textarea
//                   className="reim-input"
//                   placeholder="Enter rejection reason"
//                   value={rejectRemark}
//                   onChange={(e) => setRejectRemark(e.target.value)}
//                 />
//               </div>

//               <div className="leave-modal-footer">
//                 <button
//                   className="reim-cancel-btn"
//                   onClick={() => setRejectModal(null)}
//                 >
//                   Cancel
//                 </button>

//                 <button
//                   className="reim-create-btn"
//                   onClick={() => handleRejectOT(rejectModal._id, rejectRemark)}
//                 >
//                   Reject
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </section>
//   );
// }
