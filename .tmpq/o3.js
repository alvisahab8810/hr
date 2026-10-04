import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import {
  SECTIONS,
  SECTION_MAP,
  blankSection,
  defaultSections
} from "@/utils/sampleSchema";
import { SITE_PAGES } from "@/utils/sitePages";
import { confirmDialog } from "../../../components/ConfirmDialog";
const EMPTY_FORM = () => ({
  title: "",
  slug: "",
  status: "draft",
  template: "sample",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  content: { sections: defaultSections() }
});
const slugPreview = (str) => String(str || "").toLowerCase().trim().replace(/[^a-z0-9\s/-]/g, "").replace(/\//g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
function KpiCard({ icon, label, value, accent }) {
  return /* @__PURE__ */ React.createElement("div", { className: "kpi-card", style: {
    background: `linear-gradient(160deg, #fff 55%, ${accent.bg} 165%)`,
    borderRadius: 16,
    padding: "17px 18px 16px",
    border: `1px solid ${accent.bg}`,
    boxShadow: "0 3px 12px rgba(15,23,42,.06)",
    display: "flex",
    alignItems: "center",
    gap: 14,
    height: "100%",
    position: "relative",
    overflow: "hidden"
  } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon } }), /* @__PURE__ */ React.createElement("div", { style: {
    width: 46,
    height: 46,
    borderRadius: 13,
    flexShrink: 0,
    background: accent.icon,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 6px 16px ${accent.shadow}`
  } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${icon}`, style: { fontSize: 19, color: "#fff" } })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1.05, letterSpacing: "-0.8px" } }, value), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 3 } }, label)));
}
function Field({ label, hint, children, span }) {
  return /* @__PURE__ */ React.createElement("div", { style: { ...s.field, gridColumn: span ? "1 / -1" : void 0 } }, /* @__PURE__ */ React.createElement("label", { style: s.fieldLabel }, label), children, hint && /* @__PURE__ */ React.createElement("div", { style: s.fieldHint }, hint));
}
const MAX_VIDEO = 8 * 1024 * 1024;
const MAX_IMAGE = 200 * 1024;
function fileProblem(f) {
  const isVideo = (f.type || "").startsWith("video/");
  const isImage = (f.type || "").startsWith("image/");
  if (!isVideo && !isImage) return "Only a picture or a video can go here";
  if (isImage && f.type !== "image/webp") return "Pictures have to be WebP";
  if (isImage && f.size > MAX_IMAGE) return "A picture has to be under 200KB";
  if (isVideo && f.size > MAX_VIDEO) return "A video has to be under 8MB";
  return "";
}
function ImgInput({ value, onChange, websiteOrigin }) {
  const src = value ? value.startsWith("/") ? `${websiteOrigin}${value}` : value : "";
  const isVideo = /.(mp4|webm|mov)$/i.test(value || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const bad = fileProblem(f);
    if (bad) {
      setErr(bad);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", f);
      const r = await fetch("/api/upload/page-media", { method: "POST", body, credentials: "include" });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "The upload did not go through");
      onChange({ target: { value: d.url } });
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  };
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: {
    width: 64,
    height: 44,
    borderRadius: 8,
    background: "#F1F5F9",
    flexShrink: 0,
    border: "1px solid #E2E8F0",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  } }, src && !isVideo ? /* @__PURE__ */ React.createElement(
    "img",
    {
      src,
      alt: "",
      style: { width: "100%", height: "100%", objectFit: "cover" },
      onError: (e) => {
        e.currentTarget.style.display = "none";
      }
    }
  ) : /* @__PURE__ */ React.createElement("i", { className: `bi ${isVideo ? "bi-play-btn" : "bi-image"}`, style: { color: "#94A3B8", fontSize: 16 } })), /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "sp-input",
      style: s.input,
      value: value || "",
      onChange,
      placeholder: "/assets/\u2026 or https://\u2026"
    }
  ), /* @__PURE__ */ React.createElement("label", { style: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    border: "1px dashed #C7D2FE",
    background: busy ? "#EEF2FF" : "#F8FAFF",
    color: "#6366F1",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: busy ? "default" : "pointer"
  } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${busy ? "bi-arrow-repeat" : "bi-upload"}`, style: { fontSize: 12 } }), busy ? "Uploading\u2026" : "Upload", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      accept: "image/webp,video/mp4,video/webm,video/quicktime",
      onChange: pick,
      disabled: busy,
      style: { display: "none" }
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: err ? "#DC2626" : "#94A3B8", marginTop: 6 } }, err || "Pictures: WebP, under 200KB. Videos: under 8MB."));
}
function AddBtn({ onClick, label }) {
  return /* @__PURE__ */ React.createElement("button", { onClick, style: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px dashed #C7D2FE",
    background: "#F8FAFF",
    color: "#6366F1",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 8
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg", style: { fontSize: 12 } }), " ", label);
}
function IconBtn({ onClick, icon, title, disabled, tone }) {
  return /* @__PURE__ */ React.createElement("button", { onClick, title, disabled, style: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid #E2E8F0",
    background: tone === "danger" ? "#FEF2F2" : "#fff",
    color: disabled ? "#CBD5E1" : tone === "danger" ? "#DC2626" : "#475569",
    cursor: disabled ? "default" : "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${icon}`, style: { fontSize: 12 } }));
}
function SecField({ f, value, onChange, websiteOrigin }) {
  if (f.k === "faqKey") {
    return /* @__PURE__ */ React.createElement(Field, { label: f.n, hint: "Managed under Website \u2192 FAQs. Only a published set shows up on the page.", span: true }, /* @__PURE__ */ React.createElement("select", { className: "sp-select", style: s.input, value: value || "", onChange }, SITE_PAGES.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.key, value: p.key }, p.label))));
  }
  if (f.t === "area") {
    return /* @__PURE__ */ React.createElement(Field, { label: f.n, span: true }, /* @__PURE__ */ React.createElement(
      "textarea",
      {
        className: "sp-textarea",
        rows: 3,
        style: { ...s.input, height: "auto", padding: "10px 12px", lineHeight: 1.55, resize: "vertical" },
        value: value || "",
        onChange
      }
    ));
  }
  if (f.t === "img") {
    return /* @__PURE__ */ React.createElement(Field, { label: f.n, span: true }, /* @__PURE__ */ React.createElement(ImgInput, { value, onChange, websiteOrigin }));
  }
  return /* @__PURE__ */ React.createElement(Field, { label: f.n }, /* @__PURE__ */ React.createElement("input", { className: "sp-input", style: s.input, value: value || "", onChange }));
}
function SecList({ f, rows, ops, websiteOrigin }) {
  return /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "1 / -1" } }, /* @__PURE__ */ React.createElement("div", { style: { ...s.fieldLabel, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 } }, f.n, /* @__PURE__ */ React.createElement("span", { style: s.countChip }, rows.length)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, rows.map((row, ri) => /* @__PURE__ */ React.createElement("div", { key: ri, style: s.repeatRow }, /* @__PURE__ */ React.createElement("div", { style: {
    width: 24,
    height: 24,
    borderRadius: 7,
    background: "#EEF2FF",
    color: "#6366F1",
    fontSize: 11,
    fontWeight: 900,
    flexShrink: 0,
    marginTop: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  } }, ri + 1), /* @__PURE__ */ React.createElement("div", { style: {
    flex: 1,
    minWidth: 0,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
  } }, f.of.map((sub) => /* @__PURE__ */ React.createElement(
    SecField,
    {
      key: sub.k,
      f: sub,
      value: row[sub.k],
      websiteOrigin,
      onChange: (e) => ops.set(ri, sub.k, e.target.value)
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, marginTop: 2 } }, /* @__PURE__ */ React.createElement(IconBtn, { icon: "bi-arrow-up", title: "Move up", disabled: ri === 0, onClick: () => ops.move(ri, -1) }), /* @__PURE__ */ React.createElement(IconBtn, { icon: "bi-arrow-down", title: "Move down", disabled: ri === rows.length - 1, onClick: () => ops.move(ri, 1) }), /* @__PURE__ */ React.createElement(IconBtn, { icon: "bi-trash-fill", title: "Remove", tone: "danger", onClick: () => ops.remove(ri) }))))), /* @__PURE__ */ React.createElement(AddBtn, { onClick: ops.add, label: `Add to ${f.n.toLowerCase()}` }));
}
export default function WebsitePages({ websiteOrigin }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [openSec, setOpenSec] = useState(null);
  const [palette, setPalette] = useState(false);
  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/landing-pages", { credentials: "include" });
      const data = await r.json();
      if (data.success) setPages(data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchPages();
  }, [fetchPages]);
  const _v = (val) => loading ? "\u2014" : val;
  const publishedCount = useMemo(() => pages.filter((p) => p.status === "published").length, [pages]);
  const draftCount = useMemo(() => pages.filter((p) => p.status !== "published").length, [pages]);
  const sections = form.content.sections || [];
  const slug = slugPreview(form.slug || form.title);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const putSections = (next) => setForm((f) => ({ ...f, content: { ...f.content, sections: next } }));
  const secOp = (op, i, arg) => {
    const next = [...sections];
    if (op === "add") next.push(blankSection(arg));
    if (op === "remove") next.splice(i, 1);
    if (op === "toggle") next[i] = { ...next[i], on: next[i].on === false };
    if (op === "move") {
      const j = i + arg;
      if (j < 0 || j >= next.length) return;
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (op === "copy") next.splice(i + 1, 0, { ...blankSection(next[i].type), data: JSON.parse(JSON.stringify(next[i].data)) });
    putSections(next);
  };
  const setSecField = (i, key, val) => {
    const next = [...sections];
    next[i] = { ...next[i], data: { ...next[i].data, [key]: val } };
    putSections(next);
  };
  const listOps = (i, f) => {
    const rows = sections[i].data[f.k] || [];
    const write = (next) => setSecField(i, f.k, next);
    return {
      add: () => write([...rows, f.of.reduce((o, sub) => (o[sub.k] = "", o), {})]),
      remove: (ri) => write(rows.filter((_, n) => n !== ri)),
      set: (ri, sub, val) => write(rows.map((r, n) => n === ri ? { ...r, [sub]: val } : r)),
      move: (ri, d) => {
        const next = [...rows];
        const j = ri + d;
        if (j < 0 || j >= next.length) return;
        [next[ri], next[j]] = [next[j], next[ri]];
        write(next);
      }
    };
  };
  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM());
    setOpenSec(null);
    setView("form");
  };
  const startEdit = (p) => {
    setEditingId(p._id);
    setForm({
      title: p.title || "",
      slug: p.slug || "",
      status: p.status || "draft",
      template: "sample",
      seoTitle: p.seoTitle || "",
      seoDescription: p.seoDescription || "",
      seoKeywords: p.seoKeywords || "",
      // A page saved under one of the old templates has no band list; it opens
      // as the whole of /sample so there is something to edit rather than a
      // blank screen.
      content: { sections: p.content?.sections?.length ? p.content.sections : defaultSections() }
    });
    setOpenSec(null);
    setView("form");
  };
  const backToList = () => {
    setView("list");
    setEditingId(null);
    setPalette(false);
  };
  const savePage = async (status) => {
    if (!form.title.trim()) return toast.error("Give the page a title");
    if (!slug) return toast.error("Give the page a URL");
    setSaving(true);
    try {
      const body = { ...form, slug, status };
      const r = await fetch(
        editingId ? `/api/admin/landing-pages/${editingId}` : "/api/admin/landing-pages",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body)
        }
      );
      const data = await r.json();
      if (!data.success) throw new Error(data.message || "Could not save");
      toast.success(status === "published" ? "Published" : "Saved as draft");
      await fetchPages();
      backToList();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const toggleStatus = async (p) => {
    const next = p.status === "published" ? "draft" : "published";
    try {
      const r = await fetch(`/api/admin/landing-pages/${p._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...p, status: next })
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.message);
      toast.success(next === "published" ? "Published" : "Unpublished");
      fetchPages();
    } catch (e) {
      toast.error(e.message || "Could not change it");
    }
  };
  const deletePage = async (p) => {
    if (!await confirmDialog(`Delete "${p.title}"? The page at /${p.slug} stops working.`)) return;
    try {
      const r = await fetch(`/api/admin/landing-pages/${p._id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.message);
      toast.success("Deleted");
      fetchPages();
    } catch (e) {
      toast.error(e.message || "Could not delete it");
    }
  };
  const resetToSample = async () => {
    if (!await confirmDialog("Put every band back the way /sample has it? Anything you have written here is lost.")) return;
    putSections(defaultSections());
    setOpenSec(null);
    toast.success("Back to the /sample page");
  };
  return /* @__PURE__ */ React.createElement("section", { className: "main-dashboard-area" }, /* @__PURE__ */ React.createElement(Head, null, /* @__PURE__ */ React.createElement("title", null, "Website Pages \u2014 Viralon"), /* @__PURE__ */ React.createElement("link", { rel: "stylesheet", href: "/asets/css/bootstrap.min.css" }), /* @__PURE__ */ React.createElement("link", { rel: "stylesheet", href: "/asets/css/main.css" }), /* @__PURE__ */ React.createElement("link", { rel: "stylesheet", href: "/asets/css/admin.css" }), /* @__PURE__ */ React.createElement("link", { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" }), /* @__PURE__ */ React.createElement("style", null, `
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .sp-table tbody tr:hover { background: #F8FAFF; }
          .sp-input:focus, .sp-select:focus, .sp-textarea:focus { border-color: #6366F1 !important; outline: none; }
          .sp-add-chip { transition: transform .15s ease, box-shadow .15s ease; }
          .sp-add-chip:hover { transform: translateY(-2px); box-shadow: 0 5px 14px rgba(99,102,241,.15); }
          .sp-band:hover { border-color: #DCE0FB; }
        `)), /* @__PURE__ */ React.createElement(Toaster, { position: "top-right" }), /* @__PURE__ */ React.createElement("div", { className: "main-nav" }, /* @__PURE__ */ React.createElement(WebsiteLeftbar, null), /* @__PURE__ */ React.createElement(LeftbarMobile, null), /* @__PURE__ */ React.createElement(Dashnav, null), /* @__PURE__ */ React.createElement("section", { className: "content home" }, /* @__PURE__ */ React.createElement("div", { className: "block-header" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, view === "form" ? /* @__PURE__ */ React.createElement("button", { onClick: backToList, title: "Back", style: {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-arrow-left", style: { fontSize: 15 } })) : /* @__PURE__ */ React.createElement("div", { style: {
    width: 40,
    height: 40,
    borderRadius: 12,
    flexShrink: 0,
    background: "linear-gradient(135deg,#6366F1,#818CF8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 5px 14px rgba(99,102,241,.25)"
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-window-stack", style: { fontSize: 17, color: "#fff" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 } }, view === "form" ? editingId ? "Edit Page" : "New Page" : "Website Pages"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 } }, view === "form" ? "Every band of the /sample page \u2014 rewrite it, reorder it, switch one off, add another." : "Pages built from the /sample design, each one live at its own URL."))), view === "list" ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: fetchPages, disabled: loading, title: "Refresh", style: {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-arrow-clockwise", style: { fontSize: 15 } })), /* @__PURE__ */ React.createElement("a", { href: `${websiteOrigin}/sample`, target: "_blank", rel: "noreferrer", style: {
    height: 38,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#475569",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 7
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-eye-fill", style: { fontSize: 13 } }), " See the design"), /* @__PURE__ */ React.createElement("button", { onClick: startCreate, style: {
    border: "none",
    borderRadius: 10,
    padding: "9px 18px",
    background: "linear-gradient(135deg,#6366F1,#818CF8)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 7,
    boxShadow: "0 4px 12px rgba(99,102,241,.3)"
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg", style: { fontSize: 14 } }), " New Page")) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: backToList, disabled: saving, style: {
    height: 38,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#475569",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer"
  } }, "Cancel"), editingId && form.status === "published" && /* @__PURE__ */ React.createElement("a", { href: `${websiteOrigin}/${slug}`, target: "_blank", rel: "noreferrer", style: {
    height: 38,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#475569",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 7
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-box-arrow-up-right", style: { fontSize: 13 } }), " View live"), /* @__PURE__ */ React.createElement("button", { onClick: () => savePage("draft"), disabled: saving, style: {
    height: 38,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #C7D2FE",
    background: "#F8FAFF",
    color: "#6366F1",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    opacity: saving ? 0.6 : 1
  } }, "Save Draft"), /* @__PURE__ */ React.createElement("button", { onClick: () => savePage("published"), disabled: saving, style: {
    border: "none",
    borderRadius: 10,
    padding: "0 20px",
    height: 38,
    background: "linear-gradient(135deg,#6366F1,#818CF8)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 7,
    boxShadow: "0 4px 12px rgba(99,102,241,.3)",
    opacity: saving ? 0.6 : 1
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-globe2", style: { fontSize: 14 } }), saving ? "Saving\u2026" : "Publish"))), view === "list" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 22, marginBottom: 26 } }, /* @__PURE__ */ React.createElement(KpiCard, { icon: "bi-window-stack", label: "Total Pages", value: _v(pages.length), accent: { bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" } }), /* @__PURE__ */ React.createElement(KpiCard, { icon: "bi-globe2", label: "Published", value: _v(publishedCount), accent: { bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)" } }), /* @__PURE__ */ React.createElement(KpiCard, { icon: "bi-pencil-square", label: "Drafts", value: _v(draftCount), accent: { bg: "#FFEDD5", icon: "#EA580C", shadow: "rgba(249,115,22,.18)" } }), /* @__PURE__ */ React.createElement(KpiCard, { icon: "bi-layers-fill", label: "Bands Available", value: SECTIONS.length, accent: { bg: "#F3E8FF", icon: "#9333EA", shadow: "rgba(168,85,247,.18)" } })), /* @__PURE__ */ React.createElement("div", { style: s.panel }, /* @__PURE__ */ React.createElement("div", { style: s.panelHead }, /* @__PURE__ */ React.createElement("div", { style: s.panelIcon }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-window-stack", style: { fontSize: 14, color: "#6366F1" } })), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 13, color: "#0F172A" } }, "Pages"), /* @__PURE__ */ React.createElement("span", { style: s.countChip }, loading ? "\u2026" : pages.length)), /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { className: "sp-table", style: { width: "100%", borderCollapse: "collapse", minWidth: 820 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#F8FAFC" } }, ["Page", "Bands", "Status", "Updated", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: s.th }, h)))), /* @__PURE__ */ React.createElement("tbody", null, loading ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 5, style: s.emptyCell }, "Loading pages\u2026")) : pages.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 5, style: s.emptyCell }, "No pages yet \u2014 click ", /* @__PURE__ */ React.createElement("b", null, "New Page"), ". It opens as the whole /sample page, ready to rewrite.")) : pages.map((p) => {
    const live = (p.content?.sections || []).filter((x) => x.on !== false).length;
    return /* @__PURE__ */ React.createElement("tr", { key: p._id }, /* @__PURE__ */ React.createElement("td", { style: { ...s.td, fontWeight: 700, color: "#0F172A" } }, p.title, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: "#94A3B8", marginTop: 2 } }, "/", p.slug)), /* @__PURE__ */ React.createElement("td", { style: s.td }, /* @__PURE__ */ React.createElement("span", { style: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      background: "#F3E8FF",
      color: "#9333EA",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap"
    } }, live, " band", live === 1 ? "" : "s")), /* @__PURE__ */ React.createElement("td", { style: s.td }, /* @__PURE__ */ React.createElement("span", { style: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      background: p.status === "published" ? "#DCFCE7" : "#FFF7ED",
      color: p.status === "published" ? "#15803D" : "#C2410C",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
      textTransform: "capitalize"
    } }, p.status)), /* @__PURE__ */ React.createElement("td", { style: { ...s.td, color: "#64748B", whiteSpace: "nowrap" } }, new Date(p.updatedAt || p.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })), /* @__PURE__ */ React.createElement("td", { style: { ...s.td, whiteSpace: "nowrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => startEdit(p), title: "Edit", style: s.actionBtn("#EEF2FF", "#6366F1") }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-pencil-fill", style: { fontSize: 11 } }), " Edit"), p.status === "published" && /* @__PURE__ */ React.createElement(
      "a",
      {
        href: `${websiteOrigin}/${p.slug}`,
        target: "_blank",
        rel: "noreferrer",
        style: { ...s.actionBtn("#F0FDF4", "#15803D"), textDecoration: "none" }
      },
      /* @__PURE__ */ React.createElement("i", { className: "bi bi-box-arrow-up-right", style: { fontSize: 11 } }),
      " View"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => toggleStatus(p),
        title: p.status === "published" ? "Unpublish" : "Publish",
        style: s.actionBtn(p.status === "published" ? "#FFF7ED" : "#F0FDF4", p.status === "published" ? "#C2410C" : "#15803D")
      },
      /* @__PURE__ */ React.createElement("i", { className: `bi ${p.status === "published" ? "bi-eye-slash-fill" : "bi-globe2"}`, style: { fontSize: 11 } }),
      p.status === "published" ? "Unpublish" : "Publish"
    ), /* @__PURE__ */ React.createElement("button", { onClick: () => deletePage(p), title: "Delete", style: s.actionBtn("#FEF2F2", "#DC2626") }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-trash-fill", style: { fontSize: 11 } }), " Delete")));
  })))))) : /* @__PURE__ */ React.createElement("div", { style: { marginTop: 22 } }, /* @__PURE__ */ React.createElement("div", { style: s.panel }, /* @__PURE__ */ React.createElement("div", { style: s.panelHead }, /* @__PURE__ */ React.createElement("div", { style: s.panelIcon }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-link-45deg", style: { fontSize: 15, color: "#6366F1" } })), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 13, color: "#0F172A" } }, "The page")), /* @__PURE__ */ React.createElement("div", { style: { padding: 18, display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" } }, /* @__PURE__ */ React.createElement(Field, { label: "Title", hint: "Used as the page's name in this list, and as the browser tab when no SEO title is set." }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "sp-input",
      style: s.input,
      value: form.title,
      onChange: set("title"),
      placeholder: "Website design for real estate"
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Page URL", hint: `Live at ${websiteOrigin}/${slug || "\u2026"}` }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "sp-input",
      style: s.input,
      value: form.slug,
      onChange: set("slug"),
      placeholder: "website-design-real-estate"
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "SEO title", span: true }, /* @__PURE__ */ React.createElement("input", { className: "sp-input", style: s.input, value: form.seoTitle, onChange: set("seoTitle") })), /* @__PURE__ */ React.createElement(Field, { label: "SEO description", span: true }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      className: "sp-textarea",
      rows: 2,
      style: { ...s.input, height: "auto", padding: "10px 12px", lineHeight: 1.55, resize: "vertical" },
      value: form.seoDescription,
      onChange: set("seoDescription")
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "SEO keywords", hint: "Comma separated.", span: true }, /* @__PURE__ */ React.createElement("input", { className: "sp-input", style: s.input, value: form.seoKeywords, onChange: set("seoKeywords") })))), /* @__PURE__ */ React.createElement("div", { style: s.panel }, /* @__PURE__ */ React.createElement("div", { style: s.panelHead }, /* @__PURE__ */ React.createElement("div", { style: s.panelIcon }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-layers-fill", style: { fontSize: 14, color: "#6366F1" } })), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 13, color: "#0F172A" } }, "Sections"), /* @__PURE__ */ React.createElement("span", { style: s.countChip }, sections.length), /* @__PURE__ */ React.createElement("div", { style: { marginLeft: "auto", display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: resetToSample, style: {
    height: 32,
    padding: "0 12px",
    borderRadius: 9,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#475569",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer"
  } }, "Reset to /sample"), /* @__PURE__ */ React.createElement("button", { onClick: () => setPalette((v) => !v), style: {
    height: 32,
    padding: "0 14px",
    borderRadius: 9,
    border: "none",
    background: "#EEF2FF",
    color: "#6366F1",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg", style: { fontSize: 12 } }), " Add a section"))), palette && /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 18px", borderBottom: "1px solid #F4F4FD", background: "#FAFAFF" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 } }, SECTIONS.map((def) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: def.key,
      className: "sp-add-chip",
      title: def.about,
      onClick: () => {
        secOp("add", null, def.key);
        setPalette(false);
        setOpenSec(sections.length);
      },
      style: {
        border: "1px solid #E2E8F0",
        background: "#fff",
        color: "#334155",
        borderRadius: 999,
        padding: "7px 14px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer"
      }
    },
    def.n
  )))), /* @__PURE__ */ React.createElement("div", { style: { padding: 18, display: "flex", flexDirection: "column", gap: 12 } }, sections.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { ...s.emptyCell, padding: "26px 0" } }, "No sections \u2014 add one above, or reset the page back to /sample.") : sections.map((sec, i) => {
    const def = SECTION_MAP[sec.type];
    if (!def) return null;
    const open = openSec === i;
    const off = sec.on === false;
    return /* @__PURE__ */ React.createElement("div", { key: sec.id || i, className: "sp-band", style: {
      border: "1px solid #EEF0F7",
      borderRadius: 14,
      overflow: "hidden",
      background: off ? "#FBFBFD" : "#fff",
      opacity: off ? 0.72 : 1,
      transition: "border-color .15s ease"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "11px 14px",
      background: open ? "#F8FAFF" : "transparent"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 26,
      height: 26,
      borderRadius: 8,
      background: "#EEF2FF",
      color: "#6366F1",
      fontSize: 11.5,
      fontWeight: 900,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    } }, i + 1), /* @__PURE__ */ React.createElement("button", { onClick: () => setOpenSec(open ? null : i), style: {
      flex: 1,
      minWidth: 0,
      textAlign: "left",
      border: "none",
      background: "none",
      cursor: "pointer",
      padding: 0
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13.5, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 } }, def.n, off && /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 10.5,
      fontWeight: 800,
      background: "#FEF3C7",
      color: "#B4690E",
      borderRadius: 999,
      padding: "2px 8px"
    } }, "switched off")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: 1 } }, def.about)), /* @__PURE__ */ React.createElement(
      IconBtn,
      {
        icon: off ? "bi-eye-slash" : "bi-eye",
        title: off ? "Switch on" : "Switch off",
        onClick: () => secOp("toggle", i)
      }
    ), /* @__PURE__ */ React.createElement(IconBtn, { icon: "bi-arrow-up", title: "Move up", disabled: i === 0, onClick: () => secOp("move", i, -1) }), /* @__PURE__ */ React.createElement(IconBtn, { icon: "bi-arrow-down", title: "Move down", disabled: i === sections.length - 1, onClick: () => secOp("move", i, 1) }), /* @__PURE__ */ React.createElement(IconBtn, { icon: "bi-files", title: "Duplicate", onClick: () => secOp("copy", i) }), /* @__PURE__ */ React.createElement(
      IconBtn,
      {
        icon: "bi-trash-fill",
        title: "Remove",
        tone: "danger",
        onClick: async () => {
          if (await confirmDialog(`Remove the "${def.n}" section from this page?`)) {
            setOpenSec(null);
            secOp("remove", i);
          }
        }
      }
    ), /* @__PURE__ */ React.createElement(
      IconBtn,
      {
        icon: open ? "bi-chevron-up" : "bi-chevron-down",
        title: open ? "Close" : "Edit",
        onClick: () => setOpenSec(open ? null : i)
      }
    )), open && /* @__PURE__ */ React.createElement("div", { style: {
      padding: 16,
      borderTop: "1px solid #F4F4FD",
      display: "grid",
      gap: 14,
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
    } }, def.fields.map(
      (f) => f.t === "list" ? /* @__PURE__ */ React.createElement(
        SecList,
        {
          key: f.k,
          f,
          rows: sec.data[f.k] || [],
          ops: listOps(i, f),
          websiteOrigin
        }
      ) : /* @__PURE__ */ React.createElement(
        SecField,
        {
          key: f.k,
          f,
          value: sec.data[f.k],
          websiteOrigin,
          onChange: (e) => setSecField(i, f.k, e.target.value)
        }
      )
    )));
  }))))))));
}
export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  const websiteOrigin = (process.env.WEBSITE_ORIGIN || "https://admin.viralon.in").replace(/\/+$/, "");
  return { props: { websiteOrigin } };
}
const s = {
  panel: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #F0F0F8",
    boxShadow: "0 2px 8px rgba(99,102,241,.06)",
    overflow: "hidden",
    marginBottom: 16
  },
  panelHead: {
    padding: "14px 18px 12px",
    borderBottom: "1px solid #F4F4FD",
    display: "flex",
    alignItems: "center",
    gap: 9,
    flexWrap: "wrap"
  },
  panelIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    background: "#6366F118",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  countChip: {
    fontSize: 11,
    fontWeight: 800,
    background: "#EEF2FF",
    color: "#6366F1",
    borderRadius: 20,
    padding: "2px 10px"
  },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748B" },
  fieldHint: { fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: -2 },
  input: { height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13.5, color: "#1E293B", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  th: { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B", borderBottom: "1px solid #EEF0F7", whiteSpace: "nowrap" },
  td: { padding: "13px 16px", fontSize: 13.5, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
  emptyCell: { textAlign: "center", padding: "40px 16px", color: "#94A3B8", fontSize: 13.5 },
  repeatRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    background: "#FAFAFF",
    border: "1px solid #EEF0F7",
    borderRadius: 12,
    padding: 12,
    marginTop: 2
  },
  actionBtn: (bg, color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 11px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: bg,
    color,
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
    marginRight: 6
  })
};
