const fs = require('fs');
const sub = (f, a, b, n) => {
  let t = fs.readFileSync(f, 'utf8');
  const nl = t.includes('\r\n') ? '\r\n' : '\n';
  const A = a.split('\n').join(nl), B = b.split('\n').join(nl);
  if (!t.includes(A)) { console.log('MISS', n); process.exit(1); }
  fs.writeFileSync(f, t.replace(A, B));
};
// Attachments travel as base64 in the body, so the 1 MB default is far too small.
const CFG = `
// Attachments ride along in the body as base64, so the default 1 MB is too tight.
export const config = { api: { bodyParser: { sizeLimit: "16mb" } } };
`;

/* leads */
const L = 'pages/api/admin/leads/[id]/mail.js';
sub(L, `import { buildLeadMail, sendLeadMail } from "@/utils/leadMail";`,
       `import { buildLeadMail, sendLeadMail } from "@/utils/leadMail";
import mailFiles from "@/utils/mailFiles";` + CFG, 'leads-import');
sub(L, `    await sendLeadMail({ to: lead.email, cc, subject: mail.subject, html: mail.html });`,
       `    await sendLeadMail({ to: lead.email, cc, subject: mail.subject, html: mail.html,
                         attachments: mailFiles(req.body?.files) });`, 'leads-send');

/* invoices */
const I = 'pages/api/admin/invoices/[id]/mail.js';
sub(I, `import { docDraft, sendDocMail } from "@/utils/docMail";`,
       `import { docDraft, sendDocMail } from "@/utils/docMail";
import mailFiles from "@/utils/mailFiles";` + CFG, 'inv-import');
sub(I, `    const { to, subject, body, markSent, paymentId } = req.body || {};`,
       `    const { to, subject, body, markSent, paymentId, files } = req.body || {};`, 'inv-body');
sub(I, `    await sendDocMail("invoice", asOfPayment(inv, paymentId), { to, subject, body });`,
       `    await sendDocMail("invoice", asOfPayment(inv, paymentId), { to, subject, body, attachments: mailFiles(files) });`, 'inv-send');

/* proposals + agreements */
const P = 'pages/api/admin/proposals/[id]/mail.js';
sub(P, `import { docDraft, sendDocMail } from "@/utils/docMail";`,
       `import { docDraft, sendDocMail } from "@/utils/docMail";
import mailFiles from "@/utils/mailFiles";` + CFG, 'pro-import');
sub(P, `    const { to, subject, body, markSent } = req.body || {};`,
       `    const { to, subject, body, markSent, files } = req.body || {};`, 'pro-body');
sub(P, `    await sendDocMail(kind, p, { to, subject, body });`,
       `    await sendDocMail(kind, p, { to, subject, body, attachments: mailFiles(files) });`, 'pro-send');
console.log('ok');
