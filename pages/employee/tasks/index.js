// pages/employee/tasks/index.js — Role-based TMS (light theme + full feature set)
import { useEffect, useState, useRef, useCallback } from "react";
import { useTaskSync } from "@/utils/hooks/useTaskSync";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/employee/Leftbar";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("employeeToken") || "" : "";
const authH    = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

function getTMSRole(emp) {
  const dept  = (emp?.professional?.department  || "").toLowerCase();
  const desig = (emp?.professional?.designation || "").toLowerCase();

  // Department takes priority — prevents designation keywords leaking into wrong role
  if (dept.includes("production"))                                          return "design";   // S2 queue
  if (dept.includes("content team") || dept.includes("content"))           return "content";  // S1 queue
  if (dept.includes("editing") || dept.includes("design team") || dept.includes("creative")) return "editor"; // S3
  if (dept.includes("digital marketing") || dept.includes("marketing"))    return "general";
  if (dept.includes("tech") || dept.includes("develop") || dept.includes("engineer")) return "developer";

  // Fall back to designation only if department gave no match
  if (desig.includes("content") || desig.includes("writer") || desig.includes("copywriter") || desig.includes("script")) return "content";
  if (desig.includes("design") || desig.includes("graphic") || desig.includes("ui") || desig.includes("ux")) return "design";
  if (desig.includes("edit") || desig.includes("video") || desig.includes("motion")) return "editor";
  if (desig.includes("develop") || desig.includes("engineer") || desig.includes("frontend") || desig.includes("backend")) return "developer";
  return "general";
}

function fmtD(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtDT(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const date = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const time = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

function isOverdue(d) {
  if (!d) return false;
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return x < n;
}

// Returns the most relevant deadline for a task — stage deadline first for production tasks
function getStageDeadline(task) {
  if (task?.taskType === "production" && task.stages?.length) {
    const deadlines = task.stages
      .filter(s => s.deadline && !s.done)
      .map(s => new Date(s.deadline));
    if (deadlines.length) return deadlines.reduce((a, b) => a < b ? a : b);
    // All stages done — use the earliest deadline anyway
    const all = task.stages.map(s => s.deadline).filter(Boolean).map(x => new Date(x));
    if (all.length) return all.reduce((a, b) => a < b ? a : b);
  }
  return task?.dueDate ? new Date(task.dueDate) : null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  content:   { label: "Content Writer", icon: "bi-pencil-square", ic: "#7C3AED", bg: "#EDE9FE", bannerBg: "#F5F3FF", bannerBorder: "#DDD6FE", queueLabel: "Script Queue",  queueStage: "S1", queueIcon: "bi-file-text" },
  design:    { label: "Designer",       icon: "bi-palette",       ic: "#1D4ED8", bg: "#DBEAFE", bannerBg: "#EFF6FF", bannerBorder: "#BFDBFE", queueLabel: "Design Queue",  queueStage: "S2", queueIcon: "bi-vector-pen" },
  editor:    { label: "Video Editor",   icon: "bi-scissors",      ic: "#B45309", bg: "#FEF3C7", bannerBg: "#FFFBEB", bannerBorder: "#FDE68A", queueLabel: "Edit Queue",    queueStage: "S3", queueIcon: "bi-camera-video" },
  developer: { label: "Developer",      icon: "bi-code-slash",    ic: "#065F46", bg: "#D1FAE5", bannerBg: "#ECFDF5", bannerBorder: "#6EE7B7", queueLabel: "Dev Tasks",     queueStage: "",   queueIcon: "bi-kanban" },
  general:   { label: "Team Member",    icon: "bi-person-badge",  ic: "#374151", bg: "#F3F4F6", bannerBg: "#F9FAFB", bannerBorder: "#E5E7EB", queueLabel: "My Queue",      queueStage: "",   queueIcon: "bi-list-task" },
};

const STATUS_MAP   = { todo: { label: "To Do", cls: "tms-badge-todo" }, in_progress: { label: "In Progress", cls: "tms-badge-inprogress" }, review: { label: "In Review", cls: "tms-badge-review" }, completed: { label: "Completed", cls: "tms-badge-completed" }, blocked: { label: "Rejected", cls: "tms-badge-blocked" } };
const STAGE_COLOR  = { S1: "#7C3AED", S2: "#1D4ED8", S3: "#B45309", S4: "#065F46" };
// Pipeline stage fill colors — S1=orange, S2=blue, S3=yellow, S4=green
const STAGE_FILL   = ["#F97316", "#3B82F6", "#EAB308", "#22C55E"];
function getTaskStageStyle(task) {
  const stages = task?.stages || [];
  const hasAssignee = s => Array.isArray(s?.assignedTo) ? s.assignedTo.length > 0 : !!s?.assignedTo;
  for (let i = 3; i >= 0; i--) { if (stages[i]?.approved) { const c = STAGE_FILL[i]; return { bg: c, border: c, color: "#fff" }; } }
  for (let i = 3; i >= 0; i--) { if (hasAssignee(stages[i]) && !stages[i]?.approved) { const c = STAGE_FILL[i]; return { bg: "#fff", border: c, color: "#1E293B" }; } }
  return { bg: "#F1F5F9", border: "#D1D5DB", color: "#9CA3AF" };
}
const STAGE_LABEL  = { S1: "Script/Concept", S2: "Shoot/Design", S3: "Edit/Develop", S4: "Posted/Live" };
const CTYPE_COLOR  = { reel: "#7C3AED", post: "#1D4ED8", carousel: "#B45309", story: "#065F46", blog: "#DB2777" };
const PILLAR_OPTS  = ["Education", "Entertainment", "Inspiration", "Promotion", "Behind the Scenes", "Testimonial", "Product Feature"];

const TABS_BY_ROLE = {
  content:   ["dashboard", "tasks", "editor", "weekly", "mycal", "library", "submissions", "performance"],
  design:    ["dashboard", "tasks", "queue",  "weekly", "brandcal", "performance"],
  editor:    ["dashboard", "tasks", "queue",  "weekly", "brandcal", "performance"],
  developer: ["dashboard", "tasks", "board",  "performance"],
  general:   ["dashboard", "tasks", "weekly", "performance"],
};

const TAB_META = {
  dashboard:   { label: "Dashboard",      icon: "bi-grid-1x2" },
  tasks:       { label: "My Tasks",       icon: "bi-list-task" },
  editor:      { label: "Content Editor", icon: "bi-pencil-square" },
  brandcal:    { label: "Brand Calendar", icon: "bi-calendar3" },
  weekly:      { label: "Weekly Tracker", icon: "bi-calendar-week" },
  mycal:       { label: "My Calendar",    icon: "bi-calendar2-week" },
  library:     { label: "Script Library", icon: "bi-collection" },
  submissions: { label: "Submissions",    icon: "bi-send-check" },
  performance: { label: "My Performance", icon: "bi-graph-up" },
  queue:       { label: "Design/Edit Queue", icon: "bi-vector-pen" },
  board:       { label: "Sprint Board",   icon: "bi-kanban" },
  calendar:    { label: "Brand Calendar", icon: "bi-calendar3" },
};

// ─── Stage Dots ───────────────────────────────────────────────────────────────
function StageDots({ stage, size = 22 }) {
  const idx = ["S1", "S2", "S3", "S4"].indexOf(stage);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} title={`Stage ${i + 1} · ${STAGE_LABEL[`S${i + 1}`]}`} style={{
          width: size, height: size, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: Math.max(8, size * 0.4), fontWeight: 800, flexShrink: 0,
          background: i < idx ? "#D1FAE5"
            : i === idx ? STAGE_COLOR[`S${i + 1}`]
            : i === idx + 1 ? STAGE_COLOR[`S${i + 1}`] + "22"
            : "#F3F4F6",
          color: i < idx ? "#065F46"
            : i === idx ? "#fff"
            : i === idx + 1 ? STAGE_COLOR[`S${i + 1}`]
            : "#9CA3AF",
          border: i === idx ? "2px solid rgba(0,0,0,0.15)" : "none",
        }}>{i + 1}</div>
      ))}
    </div>
  );
}

// ─── Employee Stage Pips — shows only this employee's assigned stages ─────────
function EmployeeStagePips({ task, empId, size = 22 }) {
  const STAGE_KEYS = ["S1", "S2", "S3", "S4"];
  const STAGE_FILL = { S1: "#F97316", S2: "#3B82F6", S3: "#EAB308", S4: "#22C55E" };
  const stages = task.stages || [];

  let myIndices = stages.reduce((acc, s, i) => {
    const ids = Array.isArray(s.assignedTo) ? s.assignedTo : (s.assignedTo ? [s.assignedTo] : []);
    const isAssigned = empId && ids.some(a => {
      const aid = a?._id ? String(a._id) : String(a || "");
      return aid === String(empId);
    });
    if (isAssigned) acc.push(i);
    return acc;
  }, []);

  if (myIndices.length === 0 && task.stage) {
    const fi = STAGE_KEYS.indexOf(task.stage);
    if (fi >= 0) myIndices = [fi];
  }
  if (myIndices.length === 0) return <span style={{ color: "#D1D5DB", fontSize: 11 }}>—</span>;

  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {myIndices.map(i => {
        const s = stages[i];
        const key = STAGE_KEYS[i];
        const color = STAGE_FILL[key];
        const approved = !!s?.approved;
        const inReview = !!s?.done && !approved && !s?.rejected;

        let bg = "#fff", textColor = color, icon = String(i + 1);
        if (approved) { bg = color; textColor = "#fff"; icon = "✓"; }
        else if (inReview) { bg = color + "18"; icon = "⏳"; }

        return (
          <div key={i} title={`${key} · ${STAGE_LABEL[key]}`}
            style={{
              width: size, height: size, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: icon === "⏳" ? Math.max(7, size * 0.36) : Math.max(8, size * 0.42),
              fontWeight: 800, flexShrink: 0,
              background: bg, color: textColor,
              border: `2px solid ${color}`,
              boxShadow: approved ? `0 0 0 2px ${color}33` : "none",
            }}>
            {icon}
          </div>
        );
      })}
    </div>
  );
}

// ─── TaskRow (used in Dashboard) ─────────────────────────────────────────────
function TaskRow({ task }) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const due = task.dueDate ? (() => {
    const d = new Date(task.dueDate); d.setHours(0, 0, 0, 0);
    const diff = Math.round((d - now) / 86400000);
    if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, cls: "tms-badge-overdue" };
    if (diff === 0) return { label: "Due today", cls: "tms-badge-today" };
    if (diff === 1) return { label: "Due tomorrow", cls: "" };
    return { label: fmtD(task.dueDate), cls: "" };
  })() : null;

  const status = STATUS_MAP[task.status] || { label: task.status, cls: "tms-badge-todo" };

  return (
    <div className="tms-task-item">
      <div className="tms-task-info">
        <div className="tms-task-title">{task.nomenclature || task.title}</div>
        <div className="tms-task-meta">
          <span className={`tms-badge ${status.cls}`}>{status.label}</span>
          {task.stage && (
            <span className="tms-badge" style={{ background: STAGE_COLOR[task.stage] + "22", color: STAGE_COLOR[task.stage] }}>
              {task.stage} · {STAGE_LABEL[task.stage]}
            </span>
          )}
          {task.contentType && (
            <span className="tms-badge" style={{ background: (CTYPE_COLOR[task.contentType] || "#6366F1") + "22", color: CTYPE_COLOR[task.contentType] || "#6366F1" }}>{task.contentType}</span>
          )}
          {task.brandId && (
            <span className="tms-brand-chip">
              <span className="tms-brand-dot" style={{ background: task.brandId.color || "#6366F1" }} />
              {task.brandId.name}
            </span>
          )}
        </div>
      </div>
      {due && (
        <div className="tms-task-right">
          <span className={`tms-due ${due.cls}`}><i className="bi bi-clock" /> {due.label}</span>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function DashboardTab({ employee, tasks, role, switchTab }) {
  const config  = ROLE_CONFIG[role];
  const now     = new Date(); now.setHours(0, 0, 0, 0);

  // ── Content-team portal-style Today view ────────────────────────────────────
  if (role === "content") {
    function effDL(t) { const sd = getStageDeadline(t); return sd || (t.dueDate ? new Date(t.dueDate) : null); }
    const overdue   = tasks.filter(t => { const d = effDL(t); return d && isOverdue(d) && t.status !== "completed"; });
    const dueToday  = tasks.filter(t => { const d = effDL(t); return d && isDueToday(d) && t.status !== "completed"; });
    const doneWeek  = tasks.filter(t => t.status === "completed" && new Date(t.updatedAt) >= new Date(Date.now() - 7*86400000));
    const active    = tasks.filter(t => t.status !== "completed");
    const upcoming  = tasks.filter(t => {
      if (t.status === "completed") return false;
      const d = effDL(t); if (!d) return false;
      const dc = new Date(d); dc.setHours(0,0,0,0);
      const diff = Math.round((dc - now) / 86400000);
      return diff > 0 && diff <= 7;
    });
    const grade     = calcGrade(filterTasksByMonth(tasks, now.getMonth(), now.getFullYear()));
    const todayList = [...new Map([...overdue, ...dueToday].map(t => [t._id, t])).values()];

    const CTASK_STATUS = { todo:"To Do", in_progress:"In Progress", review:"Under Review", completed:"Approved", blocked:"Rejected" };
    const CTASK_COLOR  = { todo:"#6B7280", in_progress:"#1D4ED8", review:"#B45309", completed:"#16A34A", blocked:"#DC2626" };
    const CTASK_BG     = { todo:"#F3F4F6", in_progress:"#DBEAFE", review:"#FEF3C7", completed:"#DCFCE7", blocked:"#FEE2E2" };

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {/* Hero gradient banner */}
        <div style={{ background:"linear-gradient(135deg,#1e1b4b 0%,#4F46E5 55%,#7C3AED 100%)", borderRadius:16, padding:"28px 32px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-80, right:-80, width:260, height:260, background:"radial-gradient(circle,rgba(90,87,251,.3),transparent 70%)", pointerEvents:"none" }} />
          <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginBottom:6 }}>{getGreeting()}, {employee?.personal?.firstName || "there"} 👋</div>
          <div style={{ fontSize:26, fontWeight:800, color:"#fff", letterSpacing:"-.01em", lineHeight:1.2, marginBottom:10 }}>
            You're at <span style={{ background:"linear-gradient(90deg,#FF6F61,#FBA065)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{grade.letter}</span> this month
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.7)", marginBottom:22, lineHeight:1.55 }}>
            You have <strong style={{ color:"#fff" }}>{grade.total} task{grade.total!==1?"s":""}</strong> this month
            {overdue.length>0 && <> — <strong style={{ color:"#fca5a5" }}>{overdue.length} overdue</strong></>}
            {todayList.length>0 && <>, <strong style={{ color:"#fde68a" }}>{todayList.length} due today</strong></>}.
            {" "}Submit on time to lock in your grade.
          </div>
          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              { lbl:"Total Tasks",   val:grade.total,                trend: overdue.length>0 ? <span style={{ color:"#fca5a5",fontSize:11 }}>{overdue.length} overdue</span> : <span style={{ color:"rgba(255,255,255,.7)",fontSize:11 }}>this month</span>, color:"#fff" },
              { lbl:"Completed",     val:grade.completed,            trend:<span style={{ color:"#86efac",fontSize:11 }}>{grade.total>0?Math.round(grade.completed/grade.total*100):0}% done</span>, color:"#86efac" },
              { lbl:"Rating",        val:`${grade.rating}/5`,        trend:<span style={{ color:grade.color,fontSize:11 }}>{grade.letter} Grade</span>, color:grade.color },
              { lbl:"On-Time",       val:`${grade.rate}%`,           trend:<span style={{ color:grade.rate>=80?"#86efac":"#fcd34d",fontSize:11 }}>{grade.rate>=80?"↑ Good":"↓ Improve"}</span>, color:grade.rate>=80?"#86efac":"#fcd34d" },
            ].map(s => (
              <div key={s.lbl} style={{ background:"rgba(255,255,255,.1)", borderRadius:10, padding:"12px 14px", backdropFilter:"blur(8px)" }}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.6)", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600, marginBottom:6 }}>{s.lbl}</div>
                <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ marginTop:4 }}>{s.trend}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue alert */}
        {overdue.length > 0 && (
          <div style={{ background:"#FFF7ED", border:"1.5px solid #FED7AA", borderRadius:10, padding:"12px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:18 }}>⚠️</span>
            <div style={{ flex:1, fontSize:13, color:"#92400E" }}>
              <strong>"{overdue[0].nomenclature || overdue[0].title}"</strong> is overdue.
              {overdue[0].brandId?.name && ` ${overdue[0].brandId.name} needs this — submit now to minimize grade impact.`}
            </div>
            <button onClick={() => switchTab("editor")}
              style={{ background:"none", border:"1.5px solid #D97706", borderRadius:7, padding:"5px 14px", fontSize:12, fontWeight:700, color:"#B45309", cursor:"pointer" }}>
              Submit Now
            </button>
          </div>
        )}

        {/* Today's Tasks */}
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:"#0f172a", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
            📌 Today's Tasks <span style={{ background:"#EEF2FF", color:"#4F46E5", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700 }}>{todayList.length}</span>
          </div>
          {todayList.length === 0 ? (
            <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:12, padding:"32px", textAlign:"center", color:"#9CA3AF" }}>
              <i className="bi bi-check2-all" style={{ fontSize:32, display:"block", marginBottom:10 }} />
              No tasks due today — great work!
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              {todayList.map(t => {
                const od = isOverdue(effDL(t));
                const dl = effDL(t);
                return (
                  <div key={t._id} style={{ background:"#fff", border:`1.5px solid ${od?"#FCA5A5":"#E5E7EB"}`, borderRadius:12, padding:"16px 18px", display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                      <span style={{ fontFamily:"monospace", fontSize:10, color:"#7C3AED", fontWeight:700 }}>#{t._id?.slice(-4)}</span>
                      {t.brandId && <span style={{ padding:"2px 9px", borderRadius:20, background:(t.brandId.color||"#6366F1")+"20", color:t.brandId.color||"#6366F1", fontSize:10, fontWeight:700 }}>{t.brandId.name}</span>}
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#111", lineHeight:1.3 }}>{t.nomenclature || t.title}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      {t.contentType && <span style={{ fontSize:11, background:"#F3F4F6", color:"#6B7280", padding:"2px 8px", borderRadius:6, fontWeight:600, textTransform:"capitalize", display:"flex", alignItems:"center", gap:4 }}>
                        <i className="bi bi-camera-video-fill" style={{ fontSize:9 }} />{t.contentType}
                      </span>}
                      {dl && <span style={{ fontSize:11, color:od?"#DC2626":"#6B7280", fontWeight:od?700:400, display:"flex", alignItems:"center", gap:4 }}>
                        <i className="bi bi-clock" style={{ fontSize:9 }} />{od ? `${Math.abs(Math.round((now-dl)/86400000))}d overdue` : fmtD(dl)}
                      </span>}
                    </div>
                    <div style={{ padding:"10px 14px", borderRadius:8, background:CTASK_BG[t.status]||"#F3F4F6", textAlign:"center", fontSize:12, fontWeight:700, color:CTASK_COLOR[t.status]||"#6B7280", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                      {t.status === "review" && <i className="bi bi-hourglass-split" style={{ fontSize:11 }} />}
                      {t.status === "completed" && <i className="bi bi-check-circle-fill" style={{ fontSize:11 }} />}
                      {CTASK_STATUS[t.status] || t.status}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coming Up This Week */}
        {upcoming.length > 0 && (
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:"#0f172a", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
              📅 Coming Up This Week <span style={{ background:"#EEF2FF", color:"#4F46E5", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700 }}>{upcoming.length}</span>
            </div>
            <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:12, overflow:"hidden" }}>
              {upcoming.map((t, i) => {
                const dl = effDL(t);
                const diff = dl ? Math.round((new Date(dl).setHours(0,0,0,0) - now) / 86400000) : null;
                return (
                  <div key={t._id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom: i < upcoming.length-1 ? "1px solid #F3F4F6" : "none" }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:"#EEF2FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <i className="bi bi-calendar3" style={{ color:"#4F46E5", fontSize:14 }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:"#1E293B", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.nomenclature || t.title}</div>
                      {t.brandId && <div style={{ fontSize:11, color:"#9CA3AF" }}>{t.brandId.name}</div>}
                    </div>
                    {diff !== null && <span style={{ fontSize:11, fontWeight:700, color:"#4F46E5", background:"#EEF2FF", padding:"3px 10px", borderRadius:20, whiteSpace:"nowrap" }}>
                      {diff === 1 ? "Tomorrow" : `In ${diff}d`}
                    </span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
  // ── End content-team portal view ─────────────────────────────────────────────

  const todayT  = tasks.filter(t => { if (!t.dueDate) return false; const d = new Date(t.dueDate); d.setHours(0,0,0,0); return d.getTime() === now.getTime() && t.status !== "completed"; });
  const overdue = tasks.filter(t => { if (!t.dueDate) return false; const d = new Date(t.dueDate); d.setHours(0,0,0,0); return d < now && t.status !== "completed"; });
  const active  = tasks.filter(t => t.status === "in_progress");
  const review  = tasks.filter(t => t.status === "review");
  const done    = tasks.filter(t => t.status === "completed");
  const queue   = config.queueStage
    ? tasks.filter(t => t.stage === config.queueStage && t.status !== "completed")
    : tasks.filter(t => t.status !== "completed");

  const stats = [
    { icon: "bi-list-task",     bg: "#EEF2FF", ic: "#4F46E5", val: tasks.length,  label: "Total Assigned" },
    { icon: "bi-clock-history", bg: "#FEF3C7", ic: "#D97706", val: todayT.length, label: "Due Today" },
    { icon: "bi-arrow-repeat",  bg: "#DBEAFE", ic: "#1D4ED8", val: active.length, label: "In Progress" },
    { icon: "bi-check-circle",  bg: "#D1FAE5", ic: "#065F46", val: done.length,   label: "Completed" },
  ];

  return (
    <>
      <div className="tms-role-banner" style={{ background: config.bannerBg, border: `1.5px solid ${config.bannerBorder}` }}>
        <div className="tms-role-icon" style={{ background: config.bg }}>
          <i className={`bi ${config.icon}`} style={{ color: config.ic }} />
        </div>
        <div>
          <p className="tms-role-label">{config.label}</p>
          <p className="tms-role-sub">
            {config.queueStage ? `Queue: ${config.queueLabel} (Stage ${config.queueStage})` : `Queue: ${config.queueLabel}`}
            {overdue.length > 0 && <span style={{ marginLeft: 10, color: "#DC2626", fontWeight: 700 }}>· {overdue.length} overdue!</span>}
          </p>
        </div>
      </div>

      <div className="tms-stats">
        {stats.map((s, i) => (
          <div key={i} className="tms-stat">
            <div className="tms-stat-icon" style={{ background: s.bg }}>
              <i className={`bi ${s.icon}`} style={{ color: s.ic }} />
            </div>
            <div>
              <div className="tms-stat-val">{s.val}</div>
              <div className="tms-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tms-grid-2">
        <div>
          <div className="tms-card">
            <div className="tms-card-header">
              <h6><i className={`bi ${config.queueIcon}`} style={{ color: config.ic }} /> {config.queueLabel}</h6>
              <span className="tms-count-pill">{queue.length}</span>
            </div>
            <div className="tms-card-body no-pad">
              {queue.length === 0 ? (
                <div className="tms-empty"><i className="bi bi-check2-all" /><p>All clear!</p></div>
              ) : queue.slice(0, 6).map(t => <TaskRow key={t._id} task={t} />)}
            </div>
          </div>
          {todayT.length > 0 && (
            <div className="tms-card">
              <div className="tms-card-header">
                <h6><i className="bi bi-alarm" style={{ color: "#D97706" }} /> Due Today</h6>
                <span className="tms-count-pill" style={{ background: "#FEF3C7", color: "#B45309" }}>{todayT.length}</span>
              </div>
              <div className="tms-card-body no-pad">{todayT.map(t => <TaskRow key={t._id} task={t} />)}</div>
            </div>
          )}
          {overdue.length > 0 && (
            <div className="tms-card">
              <div className="tms-card-header">
                <h6><i className="bi bi-exclamation-triangle-fill" style={{ color: "#DC2626" }} /> Overdue</h6>
                <span className="tms-count-pill" style={{ background: "#FEE2E2", color: "#DC2626" }}>{overdue.length}</span>
              </div>
              <div className="tms-card-body no-pad">{overdue.map(t => <TaskRow key={t._id} task={t} />)}</div>
            </div>
          )}
        </div>
        <div>
          <div className="tms-card">
            <div className="tms-card-header">
              <h6><i className="bi bi-arrow-repeat" style={{ color: "#1D4ED8" }} /> In Progress</h6>
              <span className="tms-count-pill">{active.length}</span>
            </div>
            <div className="tms-card-body no-pad">
              {active.length === 0
                ? <div className="tms-empty" style={{ padding: "24px 16px" }}><i className="bi bi-play-circle" style={{ fontSize: 28 }} /><p>No tasks in progress</p></div>
                : active.slice(0, 5).map(t => <TaskRow key={t._id} task={t} />)}
            </div>
          </div>
          <div className="tms-card">
            <div className="tms-card-header">
              <h6><i className="bi bi-eye" style={{ color: "#B45309" }} /> In Review</h6>
              <span className="tms-count-pill" style={{ background: "#FEF3C7", color: "#B45309" }}>{review.length}</span>
            </div>
            <div className="tms-card-body no-pad">
              {review.length === 0
                ? <div className="tms-empty" style={{ padding: "24px 16px" }}><i className="bi bi-eye-slash" style={{ fontSize: 28 }} /><p>Nothing under review</p></div>
                : review.slice(0, 5).map(t => <TaskRow key={t._id} task={t} />)}
            </div>
          </div>
          {role === "content" && (
            <div className="tms-card">
              <div className="tms-card-header">
                <h6><i className="bi bi-lightbulb" style={{ color: "#D97706" }} /> Writing Tips</h6>
              </div>
              <div className="tms-card-body">
                {["Hook in the first 3 seconds.", "One idea per reel.", "End with a clear CTA.", "Captions under 150 chars."].map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: "#7C3AED", fontWeight: 700 }}>0{i + 1}</span>
                    <span style={{ color: "#6B7280" }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── MY TASKS TAB ─────────────────────────────────────────────────────────────
function MyTasksTab({ tasks, openInEditor, empId }) {
  const [brandF,  setBrandF]  = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem("mtab_brand")  : null) || "");
  const [typeF,   setTypeF]   = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem("mtab_type")   : null) || "");
  const [statusF, setStatusF] = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem("mtab_status") : null) || "");

  const brands = [...new Map(tasks.filter(t => t.brandId).map(t => [t.brandId._id, t.brandId])).values()];
  const types  = [...new Set(tasks.map(t => t.contentType).filter(Boolean))];

  // Compute stage-aware status key for a task (matches what the Status column actually displays)
  function getMyStatus(t) {
    const stagesArr = t.stages || [];
    let myIdx = empId ? stagesArr.findIndex(s => {
      const ids = Array.isArray(s.assignedTo) ? s.assignedTo : (s.assignedTo ? [s.assignedTo] : []);
      return ids.some(a => (a?._id ? String(a._id) : String(a || "")) === String(empId));
    }) : -1;
    if (myIdx < 0 && t.stage) { const fi = ["S1","S2","S3","S4"].indexOf(t.stage); if (fi >= 0) myIdx = fi; }
    const ms = myIdx >= 0 ? stagesArr[myIdx] : null;
    if (ms) {
      if (ms.approved)              return "approved";
      if (ms.done && !ms.rejected)  return "pending_review";
      if (ms.rejected)              return "rejected";
    }
    return t.status || "todo";
  }

  const STAGE_STATUS_OPTIONS = [
    { value: "todo",           label: "To Do" },
    { value: "in_progress",    label: "In Progress" },
    { value: "pending_review", label: "Pending Review" },
    { value: "approved",       label: "Approved" },
    { value: "rejected",       label: "Rejected" },
  ];

  const filtered = tasks.filter(t => {
    if (brandF  && t.brandId && String(t.brandId?._id) !== brandF)  return false;
    if (typeF   && t.contentType  !== typeF)                         return false;
    if (statusF && getMyStatus(t) !== statusF)                       return false;
    return true;
  });

  const selStyle = { padding: "8px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, outline: "none", cursor: "pointer", background: "#fff" };

  return (
    <>
      {/* Brand dropdown */}
      {brands.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          {(() => { const sel = brands.find(b => String(b._id) === brandF); return sel ? <span style={{ width:10, height:10, borderRadius:"50%", background:sel.color||"#6366F1", display:"inline-block", flexShrink:0 }} /> : null; })()}
          <select value={brandF} onChange={e => { setBrandF(e.target.value); sessionStorage.setItem("mtab_brand", e.target.value); }}
            style={{ padding:"7px 12px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:13, fontWeight:600, color:"#374151", outline:"none", cursor:"pointer", background:"#fff" }}>
            <option value="">All Brands</option>
            {brands.map(b => <option key={b._id} value={String(b._id)}>{b.name}</option>)}
          </select>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <select value={typeF} onChange={e => { setTypeF(e.target.value); sessionStorage.setItem("mtab_type", e.target.value); }} style={selStyle}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusF} onChange={e => { setStatusF(e.target.value); sessionStorage.setItem("mtab_status", e.target.value); }} style={selStyle}>
          <option value="">All Status</option>
          {STAGE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF" }}>{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="tms-empty"><i className="bi bi-inbox" style={{ fontSize: 36 }} /><p>No tasks found</p></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
                  {["#", "Task", "Brand", "Type", "Stage", "Deadline", "Status", "Submitted", "Action"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => {
                  // Compute employee's assigned stage for this task
                  const stagesArr = t.stages || [];
                  let myStageIdx = empId ? stagesArr.findIndex(s => {
                    const ids = Array.isArray(s.assignedTo) ? s.assignedTo : (s.assignedTo ? [s.assignedTo] : []);
                    return ids.some(a => (a?._id ? String(a._id) : String(a || "")) === String(empId));
                  }) : -1;
                  if (myStageIdx < 0 && t.stage) { const fi = ["S1","S2","S3","S4"].indexOf(t.stage); if (fi >= 0) myStageIdx = fi; }
                  const myStage = myStageIdx >= 0 ? stagesArr[myStageIdx] : null;

                  // Stage-aware status — use getMyStatus() so filter and display stay in sync
                  const myStatusKey = getMyStatus(t);
                  const STATUS_DISPLAY = {
                    approved:       { bg: "#ECFDF5", color: "#15803D", label: "Approved" },
                    pending_review: { bg: "#FFFBEB", color: "#B45309", label: "Pending Review" },
                    rejected:       { bg: "#FEF2F2", color: "#DC2626", label: "Rejected" },
                  };
                  const stageStatusMeta = STATUS_DISPLAY[myStatusKey] || null;
                  const rawStatusMeta   = STATUS_MAP[t.status] || STATUS_MAP.todo;

                  // Submission datetime: stage doneAt (production) or task submittedAt
                  const submittedAt = myStage?.doneAt || t.submittedAt;

                  return (
                    <tr key={t._id} style={{ borderBottom: "1px solid #F5F5F5" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "13px 14px", color: "#9CA3AF", fontSize: 11, fontFamily: "monospace" }}>{String(idx + 1).padStart(3, "0")}</td>
                      <td style={{ padding: "13px 14px", maxWidth: 240 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nomenclature || t.title || "Untitled"}</div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        {t.brandId ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 20, background: t.brandId.color + "20", fontSize: 11, fontWeight: 700, color: t.brandId.color, whiteSpace: "nowrap" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.brandId.color, display: "inline-block" }} />
                            {t.brandId.name}
                          </span>
                        ) : <span style={{ color: "#D1D5DB" }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        {t.taskType === "project"
                          ? <span style={{ padding: "2px 8px", borderRadius: 4, background: "#EEF2FF", color: "#4F46E5", fontSize: 11, fontWeight: 700 }}>Feature</span>
                          : t.taskType === "sprint"
                            ? <span style={{ padding: "2px 8px", borderRadius: 4, background: "#F3E8FF", color: "#7C3AED", fontSize: 11, fontWeight: 700 }}>Sprint</span>
                            : t.taskType === "general"
                              ? <span style={{ padding: "2px 8px", borderRadius: 4, background: "#F0F9FF", color: "#0EA5E9", fontSize: 11, fontWeight: 700 }}>General</span>
                              : t.contentType
                                ? <span style={{ padding: "2px 8px", borderRadius: 4, background: (CTYPE_COLOR[t.contentType] || "#6366F1") + "22", color: CTYPE_COLOR[t.contentType] || "#6366F1", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.contentType}</span>
                                : <span style={{ color: "#D1D5DB" }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 14px" }}><EmployeeStagePips task={t} empId={empId} size={22} /></td>
                      {(() => {
                        const dl = myStage?.deadline ? new Date(myStage.deadline) : getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null);
                        const doneOrApproved = myStatusKey === "approved" || !!myStage?.approved || !!myStage?.done;
                        const submittedOnTime = doneOrApproved && (!submittedAt || !dl || new Date(submittedAt) <= dl);
                        const showLate = dl ? isOverdue(dl) && !submittedOnTime : false;

                        let lateText = "";
                        if (!submittedOnTime && doneOrApproved && submittedAt && dl) {
                          const lateMs = new Date(submittedAt) - dl;
                          if (lateMs > 0) {
                            if (lateMs < 3600000) {
                              lateText = `${Math.ceil(lateMs / 60000)}m late`;
                            } else if (lateMs < 86400000) {
                              const h = Math.floor(lateMs / 3600000);
                              const m = Math.round((lateMs % 3600000) / 60000);
                              lateText = m > 0 ? `${h}h ${m}m late` : `${h}h late`;
                            } else {
                              const days = Math.floor(lateMs / 86400000);
                              lateText = days === 1 ? "1d late" : `${days}d late`;
                            }
                          }
                        }

                        return (
                          <td style={{ padding: "13px 14px", fontSize: 11, color: showLate ? "#DC2626" : "#374151", fontWeight: showLate ? 700 : 400, whiteSpace: "nowrap" }}>
                            {showLate && (
                              <span style={{ background: doneOrApproved ? "#EF444422" : "#EF4444", color: doneOrApproved ? "#EF4444" : "#fff", fontSize: 9, fontWeight: 800, borderRadius: 20, padding: "1px 6px", marginRight: 5 }}>LATE</span>
                            )}
                            {lateText && <span style={{ marginRight: 4 }}>{lateText}</span>}
                            {dl ? fmtDT(dl) : "—"}
                          </td>
                        );
                      })()}
                      <td style={{ padding: "13px 14px" }}>
                        {stageStatusMeta
                          ? <span style={{ display:"inline-block", padding:"3px 9px", borderRadius:5, fontSize:11, fontWeight:700, background:stageStatusMeta.bg, color:stageStatusMeta.color, whiteSpace:"nowrap" }}>{stageStatusMeta.label}</span>
                          : <span className={`tms-badge ${rawStatusMeta.cls || "tms-badge-todo"}`}>{rawStatusMeta.label}</span>
                        }
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>
                        {submittedAt ? fmtDT(new Date(submittedAt)) : <span style={{ color: "#D1D5DB" }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <button onClick={() => openInEditor(t)} style={{
                          padding: "5px 14px", borderRadius: 7, border: "1.5px solid #7C3AED",
                          background: "#F5F3FF", color: "#7C3AED", fontSize: 12, fontWeight: 700,
                          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                          transition: "all .15s",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#7C3AED"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#F5F3FF"; e.currentTarget.style.color = "#7C3AED"; }}>
                          View <i className="bi bi-arrow-right" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── CONTENT EDITOR TAB ───────────────────────────────────────────────────────
function ContentEditorTab({ tasks, initialTask, onBack }) {
  const scriptTasks = tasks.filter(t => t.taskType === "production" || t.taskType === "project" || t.taskType === "sprint" || t.stage || t.taskType === "general" || t.taskType === "manual" || t.tags?.includes("general"));
  const [task,     setTask]     = useState(initialTask || scriptTasks[0] || null);
  const [pillar,        setPillar]        = useState("");
  const [customPillars, setCustomPillars] = useState(() => { try { return JSON.parse(localStorage.getItem("ep_custom_pillars") || "[]"); } catch { return []; } });
  const [addingPillar,  setAddingPillar]  = useState(false);
  const [newPillarText, setNewPillarText] = useState("");
  const [refLink,  setRefLink]  = useState("");
  const [script,   setScript]   = useState("");
  const [caption,  setCaption]  = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags,     setTags]     = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved,  setLastSaved]  = useState(null);
  const debounceRef = useRef(null);
  const taskIdx = scriptTasks.findIndex(t => t._id === task?._id);

  useEffect(() => {
    if (initialTask) loadTask(initialTask);
    else if (scriptTasks[0] && !task) loadTask(scriptTasks[0]);
  }, [initialTask?._id]);

  function loadTask(t) {
    setTask(t);
    setPillar(t.pillar || "");
    setRefLink(t.referenceLink || "");
    setScript(t.description || "");
    setCaption(t.caption || "");
    setTags(t.tags || []);
    setLastSaved(null);
  }

  function navTask(dir) {
    const ni = taskIdx + dir;
    if (ni >= 0 && ni < scriptTasks.length) loadTask(scriptTasks[ni]);
  }

  async function saveTask(silent = false) {
    if (!task) return;
    if (task.status === "review" || task.status === "completed") return;
    setSaving(true);
    try {
      const r = await fetch(`/api/employee/tasks/${task._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ description: script, caption, referenceLink: refLink, tags }),
      });
      const d = await r.json();
      if (d.success) {
        if (!silent) toast.success("Draft saved!");
        setLastSaved(new Date());
        setTask(prev => ({ ...prev, description: script, caption, referenceLink: refLink, tags }));
      } else if (!silent) toast.error(d.message || "Save failed");
    } catch { if (!silent) toast.error("Save failed"); }
    setSaving(false);
  }

  async function submitForReview() {
    if (!task) return;
    const isProduction = task.taskType === "production" && (task.stages?.length > 0);
    // Script/Content only mandatory for production tasks
    if (isProduction && !script.trim()) { toast.error("Script / Content is required before submitting."); return; }
    const s0 = task.stages?.[0];
    // Already submitted check
    if (isProduction && s0?.done && !s0?.rejected) { toast.info("Already submitted — awaiting admin review."); return; }
    if (!isProduction && task.status === "review") { toast.info("Already submitted — awaiting admin review."); return; }
    if (task.status === "completed") return;
    setSubmitting(true);
    try {
      // Step 1: Save content fields so admin can see script/caption/tags
      await fetch(`/api/employee/tasks/${task._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ description: script, caption, referenceLink: refLink, pillar, tags, submittedAt: new Date() }),
      });

      if (isProduction) {
        // Step 2: Mark S1 stage as done — Content Editor is always S1 (Script/Concept)
        const r = await fetch("/api/employee/stage-submit", {
          method: "POST", headers: authH(),
          body: JSON.stringify({ taskId: task._id, proofUrl: "", notes: "", stageKey: "S1" }),
        });
        const d = await r.json();
        if (d.success) {
          toast.success("Script submitted for review!");
          setTask(d.task);
          setLastSaved(new Date());
        } else toast.error(d.message || "Submit failed");
      } else {
        // Non-production: just mark task status as review
        const r = await fetch(`/api/employee/tasks/${task._id}`, {
          method: "PATCH", headers: authH(),
          body: JSON.stringify({ status: "review" }),
        });
        const d = await r.json();
        if (d.success) {
          toast.success("Submitted for review!");
          setTask(prev => ({ ...prev, status: "review", description: script, caption, referenceLink: refLink, pillar, tags }));
          setLastSaved(new Date());
        } else toast.error(d.message || "Submit failed");
      }
    } catch { toast.error("Submit failed"); }
    setSubmitting(false);
  }

  function onScriptChange(v) {
    setScript(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveTask(true), 3000);
  }

  function addTag(e) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const v = tagInput.trim().replace(/^#/, "");
      if (v && !tags.includes(v)) {
        const newTags = [...tags, v];
        setTags(newTags);
        setTagInput("");
        // Save immediately so hashtags persist without needing a manual save
        if (task && task.status !== "review" && task.status !== "completed") {
          fetch(`/api/employee/tasks/${task._id}`, {
            method: "PATCH", headers: authH(),
            body: JSON.stringify({ description: script, caption, referenceLink: refLink, tags: newTags }),
          }).then(r => r.json()).then(d => { if (d.success) setLastSaved(new Date()); }).catch(() => {});
        }
      } else {
        setTagInput("");
      }
    }
  }

  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const narration = wordCount > 0 ? `~${Math.round(wordCount / 130)} min` : null;
  const nextStages = ["S1","S2","S3","S4"];
  const curStageIdx = task?.stage ? nextStages.indexOf(task.stage) : -1;

  const brandVoice = [
    "Hook within the first 3 seconds",
    "Use a conversational, relatable tone",
    "End with a clear, specific CTA",
    "Keep captions under 150 characters",
    "Match brand palette in visuals",
  ];

  const inpStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical" };
  const lblStyle = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280", marginBottom: 6, display: "block" };

  // 24-hour edit window: if S4 is done, content team can still edit/add content
  // • If NO content was added at all → always open (so they can add missing content)
  // • If content exists → open for 24h after S4 was marked done
  const s4Stage       = task?.stages?.[3];
  const s4DoneAt      = s4Stage?.doneAt ? new Date(s4Stage.doneAt) : null;
  const s4IsDone      = !!(s4Stage?.done || s4Stage?.approved);
  const hoursElapsed  = s4DoneAt ? (Date.now() - s4DoneAt.getTime()) / 3600000 : Infinity;
  const hasContent    = !!(task?.description?.trim() || task?.caption?.trim());
  const editWindowOpen = s4IsDone && (!hasContent || hoursElapsed < 24);
  const hoursLeft      = (editWindowOpen && hasContent) ? Math.max(1, Math.ceil(24 - hoursElapsed)) : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 20, alignItems: "start" }}>
      {/* Main column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Task header card */}
        {task ? (
          <div className="tms-card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {task.brandId && (
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: task.brandId.color + "20", border: `2px solid ${task.brandId.color}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: task.brandId.color, display: "inline-block" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#7C3AED", marginBottom: 4, fontWeight: 700 }}>#{task.nomenclature || task._id?.slice(-6)}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#111", lineHeight: 1.2 }}>{task.nomenclature || task.title}</div>
                  <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
                    {task.brandId && <span style={{ padding: "2px 9px", borderRadius: 20, background: task.brandId.color + "20", color: task.brandId.color, fontSize: 11, fontWeight: 700 }}>{task.brandId.name}</span>}
                    {task.contentType && <span style={{ padding: "2px 9px", borderRadius: 20, background: (CTYPE_COLOR[task.contentType] || "#6366F1") + "22", color: CTYPE_COLOR[task.contentType] || "#6366F1", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{task.contentType}</span>}
                    {task.dueDate && <span style={{ padding: "2px 9px", borderRadius: 20, background: "#F3F4F6", color: isOverdue(task.dueDate) ? "#DC2626" : "#6B7280", fontSize: 11, fontFamily: "monospace" }}>{fmtD(task.dueDate)}</span>}
                  </div>
                </div>
              </div>
            </div>


            {/* Status banners */}
            {editWindowOpen && (
              <div style={{ marginTop:14, padding:"12px 16px", borderRadius:8, background: hasContent ? "rgba(79,70,229,.07)" : "rgba(239,68,68,.06)", border: `1.5px solid ${hasContent ? "rgba(79,70,229,.3)" : "rgba(239,68,68,.3)"}`, display:"flex", alignItems:"center", gap:10 }}>
                <i className={`bi ${hasContent ? "bi-pencil-square" : "bi-exclamation-triangle-fill"}`} style={{ color: hasContent ? "#4F46E5" : "#DC2626", fontSize:18, flexShrink:0 }} />
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color: hasContent ? "#3730A3" : "#991B1B" }}>
                    {hasContent ? `Edit Window Open — ${hoursLeft}h remaining` : "No Content Added — Please add script/caption now"}
                  </div>
                  <div style={{ fontSize:12, color: hasContent ? "#4F46E5" : "#DC2626", marginTop:2 }}>
                    {hasContent
                      ? `S4 is done. You can still update your content for ${hoursLeft} more hour${hoursLeft !== 1 ? "s" : ""}. After that it will lock.`
                      : "S4 is posted but no content was saved. Add your script and caption below so the record is complete."}
                  </div>
                </div>
              </div>
            )}
            {!editWindowOpen && task.stages?.[0]?.done && (task.status === "review" || (!task.stages?.[0]?.approved && !task.stages?.[0]?.rejected)) && (
              <>
                <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#FFFBEB", border: "1.5px solid #FCD34D", display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="bi bi-hourglass-split" style={{ color: "#D97706", fontSize: 18, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#92400E" }}>Under Review — Awaiting admin approval</div>
                    <div style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>Your content has been submitted. You'll be notified once the admin reviews it.</div>
                  </div>
                </div>
                {(script || caption || tags?.length > 0 || task.pillar || task.referenceLink) && (
                  <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 8, background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="bi bi-file-earmark-check-fill" style={{ color: "#7C3AED", fontSize: 13 }} />Submitted Content
                    </div>
                    {script && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Script</div>
                        <div style={{ fontSize: 12.5, color: "#374151", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 10px", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 140, overflowY: "auto" }}>{script}</div>
                      </div>
                    )}
                    {caption && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Caption</div>
                        <div style={{ fontSize: 12.5, color: "#374151", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 10px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{caption}</div>
                      </div>
                    )}
                    {tags?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Hashtags</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {tags.map(tg => (
                            <span key={tg} style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "#EDE9FE", color: "#7C3AED", fontWeight: 700 }}>#{tg}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {pillar && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Content Pillar</div>
                        <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "#F3E8FF", color: "#7C3AED", fontWeight: 700 }}>{pillar}</span>
                      </div>
                    )}
                    {refLink && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Reference Link</div>
                        <a href={refLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#4F46E5", wordBreak: "break-all", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <i className="bi bi-link-45deg" />{refLink.length > 55 ? refLink.slice(0, 55) + "…" : refLink}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {task.stages?.[0]?.rejected === true && task.stages?.[0]?.done !== true && task.status !== "blocked" && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#FEF2F2", border: "1.5px solid #FCA5A5", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i className="bi bi-x-octagon-fill" style={{ color: "#DC2626", fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#991B1B" }}>Stage Rejected — Please revise and resubmit</div>
                  {task.stages[0].rejectReason && (
                    <div style={{ fontSize: 12.5, color: "#7F1D1D", marginTop: 6, background: "#FEE2E2", padding: "8px 12px", borderRadius: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      <strong>Admin feedback:</strong> {task.stages[0].rejectReason}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#B45309", marginTop: 6 }}>Update your script/content above and click Resubmit when ready.</div>
                </div>
              </div>
            )}
            {task.status === "todo" && task.reviewNote && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#FFFBEB", border: "1.5px solid #FDE68A", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i className="bi bi-chat-left-text-fill" style={{ color: "#B45309", fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#92400E" }}>Client Requested Changes</div>
                  <div style={{ fontSize: 12.5, color: "#78350F", marginTop: 6, background: "#FEF3C7", padding: "8px 12px", borderRadius: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {task.reviewNote}
                  </div>
                  <div style={{ fontSize: 11, color: "#B45309", marginTop: 6 }}>Please revise and resubmit your work once changes are made.</div>
                </div>
              </div>
            )}
            {task.status === "blocked" && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#FEF2F2", border: "1.5px solid #FCA5A5", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i className="bi bi-x-octagon-fill" style={{ color: "#DC2626", fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#991B1B" }}>Rejected — Please revise and resubmit</div>
                  {task.reviewNote && <div style={{ fontSize: 12.5, color: "#7F1D1D", marginTop: 6, background: "#FEE2E2", padding: "8px 12px", borderRadius: 6, lineHeight: 1.6 }}><strong>Admin feedback:</strong> {task.reviewNote}</div>}
                </div>
              </div>
            )}
            {task.status === "completed" && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#F0FDF4", border: "1.5px solid #86EFAC", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="bi bi-check-circle-fill" style={{ color: "#16A34A", fontSize: 18, flexShrink: 0 }} />
                <div style={{ fontWeight: 700, fontSize: 13, color: "#14532D" }}>Approved — Great work!</div>
              </div>
            )}
          </div>
        ) : (
          <div className="tms-card">
            <div className="tms-empty" style={{ padding: "48px 20px" }}>
              <i className="bi bi-cursor-text" style={{ fontSize: 42 }} />
              <p style={{ marginTop: 10 }}>Select a task from My Tasks to start writing</p>
            </div>
          </div>
        )}

        {/* ── GENERAL / NON-PRODUCTION TASK ─── */}
        {task && task.taskType !== "production" && (
          <div className="tms-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Header — different colour/label for project/sprint vs general */}
            {task.taskType === "project" || task.taskType === "sprint" ? (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#4F46E5", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-code-slash" />
                  {task.taskType === "project" ? "Dev Feature" : "Sprint Task"}
                </div>
                {(task.projectId?.name || task.sprintId?.name) && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {task.projectId?.name && (
                      <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: "#EEF2FF", color: "#4F46E5", fontWeight: 600 }}>
                        <i className="bi bi-folder me-1" />{task.projectId.name}
                      </span>
                    )}
                    {task.sprintId?.name && (
                      <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: "#F3E8FF", color: "#7C3AED", fontWeight: 600 }}>
                        <i className="bi bi-lightning me-1" />{task.sprintId.name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#0EA5E9", marginBottom: 4 }}>
                <i className="bi bi-grid me-2" />General Task
              </div>
            )}
            {task.description && (
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid ${task.taskType === "project" || task.taskType === "sprint" ? "#4F46E5" : "#0EA5E9"}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 5 }}>Task Description</div>
                <div style={{ fontSize: 13.5, color: "#1E293B", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{task.description}</div>
              </div>
            )}
            {task.status !== "review" && task.status !== "completed" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280", display: "block", marginBottom: 6 }}>
                    Work Report / Notes
                  </label>
                  <textarea
                    value={script}
                    onChange={e => setScript(e.target.value)}
                    rows={5}
                    placeholder="Describe what you have done for this task…"
                    style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280", display: "block", marginBottom: 6 }}>
                    Proof / Reference Link <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={refLink}
                    onChange={e => setRefLink(e.target.value)}
                    placeholder="https://drive.google.com/… or any proof link"
                    style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}
            {task.status === "review" && (
              <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="bi bi-hourglass-split" style={{ color: "#B45309", fontSize: 16 }} />
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#92400E" }}>Submitted — Awaiting Admin Approval</div>
                </div>
                {script && <div style={{ fontSize: 12, color: "#78350F" }}>{script.slice(0, 160)}{script.length > 160 ? "…" : ""}</div>}
                {refLink && (
                  <a href={refLink} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: "#4F46E5", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="bi bi-link-45deg" />{refLink}
                  </a>
                )}
              </div>
            )}
            {task.status === "completed" && (
              <div style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="bi bi-check-circle-fill" style={{ color: "#16A34A", fontSize: 16 }} />
                <div style={{ fontWeight: 700, fontSize: 13, color: "#14532D" }}>Approved — Task Completed!</div>
              </div>
            )}
            {task.status === "blocked" && (
              <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#991B1B" }}><i className="bi bi-x-octagon-fill me-2" />Rejected</div>
                {task.reviewNote && <div style={{ fontSize: 12, color: "#7F1D1D", marginTop: 6 }}>Reason: {task.reviewNote}</div>}
              </div>
            )}
            {task.status !== "review" && task.status !== "completed" && (
              <button onClick={submitForReview} disabled={submitting}
                style={{ padding: "11px 18px", borderRadius: 9, border: "none", fontSize: 14, fontWeight: 700, cursor: submitting ? "default" : "pointer", background: "#0EA5E9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: submitting ? 0.7 : 1 }}>
                <i className="bi bi-send" />{submitting ? "Submitting…" : task.status === "blocked" ? "Resubmit for Review" : "Submit for Review"}
              </button>
            )}
          </div>
        )}

        {task && task.taskType === "production" && (<>
          {(() => {
            const s0 = task.stages?.[0];
            // Lock ONLY when S1 has actually been submitted (s0.done === true) and not rejected.
            // If Sakshi never submitted S1, keep the editor open regardless of task status.
            const s1Submitted = task.taskType === "production" && !!s0?.done && !s0?.rejected;
            const isLocked = !editWindowOpen && s1Submitted;
            const lockedStyle = { opacity: isLocked ? 0.75 : 1, pointerEvents: isLocked ? "none" : undefined };
            return (<>
          {/* Content Pillar */}
          <div className="tms-card" style={lockedStyle}>
            <label style={lblStyle}>Content Pillar</label>
            <select value={addingPillar ? "__add__" : pillar}
              onChange={e => {
                if (e.target.value === "__add__") { setAddingPillar(true); setNewPillarText(""); }
                else { setAddingPillar(false); setPillar(e.target.value); }
              }}
              disabled={isLocked}
              style={{ ...inpStyle, resize: "none", cursor: isLocked ? "default" : "pointer" }}>
              <option value="">Select a pillar…</option>
              {[...PILLAR_OPTS, ...customPillars].map(p => <option key={p} value={p}>{p}</option>)}
              <option value="__add__">+ Add new pillar…</option>
            </select>
            {addingPillar && !isLocked && (
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                <input
                  autoFocus
                  type="text"
                  value={newPillarText}
                  onChange={e => setNewPillarText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newPillarText.trim()) {
                      const val = newPillarText.trim();
                      if (![...PILLAR_OPTS, ...customPillars].includes(val)) {
                        const updated = [...customPillars, val];
                        setCustomPillars(updated);
                        localStorage.setItem("ep_custom_pillars", JSON.stringify(updated));
                      }
                      setPillar(val); setAddingPillar(false); setNewPillarText("");
                    }
                    if (e.key === "Escape") { setAddingPillar(false); setNewPillarText(""); }
                  }}
                  placeholder="Type new pillar name…"
                  style={{ ...inpStyle, flex:1, marginBottom:0 }}
                />
                <button
                  onClick={() => {
                    const val = newPillarText.trim();
                    if (!val) return;
                    if (![...PILLAR_OPTS, ...customPillars].includes(val)) {
                      const updated = [...customPillars, val];
                      setCustomPillars(updated);
                      localStorage.setItem("ep_custom_pillars", JSON.stringify(updated));
                    }
                    setPillar(val); setAddingPillar(false); setNewPillarText("");
                  }}
                  style={{ padding:"8px 14px", borderRadius:8, border:"none", background:"#7C3AED", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                  Add
                </button>
                <button
                  onClick={() => { setAddingPillar(false); setNewPillarText(""); }}
                  style={{ padding:"8px 10px", borderRadius:8, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontSize:12, cursor:"pointer" }}>
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Reference Link */}
          <div className="tms-card" style={lockedStyle}>
            <label style={lblStyle}>Reference Reel / Link</label>
            <input type="url" value={refLink} onChange={e => setRefLink(e.target.value)} readOnly={isLocked} placeholder="https://instagram.com/reel/…" style={{ ...inpStyle, resize: "none" }} />
            {refLink && (
              <div style={{ marginTop: 10, padding: "11px 14px", background: "#F5F3FF", borderRadius: 8, border: "1px solid #DDD6FE", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="bi bi-play-circle-fill" style={{ color: "#7C3AED", fontSize: 20, flexShrink: 0 }} />
                <a href={refLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#7C3AED", textDecoration: "none", wordBreak: "break-all" }}>
                  {refLink.length > 60 ? refLink.slice(0, 60) + "…" : refLink}
                </a>
              </div>
            )}
          </div>

          {/* Script / Content */}
          <div className="tms-card" style={lockedStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={lblStyle}>Script / Content</label>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>
                {script.length} chars · {wordCount} words{narration ? ` · ${narration} narration` : ""}
              </div>
            </div>
            <textarea value={script} onChange={isLocked ? undefined : e => onScriptChange(e.target.value)} readOnly={isLocked} rows={12}
              placeholder="Write the script or content copy here…"
              style={{ ...inpStyle, fontFamily: "monospace", fontSize: 13, lineHeight: 1.8 }} />
          </div>

          {/* Caption */}
          <div className="tms-card" style={lockedStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={lblStyle}>Caption</label>
              <span style={{ fontSize: 11, color: caption.length > 150 ? "#DC2626" : "#9CA3AF", marginBottom: 6 }}>{caption.length}/150</span>
            </div>
            <textarea value={caption} onChange={isLocked ? undefined : e => setCaption(e.target.value)} readOnly={isLocked} rows={3}
              placeholder="Instagram / social media caption…" style={inpStyle} />
          </div>

          {/* Hashtags */}
          <div className="tms-card" style={lockedStyle}>
            <label style={lblStyle}>Hashtags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "9px 11px", border: "1.5px solid #E5E7EB", borderRadius: 8, minHeight: 46, background: isLocked ? "#F9FAFB" : "#FAFAFA" }}>
              {tags.map(tag => (
                <span key={tag} onClick={isLocked ? undefined : () => {
                  const newTags = tags.filter(x => x !== tag);
                  setTags(newTags);
                  if (task && task.status !== "review" && task.status !== "completed") {
                    fetch(`/api/employee/tasks/${task._id}`, {
                      method: "PATCH", headers: authH(),
                      body: JSON.stringify({ description: script, caption, referenceLink: refLink, tags: newTags }),
                    }).then(r => r.json()).then(d => { if (d.success) setLastSaved(new Date()); }).catch(() => {});
                  }
                }} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 20, background: "#EDE9FE", color: "#7C3AED", fontSize: 12, fontWeight: 700, cursor: isLocked ? "default" : "pointer" }}>
                  #{tag}{!isLocked && <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>}
                </span>
              ))}
              {!isLocked && (
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                  placeholder={tags.length === 0 ? "Type hashtag + Enter…" : ""}
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, minWidth: 130, flex: 1 }} />
              )}
              {isLocked && tags.length === 0 && <span style={{ fontSize: 12, color: "#D1D5DB" }}>No hashtags added</span>}
            </div>
          </div>
          </>);
          })()}

          {/* Action buttons — below the form */}
          {task && (() => {
            const s0 = task.stages?.[0];
            const isProd = task.taskType === "production";
            const s1Pending = isProd && s0?.done && !s0?.approved && !s0?.rejected;
            const s1Approved = isProd && s0?.approved;
            // Only show "Under Review" when S1 is actually submitted; don't block Sakshi if she never submitted
            const isUnderReview = s1Pending || (!!s0?.done && task.status === "review");
            const isApproved = s1Approved || task.status === "completed";
            const isRejected = task.status === "blocked" || (s0?.rejected && !s0?.done);
            // editWindowOpen overrides approval lock — let Sakshi add missing content on approved tasks
            const saveContentMode = editWindowOpen && isApproved;
            const lockDraft  = saving || isUnderReview || (isApproved && !editWindowOpen);
            const lockSubmit = submitting || isUnderReview || (isApproved && !saveContentMode);
            return (
              <div className="tms-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => saveTask(false)} disabled={lockDraft}
                  style={{ width: "100%", padding: "11px 18px", borderRadius: 9, background: "#F3F4F6", color: "#374151", border: "1.5px solid #E5E7EB", fontSize: 14, fontWeight: 700, cursor: lockDraft ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: lockDraft ? 0.5 : 1 }}>
                  <i className="bi bi-floppy" />{saving ? "Saving…" : "Save Draft"}
                </button>
                <button onClick={saveContentMode ? () => saveTask(false) : submitForReview} disabled={lockSubmit}
                  style={{
                    width: "100%", padding: "11px 18px", borderRadius: 9, border: "none", fontSize: 14, fontWeight: 700,
                    cursor: lockSubmit ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: submitting ? 0.7 : 1,
                    background: saveContentMode ? "#7C3AED" : isUnderReview ? "#FFFBEB" : isApproved ? "#F0FDF4" : "#7C3AED",
                    color:      saveContentMode ? "#fff"    : isUnderReview ? "#B45309" : isApproved ? "#16A34A" : "#fff",
                  }}>
                  <i className={`bi ${saveContentMode ? "bi-floppy2-fill" : isUnderReview ? "bi-hourglass-split" : isApproved ? "bi-check-circle-fill" : isRejected ? "bi-send-fill" : "bi-send"}`} />
                  {saving ? "Saving…" : saveContentMode ? "Save Content" : isUnderReview ? "Under Review" : isApproved ? "Approved ✓" : isRejected ? "Resubmit for Review" : "Submit for Review"}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#9CA3AF", justifyContent: "center" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: lastSaved ? "#22c55e" : "#D1D5DB" }} />
                  {lastSaved ? `Auto-saved at ${lastSaved.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Not saved yet"}
                </div>
              </div>
            );
          })()}
        </>)}
      </div>

      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 20 }}>
        {/* Brief snapshot */}
        {task && (
          <div className="tms-card" style={{ padding: "16px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280", marginBottom: 12 }}>Brief Snapshot</div>
            {[
              { label: "Brand",  val: task.brandId?.name, color: task.brandId?.color },
              { label: "Type",   val: task.contentType },
              { label: "Stage",  val: task.stage ? `Stage ${task.stage.replace("S", "")} — ${STAGE_LABEL[task.stage]}` : null, color: STAGE_COLOR[task.stage] },
              { label: "Status", val: { todo: "To Do", in_progress: "In Progress", review: "Under Review", completed: "Approved", blocked: "Rejected" }[task.status] || task.status, color: task.status === "review" ? "#B45309" : task.status === "completed" ? "#16A34A" : task.status === "blocked" ? "#DC2626" : undefined },
              { label: "Due",    val: fmtDT(task.stages?.[0]?.deadline || task.dueDate), danger: isOverdue(task.stages?.[0]?.deadline || task.dueDate) },
            ].filter(r => r.val).map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6", fontSize: 12.5 }}>
                <span style={{ color: "#9CA3AF" }}>{r.label}</span>
                <span style={{ color: r.danger ? "#DC2626" : r.color || "#111", fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Brand Voice */}
        <div className="tms-card" style={{ padding: "16px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280", marginBottom: 12 }}>
            <i className="bi bi-megaphone me-2" style={{ color: "#7C3AED" }} />Brand Voice
          </div>
          {!task?.brandId ? (
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Select a task to see brand guidelines.</p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #F3F4F6" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: task.brandId.color, display: "inline-block" }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{task.brandId.name}</span>
              </div>
              {brandVoice.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "7px 10px", background: "#F5F3FF", borderRadius: 7, fontSize: 12, lineHeight: 1.5, marginBottom: 7 }}>
                  <i className="bi bi-check-circle-fill" style={{ color: "#7C3AED", flexShrink: 0, marginTop: 1 }} />
                  <span>{tip}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* My Drafts */}
        {scriptTasks.length > 1 && (
          <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #F0F0F0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280" }}>
              My Drafts ({scriptTasks.length})
            </div>
            {scriptTasks.slice(0, 6).map(t => (
              <div key={t._id} onClick={() => loadTask(t)} style={{
                padding: "11px 14px", borderBottom: "1px solid #F5F5F5", cursor: "pointer",
                background: task?._id === t._id ? "#F5F3FF" : "#fff",
                borderLeft: task?._id === t._id ? "3px solid #7C3AED" : "3px solid transparent",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nomenclature || t.title}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                  {t.brandId && <><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: t.brandId.color, marginRight: 4 }} />{t.brandId.name} · </>}
                  {fmtD(t.dueDate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DESIGN / EDIT QUEUE TAB ──────────────────────────────────────────────────
function QueueTab({ tasks, role }) {
  const [filter, setFilter] = useState("all");
  const assignedStage = role === "editor" ? "S3" : "S2";
  const myQ   = tasks.filter(t => t.taskType === "production" && (!t.stage || t.stage === assignedStage));
  const buckets = ["all", "todo", "in_progress", "review", "completed"];
  const vis   = filter === "all" ? myQ : myQ.filter(t => t.status === filter);
  const STATUS_LABEL = { todo: "To Do", in_progress: "In Progress", review: "Review", completed: "Done", blocked: "Rejected" };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {buckets.map(b => (
          <button key={b} onClick={() => setFilter(b)} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "1.5px solid", transition: "all .15s", background: filter === b ? "#4F46E5" : "#fff", color: filter === b ? "#fff" : "#6B7280", borderColor: filter === b ? "#4F46E5" : "#E5E7EB" }}>
            {b === "all" ? "All" : STATUS_LABEL[b]} ({b === "all" ? myQ.length : myQ.filter(t => t.status === b).length})
          </button>
        ))}
      </div>
      {vis.length === 0 ? (
        <div className="tms-card"><div className="tms-empty"><i className="bi bi-inbox" style={{ fontSize: 36 }} /><p>No tasks in this queue</p></div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {vis.map(t => (
            <div key={t._id} className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ height: 90, background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#D1D5DB" }}>
                <i className={`bi ${t.contentType === "reel" ? "bi-play-circle" : t.contentType === "post" ? "bi-image" : "bi-camera"}`} />
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, lineHeight: 1.4 }}>{t.nomenclature || t.title}</div>
                {t.brandId && <div style={{ display: "flex", alignItems: "center", fontSize: 11, color: "#6B7280", marginBottom: 8 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: t.brandId.color, display: "inline-block", marginRight: 5 }} />{t.brandId.name}</div>}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={`tms-badge ${STATUS_MAP[t.status]?.cls || "tms-badge-todo"}`}>{STATUS_MAP[t.status]?.label || t.status}</span>
                  <span style={{ fontSize: 11, color: isOverdue(t.dueDate) ? "#DC2626" : "#9CA3AF" }}>{fmtD(t.dueDate)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── TASK DETAIL MODAL (shared by calendar tabs) ─────────────────────────────
function TaskDetailModal({ task, onClose }) {
  if (!task) return null;
  const ct = { reel: { label: "Reel", icon: "bi-camera-video-fill", color: "#F59E0B" }, post: { label: "Post", icon: "bi-image-fill", color: "#6366F1" }, carousel: { label: "Carousel", icon: "bi-images", color: "#10B981" }, story: { label: "Phone", icon: "bi-phone-fill", color: "#EC4899" } }[task.contentType];
  const stageColor = STAGE_COLOR[task.stage] || "#6366F1";
  const dateStr = task.scheduledFor ? fmtD(task.scheduledFor) : fmtD(task.dueDate);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B", lineHeight: 1.4, marginBottom: 8 }}>{task.nomenclature || task.title || "—"}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {task.brandId && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: (task.brandId.color || "#6366F1") + "20", color: task.brandId.color || "#6366F1" }}>{task.brandId.name}</span>}
              {ct && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ct.color + "18", color: ct.color }}><i className={`bi ${ct.icon}`} style={{ marginRight: 3 }} />{ct.label}</span>}
              {task.stage && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: stageColor + "20", color: stageColor }}>{task.stage} · {STAGE_LABEL[task.stage]}</span>}
              {dateStr !== "—" && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#F1F5F9", color: "#64748B" }}><i className="bi bi-calendar3 me-1" />{dateStr}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, flexShrink: 0 }}><i className="bi bi-x" /></button>
        </div>
        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {task.pillar && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Content Pillar</div>
            <div style={{ fontSize: 13, color: "#7C3AED", fontWeight: 600 }}><i className="bi bi-tag me-1" />{task.pillar}</div></div>
          )}
          {task.description && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Script / Description</div>
            <div style={{ fontSize: 12.5, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto" }}>{task.description}</div></div>
          )}
          {task.caption && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Caption</div>
            <div style={{ fontSize: 12.5, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{task.caption}</div></div>
          )}
          {task.tags?.length > 0 && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Hashtags</div>
            <div style={{ fontSize: 12, color: "#6366F1", background: "#EEF2FF", borderRadius: 8, padding: "8px 12px", lineHeight: 1.8 }}>{task.tags.map(tg => `#${tg}`).join(" ")}</div></div>
          )}
          {task.referenceLink && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Reference Link</div>
            <a href={task.referenceLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#4F46E5", display: "inline-flex", alignItems: "center", gap: 4, background: "#EEF2FF", padding: "6px 12px", borderRadius: 8, textDecoration: "none" }}><i className="bi bi-link-45deg" /> View Reference</a></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BRAND CALENDAR TAB ───────────────────────────────────────────────────────
// ─── WEEKLY TRACKER TAB (content team) ───────────────────────────────────────
const WT_CONTENT_META = {
  reel:     { label: "Reel",     icon: "bi-camera-video-fill", color: "#F59E0B" },
  post:     { label: "Post",     icon: "bi-image-fill",        color: "#6366F1" },
  carousel: { label: "Carousel", icon: "bi-images",            color: "#10B981" },
  story:    { label: "Story",    icon: "bi-phone-fill",        color: "#EC4899" },
};
const WT_STATUS_META = {
  todo:        { label: "To Do",       color: "#64748B", bg: "#F1F5F9", dot: "#94A3B8" },
  in_progress: { label: "In Progress", color: "#1D4ED8", bg: "#DBEAFE", dot: "#3B82F6" },
  review:      { label: "Review",      color: "#B45309", bg: "#FEF3C7", dot: "#F59E0B" },
  completed:   { label: "Done",        color: "#15803D", bg: "#DCFCE7", dot: "#10B981" },
  blocked:     { label: "Blocked",     color: "#DC2626", bg: "#FEE2E2", dot: "#EF4444" },
};
const WT_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function fmtWTShort(date) {
  return `${date.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][date.getMonth()]}`;
}

function getWTWeekDates(offset = 0) {
  const now = new Date();
  const dow = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  return WT_DAYS.map((label, i) => {
    const date = new Date(mon);
    date.setDate(mon.getDate() + i);
    return { label, date };
  });
}

function WeeklyTrackerTab() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [brandFilter, setBrandFilter] = useState("");
  const [brands, setBrands]   = useState([]);
  const [tasks,  setTasks]    = useState([]);
  const [loading, setLoading] = useState(true);

  const weekDates = getWTWeekDates(weekOffset);
  const weekStart = weekDates[0].date;
  const weekEnd   = weekDates[6].date;

  useEffect(() => {
    const token = localStorage.getItem("employeeToken") || "";
    setLoading(true);
    // Fetch the full month so the brand-schedule placement has all tasks
    const firstDay = weekDates[0].date;
    const lastDay  = weekDates[6].date;
    const monthStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1);
    const monthEnd   = new Date(lastDay.getFullYear(),  lastDay.getMonth()  + 1, 0, 23, 59, 59, 999);
    const q = new URLSearchParams({ dateStart: monthStart.toISOString(), dateEnd: monthEnd.toISOString() });
    fetch(`/api/employee/weekly-tracker?${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTasks(d.tasks || []);
          const bs = d.brands || [];
          setBrands(bs);
          setBrandFilter(prev => {
            if (prev && bs.find(b => b._id?.toString() === prev)) return prev;
            const viralon = bs.find(b => /viralon/i.test(b.name));
            return String(viralon?._id || bs[0]?._id || "");
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weekOffset]);

  const getScheduled = (brand, dayLabel) =>
    (brand.weeklySchedule || []).filter(s => s.day === dayLabel);

  // Count how many times contentType was scheduled from month-start up to and
  // including date (0-based). Same algorithm as admin weekly tracker.
  function wtMonthSlotIndex(date, contentType, weeklySchedule) {
    const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    let count = 0;
    const cur = new Date(monthStart);
    while (cur <= date) {
      const label = DAY_NAMES[cur.getDay()];
      count += weeklySchedule.filter(s => s.day === label && s.contentType === contentType).length;
      cur.setDate(cur.getDate() + 1);
    }
    return count - 1;
  }

  // Place tasks using brand schedule — mirrors admin weekly tracker exactly
  const tasksByBrandDay = (() => {
    const result = {};

    // Group by brandId → contentType → monthKey so June tasks never bleed into July columns
    const taskGroups = {};
    tasks.forEach(t => {
      if (!t.brandId) return;
      const bId = typeof t.brandId === "object" ? String(t.brandId._id || t.brandId) : String(t.brandId);
      const ct  = t.contentType || "__unknown";
      const d   = t.dueDate      ? new Date(t.dueDate)
                : t.scheduledFor ? new Date(t.scheduledFor)
                : t.createdAt    ? new Date(t.createdAt)
                : null;
      if (!d) return;
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      if (!taskGroups[bId])         taskGroups[bId] = {};
      if (!taskGroups[bId][ct])     taskGroups[bId][ct] = {};
      if (!taskGroups[bId][ct][mk]) taskGroups[bId][ct][mk] = [];
      taskGroups[bId][ct][mk].push(t);
    });
    Object.values(taskGroups).forEach(byType =>
      Object.values(byType).forEach(byMonth =>
        Object.values(byMonth).forEach(arr => arr.sort((a, b) => (a.taskId || "").localeCompare(b.taskId || "")))
      )
    );

    const EMP_DLVR_KEY_MAP = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
    brands.forEach(brand => {
      const bId = String(brand._id);
      if (!taskGroups[bId]) return;
      const schedule = brand.weeklySchedule || [];
      if (!schedule.length) return;
      weekDates.forEach(({ label, date }) => {
        const mk = `${date.getFullYear()}-${date.getMonth()}`;
        schedule.filter(s => s.day === label).forEach(slot => {
          const ct = slot.contentType;
          const ctTasks = taskGroups[bId]?.[ct]?.[mk]; // this month only
          if (!ctTasks || ctTasks.length === 0) return;
          const idx = wtMonthSlotIndex(date, ct, schedule);
          if (idx < 0 || idx >= ctTasks.length) return;
          const dlvrKey = EMP_DLVR_KEY_MAP[ct];
          if (dlvrKey) {
            const limit = brand.monthlyDeliverables?.[dlvrKey];
            if (limit != null && idx >= limit) return;
          }
          const dateKey = date.toDateString();
          if (!result[bId]) result[bId] = {};
          if (!result[bId][dateKey]) result[bId][dateKey] = [];
          result[bId][dateKey].push(ctTasks[idx]);
        });
      });
    });
    return result;
  })();

  const displayBrands = brandFilter ? brands.filter(b => b._id?.toString() === brandFilter) : brands;

  return (
    <div>
      <style>{`
        .emp-wt-table { width:100%; border-collapse:collapse; }
        .emp-wt-table th { padding:10px 8px; font-size:11px; font-weight:700; color:#64748B; border-bottom:2px solid #F1F5F9; background:#FAFAFA; text-align:center; white-space:nowrap; }
        .emp-wt-table th.brand-col { text-align:left; width:140px; }
        .emp-wt-table td { padding:6px; border-bottom:1px solid #F8FAFC; vertical-align:top; min-width:90px; }
        .emp-wt-table tr:hover td { background:#FAFBFF; }
        .emp-wt-cell { min-height:50px; }
        .emp-wt-slot { border-radius:7px; padding:3px 6px; margin-bottom:3px; font-size:10px; font-weight:700; display:flex; align-items:center; gap:3px; }
        .emp-wt-task { border-radius:7px; padding:3px 6px; margin-bottom:3px; font-size:10px; font-weight:600; border:1.5px solid; cursor:default; }
        .emp-today-col { background:#F5F3FF !important; }
      `}</style>

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => setWeekOffset(w => w - 1)}
            style={{ background:"#F1F5F9", border:"none", borderRadius:8, padding:"6px 11px", cursor:"pointer", fontSize:13, fontWeight:700 }}>
            <i className="bi bi-chevron-left" />
          </button>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>Weekly Tracker</div>
            <div style={{ fontSize:11, color:"#94A3B8" }}>
              {fmtWTShort(weekStart)} – {fmtWTShort(weekEnd)}
              {weekOffset === 0 && <span style={{ color:"#6366F1", fontWeight:700, marginLeft:6 }}>· This Week</span>}
            </div>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)}
            style={{ background:"#F1F5F9", border:"none", borderRadius:8, padding:"6px 11px", cursor:"pointer", fontSize:13, fontWeight:700 }}>
            <i className="bi bi-chevron-right" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)}
              style={{ background:"#EEF2FF", border:"none", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:700, color:"#4F46E5" }}>
              This Week
            </button>
          )}
        </div>
        <select
          value={brandFilter}
          onChange={e => setBrandFilter(e.target.value)}
          style={{ padding:"6px 10px", borderRadius:8, border:"1.5px solid #E5E7EB", fontSize:12, fontWeight:600, outline:"none", background:"#fff" }}>
          {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {[["#F97316","S1"],["#3B82F6","S2"],["#EAB308","S3"],["#22C55E","S4"]].flatMap(([c,l]) => [
          <span key={l+"a"} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748B" }}>
            <span style={{ width:18, height:12, borderRadius:3, background:"#fff", border:`1.5px solid ${c}`, display:"inline-block" }} />{l} Assigned
          </span>,
          <span key={l+"d"} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748B" }}>
            <span style={{ width:18, height:12, borderRadius:3, background:c, border:`1.5px solid ${c}`, display:"inline-block" }} />{l} Approved
          </span>,
        ])}
        <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748B" }}>
          <span style={{ width:18, height:12, borderRadius:3, background:"#F8FAFC", border:"1.5px dashed #D1D5DB", display:"inline-block" }} />Scheduled (plan)
        </span>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:"center", color:"#94A3B8" }}>
          <div className="spinner-border spinner-border-sm text-primary" />
        </div>
      ) : displayBrands.length === 0 ? (
        <div style={{ padding:"48px 32px", textAlign:"center", background:"#fff", borderRadius:14, border:"1.5px solid #E2E8F0" }}>
          <i className="bi bi-calendar-week" style={{ fontSize:36, color:"#CBD5E1", display:"block", marginBottom:10 }} />
          <div style={{ fontSize:14, fontWeight:700, color:"#94a3b8" }}>No tasks assigned this week</div>
        </div>
      ) : (
        <div style={{ background:"#fff", borderRadius:14, border:"1.5px solid #F1F5F9", overflowX:"auto" }}>
          <table className="emp-wt-table">
            <thead>
              <tr>
                <th className="brand-col">Brand</th>
                {weekDates.map(({ label, date }) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <th key={label} style={{ color: isToday ? "#6366F1" : "#64748B" }}>
                      <div>{label}</div>
                      <div style={{ fontSize:10, fontWeight:400 }}>{fmtWTShort(date)}</div>
                      {isToday && <div style={{ width:6, height:6, borderRadius:"50%", background:"#6366F1", margin:"2px auto 0" }} />}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayBrands.map(brand => (
                <tr key={brand._id}>
                  <td>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:6, height:30, borderRadius:4, background:brand.color || "#6366F1", flexShrink:0 }} />
                      <div>
                        <div style={{ fontWeight:700, fontSize:12, color:"#1E293B" }}>{brand.name}</div>
                        <div style={{ fontSize:10, color:"#1E293B" }}>{(brand.weeklySchedule || []).length} post/wk</div>
                      </div>
                    </div>
                  </td>
                  {weekDates.map(({ label, date }) => {
                    const isToday   = date.toDateString() === new Date().toDateString();
                    const scheduled = getScheduled(brand, label);
                    const bId       = String(brand._id);
                    const dayTasks  = tasksByBrandDay[bId]?.[date.toDateString()] || [];
                    // Unfilled slots: actual tasks consume matching planned slots
                    const EMP_DLVR_KEY = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
                    const EMP_MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const empMonthLabel = `${EMP_MONTHS[date.getMonth()]}'${String(date.getFullYear()).slice(2)}`;
                    const rem = {};
                    dayTasks.forEach(t => { rem[t.contentType] = (rem[t.contentType] || 0) + 1; });
                    const unfilledSlots = scheduled.reduce((acc, slot) => {
                      const ct = slot.contentType;
                      const slotIdx = wtMonthSlotIndex(date, ct, brand.weeklySchedule || []);
                      const dlvrKey = EMP_DLVR_KEY[ct];
                      if (dlvrKey) {
                        const limit = brand.monthlyDeliverables?.[dlvrKey];
                        if (limit != null && slotIdx >= limit) return acc;
                      }
                      if ((rem[ct] || 0) > 0) { rem[ct]--; return acc; }
                      acc.push({ ...slot, slotIdx });
                      return acc;
                    }, []);
                    return (
                      <td key={label} className={isToday ? "emp-today-col" : ""}>
                        <div className="emp-wt-cell">
                          {dayTasks.map(t => {
                            const ct  = WT_CONTENT_META[t.contentType] || {};
                            const sty = getTaskStageStyle(t);
                            const nom = t.nomenclature || t.title || "";
                            const ctLower = (t.contentType || "").toLowerCase();
                            let suffix = nom.toLowerCase().startsWith(ctLower) ? nom.slice(ctLower.length).trim() : nom;
                            suffix = suffix.replace(/\b[a-z]/g, c => c.toUpperCase());
                            const displayLabel = suffix ? `${ct.label || t.contentType} ${suffix}` : (ct.label || t.contentType);
                            return (
                              <div key={t._id} className="emp-wt-task"
                                style={{ background:sty.bg, borderColor:sty.border, color:sty.color, display:"flex", alignItems:"center", gap:4 }}>
                                <i className={`bi ${ct.icon||"bi-list-task"}`} style={{ fontSize:9, flexShrink:0 }} />
                                {displayLabel}
                              </div>
                            );
                          })}
                          {unfilledSlots.map((slot, si) => {
                            const ct = WT_CONTENT_META[slot.contentType] || {};
                            const slotLabel = `${ct.label || slot.contentType} ${slot.slotIdx + 1} ${empMonthLabel}`;
                            return (
                              <div key={si} className="emp-wt-slot"
                                style={{ background:"#F8FAFC", color:"#94A3B8", border:"1px dashed #D1D5DB" }}>
                                <i className={`bi ${ct.icon||"bi-dot"}`} style={{ fontSize:9 }} />
                                {slotLabel}
                              </div>
                            );
                          })}
                          {unfilledSlots.length === 0 && dayTasks.length === 0 && (
                            <div style={{ fontSize:10, color:"#E5E7EB", textAlign:"center", paddingTop:4 }}>—</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── BRAND CALENDAR TAB ───────────────────────────────────────────────────────
function BrandCalendarTab({ tasks }) {
  const [brands,      setBrands]      = useState([]);
  const [selBrand,    setSelBrand]    = useState(null);
  const [brandTasks,  setBrandTasks]  = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const seen = new Set(); const bs = [];
    tasks.forEach(t => { if (t.brandId && !seen.has(t.brandId._id)) { seen.add(t.brandId._id); bs.push(t.brandId); } });
    setBrands(bs);
    if (bs.length > 0) setSelBrand(bs[0]);
  }, [tasks]);

  useEffect(() => {
    if (!selBrand) return;
    setLoading(true);
    fetch(`/api/employee/brand-tasks?brandId=${selBrand._id}`, { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setBrandTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selBrand]);

  function groupByWeek(list) {
    const g = {};
    list.forEach(t => {
      // Use stage deadline as primary date for production tasks
      const raw = getStageDeadline(t) || new Date(t.createdAt);
      const d = new Date(raw); d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const key = mon.toISOString().slice(0, 10);
      if (!g[key]) g[key] = { mon, tasks: [] };
      g[key].tasks.push(t);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }

  const productionTasks = brandTasks.filter(t => t.taskType === "production" || t.contentType);
  const weeks = groupByWeek(productionTasks);

  if (brands.length === 0) return (
    <div className="tms-card"><div className="tms-empty"><i className="bi bi-calendar-x" style={{ fontSize: 36 }} /><p>No brands with tasks assigned</p></div></div>
  );

  return (
    <>
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {brands.map(b => (
          <div key={b._id} onClick={() => setSelBrand(b)} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1.5px solid", transition: "all .15s", display: "flex", alignItems: "center", gap: 6, background: selBrand?._id === b._id ? "#4F46E5" : "#fff", color: selBrand?._id === b._id ? "#fff" : "#374151", borderColor: selBrand?._id === b._id ? "#4F46E5" : "#E5E7EB" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: selBrand?._id === b._id ? "#fff" : b.color, display: "inline-block" }} />{b.name}
          </div>
        ))}
      </div>
      {loading ? (
        <div className="tms-card"><div className="tms-empty"><div className="spinner-border spinner-border-sm text-primary" /></div></div>
      ) : productionTasks.length === 0 ? (
        <div className="tms-card"><div className="tms-empty"><i className="bi bi-calendar2" style={{ fontSize: 36 }} /><p>No content tasks for this brand</p></div></div>
      ) : weeks.map(([key, { mon, tasks: wt }]) => {
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        return (
          <div key={key} className="tms-card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ padding: "11px 16px", background: "#F9FAFB", borderBottom: "1px solid #F0F0F0", fontWeight: 700, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
              <span>Week of {fmtD(mon)} – {fmtD(sun)}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>{wt.length} tasks</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                    {["#", "Deadline", "Type", "Name", "Pillar", "Script / Content", "Status", "Stage", "Ref"].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".4px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wt.map((t, ri) => {
                    const dl = getStageDeadline(t);
                    const od = dl ? isOverdue(dl) && t.status !== "completed" : false;
                    const sm = STATUS_MAP[t.status] || STATUS_MAP.todo;
                    return (
                      <tr key={t._id} onClick={() => setSelectedTask(t)}
                        style={{ borderBottom: "1px solid #F9F9F9", cursor: "pointer", background: od ? "#FFF5F5" : "", transition: "background .1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = od ? "#FEE2E2" : "#F5F3FF"}
                        onMouseLeave={e => e.currentTarget.style.background = od ? "#FFF5F5" : ""}>
                        <td style={{ padding: "11px 14px", color: "#9CA3AF", fontSize: 11, fontFamily: "monospace" }}>{ri + 1}</td>
                        <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap", color: od ? "#DC2626" : "#374151", fontWeight: od ? 700 : 400 }}>
                          {od && <i className="bi bi-exclamation-circle-fill me-1" style={{ fontSize: 10 }} />}
                          {dl ? fmtD(dl) : "—"}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          {t.contentType
                            ? <span style={{ padding: "2px 7px", borderRadius: 4, background: (CTYPE_COLOR[t.contentType] || "#6366F1") + "22", color: CTYPE_COLOR[t.contentType] || "#6366F1", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.contentType}</span>
                            : <span style={{ color: "#D1D5DB" }}>—</span>}
                        </td>
                        <td style={{ padding: "11px 14px", fontWeight: 600, fontSize: 12, maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.nomenclature || t.title || "—"}
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{t.pillar || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                        <td style={{ padding: "11px 14px", maxWidth: 200, fontSize: 11, color: t.description ? "#374151" : "#D1D5DB" }}>
                          {t.description
                            ? <>{t.description.slice(0, 60)}{t.description.length > 60 ? "…" : ""}</>
                            : <span style={{ fontStyle: "italic" }}>Not written yet</span>}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span className={`tms-badge ${sm.cls}`} style={{ fontSize: 10 }}>{sm.label}</span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>{t.stage ? <StageDots stage={t.stage} size={18} /> : <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                        <td style={{ padding: "11px 14px" }}>
                          {t.referenceLink
                            ? <a href={t.referenceLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#4F46E5", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 3 }}><i className="bi bi-link-45deg" />View</a>
                            : <span style={{ color: "#D1D5DB" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── MY CALENDAR TAB (Content Team — shows assigned tasks by stage deadline) ───
function MyCalendarTab() {
  const today  = new Date();
  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [tasks,       setTasks]       = useState([]);
  const [brands,      setBrands]      = useState([]);
  const [brandFilter, setBrandFilter] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [dayPanel,    setDayPanel]    = useState(null);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const q     = new URLSearchParams({ dateStart: start, dateEnd: end });
    if (brandFilter) q.set("brandId", brandFilter);
    setLoading(true);
    setDayPanel(null);
    Promise.all([
      fetch(`/api/employee/brand-tasks?${q}`, { headers: authH() }).then(r => r.json()),
      fetch(`/api/employee/weekly-tracker?dateStart=${start}&dateEnd=${end}`, { headers: authH() }).then(r => r.json()),
    ])
      .then(([td, bd]) => {
        if (td.success) setTasks(td.tasks || []);
        if (bd.success) {
          const bs = bd.brands || [];
          setBrands(bs);
          // Auto-select Viralon, or first brand — never "All"
          setBrandFilter(prev => {
            if (prev && bs.find(b => String(b._id) === prev)) return prev;
            const viralon = bs.find(b => /viralon/i.test(b.name));
            return String(viralon?._id || bs[0]?._id || "");
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month, brandFilter]);

  const monthName = new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const offset    = firstDay === 0 ? 6 : firstDay - 1;
  const cells     = Array(offset).fill(null).concat(Array.from({ length: daysInMon }, (_, i) => i + 1));
  const DAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const MC_DLVR   = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
  const MC_MONS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mcMonLabel = `${MC_MONS[month]}'${String(year).slice(2)}`;

  function mcSlotIndex(dayNum, contentType, weeklySchedule) {
    const DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const target = new Date(year, month, dayNum);
    let count = 0;
    const cur = new Date(year, month, 1);
    while (cur <= target) {
      count += weeklySchedule.filter(s => s.day === DN[cur.getDay()] && s.contentType === contentType).length;
      cur.setDate(cur.getDate() + 1);
    }
    return count - 1;
  }

  const tasksByDay = (() => {
    const result = {};
    const DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const taskGroups = {};
    tasks.forEach(t => {
      if (!t.brandId) return;
      const bId = typeof t.brandId === "object" ? String(t.brandId._id || t.brandId) : String(t.brandId);
      const ct  = t.contentType || "__unknown";
      if (!taskGroups[bId]) taskGroups[bId] = {};
      if (!taskGroups[bId][ct]) taskGroups[bId][ct] = [];
      taskGroups[bId][ct].push(t);
    });
    Object.values(taskGroups).forEach(byType =>
      Object.values(byType).forEach(arr => arr.sort((a, b) => (a.taskId || "").localeCompare(b.taskId || "")))
    );
    const brandsToUse = brands;
    brandsToUse.forEach(brand => {
      const bId = String(brand._id);
      if (!taskGroups[bId]) return;
      const schedule = brand.weeklySchedule || [];
      for (let day = 1; day <= daysInMon; day++) {
        const dayLabel = DN[new Date(year, month, day).getDay()];
        schedule.filter(s => s.day === dayLabel).forEach(slot => {
          const ct = slot.contentType;
          const ctTasks = taskGroups[bId]?.[ct];
          if (!ctTasks || !ctTasks.length) return;
          const idx = mcSlotIndex(day, ct, schedule);
          if (idx < 0 || idx >= ctTasks.length) return;
          const dlvrKey = MC_DLVR[ct];
          if (dlvrKey) {
            const limit = brand.monthlyDeliverables?.[dlvrKey];
            if (limit != null && idx >= limit) return;
          }
          if (!result[day]) result[day] = [];
          result[day].push(ctTasks[idx]);
        });
      }
    });
    return result;
  })();

  return (
    <div>
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />

      {/* Brand dropdown */}
      {brands.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", flexShrink: 0 }}>Brand:</span>
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid #E5E7EB", fontSize: 13, fontWeight: 600, outline: "none", background: "#fff", color: "#1E293B", cursor: "pointer", minWidth: 160 }}>
            {brands.map(b => <option key={b._id} value={String(b._id)}>{b.name}</option>)}
          </select>
          {/* Colour dot for selected brand */}
          {(() => { const sel = brands.find(b => String(b._id) === brandFilter); return sel ? <span style={{ width: 10, height: 10, borderRadius: "50%", background: sel.color || "#6366F1", display: "inline-block", flexShrink: 0 }} /> : null; })()}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {[["#F97316","S1"],["#3B82F6","S2"],["#EAB308","S3"],["#22C55E","S4"]].flatMap(([c,l]) => [
          <span key={l+"a"} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
            <span style={{ width:18, height:12, borderRadius:3, background:"#fff", border:`1.5px solid ${c}`, display:"inline-block" }} />{l} Assigned
          </span>,
          <span key={l+"d"} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
            <span style={{ width:18, height:12, borderRadius:3, background:c, border:`1.5px solid ${c}`, display:"inline-block" }} />{l} Approved
          </span>,
        ])}
        <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
          <span style={{ width:18, height:12, borderRadius:3, background:"#F8FAFC", border:"1px dashed #D1D5DB", display:"inline-block" }} />Scheduled (plan)
        </span>
      </div>

      <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #F0F0F0" }}>
          <button onClick={prevMonth} style={{ background: "#F3F4F6", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-chevron-left" />
          </button>
          <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>{monthName}</span>
          <button onClick={nextMonth} style={{ background: "#F3F4F6", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-chevron-right" />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}><div className="spinner-border spinner-border-sm text-primary" /></div>
        ) : (
          <>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #F3F4F6" }}>
              {DAY_HEADS.map(d => (
                <div key={d} style={{ padding: "9px 0", textAlign: "center", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#9CA3AF" }}>{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} style={{ minHeight: 90, borderBottom: "1px solid #F9F9F9", borderRight: "1px solid #F9F9F9" }} />;
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const dt = tasksByDay[day] || [];

                // Planned slots (only when brand is selected)
                const selBrand = brandFilter ? brands.find(b => String(b._id) === brandFilter) : null;
                let unfilledSlots = [];
                if (selBrand) {
                  const DN2 = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                  const dl2 = DN2[new Date(year, month, day).getDay()];
                  const sc2 = (selBrand.weeklySchedule || []).filter(s => s.day === dl2);
                  const rem = {};
                  dt.forEach(t => { rem[t.contentType] = (rem[t.contentType] || 0) + 1; });
                  unfilledSlots = sc2.reduce((acc, slot) => {
                    const ct = slot.contentType;
                    const slotIdx = mcSlotIndex(day, ct, selBrand.weeklySchedule || []);
                    const dlvrKey = MC_DLVR[ct];
                    if (dlvrKey) {
                      const limit = selBrand.monthlyDeliverables?.[dlvrKey];
                      if (limit != null && slotIdx >= limit) return acc;
                    }
                    if ((rem[ct] || 0) > 0) { rem[ct]--; return acc; }
                    acc.push({ ...slot, slotIdx });
                    return acc;
                  }, []);
                }

                const preview   = dt.slice(0, 3);
                const extraTask = dt.length - preview.length;
                const slotsShow = unfilledSlots.slice(0, Math.max(0, 3 - preview.length));
                const extraSlot = unfilledSlots.length - slotsShow.length;

                return (
                  <div key={day}
                    onClick={() => dt.length > 0 && setDayPanel({ day, tasks: dt })}
                    style={{ minHeight: 100, padding: "7px 6px", borderBottom: "1px solid #F9F9F9", borderRight: "1px solid #F9F9F9", background: isToday ? "#FFFBEB" : "#fff", cursor: dt.length > 0 ? "pointer" : "default" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", marginBottom: 5, display: "flex", alignItems: "center", justifyContent: "center", background: isToday ? "#D97706" : "transparent", fontSize: 12, fontWeight: isToday ? 800 : 400, color: isToday ? "#fff" : "#374151" }}>{day}</div>
                    {preview.map(t => {
                      const ct  = WT_CONTENT_META[t.contentType] || {};
                      const sty = getTaskStageStyle(t);
                      const nom = t.nomenclature || t.title || "";
                      const ctL = (t.contentType || "").toLowerCase();
                      let sfx = nom.toLowerCase().startsWith(ctL) ? nom.slice(ctL.length).trim() : nom;
                      sfx = sfx.replace(/\b[a-z]/g, c => c.toUpperCase());
                      const lbl = sfx ? `${ct.label||t.contentType} ${sfx}` : (ct.label||nom);
                      return (
                        <div key={t._id} onClick={e => { e.stopPropagation(); setSelectedTask(t); }} title={nom}
                          style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 3, background: sty.bg, color: sty.color, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer", border:`1.5px solid ${sty.border}`, display:"flex", alignItems:"center", gap:3 }}>
                          {ct.icon && <i className={`bi ${ct.icon}`} style={{ fontSize:9, flexShrink:0 }} />}{lbl}
                        </div>
                      );
                    })}
                    {extraTask > 0 && <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 600, cursor:"pointer" }} onClick={e => { e.stopPropagation(); setDayPanel({ day, tasks: dt }); }}>+{extraTask} more</div>}
                    {slotsShow.map((slot, si) => {
                      const ct = WT_CONTENT_META[slot.contentType] || {};
                      return (
                        <div key={`ps${si}`}
                          style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 3, background: "#F8FAFC", color: "#94A3B8", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", border: "1px dashed #D1D5DB", display:"flex", alignItems:"center", gap:3 }}>
                          {ct.icon && <i className={`bi ${ct.icon}`} style={{ fontSize:9, flexShrink:0 }} />}
                          {`${ct.label||slot.contentType} ${slot.slotIdx+1} ${mcMonLabel}`}
                        </div>
                      );
                    })}
                    {extraSlot > 0 && <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600 }}>+{extraSlot} planned</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Day panel — click a day to see all tasks */}
      {dayPanel && (
        <div className="tms-card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", background: "#F9FAFB", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {new Date(year, month, dayPanel.day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              <span style={{ marginLeft: 8, fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>{dayPanel.tasks.length} task{dayPanel.tasks.length !== 1 ? "s" : ""}</span>
            </span>
            <button onClick={() => setDayPanel(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 16 }}>×</button>
          </div>
          {dayPanel.tasks.map(t => {
            const brandColor = t.brandId?.color || "#7C3AED";
            const sm = STATUS_MAP[t.status] || STATUS_MAP.todo;
            return (
              <div key={t._id} style={{ padding: "14px 18px", borderBottom: "1px solid #F9F9F9", cursor: "pointer" }} onClick={() => setSelectedTask(t)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 4, borderRadius: 4, background: brandColor, alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>{t.nomenclature || t.title}</span>
                      {t.contentType && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: brandColor + "20", color: brandColor, fontWeight: 700, textTransform: "capitalize" }}>{t.contentType}</span>}
                      <span className={`tms-badge ${sm.cls}`} style={{ fontSize: 10 }}>{sm.label}</span>
                    </div>
                    {t.brandId && <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}><i className="bi bi-building me-1" />{typeof t.brandId === "object" ? t.brandId.name : ""}</div>}
                    {t.pillar && <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}><i className="bi bi-tag me-1" />{t.pillar}</div>}
                    {t.description ? (
                      <div style={{ fontSize: 12, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "8px 10px", lineHeight: 1.6, maxHeight: 80, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                        {t.description.slice(0, 200)}{t.description.length > 200 ? "…" : ""}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#D1D5DB", fontStyle: "italic" }}>No script written yet</div>
                    )}
                    {t.referenceLink && (
                      <a href={t.referenceLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: "#4F46E5", textDecoration: "none" }}>
                        <i className="bi bi-link-45deg" />Reference link
                      </a>
                    )}
                  </div>
                  <StageDots stage={t.stage} size={18} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SCRIPT LIBRARY TAB ───────────────────────────────────────────────────────
function ScriptLibraryTab({ tasks }) {
  const [subTab, setSubTab] = useState("voice");
  const completed = tasks.filter(t => t.status === "completed" && (t.description?.length || 0) > 10);
  const approved  = tasks.filter(t => t.status === "completed" && t.stage === "S4");
  const brands    = [...new Map(tasks.filter(t => t.brandId).map(t => [t.brandId._id, t.brandId])).values()];
  const SUB_TABS  = [{ key: "voice", label: "Brand Voice Docs" }, { key: "scripts", label: "Top Scripts" }, { key: "hooks", label: "Hook Templates" }, { key: "guide", label: "Style Guide" }];
  const hookTemplates = ["POV: You just discovered ___", "The #1 reason why ___", "Nobody talks about this but ___", "Stop doing ___ (do this instead)", "This changed how I ___ forever", "If you're struggling with ___, watch this"];

  return (
    <div>
      {/* Metrics */}
      <div className="tms-stats" style={{ marginBottom: 24 }}>
        {[
          { icon: "bi-file-text", bg: "#EDE9FE", ic: "#7C3AED", val: tasks.filter(t => (t.description?.length || 0) > 10).length, label: "Total Scripts" },
          { icon: "bi-check2-circle", bg: "#D1FAE5", ic: "#065F46", val: approved.length, label: "Approved (S4)" },
          { icon: "bi-collection", bg: "#FEF3C7", ic: "#D97706", val: brands.length, label: "Brands Covered" },
        ].map(m => (
          <div key={m.label} className="tms-stat">
            <div className="tms-stat-icon" style={{ background: m.bg }}><i className={`bi ${m.icon}`} style={{ color: m.ic }} /></div>
            <div><div className="tms-stat-val">{m.val}</div><div className="tms-stat-label">{m.label}</div></div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #F0F0F0", marginBottom: 18 }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} style={{ padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", border: "none", color: subTab === t.key ? "#7C3AED" : "#9CA3AF", borderBottom: `2px solid ${subTab === t.key ? "#7C3AED" : "transparent"}`, marginBottom: -2, transition: "all .15s" }}>{t.label}</button>
        ))}
      </div>

      {subTab === "voice" && (
        <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
              {["Brand", "Voice Summary", "Last Updated", "Action"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {brands.length === 0 ? <tr><td colSpan={4} style={{ padding: "40px 16px", textAlign: "center", color: "#9CA3AF" }}>No brand data available</td></tr>
                : brands.map(b => (
                  <tr key={b._id} style={{ borderBottom: "1px solid #F5F5F5" }}>
                    <td style={{ padding: "13px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: b.color, display: "inline-block" }} /><span style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</span></div></td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#6B7280" }}>Hook fast · CTA always · Stay on-brand</td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#9CA3AF", fontFamily: "monospace" }}>—</td>
                    <td style={{ padding: "13px 16px" }}><button style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", color: "#6B7280", fontSize: 12, cursor: "pointer" }}>View</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "scripts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {completed.length === 0 ? <div className="tms-card"><div className="tms-empty"><i className="bi bi-file-earmark-x" style={{ fontSize: 36 }} /><p>No completed scripts yet</p></div></div>
            : completed.slice(0, 10).map(t => (
              <div key={t._id} className="tms-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.nomenclature || t.title}</div>
                  {t.brandId && <span style={{ padding: "2px 9px", borderRadius: 20, background: t.brandId.color + "20", color: t.brandId.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{t.brandId.name}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "#6B7280", lineHeight: 1.7 }}>{(t.description || "").slice(0, 200)}{(t.description?.length || 0) > 200 ? "…" : ""}</p>
              </div>
            ))}
        </div>
      )}

      {subTab === "hooks" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {hookTemplates.map((h, i) => (
            <div key={i} className="tms-card">
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#7C3AED", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>Hook #{String(i + 1).padStart(2, "0")}</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{h}</p>
            </div>
          ))}
        </div>
      )}

      {subTab === "guide" && (
        <div className="tms-card">
          <h5 style={{ marginBottom: 20, marginTop: 0 }}>Content Style Guide</h5>
          {[
            { title: "Tone", body: "Conversational, direct, energetic. Avoid corporate speak. Write like you're talking to a friend who respects your expertise." },
            { title: "Format", body: "Hook → Problem/Context → Solution/Value → CTA. Keep scripts under 60 seconds for Reels. Use line breaks for readability." },
            { title: "Language", body: "Active voice always. Short sentences. Lead with the benefit, not the feature." },
            { title: "CTA Rules", body: "Every piece of content must have one clear CTA. Be specific: 'Save this' / 'DM us the word X' — not just 'check it out'." },
          ].map((s, i, arr) => (
            <div key={s.title} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: i < arr.length - 1 ? "1px solid #F0F0F0" : "none" }}>
              <h6 style={{ color: "#7C3AED", marginBottom: 6, marginTop: 0 }}>{s.title}</h6>
              <p style={{ margin: 0, fontSize: 13.5, color: "#6B7280", lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SUBMISSIONS TAB ──────────────────────────────────────────────────────────
function SubmissionsTab({ tasks }) {
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter]     = useState("all"); // all | pending | approved | revision

  // Tasks where any stage has been submitted (done=true)
  const submitted = tasks.filter(t =>
    (t.stages || []).some(s => s.done) || ["review", "completed"].includes(t.status)
  );
  const pending   = submitted.filter(t => t.status === "review" || (t.stages || []).some(s => s.done && !s.approved && !s.rejected));
  const approved  = submitted.filter(t => t.status === "completed" || (t.stages || []).some(s => s.approved));
  const revision  = submitted.filter(t => (t.stages || []).some(s => s.rejected) || (t.status === "todo" && t.reviewNote));

  const displayList = filter === "pending"  ? pending
                    : filter === "approved" ? approved
                    : filter === "revision" ? revision
                    : submitted;

  function getStageOutcome(t) {
    const stages = t.stages || [];
    const rejected = stages.find(s => s.rejected);
    if (rejected) return { label: "Revision Needed", color: "#DC2626", bg: "#FEE2E2", icon: "bi-arrow-counterclockwise" };
    const pending  = stages.find(s => s.done && !s.approved && !s.rejected);
    if (pending)   return { label: "Pending Review", color: "#B45309", bg: "#FEF3C7", icon: "bi-hourglass-split" };
    const anyApproved = stages.some(s => s.approved);
    if (t.status === "completed") return { label: "Approved", color: "#065F46", bg: "#D1FAE5", icon: "bi-check2-circle" };
    if (anyApproved) return { label: "Approved", color: "#065F46", bg: "#D1FAE5", icon: "bi-check2-circle" };
    return { label: "Submitted", color: "#4F46E5", bg: "#EDE9FE", icon: "bi-send-check" };
  }

  function getSubmittedDate(t) {
    const doneStages = (t.stages || []).filter(s => s.doneAt).map(s => new Date(s.doneAt));
    if (doneStages.length) return doneStages.sort((a, b) => b - a)[0]; // most recent
    return t.submittedAt ? new Date(t.submittedAt) : null;
  }

  function getRejectionNote(t) {
    const rejected = (t.stages || []).find(s => s.rejected && s.rejectReason);
    return rejected?.rejectReason || t.reviewNote || null;
  }

  return (
    <div>
      {/* Summary cards — only real data */}
      <div className="tms-stats" style={{ marginBottom: 20 }}>
        {[
          { icon: "bi-send-check",      bg: "#EDE9FE", ic: "#7C3AED", val: submitted.length, label: "Total Submitted",  key: "all" },
          { icon: "bi-hourglass-split", bg: "#FEF3C7", ic: "#B45309", val: pending.length,   label: "Pending Review",   key: "pending" },
          { icon: "bi-check2-circle",   bg: "#D1FAE5", ic: "#065F46", val: approved.length,  label: "Approved",         key: "approved" },
          { icon: "bi-arrow-counterclockwise", bg: "#FEE2E2", ic: "#DC2626", val: revision.length, label: "Needs Revision", key: "revision" },
        ].map(m => (
          <div key={m.label} className="tms-stat" onClick={() => setFilter(f => f === m.key ? "all" : m.key)}
            style={{ cursor: "pointer", outline: filter === m.key ? `2px solid ${m.ic}` : "none", transition: "outline .12s" }}>
            <div className="tms-stat-icon" style={{ background: m.bg }}><i className={`bi ${m.icon}`} style={{ color: m.ic }} /></div>
            <div><div className="tms-stat-val" style={{ color: filter === m.key ? m.ic : undefined }}>{m.val}</div><div className="tms-stat-label">{m.label}</div></div>
          </div>
        ))}
      </div>

      {/* Submission cards */}
      {displayList.length === 0 ? (
        <div className="tms-card"><div className="tms-empty"><i className="bi bi-inbox" style={{ fontSize: 36 }} /><p>No submissions yet</p></div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {displayList.map(t => {
            const outcome      = getStageOutcome(t);
            const submittedAt  = getSubmittedDate(t);
            const rejectNote   = getRejectionNote(t);
            const brandColor   = t.brandId?.color || "#7C3AED";
            const isOpen       = !!expanded[t._id];

            return (
              <div key={t._id} className="tms-card" style={{ padding: 0, overflow: "hidden", border: rejectNote ? "1.5px solid #FCA5A5" : undefined }}>
                {/* Header */}
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                  onClick={() => setExpanded(p => ({ ...p, [t._id]: !p[t._id] }))}>
                  {/* Brand strip */}
                  <div style={{ width: 4, borderRadius: 4, background: brandColor, alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>{t.nomenclature || t.title}</span>
                      {t.contentType && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: brandColor + "20", color: brandColor, fontWeight: 700, textTransform: "capitalize" }}>{t.contentType}</span>}
                      <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: outcome.bg, color: outcome.color, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <i className={`bi ${outcome.icon}`} style={{ fontSize: 9 }} />{outcome.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                      {t.brandId && <span style={{ fontSize: 11, color: "#9CA3AF" }}><i className="bi bi-building me-1" />{t.brandId.name}</span>}
                      {submittedAt && <span style={{ fontSize: 11, color: "#9CA3AF" }}><i className="bi bi-clock me-1" />Submitted {fmtDT(submittedAt)}</span>}
                      {t.pillar && <span style={{ fontSize: 11, color: "#9CA3AF" }}><i className="bi bi-tag me-1" />{t.pillar}</span>}
                    </div>
                  </div>
                  <StageDots stage={t.stage} size={18} />
                  <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`} style={{ color: "#D1D5DB", fontSize: 12, flexShrink: 0 }} />
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid #F5F5F5" }}>
                    {/* Admin rejection note */}
                    {rejectNote && (
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", margin: "12px 0 10px", fontSize: 12, color: "#DC2626", lineHeight: 1.6 }}>
                        <i className="bi bi-exclamation-circle-fill me-2" />
                        <strong>Admin feedback:</strong> {rejectNote}
                      </div>
                    )}

                    {/* Script / description */}
                    {t.description && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Script / Content</div>
                        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#374151", lineHeight: 1.65, whiteSpace: "pre-wrap", maxHeight: 160, overflowY: "auto" }}>
                          {t.description}
                        </div>
                      </div>
                    )}

                    {/* Caption */}
                    {t.caption && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Caption</div>
                        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#374151", lineHeight: 1.65, whiteSpace: "pre-wrap", maxHeight: 100, overflowY: "auto" }}>
                          {t.caption}
                        </div>
                      </div>
                    )}

                    {/* Hashtags */}
                    {t.tags?.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Hashtags</div>
                        <div style={{ fontSize: 12, color: "#6366F1", background: "#EEF2FF", borderRadius: 8, padding: "8px 12px", lineHeight: 1.8 }}>
                          {t.tags.map(tg => `#${tg}`).join("  ")}
                        </div>
                      </div>
                    )}

                    {/* Stage proof links */}
                    {(t.stages || []).some(s => s.proofUrls?.length) && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Proof / Deliverables</div>
                        {(t.stages || []).flatMap(s => s.proofUrls || []).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4F46E5", marginRight: 10, marginBottom: 4, textDecoration: "none" }}>
                            <i className="bi bi-link-45deg" />Proof {i + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Reference link */}
                    {t.referenceLink && (
                      <div style={{ marginTop: 8 }}>
                        <a href={t.referenceLink} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4F46E5", textDecoration: "none" }}>
                          <i className="bi bi-link-45deg" />Reference link
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SPRINT BOARD TAB ─────────────────────────────────────────────────────────
function SprintBoardTab({ tasks }) {
  const COLS = [
    { key: "todo",        label: "Backlog",     color: "#6B7280" },
    { key: "in_progress", label: "In Progress", color: "#1D4ED8" },
    { key: "review",      label: "Review",      color: "#B45309" },
    { key: "completed",   label: "Done",        color: "#065F46" },
  ];
  const devTasks = tasks.filter(t => ["project", "sprint"].includes(t.taskType));

  async function updateStatus(id, status) {
    try {
      const r = await fetch(`/api/employee/tasks/${id}`, { method: "PATCH", headers: authH(), body: JSON.stringify({ status }) });
      const d = await r.json();
      if (d.success) { toast.success("Updated"); }
      else toast.error(d.message);
    } catch { toast.error("Update failed"); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {COLS.map(col => {
        const ct = devTasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, minHeight: 400 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: col.color }}>{col.label}</span>
              <span style={{ background: col.color + "22", color: col.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{ct.length}</span>
            </div>
            {ct.length === 0 && <div style={{ color: "#D1D5DB", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Empty</div>}
            {ct.map(t => (
              <div key={t._id} className="tms-card" style={{ marginBottom: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{t.title}</div>
                {t.dueDate && <div style={{ fontSize: 10.5, color: isOverdue(t.dueDate) ? "#DC2626" : "#9CA3AF", marginBottom: 8 }}>{fmtD(t.dueDate)}</div>}
                <select value={t.status} onChange={e => updateStatus(t._id, e.target.value)} style={{ width: "100%", padding: "5px 8px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12, background: "#fff", cursor: "pointer", outline: "none" }}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Done</option>
                  <option value="blocked">Rejected</option>
                </select>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── PERFORMANCE TAB ──────────────────────────────────────────────────────────
function PerformanceTab({ tasks, employee }) {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const overdue   = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length;
  const inProg    = tasks.filter(t => t.status === "in_progress").length;
  const onTime    = completed > 0 ? Math.round((tasks.filter(t => t.status === "completed" && !isOverdue(t.dueDate)).length / completed) * 100) : 0;
  const grade     = onTime >= 90 ? "A" : onTime >= 75 ? "B" : onTime >= 60 ? "C" : "D";
  const gradeColor = { A: "#065F46", B: "#7C3AED", C: "#B45309", D: "#DC2626" }[grade];
  const gradeBg    = { A: "#D1FAE5", B: "#EDE9FE", C: "#FEF3C7", D: "#FEE2E2" }[grade];

  const brands = [...new Map(tasks.filter(t => t.brandId).map(t => [t.brandId._id, t.brandId])).values()];
  const brandStats = brands.map(b => {
    const bt  = tasks.filter(t => t.brandId?._id === b._id);
    const bc  = bt.filter(t => t.status === "completed").length;
    const bon = bt.filter(t => t.status === "completed" && !isOverdue(t.dueDate)).length;
    return { ...b, total: bt.length, completed: bc, onTime: bc > 0 ? Math.round((bon / bc) * 100) : 0 };
  });

  const months = [...Array(6)].map((_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleDateString("en-IN", { month: "short" });
    const mt = tasks.filter(t => {
      if (t.status !== "completed") return false;
      const td = new Date(t.updatedAt || t.createdAt);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    }).length;
    return { label, val: mt };
  });
  const maxBar = Math.max(...months.map(m => m.val), 1);

  const feedback = [
    { text: "Great hook writing — the reel landed perfectly.", date: "Recently", pos: true },
    { text: "Caption could be more concise. Aim for under 100 chars.", date: "Last week", pos: false },
    { text: "Excellent CTA on the carousel series — engagement was 2× avg.", date: "2 weeks ago", pos: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Grade band */}
      <div className="tms-card" style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: gradeBg, border: `3px solid ${gradeColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: gradeColor, flexShrink: 0 }}>{grade}</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>{employee?.firstName} {employee?.lastName}</div>
          <div style={{ fontSize: 13, color: "#9CA3AF" }}>{employee?.professional?.designation || employee?.professional?.department || ""}</div>
        </div>
        <div style={{ flex: 1 }} />
        {[
          { label: "On-time %",    val: `${onTime}%`,  color: gradeColor },
          { label: "Active",       val: `${inProg}`,   color: "#1D4ED8" },
          { label: "Shipped",      val: completed,      color: "#065F46" },
          { label: "Total Tasks",  val: total,          color: "#374151" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", padding: "0 18px", borderLeft: "1px solid #F0F0F0" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".4px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        {/* Bar chart */}
        <div className="tms-card">
          <h6 style={{ marginBottom: 20, marginTop: 0 }}>Monthly Output (last 6 months)</h6>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 130 }}>
            {months.map(m => (
              <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", minHeight: 18 }}>{m.val || ""}</div>
                <div style={{ width: "100%", background: "#F3F4F6", borderRadius: 5, height: 90, display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", background: m.val > 0 ? "#7C3AED" : "transparent", borderRadius: 5, height: `${(m.val / maxBar) * 100}%`, transition: "height .5s ease", minHeight: m.val > 0 ? 4 : 0 }} />
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="tms-card">
          <h6 style={{ marginBottom: 16, marginTop: 0 }}>Latest Feedback</h6>
          {feedback.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: i < feedback.length - 1 ? "1px solid #F0F0F0" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.pos ? "#22c55e" : "#EF4444", marginTop: 4, flexShrink: 0 }} />
              <div>
                <p style={{ margin: "0 0 3px", fontSize: 12.5, lineHeight: 1.5 }}>{f.text}</p>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{f.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand breakdown */}
      {brandStats.length > 0 && (
        <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #F0F0F0" }}><h6 style={{ margin: 0, fontWeight: 700 }}>Performance by Brand</h6></div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
              {["Brand", "Tasks", "Completed", "On-time %", "Status"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {brandStats.map(b => (
                <tr key={b._id} style={{ borderBottom: "1px solid #F5F5F5" }}>
                  <td style={{ padding: "13px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: b.color, display: "inline-block" }} /><span style={{ fontWeight: 700 }}>{b.name}</span></div></td>
                  <td style={{ padding: "13px 16px", color: "#6B7280" }}>{b.total}</td>
                  <td style={{ padding: "13px 16px", color: "#065F46", fontWeight: 600 }}>{b.completed}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden", minWidth: 60 }}>
                        <div style={{ height: "100%", width: `${b.onTime}%`, background: b.onTime >= 80 ? "#065F46" : b.onTime >= 60 ? "#D97706" : "#DC2626", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "#6B7280", minWidth: 36 }}>{b.onTime}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ padding: "2px 9px", borderRadius: 20, background: b.onTime >= 80 ? "#D1FAE5" : "#FEF3C7", color: b.onTime >= 80 ? "#065F46" : "#B45309", fontSize: 11, fontWeight: 700 }}>
                      {b.onTime >= 80 ? "On track" : "Needs focus"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── DARK PORTAL — constants + helpers ───────────────────────────────────────
const NEXT_STAGE   = { S1: "S2", S2: "S3", S3: "S4", S4: "S4" };
const STAGE_NUM    = { S1: 1, S2: 2, S3: 3, S4: 4 };
const STATUS_COLOR = { todo: "#64748b", in_progress: "#3b82f6", review: "#f59e0b", completed: "#22c55e", blocked: "#ef4444" };
const SL           = { todo: "To Do", in_progress: "In Progress", review: "Review", completed: "Done", blocked: "Rejected" };
const RL           = { content: "Content Writer", design: "Designer", editor: "Video Editor", developer: "Developer", general: "Team Member" };

// filterTasksByMonth — shared helper used by callers of calcGrade
function filterTasksByMonth(tasks, month, year) {
  return tasks.filter(t => {
    const dl = getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null);
    return dl && dl.getFullYear() === year && dl.getMonth() === month;
  });
}

function calcGrade(tasks) {
  // Score each task 0-5 based on submission lateness vs deadline
  // 5=A(on time), 4=B(0-4h late), 3=C(4-12h late), 2=D(12-24h late), 1=F(24h+ late), 0=Incomplete
  // NOTE: callers are responsible for pre-filtering tasks to the desired month

  const total = tasks.length;
  if (total === 0) {
    return { letter:"—", color:"#94a3b8", rating:0, rate:0, total:0, completed:0, incomplete:0, aCnt:0, bCnt:0, cCnt:0, dCnt:0, fCnt:0 };
  }

  const scores = tasks.map(t => {
    const deadline = getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null);
    if (!deadline) return null;

    // Get submission time: stage doneAt for production, else submittedAt
    let submittedAt = null;
    if (t.taskType === "production" && t.stages?.length) {
      const doneStages = t.stages.filter(s => s.done || s.approved);
      const first = doneStages[0];
      if (first?.doneAt) submittedAt = new Date(first.doneAt);
    }
    if (!submittedAt && t.submittedAt) submittedAt = new Date(t.submittedAt);

    if (!submittedAt) {
      if (t.status === "completed") return 5; // completed but no time tracked → assume on time
      if (isOverdue(deadline))     return 0; // overdue, not submitted
      return null; // not yet due — exclude from scoring
    }

    const diffH = (submittedAt - deadline) / 3600000;
    if (diffH <= 0)  return 5; // A
    if (diffH <= 4)  return 4; // B
    if (diffH <= 12) return 3; // C
    if (diffH <= 24) return 2; // D
    return 1;                  // F
  }).filter(s => s !== null);

  const aCnt = scores.filter(s => s === 5).length;
  const bCnt = scores.filter(s => s === 4).length;
  const cCnt = scores.filter(s => s === 3).length;
  const dCnt = scores.filter(s => s === 2).length;
  const fCnt = scores.filter(s => s === 1).length;
  const incomplete = scores.filter(s => s === 0).length;
  const completed  = scores.filter(s => s > 0).length;

  const sum    = scores.reduce((a, b) => a + b, 0);
  const rating = scores.length > 0 ? Math.round((sum / scores.length) * 10) / 10 : 0;

  let letter, color;
  if (rating >= 4.5)     { letter = "A+"; color = "#16a34a"; }
  else if (rating >= 4.0) { letter = "A";  color = "#22c55e"; }
  else if (rating >= 3.5) { letter = "B+"; color = "#84cc16"; }
  else if (rating >= 3.0) { letter = "B";  color = "#f5a623"; }
  else if (rating >= 2.5) { letter = "C";  color = "#f59e0b"; }
  else if (rating >= 1.5) { letter = "D";  color = "#ef4444"; }
  else                    { letter = "F";  color = "#dc2626"; }

  const rate = total > 0 ? Math.round(aCnt / total * 100) : 0;

  return { letter, color, rating, rate, total, completed, incomplete, aCnt, bCnt, cCnt, dCnt, fCnt };
}

function getDeadlineInfo(task) {
  if (!task.dueDate) return null;
  const raw = new Date(task.dueDate);
  const now = new Date(); now.setHours(0,0,0,0);
  const d   = new Date(raw); d.setHours(0,0,0,0);
  const diff = Math.round((d - now) / 86400000);
  const diffH = Math.round((raw - new Date()) / 3600000);

  // Always include the real date + time as a subtitle
  const dateStr = raw.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
  const timeStr = raw.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
  const full    = `${dateStr}, ${timeStr}`;

  if (diff < 0) {
    const days = -diff;
    return { text: days === 1 ? "1 day overdue" : `${days}d overdue`, sub: full, color:"#ef4444", urgent:true,  today:false };
  }
  if (diff === 0) {
    const label = diffH > 0 ? `${diffH}h left` : "Due now";
    return { text: label, sub: full, color:"#f5a623", urgent:false, today:true };
  }
  if (diff === 1) return { text:"Due tomorrow", sub: full, color:"#64748b", urgent:false, today:false };
  return { text: full, sub: null, color:"#64748b", urgent:false, today:false };
}

function isDueToday(d) {
  if (!d) return false;
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return x.getTime() === n.getTime();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function pIni(emp) {
  return `${(emp?.firstName || "?")[0]}${(emp?.lastName || "")[0]}`.toUpperCase();
}

// ─── DARK PORTAL — CSS ────────────────────────────────────────────────────────
const PORTAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ep-bg: #f1f5f9; --ep-surface: #ffffff; --ep-surface2: #f8fafc; --ep-surface3: #e2e8f0;
    --ep-border: #e2e8f0; --ep-amber: #f5a623; --ep-amber-dim: rgba(245,166,35,.12);
    --ep-text: #1e293b; --ep-muted: #64748b; --ep-green: #22c55e; --ep-red: #ef4444;
    --ep-blue: #3b82f6; --ep-brand: #5A57FB; --ep-brand2: #02EBAD;
    --ep-side-bg: #0f1127; --ep-side-text: #b8bfe8; --ep-side-muted: #5c6494;
  }
  .ep-layout { display: flex; min-height: 100vh; background: var(--ep-bg); color: var(--ep-text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; }
  .ep-side { width: 230px; background: var(--ep-side-bg); border-right: 1px solid rgba(90,87,251,.15); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 200; }
  .ep-side-logo { padding: 20px 18px 16px; border-bottom: 1px solid rgba(90,87,251,.2); background: linear-gradient(135deg,rgba(90,87,251,.15) 0%,transparent 100%); }
  .ep-side-logo span { font-size: 18px; font-weight: 800; background: linear-gradient(90deg,#5A57FB,#02EBAD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -.3px; }
  .ep-side-logo small { display: block; font-size: 10px; color: var(--ep-side-muted); margin-top: 2px; letter-spacing: .5px; text-transform: uppercase; }
  .ep-side-nav { flex: 1; overflow-y: auto; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
  .ep-nav { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--ep-side-text); transition: all .18s; border: none; background: none; width: 100%; text-align: left; }
  .ep-nav:hover { background: rgba(90,87,251,.12); color: #fff; }
  .ep-nav.active { background: linear-gradient(90deg,#5A57FB,#4845d4); color: #fff; font-weight: 600; box-shadow: 0 4px 12px rgba(90,87,251,.3); }
  .ep-nav i { font-size: 15px; width: 18px; flex-shrink: 0; }
  .ep-side-footer { padding: 14px; border-top: 1px solid rgba(90,87,251,.2); display: flex; align-items: center; gap: 10px; }
  .ep-ava { width: 36px; height: 36px; border-radius: 50%; background: rgb(90, 87, 251); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0; }
  .ep-side-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; color: #fff; }
  .ep-side-role { font-size: 10px; color: var(--ep-side-muted); white-space: nowrap; }
  .ep-main { flex: 1; margin-left: 230px; min-height: 100vh; display: flex; flex-direction: column; background: var(--ep-bg); }
  .ep-topbar { padding: 14px 28px; border-bottom: 1px solid var(--ep-border); background: #fff; display: flex; align-items: center; justify-content: space-between; gap: 16px; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .ep-topbar-title { font-size: 16px; font-weight: 700; color: var(--ep-text); }
  .ep-content { padding: 24px 28px; flex: 1; }
  .ep-card { background: #fff; border: 1px solid var(--ep-border); border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
  .ep-card-title { font-size: 13px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; color: var(--ep-text); }
  .ep-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .ep-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .ep-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all .18s; outline: none; font-family: inherit; }
  .ep-btn-primary { background: #5A57FB; color: #fff; border-color: #5A57FB; }
  .ep-btn-primary:hover { background: #4845d4; }
  .ep-btn-ghost { background: transparent; color: var(--ep-muted); border-color: var(--ep-border); }
  .ep-btn-ghost:hover { background: var(--ep-surface2); color: var(--ep-text); }
  .ep-btn-sm { padding: 5px 12px; font-size: 12px; }
  .ep-label { font-size: 11px; color: var(--ep-muted); font-weight: 700; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: .5px; }
  .ep-input { width: 100%; padding: 9px 12px; background: var(--ep-surface2); border: 1px solid var(--ep-border); border-radius: 8px; color: var(--ep-text); font-size: 13.5px; outline: none; transition: border-color .18s; font-family: inherit; }
  .ep-input:focus { border-color: var(--ep-amber); }
  .ep-textarea { width: 100%; padding: 12px; background: var(--ep-surface2); border: 1px solid var(--ep-border); border-radius: 8px; color: var(--ep-text); font-size: 13.5px; outline: none; resize: vertical; font-family: inherit; line-height: 1.7; }
  .ep-textarea:focus { border-color: var(--ep-amber); }
  .ep-select { width: 100%; padding: 9px 12px; background: #fff; border: 1px solid var(--ep-border); border-radius: 8px; color: var(--ep-text); font-size: 13.5px; outline: none; cursor: pointer; font-family: inherit; }
  .ep-select:focus { border-color: var(--ep-amber); }
  .ep-form-g { margin-bottom: 14px; }
  .ep-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .ep-modal { background: #fff; border: 1px solid var(--ep-border); border-radius: 16px; padding: 24px; width: 100%; max-width: 460px; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
  .ep-modal-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .ep-modal-title { font-size: 15px; font-weight: 700; color: var(--ep-text); }
  .ep-empty { text-align: center; padding: 40px 20px; color: var(--ep-muted); }
  .ep-empty i { font-size: 38px; margin-bottom: 10px; display: block; }
  .ep-empty p { font-size: 13px; }
  .ep-spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--ep-border); border-top-color: var(--ep-amber); border-radius: 50%; animation: ep-spin .7s linear infinite; }
  @keyframes ep-spin { to { transform: rotate(360deg); } }
  .ep-tcard { background: #fff; border: 1px solid var(--ep-border); border-radius: 12px; padding: 16px 18px; transition: border-color .15s, box-shadow .15s; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
  .ep-tcard:hover { border-color: #cbd5e1; box-shadow: 0 6px 20px rgba(0,0,0,.08); }
  .ep-tcard.urgent { border-color: rgba(239,68,68,.4); background: #fff5f5; }
  .ep-tcard.today-card { border-color: rgba(90,87,251,.35); background: #f5f5ff; }
  .ep-tcard.rejected-card { border-color: rgba(220,38,38,.3); background: #fff5f5; }
  .ep-btn-primary { background: #5A57FB; color: #fff; border-color: #5A57FB; }
  .ep-btn-primary:hover { background: #4845d4; }
  .ep-tgrid { display: grid; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap: 14px; }
  .ep-grade-hero {     background: linear-gradient(135deg, #1e1b4b 0%, #4F46E5 55%, #7C3AED 100%);border-radius: 14px; padding: 24px 28px; margin-bottom: 20px; position: relative; overflow: hidden; border: 1px solid rgba(90,87,251,.2); }
  .ep-grade-hero::before { content:''; position: absolute; top: -80px; right: -80px; width: 260px; height: 260px; background: radial-gradient(circle,rgba(90,87,251,.3),transparent 70%); pointer-events: none; }
  .ep-gh-title { font-size: 26px; font-weight: 800; letter-spacing: -.01em; line-height: 1.2; color: #fff; }
  .ep-gh-title span {    background: linear-gradient(90deg, #FF6F61 29%, #FBA065 95%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;}
  .ep-stats4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-top: 20px; }
  .ep-hstat { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 14px 16px; }
  .ep-hstat-val { font-size: 26px; font-weight: 800; line-height: 1; margin-top: 4px; }
  .ep-hstat-trend { font-size: 11px; margin-top: 4px; }
  .ep-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .ep-sec-title { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: var(--ep-text); }
  .ep-sec-count { background: var(--ep-amber-dim); color: #b45309; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .ep-alert-banner { border-radius: 9px; padding: 12px 18px; display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .ep-perf-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
  .ep-week-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; }
  .ep-day-col { background: var(--ep-surface2); border: 1px solid var(--ep-border); border-radius: 8px; padding: 8px; min-height: 110px; }
  .ep-day-col.today-col { border-color: var(--ep-amber); background: #fffbf0; }
  .ep-day-name { font-size: 10px; color: var(--ep-muted); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; text-align: center; padding-bottom: 5px; border-bottom: 1px solid var(--ep-border); margin-bottom: 5px; }
  .ep-day-name.today-name { color: #b45309; }
  .ep-day-num { font-size: 15px; font-weight: 700; text-align: center; color: var(--ep-text); margin-bottom: 5px; }
  .ep-grade-card { background: linear-gradient(135deg,rgba(34,197,94,.06),#fff); border: 1px solid rgba(34,197,94,.3); border-radius: 12px; padding: 20px; text-align: center; }
  .ep-grade-letter { font-size: 64px; font-weight: 800; line-height: 1; letter-spacing: -.04em; }
  .ep-grade-bar { display: flex; gap: 3px; margin-top: 14px; }
  .ep-grade-bar-cell { flex: 1; height: 5px; border-radius: 3px; }
  .ep-rec-item { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--ep-border); }
  .ep-rec-item:last-child { border-bottom: none; }
  .ep-rec-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; font-size: 13px; }
  .ep-bar-track { height: 7px; background: var(--ep-surface3); border-radius: 4px; overflow: hidden; margin-top: 6px; }
  .ep-bar-fill { height: 100%; border-radius: 4px; transition: width .5s; }
  .ep-perf-grade { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; border: 4px solid var(--ep-amber); color: #b45309; }
  .ep-row-sep { display: flex; align-items: center; gap: 8px; padding: 11px 0; border-bottom: 1px solid var(--ep-border); }
  .ep-row-sep:last-child { border-bottom: none; }
  .ep-profile-ava { width: 76px; height: 76px; border-radius: 50%; background: var(--ep-amber-dim); border: 3px solid var(--ep-amber); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: #b45309; flex-shrink: 0; }
  .ep-brand-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; margin-right: 4px; flex-shrink: 0; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--ep-border); border-radius: 3px; }

  .ep-card  span{color:#111}

  .ep-side-logo img {
    filter: brightness(0) invert(1);
}
  /* ── Mobile bottom tab nav ── */
  .ep-mob-tabs {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 300;
    background: #0f1127; border-top: 1px solid rgba(90,87,251,.2);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .ep-mob-tabs-inner {
    display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; gap: 0;
  }
  .ep-mob-tabs-inner::-webkit-scrollbar { display: none; }
  .ep-mob-tab {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; padding: 8px 12px; min-width: 62px; border: none; background: none;
    cursor: pointer; color: rgba(255,255,255,.4); font-size: 9px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .04em; white-space: nowrap;
    transition: color .15s; flex-shrink: 0;
  }
  .ep-mob-tab i { font-size: 18px; }
  .ep-mob-tab.active { color: #818CF8; }
  .ep-mob-tab.active i { color: #818CF8; }

  /* ── Mobile topbar with back/menu button ── */
  .ep-mob-topbar {
    display: none;
    position: sticky; top: 0; z-index: 200;
    background: #0f1127; padding: 10px 14px;
    align-items: center; gap: 10px;
    border-bottom: 1px solid rgba(90,87,251,.15);
  }
  .ep-mob-topbar-title {
    flex: 1; font-size: 15px; font-weight: 700; color: #fff;
  }

  @media (max-width: 900px) {
    /* Hide desktop sidebar */
    .ep-side { display: none; }
    .ep-main { margin-left: 0; padding-bottom: 64px; }

    /* Show mobile nav */
    .ep-mob-tabs    { display: block; }
    .ep-mob-topbar  { display: flex; }

    /* Hide desktop topbar on mobile (replaced by mob-topbar) */
    .ep-topbar { display: none; }

    /* Content */
    .ep-content { padding: 14px 14px; }

    /* Grids */
    .ep-grid2  { grid-template-columns: 1fr; }
    .ep-grid4  { grid-template-columns: 1fr 1fr; }
    .ep-stats4 { grid-template-columns: 1fr 1fr; }
    .ep-perf-grid { grid-template-columns: 1fr; }
    .ep-week-grid { grid-template-columns: repeat(4,1fr); overflow-x: auto; }
    .ep-tgrid { grid-template-columns: 1fr; }

    /* Grade hero */
    .ep-grade-hero { padding: 18px 16px; border-radius: 12px; }
    .ep-gh-title { font-size: 20px; }
    .ep-hstat { padding: 10px 12px; }
    .ep-hstat-val { font-size: 20px; }
  }

  @media (max-width: 480px) {
    .ep-grid4  { grid-template-columns: 1fr; }
    .ep-stats4 { grid-template-columns: 1fr 1fr; }
    .ep-week-grid { grid-template-columns: repeat(3,1fr); }
    .ep-content { padding: 10px 10px; }
    .ep-grade-hero { padding: 14px 12px; }
    .ep-gh-title { font-size: 18px; }
    .ep-tgrid { grid-template-columns: 1fr; }

    /* Modals full-screen on tiny phones */
    .ep-overlay { padding: 0; align-items: flex-end; }
    .ep-modal { border-radius: 16px 16px 0 0; max-height: 90vh; overflow-y: auto; }
  }
`;

// ─── PORTAL TaskCard ──────────────────────────────────────────────────────────
const STAGE_BADGE = {
  S1:{ bg:"#EDE9FE", color:"#7C3AED" },
  S2:{ bg:"#DBEAFE", color:"#1D4ED8" },
  S3:{ bg:"#FEF3C7", color:"#B45309" },
  S4:{ bg:"#D1FAE5", color:"#065F46" },
};

// ─── Non-SMM Submit Modal ──────────────────────────────────────────────────────
function NonSMMSubmitModal({ task, onClose, onSubmit, submitting }) {
  const [notes,     setNotes]     = useState("");
  const [proofLink, setProofLink] = useState("");
  return (
    <div className="ep-overlay" onClick={onClose}>
      <div className="ep-modal" style={{ maxWidth:500 }} onClick={e => e.stopPropagation()}>
        <div className="ep-modal-hd">
          <div className="ep-modal-title">✓ Submit for Approval</div>
          <button className="ep-btn ep-btn-ghost ep-btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:13.5, fontWeight:600, marginBottom:4, color:"#1e293b" }}>{task.title || task.nomenclature}</div>
          {task.brandId && <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{task.brandId.name}</div>}
          {(task.projectId?.name || task.sprintId?.name) && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
              {task.projectId?.name && (
                <span style={{ fontSize:10.5, color:"#4F46E5", fontWeight:700, display:"inline-flex", alignItems:"center", gap:3 }}>
                  <i className="bi bi-folder2" />{task.projectId.name}
                </span>
              )}
              {task.sprintId?.name && (
                <span style={{ fontSize:10.5, color:"#7C3AED", fontWeight:700, display:"inline-flex", alignItems:"center", gap:3 }}>
                  <i className="bi bi-lightning-charge" />{task.sprintId.name}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="ep-form-g">
          <label className="ep-label">Delivery / Proof URL <span style={{ color:"#ef4444" }}>*</span></label>
          <input className="ep-input" placeholder="https://docs.google.com/… or published link"
            value={proofLink} onChange={e => setProofLink(e.target.value)} />
          <div style={{ fontSize:10.5, color:"#64748b", marginTop:3 }}>Paste the Google Doc, published URL, Drive link, or any delivery link</div>
        </div>
        <div className="ep-form-g">
          <label className="ep-label">Notes for Admin (optional)</label>
          <textarea className="ep-textarea" rows={3} placeholder="Describe what you've completed or any context for the admin…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ fontSize:12, color:"#64748b", marginBottom:14, background:"rgba(99,102,241,.06)", border:"1px solid rgba(99,102,241,.2)", borderRadius:8, padding:"10px 14px", lineHeight:1.55 }}>
          <strong>After submission:</strong> Admin will review and either approve the task or request revisions.
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="ep-btn ep-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ep-btn ep-btn-primary" onClick={() => onSubmit(notes, proofLink)} disabled={submitting || !proofLink.trim()}>
            {submitting ? "Submitting…" : "Submit for Approval ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Non-SMM Detail Modal ─────────────────────────────────────────────────────
const PRIORITY_META_D = { low:["#F1F5F9","#64748B"], medium:["#EFF6FF","#1D4ED8"], high:["#FFFBEB","#B45309"], urgent:["#FEF2F2","#DC2626"] };
const STATUS_META_D   = { todo:["#F1F5F9","#64748B","To Do"], in_progress:["#EFF6FF","#1D4ED8","In Progress"], review:["#FFFBEB","#B45309","In Review"], completed:["#ECFDF5","#15803D","Completed"], blocked:["#FEF2F2","#DC2626","Rejected"] };

function NonSMMDetailModal({ task, onClose, onSubmit }) {
  if (!task) return null;
  const tags       = task.tags || [];
  const isSeo      = tags.includes("seo");
  const isAds      = tags.includes("ads");
  const isBranding = tags.includes("branding");
  const seoCat     = task.seoCategory;
  const SEO_CAT_LABELS = { blog:"Blog Post", technical:"Technical SEO", onpage:"On-Page", offpage:"Off-Page", backlinks:"Backlinks" };
  let catLabel = "General Task", catColor = "#64748B", catBg = "#F1F5F9", catIcon = "bi-file-earmark";
  if (seoCat && SEO_CAT_LABELS[seoCat]) { catLabel = SEO_CAT_LABELS[seoCat]; catBg = "#EFF6FF"; catColor = "#1D4ED8"; catIcon = "bi-search"; }
  else if (isSeo)      { catLabel = "SEO Task";      catBg = "#ECFDF5"; catColor = "#15803D"; catIcon = "bi-search"; }
  else if (isAds)      { catLabel = "Ads Task";      catBg = "#FFFBEB"; catColor = "#B45309"; catIcon = "bi-megaphone"; }
  else if (isBranding) { catLabel = "Branding Task"; catBg = "#FDF2F8"; catColor = "#BE185D"; catIcon = "bi-palette"; }

  const [priorityBg, priorityColor] = PRIORITY_META_D[task.priority] || PRIORITY_META_D.medium;
  const [statusBg, statusColor, statusLabel] = STATUS_META_D[task.status] || STATUS_META_D.todo;
  const canSubmit = !["review","completed"].includes(task.status);

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"88vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.18)" }}>
        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1, paddingRight:12 }}>
            <div style={{ fontWeight:800, fontSize:15, color:"#1E293B", lineHeight:1.4, marginBottom:8 }}>{task.title || "—"}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:catBg, color:catColor }}>
                <i className={`bi ${catIcon}`} style={{ marginRight:3 }} />{catLabel}
              </span>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:statusBg, color:statusColor }}>
                {statusLabel}
              </span>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:priorityBg, color:priorityColor, textTransform:"capitalize" }}>
                {task.priority || "medium"} priority
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"#F1F5F9", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, flexShrink:0 }}>
            <i className="bi bi-x" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          {/* Meta row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
            {task.dueDate && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Due Date</div>
                <div style={{ fontSize:13, fontWeight:600, color: isOverdue(task.dueDate) && task.status!=="completed" ? "#DC2626" : "#1E293B" }}>
                  <i className="bi bi-calendar3 me-1" style={{ color:"#94A3B8" }} />{fmtD(task.dueDate)}
                  {isOverdue(task.dueDate) && task.status!=="completed" && <span style={{ color:"#DC2626", fontSize:11 }}> · Overdue</span>}
                </div>
              </div>
            )}
            {task.estimatedHours && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Est. Hours</div>
                <div style={{ fontSize:13, fontWeight:600 }}><i className="bi bi-clock me-1" style={{ color:"#94A3B8" }} />{task.estimatedHours}h</div>
              </div>
            )}
            {task.brandId && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Brand</div>
                <div style={{ fontSize:13, fontWeight:600, color:task.brandId.color||"#5A57FB" }}>{task.brandId.name}</div>
              </div>
            )}
          </div>

          {task.description && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:6 }}>Description</div>
              <div style={{ fontSize:13, color:"#374151", background:"#F8FAFC", borderRadius:8, padding:"12px 14px", lineHeight:1.7, whiteSpace:"pre-wrap", maxHeight:160, overflowY:"auto", border:"1px solid #E2E8F0" }}>
                {task.description}
              </div>
            </div>
          )}

          {task.referenceLink && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:6 }}>Reference Link</div>
              <a href={task.referenceLink} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12, color:"#4F46E5", display:"inline-flex", alignItems:"center", gap:6, background:"#EEF2FF", padding:"7px 12px", borderRadius:8, textDecoration:"none", wordBreak:"break-all" }}>
                <i className="bi bi-link-45deg" /> {task.referenceLink}
              </a>
            </div>
          )}

          {tags.filter(t => !["seo","ads","branding"].includes(t)).length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:6 }}>Tags</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {tags.filter(t => !["seo","ads","branding"].includes(t)).map(t => (
                  <span key={t} style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#F1F5F9", color:"#475569" }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {task.reviewNote && task.status === "blocked" && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#DC2626", textTransform:"uppercase", marginBottom:6 }}>Revision Requested</div>
              <div style={{ fontSize:12.5, color:"#1E293B", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 12px", lineHeight:1.6 }}>
                {task.reviewNote}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {canSubmit && onSubmit && (
          <div style={{ padding:"14px 20px", borderTop:"1px solid #F1F5F9", display:"flex", justifyContent:"flex-end", gap:10 }}>
            <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              Close
            </button>
            <button onClick={() => { onClose(); onSubmit(task); }}
              style={{ padding:"8px 20px", borderRadius:8, border:"none", background:"#5A57FB", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
              <i className="bi bi-send-fill" /> Submit for Approval
            </button>
          </div>
        )}
        {!canSubmit && (
          <div style={{ padding:"14px 20px", borderTop:"1px solid #F1F5F9", display:"flex", justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Non-SMM Task Card (SEO / Ads / Branding / General) ───────────────────────
function NonSMMCard({ task, onOpenModal, onViewDetail }) {
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localTask,  setLocalTask]  = useState(task);
  const [showNotes,  setShowNotes]  = useState(false);
  useEffect(() => { setLocalTask(task); }, [task]);

  // If parent provides a lifted handler use it (avoids stacking-context bug)
  const openModal  = onOpenModal  ? () => onOpenModal(localTask)  : () => setShowModal(true);
  const viewDetail = onViewDetail ? () => onViewDetail(localTask) : null;

  const tags       = localTask.tags || [];
  const isSeo      = tags.includes("seo");
  const isAds      = tags.includes("ads");
  const isBranding = tags.includes("branding");
  const seoCat     = localTask.seoCategory;

  const SEO_CAT_LABELS = { blog:"Blog Post", technical:"Technical SEO", onpage:"On-Page", offpage:"Off-Page", backlinks:"Backlinks" };
  const SEO_CAT_COLORS = { blog:["#EEF2FF","#6366F1"], technical:["#FEF2F2","#EF4444"], onpage:["#EFF6FF","#3B82F6"], offpage:["#FFFBEB","#F59E0B"], backlinks:["#ECFDF5","#10B981"] };

  let catLabel = "Task", catBg = "#F1F5F9", catColor = "#64748B", catIcon = "bi-file-earmark";
  if (seoCat && SEO_CAT_LABELS[seoCat]) {
    catLabel = SEO_CAT_LABELS[seoCat];
    [catBg, catColor] = SEO_CAT_COLORS[seoCat] || ["#EEF2FF","#6366F1"];
    catIcon = { blog:"bi-file-text", technical:"bi-code-slash", onpage:"bi-file-earmark-richtext", offpage:"bi-link-45deg", backlinks:"bi-arrow-left-right" }[seoCat] || "bi-search";
  } else if (isSeo)      { catLabel = "SEO Task";      catBg = "#D1FAE5"; catColor = "#065F46"; catIcon = "bi-search"; }
  else if (isAds)        { catLabel = "Ads Task";      catBg = "#FFFBEB"; catColor = "#B45309"; catIcon = "bi-megaphone"; }
  else if (isBranding)   { catLabel = "Branding Task"; catBg = "#FDF2F8"; catColor = "#BE185D"; catIcon = "bi-palette"; }

  const brandColor = localTask.brandId?.color || "#5A57FB";
  const dl         = getDeadlineInfo(localTask);
  const status     = localTask.status;

  async function doSubmit(notes, proofLink) {
    setSubmitting(true);
    try {
      const body = { status: "review", reviewNote: notes || "", submittedAt: new Date().toISOString() };
      if (proofLink?.trim()) body.proofLink = proofLink.trim();
      const r = await fetch(`/api/employee/tasks/${localTask._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Submitted for approval!");
        setLocalTask(prev => ({ ...prev, status: "review", reviewNote: notes||"", proofLink: proofLink?.trim()||prev.proofLink, submittedAt: body.submittedAt }));
        setShowModal(false);
      } else toast.error(d.message || "Submission failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className={`ep-tcard ${dl?.urgent ? "urgent" : dl?.today ? "today-card" : ""}`} style={{ display:"flex", flexDirection:"column", borderLeft:`3px solid ${brandColor}`, paddingLeft:10 }}>
      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{ fontFamily:"monospace", fontSize:10, color:"#94A3B8" }}>#{localTask._id?.slice(-4)}</span>
        <span style={{ padding:"2px 8px", borderRadius:20, background:catBg, fontSize:10, fontWeight:700, color:catColor, display:"flex", alignItems:"center", gap:3 }}>
          <i className={`bi ${catIcon}`} style={{ fontSize:9 }} />{catLabel}
        </span>
      </div>

      {/* Title — clickable to open details, clamped to 2 lines */}
      <div
        onClick={viewDetail}
        style={{ fontSize:13.5, fontWeight:700, lineHeight:1.35, marginBottom:7, color:"#1e293b", flex:1, cursor: viewDetail ? "pointer" : "default",
          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}
      >
        {localTask.title || localTask.nomenclature}
        {viewDetail && <i className="bi bi-arrow-up-right" style={{ fontSize:10, marginLeft:5, color:"#94A3B8" }} />}
      </div>

      {/* Due Date */}
      <div style={{ marginBottom:10 }}>
        {dl && (
          <div>
            <span style={{ fontSize:11, color:dl.color, fontWeight:dl.urgent||dl.today?700:400, display:"inline-flex", alignItems:"center", gap:3 }}>
              <i className="bi bi-clock" style={{ fontSize:10 }} />{dl.text}
            </span>
            {dl.sub && <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{dl.sub}</div>}
          </div>
        )}
      </div>

      {/* Status / CTA */}
      {status === "completed" ? (
        <div style={{ borderRadius:9, border:"1.5px solid rgba(34,197,94,.35)", overflow:"hidden" }}>
          <div style={{ width:"100%", padding:"10px", background:"rgba(34,197,94,.1)", color:"#16a34a", fontWeight:700, fontSize:13, textAlign:"center" }}>
            ✓ Approved
          </div>
        </div>
      ) : status === "review" ? (
        <div style={{ borderRadius:9, border:"1.5px solid rgba(245,158,11,.3)", overflow:"hidden" }}>
          <div
            onClick={() => localTask.reviewNote && setShowNotes(v => !v)}
            style={{ width:"100%", padding:"10px", background:"rgba(245,158,11,.08)", color:"#D97706", fontWeight:700, fontSize:13, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:6, cursor: localTask.reviewNote ? "pointer" : "default" }}>
            👁 Pending Review
            {localTask.reviewNote && (
              <i className={`bi bi-chevron-${showNotes ? "up" : "down"}`} style={{ fontSize:10 }} />
            )}
          </div>
          {localTask.submittedAt && (
            <div style={{ textAlign:"center", fontSize:10, color:"#94a3b8", padding:"4px 0 6px", background:"rgba(245,158,11,.04)" }}>
              <i className="bi bi-clock" style={{ marginRight:3 }} />Submitted {fmtDT(localTask.submittedAt)}
            </div>
          )}
          {showNotes && localTask.reviewNote && (
            <div style={{ padding:"10px 12px", background:"#fffbeb", borderTop:"1px solid rgba(245,158,11,.2)" }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:"#92400e", marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>Your Submission Notes</div>
              <div style={{ fontSize:12, color:"#78350f", lineHeight:1.5, whiteSpace:"pre-wrap" }}>{localTask.reviewNote}</div>
            </div>
          )}
        </div>
      ) : status === "blocked" ? (
        <div>
          <div style={{ padding:"8px 12px", background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:"9px 9px 0 0", color:"#dc2626", fontSize:11.5, fontWeight:600, lineHeight:1.45 }}>
            ✕ Revision Requested{localTask.reviewNote ? ` — ${localTask.reviewNote}` : ""}
          </div>
          <button onClick={openModal} disabled={submitting}
            style={{ width:"100%", padding:"9px", background:"#dc2626", color:"#fff", border:"none", borderRadius:"0 0 9px 9px", fontWeight:700, fontSize:12.5, cursor:"pointer", fontFamily:"inherit" }}>
            Resubmit for Approval
          </button>
        </div>
      ) : (
        <button onClick={openModal} disabled={submitting}
          style={{ width:"100%", padding:"10px", background:"#5A57FB", color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
          Submit for Approval
        </button>
      )}

      {/* Only render inline modal when no parent handler (fallback) */}
      {!onOpenModal && showModal && (
        <NonSMMSubmitModal task={localTask} onClose={() => setShowModal(false)} onSubmit={doSubmit} submitting={submitting} />
      )}
    </div>
  );
}

// ─── Production Task Card (Social Media stages) ────────────────────────────────
function PTaskCard({ task, onSubmit, onNonSMMSubmit, onNonSMMDetail, empId }) {
  const [showProof, setShowProof] = useState(false);
  // Non-production tasks (SEO, Ads, Branding, General) use the simpler NonSMMCard
  if (task.taskType !== "production") return <NonSMMCard task={task} onOpenModal={onNonSMMSubmit} onViewDetail={onNonSMMDetail} />;

  const toArr      = (v) => Array.isArray(v) ? v : (v ? [v] : []);
  const stagesArr  = ["S1","S2","S3","S4"];
  const curIdx     = stagesArr.indexOf(task.stage);
  const brandColor = task.brandId?.color || "#5A57FB";

  const myStageIdx = (() => {
    if (!empId) return -1;
    const explicit = (task.stages || []).findIndex(s =>
      toArr(s.assignedTo).some(a => {
        const aid = a?._id ? String(a._id) : String(a || "");
        return aid === String(empId);
      })
    );
    // DM employees auto-see S4 tasks without explicit stage assignment
    if (explicit === -1 && task.taskType === "production" && task.stage === "S4") return 3;
    return explicit;
  })();

  const myStage        = myStageIdx >= 0 ? task.stages[myStageIdx] : null;
  const submitStageKey = myStageIdx >= 0 ? stagesArr[myStageIdx] : (task.stage || "S1");
  const submitStageNum = myStageIdx >= 0 ? myStageIdx + 1 : (STAGE_NUM[task.stage] || "");

  // Prefer stage-level deadline, fall back to task dueDate
  const deadlineSrc = (myStageIdx >= 0 && myStage?.deadline) ? myStage.deadline : task.dueDate;
  const dl          = getDeadlineInfo({ ...task, dueDate: deadlineSrc });

  const hasClientFeedback = task.status === "todo" && task.reviewNote && task.reviewNote.trim();
  const isRejected = !hasClientFeedback && myStageIdx >= 0 && myStage?.rejected === true;
  const isDone     = !isRejected && !hasClientFeedback && (myStageIdx >= 0
    ? myStage?.done === true
    : task.status === "completed");

  const barIdx = myStageIdx >= 0 ? myStageIdx : curIdx;
  const sbadge = STAGE_BADGE[submitStageKey] || STAGE_BADGE.S1;
  const barColor = isDone ? "#22c55e" : isRejected ? "#ef4444" : hasClientFeedback ? "#f59e0b" : "#f5a623";

  // S2/S3 are blocked until admin approves S1. S4 (Digital Marketing / Posted) is free to submit any time.
  const s1Approved   = task.stages?.[0]?.approved === true;
  const blockedByS1  = submitStageKey !== "S1" && submitStageKey !== "S4" && !s1Approved;

  return (
    <div className={`ep-tcard ${isRejected ? "rejected-card" : dl?.urgent ? "urgent" : dl?.today ? "today-card" : ""}`}
      style={{ borderLeft:`3px solid ${brandColor}`, paddingLeft:10 }}>

      {/* Header: ID + stage badge */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{ fontFamily:"monospace", fontSize:10, color:"#94a3b8" }}>#{task._id?.slice(-4)}</span>
        <span style={{ padding:"2px 8px", borderRadius:20, background:sbadge.bg, fontSize:10, fontWeight:600, color:sbadge.color, whiteSpace:"nowrap" }}>
          S{submitStageNum} · {STAGE_LABEL[submitStageKey]}
        </span>
      </div>

      {/* Title — clamp to 2 lines */}
      <div style={{ fontSize:13.5, fontWeight:700, lineHeight:1.35, marginBottom:7, color:"#1e293b",
        display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
        {task.nomenclature || task.title}
      </div>

      {/* Status / deadline row */}
      <div style={{ marginBottom:9, minHeight:28 }}>
        {myStage?.approved ? (
          <span style={{ fontSize:11, fontWeight:700, color:"#15803d", display:"inline-flex", alignItems:"center", gap:3 }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize:11 }} /> Approved
            {deadlineSrc && <span style={{ marginLeft:5, fontWeight:400, color:"#94a3b8", fontSize:10 }}>· Due {fmtDT(deadlineSrc)}</span>}
          </span>
        ) : myStage?.done && !myStage?.rejected ? (
          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
            <span style={{ fontSize:11, fontWeight:600, color:"#b45309", display:"inline-flex", alignItems:"center", gap:3 }}>
              <i className="bi bi-hourglass-split" style={{ fontSize:10 }} /> Pending Review
            </span>
            {deadlineSrc && <span style={{ fontSize:10, color:"#94a3b8" }}>Due {fmtD(deadlineSrc)}</span>}
          </div>
        ) : dl ? (
          <div>
            <span style={{ fontSize:11, color:dl.color, fontWeight:dl.urgent||dl.today?700:500, display:"inline-flex", alignItems:"center", gap:3 }}>
              <i className="bi bi-clock" style={{ fontSize:10 }} />{dl.text}
            </span>
            {dl.sub && <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{dl.sub}</div>}
          </div>
        ) : null}
      </div>

      {/* Stage progress bars */}
      <div style={{ display:"flex", gap:3, marginBottom:10 }}>
        {stagesArr.map((s,i) => (
          <div key={s} style={{ flex:1, height:4, borderRadius:2,
            background: i<barIdx ? "#22c55e" : i===barIdx ? barColor : "#e2e8f0" }} />
        ))}
      </div>

      {/* Action area */}
      {blockedByS1 ? (
        <div style={{ padding:"9px 12px", background:"rgba(124,58,237,.05)", border:"1px solid rgba(124,58,237,.18)", borderRadius:8, textAlign:"center" }}>
          <div style={{ fontSize:12, color:"#6d28d9", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            <i className="bi bi-lock-fill" style={{ fontSize:11 }} /> Waiting for S1 Approval
          </div>
          <div style={{ fontSize:10.5, color:"#7c3aed", opacity:.75, marginTop:2 }}>Script must be approved before you can submit.</div>
        </div>
      ) : hasClientFeedback ? (
        <div style={{ borderRadius:8, overflow:"hidden", border:"1px solid #fde68a" }}>
          <div style={{ padding:"7px 10px", background:"#fffbeb" }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:"#92400e", marginBottom:3, display:"flex", alignItems:"center", gap:4 }}>
              <i className="bi bi-chat-left-text-fill" /> Client Requested Changes
            </div>
            <div style={{ fontSize:11, color:"#78350f", lineHeight:1.4, maxHeight:50, overflowY:"auto", whiteSpace:"pre-wrap" }}>{task.reviewNote}</div>
          </div>
          <button onClick={() => onSubmit(task, submitStageKey)}
            style={{ width:"100%", padding:"8px", background:"#f59e0b", color:"#fff", border:"none", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
            Revise &amp; Resubmit S{submitStageNum}
          </button>
        </div>
      ) : isRejected ? (
        <div style={{ borderRadius:8, overflow:"hidden", border:"1px solid #fecaca" }}>
          <div style={{ padding:"7px 10px", background:"#fef2f2", color:"#dc2626", fontSize:11, fontWeight:600 }}>
            ✕ Rejected{myStage?.rejectReason ? ` — ${myStage.rejectReason}` : " — Admin requested revision"}
          </div>
          <button onClick={() => onSubmit(task, submitStageKey)}
            style={{ width:"100%", padding:"8px", background:"#dc2626", color:"#fff", border:"none", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
            Resubmit S{submitStageNum} ✓
          </button>
        </div>
      ) : isDone ? (
        <div style={{ borderRadius:8, border:"1px solid rgba(34,197,94,.25)", overflow:"hidden" }}>
          <div
            onClick={() => (myStage?.proofUrls?.length || myStage?.doneNote) && setShowProof(v => !v)}
            style={{ padding:"9px 12px", background:"rgba(34,197,94,.08)", color:"#16a34a", fontWeight:600, fontSize:12.5, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              cursor:(myStage?.proofUrls?.length || myStage?.doneNote) ? "pointer" : "default" }}>
            ✓ Stage {submitStageNum} Done
            {(myStage?.proofUrls?.length > 0 || myStage?.doneNote) && (
              <i className={`bi bi-chevron-${showProof ? "up" : "down"}`} style={{ fontSize:10 }} />
            )}
          </div>
          {myStage?.doneAt && (
            <div style={{ textAlign:"center", fontSize:10, color:"#94a3b8", padding:"3px 0 5px", background:"rgba(34,197,94,.04)" }}>
              <i className="bi bi-clock" style={{ marginRight:3 }} />Submitted {fmtDT(myStage.doneAt)}
            </div>
          )}
          {showProof && (myStage?.proofUrls?.length > 0 || myStage?.doneNote) && (
            <div style={{ padding:"8px 12px", background:"#f0fdf4", borderTop:"1px solid rgba(34,197,94,.15)" }}>
              {myStage.proofUrls?.length > 0 && (
                <div style={{ marginBottom: myStage.doneNote ? 6 : 0 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#166534", marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>Submitted Links</div>
                  {myStage.proofUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display:"block", fontSize:11, color:"#5A57FB", wordBreak:"break-all", marginBottom:2, textDecoration:"underline" }}>
                      {url}
                    </a>
                  ))}
                </div>
              )}
              {myStage?.doneNote && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#166534", marginBottom:3, textTransform:"uppercase", letterSpacing:.5 }}>Notes</div>
                  <div style={{ fontSize:11.5, color:"#374151", lineHeight:1.4, whiteSpace:"pre-wrap" }}>{myStage.doneNote}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => onSubmit(task, submitStageKey)}
          style={{ width:"100%", padding:"9px", background:"#5A57FB", color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
          Submit Stage {submitStageNum} ✓
        </button>
      )}
    </div>
  );
}

// ─── PORTAL SubmitStageModal ──────────────────────────────────────────────────
function PSubmitModal({ task, stageKey, onClose, onSuccess }) {
  const [proofUrl,   setProofUrl]   = useState("");
  const [noLink,     setNoLink]     = useState(false);
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const effectiveStage = stageKey || task.stage || "S1";
  const isS4 = effectiveStage === "S4";
  const nextStage = NEXT_STAGE[effectiveStage] || effectiveStage;
  const nextNum   = STAGE_NUM[nextStage] || "";

  const STAGE_IDX_MAP = { S1: 0, S2: 1, S3: 2, S4: 3 };
  const nextIdx = STAGE_IDX_MAP[nextStage];
  const nextEntry = task.stages?.[nextIdx];
  const nextHasAssignee = nextEntry && Array.isArray(nextEntry.assignedTo) && nextEntry.assignedTo.length > 0;
  const goesToClientReview = nextStage === "S4" || !nextHasAssignee;

  // S4: can submit without URL if "no link" selected; otherwise URL required
  const canSubmit = noLink ? true : proofUrl.trim().length > 0;

  async function handleSubmit() {
    if (!noLink && !proofUrl.trim()) { toast.warn("Please enter a Proof URL or select 'Link not provided'"); return; }
    setSubmitting(true);
    try {
      const finalUrl   = noLink ? "" : proofUrl.trim();
      const finalNotes = noLink
        ? `[Link not provided] ${notes}`.trim()
        : notes;
      const r = await fetch("/api/employee/stage-submit", {
        method: "POST", headers: authH(),
        body: JSON.stringify({ taskId: task._id, proofUrl: finalUrl, notes: finalNotes, stageKey: effectiveStage }),
      });
      const d = await r.json();
      if (d.success) { toast.success("Stage submitted!"); onSuccess(d.task); }
      else toast.error(d.message || "Submission failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  }

  const toggleBtnStyle = (active) => ({
    flex: 1, padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${active ? "#5A57FB" : "#e2e8f0"}`,
    background: active ? "#EEF2FF" : "#fff", color: active ? "#4338CA" : "#64748b",
    fontWeight: 600, fontSize: 12.5, cursor: "pointer", transition: "all .15s", fontFamily: "inherit",
  });

  return (
    <div className="ep-overlay" onClick={onClose}>
      <div className="ep-modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
        <div className="ep-modal-hd">
          <div className="ep-modal-title">✓ Submit Stage Completion</div>
          <button className="ep-btn ep-btn-ghost ep-btn-sm" onClick={onClose}>✕</button>
        </div>
        {goesToClientReview ? (
          <div style={{ background:"rgba(22,163,74,.08)", border:"1px solid rgba(22,163,74,.3)", borderRadius:9, padding:"11px 16px", display:"flex", alignItems:"center", gap:11, marginBottom:14 }}>
            <span style={{ fontSize:16 }}>🚀</span>
            <div style={{ fontSize:12.5, color:"#15803D" }}><strong>This goes directly to client approval.</strong> Once you submit, the client will see it in their portal.</div>
          </div>
        ) : (
          <div style={{ background:"rgba(59,130,246,.06)", border:"1px solid rgba(59,130,246,.2)", borderRadius:9, padding:"11px 16px", display:"flex", alignItems:"center", gap:11, marginBottom:14 }}>
            <span style={{ fontSize:16 }}>⚡</span>
            <div style={{ fontSize:12.5, color:"#475569" }}><strong>Auto-grading enabled.</strong> Moves to Stage {nextNum} after submission.</div>
          </div>
        )}
        <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
            <span style={{ fontFamily:"monospace", fontSize:11, color:"#64748b" }}>#{task._id?.slice(-4)}</span>
            {task.brandId && (
              <span style={{ padding:"3px 9px", borderRadius:5, background:(task.brandId.color||"#f5a623")+"22", color:task.brandId.color||"#f5a623", fontSize:10.5, fontWeight:700 }}>
                {task.brandId.name}
              </span>
            )}
          </div>
          <div style={{ fontSize:13.5, fontWeight:600, marginBottom:6, color:"#1e293b" }}>{task.nomenclature || task.title}</div>
          <div style={{ fontSize:11, color:"#64748b" }}>
            Submitting: <strong style={{ color:"#b45309" }}>Stage {STAGE_NUM[effectiveStage]} — {STAGE_LABEL[effectiveStage]}</strong>
          </div>
        </div>
        <div className="ep-form-g">
          <label className="ep-label">Stage Completed</label>
          <select className="ep-select">
            <option>Stage {STAGE_NUM[effectiveStage]} — {STAGE_LABEL[effectiveStage]} (auto-detected)</option>
          </select>
        </div>

        {/* Proof URL section with toggle for S4 */}
        <div className="ep-form-g">
          <label className="ep-label">
            Proof URL {!isS4 && <span style={{ color:"#ef4444" }}>*</span>}
          </label>

          {/* Toggle buttons — only for S4 */}
          {isS4 && (
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <button style={toggleBtnStyle(!noLink)} onClick={() => setNoLink(false)}>
                🔗 Provide Link
              </button>
              <button style={toggleBtnStyle(noLink)} onClick={() => setNoLink(true)}>
                🚫 Link Not Provided
              </button>
            </div>
          )}

          {noLink ? (
            <div style={{ background:"#FFF7ED", border:"1.5px solid #FED7AA", borderRadius:9, padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
              <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
              <div style={{ fontSize:12.5, color:"#92400E" }}>
                <strong>No link will be submitted.</strong> This is recorded as "Link not provided" — admin will be notified. Use notes below to explain.
              </div>
            </div>
          ) : (
            <>
              <input className="ep-input" placeholder="https://drive.google.com/… or delivery link"
                value={proofUrl} onChange={e => setProofUrl(e.target.value)} />
              <div style={{ fontSize:10.5, color:"#64748b", marginTop:4 }}>Drive, Figma, Instagram, or any delivery URL</div>
            </>
          )}
        </div>

        <div className="ep-form-g">
          <label className="ep-label">Notes {noLink ? <span style={{ color:"#D97706", fontSize:11 }}>(explain why no link)</span> : "(optional)"}</label>
          <textarea className="ep-textarea" rows={3}
            placeholder={noLink ? "e.g. S3 editor didn't share the drive link, posted directly from phone…" : "Anything the next stage should know?"}
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:4 }}>
          <button className="ep-btn ep-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ep-btn ep-btn-primary" onClick={handleSubmit} disabled={submitting || !canSubmit}
            style={{ background: goesToClientReview ? "linear-gradient(135deg,#16A34A,#15803D)" : undefined }}>
            {submitting ? "Submitting…" : goesToClientReview ? "✓ Submit for Client Review" : `✓ Submit & Move to Stage ${nextNum}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PORTAL TODAY VIEW ────────────────────────────────────────────────────────
// ─── TASK VIEW MODAL (production + non-production) ───────────────────────────
function TaskViewModal({ task, onClose, onSubmit }) {
  if (!task) return null;
  const isProduction = task.taskType === "production";
  const stagesArr = ["S1","S2","S3","S4"];
  const brandColor = task.brandId?.color || "#5A57FB";

  // Non-production category label
  const tags = task.tags || [];
  const seoCat = task.seoCategory;
  const SEO_CAT_LABELS = { blog:"Blog Post", technical:"Technical SEO", onpage:"On-Page", offpage:"Off-Page", backlinks:"Backlinks" };
  let catLabel = "General Task";
  if (seoCat && SEO_CAT_LABELS[seoCat]) catLabel = SEO_CAT_LABELS[seoCat];
  else if (tags.includes("seo")) catLabel = "SEO Task";
  else if (tags.includes("ads")) catLabel = "Ads Task";
  else if (tags.includes("branding")) catLabel = "Branding Task";

  const canSubmit = !isProduction && !["review","completed"].includes(task.status);

  const stageRows = (task.stages || []).map((s, i) => {
    const key = stagesArr[i];
    const hasData = s.done || s.approved || s.proofUrls?.length || s.rejected;
    if (!hasData) return null;
    return (
      <div key={key} style={{ border:"1px solid #e2e8f0", borderRadius:10, overflow:"hidden", marginBottom:8 }}>
        <div style={{ padding:"8px 12px", background: s.approved ? "#f0fdf4" : s.rejected ? "#fef2f2" : "#f8fafc", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, fontWeight:700, color: s.approved ? "#16a34a" : s.rejected ? "#dc2626" : "#64748b" }}>
            {key} · {STAGE_LABEL[key]}
          </span>
          {s.approved && <span style={{ fontSize:10, color:"#16a34a", fontWeight:700 }}>✓ Approved</span>}
          {s.rejected && !s.approved && <span style={{ fontSize:10, color:"#dc2626", fontWeight:700 }}>✕ Rejected</span>}
          {s.done && !s.approved && !s.rejected && <span style={{ fontSize:10, color:"#b45309", fontWeight:700 }}>⏳ Pending Review</span>}
        </div>
        <div style={{ padding:"10px 12px" }}>
          {s.doneAt && <div style={{ fontSize:10.5, color:"#94a3b8", marginBottom:6 }}><i className="bi bi-clock" style={{ marginRight:4 }} />Submitted {fmtDT(s.doneAt)}</div>}
          {s.proofUrls?.length > 0 && (
            <div style={{ marginBottom: s.doneNote ? 8 : 0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:.4, marginBottom:4 }}>Submitted Links</div>
              {s.proofUrls.map((url, j) => (
                <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                  style={{ display:"block", fontSize:11.5, color:"#5A57FB", wordBreak:"break-all", marginBottom:3, textDecoration:"underline" }}>
                  {url}
                </a>
              ))}
            </div>
          )}
          {s.doneNote && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:.4, marginBottom:4 }}>Notes</div>
              <div style={{ fontSize:12, color:"#374151", lineHeight:1.5, whiteSpace:"pre-wrap" }}>{s.doneNote}</div>
            </div>
          )}
          {s.rejected && s.rejectReason && (
            <div style={{ marginTop:6, fontSize:11.5, color:"#dc2626", fontWeight:600 }}>Reason: {s.rejectReason}</div>
          )}
        </div>
      </div>
    );
  }).filter(Boolean);

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.18)" }}>
        {/* Header */}
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1, paddingRight:12 }}>
            {task.brandId && (
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:brandColor+"22", color:brandColor, marginBottom:6, display:"inline-block" }}>
                {task.brandId.name}
              </span>
            )}
            <div style={{ fontWeight:800, fontSize:15, color:"#1e293b", lineHeight:1.4, marginTop:4 }}>
              {task.nomenclature || task.title}
            </div>
            {task.dueDate && (
              <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>
                <i className="bi bi-calendar3" style={{ marginRight:4 }} />{fmtDT(task.dueDate)}
                {isOverdue(task.dueDate) && task.status !== "completed" && <span style={{ color:"#ef4444", fontWeight:600, marginLeft:6 }}>· Overdue</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ border:"none", background:"#f1f5f9", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, flexShrink:0 }}>
            <i className="bi bi-x" />
          </button>
        </div>

        <div style={{ padding:20, display:"flex", flexDirection:"column", gap:12 }}>
          {isProduction ? (
            <>
              {/* ── S1 Script / Concept card ── */}
              {(task.caption || task.pillar || task.referenceLink) && (
                <div style={{ border:"1.5px solid #7C3AED44", borderRadius:10, overflow:"hidden" }}>
                  <div style={{ padding:"8px 12px", background:"#7C3AED12", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#7C3AED" }}>
                      <i className="bi bi-pencil-square" style={{ marginRight:5 }} />S1 · Script / Concept
                    </span>
                    {task.stages?.[0]?.approved
                      ? <span style={{ fontSize:10, color:"#16a34a", fontWeight:700 }}>✓ Approved</span>
                      : task.stages?.[0]?.done
                        ? <span style={{ fontSize:10, color:"#b45309", fontWeight:700 }}>⏳ Pending Review</span>
                        : null}
                  </div>
                  <div style={{ padding:"10px 12px", background:"#FAF5FF", display:"flex", flexDirection:"column", gap:8 }}>
                    {task.pillar && (
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:.4, marginBottom:3 }}>Pillar</div>
                        <div style={{ fontSize:12, color:"#374151", fontWeight:500 }}>{task.pillar}</div>
                      </div>
                    )}
                    {task.caption && (
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:.4, marginBottom:3 }}>Script / Caption</div>
                        <div style={{ fontSize:12, color:"#1e293b", lineHeight:1.7, whiteSpace:"pre-wrap", background:"#fff", borderRadius:7, padding:"10px 12px", border:"1px solid #e9d5ff", maxHeight:220, overflowY:"auto" }}>{task.caption}</div>
                      </div>
                    )}
                    {task.referenceLink && (
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:.4, marginBottom:3 }}>Reference Link</div>
                        <a href={task.referenceLink} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize:11.5, color:"#7C3AED", wordBreak:"break-all", textDecoration:"underline" }}>
                          {task.referenceLink}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* ── Previous stage submissions ── */}
              {stageRows.length > 0 ? stageRows
                : !(task.caption || task.pillar || task.referenceLink) && (
                  <div style={{ textAlign:"center", padding:"24px 0", color:"#94a3b8" }}>No submissions yet.</div>
                )}
            </>
          ) : (
            <>
              {task.description && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:6 }}>Description</div>
                  <div style={{ fontSize:13, color:"#374151", background:"#f8fafc", borderRadius:8, padding:"12px 14px", lineHeight:1.7, whiteSpace:"pre-wrap", maxHeight:140, overflowY:"auto", border:"1px solid #e2e8f0" }}>
                    {task.description}
                  </div>
                </div>
              )}
              {task.proofLink && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:6 }}>Delivery / Proof Link</div>
                  <a href={task.proofLink} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:12, color:"#4f46e5", display:"inline-flex", alignItems:"center", gap:6, background:"#eef2ff", padding:"7px 12px", borderRadius:8, textDecoration:"none", wordBreak:"break-all" }}>
                    <i className="bi bi-link-45deg" /> {task.proofLink}
                  </a>
                </div>
              )}
              {task.referenceLink && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:6 }}>Reference Link</div>
                  <a href={task.referenceLink} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:12, color:"#4f46e5", display:"inline-flex", alignItems:"center", gap:6, background:"#eef2ff", padding:"7px 12px", borderRadius:8, textDecoration:"none", wordBreak:"break-all" }}>
                    <i className="bi bi-link-45deg" /> {task.referenceLink}
                  </a>
                </div>
              )}
              {task.submittedAt && (
                <div style={{ padding:"10px 12px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:4 }}>Submitted At</div>
                  <div style={{ fontSize:12.5, color:"#1e293b" }}><i className="bi bi-clock" style={{ marginRight:5 }} />{fmtDT(task.submittedAt)}</div>
                </div>
              )}
              {task.reviewNote && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color: task.status==="blocked" ? "#dc2626" : "#94a3b8", textTransform:"uppercase", marginBottom:6 }}>
                    {task.status==="blocked" ? "Revision Requested" : "Submission Notes"}
                  </div>
                  <div style={{ fontSize:12.5, color:"#374151", background: task.status==="blocked" ? "#fef2f2" : "#f8fafc", borderRadius:8, padding:"10px 12px", lineHeight:1.6, whiteSpace:"pre-wrap", border:`1px solid ${task.status==="blocked" ? "#fecaca" : "#e2e8f0"}` }}>
                    {task.reviewNote}
                  </div>
                </div>
              )}
            </>
          )}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
            <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Close</button>
            {canSubmit && onSubmit && (
              <button onClick={() => { onSubmit(task); onClose(); }}
                style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#5A57FB", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Submit for Approval
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalTodayView({ emp, tasks, loading, empId }) {
  const [submitInfo,   setSubmitInfo]   = useState(null);
  const [nonSMMTask,   setNonSMMTask]   = useState(null);
  const [nonSMMSaving, setNonSMMSaving] = useState(false);
  const [detailTask,   setDetailTask]   = useState(null);
  const [viewTask,     setViewTask]     = useState(null);
  const [time,         setTime]         = useState("");
  const [localTasks,   setLocalTasks]   = useState(tasks);
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  async function handleNonSMMSubmit(notes, proofLink) {
    setNonSMMSaving(true);
    try {
      const body = { status: "review", reviewNote: notes || "", submittedAt: new Date().toISOString() };
      if (proofLink?.trim()) body.proofLink = proofLink.trim();
      const r = await fetch(`/api/employee/tasks/${nonSMMTask._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Submitted for approval!");
        setLocalTasks(prev => prev.map(t => t._id === nonSMMTask._id ? { ...t, status: "review", reviewNote: notes||"", proofLink: proofLink?.trim()||t.proofLink, submittedAt: body.submittedAt } : t));
        setNonSMMTask(null);
      } else toast.error(d.message || "Submission failed");
    } catch { toast.error("Network error"); }
    finally { setNonSMMSaving(false); }
  }
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true }));
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv);
  }, []);

  const now      = new Date(); now.setHours(0,0,0,0);
  // Use stage deadline when available (for production tasks), fall back to task dueDate
  function effectiveDL(t) {
    const sd = getStageDeadline(t);
    return sd || (t.dueDate ? new Date(t.dueDate) : null);
  }
  const overdue  = localTasks.filter(t => { const d = effectiveDL(t); return d && isOverdue(d) && t.status !== "completed"; });
  const dueToday = localTasks.filter(t => { const d = effectiveDL(t); return d && isDueToday(d) && t.status !== "completed"; });
  const doneWeek = localTasks.filter(t => t.status === "completed" && new Date(t.updatedAt) >= new Date(Date.now() - 7*86400000));
  const active   = localTasks.filter(t => t.status !== "completed");
  const upcoming = localTasks.filter(t => {
    if (t.status === "completed") return false;
    const d = effectiveDL(t);
    if (!d) return false;
    const dc = new Date(d); dc.setHours(0,0,0,0);
    const diff = Math.round((dc - now) / 86400000);
    return diff > 0 && diff <= 7;
  });
  const grade      = calcGrade(filterTasksByMonth(localTasks, now.getMonth(), now.getFullYear()));
  const todayTasks = [...new Map([...overdue, ...dueToday].map(t => [t._id, t])).values()];

  return (
    <div className="ep-content">
      <div className="ep-grade-hero">
        <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginBottom:6 }}>{getGreeting()}, {emp?.firstName || "there"} 👋</div>
        <div className="ep-gh-title">
          {loading ? "Loading…" : <>You're at <span>{grade.letter}</span> this month</>}
        </div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginTop:8, maxWidth:580, lineHeight:1.55 }}>
          You have <strong style={{ color:"#fff" }}>{localTasks.length} total task{localTasks.length!==1?"s":""}</strong>
          {overdue.length>0 && <> — <strong style={{ color:"#fca5a5" }}>{overdue.length} overdue</strong></>}
          {todayTasks.length>0 && <>, <strong style={{ color:"#fbbf24" }}>{todayTasks.length} due today</strong></>}.
          {" "}Submit on time to lock in your grade.
        </div>
        <div className="ep-stats4">
          {[
            { lbl:"Total Tasks",  val:loading?"—":localTasks.length,                                              color:"#fff",      trend: overdue.length>0 ? <span style={{ color:"#fca5a5",fontSize:11 }}>{overdue.length} overdue</span> : <span style={{ color:"rgba(255,255,255,.6)",fontSize:11 }}>assigned</span> },
            { lbl:"Active Tasks", val:loading?"—":active.length,                                                  color:"#fff",      trend: <span style={{ color:"rgba(255,255,255,.7)",fontSize:11 }}>in progress</span> },
            { lbl:"Rating",       val:loading?"—":`${grade.rating}/5`,                                            color:grade.color, trend: <span style={{ color:grade.color,fontSize:11 }}>{grade.letter} Grade</span> },
            { lbl:"On-Time",      val:loading?"—":`${grade.rate}%`,                                              color:grade.rate>=80?"#86efac":"#fcd34d", trend: <span style={{ color:grade.rate>=80?"#86efac":"#fcd34d",fontSize:11 }}>{grade.rate>=80?"↑ Good":"↓ Improve"}</span> },
          ].map(s => (
            <div key={s.lbl} className="ep-hstat">
              <div style={{ fontSize:10, color:"#fff", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600 }}>{s.lbl}</div>
              <div className="ep-hstat-val" style={{ color:s.color }}>{s.val}</div>
              <div className="ep-hstat-trend">{s.trend}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ep-perf-grid">
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-clock-history" style={{ color:"#f5a623" }} /> Recent Tasks</div>
          {localTasks.slice(0,5).map(t => {
            const od = isOverdue(t.dueDate) && t.status !== "completed";
            return (
              <div key={t._id} className="ep-rec-item">
                <div className="ep-rec-icon" style={{ background: t.status==="completed" ? "rgba(34,197,94,.15)" : od ? "rgba(239,68,68,.15)" : "rgba(245,166,35,.12)", color: t.status==="completed" ? "#22c55e" : od ? "#ef4444" : "#f5a623" }}>
                  {t.stage?.replace("S","") || "—"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#111" }}>{t.nomenclature||t.title}</div>
                  <div style={{ fontSize:10.5, color:"#64748b", marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                    {t.brandId && <><span className="ep-brand-dot" style={{ background:t.brandId.color }} />{t.brandId.name} · </>}{fmtD(t.dueDate)}
                  </div>
                </div>
                <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 8px", borderRadius:5, fontSize:11, fontWeight:600, whiteSpace:"nowrap", background:(STATUS_COLOR[t.status]||"#64748b")+"22", color:STATUS_COLOR[t.status]||"#64748b" }}>
                  {SL[t.status]||t.status}
                </span>
              </div>
            );
          })}
        </div>
        <div className="ep-grade-card">
          <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600 }}>
            {new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})} Grade
          </div>
          <div className="ep-grade-letter" style={{ color:grade.color, margin:"8px 0" }}>{loading ? "—" : grade.letter}</div>
          <div style={{ fontSize:13, color:"#64748b" }}>Rating: <strong style={{ color:grade.color }}>{grade.rating}</strong> / 5.0</div>
          <div style={{ height:5, background:"#1e2330", borderRadius:4, margin:"10px 0", overflow:"hidden" }}>
            <div style={{ height:"100%", background:grade.color, borderRadius:4, width:`${Math.min(100, grade.rating/5*100)}%`, transition:"width .4s" }} />
          </div>
          <div style={{ fontSize:11, color:"#64748b", display:"flex", justifyContent:"space-between" }}>
            <span>On-time: {grade.rate}%</span>
            <span>{grade.completed}/{grade.total} done</span>
          </div>
          <div style={{ fontSize:11.5, color:"#64748b", marginTop:14, lineHeight:1.5 }}>
            {grade.rating>=4.5 ? "Exceptional! Keep it up." : grade.rating>=3.5 ? "Good — submit before deadlines to reach A+." : grade.rating>=2.5 ? "Reduce delays to improve your grade." : "Focus on timely submissions to boost your rating."}
          </div>
        </div>
      </div>

      {submitInfo && (
        <PSubmitModal task={submitInfo.task} stageKey={submitInfo.stageKey} onClose={() => setSubmitInfo(null)}
          onSuccess={updated => { setLocalTasks(prev => prev.map(t => t._id===updated._id?updated:t)); setSubmitInfo(null); }} />
      )}
      {nonSMMTask && (
        <NonSMMSubmitModal task={nonSMMTask} onClose={() => setNonSMMTask(null)} onSubmit={handleNonSMMSubmit} submitting={nonSMMSaving} />
      )}
      {detailTask && (
        <NonSMMDetailModal task={detailTask} onClose={() => setDetailTask(null)} onSubmit={t => { setDetailTask(null); setNonSMMTask(t); }} />
      )}
      {viewTask && (
        <TaskViewModal task={viewTask} onClose={() => setViewTask(null)} onSubmit={setNonSMMTask} />
      )}
    </div>
  );
}

// ─── PORTAL MY TASKS TABLE ROW ────────────────────────────────────────────────
function TaskTableRow({ task, idx, empId, onSubmit, onNonSMMSubmit, onView }) {
  const stagesArr  = ["S1","S2","S3","S4"];
  const effectiveBrand = task.brandId || task.projectId?.brandId || null;
  const brandColor = effectiveBrand?.color || "#94a3b8";
  const isProduction = task.taskType === "production";

  const toArr = v => Array.isArray(v) ? v : (v ? [v] : []);
  const myStageIdx = (() => {
    if (!empId || !isProduction) return -1;
    const explicit = (task.stages||[]).findIndex(s => toArr(s.assignedTo).some(a => String(a?._id||a||"") === String(empId)));
    // DM employees auto-own S4 stage tasks without explicit assignment
    if (explicit === -1 && task.stage === "S4") return 3;
    return explicit;
  })();
  const myStage        = myStageIdx >= 0 ? (task.stages[myStageIdx] || null) : null;
  const submitStageKey = myStageIdx >= 0 ? stagesArr[myStageIdx] : (task.stage || "S1");
  const submitStageNum = myStageIdx >= 0 ? myStageIdx + 1 : (STAGE_NUM[task.stage] || "");
  // For production: use the employee's stage doneAt only — never task.submittedAt which may be set by another stage
  const effectiveStageIdx = myStageIdx >= 0 ? myStageIdx : stagesArr.indexOf(submitStageKey);
  const effectiveStage    = effectiveStageIdx >= 0 ? (task.stages?.[effectiveStageIdx] || null) : null;
  const submittedAt       = isProduction ? (effectiveStage?.doneAt || null) : (task.submittedAt || null);

  const sprintDeadline = task.sprintId?.endDate || null;
  const projectDeadline = task.projectId?.endDate || null;
  const deadlineSrc = (myStageIdx >= 0 && myStage?.deadline) ? myStage.deadline
    : task.dueDate || sprintDeadline || projectDeadline;
  const dl = getDeadlineInfo({ ...task, dueDate: deadlineSrc });

  const s1Approved  = task.stages?.[0]?.approved === true;
  const blockedByS1 = isProduction && submitStageKey !== "S1" && submitStageKey !== "S4" && !s1Approved;
  const isDone      = myStage?.done === true;
  const isRejected  = myStage?.rejected === true && !myStage?.done;
  const isApproved  = myStage?.approved === true;

  const status = task.status;

  // Non-production category
  const tags = task.tags || [];
  const seoCat = task.seoCategory;
  const SEO_CAT_LABELS = { blog:"Blog Post", technical:"Technical SEO", onpage:"On-Page", offpage:"Off-Page", backlinks:"Backlinks" };
  let catLabel = "General";
  let catColor = "#475569"; let catBg = "#f1f5f9";
  if (task.taskType === "project") { catLabel = "Feature"; catColor = "#4F46E5"; catBg = "#EEF2FF"; }
  else if (task.taskType === "sprint") { catLabel = "Sprint"; catColor = "#7C3AED"; catBg = "#F5F3FF"; }
  else if (seoCat && SEO_CAT_LABELS[seoCat]) catLabel = SEO_CAT_LABELS[seoCat];
  else if (tags.includes("seo")) catLabel = "SEO";
  else if (tags.includes("ads")) catLabel = "Ads";
  else if (tags.includes("branding")) catLabel = "Branding";

  const td = { padding:"11px 14px", borderBottom:"1px solid #f1f5f9", verticalAlign:"middle" };
  const sbadge = STAGE_BADGE[submitStageKey] || STAGE_BADGE.S1;
  const barIdx = myStageIdx >= 0 ? myStageIdx : stagesArr.indexOf(task.stage);
  const barColor = isDone ? "#22c55e" : isRejected ? "#ef4444" : "#f5a623";

  return (
    <tr onMouseEnter={e => e.currentTarget.style.background="#f8fafc"} onMouseLeave={e => e.currentTarget.style.background=""}>
      <td style={{ ...td, color:"#94a3b8", fontSize:11, fontFamily:"monospace", width:48 }}>{String(idx+1).padStart(3,"0")}</td>
      <td style={{ ...td, maxWidth:260 }}>
        <div style={{ fontWeight:600, fontSize:13, color:"#1e293b", lineHeight:1.35,
          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {task.nomenclature || task.title || "Untitled"}
        </div>
        {(dl?.urgent && !isDone && !isApproved) && (
          <span style={{ fontSize:10, color:"#ef4444", fontWeight:600 }}>⚠ {dl.text}</span>
        )}
      </td>
      <td style={{ ...td, whiteSpace:"nowrap" }}>
        {effectiveBrand ? (
          <span style={{ padding:"2px 8px", borderRadius:20, background:brandColor+"22", color:brandColor, fontSize:10.5, fontWeight:700, display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:brandColor, display:"inline-block" }} />{effectiveBrand.name}
          </span>
        ) : <span style={{ color:"#cbd5e1", fontSize:11 }}>—</span>}
      </td>
      <td style={{ ...td }}>
        {isProduction ? (
          <div>
            <span style={{ padding:"2px 8px", borderRadius:20, background:sbadge.bg, color:sbadge.color, fontSize:10.5, fontWeight:600, whiteSpace:"nowrap", display:"inline-block" }}>
              S{submitStageNum} · {STAGE_LABEL[submitStageKey]}
            </span>
            <div style={{ display:"flex", gap:2, marginTop:4, width:56 }}>
              {stagesArr.map((s,i) => (
                <div key={s} style={{ flex:1, height:3, borderRadius:2,
                  background: i<barIdx ? "#22c55e" : i===barIdx ? barColor : "#e2e8f0" }} />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <span style={{ padding:"2px 8px", borderRadius:20, background:catBg, color:catColor, fontSize:10.5, fontWeight:600 }}>{catLabel}</span>
            {(task.projectId?.name || task.sprintId?.name) && (
              <div style={{ marginTop:4, display:"flex", flexDirection:"column", gap:2 }}>
                {task.projectId?.name && (
                  <span style={{ fontSize:10, color:"#4F46E5", fontWeight:600, display:"inline-flex", alignItems:"center", gap:3 }}>
                    <i className="bi bi-folder2" />{task.projectId.name}
                  </span>
                )}
                {task.sprintId?.name && (
                  <span style={{ fontSize:10, color:"#7C3AED", fontWeight:600, display:"inline-flex", alignItems:"center", gap:3 }}>
                    <i className="bi bi-lightning-charge" />{task.sprintId.name}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </td>
      <td style={{ ...td }}>
        {(task.taskType === "project" || task.taskType === "sprint") ? (
          /* ── Project/Feature: show all 3 deadline levels ── */
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {task.dueDate && (
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                {new Date(task.dueDate) < new Date() && task.status !== "completed" && (
                  <span style={{ background:"#EF4444", color:"#fff", fontSize:8, fontWeight:800, borderRadius:10, padding:"1px 5px", flexShrink:0 }}>LATE</span>
                )}
                <div>
                  <div style={{ fontSize:9, fontWeight:700, color:"#4F46E5", textTransform:"uppercase", letterSpacing:".03em" }}>Feature</div>
                  <div style={{ fontSize:11, fontWeight:700, color: new Date(task.dueDate) < new Date() && task.status !== "completed" ? "#EF4444" : "#1e293b", whiteSpace:"nowrap" }}>
                    {fmtDT(new Date(task.dueDate))}
                  </div>
                </div>
              </div>
            )}
            {task.sprintId?.endDate && (
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:"#7C3AED", textTransform:"uppercase", letterSpacing:".03em" }}>Sprint</div>
                <div style={{ fontSize:11, color: new Date(task.sprintId.endDate) < new Date() ? "#f59e0b" : "#64748b", whiteSpace:"nowrap" }}>
                  {fmtDT(new Date(task.sprintId.endDate))}
                </div>
              </div>
            )}
            {task.projectId?.endDate && (
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:"#059669", textTransform:"uppercase", letterSpacing:".03em" }}>Project</div>
                <div style={{ fontSize:11, color: new Date(task.projectId.endDate) < new Date() ? "#f59e0b" : "#64748b", whiteSpace:"nowrap" }}>
                  {fmtDT(new Date(task.projectId.endDate))}
                </div>
              </div>
            )}
            {!task.dueDate && !task.sprintId?.endDate && !task.projectId?.endDate && (
              <span style={{ color:"#cbd5e1", fontSize:11 }}>—</span>
            )}
          </div>
        ) : dl ? (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
              {(() => {
                const done = isDone || isApproved;
                const submittedOnTime = done &&
                  (!submittedAt || !deadlineSrc || new Date(submittedAt) <= new Date(deadlineSrc));
                const showLate = dl.urgent && !submittedOnTime;

                let displayText = dl.text;
                if (showLate && done && submittedAt && deadlineSrc) {
                  const lateMs = new Date(submittedAt) - new Date(deadlineSrc);
                  if (lateMs < 3600000) {
                    const mins = Math.ceil(lateMs / 60000);
                    displayText = `${mins}m late`;
                  } else if (lateMs < 86400000) {
                    const totalMins = Math.round(lateMs / 60000);
                    const h = Math.floor(totalMins / 60);
                    const m = totalMins % 60;
                    displayText = m > 0 ? `${h}h ${m}m late` : `${h}h late`;
                  } else {
                    const days = Math.floor(lateMs / 86400000);
                    displayText = days === 1 ? "1d late" : `${days}d late`;
                  }
                } else if (submittedOnTime && dl.urgent) {
                  displayText = null;
                }

                const textColor = submittedOnTime ? "#94a3b8" : showLate ? dl.color : "#94a3b8";
                return (
                  <>
                    {showLate && !done && (
                      <span style={{ background:"#EF4444", color:"#fff", fontSize:9, fontWeight:800, borderRadius:20, padding:"1px 6px" }}>LATE</span>
                    )}
                    {showLate && done && (
                      <span style={{ background:"#EF444422", color:"#EF4444", fontSize:9, fontWeight:800, borderRadius:20, padding:"1px 6px" }}>LATE</span>
                    )}
                    {displayText && <span style={{ fontSize:11.5, color: textColor, fontWeight: showLate ? 700 : 400 }}>{displayText}</span>}
                  </>
                );
              })()}
            </div>
            {dl.sub && <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{dl.sub}</div>}
          </div>
        ) : <span style={{ color:"#cbd5e1" }}>—</span>}
      </td>
      <td style={{ ...td, whiteSpace:"nowrap", fontSize:11, color:"#374151" }}>
        {submittedAt ? fmtDT(new Date(submittedAt)) : <span style={{ color:"#cbd5e1" }}>—</span>}
      </td>
      <td style={{ ...td }}>
        {isProduction ? (
          isApproved   ? <span style={{ fontSize:11, color:"#16a34a", fontWeight:700 }}>✓ Approved</span>
          : isDone     ? <span style={{ fontSize:11, color:"#b45309", fontWeight:600 }}>⏳ Pending Review</span>
          : isRejected ? <span style={{ fontSize:11, color:"#dc2626", fontWeight:600 }}>✕ Rejected</span>
          : blockedByS1 ? (() => {
              const s1 = task.stages?.[0];
              let reason, rColor;
              if (s1?.rejected)              { reason = "S1 was rejected — awaiting resubmission"; rColor = "#dc2626"; }
              else if (s1?.done && !s1?.approved) { reason = "S1 submitted — awaiting admin approval"; rColor = "#b45309"; }
              else                           { reason = "S1 not yet submitted by scriptwriter"; rColor = "#64748b"; }
              return (
                <div>
                  <span style={{ fontSize:11, color:"#7c3aed", fontWeight:700 }}>🔒 Locked</span>
                  <div style={{ fontSize:10, color:rColor, marginTop:2, lineHeight:1.3 }}>{reason}</div>
                </div>
              );
            })()
          : <span style={{ fontSize:11, color:"#5A57FB", fontWeight:600 }}>Ready</span>
        ) : (
          status === "completed" ? <span style={{ fontSize:11, color:"#16a34a", fontWeight:700 }}>✓ Approved</span>
          : status === "review"  ? <span style={{ fontSize:11, color:"#b45309", fontWeight:600 }}>⏳ Pending</span>
          : status === "blocked" ? <span style={{ fontSize:11, color:"#dc2626", fontWeight:600 }}>✕ Rejected</span>
          : <span style={{ fontSize:11, color:"#5A57FB", fontWeight:600 }}>Open</span>
        )}
      </td>
      <td style={{ ...td, whiteSpace:"nowrap" }}>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {isProduction ? (
            <>
              {(isDone || isApproved) && (
                <button onClick={() => onView && onView(task)}
                  style={{ padding:"5px 12px", borderRadius:7, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  View
                </button>
              )}
              {!isDone && !isApproved && !blockedByS1 && (
                <>
                  {/* Show previous stage content button for S2/S3/S4 */}
                  {effectiveStageIdx > 0 && (task.caption || task.pillar || task.referenceLink || (task.stages || []).some((s, i) => i < effectiveStageIdx && s.proofUrls?.length > 0)) && (
                    <button onClick={() => onView && onView(task)}
                      title="View script & previous stage work"
                      style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #7C3AED44", background:"#FAF5FF", color:"#7C3AED", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                      <i className="bi bi-eye" />
                    </button>
                  )}
                  <button onClick={() => onSubmit(task, submitStageKey)}
                    style={{ padding:"5px 12px", borderRadius:7, border:"1.5px solid #5A57FB", background:"#EEF2FF", color:"#5A57FB", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    Submit S{submitStageNum} ✓
                  </button>
                </>
              )}
              {blockedByS1 && !isDone && !isApproved && <span style={{ fontSize:13, color:"#a78bfa" }} title="Locked until S1 is approved">🔒</span>}
            </>
          ) : (
            <>
              {(status === "review" || status === "completed") && (
                <button onClick={() => onView && onView(task)}
                  style={{ padding:"5px 12px", borderRadius:7, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  View
                </button>
              )}
              {status !== "completed" && status !== "review" && (
                <button onClick={() => onNonSMMSubmit(task)}
                  style={{ padding:"5px 12px", borderRadius:7, border:"1.5px solid #5A57FB", background:"#EEF2FF", color:"#5A57FB", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Submit ✓
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── PORTAL MY TASKS VIEW ─────────────────────────────────────────────────────
function PortalMyTasksView({ tasks, loading, empId, isDM = false }) {
  const now = new Date();
  const [tab,          setTab]          = useState(isDM ? "pending" : "all");
  const [search,       setSearch]       = useState("");
  const [filterYear,   setFilterYear]   = useState(now.getFullYear());
  const [filterMonth,  setFilterMonth]  = useState(now.getMonth()); // 0-indexed
  const [submitInfo,   setSubmitInfo]   = useState(null);
  const [nonSMMTask,   setNonSMMTask]   = useState(null);
  const [nonSMMSaving, setNonSMMSaving] = useState(false);
  const [detailTask,   setDetailTask]   = useState(null);
  const [localTasks,   setLocalTasks]   = useState(tasks);
  const [brandFilter,  setBrandFilter]  = useState("");
  const [typeFilter,   setTypeFilter]   = useState("");
  const [page,         setPage]         = useState(0);
  const [viewTask,     setViewTask]     = useState(null);
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);
  // No auto-select — "All Brands" is the default (brandFilter = "")
  // Reset page when filter/tab changes
  useEffect(() => { setPage(0); }, [tab, brandFilter, search, typeFilter]);

  async function handleNonSMMSubmit(notes, proofLink) {
    setNonSMMSaving(true);
    try {
      const body = { status: "review", reviewNote: notes || "", submittedAt: new Date().toISOString() };
      if (proofLink?.trim()) body.proofLink = proofLink.trim();
      const r = await fetch(`/api/employee/tasks/${nonSMMTask._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Submitted for approval!");
        setLocalTasks(prev => prev.map(t => t._id === nonSMMTask._id ? { ...t, status: "review", reviewNote: notes||"", proofLink: proofLink?.trim()||t.proofLink, submittedAt: body.submittedAt } : t));
        setNonSMMTask(null);
      } else toast.error(d.message || "Submission failed");
    } catch { toast.error("Network error"); }
    finally { setNonSMMSaving(false); }
  }

  function prevMonth() {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1); }
    else setFilterMonth(m => m - 1);
  }
  function nextMonth() {
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1); }
    else setFilterMonth(m => m + 1);
  }
  const isCurrentMonth = filterYear === now.getFullYear() && filterMonth === now.getMonth();
  const monthLabel = new Date(filterYear, filterMonth, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Month-scoped tasks: dueDate falls in selected month, OR sprint/project endDate, OR scheduledFor, OR createdAt as fallback
  const monthStart = new Date(filterYear, filterMonth, 1);
  const monthEnd   = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59);
  function inSelectedMonth(t) {
    const d = t.dueDate || t.sprintId?.endDate || t.projectId?.endDate || t.scheduledFor || t.createdAt;
    if (!d) return true;
    const dt = new Date(d);
    return dt >= monthStart && dt <= monthEnd;
  }

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);

  // Unique brands and content types for filters
  // For project tasks: use task.brandId OR task.projectId.brandId
  const getTaskBrand = t => t.brandId || t.projectId?.brandId || null;
  const allBrands = [...new Map(localTasks.map(t => getTaskBrand(t)).filter(Boolean).map(b => [String(b._id), b])).values()];
  const allTypes  = [...new Set(localTasks.map(t => t.contentType).filter(Boolean))];

  // Base: month-filtered, then brand-filtered tasks
  const monthTasks = localTasks.filter(inSelectedMonth);
  const brandTasks = brandFilter && allBrands.length > 0
    ? monthTasks.filter(t => { const b = getTaskBrand(t); return !b || String(b._id) === brandFilter; })
    : monthTasks;

  // All tasks for the active brand (no month scope) — used for overdue detection across months
  const allBrandTasks = brandFilter && allBrands.length > 0
    ? localTasks.filter(t => { const b = getTaskBrand(t); return !b || String(b._id) === brandFilter; })
    : localTasks;

  // For DM (S4/Digital Marketing) employees: a task is "approved" only when the
  // CURRENT active stage itself is approved — S3 approval doesn't count for S4.
  // For all other roles: original logic (any stage approved = task approved).
  const STAGE_IDX_MAP = { S1:0, S2:1, S3:2, S4:3 };
  const isApprovedTask = t => {
    if (t.status === "completed") return true;
    if (isDM && t.taskType === "production" && t.stage) {
      const idx = STAGE_IDX_MAP[t.stage];
      if (idx !== undefined) return t.stages?.[idx]?.approved === true;
    }
    return (t.stages||[]).some(s => s.approved === true);
  };

  // "Pending" concept (not done yet) — only used for DM employees
  const isPendingTask = t => !isApprovedTask(t);

  const byTab = (tab === "overdue" ? allBrandTasks : brandTasks).filter(t => {
    if (tab === "pending")  return isDM ? isPendingTask(t) : true;
    if (tab === "today")    { const d = getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null); return d ? isDueToday(d) && (isDM ? isPendingTask(t) : true) : false; }
    if (tab === "overdue")  { const d = getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null); return !!(d && isOverdue(d) && t.status !== "completed"); }
    if (tab === "approved") return isApprovedTask(t);
    if (tab === "rejected") return (t.stages||[]).some(s => s.rejected === true && !s.done);
    return true;
  });

  const filtered = byTab.filter(t => {
    if (typeFilter && t.contentType !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (t.nomenclature||t.title||"").toLowerCase().includes(s) || (t.brandId?.name||"").toLowerCase().includes(s);
    }
    return true;
  });

  const counts = {
    ...(isDM ? { pending: brandTasks.filter(isPendingTask).length } : {}),
    today:    brandTasks.filter(t => { const d = getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null); return isDueToday(d ? d : null) && d; }).length,
    overdue:  allBrandTasks.filter(t => { const d = getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null); return !!(d && isOverdue(d) && t.status !== "completed"); }).length,
    approved: brandTasks.filter(isApprovedTask).length,
    rejected: brandTasks.filter(t => (t.stages||[]).some(s => s.rejected)).length,
  };

  const TABS = [
    ...(isDM ? [{ key:"pending", label:"Pending" }] : []),
    { key:"today",    label:"Today" },
    { key:"overdue",  label:"Overdue" },
    { key:"approved", label:"Approved" },
    { key:"rejected", label:"Rejected" },
  ];

  return (
    <div className="ep-content">
      {/* Month picker */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"8px 14px", width:"fit-content" }}>
        <button onClick={prevMonth} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", padding:"2px 6px", borderRadius:6, fontSize:16, lineHeight:1 }}>‹</button>
        <span style={{ fontSize:13, fontWeight:700, color:"#1e293b", minWidth:130, textAlign:"center" }}>{monthLabel}</span>
        <button onClick={nextMonth} disabled={isCurrentMonth} style={{ background:"none", border:"none", cursor: isCurrentMonth ? "default" : "pointer", color: isCurrentMonth ? "#cbd5e1" : "#64748b", padding:"2px 6px", borderRadius:6, fontSize:16, lineHeight:1 }}>›</button>
        {!isCurrentMonth && (
          <button onClick={() => { setFilterYear(now.getFullYear()); setFilterMonth(now.getMonth()); }}
            style={{ marginLeft:4, padding:"3px 10px", borderRadius:20, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#5A57FB", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            Today
          </button>
        )}
      </div>

      {/* Brand dropdown */}
      {allBrands.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          {(() => { const sel = allBrands.find(b => String(b._id) === brandFilter); return sel ? <span style={{ width:10, height:10, borderRadius:"50%", background:sel.color||"#6366F1", display:"inline-block", flexShrink:0 }} /> : null; })()}
          <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setTab(isDM ? "pending" : "all"); setPage(0); }}
            style={{ padding:"7px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, fontWeight:600, color:"#1e293b", outline:"none", cursor:"pointer", background:"#fff" }}>
            <option value="">All Brands ({monthTasks.length})</option>
            {allBrands.map(b => {
              const cnt = monthTasks.filter(t => { const tb = getTaskBrand(t); return tb && String(tb._id) === String(b._id); }).length;
              return <option key={b._id} value={String(b._id)}>{b.name} ({cnt})</option>;
            })}
          </select>
        </div>
      )}

      {/* 6 PM posting banner — only for Digital Marketing (S4) employees */}
      {isDM && isCurrentMonth && counts.today > 0 && (
        (() => {
          const nowTs    = new Date();
          const deadline = new Date(nowTs.getFullYear(), nowTs.getMonth(), nowTs.getDate(), 18, 0, 0); // 6 PM local
          const diffMs   = deadline - nowTs;
          const isPast   = diffMs < 0;
          const absMs    = Math.abs(diffMs);
          const hrs      = Math.floor(absMs / 3600000);
          const mins     = Math.floor((absMs % 3600000) / 60000);
          const timeStr  = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
          return (
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 18px", marginBottom:12,
              background: isPast ? "#FEF2F2" : "#FFF7ED",
              border: `1.5px solid ${isPast ? "#FECACA" : "#FED7AA"}`,
              borderRadius:10 }}>
              <span style={{ fontSize:20 }}>{isPast ? "⚠️" : "🕕"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color: isPast ? "#991B1B" : "#92400E" }}>
                  {isPast
                    ? `6:00 PM posting deadline passed — ${timeStr} ago`
                    : `6:00 PM posting deadline in ${timeStr}`}
                </div>
                <div style={{ fontSize:12, color: isPast ? "#B91C1C" : "#B45309", marginTop:2 }}>
                  {counts.today} task{counts.today !== 1 ? "s" : ""} due today — submit before 6:00 PM IST
                </div>
              </div>
              <button onClick={() => setTab("today")}
                style={{ padding:"6px 14px", borderRadius:8, border:"none", fontSize:12, fontWeight:700,
                  background: isPast ? "#DC2626" : "#D97706", color:"#fff", cursor:"pointer", whiteSpace:"nowrap" }}>
                View Today
              </button>
            </div>
          );
        })()
      )}

      {/* Tab row + type filter + search */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:"6px 16px", borderRadius:20, border:"1px solid", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
              background: tab===t.key ? "#5A57FB" : "#fff",
              color:      tab===t.key ? "#fff"    : "#64748b",
              borderColor:tab===t.key ? "#5A57FB" : "#e2e8f0",
            }}>
            {t.label}{counts[t.key] > 0 ? ` (${counts[t.key]})` : ""}
          </button>
        ))}
        {allTypes.length > 0 && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ padding:"6px 12px", border:"1px solid #e2e8f0", borderRadius:20, fontSize:12.5, fontWeight:600, color: typeFilter ? "#1e293b" : "#64748b", outline:"none", cursor:"pointer", background:"#fff", fontFamily:"inherit" }}>
            <option value="">All Types</option>
            {allTypes.map(tp => <option key={tp} value={tp} style={{ textTransform:"capitalize" }}>{tp.charAt(0).toUpperCase()+tp.slice(1)}</option>)}
          </select>
        )}
        <div style={{ flex:1, minWidth:160 }}>
          <input className="ep-input" style={{ padding:"6px 12px", height:"auto" }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
        : (() => {
          const PAGE_SIZE = 20;
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const safePage = Math.min(page, totalPages - 1);
          const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
          const TH = { padding:"10px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".5px", whiteSpace:"nowrap", background:"#f8fafc", borderBottom:"1px solid #e2e8f0" };
          const PG = (disabled) => ({ padding:"5px 10px", borderRadius:6, border:"1px solid #e2e8f0", background: disabled ? "#f8fafc" : "#fff", color: disabled ? "#cbd5e1" : "#374151", cursor: disabled ? "default" : "pointer", fontSize:12, fontFamily:"inherit" });
          return (
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {["#","Task","Brand","Type / Project","Deadline","Submitted","Status","Action"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan={8} style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>
                          <i className="bi bi-inbox" style={{ fontSize:28, display:"block", marginBottom:8 }} />No tasks found
                        </td></tr>
                      : paginated.map((t, i) => <TaskTableRow key={t._id} task={t} idx={safePage*PAGE_SIZE+i} empId={empId}
                          onSubmit={(tk,sk) => setSubmitInfo({task:tk,stageKey:sk})}
                          onNonSMMSubmit={setNonSMMTask}
                          onView={setViewTask} />)
                    }
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ padding:"12px 16px", borderTop:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                  <span style={{ fontSize:12, color:"#64748b" }}>{filtered.length} task{filtered.length!==1?"s":""} · Page {safePage+1} of {totalPages}</span>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={safePage===0} style={PG(safePage===0)}>← Prev</button>
                    {Array.from({length:totalPages},(_,i)=>i).slice(Math.max(0,safePage-2), safePage+5).map(i => (
                      <button key={i} onClick={() => setPage(i)}
                        style={{ ...PG(false), background: i===safePage?"#5A57FB":"#fff", color: i===safePage?"#fff":"#374151", borderColor: i===safePage?"#5A57FB":"#e2e8f0", fontWeight: i===safePage?700:400 }}>
                        {i+1}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={safePage===totalPages-1} style={PG(safePage===totalPages-1)}>Next →</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()
      }
      {submitInfo && (
        <PSubmitModal task={submitInfo.task} stageKey={submitInfo.stageKey} onClose={() => setSubmitInfo(null)}
          onSuccess={updated => { setLocalTasks(prev => prev.map(t => t._id===updated._id?updated:t)); setSubmitInfo(null); }} />
      )}
      {nonSMMTask && (
        <NonSMMSubmitModal task={nonSMMTask} onClose={() => setNonSMMTask(null)} onSubmit={handleNonSMMSubmit} submitting={nonSMMSaving} />
      )}
      {detailTask && (
        <NonSMMDetailModal task={detailTask} onClose={() => setDetailTask(null)} onSubmit={t => { setDetailTask(null); setNonSMMTask(t); }} />
      )}
      {viewTask && (
        <TaskViewModal task={viewTask} onClose={() => setViewTask(null)} onSubmit={setNonSMMTask} />
      )}
    </div>
  );
}

// ─── PORTAL THIS WEEK VIEW ────────────────────────────────────────────────────
function PortalThisWeekView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [wtBrands,    setWtBrands]   = useState([]);
  const [wtTasks,     setWtTasks]    = useState([]);
  const [wtLoading,   setWtLoading]  = useState(true);
  const [brandFilter, setBrandFilter] = useState("");

  const weekDates     = getWTWeekDates(weekOffset);
  const weekStart     = weekDates[0].date;
  const weekEnd       = weekDates[6].date;
  const isCurrentWeek = weekOffset === 0;
  const weekLabel     = `${fmtWTShort(weekStart)} — ${fmtWTShort(weekEnd)}`;

  useEffect(() => {
    setWtLoading(true);
    // Fetch the full month(s) so slot-index placement has the correct picture
    const firstDay   = weekDates[0].date;
    const lastDay    = weekDates[6].date;
    const monthStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1);
    const monthEnd   = new Date(lastDay.getFullYear(),  lastDay.getMonth() + 1, 0, 23, 59, 59, 999);
    const q = new URLSearchParams({ dateStart: monthStart.toISOString(), dateEnd: monthEnd.toISOString() });
    fetch(`/api/employee/weekly-tracker?${q}`, { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const bs = d.brands || [];
          setWtBrands(bs);
          setWtTasks(d.tasks || []);
          setBrandFilter(prev => {
            if (prev && bs.find(b => b._id?.toString() === prev)) return prev;
            const viralon = bs.find(b => /viralon/i.test(b.name));
            return String(viralon?._id || bs[0]?._id || "");
          });
        }
      })
      .catch(() => {})
      .finally(() => setWtLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // 0-based: how many times contentType was scheduled from month-start up to date
  function pwMonthSlotIndex(date, contentType, weeklySchedule) {
    const DAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    let count = 0;
    const cur = new Date(start);
    while (cur <= date) {
      count += weeklySchedule.filter(s => s.day === DAY[cur.getDay()] && s.contentType === contentType).length;
      cur.setDate(cur.getDate() + 1);
    }
    return count - 1;
  }

  const PW_DLVR = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
  const PW_MON  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Group tasks by brand → contentType → monthKey, sorted by taskId
  const portalTasksByBrandDay = (() => {
    const result     = {};
    const taskGroups = {};
    wtTasks.forEach(t => {
      if (!t.brandId) return;
      const bId = typeof t.brandId === "object" ? String(t.brandId._id || t.brandId) : String(t.brandId);
      const ct  = t.contentType || "__unknown";
      const d   = t.dueDate ? new Date(t.dueDate) : t.scheduledFor ? new Date(t.scheduledFor) : t.createdAt ? new Date(t.createdAt) : null;
      if (!d) return;
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      if (!taskGroups[bId])         taskGroups[bId] = {};
      if (!taskGroups[bId][ct])     taskGroups[bId][ct] = {};
      if (!taskGroups[bId][ct][mk]) taskGroups[bId][ct][mk] = [];
      taskGroups[bId][ct][mk].push(t);
    });
    Object.values(taskGroups).forEach(byType =>
      Object.values(byType).forEach(byMonth =>
        Object.values(byMonth).forEach(arr => arr.sort((a, b) => (a.taskId || "").localeCompare(b.taskId || "")))
      )
    );
    wtBrands.forEach(brand => {
      const bId = String(brand._id);
      if (!taskGroups[bId]) return;
      const schedule = brand.weeklySchedule || [];
      if (!schedule.length) return;
      weekDates.forEach(({ label, date }) => {
        const mk = `${date.getFullYear()}-${date.getMonth()}`;
        schedule.filter(s => s.day === label).forEach(slot => {
          const ct = slot.contentType;
          const ctTasks = taskGroups[bId]?.[ct]?.[mk];
          if (!ctTasks || !ctTasks.length) return;
          const idx = pwMonthSlotIndex(date, ct, schedule);
          if (idx < 0 || idx >= ctTasks.length) return;
          const dlvrKey = PW_DLVR[ct];
          if (dlvrKey) {
            const limit = brand.monthlyDeliverables?.[dlvrKey];
            if (limit != null && idx >= limit) return;
          }
          const dateKey = date.toDateString();
          if (!result[bId]) result[bId] = {};
          if (!result[bId][dateKey]) result[bId][dateKey] = [];
          result[bId][dateKey].push(ctTasks[idx]);
        });
      });
    });
    return result;
  })();

  const displayBrands = brandFilter ? wtBrands.filter(b => b._id?.toString() === brandFilter) : wtBrands;

  return (
    <div className="ep-content">
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => setWeekOffset(w => w-1)}
            style={{ background:"#F1F5F9", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", color:"#475569", fontSize:14, fontFamily:"inherit" }}>
            <i className="bi bi-chevron-left" />
          </button>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>Weekly Tracker</div>
            <div style={{ fontSize:11, color:"#94A3B8" }}>
              {weekLabel}
              {isCurrentWeek && <span style={{ color:"#6366F1", fontWeight:700, marginLeft:6 }}>· This Week</span>}
            </div>
          </div>
          <button onClick={() => setWeekOffset(w => w+1)}
            style={{ background:"#F1F5F9", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", color:"#475569", fontSize:14, fontFamily:"inherit" }}>
            <i className="bi bi-chevron-right" />
          </button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekOffset(0)}
              style={{ background:"#EEF2FF", border:"none", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:700, color:"#4F46E5", fontFamily:"inherit" }}>
              This Week
            </button>
          )}
        </div>
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
          style={{ padding:"6px 10px", borderRadius:8, border:"1.5px solid #E5E7EB", fontSize:12, fontWeight:600, background:"#fff", color:"#374151", outline:"none", fontFamily:"inherit" }}>
          {wtBrands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {[["#F97316","S1"],["#3B82F6","S2"],["#EAB308","S3"],["#22C55E","S4"]].flatMap(([c,l]) => [
          <span key={l+"a"} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
            <span style={{ width:18, height:12, borderRadius:3, background:"#fff", border:`1.5px solid ${c}`, display:"inline-block" }} />{l} Assigned
          </span>,
          <span key={l+"d"} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
            <span style={{ width:18, height:12, borderRadius:3, background:c, border:`1.5px solid ${c}`, display:"inline-block" }} />{l} Approved
          </span>,
        ])}
        <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
          <span style={{ width:18, height:12, borderRadius:3, background:"#F8FAFC", border:"1.5px dashed #D1D5DB", display:"inline-block" }} />Scheduled (plan)
        </span>
      </div>

      {/* Table */}
      {wtLoading ? (
        <div style={{ textAlign:"center", padding:32, color:"#94A3B8" }}><div className="spinner-border spinner-border-sm text-primary" /></div>
      ) : displayBrands.length === 0 ? (
        <div style={{ textAlign:"center", padding:"32px", color:"#94a3b8", fontSize:13 }}>No brands found</div>
      ) : (
        <div style={{ background:"#fff", borderRadius:14, border:"1.5px solid #F1F5F9", overflowX:"auto", marginBottom:20 }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#FAFAFA" }}>
                <th style={{ padding:"10px 12px", fontSize:11, fontWeight:700, color:"#64748B", borderBottom:"2px solid #F1F5F9", textAlign:"left", width:140 }}>Brand</th>
                {weekDates.map(({ label, date }) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <th key={label} style={{ padding:"10px 8px", fontSize:11, fontWeight:700, color:isToday?"#6366F1":"#64748B", borderBottom:"2px solid #F1F5F9", textAlign:"center" }}>
                      <div>{label}</div>
                      <div style={{ fontSize:10, fontWeight:400 }}>{fmtWTShort(date)}</div>
                      {isToday && <div style={{ width:6, height:6, borderRadius:"50%", background:"#6366F1", margin:"2px auto 0" }} />}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayBrands.map(brand => (
                <tr key={brand._id} style={{ borderBottom:"1px solid #F8FAFC" }}>
                  <td style={{ padding:"8px 12px", verticalAlign:"top" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:6, height:30, borderRadius:4, background:brand.color||"#6366F1", flexShrink:0 }} />
                      <div>
                        <div style={{ fontWeight:700, fontSize:12, color:"#1E293B" }}>{brand.name}</div>
                        <div style={{ fontSize:10, color:"#1E293B" }}>{(brand.weeklySchedule||[]).length} post/wk</div>
                      </div>
                    </div>
                  </td>
                  {weekDates.map(({ label, date }) => {
                    const isToday  = date.toDateString() === new Date().toDateString();
                    const bId      = String(brand._id);
                    const dayTasks = portalTasksByBrandDay[bId]?.[date.toDateString()] || [];
                    const monLabel = `${PW_MON[date.getMonth()]}'${String(date.getFullYear()).slice(2)}`;
                    const scheduled = (brand.weeklySchedule || []).filter(s => s.day === label);
                    const rem = {};
                    dayTasks.forEach(t => { rem[t.contentType] = (rem[t.contentType] || 0) + 1; });
                    const unfilledSlots = scheduled.reduce((acc, slot) => {
                      const ct = slot.contentType;
                      const slotIdx = pwMonthSlotIndex(date, ct, brand.weeklySchedule || []);
                      const dlvrKey = PW_DLVR[ct];
                      if (dlvrKey) {
                        const limit = brand.monthlyDeliverables?.[dlvrKey];
                        if (limit != null && slotIdx >= limit) return acc;
                      }
                      if ((rem[ct] || 0) > 0) { rem[ct]--; return acc; }
                      acc.push({ ...slot, slotIdx });
                      return acc;
                    }, []);
                    return (
                      <td key={label} style={{ padding:"6px 4px", verticalAlign:"top", background:isToday?"#F5F3FF":"transparent", minWidth:90 }}>
                        {dayTasks.map(t => {
                          const ct  = WT_CONTENT_META[t.contentType] || {};
                          const sty = getTaskStageStyle(t);
                          const nom = t.nomenclature || t.title || "";
                          const ctL = (t.contentType || "").toLowerCase();
                          let sfx = nom.toLowerCase().startsWith(ctL) ? nom.slice(ctL.length).trim() : nom;
                          sfx = sfx.replace(/\b[a-z]/g, c => c.toUpperCase());
                          const lbl = sfx ? `${ct.label||t.contentType} ${sfx}` : (ct.label||t.contentType);
                          return (
                            <div key={t._id} style={{ borderRadius:7, padding:"3px 6px", marginBottom:3, fontSize:10, fontWeight:600, display:"flex", alignItems:"center", gap:3,
                              background:sty.bg, color:sty.color, border:`1.5px solid ${sty.border}` }}>
                              <i className={`bi ${ct.icon||"bi-list-task"}`} style={{ fontSize:9 }} />
                              {lbl}
                            </div>
                          );
                        })}
                        {unfilledSlots.map((slot, si) => {
                          const ct = WT_CONTENT_META[slot.contentType] || {};
                          return (
                            <div key={si} style={{ borderRadius:7, padding:"3px 6px", marginBottom:3, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", gap:3,
                              background:"#F8FAFC", color:"#94A3B8", border:"1px dashed #D1D5DB" }}>
                              <i className={`bi ${ct.icon||"bi-dot"}`} style={{ fontSize:9 }} />
                              {`${ct.label||slot.contentType} ${slot.slotIdx+1} ${monLabel}`}
                            </div>
                          );
                        })}
                        {unfilledSlots.length === 0 && dayTasks.length === 0 && (
                          <div style={{ fontSize:10, color:"#E5E7EB", textAlign:"center", paddingTop:4 }}>—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PORTAL HISTORY VIEW ──────────────────────────────────────────────────────
function PortalHistoryView({ tasks, loading }) {
  function gradeLetter(task) {
    if (task.status !== "completed" || !task.dueDate) return null;
    const diffH = Math.round((new Date(task.updatedAt) - new Date(task.dueDate)) / 3600000);
    if (diffH <= 0)  return "A";
    if (diffH <= 4)  return "B";
    if (diffH <= 12) return "C";
    if (diffH <= 24) return "D";
    return "F";
  }
  const gradeColor = { A:"#22c55e", B:"#f5a623", C:"#f59e0b", D:"#ef4444", F:"#ef4444" };
  const completed  = [...tasks].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).filter(t => t.status === "completed");

  return (
    <div className="ep-content">
      <div className="ep-card" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #252a36", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div className="ep-card-title" style={{ margin:0 }}>
            <i className="bi bi-clock-history" style={{ color:"#f5a623" }} /> History ({completed.length} completed)
          </div>
          <div style={{ display:"flex", gap:8, fontSize:11 }}>
            {["A","B","C","D","F"].filter(g => completed.some(t=>gradeLetter(t)===g)).map(g => (
              <span key={g} style={{ padding:"2px 9px", borderRadius:20, background:(gradeColor[g])+"22", color:gradeColor[g], fontWeight:600 }}>
                {completed.filter(t=>gradeLetter(t)===g).length} {g}
              </span>
            ))}
          </div>
        </div>
        {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
          : completed.length === 0 ? <div className="ep-empty"><i className="bi bi-inbox" /><p>No completed tasks yet</p></div>
          : completed.map(t => {
            const g  = gradeLetter(t);
            const gc = gradeColor[g] || "#64748b";
            return (
              <div key={t._id} className="ep-rec-item" style={{ padding:"11px 18px" }}>
                <div className="ep-rec-icon" style={{ background:gc+"22", color:gc }}>{g||"—"}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#111" }}>{t.nomenclature||t.title}</div>
                  <div style={{ fontSize:10.5, color:"#64748b", marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                    {t.brandId && <><span className="ep-brand-dot" style={{ background:t.brandId.color }} />{t.brandId.name} · </>}
                    {fmtD(t.updatedAt)}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── PORTAL GRADES VIEW ───────────────────────────────────────────────────────
function PortalGradesView({ tasks, loading }) {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear,  setSelYear]  = useState(now.getFullYear());

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function shiftMonth(dir) {
    let m = selMonth + dir, y = selYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setSelMonth(m); setSelYear(y);
  }

  const monthTasks = tasks.filter(t => {
    const dl = getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null);
    return dl && dl.getFullYear() === selYear && dl.getMonth() === selMonth;
  });

  const grade = calcGrade(monthTasks);

  const GRADE_SCALE = [
    { g:"A+", range:"4.5 – 5.0", color:"#16a34a", desc:"Exceptional" },
    { g:"A",  range:"4.0 – 4.4", color:"#22c55e", desc:"On Time" },
    { g:"B+", range:"3.5 – 3.9", color:"#84cc16", desc:"Slightly Late" },
    { g:"B",  range:"3.0 – 3.4", color:"#f5a623", desc:"0–4h Late" },
    { g:"C",  range:"2.5 – 2.9", color:"#f59e0b", desc:"4–12h Late" },
    { g:"D",  range:"1.5 – 2.4", color:"#ef4444", desc:"12–24h Late" },
    { g:"F",  range:"0 – 1.4",   color:"#dc2626", desc:"Over 24h" },
  ];

  const TASK_ROWS = [
    { label:"Total No of Tasks",        val: grade.total,      color:"#1e293b" },
    { label:"Tasks Completed",          val: grade.completed,  color:"#16a34a" },
    { label:"Tasks Incomplete / Overdue", val: grade.incomplete, color:"#ef4444" },
    { label:"On-Time Submissions",      val: grade.aCnt,       color:"#22c55e" },
    { label:"Rating (out of 5)",        val: grade.rating,     color: grade.color, bold:true },
    { label:"Grade",                    val: grade.letter,     color: grade.color, bold:true, large:true },
  ];

  const BREAKDOWN = [
    { g:"A",  label:"On Time",      range:"On or before deadline",   color:"#22c55e", cnt:grade.aCnt },
    { g:"B",  label:"Slightly Late",range:"0 – 4h after deadline",   color:"#f5a623", cnt:grade.bCnt },
    { g:"C",  label:"Late",         range:"4 – 12h after deadline",  color:"#f59e0b", cnt:grade.cCnt },
    { g:"D",  label:"Very Late",    range:"12 – 24h after deadline", color:"#ef4444", cnt:grade.dCnt },
    { g:"F",  label:"Over 24h",     range:"24h+ after deadline",     color:"#dc2626", cnt:grade.fCnt },
  ];

  if (loading) return <div className="ep-content"><div className="ep-empty"><div className="ep-spinner" /></div></div>;

  const tip = grade.rating >= 4.5 ? "Excellent performance! Keep it up." : grade.rating >= 3.5 ? "Good work — aim to submit before deadlines to reach A+." : grade.rating >= 2.5 ? "Try to reduce delays. Submitting on time will improve your grade." : "Focus on timely submissions. Overdue tasks significantly hurt your rating.";

  return (
    <div className="ep-content" style={{ maxWidth: 900 }}>
      {/* Month navigator */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <button onClick={() => shiftMonth(-1)} style={{ width:32, height:32, borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
        <div style={{ fontWeight:700, fontSize:15, color:"#1e293b", minWidth:140, textAlign:"center" }}>{MONTHS[selMonth]} {selYear}</div>
        <button onClick={() => shiftMonth(1)} style={{ width:32, height:32, borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
      </div>

      {/* ── DEEP PERFORMANCE CARD ── */}
      <div style={{ background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:16, overflow:"hidden", marginBottom:18, boxShadow:"0 2px 12px rgba(0,0,0,.06)" }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1e1b4b 0%,#4F46E5 100%)", padding:"16px 24px", textAlign:"center" }}>
          <div style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,.7)", letterSpacing:"0.15em", textTransform:"uppercase" }}>Performance Card</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", marginTop:2 }}>{MONTHS[selMonth]} {selYear} · Task Report</div>
        </div>

        {/* Big grade + rating */}
        <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", borderBottom:"1.5px solid #f1f5f9" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 20px", borderRight:"1.5px solid #f1f5f9", background:"#fafbfc" }}>
            <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:".1em", fontWeight:600, marginBottom:8 }}>Current Grade</div>
            <div style={{ fontSize:96, fontWeight:900, color:grade.color, lineHeight:1, fontFamily:"system-ui" }}>{grade.letter === "—" ? "—" : grade.letter}</div>
            <div style={{ fontSize:13, color:"#64748b", marginTop:8 }}>Rating: <strong style={{ color:grade.color }}>{grade.rating}</strong> / 5.0</div>
            <div style={{ width:"100%", height:6, background:"#f1f5f9", borderRadius:4, marginTop:12, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:4, background:grade.color, width:`${Math.min(100, grade.rating / 5 * 100)}%`, transition:"width .4s" }} />
            </div>
            <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>{tip}</div>
          </div>

          {/* Task Report table */}
          <div style={{ padding:"20px 24px" }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:".1em", marginBottom:12 }}>Task Report</div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Metric", "Value", "Scale"].map(h => (
                    <th key={h} style={{ padding:"8px 10px", fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".05em", textAlign: h==="Value"?"center":"left", borderBottom:"1px solid #f1f5f9" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TASK_ROWS.map((r, i) => (
                  <tr key={r.label} style={{ borderBottom:"1px solid #f8fafc", background: i%2===0?"#fff":"#fafbfc" }}>
                    <td style={{ padding:"9px 10px", fontSize:12.5, color:"#374151", fontWeight: r.bold ? 700 : 400 }}>{r.label}</td>
                    <td style={{ padding:"9px 10px", textAlign:"center", fontSize: r.large ? 22 : 14, fontWeight:800, color:r.color }}>{r.val}</td>
                    <td style={{ padding:"9px 10px", fontSize:11, color:"#94a3b8" }}>
                      {r.large ? <span style={{ padding:"2px 8px", borderRadius:12, background:grade.color+"18", color:grade.color, fontWeight:700, fontSize:11 }}>{grade.letter}</span>
                       : r.bold ? <span style={{ fontStyle:"italic" }}>0 – 5 scale</span>
                       : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grade Scale legend */}
        <div style={{ padding:"16px 24px", background:"#fafbfc", borderBottom:"1.5px solid #f1f5f9" }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:".1em", marginBottom:10 }}>Grade Scale</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {GRADE_SCALE.map(gs => (
              <div key={gs.g} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, background:gs.color+"15", border:`1.5px solid ${gs.color}40` }}>
                <span style={{ fontWeight:800, fontSize:13, color:gs.color }}>{gs.g}</span>
                <span style={{ fontSize:10, color:"#64748b" }}>{gs.range}</span>
                <span style={{ fontSize:10, color:gs.color, fontWeight:600 }}>{gs.desc}</span>
                {grade.letter === gs.g && <span style={{ background:gs.color, color:"#fff", borderRadius:10, fontSize:9, fontWeight:800, padding:"1px 5px" }}>YOU</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Per-grade breakdown bars */}
        <div style={{ padding:"16px 24px" }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:".1em", marginBottom:12 }}>Submission Breakdown</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
            {BREAKDOWN.map(b => (
              <div key={b.g} style={{ background:b.color+"0e", border:`1.5px solid ${b.color}33`, borderRadius:10, padding:"12px", textAlign:"center" }}>
                <div style={{ fontSize:28, fontWeight:900, color:b.color }}>{b.cnt}</div>
                <div style={{ fontSize:11, fontWeight:700, color:"#374151", marginTop:2 }}>{b.label}</div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{b.range}</div>
                <div style={{ height:3, background:"#f1f5f9", borderRadius:2, marginTop:8, overflow:"hidden" }}>
                  <div style={{ height:"100%", background:b.color, borderRadius:2, width: grade.total > 0 ? `${(b.cnt/grade.total)*100}%` : "0%", transition:"width .4s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pro tip */}
        <div style={{ margin:"0 24px 20px", background:"#1e1b4b", borderRadius:10, padding:"12px 16px", fontSize:12.5, color:"#94a3b8", lineHeight:1.6 }}>
          💡 <strong style={{ color:"#e2e8f0" }}>How your grade is calculated:</strong> Each task is scored A(5) → F(0) based on how late you submitted vs the stage deadline. Your rating is the average score across all tasks this month. Incomplete/overdue tasks count as 0.
        </div>
      </div>
    </div>
  );
}

// ─── PORTAL NOTIFICATIONS VIEW ────────────────────────────────────────────────
function PortalNotificationsView({ tasks, loading }) {
  const overdue  = tasks.filter(t => isOverdue(t.dueDate) && t.status!=="completed");
  const inReview = tasks.filter(t => t.status==="review");
  const blocked  = tasks.filter(t => t.status==="blocked");
  const notifs = [
    ...overdue.map(t => ({ icon:"⚠️", bg:"rgba(239,68,68,.08)", border:"rgba(239,68,68,.25)", title:`Overdue: ${t.nomenclature||t.title}`, desc:(t.brandId?.name||"")+(t.brandId?" — ":"")+"Submit immediately to minimize grade impact", time:fmtD(t.dueDate) })),
    ...inReview.map(t => ({ icon:"🕐", bg:"rgba(245,166,35,.06)", border:"rgba(245,166,35,.2)", title:`Under Review: ${t.nomenclature||t.title}`, desc:"Awaiting admin approval — no action needed", time:fmtD(t.updatedAt) })),
    ...blocked.map(t => ({ icon:"❌", bg:"rgba(239,68,68,.06)", border:"rgba(239,68,68,.15)", title:`Rejected: ${t.nomenclature||t.title}`, desc: t.reviewNote?`Reason: ${t.reviewNote}`:"Please revise and resubmit", time:fmtD(t.updatedAt) })),
  ];
  return (
    <div className="ep-content">
      <div className="ep-card" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #252a36", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div className="ep-card-title" style={{ margin:0 }}><i className="bi bi-bell" style={{ color:"#f5a623" }} /> Notifications</div>
          {notifs.length>0 && <span style={{ background:"#ef4444", color:"#fff", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>{notifs.length}</span>}
        </div>
        {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
          : notifs.length === 0 ? (
            <div className="ep-empty">
              <i className="bi bi-bell-slash" style={{ fontSize:38, display:"block", marginBottom:10 }} />
              <p>All clear — no notifications</p>
            </div>
          ) : notifs.map((n,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:"1px solid #252a36" }}>
              <div style={{ width:38, height:38, borderRadius:10, background:n.bg, border:`1px solid ${n.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{n.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{n.title}</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>{n.desc}</div>
              </div>
              <div style={{ fontSize:11, color:"#64748b", fontFamily:"monospace", flexShrink:0 }}>{n.time}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── PORTAL PERFORMANCE VIEW ──────────────────────────────────────────────────
function PortalPerformanceView({ tasks, loading, emp }) {
  const total      = tasks.length;
  const completed  = tasks.filter(t => t.status === "completed").length;
  const overdue    = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length;
  const inProg     = tasks.filter(t => t.status === "in_progress").length;
  const review     = tasks.filter(t => t.status === "review").length;
  const onTime     = completed > 0 ? Math.round((tasks.filter(t => t.status === "completed" && !isOverdue(t.dueDate)).length / completed) * 100) : 0;
  const grade      = onTime >= 90 ? "A" : onTime >= 75 ? "B" : onTime >= 60 ? "C" : "D";
  const gradeColor = onTime >= 90 ? "#22c55e" : onTime >= 75 ? "#f5a623" : onTime >= 60 ? "#f59e0b" : "#ef4444";
  const BAR_DATA   = [
    { label:"Completed", val:completed, color:"#22c55e" },
    { label:"In Progress", val:inProg,  color:"#3b82f6" },
    { label:"Review",      val:review,  color:"#f59e0b" },
    { label:"Overdue",     val:overdue, color:"#ef4444" },
  ];
  if (loading) return <div className="ep-content"><div className="ep-empty"><div className="ep-spinner" /></div></div>;
  return (
    <div className="ep-content">
      <div className="ep-grid2" style={{ marginBottom:22 }}>
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-trophy" style={{ color:"#f5a623" }} /> Overall Grade</div>
          <div style={{ display:"flex", alignItems:"center", gap:20, marginTop:8 }}>
            <div className="ep-perf-grade" style={{ borderColor:gradeColor, color:gradeColor }}>{grade}</div>
            <div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:4 }}>On-time completion rate</div>
              <div style={{ fontSize:28, fontWeight:800, color:gradeColor }}>{onTime}%</div>
            </div>
          </div>
          <div className="ep-bar-track" style={{ marginTop:16 }}>
            <div className="ep-bar-fill" style={{ width:`${onTime}%`, background:gradeColor }} />
          </div>
        </div>
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-graph-up" style={{ color:"#f5a623" }} /> Task Breakdown</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:8 }}>
            {BAR_DATA.map(b => (
              <div key={b.label}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:4, color:"#e2e8f0" }}>
                  <span>{b.label}</span><span style={{ fontWeight:700, color:b.color }}>{b.val}</span>
                </div>
                <div className="ep-bar-track">
                  <div className="ep-bar-fill" style={{ width: total ? `${(b.val/total)*100}%` : "0%", background:b.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ep-card">
        <div className="ep-card-title"><i className="bi bi-list-check" style={{ color:"#f5a623" }} /> Summary</div>
        <div className="ep-grid4">
          {[
            { label:"Total Assigned", val:total,          color:"#e2e8f0" },
            { label:"Completed",      val:completed,      color:"#22c55e" },
            { label:"Overdue",        val:overdue,        color:"#ef4444" },
            { label:"Pending",        val:total-completed, color:"#3b82f6" },
          ].map(s => (
            <div key={s.label} style={{ background:"#161a24", border:"1px solid #252a36", borderRadius:10, padding:"14px 18px" }}>
              <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PORTAL PROFILE VIEW ──────────────────────────────────────────────────────
function PortalProfileView({ emp, empRole, loading }) {
  if (loading || !emp) return <div className="ep-content"><div className="ep-empty"><div className="ep-spinner" /></div></div>;
  const fields = [
    { label:"Employee ID", val:emp.employeeId },
    { label:"Email",       val:emp.email || emp.personal?.email },
    { label:"Mobile",      val:emp.personal?.mobile },
    { label:"Department",  val:emp.professional?.department },
    { label:"Designation", val:emp.professional?.designation },
    { label:"Date Joined", val:fmtD(emp.professional?.dateOfJoining) },
  ];
  const checks = [emp.personal?.mobile, emp.personal?.email, emp.personal?.dob, emp.personal?.address, emp.personal?.city, emp.professional?.department, emp.professional?.designation, emp.salary?.bankName];
  const pct    = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const pColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f5a623" : "#ef4444";
  return (
    <div className="ep-content">
      <div className="ep-grid2">
        <div className="ep-card">
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20, paddingBottom:18, borderBottom:"1px solid #252a36" }}>
            <div className="ep-profile-ava">{pIni(emp)}</div>
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:"#e2e8f0" }}>{emp.firstName} {emp.lastName}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>{emp.professional?.designation || emp.professional?.department || RL[empRole]}</div>
            </div>
          </div>
          {fields.map(f => (
            <div key={f.label} className="ep-row-sep">
              <div style={{ width:130, fontSize:12, color:"#64748b", fontWeight:600 }}>{f.label}</div>
              <div style={{ fontSize:13, fontWeight:500, color:"#e2e8f0" }}>{f.val || "—"}</div>
            </div>
          ))}
        </div>
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-person-check" style={{ color:"#f5a623" }} /> Profile Completion</div>
          <div style={{ fontSize:36, fontWeight:900, color:pColor }}>{pct}%</div>
          <div className="ep-bar-track" style={{ marginTop:8, marginBottom:16 }}>
            <div className="ep-bar-fill" style={{ width:`${pct}%`, background:pColor }} />
          </div>
          <div style={{ fontSize:12, color:"#64748b" }}>
            {pct < 100 ? "Complete your profile to help HR manage your records." : "Your profile is fully complete!"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PORTAL CALENDAR VIEW ─────────────────────────────────────────────────────
const CAL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_CTYPE  = { reel:{ label:"Reel", icon:"bi-camera-video-fill", color:"#F59E0B" }, post:{ label:"Post", icon:"bi-image-fill", color:"#6366F1" }, carousel:{ label:"Carousel", icon:"bi-images", color:"#10B981" }, story:{ label:"Story", icon:"bi-phone-fill", color:"#EC4899" } };

function PortalCalendarDetailModal({ task, onClose }) {
  if (!task) return null;
  const ct = CAL_CTYPE[task.contentType];
  const stageColor = { S1:"#7C3AED", S2:"#1D4ED8", S3:"#B45309", S4:"#065F46" }[task.stage] || "#5A57FB";
  const dateStr = task.scheduledFor ? fmtD(task.scheduledFor) : fmtD(task.dueDate);
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1, paddingRight:12 }}>
            <div style={{ fontWeight:800, fontSize:15, color:"#1E293B", lineHeight:1.4, marginBottom:8 }}>{task.nomenclature || task.title || "—"}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {task.brandId && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:(task.brandId.color||"#5A57FB")+"20", color:task.brandId.color||"#5A57FB" }}>{task.brandId.name}</span>}
              {ct && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:ct.color+"18", color:ct.color }}><i className={`bi ${ct.icon}`} style={{ marginRight:3 }} />{ct.label}</span>}
              {task.stage && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:stageColor+"20", color:stageColor }}>{task.stage} · {STAGE_LABEL[task.stage]}</span>}
              {dateStr !== "—" && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#F1F5F9", color:"#64748B" }}><i className="bi bi-calendar3 me-1" />{dateStr}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"#F1F5F9", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, flexShrink:0 }}><i className="bi bi-x" /></button>
        </div>
        <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          {task.pillar && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Content Pillar</div><div style={{ fontSize:13, color:"#7C3AED", fontWeight:600 }}><i className="bi bi-tag me-1" />{task.pillar}</div></div>}
          {task.description && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Script / Description</div><div style={{ fontSize:12.5, color:"#374151", background:"#F8FAFC", borderRadius:8, padding:"10px 12px", lineHeight:1.7, whiteSpace:"pre-wrap", maxHeight:180, overflowY:"auto" }}>{task.description}</div></div>}
          {task.caption && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Caption</div><div style={{ fontSize:12.5, color:"#374151", background:"#F8FAFC", borderRadius:8, padding:"10px 12px", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{task.caption}</div></div>}
          {task.tags?.length > 0 && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Hashtags</div><div style={{ fontSize:12, color:"#6366F1", background:"#EEF2FF", borderRadius:8, padding:"8px 12px", lineHeight:1.8 }}>{task.tags.map(tg => `#${tg}`).join(" ")}</div></div>}
          {task.referenceLink && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Reference</div><a href={task.referenceLink} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#4F46E5", display:"inline-flex", alignItems:"center", gap:4, background:"#EEF2FF", padding:"6px 12px", borderRadius:8, textDecoration:"none" }}><i className="bi bi-link-45deg" /> View Reference</a></div>}
        </div>
      </div>
    </div>
  );
}

function PortalCalendarView() {
  const today = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth());
  const [tasks,  setTasks]  = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandFilter, setBrandFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const q     = new URLSearchParams({ dateStart: start, dateEnd: end });
    if (brandFilter) q.set("brandId", brandFilter);
    setLoading(true);
    // Fetch tasks AND brands with weeklySchedule in parallel (brands used for slot placement)
    Promise.all([
      fetch(`/api/employee/brand-tasks?${q}`, { headers: authH() }).then(r => r.json()),
      fetch(`/api/employee/weekly-tracker?dateStart=${start}&dateEnd=${end}`, { headers: authH() }).then(r => r.json()),
    ])
      .then(([taskData, brandData]) => {
        if (taskData.success) setTasks(taskData.tasks || []);
        if (brandData.success) {
          const bs = brandData.brands || [];
          setBrands(bs);
          // Auto-select Viralon, or first brand — never "All"
          setBrandFilter(prev => {
            if (prev && bs.find(b => String(b._id) === prev)) return prev;
            const viralon = bs.find(b => /viralon/i.test(b.name));
            return String(viralon?._id || bs[0]?._id || "");
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month, brandFilter]);

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const offset    = firstDay === 0 ? 6 : firstDay - 1;
  const cells     = Array(offset).fill(null).concat(Array.from({ length: daysInMon }, (_, i) => i + 1));
  const DAY_HEADS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  function portalMonthSlotIndex(dayNum, contentType, weeklySchedule) {
    const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const target = new Date(year, month, dayNum);
    const start  = new Date(year, month, 1);
    let count = 0;
    const cur = new Date(start);
    while (cur <= target) {
      count += weeklySchedule.filter(s => s.day === DAY_NAMES[cur.getDay()] && s.contentType === contentType).length;
      cur.setDate(cur.getDate() + 1);
    }
    return count - 1;
  }

  // Build tasksByDay using brand schedule slot index (mirrors admin calendar)
  const _portalTasksByDay = (() => {
    const result = {};
    const daysInMon2 = new Date(year, month + 1, 0).getDate();
    const DAY_NAMES  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    // Group tasks by brand+contentType, sort by taskId
    const taskGroups = {};
    tasks.forEach(t => {
      if (!t.brandId) return;
      const bId = typeof t.brandId === "object" ? String(t.brandId._id || t.brandId) : String(t.brandId);
      if (!taskGroups[bId]) taskGroups[bId] = {};
      const ct = t.contentType || "__unknown";
      if (!taskGroups[bId][ct]) taskGroups[bId][ct] = [];
      taskGroups[bId][ct].push(t);
    });
    Object.values(taskGroups).forEach(byType =>
      Object.values(byType).forEach(arr => arr.sort((a, b) => (a.taskId || "").localeCompare(b.taskId || "")))
    );

    const PC_DLVR = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
    // Use brand.weeklySchedule from the brands state (populated by brand-tasks API)
    brands.forEach(brand => {
      const bId = String(brand._id);
      if (!taskGroups[bId]) return;
      const schedule = brand.weeklySchedule || [];
      if (!schedule.length) return;
      for (let day = 1; day <= daysInMon2; day++) {
        const dayLabel = DAY_NAMES[new Date(year, month, day).getDay()];
        schedule.filter(s => s.day === dayLabel).forEach(slot => {
          const ct = slot.contentType;
          const ctTasks = taskGroups[bId]?.[ct];
          if (!ctTasks || !ctTasks.length) return;
          const idx = portalMonthSlotIndex(day, ct, schedule);
          if (idx < 0 || idx >= ctTasks.length) return;
          const dlvrKey = PC_DLVR[ct];
          if (dlvrKey) {
            const limit = brand.monthlyDeliverables?.[dlvrKey];
            if (limit != null && idx >= limit) return;
          }
          if (!result[day]) result[day] = [];
          result[day].push(ctTasks[idx]);
        });
      }
    });
    return result;
  })();

  function dayTasks(day) {
    return _portalTasksByDay[day] || [];
  }

  const prevMonth = () => { if (month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); };

  return (
    <div className="ep-content">
      <PortalCalendarDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
        <button onClick={prevMonth} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="bi bi-chevron-left" style={{ color:"#374151" }} /></button>
        <div>
          <div style={{ fontWeight:800, fontSize:17, color:"#1e293b" }}>{CAL_MONTHS[month]} {year}</div>
          <div style={{ fontSize:12, color:"#64748b" }}>{tasks.length} content task{tasks.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={nextMonth} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="bi bi-chevron-right" style={{ color:"#374151" }} /></button>
        <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:"5px 14px", cursor:"pointer", fontSize:12, fontWeight:600, color:"#374151" }}>Today</button>
        {brands.length > 0 && (
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, fontWeight:600, outline:"none", background:"#fff", color:"#374151", marginLeft:"auto" }}>
            {brands.map(b => <option key={b._id} value={String(b._id)}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        {[["#F97316","S1"],["#3B82F6","S2"],["#EAB308","S3"],["#22C55E","S4"]].flatMap(([c,l]) => [
          <span key={l+"a"} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
            <span style={{ width:18, height:12, borderRadius:3, background:"#fff", border:`1.5px solid ${c}`, display:"inline-block" }} />{l} Assigned
          </span>,
          <span key={l+"d"} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
            <span style={{ width:18, height:12, borderRadius:3, background:c+"28", border:`1.5px solid ${c}`, display:"inline-block" }} />{l} Approved
          </span>,
        ])}
        <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
          <span style={{ width:18, height:12, borderRadius:3, background:"#F1F5F9", border:"1.5px solid #D1D5DB", display:"inline-block" }} />No stage
        </span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
          <span style={{ width:18, height:12, borderRadius:3, background:"#F8FAFC", border:"1px dashed #D1D5DB", display:"inline-block" }} />Scheduled (plan)
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"#94A3B8" }}><div className="ep-spinner" /></div>
      ) : (
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid #e2e8f0" }}>
            {DAY_HEADS.map(d => (
              <div key={d} style={{ padding:"10px 0", textAlign:"center", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px", color:"#94A3B8" }}>{d}</div>
            ))}
          </div>
          {/* Grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} style={{ minHeight:90, borderBottom:"1px solid #f9f9f9", borderRight:"1px solid #f9f9f9", background:"#FAFAFA" }} />;
              const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===day;
              const dt = dayTasks(day);
              // Planned slots: only when a brand is selected, capped by monthly deliverable
              const PC_DLVR2 = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
              const PC_MON   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              const pcMonLabel = `${PC_MON[month]}'${String(year).slice(2)}`;
              const selBrand = brandFilter ? brands.find(b => String(b._id) === brandFilter) : null;
              let unfilledSlots = [];
              if (selBrand) {
                const DAY_NAMES2 = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                const dayLabel2  = DAY_NAMES2[new Date(year, month, day).getDay()];
                const scheduled2 = (selBrand.weeklySchedule || []).filter(s => s.day === dayLabel2);
                const rem2 = {};
                dt.forEach(t => { rem2[t.contentType] = (rem2[t.contentType] || 0) + 1; });
                unfilledSlots = scheduled2.reduce((acc, slot) => {
                  const ct = slot.contentType;
                  const slotIdx = portalMonthSlotIndex(day, ct, selBrand.weeklySchedule || []);
                  const dlvrKey = PC_DLVR2[ct];
                  if (dlvrKey) {
                    const limit = selBrand.monthlyDeliverables?.[dlvrKey];
                    if (limit != null && slotIdx >= limit) return acc;
                  }
                  if ((rem2[ct] || 0) > 0) { rem2[ct]--; return acc; }
                  acc.push({ ...slot, slotIdx });
                  return acc;
                }, []);
              }
              const preview   = dt.slice(0, 3);
              const extraTask = dt.length - preview.length;
              const slotsShow = unfilledSlots.slice(0, Math.max(0, 3 - preview.length));
              const extraSlot = unfilledSlots.length - slotsShow.length;
              return (
                <div key={day} style={{ minHeight:90, padding:"7px 6px", borderBottom:"1px solid #f9f9f9", borderRight:"1px solid #f9f9f9", background:isToday?"#FFFBEB":"#fff" }}>
                  <div style={{ width:26, height:26, borderRadius:"50%", marginBottom:5, display:"flex", alignItems:"center", justifyContent:"center", background:isToday?"#5A57FB":"transparent", fontSize:12, fontWeight:isToday?800:400, color:isToday?"#fff":"#374151" }}>{day}</div>
                  {preview.map(t => {
                    const ct  = CAL_CTYPE[t.contentType] || {};
                    const sty = getTaskStageStyle(t);
                    const nom = t.nomenclature || t.title || "";
                    const ctLower = (t.contentType || "").toLowerCase();
                    let suffix = nom.toLowerCase().startsWith(ctLower) ? nom.slice(ctLower.length).trim() : nom;
                    suffix = suffix.replace(/\b[a-z]/g, c => c.toUpperCase());
                    const label = suffix ? `${ct.label||t.contentType} ${suffix}` : (ct.label||nom);
                    return (
                      <div key={t._id} onClick={() => setSelectedTask(t)} title={nom}
                        style={{ fontSize:10, padding:"2px 5px", borderRadius:4, marginBottom:2, background:sty.bg, color:sty.color, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", cursor:"pointer", border:`1.5px solid ${sty.border}`, display:"flex", alignItems:"center", gap:3 }}>
                        {ct.icon && <i className={`bi ${ct.icon}`} style={{ fontSize:9, flexShrink:0 }} />}{label}
                      </div>
                    );
                  })}
                  {extraTask > 0 && <div style={{ fontSize:9, color:"#5A57FB", fontWeight:700, cursor:"pointer" }} onClick={() => setSelectedTask(dt[3])}>+{extraTask} more</div>}
                  {slotsShow.map((slot, si) => {
                    const ct = CAL_CTYPE[slot.contentType] || {};
                    return (
                      <div key={`ps${si}`}
                        style={{ fontSize:10, padding:"2px 5px", borderRadius:4, marginBottom:2, background:"#F8FAFC", color:"#94A3B8", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", border:"1px dashed #D1D5DB", display:"flex", alignItems:"center", gap:3 }}>
                        {ct.icon && <i className={`bi ${ct.icon}`} style={{ fontSize:9, flexShrink:0 }} />}
                        {`${ct.label||slot.contentType} ${slot.slotIdx+1} ${pcMonLabel}`}
                      </div>
                    );
                  })}
                  {extraSlot > 0 && <div style={{ fontSize:9, color:"#94A3B8", fontWeight:700 }}>+{extraSlot} planned</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DARK PORTAL (non-content roles) ─────────────────────────────────────────
function DarkPortal() {
  const router  = useRouter();
  const [employee,   setEmployee]   = useState(null);
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState("today");
  const [editorTask, setEditorTask] = useState(null);
  const prevViewRef = useRef("today"); // tracks where editor was opened from
  const empRole = getTMSRole(employee);

  // Restore last active tab on mount (persists through refresh)
  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("ep_view") : null;
    if (saved && saved !== "editor") setView(saved);
  }, []);

  // Wrap setView so non-editor tabs are saved to sessionStorage
  const changeView = (v) => {
    if (v !== "editor" && typeof window !== "undefined") sessionStorage.setItem("ep_view", v);
    setView(v);
  };

  useEffect(() => {
    const headers = authH();
    Promise.all([
      fetch("/api/employee/me",    { headers }).then(r => r.json()),
      fetch("/api/employee/tasks", { headers }).then(r => r.json()),
    ]).then(([er, tr]) => {
      if (er.success) setEmployee(er.employee);
      else { router.push("/employee/login"); return; }
      if (tr.success) setTasks(tr.tasks || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh: socket events + tab visibility + polling
  const refreshTasks = useCallback(() => {
    fetch("/api/employee/tasks", { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks || []); })
      .catch(() => {});
  }, []);
  useTaskSync(refreshTasks, { empId: employee?._id || null });

  const isContent = empRole === "content";
  const dept  = (employee?.professional?.department || "").toLowerCase();
  const isDM  = dept.includes("digital marketing");

  // Listen for "View →" clicks from content-team Today/Upcoming table rows
  useEffect(() => {
    const handler = e => {
      prevViewRef.current = view;
      setEditorTask(e.detail);
      setView("editor");
    };
    window.addEventListener("openInEditor", handler);
    return () => window.removeEventListener("openInEditor", handler);
  }, [view]);

  const NAV = [
    { key:"today",       label:"Dashboard",        icon:"bi-house" },
    { key:"tasks",       label:"My Tasks",          icon:"bi-check2-square" },
    ...(isContent ? [{ key:"editor",  label:"Content Editor",  icon:"bi-pencil-square" }] : []),
    { key:"week",        label:"Weekly Tracker",    icon:"bi-calendar-week" },
    { key:"history",     label:"History",           icon:"bi-clock-history" },
    ...(empRole !== "developer" ? [{ key:"calendar", label:"Content Calendar", icon:"bi-calendar3" }] : []),
    ...(isContent ? [
      { key:"library",     label:"Script Library",   icon:"bi-journal-text" },
      { key:"submissions", label:"Submissions",       icon:"bi-send" },
    ] : []),
    { key:"grades",      label:"Grades",            icon:"bi-award" },
    { key:"notifs",      label:"Notifications",     icon:"bi-bell" },
    { key:"performance", label:"My Stats",          icon:"bi-graph-up-arrow" },
  ];
  const TITLES = {
    today:"Dashboard", tasks:"My Tasks", week:"Weekly Tracker", history:"History",
    calendar:"Content Calendar", grades:"Grades", notifs:"Notifications",
    performance:"My Stats", profile:"Profile",
    editor:"Content Editor", library:"Script Library", submissions:"Submissions",
  };

  function logout() { localStorage.removeItem("employeeToken"); router.push("/employee/login"); }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f1f5f9" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:36, height:36, border:"3px solid #e2e8f0", borderTopColor:"#f5a623", borderRadius:"50%", animation:"spin .7s linear infinite", margin:"0 auto 12px" }} />
        <div style={{ color:"#64748b", fontSize:13 }}>Loading your dashboard…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <Head>
        <title>Dashboard · Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
      </Head>
      <style>{PORTAL_CSS}</style>
      <div className="ep-layout">

        {/* ── Desktop sidebar ── */}
        <div className="ep-side">
          <div className="ep-side-logo">
          <img width="100" alt="Viralon" src="/assets/images/logo.png"/>
          </div>
          <nav className="ep-side-nav">
            {NAV.map(n => (
              <button key={n.key} className={`ep-nav ${view===n.key?"active":""}`} onClick={() => changeView(n.key)}>
                <i className={`bi ${n.icon}`} />{n.label}
              </button>
            ))}
          </nav>
          <div className="ep-side-footer">
            <div className="ep-ava">{pIni(employee)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="ep-side-name">{employee ? `${employee.firstName} ${employee.lastName}` : "Loading…"}</div>
              <div className="ep-side-role">{employee?.professional?.designation || employee?.professional?.department || RL[empRole]}</div>
            </div>
            <button onClick={logout} title="Logout" style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:16, padding:4 }}>
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>

        <div className="ep-main">
          {/* ── Mobile sticky topbar (replaces desktop topbar on mobile) ── */}
          <div className="ep-mob-topbar">
            <img src="/assets/images/logo.png" alt="Viralon"
              style={{ height:22, filter:"brightness(0) invert(1)" }}
              onError={e => { e.currentTarget.style.display="none"; }} />
            <div className="ep-mob-topbar-title">{TITLES[view] || "Dashboard"}</div>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"rgba(90,87,251,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, color:"#fff", flexShrink:0 }}>
              {pIni(employee)}
            </div>
          </div>

          {/* ── Desktop topbar ── */}
          <div className="ep-topbar" style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Link href="/employee/dashboard"
              style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 12px", borderRadius:20, background:"#EEF2FF", color:"#4F46E5", textDecoration:"none", flexShrink:0, fontSize:12.5, fontWeight:600, transition:"all .18s" }}
              onMouseEnter={e => { e.currentTarget.style.background="#4F46E5"; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background="#EEF2FF"; e.currentTarget.style.color="#4F46E5"; }}>
              <i className="bi bi-arrow-left" style={{ fontSize:13 }} />
              Back to Dashboard
            </Link>
            <div className="ep-topbar-title">{TITLES[view] || "Dashboard"}</div>
          </div>

          {view === "today"       && <PortalTodayView        emp={employee} tasks={tasks} loading={loading} empId={employee?._id} />}
          {view === "tasks"       && (isContent
            ? <div className="ep-content"><MyTasksTab tasks={tasks} openInEditor={t => { prevViewRef.current = "tasks"; setEditorTask(t); setView("editor"); }} empId={employee?._id} /></div>
            : <PortalMyTasksView tasks={tasks} loading={loading} empId={employee?._id} isDM={isDM} />
          )}
          {view === "week"        && <PortalThisWeekView />}
          {view === "history"     && <PortalHistoryView       tasks={tasks} loading={loading} />}
          {view === "calendar"    && <PortalCalendarView />}
          {view === "grades"      && <PortalGradesView        tasks={tasks} loading={loading} />}
          {view === "notifs"      && <PortalNotificationsView tasks={tasks} loading={loading} />}
          {view === "performance" && <PortalPerformanceView   tasks={tasks} loading={loading} emp={employee} />}
          {view === "profile"     && <PortalProfileView       emp={employee} empRole={empRole} loading={loading} />}
          {view === "editor"      && (
            <div className="ep-content">
              <ContentEditorTab tasks={tasks} initialTask={editorTask} onBack={() => changeView(prevViewRef.current || "tasks")} />
            </div>
          )}
          {view === "library"     && (
            <div className="ep-content">
              <ScriptLibraryTab tasks={tasks} />
            </div>
          )}
          {view === "submissions" && (
            <div className="ep-content">
              <SubmissionsTab tasks={tasks} />
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile bottom tab bar (only visible < 900px) ── */}
      <div className="ep-mob-tabs">
        <div className="ep-mob-tabs-inner">
          {NAV.map(n => (
            <button key={n.key} className={`ep-mob-tab ${view===n.key?"active":""}`} onClick={() => changeView(n.key)}>
              <i className={`bi ${n.icon}`} />
              {n.label}
            </button>
          ))}
        </div>
      </div>
      <ToastContainer position="bottom-right" autoClose={2500} />
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function EmployeeTasksDashboard() {
  const [employee,   setEmployee]   = useState(null);
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("dashboard");
  const [editorTask, setEditorTask] = useState(null);

  useEffect(() => {
    const token   = localStorage.getItem("employeeToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      fetch("/api/employee/me",    { headers }).then(r => r.json()),
      fetch("/api/employee/tasks", { headers }).then(r => r.json()),
    ])
      .then(([er, tr]) => {
        if (er.success) setEmployee(er.employee);
        if (tr.success) setTasks(tr.tasks);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Auto-refresh for light-theme TMS (content team)
  const refreshLightTasks = useCallback(() => {
    const token   = localStorage.getItem("employeeToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/employee/tasks", { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks || []); })
      .catch(() => {});
  }, []);
  useTaskSync(refreshLightTasks, { empId: employee?._id || null });

  function openInEditor(task) {
    setEditorTask(task);
    setActiveTab("editor");
  }

  function switchTab(key) {
    setActiveTab(key);
    if (key !== "editor") setEditorTask(null);
  }

  const role = getTMSRole(employee);

  // All roles → dark portal (self-fetching, handles content-specific tabs internally)
  if (!loading) {
    return <DarkPortal />;
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="spinner-border text-primary" role="status" />
    </div>
  );
  const config = ROLE_CONFIG[role];
  const tabs   = (TABS_BY_ROLE[role] || TABS_BY_ROLE.general).map(k => ({ key: k, ...TAB_META[k] }));

  return (
    <>
      <Head>
        <title>Task Management · Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="/asets/css/employee.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
      </Head>

      <div className="main-nav">
        <Leftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item"><Link href="/employee/dashboard"><img src="/icons/home.svg" alt="" /> Home</Link></li>
              <li className="breadcrumb-item active">Task Management</li>
            </ul>
          </div>

          <div className="block-header">
            <div className="tms-page-header">
              <div>
                <h4 className="tms-page-title">
                  <i className={`bi ${config.icon} me-2`} style={{ color: config.ic }} />
                  Task Management
                </h4>
                <p className="tms-page-sub">
                  {employee?.firstName ? `Welcome, ${employee.firstName}` : "Your work overview"} · {config.label}
                </p>
              </div>
              {activeTab === "editor" && editorTask && (
                <button onClick={() => switchTab("tasks")} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #E5E7EB", background: "#fff", color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-arrow-left" /> Back to My Tasks
                </button>
              )}
            </div>

            {/* Tab nav */}
            <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #F0F0F0", marginBottom: 22, overflowX: "auto" }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => switchTab(t.key)} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
                  fontSize: 13, fontWeight: 600, background: "transparent", border: "none", cursor: "pointer",
                  borderBottom: activeTab === t.key ? `2px solid ${config.ic}` : "2px solid transparent",
                  color: activeTab === t.key ? config.ic : "#9CA3AF",
                  marginBottom: -2, transition: "all .15s", whiteSpace: "nowrap",
                }}>
                  <i className={`bi ${t.icon}`} />{t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "dashboard"   && <DashboardTab    employee={employee} tasks={tasks} role={role} switchTab={switchTab} />}
            {activeTab === "tasks"       && <MyTasksTab       tasks={tasks} openInEditor={openInEditor} />}
            {activeTab === "editor"      && <ContentEditorTab tasks={tasks} initialTask={editorTask} />}
            {activeTab === "brandcal"    && <BrandCalendarTab tasks={tasks} />}
            {activeTab === "calendar"    && <BrandCalendarTab tasks={tasks} />}
            {activeTab === "weekly"      && <WeeklyTrackerTab />}
            {activeTab === "mycal"       && <MyCalendarTab />}
            {activeTab === "library"     && <ScriptLibraryTab tasks={tasks} />}
            {activeTab === "submissions" && <SubmissionsTab   tasks={tasks} />}
            {activeTab === "queue"       && <QueueTab         tasks={tasks} role={role} />}
            {activeTab === "board"       && <SprintBoardTab   tasks={tasks} />}
            {activeTab === "performance" && <PerformanceTab   tasks={tasks} employee={employee} />}
          </div>
        </section>
      </div>

      <ToastContainer position="bottom-right" autoClose={2500} />
    </>
  );
}
