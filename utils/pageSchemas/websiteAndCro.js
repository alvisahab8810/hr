// utils/pageSchemas/websiteAndCro.js — /website-and-cro, described as data.
//
// KEEP IDENTICAL between viralon-new and viralon-payroll: the website renders
// the page from this file and the CRM draws its form from it.
//
// Every `d` here is the copy the page ships with, which is what the editor
// opens on. Nothing is moved out of the components — each one still carries
// the same words — so an unsaved page renders exactly as it did before.
//
// Two headings on this page are broken by hand, line by line: a pipe in those
// fields is a line break, which is why their labels say so.
import { pageSchema, borrow } from "../siteSchema";

const ADS = "/assets/others/the-work/paid-ads/";
const PHONES = "/assets/others/the-work/social-content/";
const TECH = "/assets/others/tech/";

export default pageSchema([
  {
    key: "hero",
    n: "Hero",
    about: "The title, the quote and the six figures under it.",
    fields: [
      { k: "title", n: "Title", t: "text" },
      { k: "quoteA", n: "Quote — first line", t: "text" },
      { k: "quoteB", n: "Quote — second line", t: "text" },
      { k: "attrib", n: "Said by", t: "text" },
      { k: "note", n: "Line under the quote", t: "area" },
      { k: "stats", n: "Figures", t: "list", of: [
        { k: "figure", n: "Figure", t: "text" },
        { k: "label", n: "What it is", t: "text" },
      ] },
    ],
    d: {
      title: "Website And CRO",
      quoteA: "Design is not just what it looks like. Design is",
      quoteB: "how it works.",
      attrib: "Steve Jobs",
      note: "Your website is not a brochure. It is the last thing standing between a click and a customer.",
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
    n: "Results",
    about: "The four result cards, each one a client and the figure it earned.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "clientLabel", n: "Word before the client name", t: "text" },
      { k: "ctaText", n: "Button text", t: "text" },
      { k: "cards", n: "Cards", t: "list", of: [
        { k: "kicker", n: "Industry line", t: "text" },
        { k: "figure", n: "Figure", t: "text" },
        { k: "body", n: "What the figure is", t: "area" },
        { k: "client", n: "Client", t: "text" },
        { k: "img", n: "Image", t: "img" },
        { k: "href", n: "Link", t: "text" },
      ] },
    ],
    d: {
      eyebrow: "Results",
      headA: "Same traffic.",
      accent: "Different business.",
      clientLabel: "Client:",
      ctaText: "Read Case Study",
      cards: [
        {
          kicker: "Travel · Kashmir",
          figure: "100%",
          body: "lower cost per qualified enquiry in one season",
          client: "Tourwatchout",
          img: ADS + "img1-trim.png",
          href: "/our-work",
        },
        {
          kicker: "Automotive · Car Care",
          figure: "Rs 1k",
          body: "cost per booked job, down from Rs 10,000",
          client: "Colomoto",
          img: ADS + "img2.png",
          href: "/our-work",
        },
        {
          kicker: "Real Estate · NCR",
          figure: "200%",
          body: "lower cost per qualified site visit, same budget",
          client: "Rajpreet Infra",
          img: ADS + "img3.png",
          href: "/our-work",
        },
        {
          kicker: "Skincare · Marketplace",
          figure: "10x",
          body: "return on marketplace ad spend",
          client: "Episoul",
          img: ADS + "img4.png",
          href: "/our-work",
        },
      ],
    },
  },

  {
    key: "returnonspend",
    n: "The $92 statement",
    about: "The dark statement band and the two paragraphs under it.",
    fields: [
      { k: "headA", n: "Heading — a pipe (|) is a line break", t: "area" },
      { k: "accent", n: "Heading, orange part — a pipe (|) is a line break", t: "area" },
      { k: "bodyA", n: "First paragraph", t: "area" },
      { k: "bodyB", n: "Second paragraph", t: "area" },
    ],
    d: {
      headA: "For every $92 you spend|getting someone to your|site, you spend $1",
      accent: "making|sure they do something|when they arrive.",
      bodyA: "That ratio is not an exaggeration. It is the industry average, and it is why the cheapest growth available to most businesses is sitting inside traffic they have already paid for.",
      bodyB: "The median site converts 2.35% of visitors. The top ten percent convert 11.45%. That is not a traffic difference. That is a website difference.",
    },
  },

  {
    key: "whatdecides",
    n: "Six leaks",
    about: "The six cards that recede to the right, and the note beside the heading.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading, orange — first line", t: "text" },
      { k: "accent2", n: "Heading, orange — second line", t: "text" },
      { k: "note", n: "Note beside the heading", t: "area" },
      { k: "cards", n: "Cards", t: "list", of: [
        { k: "title", n: "Title", t: "text" },
        { k: "body", n: "Body", t: "area" },
      ] },
    ],
    d: {
      eyebrow: "Where the money goes",
      headA: "Six Leaks.",
      accent: "Most Sites Have",
      accent2: "Four Of Them.",
      note: "None of these are design opinions. Every one has a number attached, and every one is fixable without touching your ad budget.",
      cards: [
        { title: "Speed", body: "Every extra second of load time costs about 7% of conversions. It is the one fix that pays before a single word changes." },
        { title: "Mobile", body: "Most of the traffic, converting at half the rate. Sites are still designed on a 27-inch screen and tested there too." },
        { title: "The form", body: "Every field past the third costs you answers. Asking for a phone number before you have earned it costs the most." },
        { title: "Clarity", body: "Five seconds to say what you sell, who it is for and what happens next. Most sites lose people on the first one." },
        { title: "Proof", body: "Reviews, numbers, real faces. A claim with nothing behind it reads as a risk rather than a reason to buy." },
        { title: "Message", body: "The page has to finish the sentence the ad started. A mismatch here loses people who had already decided." },
      ],
    },
  },

  {
    key: "dashboards",
    n: "Doubling the rate",
    about: "The orange statement band and the line under it.",
    fields: [
      { k: "headA", n: "Statement — a pipe (|) is a line break", t: "area" },
      { k: "note", n: "Line under it", t: "area" },
    ],
    d: {
      headA: "Doubling your conversion|rate halves what a|customer costs you.|Without spending another|dollar on traffic.",
      note: "This is the only lever in marketing that works that way.",
    },
  },

  {
    key: "twojobs",
    n: "Two jobs",
    about: "The two grey columns — what we build, and what we improve.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "accent", n: "Heading, orange — second line", t: "text" },
      { k: "note", n: "Note beside the heading", t: "area" },
      { k: "leftTitle", n: "Left column — title", t: "text" },
      { k: "leftSub", n: "Left column — line under it", t: "text" },
      { k: "leftSubAccent", n: "Left column — bold part of that line", t: "text" },
      { k: "leftItems", n: "Left column — rows", t: "list", of: [
        { k: "lead", n: "Bold claim", t: "text" },
        { k: "rest", n: "Rest of the sentence", t: "area" },
      ] },
      { k: "rightTitle", n: "Right column — title", t: "text" },
      { k: "rightSub", n: "Right column — line under it", t: "text" },
      { k: "rightSubAccent", n: "Right column — bold part of that line", t: "text" },
      { k: "rightItems", n: "Right column — rows", t: "list", of: [
        { k: "lead", n: "Bold claim", t: "text" },
        { k: "rest", n: "Rest of the sentence", t: "area" },
      ] },
    ],
    d: {
      eyebrow: "Two different jobs",
      headA: "Sometimes You Need A New Site.",
      accent: "Usually You Do Not.",
      note: "We will tell you honestly which one you are, and we lose money saying it more often than you would expect.",
      leftTitle: "We build",
      leftSub: "Built to convert from day one,",
      leftSubAccent: "not redesigned into converting later.",
      leftItems: [
        { lead: "Fast on an ordinary phone", rest: " on patchy data, because that is what your buyer is actually holding." },
        { lead: "Structured for search and CRM", rest: " from the start, so the next two parts of the machine are not a rebuild." },
        { lead: "Tracking wired on launch day", rest: ", not bolted on when someone finally asks where leads came from." },
        { lead: "WhatsApp and call handoff", rest: " where your buyers prefer it, which in most markets they do." },
      ],
      rightTitle: "We improve",
      rightSub: "Find the leak, fix the leak, prove it moved.",
      rightSubAccent: "No blind redesigns.",
      rightItems: [
        { lead: "Session recordings and heatmaps", rest: " to see where people actually stop, not where we assume they do." },
        { lead: "Speed and mobile first", rest: ", because they are the cheapest wins and almost always the largest." },
        { lead: "Test, do not guess.", rest: " Only about 14% of tests win, which is exactly why you run them instead of arguing." },
        { lead: "Ship monthly", rest: ", measure against enquiries, and keep the version that earned it." },
      ],
    },
  },

  {
    key: "fivesteps",
    n: "Five steps",
    about: "The five phones. Each one turns between its two cards on its own.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "steps", n: "Phones", t: "list", of: [
        { k: "img", n: "Phone frame", t: "img" },
        { k: "titleA", n: "First card — title", t: "text" },
        { k: "bodyA", n: "First card — body", t: "area" },
        { k: "titleB", n: "Second card — title", t: "text" },
        { k: "bodyB", n: "Second card — body", t: "area" },
      ] },
    ],
    d: {
      eyebrow: "How we work",
      headA: "Five Steps.",
      accent: "Diagnosis Before Design.",
      steps: [
        {
          img: PHONES + "phone1.png",
          titleA: "Find The Leak",
          bodyA: "Analytics, recordings, speed test on a real mid-range device. We will not redesign a page until we can point at what is losing people.",
          titleB: "Name The Number",
          bodyB: "Which page, which step, how many people fall out of it. A leak nobody can measure is an opinion, not a problem.",
        },
        {
          img: PHONES + "phone2.png",
          titleA: "Fix Speed & Mobile",
          bodyA: "Images, rendering, scripts, layout shift, tap targets. It is the cheapest win, and it lifts your search rankings at the same time.",
          titleB: "Built For One Hand",
          bodyB: "Most of your buyers arrive on a phone, on ordinary data. If it is slow there, nothing further down the page ever gets read.",
        },
        {
          img: PHONES + "phone3.png",
          titleA: "Rewrite For The Buyer",
          bodyA: "Most sites describe the company. The good ones answer the question in the visitor's head. That rewrite alone often outperforms the redesign.",
          titleB: "Answer, Do Not Announce",
          bodyB: "What you do, who it is for, what it costs, what happens next. In that order, above the fold, in their words.",
        },
        {
          img: PHONES + "phone4.png",
          titleA: "Cut The Form, Add The Proof",
          bodyA: "Ask for the minimum, show real numbers, real names, real faces, then make the next step obvious on every screen.",
          titleB: "Every Field Costs You",
          bodyB: "Each extra box is people leaving. Ask for what your team actually needs to call back, and nothing beyond it.",
        },
        {
          img: PHONES + "phone5.png",
          titleA: "Test, Then Keep Testing",
          bodyA: "One change at a time, measured against enquiries rather than clicks. Most tests lose. That is the point of running them.",
          titleB: "Keep What Earned It",
          bodyB: "Ship monthly, hold the winner, throw the rest away. The site gets better every month instead of every three years.",
        },
      ],
    },
  },

  {
    key: "tech",
    n: "What we build on",
    about: "The row of stack cards. Each card is finished artwork with the name drawn into it.",
    fields: [
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "note", n: "Line under the heading", t: "area" },
      { k: "cards", n: "Cards", t: "list", of: [
        { k: "img", n: "Card artwork", t: "img" },
        { k: "name", n: "What it says (for screen readers)", t: "text" },
      ] },
    ],
    d: {
      headA: "What",
      accent: "We Build On.",
      note: "Chosen for what the business needs, not what we prefer to build. If WordPress is right for you, we will say so.",
      cards: [
        { img: TECH + "1.png", name: "Next.js" },
        { img: TECH + "2.png", name: "React" },
        { img: TECH + "3.png", name: "Node" },
        { img: TECH + "4.png", name: "WordPress" },
        { img: TECH + "5.png", name: "Shopify" },
        { img: TECH + "6.png", name: "Server side tracking" },
      ],
    },
  },

  {
    key: "measure",
    n: "What we measure",
    about: "The four artwork cards, one per number we report against.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "cards", n: "Cards", t: "list", of: [
        { k: "name", n: "Metric", t: "text" },
        { k: "img", n: "Image", t: "img" },
      ] },
    ],
    d: {
      eyebrow: "What we measure",
      headA: "Clicks Are Not",
      accent: "Customers.",
      cards: [
        { name: "Cost per qualified lead", img: ADS + "m1.png" },
        { name: "Lead to enquiry rate", img: ADS + "m2.png" },
        { name: "Creative win rate", img: ADS + "m3.png" },
        { name: "Blended acquisition cost", img: ADS + "m4.png" },
      ],
    },
  },

  /* The three bands every page closes with, taken from /sample's schema so
     they are described once rather than once per page. */
  borrow("soosocial"),
  borrow("faqform", { faqKey: "website-and-cro" }),
  borrow("latestblogs"),
]);
