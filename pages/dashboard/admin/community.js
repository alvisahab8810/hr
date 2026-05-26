import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

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
function renderText(text, mentions) {
  if (!text) return null;
  const mentionNames = (mentions || []).map(m => m.name);
  const parts = text.split(/(@\w[\w\s]*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return <span key={i} style={{ color:"#4F46E5", fontWeight:700 }}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}
function timeAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function AdminCommunity() {
  const [messages, setMessages]         = useState([]);
  const [text, setText]                 = useState("");
  const [attachments, setAttachments]   = useState([]);
  const [members, setMembers]           = useState([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMention, setShowMention]   = useState(false);
  const [mentionIdx, setMentionIdx]     = useState(0);
  const [pendingMentions, setPendingMentions] = useState([]);
  const [showLink, setShowLink]         = useState(false);
  const [linkName, setLinkName]         = useState("");
  const [linkUrl, setLinkUrl]           = useState("");
  const [sending, setSending]           = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [hasMore, setHasMore]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [error, setError]               = useState("");
  const [activeTab, setActiveTab]       = useState("community");
  const [employees, setEmployees]       = useState([]);
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [dmMessages, setDmMessages]     = useState([]);
  const [dmText, setDmText]             = useState("");
  const [dmAttachments, setDmAttachments] = useState([]);
  const [dmSending, setDmSending]       = useState(false);
  const [showDmLink, setShowDmLink]     = useState(false);
  const [dmLinkName, setDmLinkName]     = useState("");
  const [dmLinkUrl, setDmLinkUrl]       = useState("");
  const [dmSearch, setDmSearch]         = useState("");

  const bottomRef   = useRef(null);
  const dmBottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);
  const pollRef     = useRef(null);

  // Community
  const loadMessages = useCallback(async (prepend = false, before = null) => {
    const url = before ? `/api/team/community?limit=40&before=${before}` : "/api/team/community?limit=40";
    const r = await fetch(url, { credentials: "include" }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) {
      if (prepend) { setMessages(prev => [...d.messages, ...prev]); setHasMore(d.messages.length === 40); }
      else { setMessages(d.messages || []); setHasMore((d.messages||[]).length === 40); }
    }
  }, []);

  useEffect(() => {
    loadMessages();
    fetch("/api/team/community", { method: "PUT", credentials: "include" }).catch(() => {});
    pollRef.current = setInterval(() => loadMessages(), 10000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // Members for @mention
  useEffect(() => {
    fetch("/api/team/members", { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setMembers(d.members || []); });
  }, []);

  // DM employees list
  const loadEmployees = useCallback(async () => {
    const r = await fetch("/api/admin/team-dm", { credentials: "include" }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) setEmployees(d.employees || []);
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // Load DM thread
  async function loadDmThread(emp) {
    setSelectedEmp(emp);
    setDmMessages([]);
    const r = await fetch(`/api/admin/team-dm/${emp._id}`, { credentials: "include" }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) {
      setDmMessages(d.messages || []);
      setEmployees(prev => prev.map(e => e._id === emp._id ? { ...e, unread: 0 } : e));
    }
  }
  useEffect(() => { dmBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages.length]);

  // @mention
  function handleTextChange(e) {
    const val = e.target.value; setText(val);
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
    const before = text.slice(0, caret); const after = text.slice(caret);
    const atIdx  = before.lastIndexOf("@");
    setText(before.slice(0, atIdx) + `@${member.name} ` + after);
    setPendingMentions(prev => [...prev.filter(p => p._id !== member._id), { userId: member._id, name: member.name, userType: member.type }]);
    setShowMention(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }
  function handleKeyDown(e) {
    if (showMention) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx(i => Math.min(i+1, filteredMembers.length-1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setMentionIdx(i => Math.max(i-1, 0)); return; }
      if ((e.key === "Enter" || e.key === "Tab") && filteredMembers[mentionIdx]) { e.preventDefault(); insertMention(filteredMembers[mentionIdx]); return; }
      if (e.key === "Escape") { setShowMention(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 200 * 1024) { setError("Image must be under 200KB"); e.target.value = ""; return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload/community-image", {
        method: "POST", credentials: "include", body: fd,
      });
      const d = await r.json();
      if (d.success) {
        setAttachments(prev => [...prev, { type: "image", name: file.name, url: d.url }]);
      } else {
        setError(d.error || "Image upload failed");
      }
    } catch {
      setError("Image upload failed — please try again");
    }
    setUploading(false); e.target.value = "";
  }
  function addLink() {
    if (!linkUrl.trim()) return;
    setAttachments(prev => [...prev, { type: "link", name: linkName.trim() || linkUrl.trim(), url: linkUrl.trim() }]);
    setLinkName(""); setLinkUrl(""); setShowLink(false);
  }
  function addDmLink() {
    if (!dmLinkUrl.trim()) return;
    setDmAttachments(prev => [...prev, { type: "link", name: dmLinkName.trim() || dmLinkUrl.trim(), url: dmLinkUrl.trim() }]);
    setDmLinkName(""); setDmLinkUrl(""); setShowDmLink(false);
  }

  async function sendMessage() {
    if (!text.trim() && attachments.length === 0) return;
    setSending(true); setError("");
    const r = await fetch("/api/team/community", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mentions: pendingMentions, attachments }),
    }).catch(() => null);
    if (!r) { setError("Network error"); setSending(false); return; }
    const d = await r.json();
    if (d.success) {
      setMessages(prev => [...prev, d.message]);
      setText(""); setAttachments([]); setPendingMentions([]);
      fetch("/api/team/community", { method: "PUT", credentials: "include" }).catch(() => {});
    } else setError(d.message || "Failed to send");
    setSending(false);
  }

  async function sendDm() {
    if (!selectedEmp || (!dmText.trim() && dmAttachments.length === 0)) return;
    setDmSending(true);
    const r = await fetch(`/api/admin/team-dm/${selectedEmp._id}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: dmText, attachments: dmAttachments }),
    }).catch(() => null);
    if (!r) { setDmSending(false); return; }
    const d = await r.json();
    if (d.success) { setDmMessages(prev => [...prev, d.message]); setDmText(""); setDmAttachments([]); }
    setDmSending(false);
  }

  async function loadMore() {
    if (!messages.length || loadingMore) return;
    setLoadingMore(true); await loadMessages(true, messages[0].createdAt); setLoadingMore(false);
  }

  const grouped   = groupByDate(messages);
  const dmGrouped = groupByDate(dmMessages);

  const filteredEmployees = dmSearch.trim()
    ? (() => {
        const q = dmSearch.trim().startsWith("@") ? dmSearch.trim().slice(1) : dmSearch.trim();
        return employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
      })()
    : employees;

  return (
    <div>
      <Head>
        <title>Team Community — Admin</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </Head>

      <style>{`
        /* Strip theme card styling without touching sidebar margin */
        .content.home { background: transparent !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; }

        /* Layout */
        .ac-layout { display: flex; height: calc(100vh - 60px); overflow: hidden; background: #E9EBF0; }
        .ac-tabs { display: flex; gap: 0; border-bottom: 2px solid #E2E8F0; background: #fff; flex-shrink: 0; }
        .ac-tab  { padding: 14px 22px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2.5px solid transparent; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; }
        .ac-tab.active { color: #4F46E5; border-bottom-color: #4F46E5; }
        .ac-badge { display: inline-flex; align-items: center; justify-content: center; background: #EF4444; color: #fff; font-size: 10px; font-weight: 700; width: 17px; height: 17px; border-radius: 50%; margin-left: 6px; }
        .ac-main { flex: 1; display: flex; overflow: hidden; }
        .ac-chat  { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; }

        /* Community channel header */
        .ac-header { padding: 14px 20px; background: #fff; border-bottom: 1px solid #F1F5F9; display: flex; align-items: center; gap: 12px; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
        .ac-header-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .ac-header-sub   { font-size: 12px; color: #94a3b8; margin-top: 2px; }

        /* Community feed */
        .ac-feed  { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 2px; background: #F8FAFC; }
        .ac-feed::-webkit-scrollbar { width: 4px; }
        .ac-feed::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        .ac-date-sep { text-align: center; margin: 12px 0 8px; }
        .ac-date-sep span { font-size: 11px; color: #94a3b8; background: #E8EBF0; padding: 4px 16px; border-radius: 10px; font-weight: 600; }
        .ac-msg { display: flex; gap: 11px; padding: 8px 10px; border-radius: 10px; transition: background .1s; }
        .ac-msg:hover { background: #F1F5F9; }
        .ac-av  { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0; margin-top: 2px; }
        .ac-msg-body { flex: 1; min-width: 0; }
        .ac-msg-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
        .ac-msg-name { font-size: 13.5px; font-weight: 700; color: #0f172a; }
        .ac-msg-dept { font-size: 11px; color: #94a3b8; }
        .ac-msg-time { font-size: 10.5px; color: #94a3b8; margin-left: auto; }
        .ac-msg-text { font-size: 13.5px; color: #1e293b; line-height: 1.6; overflow-wrap: break-word; word-break: normal; }
        .ac-attach-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .ac-link-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; background: #EEF2FF; border-radius: 8px; font-size: 12px; font-weight: 600; color: #4F46E5; text-decoration: none; }
        .ac-img-thumb { max-width: 260px; max-height: 180px; border-radius: 10px; border: 1.5px solid #E2E8F0; object-fit: cover; cursor: pointer; display: block; }

        /* Community input bar */
        .ac-input { padding: 10px 14px; background: #fff; border-top: 1px solid #E2E8F0; position: relative; flex-shrink: 0; }
        .ac-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .ac-chip  { display: flex; align-items: center; gap: 5px; padding: 4px 10px; background: #EEF2FF; border-radius: 8px; font-size: 12px; font-weight: 600; color: #4F46E5; }
        .ac-chip button { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 13px; line-height: 1; }
        .ac-input-row { display: flex; gap: 8px; align-items: flex-end; }
        .ac-ta { flex: 1; padding: 10px 14px; border: 1.5px solid #E2E8F0; border-radius: 22px; font-size: 13.5px; font-family: inherit; resize: none; outline: none; min-height: 42px; max-height: 120px; color: #0f172a; background: #F0F2F5; line-height: 1.55; }
        .ac-ta:focus { border-color: #4F46E5; background: #fff; }
        .ac-action-btn { width: 38px; height: 38px; background: #F0F2F5; border: none; border-radius: 50%; font-size: 15px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; flex-shrink: 0; transition: background .12s; }
        .ac-action-btn:hover { background: #E2E8F0; }
        .ac-send-btn { width: 38px; height: 38px; background: #4F46E5; color: #fff; border: none; border-radius: 50%; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; flex-shrink: 0; }
        .ac-send-btn:disabled { opacity: .4; cursor: not-allowed; }
        .ac-mention-list { position: absolute; bottom: calc(100% + 4px); left: 14px; right: 14px; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.12); z-index: 50; overflow: hidden; }
        .ac-mention-item { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; font-size: 13px; transition: background .1s; }
        .ac-mention-item:hover, .ac-mention-item.active { background: #EEF2FF; }
        .ac-load-more { text-align: center; padding: 8px; }
        .ac-load-more button { background: none; border: none; font-size: 12px; color: #4F46E5; font-weight: 600; cursor: pointer; padding: 4px 12px; border-radius: 6px; }
        .ac-error { background: #FEF2F2; color: #DC2626; padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .ac-error button { background: none; border: none; cursor: pointer; color: #DC2626; margin-left: auto; }

        /* DM header */
        .ac-dm-hd { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #fff; border-bottom: 1px solid #F1F5F9; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
        .ac-dm-hd-av { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .ac-dm-hd-name { font-size: 15px; font-weight: 700; color: #0f172a; }
        .ac-dm-hd-dept { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .ac-dm-hd-dot  { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; margin-left: auto; flex-shrink: 0; }

        /* DM panel (employee list) */
        .ac-dm-panel { width: 270px; border-left: 1px solid #E2E8F0; display: flex; flex-direction: column; background: #fff; flex-shrink: 0; }
        .ac-dm-hdr  { padding: 14px 14px 10px; border-bottom: 1px solid #E2E8F0; }
        .ac-dm-hdr-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .ac-dm-search { width: 100%; padding: 8px 10px 8px 32px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 12.5px; outline: none; color: #0f172a; font-family: inherit; background: #F8FAFC; box-sizing: border-box; }
        .ac-dm-search:focus { border-color: #4F46E5; background: #fff; }
        .ac-dm-search-wrap { position: relative; }
        .ac-dm-search-wrap i { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #94a3b8; pointer-events: none; }
        .ac-emp-list { flex: 1; overflow-y: auto; }
        .ac-emp-list::-webkit-scrollbar { width: 3px; }
        .ac-emp-list::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 3px; }
        .ac-emp-item { display: flex; align-items: center; gap: 10px; padding: 11px 14px; cursor: pointer; border-bottom: 1px solid #F8FAFC; transition: background .12s; }
        .ac-emp-item:hover     { background: #F8FAFC; }
        .ac-emp-item.selected  { background: #EEF2FF; border-right: 3px solid #4F46E5; }
        .ac-emp-av  { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .ac-emp-name { font-size: 13px; font-weight: 700; color: #0f172a; }
        .ac-emp-dept { font-size: 11px; color: #94a3b8; margin-top: 1px; }
        .ac-emp-time { font-size: 10px; color: #94a3b8; margin-top: 2px; }

        /* DM chat bubbles */
        .ac-dm-feed { flex: 1; overflow-y: auto; padding: 20px 20px 8px; display: flex; flex-direction: column; background: #E9EBF0; }
        .ac-dm-feed::-webkit-scrollbar { width: 4px; }
        .ac-dm-feed::-webkit-scrollbar-thumb { background: #C8CDD6; border-radius: 4px; }
        .dm-brow { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 6px; }
        .dm-brow.admin    { justify-content: flex-end; }
        .dm-brow.employee { justify-content: flex-start; }
        .dm-av-sm { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .dm-bwrap { max-width: 68%; }
        .dm-bname { font-size: 10.5px; font-weight: 700; margin-bottom: 4px; padding: 0 2px; }
        .dm-brow.admin .dm-bname    { text-align: right; color: #818CF8; }
        .dm-brow.employee .dm-bname { color: #64748b; }
        .dm-bubble { padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.65; overflow-wrap: break-word; word-break: normal; }
        .dm-bubble.admin    { background: #4F46E5; color: #fff; border-bottom-right-radius: 4px; }
        .dm-bubble.employee { background: #fff; border: 1px solid #E2E8F0; color: #0f172a; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,.07); }
        .dm-btime { font-size: 10px; margin-top: 5px; }
        .dm-bubble.admin .dm-btime    { color: rgba(255,255,255,.5); text-align: right; }
        .dm-bubble.employee .dm-btime { color: #94a3b8; }

        /* DM input bar */
        .ac-dm-input { padding: 12px 14px; background: #fff; border-top: 1px solid #E2E8F0; flex-shrink: 0; }
        .ac-dm-input-row { display: flex; gap: 8px; align-items: flex-end; }
        .ac-dm-ta { flex: 1; padding: 10px 16px; border: 1.5px solid #E2E8F0; border-radius: 24px; font-size: 13.5px; font-family: inherit; resize: none; outline: none; min-height: 42px; max-height: 120px; color: #0f172a; background: #F0F2F5; line-height: 1.55; }
        .ac-dm-ta:focus { border-color: #4F46E5; background: #fff; }
        .ac-dm-send { width: 40px; height: 40px; background: #4F46E5; color: #fff; border: none; border-radius: 50%; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .12s; }
        .ac-dm-send:disabled { opacity: .4; cursor: not-allowed; }
        .ac-dm-send:not(:disabled):hover { background: #4338CA; }
        .ac-dm-link-btn { width: 38px; height: 38px; background: #F0F2F5; border: none; border-radius: 50%; font-size: 15px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .12s; }
        .ac-dm-link-btn:hover { background: #E2E8F0; }

        .ac-no-dm { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 10px; padding: 24px; text-align: center; background: #E9EBF0; }
        /* DM panel (employee list) */
        .ac-dm-panel { width: 270px; border-left: 1px solid #E2E8F0; display: flex; flex-direction: column; background: #fff; flex-shrink: 0; }
        .ac-dm-hdr  { padding: 14px 14px 10px; border-bottom: 1px solid #E2E8F0; }
        .ac-dm-hdr-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .ac-dm-search { width: 100%; padding: 8px 10px 8px 32px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 12.5px; outline: none; color: #0f172a; font-family: inherit; background: #F8FAFC; box-sizing: border-box; }
        .ac-dm-search:focus { border-color: #4F46E5; background: #fff; }
        .ac-dm-search-wrap { position: relative; }
        .ac-dm-search-wrap i { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #94a3b8; pointer-events: none; }
        .ac-emp-list { flex: 1; overflow-y: auto; }
        .ac-emp-list::-webkit-scrollbar { width: 3px; }
        .ac-emp-list::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 3px; }
        .ac-emp-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #F8FAFC; transition: background .12s; }
        .ac-emp-item:hover     { background: #F8FAFC; }
        .ac-emp-item.selected  { background: #EEF2FF; border-right: 3px solid #4F46E5; }
        .ac-emp-av  { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .ac-emp-name { font-size: 13px; font-weight: 700; color: #0f172a; }
        .ac-emp-dept { font-size: 11px; color: #94a3b8; margin-top: 1px; }
        .ac-emp-time { font-size: 10px; color: #94a3b8; margin-top: 2px; }
        /* DM chat bubbles */
        .ac-dm-feed { flex: 1; overflow-y: auto; padding: 16px 20px 8px; display: flex; flex-direction: column; background: #F0F2F5; }
        .ac-dm-feed::-webkit-scrollbar { width: 4px; }
        .ac-dm-feed::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        .dm-brow { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 8px; }
        .dm-brow.admin    { justify-content: flex-end; }
        .dm-brow.employee { justify-content: flex-start; }
        .dm-av-sm { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .dm-bwrap { max-width: 70%; }
        .dm-bname { font-size: 10.5px; font-weight: 700; margin-bottom: 4px; }
        .dm-brow.admin .dm-bname    { text-align: right; color: #818CF8; }
        .dm-brow.employee .dm-bname { color: #64748b; }
        .dm-bubble { padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.6; overflow-wrap: break-word; word-break: normal; }
        .dm-bubble.admin    { background: #4F46E5; color: #fff; border-bottom-right-radius: 4px; }
        .dm-bubble.employee { background: #fff; border: 1.5px solid #E8EBF0; color: #0f172a; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .dm-btime { font-size: 10px; margin-top: 5px; }
        .dm-bubble.admin .dm-btime    { color: rgba(255,255,255,.5); text-align: right; }
        .dm-bubble.employee .dm-btime { color: #94a3b8; }
        .ac-no-dm { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 8px; padding: 24px; text-align: center; background: #F0F2F5; }
        .ac-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.38); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .ac-modal-box { background: #fff; border-radius: 14px; padding: 26px; width: 380px; }
        .ac-modal-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
        .ac-field { margin-bottom: 12px; }
        .ac-field label { font-size: 11px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .5px; }
        .ac-field input { width: 100%; padding: 9px 12px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13.5px; font-family: inherit; outline: none; color: #0f172a; }
        .ac-field input:focus { border-color: #4F46E5; }
        .ac-modal-actions { display: flex; gap: 8px; margin-top: 4px; }
        .ac-btn-pri { padding: 9px 18px; background: #4F46E5; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .ac-btn-sec { padding: 9px 18px; background: #F1F5F9; color: #475569; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
      `}</style>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home" style={{ padding: 0 }}>
            <div className="ac-layout">
              <div className="ac-main">

                {/* Left: chat */}
                <div className="ac-chat">
                  <div className="ac-tabs">
                    <button className={`ac-tab ${activeTab === "community" ? "active" : ""}`} onClick={() => setActiveTab("community")}>
                      Team Community
                    </button>
                    <button className={`ac-tab ${activeTab === "dm" ? "active" : ""}`} onClick={() => setActiveTab("dm")}>
                      Direct Messages
                      {employees.reduce((s, e) => s + (e.unread || 0), 0) > 0 && (
                        <span className="ac-badge">{employees.reduce((s, e) => s + (e.unread || 0), 0)}</span>
                      )}
                    </button>
                  </div>

                  {activeTab === "community" ? (
                    <>
                      <div className="ac-header">
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="bi bi-people-fill" style={{ fontSize: 16, color: "#fff" }} />
                        </div>
                        <div>
                          <div className="ac-header-title">Team Community</div>
                          <div className="ac-header-sub">Open channel — visible to all employees and admins</div>
                        </div>
                      </div>

                      <div className="ac-feed">
                        {hasMore && (
                          <div className="ac-load-more">
                            <button onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading..." : "Load earlier messages"}</button>
                          </div>
                        )}
                        {messages.length === 0 ? (
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#94a3b8" }}>
                            <i className="bi bi-chat-dots" style={{ fontSize: 38, color: "#CBD5E1" }} />
                            <div style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</div>
                          </div>
                        ) : (
                          grouped.map((item, idx) => {
                            if (item.type === "date") return <div key={`d${idx}`} className="ac-date-sep"><span>{item.label}</span></div>;
                            const m = item.data;
                            return (
                              <div key={m._id} className="ac-msg">
                                <div className="ac-av" style={{ background: avColor(m.senderName) }}>{nameInitials(m.senderName)}</div>
                                <div className="ac-msg-body">
                                  <div className="ac-msg-meta">
                                    <span className="ac-msg-name">{m.senderName}</span>
                                    {m.senderDept && <span className="ac-msg-dept">{m.senderDept}</span>}
                                    <span className="ac-msg-time">{fmtTime(m.createdAt)}</span>
                                  </div>
                                  {m.text && <div className="ac-msg-text">{renderText(m.text, m.mentions)}</div>}
                                  {(m.attachments || []).length > 0 && (
                                    <div className="ac-attach-row">
                                      {m.attachments.map((a, i) => (
                                        a.type === "image"
                                          ? <img key={i} src={a.url} alt={a.name} className="ac-img-thumb" onClick={() => window.open(a.url, "_blank")} />
                                          : <a key={i} href={a.url} target="_blank" rel="noreferrer" className="ac-link-chip"><i className="bi bi-link-45deg" style={{ fontSize: 13 }} />{a.name}</a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={bottomRef} />
                      </div>

                      <div className="ac-input">
                        {error && <div className="ac-error">{error}<button onClick={() => setError("")}><i className="bi bi-x" /></button></div>}
                        {attachments.length > 0 && (
                          <div className="ac-chips">
                            {attachments.map((a, i) => (
                              <div key={i} className="ac-chip">
                                <i className={`bi ${a.type === "image" ? "bi-image" : "bi-link-45deg"}`} />
                                <span>{a.name.length > 24 ? a.name.slice(0, 24) + "…" : a.name}</span>
                                <button onClick={() => setAttachments(p => p.filter((_,j) => j !== i))}><i className="bi bi-x" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        {showMention && filteredMembers.length > 0 && (
                          <div className="ac-mention-list">
                            {filteredMembers.map((m, i) => (
                              <div key={m._id} className={`ac-mention-item ${i === mentionIdx ? "active" : ""}`}
                                onMouseDown={e => { e.preventDefault(); insertMention(m); }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: avColor(m.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{nameInitials(m.name)}</div>
                                <div>
                                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{m.name}</div>
                                  {m.dept && <div style={{ fontSize: 11, color: "#94a3b8" }}>{m.dept}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="ac-input-row">
                          <button className="ac-action-btn" title="Image" onClick={() => fileRef.current?.click()} disabled={uploading}>
                            <i className={`bi ${uploading ? "bi-hourglass-split" : "bi-image"}`} style={{ opacity: uploading ? .5 : 1 }} />
                          </button>
                          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
                          <button className="ac-action-btn" title="Drive link" onClick={() => setShowLink(true)}><i className="bi bi-link-45deg" /></button>
                          <textarea ref={textareaRef} className="ac-ta" rows={1} placeholder="Message the team... Type @ to mention someone"
                            value={text} onChange={handleTextChange} onKeyDown={handleKeyDown} />
                          <button className="ac-send-btn" onClick={sendMessage} disabled={sending || (!text.trim() && attachments.length === 0)}>
                            <i className={`bi ${sending ? "bi-hourglass-split" : "bi-send-fill"}`} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ac-dm-hd">
                        {selectedEmp ? (
                          <div className="ac-dm-hd-av" style={{ background: avColor(selectedEmp.name) }}>
                            {nameInitials(selectedEmp.name)}
                          </div>
                        ) : (
                          <div className="ac-dm-hd-av" style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
                            <i className="bi bi-person-lines-fill" style={{ fontSize: 16, color: "#fff" }} />
                          </div>
                        )}
                        <div>
                          <div className="ac-dm-hd-name">
                            {selectedEmp ? selectedEmp.name : "Direct Messages"}
                          </div>
                          <div className="ac-dm-hd-dept">
                            {selectedEmp
                              ? [selectedEmp.dept, selectedEmp.desig].filter(Boolean).join(" · ")
                              : "Select an employee from the list"}
                          </div>
                        </div>
                        {selectedEmp && <div className="ac-dm-hd-dot" title="Online" />}
                      </div>

                      {!selectedEmp ? (
                        <div className="ac-no-dm">
                          <i className="bi bi-person-lines-fill" style={{ fontSize: 34, color: "#CBD5E1" }} />
                          <div style={{ fontSize: 14, fontWeight: 600 }}>Select an employee</div>
                          <div style={{ fontSize: 13 }}>Choose from the list on the right to start a conversation</div>
                        </div>
                      ) : (
                        <>
                          <div className="ac-dm-feed">
                            {dmMessages.length === 0 ? (
                              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#94a3b8" }}>
                                <i className="bi bi-chat" style={{ fontSize: 34, color: "#CBD5E1" }} />
                                <div style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</div>
                                <div style={{ fontSize: 13 }}>Start the conversation with {selectedEmp.name}</div>
                              </div>
                            ) : (
                              dmGrouped.map((item, idx) => {
                                if (item.type === "date") return <div key={`d${idx}`} className="ac-date-sep"><span>{item.label}</span></div>;
                                const m = item.data;
                                const isAdminMsg = m.senderType === "admin";
                                return (
                                  <div key={m._id} className={`dm-brow ${isAdminMsg ? "admin" : "employee"}`}>
                                    {!isAdminMsg && (
                                      <div className="dm-av-sm" style={{ background: avColor(m.senderName) }}>
                                        {nameInitials(m.senderName)}
                                      </div>
                                    )}
                                    <div className="dm-bwrap">
                                      <div className="dm-bname">{isAdminMsg ? "You" : m.senderName}</div>
                                      <div className={`dm-bubble ${isAdminMsg ? "admin" : "employee"}`}>
                                        {m.text && <div>{m.text}</div>}
                                        {(m.attachments || []).map((a, i) => (
                                          <a key={i} href={a.url} target="_blank" rel="noreferrer"
                                            style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, padding:"5px 10px",
                                              background: isAdminMsg ? "rgba(255,255,255,.2)" : "#EEF2FF",
                                              borderRadius:8, fontSize:12, fontWeight:600,
                                              color: isAdminMsg ? "#fff" : "#4F46E5", textDecoration:"none" }}>
                                            <i className="bi bi-link-45deg" />{a.name}
                                          </a>
                                        ))}
                                        <div className="dm-btime">{fmtTime(m.createdAt)}</div>
                                      </div>
                                    </div>
                                    {isAdminMsg && (
                                      <div className="dm-av-sm" style={{ background: "#4F46E5" }}>AD</div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                            <div ref={dmBottomRef} />
                          </div>

                          <div className="ac-dm-input">
                            {dmAttachments.length > 0 && (
                              <div className="ac-chips" style={{ marginBottom: 8 }}>
                                {dmAttachments.map((a, i) => (
                                  <div key={i} className="ac-chip">
                                    <i className="bi bi-link-45deg" /><span>{a.name.length > 22 ? a.name.slice(0, 22) + "…" : a.name}</span>
                                    <button onClick={() => setDmAttachments(p => p.filter((_,j) => j !== i))}><i className="bi bi-x" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="ac-dm-input-row">
                              <button className="ac-dm-link-btn" onClick={() => setShowDmLink(true)} title="Attach Drive link">
                                <i className="bi bi-link-45deg" />
                              </button>
                              <textarea className="ac-dm-ta" rows={1}
                                placeholder={`Message ${selectedEmp.name}...`}
                                value={dmText} onChange={e => setDmText(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDm(); } }}
                              />
                              <button className="ac-dm-send"
                                onClick={sendDm}
                                disabled={dmSending || (!dmText.trim() && dmAttachments.length === 0)}
                              >
                                <i className={`bi ${dmSending ? "bi-hourglass-split" : "bi-send-fill"}`} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Right: DM employee list */}
                {activeTab === "dm" && (
                  <div className="ac-dm-panel">
                    <div className="ac-dm-hdr">
                      <div className="ac-dm-hdr-title">Employees</div>
                      <div className="ac-dm-search-wrap">
                        <i className="bi bi-search" />
                        <input
                          className="ac-dm-search"
                          type="text"
                          placeholder="Search or @name..."
                          value={dmSearch}
                          onChange={e => setDmSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="ac-emp-list">
                      {filteredEmployees.length === 0 ? (
                        <div style={{ padding: "20px 14px", fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                          No employees found
                        </div>
                      ) : (
                        filteredEmployees.map(e => (
                          <div key={e._id} className={`ac-emp-item ${selectedEmp?._id === e._id ? "selected" : ""}`}
                            onClick={() => loadDmThread(e)}>
                            <div className="ac-emp-av" style={{ background: avColor(e.name) }}>{nameInitials(e.name)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div className="ac-emp-name">{e.name}</div>
                                {e.unread > 0 && (
                                  <span style={{ background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, flexShrink: 0 }}>{e.unread}</span>
                                )}
                              </div>
                              <div className="ac-emp-dept">{e.dept || "—"}</div>
                              {e.lastMsg && <div className="ac-emp-time">{timeAgo(e.lastMsg.createdAt)}</div>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Community link modal */}
      {showLink && (
        <div className="ac-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowLink(false); }}>
          <div className="ac-modal-box">
            <div className="ac-modal-title">Attach a Drive link</div>
            <div className="ac-field"><label>Name</label><input placeholder="e.g. Q3 Campaign Brief" value={linkName} onChange={e => setLinkName(e.target.value)} /></div>
            <div className="ac-field"><label>URL</label><input placeholder="https://drive.google.com/..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addLink(); }} /></div>
            <div className="ac-modal-actions"><button className="ac-btn-pri" onClick={addLink}>Attach</button><button className="ac-btn-sec" onClick={() => setShowLink(false)}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* DM link modal */}
      {showDmLink && (
        <div className="ac-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowDmLink(false); }}>
          <div className="ac-modal-box">
            <div className="ac-modal-title">Attach a Drive link</div>
            <div className="ac-field"><label>Name</label><input placeholder="e.g. Task Brief" value={dmLinkName} onChange={e => setDmLinkName(e.target.value)} /></div>
            <div className="ac-field"><label>URL</label><input placeholder="https://drive.google.com/..." value={dmLinkUrl} onChange={e => setDmLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addDmLink(); }} /></div>
            <div className="ac-modal-actions"><button className="ac-btn-pri" onClick={addDmLink}>Attach</button><button className="ac-btn-sec" onClick={() => setShowDmLink(false)}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
