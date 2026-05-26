import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function initials(n) {
  return (n || "?").split(" ").map(c => c[0]).join("").slice(0, 2).toUpperCase();
}
const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"], ["#FEF3C7","#B45309"], ["#DCFCE7","#15803D"],
  ["#F3E8FF","#7C3AED"], ["#DBEAFE","#1D4ED8"], ["#FFF1F2","#E11D48"],
];
function avatarColor(n) { return AVATAR_COLORS[(n?.charCodeAt(0) || 0) % AVATAR_COLORS.length]; }

/* ─── Invite Modal ───────────────────────────────────────────────────────── */
function InviteModal({ brands, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", brandId: "", sendEmail: true });
  const [loading, setLoading]  = useState(false);
  const [result,  setResult]   = useState(null);
  const [error,   setError]    = useState("");

  function pw(len = 10) {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  async function submit() {
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.brandId) {
      setError("All fields are required"); return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/admin/clients/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) { setResult(d); onSuccess(d.client); }
      else setError(d.message || "Failed");
    } finally { setLoading(false); }
  }

  const selectedBrand = brands.find(b => b._id === form.brandId);

  if (result) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div style={{ textAlign: "center", padding: "36px 24px" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className="bi bi-check-lg" style={{ color: "#15803D", fontSize: 26 }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Client Invited!</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{result.message}</div>
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px", textAlign: "left", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>LOGIN LINK</div>
            <a href={result.loginUrl} target="_blank" rel="noreferrer" style={{ color: "#5A57FB", fontSize: 13, wordBreak: "break-all" }}>{result.loginUrl}</a>
          </div>
          <button onClick={onClose} style={{ padding: "9px 24px", background: "linear-gradient(135deg,#5A57FB,#4845d4)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Invite Client</div>
            <div className="modal-sub">Create portal access and send login credentials via email</div>
          </div>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert-error"><i className="bi bi-exclamation-circle-fill" /> {error}</div>}

          <div className="form-row-2">
            <div className="form-field">
              <label>Client Name *</label>
              <input className="form-input" placeholder="Rohan Mehra" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Email Address *</label>
              <input className="form-input" type="email" placeholder="rohan@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>

          <div className="form-field">
            <label>Brand *</label>
            <select className="form-input" value={form.brandId} onChange={e => setForm(p => ({ ...p, brandId: e.target.value }))}>
              <option value="">Select brand to give access to</option>
              {brands.map(b => <option key={b._id} value={b._id}>{b.name} {b.clientId ? "(has client)" : ""}</option>)}
            </select>
            {selectedBrand?.slug && (
              <div style={{ fontSize: 12, color: "#5A57FB", marginTop: 4 }}>
                Login URL: <strong>{`${window.location.origin}/${selectedBrand.slug}/login`}</strong>
              </div>
            )}
          </div>

          <div className="form-field">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              Password *
              <button type="button" onClick={() => setForm(p => ({ ...p, password: pw() }))}
                style={{ fontSize: 11, color: "#5A57FB", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontFamily: "inherit" }}>
                Generate strong password
              </button>
            </label>
            <input className="form-input" placeholder="Set a password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
            <input type="checkbox" checked={form.sendEmail} onChange={e => setForm(p => ({ ...p, sendEmail: e.target.checked }))} />
            Send invite email with login credentials
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Sending invite…" : "Invite Client →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Client Modal ──────────────────────────────────────────────────── */
function EditClientModal({ client, brands, onClose, onSuccess }) {
  const linkedBrand = brands.find(b => b.clientId && b.clientId.toString() === client._id.toString());
  const [form, setForm] = useState({
    name:     client.name     || "",
    email:    client.email    || "",
    company:  client.company  || "",
    phone:    client.phone    || "",
    status:   client.status   || "Active",
    brandId:  linkedBrand?._id || "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  function pw(len = 10) {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  async function submit() {
    setError("");
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required"); return; }
    setLoading(true);
    try {
      const body = {
        name:    form.name.trim(),
        email:   form.email.trim(),
        company: form.company.trim(),
        phone:   form.phone.trim(),
        status:  form.status,
        brandId: form.brandId || null,
      };
      if (form.password.trim()) body.password = form.password.trim();

      const r = await fetch(`/api/admin/clients/${client._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) { setSuccess(true); onSuccess(d.client); }
      else setError(d.message || "Failed to update client");
    } finally { setLoading(false); }
  }

  const selectedBrand = brands.find(b => b._id === form.brandId);

  if (success) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div style={{ textAlign: "center", padding: "36px 24px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <i className="bi bi-check-lg" style={{ color: "#15803D", fontSize: 24 }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Client Updated!</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Changes saved successfully.</div>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Edit Client</div>
            <div className="modal-sub">Update details for {client.name} · {client.clientId}</div>
          </div>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert-error"><i className="bi bi-exclamation-circle-fill" /> {error}</div>}

          <div className="form-row-2">
            <div className="form-field">
              <label>Client Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Email Address *</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label>Company</label>
              <input className="form-input" placeholder="Company name" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label>Brand Access</label>
              <select className="form-input" value={form.brandId} onChange={e => setForm(p => ({ ...p, brandId: e.target.value }))}>
                <option value="">No brand linked</option>
                {brands.map(b => (
                  <option key={b._id} value={b._id}>
                    {b.name}{b.clientId && b.clientId.toString() !== client._id.toString() ? " (other client)" : ""}
                  </option>
                ))}
              </select>
              {selectedBrand?.slug && (
                <div style={{ fontSize: 11, color: "#5A57FB", marginTop: 4 }}>
                  Portal: /{selectedBrand.slug}/login
                </div>
              )}
            </div>
            <div className="form-field">
              <label>Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              New Password
              <button type="button" onClick={() => setForm(p => ({ ...p, password: pw() }))}
                style={{ fontSize: 11, color: "#5A57FB", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontFamily: "inherit" }}>
                Generate strong password
              </button>
            </label>
            <input className="form-input" placeholder="Leave blank to keep current password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Client detail drawer ───────────────────────────────────────────────── */
function ClientDrawer({ client, brands, onClose, onDeactivate, onEdit }) {
  const clientBrands = brands.filter(b => b.clientId && b.clientId.toString() === client._id.toString());
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer-box">
        <div className="drawer-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: avatarColor(client.name)[0],
              color: avatarColor(client.name)[1],
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800,
            }}>{initials(client.name)}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{client.name}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{client.email}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="drawer-body">
          <div className="info-grid">
            <div className="info-item"><div className="info-label">Client ID</div><div className="info-val">{client.clientId}</div></div>
            <div className="info-item"><div className="info-label">Status</div>
              <div className="info-val">
                <span style={{ padding: "2px 10px", borderRadius: 5, fontSize: 12, fontWeight: 700,
                  background: client.status === "Active" ? "#DCFCE7" : "#FEE2E2",
                  color: client.status === "Active" ? "#15803D" : "#DC2626" }}>
                  {client.status}
                </span>
              </div>
            </div>
            <div className="info-item"><div className="info-label">Company</div><div className="info-val">{client.company || "—"}</div></div>
            <div className="info-item"><div className="info-label">Phone</div><div className="info-val">{client.phone || "—"}</div></div>
            <div className="info-item"><div className="info-label">Invited on</div><div className="info-val">{fmtDate(client.createdAt)}</div></div>
            <div className="info-item"><div className="info-label">Password set</div><div className="info-val">{client.passwordSet ? "Yes" : "No"}</div></div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Brand access ({clientBrands.length})</div>
            {clientBrands.length === 0 ? (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>No brands linked yet.</div>
            ) : clientBrands.map(b => (
              <div key={b._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.color || "#5A57FB" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</div>
                  <a href={`${baseUrl}/${b.slug}/login`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: "#5A57FB" }}>
                    /{b.slug}/login
                  </a>
                </div>
                <a href={`${baseUrl}/${b.slug}/login`} target="_blank" rel="noreferrer"
                  style={{ padding: "4px 10px", background: "#EEF2FF", color: "#5A57FB", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  Open portal
                </a>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" style={{ color: "#DC2626", borderColor: "#FCA5A5" }}
            onClick={() => onDeactivate(client._id)}>
            {client.status === "Active" ? "Deactivate" : "Activate"}
          </button>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={onEdit}>
            <i className="bi bi-pencil-fill" style={{ marginRight: 6 }} />Edit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page CSS ───────────────────────────────────────────────────────────── */
const PAGE_CSS = `
.modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px; }
.modal-box { background:#fff;border-radius:16px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden; }
.modal-head { padding:20px 24px 16px;border-bottom:1px solid #F1F5F9;display:flex;align-items:flex-start;justify-content:space-between;gap:12px; }
.modal-title { font-size:16px;font-weight:800;color:#0f172a; }
.modal-sub   { font-size:13px;color:#64748b;margin-top:3px; }
.modal-body  { padding:20px 24px;max-height:65vh;overflow-y:auto; }
.modal-foot  { padding:14px 24px;border-top:1px solid #F1F5F9;display:flex;gap:10px;justify-content:flex-end; }
.modal-close { background:none;border:none;cursor:pointer;color:#94a3b8;font-size:18px;padding:0; }
.form-field  { margin-bottom:16px; }
.form-field label { display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px; }
.form-input  { width:100%;padding:9px 12px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;color:#0f172a;outline:none;font-family:inherit; }
.form-input:focus { border-color:#5A57FB; }
.form-row-2  { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
.btn-primary { padding:9px 20px;background:linear-gradient(135deg,#5A57FB,#4845d4);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit; }
.btn-primary:disabled { opacity:.6;cursor:not-allowed; }
.btn-ghost   { padding:9px 20px;background:none;color:#64748b;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit; }
.alert-error { background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px; }

.drawer-overlay { position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;display:flex;justify-content:flex-end; }
.drawer-box { background:#fff;width:420px;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.1); }
.drawer-head { padding:20px 24px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between; }
.drawer-body { flex:1;overflow-y:auto;padding:20px 24px; }
.info-grid   { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
.info-item   { background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px; }
.info-label  { font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px; }
.info-val    { font-size:13px;font-weight:600;color:#0f172a; }
`;

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AdminClientsPage() {
  const [clients, setClients] = useState([]);
  const [brands,  setBrands]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [invite,  setInvite]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing,  setEditing]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, br] = await Promise.all([
        fetch("/api/admin/clients").then(r => r.json()),
        fetch("/api/admin/brands").then(r => r.json()),
      ]);
      if (cr.success) setClients(cr.clients);
      if (br.success) setBrands(br.brands);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deactivate(id) {
    const c = clients.find(x => x._id === id);
    if (!confirm(`${c.status === "Active" ? "Deactivate" : "Activate"} ${c.name}?`)) return;
    await fetch(`/api/admin/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: c.status === "Active" ? "Inactive" : "Active" }),
    });
    setSelected(null);
    load();
  }

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) || (c.email || "").toLowerCase().includes(s) || (c.company || "").toLowerCase().includes(s);
  });

  const stats = {
    total:    clients.length,
    active:   clients.filter(c => c.status === "Active").length,
    withBrand: clients.filter(c => brands.some(b => b.clientId && b.clientId.toString() === c._id.toString())).length,
  };

  return (
    <div id="main-content" style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      <Head>
        <title>Client Management · Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      </Head>
      <style>{PAGE_CSS}</style>

      <SmartLeftbar />
      <LeftbarMobile />
      <Dashnav />

      <section className="content" style={{ marginLeft: 250, padding: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Client Management</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>Manage client portal access and brand links</p>
          </div>
          <button className="btn-primary" onClick={() => setInvite(true)}>
            <i className="bi bi-plus-lg" style={{ marginRight: 6 }} /> Invite Client
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total Clients", val: stats.total,     icon: "bi-people-fill",   bg: "#EEF2FF", color: "#4F46E5" },
            { label: "Active",        val: stats.active,    icon: "bi-check-circle",   bg: "#DCFCE7", color: "#15803D" },
            { label: "With Brand",    val: stats.withBrand, icon: "bi-link-45deg",     bg: "#FEF3C7", color: "#B45309" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 18 }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{s.val}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "16px 20px", marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input style={{ width: "100%", padding: "8px 12px 8px 34px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit" }}
              placeholder="Search by name, email or company…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 13, color: "#64748b" }}>{filtered.length} client{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                {["Client", "Email", "Brand Access", "Status", "Invited", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 48 }}>
                  <i className="bi bi-people" style={{ fontSize: 32, color: "#E2E8F0", display: "block", marginBottom: 10 }} />
                  <div style={{ fontSize: 14, color: "#94a3b8" }}>No clients yet. Invite your first client!</div>
                </td></tr>
              ) : filtered.map(c => {
                const [abg, aclr] = avatarColor(c.name);
                const clientBrands = brands.filter(b => b.clientId && b.clientId.toString() === c._id.toString());
                return (
                  <tr key={c._id} style={{ borderBottom: "1px solid #F1F5F9" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: abg, color: aclr, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
                          {initials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.clientId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>{c.email}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {clientBrands.length === 0 ? (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>No brand linked</span>
                      ) : clientBrands.map(b => (
                        <span key={b._id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: (b.color || "#5A57FB") + "20", color: b.color || "#5A57FB", borderRadius: 5, fontSize: 12, fontWeight: 700, marginRight: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: b.color || "#5A57FB" }} />
                          {b.name}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 5, fontSize: 12, fontWeight: 700,
                        background: c.status === "Active" ? "#DCFCE7" : "#FEE2E2",
                        color: c.status === "Active" ? "#15803D" : "#DC2626" }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#64748b" }}>{fmtDate(c.createdAt)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setSelected(c)}
                          style={{ padding: "5px 12px", border: "1.5px solid #E2E8F0", borderRadius: 6, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151", fontFamily: "inherit" }}>
                          View
                        </button>
                        <button onClick={() => setEditing(c)}
                          style={{ padding: "5px 12px", border: "1.5px solid #5A57FB", borderRadius: 6, background: "#EEF2FF", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#5A57FB", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                          <i className="bi bi-pencil-fill" style={{ fontSize: 11 }} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {invite && (
        <InviteModal brands={brands} onClose={() => setInvite(false)} onSuccess={() => load()} />
      )}
      {selected && (
        <ClientDrawer client={selected} brands={brands} onClose={() => setSelected(null)} onDeactivate={deactivate}
          onEdit={() => { setEditing(selected); setSelected(null); }} />
      )}
      {editing && (
        <EditClientModal client={editing} brands={brands} onClose={() => setEditing(null)}
          onSuccess={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}
