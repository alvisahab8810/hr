// components/employee/LeftbarMobile.js
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const NAV = [
  // ── Main
  { href: "/employee/dashboard",          icon: "bi-house-fill",           label: "Home",            section: null },
  { href: "/employee/tasks",              icon: "bi-check2-square",        label: "Task Management", section: null },
  // ── HR
  { href: "/employee/attendance-summary", icon: "bi-calendar-check-fill",  label: "Attendance",      section: "HR" },
  { href: "/employee/leaves-management",  icon: "bi-calendar-minus-fill",  label: "Leaves",          section: null },
  { href: "/employee/reimbursement",      icon: "bi-receipt",              label: "Reimbursement",   section: null },
  { href: "/employee/overtime",           icon: "bi-clock-history",        label: "Overtime",        section: null },
  { href: "/employee/deduction-waiver",   icon: "bi-shield-check",         label: "My Deductions",   section: null },
  { href: "/employee/assets",             icon: "bi-box-seam-fill",        label: "My Assets",       section: null },
  { href: "/employee/salary-slips",       icon: "bi-cash-stack",           label: "Salary Slips",    section: null },
  // ── Social
  { href: "/employee/community",          icon: "bi-people-fill",          label: "Community",       section: "Social" },
  { href: "/employee/messages",           icon: "bi-chat-dots-fill",       label: "Client Messages", section: null,  dmOnly: true },
  { href: "/employee/client-requests",    icon: "bi-inbox-fill",           label: "Client Requests", section: null,  dmOnly: true },
  // ── Account
  { href: "/employee/profile",            icon: "bi-person-circle",        label: "My Profile",      section: "Account" },
  { href: "/employee/complete-profile",   icon: "bi-folder2-open",         label: "Documents",       section: null },
];

// Bottom tab bar — 5 most-used items
const BOTTOM_TABS = [
  { href: "/employee/dashboard",          icon: "bi-house-fill",          label: "Home"       },
  { href: "/employee/tasks",              icon: "bi-check2-square",       label: "Tasks"      },
  { href: "/employee/leaves-management",  icon: "bi-calendar-minus-fill", label: "Leaves"     },
  { href: "/employee/community",          icon: "bi-people-fill",         label: "Community"  },
  { href: "/employee/profile",            icon: "bi-person-circle",       label: "Profile"    },
];

export default function EmployeeLeftbarMobile() {
  const router   = useRouter();
  const pathname = usePathname();

  const [open,     setOpen]     = useState(false);
  const [employee, setEmployee] = useState({ firstName:"", lastName:"", employeeId:"", dept:"", avatar:"" });
  const [attStatus, setAttStatus] = useState(null);
  const [isDmDept, setIsDmDept] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("employeeToken") : null;
    if (!token) return;

    fetch("/api/employee/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.employee) {
          const dept = d.employee.professional?.department || "";
          setEmployee({
            firstName:  d.employee.firstName  || "",
            lastName:   d.employee.lastName   || "",
            employeeId: d.employee.employeeId || "",
            dept,
            avatar:     d.employee.personal?.avatar || "",
          });
          setIsDmDept(dept.toLowerCase().includes("digital") || dept.toLowerCase().includes("marketing"));
        }
      }).catch(() => {});

    fetch("/api/employee/time/summary", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAttStatus(d.data?.attendance?.status ?? null);
        }
      }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await fetch("/api/employee/logout", { method:"POST", credentials:"include" }).catch(()=>{});
    if (typeof window !== "undefined") localStorage.removeItem("employeeToken");
    router.push("/employee/login");
  };

  const initials = `${employee.firstName?.[0]||""}${employee.lastName?.[0]||""}`.toUpperCase()||"?";

  const statusMeta = {
    clocked_in:  { label:"Working",   color:"#10B981", bg:"rgba(16,185,129,0.15)"  },
    on_break:    { label:"On Lunch",  color:"#F59E0B", bg:"rgba(245,158,11,0.15)"  },
    clocked_out: { label:"Done",      color:"#6B7280", bg:"rgba(107,114,128,0.15)" },
  }[attStatus] || null;

  return (
    <>
      {/* ═══════════════════════════════════════════
          GLOBAL MOBILE OVERRIDES  (≤ 991 px)
      ═══════════════════════════════════════════ */}
      <style>{`
        /* ── show / hide ── */
        .emp-mob-header, .emp-mob-drawer, .emp-mob-backdrop, .emp-mob-bottomnav {
          display: none !important;
        }
        @media (max-width: 991px) {
          /* mobile pieces visible */
          .emp-mob-header    { display: flex !important; }
          .emp-mob-bottomnav { display: flex !important; }

          /* hide desktop pieces */
          .left-panel-area, #leftsidebar, .sidebar.mobile-none { display: none !important; }
          .main-nav.dash-nav, .main-nav > .main-nav.dash-nav   { display: none !important; }
          div.main-nav > .main-nav.dash-nav                    { display: none !important; }

          /* make content fill width and clear fixed bars */
          section.content, section.content.home {
            margin-left: 0 !important;
            margin-right: 0 !important;
            // padding-top: 62px !important;
            padding-bottom: 72px !important;
            min-height: 100vh;
          }

          /* breadcrumb – tighten on mobile */
          .breadcrum-bx { margin-bottom: 0 !important; }
          .breadcrum-bx .breadcrumb {
            padding: 10px 14px !important;
            border-radius: 0 !important;
            flex-wrap: wrap;
            gap: 6px;
          }

          /* block header */
          .block-header {
            padding: 10px 12px 6px !important;
          }

          /* time-tracker inside breadcrumb → full width block */
          .breadcrum-bx .breadcrumb li:last-child {
            margin-left: 0 !important;
            width: 100%;
            margin-top: 6px;
          }
          .breadcrum-bx .breadcrumb li:last-child > div {
            width: 100%;
          }
        }
        /* drawer open → prevent body scroll */
        body.emp-drawer-open { overflow: hidden; }

        /* bottom-tab active indicator */
        .emp-tab-active-bar {
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 20px; height: 3px;
          border-radius: 0 0 4px 4px;
          background: linear-gradient(90deg,#4F46E5,#7C3AED);
        }
      `}</style>

      {/* ═══════════════════════════════════════════
          TOP HEADER
      ═══════════════════════════════════════════ */}
      <header className="emp-mob-header" style={{
        position:"fixed", top:0, left:0, right:0, zIndex:1050,
        height:56, alignItems:"center", justifyContent:"space-between",
        padding:"0 14px",
        background:"linear-gradient(135deg,#1e1b4b 0%,#4338CA 100%)",
        boxShadow:"0 2px 16px rgba(0,0,0,0.25)",
      }}>

        {/* Hamburger */}
        <button
          onClick={() => { setOpen(true); document.body.classList.add("emp-drawer-open"); }}
          aria-label="Open menu"
          style={{
            background:"rgba(255,255,255,0.1)", border:"none",
            borderRadius:10, width:40, height:40,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", flexShrink:0,
            transition:"background 0.2s",
          }}
        >
          <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
            <rect width="20" height="2.2" rx="1.1" fill="white"/>
            <rect y="6.9" width="20" height="2.2" rx="1.1" fill="white"/>
            <rect y="13.8" width="14" height="2.2" rx="1.1" fill="white"/>
          </svg>
        </button>

        {/* Centred logo */}
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center" }}>
          <img
            src="/assets/images/logo.png" alt="Viralon"
            style={{ height:26, filter:"brightness(0) invert(1)", display:"block" }}
            onError={e => {
              e.currentTarget.style.display = "none";
              const s = e.currentTarget.nextSibling;
              if (s) s.style.display = "block";
            }}
          />
          <span style={{ display:"none", color:"#fff", fontWeight:900, fontSize:19, letterSpacing:0.3 }}>
            Viralon
          </span>
        </div>

        {/* Right: status pill + avatar */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {statusMeta && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:5,
              background: statusMeta.bg,
              borderRadius:20, padding:"3px 10px",
              fontSize:11, fontWeight:700, color:"#fff", whiteSpace:"nowrap",
            }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background: statusMeta.color }} />
              {statusMeta.label}
            </span>
          )}
          {employee.avatar ? (
            <img src={employee.avatar} alt="avatar"
              style={{ width:34, height:34, borderRadius:"50%", objectFit:"cover",
                border:"2px solid rgba(255,255,255,0.35)", flexShrink:0 }}
            />
          ) : (
            <div style={{
              width:34, height:34, borderRadius:"50%",
              background:"linear-gradient(135deg,#818CF8,#A78BFA)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:800, fontSize:13, color:"#fff",
              border:"2px solid rgba(255,255,255,0.25)", flexShrink:0,
            }}>
              {initials}
            </div>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          BACKDROP
      ═══════════════════════════════════════════ */}
      {open && (
        <div
          onClick={() => { setOpen(false); document.body.classList.remove("emp-drawer-open"); }}
          style={{
            position:"fixed", inset:0, zIndex:1060,
            background:"rgba(0,0,0,0.55)",
            backdropFilter:"blur(3px)",
          }}
        />
      )}

      {/* ═══════════════════════════════════════════
          SLIDE DRAWER
      ═══════════════════════════════════════════ */}
      <aside style={{
        position:"fixed", top:0, left:0, bottom:0, zIndex:1070,
        width:290,
        background:"linear-gradient(175deg,#1e1b4b 0%,#2d2a6e 60%,#1e1b4b 100%)",
        transform: open ? "translateX(0)" : "translateX(-105%)",
        transition:"transform 0.32s cubic-bezier(0.4,0,0.2,1)",
        display:"flex", flexDirection:"column",
        overflowY:"auto",
        boxShadow: open ? "4px 0 32px rgba(0,0,0,0.35)" : "none",
      }}>

        {/* Drawer top bar */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"18px 16px 14px",
          borderBottom:"1px solid rgba(255,255,255,0.07)",
        }}>
          <img
            src="/assets/images/logo.png" alt="Viralon"
            style={{ height:28, filter:"brightness(0) invert(1)" }}
            onError={e => {
              e.currentTarget.style.display = "none";
              const s = e.currentTarget.nextSibling;
              if (s) s.style.display = "block";
            }}
          />
          <span style={{ display:"none", color:"#fff", fontWeight:900, fontSize:20 }}>Viralon</span>
          <button
            onClick={() => { setOpen(false); document.body.classList.remove("emp-drawer-open"); }}
            style={{
              background:"rgba(255,255,255,0.09)", border:"none", borderRadius:8,
              width:34, height:34, cursor:"pointer", color:"rgba(255,255,255,0.7)",
              fontSize:18, display:"flex", alignItems:"center", justifyContent:"center",
              transition:"background 0.2s",
            }}
          >×</button>
        </div>

        {/* Employee profile card */}
        <div style={{ padding:"16px 16px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
            <div style={{
              width:50, height:50, borderRadius:"50%",
              background:"linear-gradient(135deg,#818CF8,#A78BFA)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:900, fontSize:18, color:"#fff",
              border:"2.5px solid rgba(255,255,255,0.22)",
              flexShrink:0,
            }}>
              {initials}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{
                color:"#fff", fontWeight:700, fontSize:15,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              }}>
                {employee.firstName} {employee.lastName}
              </div>
              <div style={{ color:"rgba(255,255,255,0.45)", fontSize:11.5, marginTop:2 }}>
                {employee.employeeId}{employee.employeeId && employee.dept ? " · " : ""}{employee.dept}
              </div>
            </div>
          </div>
          {statusMeta && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:6,
              background:"rgba(255,255,255,0.08)", borderRadius:20,
              padding:"5px 12px", fontSize:12, fontWeight:700, color:"#fff",
              border:`1px solid ${statusMeta.color}44`,
            }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:statusMeta.color }} />
              {statusMeta.label}
            </span>
          )}
        </div>

        {/* Navigation links */}
        <nav style={{ flex:1, padding:"10px 8px 8px" }}>
          {NAV.filter(item => !item.dmOnly || isDmDept).map((item, idx) => {
            const active = pathname === item.href || (item.href === "/employee/tasks" && pathname?.startsWith("/employee/tasks"));
            return (
              <div key={item.href}>
                {/* Section divider */}
                {item.section && (
                  <div style={{
                    fontSize:9, fontWeight:800, letterSpacing:"0.1em",
                    textTransform:"uppercase", color:"rgba(255,255,255,0.25)",
                    padding:"12px 14px 4px",
                    marginTop: idx > 0 ? 4 : 0,
                  }}>
                    {item.section}
                  </div>
                )}
                <Link
                  href={item.href}
                  onClick={() => { setOpen(false); document.body.classList.remove("emp-drawer-open"); }}
                  style={{
                    display:"flex", alignItems:"center", gap:13,
                    padding:"11px 14px", borderRadius:11, marginBottom:2,
                    textDecoration:"none",
                    background: active ? "rgba(255,255,255,0.1)" : "transparent",
                    color:      active ? "#fff" : "rgba(255,255,255,0.55)",
                    fontWeight: active ? 700 : 500,
                    fontSize:13.5,
                    transition:"all 0.15s",
                    borderLeft: active ? "3px solid #818CF8" : "3px solid transparent",
                  }}
                >
                  <i className={`bi ${item.icon}`} style={{
                    fontSize:16, flexShrink:0,
                    color: active ? "#A78BFA" : "rgba(255,255,255,0.35)",
                  }} />
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding:"6px 8px 32px" }}>
          <div style={{ height:1, background:"rgba(255,255,255,0.06)", marginBottom:10 }} />
          <button
            onClick={handleLogout}
            style={{
              width:"100%", padding:"12px 14px", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:11, background:"rgba(255,255,255,0.04)",
              color:"rgba(255,255,255,0.55)", fontSize:14, fontWeight:600,
              cursor:"pointer", display:"flex", alignItems:"center", gap:10,
              transition:"all 0.15s",
            }}
          >
            <i className="bi bi-box-arrow-right" style={{ fontSize:16 }} /> Logout
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════
          BOTTOM TAB BAR
      ═══════════════════════════════════════════ */}
      <nav className="emp-mob-bottomnav" style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:1050,
        height:60, alignItems:"center", justifyContent:"space-around",
        background:"#fff",
        borderTop:"1px solid #EBEBEB",
        boxShadow:"0 -2px 20px rgba(0,0,0,0.07)",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
      }}>
        {BOTTOM_TABS.map(item => {
          const active    = pathname === item.href;
          const isProfile = item.href === "/employee/profile";
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                flex:1, height:"100%", textDecoration:"none",
                color: active ? "#4F46E5" : "#9CA3AF",
                position:"relative", transition:"color 0.15s", gap:2,
              }}
            >
              {active && <span className="emp-tab-active-bar" />}
              {isProfile && employee.avatar ? (
                <img src={employee.avatar} alt="avatar"
                  style={{ width: active ? 24 : 22, height: active ? 24 : 22,
                    borderRadius:"50%", objectFit:"cover",
                    border: active ? "2px solid #4F46E5" : "2px solid #D1D5DB" }}
                />
              ) : (
                <i className={`bi ${item.icon}`} style={{
                  fontSize: active ? 21 : 19, transition:"font-size 0.15s",
                  fontWeight: active ? "bold" : "normal",
                }} />
              )}
              <span style={{ fontSize:10, fontWeight: active ? 700 : 500, letterSpacing:0.2 }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
