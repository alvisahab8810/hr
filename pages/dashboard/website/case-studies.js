// pages/dashboard/website/case-studies.js — Case Studies manager
// (Website → Case Studies).
//
// One record per case study. It feeds two things on viralon-new: the page at
// /case-study/<slug>, and the Case Studies rail on the home page, whose logo
// row links into it. Both read the shared Mongo "casestudies" collection.
//
// The page on the website is a stack of numbered sections and every one of
// them has the same skeleton -- a number, a label, a three-piece heading and a
// list of things. So rather than a bespoke form per section, SECTION_SPECS
// below describes each one and <SectionCard /> draws it. Adding the next
// section to the website means adding a line to that list, not another form.
import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { confirmDialog } from "../../../components/ConfirmDialog";

/* ── shapes ─────────────────────────────────────────────────────────── */

const emptyHeading = () => ({ lead: "", accent: "", tail: "" });
const emptyMedia = () => ({ kind: "image", image: "", video: "", poster: "", caption: "", alt: "" });
const emptyCard = () => ({ number: "", kicker: "", title: "", body: "", image: "", tone: "", ctaLabel: "", ctaHref: "" });
const emptyStat = () => ({ value: "", label: "", sub: "" });

const emptySection = (number, label) => ({
  enabled: true,
  number,
  label,
  navLabel: "",
  heading: emptyHeading(),
  intro: "",
  items: [],
  cards: [],
  steps: [],
  stats: [],
  flow: [],
  autoScrollSeconds: 4,
});

const EMPTY_FORM = () => ({
  slug: "",
  brandName: "",
  brandLogo: "",
  category: "",
  dateLabel: "",
  tags: [],
  hero: { heading: emptyHeading(), intro: "", media: emptyMedia(), stats: [] },
  onThisPage: { enabled: true, title: "ON THIS PAGE", ctaLabel: "LET'S TALK", ctaHref: "/contact-us" },
  inMotion: emptySection("01", "IN MOTION"),
  workItself: emptySection("02", "THE WORK ITSELF"),
  problem: emptySection("03", "THE CHALLENGE"),
  approach: emptySection("04", "OUR APPROACH"),
  teams: emptySection("", "THE TEAM"),
  howItRan: emptySection("06", "HOW IT RAN"),
  stack: emptySection("07", "STACK"),
  landed: emptySection("08", "WHERE IT LANDED"),
  home: { enabled: true, order: 0, heading: emptyHeading(), body: "", image: "", ctaLabel: "Read Case Study" },
  seo: { title: "", metaDescription: "", metaKeywords: "", canonical: "", ogTitle: "", ogDescription: "", ogImage: "" },
  status: "draft",
});

// Which editors each section needs, listed in the order they appear on the
// page so this screen reads top to bottom the way the site does. `name` is the
// section's name on the design, `list` names the array on the section and
// `row` the editor that draws each entry in it.
const SECTION_SPECS = [
  { key: "inMotion",   name: "In Motion",       list: "items", row: "media" },
  { key: "workItself", name: "The Work Itself", list: "items", row: "media", autoScroll: true },
  { key: "problem",    name: "The Challenge",   list: "cards", row: "card",  intro: true },
  { key: "approach",   name: "Our Approach",    list: "cards", row: "card",  intro: true },
  { key: "teams",      name: "The Team",        list: "cards", row: "card",  intro: true },
  { key: "howItRan",   name: "How It Ran",      list: "steps", row: "card" },
  { key: "stack",      name: "Stack",           list: "items", row: "stack" },
  { key: "landed",     name: "Where It Landed", list: "flow",  row: "flow",  stats: true },
];

const toSlug = (v) =>
  String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* Merge a record from the API onto the empty shape, so a document saved
   before a field existed still opens with every input present. */
function hydrate(doc) {
  const base = EMPTY_FORM();
  const out = { ...base, ...doc };
  out.hero = { ...base.hero, ...(doc.hero || {}) };
  out.hero.heading = { ...emptyHeading(), ...(doc.hero?.heading || {}) };
  out.hero.media = { ...emptyMedia(), ...(doc.hero?.media || {}) };
  out.hero.stats = doc.hero?.stats || [];
  out.onThisPage = { ...base.onThisPage, ...(doc.onThisPage || {}) };
  out.home = { ...base.home, ...(doc.home || {}) };
  out.home.heading = { ...emptyHeading(), ...(doc.home?.heading || {}) };
  out.seo = { ...base.seo, ...(doc.seo || {}) };
  out.tags = doc.tags || [];
  SECTION_SPECS.forEach((spec) => {
    const saved = doc[spec.key] || {};
    out[spec.key] = {
      ...base[spec.key],
      ...saved,
      heading: { ...emptyHeading(), ...(saved.heading || {}) },
      [spec.list]: saved[spec.list] || [],
      stats: saved.stats || [],
    };
  });
  return out;
}

/* ── small inputs ───────────────────────────────────────────────────── */

function Field({ label, hint, children, wide }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined, marginBottom: 12 }}>
      <label style={s.label}>{label}</label>
      {children}
      {hint ? <div style={s.hint}>{hint}</div> : null}
    </div>
  );
}

function Text({ value, onChange, placeholder, rows }) {
  if (rows) {
    return (
      <textarea
        style={{ ...s.input, minHeight: rows * 22 }}
        rows={rows}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      style={s.input}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// A URL with an upload beside it. The file goes to this server and comes back
// as an absolute URL, because the page that shows it is served elsewhere.
function MediaInput({ value, onChange, accept = "image/*", label }) {
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/case-study-media", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");
      onChange(json.url);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {label ? <label style={s.label}>{label}</label> : null}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          style={{ ...s.input, flex: 1 }}
          value={value || ""}
          placeholder="https://… or upload"
          onChange={(e) => onChange(e.target.value)}
        />
        <label style={{ ...s.btnGhost, cursor: busy ? "wait" : "pointer", whiteSpace: "nowrap" }}>
          {busy ? "…" : "Upload"}
          <input
            type="file"
            accept={accept}
            style={{ display: "none" }}
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      </div>
      {value && /\.(png|jpe?g|webp|gif|svg)$/i.test(value) ? (
        <img src={value} alt="" style={{ marginTop: 6, height: 54, borderRadius: 8, objectFit: "cover" }} />
      ) : null}
    </div>
  );
}

function HeadingInput({ value = {}, onChange }) {
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  return (
    <div style={s.grid3}>
      <Field label="Heading — start" hint="Plain text before the colour">
        <Text value={value.lead} onChange={set("lead")} />
      </Field>
      <Field label="Heading — accent" hint="Drawn in orange">
        <Text value={value.accent} onChange={set("accent")} />
      </Field>
      <Field label="Heading — end">
        <Text value={value.tail} onChange={set("tail")} />
      </Field>
    </div>
  );
}

// A repeatable list with add / remove / reorder.
function Repeater({ label, rows, onChange, make, render }) {
  const set = (i, next) => onChange(rows.map((r, j) => (j === i ? next : r)));
  const move = (i, d) => {
    const next = [...rows];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div style={s.repeatHead}>
        <span style={s.label}>{label}</span>
        <button type="button" style={s.btnGhost} onClick={() => onChange([...rows, make()])}>
          <i className="bi bi-plus-lg" /> Add
        </button>
      </div>

      {rows.length === 0 ? <div style={s.empty}>Nothing added yet.</div> : null}

      {rows.map((row, i) => (
        <div key={i} style={s.repeatRow}>
          <div style={s.repeatTools}>
            <span style={s.repeatNum}>{i + 1}</span>
            <button type="button" style={s.iconBtn} onClick={() => move(i, -1)} title="Move up">
              <i className="bi bi-arrow-up" />
            </button>
            <button type="button" style={s.iconBtn} onClick={() => move(i, 1)} title="Move down">
              <i className="bi bi-arrow-down" />
            </button>
            <button
              type="button"
              style={{ ...s.iconBtn, color: "#DC2626" }}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              title="Remove"
            >
              <i className="bi bi-trash" />
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>{render(row, (next) => set(i, next))}</div>
        </div>
      ))}
    </div>
  );
}

/* ── row editors ────────────────────────────────────────────────────── */

function StatRow({ row, set }) {
  return (
    <div style={s.grid3}>
      <Field label="Figure"><Text value={row.value} onChange={(v) => set({ ...row, value: v })} placeholder="+245%" /></Field>
      <Field label="Label"><Text value={row.label} onChange={(v) => set({ ...row, label: v })} placeholder="Engagement" /></Field>
      <Field label="Small print"><Text value={row.sub} onChange={(v) => set({ ...row, sub: v })} /></Field>
    </div>
  );
}

function MediaRow({ row, set }) {
  const isVideo = row.kind === "video";
  return (
    <div>
      <div style={s.grid3}>
        <Field label="Type">
          <select style={s.input} value={row.kind} onChange={(e) => set({ ...row, kind: e.target.value })}>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </Field>
        <Field label="Caption"><Text value={row.caption} onChange={(v) => set({ ...row, caption: v })} /></Field>
        <Field label="Alt text" hint="Described for screen readers">
          <Text value={row.alt} onChange={(v) => set({ ...row, alt: v })} />
        </Field>
      </div>
      {isVideo ? (
        <div style={s.grid2}>
          <MediaInput label="Video file" accept="video/*" value={row.video} onChange={(v) => set({ ...row, video: v })} />
          <MediaInput label="Poster (shown before play)" value={row.poster} onChange={(v) => set({ ...row, poster: v })} />
        </div>
      ) : (
        <MediaInput label="Image" value={row.image} onChange={(v) => set({ ...row, image: v })} />
      )}
    </div>
  );
}

function CardRow({ row, set }) {
  return (
    <div>
      <div style={s.grid3}>
        <Field label="Number" hint='e.g. "01"'><Text value={row.number} onChange={(v) => set({ ...row, number: v })} /></Field>
        <Field label="Kicker" hint="Small line above the title"><Text value={row.kicker} onChange={(v) => set({ ...row, kicker: v })} /></Field>
        <Field label="Tone" hint="dark / purple / light — leave blank for default">
          <Text value={row.tone} onChange={(v) => set({ ...row, tone: v })} />
        </Field>
      </div>
      <Field label="Title" wide><Text value={row.title} onChange={(v) => set({ ...row, title: v })} /></Field>
      <Field label="Body" wide><Text rows={3} value={row.body} onChange={(v) => set({ ...row, body: v })} /></Field>
      <div style={s.grid3}>
        <div><MediaInput label="Image" value={row.image} onChange={(v) => set({ ...row, image: v })} /></div>
        <Field label="Button label"><Text value={row.ctaLabel} onChange={(v) => set({ ...row, ctaLabel: v })} /></Field>
        <Field label="Button link"><Text value={row.ctaHref} onChange={(v) => set({ ...row, ctaHref: v })} placeholder="/contact-us" /></Field>
      </div>
    </div>
  );
}

function StackRow({ row, set }) {
  return (
    <div style={s.grid3}>
      <Field label="Name"><Text value={row.name} onChange={(v) => set({ ...row, name: v })} placeholder="Next.js" /></Field>
      <Field label="Colour" hint="The card ground - any CSS colour, e.g. #262626. Keep it dark enough for white type.">
        <Text value={row.color} onChange={(v) => set({ ...row, color: v })} />
      </Field>
      <div><MediaInput label="Logo" value={row.image} onChange={(v) => set({ ...row, image: v })} /></div>
    </div>
  );
}

function FlowRow({ row, set }) {
  return (
    <div style={s.grid2}>
      <Field label="Step"><Text value={row.label} onChange={(v) => set({ ...row, label: v })} placeholder="Website" /></Field>
      <Field label="Under it"><Text value={row.sub} onChange={(v) => set({ ...row, sub: v })} /></Field>
    </div>
  );
}

const ROW_EDITORS = {
  card: { make: emptyCard, render: (row, set) => <CardRow row={row} set={set} /> },
  media: { make: emptyMedia, render: (row, set) => <MediaRow row={row} set={set} /> },
  stack: { make: () => ({ name: "", color: "", image: "" }), render: (row, set) => <StackRow row={row} set={set} /> },
  flow: { make: () => ({ label: "", sub: "" }), render: (row, set) => <FlowRow row={row} set={set} /> },
};

/* ── one section's card ─────────────────────────────────────────────── */

function SectionCard({ spec, value, onChange }) {
  const [open, setOpen] = useState(false);
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  const editor = ROW_EDITORS[spec.row];
  const count = (value[spec.list] || []).length;

  return (
    <div style={s.card}>
      <div style={s.sectionHead}>
        <button type="button" style={s.sectionToggle} onClick={() => setOpen(!open)}>
          <i className={`bi bi-chevron-${open ? "down" : "right"}`} />
          <strong>{spec.name}</strong>
          <span style={s.countPill}>{count}</span>
        </button>

        <label style={s.switch}>
          <input
            type="checkbox"
            checked={value.enabled !== false}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          />
          <span>{value.enabled !== false ? "On the page" : "Hidden"}</span>
        </label>
      </div>

      {open ? (
        <div style={{ paddingTop: 12 }}>
          <div style={s.grid3}>
            <Field label="Number" hint='The "05" in "05 / THE PROBLEM"'>
              <Text value={value.number} onChange={set("number")} />
            </Field>
            <Field label="Label" hint='The "THE PROBLEM" half'>
              <Text value={value.label} onChange={set("label")} />
            </Field>
            <Field label="Name in the side rail" hint="Blank uses the label">
              <Text value={value.navLabel} onChange={set("navLabel")} />
            </Field>
          </div>

          <HeadingInput value={value.heading} onChange={set("heading")} />

          {spec.intro ? (
            <Field label="Intro paragraph" wide>
              <Text rows={3} value={value.intro} onChange={set("intro")} />
            </Field>
          ) : null}

          {spec.autoScroll ? (
            <Field label="Auto-scroll every (seconds)" hint="0 stops it scrolling on its own">
              <Text value={value.autoScrollSeconds} onChange={(v) => onChange({ ...value, autoScrollSeconds: v })} />
            </Field>
          ) : null}

          <Repeater
            label={spec.list === "steps" ? "Steps" : spec.list === "flow" ? "Flow" : "Items"}
            rows={value[spec.list] || []}
            onChange={set(spec.list)}
            make={editor.make}
            render={editor.render}
          />

          {spec.stats ? (
            <Repeater
              label="Figures"
              rows={value.stats || []}
              onChange={set("stats")}
              make={emptyStat}
              render={(row, set2) => <StatRow row={row} set={set2} />}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────── */

export default function CaseStudiesAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, "new" = create
  const [form, setForm] = useState(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/case-studies");
      const json = await res.json();
      if (json.success) setRows(json.data || []);
      else toast.error(json.message || "Could not load");
    } catch {
      toast.error("Could not load case studies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY_FORM()); setEditing("new"); };

  const openEdit = async (id) => {
    try {
      const res = await fetch(`/api/admin/case-studies/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setForm(hydrate(json.data));
      setEditing(id);
    } catch (err) {
      toast.error(err.message || "Could not open");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const isNew = editing === "new";
      const res = await fetch(isNew ? "/api/admin/case-studies" : `/api/admin/case-studies/${editing}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const ok = await confirmDialog({
      title: "Delete this case study?",
      message: `"${row.brandName}" and everything written in it will be removed. This cannot be undone.`,
      confirmText: "Delete",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/case-studies/${row.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err.message || "Could not delete");
    }
  };

  const setF = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setHero = (k) => (v) => setForm((f) => ({ ...f, hero: { ...f.hero, [k]: v } }));

  return (
    <section className="main-dashboard-area">
      <Head><title>Case Studies — Website</title></Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">
          {editing === null ? (
            /* ── list ─────────────────────────────────────────────── */
            <>
              <div style={s.pageHead}>
                <div>
                  <h1 style={s.h1}>Case Studies</h1>
                  <p style={s.sub}>
                    Each one publishes at <code>/case-study/&lt;slug&gt;</code> and appears in the
                    Case Studies rail on the home page.
                  </p>
                </div>
                <button type="button" style={s.btnPrimary} onClick={openNew}>
                  <i className="bi bi-plus-lg" /> New case study
                </button>
              </div>

              {loading ? (
                <div style={s.empty}>Loading…</div>
              ) : rows.length === 0 ? (
                <div style={s.empty}>No case studies yet. Create the first one.</div>
              ) : (
                <div style={s.card}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Brand</th>
                        <th style={s.th}>URL</th>
                        <th style={s.th}>Category</th>
                        <th style={s.th}>Status</th>
                        <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td style={s.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {row.brandLogo ? (
                                <img src={row.brandLogo} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                              ) : null}
                              <strong>{row.brandName || "Untitled"}</strong>
                            </div>
                          </td>
                          <td style={s.td}><code>/case-study/{row.slug}</code></td>
                          <td style={s.td}>{row.category || "—"}</td>
                          <td style={s.td}>
                            <span style={row.status === "published" ? s.pillOn : s.pillOff}>{row.status}</span>
                          </td>
                          <td style={{ ...s.td, textAlign: "right" }}>
                            <button type="button" style={s.iconBtn} onClick={() => openEdit(row.id)} title="Edit">
                              <i className="bi bi-pencil" />
                            </button>
                            <button type="button" style={{ ...s.iconBtn, color: "#DC2626" }} onClick={() => remove(row)} title="Delete">
                              <i className="bi bi-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            /* ── editor ───────────────────────────────────────────── */
            <>
              <div style={s.pageHead}>
                <div>
                  <h1 style={s.h1}>{editing === "new" ? "New case study" : form.brandName || "Case study"}</h1>
                  <p style={s.sub}>
                    {form.slug ? <code>/case-study/{form.slug}</code> : "Give it a slug to set its URL"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={s.btnGhost} onClick={() => setEditing(null)}>Back</button>
                  <button type="button" style={s.btnPrimary} disabled={saving} onClick={save}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {/* Basics */}
              <div style={s.card}>
                <h2 style={s.h2}>Basics</h2>
                <div style={s.grid3}>
                  <Field label="Brand name">
                    <Text
                      value={form.brandName}
                      onChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          brandName: v,
                          // A new study gets its slug suggested from the name;
                          // an existing URL is never rewritten underneath.
                          slug: editing === "new" && !f.slug ? toSlug(v) : f.slug,
                        }))
                      }
                    />
                  </Field>
                  <Field label="URL slug" hint="Letters, numbers and dashes">
                    <Text value={form.slug} onChange={(v) => setF("slug")(toSlug(v))} />
                  </Field>
                  <Field label="Status">
                    <select style={s.input} value={form.status} onChange={(e) => setF("status")(e.target.value)}>
                      <option value="draft">Draft — not on the site</option>
                      <option value="published">Published</option>
                    </select>
                  </Field>
                </div>
                <div style={s.grid3}>
                  <Field label="Category" hint='e.g. "Travel · CRO"'>
                    <Text value={form.category} onChange={setF("category")} />
                  </Field>
                  <Field label="Date line" hint='e.g. "2023 — 2024"'>
                    <Text value={form.dateLabel} onChange={setF("dateLabel")} />
                  </Field>
                  <Field label="Pills" hint="Comma separated — CRO, 2024, Sales CRM">
                    <Text value={(form.tags || []).join(", ")} onChange={(v) => setF("tags")(v.split(",").map((t) => t.trim()).filter(Boolean))} />
                  </Field>
                </div>
                <MediaInput label="Brand logo" value={form.brandLogo} onChange={setF("brandLogo")} />
              </div>

              {/* Hero */}
              <div style={s.card}>
                <h2 style={s.h2}>Hero</h2>
                <HeadingInput value={form.hero.heading} onChange={setHero("heading")} />
                <Field label="Intro paragraph" wide>
                  <Text rows={3} value={form.hero.intro} onChange={setHero("intro")} />
                </Field>
                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12, marginTop: 4 }}>
                  <MediaRow row={form.hero.media} set={(next) => setHero("media")(next)} />
                </div>
                <Repeater
                  label="Figures under the hero"
                  rows={form.hero.stats}
                  onChange={setHero("stats")}
                  make={emptyStat}
                  render={(row, set) => <StatRow row={row} set={set} />}
                />
              </div>

              {/* Sections */}
              <h2 style={{ ...s.h2, margin: "22px 0 10px" }}>Sections</h2>
              {SECTION_SPECS.map((spec) => (
                <SectionCard
                  key={spec.key}
                  spec={spec}
                  value={form[spec.key]}
                  onChange={(next) => setForm((f) => ({ ...f, [spec.key]: next }))}
                />
              ))}

              {/* Side rail */}
              <div style={s.card}>
                <h2 style={s.h2}>Side rail</h2>
                <p style={s.sub}>
                  The list builds itself from the sections above. Only its title and button are written here.
                </p>
                <div style={s.grid3}>
                  <Field label="Title"><Text value={form.onThisPage.title} onChange={(v) => setF("onThisPage")({ ...form.onThisPage, title: v })} /></Field>
                  <Field label="Button label"><Text value={form.onThisPage.ctaLabel} onChange={(v) => setF("onThisPage")({ ...form.onThisPage, ctaLabel: v })} /></Field>
                  <Field label="Button link"><Text value={form.onThisPage.ctaHref} onChange={(v) => setF("onThisPage")({ ...form.onThisPage, ctaHref: v })} /></Field>
                </div>
                <label style={s.switch}>
                  <input type="checkbox" checked={form.onThisPage.enabled !== false} onChange={(e) => setF("onThisPage")({ ...form.onThisPage, enabled: e.target.checked })} />
                  <span>Show the rail</span>
                </label>
              </div>

              {/* Home card */}
              <div style={s.card}>
                <h2 style={s.h2}>On the home page</h2>
                <p style={s.sub}>What the Case Studies rail shows when this study's logo is the active one.</p>
                <HeadingInput value={form.home.heading} onChange={(v) => setF("home")({ ...form.home, heading: v })} />
                <Field label="Paragraph" wide>
                  <Text rows={3} value={form.home.body} onChange={(v) => setF("home")({ ...form.home, body: v })} />
                </Field>
                <div style={s.grid3}>
                  <div><MediaInput label="Picture" value={form.home.image} onChange={(v) => setF("home")({ ...form.home, image: v })} /></div>
                  <Field label="Button label"><Text value={form.home.ctaLabel} onChange={(v) => setF("home")({ ...form.home, ctaLabel: v })} /></Field>
                  <Field label="Order" hint="Lower comes first">
                    <Text value={form.home.order} onChange={(v) => setF("home")({ ...form.home, order: v })} />
                  </Field>
                </div>
                <label style={s.switch}>
                  <input type="checkbox" checked={form.home.enabled !== false} onChange={(e) => setF("home")({ ...form.home, enabled: e.target.checked })} />
                  <span>Show in the home rail</span>
                </label>
              </div>

              {/* SEO */}
              <div style={s.card}>
                <h2 style={s.h2}>SEO</h2>
                <div style={s.grid2}>
                  <Field label="Title"><Text value={form.seo.title} onChange={(v) => setF("seo")({ ...form.seo, title: v })} /></Field>
                  <Field label="Canonical"><Text value={form.seo.canonical} onChange={(v) => setF("seo")({ ...form.seo, canonical: v })} /></Field>
                </div>
                <Field label="Meta description" wide>
                  <Text rows={2} value={form.seo.metaDescription} onChange={(v) => setF("seo")({ ...form.seo, metaDescription: v })} />
                </Field>
                <div style={s.grid2}>
                  <Field label="Open Graph title"><Text value={form.seo.ogTitle} onChange={(v) => setF("seo")({ ...form.seo, ogTitle: v })} /></Field>
                  <div><MediaInput label="Open Graph image" value={form.seo.ogImage} onChange={(v) => setF("seo")({ ...form.seo, ogImage: v })} /></div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "6px 0 40px" }}>
                <button type="button" style={s.btnGhost} onClick={() => setEditing(null)}>Back</button>
                <button type="button" style={s.btnPrimary} disabled={saving} onClick={save}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
          </div>
        </section>
      </div>
    </section>
  );
}

/* ── styles ─────────────────────────────────────────────────────────── */

const s = {
  pageHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: 900, color: "#0F172A", margin: 0 },
  h2: { fontSize: 15, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" },
  sub: { fontSize: 12.5, color: "#64748B", margin: "4px 0 0" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 2px 10px rgba(15,23,42,.04)" },
  label: { display: "block", fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 4 },
  hint: { fontSize: 11, color: "#94A3B8", marginTop: 3 },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, color: "#0F172A", background: "#fff", outline: "none" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 },
  btnPrimary: { padding: "9px 16px", background: "#5A57FB", color: "#fff", border: 0, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnGhost: { padding: "9px 14px", background: "#fff", color: "#334155", border: "1px solid #CBD5E1", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  iconBtn: { padding: "5px 8px", background: "transparent", border: 0, color: "#475569", cursor: "pointer", fontSize: 14 },
  empty: { padding: 22, textAlign: "center", color: "#94A3B8", fontSize: 13, background: "#fff", border: "1px dashed #CBD5E1", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, padding: "8px 10px", borderBottom: "1px solid #E2E8F0" },
  td: { fontSize: 13, color: "#0F172A", padding: "10px", borderBottom: "1px solid #F1F5F9" },
  pillOn: { padding: "3px 10px", background: "#DCFCE7", color: "#166534", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  pillOff: { padding: "3px 10px", background: "#F1F5F9", color: "#64748B", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  sectionToggle: { display: "flex", alignItems: "center", gap: 8, background: "transparent", border: 0, padding: 0, fontSize: 14, color: "#0F172A", cursor: "pointer" },
  countPill: { padding: "2px 8px", background: "#EEF2FF", color: "#4338CA", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  switch: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer" },
  repeatHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 },
  repeatRow: { display: "flex", gap: 10, padding: 12, marginBottom: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10 },
  repeatTools: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 },
  repeatNum: { fontSize: 11, fontWeight: 800, color: "#94A3B8" },
};
