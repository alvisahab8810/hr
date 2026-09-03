// pages/dashboard/website/index.js
// Home of the WEBSITE management section — blogs today, leads/faqs/quotation next.
// Follows the exact same UI pattern as the payroll home (pages/index.js):
// same CSS bundle, greeting row + refresh, and the same KpiCard design.
import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import DateTimeGreeting from "@/components/DateTimeGreeting";
import CrmOverview from "@/components/CrmOverview";

/* ─── Reusable top stat card (same design as payroll home) ────────── */
function KpiCard({ icon, label, value, sub, accent, link }) {
  const card = (
    <div className="kpi-card" style={{
      background: `linear-gradient(160deg, #fff 55%, ${accent.bg} 165%)`,
      borderRadius: 16, padding: "17px 18px 16px",
      border: `1px solid ${accent.bg}`, boxShadow: "0 3px 12px rgba(15,23,42,.06)",
      display: "flex", alignItems: "center", gap: 14, height: "100%",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accent.icon }} />
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0,
        background: accent.icon,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 6px 16px ${accent.shadow}`,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 19, color: "#fff" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1.05, letterSpacing: "-0.8px" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: accent.icon, fontWeight: 700, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
  return link
    ? <Link href={link} className="kpi-card-link" style={{ textDecoration: "none", display: "block", height: "100%" }}>{card}</Link>
    : card;
}

const MODULES = [
  {
    key: "blogs",
    title: "Blogs",
    desc: "Write, edit & publish blog posts that go live on viralon.in instantly.",
    icon: "bi-file-earmark-text-fill",
    href: "/dashboard/admin/blogs",
    accent: "#6366F1",
    soft: "#EEF2FF",
    live: true,
  },
  {
    key: "careers",
    title: "Careers",
    desc: "Applications submitted from the website's careers page — with resumes.",
    icon: "bi-briefcase-fill",
    href: "/dashboard/website/careers",
    accent: "#0284C7",
    soft: "#E0F2FE",
    live: true,
  },
  {
    key: "positions",
    title: "Job Positions",
    desc: "Post, edit & close the openings shown on the website's /jobs page.",
    icon: "bi-megaphone-fill",
    href: "/dashboard/website/positions",
    accent: "#DB2777",
    soft: "#FCE7F3",
    live: true,
  },
  {
    key: "seopages",
    title: "SEO Pages",
    desc: "Build landing pages from 10 brand templates & publish at any URL.",
    icon: "bi-window-stack",
    href: "/dashboard/website/pages",
    accent: "#9333EA",
    soft: "#F3E8FF",
    live: true,
  },
  {
    key: "leads",
    title: "Leads",
    desc: "Every website enquiry — chase the ones who never booked a call.",
    icon: "bi-person-lines-fill",
    href: "/dashboard/website/leads",
    accent: "#16A34A",
    soft: "#DCFCE7",
    live: true,
  },
  {
    key: "faqs",
    title: "FAQs",
    desc: "Manage the FAQ sections shown across website pages.",
    icon: "bi-question-circle-fill",
    href: "/dashboard/website/faqs",
    accent: "#0891B2",
    soft: "#CFFAFE",
    live: true,
  },
];

export default function WebsiteDashboard() {
  const router = useRouter();
  const [blogStats, setBlogStats] = useState(null);
  // A salesperson sees their own name here, the admin sees theirs. Read after
  // mount: the cookie does not exist on the server.
  const [who, setWho] = useState("Ivan Sinha");
  const [loading, setLoading]     = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/blogs", { credentials: "include" });
      const data = await r.json();
      if (Array.isArray(data)) {
        setBlogStats({
          total:     data.length,
          published: data.filter(b => b.status === "published").length,
          drafts:    data.filter(b => b.status === "draft").length,
          views:     data.reduce((s, b) => s + (b.views || 0), 0),
        });
      }
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const m = document.cookie.match(/sales_name=([^;]+)/);
    if (m) setWho(decodeURIComponent(m[1]));
  }, []);

  const _v = (val) => loading ? "—" : val ?? "—";

  return (
    <section className="main-dashboard-area">
      <Head>
        <title>Website Dashboard — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .kpi-card-link:hover .kpi-card { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(15,23,42,.12); }
          .greetings-box { margin: 0 !important; padding: 0 !important; }
          .greetings-box > * { margin-bottom: 0 !important; }
        `}</style>
      </Head>

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            {/* ── GREETING ROW (same as payroll home) ─────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div className="greetings-box" style={{ flex: 1, margin: 0 }}><DateTimeGreeting name={who} /></div>
              <button onClick={() => router.reload()} style={{
                border: "none", borderRadius: 10, padding: "9px 18px",
                background: "linear-gradient(135deg,#6366F1,#818CF8)",
                color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 12px rgba(99,102,241,.3)",
                flexShrink: 0,
              }}>
                <i className="bi bi-arrow-clockwise" style={{ fontSize: 14 }} />
                Refresh
              </button>
            </div>

            {/* ── LIVE SALES PICTURE (funnel, revenue, collections) ─ */}
            <CrmOverview />

          </div>
        </section>
      </div>
    </section>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  // The panel home is a salesperson's own dashboard as well.
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=") && !cookie.includes("sales_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
