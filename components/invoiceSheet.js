// components/invoiceSheet.js — the tax invoice exactly as it prints.
//
// This is the only place the invoice is laid out. The screen preview, the
// browser's Save-as-PDF and the PDF that goes out by mail all render this same
// markup, so the three can never drift again -- which is what happened while
// the sheet existed once as HTML and once as a stack of jsPDF calls.
//
// It is a pure function on purpose: the company block and the terms come in as
// arguments rather than from a module the renderer mutates, because the mail
// path has no browser to have run Settings through first.
//
// The geometry is A4 at 96dpi (794 x 1123px), so a px here is a px on the page
// and the numbers below are the ones measured off the design.
import { fmtD, sacFor } from "@/utils/leadsMeta";
import { docItems } from "@/utils/proposalItems";
import { invoiceNo } from "@/utils/invoiceNo";

const esc = (v) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// The design writes every figure to two decimals, so the sheet does its own
// formatting rather than borrowing the board's whole-rupee inr().
const money = (n) =>
  Number(Math.round(Number(n) || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rupee = (n) => `₹ ${money(n)}`;

// Every invoice has to carry the registered details, whether or not anybody
// has been into Settings yet -- a tax invoice without the legal name, the
// address and the GSTIN is not a tax invoice. So these are the floor the sheet
// falls back to, and anything filled in under Settings overrides them. The
// bank account is deliberately not here: an account number belongs in the
// database the admin fills in, not in a file that is committed.
export const COMPANY_FALLBACK = {
  name: "Viralon",
  legalName: "Viralon Digital Services LLP",
  tradeName: "Viralon",
  email: "info@viralon.in",
  site: "www.viralon.in",
  phone: "9305451301",
  address: "GF, Unit no.-1, Tower 2, Parsvnath Planet, Gomti Nagar, Lucknow-226010",
  place: "Lucknow, Uttar Pradesh",
  state: "Uttar Pradesh",
  gstin: "09AAVFV6664JIZ3",
};

// Where the artwork is served from in a browser. The mail path hands in data
// URIs instead, because a headless render has no site to fetch them from.
export const SHEET_ASSETS = {
  mark: "/assets/images/viralon-mark.svg",
  sign: "/assets/images/signature.svg",
  qr: "/assets/images/qr.svg",
};

// Same state as ours means the tax is split CGST + SGST; anywhere else in
// India means one IGST line. Place of supply decides it, so a bill with no
// state on it is treated as local rather than guessed at.
function taxSplit(co, d) {
  const ours = String(co.state || co.place || "").split(",").pop().trim().toLowerCase();
  const theirs = String(d?.billTo?.state || "").trim().toLowerCase();
  if (!ours || !theirs) return "intra";
  return ours === theirs ? "intra" : "inter";
}

const row = (k, v) =>
  `<div class="vi-row"><span class="vi-k">${esc(k)}</span><span class="vi-c">:</span><span class="vi-v">${v}</span></div>`;

export function invoiceHtml(d, { company = {}, terms = [], assets = SHEET_ASSETS } = {}) {
  // A blank in Settings must not blank out the sheet, so only values that were
  // actually filled in override the fallback above.
  const co = { ...COMPANY_FALLBACK };
  for (const [k, v] of Object.entries(company || {})) if (v) co[k] = v;
  const b = d.billTo || {};

  const gross = Math.round(Number(d.amount || 0) + Number(d.discAmt || 0));
  const disc = Math.round(Number(d.discAmt || 0));
  const net = gross - disc;
  const gst = Math.round((net * Number(d.gstPct || 0)) / 100);
  const half = Math.round(gst / 2);
  const total = net + gst;
  const paid = (d.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0);
  const split = taxSplit(co, d);

  // The design prints four columns, so the quantity rides along in the
  // description rather than taking a fifth. It is only shown when it is more
  // than one, which is the only case where unit price and taxable value differ
  // and the arithmetic would otherwise look wrong.
  const lines = docItems(d).map((it) => {
    const qty = Math.max(1, Number(it.qty || 1));
    const amount = Math.round(Number(it.amount || 0));
    const rate = Math.round(Number(it.rate || 0)) || Math.round(amount / qty);
    return { svc: it.svc || "Service", note: it.note || "", hsn: it.hsn || sacFor(it.svc), qty, rate, amount };
  });

  // Our own box leads with the registered name and the address, the way a
  // letterhead does; the rest is the tax detail a buyer's accounts team looks
  // for. The header above carries the logo and nothing else, so this is the
  // only place our details appear.
  // The registered address already ends in a city and a pincode, so the place
  // is only there for an install that never filled the address in.
  const usAddr = co.address || co.place || "";
  const partyUs = [
    co.tradeName ? row("Trade Name", esc(co.tradeName)) : "",
    co.email ? row("Email", esc(co.email)) : "",
    co.phone ? row("Contact", esc(co.phone)) : "",
    co.gstin ? row("GSTIN", esc(co.gstin)) : "",
    co.pan ? row("PAN", esc(co.pan)) : "",
  ].filter(Boolean).join("");

  const themAddr = [b.address, [b.city, b.pincode].filter(Boolean).join("-")].filter(Boolean).join(", ");
  // The place of supply reads as the town and the state it is in, the way the
  // design writes it: "Lucknow (UP)".
  const supply = [b.city, b.state].filter(Boolean).join(" · ") ? (b.city && b.state ? `${b.city} (${b.state})` : b.city || b.state) : "";
  const partyThem = [
    d.contact && d.contact !== d.co ? row("Contact person", esc(d.contact)) : "",
    d.em ? row("Email", esc(d.em)) : "",
    d.ph ? row("Contact", esc(d.ph)) : "",
    supply ? row("Place of supply", esc(supply)) : "",
    b.gstin ? row("GSTIN", esc(b.gstin)) : "",
    d.poRef ? row("PO / Ref", esc(d.poRef)) : "",
  ].filter(Boolean).join("");

  const totals = [
    ["Sub Total", rupee(gross)],
    ...(disc ? [[`Discount (${d.discPct || 0}%)`, `− ${rupee(disc)}`]] : []),
    ...(split === "intra"
      ? [[`CGST (${Number(d.gstPct || 0) / 2}%)`, rupee(half)], [`SGST (${Number(d.gstPct || 0) / 2}%)`, rupee(gst - half)]]
      : [[`IGST (${Number(d.gstPct || 0)}%)`, rupee(gst)]]),
  ];

  const bank = [
    co.bankName ? row("Bank Name", esc(co.bankName)) : "",
    co.accountName ? row("Account Holder Name", esc(co.accountName)) : "",
    co.accountNo ? row("Account Number", esc(co.accountNo)) : "",
    co.ifsc ? row("IFSC", esc(co.ifsc)) : "",
    co.upi ? row("UPI", esc(co.upi)) : "",
  ].filter(Boolean).join("");

  // The code to scan is part of the design, so the artwork that ships with the
  // sheet stands in until Settings is given one of its own.
  const qr = co.qr || assets.qr || "";

  const list = Array.isArray(terms) && terms.length ? terms : [];

  return `
<div class="vi-sheet">
  <div class="vi-head">
    ${assets.mark ? `<img class="vi-mark" src="${assets.mark}" alt=""/>` : ""}
    <div class="vi-titlewrap">
      <div class="vi-titleblock">
        <div class="vi-title">${co.gstin ? "Tax Invoice" : "Invoice"}</div>
        <div class="vi-titlerule"></div>
        <div class="vi-meta">
        <div class="vi-mrow"><span>Invoice No.</span><b>${esc(invoiceNo(d))}</b></div>
        <div class="vi-mrow"><span>Invoice Date</span><b>${esc(fmtD(d.issued))}</b></div>
          ${d.due ? `<div class="vi-mrow"><span>Due Date</span><b>${esc(fmtD(d.due))}</b></div>` : ""}
        </div>
      </div>
    </div>
  </div>

  <div class="vi-parties">
    <div class="vi-party">
      <div class="vi-pname">${esc(co.legalName || co.name || "")}</div>
      ${usAddr ? `<div class="vi-paddr">${esc(usAddr)}</div>` : ""}
      ${partyUs}
    </div>
    <div class="vi-party">
      <div class="vi-plabel">Bill To</div>
      <div class="vi-pname">${esc(d.co || d.contact || "—")}</div>
      ${themAddr ? `<div class="vi-paddr">${esc(themAddr)}</div>` : ""}
      ${partyThem}
    </div>
  </div>

  <table class="vi-items">
    <thead>
      <tr>
        <th class="vi-cdesc">Description</th>
        <th class="vi-csac">SAC Code</th>
        <th class="vi-cnum">Unit Price</th>
        <th class="vi-cnum">Taxable Value</th>
      </tr>
    </thead>
    <tbody>
      ${lines.map((l) => `
      <tr>
        <td>
          <div class="vi-isvc">${esc(l.svc)}${l.qty > 1 ? ` <span class="vi-iqty">× ${l.qty}</span>` : ""}</div>
          ${l.note ? `<div class="vi-inote">${esc(l.note)}</div>` : ""}
        </td>
        <td class="vi-csac">${esc(l.hsn)}</td>
        <td class="vi-cnum vi-soft">${esc(money(l.rate))}</td>
        <td class="vi-cnum vi-hard">${esc(money(l.amount))}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="vi-sumwrap">
    <div class="vi-sum">
      ${totals.map(([k, v]) => `<div class="vi-sumrow"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}
      <div class="vi-rule"></div>
      <div class="vi-sumrow vi-grand"><span>Grand Total</span><span>${esc(rupee(total))}</span></div>
      ${paid ? `
      <div class="vi-sumrow"><span>Received</span><span>${esc(rupee(paid))}</span></div>
      <div class="vi-sumrow vi-due"><span>Balance Due</span><span>${esc(rupee(Math.max(0, total - paid)))}</span></div>` : ""}
    </div>
  </div>

  ${d.notes ? `<div class="vi-notes"><div class="vi-plabel">Notes</div>${esc(d.notes)}</div>` : ""}

  <div class="vi-spacer"></div>

  <div class="vi-foot">
    ${bank ? `
    <div class="vi-bankcard">
      <div class="vi-banktitle">Bank Account Details</div>
      <div class="vi-bankcols">
        <div class="vi-bankrows">${bank}</div>
        ${qr ? `<div class="vi-qrwrap">
          <div class="vi-scan">Scan to pay</div>
          <img class="vi-qrimg" src="${esc(qr)}" alt=""/>
        </div>` : ""}
      </div>
    </div>` : "<div></div>"}
    <div class="vi-signwrap">
      ${assets.sign ? `<img class="vi-sign" src="${assets.sign}" alt=""/>` : `<div class="vi-signgap"></div>`}
      <div class="vi-cap">( ${esc(co.signatory || "PARTNER")} )</div>
      <div class="vi-for">For ${esc(co.legalName || co.name || "")}</div>
    </div>
  </div>

  ${list.length ? `
  <div class="vi-band">
    <div class="vi-bandlabel">Terms and Conditions</div>
    <ol class="vi-bandlist">${list.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
    <div class="vi-bandfoot">This is a computer generated invoice.${co.site ? ` ${esc(co.site)}` : ""}</div>
  </div>` : ""}
</div>`;
}

// One stylesheet for all three render paths. Inter is named first and the
// system stack carries it where Inter is not installed -- nothing here fetches
// a webfont, because the mail render happens with no network and a request
// that hangs would hold the PDF up.
// The design is drawn in Inter, so the sheet carries its own copy rather than
// hoping the reader has it: a PDF rendered on a server has no system fonts to
// fall back on worth the name. One variable file covers every weight used here,
// and the PDF path swaps this URL for the bytes inlined.
export const INVOICE_FONTS = {
  latin: "/assets/fonts/inter-latin.woff2",
  // Google's latin subset stops at the euro, so the rupee the totals are
  // priced in would drop out of Inter and be drawn by whatever the reader has.
  rupee: "/assets/fonts/inter-rupee.woff2",
};

export const INVOICE_CSS = `
@font-face { font-family:"Inter"; font-style:normal; font-weight:100 900; font-display:block;
  src:url("${INVOICE_FONTS.latin}") format("woff2");
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family:"Inter"; font-style:normal; font-weight:100 900; font-display:block;
  src:url("${INVOICE_FONTS.rupee}") format("woff2"); unicode-range:U+20B9; }

.vi-sheet { background:#fff; box-sizing:border-box; color:#1A1A1A; display:flex; flex-direction:column;
  font-family: Inter, "Segoe UI", Roboto, -apple-system, Helvetica, Arial, sans-serif;
  font-size:11px; line-height:1.5; min-height:1123px; padding:46px; width:794px; }
.vi-sheet * { box-sizing:border-box; }

/* The header carries the mark and the title only — every word about who we
   are belongs in the box below, where the buyer's accounts team looks for it. */
.vi-head { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; }
.vi-mark { display:block; height:76.8px; width:84px; }
.vi-titlewrap { text-align:right; }
.vi-title { color:#FE4601; font-size:26.4px; font-weight:900; letter-spacing:-.01em; line-height:32px; }
.vi-titleblock { display:inline-block; min-width:158px; text-align:left; }
.vi-titlerule { background:#FE4601; height:2px; margin:8px 0 10px; width:100%; }
.vi-meta { }
.vi-mrow { display:flex; font-size:9.5px; gap:10px; justify-content:space-between; padding:1.5px 0; }
.vi-mrow span { color:#6B7280; }
.vi-mrow b { color:#1A1A1A; font-weight:700; }

.vi-row { display:flex; font-size:10px; gap:4px; line-height:1.9; }
.vi-k { color:#6B7280; flex:0 0 104px; }
.vi-c { color:#6B7280; }
.vi-v { color:#000000; flex:1; }

.vi-parties { display:flex; gap:16px; margin-top:28px; }
.vi-party { background:#F9F9F9; border:1px solid #DFDFDF; border-radius:10px; flex:1 1 0;
  padding:18px 18px 16px; }
.vi-plabel { color:#FE4601; font-size:9.5px; font-weight:800; letter-spacing:.08em;
  margin-bottom:9px; text-transform:uppercase; }
.vi-pname { color:#1A1A1A; font-size:13.5px; font-weight:800; line-height:1.3; }
.vi-paddr { color:#000000; font-size:10px; line-height:1.55; margin:7px 0 13px; }

.vi-items { border-collapse:separate; border-spacing:0; margin-top:26px; table-layout:fixed; width:100%; }
.vi-items th { background:#FE4601; color:#fff; font-size:10.5px; font-weight:700;
  padding:11px 14px; text-align:left; }
.vi-items th:first-child { border-radius:6px 0 0 6px; }
.vi-items th:last-child { border-radius:0 6px 6px 0; }
.vi-items td { border-bottom:1px solid #E7E7E7; padding:13px 14px; vertical-align:top; }
.vi-items .vi-csac { width:104px; }
.vi-items th.vi-cnum, .vi-items td.vi-cnum { text-align:right; width:118px; }
.vi-items td.vi-csac, .vi-items td.vi-soft { color:#6B7280; }
.vi-items td.vi-hard { color:#1A1A1A; font-weight:700; }
.vi-isvc { font-size:12px; font-weight:700; }
.vi-iqty { color:#6B7280; font-weight:600; }
.vi-inote { color:#6B7280; font-size:10px; margin-top:3px; }

.vi-sumwrap { display:flex; justify-content:flex-end; margin-top:18px; }
.vi-sum { width:300px; }
.vi-sumrow { display:flex; font-size:11px; justify-content:space-between; padding:6px 0; }
.vi-sumrow span:first-child { color:#6B7280; }
.vi-sumrow span:last-child { font-weight:700; }
.vi-rule { background:#E7E7E7; height:1px; margin:8px 0; }
.vi-grand { font-size:14px; font-weight:800; }
.vi-grand span:first-child { color:#1A1A1A; font-weight:800; }
.vi-grand span:last-child { font-weight:800; }
.vi-due span { color:#FE4601; }

.vi-notes { color:#6B7280; font-size:10px; line-height:1.6; margin-top:22px; white-space:pre-wrap; }

.vi-signwrap { flex:0 0 auto; text-align:center; width:168px; }
.vi-sign { display:block; height:61px; margin:0 auto; width:140px; }
.vi-signgap { height:61px; }
.vi-cap { color:#FE4601; font-size:9px; font-weight:800; letter-spacing:.04em; margin-top:4px; }
.vi-for { color:#1A1A1A; font-size:10px; font-weight:700; margin-top:3px; }

/* The design pays the bank block and the signature off against each other on
   the white of the page, and keeps the tinted band underneath for the terms
   alone. The spacer eats whatever room is left above so the band always sits
   on the bottom edge, and the negative margins undo the sheet padding. */
.vi-spacer { flex:1 1 auto; min-height:28px; }

/* The design measures this row: a 368px card, 14.4px of gap and the signature
   block beside it, every line in that block centred on the signature itself. */
.vi-foot { align-items:center; display:flex; gap:14.4px; justify-content:space-between;
  margin-bottom:22px; }
.vi-bankcard { background:#F9F9F9; border:1px solid #DFDFDF; border-radius:8px; flex:0 0 368px;
  padding:12px 14px 13px; width:368px; }
.vi-banktitle { color:#1A1A1A; font-size:10px; font-weight:800; margin-bottom:8px; }
.vi-qrwrap { flex:0 0 auto; text-align:center; }
.vi-scan { color:#FE4601; font-size:9.5px; font-weight:800; margin-bottom:5px; }
.vi-bankcols { align-items:center; display:flex; gap:14px; }
.vi-bankcard .vi-k { flex:0 0 108px; }
.vi-bankcard .vi-v { font-weight:700; }
.vi-qrimg { display:block; height:64px; margin:0 auto; width:64px; }

.vi-band { background:#FFF1EB; margin:0 -46px -46px; padding:16px 46px 20px;
  width:calc(100% + 92px); }
.vi-bandlabel { color:#FE4601; font-size:9.5px; font-weight:800; letter-spacing:.04em;
  margin-bottom:6px; }
.vi-bandlist { color:#1A1A1A; font-size:9.5px; line-height:1.8; margin:0; padding-left:14px; }
.vi-bandfoot { color:#6B7280; font-size:9px; margin-top:12px; }

@media print {
  @page { size:A4; margin:0; }
  .vi-sheet { box-shadow:none; }
}
`;
