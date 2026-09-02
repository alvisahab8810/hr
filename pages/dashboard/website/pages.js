// pages/dashboard/website/pages.js — SEO Pages builder (v2, section-based).
// Create landing pages for SEO: pick a URL, choose one of 5 brand templates,
// then add / remove / reorder any sections (intro, features, reviews, FAQs…).
// Writes to the shared Mongo "landingpages" collection; viralon-new renders
// published pages at /<slug> via its root catch-all (static site pages always
// win, so existing pages stay untouched).
import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import RichFieldEditor from "@/components/RichFieldEditor";
import { TEMPLATES, getTemplate, SECTION_TYPES, SECTION_TYPE_KEYS } from "@/utils/landingTemplates";

const EMPTY_CONTENT = {
  hero: { kicker: "", headline: "", headlineAccent: "", subheadline: "", heroImage: "", ctaText: "", ctaLink: "" },
  sections: [],
  showLeadForm: true,
};

const EMPTY_FORM = {
  title: "", slug: "", status: "draft", template: "curve",
  seoTitle: "", seoDescription: "", seoKeywords: "",
  content: EMPTY_CONTENT,
};

const contentIsEmpty = (c = {}) => !c.hero?.headline && !(c.sections?.length);

const slugPreview = (str) =>
  String(str || "").toLowerCase().trim()
    .replace(/[^a-z0-9\s/-]/g, "").replace(/\//g, "-")
    .replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

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
      </div>
    </div>
  );
}

/* ─── Mini visual preview drawn per template (website brand colours) ── */
const GRAD = "linear-gradient(90deg,#FF6F61,#FBA065)";
function TemplatePreview({ tk }) {
  const bar = (w, h = 5, bg = "#3a3a3a", extra = {}) => (
    <div style={{ width: w, height: h, borderRadius: 3, background: bg, ...extra }} />
  );
  const box = { background: "#1a1a1a", borderRadius: 10, height: 96, padding: 10, overflow: "hidden", display: "flex", flexDirection: "column", gap: 5 };
  switch (tk) {
    case "curve": return (
      <div style={{ ...box, alignItems: "center" }}>
        {bar("28%", 4, "#FF6F61")}
        {bar("80%", 12, "#fff")}
        {bar("50%", 12, GRAD)}
        <div style={{ display: "flex", gap: 4, marginTop: "auto", width: "100%" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, height: 26, borderRadius: 4, background: "#212121", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <span style={{ color: "#ffc107", fontSize: 6, letterSpacing: 1, lineHeight: 1 }}>★★★★★</span>
              <div style={{ width: "60%", height: 3, borderRadius: 2, background: "#555" }} />
            </div>
          ))}
        </div>
      </div>);
    case "nexa": return (
      <div style={{ ...box, flexDirection: "row", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, justifyContent: "center" }}>
          {bar("40%", 4, "#FF6F61")}
          {bar("90%", 10, "#fff")}
          {bar("65%", 5)}
          <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
            {["3.2x", "120+"].map((v, i) => (
              <div key={i} style={{ flex: 1, height: 16, borderRadius: 3, border: "1px solid #403e44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, color: "#FF6F61" }}>{v}</div>
            ))}
          </div>
        </div>
        <div style={{ flex: 0.8, borderRadius: 7, border: "1px solid #403e44", background: "#262525" }} />
      </div>);
    case "studio": return (
      <div style={{ ...box, alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.1 }}>
          Create <span style={{ color: "#FF6F61" }}>Value.</span>
        </div>
        {bar("42%", 4, "#555")}
        <div style={{ width: "80%", height: 1, background: "#403E44", marginTop: 6 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 30, height: 4, borderRadius: 2, background: "#3a3a3a" }} />)}
        </div>
      </div>);
    case "boom": return (
      <div style={{ ...box, flexDirection: "row", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, justifyContent: "center" }}>
          {bar("38%", 4, "#FF6F61")}
          {bar("92%", 10, "#fff")}
          {bar("70%", 5)}
          <div style={{ width: 42, height: 11, borderRadius: 6, background: GRAD, marginTop: 3 }} />
        </div>
        <div style={{ flex: 0.8, borderRadius: 7, background: "#262525", boxShadow: "inset 0 0 14px rgba(255,111,97,.25)" }} />
      </div>);
    case "bold": return (
      <div style={{ ...box, alignItems: "center" }}>
        <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: 1, color: "#fff", fontFamily: "Arial Black, sans-serif", lineHeight: 1, textTransform: "uppercase" }}>Growth</div>
        <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: 1, background: GRAD, WebkitBackgroundClip: "text", color: "transparent", fontFamily: "Arial Black, sans-serif", lineHeight: 1, textTransform: "uppercase" }}>Engine</div>
        <div style={{ display: "flex", gap: 4, marginTop: "auto", width: "100%" }}>
          {["01", "02", "03"].map((n, i) => (
            <div key={i} style={{ flex: 1, height: 22, borderRadius: 4, background: "#212121", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "transparent", WebkitTextStroke: "0.6px #FF6F61" }}>{n}</div>
          ))}
        </div>
      </div>);
    // House skin — mirrors /our-services/*: gradient benefits band + step rows.
    case "service": return (
      <div style={{ ...box, gap: 4 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            {bar("85%", 9, "#fff")}
            {bar("60%", 4, "#FF6F61")}
          </div>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#262525", border: "1px solid #403e44" }} />
        </div>
        <div style={{ height: 12, borderRadius: 3, background: GRAD, display: "flex", gap: 3, padding: 2, marginTop: 2 }}>
          {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ flex: 1, borderRadius: 2, background: "#fff" }} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: "auto" }}>
          {[1, 2].map(n => (
            <div key={n} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#212121", color: "#FF6F61", fontSize: 7, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
              <div style={{ flex: 1, height: 12, borderRadius: 3, background: "#212121", borderLeft: n === 1 ? "2px solid #FF6F61" : "2px solid #403e44" }} />
            </div>
          ))}
        </div>
      </div>);
    default: return <div style={box} />;
  }
}

/* ─── Small form building blocks ────────────────────────────────── */
function Field({ label, hint, children, span }) {
  return (
    <div style={{ ...s.field, gridColumn: span ? "1 / -1" : undefined }}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
      {hint && <div style={s.fieldHint}>{hint}</div>}
    </div>
  );
}

function ImgInput({ value, onChange, websiteOrigin, placeholder }) {
  const src = value ? (value.startsWith("/") ? `${websiteOrigin}${value}` : value) : "";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <div style={{
        width: 64, height: 44, borderRadius: 8, background: "#F1F5F9", flexShrink: 0,
        border: "1px solid #E2E8F0", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {src ? (
          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <i className="bi bi-image" style={{ color: "#94A3B8", fontSize: 16 }} />
        )}
      </div>
      <input className="sp-input" style={s.input} value={value} onChange={onChange}
        placeholder={placeholder || "/assets/img/… or https://…"} />
    </div>
  );
}

function AddBtn({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, border: "1px dashed #C7D2FE",
      background: "#F8FAFF", color: "#6366F1", borderRadius: 10, padding: "8px 14px",
      fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginTop: 8,
    }}>
      <i className="bi bi-plus-lg" style={{ fontSize: 12 }} /> {label}
    </button>
  );
}

function RemoveBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Remove" style={{
      width: 30, height: 30, borderRadius: 8, border: "none", background: "#FEF2F2",
      color: "#DC2626", cursor: "pointer", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <i className="bi bi-trash-fill" style={{ fontSize: 12 }} />
    </button>
  );
}

function IconBtn({ onClick, icon, title, disabled }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E8F0",
      background: "#fff", color: disabled ? "#CBD5E1" : "#475569",
      cursor: disabled ? "default" : "pointer", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <i className={`bi ${icon}`} style={{ fontSize: 12 }} />
    </button>
  );
}

export default function SeoPages({ websiteOrigin }) {
  const [pages, setPages]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // view: "list" | "form"; editingId null = create
  const [view, setView]           = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);

  // preview modal: { url, name } | null; previewMobile toggles 393px viewport
  const [preview, setPreview]             = useState(null);
  const [previewMobile, setPreviewMobile] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/landing-pages", { credentials: "include" });
      const data = await r.json();
      if (data.success) setPages(data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchPages(); }, [fetchPages]);

  const _v = (val) => loading ? "—" : val;
  const publishedCount = useMemo(() => pages.filter(p => p.status === "published").length, [pages]);
  const draftCount     = useMemo(() => pages.filter(p => p.status !== "published").length, [pages]);

  const tpl = getTemplate(form.template);

  /* ── state helpers ── */
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setHero = (key) => (e) => {
    const val = e?.target ? e.target.value : e;
    setForm(f => ({ ...f, content: { ...f.content, hero: { ...(f.content.hero || {}), [key]: val } } }));
  };
  const setLeadForm = (val) =>
    setForm(f => ({ ...f, content: { ...f.content, showLeadForm: val } }));

  // Section-level ops: add a new section of a type, remove, move up/down,
  // or patch a section's data object.
  const secOp = (op, idx, patch) => setForm(f => {
    const sections = [...(f.content.sections || [])];
    if (op === "add")    sections.push({ type: patch, data: SECTION_TYPES[patch].make() });
    if (op === "remove") sections.splice(idx, 1);
    if (op === "up" && idx > 0)
      [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
    if (op === "down" && idx < sections.length - 1)
      [sections[idx + 1], sections[idx]] = [sections[idx], sections[idx + 1]];
    if (op === "data")   sections[idx] = { ...sections[idx], data: { ...sections[idx].data, ...patch } };
    return { ...f, content: { ...f.content, sections } };
  });

  // Row ops inside one section's array field (items / steps / images):
  // add an empty row, remove a row, or set a row (field null = plain string row).
  const secList = (idx, key, op, rowIdx, field, val) => setForm(f => {
    const sections = [...(f.content.sections || [])];
    const sec = sections[idx];
    const list = [...(sec.data[key] || [])];
    if (op === "add") {
      const fresh = SECTION_TYPES[sec.type].make()[key][0];
      list.push(typeof fresh === "string" ? "" : { ...fresh });
    }
    if (op === "remove") list.splice(rowIdx, 1);
    if (op === "set")    list[rowIdx] = field === null ? val : { ...list[rowIdx], [field]: val };
    sections[idx] = { ...sec, data: { ...sec.data, [key]: list } };
    return { ...f, content: { ...f.content, sections } };
  });

  const pickTemplate = (key) => setForm(f => ({
    ...f,
    template: key,
    // First pick on a fresh page: load that template's sample content so the
    // admin starts from a complete, publishable page.
    content: contentIsEmpty(f.content) ? { ...getTemplate(key).defaults } : f.content,
  }));

  // The website's /landing-preview route renders any template client-side from
  // data packed into the URL hash — nothing is saved or published.
  const buildPreviewUrl = (tplKey, content, title) => {
    const payload = {
      template: tplKey,
      title: title || "Preview",
      slug: slugPreview(form.slug || form.title) || "preview",
      content,
    };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `${websiteOrigin}/landing-preview#d=${b64}`;
  };
  const openTplPreview = (t) => {
    setPreviewMobile(false);
    setPreview({ url: buildPreviewUrl(t.key, { ...t.defaults }, form.title), name: t.name });
  };
  const openFormPreview = () => {
    const content = contentIsEmpty(form.content) ? { ...getTemplate(form.template).defaults } : form.content;
    setPreviewMobile(false);
    setPreview({ url: buildPreviewUrl(form.template, content, form.title), name: `${tpl.name} — your content` });
  };

  const loadSample = () => {
    if (!contentIsEmpty(form.content) &&
        !window.confirm("Replace the current content with this template's sample content?")) return;
    setForm(f => ({ ...f, content: { ...getTemplate(f.template).defaults } }));
    toast.success("Sample content loaded — edit away");
  };

  /* ── navigation ── */
  const startCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setView("form"); };
  const startEdit = (p) => {
    setForm({
      title: p.title || "", slug: p.slug || "", status: p.status || "draft",
      template: p.template || "curve",
      seoTitle: p.seoTitle || "", seoDescription: p.seoDescription || "", seoKeywords: p.seoKeywords || "",
      content: {
        ...EMPTY_CONTENT,
        ...(p.content || {}),
        hero: { ...EMPTY_CONTENT.hero, ...(p.content?.hero || {}) },
        sections: Array.isArray(p.content?.sections) ? p.content.sections : [],
      },
    });
    setEditingId(p._id);
    setView("form");
  };
  const backToList = () => { setView("list"); setEditingId(null); };

  /* ── actions ── */
  const savePage = async (statusOverride) => {
    if (!form.title.trim()) { toast.error("Page title is required"); return; }
    setSaving(true);
    try {
      const url    = editingId ? `/api/admin/landing-pages/${editingId}` : "/api/admin/landing-pages";
      const method = editingId ? "PUT" : "POST";
      const body   = { ...form, status: statusOverride || form.status };
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (data.success) {
        toast.success(body.status === "published"
          ? `Page live at /${data.data.slug}`
          : (editingId ? "Page updated" : "Draft saved"));
        await fetchPages();
        backToList();
      } else {
        toast.error(data.message || "Save failed");
      }
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (p) => {
    try {
      const r = await fetch(`/api/admin/landing-pages/${p._id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, status: p.status === "published" ? "draft" : "published" }),
      });
      const data = await r.json();
      if (data.success) {
        toast.success(p.status === "published" ? "Page unpublished" : `Page live at /${p.slug}`);
        fetchPages();
      } else toast.error(data.message || "Update failed");
    } catch { toast.error("Update failed"); }
  };

  const deletePage = async (p) => {
    if (!window.confirm(`Delete "${p.title}"? The URL /${p.slug} will stop working.`)) return;
    try {
      const r = await fetch(`/api/admin/landing-pages/${p._id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json();
      if (data.success) { toast.success("Page deleted"); fetchPages(); }
      else toast.error(data.message || "Delete failed");
    } catch { toast.error("Delete failed"); }
  };

  /* ── per-type section body editor ── */
  const renderSectionBody = (sec, i) => {
    const d = sec.data || {};
    const patch = (p) => secOp("data", i, p);
    const headingField = (
      <Field label="Section Heading">
        <input className="sp-input" style={s.input} value={d.heading || ""}
          onChange={(e) => patch({ heading: e.target.value })} />
      </Field>
    );
    switch (sec.type) {
      case "intro":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {headingField}
            <RichFieldEditor value={d.html || ""} onChange={(html) => patch({ html })}
              placeholder="SEO copy — a paragraph or two…" minHeight={110} />
          </div>
        );
      case "split":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {headingField}
            <RichFieldEditor value={d.html || ""} onChange={(html) => patch({ html })}
              placeholder="Copy shown beside the image…" minHeight={100} />
            <Field label="Image">
              <ImgInput value={d.image || ""} websiteOrigin={websiteOrigin}
                onChange={(e) => patch({ image: e.target.value })} />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", margin: 0 }}>
              <input type="checkbox" checked={d.reverse === true}
                onChange={(e) => patch({ reverse: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: "#6366F1", cursor: "pointer" }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>Image on the right</span>
            </label>
          </div>
        );
      case "features":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {headingField}
              <Field label="Sub-heading (optional)">
                <input className="sp-input" style={s.input} value={d.subheading || ""}
                  onChange={(e) => patch({ subheading: e.target.value })} />
              </Field>
            </div>
            {(d.items || []).map((f, ri) => (
              <div key={ri} style={s.repeatRow}>
                <div style={{ flex: 1, display: "grid", gap: 10 }}>
                  <input className="sp-input" style={s.input} value={f.title || ""} placeholder={`Card ${ri + 1} title`}
                    onChange={(e) => secList(i, "items", "set", ri, "title", e.target.value)} />
                  <textarea className="sp-textarea" style={{ ...s.input, height: 60, padding: "10px 12px", resize: "vertical" }}
                    value={f.text || ""} placeholder="Short description"
                    onChange={(e) => secList(i, "items", "set", ri, "text", e.target.value)} />
                  <ImgInput value={f.image || ""} websiteOrigin={websiteOrigin}
                    placeholder="Card image (optional)"
                    onChange={(e) => secList(i, "items", "set", ri, "image", e.target.value)} />
                </div>
                <RemoveBtn onClick={() => secList(i, "items", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "items", "add")} label="Add card" /></div>
          </div>
        );
      case "process":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {headingField}
            {(d.steps || []).map((st, ri) => (
              <div key={ri} style={s.repeatRow}>
                <div style={{ flex: 1, display: "grid", gap: 10 }}>
                  <input className="sp-input" style={s.input} value={st.title || ""} placeholder={`Step ${ri + 1} title`}
                    onChange={(e) => secList(i, "steps", "set", ri, "title", e.target.value)} />
                  <textarea className="sp-textarea" style={{ ...s.input, height: 56, padding: "10px 12px", resize: "vertical" }}
                    value={st.text || ""} placeholder="What happens in this step"
                    onChange={(e) => secList(i, "steps", "set", ri, "text", e.target.value)} />
                  <ImgInput value={st.icon || ""} websiteOrigin={websiteOrigin}
                    placeholder="Step icon — /assets/img/our-services/…/icons/icon1.png"
                    onChange={(e) => secList(i, "steps", "set", ri, "icon", e.target.value)} />
                </div>
                <RemoveBtn onClick={() => secList(i, "steps", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "steps", "add")} label="Add step" /></div>
          </div>
        );
      case "stats":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {headingField}
            {(d.items || []).map((st, ri) => (
              <div key={ri} style={s.repeatRow}>
                <input className="sp-input" style={{ ...s.input, maxWidth: 140 }} value={st.value || ""} placeholder="3.2x"
                  onChange={(e) => secList(i, "items", "set", ri, "value", e.target.value)} />
                <input className="sp-input" style={s.input} value={st.label || ""} placeholder="Average ROAS"
                  onChange={(e) => secList(i, "items", "set", ri, "label", e.target.value)} />
                <RemoveBtn onClick={() => secList(i, "items", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "items", "add")} label="Add stat" /></div>
          </div>
        );
      case "gallery":
      case "logos":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {headingField}
            {(d.images || []).map((g, ri) => (
              <div key={ri} style={s.repeatRow}>
                <div style={{ flex: 1 }}>
                  <ImgInput value={g || ""} websiteOrigin={websiteOrigin}
                    onChange={(e) => secList(i, "images", "set", ri, null, e.target.value)} />
                </div>
                <RemoveBtn onClick={() => secList(i, "images", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "images", "add")} label={sec.type === "logos" ? "Add logo" : "Add image"} /></div>
          </div>
        );
      case "reviews":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {headingField}
            {(d.items || []).map((r, ri) => (
              <div key={ri} style={s.repeatRow}>
                <div style={{ flex: 1, display: "grid", gap: 10 }}>
                  <textarea className="sp-textarea" style={{ ...s.input, height: 66, padding: "10px 12px", resize: "vertical" }}
                    value={r.text || ""} placeholder="The review…"
                    onChange={(e) => secList(i, "items", "set", ri, "text", e.target.value)} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px", gap: 10 }}>
                    <input className="sp-input" style={s.input} value={r.name || ""} placeholder="Client name"
                      onChange={(e) => secList(i, "items", "set", ri, "name", e.target.value)} />
                    <input className="sp-input" style={s.input} value={r.role || ""} placeholder="Role / company"
                      onChange={(e) => secList(i, "items", "set", ri, "role", e.target.value)} />
                    <select className="sp-select" style={{ ...s.input, padding: "0 8px" }}
                      value={r.rating || 5}
                      onChange={(e) => secList(i, "items", "set", ri, "rating", Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                    </select>
                  </div>
                  <ImgInput value={r.image || ""} websiteOrigin={websiteOrigin}
                    placeholder="Client photo — /assets/img/home/testimonials/1.png"
                    onChange={(e) => secList(i, "items", "set", ri, "image", e.target.value)} />
                </div>
                <RemoveBtn onClick={() => secList(i, "items", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "items", "add")} label="Add review" /></div>
          </div>
        );
      case "faqs":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {headingField}
            {(d.items || []).map((f, ri) => (
              <div key={ri} style={s.repeatRow}>
                <div style={{ flex: 1, display: "grid", gap: 10 }}>
                  <input className="sp-input" style={s.input} value={f.q || ""} placeholder={`Question ${ri + 1}`}
                    onChange={(e) => secList(i, "items", "set", ri, "q", e.target.value)} />
                  <textarea className="sp-textarea" style={{ ...s.input, height: 60, padding: "10px 12px", resize: "vertical" }}
                    value={f.a || ""} placeholder="Answer"
                    onChange={(e) => secList(i, "items", "set", ri, "a", e.target.value)} />
                </div>
                <RemoveBtn onClick={() => secList(i, "items", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "items", "add")} label="Add FAQ" /></div>
          </div>
        );
      case "cta":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Field label="Headline">
              <input className="sp-input" style={s.input} value={d.headline || ""}
                onChange={(e) => patch({ headline: e.target.value })} />
            </Field>
            <Field label="Supporting Text">
              <input className="sp-input" style={s.input} value={d.text || ""}
                onChange={(e) => patch({ text: e.target.value })} />
            </Field>
            <Field label="Button Text">
              <input className="sp-input" style={s.input} value={d.ctaText || ""}
                onChange={(e) => patch({ ctaText: e.target.value })} />
            </Field>
            <Field label="Button Link">
              <input className="sp-input" style={s.input} value={d.ctaLink || ""}
                onChange={(e) => patch({ ctaLink: e.target.value })} placeholder="/contact-us" />
            </Field>
          </div>
        );
      case "strap":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {(d.items || []).map((w, ri) => (
              <div key={ri} style={s.repeatRow}>
                <input className="sp-input" style={s.input} value={w || ""} placeholder="SEARCH ENGINE OPTIMIZATION"
                  onChange={(e) => secList(i, "items", "set", ri, null, e.target.value)} />
                <RemoveBtn onClick={() => secList(i, "items", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "items", "add")} label="Add word" /></div>
          </div>
        );
      case "benefits":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {headingField}
            <Field label="Intro Text">
              <textarea className="sp-textarea" style={{ ...s.input, height: 56, padding: "10px 12px", resize: "vertical" }}
                value={d.text || ""} placeholder="One line under the heading"
                onChange={(e) => patch({ text: e.target.value })} />
            </Field>
            {(d.items || []).map((b, ri) => (
              <div key={ri} style={s.repeatRow}>
                <div style={{ flex: 1, display: "grid", gap: 10 }}>
                  <input className="sp-input" style={s.input} value={b.title || ""} placeholder={`Benefit ${ri + 1}`}
                    onChange={(e) => secList(i, "items", "set", ri, "title", e.target.value)} />
                  <textarea className="sp-textarea" style={{ ...s.input, height: 56, padding: "10px 12px", resize: "vertical" }}
                    value={b.text || ""} placeholder="Why it matters"
                    onChange={(e) => secList(i, "items", "set", ri, "text", e.target.value)} />
                </div>
                <RemoveBtn onClick={() => secList(i, "items", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "items", "add")} label="Add benefit" /></div>
          </div>
        );
      case "whychoose":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <Field label="Kicker">
                <input className="sp-input" style={s.input} value={d.kicker || ""} placeholder="-5 Solid Reasons"
                  onChange={(e) => patch({ kicker: e.target.value })} />
              </Field>
              <Field label="Heading">
                <input className="sp-input" style={s.input} value={d.heading || ""} placeholder="Why Choose"
                  onChange={(e) => patch({ heading: e.target.value })} />
              </Field>
              <Field label="Highlighted Word">
                <input className="sp-input" style={s.input} value={d.brand || ""} placeholder="Viralon"
                  onChange={(e) => patch({ brand: e.target.value })} />
              </Field>
            </div>
            {(d.items || []).map((r, ri) => (
              <div key={ri} style={s.repeatRow}>
                <div style={{ flex: 1, display: "grid", gap: 10 }}>
                  <input className="sp-input" style={s.input} value={r.title || ""} placeholder={`Reason ${ri + 1}`}
                    onChange={(e) => secList(i, "items", "set", ri, "title", e.target.value)} />
                  <textarea className="sp-textarea" style={{ ...s.input, height: 56, padding: "10px 12px", resize: "vertical" }}
                    value={r.text || ""} placeholder="Explain the reason"
                    onChange={(e) => secList(i, "items", "set", ri, "text", e.target.value)} />
                </div>
                <RemoveBtn onClick={() => secList(i, "items", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "items", "add")} label="Add reason" /></div>
            <div style={s.fieldLabel}>Collage Images</div>
            {(d.images || []).map((g, ri) => (
              <div key={ri} style={s.repeatRow}>
                <div style={{ flex: 1 }}>
                  <ImgInput value={g || ""} websiteOrigin={websiteOrigin}
                    onChange={(e) => secList(i, "images", "set", ri, null, e.target.value)} />
                </div>
                <RemoveBtn onClick={() => secList(i, "images", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "images", "add")} label="Add image" /></div>
          </div>
        );
      case "blogs":
        return (
          <div style={{ display: "grid", gap: 12 }}>
            {headingField}
            <Field label="Intro Text">
              <textarea className="sp-textarea" style={{ ...s.input, height: 56, padding: "10px 12px", resize: "vertical" }}
                value={d.text || ""} placeholder="One line under the heading"
                onChange={(e) => patch({ text: e.target.value })} />
            </Field>
            {(d.items || []).map((b, ri) => (
              <div key={ri} style={s.repeatRow}>
                <div style={{ flex: 1, display: "grid", gap: 10 }}>
                  <input className="sp-input" style={s.input} value={b.title || ""} placeholder={`Post ${ri + 1} title`}
                    onChange={(e) => secList(i, "items", "set", ri, "title", e.target.value)} />
                  <textarea className="sp-textarea" style={{ ...s.input, height: 52, padding: "10px 12px", resize: "vertical" }}
                    value={b.text || ""} placeholder="Excerpt"
                    onChange={(e) => secList(i, "items", "set", ri, "text", e.target.value)} />
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
                    <input className="sp-input" style={s.input} value={b.date || ""} placeholder="18 Apr"
                      onChange={(e) => secList(i, "items", "set", ri, "date", e.target.value)} />
                    <input className="sp-input" style={s.input} value={b.link || ""} placeholder="/blogs/slug"
                      onChange={(e) => secList(i, "items", "set", ri, "link", e.target.value)} />
                  </div>
                  <ImgInput value={b.image || ""} websiteOrigin={websiteOrigin}
                    onChange={(e) => secList(i, "items", "set", ri, "image", e.target.value)} />
                </div>
                <RemoveBtn onClick={() => secList(i, "items", "remove", ri)} />
              </div>
            ))}
            <div><AddBtn onClick={() => secList(i, "items", "add")} label="Add post" /></div>
          </div>
        );
      default:
        return null;
    }
  };

  const sections = form.content.sections || [];

  return (
    <section className="main-dashboard-area">
      <Head>
        <title>SEO Pages — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .sp-table tbody tr:hover { background: #F8FAFF; }
          .sp-input:focus, .sp-select:focus, .sp-textarea:focus { border-color: #6366F1 !important; outline: none; }
          .sp-tpl-card { cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
          .sp-tpl-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(99,102,241,.12); }
          .sp-add-chip { transition: transform .15s ease, box-shadow .15s ease; }
          .sp-add-chip:hover { transform: translateY(-2px); box-shadow: 0 5px 14px rgba(99,102,241,.15); }
          .rfe-wrap:focus-within { border-color: #6366F1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.08); }
          .rfe-content .ProseMirror {
            padding: 12px 15px; outline: none; font-size: 13.5px; color: #1E293B;
            line-height: 1.6; min-height: inherit;
          }
          .rfe-content .ProseMirror p { margin: 0 0 6px; }
          .rfe-content .ProseMirror ul, .rfe-content .ProseMirror ol { margin: 0 0 6px; padding-left: 22px; }
          .rfe-content .ProseMirror li { margin-bottom: 3px; }
          .rfe-content .ProseMirror li p { margin: 0; }
        `}</style>
      </Head>
      <Toaster position="top-right" />

      {/* ── Template preview modal (renders the real page on the website) ── */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1200,
            background: "rgba(15,23,42,.62)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1400px, 96vw)", height: "92vh", background: "#fff",
              borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
              boxShadow: "0 24px 60px rgba(15,23,42,.35)",
            }}
          >
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #F0F0F8",
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, background: "#6366F118", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="bi bi-eye-fill" style={{ fontSize: 13, color: "#6366F1" }} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0F172A", flex: 1, minWidth: 120 }}>
                Preview — {preview.name}
              </div>

              {/* device toggle */}
              <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 9, padding: 3 }}>
                {[
                  { mobile: false, icon: "bi-display", label: "Desktop" },
                  { mobile: true,  icon: "bi-phone",   label: "Mobile" },
                ].map(d => (
                  <button key={d.label} onClick={() => setPreviewMobile(d.mobile)} style={{
                    border: "none", cursor: "pointer", borderRadius: 7,
                    padding: "5px 13px", fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 6,
                    background: previewMobile === d.mobile ? "#fff" : "transparent",
                    color: previewMobile === d.mobile ? "#6366F1" : "#64748B",
                    boxShadow: previewMobile === d.mobile ? "0 1px 4px rgba(15,23,42,.12)" : "none",
                  }}>
                    <i className={`bi ${d.icon}`} style={{ fontSize: 12 }} /> {d.label}
                  </button>
                ))}
              </div>

              <a href={preview.url} target="_blank" rel="noreferrer" title="Open in new tab" style={{
                width: 34, height: 34, borderRadius: 9, border: "1px solid #E2E8F0",
                background: "#fff", color: "#475569", textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="bi bi-box-arrow-up-right" style={{ fontSize: 13 }} />
              </a>
              <button onClick={() => setPreview(null)} title="Close" style={{
                width: 34, height: 34, borderRadius: 9, border: "none",
                background: "#FEF2F2", color: "#DC2626", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="bi bi-x-lg" style={{ fontSize: 14 }} />
              </button>
            </div>

            <div style={{
              flex: 1, background: "#0F172A", display: "flex",
              justifyContent: "center", overflow: "hidden",
            }}>
              <iframe
                src={preview.url}
                title="Landing page preview"
                style={{
                  width: previewMobile ? 393 : "100%", height: "100%",
                  border: "none", background: "#1a1a1a",
                  boxShadow: previewMobile ? "0 0 0 1px rgba(255,255,255,.15)" : "none",
                }}
              />
            </div>
          </div>
        </div>
      )}

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
                    <i className="bi bi-window-stack" style={{ fontSize: 17, color: "#fff" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>
                    {view === "form" ? (editingId ? "Edit Page" : "New Page") : "SEO Pages"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                    {view === "form"
                      ? "Pick a design, build the page from sections, and publish — it goes live on the website."
                      : "Landing pages for SEO — 5 brand designs, flexible sections, live at your chosen URL."}
                  </div>
                </div>
              </div>
              {view === "list" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={fetchPages} disabled={loading} style={{
                    width: 38, height: 38, borderRadius: 10, border: "1px solid #E2E8F0",
                    background: "#fff", color: "#475569", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }} title="Refresh">
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
                    New Page
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
                  <button onClick={openFormPreview} disabled={saving} style={{
                    height: 38, padding: "0 16px", borderRadius: 10,
                    border: "1px solid #E2E8F0", background: "#fff", color: "#475569",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                  }}>
                    <i className="bi bi-eye-fill" style={{ fontSize: 13 }} />
                    Preview
                  </button>
                  <button onClick={() => savePage("draft")} disabled={saving} style={{
                    height: 38, padding: "0 16px", borderRadius: 10,
                    border: "1px solid #C7D2FE", background: "#F8FAFF", color: "#6366F1",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1,
                  }}>
                    Save Draft
                  </button>
                  <button onClick={() => savePage("published")} disabled={saving} style={{
                    border: "none", borderRadius: 10, padding: "0 20px", height: 38,
                    background: "linear-gradient(135deg,#6366F1,#818CF8)",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    boxShadow: "0 4px 12px rgba(99,102,241,.3)",
                    opacity: saving ? 0.6 : 1,
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
                  <KpiCard icon="bi-window-stack"      label="Total Pages" value={_v(pages.length)}     accent={{ bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" }} />
                  <KpiCard icon="bi-globe2"           label="Published"   value={_v(publishedCount)}   accent={{ bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)" }} />
                  <KpiCard icon="bi-pencil-square"    label="Drafts"      value={_v(draftCount)}       accent={{ bg: "#FFEDD5", icon: "#EA580C", shadow: "rgba(249,115,22,.18)" }} />
                  <KpiCard icon="bi-palette-fill"     label="Designs"     value={TEMPLATES.length}     accent={{ bg: "#F3E8FF", icon: "#9333EA", shadow: "rgba(168,85,247,.18)" }} />
                </div>

                {/* ── Pages table ── */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-window-stack" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Pages</span>
                    <span style={s.countChip}>{loading ? "…" : pages.length}</span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="sp-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                          {["Page", "Design", "Status", "Updated", "Actions"].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={5} style={s.emptyCell}>Loading pages…</td></tr>
                        ) : pages.length === 0 ? (
                          <tr><td colSpan={5} style={s.emptyCell}>
                            No SEO pages yet — click <b>New Page</b>, pick a design and publish your first one.
                          </td></tr>
                        ) : pages.map(p => (
                          <tr key={p._id}>
                            <td style={{ ...s.td, fontWeight: 700, color: "#0F172A" }}>
                              {p.title}
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginTop: 2 }}>/{p.slug}</div>
                            </td>
                            <td style={s.td}>
                              <span style={{
                                display: "inline-block", padding: "4px 10px", borderRadius: 999,
                                background: "#F3E8FF", color: "#9333EA",
                                fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                              }}>
                                {getTemplate(p.template).name}
                              </span>
                            </td>
                            <td style={s.td}>
                              <span style={{
                                display: "inline-block", padding: "4px 10px", borderRadius: 999,
                                background: p.status === "published" ? "#DCFCE7" : "#FFF7ED",
                                color: p.status === "published" ? "#15803D" : "#C2410C",
                                fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", textTransform: "capitalize",
                              }}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ ...s.td, color: "#64748B", whiteSpace: "nowrap" }}>
                              {new Date(p.updatedAt || p.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </td>
                            <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                              <button onClick={() => startEdit(p)} title="Edit" style={s.actionBtn("#EEF2FF", "#6366F1")}>
                                <i className="bi bi-pencil-fill" style={{ fontSize: 11 }} /> Edit
                              </button>
                              {p.status === "published" && (
                                <a href={`${websiteOrigin}/${p.slug}`} target="_blank" rel="noreferrer"
                                  style={{ ...s.actionBtn("#F0FDF4", "#15803D"), textDecoration: "none" }}>
                                  <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }} /> View
                                </a>
                              )}
                              <button onClick={() => toggleStatus(p)}
                                title={p.status === "published" ? "Unpublish" : "Publish"}
                                style={s.actionBtn(p.status === "published" ? "#FFF7ED" : "#F0FDF4", p.status === "published" ? "#C2410C" : "#15803D")}>
                                <i className={`bi ${p.status === "published" ? "bi-eye-slash-fill" : "bi-globe2"}`} style={{ fontSize: 11 }} />
                                {p.status === "published" ? "Unpublish" : "Publish"}
                              </button>
                              <button onClick={() => deletePage(p)} title="Delete" style={s.actionBtn("#FEF2F2", "#DC2626")}>
                                <i className="bi bi-trash-fill" style={{ fontSize: 11 }} /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* ═══════════════ FORM VIEW ═══════════════ */
              <div style={{ marginTop: 22 }}>

                {/* ── Panel: Page setup ── */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-link-45deg" style={{ fontSize: 15, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Page Setup</span>
                  </div>
                  <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                    <Field label="Page Title" hint="Internal name — also the H1 fallback.">
                      <input className="sp-input" style={s.input} value={form.title} onChange={set("title")}
                        placeholder="e.g. Digital Marketing Agency in Lucknow" />
                    </Field>
                    <Field label="Page URL" hint={`Live at ${websiteOrigin}/${slugPreview(form.slug || form.title) || "…"}`}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span style={{
                          height: 40, display: "flex", alignItems: "center", padding: "0 10px",
                          border: "1px solid #E2E8F0", borderRight: "none", borderRadius: "10px 0 0 10px",
                          background: "#F8FAFC", fontSize: 12.5, color: "#94A3B8", fontWeight: 600, whiteSpace: "nowrap",
                        }}>/</span>
                        <input className="sp-input" style={{ ...s.input, borderRadius: "0 10px 10px 0" }}
                          value={form.slug} onChange={set("slug")}
                          placeholder="digital-marketing-agency-lucknow" />
                      </div>
                    </Field>
                  </div>
                </div>

                {/* ── Panel: Template gallery ── */}
                <div style={s.panel}>
                  <div style={{ ...s.panelHead, justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={s.panelIcon}><i className="bi bi-palette-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Design</span>
                      <span style={s.countChip}>{TEMPLATES.length} designs</span>
                    </div>
                    <button onClick={loadSample} style={{
                      display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #C7D2FE",
                      background: "#F8FAFF", color: "#6366F1", borderRadius: 9, padding: "6px 12px",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>
                      <i className="bi bi-magic" style={{ fontSize: 12 }} /> Load sample content
                    </button>
                  </div>
                  <div style={{
                    padding: 18, display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14,
                  }}>
                    {TEMPLATES.map(t => {
                      const selected = form.template === t.key;
                      return (
                        <div key={t.key} className="sp-tpl-card" onClick={() => pickTemplate(t.key)} style={{
                          border: selected ? "2px solid #6366F1" : "1px solid #E8E8F4",
                          borderRadius: 14, padding: selected ? 9 : 10, background: "#fff",
                          position: "relative",
                          boxShadow: selected ? "0 6px 18px rgba(99,102,241,.18)" : "none",
                        }}>
                          {selected && (
                            <div style={{
                              position: "absolute", top: -8, right: -8, width: 22, height: 22,
                              borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#818CF8)",
                              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
                              boxShadow: "0 3px 8px rgba(99,102,241,.35)",
                            }}>
                              <i className="bi bi-check-lg" style={{ fontSize: 12, color: "#fff" }} />
                            </div>
                          )}
                          <TemplatePreview tk={t.key} />
                          <div style={{ padding: "9px 3px 2px" }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginTop: 2, lineHeight: 1.45 }}>{t.tagline}</div>
                            <button
                              onClick={(e) => { e.stopPropagation(); openTplPreview(t); }}
                              style={{
                                marginTop: 9, width: "100%", height: 30,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                border: "1px solid #C7D2FE", background: "#F8FAFF", color: "#6366F1",
                                borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                              }}
                            >
                              <i className="bi bi-eye-fill" style={{ fontSize: 11 }} /> Preview
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Panel: SEO meta ── */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-search" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>SEO</span>
                  </div>
                  <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                    <Field label="Meta Title" hint="Shown in the browser tab & Google result (≈60 chars).">
                      <input className="sp-input" style={s.input} value={form.seoTitle} onChange={set("seoTitle")}
                        placeholder="Digital Marketing Agency in Lucknow | Viralon" />
                    </Field>
                    <Field label="Meta Keywords" hint="Comma separated.">
                      <input className="sp-input" style={s.input} value={form.seoKeywords} onChange={set("seoKeywords")}
                        placeholder="digital marketing lucknow, seo agency, …" />
                    </Field>
                    <Field label="Meta Description" hint="The snippet under the title in Google (≈160 chars)." span>
                      <textarea className="sp-textarea" style={{ ...s.input, height: 70, padding: "10px 12px", resize: "vertical" }}
                        value={form.seoDescription} onChange={set("seoDescription")}
                        placeholder="Viralon is Lucknow's creative digital marketing agency…" />
                    </Field>
                  </div>
                </div>

                {/* ── Panel: Hero ── */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-stars" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Hero</span>
                    <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}>
                      — the big opening block at the top of the page
                    </span>
                  </div>
                  <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                    <Field label="Kicker (small line above headline)">
                      <input className="sp-input" style={s.input} value={form.content.hero.kicker} onChange={setHero("kicker")} />
                    </Field>
                    <Field label="Headline">
                      <input className="sp-input" style={s.input} value={form.content.hero.headline} onChange={setHero("headline")} />
                    </Field>
                    <Field label="Headline Accent" hint="Coloured word after the headline (optional).">
                      <input className="sp-input" style={s.input} value={form.content.hero.headlineAccent} onChange={setHero("headlineAccent")} />
                    </Field>
                    <Field label="Sub-headline">
                      <input className="sp-input" style={s.input} value={form.content.hero.subheadline} onChange={setHero("subheadline")} />
                    </Field>
                    <Field label="Hero Image" hint="Website asset path or full image URL (optional).">
                      <ImgInput value={form.content.hero.heroImage} onChange={setHero("heroImage")} websiteOrigin={websiteOrigin} />
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <Field label="CTA Button Text">
                        <input className="sp-input" style={s.input} value={form.content.hero.ctaText} onChange={setHero("ctaText")} />
                      </Field>
                      <Field label="CTA Link">
                        <input className="sp-input" style={s.input} value={form.content.hero.ctaLink} onChange={setHero("ctaLink")} placeholder="/contact-us" />
                      </Field>
                    </div>
                  </div>
                </div>

                {/* ── Panel: Sections (add / remove / reorder anything) ── */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-stack" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Page Sections</span>
                    <span style={s.countChip}>{sections.length}</span>
                    <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}>
                      — add, remove and reorder in any order; the “{tpl.name}” design styles them
                    </span>
                  </div>
                  <div style={{ padding: "14px 18px 22px" }}>

                    {sections.length === 0 && (
                      <div style={{
                        textAlign: "center", color: "#94A3B8", fontSize: 13, fontWeight: 600,
                        padding: "26px 12px", border: "1px dashed #E2E8F0", borderRadius: 12,
                      }}>
                        No sections yet — add one below, or use <b>Load sample content</b> for a ready-made page.
                      </div>
                    )}

                    {sections.map((sec, i) => {
                      const meta = SECTION_TYPES[sec.type] || {};
                      return (
                        <div key={i} style={{
                          border: "1px solid #E8E8F4", borderRadius: 14, marginTop: 14,
                          background: "#fff", overflow: "hidden",
                        }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "11px 14px", background: "#FAFAFF", borderBottom: "1px solid #F0F0F8",
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 8, background: "#6366F118", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <i className={`bi ${meta.icon || "bi-square"}`} style={{ fontSize: 13, color: "#6366F1" }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>
                                {i + 1}. {meta.label || sec.type}
                              </div>
                              {meta.hint && <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{meta.hint}</div>}
                            </div>
                            <IconBtn icon="bi-arrow-up"   title="Move up"   disabled={i === 0}                     onClick={() => secOp("up", i)} />
                            <IconBtn icon="bi-arrow-down" title="Move down" disabled={i === sections.length - 1}   onClick={() => secOp("down", i)} />
                            <RemoveBtn onClick={() => secOp("remove", i)} />
                          </div>
                          <div style={{ padding: 16 }}>
                            {renderSectionBody(sec, i)}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add-section chips */}
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748B", marginBottom: 9 }}>
                        Add a section
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {SECTION_TYPE_KEYS.map(k => (
                          <button key={k} className="sp-add-chip" onClick={() => secOp("add", null, k)} style={{
                            display: "inline-flex", alignItems: "center", gap: 7,
                            border: "1px dashed #C7D2FE", background: "#F8FAFF", color: "#6366F1",
                            borderRadius: 999, padding: "7px 14px",
                            fontSize: 12, fontWeight: 700, cursor: "pointer",
                          }}>
                            <i className={`bi ${SECTION_TYPES[k].icon}`} style={{ fontSize: 12 }} />
                            {SECTION_TYPES[k].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lead form toggle */}
                    <div style={{
                      marginTop: 22, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                      background: "#F8FAFF", border: "1px solid #E8E8F4", borderRadius: 12, padding: "14px 16px",
                    }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", margin: 0 }}>
                        <input type="checkbox" checked={form.content.showLeadForm !== false}
                          onChange={(e) => setLeadForm(e.target.checked)}
                          style={{ width: 17, height: 17, accentColor: "#6366F1", cursor: "pointer" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Show lead form at the bottom</span>
                      </label>
                      <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500 }}>
                        Enquiries land in the website's queries, tagged “Landing Page — /{slugPreview(form.slug || form.title) || "…"}”.
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            )}
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
  // Image thumbnails & the View links point at the website's server —
  // local dev: http://localhost:3000.
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
    padding: 12, marginTop: 2,
  },
  actionBtn: (bg, color) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer",
    background: bg, color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    marginRight: 6,
  }),
};
