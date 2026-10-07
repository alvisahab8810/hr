// components/ServiceLines.js — one row per service, shared by the proposal and
// the invoice forms. A client rarely buys just one thing, and the document
// total is simply what the rows add up to.
//
// The two boards keep their own style objects, so the caller hands its own in
// as `ui` and the rows come out looking native to whichever page drew them.
import { itemsTotal } from "@/utils/proposalItems";
import { inr, sacFor } from "@/utils/leadsMeta";

export default function ServiceLines({ items, setItems, svcList, ui, label = "Services on this document", withHsn = false }) {
  const row = (i, k, v) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  // Picking the service fills the SAC in, because that is the one the service
  // is almost always billed under — it stays a plain field, so a line that
  // needs a different code can simply be typed over.
  const pickSvc = (i, v) =>
    setItems(items.map((x, j) => (j === i ? { ...x, svc: v, hsn: x.hsn || (v ? sacFor(v) : "") } : x)));
  const total = itemsTotal(items);
  // The invoice prints a quantity and a unit price against every line, so the
  // two are typed rather than worked backwards out of the value. The value
  // column is read-only there: qty x rate is the one that prints.
  const cols = withHsn ? "1fr 1.05fr .5fr .38fr .6fr .6fr 34px" : "1.1fr 1.7fr .8fr 34px";
  const lineAmt = (it) => Math.round((Number(it.qty || 1) || 1) * Number(it.rate || 0));

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase",
                    color: "#94A3B8", marginBottom: 6 }}>{label}</div>

      {/* The note is the only part of a line that holds a sentence, so it takes
          the room the amount does not need. */}
      {items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: cols, gap: 8, marginBottom: 8 }}>
          <select className="lp-in" style={ui.input} value={it.svc} onChange={(e) => pickSvc(i, e.target.value)}>
            <option value="">— pick a service —</option>
            {svcList.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <input className="lp-in" style={ui.input} placeholder="What it covers (optional)"
                 value={it.note || ""} onChange={(e) => row(i, "note", e.target.value)} />
          {withHsn ? (
            <>
              <input className="lp-in" style={ui.input} inputMode="numeric" placeholder="SAC"
                     title="The SAC code this line is billed under — it prints on the invoice"
                     value={it.hsn || ""} onChange={(e) => row(i, "hsn", e.target.value.replace(/[^0-9]/g, ""))} />
              <input className="lp-in" style={ui.input} inputMode="numeric" placeholder="Qty"
                     title="How many of it"
                     value={it.qty ? String(it.qty) : ""}
                     onChange={(e) => row(i, "qty", Number(e.target.value.replace(/[^0-9]/g, "") || 0))} />
              <input className="lp-in" style={ui.input} inputMode="numeric" placeholder="Unit price"
                     title="What one of them costs — it prints as the unit price"
                     value={it.rate ? String(it.rate) : ""}
                     onChange={(e) => row(i, "rate", Number(e.target.value.replace(/[^0-9]/g, "") || 0))} />
              <input className="lp-in" readOnly title="Quantity times the unit price"
                     style={{ ...ui.input, background: "#F4F4FD", cursor: "default" }}
                     value={lineAmt(it) ? inr(lineAmt(it)) : ""} />
            </>
          ) : (
            <input className="lp-in" style={ui.input} inputMode="numeric" placeholder="Value (₹)"
                   value={it.amount ? String(it.amount) : ""}
                   onChange={(e) => row(i, "amount", Number(e.target.value.replace(/[^0-9]/g, "") || 0))} />
          )}
          <button onClick={() => setItems(items.filter((_, j) => j !== i))}
                  disabled={items.length === 1}
                  style={{ ...ui.iconBtn, color: "#C42525", opacity: items.length === 1 ? .35 : 1 }}
                  title="Remove this line">
            <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
          </button>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setItems([...items, { svc: "", note: "", qty: 1, rate: 0, amount: 0 }])} style={ui.miniBtn}>
          <i className="bi bi-plus-lg" style={{ fontSize: 11 }} /> Add a line
        </button>
        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 900, color: "#0F172A" }}>
          Subtotal {inr(total)}
        </span>
      </div>
    </div>
  );
}
