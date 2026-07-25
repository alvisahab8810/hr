import { toast } from "react-toastify";

import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

export default function LeaveManagement() {
  const [reasonModalData, setReasonModalData] = useState(null);

  const [expandedReason, setExpandedReason] = useState(null);

  const [showSandwichWarning, setShowSandwichWarning] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showDocModal, setShowDocModal] = useState(false);

  const [actionLeave, setActionLeave] = useState(null);
  const [actionType, setActionType] = useState(""); // "approve" | "reject"
  const [adminRemark, setAdminRemark] = useState("");
  const [showActionModal, setShowActionModal] = useState(false);

  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const pendingCount = leaves.filter((l) => l.status === "Pending").length;
  const approvedCount = leaves.filter((l) => l.status === "Approved").length;
  const rejectedCount = leaves.filter((l) => l.status === "Rejected").length;
  const totalLeaves = leaves.length;

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear,  setSelectedYear]  = useState(new Date().getFullYear());

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const YEARS  = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  const [showFilter, setShowFilter] = useState(false);

  const [filters, setFilters] = useState({
    status: "",
    leaveType: "",
    sandwich: "",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    async function fetchLeaves() {
      setLoadingLeaves(true);
      try {
        const res = await fetch(
          `/api/admin/leave/list?month=${selectedMonth}&year=${selectedYear}`,
          { credentials: "include" }
        );

        const data = await res.json();

        if (data.success) {
          setLeaves(data.leaves);
        }
      } catch (err) {
        console.error("Fetch admin leaves error", err);
        toast.error("Failed to load leave requests");
      } finally {
        setLoadingLeaves(false);
      }
    }

    fetchLeaves();
  }, [selectedMonth, selectedYear]);

  function getWorkingDays(start, end) {
    let count = 0;
    let d = new Date(start);

    while (d <= new Date(end)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }

    return count;
  }

  const filteredLeaves = leaves.filter((leave) => {
    if (filters.status && leave.status !== filters.status) return false;

    if (filters.leaveType && leave.leaveType !== filters.leaveType)
      return false;

    if (
      filters.sandwich &&
      String(!!leave.policyFlags?.sandwichLeave) !== filters.sandwich
    )
      return false;

    if (filters.fromDate) {
      if (new Date(leave.startDate) < new Date(filters.fromDate)) return false;
    }

    if (filters.toDate) {
      if (new Date(leave.endDate) > new Date(filters.toDate)) return false;
    }

    return true;
  });

  // =================================excel export button =====================

  const exportLeaves = () => {
    if (filteredLeaves.length === 0) {
      toast.error("No leave data available to export");
      return;
    }

    // 1️⃣ CSV Headers (ALL IMPORTANT DETAILS)
    const headers = [
      "Employee Name",
      // "Employee ID",
      "Leave Type",
      "Start Date",
      "End Date",
      "Total Days",
      "Sandwich Leave",
      "Reason",
      "Employee Remark",
      "Status",
      "Admin Remark",
      "Documents Count",
    ];

    // 2️⃣ Map filteredLeaves to rows
    const rows = filteredLeaves.map((leave) => [
      `${leave.employee?.firstName || ""} ${leave.employee?.lastName || ""}`,
      // leave.employee?.employeeId || "",
      leave.leaveType || "",
      new Date(leave.startDate).toLocaleDateString(),
      new Date(leave.endDate).toLocaleDateString(),
      leave.totalDays || 0,
      leave.policyFlags?.sandwichLeave ? "Yes" : "No",
      leave.reason || "",
      leave.employeeRemark || "",
      leave.status || "",
      leave.adminRemark || "",
      leave.documents?.length || 0,
    ]);

    // 3️⃣ Convert to CSV string
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // 4️⃣ Create file & download
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `leave_export_${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="leaves-management-admin">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
        <style>{`
          /* ════════════════════════════════════════════
             TOPBAR
          ════════════════════════════════════════════ */
          .lv-topbar {
            display: flex; justify-content: space-between; align-items: center;
            flex-wrap: wrap; gap: 12px; margin-bottom: 22px;
            background: #fff; border-radius: 16px; padding: 12px 16px;
            border: 1px solid #F0F0F8; box-shadow: 0 2px 10px rgba(15,23,42,.05);
          }
          .lv-heading { font-size: 16px; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.2px; }
          .lv-section-heading { font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 16px; letter-spacing: -0.2px; }
          .lv-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

          .lv-select {
            border: 1.5px solid #E5E7EB; border-radius: 10px;
            padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
            background: #fff; color: #374151; outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .lv-select:focus, .lv-select:hover { border-color: #4F46E5; }

          .lv-filter-btn, .lv-export-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 10px;
            font-size: 13px; font-weight: 700; cursor: pointer; border: none;
            transition: transform 0.15s, box-shadow 0.15s; white-space: nowrap;
          }
          .lv-filter-btn { background: #F3F4F6; color: #374151; }
          .lv-filter-btn:hover { background: #E5E7EB; }
          .lv-export-btn { background: linear-gradient(135deg,#4F46E5,#6366F1); color: #fff; box-shadow: 0 4px 12px rgba(79,70,229,.25); }
          .lv-export-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79,70,229,.32); }

          /* ════════════════════════════════════════════
             SUMMARY CARDS — gradient-wash KPI style
          ════════════════════════════════════════════ */
          .lv-cards {
            display: grid; grid-template-columns: repeat(4, 1fr);
            align-items: start; gap: 16px; margin-bottom: 24px;
          }
          @media (max-width: 900px) { .lv-cards { grid-template-columns: repeat(2,1fr); } }
          .lv-kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .lv-kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(15,23,42,.12); }
          .lv-card {
            box-sizing: border-box; height: 104px;
            border-radius: 16px; padding: 17px 18px 16px;
            display: flex; flex-direction: column; justify-content: space-between;
            border: 1px solid; box-shadow: 0 3px 12px rgba(15,23,42,.06);
            position: relative; overflow: hidden;
          }
          .lv-card::before {
            content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          }
          .lv-card.blue   { background: linear-gradient(160deg,#fff 55%,#DBEAFE 165%); border-color: #DBEAFE; }
          .lv-card.blue::before   { background: #2563EB; }
          .lv-card.red    { background: linear-gradient(160deg,#fff 55%,#FEE2E2 165%); border-color: #FEE2E2; }
          .lv-card.red::before    { background: #DC2626; }
          .lv-card.green  { background: linear-gradient(160deg,#fff 55%,#DCFCE7 165%); border-color: #DCFCE7; }
          .lv-card.green::before  { background: #16A34A; }
          .lv-card.orange { background: linear-gradient(160deg,#fff 55%,#FFEDD5 165%); border-color: #FFEDD5; }
          .lv-card.orange::before { background: #EA580C; }

          .lv-icon {
            width: 46px; height: 46px; border-radius: 13px;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            color: #fff; font-size: 19px;
          }
          .lv-icon.blue   { background: #2563EB; box-shadow: 0 6px 16px rgba(37,99,235,.18); }
          .lv-icon.red    { background: #DC2626; box-shadow: 0 6px 16px rgba(239,68,68,.18); }
          .lv-icon.green  { background: #16A34A; box-shadow: 0 6px 16px rgba(34,197,94,.18); }
          .lv-icon.orange { background: #EA580C; box-shadow: 0 6px 16px rgba(249,115,22,.18); }
          .lv-card-top    { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
          .lv-card-body   { flex: 1; min-width: 0; padding: 0; }
          .lv-card-value  { font-size: 26px; font-weight: 900; color: #0F172A; line-height: 1.05; letter-spacing: -0.8px; white-space: nowrap; }
          .lv-card-label  { font-size: 12px; color: #475569; font-weight: 700; margin-top: 3px; white-space: nowrap; }
          .lv-progress-track { height: 6px; background: #F1F5F9; border-radius: 6px; }
          .lv-progress-fill  { height: 6px; border-radius: 6px; transition: width .4s; }

          /* ════════════════════════════════════════════
             LEAVES TABLE
          ════════════════════════════════════════════ */
          .lv-table-wrap {
            border-radius: 16px; overflow: hidden; border: 1px solid #F0F0F8;
            box-shadow: 0 2px 10px rgba(15,23,42,.05); background: #fff; overflow-x: auto;
          }
          .lv-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
          .lv-table thead tr { background: #F8FAFC; border-bottom: 1.5px solid #EFEFEF; }
          .lv-table thead th {
            padding: 13px 16px; font-weight: 800; color: #64748B;
            text-align: center; white-space: nowrap; font-size: 11px;
            text-transform: uppercase; letter-spacing: 0.5px;
          }
          .lv-table thead th:first-child { text-align: left; padding-left: 20px; }
          .lv-table tbody tr { border-bottom: 1px solid #F5F5F5; transition: background 0.15s; }
          .lv-table tbody tr:last-child { border-bottom: none; }
          .lv-table tbody tr:hover { background: #F8F9FF; }
          .lv-table td { padding: 13px 16px; color: #374151; text-align: center; vertical-align: middle; }
          .lv-table td:first-child { text-align: left; padding-left: 20px; white-space: nowrap; }

          .lv-emp-cell { display: flex; align-items: center; gap: 10px; }
          .lv-avatar {
            width: 36px; height: 36px; border-radius: 50%;
            background: #EEF2FF; color: #4F46E5;
            font-size: 12px; font-weight: 700;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; text-transform: uppercase;
          }
          .lv-emp-name { font-weight: 600; color: #111827; font-size: 13.5px; }

          .lv-days-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; }
          .lv-days-cell strong { font-size: 14px; color: #0F172A; }
          .lv-extra-days { font-size: 10.5px; color: #EA580C; font-weight: 600; white-space: nowrap; }

          .lv-status-stack { display: flex; flex-direction: column; align-items: center; gap: 4px; }
          .lv-status-pill {
            display: inline-block; padding: 4px 12px; border-radius: 20px;
            font-size: 11.5px; font-weight: 700; white-space: nowrap;
          }
          .lv-status-pill.pending  { background: #FEF3C7; color: #B45309; }
          .lv-status-pill.approved { background: #DCFCE7; color: #15803D; }
          .lv-status-pill.rejected { background: #FEE2E2; color: #DC2626; }
          .lv-sandwich-badge {
            font-size: 10px; font-weight: 700; color: #7C3AED;
            background: #F3E8FF; padding: 2px 9px; border-radius: 20px; white-space: nowrap;
          }

          .lv-view-reason-btn {
            display: inline-flex; align-items: center; gap: 5px;
            background: #EEF2FF; color: #4F46E5; border: none; border-radius: 8px;
            padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer;
            transition: background 0.15s;
          }
          .lv-view-reason-btn:hover { background: #E0E7FF; }

          .lv-action-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }
          .lv-view-btn, .lv-approve-btn, .lv-reject-btn {
            border: none; border-radius: 8px; padding: 7px 14px;
            font-size: 12px; font-weight: 700; cursor: pointer;
            transition: transform 0.15s, box-shadow 0.15s; white-space: nowrap;
          }
          .lv-view-btn { background: #F3F4F6; color: #374151; }
          .lv-view-btn:hover { background: #E5E7EB; }
          .lv-approve-btn { background: #16A34A; color: #fff; box-shadow: 0 3px 10px rgba(34,197,94,.25); }
          .lv-approve-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(34,197,94,.32); }
          .lv-reject-btn { background: #DC2626; color: #fff; box-shadow: 0 3px 10px rgba(239,68,68,.25); }
          .lv-reject-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(239,68,68,.32); }

          /* ════════════════════════════════════════════
             FILTER PANEL (SIDE DRAWER)
          ════════════════════════════════════════════ */
          .lv-filter-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 998; }
          .lv-filter-overlay.open { display: block; }
          .lv-filter-panel {
            position: fixed; top: 0; right: -360px; left: auto; width: 340px; height: 100vh;
            background: #fff; z-index: 999; box-shadow: -4px 0 24px rgba(0,0,0,0.1);
            transition: right 0.3s ease; transform: none; display: flex; flex-direction: column;
            border-radius: 0;
          }
          .lv-filter-panel.open { right: 0; }
          .lv-filter-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #F0F0F0; }
          .lv-filter-header h6 { font-weight: 700; font-size: 15px; color: #111827; margin: 0; text-transform: none; }
          .lv-close-btn { background: #F3F4F6; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 14px; color: #6B7280; }
          .lv-filter-body { flex: 1; padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
          .lv-filter-group { display: flex; flex-direction: column; gap: 6px; }
          .lv-filter-group label { font-size: 12px; font-weight: 600; color: #374151; text-transform: none; }
          .lv-filter-group select, .lv-filter-group input[type="date"] {
            padding: 9px 12px; border-radius: 9px; border: 1.5px solid #E5E7EB;
            font-size: 13px; color: #374151; background: #fff; outline: none;
            width: 100%; box-sizing: border-box; appearance: auto;
          }
          .lv-filter-group select:focus,
          .lv-filter-group input[type="date"]:focus { border-color: #4F46E5; }
          .lv-filter-footer { padding: 20px 24px; border-top: 1px solid #F0F0F0; display: flex; gap: 10px; }
          .lv-apply-btn { flex: 1; background: #4F46E5; color: #fff; border: none; border-radius: 10px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
          .lv-apply-btn:hover { background: #4338CA; }
          .lv-reset-btn { background: #F3F4F6; color: #374151; border: none; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
          .lv-reset-btn:hover { background: #E5E7EB; }

          /* ════════════════════════════════════════════
             MODALS
          ════════════════════════════════════════════ */
          .lv-modal-root { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; }
          .lv-modal-backdrop { position: absolute; inset: 0; background: rgba(15,23,42,0.45); }
          .lv-modal-card {
            position: relative; background: #fff; border-radius: 16px; width: 420px;
            max-width: 92vw; max-height: 82vh; display: flex; flex-direction: column;
            box-shadow: 0 20px 50px rgba(15,23,42,.25); overflow: hidden;
          }
          .lv-modal-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 18px 22px; border-bottom: 1px solid #F0F0F0;
            font-size: 15px; font-weight: 800; color: #111827;
          }
          .lv-modal-close { background: #F3F4F6; border: none; border-radius: 8px; width: 30px; height: 30px; cursor: pointer; font-size: 13px; color: #6B7280; }
          .lv-modal-body { padding: 20px 22px; overflow-y: auto; font-size: 13.5px; color: #374151; line-height: 1.6; }
          .lv-modal-body p { margin: 0 0 8px; }
          .lv-modal-body hr { border: none; border-top: 1px solid #F0F0F0; margin: 14px 0; }
          .lv-modal-footer { padding: 16px 22px; border-top: 1px solid #F0F0F0; display: flex; justify-content: flex-end; gap: 10px; }
          .lv-doc-item { padding: 10px 0; border-bottom: 1px solid #F5F5F5; }
          .lv-doc-item:last-child { border-bottom: none; }
          .lv-doc-item a { color: #4F46E5; font-weight: 600; text-decoration: none; font-size: 13.5px; }
          .lv-doc-item a:hover { text-decoration: underline; }
          .lv-form-group { display: flex; flex-direction: column; gap: 6px; }
          .lv-form-group label { font-size: 12.5px; font-weight: 700; color: #374151; }
          .lv-form-group textarea {
            border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 10px 12px;
            font-size: 13px; color: #374151; min-height: 90px; resize: vertical;
            outline: none; font-family: inherit; box-sizing: border-box;
          }
          .lv-form-group textarea:focus { border-color: #4F46E5; }
          .lv-submit-btn {
            background: #4F46E5; color: #fff; border: none; border-radius: 10px;
            padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer;
          }
          .lv-submit-btn:hover { background: #4338CA; }

          .lv-warning-overlay { position: fixed; inset: 0; z-index: 1100; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; }
          .lv-warning-card {
            background: #fff; border-radius: 16px; padding: 26px 24px; width: 400px; max-width: 92vw;
            box-shadow: 0 20px 50px rgba(15,23,42,.25);
          }
          .lv-warning-card h4 { font-size: 16px; font-weight: 800; color: #111827; margin: 0 0 10px; }
          .lv-warning-card p { font-size: 13.5px; color: #475569; line-height: 1.6; margin: 0 0 8px; }
          .lv-warning-highlight { font-weight: 700; color: #DC2626 !important; }
          .lv-warning-actions { display: flex; gap: 10px; margin-top: 18px; }
          .lv-confirm-btn { flex: 1; background: #4F46E5; color: #fff; border: none; border-radius: 10px; padding: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
          .lv-cancel-btn { background: #F3F4F6; color: #374151; border: none; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home lv-page">
            <div className="breadcrum-bx">
              <ul className="breadcrumb  bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/attendance.svg" alt="Attendance Summary" />{" "}
                    Leaves Management
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="lv-topbar">
                <h5 className="lv-heading">Leaves Management</h5>

                <div className="lv-actions">
                  <select
                    className="lv-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>

                  <select
                    className="lv-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    className="lv-filter-btn"
                    onClick={() => setShowFilter(true)}
                  >
                    <i className="bi bi-funnel"></i> Filter
                  </button>

                  <button className="lv-export-btn" onClick={exportLeaves}>
                    <i className="bi bi-download"></i> Export
                  </button>
                </div>
              </div>

              <h5 className="lv-section-heading">Summary View</h5>

              {/* ================= LEAVE SUMMARY CARDS ================= */}
              <div className="lv-cards">
                <div className="lv-kpi-card">
                  <div className="lv-card blue">
                    <div className="lv-card-top">
                      <div className="lv-icon blue"><i className="bi bi-file-earmark-text"></i></div>
                      <div className="lv-card-body">
                        <div className="lv-card-value">{totalLeaves}</div>
                        <div className="lv-card-label">Total Requests</div>
                      </div>
                    </div>
                    <div className="lv-progress-track">
                      <div className="lv-progress-fill" style={{ width: "100%", background: "#2563EB" }} />
                    </div>
                  </div>
                </div>

                <div className="lv-kpi-card">
                  <div className="lv-card red">
                    <div className="lv-card-top">
                      <div className="lv-icon red"><i className="bi bi-hourglass-split"></i></div>
                      <div className="lv-card-body">
                        <div className="lv-card-value">{pendingCount}</div>
                        <div className="lv-card-label">Pending</div>
                      </div>
                    </div>
                    <div className="lv-progress-track">
                      <div className="lv-progress-fill" style={{ width: `${totalLeaves ? (pendingCount / totalLeaves) * 100 : 0}%`, background: "#DC2626" }} />
                    </div>
                  </div>
                </div>

                <div className="lv-kpi-card">
                  <div className="lv-card green">
                    <div className="lv-card-top">
                      <div className="lv-icon green"><i className="bi bi-check-circle"></i></div>
                      <div className="lv-card-body">
                        <div className="lv-card-value">{approvedCount}</div>
                        <div className="lv-card-label">Approved</div>
                      </div>
                    </div>
                    <div className="lv-progress-track">
                      <div className="lv-progress-fill" style={{ width: `${totalLeaves ? (approvedCount / totalLeaves) * 100 : 0}%`, background: "#16A34A" }} />
                    </div>
                  </div>
                </div>

                <div className="lv-kpi-card">
                  <div className="lv-card orange">
                    <div className="lv-card-top">
                      <div className="lv-icon orange"><i className="bi bi-x-circle"></i></div>
                      <div className="lv-card-body">
                        <div className="lv-card-value">{rejectedCount}</div>
                        <div className="lv-card-label">Rejected</div>
                      </div>
                    </div>
                    <div className="lv-progress-track">
                      <div className="lv-progress-fill" style={{ width: `${totalLeaves ? (rejectedCount / totalLeaves) * 100 : 0}%`, background: "#EA580C" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= LEAVE TABLE ================= */}
              <div className="lv-table-wrap">
                <table className="lv-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Date</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingLeaves ? (
                      <tr>
                        <td colSpan="7">Loading...</td>
                      </tr>
                    ) : filteredLeaves.length === 0 ? (
                      <tr>
                        <td colSpan="7">No leave requests found</td>
                      </tr>
                    ) : (
                      filteredLeaves.map((leave) => (
                        <tr key={leave._id}>
                          <td>
                            <div className="lv-emp-cell">
                              {leave.employee?.personal?.avatar
                                ? <img src={leave.employee.personal.avatar} alt="" className="lv-avatar" style={{ objectFit:"cover" }} />
                                : <div className="lv-avatar">{leave.employee?.firstName?.[0]}{leave.employee?.lastName?.[0]}</div>
                              }
                              <span className="lv-emp-name">{leave.employee?.firstName}{" "}
                              {leave.employee?.lastName}</span>
                            </div>
                          </td>

                          <td>{leave.leaveType}</td>

                          <td>
                            <div>
                              {new Date(leave.startDate).toLocaleDateString("en-IN")} →{" "}
                              {new Date(leave.endDate).toLocaleDateString("en-IN")}
                            </div>
                            {leave.createdAt && (
                              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                                Applied:{" "}
                                {new Date(leave.createdAt).toLocaleString("en-IN", {
                                  day: "2-digit", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit", hour12: true,
                                  timeZone: "Asia/Kolkata",
                                })}
                              </small>
                            )}
                          </td>

                          {/* <td>{leave.totalDays}</td> */}

                          <td>
                            <div className="lv-days-cell">
                              <strong>{leave.totalDays}</strong>

                              {leave.policyFlags?.sandwichLeave && (
                                <small className="lv-extra-days">
                                  + Weekend Deduction
                                </small>
                              )}
                            </div>
                          </td>

                          {/* <td className="reason">
                            <div>{leave.reason}</div>

                            {leave.employeeRemark && (
                              <div className="employee-remark">
                                <strong>Employee Remark:</strong>{" "}
                                {leave.employeeRemark}
                              </div>
                            )}
                          </td> */}

                          {/* <td className="reason">
                            <div
                              className={`reason-text ${
                                expandedReason === leave._id ? "expanded" : ""
                              }`}
                            >
                              {leave.reason}
                            </div>

                            {leave.reason.length > 60 && (
                              <button
                                className="reason-toggle"
                                onClick={() =>
                                  setExpandedReason(
                                    expandedReason === leave._id
                                      ? null
                                      : leave._id
                                  )
                                }
                              >
                                {expandedReason === leave._id
                                  ? "Show less"
                                  : "Read more"}
                              </button>
                            )}

                            {leave.employeeRemark && (
                              <div className="employee-remark">
                                <strong>Employee Remark:</strong>{" "}
                                {leave.employeeRemark}
                              </div>
                            )}
                          </td> */}

                          <td className="reason">
                            <button
                              className="lv-view-reason-btn"
                              onClick={() => setReasonModalData(leave)}
                            >
                              <i className="bi bi-eye"></i> View Reason
                            </button>
                          </td>

                          {/* 
                          <td>
                            <span
                              className={`status-pill ${
                                leave.status === "Pending"
                                  ? "pending"
                                  : leave.status === "Approved"
                                  ? "approved"
                                  : "rejected"
                              }`}
                            >
                              {leave.status}
                            </span>
                          </td> */}

                          <td>
                            <div className="lv-status-stack">
                              <span
                                className={`lv-status-pill ${
                                  leave.status === "Pending"
                                    ? "pending"
                                    : leave.status === "Approved"
                                    ? "approved"
                                    : "rejected"
                                }`}
                              >
                                {leave.status}
                              </span>

                              {leave.policyFlags?.sandwichLeave && (
                                <span className="lv-sandwich-badge">
                                  Sandwich Leave
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="lv-action-cell">
                            {/* VIEW DOCUMENT */}
                            {leave.documents?.length > 0 && (
                              <button
                                className="lv-view-btn"
                                onClick={() => {
                                  setSelectedDocs(leave.documents);
                                  setShowDocModal(true);
                                }}
                              >
                                View Document
                              </button>
                            )}

                            {/* ACTIONS ONLY FOR PENDING */}
                            {leave.status === "Pending" && (
                              <>
                                <button
                                  className="lv-approve-btn"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(
                                        "/api/admin/leave/approve",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          credentials: "include",
                                          body: JSON.stringify({
                                            leaveId: leave._id,
                                            remark: "", // no remark on approve
                                          }),
                                        }
                                      );

                                      const data = await res.json();

                                      if (data.success) {
                                        toast.success("Leave approved");

                                        setLeaves((prev) =>
                                          prev.map((l) =>
                                            l._id === leave._id
                                              ? { ...l, status: "Approved" }
                                              : l
                                          )
                                        );
                                      } else {
                                        toast.error(
                                          data.message || "Approve failed"
                                        );
                                      }
                                    } catch {
                                      toast.error("Server error");
                                    }
                                  }}
                                >
                                  Approve
                                </button>

                                <button
                                  className="lv-reject-btn"
                                  onClick={() => {
                                    setActionLeave(leave);
                                    setActionType("reject");
                                    setShowActionModal(true);
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showDocModal && (
        <div className="lv-modal-root">
          <div
            className="lv-modal-backdrop"
            onClick={() => setShowDocModal(false)}
          />

          <div className="lv-modal-card">
            <div className="lv-modal-header">
              <span>Supporting Documents</span>
              <button
                className="lv-modal-close"
                onClick={() => setShowDocModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="lv-modal-body">
              {selectedDocs.map((doc, idx) => (
                <div key={idx} className="lv-doc-item">
                  <a href={doc} target="_blank" rel="noreferrer">
                    📄 View Document {idx + 1}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showActionModal && (
        <div className="lv-modal-root">
          <div
            className="lv-modal-backdrop"
            onClick={() => setShowActionModal(false)}
          />

          <div className="lv-modal-card">
            <div className="lv-modal-header">
              <span>
                {actionType === "approve" ? "Approve Leave" : "Reject Leave"}
              </span>
              <button
                className="lv-modal-close"
                onClick={() => setShowActionModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="lv-modal-body">
              <div className="lv-form-group">
                <label>Admin Remark <span style={{color:"#9ca3af",fontWeight:400}}>(optional)</span></label>
                <textarea
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  placeholder="Add remark for employee (optional)"
                />
              </div>
            </div>

            <div className="lv-modal-footer">
              <button
                className="lv-submit-btn"
                onClick={async () => {
                  try {
                    const endpoint =
                      actionType === "approve"
                        ? "/api/admin/leave/approve"
                        : "/api/admin/leave/reject";

                    const res = await fetch(endpoint, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                        leaveId: actionLeave._id,
                        remark: adminRemark,
                      }),
                    });

                    const data = await res.json();

                    if (data.success) {
                      toast.success(
                        actionType === "approve"
                          ? "Leave approved"
                          : "Leave rejected"
                      );

                      setLeaves((prev) =>
                        prev.map((l) =>
                          l._id === actionLeave._id
                            ? {
                                ...l,
                                status:
                                  actionType === "approve"
                                    ? "Approved"
                                    : "Rejected",
                                adminRemark,
                              }
                            : l
                        )
                      );

                      setShowActionModal(false);
                      setAdminRemark("");
                      setActionLeave(null);
                    } else {
                      toast.error(data.message || "Action failed");
                    }
                  } catch (err) {
                    toast.error("Server error");
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showSandwichWarning && (
        <div className="lv-warning-overlay">
          <div className="lv-warning-card">
            <h4>Sandwich Leave Warning</h4>

            <p>
              This leave includes <strong>weekend days</strong>. Extra leave
              balance will be deducted.
            </p>

            <p className="lv-warning-highlight">
              Total Deduction: {actionLeave?.totalDays} days
            </p>

            <div className="lv-warning-actions">
              <button
                className="lv-confirm-btn"
                onClick={() => {
                  setShowSandwichWarning(false);
                  setShowActionModal(true);
                }}
              >
                Proceed to Approve
              </button>

              <button
                className="lv-cancel-btn"
                onClick={() => {
                  setShowSandwichWarning(false);
                  setActionLeave(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== LEAVE FILTER PANEL ===== */}
      <div
        className={`lv-filter-overlay ${showFilter ? "open" : ""}`}
        onClick={() => setShowFilter(false)}
      />
      <div className={`lv-filter-panel ${showFilter ? "open" : ""}`}>
        <div className="lv-filter-header">
          <h6>Filter Leaves</h6>
          <button className="lv-close-btn" onClick={() => setShowFilter(false)}>
            ✕
          </button>
        </div>

        <div className="lv-filter-body">
          {/* Status */}
          <div className="lv-filter-group">
            <label>Leave Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Leave Type */}
          <div className="lv-filter-group">
            <label>Leave Type</label>
            <select
              value={filters.leaveType}
              onChange={(e) =>
                setFilters({ ...filters, leaveType: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Half Day">Half Day</option>
              <option value="Paid Leave">Paid Leave</option>
            </select>
          </div>

          {/* Sandwich Leave */}
          <div className="lv-filter-group">
            <label>Sandwich Leave</label>
            <select
              value={filters.sandwich}
              onChange={(e) =>
                setFilters({ ...filters, sandwich: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="lv-filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters({ ...filters, fromDate: e.target.value })
              }
            />
          </div>

          <div className="lv-filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters({ ...filters, toDate: e.target.value })
              }
            />
          </div>
        </div>

        <div className="lv-filter-footer">
          <button className="lv-apply-btn" onClick={() => setShowFilter(false)}>
            Apply Filters
          </button>

          <button
            className="lv-reset-btn"
            onClick={() =>
              setFilters({
                status: "",
                leaveType: "",
                sandwich: "",
                fromDate: "",
                toDate: "",
              })
            }
          >
            Reset
          </button>
        </div>
      </div>

      {/* =========================== reason model ===================== */}

      {reasonModalData && (
        <div className="lv-modal-root">
          <div
            className="lv-modal-backdrop"
            onClick={() => setReasonModalData(null)}
          />

          <div className="lv-modal-card">
            <div className="lv-modal-header">
              <span>Leave Reason</span>
              <button
                className="lv-modal-close"
                onClick={() => setReasonModalData(null)}
              >
                ✕
              </button>
            </div>

            <div className="lv-modal-body">
              <p>
                <strong>Reason:</strong>
              </p>
              <p>{reasonModalData.reason}</p>

              {reasonModalData.employeeRemark && (
                <>
                  <hr />
                  <p>
                    <strong>Employee Remark:</strong>
                  </p>
                  <p>{reasonModalData.employeeRemark}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
