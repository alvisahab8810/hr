import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import EmployeeLeftbar from "@/components/employee/Leftbar";
import Dashnav from "@/components/Dashnav";
import LeftbarMobile from "@/components/employee/LeftbarMobile";

const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("employeeToken") || "" : "");
const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const QUICK_REACTIONS = ["👍","❤️","😂","😮","😢","🎉"];

const COMMON_EMOJIS = [
  "😀","😂","😊","🥰","😍","🤔","😎","🤩","😅","😴",
  "😮","😢","😡","🥺","🤣","😏","😬","😤","🙄","😭",
  "👍","👎","👏","🙏","💪","🤝","👋","✌️","🤞","💯",
  "❤️","🔥","⭐","✅","🎉","💡","📌","🚀","💎","🎯",
  "😁","😄","😆","🥳","🤗","🤭","🫡","🫶","🫂","💬",
];

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
  const linkColor = isOutgoing ? "rgba(255,255,255,.9)" : "#4F46E5";
  // Split on URLs and @mentions
  const parts = text.split(/(https?:\/\/[^\s]+|@\w[\w\s]*)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer"
          style={{ color: linkColor, textDecoration: "underline", wordBreak: "break-all", cursor: "pointer" }}>
          {part}
        </a>
      );
    }
    if (part.startsWith("@")) {
      const nm = part.slice(1).trim();
      const isMention = mentionNames.some(n => n.toLowerCase() === nm.toLowerCase()) || part.includes("@");
      if (isMention) return <span key={i} style={{ color: linkColor, fontWeight: 700 }}>{part}</span>;
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

  // Seen by data
  const [seenBy, setSeenBy]       = useState([]);

  // Reply / Edit state
  const [replyTo, setReplyTo]     = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Undo delete
  const [undoInfo, setUndoInfo]   = useState(null);
  const undoTimerRef              = useRef(null);

  // Emoji picker
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiPickerRef            = useRef(null);
  const emojiButtonRef            = useRef(null);

  // Drag and drop
  const [isDragging, setIsDragging] = useState(false);

  // Reaction picker
  const [reactMsgId, setReactMsgId] = useState(null);

  // Search
  const [searchTerm, setSearchTerm]   = useState("");
  const [searchInput, setSearchInput] = useState("");

  const chatContainerRef = useRef(null);
  const dmBottomRef      = useRef(null);
  const textareaRef      = useRef(null);
  const pollRef          = useRef(null);
  const fileRef          = useRef(null);
  const audioRef         = useRef(null);
  const lastMsgIdRef     = useRef(null);
  const initDoneRef      = useRef(false);
  const lastDmIdRef      = useRef(null);
  const dmInitRef        = useRef(false);
  const userScrolledUpRef = useRef(false);

  function playNotif() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }

  function isNearBottom() {
    const el = chatContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }
  function scrollToBottom(force = false) {
    const el = chatContainerRef.current;
    if (!el) return;
    if (force || isNearBottom()) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  // Track manual scroll so polling never hijacks scroll position
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    function onScroll() { userScrolledUpRef.current = !isNearBottom(); }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/nortification.mp3");
    audioRef.current.volume = 0.6;
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

  // Close emoji picker on outside click
  useEffect(() => {
    function handleMouseDown(e) {
      if (
        emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) &&
        emojiButtonRef.current && !emojiButtonRef.current.contains(e.target)
      ) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Close reaction picker on outside click
  useEffect(() => {
    function handle() { setReactMsgId(null); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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
    const url = before
      ? `/api/team/community?limit=40&before=${encodeURIComponent(before)}`
      : "/api/team/community?limit=40&seen=1";
    const r = await fetch(url, { headers: authH() }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) {
      const msgs = d.messages || [];
      if (prepend) {
        setMessages(prev => [...msgs, ...prev]);
        setHasMore(msgs.length === 40);
      } else {
        const wasNearBottom = isNearBottom() || !initDoneRef.current;
        if (initDoneRef.current && msgs.length > 0) {
          const latestId = String(msgs[msgs.length - 1]._id);
          if (lastMsgIdRef.current && latestId !== lastMsgIdRef.current) playNotif();
        }
        if (msgs.length > 0) lastMsgIdRef.current = String(msgs[msgs.length - 1]._id);
        initDoneRef.current = true;
        // Merge: preserve older loaded messages, update edited/deleted, append new
        setMessages(prev => {
          if (prev.length === 0) return msgs;
          const serverMap = new Map(msgs.map(m => [String(m._id), m]));
          const existingIds = new Set(prev.map(m => String(m._id)));
          const updated = prev.map(m => serverMap.get(String(m._id)) || m);
          const newOnes = msgs.filter(m => !existingIds.has(String(m._id)));
          return newOnes.length > 0 ? [...updated, ...newOnes] : updated;
        });
        setHasMore(msgs.length === 40);
        if (d.seenBy) setSeenBy(d.seenBy);
        if (wasNearBottom) setTimeout(() => scrollToBottom(false), 50);
      }
    }
  }, []);

  useEffect(() => {
    loadMessages();
    fetch("/api/team/community", { method: "PUT", headers: authH() }).catch(() => {});
    pollRef.current = setInterval(() => loadMessages(), 10000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  // Initial scroll to bottom once after first load
  useEffect(() => {
    if (messages.length > 0 && !initDoneRef._initialScrollDone) {
      initDoneRef._initialScrollDone = true;
      setTimeout(() => scrollToBottom(true), 80);
    }
  }, [messages.length]);

  const loadDm = useCallback(async () => {
    const r = await fetch("/api/employee/team-dm", { headers: authH() }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) {
      const msgs = d.messages || [];
      if (dmInitRef.current && msgs.length > 0) {
        const latestId = String(msgs[msgs.length - 1]._id);
        if (lastDmIdRef.current && latestId !== lastDmIdRef.current) playNotif();
      }
      if (msgs.length > 0) lastDmIdRef.current = String(msgs[msgs.length - 1]._id);
      dmInitRef.current = true;
      setDmMessages(msgs);
      setHasDm(msgs.length > 0);
    }
  }, []);

  useEffect(() => {
    loadDm();
    const dmPoll = setInterval(loadDm, 10000);
    return () => clearInterval(dmPoll);
  }, [loadDm]);
  useEffect(() => { dmBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages.length]);

  // Shared image upload function used by file input, paste, and drag-drop
  async function uploadImageFile(file) {
    if (file.size > 200 * 1024) { setError("Image must be under 200KB"); return; }
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
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
    e.target.value = "";
  }

  async function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(i => i.type.startsWith("image/"));
    if (!imgItem) return; // let normal text paste happen
    e.preventDefault();
    const blob = imgItem.getAsFile();
    if (blob) await uploadImageFile(new File([blob], "screenshot.png", { type: blob.type }));
  }

  function insertEmoji(emoji) {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? text.length;
    const end   = ta?.selectionEnd   ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setShowEmoji(false);
    setTimeout(() => {
      if (ta) { ta.selectionStart = ta.selectionEnd = start + emoji.length; ta.focus(); }
    }, 0);
  }

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

  // Search helpers
  function handleSearchKeyDown(e) {
    if (e.key === "Enter") { setSearchTerm(searchInput.trim().toLowerCase()); }
    if (e.key === "Escape") { setSearchInput(""); setSearchTerm(""); }
  }

  function addLink() {
    if (!linkUrl.trim()) return;
    const raw = linkUrl.trim();
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setAttachments(prev => [...prev, { type: "link", name: linkName.trim() || raw, url }]);
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
        lastMsgIdRef.current = String(d.message._id);
        setText(""); setAttachments([]); setPendingMentions([]); setReplyTo(null);
        fetch("/api/team/community", { method: "PUT", headers: authH() }).catch(() => {});
        setTimeout(() => scrollToBottom(true), 60);
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
    setMessages(prev => prev.map(msg => msg._id === m._id ? { ...msg, _pendingDelete: true } : msg));
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoInfo({ msgId: String(m._id), original: m });
    undoTimerRef.current = setTimeout(async () => {
      setUndoInfo(null);
      const r = await fetch("/api/team/community", {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ messageId: m._id, action: "deleteForAll" }),
      }).catch(() => null);
      if (r) {
        const d = await r.json();
        if (d.success) setMessages(prev => prev.map(msg => msg._id === m._id ? d.message : msg));
      }
    }, 5000);
  }

  function undoDelete() {
    if (!undoInfo) return;
    clearTimeout(undoTimerRef.current);
    setMessages(prev => prev.map(msg => msg._id === undoInfo.msgId ? undoInfo.original : msg));
    setUndoInfo(null);
  }

  async function toggleReaction(msgId, emoji) {
    const r = await fetch("/api/team/community", {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ messageId: msgId, action: "react", emoji }),
    }).catch(() => null);
    if (r) {
      const d = await r.json();
      if (d.success) setMessages(prev => prev.map(m => String(m._id) === String(msgId) ? d.message : m));
    }
    setReactMsgId(null);
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
    const anchorId = messages[0]?._id ? `msg-${messages[0]._id}` : null;
    setLoadingMore(true);
    const before = messages[0].createdAt;
    const r = await fetch(`/api/team/community?limit=40&before=${encodeURIComponent(before)}`, { headers: authH() }).catch(() => null);
    if (r) {
      const d = await r.json();
      if (d.success) {
        const msgs = d.messages || [];
        if (msgs.length === 0) {
          setHasMore(false);
        } else {
          setMessages(prev => [...msgs, ...prev]);
          setHasMore(msgs.length === 40);
          // Scroll the previously-first message back into view after DOM updates
          setTimeout(() => {
            if (anchorId) {
              const el = document.getElementById(anchorId);
              if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
            }
          }, 30);
        }
      }
    }
    setLoadingMore(false);
  }

  const displayedMessages = searchTerm
    ? messages.filter(m => (m.text || "").toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;
  const grouped   = groupByDate(displayedMessages);
  const dmGrouped = groupByDate(dmMessages);
  const myName    = me ? `${me.firstName || ""} ${me.lastName || ""}`.trim() : "";
  const lastMsgIdx = displayedMessages.length - 1;

  function getSeenForMessage(msg) {
    if (!seenBy || seenBy.length === 0) return [];
    const msgTime = new Date(msg.createdAt).getTime();
    return seenBy.filter(s => {
      if (me && String(s.userId) === String(me._id)) return false; // skip self
      return new Date(s.lastSeenAt).getTime() >= msgTime;
    });
  }

  function getSeenNames(seenList) {
    return seenList.map(s => {
      if (s.userType === "admin") return "Admin";
      const emp = members.find(mb => String(mb._id) === String(s.userId));
      return emp?.name || "Someone";
    });
  }

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
        .tc-layout { display: flex; height: calc(100vh - 60px); height: calc(100dvh - 60px); overflow: hidden; background: #E9EBF0; }
        .tc-tabs  { display: flex; gap: 0; border-bottom: 1px solid #E2E8F0; background: #fff; }
        .tc-tab   { padding: 13px 20px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2.5px solid transparent; transition: color .15s; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; }
        .tc-tab.active { color: #4F46E5; border-bottom-color: #4F46E5; }
        .tc-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .tc-header { padding: 14px 20px; background: #fff; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
        .tc-header-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .tc-header-sub   { font-size: 12px; color: #94a3b8; margin-top: 1px; }
        .tc-feed { flex: 1; overflow-y: auto; padding: 16px 20px 8px; display: flex; flex-direction: column; gap: 0; position: relative; }
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
        .tc-bubble { display: inline-block; padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.65; overflow-wrap: break-word; word-break: break-word; position: relative; max-width: 100%; }
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
        .tc-input-area { padding: 12px 16px 14px; background: #fff; border-top: 1px solid #E2E8F0; position: sticky; bottom: 0; z-index: 10; }
        .tc-reply-bar { display: flex; align-items: center; gap: 8px; background: #EDE9F8; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; }
        .tc-reply-bar-text { flex: 1; min-width: 0; }
        .tc-reply-bar-label { font-size: 11px; font-weight: 700; color: #2C2269; }
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
        .tc-ta:focus { border-color: #2C2269; background: #fff; box-shadow: 0 0 0 3px rgba(44,34,105,.08); }
        .tc-action-btn { padding: 8px 10px; background: #F0F2F5; border: 1.5px solid #E2E8F0; border-radius: 50%; font-size: 15px; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; flex-shrink: 0; width: 38px; height: 38px; transition: background .12s; }
        .tc-action-btn:hover { background: #EDE9F8; color: #2C2269; }
        .tc-send-btn { width: 42px; height: 42px; background: linear-gradient(135deg,#2C2269,#3D2F8A); color: #fff; border: none; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; flex-shrink: 0; box-shadow: 0 3px 10px rgba(44,34,105,.35); transition: transform .12s; }
        .tc-send-btn:hover:not(:disabled) { transform: scale(1.08); }
        .tc-tab.active { color: #2C2269; border-bottom-color: #2C2269; }
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
        .tc-undo-bar { display: flex; align-items: center; gap: 12px; background: #1e293b; color: #fff; padding: 10px 16px; border-radius: 10px; margin: 4px 0 2px; font-size: 13px; font-weight: 600; position: sticky; bottom: 0; }
        .tc-undo-btn { margin-left: auto; background: #4F46E5; color: #fff; border: none; padding: 5px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .tc-undo-btn:hover { background: #4338CA; }
        .tc-dm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 10px; color: #94a3b8; padding: 40px; text-align: center; }
        .dm-feed { flex: 1; overflow-y: auto; padding: 16px 20px 8px; display: flex; flex-direction: column; background: #F0F2F5; }
        .dm-feed::-webkit-scrollbar { width: 4px; }
        .dm-feed::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        .dm-brow { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 8px; }
        .dm-brow.recv { justify-content: flex-start; }
        .dm-brow.sent { justify-content: flex-end; }
        .dm-av-sm { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; overflow: hidden; }
        .dm-bwrap { max-width: 70%; }
        .dm-bname { font-size: 10.5px; font-weight: 700; margin-bottom: 4px; }
        .dm-brow.recv .dm-bname { color: #64748b; }
        .dm-brow.sent .dm-bname { text-align: right; color: #818CF8; }
        .dm-bubble { display: inline-block; padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.6; overflow-wrap: break-word; word-break: break-word; max-width: 100%; }
        .dm-bubble.recv { background: #fff; border: 1.5px solid #E8EBF0; color: #0f172a; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
        .dm-bubble.sent { background: #4F46E5; color: #fff; border-bottom-right-radius: 4px; }
        .dm-btime { font-size: 10px; margin-top: 5px; }
        .dm-bubble.recv .dm-btime { color: #94a3b8; }
        .dm-bubble.sent .dm-btime { color: rgba(255,255,255,.5); text-align: right; }
        /* Search bar in header */
        .tc-search-wrap { margin-left: auto; display: flex; align-items: center; gap: 6px; position: relative; }
        .tc-search-input { padding: 7px 12px 7px 32px; border: 1.5px solid #E2E8F0; border-radius: 20px; font-size: 12.5px; outline: none; color: #0f172a; font-family: inherit; background: #F8FAFC; width: 200px; transition: border-color .15s, width .2s; }
        .tc-search-input:focus { border-color: #4F46E5; background: #fff; width: 260px; }
        .tc-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #94a3b8; pointer-events: none; }
        .tc-search-clear { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 13px; padding: 0 4px; line-height: 1; }
        .tc-search-clear:hover { color: #475569; }
        /* Search results banner */
        .tc-search-banner { padding: 8px 20px; background: #EEF2FF; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #4F46E5; font-weight: 600; flex-shrink: 0; }
        .tc-search-banner button { background: none; border: none; cursor: pointer; color: #4F46E5; font-size: 13px; margin-left: auto; padding: 2px 4px; }
        /* Emoji picker */
        .tc-emoji-picker { position: absolute; bottom: calc(100% + 8px); left: 0; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.15); z-index: 100; padding: 10px; width: 272px; }
        .tc-emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
        .tc-emoji-btn { background: none; border: none; cursor: pointer; font-size: 20px; padding: 4px; border-radius: 6px; line-height: 1; transition: background .1s; }
        .tc-emoji-btn:hover { background: #F1F5F9; }

        /* Reaction quick picker + pills */
        .tc-react-picker { display: inline-flex; gap: 2px; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 24px; padding: 5px 8px; box-shadow: 0 4px 16px rgba(0,0,0,.12); margin-top: 5px; }
        .tc-react-btn { background: none; border: none; cursor: pointer; font-size: 22px; padding: 3px 4px; border-radius: 6px; line-height: 1; transition: transform .12s, background .1s; }
        .tc-react-btn:hover { transform: scale(1.3); }
        .tc-react-btn.reacted { background: #EEF2FF; box-shadow: inset 0 0 0 1.5px #4F46E5; }
        .tc-reaction-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
        .tc-reaction-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px 3px 7px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 14px; cursor: pointer; font-family: inherit; transition: background .1s; line-height: 1.4; }
        .tc-reaction-pill:hover { background: #EEF2FF; border-color: #C7D2FE; }
        .tc-reaction-pill.active { background: #EEF2FF; border-color: #4F46E5; }
        .tc-reaction-pill .rc-count { font-size: 11px; font-weight: 700; color: #475569; }
        .tc-reaction-pill.active .rc-count { color: #4F46E5; }
        @media (max-width: 768px) {
          /* Layout: subtract bottom mobile nav (~60px) */
          .tc-layout { height: calc(100dvh - 120px); }
          .tc-feed { padding: 10px 10px 6px; }
          .tc-bubble-wrap { max-width: 85%; }
          .tc-img-thumb { max-width: 180px; max-height: 130px; }
          /* Input area: fixed to very bottom, above mobile nav */
          .tc-input-area {
            position: fixed; left: 0; right: 0; bottom: 60px;
            padding: 10px 12px 12px;
            box-shadow: 0 -4px 20px rgba(44,34,105,.12);
            border-top: 1.5px solid #EDE9F8;
            z-index: 100;
          }
          /* Feed padding so last message isn't hidden behind fixed input */
          .tc-feed { padding-bottom: 80px; }
          .dm-feed  { padding-bottom: 80px; }
          .tc-modal-box { width: calc(100vw - 32px); padding: 20px 16px; }
          .tc-msg-actions { display: none !important; }
          .tc-header { padding: 10px 14px; }
          .tc-header-title { font-size: 14px; }
          .tc-header-sub { display: none; }
          .tc-tabs .tc-tab { padding: 11px 14px; font-size: 12px; }
          .tc-send-btn { width: 40px; height: 40px; font-size: 15px; }
          .tc-action-btn { width: 34px; height: 34px; font-size: 14px; }
          .tc-ta { font-size: 13px; }
          .tc-search-wrap { display: none; }
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
                      {/* Search bar */}
                      <div className="tc-search-wrap">
                        <i className="bi bi-search tc-search-icon" />
                        <input
                          className="tc-search-input"
                          type="text"
                          placeholder="Search messages..."
                          value={searchInput}
                          onChange={e => {
                            setSearchInput(e.target.value);
                            if (!e.target.value.trim()) setSearchTerm("");
                          }}
                          onKeyDown={handleSearchKeyDown}
                        />
                        {searchInput && (
                          <button className="tc-search-clear" onClick={() => { setSearchInput(""); setSearchTerm(""); }}>
                            <i className="bi bi-x-circle-fill" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search results banner */}
                    {searchTerm && (
                      <div className="tc-search-banner">
                        <i className="bi bi-search" />
                        {displayedMessages.length} result{displayedMessages.length !== 1 ? "s" : ""} for &ldquo;{searchTerm}&rdquo;
                        <button onClick={() => { setSearchInput(""); setSearchTerm(""); }} title="Clear search">
                          <i className="bi bi-x-lg" />
                        </button>
                      </div>
                    )}

                    <div
                      className="tc-feed"
                      ref={chatContainerRef}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith("image/")) uploadImageFile(f); }}
                    >
                      {isDragging && (
                        <div style={{
                          position: "absolute", inset: 0, background: "rgba(79,70,229,.08)",
                          border: "2.5px dashed #4F46E5", borderRadius: 12, zIndex: 30,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          pointerEvents: "none",
                        }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#4F46E5" }}>
                            <i className="bi bi-image" style={{ fontSize: 28, display: "block", textAlign: "center", marginBottom: 8 }} />
                            Drop image here
                          </div>
                        </div>
                      )}
                      {hasMore && !searchTerm && (
                        <div className="tc-load-more">
                          <button onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? "Loading..." : `↑ Load messages before ${fmtDateLabel(messages[0]?.createdAt)}`}
                          </button>
                        </div>
                      )}
                      {displayedMessages.length === 0 ? (
                        <div className="tc-empty">
                          <i className="bi bi-chat-dots" style={{ fontSize: 38, color: "#CBD5E1" }} />
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {searchTerm ? "No messages match your search" : "No messages yet"}
                          </div>
                          {!searchTerm && <div style={{ fontSize: 13 }}>Be the first to say something to the team</div>}
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
                          // Resolve avatar: own messages use me.avatar, others use members list
                          const senderMember = !isMe && members.find(mb => String(mb._id) === String(m.senderId));
                          const senderAvatar = isMe ? (me?.avatar || null) : (senderMember?.avatar || null);
                          return (
                            <div key={m._id} id={`msg-${m._id}`} className={`tc-brow ${side}`}>
                              {/* Avatar — shown for others on left, for own on right */}
                              {senderAvatar
                                ? <img src={senderAvatar} alt="av" className="tc-av" style={{ objectFit:"cover", flexShrink:0 }} />
                                : <div className="tc-av" style={{ background: isMe ? "#4F46E5" : avColor(m.senderName) }}>{nameInitials(isMe ? myName : m.senderName)}</div>
                              }
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
                                  {m._pendingDelete ? (
                                    <div className="tc-deleted" style={{ opacity: 0.5 }}>
                                      <i className="bi bi-hourglass-split" /> Deleting...
                                    </div>
                                  ) : m.deleted ? (
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
                                                  color: isMe ? "#fff" : "#4F46E5", textDecoration:"none",
                                                  cursor:"pointer" }}
                                                onMouseEnter={e => e.currentTarget.style.textDecoration="underline"}
                                                onMouseLeave={e => e.currentTarget.style.textDecoration="none"}>
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
                                {/* Seen by — only on last non-deleted message */}
                                {(() => {
                                  const isLast = String(m._id) === String(displayedMessages[lastMsgIdx]?._id);
                                  const seenList = getSeenForMessage(m);
                                  const names = getSeenNames(seenList);
                                  if (!isLast || seenList.length === 0 || m.deleted) return null;
                                  return (
                                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3, padding:"0 2px", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                      <i className="bi bi-check2-all" style={{ fontSize:11, color:"#4F46E5" }} />
                                      <span style={{ fontSize:10.5, color:"#64748b" }}>
                                        Seen by <strong>{names.slice(0,5).join(", ")}{names.length > 5 ? ` +${names.length-5} more` : ""}</strong>
                                      </span>
                                    </div>
                                  );
                                })()}
                                {/* Quick reaction picker */}
                                {!m.deleted && !m._pendingDelete && reactMsgId === String(m._id) && (
                                  <div className="tc-react-picker" style={{ justifyContent: isMe ? "flex-end" : "flex-start" }}
                                    onMouseDown={e => e.stopPropagation()}>
                                    {QUICK_REACTIONS.map(e => {
                                      const myId = me ? String(me._id) : null;
                                      const already = myId && (m.reactions || []).find(r => r.emoji === e)?.userIds.includes(myId);
                                      return (
                                        <button key={e}
                                          className={`tc-react-btn${already ? " reacted" : ""}`}
                                          title={already ? "Click to remove" : ""}
                                          onClick={() => toggleReaction(m._id, e)}>
                                          {e}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                {/* Reaction pills */}
                                {!m.deleted && (m.reactions || []).filter(r => r.userIds.length > 0).length > 0 && (
                                  <div className="tc-reaction-row" style={{ justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                    {(m.reactions || []).filter(r => r.userIds.length > 0).map(r => {
                                      const myId = me ? String(me._id) : null;
                                      const active = myId ? r.userIds.includes(myId) : false;
                                      return (
                                        <button key={r.emoji}
                                          className={`tc-reaction-pill${active ? " active" : ""}`}
                                          title={active ? "Click to remove your reaction" : "React with " + r.emoji}
                                          onClick={() => toggleReaction(m._id, r.emoji)}>
                                          {r.emoji} <span className="rc-count">{r.userIds.length}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Hover action menu */}
                              {!m.deleted && !m._pendingDelete && (
                                <div className="tc-msg-actions">
                                  <button className="tc-msg-act-btn" title="React with emoji"
                                    onClick={e => { e.stopPropagation(); setReactMsgId(prev => prev === String(m._id) ? null : String(m._id)); }}>
                                    😊
                                  </button>
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
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      {undoInfo && (
                        <div className="tc-undo-bar">
                          <i className="bi bi-trash" />
                          <span>Message deleted</span>
                          <button className="tc-undo-btn" onClick={undoDelete}>Undo</button>
                        </div>
                      )}
                      <div style={{ height: 1 }} />
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

                      <div className="tc-input-row" style={{ position: "relative" }}>
                        {!editingId && (
                          <>
                            {/* Emoji picker panel */}
                            {showEmoji && (
                              <div className="tc-emoji-picker" ref={emojiPickerRef}>
                                <div className="tc-emoji-grid">
                                  {COMMON_EMOJIS.map((emoji, i) => (
                                    <button key={i} className="tc-emoji-btn"
                                      onMouseDown={e => { e.preventDefault(); insertEmoji(emoji); }}>
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <button
                              ref={emojiButtonRef}
                              className="tc-action-btn"
                              title="Emoji"
                              onClick={() => setShowEmoji(v => !v)}
                            >
                              😀
                            </button>
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
                          onPaste={handlePaste}
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
                          const isAdminMsg = m.senderType === "admin";
                          return (
                            <div key={m._id} className={`dm-brow ${isAdminMsg ? "recv" : "sent"}`}>
                              {isAdminMsg && (
                                <div className="dm-av-sm" style={{ background: "#4F46E5", fontSize: 10, fontWeight: 800, color: "#fff" }}>AD</div>
                              )}
                              <div className="dm-bwrap">
                                <div className="dm-bname">{isAdminMsg ? "Admin" : "You"}</div>
                                <div className={`dm-bubble ${isAdminMsg ? "recv" : "sent"}`}>
                                  {m.text && <div>{m.text}</div>}
                                  {(m.attachments || []).map((a, i) => (
                                    <a key={i} href={a.url} target="_blank" rel="noreferrer"
                                      style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, padding:"5px 10px",
                                        background: isAdminMsg ? "#EEF2FF" : "rgba(255,255,255,.2)",
                                        borderRadius:8, fontSize:12, fontWeight:600,
                                        color: isAdminMsg ? "#4F46E5" : "#fff", textDecoration:"none" }}>
                                      <i className="bi bi-link-45deg" />{a.name}
                                    </a>
                                  ))}
                                  <div className="dm-btime">{fmtTime(m.createdAt)}</div>
                                </div>
                              </div>
                              {!isAdminMsg && (
                                me?.avatar
                                  ? <img src={me.avatar} alt="av" className="dm-av-sm" style={{ objectFit:"cover" }} />
                                  : <div className="dm-av-sm" style={{ background: avColor(myName) }}>{nameInitials(myName)}</div>
                              )}
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
