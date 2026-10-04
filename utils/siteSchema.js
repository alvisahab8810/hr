// utils/siteSchema.js — the engine every menu page's schema is built with.
//
// KEEP IDENTICAL between viralon-new and viralon-payroll. The website renders
// from it and the CRM draws its form from it, so one copy drifting means the
// admin can type something the page cannot show.
//
// A page is described as a list of band descriptors — the same { k, n, t, of }
// fields utils/sampleSchema.js and utils/homeSchema.js use — and this file
// turns that list into everything both sides need: the blank band, the shipped
// order, and the cleaner the API runs stored content through.
//
// Nothing here knows which page it is describing. utils/pageSchemas/*.js are
// the pages; this is only the machinery.
import { SECTION_MAP as SAMPLE_MAP, cleanHtml, sectionId } from "./sampleSchema";

const str = (v) => String(v ?? "").trim();
const copy = (v) => JSON.parse(JSON.stringify(v));

/* A band /sample already describes — the FAQ + form pair, the social strip,
   the blog rail — taken as it is, with its defaults optionally overridden, so
   the shared closing bands are written once rather than six times. */
export const borrow = (key, d) => ({
  ...SAMPLE_MAP[key],
  ...(d ? { d: { ...SAMPLE_MAP[key].d, ...d } } : {}),
});

/* A field the admin fills in words rather than with a switch. "no", "false"
   and an empty box all read as off, so a blank row cannot flip a layout. */
export const isYes = (v) => /^(y|yes|true|1|on)$/i.test(str(v));

const cleanValue = (f, v) => (f.t === "html" ? cleanHtml(v) : str(v));

function cleanRow(fields, row) {
  const out = {};
  let any = false;
  for (const f of fields) {
    out[f.k] = cleanValue(f, row?.[f.k]);
    if (out[f.k]) any = true;
  }
  // A row with nothing in it renders as a hole rather than as nothing, so it
  // is dropped instead of stored.
  return any ? out : null;
}

/**
 * Build one page's schema from its band descriptors.
 *
 * SECTIONS is the page in its shipped order; everything else is derived, so a
 * band added to the list turns up in the CRM, in the cleaner and on the site
 * without another line being written anywhere.
 */
export function pageSchema(SECTIONS) {
  const SECTION_MAP = SECTIONS.reduce((m, s) => ((m[s.key] = s), m), {});
  const SECTION_KEYS = SECTIONS.map((s) => s.key);
  const DEFAULT_ORDER = [...SECTION_KEYS];

  const blankSection = (key) => {
    const def = SECTION_MAP[key];
    if (!def) return null;
    return { id: sectionId(), type: key, on: true, data: copy(def.d) };
  };

  // What the editor opens on when nothing has been saved: the page as it
  // ships, every band carrying the copy that is live right now.
  const defaultSections = () => DEFAULT_ORDER.map(blankSection).filter(Boolean);

  // What the website renders before anybody has saved the page once: the same
  // bands with no stored data at all, so every component falls back to the
  // copy written in its own file. Deliberately not defaultSections() — an
  // unsaved page should read from the components, not from a copy of them.
  const fallbackSections = () =>
    DEFAULT_ORDER.map((k) => ({ id: k, type: k, on: true, data: {} }));

  /* Unknown band dropped, undeclared key dropped, every value a string, and
     HTML fields scrubbed — the same walk the sample pages get. */
  function cleanSection(sec) {
    const def = SECTION_MAP[sec?.type];
    if (!def) return null;
    const src = sec.data && typeof sec.data === "object" ? sec.data : {};
    const data = {};
    for (const f of def.fields) {
      if (f.t === "list") {
        data[f.k] = (Array.isArray(src[f.k]) ? src[f.k] : [])
          .map((row) => cleanRow(f.of, row))
          .filter(Boolean);
      } else {
        data[f.k] = cleanValue(f, src[f.k]);
      }
    }
    return {
      id: str(sec.id) || sectionId(),
      type: def.key,
      on: sec.on !== false && sec.on !== "false",
      data,
    };
  }

  const cleanSections = (list) =>
    (Array.isArray(list) ? list : []).map(cleanSection).filter(Boolean);

  return {
    SECTIONS, SECTION_MAP, SECTION_KEYS, DEFAULT_ORDER,
    blankSection, defaultSections, fallbackSections, cleanSection, cleanSections,
  };
}
