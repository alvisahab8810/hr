// components/employee/Leftbar.js
"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function EmployeeLeftbar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [employee, setEmployee] = useState({
    firstName: "", lastName: "", employeeId: "", dept: "", completion: 0, avatar: "",
  });
  const [tmsOpen, setTmsOpen]         = useState(false);
  const [msgUnread, setMsgUnread]         = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isDmDept, setIsDmDept]           = useState(false);
  const [isTechDept, setIsTechDept]       = useState(false);
  const [communityUnread, setCommunityUnread] = useState(0);
  const msgPollRef = useRef(null);
  const reqPollRef = useRef(null);

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
          // Must match profile.js calcCompletion exactly
          const checks = [
            emp?.personal?.avatar,
            emp?.personal?.mobile, emp?.personal?.email, emp?.personal?.dob,
            emp?.personal?.address, emp?.personal?.city, emp?.personal?.state,
            emp?.personal?.maritalStatus, emp?.personal?.fatherName,
            emp?.professional?.department, emp?.professional?.designation, emp?.professional?.dateOfJoining,
            emp?.salary?.bankName, emp?.salary?.accountNumber, emp?.salary?.ifscCode, emp?.salary?.panNumber,
            emp?.documents?.appointmentLetter, emp?.documents?.salarySlips?.length > 0,
          ];
          const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
          const dept = emp.professional?.department || "";
          setEmployee({
            firstName:  emp.firstName  || "Employee",
            lastName:   emp.lastName   || "",
            employeeId: emp.employeeId || "",
            dept,
            completion: pct,
            avatar:     emp.personal?.avatar || "",
          });
          const dm   = dept.toLowerCase().includes("digital") || dept.toLowerCase().includes("marketing");
          const tech = dept.toLowerCase().includes("tech") || dept.toLowerCase().includes("development") || dept.toLowerCase().includes("developer") || dept.toLowerCase().includes("engineering");
          setIsDmDept(dm);
          setIsTechDept(tech);
          if (dm) fetchMsgUnread(token);
          if (dm) fetchPendingRequests(token);
          fetchCommunityUnread(token);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!isDmDept) return;
    const token = localStorage.getItem("employeeToken");
    msgPollRef.current = setInterval(() => fetchMsgUnread(token), 15000);
    reqPollRef.current = setInterval(() => fetchPendingRequests(token), 15000);
    return () => {
      clearInterval(msgPollRef.current);
      clearInterval(reqPollRef.current);
    };
  }, [isDmDept]);

  async function fetchCommunityUnread(token) {
    try {
      const r = await fetch("/api/team/notifications", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await r.json();
      if (d.success) setCommunityUnread(d.communityUnread || 0);
    } catch {}
  }

  async function fetchPendingRequests(token) {
    try {
      const r = await fetch("/api/employee/call-requests?count=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) setPendingRequests(d.pending || 0);
    } catch {}
  }

  async function fetchMsgUnread(token) {
    try {
      const r = await fetch("/api/employee/client-messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) {
        const total = (d.brands || []).reduce((s, b) => s + (b.unread || 0), 0);
        setMsgUnread(total);
      }
    } catch {}
  }

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
    "deduction-waiver":  "bi-shield-check",
    "assets":            "bi-box-seam-fill",
    "profile":           "bi-person-circle",
  };

  const menu = [
    { href: "/employee/dashboard",          label: "Home",               icon: "home"              },
    { href: "/employee/attendance-summary", label: "Attendance Summary", icon: "attendance"        },
    { href: "/employee/leaves-management",  label: "Leaves Management",  icon: "leaves-management" },
    { href: "/employee/reimbursement",      label: "Reimbursement",      icon: "reimbursement"     },
    { href: "/employee/overtime",           label: "Overtime",           icon: "overtime"          },
    { href: "/employee/deduction-waiver",   label: "My Deductions",      icon: "deduction-waiver"  },
    { href: "/employee/assets",             label: "My Assets",          icon: "assets"            },
    { href: "/employee/profile",            label: "My Profile",         icon: "profile"           },
  ];

  useEffect(() => {
    if (pathname?.startsWith("/employee/tasks")) setTmsOpen(true);
  }, [pathname]);

  const isActive = (href) => pathname === href;
  const tmsActive = pathname?.startsWith("/employee/tasks");
  const devActive = pathname === "/employee/dev-portal";

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
              {employee.avatar ? (
                <img src={employee.avatar} alt="avatar"
                  style={{ width:40, height:40, borderRadius:"50%", objectFit:"cover",
                    border:"2.5px solid rgba(255,255,255,.3)",
                    boxShadow:"0 0 0 3px rgba(129,140,248,.2)" }} />
              ) : (
                <div style={{
                  width:40, height:40, borderRadius:"50%",
                  background:"linear-gradient(135deg,#818CF8,#A78BFA)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#fff", fontWeight:800, fontSize:14,
                  border:"2.5px solid rgba(255,255,255,.3)",
                  boxShadow:"0 0 0 3px rgba(129,140,248,.2)",
                }}>
                  {initials}
                </div>
              )}
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
            {menu.map((item, idx) => {
              const active = isActive(item.href);
              const biIcon = BI_ICONS[item.icon] || "bi-circle";
              return (
                <>
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
                  {/* Client Messages + Meeting Requests right after Home */}
                  {idx === 0 && isDmDept && (
                    <>
                      <li style={{ listStyle:"none" }} className={pathname === "/employee/messages" ? "active" : ""}>
                        <Link href="/employee/messages" className="waves-effect waves-block"
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px" }}>
                          <span style={{ width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <i className="bi bi-chat-dots" style={{ fontSize:15, color: pathname === "/employee/messages" ? "#818CF8" : "rgba(0,0,0,0.55)" }} />
                          </span>
                          <span style={{ flex:1 }}>Client Messages</span>
                          {msgUnread > 0 && (
                            <span style={{ background:"#EF4444", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, minWidth:20, textAlign:"center" }}>
                              {msgUnread > 99 ? "99+" : msgUnread}
                            </span>
                          )}
                        </Link>
                      </li>
                      <li style={{ listStyle:"none" }} className={pathname === "/employee/meeting-requests" ? "active" : ""}>
                        <Link href="/employee/meeting-requests" className="waves-effect waves-block"
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px" }}>
                          <span style={{ width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <i className="bi bi-telephone-fill" style={{ fontSize:15, color: pathname === "/employee/meeting-requests" ? "#818CF8" : "rgba(0,0,0,0.55)" }} />
                          </span>
                          <span style={{ flex:1 }}>Meeting Requests</span>
                          {pendingRequests > 0 && (
                            <span style={{ background:"#F97316", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, minWidth:20, textAlign:"center" }}>
                              {pendingRequests > 99 ? "99+" : pendingRequests}
                            </span>
                          )}
                        </Link>
                      </li>
                    </>
                  )}
                </>
              );
            })}

            {/* ── Community ── */}
            <li style={{ listStyle:"none" }} className={pathname === "/employee/community" ? "active" : ""}>
              <Link
                href="/employee/community"
                className="waves-effect waves-block"
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px" }}
              >
                <span style={{ width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <i className="bi bi-people-fill" style={{ fontSize:15, color: pathname === "/employee/community" ? "#818CF8" : "rgba(0,0,0,0.55)" }} />
                </span>
                <span style={{ flex:1 }}>Community</span>
                {communityUnread > 0 && (
                  <span style={{ background:"#EF4444", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, minWidth:20, textAlign:"center" }}>
                    {communityUnread > 99 ? "99+" : communityUnread}
                  </span>
                )}
              </Link>
            </li>

            {/* ── Dev Portal — only for Tech & Development department ── */}
            {isTechDept && (
              <li style={{ listStyle:"none" }} className={devActive ? "active" : ""}>
                <Link
                  href="/employee/dev-portal"
                  className="waves-effect waves-block"
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px" }}
                >
                  <span style={{ width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <i className="bi bi-kanban" style={{ fontSize:15, color: devActive ? "#818CF8" : "rgba(0,0,0,0.55)" }} />
                  </span>
                  <span>Dev Portal</span>
                </Link>
              </li>
            )}

            {/* ── Task Management dropdown ── */}
            <li style={{ listStyle:"none" }} className={tmsActive ? "active" : ""}>
              <button
                onClick={() => setTmsOpen(o => !o)}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"10px 16px", width:"100%",
                  background:"transparent", border:"none", cursor:"pointer",
                  fontSize:13, fontWeight:500, textAlign:"left",
                  color: tmsActive ? "#818CF8" : "rgba(0,0,0,0.65)",
                }}
              >
                <span style={{ width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <i className="bi bi-kanban" style={{ fontSize:15, color: tmsActive ? "#818CF8" : "rgba(0,0,0,0.55)" }} />
                </span>
                <span style={{ flex:1 }}>Task Management</span>
                <i
                  className="bi bi-chevron-down"
                  style={{
                    fontSize:11, color:"rgba(0,0,0,0.35)",
                    transition:"transform .25s",
                    transform: tmsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {/* Sub-items */}
              <ul style={{
                listStyle:"none", margin:0, padding:"2px 0 4px",
                overflow:"hidden",
                maxHeight: tmsOpen ? 300 : 0,
                transition:"max-height .3s ease",
              }}>
                {[
                  { href:"/employee/tasks",          label:"Dashboard",  icon:"bi-grid-1x2" },
                ].map(sub => {
                  const subActive = pathname === sub.href;
                  return (
                    <li key={sub.href} className={subActive ? "active" : ""}>
                      <Link
                        href={sub.href}
                        className="waves-effect waves-block"
                        style={{
                          display:"flex", alignItems:"center", gap:8,
                          padding:"8px 16px 8px 44px", fontSize:12.5,
                          color: subActive ? "#4F46E5" : "rgba(0,0,0,0.6)",
                          fontWeight: subActive ? 700 : 500,
                          textDecoration:"none",
                        }}
                      >
                        <i className={`bi ${sub.icon}`} style={{ fontSize:13 }} />
                        {sub.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>


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
