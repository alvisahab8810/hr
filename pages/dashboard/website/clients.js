// pages/dashboard/website/clients.js — Website → Clients.
//
// The end of the CRM road: a lead is won, converted to a client, and from then
// on it is the money that matters. This board is the only place that shows what
// each running client has been billed, what has actually landed, what is still
// owed and what repeats every month. Same manners as Leads, Proposals and
// Invoices — every row opens a panel, nothing is edited in the table.
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { inr, initials, fmtD, todayStr } from "@/utils/leadsMeta";

const BRANDS_URL = "/dashboard/admin/tasks/brands";

const SVC_NAME = {
  socialMedia: "Social media", website: "Website", seo: "SEO", ads: "Ads", branding: "Branding",
};

/* A client is only "at risk" because of money, never because of a label. */
const health = (c) =>
  c.overdue > 0 ? { t: "Overdue", bg: "#FDEDED", fg: "#C42525" } :
  c.status === "Inactive" ? { t: "Inactive", bg: "#F1F5F9", fg: "#94A3B8" } :
  c.outstanding > 0 ? { t: "Awaiting payment", bg: "#FEF3C7", fg: "#B4690E" } :
  c.billed > 0 ? { t: "All settled", bg: "#DCFCE7", fg: "#0F8A54" } :
  { t: "Nothing billed", bg: "#EEF2FF", fg: "#4338CA" };

export default function Clients() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/clients/crm", { credentials: "include" });
        const j = await r.json();
        if (!j.success) throw new Error(j.message || "Could not load the clients");
        setRows(j.data || []);
      } catch (e) { toast.error(e.message); }
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => rows.reduce((a, c) => ({
    clients: a.clients + (c.status === "Active" ? 1 : 0),
    billed: a.billed + c.billed,
    received: a.received + c.received,
    outstanding: a.outstanding + c.outstanding,
    overdue: a.overdue + c.overdue,
    monthly: a.monthly + c.monthly,
  }), { clients: 0, billed: 0, received: 0, outstanding: 0, overdue: 0, monthly: 0 }), [rows]);

  const view = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((c) => {
      if (filter === "overdue" && !c.overdue) return false;
      if (filter === "owing" && !c.outstanding) return false;
      if (filter === "retainer" && !c.monthly) return false;
      if (filter === "settled" && (c.outstanding || !c.billed)) return false;
      if (!t) return true;
      return [c.name, c.company, c.email, c.clientId, ...(c.brands || []).map((b) => b.name)]
        .some((x) => String(x || "").toLowerCase().includes(t));
    });
  }, [rows, q, filter]);

  return (
    <section className="main-dashboard-area">
      <Head><title>Clients — Website</title></Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" }}>Clients</h2>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#94A3B8" }}>
                  Every won lead that was converted, and what the books say about them.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/dashboard/website/leads" style={{ ...s.miniBtn, textDecoration: "none" }}>
                  <i className="bi bi-person-lines-fill" style={{ fontSize: 11 }} /> Leads
                </Link>
                <Link href="/dashboard/website/invoices" style={{ ...s.miniBtn, textDecoration: "none" }}>
                  <i className="bi bi-receipt" style={{ fontSize: 11 }} /> Invoices
                </Link>
                <Link href={BRANDS_URL} style={{ ...s.primaryBtn, textDecoration: "none" }}>
                  <i className="bi bi-bookmark-star-fill" style={{ fontSize: 12 }} /> Brands
                </Link>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 11, margin: "16px 0" }}>
              <Metric icon="bi-people-fill" label="Active clients" value={stats.clients} sub={`${rows.length} in all`} accent={{ bg: "#EEF2FF", icon: "#6366F1" }} />
              <Metric icon="bi-cash-stack" label="Billed" value={inr(stats.billed)} sub="including GST" accent={{ bg: "#E0F2FE", icon: "#0EA5E9" }} />
              <Metric icon="bi-check2-circle" label="Received" value={inr(stats.received)} accent={{ bg: "#DCFCE7", icon: "#16A34A" }} />
              <Metric icon="bi-hourglass-split" label="Outstanding" value={inr(stats.outstanding)} sub="still owed" accent={{ bg: "#FEF3C7", icon: "#F59E0B" }} />
              <Metric icon="bi-exclamation-octagon-fill" label="Overdue" value={inr(stats.overdue)} sub="past the due date" accent={{ bg: "#FFE4E6", icon: "#F43F5E" }} />
              <Metric icon="bi-arrow-repeat" label="Monthly recurring" value={inr(stats.monthly)} sub="from retainers" accent={{ bg: "#F3E8FF", icon: "#9333EA" }} />
            </div>

            <div style={s.panel}>
              <div style={s.panelHead}>
                <div style={s.panelIcon}><i className="bi bi-people-fill" /></div>
                <div style={{ fontSize: 13.5, fontWeight: 900, color: "#0F172A" }}>Ongoing clients</div>
                <span style={{ ...s.tag, background: "#EEF2FF", color: "#4338CA" }}>{view.length}</span>
                <div style={{ flex: 1 }} />
                <input className="lp-in" placeholder="Search client, company, brand…" value={q}
                       onChange={(e) => setQ(e.target.value)} style={{ ...s.input, width: 235, height: 32 }} />
                <select className="lp-in" value={filter} onChange={(e) => setFilter(e.target.value)}
                        style={{ ...s.input, width: 165, height: 32 }}>
                  <option value="">Everyone</option>
                  <option value="overdue">Overdue only</option>
                  <option value="owing">Still owing</option>
                  <option value="retainer">On a retainer</option>
                  <option value="settled">Fully settled</option>
                </select>
              </div>

              <div className="lp-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
                  <thead>
                    <tr>
                      {["Client", "Brands", "Services", "Billed", "Received", "Outstanding", "Monthly", "Last invoice", "Standing"]
                        .map((h) => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={9} style={{ padding: 30, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading…</td></tr>
                    ) : !view.length ? (
                      <tr><td colSpan={9} style={{ padding: 30, textAlign: "center", color: "#94A3B8", fontSize: 13, lineHeight: 1.6 }}>
                        {rows.length
                          ? "No client matches that."
                          : "No clients yet. Win a lead, then use “Convert to client” on the Leads board."}
                      </td></tr>
                    ) : view.map((c) => {
                      const h = health(c);
                      return (
                        <tr key={c._id} className="lp-row" onClick={() => setOpen(c)} style={{ cursor: "pointer" }}>
                          <td style={{ ...s.td, padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <div style={s.avatar}>{initials(c.name || c.company || "?")}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, color: "#0F172A" }}>{c.company || c.name}</div>
                                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{c.clientId} · {c.email || "no email"}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...s.td, padding: "10px 12px" }}>
                            {c.brands.length ? (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {c.brands.map((b) => (
                                  <span key={b._id} style={{ ...s.tag, background: "#EEF2FF", color: "#4338CA" }}>{b.name}</span>
                                ))}
                              </div>
                            ) : <span style={{ color: "#CBD5E1" }}>none yet</span>}
                          </td>
                          <td style={{ ...s.td, padding: "10px 12px", fontSize: 11.5 }}>
                            {c.services.length ? c.services.map((x) => SVC_NAME[x] || x).join(", ") : "—"}
                          </td>
                          <td style={{ ...s.td, padding: "10px 12px", fontWeight: 800 }}>{inr(c.billed)}</td>
                          <td style={{ ...s.td, padding: "10px 12px", color: "#0F8A54", fontWeight: 800 }}>{inr(c.received)}</td>
                          <td style={{ ...s.td, padding: "10px 12px", fontWeight: 800, color: c.overdue ? "#C42525" : c.outstanding ? "#B4690E" : "#94A3B8" }}>
                            {inr(c.outstanding)}
                            {c.overdue ? <div style={{ fontSize: 10.5, fontWeight: 700 }}>{inr(c.overdue)} overdue</div> : null}
                          </td>
                          <td style={{ ...s.td, padding: "10px 12px" }}>{c.monthly ? inr(c.monthly) : "—"}</td>
                          <td style={{ ...s.td, padding: "10px 12px" }}>{c.lastInvoice ? fmtD(c.lastInvoice) : "—"}</td>
                          <td style={{ ...s.td, padding: "10px 12px" }}>
                            <span style={{ ...s.tag, background: h.bg, color: h.fg }}>{h.t}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: "10px 16px", borderTop: "1px solid #F4F4FD", fontSize: 11.5, color: "#94A3B8", fontWeight: 600,
                            display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span>{view.length} of {rows.length} clients</span>
                <span>Billed {inr(view.reduce((n, c) => n + c.billed, 0))}</span>
                <span>Outstanding {inr(view.reduce((n, c) => n + c.outstanding, 0))}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {open ? <ClientPanel c={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

/* ── one client, in full ────────────────────────────────────────────────── */

function ClientPanel({ c, onClose }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const h = health(c);
  const rate = c.billed ? Math.round((c.received / c.billed) * 100) : 0;

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
         style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 2000,
                  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720,
                    boxShadow: "0 24px 60px rgba(15,23,42,.28)", overflow: "hidden" }}>
        <div style={{ padding: "15px 20px", borderBottom: "1px solid #F1F1FA", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={s.panelIcon}><i className="bi bi-person-badge-fill" style={{ fontSize: 14 }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>{c.company || c.name}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{c.clientId}</div>
          </div>
          <span style={{ ...s.tag, background: h.bg, color: h.fg }}>{h.t}</span>
          <button onClick={onClose} style={s.iconBtn}><i className="bi bi-x-lg" style={{ fontSize: 12 }} /></button>
        </div>

        <div className="lp-scroll" style={{ padding: 20, maxHeight: "calc(100vh - 150px)", overflowY: "auto" }}>
          <Head2>The money</Head2>
          <div style={{ ...s.softBox, marginBottom: 14 }}>
            <KV k="Billed so far" v={inr(c.billed)} />
            <KV k="Received" v={inr(c.received)} />
            <KV k="Still outstanding" v={inr(c.outstanding)} />
            {c.overdue ? <KV k="Of that, overdue" v={`${inr(c.overdue)} · ${c.overdueCount} invoice${c.overdueCount === 1 ? "" : "s"}`} /> : null}
            {c.draftCount ? <KV k="Still in draft" v={`${inr(c.draftValue)} · ${c.draftCount} invoice${c.draftCount === 1 ? "" : "s"}`} /> : null}
            <KV k="Collection rate" v={`${rate}%`} />
          </div>

          <Head2>What they are on</Head2>
          <div style={{ ...s.softBox, marginBottom: 14 }}>
            <KV k="Deal value won" v={inr(c.dealValue)} />
            <KV k="Monthly recurring" v={c.monthly ? `${inr(c.monthly)} for ${c.retainerMonths} month${c.retainerMonths === 1 ? "" : "s"}` : "not on a retainer"} />
            <KV k="Services" v={c.services.length ? c.services.map((x) => SVC_NAME[x] || x).join(", ") : "—"} />
            <KV k="Invoices raised" v={c.invoiceCount} />
            <KV k="Client since" v={c.since ? fmtD(c.since) : "—"} />
            <KV k="Last invoice" v={c.lastInvoice ? fmtD(c.lastInvoice) : "—"} />
            <KV k="Next due" v={c.nextDue ? `${fmtD(c.nextDue)}${c.nextDue < todayStr() ? " — past due" : ""}` : "nothing pending"} />
          </div>

          <Head2>Who they are</Head2>
          <div style={{ ...s.softBox, marginBottom: 14 }}>
            <KV k="Contact" v={c.name || "—"} />
            <KV k="Email" v={c.email || "—"} />
            <KV k="Phone" v={c.phone || "—"} />
            <KV k="Address" v={c.city || "—"} />
          </div>

          <Head2>Brands</Head2>
          <div style={{ ...s.softBox, marginBottom: 14 }}>
            {c.brands.length ? c.brands.map((b) => (
              <div key={b._id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: "1px dashed #E8E8F2" }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: b.color }} />
                <b style={{ fontSize: 12, color: "#0F172A", fontWeight: 800 }}>{b.name}</b>
                <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>
                  {(b.services || []).map((x) => SVC_NAME[x] || x).join(", ") || "no services set"}
                </span>
                <div style={{ flex: 1 }} />
                {b.isActive ? null : <span style={{ ...s.tag, background: "#F1F5F9", color: "#94A3B8" }}>Paused</span>}
              </div>
            )) : (
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.55 }}>
                No brand set up yet. Operations works off a brand, so add one before any delivery starts.
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link href={`/dashboard/website/invoices?lead=${c.leadId}`} style={{ ...s.miniBtn, textDecoration: "none" }}>
              <i className="bi bi-receipt" style={{ fontSize: 11 }} /> Their invoices
            </Link>
            <Link href={`/dashboard/website/lead-profile?lead=${c.leadId}`} style={{ ...s.miniBtn, textDecoration: "none" }}>
              <i className="bi bi-person-vcard-fill" style={{ fontSize: 11 }} /> Lead profile
            </Link>
            <Link href={`${BRANDS_URL}?client=${c._id}`} style={{ ...s.miniBtn, textDecoration: "none" }}>
              <i className="bi bi-bookmark-star-fill" style={{ fontSize: 11 }} /> Brands
            </Link>
            {c.email ? <a href={`mailto:${c.email}`} style={{ ...s.miniBtn, textDecoration: "none" }}>Mail them</a> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── little pieces, same as the other boards ────────────────────────────── */

function Head2({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: .4, textTransform: "uppercase",
                  color: "#818CF8", marginBottom: 8 }}>{children}</div>
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

function Metric({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: `linear-gradient(160deg,#fff 55%, ${accent.bg} 175%)`,
      border: `1px solid ${accent.bg}`, borderRadius: 14, padding: "13px 14px",
      boxShadow: "0 2px 8px rgba(15,23,42,.05)", position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", gap: 11, minWidth: 0,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon }} />
      <div style={{ width: 36, height: 36, borderRadius: 11, background: accent.icon, flexShrink: 0,
                    display: "grid", placeItems: "center", color: "#fff", fontSize: 15 }}>
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

const s = {
  panel: { background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden" },
  panelHead: { padding: "12px 16px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" },
  panelIcon: { width: 30, height: 30, borderRadius: 9, background: "#6366F118", color: "#4338CA", display: "grid", placeItems: "center", fontSize: 13, flexShrink: 0 },
  softBox: { background: "#FBFBFE", border: "1px solid #F0F0F8", borderRadius: 12, padding: "11px 13px" },
  avatar: { width: 30, height: 30, borderRadius: 9, background: "#EEF2FF", color: "#4338CA", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 },
  th: { textAlign: "left", padding: "9px 12px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8", background: "#FAFAFE", borderBottom: "1px solid #F0F0F8", whiteSpace: "nowrap" },
  td: { fontSize: 12, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
  tag: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" },
  input: { width: "100%", height: 38, borderRadius: 10, border: "1px solid #E7E7F2", padding: "0 10px", fontSize: 12.5, color: "#0F172A", background: "#fff", outline: "none" },
  iconBtn: { width: 28, height: 28, borderRadius: 8, border: "1px solid #E7E7F2", background: "#fff", color: "#64748B", cursor: "pointer", display: "inline-grid", placeItems: "center" },
  miniBtn: { display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px", borderRadius: 9, border: "1px solid #E7E7F2", background: "#fff", color: "#475569", fontSize: 11.5, fontWeight: 800, cursor: "pointer" },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 15px", borderRadius: 10, border: "1px solid #6366F1", background: "#6366F1", color: "#fff", fontSize: 12.5, fontWeight: 800, cursor: "pointer" },
};
