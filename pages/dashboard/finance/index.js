// pages/dashboard/finance/index.js — the Financial Hub.
//
// Billing used to sit inside Sales, which was never right: a rep's job ends
// with a signed proposal, and what happens to the money afterwards belongs to
// one screen. This is that screen. Every figure is counted off the invoices
// themselves, so it can never drift from the invoices board, and the panel at
// the top is the invoice sender — what it will do next, and what it has done.
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import { inr } from "@/utils/leadsMeta";

const total = (i) => Math.round((i.amount || 0) * (1 + (i.gstPct || 0) / 100));
const gstOf = (i) => Math.round(((i.amount || 0) * (i.gstPct || 0)) / 100);
const paidOf = (i) => (i.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0);
const leftOf = (i) => Math.max(0, total(i) - paidOf(i));

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SETTLED = ["Paid", "Cancelled"];

const STATUS_COLOR = {
  Draft: "#94A3B8", Sent: "#0E7490", "Partly paid": "#B45309",
  Paid: "#0F8A54", Overdue: "#DC2626", Cancelled: "#64748B",
};

// Signed days from today to a plain "YYYY-MM-DD": +2 ahead, -3 past.
const daysTo = (date, today) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);

const dueWord = (d) => (d > 1 ? `in ${d} days` : d === 1 ? "tomorrow" : d === 0 ? "today" : `${-d} day${d === -1 ? "" : "s"} late`);

export default function FinanceHub() {
  const [d, setD] = useState({ data: [], leads: [], billing: {}, sender: {}, today: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(null);

  const load = async () => {
    try {
      const r = await fetch("/api/admin/finance/summary", { credentials: "include" });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Could not load the financial dashboard");
      setD(j);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const leadName = useMemo(() => {
    const m = {};
    (d.leads || []).forEach((l) => { m[l._id] = l.businessName || l.name || "—"; });
    return m;
  }, [d.leads]);

  const money = useMemo(() => {
    const inv = d.data || [];
    const live = inv.filter((i) => i.status !== "Cancelled");
    return {
      raised: live.reduce((a, i) => a + total(i), 0),
      received: live.reduce((a, i) => a + paidOf(i), 0),
      outstanding: live.filter((i) => i.status !== "Draft").reduce((a, i) => a + leftOf(i), 0),
      overdue: live.filter((i) => i.status === "Overdue").reduce((a, i) => a + leftOf(i), 0),
      gst: live.filter((i) => i.status === "Paid").reduce((a, i) => a + gstOf(i), 0),
      drafts: inv.filter((i) => i.status === "Draft").length,
    };
  }, [d.data]);

  const byStatus = useMemo(() => {
    const m = {};
    (d.data || []).forEach((i) => { m[i.status] = (m[i.status] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [d.data]);

  /* The collections list: everything with money still owing, soonest first. */
  const chasing = useMemo(() => {
    const today = d.today || new Date().toISOString().slice(0, 10);
    return (d.data || [])
      .filter((i) => !SETTLED.includes(i.status) && i.status !== "Draft" && leftOf(i) > 0)
      .map((i) => ({ i, days: i.due ? daysTo(i.due, today) : 9999 }))
      .sort((a, b) => a.days - b.days);
  }, [d.data, d.today]);

  const lastMail = (i) => {
    const m = (i.mailsSent || [])[(i.mailsSent || []).length - 1];
    if (!m) return "never";
    return `${m.key} · ${String(m.at || "").slice(0, 10)}`;
  };

  const held = (d.data || []).filter((i) => i.disputed && !SETTLED.includes(i.status));

  const b = d.billing || {};
  const sendAt = `${String(Number(b.sendHour || 0)).padStart(2, "0")}:${String(Number(b.sendMinute || 0)).padStart(2, "0")}`;
  const onDays = (Array.isArray(b.sendDays) ? b.sendDays : []).map((x) => DAYS[Number(x)]).filter(Boolean).join(", ");

  const runNow = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/finance/run", { method: "POST", credentials: "include" });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "The sender did not run");
      setRan(j);
      toast.success(j.sent?.length ? `${j.sent.length} mail${j.sent.length === 1 ? "" : "s"} sent` : "Nothing was due — no mail sent");
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <section className="main-dashboard-area">
      <Head><title>Financial Hub — Viralon</title></Head>

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            <div style={s.head}>
              <div>
                <h2 style={s.h1}>Financial Hub</h2>
                <p style={s.sub}>Invoices, what has come in, what is still owed — and the sender that chases it.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/dashboard/website/invoices" style={{ ...s.ghost, textDecoration: "none" }}>
                  <i className="bi bi-receipt" style={{ marginRight: 6 }} />Invoices
                </Link>
                <Link href="/dashboard/finance/sender" style={{ ...s.primary, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  <i className="bi bi-send-check-fill" style={{ marginRight: 6 }} />Invoice sender
                </Link>
              </div>
            </div>

            {/* ── the sender, in one line of plain English ── */}
            <div style={{ ...s.panel, marginBottom: 14, borderColor: b.autoSend || b.dueReminders ? "#DDD6FE" : "#F0F0F8" }}>
              <div style={{ padding: "14px 16px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ ...s.dot, background: b.autoSend || b.dueReminders ? "#7C3AED" : "#CBD5E1" }}>
                  <i className={`bi ${b.autoSend || b.dueReminders ? "bi-send-check-fill" : "bi-pause-fill"}`} style={{ color: "#fff", fontSize: 15 }} />
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A" }}>
                    {b.autoSend || b.dueReminders ? "The invoice sender is on" : "The invoice sender is off"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                    {b.autoSend || b.dueReminders
                      ? <>Mails go out from <b>{sendAt} IST</b>{onDays ? ` on ${onDays}` : ""}.
                        {b.autoSend ? " New invoices are sent on their own." : " New invoices wait for someone to send them."}
                        {b.dueReminders
                          ? ` Due reminders ${(b.beforeDays || []).length ? `${(b.beforeDays || []).join(" and ")} day(s) before` : ""}${b.onDue ? ", on the day" : ""}, then every ${b.afterEvery || 7} days up to ${b.afterMax || 0} times.`
                          : " Due reminders are off."}</>
                      : "Nothing is mailed automatically. Turn it on in Invoice sender."}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={s.mk}>Next run</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginTop: 3 }}>{d.sender?.next || "—"}</div>
                </div>
                <button style={s.ghost} onClick={runNow} disabled={busy}>
                  <i className="bi bi-lightning-charge-fill" style={{ marginRight: 6 }} />{busy ? "Running…" : "Run now"}
                </button>
              </div>
              {ran && (
                <div style={{ padding: "10px 16px", borderTop: "1px solid #F4F4FD", background: "#FAFAFE", fontSize: 12, color: "#475569" }}>
                  Last run: {ran.sent?.length || 0} sent, {ran.skipped?.length || 0} failed, {ran.marked || 0} marked overdue.
                  {(ran.skipped || []).slice(0, 3).map((x) => <div key={x.invoice + x.key} style={{ color: "#DC2626", marginTop: 3 }}>{x.key}: {x.error}</div>)}
                </div>
              )}
            </div>

            <div style={s.strip}>
              <M k="Raised" v={inr(money.raised)} n={`${(d.data || []).length} invoices`} />
              <M k="Received" v={inr(money.received)} n="paid and part paid" />
              <M k="Outstanding" v={inr(money.outstanding)} n="still to come in" />
              <M k="Overdue" v={inr(money.overdue)} n="past the due date" c="#DC2626" />
              <M k="GST collected" v={inr(money.gst)} n="on paid invoices" />
              <M k="In dispute" v={held.length} n="reminders on hold" c={held.length ? "#B4690E" : "#0F172A"} />
            </div>

            <div style={s.cols2}>
              {/* ── collections ── */}
              <div style={s.panel}>
                <div style={s.panelHead}>
                  <i className="bi bi-hourglass-split" style={{ color: "#7C3AED" }} />
                  <b style={{ fontSize: 13 }}>Money still owed</b>
                  <span style={s.tag}>{chasing.length}</span>
                </div>
                {loading ? (
                  <div style={{ padding: 20, ...s.muted }}>Loading…</div>
                ) : !chasing.length ? (
                  <div style={{ padding: 20, ...s.muted }}>Nothing outstanding — every invoice raised has been settled.</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={s.th}>Client</th><th style={s.th}>Due</th>
                        <th style={{ ...s.th, textAlign: "right" }}>Payable</th><th style={s.th}>Last mail</th>
                      </tr></thead>
                      <tbody>
                        {chasing.slice(0, 12).map(({ i, days }) => (
                          <tr key={i._id}>
                            <td style={{ ...s.td, padding: "9px 12px" }}>
                              <div style={{ fontWeight: 700, color: "#0F172A" }}>{i.co || leadName[i.leadId] || "—"}</div>
                              <div style={{ fontSize: 11.5, color: "#94A3B8" }}>{i.svc || i.kind}</div>
                            </td>
                            <td style={{ ...s.td, padding: "9px 12px" }}>
                              <div>{i.due || "not set"}</div>
                              {i.due && <div style={{ fontSize: 11.5, color: days < 0 ? "#DC2626" : "#94A3B8" }}>{dueWord(days)}</div>}
                            </td>
                            <td style={{ ...s.td, padding: "9px 12px", textAlign: "right", fontWeight: 800 }}>{inr(leftOf(i))}</td>
                            <td style={{ ...s.td, padding: "9px 12px", fontSize: 11.5, color: "#94A3B8" }}>
                              {i.disputed
                                ? <span style={{ color: "#B4690E", fontWeight: 700 }}>on hold — in dispute</span>
                                : lastMail(i)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {chasing.length > 12 && (
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #F4F4FD" }}>
                    <Link href="/dashboard/website/invoices" style={{ fontSize: 12, color: "#6366F1", fontWeight: 700 }}>
                      All {chasing.length} on the invoices board →
                    </Link>
                  </div>
                )}
              </div>

              {/* ── where the invoices stand ── */}
              <div style={s.panel}>
                <div style={s.panelHead}>
                  <i className="bi bi-receipt" style={{ color: "#7C3AED" }} />
                  <b style={{ fontSize: 13 }}>Invoices by status</b>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {!byStatus.length ? (
                    <div style={s.muted}>No invoices raised yet.</div>
                  ) : byStatus.map(([k, v]) => (
                    <div key={k} style={s.srcRow}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[k] || "#94A3B8", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12.5, color: "#334155" }}>{k}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: "#0F172A" }}>{v}</span>
                    </div>
                  ))}
                  {!!money.drafts && (
                    <p style={s.note}>
                      {money.drafts} invoice{money.drafts === 1 ? " is" : "s are"} still a draft.
                      {b.autoSend ? " The sender will mail them on its next run." : " Turn auto-send on, or send them from the board."}
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
      <ToastContainer position="bottom-right" autoClose={2600} hideProgressBar newestOnTop closeOnClick theme="light" />
    </section>
  );
}

function M({ k, v, n, c }) {
  return (
    <div style={s.mcell}>
      <div style={s.mk}>{k}</div>
      <div style={{ ...s.mv, color: c || "#0F172A" }}>{v}</div>
      <div style={s.mn}>{n}</div>
    </div>
  );
}

const s = {
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  h1: { margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" },
  sub: { margin: "3px 0 0", fontSize: 12.5, color: "#94A3B8" },
  primary: { background: "#7C3AED", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  ghost: { background: "#fff", color: "#475569", border: "1px solid #E5E7EB", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center" },
  dot: { width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0 },
  strip: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", background: "#fff",
           border: "1px solid #F0F0F8", borderRadius: 16, overflow: "hidden", marginBottom: 14 },
  mcell: { padding: "14px 16px", borderRight: "1px solid #F4F4FD" },
  mk: { fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#94A3B8" },
  mv: { fontSize: 20, fontWeight: 800, marginTop: 4 },
  mn: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  cols2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 14, alignItems: "start", marginBottom: 14 },
  panel: { background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(124,58,237,.06)", overflow: "hidden" },
  panelHead: { padding: "12px 16px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center", gap: 9 },
  tag: { fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#7C3AED14", color: "#6D28D9" },
  note: { fontSize: 11.5, color: "#94A3B8", marginTop: 10 },
  muted: { fontSize: 12.5, color: "#94A3B8" },
  srcRow: { display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: "1px solid #F4F4FD" },
  th: { textAlign: "left", padding: "9px 12px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase",
        color: "#94A3B8", background: "#FAFAFE", borderBottom: "1px solid #F0F0F8", whiteSpace: "nowrap" },
  td: { fontSize: 12.5, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
};
