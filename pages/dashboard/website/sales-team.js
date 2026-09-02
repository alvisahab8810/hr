// pages/dashboard/website/sales-team.js — Website → Sales team.
// The board mirrors the CRM prototype: a strip of team numbers, then one card
// per salesperson with their load, quality and revenue against target.
// "Manage the team" is where the admin onboards someone: username, password,
// and a tick against every menu that person may open. The mail goes out with
// the login and the link.
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import { inr, initials, budgetValue, statusMeta, prepPct, fmtDT } from "@/utils/leadsMeta";

const OPEN_OUT = ["Won", "Lost", "Not qualified", "NPC"];

const MENU_ORDER = ["home", "blogs", "careers", "positions", "pages", "faqs",
  "leads", "proposals", "invoices", "leadProfile", "salesTeam", "reports", "slots", "settings"];

const blankForm = () => ({
  name: "", role: "Sales Executive", email: "", username: "", password: "",
  permissions: { leads: true, proposals: true, invoices: true, leadProfile: true },
});

export default function SalesTeamPage() {
  const [data, setData] = useState({ team: [], leads: [], proposals: [], invoices: [], menus: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);   // {type:'manage'} | {type:'form', sp}

  const load = async () => {
    try {
      const r = await fetch("/api/admin/sales-team", { credentials: "include" });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Could not load the team");
      setData(j);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* Every number on this page is derived from the leads, proposals and
     invoices that already exist — nothing extra is stored per person. */
  const stats = useMemo(() => {
    const { team, leads, proposals, invoices } = data;
    return (team || []).map((t) => {
      const id = String(t._id);
      const mine = (leads || []).filter((l) => String(l.salespersonId || "") === id);
      const ids = new Set(mine.map((l) => l._id));
      const props = (proposals || []).filter((p) => ids.has(p.leadId));
      const won = props.filter((p) => p.status === "Accepted");
      const rev = (invoices || []).filter((i) => ids.has(i.leadId) && i.status === "Paid")
        .reduce((a, i) => a + (i.amount || 0), 0);
      const booked = mine.filter((l) => l.meetingDate).length;
      const held = mine.filter((l) => l.held === "held").length;
      const prepAvg = Math.round(mine.filter((l) => l.meetingDate).reduce((a, l) => a + prepPct(l), 0) / Math.max(1, booked));
      return {
        t, leads: mine.length, booked, held, props: props.length, won: won.length, rev,
        pct: t.target ? Math.round((rev / t.target) * 100) : 0,
        conv: Math.round((won.length / Math.max(1, props.length)) * 100),
        showRate: Math.round((held / Math.max(1, booked)) * 100),
        prepAvg: booked ? prepAvg : 0,
        pipeline: mine.filter((l) => !OPEN_OUT.includes(l.status)).reduce((a, l) => a + budgetValue(l.budget), 0),
        open: mine.filter((l) => !OPEN_OUT.includes(l.status)).slice(0, 4),
      };
    });
  }, [data]);

  const totals = useMemo(() => {
    const target = stats.reduce((a, x) => a + (x.t.target || 0), 0);
    const rev = stats.reduce((a, x) => a + x.rev, 0);
    const props = stats.reduce((a, x) => a + x.props, 0);
    const won = stats.reduce((a, x) => a + x.won, 0);
    const best = stats.slice().sort((a, b) => b.pct - a.pct)[0];
    return {
      target, rev,
      pctOfTarget: target ? Math.round((rev / target) * 100) : 0,
      inPlay: (data.leads || []).filter((l) => !OPEN_OUT.includes(l.status)).length,
      held: stats.reduce((a, x) => a + x.held, 0),
      winRate: Math.round((won / Math.max(1, props)) * 100),
      best,
    };
  }, [stats, data]);

  const save = async (form, sp) => {
    setBusy(true);
    try {
      const url = sp ? `/api/admin/sales-team/${sp._id}` : "/api/admin/sales-team";
      const r = await fetch(url, {
        method: sp ? "PATCH" : "POST",
        credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Could not save");
      if (!sp) {
        toast.success(j.mailed
          ? `${form.name} onboarded — login mailed to ${form.email}`
          : `Saved, but the mail failed: ${j.mailError}`);
      } else {
        toast.success(j.mailed ? "Saved and the login was mailed again" : "Saved");
      }
      setModal({ type: "manage" });
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const patch = async (sp, body) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/sales-team/${sp._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Could not save");
      toast.success(body.resend ? "Login mailed again" : "Saved");
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const remove = async (sp) => {
    if (!confirm(`Remove ${sp.name} from the sales team? Their leads stay where they are.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/sales-team/${sp._id}`, { method: "DELETE", credentials: "include" });
      toast.success("Removed");
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <section className="main-dashboard-area">
      <Head><title>Sales team — Viralon</title></Head>

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">
        <div style={s.head}>
          <div>
            <h1 style={s.h1}>Sales team</h1>
            <div style={s.sub}>Assigned load, activity quality and revenue against target, per person.</div>
          </div>
          <button style={s.primary} onClick={() => setModal({ type: "manage" })}>
            <i className="bi bi-people-fill" style={{ marginRight: 6 }} />Manage the team
          </button>
        </div>

        <div style={s.strip}>
          <M k="Team target" v={inr(totals.target)} n="monthly, combined" />
          <M k="Booked" v={inr(totals.rev)} n={`${totals.pctOfTarget}% of target`} tone="#0F8A54" />
          <M k="Leads in play" v={totals.inPlay} n="across the team" />
          <M k="Meetings held" v={totals.held} n="consultations this cycle" />
          <M k="Team win rate" v={`${totals.winRate}%`} n="proposals to accepted" />
          <M k="Best performer" v={totals.best ? totals.best.t.name.split(" ")[0] : "—"}
             n={totals.best ? `${totals.best.pct}% of target` : "nobody onboarded yet"} tone="#F59E0B" />
        </div>

        {loading ? (
          <div style={s.empty}>Loading…</div>
        ) : !stats.length ? (
          <div style={s.empty}>
            No one on the sales team yet.{" "}
            <button style={s.linkBtn} onClick={() => setModal({ type: "form", sp: null })}>
              Onboard the first salesperson
            </button>
          </div>
        ) : (
          <div className="st-cols3" style={s.cols3}>
            {stats.map((x) => <Card key={x.t._id} x={x} onEdit={() => setModal({ type: "form", sp: x.t })} />)}
          </div>
        )}
          </div>
        </section>
      </div>

      {modal?.type === "manage" ? (
        <Modal title="Manage the team" onClose={() => setModal(null)}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button style={s.primary} onClick={() => setModal({ type: "form", sp: null })}>
              <i className="bi bi-person-plus-fill" style={{ marginRight: 6 }} />Onboard a salesperson
            </button>
          </div>
          {!data.team.length ? <div style={s.empty}>Nobody yet.</div> : (
            <div style={{ display: "grid", gap: 8 }}>
              {data.team.map((sp) => (
                <div key={sp._id} style={s.row}>
                  <span style={{ ...s.ava, background: sp.color }}>{initials(sp.name)}</span>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{sp.name}</div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8" }}>
                      {sp.role} · {sp.username} · {sp.email}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                      {sp.lastLogin ? `Last signed in ${fmtDT(sp.lastLogin)}` : "Has not signed in yet"}
                    </div>
                  </div>
                  <span style={{ ...s.tag, ...(sp.active ? s.tagGreen : s.tagRed) }}>{sp.active ? "Active" : "Off"}</span>
                  <button style={s.iconBtn} title="Edit / permissions" onClick={() => setModal({ type: "form", sp })}>
                    <i className="bi bi-pencil-fill" />
                  </button>
                  <button style={s.iconBtn} title="Mail the login again" disabled={busy}
                          onClick={() => patch(sp, { resend: true })}>
                    <i className="bi bi-envelope-fill" />
                  </button>
                  <button style={s.iconBtn} title={sp.active ? "Switch off" : "Switch on"} disabled={busy}
                          onClick={() => patch(sp, { active: !sp.active })}>
                    <i className={`bi ${sp.active ? "bi-toggle-on" : "bi-toggle-off"}`} />
                  </button>
                  <button style={{ ...s.iconBtn, borderColor: "#FECACA", color: "#DC2626" }} title="Remove"
                          disabled={busy} onClick={() => remove(sp)}>
                    <i className="bi bi-trash3-fill" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      ) : null}

      {modal?.type === "form" ? (
        <Modal title={modal.sp ? `Edit ${modal.sp.name}` : "Onboard a salesperson"}
               onClose={() => setModal({ type: "manage" })}>
          <PersonForm sp={modal.sp} menus={data.menus || {}} busy={busy}
                      onCancel={() => setModal({ type: "manage" })}
                      onSave={(f) => save(f, modal.sp)} />
        </Modal>
      ) : null}

      <ToastContainer position="bottom-right" autoClose={2600} hideProgressBar />
      <style jsx global>{`
        @media (max-width: 1180px) { .st-cols3 { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ── the onboarding form: identity, the login, and the menu ticks ────────── */
function PersonForm({ sp, menus, busy, onSave, onCancel }) {
  const [f, setF] = useState(() => (sp
    ? {
        name: sp.name || "", role: sp.role || "", email: sp.email || "",
        username: sp.username || "", password: sp.password || "",
        permissions: { ...(sp.permissions || {}) },
      }
    : blankForm()));
  const [resend, setResend] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const tick = (k) => setF((p) => ({ ...p, permissions: { ...p.permissions, [k]: !p.permissions[k] } }));

  const submit = () => {
    if (!f.name.trim() || !f.email.trim() || !f.username.trim() || !f.password) {
      return toast.error("Name, email, username and password are all needed");
    }
    onSave(sp ? { ...f, resend } : f);
  };

  return (
    <div>
      <div style={s.grid2}>
        <Field label="Full name"><input style={s.input} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Designation"><input style={s.input} value={f.role} onChange={(e) => set("role", e.target.value)} /></Field>
        <Field label="Email"><input style={s.input} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Username"><input style={s.input} value={f.username} onChange={(e) => set("username", e.target.value)} /></Field>
        <Field label="Password">
          {/* Plain on purpose: the admin issues it and can change it later. */}
          <input style={s.input} value={f.password} onChange={(e) => set("password", e.target.value)} />
        </Field>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={s.flabel}>What this person can open</div>
        <div style={s.permGrid}>
          {MENU_ORDER.filter((k) => menus[k]).map((k) => (
            <label key={k} style={{ ...s.perm, ...(f.permissions[k] ? s.permOn : {}) }}>
              <input type="checkbox" checked={!!f.permissions[k]} onChange={() => tick(k)} />
              <span>{menus[k]}</span>
            </label>
          ))}
        </div>
      </div>

      {sp ? (
        <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12.5, color: "#475569" }}>
          <input type="checkbox" checked={resend} onChange={() => setResend((v) => !v)} />
          Mail the login again after saving
        </label>
      ) : (
        <div style={s.note}>
          <i className="bi bi-envelope-fill" style={{ marginRight: 6 }} />
          The username, password and the link to <b>/sales/login</b> go out by email as soon as you save.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button style={s.ghost} onClick={onCancel} disabled={busy}>Cancel</button>
        <button style={s.primary} onClick={submit} disabled={busy}>
          {busy ? "Saving…" : sp ? "Save changes" : "Onboard and send the login"}
        </button>
      </div>
    </div>
  );
}

/* ── the per-person card, straight off the prototype ─────────────────────── */
function Card({ x, onEdit }) {
  const tone = x.pct >= 100 ? "#0F8A54" : x.pct >= 60 ? "#F59E0B" : "#DC2626";
  return (
    <div style={s.panel}>
      <div style={s.panelHead}>
        <span style={{ ...s.ava, background: x.t.color }}>{initials(x.t.name)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A" }}>{x.t.name}</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>{x.t.role}</div>
        </div>
        <span style={{ ...s.tag, background: `${tone}14`, color: tone }}>{x.pct}% of target</span>
        <button style={s.iconBtn} title="Edit" onClick={onEdit}><i className="bi bi-pencil-fill" /></button>
      </div>

      <div style={{ padding: "12px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 5 }}>
          <span style={{ color: "#94A3B8" }}>Revenue booked</span>
          <b style={{ color: "#0F172A" }}>{inr(x.rev)} of {inr(x.t.target)}</b>
        </div>
        <div style={s.bar}>
          <i style={{ display: "block", height: "100%", borderRadius: 7, width: `${Math.min(100, x.pct)}%`, background: tone }} />
        </div>

        <div style={s.stat6}>
          <T v={x.leads} l="Leads" /><T v={x.booked} l="Booked" /><T v={x.held} l="Held" />
          <T v={x.props} l="Proposals" /><T v={x.won} l="Won" /><T v={`${x.conv}%`} l="Win rate" />
        </div>

        <div style={{ marginTop: 10 }}>
          <KV k="Open pipeline" v={inr(x.pipeline)} />
          <KV k="Meeting show rate" v={`${x.showRate}%`} />
          <KV k="Avg preparation before a call" v={`${x.prepAvg}%`} />
          <KV k="Contact" v={`${x.t.email}${x.t.phone ? ` · ${x.t.phone}` : ""}`} />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={s.flabel}>Working on right now</div>
          {x.open.length ? x.open.map((l) => {
            const m = statusMeta(l.status) || {};
            return (
              <div key={l._id} style={s.listRow}>
                <span style={{ flex: 1, fontSize: 12, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.businessName || l.name}
                </span>
                <span style={{ ...s.tag, background: m.bg, color: m.fg, border: `1px solid ${m.bd}` }}>{l.status}</span>
                <span style={{ fontSize: 11.5, color: "#94A3B8" }}>{l.budget || ""}</span>
              </div>
            );
          }) : <div style={{ fontSize: 12, color: "#94A3B8" }}>Nothing open.</div>}
        </div>
      </div>
    </div>
  );
}

const M = ({ k, v, n, tone }) => (
  <div style={s.mcell}>
    <div style={s.mk}>{k}</div>
    <div style={{ ...s.mv, color: tone || "#0F172A" }}>{v}</div>
    <div style={s.mn}>{n}</div>
  </div>
);
const T = ({ v, l }) => (
  <div>
    <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>{v}</div>
    <div style={{ fontSize: 9.5, color: "#94A3B8", fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase" }}>{l}</div>
  </div>
);
const KV = ({ k, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", fontSize: 12, borderBottom: "1px solid #F4F4FD" }}>
    <span style={{ color: "#94A3B8" }}>{k}</span>
    <b style={{ color: "#334155", textAlign: "right" }}>{v}</b>
  </div>
);
const Field = ({ label, children }) => (
  <div><div style={s.flabel}>{label}</div>{children}</div>
);

function Modal({ title, children, onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHead}>
          <b style={{ fontSize: 14 }}>{title}</b>
          <button style={s.close} onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div style={{ padding: 16, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
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
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  h1: { fontSize: 21, fontWeight: 800, color: "#0F172A", margin: 0 },
  sub: { fontSize: 12.5, color: "#94A3B8", marginTop: 3 },
  strip: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
           background: "#fff", border: "1px solid #F0F0F8", borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  mcell: { padding: "14px 16px", borderRight: "1px solid #F4F4FD" },
  mk: { fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#94A3B8" },
  mv: { fontSize: 21, fontWeight: 800, marginTop: 4 },
  mn: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  cols3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 14 },
  panel: { background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden" },
  panelHead: { padding: "12px 16px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center", gap: 9 },
  ava: { width: 30, height: 30, borderRadius: 9, color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 },
  tag: { fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#6366F114", color: "#4338CA", whiteSpace: "nowrap" },
  tagGreen: { background: "#0F8A5414", color: "#0F8A54" },
  tagRed: { background: "#DC262614", color: "#DC2626" },
  bar: { width: "100%", height: 7, borderRadius: 7, background: "#F1F1FA", overflow: "hidden" },
  stat6: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, textAlign: "center",
           padding: "10px 0", marginTop: 12, borderTop: "1px solid #F4F4FD", borderBottom: "1px solid #F4F4FD" },
  flabel: { fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 6 },
  listRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", marginBottom: 4,
             background: "#FBFBFE", border: "1px solid #F0F0F8", borderRadius: 10 },
  empty: { background: "#fff", border: "1px solid #F0F0F8", borderRadius: 16, padding: 28, textAlign: "center", fontSize: 13, color: "#94A3B8" },
  primary: { background: "#6366F1", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  ghost: { background: "#fff", color: "#475569", border: "1px solid #E5E7EB", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  linkBtn: { background: "none", border: "none", color: "#4338CA", fontWeight: 700, cursor: "pointer", fontSize: 13 },
  iconBtn: { width: 28, height: 28, borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", color: "#64748B", cursor: "pointer", fontSize: 12 },
  row: { display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", background: "#FBFBFE", border: "1px solid #F0F0F8", borderRadius: 12, flexWrap: "wrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", display: "grid", placeItems: "center", padding: 16, zIndex: 60 },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHead: { padding: "12px 16px", borderBottom: "1px solid #F0F0F8", display: "flex", alignItems: "center", justifyContent: "space-between",
               background: "linear-gradient(135deg,#6366F1,#4338CA)", color: "#fff" },
  close: { background: "rgba(255,255,255,.18)", border: "none", color: "#fff", borderRadius: 8, width: 26, height: 26, cursor: "pointer" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 },
  input: { width: "100%", padding: "9px 11px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 13, outline: "none", color: "#0F172A", background: "#fff" },
  permGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 },
  perm: { display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: 10,
          border: "1px solid #E5E7EB", fontSize: 12.5, color: "#475569", cursor: "pointer", background: "#fff" },
  permOn: { borderColor: "#C7D2FE", background: "#EEF2FF", color: "#4338CA", fontWeight: 700 },
  note: { marginTop: 12, background: "#EEF2FF", border: "1px solid #C7D2FE", color: "#4338CA", borderRadius: 10, padding: "9px 12px", fontSize: 12.5 },
};
