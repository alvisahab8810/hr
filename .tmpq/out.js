import { Fragment, useEffect, useMemo, useRef, useState, useCallback } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import MailAttach from "@/components/MailAttach";
import * as XLSX from "xlsx";
import { parseSheet, templateRows, buildHeaderMap } from "@/utils/leadsImport";
import { useList } from "@/utils/crmSettings";
import { confirmDialog } from "../../../components/ConfirmDialog";
import {
  statusMeta,
  statusOptions,
  isWon,
  isClosed,
  stageOf,
  statusOf,
  RAIL,
  RUNNING_ADS,
  SERVICES,
  INDUSTRIES,
  SOURCES,
  CONNECT_VIA,
  CONNECT_OUTCOME,
  LADDER,
  rungGone,
  PREP,
  PREP_GROUPS,
  SCOREQ,
  BUDGETS,
  WON_RULE,
  BASE_COLS,
  MEETING_MODES,
  MEETING_OUTCOMES,
  modeMeta,
  leadCode,
  inr,
  inrShort,
  budgetValue,
  matDone,
  srcOf,
  scoreCol,
  prepPct,
  initials,
  tintFor,
  prettyTime,
  prettyDate,
  prettyDateLong,
  fmtDT,
  fmtD,
  daysAgo,
  todayStr,
  thisMonthStr,
  meetingIsPast
} from "@/utils/leadsMeta";
const COLS_KEY = "viralon.leads.hiddenCols.v2";
const BRANDS_URL = "/dashboard/admin/tasks/brands";
const DENSITY_KEY = "viralon.leads.density";
function Metric({ icon, label, value, sub, accent }) {
  return /* @__PURE__ */ React.createElement("div", { style: {
    background: `linear-gradient(160deg,#fff 55%, ${accent.bg} 175%)`,
    border: `1px solid ${accent.bg}`,
    borderRadius: 14,
    padding: "13px 14px",
    boxShadow: "0 2px 8px rgba(15,23,42,.05)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    gap: 11,
    minWidth: 0
  } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon } }), /* @__PURE__ */ React.createElement("div", { style: {
    width: 36,
    height: 36,
    borderRadius: 11,
    background: accent.icon,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 5px 13px ${accent.icon}33`
  } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${icon}`, style: { fontSize: 15, color: "#fff" } })), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 19, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.5px", lineHeight: 1.1 } }, value), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#475569", fontWeight: 700, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, label), sub ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: accent.icon, fontWeight: 700, marginTop: 1 } }, sub) : null));
}
function Field({ label, hint, children, span }) {
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0, gridColumn: span ? `span ${span}` : void 0 } }, /* @__PURE__ */ React.createElement("label", { style: s.fieldLabel }, label), children, hint ? /* @__PURE__ */ React.createElement("div", { style: s.fieldHint }, hint) : null);
}
function Modal({ title, icon, wide, onClose, children, footer }) {
  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onClose();
      },
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.45)",
        zIndex: 2e3,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 16px",
        overflowY: "auto"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: {
      background: "#fff",
      borderRadius: 16,
      width: "100%",
      maxWidth: wide ? 820 : 560,
      boxShadow: "0 24px 60px rgba(15,23,42,.28)",
      overflow: "hidden"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      padding: "15px 20px",
      borderBottom: "1px solid #F1F1FA",
      display: "flex",
      alignItems: "center",
      gap: 10
    } }, /* @__PURE__ */ React.createElement("div", { style: s.panelIcon }, /* @__PURE__ */ React.createElement("i", { className: `bi ${icon}`, style: { fontSize: 14, color: "#6366F1" } })), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 14, color: "#0F172A", flex: 1 } }, title), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: s.iconBtn, title: "Close" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-x-lg", style: { fontSize: 13 } }))), /* @__PURE__ */ React.createElement("div", { style: { padding: 20, maxHeight: "calc(100vh - 220px)", overflowY: "auto" } }, children), footer ? /* @__PURE__ */ React.createElement("div", { style: {
      padding: "13px 20px",
      borderTop: "1px solid #F1F1FA",
      background: "#FBFBFE",
      display: "flex",
      justifyContent: "flex-end",
      gap: 8
    } }, footer) : null)
  );
}
function LeadForm({ initial, owners, fields, busy, isSales, onSave, onCancel }) {
  const industryList = useList("industries", INDUSTRIES);
  const serviceList = useList("services", SERVICES);
  const runAdsList = useList("runningAds", RUNNING_ADS);
  const budgetList = useList("budgets", BUDGETS);
  const sourceList = useList("sources", SOURCES);
  const [f, setF] = useState(() => ({
    name: initial?.name || "",
    businessName: initial?.businessName || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    city: initial?.city || "",
    industry: initial?.industry || "",
    service: initial?.service || "",
    runningAds: initial?.runningAds || "",
    budget: initial?.budget || "",
    lostReason: initial?.lostReason || "",
    salespersonId: initial?.salespersonId ? String(initial.salespersonId) : "",
    status: initial?.status || "New",
    website: initial?.website || "",
    instagram: initial?.instagram || "",
    notes: initial?.notes || "",
    meetingMode: initial?.meetingMode || "",
    meetingDate: initial?.meetingDate || "",
    meetingTime: initial?.meetingTime || "",
    meetLink: initial?.meetLink || "",
    meetingPlace: initial?.meetingPlace || "",
    source: {
      utmSource: initial?.source?.utmSource || "",
      utmCampaign: initial?.source?.utmCampaign || "",
      campaignId: initial?.source?.campaignId || "",
      adset: initial?.source?.adset || "",
      adName: initial?.source?.adName || "",
      utmContent: initial?.source?.utmContent || ""
    },
    customFields: { ...initial?.customFields || {} }
  }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setSrc = (k, v) => setF((p) => ({ ...p, source: { ...p.source, [k]: v } }));
  const setCf = (k, v) => setF((p) => ({ ...p, customFields: { ...p.customFields, [k]: v } }));
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: s.formSection }, "Contact"), /* @__PURE__ */ React.createElement("div", { style: s.grid2 }, /* @__PURE__ */ React.createElement(Field, { label: "Name *" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.name, onChange: (e) => set("name", e.target.value), placeholder: "Full name" })), /* @__PURE__ */ React.createElement(Field, { label: "Business Name" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.businessName, onChange: (e) => set("businessName", e.target.value), placeholder: "Business name" })), /* @__PURE__ */ React.createElement(Field, { label: "Phone", hint: "10 digits, no +91" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: f.phone,
      inputMode: "numeric",
      onChange: (e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10)),
      placeholder: "9876543210"
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Email" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.email, onChange: (e) => set("email", e.target.value), placeholder: "name@company.com" })), /* @__PURE__ */ React.createElement(Field, { label: "City" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.city, onChange: (e) => set("city", e.target.value), placeholder: "Mumbai" })), /* @__PURE__ */ React.createElement(Field, { label: "Industry" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.industry, onChange: (e) => set("industry", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), industryList.map((i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i }, i))))), /* @__PURE__ */ React.createElement("div", { style: s.formSection }, "What they need"), /* @__PURE__ */ React.createElement("div", { style: s.grid2 }, /* @__PURE__ */ React.createElement(Field, { label: "Service" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.service, onChange: (e) => set("service", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), serviceList.map((i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i }, i)))), /* @__PURE__ */ React.createElement(Field, { label: "Running ads" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.runningAds, onChange: (e) => set("runningAds", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), runAdsList.map((o) => /* @__PURE__ */ React.createElement("option", { key: o, value: o }, o)))), /* @__PURE__ */ React.createElement(Field, { label: "Budget" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.budget, onChange: (e) => set("budget", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), budgetList.map((o) => /* @__PURE__ */ React.createElement("option", { key: o, value: o }, o)))), !isSales && /* @__PURE__ */ React.createElement(Field, { label: "Owner" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.salespersonId, onChange: (e) => set("salespersonId", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Unassigned"), owners.map((o) => /* @__PURE__ */ React.createElement("option", { key: o._id, value: o._id }, o.name)))), /* @__PURE__ */ React.createElement(Field, { label: "Status" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.status, onChange: (e) => set("status", e.target.value) }, statusOptions().map((k) => /* @__PURE__ */ React.createElement("option", { key: k, value: k }, k)))), /* @__PURE__ */ React.createElement("div", { style: { ...s.fieldHint, gridColumn: "1 / -1", lineHeight: 1.6 } }, WON_RULE), (f.status === "Lost" || f.status === "Not qualified") && /* @__PURE__ */ React.createElement(Field, { label: "Why?", hint: "What killed it \u2014 price, timing, a competitor" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: f.lostReason,
      onChange: (e) => set("lostReason", e.target.value),
      placeholder: "Went with a cheaper agency"
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: s.formSection }, "Meeting"), /* @__PURE__ */ React.createElement("div", { style: s.grid2 }, /* @__PURE__ */ React.createElement(Field, { label: "How", hint: "Leave blank until you've spoken to them." }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.meetingMode, onChange: (e) => set("meetingMode", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Not fixed yet"), MEETING_MODES.map((m) => /* @__PURE__ */ React.createElement("option", { key: m.k, value: m.k }, m.k)))), /* @__PURE__ */ React.createElement(Field, { label: "Date" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "date", value: f.meetingDate, onChange: (e) => set("meetingDate", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Time", hint: "IST" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, type: "time", value: f.meetingTime, onChange: (e) => set("meetingTime", e.target.value) })), f.meetingMode === "Google Meet" && /* @__PURE__ */ React.createElement(Field, { label: "Meeting link" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.meetLink, onChange: (e) => set("meetLink", e.target.value), placeholder: "https://meet.google.com/\u2026" })), f.meetingMode === "In person" && /* @__PURE__ */ React.createElement(Field, { label: "Where" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.meetingPlace, onChange: (e) => set("meetingPlace", e.target.value), placeholder: "Viralon office, Andheri East" }))), /* @__PURE__ */ React.createElement("div", { style: s.formSection }, "Where they came from"), /* @__PURE__ */ React.createElement("div", { style: s.grid2 }, /* @__PURE__ */ React.createElement(Field, { label: "Source" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: f.source.utmSource,
      list: "lp-sources",
      onChange: (e) => setSrc("utmSource", e.target.value),
      placeholder: "google / facebook / referral"
    }
  ), /* @__PURE__ */ React.createElement("datalist", { id: "lp-sources" }, sourceList.map((x) => /* @__PURE__ */ React.createElement("option", { key: x, value: x })))), /* @__PURE__ */ React.createElement(Field, { label: "Campaign name" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.source.utmCampaign, onChange: (e) => setSrc("utmCampaign", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Campaign ID" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.source.campaignId, onChange: (e) => setSrc("campaignId", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Ad set" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.source.adset, onChange: (e) => setSrc("adset", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Ad name" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.source.adName, onChange: (e) => setSrc("adName", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Content variant" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.source.utmContent, onChange: (e) => setSrc("utmContent", e.target.value) })), /* @__PURE__ */ React.createElement(Field, { label: "Website" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.website, onChange: (e) => set("website", e.target.value), placeholder: "https://" })), /* @__PURE__ */ React.createElement(Field, { label: "Instagram" }, /* @__PURE__ */ React.createElement("input", { className: "lp-in", style: s.input, value: f.instagram, onChange: (e) => set("instagram", e.target.value), placeholder: "@handle" }))), fields.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: s.formSection }, "Your columns"), /* @__PURE__ */ React.createElement("div", { style: s.grid2 }, fields.map((cf) => /* @__PURE__ */ React.createElement(Field, { key: cf.key, label: cf.label }, cf.type === "select" ? /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: f.customFields[cf.key] || "", onChange: (e) => setCf(cf.key, e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), cf.options.map((o) => /* @__PURE__ */ React.createElement("option", { key: o, value: o }, o))) : /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      type: cf.type === "number" ? "number" : cf.type === "date" ? "date" : "text",
      value: f.customFields[cf.key] || "",
      onChange: (e) => setCf(cf.key, e.target.value)
    }
  ))))), /* @__PURE__ */ React.createElement("div", { style: s.formSection }, "Notes"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      className: "lp-in",
      style: { ...s.input, height: 92, padding: "10px 12px", resize: "vertical" },
      value: f.notes,
      onChange: (e) => set("notes", e.target.value),
      placeholder: "Anything the next person picking up this lead should know."
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 } }, /* @__PURE__ */ React.createElement("button", { onClick: onCancel, style: s.ghostBtn }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: () => onSave(f), disabled: busy, style: { ...s.primaryBtn, opacity: busy ? 0.6 : 1 } }, busy ? "Saving\u2026" : initial?._id ? "Save changes" : "Add lead")));
}
function MeetingPanel({ lead, busy, onSave, onClear }) {
  const [mode, setMode] = useState(lead.meetingMode || "");
  const [date, setDate] = useState(lead.meetingDate || "");
  const [time, setTime] = useState(lead.meetingTime || "");
  const [link, setLink] = useState(lead.meetLink || "");
  const [place, setPlace] = useState(lead.meetingPlace || "");
  const meta = modeMeta(mode);
  const ready = mode && date && time;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, marginBottom: 15, fontSize: 12.5, color: "#475569", fontWeight: 600, lineHeight: 1.6 } }, lead.meetingDate ? "Change how or when you're meeting. Saving mails the lead the new details straight away, and the reminders start again from the new date." : "Ring them first, agree what suits them, then put it down here. Saving mails them the confirmation, and the reminders follow on their own."), /* @__PURE__ */ React.createElement("label", { style: s.fieldLabel }, "How will you meet?"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, margin: "7px 0 16px" } }, MEETING_MODES.map((m) => {
    const on = mode === m.k;
    return /* @__PURE__ */ React.createElement("button", { key: m.k, onClick: () => setMode(m.k), style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "12px 13px",
      borderRadius: 11,
      cursor: "pointer",
      textAlign: "left",
      border: `1px solid ${on ? m.fg : "#EEF0F7"}`,
      background: on ? m.bg : "#fff"
    } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${m.icon}`, style: { fontSize: 15, color: on ? m.fg : "#94A3B8" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12.5, fontWeight: 800, color: on ? m.fg : "#475569" } }, m.k));
  })), /* @__PURE__ */ React.createElement("div", { style: s.grid2 }, /* @__PURE__ */ React.createElement(Field, { label: "Date" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      type: "date",
      value: date,
      min: todayStr(),
      onChange: (e) => setDate(e.target.value)
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Time", hint: "IST" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      type: "time",
      value: time,
      onChange: (e) => setTime(e.target.value)
    }
  ))), meta?.needs === "link" && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement(Field, { label: "Meeting link", hint: "Paste the Google Meet or Zoom link \u2014 it goes into the reminder mails." }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: link,
      onChange: (e) => setLink(e.target.value),
      placeholder: "https://meet.google.com/\u2026"
    }
  ))), meta?.needs === "place" && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement(Field, { label: "Where", hint: "Office, their place, a caf\xE9 \u2014 whatever you agreed." }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: place,
      onChange: (e) => setPlace(e.target.value),
      placeholder: "Viralon office, Andheri East"
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 } }, lead.meetingDate ? /* @__PURE__ */ React.createElement("button", { onClick: onClear, disabled: busy, style: s.dangerGhostBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-x-circle", style: { fontSize: 12 } }), " Clear meeting") : null, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onSave({
        meetingMode: mode,
        meetingDate: date,
        meetingTime: time,
        meetLink: meta?.needs === "link" ? link : "",
        meetingPlace: meta?.needs === "place" ? place : ""
      }),
      disabled: !ready || busy,
      style: { ...s.primaryBtn, opacity: !ready || busy ? 0.5 : 1 }
    },
    busy ? "Saving\u2026" : lead.meetingDate ? "Update meeting" : "Set the meeting"
  )));
}
function ScorePanel({ lead, busy, onSave }) {
  const [ans, setAns] = useState(() => ({ ...lead.scoreAnswers || {} }));
  const total = SCOREQ.reduce((sum, q) => sum + (ans[q.k] ? q.w : 0), 0);
  const col = scoreCol(total);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 13, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: {
    width: 62,
    height: 62,
    borderRadius: 16,
    background: col.bg,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 21, fontWeight: 900, color: col.fg, lineHeight: 1 } }, total), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: col.fg, opacity: 0.75 } }, "out of 10")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: "#475569", fontWeight: 600, lineHeight: 1.6 } }, "Tick what is actually true \u2014 not what you hope is true. 8 and above means push hard, below 4 means don't spend the team's week on it.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 7 } }, SCOREQ.map((q) => {
    const on = !!ans[q.k];
    return /* @__PURE__ */ React.createElement("button", { key: q.k, onClick: () => setAns((p) => ({ ...p, [q.k]: !p[q.k] })), style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      textAlign: "left",
      width: "100%",
      padding: "11px 13px",
      borderRadius: 11,
      cursor: "pointer",
      border: `1px solid ${on ? "#C7D2FE" : "#EEF0F7"}`,
      background: on ? "#F5F7FF" : "#fff"
    } }, /* @__PURE__ */ React.createElement("span", { style: {
      width: 19,
      height: 19,
      borderRadius: 6,
      flexShrink: 0,
      border: `1px solid ${on ? "#6366F1" : "#CBD5E1"}`,
      background: on ? "#6366F1" : "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    } }, on ? /* @__PURE__ */ React.createElement("i", { className: "bi bi-check", style: { color: "#fff", fontSize: 13 } }) : null), /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: 13, fontWeight: 700, color: "#1E293B" } }, q.n), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 800, color: on ? "#4F46E5" : "#94A3B8" } }, "+", q.w));
  })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => onSave(null, {}), disabled: busy, style: s.ghostBtn }, "Clear score"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onSave(Math.round(total * 10) / 10, ans),
      disabled: busy,
      style: { ...s.primaryBtn, opacity: busy ? 0.6 : 1 }
    },
    busy ? "Saving\u2026" : `Save ${total}/10`
  )));
}
function ConnectPanel({ busy, onSave }) {
  const [via, setVia] = useState("Call");
  const [outcome, setOutcome] = useState("No answer");
  const [note, setNote] = useState("");
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: s.grid2 }, /* @__PURE__ */ React.createElement(Field, { label: "How" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: via, onChange: (e) => setVia(e.target.value) }, CONNECT_VIA.map((v) => /* @__PURE__ */ React.createElement("option", { key: v, value: v }, v)))), /* @__PURE__ */ React.createElement(Field, { label: "What happened" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: outcome, onChange: (e) => setOutcome(e.target.value) }, CONNECT_OUTCOME.map((v) => /* @__PURE__ */ React.createElement("option", { key: v, value: v }, v))))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement(Field, { label: "Note" }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      className: "lp-in",
      style: { ...s.input, height: 84, padding: "10px 12px", resize: "vertical" },
      value: note,
      onChange: (e) => setNote(e.target.value),
      placeholder: "Said to call back after Diwali, budget is real\u2026"
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 18 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onSave({ via, outcome, note }),
      disabled: busy,
      style: { ...s.primaryBtn, opacity: busy ? 0.6 : 1 }
    },
    busy ? "Saving\u2026" : "Log this attempt"
  )));
}
const MAIL_TEMPLATES = [
  { k: "invite", n: "\u201CWe'll call you shortly\u201D", need: "nobook", g: "Before the call" },
  { k: "invite2", n: "Follow-up \u2014 can't reach you", need: "nobook", g: "Before the call" },
  { k: "confirm", n: "Meeting confirmation", need: "booked", g: "The meeting" },
  { k: "d2", n: "Reminder \u2014 2 days before", need: "booked", g: "The meeting" },
  { k: "d1", n: "Reminder \u2014 1 day before", need: "booked", g: "The meeting" },
  { k: "h3", n: "Reminder \u2014 3 hours before", need: "booked", g: "The meeting" },
  { k: "m45", n: "Reminder \u2014 45 mins before", need: "booked", g: "The meeting" },
  { k: "noshow", n: "They didn't turn up", need: "booked", g: "The meeting" },
  { k: "recap", n: "Post-consultation recap", need: "any", g: "After the meeting" },
  { k: "material", n: "Material pack", need: "any", g: "After the meeting" },
  { k: "proposal", n: "Proposal sent", need: "any", g: "Proposal" },
  { k: "follow1", n: "Gentle follow-up", need: "any", g: "Follow up" },
  { k: "follow2", n: "Value reinforcement", need: "any", g: "Follow up" },
  { k: "follow3", n: "Decision-maker loop-in", need: "any", g: "Follow up" },
  { k: "objBudget", n: "Objection \u2014 budget", need: "any", g: "Negotiation" },
  { k: "objTiming", n: "Objection \u2014 timing", need: "any", g: "Negotiation" },
  { k: "discount", n: "Discount offer", need: "any", g: "Negotiation" },
  { k: "fomo", n: "Capacity close", need: "any", g: "Negotiation" },
  { k: "custom", n: "Write it myself", need: "any", g: "Your own words" }
];
const MAIL_BLURB = {
  invite: "Tells them we've got the enquiry and someone will ring them \u2014 sets the expectation while nothing is fixed.",
  invite2: "For a lead we keep missing: asks them to reply with a time that suits.",
  noshow: "Says we missed them and offers another time \u2014 no blame in it.",
  recap: "What you covered, the gaps you found and what you'd build first. Fill the square brackets before you send.",
  material: "The post-meeting pack: what we'd run for them, matching case studies and how we price.",
  proposal: "Sends the proposal over with a line on what's inside and how to come back to you.",
  follow1: "A light nudge on a proposal that's gone quiet. Asks only whether it's still live.",
  follow2: "Puts the single biggest gap back in front of them while they decide.",
  follow3: "Offers to run a short session for whoever else has to sign this off.",
  objBudget: "Answers the money objection by narrowing the scope instead of thinning the work.",
  objTiming: "Answers \u201Cnot right now\u201D \u2014 the groundwork takes weeks either way.",
  discount: "The concession, in one clear line, with a date on it.",
  fomo: "We only take so many accounts a month, and a slot is being held for them."
};
function mailDraft(k, lead) {
  const first = String(lead?.name || "there").trim().split(/\s+/)[0] || "there";
  const co = lead?.businessName || "";
  const biz = co ? ` for ${co}` : "";
  const when = lead?.meetingDate ? `${prettyDateLong(lead.meetingDate)}${lead.meetingTime ? ` at ${prettyTime(lead.meetingTime)} IST` : ""}` : "the agreed time";
  const mode = lead?.meetingMode || "meeting";
  const head = `${mode} on ${when}`;
  const join = lead?.meetLink ? `

Join here: ${lead.meetLink}` : "";
  const hi = `Hi ${first},`;
  const D = (subject, body) => ({ subject, body: `${hi}

${body}` });
  switch (k) {
    case "invite":
      return D(
        "Thanks for reaching out \u2014 we'll call you shortly",
        `Thanks for getting in touch with Viralon${biz}. Your enquiry is with our team and someone will call you on ${lead?.phone || "the number you gave us"} in the next working day.

On that call we'll understand what you're running today, then fix a proper strategy session \u2014 over Google Meet, on the phone, or in person, whichever suits you.

If there's a better time to reach you, just reply to this mail and we'll work around it.`
      );
    case "invite2":
      return D(
        "Still keen? We'd like to get you on a call",
        `We've tried reaching you about your enquiry${biz} and haven't managed to catch you yet.

Reply with a day and time that works \u2014 morning, evening, weekend, whatever is easiest \u2014 and we'll call then. No cost, no obligation.`
      );
    case "confirm":
      return D(
        "Your session with Viralon is confirmed",
        `All set \u2014 we're meeting over ${head}.${join}

Nothing to prepare. Come with your questions and we'll do the rest.`
      );
    case "d2":
      return D(
        `Your Viralon session is in 2 days \u2014 ${prettyDateLong(lead?.meetingDate)}`,
        `A quick note that our session is set for ${head}.${join}

If that no longer works, reply here and we'll move it \u2014 no problem at all.`
      );
    case "d1":
      return D("Your Viralon session is tomorrow", `See you tomorrow \u2014 ${head}.${join}`);
    case "h3":
      return D("Your Viralon session is in 3 hours", `We're on in about 3 hours \u2014 ${head}.${join}`);
    case "m45":
      return D("Starting soon \u2014 your Viralon session", `We're set for ${head}, about 45 minutes from now.${join}`);
    case "material":
      return D(
        "As promised \u2014 your Viralon pack",
        `Great speaking with you. Here is the pack we talked about \u2014 what we would run${biz}, the case studies closest to your industry, and how we price.

Have a read and tell us what you think. Any question is fair game.

Our work: https://viralon.in`
      );
    case "noshow":
      return D(
        "Sorry we missed you \u2014 shall we try again?",
        `We were ready at ${when} but couldn't reach you. Things come up \u2014 happens to all of us.

Reply with a time that suits you better and we'll set it up again.`
      );
    case "recap":
      return D(
        `Recap and everything we promised${co ? `, ${co}` : ""}`,
        `Thank you for the time today. A quick recap of what we covered.

Where you are: [two lines on their current position]
The three gaps costing you the most: [gap 1, gap 2, gap 3]
What we would build first: [the first 90 days in one line]

Everything about us in one place:
Website: https://viralon.in

Anything I've mis-stated, tell me and I'll correct it before the proposal goes out.`
      );
    case "proposal":
      return D(
        `Your proposal${co ? ` for ${co}` : ""}`,
        `Here is the proposal we discussed${biz}. It covers the scope, what we do month by month, the numbers we're aiming at and the investment.

Read it at your own pace. When you're ready, reply with your questions or we can walk through it together on a short call.`
      );
    case "follow1":
      return D(
        "Just checking in",
        `Checking in on the proposal we sent${biz}. No pressure at all \u2014 I only want to know whether it's still on your desk or whether the timing has moved.

A one-line reply is plenty.`
      );
    case "follow2":
      return D(
        "One thing worth a second look",
        `While you're deciding, one thing worth a second look: [the single biggest gap you found] is the piece costing you the most right now, and it's the first thing we'd fix.

Happy to show you exactly how we'd do it for a business like yours.`
      );
    case "follow3":
      return D(
        "Should anyone else be on this?",
        `If someone else needs to sign off on this, I'm glad to run a short session for them so you're not left explaining our work second-hand.

Send me their name and I'll set it up around their calendar.`
      );
    case "objBudget":
      return D(
        "On the investment",
        `Understood on the budget. Rather than cut the work thin across everything, we can start with the one channel that pays back fastest and widen it once the numbers are on the board.

Tell me the figure you're comfortable with and I'll show you honestly what it does and doesn't buy.`
      );
    case "objTiming":
      return D(
        "On the timing",
        `Fair enough on the timing. The only thing I'd flag is that the groundwork \u2014 tracking, creative, landing pages \u2014 takes a few weeks before anything can run, so starting that now costs you nothing extra and saves the wait later.

If you'd rather revisit in a month, say the word and I'll come back then.`
      );
    case "discount":
      return D(
        "What I can do on the numbers",
        `I've spoken to the team. Here's what I can do${biz}: [the offer, in one clear line], valid till [date].

That's the honest edge of what works for both of us \u2014 beyond it we'd be cutting the work rather than the price.`
      );
    case "fomo":
      return D(
        "Holding a slot for you",
        `We take on a limited number of accounts each month so the work stays proper, and we're close to full for this cycle.

I've kept a slot aside${biz}. If you'd like it, tell me by [date] and we'll start; if not, no hard feelings and we'll pick it up next quarter.`
      );
    default:
      return { subject: "", body: `${hi}

` };
  }
}
function MailModal({ lead, preset, busy, onSend, onClose }) {
  const booked = !!lead.meetingDate;
  const usable = MAIL_TEMPLATES.filter(
    (t) => t.need === "any" || (t.need === "booked" ? booked : !booked)
  );
  const first = preset && usable.some((t) => t.k === preset) ? preset : usable[0]?.k || "custom";
  const [tpl, setTpl] = useState(first);
  const [cc, setCc] = useState("");
  const [draft, setDraft] = useState(() => mailDraft(first, lead));
  const [files, setFiles] = useState([]);
  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  const pick = (k) => {
    setTpl(k);
    setDraft(mailDraft(k, lead));
  };
  const sentKeys = new Set((lead.remindersSent || []).map((r) => r.key));
  const groups = [...new Set(usable.map((t) => t.g))];
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onClose();
      },
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.5)",
        zIndex: 2e3,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "34px 16px",
        overflowY: "auto"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: {
      background: "#fff",
      borderRadius: 18,
      width: "100%",
      maxWidth: 1e3,
      boxShadow: "0 24px 70px rgba(15,23,42,.32)",
      overflow: "hidden"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: "linear-gradient(120deg,#4338CA,#6366F1 70%)",
      padding: "16px 22px",
      display: "flex",
      alignItems: "center",
      gap: 12
    } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 17, fontWeight: 900, color: "#fff" } }, "Write a mail"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: "#DDD9FB" } }, lead.name, lead.businessName ? ` \xB7 ${lead.businessName}` : "")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onClose,
        title: "Close",
        style: {
          width: 32,
          height: 32,
          borderRadius: 9,
          border: "1px solid rgba(255,255,255,.35)",
          background: "rgba(255,255,255,.14)",
          color: "#fff",
          cursor: "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("i", { className: "bi bi-x-lg", style: { fontSize: 12 } })
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "stretch", minHeight: 420 } }, /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: {
      width: 258,
      flexShrink: 0,
      borderRight: "1px solid #F0F0F8",
      padding: "14px 12px",
      maxHeight: "62vh",
      overflowY: "auto"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "#94A3B8",
      padding: "0 8px 8px"
    } }, "Templates"), groups.map((g) => /* @__PURE__ */ React.createElement("div", { key: g, style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: ".07em",
      textTransform: "uppercase",
      color: "#6366F1",
      padding: "0 8px 5px"
    } }, g), usable.filter((t) => t.g === g).map((t) => {
      const on = t.k === tpl;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: t.k,
          onClick: () => pick(t.k),
          style: {
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "8px 10px",
            marginBottom: 2,
            borderRadius: 9,
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: on ? 800 : 600,
            color: on ? "#4338CA" : "#475569",
            background: on ? "#EEF2FF" : "transparent",
            border: `1px solid ${on ? "#C7D2FE" : "transparent"}`
          }
        },
        t.n,
        sentKeys.has(t.k) ? /* @__PURE__ */ React.createElement("span", { style: { display: "block", fontSize: 10, color: "#94A3B8", fontWeight: 700 } }, "sent before") : null
      );
    })))), /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: { flex: 1, minWidth: 0, padding: 18, maxHeight: "62vh", overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, padding: 0, overflow: "hidden", marginBottom: 14 } }, [
      ["To", lead.email || "\u2014 no email on this lead \u2014", null],
      ["Cc", cc, setCc],
      ["From", "sales@viralon.in \xB7 Team Viralon", null],
      ["Subject", draft.subject, (v) => setDraft((d) => ({ ...d, subject: v }))]
    ].map(([label, val, onChange], i, arr) => /* @__PURE__ */ React.createElement("div", { key: label, style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "9px 13px",
      borderBottom: i === arr.length - 1 ? "none" : "1px solid #F4F4FD"
    } }, /* @__PURE__ */ React.createElement("span", { style: {
      width: 62,
      flexShrink: 0,
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      color: "#94A3B8"
    } }, label), onChange ? /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "lp-in",
        value: val,
        onChange: (e) => onChange(e.target.value),
        placeholder: label === "Cc" ? "someone@viralon.in (optional)" : "",
        style: { flex: 1, border: "none", outline: "none", fontSize: 12.5, fontWeight: 700, color: "#0F172A", background: "transparent" }
      }
    ) : /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: 12.5, fontWeight: 700, color: "#334155", overflow: "hidden", textOverflow: "ellipsis" } }, val)))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginBottom: 8, lineHeight: 1.5 } }, MAIL_BLURB[tpl] || "Write it in your own words \u2014 it goes out on the Viralon letterhead either way."), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        className: "lp-in",
        value: draft.body,
        onChange: (e) => setDraft((d) => ({ ...d, body: e.target.value })),
        style: {
          width: "100%",
          minHeight: 250,
          borderRadius: 12,
          border: "1px solid #E7E7F2",
          padding: "13px 15px",
          fontSize: 13,
          lineHeight: 1.75,
          color: "#0F172A",
          resize: "vertical",
          outline: "none",
          fontFamily: "inherit"
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement(MailAttach, { files, setFiles })), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #F0F0F8",
      background: "#FBFBFE"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: "#6366F1",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontSize: 13,
      fontWeight: 900
    } }, "V"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, fontWeight: 900, color: "#0F172A" } }, "Team Viralon"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#94A3B8", fontWeight: 600 } }, "viralon.in"))))), /* @__PURE__ */ React.createElement("div", { style: {
      padding: "13px 20px",
      borderTop: "1px solid #F1F1FA",
      background: "#FBFBFE",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    } }, /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: 11.5, color: "#94A3B8", fontWeight: 600 } }, "The wording here is what gets sent \u2014 edit it before it goes."), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: s.miniBtn }, "Discard"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onSend({ template: tpl, subject: draft.subject, body: draft.body, cc, files }),
        disabled: busy || !lead.email || !draft.subject.trim() || !draft.body.trim(),
        style: { ...s.primaryBtn, opacity: busy || !lead.email || !draft.subject.trim() || !draft.body.trim() ? 0.5 : 1 }
      },
      /* @__PURE__ */ React.createElement("i", { className: "bi bi-send-fill", style: { fontSize: 12 } }),
      " ",
      busy ? "Sending\u2026" : "Send and log it"
    )))
  );
}
function FieldPanel({ fields, busy, onAdd, onDelete }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: s.grid2 }, /* @__PURE__ */ React.createElement(Field, { label: "Column name *", span: 2 }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: label,
      onChange: (e) => setLabel(e.target.value),
      placeholder: "GST number, Referred by, Contract end\u2026"
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Type" }, /* @__PURE__ */ React.createElement("select", { className: "lp-in", style: s.input, value: type, onChange: (e) => setType(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "text" }, "Text"), /* @__PURE__ */ React.createElement("option", { value: "number" }, "Number"), /* @__PURE__ */ React.createElement("option", { value: "date" }, "Date"), /* @__PURE__ */ React.createElement("option", { value: "select" }, "Dropdown"))), type === "select" && /* @__PURE__ */ React.createElement(Field, { label: "Options", hint: "Comma separated" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: s.input,
      value: options,
      onChange: (e) => setOptions(e.target.value),
      placeholder: "Small, Medium, Large"
    }
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onAdd({ label, type, options }),
      disabled: busy || !label.trim(),
      style: { ...s.primaryBtn, marginTop: 14, opacity: busy || !label.trim() ? 0.5 : 1 }
    },
    /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg", style: { fontSize: 12 } }),
    " Add column"
  ), fields.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: s.formSection }, "Columns you added"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 7 } }, fields.map((f) => /* @__PURE__ */ React.createElement("div", { key: f.key, style: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    border: "1px solid #EEF0F7",
    borderRadius: 10
  } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: "#0F172A" } }, f.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#94A3B8", fontWeight: 600 } }, f.type, f.options?.length ? ` \xB7 ${f.options.join(", ")}` : "")), /* @__PURE__ */ React.createElement("button", { onClick: () => onDelete(f), style: { ...s.iconBtn, color: "#DC2626" }, title: "Remove column" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-trash-fill", style: { fontSize: 12 } }))))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 10, lineHeight: 1.6 } }, "Removing a column only hides it \u2014 whatever was typed into it stays on the lead and comes back if you add the column again.")));
}
function ImportPanel({ fields, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [unknown, setUnknown] = useState([]);
  const [noName, setNoName] = useState(0);
  const [onDupe, setOnDupe] = useState("skip");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const pick = useRef(null);
  const template = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(templateRows(fields)), "Leads");
    XLSX.writeFile(wb, "viralon-leads-template.xlsx");
  };
  const read = async (f) => {
    if (!f) return;
    setResult(null);
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
      const parsed = parseSheet(aoa, fields);
      const known = new Set(buildHeaderMap(aoa[0] || [], fields).map((m) => m.i));
      const spare = (aoa[0] || []).map((h, i) => known.has(i) ? null : String(h || "").trim()).filter(Boolean);
      setFile(f);
      setRows(parsed);
      setUnknown(spare);
      setNoName(parsed.filter((r) => !String(r.name || "").trim()).length);
      if (!parsed.length) toast.error("That sheet has no rows under its header");
    } catch {
      toast.error("Could not read that file \u2014 save it as .xlsx or .csv and try again");
    }
  };
  const run = async () => {
    if (!rows.length) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows, onDupe })
      });
      const j = await r.json();
      if (!j.success) {
        toast.error(j.message || "Import failed");
        setBusy(false);
        return;
      }
      setResult(j);
      if (j.created) toast.success(`${j.created} lead${j.created === 1 ? "" : "s"} imported`);
      else toast("Nothing new to add from that file");
      onDone();
    } catch {
      toast.error("Import failed");
    }
    setBusy(false);
  };
  const preview = rows.slice(0, 5);
  return /* @__PURE__ */ React.createElement(
    Modal,
    {
      wide: true,
      title: "Import leads from a spreadsheet",
      icon: "bi-upload",
      onClose,
      footer: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: s.ghostBtn }, result ? "Done" : "Cancel"), !result && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: run,
          disabled: busy || !rows.length,
          style: { ...s.primaryBtn, opacity: busy || !rows.length ? 0.6 : 1 }
        },
        /* @__PURE__ */ React.createElement("i", { className: "bi bi-upload", style: { fontSize: 13 } }),
        busy ? "Importing\u2026" : `Import ${rows.length || ""} lead${rows.length === 1 ? "" : "s"}`
      ))
    },
    result ? (
      /* ── what came of it ── */
      /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } }, [
        { n: result.created, l: "imported", c: "#15803D", bg: "#DCFCE7" },
        { n: result.duplicates, l: "already in the list", c: "#B45309", bg: "#FEF3C7" },
        { n: result.errorCount || 0, l: "skipped", c: "#B91C1C", bg: "#FEE2E2" }
      ].map((x) => /* @__PURE__ */ React.createElement("div", { key: x.l, style: { flex: "1 1 150px", background: x.bg, borderRadius: 12, padding: "12px 14px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 800, color: x.c } }, x.n), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, color: x.c } }, x.l)))), (result.errors || []).length ? /* @__PURE__ */ React.createElement("div", { style: s.softBox }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, fontWeight: 800, color: "#B91C1C", marginBottom: 6 } }, "Rows that were skipped"), result.errors.map((e, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 12, color: "#475569", padding: "2px 0" } }, "Row ", e.line, ": ", e.message))) : null, (result.dupeRows || []).length ? /* @__PURE__ */ React.createElement("div", { style: s.softBox }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, fontWeight: 800, color: "#B45309", marginBottom: 6 } }, "Already on the board"), result.dupeRows.map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 12, color: "#475569", padding: "2px 0" } }, "Row ", d.line, ": ", d.name, " \u2014 ", d.where))) : null)
    ) : /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 14 } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        onDragOver: (e) => {
          e.preventDefault();
          setDrag(true);
        },
        onDragLeave: () => setDrag(false),
        onDrop: (e) => {
          e.preventDefault();
          setDrag(false);
          read(e.dataTransfer.files?.[0]);
        },
        onClick: () => pick.current?.click(),
        style: {
          border: `1.5px dashed ${drag ? "#6366F1" : "#D7DBEA"}`,
          borderRadius: 14,
          background: drag ? "#EEF2FF" : "#FBFBFE",
          padding: "26px 18px",
          textAlign: "center",
          cursor: "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("i", { className: "bi bi-file-earmark-spreadsheet", style: { fontSize: 26, color: "#6366F1" } }),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13.5, fontWeight: 800, color: "#0F172A", marginTop: 8 } }, file ? file.name : "Drop an .xlsx or .csv here, or click to choose"),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 3 } }, file ? `${rows.length} row${rows.length === 1 ? "" : "s"} read` : "The first row must be the column headings"),
      /* @__PURE__ */ React.createElement(
        "input",
        {
          ref: pick,
          type: "file",
          accept: ".xlsx,.xls,.csv",
          hidden: true,
          onChange: (e) => {
            read(e.target.files?.[0]);
            e.target.value = "";
          }
        }
      )
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: template, style: s.ghostBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-download", style: { fontSize: 13 } }), " Download the template"), /* @__PURE__ */ React.createElement("span", { style: s.fieldHint }, "Use the template, or any sheet whose headings match it \u2014 only Name is required.")), rows.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, unknown.length ? /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, borderColor: "#FDE68A", background: "#FFFBEB" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#92400E", fontWeight: 600 } }, "These columns match nothing on the board and will be ignored:", " ", /* @__PURE__ */ React.createElement("b", null, unknown.join(", ")), ". Add them with \u201CAdd a column of your own\u201D first if you need them.")) : null, noName ? /* @__PURE__ */ React.createElement("div", { style: { ...s.softBox, borderColor: "#FECACA", background: "#FEF2F2" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#B91C1C", fontWeight: 600 } }, noName, " row", noName === 1 ? " has" : "s have", " no name and will be skipped.")) : null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...s.fieldLabel, marginBottom: 7 } }, "First few rows"), /* @__PURE__ */ React.createElement("div", { style: { border: "1px solid #EEF0F7", borderRadius: 11, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#FBFBFE" } }, ["Name", "Business", "Phone", "Email", "Status"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { textAlign: "left", padding: "8px 10px", color: "#64748B", fontWeight: 800, fontSize: 11 } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, preview.map((r, i) => /* @__PURE__ */ React.createElement("tr", { key: i, style: { borderTop: "1px solid #F4F4FD" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", fontWeight: 700, color: "#0F172A" } }, r.name || "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", color: "#475569" } }, r.businessName || "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", color: "#475569" } }, r.phone || "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", color: "#475569" } }, r.email || "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", color: "#475569" } }, r.status || "New")))))), rows.length > preview.length ? /* @__PURE__ */ React.createElement("div", { style: { ...s.fieldHint, marginTop: 6 } }, "\u2026and ", rows.length - preview.length, " more.") : null), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...s.fieldLabel, marginBottom: 6 } }, "Someone already on the board"), /* @__PURE__ */ React.createElement("select", { value: onDupe, onChange: (e) => setOnDupe(e.target.value), style: s.input }, /* @__PURE__ */ React.createElement("option", { value: "skip" }, "Skip them \u2014 leave the lead that is already there"), /* @__PURE__ */ React.createElement("option", { value: "add" }, "Import anyway \u2014 I know there are two of them")), /* @__PURE__ */ React.createElement("div", { style: { ...s.fieldHint, marginTop: 5 } }, "Matched on email and phone, against the board and against the file itself."))) : null)
  );
}
export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [owners, setOwners] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fSource, setFSource] = useState("");
  const [rail, setRail] = useState("all");
  const [density, setDensity] = useState("comfortable");
  const [sort, setSort] = useState({ k: "created", dir: -1 });
  const [off, setOff] = useState(() => /* @__PURE__ */ new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const pickerRef = useRef(null);
  const load = useCallback(async (quiet) => {
    if (!quiet) setLoading(true);
    try {
      const r = await fetch("/api/admin/leads", { credentials: "include" });
      const j = await r.json();
      if (j.success) {
        setLeads(j.data || []);
        setOwners(j.owners || []);
        setFields(j.fields || []);
      } else toast.error(j.message || "Could not load leads");
    } catch {
      toast.error("Could not load leads");
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLS_KEY) || "null");
      setOff(new Set(Array.isArray(saved) ? saved : BASE_COLS.filter((c) => !c.on).map((c) => c.k)));
      const d = localStorage.getItem(DENSITY_KEY);
      if (d) setDensity(d);
    } catch {
      setOff(new Set(BASE_COLS.filter((c) => !c.on).map((c) => c.k)));
    }
  }, []);
  const persistOff = (next) => {
    setOff(next);
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify([...next]));
    } catch {
    }
  };
  const setDensityP = (d) => {
    setDensity(d);
    try {
      localStorage.setItem(DENSITY_KEY, d);
    } catch {
    }
  };
  useEffect(() => {
    if (!pickerOpen) return;
    const away = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [pickerOpen]);
  const [isSales, setIsSales] = useState(false);
  useEffect(() => {
    setIsSales(/(^|; *)sales_perms=/.test(document.cookie));
  }, []);
  const COLDEFS = useMemo(() => {
    const base = BASE_COLS.filter((c) => c.k !== "act" && !(isSales && c.k === "owner"));
    const custom = fields.map((f) => ({ k: `cf:${f.key}`, n: f.label, on: true, w: 150, cf: f }));
    return [...base, ...custom, BASE_COLS.find((c) => c.k === "act")];
  }, [fields, isSales]);
  const cols = useMemo(() => COLDEFS.filter((c) => c.lock || !off.has(c.k)), [COLDEFS, off]);
  const ownerName = useCallback(
    (l) => owners.find((o) => o._id === String(l.salespersonId || ""))?.name || "",
    [owners]
  );
  const railDef = RAIL.find((r) => r.k === rail) || RAIL[0];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (!railDef.m(l)) return false;
      if (fOwner && String(l.salespersonId || "") !== fOwner) return false;
      if (fSource && srcOf(l) !== fSource) return false;
      if (!needle) return true;
      return [
        l.name,
        l.businessName,
        l.email,
        l.phone,
        l.city,
        l.industry,
        // formType is how a lead is traced back to the form it came from —
        // "blog form", "contact form" — so the search box has to see it.
        l.service,
        l.status,
        l.formType,
        leadCode(l),
        ownerName(l),
        l.source?.utmCampaign,
        l.source?.campaignId,
        l.source?.adName
      ].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [leads, railDef, fOwner, fSource, q, ownerName]);
  const sortVal = useCallback((l, k) => {
    switch (k) {
      case "id":
        return String(l._id);
      case "nm":
        return (l.name || "").toLowerCase();
      case "co":
        return (l.businessName || "").toLowerCase();
      case "ph":
        return l.phone || "";
      case "em":
        return (l.email || "").toLowerCase();
      case "city":
        return (l.city || "").toLowerCase();
      case "ind":
        return (l.industry || "").toLowerCase();
      case "src":
        return srcOf(l).toLowerCase();
      case "campNm":
        return (l.source?.utmCampaign || "").toLowerCase();
      case "campId":
        return (l.source?.campaignId || "").toLowerCase();
      case "adset":
        return (l.source?.adset || "").toLowerCase();
      case "ad":
        return (l.source?.adName || "").toLowerCase();
      case "content":
        return (l.source?.utmContent || "").toLowerCase();
      case "svc":
        return (l.service || "").toLowerCase();
      case "runAds":
        return (l.runningAds || "").toLowerCase();
      case "owner":
        return ownerName(l).toLowerCase();
      case "status":
        return statusMeta(statusOf(l)).stage;
      case "stage":
        return statusMeta(stageOf(l)).stage;
      case "score":
        return l.score === null || l.score === void 0 ? -1 : Number(l.score);
      case "meeting":
        return l.meetingDate ? `${l.meetingDate} ${l.meetingTime}` : "";
      case "mode":
        return l.meetingMode || "";
      case "ladder":
        return (l.remindersSent || []).length;
      case "prep":
        return prepPct(l);
      case "held":
        return l.held || "";
      case "matSent":
        return matDone(l) ? 1 : 0;
      case "prop":
        return ["Proposal sent", "Negotiation", "Won"].includes(stageOf(l)) ? 1 : 0;
      case "client":
        return l.clientId ? 1 : 0;
      case "connects":
        return (l.connects || []).length;
      case "created":
        return new Date(l.createdAt || 0).getTime();
      default:
        if (k.startsWith("cf:")) return String(l.customFields?.[k.slice(3)] || "").toLowerCase();
        return "";
    }
  }, [ownerName]);
  const rows = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      const va = sortVal(a, sort.k), vb = sortVal(b, sort.k);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * sort.dir;
      return String(va).localeCompare(String(vb)) * sort.dir;
    });
    return out;
  }, [filtered, sort, sortVal]);
  const stats = useMemo(() => {
    const today = todayStr();
    const month = thisMonthStr();
    const live = leads.filter((l) => !isClosed(l));
    const scored = leads.filter((l) => l.score !== null && l.score !== void 0);
    return {
      pipeline: live.reduce((sum, l) => sum + budgetValue(l.budget), 0),
      thisMonth: leads.filter((l) => String(l.createdAt || "").slice(0, 7) === month).length,
      callsToday: leads.filter((l) => l.meetingDate === today).length,
      notBooked: live.filter((l) => !l.meetingDate).length,
      awaiting: leads.filter((l) => l.meetingDate && meetingIsPast(l) && !l.held).length,
      avgScore: scored.length ? (scored.reduce((sm, l) => sm + Number(l.score), 0) / scored.length).toFixed(1) : "\u2014",
      wonMonth: leads.filter((l) => isWon(l) && String(l.updatedAt || "").slice(0, 7) === month).length
    };
  }, [leads]);
  const railCounts = useMemo(() => {
    const base = leads.filter((l) => {
      if (fOwner && String(l.salespersonId || "") !== fOwner) return false;
      if (fSource && srcOf(l) !== fSource) return false;
      return true;
    });
    return RAIL.map((r) => {
      const hit = base.filter(r.m);
      return { ...r, count: hit.length, value: hit.reduce((sm, l) => sm + budgetValue(l.budget), 0) };
    });
  }, [leads, fOwner, fSource]);
  const alerts = useMemo(() => {
    const today = todayStr();
    const stale = leads.filter(
      (l) => !l.meetingDate && !isClosed(l) && Date.now() - new Date(l.createdAt || 0).getTime() > 24 * 3600 * 1e3
    );
    return {
      stale,
      callsToday: leads.filter((l) => l.meetingDate === today),
      unmarked: leads.filter((l) => l.meetingDate && meetingIsPast(l) && !l.held),
      prepDue: leads.filter((l) => l.meetingDate && !meetingIsPast(l) && prepPct(l) < 100)
    };
  }, [leads]);
  const replace = (lead) => setLeads((p) => p.map((x) => x._id === lead._id ? { ...x, ...lead, _id: String(lead._id) } : x));
  const patch = useCallback(async (id, body, quiet) => {
    try {
      const r = await fetch(`/api/admin/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!j.success) {
        toast.error(j.message || "Could not save");
        return null;
      }
      replace(j.data);
      if (!quiet) toast.success("Saved");
      return j.data;
    } catch {
      toast.error("Could not save");
      return null;
    }
  }, []);
  const convertToClient = async (l) => {
    if (!l.email) return toast.error("Add an email address to this lead first \u2014 a client record needs one.");
    if (!await confirmDialog(
      `Make ${l.businessName || l.name || "this lead"} a client? This only works once the advance is in \u2014 the lead is then marked Won and you go straight to Brands to set their brand up.`
    )) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/leads/${l._id}/convert`, { method: "POST", credentials: "include" });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Could not convert this lead");
      toast.success(j.already ? "Already a client \u2014 opening Brands" : `Client ${j.client.clientId} created`);
      const q2 = new URLSearchParams({
        newBrand: "1",
        clientId: String(j.client._id),
        name: l.businessName || l.name || "",
        email: l.email || ""
      });
      window.location.href = `${BRANDS_URL}?${q2.toString()}`;
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };
  const saveLead = async (form, force) => {
    setBusy(true);
    const editing = modal?.lead?._id;
    try {
      const r = await fetch(editing ? `/api/admin/leads/${editing}` : "/api/admin/leads", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(force ? { ...form, force: true } : form)
      });
      const j = await r.json();
      if (j.code === "DUPLICATE") {
        setBusy(false);
        if (await confirmDialog(`${j.message} Add this one anyway?`)) return saveLead(form, true);
        return;
      }
      if (!j.success) {
        toast.error(j.message || "Could not save");
        setBusy(false);
        return;
      }
      toast.success(editing ? "Lead updated" : "Lead added");
      setModal(null);
      await load(true);
    } catch {
      toast.error("Could not save");
    }
    setBusy(false);
  };
  const removeLead = async (l) => {
    if (!await confirmDialog(`Delete ${l.name || "this lead"} for good? Any proposals and invoices raised for them go too.`)) return;
    try {
      const r = await fetch(`/api/admin/leads/${l._id}`, { method: "DELETE", credentials: "include" });
      const j = await r.json();
      if (!j.success) return toast.error(j.message || "Could not delete");
      setLeads((p) => p.filter((x) => x._id !== l._id));
      toast.success("Lead deleted");
    } catch {
      toast.error("Could not delete");
    }
  };
  const sendMail = async (l, payload) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/leads/${l._id}/mail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!j.success) {
        toast.error(j.message || "Could not send");
        setBusy(false);
        return false;
      }
      replace(j.data);
      toast.success(j.message);
      setModal(null);
      setBusy(false);
      return true;
    } catch {
      toast.error("Could not send");
      setBusy(false);
      return false;
    }
  };
  const saveMeeting = async (l, meeting) => {
    setBusy(true);
    const saved = await patch(l._id, meeting, true);
    if (saved) {
      const mailed = (saved.events || []).slice(-4).some((e) => e.type === "mail");
      toast.success(mailed ? "Meeting set \u2014 the lead has been mailed the details" : "Meeting set");
      setModal(null);
    }
    setBusy(false);
  };
  const clearMeeting = async (l) => {
    if (!await confirmDialog("Clear this meeting? The date, time and link all go.")) return;
    setBusy(true);
    const saved = await patch(l._id, { meetingMode: "" }, true);
    if (saved) {
      toast.success("Meeting cleared");
      setModal(null);
    }
    setBusy(false);
  };
  const addField = async ({ label, type, options }) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/leads/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label, type, options })
      });
      const j = await r.json();
      if (!j.success) {
        toast.error(j.message || "Could not add column");
        setBusy(false);
        return;
      }
      toast.success(`\u201C${label}\u201D added \u2014 it's on the table and on the lead form`);
      await load(true);
    } catch {
      toast.error("Could not add column");
    }
    setBusy(false);
  };
  const deleteField = async (f) => {
    if (!await confirmDialog(`Remove the \u201C${f.label}\u201D column? Values already saved stay on the leads.`)) return;
    try {
      const r = await fetch(`/api/admin/leads/fields?key=${encodeURIComponent(f.key)}`, {
        method: "DELETE",
        credentials: "include"
      });
      const j = await r.json();
      if (!j.success) return toast.error(j.message || "Could not remove");
      toast.success("Column removed");
      await load(true);
    } catch {
      toast.error("Could not remove");
    }
  };
  const togglePrep = (l, key) => {
    const next = (l.prep || []).includes(key) ? l.prep.filter((k) => k !== key) : [...l.prep || [], key];
    patch(l._id, { prep: next }, true);
  };
  const logConnect = async (l, entry) => {
    setBusy(true);
    const next = [...l.connects || [], { ...entry, at: (/* @__PURE__ */ new Date()).toISOString() }];
    const saved = await patch(l._id, {
      connects: next,
      ...l.status === "New" ? { status: "Contacted" } : {},
      event: { type: "connect", text: `${entry.via} \u2014 ${entry.outcome}${entry.note ? `: ${entry.note}` : ""}` }
    }, true);
    if (saved) {
      toast.success("Attempt logged");
      setModal(null);
    }
    setBusy(false);
  };
  const saveScore = async (l, score, answers) => {
    setBusy(true);
    const saved = await patch(l._id, { score, scoreAnswers: answers }, true);
    if (saved) {
      toast.success(score === null ? "Score cleared" : `Scored ${score}/10`);
      setModal(null);
    }
    setBusy(false);
  };
  const mailAllUnbooked = async () => {
    const targets = rows.filter((l) => !l.meetingDate && l.email);
    if (!targets.length) return toast.error("Nobody in this view is waiting on us");
    if (!await confirmDialog(`Send the "we'll call you shortly" mail to ${targets.length} lead${targets.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    let ok = 0;
    for (const l of targets) {
      try {
        const r = await fetch(`/api/admin/leads/${l._id}/mail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ template: "invite" })
        });
        const j = await r.json();
        if (j.success) {
          ok++;
          replace(j.data);
        }
      } catch {
      }
    }
    setBusy(false);
    toast.success(`${ok} of ${targets.length} mails sent`);
  };
  const sortBy = (k) => setSort((p) => p.k === k ? { k, dir: -p.dir } : { k, dir: k === "created" || k === "score" ? -1 : 1 });
  const pad = density === "compact" ? "7px 10px" : "11px 12px";
  const renderCell = (l, c) => {
    switch (c.k) {
      case "id":
        return /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11.5, fontWeight: 800, color: "#94A3B8", fontFamily: "ui-monospace,Menlo,monospace" } }, leadCode(l));
      case "nm":
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } }, /* @__PURE__ */ React.createElement("span", { style: {
          width: 26,
          height: 26,
          borderRadius: 8,
          flexShrink: 0,
          background: tintFor(l._id),
          color: "#fff",
          fontSize: 10.5,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        } }, initials(l.name)), /* @__PURE__ */ React.createElement("span", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, l.name || "\u2014"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, color: "#94A3B8", fontWeight: 600 } }, daysAgo(l.createdAt))));
      case "co":
        return /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.businessName || "\u2014");
      case "ph":
        return l.phone ? /* @__PURE__ */ React.createElement("a", { href: `tel:${l.phone}`, style: { ...s.cellTxt, color: "#4F46E5", textDecoration: "none", fontWeight: 700 } }, l.phone) : /* @__PURE__ */ React.createElement("span", { style: s.dim }, "\u2014");
      case "em":
        return l.email ? /* @__PURE__ */ React.createElement("a", { href: `mailto:${l.email}`, style: { ...s.cellTxt, color: "#4F46E5", textDecoration: "none" } }, l.email) : /* @__PURE__ */ React.createElement("span", { style: s.dim }, "\u2014");
      case "city":
        return /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.city || "\u2014");
      case "ind":
        return /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.industry || "\u2014");
      case "src":
        return /* @__PURE__ */ React.createElement("span", { style: s.tag }, srcOf(l));
      case "campNm":
        return /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.source?.utmCampaign || "\u2014");
      case "campId":
        return /* @__PURE__ */ React.createElement("span", { style: { ...s.cellTxt, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11.5 } }, l.source?.campaignId || "\u2014");
      case "adset":
        return /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.source?.adset || "\u2014");
      case "ad":
        return /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.source?.adName || "\u2014");
      case "content":
        return /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.source?.utmContent || "\u2014");
      case "svc":
        return /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.service || "\u2014");
      case "runAds":
        return l.runningAds ? /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.runningAds) : /* @__PURE__ */ React.createElement("span", { style: s.dim }, "\u2014");
      case "owner": {
        const name = ownerName(l);
        return /* @__PURE__ */ React.createElement(
          "select",
          {
            value: String(l.salespersonId || ""),
            onChange: (e) => patch(l._id, { salespersonId: e.target.value || null }, true),
            style: { ...s.inlineSelect, color: name ? "#334155" : "#94A3B8" }
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }, "Unassigned"),
          owners.map((o) => /* @__PURE__ */ React.createElement("option", { key: o._id, value: o._id }, o.name))
        );
      }
      case "stage": {
        const st = stageOf(l);
        if (!st) return /* @__PURE__ */ React.createElement("span", { style: { color: "#CBD5E1" } }, "\u2014");
        const g = statusMeta(st);
        return /* @__PURE__ */ React.createElement("span", { style: { ...s.tag, background: g.bg, color: g.fg, border: `1px solid ${g.bd}` } }, st);
      }
      case "status": {
        const m = statusMeta(statusOf(l));
        return /* @__PURE__ */ React.createElement(
          "select",
          {
            value: statusOf(l),
            onChange: (e) => patch(l._id, { status: e.target.value }, true),
            style: {
              ...s.inlineSelect,
              background: m.bg,
              color: m.fg,
              border: `1px solid ${m.bd}`,
              fontWeight: 800,
              borderRadius: 999,
              padding: "4px 8px"
            }
          },
          statusOptions().map((k) => /* @__PURE__ */ React.createElement("option", { key: k, value: k }, k))
        );
      }
      case "score": {
        const has = l.score !== null && l.score !== void 0;
        const col = scoreCol(l.score);
        return /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "score", lead: l }), style: {
          border: "none",
          cursor: "pointer",
          borderRadius: 8,
          padding: "4px 9px",
          background: col.bg,
          color: col.fg,
          fontSize: 12,
          fontWeight: 900
        }, title: "Score this lead" }, has ? `${l.score}` : "Score it");
      }
      case "meeting":
        return l.meetingDate ? /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setModal({ type: "meeting", lead: l }),
            style: { ...s.miniBtn, height: "auto", padding: "4px 9px", flexDirection: "column", alignItems: "flex-start", gap: 0 },
            title: "Change the meeting"
          },
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12.5, fontWeight: 800, color: "#0F172A" } }, prettyDate(l.meetingDate)),
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#4F46E5", fontWeight: 700 } }, prettyTime(l.meetingTime))
        ) : /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "meeting", lead: l }), style: s.miniBtn, title: "Fix the meeting" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-calendar2-plus", style: { fontSize: 11 } }), " Not fixed");
      case "mode": {
        const m = modeMeta(l.meetingMode);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setModal({ type: "meeting", lead: l }),
            title: "How the meeting happens",
            style: m ? {
              ...s.tag,
              background: m.bg,
              color: m.fg,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            } : { ...s.tag, background: "#F1F5F9", color: "#94A3B8", border: "none", cursor: "pointer" }
          },
          m ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("i", { className: `bi ${m.icon}`, style: { fontSize: 10 } }), " ", m.k) : "\u2014"
        );
      }
      case "ladder": {
        const sent = new Set((l.remindersSent || []).map((r) => r.key));
        if (!l.meetingDate) {
          const nudges = (l.remindersSent || []).filter((r) => r.key === "invite" || r.key === "invite2").length;
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => setModal({ type: "mail", lead: l, preset: "invite" }),
              style: s.miniBtn,
              title: "Send a holding mail"
            },
            /* @__PURE__ */ React.createElement("i", { className: "bi bi-envelope-fill", style: { fontSize: 11 } }),
            nudges ? `${nudges} sent` : "Nudge"
          );
        }
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3 }, title: "Reminder mails before the meeting" }, LADDER.map((r) => /* @__PURE__ */ React.createElement("span", { key: r.k, style: {
          width: 15,
          height: 15,
          borderRadius: 4,
          background: sent.has(r.k) ? "#6366F1" : "#E9EAF5"
        }, title: `${r.n} \u2014 ${sent.has(r.k) ? "sent" : "not sent"}` })));
      }
      case "prep": {
        const p = prepPct(l);
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 6, borderRadius: 4, background: "#EEF0F7", overflow: "hidden", minWidth: 34 } }, /* @__PURE__ */ React.createElement("div", { style: { width: `${p}%`, height: "100%", background: p === 100 ? "#16A34A" : "#6366F1" } })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10.5, fontWeight: 800, color: "#64748B" } }, p, "%"));
      }
      case "held": {
        const o = MEETING_OUTCOMES.find((x) => x.k === l.held);
        if (o) return /* @__PURE__ */ React.createElement("span", { style: { ...s.tag, background: o.bg, color: o.fg } }, o.n);
        return /* @__PURE__ */ React.createElement("span", { style: { ...s.tag, background: "#F1F5F9", color: "#94A3B8" } }, l.meetingDate ? "Pending" : "\u2014");
      }
      case "matSent": {
        const done = matDone(l);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setModal({ type: "mail", lead: l, preset: "material" }),
            style: {
              ...s.miniBtn,
              height: "auto",
              padding: "4px 9px",
              ...done ? { background: "#DCFCE7", borderColor: "#BBF7D0", color: "#15803D" } : {}
            },
            title: done ? "Material pack sent \u2014 send it again" : "Send the material pack"
          },
          /* @__PURE__ */ React.createElement("i", { className: `bi ${done ? "bi-check2-circle" : "bi-box-seam-fill"}`, style: { fontSize: 11 } }),
          done ? "Sent" : "Send material"
        );
      }
      case "client": {
        if (l.clientId) {
          return /* @__PURE__ */ React.createElement(
            "a",
            {
              href: `${BRANDS_URL}?client=${l.clientId}`,
              style: {
                ...s.miniBtn,
                height: "auto",
                padding: "4px 9px",
                textDecoration: "none",
                background: "#DCFCE7",
                borderColor: "#BBF7D0",
                color: "#15803D"
              },
              title: "Open this client's brands"
            },
            /* @__PURE__ */ React.createElement("i", { className: "bi bi-bookmark-star-fill", style: { fontSize: 11 } }),
            " Brands"
          );
        }
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => convertToClient(l),
            disabled: busy,
            style: { ...s.miniBtn, height: "auto", padding: "4px 9px" },
            title: "Make a client record and set its brand up"
          },
          /* @__PURE__ */ React.createElement("i", { className: "bi bi-person-check-fill", style: { fontSize: 11 } }),
          " Convert"
        );
      }
      case "prop": {
        const raised = ["Proposal sent", "Negotiation", "Won"].includes(stageOf(l));
        return /* @__PURE__ */ React.createElement(
          "a",
          {
            href: `/dashboard/website/proposals?${raised ? "lead" : "new"}=${l._id}`,
            style: { ...s.miniBtn, height: "auto", padding: "4px 9px", textDecoration: "none" },
            title: raised ? "See their proposals" : "Raise a proposal"
          },
          /* @__PURE__ */ React.createElement("i", { className: "bi bi-file-earmark-text-fill", style: { fontSize: 11 } }),
          raised ? "View proposal" : "Raise proposal"
        );
      }
      case "connects":
        return /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12.5, fontWeight: 800, color: (l.connects || []).length ? "#0F172A" : "#CBD5E1" } }, (l.connects || []).length);
      case "created":
        return /* @__PURE__ */ React.createElement("span", { style: { ...s.cellTxt, fontSize: 11.5 } }, fmtD(l.createdAt));
      case "act":
        return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "mail", lead: l }), style: s.iconBtn, title: "Send a mail" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-envelope-fill", style: { fontSize: 12 } })), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "edit", lead: l }), style: s.iconBtn, title: "Edit lead" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-pencil-fill", style: { fontSize: 12 } })), !isSales && /* @__PURE__ */ React.createElement("button", { onClick: () => removeLead(l), style: { ...s.iconBtn, color: "#DC2626" }, title: "Delete lead" }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-trash-fill", style: { fontSize: 12 } })));
      default:
        if (c.k.startsWith("cf:")) {
          return /* @__PURE__ */ React.createElement("span", { style: s.cellTxt }, l.customFields?.[c.k.slice(3)] || "\u2014");
        }
        return null;
    }
  };
  const PANEL_OF = {
    id: "record",
    nm: "record",
    co: "record",
    city: "record",
    ind: "record",
    svc: "record",
    ph: "contact",
    em: "contact",
    // Campaign carries nothing worth a panel, so it stays plain text.
    src: "attribution",
    campId: "attribution",
    adset: "attribution",
    ad: "attribution",
    content: "attribution",
    ladder: "mails",
    prep: "prep",
    held: "after",
    connects: "connects",
    created: "journey"
  };
  const PANEL_META = {
    record: { t: "Lead record", i: "bi-person-vcard-fill" },
    contact: { t: "How to reach them", i: "bi-telephone-fill" },
    attribution: { t: "Where they came from", i: "bi-bullseye" },
    mails: { t: "Reminder mails", i: "bi-envelope-paper-fill" },
    prep: { t: "Homework before the call", i: "bi-list-check" },
    after: { t: "After the meeting", i: "bi-clipboard2-check-fill" },
    connects: { t: "Times we tried them", i: "bi-telephone-fill" },
    journey: { t: "Journey", i: "bi-clock-history" }
  };
  const checklistUrl = (l) => typeof window === "undefined" ? "" : `${window.location.origin}/dashboard/website/leads?lead=${l._id}&panel=prep`;
  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      window.prompt("Copy this link", url);
    }
  };
  const kv = (label, value) => /* @__PURE__ */ React.createElement(Fragment, { key: label }, /* @__PURE__ */ React.createElement("span", { style: { color: "#94A3B8", fontWeight: 700, whiteSpace: "nowrap", fontSize: 12 } }, label), /* @__PURE__ */ React.createElement("span", { style: { color: "#334155", fontWeight: 600, fontSize: 12, wordBreak: "break-word" } }, value || "\u2014"));
  const renderPanel = (l, p) => {
    const sent = new Map((l.remindersSent || []).map((r) => [r.key, r.at]));
    switch (p) {
      case "record":
        return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px" } }, kv("Lead ID", leadCode(l)), kv("Name", l.name), kv("Business Name", l.businessName), kv("City", l.city), kv("Industry", l.industry), kv("What they want", l.service), kv("Running ads", l.runningAds), kv("Owner", ownerName(l) || "Unassigned"), kv("Status", l.status), kv("Came in", fmtDT(l.createdAt)), kv("Form", l.formType)), /* @__PURE__ */ React.createElement("div", { style: { ...s.expHead, marginTop: 16 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-journal-text", style: s.expIcon }), " Notes"), /* @__PURE__ */ React.createElement(NoteBox, { lead: l, onSave: (v) => patch(l._id, { notes: v }, true) }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "edit", lead: l }), style: s.miniBtnPrimary }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-pencil-fill", style: { fontSize: 11 } }), " Edit this lead")));
      case "contact":
        return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px" } }, kv("Name", l.name), kv("Phone", l.phone), kv("Email", l.email), kv("Business Name", l.businessName), kv("Times we tried them", (l.connects || []).length)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" } }, l.phone ? /* @__PURE__ */ React.createElement("a", { href: `tel:${l.phone}`, style: { ...s.miniBtn, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-telephone-fill", style: { fontSize: 11 } }), " Call them") : null, l.email ? /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "mail", lead: l }), style: s.miniBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-envelope-fill", style: { fontSize: 11 } }), " Mail them") : null, /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "connect", lead: l }), style: s.miniBtn }, "Log an attempt")));
      case "attribution":
        return /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px" } }, [
          ["Source", srcOf(l)],
          ["Campaign", l.source?.utmCampaign],
          ["Campaign ID", l.source?.campaignId],
          ["Ad set", l.source?.adset],
          ["Ad name", l.source?.adName],
          ["Content", l.source?.utmContent],
          ["Medium", l.source?.utmMedium],
          ["Keyword", l.source?.utmTerm],
          ["Landing page", l.source?.landingPage],
          ["Referrer", l.source?.referrer],
          ["Google click id", l.source?.gclid],
          ["Meta click id", l.source?.fbclid],
          ["Form", l.formType]
        ].filter(([, v]) => v).map(([k, v]) => kv(k, v)));
      case "connects":
        return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "connect", lead: l }), style: { ...s.miniBtnPrimary, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg", style: { fontSize: 11 } }), " Log an attempt"), !(l.connects || []).length ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#94A3B8", fontWeight: 600 } }, "Nobody has rung them yet.") : /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: { display: "flex", flexDirection: "column", gap: 9, maxHeight: 330, overflowY: "auto" } }, [...l.connects].reverse().map((c, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { borderLeft: "2px solid #E0E7FF", paddingLeft: 9 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 800, color: "#0F172A" } }, c.via, " \xB7 ", c.outcome), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, color: "#94A3B8", fontWeight: 600 } }, fmtDT(c.at)), c.note ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#475569", marginTop: 2, lineHeight: 1.5 } }, c.note) : null))));
      case "journey":
        return !(l.events || []).length ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#94A3B8", fontWeight: 600 } }, "Nothing logged yet.") : /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" } }, [...l.events].reverse().map((e, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 7, height: 7, borderRadius: 99, background: "#C7D2FE", marginTop: 5, flexShrink: 0 } }), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#334155", lineHeight: 1.45 } }, e.text), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, color: "#94A3B8", fontWeight: 600 } }, fmtDT(e.at))))));
      case "after":
        return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, MEETING_OUTCOMES.map((o) => /* @__PURE__ */ React.createElement(
          "button",
          {
            key: o.k,
            onClick: () => patch(l._id, o.k === "held" ? { held: l.held === "held" ? "" : "held" } : { held: l.held === o.k ? "" : o.k }, true),
            style: l.held === o.k ? s.miniBtnOn : s.miniBtn
          },
          o.n
        ))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 11.5, color: "#94A3B8", fontWeight: 600 } }, "Why a deal was lost belongs on the lead's status, not here."));
      case "prep":
        return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 7, borderRadius: 4, background: "#EEF0F7", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { width: `${prepPct(l)}%`, height: "100%", background: prepPct(l) === 100 ? "#16A34A" : "#6366F1" } })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 900, color: "#6366F1" } }, prepPct(l), "%")), /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: { maxHeight: 360, overflowY: "auto", paddingRight: 4 } }, PREP_GROUPS.map((g) => /* @__PURE__ */ React.createElement("div", { key: g, style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 4 } }, g), PREP.filter((x) => x.g === g).map((x) => {
          const on = (l.prep || []).includes(x.k);
          return /* @__PURE__ */ React.createElement("label", { key: x.k, style: { display: "flex", gap: 7, alignItems: "flex-start", padding: "3px 0", cursor: "pointer" } }, /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "checkbox",
              checked: on,
              onChange: () => togglePrep(l, x.k),
              style: { marginTop: 2, accentColor: "#6366F1", cursor: "pointer" }
            }
          ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: on ? "#0F172A" : "#64748B", lineHeight: 1.45 } }, x.n));
        })))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("a", { href: checklistUrl(l), target: "_blank", rel: "noreferrer", style: { ...s.miniBtn, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-box-arrow-up-right", style: { fontSize: 11 } }), " Open the checklist"), /* @__PURE__ */ React.createElement("button", { onClick: () => copyLink(checklistUrl(l)), style: s.miniBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-link-45deg", style: { fontSize: 12 } }), " Copy the link")));
      case "mails":
        return /* @__PURE__ */ React.createElement("div", null, l.meetingDate ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5 } }, LADDER.map((r) => {
          const at = sent.get(r.k);
          const gone = !at && rungGone(r.k, l.meetingDate);
          return /* @__PURE__ */ React.createElement("div", { key: r.k, style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 9, height: 9, borderRadius: 3, background: at ? "#6366F1" : "#E9EAF5", flexShrink: 0 } }), /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: 12, fontWeight: 700, color: at ? "#0F172A" : "#94A3B8" } }, r.n), at ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10.5, color: "#94A3B8", fontWeight: 600 } }, fmtDT(at)) : gone ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10.5, color: "#94A3B8", fontWeight: 600 } }, "too close now") : /* @__PURE__ */ React.createElement("button", { onClick: () => sendMail(l, { template: r.k }), disabled: busy, style: s.tinyBtn }, "Send now"));
        })) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5 } }, ["invite", "invite2"].map((k, i) => {
          const at = sent.get(k);
          return /* @__PURE__ */ React.createElement("div", { key: k, style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 9, height: 9, borderRadius: 3, background: at ? "#6366F1" : "#E9EAF5", flexShrink: 0 } }), /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: 12, fontWeight: 700, color: at ? "#0F172A" : "#94A3B8" } }, i === 0 ? "\u201CWe'll call you\u201D note" : "Follow-up nudge"), at ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10.5, color: "#94A3B8", fontWeight: 600 } }, fmtDT(at)) : /* @__PURE__ */ React.createElement("button", { onClick: () => sendMail(l, { template: k }), disabled: busy, style: s.tinyBtn }, "Send now"));
        }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 4, lineHeight: 1.6 } }, "The confirmation and the four reminders unlock once a meeting is fixed.")));
      default:
        return null;
    }
  };
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !leads.length) return;
    const p = new URLSearchParams(window.location.search);
    const id = p.get("lead");
    const panel = p.get("panel");
    const lead = id && leads.find((x) => x._id === id);
    if (lead) {
      deepLinked.current = true;
      setModal({ type: "cell", lead, panel: PANEL_META[panel] ? panel : "record" });
    }
  }, [leads]);
  const shown = cols.length;
  const hiddenCount = COLDEFS.length - shown;
  return /* @__PURE__ */ React.createElement("section", { className: "main-dashboard-area" }, /* @__PURE__ */ React.createElement(Head, null, /* @__PURE__ */ React.createElement("title", null, "Leads \u2014 Website")), /* @__PURE__ */ React.createElement(Toaster, { position: "top-right" }), /* @__PURE__ */ React.createElement("div", { className: "main-nav" }, /* @__PURE__ */ React.createElement(WebsiteLeftbar, null), /* @__PURE__ */ React.createElement(LeftbarMobile, null), /* @__PURE__ */ React.createElement(Dashnav, null), /* @__PURE__ */ React.createElement("section", { className: "content home" }, /* @__PURE__ */ React.createElement("div", { className: "block-header" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: {
    width: 40,
    height: 40,
    borderRadius: 12,
    flexShrink: 0,
    background: "linear-gradient(135deg,#6366F1,#818CF8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 5px 14px rgba(99,102,241,.25)"
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-person-lines-fill", style: { fontSize: 17, color: "#fff" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 } }, "Leads"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 } }, "Everyone who filled the website form \u2014 call them, fix a meeting, close it."))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => load(), disabled: loading, style: s.ghostBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-arrow-clockwise", style: { fontSize: 13 } }), " Refresh"), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "fields" }), style: s.ghostBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-layout-three-columns", style: { fontSize: 13 } }), " Add column"), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "new" }), style: s.primaryBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg", style: { fontSize: 13 } }), " New lead"))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(178px,1fr))", gap: 11, marginTop: 20, marginBottom: 14 } }, /* @__PURE__ */ React.createElement(Metric, { icon: "bi-graph-up-arrow", label: "Open pipeline", value: loading ? "\u2026" : inrShort(stats.pipeline), sub: "live leads, by budget", accent: { bg: "#EEF2FF", icon: "#6366F1" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-person-plus-fill", label: "Leads this month", value: loading ? "\u2026" : stats.thisMonth, accent: { bg: "#E0F2FE", icon: "#0284C7" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-telephone-x-fill", label: "No meeting yet", value: loading ? "\u2026" : stats.notBooked, sub: "call them", accent: { bg: "#FFEDD5", icon: "#EA580C" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-calendar2-event-fill", label: "Meetings today", value: loading ? "\u2026" : stats.callsToday, accent: { bg: "#E0E7FF", icon: "#4F46E5" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-question-circle-fill", label: "Outcome not marked", value: loading ? "\u2026" : stats.awaiting, accent: { bg: "#FEF3C7", icon: "#D97706" } }), /* @__PURE__ */ React.createElement(Metric, { icon: "bi-trophy-fill", label: "Won this month", value: loading ? "\u2026" : stats.wonMonth, accent: { bg: "#DCFCE7", icon: "#16A34A" } })), /* @__PURE__ */ React.createElement("div", { style: { ...s.panel, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { ...s.panelHead, cursor: "pointer" }, onClick: () => setAlertsOpen((v) => !v) }, /* @__PURE__ */ React.createElement("div", { style: s.panelIcon }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-bell-fill", style: { fontSize: 14, color: "#6366F1" } })), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 13, color: "#0F172A" } }, "Needs doing today"), /* @__PURE__ */ React.createElement("span", { style: s.countChip }, alerts.stale.length + alerts.callsToday.length + alerts.unmarked.length), /* @__PURE__ */ React.createElement("i", { className: `bi bi-chevron-${alertsOpen ? "up" : "down"}`, style: { marginLeft: "auto", fontSize: 12, color: "#94A3B8" } })), alertsOpen && /* @__PURE__ */ React.createElement("div", { style: { padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 } }, /* @__PURE__ */ React.createElement(
    AlertBox,
    {
      tone: "#EA580C",
      icon: "bi-telephone-outbound-fill",
      title: "Nobody has called them",
      count: alerts.stale.length,
      body: "Enquired over a day ago and still has no meeting on the calendar.",
      action: alerts.stale.length ? { label: "Show them", onClick: () => {
        setRail("nobook");
        setQ("");
      } } : null
    }
  ), /* @__PURE__ */ React.createElement(
    AlertBox,
    {
      tone: "#4F46E5",
      icon: "bi-calendar2-event-fill",
      title: "Meetings today",
      count: alerts.callsToday.length,
      body: alerts.callsToday.map((l) => `${prettyTime(l.meetingTime)} ${l.name}`).slice(0, 4).join(" \xB7 ") || "Nothing on the calendar."
    }
  ), /* @__PURE__ */ React.createElement(
    AlertBox,
    {
      tone: "#D97706",
      icon: "bi-question-circle-fill",
      title: "Outcome not marked",
      count: alerts.unmarked.length,
      body: "The meeting time has passed but nobody said whether it happened.",
      action: alerts.unmarked.length ? { label: "Show them", onClick: () => {
        setRail("booked");
        setQ("");
      } } : null
    }
  ), /* @__PURE__ */ React.createElement(
    AlertBox,
    {
      tone: "#0284C7",
      icon: "bi-list-check",
      title: "Prep not finished",
      count: alerts.prepDue.length,
      body: "Meetings coming up where the homework isn't done."
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 12 } }, railCounts.map((r) => {
    const on = rail === r.k;
    return /* @__PURE__ */ React.createElement("button", { key: r.k, onClick: () => setRail(r.k), style: {
      flexShrink: 0,
      minWidth: 118,
      textAlign: "left",
      cursor: "pointer",
      padding: "9px 13px",
      borderRadius: 12,
      border: `1px solid ${on ? "#818CF8" : "#EEF0F7"}`,
      background: on ? "#EEF2FF" : "#fff",
      boxShadow: on ? "0 3px 10px rgba(99,102,241,.14)" : "0 1px 4px rgba(15,23,42,.04)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: on ? "#4F46E5" : "#64748B", whiteSpace: "nowrap" } }, r.n), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 900, color: "#0F172A", lineHeight: 1.15, marginTop: 1 } }, r.count), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, fontWeight: 700, color: "#94A3B8" } }, inrShort(r.value)));
  })), /* @__PURE__ */ React.createElement("div", { style: s.panel }, /* @__PURE__ */ React.createElement("div", { style: { ...s.panelHead, gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", flex: "1 1 220px", minWidth: 180, maxWidth: 320 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-search", style: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#94A3B8" } }), /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "lp-in",
      style: { ...s.input, height: 36, paddingLeft: 31 },
      value: q,
      onChange: (e) => setQ(e.target.value),
      placeholder: "Search name, company, phone, campaign\u2026"
    }
  )), !isSales && /* @__PURE__ */ React.createElement(
    "select",
    {
      className: "lp-in",
      style: { ...s.input, height: 36, width: "auto", minWidth: 130 },
      value: fOwner,
      onChange: (e) => setFOwner(e.target.value)
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "All owners"),
    owners.map((o) => /* @__PURE__ */ React.createElement("option", { key: o._id, value: o._id }, o.name))
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      className: "lp-in",
      style: { ...s.input, height: 36, width: "auto", minWidth: 130 },
      value: fSource,
      onChange: (e) => setFSource(e.target.value)
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "All sources"),
    [...new Set(leads.map(srcOf))].sort().map((x) => /* @__PURE__ */ React.createElement("option", { key: x, value: x }, x))
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", border: "1px solid #E2E8F0", borderRadius: 9, overflow: "hidden", height: 36 } }, ["comfortable", "compact"].map((d) => /* @__PURE__ */ React.createElement("button", { key: d, onClick: () => setDensityP(d), style: {
    border: "none",
    cursor: "pointer",
    padding: "0 12px",
    fontSize: 12,
    fontWeight: 700,
    background: density === d ? "#EEF2FF" : "#fff",
    color: density === d ? "#4F46E5" : "#94A3B8"
  } }, d === "comfortable" ? "Roomy" : "Tight"))), /* @__PURE__ */ React.createElement("div", { ref: pickerRef, style: { position: "relative", marginLeft: "auto" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setPickerOpen((v) => !v), style: s.ghostBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-layout-three-columns", style: { fontSize: 13 } }), "Columns ", shown, "/", COLDEFS.length), pickerOpen && /* @__PURE__ */ React.createElement("div", { style: {
    position: "absolute",
    right: 0,
    top: 42,
    zIndex: 40,
    width: 268,
    background: "#fff",
    border: "1px solid #EEF0F7",
    borderRadius: 13,
    boxShadow: "0 16px 40px rgba(15,23,42,.16)",
    overflow: "hidden"
  } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "11px 14px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12.5, fontWeight: 800, color: "#0F172A" } }, "Show columns"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => persistOff(new Set(BASE_COLS.filter((c) => !c.on).map((c) => c.k))),
      style: { ...s.tinyBtn, marginLeft: "auto" }
    },
    "Reset"
  )), /* @__PURE__ */ React.createElement("div", { style: { maxHeight: 330, overflowY: "auto", padding: "6px 4px" } }, COLDEFS.map((c) => {
    const on = c.lock || !off.has(c.k);
    return /* @__PURE__ */ React.createElement("label", { key: c.k, style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "7px 11px",
      borderRadius: 8,
      cursor: c.lock ? "default" : "pointer",
      opacity: c.lock ? 0.6 : 1
    } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: on,
        disabled: c.lock,
        onChange: () => {
          const next = new Set(off);
          if (next.has(c.k)) next.delete(c.k);
          else next.add(c.k);
          persistOff(next);
        },
        style: { accentColor: "#6366F1", cursor: c.lock ? "default" : "pointer" }
      }
    ), /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: 12.5, fontWeight: 700, color: "#334155" } }, c.n), c.lock ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 800, color: "#94A3B8" } }, "pinned") : null, c.cf ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 800, color: "#6366F1" } }, "yours") : null);
  })), /* @__PURE__ */ React.createElement("div", { style: { padding: "9px 12px", borderTop: "1px solid #F4F4FD", background: "#FBFBFE" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setPickerOpen(false);
    setModal({ type: "fields" });
  }, style: { ...s.tinyBtn, width: "100%" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg", style: { fontSize: 11 } }), " Add a column of your own")))), rail === "nobook" && /* @__PURE__ */ React.createElement("button", { onClick: mailAllUnbooked, disabled: busy, style: { ...s.ghostBtn, borderColor: "#FED7AA", color: "#C2410C" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-send-fill", style: { fontSize: 12 } }), " Mail everyone shown"), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal({ type: "import" }), style: s.ghostBtn }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-upload", style: { fontSize: 13 } }), " Import")), /* @__PURE__ */ React.createElement("div", { className: "lp-scroll", style: { overflow: "auto", maxHeight: "calc(100vh - 250px)" } }, /* @__PURE__ */ React.createElement("table", { style: { borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: cols.reduce((n, c) => n + (c.w || 130), 0) } }, /* @__PURE__ */ React.createElement("colgroup", null, cols.map((c) => /* @__PURE__ */ React.createElement("col", { key: c.k, style: { width: c.w || 130 } }))), /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, cols.map((c, i) => /* @__PURE__ */ React.createElement("th", { key: c.k, onClick: () => sortBy(c.k), style: {
    ...s.th,
    padding: pad,
    cursor: "pointer",
    position: "sticky",
    top: 0,
    zIndex: 5
  } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, c.n, sort.k === c.k ? /* @__PURE__ */ React.createElement("i", { className: `bi bi-caret-${sort.dir === 1 ? "up" : "down"}-fill`, style: { fontSize: 9, color: "#6366F1" } }) : null))))), /* @__PURE__ */ React.createElement("tbody", null, loading ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: cols.length, style: s.emptyCell }, "Loading leads\u2026")) : !rows.length ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: cols.length, style: s.emptyCell }, leads.length ? "No lead matches these filters." : "No leads yet \u2014 they'll appear here the moment someone fills the website form.")) : rows.map((l) => /* @__PURE__ */ React.createElement("tr", { key: l._id, className: "lp-row", style: { background: "#fff" } }, cols.map((c) => {
    const panel = PANEL_OF[c.k] || (c.k.startsWith("cf:") ? "record" : null);
    return /* @__PURE__ */ React.createElement("td", { key: c.k, style: { ...s.td, padding: pad, background: "#fff" } }, panel ? /* @__PURE__ */ React.createElement("div", { className: "lp-cell", onClick: (e) => {
      if (e.target.closest("a,button,select,input,label")) return;
      setModal({ type: "cell", lead: l, panel });
    }, title: PANEL_META[panel].t }, renderCell(l, c)) : renderCell(l, c));
  })))))), /* @__PURE__ */ React.createElement("div", { style: {
    padding: "11px 18px",
    borderTop: "1px solid #F4F4FD",
    background: "#FBFBFE",
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    fontSize: 12,
    fontWeight: 700,
    color: "#64748B"
  } }, /* @__PURE__ */ React.createElement("span", null, rows.length, " of ", leads.length, " leads"), /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", null, rows.filter((l) => !l.meetingDate).length, " with no meeting fixed"), /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", null, "Pipeline shown ", inr(rows.reduce((n, l) => n + budgetValue(l.budget), 0))), hiddenCount ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", null, hiddenCount, " column", hiddenCount === 1 ? "" : "s", " hidden")) : null))))), modal?.type === "new" && /* @__PURE__ */ React.createElement(Modal, { wide: true, title: "New lead", icon: "bi-person-plus-fill", onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement(
    LeadForm,
    {
      initial: null,
      owners,
      fields,
      busy,
      isSales,
      onSave: saveLead,
      onCancel: () => setModal(null)
    }
  )), modal?.type === "edit" && /* @__PURE__ */ React.createElement(Modal, { wide: true, title: `Edit ${modal.lead.name || "lead"}`, icon: "bi-pencil-fill", onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement(
    LeadForm,
    {
      initial: modal.lead,
      owners,
      fields,
      busy,
      isSales,
      onSave: saveLead,
      onCancel: () => setModal(null)
    }
  )), modal?.type === "meeting" && /* @__PURE__ */ React.createElement(Modal, { title: `Meeting with ${modal.lead.name || "lead"}`, icon: "bi-calendar2-check-fill", onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement(
    MeetingPanel,
    {
      lead: leads.find((x) => x._id === modal.lead._id) || modal.lead,
      busy,
      onSave: (m) => saveMeeting(modal.lead, m),
      onClear: () => clearMeeting(modal.lead)
    }
  )), modal?.type === "score" && /* @__PURE__ */ React.createElement(Modal, { title: `Score ${modal.lead.name || "lead"}`, icon: "bi-star-fill", onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement(
    ScorePanel,
    {
      lead: leads.find((x) => x._id === modal.lead._id) || modal.lead,
      busy,
      onSave: (sc, ans) => saveScore(modal.lead, sc, ans)
    }
  )), modal?.type === "connect" && /* @__PURE__ */ React.createElement(Modal, { title: `Log an attempt \u2014 ${modal.lead.name || "lead"}`, icon: "bi-telephone-fill", onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement(ConnectPanel, { busy, onSave: (e) => logConnect(leads.find((x) => x._id === modal.lead._id) || modal.lead, e) })), modal?.type === "mail" && /* @__PURE__ */ React.createElement(
    MailModal,
    {
      lead: leads.find((x) => x._id === modal.lead._id) || modal.lead,
      preset: modal.preset,
      busy,
      onClose: () => setModal(null),
      onSend: (p) => sendMail(modal.lead, p)
    }
  ), modal?.type === "cell" && (() => {
    const live = leads.find((x) => x._id === modal.lead._id) || modal.lead;
    const meta = PANEL_META[modal.panel];
    return /* @__PURE__ */ React.createElement(
      Modal,
      {
        wide: modal.panel === "record" || modal.panel === "attribution",
        title: `${meta.t} \u2014 ${live.name || "lead"}`,
        icon: meta.i,
        onClose: () => setModal(null)
      },
      renderPanel(live, modal.panel)
    );
  })(), modal?.type === "import" && /* @__PURE__ */ React.createElement(ImportPanel, { fields, onClose: () => setModal(null), onDone: () => load(true) }), modal?.type === "fields" && /* @__PURE__ */ React.createElement(Modal, { title: "Your own columns", icon: "bi-layout-three-columns", onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement(FieldPanel, { fields, busy, onAdd: addField, onDelete: deleteField })), /* @__PURE__ */ React.createElement("style", { jsx: true, global: true }, `
        .lp-in:focus { border-color: #818CF8 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
        .lp-row:hover td { background: #F8F9FF !important; }
        /* a cell that opens its own panel \u2014 the whole cell is the hit area */
        .lp-cell { cursor: pointer; border-radius: 7px; margin: -3px -5px; padding: 3px 5px; min-width: 0; }
        .lp-cell:hover { background: #EEF2FF; }
        /* thin, pale scrollbars \u2014 the table shouldn't shout about being scrollable */
        .lp-scroll { scrollbar-width: thin; scrollbar-color: #DDDDEC transparent; }
        .lp-scroll::-webkit-scrollbar { width: 7px; height: 7px; }
        .lp-scroll::-webkit-scrollbar-track { background: transparent; }
        .lp-scroll::-webkit-scrollbar-thumb { background: #DFDFEE; border-radius: 20px; }
        .lp-scroll::-webkit-scrollbar-thumb:hover { background: #C7C7DE; }
        .lp-scroll::-webkit-scrollbar-corner { background: transparent; }
      `));
}
function NoteBox({ lead, onSave }) {
  const [v, setV] = useState(lead.notes || "");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setV(lead.notes || "");
    setDirty(false);
  }, [lead._id, lead.notes]);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      className: "lp-in",
      style: { ...s.input, height: 80, padding: "9px 11px", resize: "vertical", fontSize: 12.5 },
      value: v,
      onChange: (e) => {
        setV(e.target.value);
        setDirty(true);
      },
      placeholder: "What did they say? What do they actually need?"
    }
  ), dirty && /* @__PURE__ */ React.createElement("button", { onClick: () => {
    onSave(v);
    setDirty(false);
  }, style: { ...s.tinyBtn, marginTop: 7 } }, "Save note"));
}
function AlertBox({ tone, icon, title, count, body, action }) {
  return /* @__PURE__ */ React.createElement("div", { style: { border: "1px solid #EEF0F7", borderRadius: 12, padding: "12px 13px", background: "#fff" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 5 } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${icon}`, style: { fontSize: 14, color: tone } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12.5, fontWeight: 800, color: "#0F172A" } }, title), /* @__PURE__ */ React.createElement("span", { style: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: 900,
    color: count ? tone : "#CBD5E1"
  } }, count)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#64748B", fontWeight: 600, lineHeight: 1.55 } }, body), action && /* @__PURE__ */ React.createElement("button", { onClick: action.onClick, style: { ...s.tinyBtn, marginTop: 8, color: tone, borderColor: `${tone}44` } }, action.label));
}
export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=") && !cookie.includes("sales_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
const s = {
  panel: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #F0F0F8",
    boxShadow: "0 2px 8px rgba(99,102,241,.06)",
    overflow: "hidden"
  },
  panelHead: {
    padding: "12px 16px",
    borderBottom: "1px solid #F4F4FD",
    display: "flex",
    alignItems: "center",
    gap: 9,
    flexWrap: "wrap"
  },
  panelIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    background: "#6366F118",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  countChip: {
    fontSize: 11,
    fontWeight: 800,
    background: "#EEF2FF",
    color: "#6366F1",
    borderRadius: 20,
    padding: "2px 10px"
  },
  th: {
    background: "#FAFAFF",
    borderBottom: "1px solid #EEF0F7",
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    color: "#64748B",
    textAlign: "left",
    whiteSpace: "nowrap",
    userSelect: "none"
  },
  td: {
    borderBottom: "1px solid #F5F5FC",
    verticalAlign: "middle",
    overflow: "hidden",
    whiteSpace: "nowrap"
    // nothing in a cell ever wraps onto a second line
  },
  cellTxt: { fontSize: 12.5, color: "#334155", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" },
  dim: { fontSize: 12.5, color: "#CBD5E1", fontWeight: 600 },
  tag: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 800,
    borderRadius: 20,
    padding: "3px 9px",
    background: "#EEF2FF",
    color: "#4F46E5",
    whiteSpace: "nowrap"
  },
  inlineSelect: {
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    background: "#fff",
    height: 28,
    fontSize: 11.5,
    fontWeight: 700,
    padding: "0 6px",
    cursor: "pointer",
    maxWidth: "100%",
    outline: "none"
  },
  input: {
    height: 40,
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: "0 12px",
    fontSize: 13.5,
    color: "#1E293B",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    width: "100%"
  },
  fieldLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "#64748B" },
  fieldHint: { fontSize: 11, color: "#94A3B8", fontWeight: 500 },
  formSection: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".05em",
    color: "#6366F1",
    margin: "18px 0 10px",
    paddingBottom: 6,
    borderBottom: "1px solid #F1F1FA"
  },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 12 },
  softBox: { background: "#F8F9FF", border: "1px solid #EEF0F7", borderRadius: 11, padding: "11px 13px" },
  expCard: { background: "#fff", border: "1px solid #EEF0F7", borderRadius: 13, padding: "13px 14px" },
  expHead: { display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, color: "#0F172A", marginBottom: 9 },
  expIcon: { fontSize: 13, color: "#6366F1" },
  primaryBtn: {
    border: "none",
    borderRadius: 10,
    height: 38,
    padding: "0 16px",
    background: "linear-gradient(135deg,#6366F1,#818CF8)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    boxShadow: "0 4px 12px rgba(99,102,241,.3)"
  },
  ghostBtn: {
    height: 38,
    padding: "0 14px",
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#475569",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    whiteSpace: "nowrap"
  },
  dangerGhostBtn: {
    height: 34,
    padding: "0 12px",
    borderRadius: 9,
    border: "1px solid #FECACA",
    background: "#fff",
    color: "#DC2626",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6
  },
  miniBtn: {
    height: 28,
    padding: "0 10px",
    borderRadius: 8,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#475569",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap"
  },
  miniBtnOn: {
    height: 28,
    padding: "0 10px",
    borderRadius: 8,
    border: "1px solid #C7D2FE",
    background: "#EEF2FF",
    color: "#4F46E5",
    fontSize: 11.5,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap"
  },
  miniBtnPrimary: {
    height: 28,
    padding: "0 11px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg,#6366F1,#818CF8)",
    color: "#fff",
    fontSize: 11.5,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap"
  },
  tinyBtn: {
    height: 25,
    padding: "0 9px",
    borderRadius: 7,
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#4F46E5",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    whiteSpace: "nowrap"
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid #EEF0F7",
    background: "#fff",
    color: "#64748B",
    cursor: "pointer",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center"
  },
  emptyCell: { textAlign: "center", padding: "44px 16px", color: "#94A3B8", fontSize: 13.5, fontWeight: 600 }
};
