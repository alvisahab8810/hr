import { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { calcEmployeeGrade, gradeTask, pointsToGrade } from "@/utils/tasks/gradeTask";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],
];
function avatarColor(name) { return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]; }
function getInitials(name) { return name?.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??"; }

function isOverdue(t) {
  return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
}

export default function TeamPerformancePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [stats, setStats]         = useState(null);
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sortBy, setSortBy]       = useState("completion"); // completion | workload | overdue

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/assets/employees", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tasks/stats", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tasks?limit=500", { credentials: "include" }).then(r => r.json()),
    ]).then(([empData, statsData, taskData]) => {
      if (empData.success)   setEmployees(empData.employees || []);
      if (statsData.success) setStats(statsData.stats);
      if (taskData.success)  setTasks(taskData.tasks || []);
    }).catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Build per-employee metrics ── */
  const empMetrics = useMemo(() => {
    return employees.map(emp => {
      const myTasks    = tasks.filter(t => String(t.assignedTo?._id || t.assignedTo) === String(emp._id));
      const completed  = myTasks.filter(t => t.status === "completed").length;
      const overdue    = myTasks.filter(t => isOverdue(t)).length;
      const inProgress = myTasks.filter(t => t.status === "in_progress").length;
      const total      = myTasks.length;
      const rate       = total > 0 ? Math.round(completed / total * 100) : 0;
      const name       = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Employee";

      // New punctuality-based grade
      const { avgPoints, grade, gradedCount, onTimeCount, lateCount } = calcEmployeeGrade(myTasks);

      return { emp, name, total, completed, inProgress, overdue, rate, grade, avgPoints, gradedCount, onTimeCount, lateCount };
    });
  }, [employees, tasks]);

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
                  {sorted.map(({ emp, name, total, completed, inProgress, overdue, rate, grade, avgPoints, gradedCount, onTimeCount, lateCount }, rank) => {
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
                          {/* Grade badge */}
                          <div style={{ textAlign: "center", padding: "6px 14px", borderRadius: 12, background: grade.bg, border: `2px solid ${grade.color}30` }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: grade.color, lineHeight: 1 }}>{grade.label}</div>
                            <div style={{ fontSize: 9, color: grade.color, fontWeight: 700, marginTop: 2 }}>
                              {avgPoints != null ? `${avgPoints}/5 pts` : "NO DATA"}
                            </div>
                          </div>
                        </div>

                        {/* Punctuality score bar */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Punctuality Score</span>
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
    </div>
  );
}
