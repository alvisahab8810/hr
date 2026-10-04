// utils/pageSchemas/brand.js — /brand, described as data.
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
    about: "The title, the quote and the three figures under it.",
    fields: [
      { k: "title", n: "Title", t: "text" },
      { k: "quoteA", n: "Quote — first line", t: "text" },
      { k: "quoteB", n: "Quote — second line", t: "text" },
      { k: "attrib", n: "Said by", t: "text" },
      { k: "note", n: "Line under the quote", t: "text" },
      { k: "stats", n: "Figures", t: "list", of: [
        { k: "figure", n: "Figure", t: "text" },
        { k: "label", n: "What it is", t: "text" },
      ] },
    ],
    d: {
      title: "Brand",
      quoteA: "“Your brand is what people say about you when",
      quoteB: "you are not in the room.”",
      attrib: "Jeff Bezos",
      note: "Most businesses never find out what that is.",
      stats: [
        { figure: "10%", label: "of one software company's new signups now arrive from ChatGPT" },
        { figure: "40%", label: "lift in AI visibility from a named source over generic prose" },
        { figure: "4", label: "engines now answer instead of listing, each reading differently" },
      ],
    },
  },

  {
    key: "whyitmatters",
    n: "Why it matters",
    about: "Three cards on the light band under the hero.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "ctaText", n: "Button on every card", t: "text" },
      { k: "cards", n: "Cards", t: "list", of: [
        { k: "title", n: "Title", t: "text" },
        { k: "body", n: "Body", t: "area" },
        { k: "img", n: "Artwork", t: "img" },
        { k: "href", n: "Button link", t: "text" },
      ] },
    ],
    d: {
      eyebrow: "Why it matters",
      headA: "Brand Is Not A Design Exercise. It Is The Cheapest Way To Lower",
      accent: "What A Customer Costs You.",
      ctaText: "Have a look",
      cards: [
        {
          title: "Cheaper leads",
          body: "People who already know why you are worth choosing convert at a different rate. Same budget, lower cost per enquiry.",
          img: "/assets/others/img1.png",
          href: "/our-services/paid-media-marketing",
        },
        {
          title: "Higher prices",
          body: "When price is the first question, nothing else was given to decide on. Brand is what gives them something else.",
          img: "/assets/others/img2.png",
          href: "/our-services/brand-identity-design",
        },
        {
          title: "They come back",
          body: "Consistency across every touchpoint is what turns a buyer into someone who recommends you.",
          img: "/assets/others/img3.png",
          href: "/our-work",
        },
      ],
    },
  },

  {
    key: "brandsbuilt",
    n: "Brands we have built",
    about: "The three moving rows of work. Row two carries on through row one, reversed.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "rowOne", n: "Row one — slides", t: "list", of: [
        { k: "tall", n: "Tall image (one per slide)", t: "img" },
        { k: "stackA", n: "Or stacked — top", t: "img" },
        { k: "stackB", n: "Or stacked — bottom", t: "img" },
      ] },
      { k: "rowTwo", n: "Row two — slides", t: "list", of: [
        { k: "tall", n: "Tall image (one per slide)", t: "img" },
        { k: "stackA", n: "Or stacked — top", t: "img" },
        { k: "stackB", n: "Or stacked — bottom", t: "img" },
      ] },
      { k: "brands", n: "Row three — logos", t: "list", of: [
        { k: "img", n: "Tile", t: "img" },
      ] },
    ],
    d: {
      eyebrow: "The work",
      headA: "Brands We Have",
      accent: "Built.",
      rowOne: [
        { tall: "", stackA: "/assets/others/the-work/first-slider/little.png", stackB: "/assets/others/the-work/first-slider/little1.png" },
        { tall: "/assets/others/the-work/first-slider/tall.png", stackA: "", stackB: "" },
        { tall: "/assets/others/the-work/first-slider/tall1.png", stackA: "", stackB: "" },
        { tall: "", stackA: "/assets/others/the-work/first-slider/little2.png", stackB: "/assets/others/the-work/first-slider/little2.1.png" },
        { tall: "/assets/others/the-work/first-slider/tall2.png", stackA: "", stackB: "" },
        { tall: "/assets/others/the-work/first-slider/tall3.png", stackA: "", stackB: "" },
        { tall: "", stackA: "/assets/others/the-work/first-slider/little3.png", stackB: "/assets/others/the-work/first-slider/little31.png" },
        { tall: "/assets/others/the-work/first-slider/tall4.png", stackA: "", stackB: "" },
        { tall: "", stackA: "/assets/others/the-work/first-slider/little4.png", stackB: "/assets/others/the-work/first-slider/little4.1.png" },
      ],
      rowTwo: [
        { tall: "", stackA: "/assets/others/the-work/second-slider/little.png", stackB: "/assets/others/the-work/second-slider/little1.png" },
        { tall: "/assets/others/the-work/second-slider/tall.png", stackA: "", stackB: "" },
        { tall: "/assets/others/the-work/second-slider/tall1.png", stackA: "", stackB: "" },
        { tall: "", stackA: "/assets/others/the-work/second-slider/little2.png", stackB: "/assets/others/the-work/second-slider/little2.1.png" },
        { tall: "/assets/others/the-work/second-slider/tall2.png", stackA: "", stackB: "" },
      ],
      brands: Array.from({ length: 9 }, (_, i) => ({
        img: "/assets/others/the-work/brands/" + (i + 1) + ".png",
      })),
    },
  },

  {
    key: "howwesee",
    n: "How we see brand",
    about: "The two accordion columns — Direction and Expression.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "colOne", n: "Left column name", t: "text" },
      { k: "colTwo", n: "Right column name", t: "text" },
      { k: "direction", n: "Left column — panels", t: "list", of: [
        { k: "title", n: "Label", t: "text" },
        { k: "icon", n: "Icon", t: "img" },
        { k: "text", n: "Body", t: "area" },
      ] },
      { k: "expression", n: "Right column — panels", t: "list", of: [
        { k: "title", n: "Label", t: "text" },
        { k: "icon", n: "Icon", t: "img" },
        { k: "text", n: "Body", t: "area" },
      ] },
    ],
    d: {
      eyebrow: "How we see brand",
      headA: "Two Halves. Fourteen Decisions.",
      accent: "Nothing Decorative.",
      colOne: "Direction",
      colTwo: "Expression",
      direction: [
        { title: "Mission", icon: "/assets/others/icons/mission.svg", text: "What you actually do about the purpose, every day. The part a new hire can repeat on day one." },
        { title: "Audience", icon: "/assets/others/icons/audience.svg", text: "Who this is for, written tightly enough that it also says who it is not for." },
        { title: "Purpose", icon: "/assets/others/icons/purpose.svg", text: "Why the business exists past the revenue. The answer that survives a bad quarter." },
        { title: "Values", icon: "/assets/others/icons/values.svg", text: "The calls you make when the money points the other way. Anything else is wall art." },
        { title: "Competitors", icon: "/assets/others/icons/competitors.svg", text: "Who the customer actually compares you to, which is rarely the list you watch." },
        { title: "Difference", icon: "/assets/others/icons/difference.svg", text: "The one thing a rival cannot copy by Friday. Price and service are not it." },
        { title: "Vision", icon: "/assets/others/icons/vision.svg", text: "Where this ends up if the work keeps compounding. Near enough to aim at." },
      ],
      expression: [
        { title: "Name", icon: "/assets/others/icons/mission.svg", text: "What it is called, how it is said out loud, and what it stops you doing later." },
        { title: "Logo", icon: "/assets/others/icons/audience.svg", text: "The mark at the size it is used most, which is almost never the size it was drawn at." },
        { title: "Colour", icon: "/assets/others/icons/purpose.svg", text: "A range that holds up in print, on a phone at night, and against a competitor's." },
        { title: "Type", icon: "/assets/others/icons/values.svg", text: "The voice on the page. It carries more of the feel than the logo ever does." },
        { title: "Voice", icon: "/assets/others/icons/competitors.svg", text: "How it sounds in an ad, an invoice and an apology. The last one matters most." },
        { title: "Imagery", icon: "/assets/others/icons/difference.svg", text: "What gets photographed and what never does. The rule is worth more than the shoot." },
        { title: "System", icon: "/assets/others/icons/vision.svg", text: "The pieces written down so the next twenty assets look like the first three." },
      ],
    },
  },

  {
    key: "quoteband",
    n: "Quote band",
    about: "The one dark line between the two light sections.",
    fields: [
      { k: "lineA", n: "First line", t: "text" },
      { k: "accent", n: "First line — orange part", t: "text" },
      { k: "lineB", n: "Second line", t: "text" },
      { k: "lineC", n: "Third line", t: "text" },
    ],
    d: {
      lineA: "“Most agencies",
      accent: "start with the logo.",
      lineB: "That is why so much branding looks good",
      lineC: "and sells nothing”",
    },
  },

  {
    key: "havelook",
    n: "Have a look at our work",
    about: "The dark rail of case-study cards with two figures each.",
    fields: [
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "cards", n: "Cards", t: "list", of: [
        { k: "name", n: "Name", t: "text" },
        { k: "img", n: "Image", t: "img" },
        { k: "href", n: "Link", t: "text" },
        { k: "statOneValue", n: "Figure one", t: "text" },
        { k: "statOneLabel", n: "Figure one — what it is", t: "text" },
        { k: "statTwoValue", n: "Figure two", t: "text" },
        { k: "statTwoLabel", n: "Figure two — what it is", t: "text" },
      ] },
    ],
    d: {
      headA: "Brands",
      accent: " we have built.",
      cards: [
        { name: "Tourwatchout", img: "/assets/images/our-work/1.webp", href: "/our-work/tourwatchout", statOneValue: "+245%", statOneLabel: "Engagement", statTwoValue: "20%", statTwoLabel: "Revenue growth" },
        { name: "Ragee Makeup", img: "/assets/images/our-work/2.webp", href: "/our-work/ragee-makeup", statOneValue: "+245%", statOneLabel: "Engagement", statTwoValue: "20%", statTwoLabel: "Revenue growth" },
        { name: "Colomoto", img: "/assets/images/our-work/3.webp", href: "/our-work/colomoto", statOneValue: "+245%", statOneLabel: "Engagement", statTwoValue: "20%", statTwoLabel: "Revenue growth" },
        { name: "Sapphire Auditorium", img: "/assets/images/our-work/4.webp", href: "/our-work/sapphire-auditorium", statOneValue: "+245%", statOneLabel: "Engagement", statTwoValue: "20%", statTwoLabel: "Revenue growth" },
      ],
    },
  },

  {
    key: "whatwemake",
    n: "What we make",
    about: "The five phones. Each one turns through its own four formats.",
    fields: [
      { k: "eyebrow", n: "Small line above", t: "text" },
      { k: "headA", n: "Heading", t: "text" },
      { k: "accent", n: "Heading — orange part", t: "text" },
      { k: "phones", n: "Phones", t: "list", of: [
        { k: "image", n: "Phone image", t: "img" },
        { k: "titleOne", n: "Format one", t: "text" },
        { k: "titleTwo", n: "Format two", t: "text" },
        { k: "titleThree", n: "Format three", t: "text" },
        { k: "titleFour", n: "Format four", t: "text" },
      ] },
    ],
    d: {
      eyebrow: "What you get",
      headA: "Everything Your Team Needs",
      accent: " To Say The Same Thing.",
      phones: [
        { image: "/assets/others/the-work/social-content/phone1.png", titleOne: "Positioning statement", titleTwo: "Short Reels", titleThree: "Hook Tests", titleFour: "Culture Posts" },
        { image: "/assets/others/the-work/social-content/phone2.png", titleOne: "Competitor mapping", titleTwo: "Carousels", titleThree: "Quote Cards", titleFour: "Offer Creatives" },
        { image: "/assets/others/the-work/social-content/phone3.png", titleOne: "Brand voice guide", titleTwo: "Talking Head", titleThree: "Behind The Scenes", titleFour: "Opinion Posts" },
        { image: "/assets/others/the-work/social-content/phone4.png", titleOne: "Page copy", titleTwo: "Case Studies", titleThree: "Testimonials", titleFour: "Before And After" },
        { image: "/assets/others/the-work/social-content/phone5.png", titleOne: "Colour & type system", titleTwo: "Explainers", titleThree: "Feature Walkthrough", titleFour: "FAQ Answers" },
      ],
    },
  },

  // The bands /sample already describes, taken as they are so the page closes
  // the way every page on the site closes.
  borrow("soosocial"),
  borrow("faqform", { faqKey: "brand" }),
  borrow("latestblogs"),
]);
