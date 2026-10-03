import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { inr, inrShort, srcOf, todayStr, isWon, statusOf } from "@/utils/leadsMeta";
const SRC_COLORS = ["#6366F1", "#4338CA", "#0F8A54", "#F59E0B", "#0E7490", "#B45309", "#7C3AED", "#DC2626"];
const RANGES = [
  { k: "all", n: "All time" },
  { k: "month", n: "This month" },
  { k: "last", n: "Last month" },
  { k: "quarter", n: "Last 90 days" }
];
const monthKey = (d) => {
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "" : `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (k) => {
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "short" });
};
function inRange(d, range) {
  if (range === "all") return true;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return false;
  const now = /* @__PURE__ */ new Date();
  if (range === "month") return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth();
  if (range === "last") {
    const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return x.getFullYear() === p.getFullYear() && x.getMonth() === p.getMonth();
  }
  return (now - x) / 864e5 <= 90;
}
const invTotal = (i) => Math.round((i.amount || 0) * (1 + (i.gstPct || 0) / 100));
const gstOf = (i) => Math.round((i.amount || 0) * (i.gstPct || 0) / 100);
const invStatus = (i) => i.status === "Sent" && i.due && i.due < todayStr() ? "Overdue" : i.status;
export default function CrmOverview() {
  const [d, setD] = useState({ leads: [], proposals: [], invoices: [] });
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/reports", { credentials: "include" });
        const j = await r.json();
        if (j.success) setD(j);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const cut = useMemo(() => {
    const leads = d.leads.filter((l) => inRange(l.createdAt, range));
    const ids = new Set(leads.map((l) => l._id));
    return {
      leads,
      proposals: d.proposals.filter((p) => ids.has(p.leadId)),
      invoices: d.invoices.filter((i) => ids.has(i.leadId))
    };
  }, [d, range]);
  const funnel = useMemo(() => {
    const { leads, proposals } = cut;
    const n = (f) => leads.filter(f).length;
    return [
      { n: "Leads captured", v: leads.length },
      { n: "Contacted", v: n((l) => statusOf(l) !== "New") },
      { n: "Meetings booked", v: n((l) => !!l.meetingDate) },
      { n: "Consultations held", v: n((l) => l.held === "held") },
      { n: "Qualified", v: n((l) => Number(l.score || 0) >= 6) },
      { n: "Proposals sent", v: proposals.filter((p) => p.sent).length },
      { n: "Won", v: n(isWon) }
    ];
  }, [cut]);
  const money = useMemo(() => {
    const { proposals, invoices } = cut;
    const paid = invoices.filter((i) => i.status === "Paid");
    return {
      proposed: proposals.reduce((a, p) => a + (p.amount || 0), 0),
      won: proposals.filter((p) => p.status === "Accepted").reduce((a, p) => a + (p.amount || 0), 0),
      invoiced: invoices.reduce((a, i) => a + invTotal(i), 0),
      received: paid.reduce((a, i) => a + invTotal(i), 0),
      outstanding: invoices.filter((i) => !["Paid", "Cancelled", "Draft"].includes(i.status)).reduce((a, i) => a + invTotal(i), 0),
      overdue: invoices.filter((i) => invStatus(i) === "Overdue").reduce((a, i) => a + invTotal(i), 0),
      gst: paid.reduce((a, i) => a + gstOf(i), 0)
    };
  }, [cut]);
  const revenue = useMemo(() => {
    const map = {};
    d.invoices.filter((i) => i.status === "Paid").forEach((i) => {
      const k = monthKey(i.paidOn || i.issued);
      if (k) map[k] = (map[k] || 0) + invTotal(i);
    });
    return Object.keys(map).sort().slice(-6).map((k) => ({ k, m: monthLabel(k), v: map[k] }));
  }, [d]);
  const sources = useMemo(() => {
    const map = {};
    cut.leads.forEach((l) => {
      const x = srcOf(l);
      map[x] = (map[x] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([n, v], i) => ({ n, v, c: SRC_COLORS[i % SRC_COLORS.length] }));
  }, [cut]);
  const top = funnel[0].v || 1;
  const held = cut.leads.filter((l) => l.held === "held").length;
  const booked = cut.leads.filter((l) => l.meetingDate).length;
  const maxRev = Math.max(1, ...revenue.map((r) => r.v));
  const accepted = cut.proposals.filter((p) => p.status === "Accepted").length;
  return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: s.head }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("b", { style: { fontSize: 15, color: "#0F172A" } }, "Where the business stands"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#94A3B8", marginTop: 2 } }, "Leads, funnel, revenue and collections, live off the CRM.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("select", { style: s.sel, value: range, onChange: (e) => setRange(e.target.value) }, RANGES.map((r) => /* @__PURE__ */ React.createElement("option", { key: r.k, value: r.k }, r.n))), /* @__PURE__ */ React.createElement(Link, { href: "/dashboard/website/reports", style: { ...s.primary, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-bar-chart-fill", style: { marginRight: 6 } }), "Full report"))), /* @__PURE__ */ React.createElement("div", { style: s.strip }, /* @__PURE__ */ React.createElement(M, { k: "Leads received", v: loading ? "\u2014" : cut.leads.length, n: "all sources" }), /* @__PURE__ */ React.createElement(M, { k: "Meeting show rate", v: loading ? "\u2014" : `${Math.round(held / Math.max(1, booked) * 100)}%`, n: "booked to held" }), /* @__PURE__ */ React.createElement(M, { k: "Lead to win", v: loading ? "\u2014" : `${Math.round(funnel[6].v / top * 100)}%`, n: "end to end conversion", tone: "#0F8A54" }), /* @__PURE__ */ React.createElement(M, { k: "Value won", v: loading ? "\u2014" : inr(money.won), n: `${accepted} accepted`, tone: "#0F8A54" }), /* @__PURE__ */ React.createElement(M, { k: "Collected", v: loading ? "\u2014" : inr(money.received), n: "paid invoices, with GST" }), /* @__PURE__ */ React.createElement(
    M,
    {
      k: "Outstanding",
      v: loading ? "\u2014" : inr(money.outstanding),
      n: `${inr(money.overdue)} of it overdue`,
      tone: money.overdue ? "#DC2626" : "#0F172A"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "cx-cols2", style: s.cols2 }, /* @__PURE__ */ React.createElement(Panel, { title: "Funnel, capture to won", tag: `${top} leads in` }, funnel.map((step, i) => /* @__PURE__ */ React.createElement("div", { key: step.n, style: s.fstep }, /* @__PURE__ */ React.createElement("div", { style: s.fname }, step.n), /* @__PURE__ */ React.createElement("div", { style: s.ftrack }, /* @__PURE__ */ React.createElement("i", { style: { ...s.ffill, width: `${Math.max(4, step.v / top * 100)}%` } }), /* @__PURE__ */ React.createElement("b", { style: s.fval }, step.v)), /* @__PURE__ */ React.createElement("div", { style: s.fconv }, i === 0 ? "\u2014" : `${Math.round(step.v / Math.max(1, funnel[i - 1].v) * 100)}%`))), /* @__PURE__ */ React.createElement("div", { style: s.note }, "The percentage on the right is the step to step conversion, which is where the leak actually shows.")), /* @__PURE__ */ React.createElement(Panel, { title: "Revenue by month", tag: `${inr(revenue.reduce((a, r) => a + r.v, 0))} total` }, revenue.length ? /* @__PURE__ */ React.createElement("div", { style: s.bars }, revenue.map((r) => /* @__PURE__ */ React.createElement("div", { key: r.k, style: s.bar }, /* @__PURE__ */ React.createElement("div", { style: s.barVal }, inrShort(r.v)), /* @__PURE__ */ React.createElement("div", { style: s.barTrack }, /* @__PURE__ */ React.createElement("div", { style: { ...s.barCol, height: `${Math.max(4, r.v / maxRev * 100)}%` } })), /* @__PURE__ */ React.createElement("div", { style: s.barLbl }, r.m)))) : /* @__PURE__ */ React.createElement("div", { style: s.muted }, "No payment has been marked received yet."))), /* @__PURE__ */ React.createElement("div", { className: "cx-cols3", style: s.cols3 }, /* @__PURE__ */ React.createElement(Panel, { title: "Where the leads came from" }, sources.length ? sources.map((x) => /* @__PURE__ */ React.createElement(
    Row,
    {
      key: x.n,
      n: x.n,
      v: x.v,
      pct: Math.round(x.v / Math.max(1, cut.leads.length) * 100),
      w: x.v / sources[0].v * 100,
      c: x.c
    }
  )) : /* @__PURE__ */ React.createElement("div", { style: s.muted }, "Nothing in this range.")), /* @__PURE__ */ React.createElement(Panel, { title: "Proposals and closing" }, /* @__PURE__ */ React.createElement(KV, { k: "Proposals raised", v: cut.proposals.length }), /* @__PURE__ */ React.createElement(KV, { k: "Approved by admin", v: cut.proposals.filter((p) => p.approval === "Approved").length }), /* @__PURE__ */ React.createElement(KV, { k: "Blocked at approval", v: cut.proposals.filter((p) => p.approval !== "Approved").length }), /* @__PURE__ */ React.createElement(KV, { k: "Sent to clients", v: cut.proposals.filter((p) => p.sent).length }), /* @__PURE__ */ React.createElement(KV, { k: "Accepted", v: accepted }), /* @__PURE__ */ React.createElement(KV, { k: "Value proposed", v: inr(money.proposed) }), /* @__PURE__ */ React.createElement(KV, { k: "Value won", v: inr(money.won) })), /* @__PURE__ */ React.createElement(Panel, { title: "Collections" }, /* @__PURE__ */ React.createElement(KV, { k: "Invoiced", v: inr(money.invoiced) }), /* @__PURE__ */ React.createElement(KV, { k: "Received", v: inr(money.received) }), /* @__PURE__ */ React.createElement(KV, { k: "Outstanding", v: inr(money.outstanding) }), /* @__PURE__ */ React.createElement(KV, { k: "Overdue", v: inr(money.overdue) }), /* @__PURE__ */ React.createElement(KV, { k: "GST collected", v: inr(money.gst) }), /* @__PURE__ */ React.createElement(KV, { k: "Invoices raised", v: cut.invoices.length }))), /* @__PURE__ */ React.createElement("style", { jsx: true, global: true }, `
        @media (max-width: 1180px) {
          .cx-cols2, .cx-cols3 { grid-template-columns: 1fr !important; }
        }
      `));
}
function Panel({ title, tag, children }) {
  return /* @__PURE__ */ React.createElement("div", { style: s.panel }, /* @__PURE__ */ React.createElement("div", { style: s.panelHead }, /* @__PURE__ */ React.createElement("b", { style: { fontSize: 13, color: "#0F172A", flex: 1 } }, title), tag ? /* @__PURE__ */ React.createElement("span", { style: s.tag }, tag) : null), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 16px 16px" } }, children));
}
const Row = ({ n, v, pct, w, c }) => /* @__PURE__ */ React.createElement("div", { style: s.srcRow }, /* @__PURE__ */ React.createElement("span", { style: { width: 9, height: 9, borderRadius: 3, background: c, flexShrink: 0 } }), /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: 12.5, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, n), /* @__PURE__ */ React.createElement("span", { style: s.mini }, /* @__PURE__ */ React.createElement("i", { style: { display: "block", height: "100%", borderRadius: 6, width: `${Math.max(4, w)}%`, background: c } })), /* @__PURE__ */ React.createElement("b", { style: { fontSize: 12.5, color: "#0F172A", minWidth: 30, textAlign: "right" } }, v), pct !== void 0 ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11.5, color: "#94A3B8", minWidth: 34, textAlign: "right" } }, pct, "%") : null);
const KV = ({ k, v }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 12.5, borderBottom: "1px solid #F4F4FD" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#94A3B8" } }, k), /* @__PURE__ */ React.createElement("b", { style: { color: "#334155" } }, v));
const M = ({ k, v, n, tone }) => /* @__PURE__ */ React.createElement("div", { style: s.mcell }, /* @__PURE__ */ React.createElement("div", { style: s.mk }, k), /* @__PURE__ */ React.createElement("div", { style: { ...s.mv, color: tone || "#0F172A" } }, v), /* @__PURE__ */ React.createElement("div", { style: s.mn }, n));
const s = {
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 },
  sel: { border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 11px", fontSize: 12.5, color: "#334155", background: "#fff" },
  primary: {
    background: "#6366F1",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "9px 14px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center"
  },
  strip: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))",
    background: "#fff",
    border: "1px solid #F0F0F8",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14
  },
  mcell: { padding: "14px 16px", borderRight: "1px solid #F4F4FD" },
  mk: { fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#94A3B8" },
  mv: { fontSize: 20, fontWeight: 800, marginTop: 4 },
  mn: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  cols2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 14, alignItems: "start", marginBottom: 14 },
  cols3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 14, alignItems: "start" },
  panel: { background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden" },
  panelHead: { padding: "12px 16px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center", gap: 9 },
  tag: { fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#6366F114", color: "#4338CA" },
  fstep: { display: "flex", alignItems: "center", gap: 10, padding: "5px 0" },
  fname: { width: 124, fontSize: 12, color: "#64748B", flexShrink: 0 },
  ftrack: { flex: 1, height: 22, background: "#F6F6FC", borderRadius: 7, position: "relative", overflow: "hidden" },
  ffill: { display: "block", height: "100%", borderRadius: 7, background: "linear-gradient(90deg,#818CF8,#6366F1)" },
  fval: { position: "absolute", right: 8, top: 3, fontSize: 12, color: "#0F172A" },
  fconv: { width: 42, textAlign: "right", fontSize: 11.5, fontWeight: 700, color: "#94A3B8" },
  note: { fontSize: 11.5, color: "#94A3B8", marginTop: 10 },
  muted: { fontSize: 12.5, color: "#94A3B8" },
  bars: { display: "flex", alignItems: "flex-end", gap: 12, height: 190, paddingTop: 6 },
  bar: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%" },
  barVal: { fontSize: 11, fontWeight: 700, color: "#475569" },
  barTrack: { flex: 1, width: "100%", display: "flex", alignItems: "flex-end" },
  barCol: { width: "100%", borderRadius: "7px 7px 0 0", background: "linear-gradient(180deg,#818CF8,#6366F1)" },
  barLbl: { fontSize: 11, color: "#94A3B8" },
  srcRow: { display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: "1px solid #F4F4FD" },
  mini: { width: 80, height: 6, borderRadius: 6, background: "#F1F1FA", overflow: "hidden", flexShrink: 0 }
};
