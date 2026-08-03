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
function initials(n) { return (n || "?").split(" ").map(c => c[0]).join("").slice(0, 2).toUpperCase(); }
const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"], ["#FEF3C7","#B45309"], ["#DCFCE7","#15803D"],
  ["#F3E8FF","#7C3AED"], ["#DBEAFE","#1D4ED8"], ["#FFF1F2","#E11D48"],
];
function avatarColor(n) { return AVATAR_COLORS[(n?.charCodeAt(0) || 0) % AVATAR_COLORS.length]; }
function pw(len = 12) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

/* ─── Page CSS ───────────────────────────────────────────────────────────── */
const PAGE_CSS = `
.modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px; }
.modal-box     { background:#fff;border-radius:16px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.18);overflow:hidden; }
.modal-head    { padding:20px 24px 16px;border-bottom:1px solid #F1F5F9;display:flex;align-items:flex-start;justify-content:space-between;gap:12px; }
.modal-title   { font-size:16px;font-weight:800;color:#0f172a; }
.modal-sub     { font-size:13px;color:#64748b;margin-top:3px; }
.modal-body    { padding:20px 24px;max-height:70vh;overflow-y:auto; }
.modal-foot    { padding:14px 24px;border-top:1px solid #F1F5F9;display:flex;gap:10px;justify-content:flex-end; }
.modal-close   { background:none;border:none;cursor:pointer;color:#94a3b8;font-size:18px;padding:0; }
.form-field    { margin-bottom:16px; }
.form-field label { display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px; }
.form-input    { width:100%;padding:9px 12px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;color:#0f172a;outline:none;font-family:inherit; }
.form-input:focus { border-color:#5A57FB; }
.form-row-2    { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
.email-chip-box { display:flex;flex-wrap:wrap;gap:6px;align-items:center;width:100%;padding:6px 8px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px; }
.email-chip-box:focus-within { border-color:#5A57FB; }
.email-chip     { display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 10px;background:#EEF2FF;color:#4338CA;border-radius:16px;font-size:12px;font-weight:600; }
.email-chip button { border:none;background:none;color:#4338CA;cursor:pointer;font-size:15px;line-height:1;padding:0 2px;font-family:inherit; }
.email-chip-input { flex:1;min-width:140px;border:none;outline:none;font-size:13px;padding:4px 2px;font-family:inherit; }
.btn-primary   { padding:9px 20px;background:linear-gradient(135deg,#5A57FB,#4845d4);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit; }
.btn-primary:disabled { opacity:.6;cursor:not-allowed; }
.btn-ghost     { padding:9px 20px;background:none;color:#64748b;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit; }
.btn-danger    { padding:9px 20px;background:#FEE2E2;color:#DC2626;border:1.5px solid #FCA5A5;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit; }
.btn-success   { padding:9px 20px;background:#DCFCE7;color:#15803D;border:1.5px solid #86EFAC;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit; }
.alert-error   { background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px; }
.alert-success { background:#F0FDF4;border:1px solid #BBF7D0;color:#15803D;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px; }
.cred-box      { background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;padding:14px 16px;margin-bottom:12px; }
.cred-label    { font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px; }
.cred-value    { font-size:13px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px; }
.copy-btn      { padding:3px 9px;border:1.5px solid #E2E8F0;border-radius:5px;background:#fff;font-size:11px;font-weight:600;cursor:pointer;color:#5A57FB;font-family:inherit;flex-shrink:0; }

.cl-stat {
  box-sizing:border-box; height:104px; border-radius:16px;
  padding:17px 18px 16px; display:flex; flex-direction:column;
  justify-content:space-between; border:1px solid;
  box-shadow:0 3px 12px rgba(15,23,42,.06); position:relative;
  overflow:hidden; transition:transform .2s ease, box-shadow .2s ease;
}
.cl-stat:hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(15,23,42,.12); }
.cl-stat::before { content:""; position:absolute; top:0; left:0; right:0; height:3px; }
.cl-stat-top { display:flex; align-items:center; gap:14px; }
.cl-stat-icon { width:46px; height:46px; border-radius:13px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:19px; flex-shrink:0; }
.cl-stat-body { flex:1; min-width:0; }
.cl-stat-val { font-size:22px; font-weight:900; color:#0F172A; line-height:1.05; letter-spacing:-.6px; white-space:nowrap; }
.cl-stat-label { font-size:12px; color:#475569; font-weight:700; margin-top:3px; white-space:nowrap; }
.cl-stat-track { height:6px; background:#F1F5F9; border-radius:6px; }
.cl-stat-fill { height:6px; border-radius:6px; transition:width .4s; }

.cl-stat.indigo::before { background:#4F46E5; }
.cl-stat.indigo { background:linear-gradient(160deg,#fff 55%,#EEF2FF 165%); border-color:#C7D2FE; }
.cl-stat.indigo .cl-stat-icon { background:#4F46E5; box-shadow:0 6px 16px #4F46E533; }
.cl-stat.indigo .cl-stat-fill { background:#4F46E5; }

.cl-stat.green::before { background:#16A34A; }
.cl-stat.green { background:linear-gradient(160deg,#fff 55%,#DCFCE7 165%); border-color:#BBF7D0; }
.cl-stat.green .cl-stat-icon { background:#16A34A; box-shadow:0 6px 16px #16A34A33; }
.cl-stat.green .cl-stat-fill { background:#16A34A; }

.cl-stat.red::before { background:#DC2626; }
.cl-stat.red { background:linear-gradient(160deg,#fff 55%,#FEE2E2 165%); border-color:#FECACA; }
.cl-stat.red .cl-stat-icon { background:#DC2626; box-shadow:0 6px 16px #DC262633; }
.cl-stat.red .cl-stat-fill { background:#DC2626; }

.cl-stat.orange::before { background:#EA580C; }
.cl-stat.orange { background:linear-gradient(160deg,#fff 55%,#FFEDD5 165%); border-color:#FED7AA; }
.cl-stat.orange .cl-stat-icon { background:#EA580C; box-shadow:0 6px 16px #EA580C33; }
.cl-stat.orange .cl-stat-fill { background:#EA580C; }
`;

/* ─── Invite Modal ───────────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InviteModal({ brands, onClose, onSuccess }) {
  const [form, setForm]   = useState({ name: "", emails: [], password: "", brandId: "", sendEmail: true });
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");

  function addEmail(raw) {
    const val = raw.trim().toLowerCase().replace(/,$/, "");
    if (!val) return;
    if (!EMAIL_RE.test(val)) { setError(`"${val}" is not a valid email`); return; }
    setForm(p => p.emails.includes(val) ? p : { ...p, emails: [...p.emails, val] });
    setEmailInput("");
  }
  function removeEmail(val) {
    setForm(p => ({ ...p, emails: p.emails.filter(e => e !== val) }));
  }
  function handleEmailKeyDown(e) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addEmail(emailInput);
    } else if (e.key === "Backspace" && !emailInput && form.emails.length) {
      removeEmail(form.emails[form.emails.length - 1]);
    }
  }

  async function submit() {
    setError("");
    let emails = form.emails;
    const pending = emailInput.trim().toLowerCase().replace(/,$/, "");
    if (pending) {
      if (!EMAIL_RE.test(pending)) { setError(`"${pending}" is not a valid email`); return; }
      emails = emails.includes(pending) ? emails : [...emails, pending];
      setForm(p => ({ ...p, emails }));
      setEmailInput("");
    }
    if (!form.name.trim() || emails.length === 0 || !form.password.trim() || !form.brandId) {
      setError("All fields are required — add at least one email"); return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/admin/clients/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, emails }) });
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
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>{result.message}</div>
          <div className="cred-box" style={{ textAlign: "left" }}>
            <div className="cred-label">Login URL</div>
            <div className="cred-value" style={{ fontSize: 12, wordBreak: "break-all", fontWeight: 500 }}>
              <a href={result.loginUrl} target="_blank" rel="noreferrer" style={{ color: "#5A57FB" }}>{result.loginUrl}</a>
              <button className="copy-btn" onClick={() => copyText(result.loginUrl)}>Copy</button>
            </div>
          </div>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div><div className="modal-title">Invite Client</div><div className="modal-sub">Create portal access and send login credentials via email</div></div>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert-error"><i className="bi bi-exclamation-circle-fill" /> {error}</div>}
          <div className="form-field"><label>Client Name *</label><input className="form-input" placeholder="Rohan Mehra" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-field">
            <label>Email Address(es) *</label>
            <div className="email-chip-box">
              {form.emails.map(em => (
                <span key={em} className="email-chip">
                  {em}
                  <button type="button" onClick={() => removeEmail(em)} aria-label={`Remove ${em}`}>&times;</button>
                </span>
              ))}
              <input
                className="email-chip-input"
                type="email"
                placeholder={form.emails.length ? "Add another…" : "rohan@company.com"}
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                onBlur={() => emailInput.trim() && addEmail(emailInput)}
              />
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Press Enter or comma to add. The first email is used as the login username; everyone added gets the invite.</div>
          </div>
          <div className="form-field">
            <label>Brand *</label>
            <select className="form-input" value={form.brandId} onChange={e => setForm(p => ({ ...p, brandId: e.target.value }))}>
              <option value="">Select brand to give access to</option>
              {brands.map(b => <option key={b._id} value={b._id}>{b.name} {b.clientId ? "(has client)" : ""}</option>)}
            </select>
            {selectedBrand?.slug && (
              <div style={{ fontSize: 11, color: "#5A57FB", marginTop: 4 }}>
                Login URL: <strong>{typeof window !== "undefined" ? `${window.location.origin}/${selectedBrand.slug}/login` : `/${selectedBrand.slug}/login`}</strong>
              </div>
            )}
          </div>
          <div className="form-field">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              Password *
              <button type="button" onClick={() => setForm(p => ({ ...p, password: pw() }))} style={{ fontSize: 11, color: "#5A57FB", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontFamily: "inherit" }}>Generate strong password</button>
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
          <button className="btn-primary" onClick={submit} disabled={loading}>{loading ? "Sending…" : "Invite Client →"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Credentials Modal ──────────────────────────────────────────────────── */
function CredentialsModal({ client, brands, onClose }) {
  const brand     = brands.find(b => b.clientId && b.clientId.toString() === client._id.toString());
  const baseUrl   = typeof window !== "undefined" ? window.location.origin : "";
  const loginUrl  = brand?.slug ? `${baseUrl}/${brand.slug}/login` : null;

  const [newPw,     setNewPw]     = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState(null); // { type, text }
  const [copied,    setCopied]    = useState("");

  function doCopy(text, label) {
    copyText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1800);
  }

  async function handleReinvite() {
    if (!newPw.trim()) { setMsg({ type: "error", text: "Enter a new password first" }); return; }
    setLoading(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/clients/${client._id}/reinvite`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPw.trim(), sendEmail }),
      });
      const d = await r.json();
      setMsg({ type: d.success ? "success" : "error", text: d.message });
      if (d.success) setNewPw("");
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title"><i className="bi bi-key-fill" style={{ color: "#5A57FB", marginRight: 8 }} />Credentials — {client.name}</div>
            <div className="modal-sub">{client.clientId} · View login details and manage access</div>
          </div>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-body">
          {msg && (
            <div className={msg.type === "success" ? "alert-success" : "alert-error"}>
              <i className={`bi ${msg.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`} /> {msg.text}
            </div>
          )}

          {/* Current credentials */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #F1F5F9" }}>
              Current Login Details
            </div>

            <div className="cred-box">
              <div className="cred-label">Username / Email</div>
              <div className="cred-value">
                <span style={{ flex: 1 }}>{client.email}</span>
                <button className="copy-btn" onClick={() => doCopy(client.email, "email")}>{copied === "email" ? "✓ Copied" : "Copy"}</button>
              </div>
            </div>

            <div className="cred-box">
              <div className="cred-label">Password</div>
              <div className="cred-value" style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, fontStyle: "italic" }}>
                <i className="bi bi-lock-fill" style={{ marginRight: 6, color: "#CBD5E1" }} />
                Password is hashed — use the reset form below to set a new one
              </div>
            </div>

            {loginUrl && (
              <div className="cred-box">
                <div className="cred-label">Portal Login URL</div>
                <div className="cred-value" style={{ fontSize: 12 }}>
                  <a href={loginUrl} target="_blank" rel="noreferrer" style={{ color: "#5A57FB", flex: 1, wordBreak: "break-all", fontWeight: 600 }}>{loginUrl}</a>
                  <button className="copy-btn" onClick={() => doCopy(loginUrl, "url")}>{copied === "url" ? "✓ Copied" : "Copy"}</button>
                  <a href={loginUrl} target="_blank" rel="noreferrer" style={{ padding: "3px 9px", background: "#EEF2FF", color: "#5A57FB", borderRadius: 5, fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>Open ↗</a>
                </div>
              </div>
            )}

            {brand && (
              <div className="cred-box">
                <div className="cred-label">Linked Brand</div>
                <div className="cred-value">
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: brand.color || "#5A57FB", flexShrink: 0 }} />
                  {brand.name}
                </div>
              </div>
            )}
          </div>

          {/* Reset password / Re-invite */}
          <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#B45309", marginBottom: 12 }}>
              <i className="bi bi-arrow-repeat" style={{ marginRight: 6 }} />Reset Password & Re-invite
            </div>
            <div className="form-field" style={{ marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                New Password
                <button type="button" onClick={() => setNewPw(pw())} style={{ fontSize: 11, color: "#5A57FB", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontFamily: "inherit" }}>Generate</button>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  className="form-input"
                  placeholder="Enter new password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14 }}>
                  <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
              {newPw && (
                <button type="button" onClick={() => doCopy(newPw, "newpw")} style={{ marginTop: 4, fontSize: 11, color: "#5A57FB", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontFamily: "inherit" }}>
                  {copied === "newpw" ? "✓ Copied" : "Copy password"}
                </button>
              )}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", marginBottom: 12 }}>
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
              Send updated credentials via email
            </label>
            <button className="btn-primary" onClick={handleReinvite} disabled={loading || !newPw.trim()} style={{ width: "100%" }}>
              {loading ? "Updating…" : sendEmail ? "Reset & Send Email →" : "Reset Password →"}
            </button>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Client Modal ──────────────────────────────────────────────────── */
function EditClientModal({ client, brands, onClose, onSuccess }) {
  const linkedBrand = brands.find(b => b.clientId && b.clientId.toString() === client._id.toString());
  const [form, setForm] = useState({
    name: client.name || "", email: client.email || "",
    company: client.company || "", phone: client.phone || "",
    status: client.status || "Active",
    brandId: linkedBrand?._id || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function submit() {
    setError("");
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required"); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/clients/${client._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), company: form.company.trim(), phone: form.phone.trim(), status: form.status, brandId: form.brandId || null }),
      });
      const d = await r.json();
      if (d.success) { onSuccess(d.client); onClose(); }
      else setError(d.message || "Failed to update client");
    } finally { setLoading(false); }
  }

  const selectedBrand = brands.find(b => b._id === form.brandId);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <div><div className="modal-title">Edit Client</div><div className="modal-sub">Update details for {client.name} · {client.clientId}</div></div>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert-error"><i className="bi bi-exclamation-circle-fill" /> {error}</div>}

          <div className="form-row-2">
            <div className="form-field"><label>Client Name *</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="form-field"><label>Email / Username *</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
          </div>
          <div className="form-row-2">
            <div className="form-field"><label>Company</label><input className="form-input" placeholder="Company name" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} /></div>
            <div className="form-field"><label>Phone</label><input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div className="form-row-2">
            <div className="form-field">
              <label>Brand Access</label>
              <select className="form-input" value={form.brandId} onChange={e => setForm(p => ({ ...p, brandId: e.target.value }))}>
                <option value="">No brand linked</option>
                {brands.map(b => <option key={b._id} value={b._id}>{b.name}{b.clientId && b.clientId.toString() !== client._id.toString() ? " (other client)" : ""}</option>)}
              </select>
              {selectedBrand?.slug && <div style={{ fontSize: 11, color: "#5A57FB", marginTop: 4 }}>Portal: {baseUrl}/{selectedBrand.slug}/login</div>}
            </div>
            <div className="form-field">
              <label>Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style={{ background: "#F0F9FF", border: "1.5px solid #BAE6FD", borderRadius: 9, padding: "10px 14px", fontSize: 12, color: "#0369A1" }}>
            <i className="bi bi-info-circle-fill" style={{ marginRight: 6 }} />
            To reset the client's password, use the <strong>Credentials</strong> button (key icon) on the client list.
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AdminClientsPage() {
  const [clients,  setClients]  = useState([]);
  const [brands,   setBrands]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [invite,   setInvite]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [creds,    setCreds]    = useState(null); // client for credentials modal
  const [toggling, setToggling] = useState({}); // { [id]: bool }

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

  async function toggleStatus(client) {
    const next = client.status === "Active" ? "Inactive" : "Active";
    if (!confirm(`${next === "Inactive" ? "Deactivate" : "Activate"} ${client.name}?\n\n${next === "Inactive" ? "Client will lose portal access immediately." : "Client will regain portal access."}`)) return;
    setToggling(p => ({ ...p, [client._id]: true }));
    try {
      await fetch(`/api/admin/clients/${client._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setClients(prev => prev.map(c => c._id === client._id ? { ...c, status: next } : c));
    } finally { setToggling(p => ({ ...p, [client._id]: false })); }
  }

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) || (c.email || "").toLowerCase().includes(s) || (c.company || "").toLowerCase().includes(s);
  });

  const stats = {
    total:    clients.length,
    active:   clients.filter(c => c.status === "Active").length,
    inactive: clients.filter(c => c.status !== "Active").length,
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
            <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>Manage client portal access, credentials, and brand links</p>
          </div>
          <button className="btn-primary" onClick={() => setInvite(true)}>
            <i className="bi bi-plus-lg" style={{ marginRight: 6 }} /> Invite Client
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 24, alignItems: "start" }}>
          {[
            { accent: "indigo", icon: "bi-people-fill",   val: stats.total,     label: "Total Clients", pct: 100 },
            { accent: "green",  icon: "bi-check-circle",  val: stats.active,    label: "Active",        pct: stats.total ? (stats.active / stats.total) * 100 : 0 },
            { accent: "red",    icon: "bi-slash-circle",  val: stats.inactive,  label: "Inactive",      pct: stats.total ? (stats.inactive / stats.total) * 100 : 0 },
            { accent: "orange", icon: "bi-link-45deg",    val: stats.withBrand, label: "With Brand",    pct: stats.total ? (stats.withBrand / stats.total) * 100 : 0 },
          ].map((s, i) => (
            <div key={i} className={`cl-stat ${s.accent}`}>
              <div className="cl-stat-top">
                <div className="cl-stat-icon"><i className={`bi ${s.icon}`} /></div>
                <div className="cl-stat-body">
                  <div className="cl-stat-val">{s.val}</div>
                  <div className="cl-stat-label">{s.label}</div>
                </div>
              </div>
              <div className="cl-stat-track">
                <div className="cl-stat-fill" style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "12px 16px", marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }} />
            <input style={{ width: "100%", padding: "7px 12px 7px 32px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit" }}
              placeholder="Search by name, email or company…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>{filtered.length} client{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                {["Client", "Email / Username", "Brand Access", "Status", "Invited", "Actions"].map(h => (
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
                const isActive = c.status === "Active";
                return (
                  <tr key={c._id} style={{ borderBottom: "1px solid #F1F5F9", background: isActive ? "" : "#FFFBEB" }}>
                    {/* Client */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: abg, color: aclr, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                          {initials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.clientId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{c.email}</div>
                      {c.company && <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.company}</div>}
                    </td>

                    {/* Brand */}
                    <td style={{ padding: "14px 16px" }}>
                      {clientBrands.length === 0 ? (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>No brand linked</span>
                      ) : clientBrands.map(b => (
                        <span key={b._id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", background: (b.color || "#5A57FB") + "20", color: b.color || "#5A57FB", borderRadius: 20, fontSize: 12, fontWeight: 700, marginRight: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: b.color || "#5A57FB" }} />
                          {b.name}
                        </span>
                      ))}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "4px 11px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: isActive ? "#DCFCE7" : "#FEE2E2",
                        color: isActive ? "#15803D" : "#DC2626" }}>
                        {isActive ? <><i className="bi bi-check-circle-fill" style={{ marginRight: 4, fontSize: 10 }} />Active</> : <><i className="bi bi-x-circle-fill" style={{ marginRight: 4, fontSize: 10 }} />Inactive</>}
                      </span>
                    </td>

                    {/* Invited */}
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#64748b" }}>{fmtDate(c.createdAt)}</td>

                    {/* Actions */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {/* Credentials */}
                        <button
                          onClick={() => setCreds(c)}
                          title="View credentials & reset password"
                          style={{ padding: "5px 10px", border: "1.5px solid #C7D2FE", borderRadius: 7, background: "#EEF2FF", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#5A57FB", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                          <i className="bi bi-key-fill" style={{ fontSize: 11 }} /> Credentials
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setEditing(c)}
                          title="Edit client details"
                          style={{ padding: "5px 10px", border: "1.5px solid #E2E8F0", borderRadius: 7, background: "#F8FAFC", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                          <i className="bi bi-pencil-fill" style={{ fontSize: 10 }} /> Edit
                        </button>

                        {/* Activate / Deactivate */}
                        <button
                          onClick={() => toggleStatus(c)}
                          disabled={toggling[c._id]}
                          title={isActive ? "Deactivate — blocks portal access" : "Activate — restores portal access"}
                          style={{ padding: "5px 10px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                            border: isActive ? "1.5px solid #FCA5A5" : "1.5px solid #86EFAC",
                            background: isActive ? "#FEF2F2" : "#F0FDF4",
                            color: isActive ? "#DC2626" : "#15803D",
                          }}>
                          {toggling[c._id] ? "…" : isActive ? <><i className="bi bi-slash-circle" style={{ fontSize: 10 }} /> Deactivate</> : <><i className="bi bi-check-circle" style={{ fontSize: 10 }} /> Activate</>}
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

      {invite && <InviteModal brands={brands} onClose={() => setInvite(false)} onSuccess={() => load()} />}
      {creds   && <CredentialsModal client={creds} brands={brands} onClose={() => setCreds(null)} />}
      {editing && <EditClientModal client={editing} brands={brands} onClose={() => setEditing(null)} onSuccess={() => load()} />}
    </div>
  );
}
