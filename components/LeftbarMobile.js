"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function LeftbarMobile({ role = "admin" }) {
  const router = useRouter();
  const isAdmin = role === "admin";
  const { data: session } = useSession();

  const [profile, setProfile] = useState({
    name: "",
    avatarUrl: "/asets/images/avatar.png",
  });

  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (key) => setOpenMenu(openMenu === key ? null : key);

  const handleLogout = async () => {
    const res = await fetch("/api/admin/logout", { method: "GET" });
    if (res.ok) router.push("/dashboard/login");
  };

  const menu = [
    { type: "link", href: "/", label: "Home", icon: "zmdi-home", adminOnly: true },
    { type: "link", href: "/dashboard/payroll/add-new-employee", label: "Add Employee", icon: "zmdi-account-add", adminOnly: true },
    { type: "link", href: "/dashboard/payroll/employees", label: "Employee List", icon: "zmdi-accounts-list", adminOnly: true },
    { type: "link", href: "/dashboard/payroll/leave-and-attendance", label: "Leave & Attendance", icon: "zmdi-calendar-check", adminOnly: true },
    { type: "link", href: "/dashboard/hr/salary-report", label: "Salary Report", icon: "zmdi-money", adminOnly: true },
    { type: "link", href: "/dashboard/employees/activity", label: "Employee Activity Log", icon: "zmdi-time", adminOnly: true },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = await res.json();
        setProfile({
          name: data.name || "Salesperson",
          avatarUrl: data.avatarUrl || "/asets/images/avatar.png",
        });
      }
    };
    if (role === "salesperson") fetchProfile();
  }, [role]);

  return (
    <>
   

      {/* Offcanvas Sidebar */}
      <div
        className="offcanvas offcanvas-start mobile-offcanvas"
        tabIndex="-1"
        id="offcanvasLeft"
        aria-labelledby="offcanvasLeftLabel"
      >
        <div className="offcanvas-header">
          <Link className="navbar-brand" href="/"><img src="/assets/images/logo.png" width="70" alt="Viralon"/></Link>
          <button
            type="button"
            className="btn-close text-reset"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>

        <div className="offcanvas-body p-0">
          {/* User Info */}
          <div className="p-3 border-bottom d-flex align-items-center">
            {role === "salesperson" ? (
              <Link href="/dashboard/salesperson/profile" className="d-flex align-items-center text-decoration-none">
                <img
                  src={profile.avatarUrl}
                  alt="User"
                  className="rounded-circle me-2"
                  width={48}
                  height={48}
                />
                <strong className="text-dark">{profile.name}</strong>
              </Link>
            ) : (
              <div className="d-flex align-items-center">
                <img
                  src="/asets/images/avatar.png"
                  alt="Admin"
                  className="rounded-circle me-2"
                  width={48}
                  height={48}
                />
                <strong className="text-dark">Admin</strong>
              </div>
            )}
          </div>

          {/* Menu List */}
          <ul className="list-unstyled m-0 p-2">
            {role === "salesperson" && (
              <li>
                <Link href="/dashboard/salesperson/" className="d-flex align-items-center p-2 rounded text-decoration-none text-dark hover-bg-light">
                  <i className="zmdi zmdi-home me-2"></i> Home
                </Link>
              </li>
            )}

            {menu
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="d-flex align-items-center p-2 rounded text-decoration-none text-dark hover-bg-light"
                  >
                    <i className={`zmdi ${item.icon} me-2`} />
                    {item.label}
                  </Link>
                </li>
              ))}

            {/* Logout */}
            <li className="mt-2">
              <button
                onClick={handleLogout}
                className="btn btn-outline-danger w-100 text-start d-flex align-items-center log-out-btn"
              >
                <i className="zmdi zmdi-power me-2"></i> Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
