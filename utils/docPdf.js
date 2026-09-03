// utils/docPdf.js — the proposal / agreement / invoice as a real PDF, built on
// the server with jsPDF (already a dependency, and it needs no browser, so it
// works the same on the box as it does here).
import { jsPDF } from "jspdf";

const COMPANY = {
  name: "Viralon",
  tag: "Digital marketing, built to perform",
  email: "info@viralon.in",
  site: "www.viralon.in",
  place: "Pune, Maharashtra",
};

const INDIGO = [67, 56, 202];
const INK = [15, 23, 42];
const GREY = [100, 116, 139];
const LINE = [230, 230, 245];

const M = 16;             // page margin, mm
const W = 210;            // A4 width
const RIGHT = W - M;

const money = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const short = (id) => String(id || "").slice(-4).toUpperCase();
const dstr = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x) ? String(d) : x.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

function makeDoc() {
  const doc = new jsPDF("p", "mm", "a4");
  const st = { y: M };

  const room = (need) => {
    if (st.y + need > 285) { doc.addPage(); st.y = M; }
  };
  const set = (size, bold, colour) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...(colour || INK));
  };
  const text = (t, x, opts) => doc.text(String(t == null ? "" : t), x, st.y, opts);
  const rule = (gap = 4) => {
    st.y += gap;
    doc.setDrawColor(...LINE);
    doc.line(M, st.y, RIGHT, st.y);
    st.y += gap;
  };
  const para = (t, size = 9.5, colour = GREY, lead = 4.6) => {
    set(size, false, colour);
    const lines = doc.splitTextToSize(String(t || ""), RIGHT - M);
    for (const ln of lines) { room(6); doc.text(ln, M, st.y); st.y += lead; }
  };

  return { doc, st, room, set, text, rule, para };
}

/* The band at the top: who is sending it, what it is, and its numbers. */
function head(k, title, meta) {
  const { doc, st, set } = k;
  set(20, true, INDIGO);
  doc.text(COMPANY.name, M, st.y + 5);
  set(8.5, false, GREY);
  doc.text(COMPANY.tag, M, st.y + 10);
  doc.text(`${COMPANY.email}  ·  ${COMPANY.site}`, M, st.y + 15);
  doc.text(COMPANY.place, M, st.y + 19.5);

  set(17, true, INK);
  doc.text(title, RIGHT, st.y + 5, { align: "right" });
  set(8.5, false, GREY);
  let y = st.y + 11;
  for (const [a, b] of meta) {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...GREY);
    doc.text(String(a), RIGHT - 34, y, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setTextColor(...INK);
    doc.text(String(b), RIGHT, y, { align: "right" });
    y += 4.6;
  }
  st.y = Math.max(st.y + 24, y) + 2;
  k.rule(3);
}

function party(k, label, name, lines) {
  const { doc, st, set } = k;
  set(8, true, GREY);
  doc.text(label.toUpperCase(), M, st.y);
  st.y += 5;
  set(12, true, INK);
  doc.text(name || "—", M, st.y);
  st.y += 5;
  set(9, false, GREY);
  for (const l of (lines || []).filter(Boolean)) { doc.text(String(l), M, st.y); st.y += 4.4; }
  st.y += 3;
}

/* One line of "what is being bought", with the value on the right. */
function itemBar(k, left, mid, right) {
  const { doc, st, set } = k;
  doc.setFillColor(238, 242, 255);
  doc.rect(M, st.y, RIGHT - M, 9, "F");
  set(8, true, INDIGO);
  doc.text("ENGAGEMENT", M + 3, st.y + 6);
  doc.text("VALUE", RIGHT - 3, st.y + 6, { align: "right" });
  st.y += 13;
  set(11, true, INK);
  doc.text(String(left || "—"), M + 3, st.y);
  doc.text(String(right || ""), RIGHT - 3, st.y, { align: "right" });
  st.y += 5;
  set(9, false, GREY);
  doc.text(String(mid || ""), M + 3, st.y);
  st.y += 4;
  k.rule(4);
}

function kvTable(k, rows, grandRow) {
  const { doc, st, set } = k;
  for (const [a, b] of rows) {
    k.room(8);
    set(9.5, false, GREY);
    doc.text(String(a), M + 3, st.y);
    set(9.5, true, INK);
    doc.text(String(b), RIGHT - 3, st.y, { align: "right" });
    st.y += 6;
  }
  if (grandRow) {
    k.room(12);
    doc.setFillColor(238, 242, 255);
    doc.rect(M, st.y - 5, RIGHT - M, 10, "F");
    set(11, true, INDIGO);
    doc.text(String(grandRow[0]), M + 3, st.y + 1.5);
    doc.text(String(grandRow[1]), RIGHT - 3, st.y + 1.5, { align: "right" });
    st.y += 11;
  }
}

function clauseList(k, clauses) {
  const { doc, st, set } = k;
  k.room(12);
  set(8, true, GREY);
  doc.text("TERMS OF ENGAGEMENT", M, st.y);
  st.y += 6;
  clauses.forEach((c, i) => {
    k.room(14);
    set(9.5, true, INK);
    doc.text(`${i + 1}. ${c.h || ""}`, M, st.y);
    st.y += 4.6;
    set(9, false, GREY);
    const lines = doc.splitTextToSize(String(c.t || ""), RIGHT - M - 4);
    for (const ln of lines) { k.room(6); doc.text(ln, M + 4, st.y); st.y += 4.4; }
    st.y += 2.5;
  });
}

function signatures(k, left, right) {
  const { doc, st, set } = k;
  k.room(34);
  st.y += 12;
  const half = (RIGHT - M - 10) / 2;
  doc.setDrawColor(148, 163, 184);
  doc.line(M, st.y, M + half, st.y);
  doc.line(M + half + 10, st.y, RIGHT, st.y);
  st.y += 5;
  set(8.5, false, GREY);
  doc.text(left, M, st.y);
  doc.text(right, M + half + 10, st.y);
  st.y += 4.4;
  doc.text("Name, signature and date", M, st.y);
  doc.text("Name, signature and date", M + half + 10, st.y);
  st.y += 6;
}

function foot(k, note) {
  const { doc, st, set } = k;
  k.room(14);
  k.rule(4);
  set(8.5, true, GREY);
  doc.text(note, M, st.y);
}

/* ── the three documents ─────────────────────────────────────────────────── */

function proposalPdf(p) {
  const k = makeDoc();
  const months = Number(p.months || 1);
  const term = `${p.term || "Retainer"}${p.term === "Retainer" && months > 1 ? ` — ${months} months` : ""}`;
  const adv = Math.round(((p.amount || 0) * (p.advPct || 0)) / 100);

  head(k, "Proposal", [
    ["Proposal no.", `VP-${short(p._id)}`],
    ["Date", dstr(p.sent || p.createdAt || new Date())],
    ["Valid till", p.validTill ? dstr(p.validTill) : "—"],
  ]);
  party(k, "Prepared for", p.co || p.contact || "—", [p.contact, p.em, p.ph]);
  itemBar(k, p.svc || "Service", term, money(p.amount));
  kvTable(
    k,
    [
      ["Payment term", term],
      ...(p.advPct ? [[`Advance (${p.advPct}%)`, money(adv)], ["Balance, as invoiced", money((p.amount || 0) - adv)]] : []),
      ...(p.owner ? [["Your point of contact", p.owner]] : []),
    ],
    ["Total value", money(p.amount)]
  );
  if (p.notes) {
    k.st.y += 2;
    k.set(8, true, GREY); k.doc.text("NOTES", M, k.st.y); k.st.y += 5;
    k.para(p.notes);
  }
  foot(k, "All figures are exclusive of applicable taxes. Reply to this mail to accept.");
  return k.doc;
}

function agreementPdf(p) {
  const k = makeDoc();
  const g = p.agreement || {};
  const months = Number(p.months || 1);
  const term = `${p.term || "Retainer"}${p.term === "Retainer" && months > 1 ? ` — ${months} months` : ""}`;

  head(k, g.title || "Agreement", [
    ["Agreement no.", `VA-${short(p._id)}`],
    ["Proposal no.", `VP-${short(p._id)}`],
    ["Date", dstr(g.sentOn || g.createdOn || new Date())],
    ...(g.startDate ? [["Starts on", dstr(g.startDate)]] : []),
    ...(g.endDate ? [["Ends on", dstr(g.endDate)]] : []),
  ]);
  party(k, "Between", COMPANY.name, [COMPANY.place, COMPANY.email]);
  party(k, "And", p.co || p.contact || "—", [p.contact, p.em, p.ph]);
  itemBar(k, p.svc || "Service", term, money(p.amount));
  clauseList(k, (g.clauses && g.clauses.length ? g.clauses : defaultClauses(p)));
  if (g.note) {
    k.st.y += 2;
    k.set(8, true, GREY); k.doc.text("NOTE", M, k.st.y); k.st.y += 5;
    k.para(g.note);
  }
  signatures(k, `For ${COMPANY.name}${p.owner ? ` · ${p.owner}` : ""}`, `For ${p.co || "the client"}${p.contact ? ` · ${p.contact}` : ""}`);
  foot(k, "Signed in two counterparts, one for each side.");
  return k.doc;
}

function invoicePdf(inv) {
  const k = makeDoc();
  const gst = Math.round(((inv.amount || 0) * (inv.gstPct || 0)) / 100);
  const total = Math.round(inv.amount || 0) + gst;

  head(k, "Invoice", [
    ["Invoice no.", `INV-${short(inv._id)}`],
    ["Issued", inv.issued ? dstr(inv.issued) : dstr(new Date())],
    ["Due by", inv.due ? dstr(inv.due) : "—"],
    ["Status", inv.status || "Sent"],
  ]);
  party(k, "Billed to", inv.co || inv.contact || "—", [inv.contact, inv.em, inv.ph]);
  itemBar(k, inv.svc || "Service", inv.kind || "Invoice", money(inv.amount));
  const paid = (inv.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0);
  const left = Math.max(0, total - paid);
  kvTable(
    k,
    [
      ["Amount", money(inv.amount)],
      ...(inv.gstPct ? [[`GST (${inv.gstPct}%)`, money(gst)]] : []),
      ["Invoice total", money(total)],
      ...(paid ? [["Received so far", money(paid)]] : []),
    ],
    left > 0 ? ["Balance due", money(left)] : ["Paid in full", money(total)]
  );

  if ((inv.payments || []).length) {
    k.st.y += 3;
    k.set(8, true, GREY); k.doc.text("PAYMENTS RECEIVED", M, k.st.y); k.st.y += 5;
    k.set(9, false);
    for (const p of inv.payments) {
      k.room(6);
      const bits = [dstr(p.on), p.method || "", p.ref ? `Ref ${p.ref}` : ""].filter(Boolean).join("  ·  ");
      k.doc.text(bits, M, k.st.y);
      k.doc.text(money(p.amount), W - M, k.st.y, { align: "right" });
      k.st.y += 5.5;
    }
    k.st.y += 2;
  }
  if (inv.notes) {
    k.st.y += 2;
    k.set(8, true, GREY); k.doc.text("NOTES", M, k.st.y); k.st.y += 5;
    k.para(inv.notes);
  }
  foot(k, "Please quote the invoice number with the transfer.");
  return k.doc;
}

/* The standard clauses, kept here so a draft with none still prints properly. */
export function defaultClauses(d) {
  const adv = Math.round(((d.amount || 0) * (d.advPct || 0)) / 100);
  const months = Number(d.months || 1);
  const term = `${d.term || "Retainer"}${d.term === "Retainer" && months > 1 ? ` — ${months} months` : ""}`;
  return [
    { h: "Scope of work", t: `${COMPANY.name} will deliver ${d.svc || "the services"} as set out in proposal VP-${short(d._id)}, for ${term.toLowerCase()}.` },
    { h: "Fees", t: `The total value of this engagement is ${money(d.amount)}${d.advPct ? `, of which ${d.advPct}% (${money(adv)}) is payable in advance and the balance of ${money((d.amount || 0) - adv)} as invoiced` : ", payable as invoiced"}. All figures are exclusive of applicable taxes.` },
    { h: "Term", t: `This agreement starts on the date signed below and runs for ${months > 1 ? `${months} months` : "the duration of the work described above"}, unless ended earlier under the clauses below.` },
    { h: "Client's part", t: "The client will provide the access, approvals, brand material and information the work needs, and will nominate one person to sign work off." },
    { h: "Confidentiality", t: "Both sides will keep the other's business information private and will not share it with anyone outside this engagement." },
    { h: "Ownership", t: "Once the invoices for a piece of work are paid in full, the work delivered belongs to the client. Tools, templates and know-how remain ours." },
    { h: "Ending it", t: "Either side may end this agreement with 30 days' written notice. Work already delivered, and the current month's fee, remain payable." },
    { h: "Governing law", t: "This agreement is governed by the laws of India, and the courts of the company's registered place have jurisdiction." },
  ];
}

export function docPdf(kind, doc) {
  const d = kind === "agreement" ? agreementPdf(doc) : kind === "invoice" ? invoicePdf(doc) : proposalPdf(doc);
  return Buffer.from(d.output("arraybuffer"));
}

// A failed render must never stop the mail going out.
export function docAttachment(kind, doc, filename) {
  try {
    return [{ filename, content: docPdf(kind, doc), contentType: "application/pdf" }];
  } catch (e) {
    console.error("pdf render:", e?.message);
    return [];
  }
}
