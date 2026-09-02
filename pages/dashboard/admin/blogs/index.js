// pages/dashboard/admin/blogs/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { MdSearch, MdAdd, MdEdit, MdDelete, MdArticle, MdVisibility } from "react-icons/md";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";

export default function BlogList() {
  const router = useRouter();
  const [blogs, setBlogs]     = useState([]);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/blogs", { credentials: "include" })
      .then(r => r.json())
      .then(data => { setBlogs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function deleteBlog(id) {
    if (!confirm("Delete this blog post?")) return;
    setBlogs(prev => prev.filter(b => b.id !== id));
    await fetch(`/api/admin/blogs/${id}`, { method: "DELETE", credentials: "include" });
  }

  const filtered = blogs.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || (b.title || "").toLowerCase().includes(q) || (b.authorName || "").toLowerCase().includes(q);
    const matchFilter = filter === "all" || b.status === filter;
    return matchSearch && matchFilter;
  });

  const total     = blogs.length;
  const published = blogs.filter(b => b.status === "published").length;
  const drafts    = blogs.filter(b => b.status === "draft").length;
  const views     = blogs.reduce((s, b) => s + (b.views || 0), 0);

  // Same accent format as the payroll home KPI cards
  const stats = [
    { label: "Total Blogs",            value: total,                          icon: "bi-journals",          accent: { bg:"#EEF2FF", icon:"#6366F1", shadow:"rgba(99,102,241,.18)" } },
    { label: "Active Blogs",           value: published,                      icon: "bi-check-circle-fill", accent: { bg:"#DCFCE7", icon:"#16A34A", shadow:"rgba(34,197,94,.18)"  } },
    { label: "Blogs in Draft",         value: drafts,                         icon: "bi-pencil-fill",       accent: { bg:"#FFEDD5", icon:"#EA580C", shadow:"rgba(249,115,22,.18)" } },
    { label: "Total Views this month", value: views.toLocaleString("en-IN"),  icon: "bi-eye-fill",          accent: { bg:"#F3E8FF", icon:"#9333EA", shadow:"rgba(168,85,247,.18)" } },
  ];

  return (
    <section className="main-dashboard-area">
    <div className="main-nav">
      <WebsiteLeftbar />
      <LeftbarMobile />
      <Dashnav />

      <section className="content home">
        <Head>
          <title>Blogs — Viralon</title>
          <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
          <link rel="stylesheet" href="/asets/css/main.css" />
          <link rel="stylesheet" href="/asets/css/admin.css" />
          <link rel="stylesheet" href="/assets/css/backend.css" />
        </Head>

        <div className="block-header">

          {/* ── Compact page header (payroll-style spacing) ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 14px" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(135deg,#6366F1,#818CF8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 16px rgba(99,102,241,.25)",
            }}>
              <i className="bi bi-file-earmark-text-fill" style={{ fontSize: 17, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>Blogs</div>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                Welcome back! Here&apos;s what&apos;s happening with your blog today.
              </div>
            </div>
          </div>

          {/* ── KPI stat cards (same design as payroll home) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 22, marginBottom: 26 }}>
            {stats.map(st => (
              <div key={st.label} className="kpi-card" style={{
                background: `linear-gradient(160deg, #fff 55%, ${st.accent.bg} 165%)`,
                borderRadius: 16, padding: "17px 18px 16px",
                border: `1px solid ${st.accent.bg}`, boxShadow: "0 3px 12px rgba(15,23,42,.06)",
                display: "flex", alignItems: "center", gap: 14,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:st.accent.icon }} />
                <div style={{
                  width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                  background: st.accent.icon,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 6px 16px ${st.accent.shadow}`,
                }}>
                  <i className={`bi ${st.icon}`} style={{ fontSize: 19, color: "#fff" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1.05, letterSpacing: "-0.8px" }}>{loading ? "—" : st.value}</div>
                  <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 3 }}>{st.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Topbar */}
          <div className="bk-topbar" style={{ marginBottom: 14 }}>
            <div className="bk-search-wrap">
              <MdSearch size={18} className="bk-search-icon" />
              <input
                className="bk-search-input"
                placeholder="Search by title or author…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                style={s.filterSelect}
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <button className="bk-add-btn" onClick={() => router.push("/dashboard/admin/blogs/create")}>
                <MdAdd size={18} /> Add New Blog
              </button>
            </div>
          </div>

          {/* Grid — inside a payroll-style panel */}
          <div style={{
            background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
            boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden", marginBottom: 14,
          }}>
          <div style={{
            padding: "14px 18px 12px", borderBottom: "1px solid #F4F4FD",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, background: "#6366F118",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <i className="bi bi-collection-fill" style={{ fontSize: 14, color: "#6366F1" }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Ongoing blogs</span>
            <span style={{ background: "#EEF2FF", color: "#6366F1", fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 20 }}>
              {filtered.length}
            </span>
          </div>
          <div style={{ padding: 18 }}>
          {loading ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <div style={s.empty}>
              <MdArticle size={48} style={{ color: "#d1d5db", marginBottom: 12 }} />
              <p style={{ color: "#9ca3af" }}>No blogs found. Create your first blog post!</p>
              <button className="bk-add-btn" style={{ marginTop: 12 }} onClick={() => router.push("/dashboard/admin/blogs/create")}>
                <MdAdd size={18} /> Add New Blog
              </button>
            </div>
          ) : (
            <div style={s.grid}>
              {filtered.map(blog => (
                <div key={blog.id} style={s.card}>
                  <div style={s.cardImgWrap}>
                    {blog.cardImage?.src || blog.coverImage?.src ? (
                      <img
                        src={blog.cardImage?.src || blog.coverImage?.src}
                        alt={blog.cardImage?.alt || blog.title}
                        style={s.cardImg}
                        onError={e => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <div style={s.cardImgPlaceholder}><MdArticle size={36} style={{ color: "#d1d5db" }} /></div>
                    )}
                    <span style={{ ...s.badge, background: blog.status === "published" ? "#dcfce7" : blog.status === "scheduled" ? "#fef3c7" : "#f3f4f6", color: blog.status === "published" ? "#15803d" : blog.status === "scheduled" ? "#b45309" : "#6b7280" }}>
                      {blog.status === "published" ? "Live" : blog.status === "scheduled" ? "Scheduled" : "Draft"}
                    </span>
                  </div>
                  <div style={s.cardBody}>
                    {blog.categories?.length > 0 && (
                      <p style={s.cardCat}>{blog.categories[0]}</p>
                    )}
                    <h3 style={s.cardTitle} title={blog.title}>
                      {blog.title?.length > 55 ? blog.title.slice(0, 55) + "…" : blog.title}
                    </h3>
                    {blog.authorName && <p style={s.cardAuthor}>By {blog.authorName}</p>}
                    <div style={s.cardMeta}>
                      <span><MdVisibility size={13} style={{ verticalAlign: "middle", marginRight: 3 }} />{blog.views || 0} views</span>
                      <span>{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}</span>
                    </div>
                  </div>
                  <div style={s.cardActions}>
                    <button style={s.editBtn} onClick={() => router.push(`/dashboard/admin/blogs/create?id=${blog.id}`)}>
                      <MdEdit size={14} /> Edit
                    </button>
                    <button style={s.delBtn} onClick={() => deleteBlog(blog.id)}>
                      <MdDelete size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
          </div>
        </div>
      </section>
    </div>
    </section>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}

const s = {
  statsRow:   { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, margin: "20px 0 28px" },
  statCard:   { background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #e8eaf0" },
  statLabel:  { fontSize: 13, color: "#6b7280", margin: "0 0 6px", fontWeight: 500 },
  statValue:  { fontSize: 28, fontWeight: 800, color: "#1a1a2e", margin: 0 },
  filterSelect: { border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "9px 14px", fontSize: 13, background: "#fff", cursor: "pointer", outline: "none" },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 },
  empty:      { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" },
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 20 },
  card:       { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #e8eaf0", display: "flex", flexDirection: "column" },
  cardImgWrap:{ position: "relative", height: 160, background: "#f3f4f6", flexShrink: 0 },
  cardImg:    { width: "100%", height: "100%", objectFit: "cover" },
  cardImgPlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  badge:      { position: "absolute", top: 10, left: 10, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 },
  cardBody:   { padding: "14px 14px 8px", flex: 1 },
  cardCat:    { fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 5px" },
  cardTitle:  { fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px", lineHeight: 1.4 },
  cardAuthor: { fontSize: 12, color: "#9ca3af", margin: "0 0 6px" },
  cardMeta:   { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" },
  cardActions:{ display: "flex", gap: 8, padding: "10px 14px 14px", borderTop: "1px solid #f3f4f6" },
  editBtn:    { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#2563eb", color: "#fff", border: "none", borderRadius: 7, padding: "8px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  delBtn:     { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "#fff2f2", color: "#e84949", border: "1px solid #fecaca", borderRadius: 7, padding: "8px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
