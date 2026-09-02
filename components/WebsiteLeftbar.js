// components/WebsiteLeftbar.js
// Sidebar for the WEBSITE management section (blogs, leads, faqs, quotation…).
// Completely separate from the payroll Leftbar — the hub page (/dashboard/hub)
// lets the admin switch between the two worlds.
"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { confirmLogout } from "./Logout";

// A salesperson signs in on /sales/login and only sees the menus the admin
// ticked for them; the admin has no sales_perms cookie and sees everything.
function salesPerms() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/sales_perms=([^;]+)/);
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])); } catch { return null; }
}

const MENU = [
  {
    href: "/dashboard/website",
    perm: "home",
    label: "Website Home",
    biIcon: "bi-house-door-fill",
    match: ["/dashboard/website"],
    exact: true,
  },
  {
    href: "/dashboard/admin/blogs",
    perm: "blogs",
    label: "Blogs",
    biIcon: "bi-file-earmark-text-fill",
    match: ["/dashboard/admin/blogs"],
  },
  {
    href: "/dashboard/website/careers",
    perm: "careers",
    label: "Careers",
    biIcon: "bi-briefcase-fill",
    match: ["/dashboard/website/careers"],
  },
  {
    href: "/dashboard/website/positions",
    perm: "positions",
    label: "Job Positions",
    biIcon: "bi-megaphone-fill",
    match: ["/dashboard/website/positions"],
  },
  {
    href: "/dashboard/website/pages",
    perm: "pages",
    label: "SEO Pages",
    biIcon: "bi-window-stack",
    match: ["/dashboard/website/pages"],
  },
  {
    href: "/dashboard/website/faqs",
    perm: "faqs",
    label: "FAQs",
    biIcon: "bi-question-circle-fill",
    match: ["/dashboard/website/faqs"],
  },
  {
    href: "/dashboard/website/slots",
    perm: "slots",
    label: "Call Slots",
    biIcon: "bi-calendar2-week-fill",
    match: ["/dashboard/website/slots"],
  },
  {
    href: "/dashboard/website/leads",
    perm: "leads",
    label: "Leads",
    biIcon: "bi-person-lines-fill",
    match: ["/dashboard/website/leads"],
  },
  {
    href: "/dashboard/website/proposals",
    perm: "proposals",
    label: "Proposals",
    biIcon: "bi-file-earmark-text-fill",
    match: ["/dashboard/website/proposals"],
  },
  {
    href: "/dashboard/website/invoices",
    perm: "invoices",
    label: "Invoices",
    biIcon: "bi-receipt",
    match: ["/dashboard/website/invoices"],
  },
  {
    href: "/dashboard/website/lead-profile",
    perm: "leadProfile",
    label: "Lead profile",
    biIcon: "bi-person-vcard-fill",
    match: ["/dashboard/website/lead-profile"],
  },
  {
    href: "/dashboard/website/sales-team",
    label: "Sales team",
    biIcon: "bi-people-fill",
    perm: "salesTeam",
    match: ["/dashboard/website/sales-team"],
  },
  {
    href: "/dashboard/website/reports",
    label: "Reports",
    biIcon: "bi-bar-chart-fill",
    perm: "reports",
    match: ["/dashboard/website/reports"],
  },
  {
    href: "/dashboard/website/settings",
    label: "Settings",
    biIcon: "bi-gear-fill",
    perm: "settings",
    match: ["/dashboard/website/settings"],
  },
];

export default function WebsiteLeftbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef(null);
  const perms = salesPerms();
  // Admin: perms is null and the whole menu shows. Salesperson: only the ticks.
  const menu = perms ? MENU.filter((i) => i.perm && perms[i.perm]) : MENU;

  const isActive = (item) => {
    if (!pathname) return false;
    if (item.exact) return pathname === item.href || pathname === `${item.href}/`;
    return item.match?.some((p) => pathname.startsWith(p));
  };

  return (
    <div className="left-panel-area">
      <aside id="leftsidebar" className="sidebar mobile-none" ref={sidebarRef}>

        {/* ── Website brand badge (same design language as the payroll badge) ── */}
        <Link href="/dashboard/hub" style={{ textDecoration: "none" }} title="Switch dashboard">
          <div style={{
            margin: "20px 10px 4px",
            padding: "12px 14px",
            background: "linear-gradient(135deg,#EEF2FF,#E0E7FF)",
            borderRadius: 12,
            border: "1px solid rgba(99,102,241,.15)",
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: "linear-gradient(135deg,#6366F1,#818CF8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <i className="bi bi-globe2" style={{ fontSize: 15, color: "#fff" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#3730A3", lineHeight: 1.2 }}>Website Panel</div>
              <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 600, opacity: 0.8 }}>viralon.in Management</div>
            </div>
            <i className="bi bi-grid-fill" style={{ fontSize: 13, color: "#818CF8", flexShrink: 0 }} />
          </div>
        </Link>

        {/* Divider */}
        <div style={{ height: 1, background: "#F1F5F9", margin: "8px 10px" }} />

        <div className="menu">
          <ul className="list">
            {menu.map((item) => {
              if (item.comingSoon) {
                return (
                  <li key={item.label} style={{ listStyle: "none" }}>
                    <a
                      href="javascript:void(0);"
                      onClick={(e) => e.preventDefault()}
                      className="waves-effect waves-block"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 16px", textDecoration: "none",
                        cursor: "default", opacity: 0.55,
                      }}
                    >
                      <i className={`bi ${item.biIcon}`} style={{
                        fontSize: 17, width: 20, textAlign: "center", flexShrink: 0,
                        color: "rgba(0,0,0,0.4)",
                      }} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
                        background: "#EEF2FF", color: "#6366F1",
                        border: "1px solid rgba(99,102,241,.25)",
                        borderRadius: 20, padding: "2px 7px", textTransform: "uppercase",
                      }}>
                        Soon
                      </span>
                    </a>
                  </li>
                );
              }

              const active = isActive(item);
              return (
                <li key={item.href} className={active ? "active" : ""}>
                  <Link
                    href={item.href}
                    className="waves-effect waves-block flex items-center gap-2"
                  >
                    <i className={`bi ${item.biIcon}`} style={{
                      fontSize: 17,
                      color: active ? "#818CF8" : "rgba(0,0,0,0.5)",
                      width: 20, textAlign: "center", flexShrink: 0,
                    }} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}

            {/* ── Divider ── */}
            <li style={{ listStyle: "none" }}>
              <div style={{ height: 1, background: "#E0E7FF", margin: "10px 10px 6px" }} />
            </li>

            {/* ── Switch back to hub / payroll ── */}
            <li style={{ listStyle: "none" }}>
              <Link
                href="/dashboard/hub"
                className="waves-effect waves-block"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", textDecoration: "none" }}
              >
                <i className="bi bi-grid-fill" style={{ fontSize: 17, width: 20, textAlign: "center", flexShrink: 0, color: "rgba(0,0,0,0.5)" }} />
                <span style={{ flex: 1 }}>Back to Hub</span>
              </Link>
            </li>
            <li style={{ listStyle: "none" }}>
              <Link
                href="/"
                className="waves-effect waves-block"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", textDecoration: "none" }}
              >
                <i className="bi bi-cash-stack" style={{ fontSize: 17, width: 20, textAlign: "center", flexShrink: 0, color: "rgba(0,0,0,0.5)" }} />
                <span style={{ flex: 1 }}>Switch to Payroll</span>
              </Link>
            </li>
          </ul>
        </div>
      </aside>

      <div className="admin-profile-area mobile-none" style={{
        position: "fixed", bottom: 0, left: 0, width: 250,
        background: "#fff", borderTop: "1px solid #F1F5F9",
        padding: "10px 10px 12px", zIndex: 11,
      }}>
        <button
          onClick={() => {
            // A salesperson has their own session cookies to drop as well.
            if (perms) fetch("/api/sales/logout").finally(() => router.push("/sales/login"));
            else confirmLogout(router);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 13,
            transition: "background .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
          onMouseLeave={e => e.currentTarget.style.background = "#FEF2F2"}
        >
          <i className="bi bi-box-arrow-right" style={{ fontSize: 16 }} />
          Log out
        </button>
      </div>
    </div>
  );
}
