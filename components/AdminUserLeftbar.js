// components/AdminUserLeftbar.js — sidebar for invited admin users (permission-filtered)
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

const ALL_MODULES = [
  { key: "employees",     label: "Employee Mgmt",   href: "/dashboard/admin/employee-management", icon: "bi-people-fill" },
  { key: "attendance",    label: "Attendance",       href: "/dashboard/admin/attendance-summary",  icon: "bi-calendar-check-fill" },
  { key: "leaves",        label: "Leaves",           href: "/dashboard/admin/leaves-management",   icon: "bi-calendar-x-fill" },
  { key: "salaryReport",  label: "Salary Report",    href: "/dashboard/admin/salary-report",       icon: "bi-cash-stack" },
  { key: "reimbursement", label: "Reimbursement",    href: "/dashboard/admin/reimbursement",       icon: "bi-receipt" },
  { key: "overtime",      label: "Overtime",         href: "/dashboard/admin/overtime",            icon: "bi-clock-fill" },
  { key: "deductions",    label: "Deductions",       href: "/dashboard/admin/deduction-waiver",    icon: "bi-shield-check" },
  { key: "holidays",      label: "Holidays",         href: "/dashboard/admin/holidays",            icon: "bi-star-fill" },
];

export default function AdminUserLeftbar({ user }) {
  const router = useRouter();
  const permissions = user?.permissions || {};
  const [tmsOpen, setTmsOpen] = useState(
    () => typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard/admin/tasks")
  );
  const [communityUnread,      setCommunityUnread]      = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  // ref points to <aside> — the actual scroll container (overflow-y: scroll in CSS)
  const sidebarRef = useRef(null);

  // Persist scroll position to sessionStorage on every scroll
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const onScroll = () => sessionStorage.setItem("adminSidebarScroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Restore scroll position on each navigation
  useEffect(() => {
    const saved = sessionStorage.getItem("adminSidebarScroll");
    if (!saved) return;
    const target = parseInt(saved, 10);
    requestAnimationFrame(() => {
      if (sidebarRef.current) sidebarRef.current.scrollTop = target;
    });
  }, [router.pathname]);

  // Freeze sidebar scroll when toggling TMS submenu
  const toggleTms = () => {
    const el = sidebarRef.current;
    const scrollTop = el ? el.scrollTop : 0;
    setTmsOpen(v => !v);
    if (el) requestAnimationFrame(() => { el.scrollTop = scrollTop; });
  };

  useEffect(() => {
    async function fetchUnread() {
      try {
        const r = await fetch("/api/team/notifications", { credentials: "include" });
        const d = await r.json();
        if (d.success) setCommunityUnread(d.total || 0);
      } catch {}
    }
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function fetchApprovalsCount() {
      try {
        const r = await fetch("/api/admin/tasks/approvals-count", { credentials: "include" });
        const d = await r.json();
        if (d.success) setPendingApprovalsCount(d.count || 0);
      } catch {}
    }
    fetchApprovalsCount();
    const t = setInterval(fetchApprovalsCount, 60000);
    return () => clearInterval(t);
  }, []);

  const visibleItems = ALL_MODULES.filter(m => permissions[m.key]);

  return (
    <aside id="leftsidebar" className="sidebar mobile-none" ref={sidebarRef} style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100 }}>

      {/* Brand badge */}
      <div style={{
        margin: "10px 10px 4px",
        padding: "12px 14px",
        background: "linear-gradient(135deg,#EEF2FF,#E0E7FF)",
        borderRadius: 12,
        border: "1px solid rgba(99,102,241,.15)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: "linear-gradient(135deg,#6366F1,#818CF8)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <i className="bi bi-shield-fill-check" style={{ fontSize: 15, color: "#fff" }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#3730A3", lineHeight: 1.2 }}>Viralon Panel</div>
          <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 600, opacity: 0.8 }}>Payroll Management</div>
        </div>
      </div>

      <div style={{ height: 1, background: "#F1F5F9", margin: "8px 10px" }} />

      {/* User info chip */}
      {user && (
        <div style={{ margin: "0 10px 8px", padding: "10px 12px", background: "#F8FAFC",
          borderRadius: 10, border: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 2 }}>
            {user.name}
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>{user.role}</div>
        </div>
      )}

      <div className="menu">
        <ul className="list">

          {/* Home — always visible */}
          <li className={router.pathname === "/dashboard/admin-user/home" ? "active" : ""}>
            <Link href="/dashboard/admin-user/home" className="waves-effect waves-block flex items-center gap-2">
              <i className="bi bi-grid-fill" style={{
                fontSize: 16, width: 20, textAlign: "center", flexShrink: 0,
                color: router.pathname === "/dashboard/admin-user/home" ? "#818CF8" : "rgba(0,0,0,.45)",
              }} />
              <span>Dashboard</span>
            </Link>
          </li>

          {/* Permission-filtered modules */}
          {visibleItems.map(item => {
            const active = router.pathname === item.href;
            return (
              <li key={item.key} className={active ? "active" : ""}>
                <Link href={item.href} className="waves-effect waves-block flex items-center gap-2">
                  <i className={`bi ${item.icon}`} style={{
                    fontSize: 16, width: 20, textAlign: "center", flexShrink: 0,
                    color: active ? "#818CF8" : "rgba(0,0,0,.45)",
                  }} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}

          {visibleItems.length === 0 && (
            <li style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>
                No modules assigned yet
              </div>
            </li>
          )}

          {/* ── Community ── */}
          <li style={{ listStyle: "none" }} className={router.pathname === "/dashboard/admin/community" ? "active" : ""}>
            <Link href="/dashboard/admin/community" className="waves-effect waves-block"
              style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="bi bi-people-fill" style={{
                fontSize: 16, width: 20, textAlign: "center", flexShrink: 0,
                color: router.pathname === "/dashboard/admin/community" ? "#818CF8" : "rgba(0,0,0,.45)",
              }} />
              <span style={{ flex: 1 }}>Community</span>
              {communityUnread > 0 && (
                <span style={{ background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
                  {communityUnread > 99 ? "99+" : communityUnread}
                </span>
              )}
            </Link>
          </li>

          {/* ── Offers & Announcements ── */}
          <li style={{ listStyle: "none" }} className={router.pathname === "/dashboard/admin/offers" ? "active" : ""}>
            <Link href="/dashboard/admin/offers" className="waves-effect waves-block"
              style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="bi bi-megaphone-fill" style={{
                fontSize: 16, width: 20, textAlign: "center", flexShrink: 0,
                color: router.pathname === "/dashboard/admin/offers" ? "#818CF8" : "rgba(0,0,0,.45)",
              }} />
              <span style={{ flex: 1 }}>Offers</span>
            </Link>
          </li>

          {/* ── Task Management System (gated by permissions.tasks) ── */}
          {permissions.tasks && (
            <>
              <li style={{ listStyle: "none" }}>
                <div style={{ height: 1, background: "#E0E7FF", margin: "10px 10px 6px" }} />
              </li>

              <li className={router.pathname?.startsWith("/dashboard/admin/tasks") ? "active" : ""}>
                <a
                  href="javascript:void(0);"
                  onClick={(e) => { e.preventDefault(); setTmsOpen(o => !o); }}
                  className="menu-toggle waves-effect waves-block"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <i className="bi bi-kanban-fill" style={{
                    fontSize: 16, width: 20, textAlign: "center", flexShrink: 0,
                    color: router.pathname?.startsWith("/dashboard/admin/tasks") ? "#818CF8" : "rgba(0,0,0,.45)",
                  }} />
                  <span style={{ flex: 1 }}>Task Management</span>
                </a>

                <ul className="ml-menu" style={{ display: tmsOpen ? "block" : "none" }}>

                  <li style={{ padding: "6px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Workspace
                  </li>
                  <li className={router.pathname === "/dashboard/admin/tasks" ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks">
                      <i className="bi bi-grid-1x2-fill" style={{ marginRight: 6, fontSize: 12 }} />Dashboard
                    </Link>
                  </li>
                  <li className={router.pathname === "/dashboard/admin/tasks/list" ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/list">
                      <i className="bi bi-list-task" style={{ marginRight: 6, fontSize: 12 }} />Tasks
                    </Link>
                  </li>
                  <li className={router.pathname === "/dashboard/admin/tasks/calendar" ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/calendar">
                      <i className="bi bi-calendar3" style={{ marginRight: 6, fontSize: 12 }} />Content Calendar
                    </Link>
                  </li>
                  <li className={router.pathname?.startsWith("/dashboard/admin/tasks/brands") ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/brands">
                      <i className="bi bi-bookmark-star-fill" style={{ marginRight: 6, fontSize: 12 }} />Brands
                    </Link>
                  </li>

                  <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                    Social Media
                  </li>
                  <li className={router.pathname === "/dashboard/admin/tasks/pipeline" ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/pipeline">
                      <i className="bi bi-funnel-fill" style={{ marginRight: 6, fontSize: 12 }} />Pipeline Stages
                    </Link>
                  </li>
                  <li className={router.pathname === "/dashboard/admin/tasks/weekly" ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/weekly">
                      <i className="bi bi-clock-history" style={{ marginRight: 6, fontSize: 12 }} />Weekly Tracker
                    </Link>
                  </li>

                  <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                    Web &amp; Dev
                  </li>
                  <li className={router.pathname?.startsWith("/dashboard/admin/tasks/projects") ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/projects">
                      <i className="bi bi-layers-fill" style={{ marginRight: 6, fontSize: 12 }} />Web Projects
                    </Link>
                  </li>

                  <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                    SEO
                  </li>
                  <li className={router.pathname?.startsWith("/dashboard/admin/tasks/seo") ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/seo">
                      <i className="bi bi-search" style={{ marginRight: 6, fontSize: 12 }} />SEO Hub
                    </Link>
                  </li>

                  <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                    Performance
                  </li>
                  <li className={router.pathname?.startsWith("/dashboard/admin/tasks/ads") ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/ads">
                      <i className="bi bi-megaphone-fill" style={{ marginRight: 6, fontSize: 12 }} />Ad Campaigns
                    </Link>
                  </li>

                  <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                    Creative
                  </li>

                  <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                    Team &amp; Admin
                  </li>
                  <li className={router.pathname === "/dashboard/admin/tasks/my-team" ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/my-team">
                      <i className="bi bi-people-fill" style={{ marginRight: 6, fontSize: 12 }} />Today · My Team
                    </Link>
                  </li>
                  <li className={router.pathname === "/dashboard/admin/tasks/approvals" ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/approvals" style={{ display: "flex", alignItems: "center" }}>
                      <i className="bi bi-check2-square" style={{ marginRight: 6, fontSize: 12 }} />
                      Approvals
                      {pendingApprovalsCount > 0 && (
                        <span style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "1px 6px", lineHeight: 1.4 }}>
                          {pendingApprovalsCount}
                        </span>
                      )}
                    </Link>
                  </li>
                  <li className={router.pathname === "/dashboard/admin/tasks/team-performance" ? "active" : ""}>
                    <Link href="/dashboard/admin/tasks/team-performance">
                      <i className="bi bi-bar-chart-fill" style={{ marginRight: 6, fontSize: 12 }} />Team Performance
                    </Link>
                  </li>

                </ul>
              </li>
            </>
          )}

        </ul>
      </div>
    </aside>
  );
}
