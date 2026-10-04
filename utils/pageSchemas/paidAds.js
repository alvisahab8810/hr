// utils/pageSchemas/paidAds.js — /paid-ads, described as data.
//
// KEEP IDENTICAL between viralon-new and viralon-payroll: the website renders
// the page from this file and the CRM draws its form from it.
//
// Every `d` here is the copy the page ships with, which is what the editor
// opens on. Nothing is moved out of the components — each one still carries
// the same words — so an unsaved page renders exactly as it did before.
import { pageSchema, borrow } from "../siteSchema";

const WORK = "/assets/others/the-work/paid-ads/";
const PHONES = "/assets/others/the-work/social-content/";
const ICONS = PHONES + "icons/";

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
      title: "Paid Ads",
      quoteA: "Never stop testing, and your advertising will",
      quoteB: "never stop improving.",
      attrib: "David Ogilvy",
      note: "That is the whole job. Everything else is a dashboard.",
      stats: [
        { figure: "3 yrs", label: "Running accounts" },
        { figure: "100", label: "Brands worked with" },
        { figure: "10,000", label: "Qualified leads generated" },
        { figure: "100 Cr", label: "Ad budget managed" },
        { figure: "8+", label: "Ad platforms" },
        { figure: "10+", label: "Industries" },
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
      headA: "What the accounts",
      accent: "actually did.",
      clientLabel: "Client:",
      ctaText: "Read Case Study",
      cards: [
        {
          kicker: "Travel · Kashmir",
          figure: "100%",
          body: "lower cost per qualified enquiry in one season",
          client: "Tourwatchout",
          img: WORK + "img1-trim.png",
          href: "/our-work",
        },
        {
          kicker: "Automotive · Car Care",
          figure: "Rs 1k",
          body: "cost per booked job, down from Rs 10,000",
          client: "Colomoto",
          img: WORK + "img2.png",
          href: "/our-work",
        },
        {
          kicker: "Real Estate · NCR",
          figure: "200%",
          body: "lower cost per qualified site visit, same budget",
          client: "Rajpreet Infra",
          img: WORK + "img3.png",
          href: "/our-work",
        },
        {
          kicker: "Skincare · Marketplace",
          figure: "10x",
          body: "return on marketplace ad spend",
          client: "Episoul",
          img: WORK + "img4.png",
          href: "/our-work",
        },
      ],
    },
  },

  {
    key: "returnonspend",
    n: "Return on spend",
    about: "The heading and the two paragraphs under it.",
    fields: [
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "bodyA", n: "First paragraph", t: "area" },
      { k: "bodyB", n: "Second paragraph", t: "area" },
    ],
    d: {
      headA: "You want return on ad spend.",
      accent: "Nobody ever wanted anything else.",
      bodyA: "The part nobody says out loud is that ads are not a slot machine. You do not put money in one end and get customers out the other.",
      bodyB: "They are a process. Test, read the data, fix what is leaking, test again. The agencies promising results in week one are the ones quietly resetting your account in week three.",
    },
  },

  {
    key: "whatdecides",
    n: "What decides performance",
    about: "The eight cards that recede to the right, and the note beside the heading.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "note", n: "Note beside the heading", t: "area" },
      { k: "cards", n: "Cards", t: "list", of: [
        { k: "title", n: "Title", t: "text" },
        { k: "body", n: "Body", t: "area" },
      ] },
    ],
    d: {
      eyebrow: "Before you blame the ads",
      headA: "Eight Things Decide Performance.",
      accent: "Only Two Are The Ads.",
      note: "Most accounts we audit are not badly run. They are running perfectly against a problem sitting somewhere else entirely.",
      cards: [
        { title: "Creative", body: "The single biggest lever left. Creative drives 49% of incremental sales, more than targeting, reach and recency combined." },
        { title: "The offer", body: "Change the promise, the bundle or the guarantee before you touch anything cosmetic. Button colour never saved a weak offer." },
        { title: "Product market fit", body: "No ad fixes a product people do not want. Ads make an existing answer louder, including the wrong one." },
        { title: "Pricing", body: "Priced well above the market with no reason given? Ads will carry that objection to more people, faster." },
        { title: "Brand", body: "A name people recognise converts cheaper. Cold traffic to an unknown brand always costs more, everywhere." },
        { title: "Landing page", body: "Traffic without a page built to convert is wasted spend. The highest leverage, lowest cost fix in the whole account." },
        { title: "Platform fit", body: "Being on the wrong platform is not a budget problem. It is a decision problem, and more money makes it worse." },
        { title: "Tracking", body: "The algorithm optimises toward what it can see. Feed it a pixel firing on page load and it will find you page loads." },
      ],
    },
  },

  {
    key: "dashboards",
    n: "Dashboards",
    about: "The single dark statement about dashboards and creative.",
    fields: [
      { k: "headA", n: "Statement", t: "area" },
      { k: "note", n: "Line under it", t: "area" },
    ],
    d: {
      headA: "76% of marketing leaders spend more time reading dashboards than working on creative.",
      note: "The dashboard is where results appear. Creative is where they are made.",
    },
  },

  {
    key: "sixsteps",
    n: "Six steps",
    about: "The six phones. Each one turns between its two lines on its own.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "steps", n: "Phones", t: "list", of: [
        { k: "image", n: "Phone frame", t: "img" },
        { k: "lineOne", n: "The step", t: "text" },
        { k: "lineTwo", n: "What it is for", t: "text" },
      ] },
    ],
    d: {
      eyebrow: "How we work",
      headA: "Six Steps. In This Order.",
      accent: "Every Time.",
      steps: [
        { image: PHONES + "phone1.png", lineOne: "Pick The Platform", lineTwo: "Where The Buyer Already Is" },
        { image: PHONES + "phone2.png", lineOne: "Set The Budget Floor", lineTwo: "Enough To Learn, Not To Guess" },
        { image: PHONES + "phone3.png", lineOne: "Crunch, Cut, Scale", lineTwo: "Kill The Losers, Feed The Winner" },
        { image: PHONES + "phone4.png", lineOne: "Fix The Destination First", lineTwo: "The Page Decides, Not The Click" },
        { image: PHONES + "phone5.png", lineOne: "Launch And Test In Volume", lineTwo: "Many Angles, One Honest Read" },
        { image: PHONES + "phone2.png", lineOne: "Report Against The Business", lineTwo: "Leads And Revenue, Not Reach" },
      ],
    },
  },

  {
    key: "places",
    n: "Where we run them",
    about: "The six platform cards. The three card colours cycle in order.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "places", n: "Cards", t: "list", of: [
        { k: "name", n: "Name", t: "text" },
        { k: "kicker", n: "Line under the name", t: "text" },
        { k: "body", n: "Body", t: "area" },
        { k: "tags", n: "Who it is for", t: "text" },
        { k: "icon", n: "Icon", t: "img" },
      ] },
    ],
    d: {
      eyebrow: "Where we run them",
      headA: "Six Places.",
      accent: "Most Brands Need Two.",
      places: [
        {
          name: "Google",
          kicker: "Demand Capture",
          body: "Catches Demand That Already Exists. An Intent And Hygiene Game Where The Work Never Finishes.",
          tags: "Anything People Actively Search For",
          icon: ICONS + "google.png",
        },
        {
          name: "Meta",
          kicker: "Demand Creation",
          body: "Reaches People Who Were Not Looking For You. A Creative Testing Machine, And Almost Nothing Else.",
          tags: "Consumer · Local Service · Volume",
          icon: ICONS + "meta.png",
        },
        {
          name: "Marketplace",
          kicker: "Closest To The Money",
          body: "Amazon, Walmart, Flipkart, Noon, Zalando, Mercado Libre. A Shopper With A Card Already Out. Most Teams Still Treat This As A Side Project.",
          tags: "Any Brand Selling Physical Product",
          icon: ICONS + "facebook.png",
        },
        {
          name: "LinkedIn",
          kicker: "Expensive, And Worth It",
          body: "Costs Far More Per Lead And Is Often Cheaper Per Customer. You Buy Job Title Instead Of Guessing At It.",
          tags: "B2B With Real Deal Size",
          icon: ICONS + "linkedin.png",
        },
        {
          name: "YouTube",
          kicker: "Demand Before The Search",
          body: "Cheap Video Reach, And The Only Paid Channel That Builds The Branded Search Google Then Harvests Cheaply.",
          tags: "High Consideration Purchases",
          icon: ICONS + "youtube.png",
        },
        {
          name: "TikTok, Pinterest, Reddit, X",
          kicker: "Situational",
          body: "Excellent When Your Buyer Genuinely Lives There. A Waste When They Do Not, And We Will Say So.",
          tags: "Tested Before Scaled, Always",
          icon: ICONS + "tiktok.png",
        },
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
        { name: "Cost per qualified lead", img: WORK + "m1.png" },
        { name: "Lead to enquiry rate", img: WORK + "m2.png" },
        { name: "Creative win rate", img: WORK + "m3.png" },
        { name: "Blended acquisition cost", img: WORK + "m4.png" },
      ],
    },
  },

  /* The three bands every page closes with, taken from /sample's schema so
     they are described once rather than once per page. */
  borrow("soosocial"),
  borrow("faqform", { faqKey: "paid-ads" }),
  borrow("latestblogs"),
]);
