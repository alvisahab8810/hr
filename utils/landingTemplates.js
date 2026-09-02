// utils/landingTemplates.js — registry for the SEO landing-page builder.
//
// v2 (section-based): a page's content is { hero, sections: [{type, data}…],
// showLeadForm }. The admin can add / remove / reorder any section on any
// template; the template only decides the VISUAL SKIN each section renders in.
// Keys here must match viralon-new/components/landing (LANDING_TEMPLATES) —
// edit both repos together.
//
// 6 skins — five modelled on the reference pages the team picked, plus the
// house skin lifted straight from our own live service pages:
//   curve   → growthcurve.co        (bold conversion page, review-led)
//   nexa    → digitalnexa.com       (corporate growth, stat boxes + services)
//   studio  → okmg.com              (minimal serif editorial)
//   boom    → optiboom index-2      (classic SEO landing, split hero)
//   bold    → optiboom index-3      (punchy centered hero + workflow)
//   service → /our-services/*       (our own markup + classes + icons)

/* ─── Section type registry (drives the admin "Add section" menu) ──── */
export const SECTION_TYPES = {
  intro: {
    label: "Intro Copy", icon: "bi-text-paragraph",
    hint: "Rich-text SEO copy block — heading + paragraphs.",
    make: () => ({ heading: "", html: "" }),
  },
  split: {
    label: "Image + Text", icon: "bi-layout-split",
    hint: "About-style row — image on one side, copy on the other.",
    make: () => ({ heading: "", html: "", image: "", reverse: false }),
  },
  features: {
    label: "Feature Cards", icon: "bi-grid-1x2-fill",
    hint: "Services / benefits shown as a card grid.",
    make: () => ({ heading: "", subheading: "", items: [{ title: "", text: "", image: "" }] }),
  },
  process: {
    label: "Process Steps", icon: "bi-list-ol",
    hint: "Numbered how-we-work steps, each with an optional icon.",
    make: () => ({ heading: "", steps: [{ title: "", text: "", icon: "" }] }),
  },
  stats: {
    label: "Stats / Counters", icon: "bi-graph-up-arrow",
    hint: "Proof numbers — ROAS, clients, projects.",
    make: () => ({ heading: "", items: [{ value: "", label: "" }] }),
  },
  gallery: {
    label: "Image Gallery", icon: "bi-images",
    hint: "Portfolio / work image grid.",
    make: () => ({ heading: "", images: [""] }),
  },
  logos: {
    label: "Client Logos", icon: "bi-buildings-fill",
    hint: "Scrolling trust bar of client / partner logos.",
    make: () => ({ heading: "", images: [""] }),
  },
  reviews: {
    label: "Reviews", icon: "bi-star-fill",
    hint: "Client reviews with star ratings and optional photos.",
    make: () => ({ heading: "", items: [{ text: "", name: "", role: "", rating: 5, image: "" }] }),
  },
  faqs: {
    label: "FAQs", icon: "bi-question-circle-fill",
    hint: "Accordion Q&A — great for Google FAQ results.",
    make: () => ({ heading: "", items: [{ q: "", a: "" }] }),
  },
  cta: {
    label: "CTA Band", icon: "bi-megaphone-fill",
    hint: "Full-width call-to-action strip.",
    make: () => ({ headline: "", text: "", ctaText: "", ctaLink: "" }),
  },
  strap: {
    label: "Scrolling Strap", icon: "bi-arrow-left-right",
    hint: "Marquee band of keywords — the strip used above Process on service pages.",
    make: () => ({ items: [""] }),
  },
  benefits: {
    label: "Benefits Strip", icon: "bi-patch-check-fill",
    hint: "Gradient band with white benefit cards (our-services 'Significance' block).",
    make: () => ({ heading: "", text: "", items: [{ title: "", text: "" }] }),
  },
  whychoose: {
    label: "Why Choose Us", icon: "bi-hand-thumbs-up-fill",
    hint: "Image collage + tick-list of reasons — the strongest block on service pages.",
    make: () => ({ kicker: "", heading: "", brand: "", items: [{ title: "", text: "" }], images: [""] }),
  },
  blogs: {
    label: "Latest Blogs", icon: "bi-journal-text",
    hint: "Three blog cards with date badges — good for internal linking.",
    make: () => ({ heading: "", text: "", items: [{ title: "", text: "", image: "", date: "", link: "" }] }),
  },
};

export const SECTION_TYPE_KEYS = Object.keys(SECTION_TYPES);

/* ─── Shared sample pieces (Viralon voice) ─────────────────────────── */
const LOGOS = [
  "/assets/img/home/clients-logos/partner1.png",
  "/assets/img/home/clients-logos/partner2.png",
  "/assets/img/home/clients-logos/partner3.png",
  "/assets/img/home/clients-logos/partner4.png",
  "/assets/img/home/clients-logos/partner5.png",
  "/assets/img/home/clients-logos/partner11.png",
];

const FAQS_SEO = [
  { q: "How long does SEO take to show results?", a: "Most of our clients see meaningful movement in 60–90 days — rankings, traffic and enquiries. SEO compounds: month 6 is always bigger than month 3. We share a transparent monthly report so you see exactly what is working." },
  { q: "How much does digital marketing cost in Lucknow?", a: "It depends on scope — a focused SEO retainer starts far lower than a full-funnel engagement with ads and content. Tell us your goal and budget and we will design a plan around it, not the other way round." },
  { q: "Do you work with businesses outside Lucknow?", a: "Yes. We are based in Lucknow but run campaigns for brands across India and abroad. Strategy calls happen on video, reporting is live, and results do not care about distance." },
  { q: "What makes Viralon different from other agencies?", a: "We are creators first, marketers second. Strategy, content, design and ads sit in one room — so campaigns ship faster, look better and convert harder. And you always know exactly what we did, and why." },
];

const REVIEWS = [
  { text: "Viralon rebuilt our funnel from scratch. Within 3 months our cost per lead dropped by half and the quality went up — the team just gets performance.", name: "Rohit Malhotra", role: "Founder, D2C skincare brand", rating: 5, image: "/assets/img/home/testimonials/1.png" },
  { text: "Finally an agency that shows its work. Weekly reports, honest calls, and creatives that actually stop the scroll. Our Instagram grew 4x in a quarter.", name: "Sneha Kapoor", role: "Marketing Head, EdTech startup", rating: 5, image: "/assets/img/home/testimonials/2.png" },
  { text: "We ranked on page one for our biggest keywords in under five months. The enquiries now come to us — we stopped chasing.", name: "Amit Verma", role: "Director, Real-estate group", rating: 5, image: "/assets/img/home/testimonials/3.png" },
];

const STATS = [
  { value: "3.2x", label: "Average ROAS delivered" },
  { value: "120+", label: "Brands grown" },
  { value: "50M+", label: "Content views generated" },
  { value: "68%", label: "Avg. drop in cost per lead" },
];

const GALLERY = [
  "/assets/img/portfolio/h1.webp",
  "/assets/img/portfolio/h2.webp",
  "/assets/img/portfolio/h3.webp",
  "/assets/img/portfolio/h4.webp",
];

const PROCESS_STEPS = [
  { title: "Audit & Strategy", text: "We tear down your current presence, your competitors and your market — and hand you a plan with numbers on it.", icon: "/assets/img/our-services/paid-media-marketing/icons/icon1.png" },
  { title: "Build & Launch", text: "Pages, content, campaigns and tracking go live fast. No six-week 'onboarding'.", icon: "/assets/img/our-services/paid-media-marketing/icons/icon2.png" },
  { title: "Optimise & Scale", text: "Weekly iterations on what the data says. Winners get budget, losers get killed.", icon: "/assets/img/our-services/paid-media-marketing/icons/icon3.png" },
];

const SPLIT_ABOUT = {
  heading: "We're not a vendor. We're your growth department.",
  html: "<p>Agencies hand you reports; we hand you results. Every Viralon engagement starts with your business goal — then we reverse-engineer the channels, creative and budget to hit it. You get one point of contact, a live dashboard and a team that treats your money like its own.</p>",
  image: "/assets/img/about/1.jpg",
  reverse: false,
};

/* Reused straight from the live our-services pages so landing pages share the
   same visual language (and the same already-optimised assets). */
const STRAP_WORDS = [
  "SOCIAL MEDIA MARKETING",
  "PAID ADVERTISEMENT",
  "SEARCH ENGINE OPTIMIZATION",
  "EMAIL MARKETING",
  "BRANDING & DESIGN",
];

const BENEFITS = {
  heading: "The Significance of Digital Marketing For Your Brand",
  text: "Done right, digital marketing does more than fill a feed — it puts you in front of buyers at the exact moment they are looking, and gives you the numbers to prove it.",
  items: [
    { title: "Increased Visibility", text: "Appear prominently in search results and social feeds, so potential customers actually see what you offer." },
    { title: "Targeted Reach", text: "Tailor every campaign to specific demographics, interests and behaviours — no wasted impressions." },
    { title: "Brand Awareness", text: "Consistent visibility plants your brand in the minds of buyers, making it recognisable and trustworthy." },
    { title: "Driving Conversions", text: "Every asset is designed to prompt action — a call, an enquiry, a purchase, a signup." },
    { title: "Measurable Results", text: "Track performance in real time and make decisions on data instead of gut feel." },
  ],
};

const WHY_CHOOSE = {
  kicker: "-5 Solid Reasons",
  heading: "Why Choose",
  brand: "Viralon",
  items: [
    { title: "Expertise and Experience", text: "Our team has run high-performing campaigns across a dozen industries — we have seen your problem before." },
    { title: "Data-Driven Strategies", text: "We leverage analytics at every step to build strategies that maximise your return on investment." },
    { title: "Customized Campaigns", text: "Every campaign is tailored to your business goals and your audience — never a recycled template." },
    { title: "Continuous Optimization", text: "We monitor performance and make real-time adjustments to keep results climbing." },
    { title: "Transparent Reporting", text: "Regular, detailed reports with the metrics that matter — and a human who explains them." },
  ],
  images: ["/assets/img/seo/img1.png", "/assets/img/seo/img2.png", "/assets/img/seo/img3.png"],
};

const BLOG_CARDS = {
  heading: "Latest Blogs",
  text: "Playbooks, teardowns and lessons from the campaigns we run every day — written by the team that runs them.",
  items: [
    { title: "How much should a small business spend on ads?", text: "A practical budgeting framework — how to set a first number, when to scale it, and the signals that say stop.", image: "/assets/img/seo/blogs/1.jpg", date: "18 Apr", link: "/blogs" },
    { title: "SEO in 2025: what actually still moves rankings", text: "We audited our own client wins to separate the tactics that work from the ones agencies keep selling.", image: "/assets/img/seo/blogs/2.jpg", date: "25 Aug", link: "/blogs" },
    { title: "The landing page checklist we use before every launch", text: "Twenty-one checks between 'page is live' and 'page converts'. Steal the whole list.", image: "/assets/img/seo/blogs/3.jpg", date: "05 Jul", link: "/blogs" },
  ],
};

/* Icons that ship with the service pages — used section-wise on landing pages. */
const PROCESS_ICONS = [
  "/assets/img/our-services/paid-media-marketing/icons/icon1.png",
  "/assets/img/our-services/paid-media-marketing/icons/icon2.png",
  "/assets/img/our-services/paid-media-marketing/icons/icon3.png",
  "/assets/img/our-services/paid-media-marketing/icons/icon4.png",
  "/assets/img/our-services/paid-media-marketing/icons/icon5.png",
];

const CTA_BAND = {
  headline: "Ready to grow? Let's talk.",
  text: "One free strategy call. We'll audit where you stand and show you exactly what we'd do — no jargon, no pressure.",
  ctaText: "Book a Free Call",
  ctaLink: "/contact-us",
};

/* ─── The 5 templates ──────────────────────────────────────────────── */
export const TEMPLATES = [
  {
    key: "curve",
    name: "Curve",
    tagline: "Bold conversion page — big type, reviews up front, gradient CTAs.",
    defaults: {
      hero: {
        kicker: "Your Full-Funnel Marketing Team",
        headline: "Your Growth,",
        headlineAccent: "Engineered.",
        subheadline: "Viralon plans, creates and runs the entire funnel — ads, content, SEO and design — so every rupee you spend has a job to do.",
        heroImage: "",
        ctaText: "Book a Free Call",
        ctaLink: "/contact-us",
      },
      sections: [
        { type: "intro", data: { heading: "Advertising alone is dead. Full-funnel is what's next.", html: "<p>Boosting posts and praying is not a strategy. We build the whole machine — scroll-stopping creative, targeted ads, landing pages that convert and SEO that keeps compounding after the ads stop. One team, one plan, one number that matters: growth.</p>" } },
        { type: "logos", data: { heading: "Trusted by growing brands", images: LOGOS } },
        { type: "reviews", data: { heading: "Brands talk. Numbers talk louder.", items: REVIEWS } },
        { type: "features", data: {
          heading: "Everything under one roof",
          subheading: "Pick a lane or take the full stack — every service plugs into the same growth plan.",
          items: [
            { title: "Performance Ads", text: "Meta & Google campaigns engineered for ROAS, not vanity reach. Daily optimisation, weekly reporting.", image: "" },
            { title: "SEO", text: "Rank for the searches that bring buyers, not just visitors. Technical, content and local SEO in one program.", image: "" },
            { title: "Social Media", text: "Content calendars, reels and community management that turn followers into a pipeline.", image: "" },
            { title: "Creative Production", text: "Thumb-stopping ad creatives, UGC-style videos and brand shoots — made in-house, shipped fast.", image: "" },
            { title: "Web & Landing Pages", text: "Fast, beautiful pages built to convert paid traffic — designed, written and tested by us.", image: "" },
            { title: "Branding", text: "Logos, identity systems and brand voice that make you impossible to confuse with a competitor.", image: "" },
          ],
        } },
        { type: "split", data: SPLIT_ABOUT },
        { type: "stats", data: { heading: "", items: STATS } },
        { type: "gallery", data: { heading: "Recent work", images: GALLERY } },
        { type: "strap", data: { items: STRAP_WORDS } },
        { type: "process", data: { heading: "How we work", steps: PROCESS_STEPS } },
        { type: "benefits", data: BENEFITS },
        { type: "whychoose", data: WHY_CHOOSE },
        { type: "faqs", data: { heading: "Questions we get every week", items: FAQS_SEO } },
        { type: "blogs", data: BLOG_CARDS },
        { type: "cta", data: CTA_BAND },
      ],
      showLeadForm: true,
    },
  },
  {
    key: "nexa",
    name: "Nexa",
    tagline: "Corporate growth page — stat boxes in the hero, service cards, logo bar.",
    defaults: {
      hero: {
        kicker: "Award-Winning Digital Solutions",
        headline: "End-to-End Digital Growth for Serious Businesses",
        headlineAccent: "",
        subheadline: "From strategy to execution — Viralon is the single partner behind your ads, SEO, content and web. Built in Lucknow, delivering across India.",
        heroImage: "/assets/img/portfolio/h1.webp",
        ctaText: "Request a Proposal",
        ctaLink: "/contact-us",
      },
      sections: [
        { type: "stats", data: { heading: "", items: [
          { value: "120+", label: "Brands served" },
          { value: "8+", label: "Industries mastered" },
          { value: "50M+", label: "Views generated" },
          { value: "3.2x", label: "Average ROAS" },
        ] } },
        { type: "intro", data: { heading: "One partner. Every channel.", html: "<p>Most businesses juggle a freelancer for SEO, an agency for ads and an intern for social. Viralon replaces the juggling act — one accountable team running strategy, creative and media under a single growth plan, with reporting you can actually read.</p>" } },
        { type: "features", data: {
          heading: "What we do",
          subheading: "Six services, one accountable team.",
          items: [
            { title: "Digital Marketing", text: "Full-funnel campaigns across Meta, Google and YouTube — planned, launched and optimised in-house.", image: "" },
            { title: "Search Engine Optimisation", text: "Technical audits, content engines and local SEO that put you on page one and keep you there.", image: "" },
            { title: "Website Design", text: "Conversion-first websites and landing pages — fast, responsive and on-brand.", image: "" },
            { title: "Social Media Management", text: "Strategy, content and community — a feed that sells while you sleep.", image: "" },
            { title: "Video & Photography", text: "Product shoots, brand films and reels produced by our in-house creative studio.", image: "" },
            { title: "Branding & Identity", text: "Positioning, identity and guidelines that make every touchpoint feel unmistakably you.", image: "" },
          ],
        } },
        { type: "logos", data: { heading: "Trusted by growing brands", images: LOGOS } },
        { type: "split", data: {
          heading: "We're not a vendor. We're your growth department.",
          html: "<p>Agencies hand you reports; we hand you results. Every Viralon engagement starts with your business goal — then we reverse-engineer the channels, creative and budget to hit it. You get one point of contact, a live dashboard and a team that treats your money like its own.</p>",
          image: "/assets/img/about/1.jpg",
          reverse: false,
        } },
        { type: "gallery", data: { heading: "Recent work", images: GALLERY } },
        { type: "strap", data: { items: STRAP_WORDS } },
        { type: "process", data: { heading: "How an engagement works", steps: PROCESS_STEPS } },
        { type: "benefits", data: BENEFITS },
        { type: "whychoose", data: { ...WHY_CHOOSE, heading: "Why Businesses Choose" } },
        { type: "reviews", data: { heading: "What clients say", items: REVIEWS } },
        { type: "faqs", data: { heading: "Frequently asked questions", items: FAQS_SEO } },
        { type: "blogs", data: BLOG_CARDS },
        { type: "cta", data: { ...CTA_BAND, headline: "Start your growth journey with Viralon" } },
      ],
      showLeadForm: true,
    },
  },
  {
    key: "studio",
    name: "Studio",
    tagline: "Minimal serif editorial — quiet luxury, big imagery, thin rules.",
    defaults: {
      hero: {
        kicker: "Viralon — Creative Digital Studio",
        headline: "Digital solutions that create value",
        headlineAccent: "",
        subheadline: "Strategy, design and marketing for brands that would rather be remembered than merely seen.",
        heroImage: "",
        ctaText: "Let's Talk",
        ctaLink: "/contact-us",
      },
      sections: [
        { type: "intro", data: { heading: "", html: "<p>We are a Lucknow-born studio working at the intersection of craft and performance. Every engagement is small enough to care about and serious enough to measure — brand, web, content and campaigns held to the same standard: does it move the business?</p>" } },
        { type: "logos", data: { heading: "", images: LOGOS } },
        { type: "features", data: {
          heading: "Three disciplines. One standard.",
          subheading: "",
          items: [
            { title: "Digital", text: "Websites, landing pages and product experiences — designed to convert, built to last.", image: "" },
            { title: "Marketing", text: "SEO, paid media and content engines that compound month over month.", image: "" },
            { title: "Creative", text: "Identity, film and photography from our in-house studio — craft you can feel.", image: "" },
          ],
        } },
        { type: "split", data: { ...SPLIT_ABOUT, heading: "Craft you can measure." } },
        { type: "gallery", data: { heading: "Selected work", images: ["/assets/img/portfolio/h2.webp", "/assets/img/portfolio/h3.webp", "/assets/img/portfolio/h4.webp"] } },
        { type: "stats", data: { heading: "", items: STATS } },
        { type: "strap", data: { items: STRAP_WORDS } },
        { type: "process", data: { heading: "The way we work", steps: PROCESS_STEPS } },
        { type: "benefits", data: { ...BENEFITS, heading: "What good digital work does for a brand" } },
        { type: "whychoose", data: { ...WHY_CHOOSE, kicker: "-5 Solid Reasons", heading: "Why Work With" } },
        { type: "reviews", data: { heading: "Kind words", items: REVIEWS.slice(0, 2) } },
        { type: "faqs", data: { heading: "Good questions", items: FAQS_SEO } },
        { type: "blogs", data: { ...BLOG_CARDS, heading: "From the journal" } },
        { type: "cta", data: { ...CTA_BAND, headline: "Let's create value together." } },
      ],
      showLeadForm: true,
    },
  },
  {
    key: "boom",
    name: "Boom",
    tagline: "Classic SEO landing — split hero, counters, steps & icon cards.",
    defaults: {
      hero: {
        kicker: "Digital Marketing Agency in Lucknow",
        headline: "Effective Online Marketing That Pays For Itself",
        headlineAccent: "",
        subheadline: "SEO, ads and content built around one metric — the revenue they return. Get a free audit and see exactly where you're leaving money on the table.",
        heroImage: "/assets/img/seo/hero-img.png",
        ctaText: "Get a Free Audit",
        ctaLink: "/contact-us",
      },
      sections: [
        { type: "intro", data: { heading: "Marketing that answers to revenue", html: "<p>Traffic is easy. Traffic that buys is the job. We combine SEO, paid ads and content into one funnel — measured end to end, so you always know which rupee brought which customer.</p>" } },
        { type: "features", data: {
          heading: "Drive more traffic. Get more sales.",
          subheading: "Four engines, tuned to work together.",
          items: [
            { title: "Search Engine Optimisation", text: "Own page one for keywords your buyers actually search. Technical, on-page and local SEO in one program.", image: "" },
            { title: "Performance Advertising", text: "Meta & Google ads with daily optimisation — spend goes where the conversions are.", image: "" },
            { title: "Content & Social", text: "Reels, posts and blogs that build audience today and rankings tomorrow.", image: "" },
            { title: "Web & Landing Pages", text: "Fast pages engineered for one job: turning clicks into enquiries.", image: "" },
          ],
        } },
        { type: "stats", data: { heading: "", items: STATS } },
        { type: "logos", data: { heading: "Trusted by growing brands", images: LOGOS } },
        { type: "split", data: {
          heading: "Dominate your digital landscape",
          html: "<p>Ranking is not luck — it is a process. We audit your site, fix what is broken, build content that answers real searches and earn the signals Google trusts. Then we do it again next month. That is why our clients stop paying for every single click.</p>",
          image: "/assets/img/seo/core-task.webp",
          reverse: true,
        } },
        { type: "strap", data: { items: STRAP_WORDS } },
        { type: "process", data: { heading: "How we work", steps: PROCESS_STEPS } },
        { type: "benefits", data: BENEFITS },
        { type: "gallery", data: { heading: "Work that worked", images: GALLERY } },
        { type: "whychoose", data: WHY_CHOOSE },
        { type: "reviews", data: { heading: "Client reviews", items: REVIEWS } },
        { type: "faqs", data: { heading: "Before you ask", items: FAQS_SEO } },
        { type: "blogs", data: BLOG_CARDS },
        { type: "cta", data: { ...CTA_BAND, headline: "Get your free marketing audit" } },
      ],
      showLeadForm: true,
    },
  },
  {
    key: "bold",
    name: "Bold",
    tagline: "Punchy centered hero, numbered features & workflow — high energy.",
    defaults: {
      hero: {
        kicker: "Unlock Your Brand's Next Level",
        headline: "MAKE THEM",
        headlineAccent: "REMEMBER YOU",
        subheadline: "Viralon turns attention into revenue — with creative that stops thumbs and campaigns that close the deal.",
        heroImage: "/assets/img/portfolio/h3.webp",
        ctaText: "Start Your Project",
        ctaLink: "/contact-us",
      },
      sections: [
        { type: "intro", data: { heading: "Attention is the cheapest thing you'll ever buy badly.", html: "<p>Everyone can buy impressions. Almost nobody converts them. Viralon builds the creative, the offer and the funnel together — so the money you spend on attention actually comes back with interest.</p>" } },
        { type: "logos", data: { heading: "Trusted by growing brands", images: LOGOS } },
        { type: "features", data: {
          heading: "Dominate the digital landscape",
          subheading: "",
          items: [
            { title: "Digital Advertising", text: "Campaigns across Meta, Google & YouTube that print pipeline, not just impressions.", image: "" },
            { title: "Search Engine Growth", text: "SEO that compounds — every month of work keeps paying you back.", image: "" },
            { title: "Media & Content", text: "An in-house studio shipping reels, shoots and brand films on a weekly cadence.", image: "" },
          ],
        } },
        { type: "gallery", data: { heading: "Optimising brands for online success", images: ["/assets/img/portfolio/h1.webp", "/assets/img/portfolio/h2.webp", "/assets/img/portfolio/h4.webp"] } },
        { type: "stats", data: { heading: "", items: STATS } },
        { type: "strap", data: { items: STRAP_WORDS } },
        { type: "process", data: {
          heading: "Harness the power of digital",
          steps: [
            { title: "Discover", text: "Deep-dive into your brand, audience and competitors — we find the angle others missed.", icon: PROCESS_ICONS[0] },
            { title: "Create", text: "Creative, content and pages built in-house, on-brand and on-deadline.", icon: PROCESS_ICONS[1] },
            { title: "Amplify", text: "Ads and SEO push the work to the people who'll pay for it — and we scale what converts.", icon: PROCESS_ICONS[2] },
          ],
        } },
        { type: "benefits", data: BENEFITS },
        { type: "split", data: SPLIT_ABOUT },
        { type: "whychoose", data: WHY_CHOOSE },
        { type: "reviews", data: { heading: "Proof, not promises", items: REVIEWS } },
        { type: "faqs", data: { heading: "FAQs", items: FAQS_SEO } },
        { type: "blogs", data: BLOG_CARDS },
        { type: "cta", data: CTA_BAND },
      ],
      showLeadForm: true,
    },
  },
  {
    // The house skin: same markup and CSS classes as the live our-services
    // pages (seo-hero / core-task-bg / process-section / significance-section /
    // solid-reasons-section / faq-section / lets-cta-section), so a landing
    // page is visually indistinguishable from /our-services/*.
    key: "service",
    name: "Service",
    tagline: "Viralon house style — identical to our live our-services pages.",
    defaults: {
      hero: {
        kicker: "",
        headline: "Turn Clicks into Customers",
        headlineAccent: "Explore Strategic Digital Marketing Solutions",
        subheadline: "In today's digital age, the competition for your customer's attention is fiercer than ever. That's where Viralon comes in — a strategic partner that helps your business stand out, connect with the right audience and achieve tangible results.",
        heroImage: "/assets/img/seo/hero-img.png",
        ctaText: "Get a Free Audit",
        ctaLink: "/contact-us",
      },
      sections: [
        { type: "features", data: {
          heading: "Core Tasks in Viralon's Digital Marketing",
          subheading: "Our focused approach combines strategic planning, precise targeting, creative development and data-driven analysis to deliver campaigns that resonate with your audience and maximise your return on investment.",
          items: [
            { title: "Strategic Campaign Planning", text: "Our experts plan every campaign — identifying the most effective platforms, targeting options and ad formats to hit your goals.", image: "" },
            { title: "Keyword Research and Optimisation", text: "Comprehensive keyword research ensures you are not only seen, but seen by the right people. Continuous optimisation keeps the budget honest.", image: "" },
            { title: "Ad Creation and A/B Testing", text: "We create persuasive creatives and refine them through rigorous A/B testing for maximum engagement and impact.", image: "" },
            { title: "Budget Management", text: "Effective allocation is everything. We manage your spend with precision so reach and conversions go up while waste goes down.", image: "" },
            { title: "On-Page and Off-Page SEO", text: "Technical fixes, content and authority building that compound month after month into durable rankings.", image: "" },
          ],
        } },
        { type: "strap", data: { items: STRAP_WORDS } },
        { type: "process", data: {
          heading: "Our Proven Digital Marketing Process",
          steps: [
            { title: "Consultation and Research", text: "We start with a consultation to understand your goals, followed by market research to identify opportunities and target audiences.", icon: PROCESS_ICONS[0] },
            { title: "Strategic Planning", text: "We develop a comprehensive strategy — selecting the right platforms, targeting options and high-performing keywords.", icon: PROCESS_ICONS[1] },
            { title: "Creation and Testing", text: "Our team designs compelling creatives and runs A/B tests to optimise performance and engagement.", icon: PROCESS_ICONS[2] },
            { title: "Budget Management", text: "We allocate and manage your budget effectively to maximise reach and conversions while minimising waste.", icon: PROCESS_ICONS[3] },
            { title: "Monitoring and Optimisation", text: "We track key metrics continuously, report transparently and refine strategy based on what the data says.", icon: PROCESS_ICONS[4] },
          ],
        } },
        { type: "cta", data: CTA_BAND },
        { type: "benefits", data: BENEFITS },
        { type: "whychoose", data: WHY_CHOOSE },
        { type: "stats", data: { heading: "", items: STATS } },
        { type: "logos", data: { heading: "Trusted by growing brands", images: LOGOS } },
        { type: "gallery", data: { heading: "Recent work", images: GALLERY } },
        { type: "split", data: SPLIT_ABOUT },
        { type: "intro", data: { heading: "Why digital marketing decides who wins", html: "<p>Your buyers research before they buy. If you are not there — in search, in the feed, on the page that answers their question — someone else is. Viralon makes sure that someone is you, and gives you the numbers to prove the spend was worth it.</p>" } },
        { type: "reviews", data: { heading: "Have a look — what our clients are saying", items: REVIEWS } },
        { type: "faqs", data: { heading: "Frequently Asked Questions", items: FAQS_SEO } },
        { type: "blogs", data: BLOG_CARDS },
      ],
      showLeadForm: true,
    },
  },
];

export const TEMPLATE_KEYS = TEMPLATES.map((t) => t.key);

export const getTemplate = (key) =>
  TEMPLATES.find((t) => t.key === key) || TEMPLATES[0];
