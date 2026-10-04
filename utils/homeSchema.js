// utils/homeSchema.js — the home page, described as data.
//
// The home page at / is one record, not many: there is only ever one home
// page, so the CRM edits a single document rather than a list. What it holds
// is the same shape a /sample page holds — an ordered list of bands, each one
// `{ id, type, on, data }` — so the admin reorders, parks, duplicates and
// deletes the bands of the home page exactly the way it does everywhere else.
//
// KEEP THIS FILE IDENTICAL to viralon-payroll/utils/homeSchema.js. The CRM
// builds its form and cleans what it stores from here; the website renders
// from the same descriptors. Plain data and pure functions only — the one
// import is the shared sanitiser next door, which is itself React-free.
import { SECTION_MAP as SAMPLE_MAP, cleanHtml, sectionId } from "./sampleSchema";

// Four of the home bands are the same components a /sample page uses, and a
// band is nothing but its descriptor — so they are borrowed rather than
// written out again. A home-only default (the FAQ set it borrows) is passed
// as an override.
const borrow = (key, d) => ({
  ...SAMPLE_MAP[key],
  ...(d ? { d: { ...SAMPLE_MAP[key].d, ...d } } : {}),
});

export const SECTIONS = [
  {
    key: "hero",
    n: "Hero + ring",
    about:
      "The first screen: the headline, the three numbers, the markets line, and the six parts that turn in the ring on the right.",
    fields: [
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "headB", n: "Heading — second line", t: "text" },
      { k: "strike", n: "Heading — struck-through words", t: "text" },
      { k: "subLead", n: "Sub-copy — opening words", t: "text" },
      { k: "subStrong", n: "Sub-copy — bold middle", t: "area" },
      { k: "subRest", n: "Sub-copy — rest", t: "text" },
      { k: "subAccent", n: "Sub-copy — orange last line", t: "text" },
      {
        k: "stats", n: "Numbers panel", t: "list",
        of: [
          { k: "num", n: "Number", t: "text" },
          { k: "label", n: "Label", t: "text" },
        ],
      },
      {
        k: "markets", n: "Markets line", t: "list",
        of: [{ k: "name", n: "Country", t: "text" }],
      },
      {
        k: "wheel", n: "Ring — the six parts", t: "list",
        of: [
          { k: "num", n: "Number", t: "text" },
          { k: "title", n: "Name", t: "text" },
          { k: "descA", n: "Line one", t: "text" },
          { k: "descB", n: "Line two", t: "text" },
        ],
      },
    ],
    d: {
      headA: "Qualified",
      headB: "leads come from",
      strike: "one channel.",
      subLead: "They come from",
      subStrong:
        "brand, social content, search, paid ads, website and tracking",
      subRest: ", working as one machine.",
      subAccent: "We build that machine.",
      stats: [
        { num: "14,200", label: "Qualified Leads" },
        { num: "5", label: "Countries" },
        { num: "$350k", label: "Ad Spent" },
      ],
      markets: [
        { name: "India" }, { name: "USA" }, { name: "UK" },
        { name: "UAE" }, { name: "Australia" },
      ],
      wheel: [
        { num: "01", title: "Brand", descA: "Why they pick you over", descB: "the cheaper one." },
        { num: "02", title: "Social content", descA: "Builds demand before", descB: "anyone searches." },
        { num: "03", title: "Search", descA: "Captures intent the moment", descB: "they look for you." },
        { num: "04", title: "Paid ads", descA: "Reaches everyone else, at a", descB: "cost we hold." },
        { num: "05", title: "Website", descA: "Turns the visit into an", descB: "enquiry." },
        { num: "06", title: "Tracking", descA: "Shows exactly what's", descB: "actually working." },
      ],
    },
  },

  {
    key: "partnering",
    n: "Client logo strip",
    about: "The heading and the logos that scroll under it. Add, replace or reorder the logos freely — the strip repeats whatever is here.",
    fields: [
      { k: "heading", n: "Heading", t: "text" },
      {
        k: "logos", n: "Logos", t: "list",
        of: [
          { k: "img", n: "Logo", t: "img" },
          { k: "alt", n: "Client name", t: "text" },
        ],
      },
    ],
    d: {
      heading: "Proudly Partnering",
      logos: [1, 2, 3, 4, 5, 1, 1, 2, 3, 4, 5, 1].map((n) => ({
        img: "/assets/img/home/clients-logos/partner" + n + ".png",
        alt: "",
      })),
    },
  },

  {
    key: "weknow",
    n: "We know what you are going through",
    about:
      "The photo band with the two cards on it. The phone layout is a different composition rather than the same one reflowed, so it has its own photo and its own heading lines underneath.",
    fields: [
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "headA", n: "Heading — rest, first line", t: "text" },
      { k: "headB", n: "Heading — rest, second line", t: "text" },
      { k: "bodyA", n: "First card", t: "area" },
      { k: "bodyB", n: "Second card (orange)", t: "area" },
      { k: "img", n: "Photo", t: "img" },
      { k: "imgMobile", n: "Photo — phones", t: "img" },
      { k: "mEyebrow", n: "Phones — small line above", t: "text" },
      { k: "mHeadA", n: "Phones — heading, first line", t: "text" },
      { k: "mHeadB", n: "Phones — heading, second line", t: "text" },
    ],
    d: {
      accent: "We Know,",
      headA: "What You",
      headB: "Are Going Through",
      bodyA:
        "You have probably got a social agency, someone running ads, and a website built two years ago by a person you no longer speak to. None of them talks to each other, so nobody can tell you which of them actually brought you customers",
      bodyB:
        "We run all six together. Content builds demand, search and ads capture it, the website turns it into an enquiry, and tracking proves it.",
      img: "/assets/images/abt.webp",
      imgMobile: "/assets/images/abt-mobile.webp",
      mEyebrow: "We Know",
      mHeadA: "What you are",
      mHeadB: "going through",
    },
  },

  {
    key: "sixparts",
    n: "The six parts rail",
    about: "The horizontal card gallery of the six parts, each card with its own artwork and link.",
    fields: [
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "accent", n: "Heading — orange second line", t: "text" },
      { k: "intro", n: "Lead-in line (phones)", t: "area" },
      { k: "ctaText", n: "Card button", t: "text" },
      {
        k: "cards", n: "Cards", t: "list",
        of: [
          { k: "tag", n: "Tag", t: "text" },
          { k: "title", n: "Title", t: "area" },
          { k: "desc", n: "Body", t: "area" },
          { k: "href", n: "Link", t: "text" },
          { k: "img", n: "Artwork", t: "img" },
        ],
      },
    ],
    d: {
      headA: "The 6 Parts Of",
      accent: "Machine",
      intro:
        "One of these five is your business right now. Pick it, and we will tell you where to start and what it costs.",
      ctaText: "Have a look",
      cards: [
        {
          tag: "Brand",
          title: "People do not buy the cheapest option in a category they take seriously.",
          desc: "Choose the easy way to finance with convenient monthly payment options.",
          href: "/our-services/brand-identity-design",
          img: "/assets/images/part-machine/1.png",
        },
        {
          tag: "Social content",
          title: "Your buyer checks your LinkedIn & Instagram before they call.",
          desc: "What they find decides whether they call. We make content that gives them a reason to.",
          href: "/our-services/social-media-marketing",
          img: "/assets/images/part-machine/2.png",
        },
        {
          tag: "Paid ads",
          title: "Meta and Google, held to a cost per qualified lead.",
          desc: "We test the angle first, then the format, then the wording. In that order.",
          href: "/our-services/paid-media-marketing",
          img: "/assets/images/part-machine/4.png",
        },
        {
          tag: "Website / CRO",
          title: "Same traffic. Same budget. 3× more enquiries.",
          desc: "We build websites that convert the traffic you already pay for, then keep improving them.",
          href: "/our-services/web-development",
          img: "/assets/images/part-machine/5.png",
        },
        {
          tag: "Search",
          title: "Ads stop the day you stop paying. Search keeps working.",
          desc: "Slow to start, and the only channel where work you did last year is still bringing enquiries today.",
          href: "/our-services/seo",
          img: "/assets/images/part-machine/3.png",
        },
        {
          tag: "Tracking",
          title: "Know which ad, keyword or post brings the good leads.",
          desc: "We rebuild tracking across paid, search and social on your server, so every real enquiry is properly attributed.",
          href: "/our-services/digital-marketing",
          img: "/assets/images/part-machine/6.png",
        },
      ],
    },
  },

  borrow("builditfor"),

  {
    key: "workshowcase",
    n: "Case studies",
    about:
      "The case-study carousel. The studies themselves come from Website → Case studies, so only the small line above it is written here.",
    fields: [{ k: "eyebrow", n: "Small line above", t: "text" }],
    d: { eyebrow: "Case Studies" },
  },

  {
    key: "brokenparts",
    n: "Which part is broken",
    about: "The dark rail of diagnostic cards.",
    fields: [
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "headB", n: "Heading — second line", t: "text" },
      { k: "accent", n: "Heading — orange word", t: "text" },
      { k: "headMobileA", n: "Phones — heading, first line", t: "text" },
      { k: "headMobileB", n: "Phones — heading, second line", t: "text" },
      { k: "intro", n: "Lead-in line", t: "area" },
      {
        k: "cards", n: "Cards", t: "list",
        of: [
          { k: "title", n: "Title", t: "area" },
          { k: "desc", n: "Body", t: "area" },
          { k: "img", n: "Image", t: "img" },
        ],
      },
    ],
    d: {
      headA: "Which Part Of Yours",
      headB: "Is",
      accent: "Broken?",
      headMobileA: "Which Part Of",
      headMobileB: "Yours Is",
      intro:
        "One of these five is your business right now. Pick it, and we will tell you where to start and what it costs.",
      cards: [
        {
          title: "People visit the site and leave without enquiring.",
          desc: "Start with web development. Your traffic is fine. Your website is losing it.",
          img: "/assets/images/broken/1.webp",
        },
        {
          title: "Leads come in, but nobody can say where they came from.",
          desc: "Start with measurement. You are optimising against numbers that are wrong.",
          img: "/assets/images/broken/2.webp",
        },
        {
          title: "The moment we pause ads, everything goes quiet.",
          desc: "Start with SEO. You are renting your customers.",
          img: "/assets/images/broken/3.webp",
        },
        {
          title: "We get enquiries, but they are the wrong people asking about price.",
          desc: "Start with branding. Your message is pulling the wrong buyer.",
          img: "/assets/images/broken/4.webp",
        },
        {
          title: "Everything runs, and we still cannot decide what to do next.",
          desc: "Start with advisory. You do not have a marketing problem. You have a decision problem.",
          img: "/assets/images/broken/5.webp",
        },
      ],
    },
  },

  {
    key: "howitruns",
    n: "How it runs",
    about:
      "The four stage cards. Each one is a full-bleed image with the copy laid over it, so it takes both a wide image and a phone image. Flip moves the copy to the other half — follow the artwork.",
    fields: [
      { k: "headA", n: "Heading — first part", t: "text" },
      { k: "accent", n: "Heading — orange word", t: "text" },
      { k: "intro", n: "Lead-in line", t: "area" },
      {
        k: "steps", n: "Stages", t: "list",
        of: [
          { k: "num", n: "Number", t: "text" },
          { k: "label", n: "Stage name", t: "text" },
          { k: "title", n: "Title (a line break splits it)", t: "area" },
          { k: "desc", n: "Body", t: "area" },
          { k: "img", n: "Image", t: "img" },
          { k: "imgMobile", n: "Image — phones", t: "img" },
          { k: "flip", n: "Copy on the right? yes / no", t: "text" },
        ],
      },
    ],
    d: {
      headA: "How It",
      accent: "Runs",
      intro: "Everything starts together. The parts just mature at different speeds.",
      steps: [
        {
          num: "01",
          label: "Foundation",
          title: "Positioning, brand,\nwebsite, tracking",
          desc: "Positioning settled and the brand built for the customer you actually want. Website built or improved. Tracking wired in before a single rupee is spent. Nothing runs blind.",
          img: "/assets/images/how-runs/first-card.webp",
          imgMobile: "/assets/images/how-runs/first-card-mobile.webp",
          flip: "no",
        },
        {
          num: "02",
          label: "Traction",
          title: "Paid ads, social\ncontent, first leads",
          desc: "Ads go live and social content starts running. This is the part that moves fastest — the first qualified enquiries land here, and every rupee is traced back to what caused it.",
          img: "/assets/images/how-runs/second-card.webp",
          imgMobile: "/assets/images/how-runs/second-card-mobile.webp",
          flip: "yes",
        },
        {
          num: "03",
          label: "Visibility",
          title: "Search, content,\nauthority",
          desc: "Search is slow to start and impossible to buy your way out of later. We build it from month one, so the enquiries keep arriving long after the ad budget stops.",
          img: "/assets/images/how-runs/third-card.webp",
          imgMobile: "/assets/images/how-runs/third-card-mobile.webp",
          flip: "no",
        },
        {
          num: "04",
          label: "Compounding",
          title: "Every part feeding\nthe next one",
          desc: "Brand makes the ads cheaper. Content feeds search. Tracking tells all of them where to push. This is the point where the machine stops needing to be pushed.",
          img: "/assets/images/how-runs/fourth.webp",
          imgMobile: "/assets/images/how-runs/fourth-card-mobile.webp",
          flip: "yes",
        },
      ],
    },
  },

  borrow("soosocial"),
  // The home page's own question set is the one published under "home".
  borrow("faqform", { faqKey: "home" }),
  borrow("latestblogs"),
];

export const SECTION_MAP = SECTIONS.reduce((m, s) => ((m[s.key] = s), m), {});
export const SECTION_KEYS = SECTIONS.map((s) => s.key);

/* The order the hand-written home page renders in, which is what the record
   starts as before anybody moves anything. */
export const DEFAULT_ORDER = [
  "hero", "partnering", "weknow", "sixparts", "builditfor", "workshowcase",
  "brokenparts", "howitruns", "soosocial", "faqform", "latestblogs",
];

const copy = (v) => JSON.parse(JSON.stringify(v));

export const blankSection = (key) => {
  const def = SECTION_MAP[key];
  if (!def) return null;
  return { id: sectionId(), type: key, on: true, data: copy(def.d) };
};

export const defaultSections = () => DEFAULT_ORDER.map(blankSection).filter(Boolean);

/* What the website renders before anybody has saved the home page once: the
   bands in their shipped order with no stored data at all, so every component
   falls back to the copy written in its own file. Deliberately not
   defaultSections() — an unsaved home page should read from the components,
   not from a copy of them. */
export const fallbackSections = () =>
  DEFAULT_ORDER.map((k) => ({ id: k, type: k, on: true, data: {} }));

/* ── cleaning ─────────────────────────────────────────────────────────────
   Same walk as the sample pages: unknown band dropped, undeclared key
   dropped, every value a string, and a list row with nothing in it dropped
   because an empty row renders as a hole rather than as nothing. */

const str = (v) => String(v ?? "").trim();
const cleanValue = (f, v) => (f.t === "html" ? cleanHtml(v) : str(v));

function cleanRow(fields, row) {
  const out = {};
  let any = false;
  for (const f of fields) {
    out[f.k] = cleanValue(f, row?.[f.k]);
    if (out[f.k]) any = true;
  }
  return any ? out : null;
}

export function cleanSection(sec) {
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

export function cleanSections(list) {
  return (Array.isArray(list) ? list : []).map(cleanSection).filter(Boolean);
}

/* A field the admin fills in words rather than with a switch. "no", "false"
   and an empty box all read as off, so a blank row cannot flip a layout. */
export const isYes = (v) => /^(y|yes|true|1|on)$/i.test(str(v));
