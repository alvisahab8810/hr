// pages/dashboard/website/newsletter.js — Website → Newsletter.
// The subscriber list built by the footer form on viralon.in. Rows arrive in
// the shared Mongo "newsletters" collection; here the team searches them,
// adds an address by hand, marks someone unsubscribed, copies the addresses
// into whatever sends the mail, or exports the lot as CSV.
import { useEffect, useMemo, useState, useCallback } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { confirmDialog } from "../../../components/ConfirmDialog";
import NewsletterCompose from "@/components/NewsletterCompose";

/* The page they signed up from, and the campaign that sent them — minus the
   bare "/" of the home page, which is noise under the "Website footer" chip. */
const sourceLine = (r) => {
  const page = String(r.source?.page || "").trim();
  const parts = [page === "/" ? "" : page, String(r.source?.utmCampaign || "").trim()];
  return parts.filter(Boolean).join(" · ");
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ─── Top stat card (same design as the other website pages) ───────────── */
function KpiCard({ icon, label, value, accent }) {
  return (
    <div className="kpi-card" style={{
      background: `linear-gradient(160deg, #fff 55%, ${accent.bg} 165%)`,
      borderRadius: 16, padding: "17px 18px 16px",
      border: `1px solid ${accent.bg}`, boxShadow: "0 3px 12px rgba(15,23,42,.06)",
      display: "flex", alignItems: "center", gap: 14, height: "100%",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon }} />
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: accent.icon,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 6px 16px ${accent.shadow}`,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 19, color: "#fff" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1.05, letterSpacing: "-0.8px" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

const s = {
  iconBtn: {
    width: 32, height: 32, borderRadius: 9, border: "1px solid #E2E8F0",
    background: "#fff", color: "#475569", cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  },
  ghost: {
    height: 38, padding: "0 14px", borderRadius: 10, border: "1px solid #E2E8F0",
    background: "#fff", color: "#475569", fontSize: 13, fontWeight: 700,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
  },
  primary: {
    height: 38, padding: "0 18px", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg,#6366F1,#818CF8)", color: "#fff",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 7,
    boxShadow: "0 4px 12px rgba(99,102,241,.3)",
  },
  input: {
    height: 38, borderRadius: 10, border: "1px solid #E2E8F0", padding: "0 13px",
    fontSize: 13, color: "#1E293B", outline: "none", background: "#fff",
  },
  th: {
    textAlign: "left", fontSize: 11.5, fontWeight: 800, color: "#64748B",
    textTransform: "uppercase", letterSpacing: ".4px", padding: "11px 16px",
    borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 16px", fontSize: 13, color: "#1E293B",
    borderBottom: "1px solid #F6F7FB", verticalAlign: "middle",
  },
};

const chip = (on) => ({
  height: 32, padding: "0 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700,
  cursor: "pointer", border: `1px solid ${on ? "#6366F1" : "#E2E8F0"}`,
  background: on ? "#6366F118" : "#fff", color: on ? "#4F46E5" : "#64748B",
});

export default function NewsletterPage() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState("");
  const [status, setStatus]     = useState("all");   // all | subscribed | unsubscribed
  const [adding, setAdding]     = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving]     = useState(false);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/newsletter", { credentials: "include" });
      const data = await r.json();
      if (data.success) setRows(data.data || []);
      else toast.error(data.message || "Could not load the list");
    } catch { toast.error("Could not load the list"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const subscribed   = useMemo(() => rows.filter((r) => r.status === "subscribed").length, [rows]);
  const unsubscribed = rows.length - subscribed;
  const thisMonth = useMemo(() => {
    const now = new Date();
    return rows.filter((r) => {
      const d = r.subscribedAt || r.createdAt;
      if (!d) return false;
      const x = new Date(d);
      return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
    }).length;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!needle) return true;
      return [r.email, r.notes, r.source?.page, r.source?.utmCampaign, r.channel]
        .some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [rows, q, status]);

  // What the compose box offers as "only what's on screen" — a search or a
  // filter doubles as the picker, minus anyone who has unsubscribed.
  const shownSubscribed = useMemo(
    () => visible.filter((r) => r.status === "subscribed").map((r) => r.email),
    [visible]
  );

  const addOne = async (e) => {
    e?.preventDefault?.();
    const email = newEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Enter a valid email address"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/newsletter", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, notes: newNotes }),
      });
      const data = await r.json();
      if (data.success) {
        setRows((list) => [data.data, ...list]);
        setNewEmail(""); setNewNotes(""); setAdding(false);
        toast.success("Added to the list");
      } else toast.error(data.message || "Could not add that address");
    } catch { toast.error("Could not add that address"); }
    setSaving(false);
  };

  const toggleStatus = async (row) => {
    const next = row.status === "subscribed" ? "unsubscribed" : "subscribed";
    if (next === "unsubscribed" &&
        !(await confirmDialog(`Unsubscribe ${row.email}? They stop getting the newsletter but stay on the list.`))) return;
    try {
      const r = await fetch(`/api/admin/newsletter/${row._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await r.json();
      if (data.success) {
        setRows((list) => list.map((x) => (x._id === row._id ? data.data : x)));
        toast.success(next === "subscribed" ? "Resubscribed" : "Unsubscribed");
      } else toast.error(data.message || "Could not update");
    } catch { toast.error("Could not update"); }
  };

  const removeOne = async (row) => {
    if (!(await confirmDialog(`Delete ${row.email} from the list? This cannot be undone.`))) return;
    try {
      const r = await fetch(`/api/admin/newsletter/${row._id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json();
      if (data.success) {
        setRows((list) => list.filter((x) => x._id !== row._id));
        toast.success("Removed");
      } else toast.error(data.message || "Could not delete");
    } catch { toast.error("Could not delete"); }
  };

  // Copies whatever is on screen, so a filter or a search doubles as a picker.
  const copyVisible = async () => {
    const list = visible.map((r) => r.email).join(", ");
    if (!list) { toast.error("Nothing to copy"); return; }
    try {
      await navigator.clipboard.writeText(list);
      toast.success(`${visible.length} address${visible.length === 1 ? "" : "es"} copied`);
    } catch { toast.error("Could not copy — select the column by hand"); }
  };

  return (
    <section className="main-dashboard-area">
      <Head>
        <title>Newsletter — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .nl-table tbody tr:hover { background: #F8FAFF; }
          .nl-input:focus { border-color: #6366F1 !important; }
        `}</style>
      </Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg,#6366F1,#818CF8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 5px 14px rgba(99,102,241,.25)",
                }}>
                  <i className="bi bi-envelope-paper-fill" style={{ fontSize: 17, color: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>Newsletter</div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                    Everyone who signed up from the footer on viralon.in.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button onClick={load} disabled={loading} style={{ ...s.iconBtn, width: 38, height: 38, borderRadius: 10 }} title="Refresh">
                  <i className="bi bi-arrow-clockwise" style={{ fontSize: 15 }} />
                </button>
                <button onClick={copyVisible} style={s.ghost} title="Copy the addresses shown below">
                  <i className="bi bi-clipboard" /> Copy emails
                </button>
                <a href={`/api/admin/newsletter?format=csv&status=${status}`} style={{ ...s.ghost, textDecoration: "none" }}>
                  <i className="bi bi-download" /> Export CSV
                </a>
                <button onClick={() => setAdding((v) => !v)} style={s.ghost}>
                  <i className="bi bi-plus-lg" style={{ fontSize: 14 }} /> Add subscriber
                </button>
                <button onClick={() => setComposing(true)} style={s.primary} title="Write a mail and send it to the list">
                  <i className="bi bi-send-fill" style={{ fontSize: 13 }} /> Compose mail
                </button>
              </div>
            </div>

            {/* ── KPIs ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 22, marginBottom: 18 }}>
              <KpiCard icon="bi-people-fill"         label="Total on list" value={loading ? "—" : rows.length}  accent={{ bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" }} />
              <KpiCard icon="bi-check-circle-fill"   label="Subscribed"    value={loading ? "—" : subscribed}   accent={{ bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)" }} />
              <KpiCard icon="bi-slash-circle-fill"   label="Unsubscribed"  value={loading ? "—" : unsubscribed} accent={{ bg: "#FEE2E2", icon: "#DC2626", shadow: "rgba(220,38,38,.18)" }} />
              <KpiCard icon="bi-calendar-check-fill" label="This month"    value={loading ? "—" : thisMonth}    accent={{ bg: "#F3E8FF", icon: "#9333EA", shadow: "rgba(168,85,247,.18)" }} />
            </div>

            {/* ── Add by hand ── */}
            {adding && (
              <form onSubmit={addOne} style={{
                background: "#fff", border: "1px solid #F0F0F8", borderRadius: 14,
                padding: 14, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap",
                boxShadow: "0 2px 8px rgba(99,102,241,.06)",
              }}>
                <input
                  className="nl-input" type="email" placeholder="name@company.com"
                  value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  style={{ ...s.input, flex: "1 1 240px" }} autoFocus
                />
                <input
                  className="nl-input" type="text" placeholder="Note (optional) — where this address came from"
                  value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                  style={{ ...s.input, flex: "2 1 300px" }}
                />
                <button type="submit" disabled={saving} style={{ ...s.primary, opacity: saving ? 0.6 : 1 }}>
                  <i className="bi bi-check-lg" /> {saving ? "Saving…" : "Add"}
                </button>
                <button type="button" onClick={() => setAdding(false)} style={s.ghost}>Cancel</button>
              </form>
            )}

            {/* ── Search + filter ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
              <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
                <i className="bi bi-search" style={{ position: "absolute", left: 13, top: 11, fontSize: 13, color: "#94A3B8" }} />
                <input
                  className="nl-input" value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search an address, page or campaign"
                  style={{ ...s.input, width: "100%", paddingLeft: 34 }}
                />
              </div>
              <button onClick={() => setStatus("all")}          style={chip(status === "all")}>All</button>
              <button onClick={() => setStatus("subscribed")}   style={chip(status === "subscribed")}>Subscribed</button>
              <button onClick={() => setStatus("unsubscribed")} style={chip(status === "unsubscribed")}>Unsubscribed</button>
              <span style={{ fontSize: 12.5, color: "#64748B", fontWeight: 600, marginLeft: "auto" }}>
                {loading ? "Loading…" : `${visible.length} shown`}
              </span>
            </div>

            {/* ── The list ── */}
            <div style={{
              background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
              boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden", marginBottom: 20,
            }}>
              <div style={{ overflowX: "auto" }}>
                <table className="nl-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th style={s.th}>Email</th>
                      <th style={s.th}>Came from</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Added</th>
                      <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td style={{ ...s.td, textAlign: "center", color: "#94A3B8", padding: "34px 16px" }} colSpan={5}>Loading…</td></tr>
                    ) : !visible.length ? (
                      <tr><td style={{ ...s.td, textAlign: "center", color: "#94A3B8", padding: "34px 16px" }} colSpan={5}>
                        {rows.length ? "Nothing matches that search." : "No signups yet. The footer form on viralon.in fills this in."}
                      </td></tr>
                    ) : visible.map((r) => (
                      <tr key={r._id}>
                        <td style={s.td}>
                          <div style={{ fontWeight: 700, color: "#0F172A" }}>{r.email}</div>
                          {r.notes ? <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{r.notes}</div> : null}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 7,
                            background: r.channel === "manual" ? "#F1F5F9" : "#6366F118",
                            color: r.channel === "manual" ? "#475569" : "#4F46E5",
                          }}>
                            {r.channel === "manual" ? "Added by team" : "Website footer"}
                          </span>
                          {/* The home page is "/", which says nothing on its own —
                              only show a second line when there is something to read. */}
                          {sourceLine(r) && (
                            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{sourceLine(r)}</div>
                          )}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            fontSize: 11.5, fontWeight: 800, padding: "4px 10px", borderRadius: 999,
                            background: r.status === "subscribed" ? "#DCFCE7" : "#FEE2E2",
                            color: r.status === "subscribed" ? "#15803D" : "#B91C1C",
                          }}>
                            {r.status === "subscribed" ? "Subscribed" : "Unsubscribed"}
                          </span>
                        </td>
                        <td style={{ ...s.td, color: "#475569", whiteSpace: "nowrap" }}>{fmtDate(r.subscribedAt || r.createdAt)}</td>
                        <td style={{ ...s.td, textAlign: "right", whiteSpace: "nowrap" }}>
                          <button onClick={() => toggleStatus(r)} style={{ ...s.iconBtn, marginRight: 6 }}
                                  title={r.status === "subscribed" ? "Mark unsubscribed" : "Resubscribe"}>
                            <i className={`bi ${r.status === "subscribed" ? "bi-slash-circle" : "bi-arrow-counterclockwise"}`} style={{ fontSize: 14 }} />
                          </button>
                          {/* Opens the same compose box, addressed to this one
                              person — no mail app on the machine involved. */}
                          <button onClick={() => setComposing(r.email)} style={{ ...s.iconBtn, marginRight: 6 }}
                                  title="Write to them">
                            <i className="bi bi-envelope" style={{ fontSize: 14 }} />
                          </button>
                          <button onClick={() => removeOne(r)} style={{ ...s.iconBtn, color: "#DC2626", borderColor: "#FEE2E2" }} title="Delete">
                            <i className="bi bi-trash3" style={{ fontSize: 14 }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>
      </div>

      {/* true = the whole list, an address = that one subscriber */}
      {composing && (
        <NewsletterCompose
          shown={shownSubscribed}
          only={typeof composing === "string" ? composing : ""}
          onClose={() => setComposing(false)}
        />
      )}
    </section>
  );
}
