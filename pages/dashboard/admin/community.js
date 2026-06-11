import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

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
function renderText(text, mentions, searchTerm = "", isOwn = false) {
  if (!text) return null;
  const linkColor = isOwn ? "rgba(255,255,255,.9)" : "#4F46E5";
  // Split on URLs and @mentions so both can be rendered distinctly
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
      return <span key={i} style={{ color: linkColor, fontWeight:700 }}>{part}</span>;
    }
    if (searchTerm) {
      const re = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      const subParts = part.split(re);
      return subParts.map((sub, j) =>
        new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi").test(sub)
          ? <mark key={`${i}-${j}`} style={{ background:"#FEF08A", borderRadius:3, padding:"0 2px" }}>{sub}</mark>
          : <span key={`${i}-${j}`}>{sub}</span>
      );
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
  const [replyTo, setReplyTo]           = useState(null);
  const [editingId, setEditingId]       = useState(null);

  // Search
  const [searchTerm, setSearchTerm]     = useState("");
  const [searchInput, setSearchInput]   = useState("");

  // Seen data: array of { userId, userType, lastSeenAt, name? }
  const [seenBy, setSeenBy]             = useState([]);

  // Undo delete
  const [undoInfo, setUndoInfo]         = useState(null); // { msgId, original }
  const undoTimerRef                    = useRef(null);

  // Emoji picker
  const [showEmoji, setShowEmoji]       = useState(false);
  const emojiPickerRef                  = useRef(null);
  const emojiButtonRef                  = useRef(null);

  // Drag and drop
  const [isDragging, setIsDragging]     = useState(false);

  // Reaction picker
  const [reactMsgId, setReactMsgId]     = useState(null);

  const chatContainerRef = useRef(null);
  const dmBottomRef      = useRef(null);
  const textareaRef      = useRef(null);
  const fileRef          = useRef(null);
  const pollRef          = useRef(null);
  const audioRef         = useRef(null);
  const lastMsgIdRef     = useRef(null);
  const initDoneRef      = useRef(false);
  const lastDmCountRef   = useRef(0);
  // Track if user is near bottom (for auto-scroll decision)
  const userScrolledUpRef = useRef(false);

  function playNotif() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }

  // ── Auto-scroll helpers ──────────────────────────────────────
  function isNearBottom() {
    const el = chatContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function scrollToBottom(force = false) {
    const el = chatContainerRef.current;
    if (!el) return;
    if (force || isNearBottom()) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }

  // Track user manual scroll
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    function onScroll() {
      userScrolledUpRef.current = !isNearBottom();
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
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

  // ────────────────────────────────────────────────────────────

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

  // Community messages — fetch with seen data
  const loadMessages = useCallback(async (prepend = false, before = null) => {
    const url = before
      ? `/api/team/community?limit=40&before=${before}`
      : "/api/team/community?limit=40&seen=1";
    const r = await fetch(url, { credentials: "include" }).catch(() => null);
    if (!r) return;
    const d = await r.json();
    if (d.success) {
      const msgs = d.messages || [];
      if (prepend) {
        setMessages(prev => {
          // Save scroll position before prepending
          const el = chatContainerRef.current;
          const prevScrollHeight = el ? el.scrollHeight : 0;
          const newMsgs = [...msgs, ...prev];
          // Restore scroll after DOM update
          setTimeout(() => {
            if (el) {
              const added = el.scrollHeight - prevScrollHeight;
              el.scrollTop = el.scrollTop + added;
            }
          }, 0);
          return newMsgs;
        });
        setHasMore(msgs.length === 40);
      } else {
        const wasNearBottom = isNearBottom() || !initDoneRef.current;
        if (initDoneRef.current && msgs.length > 0) {
          const latestId = String(msgs[msgs.length - 1]._id);
          if (lastMsgIdRef.current && latestId !== lastMsgIdRef.current) {
            playNotif();
          }
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

  // Initial load + polling
  useEffect(() => {
    loadMessages();
    // Mark seen on open
    fetch("/api/team/community", { method: "PUT", credentials: "include" }).catch(() => {});
    pollRef.current = setInterval(() => loadMessages(), 10000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  // Initial scroll to bottom after first load
  useEffect(() => {
    if (messages.length > 0 && !initDoneRef._initialScrollDone) {
      initDoneRef._initialScrollDone = true;
      setTimeout(() => scrollToBottom(true), 80);
    }
  }, [messages.length]);

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
    if (d.success) {
      const emps = d.employees || [];
      const totalUnread = emps.reduce((s, e) => s + (e.unread || 0), 0);
      if (lastDmCountRef.current !== 0 && totalUnread > lastDmCountRef.current) playNotif();
      lastDmCountRef.current = totalUnread;
      setEmployees(emps);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    const dmPoll = setInterval(loadEmployees, 10000);
    return () => clearInterval(dmPoll);
  }, [loadEmployees]);

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
      setTimeout(() => dmBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }

  useEffect(() => {
    if (dmMessages.length > 0) {
      dmBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [dmMessages.length]);

  // Shared image upload function used by file input, paste, and drag-drop
  async function uploadImageFile(file) {
    if (file.size > 200 * 1024) { setError("Image must be under 200KB"); return; }
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
    setUploading(false);
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0]; if (!file) return;
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

  function addLink() {
    if (!linkUrl.trim()) return;
    const raw = linkUrl.trim();
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setAttachments(prev => [...prev, { type: "link", name: linkName.trim() || raw, url }]);
    setLinkName(""); setLinkUrl(""); setShowLink(false);
  }
  function addDmLink() {
    if (!dmLinkUrl.trim()) return;
    const raw = dmLinkUrl.trim();
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setDmAttachments(prev => [...prev, { type: "link", name: dmLinkName.trim() || raw, url }]);
    setDmLinkName(""); setDmLinkUrl(""); setShowDmLink(false);
  }

  async function sendMessage() {
    if (!text.trim() && attachments.length === 0) return;
    setSending(true); setError("");

    if (editingId) {
      const r = await fetch("/api/team/community", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
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
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mentions: pendingMentions, attachments, replyTo }),
      }).catch(() => null);
      if (!r) { setError("Network error"); setSending(false); return; }
      const d = await r.json();
      if (d.success) {
        setMessages(prev => [...prev, d.message]);
        lastMsgIdRef.current = String(d.message._id);
        setText(""); setAttachments([]); setPendingMentions([]); setReplyTo(null);
        fetch("/api/team/community", { method: "PUT", credentials: "include" }).catch(() => {});
        // Force scroll to bottom when user sends a message
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
    // Optimistically mark as pending-delete, show Undo for 5 seconds
    setMessages(prev => prev.map(msg => msg._id === m._id ? { ...msg, _pendingDelete: true } : msg));
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoInfo({ msgId: String(m._id), original: m });

    undoTimerRef.current = setTimeout(async () => {
      setUndoInfo(null);
      const r = await fetch("/api/team/community", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
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
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msgId, action: "react", emoji }),
    }).catch(() => null);
    if (r) {
      const d = await r.json();
      if (d.success) setMessages(prev => prev.map(m => String(m._id) === String(msgId) ? d.message : m));
    }
    setReactMsgId(null);
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
    if (d.success) {
      setDmMessages(prev => [...prev, d.message]);
      setDmText(""); setDmAttachments([]);
      setTimeout(() => dmBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
    setDmSending(false);
  }

  async function loadMore() {
    if (!messages.length || loadingMore) return;
    // Remember the first currently-visible message so we can scroll back to it
    const anchorId = messages[0]?._id ? `msg-${messages[0]._id}` : null;
    setLoadingMore(true);
    const before = messages[0].createdAt;
    const r = await fetch(`/api/team/community?limit=40&before=${encodeURIComponent(before)}`, { credentials: "include" }).catch(() => null);
    if (r) {
      const d = await r.json();
      if (d.success) {
        const msgs = d.messages || [];
        if (msgs.length === 0) {
          setHasMore(false);
        } else {
          setMessages(prev => [...msgs, ...prev]);
          setHasMore(msgs.length === 40);
          // After React commits the DOM, scroll the old-first-message back into view
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

  // Search filtering
  function handleSearchKeyDown(e) {
    if (e.key === "Enter") { setSearchTerm(searchInput.trim().toLowerCase()); }
    if (e.key === "Escape") { setSearchInput(""); setSearchTerm(""); }
  }

  const displayedMessages = searchTerm
    ? messages.filter(m => (m.text || "").toLowerCase().includes(searchTerm))
    : messages;

  const grouped   = groupByDate(displayedMessages);
  const dmGrouped = groupByDate(dmMessages);

  const filteredEmployees = dmSearch.trim()
    ? (() => {
        const q = dmSearch.trim().startsWith("@") ? dmSearch.trim().slice(1) : dmSearch.trim();
        return employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
      })()
    : employees;

  // Seen by helpers — determine who has seen up to a given message
  // seenBy entries each have lastSeenAt; a message is "seen" by a user if msg.createdAt <= user.lastSeenAt
  function getSeenForMessage(msg) {
    if (!seenBy || seenBy.length === 0) return [];
    const msgTime = new Date(msg.createdAt).getTime();
    return seenBy.filter(s => {
      // Skip the admin themselves (they sent or are the viewer)
      if (s.userType === "admin") return false;
      return new Date(s.lastSeenAt).getTime() >= msgTime;
    });
  }

  // Only show seen on the most recent non-deleted message that someone has seen
  const lastMsgIdx = displayedMessages.length - 1;

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
        .ac-header { padding: 12px 20px; background: #fff; border-bottom: 1px solid #F1F5F9; display: flex; align-items: center; gap: 12px; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
        .ac-header-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .ac-header-sub   { font-size: 12px; color: #94a3b8; margin-top: 2px; }

        /* Search bar in header */
        .ac-search-wrap { margin-left: auto; display: flex; align-items: center; gap: 6px; position: relative; }
        .ac-search-input { padding: 7px 12px 7px 32px; border: 1.5px solid #E2E8F0; border-radius: 20px; font-size: 12.5px; outline: none; color: #0f172a; font-family: inherit; background: #F8FAFC; width: 200px; transition: border-color .15s, width .2s; }
        .ac-search-input:focus { border-color: #4F46E5; background: #fff; width: 260px; }
        .ac-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #94a3b8; pointer-events: none; }
        .ac-search-clear { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 13px; padding: 0 4px; line-height: 1; }
        .ac-search-clear:hover { color: #475569; }
        .ac-search-badge { background: #EEF2FF; color: #4F46E5; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 10px; }

        /* Community feed */
        .ac-feed  { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 2px; background: #F8FAFC; position: relative; }
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
        .ac-link-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; background: #EEF2FF; border-radius: 8px; font-size: 12px; font-weight: 600; color: #4F46E5; text-decoration: none; cursor: pointer; }
        .ac-link-chip:hover { text-decoration: underline; opacity: .85; }
        .ac-img-thumb { max-width: 260px; max-height: 180px; border-radius: 10px; border: 1.5px solid #E2E8F0; object-fit: cover; cursor: pointer; display: block; }

        /* Seen by row */
        .ac-seen-row { display: flex; align-items: center; gap: 4px; margin-top: 5px; padding-left: 2px; }
        .ac-seen-label { font-size: 10px; color: #94a3b8; font-weight: 500; margin-right: 2px; }
        .ac-seen-av { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 800; color: #fff; flex-shrink: 0; border: 1.5px solid #fff; }
        .ac-seen-more { font-size: 10px; color: #94a3b8; }

        /* Community input bar */
        .ac-input { padding: 10px 14px; background: #fff; border-top: 1px solid #E2E8F0; position: relative; flex-shrink: 0; }
        .ac-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .ac-chip  { display: flex; align-items: center; gap: 5px; padding: 4px 10px; background: #EEF2FF; border-radius: 8px; font-size: 12px; font-weight: 600; color: #4F46E5; }
        .ac-chip button { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 13px; line-height: 1; }
        .ac-input-row { display: flex; gap: 8px; align-items: flex-end; position: relative; }
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

        .ac-no-dm { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 10px; padding: 24px; text-align: center; background: #F5F6FA; }
        /* DM chat bubbles */
        .ac-dm-feed { flex: 1; overflow-y: auto; padding: 16px 20px 8px; display: flex; flex-direction: column; gap: 2px; background: #F5F6FA; }
        .ac-dm-feed::-webkit-scrollbar { width: 4px; }
        .ac-dm-feed::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
        .dm-brow { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 4px; }
        .dm-brow.dm-sent { justify-content: flex-end; }
        .dm-brow.dm-recv { justify-content: flex-start; }
        .dm-av-sm { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .dm-bwrap { max-width: 68%; }
        .dm-bname { font-size: 10px; font-weight: 600; margin-bottom: 3px; color: #94a3b8; }
        .dm-brow.dm-sent .dm-bname { text-align: right; }
        .dm-bubble { padding: 9px 13px; border-radius: 16px; font-size: 13.5px; line-height: 1.55; overflow-wrap: break-word; word-break: break-word; }
        .dm-bubble.dm-sent { background: #4F46E5; color: #fff; border-bottom-right-radius: 3px; }
        .dm-bubble.dm-recv { background: #fff; color: #0f172a; border-bottom-left-radius: 3px; }
        .dm-btime { font-size: 10px; margin-top: 4px; }
        .dm-bubble.dm-sent .dm-btime { color: rgba(255,255,255,.55); text-align: right; }
        .dm-bubble.dm-recv .dm-btime { color: #94a3b8; }
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
        /* Message actions */
        .ac-msg { position: relative; }
        .ac-msg-actions { display: none; position: absolute; right: 8px; top: 6px; gap: 2px; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 3px 5px; box-shadow: 0 2px 10px rgba(0,0,0,.12); z-index: 20; }
        .ac-msg:hover .ac-msg-actions { display: flex; }
        .ac-msg-act-btn { background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 6px; font-size: 13px; color: #64748b; line-height: 1; transition: background .1s; }
        .ac-msg-act-btn:hover { background: #F1F5F9; color: #0f172a; }
        .ac-msg-act-btn.danger { color: #DC2626; }
        .ac-msg-act-btn.danger:hover { background: #FEE2E2; }
        /* Reply preview inside message */
        .ac-reply-preview { border-left: 3px solid #4F46E5; padding: 4px 10px; background: #EEF2FF; border-radius: 0 6px 6px 0; margin-bottom: 6px; }
        .ac-reply-pname { font-size: 10.5px; font-weight: 700; color: #4F46E5; margin-bottom: 1px; }
        .ac-reply-ptext { font-size: 12px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* Deleted */
        .ac-msg-deleted { font-style: italic; color: #94a3b8; font-size: 13px; display: flex; align-items: center; gap: 6px; }
        .ac-msg-edited  { font-size: 9.5px; color: #94a3b8; margin-left: 5px; }
        /* Input bars */
        .ac-reply-bar { display: flex; align-items: center; gap: 8px; background: #EEF2FF; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; }
        .ac-edit-bar  { display: flex; align-items: center; gap: 8px; background: #FEF9C3; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; }
        .ac-bar-text  { flex: 1; min-width: 0; }
        .ac-bar-cancel { background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: inherit; display: flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 6px; font-family: inherit; }
        .ac-bar-cancel:hover { background: rgba(0,0,0,.06); }

        /* Search results banner */
        .ac-search-banner { padding: 8px 20px; background: #EEF2FF; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #4F46E5; font-weight: 600; flex-shrink: 0; }
        .ac-search-banner button { background: none; border: none; cursor: pointer; color: #4F46E5; font-size: 13px; margin-left: auto; padding: 2px 4px; }

        /* Own (admin) messages — right aligned bubble */
        .ac-msg.ac-msg-own { flex-direction: row-reverse; }
        .ac-msg.ac-msg-own .ac-msg-meta { flex-direction: row-reverse; }
        .ac-msg.ac-msg-own .ac-msg-time { margin-left: 0; margin-right: auto; }
        .ac-msg.ac-msg-own .ac-msg-body { align-items: flex-end; display: flex; flex-direction: column; }
        .ac-msg-bubble { display: inline-block; padding: 9px 13px; border-radius: 16px; max-width: min(62%, 520px); overflow-wrap: break-word; word-break: break-word; }
        .ac-msg-bubble.own { background: #4F46E5; color: #fff; border-bottom-right-radius: 4px; }
        .ac-msg-bubble.own .ac-msg-text { color: #fff !important; }
        .ac-msg-bubble.own .ac-msg-text span { color: #fff !important; }
        .ac-msg-bubble.own .ac-reply-preview { background: rgba(255,255,255,.18); border-left-color: rgba(255,255,255,.7); }
        .ac-msg-bubble.own .ac-reply-pname { color: rgba(255,255,255,.9); }
        .ac-msg-bubble.own .ac-reply-ptext { color: rgba(255,255,255,.75); }
        .ac-msg-bubble.own .ac-msg-edited { color: rgba(255,255,255,.6); }
        .ac-msg-bubble.own a.ac-link-chip { background: rgba(255,255,255,.2); color: #fff; }
        .ac-msg-bubble.other { background: #fff; color: #1e293b; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.07); }
        .ac-msg.ac-msg-own .ac-seen-row { justify-content: flex-end; }
        .ac-msg.ac-msg-own .ac-msg-actions { right: auto; left: 8px; }

        /* Undo delete bar */
        .ac-undo-bar { display: flex; align-items: center; gap: 12px; background: #1e293b; color: #fff; padding: 10px 16px; border-radius: 10px; margin: 6px 0 2px; font-size: 13px; font-weight: 600; position: sticky; bottom: 0; }
        .ac-undo-btn { margin-left: auto; background: #4F46E5; color: #fff; border: none; padding: 5px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .ac-undo-btn:hover { background: #4338CA; }

        /* Emoji picker */
        .ac-emoji-picker { position: absolute; bottom: calc(100% + 8px); left: 0; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.15); z-index: 100; padding: 10px; width: 272px; }
        .ac-emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
        .ac-emoji-btn { background: none; border: none; cursor: pointer; font-size: 20px; padding: 4px; border-radius: 6px; line-height: 1; transition: background .1s; }
        .ac-emoji-btn:hover { background: #F1F5F9; }

        /* Reaction quick picker + pills */
        .ac-react-picker { display: inline-flex; gap: 2px; background: #fff; border: 1.5px solid #E2E8F0; border-radius: 24px; padding: 5px 8px; box-shadow: 0 4px 16px rgba(0,0,0,.12); margin-top: 5px; }
        .ac-react-btn { background: none; border: none; cursor: pointer; font-size: 22px; padding: 3px 4px; border-radius: 6px; line-height: 1; transition: transform .12s, background .1s; }
        .ac-react-btn:hover { transform: scale(1.3); }
        .ac-react-btn.reacted { background: #EEF2FF; box-shadow: inset 0 0 0 1.5px #4F46E5; }
        .ac-reaction-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
        .ac-reaction-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px 3px 7px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 14px; cursor: pointer; font-family: inherit; transition: background .1s; line-height: 1.4; }
        .ac-reaction-pill:hover { background: #EEF2FF; border-color: #C7D2FE; }
        .ac-reaction-pill.active { background: #EEF2FF; border-color: #4F46E5; }
        .ac-reaction-pill .rc-count { font-size: 11px; font-weight: 700; color: #475569; }
        .ac-reaction-pill.active .rc-count { color: #4F46E5; }
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
                      {/* Header with search */}
                      <div className="ac-header">
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="bi bi-people-fill" style={{ fontSize: 16, color: "#fff" }} />
                        </div>
                        <div>
                          <div className="ac-header-title">Team Community</div>
                          <div className="ac-header-sub">Open channel — visible to all employees and admins</div>
                        </div>
                        {/* Search bar */}
                        <div className="ac-search-wrap">
                          <i className="bi bi-search ac-search-icon" />
                          <input
                            className="ac-search-input"
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
                            <button className="ac-search-clear" onClick={() => { setSearchInput(""); setSearchTerm(""); }}>
                              <i className="bi bi-x-circle-fill" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Search results banner */}
                      {searchTerm && (
                        <div className="ac-search-banner">
                          <i className="bi bi-search" />
                          {displayedMessages.length} result{displayedMessages.length !== 1 ? "s" : ""} for &ldquo;{searchTerm}&rdquo;
                          <button onClick={() => { setSearchInput(""); setSearchTerm(""); }} title="Clear search">
                            <i className="bi bi-x-lg" />
                          </button>
                        </div>
                      )}

                      {/* Chat feed — ref on container for scroll control */}
                      <div
                        className="ac-feed"
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
                          <div className="ac-load-more">
                            <button onClick={loadMore} disabled={loadingMore}>
                              {loadingMore ? "Loading..." : `↑ Load messages before ${fmtDateLabel(messages[0]?.createdAt)}`}
                            </button>
                          </div>
                        )}
                        {displayedMessages.length === 0 ? (
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#94a3b8" }}>
                            <i className="bi bi-chat-dots" style={{ fontSize: 38, color: "#CBD5E1" }} />
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              {searchTerm ? "No messages match your search" : "No messages yet"}
                            </div>
                          </div>
                        ) : (
                          grouped.map((item, idx) => {
                            if (item.type === "date") return <div key={`d${idx}`} className="ac-date-sep"><span>{item.label}</span></div>;
                            const m = item.data;
                            const isOwn = m.senderType === "admin";
                            const seenForMsg = getSeenForMessage(m);
                            const isLastMsg = String(m._id) === String(displayedMessages[lastMsgIdx]?._id);
                            const showSeen = isLastMsg && seenForMsg.length > 0 && !m.deleted;
                            const seenNames = seenForMsg.map(s => {
                              const emp = members.find(mb => String(mb._id) === s.userId) || employees.find(e => String(e._id) === s.userId);
                              return emp?.name || "Someone";
                            });
                            const empForMsg = !isOwn && (employees.find(x => x.name === m.senderName));
                            const avatar = empForMsg?.avatar;
                            return (
                              <div key={m._id} id={`msg-${m._id}`}>
                                <div className={`ac-msg ${isOwn ? "ac-msg-own" : ""}`}>
                                  {/* Avatar — left for others, right for own */}
                                  {avatar
                                    ? <img src={avatar} alt="av" className="ac-av" style={{ objectFit:"cover", padding:0 }} />
                                    : <div className="ac-av" style={{ background: avColor(m.senderName) }}>{nameInitials(m.senderName)}</div>
                                  }
                                  <div className="ac-msg-body">
                                    <div className="ac-msg-meta">
                                      <span className="ac-msg-name">{isOwn ? "You" : m.senderName}</span>
                                      {m.senderDept && <span className="ac-msg-dept">{m.senderDept}</span>}
                                      <span className="ac-msg-time">{fmtTime(m.createdAt)}</span>
                                    </div>
                                    {m._pendingDelete ? (
                                      <div className="ac-msg-deleted" style={{ opacity: 0.5 }}>
                                        <i className="bi bi-hourglass-split" /> Deleting...
                                      </div>
                                    ) : m.deleted ? (
                                      <div className="ac-msg-deleted">
                                        <i className="bi bi-slash-circle" /> This message was deleted
                                      </div>
                                    ) : (
                                      <div className={`ac-msg-bubble ${isOwn ? "own" : "other"}`}>
                                        {m.replyTo?.msgId && (
                                          <div className="ac-reply-preview" style={{ marginBottom: 6 }}>
                                            <div className="ac-reply-pname">{m.replyTo.senderName}</div>
                                            <div className="ac-reply-ptext">{(m.replyTo.text || "").slice(0, 80)}</div>
                                          </div>
                                        )}
                                        {m.text && (
                                          <div className="ac-msg-text">
                                            {renderText(m.text, m.mentions, searchTerm, isOwn)}
                                            {m.edited && <span className="ac-msg-edited">(edited)</span>}
                                          </div>
                                        )}
                                        {(m.attachments || []).length > 0 && (
                                          <div className="ac-attach-row">
                                            {m.attachments.map((a, i) => (
                                              a.type === "image"
                                                ? <img key={i} src={a.url} alt={a.name} className="ac-img-thumb" onClick={() => window.open(a.url, "_blank")} />
                                                : <a key={i} href={a.url} target="_blank" rel="noreferrer" className="ac-link-chip" style={isOwn ? { background:"rgba(255,255,255,.2)", color:"#fff" } : {}}><i className="bi bi-link-45deg" style={{ fontSize: 13 }} />{a.name}</a>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {/* Seen by — full names */}
                                    {showSeen && (
                                      <div className="ac-seen-row" style={{ marginTop: 4 }}>
                                        <i className="bi bi-check2-all" style={{ fontSize: 11, color: "#4F46E5" }} />
                                        <span style={{ fontSize: 10.5, color: "#64748b" }}>
                                          Seen by <strong>{seenNames.slice(0, 5).join(", ")}{seenNames.length > 5 ? ` +${seenNames.length - 5} more` : ""}</strong>
                                        </span>
                                      </div>
                                    )}
                                    {/* Quick reaction picker */}
                                    {!m.deleted && !m._pendingDelete && reactMsgId === String(m._id) && (
                                      <div className="ac-react-picker" onMouseDown={e => e.stopPropagation()}>
                                        {QUICK_REACTIONS.map(e => {
                                          const already = (m.reactions || []).find(r => r.emoji === e)?.userIds.includes("admin");
                                          return (
                                            <button key={e}
                                              className={`ac-react-btn${already ? " reacted" : ""}`}
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
                                      <div className="ac-reaction-row">
                                        {(m.reactions || []).filter(r => r.userIds.length > 0).map(r => {
                                          const active = r.userIds.includes("admin");
                                          return (
                                            <button key={r.emoji}
                                              className={`ac-reaction-pill${active ? " active" : ""}`}
                                              title={active ? "Click to remove your reaction" : "React with " + r.emoji}
                                              onClick={() => toggleReaction(m._id, r.emoji)}>
                                              {r.emoji} <span className="rc-count">{r.userIds.length}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  {!m.deleted && !m._pendingDelete && (
                                    <div className="ac-msg-actions">
                                      <button className="ac-msg-act-btn" title="React with emoji"
                                        onClick={e => { e.stopPropagation(); setReactMsgId(prev => prev === String(m._id) ? null : String(m._id)); }}>
                                        😊
                                      </button>
                                      <button className="ac-msg-act-btn" title="Reply" onClick={() => startReply(m)}>
                                        <i className="bi bi-reply" />
                                      </button>
                                      {isOwn && (
                                        <button className="ac-msg-act-btn" title="Edit" onClick={() => startEdit(m)}>
                                          <i className="bi bi-pencil" />
                                        </button>
                                      )}
                                      {isOwn && (
                                        <button className="ac-msg-act-btn danger" title="Delete for everyone" onClick={() => deleteForAll(m)}>
                                          <i className="bi bi-trash" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                        {/* Undo delete bar */}
                        {undoInfo && (
                          <div className="ac-undo-bar">
                            <i className="bi bi-trash" />
                            <span>Message deleted</span>
                            <button className="ac-undo-btn" onClick={undoDelete}>Undo</button>
                          </div>
                        )}
                        <div style={{ height: 1 }} />
                      </div>

                      <div className="ac-input">
                        {error && <div className="ac-error">{error}<button onClick={() => setError("")}><i className="bi bi-x" /></button></div>}
                        {replyTo && (
                          <div className="ac-reply-bar">
                            <i className="bi bi-reply-fill" style={{ color: "#4F46E5", flexShrink: 0 }} />
                            <div className="ac-bar-text">
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5" }}>Replying to {replyTo.senderName}</div>
                              <div style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(replyTo.text || "").slice(0, 70)}</div>
                            </div>
                            <button className="ac-bar-cancel" style={{ color: "#64748b" }} onClick={() => setReplyTo(null)}>
                              <i className="bi bi-x" />
                            </button>
                          </div>
                        )}
                        {editingId && (
                          <div className="ac-edit-bar">
                            <i className="bi bi-pencil-fill" style={{ color: "#92400E", flexShrink: 0 }} />
                            <div className="ac-bar-text" style={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>Editing message</div>
                            <button className="ac-bar-cancel" style={{ color: "#92400E" }} onClick={() => { setEditingId(null); setText(""); }}>
                              <i className="bi bi-x" /> Cancel
                            </button>
                          </div>
                        )}
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
                                {m.avatar
                                  ? <img src={m.avatar} alt="av" style={{ width:28, height:28, borderRadius:7, objectFit:"cover", flexShrink:0 }} />
                                  : <div style={{ width:28, height:28, borderRadius:7, background:avColor(m.name), display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#fff", flexShrink:0 }}>{nameInitials(m.name)}</div>
                                }
                                <div>
                                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{m.name}</div>
                                  {m.dept && <div style={{ fontSize: 11, color: "#94a3b8" }}>{m.dept}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="ac-input-row">
                          {/* Emoji picker panel */}
                          {showEmoji && (
                            <div className="ac-emoji-picker" ref={emojiPickerRef}>
                              <div className="ac-emoji-grid">
                                {COMMON_EMOJIS.map((emoji, i) => (
                                  <button key={i} className="ac-emoji-btn"
                                    onMouseDown={e => { e.preventDefault(); insertEmoji(emoji); }}>
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <button
                            ref={emojiButtonRef}
                            className="ac-action-btn"
                            title="Emoji"
                            onClick={() => setShowEmoji(v => !v)}
                          >
                            😀
                          </button>
                          <button className="ac-action-btn" title="Image" onClick={() => fileRef.current?.click()} disabled={uploading}>
                            <i className={`bi ${uploading ? "bi-hourglass-split" : "bi-image"}`} style={{ opacity: uploading ? .5 : 1 }} />
                          </button>
                          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
                          <button className="ac-action-btn" title="Drive link" onClick={() => setShowLink(true)}><i className="bi bi-link-45deg" /></button>
                          <textarea ref={textareaRef} className="ac-ta" rows={1} placeholder="Message the team... Type @ to mention someone"
                            value={text} onChange={handleTextChange} onKeyDown={handleKeyDown} onPaste={handlePaste} />
                          <button className="ac-send-btn" onClick={sendMessage} disabled={sending || (!text.trim() && attachments.length === 0)}>
                            <i className={`bi ${sending ? "bi-hourglass-split" : editingId ? "bi-check-lg" : "bi-send-fill"}`} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ac-dm-hd">
                        {selectedEmp ? (
                          selectedEmp.avatar
                            ? <img src={selectedEmp.avatar} alt="avatar" className="ac-dm-hd-av" style={{ objectFit:"cover", padding:0 }} />
                            : <div className="ac-dm-hd-av" style={{ background: avColor(selectedEmp.name) }}>{nameInitials(selectedEmp.name)}</div>
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
                                  <div key={m._id} className={`dm-brow ${isAdminMsg ? "dm-sent" : "dm-recv"}`}>
                                    {!isAdminMsg && (
                                      selectedEmp?.avatar
                                        ? <img src={selectedEmp.avatar} alt="av" className="dm-av-sm" style={{ objectFit:"cover", padding:0 }} />
                                        : <div className="dm-av-sm" style={{ background: avColor(m.senderName) }}>{nameInitials(m.senderName)}</div>
                                    )}
                                    <div className="dm-bwrap">
                                      <div className="dm-bname">{isAdminMsg ? "You" : m.senderName}</div>
                                      <div className={`dm-bubble ${isAdminMsg ? "dm-sent" : "dm-recv"}`}>
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
                            {e.avatar
                              ? <img src={e.avatar} alt="av" className="ac-emp-av" style={{ objectFit:"cover", padding:0 }} />
                              : <div className="ac-emp-av" style={{ background: avColor(e.name) }}>{nameInitials(e.name)}</div>
                            }
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
