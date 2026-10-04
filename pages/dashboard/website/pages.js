// pages/dashboard/website/pages.js — Website → Pages.
//
// Builds pages out of the bands the website's /sample page is made of. A new
// page starts as the whole of /sample — every band, in order, with its real
// copy — and from there each band can be rewritten, reordered, switched off or
// removed, and new ones added back from the palette. Give the page its own URL
// and publish, and viralon-new serves it at /<slug> through its root
// catch-all.
//
// The form is not written out field by field. utils/sampleSchema.js describes
// every band — its fields, their labels and the copy /sample shows — and that
// same file is what the website renders from, so this screen can only ask for
// what the website can actually draw. A band added to the schema turns up here
// on its own; nothing in this file needs touching.
//
// The two bands /sample does not let an admin rewrite are the FAQ list and the
// enquiry form. They travel together as one movable "FAQ + enquiry form"
// entry: the questions are managed under Website → Page FAQs and the form is
// the site's one lead form.
import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import {
  SECTIONS, SECTION_MAP, blankSection, defaultSections,
} from "@/utils/sampleSchema";
// The home page is described the same way, by its own schema file. Aliased
// because both files export the same names.
import { PAGE_CONTENT, PAGE_CONTENT_MAP } from "@/utils/pageSchemas";
import {
  SECTIONS as HOME_SECTIONS,
  SECTION_MAP as HOME_MAP,
  blankSection as homeBlank,
  defaultSections as homeDefaults,
} from "@/utils/homeSchema";
import { SITE_PAGES } from "@/utils/sitePages";
import {
  BASE_URL, EMPTY_SEO, SCHEMA_TYPES, ROBOTS_PRESETS, TWITTER_CARDS,
  DEFAULT_ROBOTS, buildSchemaJson, resolveSeo, fromPageSeo,
} from "@/utils/landingSeo";
import { confirmDialog } from "../../../components/ConfirmDialog";

const EMPTY_FORM = () => ({
  title: "", slug: "", status: "draft", template: "sample",
  ...EMPTY_SEO(),
  schemas: [{ type: "WebPage", content: "" }],
  content: { sections: defaultSections() },
});

// A page's head, in the shape models/PageSeo.js stores it — the very record
// Website → Pages SEO keeps for that page key. A page's own screen edits that
// one record by its key rather than keeping a second copy, so the two screens
// can never disagree about the live page's tags.
const EMPTY_PAGE_SEO = (pageKey = "home") => ({
  pageKey, title: "", metaDescription: "", metaKeywords: "", canonical: "",
  ogTitle: "", ogDescription: "", ogImage: "",
  twitterCard: "summary_large_image",
  metaRobots: DEFAULT_ROBOTS, xRobotsTag: DEFAULT_ROBOTS,
  schemas: [{ type: "WebPage", content: "" }],
  status: "published",
});

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

// An image or video path. The thumbnail is fetched from the website's own
// server, because that is where /assets lives — in dev that is localhost:3000.
// What the page builder will take. A clip has to stay small because it plays
// on the public site, and a picture has to be WebP for the same reason — the
// same two rules are enforced again in pages/api/upload/page-media.js.
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
  const src = value ? (value.startsWith("/") ? `${websiteOrigin}${value}` : value) : "";
  const isVideo = /.(mp4|webm|mov)$/i.test(value || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Either paste a path that is already on the site, or hand over a file from
  // this machine — the upload puts it on the server and fills the box in.
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const bad = fileProblem(f);
    if (bad) { setErr(bad); return; }
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

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{
          width: 64, height: 44, borderRadius: 8, background: "#F1F5F9", flexShrink: 0,
          border: "1px solid #E2E8F0", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {src && !isVideo ? (
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <i className={`bi ${isVideo ? "bi-play-btn" : "bi-image"}`} style={{ color: "#94A3B8", fontSize: 16 }} />
          )}
        </div>
        <input className="sp-input" style={s.input} value={value || ""} onChange={onChange}
          placeholder="/assets/… or https://…" />
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
          border: "1px dashed #C7D2FE", background: busy ? "#EEF2FF" : "#F8FAFF",
          color: "#6366F1", borderRadius: 10, padding: "8px 12px",
          fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer",
        }}>
          <i className={`bi ${busy ? "bi-arrow-repeat" : "bi-upload"}`} style={{ fontSize: 12 }} />
          {busy ? "Uploading…" : "Upload"}
          <input type="file" accept="image/webp,video/mp4,video/webm,video/quicktime"
            onChange={pick} disabled={busy} style={{ display: "none" }} />
        </label>
      </div>
      <div style={{ fontSize: 11.5, color: err ? "#DC2626" : "#94A3B8", marginTop: 6 }}>
        {err || "Pictures: WebP, under 200KB. Videos: under 8MB."}
      </div>
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

function IconBtn({ onClick, icon, title, disabled, tone }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E8F0",
      background: tone === "danger" ? "#FEF2F2" : "#fff",
      color: disabled ? "#CBD5E1" : tone === "danger" ? "#DC2626" : "#475569",
      cursor: disabled ? "default" : "pointer", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <i className={`bi ${icon}`} style={{ fontSize: 12 }} />
    </button>
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

/* ─── What the page looks like in Google ── */
function SerpPreview({ seo }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EEF0F7", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#4D5156" }}>{seo.url.replace(/^https?:\/\//, "")}</div>
      <div style={{ fontSize: 18, color: "#1A0DAB", marginTop: 4, lineHeight: 1.3 }}>
        {seo.title || "Page title"}
      </div>
      <div style={{ fontSize: 13, color: "#4D5156", marginTop: 4, lineHeight: 1.6 }}>
        {seo.description || "Write a description and it shows here, the way Google prints it."}
      </div>
      {seo.noindex && (
        <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: "#DC2626" }}>
          This page is set to noindex — it will not appear in search at all.
        </div>
      )}
    </div>
  );
}

/* ─── What the link looks like pasted into WhatsApp, Slack or X ── */
function SocialPreview({ seo, websiteOrigin }) {
  // The stored path is absolute against the live domain, but in dev the image
  // only exists on the website's own server, so the preview looks there.
  const src = seo.image ? seo.image.replace(BASE_URL, websiteOrigin) : "";
  return (
    <div style={{ border: "1px solid #EEF0F7", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <div style={{
        height: 150, background: "#F1F5F9",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {src ? (
          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <div style={{ textAlign: "center", color: "#94A3B8" }}>
            <i className="bi bi-image" style={{ fontSize: 22 }} />
            <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 6 }}>No share image set</div>
          </div>
        )}
      </div>
      <div style={{ padding: "11px 14px 13px", borderTop: "1px solid #EEF0F7" }}>
        <div style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {seo.url.replace(/^https?:\/\//, "").split("/")[0]}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A", marginTop: 3, lineHeight: 1.35 }}>
          {seo.ogTitle || "Page title"}
        </div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, lineHeight: 1.5 }}>
          {seo.ogDescription || "The description that travels with the link."}
        </div>
      </div>
    </div>
  );
}

/* ─── One field of one band, drawn from its descriptor ──────────── */
function SecField({ f, value, onChange, websiteOrigin }) {
  // The FAQ band only names which question set to show, and the sets are the
  // ones under Website → FAQs — so it is a list to pick from, not a key to
  // remember and type.
  if (f.k === "faqKey") {
    return (
      <Field label={f.n} hint="Managed under Website → FAQs. Only a published set shows up on the page." span>
        <select className="sp-select" style={s.input} value={value || ""} onChange={onChange}>
          {SITE_PAGES.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </Field>
    );
  }
  if (f.t === "html") {
    return (
      <Field label={f.n} hint="Plain words are fine. Links, bold, italic and lists are kept; anything else is stripped." span>
        <textarea className="sp-textarea" rows={4}
          style={{ ...s.input, height: "auto", padding: "10px 12px", lineHeight: 1.6, resize: "vertical" }}
          value={value || ""} onChange={onChange} />
      </Field>
    );
  }
  if (f.t === "area") {
    return (
      <Field label={f.n} span>
        <textarea className="sp-textarea" rows={3}
          style={{ ...s.input, height: "auto", padding: "10px 12px", lineHeight: 1.55, resize: "vertical" }}
          value={value || ""} onChange={onChange} />
      </Field>
    );
  }
  if (f.t === "img") {
    return (
      <Field label={f.n} span>
        <ImgInput value={value} onChange={onChange} websiteOrigin={websiteOrigin} />
      </Field>
    );
  }
  return (
    <Field label={f.n}>
      <input className="sp-input" style={s.input} value={value || ""} onChange={onChange} />
    </Field>
  );
}

/* ─── A repeating field: cards, items, steps, clips ─────────────── */
function SecList({ f, rows, ops, websiteOrigin }) {
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <div style={{ ...s.fieldLabel, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        {f.n}
        <span style={s.countChip}>{rows.length}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row, ri) => (
          <div key={ri} style={s.repeatRow}>
            <div style={{
              width: 24, height: 24, borderRadius: 7, background: "#EEF2FF", color: "#6366F1",
              fontSize: 11, fontWeight: 900, flexShrink: 0, marginTop: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {ri + 1}
            </div>

            <div style={{
              flex: 1, minWidth: 0, display: "grid", gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}>
              {f.of.map((sub) => (
                <SecField key={sub.k} f={sub} value={row[sub.k]} websiteOrigin={websiteOrigin}
                  onChange={(e) => ops.set(ri, sub.k, e.target.value)} />
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
              <IconBtn icon="bi-arrow-up" title="Move up" disabled={ri === 0} onClick={() => ops.move(ri, -1)} />
              <IconBtn icon="bi-arrow-down" title="Move down" disabled={ri === rows.length - 1} onClick={() => ops.move(ri, 1)} />
              <IconBtn icon="bi-trash-fill" title="Remove" tone="danger" onClick={() => ops.remove(ri)} />
            </div>
          </div>
        ))}
      </div>

      <AddBtn onClick={ops.add} label={`Add to ${f.n.toLowerCase()}`} />
    </div>
  );
}

/* ─── the two things this screen edits ────────────────────────────────────
   Landing pages are a list of records; the home page is one record that
   always exists. Different enough to be two segments rather than one list
   with a special row in it, and each segment keeps its own state so moving
   between them never half-saves anything. */
/* One pill per thing this screen edits: the landing pages it builds, the home
   page, and every page in the header menu that has its own layout. The menu
   pages come from utils/pageSchemas/index.js, so adding a page there puts it
   in this bar on its own. */
const HOME_PAGE = {
  key: "home",
  label: "Home Page",
  path: "/",
  icon: "bi-house-door-fill",
  about: "The live home page, band by band — every word, photo and video in it.",
  seoPlaceholder: "Viralon | Best Digital Marketing Agency For Revenue Growth",
  schema: {
    SECTIONS: HOME_SECTIONS,
    SECTION_MAP: HOME_MAP,
    blankSection: homeBlank,
    defaultSections: homeDefaults,
  },
};

const EDITABLE_PAGES = [HOME_PAGE, ...PAGE_CONTENT];

const SEGMENTS = [
  ["pages", "bi-window-stack", "Website pages"],
  ...EDITABLE_PAGES.map((p) => [p.key, p.icon, p.label]),
];

function SegmentBar({ segment, onSegment }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
      {SEGMENTS.map(([key, icon, label]) => {
        const on = segment === key;
        return (
          <button key={key} onClick={() => onSegment(key)} style={{
            height: 36, padding: "0 16px", borderRadius: 999, cursor: "pointer",
            border: on ? "1px solid #6366F1" : "1px solid #E2E8F0",
            background: on ? "#EEF2FF" : "#fff",
            color: on ? "#4F46E5" : "#64748B",
            fontSize: 12.5, fontWeight: 800,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <i className={"bi " + icon} style={{ fontSize: 13 }} /> {label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Home page ───────────────────────────────────────────────────────────
   The live home page at /, band by band. One record rather than a list, so
   there is no title, no slug and no publish state: Save puts it live. Its SEO
   is not here either — the home page's meta tags, schema and robots already
   live under Website → Pages SEO, and duplicating them would give the page
   two places to disagree with itself.

   Everything else behaves like the page builder: add a band from the palette,
   move it, park it, duplicate it, remove it, and edit every word, photo and
   video in it. utils/homeSchema.js describes the bands, and the website reads
   the same file, so a band added there turns up here on its own. */
function ContentEditor({ websiteOrigin, segment, onSegment, page }) {
  // Two endpoints, one shape: the home page has its own record, every other
  // page is one row of the site-page collection addressed by its key.
  const api = page.key === "home"
    ? "/api/admin/home-page"
    : "/api/admin/site-page?pageKey=" + page.key;
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [openSec, setOpenSec] = useState(null);
  const [palette, setPalette] = useState(false);
  // "sections" is the page itself, "seo" is its head — the same two tabs the
  // page builder has, so there is one place to look for either.
  const [tab, setTab] = useState("sections");
  const [seoForm, setSeoForm] = useState(() => EMPTY_PAGE_SEO(page.key));
  const [seoDirty, setSeoDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The bands and the head are two records; both are fetched here so the
      // screen opens on what is actually live.
      const [bands, head] = await Promise.all([
        fetch(api, { credentials: "include" }).then((r) => r.json()),
        fetch(`/api/admin/page-seo/upsert?pageKey=${page.key}`, { credentials: "include" }).then((r) => r.json()),
      ]);
      if (bands.success) setSections(bands.data.sections || []);
      if (head.success) {
        const d = head.data;
        setSeoForm(
          d
            ? {
                ...EMPTY_PAGE_SEO(page.key),
                ...d,
                metaRobots: d.metaRobots || DEFAULT_ROBOTS,
                xRobotsTag: d.xRobotsTag || DEFAULT_ROBOTS,
                twitterCard: d.twitterCard || "summary_large_image",
                // One empty block so there is always a row to type into.
                schemas: d.schemas?.length
                  ? d.schemas.map((sc) => ({ type: sc.type || "WebPage", content: sc.content || "" }))
                  : [{ type: "WebPage", content: "" }],
              }
            : EMPTY_PAGE_SEO(page.key)
        );
      }
    } catch {}
    finally { setLoading(false); setDirty(false); setSeoDirty(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const write = (next) => { setSections(next); setDirty(true); };

  /* ── band operations ── */
  const secOp = (op, i, arg) => {
    const next = [...sections];
    if (op === "add") {
      const band = page.schema.blankSection(arg);
      if (band) next.push(band);
    } else if (op === "remove") {
      next.splice(i, 1);
    } else if (op === "toggle") {
      next[i] = { ...next[i], on: next[i].on === false };
    } else if (op === "copy") {
      next.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(next[i])), id: "c" + Date.now().toString(36) });
    } else if (op === "move") {
      const j = i + arg;
      if (j < 0 || j >= next.length) return;
      [next[i], next[j]] = [next[j], next[i]];
    }
    write(next);
  };

  const setSecField = (i, key, val) =>
    write(sections.map((sec, n) => (n === i ? { ...sec, data: { ...sec.data, [key]: val } } : sec)));

  // The same row operations the page builder uses, bound to one band's list.
  const listOps = (i, f) => {
    const rows = sections[i]?.data?.[f.k] || [];
    const put = (next) => setSecField(i, f.k, next);
    return {
      add: () => put([...rows, f.of.reduce((o, sub) => ((o[sub.k] = ""), o), {})]),
      remove: (ri) => put(rows.filter((_, n) => n !== ri)),
      set: (ri, k, v) => put(rows.map((row, n) => (n === ri ? { ...row, [k]: v } : row))),
      move: (ri, d) => {
        const next = [...rows];
        const j = ri + d;
        if (j < 0 || j >= next.length) return;
        [next[ri], next[j]] = [next[j], next[ri]];
        put(next);
      },
    };
  };

  /* ── the head: meta tags, share card, schema, robots ── */
  const seoSet = (key) => (e) => {
    const { value } = e.target;
    setSeoForm((p) => ({ ...p, [key]: value }));
    setSeoDirty(true);
  };
  const seoPut = (key, val) => { setSeoForm((p) => ({ ...p, [key]: val })); setSeoDirty(true); };
  const putSchemas = (next) => { setSeoForm((p) => ({ ...p, schemas: next })); setSeoDirty(true); };
  const updateSchema = (i, k, v) =>
    putSchemas(seoForm.schemas.map((sc, n) => (n === i ? { ...sc, [k]: v } : sc)));
  const addSchema = () => putSchemas([...seoForm.schemas, { type: "WebPage", content: "" }]);
  const removeSchema = (i) => putSchemas(seoForm.schemas.filter((_, n) => n !== i));
  const copySchema = (i) => {
    navigator.clipboard?.writeText(seoForm.schemas[i]?.content || "");
    toast.success("Schema copied");
  };

  // Resolved through the same file the website renders the <head> with, so the
  // previews below are the live page rather than an impression of it.
  const seo = useMemo(() => resolveSeo(fromPageSeo(seoForm, page.path)), [seoForm]);

  // Every question the home page actually shows, in page order — what the
  // generated FAQPage block is built from, the same list pages/index.js hands
  // to the schema builder.
  const pageFaqs = useMemo(
    () => sections
      .filter((x) => x.type === "faqform" && x.on !== false)
      .flatMap((x) => (x.data?.items || []).filter((it) => it?.question)),
    [sections]
  );

  const generateSchema = (i) =>
    updateSchema(i, "content",
      JSON.stringify(buildSchemaJson(seoForm.schemas[i].type, { ...seo, faqs: pageFaqs }), null, 2));

  // A broken JSON-LD block would be printed straight into the live page, so it
  // is caught here, with the block number, rather than dropped by the API.
  const saveSeo = async () => {
    for (let i = 0; i < seoForm.schemas.length; i += 1) {
      const content = (seoForm.schemas[i].content || "").trim();
      if (!content) continue;
      try { JSON.parse(content); } catch {
        setTab("seo");
        throw new Error(`Schema ${i + 1} is not valid JSON`);
      }
    }
    const r = await fetch("/api/admin/page-seo/upsert", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...seoForm, pageKey: page.key, status: "published" }),
    });
    const data = await r.json();
    if (!data.success) throw new Error(data.message);
    setSeoDirty(false);
  };

  const save = async () => {
    if (!sections.length) return toast.error("This page needs at least one band");
    setSaving(true);
    try {
      const r = await fetch(api, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sections }),
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.message);
      setSections(data.data.sections || sections);
      setDirty(false);
      // One button saves the whole page — the bands and the head together, so
      // nobody can leave a tab behind.
      await saveSeo();
      toast.success(page.label + " saved — it is live");
    } catch (e) {
      toast.error(e.message || "Could not save it");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    if (!(await confirmDialog("Put " + page.label + " back to the bands the site ships with? Everything written here is lost."))) return;
    try {
      const r = await fetch(api, { method: "DELETE", credentials: "include" });
      const data = await r.json();
      if (!data.success) throw new Error(data.message);
      setSections(data.data.sections || page.schema.defaultSections());
      setOpenSec(null);
      setDirty(false);
      toast.success("Back to the shipped page");
    } catch (e) {
      toast.error(e.message || "Could not reset it");
    }
  };

  const liveCount = sections.filter((x) => x.on !== false).length;

  return (
    <section className="main-dashboard-area">
      <Head>
        <title>{page.label} — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .sp-input:focus, .sp-select:focus, .sp-textarea:focus { border-color: #6366F1 !important; outline: none; }
          .sp-add-chip { transition: transform .15s ease, box-shadow .15s ease; }
          .sp-add-chip:hover { transform: translateY(-2px); box-shadow: 0 5px 14px rgba(99,102,241,.15); }
          .sp-band:hover { border-color: #DCE0FB; }
          @media (max-width: 1100px) { .seo-form-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">
            <SegmentBar segment={segment} onSegment={onSegment} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg,#6366F1,#818CF8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 5px 14px rgba(99,102,241,.25)",
                }}>
                  <i className={"bi " + page.icon} style={{ fontSize: 17, color: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>
                    {page.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                    {page.about}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button onClick={load} disabled={loading || saving} title="Reload what is live" style={{
                  width: 38, height: 38, borderRadius: 10, border: "1px solid #E2E8F0",
                  background: "#fff", color: "#475569", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className="bi bi-arrow-clockwise" style={{ fontSize: 15 }} />
                </button>
                <a href={websiteOrigin + page.path} target="_blank" rel="noreferrer" style={{
                  height: 38, padding: "0 16px", borderRadius: 10, border: "1px solid #E2E8F0",
                  background: "#fff", color: "#475569", textDecoration: "none",
                  fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 7,
                }}>
                  <i className="bi bi-box-arrow-up-right" style={{ fontSize: 13 }} /> View live
                </a>
                <button onClick={save} disabled={saving || loading} style={{
                  border: "none", borderRadius: 10, padding: "0 20px", height: 38,
                  background: "linear-gradient(135deg,#6366F1,#818CF8)",
                  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  boxShadow: "0 4px 12px rgba(99,102,241,.3)", opacity: saving ? 0.6 : 1,
                }}>
                  <i className="bi bi-check2-circle" style={{ fontSize: 14 }} />
                  {saving ? "Saving…" : dirty || seoDirty ? "Save changes" : "Save"}
                </button>
              </div>
            </div>

            {/* ── Two tabs: the page, and how it is found ── */}
            <div style={{ display: "flex", gap: 6, marginTop: 18, flexWrap: "wrap" }}>
              {[
                ["sections", "bi-layers-fill", "Page content", `${sections.length} sections`],
                ["seo", "bi-search", "SEO & sharing", seo.noindex ? "noindex" : `${seoForm.schemas.filter((x) => x.content).length} schemas`],
              ].map(([key, icon, label, note]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                  border: tab === key ? "1px solid #C7D2FE" : "1px solid #EEF0F7",
                  background: tab === key ? "#EEF2FF" : "#fff",
                  color: tab === key ? "#4F46E5" : "#64748B",
                  borderRadius: 11, padding: "9px 16px", fontSize: 13, fontWeight: 800,
                }}>
                  <i className={`bi ${icon}`} style={{ fontSize: 13 }} />
                  {label}
                  <span style={{
                    fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 8px",
                    background: tab === key ? "#fff" : "#F1F5F9",
                    color: key === "seo" && seo.noindex ? "#DC2626" : "#94A3B8",
                  }}>
                    {note}
                  </span>
                </button>
              ))}
            </div>

            {tab === "sections" && (<>

            <div style={{ ...s.panel, marginTop: 16 }}>
              <div style={s.panelHead}>
                <div style={s.panelIcon}><i className="bi bi-layers-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Bands on this page</span>
                <span style={s.countChip}>{liveCount} live / {sections.length}</span>
                {dirty && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 800, background: "#FEF3C7", color: "#B4690E",
                    borderRadius: 999, padding: "3px 9px",
                  }}>
                    unsaved
                  </span>
                )}
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button onClick={resetAll} style={{
                    height: 32, padding: "0 12px", borderRadius: 9, border: "1px solid #E2E8F0",
                    background: "#fff", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>
                    Reset to shipped
                  </button>
                  <button onClick={() => setPalette((v) => !v)} style={{
                    height: 32, padding: "0 14px", borderRadius: 9, border: "none",
                    background: "#EEF2FF", color: "#6366F1", fontSize: 12, fontWeight: 800, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <i className="bi bi-plus-lg" style={{ fontSize: 12 }} /> Add a section
                  </button>
                </div>
              </div>

              {palette && (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F4F4FD", background: "#FAFAFF" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {page.schema.SECTIONS.map((def) => (
                      <button key={def.key} className="sp-add-chip" title={def.about}
                        onClick={() => { secOp("add", null, def.key); setPalette(false); setOpenSec(sections.length); }}
                        style={{
                          border: "1px solid #E2E8F0", background: "#fff", color: "#334155",
                          borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}>
                        {def.n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                {loading ? (
                  <div style={{ ...s.emptyCell, padding: "26px 0" }}>Loading the page…</div>
                ) : sections.length === 0 ? (
                  <div style={{ ...s.emptyCell, padding: "26px 0" }}>
                    No bands — add one above, or reset back to the shipped page.
                  </div>
                ) : sections.map((sec, i) => {
                  const def = page.schema.SECTION_MAP[sec.type];
                  if (!def) return null;
                  const open = openSec === i;
                  const off = sec.on === false;
                  return (
                    <div key={sec.id || i} className="sp-band" style={{
                      border: "1px solid #EEF0F7", borderRadius: 14, overflow: "hidden",
                      background: off ? "#FBFBFD" : "#fff", opacity: off ? 0.72 : 1,
                      transition: "border-color .15s ease",
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                        background: open ? "#F8FAFF" : "transparent",
                      }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 8, background: "#EEF2FF", color: "#6366F1",
                          fontSize: 11.5, fontWeight: 900, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {i + 1}
                        </div>

                        <button onClick={() => setOpenSec(open ? null : i)} style={{
                          flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "none",
                          cursor: "pointer", padding: 0,
                        }}>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                            {def.n}
                            {off && (
                              <span style={{
                                fontSize: 10.5, fontWeight: 800, background: "#FEF3C7", color: "#B4690E",
                                borderRadius: 999, padding: "2px 8px",
                              }}>
                                switched off
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: 1 }}>{def.about}</div>
                        </button>

                        <IconBtn icon={off ? "bi-eye-slash" : "bi-eye"} title={off ? "Switch on" : "Switch off"}
                          onClick={() => secOp("toggle", i)} />
                        <IconBtn icon="bi-arrow-up" title="Move up" disabled={i === 0} onClick={() => secOp("move", i, -1)} />
                        <IconBtn icon="bi-arrow-down" title="Move down" disabled={i === sections.length - 1} onClick={() => secOp("move", i, 1)} />
                        <IconBtn icon="bi-files" title="Duplicate" onClick={() => secOp("copy", i)} />
                        <IconBtn icon="bi-trash-fill" title="Remove" tone="danger"
                          onClick={async () => {
                            if (await confirmDialog('Remove the "' + def.n + '" band from this page?')) {
                              setOpenSec(null);
                              secOp("remove", i);
                            }
                          }} />
                        <IconBtn icon={open ? "bi-chevron-up" : "bi-chevron-down"} title={open ? "Close" : "Edit"}
                          onClick={() => setOpenSec(open ? null : i)} />
                      </div>

                      {open && (
                        <div style={{
                          padding: 16, borderTop: "1px solid #F4F4FD", display: "grid", gap: 14,
                          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                        }}>
                          {def.fields.map((f) =>
                            f.t === "list" ? (
                              <SecList key={f.k} f={f} rows={sec.data?.[f.k] || []}
                                ops={listOps(i, f)} websiteOrigin={websiteOrigin} />
                            ) : (
                              <SecField key={f.k} f={f} value={sec.data?.[f.k]} websiteOrigin={websiteOrigin}
                                onChange={(e) => setSecField(i, f.k, e.target.value)} />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Where the rest of the home page is edited, so nobody hunts for
                it in here. */}
            <div style={{ ...s.panel, marginTop: 16 }}>
              <div style={s.panelHead}>
                <div style={s.panelIcon}><i className="bi bi-signpost-split-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Not in here</span>
              </div>
              <div style={{ padding: 18, fontSize: 12.5, color: "#64748B", fontWeight: 500, lineHeight: 1.7 }}>
                The meta tags, schema and robots are on the <strong>SEO &amp; sharing</strong> tab above — the same
                record <strong>Website → Pages SEO</strong> holds for this page, so editing it either side is
                editing one thing. Case-study rails come from <strong>Website → Case studies</strong>, the blog rail
                from <strong>Website → Blogs</strong>, and the questions in the FAQ band from{" "}
                <strong>Website → FAQs</strong> unless you write this page&apos;s own in the band itself.
              </div>
            </div>

            </>)}

            {tab === "seo" && (
              <div className="seo-form-grid" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, alignItems: "start", marginTop: 16 }}>

                {/* ── Left: what goes in the page's head ── */}
                <div>
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-card-heading" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Meta tags</span>
                    </div>
                    <div style={{ padding: 18, display: "grid", gap: 14 }}>
                      <Field label="Title" hint="The browser tab, and the blue line in Google. Left blank, the page keeps the title it ships with." span>
                        <input className="sp-input" style={s.input} value={seoForm.title} onChange={seoSet("title")}
                          placeholder={page.seoPlaceholder || "Viralon"} />
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Counter value={seoForm.title} min={30} max={60} />
                        </div>
                      </Field>

                      <Field label="Meta description" hint="The grey paragraph under the title in search results." span>
                        <textarea className="sp-textarea"
                          style={{ ...s.input, height: 84, padding: "10px 12px", lineHeight: 1.6, resize: "vertical" }}
                          value={seoForm.metaDescription} onChange={seoSet("metaDescription")}
                          placeholder="What this page is about, in one sentence a buyer would recognise." />
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Counter value={seoForm.metaDescription} min={70} max={160} />
                        </div>
                      </Field>

                      <Field label="Meta keywords" hint="Comma separated. Google ignores these; other crawlers still read them." span>
                        <input className="sp-input" style={s.input} value={seoForm.metaKeywords} onChange={seoSet("metaKeywords")}
                          placeholder="digital marketing agency, performance marketing, cro" />
                      </Field>

                      <Field label="Canonical URL" hint={`Leave blank and the page uses ${BASE_URL}${page.path}`} span>
                        <input className="sp-input" style={s.input} value={seoForm.canonical} onChange={seoSet("canonical")}
                          placeholder={`${BASE_URL}${page.path}`} />
                      </Field>
                    </div>
                  </div>

                  {/* ── Open Graph / Twitter ── */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-share-fill" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>When the link is shared</span>
                    </div>
                    <div style={{ padding: 18, display: "grid", gap: 14 }}>
                      <Field label="Share title" hint="Used by WhatsApp, LinkedIn, Slack and X. Falls back to the meta title." span>
                        <input className="sp-input" style={s.input} value={seoForm.ogTitle} onChange={seoSet("ogTitle")}
                          placeholder={seo.title || ""} />
                      </Field>
                      <Field label="Share description" hint="Falls back to the meta description." span>
                        <textarea className="sp-textarea"
                          style={{ ...s.input, height: 70, padding: "10px 12px", lineHeight: 1.6, resize: "vertical" }}
                          value={seoForm.ogDescription} onChange={seoSet("ogDescription")}
                          placeholder={seo.description || ""} />
                      </Field>
                      <Field label="Share image" hint="1200 × 630 works everywhere. A path on the site, or a full URL." span>
                        <ImgInput value={seoForm.ogImage} websiteOrigin={websiteOrigin}
                          onChange={(e) => seoPut("ogImage", e.target.value)} />
                      </Field>
                      <Field label="Twitter card" span>
                        <select className="sp-select" style={s.input} value={seoForm.twitterCard}
                          onChange={seoSet("twitterCard")}>
                          {TWITTER_CARDS.map((t) => (
                            <option key={t} value={t}>
                              {t === "summary_large_image" ? "Large image (summary_large_image)" : "Small (summary)"}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>

                  {/* ── Schema ── */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-code-square" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Schema (JSON-LD)</span>
                      <span style={s.countChip}>{seoForm.schemas.length}</span>
                    </div>
                    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                      {seoForm.schemas.map((sc, i) => {
                        let bad = false;
                        if ((sc.content || "").trim()) {
                          try { JSON.parse(sc.content); } catch { bad = true; }
                        }
                        return (
                          <div key={i} style={s.repeatRow}>
                            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{
                                  fontSize: 11, fontWeight: 800, color: "#94A3B8",
                                  textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 62,
                                }}>
                                  Schema {i + 1}
                                </span>
                                <select className="sp-select" style={{ ...s.input, height: 34, flex: 1, minWidth: 150 }}
                                  value={sc.type} onChange={(e) => updateSchema(i, "type", e.target.value)}>
                                  {SCHEMA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <button type="button" onClick={() => generateSchema(i)} style={s.miniBtn("#EEF2FF", "#6366F1")}>
                                  <i className="bi bi-magic" style={{ fontSize: 11 }} /> Generate
                                </button>
                                <button type="button" onClick={() => copySchema(i)} style={s.miniBtn("#F1F5F9", "#475569")}>
                                  <i className="bi bi-clipboard" style={{ fontSize: 11 }} /> Copy
                                </button>
                                <button type="button" onClick={() => removeSchema(i)}
                                  disabled={seoForm.schemas.length === 1}
                                  style={{ ...s.miniBtn("#FEF2F2", "#DC2626"), opacity: seoForm.schemas.length === 1 ? 0.45 : 1 }}>
                                  <i className="bi bi-trash-fill" style={{ fontSize: 11 }} />
                                </button>
                              </div>
                              <textarea className="sp-textarea"
                                style={{
                                  ...s.input, height: 170, padding: "10px 12px",
                                  fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, resize: "vertical",
                                  borderColor: bad ? "#FCA5A5" : "#E2E8F0",
                                }}
                                placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "${sc.type}"\n}`}
                                value={sc.content} onChange={(e) => updateSchema(i, "content", e.target.value)} />
                              {bad && (
                                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#DC2626" }}>
                                  Not valid JSON — the page will not save until this is fixed.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <AddBtn onClick={addSchema} label="Add schema" />
                      <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, lineHeight: 1.7 }}>
                        Pick a type and press <b>Generate</b> — the block is filled from the title, description, URL
                        and share image above. Leave every block empty and the page still gets a
                        <b> WebPage</b> block of its own.
                        {pageFaqs.length > 0 && (
                          <> A <b>FAQPage</b> block is added automatically from the {pageFaqs.length} question
                          {pageFaqs.length === 1 ? "" : "s"} the page shows, so you never have to keep JSON-LD in
                          step with the FAQ band by hand.</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Right: previews and robots ── */}
                <div>
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-google" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Search preview</span>
                    </div>
                    <div style={{ padding: 16 }}><SerpPreview seo={seo} /></div>
                  </div>

                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-chat-square-text-fill" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Share preview</span>
                    </div>
                    <div style={{ padding: 16 }}>
                      <SocialPreview seo={seo} websiteOrigin={websiteOrigin} />
                    </div>
                  </div>

                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-robot" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Indexing</span>
                      {seo.noindex && (
                        <span style={{
                          fontSize: 10.5, fontWeight: 800, background: "#FEF2F2", color: "#DC2626",
                          borderRadius: 999, padding: "3px 9px",
                        }}>
                          noindex
                        </span>
                      )}
                    </div>
                    <div style={{ padding: 18, display: "grid", gap: 14 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {ROBOTS_PRESETS.map(([label, val]) => {
                          const on = seoForm.metaRobots === val;
                          return (
                            <button key={label} type="button"
                              onClick={() => { setSeoForm((p) => ({ ...p, metaRobots: val, xRobotsTag: val })); setSeoDirty(true); }}
                              style={s.miniBtn(on ? "#EEF2FF" : "#F1F5F9", on ? "#6366F1" : "#475569")}>
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      <Field label="Meta robots tag" hint="Printed into the page's head." span>
                        <input className="sp-input" style={s.input} value={seoForm.metaRobots} onChange={seoSet("metaRobots")} />
                        <code style={s.code}>{`<meta name="robots" content="${seoForm.metaRobots}">`}</code>
                      </Field>

                      <Field label="X-Robots-Tag (HTTP header)" hint="Stored with the page. These pages are built ahead of time, so the tag that actually decides it is the meta one above." span>
                        <input className="sp-input" style={s.input} value={seoForm.xRobotsTag} onChange={seoSet("xRobotsTag")} />
                        <code style={s.code}>{`X-Robots-Tag: ${seoForm.xRobotsTag}`}</code>
                      </Field>

                      <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, lineHeight: 1.7 }}>
                        Both default to <b>{DEFAULT_ROBOTS}</b>. <b>noindex</b> takes this page out of search altogether — use it while a page is being rehearsed.
                      </div>
                    </div>
                  </div>

                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <div style={s.panelIcon}><i className="bi bi-patch-question-fill" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Questions on this page</span>
                      <span style={s.countChip}>{pageFaqs.length}</span>
                    </div>
                    <div style={{ padding: 18, fontSize: 12.5, color: "#64748B", fontWeight: 600, lineHeight: 1.75 }}>
                      {pageFaqs.length > 0 ? (
                        <>
                          These go out as a <b>FAQPage</b> block, which is what gets a page its drop-down answers in
                          Google. Edit them in the <b>FAQ + enquiry form</b> band under{" "}
                          <button onClick={() => setTab("sections")} style={{
                            border: "none", background: "none", padding: 0, cursor: "pointer",
                            color: "#6366F1", fontWeight: 800, textDecoration: "underline",
                          }}>
                            Page content
                          </button>.
                        </>
                      ) : (
                        <>
                          No questions written into the band yet — it is borrowing a published set from{" "}
                          <b>Website → FAQs</b>, and those go into the schema just the same. Write the home page&apos;s
                          own in the <b>FAQ + enquiry form</b> band under{" "}
                          <button onClick={() => setTab("sections")} style={{
                            border: "none", background: "none", padding: 0, cursor: "pointer",
                            color: "#6366F1", fontWeight: 800, textDecoration: "underline",
                          }}>
                            Page content
                          </button>.
                        </>
                      )}
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

function WebsitePages({ websiteOrigin, segment, onSegment }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // view: "list" | "form"; editingId null = create
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Which band is expanded, and whether the palette is showing.
  const [openSec, setOpenSec] = useState(null);
  const [palette, setPalette] = useState(false);
  // "sections" is the page itself, "seo" is how it appears in search and when
  // the link is shared. Two tabs rather than one very long scroll.
  const [tab, setTab] = useState("sections");

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

  const _v = (val) => (loading ? "—" : val);
  const publishedCount = useMemo(() => pages.filter((p) => p.status === "published").length, [pages]);
  const draftCount = useMemo(() => pages.filter((p) => p.status !== "published").length, [pages]);

  const sections = form.content.sections || [];
  const slug = slugPreview(form.slug || form.title);

  // Resolved through the same file the website renders the <head> with, so the
  // previews below are not an approximation of the live page — they are it.
  const seo = useMemo(() => resolveSeo({ ...form, slug }), [form, slug]);

  // Every question on the page, in page order. Feeds the generated FAQPage
  // block, and the count shown on the SEO tab.
  const pageFaqs = useMemo(
    () => sections
      .filter((x) => x.type === "faqform" && x.on !== false)
      .flatMap((x) => (x.data?.items || []).filter((it) => it?.question)),
    [sections]
  );

  /* ── state helpers ── */
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const f = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const putSections = (next) =>
    setForm((f) => ({ ...f, content: { ...f.content, sections: next } }));

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

  // The ops one repeating field needs. A fresh row is the blank version of
  // that field's own sub-fields, so a new card arrives empty rather than
  // carrying a copy of the first one's words.
  const listOps = (i, f) => {
    const rows = sections[i].data[f.k] || [];
    const write = (next) => setSecField(i, f.k, next);
    return {
      add: () => write([...rows, f.of.reduce((o, sub) => ((o[sub.k] = ""), o), {})]),
      remove: (ri) => write(rows.filter((_, n) => n !== ri)),
      set: (ri, sub, val) => write(rows.map((r, n) => (n === ri ? { ...r, [sub]: val } : r))),
      move: (ri, d) => {
        const next = [...rows];
        const j = ri + d;
        if (j < 0 || j >= next.length) return;
        [next[ri], next[j]] = [next[j], next[ri]];
        write(next);
      },
    };
  };

  /* ── list ⇄ form ── */
  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM());
    setOpenSec(null);
    setTab("sections");
    setView("form");
  };

  const startEdit = (p) => {
    setEditingId(p._id);
    setForm({
      ...EMPTY_FORM(),
      ...p,
      status: p.status || "draft",
      template: "sample",
      metaRobots: p.metaRobots || DEFAULT_ROBOTS,
      xRobotsTag: p.xRobotsTag || DEFAULT_ROBOTS,
      twitterCard: p.twitterCard || "summary_large_image",
      // One empty block so the editor always has a row to type into.
      schemas: p.schemas?.length ? p.schemas.map((sc) => ({ ...sc })) : [{ type: "WebPage", content: "" }],
      // A page saved under one of the old templates has no band list; it opens
      // as the whole of /sample so there is something to edit rather than a
      // blank screen.
      content: { sections: p.content?.sections?.length ? p.content.sections : defaultSections() },
    });
    setOpenSec(null);
    setTab("sections");
    setView("form");
  };

  const backToList = () => { setView("list"); setEditingId(null); setPalette(false); };

  /* ── schema blocks ── */
  const addSchema = () =>
    setForm((p) => ({ ...p, schemas: [...p.schemas, { type: "WebPage", content: "" }] }));
  const removeSchema = (i) =>
    setForm((p) => ({ ...p, schemas: p.schemas.filter((_, n) => n !== i) }));
  const updateSchema = (i, k, v) =>
    setForm((p) => ({ ...p, schemas: p.schemas.map((sc, n) => (n === i ? { ...sc, [k]: v } : sc)) }));
  const generateSchema = (i) =>
    updateSchema(i, "content",
      JSON.stringify(buildSchemaJson(form.schemas[i].type, { ...seo, faqs: pageFaqs }), null, 2));
  const copySchema = (i) => {
    navigator.clipboard?.writeText(form.schemas[i]?.content || "");
    toast.success("Schema copied");
  };

  const savePage = async (status) => {
    if (!form.title.trim()) return toast.error("Give the page a title");
    if (!slug) return toast.error("Give the page a URL");
    // A broken JSON-LD block would be printed straight into the live page, so
    // it is caught here, with the block number, rather than silently dropped
    // by the API.
    for (let i = 0; i < form.schemas.length; i += 1) {
      const content = (form.schemas[i].content || "").trim();
      if (!content) continue;
      try { JSON.parse(content); } catch {
        setTab("seo");
        return toast.error(`Schema ${i + 1} is not valid JSON`);
      }
    }
    setSaving(true);
    try {
      const body = { ...form, slug, status };
      const r = await fetch(
        editingId ? `/api/admin/landing-pages/${editingId}` : "/api/admin/landing-pages",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
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
        body: JSON.stringify({ ...p, status: next }),
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
    if (!(await confirmDialog(`Delete "${p.title}"? The page at /${p.slug} stops working.`))) return;
    try {
      const r = await fetch(`/api/admin/landing-pages/${p._id}`, {
        method: "DELETE", credentials: "include",
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
    if (!(await confirmDialog("Put every band back the way /sample has it? Anything you have written here is lost."))) return;
    putSections(defaultSections());
    setOpenSec(null);
    toast.success("Back to the /sample page");
  };

  return (
    <section className="main-dashboard-area">
      <Head>
        <title>Website Pages — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .sp-table tbody tr:hover { background: #F8FAFF; }
          .sp-input:focus, .sp-select:focus, .sp-textarea:focus { border-color: #6366F1 !important; outline: none; }
          .sp-add-chip { transition: transform .15s ease, box-shadow .15s ease; }
          .sp-add-chip:hover { transform: translateY(-2px); box-shadow: 0 5px 14px rgba(99,102,241,.15); }
          .sp-band:hover { border-color: #DCE0FB; }
        `}</style>
      </Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">
            <SegmentBar segment={segment} onSegment={onSegment} />

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
                    {view === "form" ? (editingId ? "Edit Page" : "New Page") : "Website Pages"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                    {view === "form"
                      ? "Every band of the /sample page — rewrite it, reorder it, switch one off, add another."
                      : "Pages built from the /sample design, each one live at its own URL."}
                  </div>
                </div>
              </div>

              {view === "list" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={fetchPages} disabled={loading} title="Refresh" style={{
                    width: 38, height: 38, borderRadius: 10, border: "1px solid #E2E8F0",
                    background: "#fff", color: "#475569", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className="bi bi-arrow-clockwise" style={{ fontSize: 15 }} />
                  </button>
                  <a href={`${websiteOrigin}/sample`} target="_blank" rel="noreferrer" style={{
                    height: 38, padding: "0 16px", borderRadius: 10, border: "1px solid #E2E8F0",
                    background: "#fff", color: "#475569", textDecoration: "none",
                    fontSize: 13, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 7,
                  }}>
                    <i className="bi bi-eye-fill" style={{ fontSize: 13 }} /> See the design
                  </a>
                  <button onClick={startCreate} style={{
                    border: "none", borderRadius: 10, padding: "9px 18px",
                    background: "linear-gradient(135deg,#6366F1,#818CF8)",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    boxShadow: "0 4px 12px rgba(99,102,241,.3)",
                  }}>
                    <i className="bi bi-plus-lg" style={{ fontSize: 14 }} /> New Page
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={backToList} disabled={saving} style={{
                    height: 38, padding: "0 16px", borderRadius: 10,
                    border: "1px solid #E2E8F0", background: "#fff", color: "#475569",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>
                    Cancel
                  </button>
                  {editingId && form.status === "published" && (
                    <a href={`${websiteOrigin}/${slug}`} target="_blank" rel="noreferrer" style={{
                      height: 38, padding: "0 16px", borderRadius: 10, border: "1px solid #E2E8F0",
                      background: "#fff", color: "#475569", textDecoration: "none",
                      fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 7,
                    }}>
                      <i className="bi bi-box-arrow-up-right" style={{ fontSize: 13 }} /> View live
                    </a>
                  )}
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
                  <KpiCard icon="bi-window-stack" label="Total Pages" value={_v(pages.length)} accent={{ bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" }} />
                  <KpiCard icon="bi-globe2" label="Published" value={_v(publishedCount)} accent={{ bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)" }} />
                  <KpiCard icon="bi-pencil-square" label="Drafts" value={_v(draftCount)} accent={{ bg: "#FFEDD5", icon: "#EA580C", shadow: "rgba(249,115,22,.18)" }} />
                  <KpiCard icon="bi-layers-fill" label="Bands Available" value={SECTIONS.length} accent={{ bg: "#F3E8FF", icon: "#9333EA", shadow: "rgba(168,85,247,.18)" }} />
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
                          {["Page", "Bands", "Status", "Updated", "Actions"].map((h) => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={5} style={s.emptyCell}>Loading pages…</td></tr>
                        ) : pages.length === 0 ? (
                          <tr><td colSpan={5} style={s.emptyCell}>
                            No pages yet — click <b>New Page</b>. It opens as the whole /sample page, ready to rewrite.
                          </td></tr>
                        ) : pages.map((p) => {
                          const live = (p.content?.sections || []).filter((x) => x.on !== false).length;
                          return (
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
                                  {live} band{live === 1 ? "" : "s"}
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
                                {/* A published page set to noindex looks live but is invisible in
                                    search, which is worth saying in the list rather than only inside
                                    the editor. */}
                                {/noindex/i.test(p.metaRobots || "") && (
                                  <span style={{
                                    display: "inline-block", marginLeft: 6, padding: "4px 9px", borderRadius: 999,
                                    background: "#FEF2F2", color: "#DC2626",
                                    fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
                                  }}>
                                    noindex
                                  </span>
                                )}
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ marginTop: 22 }}>

                {/* ── Two tabs: the page, and how it is found ── */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  {[
                    ["sections", "bi-layers-fill", "Page content", `${sections.length} sections`],
                    ["seo", "bi-search", "SEO & sharing", seo.noindex ? "noindex" : `${form.schemas.filter((x) => x.content).length} schemas`],
                  ].map(([key, icon, label, note]) => (
                    <button key={key} onClick={() => setTab(key)} style={{
                      display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                      border: tab === key ? "1px solid #C7D2FE" : "1px solid #EEF0F7",
                      background: tab === key ? "#EEF2FF" : "#fff",
                      color: tab === key ? "#4F46E5" : "#64748B",
                      borderRadius: 11, padding: "9px 16px", fontSize: 13, fontWeight: 800,
                    }}>
                      <i className={`bi ${icon}`} style={{ fontSize: 13 }} />
                      {label}
                      <span style={{
                        fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 8px",
                        background: tab === key ? "#fff" : "#F1F5F9",
                        color: key === "seo" && seo.noindex ? "#DC2626" : "#94A3B8",
                      }}>
                        {note}
                      </span>
                    </button>
                  ))}
                </div>

                {tab === "sections" && (<>

                {/* ── The page itself: name and URL ── */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-link-45deg" style={{ fontSize: 15, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>The page</span>
                  </div>
                  <div style={{ padding: 18, display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                    <Field label="Title" hint="Used as the page's name in this list, and as the browser tab when no SEO title is set.">
                      <input className="sp-input" style={s.input} value={form.title} onChange={set("title")}
                        placeholder="Website design for real estate" />
                    </Field>
                    <Field label="Page URL" hint={`Live at ${websiteOrigin}/${slug || "…"}`}>
                      <input className="sp-input" style={s.input} value={form.slug} onChange={set("slug")}
                        placeholder="website-design-real-estate" />
                    </Field>
                  </div>
                </div>

                {/* ── The bands ── */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-layers-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Sections</span>
                    <span style={s.countChip}>{sections.length}</span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button onClick={resetToSample} style={{
                        height: 32, padding: "0 12px", borderRadius: 9, border: "1px solid #E2E8F0",
                        background: "#fff", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>
                        Reset to /sample
                      </button>
                      <button onClick={() => setPalette((v) => !v)} style={{
                        height: 32, padding: "0 14px", borderRadius: 9, border: "none",
                        background: "#EEF2FF", color: "#6366F1", fontSize: 12, fontWeight: 800, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <i className="bi bi-plus-lg" style={{ fontSize: 12 }} /> Add a section
                      </button>
                    </div>
                  </div>

                  {palette && (
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid #F4F4FD", background: "#FAFAFF" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {SECTIONS.map((def) => (
                          <button key={def.key} className="sp-add-chip" title={def.about}
                            onClick={() => { secOp("add", null, def.key); setPalette(false); setOpenSec(sections.length); }}
                            style={{
                              border: "1px solid #E2E8F0", background: "#fff", color: "#334155",
                              borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                            }}>
                            {def.n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                    {sections.length === 0 ? (
                      <div style={{ ...s.emptyCell, padding: "26px 0" }}>
                        No sections — add one above, or reset the page back to /sample.
                      </div>
                    ) : sections.map((sec, i) => {
                      const def = SECTION_MAP[sec.type];
                      if (!def) return null;
                      const open = openSec === i;
                      const off = sec.on === false;
                      return (
                        <div key={sec.id || i} className="sp-band" style={{
                          border: "1px solid #EEF0F7", borderRadius: 14, overflow: "hidden",
                          background: off ? "#FBFBFD" : "#fff", opacity: off ? 0.72 : 1,
                          transition: "border-color .15s ease",
                        }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                            background: open ? "#F8FAFF" : "transparent",
                          }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: 8, background: "#EEF2FF", color: "#6366F1",
                              fontSize: 11.5, fontWeight: 900, flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {i + 1}
                            </div>

                            <button onClick={() => setOpenSec(open ? null : i)} style={{
                              flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "none",
                              cursor: "pointer", padding: 0,
                            }}>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                                {def.n}
                                {off && (
                                  <span style={{
                                    fontSize: 10.5, fontWeight: 800, background: "#FEF3C7", color: "#B4690E",
                                    borderRadius: 999, padding: "2px 8px",
                                  }}>
                                    switched off
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: 1 }}>{def.about}</div>
                            </button>

                            <IconBtn icon={off ? "bi-eye-slash" : "bi-eye"} title={off ? "Switch on" : "Switch off"}
                              onClick={() => secOp("toggle", i)} />
                            <IconBtn icon="bi-arrow-up" title="Move up" disabled={i === 0} onClick={() => secOp("move", i, -1)} />
                            <IconBtn icon="bi-arrow-down" title="Move down" disabled={i === sections.length - 1} onClick={() => secOp("move", i, 1)} />
                            <IconBtn icon="bi-files" title="Duplicate" onClick={() => secOp("copy", i)} />
                            <IconBtn icon="bi-trash-fill" title="Remove" tone="danger"
                              onClick={async () => {
                                if (await confirmDialog(`Remove the "${def.n}" section from this page?`)) {
                                  setOpenSec(null);
                                  secOp("remove", i);
                                }
                              }} />
                            <IconBtn icon={open ? "bi-chevron-up" : "bi-chevron-down"} title={open ? "Close" : "Edit"}
                              onClick={() => setOpenSec(open ? null : i)} />
                          </div>

                          {open && (
                            <div style={{
                              padding: 16, borderTop: "1px solid #F4F4FD", display: "grid", gap: 14,
                              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                            }}>
                              {def.fields.map((f) =>
                                f.t === "list" ? (
                                  <SecList key={f.k} f={f} rows={sec.data[f.k] || []}
                                    ops={listOps(i, f)} websiteOrigin={websiteOrigin} />
                                ) : (
                                  <SecField key={f.k} f={f} value={sec.data[f.k]} websiteOrigin={websiteOrigin}
                                    onChange={(e) => setSecField(i, f.k, e.target.value)} />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                </>)}

                {tab === "seo" && (
                  <div className="seo-form-grid" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, alignItems: "start" }}>

                    {/* ── Left: what goes in the page's head ── */}
                    <div>
                      <div style={s.panel}>
                        <div style={s.panelHead}>
                          <div style={s.panelIcon}><i className="bi bi-card-heading" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Meta tags</span>
                        </div>
                        <div style={{ padding: 18, display: "grid", gap: 14 }}>
                          <Field label="Title" hint="The browser tab, and the blue line in Google. Falls back to the page title." span>
                            <input className="sp-input" style={s.input} value={form.seoTitle} onChange={set("seoTitle")}
                              placeholder={form.title || "Viralon | Websites That Convert"} />
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <Counter value={form.seoTitle || form.title} min={30} max={60} />
                            </div>
                          </Field>

                          <Field label="Meta description" hint="The grey paragraph under the title in search results." span>
                            <textarea className="sp-textarea"
                              style={{ ...s.input, height: 84, padding: "10px 12px", lineHeight: 1.6, resize: "vertical" }}
                              value={form.seoDescription} onChange={set("seoDescription")}
                              placeholder="What this page is about, in one sentence a buyer would recognise." />
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <Counter value={form.seoDescription} min={70} max={160} />
                            </div>
                          </Field>

                          <Field label="Meta keywords" hint="Comma separated. Google ignores these; other crawlers still read them." span>
                            <input className="sp-input" style={s.input} value={form.seoKeywords} onChange={set("seoKeywords")}
                              placeholder="website design agency, cro, landing pages" />
                          </Field>

                          <Field label="Canonical URL" hint={`Leave blank and the page uses ${BASE_URL}/${slug || "…"}`} span>
                            <input className="sp-input" style={s.input} value={form.canonical} onChange={set("canonical")}
                              placeholder={`${BASE_URL}/${slug || ""}`} />
                          </Field>
                        </div>
                      </div>

                      {/* ── Open Graph / Twitter ── */}
                      <div style={s.panel}>
                        <div style={s.panelHead}>
                          <div style={s.panelIcon}><i className="bi bi-share-fill" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>When the link is shared</span>
                        </div>
                        <div style={{ padding: 18, display: "grid", gap: 14 }}>
                          <Field label="Share title" hint="Used by WhatsApp, LinkedIn, Slack and X. Falls back to the meta title." span>
                            <input className="sp-input" style={s.input} value={form.ogTitle} onChange={set("ogTitle")}
                              placeholder={seo.title || ""} />
                          </Field>
                          <Field label="Share description" hint="Falls back to the meta description." span>
                            <textarea className="sp-textarea"
                              style={{ ...s.input, height: 70, padding: "10px 12px", lineHeight: 1.6, resize: "vertical" }}
                              value={form.ogDescription} onChange={set("ogDescription")}
                              placeholder={seo.description || ""} />
                          </Field>
                          <Field label="Share image" hint="1200 × 630 works everywhere. A path on the site, or a full URL." span>
                            <ImgInput value={form.ogImage} websiteOrigin={websiteOrigin}
                              onChange={(e) => f("ogImage", e.target.value)} />
                          </Field>
                          <Field label="Twitter card" span>
                            <select className="sp-select" style={s.input} value={form.twitterCard}
                              onChange={set("twitterCard")}>
                              {TWITTER_CARDS.map((t) => (
                                <option key={t} value={t}>
                                  {t === "summary_large_image" ? "Large image (summary_large_image)" : "Small (summary)"}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                      </div>

                      {/* ── Schema ── */}
                      <div style={s.panel}>
                        <div style={s.panelHead}>
                          <div style={s.panelIcon}><i className="bi bi-code-square" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Schema (JSON-LD)</span>
                          <span style={s.countChip}>{form.schemas.length}</span>
                        </div>
                        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                          {form.schemas.map((sc, i) => {
                            let bad = false;
                            if ((sc.content || "").trim()) {
                              try { JSON.parse(sc.content); } catch { bad = true; }
                            }
                            return (
                              <div key={i} style={s.repeatRow}>
                                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <span style={{
                                      fontSize: 11, fontWeight: 800, color: "#94A3B8",
                                      textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 62,
                                    }}>
                                      Schema {i + 1}
                                    </span>
                                    <select className="sp-select" style={{ ...s.input, height: 34, flex: 1, minWidth: 150 }}
                                      value={sc.type} onChange={(e) => updateSchema(i, "type", e.target.value)}>
                                      {SCHEMA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <button type="button" onClick={() => generateSchema(i)} style={s.miniBtn("#EEF2FF", "#6366F1")}>
                                      <i className="bi bi-magic" style={{ fontSize: 11 }} /> Generate
                                    </button>
                                    <button type="button" onClick={() => copySchema(i)} style={s.miniBtn("#F1F5F9", "#475569")}>
                                      <i className="bi bi-clipboard" style={{ fontSize: 11 }} /> Copy
                                    </button>
                                    <button type="button" onClick={() => removeSchema(i)}
                                      disabled={form.schemas.length === 1}
                                      style={{ ...s.miniBtn("#FEF2F2", "#DC2626"), opacity: form.schemas.length === 1 ? 0.45 : 1 }}>
                                      <i className="bi bi-trash-fill" style={{ fontSize: 11 }} />
                                    </button>
                                  </div>
                                  <textarea className="sp-textarea"
                                    style={{
                                      ...s.input, height: 170, padding: "10px 12px",
                                      fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, resize: "vertical",
                                      borderColor: bad ? "#FCA5A5" : "#E2E8F0",
                                    }}
                                    placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "${sc.type}"\n}`}
                                    value={sc.content} onChange={(e) => updateSchema(i, "content", e.target.value)} />
                                  {bad && (
                                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#DC2626" }}>
                                      Not valid JSON — the page will not save until this is fixed.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <AddBtn onClick={addSchema} label="Add schema" />
                          <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, lineHeight: 1.7 }}>
                            Pick a type and press <b>Generate</b> — the block is filled from this page&apos;s title,
                            description, URL and share image. Leave every block empty and the page still gets a
                            <b> WebPage</b> block of its own.
                            {pageFaqs.length > 0 && (
                              <> A <b>FAQPage</b> block is added automatically from the {pageFaqs.length} question
                              {pageFaqs.length === 1 ? "" : "s"} on the page, so you never have to keep JSON-LD in
                              step with the FAQ section by hand.</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Right: previews and robots ── */}
                    <div>
                      <div style={s.panel}>
                        <div style={s.panelHead}>
                          <div style={s.panelIcon}><i className="bi bi-google" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Search preview</span>
                        </div>
                        <div style={{ padding: 16 }}><SerpPreview seo={seo} /></div>
                      </div>

                      <div style={s.panel}>
                        <div style={s.panelHead}>
                          <div style={s.panelIcon}><i className="bi bi-chat-square-text-fill" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Share preview</span>
                        </div>
                        <div style={{ padding: 16 }}>
                          <SocialPreview seo={seo} websiteOrigin={websiteOrigin} />
                        </div>
                      </div>

                      <div style={s.panel}>
                        <div style={s.panelHead}>
                          <div style={s.panelIcon}><i className="bi bi-robot" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Indexing</span>
                          {seo.noindex && (
                            <span style={{
                              fontSize: 10.5, fontWeight: 800, background: "#FEF2F2", color: "#DC2626",
                              borderRadius: 999, padding: "3px 9px",
                            }}>
                              noindex
                            </span>
                          )}
                        </div>
                        <div style={{ padding: 18, display: "grid", gap: 14 }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {ROBOTS_PRESETS.map(([label, val]) => {
                              const on = form.metaRobots === val;
                              return (
                                <button key={label} type="button"
                                  onClick={() => setForm((p) => ({ ...p, metaRobots: val, xRobotsTag: val }))}
                                  style={s.miniBtn(on ? "#EEF2FF" : "#F1F5F9", on ? "#6366F1" : "#475569")}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          <Field label="Meta robots tag" hint="Printed into the page's head." span>
                            <input className="sp-input" style={s.input} value={form.metaRobots} onChange={set("metaRobots")} />
                            <code style={s.code}>{`<meta name="robots" content="${form.metaRobots}">`}</code>
                          </Field>

                          <Field label="X-Robots-Tag (HTTP header)" hint="Sent as a response header — the only way to mark a file crawlers fetch without running it." span>
                            <input className="sp-input" style={s.input} value={form.xRobotsTag} onChange={set("xRobotsTag")} />
                            <code style={s.code}>{`X-Robots-Tag: ${form.xRobotsTag}`}</code>
                          </Field>

                          <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500, lineHeight: 1.7 }}>
                            Both default to <b>{DEFAULT_ROBOTS}</b>. Use <b>noindex</b> while a page is being
                            rehearsed, or for a page that only exists for one campaign&apos;s ads.
                          </div>
                        </div>
                      </div>

                      <div style={s.panel}>
                        <div style={s.panelHead}>
                          <div style={s.panelIcon}><i className="bi bi-patch-question-fill" style={{ fontSize: 13, color: "#6366F1" }} /></div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Questions on this page</span>
                          <span style={s.countChip}>{pageFaqs.length}</span>
                        </div>
                        <div style={{ padding: 18, fontSize: 12.5, color: "#64748B", fontWeight: 600, lineHeight: 1.75 }}>
                          {pageFaqs.length > 0 ? (
                            <>
                              These go out as a <b>FAQPage</b> block, which is what gets a page its drop-down
                              answers in Google. Edit them in the <b>FAQ + enquiry form</b> section under{" "}
                              <button onClick={() => setTab("sections")} style={{
                                border: "none", background: "none", padding: 0, cursor: "pointer",
                                color: "#6366F1", fontWeight: 800, textDecoration: "underline",
                              }}>
                                Page content
                              </button>.
                            </>
                          ) : (
                            <>
                              No questions written for this page yet — the FAQ section is borrowing a published set.
                              Write this page&apos;s own in the <b>FAQ + enquiry form</b> section under{" "}
                              <button onClick={() => setTab("sections")} style={{
                                border: "none", background: "none", padding: 0, cursor: "pointer",
                                color: "#6366F1", fontWeight: 800, textDecoration: "underline",
                              }}>
                                Page content
                              </button>{" "}
                              and they go into the schema on their own.
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx global>{`
        @media (max-width: 1100px) {
          .seo-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

/* The screen. Nothing but which segment is showing — each one holds its own
   state, so switching never half-saves anything. The editor is keyed on the
   page so moving between two pages starts clean rather than carrying the
   previous page's bands for a render. */
export default function WebsitePagesScreen({ websiteOrigin }) {
  const [segment, setSegment] = useState("pages");
  const props = { websiteOrigin, segment, onSegment: setSegment };
  const page = segment === "home" ? HOME_PAGE : PAGE_CONTENT_MAP[segment];
  return page ? (
    <ContentEditor key={page.key} page={page} {...props} />
  ) : (
    <WebsitePages {...props} />
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  // Image thumbnails and the View links point at the website's own server —
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
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748B" },
  fieldHint: { fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: -2 },
  input: { height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13.5, color: "#1E293B", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  th: { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B", borderBottom: "1px solid #EEF0F7", whiteSpace: "nowrap" },
  td: { padding: "13px 16px", fontSize: 13.5, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
  emptyCell: { textAlign: "center", padding: "40px 16px", color: "#94A3B8", fontSize: 13.5 },
  repeatRow: {
    display: "flex", gap: 10, alignItems: "flex-start",
    background: "#FAFAFF", border: "1px solid #EEF0F7", borderRadius: 12,
    padding: 12, marginTop: 2,
  },
  code: {
    display: "block", background: "#F8FAFC", border: "1px solid #EEF0F7", borderRadius: 8,
    padding: "7px 10px", fontSize: 11, color: "#475569", wordBreak: "break-all", marginTop: 2,
  },
  miniBtn: (bg, color) => ({
    display: "inline-flex", alignItems: "center", gap: 5, height: 30,
    padding: "0 11px", borderRadius: 8, border: "none", cursor: "pointer",
    background: bg, color, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
  }),
  actionBtn: (bg, color) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer",
    background: bg, color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    marginRight: 6,
  }),
};
