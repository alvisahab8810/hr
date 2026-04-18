// pages/dashboard/admin-user/home.js
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Dashnav from "@/components/Dashnav";
import AdminUserLeftbar from "@/components/AdminUserLeftbar";

const PERM_LABELS = {
  dashboard:     { label: "Dashboard",     icon: "bi-grid-fill" },
  employees:     { label: "Employees",     icon: "bi-people-fill" },
  attendance:    { label: "Attendance",    icon: "bi-calendar-check-fill" },
  leaves:        { label: "Leaves",        icon: "bi-calendar-x-fill" },
  salaryReport:  { label: "Salary Report", icon: "bi-cash-stack" },
  reimbursement: { label: "Reimbursement", icon: "bi-receipt" },
  overtime:      { label: "Overtime",      icon: "bi-clock-fill" },
  deductions:    { label: "Deductions",    icon: "bi-shield-check" },
  holidays:      { label: "Holidays",      icon: "bi-star-fill" },
};

const ROLE_COLORS = {
  Manager:    { bg: "#EEF2FF", color: "#4338CA", dot: "#6366F1" },
  HR:         { bg: "#F0FDF4", color: "#15803D", dot: "#22C55E" },
  Accountant: { bg: "#FFF7ED", color: "#C2410C", dot: "#F97316" },
  Viewer:     { bg: "#F8FAFC", color: "#475569", dot: "#94A3B8" },
};

const PERM_NAV = {
  employees:     "/dashboard/admin/employee-management",
  attendance:    "/dashboard/admin/attendance-summary",
  leaves:        "/dashboard/admin/leaves-management",
  salaryReport:  "/dashboard/admin/salary-report",
  reimbursement: "/dashboard/admin/reimbursement",
  overtime:      "/dashboard/admin/overtime",
  deductions:    "/dashboard/admin/deduction-waiver",
  holidays:      "/dashboard/admin/holidays",
};

export default function AdminUserHome() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin-users/me", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (!data.success) { router.replace("/dashboard/admin-login"); return; }
        setUser(data.user);
      })
      .catch(() => router.replace("/dashboard/admin-login"))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin-users/logout", { method: "POST", credentials: "include" });
    router.push("/dashboard/admin-login");
  };

  const granted = user
    ? Object.entries(user.permissions || {}).filter(([, v]) => v).map(([k]) => k)
    : [];

  const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS.Viewer;
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#EEF2FF,#F5F3FF,#EDE9FE)" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner-border" style={{ color: "#6366F1", width: 40, height: 40 }} />
        <p style={{ marginTop: 16, color: "#6366F1", fontWeight: 600 }}>Loading your dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>{user?.name ? `${user.name} — Dashboard` : "Dashboard"} | Viralon Payroll</title>
        <style>{`
          * { box-sizing: border-box; }
          .au-stat-card { background:#fff; border-radius:16px; padding:20px 22px;
            box-shadow:0 2px 12px rgba(99,102,241,.08), 0 1px 0 #F1F5F9;
            border:1px solid #F1F5F9; }
          .au-perm-card { background:#fff; border-radius:14px; padding:20px 18px;
            box-shadow:0 2px 8px rgba(0,0,0,.05); border:1px solid #F1F5F9;
            transition:transform .15s, box-shadow .15s; cursor:pointer; }
          .au-perm-card:hover { transform:translateY(-2px);
            box-shadow:0 6px 20px rgba(99,102,241,.14); }
          .au-perm-card.locked { opacity:.45; cursor:not-allowed; }
          .au-perm-card.locked:hover { transform:none; box-shadow:0 2px 8px rgba(0,0,0,.05); }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <AdminUserLeftbar user={user} />
          <Dashnav />

          <section className="content home">
            <div className="container-fluid">

              {/* ── Welcome header ── */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Avatar */}
                    <div style={{ width: 56, height: 56, borderRadius: 16,
                      background: "linear-gradient(135deg,#6366F1,#818CF8)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, fontWeight: 800, color: "#fff",
                      boxShadow: "0 4px 14px rgba(99,102,241,.35)", flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div>
                      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>
                        Welcome back, {user?.name?.split(" ")[0]}!
                      </h1>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 13, color: "#6B7280" }}>{user?.email}</span>
                        <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: roleStyle.bg, color: roleStyle.color }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: roleStyle.dot,
                            display: "inline-block", marginRight: 5 }} />
                          {user?.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button onClick={handleLogout}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
                      background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
                      color: "#DC2626", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    <i className="bi bi-box-arrow-right" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* ── Stats row ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 16, marginBottom: 28 }}>
                {/* Role card */}
                <div className="au-stat-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10,
                      background: "linear-gradient(135deg,#EEF2FF,#E0E7FF)",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="bi bi-person-badge-fill" style={{ color: "#6366F1", fontSize: 16 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Your Role</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{user?.role}</div>
                </div>

                {/* Permissions count */}
                <div className="au-stat-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10,
                      background: "linear-gradient(135deg,#F0FDF4,#DCFCE7)",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="bi bi-check2-circle" style={{ color: "#22C55E", fontSize: 16 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Permissions</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                    {granted.length}
                    <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500, marginLeft: 4 }}>
                      / {Object.keys(PERM_LABELS).length}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="au-stat-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10,
                      background: "linear-gradient(135deg,#FFF7ED,#FFEDD5)",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="bi bi-shield-check-fill" style={{ color: "#F97316", fontSize: 16 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Account Status</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: user?.status === "Active" ? "#15803D" : "#DC2626" }}>
                    {user?.status}
                  </div>
                </div>
              </div>

              {/* ── Access Cards grid ── */}
              <div style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: "0 0 16px" }}>
                  Your Access Modules
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
                {Object.entries(PERM_LABELS).map(([key, { label, icon }]) => {
                  const hasAccess = granted.includes(key);
                  const href = PERM_NAV[key] || "#";

                  const card = (
                    <div key={key} className={`au-perm-card${hasAccess ? "" : " locked"}`}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                        marginBottom: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12,
                          background: hasAccess
                            ? "linear-gradient(135deg,#EEF2FF,#E0E7FF)"
                            : "#F9FAFB",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className={`bi ${icon}`} style={{
                            fontSize: 18,
                            color: hasAccess ? "#6366F1" : "#D1D5DB",
                          }} />
                        </div>
                        {hasAccess
                          ? <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                              background: "#DCFCE7", color: "#15803D" }}>
                              <i className="bi bi-check-lg" style={{ marginRight: 3 }} />Access
                            </span>
                          : <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                              background: "#F3F4F6", color: "#9CA3AF" }}>
                              <i className="bi bi-lock-fill" style={{ marginRight: 3 }} />Locked
                            </span>
                        }
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700,
                        color: hasAccess ? "#111827" : "#9CA3AF" }}>
                        {label}
                      </div>
                      {hasAccess && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#6366F1", fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 4 }}>
                          Open <i className="bi bi-arrow-right" />
                        </div>
                      )}
                    </div>
                  );

                  return hasAccess
                    ? <Link key={key} href={href} style={{ textDecoration: "none" }}>{card}</Link>
                    : <div key={key}>{card}</div>;
                })}
              </div>

              {/* ── Info notice ── */}
              {granted.length === 0 && (
                <div style={{ marginTop: 24, padding: "16px 20px", background: "#FFF7ED",
                  border: "1px solid #FED7AA", borderRadius: 14, display: "flex", gap: 12 }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ color: "#F97316", fontSize: 20, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: "#C2410C", fontSize: 14 }}>No permissions assigned</div>
                    <div style={{ fontSize: 13, color: "#92400E", marginTop: 2 }}>
                      Contact your admin to get access to modules.
                    </div>
                  </div>
                </div>
              )}

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
