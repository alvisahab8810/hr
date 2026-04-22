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
import { useState, useEffect } from "react";
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

  const [openMenu, setOpenMenu] = useState(null);
  const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);

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

      <aside id="leftsidebar" className="sidebar mobile-none">

        {/* ── Admin brand badge ── */}
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
