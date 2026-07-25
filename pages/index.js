import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Dashnav from "../components/Dashnav";
import Leftbar from "../components/Leftbar";
import Head from "next/head";
import LeftbarMobile from "@/components/LeftbarMobile";
import DateTimeGreeting from "@/components/DateTimeGreeting";
import BirthdayCelebration from "@/components/BirthdayCelebration";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmtMoney = n => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtTime  = d => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--";

const DELIV_META = {
  reel:     { icon: "bi-camera-reels-fill",  color: "#6366F1", bg: "#EEF2FF" },
  story:    { icon: "bi-broadcast",          color: "#EC4899", bg: "#FDF2F8" },
  carousel: { icon: "bi-images",             color: "#F59E0B", bg: "#FFFBEB" },
  post:     { icon: "bi-grid-3x3-gap-fill",  color: "#10B981", bg: "#ECFDF5" },
};

/* ─── Reusable top stat card ─────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, accent, link }) {
  const card = (
    <div className="kpi-card" style={{
      background: `linear-gradient(160deg, #fff 55%, ${accent.bg} 165%)`,
      borderRadius: 16, padding: "17px 18px 16px",
      border: `1px solid ${accent.bg}`, boxShadow: "0 3px 12px rgba(15,23,42,.06)",
      display: "flex", alignItems: "center", gap: 14, height: "100%",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accent.icon }} />
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
        {sub && <div style={{ fontSize: 10, color: accent.icon, fontWeight: 700, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
  return link
    ? <Link href={link} className="kpi-card-link" style={{ textDecoration: "none", display: "block", height: "100%" }}>{card}</Link>
    : card;
}

/* ─── Panel wrapper ──────────────────────────────────────────────── */
function Panel({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
      boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden", ...style,
    }}>
      {children}
    </div>
  );
}

function PanelHead({ icon, iconColor = "#6366F1", title, badge, right }) {
  return (
    <div style={{
      padding: "14px 18px 12px", borderBottom: "1px solid #F4F4FD",
      display: "flex", alignItems: "center", gap: 9,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, background: iconColor + "18",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 14, color: iconColor }} />
      </div>
      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>{title}</span>
      {badge}
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  );
}

function Chip({ n, bg, text }) {
  return (
    <span style={{ background: bg, color: text, fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 20 }}>{n}</span>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function AdminHome() {
  const [summary, setSummary]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [showAbsent, setShowAbsent]         = useState(false);
  const [showPayroll, setShowPayroll]       = useState(false);
  const [announcements, setAnnouncements]   = useState([]);
  const [holidays, setHolidays]             = useState([]);
  const [selectedBrand, setSelectedBrand]   = useState(null);
  const [todayBirthdays, setTodayBirthdays] = useState([]);

  /* Birthdays */
  useEffect(() => {
    fetch("/api/employee/birthdays/today", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.success) setTodayBirthdays(d.birthdays || []); })
      .catch(() => {});
  }, []);

  /* Summary */
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/dashboard/summary", { credentials: "include" });
      const d = await r.json();
      if (d.success) {
        setSummary(d.data);
        setSelectedBrand(p => p ?? d.data.brandDeliverables?.[0]?.name ?? null);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  /* Announcements + Holidays */
  useEffect(() => {
    fetch("/api/announcements/active").then(r => r.json()).then(d => { if (d.success) setAnnouncements(d.announcements); }).catch(() => {});
    fetch("/api/payroll/holidays/upcoming").then(r => r.json()).then(d => { if (d.success) setHolidays(d.data); }).catch(() => {});
  }, []);

  const s           = summary;
  const now         = new Date();
  const monthLabel  = MONTHS[now.getMonth()];
  const brandList   = s?.brandDeliverables || [];
  const activeBrand = brandList.find(b => b.name === selectedBrand) || brandList[0] || null;

  const _v = (val) => loading ? "—" : val ?? "—";

  // Hide these two panels once loaded if there's genuinely nothing to show —
  // no point showing an empty-state card for a 0.
  const showLatePanel  = loading || (s?.today?.late || 0) > 0;
  const showLeavePanel = loading || (s?.todayLeaves?.length || 0) > 0;
  const row2Visible = showLatePanel || showLeavePanel;
  const row2GridTemplate = showLatePanel && showLeavePanel ? "1fr 1fr" : "1fr";

  return (
    <section className="main-dashboard-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .kpi-card-link:hover .kpi-card { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(15,23,42,.12); }
        `}</style>
      </Head>

      <div className="main-nav">
        <Leftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item"><Link href="/"><img src="/icons/home.svg" /> Home</Link></li>
            </ul>
          </div>

          <div className="block-header" >

            {/* ── Birthday Celebration ── */}
            {todayBirthdays.length > 0 && (
              <BirthdayCelebration mode="team" birthdays={todayBirthdays} />
            )}

            {/* ── GREETING ROW ───────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div className="greetings-box" style={{ flex: 1, margin: 0 }}><DateTimeGreeting name="Ivan Sinha" /></div>
              <button onClick={fetchSummary} disabled={loading} style={{
                border: "none", borderRadius: 10, padding: "9px 18px",
                background: loading ? "#EEF2FF" : "linear-gradient(135deg,#6366F1,#818CF8)",
                color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 12px rgba(99,102,241,.3)",
                flexShrink: 0,
              }}>
                <i className={`bi bi-arrow-clockwise${loading ? " spin" : ""}`} style={{ fontSize: 14 }} />
                Refresh
              </button>
            </div>

            {/* ── 5 KPI STAT CARDS ───────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 14 }}>
              <KpiCard icon="bi-people-fill"       label="Total Employees" value={_v(s?.totalEmployees)}     accent={{ bg:"#EEF2FF", icon:"#6366F1", shadow:"rgba(99,102,241,.18)" }} link="/dashboard/admin/employee-management" />
              <KpiCard icon="bi-check-circle-fill" label="Present Today"   value={_v(s?.today?.present)}     accent={{ bg:"#DCFCE7", icon:"#16A34A", shadow:"rgba(34,197,94,.18)"  }} sub={loading?"":_v(s?.today?.presentPercent)+`% attendance`} link="/dashboard/admin/attendance-summary" />
              <KpiCard icon="bi-x-circle-fill"     label="Absent Today"    value={_v(s?.today?.absent)}      accent={{ bg:"#FEE2E2", icon:"#DC2626", shadow:"rgba(239,68,68,.18)"  }} link="/dashboard/admin/attendance-summary" />
              <KpiCard icon="bi-alarm-fill"        label="Late Arrivals"   value={_v(s?.today?.late)}        accent={{ bg:"#FFEDD5", icon:"#EA580C", shadow:"rgba(249,115,22,.18)" }} link="/dashboard/admin/attendance-summary" />
              <KpiCard icon="bi-calendar-x-fill"   label="On Leave Today"  value={_v(s?.todayLeaves?.length)} accent={{ bg:"#F3E8FF", icon:"#9333EA", shadow:"rgba(168,85,247,.18)"}} link="/dashboard/admin/leaves-management" />
            </div>

            {/* ── PAYROLL BANNER ─────────────────────────────────── */}
            <div style={{
              background: "#fff", borderRadius: 18, border: "1px solid #F0F0F8",
              boxShadow: "0 2px 12px rgba(99,102,241,.08)", marginBottom: 14, overflow: "hidden",
              display: "grid", gridTemplateColumns: "300px 1fr", alignItems: "stretch",
            }}>
              {/* Left — net pay highlight */}
              <div style={{
                background: "linear-gradient(145deg,#6366F1 0%,#4F46E5 60%,#7C3AED 100%)",
                padding: "28px 28px 24px", position: "relative", overflow: "hidden",
              }}>
                {/* decorative circles */}
                <div style={{ position:"absolute", width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,.07)", top:-40, right:-40 }} />
                <div style={{ position:"absolute", width:80,  height:80,  borderRadius:"50%", background:"rgba(255,255,255,.07)", bottom:10, left:10 }} />

                <div style={{ position:"relative" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                    <div style={{ width:30, height:30, borderRadius:9, background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <i className="bi bi-cash-stack" style={{ fontSize:14, color:"#fff" }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.8)", letterSpacing:"0.05em", textTransform:"uppercase" }}>{monthLabel} {s?.monthlySalary?.year || now.getFullYear()} Payroll</span>
                  </div>

                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <button onClick={() => setShowPayroll(v => !v)}
                      style={{ border:"none", background:"rgba(255,255,255,.18)", cursor:"pointer", color:"#fff", fontSize:14, width:28, height:28, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <i className={`bi bi-eye${showPayroll ? "-slash" : ""}`} />
                    </button>
                    <div style={{ fontSize:34, fontWeight:900, color:"#fff", letterSpacing: showPayroll ? "-1px" : 3, lineHeight:1.1 }}>
                      {loading ? "—" : showPayroll ? `₹${fmtMoney(s?.monthlySalary?.total)}` : "₹ ••••••"}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.65)", marginBottom:20 }}>Total Net Pay</div>

                  {/* Progress bar */}
                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,.7)", marginBottom:6, fontWeight:600 }}>
                      <span>Payroll Processed</span>
                      <span>{loading ? "—" : `${s?.monthlySalary?.processedCount ?? 0} / ${s?.monthlySalary?.count ?? 0}`}</span>
                    </div>
                    <div style={{ height:6, background:"rgba(255,255,255,.2)", borderRadius:6 }}>
                      <div style={{
                        height:6, borderRadius:6, background:"rgba(255,255,255,.85)",
                        width: loading || !s?.monthlySalary?.count ? "0%" :
                          `${Math.round((s.monthlySalary.processedCount/s.monthlySalary.count)*100)}%`,
                        transition:"width .5s",
                      }} />
                    </div>
                  </div>

                  <Link href="/dashboard/admin/salary-report" style={{
                    display:"inline-flex", alignItems:"center", gap:6,
                    background:"rgba(255,255,255,.18)", border:"1px solid rgba(255,255,255,.3)",
                    borderRadius:10, padding:"8px 16px",
                    color:"#fff", textDecoration:"none", fontSize:12, fontWeight:700,
                    backdropFilter:"blur(4px)",
                  }}>
                    <i className="bi bi-arrow-right-circle-fill" style={{ fontSize:13 }} />
                    View Salary Report
                  </Link>
                </div>
              </div>

              {/* Right — breakdown metrics */}
              <div style={{ padding:"20px 22px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, alignContent:"center" }}>
                {[
                  { label:"Total Basic",      value:`₹${fmtMoney(s?.monthlySalary?.basic)}`,         icon:"bi-wallet2",          bg:"#EEF2FF", color:"#6366F1" },
                  { label:"Total Deductions", value:`₹${fmtMoney(s?.monthlySalary?.deductions)}`,    icon:"bi-dash-circle-fill", bg:"#FEE2E2", color:"#DC2626" },
                  { label:"Overtime Pay",     value:`₹${fmtMoney(s?.monthlySalary?.overtime)}`,      icon:"bi-clock-fill",       bg:"#FEF3C7", color:"#B45309" },
                  { label:"Reimbursements",   value:`₹${fmtMoney(s?.monthlySalary?.reimbursement)}`, icon:"bi-receipt",          bg:"#F3E8FF", color:"#9333EA" },
                ].map(x => (
                  <div key={x.label} style={{
                    background: x.bg + "55", border:`1px solid ${x.bg}`,
                    borderRadius:12, padding:"12px 14px",
                    display:"flex", alignItems:"center", gap:10,
                  }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:x.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <i className={`bi ${x.icon}`} style={{ fontSize:14, color:x.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize:15, fontWeight:900, color:"#0F172A", letterSpacing: showPayroll ? "-0.3px" : 2 }}>{loading ? "—" : showPayroll ? x.value : "₹ ••••"}</div>
                      <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginTop:1 }}>{x.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ROW 2: Late + Leave/Absent ──────────────────────── */}
            {row2Visible && <div style={{ display:"grid", gridTemplateColumns:row2GridTemplate, gap:12, marginBottom:14 }}>

              {/* Late Arrivals — hidden once loaded if nobody's late today */}
              {showLatePanel && <Panel>
                <PanelHead icon="bi-alarm-fill" iconColor="#EA580C" title="Late Arrivals"
                  badge={!loading && s?.today?.late > 0 && <Chip n={s.today.late} bg="#FFEDD5" text="#EA580C" />}
                />
                <div style={{ maxHeight:260, overflowY:"auto", padding:"6px 0" }}>
                  {loading ? <Skeleton /> : (s?.today?.lateEmployees || []).length === 0 ? (
                    <Empty icon="bi-check-circle-fill" color="#22C55E" msg="No late arrivals today" />
                  ) : (s.today.lateEmployees).map((emp, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 18px", borderBottom:"1px solid #F4F4FD" }}>
                      <Avatar name={emp.name} bg="#FFEDD5" color="#EA580C" />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{emp.name}</div>
                        <div style={{ fontSize:11, color:"#94A3B8" }}>{emp.dept || "—"}</div>
                      </div>
                      <span style={{ fontSize:12, color:"#F97316", fontWeight:700, background:"#FFEDD5", padding:"3px 10px", borderRadius:8 }}>{fmtTime(emp.checkIn)}</span>
                    </div>
                  ))}
                </div>
              </Panel>}

              {/* Leaves / Absent toggle — hidden once loaded if nobody's on leave or absent today */}
              {showLeavePanel && <Panel>
                <PanelHead
                  icon={showAbsent ? "bi-x-circle-fill" : "bi-calendar-x-fill"}
                  iconColor={showAbsent ? "#DC2626" : "#9333EA"}
                  title={showAbsent ? "Absent Today" : "On Leave Today"}
                  badge={
                    <Chip
                      n={loading ? "—" : showAbsent ? s?.today?.absent : s?.todayLeaves?.length}
                      bg={showAbsent ? "#FEE2E2" : "#F3E8FF"}
                      text={showAbsent ? "#DC2626" : "#9333EA"}
                    />
                  }
                  right={
                    <div style={{ display:"flex", gap:4 }}>
                      {["Leaves","Absent"].map((lbl,idx) => {
                        const active = idx === 0 ? !showAbsent : showAbsent;
                        return (
                          <button key={lbl} onClick={() => setShowAbsent(idx===1)} style={{
                            background: active ? (idx===0?"#EDE9FE":"#FEE2E2") : "transparent",
                            border:"none", fontSize:11, fontWeight:700,
                            color: active ? (idx===0?"#7C3AED":"#DC2626") : "#94A3B8",
                            cursor:"pointer", borderRadius:8, padding:"4px 10px",
                          }}>{lbl}</button>
                        );
                      })}
                    </div>
                  }
                />
                <div style={{ maxHeight:260, overflowY:"auto", padding:"6px 0" }}>
                  {loading ? <Skeleton /> : showAbsent ? (
                    (s?.today?.absentEmployees || []).length === 0 ? <Empty icon="bi-emoji-smile-fill" color="#22C55E" msg="Full attendance today!" /> :
                    (s.today.absentEmployees).map((emp, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 18px", borderBottom:"1px solid #F4F4FD" }}>
                        <Avatar name={emp.name} bg="#FEE2E2" color="#DC2626" />
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{emp.name}</div>
                          <div style={{ fontSize:11, color:"#94A3B8" }}>{emp.dept || "—"}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    (s?.todayLeaves || []).length === 0 ? <Empty icon="bi-calendar-check-fill" color="#22C55E" msg="No leaves today" /> :
                    <>
                      {(s.todayLeaves).map((l, i) => (
                        <Link key={i} href="/dashboard/admin/leaves-management" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:10, padding:"9px 18px", borderBottom:"1px solid #F4F4FD", transition:"background .12s" }}
                          onMouseEnter={e => e.currentTarget.style.background="#FAFAFF"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}
                        >
                          <Avatar name={l.name} bg="#F3E8FF" color="#9333EA" />
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{l.name}</div>
                            <div style={{ fontSize:11, color:"#94A3B8" }}>{l.type} · {l.totalDays}d</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{
                              fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20,
                              background: l.status==="Approved" ? "#DCFCE7" : "#FEF3C7",
                              color:      l.status==="Approved" ? "#16A34A" : "#B45309",
                            }}>{l.status}</span>
                            <i className="bi bi-chevron-right" style={{ fontSize:10, color:"#CBD5E1" }} />
                          </div>
                        </Link>
                      ))}
                      <div style={{ padding:"10px 18px" }}>
                        <Link href="/dashboard/admin/leaves-management" style={{ fontSize:12, fontWeight:700, color:"#9333EA", textDecoration:"none" }}>
                          Manage all leaves →
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </Panel>}
            </div>}

            {/* ── ROW 3: Brand Tasks ──────────────────────────────── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:12, marginBottom:14 }}>

              {/* Brand Tasks — dropdown */}
              <Panel>
                <PanelHead icon="bi-bookmark-star-fill" iconColor="#F59E0B" title="Brand Tasks"
                  right={
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {brandList.length > 0 && (
                        <select value={selectedBrand||""} onChange={e => setSelectedBrand(e.target.value)} style={{
                          fontSize:12, fontWeight:700, border:"1px solid #E0E7FF", borderRadius:9,
                          padding:"5px 10px", background:"#EEF2FF", color:"#4338CA", cursor:"pointer", outline:"none",
                        }}>
                          {brandList.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                      )}
                      <Link href="/dashboard/admin/tasks/brands" title="Open in Tasks" style={{ color:"#94A3B8", fontSize:13, textDecoration:"none" }}>
                        <i className="bi bi-box-arrow-up-right" />
                      </Link>
                    </div>
                  }
                />
                {loading ? <div style={{ padding:"20px 18px" }}><Skeleton /></div>
                  : brandList.length === 0 ? <Empty icon="bi-bookmark-x-fill" color="#94A3B8" msg="No social media brands yet" />
                  : activeBrand && (
                  <div style={{ padding:"18px" }}>
                    {/* Brand name + month + overall bar */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                      <span style={{ width:10, height:10, borderRadius:"50%", background:activeBrand.color, flexShrink:0, display:"inline-block", boxShadow:`0 0 0 3px ${activeBrand.color}33` }} />
                      <span style={{ fontSize:16, fontWeight:900, color:"#0F172A" }}>{activeBrand.name}</span>
                      <span style={{ fontSize:11, color:"#94A3B8", fontWeight:600 }}>{monthLabel}</span>
                      <span style={{ fontSize:11, color:"#64748B", background:"#F1F5F9", borderRadius:8, padding:"2px 9px", marginLeft:"auto" }}>
                        {activeBrand.totalDone}/{activeBrand.totalTarget} done
                      </span>
                    </div>

                    {activeBrand.totalTarget === 0 ? (
                      <Empty icon="bi-clipboard-x" color="#94A3B8" msg="No monthly deliverable targets set for this brand" />
                    ) : (
                      <>
                        <div style={{ marginBottom:18 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#64748B", marginBottom:5, fontWeight:600 }}>
                            <span>Overall Completion</span>
                            <span style={{ color:activeBrand.color, fontWeight:800 }}>
                              {Math.round((activeBrand.totalDone/activeBrand.totalTarget)*100)}%
                            </span>
                          </div>
                          <div style={{ height:8, background:"#F1F5F9", borderRadius:8 }}>
                            <div style={{
                              height:8, borderRadius:8, background:`linear-gradient(90deg,${activeBrand.color},${activeBrand.color}99)`,
                              width:`${Math.min(100, Math.round((activeBrand.totalDone/activeBrand.totalTarget)*100))}%`,
                              transition:"width .5s", boxShadow:`0 2px 6px ${activeBrand.color}55`,
                            }} />
                          </div>
                        </div>

                        {/* Per deliverable-type cards: target / done / pending */}
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:16 }}>
                          {activeBrand.deliverables.filter(d => d.target > 0).map(d => {
                            const meta     = DELIV_META[d.type];
                            const pct      = d.target > 0 ? Math.round((d.done/d.target)*100) : 0;
                            const complete = d.pending === 0;
                            return (
                              <div key={d.type} style={{ background:meta.bg, borderRadius:14, padding:"14px 16px" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                                  <div style={{ width:30, height:30, borderRadius:9, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 2px 6px ${meta.color}33`, flexShrink:0 }}>
                                    <i className={`bi ${meta.icon}`} style={{ fontSize:14, color:meta.color }} />
                                  </div>
                                  <span style={{ fontSize:13, fontWeight:800, color:"#0F172A" }}>{d.label}</span>
                                  {complete && (
                                    <span style={{ marginLeft:"auto", fontSize:9, fontWeight:800, color:"#16A34A", background:"#DCFCE7", padding:"3px 8px", borderRadius:20, whiteSpace:"nowrap" }}>
                                      <i className="bi bi-check-lg" /> Done
                                    </span>
                                  )}
                                </div>
                                <div style={{ display:"flex", alignItems:"baseline", gap:5, marginBottom:9 }}>
                                  <span style={{ fontSize:24, fontWeight:900, color:meta.color, letterSpacing:"-0.5px", lineHeight:1 }}>{d.done}</span>
                                  <span style={{ fontSize:13, fontWeight:700, color:"#94A3B8" }}>/ {d.target}</span>
                                  {!complete && (
                                    <span style={{ marginLeft:"auto", fontSize:11, fontWeight:800, color:"#EA580C" }}>{d.pending} left</span>
                                  )}
                                </div>
                                <div style={{ height:6, background:"rgba(255,255,255,.8)", borderRadius:6 }}>
                                  <div style={{
                                    height:6, width:`${Math.min(100,pct)}%`, borderRadius:6,
                                    background:meta.color, transition:"width .4s",
                                  }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    <Link href="/dashboard/admin/tasks/brands" style={{
                      display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginTop:4,
                      background:`linear-gradient(135deg,${activeBrand.color},${activeBrand.color}cc)`,
                      color:"#fff", textDecoration:"none", borderRadius:12, padding:"10px",
                      fontSize:13, fontWeight:800, boxShadow:`0 4px 14px ${activeBrand.color}44`,
                    }}>
                      <i className="bi bi-bookmark-star-fill" style={{ fontSize:13 }} />
                      Open {activeBrand.name} Tasks
                    </Link>
                  </div>
                )}
              </Panel>
            </div>

            {/* ── ROW 4: Notices + Holidays ───────────────────────── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>

              {/* Notices */}
              <Panel>
                <PanelHead icon="bi-megaphone-fill" iconColor="#6366F1" title="Notices"
                  right={
                    <Link href="/dashboard/hr/announcement" style={{
                      fontSize:11, fontWeight:700, color:"#6366F1", textDecoration:"none",
                      border:"1px solid #E0E7FF", padding:"4px 12px", borderRadius:8, background:"#EEF2FF",
                    }}>+ Create</Link>
                  }
                />
                <div style={{ maxHeight:280, overflowY:"auto", padding:"8px 0" }}>
                  {announcements.length===0 ? <Empty icon="bi-megaphone" color="#94A3B8" msg="No announcements" /> :
                    announcements.map(a => (
                      <div key={a._id} style={{ padding:"11px 18px", borderBottom:"1px solid #F4F4FD" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:5 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:"#0F172A", flex:1 }}>{a.title}</span>
                          <span style={{
                            fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, flexShrink:0,
                            background:a.priority==="high"?"#FEE2E2":"#F3F4F6",
                            color:     a.priority==="high"?"#DC2626":"#6B7280",
                          }}>{a.priority==="high"?"High":"Normal"}</span>
                        </div>
                        <p style={{ fontSize:12, color:"#64748B", margin:0, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", lineHeight:1.5 }}>
                          {a.message}
                        </p>
                        <div style={{ fontSize:11, color:"#94A3B8", marginTop:6 }}>
                          {new Date(a.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </Panel>

              {/* Holidays */}
              <Panel>
                <PanelHead icon="bi-star-fill" iconColor="#F59E0B" title="Upcoming Holidays"
                  badge={holidays.length>0 && <Chip n={holidays.length} bg="#FEF3C7" text="#B45309" />}
                />
                <div style={{ maxHeight:280, overflowY:"auto", padding:"6px 0" }}>
                  {holidays.length===0 ? <Empty icon="bi-calendar" color="#94A3B8" msg="No upcoming holidays" /> :
                    holidays.slice(0,8).map((h,i) => {
                      const fmtShort = (d) => new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
                      const start = new Date(h.startDate);
                      const end = new Date(h.endDate || h.startDate);
                      const now = new Date();
                      const isToday = now.toDateString()===start.toDateString() || (now>=start && now<=end);
                      const isMulti = h.endDate && start.toDateString()!==end.toDateString();
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 18px", borderBottom:"1px solid #F4F4FD", background:isToday?"#FFFBEB":"transparent" }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{h.name}</div>
                            {h.description && <div style={{ fontSize:11, color:"#94A3B8" }}>{h.description}</div>}
                          </div>
                          <span style={{
                            fontSize:11, fontWeight:800, padding:"4px 10px", borderRadius:10, whiteSpace:"nowrap",
                            background:isToday?"#6366F1":"#F8FAFC",
                            color:     isToday?"#fff":"#6B7280",
                            border:    isToday?"none":"1px solid #E5E7EB",
                          }}>
                            {isMulti ? `${fmtShort(start)} – ${fmtShort(end)}` : fmtShort(start)}
                          </span>
                        </div>
                      );
                    })
                  }
                </div>
              </Panel>
            </div>

          </div>
        </section>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .7s linear infinite; display: inline-block; }
        .kpi-card:hover { box-shadow: 0 6px 20px rgba(99,102,241,.12) !important; transform: translateY(-1px); }
        .greetings-box { margin: 0 !important; padding: 0 !important; }
        .greetings-box > * { margin-bottom: 0 !important; }
      `}</style>
    </section>
  );
}

/* ─── Tiny shared sub-components ────────────────────────────────── */
function Avatar({ name, bg, color }) {
  return (
    <div style={{ width:34, height:34, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ fontSize:13, fontWeight:800, color }}>{(name||"?").charAt(0).toUpperCase()}</span>
    </div>
  );
}
function Empty({ icon, color, msg }) {
  return (
    <div style={{ padding:"28px 18px", textAlign:"center" }}>
      <i className={`bi ${icon}`} style={{ fontSize:28, color, display:"block", marginBottom:8 }} />
      <div style={{ fontSize:13, color:"#64748B" }}>{msg}</div>
    </div>
  );
}
function Skeleton() {
  return (
    <div style={{ padding:"18px" }}>
      {[70,50,60].map((w,i) => (
        <div key={i} style={{ height:12, background:"#F1F5F9", borderRadius:8, marginBottom:10, width:`${w}%`, animation:"pulse 1.5s ease-in-out infinite" }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { req } = context;
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
