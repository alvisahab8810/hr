"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { confirmLogout } from "./Logout";
import { readDept, deptName, WEBSITE_MENUS } from "../utils/dept";
function salesPerms() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/sales_perms=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}
const MENU = [
  {
    href: "/dashboard/website",
    perm: "home",
    label: "Website Home",
    biIcon: "bi-house-door-fill",
    match: ["/dashboard/website"],
    exact: true
  },
  {
    href: "/dashboard/admin/blogs",
    perm: "blogs",
    label: "Blogs",
    biIcon: "bi-file-earmark-text-fill",
    match: ["/dashboard/admin/blogs"]
  },
  {
    href: "/dashboard/website/careers",
    perm: "careers",
    label: "Careers",
    biIcon: "bi-briefcase-fill",
    match: ["/dashboard/website/careers"]
  },
  {
    href: "/dashboard/website/positions",
    perm: "positions",
    label: "Job Positions",
    biIcon: "bi-megaphone-fill",
    match: ["/dashboard/website/positions"]
  },
  {
    href: "/dashboard/website/pages",
    perm: "pages",
    label: "Landing Pages",
    biIcon: "bi-window-stack",
    match: ["/dashboard/website/pages"]
  },
  {
    href: "/dashboard/website/faqs",
    perm: "faqs",
    label: "FAQs",
    biIcon: "bi-question-circle-fill",
    match: ["/dashboard/website/faqs"]
  },
  {
    href: "/dashboard/website/case-studies",
    perm: "caseStudies",
    label: "Case Studies",
    biIcon: "bi-trophy-fill",
    match: ["/dashboard/website/case-studies"]
  },
  {
    href: "/dashboard/website/page-seo",
    perm: "pageSeo",
    label: "Pages SEO",
    biIcon: "bi-search",
    match: ["/dashboard/website/page-seo"]
  },
  {
    href: "/dashboard/website/leads",
    perm: "leads",
    label: "Leads",
    biIcon: "bi-person-lines-fill",
    match: ["/dashboard/website/leads"]
  },
  {
    href: "/dashboard/website/proposals",
    perm: "proposals",
    label: "Proposals",
    biIcon: "bi-file-earmark-text-fill",
    match: ["/dashboard/website/proposals"]
  },
  {
    href: "/dashboard/website/invoices",
    perm: "invoices",
    label: "Invoices",
    biIcon: "bi-receipt",
    match: ["/dashboard/website/invoices"]
  },
  {
    href: "/dashboard/admin/tasks/brands",
    perm: "brands",
    label: "Brands",
    biIcon: "bi-bookmark-star-fill",
    match: ["/dashboard/admin/tasks/brands"]
  },
  {
    href: "/dashboard/website/lead-profile",
    perm: "leadProfile",
    label: "Lead profile",
    biIcon: "bi-person-vcard-fill",
    match: ["/dashboard/website/lead-profile"]
  },
  {
    href: "/dashboard/website/sales-team",
    label: "Sales team",
    biIcon: "bi-people-fill",
    perm: "salesTeam",
    match: ["/dashboard/website/sales-team"]
  },
  {
    href: "/dashboard/website/reports",
    label: "Reports",
    biIcon: "bi-bar-chart-fill",
    perm: "reports",
    match: ["/dashboard/website/reports"]
  },
  {
    href: "/dashboard/website/newsletter",
    perm: "newsletter",
    label: "Newsletter",
    biIcon: "bi-envelope-paper-fill",
    match: ["/dashboard/website/newsletter"]
  },
  {
    href: "/dashboard/website/settings",
    label: "Settings",
    biIcon: "bi-gear-fill",
    perm: "settings",
    match: ["/dashboard/website/settings"]
  }
];
export default function WebsiteLeftbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef(null);
  const [perms, setPerms] = useState(null);
  const [dept, setDept] = useState("");
  const [isSales, setIsSales] = useState(false);
  useEffect(() => {
    setDept(readDept());
    const p = salesPerms();
    setPerms(p);
    setIsSales(!!p);
  }, []);
  const allowed = perms ? MENU.filter((i) => i.perm && perms[i.perm]) : MENU;
  const only = WEBSITE_MENUS[dept];
  const menu = only ? allowed.filter((i) => only.includes(i.perm)) : allowed;
  const isActive = (item) => {
    if (!pathname) return false;
    if (item.exact) return pathname === item.href || pathname === `${item.href}/`;
    return item.match?.some((p) => pathname.startsWith(p));
  };
  return /* @__PURE__ */ React.createElement("div", { className: "left-panel-area" }, /* @__PURE__ */ React.createElement("aside", { id: "leftsidebar", className: "sidebar mobile-none", ref: sidebarRef }, /* @__PURE__ */ React.createElement(Link, { href: "/dashboard/hub", style: { textDecoration: "none" }, title: "Switch dashboard" }, /* @__PURE__ */ React.createElement("div", { style: {
    margin: "20px 10px 4px",
    padding: "12px 14px",
    background: "linear-gradient(135deg,#EEF2FF,#E0E7FF)",
    borderRadius: 12,
    border: "1px solid rgba(99,102,241,.15)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer"
  } }, /* @__PURE__ */ React.createElement("div", { style: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: "linear-gradient(135deg,#6366F1,#818CF8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-globe2", style: { fontSize: 15, color: "#fff" } })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: "#3730A3", lineHeight: 1.2 } }, deptName(dept) || "Website", " Panel"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6366F1", fontWeight: 600, opacity: 0.8 } }, dept === "marketing" ? "Content & campaigns" : dept === "sales" ? "Pipeline & revenue" : "viralon.in Management")), /* @__PURE__ */ React.createElement("i", { className: "bi bi-grid-fill", style: { fontSize: 13, color: "#818CF8", flexShrink: 0 } }))), /* @__PURE__ */ React.createElement("div", { style: { height: 1, background: "#F1F5F9", margin: "8px 10px" } }), /* @__PURE__ */ React.createElement("div", { className: "menu" }, /* @__PURE__ */ React.createElement("ul", { className: "list" }, menu.map((item) => {
    if (item.comingSoon) {
      return /* @__PURE__ */ React.createElement("li", { key: item.label, style: { listStyle: "none" } }, /* @__PURE__ */ React.createElement(
        "a",
        {
          href: "javascript:void(0);",
          onClick: (e) => e.preventDefault(),
          className: "waves-effect waves-block",
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            textDecoration: "none",
            cursor: "default",
            opacity: 0.55
          }
        },
        /* @__PURE__ */ React.createElement("i", { className: `bi ${item.biIcon}`, style: {
          fontSize: 17,
          width: 20,
          textAlign: "center",
          flexShrink: 0,
          color: "rgba(0,0,0,0.4)"
        } }),
        /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, item.label),
        /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.05em",
          background: "#EEF2FF",
          color: "#6366F1",
          border: "1px solid rgba(99,102,241,.25)",
          borderRadius: 20,
          padding: "2px 7px",
          textTransform: "uppercase"
        } }, "Soon")
      ));
    }
    const active = isActive(item);
    return /* @__PURE__ */ React.createElement("li", { key: item.href, className: active ? "active" : "" }, /* @__PURE__ */ React.createElement(
      Link,
      {
        href: item.href,
        className: "waves-effect waves-block flex items-center gap-2"
      },
      /* @__PURE__ */ React.createElement("i", { className: `bi ${item.biIcon}`, style: {
        fontSize: 17,
        color: active ? "#818CF8" : "rgba(0,0,0,0.5)",
        width: 20,
        textAlign: "center",
        flexShrink: 0
      } }),
      /* @__PURE__ */ React.createElement("span", null, item.label)
    ));
  }), !isSales && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("li", { style: { listStyle: "none" } }, /* @__PURE__ */ React.createElement("div", { style: { height: 1, background: "#E0E7FF", margin: "10px 10px 6px" } })), /* @__PURE__ */ React.createElement("li", { style: { listStyle: "none" } }, /* @__PURE__ */ React.createElement(
    Link,
    {
      href: "/dashboard/hub",
      className: "waves-effect waves-block",
      style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", textDecoration: "none" }
    },
    /* @__PURE__ */ React.createElement("i", { className: "bi bi-grid-fill", style: { fontSize: 17, width: 20, textAlign: "center", flexShrink: 0, color: "rgba(0,0,0,0.5)" } }),
    /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, "Back to Hub")
  )))))), /* @__PURE__ */ React.createElement("div", { className: "admin-profile-area mobile-none", style: {
    position: "fixed",
    bottom: 0,
    left: 0,
    width: 250,
    background: "#fff",
    borderTop: "1px solid #F1F5F9",
    padding: "10px 10px 12px",
    zIndex: 11
  } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        if (perms) fetch("/api/sales/logout").finally(() => router.push("/sales/login"));
        else confirmLogout(router);
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        background: "#FEF2F2",
        color: "#DC2626",
        fontWeight: 700,
        fontSize: 13,
        transition: "background .15s"
      },
      onMouseEnter: (e) => e.currentTarget.style.background = "#FEE2E2",
      onMouseLeave: (e) => e.currentTarget.style.background = "#FEF2F2"
    },
    /* @__PURE__ */ React.createElement("i", { className: "bi bi-box-arrow-right", style: { fontSize: 16 } }),
    "Log out"
  )));
}
