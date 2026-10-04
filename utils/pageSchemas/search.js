// utils/pageSchemas/search.js — /search, described as data.
//
// KEEP IDENTICAL between viralon-new and viralon-payroll: the website renders
// the page from this file and the CRM draws its form from it.
//
// Every `d` here is the copy the page ships with, which is what the editor
// opens on. Nothing is moved out of the components — each one still carries
// the same words — so an unsaved page renders exactly as it did before.
import { pageSchema, borrow } from "../siteSchema";

export default pageSchema([
  {
    key: "hero",
    n: "Hero",
    about: "The title, the query pill, the struck-out claim and the three figures.",
    fields: [
      { k: "title", n: "Title", t: "text" },
      { k: "query", n: "Query in the pill", t: "text" },
      { k: "dead", n: "Struck-out line", t: "text" },
      { k: "line", n: "Line under it", t: "text" },
      { k: "stats", n: "Figures", t: "list", of: [
        { k: "figure", n: "Figure", t: "text" },
        { k: "label", n: "What it is", t: "text" },
      ] },
    ],
    d: {
      title: "Search",
      query: "which agency handles both seo and ai search for education brands",
      dead: "SEO is dead.",
      line: "Search just stopped being a list.",
      stats: [
        { figure: "10%", label: "of one software company's new signups now arrive from ChatGPT" },
        { figure: "40%", label: "lift in AI visibility from a named source over generic prose" },
        { figure: "4", label: "engines now answer instead of listing, each reading differently" },
      ],
    },
  },

  {
    key: "results",
    n: "Results",
    about: "Three cards on the light band, each led by a large figure.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "ctaText", n: "Button on every card", t: "text" },
      { k: "cards", n: "Cards", t: "list", of: [
        { k: "figure", n: "Figure", t: "text" },
        { k: "body", n: "Body", t: "area" },
        { k: "img", n: "Artwork", t: "img" },
        { k: "href", n: "Button link", t: "text" },
      ] },
    ],
    d: {
      eyebrow: "Results",
      headA: "Not Just Numbers",
      accent: "Measured Results",
      ctaText: "Have a look",
      cards: [
        {
          figure: "240%",
          body: "People who already know why you are worth choosing convert at a different rate. Same budget, lower cost per enquiry.",
          img: "/assets/others/figure1.png",
          href: "/our-work",
        },
        {
          figure: "125%",
          body: "When price is the first question, nothing else was given to decide on. Brand is what gives them something else.",
          img: "/assets/others/figure2.png",
          href: "/our-work",
        },
        {
          figure: "250%",
          body: "Consistency across every touchpoint is what turns a buyer into someone who recommends you.",
          img: "/assets/others/figure3.png",
          href: "/our-work",
        },
      ],
    },
  },

  {
    key: "whysearch",
    n: "Why search",
    about: "The heading, the button, the two copy blocks and the photograph.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "ctaText", n: "Button", t: "text" },
      { k: "img", n: "Photograph", t: "img" },
      { k: "cards", n: "Copy blocks", t: "list", of: [
        { k: "lead", n: "Start of the sentence", t: "area" },
        { k: "hl", n: "Highlighted part", t: "area" },
        { k: "tail", n: "Rest of the sentence", t: "area" },
      ] },
    ],
    d: {
      eyebrow: "Why search",
      headA: "The Only Channel Where They",
      accent: "Arrive Already Wanting It.",
      ctaText: "Let's talk",
      img: "/assets/others/abt1.png",
      cards: [
        {
          lead: "An Ad Interrupts Someone. A Reel Earns Three Seconds.",
          hl: "A Search Is A Person Typing Their Problem Into A Box",
          tail: ", Right Now, Intending To Solve It.",
        },
        {
          lead: "You Are Not Creating Demand. You Are Catching It At The Exact Moment It Exists. That Is Why",
          hl: "Search Enquiries Close Faster And Cost Less Than Anything Else You Run",
          tail: ", And Why A Page That Ranks Keeps Producing Them Long After The Work Is Done.",
        },
      ],
    },
  },

  {
    key: "theshift",
    n: "The shift that matters",
    about: "The keyword-then-question pairs on the dark band.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading — first part", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "headB", n: "Heading — last part", t: "text" },
      { k: "intro", n: "Paragraph under it", t: "area" },
      { k: "pairs", n: "Pairs", t: "list", of: [
        { k: "keyword", n: "The old keyword", t: "text" },
        { k: "question", n: "The question now asked", t: "area" },
      ] },
    ],
    d: {
      eyebrow: "The shift that matters",
      headA: "People",
      accent: "Stopped Typing Keywords.",
      headB: "They Started Asking Questions.",
      intro:
        "A Keyword Gave You A Topic. A Question Gives You A Situation, A Budget, A Doubt And A Deadline. Far More Useful, And Almost Nobody Is Mapping Content To It.",
      pairs: [
        {
          keyword: "Best CRM Software",
          question: "Which CRM Works For A 12 Person Sales Team That Already Runs On WhatsApp",
        },
        {
          keyword: "Dentist In Lucknow",
          question: "Is A Root Canal Or An Implant Better If The Tooth Is Already Cracked",
        },
        {
          keyword: "2 Bhk Noida Price",
          question: "What Will A 2 Bhk In Noida Extension Actually Cost Me Monthly After Registry And EMI",
        },
      ],
    },
  },

  {
    key: "layers",
    n: "What you get",
    about: "SEO, AEO and GEO against the goal of each.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading — first part", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "headB", n: "Heading — last part", t: "text" },
      { k: "intro", n: "Paragraph beside it", t: "area" },
      { k: "colLayer", n: "First column heading", t: "text" },
      { k: "colGoal", n: "Second column heading", t: "text" },
      { k: "layers", n: "Rows", t: "list", of: [
        { k: "name", n: "Layer", t: "text" },
        { k: "tone", n: "Colour (hex)", t: "text" },
        { k: "goal", n: "The goal", t: "area" },
      ] },
    ],
    d: {
      eyebrow: "What you get",
      headA: "They",
      accent: "Run Together.",
      headB: "Not Instead Of Each Other.",
      intro:
        "Ranking on page one does not guarantee you appear in AI answers. Appearing in AI answers does not require page one. Two games, one foundation, and the domains already ranking well tend to win both.",
      colLayer: "Layer",
      colGoal: "The goal",
      layers: [
        { name: "SEO", tone: "#8668FF", goal: "Rank in the results that still exist and still convert" },
        { name: "AEO", tone: "#FF6D36", goal: "Be the direct answer, not one of ten links" },
        { name: "GEO", tone: "#FFC247", goal: "Be cited inside an answer a model writes from scratch" },
      ],
    },
  },

  {
    key: "howwework",
    n: "How we work",
    about: "The four steps, in the order they are done.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "steps", n: "Steps", t: "list", of: [
        { k: "title", n: "Title", t: "text" },
        { k: "desc", n: "Body", t: "area" },
        { k: "img", n: "Artwork", t: "img" },
      ] },
    ],
    d: {
      eyebrow: "How we work",
      headA: "Four Steps. The First Two",
      accent: "Decide The Rest.",
      steps: [
        {
          title: "Fix the foundation",
          desc: "Crawlers unblocked, content rendered server side, speed and indexation clean. Unglamorous, and nothing after it works without it.",
          img: "/assets/others/first-step.png",
        },
        {
          title: "Map keywords and prompts",
          desc: "Every term they might search and every question they might ask a model, mapped to buying stage and matched to a page, so nothing competes with itself.",
          img: "/assets/others/second-step.png",
        },
        {
          title: "Write what deserves the citation",
          desc: "Original data, a named expert behind the claim, and one passage per piece stated clearly enough to be quoted. Rehashed content earns nothing from anyone.",
          img: "/assets/others/third-step.png",
        },
        {
          title: "Earn the mentions, track both worlds",
          desc: "Digital PR and genuine community presence, because an unlinked mention on a real forum can outweigh a paid link. Then rankings, enquiries and AI citations, checked weekly.",
          img: "/assets/others/fourth-step.png",
        },
      ],
    },
  },

  {
    key: "whatwemeasure",
    n: "What we measure",
    about: "The four metrics that open under the pointer.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "accent", n: "Heading — orange line", t: "text" },
      { k: "metrics", n: "Metrics", t: "list", of: [
        { k: "num", n: "Number", t: "text" },
        { k: "title", n: "Name", t: "text" },
        { k: "desc", n: "One line of explanation", t: "area" },
        { k: "img", n: "Artwork", t: "img" },
      ] },
    ],
    d: {
      eyebrow: "What we measure",
      headA: "The Deliverables Are Not The Results",
      accent: "The Results Are The Result",
      metrics: [
        { num: "01.", title: "Enquiries from search", desc: "The only number that pays for the work", img: "/assets/others/hover1.png" },
        { num: "02.", title: "Qualified organic traffic", desc: "Visits from people who could actually buy", img: "/assets/others/hover2.png" },
        { num: "03.", title: "AI citations and referrals", desc: "How often you appear inside an answer, and what it sends", img: "/assets/others/hover3.png" },
        { num: "04.", title: "Cost per qualified lead", desc: "The number every part of the machine reports into", img: "/assets/others/hover4.png" },
      ],
    },
  },

  {
    key: "threeways",
    n: "Three ways we work",
    about: "The three engagements, with up to five bullets each.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "ctaText", n: "Button under the cards", t: "text" },
      { k: "ways", n: "Cards", t: "list", of: [
        { k: "name", n: "Name", t: "text" },
        { k: "promise", n: "The promise", t: "text" },
        { k: "forWho", n: "Who it is for", t: "area" },
        { k: "outcome", n: "What it produces", t: "area" },
        { k: "itemOne", n: "Bullet 1", t: "area" },
        { k: "itemTwo", n: "Bullet 2", t: "area" },
        { k: "itemThree", n: "Bullet 3", t: "area" },
        { k: "itemFour", n: "Bullet 4", t: "area" },
        { k: "itemFive", n: "Bullet 5", t: "area" },
      ] },
    ],
    d: {
      eyebrow: "Three ways we work",
      headA: "Not Packages.",
      accent: "Three Different Jobs.",
      ctaText: "Let's talk",
      ways: [
        {
          name: "Growth",
          promise: "Be Chosen",
          forWho: "For businesses ranking somewhere, but not where the money is",
          outcome: "Content that earns position and gets quoted.",
          itemOne: "Original research and data, the only reliable way to earn a citation",
          itemTwo: "Named expert attribution, which lifts AI visibility materially",
          itemThree: "Answer engine work aimed at AI Overviews and snippets",
          itemFour: "Monthly prompt gap analysis across ChatGPT, Perplexity and Gemini",
          itemFive: "Digital PR on real publications, plus conversion work on pages already getting traffic",
        },
        {
          name: "Authority",
          promise: "Be Cited",
          forWho: "For businesses that want to be the answer, not a result",
          outcome: "The source everyone else gets compared to.",
          itemOne: "Entity establishment everywhere the engines verify who you are",
          itemTwo: "Sourced mentions programme on Reddit, YouTube and niche communities",
          itemThree: "Category defining content, the pieces competitors end up citing",
          itemFour: "Multi-market and multi-language search where you sell across borders",
          itemFive: "Weekly citation tracking across four engines, logged and reported",
        },
        {
          name: "Presence",
          promise: "Be Findable",
          forWho: "For businesses that do not appear when someone searches the obvious thing",
          outcome: "The foundation, done properly, once.",
          itemOne: "Technical audit and fixes so crawlers can actually read you",
          itemTwo: "Keyword and prompt mapping across the buying journey",
          itemThree: "Core pages rewritten to answer the question, not describe the service",
          itemFour: "Local search, profiles, city pages and reviews",
          itemFive: "Rankings tracked every month, not filed",
        },
      ],
    },
  },

  /* The three bands every page closes with, taken from /sample's schema so
     they are described once rather than once per page. */
  borrow("soosocial"),
  borrow("faqform", { faqKey: "search" }),
  borrow("latestblogs"),
]);
