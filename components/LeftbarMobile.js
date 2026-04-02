// components/LeftbarMobile.js  — Admin mobile navigation
"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const NAV = [
  { href: "/",                                    icon: "bi-house-fill",          label: "Dashboard"     },
  { href: "/dashboard/admin/employee-management", icon: "bi-people-fill",         label: "Employees",
    match: ["/dashboard/admin/employee-management", "/dashboard/admin/add-employee", "/dashboard/admin/employee-profile"] },
  { href: "/dashboard/admin/attendance-summary",  icon: "bi-calendar-check-fill", label: "Attendance"    },
  { href: "/dashboard/admin/leaves-management",   icon: "bi-calendar-minus-fill", label: "Leaves"        },
  { href: "/dashboard/admin/salary-report",       icon: "bi-cash-stack",          label: "Salary"        },
  { href: "/dashboard/admin/reimbursement",       icon: "bi-receipt",             label: "Reimbursement" },
  { href: "/dashboard/admin/overtime",            icon: "bi-clock-history",       label: "Overtime"      },
  { href: "/dashboard/admin/deduction-waiver",    icon: "bi-shield-check-fill",   label: "Waivers"       },
  { href: "/dashboard/admin/holidays",            icon: "bi-calendar-event-fill", label: "Holidays"      },
];

const BOTTOM_TABS = [
  { href: "/",                                    icon: "bi-house-fill",          label: "Home"       },
  { href: "/dashboard/admin/employee-management", icon: "bi-people-fill",         label: "Team",
    match: ["/dashboard/admin/employee-management", "/dashboard/admin/add-employee", "/dashboard/admin/employee-profile"] },
  { href: "/dashboard/admin/attendance-summary",  icon: "bi-calendar-check-fill", label: "Attendance" },
  { href: "/dashboard/admin/leaves-management",   icon: "bi-calendar-minus-fill", label: "Leaves"     },
  { href: "/dashboard/admin/salary-report",       icon: "bi-cash-stack",          label: "Salary"     },
];

export default function LeftbarMobile({ role = "admin" }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    document.body.classList.remove("adm-drawer-open");
    await fetch("/api/admin/logout", { method: "GET" }).catch(() => {});
    router.push("/dashboard/login");
  };

  const isActive = (item) =>
    item.match
      ? item.match.some(p => pathname?.startsWith(p))
      : pathname === item.href;

  const closeDrawer = () => {
    setOpen(false);
    document.body.classList.remove("adm-drawer-open");
  };

  return (
    <>
      {/* ═══════════════════════════════════════════
          GLOBAL MOBILE OVERRIDES  (≤ 991 px)
      ═══════════════════════════════════════════ */}
      <style>{`
        /* ── show / hide ── */
        .adm-mob-header, .adm-mob-bottomnav { display: none !important; }

        @media (max-width: 991px) {
          /* mobile pieces visible */
          .adm-mob-header    { display: flex !important; }
          .adm-mob-bottomnav { display: flex !important; }

          /* hide desktop pieces */
          .left-panel-area, #leftsidebar, .sidebar.mobile-none { display: none !important; }
          .main-nav.dash-nav, div.main-nav > .main-nav.dash-nav { display: none !important; }

          /* make content fill width and clear fixed bars */
          section.content, section.content.home {
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-top: 62px !important;
            padding-bottom: 72px !important;
            min-height: 100vh;
          }

          /* breadcrumb – tighten on mobile */
          .breadcrum-bx { margin-bottom: 0 !important; }
          .breadcrum-bx .breadcrumb {
            padding: 10px 14px !important;
            border-radius: 0 !important;
            flex-wrap: wrap; gap: 6px;
          }
          .block-header { padding: 10px 12px 6px !important; }

          /* tables – horizontal scroll */
          .custom-table-area { overflow-x: auto !important; }

          /* stats cards – 2 col grid on mobile */
          .attendance-highlight-wrap {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
        }

        body.adm-drawer-open { overflow: hidden; }

        .adm-tab-active-bar {
          position: absolute; top: 0; left: 50%;
          transform: translateX(-50%);
          width: 20px; height: 3px;
          border-radius: 0 0 4px 4px;
          background: linear-gradient(90deg,#4F46E5,#7C3AED);
        }
      `}</style>

      {/* ═══════════════════════════════════════════
          TOP HEADER
      ═══════════════════════════════════════════ */}
      <header className="adm-mob-header" style={{
        position:"fixed", top:0, left:0, right:0, zIndex:1050,
        height:56, alignItems:"center", justifyContent:"space-between",
        padding:"0 14px",
        background:"linear-gradient(135deg,#1e1b4b 0%,#4338CA 100%)",
        boxShadow:"0 2px 16px rgba(0,0,0,0.25)",
      }}>

        {/* Hamburger */}
        <button
          onClick={() => { setOpen(true); document.body.classList.add("adm-drawer-open"); }}
          aria-label="Open menu"
          style={{
            background:"rgba(255,255,255,0.1)", border:"none",
            borderRadius:10, width:40, height:40,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", flexShrink:0,
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

        {/* Admin badge */}
        <div style={{
          display:"flex", alignItems:"center", gap:6, flexShrink:0,
          background:"rgba(255,255,255,0.12)", borderRadius:20,
          padding:"5px 12px", border:"1px solid rgba(255,255,255,0.2)",
        }}>
          <i className="bi bi-shield-fill-check" style={{ color:"#A78BFA", fontSize:12 }} />
          <span style={{ color:"#fff", fontWeight:700, fontSize:11 }}>Admin</span>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          BACKDROP
      ═══════════════════════════════════════════ */}
      {open && (
        <div
          onClick={closeDrawer}
          style={{
            position:"fixed", inset:0, zIndex:1060,
            background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)",
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
            onClick={closeDrawer}
            style={{
              background:"rgba(255,255,255,0.09)", border:"none", borderRadius:8,
              width:34, height:34, cursor:"pointer", color:"rgba(255,255,255,0.7)",
              fontSize:18, display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >×</button>
        </div>

        {/* Admin profile card */}
        <div style={{ padding:"16px 16px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:50, height:50, borderRadius:"50%",
              background:"linear-gradient(135deg,#818CF8,#A78BFA)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:900, fontSize:20, color:"#fff",
              border:"2.5px solid rgba(255,255,255,0.22)", flexShrink:0,
            }}>
              <i className="bi bi-shield-fill-check" style={{ fontSize:22 }} />
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>Administrator</div>
              <div style={{ color:"rgba(255,255,255,0.45)", fontSize:11.5, marginTop:2 }}>
                Viralon HR System
              </div>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav style={{ flex:1, padding:"10px 8px 8px" }}>
          {NAV.map(item => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                style={{
                  display:"flex", alignItems:"center", gap:13,
                  padding:"12px 14px", borderRadius:11, marginBottom:3,
                  textDecoration:"none",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  color:      active ? "#fff" : "rgba(255,255,255,0.55)",
                  fontWeight: active ? 700 : 500,
                  fontSize:14,
                  transition:"all 0.15s",
                  borderLeft: active ? "3px solid #818CF8" : "3px solid transparent",
                }}
              >
                <i className={`bi ${item.icon}`} style={{
                  fontSize:17, flexShrink:0,
                  color: active ? "#A78BFA" : "rgba(255,255,255,0.35)",
                }} />
                {item.label}
              </Link>
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
      <nav className="adm-mob-bottomnav" style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:1050,
        height:60, alignItems:"center", justifyContent:"space-around",
        background:"#fff",
        borderTop:"1px solid #EBEBEB",
        boxShadow:"0 -2px 20px rgba(0,0,0,0.07)",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
      }}>
        {BOTTOM_TABS.map(item => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                flex:1, height:"100%", textDecoration:"none",
                color: active ? "#4F46E5" : "#9CA3AF",
                position:"relative",
                transition:"color 0.15s",
                gap:2,
              }}
            >
              {active && <span className="adm-tab-active-bar" />}
              <i className={`bi ${item.icon}`} style={{
                fontSize: active ? 21 : 19,
                transition:"font-size 0.15s",
              }} />
              <span style={{
                fontSize:10, fontWeight: active ? 700 : 500,
                letterSpacing:0.2,
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
