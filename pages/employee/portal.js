// pages/employee/portal.js — Role-based Employee Portal
import React, { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ─── Utils ───────────────────────────────────────────────────────────────────
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("employeeToken") || "" : "");
const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

function detectRole(emp) {
  const d    = (emp?.professional?.designation || "").toLowerCase();
  const dept = (emp?.professional?.department  || "").toLowerCase();
  if (d.includes("script") || d.includes("writer") || d.includes("copywriter") || dept.includes("content")) return "writer";
  if (d.includes("designer") || dept.includes("design")) return "designer";
  if (d.includes("video editor") || d.includes("editor") || dept.includes("video")) return "editor";
  if (d.includes("developer") || d.includes("engineer") || dept.includes("tech") || dept.includes("develop")) return "developer";
  if (d.includes("seo") || d.includes("digital marketing") || dept.includes("digital") || dept.includes("marketing") || dept.includes("seo")) return "marketing";
  return "general";
}

function ini(emp) {
  return `${(emp?.firstName || "?")[0]}${(emp?.lastName || "")[0]}`.toUpperCase();
}

function fmtD(d, yr = false) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(yr ? { year: "numeric" } : {}) });
}

function isOverdue(d) {
  if (!d) return false;
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return x < n;
}

function isDueToday(d) {
  if (!d) return false;
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return x.getTime() === n.getTime();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const ROLE_LABEL = { writer: "Script Writer", designer: "Designer", editor: "Video Editor", developer: "Developer", marketing: "Digital Marketing", general: "Team Member" };
const STAGE_COLOR = { S1: "#8b5cf6", S2: "#3b82f6", S3: "#f59e0b", S4: "#22c55e" };
const STAGE_LABEL = { S1: "Script", S2: "Shoot / Design", S3: "Edit / Develop", S4: "Posted / Live" };
const STATUS_COLOR = { todo: "#64748b", in_progress: "#3b82f6", review: "#f59e0b", completed: "#22c55e", blocked: "#ef4444" };
const STATUS_LABEL = { todo: "To Do", in_progress: "In Progress", review: "Review", completed: "Done", blocked: "Blocked" };
const KANBAN_COLS = [
  { key: "todo",        label: "Backlog",      color: "#64748b" },
  { key: "in_progress", label: "In Progress",  color: "#3b82f6" },
  { key: "review",      label: "Review",       color: "#f59e0b" },
  { key: "completed",   label: "Done",         color: "#22c55e" },
];
const CTYPE_COLOR  = { reel: "#8b5cf6", post: "#3b82f6", carousel: "#f59e0b", story: "#22c55e" };
const NEXT_STAGE   = { S1: "S2", S2: "S3", S3: "S4", S4: "S4" };
const STAGE_NUM    = { S1: 1, S2: 2, S3: 3, S4: 4 };

function calcGrade(tasks) {
  const comp   = tasks.filter(t => t.status === "completed");
  const onTime = comp.filter(t => !t.dueDate || !isOverdue(t.dueDate)).length;
  const rate   = comp.length ? Math.round(onTime / comp.length * 100) : 0;
  const letter = rate >= 90 ? "A" : rate >= 80 ? "A-" : rate >= 70 ? "B+" : rate >= 60 ? "B" : rate >= 50 ? "C" : "D";
  const color  = rate >= 80 ? "var(--green)" : rate >= 60 ? "var(--amber)" : "var(--red)";
  return { rate, letter, color };
}

function getDeadlineInfo(task) {
  if (!task.dueDate) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const d   = new Date(task.dueDate); d.setHours(0,0,0,0);
  const diff = Math.round((d - now) / 86400000);
  const diffH = Math.round((new Date(task.dueDate) - new Date()) / 3600000);
  if (diff < 0)   return { text: `${-diff}d overdue`,                             color: "var(--red)",   urgent: true,  today: false };
  if (diff === 0) return { text: diffH > 0 ? `${diffH}h left today` : "Due today", color: "var(--amber)", urgent: false, today: true };
  if (diff === 1) return { text: "Due tomorrow",                                   color: "var(--muted)", urgent: false, today: false };
  return { text: fmtD(task.dueDate), color: "var(--muted)", urgent: false, today: false };
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0c11; --surface: #10131a; --surface2: #161a24; --surface3: #1e2330;
    --border: #252a36; --amber: #f5a623; --amber-dim: rgba(245,166,35,.12);
    --text: #e2e8f0; --muted: #64748b; --green: #22c55e; --red: #ef4444;
    --blue: #3b82f6; --purple: #8b5cf6;
  }
  html, body { background: var(--bg); }
  .ep-layout { display: flex; min-height: 100vh; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; }

  /* ── Sidebar ── */
  .ep-side { width: 220px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 100; }
  .ep-side-logo { padding: 18px 18px 16px; border-bottom: 1px solid var(--border); }
  .ep-side-logo span { font-size: 17px; font-weight: 800; color: var(--amber); letter-spacing: -.3px; }
  .ep-side-logo small { display: block; font-size: 10px; color: var(--muted); margin-top: 2px; letter-spacing: .4px; text-transform: uppercase; }
  .ep-side-nav { flex: 1; overflow-y: auto; padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; }
  .ep-nav { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 13.5px; color: var(--muted); transition: all .18s; border: none; background: none; width: 100%; text-align: left; }
  .ep-nav:hover { background: var(--surface2); color: var(--text); }
  .ep-nav.active { background: var(--amber-dim); color: var(--amber); font-weight: 600; }
  .ep-nav i { font-size: 15px; width: 18px; flex-shrink: 0; }
  .ep-side-footer { padding: 12px 14px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
  .ep-ava { width: 34px; height: 34px; border-radius: 50%; background: var(--amber-dim); border: 2px solid var(--amber); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: var(--amber); flex-shrink: 0; overflow: hidden; }
  .ep-ava img { width: 100%; height: 100%; object-fit: cover; }
  .ep-side-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
  .ep-side-role { font-size: 10px; color: var(--muted); white-space: nowrap; }

  /* ── Main ── */
  .ep-main { flex: 1; margin-left: 220px; min-height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  .ep-topbar { padding: 14px 28px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: space-between; gap: 16px; position: sticky; top: 0; z-index: 50; }
  .ep-topbar-title { font-size: 15px; font-weight: 700; }
  .ep-content { padding: 24px 28px; flex: 1; overflow-y: auto; }

  /* ── Cards ── */
  .ep-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .ep-card-title { font-size: 13px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; color: var(--text); }
  .ep-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .ep-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .ep-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

  /* ── Stats ── */
  .ep-stat { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; }
  .ep-stat-num { font-size: 32px; font-weight: 800; line-height: 1; }
  .ep-stat-label { font-size: 11.5px; color: var(--muted); margin-top: 6px; }

  /* ── Hero ── */
  .ep-hero { background: linear-gradient(135deg, var(--surface2) 0%, var(--surface3) 100%); border: 1px solid var(--border); border-radius: 14px; padding: 26px 28px; margin-bottom: 22px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .ep-hero-greeting { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .ep-hero-sub { font-size: 13px; color: var(--muted); }
  .ep-hero-time { font-size: 34px; font-weight: 800; color: var(--amber); font-variant-numeric: tabular-nums; line-height: 1; }
  .ep-hero-date { font-size: 12px; color: var(--muted); text-align: right; margin-top: 4px; }

  /* ── Badges ── */
  .ep-badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; white-space: nowrap; }
  .ep-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }

  /* ── Buttons ── */
  .ep-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all .18s; outline: none; }
  .ep-btn-primary { background: var(--amber); color: #000; border-color: var(--amber); }
  .ep-btn-primary:hover { background: #e0961f; }
  .ep-btn-ghost { background: transparent; color: var(--muted); border-color: var(--border); }
  .ep-btn-ghost:hover { background: var(--surface2); color: var(--text); }
  .ep-btn-danger { background: transparent; color: var(--red); border-color: var(--red); }
  .ep-btn-danger:hover { background: rgba(239,68,68,.1); }
  .ep-btn-sm { padding: 5px 12px; font-size: 12px; }

  /* ── Forms ── */
  .ep-label { font-size: 11px; color: var(--muted); font-weight: 700; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: .5px; }
  .ep-input { width: 100%; padding: 9px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13.5px; outline: none; transition: border-color .18s; }
  .ep-input:focus { border-color: var(--amber); }
  .ep-textarea { width: 100%; padding: 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13.5px; outline: none; transition: border-color .18s; resize: vertical; font-family: inherit; line-height: 1.7; }
  .ep-textarea:focus { border-color: var(--amber); }
  .ep-select { width: 100%; padding: 9px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13.5px; outline: none; cursor: pointer; }
  .ep-select:focus { border-color: var(--amber); }
  .ep-form-g { margin-bottom: 14px; }

  /* ── Tabs ── */
  .ep-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 22px; overflow-x: auto; }
  .ep-tab { padding: 9px 16px; font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; transition: all .18s; background: none; border-top: none; border-left: none; border-right: none; white-space: nowrap; }
  .ep-tab:hover { color: var(--text); }
  .ep-tab.active { color: var(--amber); border-bottom-color: var(--amber); }

  /* ── Table ── */
  .ep-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  .ep-tbl th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .ep-tbl td { padding: 12px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .ep-tbl tr:hover td { background: var(--surface2); }
  .ep-tbl tr:last-child td { border-bottom: none; }

  /* ── Kanban ── */
  .ep-kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .ep-kcol { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; min-height: 420px; }
  .ep-kcol-hd { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
  .ep-kcard { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 10px; transition: border-color .18s; }
  .ep-kcard:hover { border-color: var(--amber); }
  .ep-kcard-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; line-height: 1.4; }
  .ep-kcard-meta { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  /* ── Stage dots ── */
  .ep-stages { display: flex; gap: 5px; align-items: center; }
  .ep-sdot { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8.5px; font-weight: 800; border: 2px solid transparent; }
  .ep-sdot.done { opacity: 1; }
  .ep-sdot.current { border-color: white; box-shadow: 0 0 0 2px rgba(255,255,255,.15); }
  .ep-sdot.pending { opacity: .25; }

  /* ── Content Editor ── */
  .ep-editor-wrap { display: grid; grid-template-columns: 250px 1fr 210px; gap: 14px; height: calc(100vh - 110px); }
  .ep-editor-left { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow-y: auto; display: flex; flex-direction: column; }
  .ep-editor-left-hd { padding: 14px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .ep-titem { padding: 11px 14px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background .15s; }
  .ep-titem:hover { background: var(--surface2); }
  .ep-titem.active { background: var(--amber-dim); border-left: 3px solid var(--amber); }
  .ep-titem-name { font-size: 12.5px; font-weight: 600; margin-bottom: 3px; }
  .ep-titem-meta { font-size: 11px; color: var(--muted); }
  .ep-editor-center { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
  .ep-editor-right { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; overflow-y: auto; }

  /* ── Brand Calendar ── */
  .ep-brand-tabs { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .ep-brand-tab { padding: 7px 16px; border-radius: 20px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1.5px solid var(--border); background: var(--surface2); color: var(--muted); transition: all .18s; }
  .ep-brand-tab.active { border-color: var(--amber); color: var(--amber); background: var(--amber-dim); }

  /* ── Design Queue ── */
  .ep-queue { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
  .ep-qcard { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .ep-qcard-thumb { height: 110px; display: flex; align-items: center; justify-content: center; font-size: 32px; background: var(--surface3); color: var(--muted); }
  .ep-qcard-body { padding: 12px; }
  .ep-qcard-title { font-size: 12.5px; font-weight: 600; margin-bottom: 6px; line-height: 1.4; }
  .ep-qcard-meta { font-size: 11px; color: var(--muted); }

  /* ── Modal ── */
  .ep-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .ep-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; width: 100%; max-width: 460px; }
  .ep-modal-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .ep-modal-title { font-size: 15px; font-weight: 700; }

  /* ── Misc ── */
  .ep-empty { text-align: center; padding: 40px 20px; color: var(--muted); }
  .ep-empty i { font-size: 38px; margin-bottom: 10px; display: block; }
  .ep-empty p { font-size: 13px; }
  .ep-divider { height: 1px; background: var(--border); margin: 18px 0; }
  .ep-brand-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 5px; flex-shrink: 0; }
  .ep-hashtag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; background: var(--surface3); border: 1px solid var(--border); font-size: 11.5px; margin: 2px; cursor: pointer; transition: border-color .15s; }
  .ep-hashtag:hover { border-color: var(--amber); color: var(--amber); }
  .ep-hashtag-x { font-size: 14px; line-height: 1; color: var(--muted); }
  .ep-spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--amber); border-radius: 50%; animation: ep-spin .7s linear infinite; }
  @keyframes ep-spin { to { transform: rotate(360deg); } }
  .ep-bar-track { height: 7px; background: var(--surface3); border-radius: 4px; overflow: hidden; margin-top: 6px; }
  .ep-bar-fill { height: 100%; border-radius: 4px; transition: width .5s; }
  .ep-profile-ava { width: 76px; height: 76px; border-radius: 50%; background: var(--amber-dim); border: 3px solid var(--amber); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: var(--amber); flex-shrink: 0; }
  .ep-perf-grade { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; border: 4px solid var(--amber); color: var(--amber); }
  .ep-row-sep { display: flex; align-items: center; gap: 8px; padding: 11px 0; border-bottom: 1px solid var(--border); }
  .ep-row-sep:last-child { border-bottom: none; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  /* ── Production Task Cards ── */
  .ep-tcard { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; transition: all .15s; }
  .ep-tcard:hover { border-color: #363d54; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.3); }
  .ep-tcard.urgent { border-color: rgba(239,68,68,.3); background: linear-gradient(135deg,rgba(239,68,68,.04),transparent); }
  .ep-tcard.today-card { border-color: rgba(245,166,35,.25); background: linear-gradient(135deg,rgba(245,166,35,.04),transparent); }
  .ep-tgrid { display: grid; grid-template-columns: repeat(auto-fill,minmax(310px,1fr)); gap: 14px; }

  /* ── Grade Hero ── */
  .ep-grade-hero { background: linear-gradient(135deg,#1a1d2e 0%,#10131a 100%); border: 1px solid var(--border); border-radius: 14px; padding: 24px 28px; margin-bottom: 18px; position: relative; overflow: hidden; }
  .ep-grade-hero::before { content:''; position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: radial-gradient(circle,rgba(245,166,35,.18),transparent 70%); opacity: .4; pointer-events: none; }
  .ep-gh-title { font-size: 28px; font-weight: 800; letter-spacing: -.01em; line-height: 1.2; }
  .ep-gh-title span { color: var(--amber); }

  /* ── Stats 4-col ── */
  .ep-stats4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-top: 20px; }
  .ep-hstat { background: rgba(255,255,255,.02); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .ep-hstat-val { font-size: 26px; font-weight: 800; line-height: 1; margin-top: 4px; }
  .ep-hstat-trend { font-size: 11px; margin-top: 4px; }

  /* ── Section header ── */
  .ep-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .ep-sec-title { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .ep-sec-count { background: var(--amber-dim); color: var(--amber); padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }

  /* ── Alert banner ── */
  .ep-alert-banner { border-radius: 9px; padding: 12px 18px; display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }

  /* ── Perf 2-col ── */
  .ep-perf-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }

  /* ── Week grid ── */
  .ep-week-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; }
  .ep-day-col { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 8px; min-height: 110px; }
  .ep-day-col.today-col { border-color: var(--amber); }
  .ep-day-name { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; text-align: center; padding-bottom: 5px; border-bottom: 1px solid var(--border); margin-bottom: 5px; }
  .ep-day-name.today-name { color: var(--amber); }
  .ep-day-num { font-size: 15px; font-weight: 700; text-align: center; color: var(--text); margin-bottom: 5px; }

  /* ── Grade card ── */
  .ep-grade-card { background: linear-gradient(135deg,rgba(34,197,94,.08),transparent); border: 1px solid rgba(34,197,94,.2); border-radius: 12px; padding: 20px; text-align: center; }
  .ep-grade-letter { font-size: 64px; font-weight: 800; line-height: 1; letter-spacing: -.04em; }
  .ep-grade-bar { display: flex; gap: 3px; margin-top: 14px; }
  .ep-grade-bar-cell { flex: 1; height: 5px; border-radius: 3px; }

  /* ── Recent item ── */
  .ep-rec-item { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border); }
  .ep-rec-item:last-child { border-bottom: none; }
  .ep-rec-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; font-size: 13px; }

  @media (max-width: 900px) {
    .ep-side { transform: translateX(-100%); }
    .ep-main { margin-left: 0; }
    .ep-grid2, .ep-grid3, .ep-grid4 { grid-template-columns: 1fr; }
    .ep-kanban { grid-template-columns: 1fr 1fr; }
    .ep-editor-wrap { grid-template-columns: 1fr; height: auto; }
    .ep-stats4 { grid-template-columns: 1fr 1fr; }
    .ep-perf-grid { grid-template-columns: 1fr; }
    .ep-week-grid { grid-template-columns: repeat(4,1fr); }
  }
`;

// ─── Stage Dots ──────────────────────────────────────────────────────────────
function StageDots({ stage }) {
  const stages = ["S1", "S2", "S3", "S4"];
  const idx = stages.indexOf(stage);
  return (
    <div className="ep-stages">
      {stages.map((s, i) => {
        const cls = i < idx ? "done" : i === idx ? "current" : "pending";
        return (
          <div key={s} className={`ep-sdot ${cls}`} style={{ background: STAGE_COLOR[s], color: "#fff" }} title={STAGE_LABEL[s]}>
            {s.replace("S", "")}
          </div>
        );
      })}
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ emp, size = 30, fontSize = 11 }) {
  const url = emp?.personal?.profileImage;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--amber-dim)", border: "1.5px solid var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", fontSize, fontWeight: 800, color: "var(--amber)", overflow: "hidden", flexShrink: 0 }}>
      {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini(emp)}
    </div>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onSubmit }) {
  const stagesArr = ["S1","S2","S3","S4"];
  const curIdx    = stagesArr.indexOf(task.stage);
  const dl        = getDeadlineInfo(task);
  const brandColor = task.brandId?.color || "var(--amber)";
  const isDone    = task.status === "completed";

  return (
    <div className={`ep-tcard ${dl?.urgent ? "urgent" : dl?.today ? "today-card" : ""}`}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <span style={{ fontFamily:"monospace", fontSize:11, color:"var(--muted)" }}>#{task._id?.slice(-4)}</span>
        {task.brandId && (
          <span style={{ padding:"3px 9px", borderRadius:5, background: brandColor+"22", color: brandColor, fontSize:10.5, fontWeight:700 }}>
            {task.brandId.name}
          </span>
        )}
      </div>
      <div style={{ fontSize:14, fontWeight:600, lineHeight:1.4, marginBottom:14, color:"var(--text)" }}>
        {task.nomenclature || task.title}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        {task.stage && (
          <span style={{ padding:"5px 11px", borderRadius:6, background:"var(--surface3)", fontSize:11, fontWeight:600, color:"var(--text)" }}>
            ⚙️ {STAGE_LABEL[task.stage]}
          </span>
        )}
        {dl && (
          <span style={{ fontSize:11, color:dl.color, fontWeight: dl.urgent||dl.today ? 600 : 400 }}>⏰ {dl.text}</span>
        )}
      </div>
      <div style={{ display:"flex", gap:4, marginBottom:14 }}>
        {stagesArr.map((s,i) => (
          <div key={s} style={{ flex:1, height:5, borderRadius:3, background: i<curIdx ? "var(--green)" : i===curIdx ? "var(--amber)" : "var(--surface3)" }} />
        ))}
      </div>
      {isDone ? (
        <div style={{ width:"100%", padding:"9px", background:"rgba(34,197,94,.12)", color:"var(--green)", border:"none", borderRadius:8, fontWeight:600, fontSize:12.5, textAlign:"center" }}>
          ✓ Completed
        </div>
      ) : (
        <button onClick={() => onSubmit(task)}
          style={{ width:"100%", padding:"9px", background:"var(--amber)", color:"#000", border:"none", borderRadius:8, fontWeight:600, fontSize:12.5, cursor:"pointer", fontFamily:"inherit" }}>
          Submit Stage {STAGE_NUM[task.stage] || ""} ✓
        </button>
      )}
    </div>
  );
}

// ─── SubmitStageModal ─────────────────────────────────────────────────────────
function SubmitStageModal({ task, onClose, onSuccess }) {
  const [proofUrl,   setProofUrl]   = useState("");
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nextStage = NEXT_STAGE[task.stage] || task.stage;
  const nextNum   = STAGE_NUM[nextStage] || "";

  async function handleSubmit() {
    if (!proofUrl.trim()) { toast.warn("Please enter a Proof URL"); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/employee/stage-submit", {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({ taskId: task._id, proofUrl: proofUrl.trim(), notes }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Stage submitted! Auto-graded & moved to next stage.");
        onSuccess(d.task);
      } else {
        toast.error(d.message || "Submission failed");
      }
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="ep-overlay" onClick={onClose}>
      <div className="ep-modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
        <div className="ep-modal-hd">
          <div className="ep-modal-title">✓ Submit Stage Completion</div>
          <button className="ep-btn ep-btn-ghost ep-btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ background:"rgba(59,130,246,.06)", border:"1px solid rgba(59,130,246,.2)", borderRadius:9, padding:"11px 16px", display:"flex", alignItems:"center", gap:11, marginBottom:14 }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <div style={{ fontSize:12.5 }}><strong>Auto-grading enabled.</strong> Status, delay, and grade are calculated automatically when you submit.</div>
        </div>

        <div style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
            <span style={{ fontFamily:"monospace", fontSize:11, color:"var(--muted)" }}>#{task._id?.slice(-4)}</span>
            {task.brandId && (
              <span style={{ padding:"3px 9px", borderRadius:5, background:(task.brandId.color||"var(--amber)")+"22", color:task.brandId.color||"var(--amber)", fontSize:10.5, fontWeight:700 }}>
                {task.brandId.name}
              </span>
            )}
          </div>
          <div style={{ fontSize:13.5, fontWeight:600, marginBottom:6 }}>{task.nomenclature || task.title}</div>
          <div style={{ fontSize:11, color:"var(--muted)" }}>
            Currently at: <strong style={{ color:"var(--amber)" }}>Stage {STAGE_NUM[task.stage]} — {STAGE_LABEL[task.stage]}</strong>
          </div>
        </div>

        <div className="ep-form-g">
          <label className="ep-label">Stage Completed</label>
          <select className="ep-select">
            <option>Stage {STAGE_NUM[task.stage]} — {STAGE_LABEL[task.stage]} (auto-detected)</option>
          </select>
        </div>

        <div className="ep-form-g">
          <label className="ep-label">Proof URL <span style={{ color:"var(--red)" }}>*</span></label>
          <input className="ep-input" placeholder="https://drive.google.com/... or Instagram link"
            value={proofUrl} onChange={e => setProofUrl(e.target.value)} />
          <div style={{ fontSize:10.5, color:"var(--muted)", marginTop:4 }}>Drive link, Instagram URL, Figma link, or any delivery URL</div>
        </div>

        <div className="ep-form-g">
          <label className="ep-label">Notes (optional)</label>
          <textarea className="ep-textarea" rows={3} placeholder="Anything the next stage should know? Revisions made? Etc."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:4 }}>
          <button className="ep-btn ep-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ep-btn ep-btn-primary" onClick={handleSubmit} disabled={submitting||!proofUrl.trim()}>
            {submitting ? <span className="ep-spinner" style={{ width:14, height:14 }} /> : null}
            {submitting ? "Submitting…" : `✓ Submit & Move to Stage ${nextNum}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TODAY VIEW ──────────────────────────────────────────────────────────────
function TodayView({ emp, empRole }) {
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [time,       setTime]       = useState("");
  const [submitTask, setSubmitTask] = useState(null);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetch("/api/employee/tasks", { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now      = new Date(); now.setHours(0,0,0,0);
  const active   = tasks.filter(t => t.status !== "completed");
  const overdue  = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed");
  const dueToday = tasks.filter(t => isDueToday(t.dueDate) && t.status !== "completed");
  const doneWeek = tasks.filter(t => t.status === "completed" && new Date(t.updatedAt) >= new Date(Date.now() - 7*86400000));
  const upcoming = tasks.filter(t => {
    if (!t.dueDate || t.status === "completed") return false;
    const d = new Date(t.dueDate); d.setHours(0,0,0,0);
    const diff = Math.round((d - now) / 86400000);
    return diff > 0 && diff <= 7;
  });
  const grade      = calcGrade(tasks);
  const todayTasks = [...new Map([...overdue, ...dueToday].map(t => [t._id, t])).values()];

  // ── Writer: simplified hero + due today view ───────────────────────────────
  if (empRole === "writer") {
    return (
      <div className="ep-content">
        <div className="ep-hero">
          <div>
            <div className="ep-hero-greeting">{getGreeting()}, {emp?.firstName || "there"} 👋</div>
            <div className="ep-hero-sub" style={{ marginTop:6 }}>
              <i className="bi bi-pencil-square" style={{ marginRight:6 }} />
              Script Writer · {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div className="ep-hero-time">{time}</div>
            <div className="ep-hero-date">{new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}</div>
          </div>
        </div>
        <div className="ep-grid3" style={{ marginBottom:22 }}>
          {[
            { val:active.length,   label:"Active Tasks",   color:"var(--blue)" },
            { val:overdue.length,  label:"Overdue",        color: overdue.length>0 ? "var(--red)" : "var(--green)" },
            { val:doneWeek.length, label:"Done This Week", color:"var(--green)" },
          ].map(s => (
            <div key={s.label} className="ep-stat">
              <div className="ep-stat-num" style={{ color:s.color }}>{loading ? "—" : s.val}</div>
              <div className="ep-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="ep-grid2">
          <div className="ep-card">
            <div className="ep-card-title"><i className="bi bi-calendar-check" style={{ color:"var(--amber)" }} /> Due Today ({dueToday.length})</div>
            {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
             : dueToday.length === 0 ? <div className="ep-empty"><i className="bi bi-check2-all" /><p>No tasks due today</p></div>
             : dueToday.map(t => (
              <div key={t._id} className="ep-row-sep">
                <div style={{ width:8, height:8, borderRadius:"50%", background:STATUS_COLOR[t.status]||"#64748b", flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.nomenclature||t.title}</div>
                  {t.brandId && <div style={{ fontSize:11, color:"var(--muted)", marginTop:2, display:"flex", alignItems:"center" }}><span className="ep-brand-dot" style={{ background:t.brandId.color }} />{t.brandId.name}</div>}
                </div>
                <span className="ep-badge" style={{ background:(STATUS_COLOR[t.status]||"#64748b")+"22", color:STATUS_COLOR[t.status]||"#64748b" }}>{STATUS_LABEL[t.status]||t.status}</span>
              </div>
            ))}
          </div>
          <div className="ep-card">
            <div className="ep-card-title"><i className="bi bi-activity" style={{ color:"var(--amber)" }} /> Recent Activity</div>
            {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
             : tasks.length === 0 ? <div className="ep-empty"><i className="bi bi-inbox" /><p>No tasks assigned</p></div>
             : tasks.slice(0,7).map(t => (
              <div key={t._id} className="ep-row-sep" style={{ gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:STATUS_COLOR[t.status]||"#64748b", marginTop:4, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.nomenclature||t.title}</div>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>
                    {STATUS_LABEL[t.status]||t.status}
                    {t.stage && <span style={{ marginLeft:6, padding:"1px 6px", borderRadius:4, background:STAGE_COLOR[t.stage]+"22", color:STAGE_COLOR[t.stage], fontSize:10, fontWeight:700 }}>{t.stage}</span>}
                    {" · "}{fmtD(t.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Enhanced: designer / editor / developer / general ─────────────────────
  const roleIcon = { designer:"bi-vector-pen", editor:"bi-film", developer:"bi-code-slash", general:"bi-person" };

  return (
    <div className="ep-content">

      {/* Grade Hero Banner */}
      <div className="ep-grade-hero">
        <div style={{ fontSize:13, color:"var(--muted)", marginBottom:6 }}>{getGreeting()}, {emp?.firstName || "there"} 👋</div>
        <div className="ep-gh-title">
          {loading ? "Loading…" : <>You're at <span>{grade.letter}</span> this month</>}
        </div>
        <div style={{ fontSize:13, color:"var(--muted)", marginTop:8, maxWidth:580, lineHeight:1.55 }}>
          You have <strong style={{ color:"var(--text)" }}>{todayTasks.length} task{todayTasks.length!==1?"s":""} today</strong>
          {overdue.length>0 && <> including <strong style={{ color:"var(--red)" }}>{overdue.length} overdue</strong></>}.
          {" "}Submit on time to lock in your grade.
        </div>
        <div className="ep-stats4">
          {[
            { lbl:"Today's Tasks",  val: loading?"—":todayTasks.length, color:"var(--text)",   trend: overdue.length>0 ? <span style={{ color:"var(--red)",fontSize:11 }}>{overdue.length} overdue, {dueToday.length} due today</span> : null },
            { lbl:"This Week",      val: loading?"—":active.length,     color:"var(--text)",   trend: <span style={{ color:"var(--muted)",fontSize:11 }}>active tasks</span> },
            { lbl:"On-Time Rate",   val: loading?"—":`${grade.rate}%`,  color: grade.color,    trend: <span style={{ color: grade.rate>=80?"var(--green)":"var(--amber)",fontSize:11 }}>{grade.rate>=80?"↑ Good":"↓ Keep improving"}</span> },
            { lbl:"Done This Week", val: loading?"—":doneWeek.length,   color:"var(--green)",  trend: <span style={{ color:"var(--muted)",fontSize:11 }}>submissions</span> },
          ].map(s => (
            <div key={s.lbl} className="ep-hstat">
              <div style={{ fontSize:10, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600 }}>{s.lbl}</div>
              <div className="ep-hstat-val" style={{ color:s.color }}>{s.val}</div>
              <div className="ep-hstat-trend">{s.trend}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue alert */}
      {!loading && overdue.length>0 && (
        <div className="ep-alert-banner" style={{ background:"rgba(239,68,68,.06)", border:"1px solid rgba(239,68,68,.25)" }}>
          <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
          <div style={{ flex:1, fontSize:12.5 }}>
            <strong>"{overdue[0].nomenclature||overdue[0].title}" is overdue.</strong>
            {overdue[0].brandId && ` ${overdue[0].brandId.name} needs this`} — submit now to minimize grade impact.
          </div>
          <button className="ep-btn ep-btn-ghost ep-btn-sm" onClick={() => setSubmitTask(overdue[0])}>Submit Now</button>
        </div>
      )}

      {/* Today's Tasks */}
      <div className="ep-sec-hd">
        <div className="ep-sec-title">📌 Today's Tasks <span className="ep-sec-count">{todayTasks.length}</span></div>
      </div>
      {loading ? (
        <div className="ep-empty"><div className="ep-spinner" /></div>
      ) : todayTasks.length === 0 ? (
        <div className="ep-card" style={{ textAlign:"center", padding:"28px 20px", marginBottom:22 }}>
          <i className="bi bi-check2-all" style={{ fontSize:32, color:"var(--green)", display:"block", marginBottom:8 }} />
          <div style={{ color:"var(--muted)" }}>No tasks due today — you're all caught up!</div>
        </div>
      ) : (
        <div className="ep-tgrid" style={{ marginBottom:22 }}>
          {todayTasks.map(t => <TaskCard key={t._id} task={t} onSubmit={setSubmitTask} />)}
        </div>
      )}

      {/* Upcoming This Week */}
      {upcoming.length>0 && (
        <>
          <div className="ep-sec-hd">
            <div className="ep-sec-title">📅 Coming Up This Week <span className="ep-sec-count">{upcoming.length}</span></div>
          </div>
          <div className="ep-tgrid" style={{ marginBottom:22 }}>
            {upcoming.slice(0,4).map(t => <TaskCard key={t._id} task={t} onSubmit={setSubmitTask} />)}
          </div>
        </>
      )}

      {/* Bottom: Recent + Grade */}
      <div className="ep-perf-grid">
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-clock-history" style={{ color:"var(--amber)" }} /> Recent Tasks</div>
          {tasks.slice(0,5).map(t => {
            const od = isOverdue(t.dueDate) && t.status !== "completed";
            return (
              <div key={t._id} className="ep-rec-item">
                <div className="ep-rec-icon" style={{
                  background: t.status==="completed" ? "rgba(34,197,94,.15)" : od ? "rgba(239,68,68,.15)" : "var(--amber-dim)",
                  color: t.status==="completed" ? "var(--green)" : od ? "var(--red)" : "var(--amber)",
                }}>
                  {t.stage?.replace("S","") || "—"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.nomenclature||t.title}</div>
                  <div style={{ fontSize:10.5, color:"var(--muted)", marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                    {t.brandId && <><span className="ep-brand-dot" style={{ background:t.brandId.color }} />{t.brandId.name} · </>}
                    {fmtD(t.dueDate)}
                  </div>
                </div>
                <span className="ep-badge" style={{ background:(STATUS_COLOR[t.status]||"#64748b")+"22", color:STATUS_COLOR[t.status]||"#64748b", fontSize:10 }}>
                  {STATUS_LABEL[t.status]||t.status}
                </span>
              </div>
            );
          })}
        </div>

        <div className="ep-grade-card">
          <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600 }}>
            {new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})} Grade
          </div>
          <div className="ep-grade-letter" style={{ color:grade.color, margin:"8px 0" }}>{loading ? "—" : grade.letter}</div>
          <div style={{ fontSize:11, color:"var(--muted)" }}>On-time rate: {grade.rate}%</div>
          <div className="ep-grade-bar">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="ep-grade-bar-cell" style={{ background: i<Math.round(grade.rate/20) ? grade.color : "var(--surface3)" }} />
            ))}
          </div>
          <div style={{ fontSize:12, color:"var(--muted)", marginTop:14, lineHeight:1.5 }}>
            {grade.rate>=80 ? "Keep submitting on time to maintain your grade!" :
             grade.rate>=60 ? "Aim for on-time submissions to reach A this month." :
             "Focus on completing overdue tasks to boost your grade."}
          </div>
        </div>
      </div>

      {submitTask && (
        <SubmitStageModal
          task={submitTask}
          onClose={() => setSubmitTask(null)}
          onSuccess={updated => {
            setTasks(prev => prev.map(t => t._id===updated._id ? updated : t));
            setSubmitTask(null);
          }}
        />
      )}
    </div>
  );
}

// ─── MY TASKS VIEW ────────────────────────────────────────────────────────────
function MyTasksView() {
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState("");
  const [typeF,   setTypeF]   = useState("");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusF) params.set("status", statusF);
    if (typeF)   params.set("taskType", typeF);
    setLoading(true);
    fetch(`/api/employee/tasks?${params}`, { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusF, typeF]);

  const filtered = tasks.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (t.nomenclature || t.title || "").toLowerCase().includes(s) ||
           (t.brandId?.name || "").toLowerCase().includes(s);
  });

  return (
    <div className="ep-content">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input className="ep-input" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%" }} />
        </div>
        <select className="ep-select" style={{ width: 150 }} value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="completed">Done</option>
          <option value="blocked">Blocked</option>
        </select>
        <select className="ep-select" style={{ width: 150 }} value={typeF} onChange={e => setTypeF(e.target.value)}>
          <option value="">All Types</option>
          <option value="production">Production</option>
          <option value="project">Project</option>
          <option value="sprint">Sprint</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      <div className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="ep-empty"><div className="ep-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="ep-empty"><i className="bi bi-inbox" /><p>No tasks found</p></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="ep-tbl">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Brand</th>
                  <th>Type</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const od = isOverdue(t.dueDate) && t.status !== "completed";
                  return (
                    <tr key={t._id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.nomenclature || t.title}</div>
                        {t.contentType && (
                          <span className="ep-chip" style={{ marginTop: 3, background: (CTYPE_COLOR[t.contentType] || "#64748b") + "22", color: CTYPE_COLOR[t.contentType] || "#64748b" }}>
                            {t.contentType}
                          </span>
                        )}
                      </td>
                      <td>
                        {t.brandId ? (
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <span className="ep-brand-dot" style={{ background: t.brandId.color }} />
                            <span style={{ fontSize: 12 }}>{t.brandId.name}</span>
                          </div>
                        ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
                      </td>
                      <td><span style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "capitalize" }}>{t.taskType}</span></td>
                      <td>{t.stage ? <StageDots stage={t.stage} /> : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}</td>
                      <td>
                        <span className="ep-badge" style={{ background: (STATUS_COLOR[t.status] || "#64748b") + "22", color: STATUS_COLOR[t.status] || "#64748b" }}>
                          {STATUS_LABEL[t.status] || t.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: od ? "var(--red)" : "var(--text)", fontWeight: od ? 700 : 400 }}>
                          {od && <i className="bi bi-exclamation-circle" style={{ marginRight: 4 }} />}
                          {fmtD(t.dueDate)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONTENT EDITOR VIEW (writer) ────────────────────────────────────────────
function ContentEditorView() {
  const [tasks,      setTasks]      = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [script,     setScript]     = useState("");
  const [caption,    setCaption]    = useState("");
  const [refLink,    setRefLink]    = useState("");
  const [tagInput,   setTagInput]   = useState("");
  const [tags,       setTags]       = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetch("/api/employee/tasks?taskType=production", { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks.filter(t => !t.stage || t.stage === "S1")); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function selectTask(t) {
    setSelected(t);
    setScript(t.description || "");
    setCaption(t.caption || "");
    setRefLink(t.referenceLink || "");
    setTags(t.tags || []);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/employee/tasks/${selected._id}`, {
        method: "PATCH",
        headers: authH(),
        body: JSON.stringify({ description: script, caption, referenceLink: refLink, tags }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Saved!");
        setTasks(prev => prev.map(t => t._id === d.task._id ? { ...t, ...d.task } : t));
        setSelected(s => ({ ...s, ...d.task }));
      } else toast.error(d.message);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  function addTag(e) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !tags.includes(val)) setTags(prev => [...prev, val]);
      setTagInput("");
    }
  }

  const brandVoice = selected?.brandId ? [
    "Keep tone conversational and relatable",
    "Use power words that create urgency",
    "Hook in first 3 seconds",
    "End with a clear call-to-action",
    "Match brand color palette in visuals",
  ] : [];

  return (
    <div className="ep-content" style={{ padding: "20px 24px" }}>
      <div className="ep-editor-wrap">
        {/* Left — task list */}
        <div className="ep-editor-left">
          <div className="ep-editor-left-hd">Script Tasks ({tasks.length})</div>
          {loading ? (
            <div className="ep-empty"><div className="ep-spinner" /></div>
          ) : tasks.length === 0 ? (
            <div className="ep-empty"><i className="bi bi-pencil" /><p>No S1 tasks assigned</p></div>
          ) : tasks.map(t => (
            <div key={t._id} className={`ep-titem ${selected?._id === t._id ? "active" : ""}`} onClick={() => selectTask(t)}>
              <div className="ep-titem-name">{t.nomenclature || t.title}</div>
              <div className="ep-titem-meta">
                {t.brandId && <><span className="ep-brand-dot" style={{ background: t.brandId.color }} />{t.brandId.name} · </>}
                {t.contentType || "—"} · {fmtD(t.dueDate)}
              </div>
            </div>
          ))}
        </div>

        {/* Center — editor */}
        <div className="ep-editor-center">
          {!selected ? (
            <div className="ep-empty" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <i className="bi bi-cursor-text" style={{ fontSize: 48, color: "var(--muted)" }} />
              <p style={{ marginTop: 10, color: "var(--muted)" }}>Select a task to start writing</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{selected.nomenclature || selected.title}</div>
                  {selected.brandId && (
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      <span className="ep-brand-dot" style={{ background: selected.brandId.color }} />{selected.brandId.name} · {selected.contentType}
                    </div>
                  )}
                </div>
                <button className="ep-btn ep-btn-primary ep-btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="ep-spinner" style={{ width: 14, height: 14 }} /> : <i className="bi bi-check2" />}
                  {saving ? "Saving…" : "Save Draft"}
                </button>
              </div>

              <div className="ep-form-g">
                <label className="ep-label">Script / Copy</label>
                <textarea className="ep-textarea" rows={10} value={script} onChange={e => setScript(e.target.value)} placeholder="Write the script or copy here…" />
              </div>

              <div className="ep-form-g">
                <label className="ep-label">Caption</label>
                <textarea className="ep-textarea" rows={3} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Instagram / social media caption…" />
              </div>

              <div className="ep-form-g">
                <label className="ep-label">Hashtags</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 10px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, minHeight: 42 }}>
                  {tags.map(tag => (
                    <span key={tag} className="ep-hashtag" onClick={() => setTags(prev => prev.filter(x => x !== tag))}>
                      #{tag}<span className="ep-hashtag-x">×</span>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder={tags.length === 0 ? "Type hashtag + Enter…" : ""}
                    style={{ border: "none", background: "transparent", color: "var(--text)", outline: "none", fontSize: 12.5, minWidth: 120 }}
                  />
                </div>
              </div>

              <div className="ep-form-g">
                <label className="ep-label">Reference Link</label>
                <input className="ep-input" type="url" value={refLink} onChange={e => setRefLink(e.target.value)} placeholder="https://…" />
              </div>
            </>
          )}
        </div>

        {/* Right — brand voice */}
        <div className="ep-editor-right">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--muted)", marginBottom: 12 }}>Brand Voice</div>
          {!selected?.brandId ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Select a task to view brand guidelines.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span className="ep-brand-dot" style={{ background: selected.brandId.color, width: 12, height: 12 }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{selected.brandId.name}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {brandVoice.map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.5, padding: "8px 10px", background: "var(--surface2)", borderRadius: 7 }}>
                    <i className="bi bi-check-circle-fill" style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: "var(--text)" }}>{tip}</span>
                  </div>
                ))}
              </div>
              <div className="ep-divider" />
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--muted)", marginBottom: 8 }}>Content Type</div>
              {selected.contentType && (
                <span className="ep-chip" style={{ background: (CTYPE_COLOR[selected.contentType] || "#64748b") + "22", color: CTYPE_COLOR[selected.contentType] || "#64748b" }}>
                  {selected.contentType}
                </span>
              )}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--muted)", marginBottom: 8 }}>Due Date</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isOverdue(selected.dueDate) ? "var(--red)" : "var(--text)" }}>{fmtD(selected.dueDate, true)}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BRAND CALENDAR VIEW ──────────────────────────────────────────────────────
function BrandCalendarView() {
  const [myTasks,    setMyTasks]    = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [selBrand,   setSelBrand]   = useState(null);
  const [brandTasks, setBrandTasks] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [loadingB,   setLoadingB]   = useState(true);

  useEffect(() => {
    fetch("/api/employee/tasks", { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMyTasks(d.tasks);
          const seen = new Set();
          const bs = [];
          d.tasks.forEach(t => {
            if (t.brandId && !seen.has(t.brandId._id)) {
              seen.add(t.brandId._id);
              bs.push(t.brandId);
            }
          });
          setBrands(bs);
          if (bs.length > 0) setSelBrand(bs[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingB(false));
  }, []);

  useEffect(() => {
    if (!selBrand) return;
    setLoading(true);
    fetch(`/api/employee/brand-tasks?brandId=${selBrand._id}`, { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setBrandTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selBrand]);

  function groupByWeek(tasks) {
    const groups = {};
    tasks.forEach(t => {
      const d = new Date(t.scheduledFor || t.dueDate || t.createdAt);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const key = monday.toISOString().slice(0, 10);
      if (!groups[key]) groups[key] = { monday, tasks: [] };
      groups[key].tasks.push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }

  const weeks = groupByWeek(brandTasks);

  return (
    <div className="ep-content">
      {loadingB ? (
        <div className="ep-empty"><div className="ep-spinner" /></div>
      ) : brands.length === 0 ? (
        <div className="ep-empty"><i className="bi bi-calendar-x" /><p>No brands with tasks assigned to you</p></div>
      ) : (
        <>
          <div className="ep-brand-tabs">
            {brands.map(b => (
              <div key={b._id} className={`ep-brand-tab ${selBrand?._id === b._id ? "active" : ""}`} onClick={() => setSelBrand(b)}>
                <span className="ep-brand-dot" style={{ background: b.color }} />{b.name}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="ep-empty"><div className="ep-spinner" /></div>
          ) : brandTasks.length === 0 ? (
            <div className="ep-empty"><i className="bi bi-calendar2" /><p>No tasks found for this brand</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {weeks.map(([key, { monday, tasks }]) => {
                const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
                return (
                  <div key={key} className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", fontWeight: 700, fontSize: 13 }}>
                      Week of {fmtD(monday)} – {fmtD(sunday)} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({tasks.length} task{tasks.length !== 1 ? "s" : ""})</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="ep-tbl">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Nomenclature</th>
                            <th>Description</th>
                            <th>Stage</th>
                            <th>Assignee</th>
                            <th>Ref Link</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => (
                            <tr key={t._id}>
                              <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtD(t.scheduledFor || t.dueDate)}</td>
                              <td>
                                {t.contentType ? (
                                  <span className="ep-chip" style={{ background: (CTYPE_COLOR[t.contentType] || "#64748b") + "22", color: CTYPE_COLOR[t.contentType] || "#64748b" }}>
                                    {t.contentType}
                                  </span>
                                ) : "—"}
                              </td>
                              <td style={{ fontSize: 12, fontWeight: 600 }}>{t.nomenclature || "—"}</td>
                              <td style={{ maxWidth: 200, fontSize: 12, color: "var(--muted)" }}>
                                {(t.description || "—").slice(0, 80)}{t.description?.length > 80 ? "…" : ""}
                              </td>
                              <td>
                                {t.stage ? (
                                  <span className="ep-badge" style={{ background: STAGE_COLOR[t.stage] + "22", color: STAGE_COLOR[t.stage] }}>{t.stage}</span>
                                ) : "—"}
                              </td>
                              <td style={{ fontSize: 12 }}>
                                {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : "—"}
                              </td>
                              <td>
                                {t.referenceLink ? (
                                  <a href={t.referenceLink} target="_blank" rel="noopener noreferrer" style={{ color: "var(--amber)", fontSize: 12 }}>
                                    <i className="bi bi-link-45deg" /> View
                                  </a>
                                ) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── DESIGN QUEUE VIEW (designer / editor) ───────────────────────────────────
function DesignQueueView({ empRole }) {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  const assignedStage = empRole === "editor" ? "S3" : "S2";

  useEffect(() => {
    fetch(`/api/employee/tasks?taskType=production`, { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTasks(d.tasks.filter(t => !t.stage || t.stage === assignedStage));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assignedStage]);

  const BUCKETS = ["all", "todo", "in_progress", "review", "completed"];
  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  const typeIcon = { reel: "bi-play-circle", post: "bi-image", carousel: "bi-collection", story: "bi-phone" };

  return (
    <div className="ep-content">
      <div className="ep-tabs">
        {BUCKETS.map(b => (
          <button key={b} className={`ep-tab ${filter === b ? "active" : ""}`} onClick={() => setFilter(b)}>
            {b === "all" ? "All" : STATUS_LABEL[b]}
            {" "}({b === "all" ? tasks.length : tasks.filter(t => t.status === b).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ep-empty"><div className="ep-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="ep-empty"><i className="bi bi-inbox" /><p>No tasks in this queue</p></div>
      ) : (
        <div className="ep-queue">
          {filtered.map(t => (
            <div key={t._id} className="ep-qcard">
              <div className="ep-qcard-thumb">
                <i className={`bi ${typeIcon[t.contentType] || "bi-file-earmark"}`} />
              </div>
              <div className="ep-qcard-body">
                <div className="ep-qcard-title">{t.nomenclature || t.title}</div>
                <div className="ep-qcard-meta">
                  {t.brandId && <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <span className="ep-brand-dot" style={{ background: t.brandId.color }} />{t.brandId.name}
                  </div>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                    <span className="ep-badge" style={{ background: (STATUS_COLOR[t.status] || "#64748b") + "22", color: STATUS_COLOR[t.status] || "#64748b" }}>
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                    <span style={{ fontSize: 11, color: isOverdue(t.dueDate) ? "var(--red)" : "var(--muted)" }}>
                      {fmtD(t.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SPRINT BOARD VIEW (developer) ───────────────────────────────────────────
function SprintBoardView() {
  const [tasks,    setTasks]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [selProj,  setSelProj]  = useState("all");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/employee/tasks?taskType=sprint", { headers: authH() }).then(r => r.json()),
      fetch("/api/employee/projects",              { headers: authH() }).then(r => r.json()),
    ]).then(([td, pd]) => {
      if (td.success) setTasks(td.tasks);
      if (pd.success) setProjects(pd.projects);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const visibleTasks = selProj === "all" ? tasks : tasks.filter(t => {
    const pid = typeof t.projectId === "object" ? t.projectId?._id : t.projectId;
    return pid === selProj;
  });

  async function updateStatus(taskId, status) {
    const r = await fetch(`/api/employee/tasks/${taskId}`, {
      method: "PATCH",
      headers: authH(),
      body: JSON.stringify({ status }),
    });
    const d = await r.json();
    if (d.success) {
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status } : t));
      toast.success("Status updated");
    } else toast.error(d.message);
  }

  return (
    <div className="ep-content">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <select className="ep-select" style={{ width: 220 }} value={selProj} onChange={e => setSelProj(e.target.value)}>
          <option value="all">All Projects ({tasks.length} tasks)</option>
          {projects.map(p => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{visibleTasks.length} task{visibleTasks.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="ep-empty"><div className="ep-spinner" /></div>
      ) : (
        <div className="ep-kanban">
          {KANBAN_COLS.map(col => {
            const colTasks = visibleTasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="ep-kcol">
                <div className="ep-kcol-hd">
                  <span style={{ color: col.color }}>{col.label}</span>
                  <span style={{ background: col.color + "22", color: col.color, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 && (
                  <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Empty</div>
                )}
                {colTasks.map(t => (
                  <div key={t._id} className="ep-kcard">
                    <div className="ep-kcard-title">{t.title}</div>
                    <div className="ep-kcard-meta">
                      {t.priority && (
                        <span className="ep-badge" style={{ background: "var(--surface3)", color: "var(--muted)", fontSize: 10 }}>
                          {t.priority}
                        </span>
                      )}
                      {fmtD(t.dueDate) !== "—" && (
                        <span style={{ color: isOverdue(t.dueDate) ? "var(--red)" : "var(--muted)" }}>
                          {fmtD(t.dueDate)}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <select
                        value={t.status}
                        onChange={e => updateStatus(t._id, e.target.value)}
                        style={{ width: "100%", padding: "5px 8px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none", cursor: "pointer" }}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="completed">Done</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── THIS WEEK VIEW ───────────────────────────────────────────────────────────
function ThisWeekView() {
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitTask, setSubmitTask] = useState(null);

  useEffect(() => {
    fetch("/api/employee/tasks", { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date(); today.setHours(0,0,0,0);
  const dow    = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow===0 ? 6 : dow-1));
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); return d; });
  const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  function dayTasks(day) {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate); d.setHours(0,0,0,0);
      return d.getTime() === day.getTime();
    });
  }

  const activeTasks = tasks.filter(t => t.status !== "completed");

  return (
    <div className="ep-content">
      <div className="ep-card" style={{ marginBottom:18 }}>
        <div className="ep-card-title">
          <i className="bi bi-calendar3" style={{ color:"var(--amber)" }} />
          {monday.toLocaleDateString("en-IN",{day:"numeric",month:"short"})} — {days[6].toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
          <span style={{ fontSize:12, color:"var(--muted)", fontWeight:400 }}>  · {activeTasks.length} active tasks</span>
        </div>
        {loading ? (
          <div className="ep-empty"><div className="ep-spinner" /></div>
        ) : (
          <div className="ep-week-grid">
            {days.map((day,i) => {
              const dt = dayTasks(day);
              const isToday = day.getTime() === today.getTime();
              return (
                <div key={i} className={`ep-day-col ${isToday?"today-col":""}`}>
                  <div className={`ep-day-name ${isToday?"today-name":""}`}>{DAY_NAMES[i]}</div>
                  <div className="ep-day-num">{day.getDate()}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    {dt.map(t => (
                      <div key={t._id}
                        onClick={() => setSubmitTask(t)}
                        style={{ padding:"2px 5px", borderRadius:4, background:(t.brandId?.color||"var(--amber)")+"22", color:t.brandId?.color||"var(--amber)", fontSize:9.5, fontWeight:600, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}
                        title={t.nomenclature||t.title}>
                        {t.brandId?.name||(t.nomenclature||t.title).slice(0,8)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="ep-sec-hd">
        <div className="ep-sec-title">📋 All Active Tasks</div>
        <span style={{ fontSize:12, color:"var(--muted)" }}>{activeTasks.length} tasks</span>
      </div>
      {loading ? (
        <div className="ep-empty"><div className="ep-spinner" /></div>
      ) : activeTasks.length === 0 ? (
        <div className="ep-empty"><i className="bi bi-calendar-x" /><p>No active tasks</p></div>
      ) : (
        <div className="ep-tgrid">
          {activeTasks.map(t => <TaskCard key={t._id} task={t} onSubmit={setSubmitTask} />)}
        </div>
      )}

      {submitTask && (
        <SubmitStageModal task={submitTask} onClose={() => setSubmitTask(null)}
          onSuccess={updated => { setTasks(prev => prev.map(t => t._id===updated._id?updated:t)); setSubmitTask(null); }} />
      )}
    </div>
  );
}

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView() {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employee/tasks", { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function gradeLetter(task) {
    if (task.status !== "completed" || !task.dueDate) return null;
    const diffH = Math.round((new Date(task.updatedAt) - new Date(task.dueDate)) / 3600000);
    if (diffH <= 0)  return "A";
    if (diffH <= 4)  return "B";
    if (diffH <= 12) return "C";
    if (diffH <= 24) return "D";
    return "F";
  }
  const gradeColor = { A:"var(--green)", B:"var(--amber)", C:"#f59e0b", D:"var(--red)", F:"var(--red)" };
  const sorted = [...tasks].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const completed = sorted.filter(t => t.status === "completed");

  return (
    <div className="ep-content">
      <div className="ep-card" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div className="ep-card-title" style={{ margin:0 }}>
            <i className="bi bi-clock-history" style={{ color:"var(--amber)" }} /> Submission History ({completed.length})
          </div>
          <div style={{ display:"flex", gap:8, fontSize:11 }}>
            {["A","B","C","D","F"].filter(g => completed.some(t=>gradeLetter(t)===g)).map(g => (
              <span key={g} style={{ padding:"2px 9px", borderRadius:20, background:(gradeColor[g]||"#64748b")+"22", color:gradeColor[g]||"#64748b", fontWeight:600 }}>
                {completed.filter(t=>gradeLetter(t)===g).length} {g}
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="ep-empty"><div className="ep-spinner" /></div>
        ) : completed.length === 0 ? (
          <div className="ep-empty"><i className="bi bi-inbox" /><p>No completed tasks yet</p></div>
        ) : completed.map(t => {
          const g  = gradeLetter(t);
          const gc = gradeColor[g] || "var(--muted)";
          return (
            <div key={t._id} className="ep-rec-item" style={{ padding:"11px 18px" }}>
              <div className="ep-rec-icon" style={{ background:gc+"22", color:gc }}>{g||"—"}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {t.nomenclature||t.title}
                </div>
                <div style={{ fontSize:10.5, color:"var(--muted)", marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                  {t.brandId && <><span className="ep-brand-dot" style={{ background:t.brandId.color }} />{t.brandId.name} · </>}
                  {t.stage && <><span style={{ padding:"1px 5px", borderRadius:3, background:STAGE_COLOR[t.stage]+"22", color:STAGE_COLOR[t.stage], fontSize:9.5, fontWeight:700 }}>{t.stage}</span> · </>}
                  {fmtD(t.updatedAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── GRADES VIEW ──────────────────────────────────────────────────────────────
function GradesView() {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employee/tasks", { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const grade = calcGrade(tasks);

  const BREAKDOWN = [
    { g:"A",  title:"Submitted Early", range:"0h or before",  color:"var(--green)" },
    { g:"B",  title:"Slightly Late",   range:"+0 to +4h",     color:"var(--amber)" },
    { g:"C",  title:"Late",            range:"+4 to +12h",    color:"#f59e0b" },
    { g:"D",  title:"Very Late",       range:"+12 to +24h",   color:"var(--red)" },
    { g:"F",  title:"Over 24h Late",   range:"+24h or more",  color:"var(--red)" },
  ];

  if (loading) return <div className="ep-content"><div className="ep-empty"><div className="ep-spinner" /></div></div>;

  return (
    <div className="ep-content">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:18, marginBottom:18 }}>
        <div className="ep-grade-card" style={{ padding:30 }}>
          <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".08em", fontWeight:600 }}>Current Grade</div>
          <div className="ep-grade-letter" style={{ color:grade.color, fontSize:80, margin:"10px 0" }}>{grade.letter}</div>
          <div style={{ fontSize:11, color:"var(--muted)" }}>
            {new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})} · On-time {grade.rate}%
          </div>
          <div className="ep-grade-bar">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="ep-grade-bar-cell" style={{ background: i<Math.round(grade.rate/20)?grade.color:"var(--surface3)" }} />
            ))}
          </div>
          <div style={{ fontSize:12, color:"var(--muted)", marginTop:14, lineHeight:1.5 }}>
            {grade.rate>=80 ? "Excellent! Keep submitting on time." :
             grade.rate>=60 ? "Aim to reduce delays to reach A." :
             "Focus on timely submissions to improve your grade."}
          </div>
        </div>

        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-trophy" style={{ color:"var(--amber)" }} /> Grade Breakdown — How it's calculated</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
            {BREAKDOWN.map(b => (
              <div key={b.g} style={{ background:b.color+"22", border:`1px solid ${b.color}44`, borderRadius:10, padding:"12px 10px", textAlign:"center" }}>
                <div style={{ fontSize:32, fontWeight:800, color:b.color }}>{b.g}</div>
                <div style={{ fontSize:11, fontWeight:600, marginTop:4 }}>{b.title}</div>
                <div style={{ fontSize:10, color:"var(--muted)", marginTop:2, fontFamily:"monospace" }}>{b.range}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"var(--surface2)", borderRadius:9, padding:14, fontSize:12.5, lineHeight:1.6, color:"var(--muted)", marginTop:14 }}>
            💡 <strong style={{ color:"var(--text)" }}>Pro tip:</strong> The grade window is calculated against your stage deadline. Finish 2h before YOUR deadline = A, even if the overall task is delayed upstream.
          </div>
        </div>
      </div>

      <div className="ep-card">
        <div className="ep-card-title"><i className="bi bi-list-check" style={{ color:"var(--amber)" }} /> Task Summary</div>
        <div className="ep-grid4">
          {[
            { label:"Total Assigned", val:tasks.length,                                                                    color:"var(--text)" },
            { label:"Completed",      val:tasks.filter(t=>t.status==="completed").length,                                  color:"var(--green)" },
            { label:"In Progress",    val:tasks.filter(t=>t.status==="in_progress").length,                                color:"var(--blue)" },
            { label:"Overdue",        val:tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=="completed").length,            color:"var(--red)" },
          ].map(s => (
            <div key={s.label} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, padding:"14px 18px" }}>
              <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS VIEW ───────────────────────────────────────────────────────
function NotificationsView() {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employee/tasks", { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const overdue  = tasks.filter(t => isOverdue(t.dueDate) && t.status!=="completed");
  const inReview = tasks.filter(t => t.status==="review");
  const blocked  = tasks.filter(t => t.status==="blocked");

  const notifs = [
    ...overdue.map(t => ({ icon:"⚠️", bg:"rgba(239,68,68,.08)", border:"rgba(239,68,68,.25)", title:`Overdue: ${t.nomenclature||t.title}`, desc: (t.brandId?.name||"")+(t.brandId?" — ":"")+"Submit immediately to minimize grade impact", time:fmtD(t.dueDate) })),
    ...inReview.map(t => ({ icon:"🕐", bg:"rgba(245,166,35,.06)", border:"rgba(245,166,35,.2)", title:`Under Review: ${t.nomenclature||t.title}`, desc:"Awaiting admin approval — no action needed", time:fmtD(t.updatedAt) })),
    ...blocked.map(t => ({ icon:"❌", bg:"rgba(239,68,68,.06)", border:"rgba(239,68,68,.15)", title:`Rejected: ${t.nomenclature||t.title}`, desc: t.reviewNote?`Reason: ${t.reviewNote}`:"Please revise and resubmit", time:fmtD(t.updatedAt) })),
  ];

  return (
    <div className="ep-content">
      <div className="ep-card" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div className="ep-card-title" style={{ margin:0 }}><i className="bi bi-bell" style={{ color:"var(--amber)" }} /> Notifications</div>
          {notifs.length>0 && (
            <span style={{ background:"var(--red)", color:"#fff", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>
              {notifs.length}
            </span>
          )}
        </div>
        {loading ? (
          <div className="ep-empty"><div className="ep-spinner" /></div>
        ) : notifs.length === 0 ? (
          <div className="ep-empty">
            <i className="bi bi-bell-slash" style={{ fontSize:38, display:"block", marginBottom:10 }} />
            <p>All clear — no notifications</p>
          </div>
        ) : notifs.map((n,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ width:38, height:38, borderRadius:10, background:n.bg, border:`1px solid ${n.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
              {n.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{n.title}</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginTop:3 }}>{n.desc}</div>
            </div>
            <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"monospace", flexShrink:0 }}>{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PERFORMANCE VIEW ─────────────────────────────────────────────────────────
function PerformanceView({ emp }) {
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employee/tasks", { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const overdue   = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length;
  const inProg    = tasks.filter(t => t.status === "in_progress").length;
  const review    = tasks.filter(t => t.status === "review").length;
  const onTime    = completed > 0 ? Math.round((tasks.filter(t => t.status === "completed" && !isOverdue(t.dueDate)).length / completed) * 100) : 0;
  const grade     = onTime >= 90 ? "A" : onTime >= 75 ? "B" : onTime >= 60 ? "C" : "D";
  const gradeColor = onTime >= 90 ? "var(--green)" : onTime >= 75 ? "var(--amber)" : onTime >= 60 ? "#f59e0b" : "var(--red)";

  const BAR_DATA = [
    { label: "Completed",   val: completed, color: "var(--green)" },
    { label: "In Progress", val: inProg,    color: "var(--blue)" },
    { label: "Review",      val: review,    color: "#f59e0b" },
    { label: "Overdue",     val: overdue,   color: "var(--red)" },
  ];

  if (loading) return <div className="ep-content"><div className="ep-empty"><div className="ep-spinner" /></div></div>;

  return (
    <div className="ep-content">
      <div className="ep-grid2" style={{ marginBottom: 22 }}>
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-trophy" style={{ color: "var(--amber)" }} /> Overall Grade</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8 }}>
            <div className="ep-perf-grade" style={{ borderColor: gradeColor, color: gradeColor }}>{grade}</div>
            <div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>On-time completion rate</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: gradeColor }}>{onTime}%</div>
            </div>
          </div>
          <div className="ep-bar-track" style={{ marginTop: 16 }}>
            <div className="ep-bar-fill" style={{ width: `${onTime}%`, background: gradeColor }} />
          </div>
        </div>

        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-graph-up" style={{ color: "var(--amber)" }} /> Task Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {BAR_DATA.map(b => (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span>{b.label}</span>
                  <span style={{ fontWeight: 700, color: b.color }}>{b.val}</span>
                </div>
                <div className="ep-bar-track">
                  <div className="ep-bar-fill" style={{ width: total ? `${(b.val / total) * 100}%` : "0%", background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ep-card">
        <div className="ep-card-title"><i className="bi bi-list-check" style={{ color: "var(--amber)" }} /> Summary</div>
        <div className="ep-grid4">
          {[
            { label: "Total Assigned", val: total, color: "var(--text)" },
            { label: "Completed",      val: completed, color: "var(--green)" },
            { label: "Overdue",        val: overdue,   color: "var(--red)" },
            { label: "Pending",        val: total - completed, color: "var(--blue)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE VIEW ─────────────────────────────────────────────────────────────
function ProfileView({ emp, empRole }) {
  if (!emp) return <div className="ep-content"><div className="ep-empty"><div className="ep-spinner" /></div></div>;

  const fields = [
    { label: "Employee ID",  val: emp.employeeId },
    { label: "Email",        val: emp.email || emp.personal?.email },
    { label: "Mobile",       val: emp.personal?.mobile },
    { label: "Department",   val: emp.professional?.department },
    { label: "Designation",  val: emp.professional?.designation },
    { label: "Date Joined",  val: fmtD(emp.professional?.dateOfJoining, true) },
    { label: "City",         val: emp.personal?.city },
    { label: "State",        val: emp.personal?.state },
  ];

  return (
    <div className="ep-content">
      <div className="ep-grid2">
        <div className="ep-card">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
            <div className="ep-profile-ava">{ini(emp)}</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{emp.firstName} {emp.lastName}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{ROLE_LABEL[empRole]}</div>
              <div style={{ marginTop: 6 }}>
                <span className="ep-badge" style={{ background: "var(--amber-dim)", color: "var(--amber)" }}>
                  {emp.professional?.designation || "Employee"}
                </span>
              </div>
            </div>
          </div>

          {fields.map(f => (
            <div key={f.label} className="ep-row-sep">
              <div style={{ width: 130, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{f.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{f.val || "—"}</div>
            </div>
          ))}
        </div>

        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-person-check" style={{ color: "var(--amber)" }} /> Profile Completion</div>
          {(() => {
            const checks = [
              emp.personal?.mobile, emp.personal?.email, emp.personal?.dob,
              emp.personal?.address, emp.personal?.city, emp.personal?.state,
              emp.professional?.department, emp.professional?.designation,
              emp.professional?.dateOfJoining, emp.salary?.bankName,
              emp.salary?.accountNumber, emp.salary?.panNumber,
            ];
            const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
            const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
            return (
              <>
                <div style={{ fontSize: 36, fontWeight: 900, color }}>{pct}%</div>
                <div className="ep-bar-track" style={{ marginTop: 8, marginBottom: 16 }}>
                  <div className="ep-bar-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {pct < 100 ? "Complete your profile to help HR manage your records." : "Your profile is fully complete!"}
                </div>
              </>
            );
          })()}

          <div className="ep-divider" />
          <div className="ep-card-title"><i className="bi bi-shield-lock" style={{ color: "var(--amber)" }} /> Account</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
            Logged in as <strong style={{ color: "var(--text)" }}>{emp.email || emp.personal?.email || emp.firstName}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, emp, empRole }) {
  const router = useRouter();

  const allNav = [
    { key: "today",       label: "Today",           icon: "bi-house",          roles: ["writer","designer","editor","developer","general"] },
    { key: "tasks",       label: "My Tasks",         icon: "bi-check2-square",  roles: ["writer","designer","editor","developer","general"] },
    { key: "week",        label: "This Week",        icon: "bi-calendar-week",  roles: ["designer","editor","developer","general"] },
    { key: "editor",      label: "Content Editor",   icon: "bi-pencil-square",  roles: ["writer"] },
    { key: "calendar",    label: "Brand Calendar",   icon: "bi-calendar3",      roles: ["writer","designer","editor"] },
    { key: "queue",       label: "Design Queue",     icon: "bi-grid-1x2",       roles: ["designer","editor"] },
    { key: "board",       label: "Sprint Board",     icon: "bi-kanban",         roles: ["developer"] },
    { key: "history",     label: "History",          icon: "bi-clock-history",  roles: ["writer","designer","editor","developer","general"] },
    { key: "grades",      label: "Grades",           icon: "bi-award",          roles: ["writer","designer","editor","developer","general"] },
    { key: "notifs",      label: "Notifications",    icon: "bi-bell",           roles: ["writer","designer","editor","developer","general"] },
    { key: "performance", label: "My Stats",         icon: "bi-graph-up-arrow", roles: ["writer","designer","editor","developer","general"] },
    { key: "profile",     label: "Profile",          icon: "bi-person-circle",  roles: ["writer","designer","editor","developer","general"] },
  ];

  const nav = allNav.filter(n => n.roles.includes(empRole));

  const VIEW_TITLES = {
    today: "Today", tasks: "My Tasks", editor: "Content Editor",
    calendar: "Brand Calendar", queue: "Design Queue",
    board: "Sprint Board", performance: "My Stats", profile: "Profile",
    week: "This Week", history: "History", grades: "Grades", notifs: "Notifications",
  };

  function logout() {
    localStorage.removeItem("employeeToken");
    router.push("/employee/login");
  }

  return (
    <>
      <div className="ep-side">
        <div className="ep-side-logo">
          <span>Viralon</span>
          <small>{ROLE_LABEL[empRole]}</small>
        </div>
        <nav className="ep-side-nav">
          {nav.map(n => (
            <button key={n.key} className={`ep-nav ${view === n.key ? "active" : ""}`} onClick={() => setView(n.key)}>
              <i className={`bi ${n.icon}`} />{n.label}
            </button>
          ))}
        </nav>
        <div className="ep-side-footer">
          <div className="ep-ava">{ini(emp)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ep-side-name">{emp ? `${emp.firstName} ${emp.lastName}` : "Loading…"}</div>
            <div className="ep-side-role">{ROLE_LABEL[empRole]}</div>
          </div>
          <button onClick={logout} title="Logout" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16, padding: 4 }}>
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MAIN PORTAL ──────────────────────────────────────────────────────────────
export default function EmployeePortal() {
  const router  = useRouter();
  const [emp,     setEmp]     = useState(null);
  const [empRole, setEmpRole] = useState("general");
  const [view,    setView]    = useState("today");
  const [authErr, setAuthErr] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    if (!token) { router.push("/employee/login"); return; }
    fetch("/api/employee/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setEmp(d.employee);
          setEmpRole(detectRole(d.employee));
        } else {
          setAuthErr(true);
          router.push("/employee/login");
        }
      })
      .catch(() => setAuthErr(true));
  }, []);

  const VIEW_TITLES = {
    today: "Today", tasks: "My Tasks", editor: "Content Editor",
    calendar: "Brand Calendar", queue: "Design Queue",
    board: "Sprint Board", performance: "My Stats", profile: "Profile",
    week: "This Week", history: "History", grades: "Grades", notifs: "Notifications",
  };

  if (authErr) return null;

  return (
    <>
      <Head>
        <title>Portal — Viralon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </Head>
      <style>{CSS}</style>

      <div className="ep-layout">
        <Sidebar view={view} setView={setView} emp={emp} empRole={empRole} />

        <div className="ep-main">
          <div className="ep-topbar">
            <div className="ep-topbar-title">{VIEW_TITLES[view]}</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {empRole !== "writer" && (
                <button className="ep-btn ep-btn-primary ep-btn-sm" onClick={() => setView("week")}
                  style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <i className="bi bi-check2-circle" /> Submit Stage
                </button>
              )}
              <button className="ep-btn ep-btn-ghost ep-btn-sm" onClick={() => setView("notifs")}
                style={{ position:"relative" }}>
                <i className="bi bi-bell" />
              </button>
              {emp && (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Avatar emp={emp} size={32} />
                  <span style={{ fontSize:13, fontWeight:600 }}>{emp.firstName}</span>
                </div>
              )}
            </div>
          </div>

          {view === "today"       && <TodayView       emp={emp} empRole={empRole} />}
          {view === "tasks"       && <MyTasksView />}
          {view === "week"        && <ThisWeekView />}
          {view === "editor"      && <ContentEditorView />}
          {view === "calendar"    && <BrandCalendarView />}
          {view === "queue"       && <DesignQueueView empRole={empRole} />}
          {view === "board"       && <SprintBoardView />}
          {view === "history"     && <HistoryView />}
          {view === "grades"      && <GradesView />}
          {view === "notifs"      && <NotificationsView />}
          {view === "performance" && <PerformanceView emp={emp} />}
          {view === "profile"     && <ProfileView emp={emp} empRole={empRole} />}
        </div>
      </div>

      <ToastContainer position="bottom-right" theme="dark" autoClose={2500} />
    </>
  );
}
