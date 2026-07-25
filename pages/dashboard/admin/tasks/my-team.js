import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import { isTaskAssignedTo, filterTasksByMonth } from "@/utils/tasks/employeeGrade";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_META = {
  todo:        { label: "To Do",       color: "#64748B", bg: "#F1F5F9", dot: "#CBD5E1" },
  in_progress: { label: "In Progress", color: "#1D4ED8", bg: "#DBEAFE", dot: "#3B82F6" },
  review:      { label: "Review",      color: "#B45309", bg: "#FEF3C7", dot: "#F59E0B" },
  completed:   { label: "Done",        color: "#15803D", bg: "#DCFCE7", dot: "#10B981" },
  blocked:     { label: "Blocked",     color: "#DC2626", bg: "#FEE2E2", dot: "#EF4444" },
};

const STAGE_COLORS = { S1: "#F59E0B", S2: "#6366F1", S3: "#10B981", S4: "#EC4899" };

const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],
];

function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return name?.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";
}

function isOverdue(t) {
  return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
}

export default function MyTeamPage() {
  const router   = useRouter();
  const today    = new Date();
  const [employees, setEmployees] = useState([]);
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null); // employee id
  const [selMonth,  setSelMonth]  = useState(today.getMonth());
  const [selYear,   setSelYear]   = useState(today.getFullYear());

  const isCurrentMonth = selMonth === today.getMonth() && selYear === today.getFullYear();

  function shiftMonth(dir) {
    let m = selMonth + dir, y = selYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setSelMonth(m); setSelYear(y);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/assets/employees", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tasks?limit=3000", { credentials: "include" }).then(r => r.json()),
    ]).then(([empData, taskData]) => {
      if (empData.success)  setEmployees(empData.employees || []);
      if (taskData.success) setTasks(taskData.tasks || []);
    }).catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Group tasks per employee, scoped to the selected month ── */
  const empTasks = (empId) => filterTasksByMonth(tasks.filter(t => isTaskAssignedTo(t, empId)), selMonth, selYear);

  const todayTasks = (empId) => empTasks(empId).filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate).toDateString() === today.toDateString();
  });

  const monthTaskCount = employees.reduce((sum, e) => sum + empTasks(e._id).length, 0);

  const displayEmployees = employees.filter(e => !selected || e._id === selected);

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>My Team — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .mt-card { background:#fff; border-radius:16px; border:1.5px solid #F1F5F9; overflow:hidden; margin-bottom:20px; }
          .mt-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
          .mt-task-row { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid #F8FAFC; cursor:pointer; }
          .mt-task-row:hover { background:#FAFBFF; }
          .mt-task-row:last-child { border-bottom:none; }
          .mt-avatar { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; flex-shrink:0; }
          .mt-select { padding:7px 10px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:12px; outline:none; background:#fff; cursor:pointer; }
          .mt-progress { height:6px; border-radius:4px; background:#F1F5F9; overflow:hidden; }
          .mt-progress-fill { height:100%; border-radius:4px; }
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
                <li className="breadcrumb-item active">My Team</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* Header */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">My Team</h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                    {isCurrentMonth ? today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) + " · " : ""}
                    {monthTaskCount} tasks across {employees.length} employees
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => shiftMonth(-1)} style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: 13 }}>‹</button>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#1E293B", minWidth: 120, textAlign: "center" }}>{MONTHS[selMonth]} {selYear}</div>
                    <button onClick={() => shiftMonth(1)} style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: 13 }}>›</button>
                  </div>
                  <select className="mt-select" value={selected || ""} onChange={e => setSelected(e.target.value || null)}>
                    <option value="">All Employees</option>
                    {employees.map(emp => {
                      const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                      return <option key={emp._id} value={emp._id}>{n}</option>;
                    })}
                  </select>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px,1fr))", gap: 20 }}>
                  {displayEmployees.map(emp => {
                    const name = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Employee";
                    const [bg, fg] = avatarColor(name);
                    const all    = empTasks(emp._id);
                    const today2 = todayTasks(emp._id);
                    const done   = all.filter(t => t.status === "completed").length;
                    const active = all.filter(t => t.status === "in_progress").length;
                    const overdue = all.filter(t => isOverdue(t)).length;
                    const pct    = all.length ? Math.round(done / all.length * 100) : 0;

                    return (
                      <div key={emp._id} className="mt-card">
                        {/* Employee header */}
                        <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #F1F5F9" }}>
                          <div className="mt-avatar" style={{ background: bg, color: fg }}>{getInitials(name)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B" }}>{name}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>{emp.professional?.designation || emp.professional?.department || "—"}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "#4F46E5" }}>{all.length}</div>
                            <div style={{ fontSize: 10, color: "#94A3B8" }}>total tasks</div>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #F1F5F9" }}>
                          {[
                            { label: "Today", value: today2.length, color: "#6366F1", bg: "#EEF2FF" },
                            { label: "Active", value: active, color: "#1D4ED8", bg: "#DBEAFE" },
                            { label: "Done", value: done, color: "#15803D", bg: "#DCFCE7" },
                            { label: "Overdue", value: overdue, color: overdue > 0 ? "#DC2626" : "#94A3B8", bg: overdue > 0 ? "#FEE2E2" : "#F8FAFC" },
                          ].map(s => (
                            <div key={s.label} style={{ flex: 1, padding: "10px 8px", textAlign: "center", background: s.bg, borderRight: "1px solid #F1F5F9" }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                              <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Progress */}
                        <div style={{ padding: "10px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Completion</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>{pct}%</span>
                          </div>
                          <div className="mt-progress">
                            <div className="mt-progress-fill" style={{ width: `${pct}%`, background: "#10B981" }} />
                          </div>
                        </div>

                        {/* Today's tasks */}
                        {today2.length > 0 && (
                          <div style={{ borderTop: "1px solid #F1F5F9" }}>
                            <div style={{ padding: "8px 18px 4px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              Due Today
                            </div>
                            {today2.slice(0, 4).map(t => {
                              const sm = STATUS_META[t.status] || {};
                              const ov = isOverdue(t);
                              const stageColor = STAGE_COLORS[t.stage];
                              return (
                                <div key={t._id} className="mt-task-row" onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                  {stageColor && (
                                    <div style={{ width: 4, height: 28, borderRadius: 2, background: stageColor, flexShrink: 0 }} />
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {ov && <i className="bi bi-exclamation-circle-fill text-danger me-1" style={{ fontSize: 10 }} />}
                                      {t.nomenclature || t.title}
                                    </div>
                                    {t.brandId && (
                                      <div style={{ fontSize: 10, color: t.brandId.color || "#94A3B8", fontWeight: 600 }}>{t.brandId.name}</div>
                                    )}
                                  </div>
                                  <span className="mt-badge" style={{ background: sm.bg, color: sm.color, fontSize: 10 }}>{sm.label}</span>
                                </div>
                              );
                            })}
                            {today2.length > 4 && (
                              <div style={{ padding: "6px 18px 10px", fontSize: 11, color: "#6366F1", fontWeight: 700, cursor: "pointer" }}
                                onClick={() => router.push(`/dashboard/admin/tasks/list?assignedTo=${emp._id}`)}>
                                +{today2.length - 4} more tasks →
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
          </section>
        </div>
      </div>
    </div>
  );
}
