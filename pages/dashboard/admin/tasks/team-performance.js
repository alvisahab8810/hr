import { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { calcEmployeeGrade, gradeTask, pointsToGrade } from "@/utils/tasks/gradeTask";
import { filterTasksByMonth, getStageDeadline, isTaskAssignedTo } from "@/utils/tasks/employeeGrade";
import { calcAttendancePoints, calcOverallScore } from "@/utils/attendance/attendancePoints";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],
];
function avatarColor(name) { return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]; }
function getInitials(name) { return name?.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??"; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isOverdue(t) {
  const dl = getStageDeadline(t);
  return dl && dl < new Date() && t.status !== "completed";
}

export default function TeamPerformancePage() {
  const router = useRouter();
  const now = new Date();
  const [employees, setEmployees] = useState([]);
  const [stats, setStats]         = useState(null);
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sortBy, setSortBy]       = useState("completion"); // completion | workload | overdue
  const [selMonth, setSelMonth]   = useState(now.getMonth());
  const [selYear,  setSelYear]    = useState(now.getFullYear());
  const [attDays, setAttDays]           = useState([]);
  const [elapsedWorkingDays, setElapsedWorkingDays] = useState(0);
  const [attLoading, setAttLoading]     = useState(true);
  const [pdGrades, setPdGrades]         = useState({}); // employeeId -> grade
  const [pdModalEmp, setPdModalEmp]     = useState(null); // employee being edited
  const [pdScore, setPdScore]           = useState(3);
  const [pdNote, setPdNote]             = useState("");
  const [pdSaving, setPdSaving]         = useState(false);

  function shiftMonth(dir) {
    let m = selMonth + dir, y = selYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setSelMonth(m); setSelYear(y);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/assets/employees", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tasks/stats", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tasks?limit=3000", { credentials: "include" }).then(r => r.json()),
    ]).then(([empData, statsData, taskData]) => {
      if (empData.success)   setEmployees(empData.employees || []);
      if (statsData.success) setStats(statsData.stats);
      if (taskData.success)  setTasks(taskData.tasks || []);
    }).catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const monthStr = `${selYear}-${String(selMonth + 1).padStart(2, "0")}`;
    setAttLoading(true);
    fetch(`/api/admin/attendance-summary?month=${monthStr}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAttDays(d.days || []);
          setElapsedWorkingDays(d.elapsedWorkingDays || 0);
        } else {
          setAttDays([]); setElapsedWorkingDays(0);
        }
      })
      .catch(() => { setAttDays([]); setElapsedWorkingDays(0); })
      .finally(() => setAttLoading(false));
  }, [selMonth, selYear]);

  function loadPdGrades() {
    fetch(`/api/admin/personal-development/list?month=${selMonth}&year=${selYear}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const map = {};
          (d.grades || []).forEach(g => { map[String(g.employee)] = g; });
          setPdGrades(map);
        } else {
          setPdGrades({});
        }
      })
      .catch(() => setPdGrades({}));
  }

  useEffect(() => { loadPdGrades(); }, [selMonth, selYear]);

  function openPdModal(emp) {
    const existing = pdGrades[String(emp._id)];
    setPdScore(existing ? existing.score : 3);
    setPdNote(existing ? existing.note : "");
    setPdModalEmp(emp);
  }

  function savePdGrade() {
    if (!pdModalEmp) return;
    setPdSaving(true);
    fetch("/api/admin/personal-development/set", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: pdModalEmp._id, month: selMonth, year: selYear, score: pdScore, note: pdNote }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          toast.success("Personal Development grade saved");
          setPdModalEmp(null);
          loadPdGrades();
        } else {
          toast.error(d.message || "Failed to save");
        }
      })
      .catch(() => toast.error("Failed to save"))
      .finally(() => setPdSaving(false));
  }

  /* ── Group attendance days by employee ── */
  const attByEmp = useMemo(() => {
    const map = {};
    attDays.forEach(d => {
      if (!map[d.employeeObjId]) map[d.employeeObjId] = { present: 0, onTime: 0, late: 0, workMin: 0 };
      const bucket = map[d.employeeObjId];
      bucket.present += 1;
      if (d.status === "On Time") bucket.onTime += 1;
      if (d.status === "Late")    bucket.late += 1;
      const [h, m] = (d.workingHours || "00:00").split(":").map(Number);
      bucket.workMin += (h || 0) * 60 + (m || 0);
    });
    return map;
  }, [attDays]);

  /* ── Build per-employee metrics, scoped to the selected month ── */
  const empMetrics = useMemo(() => {
    return employees.map(emp => {
      const allTasks   = tasks.filter(t => isTaskAssignedTo(t, emp._id));
      const myTasks    = filterTasksByMonth(allTasks, selMonth, selYear);
      const completed  = myTasks.filter(t => t.status === "completed").length;
      const overdue    = myTasks.filter(t => isOverdue(t)).length;
      const inProgress = myTasks.filter(t => t.status === "in_progress").length;
      const total      = myTasks.length;
      const rate       = total > 0 ? Math.round(completed / total * 100) : 0;
      const name       = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Employee";

      // Punctuality-based grade — same canonical formula the employee sees on their own Grades tab
      const { avgPoints, grade, gradedCount, onTimeCount, lateCount } = calcEmployeeGrade(myTasks);

      // Attendance summary — separate card, not folded into the task grade
      const ab = attByEmp[String(emp._id)] || { present: 0, onTime: 0, late: 0, workMin: 0 };
      const absent = Math.max(0, Math.round(elapsedWorkingDays - ab.present));
      const att = {
        present: ab.present, onTime: ab.onTime, late: ab.late, absent,
        hours: `${String(Math.floor(ab.workMin / 60)).padStart(2, "0")}:${String(ab.workMin % 60).padStart(2, "0")}`,
      };

      // Attendance points (0-5) and the combined Overall score
      const attPts = calcAttendancePoints({ late: att.late, absent: att.absent });
      const pd = pdGrades[String(emp._id)] || null;
      const overall = calcOverallScore([avgPoints, attPts.score, pd ? pd.score : null]);

      return { emp, name, total, completed, inProgress, overdue, rate, grade, avgPoints, gradedCount, onTimeCount, lateCount, att, attPts, pd, overall };
    });
  }, [employees, tasks, selMonth, selYear, attByEmp, elapsedWorkingDays, pdGrades]);

  const sorted = useMemo(() => {
    return [...empMetrics].sort((a, b) => {
      if (sortBy === "grade")      return (b.avgPoints ?? -1) - (a.avgPoints ?? -1);
      if (sortBy === "completion") return b.rate - a.rate;
      if (sortBy === "workload")   return b.total - a.total;
      if (sortBy === "overdue")    return b.overdue - a.overdue;
      return 0;
    });
  }, [empMetrics, sortBy]);

  const avgCompletion = empMetrics.length > 0
    ? Math.round(empMetrics.reduce((s, e) => s + e.rate, 0) / empMetrics.length)
    : 0;

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Team Performance — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .tp-card { background:#fff; border-radius:14px; border:1.5px solid #F1F5F9; padding:18px 20px; transition:box-shadow .14s; }
          .tp-card:hover { box-shadow:0 6px 24px rgba(99,102,241,.1); }
          .tp-avatar { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; flex-shrink:0; }
          .tp-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
          .tp-progress { height:8px; border-radius:4px; background:#F1F5F9; overflow:hidden; }
          .tp-progress-fill { height:100%; border-radius:4px; }
          .tp-stat-card { border-radius:14px; padding:16px 20px; border:1.5px solid; flex:1; min-width:120px; }
          .tp-tab { padding:7px 14px; border-radius:9px; border:1.5px solid #E5E7EB; background:#fff; font-size:12px; font-weight:600; cursor:pointer; }
          .tp-tab.active { background:#4F46E5; color:#fff; border-color:#4F46E5; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/admin/tasks"><img src="/icons/home.svg" alt="" /> Task Management</Link>
                </li>
                <li className="breadcrumb-item active">Team Performance</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* Month navigator */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <button onClick={() => shiftMonth(-1)} style={{ width:32, height:32, borderRadius:8, border:"1.5px solid #E5E7EB", background:"#fff", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
                <div style={{ fontWeight:800, fontSize:15, color:"#1E293B", minWidth:140, textAlign:"center" }}>{MONTHS[selMonth]} {selYear}</div>
                <button onClick={() => shiftMonth(1)} style={{ width:32, height:32, borderRadius:8, border:"1.5px solid #E5E7EB", background:"#fff", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
              </div>

              {/* Summary stats */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
                {[
                  { label: "Total Tasks",   value: stats?.total || 0,          color: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE", icon: "bi-list-task" },
                  { label: "Avg Completion",value: `${avgCompletion}%`,         color: "#10B981", bg: "#ECFDF5", border: "#BBF7D0", icon: "bi-graph-up-arrow" },
                  { label: "Total Overdue", value: stats?.overdue || 0,         color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5", icon: "bi-exclamation-circle" },
                  { label: "Team Size",     value: employees.length,            color: "#7C3AED", bg: "#F3E8FF", border: "#D8B4FE", icon: "bi-people-fill" },
                  { label: "Completed This Month", value: stats?.completedThisMonth || 0, color: "#15803D", bg: "#DCFCE7", border: "#BBF7D0", icon: "bi-check-circle-fill" },
                ].map(c => (
                  <div key={c.label} className="tp-stat-card" style={{ background: c.bg, borderColor: c.border, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`bi ${c.icon}`} style={{ color: c.color, fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{loading ? "—" : c.value}</div>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{c.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sort controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Sort by:</span>
                {[["grade","Grade"],["completion","Completion Rate"],["workload","Workload"],["overdue","Most Overdue"]].map(([k, l]) => (
                  <button key={k} className={`tp-tab ${sortBy === k ? "active" : ""}`} onClick={() => setSortBy(k)}>{l}</button>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : sorted.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <i className="bi bi-people" style={{ fontSize: 48 }} />
                  <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700 }}>No team members found</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
                  {sorted.map(({ emp, name, total, completed, inProgress, overdue, rate, grade, avgPoints, gradedCount, onTimeCount, lateCount, att, attPts, pd, overall }, rank) => {
                    const [bg, fg] = avatarColor(name);
                    const ptsPct = avgPoints != null ? (avgPoints / 5) * 100 : 0;
                    return (
                      <div key={emp._id} className="tp-card">
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                          <div style={{ position: "relative" }}>
                            <div className="tp-avatar" style={{ background: bg, color: fg }}>{getInitials(name)}</div>
                            <div style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#1E293B", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              #{rank + 1}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B" }}>{name}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>{emp.professional?.designation || emp.professional?.department || "—"}</div>
                          </div>
                          {/* Overall score badge — average of Task Grade + Attendance + Personal Development */}
                          <div style={{ textAlign: "center", padding: "6px 14px", borderRadius: 12, background: overall.grade.bg, border: `2px solid ${overall.grade.color}30` }}>
                            <div style={{ fontSize: 9, color: overall.grade.color, fontWeight: 700 }}>OVERALL AVE. SCORE</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: overall.grade.color, lineHeight: 1 }}>{overall.score != null ? overall.grade.label : "—"}</div>
                            <div style={{ fontSize: 9, color: overall.grade.color, fontWeight: 700, marginTop: 2 }}>
                              {overall.score != null ? `${overall.score}/5 pts` : "NO DATA"}
                            </div>
                          </div>
                        </div>

                        {/* Overall score breakdown — shows exactly which numbers were averaged */}
                        {overall.score != null && (
                          <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 12, marginTop: -8 }}>
                            {[
                              `Task ${avgPoints ?? 0}`,
                              `Attendance ${attPts.score}`,
                              pd ? `Personal Dev ${pd.score}` : null,
                            ].filter(Boolean).join(" + ")} → avg <strong style={{ color: "#64748B" }}>{overall.score}</strong>
                            {!pd && " (Personal Dev not set, so not counted)"}
                          </div>
                        )}

                        {/* Punctuality score bar */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Punctuality Score (Task points)</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: grade.color }}>{avgPoints != null ? `${avgPoints} / 5` : "—"}</span>
                          </div>
                          <div className="tp-progress">
                            <div className="tp-progress-fill" style={{ width: `${ptsPct}%`, background: grade.color, transition: "width .4s" }} />
                          </div>
                        </div>

                        {/* On-time breakdown */}
                        {gradedCount > 0 && (
                          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                            <div style={{ flex: 1, background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 9, padding: "6px 10px", textAlign: "center" }}>
                              <div style={{ fontSize: 16, fontWeight: 900, color: "#15803D" }}>{onTimeCount}</div>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#15803D" }}>ON TIME</div>
                            </div>
                            <div style={{ flex: 1, background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 9, padding: "6px 10px", textAlign: "center" }}>
                              <div style={{ fontSize: 16, fontWeight: 900, color: "#DC2626" }}>{lateCount}</div>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#DC2626" }}>LATE</div>
                            </div>
                            <div style={{ flex: 1, background: "#F8FAFC", border: "1.5px solid #E5E7EB", borderRadius: 9, padding: "6px 10px", textAlign: "center" }}>
                              <div style={{ fontSize: 16, fontWeight: 900, color: "#1E293B" }}>{gradedCount}</div>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#64748B" }}>GRADED</div>
                            </div>
                          </div>
                        )}

                        {/* Completion rate bar */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Completion Rate</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#10B981" }}>{rate}%</span>
                          </div>
                          <div className="tp-progress">
                            <div className="tp-progress-fill" style={{ width: `${rate}%`, background: rate >= 70 ? "#10B981" : rate >= 40 ? "#F59E0B" : "#EF4444" }} />
                          </div>
                        </div>

                        {/* Attendance Summary — separate from task grade */}
                        <div style={{ marginBottom: 10, borderTop: "1px solid #F1F5F9", paddingTop: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Attendance Points {attLoading && "· loading…"}</span>
                            {!attLoading && (
                              <span style={{ fontSize: 11, fontWeight: 800, color: attPts.grade.color }}>{attPts.score}/5 · {attPts.grade.label}</span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span className="tp-badge" style={{ background: "#F0FDF4", color: "#15803D" }}>
                              <i className="bi bi-calendar-check" style={{ fontSize: 10 }} /> {att.present} present
                            </span>
                            <span className="tp-badge" style={{ background: "#FEF3C7", color: "#B45309" }}>
                              <i className="bi bi-clock-history" style={{ fontSize: 10 }} /> {att.late} late
                            </span>
                            <span className="tp-badge" style={{ background: att.absent > 0 ? "#FEE2E2" : "#F8FAFC", color: att.absent > 0 ? "#DC2626" : "#94A3B8" }}>
                              <i className="bi bi-calendar-x" style={{ fontSize: 10 }} /> {att.absent} absent
                            </span>
                          </div>
                        </div>

                        {/* Personal Development — admin-set, separate from task grade & attendance */}
                        <div style={{ marginBottom: 10, borderTop: "1px solid #F1F5F9", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>Personal Development</div>
                            {pd ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 900, color: "#7C3AED" }}>{pd.score}/5</span>
                                {pd.note && (
                                  <span style={{ fontSize: 11, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {pd.note}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: "#94A3B8" }}>Not set — Overall score is Task + Attendance only for now</span>
                            )}
                          </div>
                          <button
                            style={{ border: "1.5px solid #DDD6FE", background: "#F5F3FF", color: "#7C3AED", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                            onClick={() => openPdModal(emp)}>
                            <i className="bi bi-pencil-square" /> {pd ? "Edit" : "Set"}
                          </button>
                        </div>

                        {/* Stat badges */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span className="tp-badge" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                            <i className="bi bi-list-task" style={{ fontSize: 10 }} /> {total}
                          </span>
                          <span className="tp-badge" style={{ background: "#DCFCE7", color: "#15803D" }}>
                            <i className="bi bi-check-circle" style={{ fontSize: 10 }} /> {completed} done
                          </span>
                          <span className="tp-badge" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>
                            <i className="bi bi-play-circle" style={{ fontSize: 10 }} /> {inProgress} active
                          </span>
                          {overdue > 0 && (
                            <span className="tp-badge" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                              <i className="bi bi-clock" style={{ fontSize: 10 }} /> {overdue} overdue
                            </span>
                          )}
                        </div>

                        {/* View link */}
                        <div style={{ marginTop: 12, textAlign: "right" }}>
                          <button style={{ border: "none", background: "none", cursor: "pointer", color: "#6366F1", fontSize: 12, fontWeight: 700 }}
                            onClick={() => router.push(`/dashboard/admin/tasks/list?assignedTo=${emp._id}`)}>
                            View tasks <i className="bi bi-arrow-right" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Personal Development modal */}
      {pdModalEmp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => !pdSaving && setPdModalEmp(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 380, maxWidth: "92vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 4 }}>Personal Development</div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 18 }}>
              {(pdModalEmp.personal?.firstName || pdModalEmp.firstName || "")} {(pdModalEmp.personal?.lastName || pdModalEmp.lastName || "")} · {MONTHS[selMonth]} {selYear}
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".05em" }}>Score (0–5)</label>
            <input
              type="number" min={0} max={5} step={0.5} value={pdScore}
              onChange={e => setPdScore(Math.max(0, Math.min(5, Number(e.target.value))))}
              style={{ width: "100%", marginTop: 6, marginBottom: 14, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14 }}
            />

            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".05em" }}>Note</label>
            <textarea
              value={pdNote} onChange={e => setPdNote(e.target.value)} rows={4}
              placeholder="Comments on attitude, teamwork, punctuality, growth…"
              style={{ width: "100%", marginTop: 6, marginBottom: 18, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 13, resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                disabled={pdSaving}
                onClick={() => setPdModalEmp(null)}
                style={{ border: "1.5px solid #E5E7EB", background: "#fff", color: "#64748B", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                disabled={pdSaving}
                onClick={savePdGrade}
                style={{ border: "none", background: "#7C3AED", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {pdSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
