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

    // { type: "link", href: "/dashboard/hr/announcement", label: "Announcement", icon: "announcement" },

    // ✅ Section heading
    { type: "heading", label: "Task Management" },

    // ✅ Links under Task Management
    {
      type: "link",
      href: "#",
      label: "Upcoming",
      icon: "all-task",
    },
    // {
    //   type: "link",
    //   href: "/dashboard/hr/teams",
    //   label: "Teams",
    //   icon: "teams",
    // },
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
      <div className="menu">
        <ul className="list">
          {/* Salesperson Profile */}
          {/* <li>
            <div className="user-info">
              {role === "salesperson" && (
                <Link href="/dashboard/salesperson/profile">
                  <div className="image">
                    <img
                      src={profile.avatarUrl || "/asets/images/avatar.png"}
                      alt="User"
                      className="rounded-circle"
                      width={48}
                      height={48}
                    />
                  </div>
                  <div className="detail">
                    <h4>{profile.name}</h4>
                  </div>
                </Link>
              )}
            </div>
          </li> */}

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
              // const active = pathname === item.href;
              const active = item.match
  ? item.match.some((path) => pathname.startsWith(path))
  : pathname === item.href;

              
              return (
                <li key={item.href} className={active ? "active" : ""}>
                  <Link
                    href={item.href}
                    className="waves-effect waves-block flex items-center gap-2"
                  >
                    {/* ✅ Use custom SVG icons for ALL */}
                    <img
                      src={getIconPath(item.icon, active)}
                      alt={item.label}
                      className="w-5 h-5"
                    />
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
