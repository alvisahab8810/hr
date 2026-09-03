// pages/dashboard/website/settings.js — where the CRM is configured.
// Every tab here changes something real: the picklists feed the lead, proposal
// and invoice forms, the extra columns are the ones the Leads table shows, and
// the document block is what prints on an invoice or a proposal.
import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { clearCrmSettings } from "@/utils/crmSettings";
import { initials, fmtDT } from "@/utils/leadsMeta";

const TABS = [
  ["lists", "Picklists"],
  ["fields", "Lead form"],
  ["docs", "Invoices & proposals"],
  ["templates", "Email templates"],
  ["team", "Team"],
];

const LISTS = [
  ["sources", "Lead sources", "Offered under Source on the lead form."],
  ["services", "Services", "Used on the lead, proposal and invoice forms."],
  ["industries", "Industries", "Offered under Industry on the lead form."],
  ["budgets", "Budget bands", "Must match the website form word for word."],
  ["lostReasons", "Drop out reasons", "Asked for when a lead is marked lost."],
];

export default function CrmSettings() {
  const [tab, setTab] = useState("lists");
  const [st, setSt] = useState(null);
  const [fields, setFields] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [team, setTeam] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [s, f] = await Promise.all([
      fetch("/api/admin/settings", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/leads/fields", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
    ]);
    if (s?.success) setSt(s.data);
    if (f?.success) setFields(f.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === "templates" && !templates.length) {
      fetch("/api/admin/settings/templates", { credentials: "include" })
        .then((r) => r.json()).then((j) => j?.success && setTemplates(j.data)).catch(() => {});
    }
    if (tab === "team" && !team.length) {
      fetch("/api/admin/sales-team", { credentials: "include" })
        .then((r) => r.json()).then((j) => j?.success && setTeam(j.team || [])).catch(() => {});
    }
  }, [tab, templates.length, team.length]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2600); };

  async function save(patch) {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await r.json();
      if (j.success) {
        setSt(j.data);
        // The boards keep the settings in a module cache — drop it so the next
        // page they open reads what was just saved.
        clearCrmSettings();
        flash("Saved");
      } else flash(j.message || "Could not save");
    } catch (e) { flash(e.message); }
    setSaving(false);
  }

  /* ── picklists ─────────────────────────────────────────────────────────── */
  const addTo = (key) => {
    const v = window.prompt("Add to the list");
    if (!v || !v.trim()) return;
    const next = [...(st.lists[key] || []), v.trim()];
    save({ lists: { [key]: next } });
  };
  const removeFrom = (key, i) => {
    const next = (st.lists[key] || []).filter((_, ix) => ix !== i);
    save({ lists: { [key]: next } });
  };

  /* ── extra lead columns ────────────────────────────────────────────────── */
  async function addField() {
    const label = window.prompt("Column name, for example GST number");
    if (!label || !label.trim()) return;
    const type = (window.prompt("Type: text, number, date or select", "text") || "text").trim();
    const options = type === "select" ? window.prompt("Options, comma separated") || "" : "";
    const r = await fetch("/api/admin/leads/fields", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim(), type, options }),
    });
    const j = await r.json();
    if (j.success) { setFields((f) => [...f, j.data]); flash("Column added"); }
    else flash(j.message || "Could not add");
  }
  async function delField(key) {
    if (!window.confirm("Remove this column? Values already saved on leads stay untouched.")) return;
    const r = await fetch(`/api/admin/leads/fields?key=${encodeURIComponent(key)}`, { method: "DELETE", credentials: "include" });
    const j = await r.json();
    if (j.success) { setFields((f) => f.filter((x) => x.key !== key)); flash("Column removed"); }
  }

  return (
    <section className="main-dashboard-area">
      <Head>
        <title>Settings — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
      </Head>

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            <div style={s.head}>
              <div>
                <b style={{ fontSize: 17, color: "#0F172A" }}>Settings</b>
                <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 3 }}>
                  The lists, the columns and the paperwork the CRM runs on. Everything saved here takes effect on the boards.
                </div>
              </div>
              {msg ? <span style={s.flash}><i className="bi bi-check-circle-fill" style={{ marginRight: 6 }} />{msg}</span> : null}
            </div>

            <div style={s.tabs}>
              {TABS.map(([k, n]) => (
                <button key={k} onClick={() => setTab(k)} style={{ ...s.tab, ...(tab === k ? s.tabOn : {}) }}>{n}</button>
              ))}
            </div>

            {!st ? <div style={s.muted}>Loading…</div> : null}

            {st && tab === "lists" ? (
              <div style={s.cols2}>
                {LISTS.map(([key, title, hint]) => (
                  <Panel key={key} title={title} tag={`${(st.lists[key] || []).length} items`}
                         action={<button style={s.small} onClick={() => addTo(key)} disabled={saving}>Add</button>}>
                    {(st.lists[key] || []).map((v, i) => (
                      <div key={`${v}-${i}`} style={s.row}>
                        <span style={{ flex: 1, fontSize: 12.5, color: "#334155" }}>{v}</span>
                        <button style={s.del} onClick={() => removeFrom(key, i)} disabled={saving}>Remove</button>
                      </div>
                    ))}
                    <div style={s.hint}>{hint}</div>
                  </Panel>
                ))}
              </div>
            ) : null}

            {st && tab === "fields" ? (
              <div style={s.cols2}>
                <Panel title="Extra columns on the leads table" tag={`${fields.length} added`}
                       action={<button style={s.small} onClick={addField}>Add a column</button>}>
                  {fields.length ? fields.map((f) => (
                    <div key={f.key} style={s.row}>
                      <span style={{ flex: 1, fontSize: 12.5, color: "#334155" }}>{f.label}</span>
                      <span style={s.tag}>{f.type}</span>
                      <button style={s.del} onClick={() => delField(f.key)}>Remove</button>
                    </div>
                  )) : <div style={s.muted}>No extra columns yet. Add one and it appears on the lead form and as a column on the table.</div>}
                  <div style={s.hint}>
                    A dropdown column asks for its options when you add it. Values already saved on leads are kept even if the column is removed.
                  </div>
                </Panel>
                <Panel title="What is fixed" tag="built in">
                  <div style={s.hint}>
                    Name, business, phone, email, city, industry, service, budget, owner, status, meeting and source are part of every lead and cannot be
                    removed — the website form writes straight into them. Anything else the team needs goes in as an extra column here.
                  </div>
                </Panel>
              </div>
            ) : null}

            {st && tab === "docs" ? <DocsTab st={st} save={save} saving={saving} /> : null}

            {st && tab === "templates" ? (
              <Panel title="Email templates" tag={`${templates.length} live`}>
                {templates.map((t) => (
                  <div key={t.k} style={s.row}>
                    <span style={{ width: 150, fontSize: 12.5, color: "#334155", fontWeight: 700 }}>{t.n}</span>
                    <span style={{ flex: 1, fontSize: 11.5, color: "#94A3B8" }}>{t.subject}</span>
                    <span style={s.tag}>{t.g}</span>
                  </div>
                ))}
                <div style={s.hint}>
                  These are the mails the Leads board sends. The wording lives in the code so every mail carries the same brand; pick “Write it myself”
                  on a lead when a one-off message is needed.
                </div>
              </Panel>
            ) : null}

            {st && tab === "team" ? (
              <Panel title="Who can sign in" tag={`${team.length} people`}
                     action={<Link href="/dashboard/website/sales-team" style={{ ...s.small, textDecoration: "none" }}>Manage the team</Link>}>
                {team.length ? team.map((t) => (
                  <div key={t._id} style={s.row}>
                    <span style={{ ...s.ava, background: t.color || "#6366F1" }}>{initials(t.name)}</span>
                    <span style={{ flex: 1, fontSize: 12.5, color: "#334155", fontWeight: 700 }}>{t.name}</span>
                    <span style={{ fontSize: 11.5, color: "#94A3B8", flex: 1 }}>{t.role}</span>
                    <span style={{ fontSize: 11.5, color: "#94A3B8", flex: 1 }}>{t.email}</span>
                    <span style={{ fontSize: 11.5, color: "#94A3B8" }}>{t.lastLogin ? fmtDT(t.lastLogin) : "never signed in"}</span>
                    <span style={{ ...s.tag, background: t.active ? "#DCFCE7" : "#FEE2E2", color: t.active ? "#15803D" : "#B91C1C" }}>
                      {t.active ? "Active" : "Off"}
                    </span>
                  </div>
                )) : <div style={s.muted}>Nobody onboarded yet.</div>}
                <div style={s.hint}>Menus, passwords and access are set on the Sales team page.</div>
              </Panel>
            ) : null}

          </div>
        </section>
      </div>

      <style jsx global>{`
        @media (max-width: 1100px) { .set-cols2 { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

/* ── invoices and proposals ────────────────────────────────────────────────── */
function DocsTab({ st, save, saving }) {
  const [c, setC] = useState(st.company);
  const [d, setD] = useState({ ...st.docs, terms: (st.docs.terms || []).join("\n") });
  const set = (k, v) => setC((x) => ({ ...x, [k]: v }));
  const setd = (k, v) => setD((x) => ({ ...x, [k]: v }));

  return (
    <div style={s.cols2} className="set-cols2">
      <Panel title="What prints on the paperwork" tag="header of every sheet">
        <F l="Business name"><input style={s.in} value={c.name || ""} onChange={(e) => set("name", e.target.value)} /></F>
        <F l="Tagline"><input style={s.in} value={c.tag || ""} onChange={(e) => set("tag", e.target.value)} /></F>
        <F l="Email"><input style={s.in} value={c.email || ""} onChange={(e) => set("email", e.target.value)} /></F>
        <F l="Website"><input style={s.in} value={c.site || ""} onChange={(e) => set("site", e.target.value)} /></F>
        <F l="Place"><input style={s.in} value={c.place || ""} onChange={(e) => set("place", e.target.value)} /></F>
        <F l="GSTIN" hint="Printed under the address when it is filled in."><input style={s.in} value={c.gstin || ""} onChange={(e) => set("gstin", e.target.value)} /></F>
        <F l="PAN"><input style={s.in} value={c.pan || ""} onChange={(e) => set("pan", e.target.value)} /></F>
        <F l="Bank account" hint="Shown on invoices only."><input style={s.in} value={c.bank || ""} onChange={(e) => set("bank", e.target.value)} /></F>
        <F l="IFSC"><input style={s.in} value={c.ifsc || ""} onChange={(e) => set("ifsc", e.target.value)} /></F>
        <F l="UPI"><input style={s.in} value={c.upi || ""} onChange={(e) => set("upi", e.target.value)} /></F>
        <button style={s.primary} disabled={saving} onClick={() => save({ company: c })}>Save the branding</button>
      </Panel>

      <Panel title="Invoice defaults" tag={`${d.gstPct || 0}% GST · ${d.dueDays || 0} day terms`}>
        <F l="GST rate" hint="Filled in on every new invoice.">
          <input style={s.in} inputMode="numeric" value={d.gstPct ?? ""} onChange={(e) => setd("gstPct", e.target.value.replace(/\D/g, "").slice(0, 2))} />
        </F>
        <F l="Payment terms in days" hint="The due date is set this many days after the issue date.">
          <input style={s.in} inputMode="numeric" value={d.dueDays ?? ""} onChange={(e) => setd("dueDays", e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </F>
        <F l="Terms printed on every sheet" hint="One line each. They print as a numbered list.">
          <textarea style={{ ...s.in, height: 150, resize: "vertical", fontFamily: "inherit" }} value={d.terms}
                    onChange={(e) => setd("terms", e.target.value)} />
        </F>
        <button style={s.primary} disabled={saving}
                onClick={() => save({ docs: {
                  gstPct: Number(d.gstPct || 0),
                  dueDays: Number(d.dueDays || 0),
                  terms: String(d.terms || "").split("\n").map((x) => x.trim()).filter(Boolean),
                } })}>
          Save the defaults
        </button>
        <div style={s.hint}>Preview any invoice or proposal after saving — the sheet is built from exactly these values.</div>
      </Panel>
    </div>
  );
}

function Panel({ title, tag, action, children }) {
  return (
    <div style={s.panel}>
      <div style={s.panelHead}>
        <b style={{ fontSize: 13, color: "#0F172A", flex: 1 }}>{title}</b>
        {tag ? <span style={s.tag}>{tag}</span> : null}
        {action}
      </div>
      <div style={{ padding: "10px 16px 16px" }}>{children}</div>
    </div>
  );
}

const F = ({ l, hint, children }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 4 }}>{l}</label>
    {children}
    {hint ? <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>{hint}</div> : null}
  </div>
);

const s = {
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 },
  flash: { background: "#DCFCE7", color: "#15803D", fontSize: 12, fontWeight: 800, padding: "7px 12px", borderRadius: 999 },
  tabs: { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 },
  tab: { border: "1px solid #E9E9F6", background: "#fff", color: "#64748B", borderRadius: 999, padding: "8px 15px",
         fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  tabOn: { background: "#6366F1", borderColor: "#6366F1", color: "#fff" },
  cols2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 14, alignItems: "start" },
  panel: { background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden" },
  panelHead: { padding: "12px 16px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center", gap: 9 },
  tag: { fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#6366F114", color: "#4338CA" },
  row: { display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: "1px solid #F4F4FD" },
  small: { background: "#6366F1", color: "#fff", border: "none", borderRadius: 9, padding: "6px 12px", fontSize: 11.5, fontWeight: 800, cursor: "pointer" },
  del: { background: "#fff", color: "#B91C1C", border: "1px solid #FECACA", borderRadius: 8, padding: "4px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  primary: { background: "#6366F1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", marginTop: 4 },
  in: { width: "100%", border: "1px solid #E5E7EB", borderRadius: 9, padding: "8px 11px", fontSize: 12.5, color: "#334155", background: "#fff" },
  hint: { fontSize: 11.5, color: "#94A3B8", marginTop: 10, lineHeight: 1.6 },
  muted: { fontSize: 12.5, color: "#94A3B8" },
  ava: { width: 26, height: 26, borderRadius: 8, color: "#fff", fontSize: 10.5, fontWeight: 800,
         display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  // Admin-only: a salesperson login is limited to the Sales panel.
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
