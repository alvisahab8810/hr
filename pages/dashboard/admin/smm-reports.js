import Head from "next/head";
import React, { useEffect, useState } from "react";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const CT = [
  { key:"reel",     label:"Reels",     icon:"🎬", color:"#F59E0B", light:"#FFFBEB" },
  { key:"post",     label:"Posts",     icon:"🖼️",  color:"#6366F1", light:"#EEF2FF" },
  { key:"carousel", label:"Carousels", icon:"📸", color:"#10B981", light:"#ECFDF5" },
  { key:"story",    label:"Stories",   icon:"📱", color:"#EC4899", light:"#FDF2F8" },
];

function authH() {
  const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function SmmReports() {
  const now = new Date();
  const [brands,      setBrands]      = useState([]);
  const [brandId,     setBrandId]     = useState("");
  const [month,       setMonth]       = useState(now.getMonth() + 1);
  const [year,        setYear]        = useState(now.getFullYear());
  const [report,      setReport]      = useState(null);
  const [loading,     setLoading]     = useState(false);

  // Load brand list and auto-select Viralon
  useEffect(() => {
    fetch("/api/admin/smm/report", { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const list = d.brands || [];
          setBrands(list);
          // Auto-select Viralon (case-insensitive), fallback to first brand
          const viralon = list.find(b => b.name?.toLowerCase().includes("viralon")) || list[0];
          if (viralon) setBrandId(String(viralon._id));
        }
      });
  }, []);

  // Load report when brand/month/year changes
  useEffect(() => {
    if (!brandId) { setReport(null); return; }
    setLoading(true);
    fetch(`/api/admin/smm/report?brandId=${brandId}&month=${month}&year=${year}`, { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setReport(d); })
      .finally(() => setLoading(false));
  }, [brandId, month, year]);

  const sel = brands.find(b => String(b._id) === brandId);

  return (
    <>
      <Head><title>SMM Reports · Viralon</title></Head>
      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />
          <section className="content home" style={{ background:"#f8fafc" }}>
          <div style={{ padding:"32px 32px 40px" }}>

            {/* Header */}
            <div style={{ marginBottom:28, paddingBottom:20, borderBottom:"1px solid #f1f5f9" }}>
              <h1 style={{ fontSize:24, fontWeight:800, color:"#0f172a", margin:0, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:22 }}>📊</span> SMM Reports
              </h1>
              <p style={{ fontSize:13, color:"#64748b", margin:"5px 0 0" }}>Monthly deliverable tracker per brand</p>
            </div>

            {/* Controls */}
            <div style={{ display:"flex", gap:12, marginBottom:28, flexWrap:"wrap", alignItems:"center" }}>
              {/* Brand dropdown */}
              <div style={{ position:"relative", minWidth:220 }}>
                {sel && (
                  <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:8, height:8, borderRadius:"50%", background:sel.color||"#6366F1", pointerEvents:"none" }} />
                )}
                <select value={brandId} onChange={e => setBrandId(e.target.value)}
                  style={{ width:"100%", padding:`9px 14px 9px ${sel ? "28px" : "14px"}`, border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:13, fontWeight:600, color: brandId ? "#0f172a" : "#94a3b8", outline:"none", cursor:"pointer", background:"#fff", appearance:"none" }}>
                  <option value="">— Select Brand —</option>
                  {brands.map(b => <option key={b._id} value={String(b._id)}>{b.name}</option>)}
                </select>
              </div>

              {/* Month */}
              <select value={month} onChange={e => setMonth(Number(e.target.value))}
                style={{ padding:"9px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:13, fontWeight:600, color:"#0f172a", outline:"none", cursor:"pointer", background:"#fff" }}>
                {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>

              {/* Year */}
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                style={{ padding:"9px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:13, fontWeight:600, color:"#0f172a", outline:"none", cursor:"pointer", background:"#fff" }}>
                {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Empty state */}
            {!brandId && (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#94a3b8" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
                <div style={{ fontSize:15, fontWeight:600 }}>Select a brand to view the report</div>
              </div>
            )}

            {/* Loading */}
            {brandId && loading && (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#94a3b8" }}>
                <div style={{ width:32, height:32, border:"3px solid #e2e8f0", borderTop:"3px solid #6366F1", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
                <div style={{ fontSize:13 }}>Loading report…</div>
              </div>
            )}

            {/* Report */}
            {report && !loading && (() => {
              const { brand, deliverables, summary } = report;

              // Compute totals for summary bar
              let totalTarget = 0, totalDone = 0, totalAssigned = 0, totalUnassigned = 0;
              CT.forEach(({ key }) => {
                const d = deliverables?.[key] || {};
                totalTarget    += d.target    || 0;
                totalDone      += d.completed || 0;
                totalAssigned  += (d.inProgress || 0) + (d.review || 0);
                totalUnassigned+= (d.todo || 0) + Math.max(0, (d.target || 0) - (d.created || 0));
              });

              return (
                <>
                  {/* Brand header */}
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, padding:"14px 20px", background:"#fff", border:"1px solid #e2e8f0", borderRadius:12 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:brand.color||"#6366F1", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:15, flexShrink:0 }}>
                      {brand.name?.slice(0,1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:16, color:"#0f172a" }}>{brand.name}</div>
                      <div style={{ fontSize:12, color:"#64748b" }}>{MONTHS[report.month-1]} {report.year}</div>
                    </div>
                    <div style={{ marginLeft:"auto", display:"flex", gap:24 }}>
                      {[
                        { label:"Target",      val:totalTarget,     color:"#6366F1" },
                        { label:"Done",        val:totalDone,       color:"#16A34A" },
                        { label:"Assigned",    val:totalAssigned,   color:"#D97706" },
                        { label:"Not Assigned",val:totalUnassigned, color:"#94a3b8" },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign:"center" }}>
                          <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</div>
                          <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600, marginTop:3, textTransform:"uppercase", letterSpacing:".04em" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Per content type */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
                    {CT.map(ct => {
                      const d = deliverables?.[ct.key] || {};
                      const target     = d.target    || 0;
                      const done       = d.completed || 0;
                      const assigned   = (d.inProgress || 0) + (d.review || 0);
                      const notCreated = Math.max(0, target - (d.created || 0));
                      const unassigned = (d.todo || 0) + notCreated;
                      const donePct    = target > 0 ? Math.min(100, Math.round(done / target * 100)) : 0;

                      if (target === 0) return null;

                      return (
                        <div key={ct.key} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"20px 20px 18px", display:"flex", flexDirection:"column", gap:16 }}>
                          {/* Header */}
                          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                            <div style={{ width:36, height:36, borderRadius:10, background:ct.light, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                              {ct.icon}
                            </div>
                            <div>
                              <div style={{ fontWeight:800, fontSize:14, color:"#0f172a" }}>{ct.label}</div>
                              <div style={{ fontSize:11, color:"#94a3b8" }}>Target: {target}</div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#94a3b8", fontWeight:600, marginBottom:5, textTransform:"uppercase" }}>
                              <span>Progress</span>
                              <span style={{ color:ct.color }}>{donePct}%</span>
                            </div>
                            <div style={{ height:7, borderRadius:99, background:"#f1f5f9", overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${donePct}%`, borderRadius:99, background:ct.color, transition:"width .4s" }} />
                            </div>
                          </div>

                          {/* Numbers */}
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                            <Stat label="Done"         val={done}       color="#16A34A" bg="#DCFCE7" />
                            <Stat label="Assigned"     val={assigned}   color="#D97706" bg="#FEF3C7" />
                            <Stat label="Not Assigned" val={unassigned} color="#94a3b8" bg="#F1F5F9" />
                            <Stat label="Remaining"    val={Math.max(0, target - done)} color={ct.color} bg={ct.light} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

          </div>
          </section>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select { -webkit-appearance: none; -moz-appearance: none; }
      `}</style>
    </>
  );
}

function Stat({ label, val, color, bg }) {
  return (
    <div style={{ background:bg, borderRadius:9, padding:"10px 12px" }}>
      <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:10, color:"#64748b", fontWeight:600, marginTop:3, textTransform:"uppercase", letterSpacing:".03em" }}>{label}</div>
    </div>
  );
}
