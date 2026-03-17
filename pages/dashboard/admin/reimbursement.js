// pages/dashboard/admin/reimbursement.js
import { toast } from "react-toastify";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getEmpName = (item) => {
  if (item.employee?.personal?.firstName)
    return `${item.employee.personal.firstName} ${item.employee.personal.lastName || ""}`.trim();
  if (item.employee?.firstName)
    return `${item.employee.firstName} ${item.employee.lastName || ""}`.trim();
  return item.employee?.email || "—";
};

const getInitials = (name) =>
  name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],
  ["#FDF4FF","#A21CAF"],["#ECFDF5","#059669"],
];
const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const CATEGORY_META = {
  "Travel":        { icon:"bi-airplane-fill",   bg:"#DBEAFE", color:"#1D4ED8" },
  "Food":          { icon:"bi-cup-hot-fill",     bg:"#FEF3C7", color:"#B45309" },
  "Medical":       { icon:"bi-heart-pulse-fill", bg:"#FEE2E2", color:"#DC2626" },
  "Office":        { icon:"bi-building-fill",    bg:"#EEF2FF", color:"#4F46E5" },
  "Office Expense":{ icon:"bi-building-fill",    bg:"#EEF2FF", color:"#4F46E5" },
  "Internet":      { icon:"bi-wifi",             bg:"#F0FDF4", color:"#15803D" },
  "Equipment":     { icon:"bi-laptop-fill",      bg:"#F3E8FF", color:"#7C3AED" },
  "Training":      { icon:"bi-book-fill",        bg:"#FDF4FF", color:"#A21CAF" },
  "Accommodation": { icon:"bi-house-fill",       bg:"#ECFDF5", color:"#059669" },
  "Other":         { icon:"bi-receipt",          bg:"#F3F4F6", color:"#6B7280" },
};
const catMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META["Other"];

export default function AdminReimbursement() {
  const today = new Date();
  const [month,          setMonth]          = useState(today.getMonth());
  const [year,           setYear]           = useState(today.getFullYear());
  const [reimbursements, setReimbursements] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [docModal,       setDocModal]       = useState(null);
  const [rejectModal,    setRejectModal]    = useState(null);
  const [rejectRemark,   setRejectRemark]   = useState("");
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [processing,     setProcessing]     = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/reimbursement/list?month=${month}&year=${year}`);
      const data = await res.json();
      if (data.success) setReimbursements(data.data);
      else toast.error("Failed to load reimbursements");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      const res  = await fetch("/api/admin/reimbursement/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Failed to approve"); return; }
      setReimbursements((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: "Approved" } : r))
      );
      toast.success("Reimbursement approved");
    } catch { toast.error("Something went wrong"); }
    finally { setProcessing(null); }
  };

  const handleReject = async (id, remark) => {
    if (!remark?.trim()) { toast.error("Please enter a rejection reason"); return; }
    setProcessing(id);
    try {
      const res  = await fetch("/api/admin/reimbursement/reject", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, remark }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Failed to reject"); return; }
      setReimbursements((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: "Rejected", adminRemark: remark } : r))
      );
      setRejectModal(null);
      setRejectRemark("");
      toast.success("Reimbursement rejected");
    } catch { toast.error("Something went wrong"); }
    finally { setProcessing(null); }
  };

  const filtered = reimbursements.filter((r) => {
    const name = getEmpName(r).toLowerCase();
    const cat  = (r.category || "").toLowerCase();
    const q    = search.toLowerCase();
    return (name.includes(q) || cat.includes(q)) &&
      (statusFilter === "all" || r.status === statusFilter);
  });

  const totalAmt    = reimbursements.reduce((s, r) => s + (r.amount || 0), 0);
  const approvedAmt = reimbursements.filter((r) => r.status === "Approved").reduce((s, r) => s + (r.amount || 0), 0);
  const pendingAmt  = reimbursements.filter((r) => r.status === "Pending").reduce((s, r) => s + (r.amount || 0), 0);
  const pendingCnt  = reimbursements.filter((r) => r.status === "Pending").length;

  return (
    <div className="leaves-management-admin">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* ══════════════════════════════════════════
             REIMBURSEMENT — CARD LAYOUT
          ══════════════════════════════════════════ */

          /* Topbar */
          .rb-topbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:24px; }
          .rb-select {
            padding:8px 14px; border-radius:10px; border:1.5px solid #E5E7EB;
            font-size:13px; font-weight:500; color:#374151; background:#fff;
            outline:none; cursor:pointer;
          }
          .rb-select:focus { border-color:#4F46E5; }
          .rb-search-wrap { position:relative; }
          .rb-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; font-size:13px; }
          .rb-search {
            padding:8px 14px 8px 34px; border-radius:10px; border:1.5px solid #E5E7EB;
            font-size:13px; color:#374151; outline:none; width:220px;
          }
          .rb-search:focus { border-color:#4F46E5; }

          /* Status tabs */
          .rb-tabs { display:flex; background:#F3F4F6; border-radius:12px; padding:3px; gap:3px; margin-left:auto; }
          .rb-tab {
            padding:6px 18px; border-radius:9px; font-size:12px; font-weight:600;
            border:none; background:transparent; color:#6B7280; cursor:pointer;
            transition:all .15s; white-space:nowrap;
          }
          .rb-tab.active          { background:#fff; color:#111827; box-shadow:0 1px 4px rgba(0,0,0,.1); }
          .rb-tab.active.pending  { background:#FEF9C3; color:#854D0E; }
          .rb-tab.active.approved { background:#DCFCE7; color:#166534; }
          .rb-tab.active.rejected { background:#FEE2E2; color:#991B1B; }

          /* Stats */
          .rb-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
          @media(max-width:900px){ .rb-stats{grid-template-columns:repeat(2,1fr);} }
          .rb-stat {
            background:#fff; border:1px solid #F0F0F0; border-radius:14px;
            padding:18px 20px; display:flex; align-items:center; gap:14px;
          }
          .rb-stat-icon {
            width:46px; height:46px; border-radius:14px;
            display:flex; align-items:center; justify-content:center;
            font-size:18px; flex-shrink:0;
          }
          .rb-stat-val   { font-size:20px; font-weight:700; color:#111827; line-height:1; margin-bottom:3px; }
          .rb-stat-label { font-size:11.5px; color:#9CA3AF; font-weight:500; }

          /* Section header */
          .rb-section { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
          .rb-section h5 { font-weight:700; color:#111827; margin:0; font-size:15px; }

          /* Cards grid */
          .rb-grid {
            display:grid;
            grid-template-columns:repeat(auto-fill,minmax(340px,1fr));
            gap:16px;
          }

          /* Individual card */
          .rb-card {
            background:#fff; border:1px solid #F0F0F0; border-radius:16px;
            overflow:hidden; transition:box-shadow .2s, border-color .2s;
          }
          .rb-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.07); border-color:#E5E7EB; }

          /* Card top strip — colored by status */
          .rb-card-strip { height:4px; width:100%; }
          .rb-card-strip.pending  { background:linear-gradient(90deg,#FCD34D,#F59E0B); }
          .rb-card-strip.approved { background:linear-gradient(90deg,#4ADE80,#16A34A); }
          .rb-card-strip.rejected { background:linear-gradient(90deg,#F87171,#DC2626); }

          /* Card body */
          .rb-card-body { padding:18px 20px; }

          /* Card header row */
          .rb-card-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:14px; }
          .rb-card-emp  { display:flex; align-items:center; gap:10px; }
          .rb-avatar {
            width:38px; height:38px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-size:13px; font-weight:700; flex-shrink:0;
          }
          .rb-emp-name  { font-weight:700; color:#111827; font-size:13.5px; line-height:1.2; }
          .rb-emp-dept  { font-size:11px; color:#9CA3AF; margin-top:2px; }

          /* Amount pill — big and prominent */
          .rb-amount-pill {
            background:#F9FAFB; border:1.5px solid #E5E7EB;
            border-radius:10px; padding:6px 14px; text-align:right;
          }
          .rb-amount-val   { font-size:17px; font-weight:800; color:#111827; line-height:1; }
          .rb-amount-label { font-size:10px; color:#9CA3AF; font-weight:500; margin-top:1px; }

          /* Category row */
          .rb-cat-row { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
          .rb-cat-badge {
            display:inline-flex; align-items:center; gap:6px;
            padding:5px 12px; border-radius:20px;
            font-size:12px; font-weight:600;
          }

          /* Meta row — dates */
          .rb-meta { display:flex; gap:16px; margin-bottom:14px; flex-wrap:wrap; }
          .rb-meta-item { display:flex; align-items:center; gap:5px; font-size:12px; color:#6B7280; }
          .rb-meta-item i { font-size:11px; color:#9CA3AF; }

          /* Description */
          .rb-desc {
            background:#F9FAFB; border-radius:8px; padding:10px 12px;
            font-size:12.5px; color:#374151; line-height:1.5;
            margin-bottom:14px; border-left:3px solid #E5E7EB;
          }

          /* Status badge */
          .rb-status {
            display:inline-flex; align-items:center; gap:5px;
            padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700;
          }
          .rb-status.pending  { background:#FEF9C3; color:#854D0E; }
          .rb-status.approved { background:#DCFCE7; color:#166534; }
          .rb-status.rejected { background:#FEE2E2; color:#991B1B; }

          /* Rejection remark */
          .rb-remark {
            background:#FFF1F2; border:1px solid #FECDD3; border-radius:8px;
            padding:8px 12px; font-size:12px; color:#9F1239; margin-top:10px;
            display:flex; align-items:flex-start; gap:6px;
          }

          /* Card footer */
          .rb-card-footer {
            display:flex; align-items:center; justify-content:space-between;
            padding:12px 20px; border-top:1px solid #F5F5F5;
            background:#FAFAFA;
          }
          .rb-footer-actions { display:flex; gap:8px; }

          /* Buttons */
          .rb-btn {
            display:inline-flex; align-items:center; gap:5px;
            padding:6px 14px; border-radius:9px; border:none;
            font-size:12px; font-weight:600; cursor:pointer; transition:all .15s;
          }
          .rb-btn:disabled { opacity:.5; cursor:not-allowed; }
          .rb-btn-docs    { background:#F3F4F6; color:#374151; }
          .rb-btn-docs:hover { background:#E5E7EB; }
          .rb-btn-approve { background:#DCFCE7; color:#15803D; border:1px solid #BBF7D0; }
          .rb-btn-approve:hover { background:#BBF7D0; }
          .rb-btn-reject  { background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; }
          .rb-btn-reject:hover  { background:#FECACA; }

          /* Docs count badge */
          .docs-count {
            background:#4F46E5; color:#fff;
            border-radius:20px; padding:0px 6px;
            font-size:10px; font-weight:700; margin-left:2px;
          }

          /* Empty */
          .rb-empty { text-align:center; padding:60px 20px; }
          .rb-empty-icon { font-size:52px; color:#E5E7EB; display:block; margin-bottom:14px; }
          .rb-empty p    { color:#9CA3AF; font-size:14px; }

          /* Loading skeleton */
          .rb-loading { text-align:center; padding:60px; color:#9CA3AF; }

          /* ── MODALS ─────────────────────────────────── */
          .rb-backdrop {
            position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1040;
            display:flex; align-items:center; justify-content:center;
          }
          .rb-modal {
            background:#fff; border-radius:18px; width:100%; max-width:500px;
            margin:0 16px; box-shadow:0 16px 48px rgba(0,0,0,.18); overflow:hidden;
          }
          .rb-modal-header {
            display:flex; justify-content:space-between; align-items:center;
            padding:20px 24px; border-bottom:1px solid #F0F0F0;
          }
          .rb-modal-header h6 { font-weight:700; color:#111827; margin:0; font-size:15px; }
          .rb-modal-close {
            width:32px; height:32px; border-radius:8px; border:none;
            background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px;
            display:flex; align-items:center; justify-content:center;
          }
          .rb-modal-close:hover { background:#E5E7EB; color:#374151; }
          .rb-modal-body   { padding:22px 24px; }
          .rb-modal-footer { display:flex; gap:10px; justify-content:flex-end; padding:16px 24px; border-top:1px solid #F0F0F0; }

          .rb-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }
          .rb-detail-cell { background:#F9FAFB; border-radius:10px; padding:10px 14px; }
          .rb-detail-lbl  { font-size:10px; color:#9CA3AF; font-weight:700; text-transform:uppercase; letter-spacing:.4px; margin-bottom:3px; }
          .rb-detail-val  { font-size:13px; color:#111827; font-weight:600; }

          .rb-doc-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
          .rb-doc-list li a {
            display:flex; align-items:center; gap:10px;
            padding:11px 14px; border-radius:10px; border:1.5px solid #E5E7EB;
            color:#4F46E5; font-size:13px; font-weight:600; text-decoration:none;
          }
          .rb-doc-list li a:hover { background:#EEF2FF; border-color:#C7D2FE; }
          .rb-doc-list li a .arrow { margin-left:auto; font-size:11px; color:#9CA3AF; }

          .rb-textarea {
            width:100%; padding:12px 14px; border-radius:10px;
            border:1.5px solid #E5E7EB; font-size:13px; color:#374151;
            resize:none; outline:none; min-height:110px; line-height:1.5;
          }
          .rb-textarea:focus { border-color:#DC2626; }

          .rb-modal-cancel {
            padding:9px 22px; border-radius:10px; border:none;
            background:#F3F4F6; color:#374151; font-size:13px; font-weight:600; cursor:pointer;
          }
          .rb-modal-cancel:hover { background:#E5E7EB; }
          .rb-modal-reject {
            padding:9px 22px; border-radius:10px; border:none;
            background:#DC2626; color:#fff; font-size:13px; font-weight:600; cursor:pointer;
            display:flex; align-items:center; gap:6px;
          }
          .rb-modal-reject:hover:not(:disabled) { background:#B91C1C; }
          .rb-modal-reject:disabled { opacity:.55; cursor:not-allowed; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <Leftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home admin-attendance-summary">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard"><img src="/icons/home.svg" alt="" /> Home</Link>
                </li>
                <li className="breadcrumb-item active">Reimbursement</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* ── Topbar ── */}
              <div className="rb-topbar">
                <select className="rb-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="rb-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>

                <div className="rb-search-wrap">
                  <i className="bi bi-search rb-search-icon"></i>
                  <input className="rb-search" type="text" placeholder="Search employee, category…"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {/* Status tabs */}
                <div className="rb-tabs">
                  {[
                    { key:"all",      label:"All",      cls:"" },
                    { key:"Pending",  label:`Pending${pendingCnt > 0 ? ` · ${pendingCnt}` : ""}`, cls:"pending" },
                    { key:"Approved", label:"Approved", cls:"approved" },
                    { key:"Rejected", label:"Rejected", cls:"rejected" },
                  ].map((t) => (
                    <button key={t.key}
                      className={`rb-tab ${t.cls} ${statusFilter === t.key ? "active" : ""}`}
                      onClick={() => setStatusFilter(t.key)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Stats ── */}
              <div className="rb-stats">
                {[
                  { icon:"bi-receipt",           bg:"#EEF2FF", ic:"#4F46E5", val: reimbursements.length,   label:"Total Requests"  },
                  { icon:"bi-hourglass-split",    bg:"#FEF9C3", ic:"#B45309", val: pendingCnt,              label:"Awaiting Action" },
                  { icon:"bi-check-circle-fill",  bg:"#DCFCE7", ic:"#15803D", val:`₹${fmt(approvedAmt)}`,  label:"Approved"        },
                  { icon:"bi-clock-history",      bg:"#EFF6FF", ic:"#1D4ED8", val:`₹${fmt(pendingAmt)}`,   label:"Pending Amount"  },
                ].map((s, i) => (
                  <div key={i} className="rb-stat">
                    <div className="rb-stat-icon" style={{ background:s.bg, color:s.ic }}>
                      <i className={`bi ${s.icon}`}></i>
                    </div>
                    <div>
                      <div className="rb-stat-val">{s.val}</div>
                      <div className="rb-stat-label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Section title ── */}
              <div className="rb-section">
                <h5>
                  Reimbursement Requests
                  <span style={{ color:"#9CA3AF", fontWeight:400, marginLeft:8, fontSize:14 }}>
                    {MONTHS[month]} {year}
                  </span>
                </h5>
                <span style={{ color:"#9CA3AF", fontSize:12 }}>{filtered.length} requests</span>
              </div>

              {/* ── Cards ── */}
              {loading ? (
                <div className="rb-loading">
                  <div className="spinner-border text-primary mb-3" role="status"></div>
                  <p style={{ color:"#9CA3AF" }}>Loading reimbursements…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rb-empty">
                  <i className="bi bi-receipt rb-empty-icon"></i>
                  <p>No reimbursement requests for {MONTHS[month]} {year}</p>
                </div>
              ) : (
                <div className="rb-grid">
                  {filtered.map((item) => {
                    const name     = getEmpName(item);
                    const [bg, fc] = avatarColor(name);
                    const dept     = item.employee?.professional?.department || "";
                    const cm       = catMeta(item.category);
                    const statusCls = item.status?.toLowerCase();

                    return (
                      <div key={item._id} className="rb-card">
                        {/* Colored top strip */}
                        <div className={`rb-card-strip ${statusCls}`}></div>

                        <div className="rb-card-body">
                          {/* Header: employee + amount */}
                          <div className="rb-card-head">
                            <div className="rb-card-emp">
                              <div className="rb-avatar" style={{ background:bg, color:fc }}>
                                {getInitials(name)}
                              </div>
                              <div>
                                <div className="rb-emp-name">{name}</div>
                                {dept && <div className="rb-emp-dept">{dept}</div>}
                              </div>
                            </div>

                            <div className="rb-amount-pill">
                              <div className="rb-amount-val">₹{fmt(item.amount)}</div>
                              <div className="rb-amount-label">Amount</div>
                            </div>
                          </div>

                          {/* Category */}
                          <div className="rb-cat-row">
                            <span className="rb-cat-badge"
                              style={{ background:cm.bg, color:cm.color }}>
                              <i className={`bi ${cm.icon}`} style={{ fontSize:12 }}></i>
                              {item.category}
                            </span>
                            <span className={`rb-status ${statusCls}`}>
                              <i className={`bi bi-${
                                item.status === "Approved" ? "check-circle-fill" :
                                item.status === "Rejected" ? "x-circle-fill" : "clock-fill"
                              }`}></i>
                              {item.status}
                            </span>
                          </div>

                          {/* Dates */}
                          <div className="rb-meta">
                            <div className="rb-meta-item">
                              <i className="bi bi-calendar-event"></i>
                              <span>Paid: {new Date(item.paymentDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</span>
                            </div>
                            <div className="rb-meta-item">
                              <i className="bi bi-send"></i>
                              <span>Submitted: {new Date(item.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</span>
                            </div>
                            {item.attachments?.length > 0 && (
                              <div className="rb-meta-item">
                                <i className="bi bi-paperclip"></i>
                                <span>{item.attachments.length} attachment{item.attachments.length > 1 ? "s" : ""}</span>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {item.description && (
                            <div className="rb-desc">
                              {item.description}
                            </div>
                          )}

                          {/* Rejection remark */}
                          {item.status === "Rejected" && item.adminRemark && (
                            <div className="rb-remark">
                              <i className="bi bi-exclamation-circle-fill" style={{ flexShrink:0, marginTop:1 }}></i>
                              <span><strong>Reason:</strong> {item.adminRemark}</span>
                            </div>
                          )}
                        </div>

                        {/* Card footer */}
                        <div className="rb-card-footer">
                          <button className="rb-btn rb-btn-docs" onClick={() => setDocModal(item)}>
                            <i className="bi bi-paperclip"></i>
                            View Docs
                            {item.attachments?.length > 0 && (
                              <span className="docs-count">{item.attachments.length}</span>
                            )}
                          </button>

                          {item.status === "Pending" && (
                            <div className="rb-footer-actions">
                              <button className="rb-btn rb-btn-approve"
                                disabled={processing === item._id}
                                onClick={() => handleApprove(item._id)}>
                                {processing === item._id
                                  ? <div className="spinner-border spinner-border-sm" role="status"></div>
                                  : <><i className="bi bi-check-lg"></i>Approve</>}
                              </button>
                              <button className="rb-btn rb-btn-reject"
                                disabled={processing === item._id}
                                onClick={() => { setRejectModal(item); setRejectRemark(""); }}>
                                <i className="bi bi-x-lg"></i>Reject
                              </button>
                            </div>
                          )}
                        </div>
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
                  <span style={{ color:"#6B7280" }}>
                    Total: <strong style={{ color:"#111827" }}>₹{fmt(filtered.reduce((s,r) => s+(r.amount||0), 0))}</strong>
                  </span>
                  <span style={{ color:"#15803D" }}>
                    Approved: <strong>₹{fmt(filtered.filter(r=>r.status==="Approved").reduce((s,r)=>s+(r.amount||0),0))}</strong>
                  </span>
                  <span style={{ color:"#B45309" }}>
                    Pending: <strong>₹{fmt(filtered.filter(r=>r.status==="Pending").reduce((s,r)=>s+(r.amount||0),0))}</strong>
                  </span>
                </div>
              )}

            </div>
          </section>

          {/* ══════════════════════════════════════════
              DOCUMENTS MODAL
          ══════════════════════════════════════════ */}
          {docModal && (
            <div className="rb-backdrop" onClick={() => setDocModal(null)}>
              <div className="rb-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rb-modal-header">
                  <h6><i className="bi bi-receipt me-2"></i>Request Details</h6>
                  <button className="rb-modal-close" onClick={() => setDocModal(null)}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
                <div className="rb-modal-body">
                  <div className="rb-detail-grid">
                    {[
                      ["Employee",     getEmpName(docModal)],
                      ["Category",     docModal.category],
                      ["Amount",       `₹${fmt(docModal.amount)}`],
                      ["Status",       docModal.status],
                      ["Payment Date", new Date(docModal.paymentDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})],
                      ["Submitted",    new Date(docModal.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})],
                    ].map(([l,v]) => (
                      <div key={l} className="rb-detail-cell">
                        <div className="rb-detail-lbl">{l}</div>
                        <div className="rb-detail-val">{v}</div>
                      </div>
                    ))}
                  </div>
                  {docModal.description && (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontSize:11,color:"#9CA3AF",fontWeight:700,textTransform:"uppercase",marginBottom:6 }}>Description</div>
                      <div style={{ background:"#F9FAFB",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#374151" }}>
                        {docModal.description}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize:11,color:"#9CA3AF",fontWeight:700,textTransform:"uppercase",marginBottom:8 }}>
                    Attachments ({docModal.attachments?.length || 0})
                  </div>
                  {!docModal.attachments?.length ? (
                    <div style={{ textAlign:"center",padding:24,color:"#9CA3AF",fontSize:13 }}>
                      <i className="bi bi-file-earmark-x" style={{ fontSize:32,display:"block",marginBottom:8 }}></i>
                      No documents uploaded
                    </div>
                  ) : (
                    <ul className="rb-doc-list">
                      {docModal.attachments.map((doc, i) => (
                        <li key={i}>
                          <a href={doc} target="_blank" rel="noreferrer">
                            <i className="bi bi-file-earmark-text" style={{ fontSize:16 }}></i>
                            Document {i + 1}
                            <i className="bi bi-box-arrow-up-right arrow"></i>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {docModal.status === "Rejected" && docModal.adminRemark && (
                    <div className="rb-remark" style={{ marginTop:14 }}>
                      <i className="bi bi-exclamation-circle-fill" style={{ flexShrink:0 }}></i>
                      <span><strong>Rejection reason:</strong> {docModal.adminRemark}</span>
                    </div>
                  )}
                </div>
                <div className="rb-modal-footer">
                  <button className="rb-modal-cancel" onClick={() => setDocModal(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              REJECT MODAL
          ══════════════════════════════════════════ */}
          {rejectModal && (
            <div className="rb-backdrop" onClick={() => setRejectModal(null)}>
              <div className="rb-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rb-modal-header">
                  <h6 style={{ color:"#DC2626" }}><i className="bi bi-x-circle-fill me-2"></i>Reject Request</h6>
                  <button className="rb-modal-close" onClick={() => setRejectModal(null)}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
                <div className="rb-modal-body">
                  {/* Summary card */}
                  <div style={{ background:"#FFF1F2",border:"1px solid #FECDD3",borderRadius:12,padding:"14px 16px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:700,color:"#111827",fontSize:14 }}>{getEmpName(rejectModal)}</div>
                      <div style={{ color:"#6B7280",fontSize:12,marginTop:2 }}>{rejectModal.category}</div>
                    </div>
                    <div style={{ fontWeight:800,fontSize:18,color:"#DC2626" }}>₹{fmt(rejectModal.amount)}</div>
                  </div>
                  <label style={{ fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:8 }}>
                    Rejection Reason <span style={{ color:"#DC2626" }}>*</span>
                  </label>
                  <textarea className="rb-textarea"
                    placeholder="Explain clearly why this request is being rejected…"
                    value={rejectRemark}
                    onChange={(e) => setRejectRemark(e.target.value)}
                  />
                  <div style={{ fontSize:11,color:"#9CA3AF",marginTop:4,textAlign:"right" }}>
                    {rejectRemark.length > 0 ? `${rejectRemark.length} chars` : "Required"}
                  </div>
                </div>
                <div className="rb-modal-footer">
                  <button className="rb-modal-cancel" onClick={() => { setRejectModal(null); setRejectRemark(""); }}>
                    Cancel
                  </button>
                  <button className="rb-modal-reject"
                    disabled={!rejectRemark.trim() || processing === rejectModal._id}
                    onClick={() => handleReject(rejectModal._id, rejectRemark)}>
                    {processing === rejectModal._id
                      ? <><div className="spinner-border spinner-border-sm" role="status"></div> Rejecting…</>
                      : <><i className="bi bi-x-circle"></i> Reject</>}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


// import { toast } from "react-toastify";

// import Dashnav from "@/components/Dashnav";
// import Leftbar from "@/components/Leftbar";
// import LeftbarMobile from "@/components/LeftbarMobile";
// import React, { useEffect, useState } from "react";
// import Head from "next/head";
// import Link from "next/link";

// export default function reimbursement() {
//   const [docModal, setDocModal] = useState(null);
//   const [reimbursements, setReimbursements] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [rejectModal, setRejectModal] = useState(null);
//   const [rejectRemark, setRejectRemark] = useState("");

//   useEffect(() => {
//     async function fetchData() {
//       const res = await fetch("/api/admin/reimbursement/list");
//       const data = await res.json();
//       if (data.success) setReimbursements(data.data);
//       setLoading(false);
//     }
//     fetchData();
//   }, []);

//   const handleApprove = async (id) => {
//     await fetch("/api/admin/reimbursement/approve", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ id }),
//     });

//     setReimbursements((prev) =>
//       prev.map((r) => (r._id === id ? { ...r, status: "Approved" } : r))
//     );
//   };



//   const handleReject = async (id, remark) => {
//   if (!remark || remark.trim() === "") {
//     toast.error("Please enter a rejection remark");
//     return;
//   }

//   try {
//     const res = await fetch("/api/admin/reimbursement/reject", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ id, remark }),
//     });

//     const data = await res.json();

//     if (!data.success) {
//       toast.error("Failed to reject reimbursement");
//       return;
//     }

//     // ✅ Update UI status
//     setReimbursements((prev) =>
//       prev.map((r) =>
//         r._id === id ? { ...r, status: "Rejected", adminRemark: remark } : r
//       )
//     );

//     // ✅ CLOSE MODAL
//     setRejectModal(null);
//     setRejectRemark("");

//     // ✅ SHOW TOAST
//     toast.success("Reimbursement rejected successfully");

//   } catch (err) {
//     console.error(err);
//     toast.error("Something went wrong");
//   }
// };



// // ===============  Pending Counter ======================

// const pendingCount = reimbursements.filter(
//   (r) => r.status === "Pending"
// ).length


//   return (
//     <div className="leaves-management-admin">
//       <Head>
//         <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
//         <link rel="stylesheet" href="/asets/css/main.css" />
//         <link rel="stylesheet" href="/asets/css/admin.css" />
//         <link
//           rel="stylesheet"
//           href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
//         />
//       </Head>

//       <div className="add-employee-area">
//         <div className="main-nav">
//           <Leftbar />
//           <LeftbarMobile />
//           <Dashnav />

//           <section className="content home admin-attendance-summary">
//             <div className="breadcrum-bx">
//               <ul className="breadcrumb  bg-white">
//                 <li className="breadcrumb-item">
//                   <Link href="/dashboard/dashboard">
//                     <img src="/icons/attendance.svg" alt="Attendance Summary" />{" "}
//                     Reimbursement
//                   </Link>
//                 </li>
//               </ul>
//             </div>

//             <div className="block-header add-emp-area">
//                 {/* Reimbursement Requests<span className="re-alert">1</span> */}

//                 <h5 className="admin-main-heading">
//                   Reimbursement Requests
//                   {pendingCount > 0 && (
//                     <span className="re-alert">{pendingCount}</span>
//                   )}

//               </h5>

//               <div className="admin-reim-root">
//                 <table className="admin-reim-table">
//                   <thead>
//                     <tr>
//                       <th>Employee Name</th>
//                       <th>Expense Category</th>
//                       <th>Payment Date</th>
//                       <th>Amount</th>
//                       <th>Description</th>
//                       <th>Submitted</th>
//                       <th>Actions</th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {loading ? (
//                       <tr>
//                         <td colSpan="7">Loading...</td>
//                       </tr>
//                     ) : reimbursements.length === 0 ? (
//                       <tr>
//                         <td colSpan="7">No reimbursement requests</td>
//                       </tr>
//                     ) : (
//                       reimbursements.map((item) => (
//                         <tr key={item._id}>
//                           <td className="emp-name">
//                             {item.employee?.personal?.firstName
//                               ? `${item.employee.personal.firstName} ${
//                                   item.employee.personal.lastName || ""
//                                 }`
//                               : item.employee?.firstName
//                               ? `${item.employee.firstName} ${
//                                   item.employee.lastName || ""
//                                 }`
//                               : item.employee?.email || "—"}
//                           </td>

//                           <td>{item.category}</td>

//                           <td>
//                             {new Date(item.paymentDate).toLocaleDateString()}
//                           </td>

//                           <td>₹ {item.amount}</td>

//                           <td className="desc-cell">{item.description}</td>

//                           <td>
//                             {new Date(item.createdAt).toLocaleDateString()}
//                           </td>

//                           <td>
//                             <div className="admin-reim-actions">
//                               {/* View Docs */}
//                               <button
//                                 className="btn-doc"
//                                 onClick={() => setDocModal(item)}
//                               >
//                                 <i className="bi bi-download"></i>
//                                 View Documents
//                               </button>

//                               {/* Status / Actions */}
//                               {item.status === "Pending" ? (
//                                 <>
//                                   <button
//                                     className="btn-approve"
//                                     onClick={() => handleApprove(item._id)}
//                                   >
//                                     <i className="bi bi-check-circle"></i>
//                                     Approve
//                                   </button>

//                                   <button
//                                     className="btn-reject"
//                                     onClick={() => setRejectModal(item)}
//                                   >
//                                     <i className="bi bi-x-circle"></i>
//                                     Reject
//                                   </button>
//                                 </>
//                               ) : (
//                                 <span
//                                   className={`status-pill ${
//                                     item.status === "Approved"
//                                       ? "approved"
//                                       : "rejected"
//                                   }`}
//                                 >
//                                   <i className="bi bi-check-circle"></i>
//                                   {item.status}
//                                 </span>
//                               )}
//                             </div>
//                           </td>
//                         </tr>
//                       ))
//                     )}
//                   </tbody>
//                 </table>

//                 {/* Manager instructions */}
//                 <div className="admin-reim-instructions">
//                   <h6>Instructions</h6>
//                   <ul>
//                     <li>
//                       Review each reimbursement request carefully, including
//                       confirmation documents
//                     </li>
//                     <li>
//                       Approved requests move to Finance queue automatically
//                     </li>
//                     <li>
//                       Rejected requests are returned to employee with
//                       notification
//                     </li>
//                     <li>Use “View Documents” before decision</li>
//                   </ul>
//                 </div>
//               </div>
//             </div>
//           </section>

//           {docModal && (
//             <div className="leave-modal-root">
//               <div
//                 className="leave-modal-backdrop"
//                 onClick={() => setDocModal(null)}
//               />

//               <div className="leave-modal-card">
//                 <div className="leave-modal-header">
//                   <span>Uploaded Documents</span>
//                   <button
//                     className="leave-modal-close"
//                     onClick={() => setDocModal(null)}
//                   >
//                     ✕
//                   </button>
//                 </div>

//                 <div className="leave-modal-body">
//                   {docModal.attachments.length === 0 ? (
//                     <p>No documents uploaded</p>
//                   ) : (
//                     <ul>
//                       {docModal.attachments.map((doc, i) => (
//                         <li key={i}>
//                           <a href={doc} target="_blank">
//                             View Document {i + 1}
//                           </a>
//                         </li>
//                       ))}
//                     </ul>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* ======== Reject Model ================ */}

//           {rejectModal && (
//             <div className="leave-modal-root">
//               <div
//                 className="leave-modal-backdrop"
//                 onClick={() => setRejectModal(null)}
//               />

//               <div className="leave-modal-card">
//                 <div className="leave-modal-header">
//                   <span>Reject Reimbursement</span>
//                   <button
//                     className="leave-modal-close"
//                     onClick={() => setRejectModal(null)}
//                   >
//                     ✕
//                   </button>
//                 </div>

//                 <div className="leave-modal-body">
//                   <textarea
//                     className="reim-input"
//                     placeholder="Enter rejection reason"
//                     value={rejectRemark}
//                     onChange={(e) => setRejectRemark(e.target.value)}
//                   />
//                 </div>

//                 <div className="leave-modal-footer">
//                   <button
//                     className="reim-cancel-btn"
//                     onClick={() => setRejectModal(null)}
//                   >
//                     Cancel
//                   </button>

//                   <button
//                     className="reim-create-btn"
//                     onClick={() => handleReject(rejectModal._id, rejectRemark)}
//                   >
//                     Reject
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
