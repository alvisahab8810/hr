// utils/sampleSchema.js — what a /sample-shaped page is made of.
//
// One file describes every band on /sample three ways at once: the fields an
// admin fills in, the words the band shows when nobody has filled anything in,
// and the cleaning the API runs before a page is stored. The components read
// their defaults from here, so the live /sample page and a new page created in
// the CRM start from exactly the same copy and there is no second place to
// update when a line changes.
//
// KEEP THIS FILE IDENTICAL to viralon-payroll/utils/sampleSchema.js. The CRM
// builds its form out of the same descriptors; a field added on one side and
// not the other is a field that silently never saves. It is plain data on
// purpose — no React, no imports — so both repos can hold the same copy.
//
// A field descriptor is { k, n, t }:
//   k  the key under section.data
//   n  the label the CRM prints over the input
//   t  "text" one line · "area" a paragraph · "img" a file path ·
//      "html" a paragraph that keeps simple tags (links, bold, lists) ·
//      "list" repeating rows, whose own fields are in `of`
//
// Nothing here knows about markup. A heading that is part orange is stored as
// the plain words either side of the accent (headA / accent / headB) and the
// component puts the span back, so an admin never has to type a tag.

const WORK = "/assets/others/the-work/social-content/";
const slide = (folder, s) =>
  s.tall
    ? { tall: WORK + folder + "/" + s.tall, stackA: "", stackB: "" }
    : { tall: "", stackA: WORK + folder + "/" + s.stack[0], stackB: WORK + folder + "/" + s.stack[1] };

/* ── the bands ────────────────────────────────────────────────────────────
   Order here is the order the CRM lists them in when adding a section, and
   DEFAULT_SECTIONS below is the order /sample itself renders. */

export const SECTIONS = [
  {
    key: "hero",
    n: "Hero",
    about: "The dark opening band: title, the quote under it, and six figures.",
    fields: [
      { k: "title", n: "Title", t: "text" },
      { k: "quote1", n: "Quote — first line", t: "text" },
      { k: "quote2", n: "Quote — second line", t: "text" },
      { k: "source", n: "Attribution", t: "text" },
      { k: "note", n: "Note", t: "area" },
      {
        k: "stats", n: "Figures", t: "list",
        of: [
          { k: "figure", n: "Figure", t: "text" },
          { k: "label", n: "Label", t: "text" },
        ],
      },
    ],
    d: {
      title: "Sample Page",
      quote1: "Lorem ipsum is a standard placeholder or",
      quote2: "dummy text used widely in graphic design,",
      source: "Lorem ipsum",
      note:
        "publishing, and web development to preview layouts and visual structure without the distraction of readable content.",
      stats: [
        { figure: "3 yrs", label: "Building and testing" },
        { figure: "100", label: "Sites and landing pages" },
        { figure: "10,000", label: "Tests run" },
        { figure: "100 Cr", label: "Average conversion lift" },
        { figure: "8+", label: "Load time we build to" },
        { figure: "10+", label: "Stacks we work in" },
      ],
    },
  },

  {
    key: "results",
    n: "Results rail",
    about: "The snapping rail of case-study cards on the grey floor.",
    fields: [
      { k: "eyebrow", n: "Eyebrow", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      {
        k: "cards", n: "Cards", t: "list",
        of: [
          { k: "kicker", n: "Kicker", t: "text" },
          { k: "figure", n: "Figure", t: "text" },
          { k: "body", n: "Line under the figure", t: "text" },
          { k: "client", n: "Client", t: "text" },
          { k: "img", n: "Image", t: "img" },
          { k: "day", n: "Date tab — day", t: "text" },
          { k: "month", n: "Date tab — month", t: "text" },
          { k: "href", n: "Link", t: "text" },
        ],
      },
    ],
    d: {
      eyebrow: "Lorem ipsum",
      headA: "Lorem Ipsum Is A",
      accent: "Standard Placeholder",
      cards: [
        {
          kicker: "Travel · Kashmir", figure: "100%",
          body: "lower cost per qualified enquiry in one season",
          client: "Tourwatchout", img: "/assets/img/our-work/champion-tutors.webp",
          day: "", month: "", href: "/our-work",
        },
        {
          kicker: "Automotive · Car Care", figure: "Rs 1k",
          body: "cost per booked job, down from Rs 10,000",
          client: "Colomoto", img: "/assets/img/our-work/colomoto.webp",
          day: "25", month: "Aug", href: "/our-work",
        },
        {
          kicker: "Real Estate · NCR", figure: "200%",
          body: "lower cost per qualified site visit, same budget",
          client: "Rajpreet Infra", img: "/assets/img/our-work/hitech.webp",
          day: "05", month: "Jul", href: "/our-work",
        },
        {
          kicker: "Skincare · Marketplace", figure: "10x",
          body: "return on marketplace ad spend",
          client: "Episoul", img: "/assets/img/our-work/episoul.webp",
          day: "25", month: "Aug", href: "/our-work",
        },
      ],
    },
  },

  {
    key: "statement",
    n: "Statement band",
    about: "The orange band: one large heading and the paragraphs under it.",
    fields: [
      { k: "heading", n: "Heading", t: "area" },
      {
        k: "paras", n: "Paragraphs", t: "list",
        of: [{ k: "text", n: "Paragraph", t: "area" }],
      },
    ],
    d: {
      heading:
        "Lorem ipsum is a standard placeholder or dummy text used widely in graphic design.",
      paras: [
        {
          text:
            "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia",
        },
        {
          text:
            "ooked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.",
        },
      ],
    },
  },

  {
    key: "thework",
    n: "Image marquee",
    about:
      "Three sliding rows. A tile is either one tall image, or two short ones stacked — fill the tall field or the two stack fields, not both.",
    fields: [
      { k: "eyebrow", n: "Eyebrow", t: "text" },
      { k: "heading", n: "Heading", t: "text" },
      {
        k: "rowOne", n: "Row one — travels left", t: "list",
        of: [
          { k: "tall", n: "Tall image", t: "img" },
          { k: "stackA", n: "Stacked — top", t: "img" },
          { k: "stackB", n: "Stacked — bottom", t: "img" },
        ],
      },
      {
        k: "rowTwo", n: "Row two — travels right", t: "list",
        of: [
          { k: "tall", n: "Tall image", t: "img" },
          { k: "stackA", n: "Stacked — top", t: "img" },
          { k: "stackB", n: "Stacked — bottom", t: "img" },
        ],
      },
      {
        k: "brands", n: "Row three — brand tiles", t: "list",
        of: [{ k: "img", n: "Tile", t: "img" }],
      },
    ],
    d: {
      eyebrow: "The work",
      heading: "Images",
      rowOne: [
        slide("first-slider", { stack: ["little.png", "little1.png"] }),
        slide("first-slider", { tall: "tall.png" }),
        slide("first-slider", { tall: "tall1.png" }),
        slide("first-slider", { stack: ["little2.png", "little2.1.png"] }),
        slide("first-slider", { tall: "tall2.png" }),
        slide("first-slider", { tall: "tall3.png" }),
        slide("first-slider", { stack: ["little3.png", "little3.1.png"] }),
        slide("first-slider", { tall: "tall4.png" }),
        slide("first-slider", { stack: ["little4.png", "little4.1.png"] }),
        slide("first-slider", { tall: "tall5.png" }),
      ],
      rowTwo: [
        slide("second-slider", { stack: ["little.png", "little1.png"] }),
        slide("second-slider", { tall: "tall.png" }),
        slide("second-slider", { tall: "tall1.png" }),
        slide("second-slider", { stack: ["little2.png", "little2.1.png"] }),
        slide("second-slider", { tall: "tall2.png" }),
        slide("second-slider", { tall: "tall3.png" }),
        slide("second-slider", { stack: ["little3.png", "little3.1.png"] }),
        slide("second-slider", { tall: "tall4.png" }),
      ],
      brands: Array.from({ length: 9 }, (_, i) => ({
        img: "/assets/others/the-work/brands/" + (i + 1) + ".png",
      })),
    },
  },

  {
    key: "parts",
    n: "Diagnostic cards",
    about: "Heading on the left, intro ranged right, four picture cards under both.",
    fields: [
      { k: "eyebrow", n: "Eyebrow", t: "text" },
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "accent", n: "Heading — orange second line", t: "text" },
      { k: "intro", n: "Intro", t: "area" },
      {
        k: "cards", n: "Cards", t: "list",
        of: [
          { k: "title", n: "Title", t: "text" },
          { k: "desc", n: "Description", t: "area" },
          { k: "img", n: "Image", t: "img" },
        ],
      },
    ],
    d: {
      eyebrow: "Lorem ipsum",
      headA: "Lorem Ipsum Is A",
      accent: "Standard Placeholder",
      intro:
        "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia.",
      cards: [
        {
          title: "Enquiries had no owner",
          desc: "Three of hours, were A.A. release from really 3 hours.",
          img: "/assets/images/broken/1.webp",
        },
        {
          title: "Nobody could attribute a booking",
          desc: "Spent bloated or step readers, acc on what caused.",
          img: "/assets/images/broken/2.webp",
        },
        {
          title: "The site described, it never sold",
          desc: "No pricing signals, an in-field form, also one mobile.",
          img: "/assets/images/broken/3.webp",
        },
        {
          title: "Social ran on its own island",
          desc: "Great reach, no handoff into the pipeline.",
          img: "/assets/images/broken/4.webp",
        },
      ],
    },
  },

  {
    key: "industries",
    n: "Industries + photo",
    about: "Full-width heading, copy on the left, a photograph on the right.",
    fields: [
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "headB", n: "Heading — rest", t: "area" },
      { k: "body1", n: "First paragraph", t: "area" },
      { k: "lead", n: "Second paragraph — bold opening", t: "area" },
      { k: "body2", n: "Second paragraph — rest", t: "area" },
      { k: "ctaText", n: "Button", t: "text" },
      { k: "img", n: "Photograph", t: "img" },
    ],
    d: {
      accent: "Ten Industries.",
      headB: "We Already Know What A Lead Means In Each One.",
      body1:
        "In real estate, the form fill means nothing, and the site visit is everything. In education, parents search six months before the session opens. Patients never fill a form; they read reviews for three weeks and then call. A car wash enquiry and a full paint enquiry cost the same to buy and are worth twenty times apart.",
      lead: "You should not have to explain any of that to your agency.",
      body2:
        "We have run these accounts, made these mistakes, and learned what a qualified lead actually means in each one. That knowledge sits at the strategy level, not with whoever manages your account.",
      ctaText: "Let's Talk",
      img: "/assets/others/sample-abt.png",
    },
  },

  {
    key: "whatyouget",
    n: "What you get",
    about: "The violet panel with a ticked list, photograph filling its right half.",
    fields: [
      { k: "eyebrow", n: "Eyebrow", t: "text" },
      { k: "headA", n: "Heading — before the orange", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "headB", n: "Heading — after the orange", t: "text" },
      {
        k: "items", n: "Deliverables", t: "list",
        of: [{ k: "text", n: "Item", t: "text" }],
      },
      { k: "img", n: "Photograph", t: "img" },
    ],
    d: {
      eyebrow: "What you get",
      headA: "Everything",
      accent: "Your Team Needs",
      headB: "To Say The Same Thing.",
      items: [
        { text: "Positioning statement" },
        { text: "Audience definition" },
        { text: "Competitor mapping" },
        { text: "Messaging framework" },
        { text: "Brand voice guide" },
        { text: "Logo and identity" },
        { text: "Colour and type system" },
        { text: "Brand guidelines" },
        { text: "Page copy" },
        { text: "Templates" },
      ],
      img: "/assets/others/the-work/sample2.webp",
    },
  },

  {
    key: "audit",
    n: "Closing ask",
    about: "One question, a note, and the button — artwork running off the right edge.",
    fields: [
      { k: "heading", n: "Heading", t: "area" },
      { k: "note", n: "Note", t: "area" },
      { k: "ctaText", n: "Button", t: "text" },
      { k: "img", n: "Artwork", t: "img" },
    ],
    d: {
      heading: "Start with one question you cannot answer.",
      note:
        "Tell us the decision you are stuck on. We will tell you whether it is a tracking problem, a modelling problem, or a question only a holdout test can settle.",
      ctaText: "Request an audit",
      img: "/assets/others/start-abt.png",
    },
  },

  {
    key: "whatdecides",
    n: "Leaks rail",
    about: "The receding row of cards, each one a place the money goes.",
    fields: [
      { k: "eyebrow", n: "Eyebrow", t: "text" },
      { k: "headA", n: "Heading — before the orange", t: "text" },
      { k: "accent", n: "Heading — orange first line", t: "text" },
      { k: "accent2", n: "Heading — orange second line", t: "text" },
      { k: "note", n: "Note", t: "area" },
      {
        k: "cards", n: "Cards", t: "list",
        of: [
          { k: "title", n: "Title", t: "text" },
          { k: "body", n: "Body", t: "area" },
        ],
      },
    ],
    d: {
      eyebrow: "Where the money goes",
      headA: "Six Leaks.",
      accent: "Most Sites Have",
      accent2: "Four Of Them.",
      note:
        "None of these are design opinions. Every one has a number attached, and every one is fixable without touching your ad budget.",
      cards: [
        {
          title: "Speed",
          body:
            "Every extra second of load time costs about 7% of conversions. It is the one fix that pays before a single word changes.",
        },
        {
          title: "Mobile",
          body:
            "Most of the traffic, converting at half the rate. Sites are still designed on a 27-inch screen and tested there too.",
        },
        {
          title: "The form",
          body:
            "Every field past the third costs you answers. Asking for a phone number before you have earned it costs the most.",
        },
        {
          title: "Clarity",
          body:
            "Five seconds to say what you sell, who it is for and what happens next. Most sites lose people on the first one.",
        },
        {
          title: "Proof",
          body:
            "Reviews, numbers, real faces. A claim with nothing behind it reads as a risk rather than a reason to buy.",
        },
        {
          title: "Message",
          body:
            "The page has to finish the sentence the ad started. A mismatch here loses people who had already decided.",
        },
      ],
    },
  },

  {
    key: "layers",
    n: "Layers lookup",
    about: "Three ruled columns, a name over its goal.",
    fields: [
      { k: "eyebrow", n: "Eyebrow", t: "text" },
      { k: "headA", n: "Heading — before the orange", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "headB", n: "Heading — after the orange", t: "text" },
      { k: "intro", n: "Intro", t: "area" },
      {
        k: "rows", n: "Layers", t: "list",
        of: [
          { k: "name", n: "Name", t: "text" },
          { k: "goal", n: "Goal", t: "area" },
        ],
      },
    ],
    d: {
      eyebrow: "What you get",
      headA: "They",
      accent: "Run Together.",
      headB: "Not Instead Of Each Other.",
      intro:
        "Ranking on page one does not guarantee you appear in AI answers. Appearing in AI answers does not require page one. Two games, one foundation, and the domains already ranking well tend to win both.",
      rows: [
        { name: "SEO", goal: "Rank in the results that still exist and still convert" },
        { name: "AEO", goal: "Be the direct answer, not one of ten links" },
        { name: "GEO", goal: "Be cited inside an answer a model writes from scratch" },
      ],
    },
  },

  {
    key: "twojobs",
    n: "Two columns",
    about: "Two grey columns of numbered rows — what we build, what we improve.",
    fields: [
      { k: "eyebrow", n: "Eyebrow", t: "text" },
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "accent", n: "Heading — orange second line", t: "text" },
      { k: "note", n: "Note", t: "area" },
      { k: "leftTitle", n: "Left column — title", t: "text" },
      { k: "leftSub", n: "Left column — line under it", t: "text" },
      { k: "leftSubAccent", n: "Left column — bold end of that line", t: "text" },
      {
        k: "leftItems", n: "Left column — rows", t: "list",
        of: [
          { k: "lead", n: "Claim (bold)", t: "text" },
          { k: "rest", n: "Rest of the sentence", t: "area" },
        ],
      },
      { k: "rightTitle", n: "Right column — title", t: "text" },
      { k: "rightSub", n: "Right column — line under it", t: "text" },
      { k: "rightSubAccent", n: "Right column — bold end of that line", t: "text" },
      {
        k: "rightItems", n: "Right column — rows", t: "list",
        of: [
          { k: "lead", n: "Claim (bold)", t: "text" },
          { k: "rest", n: "Rest of the sentence", t: "area" },
        ],
      },
    ],
    d: {
      eyebrow: "Two different jobs",
      headA: "Sometimes You Need A New Site.",
      accent: "Usually You Do Not.",
      note:
        "We will tell you honestly which one you are, and we lose money saying it more often than you would expect.",
      leftTitle: "We build",
      leftSub: "Built to convert from day one,",
      leftSubAccent: "not redesigned into converting later.",
      leftItems: [
        {
          lead: "Fast on an ordinary phone",
          rest: " on patchy data, because that is what your buyer is actually holding.",
        },
        {
          lead: "Structured for search and CRM",
          rest: " from the start, so the next two parts of the machine are not a rebuild.",
        },
        {
          lead: "Tracking wired on launch day",
          rest: ", not bolted on when someone finally asks where leads came from.",
        },
        {
          lead: "WhatsApp and call handoff",
          rest: " where your buyers prefer it, which in most markets they do.",
        },
      ],
      rightTitle: "We improve",
      rightSub: "Find the leak, fix the leak, prove it moved.",
      rightSubAccent: "No blind redesigns.",
      rightItems: [
        {
          lead: "Session recordings and heatmaps",
          rest: " to see where people actually stop, not where we assume they do.",
        },
        {
          lead: "Speed and mobile first",
          rest: ", because they are the cheapest wins and almost always the largest.",
        },
        {
          lead: "Test, do not guess.",
          rest:
            " Only about 14% of tests win, which is exactly why you run them instead of arguing.",
        },
        {
          lead: "Ship monthly",
          rest: ", measure against enquiries, and keep the version that earned it.",
        },
      ],
    },
  },

  {
    key: "fivesteps",
    n: "Steps on phones",
    about:
      "A row of phone frames. Each one turns between two cards, so every step is written twice — the step, and the same step read the other way round.",
    fields: [
      { k: "eyebrow", n: "Eyebrow", t: "text" },
      { k: "headA", n: "Heading — before the orange", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      {
        k: "steps", n: "Steps", t: "list",
        of: [
          { k: "img", n: "Phone frame", t: "img" },
          { k: "titleA", n: "First card — title", t: "text" },
          { k: "bodyA", n: "First card — body", t: "area" },
          { k: "titleB", n: "Second card — title", t: "text" },
          { k: "bodyB", n: "Second card — body", t: "area" },
        ],
      },
    ],
    d: {
      eyebrow: "How we work",
      headA: "Five Steps.",
      accent: "Diagnosis Before Design.",
      steps: [
        {
          img: WORK + "phone1.png",
          titleA: "Find The Leak",
          bodyA:
            "Analytics, recordings, speed test on a real mid-range device. We will not redesign a page until we can point at what is losing people.",
          titleB: "Name The Number",
          bodyB:
            "Which page, which step, how many people fall out of it. A leak nobody can measure is an opinion, not a problem.",
        },
        {
          img: WORK + "phone2.png",
          titleA: "Fix Speed & Mobile",
          bodyA:
            "Images, rendering, scripts, layout shift, tap targets. It is the cheapest win, and it lifts your search rankings at the same time.",
          titleB: "Built For One Hand",
          bodyB:
            "Most of your buyers arrive on a phone, on ordinary data. If it is slow there, nothing further down the page ever gets read.",
        },
        {
          img: WORK + "phone3.png",
          titleA: "Rewrite For The Buyer",
          bodyA:
            "Most sites describe the company. The good ones answer the question in the visitor's head. That rewrite alone often outperforms the redesign.",
          titleB: "Answer, Do Not Announce",
          bodyB:
            "What you do, who it is for, what it costs, what happens next. In that order, above the fold, in their words.",
        },
        {
          img: WORK + "phone4.png",
          titleA: "Cut The Form, Add The Proof",
          bodyA:
            "Ask for the minimum, show real numbers, real names, real faces, then make the next step obvious on every screen.",
          titleB: "Every Field Costs You",
          bodyB:
            "Each extra box is people leaving. Ask for what your team actually needs to call back, and nothing beyond it.",
        },
        {
          img: WORK + "phone5.png",
          titleA: "Test, Then Keep Testing",
          bodyA:
            "One change at a time, measured against enquiries rather than clicks. Most tests lose. That is the point of running them.",
          titleB: "Keep What Earned It",
          bodyB:
            "Ship monthly, hold the winner, throw the rest away. The site gets better every month instead of every three years.",
        },
      ],
    },
  },

  {
    key: "measure",
    n: "What we measure",
    about: "Four artwork cards, each one a number we report against.",
    fields: [
      { k: "eyebrow", n: "Eyebrow", t: "text" },
      { k: "headA", n: "Heading — before the orange", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      {
        k: "cards", n: "Metrics", t: "list",
        of: [
          { k: "name", n: "Name", t: "text" },
          { k: "img", n: "Artwork", t: "img" },
        ],
      },
    ],
    d: {
      eyebrow: "What we measure",
      headA: "Clicks Are Not",
      accent: "Customers.",
      cards: [
        { name: "Cost per qualified lead", img: "/assets/others/the-work/paid-ads/m1.png" },
        { name: "Lead to enquiry rate", img: "/assets/others/the-work/paid-ads/m2.png" },
        { name: "Creative win rate", img: "/assets/others/the-work/paid-ads/m3.png" },
        { name: "Blended acquisition cost", img: "/assets/others/the-work/paid-ads/m4.png" },
      ],
    },
  },

  {
    key: "builditfor",
    n: "Industries carousel",
    about: "Copy on the left, the turning 3D stack of industry cards on the right.",
    fields: [
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "headB", n: "Heading — rest", t: "area" },
      { k: "body1", n: "First paragraph", t: "area" },
      { k: "lead", n: "Second paragraph — bold opening", t: "area" },
      { k: "body2", n: "Second paragraph — rest", t: "area" },
      { k: "ctaText", n: "Button", t: "text" },
      { k: "ctaLink", n: "Button link", t: "text" },
      {
        k: "cards", n: "Industries", t: "list",
        of: [
          { k: "name", n: "Name", t: "text" },
          { k: "blurb", n: "Blurb", t: "area" },
          { k: "img", n: "Image", t: "img" },
        ],
      },
    ],
    d: {
      accent: "Ten Industries.",
      headB: "We Already Know What A Lead Means In Each One.",
      body1:
        "In real estate, the form fill means nothing, and the site visit is everything. In education, parents search six months before the session opens. Patients never fill a form; they read reviews for three weeks and then call. A car wash enquiry and a full paint enquiry cost the same to buy and are worth twenty times apart.",
      lead: "You should not have to explain any of that to your agency.",
      body2:
        "We have run these accounts, made these mistakes, and learned what a qualified lead actually means in each one. That knowledge sits at the strategy level, not with whoever manages your account.",
      ctaText: "Let's Talk",
      ctaLink: "/contact-us",
      cards: [
        {
          name: "Real estate",
          blurb: "A hundred enquiries make one booking. We build toward the eight that matter.",
          img: "/assets/images/what-build/1.webp",
        },
        {
          name: "Travel",
          blurb: "Weeks of research, booked in a day. Miss the weeks and you compete on price.",
          img: "/assets/images/what-build/2.webp",
        },
        {
          name: "Automotive",
          blurb: "A wash and a full paint cost the same to buy. One is worth twenty times more.",
          img: "/assets/images/what-build/3.webp",
        },
        {
          name: "IT and software",
          blurb: "Ten firms wrote the same sentences. We make yours legible first.",
          img: "/assets/images/what-build/4.webp",
        },
        {
          name: "Healthcare",
          blurb: "Most patients never fill a form. They read, they watch, then they call.",
          img: "/assets/images/what-build/5.webp",
        },
        {
          name: "Education",
          blurb: "Parents search six months before the session. April is already too late.",
          img: "/assets/images/what-build/6.webp",
        },
        {
          name: "B2B and manufacturing",
          blurb: "Twelve enquiries can make the year. Every volume metric will call it a bad one.",
          img: "/assets/images/what-build/9.webp",
        },
        {
          name: "Finance",
          blurb: "The platforms restrict half of what you want to say. We build trust elsewhere.",
          img: "/assets/images/what-build/7.webp",
        },
        {
          name: "Interior design & architecture",
          blurb: "Nobody picks an architect from an ad. They pick what they saw months ago.",
          img: "/assets/images/what-build/8.webp",
        },
      ],
    },
  },

  {
    key: "tech",
    n: "What we build on",
    about: "A light row of finished stack cards. The name is drawn into each image.",
    fields: [
      { k: "headA", n: "Heading — before the orange", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "note", n: "Note", t: "area" },
      {
        k: "cards", n: "Cards", t: "list",
        of: [
          { k: "img", n: "Card", t: "img" },
          { k: "name", n: "Name (alt text)", t: "text" },
        ],
      },
    ],
    d: {
      headA: "What",
      accent: "We Build On.",
      note:
        "Chosen for what the business needs, not what we prefer to build. If WordPress is right for you, we will say so.",
      cards: [
        { img: "/assets/others/tech/1.png", name: "Next.js" },
        { img: "/assets/others/tech/2.png", name: "React" },
        { img: "/assets/others/tech/3.png", name: "Node" },
        { img: "/assets/others/tech/4.png", name: "WordPress" },
        { img: "/assets/others/tech/5.png", name: "Shopify" },
        { img: "/assets/others/tech/6.png", name: "Server side tracking" },
      ],
    },
  },

  {
    key: "soosocial",
    n: "Reels rail",
    about: "The full-bleed rail of vertical clips.",
    fields: [
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "accent", n: "Heading — orange second line", t: "text" },
      { k: "intro1", n: "Intro — first line", t: "text" },
      { k: "intro2", n: "Intro — second line", t: "text" },
      {
        k: "reels", n: "Clips", t: "list",
        of: [{ k: "src", n: "Video file", t: "img" }],
      },
    ],
    d: {
      headA: "We Are Soo",
      accent: "Social...",
      intro1: "Connect and see",
      intro2: "if you like us",
      reels: Array.from({ length: 19 }, (_, i) => ({
        src: "/assets/img/our-services/instagram/video" + (i + 1) + ".mp4",
      })),
    },
  },

  {
    key: "faqform",
    n: "FAQ + enquiry form",
    about:
      "The question list and the enquiry form, both as they are on /sample. Write this page's own questions here, or leave them empty and borrow a set from Website → FAQs.",
    fields: [
      { k: "kicker", n: "Small line above", t: "text" },
      { k: "heading", n: "Heading", t: "text" },
      { k: "items", n: "Questions", t: "list", of: [
        { k: "question", n: "Question", t: "text" },
        { k: "answer", n: "Answer", t: "html" },
      ] },
      { k: "footerText", n: "Line under the list", t: "text" },
      { k: "faqKey", n: "Borrow a set", t: "text" },
    ],
    // No questions by default: a new page borrows the Website & CRO set, the
    // one /sample itself shows, until somebody writes this page's own.
    d: {
      kicker: "Still Having Queries ?",
      heading: "Frequently Asked Questions",
      items: [],
      footerText: "",
      faqKey: "website-and-cro",
    },
  },

  {
    key: "latestblogs",
    n: "Latest blogs",
    about: "The three most recent posts. Hides itself when nothing is published.",
    fields: [
      { k: "title", n: "Heading", t: "text" },
      { k: "subtitle", n: "Subheading", t: "area" },
    ],
    d: {
      title: "Latest Blogs",
      subtitle: "Insights, ideas and updates from the Viralon studio.",
    },
  },
];

export const SECTION_MAP = SECTIONS.reduce((m, s) => ((m[s.key] = s), m), {});
export const SECTION_KEYS = SECTIONS.map((s) => s.key);

/* The order /sample itself renders, which is what a new page starts as. */
export const DEFAULT_ORDER = [
  "hero", "results", "statement", "thework", "parts", "industries",
  "whatyouget", "audit", "whatdecides", "layers", "twojobs", "fivesteps",
  "measure", "builditfor", "tech", "soosocial", "faqform", "latestblogs",
];

/* A fresh id per section. It is only a React key and the handle the CRM drags
   by, so anything unique within the page will do. */
let seq = 0;
export const sectionId = () =>
  "s" + Date.now().toString(36) + (seq++).toString(36);

const copy = (v) => JSON.parse(JSON.stringify(v));

export const blankSection = (key) => {
  const def = SECTION_MAP[key];
  if (!def) return null;
  return { id: sectionId(), type: key, on: true, data: copy(def.d) };
};

export const defaultSections = () => DEFAULT_ORDER.map(blankSection).filter(Boolean);

/* ── cleaning ─────────────────────────────────────────────────────────────
   The API stores whatever comes back from the CRM, so it is walked against
   the descriptors above rather than trusted: an unknown section type is
   dropped, a key nobody declared is dropped, and every value lands as a
   string. A list row whose every field is blank is dropped too, because an
   empty row renders as a hole in the band rather than as nothing. */

const str = (v) => String(v ?? "").trim();

// An "html" field is printed into the page as markup, so it is held to the
// same allowlist the FAQ editor uses: the handful of tags a writer needs, no
// attributes except a safe href, and nothing that can execute. Same rules in
// both repos, because either side may be the one that stores the value.
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a",
]);

export function cleanHtml(input) {
  let html = String(input ?? "");
  html = html.replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "");
  html = html.replace(/<\/?([a-zA-Z0-9-]+)((?:\s[^>]*)?)\/?>/g, (full, tag, attrs) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return ""; // unwrap: keep the words, drop the tag
    if (full.startsWith("</")) return "</" + name + ">";
    if (name !== "a") return name === "br" ? "<br />" : "<" + name + ">";
    const m = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || "");
    let href = str(m ? m[2] ?? m[3] ?? m[4] : "");
    if (/^\s*(javascript|data|vbscript):/i.test(href)) href = "";
    if (!href) return "<a>";
    const escaped = href.replace(/"/g, "&quot;");
    return /^https?:\/\//i.test(href) && !/viralon\.in/i.test(href)
      ? '<a href="' + escaped + '" target="_blank" rel="noopener noreferrer">'
      : '<a href="' + escaped + '">';
  });
  // Markup with no words in it (an empty "<p></p>" from a paste) counts as
  // nothing, so the row drops out rather than rendering as a gap.
  if (!html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()) return "";
  return html.trim();
}

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
    // A band can be parked rather than deleted, so a page can be rehearsed
    // without losing the copy that is switched off.
    on: sec.on !== false && sec.on !== "false",
    data,
  };
}

export function cleanSections(list) {
  return (Array.isArray(list) ? list : []).map(cleanSection).filter(Boolean);
}

/* ── the questions a page actually shows ──────────────────────────────────
   The FAQ band takes whichever it has: this page's own questions if somebody
   wrote them, else the published set it borrows. Returns the shape
   components/PageFaq.js expects, or null when there is nothing to show.
   Both the band and the FAQPage schema go through here, so the questions
   Google is told about are always the ones on the page. */
export function faqDoc(data = {}, borrowed = null, pageKey = "page") {
  const own = (Array.isArray(data.items) ? data.items : [])
    .filter((it) => it && (it.question || it.answer));
  if (!own.length) return borrowed || null;
  return {
    pageKey,
    kicker: data.kicker || "",
    heading: data.heading || "",
    footerText: data.footerText || "",
    items: own,
  };
}

/* Every question on a page, in page order — what the FAQPage schema is built
   from. Reads both the page's own questions and any borrowed set. */
export function allFaqs(sections, borrowedByKey = {}) {
  const out = [];
  for (const sec of Array.isArray(sections) ? sections : []) {
    if (sec?.type !== "faqform" || sec.on === false) continue;
    const doc = faqDoc(sec.data || {}, borrowedByKey[sec.data?.faqKey] || null);
    for (const it of doc?.items || []) if (it?.question) out.push(it);
  }
  return out;
}
