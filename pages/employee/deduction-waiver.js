// pages/employee/deduction-waiver.js
import Head from "next/head";
import React, { useEffect, useState, useCallback } from "react";
import Dashnav from "@/components/Dashnav";
import EmployeeLeftbar from "@/components/employee/Leftbar";
import EmployeeLeftbarMobile from "@/components/employee/LeftbarMobile";
import { toast } from "react-toastify";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

// ₹250 per late arrival after 10:10 AM — mirrors generate.js
function latePenaltyTier(count) {
  if (count === 0) return { label: "No late arrivals", penalty: 0 };
  return { label: `${count} late${count !== 1 ? "s" : ""} × ₹250/late`, penalty: count * 250 };
}

export default function EmployeeDeductionDetail() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year,  setYear]  = useState(today.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const years = Array.from({ length: 3 }, (_, i) => today.getFullYear() - i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("employeeToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res  = await fetch(`/api/employee/my-salary-report?month=${month}&year=${year}`, { headers, credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
      } else {
        toast.error("Failed to load salary data");
      }
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived values
  const ded      = report?.deductions || {};
  const perDay   = report?.basicSalary ? Math.round(report.basicSalary / 30) : 0;
  const lateTier = latePenaltyTier(report?.lateCount || 0);

  // Build deduction detail lines
  const lines = [
    report?.absentDays > 0 && {
      icon: "bi-person-x-fill", bg: "#FEE2E2", color: "#DC2626",
      label: "Absent Days",
      detail: `${report.absentDays} day${report.absentDays !== 1 ? "s" : ""} × ₹${fmt(perDay)}/day`,
      amount: ded.absent || 0,
    },
    report?.halfDayCount > 0 && {
      icon: "bi-calendar-half", bg: "#DBEAFE", color: "#1D4ED8",
      label: "Half Days",
      detail: `${report.halfDayCount} half-day${report.halfDayCount !== 1 ? "s" : ""} × ₹${fmt(Math.round(perDay / 2))}/half-day`,
      amount: ded.halfDay || 0,
    },
    (report?.lateCount || 0) > 0 && {
      icon: "bi-alarm-fill", bg: "#FEF3C7", color: "#D97706",
      label: "Late Arrivals",
      detail: lateTier.label,
      amount: ded.late || 0,
    },
    (ded.lunch || 0) > 0 && {
      icon: "bi-cup-hot-fill", bg: "#FDF4FF", color: "#A21CAF",
      label: "Lunch Overrun",
      detail: "Exceeded 1-hour lunch break",
      amount: ded.lunch || 0,
    },
    (ded.unpaidLeave || 0) > 0 && {
      icon: "bi-calendar-x-fill", bg: "#ECFDF5", color: "#059669",
      label: "Unpaid Leave",
      detail: "Leave taken without pay balance",
      amount: ded.unpaidLeave || 0,
    },
    (ded.other || 0) > 0 && {
      icon: "bi-dash-circle-fill", bg: "#F3F4F6", color: "#6B7280",
      label: "Other Deduction",
      detail: "Manual adjustment by admin",
      amount: ded.other || 0,
    },
  ].filter(Boolean);

  const summaryCards = report ? [
    { label: "Basic Salary",     value: `₹${fmt(report.basicSalary)}`,        icon: "bi-wallet2",          bg: "#EEF2FF", color: "#4F46E5" },
    { label: "Earned Salary",    value: `₹${fmt(report.earnedSalary)}`,        icon: "bi-graph-up",         bg: "#F0FDF4", color: "#15803D" },
    { label: "Total Deductions", value: `₹${fmt(ded.total)}`,                  icon: "bi-dash-circle-fill", bg: "#FEE2E2", color: "#DC2626" },
    { label: "Net Pay",          value: `₹${fmt(report.netPay)}`,              icon: "bi-cash-stack",       bg: "#ECFDF5", color: "#059669" },
  ] : [];

  return (
    <section className="over-time-area">
      <Head>
        <title>My Deduction Details</title>
        <style>{`
          .dd-card  { background:#fff; border-radius:16px; border:1px solid #F1F5F9; box-shadow:0 1px 8px rgba(0,0,0,.05); }
          .dd-row   { display:flex; align-items:center; gap:14px; padding:16px 20px;
                      border-bottom:1px solid #F8FAFC; }
          .dd-row:last-child { border-bottom:none; }
          .dd-empty { text-align:center; padding:52px 20px; color:#9CA3AF; }
          .dd-select { padding:7px 12px; border-radius:9px; border:1.5px solid #E5E7EB;
                       font-size:13px; font-weight:600; background:#fff; cursor:pointer; }
          .dd-select:focus { outline:none; border-color:#818CF8; }
          .dd-summary-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:20px; }
          .dd-summary-card { display:flex; align-items:center; gap:12px; padding:16px 18px; }
          .dd-info-box { background:#EEF2FF; border:1.5px solid #C7D2FE; border-radius:12px;
                         padding:14px 18px; display:flex; align-items:flex-start; gap:10px; }
          .dd-attendance-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(100px,1fr)); gap:10px; margin-bottom:20px; }
          .dd-att-card { background:#fff; border-radius:12px; border:1px solid #F1F5F9;
                         box-shadow:0 1px 6px rgba(0,0,0,.05); padding:14px 16px; text-align:center; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <EmployeeLeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="container-fluid" >

              {/* Page title */}
              <div style={{ marginBottom: 22 }}>
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: 22, color: "#111827" }}>My Salary Deductions</h4>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6B7280" }}>
                  Detailed breakdown of deductions applied to your salary
                </p>
              </div>

              {/* Month / year picker */}
              <div className="dd-card" style={{ display: "flex", gap: 10, padding: "14px 20px", marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                <i className="bi bi-calendar3" style={{ color: "#6366F1", fontSize: 15 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Period:</span>
                <select className="dd-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="dd-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {loading ? (
                <div className="dd-card dd-empty">
                  <div className="spinner-border text-primary" />
                  <p style={{ marginTop: 12 }}>Loading salary data…</p>
                </div>
              ) : !report ? (
                <div className="dd-card dd-empty">
                  <i className="bi bi-file-earmark-x" style={{ fontSize: 52, color: "#D1D5DB" }} />
                  <p style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: "#374151" }}>
                    No salary report for {MONTHS[month]} {year}
                  </p>
                  <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>
                    Payroll hasn't been generated yet. Check back after admin processes it.
                  </p>
                </div>
              ) : (
                <>
                  {/* Salary summary */}
                  <div className="dd-summary-grid">
                    {summaryCards.map(s => (
                      <div key={s.label} className="dd-card dd-summary-card">
                        <div style={{ width: 42, height: 42, borderRadius: 11, background: s.bg,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className={`bi ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{s.value}</div>
                          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Attendance summary */}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".05em" }}>
                      Attendance Summary — {MONTHS[month]} {year}
                    </span>
                  </div>
                  <div className="dd-attendance-grid">
                    {[
                      { label: "Present Days",  value: report.presentDays  || 0, icon: "bi-check-circle-fill", color: "#15803D", bg: "#DCFCE7" },
                      { label: "Absent Days",   value: report.absentDays   || 0, icon: "bi-x-circle-fill",     color: "#DC2626", bg: "#FEE2E2" },
                      { label: "Half Days",     value: report.halfDayCount || 0, icon: "bi-calendar-half",     color: "#1D4ED8", bg: "#DBEAFE" },
                      { label: "Late Arrivals", value: report.lateCount    || 0, icon: "bi-alarm-fill",        color: "#D97706", bg: "#FEF3C7" },
                    ].map(a => (
                      <div key={a.label} className="dd-att-card">
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: a.bg,
                          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                          <i className={`bi ${a.icon}`} style={{ fontSize: 16, color: a.color }} />
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{a.value}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{a.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Deduction breakdown */}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".05em" }}>
                      Deduction Breakdown
                    </span>
                  </div>

                  <div className="dd-card" style={{ overflow: "hidden", marginBottom: 20 }}>
                    {lines.length === 0 ? (
                      <div className="dd-empty">
                        <i className="bi bi-check-circle" style={{ fontSize: 44, color: "#22C55E" }} />
                        <p style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: "#374151" }}>
                          No deductions this month!
                        </p>
                        <p style={{ fontSize: 13, color: "#9CA3AF" }}>Your full earned salary will be paid.</p>
                      </div>
                    ) : (
                      <>
                        {lines.map((line, idx) => (
                          <div key={idx} className="dd-row">
                            {/* Icon */}
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: line.bg,
                              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <i className={`bi ${line.icon}`} style={{ fontSize: 18, color: line.color }} />
                            </div>

                            {/* Label + detail */}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{line.label}</div>
                              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{line.detail}</div>
                            </div>

                            {/* Amount */}
                            <div style={{ fontWeight: 800, fontSize: 18, color: "#DC2626", flexShrink: 0 }}>
                              −₹{fmt(line.amount)}
                            </div>
                          </div>
                        ))}

                        {/* Total deductions row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "14px 20px", background: "#FFF5F5", borderTop: "2px solid #FEE2E2" }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#374151" }}>Total Deductions</span>
                          <span style={{ fontWeight: 800, fontSize: 20, color: "#DC2626" }}>−₹{fmt(ded.total)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Contact admin note */}
                  <div className="dd-info-box">
                    <i className="bi bi-info-circle-fill" style={{ fontSize: 16, color: "#4F46E5", flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: "#3730A3", lineHeight: 1.6 }}>
                      <strong>Dispute a deduction?</strong> Contact your HR admin directly. Admin can review and waive
                      any deduction on your behalf. Approved waivers will reflect in the next salary generation.
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
