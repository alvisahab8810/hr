// components/employee/Leftbar.js
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function EmployeeLeftbar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [employee, setEmployee] = useState({
    firstName: "", lastName: "", employeeId: "", dept: "", completion: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    fetch("/api/employee/me", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.employee) {
          const emp = d.employee;
          const checks = [
            emp?.personal?.mobile, emp?.personal?.email, emp?.personal?.dob,
            emp?.personal?.address, emp?.personal?.city, emp?.personal?.state,
            emp?.salary?.bankName, emp?.salary?.accountNumber,
            emp?.documents?.appointmentLetter,
          ];
          const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
          setEmployee({
            firstName:  emp.firstName  || "Employee",
            lastName:   emp.lastName   || "",
            employeeId: emp.employeeId || "",
            dept:       emp.professional?.department || "",
            completion: pct,
          });
        }
      })
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/employee/logout", { method: "POST", credentials: "include" });
    router.push("/employee/login");
  };

  const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase() || "?";

  const BI_ICONS = {
    "home":              "bi-house-fill",
    "attendance":        "bi-calendar-check-fill",
    "leaves-management": "bi-calendar-minus-fill",
    "reimbursement":     "bi-receipt",
    "overtime":          "bi-clock-history",
    "profile":           "bi-person-circle",
  };

  const menu = [
    { href: "/employee/dashboard",          label: "Home",               icon: "home"              },
    { href: "/employee/attendance-summary", label: "Attendance Summary", icon: "attendance"        },
    { href: "/employee/leaves-management",  label: "Leaves Management",  icon: "leaves-management" },
    { href: "/employee/reimbursement",      label: "Reimbursement",      icon: "reimbursement"     },
    { href: "/employee/overtime",           label: "Overtime",           icon: "overtime"          },
    { href: "/employee/profile",            label: "My Profile",         icon: "profile"           },
  ];

  const isActive = (href) => pathname === href;

  // ── Profile card rendered as a table — immune to flex/grid/color overrides ──
  const ProfileCard = () => (
    <table
      onClick={() => router.push("/employee/profile")}
      cellPadding="0" cellSpacing="0"
      style={{
        width:"calc(100% - 20px)", margin:"10px 10px 0",
        background:"rgba(255,255,255,.09)",
        border:"1px solid rgba(255,255,255,.15)",
        borderRadius:12, borderCollapse:"separate",
        borderSpacing:0, cursor:"pointer",
        tableLayout:"fixed", overflow:"hidden",
      }}
    >
      <tbody>
        <tr>
          {/* Avatar cell */}
          <td style={{ width:52, padding:"12px 0 10px 12px", verticalAlign:"middle" }}>
            <div style={{ position:"relative", width:40, height:40 }}>
              <div style={{
                width:40, height:40, borderRadius:"50%",
                background:"linear-gradient(135deg,#818CF8,#A78BFA)",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontWeight:800, fontSize:14,
                border:"2.5px solid rgba(255,255,255,.3)",
                boxShadow:"0 0 0 3px rgba(129,140,248,.2)",
                textAlign:"center", lineHeight:"40px",
              }}>
                {initials}
              </div>
              <span style={{
                position:"absolute", bottom:1, right:1,
                width:9, height:9, borderRadius:"50%",
                background:"#4ADE80", border:"2px solid #1e1b4b",
                display:"block",
              }} />
            </div>
          </td>

          {/* Name cell */}
          <td style={{ padding:"12px 0 10px 15px", verticalAlign:"middle" }}>
            <p style={{
              margin:0, padding:0,
              fontSize:13, fontWeight:700,
              color:"#111 !important",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              lineHeight:"1.3",
              // Force white regardless of sidebar CSS
              WebkitTextFillColor:"#111",
            }}>
              {employee.firstName} {employee.lastName}
            </p>
            <p style={{
              margin:"2px 0 0 0", padding:0,
              fontSize:10,
              WebkitTextFillColor:"rgba(0, 0, 0, 0.45)",
              lineHeight:"1.3",
            }}>
              {employee.employeeId}
              {employee.employeeId && employee.dept ? " · " : ""}
              {employee.dept}
              {!employee.employeeId && !employee.dept ? "View Profile" : ""}
            </p>
          </td>

          {/* Arrow cell */}
          <td style={{ width:36, padding:"12px 12px 10px 0", verticalAlign:"middle", textAlign:"right" }}>
            <span style={{
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              width:22, height:22, borderRadius:6,
              background:"rgba(255,255,255,.08)",
            }}>
              <i className="bi bi-chevron-right" style={{ fontSize:10, WebkitTextFillColor:"rgba(0, 0, 0, 0.4)" }} />
            </span>
          </td>
        </tr>

        {/* Progress row */}
        <tr>
          <td colSpan={3} style={{ padding:"0 12px 12px" }}>
            <table cellPadding="0" cellSpacing="0" style={{ width:"100%", marginBottom:5 }}>
              <tbody>
                <tr>
                  <td style={{ fontSize:10, WebkitTextFillColor:"rgba(0, 0, 0, 0.4)" }}>
                    Profile
                  </td>
                  <td style={{
                    fontSize:10, fontWeight:700, textAlign:"right",
                    WebkitTextFillColor: employee.completion===100 ? "#4ADE80" : "#818CF8",
                  }}>
                    {employee.completion}%
                  </td>
                </tr>
              </tbody>
            </table>
            {/* Bar bg */}
            <div style={{ height:3, background:"rgba(255,255,255,.1)", borderRadius:10 }}>
              <div style={{
                height:"100%", borderRadius:10,
                width:`${employee.completion}%`,
                background: employee.completion===100
                  ? "linear-gradient(90deg,#4ADE80,#22C55E)"
                  : "linear-gradient(90deg,#818CF8,#A78BFA)",
                transition:"width .6s",
              }} />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="left-panel-area">
      <aside id="leftsidebar" className="sidebar mobile-none">

        {/* ── Profile card — rendered as TABLE outside .menu ul.list ── */}
        <ProfileCard />

        {/* Divider */}
        <div style={{ height:1, background:"rgb(237 237 237 / 26%)", margin:"10px 10px 4px" }} />

        <div className="menu">
          <ul className="list" style={{ paddingBottom:16 }}>
            {menu.map((item) => {
              const active = isActive(item.href);
              const biIcon = BI_ICONS[item.icon] || "bi-circle";
              return (
                <li key={item.href} className={active ? "active" : ""}>
                  <Link
                    href={item.href}
                    className="waves-effect waves-block"
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px" }}
                  >
                    <span style={{ width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <img
                        src={active ? `/icons/${item.icon}-active.svg` : `/icons/${item.icon}.svg`}
                        alt="" style={{ width:18, height:18 }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          const next = e.target.nextElementSibling;
                          if (next) next.style.display = "inline-block";
                        }}
                      />
                      <i
                        className={`bi ${biIcon}`}
                        style={{ display:"none", fontSize:15, color: active ? "#818CF8" : "rgba(0, 0, 0, 0.55)" }}
                      />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}

            {/* Logout */}
            <li style={{ listStyle:"none", padding:"6px 12px 4px" }}>
              <button onClick={handleLogout} style={{
                width:"100%", padding:"9px 16px", borderRadius:10,
                background:"rgb(212 212 212 / 54%)", border:"1px solid rgba(255,255,255,.1)",
                 fontSize:13, fontWeight:600,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7,
              }}>
                <i className="bi bi-box-arrow-right" /> Logout
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

// "use client";

// import Link from "next/link";
// import { useState, useEffect } from "react";
// import { useRouter, usePathname } from "next/navigation";

// export default function EmployeeLeftbar() {
//   const router = useRouter();
//   const pathname = usePathname();

//     const [employee, setEmployee] = useState({
//     firstName: "",
//     avatar: "/asets/images/avatar.png",
//   });

// useEffect(() => {
//   const fetchEmployee = async () => {
//     try {
//       const res = await fetch("/api/employee/me", {
//         credentials: "include", // send cookie automatically
//       });

//       const data = await res.json();
//       if (data.success && data.employee) {
//         setEmployee({
//           firstName: data.employee.firstName || "Employee",
//           avatar: data.employee.avatar || "/asets/images/avatar.png",
//         });
//       } else {
//         console.warn("⚠️ Failed to fetch employee profile:", data.message);
//       }
//     } catch (err) {
//       console.error("Failed to fetch employee profile", err);
//     }
//   };

//   fetchEmployee();
// }, []);


//   // logout
//   const handleLogout = async () => {
//     // optional: call logout API to clear cookie on server
//     await fetch("/api/employee/logout", { method: "POST", credentials: "include" });

//     router.push("/employee/login");
//   };




//   // menu for employees
//   const menu = [
//     { href: "/employee/dashboard", label: "Home", icon: "home" },
//     { href: "/employee/attendance-summary", label: "Attendance Summary", icon: "attendance" },
//     { href: "/employee/leaves-management", label: "Leaves Management", icon: "leaves-management" },
//     // { href: "/employee/reports", label: "Reports", icon: "reports" },s
//     { href: "/employee/reimbursement", label: "Reimbursement", icon: "reimbursement" },

//     { href: "/employee/overtime", label: "Overtime", icon: "overtime" },

//     // { href: "#", label: "Salary Report - Coming Soon", icon: "salary" },


//     // { type: "heading", label: "Task Management" },
//     // { href: "/employee/tasks", label: "All Task", icon: "all-task" },
//   ];

//   const getIconPath = (icon, active) =>
//     active ? `/icons/${icon}-active.svg` : `/icons/${icon}.svg`;











  
//   return (
//     <div className="left-panel-area">
//       <aside id="leftsidebar" className="sidebar mobile-none">
//         <div className="menu">
//           <ul className="list mt-3">
         
         

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
