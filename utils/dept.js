// utils/dept.js — which department the admin picked on /dashboard/hub.
// The hub writes it, the two sidebars read it and show only that team's menus.
// It is a view preference, not a permission: the pages themselves are unchanged
// and are still reachable by URL.

export const DEPTS = [
  { k: "hr",        n: "HR",         href: "/",                        icon: "bi-people-fill" },
  { k: "ops",       n: "Operations", href: "/dashboard/admin/tasks",   icon: "bi-kanban-fill" },
  { k: "sales",     n: "Sales",      href: "/dashboard/website/leads", icon: "bi-graph-up-arrow" },
  { k: "marketing", n: "Marketing",  href: "/dashboard/admin/blogs",   icon: "bi-megaphone-fill" },
  { k: "finance",   n: "Finance",    href: "",                         icon: "bi-cash-coin" },
];

export const deptName = (k) => DEPTS.find((d) => d.k === k)?.n || "";

const COOKIE = "vp_dept";

export function readDept() {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)vp_dept=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export function writeDept(k) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${encodeURIComponent(k)}; path=/; max-age=31536000; samesite=lax`;
}

/* Which website menus each team sees. Everything the website sidebar carries is
   listed once, so nothing becomes unreachable from the hub. */
export const WEBSITE_MENUS = {
  sales: ["home", "leads", "leadProfile", "proposals", "invoices", "salesTeam", "settings"],
  marketing: ["home", "blogs", "pages", "leads", "reports", "faqs", "careers", "positions"],
};

/* A salesperson login is the Sales department, nothing else. There is no
   per-person picking any more: whoever is onboarded gets exactly these
   menus, and every other page redirects them to the login screen. */
export const SALES_ROLE_MENUS = ["home", "leads", "leadProfile", "proposals", "invoices"];
export const salesRolePerms = () =>
  SALES_ROLE_MENUS.reduce((a, k) => ({ ...a, [k]: true }), {});
