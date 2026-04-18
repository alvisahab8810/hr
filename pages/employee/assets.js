// pages/employee/assets.js
import Head from "next/head";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import EmployeeLeftbar from "@/components/employee/Leftbar";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const CAT_META = {
  Electronics:  { icon:"bi-laptop-fill",       bg:"#DBEAFE", color:"#1D4ED8" },
  Furniture:    { icon:"bi-house-fill",         bg:"#F3F4F6", color:"#374151" },
  Accessories:  { icon:"bi-headphones",         bg:"#FEF3C7", color:"#B45309" },
  Equipment:    { icon:"bi-tools",              bg:"#EDE9FE", color:"#5B21B6" },
  Vehicles:     { icon:"bi-car-front-fill",     bg:"#ECFDF5", color:"#059669" },
  Other:        { icon:"bi-box-seam-fill",      bg:"#F3F4F6", color:"#6B7280" },
};
const COND_META = {
  Good:          { bg:"#D1FAE5", color:"#065F46" },
  Fair:          { bg:"#FEF3C7", color:"#92400E" },
  Damaged:       { bg:"#FEE2E2", color:"#991B1B" },
  "Under Repair":{ bg:"#EDE9FE", color:"#5B21B6" },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";
const fmtMoney= (n) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

function Pill({ label, meta }) {
  if (!label) return null;
  const m = meta[label] || { bg:"#F3F4F6", color:"#374151" };
  return <span style={{ background:m.bg, color:m.color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{label}</span>;
}

export default function EmployeeAssets() {
  const [assets, setAssets] = useState([]);
  const [logs,   setLogs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reportModal, setReportModal] = useState(null);
  const [reportNote, setReportNote] = useState("");
  const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    fetch("/api/employee/assets/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) { setAssets(d.assets); setLogs(d.logs); } })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleReport = async () => {
    if (!reportNote.trim()) { showToast("Please describe the issue", "error"); return; }
    setReporting(true);
    try {
      const token = localStorage.getItem("employeeToken");
      const res = await fetch(`/api/admin/assets/${reportModal._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ condition: "Damaged", remarks: reportNote }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setAssets(prev => prev.map(a => a._id === reportModal._id ? { ...a, condition:"Damaged", remarks: reportNote } : a));
      if (selected?._id === reportModal._id) setSelected(prev => ({ ...prev, condition:"Damaged", remarks: reportNote }));
      setReportModal(null); setReportNote("");
      showToast("Issue reported. Admin has been notified.");
    } catch (err) {
      showToast(err.message || "Failed to report", "error");
    } finally {
      setReporting(false);
    }
  };

  return (
    <section className="over-time-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          @keyframes spin    { to { transform:rotate(360deg); } }
          @keyframes fadeIn  { from { opacity:0;transform:translateY(-8px); } to { opacity:1;transform:translateY(0); } }
          .ea-toast   { animation: fadeIn .2s ease; }
          .ea-card:hover { border-color:#C7D2FE !important; box-shadow:0 2px 16px rgba(79,70,229,0.1) !important; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            {toast && (
              <div className="ea-toast" style={{
                position:"fixed", top:24, right:24, zIndex:9999,
                background: toast.type === "success" ? "#ECFDF5" : "#FEF2F2",
                border:`1.5px solid ${toast.type === "success" ? "#6EE7B7" : "#FCA5A5"}`,
                borderRadius:12, padding:"12px 18px",
                display:"flex", alignItems:"center", gap:10, fontSize:13, fontWeight:600,
                color: toast.type === "success" ? "#065F46" : "#991B1B",
                boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
              }}>
                <i className={`bi bi-${toast.type === "success" ? "check-circle-fill" : "x-circle-fill"}`} style={{ fontSize:16 }} />
                {toast.text}
              </div>
            )}

            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard"><img src="/icons/home.svg" alt="" /> My Assets</Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="reim-page-head">
                <h2>My Assets</h2>
                <p>Assets assigned to you by the company</p>
              </div>

              <div className="reim-section">
                {loading ? (
                  <div style={{ textAlign:"center", padding:"60px 0" }}>
                    <div style={{ width:40, height:40, border:"3px solid #4F46E5", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite", margin:"0 auto 12px" }} />
                    <div style={{ color:"#9CA3AF", fontSize:13 }}>Loading your assets…</div>
                  </div>
                ) : assets.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"70px 20px" }}>
                    <i className="bi bi-box-seam" style={{ fontSize:52, color:"#E5E7EB", display:"block", marginBottom:12 }} />
                    <h5 style={{ color:"#374151", marginBottom:6 }}>No assets assigned</h5>
                    <p style={{ color:"#9CA3AF", fontSize:13 }}>You don't have any company assets assigned to you yet.</p>
                  </div>
                ) : (
                  <>
                    {/* Summary strip */}
                    <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
                      <div style={{ background:"#EEF2FF", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                        <i className="bi bi-box-seam-fill" style={{ color:"#4F46E5", fontSize:18 }} />
                        <div>
                          <div style={{ fontSize:20, fontWeight:800, color:"#111827" }}>{assets.length}</div>
                          <div style={{ fontSize:11, color:"#6B7280" }}>Total Assigned</div>
                        </div>
                      </div>
                      {assets.filter(a => a.condition === "Good").length > 0 && (
                        <div style={{ background:"#D1FAE5", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                          <i className="bi bi-check-circle-fill" style={{ color:"#059669", fontSize:18 }} />
                          <div>
                            <div style={{ fontSize:20, fontWeight:800, color:"#111827" }}>{assets.filter(a => a.condition === "Good").length}</div>
                            <div style={{ fontSize:11, color:"#6B7280" }}>Good Condition</div>
                          </div>
                        </div>
                      )}
                      {assets.some(a => a.condition === "Damaged" || a.condition === "Under Repair") && (
                        <div style={{ background:"#FEE2E2", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                          <i className="bi bi-exclamation-triangle-fill" style={{ color:"#DC2626", fontSize:18 }} />
                          <div>
                            <div style={{ fontSize:20, fontWeight:800, color:"#111827" }}>{assets.filter(a => a.condition === "Damaged" || a.condition === "Under Repair").length}</div>
                            <div style={{ fontSize:11, color:"#6B7280" }}>Needs Attention</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Asset cards */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
                      {assets.map(asset => {
                        const cat = CAT_META[asset.category] || CAT_META.Other;
                        const warExpired = asset.warrantyExpiry && new Date(asset.warrantyExpiry) < new Date();
                        const warSoon    = asset.warrantyExpiry && !warExpired && new Date(asset.warrantyExpiry) < new Date(Date.now() + 30*24*60*60*1000);
                        return (
                          <div key={asset._id} className="ea-card"
                            style={{ background:"#fff", borderRadius:16, padding:"18px", border:"1.5px solid #F3F4F6", cursor:"pointer", transition:"all .15s", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}
                            onClick={() => setSelected(asset)}>
                            <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
                              <div style={{ width:44, height:44, borderRadius:12, background:cat.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                <i className={`bi ${cat.icon}`} style={{ color:cat.color, fontSize:20 }} />
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontWeight:700, color:"#111827", fontSize:14 }}>{asset.name}</div>
                                <div style={{ fontSize:11, color:"#9CA3AF" }}>{asset.brand}{asset.model ? ` · ${asset.model}` : ""}</div>
                              </div>
                              <Pill label={asset.condition} meta={COND_META} />
                            </div>

                            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                              <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:"#4F46E5", background:"#EEF2FF", borderRadius:5, padding:"2px 7px" }}>{asset.assetId}</span>
                              <span style={{ fontSize:11, color:"#9CA3AF", background:"#F9FAFB", borderRadius:5, padding:"2px 7px" }}>{asset.category}</span>
                            </div>

                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#9CA3AF" }}>
                              <span>Assigned {fmtDate(asset.assignedDate)}</span>
                              {asset.purchaseValue && <span style={{ fontWeight:600, color:"#374151" }}>{fmtMoney(asset.purchaseValue)}</span>}
                            </div>

                            {(warExpired || warSoon) && (
                              <div style={{ marginTop:10, background: warExpired ? "#FEE2E2" : "#FEF3C7", borderRadius:8, padding:"6px 10px", fontSize:11, color: warExpired ? "#991B1B" : "#92400E", display:"flex", gap:6, alignItems:"center" }}>
                                <i className="bi bi-exclamation-triangle-fill" />
                                Warranty {warExpired ? "expired" : `expiring ${fmtDate(asset.warrantyExpiry)}`}
                              </div>
                            )}

                            <button
                              onClick={e => { e.stopPropagation(); setReportModal(asset); setReportNote(""); }}
                              style={{ marginTop:12, width:"100%", padding:"7px", background:"#FEE2E2", color:"#DC2626", border:"1.5px solid #FECACA", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                              <i className="bi bi-flag-fill" style={{ marginRight:5 }} />Report Issue
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Asset detail panel */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.2)", zIndex:1040 }} />
          <div style={{
            position:"fixed", top:0, right:0, bottom:0, width:380, background:"#fff",
            boxShadow:"-4px 0 30px rgba(0,0,0,0.12)", zIndex:1041, overflowY:"auto",
            animation:"slideIn .25s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <style>{`@keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }`}</style>

            <div style={{ background:"linear-gradient(135deg,#1e1b4b,#4338CA)", padding:"20px 20px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <span style={{ fontFamily:"monospace", fontSize:11, color:"#A5B4FC", background:"rgba(255,255,255,0.1)", borderRadius:5, padding:"2px 7px" }}>{selected.assetId}</span>
                  <h3 style={{ color:"#fff", fontWeight:800, fontSize:17, margin:"6px 0 2px" }}>{selected.name}</h3>
                  <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12 }}>{selected.brand}{selected.model ? ` · ${selected.model}` : ""}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, color:"#fff", padding:"6px 10px", cursor:"pointer", fontSize:14 }}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <Pill label={selected.condition} meta={COND_META} />
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)", background:"rgba(255,255,255,0.1)", borderRadius:20, padding:"3px 10px", fontWeight:600 }}>{selected.category}</span>
              </div>
            </div>

            <div style={{ padding:"18px 20px" }}>
              {[
                ["Serial Number",  selected.serialNumber, true],
                ["Assigned Date",  fmtDate(selected.assignedDate)],
                ["Purchase Value", fmtMoney(selected.purchaseValue)],
                ["Purchase Date",  fmtDate(selected.purchaseDate)],
                ["Warranty Until", fmtDate(selected.warrantyExpiry)],
                ["Vendor",         selected.vendor],
                ["Location",       selected.location],
                ["Remarks",        selected.remarks],
              ].filter(([,v]) => v && v !== "—").map(([label, val, mono]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F3F4F6", gap:12 }}>
                  <span style={{ fontSize:12, color:"#9CA3AF", fontWeight:500, flexShrink:0 }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"#111827", textAlign:"right", fontFamily:mono?"monospace":undefined, wordBreak:"break-all" }}>{val}</span>
                </div>
              ))}

              <button onClick={() => { setReportModal(selected); setReportNote(""); setSelected(null); }}
                style={{ marginTop:20, width:"100%", padding:"10px", background:"#FEE2E2", color:"#DC2626", border:"1.5px solid #FECACA", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                <i className="bi bi-flag-fill" style={{ marginRight:6 }} />Report a Problem
              </button>
            </div>
          </div>
        </>
      )}

      {/* Report issue modal */}
      {reportModal && (
        <div style={{ position:"fixed", inset:0, zIndex:1060, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={() => setReportModal(null)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)" }} />
          <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", padding:"24px" }}>
            <div style={{ width:48, height:48, borderRadius:12, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
              <i className="bi bi-flag-fill" style={{ fontSize:20, color:"#DC2626" }} />
            </div>
            <h3 style={{ fontSize:16, fontWeight:800, color:"#111827", marginBottom:4 }}>Report an Issue</h3>
            <p style={{ fontSize:12, color:"#9CA3AF", marginBottom:16 }}>{reportModal.assetId} · {reportModal.name}</p>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Describe the problem *</label>
            <textarea
              rows={4} placeholder="e.g. Screen cracked, keyboard not working, charger stopped charging…"
              style={{ width:"100%", padding:"10px 12px", fontSize:13, borderRadius:8, border:"1.5px solid #E5E7EB", outline:"none", resize:"vertical", boxSizing:"border-box" }}
              value={reportNote} onChange={e => setReportNote(e.target.value)}
            />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
              <button onClick={() => setReportModal(null)} style={{ background:"#F3F4F6", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleReport} disabled={reporting} style={{ background:"#DC2626", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {reporting ? "Submitting…" : <><i className="bi bi-flag-fill" style={{ marginRight:5 }} />Submit Report</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
