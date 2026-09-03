// pages/dashboard/website/reports.js — Website → Reports.
// The prototype's report screen, but every number here is counted off the real
// leads, proposals and invoices. Nothing is stored for reporting, so the page
// can never drift from the boards it summarises.
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import { inr, inrShort, srcOf, prepPct, initials, todayStr } from "@/utils/leadsMeta";

const OPEN_OUT = ["Won", "Lost", "Not qualified", "NPC"];
const SRC_COLORS = ["#6366F1", "#4338CA", "#0F8A54", "#F59E0B", "#0E7490", "#B45309", "#7C3AED", "#DC2626"];

/* Ranges are cut on the date the lead, proposal or invoice was created. */
const RANGES = [
  { k: "all", n: "All time" },
  { k: "month", n: "This month" },
  { k: "last", n: "Last month" },
  { k: "quarter", n: "Last 90 days" },
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
  const now = new Date();
  if (range === "month") return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth();
  if (range === "last") {
    const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return x.getFullYear() === p.getFullYear() && x.getMonth() === p.getMonth();
  }
  return (now - x) / 86400000 <= 90;
}

const invTotal = (i) => Math.round((i.amount || 0) * (1 + (i.gstPct || 0) / 100));
const gstOf = (i) => Math.round(((i.amount || 0) * (i.gstPct || 0)) / 100);
// Overdue is derived, never stored — a sent invoice past its due date.
const invStatus = (i) => (i.status === "Sent" && i.due && i.due < todayStr() ? "Overdue" : i.status);

export default function ReportsPage() {
  const [d, setD] = useState({ leads: [], proposals: [], invoices: [], team: [] });
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/reports", { credentials: "include" });
        const j = await r.json();
        if (!j.success) throw new Error(j.message || "Could not load the reports");
        setD(j);
      } catch (e) { toast.error(e.message); } finally { setLoading(false); }
    })();
  }, []);

  /* One filtered slice, shared by every panel below. */
  const cut = useMemo(() => {
    const leads = d.leads.filter((l) => inRange(l.createdAt, range));
    const ids = new Set(leads.map((l) => l._id));
    return {
      leads,
      proposals: d.proposals.filter((p) => ids.has(p.leadId)),
      invoices: d.invoices.filter((i) => ids.has(i.leadId)),
    };
  }, [d, range]);

  const funnel = useMemo(() => {
    const { leads, proposals } = cut;
    const n = (f) => leads.filter(f).length;
    return [
      { n: "Leads captured", v: leads.length },
      { n: "Contacted", v: n((l) => l.status !== "New") },
      { n: "Meetings booked", v: n((l) => !!l.meetingDate) },
      { n: "Consultations held", v: n((l) => l.held === "held") },
      { n: "Qualified", v: n((l) => Number(l.score || 0) >= 6) },
      { n: "Proposals sent", v: proposals.filter((p) => p.sent).length },
      { n: "Won", v: n((l) => l.status === "Won") },
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
      gst: paid.reduce((a, i) => a + gstOf(i), 0),
    };
  }, [cut]);

  /* Revenue is counted on the day the money actually came in. */
  const revenue = useMemo(() => {
    const map = {};
    d.invoices.filter((i) => i.status === "Paid").forEach((i) => {
      const k = monthKey(i.paidOn || i.issued);
      if (k) map[k] = (map[k] || 0) + invTotal(i);
    });
    const keys = Object.keys(map).sort().slice(-6);
    return keys.map((k) => ({ k, m: monthLabel(k), v: map[k] }));
  }, [d]);

  const sources = useMemo(() => {
    const map = {};
    cut.leads.forEach((l) => { const s = srcOf(l); map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1])
      .map(([n, v], i) => ({ n, v, c: SRC_COLORS[i % SRC_COLORS.length] }));
  }, [cut]);

  const lost = useMemo(() => {
    const map = {};
    cut.leads.filter((l) => ["Lost", "Not qualified"].includes(l.status))
      .forEach((l) => { const r = l.lostReason || "No reason recorded"; map[r] = (map[r] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ n, v }));
  }, [cut]);

  const prep = useMemo(
    () => cut.leads.filter((l) => l.meetingDate).slice(0, 6).map((l) => ({ n: l.businessName || l.name, v: prepPct(l) })),
    [cut]
  );

  const perTeam = useMemo(() => {
    const { leads, proposals, invoices } = cut;
    return (d.team || []).filter((t) => t.active).map((t) => {
      const mine = leads.filter((l) => l.salespersonId === String(t._id));
      const ids = new Set(mine.map((l) => l._id));
      const props = proposals.filter((p) => ids.has(p.leadId));
      return {
        t,
        leads: mine.length,
        props: props.length,
        won: props.filter((p) => p.status === "Accepted").length,
        rev: invoices.filter((i) => ids.has(i.leadId) && i.status === "Paid").reduce((a, i) => a + invTotal(i), 0),
      };
    });
  }, [cut, d.team]);

  const top = funnel[0].v || 1;
  const held = cut.leads.filter((l) => l.held === "held").length;
  const booked = cut.leads.filter((l) => l.meetingDate).length;
  const maxRev = Math.max(1, ...revenue.map((r) => r.v));

  return (
    <section className="main-dashboard-area">
      <Head><title>Reports — Website</title></Head>

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            <div style={s.head}>
              <div>
                <h2 style={s.h1}>Reports</h2>
                <p style={s.sub}>Leads, funnel, proposals, revenue and collections, in one place.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select style={s.sel} value={range} onChange={(e) => setRange(e.target.value)}>
                  {RANGES.map((r) => <option key={r.k} value={r.k}>{r.n}</option>)}
                </select>
                <Link href="/dashboard/website/leads" style={{ ...s.ghost, textDecoration: "none" }}>
                  <i className="bi bi-person-lines-fill" style={{ marginRight: 6 }} />Leads
                </Link>
                <button style={s.primary} onClick={() => window.print()}>
                  <i className="bi bi-printer-fill" style={{ marginRight: 6 }} />Export
                </button>
              </div>
            </div>

            <div style={s.strip}>
              <M k="Leads received" v={cut.leads.length} n="all sources" />
              <M k="Meeting show rate" v={`${Math.round((held / Math.max(1, booked)) * 100)}%`} n="booked to held" />
              <M k="Lead to win" v={`${Math.round((funnel[6].v / top) * 100)}%`} n="end to end conversion" tone="#0F8A54" />
              <M k="Value won" v={inr(money.won)} n="accepted proposals" tone="#0F8A54" />
              <M k="Collected" v={inr(money.received)} n="paid invoices, with GST" />
              <M k="Outstanding" v={inr(money.outstanding)} n={`${inr(money.overdue)} of it overdue`} tone={money.overdue ? "#DC2626" : "#0F172A"} />
            </div>

            {loading ? <div style={s.empty}>Loading…</div> : (
              <>
                <div className="rp-cols2" style={s.cols2}>
                  <Panel title="Funnel, capture to won" tag={`${top} leads in`}>
                    {funnel.map((step, i) => (
                      <div key={step.n} style={s.fstep}>
                        <div style={s.fname}>{step.n}</div>
                        <div style={s.ftrack}>
                          <i style={{ ...s.ffill, width: `${Math.max(4, (step.v / top) * 100)}%` }} />
                          <b style={s.fval}>{step.v}</b>
                        </div>
                        <div style={s.fconv}>
                          {i === 0 ? "—" : `${Math.round((step.v / Math.max(1, funnel[i - 1].v)) * 100)}%`}
                        </div>
                      </div>
                    ))}
                    <div style={s.note}>
                      The percentage on the right is the step to step conversion, which is where the leak actually shows.
                    </div>
                  </Panel>

                  <Panel title="Revenue by month" tag={`${inr(revenue.reduce((a, r) => a + r.v, 0))} total`}>
                    {revenue.length ? (
                      <div style={s.bars}>
                        {revenue.map((r) => (
                          <div key={r.k} style={s.bar}>
                            <div style={s.barVal}>{inrShort(r.v)}</div>
                            <div style={s.barTrack}>
                              <div style={{ ...s.barCol, height: `${Math.max(4, (r.v / maxRev) * 100)}%` }} />
                            </div>
                            <div style={s.barLbl}>{r.m}</div>
                          </div>
                        ))}
                      </div>
                    ) : <div style={s.muted}>No payment has been marked received yet.</div>}
                  </Panel>
                </div>

                <div className="rp-cols3" style={s.cols3}>
                  <Panel title="Where the leads came from">
                    {sources.length ? sources.map((x) => (
                      <Row key={x.n} n={x.n} v={x.v} pct={Math.round((x.v / Math.max(1, cut.leads.length)) * 100)}
                           w={(x.v / sources[0].v) * 100} c={x.c} />
                    )) : <div style={s.muted}>Nothing in this range.</div>}
                  </Panel>

                  <Panel title="Proposals and closing">
                    <KV k="Proposals raised" v={cut.proposals.length} />
                    <KV k="Approved by admin" v={cut.proposals.filter((p) => p.approval === "Approved").length} />
                    <KV k="Blocked at approval" v={cut.proposals.filter((p) => p.approval !== "Approved").length} />
                    <KV k="Sent to clients" v={cut.proposals.filter((p) => p.sent).length} />
                    <KV k="Accepted" v={cut.proposals.filter((p) => p.status === "Accepted").length} />
                    <KV k="Value proposed" v={inr(money.proposed)} />
                    <KV k="Value won" v={inr(money.won)} />
                    <KV k="Win rate" v={`${Math.round((cut.proposals.filter((p) => p.status === "Accepted").length / Math.max(1, cut.proposals.length)) * 100)}%`} />
                  </Panel>

                  <Panel title="Collections">
                    <KV k="Invoiced" v={inr(money.invoiced)} />
                    <KV k="Received" v={inr(money.received)} />
                    <KV k="Outstanding" v={inr(money.outstanding)} />
                    <KV k="Overdue" v={inr(money.overdue)} />
                    <KV k="GST collected" v={inr(money.gst)} />
                    <KV k="Invoices raised" v={cut.invoices.length} />
                    <KV k="Paid" v={cut.invoices.filter((i) => i.status === "Paid").length} />
                  </Panel>
                </div>

                <div className="rp-cols2" style={{ ...s.cols2, marginTop: 14 }}>
                  <Panel title="Why leads drop out">
                    {lost.length ? lost.map((x) => (
                      <Row key={x.n} n={x.n} v={x.v} w={(x.v / lost[0].v) * 100} c="#DC2626" />
                    )) : <div style={s.muted}>Nobody has been marked lost in this range.</div>}
                  </Panel>

                  <Panel title="Preparation discipline">
                    {prep.length ? (
                      <>
                        {prep.map((x) => (
                          <Row key={x.n} n={x.n} v={`${x.v}%`} w={x.v} c={x.v === 100 ? "#0F8A54" : "#F59E0B"} />
                        ))}
                        <div style={s.note}>
                          Meetings that go in fully prepared close far better than the ones that do not.
                        </div>
                      </>
                    ) : <div style={s.muted}>No meeting booked in this range.</div>}
                  </Panel>
                </div>

                {perTeam.length ? (
                  <div style={{ marginTop: 14 }}>
                    <Panel title="How the team is doing" tag={`${perTeam.length} on the team`}>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={s.th}>Salesperson</th><th style={s.th}>Leads</th><th style={s.th}>Proposals</th>
                              <th style={s.th}>Won</th><th style={s.th}>Win rate</th><th style={s.th}>Collected</th>
                            </tr>
                          </thead>
                          <tbody>
                            {perTeam.map((x) => (
                              <tr key={x.t._id}>
                                <td style={{ ...s.td, padding: "9px 12px" }}>
                                  <span style={s.ava}>{initials(x.t.name)}</span>
                                  <b style={{ fontWeight: 700, color: "#0F172A" }}>{x.t.name}</b>
                                </td>
                                <td style={{ ...s.td, padding: "9px 12px" }}>{x.leads}</td>
                                <td style={{ ...s.td, padding: "9px 12px" }}>{x.props}</td>
                                <td style={{ ...s.td, padding: "9px 12px" }}>{x.won}</td>
                                <td style={{ ...s.td, padding: "9px 12px" }}>{Math.round((x.won / Math.max(1, x.props)) * 100)}%</td>
                                <td style={{ ...s.td, padding: "9px 12px" }}>{inr(x.rev)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                  </div>
                ) : null}
              </>
            )}

          </div>
        </section>
      </div>

      <ToastContainer position="bottom-right" autoClose={2600} hideProgressBar />
      <style jsx global>{`
        @media (max-width: 1180px) {
          .rp-cols2, .rp-cols3 { grid-template-columns: 1fr !important; }
        }
        @media print { .sidebar, .left-panel-area, .navbar { display: none !important; } }
      `}</style>
    </section>
  );
}

function Panel({ title, tag, children }) {
  return (
    <div style={s.panel}>
      <div style={s.panelHead}>
        <b style={{ fontSize: 13, color: "#0F172A", flex: 1 }}>{title}</b>
        {tag ? <span style={s.tag}>{tag}</span> : null}
      </div>
      <div style={{ padding: "12px 16px 16px" }}>{children}</div>
    </div>
  );
}

const Row = ({ n, v, pct, w, c }) => (
  <div style={s.srcRow}>
    <span style={{ width: 9, height: 9, borderRadius: 3, background: c, flexShrink: 0 }} />
    <span style={{ flex: 1, fontSize: 12.5, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</span>
    <span style={s.mini}><i style={{ display: "block", height: "100%", borderRadius: 6, width: `${Math.max(4, w)}%`, background: c }} /></span>
    <b style={{ fontSize: 12.5, color: "#0F172A", minWidth: 34, textAlign: "right" }}>{v}</b>
    {pct !== undefined ? <span style={{ fontSize: 11.5, color: "#94A3B8", minWidth: 34, textAlign: "right" }}>{pct}%</span> : null}
  </div>
);

const KV = ({ k, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 12.5, borderBottom: "1px solid #F4F4FD" }}>
    <span style={{ color: "#94A3B8" }}>{k}</span>
    <b style={{ color: "#334155" }}>{v}</b>
  </div>
);

const M = ({ k, v, n, tone }) => (
  <div style={s.mcell}>
    <div style={s.mk}>{k}</div>
    <div style={{ ...s.mv, color: tone || "#0F172A" }}>{v}</div>
    <div style={s.mn}>{n}</div>
  </div>
);

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  // Admin-only: a salesperson login is limited to the Sales panel.
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}

const s = {
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  h1: { margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" },
  sub: { margin: "3px 0 0", fontSize: 12.5, color: "#94A3B8" },
  sel: { border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 11px", fontSize: 12.5, color: "#334155", background: "#fff" },
  primary: { background: "#6366F1", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  ghost: { background: "#fff", color: "#475569", border: "1px solid #E5E7EB", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center" },
  strip: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", background: "#fff",
           border: "1px solid #F0F0F8", borderRadius: 16, overflow: "hidden", marginBottom: 14 },
  mcell: { padding: "14px 16px", borderRight: "1px solid #F4F4FD" },
  mk: { fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#94A3B8" },
  mv: { fontSize: 20, fontWeight: 800, marginTop: 4 },
  mn: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  cols2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 14, alignItems: "start", marginBottom: 14 },
  cols3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, alignItems: "start" },
  panel: { background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden" },
  panelHead: { padding: "12px 16px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center", gap: 9 },
  tag: { fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#6366F114", color: "#4338CA" },
  fstep: { display: "flex", alignItems: "center", gap: 10, padding: "5px 0" },
  fname: { width: 128, fontSize: 12, color: "#64748B", flexShrink: 0 },
  ftrack: { flex: 1, height: 22, background: "#F6F6FC", borderRadius: 7, position: "relative", overflow: "hidden" },
  ffill: { display: "block", height: "100%", borderRadius: 7, background: "linear-gradient(90deg,#818CF8,#6366F1)" },
  fval: { position: "absolute", right: 8, top: 3, fontSize: 12, color: "#0F172A" },
  fconv: { width: 44, textAlign: "right", fontSize: 11.5, fontWeight: 700, color: "#94A3B8" },
  note: { fontSize: 11.5, color: "#94A3B8", marginTop: 10 },
  muted: { fontSize: 12.5, color: "#94A3B8" },
  bars: { display: "flex", alignItems: "flex-end", gap: 12, height: 190, paddingTop: 6 },
  bar: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%" },
  barVal: { fontSize: 11, fontWeight: 700, color: "#475569" },
  barTrack: { flex: 1, width: "100%", display: "flex", alignItems: "flex-end" },
  barCol: { width: "100%", borderRadius: "7px 7px 0 0", background: "linear-gradient(180deg,#818CF8,#6366F1)" },
  barLbl: { fontSize: 11, color: "#94A3B8" },
  srcRow: { display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: "1px solid #F4F4FD" },
  mini: { width: 84, height: 6, borderRadius: 6, background: "#F1F1FA", overflow: "hidden", flexShrink: 0 },
  empty: { background: "#fff", border: "1px solid #F0F0F8", borderRadius: 16, padding: 28, textAlign: "center", fontSize: 13, color: "#94A3B8" },
  th: { textAlign: "left", padding: "9px 12px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase",
        color: "#94A3B8", background: "#FAFAFE", borderBottom: "1px solid #F0F0F8", whiteSpace: "nowrap" },
  td: { fontSize: 12.5, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
  ava: { width: 24, height: 24, borderRadius: 7, background: "#6366F1", color: "#fff", display: "inline-grid",
         placeItems: "center", fontSize: 10, fontWeight: 800, marginRight: 8, verticalAlign: "middle" },
};
