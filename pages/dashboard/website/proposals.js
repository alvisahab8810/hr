// pages/dashboard/website/proposals.js — Website → Proposals.
//
// Every proposal here was raised off a lead on the Leads board (the "Raise a
// proposal" button in a lead's after-the-meeting panel lands here with
// ?lead=<id>, which opens the form already pointed at that lead).
//
// The board works the same way the Leads board does: every cell is clickable
// and opens the panel that owns that piece of information, so nothing is buried
// in a drawer. The one rule the page exists to enforce — nothing reaches a
// client until the admin has approved it.
import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import DocPreview from "@/components/DocPreview";
import { SERVICES, inr, inrShort, initials, fmtD, fmtDT, todayStr } from "@/utils/leadsMeta";
import { useList } from "@/utils/crmSettings";

const COLS_KEY = "viralon.proposals.hiddenCols.v2";
const DENSITY_KEY = "viralon.proposals.density";

const TERMS = ["Retainer", "One time", "Project"];
const APPROVALS = ["Awaiting approval", "Approved", "Changes requested", "Rejected"];
const STATUSES = ["Draft", "Sent", "Negotiation", "Accepted", "Lost"];

/* Approval reads "Pending" on the board — it is the admin who is pending. */
const approvalMeta = (a) =>
  a === "Approved"          ? { n: "Approved",         bg: "#DCFCE7", fg: "#0F8A54" } :
  a === "Changes requested" ? { n: "Changes requested", bg: "#FDF3E2", fg: "#B4690E" } :
  a === "Rejected"          ? { n: "Rejected",         bg: "#FDEDED", fg: "#C42525" } :
                              { n: "Pending",          bg: "#FDF3E2", fg: "#B4690E" };

const statusMeta = (st) =>
  st === "Accepted"    ? { bg: "#DCFCE7", fg: "#0F8A54" } :
  st === "Negotiation" ? { bg: "#FDF3E2", fg: "#B4690E" } :
  st === "Sent"        ? { bg: "#EEF2FF", fg: "#4338CA" } :
  st === "Lost"        ? { bg: "#FDEDED", fg: "#C42525" } :
                         { bg: "#F1F5F9", fg: "#64748B" };

/* The board reads as a proposal number, not a database id. */
const propCode = (p) => `VP-${String(p?._id || "").slice(-4).toUpperCase()}`;
const leadRef  = (id) => `VL-${String(id || "").slice(-4).toUpperCase()}`;

const advAmt   = (p) => Math.round(((p.amount || 0) * (p.advPct || 0)) / 100);
const perMonth = (p) => (p.term === "Retainer" && p.months ? Math.round((p.amount || 0) / p.months) : 0);
const replies  = (p) => (p.followups || []).filter((f) => f.type === "reply").length;
const lastTouch = (p) => {
  const f = p.followups || [];
  if (!f.length) return p.sent || null;
  return f[f.length - 1].at;
};

const COLS = [
  { k: "code",     n: "Proposal ID",  on: true,  w: 120 },
  { k: "lead",     n: "Lead ID",      on: true,  w: 100 },
  { k: "co",       n: "Company",      on: true,  w: 200 },
  { k: "contact",  n: "Contact",      on: false, w: 150 },
  { k: "em",       n: "Email",        on: false, w: 190 },
  { k: "owner",    n: "Assign to",    on: true,  w: 140 },
  { k: "svc",      n: "Service",      on: true,  w: 175 },
  { k: "amount",   n: "Deal value",   on: true,  w: 125 },
  { k: "term",     n: "Payment term", on: true,  w: 130 },
  { k: "months",   n: "Months",       on: false, w: 90  },
  { k: "adv",      n: "Advance",      on: false, w: 130 },
  { k: "approval", n: "Approval",     on: true,  w: 150 },
  { k: "status",   n: "Status",       on: true,  w: 130 },
  { k: "sent",     n: "Sent on",      on: true,  w: 110 },
  { k: "agree",    n: "Agreement",    on: true,  w: 150 },
  { k: "fu",       n: "Follow ups",   on: true,  w: 130 },
  { k: "touch",    n: "Last touch",   on: true,  w: 115 },
  { k: "nextfu",   n: "Next follow up", on: true, w: 130 },
  { k: "valid",    n: "Valid till",   on: true,  w: 110 },
];

/* Which panel owns each column — clicking a cell opens that one. */
const PANEL_OF = {
  code: "record", lead: "record", co: "record", contact: "record", em: "record",
  svc: "commercials", amount: "commercials", term: "commercials",
  months: "commercials", adv: "commercials", valid: "commercials",
  approval: "approval",
  status: "status", sent: "status",
  agree: "agreement",
  fu: "followups", touch: "followups", nextfu: "followups",
  owner: "owner",
};

const PANEL_META = {
  record:      { t: "Proposal record",       i: "bi-file-earmark-text-fill" },
  commercials: { t: "Commercials",           i: "bi-cash-stack" },
  approval:    { t: "Approval",              i: "bi-shield-check" },
  status:      { t: "Where it stands",       i: "bi-flag-fill" },
  followups:   { t: "Follow ups and replies", i: "bi-chat-left-dots-fill" },
  owner:       { t: "Who is running it",     i: "bi-person-badge-fill" },
  agreement:   { t: "Agreement",             i: "bi-file-earmark-check-fill" },
};

/* ───────────────────────────── little pieces ───────────────────────────── */

function Metric({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: `linear-gradient(160deg,#fff 55%, ${accent.bg} 175%)`,
      border: `1px solid ${accent.bg}`, borderRadius: 14, padding: "13px 14px",
      boxShadow: "0 2px 8px rgba(15,23,42,.05)", position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", gap: 11, minWidth: 0,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon }} />
      <div style={{
        width: 36, height: 36, borderRadius: 11, background: accent.icon, flexShrink: 0,
        display: "grid", placeItems: "center", color: "#fff", fontSize: 15,
      }}>
        <i className={`bi ${icon}`} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8" }}>{label}</div>
        <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>{value}</div>
        {sub ? <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{sub}</div> : null}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 4 }}>{label}</span>
      {children}
      {hint ? <span style={{ display: "block", fontSize: 10.5, color: "#94A3B8", marginTop: 3 }}>{hint}</span> : null}
    </label>
  );
}

function KV({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", fontSize: 12, borderBottom: "1px dashed #E8E8F2" }}>
      <span style={{ color: "#64748B" }}>{k}</span>
      <b style={{ color: "#0F172A", textAlign: "right", fontWeight: 800 }}>{v}</b>
    </div>
  );
}

function Modal({ title, icon, wide, onClose, children }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
         style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 2000,
                  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: wide ? 720 : 520,
                    boxShadow: "0 24px 60px rgba(15,23,42,.28)", overflow: "hidden" }}>
        <div style={{ padding: "15px 20px", borderBottom: "1px solid #F1F1FA", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={s.panelIcon}><i className={`bi ${icon}`} style={{ fontSize: 14 }} /></div>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#0F172A", flex: 1 }}>{title}</span>
          <button onClick={onClose} style={s.iconBtn} title="Close"><i className="bi bi-x-lg" style={{ fontSize: 12 }} /></button>
        </div>
        <div className="lp-scroll" style={{ padding: 20, maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

/* ───────────────────────────────── page ────────────────────────────────── */

export default function ProposalsPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [sort, setSort] = useState({ k: "sent", dir: -1 });

  const [hidden, setHidden] = useState([]);
  const [density, setDensity] = useState("comfortable");
  const [colsOpen, setColsOpen] = useState(false);
  const [modal, setModal] = useState(null);   // {type, p?, panel?, leadId?}

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem(COLS_KEY) || "null");
      if (Array.isArray(h)) setHidden(h);
      else setHidden(COLS.filter((c) => !c.on).map((c) => c.k));
      const d = localStorage.getItem(DENSITY_KEY);
      if (d) setDensity(d);
    } catch { setHidden(COLS.filter((c) => !c.on).map((c) => c.k)); }
  }, []);

  const toggleCol = (k) => {
    setHidden((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      try { localStorage.setItem(COLS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const setDens = (d) => { setDensity(d); try { localStorage.setItem(DENSITY_KEY, d); } catch {} };

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/proposals", { credentials: "include" });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      setRows(j.data || []);
      setLeads(j.leads || []);
    } catch (e) {
      toast.error(e.message || "Could not load the proposals");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Arriving from a lead: ?new=<id> raises one, ?lead=<id> shows theirs.
  useEffect(() => {
    if (!router.isReady || loading) return;
    if (router.query.new) setModal({ type: "new", leadId: String(router.query.new) });
    else if (router.query.lead) setQ(leadRef(String(router.query.lead)));
  }, [router.isReady, router.query.new, router.query.lead, loading]);

  const patch = useCallback(async (id, body, quiet) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      setRows((prev) => prev.map((p) => (p._id === id ? j.data : p)));
      if (!quiet) toast.success("Saved");
      setBusy(false);
      return j.data;
    } catch (e) {
      toast.error(e.message || "Could not save that");
      setBusy(false);
      return null;
    }
  }, []);

  const remove = async (p) => {
    if (!confirm(`Delete ${propCode(p)}? This cannot be undone.`)) return;
    const r = await fetch(`/api/admin/proposals/${p._id}`, { method: "DELETE", credentials: "include" });
    const j = await r.json();
    if (!j.success) return toast.error(j.message || "Could not delete");
    setRows((prev) => prev.filter((x) => x._id !== p._id));
    setModal(null);
    toast.success("Deleted");
  };

  /* Accepted proposal → the whole billing schedule in one go: the advance now
     and one invoice a month for the retainer. Then straight to Invoices. */
  const raiseInvoice = async (p) => {
    if (p.status !== "Accepted") return toast.error("Only an accepted proposal can be invoiced");
    const adv = Math.round(((p.amount || 0) * (p.advPct || 0)) / 100);
    const line = p.term === "Retainer"
      ? `advance ${inr(adv)} + ${p.months || 1} monthly invoice${(p.months || 1) === 1 ? "" : "s"}`
      : `advance ${inr(adv)} + the balance`;
    if (!confirm(`Raise the invoices for ${propCode(p)} — ${line}?`)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/invoices", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: true, proposalId: p._id }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Could not raise the invoices");
      toast.success(`${j.count} invoice${j.count === 1 ? "" : "s"} raised`);
      setModal(null);
      router.push(`/dashboard/website/invoices?lead=${p.leadId}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const owners = useMemo(
    () => [...new Set(rows.map((p) => p.owner).filter(Boolean))].sort(),
    [rows]
  );

  const sortVal = (p, k) => {
    switch (k) {
      case "code":   return propCode(p);
      case "lead":   return leadRef(p.leadId);
      case "amount": return p.amount || 0;
      case "months": return p.months || 0;
      case "adv":    return p.advPct || 0;
      case "sent":   return p.sent ? new Date(p.sent).getTime() : 0;
      case "touch":  return lastTouch(p) ? new Date(lastTouch(p)).getTime() : 0;
      case "fu":     return (p.followups || []).length;
      case "co":     return p.co || "";
      case "contact": return p.contact || "";
      default:       return String(p[k] ?? "");
    }
  };

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((p) => {
      // The one dropdown covers both columns — "ap:" picks an approval state.
      if (fStatus.startsWith("ap:")) {
        if (p.approval !== fStatus.slice(3)) return false;
      } else if (fStatus && p.status !== fStatus) return false;
      if (fOwner && p.owner !== fOwner) return false;
      if (!needle) return true;
      return [propCode(p), leadRef(p.leadId), p.co, p.contact, p.em, p.svc, p.owner]
        .some((v) => String(v || "").toLowerCase().includes(needle));
    });
    return out.sort((a, b) => {
      const A = sortVal(a, sort.k), B = sortVal(b, sort.k);
      if (A === B) return 0;
      return (A > B ? 1 : -1) * sort.dir;
    });
  }, [rows, q, fStatus, fOwner, sort]);

  const stats = useMemo(() => {
    const out = rows.filter((p) => p.status !== "Draft");
    const inPlay = rows.filter((p) => p.status === "Sent" || p.status === "Negotiation");
    const won = rows.filter((p) => p.status === "Accepted");
    const decided = rows.filter((p) => p.status === "Accepted" || p.status === "Lost");
    const waiting = rows.filter((p) => p.approval === "Awaiting approval");
    const total = rows.reduce((a, p) => a + (p.amount || 0), 0);
    return {
      out: out.length,
      inPlay: inPlay.reduce((a, p) => a + (p.amount || 0), 0),
      waiting: waiting.length,
      waitingValue: waiting.reduce((a, p) => a + (p.amount || 0), 0),
      won: won.length,
      winRate: decided.length ? Math.round((won.length / decided.length) * 100) : 0,
      avg: rows.length ? Math.round(total / rows.length) : 0,
    };
  }, [rows]);

  const shown = COLS.filter((c) => !hidden.includes(c.k));
  const pad = density === "compact" ? "6px 10px" : "10px 12px";

  const cell = (p, k) => {
    switch (k) {
      case "code":
        return <span style={{ fontWeight: 900, color: "#4338CA" }}>{propCode(p)}</span>;
      case "lead":
        return <span style={{ fontWeight: 800, color: "#4338CA" }}>{leadRef(p.leadId)}</span>;
      case "co":
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: "#6366F118", color: "#4338CA", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 900 }}>
              {initials(p.co || p.contact || "?")}
            </div>
            <span style={{ fontWeight: 800, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis" }}>{p.co || "—"}</span>
          </div>
        );
      case "contact": return p.contact || "—";
      case "em":      return p.em || "—";
      case "svc":     return p.svc || "—";
      case "amount":  return <b style={{ fontWeight: 900, color: "#0F172A" }}>{inr(p.amount || 0)}</b>;
      case "term":    return <span style={{ ...s.tag, background: "#F1F5F9", color: "#475569" }}>{p.term}</span>;
      case "months":  return p.term === "Retainer" && p.months ? `${p.months}` : "—";
      case "adv":     return p.advPct ? `${p.advPct}% · ${inrShort(advAmt(p))}` : "—";
      case "approval": {
        const m = approvalMeta(p.approval);
        return <span style={{ ...s.tag, background: m.bg, color: m.fg }}>{m.n}</span>;
      }
      case "status": {
        const m = statusMeta(p.status);
        return <span style={{ ...s.tag, background: m.bg, color: m.fg }}>{p.status}</span>;
      }
      case "sent":
        return p.sent
          ? fmtD(p.sent)
          : <span style={{ ...s.tag, background: "#F1F5F9", color: "#94A3B8" }}>not sent</span>;
      case "fu": {
        const n = (p.followups || []).length;
        const r = replies(p);
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <b style={{ fontWeight: 900, color: n ? "#0F172A" : "#CBD5E1" }}>{n}</b>
            {r ? <span style={{ ...s.tag, background: "#DCFCE7", color: "#0F8A54" }}>{r} {r === 1 ? "reply" : "replies"}</span> : null}
          </span>
        );
      }
      case "touch":  return lastTouch(p) ? fmtD(lastTouch(p)) : "—";
      case "nextfu": return p.nextfu ? fmtD(p.nextfu) : "—";
      case "valid":  return p.validTill ? fmtD(p.validTill) : "—";
      case "owner":  return p.owner || "—";
      case "agree": {
        const m = agreeMeta(p.agreement?.status);
        return <span style={{ ...s.tag, background: m.bg, color: m.fg }}>{m.n}</span>;
      }
      default:       return "";
    }
  };

  return (
    <section className="main-dashboard-area">
      <Head><title>Proposals — Website</title></Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            {/* ── header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" }}>Proposals</h2>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#94A3B8" }}>
                  Admin approves, the salesperson sends, every follow up is logged. Nothing skips the gate.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/dashboard/website/leads" style={{ ...s.miniBtn, textDecoration: "none" }}>
                  <i className="bi bi-person-lines-fill" style={{ fontSize: 11 }} /> Leads
                </Link>
                <button onClick={() => setModal({ type: "new" })} style={s.primaryBtn}>
                  <i className="bi bi-plus-lg" style={{ fontSize: 12 }} /> New proposal
                </button>
              </div>
            </div>

            {/* ── the numbers ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 11, margin: "16px 0" }}>
              <Metric icon="bi-file-earmark-text-fill" label="Proposals out" value={stats.out} sub="sent to clients" accent={{ bg: "#EEF2FF", icon: "#6366F1" }} />
              <Metric icon="bi-cash-stack" label="Value in play" value={inr(stats.inPlay)} sub="excluding won" accent={{ bg: "#E0F2FE", icon: "#0EA5E9" }} />
              <Metric icon="bi-hourglass-split" label="Waiting on approval" value={stats.waiting} sub={`blocking ${inr(stats.waitingValue)}`} accent={{ bg: "#FEF3C7", icon: "#F59E0B" }} />
              <Metric icon="bi-check2-circle" label="Accepted" value={stats.won} sub="all time" accent={{ bg: "#DCFCE7", icon: "#16A34A" }} />
              <Metric icon="bi-graph-up-arrow" label="Win rate" value={`${stats.winRate}%`} sub="of the decided" accent={{ bg: "#F3E8FF", icon: "#9333EA" }} />
              <Metric icon="bi-calculator" label="Avg deal" value={inr(stats.avg)} sub="across all" accent={{ bg: "#FFE4E6", icon: "#F43F5E" }} />
            </div>

            {/* ── the gate, said out loud ── */}
            {stats.waiting > 0 ? (
              <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "12px 15px", borderRadius: 14,
                            background: "#FFF9EC", border: "1px solid #FDE9BE", marginBottom: 14 }}>
                <i className="bi bi-shield-exclamation" style={{ fontSize: 16, color: "#B4690E", marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: "#7C5A12", lineHeight: 1.6 }}>
                  <b>{stats.waiting} {stats.waiting === 1 ? "proposal is" : "proposals are"} waiting on you.</b>{" "}
                  Nothing goes to a client until it is approved here. Approve, request changes, or reject with a
                  reason the salesperson can act on.
                  <button onClick={() => { setFStatus(""); setQ(""); setSort({ k: "approval", dir: 1 }); }}
                          style={{ ...s.miniBtn, marginLeft: 10, height: 26 }}>Show them first</button>
                </div>
              </div>
            ) : null}

            {/* ── the board ── */}
            <div style={s.panel}>
              <div style={s.panelHead}>
                <div style={s.panelIcon}><i className="bi bi-receipt" /></div>
                <div style={{ fontSize: 13.5, fontWeight: 900, color: "#0F172A" }}>All proposals</div>
                <span style={{ ...s.tag, background: "#EEF2FF", color: "#4338CA" }}>{view.length}</span>
                <div style={{ flex: 1 }} />

                <input className="lp-in" placeholder="Search proposal, company, lead ID…" value={q}
                       onChange={(e) => setQ(e.target.value)} style={{ ...s.input, width: 235, height: 32 }} />
                <select className="lp-in" value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ ...s.input, width: 150, height: 32 }}>
                  <option value="">All statuses</option>
                  {STATUSES.map((a) => <option key={a} value={a}>{a}</option>)}
                  <optgroup label="Approval">
                    {APPROVALS.map((a) => <option key={a} value={`ap:${a}`}>{a}</option>)}
                  </optgroup>
                </select>
                <select className="lp-in" value={fOwner} onChange={(e) => setFOwner(e.target.value)} style={{ ...s.input, width: 145, height: 32 }}>
                  <option value="">All owners</option>
                  {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>

                <div style={{ display: "flex", borderRadius: 9, border: "1px solid #E7E7F2", overflow: "hidden" }}>
                  {["comfortable", "compact"].map((d) => (
                    <button key={d} onClick={() => setDens(d)}
                            style={{ height: 32, padding: "0 11px", border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 800,
                                     background: density === d ? "#EEF2FF" : "#fff", color: density === d ? "#4338CA" : "#94A3B8",
                                     textTransform: "capitalize" }}>{d}</button>
                  ))}
                </div>

                <div style={{ position: "relative" }}>
                  <button onClick={() => setColsOpen((v) => !v)} style={{ ...s.miniBtn, height: 32 }}>
                    <i className="bi bi-layout-three-columns" style={{ fontSize: 11 }} /> Columns {shown.length}/{COLS.length}
                  </button>
                  {colsOpen ? (
                    <>
                      <div onClick={() => setColsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
                      <div className="lp-scroll" style={{ position: "absolute", right: 0, top: 38, zIndex: 31, width: 215, maxHeight: 320,
                                                          overflowY: "auto", background: "#fff", border: "1px solid #F0F0F8", borderRadius: 12,
                                                          boxShadow: "0 14px 34px rgba(15,23,42,.14)", padding: 8 }}>
                        {COLS.map((c) => (
                          <label key={c.k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 7px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#334155" }}>
                            <input type="checkbox" checked={!hidden.includes(c.k)} onChange={() => toggleCol(c.k)}
                                   style={{ accentColor: "#6366F1", cursor: "pointer" }} />
                            {c.n}
                          </label>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="lp-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: shown.reduce((a, c) => a + c.w, 60) }}>
                  <thead>
                    <tr>
                      {shown.map((c) => (
                        <th key={c.k} onClick={() => setSort((p) => ({ k: c.k, dir: p.k === c.k ? -p.dir : 1 }))}
                            style={{ ...s.th, width: c.w, minWidth: c.w, cursor: "pointer" }}>
                          {c.n}
                          <i className={`bi ${sort.k === c.k ? (sort.dir === 1 ? "bi-caret-up-fill" : "bi-caret-down-fill") : "bi-chevron-expand"}`}
                             style={{ fontSize: 8.5, marginLeft: 4, opacity: sort.k === c.k ? 1 : .35 }} />
                        </th>
                      ))}
                      <th style={{ ...s.th, width: 96, minWidth: 96 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={shown.length + 1} style={{ padding: 30, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading…</td></tr>
                    ) : !view.length ? (
                      <tr><td colSpan={shown.length + 1} style={{ padding: 30, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                        Nothing here yet. Raise one from a lead once the consultation is done.
                      </td></tr>
                    ) : view.map((p) => (
                      <tr key={p._id} className="lp-row">
                        {shown.map((c) => (
                          <td key={c.k} className="lp-cell" title="Open"
                              onClick={() => setModal({ type: "panel", p, panel: PANEL_OF[c.k] || "record" })}
                              style={{ ...s.td, padding: pad, width: c.w, minWidth: c.w, cursor: "pointer" }}>
                            {cell(p, c.k)}
                          </td>
                        ))}
                        <td style={{ ...s.td, padding: pad, whiteSpace: "nowrap" }}>
                          <button onClick={() => setModal({ type: "pdf", p })}
                                  style={{ ...s.iconBtn, marginRight: 4, borderColor: "#C7D2FE", color: "#4338CA" }} title="Preview / PDF">
                            <i className="bi bi-file-earmark-pdf-fill" style={{ fontSize: 12 }} />
                          </button>
                          {/* Accepted means the money can be asked for — that button lives here. */}
                          {p.status === "Accepted" ? (
                            <button onClick={() => raiseInvoice(p)} disabled={busy}
                                    style={{ ...s.iconBtn, marginRight: 4, borderColor: "#6366F1", background: "#6366F1", color: "#fff" }}
                                    title="Raise the invoices">
                              <i className="bi bi-receipt" style={{ fontSize: 12 }} />
                            </button>
                          ) : null}
                          <button onClick={() => setModal({ type: "panel", p, panel: "approval" })} style={s.iconBtn} title="Approval">
                            <i className="bi bi-shield-check" style={{ fontSize: 12 }} />
                          </button>
                          <button onClick={() => setModal({ type: "panel", p, panel: "followups" })} style={{ ...s.iconBtn, marginLeft: 4 }} title="Follow ups">
                            <i className="bi bi-chat-left-dots-fill" style={{ fontSize: 12 }} />
                          </button>
                          <button onClick={() => remove(p)} style={{ ...s.iconBtn, marginLeft: 4, color: "#C42525" }} title="Delete">
                            <i className="bi bi-trash3-fill" style={{ fontSize: 12 }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: "10px 16px", borderTop: "1px solid #F4F4FD", fontSize: 11.5, color: "#94A3B8", fontWeight: 600,
                            display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span>{view.length} of {rows.length} proposals</span>
                <span>Value shown {inr(view.reduce((a, p) => a + (p.amount || 0), 0))}</span>
                <span>{COLS.length - shown.length} columns hidden</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {modal?.type === "new" ? (
        <NewProposal leads={leads} leadId={modal.leadId} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      ) : null}

      {modal?.type === "panel" ? (() => {
        const live = rows.find((x) => x._id === modal.p._id) || modal.p;
        const meta = PANEL_META[modal.panel] || PANEL_META.record;
        return (
          <Modal title={`${meta.t} · ${propCode(live)}`} icon={meta.i} wide={modal.panel === "followups"} onClose={() => setModal(null)}>
            <Panel which={modal.panel} p={live} busy={busy} patch={patch} invoice={raiseInvoice}
                   pdf={() => setModal({ type: "pdf", p: live })}
                   pdfAgreement={() => setModal({ type: "pdfAgree", p: live })}
                   go={(pn) => setModal({ type: "panel", p: live, panel: pn })} />
          </Modal>
        );
      })() : null}

      {modal?.type === "pdfAgree" ? (
        <DocPreview kind="agreement" doc={rows.find((x) => x._id === modal.p._id) || modal.p}
                    onClose={() => setModal(null)} />
      ) : null}

      {modal?.type === "pdf" ? (
        <DocPreview kind="proposal" doc={rows.find((x) => x._id === modal.p._id) || modal.p}
                    onClose={() => setModal(null)} />
      ) : null}

      <style jsx global>{`
        .lp-row:hover { background: #FAFAFE; }
        .lp-row:hover .lp-cell { color: #0F172A; }
        .lp-cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lp-in:focus { outline: none; border-color: #818CF8; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
        .lp-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .lp-scroll::-webkit-scrollbar-thumb { background: #DDDDEB; border-radius: 8px; }
      `}</style>
    </section>
  );
}

/* ── the panels behind the cells ────────────────────────────────────────── */

function Panel({ which, p, busy, patch, go, invoice, pdf, pdfAgreement }) {
  switch (which) {
    case "record":
      return (
        <>
          <KV k="Proposal ID" v={propCode(p)} />
          <KV k="Lead ID" v={leadRef(p.leadId)} />
          <KV k="Company" v={p.co || "—"} />
          <KV k="Contact" v={p.contact || "—"} />
          <KV k="Email" v={p.em || "—"} />
          <KV k="Phone" v={p.ph || "—"} />
          <KV k="Raised on" v={fmtDT(p.createdAt)} />
          {p.notes ? (
            <div style={{ ...s.softBox, marginTop: 12, fontSize: 12, color: "#475569", lineHeight: 1.55 }}>
              <b style={{ color: "#0F172A" }}>Note from the rep.</b> {p.notes}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <Link href={`/dashboard/website/leads?lead=${p.leadId}&panel=after`} style={{ ...s.miniBtn, textDecoration: "none" }}>
              <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }} /> Open the lead
            </Link>
            {p.em ? <a href={`mailto:${p.em}`} style={{ ...s.miniBtn, textDecoration: "none" }}><i className="bi bi-envelope-fill" style={{ fontSize: 11 }} /> Mail them</a> : null}
            {p.ph ? <a href={`tel:${p.ph}`} style={{ ...s.miniBtn, textDecoration: "none" }}><i className="bi bi-telephone-fill" style={{ fontSize: 11 }} /> Call</a> : null}
            <button onClick={() => go("commercials")} style={s.miniBtn}>Commercials</button>
            <button onClick={() => pdf?.()} style={s.primaryBtn}>
              <i className="bi bi-file-earmark-pdf-fill" style={{ fontSize: 12 }} /> Preview / PDF
            </button>
          </div>
        </>
      );

    case "commercials":
      return <Commercials p={p} busy={busy} patch={patch} go={go} />;

    case "approval":
      return <Approval p={p} busy={busy} patch={patch} go={go} />;

    case "status":
      return <Status p={p} busy={busy} patch={patch} go={go} invoice={invoice} />;

    case "followups":
      return <Followups p={p} busy={busy} patch={patch} />;

    case "owner":
      return <Owner p={p} busy={busy} patch={patch} />;

    case "agreement":
      return <Agreement p={p} busy={busy} patch={patch} go={go} pdf={() => pdfAgreement?.()} />;

    default:
      return null;
  }
}

function Commercials({ p, busy, patch, go }) {
  const svcList = useList("services", SERVICES);
  const [f, setF] = useState({
    svc: p.svc || "", amount: String(p.amount || ""), term: p.term || "Retainer",
    months: String(p.months || 1), advPct: String(p.advPct || 0), validTill: p.validTill || "",
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const locked = p.status === "Sent" || p.status === "Accepted";

  return (
    <>
      <KV k="Total value" v={inr(p.amount || 0)} />
      <KV k="Term" v={`${p.term}${p.term === "Retainer" && p.months ? ` · ${p.months} months` : ""}`} />
      {perMonth(p) ? <KV k="Per month" v={inr(perMonth(p))} /> : null}
      <KV k="Advance" v={p.advPct ? `${p.advPct}% · ${inr(advAmt(p))}` : "—"} />
      <KV k="Balance" v={inr((p.amount || 0) - advAmt(p))} />
      <KV k="Valid till" v={p.validTill ? fmtD(p.validTill) : "—"} />

      {locked ? (
        <div style={{ ...s.softBox, marginTop: 12, fontSize: 12, color: "#64748B", lineHeight: 1.55 }}>
          This one is already with the client, so the numbers are frozen. Move it to
          Negotiation from “Where it stands” if the figures have to change.
          <div style={{ marginTop: 9 }}><button onClick={() => go("status")} style={s.miniBtn}>Where it stands</button></div>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Service">
              <select className="lp-in" style={s.input} value={f.svc} onChange={(e) => set("svc", e.target.value)}>
                <option value="">—</option>
                {svcList.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Deal value (₹)">
              <input className="lp-in" style={s.input} inputMode="numeric" value={f.amount}
                     onChange={(e) => set("amount", e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Payment term">
              <select className="lp-in" style={s.input} value={f.term} onChange={(e) => set("term", e.target.value)}>
                {TERMS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Months">
              <input className="lp-in" style={s.input} inputMode="numeric" value={f.months} disabled={f.term !== "Retainer"}
                     onChange={(e) => set("months", e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Advance %">
              <input className="lp-in" style={s.input} inputMode="numeric" value={f.advPct}
                     onChange={(e) => set("advPct", e.target.value.replace(/\D/g, "").slice(0, 3))} />
            </Field>
            <Field label="Valid till">
              <input className="lp-in" style={s.input} type="date" value={f.validTill}
                     onChange={(e) => set("validTill", e.target.value)} />
            </Field>
          </div>
          <button onClick={() => patch(p._id, f)} disabled={busy} style={{ ...s.primaryBtn, opacity: busy ? .5 : 1 }}>
            <i className="bi bi-check2" style={{ fontSize: 12 }} /> Save the numbers
          </button>
        </div>
      )}
    </>
  );
}

function Approval({ p, busy, patch, go }) {
  const [note, setNote] = useState(p.adminNote || "");
  const m = approvalMeta(p.approval);
  const decide = (approval) => patch(p._id, { approval, adminNote: note });

  return (
    <>
      <KV k="Decision" v={<span style={{ ...s.tag, background: m.bg, color: m.fg }}>{m.n}</span>} />
      <KV k="Decided on" v={p.approvedOn ? fmtDT(p.approvedOn) : "—"} />
      <KV k="Deal value" v={inr(p.amount || 0)} />
      <KV k="Sent to client" v={p.sent ? fmtD(p.sent) : "not yet"} />

      {p.notes ? (
        <div style={{ ...s.softBox, marginTop: 12, fontSize: 12, color: "#475569", lineHeight: 1.55 }}>
          <b style={{ color: "#0F172A" }}>From the rep.</b> {p.notes}
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <Field label="Your note back" hint="The salesperson sees this, so give them something to act on.">
          <textarea className="lp-in" style={{ ...s.input, height: 90, padding: "9px 11px", resize: "vertical" }}
                    value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="What needs changing, or why this is a no" />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => decide("Approved")} disabled={busy} style={s.primaryBtn}>
          <i className="bi bi-check2-circle" style={{ fontSize: 12 }} /> Approve
        </button>
        <button onClick={() => decide("Changes requested")} disabled={busy} style={s.miniBtn}>Ask for changes</button>
        <button onClick={() => decide("Rejected")} disabled={busy} style={{ ...s.miniBtn, color: "#C42525", borderColor: "#F6D0D0" }}>Reject</button>
      </div>

      {/* The gate itself. */}
      <div style={{ ...s.softBox, marginTop: 14 }}>
        {p.approval !== "Approved" ? (
          <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>
            Locked. Nothing reaches the client until this is approved — that is the whole
            point of the queue.
          </div>
        ) : p.status === "Draft" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#0F8A54", fontWeight: 700 }}>Approved — it can go out now.</span>
            <button onClick={() => patch(p._id, { status: "Sent" })} disabled={busy} style={s.primaryBtn}>
              <i className="bi bi-send-fill" style={{ fontSize: 12 }} /> Mark as sent
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#64748B" }}>Sent on {fmtD(p.sent)}.</span>
            <button onClick={() => go("status")} style={s.miniBtn}>Where it stands</button>
          </div>
        )}
      </div>
    </>
  );
}

/* The agreement only exists once the client has accepted the proposal: it
   goes out, and then it either comes back approved or it is refused. */
const AGREE = {
  "Not sent":  { n: "Not sent",  bg: "#F1F5F9", fg: "#94A3B8" },
  "Sent":      { n: "Sent",      bg: "#EEF2FF", fg: "#4338CA" },
  "Approved":  { n: "Approved",  bg: "#DCFCE7", fg: "#0F8A54" },
  "Rejected":  { n: "Rejected",  bg: "#FDEDED", fg: "#C42525" },
};
const agreeMeta = (k) => AGREE[k] || AGREE["Not sent"];

function Agreement({ p, busy, patch, go, pdf }) {
  const g = p.agreement || {};
  const st = g.status || "Not sent";
  const m = agreeMeta(st);
  const [note, setNote] = useState(g.note || "");
  const accepted = p.status === "Accepted";

  return (
    <>
      <KV k="Agreement" v={<span style={{ ...s.tag, background: m.bg, color: m.fg }}>{m.n}</span>} />
      <KV k="Sent on" v={g.sentOn ? fmtD(g.sentOn) : "—"} />
      <KV k="Decided on" v={g.decidedOn ? fmtD(g.decidedOn) : "—"} />
      {g.note ? <KV k="Note" v={g.note} /> : null}

      {!accepted ? (
        <div style={{ ...s.softBox, marginTop: 12, fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>
          The agreement goes out only after the client accepts the proposal.
          <div style={{ marginTop: 9 }}><button onClick={() => go("status")} style={s.miniBtn}>Where it stands</button></div>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 14 }}>
            <button onClick={() => pdf?.()} style={s.primaryBtn}>
              <i className="bi bi-file-earmark-pdf-fill" style={{ fontSize: 12 }} /> Preview / PDF
            </button>
            <div style={{ fontSize: 11.5, color: "#94A3B8", margin: "8px 0 12px", lineHeight: 1.55 }}>
              Generated from this proposal — scope, fees, term and two signature blocks.
            </div>
            <Field label="Note">
              <input className="lp-in" style={s.input} value={note} onChange={(e) => setNote(e.target.value)}
                     placeholder="Anything worth remembering" />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {st === "Not sent" ? (
              <button onClick={() => patch(p._id, { agreement: { status: "Sent", note } })} disabled={busy} style={s.primaryBtn}>
                <i className="bi bi-send-fill" style={{ fontSize: 12 }} /> Send the agreement
              </button>
            ) : (
              <button onClick={() => patch(p._id, { agreement: { note } })} disabled={busy} style={s.miniBtn}>Save</button>
            )}
            {st === "Sent" || st === "Rejected" ? (
              <button onClick={() => patch(p._id, { agreement: { status: "Approved", note } })} disabled={busy} style={s.primaryBtn}>
                <i className="bi bi-check2-circle" style={{ fontSize: 12 }} /> Approved
              </button>
            ) : null}
            {st === "Sent" || st === "Approved" ? (
              <button onClick={() => patch(p._id, { agreement: { status: "Rejected", note } })} disabled={busy}
                      style={{ ...s.miniBtn, color: "#C42525", borderColor: "#F6D0D0" }}>Rejected</button>
            ) : null}
            {st !== "Not sent" ? (
              <button onClick={() => patch(p._id, { agreement: { status: "Sent", note } })} disabled={busy} style={s.miniBtn}>
                Sent again
              </button>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}

function Status({ p, busy, patch, go, invoice }) {
  const m = statusMeta(p.status);
  const canSend = p.approval === "Approved";
  return (
    <>
      <KV k="Status" v={<span style={{ ...s.tag, background: m.bg, color: m.fg }}>{p.status}</span>} />
      <KV k="Sent on" v={p.sent ? fmtD(p.sent) : "not sent"} />
      <KV k="Last touch" v={lastTouch(p) ? fmtD(lastTouch(p)) : "—"} />
      <KV k="Valid till" v={p.validTill ? fmtD(p.validTill) : "—"} />

      {!canSend ? (
        <div style={{ ...s.softBox, marginTop: 12, fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>
          It cannot move until the admin approves it.
          <div style={{ marginTop: 9 }}><button onClick={() => go("approval")} style={s.miniBtn}>Open the approval</button></div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          {p.status === "Draft" ? (
            <button onClick={() => patch(p._id, { status: "Sent" })} disabled={busy} style={s.primaryBtn}>
              <i className="bi bi-send-fill" style={{ fontSize: 12 }} /> Mark as sent
            </button>
          ) : null}
          {p.status === "Sent" || p.status === "Negotiation" ? (
            <>
              <button onClick={() => patch(p._id, { status: "Accepted" })} disabled={busy} style={s.primaryBtn}>
                <i className="bi bi-check2-circle" style={{ fontSize: 12 }} /> Mark as accepted
              </button>
              {p.status !== "Negotiation" ? (
                <button onClick={() => patch(p._id, { status: "Negotiation" })} disabled={busy} style={s.miniBtn}>Into negotiation</button>
              ) : null}
              <button onClick={() => patch(p._id, { status: "Lost" })} disabled={busy} style={{ ...s.miniBtn, color: "#C42525", borderColor: "#F6D0D0" }}>Mark as lost</button>
            </>
          ) : null}
          {p.status === "Accepted" ? (
            <>
              <button onClick={() => invoice?.(p)} disabled={busy} style={s.primaryBtn}>
                <i className="bi bi-receipt" style={{ fontSize: 12 }} /> Raise the invoices
              </button>
              <Link href={`/dashboard/website/invoices?lead=${p.leadId}`} style={{ ...s.miniBtn, textDecoration: "none" }}>
                See its invoices
              </Link>
              <button onClick={() => go("agreement")} style={s.miniBtn}>
                <i className="bi bi-file-earmark-check-fill" style={{ fontSize: 12 }} /> Agreement
              </button>
              <div style={{ width: "100%", fontSize: 12, color: "#0F8A54", fontWeight: 700, marginTop: 4 }}>
                Won — the lead has been marked Won too. The advance goes out now, then one invoice a month.
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}

function Followups({ p, busy, patch }) {
  const [kind, setKind] = useState("mail");
  const [text, setText] = useState("");
  const [next, setNext] = useState(p.nextfu || "");

  const save = async () => {
    if (!text.trim()) return toast.error("Write something first");
    const ok = await patch(p._id, { followup: { type: kind, text }, ...(next !== p.nextfu ? { nextfu: next } : {}) });
    if (ok) setText("");
  };

  return (
    <>
      <KV k="Follow ups logged" v={(p.followups || []).length} />
      <KV k="Replies from them" v={replies(p)} />
      <KV k="Last touch" v={lastTouch(p) ? fmtDT(lastTouch(p)) : "—"} />

      <div className="lp-scroll" style={{ maxHeight: 300, overflowY: "auto", margin: "14px 0", display: "flex", flexDirection: "column", gap: 7 }}>
        {!(p.followups || []).length ? (
          <div style={{ fontSize: 12, color: "#94A3B8" }}>Nothing logged yet.</div>
        ) : p.followups.map((f, i) => {
          const inbound = f.type === "reply";
          return (
            <div key={i} style={{
              alignSelf: inbound ? "flex-start" : "flex-end", maxWidth: "82%",
              padding: "8px 11px", borderRadius: 12, fontSize: 12, lineHeight: 1.55,
              background: inbound ? "#fff" : "#EEF2FF",
              border: `1px solid ${inbound ? "#F0F0F8" : "#E0E7FF"}`, color: "#0F172A",
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 3 }}>
                {f.type === "call" ? "Call" : inbound ? "Their reply" : "Follow up"} · {fmtD(f.at)}{f.by ? ` · ${f.by}` : ""}
              </div>
              {f.text}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {[["mail", "Follow up mail"], ["call", "Log a call"], ["reply", "Log their reply"]].map(([k, n]) => (
          <button key={k} onClick={() => setKind(k)} style={kind === k ? s.miniBtnOn : s.miniBtn}>{n}</button>
        ))}
      </div>

      <Field label={kind === "call" ? "What was said" : kind === "reply" ? "What they wrote back" : "Message"}>
        <textarea className="lp-in" style={{ ...s.input, height: 110, padding: "9px 11px", resize: "vertical" }}
                  value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Field label="Next follow up on">
        <input className="lp-in" style={s.input} type="date" min={todayStr()} value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>

      <button onClick={save} disabled={busy} style={{ ...s.primaryBtn, opacity: busy ? .5 : 1 }}>
        <i className="bi bi-check2" style={{ fontSize: 12 }} /> Log it
      </button>
    </>
  );
}

function Owner({ p, busy, patch }) {
  const [owner, setOwner] = useState(p.owner || "");
  return (
    <>
      <KV k="Owner" v={p.owner || "—"} />
      <KV k="Raised on" v={fmtDT(p.createdAt)} />
      <div style={{ marginTop: 14 }}>
        <Field label="Who is running this">
          <input className="lp-in" style={s.input} value={owner} onChange={(e) => setOwner(e.target.value)} />
        </Field>
        <button onClick={() => patch(p._id, { owner })} disabled={busy} style={{ ...s.primaryBtn, opacity: busy ? .5 : 1 }}>Save</button>
      </div>
    </>
  );
}

/* ── raise one ──────────────────────────────────────────────────────────── */

function NewProposal({ leads, leadId, onClose, onDone }) {
  const svcList = useList("services", SERVICES);
  const [f, setF] = useState({
    leadId: leadId || "", svc: "", amount: "", term: "Retainer", months: "3",
    advPct: "50", validTill: "", owner: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const l = leads.find((x) => x._id === f.leadId);
    if (l && l.service) set("svc", l.service);
  }, [f.leadId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!f.leadId) return toast.error("Pick the lead this is for");
    if (!Number(f.amount)) return toast.error("Put a value on it");
    setSaving(true);
    try {
      const r = await fetch("/api/admin/proposals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(f),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      toast.success("Raised — it is in the admin queue now");
      onDone();
    } catch (e) {
      toast.error(e.message || "Could not raise that");
    }
    setSaving(false);
  };

  const lead = leads.find((x) => x._id === f.leadId);

  return (
    <Modal title="New proposal" icon="bi-file-earmark-plus-fill" wide onClose={onClose}>
      <Field label="Lead" hint="Only leads already in the CRM can be proposed to.">
        <select className="lp-in" style={s.input} value={f.leadId} onChange={(e) => set("leadId", e.target.value)}>
          <option value="">— pick a lead —</option>
          {leads.map((l) => (
            <option key={l._id} value={l._id}>
              {leadRef(l._id)} · {l.businessName || l.name}{l.businessName ? ` · ${l.name}` : ""}
            </option>
          ))}
        </select>
      </Field>

      {lead ? (
        <div style={{ ...s.softBox, marginBottom: 12 }}>
          <KV k="Company" v={lead.businessName || "—"} />
          <KV k="Contact" v={lead.name || "—"} />
          <KV k="Email" v={lead.email || "—"} />
          <KV k="Their budget" v={lead.budget || "—"} />
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Service">
          <select className="lp-in" style={s.input} value={f.svc} onChange={(e) => set("svc", e.target.value)}>
            <option value="">—</option>
            {svcList.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Deal value (₹)">
          <input className="lp-in" style={s.input} inputMode="numeric" value={f.amount}
                 onChange={(e) => set("amount", e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Payment term">
          <select className="lp-in" style={s.input} value={f.term} onChange={(e) => set("term", e.target.value)}>
            {TERMS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Months">
          <input className="lp-in" style={s.input} inputMode="numeric" value={f.months} disabled={f.term !== "Retainer"}
                 onChange={(e) => set("months", e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Advance %">
          <input className="lp-in" style={s.input} inputMode="numeric" value={f.advPct}
                 onChange={(e) => set("advPct", e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </Field>
        <Field label="Valid till">
          <input className="lp-in" style={s.input} type="date" min={todayStr()} value={f.validTill}
                 onChange={(e) => set("validTill", e.target.value)} />
        </Field>
      </div>

      {Number(f.amount) ? (
        <div style={{ ...s.softBox, marginBottom: 12 }}>
          <KV k="Advance on signing" v={inr(Math.round((Number(f.amount) * Number(f.advPct || 0)) / 100))} />
          {f.term === "Retainer" && Number(f.months) ? (
            <KV k="Per month" v={inr(Math.round(Number(f.amount) / Number(f.months)))} />
          ) : null}
        </div>
      ) : null}

      <Field label="Owner">
        <input className="lp-in" style={s.input} value={f.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Who is running this" />
      </Field>
      <Field label="Notes for the admin">
        <textarea className="lp-in" style={{ ...s.input, height: 80, padding: "9px 11px", resize: "vertical" }} value={f.notes}
                  onChange={(e) => set("notes", e.target.value)} placeholder="Anything they should know before approving" />
      </Field>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={s.miniBtn}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ ...s.primaryBtn, opacity: saving ? .5 : 1 }}>
          {saving ? "Saving…" : "Send for approval"}
        </button>
      </div>
    </Modal>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=") && !cookie.includes("sales_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}

const s = {
  panel: {
    background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
    boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden",
  },
  panelHead: {
    padding: "12px 16px", borderBottom: "1px solid #F4F4FD",
    display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap",
  },
  panelIcon: {
    width: 30, height: 30, borderRadius: 9, background: "#6366F118",
    color: "#4338CA", display: "grid", placeItems: "center", fontSize: 13, flexShrink: 0,
  },
  softBox: {
    background: "#FBFBFE", border: "1px solid #F0F0F8", borderRadius: 12, padding: "11px 13px",
  },
  th: {
    textAlign: "left", padding: "9px 12px", fontSize: 10.5, fontWeight: 800,
    letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8",
    background: "#FAFAFE", borderBottom: "1px solid #F0F0F8", whiteSpace: "nowrap",
  },
  td: {
    fontSize: 12, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle",
  },
  tag: {
    display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20,
    fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap",
  },
  input: {
    width: "100%", height: 38, borderRadius: 10, border: "1px solid #E7E7F2",
    padding: "0 10px", fontSize: 12.5, color: "#0F172A", background: "#fff", outline: "none",
  },
  iconBtn: {
    width: 28, height: 28, borderRadius: 8, border: "1px solid #E7E7F2", background: "#fff",
    color: "#64748B", cursor: "pointer", display: "inline-grid", placeItems: "center",
  },
  miniBtn: {
    display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px",
    borderRadius: 9, border: "1px solid #E7E7F2", background: "#fff", color: "#475569",
    fontSize: 11.5, fontWeight: 800, cursor: "pointer",
  },
  miniBtnOn: {
    display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px",
    borderRadius: 9, border: "1px solid #C7D2FE", background: "#EEF2FF", color: "#4338CA",
    fontSize: 11.5, fontWeight: 800, cursor: "pointer",
  },
  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 15px",
    borderRadius: 10, border: "1px solid #6366F1", background: "#6366F1", color: "#fff",
    fontSize: 12.5, fontWeight: 800, cursor: "pointer",
  },
};
