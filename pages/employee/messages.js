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
  const [callRequests, setCallRequests]   = useState([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionTarget, setActionTarget]   = useState(null);
  const [actionType, setActionType]       = useState("approved");
  const [schedDate, setSchedDate]         = useState("");
  const [schedTime, setSchedTime]         = useState("");
  const [adminNote, setAdminNote]         = useState("");
  const [openMenu, setOpenMenu]           = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [meId, setMeId]                   = useState(null);
  const [replyTo, setReplyTo]             = useState(null);
  const [editingId, setEditingId]         = useState(null);
  const bottomRef     = useRef(null);
  const pollRef       = useRef(null);
  const isNearBottom  = useRef(true);
  const textareaRef   = useRef(null);
  const audioRef      = useRef(null);
  const lastMsgIdRef  = useRef(null);
  const msgInitRef    = useRef(false);

  function handleThreadScroll(e) {
    const el = e.currentTarget;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  // Audio setup — unlock on first interaction, use client-music-sound.mp3
  useEffect(() => {
    audioRef.current = new Audio("/sounds/client-music-sound.mp3");
    audioRef.current.volume = 0.7;
    const unlock = () => {
      if (!audioRef.current) return;
      audioRef.current.play()
        .then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; })
        .catch(() => {});
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  function playNotif() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }

  useEffect(() => {
    fetchBrands();
    fetch("/api/employee/me", { headers: authH() })
      .then(r => r.json()).then(d => { if (d.success) setMeId(String(d.employee._id)); })
      .catch(() => {});
  }, []);

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
    setCallRequests([]);
    isNearBottom.current = true;
    clearInterval(pollRef.current);
    await loadThread(brand._id);
    loadCallRequests(brand._id);
    pollRef.current = setInterval(() => loadThread(brand._id), 8000);
    setBrands(prev => prev.map(b => b._id === brand._id ? { ...b, unread: 0 } : b));
  }

  async function loadCallRequests(brandId) {
    try {
      const r = await fetch(`/api/employee/call-requests?brandId=${brandId}`, { headers: authH() });
      const d = await r.json();
      if (d.success) setCallRequests(d.requests || []);
    } catch {}
  }

  async function handleCallAction() {
    if (!actionTarget || !actionType) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/employee/call-requests/${actionTarget._id}`, {
        method: "PATCH",
        headers: authH(),
        body: JSON.stringify({ action: actionType, scheduledDate: schedDate, scheduledTime: schedTime, adminNote }),
      });
      const d = await r.json();
      if (d.success) {
        setCallRequests(prev => prev.map(cr => cr._id === actionTarget._id ? d.request : cr));
        setShowActionModal(false);
        setActionTarget(null);
        setSchedDate(""); setSchedTime(""); setAdminNote("");
      }
    } catch {}
    setActionLoading(false);
  }

  function openActionModal(cr, type) {
    setActionTarget(cr);
    setActionType(type);
    setSchedDate(cr.preferredDate || "");
    setSchedTime(cr.preferredTime || "");
    setAdminNote("");
    setShowActionModal(true);
  }

  async function loadThread(brandId) {
    const r = await fetch(`/api/employee/client-messages/${brandId}`, { headers: authH() }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (!d.success) return;
    const msgs = d.messages || [];
    const lastId = msgs.length > 0 ? String(msgs[msgs.length - 1]._id) : null;
    const lastSenderRole = msgs.length > 0 ? msgs[msgs.length - 1].senderRole : null;
    if (!msgInitRef.current) {
      msgInitRef.current = true;
      lastMsgIdRef.current = lastId;
    } else if (lastId && lastId !== lastMsgIdRef.current && lastSenderRole === "client") {
      lastMsgIdRef.current = lastId;
      playNotif();
    } else if (lastId) {
      lastMsgIdRef.current = lastId;
    }
    setMessages(msgs);
  }

  useEffect(() => {
    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function send() {
    if (!selectedBrand || (!text.trim() && attachments.length === 0)) return;
    isNearBottom.current = true;
    setSending(true);
    setError("");

    if (editingId) {
      const r = await fetch(`/api/employee/client-messages/${selectedBrand._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ messageId: editingId, action: "edit", text }),
      }).catch(() => null);
      if (!r) { setError("Network error"); setSending(false); return; }
      const d = await r.json();
      if (d.success) {
        setMessages(prev => prev.map(m => m._id === editingId ? d.message : m));
        setText(""); setEditingId(null);
      } else setError(d.message || "Failed to edit");
    } else {
      const r = await fetch(`/api/employee/client-messages/${selectedBrand._id}`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ text, attachments, replyTo }),
      }).catch(() => null);
      if (!r) { setError("Network error"); setSending(false); return; }
      const d = await r.json();
      if (d.success) {
        setMessages(prev => [...prev, d.message]);
        setText(""); setAttachments([]); setReplyTo(null);
      } else setError(d.message || "Failed to send");
    }
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
    const r = await fetch(`/api/employee/client-messages/${selectedBrand._id}`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ messageId: m._id, action }),
    }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) {
      if (action === "deleteForMe") setMessages(prev => prev.filter(msg => msg._id !== m._id));
      else setMessages(prev => prev.map(msg => msg._id === m._id ? d.message : msg));
    }
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
        .em-brow.team   { justify-content: flex-end; }
        .em-brow.client { justify-content: flex-start; }
        .em-av-sm { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; color: #fff; flex-shrink: 0; margin-bottom: 2px; }
        .em-bubble { max-width: 72%; min-width: 160px; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.55; overflow-wrap: break-word; word-break: break-word; position: relative; }
        .em-bubble.team   { background: #4F46E5; color: #fff; border-bottom-right-radius: 4px; }
        .em-bubble.client { background: #fff; border: 1.5px solid #E2E8F0; color: #0f172a; border-bottom-left-radius: 4px; }
        .em-bname { font-size: 10.5px; font-weight: 600; color: #64748b; margin-bottom: 3px; }
        .em-btime { font-size: 10px; margin-top: 5px; text-align: right; }
        .em-bubble.team .em-btime   { color: rgba(255,255,255,.5); }
        .em-bubble.client .em-btime { color: #94a3b8; }
        .em-blink { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; }
        .em-bubble.team .em-blink   { background: rgba(255,255,255,.18); color: #fff; }
        .em-bubble.client .em-blink { background: #EEF2FF; color: #4F46E5; }
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
        /* Reply preview inside bubble */
        .em-reply-preview { border-radius: 7px; padding: 5px 9px; margin-bottom: 7px; }
        .em-bubble.team .em-reply-preview  { background: rgba(255,255,255,.18); border-left: 3px solid rgba(255,255,255,.5); }
        .em-bubble.client .em-reply-preview { background: #EEF2FF; border-left: 3px solid #4F46E5; }
        .em-reply-pname { font-size: 10.5px; font-weight: 700; margin-bottom: 1px; }
        .em-bubble.team .em-reply-pname { color: rgba(255,255,255,.9); }
        .em-bubble.client .em-reply-pname { color: #4F46E5; }
        .em-reply-ptext { font-size: 11.5px; opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* Deleted / edited */
        .em-deleted { font-style: italic; opacity: .55; font-size: 13px; display: flex; align-items: center; gap: 5px; }
        .em-edited  { font-size: 9.5px; opacity: .55; margin-left: 4px; }
        /* Inline action buttons (never clip) */
        /* WhatsApp-style message dropdown */
        .em-wa-btn { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; opacity: 0; pointer-events: none; transition: opacity .12s; z-index: 2; }
        .em-bubble.team   .em-wa-btn { background: rgba(0,0,0,.18); color: rgba(255,255,255,.9); }
        .em-bubble.client .em-wa-btn { background: rgba(0,0,0,.09); color: #475569; }
        .em-bubble:hover .em-wa-btn  { opacity: 1; pointer-events: auto; }
        .em-wa-btn:hover { opacity: 1 !important; filter: brightness(.85); }
        .em-wa-dropdown { position: absolute; top: 26px; left: 0; background: #fff; border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,.16); z-index: 200; min-width: 170px; overflow: hidden; border: 1px solid #E2E8F0; }
        .em-wa-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-size: 13px; color: #0f172a; cursor: pointer; background: none; border: none; width: 100%; font-family: inherit; text-align: left; white-space: nowrap; }
        .em-wa-item:hover { background: #F1F5F9; }
        .em-wa-item.danger { color: #EF4444; }
        .em-wa-item.danger:hover { background: #FEF2F2; }
        /* Reply / edit bars */
        .em-reply-bar { display: flex; align-items: center; gap: 8px; background: #EEF2FF; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; }
        .em-edit-bar  { display: flex; align-items: center; gap: 8px; background: #FEF9C3; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; }
        .em-bar-body  { flex: 1; min-width: 0; }
        .em-bar-cancel { background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 6px; font-family: inherit; }
        .em-bar-cancel:hover { background: rgba(0,0,0,.06); }
        .em-req-panel { width: 270px; flex-shrink: 0; border-left: 1px solid #E2E8F0; background: #fff; display: flex; flex-direction: column; overflow: hidden; }
        @media (max-width: 1100px) { .em-req-panel { display: none; } }
        .em-req-hdr { padding: 13px 16px; border-bottom: 1px solid #E2E8F0; }
        .em-req-title { font-size: 13px; font-weight: 700; color: #0f172a; }
        .em-req-sub   { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .em-req-list  { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .em-req-item  { border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; background: #F8FAFC; }
        .em-req-item.pending  { border-color: #FCD34D; background: #FFFBEB; }
        .em-req-item.approved, .em-req-item.scheduled { border-color: #86EFAC; background: #F0FDF4; }
        .em-req-item.rejected { border-color: #FCA5A5; background: #FEF2F2; }
        .em-req-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-bottom: 6px; }
        .em-req-badge.pending   { background: #FEF9C3; color: #A16207; }
        .em-req-badge.approved, .em-req-badge.scheduled { background: #DCFCE7; color: #15803D; }
        .em-req-badge.rejected  { background: #FEE2E2; color: #DC2626; }
        .em-req-client { font-size: 12px; font-weight: 700; color: #0f172a; }
        .em-req-dt     { font-size: 11.5px; color: #4F46E5; font-weight: 600; margin-top: 2px; }
        .em-req-note   { font-size: 11px; color: #64748b; margin-top: 3px; }
        .em-req-actions { display: flex; gap: 5px; margin-top: 8px; flex-wrap: wrap; }
        .em-req-btn-approve  { padding: 5px 10px; background: #059669; color: #fff; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .em-req-btn-schedule { padding: 5px 10px; background: #4F46E5; color: #fff; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .em-req-btn-reject   { padding: 5px 10px; background: #DC2626; color: #fff; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .em-req-empty { padding: 24px 12px; text-align: center; font-size: 12px; color: #94a3b8; }
        .em-act-modal-bg  { position: fixed; inset: 0; background: rgba(0,0,0,.38); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .em-act-modal-box { background: #fff; border-radius: 14px; padding: 26px; width: 380px; max-width: 95vw; }
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

                {/* Chat area + requests panel */}
                {!selectedBrand ? (
                  <div className="em-no-sel">
                    <i className="bi bi-chat-dots" style={{ fontSize: 38, color: "#CBD5E1" }} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Select a brand to view messages</div>
                  </div>
                ) : (
                  <>
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

                    <div className="em-thread" onScroll={handleThreadScroll}>
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
                          const isTeam  = m.senderRole === "team";
                          const isMyMsg = isTeam && meId && String(m.senderId) === meId;
                          return (
                            <div key={m._id} className={`em-brow ${isTeam ? "team" : "client"}`}>
                              {!isTeam && (
                                <div className="em-av-sm" style={{ background: "#E11D48" }}>
                                  {(m.senderName || "C").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                {!isTeam && <div className="em-bname">{m.senderName}</div>}
                                <div className={`em-bubble ${isTeam ? "team" : "client"}`}>
                                  {/* Reply preview */}
                                  {m.replyTo?.msgId && !m.deleted && (
                                    <div className="em-reply-preview">
                                      <div className="em-reply-pname">{m.replyTo.senderName}</div>
                                      <div className="em-reply-ptext">{(m.replyTo.text || "").slice(0, 80)}</div>
                                    </div>
                                  )}
                                  {m.deleted ? (
                                    <div className="em-deleted">
                                      <i className="bi bi-slash-circle" /> This message was deleted
                                    </div>
                                  ) : (
                                    <>
                                      {m.text && (
                                        <div>
                                          {m.text}
                                          {m.edited && <span className="em-edited">(edited)</span>}
                                        </div>
                                      )}
                                      {(m.attachments || []).map((a, i) => (
                                        <a key={i} href={a.url} target="_blank" rel="noreferrer" className="em-blink">
                                          <i className="bi bi-link-45deg" style={{ fontSize: 13 }} />{a.name}
                                        </a>
                                      ))}
                                      {/* WhatsApp-style dropdown */}
                                      <button
                                        className="em-wa-btn"
                                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === m._id ? null : m._id); }}
                                      >
                                        <i className="bi bi-chevron-down" />
                                      </button>
                                      {openMenu === m._id && (
                                        <>
                                          <div style={{ position:"fixed", inset:0, zIndex:199 }} onClick={() => setOpenMenu(null)} />
                                          <div className="em-wa-dropdown" style={isTeam ? { right:0, left:"auto" } : { left:0, right:"auto" }}>
                                            <button className="em-wa-item" onClick={() => { startReply(m); setOpenMenu(null); }}>
                                              <i className="bi bi-reply" /> Reply
                                            </button>
                                            {isMyMsg && (
                                              <button className="em-wa-item" onClick={() => { startEdit(m); setOpenMenu(null); }}>
                                                <i className="bi bi-pencil" /> Edit
                                              </button>
                                            )}
                                            {isMyMsg && (
                                              <button className="em-wa-item danger" onClick={() => { deleteMsg(m, "deleteForAll"); setOpenMenu(null); }}>
                                                <i className="bi bi-trash" /> Delete
                                              </button>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </>
                                  )}
                                  <div className="em-btime">{fmtTime(m.createdAt)}</div>
                                </div>
                              </div>
                              {isTeam && (
                                <div className="em-av-sm" style={{ background: "#5A57FB" }}>
                                  {(m.senderName || "T").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
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
                      {replyTo && (
                        <div className="em-reply-bar">
                          <i className="bi bi-reply-fill" style={{ color: "#4F46E5", flexShrink: 0 }} />
                          <div className="em-bar-body">
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5" }}>Replying to {replyTo.senderName}</div>
                            <div style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(replyTo.text || "").slice(0, 60)}</div>
                          </div>
                          <button className="em-bar-cancel" style={{ color: "#64748b" }} onClick={() => setReplyTo(null)}><i className="bi bi-x" /></button>
                        </div>
                      )}
                      {editingId && (
                        <div className="em-edit-bar">
                          <i className="bi bi-pencil-fill" style={{ color: "#92400E", flexShrink: 0 }} />
                          <div className="em-bar-body" style={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>Editing message</div>
                          <button className="em-bar-cancel" style={{ color: "#92400E" }} onClick={() => { setEditingId(null); setText(""); }}>
                            <i className="bi bi-x" /> Cancel
                          </button>
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
                        {!editingId && (
                          <button className="em-link-btn" onClick={() => setShowLink(true)}>
                            <i className="bi bi-link-45deg" /> Attach Link
                          </button>
                        )}
                        <textarea
                          ref={textareaRef}
                          className="em-ta"
                          rows={1}
                          placeholder={editingId ? "Edit your message..." : "Type a message..."}
                          value={text}
                          onChange={e => setText(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                        <button
                          className="em-send-btn"
                          onClick={send}
                          disabled={sending || (!text.trim() && attachments.length === 0)}
                        >
                          <i className={`bi ${sending ? "bi-hourglass" : editingId ? "bi-check-lg" : "bi-send"}`} />
                          Send
                        </button>
                      </div>
                    </div>
                  </div>

                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Call request action modal */}
      {showActionModal && actionTarget && (
        <div className="em-act-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowActionModal(false); }}>
          <div className="em-act-modal-box">
            <div className="em-modal-title">
              {actionType === "approved"  && "✅ Approve Call Request"}
              {actionType === "scheduled" && "📅 Schedule Meeting"}
              {actionType === "rejected"  && "❌ Reject Call Request"}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
              {actionTarget.clientName} · Preferred: {actionTarget.preferredDate} at {actionTarget.preferredTime}
            </div>

            {actionType !== "rejected" && (
              <>
                <div className="em-field">
                  <label>Confirmed Date</label>
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
                </div>
                <div className="em-field">
                  <label>Confirmed Time</label>
                  <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
                </div>
              </>
            )}

            <div className="em-field">
              <label>Note to client (optional)</label>
              <input
                placeholder={actionType === "rejected" ? "Reason for unavailability..." : "e.g. Google Meet link or agenda..."}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
              />
            </div>

            <div className="em-modal-actions">
              <button
                className="em-btn-pri"
                style={{ background: actionType === "rejected" ? "#DC2626" : actionType === "scheduled" ? "#4F46E5" : "#059669" }}
                onClick={handleCallAction}
                disabled={actionLoading}
              >
                {actionLoading ? "Saving..." : actionType === "approved" ? "Approve & Notify" : actionType === "scheduled" ? "Schedule & Notify" : "Reject & Notify"}
              </button>
              <button className="em-btn-sec" onClick={() => setShowActionModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
