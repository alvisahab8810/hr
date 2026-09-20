// pages/dashboard/website/page-seo.js — Pages SEO manager (Website → Pages SEO).
// One record per website page: title, keywords, description, canonical, Open
// Graph, robots directives and any number of JSON-LD schema blocks. It writes
// the shared Mongo "pageseos" collection that viralon-new reads in
// getStaticProps, so saving here changes the live <head> within a minute.
//
// Built on the same panels, table and buttons as Website → FAQs, and the
// schema editor behaves exactly like the one in the blog editor.
import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { SITE_PAGES, SITE_PAGE_GROUPS, getSitePage } from "@/utils/sitePages";
import { confirmDialog } from "../../../components/ConfirmDialog";

// Same idea as the blog editor's list, tilted towards the types a marketing
// page actually uses.
const SCHEMA_TYPES = [
  "WebPage", "Organization", "LocalBusiness", "BreadcrumbList", "FAQPage",
  "Service", "Product", "Article", "BlogPosting", "NewsArticle", "HowTo",
  "Event", "Person", "WebSite", "ProfessionalService",
];

const DEFAULT_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1";

// The three presets the blog editor offers, so both editors behave alike.
const ROBOTS_PRESETS = [
  ["index, follow", DEFAULT_ROBOTS],
  ["noindex", "noindex, nofollow"],
  ["noarchive", "index, follow, noarchive"],
];

// Canonicals and schema URLs point at the permanent domain, not the staging
// subdomain the site runs on today.
const BASE_URL = "https://viralon.in";

const EMPTY_FORM = {
  pageKey: "",
  title: "",
  metaKeywords: "",
  metaDescription: "",
  canonical: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterCard: "summary_large_image",
  metaRobots: DEFAULT_ROBOTS,
  xRobotsTag: DEFAULT_ROBOTS,
  schemas: [{ type: "WebPage", content: "" }],
  status: "published",
};

const _v = (n) => (n === null || n === undefined ? "…" : n);

/* ─── Schema builder — fills a block from whatever the form already holds ── */
function buildSchemaJson(type, form) {
  const page = getSitePage(form.pageKey);
  const url = form.canonical || `${BASE_URL}${page?.path || "/"}`;
  const name = form.title || page?.label || "";
  const description = form.metaDescription || "";
  const image = form.ogImage
    ? (form.ogImage.startsWith("http") ? form.ogImage : `${BASE_URL}${form.ogImage}`)
    : null;
  const imageObj = image ? { "@type": "ImageObject", url: image } : null;

  if (type === "BreadcrumbList") {
    const crumbs = [{ "@type": "ListItem", position: 1, name: "Home", item: BASE_URL }];
    if (page && page.path !== "/") {
      crumbs.push({ "@type": "ListItem", position: 2, name: page.label, item: url });
    }
    return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs };
  }

  if (type === "FAQPage") {
    // The questions themselves are managed in Website → FAQs and the site
    // prints them from there, so this is generated as the empty shell.
    return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [] };
  }

  if (type === "Organization" || type === "LocalBusiness" || type === "ProfessionalService") {
    return {
      "@context": "https://schema.org",
      "@type": type,
      name: "Viralon",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/assets/img/logo.png` },
      description,
      ...(type === "Organization"
        ? { sameAs: [] }
        : { address: { "@type": "PostalAddress", addressCountry: "IN" } }),
    };
  }

  if (type === "WebSite") {
    return { "@context": "https://schema.org", "@type": "WebSite", name: "Viralon", url: BASE_URL, description };
  }

  if (type === "Service") {
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      name,
      description,
      url,
      ...(imageObj ? { image: imageObj } : {}),
      provider: { "@type": "Organization", name: "Viralon", url: BASE_URL },
      areaServed: "IN",
    };
  }

  if (type === "Product") {
    return {
      "@context": "https://schema.org", "@type": "Product", name, description, url,
      ...(imageObj ? { image: imageObj } : {}),
      brand: { "@type": "Brand", name: "Viralon" },
    };
  }

  if (type === "Person") {
    return { "@context": "https://schema.org", "@type": "Person", name: name || "Viralon", url, description };
  }

  if (type === "Event") {
    const today = new Date().toISOString().slice(0, 10);
    return {
      "@context": "https://schema.org", "@type": "Event", name, description, url,
      ...(imageObj ? { image: imageObj } : {}),
      startDate: today, endDate: today,
      organizer: { "@type": "Organization", name: "Viralon", url: BASE_URL },
      eventStatus: "https://schema.org/EventScheduled",
    };
  }

  if (type === "HowTo") {
    return {
      "@context": "https://schema.org", "@type": "HowTo", name, description,
      ...(imageObj ? { image: imageObj } : {}), step: [],
    };
  }

  if (type === "Article" || type === "BlogPosting" || type === "NewsArticle") {
    const today = new Date().toISOString().slice(0, 10);
    return {
      "@context": "https://schema.org", "@type": type,
      headline: name, description, url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      ...(imageObj ? { image: imageObj } : {}),
      author: { "@type": "Organization", name: "Viralon" },
      publisher: {
        "@type": "Organization", name: "Viralon", url: BASE_URL,
        logo: { "@type": "ImageObject", url: `${BASE_URL}/assets/img/logo.png` },
      },
      datePublished: today, dateModified: today,
    };
  }

  // WebPage, and the fallback for anything else.
  return {
    "@context": "https://schema.org", "@type": type || "WebPage",
    name, description, url,
    ...(imageObj ? { primaryImageOfPage: imageObj } : {}),
    isPartOf: { "@type": "WebSite", name: "Viralon", url: BASE_URL },
    publisher: { "@type": "Organization", name: "Viralon", url: BASE_URL },
  };
}

function Field({ label, hint, children, span }) {
  return (
    <div style={{ ...s.field, gridColumn: span ? "1 / -1" : undefined }}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
      {hint && <div style={s.fieldHint}>{hint}</div>}
    </div>
  );
}

/* ─── Length meter: green inside the range Google renders, amber outside ── */
function Counter({ value, min, max }) {
  const n = (value || "").length;
  const ok = n >= min && n <= max;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: n === 0 ? "#94A3B8" : ok ? "#16A34A" : "#EA580C" }}>
      {n} / {max}
    </span>
  );
}

/* ─── Google result preview ── */
function SerpPreview({ form }) {
  const page = getSitePage(form.pageKey);
  const url = form.canonical || `${BASE_URL}${page?.path || "/"}`;
  const noindex = /noindex/i.test(form.metaRobots || "");
  return (
    <div style={{ background: "#fff", border: "1px solid #EEF0F7", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#4D5156" }}>{url.replace(/^https?:\/\//, "")}</div>
      <div style={{ fontSize: 18, color: "#1A0DAB", marginTop: 4, lineHeight: 1.3 }}>
        {form.title || page?.label || "Page title"}
      </div>
      <div style={{ fontSize: 13, color: "#4D5156", marginTop: 4, lineHeight: 1.6 }}>
        {form.metaDescription || "Write a description and it shows here, the way Google prints it."}
      </div>
      {noindex && (
        <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: "#DC2626" }}>
          This page is set to noindex — it will not appear in search at all.
        </div>
      )}
    </div>
  );
}

/* ─── Top stat card, same design as the rest of the dashboard ── */
function KpiCard({ icon, label, value, accent }) {
  return (
    <div className="kpi-card" style={{
      background: `linear-gradient(160deg, #fff 55%, ${accent.bg} 165%)`,
      borderRadius: 16, padding: "17px 18px 16px",
      border: `1px solid ${accent.bg}`, boxShadow: "0 3px 12px rgba(15,23,42,.06)",
      display: "flex", alignItems: "center", gap: 14, height: "100%",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon }} />
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: accent.icon,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 6px 16px ${accent.shadow}`,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 19, color: "#fff" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1.05, letterSpacing: "-0.8px" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function PageSeoAdmin({ websiteOrigin }) {
  const [rows, setRows] = useState([]);
  const [pages, setPages] = useState(SITE_PAGES.map((p) => ({ ...p, used: false })));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/page-seo");
      const json = await res.json();
      if (json.success) {
        setRows(json.data || []);
        setPages(json.pages || []);
      } else toast.error(json.message || "Could not load");
    } catch {
      toast.error("Could not load");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const publishedCount = useMemo(() => rows.filter((r) => r.status === "published").length, [rows]);
  const schemaCount = useMemo(() => rows.reduce((n, r) => n + (r.schemas?.length || 0), 0), [rows]);
  const noindexCount = useMemo(() => rows.filter((r) => /noindex/i.test(r.metaRobots || "")).length, [rows]);

  const f = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const startCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setView("form"); };

  const startEdit = (row) => {
    setEditingId(row._id);
    setForm({
      ...EMPTY_FORM,
      ...row,
      metaRobots: row.metaRobots || DEFAULT_ROBOTS,
      xRobotsTag: row.xRobotsTag || DEFAULT_ROBOTS,
      twitterCard: row.twitterCard || "summary_large_image",
      schemas: row.schemas?.length
        ? row.schemas.map((sc) => ({ ...sc }))
        : [{ type: "WebPage", content: "" }],
    });
    setView("form");
  };

  const backToList = () => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); };

  const addSchema = () => setForm((p) => ({ ...p, schemas: [...p.schemas, { type: "WebPage", content: "" }] }));
  const removeSchema = (i) => setForm((p) => ({ ...p, schemas: p.schemas.filter((_, idx) => idx !== i) }));
  const updateSchema = (i, k, v) =>
    setForm((p) => ({ ...p, schemas: p.schemas.map((sc, idx) => (idx === i ? { ...sc, [k]: v } : sc)) }));
  const generateSchemaAt = (i) =>
    updateSchema(i, "content", JSON.stringify(buildSchemaJson(form.schemas[i].type, form), null, 2));
  const copySchemaAt = (i) => {
    navigator.clipboard?.writeText(form.schemas[i]?.content || "");
    toast.success("Schema copied");
  };

  const save = async (status) => {
    if (!form.pageKey) return toast.error("Pick which page this SEO belongs to");
    // A broken JSON-LD block would be printed straight into the page, so it is
    // caught here rather than on the live site.
    for (let i = 0; i < form.schemas.length; i += 1) {
      const content = (form.schemas[i].content || "").trim();
      if (!content) continue;
      try { JSON.parse(content); } catch { return toast.error(`Schema ${i + 1} is not valid JSON`); }
    }

    setSaving(true);
    const url = editingId ? `/api/admin/page-seo/${editingId}` : "/api/admin/page-seo";
    try {
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(status === "published" ? "SEO published" : "Draft saved");
        await fetchRows();
        backToList();
      } else toast.error(json.message || "Could not save");
    } catch {
      toast.error("Could not save");
    }
    setSaving(false);
  };

  const remove = async (row) => {
    const ok = await confirmDialog(
      `Delete the SEO record for "${row.pageLabel || row.pageKey}"? The page falls back to its built-in title and the default robots directives.`
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/page-seo/${row._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("Deleted"); fetchRows(); }
      else toast.error(json.message || "Could not delete");
    } catch {
      toast.error("Could not delete");
    }
  };

  const selectedPage = getSitePage(form.pageKey);

  return (
    <section className="main-dashboard-area">
      <Head><title>Pages SEO — Website</title></Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {view === "form" ? (
                  <button onClick={backToList} title="Back" style={{
                    width: 38, height: 38, borderRadius: 10, border: "1px solid #E2E8F0",
                    background: "#fff", color: "#475569", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <i className="bi bi-arrow-left" style={{ fontSize: 15 }} />
                  </button>
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: "linear-gradient(135deg,#6366F1,#818CF8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 5px 14px rgba(99,102,241,.25)",
                  }}>
                    <i className="bi bi-search" style={{ fontSize: 17, color: "#fff" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>
                    {view === "form" ? (editingId ? "Edit Page SEO" : "New Page SEO") : "Pages SEO"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                    {view === "form"
                      ? "Title, description, robots directives and JSON-LD — saved straight into the page's head."
                      : "One SEO record per website page — title, keywords, description, robots and schema."}
                  </div>
                </div>
              </div>

              {view === "list" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={fetchRows} disabled={loading} title="Refresh" style={{
                    width: 38, height: 38, borderRadius: 10, border: "1px solid #E2E8F0",
                    background: "#fff", color: "#475569", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className="bi bi-arrow-clockwise" style={{ fontSize: 15 }} />
                  </button>
                  <button onClick={startCreate} style={{
                    border: "none", borderRadius: 10, padding: "9px 18px",
                    background: "linear-gradient(135deg,#6366F1,#818CF8)",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    boxShadow: "0 4px 12px rgba(99,102,241,.3)",
                  }}>
                    <i className="bi bi-plus-lg" style={{ fontSize: 14 }} /> New Page SEO
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={backToList} disabled={saving} style={{
                    height: 38, padding: "0 16px", borderRadius: 10,
                    border: "1px solid #E2E8F0", background: "#fff", color: "#475569",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>
                    Cancel
                  </button>
                  <button onClick={() => save("draft")} disabled={saving} style={{
                    height: 38, padding: "0 16px", borderRadius: 10,
                    border: "1px solid #C7D2FE", background: "#F8FAFF", color: "#6366F1",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1,
                  }}>
                    Save Draft
                  </button>
                  <button onClick={() => save("published")} disabled={saving} style={{
                    border: "none", borderRadius: 10, padding: "0 20px", height: 38,
                    background: "linear-gradient(135deg,#6366F1,#818CF8)",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    boxShadow: "0 4px 12px rgba(99,102,241,.3)", opacity: saving ? 0.6 : 1,
                  }}>
                    <i className="bi bi-globe2" style={{ fontSize: 14 }} />
                    {saving ? "Saving…" : "Publish"}
                  </button>
                </div>
              )}
            </div>

            {view === "list" ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 22, marginBottom: 26 }}>
                  <KpiCard icon="bi-search"       label="SEO Records"   value={_v(rows.length)}                   accent={{ bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" }} />
                  <KpiCard icon="bi-globe2"       label="Live on site"  value={_v(publishedCount)}                accent={{ bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)" }} />
                  <KpiCard icon="bi-code-square"  label="Schema Blocks" value={_v(schemaCount)}                   accent={{ bg: "#FFEDD5", icon: "#EA580C", shadow: "rgba(249,115,22,.18)" }} />
                  <KpiCard icon="bi-window-stack" label="Pages Covered" value={`${rows.length}/${pages.length}`}  accent={{ bg: "#F3E8FF", icon: "#9333EA", shadow: "rgba(168,85,247,.18)" }} />
                </div>

                {noindexCount > 0 && (
                  <div style={{
                    background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12,
                    padding: "10px 14px", fontSize: 12.5, fontWeight: 700, color: "#DC2626", marginBottom: 16,
                  }}>
                    {noindexCount} page{noindexCount > 1 ? "s are" : " is"} set to noindex — they will not appear in search.
                  </div>
                )}

                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-search" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Page SEO</span>
                    <span style={s.countChip}>{loading ? "…" : rows.length}</span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="sp-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                          {["Page", "Title", "Robots", "Schema", "Status", "Updated", "Actions"].map((h) => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={7} style={s.emptyCell}>Loading…</td></tr>
                        ) : rows.length === 0 ? (
                          <tr><td colSpan={7} style={s.emptyCell}>
                            No SEO records yet — click <b>New Page SEO</b> and pick a page.
                          </td></tr>
                        ) : rows.map((row) => {
                          const page = getSitePage(row.pageKey);
                          const noindex = /noindex/i.test(row.metaRobots || "");
                          return (
                            <tr key={row._id}>
                              <td style={{ ...s.td, fontWeight: 700, color: "#0F172A" }}>
                                {row.pageLabel || page?.label || row.pageKey}
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginTop: 2 }}>
                                  {page?.path || row.path || `/${row.pageKey}`}
                                </div>
                              </td>
                              <td style={{ ...s.td, maxWidth: 260 }}>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {row.title || <span style={{ color: "#94A3B8" }}>—</span>}
                                </div>
                              </td>
                              <td style={s.td}>
                                <span style={{
                                  display: "inline-block", padding: "4px 10px", borderRadius: 999,
                                  fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
                                  background: noindex ? "#FEF2F2" : "#F1F5F9",
                                  color: noindex ? "#DC2626" : "#475569",
                                }}>
                                  {noindex ? "noindex" : "index, follow"}
                                </span>
                              </td>
                              <td style={s.td}><span style={s.countChip}>{row.schemas?.length || 0}</span></td>
                              <td style={s.td}>
                                <span style={{
                                  display: "inline-block", padding: "4px 10px", borderRadius: 999,
                                  fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                                  background: row.status === "published" ? "#DCFCE7" : "#FFEDD5",
                                  color: row.status === "published" ? "#16A34A" : "#EA580C",
                                }}>
                                  {row.status === "published" ? "Published" : "Draft"}
                                </span>
                              </td>
                              <td style={{ ...s.td, whiteSpace: "nowrap", color: "#64748B" }}>
                                {row.updatedAt
                                  ? new Date(row.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                  : "—"}
                              </td>
                              <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                                <button onClick={() => startEdit(row)} style={s.actionBtn("#EEF2FF", "#6366F1")}>
                                  <i className="bi bi-pencil-fill" style={{ fontSize: 10 }} /> Edit
                                </button>
                                {page && (
                                  <a href={`${websiteOrigin}${page.path}`} target="_blank" rel="noreferrer"
                                     style={{ ...s.actionBtn("#F1F5F9", "#475569"), textDecoration: "none" }}>
                                    <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10 }} /> View
                                  </a>
                                )}
                                <button onClick={() => remove(row)} style={s.actionBtn("#FEF2F2", "#DC2626")}>
                                  <i className="bi bi-trash-fill" style={{ fontSize: 10 }} /> Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* ── Form ────────────────────────────────────────────── */
              <div className="seo-form-grid"
                   style={{ display: "grid", gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)", gap: 16, marginTop: 22, alignItems: "start" }}>
                <div>
                  {/* Which page */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-window-stack" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Which page</span>
                    </div>
                    <div style={{ padding: 18 }}>
                      <Field label="Page" hint="Greyed-out pages already have an SEO record — edit that one from the list instead." span>
                        <select className="sp-input" style={s.input} value={form.pageKey}
                                onChange={(e) => f("pageKey", e.target.value)}>
                          <option value="">Select a page…</option>
                          {Object.entries(SITE_PAGE_GROUPS).map(([group, list]) => (
                            <optgroup key={group} label={group}>
                              {list.map((p) => {
                                const used = pages.find((x) => x.key === p.key)?.used;
                                const taken = used && p.key !== form.pageKey;
                                return (
                                  <option key={p.key} value={p.key} disabled={taken}>
                                    {p.label} ({p.path}){taken ? " — already set" : ""}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>

                  {/* Meta tags */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-card-heading" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Meta tags</span>
                    </div>
                    <div style={{ padding: 18, display: "grid", gap: 14 }}>
                      <Field label="Title" hint="The browser tab, and the blue line in Google." span>
                        <input className="sp-input" style={s.input} value={form.title}
                               placeholder="Viralon | Paid Ads That Pay Back"
                               onChange={(e) => f("title", e.target.value)} />
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Counter value={form.title} min={30} max={60} />
                        </div>
                      </Field>

                      <Field label="Meta Description" hint="The grey paragraph under the title in search results." span>
                        <textarea className="sp-input"
                                  style={{ ...s.input, height: 84, padding: "10px 12px", lineHeight: 1.6, resize: "vertical" }}
                                  value={form.metaDescription}
                                  placeholder="What this page is about, in one sentence a buyer would recognise."
                                  onChange={(e) => f("metaDescription", e.target.value)} />
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Counter value={form.metaDescription} min={70} max={160} />
                        </div>
                      </Field>

                      <Field label="Meta Keywords" hint="Comma separated. Google ignores these; other crawlers still read them." span>
                        <input className="sp-input" style={s.input} value={form.metaKeywords}
                               placeholder="paid ads agency, google ads, meta ads"
                               onChange={(e) => f("metaKeywords", e.target.value)} />
                      </Field>

                      <Field label="Canonical URL"
                             hint={`Leave blank and the site uses ${BASE_URL}${selectedPage?.path || "/…"}`} span>
                        <input className="sp-input" style={s.input} value={form.canonical}
                               placeholder={`${BASE_URL}${selectedPage?.path || "/"}`}
                               onChange={(e) => f("canonical", e.target.value)} />
                      </Field>
                    </div>
                  </div>

                  {/* Social share */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-share-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Social share (Open Graph &amp; Twitter)</span>
                    </div>
                    <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 14 }}>
                      <Field label="OG Title" hint="Blank falls back to the title above.">
                        <input className="sp-input" style={s.input} value={form.ogTitle}
                               onChange={(e) => f("ogTitle", e.target.value)} />
                      </Field>
                      <Field label="Twitter Card">
                        <select className="sp-input" style={s.input} value={form.twitterCard}
                                onChange={(e) => f("twitterCard", e.target.value)}>
                          <option value="summary_large_image">summary_large_image</option>
                          <option value="summary">summary</option>
                        </select>
                      </Field>
                      <Field label="OG Description" hint="Blank falls back to the meta description." span>
                        <textarea className="sp-input"
                                  style={{ ...s.input, height: 70, padding: "10px 12px", lineHeight: 1.6, resize: "vertical" }}
                                  value={form.ogDescription}
                                  onChange={(e) => f("ogDescription", e.target.value)} />
                      </Field>
                      <Field label="OG Image URL" hint="1200×630 works best. A path like /assets/img/og.png is fine." span>
                        <input className="sp-input" style={s.input} value={form.ogImage}
                               placeholder="/assets/img/og-default.png"
                               onChange={(e) => f("ogImage", e.target.value)} />
                      </Field>
                    </div>
                  </div>

                  {/* Schema */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-code-square" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Schema (JSON-LD)</span>
                      <span style={s.countChip}>{form.schemas.length}</span>
                    </div>
                    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                      {form.schemas.map((sc, i) => (
                        <div key={i} style={s.repeatRow}>
                          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 62 }}>
                                Schema {i + 1}
                              </span>
                              <select className="sp-input" style={{ ...s.input, height: 34, flex: 1, minWidth: 150 }}
                                      value={sc.type} onChange={(e) => updateSchema(i, "type", e.target.value)}>
                                {SCHEMA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <button type="button" onClick={() => generateSchemaAt(i)} style={s.miniBtn("#EEF2FF", "#6366F1")}>
                                <i className="bi bi-magic" style={{ fontSize: 11 }} /> Generate
                              </button>
                              <button type="button" onClick={() => copySchemaAt(i)} style={s.miniBtn("#F1F5F9", "#475569")}>
                                <i className="bi bi-clipboard" style={{ fontSize: 11 }} /> Copy
                              </button>
                              <button type="button" onClick={() => removeSchema(i)}
                                      disabled={form.schemas.length === 1}
                                      style={{ ...s.miniBtn("#FEF2F2", "#DC2626"), opacity: form.schemas.length === 1 ? 0.45 : 1 }}>
                                <i className="bi bi-trash-fill" style={{ fontSize: 11 }} />
                              </button>
                            </div>
                            <textarea className="sp-input"
                                      style={{ ...s.input, height: 170, padding: "10px 12px", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, resize: "vertical" }}
                                      placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "${sc.type}"\n}`}
                                      value={sc.content}
                                      onChange={(e) => updateSchema(i, "content", e.target.value)} />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addSchema} style={{
                        display: "inline-flex", alignItems: "center", gap: 6, border: "1px dashed #C7D2FE",
                        background: "#F8FAFF", color: "#6366F1", borderRadius: 10, padding: "8px 14px",
                        fontSize: 12.5, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start",
                      }}>
                        <i className="bi bi-plus-lg" style={{ fontSize: 12 }} /> Add schema
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div>
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-eye-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Search preview</span>
                      {selectedPage && <span style={s.countChip}>{selectedPage.path}</span>}
                    </div>
                    <div style={{ padding: 16 }}>
                      <SerpPreview form={form} />
                    </div>
                  </div>

                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-robot" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Robots Directives</span>
                    </div>
                    <div style={{ padding: 18, display: "grid", gap: 14 }}>
                      <Field label="Meta Robots Tag" hint={`Injected as <meta name="robots">`} span>
                        <input className="sp-input" style={s.input} value={form.metaRobots}
                               onChange={(e) => f("metaRobots", e.target.value)} />
                        <code style={s.code}>{`<meta name="robots" content="${form.metaRobots}">`}</code>
                      </Field>

                      <Field label="X-Robots-Tag (HTTP Header)" hint="Sent as a server response header" span>
                        <input className="sp-input" style={s.input} value={form.xRobotsTag}
                               onChange={(e) => f("xRobotsTag", e.target.value)} />
                        <code style={s.code}>{`X-Robots-Tag: ${form.xRobotsTag}`}</code>
                      </Field>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {ROBOTS_PRESETS.map(([label, val]) => (
                          <button key={label} type="button"
                                  onClick={() => { f("metaRobots", val); f("xRobotsTag", val); }}
                                  style={s.miniBtn("#F1F5F9", "#475569")}>
                            {label}
                          </button>
                        ))}
                      </div>

                      <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, lineHeight: 1.6 }}>
                        Both default to <b>index, follow, max-image-preview:large, max-snippet:-1</b>, which is
                        what a page without a record sends.
                      </div>
                    </div>
                  </div>

                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-broadcast" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Status</span>
                    </div>
                    <div style={{ padding: 18, fontSize: 12.5, color: "#64748B", fontWeight: 600, lineHeight: 1.7 }}>
                      <b>Publish</b> puts this on the live page within a minute.<br />
                      <b>Save Draft</b> keeps it here — the page keeps its built-in title until you publish.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .sp-input:focus { border-color: #818CF8 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
        .sp-table tbody tr:hover { background: #FAFAFF; }
        @media (max-width: 1100px) {
          .seo-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  // "View" links point at the website's server — local dev: http://localhost:3000.
  const websiteOrigin = (process.env.WEBSITE_ORIGIN || "https://admin.viralon.in").replace(/\/+$/, "");
  return { props: { websiteOrigin } };
}

const s = {
  panel: {
    background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
    boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden", marginBottom: 16,
  },
  panelHead: {
    padding: "14px 18px 12px", borderBottom: "1px solid #F4F4FD",
    display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap",
  },
  panelIcon: {
    width: 30, height: 30, borderRadius: 9, background: "#6366F118",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  countChip: {
    fontSize: 11, fontWeight: 800, background: "#EEF2FF", color: "#6366F1",
    borderRadius: 20, padding: "2px 10px",
  },
  field:      { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748B" },
  fieldHint:  { fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: -2 },
  input:      { height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13.5, color: "#1E293B", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  code:       { display: "block", fontSize: 10.5, color: "#64748B", background: "#F8FAFC", border: "1px solid #EEF0F7", borderRadius: 8, padding: "6px 8px", wordBreak: "break-all" },
  th:         { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B", borderBottom: "1px solid #EEF0F7", whiteSpace: "nowrap" },
  td:         { padding: "13px 16px", fontSize: 13.5, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
  emptyCell:  { textAlign: "center", padding: "40px 16px", color: "#94A3B8", fontSize: 13.5 },
  repeatRow:  {
    display: "flex", gap: 10, alignItems: "flex-start",
    background: "#FAFAFF", border: "1px solid #EEF0F7", borderRadius: 12, padding: 12,
  },
  actionBtn: (bg, color) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer",
    background: bg, color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    marginRight: 6,
  }),
  miniBtn: (bg, color) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "7px 12px", borderRadius: 9, border: "none", cursor: "pointer",
    background: bg, color, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
  }),
};
