import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function initials(name) {
  return (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const SERVICE_META = {
  socialMedia:  { label: "Social Media",    short: "SMM",  icon: "bi-instagram",         color: "#E11D48", bg: "#FFF1F2" },
  website:      { label: "Web Development", short: "WEB",  icon: "bi-code-slash",         color: "#0EA5E9", bg: "#F0F9FF" },
  seo:          { label: "SEO",             short: "SEO",  icon: "bi-graph-up-arrow",     color: "#16A34A", bg: "#F0FDF4" },
  ads:          { label: "Ad Campaigns",    short: "ADS",  icon: "bi-megaphone",          color: "#F97316", bg: "#FFF7ED" },
  branding:     { label: "Branding",        short: "BRD",  icon: "bi-palette",            color: "#8B5CF6", bg: "#F5F3FF" },
};

const STATUS_META = {
  todo:        { label: "To Do",       bg: "#F1F5F9", color: "#64748B" },
  in_progress: { label: "In Progress", bg: "#DBEAFE", color: "#1D4ED8" },
  review:      { label: "Awaiting Approval", bg: "#EEF2FF", color: "#4F46E5" },
  completed:   { label: "Approved",    bg: "#DCFCE7", color: "#15803D" },
  blocked:     { label: "Blocked",     bg: "#FEE2E2", color: "#DC2626" },
};

const CTYPE_META = {
  reel:     { label: "REEL",     color: "#E11D48", bg: "#FFF1F2" },
  post:     { label: "POST",     color: "#1D4ED8", bg: "#DBEAFE" },
  carousel: { label: "CAROUSEL", color: "#8B5CF6", bg: "#F5F3FF" },
  story:    { label: "STORY",    color: "#059669", bg: "#ECFDF5" },
};

const TAG_OFFER_META = {
  "Special Offer": { bg: "#DCFCE7", color: "#15803D" },
  "Announcement":  { bg: "#EEF2FF", color: "#4F46E5" },
  "New Feature":   { bg: "#DBEAFE", color: "#1D4ED8" },
  "Upgrade":       { bg: "#F5F3FF", color: "#7C3AED" },
  "Event":         { bg: "#FEE2E2", color: "#DC2626" },
};

/* ─── Portal CSS ─────────────────────────────────────────────────────────── */
const PORTAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F8FAFC; color: #0f172a; min-height: 100vh; }

/* Layout */
.cp-layout    { display: flex; min-height: 100vh; }
.cp-sidebar   { width: 230px; min-height: 100vh; background: #fff; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; position: fixed; left: 0; top: 0; bottom: 0; z-index: 100; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }
.cp-sidebar::-webkit-scrollbar { width: 4px; }
.cp-sidebar::-webkit-scrollbar-track { background: transparent; }
.cp-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }
.cp-sidebar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.22); }
.cp-main      { margin-left: 230px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; min-width: 0; overflow-x: hidden; }
.cp-topbar    { height: 56px; background: #fff; border-bottom: 1px solid #E2E8F0; border-top: 3px solid transparent; border-image: linear-gradient(90deg,#5A57FB,#02EBAD) 1; display: flex; align-items: center; padding: 0 24px; gap: 12px; position: sticky; top: 0; z-index: 50; }
.cp-content   { flex: 1; padding: 24px; min-width: 0; }

/* Sidebar — dark Viralon brand */
.cp-sidebar   { background: #0F0C29 !important; border-right: none !important; }
.cp-sb-header {
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.cp-sb-logo-row {
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
}
.cp-sb-logo-img {
  width: 107px; margin: auto; height: 50px;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(90,87,251,.5));
}
.cp-brand-display {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
}
.cp-brand-dot-live {
  width: 7px; height: 7px; border-radius: 50%;
  flex-shrink: 0;
  animation: livepulse 2s infinite;
}
@keyframes livepulse { 0%,100%{opacity:1}50%{opacity:.4} }
.cp-brand-display-name {
  font-size: 13px; font-weight: 700; color: rgba(255,255,255,.9);
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cp-brand-display-sub {
  font-size: 10px; color: rgba(255,255,255,.3);
  font-weight: 600; letter-spacing: .5px;
}
.cp-nav-section { padding: 14px 10px 4px; }
.cp-nav-label   {
  font-size: 9.5px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: rgba(255,255,255,.25);
  padding: 0 6px; margin-bottom: 4px;
}
.cp-nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; border-radius: 9px;
  cursor: pointer; font-size: 13px; font-weight: 500;
  color: rgba(255,255,255,.5);
  transition: background .12s, color .12s;
  text-decoration: none; margin-bottom: 1px;
  border: none; background: none; width: 100%;
  text-align: left; font-family: inherit;
}
.cp-nav-item:hover  { background: rgba(255,255,255,.07); color: rgba(255,255,255,.85); }
.cp-nav-item.active {
  background: linear-gradient(90deg, rgba(90,87,251,.3), rgba(90,87,251,.1));
  color: #fff; font-weight: 700;
  border-left: 2px solid #5A57FB;
  padding-left: 8px;
}
.cp-nav-item.active i { color: #02EBAD; }
.cp-nav-badge { margin-left: auto; background: #EF4444; color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }
.cp-nav-badge.amber { background: #F59E0B; }
.cp-sidebar-bottom {
  margin-top: auto; padding: 12px;
  border-top: 1px solid rgba(255,255,255,.07);
}
.cp-user-chip {
  display: flex; align-items: center; gap: 9px;
  padding: 10px 12px; border-radius: 10px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
  cursor: pointer;
}
.cp-user-av   {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg,#5A57FB,#02EBAD);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.cp-user-name { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.9); }
.cp-user-sub  { font-size: 11px; color: rgba(255,255,255,.35); }

/* Topbar */
.cp-search { flex: 1; max-width: 320px; position: relative; }
.cp-search input { width: 100%; padding: 7px 12px 7px 34px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; outline: none; font-family: inherit; color: #0f172a; background: #F8FAFC; }
.cp-search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
.cp-topbar-title { font-size: 15px; font-weight: 700; color: #0f172a; flex: 1; }
.cp-icon-btn { width: 36px; height: 36px; border-radius: 8px; border: 1.5px solid #E2E8F0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; font-size: 16px; position: relative; transition: background .12s; }
.cp-icon-btn:hover { background: #F1F5F9; }
.cp-icon-btn .badge { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; background: #EF4444; color: #fff; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.cp-req-btn { padding: 8px 16px; background: linear-gradient(135deg,#5A57FB,#4845d4); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: inherit; transition: opacity .15s; }
.cp-req-btn:hover { opacity: .9; }

/* Hero */
.cp-hero {     background: linear-gradient(135deg, #1e1b4b 0%, #4F46E5 55%, #7C3AED 100%); border-radius: 16px; padding: 28px 32px; color: #fff; margin-bottom: 24px; position: relative; overflow: hidden; }
.cp-hero::after { content:""; position:absolute; right:-40px; top:-40px; width:220px; height:220px; border-radius:50%;     background: rgb(194 193 254 / 15%); }
.cp-hero-greeting { font-size: 13px; color: rgba(255,255,255,.6); font-weight: 500; margin-bottom: 4px; }
.cp-hero-title    { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
.cp-hero-title span {     background: linear-gradient(90deg, #FF6F61 29%, #FBA065 95%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block; }
.cp-hero-sub      { font-size: 14px; color: rgba(255,255,255,.65); max-width: 480px; }
.cp-hero-stats    { display: flex; gap: 32px; margin-top: 24px; position: relative; z-index: 1; }
.cp-hero-stat     { text-align: left; }
.cp-hero-stat-val { font-size: 28px; font-weight: 800; line-height: 1; }
.cp-hero-stat-label { font-size: 11px; color: rgba(255,255,255,.5); font-weight: 600; letter-spacing: .5px; text-transform: uppercase; margin-top: 4px; }
.cp-hero-stat-val.teal   { color: #02EBAD; }
.cp-hero-stat-val.purple { color: #a5b4fc; }
.cp-hero-stat-val.amber  { color: #FCD34D; }

/* Service tiles */
.cp-services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-bottom: 24px; }
.cp-svc-tile   { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 18px 18px 14px; cursor: pointer; transition: box-shadow .15s, border-color .15s; position: relative; overflow: hidden; }
.cp-svc-tile:hover { box-shadow: 0 4px 20px rgba(0,0,0,.07); border-color: #CBD5E1; }
.cp-svc-chip   { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: .5px; margin-bottom: 12px; }
.cp-svc-kpi    { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.1; }
.cp-svc-desc   { font-size: 12px; color: #64748b; margin-top: 4px; }
.cp-svc-arrow  { position: absolute; right: 14px; top: 14px; color: #CBD5E1; font-size: 14px; }

/* Two-col layout */
.cp-two-col { display: grid; grid-template-columns: 1fr 340px; gap: 18px; margin-bottom: 24px; }
@media (max-width: 900px) { .cp-two-col { grid-template-columns: 1fr; } }

/* Cards */
.cp-card         { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 20px; }
.cp-card-title   { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.cp-card-sub     { font-size: 12px; color: #64748b; font-weight: 400; }
.cp-view-all     { margin-left: auto; font-size: 12px; color: #5A57FB; font-weight: 600; cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; }
.cp-view-all:hover { text-decoration: underline; }
.cp-empty-state  { text-align: center; padding: 28px; color: #94a3b8; font-size: 13px; }
.cp-empty-state i { font-size: 28px; display: block; margin-bottom: 8px; }

/* Approval items */
.cp-approval-item { padding: 14px 0; border-bottom: 1px solid #F1F5F9; display: flex; gap: 12px; align-items: flex-start; }
.cp-approval-item:last-child { border-bottom: none; }
.cp-approval-thumb { width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
.cp-approval-title { font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
.cp-approval-meta  { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px; }
.cp-approval-actions { margin-top: 10px; display: flex; gap: 8px; }
.cp-btn-approve { padding: 5px 14px; border-radius: 6px; border: none; background: #DCFCE7; color: #15803D; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.cp-btn-reject  { padding: 5px 14px; border-radius: 6px; border: none; background: #FEE2E2; color: #DC2626; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.cp-btn-approve:hover { background: #BBF7D0; }
.cp-btn-reject:hover  { background: #FCA5A5; }

/* Slate items */
.cp-slate-item { padding: 12px 0; border-bottom: 1px solid #F1F5F9; display: flex; align-items: center; gap: 10px; }
.cp-slate-item:last-child { border-bottom: none; }
.cp-slate-dot  { width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; }
.cp-slate-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.cp-slate-date { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.cp-slate-status { margin-left: auto; }

/* Tasks table view */
.cp-tasks-list { display: flex; flex-direction: column; gap: 8px; }
.cp-task-row   { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
.cp-task-row:hover { border-color: #CBD5E1; box-shadow: 0 2px 8px rgba(0,0,0,.04); }

/* Tabs */
.cp-tabs { display: flex; gap: 4px; margin-bottom: 18px; background: #F1F5F9; border-radius: 10px; padding: 4px; }
.cp-tab  { flex: 1; padding: 8px 12px; border-radius: 7px; border: none; background: none; font-size: 13px; font-weight: 600; cursor: pointer; color: #64748b; font-family: inherit; transition: all .12s; }
.cp-tab.active { background: #fff; color: #0f172a; box-shadow: 0 1px 4px rgba(0,0,0,.08); }

/* Badge */
.cp-badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 700; }

/* Modal */
.cp-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.cp-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,.15); overflow: hidden; }
.cp-modal-head { padding: 20px 24px 16px; border-bottom: 1px solid #F1F5F9; display: flex; align-items: flex-start; gap: 12px; }
.cp-modal-body { padding: 20px 24px; max-height: 60vh; overflow-y: auto; }
.cp-modal-foot { padding: 16px 24px; border-top: 1px solid #F1F5F9; display: flex; gap: 10px; justify-content: flex-end; }
.cp-modal-title { font-size: 16px; font-weight: 800; color: #0f172a; }
.cp-modal-sub   { font-size: 13px; color: #64748b; margin-top: 2px; }
.cp-field { margin-bottom: 16px; }
.cp-field label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; }
.cp-input  { width: 100%; padding: 9px 12px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; color: #0f172a; outline: none; font-family: inherit; }
.cp-input:focus { border-color: #5A57FB; }
.cp-textarea { width: 100%; padding: 9px 12px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; color: #0f172a; outline: none; font-family: inherit; resize: vertical; min-height: 80px; }
.cp-textarea:focus { border-color: #5A57FB; }
.cp-btn-primary { padding: 9px 20px; background: linear-gradient(135deg,#5A57FB,#4845d4); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.cp-btn-ghost   { padding: 9px 20px; background: none; color: #64748b; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }

.cp-spinner { width: 32px; height: 32px; border: 3px solid #E2E8F0; border-top-color: #5A57FB; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.cp-loading { display: flex; align-items: center; justify-content: center; height: 200px; }

/* Delivered grid */
.cp-delivered-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.cp-del-card { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 14px 12px; }
.cp-del-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
.cp-del-meta { font-size: 11px; color: #64748b; }

/* Content approval cards */
.cp-content-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.cp-content-card { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 14px; overflow: hidden; cursor: pointer; transition: box-shadow .15s, border-color .15s; }
.cp-content-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,.09); border-color: #CBD5E1; }
.cp-content-preview { height: 190px; background: #0f172a; position: relative; overflow: hidden; }
.cp-content-body { padding: 12px 14px 14px; }
.cp-preview-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 920px; max-height: 90vh; display: flex; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,.22); }
.cp-preview-left { flex: 0 0 56%; background: #0f172a; display: flex; align-items: center; justify-content: center; position: relative; min-height: 420px; }
.cp-preview-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.cp-preview-right-body { flex: 1; overflow-y: auto; padding: 18px 20px; }
.cp-preview-right-foot { padding: 14px 20px; border-top: 1px solid #F1F5F9; display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0; }
.cp-action-btn { flex: 1; padding: 10px 12px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; font-family: inherit; transition: all .12s; }
`;

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, bg: "#F1F5F9", color: "#64748B" };
  return <span className="cp-badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}

function ContentTypeBadge({ type }) {
  const m = CTYPE_META[type] || null;
  if (!m) return null;
  return <span className="cp-badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
}

/* ─── Approval Modal ─────────────────────────────────────────────────────── */
function ApprovalModal({ task, onClose, onDone }) {
  const [note, setNote]         = useState("");
  const [action, setAction]     = useState(null); // "approve" | "reject"
  const [loading, setLoading]   = useState(false);

  async function submit() {
    if (!action) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/client/tasks/${task._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const d = await r.json();
      if (d.success) onDone(d.task);
      else alert(d.message);
    } finally { setLoading(false); }
  }

  const brandColor = task.brandId?.color || "#5A57FB";

  return (
    <div className="cp-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cp-modal">
        <div className="cp-modal-head">
          <div style={{ width: 44, height: 44, borderRadius: 10, background: brandColor + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: brandColor }}>{task.contentType?.toUpperCase() || "TASK"}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div className="cp-modal-title">{task.nomenclature || task.title}</div>
            <div className="cp-modal-sub">Review this content and approve or request changes</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="cp-modal-body">
          {task.caption && (
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#374151", marginBottom: 14, lineHeight: 1.6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>CAPTION</div>
              {task.caption}
            </div>
          )}
          {task.referenceLink && (
            <div style={{ marginBottom: 14 }}>
              <a href={task.referenceLink} target="_blank" rel="noreferrer" style={{ color: "#5A57FB", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bi bi-link-45deg" /> View reference / proof
              </a>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setAction("approve")}
              style={{ flex: 1, padding: "10px", border: `2px solid ${action === "approve" ? "#16A34A" : "#E2E8F0"}`, borderRadius: 8, background: action === "approve" ? "#DCFCE7" : "#fff", color: action === "approve" ? "#15803D" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}>
              <i className="bi bi-check-circle" style={{ marginRight: 6 }} />Approve
            </button>
            <button onClick={() => setAction("reject")}
              style={{ flex: 1, padding: "10px", border: `2px solid ${action === "reject" ? "#DC2626" : "#E2E8F0"}`, borderRadius: 8, background: action === "reject" ? "#FEE2E2" : "#fff", color: action === "reject" ? "#DC2626" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}>
              <i className="bi bi-x-circle" style={{ marginRight: 6 }} />Request Changes
            </button>
          </div>
          <div className="cp-field">
            <label>{action === "reject" ? "Reason / feedback (required)" : "Note (optional)"}</label>
            <textarea className="cp-textarea" placeholder={action === "reject" ? "Describe what changes you'd like…" : "Add a note for the team…"} value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="cp-modal-foot">
          <button className="cp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cp-btn-primary" onClick={submit} disabled={!action || loading || (action === "reject" && !note.trim())}>
            {loading ? "Submitting…" : action === "approve" ? "Approve content" : "Send for revision"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Request Task (full-page form) ─────────────────────────────────────── */
const REQ_STATUS_META = {
  pending:      { label: "Verifying",    color: "#4F46E5", bg: "#EEF2FF" },
  in_scope:     { label: "In Scope",     color: "#15803D", bg: "#DCFCE7" },
  out_of_scope: { label: "Out of Scope", color: "#DC2626", bg: "#FEE2E2" },
};
const PRIORITY_COLORS = {
  low:    { color: "#16A34A", bg: "#DCFCE7" },
  medium: { color: "#B45309", bg: "#FEF3C7" },
  high:   { color: "#DC2626", bg: "#FEE2E2" },
  urgent: { color: "#7C3AED", bg: "#EDE9FE" },
};

function RequestTaskView({ brand, client, setView }) {
  const [form, setForm] = useState({
    title: "",
    contentType: brand?.services?.[0] || "socialMedia",
    brief: "",
    needBy: "",
    priority: "medium",
    referenceLinks: [""],
  });
  const [sent, setSent]     = useState(null); // the submitted request
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  function addLink() { setForm(p => ({ ...p, referenceLinks: [...p.referenceLinks, ""] })); }
  function setLink(i, v) {
    setForm(p => {
      const links = [...p.referenceLinks];
      links[i] = v;
      return { ...p, referenceLinks: links };
    });
  }
  function removeLink(i) {
    setForm(p => ({ ...p, referenceLinks: p.referenceLinks.filter((_, idx) => idx !== i) }));
  }

  async function submit() {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const r = await fetch("/api/client/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: brand?._id,
          title: form.title.trim(),
          contentType: form.contentType,
          brief: form.brief,
          needBy: form.needBy || null,
          priority: form.priority,
          referenceLinks: form.referenceLinks.filter(l => l.trim()),
        }),
      });
      const d = await r.json();
      if (d.success) setSent(d.request);
      else alert(d.message || "Failed to submit request");
    } finally { setLoading(false); }
  }

  if (sent) return (
    <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 32 }}>
      <div className="cp-card" style={{ textAlign: "center", padding: "56px 32px" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <i className="bi bi-check-lg" style={{ color: "#15803D", fontSize: 32 }} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Request Submitted!</div>
        <div style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
          Our team will review your request and let you know if it's in scope. You can track it under <strong>My Requests</strong>.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="cp-btn-ghost" onClick={() => setSent(null)}>Submit another</button>
          <button className="cp-btn-primary" onClick={() => setView("myrequests")}>
            <i className="bi bi-list-task me-2" />View My Requests
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Request a Task</div>
        <div style={{ fontSize: 14, color: "#64748b" }}>Tell us what you need — our team will review and scope it for you.</div>
      </div>

      <div className="cp-card">
        {/* Title */}
        <div className="cp-field">
          <label>Task Title *</label>
          <input
            className="cp-input"
            placeholder="e.g. New Instagram reel for product launch"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            style={{ borderColor: errors.title ? "#EF4444" : undefined }}
          />
          {errors.title && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{errors.title}</div>}
        </div>

        {/* Service + Priority row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div className="cp-field" style={{ marginBottom: 0 }}>
            <label>Service / Content Type</label>
            <select className="cp-input" value={form.contentType} onChange={e => setForm(p => ({ ...p, contentType: e.target.value }))}>
              {Object.entries(SERVICE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="cp-field" style={{ marginBottom: 0 }}>
            <label>Priority</label>
            <select className="cp-input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Need by date */}
        <div className="cp-field">
          <label>Need it by (optional)</label>
          <input
            type="date"
            className="cp-input"
            value={form.needBy}
            onChange={e => setForm(p => ({ ...p, needBy: e.target.value }))}
          />
        </div>

        {/* Brief */}
        <div className="cp-field">
          <label>Brief / Details</label>
          <textarea
            className="cp-textarea"
            rows={5}
            placeholder="Describe what you need — include style, tone, references, target audience, or any specific requirements…"
            value={form.brief}
            onChange={e => setForm(p => ({ ...p, brief: e.target.value }))}
          />
        </div>

        {/* Reference links */}
        <div className="cp-field" style={{ marginBottom: 0 }}>
          <label>Reference Links / Assets (optional)</label>
          {form.referenceLinks.map((link, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input
                className="cp-input"
                placeholder="https://…"
                value={link}
                onChange={e => setLink(i, e.target.value)}
                style={{ flex: 1 }}
              />
              {form.referenceLinks.length > 1 && (
                <button onClick={() => removeLink(i)}
                  style={{ flexShrink: 0, width: 36, height: 36, border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addLink}
            style={{ fontSize: 12, fontWeight: 600, color: "#5A57FB", background: "none", border: "none", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}>
            <i className="bi bi-plus-circle me-1" />Add another link
          </button>
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
        <button className="cp-btn-ghost" onClick={() => setView("overview")}>Cancel</button>
        <button className="cp-btn-primary" onClick={submit} disabled={!form.title.trim() || loading}>
          {loading ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </div>
  );
}

/* ─── My Requests view ───────────────────────────────────────────────────── */
/* ─── Request conversation thread (shared between client + admin) ─────────── */
function RequestThread({ requestId, apiBase, myRole }) {
  const [messages, setMessages] = useState([]);
  const [loaded,   setLoaded]   = useState(false);
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch(`${apiBase}/${requestId}/messages`)
      .then(r => r.json())
      .then(d => { if (d.success) setMessages(d.messages || []); })
      .finally(() => setLoaded(true));
  }, [requestId, apiBase]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`${apiBase}/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const d = await r.json();
      if (d.success) { setMessages(d.messages); setText(""); }
    } finally { setSending(false); }
  }

  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }

  if (!loaded) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
      <div className="cp-spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
    </div>
  );

  return (
    <div style={{ marginTop: 20 }}>
      {/* Thread header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".6px", whiteSpace: "nowrap" }}>
          <i className="bi bi-chat-dots me-1" />Conversation
        </span>
        <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0 12px", color: "#94a3b8", fontSize: 12 }}>
          No messages yet — start the conversation below
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {messages.map((msg, i) => {
            const isMe = msg.senderRole === myRole;
            return (
              <div key={i} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
                {/* Avatar */}
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", background: isMe ? "#5A57FB" : "#0f172a" }}>
                  {isMe ? "You" : "V"}
                </div>
                <div style={{ maxWidth: "72%" }}>
                  <div style={{
                    padding: "9px 12px",
                    borderRadius: isMe ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    background: isMe ? "#5A57FB" : "#F1F5F9",
                    color: isMe ? "#fff" : "#0f172a",
                    fontSize: 13, lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, textAlign: isMe ? "right" : "left" }}>
                    {msg.senderName && !isMe ? `${msg.senderName} · ` : ""}{fmtAgo(msg.sentAt)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          rows={2}
          placeholder="Type a message… (Enter to send)"
          style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit", resize: "none", lineHeight: 1.5 }}
        />
        <button onClick={send} disabled={!text.trim() || sending}
          style={{ flexShrink: 0, width: 40, height: 40, alignSelf: "flex-end", borderRadius: 10, border: "none", background: text.trim() ? "#5A57FB" : "#E2E8F0", color: text.trim() ? "#fff" : "#94a3b8", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "all .12s" }}>
          {sending ? <div className="cp-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#fff" }} /> : <i className="bi bi-send-fill" />}
        </button>
      </div>
    </div>
  );
}

function MyRequestsView({ brand, setView }) {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    if (!brand?.slug) return;
    fetch(`/api/client/requests?brandSlug=${brand.slug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setRequests(d.requests); })
      .finally(() => setLoading(false));
  }, [brand]);

  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>;

  const total      = requests.length;
  const pending    = requests.filter(r => r.status === "pending").length;
  const inScope    = requests.filter(r => r.status === "in_scope").length;
  const outScope   = requests.filter(r => r.status === "out_of_scope").length;

  const STATUS_BORDER = { pending: "#818CF8", in_scope: "#22C55E", out_of_scope: "#F43F5E" };
  const STATUS_ICON   = { pending: "bi-hourglass-split", in_scope: "bi-check-circle-fill", out_of_scope: "bi-x-circle-fill" };
  const PRIORITY_ICON = { low: "bi-arrow-down", medium: "bi-dash", high: "bi-arrow-up", urgent: "bi-lightning-fill" };

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.4px" }}>My Requests</div>
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { label: "Total",        val: total,   bg: "#F1F5F9", color: "#475569" },
              { label: "Under Review", val: pending, bg: "#EEF2FF", color: "#4F46E5" },
              { label: "In Scope",     val: inScope, bg: "#DCFCE7", color: "#15803D" },
              { label: "Out of Scope", val: outScope,bg: "#FFF1F2", color: "#BE123C" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: s.bg }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.val}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: .75 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setView("request")} style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "10px 20px", border: "none", borderRadius: 10,
          background: "linear-gradient(135deg,#5A57FB,#4845d4)", color: "#fff",
          fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 4px 14px rgba(90,87,251,.3)", whiteSpace: "nowrap",
          transition: "opacity .15s",
        }}>
          <i className="bi bi-plus-lg" /> New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <div style={{
          background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 16,
          padding: "72px 32px", textAlign: "center",
        }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#EEF2FF,#F5F3FF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <i className="bi bi-inbox" style={{ fontSize: 28, color: "#818CF8" }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", marginBottom: 6 }}>No requests yet</div>
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 24, lineHeight: 1.6, maxWidth: 300, margin: "0 auto 24px" }}>
            Tell us what you need — our team will review and scope it within 24 hours.
          </div>
          <button onClick={() => setView("request")} style={{
            padding: "10px 24px", border: "none", borderRadius: 10,
            background: "linear-gradient(135deg,#5A57FB,#4845d4)", color: "#fff",
            fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Submit your first request</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.map(req => {
            const sm      = REQ_STATUS_META[req.status] || REQ_STATUS_META.pending;
            const pm      = PRIORITY_COLORS[req.priority] || PRIORITY_COLORS.medium;
            const svcMeta = SERVICE_META[req.contentType];
            const borderC = STATUS_BORDER[req.status] || "#818CF8";
            return (
              <div key={req._id}
                onClick={() => setSelected(req)}
                style={{
                  background: "#fff",
                  border: "1px solid #E9EEF4",
                  borderLeft: `3px solid ${borderC}`,
                  borderRadius: 12,
                  padding: "16px 18px 16px 20px",
                  cursor: "pointer",
                  transition: "box-shadow .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}>

                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: "#0F172A", marginBottom: 7, lineHeight: 1.3 }}>
                      {req.title}
                    </div>
                    {/* Meta row — plain text tags, no icons */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {/* Status dot + label */}
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: sm.color }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.color, display: "inline-block", flexShrink: 0 }} />
                        {sm.label}
                      </span>
                      <span style={{ color: "#D1D5DB", fontSize: 12 }}>·</span>
                      {/* Priority — plain text */}
                      <span style={{ fontSize: 12, fontWeight: 600, color: pm.color, textTransform: "capitalize" }}>
                        {req.priority}
                      </span>
                      {svcMeta && <>
                        <span style={{ color: "#D1D5DB", fontSize: 12 }}>·</span>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{svcMeta.label}</span>
                      </>}
                    </div>
                  </div>
                  {/* Date */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 11.5, color: "#B0BAC9", fontWeight: 500 }}>{fmtDate(req.createdAt)}</span>
                    <i className="bi bi-chevron-right" style={{ fontSize: 11, color: "#D1D5DB" }} />
                  </div>
                </div>

                {/* Team remark — simple, no heavy styling */}
                {req.adminRemark && (
                  <div style={{
                    marginTop: 12,
                    paddingLeft: 12,
                    borderLeft: `2px solid ${borderC}50`,
                    fontSize: 12.5,
                    color: "#64748B",
                    lineHeight: 1.6,
                  }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 2 }}>Team</span>
                    {req.adminRemark}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.15)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{selected.title}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: REQ_STATUS_META[selected.status]?.bg, color: REQ_STATUS_META[selected.status]?.color }}>
                    {REQ_STATUS_META[selected.status]?.label}
                  </span>
                  {selected.priority && (
                    <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: PRIORITY_COLORS[selected.priority]?.bg, color: PRIORITY_COLORS[selected.priority]?.color }}>
                      {selected.priority}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
              {/* Meta row */}
              <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                {selected.contentType && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>Service</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{SERVICE_META[selected.contentType]?.label || selected.contentType}</div>
                  </div>
                )}
                {selected.needBy && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>Need By</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{fmtDate(selected.needBy)}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>Submitted</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{fmtDate(selected.createdAt)}</div>
                </div>
              </div>

              {selected.brief && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Brief</div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", border: "1px solid #E2E8F0", whiteSpace: "pre-wrap" }}>
                    {selected.brief}
                  </div>
                </div>
              )}

              {selected.referenceLinks?.filter(Boolean).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>References</div>
                  {selected.referenceLinks.filter(Boolean).map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noreferrer"
                      style={{ display: "block", fontSize: 12, color: "#5A57FB", fontWeight: 600, textDecoration: "none", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <i className="bi bi-link-45deg me-1" />{link}
                    </a>
                  ))}
                </div>
              )}

              {/* Team response banner */}
              {selected.adminRemark && (
                <div style={{ background: REQ_STATUS_META[selected.status]?.bg, border: `1.5px solid ${REQ_STATUS_META[selected.status]?.color}30`, borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Team Response</div>
                  <div style={{ fontSize: 13, color: REQ_STATUS_META[selected.status]?.color, lineHeight: 1.6, fontWeight: 500 }}>{selected.adminRemark}</div>
                  {selected.quoteAmount && (
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                      Quote: ₹{selected.quoteAmount.toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              )}

              {selected.status === "pending" && !selected.adminRemark && (
                <div style={{ background: "#EEF2FF", border: "1.5px solid #C7D2FE", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 4 }}>
                  <i className="bi bi-hourglass-split" style={{ color: "#4F46E5", fontSize: 15, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#3730A3" }}>Under Review</div>
                    <div style={{ fontSize: 12, color: "#4F46E5", marginTop: 2 }}>Our team is reviewing your request. We'll notify you once it's scoped.</div>
                  </div>
                </div>
              )}

              {/* Conversation thread — available once the team has reviewed */}
              {selected.status !== "pending" ? (
                <RequestThread
                  requestId={selected._id}
                  apiBase="/api/client/requests"
                  myRole="client"
                />
              ) : (
                <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>
                  <i className="bi bi-chat-dots me-1" />You can chat with the team once they've reviewed your request.
                </div>
              )}
            </div>

            <div style={{ padding: "12px 22px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
              <button className="cp-btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Offers hook ────────────────────────────────────────────────────────── */
function useOffers(brandSlug) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!brandSlug) return;
    fetch(`/api/client/offers?brandSlug=${brandSlug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setOffers(d.offers || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [brandSlug]);
  return { offers, loading };
}

/* ─── Overview view ──────────────────────────────────────────────────────── */
function OverviewView({ client, brand, overview, onRefresh, onApprove, setView }) {
  const [reviewModal, setReviewModal] = useState(null);
  const { stats = {}, pending = [], thisWeek = [], delivered = [] } = overview || {};
  const { offers } = useOffers(brand?.slug);

  const postedCount  = stats.posted    || 0;
  const totalContent = (brand?.monthlyDeliverables?.reels || 0) + (brand?.monthlyDeliverables?.posts || 0) + (brand?.monthlyDeliverables?.carousels || 0);

  function handleApprovalDone(updated) {
    setReviewModal(null);
    onRefresh();
  }

  const services = brand?.services || [];

  return (
    <div>
      {/* Hero */}
      <div className="cp-hero">
        <div className="cp-hero-greeting">{getGreeting()}, {client?.name?.split(" ")[0] || "there"}</div>
        <h1 className="cp-hero-title">Welcome back to <span>{brand?.name}</span></h1>
        <p className="cp-hero-sub">
          {services.length > 0
            ? `We're running ${services.length} service${services.length > 1 ? "s" : ""} for you this month — ${services.map(s => SERVICE_META[s]?.label || s).join(", ")}.`
            : "Your Viralon team is at work."
          }
          {pending.length > 0 && ` ${pending.length} piece${pending.length > 1 ? "s are" : " is"} waiting for your approval.`}
        </p>
        <div className="cp-hero-stats">
          <div className="cp-hero-stat">
            <div className="cp-hero-stat-val teal">{postedCount}</div>
            <div className="cp-hero-stat-label">Delivered</div>
          </div>
          <div className="cp-hero-stat">
            <div className="cp-hero-stat-val purple">{stats.inProgress || 0}</div>
            <div className="cp-hero-stat-label">In Progress</div>
          </div>
          <div className="cp-hero-stat">
            <div className="cp-hero-stat-val amber">{pending.length}</div>
            <div className="cp-hero-stat-label">Awaiting You</div>
          </div>
        </div>
      </div>

      {/* Offer / announcement banners */}
      {offers.length > 0 && (
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {offers.map(offer => {
            const tm = TAG_OFFER_META[offer.tag] || TAG_OFFER_META["Announcement"];
            return (
              <div key={offer._id} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden", display: "flex", alignItems: "center", gap: 0 }}>
                <div style={{ width: 5, alignSelf: "stretch", background: tm.color, flexShrink: 0 }} />
                <div style={{ width: 46, height: 46, borderRadius: 10, background: tm.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 14px", flexShrink: 0 }}>
                  <i className="bi bi-gift-fill" style={{ fontSize: 19, color: tm.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: "12px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                    <span style={{ padding: "1px 8px", background: tm.bg, color: tm.color, borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{offer.tag}</span>
                    {offer.validUntil && (
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        Until {new Date(offer.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{offer.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{offer.description}</div>
                </div>
                <div style={{ padding: "0 16px", flexShrink: 0, display: "flex", gap: 8, alignItems: "center" }}>
                  {offer.ctaText && offer.ctaUrl && (
                    <a href={offer.ctaUrl} target="_blank" rel="noreferrer"
                      style={{ padding: "7px 16px", background: tm.color, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                      {offer.ctaText}
                    </a>
                  )}
                  {offers.length > 1 && (
                    <button onClick={() => setView("offers")}
                      style={{ padding: "7px 12px", border: "1.5px solid #E2E8F0", background: "#F8FAFC", color: "#475569", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                      View all
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Service tiles */}
      {services.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
            Active services this month
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400, marginLeft: 8 }}>· {services.length} live for {brand?.name}</span>
          </div>
          <div className="cp-services-grid">
            {services.map(svc => {
              const m = SERVICE_META[svc];
              if (!m) return null;
              const kpi = svc === "socialMedia"
                ? `${postedCount}/${totalContent || "?"} posted`
                : "Active";
              const desc = svc === "socialMedia" && pending.length > 0
                ? `${pending.length} awaiting your approval`
                : m.label + " is active";
              return (
                <div key={svc} className="cp-svc-tile">
                  <div className="cp-svc-chip" style={{ background: m.bg, color: m.color }}>
                    <i className={`bi ${m.icon}`} />
                    {m.short}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>{m.label}</div>
                  <div className="cp-svc-kpi">{kpi}</div>
                  <div className="cp-svc-desc">{desc}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Awaiting approval + This week's slate */}
      <div className="cp-two-col">
        {/* Awaiting approval */}
        <div className="cp-card">
          <div className="cp-card-title">
            <i className="bi bi-clock-history" style={{ color: "#4F46E5" }} />
            Awaiting your approval
            {pending.length > 0 && <span style={{ marginLeft: 4, background: "#EEF2FF", color: "#4F46E5", borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{pending.length}</span>}
            <span className="cp-card-sub" style={{ marginLeft: 4 }}>Click any item to review</span>
            {pending.length > 0 && <button className="cp-view-all" onClick={() => {}}>View all</button>}
          </div>
          {pending.length === 0 ? (
            <div className="cp-empty-state">
              <i className="bi bi-check-circle" style={{ color: "#02EBAD" }} />
              <p>All caught up! No pending approvals.</p>
            </div>
          ) : (
            pending.slice(0, 4).map(task => {
              const bc = task.brandId?.color || "#5A57FB";
              return (
                <div key={task._id} className="cp-approval-item">
                  <div className="cp-approval-thumb" style={{ background: bc + "20", color: bc }}>
                    {task.contentType?.toUpperCase()?.slice(0,4) || "TASK"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cp-approval-title">{task.nomenclature || task.title}</div>
                    <div className="cp-approval-meta">
                      <ContentTypeBadge type={task.contentType} />
                      {task.assignedTo?.personal?.firstName && (
                        <span>{task.assignedTo.personal.firstName} submitted {fmtAgo(task.updatedAt)}</span>
                      )}
                    </div>
                    {task.caption && (
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}>
                        {task.caption}
                      </div>
                    )}
                    <div className="cp-approval-actions">
                      <button className="cp-btn-approve" onClick={() => setReviewModal(task)}>
                        <i className="bi bi-check2" /> Review & Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* This week's slate */}
        <div className="cp-card">
          <div className="cp-card-title">
            <i className="bi bi-calendar-week" style={{ color: "#5A57FB" }} />
            This week's slate
            <span className="cp-card-sub" style={{ marginLeft: 4 }}>· {thisWeek.length} in production</span>
          </div>
          {thisWeek.length === 0 ? (
            <div className="cp-empty-state">
              <i className="bi bi-calendar3" />
              <p>Nothing scheduled this week.</p>
            </div>
          ) : (
            thisWeek.slice(0, 6).map(task => {
              const bc = task.brandId?.color || "#5A57FB";
              return (
                <div key={task._id} className="cp-slate-item">
                  <div className="cp-slate-dot" style={{ background: bc + "20", color: bc }}>
                    {task.contentType?.toUpperCase()?.slice(0, 3) || "TSK"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cp-slate-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {task.nomenclature || task.title}
                    </div>
                    <div className="cp-slate-date">{task.contentType && <ContentTypeBadge type={task.contentType} />} {fmtShort(task.dueDate)}</div>
                  </div>
                  <div className="cp-slate-status"><StatusBadge status={task.status} /></div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Latest delivered */}
      {delivered.length > 0 && (
        <div className="cp-card">
          <div className="cp-card-title">
            <i className="bi bi-check2-all" style={{ color: "#02EBAD" }} />
            Latest delivered · this month
          </div>
          <div className="cp-delivered-grid">
            {delivered.map(task => {
              const bc = task.brandId?.color || "#5A57FB";
              return (
                <div key={task._id} className="cp-del-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <ContentTypeBadge type={task.contentType} />
                  </div>
                  <div className="cp-del-name">{task.nomenclature || task.title}</div>
                  <div className="cp-del-meta">{fmtDate(task.postedAt)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approval modal */}
      {reviewModal && (
        <ApprovalModal task={reviewModal} onClose={() => setReviewModal(null)} onDone={handleApprovalDone} />
      )}
    </div>
  );
}

/* ─── Drive preview helpers ──────────────────────────────────────────────── */
function getDriveFileId(url) {
  if (!url) return null;
  let m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return null;
}
function getDriveFolderId(url) {
  if (!url) return null;
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
function isDriveFolder(url) { return !!getDriveFolderId(url); }
function getDriveEmbedUrl(url) {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}
function getTaskProofUrl(task) {
  const stageUrls = (task.stages || []).flatMap(s => s.proofUrls || []).filter(Boolean);
  return stageUrls[stageUrls.length - 1] || task.referenceLink || null;
}

/* ─── Drive folder carousel ──────────────────────────────────────────────── */
function DriveCarousel({ folderId, proofUrl }) {
  const [files,   setFiles]   = useState(null); // null = loading
  const [idx,     setIdx]     = useState(0);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    fetch(`/api/client/drive-folder?folderId=${folderId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setError(d.message || "Failed to load"); return; }
        if (d.fallback || d.files.length === 0) { setFiles([]); return; }
        setFiles(d.files);
      })
      .catch(() => setError("Network error"));
  }, [folderId]);

  // Loading
  if (files === null) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#94a3b8" }}>
      <div className="spinner-border spinner-border-sm text-primary" />
      <span style={{ fontSize: 12 }}>Loading images…</span>
    </div>
  );

  // Fallback: no API key or empty folder — embed the folder view
  if (error || files.length === 0) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <iframe
        src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`}
        style={{ flex: 1, border: "none", width: "100%" }}
        title="Drive folder"
      />
      {error && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.7)", color: "#fca5a5", fontSize: 11, padding: "6px 12px", textAlign: "center" }}>
          {error} — showing folder view
        </div>
      )}
      <a href={proofUrl} target="_blank" rel="noreferrer"
        style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, padding: "4px 10px", borderRadius: 6, textDecoration: "none", zIndex: 2 }}>
        Open folder ↗
      </a>
    </div>
  );

  const file = files[idx];
  const embedUrl = `https://drive.google.com/file/d/${file.id}/preview`;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Main preview */}
      <div style={{ flex: 1, position: "relative", background: "#0f172a" }}>
        <iframe
          key={file.id}
          src={embedUrl}
          style={{ width: "100%", height: "100%", border: "none", position: "absolute", inset: 0 }}
          allow="autoplay"
          allowFullScreen
          title={file.name}
        />
        {/* Prev / Next arrows */}
        {files.length > 1 && (<>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,.55)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.3 : 1, zIndex: 3 }}>
            <i className="bi bi-chevron-left" />
          </button>
          <button onClick={() => setIdx(i => Math.min(files.length - 1, i + 1))} disabled={idx === files.length - 1}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,.55)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === files.length - 1 ? 0.3 : 1, zIndex: 3 }}>
            <i className="bi bi-chevron-right" />
          </button>
          {/* Counter */}
          <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, zIndex: 3 }}>
            {idx + 1} / {files.length}
          </div>
        </>)}
      </div>
      {/* Thumbnail strip */}
      {files.length > 1 && (
        <div style={{ display: "flex", gap: 4, padding: "6px 8px", background: "#0f172a", overflowX: "auto", flexShrink: 0 }}>
          {files.map((f, i) => (
            <button key={f.id} onClick={() => setIdx(i)}
              style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 6, border: i === idx ? "2px solid #5A57FB" : "2px solid transparent", background: "#1e293b", cursor: "pointer", overflow: "hidden", padding: 0, position: "relative" }}>
              {f.thumbnailLink ? (
                <img src={f.thumbnailLink} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: i === idx ? "#5A57FB" : "#64748b", fontSize: 16 }}>
                  <i className="bi bi-image" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {/* Open folder link */}
      <a href={proofUrl} target="_blank" rel="noreferrer"
        style={{ display: "block", textAlign: "center", background: "#1e293b", color: "#94a3b8", fontSize: 11, padding: "5px 0", textDecoration: "none", flexShrink: 0 }}>
        <i className="bi bi-folder2-open me-1" />Open folder in Drive
      </a>
    </div>
  );
}

/* ─── Content card (approval grid) ──────────────────────────────────────── */
function ContentCard({ task, onOpen }) {
  const bc           = task.brandId?.color || "#5A57FB";
  const proofUrl     = getTaskProofUrl(task);
  const folderId     = getDriveFolderId(proofUrl);
  const embedUrl     = folderId ? null : getDriveEmbedUrl(proofUrl);
  const isVideo      = ["reel", "story"].includes(task.contentType);
  const approved     = task.status === "completed" && task.postedAt;
  const feedbackSent = task.status === "todo" && task.reviewNote && task.reviewNote.trim();

  return (
    <div className="cp-content-card" onClick={onOpen}>
      {/* Preview */}
      <div className="cp-content-preview">
        {folderId ? (
          /* Folder — show embedded grid view (no API key needed for public folders) */
          <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
            <iframe
              src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`}
              style={{ width: "180%", height: "180%", border: "none", pointerEvents: "none", transformOrigin: "top left", transform: "scale(0.56)", position: "absolute", top: 0, left: 0 }}
              title={task.nomenclature || task.title}
            />
            {/* Carousel badge */}
            <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,.65)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4, zIndex: 2 }}>
              <i className="bi bi-images" style={{ fontSize: 11 }} /> Carousel
            </div>
          </div>
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }}
            title={task.nomenclature || task.title}
          />
        ) : (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#475569" }}>
            <i className={`bi bi-${isVideo ? "camera-video" : "image"}`} style={{ fontSize: 36 }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>{proofUrl ? "Preview unavailable" : "No file attached"}</span>
          </div>
        )}
        {/* Type chip */}
        <div style={{ position: "absolute", top: 8, left: 8, background: bc, color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>
          {task.contentType?.toUpperCase() || "TASK"}
        </div>
        {/* Status chip */}
        {approved ? (
          <div style={{ position: "absolute", top: 8, right: 8, background: "#DCFCE7", color: "#15803D", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
            <i className="bi bi-check2 me-1" />Approved
          </div>
        ) : feedbackSent ? (
          <div style={{ position: "absolute", top: 8, right: 8, background: "#EEF2FF", color: "#4F46E5", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
            <i className="bi bi-chat-left-text me-1" />Feedback Sent
          </div>
        ) : (
          <div style={{ position: "absolute", top: 8, right: 8, background: "#EEF2FF", color: "#4F46E5", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
            Awaiting You
          </div>
        )}
        {/* Play button overlay for video */}
        {isVideo && embedUrl && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,.88)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 14px rgba(0,0,0,.25)" }}>
              <i className="bi bi-play-fill" style={{ color: "#0f172a", fontSize: 20, marginLeft: 3 }} />
            </div>
          </div>
        )}
        {/* Click to expand overlay for folder */}
        {folderId && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.15)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 14px rgba(0,0,0,.2)" }}>
              <i className="bi bi-arrows-angle-expand" style={{ color: "#374151", fontSize: 18 }} />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="cp-content-body">
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {task.nomenclature || task.title}
        </div>
        {task.caption && (
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 8 }}>
            {task.caption}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(task.updatedAt || task.createdAt)}</span>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
            background: approved ? "#DCFCE7" : bc + "15",
            color: approved ? "#15803D" : bc,
          }}>
            {approved ? "View" : "Review"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Full-screen content preview + approve/feedback modal ───────────────── */
function ContentPreviewModal({ task, onClose, onDone }) {
  const [action, setAction]         = useState(null); // "approve" | "feedback"
  const [note, setNote]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bc        = task.brandId?.color || "#5A57FB";
  const proofUrl     = getTaskProofUrl(task);
  const folderId     = getDriveFolderId(proofUrl);
  const embedUrl     = folderId ? null : getDriveEmbedUrl(proofUrl);
  const isVideo      = ["reel", "story"].includes(task.contentType);
  const approved     = task.status === "completed" && task.postedAt;
  const feedbackSent = task.status === "todo" && task.reviewNote && task.reviewNote.trim();
  const isPending    = !approved && !feedbackSent;

  async function submit() {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/client/tasks/${task._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const d = await r.json();
      if (d.success) onDone();
      else alert(d.message || "Something went wrong");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="cp-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cp-preview-modal">
        {/* Left: Drive preview — folder carousel OR single file */}
        <div className="cp-preview-left" style={{ padding: 0, overflow: "hidden" }}>
          {folderId ? (
            <DriveCarousel folderId={folderId} proofUrl={proofUrl} />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              style={{ width: "100%", height: "100%", border: "none", position: "absolute", inset: 0 }}
              allow="autoplay; fullscreen"
              allowFullScreen
              title={task.nomenclature || task.title}
            />
          ) : (
            <div style={{ textAlign: "center", color: "#64748b", padding: 32 }}>
              <i className={`bi bi-${isVideo ? "camera-video" : "image"}`} style={{ fontSize: 52, marginBottom: 14, display: "block", opacity: .4 }} />
              <div style={{ fontSize: 13, marginBottom: 8 }}>No preview available</div>
              {proofUrl && (
                <a href={proofUrl} target="_blank" rel="noreferrer"
                  style={{ color: "#5A57FB", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  <i className="bi bi-box-arrow-up-right me-1" />Open file
                </a>
              )}
            </div>
          )}
          {/* Type badge (only for non-folder — folder already shows its own controls) */}
          {!folderId && (
            <div style={{ position: "absolute", top: 12, left: 12, background: bc, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 5, zIndex: 2 }}>
              {task.contentType?.toUpperCase() || "TASK"}
            </div>
          )}
          {/* Drive link for single files */}
          {!folderId && proofUrl && (
            <a href={proofUrl} target="_blank" rel="noreferrer"
              style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.12)", backdropFilter: "blur(6px)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6, textDecoration: "none", border: "1px solid rgba(255,255,255,.2)", zIndex: 2, display: "flex", alignItems: "center", gap: 5 }}>
              <i className="bi bi-google" />Open in Drive
            </a>
          )}
        </div>

        {/* Right: Info + actions */}
        <div className="cp-preview-right">
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{task.nomenclature || task.title}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                {task.scheduledFor ? `Scheduled: ${fmtDate(task.scheduledFor)}` : `Submitted: ${fmtDate(task.updatedAt || task.createdAt)}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, padding: "0 4px", flexShrink: 0 }}>
              <i className="bi bi-x-lg" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="cp-preview-right-body">
            {/* Caption */}
            {task.caption && (
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#374151", marginBottom: 14, lineHeight: 1.7 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Caption</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{task.caption}</div>
              </div>
            )}
            {/* Pillar */}
            {task.pillar && (
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
                <i className="bi bi-tag" style={{ color: "#94a3b8" }} />
                Content pillar: <strong style={{ color: "#374151" }}>{task.pillar}</strong>
              </div>
            )}
            {/* Drive link button */}
            {proofUrl && (
              <a href={proofUrl} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, color: "#3B82F6", fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 18, background: "#EFF6FF", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #BFDBFE" }}>
                <i className="bi bi-google" style={{ fontSize: 14 }} />Open in Google Drive
                <i className="bi bi-box-arrow-up-right" style={{ marginLeft: "auto", fontSize: 11 }} />
              </a>
            )}

            {/* Action buttons — only when truly pending */}
            {isPending && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>
                  Your decision
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <button className="cp-action-btn" onClick={() => setAction("approve")}
                    style={{ border: `2px solid ${action === "approve" ? "#16A34A" : "#E2E8F0"}`, background: action === "approve" ? "#DCFCE7" : "#fff", color: action === "approve" ? "#15803D" : "#64748b" }}>
                    <i className="bi bi-check-circle me-2" />Approve
                  </button>
                  <button className="cp-action-btn" onClick={() => setAction("feedback")}
                    style={{ border: `2px solid ${action === "feedback" ? "#5A57FB" : "#E2E8F0"}`, background: action === "feedback" ? "#EEF2FF" : "#fff", color: action === "feedback" ? "#4F46E5" : "#64748b" }}>
                    <i className="bi bi-chat-left-text me-2" />Give Feedback
                  </button>
                </div>
                {action && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      {action === "approve" ? "Add a note (optional)" : "Your feedback for the team *"}
                    </div>
                    <textarea className="cp-textarea" value={note} onChange={e => setNote(e.target.value)}
                      rows={3}
                      placeholder={action === "approve" ? "Looks great! Post it…" : "Please change the colour to blue, add the logo on top…"} />
                  </div>
                )}
              </>
            )}

            {/* Approved state */}
            {approved && (
              <div style={{ background: "#DCFCE7", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <i className="bi bi-check-circle-fill" style={{ color: "#16A34A", fontSize: 18, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>Approved by you</div>
                  {task.reviewNote && <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>{task.reviewNote}</div>}
                </div>
              </div>
            )}

            {/* Feedback sent state */}
            {feedbackSent && (
              <div style={{ background: "#EEF2FF", border: "1.5px solid #C7D2FE", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <i className="bi bi-chat-left-text-fill" style={{ color: "#4F46E5", fontSize: 18, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3730A3" }}>Feedback sent to team</div>
                  <div style={{ fontSize: 12, color: "#4F46E5", marginTop: 6, background: "#E0E7FF", borderRadius: 6, padding: "8px 10px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {task.reviewNote}
                  </div>
                  <div style={{ fontSize: 11, color: "#6366F1", marginTop: 6 }}>The team is working on your feedback. You'll see the updated version here once it's ready.</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!approved && (
            <div className="cp-preview-right-foot">
              <button className="cp-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="cp-btn-primary"
                onClick={submit}
                disabled={!action || submitting || (action === "feedback" && !note.trim())}
                style={{ background: action === "approve" ? "linear-gradient(135deg,#16A34A,#15803D)" : undefined }}>
                {submitting ? "Submitting…" : action === "approve" ? "Approve Content" : "Send Feedback"}
              </button>
            </div>
          )}
          {(approved || feedbackSent) && (
            <div className="cp-preview-right-foot">
              <button className="cp-btn-ghost" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Approvals view ─────────────────────────────────────────────────────── */
function ApprovalsView({ overview, onRefresh }) {
  const { pending = [], allTasks = [] } = overview || {};
  const [tab,        setTab]        = useState("pending");
  const [dateFilter, setDateFilter] = useState("all");
  const [preview,    setPreview]    = useState(null);

  // Reviewed = client approved (postedAt set) OR client gave feedback (todo + reviewNote)
  const reviewed = allTasks.filter(t =>
    (t.status === "completed" && t.postedAt) ||
    (t.status === "todo" && t.reviewNote && t.reviewNote.trim())
  );

  function applyDateFilter(tasks) {
    if (dateFilter === "all") return tasks;
    const now = new Date();
    return tasks.filter(t => {
      const d = new Date(t.updatedAt || t.createdAt);
      if (dateFilter === "today") return d.toDateString() === now.toDateString();
      if (dateFilter === "week")  { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
      if (dateFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }

  const shown = applyDateFilter(tab === "pending" ? pending : reviewed);

  return (
    <div>
      {/* Header row: tabs + date filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="cp-tabs" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
          <button className={`cp-tab ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>
            Awaiting Approval{pending.length > 0 ? ` (${pending.length})` : ""}
          </button>
          <button className={`cp-tab ${tab === "reviewed" ? "active" : ""}`} onClick={() => setTab("reviewed")}>
            Reviewed
          </button>
        </div>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#374151", background: "#fff", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">This month</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="cp-card" style={{ textAlign: "center", padding: "52px 24px" }}>
          <i className="bi bi-inbox" style={{ fontSize: 40, color: "#94a3b8", marginBottom: 14, display: "block" }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
            {tab === "pending" ? "Nothing awaiting your approval" : "No reviewed items yet"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            {tab === "pending" ? "Content ready for your review will appear here" : "Items you've approved will show here"}
          </div>
        </div>
      ) : (
        <div className="cp-content-grid">
          {shown.map(task => (
            <ContentCard key={task._id} task={task} onOpen={() => setPreview(task)} />
          ))}
        </div>
      )}

      {preview && (
        <ContentPreviewModal
          task={preview}
          onClose={() => setPreview(null)}
          onDone={() => { setPreview(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

/* ─── Content calendar view ──────────────────────────────────────────────── */
// S1=orange, S2=blue, S3=yellow, S4=green — matches admin list/weekly/calendar
const CAL_STAGE_FILL = ["#F97316", "#3B82F6", "#EAB308", "#22C55E"];
function getCalStageStyle(task) {
  const stages = task?.stages || [];
  const hasAssignee = s => Array.isArray(s?.assignedTo) ? s.assignedTo.length > 0 : !!s?.assignedTo;
  for (let i = 3; i >= 0; i--) { if (stages[i]?.approved) { const c = CAL_STAGE_FILL[i]; return { bg: c, border: c, color: "#fff" }; } }
  for (let i = 3; i >= 0; i--) { if (hasAssignee(stages[i]) && !stages[i]?.approved) { const c = CAL_STAGE_FILL[i]; return { bg: "#fff", border: c, color: "#1E293B" }; } }
  return { bg: "#F1F5F9", border: "#D1D5DB", color: "#9CA3AF" };
}

function CalendarView({ overview, brand }) {
  const { allTasks = [] } = overview || {};
  const content = allTasks.filter(t => t.taskType === "production" || t.contentType);

  const todayReal = new Date();
  const [year,  setYear]  = useState(todayReal.getFullYear());
  const [month, setMonth] = useState(todayReal.getMonth());
  const [selTask, setSelTask] = useState(null);

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_NAMES   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const daysInMo  = new Date(year, month + 1, 0).getDate();
  const startOfMo = new Date(year, month, 1);
  const startDow  = (startOfMo.getDay() + 6) % 7; // Mon=0

  const weeklySchedule = brand?.weeklySchedule || [];

  function clientMonthSlotIndex(dayNum, contentType) {
    const SUN_TO_SAT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const target = new Date(year, month, dayNum);
    const start  = new Date(year, month, 1);
    let count = 0;
    const cur = new Date(start);
    while (cur <= target) {
      count += weeklySchedule.filter(s => s.day === SUN_TO_SAT[cur.getDay()] && s.contentType === contentType).length;
      cur.setDate(cur.getDate() + 1);
    }
    return count - 1;
  }

  const _tasksByDay = (() => {
    const result = {};
    const SUN_TO_SAT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    // Group by contentType AND month so June tasks never appear in July
    const taskGroups = {};
    content.forEach(t => {
      const d = t.dueDate ? new Date(t.dueDate) : t.scheduledFor ? new Date(t.scheduledFor) : t.createdAt ? new Date(t.createdAt) : null;
      if (!d) return;
      // Only include tasks belonging to the viewed month
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const ct = t.contentType || "__unknown";
      if (!taskGroups[ct]) taskGroups[ct] = [];
      taskGroups[ct].push(t);
    });
    Object.values(taskGroups).forEach(arr => arr.sort((a, b) => (a.taskId || "").localeCompare(b.taskId || "")));
    // Assign to days via schedule
    const CLIENT_DLVR_KEY = { reel: "reels", post: "posts", carousel: "carousels", story: "stories" };
    const monthlyDlvr = brand?.monthlyDeliverables || {};
    for (let day = 1; day <= daysInMo; day++) {
      const dayLabel = SUN_TO_SAT[new Date(year, month, day).getDay()];
      weeklySchedule.filter(s => s.day === dayLabel).forEach(slot => {
        const ct = slot.contentType;
        const ctTasks = taskGroups[ct];
        if (!ctTasks || !ctTasks.length) return;
        const idx = clientMonthSlotIndex(day, ct);
        if (idx < 0 || idx >= ctTasks.length) return;
        // Respect monthly deliverable cap
        const dlvrKey = CLIENT_DLVR_KEY[ct];
        if (dlvrKey) {
          const limit = monthlyDlvr[dlvrKey];
          if (limit != null && idx >= limit) return;
        }
        if (!result[day]) result[day] = [];
        result[day].push(ctTasks[idx]);
      });
    }
    return result;
  })();

  function tasksByDay(day) {
    return _tasksByDay[day] || [];
  }

  function prevMonth() { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); }

  const totalCells = Math.ceil((startDow + daysInMo) / 7) * 7;
  const CTYPE_COLOR2 = { reel:"#E11D48", post:"#1D4ED8", carousel:"#8B5CF6", story:"#059669" };

  return (
    <div>
      {/* Header */}
      <div className="cp-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={prevMonth} style={{ border: "1.5px solid #E2E8F0", background: "#fff", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              <i className="bi bi-chevron-left" />
            </button>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{MONTH_NAMES[month]} {year}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{Object.values(_tasksByDay).reduce((n, arr) => n + arr.length, 0)} content pieces</div>
            </div>
            <button onClick={nextMonth} style={{ border: "1.5px solid #E2E8F0", background: "#fff", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              <i className="bi bi-chevron-right" />
            </button>
            <button onClick={() => { setYear(todayReal.getFullYear()); setMonth(todayReal.getMonth()); }}
              style={{ border: "1.5px solid #E2E8F0", background: "#F8FAFC", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>
              Today
            </button>
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {[
              ["#F97316", "Script"],
              ["#3B82F6", "Shoot"],
              ["#EAB308", "Edit"],
              ["#22C55E", "Posted"],
            ].flatMap(([c, l]) => [
              <span key={l+"a"} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
                <span style={{ width:16, height:10, borderRadius:2, background:"#fff", border:`1.5px solid ${c}`, display:"inline-block" }} />{l}
              </span>,
              <span key={l+"d"} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
                <span style={{ width:16, height:10, borderRadius:2, background:c, border:`1.5px solid ${c}`, display:"inline-block" }} />{l} ✓
              </span>,
            ])}
            <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, color:"#64748b" }}>
              <span style={{ width:16, height:10, borderRadius:2, background:"#F8FAFC", border:"1px dashed #D1D5DB", display:"inline-block" }} />Scheduled
            </span>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="cp-card">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {(() => {
            const CAL_CT = { reel:{ label:"Reel", icon:"bi-camera-video-fill" }, post:{ label:"Post", icon:"bi-image-fill" }, carousel:{ label:"Carousel", icon:"bi-images" }, story:{ label:"Story", icon:"bi-phone-fill" } };
            const CAL_DLVR = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
            const CAL_MON  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const calMonLbl = `${CAL_MON[month]}'${String(year).slice(2)}`;
            const SUN_TO_SAT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            return Array.from({ length: totalCells }, (_, i) => {
              const dayNum  = i - startDow + 1;
              const valid   = dayNum >= 1 && dayNum <= daysInMo;
              const isToday = valid && year === todayReal.getFullYear() && month === todayReal.getMonth() && dayNum === todayReal.getDate();
              const dayTs   = valid ? tasksByDay(dayNum) : [];

              // Planned/unfilled slots for this day
              let unfilledSlots = [];
              if (valid) {
                const dayLabel = SUN_TO_SAT[new Date(year, month, dayNum).getDay()];
                const scheduled = weeklySchedule.filter(s => s.day === dayLabel);
                const rem = {};
                dayTs.forEach(t => { rem[t.contentType] = (rem[t.contentType] || 0) + 1; });
                unfilledSlots = scheduled.reduce((acc, slot) => {
                  const ct = slot.contentType;
                  const slotIdx = clientMonthSlotIndex(dayNum, ct);
                  const dlvrKey = CAL_DLVR[ct];
                  if (dlvrKey) {
                    const limit = brand?.monthlyDeliverables?.[dlvrKey];
                    if (limit != null && slotIdx >= limit) return acc;
                  }
                  if ((rem[ct] || 0) > 0) { rem[ct]--; return acc; }
                  acc.push({ ...slot, slotIdx });
                  return acc;
                }, []);
              }

              return (
                <div key={i} style={{ minHeight: 80, border: `1px solid ${isToday ? "#5A57FB" : "#E2E8F0"}`, borderRadius: 8, padding: 4, background: isToday ? "#F0F0FF" : valid ? "#fff" : "#FAFAFA" }}>
                  {valid && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 500, color: isToday ? "#5A57FB" : "#94a3b8", marginBottom: 3 }}>{dayNum}</div>
                      {dayTs.map(t => {
                        const ct  = CAL_CT[t.contentType] || {};
                        const sty = getCalStageStyle(t);
                        const nom = t.nomenclature || t.title || "";
                        const ctL = (t.contentType || "").toLowerCase();
                        let sfx = nom.toLowerCase().startsWith(ctL) ? nom.slice(ctL.length).trim() : nom;
                        sfx = sfx.replace(/\b[a-z]/g, c => c.toUpperCase());
                        const lbl = sfx ? `${ct.label||t.contentType} ${sfx}` : (ct.label||nom);
                        return (
                          <div key={t._id} onClick={() => setSelTask(t)} title={nom}
                            style={{ fontSize: 9, background: sty.bg, color: sty.color, border: `1.5px solid ${sty.border}`, borderRadius: 4, padding: "2px 5px", marginBottom: 2, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", display:"flex", alignItems:"center", gap:3 }}>
                            {ct.icon && <i className={`bi ${ct.icon}`} style={{ fontSize:8, flexShrink:0 }} />}{lbl}
                          </div>
                        );
                      })}
                      {unfilledSlots.map((slot, si) => {
                        const ct = CAL_CT[slot.contentType] || {};
                        return (
                          <div key={`ps${si}`}
                            style={{ fontSize: 9, background: "#F8FAFC", color: "#94A3B8", border: "1px dashed #D1D5DB", borderRadius: 4, padding: "2px 5px", marginBottom: 2, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display:"flex", alignItems:"center", gap:3 }}>
                            {ct.icon && <i className={`bi ${ct.icon}`} style={{ fontSize:8, flexShrink:0 }} />}
                            {`${ct.label||slot.contentType} ${slot.slotIdx+1} ${calMonLbl}`}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Task detail modal */}
      {selTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => e.target === e.currentTarget && setSelTask(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.18)" }}>
            {/* Modal header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                  {selTask.contentType && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: (CTYPE_COLOR2[selTask.contentType] || "#5A57FB") + "20", color: CTYPE_COLOR2[selTask.contentType] || "#5A57FB" }}>
                      {selTask.contentType.toUpperCase()}
                    </span>
                  )}
                  {selTask.brandId && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: (selTask.brandId.color || "#5A57FB") + "20", color: selTask.brandId.color || "#5A57FB" }}>
                      {selTask.brandId.name}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{selTask.nomenclature || selTask.title}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                  {selTask.scheduledFor ? `Scheduled: ${fmtDate(selTask.scheduledFor)}` : selTask.dueDate ? `Due: ${fmtDate(selTask.dueDate)}` : ""}
                </div>
              </div>
              <button onClick={() => setSelTask(null)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            {/* Modal body */}
            <div style={{ padding: "16px 20px" }}>
              {selTask.pillar && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Content Pillar</div>
                  <div style={{ fontSize: 13, color: "#4F46E5", fontWeight: 600, background: "#EEF2FF", borderRadius: 8, padding: "7px 12px" }}>{selTask.pillar}</div>
                </div>
              )}
              {selTask.description && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Script / Concept</div>
                  <div style={{ fontSize: 13, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto", border: "1px solid #E2E8F0" }}>
                    {selTask.description}
                  </div>
                </div>
              )}
              {selTask.caption && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Caption</div>
                  <div style={{ fontSize: 13, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto", border: "1px solid #E2E8F0" }}>
                    {selTask.caption}
                  </div>
                </div>
              )}
              {selTask.tags?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Hashtags</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {selTask.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "#F1F5F9", color: "#475569", fontWeight: 600 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {selTask.referenceLink && (
                <a href={selTask.referenceLink} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 8, color: "#5A57FB", fontSize: 13, fontWeight: 600, textDecoration: "none", background: "#EEF2FF", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #C7D2FE" }}>
                  <i className="bi bi-link-45deg" />Reference Link
                  <i className="bi bi-box-arrow-up-right" style={{ marginLeft: "auto", fontSize: 11 }} />
                </a>
              )}
              {!selTask.description && !selTask.caption && !selTask.pillar && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                  <i className="bi bi-file-text" style={{ fontSize: 36, display: "block", marginBottom: 8 }} />
                  Script not yet written
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── All Tasks view ─────────────────────────────────────────────────────── */
function AllTasksView({ overview }) {
  const { allTasks = [] } = overview || {};
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("");

  const filtered = allTasks.filter(t => {
    if (statusF && t.status !== statusF) return false;
    if (search) {
      const s = search.toLowerCase();
      return (t.nomenclature || t.title || "").toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input className="cp-input" style={{ flex: 1 }} placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="cp-input" style={{ width: 160 }} value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All status</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="cp-tasks-list">
        {filtered.length === 0 ? (
          <div className="cp-card"><div className="cp-empty-state"><i className="bi bi-inbox" /><p>No tasks found.</p></div></div>
        ) : filtered.map(task => {
          const bc = task.brandId?.color || "#5A57FB";
          return (
            <div key={task._id} className="cp-task-row">
              <div style={{ width: 40, height: 40, borderRadius: 9, background: bc + "20", color: bc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {task.contentType?.toUpperCase()?.slice(0, 4) || "TSK"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>{task.nomenclature || task.title}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                  <ContentTypeBadge type={task.contentType} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Due {fmtDate(task.dueDate)}</span>
                </div>
              </div>
              <StatusBadge status={task.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Offers view ────────────────────────────────────────────────────────── */
function OffersView({ brandSlug }) {
  const { offers, loading } = useOffers(brandSlug);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div className="cp-spinner" />
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="cp-card" style={{ textAlign: "center", padding: "64px 24px" }}>
        <i className="bi bi-gift" style={{ fontSize: 44, color: "#CBD5E1", display: "block", marginBottom: 14 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>No active offers right now</div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Check back soon — special offers and announcements will appear here</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {offers.map(offer => {
        const tm = TAG_OFFER_META[offer.tag] || TAG_OFFER_META["Announcement"];
        return (
          <div key={offer._id} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 16, overflow: "hidden", display: "flex" }}>
            <div style={{ width: 6, background: tm.color, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 12px", background: tm.bg, color: tm.color, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{offer.tag}</span>
                {offer.validUntil && (
                  <span style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="bi bi-clock" style={{ fontSize: 11 }} />
                    Offer ends {new Date(offer.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8, lineHeight: 1.3 }}>{offer.title}</div>
              <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.75, marginBottom: offer.ctaText ? 16 : 0 }}>{offer.description}</div>
              {offer.ctaText && offer.ctaUrl && (
                <a href={offer.ctaUrl} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px", background: tm.color, color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  {offer.ctaText}
                  <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }} />
                </a>
              )}
              {offer.ctaText && !offer.ctaUrl && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px", background: tm.bg, color: tm.color, borderRadius: 9, fontSize: 13, fontWeight: 700 }}>
                  {offer.ctaText}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmtNum(n) {
  if (n === null || n === undefined || n === 0) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(n);
}
function fmtNumZero(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(n);
}

/* ─── SVG Line Chart ─────────────────────────────────────────────────────── */
function MiniLineChart({ data, color = "#5A57FB", gradId = "lgDefault", height = 100 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>Collecting data — sync again after 24h</span>
      </div>
    );
  }
  const W = 500, H = height;
  const PAD = { t: 8, r: 12, b: 22, l: 40 };
  const iW  = W - PAD.l - PAD.r;
  const iH  = H - PAD.t - PAD.b;
  const vals = data.map(d => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rng  = maxV - minV || 1;
  const pts  = data.map((d, i) => [
    PAD.l + (i / (data.length - 1)) * iW,
    PAD.t + (1 - (d.value - minV) / rng) * iH,
  ]);
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${(PAD.t + iH).toFixed(1)} L${PAD.l},${(PAD.t + iH).toFixed(1)} Z`;
  const step = Math.ceil(data.length / 5);
  const labelIdxs = [...new Set([0, ...data.map((_, i) => i).filter(i => i % step === 0), data.length - 1])];
  const netChange = data[data.length - 1].value - data[0].value;
  const netPos    = netChange >= 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{fmtNumZero(data[data.length - 1].value)}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: netPos ? "#16A34A" : "#DC2626",
          background: netPos ? "#DCFCE7" : "#FEE2E2", padding: "2px 8px", borderRadius: 6 }}>
          {netPos ? "+" : ""}{fmtNumZero(Math.abs(netChange))} in 30d
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round" />
        {[maxV, Math.round((maxV + minV) / 2), minV].map((v, i) => {
          const y = PAD.t + (1 - (v - minV) / rng) * iH;
          return (
            <g key={i}>
              <line x1={PAD.l - 3} y1={y} x2={W - PAD.r} y2={y} stroke="#F1F5F9" strokeWidth="1" />
              <text x={PAD.l - 5} y={y + 4} fontSize="9" fill="#94a3b8" textAnchor="end">{fmtNumZero(v)}</text>
            </g>
          );
        })}
        {labelIdxs.map(i => {
          const [x] = pts[i];
          const lbl = new Date(data[i].date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
          return <text key={i} x={x} y={H - 3} fontSize="8.5" fill="#94a3b8" textAnchor="middle">{lbl}</text>;
        })}
      </svg>
    </div>
  );
}

/* ─── SVG Bar Chart ──────────────────────────────────────────────────────── */
function MiniBarChart({ data, color = "#E11D48", height = 100 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>No reach data yet</span>
      </div>
    );
  }
  const maxV      = Math.max(...data.map(d => d.value), 1);
  const totalReach = data.reduce((s, d) => s + d.value, 0);
  const barW      = 100 / data.length;
  const innerH    = height - 16;
  const peak      = Math.max(...data.map(d => d.value));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{fmtNumZero(totalReach)}</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>across {data.length} posts</span>
      </div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
        {data.map((d, i) => {
          const barH = (d.value / maxV) * innerH;
          const x    = i * barW + 0.5;
          const y    = innerH - barH;
          const isPeak = d.value === peak && d.value > 0;
          return (
            <rect key={i} x={x} y={y} width={Math.max(barW - 1, 0.5)} height={Math.max(barH, 1)}
              fill={isPeak ? color : color + "60"} rx="1" />
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Social Media view ──────────────────────────────────────────────────── */
function SocialMediaView({ overview, brand, onRefresh, setView }) {
  const [reviewModal, setReviewModal] = useState(null);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [monthFilter, setMonthFilter] = useState(defaultMonth);

  const { pending = [], allTasks = [], instagram } = overview || {};

  // Task-based counts
  const posted    = allTasks.filter(t => t.status === "completed" && t.contentType);
  const reels     = allTasks.filter(t => t.contentType === "reel").length;
  const taskPosts = allTasks.filter(t => t.contentType === "post").length;
  const carousels = allTasks.filter(t => t.contentType === "carousel").length;

  const monthlyReels     = brand?.monthlyDeliverables?.reels     || 0;
  const monthlyPosts     = brand?.monthlyDeliverables?.posts     || 0;
  const monthlyCarousels = brand?.monthlyDeliverables?.carousels || 0;
  const totalTarget      = monthlyReels + monthlyPosts + monthlyCarousels;
  const month            = now.toLocaleString("en-IN", { month: "long" });

  // Instagram data
  const igConnected      = !!instagram?.connected;
  const igPosts          = instagram?.posts          || [];
  const igFollowers      = instagram?.followersCount || 0;
  const profileInsights  = instagram?.profileInsights || [];

  // Current-month KPI totals (always from current month, not filter)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthIgPosts  = igPosts.filter(p => p.timestamp && new Date(p.timestamp) >= startOfMonth);
  const kpiReach      = monthIgPosts.reduce((s, p) => s + (p.reach    || 0), 0);
  const kpiLikes      = monthIgPosts.reduce((s, p) => s + (p.likes    || 0), 0);
  const kpiSaved      = monthIgPosts.reduce((s, p) => s + (p.saved    || 0), 0);
  const kpiComments   = monthIgPosts.reduce((s, p) => s + (p.comments || 0), 0);
  const engRate       = kpiReach > 0
    ? (((kpiLikes + kpiSaved + kpiComments) / kpiReach) * 100).toFixed(1) + "%"
    : "—";

  // Available months from post data
  const availableMonths = [...new Set(
    igPosts.filter(p => p.timestamp).map(p => {
      const d = new Date(p.timestamp);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })
  )].sort().reverse();
  if (!availableMonths.includes(defaultMonth)) availableMonths.unshift(defaultMonth);

  // Filtered posts for the posts table
  const [fy, fm] = monthFilter.split("-").map(Number);
  const filteredPosts = igPosts.filter(p => {
    if (!p.timestamp) return false;
    const d = new Date(p.timestamp);
    if (d.getFullYear() !== fy || d.getMonth() + 1 !== fm) return false;
    if (typeFilter === "all") return true;
    const mt = (p.mediaType || "").toLowerCase();
    if (typeFilter === "reel")          return mt === "reel" || mt === "video";
    if (typeFilter === "image")         return mt === "image";
    if (typeFilter === "carousel_album") return mt === "carousel_album";
    return true;
  }).sort((a, b) => (b.reach || 0) - (a.reach || 0));

  // Period summary stats for filtered posts
  const filteredReach    = filteredPosts.reduce((s, p) => s + (p.reach    || 0), 0);
  const filteredLikes    = filteredPosts.reduce((s, p) => s + (p.likes    || 0), 0);
  const filteredSaved    = filteredPosts.reduce((s, p) => s + (p.saved    || 0), 0);
  const filteredShares   = filteredPosts.reduce((s, p) => s + (p.shares   || 0), 0);
  const filteredComments = filteredPosts.reduce((s, p) => s + (p.comments || 0), 0);
  const filteredEng      = filteredReach > 0
    ? (((filteredLikes + filteredSaved + filteredComments) / filteredReach) * 100).toFixed(1) + "%"
    : "—";

  // Chart: follower growth (from profileInsights)
  const followerChartData = profileInsights
    .filter(p => p.followers > 0)
    .map(p => ({ date: p.date, value: p.followers }));

  // Chart: reach by post (last 20 posts, chronological)
  const reachChartData = [...igPosts]
    .filter(p => p.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-20)
    .map(p => ({ date: p.timestamp, value: p.reach || 0 }));

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "11px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#3730A3" }}>
        <i className="bi bi-instagram" style={{ fontSize: 15 }} />
        Social Media — content engine, analytics, and approvals in one place.
        {igConnected && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <span style={{ fontWeight: 700, color: "#5A57FB" }}>@{instagram.username}</span>
            {instagram.lastSync && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>· synced {fmtAgo(instagram.lastSync)}</span>
            )}
          </span>
        )}
      </div>

      {/* ── 4 KPI cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "POSTS SHIPPED",   val: `${posted.length}/${totalTarget || "?"}`, sub: `${posted.length} in ${month}`,        live: true },
          { label: "TOTAL REACH",     val: igConnected ? fmtNum(kpiReach) || "0"   : "—", sub: igConnected ? `↑ ${month} reach` : "Connect Instagram",  live: igConnected && kpiReach > 0 },
          { label: "AVG ENGAGEMENT",  val: igConnected ? engRate : "—",              sub: igConnected ? "(likes+saves+comments)÷reach" : "Connect Instagram", live: igConnected && kpiReach > 0 },
          { label: "FOLLOWERS",       val: igConnected ? fmtNum(igFollowers) || "0" : "—", sub: igConnected ? `@${instagram?.username}` : "Connect Instagram", live: igConnected },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: .7, textTransform: "uppercase", marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.live ? "#0f172a" : "#CBD5E1", lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Analytics charts (only when connected) ── */}
      {igConnected && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
          {/* Follower Growth */}
          <div className="cp-card">
            <div className="cp-card-title" style={{ marginBottom: 12 }}>
              <i className="bi bi-people" style={{ color: "#5A57FB" }} />
              Follower Growth
              <span className="cp-card-sub" style={{ marginLeft: 8 }}>Daily · last 30 days</span>
            </div>
            <MiniLineChart data={followerChartData} color="#5A57FB" gradId="gradFollowers" height={120} />
          </div>

          {/* Reach by Post */}
          <div className="cp-card">
            <div className="cp-card-title" style={{ marginBottom: 12 }}>
              <i className="bi bi-eye" style={{ color: "#E11D48" }} />
              Reach by Post
              <span className="cp-card-sub" style={{ marginLeft: 8 }}>Last 20 posts</span>
            </div>
            <MiniBarChart data={reachChartData} color="#E11D48" height={120} />
          </div>
        </div>
      )}

      {/* ── Engagement summary row (when connected + has data) ── */}
      {igConnected && kpiReach > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Reach",        val: kpiReach,    icon: "bi-eye",        color: "#5A57FB" },
            { label: "Likes",        val: kpiLikes,    icon: "bi-heart",      color: "#E11D48" },
            { label: "Comments",     val: kpiComments, icon: "bi-chat",       color: "#F59E0B" },
            { label: "Saves",        val: kpiSaved,    icon: "bi-bookmark",   color: "#059669" },
            { label: "Engagement",   val: engRate,     icon: "bi-bar-chart",  color: "#8B5CF6", isStr: true },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: s.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 15 }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                  {s.isStr ? s.val : fmtNumZero(s.val)}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .4, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Posts section with filters (when connected) ── */}
      {igConnected && (
        <div className="cp-card" style={{ marginBottom: 24 }}>
          {/* Filter bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div className="cp-card-title" style={{ marginBottom: 0, flex: 1 }}>
              <i className="bi bi-grid" style={{ color: "#5A57FB" }} />
              Posts
              {filteredPosts.length > 0 && (
                <span className="cp-card-sub" style={{ marginLeft: 8 }}>{filteredPosts.length} posts · sorted by reach</span>
              )}
            </div>
            <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              style={{ padding: "6px 10px", border: "1.5px solid #E2E8F0", borderRadius: 7, fontSize: 12, color: "#374151", fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
              {availableMonths.map(m => {
                const [y, mo] = m.split("-").map(Number);
                return <option key={m} value={m}>{new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>;
              })}
            </select>
            <div style={{ display: "flex", gap: 3, background: "#F1F5F9", borderRadius: 8, padding: "3px" }}>
              {[
                { key: "all",           label: "All" },
                { key: "reel",          label: "Reels" },
                { key: "image",         label: "Posts" },
                { key: "carousel_album", label: "Carousels" },
              ].map(t => (
                <button key={t.key} onClick={() => setTypeFilter(t.key)}
                  style={{ padding: "4px 11px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .1s",
                    background: typeFilter === t.key ? "#fff" : "none",
                    color: typeFilter === t.key ? "#0f172a" : "#64748b",
                    boxShadow: typeFilter === t.key ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period summary when there are posts */}
          {filteredPosts.length > 0 && filteredReach > 0 && (
            <div style={{ display: "flex", gap: 16, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { label: "Reach",    val: fmtNumZero(filteredReach) },
                { label: "Likes",    val: fmtNumZero(filteredLikes) },
                { label: "Saves",    val: fmtNumZero(filteredSaved) },
                { label: "Shares",   val: fmtNumZero(filteredShares) },
                { label: "Comments", val: fmtNumZero(filteredComments) },
                { label: "Avg Eng",  val: filteredEng },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Posts list */}
          {filteredPosts.length === 0 ? (
            <div className="cp-empty-state">
              <i className="bi bi-instagram" />
              <p>No posts for this filter. Try a different month or content type.<br />Make sure Instagram is synced from the admin panel.</p>
            </div>
          ) : filteredPosts.map((p, idx) => {
            const mt = (p.mediaType || "image").toLowerCase();
            const typeKey   = mt === "reel" || mt === "video" ? "reel" : mt === "carousel_album" ? "carousel" : "post";
            const typeLabel = mt === "reel" || mt === "video" ? "REEL" : mt === "carousel_album" ? "CAROUSEL" : "POST";
            const tm  = CTYPE_META[typeKey] || { label: typeLabel, color: "#5A57FB", bg: "#EEF2FF" };
            const engP = p.reach > 0
              ? (((p.likes + p.saved + p.comments) / p.reach) * 100).toFixed(1) + "%"
              : "—";
            const isVideo = mt === "reel" || mt === "video";
            return (
              <div key={p.igId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: idx < filteredPosts.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", width: 22, flexShrink: 0, textAlign: "center" }}>#{idx + 1}</div>
                {/* Thumbnail */}
                <div style={{ width: 54, height: 54, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {p.thumbnailUrl
                    ? <img src={p.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <i className={`bi ${isVideo ? "bi-play-circle" : "bi-image"}`} style={{ color: "#94a3b8", fontSize: 20 }} />
                  }
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                      {p.caption?.slice(0, 70) || "(no caption)"}
                    </span>
                    <span className="cp-badge" style={{ background: tm.bg, color: tm.color, flexShrink: 0 }}>{typeLabel}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 5 }}>
                    {p.timestamp ? new Date(p.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : ""}
                  </div>
                  {/* Metrics row */}
                  <div style={{ display: "flex", gap: 14, fontSize: 11.5, flexWrap: "wrap" }}>
                    <span style={{ color: p.reach > 0 ? "#374151" : "#CBD5E1", display: "flex", alignItems: "center", gap: 3 }}>
                      <i className="bi bi-eye" /><span style={{ fontWeight: p.reach > 0 ? 600 : 400 }}>{fmtNum(p.reach) !== "—" ? fmtNumZero(p.reach) : "—"}</span>
                      <span style={{ color: "#94a3b8", fontSize: 10 }}>reach</span>
                    </span>
                    <span style={{ color: p.likes > 0 ? "#E11D48" : "#CBD5E1", display: "flex", alignItems: "center", gap: 3 }}>
                      <i className="bi bi-heart" /><span style={{ fontWeight: p.likes > 0 ? 600 : 400 }}>{fmtNumZero(p.likes)}</span>
                    </span>
                    <span style={{ color: p.comments > 0 ? "#F59E0B" : "#CBD5E1", display: "flex", alignItems: "center", gap: 3 }}>
                      <i className="bi bi-chat" /><span style={{ fontWeight: p.comments > 0 ? 600 : 400 }}>{fmtNumZero(p.comments)}</span>
                    </span>
                    <span style={{ color: p.saved > 0 ? "#059669" : "#CBD5E1", display: "flex", alignItems: "center", gap: 3 }}>
                      <i className="bi bi-bookmark" /><span style={{ fontWeight: p.saved > 0 ? 600 : 400 }}>{fmtNumZero(p.saved)}</span>
                    </span>
                    {isVideo && (
                      <span style={{ color: p.videoViews > 0 ? "#8B5CF6" : "#CBD5E1", display: "flex", alignItems: "center", gap: 3 }}>
                        <i className="bi bi-play-circle" /><span style={{ fontWeight: p.videoViews > 0 ? 600 : 400 }}>{fmtNumZero(p.videoViews)}</span>
                        <span style={{ color: "#94a3b8", fontSize: 10 }}>plays</span>
                      </span>
                    )}
                    {(mt === "reel") && (
                      <span style={{ color: p.shares > 0 ? "#06B6D4" : "#CBD5E1", display: "flex", alignItems: "center", gap: 3 }}>
                        <i className="bi bi-share" /><span style={{ fontWeight: p.shares > 0 ? 600 : 400 }}>{fmtNumZero(p.shares)}</span>
                      </span>
                    )}
                    {p.reach > 0 && (
                      <span style={{ color: "#8B5CF6", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", gap: 2 }}>
                        <i className="bi bi-bar-chart-fill" style={{ fontSize: 10 }} />{engP}
                      </span>
                    )}
                  </div>
                </div>
                {p.permalink && (
                  <a href={p.permalink} target="_blank" rel="noreferrer"
                    style={{ color: "#5A57FB", fontSize: 14, flexShrink: 0, padding: 4 }}>
                    <i className="bi bi-box-arrow-up-right" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Two-column: Quick links + Content mix ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
        {/* Quick links */}
        <div className="cp-card" style={{ padding: "16px 18px" }}>
          <div className="cp-card-title" style={{ marginBottom: 12 }}>Quick links</div>
          {[
            { label: "Open content calendar",    icon: "bi-calendar3",        key: "calendar"  },
            { label: `Approvals (${pending.length})`, icon: "bi-check2-square", key: "approvals" },
            { label: "SMM Reports",              icon: "bi-bar-chart-line",    key: null        },
          ].map((l, i, arr) => (
            <div key={l.label} onClick={() => l.key && setView(l.key)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0",
                borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none",
                cursor: l.key ? "pointer" : "default" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
                <i className={`bi ${l.icon}`} style={{ color: "#5A57FB" }} /> {l.label}
              </span>
              {l.key && <i className="bi bi-chevron-right" style={{ color: "#CBD5E1", fontSize: 12 }} />}
            </div>
          ))}
        </div>

        {/* Content type mix */}
        <div className="cp-card" style={{ padding: "16px 18px" }}>
          <div className="cp-card-title" style={{ marginBottom: 14 }}>Content type mix · {month}</div>
          {[
            { label: "Reels",     count: reels,     total: monthlyReels,     color: "#E11D48" },
            { label: "Posts",     count: taskPosts, total: monthlyPosts,     color: "#06B6D4" },
            { label: "Carousels", count: carousels, total: monthlyCarousels, color: "#F59E0B" },
          ].map(t => (
            <div key={t.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
                <span>{t.label}</span>
                <span style={{ color: "#94a3b8" }}>{t.count}/{t.total || "?"}</span>
              </div>
              <div style={{ height: 7, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: 7, borderRadius: 4, width: `${Math.min(100, (t.count / Math.max(t.total, 1)) * 100)}%`, background: t.color, transition: "width .4s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Awaiting approval ── */}
      <div className="cp-card">
        <div className="cp-card-title">
          <i className="bi bi-clock-history" style={{ color: "#4F46E5" }} />
          Awaiting your approval
          {pending.length > 0 && <span style={{ marginLeft: 4, background: "#EEF2FF", color: "#4F46E5", borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{pending.length}</span>}
          <span className="cp-card-sub" style={{ marginLeft: 4 }}>{pending.length} piece{pending.length !== 1 ? "s" : ""} ready for sign-off</span>
          {pending.length > 0 && <button className="cp-view-all" onClick={() => setView("approvals")}>Approvals queue</button>}
        </div>
        {pending.length === 0 ? (
          <div className="cp-empty-state">
            <i className="bi bi-check-circle" style={{ color: "#02EBAD" }} />
            <p>All caught up! Nothing waiting for your review.</p>
          </div>
        ) : pending.map((task, idx) => {
          const bc = task.brandId?.color || "#5A57FB";
          const tm = CTYPE_META[task.contentType] || { label: (task.contentType || "TASK").toUpperCase(), color: "#5A57FB", bg: "#EEF2FF" };
          return (
            <div key={task._id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderBottom: idx < pending.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: bc + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: bc, flexShrink: 0 }}>
                {(task.contentType || "T").slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{task.nomenclature || task.title}</span>
                  <span className="cp-badge" style={{ background: tm.bg, color: tm.color }}>{tm.label}</span>
                  <span style={{ padding: "2px 8px", background: "#EEF2FF", color: "#4F46E5", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>● Awaiting you</span>
                </div>
                {task.caption && (
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.caption}</div>
                )}
                {task.assignedTo?.personal?.firstName && (
                  <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: bc + "30", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: bc }}>
                      {task.assignedTo.personal.firstName[0]}{task.assignedTo.personal.lastName?.[0] || ""}
                    </div>
                    {task.assignedTo.personal.firstName} submitted {fmtAgo(task.updatedAt)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button title="Review" onClick={() => setReviewModal(task)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#DCFCE7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-check" style={{ color: "#16A34A", fontSize: 14 }} />
                </button>
                <button title="Request changes" onClick={() => setReviewModal(task)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#EEF2FF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-arrow-repeat" style={{ color: "#4F46E5", fontSize: 12 }} />
                </button>
                <button title="Reject" onClick={() => setReviewModal(task)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-x" style={{ color: "#DC2626", fontSize: 15 }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {reviewModal && (
        <ApprovalModal task={reviewModal} onClose={() => setReviewModal(null)} onDone={() => { setReviewModal(null); onRefresh(); }} />
      )}
    </div>
  );
}

/* ─── GSC / SEO View ─────────────────────────────────────────────────────── */
function GscSparkline({ data, dataKey, color }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data.map(d => d[dataKey]));
  const max = Math.max(...data.map(d => d[dataKey]));
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d[dataKey] - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 48, display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function SeoView({ brandSlug }) {
  const [seoTab,  setSeoTab]  = useState("performance"); // "performance" | "tasks"
  const [gscData, setGscData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [days,    setDays]    = useState(28);
  const [chart,   setChart]   = useState("clicks");
  const [seoTasks,     setSeoTasks]     = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    if (seoTab !== "tasks") return;
    setTasksLoading(true);
    fetch(`/api/client/seo-tasks?brandSlug=${brandSlug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSeoTasks(d.tasks || []); })
      .catch(() => {})
      .finally(() => setTasksLoading(false));
  }, [brandSlug, seoTab]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/client/gsc?brandSlug=${brandSlug}&days=${days}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setGscData(d);
        else setError(d.message || "Failed to load SEO data");
      })
      .catch(() => setError("Network error — could not load SEO data"))
      .finally(() => setLoading(false));
  }, [brandSlug, days]);

  // Tab switcher — shown at top regardless of GSC state
  const tabBar = (
    <div style={{ display:"flex", borderBottom:"2px solid #E2E8F0", marginBottom:22, gap:0 }}>
      {[{ key:"performance", label:"SEO Performance", icon:"bi-graph-up-arrow" }, { key:"tasks", label:"SEO Tasks", icon:"bi-list-check" }].map(t => (
        <button key={t.key} onClick={() => setSeoTab(t.key)}
          style={{ padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer", border:"none", background:"none", fontFamily:"inherit",
            color: seoTab === t.key ? "#16A34A" : "#64748b",
            borderBottom: seoTab === t.key ? "2.5px solid #16A34A" : "2.5px solid transparent",
            display:"flex", alignItems:"center", gap:6 }}>
          <i className={`bi ${t.icon}`} />{t.label}
        </button>
      ))}
    </div>
  );

  if (seoTab === "tasks") {
    const SEO_CAT_COLOR = { blog:"#3B82F6", technical:"#8B5CF6", local:"#F59E0B", ecommerce:"#EC4899", general:"#64748b" };
    const STATUS_COLOR  = { todo:"#64748b", in_progress:"#1D4ED8", review:"#B45309", completed:"#15803D", blocked:"#DC2626" };
    const STATUS_BG     = { todo:"#F1F5F9", in_progress:"#DBEAFE", review:"#FEF3C7", completed:"#DCFCE7", blocked:"#FEE2E2" };
    return (
      <div>
        {tabBar}
        {tasksLoading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:48 }}><div className="cp-spinner" /></div>
        ) : seoTasks.length === 0 ? (
          <div className="cp-card" style={{ textAlign:"center", padding:"48px 24px" }}>
            <i className="bi bi-search" style={{ fontSize:36, color:"#CBD5E1", display:"block", marginBottom:12 }} />
            <div style={{ fontSize:15, fontWeight:700, color:"#94a3b8" }}>No SEO tasks yet</div>
            <div style={{ fontSize:13, color:"#94a3b8", marginTop:4 }}>Your assigned SEO tasks will appear here</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {seoTasks.map(t => {
              const cat = t.seoCategory || "general";
              const catColor = SEO_CAT_COLOR[cat] || "#64748b";
              const stColor  = STATUS_COLOR[t.status]  || "#64748b";
              const stBg     = STATUS_BG[t.status]     || "#F1F5F9";
              const overdue  = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
              return (
                <div key={t._id} style={{ background:"#fff", border:"1.5px solid #E2E8F0", borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6, background:catColor+"18", color:catColor, textTransform:"capitalize" }}>
                        {cat}
                      </span>
                      {t.taskId && <span style={{ fontSize:10, color:"#94a3b8", fontFamily:"monospace" }}>{t.taskId}</span>}
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#0f172a", marginBottom:4 }}>{t.title}</div>
                    {t.dueDate && (
                      <div style={{ fontSize:12, color: overdue ? "#DC2626" : "#64748b" }}>
                        {overdue && <i className="bi bi-exclamation-circle-fill me-1" />}
                        Due: {new Date(t.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                      </div>
                    )}
                  </div>
                  <span style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700, background:stBg, color:stColor, whiteSpace:"nowrap" }}>
                    {t.statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Performance tab — existing flow below
  if (loading) {
    return (
      <div>
        {tabBar}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
          <div className="cp-spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {tabBar}
        <div className="cp-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <i className="bi bi-exclamation-triangle" style={{ fontSize: 36, color: "#EF4444", marginBottom: 12, display: "block" }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Could not load GSC data</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!gscData?.configured) {
    return (
      <div>
        {tabBar}
        <div className="cp-card" style={{ textAlign: "center", padding: "56px 32px", maxWidth: 520, margin: "0 auto" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <i className="bi bi-graph-up-arrow" style={{ fontSize: 28, color: "#16A34A" }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Google Search Console</div>
          <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7 }}>
            Your SEO performance dashboard will appear here once your Google Search Console is connected by the Viralon team.
          </div>
          <div style={{ marginTop: 20, background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "14px 18px", textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#15803D", marginBottom: 8 }}>What you will see here:</div>
            {["Total Clicks & Impressions trends","Average CTR & Position","Top performing keywords","Top landing pages"].map(item => (
              <div key={item} style={{ fontSize: 12, color: "#166534", display: "flex", gap: 8, marginBottom: 4 }}>
                <i className="bi bi-check2-circle" style={{ color: "#16A34A", flexShrink: 0, marginTop: 1 }} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const rows = gscData.byDate || [];
  const totals = rows.reduce(
    (acc, r) => ({ clicks: acc.clicks + r.clicks, impressions: acc.impressions + r.impressions, ctrSum: acc.ctrSum + r.ctr, posSum: acc.posSum + r.position, n: acc.n + 1 }),
    { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, n: 0 }
  );
  const avgCTR = totals.n ? (totals.ctrSum / totals.n * 100).toFixed(2) : "0.00";
  const avgPos = totals.n ? (totals.posSum / totals.n).toFixed(1)       : "0.0";

  const chartData = rows.map(r => ({
    date:        r.keys[0].slice(5),
    clicks:      r.clicks,
    impressions: r.impressions,
    ctr:         +(r.ctr * 100).toFixed(2),
    position:    +r.position.toFixed(1),
  }));

  const CHART_META = {
    clicks:      { label: "Clicks",      color: "#3B82F6" },
    impressions: { label: "Impressions", color: "#8B5CF6" },
    ctr:         { label: "CTR (%)",     color: "#10B981" },
    position:    { label: "Position",    color: "#F59E0B" },
  };

  const statCards = [
    { label: "Total Clicks",      value: totals.clicks.toLocaleString(),    icon: "bi-cursor-fill",    color: "#3B82F6", bg: "#EFF6FF", key: "clicks" },
    { label: "Impressions",       value: totals.impressions.toLocaleString(), icon: "bi-eye-fill",      color: "#8B5CF6", bg: "#F5F3FF", key: "impressions" },
    { label: "Avg. CTR",          value: `${avgCTR}%`,                       icon: "bi-percent",       color: "#10B981", bg: "#F0FDF4", key: "ctr" },
    { label: "Avg. Position",     value: avgPos,                             icon: "bi-bar-chart-fill", color: "#F59E0B", bg: "#FFFBEB", key: "position" },
  ];

  return (
    <>
      {tabBar}
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>SEO Performance</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {gscData.period.startDate} → {gscData.period.endDate} &nbsp;·&nbsp;
            <a href={gscData.siteUrl} target="_blank" rel="noreferrer" style={{ color: "#3B82F6", textDecoration: "none", fontWeight: 600 }}>{gscData.siteUrl}</a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 28, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: "1.5px solid",
              background: days === d ? "#3B82F6" : "#F8FAFC",
              color:      days === d ? "#fff"    : "#64748b",
              borderColor: days === d ? "#3B82F6" : "#E2E8F0",
            }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {statCards.map(s => (
          <div key={s.key} onClick={() => setChart(s.key)} style={{
            background: "#fff", border: `1.5px solid ${chart === s.key ? s.color : "#E2E8F0"}`,
            borderRadius: 12, padding: "16px 18px", cursor: "pointer",
            boxShadow: chart === s.key ? `0 0 0 3px ${s.color}22` : "none",
            transition: "all .15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 14 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{s.value}</div>
            <GscSparkline data={chartData} dataKey={s.key} color={s.color} />
          </div>
        ))}
      </div>

      {/* Main chart (SVG sparkline expanded) */}
      <div className="cp-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
            {CHART_META[chart].label} over time
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{chartData.length} data points</span>
        </div>
        {chartData.length > 1 ? (() => {
          const vals = chartData.map(d => d[chart]);
          const min  = Math.min(...vals);
          const max  = Math.max(...vals);
          const rng  = max - min || 1;
          const W = 800, H = 160, PAD = 10;
          const pts = chartData.map((d, i) => {
            const x = PAD + (i / (chartData.length - 1)) * (W - PAD * 2);
            const y = PAD + (1 - (d[chart] - min) / rng) * (H - PAD * 2);
            return `${x},${y}`;
          }).join(" ");
          const color = CHART_META[chart].color;
          const areaBottom = `${chartData.map((d, i) => {
            const x = PAD + (i / (chartData.length - 1)) * (W - PAD * 2);
            const y = PAD + (1 - (d[chart] - min) / rng) * (H - PAD * 2);
            return `${x},${y}`;
          }).join(" ")} ${W - PAD},${H - PAD} ${PAD},${H - PAD}`;
          return (
            <div style={{ position: "relative" }}>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 160, display: "block" }}>
                <defs>
                  <linearGradient id="gscGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <polygon points={areaBottom} fill="url(#gscGrad)" />
                <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "#94a3b8" }}>
                {chartData.length > 0 && <span>{chartData[0].date}</span>}
                {chartData.length > 1 && <span>{chartData[chartData.length - 1].date}</span>}
              </div>
            </div>
          );
        })() : (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>Not enough data</div>
        )}
      </div>

      {/* Two column: Top Keywords + Top Pages */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Top Keywords */}
        <div className="cp-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
            <i className="bi bi-search me-2" style={{ color: "#3B82F6" }} />Top Keywords
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Keyword", "Clicks", "Impr.", "CTR", "Pos."].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Keyword" ? "left" : "right", color: "#64748b", fontWeight: 700, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(gscData.byQuery || []).slice(0, 15).map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "8px 12px", color: "#0f172a", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.keys[0]}>{row.keys[0]}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#3B82F6" }}>{row.clicks}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{row.impressions}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#10B981", fontWeight: 600 }}>{(row.ctr * 100).toFixed(1)}%</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#F59E0B", fontWeight: 600 }}>{row.position.toFixed(1)}</td>
                  </tr>
                ))}
                {(gscData.byQuery || []).length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No keyword data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Landing Pages */}
        <div className="cp-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
            <i className="bi bi-file-earmark-text me-2" style={{ color: "#8B5CF6" }} />Top Landing Pages
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Page", "Clicks", "Impr.", "CTR", "Pos."].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Page" ? "left" : "right", color: "#64748b", fontWeight: 700, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(gscData.byPage || []).slice(0, 12).map((row, i) => {
                  let pagePath = row.keys[0];
                  try { pagePath = new URL(pagePath).pathname || "/"; } catch {}
                  return (
                    <tr key={i} style={{ borderTop: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "8px 12px", color: "#0f172a", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.keys[0]}>{pagePath}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#3B82F6" }}>{row.clicks}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{row.impressions}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "#10B981", fontWeight: 600 }}>{(row.ctr * 100).toFixed(1)}%</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "#F59E0B", fontWeight: 600 }}>{row.position.toFixed(1)}</td>
                    </tr>
                  );
                })}
                {(gscData.byPage || []).length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No page data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Data note */}
      <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
        <i className="bi bi-info-circle me-1" />
        Data sourced from Google Search Console · ~3 day reporting lag · Powered by Viralon
      </div>
    </>
  );
}

/* ─── Web Development View ──────────────────────────────────────────────── */
const FEAT_STATUS = {
  todo:        { label: "To Do",            bg: "#F1F5F9", color: "#64748B" },
  in_progress: { label: "In Progress",      bg: "#DBEAFE", color: "#1D4ED8" },
  review:      { label: "Awaiting Approval",bg: "#EEF2FF", color: "#4F46E5" },
  completed:   { label: "Approved",         bg: "#DCFCE7", color: "#15803D" },
  blocked:     { label: "Blocked",          bg: "#FEE2E2", color: "#DC2626" },
};
const PHASE_META = {
  uiux:        { label: "UI/UX Design",  color: "#8B5CF6" },
  development: { label: "Development",   color: "#0EA5E9" },
  testing:     { label: "Testing",       color: "#F59E0B" },
  launch:      { label: "Launch",        color: "#16A34A" },
  completed:   { label: "Completed",     color: "#64748B" },
};

function WebDevView() {
  const [projects,  setProjects]  = useState([]);
  const [sprints,   setSprints]   = useState([]);
  const [features,  setFeatures]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeProj,setActiveProj]= useState(null);
  const [selected,  setSelected]  = useState(null);
  const [reviewData,setReviewData]= useState({ action: "", note: "" });
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    fetch("/api/client/projects")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProjects(d.projects);
          setSprints(d.sprints);
          setFeatures(d.features);
          if (d.projects.length > 0) setActiveProj(d.projects[0]._id?.toString());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function submitReview() {
    if (!selected) return;
    if (reviewData.action === "reject" && !reviewData.note.trim()) {
      alert("Please provide feedback before rejecting.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/client/features/${selected._id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: reviewData.action, clientReviewNote: reviewData.note }),
      });
      const d = await r.json();
      if (d.success) {
        setFeatures(prev => prev.map(f => f._id === selected._id ? { ...f, ...d.feature } : f));
        setSelected(prev => prev?._id === selected._id ? { ...prev, ...d.feature } : prev);
        setReviewData({ action: "", note: "" });
      } else {
        alert(d.message || "Review failed");
      }
    } catch { alert("Network error"); }
    finally { setSaving(false); }
  }

  const activeFeat    = features.filter(f => f.projectId?.toString() === activeProj);
  const activeSprs    = sprints.filter(s => s.projectId?.toString() === activeProj);
  const activeProject = projects.find(p => p._id?.toString() === activeProj);
  const awaitingCount = activeFeat.filter(f => f.status === "review").length;

  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>;

  if (projects.length === 0) {
    return (
      <div className="cp-card" style={{ textAlign: "center", padding: "64px 32px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <i className="bi bi-code-slash" style={{ fontSize: 28, color: "#94a3b8" }} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>No Active Projects</div>
        <div style={{ fontSize: 14, color: "#64748b" }}>Your web development projects will appear here once created by your team.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Project tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {projects.map(p => (
          <button
            key={p._id}
            onClick={() => setActiveProj(p._id?.toString())}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1.5px solid",
              borderColor: activeProj === p._id?.toString() ? "#0EA5E9" : "#E2E8F0",
              background: activeProj === p._id?.toString() ? "#F0F9FF" : "#fff",
              color: activeProj === p._id?.toString() ? "#0284C7" : "#475569",
              fontWeight: activeProj === p._id?.toString() ? 700 : 500,
              fontSize: 13, cursor: "pointer", transition: "all .15s",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {activeProject && (
        <>
          {/* Project header */}
          <div className="cp-card" style={{ marginBottom: 20, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{activeProject.name}</div>
                {activeProject.description && (
                  <div style={{ fontSize: 13, color: "#64748b" }}>{activeProject.description}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {activeProject.currentPhase && (
                  <span style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: `${PHASE_META[activeProject.currentPhase]?.color}18`,
                    color: PHASE_META[activeProject.currentPhase]?.color,
                  }}>
                    {PHASE_META[activeProject.currentPhase]?.label || activeProject.currentPhase}
                  </span>
                )}
                {awaitingCount > 0 && (
                  <span style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#EEF2FF", color: "#4F46E5" }}>
                    {awaitingCount} awaiting your approval
                  </span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 20, marginTop: 14, paddingTop: 14, borderTop: "1px solid #F1F5F9", flexWrap: "wrap" }}>
              {[
                { label: "Total Tasks",  val: activeFeat.length,                                        color: "#64748B" },
                { label: "In Progress",  val: activeFeat.filter(f => f.status === "in_progress").length, color: "#1D4ED8" },
                { label: "For Approval", val: awaitingCount,                                             color: "#4F46E5" },
                { label: "Completed",    val: activeFeat.filter(f => f.status === "completed").length,   color: "#15803D" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sprints + features */}
          {activeSprs.map(sprint => {
            const sf = activeFeat.filter(f => f.sprintId?.toString() === sprint._id?.toString());
            return (
              <div key={sprint._id} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <i className="bi bi-layers" style={{ color: "#0EA5E9" }} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{sprint.name}</span>
                  {sprint.startDate && (
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {fmtDate(sprint.startDate)} – {fmtDate(sprint.endDate)}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748b" }}>{sf.length} tasks</span>
                </div>
                <FeatureTable features={sf} onSelect={setSelected} />
              </div>
            );
          })}

          {/* Sprint-less features */}
          {(() => {
            const bf = activeFeat.filter(f => !f.sprintId);
            return bf.length > 0 ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <i className="bi bi-list-task" style={{ color: "#94a3b8" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>Backlog</span>
                </div>
                <FeatureTable features={bf} onSelect={setSelected} />
              </div>
            ) : null;
          })()}

          {activeSprs.length === 0 && activeFeat.length === 0 && (
            <div className="cp-card" style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
              <i className="bi bi-inbox" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
              No tasks assigned to this project yet.
            </div>
          )}
        </>
      )}

      {/* Feature detail modal */}
      {selected && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={e => e.target === e.currentTarget && (setSelected(null), setReviewData({ action:"", note:"" }))}>
          <div style={{
            background: "#fff", borderRadius: 14, width: "100%", maxWidth: 560,
            maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)",
          }}>
            {/* Modal header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{selected.title}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: FEAT_STATUS[selected.status]?.bg,
                    color: FEAT_STATUS[selected.status]?.color,
                  }}>
                    {FEAT_STATUS[selected.status]?.label}
                  </span>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#F1F5F9", color: "#64748b" }}>
                    {selected.priority}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setReviewData({ action:"", note:"" }); }}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8", padding: 4 }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {selected.description && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>Description</div>
                  <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{selected.description}</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", marginBottom: 16 }}>
                {selected.dueDate && (
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Due Date</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(selected.dueDate)}</div>
                  </div>
                )}
                {selected.estimatedHours && (
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Estimated</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.estimatedHours}h</div>
                  </div>
                )}
                {selected.assignedTo && (
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Developer</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {selected.assignedTo.firstName} {selected.assignedTo.lastName}
                    </div>
                  </div>
                )}
              </div>

              {/* Dev submission */}
              {(selected.workReport || selected.proofLink) && (
                <>
                  <div style={{ height: 1, background: "#F1F5F9", margin: "16px 0" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 12 }}>
                    Developer Submission
                  </div>
                  {selected.workReport && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Work Report</div>
                      <p style={{
                        fontSize: 13, color: "#334155", lineHeight: 1.6,
                        background: "#F8FAFC", padding: "10px 12px", borderRadius: 8,
                        border: "1px solid #E2E8F0",
                      }}>
                        {selected.workReport}
                      </p>
                    </div>
                  )}
                  {selected.proofLink && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Proof / Staging Link</div>
                      <a
                        href={selected.proofLink} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 13, color: "#0284C7", wordBreak: "break-all" }}
                      >
                        {selected.proofLink}
                      </a>
                    </div>
                  )}
                </>
              )}

              {/* Client review actions */}
              {selected.status === "review" && (
                <>
                  <div style={{ height: 1, background: "#F1F5F9", margin: "16px 0" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 12 }}>
                    Your Review
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button
                      onClick={() => setReviewData(r => ({ ...r, action: "approve" }))}
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 8, border: "1.5px solid",
                        borderColor: reviewData.action === "approve" ? "#16A34A" : "#E2E8F0",
                        background: reviewData.action === "approve" ? "#DCFCE7" : "#fff",
                        color: reviewData.action === "approve" ? "#15803D" : "#475569",
                        fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all .15s",
                      }}
                    >
                      <i className="bi bi-check-circle me-2" />Approve
                    </button>
                    <button
                      onClick={() => setReviewData(r => ({ ...r, action: "reject" }))}
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 8, border: "1.5px solid",
                        borderColor: reviewData.action === "reject" ? "#DC2626" : "#E2E8F0",
                        background: reviewData.action === "reject" ? "#FEE2E2" : "#fff",
                        color: reviewData.action === "reject" ? "#DC2626" : "#475569",
                        fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all .15s",
                      }}
                    >
                      <i className="bi bi-x-circle me-2" />Reject
                    </button>
                  </div>
                  {reviewData.action === "reject" && (
                    <textarea
                      rows={3}
                      placeholder="Describe what needs to be changed..."
                      value={reviewData.note}
                      onChange={e => setReviewData(r => ({ ...r, note: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0",
                        borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none",
                        resize: "vertical", color: "#0f172a",
                      }}
                    />
                  )}
                  {reviewData.action && (
                    <button
                      onClick={submitReview}
                      disabled={saving}
                      style={{
                        marginTop: 12, width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                        background: reviewData.action === "approve" ? "#16A34A" : "#DC2626",
                        color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                      }}
                    >
                      {saving ? "Submitting..." : reviewData.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
                    </button>
                  )}
                </>
              )}

              {selected.clientReviewNote && selected.status !== "review" && (
                <>
                  <div style={{ height: 1, background: "#F1F5F9", margin: "16px 0" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>
                    Your Previous Feedback
                  </div>
                  <p style={{ fontSize: 13, color: "#334155", background: "#FEE2E2", padding: "10px 12px", borderRadius: 8, border: "1px solid #FECACA" }}>
                    {selected.clientReviewNote}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureTable({ features, onSelect }) {
  if (!features.length) return (
    <div style={{ color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>No tasks in this sprint.</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {features.map(f => (
        <div
          key={f._id}
          onClick={() => onSelect(f)}
          style={{
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
            padding: "12px 16px", cursor: "pointer", transition: "all .15s",
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#0EA5E9"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
            {f.assignedTo && (
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                <i className="bi bi-person me-1" />
                {f.assignedTo.firstName} {f.assignedTo.lastName}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {f.dueDate && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                <i className="bi bi-calendar3 me-1" />{fmtDate(f.dueDate)}
              </span>
            )}
            <span style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: FEAT_STATUS[f.status]?.bg,
              color: FEAT_STATUS[f.status]?.color,
            }}>
              {FEAT_STATUS[f.status]?.label}
            </span>
            {f.status === "review" && (
              <i className="bi bi-arrow-right-circle-fill" style={{ color: "#0EA5E9", fontSize: 16 }} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Messages View ─────────────────────────────────────────────────────── */
function MessagesView({ brandSlug, client }) {
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState("");
  const [attachments, setAttachments]     = useState([]);
  const [linkName, setLinkName]           = useState("");
  const [linkUrl, setLinkUrl]             = useState("");
  const [showLink, setShowLink]           = useState(false);
  const [showCallReq, setShowCallReq]     = useState(false);
  const [callDate, setCallDate]           = useState("");
  const [callTime, setCallTime]           = useState("");
  const [callNote, setCallNote]           = useState("");
  const [sending, setSending]             = useState(false);
  const [error, setError]                 = useState("");
  const [callRequests, setCallRequests]   = useState([]);
  const [replyTo, setReplyTo]             = useState(null);
  const [editingId, setEditingId]         = useState(null);
  const [msgPanelTab, setMsgPanelTab]     = useState("chat");   // "chat" | "requests"
  const [callReqTab, setCallReqTab]       = useState("call");   // "call" | "meeting"
  const [meetingLinkInput, setMeetingLinkInput] = useState("");
  const [openMenu, setOpenMenu]               = useState(null); // _id of msg with open dropdown
  const bottomRef    = useRef(null);
  const pollRef      = useRef(null);
  const crPollRef    = useRef(null);
  const isNearBottom = useRef(true);
  const textareaRef  = useRef(null);

  function handleThreadScroll(e) {
    const el = e.currentTarget;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  useEffect(() => {
    if (!brandSlug) return;
    isNearBottom.current = true;
    loadMessages();
    loadCallRequests();
    pollRef.current   = setInterval(loadMessages, 8000);
    crPollRef.current = setInterval(loadCallRequests, 10000);
    return () => { clearInterval(pollRef.current); clearInterval(crPollRef.current); };
  }, [brandSlug]);

  useEffect(() => {
    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function loadMessages() {
    try {
      const r = await fetch(`/api/client/messages?brand=${brandSlug}`);
      const d = await r.json();
      if (d.success) setMessages(d.messages || []);
    } catch {}
  }

  async function loadCallRequests() {
    try {
      const r = await fetch(`/api/client/call-requests?brand=${brandSlug}`);
      const d = await r.json();
      if (d.success) setCallRequests(d.requests || []);
    } catch {}
  }

  async function send() {
    if (!text.trim() && attachments.length === 0) return;
    isNearBottom.current = true;
    setSending(true);
    setError("");
    try {
      if (editingId) {
        const r = await fetch(`/api/client/messages?brand=${brandSlug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: editingId, action: "edit", text }),
        });
        const d = await r.json();
        if (d.success) {
          setMessages(prev => prev.map(m => m._id === editingId ? d.message : m));
          setText(""); setEditingId(null);
        } else setError(d.message || "Failed to edit");
      } else {
        const r = await fetch(`/api/client/messages?brand=${brandSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, attachments, replyTo }),
        });
        const d = await r.json();
        if (d.success) {
          setMessages(prev => [...prev, d.message]);
          setText(""); setAttachments([]); setReplyTo(null);
        } else setError(d.message || "Failed to send");
      }
    } catch { setError("Network error"); }
    setSending(false);
  }

  function startReply(m) {
    setReplyTo({ msgId: m._id, senderName: m.senderName, text: m.text || m.attachments?.[0]?.name || "" });
    setEditingId(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function startEdit(m) {
    setEditingId(m._id);
    setText(m.text || "");
    setReplyTo(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function deleteMsg(m, action) {
    const r = await fetch(`/api/client/messages?brand=${brandSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: m._id, action }),
    }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (!d.success) return;
    if (action === "deleteForMe") setMessages(prev => prev.filter(msg => msg._id !== m._id));
    else setMessages(prev => prev.map(msg => msg._id === m._id ? d.message : msg));
  }

  function addLink() {
    if (!linkUrl.trim()) return;
    setAttachments(prev => [...prev, { name: linkName.trim() || linkUrl.trim(), url: linkUrl.trim() }]);
    setLinkName(""); setLinkUrl(""); setShowLink(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") { setEditingId(null); setReplyTo(null); setText(""); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  async function submitCallRequest() {
    if (!callDate || !callTime) return;
    setSending(true);
    try {
      const r = await fetch(`/api/client/call-requests?brand=${brandSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredDate: callDate,
          preferredTime: callTime,
          note: callNote,
          requestType: callReqTab,
          meetingLink: meetingLinkInput,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setCallRequests(prev => [d.request, ...prev]);
        setShowCallReq(false);
        setCallDate(""); setCallTime(""); setCallNote(""); setMeetingLinkInput("");
        setCallReqTab("call");
      }
    } catch {}
    setSending(false);
  }

  function fmtTime(d) {
    if (!d) return "";
    return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  function fmtDateLabel(d) {
    if (!d) return "";
    const today = new Date(); today.setHours(0,0,0,0);
    const dt = new Date(d); dt.setHours(0,0,0,0);
    const diff = (today - dt) / 86400000;
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }

  function groupByDate(msgs) {
    const groups = [];
    let lastDate = null;
    for (const m of msgs) {
      const d = fmtDateLabel(m.createdAt);
      if (d !== lastDate) { groups.push({ type: "date", label: d }); lastDate = d; }
      groups.push({ type: "msg", data: m });
    }
    return groups;
  }

  const grouped = groupByDate(messages);

  return (
    <>
      <style>{`
        .msg-view { display: grid; grid-template-columns: 1fr 280px; gap: 20px; height: calc(100vh - 140px); min-height: 480px; }
        @media (max-width: 860px) { .msg-view { grid-template-columns: 1fr; } }
        .msg-panel { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
        .msg-panel-header { padding: 16px 20px; border-bottom: 1px solid #E2E8F0; }
        .msg-panel-title { font-size: 14px; font-weight: 700; color: #0f172a; }
        .msg-panel-sub   { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .msg-thread-scroll { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 4px; background: #F8FAFC; }
        .msg-date-sep { text-align: center; margin: 10px 0 6px; }
        .msg-date-sep span { font-size: 11px; color: #94a3b8; background: #EEF2FF; padding: 3px 12px; border-radius: 10px; font-weight: 600; }
        .msg-brow { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 6px; }
        .msg-brow.client { justify-content: flex-start; }
        .msg-brow.team   { justify-content: flex-end; }
        .msg-av-xs { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #fff; flex-shrink: 0; margin-bottom: 2px; }
        .msg-b { max-width: 72%; min-width: 160px; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.6; overflow-wrap: break-word; word-break: break-word; position: relative; }
        .msg-b.client { background: #4F46E5; color: #fff; border-bottom-left-radius: 4px; }
        .msg-b.team   { background: #fff; border: 1px solid #E2E8F0; color: #0f172a; border-bottom-right-radius: 4px; }
        .msg-b-name { font-size: 10.5px; font-weight: 600; color: #94a3b8; margin-bottom: 3px; }
        .msg-b-time { font-size: 10px; margin-top: 5px; text-align: right; }
        .msg-b.client .msg-b-time { color: rgba(255,255,255,.5); }
        .msg-b.team .msg-b-time   { color: #94a3b8; }
        .msg-b-link { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; }
        .msg-b.client .msg-b-link { background: rgba(255,255,255,.2); color: #fff; }
        .msg-b.team .msg-b-link   { background: #EEF2FF; color: #4F46E5; }
        .msg-input-wrap { padding: 14px 16px; background: #fff; border-top: 1px solid #E2E8F0; }
        .msg-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .msg-chip  { display: flex; align-items: center; gap: 5px; padding: 4px 10px; background: #EEF2FF; border-radius: 8px; font-size: 12px; font-weight: 600; color: #4F46E5; }
        .msg-chip button { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; line-height: 1; }
        .msg-input-row { display: flex; gap: 8px; align-items: flex-end; }
        .msg-ta { flex: 1; padding: 9px 13px; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 13.5px; font-family: inherit; resize: none; outline: none; min-height: 40px; max-height: 110px; color: #0f172a; background: #F8FAFC; line-height: 1.5; }
        .msg-ta:focus { border-color: #4F46E5; background: #fff; }
        .msg-link-action { padding: 8px 12px; background: #F1F5F9; border: 1.5px solid #E2E8F0; border-radius: 9px; font-size: 12.5px; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 5px; font-family: inherit; flex-shrink: 0; }
        .msg-send { padding: 9px 16px; background: #4F46E5; color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; font-family: inherit; flex-shrink: 0; }
        .msg-send:disabled { opacity: .45; cursor: not-allowed; }
        .msg-am-card { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 24px; }
        .msg-am-label { font-size: 10.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .7px; margin-bottom: 16px; }
        .msg-am-av { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #4F46E5, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #fff; margin: 0 auto 12px; }
        .msg-am-name { font-size: 15px; font-weight: 700; color: #0f172a; text-align: center; margin-bottom: 3px; }
        .msg-am-role { font-size: 12px; color: #64748b; text-align: center; margin-bottom: 20px; }
        .msg-am-divider { height: 1px; background: #F1F5F9; margin-bottom: 16px; }
        .msg-am-actions { display: flex; flex-direction: column; gap: 8px; }
        .msg-am-btn { display: flex; align-items: center; gap: 9px; padding: 11px 14px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: #fff; font-size: 13px; font-weight: 600; color: #0f172a; cursor: pointer; text-decoration: none; font-family: inherit; transition: background .12s; width: 100%; }
        .msg-am-btn:hover { background: #F8FAFC; }
        .msg-am-btn i { font-size: 16px; }
        .msg-am-btn.primary { background: #4F46E5; color: #fff; border-color: #4F46E5; }
        .msg-am-btn.primary:hover { background: #4338CA; }
        .msg-am-info { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 14px; }
        .msg-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .msg-modal-box { background: #fff; border-radius: 14px; padding: 26px; width: 380px; }
        .msg-modal-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
        .msg-field { margin-bottom: 12px; }
        .msg-field label { font-size: 11px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .5px; }
        .msg-field input { width: 100%; padding: 9px 12px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; color: #0f172a; }
        .msg-field input:focus { border-color: #4F46E5; }
        .msg-modal-actions { display: flex; gap: 8px; margin-top: 6px; }
        .msg-btn-pri { padding: 9px 18px; background: #4F46E5; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .msg-btn-sec { padding: 9px 18px; background: #F1F5F9; color: #475569; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .msg-schedule-form { display: flex; flex-direction: column; gap: 12px; }
        .msg-empty-thread { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 8px; }
        /* Reply preview inside bubble */
        .msg-reply-preview { border-radius: 7px; padding: 5px 9px; margin-bottom: 7px; }
        .msg-b.client .msg-reply-preview { background: rgba(255,255,255,.18); border-left: 3px solid rgba(255,255,255,.5); }
        .msg-b.team   .msg-reply-preview { background: #EEF2FF; border-left: 3px solid #4F46E5; }
        .msg-reply-pname { font-size: 10.5px; font-weight: 700; margin-bottom: 1px; }
        .msg-b.client .msg-reply-pname { color: rgba(255,255,255,.9); }
        .msg-b.team   .msg-reply-pname { color: #4F46E5; }
        .msg-reply-ptext { font-size: 11.5px; opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* Deleted / edited */
        .msg-deleted { font-style: italic; opacity: .55; font-size: 13px; display: flex; align-items: center; gap: 5px; }
        .msg-edited  { font-size: 9.5px; opacity: .55; margin-left: 4px; }
        /* WhatsApp-style message menu */
        .msg-wa-btn { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; opacity: 0; pointer-events: none; transition: opacity .12s; z-index: 2; }
        .msg-b.client .msg-wa-btn { background: rgba(0,0,0,.18); color: rgba(255,255,255,.9); }
        .msg-b.team   .msg-wa-btn { background: rgba(0,0,0,.09); color: #475569; }
        .msg-b:hover .msg-wa-btn  { opacity: 1; pointer-events: auto; }
        .msg-wa-btn:hover { opacity: 1 !important; filter: brightness(.85); }
        .msg-wa-dropdown { position: absolute; top: 26px; right: 0; background: #fff; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,.16); z-index: 200; min-width: 170px; overflow: hidden; border: 1px solid #E2E8F0; }
        .msg-wa-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-size: 13px; color: #0f172a; cursor: pointer; background: none; border: none; width: 100%; font-family: inherit; text-align: left; white-space: nowrap; }
        .msg-wa-item:hover { background: #F1F5F9; }
        .msg-wa-item.danger { color: #EF4444; }
        .msg-wa-item.danger:hover { background: #FEF2F2; }
        /* Panel tabs */
        .msg-panel-tabs { display: flex; border-bottom: 1px solid #E2E8F0; background: #fff; }
        .msg-ptab { flex: 1; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #64748b; background: none; border: none; border-bottom: 2.5px solid transparent; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .msg-ptab.active { color: #4F46E5; border-bottom-color: #4F46E5; background: #fafbff; }
        .msg-ptab-badge { background: #EF4444; color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }
        /* Requests tab list */
        .msg-req-list { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #F8FAFC; }
        .msg-req-card { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; }
        .msg-req-card.pending   { border-left: 3px solid #F59E0B; }
        .msg-req-card.approved, .msg-req-card.scheduled { border-left: 3px solid #10B981; }
        .msg-req-card.rejected  { border-left: 3px solid #F97316; }
        /* Modal tabs */
        .msg-modal-tabs { display: flex; gap: 0; margin-bottom: 18px; border: 1.5px solid #E2E8F0; border-radius: 8px; overflow: hidden; }
        .msg-modal-tab { flex: 1; padding: 9px; font-size: 13px; font-weight: 600; cursor: pointer; background: #F8FAFC; border: none; font-family: inherit; color: #64748b; }
        .msg-modal-tab.active { background: #4F46E5; color: #fff; }
        /* Reply / edit bars above input */
        .msg-reply-bar { display: flex; align-items: center; gap: 8px; background: #EEF2FF; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; }
        .msg-edit-bar  { display: flex; align-items: center; gap: 8px; background: #FEF9C3; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; }
        .msg-bar-body  { flex: 1; min-width: 0; }
        .msg-bar-cancel { background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 6px; font-family: inherit; }
        .msg-bar-cancel:hover { background: rgba(0,0,0,.06); }
        .cr-card { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 16px; }
        .cr-card-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 12px; }
        .cr-item { border: 1px solid #E2E8F0; border-radius: 10px; padding: 11px 13px; margin-bottom: 8px; background: #F8FAFC; }
        .cr-item:last-child { margin-bottom: 0; }
        .cr-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; }
        .cr-badge.pending   { background: #FEF9C3; color: #A16207; }
        .cr-badge.approved  { background: #DCFCE7; color: #15803D; }
        .cr-badge.scheduled { background: #DCFCE7; color: #15803D; }
        .cr-badge.rejected  { background: #FEE2E2; color: #DC2626; }
        .cr-dt   { font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 5px; }
        .cr-note { font-size: 11.5px; color: #64748b; margin-top: 3px; }
        .cr-conf { font-size: 11.5px; color: #059669; font-weight: 600; margin-top: 4px; }
        .cr-empty { font-size: 12px; color: #94a3b8; text-align: center; padding: 10px 0; }
      `}</style>

      <div className="msg-view">
        {/* Chat panel */}
        <div className="msg-panel">
          {/* Panel tabs */}
          <div className="msg-panel-tabs">
            <button className={`msg-ptab ${msgPanelTab === "chat" ? "active" : ""}`} onClick={() => setMsgPanelTab("chat")}>
              <i className="bi bi-chat-dots" /> Conversation
            </button>
            <button className={`msg-ptab ${msgPanelTab === "requests" ? "active" : ""}`} onClick={() => setMsgPanelTab("requests")}>
              <i className="bi bi-telephone-fill" /> Requests
              {callRequests.filter(cr => cr.status === "pending").length > 0 && (
                <span className="msg-ptab-badge">{callRequests.filter(cr => cr.status === "pending").length}</span>
              )}
            </button>
          </div>

          {/* Requests tab */}
          {msgPanelTab === "requests" && (
            <div className="msg-req-list">
              {callRequests.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:"#94a3b8" }}>
                  <i className="bi bi-telephone" style={{ fontSize:32, display:"block", marginBottom:8, color:"#CBD5E1" }} />
                  <div style={{ fontSize:13, fontWeight:600 }}>No requests yet</div>
                  <div style={{ fontSize:12, marginTop:4 }}>Use the "Call Request / Meeting" button to get in touch</div>
                </div>
              ) : callRequests.map(cr => {
                const sm = { pending:{bg:"#FEF9C3",col:"#A16207",lbl:"Pending"}, approved:{bg:"#DCFCE7",col:"#15803D",lbl:"Approved"}, scheduled:{bg:"#DCFCE7",col:"#15803D",lbl:"Scheduled"}, rejected:{bg:"#FFF7ED",col:"#C2410C",lbl:"Rescheduled"} }[cr.status] || {};
                return (
                  <div key={cr._id} className={`msg-req-card ${cr.status}`}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:sm.bg, color:sm.col }}>{sm.lbl}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:"#4F46E5", background:"#EEF2FF", padding:"2px 7px", borderRadius:6 }}>
                        {cr.requestType === "meeting" ? "📅 Meeting" : "📞 Call"}
                      </span>
                    </div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#0f172a" }}>
                      <i className="bi bi-calendar2" style={{ marginRight:4 }} />{cr.preferredDate} · {cr.preferredTime}
                    </div>
                    {cr.note && <div style={{ fontSize:11.5, color:"#64748b", marginTop:3 }}>{cr.note}</div>}
                    {(cr.status === "approved" || cr.status === "scheduled") && (
                      <div style={{ fontSize:11.5, color:"#059669", fontWeight:700, marginTop:5 }}>
                        <i className="bi bi-check-circle-fill" style={{ marginRight:3 }} />
                        Confirmed: {cr.scheduledDate || cr.preferredDate} at {cr.scheduledTime || cr.preferredTime}
                      </div>
                    )}
                    {cr.meetingLink && (
                      <a href={cr.meetingLink} target="_blank" rel="noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:6, fontSize:12, fontWeight:700, color:"#4F46E5", textDecoration:"none", background:"#EEF2FF", padding:"4px 10px", borderRadius:7 }}>
                        <i className="bi bi-camera-video-fill" /> Join Meeting
                      </a>
                    )}
                    {cr.adminNote && <div style={{ fontSize:11, color:"#64748b", fontStyle:"italic", marginTop:4 }}>"{cr.adminNote}"</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Chat thread + input — only when chat tab active */}
          {msgPanelTab === "chat" && (<>
          <div className="msg-thread-scroll" onScroll={handleThreadScroll}>
            {messages.length === 0 ? (
              <div className="msg-empty-thread">
                <i className="bi bi-chat" style={{ fontSize: 36, color: "#CBD5E1" }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</div>
                <div style={{ fontSize: 13 }}>Send your first message below</div>
              </div>
            ) : (
              grouped.map((item, idx) => {
                if (item.type === "date") {
                  return (
                    <div key={`date-${idx}`} className="msg-date-sep">
                      <span>{item.label}</span>
                    </div>
                  );
                }
                const m = item.data;
                const isClient = m.senderRole === "client";
                return (
                  <div key={m._id} className={`msg-brow ${isClient ? "client" : "team"}`}>
                    {isClient && (
                      <div className="msg-av-xs" style={{ background: "#4F46E5" }}>
                        {(client?.name || "C").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {!isClient && (
                      <div className="msg-av-xs" style={{ background: "#5A57FB" }}>
                        {(m.senderName || "V").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      {!isClient && <div className="msg-b-name">{m.senderName}</div>}
                      <div className={`msg-b ${isClient ? "client" : "team"}`}>
                        {/* Reply preview */}
                        {m.replyTo?.msgId && !m.deleted && (
                          <div className="msg-reply-preview">
                            <div className="msg-reply-pname">{m.replyTo.senderName}</div>
                            <div className="msg-reply-ptext">{(m.replyTo.text || "").slice(0, 80)}</div>
                          </div>
                        )}
                        {m.deleted ? (
                          <div className="msg-deleted">
                            <i className="bi bi-slash-circle" /> This message was deleted
                          </div>
                        ) : (
                          <>
                            {m.text && (
                              <div>
                                {m.text}
                                {m.edited && <span className="msg-edited">(edited)</span>}
                              </div>
                            )}
                            {(m.attachments || []).map((a, i) => (
                              <a key={i} href={a.url} target="_blank" rel="noreferrer" className="msg-b-link">
                                <i className="bi bi-link-45deg" />{a.name}
                              </a>
                            ))}
                            {/* WhatsApp-style dropdown trigger */}
                            <button
                              className="msg-wa-btn"
                              onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === m._id ? null : m._id); }}
                            >
                              <i className="bi bi-chevron-down" />
                            </button>
                            {openMenu === m._id && (
                              <>
                                <div style={{ position:"fixed", inset:0, zIndex:199 }} onClick={() => setOpenMenu(null)} />
                                <div className="msg-wa-dropdown" style={{ left:0, right:"auto" }}>
                                  <button className="msg-wa-item" onClick={() => { startReply(m); setOpenMenu(null); }}>
                                    <i className="bi bi-reply" /> Reply
                                  </button>
                                  {isClient && (
                                    <button className="msg-wa-item" onClick={() => { startEdit(m); setOpenMenu(null); }}>
                                      <i className="bi bi-pencil" /> Edit
                                    </button>
                                  )}
                                  {isClient && (
                                    <button className="msg-wa-item danger" onClick={() => { deleteMsg(m, "deleteForAll"); setOpenMenu(null); }}>
                                      <i className="bi bi-trash" /> Delete
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </>
                        )}
                        <div className="msg-b-time">{fmtTime(m.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="msg-input-wrap">
            {error && (
              <div style={{ background: "#FEF2F2", color: "#DC2626", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
                {error}
              </div>
            )}
            {replyTo && (
              <div className="msg-reply-bar">
                <i className="bi bi-reply-fill" style={{ color: "#4F46E5", flexShrink: 0 }} />
                <div className="msg-bar-body">
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5" }}>Replying to {replyTo.senderName}</div>
                  <div style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(replyTo.text || "").slice(0, 60)}</div>
                </div>
                <button className="msg-bar-cancel" style={{ color: "#64748b" }} onClick={() => setReplyTo(null)}><i className="bi bi-x" /></button>
              </div>
            )}
            {editingId && (
              <div className="msg-edit-bar">
                <i className="bi bi-pencil-fill" style={{ color: "#92400E", flexShrink: 0 }} />
                <div className="msg-bar-body" style={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>Editing message</div>
                <button className="msg-bar-cancel" style={{ color: "#92400E" }} onClick={() => { setEditingId(null); setText(""); }}>
                  <i className="bi bi-x" /> Cancel
                </button>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="msg-chips">
                {attachments.map((a, i) => (
                  <div key={i} className="msg-chip">
                    <i className="bi bi-link-45deg" />
                    <span>{a.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                      <i className="bi bi-x" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="msg-input-row">
              {!editingId && (
                <button className="msg-link-action" onClick={() => setShowLink(true)}>
                  <i className="bi bi-link-45deg" /> Attach Link
                </button>
              )}
              <textarea
                ref={textareaRef}
                className="msg-ta"
                rows={1}
                placeholder={editingId ? "Edit your message..." : "Type a message..."}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="msg-send" onClick={send} disabled={sending || (!text.trim() && attachments.length === 0)}>
                <i className={`bi ${sending ? "bi-hourglass" : editingId ? "bi-check-lg" : "bi-send"}`} />
                {editingId ? "Update" : "Send"}
              </button>
            </div>
          </div>
          </>)}
        </div>

        {/* Account Manager panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="msg-am-card">
            <div className="msg-am-label">Your Account Manager</div>
            <div className="msg-am-av">AS</div>
            <div className="msg-am-name">Anurag Srivastava</div>
            <div className="msg-am-role">Your Manager</div>
            <div className="msg-am-divider" />
            <div className="msg-am-actions">
              <button
                className="msg-am-btn primary"
                onClick={() => setShowCallReq(true)}
              >
                <i className="bi bi-telephone" />
                Call Request / Meeting
              </button>
              <a
                href="mailto:anurag@viralon.in"
                className="msg-am-btn"
              >
                <i className="bi bi-envelope" style={{ color: "#4F46E5" }} />
                Send Email
              </a>
            </div>
            <div className="msg-am-info">Response within 4 business hours</div>
          </div>

          <div className="msg-am-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>Quick Tips</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Share Google Drive links for files and documents",
                "Use the message box for updates or queries",
                "Mention deadlines clearly in your messages",
              ].map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4F46E5", marginTop: 7, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{tip}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Google Drive link modal */}
      {showLink && (
        <div className="msg-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowLink(false); }}>
          <div className="msg-modal-box">
            <div className="msg-modal-title">Attach a Google Drive link</div>
            <div className="msg-field">
              <label>Display Name</label>
              <input
                placeholder="e.g. Campaign Brief"
                value={linkName}
                onChange={e => setLinkName(e.target.value)}
              />
            </div>
            <div className="msg-field">
              <label>Google Drive URL</label>
              <input
                placeholder="https://drive.google.com/..."
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addLink(); }}
              />
            </div>
            <div className="msg-modal-actions">
              <button className="msg-btn-pri" onClick={addLink}>Attach</button>
              <button className="msg-btn-sec" onClick={() => setShowLink(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Call Request / Meeting modal */}
      {showCallReq && (
        <div className="msg-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowCallReq(false); }}>
          <div className="msg-modal-box">
            <div className="msg-modal-title">Call Request / Meeting</div>
            {/* Tabs */}
            <div className="msg-modal-tabs" style={{ marginBottom: 18 }}>
              <button className={`msg-modal-tab ${callReqTab === "call" ? "active" : ""}`} onClick={() => setCallReqTab("call")}>
                <i className="bi bi-telephone" style={{ marginRight: 5 }} />Call
              </button>
              <button className={`msg-modal-tab ${callReqTab === "meeting" ? "active" : ""}`} onClick={() => setCallReqTab("meeting")}>
                <i className="bi bi-camera-video" style={{ marginRight: 5 }} />Meeting
              </button>
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              {callReqTab === "call"
                ? "Let us know when you are available. Anurag will confirm the time."
                : "Schedule a video meeting. Anurag will confirm and share a link."}
            </div>
            <div className="msg-field">
              <label>Preferred Date</label>
              <input
                type="date"
                value={callDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setCallDate(e.target.value)}
              />
            </div>
            <div className="msg-field">
              <label>Preferred Time</label>
              <input
                type="time"
                value={callTime}
                onChange={e => setCallTime(e.target.value)}
              />
            </div>
            <div className="msg-field">
              <label>{callReqTab === "meeting" ? "Meeting Agenda (optional)" : "Call Agenda (optional)"}</label>
              <input
                placeholder={callReqTab === "meeting" ? "e.g. Review campaign strategy" : "e.g. Discuss Q3 campaign strategy"}
                value={callNote}
                onChange={e => setCallNote(e.target.value)}
              />
            </div>
            <div className="msg-modal-actions">
              <button
                className="msg-btn-pri"
                onClick={submitCallRequest}
                disabled={sending || !callDate || !callTime}
              >
                {sending ? "Sending..." : `Send ${callReqTab === "meeting" ? "Meeting Request" : "Call Request"}`}
              </button>
              <button className="msg-btn-sec" onClick={() => setShowCallReq(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Placeholder view ───────────────────────────────────────────────────── */
function ComingSoon({ icon, title, desc }) {
  return (
    <div className="cp-card" style={{ textAlign: "center", padding: "64px 32px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <i className={`bi ${icon}`} style={{ fontSize: 28, color: "#94a3b8" }} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#64748b" }}>{desc}</div>
    </div>
  );
}

/* ─── Ad Campaigns View ──────────────────────────────────────────────────── */
function getCurrSymbol(currency) {
  switch ((currency || "").toUpperCase()) {
    case "USD": case "AUD": case "CAD": case "SGD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    default:    return "₹";
  }
}

function AdCampaignsView({ brandSlug }) {
  const [campaigns, setCampaigns] = useState([]);
  const [currency,  setCurrency]  = useState("INR");
  const [loading,   setLoading]   = useState(true);

  const loadCampaigns = useCallback(() => {
    if (!brandSlug) return;
    setLoading(true);
    fetch(`/api/client/campaigns?brandSlug=${brandSlug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCampaigns(d.campaigns || []);
          if (d.currency) setCurrency(d.currency);
        }
      })
      .finally(() => setLoading(false));
  }, [brandSlug]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const PLATFORM_LABEL = { meta: "Meta", google: "Google", youtube: "YouTube", linkedin: "LinkedIn" };
  const PLATFORM_COLOR = { meta: "#1877F2", google: "#EA4335", youtube: "#FF0000", linkedin: "#0A66C2" };
  const STATUS_BG      = { planned: "#EEF2FF", active: "#DCFCE7", paused: "#FFFBEB", completed: "#F1F5F9" };
  const STATUS_COLOR   = { planned: "#4F46E5", active: "#15803D", paused: "#B45309", completed: "#475569" };
  const STATUS_LABEL   = { planned: "Planned", active: "Active", paused: "Paused", completed: "Completed" };

  const currSym = getCurrSymbol(currency);

  function fmtCurrFull(n) {
    if (!n) return currSym + "0";
    return currSym + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtCurr(n) {
    if (!n) return currSym + "0";
    if (n >= 100000) return currSym + (n / 100000).toFixed(2) + "L";
    if (n >= 1000)   return currSym + (n / 1000).toFixed(1) + "K";
    return currSym + n;
  }
  function fmtNum(n) {
    if (!n) return "—";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const totalSpent      = activeCampaigns.reduce((s, c) => s + (c.performance?.spent || 0), 0);
  const totalImpr       = activeCampaigns.reduce((s, c) => s + (c.performance?.impressions || 0), 0);
  const totalClicks     = activeCampaigns.reduce((s, c) => s + (c.performance?.linkClicks || 0), 0);
  const totalConv       = activeCampaigns.reduce((s, c) => s + (c.performance?.conversions || 0), 0);
  const totalReach      = activeCampaigns.reduce((s, c) => s + (c.performance?.reach || 0), 0);
  const totalLpViews    = activeCampaigns.reduce((s, c) => s + (c.performance?.landingPageViews || 0), 0);
  const totalBudget     = activeCampaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const avgCpa          = totalConv > 0 ? Math.round(totalSpent / totalConv) : null;
  const overallCtr      = totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(2) : null;

  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>;

  if (campaigns.length === 0) {
    return (
      <div className="cp-empty-state" style={{ padding: 60 }}>
        <i className="bi bi-megaphone" style={{ fontSize: 42 }} />
        <div style={{ marginTop: 12, fontWeight: 700, color: "#1e293b", fontSize: 16 }}>Ad Campaigns</div>
        <div style={{ marginTop: 6 }}>Campaign performance data will appear here once synced.</div>
      </div>
    );
  }

  return (
    <div style={{ minWidth: 0, overflow: "hidden" }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Spend",       value: activeCampaigns.length > 0 ? fmtCurrFull(totalSpent) : currSym + "0",   sub: activeCampaigns.length > 0 ? `${activeCampaigns.length} active campaign${activeCampaigns.length > 1 ? "s" : ""}` : "no active campaigns", color: "#F97316", icon: "bi-credit-card" },
          { label: "Reach",             value: fmtNum(totalReach),        sub: activeCampaigns.length > 0 ? (totalReach ? "unique people" : "no data yet") : "no active campaigns",  color: "#8B5CF6", icon: "bi-eye" },
          { label: "Impressions",       value: fmtNum(totalImpr),         sub: activeCampaigns.length > 0 ? (totalImpr ? "total impressions" : "no data yet") : "no active campaigns", color: "#0EA5E9", icon: "bi-bar-chart" },
          { label: "Leads / Results",   value: totalConv > 0 ? totalConv.toLocaleString("en-IN") : "—", sub: activeCampaigns.length > 0 ? (totalConv ? "total conversions" : "no data yet") : "no active campaigns", color: "#10B981", icon: "bi-person-check" },
          { label: "Link Clicks",       value: fmtNum(totalClicks),       sub: activeCampaigns.length > 0 ? (overallCtr ? `CTR ${overallCtr}%` : "no data yet") : "no active campaigns", color: "#6366F1", icon: "bi-cursor" },
          { label: "Landing Page Views",value: fmtNum(totalLpViews),      sub: activeCampaigns.length > 0 ? (totalLpViews ? "total LP views" : "no data yet") : "no active campaigns",  color: "#7C3AED", icon: "bi-box-arrow-in-right" },
          { label: "Cost Per Lead",     value: avgCpa ? fmtCurr(avgCpa) : "—", sub: activeCampaigns.length > 0 ? "avg across active campaigns" : "no active campaigns", color: "#EF4444", icon: "bi-tag" },
        ].map(s => (
          <div key={s.label} className="cp-card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 12 }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5 }}>{s.label}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Campaign details table */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #E2E8F0", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8 }}>
          <i className="bi bi-broadcast" style={{ color: "#F97316" }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>All Campaigns</span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{activeCampaigns.length} live · {campaigns.length} total</span>
          <button onClick={loadCampaigns} style={{ marginLeft: "auto", padding: "4px 12px", border: "1.5px solid #E2E8F0", borderRadius: 7, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="bi bi-arrow-clockwise" /> Refresh
          </button>
        </div>
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 320px)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1300 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr style={{ background: "#FAFAFA" }}>
                {["Campaign", "Budget", "Results", "Reach", "Frequency", "Cost / Result", "Link Clicks", "Amount Spent", "CPM", "CTR", "LP Views", "Cost / LP View", "Status"].map(h => (
                  <th key={h} style={{ padding: "9px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, color: "#94a3b8", textAlign: "left", borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap", background: "#FAFAFA" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const p        = c.performance || {};
                const spent    = p.spent || 0;
                const impr     = p.impressions || 0;
                const reach    = p.reach || 0;
                const convs    = p.conversions || 0;
                const lc       = p.linkClicks || 0;
                const lpv      = p.landingPageViews || 0;
                const freq     = reach > 0 ? (impr / reach).toFixed(2) : "—";
                const cpr      = convs > 0 ? parseFloat((spent / convs).toFixed(2)) : null;
                const cpm      = impr  > 0 ? parseFloat(((spent / impr) * 1000).toFixed(2)) : null;
                const ctr      = p.ctr != null ? parseFloat(p.ctr.toFixed(2)) : null;
                const cplp     = lpv   > 0 ? parseFloat((spent / lpv).toFixed(2)) : null;
                const spentPct = c.budget > 0 ? Math.min(100, Math.round((spent / c.budget) * 100)) : 0;
                return (
                  <tr key={c._id} style={{ borderBottom: "1px solid #F8FAFC" }}>
                    {/* Campaign */}
                    <td style={{ padding: "12px 14px", minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>{c.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#F1F5F9", color: PLATFORM_COLOR[c.platform] || "#64748b" }}>
                        {PLATFORM_LABEL[c.platform] || c.platform}
                      </span>
                    </td>
                    {/* Budget */}
                    <td style={{ padding: "12px 14px", minWidth: 110 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{c.budget ? fmtCurr(c.budget) + " Daily" : "—"}</div>
                      {c.budget > 0 && (
                        <div style={{ marginTop: 4, height: 3, width: 70, background: "#F1F5F9", borderRadius: 4 }}>
                          <div style={{ height: "100%", width: `${spentPct}%`, background: spentPct > 85 ? "#EF4444" : "#F97316", borderRadius: 4 }} />
                        </div>
                      )}
                    </td>
                    {/* Results */}
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: convs > 0 ? "#10B981" : "#94a3b8" }}>
                      {convs > 0 ? (<><div style={{ fontSize: 14 }}>{convs.toLocaleString()}</div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>Leads (Form)</div></>) : "—"}
                    </td>
                    {/* Reach */}
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: reach > 0 ? "#374151" : "#94a3b8" }}>{reach > 0 ? fmtNum(reach) : "—"}</td>
                    {/* Frequency */}
                    <td style={{ padding: "12px 14px", color: "#374151" }}>{freq}</td>
                    {/* Cost/Result */}
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: cpr ? "#F59E0B" : "#94a3b8" }}>
                      {cpr ? (<><div>{currSym}{cpr.toFixed(2)}</div><div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>per lead</div></>) : "—"}
                    </td>
                    {/* Link Clicks */}
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: lc > 0 ? "#6366F1" : "#94a3b8" }}>{lc > 0 ? fmtNum(lc) : "—"}</td>
                    {/* Amount Spent */}
                    <td style={{ padding: "12px 14px", fontWeight: 800, color: spent > 0 ? "#F97316" : "#94a3b8" }}>
                      {spent > 0 ? `${currSym}${spent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                    </td>
                    {/* CPM */}
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: cpm ? "#374151" : "#94a3b8" }}>{cpm ? `${currSym}${cpm.toFixed(2)}` : "—"}</td>
                    {/* CTR */}
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: ctr != null ? "#374151" : "#94a3b8" }}>{ctr != null ? `${ctr.toFixed(2)}%` : "—"}</td>
                    {/* LP Views */}
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: lpv > 0 ? "#7C3AED" : "#94a3b8" }}>{lpv > 0 ? fmtNum(lpv) : "—"}</td>
                    {/* Cost / LP View */}
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: cplp ? "#7C3AED" : "#94a3b8" }}>{cplp ? `${currSym}${cplp.toFixed(2)}` : "—"}</td>
                    {/* Status */}
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: STATUS_BG[c.status] || "#F1F5F9", color: STATUS_COLOR[c.status] || "#64748b" }}>
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr style={{ background: "#FAFAFA", borderTop: "2px solid #F1F5F9" }}>
                <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>
                  {campaigns.length} campaigns
                </td>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: "#374151", fontSize: 12 }}>
                  {activeCampaigns.length > 0 ? fmtCurr(totalBudget) + " /day" : "—"}
                </td>
                <td style={{ padding: "10px 14px", fontWeight: 800, color: "#10B981" }}>{totalConv > 0 ? totalConv.toLocaleString() : "—"}</td>
                <td style={{ padding: "10px 14px", fontWeight: 700 }}>{fmtNum(totalReach)}</td>
                <td style={{ padding: "10px 14px", color: "#94a3b8" }}>—</td>
                <td style={{ padding: "10px 14px", color: "#94a3b8" }}>—</td>
                <td style={{ padding: "10px 14px", fontWeight: 700 }}>{fmtNum(totalClicks)}</td>
                <td style={{ padding: "10px 14px", fontWeight: 800, color: "#F97316" }}>
                  {totalSpent > 0 ? `${currSym}${totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </td>
                <td style={{ padding: "10px 14px", color: "#94a3b8" }}>—</td>
                <td style={{ padding: "10px 14px", color: "#94a3b8" }}>—</td>
                <td style={{ padding: "10px 14px", fontWeight: 700 }}>{fmtNum(totalLpViews)}</td>
                <td style={{ padding: "10px 14px", color: "#94a3b8" }}>—</td>
                <td style={{ padding: "10px 14px", color: "#94a3b8" }}>—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* CPA summary */}
      {avgCpa && (
        <div className="cp-card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Cost Per Acquisition</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#F97316" }}>{fmtCurr(avgCpa)}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>avg across all campaigns</div>
          </div>
          <div style={{ width: 1, height: 60, background: "#F1F5F9" }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Total All-time Spend</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>{fmtCurrFull(totalSpent)}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{totalConv} total conversions · {fmtNum(totalReach)} reach</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Nav config ─────────────────────────────────────────────────────────── */
const NAV = {
  services: [
    { key: "overview",   label: "Overview",        icon: "bi-grid-1x2" },
    { key: "social",     label: "Social Media",    icon: "bi-instagram" },
    { key: "seo",        label: "SEO",             icon: "bi-graph-up-arrow" },
    { key: "web",        label: "Web Development", icon: "bi-code-slash" },
    { key: "ads",        label: "Ad Campaigns",    icon: "bi-megaphone" },
  ],
  socialMedia: [
    { key: "calendar",   label: "Content Calendar",icon: "bi-calendar3" },
    { key: "approvals",  label: "Approvals",       icon: "bi-check2-circle", badgeKey: "awaitingYou" },
  ],
  inbox: [
    { key: "messages",   label: "Messages",          icon: "bi-chat-dots" },
    { key: "offers",     label: "Offers",             icon: "bi-gift" },
    { key: "request",    label: "Request a Task",    icon: "bi-plus-circle" },
    { key: "myrequests", label: "My Requests",       icon: "bi-list-task" },
  ],
};

/* ─── Main dashboard ─────────────────────────────────────────────────────── */
export default function ClientDashboard() {
  const router     = useRouter();
  const { brand: brandSlug } = router.query;

  const [client, setClient]   = useState(null);
  const [brands, setBrands]   = useState([]);
  const [brand, setBrand]     = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState("overview");
  const { offers: activeOffers } = useOffers(brandSlug);

  // Search + notification state
  const [searchQ, setSearchQ]       = useState("");
  const [notifOpen, setNotifOpen]   = useState(false);
  const searchRef = useRef(null);
  const notifRef  = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDown(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchQ("");
      if (notifRef.current  && !notifRef.current.contains(e.target))  setNotifOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Load client + brands
  useEffect(() => {
    fetch("/api/client/me")
      .then(r => r.json())
      .then(d => {
        if (!d.success) { router.push(`/${brandSlug}/login`); return; }
        setClient(d.client);
        setBrands(d.brands || []);
        const b = (d.brands || []).find(x => x.slug === brandSlug) || d.brands?.[0];
        setBrand(b);
      })
      .catch(() => router.push(`/${brandSlug}/login`));
  }, [brandSlug]);

  // Load overview when brand is known
  const loadOverview = useCallback(() => {
    if (!brandSlug) return;
    fetch(`/api/client/overview?brandSlug=${brandSlug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setOverview(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [brandSlug]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  async function logout() {
    await fetch("/api/client/auth/logout");
    router.push(`/${brandSlug}/login`);
  }

  function switchBrand(slug) {
    router.push(`/${slug}`);
  }

  if (!client && loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="cp-spinner" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 14, color: "#64748b" }}>Loading your portal…</div>
        </div>
      </div>
    );
  }

  const stats = overview?.stats || {};
  const awaitingBadge = stats.awaitingYou > 0 ? stats.awaitingYou : 0;

  // Search index built from loaded overview data
  const searchIndex = [
    ...(overview?.pending   || []).map(t => ({ id: t._id, label: t.nomenclature || t.title, sub: "Awaiting your approval", nav: "approvals", icon: "bi-check2-circle", color: "#5A57FB" })),
    ...(overview?.thisWeek  || []).map(t => ({ id: t._id, label: t.nomenclature || t.title, sub: "This week",              nav: "calendar",  icon: "bi-calendar3",      color: "#0EA5E9" })),
    ...(overview?.delivered || []).map(t => ({ id: t._id, label: t.nomenclature || t.title, sub: "Delivered",              nav: "social",    icon: "bi-check-circle",   color: "#22C55E" })),
    ...activeOffers.map(o =>           ({ id: o._id, label: o.title,                        sub: "Offer",                  nav: "offers",    icon: "bi-gift",           color: "#F59E0B" })),
  ];
  const searchResults = searchQ.trim().length > 1
    ? searchIndex.filter(i => i.label.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 7)
    : [];

  // Notification items
  const notifItems = [
    ...(overview?.pending || []).map(t => ({
      id: t._id, nav: "approvals",
      icon: "bi-check2-circle", bg: "#EEF2FF", color: "#4F46E5",
      title: "Approval needed", sub: t.nomenclature || t.title,
      time: fmtAgo(t.updatedAt || t.createdAt),
    })),
    ...activeOffers.map(o => ({
      id: o._id, nav: "offers",
      icon: "bi-gift", bg: "#FEF9C3", color: "#B45309",
      title: "Special offer", sub: o.title,
      time: fmtAgo(o.createdAt),
    })),
  ];
  const totalNotifs = notifItems.length;

  const TITLES = {
    overview: "Overview",
    social: "Social Media",
    seo: "SEO",
    web: "Web Development",
    ads: "Ad Campaigns",
    branding: "Branding",
    report: "Combined Report",
    calendar: "Content Calendar",
    approvals: "Approvals",
    messages: "Messages",
    offers: "Offers & Announcements",
    request: "Request a Task",
    myrequests: "My Requests",
    invoices: "Invoices",
    assets: "Brand Assets",
    profile: "Profile",
  };

  return (
    <>
      <Head>
        <title>{brand?.name || "Client Portal"} · Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      </Head>
      <style>{PORTAL_CSS}</style>

      <div className="cp-layout">
        {/* ── Sidebar ── */}
        <aside className="cp-sidebar">
          {/* Header — logo + brand name (no dropdown) */}
          <div className="cp-sb-header">
            <div className="cp-sb-logo-row">
              <img src="/asets/images/logo.png" alt="Viralon" className="cp-sb-logo-img"
                onError={e => { e.target.style.display = "none"; }} />
            </div>
            <div className="cp-brand-display">
              <span className="cp-brand-dot-live" style={{ background: brand?.color || "#02EBAD", boxShadow: `0 0 6px ${brand?.color || "#02EBAD"}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cp-brand-display-name">{brand?.name || brandSlug}</div>
                <div className="cp-brand-display-sub">CLIENT PORTAL</div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="cp-nav-section">
            <div className="cp-nav-label">Services</div>
            {NAV.services.map(item => (
              <button key={item.key} className={`cp-nav-item ${view === item.key ? "active" : ""}`} onClick={() => setView(item.key)}>
                <i className={`bi ${item.icon}`} style={{ fontSize: 15, width: 18, flexShrink: 0 }} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Social Media */}
          <div className="cp-nav-section">
            <div className="cp-nav-label">Social Media</div>
            {NAV.socialMedia.map(item => (
              <button key={item.key} className={`cp-nav-item ${view === item.key ? "active" : ""}`} onClick={() => setView(item.key)}>
                <i className={`bi ${item.icon}`} style={{ fontSize: 15, width: 18, flexShrink: 0 }} />
                {item.label}
                {item.badgeKey && awaitingBadge > 0 && (
                  <span className="cp-nav-badge amber">{awaitingBadge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Inbox */}
          <div className="cp-nav-section">
            <div className="cp-nav-label">Communication</div>
            {NAV.inbox.map(item => (
              <button key={item.key} className={`cp-nav-item ${view === item.key ? "active" : ""}`}
                onClick={() => setView(item.key)}>
                <i className={`bi ${item.icon}`} style={{ fontSize: 15, width: 18, flexShrink: 0 }} />
                {item.label}
                {item.key === "offers" && activeOffers.length > 0 && (
                  <span className="cp-nav-badge" style={{ background: "#5A57FB" }}>{activeOffers.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Bottom user chip */}
          <div className="cp-sidebar-bottom">
            <div className="cp-user-chip">
              <div className="cp-user-av">{initials(client?.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cp-user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client?.name}</div>
                <div className="cp-user-sub">{brand?.name}</div>
              </div>
              <button onClick={logout} title="Logout" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)", fontSize: 15, transition: "color .15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#02EBAD"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.3)"}>
                <i className="bi bi-box-arrow-right" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="cp-main">
          {/* Topbar */}
          <div className="cp-topbar">
            <div className="cp-topbar-title">{TITLES[view] || "Dashboard"}</div>

            {/* ── Search ── */}
            <div className="cp-search" ref={searchRef} style={{ position: "relative" }}>
              <i className="bi bi-search" />
              <input
                placeholder="Search tasks, offers…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                style={{ transition: "border-color .15s" }}
                onFocus={e => e.target.style.borderColor = "#5A57FB"}
                onBlur={e => e.target.style.borderColor = ""}
              />
              {searchResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
                  background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12,
                  boxShadow: "0 8px 28px rgba(0,0,0,.1)", zIndex: 200, overflow: "hidden",
                }}>
                  {searchResults.map((item, i) => (
                    <div key={item.id + i}
                      onClick={() => { setView(item.nav); setSearchQ(""); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", cursor: "pointer",
                        borderBottom: i < searchResults.length - 1 ? "1px solid #F8FAFC" : "none",
                        transition: "background .1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: item.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className={`bi ${item.icon}`} style={{ fontSize: 13, color: item.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>{item.sub}</div>
                      </div>
                      <i className="bi bi-arrow-right" style={{ fontSize: 11, color: "#CBD5E1" }} />
                    </div>
                  ))}
                </div>
              )}
              {searchQ.trim().length > 1 && searchResults.length === 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
                  background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12,
                  boxShadow: "0 8px 28px rgba(0,0,0,.1)", zIndex: 200,
                  padding: "18px", textAlign: "center", fontSize: 13, color: "#94A3B8",
                }}>
                  No results for &ldquo;{searchQ}&rdquo;
                </div>
              )}
            </div>

            {/* ── Notifications ── */}
            <div style={{ position: "relative" }} ref={notifRef}>
              <div className="cp-icon-btn" onClick={() => setNotifOpen(v => !v)}
                style={{ background: notifOpen ? "#F1F5F9" : "" }}>
                <i className="bi bi-bell" />
                {totalNotifs > 0 && <span className="badge">{totalNotifs}</span>}
              </div>
              {notifOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0,
                  width: 320, background: "#fff",
                  border: "1.5px solid #E2E8F0", borderRadius: 14,
                  boxShadow: "0 12px 36px rgba(0,0,0,.12)", zIndex: 200, overflow: "hidden",
                }}>
                  {/* Header */}
                  <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Notifications</span>
                    {totalNotifs > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#EEF2FF", color: "#4F46E5" }}>{totalNotifs} new</span>
                    )}
                  </div>
                  {/* Items */}
                  {notifItems.length === 0 ? (
                    <div style={{ padding: "28px 16px", textAlign: "center" }}>
                      <i className="bi bi-bell-slash" style={{ fontSize: 24, color: "#CBD5E1", display: "block", marginBottom: 8 }} />
                      <div style={{ fontSize: 13, color: "#94A3B8" }}>You're all caught up</div>
                    </div>
                  ) : notifItems.map((n, i) => (
                    <div key={n.id + i}
                      onClick={() => { setView(n.nav); setNotifOpen(false); }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "12px 16px", cursor: "pointer",
                        borderBottom: i < notifItems.length - 1 ? "1px solid #F8FAFC" : "none",
                        transition: "background .1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FAFBFF"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: n.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <i className={`bi ${n.icon}`} style={{ fontSize: 14, color: n.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.sub}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                  {notifItems.length > 0 && (
                    <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9", textAlign: "center" }}>
                      <button onClick={() => { setView("approvals"); setNotifOpen(false); }}
                        style={{ fontSize: 12, fontWeight: 600, color: "#5A57FB", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                        View all approvals →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="cp-req-btn" onClick={() => setView("request")}>
              + Request Task
            </button>
          </div>

          {/* Content */}
          <div className="cp-content">
            {loading && !overview ? (
              <div className="cp-loading"><div className="cp-spinner" /></div>
            ) : (
              <>
                {view === "overview"   && <OverviewView client={client} brand={brand} overview={overview} onRefresh={loadOverview} setView={setView} />}
                {view === "social"     && <SocialMediaView overview={overview} brand={brand} onRefresh={loadOverview} setView={setView} />}
                {view === "approvals"  && <ApprovalsView overview={overview} onRefresh={loadOverview} />}
                {view === "calendar"   && <CalendarView overview={overview} brand={brand} />}
                {view === "seo"        && <SeoView brandSlug={brandSlug} />}
                {view === "web"        && <WebDevView />}
                {view === "ads"        && <AdCampaignsView brandSlug={brandSlug} />}
                {view === "branding"   && <ComingSoon icon="bi-palette"        title="Branding"       desc="Brand project tracker coming soon." />}
                {view === "report"     && <ComingSoon icon="bi-bar-chart-line" title="Combined Report" desc="Your full cross-service report coming soon." />}
                {view === "messages"   && <MessagesView brandSlug={brandSlug} client={client} />}
                {view === "offers"     && <OffersView brandSlug={brandSlug} />}
                {view === "request"    && <RequestTaskView brand={brand} client={client} setView={setView} />}
                {view === "myrequests" && <MyRequestsView brand={brand} setView={setView} />}
                {view === "invoices"   && <ComingSoon icon="bi-receipt"        title="Invoices"       desc="Your invoices and billing history coming soon." />}
                {view === "assets"     && <ComingSoon icon="bi-images"         title="Brand Assets"   desc="Download your logos, guidelines and brand assets here." />}
                {view === "profile"    && <ComingSoon icon="bi-person"         title="Profile"        desc="Manage your account settings." />}
              </>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
