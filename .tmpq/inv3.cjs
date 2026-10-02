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

// The Amounts panel edits one service and one figure; an invoice can carry
// several lines, so it gets the same editor the form uses.
rep([
'  const [f, setF] = useState({ kind: i.kind, svc: i.svc || "", amount: String(i.amount || ""), gstPct: String(i.gstPct ?? 18) });',
'  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));',
'  const locked = i.status === "Paid" || i.status === "Partly paid";',
'  const amt = Number(f.amount || 0), g = Math.round((amt * Number(f.gstPct || 0)) / 100);',
], [
'  const [f, setF] = useState({ kind: i.kind, gstPct: String(i.gstPct ?? 18) });',
'  const [items, setItems] = useState(() => docItems(i));',
'  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));',
'  const locked = i.status === "Paid" || i.status === "Partly paid";',
'  const amt = itemsTotal(items), g = Math.round((amt * Number(f.gstPct || 0)) / 100);',
]);

rep([
'      <KV k="Service" v={i.svc || "—"} />',
'      <KV k="Amount" v={inr(i.amount || 0)} />',
], [
'      {docItems(i).map((it, n) => (',
'        <KV key={n} k={it.svc || "Service"} v={inr(it.amount || 0)} />',
'      ))}',
'      <KV k="Amount" v={inr(i.amount || 0)} />',
]);

rep([
'          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>',
'            <Field label="For">',
'              <select className="lp-in" style={s.input} value={f.kind} onChange={(e) => set("kind", e.target.value)}>',
'                {KINDS.map((x) => <option key={x} value={x}>{x}</option>)}',
'              </select>',
'            </Field>',
'            <Field label="Service">',
'              <select className="lp-in" style={s.input} value={f.svc} onChange={(e) => set("svc", e.target.value)}>',
'                <option value="">—</option>',
'                {svcList.map((x) => <option key={x} value={x}>{x}</option>)}',
'              </select>',
'            </Field>',
'            <Field label="Amount (₹)">',
'              <input className="lp-in" style={s.input} inputMode="numeric" value={f.amount}',
'                     onChange={(e) => set("amount", e.target.value.replace(/' + B + 'D/g, ""))} />',
'            </Field>',
'            <Field label="GST %">',
'              <input className="lp-in" style={s.input} inputMode="numeric" value={f.gstPct}',
'                     onChange={(e) => set("gstPct", e.target.value.replace(/' + B + 'D/g, "").slice(0, 2))} />',
'            </Field>',
'          </div>',
], [
'          <ServiceLines items={items} setItems={setItems} svcList={svcList} ui={s} label="Lines on this invoice" />',
'          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>',
'            <Field label="For">',
'              <select className="lp-in" style={s.input} value={f.kind} onChange={(e) => set("kind", e.target.value)}>',
'                {KINDS.map((x) => <option key={x} value={x}>{x}</option>)}',
'              </select>',
'            </Field>',
'            <Field label="GST %">',
'              <input className="lp-in" style={s.input} inputMode="numeric" value={f.gstPct}',
'                     onChange={(e) => set("gstPct", e.target.value.replace(/' + B + 'D/g, "").slice(0, 2))} />',
'            </Field>',
'          </div>',
]);

rep([
'          <button onClick={() => patch(i._id, f)} disabled={busy} style={{ ...s.primaryBtn, opacity: busy ? .5 : 1 }}>',
], [
'          <button onClick={() => patch(i._id, { ...f, items })} disabled={busy} style={{ ...s.primaryBtn, opacity: busy ? .5 : 1 }}>',
]);

rep([
'import { itemsTotal } from "@/utils/proposalItems";',
], [
'import { docItems, itemsTotal } from "@/utils/proposalItems";',
]);

fs.writeFileSync(p, t);
console.log("ok");
