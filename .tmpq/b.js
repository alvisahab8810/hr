import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import DocPreview from "@/components/DocPreview";
import MailCompose from "@/components/MailCompose";
import ServiceLines from "@/components/ServiceLines";
import { docItems, itemsTotal } from "@/utils/proposalItems";
import { SERVICES, inr, initials, fmtD, fmtDT, todayStr } from "@/utils/leadsMeta";
import { useList, useCrmSettings } from "@/utils/crmSettings";
import { confirmDialog } from "../../../components/ConfirmDialog";
const COLS_KEY = "viralon.invoices.hiddenCols";
const DENSITY_KEY = "viralon.invoices.density";
const KINDS = ["Advance", "Monthly", "Balance", "One time"];
const STATUSES = ["Draft", "Sent", "Partly paid", "Paid", "Overdue", "Cancelled"];
const METHODS = ["Bank transfer", "UPI", "Cheque", "Cash"];
const invCode = (i) => `INV-${String(i?._id || "").slice(-4).toUpperCase()}`;
const propRef = (id) => id ? `VP-${String(id).slice(-4).toUpperCase()}` : "\u2014";
const leadRef = (id) => `VL-${String(id || "").slice(-4).toUpperCase()}`;
const gstAmt = (i) => Math.round((i.amount || 0) * (i.gstPct || 0) / 100);
const grand = (i) => (i.amount || 0) + gstAmt(i);
const received = (i) => (i.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0);
const asOfPayment = (i, paymentId) => {
  if (!paymentId) return i;
  const rows = i.payments || [];
  const at = rows.findIndex((p) => String(p._id || "") === String(paymentId));
  if (at < 0) return i;
  const cut = rows.slice(0, at + 1);
  const got = cut.reduce((n, p) => n + Number(p.amount || 0), 0);
  return { ...i, payments: cut, status: got >= grand(i) ? "Paid" : "Partly paid" };
};
const balance = (i) => Math.max(0, grand(i) - received(i));
const isLate = (i) => ["Sent", "Partly paid"].includes(i.status) && i.due && i.due < todayStr();
const liveStatus = (i) => isLate(i) ? "Overdue" : i.status;
const statusMeta = (st) => st === "Paid" ? { bg: "#DCFCE7", fg: "#0F8A54" } : st === "Overdue" ? { bg: "#FDEDED", fg: "#C42525" } : st === "Sent" ? { bg: "#EEF2FF", fg: "#4338CA" } : st === "Partly paid" ? { bg: "#FEF3C7", fg: "#B4690E" } : st === "Cancelled" ? { bg: "#F1F5F9", fg: "#94A3B8" } : { bg: "#F1F5F9", fg: "#64748B" };
const COLS = [
  { k: "code", n: "Invoice", on: true, w: 115 },
  { k: "prop", n: "Proposal", on: true, w: 105 },
  { k: "lead", n: "Lead ID", on: false, w: 100 },
  { k: "co", n: "Company", on: true, w: 200 },
  { k: "contact", n: "Contact", on: false, w: 150 },
  { k: "em", n: "Email", on: false, w: 190 },
  { k: "svc", n: "Service", on: false, w: 170 },
  { k: "kind", n: "For", on: true, w: 135 },
  { k: "amount", n: "Amount", on: true, w: 115 },
  { k: "gst", n: "GST", on: false, w: 105 },
  { k: "total", n: "Total", on: true, w: 120 },
  { k: "pay", n: "Payments", on: true, w: 195 },
  { k: "issued", n: "Issued", on: true, w: 110 },
  { k: "due", n: "Due", on: true, w: 110 },
  { k: "status", n: "Status", on: true, w: 115 },
  { k: "paidOn", n: "Paid on", on: true, w: 110 },
  { k: "method", n: "How paid", on: false, w: 130 },
  { k: "ref", n: "Reference", on: false, w: 140 },
  { k: "owner", n: "Owner", on: true, w: 125 }
];
const PANEL_OF = {
  code: "record",
  prop: "record",
  lead: "record",
  co: "record",
  contact: "record",
  em: "record",
  svc: "amounts",
  kind: "amounts",
  amount: "amounts",
  gst: "amounts",
  total: "amounts",
  issued: "dates",
  due: "dates",
  status: "payment",
  paidOn: "payment",
  method: "payment",
  ref: "payment",
  pay: "records",
  owner: "owner"
};
const PANEL_META = {
  record: { t: "Invoice record", i: "bi-receipt" },
  billto: { t: "Billing details", i: "bi-geo-alt-fill" },
  amounts: { t: "What it is for", i: "bi-cash-stack" },
  dates: { t: "Dates", i: "bi-calendar-event-fill" },
  payment: { t: "Payment", i: "bi-bank" },
  records: { t: "Payment records", i: "bi-journal-check" },
  owner: { t: "Who is chasing it", i: "bi-person-badge-fill" }
};
function Metric({ icon, label, value, sub, accent }) {
  return /* @__PURE__ */ React.createElement("div", { style: {
    background: `linear-gradient(160deg,#fff 55%, ${accent.bg} 175%)`,
    border: `1px solid ${accent.bg}`,
    borderRadius: 14,
    padding: "13px 14px",
    boxShadow: "0 2px 8px rgba(15,23,42,.05)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    gap: 11,
    minWidth: 0
  } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon } }), /* @__PURE__ */ React.createElement("div", { style: {
    width: 36,
    height: 36,
    borderRadius: 11,
    background: accent.icon,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: 15
  } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${icon}` })), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8" } }, label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 } }, value), sub ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#94A3B8", fontWeight: 600 } }, sub) : null));
}
function Field({ label, hint, children }) {
  return /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 4 } }, label), children, hint ? /* @__PURE__ */ React.createElement("span", { style: { display: "block", fontSize: 10.5, color: "#94A3B8", marginTop: 3 } }, hint) : null);
}
function KV({ k, v }) {
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontSize: 12, borderBottom: "1px dashed #E8E8F2" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#64748B" } }, k), /* @__PURE__ */ React.createElement("b", { style: { color: "#0F172A", textAlign: "right", fontWeight: 800 } }, v));
}
function Modal({ title, icon, wide, onClose, children }) {
  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onClose();
      },
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.45)",
        zIndex: 2e3,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 16px",
        overflowY: "auto"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: {
      background: "#fff",
      borderRadius: 16,
      width: "100%",
      maxWidth: wide ? 720 : 520,
      boxShadow: "0 24px 60px rgba(15,23,42,.28)",
      overflow: "hidden"
    } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "15px 20px", borderBottom: "1px solid #F1F1FA", display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: s.panelIcon }, /* @__PURE__ */ React.createElement("i", { className: `bi ${icon}`, style: { fontSize: 14 } })), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 14, color: "#0F172A", flex: 1 } }, title), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: s.iconBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-x-lg", style: { fontSize: 12 } }))), /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: { padding: 20, maxHeight: "calc(100vh - 220px)", overflowY: "auto" } }, children))
  );
}
export default function InvoicesPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fKind, setFKind] = useState("");
  const [sort, setSort] = useState({ k: "issued", dir: -1 });
  const [hidden, setHidden] = useState([]);
  const [density, setDensity] = useState("comfortable");
  const [colsOpen, setColsOpen] = useState(false);
  const [modal, setModal] = useState(null);
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem(COLS_KEY) || "null");
      setHidden(Array.isArray(h) ? h : COLS.filter((c) => !c.on).map((c) => c.k));
      const d = localStorage.getItem(DENSITY_KEY);
      if (d) setDensity(d);
    } catch {
      setHidden(COLS.filter((c) => !c.on).map((c) => c.k));
    }
  }, []);
  const toggleCol = (k) => setHidden((prev) => {
    const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify(next));
    } catch {
    }
    return next;
  });
  const setDens = (d) => {
    setDensity(d);
    try {
      localStorage.setItem(DENSITY_KEY, d);
    } catch {
    }
  };
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/invoices", { credentials: "include" });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      setRows(j.data || []);
      setProposals(j.proposals || []);
      setLeads(j.leads || []);
    } catch (e) {
      toast.error(e.message || "Could not load the invoices");
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!router.isReady || loading) return;
    if (router.query.proposal) setModal({ type: "new", proposalId: String(router.query.proposal) });
    else if (router.query.lead) setQ(leadRef(String(router.query.lead)));
  }, [router.isReady, router.query.proposal, router.query.lead, loading]);
  const patch = useCallback(async (id, body, quiet) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      setRows((prev) => prev.map((i) => i._id === id ? j.data : i));
      if (!quiet) toast.success("Saved");
      setBusy(false);
      return j.data;
    } catch (e) {
      toast.error(e.message || "Could not save that");
      setBusy(false);
      return null;
    }
  }, []);
  const remove = async (i) => {
    if (!await confirmDialog(`Delete ${invCode(i)}? This cannot be undone.`)) return;
    const r = await fetch(`/api/admin/invoices/${i._id}`, { method: "DELETE", credentials: "include" });
    const j = await r.json();
    if (!j.success) return toast.error(j.message || "Could not delete");
    setRows((prev) => prev.filter((x) => x._id !== i._id));
    setModal(null);
    toast.success("Deleted");
  };
  const sortVal = (i, k) => {
    switch (k) {
      case "code":
        return invCode(i);
      case "prop":
        return propRef(i.proposalId);
      case "lead":
        return leadRef(i.leadId);
      case "amount":
        return i.amount || 0;
      case "gst":
        return gstAmt(i);
      case "total":
        return grand(i);
      case "pay":
        return received(i);
      case "status":
        return liveStatus(i);
      default:
        return String(i[k] ?? "");
    }
  };
  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((i) => {
      if (fStatus && liveStatus(i) !== fStatus) return false;
      if (fKind && i.kind !== fKind) return false;
      if (!needle) return true;
      return [invCode(i), propRef(i.proposalId), leadRef(i.leadId), i.co, i.contact, i.em, i.ref, i.owner].some((v) => String(v || "").toLowerCase().includes(needle));
    });
    return out.sort((a, b) => {
      const A = sortVal(a, sort.k), B = sortVal(b, sort.k);
      if (A === B) return 0;
      return (A > B ? 1 : -1) * sort.dir;
    });
  }, [rows, q, fStatus, fKind, sort]);
  const stats = useMemo(() => {
    const live = rows.filter((i) => i.status !== "Cancelled" && i.status !== "Draft");
    const late = rows.filter((i) => isLate(i));
    const due = live.filter((i) => i.status !== "Paid");
    return {
      raised: live.length,
      billed: live.reduce((a, i) => a + grand(i), 0),
      collected: rows.filter((i) => i.status !== "Cancelled").reduce((a, i) => a + received(i), 0),
      outstanding: due.reduce((a, i) => a + balance(i), 0),
      overdue: late.length,
      overdueValue: late.reduce((a, i) => a + grand(i), 0),
      drafts: rows.filter((i) => i.status === "Draft").length
    };
  }, [rows]);
  const shown = COLS.filter((c) => !hidden.includes(c.k));
  const pad = density === "compact" ? "6px 10px" : "10px 12px";
  const cell = (i, k) => {
    switch (k) {
      case "code":
        return /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 900, color: "#4338CA" } }, invCode(i));
      case "prop":
        return /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, color: i.proposalId ? "#4338CA" : "#CBD5E1" } }, propRef(i.proposalId));
      case "lead":
        return /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, color: "#4338CA" } }, leadRef(i.leadId));
      case "co":
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 24, height: 24, borderRadius: 8, background: "#6366F118", color: "#4338CA", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 900 } }, initials(i.co || i.contact || "?")), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis" } }, i.co || "\u2014"));
      case "contact":
        return i.contact || "\u2014";
      case "em":
        return i.em || "\u2014";
      case "svc":
        return i.svc || "\u2014";
      case "kind":
        return /* @__PURE__ */ React.createElement("span", { style: { ...s.tag, background: "#F1F5F9", color: "#475569" } }, i.kind, i.kind === "Monthly" && i.monthNo ? ` ${i.monthNo}/${i.ofMonths}` : "");
      case "amount":
        return inr(i.amount || 0);
      case "gst":
        return i.gstPct ? `${i.gstPct}% \xB7 ${inr(gstAmt(i))}` : "\u2014";
      case "total":
        return /* @__PURE__ */ React.createElement("b", { style: { fontWeight: 900, color: "#0F172A" } }, inr(grand(i)));
      case "pay": {
        const tot = grand(i), got = received(i), n = (i.payments || []).length;
        const pct = tot ? Math.min(100, Math.round(got / tot * 100)) : 0;
        const done = got > 0 && got >= tot;
        return /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 800 } }, /* @__PURE__ */ React.createElement("span", { style: { color: got ? done ? "#0F8A54" : "#B4690E" : "#94A3B8" } }, inr(got)), /* @__PURE__ */ React.createElement("span", { style: { color: "#CBD5E1" } }, "/"), /* @__PURE__ */ React.createElement("span", { style: { color: "#64748B" } }, inr(tot)), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("span", { style: {
          ...s.tag,
          padding: "1px 7px",
          fontSize: 9.5,
          background: n ? "#EEF2FF" : "#F5F5FA",
          color: n ? "#4338CA" : "#B6BECB"
        } }, n, " ", n === 1 ? "record" : "records")), /* @__PURE__ */ React.createElement("div", { style: { height: 5, borderRadius: 4, background: "#F1F1F8", marginTop: 5, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
          width: pct + "%",
          height: "100%",
          borderRadius: 4,
          background: done ? "#16A34A" : "#6366F1"
        } })));
      }
      case "issued":
        return i.issued ? fmtD(i.issued) : "\u2014";
      case "due":
        return i.due ? /* @__PURE__ */ React.createElement("span", { style: { color: isLate(i) ? "#C42525" : "#334155", fontWeight: isLate(i) ? 800 : 600 } }, fmtD(i.due)) : "\u2014";
      case "status": {
        const st = liveStatus(i);
        const m = statusMeta(st);
        return /* @__PURE__ */ React.createElement("span", { style: { ...s.tag, background: m.bg, color: m.fg } }, st);
      }
      case "paidOn":
        return i.paidOn ? fmtD(i.paidOn) : "\u2014";
      case "method":
        return i.method || "\u2014";
      case "ref":
        return i.ref || "\u2014";
      case "owner":
        return i.owner || "\u2014";
      default:
        return "";
    }
  };
  return /* @__PURE__ */ React.createElement("section", { className: "main-dashboard-area" }, /* @__PURE__ */ React.createElement(Head, null, /* @__PURE__ */ React.createElement("title", null, "Invoices \u2014 Website")), /* @__PURE__ */ React.createElement(Toaster, { position: "top-right" }), /* @__PURE__ */ React.createElement("div", { className: "main-nav" }, /* @__PURE__ */ React.createElement(WebsiteLeftbar, null), /* @__PURE__ */ React.createElement(LeftbarMobile, null), /* @__PURE__ */ React.createElement(Dashnav, null), /* @__PURE__ */ React.createElement("section", { className: "content home" }, /* @__PURE__ */ React.createElement("div", { className: "block-header" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" } }, "Invoices"), /* @__PURE__ */ React.createElement("p", { style: { margin: "3px 0 0", fontSize: 12.5, color: "#94A3B8" } }, "Raised off an accepted proposal \u2014 the advance first, then one a month for the retainer.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(Link, { href: "/dashboard/website/proposals", style: { ...s.miniBtn, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-file-earmark-text-fill", style: { fontSize: 11 } }), " Proposals"), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "new" }), style: s.primaryBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg", style: { fontSize: 12 } }), " New invoice"))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 11, margin: "16px 0" } }, /* @__PURE__ */ React.createElement(Metric, { icon: "bi-receipt", label: "Invoices out", value: stats.raised, sub: `${stats.drafts} still draft`, accent: { bg: "#EEF2FF", icon: "#6366F1" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-cash-stack", label: "Billed", value: inr(stats.billed), sub: "including GST", accent: { bg: "#E0F2FE", icon: "#0EA5E9" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-check2-circle", label: "Collected", value: inr(stats.collected), accent: { bg: "#DCFCE7", icon: "#16A34A" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-hourglass-split", label: "Outstanding", value: inr(stats.outstanding), sub: "not paid yet", accent: { bg: "#FEF3C7", icon: "#F59E0B" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-exclamation-octagon-fill", label: "Overdue", value: stats.overdue, sub: inr(stats.overdueValue), accent: { bg: "#FFE4E6", icon: "#F43F5E" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-percent", label: "Collection rate", value: `${stats.billed ? Math.round(stats.collected / stats.billed * 100) : 0}%`, sub: "of what went out", accent: { bg: "#F3E8FF", icon: "#9333EA" } })), stats.overdue > 0 ? /* @__PURE__ */ React.createElement("div", { style: {
    display: "flex",
    gap: 11,
    alignItems: "flex-start",
    padding: "12px 15px",
    borderRadius: 14,
    background: "#FFF4F4",
    border: "1px solid #F8D4D4",
    marginBottom: 14
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-exclamation-octagon-fill", style: { fontSize: 16, color: "#C42525", marginTop: 1 } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: "#8A2020", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("b", null, stats.overdue, " ", stats.overdue === 1 ? "invoice is" : "invoices are", " past their due date"), " \u2014", " ", inr(stats.overdueValue), " sitting with clients. Chase them before the next one goes out.", /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setFStatus("Overdue");
    setQ("");
  }, style: { ...s.miniBtn, marginLeft: 10, height: 26 } }, "Show them"))) : null, /* @__PURE__ */ React.createElement("div", { style: s.panel }, /* @__PURE__ */ React.createElement("div", { style: s.panelHead }, /* @__PURE__ */ React.createElement("div", { style: s.panelIcon }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-bank" })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13.5, fontWeight: 900, color: "#0F172A" } }, "All invoices"), /* @__PURE__ */ React.createElement("span", { style: { ...s.tag, background: "#EEF2FF", color: "#4338CA" } }, view.length), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      placeholder: "Search invoice, company, UTR\u2026",
      value: q,
      onChange: (e) => setQ(e.target.value),
      style: { ...s.input, width: 225, height: 32 }
    }
  ), /* @__PURE__ */ React.createElement("select", { className: "lp-in", value: fStatus, onChange: (e) => setFStatus(e.target.value), style: { ...s.input, width: 140, height: 32 } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All statuses"), STATUSES.map((x) => /* @__PURE__ */ React.createElement("option", { key: x, value: x }, x))), /* @__PURE__ */ React.createElement("select", { className: "lp-in", value: fKind, onChange: (e) => setFKind(e.target.value), style: { ...s.input, width: 130, height: 32 } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All kinds"), KINDS.map((x) => /* @__PURE__ */ React.createElement("option", { key: x, value: x }, x))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", borderRadius: 9, border: "1px solid #E7E7F2", overflow: "hidden" } }, ["comfortable", "compact"].map((d) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: d,
      onClick: () => setDens(d),
      style: {
        height: 32,
        padding: "0 11px",
        border: "none",
        cursor: "pointer",
        fontSize: 11.5,
        fontWeight: 800,
        background: density === d ? "#EEF2FF" : "#fff",
        color: density === d ? "#4338CA" : "#94A3B8",
        textTransform: "capitalize"
      }
    },
    d
  ))), /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setColsOpen((v) => !v), style: { ...s.miniBtn, height: 32 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-layout-three-columns", style: { fontSize: 11 } }), " Columns ", shown.length, "/", COLS.length), colsOpen ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { onClick: () => setColsOpen(false), style: { position: "fixed", inset: 0, zIndex: 30 } }), /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: {
    position: "absolute",
    right: 0,
    top: 38,
    zIndex: 31,
    width: 215,
    maxHeight: 320,
    overflowY: "auto",
    background: "#fff",
    border: "1px solid #F0F0F8",
    borderRadius: 12,
    boxShadow: "0 14px 34px rgba(15,23,42,.14)",
    padding: 8
  } }, COLS.map((c) => /* @__PURE__ */ React.createElement("label", { key: c.k, style: { display: "flex", alignItems: "center", gap: 8, padding: "5px 7px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#334155" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: !hidden.includes(c.k), onChange: () => toggleCol(c.k), style: { accentColor: "#6366F1", cursor: "pointer" } }), c.n)))) : null)), /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: shown.reduce((a, c) => a + c.w, 60) } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, shown.map((c) => /* @__PURE__ */ React.createElement(
    "th",
    {
      key: c.k,
      onClick: () => setSort((p) => ({ k: c.k, dir: p.k === c.k ? -p.dir : 1 })),
      style: { ...s.th, width: c.w, minWidth: c.w, cursor: "pointer" }
    },
    c.n,
    /* @__PURE__ */ React.createElement(
      "i",
      {
        className: `bi ${sort.k === c.k ? sort.dir === 1 ? "bi-caret-up-fill" : "bi-caret-down-fill" : "bi-chevron-expand"}`,
        style: { fontSize: 8.5, marginLeft: 4, opacity: sort.k === c.k ? 1 : 0.35 }
      }
    )
  )), /* @__PURE__ */ React.createElement("th", { style: { ...s.th, width: 132, minWidth: 132, textAlign: "right" } }, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, loading ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: shown.length + 1, style: { padding: 30, textAlign: "center", color: "#94A3B8", fontSize: 13 } }, "Loading\u2026")) : !view.length ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: shown.length + 1, style: { padding: 30, textAlign: "center", color: "#94A3B8", fontSize: 13 } }, "Nothing here yet. Accept a proposal, then raise its invoice schedule.")) : view.map((i) => /* @__PURE__ */ React.createElement("tr", { key: i._id, className: "lp-row" }, shown.map((c) => /* @__PURE__ */ React.createElement(
    "td",
    {
      key: c.k,
      className: "lp-cell",
      onClick: () => setModal(c.k === "pay" ? { type: "records", inv: i } : { type: "panel", inv: i, panel: PANEL_OF[c.k] || "record" }),
      style: { ...s.td, padding: pad, width: c.w, minWidth: c.w, cursor: "pointer" }
    },
    cell(i, c.k)
  )), /* @__PURE__ */ React.createElement("td", { style: { ...s.td, padding: pad, whiteSpace: "nowrap" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setModal({ type: "pdf", inv: i }),
      style: { ...s.iconBtn, borderColor: "#C7D2FE", color: "#4338CA" },
      title: "Preview / PDF"
    },
    /* @__PURE__ */ React.createElement("i", { className: "bi bi-file-earmark-pdf-fill", style: { fontSize: 12 } })
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "records", inv: i }), style: s.iconBtn, title: "Payment records" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-journal-check", style: { fontSize: 12 } })), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setModal({ type: "mail", inv: i, markSent: i.status === "Draft" }),
      style: s.iconBtn,
      title: "Send the invoice by mail"
    },
    /* @__PURE__ */ React.createElement("i", { className: "bi bi-envelope-fill", style: { fontSize: 12 } })
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => remove(i), style: { ...s.iconBtn, color: "#C42525" }, title: "Delete" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-trash3-fill", style: { fontSize: 12 } }))))))))), /* @__PURE__ */ React.createElement("div", { style: {
    padding: "10px 16px",
    borderTop: "1px solid #F4F4FD",
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: 600,
    display: "flex",
    gap: 16,
    flexWrap: "wrap"
  } }, /* @__PURE__ */ React.createElement("span", null, view.length, " of ", rows.length, " invoices"), /* @__PURE__ */ React.createElement("span", null, "Total shown ", inr(view.reduce((a, i) => a + grand(i), 0))), /* @__PURE__ */ React.createElement("span", null, COLS.length - shown.length, " columns hidden")))))), modal?.type === "new" ? /* @__PURE__ */ React.createElement(
    NewInvoice,
    {
      proposals,
      leads,
      proposalId: modal.proposalId,
      billed: new Set(rows.filter((i) => i.proposalId).map((i) => String(i.proposalId))),
      onClose: () => setModal(null),
      onDone: () => {
        setModal(null);
        load();
      }
    }
  ) : null, modal?.type === "panel" ? (() => {
    const live = rows.find((x) => x._id === modal.inv._id) || modal.inv;
    const meta = PANEL_META[modal.panel] || PANEL_META.record;
    return /* @__PURE__ */ React.createElement(Modal, { title: `${meta.t} \xB7 ${invCode(live)}`, icon: meta.i, onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement(
      Panel,
      {
        which: modal.panel,
        i: live,
        busy,
        patch,
        mail: (markSent) => setModal({ type: "mail", inv: live, markSent }),
        records: () => setModal({ type: "records", inv: live }),
        pdf: () => setModal({ type: "pdf", inv: live }),
        go: (pn) => setModal({ type: "panel", inv: live, panel: pn })
      }
    ));
  })() : null, modal?.type === "records" ? (() => {
    const live = rows.find((x) => x._id === modal.inv._id) || modal.inv;
    return /* @__PURE__ */ React.createElement(Modal, { title: `Payment records \xB7 ${invCode(live)}`, icon: "bi-journal-check", wide: true, onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement(
      PayRecords,
      {
        i: live,
        busy,
        patch,
        mail: (paymentId, final) => setModal({
          type: "mail",
          inv: live,
          paymentId,
          back: true,
          title: final ? "Send the final invoice" : "Send the part-paid invoice"
        }),
        preview: (paymentId) => setModal({
          type: "pdf",
          inv: live,
          paymentId,
          back: { type: "records", inv: live }
        })
      }
    ));
  })() : null, modal?.type === "mail" ? /* @__PURE__ */ React.createElement(
    MailCompose,
    {
      url: `/api/admin/invoices/${modal.inv._id}/mail`,
      kind: "invoice",
      markSent: modal.markSent,
      extra: modal.paymentId ? { paymentId: modal.paymentId } : null,
      title: modal.title || (modal.markSent ? "Send the invoice" : "Mail the invoice again"),
      onPreview: () => setModal({ type: "pdf", inv: modal.inv, paymentId: modal.paymentId, back: modal }),
      onClose: () => setModal(modal.back ? { type: "records", inv: modal.inv } : null),
      onSent: load
    }
  ) : null, modal?.type === "pdf" ? (() => {
    const live = rows.find((x) => x._id === modal.inv._id) || modal.inv;
    return /* @__PURE__ */ React.createElement(
      DocPreview,
      {
        kind: "invoice",
        doc: asOfPayment(live, modal.paymentId),
        onClose: () => setModal(modal.back || null)
      }
    );
  })() : null, /* @__PURE__ */ React.createElement("style", { jsx: true, global: true }, `
        .lp-row:hover { background: #FAFAFE; }
        .lp-cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lp-in:focus { outline: none; border-color: #818CF8; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
        .lp-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .lp-scroll::-webkit-scrollbar-thumb { background: #DDDDEB; border-radius: 8px; }
      `));
}
function Panel({ which, i, busy, patch, go, pdf, mail, records }) {
  switch (which) {
    case "record":
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(KV, { k: "Invoice", v: invCode(i) }), /* @__PURE__ */ React.createElement(KV, { k: "Against proposal", v: propRef(i.proposalId) }), /* @__PURE__ */ React.createElement(KV, { k: "Lead", v: leadRef(i.leadId) }), /* @__PURE__ */ React.createElement(KV, { k: "Company", v: i.co || "\u2014" }), /* @__PURE__ */ React.createElement(KV, { k: "Contact", v: i.contact || "\u2014" }), /* @__PURE__ */ React.createElement(KV, { k: "Email", v: i.em || "\u2014" }), /* @__PURE__ */ React.createElement(KV, { k: "Phone", v: i.ph || "\u2014" }), i.billTo?.address ? /* @__PURE__ */ React.createElement(KV, { k: "Address", v: i.billTo.address }) : null, [i.billTo?.city, i.billTo?.state, i.billTo?.pincode].filter(Boolean).length ? /* @__PURE__ */ React.createElement(KV, { k: "City", v: [i.billTo?.city, i.billTo?.state, i.billTo?.pincode].filter(Boolean).join(", ") }) : null, i.billTo?.gstin ? /* @__PURE__ */ React.createElement(KV, { k: "Their GSTIN", v: i.billTo.gstin }) : null, i.poRef ? /* @__PURE__ */ React.createElement(KV, { k: "PO / reference", v: i.poRef }) : null, /* @__PURE__ */ React.createElement(KV, { k: "Raised on", v: fmtDT(i.createdAt) }), i.notes ? /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, marginTop: 12, fontSize: 12, color: "#475569", lineHeight: 1.55 } }, i.notes) : null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(Link, { href: `/dashboard/website/lead-profile?lead=${i.leadId}`, style: { ...s.miniBtn, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-person-vcard-fill", style: { fontSize: 11 } }), " Lead profile"), /* @__PURE__ */ React.createElement(Link, { href: "/dashboard/website/proposals", style: { ...s.miniBtn, textDecoration: "none" } }, "Proposals"), i.em ? /* @__PURE__ */ React.createElement("a", { href: `mailto:${i.em}`, style: { ...s.miniBtn, textDecoration: "none" } }, "Mail them") : null, /* @__PURE__ */ React.createElement("button", { onClick: () => go("billto"), style: s.miniBtn }, "Edit the billing details"), /* @__PURE__ */ React.createElement("button", { onClick: () => go("payment"), style: s.miniBtn }, "Payment"), /* @__PURE__ */ React.createElement("button", { onClick: () => pdf?.(), style: s.primaryBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-file-earmark-pdf-fill", style: { fontSize: 12 } }), " Preview / PDF")));
    case "billto":
      return /* @__PURE__ */ React.createElement(BillTo, { i, busy, patch });
    case "amounts": {
      return /* @__PURE__ */ React.createElement(Amounts, { i, busy, patch });
    }
    case "dates":
      return /* @__PURE__ */ React.createElement(Dates, { i, busy, patch });
    case "payment":
      return /* @__PURE__ */ React.createElement(Payment, { i, busy, patch, mail, records });
    case "owner":
      return /* @__PURE__ */ React.createElement(Owner, { i, busy, patch });
    default:
      return null;
  }
}
function BillTo({ i, busy, patch }) {
  const b = i.billTo || {};
  const [f, setF] = useState({
    co: i.co || "",
    contact: i.contact || "",
    em: i.em || "",
    ph: i.ph || "",
    poRef: i.poRef || "",
    address: b.address || "",
    city: b.city || "",
    state: b.state || "",
    pincode: b.pincode || "",
    gstin: b.gstin || ""
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = () => patch(i._id, {
    co: f.co,
    contact: f.contact,
    em: f.em,
    ph: f.ph,
    poRef: f.poRef,
    billTo: { address: f.address, city: f.city, state: f.state, pincode: f.pincode, gstin: f.gstin }
  });
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "Company" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.co, onChange: (e) => set("co", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Contact person" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.contact, onChange: (e) => set("contact", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Email" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "email", value: f.em, onChange: (e) => set("em", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Phone" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.ph, onChange: (e) => set("ph", e.target.value) }))), /* @__PURE__ */ React.createElement(Field, { label: "Billing address" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: f.address,
      onChange: (e) => set("address", e.target.value),
      placeholder: "Street, building, floor"
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "City" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.city, onChange: (e) => set("city", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "State", hint: "Decides CGST + SGST or IGST." }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.state, onChange: (e) => set("state", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Pincode" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      inputMode: "numeric",
      value: f.pincode,
      onChange: (e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "Their GSTIN" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: f.gstin,
      onChange: (e) => set("gstin", e.target.value.toUpperCase().slice(0, 15)),
      placeholder: "Optional"
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "PO / reference" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.poRef, onChange: (e) => set("poRef", e.target.value) }))), /* @__PURE__ */ React.createElement("button", { onClick: save, disabled: busy, style: { ...s.primaryBtn, opacity: busy ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-check2", style: { fontSize: 12 } }), " Save the billing details"));
}
function Amounts({ i, busy, patch }) {
  const svcList = useList("services", SERVICES);
  const [f, setF] = useState({ kind: i.kind, gstPct: String(i.gstPct ?? 18) });
  const [items, setItems] = useState(() => docItems(i));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const locked = i.status === "Paid" || i.status === "Partly paid";
  const amt = itemsTotal(items), g = Math.round(amt * Number(f.gstPct || 0) / 100);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(KV, { k: "For", v: `${i.kind}${i.kind === "Monthly" && i.monthNo ? ` \u2014 month ${i.monthNo} of ${i.ofMonths}` : ""}` }), docItems(i).map((it, n) => /* @__PURE__ */ React.createElement(KV, { key: n, k: it.svc || "Service", v: inr(it.amount || 0) })), /* @__PURE__ */ React.createElement(KV, { k: "Amount", v: inr(i.amount || 0) }), /* @__PURE__ */ React.createElement(KV, { k: "GST", v: i.gstPct ? `${i.gstPct}% \xB7 ${inr(gstAmt(i))}` : "\u2014" }), /* @__PURE__ */ React.createElement(KV, { k: "Total", v: inr(grand(i)) }), locked ? /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, marginTop: 12, fontSize: 12, color: "#64748B", lineHeight: 1.55 } }, "It has been paid, so the figures are frozen. Raise a credit note by hand if something was wrong.") : /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement(ServiceLines, { items, setItems, svcList, ui: s, label: "Lines on this invoice" }), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "For" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.kind, onChange: (e) => set("kind", e.target.value) }, KINDS.map((x) => /* @__PURE__ */ React.createElement("option", { key: x, value: x }, x)))), /* @__PURE__ */ React.createElement(Field, { label: "GST %" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      inputMode: "numeric",
      value: f.gstPct,
      onChange: (e) => set("gstPct", e.target.value.replace(/\D/g, "").slice(0, 2))
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, marginBottom: 12 } }, /* @__PURE__ */ React.createElement(KV, { k: "GST on it", v: inr(g) }), /* @__PURE__ */ React.createElement(KV, { k: "Client pays", v: inr(amt + g) })), /* @__PURE__ */ React.createElement("button", { onClick: () => patch(i._id, { ...f, items }), disabled: busy, style: { ...s.primaryBtn, opacity: busy ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-check2", style: { fontSize: 12 } }), " Save")));
}
function Dates({ i, busy, patch }) {
  const [f, setF] = useState({ issued: i.issued || "", due: i.due || "" });
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(KV, { k: "Issued", v: i.issued ? fmtD(i.issued) : "\u2014" }), /* @__PURE__ */ React.createElement(KV, { k: "Due", v: i.due ? fmtD(i.due) : "\u2014" }), /* @__PURE__ */ React.createElement(KV, { k: "Paid on", v: i.paidOn ? fmtD(i.paidOn) : "\u2014" }), isLate(i) ? /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, marginTop: 12, fontSize: 12, color: "#8A2020", background: "#FFF4F4", border: "1px solid #F8D4D4", lineHeight: 1.55 } }, "Past its due date and still unpaid.") : null, /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "Issued" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "date", value: f.issued, onChange: (e) => setF((x) => ({ ...x, issued: e.target.value })) })), /* @__PURE__ */ React.createElement(Field, { label: "Due" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "date", value: f.due, onChange: (e) => setF((x) => ({ ...x, due: e.target.value })) }))), /* @__PURE__ */ React.createElement("button", { onClick: () => patch(i._id, f), disabled: busy, style: { ...s.primaryBtn, opacity: busy ? 0.5 : 1 } }, "Save the dates"));
}
function Payment({ i, busy, patch, mail, records }) {
  const [f, setF] = useState({ method: i.method || "", ref: i.ref || "", paidOn: i.paidOn || todayStr(), amount: "" });
  const st = liveStatus(i);
  const m = statusMeta(st);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(KV, { k: "Status", v: /* @__PURE__ */ React.createElement("span", { style: { ...s.tag, background: m.bg, color: m.fg } }, st) }), /* @__PURE__ */ React.createElement(KV, { k: "Client pays", v: inr(grand(i)) }), /* @__PURE__ */ React.createElement(KV, { k: "Received", v: inr(received(i)) }), /* @__PURE__ */ React.createElement(KV, { k: "Balance", v: /* @__PURE__ */ React.createElement("span", { style: { color: balance(i) ? "#B4690E" : "#0F8A54", fontWeight: 800 } }, inr(balance(i))) }), /* @__PURE__ */ React.createElement(KV, { k: "Due", v: i.due ? fmtD(i.due) : "\u2014" }), /* @__PURE__ */ React.createElement(KV, { k: "Paid on", v: i.paidOn ? fmtD(i.paidOn) : "\u2014" }), /* @__PURE__ */ React.createElement(KV, { k: "How", v: i.method || "\u2014" }), /* @__PURE__ */ React.createElement(KV, { k: "Reference", v: i.ref || "\u2014" }), /* @__PURE__ */ React.createElement(PayHistory, { i }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => records?.(), style: s.miniBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-journal-check", style: { fontSize: 11 } }), " Open payment records")), i.status === "Paid" ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#0F8A54", fontWeight: 700, alignSelf: "center" } }, "Settled."), /* @__PURE__ */ React.createElement("button", { onClick: () => mail?.(false), disabled: busy, style: s.primaryBtnSm }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-envelope-paper-fill", style: { fontSize: 12 } }), " Mail the final invoice"), /* @__PURE__ */ React.createElement("button", { onClick: () => patch(i._id, { clearPayments: true, status: "Sent" }), disabled: busy, style: s.miniBtn }, "Undo")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, margin: "14px 0", flexWrap: "wrap" } }, i.status === "Draft" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: () => mail?.(true), disabled: busy, style: s.primaryBtnSm }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-envelope-paper-fill", style: { fontSize: 12 } }), " Mail it to the client"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => patch(i._id, { status: "Sent" }),
      disabled: busy,
      style: s.miniBtn,
      title: "Only marks it sent \u2014 no mail goes out"
    },
    "Mark as sent"
  )) : /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => mail?.(false),
      disabled: busy,
      style: s.miniBtn,
      title: "Opens the mail with the invoice PDF attached"
    },
    /* @__PURE__ */ React.createElement("i", { className: "bi bi-envelope-fill", style: { fontSize: 12 } }),
    " Mail it again"
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => patch(i._id, { status: "Cancelled" }), disabled: busy, style: { ...s.miniBtn, color: "#C42525", borderColor: "#F6D0D0" } }, "Cancel it")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "Amount received", hint: `Leave it blank to record the whole balance of ${inr(balance(i))}.` }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      inputMode: "numeric",
      placeholder: String(balance(i)),
      value: f.amount,
      onChange: (e) => setF((x) => ({ ...x, amount: e.target.value.replace(/[^0-9]/g, "") }))
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Paid on" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "date", value: f.paidOn, onChange: (e) => setF((x) => ({ ...x, paidOn: e.target.value })) })), /* @__PURE__ */ React.createElement(Field, { label: "How" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.method, onChange: (e) => setF((x) => ({ ...x, method: e.target.value })) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), METHODS.map((x) => /* @__PURE__ */ React.createElement("option", { key: x, value: x }, x))))), /* @__PURE__ */ React.createElement(Field, { label: "Reference", hint: "UTR, cheque number, whatever the bank shows." }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.ref, onChange: (e) => setF((x) => ({ ...x, ref: e.target.value })) })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        const amt = Number(f.amount || 0) || balance(i);
        if (amt > balance(i)) return toast.error("That is more than the balance left");
        patch(i._id, { payment: { amount: amt, on: f.paidOn, method: f.method, ref: f.ref } });
        setF((x) => ({ ...x, amount: "" }));
      },
      disabled: busy,
      style: { ...s.primaryBtn, opacity: busy ? 0.5 : 1 }
    },
    /* @__PURE__ */ React.createElement("i", { className: "bi bi-check2-circle", style: { fontSize: 12 } }),
    Number(f.amount || 0) && Number(f.amount) < balance(i) ? " Record a part payment" : " Record the payment"
  ), received(i) ? /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => mail?.(false),
      disabled: busy,
      style: s.miniBtn,
      title: "Mails the part-paid invoice with the payments listed on it"
    },
    /* @__PURE__ */ React.createElement("i", { className: "bi bi-envelope-fill", style: { fontSize: 12 } }),
    " Mail the receipt"
  ) : null)));
}
function PayRecords({ i, busy, patch, mail, preview }) {
  const rows = i.payments || [];
  const total = grand(i), got = received(i), left = balance(i);
  const pct = total ? Math.min(100, Math.round(got / total * 100)) : 0;
  const settled = got > 0 && left <= 0;
  const [editId, setEditId] = useState("");
  const [f, setF] = useState({ amount: "", on: todayStr(), method: "", ref: "" });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const reset = () => {
    setEditId("");
    setF({ amount: "", on: todayStr(), method: "", ref: "" });
  };
  const startEdit = (p) => {
    setEditId(String(p._id || ""));
    setF({ amount: String(p.amount || ""), on: p.on || todayStr(), method: p.method || "", ref: p.ref || "" });
  };
  let run = 0;
  const book = rows.map((p, n) => {
    run += Number(p.amount || 0);
    return { p, n, after: Math.max(0, total - run), clears: run >= total };
  });
  const save = async () => {
    const typed = Number(f.amount || 0);
    const amt = typed || (editId ? 0 : left);
    if (!(amt > 0)) return toast.error("Enter the amount that came in");
    const others = got - (editId ? Number(rows.find((r) => String(r._id) === editId)?.amount || 0) : 0);
    if (others + amt > total) return toast.error("That is more than the invoice total");
    const out = editId ? await patch(i._id, { editPayment: { _id: editId, amount: amt, on: f.on, method: f.method, ref: f.ref } }) : await patch(i._id, { payment: { amount: amt, on: f.on, method: f.method, ref: f.ref } });
    if (out) reset();
  };
  const del = async (p) => {
    if (!await confirmDialog(`Delete the payment of ${inr(p.amount)} recorded on ${p.on ? fmtD(p.on) : "an unknown date"}? This cannot be undone.`)) return;
    const out = await patch(i._id, { deletePayment: { _id: String(p._id || "") } });
    if (out && String(p._id || "") === editId) reset();
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(Stat, { label: "Invoice total", value: inr(total) }), /* @__PURE__ */ React.createElement(Stat, { label: "Received", value: inr(got), tone: got ? "#0F8A54" : "#94A3B8" }), /* @__PURE__ */ React.createElement(Stat, { label: "Balance", value: inr(left), tone: left ? "#B4690E" : "#0F8A54" }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { ...s.tag, background: settled ? "#DCFCE7" : "#FEF3C7", color: settled ? "#0F8A54" : "#B4690E" } }, settled ? "Settled in full" : `${pct}% collected`)), /* @__PURE__ */ React.createElement("div", { style: { height: 7, borderRadius: 5, background: "#EFEFF7", marginTop: 11, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { width: pct + "%", height: "100%", borderRadius: 5, background: settled ? "#16A34A" : "#6366F1" } }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 7 } }, "Records (", rows.length, ")"), /* @__PURE__ */ React.createElement("div", { style: { border: "1px solid #F0F0F8", borderRadius: 12, overflow: "hidden", marginBottom: 16 } }, !rows.length ? /* @__PURE__ */ React.createElement("div", { style: { padding: 22, textAlign: "center", color: "#94A3B8", fontSize: 12.5 } }, "Nothing received yet. Record the first payment below.") : /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: 620 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { ...s.th, width: 34 } }, "#"), /* @__PURE__ */ React.createElement("th", { style: { ...s.th, width: 104 } }, "Date"), /* @__PURE__ */ React.createElement("th", { style: { ...s.th, width: 110, textAlign: "right" } }, "Amount"), /* @__PURE__ */ React.createElement("th", { style: { ...s.th, width: 110 } }, "How"), /* @__PURE__ */ React.createElement("th", { style: { ...s.th } }, "Reference"), /* @__PURE__ */ React.createElement("th", { style: { ...s.th, width: 112, textAlign: "right" } }, "Balance after"), /* @__PURE__ */ React.createElement("th", { style: { ...s.th, width: 138, textAlign: "right" } }, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, book.map(({ p, n, after, clears }) => {
    const on = String(p._id || "") === editId;
    return /* @__PURE__ */ React.createElement("tr", { key: p._id || n, style: { background: on ? "#F7F7FE" : "transparent" } }, /* @__PURE__ */ React.createElement("td", { style: { ...s.td, padding: "9px 12px", color: "#94A3B8", fontWeight: 800 } }, n + 1), /* @__PURE__ */ React.createElement("td", { style: { ...s.td, padding: "9px 12px", fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" } }, p.on ? fmtD(p.on) : "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { ...s.td, padding: "9px 12px", textAlign: "right", fontWeight: 900, color: "#0F8A54", whiteSpace: "nowrap" } }, inr(p.amount)), /* @__PURE__ */ React.createElement("td", { style: { ...s.td, padding: "9px 12px" } }, p.method || "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { ...s.td, padding: "9px 12px", color: "#64748B" } }, p.ref || "\u2014"), /* @__PURE__ */ React.createElement("td", { style: {
      ...s.td,
      padding: "9px 12px",
      textAlign: "right",
      fontWeight: 800,
      whiteSpace: "nowrap",
      color: after ? "#B4690E" : "#0F8A54"
    } }, inr(after)), /* @__PURE__ */ React.createElement("td", { style: { ...s.td, padding: "9px 12px", whiteSpace: "nowrap" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => mail?.(String(p._id || ""), clears),
        disabled: busy || !p._id,
        style: { ...s.iconBtn, borderColor: "#C7D2FE", color: "#4338CA" },
        title: clears ? "Send the final invoice for this payment" : "Send the invoice as of this payment"
      },
      /* @__PURE__ */ React.createElement("i", { className: "bi bi-send-fill", style: { fontSize: 11 } })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => preview?.(String(p._id || "")),
        disabled: busy || !p._id,
        style: s.iconBtn,
        title: clears ? "Preview the final invoice" : "Preview the part-paid invoice"
      },
      /* @__PURE__ */ React.createElement("i", { className: "bi bi-eye-fill", style: { fontSize: 11 } })
    ), /* @__PURE__ */ React.createElement("button", { onClick: () => startEdit(p), disabled: busy, style: s.iconBtn, title: "Edit this record" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-pencil-fill", style: { fontSize: 11 } })), /* @__PURE__ */ React.createElement("button", { onClick: () => del(p), disabled: busy, style: { ...s.iconBtn, color: "#C42525" }, title: "Delete this record" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-trash3-fill", style: { fontSize: 11 } })))));
  }))))), /* @__PURE__ */ React.createElement("div", { style: {
    border: `1px solid ${editId ? "#C7D2FE" : "#F0F0F8"}`,
    borderRadius: 12,
    padding: 14,
    background: editId ? "#FAFAFF" : "#fff"
  } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, fontWeight: 900, color: "#0F172A" } }, editId ? "Edit this payment record" : "Record a payment"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), editId ? /* @__PURE__ */ React.createElement("button", { onClick: reset, style: s.miniBtn }, "Cancel") : null), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "Amount (\u20B9)", hint: editId ? "" : `Blank records the whole balance of ${inr(left)}.` }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      inputMode: "numeric",
      placeholder: String(left),
      value: f.amount,
      onChange: (e) => set("amount", e.target.value.replace(/[^0-9]/g, ""))
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Received on" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "date", value: f.on, onChange: (e) => set("on", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "How" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.method, onChange: (e) => set("method", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), METHODS.map((x) => /* @__PURE__ */ React.createElement("option", { key: x, value: x }, x)))), /* @__PURE__ */ React.createElement(Field, { label: "Reference", hint: "UTR, cheque number, whatever the bank shows." }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.ref, onChange: (e) => set("ref", e.target.value) }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: save, disabled: busy, style: { ...s.primaryBtn, opacity: busy ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${editId ? "bi-check2" : "bi-plus-lg"}`, style: { fontSize: 12 } }), editId ? " Save the record" : " Add the record"), rows.length ? /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => patch(i._id, { clearPayments: true, status: "Sent" }),
      disabled: busy,
      style: { ...s.miniBtn, height: 36, color: "#C42525", borderColor: "#F6D0D0" },
      title: "Removes every payment record on this invoice"
    },
    "Clear all records"
  ) : null)));
}
function Stat({ label, value, tone }) {
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8" } }, label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 900, color: tone || "#0F172A", lineHeight: 1.25 } }, value));
}
function PayHistory({ i }) {
  const rows = i.payments || [];
  if (!rows.length) return null;
  return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 7 } }, "Payments received"), /* @__PURE__ */ React.createElement("div", { style: { border: "1px solid #F0F0F8", borderRadius: 12, overflow: "hidden" } }, rows.map((p, n) => /* @__PURE__ */ React.createElement("div", { key: n, style: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderTop: n ? "1px solid #F5F5FB" : "none",
    fontSize: 12.5
  } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#0F172A", fontWeight: 700 } }, p.on ? fmtD(p.on) : "\u2014"), /* @__PURE__ */ React.createElement("span", { style: { color: "#64748B" } }, p.method || "\u2014"), p.ref ? /* @__PURE__ */ React.createElement("span", { style: { color: "#94A3B8" } }, p.ref) : null, /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, color: "#0F8A54" } }, inr(p.amount))))));
}
function Owner({ i, busy, patch }) {
  const [owner, setOwner] = useState(i.owner || "");
  const [notes, setNotes] = useState(i.notes || "");
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(KV, { k: "Owner", v: i.owner || "\u2014" }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "Who is chasing it" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: owner, onChange: (e) => setOwner(e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Notes" }, /* @__PURE__ */ React.createElement("textarea", { className: "lp-in", style: { ...s.input, height: 80, padding: "9px 11px", resize: "vertical" }, value: notes, onChange: (e) => setNotes(e.target.value) })), /* @__PURE__ */ React.createElement("button", { onClick: () => patch(i._id, { owner, notes }), disabled: busy, style: { ...s.primaryBtn, opacity: busy ? 0.5 : 1 } }, "Save")));
}
function Section({ n }) {
  return /* @__PURE__ */ React.createElement("div", { style: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4338CA",
    letterSpacing: ".04em",
    textTransform: "uppercase",
    margin: "16px 0 8px"
  } }, n);
}
function NewInvoice({ proposals, leads, proposalId, billed, onClose, onDone }) {
  const svcList = useList("services", SERVICES);
  const st = useCrmSettings();
  const accepted = proposals.filter((p2) => p2.status === "Accepted" && !billed?.has(String(p2._id)));
  const [mode, setMode] = useState("schedule");
  const [pid, setPid] = useState(proposalId || "");
  const [gstPct, setGst] = useState("18");
  const [issued, setIssued] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    leadId: "",
    kind: "One time",
    gstPct: "18",
    issued: todayStr(),
    due: "",
    owner: "",
    notes: "",
    co: "",
    contact: "",
    em: "",
    ph: "",
    poRef: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: ""
  });
  const [items, setItems] = useState([{ svc: "", note: "", amount: 0 }]);
  const sub = itemsTotal(items);
  const tax = Math.round(sub * Number(f.gstPct || 0) / 100);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const dGst = st?.docs?.gstPct, dDue = st?.docs?.dueDays;
  useEffect(() => {
    if (dGst === void 0 && dDue === void 0) return;
    if (dGst !== void 0) setGst(String(dGst));
    setF((x) => ({
      ...x,
      gstPct: dGst !== void 0 ? String(dGst) : x.gstPct,
      due: x.due || (dDue ? new Date(new Date(x.issued).getTime() + dDue * 864e5).toISOString().slice(0, 10) : x.due)
    }));
  }, [dGst, dDue]);
  useEffect(() => {
    const l = leads.find((x) => x._id === f.leadId);
    if (!l) return;
    setF((x) => ({
      ...x,
      co: x.co || l.businessName || l.name || "",
      contact: x.contact || l.name || "",
      em: x.em || l.email || "",
      ph: x.ph || l.phone || "",
      city: x.city || l.city || ""
    }));
  }, [f.leadId]);
  const p = proposals.find((x) => x._id === pid);
  const adv = p ? Math.round((p.amount || 0) * (p.advPct || 0) / 100) : 0;
  const months = p && p.term === "Retainer" ? Math.max(1, Number(p.months || 1)) : 0;
  const per = p && months ? Math.round(((p.amount || 0) - adv) / months) : 0;
  const rest = p ? (p.amount || 0) - adv : 0;
  const save = async () => {
    setSaving(true);
    try {
      const body = mode === "schedule" ? { schedule: true, proposalId: pid, gstPct, issued } : {
        ...f,
        items,
        billTo: { address: f.address, city: f.city, state: f.state, pincode: f.pincode, gstin: f.gstin }
      };
      if (mode === "schedule" && !pid) throw new Error("Pick the proposal");
      if (mode === "one") {
        if (!f.leadId) throw new Error("Pick the lead this is for");
        if (!items.some((x) => x.svc)) throw new Error("Pick at least one service");
        if (!sub) throw new Error("Put an amount on it");
      }
      const r = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      toast.success(mode === "schedule" ? `${j.count} invoices raised` : "Invoice raised");
      onDone();
    } catch (e) {
      toast.error(e.message || "Could not raise that");
    }
    setSaving(false);
  };
  return /* @__PURE__ */ React.createElement(Modal, { title: "New invoice", icon: "bi-receipt", wide: true, onClose }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("schedule"), style: mode === "schedule" ? s.miniBtnOn : s.miniBtn }, "From an accepted proposal"), /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("one"), style: mode === "one" ? s.miniBtnOn : s.miniBtn }, "One invoice by hand")), mode === "schedule" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Field, { label: "Proposal", hint: "Only accepted proposals can be billed." }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: pid, onChange: (e) => setPid(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 pick a proposal \u2014"), accepted.map((x) => /* @__PURE__ */ React.createElement("option", { key: x._id, value: x._id }, propRef(x._id), " \xB7 ", x.co, " \xB7 ", inr(x.amount || 0))))), !accepted.length ? /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, fontSize: 12, color: "#64748B", lineHeight: 1.55 } }, proposals.some((x) => x.status === "Accepted") ? "Every accepted proposal has already been billed. Raise a one off invoice by hand instead." : "Nothing to bill yet \u2014 no proposal has been accepted. Mark one accepted on the Proposals board first.") : null, p ? /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, marginBottom: 12 } }, /* @__PURE__ */ React.createElement(KV, { k: "Company", v: p.co }), /* @__PURE__ */ React.createElement(KV, { k: "Deal value", v: inr(p.amount || 0) }), /* @__PURE__ */ React.createElement(KV, { k: "Advance", v: p.advPct ? `${p.advPct}% \xB7 ${inr(adv)}` : "none" }), /* @__PURE__ */ React.createElement(
    KV,
    {
      k: "Then",
      v: months ? `${months} monthly invoice${months === 1 ? "" : "s"} of ${inr(per)}` : rest > 0 ? adv > 0 ? `one balance invoice of ${inr(rest)}` : `one invoice of ${inr(rest)}` : "nothing \u2014 the advance is the whole deal"
    }
  ), /* @__PURE__ */ React.createElement(KV, { k: "Invoices to raise", v: (adv > 0 ? 1 : 0) + (months || (rest > 0 ? 1 : 0)) }), /* @__PURE__ */ React.createElement(KV, { k: "All of them", v: "raised as drafts \u2014 nothing is mailed on its own" })) : null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "First issued on" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "date", value: issued, onChange: (e) => setIssued(e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "GST %" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      inputMode: "numeric",
      value: gstPct,
      onChange: (e) => setGst(e.target.value.replace(/\D/g, "").slice(0, 2))
    }
  )))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Field, { label: "Lead", hint: "Picking one fills the billing details in; all of them can be typed over." }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.leadId, onChange: (e) => set("leadId", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 pick a lead \u2014"), leads.map((l) => /* @__PURE__ */ React.createElement("option", { key: l._id, value: l._id }, leadRef(l._id), " \xB7 ", l.businessName || l.name)))), /* @__PURE__ */ React.createElement(Section, { n: "Billed to" }), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "Company" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.co, onChange: (e) => set("co", e.target.value), placeholder: "Who the bill is addressed to" })), /* @__PURE__ */ React.createElement(Field, { label: "Contact person" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.contact, onChange: (e) => set("contact", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Email" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "email", value: f.em, onChange: (e) => set("em", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Phone" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.ph, onChange: (e) => set("ph", e.target.value) }))), /* @__PURE__ */ React.createElement(Field, { label: "Billing address" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: f.address,
      onChange: (e) => set("address", e.target.value),
      placeholder: "Street, building, floor"
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "City" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.city, onChange: (e) => set("city", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "State", hint: "Decides CGST + SGST or IGST." }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.state, onChange: (e) => set("state", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Pincode" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      inputMode: "numeric",
      value: f.pincode,
      onChange: (e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "Their GSTIN" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: f.gstin,
      onChange: (e) => set("gstin", e.target.value.toUpperCase().slice(0, 15)),
      placeholder: "Optional"
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "PO / reference" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: f.poRef,
      onChange: (e) => set("poRef", e.target.value),
      placeholder: "Their purchase order, if there is one"
    }
  ))), /* @__PURE__ */ React.createElement(Section, { n: "What is being billed" }), /* @__PURE__ */ React.createElement(ServiceLines, { items, setItems, svcList, ui: s, label: "Lines on this invoice" }), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement(Field, { label: "For" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.kind, onChange: (e) => set("kind", e.target.value) }, KINDS.map((x) => /* @__PURE__ */ React.createElement("option", { key: x, value: x }, x)))), /* @__PURE__ */ React.createElement(Field, { label: "GST %" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      inputMode: "numeric",
      value: f.gstPct,
      onChange: (e) => set("gstPct", e.target.value.replace(/\D/g, "").slice(0, 2))
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Issued" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "date", value: f.issued, onChange: (e) => set("issued", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Due" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "date", value: f.due, onChange: (e) => set("due", e.target.value) }))), sub ? /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, marginBottom: 12 } }, /* @__PURE__ */ React.createElement(KV, { k: "Subtotal", v: inr(sub) }), /* @__PURE__ */ React.createElement(KV, { k: `GST ${f.gstPct || 0}%`, v: inr(tax) }), /* @__PURE__ */ React.createElement(KV, { k: "Invoice total", v: inr(sub + tax) })) : null, /* @__PURE__ */ React.createElement(Field, { label: "Owner" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.owner, onChange: (e) => set("owner", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Notes on the invoice" }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      className: "lp-in",
      style: { ...s.input, height: 70, padding: "9px 11px", resize: "vertical" },
      value: f.notes,
      onChange: (e) => set("notes", e.target.value),
      placeholder: "Anything the client should read on the bill"
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: s.miniBtn }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: save, disabled: saving, style: { ...s.primaryBtn, opacity: saving ? 0.5 : 1 } }, saving ? "Saving\u2026" : mode === "schedule" ? "Raise the schedule" : "Raise the invoice")));
}
export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=") && !cookie.includes("sales_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
const s = {
  panel: { background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden" },
  panelHead: { padding: "12px 16px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" },
  panelIcon: { width: 30, height: 30, borderRadius: 9, background: "#6366F118", color: "#4338CA", display: "grid", placeItems: "center", fontSize: 13, flexShrink: 0 },
  softBox: { background: "#FBFBFE", border: "1px solid #F0F0F8", borderRadius: 12, padding: "11px 13px" },
  th: { textAlign: "left", padding: "9px 12px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8", background: "#FAFAFE", borderBottom: "1px solid #F0F0F8", whiteSpace: "nowrap" },
  td: { fontSize: 12, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
  tag: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" },
  input: { width: "100%", height: 38, borderRadius: 10, border: "1px solid #E7E7F2", padding: "0 10px", fontSize: 12.5, color: "#0F172A", background: "#fff", outline: "none" },
  iconBtn: { width: 28, height: 28, borderRadius: 8, border: "1px solid #E7E7F2", background: "#fff", color: "#64748B", cursor: "pointer", display: "inline-grid", placeItems: "center" },
  miniBtn: { display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px", borderRadius: 9, border: "1px solid #E7E7F2", background: "#fff", color: "#475569", fontSize: 11.5, fontWeight: 800, cursor: "pointer" },
  miniBtnOn: { display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px", borderRadius: 9, border: "1px solid #C7D2FE", background: "#EEF2FF", color: "#4338CA", fontSize: 11.5, fontWeight: 800, cursor: "pointer" },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 15px", borderRadius: 10, border: "1px solid #6366F1", background: "#6366F1", color: "#fff", fontSize: 12.5, fontWeight: 800, cursor: "pointer" },
  primaryBtnSm: { display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", borderRadius: 9, border: "1px solid #6366F1", background: "#6366F1", color: "#fff", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }
};
