// utils/pageSchemas/analyticsAndTracking.js — /analytics-and-tracking,
// described as data.
//
// KEEP IDENTICAL between viralon-new and viralon-payroll: the website renders
// the page from this file and the CRM draws its form from it.
//
// Every `d` here is the copy the page ships with, which is what the editor
// opens on. Nothing is moved out of the components — each one still carries
// the same words — so an unsaved page renders exactly as it did before.
//
// Two bands on this page do arithmetic off their own figures: the hero sums
// the three shares, and the loss panel compounds the four leaks into the
// number of conversions that arrive. Change a figure and every number drawn
// from it follows, which is why those fields say what they feed.
import { pageSchema, borrow } from "../siteSchema";

const OTHERS = "/assets/others/";

export default pageSchema([
  {
    key: "hero",
    n: "Hero",
    about: "The claim, and the three bars that add up to more than the business ever made.",
    fields: [
      { k: "headA", n: "Heading — first line", t: "text" },
      { k: "headB", n: "Heading — second line", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "note", n: "Paragraph under the heading", t: "area" },
      { k: "label", n: "Label above the bars", t: "text" },
      { k: "shares", n: "Bars — the total under them is their sum", t: "list", of: [
        { k: "name", n: "Who is claiming", t: "text" },
        { k: "value", n: "Percent claimed (a number)", t: "text" },
        { k: "color", n: "Colour (hex)", t: "text" },
      ] },
      { k: "totalLabel", n: "Label on the total", t: "text" },
      { k: "totalNote", n: "Note beside the total", t: "area" },
    ],
    d: {
      headA: "Your platforms claim more revenue",
      headB: "than your bank",
      accent: "received.",
      note: "Every platform is paid to take credit. None of them are paid to tell you the truth. Add up what Meta and Google each claim and the total usually exceeds what the business actually made.",
      label: "Platform-reported revenue share",
      shares: [
        { name: "Meta says", value: "60", color: "#FE4601" },
        { name: "Google says", value: "45", color: "#DDF45B" },
        { name: "Organic says", value: "20", color: "#FFB13B" },
      ],
      totalLabel: "Total credit claimed",
      totalNote: "You only made 100%. Somebody is taking credit for a sale they did not cause, and right now you are funding whoever shouts loudest.",
    },
  },

  {
    key: "threequestions",
    n: "Three questions",
    about: "The three question cards, and the layer each one opens underneath them.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "questions", n: "Questions", t: "list", of: [
        { k: "label", n: "Card label", t: "text" },
        { k: "title", n: "Question", t: "text" },
        { k: "body", n: "Card body", t: "area" },
        { k: "owner", n: "Who owns it, how often", t: "text" },
        { k: "layerLabel", n: "Layer — label", t: "text" },
        { k: "layerTitle", n: "Layer — heading", t: "text" },
        { k: "layerLead", n: "Layer — paragraph", t: "area" },
        { k: "layerBuild", n: "Layer — what we build", t: "area" },
      ] },
      { k: "buildLabel", n: "Words before \"what we build\"", t: "text" },
      { k: "shot", n: "Phone-only artwork", t: "img" },
    ],
    d: {
      eyebrow: "Start with the decision",
      headA: "Three Questions.",
      accent: "Three Different Answers.",
      buildLabel: "What we build",
      shot: OTHERS + "mob-abt.png",
      questions: [
        {
          label: "Question 01",
          title: "What happened?",
          body: "The operational number. Which ad produced which enquiry. Fix this first.",
          owner: "Daily · Media buyer",
          layerLabel: "Layer one · Tracking",
          layerTitle: "Which ad produced which enquiry.",
          layerLead: "The operational number. It is also the one most businesses get wrong, because browsers, blockers and consent strip a third of it before it ever reaches the platform. Fix this first. Everything above it inherits the error.",
          layerBuild: "Server side container on your infrastructure. Conversions API with enhanced IDs. Consent Mode v2 enforced at the server. GA4 configured rather than defaulted.",
        },
        {
          label: "Question 02",
          title: "What is driving it?",
          body: "The directional question. Which channel deserves more next month and what to stop.",
          owner: "Monthly · You",
          layerLabel: "Layer two · Attribution",
          layerTitle: "Which channel deserves more next month.",
          layerLead: "The directional question. Every platform counts the same enquiry as its own, so the answer has to come from one model you own rather than three dashboards arguing. Read it monthly, not daily.",
          layerBuild: "Blended reporting with every channel in one model. Platform claims reconciled against the enquiries in your CRM. One number per channel you can actually spend against.",
        },
        {
          label: "Question 03",
          title: "Would it have happened anyway?",
          body: "Incrementality. Evidence a holdout test produced. Only a test can answer this honestly.",
          owner: "Quarterly · CFO",
          layerLabel: "Layer three · Incrementality",
          layerTitle: "Would it have happened anyway?",
          layerLead: "The honest question, and the only one no dashboard can answer. A holdout turns “this channel works” into evidence, which is the difference between a budget decision and a hunch.",
          layerBuild: "Geo or audience holdouts run on a real schedule. A control group that stays clean. A quarterly read your CFO can sign off on.",
        },
      ],
    },
  },

  {
    key: "conversionloss",
    n: "Conversion loss",
    about: "The hundred dots. The leaks compound, and the arrived figure is what survives them.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading — after the 100", t: "text" },
      { k: "accentA", n: "Heading, orange — before the figure", t: "text" },
      { k: "accentB", n: "Heading, orange — after the figure", t: "text" },
      { k: "panelTitle", n: "Panel title — after the 100", t: "text" },
      { k: "clientLabel", n: "Left toggle", t: "text" },
      { k: "clientRows", n: "Left toggle — the leaks it loses to", t: "list", of: [
        { k: "name", n: "Leak", t: "text" },
        { k: "loss", n: "Percent lost (a number)", t: "text" },
      ] },
      { k: "serverLabel", n: "Right toggle", t: "text" },
      { k: "serverRows", n: "Right toggle — the leaks it loses to", t: "list", of: [
        { k: "name", n: "Leak", t: "text" },
        { k: "loss", n: "Percent lost (a number)", t: "text" },
      ] },
      { k: "footLabel", n: "Label on the count", t: "text" },
      { k: "outOfLabel", n: "Words before the 100 in the count", t: "text" },
    ],
    d: {
      eyebrow: "Question 01, watch it break",
      headA: "Real Conversions.",
      accentA: "Only",
      accentB: "Reach The Platform.",
      panelTitle: "real conversions → how many reach the platform",
      clientLabel: "Your setup",
      clientRows: [
        { name: "Ad blockers", loss: "12" },
        { name: "Consent declined", loss: "14" },
        { name: "Cookie limits", loss: "14" },
        { name: "iOS window", loss: "10" },
      ],
      serverLabel: "Server side",
      serverRows: [
        { name: "Ad blockers", loss: "3" },
        { name: "Consent declined", loss: "4" },
        { name: "Cookie limits", loss: "2" },
        { name: "iOS window", loss: "1" },
      ],
      footLabel: "Arrived",
      outOfLabel: "out of",
    },
  },

  {
    key: "mistake",
    n: "The mistake",
    about: "The orange band — the claim on the left, the reasoning on the right.",
    fields: [
      { k: "label", n: "Small line above", t: "text" },
      { k: "headA", n: "Claim", t: "area" },
      { k: "bodyA", n: "First paragraph", t: "area" },
      { k: "bodyB", n: "Second paragraph", t: "area" },
    ],
    d: {
      label: "The mistake everyone makes",
      headA: "Buying A Tool Before Deciding What You Measure.",
      bodyA: "A tool is an instrument. A framework is a set of decisions about what gets measured, how often, and who has to act on it. Without the second one, the best attribution platform in the world produces interesting data that changes nothing about how you run the company.",
      bodyB: "So we start at the other end. What decision are you struggling to make, who makes it, and how often. Then we build backward until there is a number that answers it.",
    },
  },

  {
    key: "threereports",
    n: "Three reports",
    about: "The three report cards — who each one is for and the three lines it carries.",
    fields: [
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "reports", n: "Cards", t: "list", of: [
        { k: "who", n: "Who it is for", t: "text" },
        { k: "needs", n: "What they need", t: "text" },
        { k: "itemOne", n: "Line one", t: "text" },
        { k: "itemTwo", n: "Line two", t: "text" },
        { k: "itemThree", n: "Line three", t: "text" },
        { k: "image", n: "Artwork", t: "img" },
      ] },
      { k: "ctaText", n: "Button text", t: "text" },
      { k: "ctaHref", n: "Button link", t: "text" },
    ],
    d: {
      headA: "Three People,",
      accent: "Three Reports.",
      ctaText: "Have a look",
      ctaHref: "/our-work",
      reports: [
        {
          who: "Your media buyer",
          needs: "Needs granularity",
          itemOne: "Cost per qualified lead by creative",
          itemTwo: "Which angles are fatiguing",
          itemThree: "Search terms and negatives",
          image: OTHERS + "first-p.png",
        },
        {
          who: "You",
          needs: "Needs direction",
          itemOne: "Blended cost of acquisition",
          itemTwo: "Which channel deserves more next month",
          itemThree: "What to stop doing",
          image: OTHERS + "second-p.png",
        },
        {
          who: "Your CFO or board",
          needs: "Needs proof",
          itemOne: "Incremental revenue, not attributed",
          itemTwo: "Payback period by channel",
          itemThree: "Evidence a holdout test produced",
          image: OTHERS + "third-p.png",
        },
      ],
    },
  },

  {
    key: "audit",
    n: "Request an audit",
    about: "The closing ask, with the artwork running off the right edge behind it.",
    fields: [
      { k: "headA", n: "Heading", t: "area" },
      { k: "note", n: "Paragraph under it", t: "area" },
      { k: "ctaText", n: "Button text", t: "text" },
      { k: "art", n: "Artwork", t: "img" },
    ],
    d: {
      headA: "Start with one question you cannot answer.",
      note: "Tell us the decision you are stuck on. We will tell you whether it is a tracking problem, a modelling problem, or a question only a holdout test can settle.",
      ctaText: "Request an audit",
      art: OTHERS + "start-abt.png",
    },
  },

  /* The three bands every page closes with, taken from /sample's schema so
     they are described once rather than once per page. */
  borrow("soosocial"),
  borrow("faqform", { faqKey: "analytics-and-tracking" }),
  borrow("latestblogs"),
]);
