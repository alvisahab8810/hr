const fs = require("fs");
const p = "pages/dashboard/website/invoices.js";
let t = fs.readFileSync(p, "utf8");
const B = String.fromCharCode(92);
function rep(lines, out) {
  for (const nl of ["\r\n", "\n"]) {
    const a = lines.join(nl);
    if (t.includes(a)) { t = t.replace(a, out.join(nl)); return; }
  }
  throw new Error("miss " + lines[0].trim().slice(0, 40));
}

// A new panel, so the billing details can be corrected after the fact.
rep([
'    case "amounts": {',
'      return <Amounts i={i} busy={busy} patch={patch} />;',
'    }',
], [
'    case "billto":',
'      return <BillTo i={i} busy={busy} patch={patch} />;',
'    case "amounts": {',
'      return <Amounts i={i} busy={busy} patch={patch} />;',
'    }',
]);

rep([
'          <KV k="Phone" v={i.ph || "—"} />',
'          <KV k="Raised on" v={fmtDT(i.createdAt)} />',
], [
'          <KV k="Phone" v={i.ph || "—"} />',
'          {i.billTo?.address ? <KV k="Address" v={i.billTo.address} /> : null}',
'          {[i.billTo?.city, i.billTo?.state, i.billTo?.pincode].filter(Boolean).length',
'            ? <KV k="City" v={[i.billTo?.city, i.billTo?.state, i.billTo?.pincode].filter(Boolean).join(", ")} /> : null}',
'          {i.billTo?.gstin ? <KV k="Their GSTIN" v={i.billTo.gstin} /> : null}',
'          {i.poRef ? <KV k="PO / reference" v={i.poRef} /> : null}',
'          <KV k="Raised on" v={fmtDT(i.createdAt)} />',
]);

rep([
'            <button onClick={() => go("payment")} style={s.miniBtn}>Payment</button>',
], [
'            <button onClick={() => go("billto")} style={s.miniBtn}>Edit the billing details</button>',
'            <button onClick={() => go("payment")} style={s.miniBtn}>Payment</button>',
]);

rep([
'  record:  { t: "Invoice record",  i: "bi-receipt" },',
], [
'  record:  { t: "Invoice record",  i: "bi-receipt" },',
'  billto:  { t: "Billing details", i: "bi-geo-alt-fill" },',
]);

// The editor itself, dropped in just above the Amounts panel.
rep([
'function Amounts({ i, busy, patch }) {',
], [
'// Who the bill is addressed to, and where it goes. A lead only ever carries a',
'// name and a number, so this is the one place the real details are kept.',
'function BillTo({ i, busy, patch }) {',
'  const b = i.billTo || {};',
'  const [f, setF] = useState({',
'    co: i.co || "", contact: i.contact || "", em: i.em || "", ph: i.ph || "", poRef: i.poRef || "",',
'    address: b.address || "", city: b.city || "", state: b.state || "", pincode: b.pincode || "", gstin: b.gstin || "",',
'  });',
'  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));',
'  const save = () => patch(i._id, {',
'    co: f.co, contact: f.contact, em: f.em, ph: f.ph, poRef: f.poRef,',
'    billTo: { address: f.address, city: f.city, state: f.state, pincode: f.pincode, gstin: f.gstin },',
'  });',
'',
'  return (',
'    <>',
'      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>',
'        <Field label="Company">',
'          <input className="lp-in" style={s.input} value={f.co} onChange={(e) => set("co", e.target.value)} />',
'        </Field>',
'        <Field label="Contact person">',
'          <input className="lp-in" style={s.input} value={f.contact} onChange={(e) => set("contact", e.target.value)} />',
'        </Field>',
'        <Field label="Email">',
'          <input className="lp-in" style={s.input} type="email" value={f.em} onChange={(e) => set("em", e.target.value)} />',
'        </Field>',
'        <Field label="Phone">',
'          <input className="lp-in" style={s.input} value={f.ph} onChange={(e) => set("ph", e.target.value)} />',
'        </Field>',
'      </div>',
'      <Field label="Billing address">',
'        <input className="lp-in" style={s.input} value={f.address} onChange={(e) => set("address", e.target.value)}',
'               placeholder="Street, building, floor" />',
'      </Field>',
'      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>',
'        <Field label="City">',
'          <input className="lp-in" style={s.input} value={f.city} onChange={(e) => set("city", e.target.value)} />',
'        </Field>',
'        <Field label="State" hint="Decides CGST + SGST or IGST.">',
'          <input className="lp-in" style={s.input} value={f.state} onChange={(e) => set("state", e.target.value)} />',
'        </Field>',
'        <Field label="Pincode">',
'          <input className="lp-in" style={s.input} inputMode="numeric" value={f.pincode}',
'                 onChange={(e) => set("pincode", e.target.value.replace(/' + B + 'D/g, "").slice(0, 6))} />',
'        </Field>',
'      </div>',
'      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>',
'        <Field label="Their GSTIN">',
'          <input className="lp-in" style={s.input} value={f.gstin}',
'                 onChange={(e) => set("gstin", e.target.value.toUpperCase().slice(0, 15))} placeholder="Optional" />',
'        </Field>',
'        <Field label="PO / reference">',
'          <input className="lp-in" style={s.input} value={f.poRef} onChange={(e) => set("poRef", e.target.value)} />',
'        </Field>',
'      </div>',
'      <button onClick={save} disabled={busy} style={{ ...s.primaryBtn, opacity: busy ? .5 : 1 }}>',
'        <i className="bi bi-check2" style={{ fontSize: 12 }} /> Save the billing details',
'      </button>',
'    </>',
'  );',
'}',
'',
'function Amounts({ i, busy, patch }) {',
]);

fs.writeFileSync(p, t);
console.log("ok");
