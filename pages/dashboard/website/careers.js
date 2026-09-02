// pages/dashboard/website/careers.js — Career Responses
// Applications submitted from the website's careers page (shared Mongo
// "applications" collection). Ported from viralon-new's
// /dashboard/career-response, restyled to the payroll design system.
import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";

const ROWS_PER_PAGE = 10;

/* ─── Reusable top stat card (same design as payroll home) ────────── */
function KpiCard({ icon, label, value, accent }) {
  return (
    <div className="kpi-card" style={{
      background: `linear-gradient(160deg, #fff 55%, ${accent.bg} 165%)`,
      borderRadius: 16, padding: "17px 18px 16px",
      border: `1px solid ${accent.bg}`, boxShadow: "0 3px 12px rgba(15,23,42,.06)",
      display: "flex", alignItems: "center", gap: 14, height: "100%",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon }} />
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0,
        background: accent.icon,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 6px 16px ${accent.shadow}`,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 19, color: "#fff" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1.05, letterSpacing: "-0.8px" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function CareerResponses() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);

  const [searchTerm, setSearchTerm]           = useState("");
  const [appliedPosition, setAppliedPosition] = useState("");
  const [dateRange, setDateRange]             = useState({ from: "", to: "" });
  const [currentPage, setCurrentPage]         = useState(1);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/careers", { credentials: "include" });
      const data = await r.json();
      if (data.success) setApplications(data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const positions = useMemo(
    () => [...new Set(applications.map(a => a.appliedPosition).filter(Boolean))],
    [applications]
  );

  /* ── Filters ── */
  const filtered = useMemo(() => {
    let result = [...applications];
    if (appliedPosition) result = result.filter(a => a.appliedPosition === appliedPosition);
    if (dateRange.from && dateRange.to) {
      const from = new Date(dateRange.from);
      const to   = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      result = result.filter(a => {
        const d = new Date(a.createdAt);
        return d >= from && d <= to;
      });
    }
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(a =>
        (a.name  || "").toLowerCase().includes(t) ||
        (a.email || "").toLowerCase().includes(t)
      );
    }
    return result;
  }, [applications, appliedPosition, dateRange, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [appliedPosition, dateRange, searchTerm]);

  const hasActiveFilters = searchTerm || appliedPosition || dateRange.from || dateRange.to;
  const clearFilters = () => { setSearchTerm(""); setAppliedPosition(""); setDateRange({ from: "", to: "" }); };

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows   = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  /* ── KPI numbers ── */
  const now = new Date();
  const thisMonth = applications.filter(a => {
    const d = new Date(a.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const last7Days = applications.filter(a => (now - new Date(a.createdAt)) < 7 * 24 * 60 * 60 * 1000).length;
  const _v = (val) => loading ? "—" : val;

  /* ── Excel export ── */
  const exportToExcel = () => {
    const exportData = filtered.map(app => ({
      Name:               app.name,
      Email:              app.email,
      Mobile:             app.mobile,
      Portfolio:          app.portfolioLink || "—",
      "Applied Position": app.appliedPosition,
      "Resume Link":      app.resumePath || "—",
      "Applied On":       new Date(app.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Applications");
    const buf  = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "career_applications.xlsx");
  };

  return (
    <section className="main-dashboard-area">
      <Head>
        <title>Careers — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .cr-table tbody tr:hover { background: #F8FAFF; }
          .cr-input:focus, .cr-select:focus { border-color: #6366F1 !important; }
        `}</style>
      </Head>

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            {/* ── Compact header (same pattern as Blogs page) ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg,#6366F1,#818CF8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 5px 14px rgba(99,102,241,.25)",
                }}>
                  <i className="bi bi-briefcase-fill" style={{ fontSize: 17, color: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>Careers</div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                    Every application submitted from the careers page, in one place.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={fetchApplications} disabled={loading} style={{
                  width: 38, height: 38, borderRadius: 10, border: "1px solid #E2E8F0",
                  background: "#fff", color: "#475569", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }} title="Refresh">
                  <i className="bi bi-arrow-clockwise" style={{ fontSize: 15 }} />
                </button>
                <button onClick={exportToExcel} disabled={loading || filtered.length === 0} style={{
                  border: "none", borderRadius: 10, padding: "9px 18px",
                  background: "linear-gradient(135deg,#6366F1,#818CF8)",
                  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  boxShadow: "0 4px 12px rgba(99,102,241,.3)",
                  opacity: (loading || filtered.length === 0) ? 0.6 : 1,
                }}>
                  <i className="bi bi-file-earmark-excel-fill" style={{ fontSize: 14 }} />
                  Export to Excel
                </button>
              </div>
            </div>

            {/* ── KPI stat cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 22, marginBottom: 26 }}>
              <KpiCard icon="bi-people-fill"         label="Total Applications" value={_v(applications.length)} accent={{ bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" }} />
              <KpiCard icon="bi-calendar-check-fill" label="This Month"         value={_v(thisMonth)}           accent={{ bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)" }} />
              <KpiCard icon="bi-clock-history"       label="Last 7 Days"        value={_v(last7Days)}           accent={{ bg: "#FFEDD5", icon: "#EA580C", shadow: "rgba(249,115,22,.18)" }} />
              <KpiCard icon="bi-briefcase-fill"      label="Open Positions"     value={_v(positions.length)}    accent={{ bg: "#F3E8FF", icon: "#9333EA", shadow: "rgba(168,85,247,.18)" }} />
            </div>

            {/* ── Filters (payroll panel style) ── */}
            <div style={{
              background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
              boxShadow: "0 2px 8px rgba(99,102,241,.06)", padding: 16, marginBottom: 14,
              display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ ...s.field, flex: "1 1 240px" }}>
                <label style={s.fieldLabel}>Search</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <i className="bi bi-search" style={{ position: "absolute", left: 12, fontSize: 13, color: "#94A3B8", pointerEvents: "none" }} />
                  <input className="cr-input" style={{ ...s.input, paddingLeft: 34, width: "100%" }}
                    placeholder="Search by name or email"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.fieldLabel}>Applied For</label>
                <select className="cr-select" style={s.input} value={appliedPosition} onChange={e => setAppliedPosition(e.target.value)}>
                  <option value="">All Positions</option>
                  {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.fieldLabel}>From Date</label>
                <input className="cr-input" type="date" style={s.input} value={dateRange.from} onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.fieldLabel}>To Date</label>
                <input className="cr-input" type="date" style={s.input} value={dateRange.to} onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))} />
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} style={{
                  height: 40, padding: "0 14px", borderRadius: 10,
                  border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>
                  Clear filters
                </button>
              )}
            </div>

            {/* ── Table (payroll panel style) ── */}
            <div style={{
              background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
              boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden", marginBottom: 14,
            }}>
              <div style={{
                padding: "14px 18px 12px", borderBottom: "1px solid #F4F4FD",
                display: "flex", alignItems: "center", gap: 9,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9, background: "#6366F118",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <i className="bi bi-person-lines-fill" style={{ fontSize: 14, color: "#6366F1" }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Applications</span>
                <span style={{
                  fontSize: 11, fontWeight: 800, background: "#EEF2FF", color: "#6366F1",
                  borderRadius: 20, padding: "2px 10px",
                }}>
                  {loading ? "…" : filtered.length}
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="cr-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["Name", "Email", "Phone", "Portfolio", "Applied For", "Resume", "Applied On"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={s.emptyCell}>Loading applications…</td></tr>
                    ) : pageRows.length === 0 ? (
                      <tr><td colSpan={7} style={s.emptyCell}>No applications found.</td></tr>
                    ) : pageRows.map(app => (
                      <tr key={app._id}>
                        <td style={{ ...s.td, fontWeight: 700, color: "#0F172A" }}>{app.name}</td>
                        <td style={{ ...s.td, color: "#64748B" }}>{app.email}</td>
                        <td style={{ ...s.td, color: "#64748B" }}>{app.mobile}</td>
                        <td style={s.td}>
                          {app.portfolioLink ? (
                            <a href={app.portfolioLink} target="_blank" rel="noopener noreferrer"
                              style={{ color: "#6366F1", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              View <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }} />
                            </a>
                          ) : <span style={{ color: "#CBD5E1" }}>—</span>}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            display: "inline-block", padding: "4px 10px", borderRadius: 999,
                            background: "#EEF2FF", color: "#6366F1", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                          }}>
                            {app.appliedPosition}
                          </span>
                        </td>
                        <td style={s.td}>
                          {app.resumePath ? (
                            <a href={encodeURI(app.resumePath)} target="_blank" rel="noopener noreferrer" download
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "5px 11px", borderRadius: 999,
                                background: "linear-gradient(135deg,#6366F1,#818CF8)", color: "#fff",
                                fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
                                boxShadow: "0 2px 6px rgba(99,102,241,.22)",
                              }}>
                              <i className="bi bi-download" style={{ fontSize: 10.5 }} /> Download
                            </a>
                          ) : <span style={{ color: "#CBD5E1" }}>—</span>}
                        </td>
                        <td style={{ ...s.td, color: "#64748B", whiteSpace: "nowrap" }}>
                          {new Date(app.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!loading && filtered.length > ROWS_PER_PAGE && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
                  padding: 16, borderTop: "1px solid #F4F4FD",
                }}>
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    style={{ ...s.pageBtn, ...(currentPage === 1 ? s.pageBtnDisabled : {}) }}>
                    <i className="bi bi-chevron-left" style={{ fontSize: 13 }} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    style={{ ...s.pageBtn, ...(currentPage === totalPages ? s.pageBtnDisabled : {}) }}>
                    <i className="bi bi-chevron-right" style={{ fontSize: 13 }} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </section>
      </div>
    </section>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}

/* ══ Styles ══ */
const s = {
  field:      { display: "flex", flexDirection: "column", gap: 6, minWidth: 150 },
  fieldLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#94A3B8" },
  input:      { height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13.5, color: "#1E293B", background: "#fff", outline: "none", boxSizing: "border-box" },
  th:         { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B", borderBottom: "1px solid #EEF0F7", whiteSpace: "nowrap" },
  td:         { padding: "13px 16px", fontSize: 13.5, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
  emptyCell:  { textAlign: "center", padding: "40px 16px", color: "#94A3B8", fontSize: 13.5 },
  pageBtn:    { width: 32, height: 32, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#6366F1,#818CF8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 3px 8px rgba(99,102,241,.25)" },
  pageBtnDisabled: { background: "#E2E8F0", color: "#94A3B8", cursor: "not-allowed", boxShadow: "none" },
};
