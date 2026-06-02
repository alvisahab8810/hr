import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import EmployeeLeftbar from "@/components/employee/Leftbar";
import Dashnav from "@/components/Dashnav";
import LeftbarMobile from "@/components/employee/LeftbarMobile";

const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("employeeToken") || "" : "");
const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

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
function nameInitials(name) {
  return (name || "?").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();
}
const AV_COLORS = ["#5A57FB","#E11D48","#0EA5E9","#16A34A","#F97316","#8B5CF6","#0891B2","#B45309"];
function avColor(name) {
  let h = 0; for (const c of (name||"")) h = ((h<<5)-h)+c.charCodeAt(0);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}
function groupByDate(msgs) {
  const groups = []; let last = null;
  for (const m of msgs) {
    const d = fmtDateLabel(m.createdAt);
    if (d !== last) { groups.push({ type:"date", label:d }); last = d; }
    groups.push({ type:"msg", data:m });
  }
  return groups;
}
function renderText(text, mentions, isOutgoing = false) {
  if (!text) return null;
  const mentionNames = (mentions || []).map(m => m.name);
  const parts = text.split(/(@\w[\w\s]*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const nm = part.slice(1).trim();
      const isMention = mentionNames.some(n => n.toLowerCase() === nm.toLowerCase()) || part.includes("@");
      if (isMention) return <span key={i} style={{ color: isOutgoing ? "rgba(255,255,255,.9)" : "#4F46E5", fontWeight: 700 }}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function EmployeeCommunity() {
  const router = useRouter();
  const [me, setMe]                           = useState(null);
  const [messages, setMessages]               = useState([]);
  const [text, setText]                       = useState("");
  const [attachments, setAttachments]         = useState([]);
  const [members, setMembers]                 = useState([]);
  const [mentionQuery, setMentionQuery]       = useState("");
  const [showMention, setShowMention]         = useState(false);
  const [mentionIdx, setMentionIdx]           = useState(0);
  const [pendingMentions, setPendingMentions] = useState([]);
  const [showLink, setShowLink]               = useState(false);
  const [linkName, setLinkName]               = useState("");
  const [linkUrl, setLinkUrl]                 = useState("");
  const [sending, setSending]                 = useState(false);
  const [uploading, setUploading]             = useState(false);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [hasMore, setHasMore]                 = useState(true);
  const [error, setError]                     = useState("");
  const [activeTab, setActiveTab]             = useState("community");
  const [dmMessages, setDmMessages]           = useState([]);
  const [dmText, setDmText]                   = useState("");
  const [dmSending, setDmSending]             = useState(false);
  const [hasDm, setHasDm]                     = useState(false);

  // Reply / Edit state
  const [replyTo, setReplyTo]     = useState(null);  // {msgId, senderName, text}
  const [editingId, setEditingId] = useState(null);
  const [hoverMsgId, setHoverMsgId] = useState(null);

  const bottomRef   = useRef(null);
  const dmBottomRef = useRef(null);
  const textareaRef = useRef(null);
  const pollRef     = useRef(null);
  const fileRef     = useRef(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/employee/login"); return; }
    fetch("/api/employee/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setMe(d.employee); else router.push("/employee/login"); })
      .catch(() => router.push("/employee/login"));
  }, []);

  useEffect(() => {
    fetch("/api/team/members", { headers: authH() })
      .then(r => r.json()).then(d => { if (d.success) setMembers(d.members || []); });
  }, []);

  const loadMessages = useCallback(async (prepend = false, before = null) => {
    const url = before ? `/api/team/community?limit=40&before=${before}` : "/api/team/community?limit=40";
    const r = await fetch(url, { headers: authH() }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) {
      if (prepend) {
        setMessages(prev => [...d.messages, ...prev]);
        setHasMore(d.messages.length === 40);
      } else {
        setMessages(d.messages || []);
        setHasMore((d.messages || []).length === 40);
      }
    }
  }, []);

  useEffect(() => {
    loadMessages();
    fetch("/api/team/community", { method: "PUT", headers: authH() }).catch(() => {});
    pollRef.current = setInterval(() => loadMessages(), 10000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const loadDm = useCallback(async () => {
    const r = await fetch("/api/employee/team-dm", { headers: authH() }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) { setDmMessages(d.messages || []); setHasDm(d.messages.length > 0); }
  }, []);

  useEffect(() => { loadDm(); }, [loadDm]);
  useEffect(() => { dmBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages.length]);

  function handleTextChange(e) {
    const val = e.target.value;
    setText(val);
    const caret = e.target.selectionStart;
    const before = val.slice(0, caret);
    const atMatch = before.match(/@(\w[\w\s]*)$/);
    if (atMatch) { setMentionQuery(atMatch[1]); setShowMention(true); setMentionIdx(0); }
    else { setShowMention(false); setMentionQuery(""); }
  }

  const filteredMembers = mentionQuery
    ? members.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : members.slice(0, 6);

  function insertMention(member) {
    const caret  = textareaRef.current?.selectionStart || text.length;
    const before = text.slice(0, caret);
    const after  = text.slice(caret);
    const atIdx  = before.lastIndexOf("@");
    const newText = before.slice(0, atIdx) + `@${member.name} ` + after;
    setText(newText);
    setPendingMentions(prev => [...prev.filter(p => p._id !== member._id), {
      userId: member._id, name: member.name, userType: member.type,
    }]);
    setShowMention(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleKeyDown(e) {
    if (showMention) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx(i => Math.min(i+1, filteredMembers.length-1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setMentionIdx(i => Math.max(i-1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredMembers[mentionIdx]) insertMention(filteredMembers[mentionIdx]);
        return;
      }
      if (e.key === "Escape") { setShowMention(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) { setError("Image must be under 200KB"); e.target.value = ""; return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getToken();
      const r = await fetch("/api/upload/community-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const d = await r.json();
      if (d.success) setAttachments(prev => [...prev, { type: "image", name: file.name, url: d.url }]);
      else setError(d.error || "Image upload failed");
    } catch { setError("Image upload failed — please try again"); }
    setUploading(false);
    e.target.value = "";
  }

  function addLink() {
    if (!linkUrl.trim()) return;
    setAttachments(prev => [...prev, { type: "link", name: linkName.trim() || linkUrl.trim(), url: linkUrl.trim() }]);
    setLinkName(""); setLinkUrl(""); setShowLink(false);
  }

  async function sendMessage() {
    if (!text.trim() && attachments.length === 0) return;
    setSending(true); setError("");

    if (editingId) {
      const r = await fetch("/api/team/community", {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ messageId: editingId, action: "edit", text }),
      }).catch(() => null);
      if (!r) { setError("Network error"); setSending(false); return; }
      const d = await r.json();
      if (d.success) {
        setMessages(prev => prev.map(m => m._id === editingId ? d.message : m));
        setText(""); setEditingId(null); setAttachments([]);
      } else setError(d.message || "Failed to edit");
    } else {
      const r = await fetch("/api/team/community", {
        method: "POST", headers: authH(),
        body: JSON.stringify({ text, mentions: pendingMentions, attachments, replyTo }),
      }).catch(() => null);
      if (!r) { setError("Network error"); setSending(false); return; }
      const d = await r.json();
      if (d.success) {
        setMessages(prev => [...prev, d.message]);
        setText(""); setAttachments([]); setPendingMentions([]); setReplyTo(null);
        fetch("/api/team/community", { method: "PUT", headers: authH() }).catch(() => {});
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

  async function deleteForAll(m) {
    const r = await fetch("/api/team/community", {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ messageId: m._id, action: "deleteForAll" }),
    }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) setMessages(prev => prev.map(msg => msg._id === m._id ? d.message : msg));
  }

  async function deleteForMe(m) {
    const r = await fetch("/api/team/community", {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ messageId: m._id, action: "deleteForMe" }),
    }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) setMessages(prev => prev.filter(msg => msg._id !== m._id));
  }

  async function sendDmReply() {
    if (!dmText.trim()) return;
    setDmSending(true);
    const r = await fetch("/api/employee/team-dm", {
      method: "POST", headers: authH(),
      body: JSON.stringify({ text: dmText }),
    }).catch(() => null);
    if (!r) { setDmSending(false); return; }
    const d = await r.json();
    if (d.success) { setDmMessages(prev => [...prev, d.message]); setDmText(""); }
    setDmSending(false);
  }

  async function loadMore() {
    if (!messages.length || loadingMore) return;
    setLoadingMore(true);
    await loadMessages(true, messages[0].createdAt);
    setLoadingMore(false);
  }

  const grouped   = groupByDate(messages);
  const dmGrouped = groupByDate(dmMessages);
  const myName    = me ? `${me.firstName || ""} ${me.lastName || ""}`.trim() : "";

  return (
    <div>
      <Head>
        <title>Community — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </Head>

      <style>{`
        .content.home { background: transparent !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; }
        .tc-layout { display: flex; height: calc(100vh - 60px); overflow: hidden; background: #E9EBF0; }
        .tc-tabs  { display: flex; gap: 0; border-bottom: 1px solid #E2E8F0; background: #fff; }
        .tc-tab   { padding: 13px 20px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2.5px solid transparent; transition: color .15s; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; }
        .tc-tab.active { color: #4F46E5; border-bottom-color: #4F46E5; }
        .tc-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .tc-header { padding: 14px 20px; background: #fff; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
        .tc-header-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .tc-header-sub   { font-size: 12px; color: #94a3b8; margin-top: 1px; }
        .tc-feed { flex: 1; overflow-y: auto; padding: 16px 20px 8px; display: flex; flex-direction: column; gap: 0; }
        .tc-feed::-webkit-scrollbar { width: 4px; }
        .tc-feed::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        .tc-date-sep { text-align: center; margin: 16px 0 12px; }
        .tc-date-sep span { font-size: 11px; color: #94a3b8; background: #E8EBF0; padding: 4px 16px; border-radius: 10px; font-weight: 600; }

        /* Bubble rows */
        .tc-brow { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 6px; position: relative; }
        .tc-brow.out { flex-direction: row-reverse; }
        .tc-brow.in  { flex-direction: row; }
        .tc-av { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .tc-bubble-wrap { max-width: 70%; }
        .tc-bname { font-size: 10.5px; color: #64748b; font-weight: 700; margin-bottom: 4px; padding: 0 4px; }
        .tc-brow.out .tc-bname { text-align: right; }
        .tc-bubble { padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.65; overflow-wrap: break-word; word-break: normal; position: relative; }
        .tc-bubble.out { background: #4F46E5; color: #fff; border-bottom-right-radius: 4px; }
        .tc-bubble.in  { background: #fff; border: 1.5px solid #E8EBF0; color: #0f172a; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .tc-btime { font-size: 10px; margin-top: 5px; }
        .tc-bubble.out .tc-btime { color: rgba(255,255,255,.5); text-align: right; }
        .tc-bubble.in  .tc-btime { color: #94a3b8; }
        .tc-bubble-attaches { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .tc-img-thumb { max-width: 220px; max-height: 160px; border-radius: 10px; object-fit: cover; cursor: pointer; display: block; border: 1.5px solid rgba(0,0,0,.08); }
        .tc-bubble.out .tc-img-thumb { border-color: rgba(255,255,255,.2); }

        /* Reply preview inside bubble */
        .tc-reply-in-bubble { border-radius: 8px; padding: 6px 10px; margin-bottom: 8px; }
        .tc-bubble.in  .tc-reply-in-bubble { background: #EEF2FF; border-left: 3px solid #4F46E5; }
        .tc-bubble.out .tc-reply-in-bubble { background: rgba(255,255,255,.18); border-left: 3px solid rgba(255,255,255,.5); }
        .tc-reply-name { font-size: 10.5px; font-weight: 700; margin-bottom: 2px; }
        .tc-bubble.in  .tc-reply-name { color: #4F46E5; }
        .tc-bubble.out .tc-reply-name { color: rgba(255,255,255,.85); }
        .tc-reply-text { font-size: 12px; opacity: .75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Deleted message */
        .tc-deleted { font-style: italic; opacity: .55; font-size: 13px; display: flex; align-items: center; gap: 6px; }

        /* Edited label */
        .tc-edited { font-size: 9.5px; opacity: .55; margin-left: 5px; }

        /* Hover action bar — inline flex sibling so it never overflows the feed */
        .tc-msg-actions { display: none; flex-direction: row; gap: 1px; align-self: flex-end; flex-shrink: 0; padding-bottom: 6px; }
        .tc-brow:hover .tc-msg-actions { display: flex; }
        .tc-msg-act-btn { background: none; border: 1px solid #E2E8F0; cursor: pointer; padding: 5px 7px; border-radius: 8px; font-size: 13px; color: #94a3b8; line-height: 1; transition: background .1s, color .1s; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
        .tc-msg-act-btn:hover { background: #F1F5F9; color: #0f172a; }
        .tc-msg-act-btn.danger { color: #EF4444; }
        .tc-msg-act-btn.danger:hover { background: #FEE2E2; }

        /* Input area */
        .tc-input-area { padding: 12px 16px; background: #fff; border-top: 1px solid #E2E8F0; position: relative; }
        .tc-reply-bar { display: flex; align-items: center; gap: 8px; background: #EEF2FF; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; }
        .tc-reply-bar-text { flex: 1; min-width: 0; }
        .tc-reply-bar-label { font-size: 11px; font-weight: 700; color: #4F46E5; }
        .tc-reply-bar-preview { font-size: 12px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tc-edit-bar { display: flex; align-items: center; gap: 8px; background: #FEF9C3; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; }
        .tc-edit-bar-label { flex: 1; font-size: 12px; font-weight: 600; color: #92400E; }
        .tc-cancel-bar-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: #92400E; font-weight: 600; display: flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 6px; font-family: inherit; }
        .tc-cancel-bar-btn:hover { background: rgba(0,0,0,.06); }
        .tc-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .tc-chip  { display: flex; align-items: center; gap: 5px; padding: 4px 10px; background: #EEF2FF; border-radius: 8px; font-size: 12px; font-weight: 600; color: #4F46E5; }
        .tc-chip button { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 13px; line-height: 1; }
        .tc-input-row { display: flex; gap: 8px; align-items: flex-end; }
        .tc-ta { flex: 1; padding: 10px 14px; border: 1.5px solid #E2E8F0; border-radius: 22px; font-size: 13.5px; font-family: inherit; resize: none; outline: none; min-height: 42px; max-height: 130px; color: #0f172a; background: #F0F2F5; line-height: 1.55; }
        .tc-ta:focus { border-color: #4F46E5; background: #fff; }
        .tc-action-btn { padding: 8px 10px; background: #F0F2F5; border: 1.5px solid #E2E8F0; border-radius: 50%; font-size: 15px; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; flex-shrink: 0; width: 38px; height: 38px; transition: background .12s; }
        .tc-action-btn:hover { background: #E2E8F0; }
        .tc-send-btn { width: 38px; height: 38px; background: #4F46E5; color: #fff; border: none; border-radius: 50%; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; flex-shrink: 0; }
        .tc-send-btn:disabled { opacity: .4; cursor: not-allowed; }
        .tc-mention-list { position: absolute; bottom: calc(100% + 4px); left: 16px; right: 16px; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.12); z-index: 50; overflow: hidden; }
        .tc-mention-item { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; font-size: 13px; transition: background .1s; }
        .tc-mention-item:hover, .tc-mention-item.active { background: #EEF2FF; }
        .tc-mention-av { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .tc-mention-name { font-weight: 700; color: #0f172a; font-size: 13px; }
        .tc-mention-dept { font-size: 11px; color: #94a3b8; }
        .tc-load-more { text-align: center; padding: 8px; }
        .tc-load-more button { background: none; border: none; font-size: 12px; color: #4F46E5; font-weight: 600; cursor: pointer; padding: 4px 12px; border-radius: 6px; }
        .tc-load-more button:hover { background: #EEF2FF; }
        .tc-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 8px; }
        .tc-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.38); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .tc-modal-box { background: #fff; border-radius: 14px; padding: 26px; width: 380px; }
        .tc-modal-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
        .tc-field { margin-bottom: 12px; }
        .tc-field label { font-size: 11px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .5px; }
        .tc-field input { width: 100%; padding: 9px 12px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; color: #0f172a; }
        .tc-field input:focus { border-color: #4F46E5; }
        .tc-modal-actions { display: flex; gap: 8px; margin-top: 4px; }
        .tc-btn-pri { padding: 9px 18px; background: #4F46E5; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .tc-btn-sec { padding: 9px 18px; background: #F1F5F9; color: #475569; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .tc-error { background: #FEF2F2; color: #DC2626; padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .tc-error button { background: none; border: none; cursor: pointer; color: #DC2626; margin-left: auto; }
        .tc-dm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 10px; color: #94a3b8; padding: 40px; text-align: center; }
        .dm-feed { flex: 1; overflow-y: auto; padding: 16px 20px 8px; display: flex; flex-direction: column; background: #F0F2F5; }
        .dm-feed::-webkit-scrollbar { width: 4px; }
        .dm-feed::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        .dm-brow { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 8px; }
        .dm-brow.admin    { justify-content: flex-start; }
        .dm-brow.employee { justify-content: flex-end; }
        .dm-av-sm { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .dm-bwrap { max-width: 70%; }
        .dm-bname { font-size: 10.5px; font-weight: 700; margin-bottom: 4px; }
        .dm-brow.admin .dm-bname    { color: #64748b; }
        .dm-brow.employee .dm-bname { text-align: right; color: #818CF8; }
        .dm-bubble { padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.6; overflow-wrap: break-word; word-break: normal; }
        .dm-bubble.admin    { background: #fff; border: 1.5px solid #E8EBF0; color: #0f172a; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .dm-bubble.employee { background: #4F46E5; color: #fff; border-bottom-right-radius: 4px; }
        .dm-btime { font-size: 10px; margin-top: 5px; }
        .dm-bubble.admin .dm-btime    { color: #94a3b8; }
        .dm-bubble.employee .dm-btime { color: rgba(255,255,255,.5); text-align: right; }
        @media (max-width: 768px) {
          .tc-feed { padding: 12px 10px 6px; }
          .tc-bubble-wrap { max-width: 82%; }
          .tc-img-thumb { max-width: 180px; max-height: 130px; }
          .tc-input-area { padding: 10px 10px; }
          .tc-modal-box { width: calc(100vw - 32px); }
          .tc-msg-actions { padding-bottom: 4px; }
        }
      `}</style>

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home" style={{ padding: 0 }}>
            <div className="tc-layout">
              <div className="tc-main">
                {/* Tabs */}
                <div className="tc-tabs">
                  <button className={`tc-tab ${activeTab === "community" ? "active" : ""}`} onClick={() => setActiveTab("community")}>
                    Team Community
                  </button>
                  {hasDm && (
                    <button className={`tc-tab ${activeTab === "dm" ? "active" : ""}`} onClick={() => { setActiveTab("dm"); loadDm(); }}>
                      Direct Messages
                    </button>
                  )}
                </div>

                {activeTab === "community" ? (
                  <>
                    <div className="tc-header">
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className="bi bi-people-fill" style={{ fontSize: 16, color: "#fff" }} />
                      </div>
                      <div>
                        <div className="tc-header-title">Team Community</div>
                        <div className="tc-header-sub">Open channel for the entire Viralon team. Type @ to mention someone.</div>
                      </div>
                    </div>

                    <div className="tc-feed" id="tc-feed">
                      {hasMore && (
                        <div className="tc-load-more">
                          <button onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? "Loading..." : "Load earlier messages"}
                          </button>
                        </div>
                      )}
                      {messages.length === 0 ? (
                        <div className="tc-empty">
                          <i className="bi bi-chat-dots" style={{ fontSize: 38, color: "#CBD5E1" }} />
                          <div style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</div>
                          <div style={{ fontSize: 13 }}>Be the first to say something to the team</div>
                        </div>
                      ) : (
                        grouped.map((item, idx) => {
                          if (item.type === "date") {
                            return (
                              <div key={`d${idx}`} className="tc-date-sep">
                                <span>{item.label}</span>
                              </div>
                            );
                          }
                          const m = item.data;
                          const isMe = me && String(m.senderId) === String(me._id);
                          const side = isMe ? "out" : "in";
                          return (
                            <div key={m._id} className={`tc-brow ${side}`}>
                              {!isMe && (
                                <div className="tc-av" style={{ background: avColor(m.senderName) }}>
                                  {nameInitials(m.senderName)}
                                </div>
                              )}
                              <div className="tc-bubble-wrap">
                                {!isMe && (
                                  <div className="tc-bname">
                                    {m.senderName}{m.senderDept ? ` · ${m.senderDept}` : ""}
                                  </div>
                                )}
                                <div className={`tc-bubble ${side}`}>
                                  {/* Reply preview */}
                                  {m.replyTo?.msgId && !m.deleted && (
                                    <div className="tc-reply-in-bubble">
                                      <div className="tc-reply-name">{m.replyTo.senderName}</div>
                                      <div className="tc-reply-text">{(m.replyTo.text || "").slice(0, 80)}</div>
                                    </div>
                                  )}
                                  {m.deleted ? (
                                    <div className="tc-deleted">
                                      <i className="bi bi-slash-circle" />
                                      This message was deleted
                                    </div>
                                  ) : (
                                    <>
                                      {m.text && (
                                        <div>
                                          {renderText(m.text, m.mentions, isMe)}
                                          {m.edited && <span className="tc-edited">(edited)</span>}
                                        </div>
                                      )}
                                      {(m.attachments || []).length > 0 && (
                                        <div className="tc-bubble-attaches">
                                          {m.attachments.map((a, i) => (
                                            a.type === "image" ? (
                                              <img key={i} src={a.url} alt={a.name} className="tc-img-thumb"
                                                onClick={() => window.open(a.url, "_blank")} />
                                            ) : (
                                              <a key={i} href={a.url} target="_blank" rel="noreferrer"
                                                style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px",
                                                  background: isMe ? "rgba(255,255,255,.2)" : "#EEF2FF",
                                                  borderRadius:8, fontSize:12, fontWeight:600,
                                                  color: isMe ? "#fff" : "#4F46E5", textDecoration:"none" }}>
                                                <i className="bi bi-link-45deg" />{a.name}
                                              </a>
                                            )
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <div className="tc-btime">{fmtTime(m.createdAt)}</div>
                                </div>
                              </div>

                              {/* Hover action menu */}
                              {!m.deleted && (
                                <div className="tc-msg-actions">
                                  <button className="tc-msg-act-btn" title="Reply" onClick={() => startReply(m)}>
                                    <i className="bi bi-reply" />
                                  </button>
                                  {isMe && (
                                    <button className="tc-msg-act-btn" title="Edit" onClick={() => startEdit(m)}>
                                      <i className="bi bi-pencil" />
                                    </button>
                                  )}
                                  {isMe && (
                                    <button className="tc-msg-act-btn danger" title="Delete for everyone" onClick={() => deleteForAll(m)}>
                                      <i className="bi bi-trash" />
                                    </button>
                                  )}
                                  <button className="tc-msg-act-btn" title="Delete for me" onClick={() => deleteForMe(m)}>
                                    <i className="bi bi-eye-slash" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      <div ref={bottomRef} />
                    </div>

                    {/* Input area */}
                    <div className="tc-input-area">
                      {error && (
                        <div className="tc-error">
                          {error}
                          <button onClick={() => setError("")}><i className="bi bi-x" /></button>
                        </div>
                      )}

                      {/* Reply bar */}
                      {replyTo && (
                        <div className="tc-reply-bar">
                          <i className="bi bi-reply-fill" style={{ color: "#4F46E5", flexShrink: 0 }} />
                          <div className="tc-reply-bar-text">
                            <div className="tc-reply-bar-label">Replying to {replyTo.senderName}</div>
                            <div className="tc-reply-bar-preview">{(replyTo.text || "").slice(0, 70)}</div>
                          </div>
                          <button style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:16, padding:2 }}
                            onClick={() => setReplyTo(null)}>
                            <i className="bi bi-x" />
                          </button>
                        </div>
                      )}

                      {/* Edit bar */}
                      {editingId && (
                        <div className="tc-edit-bar">
                          <i className="bi bi-pencil-fill" style={{ color: "#92400E", flexShrink: 0 }} />
                          <div className="tc-edit-bar-label">Editing message</div>
                          <button className="tc-cancel-bar-btn" onClick={() => { setEditingId(null); setText(""); }}>
                            <i className="bi bi-x" /> Cancel
                          </button>
                        </div>
                      )}

                      {attachments.length > 0 && (
                        <div className="tc-chips">
                          {attachments.map((a, i) => (
                            <div key={i} className="tc-chip">
                              <i className={`bi ${a.type === "image" ? "bi-image" : "bi-link-45deg"}`} />
                              <span>{a.name.length > 24 ? a.name.slice(0, 24) + "…" : a.name}</span>
                              <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))}>
                                <i className="bi bi-x" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {showMention && filteredMembers.length > 0 && (
                        <div className="tc-mention-list">
                          {filteredMembers.map((m, i) => (
                            <div key={m._id} className={`tc-mention-item ${i === mentionIdx ? "active" : ""}`}
                              onMouseDown={e => { e.preventDefault(); insertMention(m); }}>
                              <div className="tc-mention-av" style={{ background: avColor(m.name) }}>
                                {nameInitials(m.name)}
                              </div>
                              <div>
                                <div className="tc-mention-name">{m.name}</div>
                                {m.dept && <div className="tc-mention-dept">{m.dept}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="tc-input-row">
                        {!editingId && (
                          <>
                            <button className="tc-action-btn" title="Attach image"
                              onClick={() => fileRef.current?.click()} disabled={uploading}>
                              <i className={`bi ${uploading ? "bi-hourglass-split" : "bi-image"}`}
                                style={{ opacity: uploading ? .5 : 1 }} />
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
                            <button className="tc-action-btn" title="Attach Drive link" onClick={() => setShowLink(true)}>
                              <i className="bi bi-link-45deg" />
                            </button>
                          </>
                        )}
                        <textarea
                          ref={textareaRef}
                          className="tc-ta"
                          rows={1}
                          placeholder={editingId ? "Edit your message..." : "Message the team... Type @ to mention someone"}
                          value={text}
                          onChange={handleTextChange}
                          onKeyDown={handleKeyDown}
                        />
                        <button className="tc-send-btn" onClick={sendMessage}
                          disabled={sending || (!text.trim() && attachments.length === 0)}>
                          <i className={`bi ${sending ? "bi-hourglass-split" : editingId ? "bi-check-lg" : "bi-send-fill"}`} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="tc-header">
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#0EA5E9,#0284C7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className="bi bi-person-lines-fill" style={{ fontSize: 16, color: "#fff" }} />
                      </div>
                      <div>
                        <div className="tc-header-title">Direct Message from Admin</div>
                        <div className="tc-header-sub">Private conversation with the Viralon admin team</div>
                      </div>
                    </div>

                    <div className="dm-feed">
                      {dmMessages.length === 0 ? (
                        <div className="tc-dm-empty">
                          <i className="bi bi-lock" style={{ fontSize: 32, color: "#CBD5E1" }} />
                          <div style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</div>
                          <div style={{ fontSize: 13 }}>Admin will initiate the conversation</div>
                        </div>
                      ) : (
                        dmGrouped.map((item, idx) => {
                          if (item.type === "date") return (
                            <div key={`d${idx}`} className="tc-date-sep"><span>{item.label}</span></div>
                          );
                          const m = item.data;
                          const isAdmin = m.senderType === "admin";
                          return (
                            <div key={m._id} className={`dm-brow ${isAdmin ? "admin" : "employee"}`}>
                              {isAdmin && <div className="dm-av-sm" style={{ background: "#4F46E5" }}>AD</div>}
                              <div className="dm-bwrap">
                                <div className="dm-bname">{isAdmin ? "Admin" : "You"}</div>
                                <div className={`dm-bubble ${isAdmin ? "admin" : "employee"}`}>
                                  {m.text && <div>{m.text}</div>}
                                  {(m.attachments || []).map((a, i) => (
                                    <a key={i} href={a.url} target="_blank" rel="noreferrer"
                                      style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, padding:"5px 10px",
                                        background: isAdmin ? "#EEF2FF" : "rgba(255,255,255,.2)",
                                        borderRadius:8, fontSize:12, fontWeight:600,
                                        color: isAdmin ? "#4F46E5" : "#fff", textDecoration:"none" }}>
                                      <i className="bi bi-link-45deg" />{a.name}
                                    </a>
                                  ))}
                                  <div className="dm-btime">{fmtTime(m.createdAt)}</div>
                                </div>
                              </div>
                              {!isAdmin && <div className="dm-av-sm" style={{ background: avColor(myName) }}>{nameInitials(myName)}</div>}
                            </div>
                          );
                        })
                      )}
                      <div ref={dmBottomRef} />
                    </div>

                    <div className="tc-input-area" style={{ background: "#fff", borderTop: "1px solid #E2E8F0" }}>
                      <div className="tc-input-row">
                        <textarea className="tc-ta" rows={1} placeholder="Reply to admin..."
                          value={dmText} onChange={e => setDmText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDmReply(); } }} />
                        <button className="tc-send-btn" onClick={sendDmReply} disabled={dmSending || !dmText.trim()}>
                          <i className={`bi ${dmSending ? "bi-hourglass-split" : "bi-send-fill"}`} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Drive link modal */}
      {showLink && (
        <div className="tc-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowLink(false); }}>
          <div className="tc-modal-box">
            <div className="tc-modal-title">Attach a Drive link</div>
            <div className="tc-field">
              <label>Display Name</label>
              <input placeholder="e.g. Q3 Campaign Brief" value={linkName} onChange={e => setLinkName(e.target.value)} />
            </div>
            <div className="tc-field">
              <label>URL</label>
              <input placeholder="https://drive.google.com/..." value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addLink(); }} />
            </div>
            <div className="tc-modal-actions">
              <button className="tc-btn-pri" onClick={addLink}>Attach</button>
              <button className="tc-btn-sec" onClick={() => setShowLink(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
