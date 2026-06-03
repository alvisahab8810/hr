// "use client"; // if you’re using the App Router

// import Link from "next/link";
// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";

// import { useSession } from "next-auth/react";

// export default function Leftbar({ role = "admin" }) {
//   const router = useRouter();
//   const isAdmin = role === "admin";

//   /* ------------- handle logout (unchanged) ------------- */
//   const handleLogout = async () => {
//     const res = await fetch("/api/admin/logout", { method: "GET" });
//     if (res.ok) router.push("/dashboard/login");
//   };

//   /* ------------- collapsible menu state ------------- */
//   const [openMenu, setOpenMenu] = useState(null);
//   const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);

//   /* ------------- MENU DEFINITION ------------- */
//   //  adminOnly: true  => hide from salespersons
//   const menu = [
//     {
//       type: "link",
//       href: "/",
//       label: "Home",
//       icon: "zmdi-home ",
//       adminOnly: true,
//     },
//     {
//       type: "link",
//       href: "/dashboard/payroll/add-new-employee",
//       label: "Add Employee",
//       icon: "zmdi-account-add ",
//       adminOnly: true,
//     },
//     {
//       type: "link",
//       href: "/dashboard/payroll/employees",
//       label: "Employee List",
//       icon: "zmdi-accounts-list ",
//       adminOnly: true,
//     },
//     {
//       type: "link",
//       href: "/dashboard/payroll/leave-and-attendance",
//       label: "Leave & Attendance",
//       icon: "zmdi-calendar-check ",
//       adminOnly: true,
//     },

//     {
//       type: "link",
//       href: "/dashboard/hr/salary-report",
//       label: "Salary Report",
//       icon: "zmdi-money ",
//       adminOnly: true,
//     },

//     {
//       type: "link",
//       href: "/dashboard/employees/activity", // static page
//       label: "Employee Activity Log",
//       icon: "zmdi-time ",
//       adminOnly: true,
//     },

//      {
//       type: "link",
//       href: "/dashboard/hr/announcement", // static page
//       label: "Announcement",
//       icon: "zmdi-time ",
//       adminOnly: true,
//     },

//   ];

//   /* ------------- RENDER ------------- */

//   const { data: session } = useSession();

//   const [profile, setProfile] = useState({
//     name: "",
//     avatarUrl: "/asets/images/avatar.png",
//   });

//   useEffect(() => {
//     const fetchProfile = async () => {
//       const res = await fetch("/api/user/me");
//       if (res.ok) {
//         const data = await res.json();
//         setProfile({
//           name: data.name || "Salesperson",
//           avatarUrl: data.avatarUrl || "/asets/images/avatar.png",
//         });
//       }
//     };

//     if (role === "salesperson") {
//       fetchProfile();
//     }
//   }, [role]);

//   return (
//     <aside id="leftsidebar" className="sidebar mobile-none">
//       {/* user-info block (unchanged) */}

//       <div className="menu">
//         <ul className="list">
//           <li>
//             <div className="user-info">
//               {role === "salesperson" && (
//                 <Link href="/dashboard/salesperson/profile">
//                   <div className="image">
//                     <img
//                       src={profile.avatarUrl || "/asets/images/avatar.png"}
//                       alt="User"
//                       className="rounded-circle"
//                       width={48}
//                       height={48}
//                     />
//                   </div>

//                   <div className="detail">
//                     <h4>{profile.name}</h4>
//                   </div>
//                 </Link>
//               )}
//             </div>
//           </li>

//           {role === "salesperson" && (
//             <li>
//               <Link
//                 href="/dashboard/salesperson/"
//                 className="waves-effect waves-block"
//               >
//                 <i className="zmdi zmdi-home"></i>
//                 <span>Home</span>
//               </Link>
//             </li>
//           )}

//           {menu
//             .filter((item) => !item.adminOnly || isAdmin)
//             .map((item) => {
//               if (item.type === "header") {
//                 return (
//                   <li key={item.label} className="header">
//                     {item.label}
//                   </li>
//                 );
//               }

//               if (item.type === "link") {
//                 return (
//                   <li key={item.href}>
//                     <Link href={item.href} className="waves-effect waves-block">
//                       <i className={`zmdi ${item.icon}`} />
//                       <span>{item.label}</span>
//                     </Link>
//                   </li>
//                 );
//               }

//               if (item.type === "parent") {
//                 const expanded = openMenu === item.key;
//                 return (
//                   <li key={item.key}>
//                     <div
//                       onClick={() => toggleMenu(item.key)}
//                       className="menu-toggle cursor-pointer flex items-center gap-2 p-2 hover:bg-gray-100 waves-effect waves-block"
//                     >
//                       <i className={`zmdi ${item.icon}`} />
//                       <span>{item.label}</span>
//                     </div>

//                     <ul
//                       className={`ml-menu overflow-hidden transition-all duration-300 ease-in-out ${
//                         expanded ? "max-h-40" : "max-h-0"
//                       }`}
//                       style={{ maxHeight: expanded ? "200px" : "0px" }}
//                     >
//                       {item.children
//                         .filter((c) => !c.adminOnly || isAdmin)
//                         .map((c) => (
//                           <li key={c.href}>
//                             <Link
//                               href={c.href}
//                               className="waves-effect waves-block"
//                             >
//                               {c.label}
//                             </Link>
//                           </li>
//                         ))}
//                     </ul>
//                   </li>
//                 );
//               }
//             })}
//         </ul>
//       </div>
//     </aside>
//   );
// }

// "use client";

// import Link from "next/link";
// import { useState, useEffect } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import { useSession } from "next-auth/react";

// export default function Leftbar({ role = "admin" }) {
//   const router = useRouter();
//   const pathname = usePathname(); // ✅ get current route
//   const isAdmin = role === "admin";

//   /* ------------- handle logout (unchanged) ------------- */
//   const handleLogout = async () => {
//     const res = await fetch("/api/admin/logout", { method: "GET" });
//     if (res.ok) router.push("/dashboard/login");
//   };

//   const [openMenu, setOpenMenu] = useState(null);
//   const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);

//   /* ------------- MENU DEFINITION ------------- */
//   const menu = [
//     { type: "link", href: "/", label: "Home", icon: "zmdi-home ", adminOnly: true },
//     { type: "link", href: "/dashboard/payroll/add-new-employee", label: "Add Employee", icon: "zmdi-account-add ", adminOnly: true },
//     { type: "link", href: "/dashboard/payroll/employees", label: "Employee List", icon: "zmdi-accounts-list ", adminOnly: true },
//     { type: "link", href: "/dashboard/payroll/leave-and-attendance", label: "Leave & Attendance", icon: "zmdi-calendar-check ", adminOnly: true },
//     { type: "link", href: "/dashboard/hr/salary-report", label: "Salary Report", icon: "zmdi-money ", adminOnly: true },
//     { type: "link", href: "/dashboard/employees/activity", label: "Employee Activity Log", icon: "zmdi-time ", adminOnly: true },
//     { type: "link", href: "/dashboard/hr/announcement", label: "Announcement", icon: "zmdi-time ", adminOnly: true },
//   ];

//   const { data: session } = useSession();

//   const [profile, setProfile] = useState({
//     name: "",
//     avatarUrl: "/asets/images/avatar.png",
//   });

//   useEffect(() => {
//     const fetchProfile = async () => {
//       const res = await fetch("/api/user/me");
//       if (res.ok) {
//         const data = await res.json();
//         setProfile({
//           name: data.name || "Salesperson",
//           avatarUrl: data.avatarUrl || "/asets/images/avatar.png",
//         });
//       }
//     };

//     if (role === "salesperson") {
//       fetchProfile();
//     }
//   }, [role]);

//   return (
//     <aside id="leftsidebar" className="sidebar mobile-none">
//       <div className="menu">
//         <ul className="list">
//           {/* Salesperson Profile */}
//           <li>
//             <div className="user-info">
//               {role === "salesperson" && (
//                 <Link href="/dashboard/salesperson/profile">
//                   <div className="image">
//                     <img
//                       src={profile.avatarUrl || "/asets/images/avatar.png"}
//                       alt="User"
//                       className="rounded-circle"
//                       width={48}
//                       height={48}
//                     />
//                   </div>
//                   <div className="detail">
//                     <h4>{profile.name}</h4>
//                   </div>
//                 </Link>
//               )}
//             </div>
//           </li>

//           {/* Salesperson Home */}
//           {role === "salesperson" && (
//             <li className={pathname === "/dashboard/salesperson/" ? "active" : ""}>
//               <Link href="/dashboard/salesperson/" className="waves-effect waves-block">
//                 <i className="zmdi zmdi-home"></i>
//                 <span>Home</span>
//               </Link>
//             </li>
//           )}

//           {/* Main Menu */}
//           {menu
//             .filter((item) => !item.adminOnly || isAdmin)
//             .map((item) => {
//               if (item.type === "link") {
//                 return (
//                   <li key={item.href} className={pathname === item.href ? "active" : ""}>
//                     <Link href={item.href} className="waves-effect waves-block">
//                       <i className={`zmdi ${item.icon}`} />
//                       <span>{item.label}</span>
//                     </Link>
//                   </li>
//                 );
//               }

//               if (item.type === "parent") {
//                 const expanded = openMenu === item.key;
//                 return (
//                   <li key={item.key} className={expanded ? "active" : ""}>
//                     <div
//                       onClick={() => toggleMenu(item.key)}
//                       className="menu-toggle cursor-pointer flex items-center gap-2 p-2 hover:bg-gray-100 waves-effect waves-block"
//                     >
//                       <i className={`zmdi ${item.icon}`} />
//                       <span>{item.label}</span>
//                     </div>

//                     <ul
//                       className={`ml-menu overflow-hidden transition-all duration-300 ease-in-out ${
//                         expanded ? "max-h-40" : "max-h-0"
//                       }`}
//                       style={{ maxHeight: expanded ? "200px" : "0px" }}
//                     >
//                       {item.children
//                         .filter((c) => !c.adminOnly || isAdmin)
//                         .map((c) => (
//                           <li key={c.href} className={pathname === c.href ? "active" : ""}>
//                             <Link href={c.href} className="waves-effect waves-block">
//                               {c.label}
//                             </Link>
//                           </li>
//                         ))}
//                     </ul>
//                   </li>
//                 );
//               }
//             })}
//         </ul>
//       </div>
//     </aside>
//   );
// }





"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Leftbar({ role = "admin" }) {
  const router = useRouter();
  const pathname = usePathname(); // ✅ get current route
  const isAdmin = role === "admin";

  /* ------------- handle logout ------------- */
  const handleLogout = async () => {
    const res = await fetch("/api/admin/logout", { method: "GET" });
    if (res.ok) router.push("/dashboard/login");
  };

  // Initialise openMenu from current URL so first render already has TMS open —
  // avoids a state-update/re-render race with scroll restoration.
  const [openMenu, setOpenMenu] = useState(() => {
    if (typeof window === "undefined") return null;
    const p = window.location.pathname;
    if (p.startsWith("/dashboard/admin/tasks") || p.startsWith("/dashboard/admin/task-requests")) {
      return "tms";
    }
    return null;
  });
  const [communityUnread,      setCommunityUnread]      = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  // ref points to the <aside> which is the real scroll container (CSS: overflow-y:scroll)
  const sidebarRef = useRef(null);

  // Persist scroll position to sessionStorage on every scroll
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const onScroll = () => sessionStorage.setItem("adminSidebarScroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // On every navigation: keep TMS open and restore saved scroll position
  useEffect(() => {
    if (
      pathname?.startsWith("/dashboard/admin/tasks") ||
      pathname?.startsWith("/dashboard/admin/task-requests")
    ) {
      setOpenMenu(prev => (prev === "tms" ? prev : "tms"));
    }

    const saved = sessionStorage.getItem("adminSidebarScroll");
    if (!saved) return;
    const target = parseInt(saved, 10);
    // Single RAF is enough — menu is already open from initial state, no layout shift pending
    requestAnimationFrame(() => {
      if (sidebarRef.current) sidebarRef.current.scrollTop = target;
    });
  }, [pathname]);

  // Freeze sidebar scroll position while toggling submenus
  const toggleMenu = (m) => {
    const el = sidebarRef.current;
    const scrollTop = el ? el.scrollTop : 0;
    setOpenMenu(prev => prev === m ? null : m);
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

  /* ------------- MENU DEFINITION (all custom icons) ------------- */
  const menu = [
    { type: "link", href: "/", label: "Home", icon: "home" },
    {
      type: "link",
      href: "/dashboard/admin/employee-management",
      label: "Employee management",
      icon: "menu-user",

       match: [
        "/dashboard/admin/employee-management",
        "/dashboard/admin/add-employee",
      ],
    },
    // { type: "link", href: "/dashboard/payroll/employees", label: "Employee List", icon: "employee-list" },
    {
      type: "link",
      href: "/dashboard/admin/attendance-summary",
      label: "Attendance Summary",
      icon: "attendance",
    },
    {
      type: "link",
      href: "/dashboard/admin/leaves-management",
      label: "leaves Management",
      icon: "leaves-management",
    },

    {
      type: "link",
      href: "/dashboard/admin/salary-report",
      label: "Salary Report",
      icon: "salary",
    },
    // {
    //   type: "link",
    //   href: "/dashboard/employees/activity",
    //   label: "Employee Activity Log",
    //   icon: "activity",
    // },
    // {
    //   type: "link",
    //   href: "/dashboard/hr/reports",
    //   label: "Reports",
    //   icon: "reports",
    // },
    {
      type: "link",
      href: "/dashboard/admin/reimbursement",
      label: "Reimbursement",
      icon: "reimbursement",
    },



       {
      type: "link",
      href: "/dashboard/admin/overtime",
      label: "Overtime",
      icon: "overtime",
    },

    {
      type: "link",
      href: "/dashboard/admin/deduction-waiver",
      label: "Deduction Waivers",
      icon: "overtime",
      biIcon: "bi-shield-check",
    },

    // { type: "link", href: "/dashboard/hr/announcement", label: "Announcement", icon: "announcement" },

    // ✅ Section heading
    // { type: "heading", label: "Task Management" },

    // ✅ Links under Task Management
    {
      type: "link",
      href: "/dashboard/admin/holidays",
      label: "Holiday Management",
      icon: "all-task",
    },
    {
      type: "link",
      href: "/dashboard/admin/former-employees",
      label: "Former Employees",
      icon: "overtime",
      biIcon: "bi-person-dash-fill",
    },
    {
      type: "link",
      href: "/dashboard/admin/assets",
      label: "Asset Management",
      icon: "overtime",
      biIcon: "bi-box-seam-fill",
    },
    {
      type: "link",
      href: "/dashboard/admin/users",
      label: "User Management",
      icon: "overtime",
      biIcon: "bi-people-fill",
    },
    {
      type: "link",
      href: "/dashboard/admin/clients",
      label: "Clients",
      icon: "overtime",
      biIcon: "bi-building",
      match: ["/dashboard/admin/clients"],
    },
  ];

  const { data: session } = useSession();

  const [profile, setProfile] = useState({
    name: "",
    avatarUrl: "/asets/images/avatar.png",
  });

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

    if (role === "salesperson") {
      fetchProfile();
    }
  }, [role]);

  /* -------- helper: return correct icon path -------- */
  const getIconPath = (iconName, isActive) => {
    return isActive
      ? `/icons/${iconName}-active.svg`
      : `/icons/${iconName}.svg`;
  };

  return (
    <div className="left-panel-area">

      <aside id="leftsidebar" className="sidebar mobile-none" ref={sidebarRef}>

        {/* ── Admin brand badge ── */}
        <div style={{
          margin: "20px 10px 4px",
          padding: "12px 14px",
          background: "linear-gradient(135deg,#EEF2FF,#E0E7FF)",
          borderRadius: 12,
          border: "1px solid rgba(99,102,241,.15)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg,#6366F1,#818CF8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <i className="bi bi-shield-fill-check" style={{ fontSize: 15, color: "#fff" }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#3730A3", lineHeight: 1.2 }}>Admin Panel</div>
            <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 600, opacity: 0.8 }}>Payroll Management</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#F1F5F9", margin: "8px 10px" }} />

      <div className="menu">
        <ul className="list">


          {/* Salesperson Home (optional, still uses zmdi if you want) */}
          {role === "salesperson" && (
            <li
              className={pathname === "/dashboard/salesperson/" ? "active" : ""}
            >
              <Link
                href="/dashboard/salesperson/"
                className="waves-effect waves-block"
              >
                <i className="zmdi zmdi-home"></i>
                <span>Home</span>
              </Link>
            </li>
          )}

          {/* Main Menu */}
          {menu
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              if (item.type === "heading") {
                return (
                  <li
                    key={item.label}
                    className="menu-heading mt-4 mb-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide"
                  >
                    {item.label}
                  </li>
                );
              }
  //             const active = item.match
  // ? item.match.some((path) => pathname.startsWith(path))
  // : pathname === item.href;


  const active = item.match
  ? item.match.some(
      (path) => pathname && pathname.startsWith(path)
    )
  : pathname === item.href;


              
              return (
                <li key={item.href} className={active ? "active" : ""}>
                  <Link
                    href={item.href}
                    className="waves-effect waves-block flex items-center gap-2"
                  >
                    {item.biIcon ? (
                      <i className={`bi ${item.biIcon}`} style={{
                        fontSize: 17,
                        color: active ? "#818CF8" : "rgba(0,0,0,0.5)",
                        width: 20, textAlign: "center", flexShrink: 0,
                      }} />
                    ) : (
                      <img
                        src={getIconPath(item.icon, active)}
                        alt={item.label}
                        className="w-5 h-5"
                      />
                    )}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}

          {/* ── Divider before TMS ── */}
          <li style={{ listStyle: "none" }}>
            <div style={{ height: 1, background: "#E0E7FF", margin: "10px 10px 6px" }} />
          </li>

          {/* ── Community ── */}
          <li style={{ listStyle: "none" }} className={pathname === "/dashboard/admin/community" ? "active" : ""}>
            <a
              href="/dashboard/admin/community"
              className="waves-effect waves-block"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", textDecoration: "none" }}
            >
              <i className="bi bi-people-fill" style={{
                fontSize: 17, width: 20, textAlign: "center", flexShrink: 0,
                color: pathname === "/dashboard/admin/community" ? "#818CF8" : "rgba(0,0,0,0.5)",
              }} />
              <span style={{ flex: 1 }}>Community</span>
              {communityUnread > 0 && (
                <span style={{ background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
                  {communityUnread > 99 ? "99+" : communityUnread}
                </span>
              )}
            </a>
          </li>

          {/* ── Task Management System ── */}
          <li id="task-management-area" className={pathname?.startsWith("/dashboard/admin/tasks") || pathname?.startsWith("/dashboard/admin/task-requests") ? "active" : ""}>
            <a
              href="javascript:void(0);"
              onClick={(e) => { e.preventDefault(); toggleMenu("tms"); }}
              className="menu-toggle waves-effect waves-block"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <i className="bi bi-kanban-fill" style={{
                fontSize: 17, width: 20, textAlign: "center", flexShrink: 0,
                color: pathname?.startsWith("/dashboard/admin/tasks") ? "#818CF8" : "rgba(0,0,0,0.5)",
              }} />
              <span style={{ flex: 1 }}>Task Management</span>
            </a>

            <ul className="ml-menu" style={{ display: openMenu === "tms" ? "block" : "none" }}>

              {/* WORKSPACE */}
              <li style={{ padding: "6px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Workspace
              </li>
              <li className={pathname === "/dashboard/admin/tasks" ? "active" : ""}>
                <Link href="/dashboard/admin/tasks">
                  <i className="bi bi-grid-1x2-fill" style={{ marginRight: 6, fontSize: 12 }} />Dashboard
                </Link>
              </li>
              <li className={pathname === "/dashboard/admin/tasks/list" ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/list">
                  <i className="bi bi-list-task" style={{ marginRight: 6, fontSize: 12 }} />Tasks
                </Link>
              </li>
              <li className={pathname === "/dashboard/admin/tasks/calendar" ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/calendar">
                  <i className="bi bi-calendar3" style={{ marginRight: 6, fontSize: 12 }} />Content Calendar
                </Link>
              </li>
              <li className={pathname?.startsWith("/dashboard/admin/tasks/brands") ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/brands">
                  <i className="bi bi-bookmark-star-fill" style={{ marginRight: 6, fontSize: 12 }} />Brands
                </Link>
              </li>

              {/* SOCIAL MEDIA */}
              <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                Social Media
              </li>
<li className={pathname === "/dashboard/admin/tasks/pipeline" ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/pipeline">
                  <i className="bi bi-funnel-fill" style={{ marginRight: 6, fontSize: 12 }} />Pipeline Stages
                </Link>
              </li>
              <li className={pathname === "/dashboard/admin/tasks/weekly" ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/weekly">
                  <i className="bi bi-clock-history" style={{ marginRight: 6, fontSize: 12 }} />Weekly Tracker
                </Link>
              </li>
              <li className={pathname === "/dashboard/admin/tasks/instagram" ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/instagram">
                  <i className="bi bi-instagram" style={{ marginRight: 6, fontSize: 12 }} />Instagram Connect
                </Link>
              </li>
              <li className={pathname === "/dashboard/admin/offers" ? "active" : ""}>
                <Link href="/dashboard/admin/offers">
                  <i className="bi bi-megaphone-fill" style={{ marginRight: 6, fontSize: 12 }} />Offers
                </Link>
              </li>

              {/* WEB & DEV */}
              <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                Web &amp; Dev
              </li>
              <li className={pathname?.startsWith("/dashboard/admin/tasks/projects") ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/projects">
                  <i className="bi bi-layers-fill" style={{ marginRight: 6, fontSize: 12 }} />Web Projects
                </Link>
              </li>

              {/* SEO */}
              <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                SEO
              </li>
              <li className={pathname?.startsWith("/dashboard/admin/tasks/seo") ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/seo">
                  <i className="bi bi-search" style={{ marginRight: 6, fontSize: 12 }} />SEO Hub
                </Link>
              </li>

              {/* PERFORMANCE */}
              <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                Performance
              </li>
              <li className={pathname?.startsWith("/dashboard/admin/tasks/ads") ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/ads">
                  <i className="bi bi-megaphone-fill" style={{ marginRight: 6, fontSize: 12 }} />Ad Campaigns
                </Link>
              </li>

              {/* CREATIVE */}
              <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                Creative
              </li>

              {/* CLIENT */}
              <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                Client
              </li>
              <li className={pathname?.startsWith("/dashboard/admin/task-requests") ? "active" : ""}>
                <Link href="/dashboard/admin/task-requests">
                  <i className="bi bi-inbox-fill" style={{ marginRight: 6, fontSize: 12 }} />Client Requests
                </Link>
              </li>

              {/* TEAM & ADMIN */}
              <li style={{ padding: "8px 16px 3px", fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", borderTop: "1px solid rgba(99,102,241,0.12)", marginTop: 4 }}>
                Team &amp; Admin
              </li>
              <li className={pathname === "/dashboard/admin/tasks/my-team" ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/my-team">
                  <i className="bi bi-people-fill" style={{ marginRight: 6, fontSize: 12 }} />Today · My Team
                </Link>
              </li>
              <li className={pathname === "/dashboard/admin/tasks/approvals" ? "active" : ""}>
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
              <li className={pathname === "/dashboard/admin/tasks/team-performance" ? "active" : ""}>
                <Link href="/dashboard/admin/tasks/team-performance">
                  <i className="bi bi-bar-chart-fill" style={{ marginRight: 6, fontSize: 12 }} />Team Performance
                </Link>
              </li>

            </ul>
          </li>

        </ul>
      </div>
       <div className="admin-profile-area">
        <Link href="#">
          <div className="profile-bx-area">
             
          </div>
        </Link>
      </div>
    </aside>

   
    </div>
  );
}
