// pages/dashboard/admin/deduction-waiver.js
import Head from "next/head";
import React, { useEffect, useState, useCallback } from "react";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { toast } from "react-toastify";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DEDUCTION_LINES = [
  { key: "absent",      label: "Absent Days",  icon: "bi-person-x-fill",    color: "#DC2626", bg: "#FEE2E2" },
  { key: "halfDay",     label: "Half Day",     icon: "bi-calendar-half",    color: "#1D4ED8", bg: "#DBEAFE" },
  { key: "late",        label: "Late Penalty", icon: "bi-alarm-fill",       color: "#D97706", bg: "#FEF3C7" },
  { key: "lunch",       label: "Lunch Penalty",icon: "bi-cup-hot-fill",     color: "#A21CAF", bg: "#FDF4FF" },
  { key: "unpaidLeave", label: "Unpaid Leave", icon: "bi-calendar-x-fill",  color: "#059669", bg: "#ECFDF5" },
  { key: "other",       label: "Other",        icon: "bi-dash-circle-fill", color: "#6B7280", bg: "#F3F4F6" },
];


const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const empName = (e) => e ? `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email || "—" : "—";
const getInitials = (name) => name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();
const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],
];
const avatarBg = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function AdminDeductionWaiver() {
  const today = new Date();
  const [month,        setMonth]        = useState(today.getMonth());
  const [year,         setYear]         = useState(today.getFullYear());
  const [reports,      setReports]      = useState([]);
  const [waivers,      setWaivers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [processing,   setProcessing]   = useState(null);
  const [overrideModal,setOverrideModal]= useState(null); // { empId, empName, key, label, amount }
  const [remark,       setRemark]       = useState("");
  const [search,       setSearch]       = useState("");
  const [expandedId,   setExpandedId]   = useState(null);

  const years = Array.from({ length: 3 }, (_, i) => today.getFullYear() - i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/deduction-waiver/report?month=${month}&year=${year}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
        setWaivers(data.waivers || []);
      } else toast.error("Failed to load data");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Admin directly waives a deduction
  const handleOverride = async () => {
    if (!overrideModal) return;
    setProcessing(`override_${overrideModal.empId}_${overrideModal.key}`);
    try {
      const res  = await fetch("/api/admin/deduction-waiver/override", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId:    overrideModal.empId,
          month,
          year,
          deductionType: overrideModal.key,
          amount:        overrideModal.amount,
          adminRemark:   remark || "Waived by admin",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${overrideModal.label} deduction waived for ${overrideModal.empName}`);
        setOverrideModal(null); setRemark(""); fetchData();
      } else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setProcessing(null); }
  };

  // Build waiver lookup: "empId_deductionType" → waiver doc
  const waiverMap = {};
  waivers.forEach(w => {
    const empId = w.employee?._id?.toString() || "";
    waiverMap[`${empId}_${w.deductionType}`] = w;
  });

  const filteredReports = reports.filter(r => {
    if (!search.trim()) return true;
    const name = empName(r.employee).toLowerCase();
    const id   = (r.employee?.employeeId || "").toLowerCase();
    return name.includes(search.toLowerCase()) || id.includes(search.toLowerCase());
  });

  const totalDeductionAllEmp = reports.reduce((s, r) => s + (r.deductions?.total || 0), 0);
  const totalWaivedAllEmp    = waivers.filter(w => w.status === "Approved").reduce((s, w) => s + (w.amount || 0), 0);
  const withDeductions       = reports.filter(r => (r.deductions?.total || 0) > 0).length;

  const STATS = [
    { label: "Employees",          value: reports.length,                  icon: "bi-people-fill",          color: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE" },
    { label: "Total Deductions",   value: `₹${fmt(totalDeductionAllEmp)}`, icon: "bi-dash-circle-fill",     color: "#DC2626", bg: "#FEE2E2", border: "#FECACA" },
    { label: "With Deductions",    value: withDeductions,                  icon: "bi-person-exclamation",   color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
    { label: "Total Waived",       value: `₹${fmt(totalWaivedAllEmp)}`,    icon: "bi-shield-check-fill",    color: "#15803D", bg: "#DCFCE7", border: "#BBF7D0" },
  ];

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Deduction Waivers — Admin</title>
        <style>{`
        .dw-card  { background:#fff; border-radius:16px; border:1px solid #F1F5F9; box-shadow:0 1px 8px rgba(0,0,0,.06); }
        .dw-badge { display:inline-flex; align-items:center; gap:4px;
                    padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
        .dw-chip  { display:inline-flex; align-items:center; gap:4px;
                    padding:3px 8px; border-radius:7px; font-size:11px; font-weight:700; }
        .dw-row   { padding:16px 20px; border-bottom:1px solid #F8FAFC; transition:background .12s; }
        .dw-row:last-child { border-bottom:none; }
        .dw-btn   { border:none; cursor:pointer; border-radius:9px; padding:6px 13px;
                    font-size:12px; font-weight:700; transition:all .15s; display:inline-flex; align-items:center; gap:4px; }
        .dw-btn:disabled { opacity:.5; cursor:default; }
        .dw-btn:hover:not(:disabled) { filter:brightness(0.93); transform:translateY(-1px); }
        .dw-tab   { padding:7px 18px; border-radius:10px; border:none; cursor:pointer;
                    font-size:13px; font-weight:700; transition:all .15s; }
        .dw-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5);
                      z-index:1050; display:flex; align-items:center; justify-content:center; padding:16px; }
        .dw-modal { background:#fff; border-radius:20px; width:100%; max-width:460px;
                    box-shadow:0 24px 64px rgba(0,0,0,.2); overflow:hidden; }
        .dw-ded-row { display:flex; justify-content:space-between; align-items:center;
                      padding:11px 0; border-bottom:1px solid #F3F4F6; gap:10px; }
        .dw-ded-row:last-child { border-bottom:none; }
        .dw-expand-btn { background:none; border:none; cursor:pointer; color:#9CA3AF;
                         font-size:13px; padding:4px 8px; border-radius:7px; transition:background .12s; }
        .dw-expand-btn:hover { background:#F3F4F6; color:#374151; }
        .dw-empty { text-align:center; padding:52px 20px; color:#9CA3AF; }
        .dw-stat-card { display:flex; align-items:center; gap:14px; padding:18px 20px;
                        border-radius:16px; border:1.5px solid; cursor:default; }
        .override-btn { background:linear-gradient(135deg,#818CF8,#6366F1); color:#fff; }
        .override-btn:hover:not(:disabled) { background:linear-gradient(135deg,#6366F1,#4F46E5); }
      `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <Leftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="container-fluid" style={{ padding: "24px 20px" }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: 22 }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: 22, color: "#111827" }}>Deduction Waivers</h4>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6B7280" }}>
                Review deductions, approve employee requests, or override any deduction directly
              </p>
            </div>

            {/* ── Stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
              {STATS.map(s => (
                <div key={s.label} className="dw-stat-card" style={{ background: s.bg, borderColor: s.border }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize: 20, color: s.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, fontWeight: 500 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filters + Tabs ── */}
            <div className="dw-card" style={{ padding: "13px 18px", marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <select value={month} onChange={e => setMonth(Number(e.target.value))}
                style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid #E5E7EB", fontSize: 13, fontWeight: 600, cursor:"pointer" }}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid #E5E7EB", fontSize: 13, fontWeight: 600, cursor:"pointer" }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search employee…"
                style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 13, minWidth: 180 }}
              />
            </div>

            {/* ── All Deductions ── */}
            <div className="dw-card" style={{ overflow: "hidden" }}>
                {loading ? (
                  <div className="dw-empty"><div className="spinner-border text-primary" /><p style={{ marginTop: 12 }}>Loading…</p></div>
                ) : filteredReports.length === 0 ? (
                  <div className="dw-empty">
                    <i className="bi bi-file-earmark-x" style={{ fontSize: 48, color: "#D1D5DB" }} />
                    <p style={{ marginTop: 12, fontSize: 15 }}>No salary reports for {MONTHS[month]} {year}</p>
                    <p style={{ fontSize: 13, color:"#9CA3AF" }}>Generate payroll first to see deduction data.</p>
                  </div>
                ) : filteredReports.map(r => {
                  const name    = empName(r.employee);
                  const inits   = getInitials(name);
                  const [abg, acol] = avatarBg(name);
                  const deductions  = r.deductions || {};
                  const activeLines = DEDUCTION_LINES.filter(l => (deductions[l.key] || 0) > 0);
                  const empId       = r.employee?._id?.toString() || "";
                  const empWaivers  = waivers.filter(w => w.employee?._id?.toString() === empId);
                  const isExpanded  = expandedId === r._id;
                  const hasWaived   = empWaivers.some(w => w.status === "Approved");

                  return (
                    <div key={r._id} className="dw-row">
                      {/* ── Employee row header ── */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                        onClick={() => setExpandedId(isExpanded ? null : r._id)}>

                        <div style={{ width: 44, height: 44, borderRadius: 12, background: abg, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: acol }}>
                          {inits}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{name}</span>
                            {r.employee?.employeeId && (
                              <span style={{ fontSize: 11, color: "#9CA3AF", background: "#F3F4F6", padding: "2px 7px", borderRadius: 6, fontWeight: 600 }}>
                                #{r.employee.employeeId}
                              </span>
                            )}
                            {hasWaived && (
                              <span className="dw-badge" style={{ background: "#DCFCE7", color: "#15803D" }}>
                                <i className="bi bi-shield-check-fill" style={{ fontSize: 9 }} />
                                Waiver active
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                              Net Pay: <strong style={{ color: "#15803D" }}>₹{fmt(r.netPay)}</strong>
                            </span>
                            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                              Deductions: <strong style={{ color: "#DC2626" }}>₹{fmt(deductions.total)}</strong>
                            </span>
                            {(deductions.waived || 0) > 0 && (
                              <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                                Waived: <strong style={{ color: "#15803D" }}>₹{fmt(deductions.waived)}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <button className="dw-expand-btn">
                          <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`} style={{ fontSize: 14 }} />
                        </button>
                      </div>

                      {/* ── Expanded deduction breakdown ── */}
                      {isExpanded && (
                        <div style={{ marginTop: 14, paddingLeft: 56, paddingRight: 4 }}>
                          {activeLines.length === 0 ? (
                            <p style={{ fontSize: 13, color: "#9CA3AF" }}>No deductions applied this month.</p>
                          ) : activeLines.map(line => {
                            const amount   = deductions[line.key] || 0;
                            const waiver   = waiverMap[`${empId}_${line.key}`];
                            const isWaived = waiver?.status === "Approved";
                            const procKey  = `override_${empId}_${line.key}`;

                            return (
                              <div key={line.key} className="dw-ded-row">
                                {/* Left: type icon + label */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: 9, background: line.bg, flexShrink: 0,
                                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <i className={`bi ${line.icon}`} style={{ fontSize: 15, color: line.color }} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{line.label}</div>
                                    {isWaived && (
                                      <span className="dw-badge" style={{ background: "#DCFCE7", color: "#15803D", marginTop: 3 }}>
                                        <i className="bi bi-shield-check-fill" style={{ fontSize: 9 }} /> Waived by admin
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right: amount + action buttons */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                  <span style={{ fontWeight: 800, fontSize: 15, color: isWaived ? "#9CA3AF" : "#DC2626",
                                    textDecoration: isWaived ? "line-through" : "none" }}>
                                    ₹{fmt(amount)}
                                  </span>

                                  {/* No waiver yet — Waive button */}
                                  {!isWaived && (
                                    <button className="dw-btn override-btn"
                                      disabled={processing === procKey}
                                      onClick={() => { setOverrideModal({ empId, empName: name, key: line.key, label: line.label, amount }); setRemark(""); }}>
                                      {processing === procKey
                                        ? <span className="spinner-border spinner-border-sm" />
                                        : <><i className="bi bi-shield-check" /> Waive</>}
                                    </button>
                                  )}

                                  {/* Already waived */}
                                  {isWaived && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#15803D", fontWeight: 700 }}>
                                      <i className="bi bi-check-circle-fill" style={{ fontSize: 13 }} />
                                      Waived
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </section>
        </div>
      </div>

      {/* ══════════════════════════════════
          ADMIN OVERRIDE MODAL
      ══════════════════════════════════ */}
      {overrideModal && (
        <div className="dw-overlay" onClick={() => setOverrideModal(null)}>
          <div className="dw-modal" onClick={e => e.stopPropagation()}>
            <div style={{ background: "linear-gradient(135deg,#818CF8,#6366F1)", padding: "22px 26px" }}>
              <i className="bi bi-shield-check-fill" style={{ fontSize: 32, color: "#fff", display: "block", marginBottom: 8 }} />
              <h5 style={{ margin: 0, color: "#fff", fontWeight: 800 }}>Admin Waiver Override</h5>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.85)", fontSize: 13 }}>
                Waive this deduction directly — no employee request needed
              </p>
            </div>
            <div style={{ padding: "22px 26px" }}>
              <div style={{ background: "#EEF2FF", borderRadius: 12, padding: "13px 16px", marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{overrideModal.empName}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{overrideModal.label} deduction</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#DC2626" }}>₹{fmt(overrideModal.amount)}</div>
                </div>
              </div>

              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "11px 14px", marginBottom: 18 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
                  <i className="bi bi-info-circle-fill" style={{ marginRight: 5, verticalAlign: "middle" }} />
                  This will immediately mark the deduction as <strong>waived</strong>. The amount will be excluded when salary is next generated for {MONTHS[month]} {year}.
                </p>
              </div>

              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5 }}>
                Reason / note (optional)
              </label>
              <textarea rows={3} value={remark} onChange={e => setRemark(e.target.value)}
                placeholder="E.g. Approved by management, special case, medical emergency…"
                style={{ width: "100%", borderRadius: 10, border: "1.5px solid #E5E7EB", padding: "10px 12px",
                  fontSize: 13, resize: "none", boxSizing: "border-box", outline: "none" }} />

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="dw-btn" onClick={() => setOverrideModal(null)}
                  style={{ flex: 1, background: "#F3F4F6", color: "#374151", padding: "10px" }}>Cancel</button>
                <button className="dw-btn override-btn"
                  disabled={processing === `override_${overrideModal.empId}_${overrideModal.key}`}
                  onClick={handleOverride}
                  style={{ flex: 2, padding: "10px", fontSize: 13 }}>
                  {processing === `override_${overrideModal.empId}_${overrideModal.key}`
                    ? <span className="spinner-border spinner-border-sm" />
                    : <><i className="bi bi-shield-check" /> Waive Deduction</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
