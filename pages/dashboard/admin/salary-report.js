
// pages/dashboard/admin/salary-report.js
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Head from "next/head";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const empName = (s) => {
  if (s.employee?.personal?.firstName)
    return `${s.employee.personal.firstName} ${s.employee.personal.lastName || ""}`.trim();
  if (s.employee?.firstName)
    return `${s.employee.firstName} ${s.employee.lastName || ""}`.trim();
  return "—";
};

const getInitials = (name) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

// Consistent avatar color per employee
const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"], ["#FEF3C7","#B45309"], ["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"], ["#F3E8FF","#7C3AED"], ["#DBEAFE","#1D4ED8"],
  ["#FDF4FF","#A21CAF"], ["#ECFDF5","#059669"],
];
const avatarColor = (name) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export default function SalaryReport() {
  const today = new Date();
  const [month,      setMonth]      = useState(today.getMonth());
  const [year,       setYear]       = useState(today.getFullYear());
  const [salaries,   setSalaries]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [search,     setSearch]     = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const autoRefresh = useCallback(async () => {
    setLoading(true);
    setGenerating(true);
    try {
      await fetch("/api/admin/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
    } catch {}
    setGenerating(false);
    try {
      const res  = await fetch(`/api/admin/salary/list?month=${month}&year=${year}`);
      const data = await res.json();
      if (data.success) setSalaries(data.data);
      else toast.error("Failed to load salary data");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { autoRefresh(); }, [autoRefresh]);

  const handleGenerate = () => autoRefresh();

  const handleProcess = async (id) => {
    try {
      await fetch("/api/admin/salary/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSalaries((prev) =>
        prev.map((s) => (s._id === id ? { ...s, status: "Processed" } : s))
      );
      toast.success("Salary processed");
    } catch { toast.error("Failed to process"); }
  };

  const handleProcessAll = async () => {
    const pending = salaries.filter((s) => s.status === "Pending");
    if (!pending.length) { toast.info("No pending salaries"); return; }
    try {
      await Promise.all(
        pending.map((s) =>
          fetch("/api/admin/salary/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: s._id }),
          })
        )
      );
      setSalaries((prev) => prev.map((s) => ({ ...s, status: "Processed" })));
      toast.success(`Processed ${pending.length} salaries`);
    } catch { toast.error("Failed to process all"); }
  };

  const exportExcel = () => {
    const rows = filtered.map((s) => ({
      "Payroll ID":             s.payrollId,
      "Employee Name":          empName(s),
      "Department":             s.employee?.professional?.department || "—",
      "Basic Salary":           s.basicSalary,
      "Earned Salary":          s.earnedSalary || s.basicSalary,
      "Present Days":           s.presentDays  ?? "—",
      "Absent Days":            s.absentDays   ?? "—",
      "Late Count":             s.lateCount    ?? "—",
      "Absent Deduction":       s.deductions?.absent      || 0,
      "Half Day Deduction":     s.deductions?.halfDay     || 0,
      "Late Deduction":         s.deductions?.late        || 0,
      "Unpaid Leave Deduction": s.deductions?.unpaidLeave || 0,
      "Lunch Penalty":          s.deductions?.lunch       || 0,
      "Total Deduction":        s.deductions?.total       || 0,
      "OT Hours":               s.overtime?.hours         || 0,
      "OT Amount":              s.overtime?.amount        || 0,
      "Approved Reimbursement": s.reimbursement?.approved || 0,
      "Pending Reimbursement":  s.reimbursement?.pending  || 0,
      "Net Pay":                s.netPay,
      "Status":                 s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws["!cols"] = [
      {wch:14},{wch:22},{wch:18},{wch:14},{wch:14},{wch:12},{wch:12},{wch:10},
      {wch:16},{wch:16},{wch:14},{wch:18},{wch:14},{wch:16},{wch:10},{wch:12},
      {wch:20},{wch:20},{wch:12},{wch:10},
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salary Report");
    XLSX.writeFile(wb, `salary_${MONTHS[month]}_${year}.xlsx`);
  };

  const filtered = salaries.filter((s) => {
    const name = empName(s).toLowerCase();
    const dept = (s.employee?.professional?.department || "").toLowerCase();
    const q    = search.toLowerCase();
    return name.includes(q) || dept.includes(q) || (s.payrollId || "").toLowerCase().includes(q);
  });

  const totalNetPay     = filtered.reduce((a, s) => a + (s.netPay            || 0), 0);
  const totalDeductions = filtered.reduce((a, s) => a + (s.deductions?.total || 0), 0);
  const totalBasic      = filtered.reduce((a, s) => a + (s.basicSalary       || 0), 0);
  const totalOT         = filtered.reduce((a, s) => a + (s.overtime?.amount  || 0), 0);
  const pendingCount    = filtered.filter((s) => s.status === "Pending").length;
  const processedCount  = filtered.filter((s) => s.status === "Processed").length;

  return (
    <div className="leaves-management-admin">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* ════════════════════════════════════════════════
             SALARY REPORT — PREMIUM UI
          ════════════════════════════════════════════════ */

          /* Topbar */
          .sr-topbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:24px; }
          .sr-select {
            padding:8px 14px; border-radius:10px; border:1.5px solid #E5E7EB;
            font-size:13px; font-weight:500; color:#374151; background:#fff;
            outline:none; cursor:pointer; transition:border-color .2s;
          }
          .sr-select:focus { border-color:#4F46E5; }
          .sr-search {
            flex:1; min-width:180px; max-width:260px;
            padding:8px 14px 8px 36px; border-radius:10px;
            border:1.5px solid #E5E7EB; font-size:13px; color:#374151;
            outline:none; transition:border-color .2s; position:relative;
          }
          .sr-search:focus { border-color:#4F46E5; }
          .sr-search-wrap { position:relative; display:flex; align-items:center; }
          .sr-search-icon { position:absolute; left:11px; color:#9CA3AF; font-size:13px; pointer-events:none; }
          .sr-btn {
            display:flex; align-items:center; gap:6px;
            padding:8px 18px; border-radius:10px; border:none;
            font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;
            transition:background .15s, opacity .15s;
          }
          .sr-btn:disabled { opacity:.55; cursor:not-allowed; }
          .sr-btn-primary { background:#4F46E5; color:#fff; }
          .sr-btn-primary:hover:not(:disabled) { background:#4338CA; }
          .sr-btn-success { background:#16A34A; color:#fff; }
          .sr-btn-success:hover:not(:disabled) { background:#15803D; }
          .sr-btn-export  { background:#F0FDF4; color:#15803D; border:1.5px solid #BBF7D0; }
          .sr-btn-export:hover { background:#DCFCE7; }

          /* Stats strip */
          .sr-stats {
            display:grid; grid-template-columns:repeat(5,1fr);
            gap:14px; margin-bottom:24px;
          }
          @media(max-width:900px){ .sr-stats{grid-template-columns:repeat(3,1fr);} }
          @media(max-width:600px){ .sr-stats{grid-template-columns:repeat(2,1fr);} }
          .sr-stat {
            background:#fff; border:1px solid #F0F0F0; border-radius:14px;
            padding:16px 18px; transition:box-shadow .2s;
          }
          .sr-stat:hover { box-shadow:0 2px 12px rgba(0,0,0,.06); }
          .sr-stat-icon {
            width:36px; height:36px; border-radius:10px;
            display:flex; align-items:center; justify-content:center;
            font-size:15px; margin-bottom:10px;
          }
          .sr-stat-val   { font-size:19px; font-weight:700; color:#111827; line-height:1; margin-bottom:3px; }
          .sr-stat-label { font-size:11px; color:#9CA3AF; font-weight:500; }

          /* Section title */
          .sr-section { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
          .sr-section h5 { font-weight:700; color:#111827; margin:0; font-size:15px; }

          /* Main table */
          .sr-card { background:#fff; border:1px solid #EFEFEF; border-radius:14px; overflow:hidden; }
          .sr-table-scroll { overflow-x:auto; width:100%; }
          .sr-table { min-width:1000px; width:100%; border-collapse:collapse; font-size:13px; }
          .sr-table { width:100%; border-collapse:collapse; font-size:13px; }

          /* thead */
          .sr-table thead tr { background:#F8F9FA; }
          .sr-table thead th {
            padding:10px 14px; font-size:11px; font-weight:700;
            color:#6B7280; text-transform:uppercase; letter-spacing:.5px;
            white-space:nowrap; border-bottom:1.5px solid #F0F0F0;
            text-align:left;
          }
          .sr-table thead th.r { text-align:right; }

          /* tbody */
          .sr-table tbody tr.main-row {
            border-bottom:1px solid #F5F5F5;
            transition:background .12s; cursor:pointer;
          }
          .sr-table tbody tr.main-row:hover { background:#FAFBFF; }
          .sr-table tbody tr.main-row:last-child { border-bottom:none; }
          .sr-table td {
            padding:12px 14px; color:#374151;
            vertical-align:middle; white-space:nowrap;
          }
          .sr-table td.r { text-align:right; }

          /* Avatar */
          .emp-avatar {
            width:36px; height:36px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-size:12px; font-weight:700; flex-shrink:0;
          }
          .emp-info-name  { font-weight:600; color:#111827; font-size:13px; line-height:1.2; }
          .emp-info-id    { font-size:11px; color:#9CA3AF; margin-top:1px; }
          .emp-dept       { font-size:12px; color:#6B7280; }

          /* Status badges */
          .badge-pending   { display:inline-flex; align-items:center; gap:4px; background:#FEF9C3; color:#854D0E; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; }
          .badge-processed { display:inline-flex; align-items:center; gap:4px; background:#DCFCE7; color:#166534; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; }
          .badge-partial   { background:#EFF6FF; color:#1E40AF; padding:2px 7px; border-radius:6px; font-size:10px; font-weight:700; }

          /* PAL pill */
          .pal-pill { display:inline-flex; gap:1px; align-items:center; font-size:12px; }
          .pal-p { background:#DCFCE7; color:#15803D; padding:2px 7px; border-radius:4px 0 0 4px; font-weight:700; }
          .pal-a { background:#FEE2E2; color:#DC2626; padding:2px 7px; font-weight:700; }
          .pal-l { background:#FEF3C7; color:#B45309; padding:2px 7px; border-radius:0 4px 4px 0; font-weight:700; }

          /* Amount cells */
          .amt-red    { color:#DC2626; font-weight:600; }
          .amt-green  { color:#16A34A; font-weight:600; }
          .amt-blue   { color:#2563EB; font-weight:600; }
          .amt-orange { color:#D97706; font-weight:600; }
          .amt-bold   { font-weight:700; color:#111827; }
          .amt-muted  { color:#D1D5DB; font-size:12px; }

          /* Net pay cell — highlighted */
          .net-pay-cell {
            font-size:14px; font-weight:700; color:#111827;
          }

          /* Process button */
          .btn-process {
            background:#EEF2FF; color:#4F46E5; border:none;
            border-radius:8px; padding:5px 14px;
            font-size:12px; font-weight:600; cursor:pointer;
            transition:background .15s;
          }
          .btn-process:hover { background:#E0E7FF; }

          /* Expand chevron */
          .btn-expand {
            width:28px; height:28px; border-radius:8px;
            background:none; border:none; cursor:pointer;
            color:#9CA3AF; display:flex; align-items:center; justify-content:center;
            font-size:13px; transition:background .15s, color .15s;
          }
          .btn-expand:hover { background:#F3F4F6; color:#4F46E5; }
          .btn-expand.open  { background:#EEF2FF; color:#4F46E5; }

          /* Expand row */
          .expand-row td { padding:0; background:#F8FAFF; border-bottom:1px solid #E5E7EB; }
          .expand-inner {
            display:grid; grid-template-columns:repeat(4,1fr);
            gap:12px; padding:16px 20px;
          }
          @media(max-width:900px){ .expand-inner{grid-template-columns:repeat(2,1fr);} }

          .expand-card {
            background:#fff; border:1px solid #E5E7EB; border-radius:12px;
            padding:14px 16px;
          }
          .expand-card-title {
            font-size:10px; font-weight:700; text-transform:uppercase;
            letter-spacing:.6px; color:#9CA3AF; margin-bottom:10px;
            display:flex; align-items:center; gap:6px;
          }
          .expand-card-title i { font-size:12px; }
          .expand-row-item {
            display:flex; justify-content:space-between; align-items:center;
            padding:4px 0; font-size:12.5px;
          }
          .expand-row-item:not(:last-child) { border-bottom:1px solid #F5F5F5; }
          .expand-row-item .lbl { color:#6B7280; }
          .expand-row-item .val { font-weight:600; color:#111827; }
          .expand-row-item .val.red    { color:#DC2626; }
          .expand-row-item .val.green  { color:#16A34A; }
          .expand-row-item .val.blue   { color:#2563EB; }
          .expand-row-item .val.orange { color:#D97706; }
          .expand-row-item .val.muted  { color:#9CA3AF; }

          /* Pay summary card special */
          .expand-card-pay {
            border-color:#4F46E5; background:linear-gradient(135deg,#EEF2FF 0%,#F5F3FF 100%);
          }
          .pay-divider { border:none; border-top:1.5px solid #C7D2FE; margin:8px 0; }
          .pay-total-row {
            display:flex; justify-content:space-between; align-items:center;
            padding-top:6px;
          }
          .pay-total-label { font-weight:700; color:#111827; font-size:13px; }
          .pay-total-val   { font-weight:800; font-size:16px; color:#4F46E5; }

          /* Empty state */
          .sr-empty { text-align:center; padding:60px 0; }
          .sr-empty-icon { font-size:48px; color:#E5E7EB; margin-bottom:14px; }
          .sr-empty p { color:#9CA3AF; margin-bottom:16px; }

          /* Loading skeleton */
          .sr-loading { text-align:center; padding:48px; color:#9CA3AF; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home admin-attendance-summary">
            {/* Breadcrumb */}
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/home.svg" alt="" /> Home
                  </Link>
                </li>
                <li className="breadcrumb-item active">Salary Report</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* ── Topbar ───────────────────────────────────────────────── */}
              <div className="sr-topbar">
                <select className="sr-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="sr-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>

                <div className="sr-search-wrap">
                  <i className="bi bi-search sr-search-icon"></i>
                  <input className="sr-search" type="text" placeholder="Search name, dept…"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  {generating && (
                    <span style={{ fontSize:12, color:"#6B7280", display:"flex", alignItems:"center", gap:6 }}>
                      <div className="spinner-border spinner-border-sm" role="status" style={{ color:"#4F46E5" }}></div>
                      Refreshing…
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <button className="sr-btn sr-btn-success" onClick={handleProcessAll}>
                      <i className="bi bi-check2-all"></i>Process All ({pendingCount})
                    </button>
                  )}
                  <button className="sr-btn sr-btn-export" onClick={exportExcel} disabled={!filtered.length}>
                    <i className="bi bi-file-earmark-excel"></i>Export
                  </button>
                </div>
              </div>

              {/* ── Stats ────────────────────────────────────────────────── */}
              <div className="sr-stats">
                {[
                  { icon:"bi-people-fill",          bg:"#EEF2FF", ic:"#4F46E5", val: filtered.length,          label:"Employees",        sub:null },
                  { icon:"bi-wallet2",               bg:"#ECFDF5", ic:"#059669", val:`₹${fmt(totalNetPay)}`,   label:"Total Net Pay",    sub:null },
                  { icon:"bi-cash-stack",            bg:"#F0F9FF", ic:"#0369A1", val:`₹${fmt(totalBasic)}`,    label:"Total Basic",      sub:null },
                  { icon:"bi-arrow-down-circle-fill",bg:"#FFF1F2", ic:"#E11D48", val:`₹${fmt(totalDeductions)}`,label:"Total Deductions",sub:null },
                  { icon:"bi-clock-history",         bg:"#FFFBEB", ic:"#D97706", val:`₹${fmt(totalOT)}`,       label:"Total Overtime",   sub:null },
                ].map((s, i) => (
                  <div key={i} className="sr-stat">
                    <div className="sr-stat-icon" style={{ background:s.bg, color:s.ic }}>
                      <i className={`bi ${s.icon}`}></i>
                    </div>
                    <div className="sr-stat-val">{s.val}</div>
                    <div className="sr-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Table ────────────────────────────────────────────────── */}
              <div className="sr-section">
                <h5>
                  Salary Breakdown
                  <span style={{ color:"#9CA3AF", fontWeight:400, marginLeft:8, fontSize:14 }}>
                    {MONTHS[month]} {year}
                  </span>
                </h5>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {pendingCount > 0 && (
                    <span style={{ background:"#FEF9C3", color:"#854D0E", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:600 }}>
                      {pendingCount} pending
                    </span>
                  )}
                  {processedCount > 0 && (
                    <span style={{ background:"#DCFCE7", color:"#166534", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:600 }}>
                      {processedCount} processed
                    </span>
                  )}
                  <span style={{ color:"#9CA3AF", fontSize:12 }}>{filtered.length} records</span>
                </div>
              </div>

              <div className="sr-card">
                <div className="sr-table-scroll">
                <table className="sr-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th className="r">Basic</th>
                      <th style={{ textAlign:"center" }}>P / A / L</th>
                      <th className="r">Deductions</th>
                      <th className="r">Overtime</th>
                      <th className="r">Reim.</th>
                      <th className="r">Net Pay</th>
                      <th style={{ textAlign:"center" }}>Action</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="11" className="sr-loading">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                          Loading salary data…
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan="11">
                          <div className="sr-empty">
                            <div className="sr-empty-icon"><i className="bi bi-receipt"></i></div>
                            <p>No salary records for {MONTHS[month]} {year}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((s) => {
                        const expanded = expandedId === s._id;
                        const d        = s.deductions    || {};
                        const ot       = s.overtime      || {};
                        const reim     = s.reimbursement || {};
                        const name     = empName(s);
                        const [bg, fc] = avatarColor(name);

                        return (
                          <React.Fragment key={s._id}>
                            <tr className="main-row" onClick={() => setExpandedId(expanded ? null : s._id)}>

                              {/* Employee */}
                              <td>
                                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                  <div className="emp-avatar" style={{ background:bg, color:fc }}>
                                    {getInitials(name)}
                                  </div>
                                  <div>
                                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                      <span className="emp-info-name">{name}</span>
                                      {s.isPartialMonth && <span className="badge-partial">Partial</span>}
                                    </div>
                                    <div className="emp-info-id">{s.payrollId}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Dept */}
                              <td className="emp-dept">
                                {s.employee?.professional?.department || "—"}
                              </td>

                              {/* Status */}
                              <td onClick={(e) => e.stopPropagation()}>
                                <span className={s.status === "Processed" ? "badge-processed" : "badge-pending"}>
                                  <i className={`bi bi-${s.status === "Processed" ? "check-circle-fill" : "clock"}`}></i>
                                  {s.status}
                                </span>
                              </td>

                              {/* Basic */}
                              <td className="r">
                                <span style={{ fontWeight:600, color:"#374151" }}>₹{fmt(s.basicSalary)}</span>
                                {s.isPartialMonth && s.earnedSalary && (
                                  <div style={{ fontSize:11, color:"#2563EB", fontWeight:500 }}>
                                    ₹{fmt(s.earnedSalary)} earned
                                  </div>
                                )}
                              </td>

                              {/* P / A / L */}
                              <td style={{ textAlign:"center" }}>
                                <div className="pal-pill">
                                  <span className="pal-p">{s.presentDays ?? "—"}</span>
                                  <span className="pal-a">{s.absentDays  ?? "—"}</span>
                                  <span className="pal-l">{s.lateCount   ?? "—"}</span>
                                </div>
                              </td>

                              {/* Deductions */}
                              <td className="r">
                                {d.total > 0
                                  ? <span className="amt-red">− ₹{fmt(d.total)}</span>
                                  : <span className="amt-muted">—</span>}
                              </td>

                              {/* OT */}
                              <td className="r">
                                {ot.amount > 0
                                  ? <><span className="amt-blue">+ ₹{fmt(ot.amount)}</span>
                                      <div style={{ fontSize:11, color:"#9CA3AF" }}>{ot.hours}h</div></>
                                  : <span className="amt-muted">—</span>}
                              </td>

                              {/* Reim */}
                              <td className="r">
                                {reim.approved > 0
                                  ? <span className="amt-green">+ ₹{fmt(reim.approved)}</span>
                                  : reim.pending > 0
                                  ? <span className="amt-orange">₹{fmt(reim.pending)}<br/><span style={{fontSize:10}}>pending</span></span>
                                  : <span className="amt-muted">—</span>}
                              </td>

                              {/* Net Pay */}
                              <td className="r">
                                <span className="net-pay-cell">₹{fmt(s.netPay)}</span>
                              </td>

                              {/* Action */}
                              <td style={{ textAlign:"center" }} onClick={(e) => e.stopPropagation()}>
                                {s.status === "Pending"
                                  ? <button className="btn-process" onClick={() => handleProcess(s._id)}>Process</button>
                                  : <span style={{ fontSize:12, color:"#9CA3AF" }}>Paid</span>}
                              </td>

                              {/* Expand */}
                              <td onClick={(e) => e.stopPropagation()}>
                                <button
                                  className={`btn-expand ${expanded ? "open" : ""}`}
                                  onClick={() => setExpandedId(expanded ? null : s._id)}
                                >
                                  <i className={`bi bi-chevron-${expanded ? "up" : "down"}`}></i>
                                </button>
                              </td>
                            </tr>

                            {/* ── Expanded row ── */}
                            {expanded && (
                              <tr className="expand-row">
                                <td colSpan="11">
                                  <div className="expand-inner">

                                    {/* Attendance */}
                                    <div className="expand-card">
                                      <div className="expand-card-title">
                                        <i className="bi bi-calendar-check"></i> Attendance
                                      </div>
                                      {[
                                        ["Working Days",  s.workingDays  ?? "—",  ""],
                                        ["Present Days",  s.presentDays  ?? "—",  s.presentDays > 0 ? "green" : ""],
                                        ["Absent Days",   s.absentDays   ?? "—",  s.absentDays  > 0 ? "red"   : "muted"],
                                        ["Late Count",    s.lateCount    ?? "—",  s.lateCount   > 2 ? "red"   : s.lateCount > 0 ? "orange" : "muted"],
                                        ["Half Days",     s.halfDayCount ?? "—",  s.halfDayCount > 0 ? "orange": "muted"],
                                      ].map(([l, v, cls]) => (
                                        <div key={l} className="expand-row-item">
                                          <span className="lbl">{l}</span>
                                          <span className={`val ${cls}`}>{v}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Deductions */}
                                    <div className="expand-card">
                                      <div className="expand-card-title">
                                        <i className="bi bi-arrow-down-circle"></i> Deductions
                                      </div>
                                      {[
                                        ["Absent",        `₹${fmt(d.absent)}`,       d.absent      > 0 ? "red"    : "muted"],
                                        ["Half Day",      `₹${fmt(d.halfDay)}`,      d.halfDay     > 0 ? "red"    : "muted"],
                                        ["Late Penalty",  `₹${fmt(d.late)}`,         d.late        > 0 ? "red"    : "muted"],
                                        ["Unpaid Leave",  `₹${fmt(d.unpaidLeave)}`,  d.unpaidLeave > 0 ? "red"    : "muted"],
                                        ["Lunch Penalty", `₹${fmt(d.lunch)}`,        d.lunch       > 0 ? "orange" : "muted"],
                                      ].map(([l, v, cls]) => (
                                        <div key={l} className="expand-row-item">
                                          <span className="lbl">{l}</span>
                                          <span className={`val ${cls}`}>{v}</span>
                                        </div>
                                      ))}
                                      <div className="expand-row-item" style={{ borderTop:"1.5px solid #FEE2E2", marginTop:4, paddingTop:6 }}>
                                        <span style={{ fontWeight:700, color:"#374151" }}>Total</span>
                                        <span className={`val ${d.total > 0 ? "red" : "muted"}`}>₹{fmt(d.total)}</span>
                                      </div>
                                    </div>

                                    {/* OT + Reimbursement */}
                                    <div className="expand-card">
                                      <div className="expand-card-title">
                                        <i className="bi bi-clock-history"></i> Overtime
                                      </div>
                                      {[
                                        ["Hours",  `${ot.hours  || 0}h`,    ot.hours  > 0 ? "blue" : "muted"],
                                        ["Amount", `₹${fmt(ot.amount)}`,    ot.amount > 0 ? "blue" : "muted"],
                                      ].map(([l, v, cls]) => (
                                        <div key={l} className="expand-row-item">
                                          <span className="lbl">{l}</span>
                                          <span className={`val ${cls}`}>{v}</span>
                                        </div>
                                      ))}
                                      <div className="expand-card-title" style={{ marginTop:14 }}>
                                        <i className="bi bi-receipt"></i> Reimbursement
                                      </div>
                                      {[
                                        ["Approved", `₹${fmt(reim.approved)}`, reim.approved > 0 ? "green"  : "muted"],
                                        ["Pending",  `₹${fmt(reim.pending)}`,  reim.pending  > 0 ? "orange" : "muted"],
                                      ].map(([l, v, cls]) => (
                                        <div key={l} className="expand-row-item">
                                          <span className="lbl">{l}</span>
                                          <span className={`val ${cls}`}>{v}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Pay Summary */}
                                    <div className="expand-card expand-card-pay">
                                      <div className="expand-card-title" style={{ color:"#4F46E5" }}>
                                        <i className="bi bi-wallet2"></i> Pay Summary
                                      </div>
                                      {[
                                        ["Basic Salary",   `₹${fmt(s.basicSalary)}`,  ""],
                                        ...(s.isPartialMonth && s.earnedSalary
                                          ? [["Earned (pro-rated)", `₹${fmt(s.earnedSalary)}`, "blue"]]
                                          : []),
                                        ["Deductions",     `− ₹${fmt(d.total)}`,      d.total    > 0 ? "red"   : "muted"],
                                        ["Overtime",       `+ ₹${fmt(ot.amount)}`,    ot.amount  > 0 ? "blue"  : "muted"],
                                        ["Reimbursement",  `+ ₹${fmt(reim.approved)}`,reim.approved > 0 ? "green": "muted"],
                                      ].map(([l, v, cls]) => (
                                        <div key={l} className="expand-row-item">
                                          <span className="lbl">{l}</span>
                                          <span className={`val ${cls}`}>{v}</span>
                                        </div>
                                      ))}
                                      <hr className="pay-divider" />
                                      <div className="pay-total-row">
                                        <span className="pay-total-label">Net Pay</span>
                                        <span className="pay-total-val">₹{fmt(s.netPay)}</span>
                                      </div>
                                      {s.isPartialMonth && (
                                        <div style={{ marginTop:8, fontSize:11, color:"#4F46E5", textAlign:"center", background:"#fff", borderRadius:6, padding:"4px 8px" }}>
                                          <i className="bi bi-info-circle me-1"></i>
                                          Partial month — {s.elapsedWorkingDays}/{s.workingDays} days
                                        </div>
                                      )}
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>

                  {/* ── Table footer totals ── */}
                  {filtered.length > 0 && !loading && (
                    <tfoot>
                      <tr style={{ background:"#F8F9FA", borderTop:"1.5px solid #EFEFEF" }}>
                        <td colSpan="3" style={{ padding:"12px 16px", fontWeight:700, color:"#374151", fontSize:12 }}>
                          Totals ({filtered.length} employees)
                        </td>
                        <td className="r" style={{ padding:"12px 16px", fontWeight:700, color:"#374151" }}>
                          ₹{fmt(totalBasic)}
                        </td>
                        <td></td>
                        <td className="r" style={{ padding:"12px 16px" }}>
                          <span className="amt-red" style={{ fontSize:13 }}>− ₹{fmt(totalDeductions)}</span>
                        </td>
                        <td className="r" style={{ padding:"12px 16px" }}>
                          <span className="amt-blue" style={{ fontSize:13 }}>₹{fmt(totalOT)}</span>
                        </td>
                        <td></td>
                        <td className="r" style={{ padding:"12px 16px" }}>
                          <span style={{ fontWeight:800, fontSize:15, color:"#111827" }}>₹{fmt(totalNetPay)}</span>
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                </div>
              </div>

              {/* Policy note */}
              <div style={{
                marginTop:14, padding:"10px 16px", background:"#F9FAFB",
                borderRadius:8, border:"1px solid #F0F0F0", fontSize:12, color:"#6B7280",
                lineHeight:1.8,
              }}>
                <strong style={{ color:"#374151" }}>
                  <i className="bi bi-info-circle me-1"></i>Deduction policy:
                </strong>
                {" "}Sundays = Week Off ·
                {" "}3rd Saturday = Half Day ·
                {" "}Public Holidays = Paid (no deduction) ·
                {" "}Late after 10:10 AM: 1–2 free, 3 = ₹500, 4–5 = ₹1,500, 6–9 = ₹3,500, 10+ = ₹5,000 ·
                {" "}Paid leave = no deduction · Unpaid/Sandwich leave = per-day deduction ·
                {" "}Mid-month generation = pro-rated earned salary
              </div>

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// import Dashnav from "@/components/Dashnav";
// import SmartLeftbar from "@/components/SmartLeftbar";
// import LeftbarMobile from "@/components/LeftbarMobile";
// import Head from "next/head";
// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import { toast } from "react-toastify";

// import * as XLSX from "xlsx";

// export default function SalaryReport() {
//   const [salaries, setSalaries] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const today = new Date();
//   const [month, setMonth] = useState(today.getMonth());
//   const [year, setYear] = useState(today.getFullYear());

//   const fetchSalaries = async () => {
//     const res = await fetch(
//       `/api/admin/salary/list?month=${month}&year=${year}`
//     );
//     const data = await res.json();

//     if (data.success) {
//       setSalaries(data.data);
//     }
//   };

//   const handleGenerate = async () => {
//     try {
//       setLoading(true);

//       const res = await fetch("/api/admin/salary/generate", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ month, year }),
//       });

//       const data = await res.json();

//       if (!data.success) {
//         toast.error("Salary generation failed");
//         return;
//       }

//       await fetchSalaries(); // ✅ IMPORTANT
//       toast.success("Salary generated successfully");
//     } catch (err) {
//       toast.error("Something went wrong");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchSalaries();
//   }, []);

//   const handleProcess = async (id) => {
//     await fetch("/api/admin/salary/process", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ id }),
//     });

//     setSalaries((prev) =>
//       prev.map((s) => (s._id === id ? { ...s, status: "Processed" } : s))
//     );

//     toast.success("Salary processed");
//   };

//   const exportExcel = () => {
//     // const ws = XLSX.utils.json_to_sheet(
//     //   salaries.map((s) => ({
//     //     PayrollID: s.payrollId,
//     //     Employee: s.employee?.personal?.firstName
//     //       ? `${s.employee.personal.firstName} ${
//     //           s.employee.personal.lastName || ""
//     //         }`
//     //       : `${s.employee?.firstName || ""} ${s.employee?.lastName || ""}`,

//     //     Department: s.employee?.professional?.department || "-",

//     //     BasicSalary: s.basicSalary,

//     //     LateDeduction: s.deductions?.late || 0,
//     //     UnpaidLeaveDeduction: s.deductions?.unpaidLeave || 0,
//     //     OtherDeduction: s.deductions?.other || 0,
//     //     TotalDeduction: s.deductions?.total || 0,

//     //     ReimPending: s.reimbursement?.pending || 0,
//     //     ReimApproved: s.reimbursement?.approved || 0,
//     //     ReimPaid: s.reimbursement?.paid || 0,

//     //     NetPay: s.netPay,
//     //     Status: s.status,

//     //     OTHours: s.overtime?.hours || 0,
//     //    OTAmount: s.overtime?.amount || 0,
//     //   }))
//     // );



//     const ws = XLSX.utils.json_to_sheet(
//   salaries.map((s) => ({
//     PayrollID: s.payrollId,

//     Employee: s.employee?.personal?.firstName
//       ? `${s.employee.personal.firstName} ${
//           s.employee.personal.lastName || ""
//         }`
//       : `${s.employee?.firstName || ""} ${s.employee?.lastName || ""}`,

//     Department: s.employee?.professional?.department || "-",

//     BasicSalary: s.basicSalary,

//     OTHours: s.overtime?.hours || 0,
//     OTAmount: s.overtime?.amount || 0,

//     LateDeduction: s.deductions?.late || 0,
//     UnpaidLeaveDeduction: s.deductions?.unpaidLeave || 0,
//     OtherDeduction: s.deductions?.other || 0,
//     TotalDeduction: s.deductions?.total || 0,

//     ReimPending: s.reimbursement?.pending || 0,

//     NetPay: s.netPay,
//     Status: s.status,
//   }))
// );


//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Salary Report");
//     XLSX.writeFile(wb, `salary_${month + 1}_${year}.xlsx`);
//   };

//   return (
//     <div className="leaves-management-admin">
//       <Head>
//         <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
//         <link rel="stylesheet" href="/asets/css/main.css" />
//         <link rel="stylesheet" href="/asets/css/admin.css" />
//       </Head>

//       <div className="add-employee-area">
//         <div className="main-nav">
//           <SmartLeftbar />
//           <LeftbarMobile />
//           <Dashnav />

//           <section className="content home admin-attendance-summary">
//             <div className="breadcrum-bx">
//               <ul className="breadcrumb bg-white">
//                 <li className="breadcrumb-item">
//                   <Link href="/dashboard/dashboard">Salary Report</Link>
//                 </li>
//               </ul>
//             </div>

//             <div className="block-header add-emp-area">
//               <h5 className="admin-main-heading">Salary Report</h5>

//               <div className="salary-filter-bar ">
//                 <select
//                   value={month}
//                   onChange={(e) => setMonth(Number(e.target.value))}
//                 >
//                   {Array.from({ length: 12 }).map((_, i) => (
//                     <option key={i} value={i}>
//                       {new Date(0, i).toLocaleString("default", {
//                         month: "long",
//                       })}
//                     </option>
//                   ))}
//                 </select>

//                 <select
//                   value={year}
//                   onChange={(e) => setYear(Number(e.target.value))}
//                 >
//                   {[year - 1, year, year + 1].map((y) => (
//                     <option key={y} value={y}>
//                       {y}
//                     </option>
//                   ))}
//                 </select>

//                 <button className="btn btn-primary" onClick={handleGenerate}>
//                   Generate Salary
//                 </button>

//                 <button className="btn btn-secondary" onClick={exportExcel}>
//                   Export Excel
//                 </button>
//               </div>

//               {/* Table comes next */}

//               <div className="admin-reim-root">
//                 <table className="admin-reim-table">
//                   <thead>
//                     <tr>
//                       <th>Emp. ID</th>
//                       <th>Employee</th>
//                       <th>Department</th>
//                       <th>Basic Salary</th>
//                       <th>OT Hours</th>
//                       <th>OT Amount</th>
//                       <th>Late Deduction</th>
//                       <th>Unpaid Leave</th>
//                       <th>Other Deduction</th>
//                       <th>Total Deduction</th>
//                       <th>Pending Reimbursement</th>
//                       <th>Net Pay</th>
//                       <th>Status</th>
//                       <th>Action</th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {loading ? (
//                       <tr>
//                         <td colSpan="10">Loading...</td>
//                       </tr>
//                     ) : salaries.length === 0 ? (
//                       <tr>
//                         <td colSpan="10">No salary records</td>
//                       </tr>
//                     ) : (
//                       salaries.map((s) => (
//                         <tr key={s._id}>
//                           <td>{s.payrollId}</td>

//                           <td>
//                             {s.employee?.personal?.firstName
//                               ? `${s.employee.personal.firstName} ${
//                                   s.employee.personal.lastName || ""
//                                 }`
//                               : s.employee?.firstName
//                               ? `${s.employee.firstName} ${
//                                   s.employee.lastName || ""
//                                 }`
//                               : "-"}
//                           </td>

//                           <td>{s.employee?.professional?.department || "-"}</td>

//                           <td>₹ {s.basicSalary}</td>

//                           <td className="fw-bold text-primary">
//                             {s.overtime?.hours || 0}h
//                           </td>

//                           <td className="fw-bold text-success">
//                             ₹ {s.overtime?.amount || 0}
//                           </td>


//                           <td className="text-danger">
//                             ₹ {s.deductions?.late || 0}
//                           </td>
//                           <td className="text-danger">
//                             ₹ {s.deductions?.unpaidLeave || 0}
//                           </td>
//                           <td className="text-danger">
//                             ₹ {s.deductions?.other || 0}
//                           </td>

//                           <td className="text-danger fw-bold">
//                             ₹ {s.deductions?.total || 0}
//                           </td>

                         

//                           {/* ONLY PENDING REIMBURSEMENT */}
//                           <td className="text-warning fw-bold">
//                             ₹ {s.reimbursement?.pending || 0}
//                           </td>

                          

//                           {/* NET PAY (includes pending reimbursement) */}
//                           <td className="fw-bold text-success">₹ {s.netPay}</td>

//                           <td>
//                             <span
//                               className={`status-pill ${
//                                 s.status === "Processed" ? "approved" : ""
//                               }`}
//                             >
//                               {s.status}
//                             </span>
//                           </td>

//                           <td>
//                             {s.status === "Pending" && (
//                               <button
//                                 className="btn-approve"
//                                 onClick={() => handleProcess(s._id)}
//                               >
//                                 Process
//                               </button>
//                             )}
//                           </td>
//                         </tr>
//                       ))
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </section>
//         </div>
//       </div>
//     </div>
//   );
// }
