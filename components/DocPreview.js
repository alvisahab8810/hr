// components/DocPreview.js — the printable face of a CRM document.
//
// One component for both papers the CRM sends out: an invoice and a proposal.
// It renders the sheet as it will print, and "Save as PDF" hands the same
// markup to a clean window and calls print — no PDF library, no new dependency,
// and the browser's own Save-as-PDF does the rest.
import { inr, fmtD } from "@/utils/leadsMeta";

// Mutable on purpose: Settings pushes the saved branding in through
// applyDocBranding before anything is printed.
const COMPANY = {
  name: "Viralon",
  tag: "Digital marketing, built to perform",
  email: "info@viralon.in",
  site: "www.viralon.in",
  place: "Pune, Maharashtra",
};

// Settings → Documents writes here. Blank values are ignored so the sheet
// never prints an empty header.
export function applyDocBranding(company, terms) {
  if (company) {
    for (const k of Object.keys(COMPANY)) {
      if (company[k]) COMPANY[k] = company[k];
    }
    COMPANY.gstin = company.gstin || "";
    COMPANY.bankLine = [company.bank, company.ifsc].filter(Boolean).join(" · ");
    COMPANY.upi = company.upi || "";
  }
  if (Array.isArray(terms) && terms.length) TERMS.splice(0, TERMS.length, ...terms);
}

const esc = (v) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const TERMS = [
  "Payment is due by the date on this document unless agreed otherwise in writing.",
  "Overdue amounts carry a late fee of 2% per month.",
  "Work outside the agreed scope is quoted and billed separately.",
  "Timelines start once content, approvals and the advance are received.",
  "Deliverables transfer on full payment; Viralon may show the work in its portfolio.",
  "Disputes are settled amicably; jurisdiction is Pune, Maharashtra.",
];

/* The service agreement raised off an accepted proposal: the same brand head,
   then the terms of engagement and two places to sign. Everything on it comes
   from the proposal, so nothing has to be typed twice. */
function agreementHtml(d) {
  const code = `VA-${String(d._id || "").slice(-4).toUpperCase()}`;
  const adv = Math.round(((d.amount || 0) * (d.advPct || 0)) / 100);
  const term = `${d.term || "Retainer"}${d.term === "Retainer" && d.months ? ` — ${d.months} months` : ""}`;
  const meta = [
    ["Agreement no.", code],
    ["Date", fmtD(d.agreement?.sentOn || new Date())],
    ["Proposal no.", `VP-${String(d._id || "").slice(-4).toUpperCase()}`],
    ["Status", d.agreement?.status || "Not sent"],
  ];
  const clauses = [
    [`Scope of work`, `${COMPANY.name} will deliver ${d.svc || "the services"} as set out in proposal ${`VP-${String(d._id || "").slice(-4).toUpperCase()}`}, for ${term.toLowerCase()}.`],
    ["Fees", `The total value of this engagement is ${inr(d.amount || 0)}${d.advPct ? `, of which ${d.advPct}% (${inr(adv)}) is payable in advance and the balance of ${inr((d.amount || 0) - adv)} as invoiced` : ", payable as invoiced"}. All figures are exclusive of applicable taxes.`],
    ["Term", `This agreement starts on the date signed below and runs for ${d.term === "Retainer" && d.months ? `${d.months} months` : "the duration of the work described above"}, unless ended earlier under the clauses below.`],
    ["Client's part", "The client will provide the access, approvals, brand material and information the work needs, and will nominate one person to sign work off."],
    ["Confidentiality", "Both sides will keep the other's business information private and will not share it with anyone outside this engagement."],
    ["Ownership", "Once the invoices for a piece of work are paid in full, the work delivered belongs to the client. Tools, templates and know-how remain ours."],
    ["Ending it", "Either side may end this agreement with 30 days' written notice. Work already delivered, and the current month's fee, remain payable."],
    ["Governing law", "This agreement is governed by the laws of India, and the courts of the company's registered place have jurisdiction."],
  ];

  return `
<div class="vp-sheet">
  <div class="vp-top">
    <div>
      <div class="vp-logo">${esc(COMPANY.name)}</div>
      <div class="vp-tag">${esc(COMPANY.tag)}</div>
      <div class="vp-small">${esc(COMPANY.email)} · ${esc(COMPANY.site)}<br/>${esc(COMPANY.place)}${COMPANY.gstin ? `<br/>GSTIN ${esc(COMPANY.gstin)}` : ""}</div>
    </div>
    <div class="vp-title">
      <h1>Agreement</h1>
      <table class="vp-meta">
        ${meta.map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join("")}
      </table>
    </div>
  </div>

  <div class="vp-billto">
    <div class="vp-label">Between</div>
    <div class="vp-co">${esc(COMPANY.name)}</div>
    <div class="vp-small">${esc(COMPANY.place)}</div>
    <div class="vp-label" style="margin-top:12px">And</div>
    <div class="vp-co">${esc(d.co || "—")}</div>
    <div class="vp-small">
      ${esc(d.contact || "")}${d.contact && (d.em || d.ph) ? "<br/>" : ""}${esc(d.em || "")}${d.em && d.ph ? " · " : ""}${esc(d.ph || "")}
    </div>
  </div>

  <table class="vp-items">
    <thead><tr><th>Engagement</th><th>Details</th><th class="r">Value</th></tr></thead>
    <tbody>
      <tr><td><b>${esc(d.svc || "Service")}</b></td><td>${esc(term)}</td><td class="r">${esc(inr(d.amount || 0))}</td></tr>
    </tbody>
  </table>

  <div class="vp-terms">
    <div class="vp-label">Terms of engagement</div>
    <ol>${clauses.map(([h, t]) => `<li><b>${esc(h)}.</b> ${esc(t)}</li>`).join("")}</ol>
  </div>

  ${d.agreement?.note ? `<div class="vp-note"><div class="vp-label">Note</div><div>${esc(d.agreement.note)}</div></div>` : ""}

  <div class="vp-sign">
    <div><div class="vp-signline"></div><div class="vp-small">For ${esc(COMPANY.name)}${d.owner ? ` · ${esc(d.owner)}` : ""}<br/>Name, signature and date</div></div>
    <div><div class="vp-signline"></div><div class="vp-small">For ${esc(d.co || "the client")}${d.contact ? ` · ${esc(d.contact)}` : ""}<br/>Name, signature and date</div></div>
  </div>

  <div class="vp-foot">Signed in two counterparts, one for each side.</div>
</div>`;
}

/* ── the sheet, as an HTML string so it can be printed as-is ──────────────── */
export function docHtml(kind, d) {
  if (kind === "agreement") return agreementHtml(d);
  const isInv = kind === "invoice";
  const code = isInv
    ? `INV-${String(d._id || "").slice(-4).toUpperCase()}`
    : `VP-${String(d._id || "").slice(-4).toUpperCase()}`;

  const gst = isInv ? Math.round(((d.amount || 0) * (d.gstPct || 0)) / 100) : 0;
  const total = isInv ? (d.amount || 0) + gst : (d.amount || 0);

  const forLine = isInv
    ? `${d.kind || "One time"}${d.kind === "Monthly" && d.ofMonths ? ` — month ${d.monthNo} of ${d.ofMonths}` : ""}`
    : `${d.term || "Retainer"}${d.term === "Retainer" && d.months ? ` — ${d.months} months` : ""}`;

  const meta = isInv
    ? [["Invoice no.", code], ["Issued", fmtD(d.issued)], ["Due", fmtD(d.due)], ["Status", d.status || "Draft"]]
    : [["Proposal no.", code], ["Raised", fmtD(d.createdAt)], ["Valid till", d.validTill ? fmtD(d.validTill) : "—"], ["Status", d.status || "Draft"]];

  const rows = isInv
    ? [[d.svc || "Service", forLine, inr(d.amount || 0)]]
    : [[d.svc || "Service", forLine, inr(d.amount || 0)]];

  const totals = isInv
    ? [["Subtotal", inr(d.amount || 0)], [`GST ${d.gstPct || 0}%`, inr(gst)], ["Total", inr(total)]]
    : [
        ["Deal value", inr(d.amount || 0)],
        [`Advance ${d.advPct || 0}%`, inr(Math.round(((d.amount || 0) * (d.advPct || 0)) / 100))],
        ["Balance", inr((d.amount || 0) - Math.round(((d.amount || 0) * (d.advPct || 0)) / 100))],
      ];

  return `
<div class="vp-sheet">
  <div class="vp-top">
    <div>
      <div class="vp-logo">${esc(COMPANY.name)}</div>
      <div class="vp-tag">${esc(COMPANY.tag)}</div>
      <div class="vp-small">${esc(COMPANY.email)} · ${esc(COMPANY.site)}<br/>${esc(COMPANY.place)}${COMPANY.gstin ? `<br/>GSTIN ${esc(COMPANY.gstin)}` : ""}</div>
    </div>
    <div class="vp-title">
      <h1>${isInv ? "Invoice" : "Proposal"}</h1>
      <table class="vp-meta">
        ${meta.map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join("")}
      </table>
    </div>
  </div>

  <div class="vp-billto">
    <div class="vp-label">${isInv ? "Billed to" : "Prepared for"}</div>
    <div class="vp-co">${esc(d.co || "—")}</div>
    <div class="vp-small">
      ${esc(d.contact || "")}${d.contact && (d.em || d.ph) ? "<br/>" : ""}${esc(d.em || "")}${d.em && d.ph ? " · " : ""}${esc(d.ph || "")}
    </div>
  </div>

  <table class="vp-items">
    <thead><tr><th>Item</th><th>Details</th><th class="r">Amount</th></tr></thead>
    <tbody>
      ${rows.map((r) => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td class="r">${esc(r[2])}</td></tr>`).join("")}
    </tbody>
  </table>

  <div class="vp-sumwrap">
    <table class="vp-sum">
      ${totals.map(([k, v], ix) =>
        `<tr class="${ix === totals.length - 1 && isInv ? "grand" : ""}"><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>`
      ).join("")}
    </table>
  </div>

  ${d.notes ? `<div class="vp-note"><div class="vp-label">Notes</div><div>${esc(d.notes)}</div></div>` : ""}
  ${isInv && d.status === "Paid"
      ? `<div class="vp-paid">Paid${d.paidOn ? ` on ${esc(fmtD(d.paidOn))}` : ""}${d.method ? ` by ${esc(d.method)}` : ""}${d.ref ? ` · ref ${esc(d.ref)}` : ""}</div>`
      : ""}

  <div class="vp-terms">
    <div class="vp-label">Terms</div>
    <ol>${TERMS.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
  </div>

  ${isInv && (COMPANY.bankLine || COMPANY.upi)
      ? `<div class="vp-terms"><div class="vp-label">Payment</div>${COMPANY.bankLine ? esc(COMPANY.bankLine) : ""}${COMPANY.bankLine && COMPANY.upi ? " · " : ""}${COMPANY.upi ? `UPI ${esc(COMPANY.upi)}` : ""}</div>`
      : ""}

  <div class="vp-foot">
    ${isInv ? "Thank you for your business." : "We look forward to working with you."}
    ${d.owner ? ` — ${esc(d.owner)}` : ""}
  </div>
</div>`;
}

const CSS = `
.vp-sheet { background:#fff; color:#0F172A; font-family: -apple-system,Segoe UI,Roboto,sans-serif; padding:34px 38px; }
.vp-top { display:flex; justify-content:space-between; gap:24px; align-items:flex-start; border-bottom:2px solid #4338CA; padding-bottom:16px; }
.vp-logo { font-size:26px; font-weight:900; color:#4338CA; letter-spacing:-.02em; }
.vp-tag { font-size:11.5px; color:#6366F1; font-weight:700; margin-top:1px; }
.vp-small { font-size:11px; color:#64748B; line-height:1.6; margin-top:7px; }
.vp-title h1 { margin:0 0 8px; font-size:22px; font-weight:900; text-align:right; letter-spacing:.02em; }
.vp-meta { border-collapse:collapse; margin-left:auto; font-size:11.5px; }
.vp-meta td { padding:2px 0 2px 12px; color:#64748B; }
.vp-meta td b { color:#0F172A; }
.vp-billto { margin:18px 0 16px; }
.vp-label { font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#94A3B8; margin-bottom:4px; }
.vp-co { font-size:15px; font-weight:900; }
.vp-items { width:100%; border-collapse:collapse; margin-top:6px; font-size:12px; }
.vp-items th { background:#F4F4FD; color:#475569; text-align:left; padding:9px 11px; font-size:10.5px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; border-bottom:1px solid #E7E7F2; }
.vp-items td { padding:11px; border-bottom:1px solid #F0F0F8; }
.vp-items .r, .vp-sum .r { text-align:right; }
.vp-sumwrap { display:flex; justify-content:flex-end; margin-top:14px; }
.vp-sum { width:52%; border-collapse:collapse; font-size:12px; }
.vp-sum td { padding:7px 11px; border-bottom:1px solid #F0F0F8; color:#475569; }
.vp-sum tr.grand td { background:#EEF2FF; color:#0F172A; font-weight:900; font-size:14px; border-bottom:none; }
.vp-note { margin-top:18px; font-size:11.5px; color:#475569; line-height:1.6; white-space:pre-wrap; }
.vp-paid { margin-top:14px; display:inline-block; padding:6px 12px; border-radius:20px; background:#DCFCE7; color:#0F8A54; font-size:11.5px; font-weight:800; }
.vp-terms { margin-top:22px; font-size:10.5px; color:#64748B; line-height:1.7; }
.vp-terms ol { margin:0; padding-left:16px; }
.vp-foot { margin-top:22px; padding-top:12px; border-top:1px solid #F0F0F8; font-size:11.5px; color:#94A3B8; font-weight:700; }
.vp-sign { display:flex; gap:34px; margin-top:34px; }
.vp-sign > div { flex:1; }
.vp-signline { border-bottom:1px solid #94A3B8; height:38px; margin-bottom:6px; }
@media print { @page { size:A4; margin:12mm; } .vp-sheet { padding:0; } }
`;

/* Printing from inside the dashboard would drag the whole app's CSS along, so
   the sheet is handed to a clean window that knows nothing else. */
export function printDoc(kind, d) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  const name = kind === "invoice" ? "Invoice" : kind === "agreement" ? "Agreement" : "Proposal";
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"/><title>${name} — ${COMPANY.name}</title>` +
    `<style>body{margin:0;background:#fff}${CSS}</style></head><body>${docHtml(kind, d)}</body></html>`
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

export default function DocPreview({ kind, doc, onClose }) {
  if (!doc) return null;
  return (
    <div onClick={onClose}
         style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 2200,
                  display: "grid", placeItems: "center", padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()}
           style={{ background: "#F6F6FC", borderRadius: 16, width: "min(880px,100%)", maxHeight: "92vh",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                    boxShadow: "0 24px 60px rgba(15,23,42,.3)" }}>
        <div style={{ background: "linear-gradient(120deg,#4338CA,#6366F1 70%)", padding: "13px 16px",
                      display: "flex", alignItems: "center", gap: 10 }}>
          <i className="bi bi-file-earmark-pdf-fill" style={{ color: "#fff", fontSize: 16 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>
              {kind === "invoice" ? "Invoice preview" : kind === "agreement" ? "Agreement preview" : "Proposal preview"}
            </div>
            <div style={{ color: "#DDD9FF", fontSize: 11.5, fontWeight: 700 }}>{doc.co || "—"}</div>
          </div>
          <button onClick={() => printDoc(kind, doc)}
                  style={{ height: 32, padding: "0 13px", borderRadius: 9, border: "1px solid #ffffff40",
                           background: "#ffffff1f", color: "#fff", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>
            <i className="bi bi-printer-fill" style={{ marginRight: 6 }} />Save as PDF
          </button>
          <button onClick={onClose}
                  style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid #ffffff40",
                           background: "#ffffff1f", color: "#fff", cursor: "pointer" }}>
            <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
          </button>
        </div>
        <div style={{ overflow: "auto", padding: 16 }}>
          <style>{CSS}</style>
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(15,23,42,.08)" }}
               dangerouslySetInnerHTML={{ __html: docHtml(kind, doc) }} />
        </div>
      </div>
    </div>
  );
}
