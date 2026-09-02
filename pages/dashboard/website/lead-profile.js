// pages/dashboard/website/lead-profile.js — Website → Lead profile.
//
// Laid out the way the CRM prototype has it: a strip of six numbers, then two
// columns — the whole journey on the left as one timeline, and Contact,
// Attribution, Commercial and Notes stacked on the right. The journey is built
// from the lead itself, so nothing has to be logged twice.
import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import {
  LADDER, PREP, SCOREQ, srcOf, prepPct, leadCode,
  inr, fmtD, fmtDT, prettyTime, budgetValue, todayStr,
} from "@/utils/leadsMeta";

const propCode = (p) => `VP-${String(p?._id || "").slice(-4).toUpperCase()}`;
const invCode  = (i) => `INV-${String(i?._id || "").slice(-4).toUpperCase()}`;
const gstAmt   = (i) => Math.round(((i.amount || 0) * (i.gstPct || 0)) / 100);
const grand    = (i) => (i.amount || 0) + gstAmt(i);
const advAmt   = (p) => Math.round(((p.amount || 0) * (p.advPct || 0)) / 100);

const D = (v) => (v ? new Date(v).getTime() : 0);
const daysBetween = (a, b) => Math.max(0, Math.round((D(b) - D(a)) / 86400000));

/* The dot on the timeline carries the meaning: indigo for the ordinary beat of
   the process, amber for something that started it, green for money and yes,
   grey for what fired on its own. */
const TONE = { acc: "#F59E0B", gr: "#0F8A54", mut: "#CBD5E1", "": "#6366F1" };

/* ── the journey, assembled from the lead and its paperwork ───────────────── */
function journeyOf(l, proposals, invoices, ownerName) {
  const ev = [];
  const push = (at, k, t, d) => { if (at) ev.push({ at, k, t, d }); };

  push(l.createdAt, "acc", "Lead captured",
    `Source ${srcOf(l)}${l.source?.utmCampaign ? `, campaign ${l.source.utmCampaign}` : ""}` +
    `${l.source?.adset ? `, ad set ${l.source.adset}` : ""}. Assigned to ${ownerName}.` +
    `${l.budget ? ` Budget stated at ${l.budget} a month.` : ""}`);

  if (l.meetingDate) {
    const when = `${fmtD(l.meetingDate)}${l.meetingTime ? ` at ${prettyTime(l.meetingTime)}` : ""}`;
    push(l.createdAt, "", `${l.meetingMode || "Meeting"} booked`,
      `${when}.${l.meetLink ? ` Link ${l.meetLink}.` : ""} Confirmation with the agenda mailed to ${l.email || "the prospect"}.`);

    const sentAt = {};
    (l.remindersSent || []).forEach((r) => { if (!sentAt[r.key]) sentAt[r.key] = r.at; });
    LADDER.forEach((x) => {
      if (!sentAt[x.k]) return;
      push(sentAt[x.k], "mut", `Reminder, ${x.n}`, "Sent automatically to the prospect and the salesperson.");
    });

    const pct = prepPct(l);
    const left = PREP.length - (l.prep || []).length;
    push(l.meetingDate, "", `Preparation at ${pct}%`,
      pct === 100 ? `All ${PREP.length} checks done before the call.`
                  : `${left} check${left === 1 ? "" : "s"} still open. The 3 hour reminder flags this to the salesperson.`);

    push(l.meetingDate, l.held === "held" ? "gr" : "", "Consultation, 30 minutes",
      l.held === "held" ? "Held. Automatic mails stop here and manual follow up unlocks."
      : l.held === "noshow" ? "Prospect did not join. Reschedule mail sent automatically."
      : "Scheduled, outcome not marked yet.");
  }

  (l.connects || []).forEach((c) =>
    push(c.at, "mut", `Connect attempt, ${c.via}`, `${c.outcome}${c.note ? `. ${c.note}` : ""}${c.by ? ` — ${c.by}` : ""}`));

  if (l.matSent) {
    push(l.matSentAt || l.meetingDate || l.createdAt, "", "Material pack shared",
      "Website, Instagram, LinkedIn, our work and the growth system PDF, on email and WhatsApp.");
  }

  if (l.score != null) {
    const hit = SCOREQ.filter((q) => (l.scoreAnswers || {})[q.k]).length;
    push(l.meetingDate || l.createdAt, "", `Lead scored ${l.score} out of 10`,
      `${hit} of ${SCOREQ.length} checks cleared. ` +
      (l.score >= 8 ? "Priority lead." : l.score >= 6 ? "Solid, keep follow up tight." : "Weak, nurture track."));
  }

  proposals.forEach((p) => {
    push(p.createdAt, "acc", `Proposal ${propCode(p)} raised, ${inr(p.amount)} ${p.term === "Retainer" ? "a month" : "one time"}`,
      `Approval: ${p.approval === "Awaiting approval" ? "Pending" : p.approval}` +
      `${p.adminNote ? `. Admin note: ${p.adminNote}` : ""}`);
    if (p.sent) {
      push(p.sent, "", "Proposal sent to the client",
        `${p.validTill ? `Valid till ${fmtD(p.validTill)}. ` : ""}Advance at ${p.advPct || 0}%.`);
    }
    (p.followups || []).forEach((f) =>
      push(f.at, f.type === "reply" ? "gr" : "mut",
        f.type === "reply" ? "Reply from the client" : `Follow up, ${f.type === "call" ? "Call" : "Mail"}`,
        `${f.text || ""}${f.by ? ` — ${f.by}` : ""}`));
    if (p.status === "Accepted") {
      push(p.approvedOn || p.sent || p.updatedAt, "gr", "Proposal accepted",
        "The lead is marked Won and the billing schedule can be raised.");
    }
  });

  invoices.forEach((i) => {
    push(i.issued, "", `Invoice ${invCode(i)}, ${inr(grand(i))}`,
      `${i.kind}${i.kind === "Monthly" && i.ofMonths ? ` ${i.monthNo} of ${i.ofMonths}` : ""}` +
      `${i.svc ? ` · ${i.svc}` : ""}. Due ${fmtD(i.due)}.`);
    if (i.status === "Paid") {
      push(i.paidOn || i.updatedAt, "gr", `Payment received, ${inr(grand(i))}`,
        `${i.method || "Not recorded"}${i.ref ? `, reference ${i.ref}` : ""}`);
    }
  });

  (l.events || []).forEach((e) => {
    if (e.type === "status") push(e.at, "mut", e.text || "Stage changed", "");
  });

  return ev.sort((a, b) => D(a.at) - D(b.at));
}

/* ── small pieces, matching the prototype ─────────────────────────────────── */
function KV({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0",
                  fontSize: 12, borderBottom: "1px dashed #EDEDF7" }}>
      <span style={{ color: "#94A3B8", fontWeight: 700, flexShrink: 0 }}>{k}</span>
      <b style={{ fontWeight: 700, textAlign: "right", color: "#0F172A", minWidth: 0, wordBreak: "break-word" }}>
        {v === null || v === undefined || v === "" ? "—" : v}
      </b>
    </div>
  );
}

function M({ k, v, d, tone }) {
  return (
    <div style={{ padding: "12px 14px", borderRight: "1px solid #F4F4FD", minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase", color: "#94A3B8" }}>{k}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", marginTop: 3, lineHeight: 1.15,
                    color: tone === "pos" ? "#0F8A54" : tone === "acc" ? "#B4690E" : "#0F172A" }}>{v}</div>
      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d}</div>
    </div>
  );
}

function Panel({ title, right, children, pad }) {
  return (
    <div style={s.panel}>
      <header style={s.panelHead}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#0F172A", flex: 1 }}>{title}</h3>
        {right}
      </header>
      <div style={{ padding: pad || "12px 15px 14px" }}>{children}</div>
    </div>
  );
}

/* ── the page ─────────────────────────────────────────────────────────────── */
export default function LeadProfile() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [pick, setPick] = useState("");
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  // The picker is the header dropdown, exactly as the prototype has it.
  useEffect(() => {
    fetch("/api/admin/leads", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setList(Array.isArray(j?.data) ? j.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const q = String(router.query.lead || "");
    if (q) setPick(q);
    else if (!pick && list.length) setPick(list[0]._id);
  }, [router.isReady, router.query.lead, list]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/leads/${id}/profile`, { credentials: "include" });
      const j = await r.json();
      if (!j?.success) throw new Error(j?.message || "Could not load this lead");
      setD(j);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(pick); }, [pick, load]);

  const l = d?.lead || null;
  const props = d?.proposals || [];
  const invs = d?.invoices || [];
  const ownerName = d?.owner?.name || "the team";

  const ev = useMemo(
    () => (l ? journeyOf(l, props, invs, ownerName) : []),
    [l, props, invs, ownerName]
  );

  // Ad tracking is only there when the lead came off a paid click, so the rows
  // are built from what the record actually carries.
  const adRows = useMemo(() => {
    const src = l?.source || {};
    return [
      ["Campaign", src.utmCampaign], ["Campaign ID", src.campaignId],
      ["Ad set", src.adset], ["Ad", src.adName], ["Content", src.utmContent],
      ["Medium", src.utmMedium], ["Landing page", src.landingPage], ["Referrer", src.referrer],
    ].filter(([, v]) => v);
  }, [l]);

  const touches = ev.filter((e) => /Reminder|Follow up|Reply|Connect|Material|sent to the client/i.test(e.t)).length;
  const billed = invs.filter((i) => i.status !== "Cancelled").reduce((a, i) => a + grand(i), 0);
  const received = invs.filter((i) => i.status === "Paid").reduce((a, i) => a + grand(i), 0);
  // Same rule the Invoices board uses: a sent invoice past its due date.
  const overdue = invs.filter((i) => i.status === "Sent" && i.due && i.due < todayStr())
                      .reduce((a, i) => a + grand(i), 0);

  const onPick = (id) => {
    setPick(id);
    router.replace(`/dashboard/website/lead-profile?lead=${id}`, undefined, { shallow: true });
  };

  return (
    <section className="main-dashboard-area">
      <Head><title>{l?.name ? `${l.name} — Lead profile` : "Lead profile"}</title></Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            {/* ── header: title + the lead picker ───────────────────────── */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" }}>Lead profile</h2>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#94A3B8" }}>
                  Everything that has happened to this lead, from capture to today, in order.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select value={pick} onChange={(e) => onPick(e.target.value)} className="lp-in"
                        style={{ ...s.input, width: 330, height: 34 }}>
                  {!list.length ? <option value="">Loading…</option> : null}
                  {list.map((x) => (
                    <option key={x._id} value={x._id}>
                      {leadCode(x)} · {x.name || "—"} · {x.businessName || "—"}
                    </option>
                  ))}
                </select>
                <Link href="/dashboard/website/leads" style={{ ...s.miniBtn, textDecoration: "none", height: 34 }}>Back to leads</Link>
              </div>
            </div>

            {loading && !l ? <div style={{ marginTop: 20, fontSize: 12.5, color: "#94A3B8" }}>Loading the profile…</div> : null}

            {l ? (
              <>
                {/* ── the strip of six ───────────────────────────────────── */}
                <div style={{ ...s.panel, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", margin: "16px 0 14px" }}>
                  <M k="Lead ID" v={<span style={{ fontSize: 17 }}>{leadCode(l)}</span>} d={l.businessName || "—"} />
                  <M k="Age" v={`${daysBetween(l.createdAt, Date.now())} days`} d={`captured ${fmtD(l.createdAt)}`} />
                  <M k="Stage" v={<span style={{ fontSize: 15 }}>{l.status}</span>} d={`owner ${ownerName}`} />
                  <M k="Score" v={l.score != null ? `${l.score} /10` : "—"} tone={l.score >= 8 ? "pos" : ""}
                     d={l.score >= 8 ? "priority" : `stated budget ${l.budget || "—"}`} />
                  <M k="Touches" v={touches} d="mails, calls and replies" />
                  <M k="Value" v={props.length ? inr(props[0].amount) : (budgetValue(l.budget) ? inr(budgetValue(l.budget)) : "—")}
                     d={props.length ? (props[0].term === "Retainer" ? "proposed, monthly" : "proposed, one time") : "stated budget"} />
                </div>

                {/* ── two columns: the journey, and the facts ────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }} className="lp-cols2">

                  <Panel title="The journey"
                         right={<span style={{ ...s.tag, background: "#F1F5F9", color: "#475569" }}>{ev.length} events</span>}>
                    {!ev.length ? (
                      <div style={{ fontSize: 12.5, color: "#94A3B8" }}>Nothing has happened on this lead yet.</div>
                    ) : (
                      <div style={{ position: "relative", paddingLeft: 26 }}>
                        <div style={{ position: "absolute", left: 8, top: 6, bottom: 6, width: 2,
                                      background: "linear-gradient(180deg,#C7D2FE,#F0F0F8)" }} />
                        {ev.map((e, ix) => (
                          <div key={ix} style={{ position: "relative", padding: "0 0 16px" }}>
                            <div style={{ position: "absolute", left: -22, top: 3, width: 12, height: 12, borderRadius: "50%",
                                          background: "#fff", border: `2.5px solid ${TONE[e.k] || TONE[""]}` }} />
                            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#94A3B8" }}>
                              {fmtDT(e.at)}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 1, color: "#0F172A" }}>{e.t}</div>
                            {e.d ? <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, lineHeight: 1.45 }}>{e.d}</div> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                    <Panel title="Contact"
                           right={<Link href={`/dashboard/website/leads?lead=${l._id}`} style={{ ...s.miniBtn, textDecoration: "none", height: 26 }}>Edit</Link>}>
                      <KV k="Name" v={l.name} />
                      <KV k="Company" v={l.businessName} />
                      <KV k="Phone" v={l.phone} />
                      <KV k="Email" v={l.email} />
                      <KV k="Meeting" v={l.meetingDate ? `${fmtD(l.meetingDate)}${l.meetingTime ? ` · ${prettyTime(l.meetingTime)}` : ""}` : ""} />
                      {/* Only what the team has actually filled in on the board —
                          the website form does not ask for any of these. */}
                      {l.city ? <KV k="City" v={l.city} /> : null}
                      {l.industry ? <KV k="Industry" v={l.industry} /> : null}
                      {l.website ? <KV k="Website" v={l.website} /> : null}
                      {l.instagram ? <KV k="Instagram" v={l.instagram} /> : null}
                    </Panel>

                    <Panel title="Attribution">
                      <KV k="Source" v={srcOf(l)} />
                      <KV k="Form" v={l.formType} />
                      <KV k="Stated budget" v={l.budget} />
                      {l.service ? <KV k="Service asked for" v={l.service} /> : null}
                      {/* Ad fields only exist on paid clicks — hidden until one lands. */}
                      {adRows.length ? adRows.map(([k, v]) => <KV key={k} k={k} v={v} />) : null}
                    </Panel>

                    <Panel title="Commercial"
                           right={
                             <div style={{ display: "flex", gap: 6 }}>
                               <Link href={`/dashboard/website/proposals?lead=${l._id}`} style={{ ...s.miniBtn, textDecoration: "none", height: 26 }}>Proposals</Link>
                               <Link href={`/dashboard/website/invoices?lead=${l._id}`} style={{ ...s.miniBtn, textDecoration: "none", height: 26 }}>Invoices</Link>
                             </div>
                           }>
                      {!props.length ? (
                        <div style={{ fontSize: 12.5, color: "#94A3B8" }}>No proposal raised yet.</div>
                      ) : props.map((p) => (
                        <KV key={p._id} k={propCode(p)}
                            v={`${inr(p.amount)} · ${p.term}${p.term === "Retainer" && p.months ? ` ${p.months}m` : ""} · ${p.status}`} />
                      ))}
                      {props.some((p) => p.status === "Accepted") ? (
                        <>
                          <KV k="Advance" v={inr(advAmt(props.find((p) => p.status === "Accepted")))} />
                          <KV k="Invoices raised" v={invs.length ? `${invs.length}` : "none yet"} />
                          <KV k="Invoiced" v={inr(billed)} />
                          <KV k="Received" v={inr(received)} />
                          <KV k="Outstanding" v={inr(billed - received)} />
                          {overdue ? <KV k="Overdue" v={<span style={{ color: "#C42525" }}>{inr(overdue)}</span>} /> : null}
                        </>
                      ) : null}
                    </Panel>

                    <Panel title="Notes">
                      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "#475569", whiteSpace: "pre-wrap" }}>
                        {l.notes || "Nothing noted."}
                        {l.prepNotes ? (
                          <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid #F0F0F8" }}>
                            <b style={{ fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase", color: "#94A3B8" }}>
                              Preparation findings
                            </b>
                            <div style={{ marginTop: 4 }}>{l.prepNotes}</div>
                          </div>
                        ) : null}
                        {l.lostReason ? (
                          <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid #F0F0F8", color: "#C42525" }}>
                            <b>Lost because.</b> {l.lostReason}
                          </div>
                        ) : null}
                      </div>
                    </Panel>

                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .lp-in:focus { outline: none; border-color: #818CF8; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
        @media (max-width: 1180px) { .lp-cols2 { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
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
  panel: { background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden" },
  panelHead: { padding: "11px 15px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" },
  tag: { display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" },
  input: { width: "100%", height: 38, borderRadius: 10, border: "1px solid #E7E7F2", padding: "0 10px", fontSize: 12.5, color: "#0F172A", background: "#fff", outline: "none" },
  miniBtn: { display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px", borderRadius: 9, border: "1px solid #E7E7F2", background: "#fff", color: "#475569", fontSize: 11.5, fontWeight: 800, cursor: "pointer" },
};
