// components/AdminUserLeftbar.js — sidebar for invited admin users (permission-filtered)
import Link from "next/link";
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

  const visibleItems = ALL_MODULES.filter(m => permissions[m.key]);

  return (
    <aside id="leftsidebar" className="sidebar mobile-none" style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100 }}>

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

        </ul>
      </div>
    </aside>
  );
}
