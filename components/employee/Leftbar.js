

// "use client";

// import Link from "next/link";
// import { useState, useEffect } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import { useSession } from "next-auth/react";

// export default function Leftbar({ role = "admin" }) {
//   const router = useRouter();
//   const pathname = usePathname(); // ✅ get current route
//   const isAdmin = role === "admin";

//   /* ------------- handle logout ------------- */
//   const handleLogout = async () => {
//     const res = await fetch("/api/admin/logout", { method: "GET" });
//     if (res.ok) router.push("/dashboard/login");
//   };

//   const [openMenu, setOpenMenu] = useState(null);
//   const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);

//   /* ------------- MENU DEFINITION (all custom icons) ------------- */
//   const menu = [
//     { type: "link", href: "/employee/profile", label: "Home", icon: "home" },
  
//     {
//       type: "link",
//       href: "#",
//       label: "Attendance Summary",
//       icon: "attendance",
//     },
//     {
//       type: "link",
//       href: "#",
//       label: "leaves Management",
//       icon: "leaves-management",
//     },

//     {
//       type: "link",
//       href: "#",
//       label: "Salary Report",
//       icon: "salary",
//     },
   
//     {
//       type: "link",
//       href: "#",
//       label: "Reports",
//       icon: "reports",
//     },
//     {
//       type: "link",
//       href: "#",
//       label: "Reimbursement",
//       icon: "reimbursement",
//     },


//     // ✅ Section heading
//     { type: "heading", label: "Task Management" },

//     // ✅ Links under Task Management
//     {
//       type: "link",
//       href: "/dashboard/hr/all-task",
//       label: "All Task",
//       icon: "all-task",
//     },
    
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

//   /* -------- helper: return correct icon path -------- */
//   const getIconPath = (iconName, isActive) => {
//     return isActive
//       ? `/icons/${iconName}-active.svg`
//       : `/icons/${iconName}.svg`;
//   };

//   return (
//     <div className="left-panel-area">

//       <aside id="leftsidebar" className="sidebar mobile-none">
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

//           {/* Salesperson Home (optional, still uses zmdi if you want) */}
//           {role === "salesperson" && (
//             <li
//               className={pathname === "/dashboard/salesperson/" ? "active" : ""}
//             >
//               <Link
//                 href="/dashboard/salesperson/"
//                 className="waves-effect waves-block"
//               >
//                 <i className="zmdi zmdi-home"></i>
//                 <span>Home</span>
//               </Link>
//             </li>
//           )}

//           {/* Main Menu */}
//           {menu
//             .filter((item) => !item.adminOnly || isAdmin)
//             .map((item) => {
//               if (item.type === "heading") {
//                 return (
//                   <li
//                     key={item.label}
//                     className="menu-heading mt-4 mb-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide"
//                   >
//                     {item.label}
//                   </li>
//                 );
//               }
//               const active = pathname === item.href;
//               return (
//                 <li key={item.href} className={active ? "active" : ""}>
//                   <Link
//                     href={item.href}
//                     className="waves-effect waves-block flex items-center gap-2"
//                   >
//                     {/* ✅ Use custom SVG icons for ALL */}
//                     <img
//                       src={getIconPath(item.icon, active)}
//                       alt={item.label}
//                       className="w-5 h-5"
//                     />
//                     <span>{item.label}</span>
//                   </Link>
//                 </li>
//               );
//             })}
//         </ul>
//       </div>
//        <div className="admin-profile-area">
//         <Link href="#">
//           <div className="profile-bx-area">
             
//           </div>
//         </Link>
//       </div>
//     </aside>

   
//     </div>
//   );
// }




// "use client";

// import Link from "next/link";
// import { useState, useEffect } from "react";
// import { useRouter, usePathname } from "next/navigation";

// export default function EmployeeLeftbar() {
//   const router = useRouter();
//   const pathname = usePathname();

//   const [employee, setEmployee] = useState({
//     firstName: "",
//     avatar: "/asets/images/avatar.png",
//   });

//   // fetch employee profile
//   useEffect(() => {
//     const fetchEmployee = async () => {
//       try {
//         const token = localStorage.getItem("employeeToken");
//         if (!token) return;

//         const res = await fetch("/api/employee/me", {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (res.ok) {
//           const data = await res.json();
//           if (data.success) {
//             setEmployee({
//               firstName: data.employee.firstName || "Employee",
//               avatar: data.employee.personal?.avatar || "/asets/images/avatar.png",
//             });
//           }
//         }
//       } catch (err) {
//         console.error("Failed to fetch employee profile", err);
//       }
//     };

//     fetchEmployee();
//   }, []);

//   // logout
//   const handleLogout = async () => {
//     localStorage.removeItem("employeeToken");
//     router.push("/employee/login");
//   };

//   // menu for employees
//   const menu = [
//     { href: "/employee/profile", label: "Home", icon: "home" },
//     { href: "/employee/attendance", label: "Attendance Summary", icon: "attendance" },
//     { href: "/employee/leaves", label: "Leaves Management", icon: "leaves-management" },
//     { href: "/employee/salary", label: "Salary Report", icon: "salary" },
//     { href: "/employee/reports", label: "Reports", icon: "reports" },
//     { href: "/employee/reimbursement", label: "Reimbursement", icon: "reimbursement" },

//     { type: "heading", label: "Task Management" },
//     { href: "/employee/tasks", label: "All Task", icon: "all-task" },
//   ];

//   const getIconPath = (icon, active) =>
//     active ? `/icons/${icon}-active.svg` : `/icons/${icon}.svg`;

//   return (
//     <div className="left-panel-area">
//       <aside id="leftsidebar" className="sidebar mobile-none">
//         <div className="menu">
//           <ul className="list">
//             {/* profile */}
//             <li>
//               <div className="user-info d-flex align-items-center gap-2 p-3">
//                 <img
//                   src={employee.avatar}
//                   alt="Employee Avatar"
//                   className="rounded-circle"
//                   width={48}
//                   height={48}
//                 />
//                 <div className="detail">
//                   <h4 className="mb-0 text-white">
//                     {employee.firstName || "Employee"}
//                   </h4>
//                 </div>
//               </div>
//             </li>

//             {/* menu items */}
//             {menu.map((item) => {
//               if (item.type === "heading") {
//                 return (
//                   <li
//                     key={item.label}
//                     className="menu-heading mt-4 mb-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wide"
//                   >
//                     {item.label}
//                   </li>
//                 );
//               }
//               const active = pathname === item.href;
//               return (
//                 <li key={item.href} className={active ? "active" : ""}>
//                   <Link
//                     href={item.href}
//                     className="waves-effect waves-block flex items-center gap-2 px-3 py-2"
//                   >
//                     <img
//                       src={getIconPath(item.icon, active)}
//                       alt={item.label}
//                       className="w-5 h-5"
//                     />
//                     <span>{item.label}</span>
//                   </Link>
//                 </li>
//               );
//             })}

//             {/* logout */}
//             <li className="mt-4 px-3">
//               <button
//                 onClick={handleLogout}
//                 className="btn btn-sm btn-outline-light w-100"
//               >
//                 Logout
//               </button>
//             </li>
//           </ul>
//         </div>
//       </aside>
//     </div>
//   );
// }








"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function EmployeeLeftbar() {
  const router = useRouter();
  const pathname = usePathname();

    const [employee, setEmployee] = useState({
    firstName: "",
    avatar: "/asets/images/avatar.png",
  });

useEffect(() => {
  const fetchEmployee = async () => {
    try {
      const res = await fetch("/api/employee/me", {
        credentials: "include", // send cookie automatically
      });

      const data = await res.json();
      if (data.success && data.employee) {
        setEmployee({
          firstName: data.employee.firstName || "Employee",
          avatar: data.employee.avatar || "/asets/images/avatar.png",
        });
      } else {
        console.warn("⚠️ Failed to fetch employee profile:", data.message);
      }
    } catch (err) {
      console.error("Failed to fetch employee profile", err);
    }
  };

  fetchEmployee();
}, []);


  // logout
  const handleLogout = async () => {
    // optional: call logout API to clear cookie on server
    await fetch("/api/employee/logout", { method: "POST", credentials: "include" });

    router.push("/employee/login");
  };




  // menu for employees
  const menu = [
    { href: "/employee/dashboard", label: "Home", icon: "home" },
    { href: "/employee/attendance-summary", label: "Attendance Summary", icon: "attendance" },
    { href: "/employee/leaves-management", label: "Leaves Management", icon: "leaves-management" },
    // { href: "/employee/reports", label: "Reports", icon: "reports" },s
    { href: "/employee/reimbursement", label: "Reimbursement", icon: "reimbursement" },
    { href: "/employee/salary", label: "Salary Report", icon: "salary" },


    // { type: "heading", label: "Task Management" },
    // { href: "/employee/tasks", label: "All Task", icon: "all-task" },
  ];

  const getIconPath = (icon, active) =>
    active ? `/icons/${icon}-active.svg` : `/icons/${icon}.svg`;











  
  return (
    <div className="left-panel-area">
      <aside id="leftsidebar" className="sidebar mobile-none">
        <div className="menu">
          <ul className="list mt-3">
         
         

            {/* menu items */}
            {menu.map((item) => {
              if (item.type === "heading") {
                return (
                  <li
                    key={item.label}
                    className="menu-heading mt-4 mb-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wide"
                  >
                    {item.label}
                  </li>
                );
              }
              const active = pathname === item.href;
              return (
                <li key={item.href} className={active ? "active" : ""}>
                  <Link
                    href={item.href}
                    className="waves-effect waves-block flex items-center gap-2 px-3 py-2"
                  >
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

            {/* logout */}
            <li className="mt-4 px-3">
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-outline-light w-100"
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
