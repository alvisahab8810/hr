// pages/dashboard/admin/former-employees.js
import Head from "next/head";
import Link from "next/link";
import React, { useState, useEffect, useMemo } from "react";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import { toast } from "react-toastify";

const EXIT_META = {
  Resigned: { bg:"#FEF3C7", color:"#B45309", icon:"bi-door-open-fill" },
  Fired:    { bg:"#FEE2E2", color:"#DC2626", icon:"bi-x-circle-fill"  },
  Retired:  { bg:"#EEF2FF", color:"#4F46E5", icon:"bi-award-fill"     },
  Other:    { bg:"#F3F4F6", color:"#6B7280", icon:"bi-three-dots"     },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

function empName(e) {
  const fn = e.personal?.firstName || e.firstName || "";
  const ln = e.personal?.lastName  || e.lastName  || "";
  return `${fn} ${ln}`.trim() || e.email || "—";
}

export default function FormerEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterExit, setFilterExit] = useState("");
  const [selected, setSelected]   = useState(null);  // drawer
  const [reactivating, setReactivating] = useState(null);
  const [confirmReactivate, setConfirmReactivate] = useState(null);

  useEffect(() => {
    fetch("/api/admin/employees/former")
      .then(r => r.json())
      .then(d => { if (d.success) setEmployees(d.employees); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (filterExit && e.exitStatus !== filterExit) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          empName(e).toLowerCase().includes(q) ||
          e.professional?.employeeId?.toLowerCase().includes(q) ||
          e.professional?.department?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, search, filterExit]);

  const handleReactivate = async (emp) => {
    setReactivating(emp._id);
    try {
      const res  = await fetch(`/api/admin/employees/reactivate/${emp._id}`, { method:"POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setEmployees(prev => prev.filter(e => e._id !== emp._id));
      if (selected?._id === emp._id) setSelected(null);
      toast.success(`${empName(emp)} reactivated and moved back to active employees`);
    } catch (err) {
      toast.error(err.message || "Failed to reactivate");
    } finally {
      setReactivating(null);
      setConfirmReactivate(null);
    }
  };

  // stats
  const byStatus = useMemo(() => {
    const map = {};
    employees.forEach(e => { map[e.exitStatus] = (map[e.exitStatus] || 0) + 1; });
    return map;
  }, [employees]);

  return (
    <div>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
          @keyframes spin { to { transform:rotate(360deg); } }
          .fe-row:hover { background:#F9FAFB; cursor:pointer; }
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
                <Link href="/dashboard/admin/employee-management">
                  <i className="bi bi-people-fill" style={{ marginRight:6 }} />Employee Management
                </Link>
              </li>
              <li className="breadcrumb-item active" style={{ color:"#6B7280" }}>Former Employees</li>
            </ul>
          </div>

          <div className="block-header" style={{ padding:"0 20px 40px", minHeight:"90vh" }}>

            {/* Page header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <div>
                <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", margin:0 }}>Former Employees</h2>
                <p style={{ fontSize:13, color:"#9CA3AF", margin:"4px 0 0" }}>All resigned, fired, and retired employees — data is fully preserved</p>
              </div>
              <Link href="/dashboard/admin/employee-management" style={{
                display:"flex", alignItems:"center", gap:6,
                background:"#F3F4F6", border:"1.5px solid #E5E7EB", borderRadius:10,
                padding:"9px 16px", fontSize:13, fontWeight:700, color:"#374151", textDecoration:"none",
              }}>
                <i className="bi bi-arrow-left" /> Back to Active
              </Link>
            </div>

            {/* Stats row */}
            <div style={{ display:"flex", gap:12, marginBottom:22, flexWrap:"wrap" }}>
              {[
                { label:"Total Former", value:employees.length, bg:"#F3F4F6", color:"#374151", icon:"bi-person-x-fill" },
                { label:"Resigned",     value:byStatus.Resigned||0, bg:"#FEF3C7", color:"#B45309", icon:"bi-door-open-fill" },
                { label:"Fired",        value:byStatus.Fired||0,    bg:"#FEE2E2", color:"#DC2626", icon:"bi-x-circle-fill" },
                { label:"Retired",      value:byStatus.Retired||0,  bg:"#EEF2FF", color:"#4F46E5", icon:"bi-award-fill"   },
              ].map(s => (
                <div key={s.label} style={{ background:"#fff", borderRadius:14, padding:"16px 18px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 1px 6px rgba(0,0,0,0.07)", minWidth:140 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize:18, color:s.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize:22, fontWeight:800, color:"#111827" }}>{s.value}</div>
                    <div style={{ fontSize:11, color:"#9CA3AF" }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              <div style={{ position:"relative", flex:"1 1 240px" }}>
                <i className="bi bi-search" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF", fontSize:13 }} />
                <input
                  placeholder="Search name, ID, department…"
                  style={{ width:"100%", padding:"9px 12px 9px 32px", fontSize:13, borderRadius:9, border:"1.5px solid #E5E7EB", outline:"none", boxSizing:"border-box" }}
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select value={filterExit} onChange={e => setFilterExit(e.target.value)}
                style={{ padding:"9px 12px", fontSize:13, borderRadius:9, border:"1.5px solid #E5E7EB", outline:"none", background:"#fff" }}>
                <option value="">All Reasons</option>
                {["Resigned","Fired","Retired","Other"].map(s => <option key={s}>{s}</option>)}
              </select>
              {(search || filterExit) && (
                <button onClick={() => { setSearch(""); setFilterExit(""); }}
                  style={{ background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:9, padding:"9px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  <i className="bi bi-x-lg" /> Clear
                </button>
              )}
            </div>

            {/* Table */}
            <div style={{ display:"flex", gap:16 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 6px rgba(0,0,0,0.07)", overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ background:"#F9FAFB", borderBottom:"1.5px solid #F3F4F6" }}>
                        {["Employee","ID","Department","Last Date","Reason","Exit Notes","Action"].map(h => (
                          <th key={h} style={{ padding:"12px 14px", fontWeight:700, fontSize:12, color:"#6B7280", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="7" style={{ textAlign:"center", padding:"50px", color:"#9CA3AF" }}>
                          <div style={{ width:36, height:36, border:"3px solid #4F46E5", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .9s linear infinite", margin:"0 auto 10px" }} />
                          Loading…
                        </td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign:"center", padding:"60px 20px" }}>
                          <i className="bi bi-person-x" style={{ fontSize:44, color:"#E5E7EB", display:"block", marginBottom:10 }} />
                          <span style={{ color:"#9CA3AF", fontSize:13 }}>
                            {employees.length === 0 ? "No former employees yet" : "No results match your search"}
                          </span>
                        </td></tr>
                      ) : filtered.map(emp => {
                        const meta = EXIT_META[emp.exitStatus] || EXIT_META.Other;
                        const name = empName(emp);
                        const initials = name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0,2).toUpperCase();
                        return (
                          <tr key={emp._id} className="fe-row" onClick={() => setSelected(emp)}
                            style={{ borderBottom:"1px solid #F3F4F6" }}>
                            <td style={{ padding:"12px 14px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#E5E7EB,#D1D5DB)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#6B7280", flexShrink:0 }}>
                                  {initials}
                                </div>
                                <div>
                                  <div style={{ fontWeight:700, color:"#374151" }}>{name}</div>
                                  <div style={{ fontSize:11, color:"#9CA3AF" }}>{emp.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding:"12px 14px" }}>
                              <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:"#6B7280", background:"#F3F4F6", borderRadius:5, padding:"2px 6px" }}>
                                {emp.professional?.employeeId || "—"}
                              </span>
                            </td>
                            <td style={{ padding:"12px 14px", color:"#374151" }}>{emp.professional?.department || "—"}</td>
                            <td style={{ padding:"12px 14px", color:"#374151", whiteSpace:"nowrap" }}>{fmtDate(emp.exitDate)}</td>
                            <td style={{ padding:"12px 14px" }}>
                              {emp.exitStatus && (
                                <span style={{ background:meta.bg, color:meta.color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", gap:4 }}>
                                  <i className={`bi ${meta.icon}`} />{emp.exitStatus}
                                </span>
                              )}
                            </td>
                            <td style={{ padding:"12px 14px", color:"#9CA3AF", fontSize:12, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {emp.exitReason || "—"}
                            </td>
                            <td style={{ padding:"12px 14px" }}>
                              <div style={{ display:"flex", gap:6 }}>
                                <button onClick={e => { e.stopPropagation(); setSelected(emp); }}
                                  style={{ background:"#EEF2FF", color:"#4F46E5", border:"1.5px solid #C7D2FE", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                                  <i className="bi bi-eye-fill" /> View
                                </button>
                                <button onClick={e => { e.stopPropagation(); setConfirmReactivate(emp); }}
                                  style={{ background:"#D1FAE5", color:"#065F46", border:"1.5px solid #A7F3D0", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                                  <i className="bi bi-arrow-counterclockwise" /> Reactivate
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop:10, fontSize:12, color:"#9CA3AF", textAlign:"right" }}>
                  {filtered.length} former employee{filtered.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* ── SIDE DRAWER ──────────────────────────────────────── */}
              {selected && (
                <>
                  <div onClick={() => setSelected(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.15)", zIndex:1040 }} />
                  <div style={{
                    position:"fixed", top:0, right:0, bottom:0, width:400,
                    background:"#fff", boxShadow:"-4px 0 30px rgba(0,0,0,0.12)",
                    zIndex:1041, overflowY:"auto",
                    animation:"slideIn .25s cubic-bezier(0.22,1,0.36,1)",
                  }}>
                    {/* Header */}
                    <div style={{ background:"linear-gradient(135deg,#374151,#6B7280)", padding:"20px 22px" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                        <div>
                          <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff", marginBottom:10 }}>
                            {empName(selected).split(" ").filter(Boolean).map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <h3 style={{ color:"#fff", fontWeight:800, fontSize:17, margin:0 }}>{empName(selected)}</h3>
                          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12, marginTop:3 }}>
                            {selected.professional?.designation || ""}{selected.professional?.department ? ` · ${selected.professional.department}` : ""}
                          </div>
                        </div>
                        <button onClick={() => setSelected(null)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, color:"#fff", padding:"6px 10px", cursor:"pointer", fontSize:14 }}>
                          <i className="bi bi-x-lg" />
                        </button>
                      </div>
                      {selected.exitStatus && (
                        <span style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:5, background:EXIT_META[selected.exitStatus]?.bg, color:EXIT_META[selected.exitStatus]?.color, borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:700 }}>
                          <i className={`bi ${EXIT_META[selected.exitStatus]?.icon}`} />{selected.exitStatus}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ padding:"14px 22px", borderBottom:"1px solid #F3F4F6" }}>
                      <button onClick={() => setConfirmReactivate(selected)}
                        style={{ display:"flex", alignItems:"center", gap:6, background:"#D1FAE5", color:"#065F46", border:"1.5px solid #A7F3D0", borderRadius:9, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        <i className="bi bi-arrow-counterclockwise" /> Reactivate Employee
                      </button>
                    </div>

                    {/* Details */}
                    <div style={{ padding:"16px 22px" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>Exit Information</div>
                      {[
                        ["Exit Reason", selected.exitStatus],
                        ["Last Working Date", fmtDate(selected.exitDate)],
                        ["Notes", selected.exitReason],
                      ].filter(([,v]) => v).map(([label, val]) => (
                        <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F3F4F6", gap:12 }}>
                          <span style={{ fontSize:12, color:"#9CA3AF", fontWeight:500 }}>{label}</span>
                          <span style={{ fontSize:13, fontWeight:600, color:"#111827", textAlign:"right" }}>{val}</span>
                        </div>
                      ))}

                      <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:0.8, margin:"16px 0 10px" }}>Employee Details</div>
                      {[
                        ["Employee ID",  selected.professional?.employeeId],
                        ["Department",   selected.professional?.department],
                        ["Designation",  selected.professional?.designation],
                        ["Status",       selected.professional?.status],
                        ["Email",        selected.email],
                        ["Mobile",       selected.personal?.mobile],
                        ["Date of Joining", fmtDate(selected.professional?.dateOfJoining)],
                        ["Joined Platform", fmtDate(selected.createdAt)],
                        ["Monthly Salary", selected.salary?.monthlySalary ? `₹${Number(selected.salary.monthlySalary).toLocaleString("en-IN")}` : null],
                      ].filter(([,v]) => v).map(([label, val]) => (
                        <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F3F4F6", gap:12 }}>
                          <span style={{ fontSize:12, color:"#9CA3AF", fontWeight:500 }}>{label}</span>
                          <span style={{ fontSize:13, fontWeight:600, color:"#111827", textAlign:"right", wordBreak:"break-all" }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Reactivate confirm modal */}
      {confirmReactivate && (
        <div style={{ position:"fixed", inset:0, zIndex:1060, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={() => setConfirmReactivate(null)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)" }} />
          <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", padding:"26px" }}>
            <div style={{ width:50, height:50, borderRadius:13, background:"#D1FAE5", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
              <i className="bi bi-arrow-counterclockwise" style={{ fontSize:22, color:"#059669" }} />
            </div>
            <h3 style={{ fontSize:16, fontWeight:800, color:"#111827", marginBottom:6 }}>Reactivate Employee?</h3>
            <p style={{ fontSize:13, color:"#6B7280", marginBottom:20 }}>
              <strong>{empName(confirmReactivate)}</strong> will be moved back to the active employee list and will be able to log in again.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setConfirmReactivate(null)}
                style={{ background:"#F3F4F6", border:"none", borderRadius:9, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={() => handleReactivate(confirmReactivate)} disabled={reactivating === confirmReactivate._id}
                style={{ background:"#059669", color:"#fff", border:"none", borderRadius:9, padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {reactivating === confirmReactivate._id ? "Reactivating…" : <><i className="bi bi-arrow-counterclockwise" style={{ marginRight:5 }} />Confirm Reactivate</>}
              </button>
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
