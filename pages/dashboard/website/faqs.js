// pages/dashboard/website/faqs.js — FAQ manager (Website → FAQs).
// The FAQ block used to be hard-coded once per page on viralon-new; it now
// lives in the shared Mongo "pagefaqs" collection. Pick a page from the
// dropdown (pages that already have a set are greyed out), write the
// questions, and the answer editor supports links so an answer can point at
// another page. The website renders the exact same markup as before.
import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import RichFieldEditor from "@/components/RichFieldEditor";
import { SITE_PAGES, getSitePage } from "@/utils/sitePages";

const DEFAULT_KICKER = "Still Having Queries ?";
const DEFAULT_HEADING = "Frequently Asked Questions";
const DEFAULT_FOOTER = "Ask Your Queries...";

const EMPTY_FORM = {
  pageKey: "",
  kicker: DEFAULT_KICKER,
  heading: DEFAULT_HEADING,
  footerText: DEFAULT_FOOTER,
  items: [{ question: "", answer: "" }],
  status: "published",
};

const _v = (n) => (n === null || n === undefined ? "…" : n);
const pad2 = (n) => String(n).padStart(2, "0");
const plain = (html) => String(html || "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

/* ─── Reusable top stat card (same design as payroll home) ────────── */
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

function Field({ label, hint, children, span }) {
  return (
    <div style={{ ...s.field, gridColumn: span ? "1 / -1" : undefined }}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
      {hint && <div style={s.fieldHint}>{hint}</div>}
    </div>
  );
}

function IconBtn({ onClick, icon, title, disabled }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} type="button" style={{
      width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E8F0",
      background: "#fff", color: disabled ? "#CBD5E1" : "#475569",
      cursor: disabled ? "default" : "pointer", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <i className={`bi ${icon}`} style={{ fontSize: 12 }} />
    </button>
  );
}

/* ─── Live preview of the website's FAQ block (dark brand styling) ── */
function FaqPreview({ form }) {
  const [open, setOpen] = useState(0);
  const items = (form.items || []).filter((it) => it.question || plain(it.answer));
  return (
    <div style={{
      background: "#1D1D1D", borderRadius: 14, padding: "26px 22px 20px",
      border: "1px solid #2A2A2A",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 15, fontWeight: 500,
          background: "linear-gradient(90deg,#FF6F61 29%,#FBA065 95%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block",
        }}>
          {form.kicker || DEFAULT_KICKER}
        </div>
        <div style={{ fontSize: 21, color: "#fff", fontWeight: 500, marginTop: 4 }}>
          {form.heading || DEFAULT_HEADING}
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        {items.length === 0 && (
          <div style={{ color: "#8A8A8A", fontSize: 12.5, textAlign: "center", padding: "16px 0" }}>
            Add a question to see it here.
          </div>
        )}
        {items.map((it, i) => (
          <div key={i} style={{ borderBottom: "1px solid #333" }}>
            <button
              type="button"
              onClick={() => setOpen(open === i ? -1 : i)}
              style={{
                width: "100%", background: "transparent", border: "none", cursor: "pointer",
                color: "#fff", fontSize: 14, textAlign: "left", padding: "13px 30px 13px 0",
                position: "relative", display: "flex", alignItems: "flex-start", gap: 10,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15 }}>{pad2(i + 1)}</span>
              <span style={{ flex: 1 }}>{it.question || <i style={{ color: "#777" }}>Untitled question</i>}</span>
              <span style={{ position: "absolute", right: 4, top: 11, color: "#ffffff87", fontSize: 18 }}>
                {open === i ? "−" : "+"}
              </span>
            </button>
            {open === i && (
              <div
                className="faq-prev-body"
                style={{ color: "#C9C9C9", fontSize: 12.5, lineHeight: 1.65, padding: "0 30px 14px 0" }}
                dangerouslySetInnerHTML={{ __html: it.answer || "" }}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign: "right", marginTop: 18 }}>
        <span style={{
          fontSize: 14,
          background: "linear-gradient(90deg,#FF6F61 29%,#FBA065 95%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {form.footerText || DEFAULT_FOOTER}
        </span>
      </div>
    </div>
  );
}

export default function WebsiteFaqs({ websiteOrigin }) {
  const [sets, setSets]       = useState([]);
  const [pages, setPages]     = useState(SITE_PAGES.map((p) => ({ ...p, used: false })));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // view: "list" | "form"; editingId null = create
  const [view, setView]           = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);

  const fetchSets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/faqs");
      const json = await res.json();
      if (json.success) {
        setSets(json.data || []);
        setPages(json.pages || []);
      } else toast.error(json.message || "Could not load FAQs");
    } catch {
      toast.error("Could not load FAQs");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  const publishedCount = useMemo(() => sets.filter((x) => x.status === "published").length, [sets]);
  const questionCount  = useMemo(() => sets.reduce((n, x) => n + (x.items?.length || 0), 0), [sets]);

  // Pages that already hold a set — greyed out in the dropdown. The set being
  // edited keeps its own page selectable so it can be saved in place.
  const usedKeys = useMemo(
    () => new Set(sets.filter((x) => x._id !== editingId).map((x) => x.pageKey)),
    [sets, editingId]
  );
  const grouped = useMemo(() => {
    const g = {};
    pages.forEach((p) => { (g[p.group] = g[p.group] || []).push(p); });
    return g;
  }, [pages]);

  const startCreate = () => {
    setEditingId(null);
    // Preselect the first page that has no FAQ set yet.
    const free = pages.find((p) => !p.used);
    setForm({ ...EMPTY_FORM, pageKey: free ? free.key : "", items: [{ question: "", answer: "" }] });
    setView("form");
  };

  const startEdit = (row) => {
    setEditingId(row._id);
    setForm({
      pageKey: row.pageKey || "",
      kicker: row.kicker || DEFAULT_KICKER,
      heading: row.heading || DEFAULT_HEADING,
      footerText: row.footerText || DEFAULT_FOOTER,
      items: row.items?.length ? row.items.map((it) => ({ ...it })) : [{ question: "", answer: "" }],
      status: row.status || "published",
    });
    setView("form");
  };

  const backToList = () => { setView("list"); setEditingId(null); setForm(EMPTY_FORM); };

  const setItem = (i, field, val) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)),
    }));

  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { question: "", answer: "" }] }));

  const removeItem = (i) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const moveItem = (i, dir) =>
    setForm((f) => {
      const next = [...f.items];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, items: next };
    });

  const saveSet = async (status) => {
    if (!form.pageKey) return toast.error("Pick which page this FAQ goes on");
    const items = form.items.filter((it) => it.question.trim() || plain(it.answer));
    if (!items.length) return toast.error("Add at least one question");

    setSaving(true);
    const payload = { ...form, items, status };
    const url = editingId ? `/api/admin/faqs/${editingId}` : "/api/admin/faqs";
    try {
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(status === "published" ? "FAQ published" : "Draft saved");
        await fetchSets();
        backToList();
      } else toast.error(json.message || "Could not save");
    } catch {
      toast.error("Could not save");
    }
    setSaving(false);
  };

  const deleteSet = async (row) => {
    if (!confirm(`Delete the FAQ set on "${row.pageLabel || row.pageKey}"? The page will show no FAQ section.`)) return;
    try {
      const res = await fetch(`/api/admin/faqs/${row._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("Deleted"); fetchSets(); }
      else toast.error(json.message || "Could not delete");
    } catch {
      toast.error("Could not delete");
    }
  };

  const selectedPage = getSitePage(form.pageKey);

  return (
    <section className="main-dashboard-area">
      <Head><title>FAQs — Website</title></Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            {/* ── Compact header ── */}
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
                    <i className="bi bi-question-circle-fill" style={{ fontSize: 17, color: "#fff" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>
                    {view === "form" ? (editingId ? "Edit FAQs" : "New FAQ Set") : "FAQs"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                    {view === "form"
                      ? "Pick the page, write the questions — the website shows them in the same design as always."
                      : "One FAQ set per website page — home, service pages, contact us and more."}
                  </div>
                </div>
              </div>

              {view === "list" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={fetchSets} disabled={loading} title="Refresh" style={{
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
                    <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />
                    New FAQ Set
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
                  <button onClick={() => saveSet("draft")} disabled={saving} style={{
                    height: 38, padding: "0 16px", borderRadius: 10,
                    border: "1px solid #C7D2FE", background: "#F8FAFF", color: "#6366F1",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1,
                  }}>
                    Save Draft
                  </button>
                  <button onClick={() => saveSet("published")} disabled={saving} style={{
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
                {/* ── KPI stat cards ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 22, marginBottom: 26 }}>
                  <KpiCard icon="bi-question-circle-fill" label="FAQ Sets"      value={_v(sets.length)}       accent={{ bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" }} />
                  <KpiCard icon="bi-globe2"               label="Live on site"  value={_v(publishedCount)}    accent={{ bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)" }} />
                  <KpiCard icon="bi-chat-left-text-fill"  label="Questions"     value={_v(questionCount)}     accent={{ bg: "#FFEDD5", icon: "#EA580C", shadow: "rgba(249,115,22,.18)" }} />
                  <KpiCard icon="bi-window-stack"         label="Pages Covered" value={`${sets.length}/${pages.length}`} accent={{ bg: "#F3E8FF", icon: "#9333EA", shadow: "rgba(168,85,247,.18)" }} />
                </div>

                {/* ── Sets table ── */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-question-circle-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>FAQ Sets</span>
                    <span style={s.countChip}>{loading ? "…" : sets.length}</span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="sp-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                          {["Page", "Questions", "Status", "Updated", "Actions"].map((h) => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={5} style={s.emptyCell}>Loading FAQs…</td></tr>
                        ) : sets.length === 0 ? (
                          <tr><td colSpan={5} style={s.emptyCell}>
                            No FAQ sets yet — click <b>New FAQ Set</b> and pick a page.
                          </td></tr>
                        ) : sets.map((row) => {
                          const page = getSitePage(row.pageKey);
                          return (
                            <tr key={row._id}>
                              <td style={{ ...s.td, fontWeight: 700, color: "#0F172A" }}>
                                {row.pageLabel || page?.label || row.pageKey}
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginTop: 2 }}>
                                  {page?.path || `/${row.pageKey}`}
                                </div>
                              </td>
                              <td style={s.td}>
                                <span style={s.countChip}>{row.items?.length || 0}</span>
                              </td>
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
                                {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
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
                                <button onClick={() => deleteSet(row)} style={s.actionBtn("#FEF2F2", "#DC2626")}>
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
              /* ── Form ─────────────────────────────────────────────── */
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)", gap: 16, marginTop: 22, alignItems: "start" }}
                   className="faq-form-grid">
                <div>
                  {/* Page + headings */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-window-stack" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Where it goes</span>
                    </div>
                    <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 14 }}>
                      <Field
                        label="Page"
                        hint="Greyed-out pages already have an FAQ set — edit that one from the list instead."
                        span
                      >
                        <select
                          className="sp-input"
                          style={s.input}
                          value={form.pageKey}
                          onChange={(e) => setForm((f) => ({ ...f, pageKey: e.target.value }))}
                        >
                          <option value="">— Select a page —</option>
                          {Object.entries(grouped).map(([group, list]) => (
                            <optgroup key={group} label={group}>
                              {list.map((p) => {
                                const taken = usedKeys.has(p.key);
                                return (
                                  <option
                                    key={p.key}
                                    value={p.key}
                                    disabled={taken}
                                    style={taken ? { color: "#B6BFCD" } : undefined}
                                  >
                                    {p.label} ({p.path}){taken ? "  — already added" : ""}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ))}
                        </select>
                      </Field>

                      <Field label="Kicker" hint="Small coral line above the heading.">
                        <input className="sp-input" style={s.input} value={form.kicker}
                               placeholder={DEFAULT_KICKER}
                               onChange={(e) => setForm((f) => ({ ...f, kicker: e.target.value }))} />
                      </Field>
                      <Field label="Heading">
                        <input className="sp-input" style={s.input} value={form.heading}
                               placeholder={DEFAULT_HEADING}
                               onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))} />
                      </Field>
                      <Field label="Footer line" hint="Coral line under the accordion, bottom right.">
                        <input className="sp-input" style={s.input} value={form.footerText}
                               placeholder={DEFAULT_FOOTER}
                               onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))} />
                      </Field>
                    </div>
                  </div>

                  {/* Questions */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-chat-left-text-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Questions</span>
                      <span style={s.countChip}>{form.items.length}</span>
                    </div>
                    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                      {form.items.map((it, i) => (
                        <div key={i} style={s.repeatRow}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: "#EEF2FF", color: "#6366F1", fontWeight: 800, fontSize: 12,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {pad2(i + 1)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                            <input
                              className="sp-input" style={s.input}
                              value={it.question}
                              placeholder="Question — e.g. What services do you offer?"
                              onChange={(e) => setItem(i, "question", e.target.value)}
                            />
                            <RichFieldEditor
                              withLink
                              minHeight={110}
                              value={it.answer}
                              onChange={(html) => setItem(i, "answer", html)}
                              placeholder={"Answer — select text and use the link button to point at another page,\ne.g. /our-services/seo"}
                            />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <IconBtn icon="bi-arrow-up" title="Move up" disabled={i === 0} onClick={() => moveItem(i, -1)} />
                            <IconBtn icon="bi-arrow-down" title="Move down" disabled={i === form.items.length - 1} onClick={() => moveItem(i, 1)} />
                            <button onClick={() => removeItem(i)} title="Remove" type="button" style={{
                              width: 30, height: 30, borderRadius: 8, border: "none", background: "#FEF2F2",
                              color: "#DC2626", cursor: "pointer", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <i className="bi bi-trash-fill" style={{ fontSize: 12 }} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={addItem} type="button" style={{
                        display: "inline-flex", alignItems: "center", gap: 6, border: "1px dashed #C7D2FE",
                        background: "#F8FAFF", color: "#6366F1", borderRadius: 10, padding: "8px 14px",
                        fontSize: 12.5, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start",
                      }}>
                        <i className="bi bi-plus-lg" style={{ fontSize: 12 }} /> Add question
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview column */}
                <div style={{ ...s.panel, position: "sticky", top: 12 }}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-eye-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Preview</span>
                    {selectedPage && <span style={s.countChip}>{selectedPage.path}</span>}
                  </div>
                  <div style={{ padding: 16 }}>
                    <FaqPreview form={form} />
                    <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: 10, lineHeight: 1.6 }}>
                      Close to how it looks on the site — the live page uses the website&apos;s own FAQ styling,
                      unchanged from before.
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
        .faq-prev-body p { margin: 0 0 8px; }
        .faq-prev-body p:last-child { margin-bottom: 0; }
        .faq-prev-body a { color: #FF6F61; }
        @media (max-width: 1100px) {
          .faq-form-grid { grid-template-columns: 1fr !important; }
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
  th:         { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B", borderBottom: "1px solid #EEF0F7", whiteSpace: "nowrap" },
  td:         { padding: "13px 16px", fontSize: 13.5, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
  emptyCell:  { textAlign: "center", padding: "40px 16px", color: "#94A3B8", fontSize: 13.5 },
  repeatRow:  {
    display: "flex", gap: 10, alignItems: "flex-start",
    background: "#FAFAFF", border: "1px solid #EEF0F7", borderRadius: 12,
    padding: 12,
  },
  actionBtn: (bg, color) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer",
    background: bg, color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    marginRight: 6,
  }),
};
