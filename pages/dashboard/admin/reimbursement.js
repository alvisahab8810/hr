// pages/dashboard/admin/reimbursement.js
import { toast } from "react-toastify";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getEmpAvatar = (item) => item.employee?.personal?.avatar || null;

const getEmpName = (item) => {
  if (item.employee?.personal?.firstName)
    return `${item.employee.personal.firstName} ${item.employee.personal.lastName || ""}`.trim();
  if (item.employee?.firstName)
    return `${item.employee.firstName} ${item.employee.lastName || ""}`.trim();
  return item.employee?.email || "—";
};

const getDept = (item) =>
  item.employee?.professional?.department || item.employee?.department || "";

const getInitials = (name) =>
  name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0,2).toUpperCase();

const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],
  ["#FDF4FF","#A21CAF"],["#ECFDF5","#059669"],
];
const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const CATEGORY_META = {
  "Travel":         { icon:"bi-airplane-fill",   bg:"#DBEAFE", color:"#1D4ED8" },
  "Food":           { icon:"bi-cup-hot-fill",     bg:"#FEF3C7", color:"#B45309" },
  "Medical":        { icon:"bi-heart-pulse-fill", bg:"#FEE2E2", color:"#DC2626" },
  "Office":         { icon:"bi-building-fill",    bg:"#EEF2FF", color:"#4F46E5" },
  "Office Expense": { icon:"bi-building-fill",    bg:"#EEF2FF", color:"#4F46E5" },
  "Internet":       { icon:"bi-wifi",             bg:"#F0FDF4", color:"#15803D" },
  "Equipment":      { icon:"bi-laptop-fill",      bg:"#F3E8FF", color:"#7C3AED" },
  "Training":       { icon:"bi-book-fill",        bg:"#FDF4FF", color:"#A21CAF" },
  "Accommodation":  { icon:"bi-house-fill",       bg:"#ECFDF5", color:"#059669" },
  "Other":          { icon:"bi-receipt",          bg:"#F3F4F6", color:"#6B7280" },
};
const catMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META["Other"];

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
const fmtDateShort = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short" });

export default function AdminReimbursement() {
  const today = new Date();
  const [month,          setMonth]          = useState(today.getMonth());
  const [year,           setYear]           = useState(today.getFullYear());
  const [reimbursements, setReimbursements] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [processing,     setProcessing]     = useState(null);

  // Drawer state
  const [drawer,       setDrawer]       = useState(null); // employee group
  // Modals (inside drawer)
  const [docModal,     setDocModal]     = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectRemark, setRejectRemark] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────
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

  // ── Group by employee ──────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of reimbursements) {
      const empId = item.employee?._id || item.employee || "unknown";
      if (!map.has(empId)) {
        map.set(empId, {
          empId,
          name:   getEmpName(item),
          dept:   getDept(item),
          avatar: getEmpAvatar(item),
          entries: [],
        });
      }
      map.get(empId).entries.push(item);
    }
    return Array.from(map.values());
  }, [reimbursements]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return grouped
      .map(g => {
        const entries = g.entries.filter(item => {
          const matchStatus = statusFilter === "all" || item.status === statusFilter;
          const q = search.toLowerCase();
          const matchSearch = !q ||
            g.name.toLowerCase().includes(q) ||
            (item.category||"").toLowerCase().includes(q);
          return matchStatus && matchSearch;
        });
        return { ...g, entries };
      })
      .filter(g => g.entries.length > 0);
  }, [grouped, search, statusFilter]);

  // Keep drawer in sync after actions
  const drawerGroup = drawer
    ? filteredGroups.find(g => g.empId === drawer.empId) || drawer
    : null;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalAmt    = reimbursements.reduce((s,r) => s+(r.amount||0), 0);
  const approvedAmt = reimbursements.filter(r=>r.status==="Approved").reduce((s,r)=>s+(r.amount||0),0);
  const pendingAmt  = reimbursements.filter(r=>r.status==="Pending").reduce((s,r)=>s+(r.amount||0),0);
  const pendingCnt  = reimbursements.filter(r=>r.status==="Pending").length;

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      const res  = await fetch("/api/admin/reimbursement/approve", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Failed to approve"); return; }
      setReimbursements(prev => prev.map(r => r._id===id ? {...r, status:"Approved"} : r));
      toast.success("Reimbursement approved");
    } catch { toast.error("Something went wrong"); }
    finally { setProcessing(null); }
  };

  const handleReject = async () => {
    if (!rejectRemark.trim()) { toast.error("Please enter a rejection reason"); return; }
    const id = rejectTarget._id;
    setProcessing(id);
    try {
      const res  = await fetch("/api/admin/reimbursement/reject", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ id, remark: rejectRemark }),
      });
      const data = await res.json();
      if (!data.success) { toast.error("Failed to reject"); return; }
      setReimbursements(prev => prev.map(r => r._id===id ? {...r, status:"Rejected", adminRemark:rejectRemark} : r));
      setRejectTarget(null); setRejectRemark("");
      toast.success("Reimbursement rejected");
    } catch { toast.error("Something went wrong"); }
    finally { setProcessing(null); }
  };

  // ── Group helpers ──────────────────────────────────────────────────────────
  const groupStats = (entries) => ({
    total:       entries.length,
    pending:     entries.filter(e=>e.status==="Pending").length,
    approved:    entries.filter(e=>e.status==="Approved").length,
    rejected:    entries.filter(e=>e.status==="Rejected").length,
    totalAmt:    entries.reduce((s,e)=>s+(e.amount||0),0),
    approvedAmt: entries.filter(e=>e.status==="Approved").reduce((s,e)=>s+(e.amount||0),0),
    pendingAmt:  entries.filter(e=>e.status==="Pending").reduce((s,e)=>s+(e.amount||0),0),
  });

  return (
    <div className="leaves-management-admin">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* ── Topbar ── */
          .rb-topbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:24px; }
          .rb-select {
            padding:8px 14px; border-radius:10px; border:1.5px solid #E5E7EB;
            font-size:13px; font-weight:500; color:#374151; background:#fff; outline:none; cursor:pointer;
          }
          .rb-select:focus { border-color:#4F46E5; }
          .rb-search-wrap { position:relative; }
          .rb-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#9CA3AF; font-size:13px; }
          .rb-search {
            padding:8px 14px 8px 34px; border-radius:10px; border:1.5px solid #E5E7EB;
            font-size:13px; color:#374151; outline:none; width:220px;
          }
          .rb-search:focus { border-color:#4F46E5; }
          .rb-tabs { display:flex; background:#F3F4F6; border-radius:12px; padding:3px; gap:3px; margin-left:auto; }
          .rb-tab {
            padding:6px 18px; border-radius:9px; font-size:12px; font-weight:600;
            border:none; background:transparent; color:#6B7280; cursor:pointer; transition:all .15s; white-space:nowrap;
          }
          .rb-tab.active { background:#fff; color:#111827; box-shadow:0 1px 4px rgba(0,0,0,.1); }

          /* ── Stats ── */
          .rb-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
          @media(max-width:900px){ .rb-stats{ grid-template-columns:repeat(2,1fr); } }
          .rb-stat {
            background:#fff; border:1px solid #F0F0F0; border-radius:14px;
            padding:18px 20px; display:flex; align-items:center; gap:14px;
          }
          .rb-stat-icon { width:46px; height:46px; border-radius:14px;
            display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
          .rb-stat-val   { font-size:20px; font-weight:700; color:#111827; line-height:1; margin-bottom:3px; }
          .rb-stat-label { font-size:11.5px; color:#9CA3AF; font-weight:500; }

          /* ── Employee card grid ── */
          .rb-emp-grid {
            display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px;
          }

          /* ── Employee card ── */
          .rb-emp-card {
            background:#fff; border:1.5px solid #F0F0F0; border-radius:16px;
            overflow:hidden; cursor:pointer;
            transition:box-shadow .2s, border-color .2s, transform .15s;
          }
          .rb-emp-card:hover {
            box-shadow:0 6px 28px rgba(99,102,241,.13);
            border-color:#C7D2FE; transform:translateY(-2px);
          }
          .rb-emp-card-top { padding:18px 18px 14px; display:flex; align-items:center; gap:13px; }
          .rb-emp-avatar {
            width:46px; height:46px; border-radius:14px;
            display:flex; align-items:center; justify-content:center;
            font-size:16px; font-weight:800; flex-shrink:0;
          }
          .rb-emp-name { font-size:14px; font-weight:700; color:#111827; }
          .rb-emp-dept { font-size:11px; color:#9CA3AF; margin-top:2px; }
          .rb-emp-amt  { margin-left:auto; text-align:right; flex-shrink:0; }
          .rb-emp-amt-val   { font-size:20px; font-weight:800; color:#111827; line-height:1; }
          .rb-emp-amt-label { font-size:10px; color:#9CA3AF; font-weight:500; margin-top:1px; }

          /* Mini status pills */
          .rb-emp-pills { display:flex; gap:6px; padding:0 18px 14px; flex-wrap:wrap; }
          .rb-mini-pill {
            padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700;
            display:inline-flex; align-items:center; gap:4px;
          }
          .rb-mini-pill.pending  { background:#FEF9C3; color:#854D0E; }
          .rb-mini-pill.approved { background:#DCFCE7; color:#166534; }
          .rb-mini-pill.rejected { background:#FEE2E2; color:#991B1B; }

          /* Card footer */
          .rb-emp-card-footer {
            padding:10px 18px; background:#F9FAFB; border-top:1px solid #F3F4F6;
            display:flex; align-items:center; justify-content:space-between;
          }
          .rb-emp-card-footer span { font-size:12px; color:#6B7280; }
          .rb-emp-card-footer .arrow { color:#9CA3AF; font-size:13px; transition:transform .15s; }
          .rb-emp-card:hover .arrow { transform:translateX(3px); color:#4F46E5; }

          /* ── DRAWER ── */
          .rb-drawer-backdrop {
            position:fixed; inset:0; background:rgba(0,0,0,.35);
            z-index:1040; backdrop-filter:blur(2px);
          }
          .rb-drawer {
            position:fixed; right:0; top:0; bottom:0; z-index:1041;
            width:100%; max-width:580px;
            background:#fff; box-shadow:-8px 0 40px rgba(0,0,0,.14);
            display:flex; flex-direction:column;
            animation:rbDrawerIn .28s cubic-bezier(0.22,1,0.36,1);
          }
          @keyframes rbDrawerIn { from{ transform:translateX(100%); } to{ transform:translateX(0); } }

          .rb-drawer-head {
            padding:20px 24px 16px; border-bottom:1px solid #F0F0F0; flex-shrink:0;
          }
          .rb-drawer-head-top {
            display:flex; align-items:center; gap:13px; margin-bottom:14px;
          }
          .rb-drawer-avatar {
            width:48px; height:48px; border-radius:14px;
            display:flex; align-items:center; justify-content:center;
            font-size:17px; font-weight:800; flex-shrink:0;
          }
          .rb-drawer-close {
            margin-left:auto; width:32px; height:32px; border-radius:9px;
            border:none; background:#F3F4F6; color:#6B7280;
            display:flex; align-items:center; justify-content:center;
            font-size:14px; cursor:pointer; flex-shrink:0;
          }
          .rb-drawer-close:hover { background:#E5E7EB; }
          .rb-drawer-summary { display:flex; gap:10px; flex-wrap:wrap; }
          .rb-drawer-sum-pill {
            padding:6px 14px; border-radius:10px; font-size:12px; font-weight:700;
            display:flex; align-items:center; gap:6px;
          }

          /* Drawer scrollable body */
          .rb-drawer-body { flex:1; overflow-y:auto; padding:20px 24px; }

          /* Individual reimbursement entry */
          .rb-entry {
            border:1.5px solid #F0F0F0; border-radius:14px; overflow:hidden; margin-bottom:14px;
          }
          .rb-entry-strip { height:3px; }
          .rb-entry-strip.pending  { background:linear-gradient(90deg,#FCD34D,#F59E0B); }
          .rb-entry-strip.approved { background:linear-gradient(90deg,#4ADE80,#16A34A); }
          .rb-entry-strip.rejected { background:linear-gradient(90deg,#F87171,#DC2626); }
          .rb-entry-body { padding:14px 16px; }

          .rb-entry-head {
            display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px;
          }
          .rb-entry-cat {
            display:inline-flex; align-items:center; gap:6px;
            padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600;
          }
          .rb-entry-status {
            padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700;
            display:inline-flex; align-items:center; gap:4px;
          }
          .rb-entry-status.pending  { background:#FEF9C3; color:#854D0E; }
          .rb-entry-status.approved { background:#DCFCE7; color:#166534; }
          .rb-entry-status.rejected { background:#FEE2E2; color:#991B1B; }
          .rb-entry-amount {
            font-size:20px; font-weight:800; color:#111827;
          }

          .rb-entry-tags { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:10px; }

          .rb-entry-meta { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:10px; }
          .rb-entry-meta-item { display:flex; align-items:center; gap:5px; font-size:12px; color:#6B7280; }
          .rb-entry-meta-item i { font-size:11px; color:#9CA3AF; }

          .rb-entry-desc {
            background:#F9FAFB; border-radius:8px; padding:9px 11px;
            font-size:12px; color:#374151; line-height:1.5;
            border-left:3px solid #E5E7EB; margin-bottom:10px;
          }

          .rb-entry-remark {
            background:#FFF1F2; border:1px solid #FECDD3; border-radius:8px;
            padding:8px 12px; font-size:12px; color:#9F1239;
            display:flex; align-items:flex-start; gap:6px; margin-bottom:10px;
          }

          .rb-entry-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:8px; }
          .rb-btn {
            display:inline-flex; align-items:center; gap:5px;
            padding:6px 14px; border-radius:9px; border:none;
            font-size:12px; font-weight:600; cursor:pointer; transition:all .15s;
          }
          .rb-btn:disabled { opacity:.5; cursor:not-allowed; }
          .rb-btn-docs    { background:#F3F4F6; color:#374151; }
          .rb-btn-docs:hover { background:#E5E7EB; }
          .rb-btn-approve { background:#DCFCE7; color:#15803D; border:1px solid #BBF7D0; }
          .rb-btn-approve:hover:not(:disabled) { background:#BBF7D0; }
          .rb-btn-reject  { background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; }
          .rb-btn-reject:hover:not(:disabled)  { background:#FECACA; }
          .docs-count {
            background:#4F46E5; color:#fff; border-radius:20px;
            padding:0 6px; font-size:10px; font-weight:700; margin-left:2px;
          }

          /* ── Docs modal ── */
          .rb-modal-backdrop {
            position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1060;
            display:flex; align-items:center; justify-content:center;
          }
          .rb-modal {
            background:#fff; border-radius:18px; width:100%; max-width:480px;
            margin:0 16px; box-shadow:0 16px 48px rgba(0,0,0,.2); overflow:hidden;
          }
          .rb-modal-header {
            display:flex; justify-content:space-between; align-items:center;
            padding:18px 22px; border-bottom:1px solid #F0F0F0;
          }
          .rb-modal-header h6 { font-weight:700; color:#111827; margin:0; font-size:15px; }
          .rb-modal-close {
            width:30px; height:30px; border-radius:8px; border:none;
            background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px;
            display:flex; align-items:center; justify-content:center;
          }
          .rb-modal-close:hover { background:#E5E7EB; }
          .rb-modal-body { padding:20px 22px; }
          .rb-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
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

          /* ── Reject modal ── */
          .rb-textarea {
            width:100%; padding:12px 14px; border-radius:10px;
            border:1.5px solid #E5E7EB; font-size:13px; color:#374151;
            resize:none; outline:none; min-height:90px; line-height:1.5;
          }
          .rb-textarea:focus { border-color:#DC2626; }

          /* Empty / Loading */
          .rb-empty { text-align:center; padding:60px 20px; }
          .rb-empty i { font-size:52px; color:#E5E7EB; display:block; margin-bottom:14px; }
          .rb-empty p { color:#9CA3AF; font-size:14px; }
          .rb-loading { text-align:center; padding:60px; color:#9CA3AF; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
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
                <select className="rb-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="rb-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                  {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <div className="rb-search-wrap">
                  <i className="bi bi-search rb-search-icon" />
                  <input className="rb-search" type="text" placeholder="Search employee, category…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                <div className="rb-tabs">
                  {[
                    { key:"all",      label:"All" },
                    { key:"Pending",  label:`Pending${pendingCnt > 0 ? ` · ${pendingCnt}` : ""}` },
                    { key:"Approved", label:"Approved" },
                    { key:"Rejected", label:"Rejected" },
                  ].map(t => (
                    <button key={t.key}
                      className={`rb-tab ${statusFilter===t.key ? "active" : ""}`}
                      onClick={() => setStatusFilter(t.key)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Stats ── */}
              <div className="rb-stats">
                {[
                  { icon:"bi-people-fill",       bg:"#EEF2FF", ic:"#4F46E5", val: grouped.length,         label:"Employees"       },
                  { icon:"bi-hourglass-split",    bg:"#FEF9C3", ic:"#B45309", val: pendingCnt,             label:"Awaiting Action"  },
                  { icon:"bi-check-circle-fill",  bg:"#DCFCE7", ic:"#15803D", val:`₹${fmt(approvedAmt)}`, label:"Approved"         },
                  { icon:"bi-clock-history",      bg:"#EFF6FF", ic:"#1D4ED8", val:`₹${fmt(pendingAmt)}`,  label:"Pending Amount"   },
                ].map((s,i) => (
                  <div key={i} className="rb-stat">
                    <div className="rb-stat-icon" style={{ background:s.bg, color:s.ic }}>
                      <i className={`bi ${s.icon}`} />
                    </div>
                    <div>
                      <div className="rb-stat-val">{s.val}</div>
                      <div className="rb-stat-label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Section header ── */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <h5 style={{ fontWeight:700, color:"#111827", margin:0, fontSize:15 }}>
                  Reimbursement by Employee
                  <span style={{ color:"#9CA3AF", fontWeight:400, marginLeft:8, fontSize:14 }}>
                    {MONTHS[month]} {year}
                  </span>
                </h5>
                <span style={{ color:"#9CA3AF", fontSize:12 }}>
                  {filteredGroups.length} employee{filteredGroups.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* ── Employee card grid ── */}
              {loading ? (
                <div className="rb-loading">
                  <div className="spinner-border text-primary mb-3" role="status" />
                  <p style={{ color:"#9CA3AF" }}>Loading reimbursements…</p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="rb-empty">
                  <i className="bi bi-receipt" />
                  <p>No reimbursement requests for {MONTHS[month]} {year}</p>
                </div>
              ) : (
                <div className="rb-emp-grid">
                  {filteredGroups.map(group => {
                    const [bg, fc] = avatarColor(group.name);
                    const st = groupStats(group.entries);
                    return (
                      <div key={group.empId} className="rb-emp-card" onClick={() => setDrawer(group)}>
                        <div className="rb-emp-card-top">
                          {group.avatar
                            ? <img src={group.avatar} alt="avatar" className="rb-emp-avatar" style={{ objectFit:"cover", padding:0 }} />
                            : <div className="rb-emp-avatar" style={{ background:bg, color:fc }}>{getInitials(group.name)}</div>
                          }
                          <div style={{ minWidth:0 }}>
                            <div className="rb-emp-name">{group.name}</div>
                            {group.dept && <div className="rb-emp-dept">{group.dept}</div>}
                          </div>
                          <div className="rb-emp-amt">
                            <div className="rb-emp-amt-val">₹{fmt(st.totalAmt)}</div>
                            <div className="rb-emp-amt-label">Total Claimed</div>
                          </div>
                        </div>

                        <div className="rb-emp-pills">
                          {st.pending  > 0 && <span className="rb-mini-pill pending">
                            <i className="bi bi-clock-fill" style={{ fontSize:9 }} />
                            {st.pending} Pending · ₹{fmt(st.pendingAmt)}
                          </span>}
                          {st.approved > 0 && <span className="rb-mini-pill approved">
                            <i className="bi bi-check-circle-fill" style={{ fontSize:9 }} />
                            {st.approved} Approved · ₹{fmt(st.approvedAmt)}
                          </span>}
                          {st.rejected > 0 && <span className="rb-mini-pill rejected">
                            <i className="bi bi-x-circle-fill" style={{ fontSize:9 }} />
                            {st.rejected} Rejected
                          </span>}
                        </div>

                        <div className="rb-emp-card-footer">
                          <span>{st.total} request{st.total!==1?"s":""} this month</span>
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
              SIDE DRAWER — Employee Reimbursement Detail
          ══════════════════════════════════════════ */}
          {drawerGroup && (
            <>
              <div className="rb-drawer-backdrop" onClick={() => setDrawer(null)} />
              <div className="rb-drawer">

                {/* Drawer header */}
                <div className="rb-drawer-head">
                  <div className="rb-drawer-head-top">
                    {(() => {
                      const [bg, fc] = avatarColor(drawerGroup.name);
                      const st = groupStats(drawerGroup.entries);
                      return (
                        <>
                          {drawerGroup.avatar
                            ? <img src={drawerGroup.avatar} alt="avatar" className="rb-drawer-avatar" style={{ objectFit:"cover", padding:0 }} />
                            : <div className="rb-drawer-avatar" style={{ background:bg, color:fc }}>{getInitials(drawerGroup.name)}</div>
                          }
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:800, fontSize:16, color:"#111827" }}>{drawerGroup.name}</div>
                            {drawerGroup.dept && (
                              <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{drawerGroup.dept}</div>
                            )}
                          </div>
                          <button className="rb-drawer-close" onClick={() => setDrawer(null)}>
                            <i className="bi bi-x-lg" />
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  {/* Summary pills */}
                  {(() => {
                    const st = groupStats(drawerGroup.entries);
                    return (
                      <div className="rb-drawer-summary">
                        <div className="rb-drawer-sum-pill" style={{ background:"#EEF2FF", color:"#4F46E5" }}>
                          <i className="bi bi-receipt" /> ₹{fmt(st.totalAmt)} total
                        </div>
                        {st.approvedAmt > 0 && (
                          <div className="rb-drawer-sum-pill" style={{ background:"#DCFCE7", color:"#15803D" }}>
                            <i className="bi bi-check-circle-fill" /> ₹{fmt(st.approvedAmt)} approved
                          </div>
                        )}
                        {st.pending > 0 && (
                          <div className="rb-drawer-sum-pill" style={{ background:"#FEF9C3", color:"#854D0E" }}>
                            <i className="bi bi-clock-fill" /> {st.pending} pending
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Entries */}
                <div className="rb-drawer-body">
                  {drawerGroup.entries
                    .slice()
                    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map(item => {
                      const cm  = catMeta(item.category);
                      const cls = item.status?.toLowerCase();
                      return (
                        <div key={item._id} className="rb-entry">
                          <div className={`rb-entry-strip ${cls}`} />
                          <div className="rb-entry-body">

                            {/* Amount + category */}
                            <div className="rb-entry-head">
                              <div>
                                <div className="rb-entry-amount">₹{fmt(item.amount)}</div>
                                <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>
                                  Submitted {fmtDateShort(item.createdAt)}
                                </div>
                              </div>
                              <div style={{ textAlign:"right" }}>
                                <span className={`rb-entry-status ${cls}`}>
                                  <i className={`bi bi-${
                                    item.status==="Approved" ? "check-circle-fill" :
                                    item.status==="Rejected" ? "x-circle-fill" : "clock-fill"
                                  }`} />
                                  {item.status}
                                </span>
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="rb-entry-tags">
                              <span className="rb-entry-cat" style={{ background:cm.bg, color:cm.color }}>
                                <i className={`bi ${cm.icon}`} style={{ fontSize:11 }} />
                                {item.category}
                              </span>
                            </div>

                            {/* Dates */}
                            <div className="rb-entry-meta">
                              <div className="rb-entry-meta-item">
                                <i className="bi bi-calendar-event" />
                                <span>Paid: {fmtDate(item.paymentDate)}</span>
                              </div>
                              {item.attachments?.length > 0 && (
                                <div className="rb-entry-meta-item">
                                  <i className="bi bi-paperclip" />
                                  <span>{item.attachments.length} attachment{item.attachments.length>1?"s":""}</span>
                                </div>
                              )}
                            </div>

                            {/* Description */}
                            {item.description && (
                              <div className="rb-entry-desc">{item.description}</div>
                            )}

                            {/* Rejection remark */}
                            {item.status === "Rejected" && item.adminRemark && (
                              <div className="rb-entry-remark">
                                <i className="bi bi-exclamation-circle-fill" style={{ flexShrink:0, marginTop:1 }} />
                                <span><strong>Reason:</strong> {item.adminRemark}</span>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="rb-entry-actions">
                              <button className="rb-btn rb-btn-docs" onClick={() => setDocModal(item)}>
                                <i className="bi bi-paperclip" />
                                View Docs
                                {item.attachments?.length > 0 && (
                                  <span className="docs-count">{item.attachments.length}</span>
                                )}
                              </button>
                              {item.status === "Pending" && (
                                <>
                                  <button className="rb-btn rb-btn-approve"
                                    disabled={processing === item._id}
                                    onClick={() => handleApprove(item._id)}>
                                    {processing === item._id
                                      ? <div className="spinner-border spinner-border-sm" role="status" />
                                      : <><i className="bi bi-check-lg" /> Approve</>}
                                  </button>
                                  <button className="rb-btn rb-btn-reject"
                                    disabled={processing === item._id}
                                    onClick={() => { setRejectTarget(item); setRejectRemark(""); }}>
                                    <i className="bi bi-x-lg" /> Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════
              DOCUMENTS MODAL
          ══════════════════════════════════════════ */}
          {docModal && (
            <div className="rb-modal-backdrop" onClick={() => setDocModal(null)}>
              <div className="rb-modal" onClick={e => e.stopPropagation()}>
                <div className="rb-modal-header">
                  <h6><i className="bi bi-receipt me-2" />Request Details</h6>
                  <button className="rb-modal-close" onClick={() => setDocModal(null)}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
                <div className="rb-modal-body">
                  <div className="rb-detail-grid">
                    {[
                      ["Category",     docModal.category],
                      ["Amount",       `₹${fmt(docModal.amount)}`],
                      ["Status",       docModal.status],
                      ["Payment Date", fmtDate(docModal.paymentDate)],
                      ["Submitted",    fmtDate(docModal.createdAt)],
                    ].map(([l,v]) => (
                      <div key={l} className="rb-detail-cell">
                        <div className="rb-detail-lbl">{l}</div>
                        <div className="rb-detail-val">{v}</div>
                      </div>
                    ))}
                  </div>
                  {docModal.description && (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontSize:11, color:"#9CA3AF", fontWeight:700, textTransform:"uppercase", marginBottom:6 }}>Description</div>
                      <div style={{ background:"#F9FAFB", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#374151" }}>
                        {docModal.description}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize:11, color:"#9CA3AF", fontWeight:700, textTransform:"uppercase", marginBottom:8 }}>
                    Attachments ({docModal.attachments?.length || 0})
                  </div>
                  {!docModal.attachments?.length ? (
                    <div style={{ textAlign:"center", padding:24, color:"#9CA3AF", fontSize:13 }}>
                      <i className="bi bi-file-earmark-x" style={{ fontSize:32, display:"block", marginBottom:8 }} />
                      No documents uploaded
                    </div>
                  ) : (
                    <ul className="rb-doc-list">
                      {docModal.attachments.map((doc,i) => (
                        <li key={i}>
                          <a href={doc} target="_blank" rel="noreferrer">
                            <i className="bi bi-file-earmark-text" style={{ fontSize:16 }} />
                            Document {i+1}
                            <i className="bi bi-box-arrow-up-right" style={{ marginLeft:"auto", fontSize:11, color:"#9CA3AF" }} />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {docModal.status==="Rejected" && docModal.adminRemark && (
                    <div style={{ background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:8,
                      padding:"8px 12px", fontSize:12, color:"#9F1239", marginTop:14,
                      display:"flex", alignItems:"flex-start", gap:6 }}>
                      <i className="bi bi-exclamation-circle-fill" style={{ flexShrink:0 }} />
                      <span><strong>Rejection reason:</strong> {docModal.adminRemark}</span>
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end", padding:"14px 22px", borderTop:"1px solid #F0F0F0" }}>
                  <button onClick={() => setDocModal(null)}
                    style={{ padding:"9px 22px", borderRadius:10, border:"none",
                      background:"#F3F4F6", color:"#374151", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              REJECT MODAL
          ══════════════════════════════════════════ */}
          {rejectTarget && (
            <div className="rb-modal-backdrop" onClick={() => setRejectTarget(null)}>
              <div className="rb-modal" onClick={e => e.stopPropagation()}>
                <div className="rb-modal-header">
                  <h6 style={{ color:"#DC2626" }}><i className="bi bi-x-circle-fill me-2" />Reject Request</h6>
                  <button className="rb-modal-close" onClick={() => setRejectTarget(null)}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
                <div style={{ padding:"16px 22px" }}>
                  <div style={{ background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:12,
                    padding:"12px 16px", marginBottom:14,
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:700, color:"#111827", fontSize:13 }}>{drawerGroup?.name}</div>
                      <div style={{ color:"#6B7280", fontSize:11, marginTop:2 }}>{rejectTarget.category}</div>
                    </div>
                    <div style={{ fontWeight:800, fontSize:18, color:"#DC2626" }}>₹{fmt(rejectTarget.amount)}</div>
                  </div>
                  <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:7 }}>
                    Rejection Reason <span style={{ color:"#DC2626" }}>*</span>
                  </label>
                  <textarea className="rb-textarea"
                    placeholder="Explain clearly why this request is being rejected…"
                    value={rejectRemark}
                    onChange={e => setRejectRemark(e.target.value)}
                  />
                  <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4, textAlign:"right" }}>
                    {rejectRemark.length > 0 ? `${rejectRemark.length} chars` : "Required"}
                  </div>
                </div>
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end",
                  padding:"14px 22px", borderTop:"1px solid #F0F0F0" }}>
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
                      opacity:(!rejectRemark.trim() || processing===rejectTarget._id) ? 0.55 : 1 }}>
                    {processing === rejectTarget._id
                      ? <><div className="spinner-border spinner-border-sm" role="status" /> Rejecting…</>
                      : <><i className="bi bi-x-circle" /> Reject</>}
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
