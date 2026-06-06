import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Dashnav from "../components/Dashnav";
import Leftbar from "../components/Leftbar";
import Head from "next/head";
import { getSocket } from "@/utils/socket";
import LeftbarMobile from "@/components/LeftbarMobile";
import DateTimeGreeting from "@/components/DateTimeGreeting";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmtMoney = n => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtTime  = d => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "--";

const PRIO = {
  urgent: { bg: "#FEE2E2", text: "#DC2626", dot: "#EF4444" },
  high:   { bg: "#FFEDD5", text: "#EA580C", dot: "#F97316" },
  medium: { bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" },
  low:    { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
};
const ST = {
  todo:        { label: "To Do",       bg: "#F3F4F6", text: "#6B7280" },
  in_progress: { label: "In Progress", bg: "#DBEAFE", text: "#1D4ED8" },
  review:      { label: "Review",      bg: "#EDE9FE", text: "#7C3AED" },
  completed:   { label: "Done",        bg: "#DCFCE7", text: "#16A34A" },
  blocked:     { label: "Blocked",     bg: "#FEE2E2", text: "#DC2626" },
};

/* ─── Reusable top stat card ─────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, accent, link }) {
  const card = (
    <div className="kpi-card" style={{
      background: "#fff", borderRadius: 14, padding: "14px 16px",
      border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(99,102,241,.06)",
      display: "flex", alignItems: "center", gap: 12, height: "100%",
      transition: "box-shadow .2s, transform .2s",
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: accent.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 4px 12px ${accent.shadow}`,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 18, color: accent.icon }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", lineHeight: 1.1, letterSpacing: "-0.5px" }}>{value}</div>
        <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
  return link
    ? <Link href={link} style={{ textDecoration: "none", display: "block", height: "100%" }}>{card}</Link>
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
  const [employeeStatus, setEmployeeStatus] = useState({});
  const [summary, setSummary]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [showAbsent, setShowAbsent]         = useState(false);
  const [announcements, setAnnouncements]   = useState([]);
  const [holidays, setHolidays]             = useState([]);
  const [selectedBrand, setSelectedBrand]   = useState(null);

  /* Socket */
  useEffect(() => {
    fetch("/api/socket");
    const socket = getSocket();
    const onConnect = () => socket.emit("admin:requestSnapshot");
    const onUpdate  = d  => setEmployeeStatus(p => ({ ...p, [d.employeeId]: d }));
    const onSnap    = arr => { const m = {}; arr.forEach(i => { m[i.employeeId] = i; }); setEmployeeStatus(m); };
    socket.on("connect",              onConnect);
    socket.on("employeeStatusUpdate", onUpdate);
    socket.on("employeeStatusSnapshot", onSnap);
    return () => { socket.off("connect", onConnect); socket.off("employeeStatusUpdate", onUpdate); socket.off("employeeStatusSnapshot", onSnap); };
  }, []);

  /* Summary */
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/dashboard/summary", { credentials: "include" });
      const d = await r.json();
      if (d.success) {
        setSummary(d.data);
        setSelectedBrand(p => p ?? d.data.brandTasks?.[0]?.name ?? null);
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
  const brandList   = s?.brandTasks || [];
  const activeBrand = brandList.find(b => b.name === selectedBrand) || brandList[0] || null;
  const onlineCount = Object.values(employeeStatus).filter(e => e.status === "online").length;

  const _v = (val) => loading ? "—" : val ?? "—";

  return (
    <section className="main-dashboard-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
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

                  <div style={{ fontSize:34, fontWeight:900, color:"#fff", letterSpacing:"-1px", lineHeight:1.1, marginBottom:6 }}>
                    {loading ? "—" : `₹${fmtMoney(s?.monthlySalary?.total)}`}
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
                      <div style={{ fontSize:15, fontWeight:900, color:"#0F172A", letterSpacing:"-0.3px" }}>{loading ? "—" : x.value}</div>
                      <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginTop:1 }}>{x.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ROW 2: Late + Leave/Absent + Task Overview ─────── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 300px", gap:12, marginBottom:14 }}>

              {/* Late Arrivals */}
              <Panel>
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
              </Panel>

              {/* Leaves / Absent toggle */}
              <Panel>
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
              </Panel>

              {/* Task Overview */}
              <Panel>
                <PanelHead icon="bi-kanban-fill" iconColor="#6366F1" title="Task Overview" />
                <div style={{ padding:"14px 18px" }}>
                  {loading ? <Skeleton /> : (
                    <>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                        {[
                          { label:"Total",     value:s?.taskStats?.total,               bg:"#EEF2FF", color:"#6366F1" },
                          { label:"Completed", value:s?.taskStats?.byStatus?.completed,  bg:"#DCFCE7", color:"#16A34A" },
                          { label:"Overdue",   value:s?.taskStats?.overdue,              bg:"#FEE2E2", color:"#DC2626" },
                          { label:"Done Rate", value:`${s?.taskStats?.completionRate}%`, bg:"#DBEAFE", color:"#1D4ED8" },
                        ].map(x => (
                          <div key={x.label} style={{ background:x.bg, borderRadius:12, padding:"10px 12px" }}>
                            <div style={{ fontSize:20, fontWeight:900, color:x.color, letterSpacing:"-0.5px" }}>{x.value}</div>
                            <div style={{ fontSize:10, color:x.color, opacity:.75, fontWeight:700, marginTop:1 }}>{x.label}</div>
                          </div>
                        ))}
                      </div>
                      {[
                        { key:"todo",        label:"To Do",       color:"#9CA3AF" },
                        { key:"in_progress", label:"In Progress", color:"#6366F1" },
                        { key:"review",      label:"Review",      color:"#8B5CF6" },
                        { key:"blocked",     label:"Blocked",     color:"#EF4444" },
                      ].map(row => {
                        const count = s?.taskStats?.byStatus?.[row.key] || 0;
                        const pct   = s?.taskStats?.total > 0 ? Math.round((count/s.taskStats.total)*100) : 0;
                        return (
                          <div key={row.key} style={{ marginBottom:8 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#64748B", marginBottom:3, fontWeight:600 }}>
                              <span>{row.label}</span><span style={{ color:row.color, fontWeight:700 }}>{count}</span>
                            </div>
                            <div style={{ height:5, background:"#F1F5F9", borderRadius:6 }}>
                              <div style={{ height:5, width:`${pct}%`, background:row.color, borderRadius:6, transition:"width .4s" }} />
                            </div>
                          </div>
                        );
                      })}
                      <Link href="/dashboard/admin/tasks" style={{
                        display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginTop:12,
                        background:"linear-gradient(135deg,#6366F1,#818CF8)",
                        color:"#fff", textDecoration:"none", borderRadius:10, padding:"8px", fontSize:12, fontWeight:700,
                      }}>
                        View All Tasks <i className="bi bi-arrow-right" style={{ fontSize:11 }} />
                      </Link>
                    </>
                  )}
                </div>
              </Panel>
            </div>

            {/* ── ROW 3: Brand Tasks + Today's Assignments ────────── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>

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
                  : brandList.length === 0 ? <Empty icon="bi-bookmark-x-fill" color="#94A3B8" msg="No brand tasks yet" />
                  : activeBrand && (
                  <div style={{ padding:"18px" }}>
                    {/* Brand name + bar */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                      <span style={{ width:10, height:10, borderRadius:"50%", background:activeBrand.color, flexShrink:0, display:"inline-block", boxShadow:`0 0 0 3px ${activeBrand.color}33` }} />
                      <span style={{ fontSize:16, fontWeight:900, color:"#0F172A" }}>{activeBrand.name}</span>
                      <span style={{ fontSize:11, color:"#64748B", background:"#F1F5F9", borderRadius:8, padding:"2px 9px", marginLeft:"auto" }}>
                        {activeBrand.total} tasks
                      </span>
                    </div>
                    <div style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#64748B", marginBottom:5, fontWeight:600 }}>
                        <span>Completion</span>
                        <span style={{ color:activeBrand.color, fontWeight:800 }}>
                          {activeBrand.total > 0 ? Math.round((activeBrand.completed/activeBrand.total)*100) : 0}%
                        </span>
                      </div>
                      <div style={{ height:8, background:"#F1F5F9", borderRadius:8 }}>
                        <div style={{
                          height:8, borderRadius:8, background:`linear-gradient(90deg,${activeBrand.color},${activeBrand.color}99)`,
                          width:`${activeBrand.total>0 ? Math.round((activeBrand.completed/activeBrand.total)*100) : 0}%`,
                          transition:"width .5s", boxShadow:`0 2px 6px ${activeBrand.color}55`,
                        }} />
                      </div>
                    </div>
                    {/* 6-cell grid */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
                      {[
                        { label:"Done",      value:activeBrand.completed,  bg:"#DCFCE7", color:"#16A34A" },
                        { label:"Active",    value:activeBrand.inProgress, bg:"#DBEAFE", color:"#1D4ED8" },
                        { label:"Review",    value:activeBrand.review,     bg:"#EDE9FE", color:"#7C3AED" },
                        { label:"To Do",     value:activeBrand.todo,       bg:"#F3F4F6", color:"#6B7280" },
                        { label:"Blocked",   value:activeBrand.blocked,    bg:"#FEE2E2", color:"#DC2626" },
                        { label:"Total",     value:activeBrand.total,      bg:"#EEF2FF", color:"#6366F1" },
                      ].map(x => (
                        <div key={x.label} style={{ background:x.bg, borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
                          <div style={{ fontSize:22, fontWeight:900, color:x.color, letterSpacing:"-0.5px" }}>{x.value}</div>
                          <div style={{ fontSize:10, color:x.color, opacity:.75, fontWeight:700 }}>{x.label}</div>
                        </div>
                      ))}
                    </div>
                    <Link href="/dashboard/admin/tasks/brands" style={{
                      display:"flex", alignItems:"center", justifyContent:"center", gap:7,
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

              {/* Today's Due Tasks */}
              <Panel>
                <PanelHead icon="bi-list-task" iconColor="#10B981" title="Today's Due Tasks"
                  badge={!loading && (s?.todayAssignments||[]).length>0 && <Chip n={s.todayAssignments.length} bg="#DCFCE7" text="#16A34A" />}
                />
                <div style={{ maxHeight:360, overflowY:"auto", padding:"6px 0" }}>
                  {loading ? <Skeleton /> : (s?.todayAssignments||[]).length===0 ? (
                    <Empty icon="bi-calendar-check-fill" color="#22C55E" msg="No tasks due today" />
                  ) : (
                    (s.todayAssignments).map((t, i) => {
                      const p  = PRIO[t.priority] || PRIO.low;
                      const st = ST[t.status]     || ST.todo;
                      return (
                        <Link key={i} href="/dashboard/admin/tasks/list" style={{ textDecoration:"none", display:"flex", alignItems:"flex-start", gap:10, padding:"10px 18px", borderBottom:"1px solid #F4F4FD", transition:"background .12s" }}
                          onMouseEnter={e => e.currentTarget.style.background="#FAFAFF"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}
                        >
                          <span style={{ width:8, height:8, borderRadius:"50%", background:p.dot, flexShrink:0, marginTop:5, boxShadow:`0 0 0 2px ${p.dot}33` }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                              {t.title}
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                              {t.assignee && (
                                <span style={{ fontSize:11, color:"#64748B", display:"flex", alignItems:"center", gap:3, fontWeight:600 }}>
                                  <i className="bi bi-person-fill" style={{ fontSize:10 }} />{t.assignee}
                                </span>
                              )}
                              {t.brand && (
                                <span style={{ fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:8, background:t.brand.color+"22", color:t.brand.color }}>
                                  {t.brand.name}
                                </span>
                              )}
                              <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:8, background:st.bg, color:st.text }}>{st.label}</span>
                              <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:8, background:p.bg, color:p.text }}>{t.priority}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
                <div style={{ padding:"10px 18px", borderTop:"1px solid #F4F4FD" }}>
                  <Link href="/dashboard/admin/tasks/list" style={{ fontSize:12, fontWeight:700, color:"#6366F1", textDecoration:"none" }}>
                    View all tasks →
                  </Link>
                </div>
              </Panel>
            </div>

            {/* ── ROW 4: Notices + Holidays + Live ───────────────── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 }}>

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
                      const isToday = new Date(h.date).toDateString()===new Date().toDateString();
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
                            {new Date(h.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                          </span>
                        </div>
                      );
                    })
                  }
                </div>
              </Panel>

              {/* Live Activity */}
              <Panel>
                <PanelHead icon="bi-activity" iconColor="#10B981" title="Live Activity"
                  badge={onlineCount>0 && <Chip n={`${onlineCount} online`} bg="#DCFCE7" text="#16A34A" />}
                />
                <div style={{ maxHeight:280, overflowY:"auto", padding:"6px 0" }}>
                  {Object.values(employeeStatus).length===0 ? <Empty icon="bi-wifi-off" color="#94A3B8" msg="No activity yet…" /> :
                    Object.values(employeeStatus).map(emp => (
                      <div key={emp.employeeId} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 18px", borderBottom:"1px solid #F4F4FD" }}>
                        <div style={{ position:"relative", flexShrink:0 }}>
                          <Avatar name={emp.name||"?"} bg={emp.status==="online"?"#DCFCE7":"#F3F4F6"} color={emp.status==="online"?"#16A34A":"#9CA3AF"} />
                          <span style={{
                            position:"absolute", bottom:0, right:0,
                            width:8, height:8, borderRadius:"50%", border:"2px solid #fff",
                            background:emp.status==="online"?"#22C55E":"#9CA3AF",
                          }} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{emp.name}</div>
                          <div style={{ fontSize:11, color:"#94A3B8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {emp.url || fmtTime(emp.lastActive)}
                          </div>
                        </div>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20, flexShrink:0,
                          background:emp.status==="online"?"#DCFCE7":"#F3F4F6",
                          color:     emp.status==="online"?"#16A34A":"#9CA3AF",
                        }}>{emp.status}</span>
                      </div>
                    ))
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
