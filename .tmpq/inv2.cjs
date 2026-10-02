const fs = require("fs");
const p = "pages/dashboard/website/invoices.js";
let t = fs.readFileSync(p, "utf8");
function rep(lines, out) {
  for (const nl of ["\r\n", "\n"]) {
    const a = lines.join(nl);
    if (t.includes(a)) { t = t.replace(a, out.join(nl)); return; }
  }
  throw new Error("miss " + lines[0].trim().slice(0, 40));
}

// A lead fills the billing block in, and nothing more — the rest is typed.
rep([
'  const p = proposals.find((x) => x._id === pid);',
], [
'  useEffect(() => {',
'    const l = leads.find((x) => x._id === f.leadId);',
'    if (!l) return;',
'    setF((x) => ({',
'      ...x,',
'      co: x.co || l.businessName || l.name || "",',
'      contact: x.contact || l.name || "",',
'      em: x.em || l.email || "",',
'      ph: x.ph || l.phone || "",',
'      city: x.city || l.city || "",',
'    }));',
'  }, [f.leadId]); // eslint-disable-line react-hooks/exhaustive-deps',
'',
'  const p = proposals.find((x) => x._id === pid);',
]);

// A heading between the blocks of a long form.
rep([
'function NewInvoice({ proposals, leads, proposalId, onClose, onDone }) {',
], [
'// A long form reads better in named blocks than as one run of fields.',
'function Section({ n }) {',
'  return (',
'    <div style={{ fontSize: 11, fontWeight: 900, color: "#4338CA", letterSpacing: ".04em",',
'                  textTransform: "uppercase", margin: "16px 0 8px" }}>{n}</div>',
'  );',
'}',
'',
'function NewInvoice({ proposals, leads, proposalId, onClose, onDone }) {',
]);

fs.writeFileSync(p, t);
console.log("ok");
