const fs = require('fs');
const sub = (f, a, b, n) => {
  let t = fs.readFileSync(f, 'utf8');
  const nl = t.includes('\r\n') ? '\r\n' : '\n';
  const A = a.split('\n').join(nl), B = b.split('\n').join(nl);
  if (!t.includes(A)) { console.log('MISS', n); process.exit(1); }
  fs.writeFileSync(f, t.replace(A, B));
};

/* leadMail: carry whatever the compose box attached */
sub('utils/leadMail.js',
`export function sendLeadMail({ to, cc, subject, html }) {
  if (!to) return Promise.reject(new Error("No email address on this lead"));
  const transporter = mailTransport();
  return transporter.sendMail({ from: \`"Viralon" <\${MAIL_USER}>\`, to, ...(cc ? { cc } : {}), subject, html });
}`,
`export function sendLeadMail({ to, cc, subject, html, attachments }) {
  if (!to) return Promise.reject(new Error("No email address on this lead"));
  const transporter = mailTransport();
  return transporter.sendMail({
    from: \`"Viralon" <\${MAIL_USER}>\`, to, ...(cc ? { cc } : {}), subject, html,
    ...(attachments && attachments.length ? { attachments } : {}),
  });
}`, 'leadMail');

/* docMail: the document still goes, the picked files ride along with it */
sub('utils/docMail.js',
`export function sendDocMail(kind, doc, { to, subject, body } = {}) {
  const d = docDraft(kind, doc);
  return send({
    to: to || d.to,
    name: SENDER[kind] || "Viralon",
    subject: subject || d.subject,
    html: body || d.body,
    attachments: docAttachment(kind, doc, d.fileName),
  });
}`,
`export function sendDocMail(kind, doc, { to, subject, body, attachments } = {}) {
  const d = docDraft(kind, doc);
  return send({
    to: to || d.to,
    name: SENDER[kind] || "Viralon",
    subject: subject || d.subject,
    html: body || d.body,
    attachments: [...docAttachment(kind, doc, d.fileName), ...(attachments || [])],
  });
}`, 'docMail');
console.log('ok');
