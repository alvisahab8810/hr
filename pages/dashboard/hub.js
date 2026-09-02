// pages/dashboard/hub.js
// Landing screen after login — the admin picks which world to enter:
//   1. Payroll  → the existing payroll dashboard ("/"), completely unchanged
//   2. Website  → the new website-management section (/dashboard/website)
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

function getGreeting() {
  try {
    const h = parseInt(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }),
      10
    );
    if (h >= 5 && h < 12)  return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 20) return "evening";
    return "night";
  } catch {
    return "day";
  }
}

const CARDS = [
  {
    key: "payroll",
    href: "/",
    title: "Payroll Dashboard",
    desc: "Employees, attendance, salary reports, leaves, tasks & everything HR.",
    icon: "bi-cash-stack",
    accent: "#4F46E5",
    accentSoft: "#EEF2FF",
    gradient: "linear-gradient(135deg,#6366F1,#4F46E5)",
    chips: ["Employees", "Attendance", "Salary", "Tasks"],
  },
  {
    key: "website",
    href: "/dashboard/website",
    title: "Website Dashboard",
    desc: "Manage viralon.in — blogs, leads, FAQs, quotations & more.",
    icon: "bi-globe2",
    accent: "#EA580C",
    accentSoft: "#FFF7ED",
    gradient: "linear-gradient(135deg,#F97316,#EA580C)",
    chips: ["Blogs", "Leads", "FAQs", "Quotation"],
  },
];

export default function DashboardHub() {
  const router = useRouter();
  const [greeting, setGreeting] = useState("day");
  const [hovered, setHovered] = useState(null);

  useEffect(() => { setGreeting(getGreeting()); }, []);

  return (
    <>
      <Head>
        <title>Dashboard Hub — Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          html, body { margin:0; padding:0; }
          body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; background:#fff; }
          @keyframes hub-in { 0% { opacity:0; transform:translateY(16px); } 100% { opacity:1; transform:translateY(0); } }
          @keyframes hub-glow { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:.9; transform:scale(1.07); } }
          .hub-dotgrid { position:absolute; inset:0; pointer-events:none; opacity:.5;
            background-image: radial-gradient(#E5E7EB 1px, transparent 1px);
            background-size: 26px 26px;
            -webkit-mask-image: radial-gradient(circle at 50% 40%, #000 0%, transparent 72%);
            mask-image: radial-gradient(circle at 50% 40%, #000 0%, transparent 72%); }
          .hub-blob { position:absolute; border-radius:50%; filter:blur(90px); pointer-events:none;
            animation: hub-glow 7s ease-in-out infinite; }
        `}</style>
      </Head>

      <div style={{
        minHeight: "100vh", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 20px", background: "#fff",
      }}>
        <div className="hub-dotgrid" />
        <div className="hub-blob" style={{ width: 420, height: 420, top: -160, left: -140, background: "radial-gradient(circle, rgba(99,102,241,.13), transparent 70%)" }} />
        <div className="hub-blob" style={{ width: 420, height: 420, bottom: -160, right: -140, background: "radial-gradient(circle, rgba(249,115,22,.12), transparent 70%)", animationDelay: "-2.5s" }} />

        {/* Header */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", marginBottom: 40, animation: "hub-in .5s cubic-bezier(.16,1,.3,1)" }}>
          <img src="/assets/images/logo.png" alt="Viralon" width={110} style={{ marginBottom: 18 }} />
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#111827" }}>
            Good {greeting}, Admin
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14.5, color: "#6B7280" }}>
            Where would you like to go today?
          </p>
        </div>

        {/* The 2 boxes */}
        <div style={{
          position: "relative", zIndex: 2,
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 380px))",
          gap: 24, width: "100%", maxWidth: 820, justifyContent: "center",
          animation: "hub-in .6s cubic-bezier(.16,1,.3,1)",
        }}>
          {CARDS.map((c) => {
            const isHover = hovered === c.key;
            return (
              <div
                key={c.key}
                onClick={() => router.push(c.href)}
                onMouseEnter={() => setHovered(c.key)}
                onMouseLeave={() => setHovered(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(c.href); }}
                style={{
                  cursor: "pointer",
                  background: "rgba(255,255,255,.8)",
                  backdropFilter: "blur(14px)",
                  border: `1.5px solid ${isHover ? c.accent : "#E5E7EB"}`,
                  borderRadius: 20,
                  padding: "30px 28px 26px",
                  transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
                  transform: isHover ? "translateY(-5px)" : "none",
                  boxShadow: isHover
                    ? `0 18px 44px ${c.accent}30`
                    : "0 4px 16px rgba(15,23,42,.06)",
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 15,
                  background: c.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 18,
                  boxShadow: `0 8px 20px ${c.accent}45`,
                }}>
                  <i className={`bi ${c.icon}`} style={{ fontSize: 25, color: "#fff" }} />
                </div>

                <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: "#111827" }}>
                  {c.title}
                </h2>
                <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#6B7280", lineHeight: 1.55 }}>
                  {c.desc}
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 20 }}>
                  {c.chips.map((chip) => (
                    <span key={chip} style={{
                      fontSize: 11.5, fontWeight: 700, color: c.accent,
                      background: c.accentSoft, border: `1px solid ${c.accent}25`,
                      borderRadius: 20, padding: "4px 11px",
                    }}>
                      {chip}
                    </span>
                  ))}
                </div>

                <div style={{
                  display: "flex", alignItems: "center", gap: 7,
                  fontSize: 13.5, fontWeight: 700, color: c.accent,
                }}>
                  Open dashboard
                  <i className="bi bi-arrow-right" style={{
                    fontSize: 15,
                    transition: "transform .18s ease",
                    transform: isHover ? "translateX(4px)" : "none",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ position: "relative", zIndex: 2, marginTop: 36, fontSize: 12, color: "#9CA3AF" }}>
          You can switch anytime from inside either dashboard.
        </p>
      </div>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
