// components/ServiceLines.js — one row per service, shared by the proposal and
// the invoice forms. A client rarely buys just one thing, and the document
// total is simply what the rows add up to.
//
// The two boards keep their own style objects, so the caller hands its own in
// as `ui` and the rows come out looking native to whichever page drew them.
import { itemsTotal } from "@/utils/proposalItems";
import { inr } from "@/utils/leadsMeta";

export default function ServiceLines({ items, setItems, svcList, ui, label = "Services on this document" }) {
  const row = (i, k, v) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const total = itemsTotal(items);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase",
                    color: "#94A3B8", marginBottom: 6 }}>{label}</div>

      {items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr 34px", gap: 8, marginBottom: 8 }}>
          <select className="lp-in" style={ui.input} value={it.svc} onChange={(e) => row(i, "svc", e.target.value)}>
            <option value="">— pick a service —</option>
            {svcList.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <input className="lp-in" style={ui.input} placeholder="What it covers (optional)"
                 value={it.note || ""} onChange={(e) => row(i, "note", e.target.value)} />
          <input className="lp-in" style={ui.input} inputMode="numeric" placeholder="Value (₹)"
                 value={it.amount ? String(it.amount) : ""}
                 onChange={(e) => row(i, "amount", Number(e.target.value.replace(/\D/g, "") || 0))} />
          <button onClick={() => setItems(items.filter((_, j) => j !== i))}
                  disabled={items.length === 1}
                  style={{ ...ui.iconBtn, color: "#C42525", opacity: items.length === 1 ? .35 : 1 }}
                  title="Remove this line">
            <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
          </button>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setItems([...items, { svc: "", note: "", amount: 0 }])} style={ui.miniBtn}>
          <i className="bi bi-plus-lg" style={{ fontSize: 11 }} /> Add a line
        </button>
        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 900, color: "#0F172A" }}>
          Subtotal {inr(total)}
        </span>
      </div>
    </div>
  );
}
