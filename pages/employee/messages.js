import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import EmployeeLeftbar from "@/components/employee/Leftbar";
import Dashnav from "@/components/Dashnav";
import LeftbarMobile from "@/components/employee/LeftbarMobile";

const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("employeeToken") || "" : "");
const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

function timeAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateLabel(d) {
  if (!d) return "";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt = new Date(d); dt.setHours(0, 0, 0, 0);
  const diff = (today - dt) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function brandInitials(name) {
  return (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}
const BRAND_COLORS = ["#5A57FB", "#E11D48", "#0EA5E9", "#16A34A", "#F97316", "#8B5CF6"];
function brandColor(name) {
  let h = 0;
  for (const c of (name || "")) h = ((h << 5) - h) + c.charCodeAt(0);
  return BRAND_COLORS[Math.abs(h) % BRAND_COLORS.length];
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

export default function EmployeeMessages() {
  const router = useRouter();
  const [brands, setBrands]               = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState("");
  const [attachments, setAttachments]     = useState([]);
  const [linkName, setLinkName]           = useState("");
  const [linkUrl, setLinkUrl]             = useState("");
  const [showLink, setShowLink]           = useState(false);
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [error, setError]                 = useState("");
  const [authorized, setAuthorized]       = useState(true);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  useEffect(() => { fetchBrands(); }, []);

  async function fetchBrands() {
    setLoading(true);
    const r = await fetch("/api/employee/client-messages", { headers: authH() }).catch(() => null);
    if (!r) { setLoading(false); return; }
    if (r.status === 401) { router.push("/employee/login"); return; }
    if (r.status === 403) { setAuthorized(false); setLoading(false); return; }
    const d = await r.json();
    if (d.success) setBrands(d.brands || []);
    setLoading(false);
  }

  async function selectBrand(brand) {
    setSelectedBrand(brand);
    setMessages([]);
    clearInterval(pollRef.current);
    await loadThread(brand._id);
    pollRef.current = setInterval(() => loadThread(brand._id), 8000);
    setBrands(prev => prev.map(b => b._id === brand._id ? { ...b, unread: 0 } : b));
  }

  async function loadThread(brandId) {
    const r = await fetch(`/api/employee/client-messages/${brandId}`, { headers: authH() }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) setMessages(d.messages || []);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function send() {
    if (!selectedBrand || (!text.trim() && attachments.length === 0)) return;
    setSending(true);
    setError("");
    const r = await fetch(`/api/employee/client-messages/${selectedBrand._id}`, {
      method: "POST", headers: authH(),
      body: JSON.stringify({ text, attachments }),
    }).catch(() => null);
    if (!r) { setError("Network error"); setSending(false); return; }
    const d = await r.json();
    if (d.success) {
      setMessages(prev => [...prev, d.message]);
      setText(""); setAttachments([]);
    } else {
      setError(d.message || "Failed to send");
    }
    setSending(false);
  }

  function addLink() {
    if (!linkUrl.trim()) return;
    setAttachments(prev => [...prev, { name: linkName.trim() || linkUrl.trim(), url: linkUrl.trim() }]);
    setLinkName(""); setLinkUrl(""); setShowLink(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const grouped = groupByDate(messages);

  return (
    <div>
      <Head>
        <title>Client Messages — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </Head>

      <style>{`
        .em-layout { display: flex; height: calc(100vh - 60px); overflow: hidden; background: #F8FAFC; }
        .em-brands { width: 270px; border-right: 1px solid #E2E8F0; display: flex; flex-direction: column; background: #fff; flex-shrink: 0; }
        .em-brands-hdr { padding: 16px; border-bottom: 1px solid #E2E8F0; }
        .em-brands-title { font-size: 14px; font-weight: 700; color: #0f172a; }
        .em-brands-sub   { font-size: 11.5px; color: #94a3b8; margin-top: 2px; }
        .em-brand-list { flex: 1; overflow-y: auto; }
        .em-brand-item { display: flex; align-items: center; gap: 10px; padding: 11px 14px; cursor: pointer; border-bottom: 1px solid #F8FAFC; transition: background .1s; }
        .em-brand-item:hover    { background: #F8FAFC; }
        .em-brand-item.selected { background: #EEF2FF; border-right: 2.5px solid #4F46E5; }
        .em-brand-av { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .em-brand-info { flex: 1; min-width: 0; }
        .em-brand-row { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
        .em-brand-name { font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
        .em-brand-time { font-size: 10.5px; color: #94a3b8; white-space: nowrap; }
        .em-brand-last { font-size: 11.5px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; margin-top: 1px; }
        .em-badge { background: #EF4444; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; white-space: nowrap; }
        .em-chat { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .em-chat-hdr { padding: 13px 20px; background: #fff; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 12px; }
        .em-chat-name { font-size: 14px; font-weight: 700; color: #0f172a; }
        .em-chat-client { font-size: 12px; color: #64748b; }
        .em-thread { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 3px; }
        .em-date-sep { text-align: center; margin: 12px 0 8px; }
        .em-date-sep span { font-size: 11px; color: #94a3b8; background: #F1F5F9; padding: 3px 12px; border-radius: 10px; font-weight: 600; }
        .em-brow { display: flex; gap: 7px; align-items: flex-end; margin-bottom: 5px; }
        .em-brow.team   { justify-content: flex-start; }
        .em-brow.client { justify-content: flex-end; }
        .em-av-sm { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: #fff; flex-shrink: 0; margin-bottom: 2px; }
        .em-bubble { max-width: 72%; min-width: 80px; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.55; overflow-wrap: break-word; word-break: normal; }
        .em-bubble.team   { background: #fff; border: 1.5px solid #E2E8F0; color: #0f172a; border-bottom-left-radius: 4px; }
        .em-bubble.client { background: #4F46E5; color: #fff; border-bottom-right-radius: 4px; }
        .em-bname { font-size: 10.5px; font-weight: 600; color: #64748b; margin-bottom: 3px; }
        .em-btime { font-size: 10px; margin-top: 5px; text-align: right; }
        .em-bubble.team .em-btime   { color: #94a3b8; }
        .em-bubble.client .em-btime { color: rgba(255,255,255,.5); }
        .em-blink { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; }
        .em-bubble.team .em-blink   { background: #EEF2FF; color: #4F46E5; }
        .em-bubble.client .em-blink { background: rgba(255,255,255,.18); color: #fff; }
        .em-input { padding: 14px 18px; background: #fff; border-top: 1px solid #E2E8F0; }
        .em-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .em-chip  { display: flex; align-items: center; gap: 5px; padding: 4px 10px; background: #EEF2FF; border-radius: 8px; font-size: 12px; font-weight: 600; color: #4F46E5; }
        .em-chip button { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; line-height: 1; }
        .em-input-row { display: flex; gap: 8px; align-items: flex-end; }
        .em-ta { flex: 1; padding: 9px 13px; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 13.5px; font-family: inherit; resize: none; outline: none; min-height: 40px; max-height: 120px; color: #0f172a; background: #F8FAFC; line-height: 1.5; }
        .em-ta:focus { border-color: #4F46E5; background: #fff; }
        .em-link-btn { padding: 8px 12px; background: #F1F5F9; border: 1.5px solid #E2E8F0; border-radius: 9px; font-size: 12.5px; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 5px; font-family: inherit; flex-shrink: 0; white-space: nowrap; }
        .em-send-btn { padding: 9px 16px; background: #4F46E5; color: #fff; border: none; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; font-family: inherit; flex-shrink: 0; }
        .em-send-btn:disabled { opacity: .45; cursor: not-allowed; }
        .em-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 8px; }
        .em-no-sel { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #94a3b8; background: #F8FAFC; }
        .em-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.38); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .em-modal-box { background: #fff; border-radius: 14px; padding: 26px; width: 380px; }
        .em-modal-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
        .em-field { margin-bottom: 12px; }
        .em-field label { font-size: 11px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .5px; }
        .em-field input { width: 100%; padding: 9px 12px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; color: #0f172a; }
        .em-field input:focus { border-color: #4F46E5; }
        .em-modal-actions { display: flex; gap: 8px; margin-top: 4px; }
        .em-btn-pri { padding: 9px 18px; background: #4F46E5; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .em-btn-sec { padding: 9px 18px; background: #F1F5F9; color: #475569; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .em-error { background: #FEF2F2; color: #DC2626; padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .em-error button { background: none; border: none; cursor: pointer; color: #DC2626; margin-left: auto; }
      `}</style>

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home" style={{ paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}>
            {!authorized ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 10, color: "#64748b" }}>
                <i className="bi bi-lock" style={{ fontSize: 36, color: "#CBD5E1" }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Access Restricted</div>
                <div style={{ fontSize: 13 }}>This page is available to Digital Marketing department employees only.</div>
              </div>
            ) : (
              <div className="em-layout">
                {/* Brand sidebar */}
                <div className="em-brands">
                  <div className="em-brands-hdr">
                    <div className="em-brands-title">Client Messages</div>
                    <div className="em-brands-sub">Select a brand to view the conversation</div>
                  </div>
                  <div className="em-brand-list">
                    {loading && (
                      <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
                        Loading...
                      </div>
                    )}
                    {!loading && brands.length === 0 && (
                      <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
                        No brands found
                      </div>
                    )}
                    {brands.map(b => (
                      <div
                        key={b._id}
                        className={`em-brand-item ${selectedBrand?._id === b._id ? "selected" : ""}`}
                        onClick={() => selectBrand(b)}
                      >
                        <div className="em-brand-av" style={{ background: brandColor(b.name) }}>
                          {brandInitials(b.name)}
                        </div>
                        <div className="em-brand-info">
                          <div className="em-brand-row">
                            <div className="em-brand-name">{b.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              {b.lastMsg && <span className="em-brand-time">{timeAgo(b.lastMsg.createdAt)}</span>}
                              {b.unread > 0 && <span className="em-badge">{b.unread}</span>}
                            </div>
                          </div>
                          <div className="em-brand-last">
                            {b.lastMsg ? (
                              <>
                                {b.lastMsg.senderRole === "team" ? <span style={{ color: "#5A57FB" }}>You: </span> : ""}
                                {b.lastMsg.text || (b.lastMsg.attachments?.length ? "Shared a link" : "—")}
                              </>
                            ) : (
                              <span style={{ fontStyle: "italic" }}>No messages yet</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat area */}
                {!selectedBrand ? (
                  <div className="em-no-sel">
                    <i className="bi bi-chat-dots" style={{ fontSize: 38, color: "#CBD5E1" }} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Select a brand to view messages</div>
                  </div>
                ) : (
                  <div className="em-chat">
                    <div className="em-chat-hdr">
                      <div className="em-brand-av" style={{ background: brandColor(selectedBrand.name), width: 34, height: 34, borderRadius: 8, fontSize: 11 }}>
                        {brandInitials(selectedBrand.name)}
                      </div>
                      <div>
                        <div className="em-chat-name">{selectedBrand.name}</div>
                        <div className="em-chat-client">{selectedBrand.client?.name || selectedBrand.client?.email || ""}</div>
                      </div>
                      <div style={{ marginLeft: "auto" }}>
                        <button
                          onClick={fetchBrands}
                          style={{ background: "#F1F5F9", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                        >
                          <i className="bi bi-arrow-clockwise" /> Refresh
                        </button>
                      </div>
                    </div>

                    <div className="em-thread">
                      {messages.length === 0 ? (
                        <div className="em-empty">
                          <i className="bi bi-chat" style={{ fontSize: 36, color: "#CBD5E1" }} />
                          <div style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</div>
                          <div style={{ fontSize: 13 }}>Start the conversation with this client</div>
                        </div>
                      ) : (
                        grouped.map((item, idx) => {
                          if (item.type === "date") {
                            return (
                              <div key={`d${idx}`} className="em-date-sep">
                                <span>{item.label}</span>
                              </div>
                            );
                          }
                          const m = item.data;
                          const isTeam = m.senderRole === "team";
                          return (
                            <div key={m._id} className={`em-brow ${isTeam ? "team" : "client"}`}>
                              {isTeam && (
                                <div className="em-av-sm" style={{ background: "#5A57FB" }}>
                                  {(m.senderName || "T").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                {isTeam && <div className="em-bname">{m.senderName}</div>}
                                <div className={`em-bubble ${isTeam ? "team" : "client"}`}>
                                  {m.text && <div>{m.text}</div>}
                                  {(m.attachments || []).map((a, i) => (
                                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className="em-blink">
                                      <i className="bi bi-link-45deg" style={{ fontSize: 13 }} />
                                      {a.name}
                                    </a>
                                  ))}
                                  <div className="em-btime">{fmtTime(m.createdAt)}</div>
                                </div>
                              </div>
                              {!isTeam && (
                                <div className="em-av-sm" style={{ background: "#E11D48" }}>
                                  {(m.senderName || "C").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      <div ref={bottomRef} />
                    </div>

                    <div className="em-input">
                      {error && (
                        <div className="em-error">
                          {error}
                          <button onClick={() => setError("")}><i className="bi bi-x" /></button>
                        </div>
                      )}
                      {attachments.length > 0 && (
                        <div className="em-chips">
                          {attachments.map((a, i) => (
                            <div key={i} className="em-chip">
                              <i className="bi bi-link-45deg" />
                              <span>{a.name}</span>
                              <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}>
                                <i className="bi bi-x" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="em-input-row">
                        <button className="em-link-btn" onClick={() => setShowLink(true)}>
                          <i className="bi bi-link-45deg" /> Attach Link
                        </button>
                        <textarea
                          className="em-ta"
                          rows={1}
                          placeholder="Type a message..."
                          value={text}
                          onChange={e => setText(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                        <button
                          className="em-send-btn"
                          onClick={send}
                          disabled={sending || (!text.trim() && attachments.length === 0)}
                        >
                          <i className={`bi ${sending ? "bi-hourglass" : "bi-send"}`} />
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Link attachment modal */}
      {showLink && (
        <div className="em-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowLink(false); }}>
          <div className="em-modal-box">
            <div className="em-modal-title">Attach a Google Drive link</div>
            <div className="em-field">
              <label>Display Name</label>
              <input
                placeholder="e.g. Campaign Creative Deck"
                value={linkName}
                onChange={e => setLinkName(e.target.value)}
              />
            </div>
            <div className="em-field">
              <label>Google Drive URL</label>
              <input
                placeholder="https://drive.google.com/..."
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addLink(); }}
              />
            </div>
            <div className="em-modal-actions">
              <button className="em-btn-pri" onClick={addLink}>Attach</button>
              <button className="em-btn-sec" onClick={() => setShowLink(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
