import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTaskSync } from "@/utils/hooks/useTaskSync";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUSES   = ["todo", "in_progress", "review", "completed", "blocked"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const TASK_TYPES = ["project", "sprint", "production", "manual"];

const STATUS_META = {
  todo:        { label: "To Do",       bg: "#F1F5F9", color: "#64748B", border: "#CBD5E1" },
  in_progress: { label: "In Progress", bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
  review:      { label: "Review",      bg: "#FEF3C7", color: "#B45309", border: "#FDE68A" },
  completed:   { label: "Completed",   bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0" },
  blocked:     { label: "Blocked",     bg: "#FEE2E2", color: "#DC2626", border: "#FCA5A5" },
};

const PRIORITY_META = {
  low:    { label: "Low",    bg: "#F0FDF4", color: "#16A34A" },
  medium: { label: "Medium", bg: "#EFF6FF", color: "#2563EB" },
  high:   { label: "High",   bg: "#FFFBEB", color: "#D97706" },
  urgent: { label: "Urgent", bg: "#FFF1F2", color: "#E11D48" },
};

const ACTION_META = {
  created:          { icon: "bi-plus-circle-fill",    color: "#6366F1", label: "created" },
  status_changed:   { icon: "bi-arrow-right-circle",  color: "#10B981", label: "updated status" },
  priority_changed: { icon: "bi-exclamation-circle",  color: "#F59E0B", label: "changed priority" },
  assigned:         { icon: "bi-person-fill-check",   color: "#3B82F6", label: "assigned" },
  reassigned:       { icon: "bi-person-fill-gear",    color: "#8B5CF6", label: "reassigned" },
  comment_added:    { icon: "bi-chat-fill",            color: "#6366F1", label: "commented on" },
  attachment_added: { icon: "bi-paperclip",            color: "#F59E0B", label: "attached file to" },
  completed:        { icon: "bi-check-circle-fill",   color: "#10B981", label: "completed" },
  blocked:          { icon: "bi-slash-circle-fill",   color: "#EF4444", label: "blocked" },
};

function fmtAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getEmpName(t) {
  const a = t.assignedTo;
  if (!a) return "Unassigned";
  if (a.personal?.firstName) return `${a.personal.firstName} ${a.personal.lastName || ""}`.trim();
  return a.email || "—";
}

function getInitials(name) {
  return name?.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";
}

const AVATAR_COLORS = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],
];
function avatarColor(name) { return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]; }

function isOverdue(t) {
  return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
}

/* ── Week dates helper ── */
function getThisWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0,0,0,0);
  return DAYS_SHORT.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const STAGE_COLORS = ["#F59E0B", "#6366F1", "#10B981", "#EC4899"];
const STAGE_NAMES_DEFAULT = ["Script/Concept", "Shoot/Design", "Edit/Develop", "Posted/Live"];

const STAGE_DEPT_KEYWORDS = [
  { include: ["content team"],                          exclude: [] },
  { include: ["production"],                            exclude: ["design", "creative"] },
  { include: ["editing team", "design team", "tech"],  exclude: [] },
  { include: ["digital marketing"],                     exclude: [] },
];

function filterByDept(employees, { include, exclude }) {
  return employees.filter(emp => {
    const dept  = (emp.professional?.department  || "").toLowerCase();
    const desig = (emp.professional?.designation || "").toLowerCase();
    if (exclude.some(kw => dept.includes(kw) || desig.includes(kw))) return false;
    return include.some(kw => dept.includes(kw));
  });
}

const freshStages = () => STAGE_NAMES_DEFAULT.map(name => ({ name, assignedTo: [], deadline: "" }));

const EMPTY_PROD_FORM  = { brandId: "", contentType: "reel", stages: freshStages() };
const EMPTY_GEN_FORM   = {
  title: "", description: "", priority: "medium",
  assignedTo: "", projectId: "", sprintId: "", dueDate: "", estimatedHours: "", brandId: "",
  brandingType: "",
};

const BRANDING_TYPES = [
  { key: "logo",         label: "Logo Design",        icon: "bi-pentagon-fill",     color: "#6366F1" },
  { key: "brandkit",     label: "Brand Kit",          icon: "bi-palette-fill",      color: "#EC4899" },
  { key: "social",       label: "Social Assets",      icon: "bi-images",            color: "#F59E0B" },
  { key: "presentation", label: "Presentations",      icon: "bi-easel-fill",        color: "#10B981" },
  { key: "print",        label: "Print / Collateral", icon: "bi-printer-fill",      color: "#8B5CF6" },
  { key: "motion",       label: "Motion Graphics",    icon: "bi-play-circle-fill",  color: "#EF4444" },
  { key: "web",          label: "Web Design",         icon: "bi-browser-chrome",    color: "#14B8A6" },
  { key: "other",        label: "Other",              icon: "bi-boxes",             color: "#94A3B8" },
];

const SEO_CATS = [
  { key: "blog",      label: "Blog Post",     icon: "bi-file-text",            color: "#6366F1", placeholder: "e.g. Top 10 Hotels in Goa (focus: hotels in goa)" },
  { key: "technical", label: "Technical SEO", icon: "bi-code-slash",           color: "#EF4444", placeholder: "e.g. Fix Core Web Vitals — LCP > 2.5s on homepage" },
  { key: "onpage",    label: "On-Page",        icon: "bi-file-earmark-richtext",color: "#3B82F6", placeholder: "e.g. Optimise homepage title tag & meta description" },
  { key: "offpage",   label: "Off-Page",       icon: "bi-link-45deg",           color: "#F59E0B", placeholder: "e.g. Guest post on travelblog.com" },
  { key: "backlinks", label: "Backlinks",       icon: "bi-arrow-left-right",     color: "#10B981", placeholder: "e.g. Build 5 DoFollow backlinks from DA40+ sites" },
];
const EMPTY_SEO_FORM = {
  seoCategory: "blog",
  title: "",
  primaryKeywords: "",        // blog
  pageUrls: [""],             // onpage — array of URL strings
  internalLinking: false,     // backlinks
  internalLinkingTask: "",
  externalLinking: false,
  externalLinkingTask: "",
  description: "",            // off-page / technical / notes
  priority: "medium",
  assignedTo: "",
  dueDate: "",
};

function seoDayName(dateStr) {
  if (!dateStr) return "";
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const d = new Date(dateStr);
  return `${days[d.getDay()]}, ${d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
}

// Returns "YYYY-MM-DD" for the next (or today's) occurrence of a short day name like "Mon"
function nextDateForDay(dayName) {
  const MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const target = MAP[dayName];
  if (target === undefined) return "";
  const today = new Date();
  let diff = target - today.getDay();
  if (diff < 0) diff += 7;
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result.toISOString().slice(0, 10);
}

const BLOG_SCHED_DAY_ORDER = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function TaskDashboard() {
  const router = useRouter();

  /* Data */
  const [stats,      setStats]      = useState(null);
  const [tasks,      setTasks]      = useState([]);
  const [activities, setActivities] = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [sprints,    setSprints]    = useState([]);
  const [adminUser,  setAdminUser]  = useState(null);

  /* UI */
  const [loading,              setLoading]              = useState(true);
  const [showCreate,           setShowCreate]           = useState(false);
  const [createMode,           setCreateMode]           = useState("production");
  const [submitting,           setSubmitting]           = useState(false);
  const [prodForm,             setProdForm]             = useState(EMPTY_PROD_FORM);
  const [genForm,              setGenForm]              = useState(EMPTY_GEN_FORM);
  const [nomenclaturePreview,  setNomenclaturePreview]  = useState("");
  const [nomenclatureLoading,  setNomenclatureLoading]  = useState(false);
  const [topBrandId,           setTopBrandId]           = useState("");
  const [webForm,              setWebForm]              = useState({
    title:"", description:"", priority:"medium", assignedTo:"",
    webTaskType:"feature", projectId:"", sprintId:"", dueDate:"", estimatedHours:"",
  });
  const [seoForm,              setSeoForm]              = useState(EMPTY_SEO_FORM);

  /* ── Auto-open create modal when ?create=1 or ?mode=<type> in URL ── */
  useEffect(() => {
    const { create, mode } = router.query;
    if (create === "1" || mode) {
      if (mode && ["seo","ads","branding","general"].includes(mode)) setCreateMode(mode);
      setShowCreate(true);
    }
  }, [router.query.create, router.query.mode]);

  /* ── Fetch all data on mount ── */
  useEffect(() => {
    Promise.all([
      fetch("/api/admin-users/me",          { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tasks/stats",        { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tasks?limit=200",    { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tasks/activity?limit=20", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/brands",             { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/assets/employees",   { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/projects",           { credentials: "include" }).then(r => r.json()),
    ]).then(([me, st, tk, ac, br, em, pr]) => {
      if (me.success) setAdminUser(me.user);
      if (st.success) setStats(st.stats);
      if (tk.success) setTasks(tk.tasks || []);
      if (ac.success) setActivities(ac.activities || []);
      if (br.success) setBrands(br.brands || []);
      if (em.success) setEmployees(em.employees || []);
      if (pr.success) setProjects(pr.projects || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  /* ── Auto-refresh tasks (socket + polling + tab visibility) ── */
  const refreshTasks = useCallback(() => {
    Promise.all([
      fetch("/api/admin/tasks?limit=200", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/tasks/stats",     { credentials: "include" }).then(r => r.json()),
    ]).then(([tk, st]) => {
      if (tk.success) setTasks(tk.tasks || []);
      if (st.success) setStats(st.stats);
    }).catch(() => {});
  }, []);
  useTaskSync(refreshTasks, { room: "admin-tasks" });

  /* ── Load sprints when project selected (general form) ── */
  useEffect(() => {
    if (!genForm.projectId) { setSprints([]); return; }
    fetch(`/api/admin/sprints?projectId=${genForm.projectId}`, { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setSprints(d.sprints || []); }).catch(() => {});
  }, [genForm.projectId]);

  /* ── Auto-fill blog due date from brand schedule ── */
  useEffect(() => {
    if (createMode !== "seo" || seoForm.seoCategory !== "blog" || seoForm.dueDate) return;
    const schedule = selectedBrand?.seoSettings?.blogSchedule || [];
    if (schedule.length === 0) return;
    const firstDay = BLOG_SCHED_DAY_ORDER.find(d => schedule.includes(d));
    if (!firstDay) return;
    const date = nextDateForDay(firstDay);
    if (date) setSeoForm(f => ({ ...f, dueDate: date }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createMode, seoForm.seoCategory, topBrandId]);

  /* ── Live nomenclature preview when brand or content type changes ── */
  useEffect(() => {
    if (!prodForm.brandId || !prodForm.contentType) { setNomenclaturePreview(""); return; }
    setNomenclatureLoading(true);
    fetch(`/api/admin/tasks/nomenclature?brandId=${prodForm.brandId}&contentType=${prodForm.contentType}`, {
      credentials: "include",
    })
      .then(r => r.json())
      .then(d => { if (d.success) setNomenclaturePreview(d.nomenclature); })
      .catch(() => {})
      .finally(() => setNomenclatureLoading(false));
  }, [prodForm.brandId, prodForm.contentType]);

  /* ── Derived stats ── */
  const byStatus = (key) => stats?.byStatus?.find(s => s._id === key)?.count || 0;
  const active   = byStatus("in_progress") + byStatus("review");
  const done     = byStatus("completed");
  const overdue  = stats?.overdue || 0;
  const atRisk   = tasks.filter(t => {
    if (!t.dueDate || t.status === "completed") return false;
    const daysLeft = (new Date(t.dueDate) - Date.now()) / 86400000;
    return daysLeft >= 0 && daysLeft <= 3;
  }).length;

  /* ── Brand-aware modal helpers ── */
  const selectedBrand = brands.find(b => b._id === topBrandId) || null;
  const brandServices = selectedBrand?.services || [];

  const dmEmployees = employees.filter(emp => {
    const dept  = (emp.professional?.department  || "").toLowerCase();
    const desig = (emp.professional?.designation || "").toLowerCase();
    return dept.includes("digital") || dept.includes("marketing") || dept.includes("seo") ||
           desig.includes("digital") || desig.includes("marketing") || desig.includes("seo");
  });

  const availableModes = useMemo(() => {
    if (!topBrandId) return [["production","🎬 Production"],["general","📝 General Task"]];
    const svc = selectedBrand?.services || [];
    return [
      ...(svc.includes("socialMedia") ? [["production","🎬 Social Media"]] : []),
      ...(svc.includes("website")     ? [["website",   "🌐 Website"]]      : []),
      ...(svc.includes("seo")         ? [["seo",       "🔍 SEO"]]          : []),
      ...(svc.includes("ads")         ? [["ads",       "📢 Ads"]]          : []),
      ...(svc.includes("branding")    ? [["branding",  "🎨 Branding"]]     : []),
      ["general","📝 General"],
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topBrandId, selectedBrand]);

  const availableContentTypes = useMemo(() => {
    const all = [["reel","Reel"],["post","Post"],["carousel","Carousel"],["story","Story"]];
    if (!selectedBrand) return all;
    const d = selectedBrand.monthlyDeliverables || {};
    const keyMap = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
    const withTarget = all.filter(([k]) => (d[keyMap[k]] || 0) > 0);
    return withTarget.length > 0 ? withTarget : all;
  }, [selectedBrand]);

  const handleBrandChange = (brandId) => {
    setTopBrandId(brandId);
    setProdForm(f => ({ ...f, brandId }));
    setGenForm(f => ({ ...f, brandId }));
    if (brandId) {
      const b = brands.find(b => b._id === brandId);
      const svc = b?.services || [];
      const modeKeys = [
        ...(svc.includes("socialMedia") ? ["production"] : []),
        ...(svc.includes("website")     ? ["website"]    : []),
        ...(svc.includes("seo")         ? ["seo"]        : []),
        ...(svc.includes("ads")         ? ["ads"]        : []),
        ...(svc.includes("branding")    ? ["branding"]   : []),
        "general",
      ];
      if (!modeKeys.includes(createMode)) setCreateMode(modeKeys[0]);
    } else {
      if (!["production","general"].includes(createMode)) setCreateMode("production");
    }
  };

  const SVC_LABELS = {
    socialMedia:"Social Media", website:"Website", seo:"SEO", ads:"Ads", branding:"Branding",
  };
  const SVC_COLORS = {
    socialMedia:["#EDE9FE","#7C3AED"], website:["#DBEAFE","#1D4ED8"],
    seo:["#D1FAE5","#065F46"], ads:["#FEF3C7","#B45309"], branding:["#FCE7F3","#BE185D"],
  };

  /* ── Daily output this week ── */
  const weekDates = getThisWeekDates();
  const dailyCounts = weekDates.map(date => {
    return tasks.filter(t => {
      const d = t.updatedAt || t.createdAt;
      if (!d) return false;
      const td = new Date(d);
      return td.toDateString() === date.toDateString();
    }).length;
  });

  const dailyChartData = {
    labels: DAYS_SHORT,
    datasets: [{
      data: dailyCounts,
      backgroundColor: dailyCounts.map((_, i) => {
        const today = new Date().getDay();
        const dayIdx = i === 6 ? 0 : i + 1;
        return dayIdx === today ? "#F59E0B" : "#6366F1";
      }),
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  /* ── Brand delivery this month ── */
  const now = new Date();
  const brandDelivery = useMemo(() => {
    return brands.map(brand => {
      const d = brand.monthlyDeliverables || {};
      const target = (d.reels || 0) + (d.posts || 0) + (d.carousels || 0) + (d.stories || 0);
      const done   = tasks.filter(t => {
        const bId = t.brandId?._id || t.brandId;
        if (String(bId) !== String(brand._id)) return false;
        if (t.status !== "completed") return false;
        const cd = new Date(t.updatedAt || t.createdAt);
        return cd.getMonth() === now.getMonth() && cd.getFullYear() === now.getFullYear();
      }).length;
      const pct = target > 0 ? Math.round(done / target * 100) : 0;
      return { brand, target, done, pct, d };
    }).filter(b => b.target > 0).sort((a, b) => b.pct - a.pct);
  }, [brands, tasks]);

  /* ── Today's top workloads ── */
  const todayStr = new Date().toDateString();
  const topWorkloads = useMemo(() => {
    return employees.map(emp => {
      const name    = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Employee";
      const myTasks = tasks.filter(t => String(t.assignedTo?._id || t.assignedTo) === String(emp._id));
      const today   = myTasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === todayStr);
      return { emp, name, total: myTasks.length, today: today.length };
    }).filter(e => e.total > 0).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [employees, tasks]);

  /* ── Create task ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let body = {};

      if (createMode === "production") {
        if (!prodForm.brandId)    { toast.error("Please select a brand");         setSubmitting(false); return; }
        if (!prodForm.contentType){ toast.error("Please select creative type");   setSubmitting(false); return; }
        const stageNames = ["S1 Script/Concept", "S2 Shoot/Design", "S3 Edit/Develop", "S4 Posted/Live"];
        for (let i = 0; i < prodForm.stages.length; i++) {
          const stg = prodForm.stages[i];
          if ((stg.assignedTo || []).length > 0 && !stg.deadline) {
            toast.error(`Deadline is required for ${stageNames[i]} (has assignees)`);
            setSubmitting(false); return;
          }
        }
        body = {
          taskType:       "production",
          brandId:        prodForm.brandId,
          contentType:    prodForm.contentType,
          stage:          "S1",
          stages:         prodForm.stages.map(s => ({
            name:       s.name,
            assignedTo: s.assignedTo || [],
            deadline:   s.deadline   || null,
          })),
          assignedById:   adminUser?._id,
          assignedByModel:"AdminUser",
          assignedByName: adminUser?.name || "Admin",
        };
      } else if (createMode === "website") {
        if (!webForm.title.trim()) { toast.error("Title is required"); setSubmitting(false); return; }
        if (!webForm.dueDate)      { toast.error("Deadline is required"); setSubmitting(false); return; }
        const wType = webForm.webTaskType;
        body = {
          title:          webForm.title,
          description:    webForm.description,
          priority:       webForm.priority,
          assignedTo:     webForm.assignedTo || null,
          taskType:       wType === "sprint" ? "sprint" : (wType === "feature" || wType === "page") ? "project" : "manual",
          brandId:        topBrandId || null,
          projectId:      webForm.projectId   || null,
          sprintId:       webForm.sprintId    || null,
          dueDate:        webForm.dueDate     || null,
          estimatedHours: webForm.estimatedHours ? Number(webForm.estimatedHours) : null,
          tags:           [wType],
          assignedById:   adminUser?._id,
          assignedByModel:"AdminUser",
          assignedByName: adminUser?.name || "Admin",
        };
      } else if (createMode === "seo") {
        if (!seoForm.title.trim() && !["offpage","technical"].includes(seoForm.seoCategory)) {
          toast.error("Title is required"); setSubmitting(false); return;
        }
        // Build structured description from category-specific fields
        let seoDesc = seoForm.description || "";
        let seoTitle = seoForm.title.trim();
        let pillarVal = "";
        if (seoForm.seoCategory === "blog") {
          pillarVal = seoForm.primaryKeywords;
          if (seoForm.primaryKeywords) seoDesc = `Primary Keywords: ${seoForm.primaryKeywords}${seoDesc ? "\n\n" + seoDesc : ""}`;
        } else if (seoForm.seoCategory === "onpage") {
          const urls = (seoForm.pageUrls || []).map(u => u.trim()).filter(Boolean);
          if (urls.length) seoDesc = `Pages:\n${urls.map(u => "• " + u).join("\n")}${seoDesc ? "\n\n" + seoDesc : ""}`;
        } else if (seoForm.seoCategory === "backlinks") {
          const parts = [];
          if (seoForm.internalLinking && seoForm.internalLinkingTask.trim()) parts.push(`Internal Linking:\n${seoForm.internalLinkingTask.trim()}`);
          if (seoForm.externalLinking && seoForm.externalLinkingTask.trim()) parts.push(`External Linking:\n${seoForm.externalLinkingTask.trim()}`);
          if (parts.length) seoDesc = parts.join("\n\n") + (seoDesc ? "\n\n" + seoDesc : "");
          if (!seoTitle) seoTitle = [seoForm.internalLinking && "Internal", seoForm.externalLinking && "External"].filter(Boolean).join(" & ") + " Linking Task";
        } else if (["offpage","technical"].includes(seoForm.seoCategory)) {
          if (!seoTitle) seoTitle = seoDesc.slice(0, 80) || (seoForm.seoCategory === "offpage" ? "Off-Page SEO Task" : "Technical SEO Task");
        }
        if (!seoTitle)                       { toast.error("Title is required");    setSubmitting(false); return; }
        if (!seoForm.dueDate && !adminUser) { toast.error("Deadline is required"); setSubmitting(false); return; }
        body = {
          title:          seoTitle,
          description:    seoDesc,
          pillar:         pillarVal,
          priority:       seoForm.priority,
          assignedTo:     seoForm.assignedTo || null,
          taskType:       "manual",
          brandId:        topBrandId || null,
          seoCategory:    seoForm.seoCategory,
          tags:           ["seo", seoForm.seoCategory],
          dueDate:        seoForm.dueDate || null,
          assignedById:   adminUser?._id,
          assignedByModel:"AdminUser",
          assignedByName: adminUser?.name || "Admin",
        };
      } else if (["ads","branding"].includes(createMode)) {
        if (!genForm.title.trim())              { toast.error("Title is required");    setSubmitting(false); return; }
        if (!genForm.dueDate && !adminUser)     { toast.error("Deadline is required"); setSubmitting(false); return; }
        body = {
          ...genForm,
          taskType:       "manual",
          brandId:        topBrandId || genForm.brandId || null,
          tags:           [createMode],
          contentType:    createMode === "branding" ? (genForm.brandingType || null) : undefined,
          assignedById:   adminUser?._id,
          assignedByModel:"AdminUser",
          assignedByName: adminUser?.name || "Admin",
        };
      } else {
        if (!genForm.title.trim())              { toast.error("Title is required");    setSubmitting(false); return; }
        if (!genForm.dueDate && !adminUser)     { toast.error("Deadline is required"); setSubmitting(false); return; }
        body = {
          ...genForm,
          taskType:       genForm.taskType || "manual",
          brandId:        topBrandId || genForm.brandId || null,
          assignedById:   adminUser?._id,
          assignedByModel:"AdminUser",
          assignedByName: adminUser?.name || "Admin",
        };
      }

      const res  = await fetch("/api/admin/tasks", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Task created! ${data.task?.nomenclature ? `(${data.task.nomenclature})` : ""}`);
        setShowCreate(false);
        setTopBrandId("");
        setProdForm({ brandId: "", contentType: "reel", stages: freshStages() });
        setGenForm(EMPTY_GEN_FORM);
        setWebForm({ title:"", description:"", priority:"medium", assignedTo:"", webTaskType:"feature", projectId:"", sprintId:"", dueDate:"", estimatedHours:"" });
        setSeoForm(EMPTY_SEO_FORM);
        setNomenclaturePreview("");
        fetch("/api/admin/tasks?limit=200", { credentials: "include" })
          .then(r => r.json()).then(d => { if (d.success) setTasks(d.tasks || []); });
        fetch("/api/admin/tasks/stats", { credentials: "include" })
          .then(r => r.json()).then(d => { if (d.success) setStats(d.stats); });
      } else {
        console.error("[create-task] API error:", data);
        toast.error(data.message || "Failed to create task");
      }
    } catch (err) {
      console.error("[create-task] Exception:", err);
      toast.error("Network error — check console");
    }
    finally { setSubmitting(false); }
  };

  /* ─── Render ─── */
  return (
    <>
    <div className="leaves-management-admin">
      <Head>
        <title>Dashboard — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .tmd-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
          .tmd-btn { border:none; cursor:pointer; border-radius:10px; padding:8px 18px; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px; transition:all .15s; }
          .tmd-btn-primary { background:#4F46E5; color:#fff; }
          .tmd-btn-primary:hover { background:#4338CA; }
          .tmd-btn-ghost { background:#F1F5F9; color:#475569; }
          .tmd-btn-ghost:hover { background:#E2E8F0; }
          .tmd-input { padding:8px 12px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; width:100%; background:#fff; }
          .tmd-input:focus { border-color:#6366F1; }
          .tmd-select { padding:8px 12px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; width:100%; background:#fff; cursor:pointer; }
          .tmd-overlay { position:fixed; inset:0; background:rgba(15,15,35,.55); backdrop-filter:blur(4px); z-index:1050; display:flex; align-items:stretch; justify-content:flex-end; }
          .tmd-drawer { background:#fff; width:740px; max-width:100vw; height:100vh; display:flex; flex-direction:column; box-shadow:-10px 0 60px rgba(0,0,0,.2); animation:drawerSlideIn .22s cubic-bezier(.4,0,.2,1); }
          @keyframes drawerSlideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
          .tmd-drawer-header { padding:18px 26px; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #F1F5F9; flex-shrink:0; }
          .tmd-drawer-body { flex:1; overflow-y:auto; padding:22px 26px; }
          .tmd-drawer-footer { padding:14px 26px; display:flex; gap:8px; justify-content:flex-end; border-top:1.5px solid #F1F5F9; flex-shrink:0; background:#fff; }
          .stat-mega { background:#fff; border-radius:18px; border:1.5px solid #F1F5F9; padding:24px 28px; flex:1; min-width:160px; transition:box-shadow .15s; }
          .stat-mega:hover { box-shadow:0 8px 30px rgba(0,0,0,.07); }
          .stat-num { font-size:48px; font-weight:900; line-height:1; margin-bottom:6px; }
          .stat-sub { font-size:12px; font-weight:600; color:#64748B; }
          .stat-trend { font-size:11px; font-weight:700; display:inline-flex; align-items:center; gap:3px; margin-top:6px; }
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(15,23,42,.12); }
          .panel-card { background:#fff; border-radius:18px; border:1.5px solid #F1F5F9; padding:22px 24px; }
          .act-row { display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-bottom:1px solid #F8FAFC; }
          .act-row:last-child { border:none; }
          .act-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:5px; }
          .brand-del-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #F8FAFC; }
          .brand-del-row:last-child { border:none; }
          .brand-bar { height:6px; border-radius:4px; background:#F1F5F9; overflow:hidden; flex:1; }
          .brand-bar-fill { height:100%; border-radius:4px; }
          .wl-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #F8FAFC; }
          .wl-row:last-child { border:none; }
          .tmd-avatar { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; flex-shrink:0; }
          .alert-bar { background:linear-gradient(135deg,#FFFBEB,#FEF3C7); border:1.5px solid #FDE68A; border-radius:14px; padding:14px 20px; display:flex; align-items:center; gap:12px; margin-bottom:22px; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard"><img src="/icons/home.svg" alt="" /> Home</Link>
                </li>
                <li className="breadcrumb-item active">Task Management</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* ── Page header ── */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 22 }}>
                <div>
                  <h5 className="admin-main-heading">Dashboard</h5>
                  <p style={{ fontSize: 13, color: "#64748B" }}>Real-time overview of all operations</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Link href="/dashboard/admin/tasks/list">
                    <button className="tmd-btn tmd-btn-ghost" style={{ fontSize: 12 }}>
                      <i className="bi bi-list-task" /> View All Tasks
                    </button>
                  </Link>
                  <button className="tmd-btn tmd-btn-primary" onClick={() => setShowCreate(true)}>
                    <i className="bi bi-plus-circle-fill" /> New Task
                  </button>
                </div>
              </div>

              {/* ── Alert bar ── */}
              {!loading && overdue > 0 && (
                <div className="alert-bar">
                  <i className="bi bi-exclamation-triangle-fill" style={{ color: "#B45309", fontSize: 18, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, color: "#B45309" }}>{overdue} tasks overdue</span>
                    <span style={{ color: "#64748B", fontSize: 13 }}> across {brands.length} brands. Please review and reassign.</span>
                  </div>
                  <Link href="/dashboard/admin/tasks/list?status=blocked">
                    <button className="tmd-btn" style={{ padding: "6px 14px", background: "#FDE68A", color: "#B45309", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 8, cursor: "pointer" }}>
                      Review →
                    </button>
                  </Link>
                </div>
              )}

              {/* ── Summary cards (same card design as the other dashboards) ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
                {[
                  { label: "Active Tasks", value: active,  sub: "In progress + review", foot: `${stats?.total || 0} total tasks`,             icon: "bi-list-task",              accent: { bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" } },
                  { label: "Completed",    value: done,    sub: "Tasks done",           foot: `${stats?.completionRate || 0}% on-time rate`,  icon: "bi-check-circle-fill",      accent: { bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)"  } },
                  { label: "At Risk",      value: atRisk,  sub: "Due within 3 days",    foot: "Need action this week",                        icon: "bi-exclamation-circle-fill", accent: { bg: "#FFEDD5", icon: "#EA580C", shadow: "rgba(249,115,22,.18)" } },
                  { label: "Overdue",      value: overdue, sub: "Past due date",        foot: "Auto-escalated",                               icon: "bi-x-circle-fill",          accent: { bg: "#FEE2E2", icon: "#EF4444", shadow: "rgba(239,68,68,.18)"  } },
                ].map((c) => {
                  const total = stats?.total || 0;
                  const pct = total ? Math.min(100, Math.round((c.value / total) * 100)) : 0;
                  return (
                    <div key={c.label} className="kpi-card" style={{
                      background: `linear-gradient(160deg, #fff 55%, ${c.accent.bg} 165%)`,
                      borderRadius: 16, border: `1px solid ${c.accent.bg}`,
                      boxShadow: "0 3px 12px rgba(15,23,42,.06)", padding: "17px 18px 16px",
                      position: "relative", overflow: "hidden",
                    }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c.accent.icon }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                          background: c.accent.icon,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: `0 6px 16px ${c.accent.shadow}`,
                        }}>
                          <i className={`bi ${c.icon}`} style={{ fontSize: 19, color: "#fff" }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1.05, letterSpacing: "-0.8px" }}>
                            {loading ? "—" : c.value}
                          </div>
                          <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 3, whiteSpace: "nowrap" }}>{c.label}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
                        {c.sub} · <span style={{ color: c.accent.icon, fontWeight: 700 }}>{c.foot}</span>
                      </div>
                      <div style={{ height: 6, background: "#F1F5F9", borderRadius: 6 }}>
                        <div style={{ height: 6, width: `${pct}%`, borderRadius: 6, background: c.accent.icon, transition: "width .4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Middle row: Daily Output + Live Activity ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, marginBottom: 20 }}>

                {/* Daily Output chart */}
                <div className="panel-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B" }}>Daily Output This Week</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>Tasks updated per day</div>
                    </div>
                    <span style={{ background: "#ECFDF5", color: "#10B981", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block", marginRight: 5 }} />
                      Live
                    </span>
                  </div>
                  <div style={{ height: 220 }}>
                    {loading ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8" }}>
                        <div className="spinner-border spinner-border-sm text-primary" />
                      </div>
                    ) : (
                      <Bar
                        data={dailyChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: ctx => ` ${ctx.raw} tasks` } },
                          },
                          scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 12, weight: "600" }, color: "#94A3B8" } },
                            y: { beginAtZero: true, grid: { color: "#F1F5F9" }, ticks: { stepSize: 1, font: { size: 11 }, color: "#CBD5E1" } },
                          },
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Live Activity feed */}
                <div className="panel-card" style={{ overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B" }}>Live Activity</div>
                    <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1", display: "inline-block", marginRight: 5 }} />
                      Real-time
                    </span>
                  </div>

                  <div style={{ overflowY: "auto", maxHeight: 260 }}>
                    {loading ? (
                      <div style={{ padding: 20, textAlign: "center", color: "#94A3B8" }}>
                        <div className="spinner-border spinner-border-sm text-primary" />
                      </div>
                    ) : activities.length === 0 ? (
                      <div style={{ padding: "20px 0", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                        <i className="bi bi-activity" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                        No activity yet
                      </div>
                    ) : (
                      activities.map((act, i) => {
                        const meta = ACTION_META[act.action] || { icon: "bi-dot", color: "#94A3B8", label: act.action };
                        const taskName = act.taskId?.nomenclature || act.taskId?.title || "a task";
                        return (
                          <div key={act._id || i} className="act-row">
                            <div className="act-dot" style={{ background: meta.color }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 700, color: meta.color }}>{act.performedByName || "Someone"}</span>
                                {" "}{meta.label}{" "}
                                <span style={{ fontWeight: 600, color: "#1E293B" }}>{taskName}</span>
                                {act.to && <span style={{ color: "#94A3B8" }}> → {act.to}</span>}
                              </div>
                              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{fmtAgo(act.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* ── Bottom row: Brand Delivery + Top Workloads ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                {/* Brand Delivery */}
                <div className="panel-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B" }}>Brand Delivery — This Month</div>
                    <Link href="/dashboard/admin/tasks/brands">
                      <span style={{ fontSize: 12, color: "#6366F1", fontWeight: 700, cursor: "pointer" }}>Manage Brands →</span>
                    </Link>
                  </div>

                  {loading ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#94A3B8" }}>
                      <div className="spinner-border spinner-border-sm text-primary" />
                    </div>
                  ) : brandDelivery.length === 0 ? (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#94A3B8" }}>
                      <i className="bi bi-bookmark-x" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                      <div style={{ fontSize: 13 }}>No brands with targets configured</div>
                      <Link href="/dashboard/admin/tasks/brands">
                        <button className="tmd-btn tmd-btn-primary" style={{ marginTop: 12, fontSize: 12 }}>
                          <i className="bi bi-plus" /> Add Brand
                        </button>
                      </Link>
                    </div>
                  ) : (
                    brandDelivery.slice(0, 6).map(({ brand, target, done: bd, pct, d }) => (
                      <div key={brand._id} className="brand-del-row">
                        {/* Brand avatar */}
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: (brand.color || "#6366F1") + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: brand.color || "#6366F1", flexShrink: 0 }}>
                          {brand.name?.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Brand info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 12, color: "#1E293B" }}>{brand.name}</span>
                              <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 6 }}>
                                {d.reels > 0 && `${d.reels}R `}{d.posts > 0 && `${d.posts}P `}{d.carousels > 0 && `${d.carousels}C`}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444" }}>{pct}%</span>
                              <span style={{ fontSize: 10, color: "#94A3B8" }}>{bd}/{target}</span>
                            </div>
                          </div>
                          <div className="brand-bar">
                            <div className="brand-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444" }} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Today · Top Workloads */}
                <div className="panel-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B" }}>Today · Top Workloads</div>
                    <Link href="/dashboard/admin/tasks/my-team">
                      <span style={{ fontSize: 12, color: "#6366F1", fontWeight: 700, cursor: "pointer" }}>My Team →</span>
                    </Link>
                  </div>

                  {loading ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#94A3B8" }}>
                      <div className="spinner-border spinner-border-sm text-primary" />
                    </div>
                  ) : topWorkloads.length === 0 ? (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#94A3B8" }}>
                      <i className="bi bi-people" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                      <div style={{ fontSize: 13 }}>No tasks assigned yet</div>
                    </div>
                  ) : (
                    topWorkloads.map(({ emp, name, total, today }) => {
                      const [bg, fg] = avatarColor(name);
                      return (
                        <div key={emp._id} className="wl-row">
                          <div className="tmd-avatar" style={{ background: bg, color: fg }}>{getInitials(name)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: "#1E293B" }}>{name}</div>
                            <div style={{ fontSize: 10, color: "#94A3B8" }}>
                              {emp.professional?.designation || emp.professional?.department || "Team member"}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#4F46E5" }}>{total}</div>
                            {today > 0 && (
                              <div style={{ fontSize: 10, color: "#EF4444", fontWeight: 700 }}>{today} due today</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </section>
        </div>
      </div>

      {/* ════ CREATE TASK MODAL ════ */}
      {showCreate && (() => {
        const closeModal = () => {
          setShowCreate(false);
          setTopBrandId("");
          setNomenclaturePreview("");
          setProdForm({ brandId: "", contentType: "reel", stages: freshStages() });
          setGenForm(EMPTY_GEN_FORM);
          setWebForm({ title:"", description:"", priority:"medium", assignedTo:"", webTaskType:"feature", projectId:"", sprintId:"", dueDate:"", estimatedHours:"" });
          setSeoForm(EMPTY_SEO_FORM);
        };
        const LBL = { fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 };
        return (
          <div className="tmd-overlay" onClick={closeModal}>
            <div className="tmd-drawer" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="tmd-drawer-header">
                <div>
                  <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0, fontSize: 16 }}>+ New Task</h5>
                  {selectedBrand && <div style={{ fontSize: 12, color: "#6366F1", marginTop: 2, fontWeight: 600 }}>{selectedBrand.name}</div>}
                </div>
                <button className="tmd-btn tmd-btn-ghost" style={{ padding: "5px 9px" }} onClick={closeModal}>
                  <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
                </button>
              </div>

              <div className="tmd-drawer-body">

                {/* ── STEP 1: Brand selector ── */}
                <div style={{ marginBottom: 16 }}>
                  <label style={LBL}>Brand <span style={{ fontWeight: 400, color: "#94A3B8", textTransform: "none", fontSize: 10 }}>(select to see available task types)</span></label>
                  <select className="tmd-select" value={topBrandId} onChange={e => handleBrandChange(e.target.value)}>
                    <option value="">— No specific brand —</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  {/* Service badges */}
                  {selectedBrand?.services?.length > 0 && (
                    <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                      {selectedBrand.services.map(s => {
                        const [bg, fg] = SVC_COLORS[s] || ["#F1F5F9","#475569"];
                        return (
                          <span key={s} style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>
                            {SVC_LABELS[s] || s}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── STEP 2: Mode tabs (dynamic) ── */}
                <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "#F8FAFC", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
                  {availableModes.map(([mode, label]) => (
                    <button key={mode} type="button" onClick={() => setCreateMode(mode)}
                      style={{ flex: 1, minWidth: 90, padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                        background: createMode === mode ? "#fff" : "transparent",
                        color:      createMode === mode ? "#4F46E5" : "#64748B",
                        boxShadow:  createMode === mode ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                        transition: "all .15s",
                      }}>
                      {label}
                    </button>
                  ))}
                </div>

                <form id="create-task-form" onSubmit={handleCreate}>

                  {/* ══ PRODUCTION (Social Media) ══ */}
                  {createMode === "production" && (<>
                    {/* Info banner */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                      <span style={{ fontSize: 16 }}>🤖</span>
                      <div style={{ fontSize: 12, color: "#4338CA", lineHeight: 1.5 }}>ID + nomenclature auto-generated. Each stage has its own deadline &amp; assignee.</div>
                    </div>

                    {/* Creative Type */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={LBL}>Creative Type</label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {availableContentTypes.map(([val, lbl]) => {
                          const active = prodForm.contentType === val;
                          const CTYPE_COLORS = { reel:"#7C3AED", post:"#1D4ED8", carousel:"#B45309", story:"#065F46" };
                          return (
                            <button key={val} type="button" onClick={() => setProdForm(f => ({ ...f, contentType: val }))}
                              style={{ padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${active ? CTYPE_COLORS[val] : "#E5E7EB"}`,
                                background: active ? CTYPE_COLORS[val] + "18" : "#fff",
                                color: active ? CTYPE_COLORS[val] : "#374151",
                                fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .15s",
                              }}>
                              {lbl}
                              {selectedBrand && (() => {
                                const d = selectedBrand.monthlyDeliverables || {};
                                const keyMap = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
                                const target = d[keyMap[val]] || 0;
                                return target > 0 ? <span style={{ marginLeft: 5, fontSize: 10, opacity: .7 }}>×{target}</span> : null;
                              })()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Auto-generated preview */}
                    {topBrandId && (
                      <div style={{ background: "#F8FAFC", borderRadius: 8, borderLeft: "3px solid #6366F1", padding: "10px 14px", marginBottom: 18 }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Auto-generated</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 6 }}>
                          <div>
                            <div style={{ fontSize: 10, color: "#94A3B8" }}>Task ID</div>
                            <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#6366F1", fontSize: 15 }}>
                              {nomenclatureLoading ? "…" : nomenclaturePreview || "—"}
                            </div>
                          </div>
                          {nomenclaturePreview && (
                            <div>
                              <div style={{ fontSize: 10, color: "#94A3B8" }}>Stage</div>
                              <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#F59E0B", fontSize: 13 }}>S1 → active</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stage assignments */}
                    <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "#4F46E5", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="bi bi-journal-text" /> Stage assignments + per-stage deadlines
                      </div>
                      {prodForm.stages.map((stg, i) => (
                        <div key={i} style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: STAGE_COLORS[i], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                            <input type="text" className="tmd-input" value={stg.name} style={{ flex: 1, padding: "5px 10px", fontSize: 13 }}
                              onChange={e => setProdForm(f => { const stages = [...f.stages]; stages[i] = { ...stages[i], name: e.target.value }; return { ...f, stages }; })} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                                Assignees · {["Content","Production/Design","Editing","Digital Mktg"][i]} team
                              </label>
                              <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, maxHeight: 120, overflowY: "auto", background: "#fff" }}>
                                {filterByDept(employees, STAGE_DEPT_KEYWORDS[i]).map((emp, ei) => {
                                  const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                                  const checked = (stg.assignedTo || []).includes(emp._id);
                                  return (
                                    <label key={emp._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", borderBottom: ei < filterByDept(employees, STAGE_DEPT_KEYWORDS[i]).length - 1 ? "1px solid #F1F5F9" : "none", background: checked ? STAGE_COLORS[i] + "12" : "transparent" }}>
                                      <input type="checkbox" checked={checked} style={{ accentColor: STAGE_COLORS[i], width: 14, height: 14 }}
                                        onChange={e => setProdForm(f => { const stages = [...f.stages]; const curr = stages[i].assignedTo || []; stages[i] = { ...stages[i], assignedTo: e.target.checked ? [...curr, emp._id] : curr.filter(id => id !== emp._id) }; return { ...f, stages }; })} />
                                      <span style={{ fontSize: 12, color: checked ? "#1E293B" : "#374151", fontWeight: checked ? 700 : 400 }}>{n || "Employee"}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                                Deadline {(stg.assignedTo || []).length > 0 && <span style={{ color: "#EF4444" }}>*</span>}
                              </label>
                              <input type="datetime-local" className="tmd-input" value={stg.deadline}
                                style={{ borderColor: ((stg.assignedTo || []).length > 0 && !stg.deadline) ? "#FCA5A5" : "" }}
                                onChange={e => setProdForm(f => { const stages = [...f.stages]; stages[i] = { ...stages[i], deadline: e.target.value }; return { ...f, stages }; })} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>)}

                  {/* ══ WEBSITE ══ */}
                  {createMode === "website" && (
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 16, padding: "32px 20px", textAlign: "center",
                      background: "#F0F9FF", border: "1.5px dashed #BAE6FD", borderRadius: 12,
                    }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="bi bi-code-slash" style={{ fontSize: 24, color: "#1D4ED8" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                          Use the Web Development Projects page
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, maxWidth: 340 }}>
                          Web development tasks (features, sprints, bug fixes) are managed through the dedicated Projects page where you can assign to the right project and sprint.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard/admin/tasks/projects")}
                        style={{
                          padding: "10px 22px", borderRadius: 9, border: "none",
                          background: "#1D4ED8", color: "#fff", fontWeight: 700,
                          fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                        }}
                      >
                        <i className="bi bi-arrow-right-circle" />
                        Go to Web Dev Projects
                      </button>
                    </div>
                  )}

                  {/* ══ SEO (dedicated form) ══ */}
                  {createMode === "seo" && (() => {
                    const cat = SEO_CATS.find(c => c.key === seoForm.seoCategory) || SEO_CATS[0];
                    const isBlog      = seoForm.seoCategory === "blog";
                    const isOnPage    = seoForm.seoCategory === "onpage";
                    const isOffPage   = seoForm.seoCategory === "offpage";
                    const isTechnical = seoForm.seoCategory === "technical";
                    const isBacklinks = seoForm.seoCategory === "backlinks";

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {/* Category pills */}
                        <div>
                          <label style={LBL}>SEO Category</label>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {SEO_CATS.map(c => {
                              const active = seoForm.seoCategory === c.key;
                              return (
                                <button key={c.key} type="button"
                                  onClick={() => setSeoForm(f => ({ ...EMPTY_SEO_FORM, seoCategory: c.key, priority: f.priority, assignedTo: f.assignedTo, dueDate: c.key === "blog" ? "" : f.dueDate }))}
                                  style={{ padding: "6px 13px", borderRadius: 8, border: `1.5px solid ${active ? c.color : "#E5E7EB"}`,
                                    background: active ? c.color + "18" : "#fff", color: active ? c.color : "#374151",
                                    fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all .15s" }}>
                                  <i className={`bi ${c.icon}`} />{c.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Context banner */}
                        <div style={{ background: cat.color + "0D", border: `1px solid ${cat.color}40`, borderRadius: 10, padding: "9px 13px", fontSize: 12, color: "#374151", display: "flex", gap: 8, alignItems: "center" }}>
                          <i className={`bi ${cat.icon}`} style={{ color: cat.color }} />
                          <span><strong>{cat.label}</strong> task for <strong>{selectedBrand?.name || "this brand"}</strong>
                          {selectedBrand?.seoSettings?.blogCount > 0 && isBlog && <span style={{ color: cat.color, fontWeight: 600 }}> · Target: {selectedBrand.seoSettings.blogCount} blogs/mo</span>}
                          </span>
                        </div>

                        {/* ── BLOG fields ── */}
                        {isBlog && (
                          <>
                            <div>
                              <label style={LBL}>Blog Title <span style={{ color: "#EF4444" }}>*</span></label>
                              <input className="tmd-input" placeholder="e.g. Top 10 Hotels in Goa"
                                value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div>
                              <label style={LBL}>Primary Keywords</label>
                              <input className="tmd-input" placeholder="e.g. hotels in goa, best hotels goa"
                                value={seoForm.primaryKeywords} onChange={e => setSeoForm(f => ({ ...f, primaryKeywords: e.target.value }))} />
                            </div>
                          </>
                        )}

                        {/* ── ON-PAGE fields ── */}
                        {isOnPage && (
                          <>
                            <div>
                              <label style={LBL}>Task Title <span style={{ color: "#EF4444" }}>*</span></label>
                              <input className="tmd-input" placeholder="e.g. Optimise homepage meta tags"
                                value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <label style={LBL}>Page URLs</label>
                                <button type="button" onClick={() => setSeoForm(f => ({ ...f, pageUrls: [...(f.pageUrls || [""]), ""] }))}
                                  style={{ background: "#EEF2FF", color: "#4F46E5", border: "1.5px solid #C7D2FE", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                  + Add URL
                                </button>
                              </div>
                              {(seoForm.pageUrls || [""]).map((url, i) => (
                                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                  <input className="tmd-input" placeholder={`https://example.com/page-${i + 1}`}
                                    value={url} onChange={e => {
                                      const urls = [...(seoForm.pageUrls || [""])];
                                      urls[i] = e.target.value;
                                      setSeoForm(f => ({ ...f, pageUrls: urls }));
                                    }} />
                                  {(seoForm.pageUrls || []).length > 1 && (
                                    <button type="button" onClick={() => setSeoForm(f => ({ ...f, pageUrls: (f.pageUrls || []).filter((_, idx) => idx !== i) }))}
                                      style={{ background: "#FEF2F2", color: "#DC2626", border: "1.5px solid #FECACA", borderRadius: 7, padding: "0 9px", cursor: "pointer", fontSize: 13 }}>
                                      <i className="bi bi-x-lg" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* ── OFF-PAGE fields ── */}
                        {isOffPage && (
                          <>
                            <div>
                              <label style={LBL}>Task Title</label>
                              <input className="tmd-input" placeholder="e.g. Guest post on travelblog.com"
                                value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div>
                              <label style={LBL}>Task Description <span style={{ color: "#EF4444" }}>*</span></label>
                              <textarea className="tmd-input" style={{ height: 90, resize: "vertical" }}
                                placeholder="Describe the off-page task — target sites, strategy, deliverables…"
                                value={seoForm.description} onChange={e => setSeoForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                          </>
                        )}

                        {/* ── TECHNICAL SEO fields ── */}
                        {isTechnical && (
                          <>
                            <div>
                              <label style={LBL}>Task Title</label>
                              <input className="tmd-input" placeholder="e.g. Fix Core Web Vitals — LCP > 2.5s"
                                value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div>
                              <label style={LBL}>Task Description <span style={{ color: "#EF4444" }}>*</span></label>
                              <textarea className="tmd-input" style={{ height: 90, resize: "vertical" }}
                                placeholder="Describe the technical issue or audit task — what to fix, tools to use, acceptance criteria…"
                                value={seoForm.description} onChange={e => setSeoForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                          </>
                        )}

                        {/* ── BACKLINKS fields ── */}
                        {isBacklinks && (
                          <>
                            <div>
                              <label style={LBL}>Task Title</label>
                              <input className="tmd-input" placeholder="e.g. Build 5 DoFollow backlinks from DA40+ sites"
                                value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            {/* Internal Linking */}
                            <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: seoForm.internalLinking ? "#059669" : "#374151", marginBottom: seoForm.internalLinking ? 10 : 0 }}>
                                <input type="checkbox" checked={seoForm.internalLinking}
                                  onChange={e => setSeoForm(f => ({ ...f, internalLinking: e.target.checked }))}
                                  style={{ accentColor: "#059669", width: 15, height: 15 }} />
                                Internal Linking
                              </label>
                              {seoForm.internalLinking && (
                                <textarea className="tmd-input" style={{ height: 72, resize: "vertical" }}
                                  placeholder="Describe internal linking task — source pages, target pages, anchor text strategy…"
                                  value={seoForm.internalLinkingTask} onChange={e => setSeoForm(f => ({ ...f, internalLinkingTask: e.target.value }))} />
                              )}
                            </div>
                            {/* External Linking */}
                            <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: seoForm.externalLinking ? "#4F46E5" : "#374151", marginBottom: seoForm.externalLinking ? 10 : 0 }}>
                                <input type="checkbox" checked={seoForm.externalLinking}
                                  onChange={e => setSeoForm(f => ({ ...f, externalLinking: e.target.checked }))}
                                  style={{ accentColor: "#4F46E5", width: 15, height: 15 }} />
                                External Linking
                              </label>
                              {seoForm.externalLinking && (
                                <textarea className="tmd-input" style={{ height: 72, resize: "vertical" }}
                                  placeholder="Describe external linking task — target domains, outreach plan, anchor text…"
                                  value={seoForm.externalLinkingTask} onChange={e => setSeoForm(f => ({ ...f, externalLinkingTask: e.target.value }))} />
                              )}
                            </div>
                          </>
                        )}

                        {/* Priority + Assigned To */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={LBL}>Priority</label>
                            <select className="tmd-select" value={seoForm.priority} onChange={e => setSeoForm(f => ({ ...f, priority: e.target.value }))}>
                              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={LBL}>Assigned To <span style={{ color: "#10B981", fontWeight: 400, textTransform: "none", fontSize: 10 }}>(Digital Marketing)</span></label>
                            <select className="tmd-select" value={seoForm.assignedTo} onChange={e => setSeoForm(f => ({ ...f, assignedTo: e.target.value }))}>
                              <option value="">Unassigned</option>
                              {(dmEmployees.length > 0 ? dmEmployees : employees).map(emp => {
                                const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                                return <option key={emp._id} value={emp._id}>{n || "Employee"}</option>;
                              })}
                            </select>
                          </div>
                        </div>

                        {/* Due Date / Deadline with day display */}
                        <div>
                          <label style={LBL}>Due Date / Deadline</label>
                          <input type="date" className="tmd-input" value={seoForm.dueDate}
                            disabled={!!adminUser}
                            style={{ opacity: adminUser ? 0.6 : 1, cursor: adminUser ? "not-allowed" : "auto" }}
                            onChange={e => setSeoForm(f => ({ ...f, dueDate: e.target.value }))} />
                          {adminUser && <div style={{ fontSize:11, color:"#94A3B8", marginTop:3, display:"flex", alignItems:"center", gap:4 }}><i className="bi bi-lock-fill" style={{fontSize:9}} /> Admin only</div>}
                          {seoForm.dueDate && (
                            <div style={{ fontSize: 11, color: "#4F46E5", fontWeight: 700, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
                              <i className="bi bi-calendar-check" />
                              {seoDayName(seoForm.dueDate)}
                            </div>
                          )}
                          {/* Blog-only: quick-select schedule days */}
                          {isBlog && (selectedBrand?.seoSettings?.blogSchedule || []).length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 5 }}>
                                Brand schedule — pick a day
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {BLOG_SCHED_DAY_ORDER.filter(d => (selectedBrand.seoSettings.blogSchedule || []).includes(d)).map(day => {
                                  const date = nextDateForDay(day);
                                  const isSelected = seoForm.dueDate === date;
                                  return (
                                    <button key={day} type="button"
                                      onClick={() => setSeoForm(f => ({ ...f, dueDate: date }))}
                                      style={{
                                        padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                                        background: isSelected ? "#6366F1" : "#EEF2FF",
                                        color: isSelected ? "#fff" : "#4F46E5",
                                        border: `1.5px solid ${isSelected ? "#6366F1" : "#C7D2FE"}`,
                                        transition: "all .12s",
                                      }}>
                                      {day} · {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notes (blog, on-page, backlinks only show this as extra notes) */}
                        {(isBlog || isOnPage || isBacklinks) && (
                          <div>
                            <label style={LBL}>Notes</label>
                            <textarea className="tmd-input" style={{ height: 60, resize: "vertical" }}
                              placeholder="Additional notes, references, acceptance criteria…"
                              value={seoForm.description} onChange={e => setSeoForm(f => ({ ...f, description: e.target.value }))} />
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ══ ADS / BRANDING — shared general form with context banner ══ */}
                  {["ads","branding"].includes(createMode) && (() => {
                    const banners = {
                      ads:      { bg:"#FFFBEB", border:"#FDE68A", icon:"📢", text:`Ad task for ${selectedBrand?.name || "this brand"}. Platforms: ${selectedBrand?.adsSettings?.platforms?.join(", ") || "TBD"}.` },
                      branding: { bg:"#FDF2F8", border:"#F9A8D4", icon:"🎨", text:`Branding task for ${selectedBrand?.name || "this brand"}.` },
                    };
                    const b = banners[createMode];
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ background: b.bg, border: `1px solid ${b.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", display: "flex", gap: 8 }}>
                          <span>{b.icon}</span> {b.text}
                        </div>

                        {/* Branding category chips */}
                        {createMode === "branding" && (
                          <div>
                            <label style={LBL}>Category</label>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                              {BRANDING_TYPES.map(bt => {
                                const active = genForm.brandingType === bt.key;
                                return (
                                  <button key={bt.key} type="button"
                                    onClick={() => setGenForm(f => ({ ...f, brandingType: active ? "" : bt.key }))}
                                    style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 11px", borderRadius:9, fontSize:11, fontWeight:700, cursor:"pointer", transition:"all .12s",
                                      background: active ? bt.color + "20" : "#F8FAFC",
                                      color: active ? bt.color : "#64748B",
                                      border: `1.5px solid ${active ? bt.color : "#E5E7EB"}` }}>
                                    <i className={`bi ${bt.icon}`} style={{ fontSize:11 }} />
                                    {bt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div>
                          <label style={LBL}>Title <span style={{ color: "#EF4444" }}>*</span></label>
                          <input className="tmd-input" placeholder="Task title" value={genForm.title}
                            onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={LBL}>Priority</label>
                            <select className="tmd-select" value={genForm.priority} onChange={e => setGenForm(f => ({ ...f, priority: e.target.value }))}>
                              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={LBL}>Assigned To</label>
                            <select className="tmd-select" value={genForm.assignedTo} onChange={e => setGenForm(f => ({ ...f, assignedTo: e.target.value }))}>
                              <option value="">Unassigned</option>
                              {employees.map(emp => {
                                const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                                return <option key={emp._id} value={emp._id}>{n || "Employee"}</option>;
                              })}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={LBL}>Due Date</label>
                            <input type="date" className="tmd-input" value={genForm.dueDate}
                              disabled={!!adminUser}
                              style={{ opacity: adminUser ? 0.6 : 1, cursor: adminUser ? "not-allowed" : "auto" }}
                              onChange={e => setGenForm(f => ({ ...f, dueDate: e.target.value }))} />
                            {adminUser && <div style={{ fontSize:11, color:"#94A3B8", marginTop:3, display:"flex", alignItems:"center", gap:4 }}><i className="bi bi-lock-fill" style={{fontSize:9}} /> Admin only</div>}
                          </div>
                          <div>
                            <label style={LBL}>Est. Hours</label>
                            <input type="number" className="tmd-input" placeholder="0" min="0" value={genForm.estimatedHours}
                              onChange={e => setGenForm(f => ({ ...f, estimatedHours: e.target.value }))} />
                          </div>
                        </div>
                        <div>
                          <label style={LBL}>Description</label>
                          <textarea className="tmd-input" style={{ height: 70, resize: "vertical" }} placeholder="Task details…"
                            value={genForm.description} onChange={e => setGenForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* ══ GENERAL ══ */}
                  {createMode === "general" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <label style={LBL}>Title <span style={{ color: "#EF4444" }}>*</span></label>
                        <input className="tmd-input" placeholder="Task title" value={genForm.title}
                          onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={LBL}>Priority</label>
                          <select className="tmd-select" value={genForm.priority} onChange={e => setGenForm(f => ({ ...f, priority: e.target.value }))}>
                            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={LBL}>Assigned To</label>
                          <select className="tmd-select" value={genForm.assignedTo} onChange={e => setGenForm(f => ({ ...f, assignedTo: e.target.value }))}>
                            <option value="">Unassigned</option>
                            {employees.map(emp => {
                              const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                              return <option key={emp._id} value={emp._id}>{n || "Employee"}</option>;
                            })}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={LBL}>Due Date</label>
                          <input type="date" className="tmd-input" value={genForm.dueDate}
                            disabled={!!adminUser}
                            style={{ opacity: adminUser ? 0.6 : 1, cursor: adminUser ? "not-allowed" : "auto" }}
                            onChange={e => setGenForm(f => ({ ...f, dueDate: e.target.value }))} />
                          {adminUser && <div style={{ fontSize:11, color:"#94A3B8", marginTop:3, display:"flex", alignItems:"center", gap:4 }}><i className="bi bi-lock-fill" style={{fontSize:9}} /> Admin only</div>}
                        </div>
                        <div>
                          <label style={LBL}>Est. Hours</label>
                          <input type="number" className="tmd-input" placeholder="0" min="0" value={genForm.estimatedHours}
                            onChange={e => setGenForm(f => ({ ...f, estimatedHours: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label style={LBL}>Description</label>
                        <textarea className="tmd-input" style={{ height: 80, resize: "vertical" }} placeholder="Task description…"
                          value={genForm.description} onChange={e => setGenForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                    </div>
                  )}

                </form>
              </div>

              {/* Sticky Footer */}
              <div className="tmd-drawer-footer">
                <button type="button" className="tmd-btn tmd-btn-ghost" onClick={closeModal}>Cancel</button>
                {createMode !== "website" && (
                  <button type="submit" form="create-task-form" className="tmd-btn tmd-btn-primary" disabled={submitting}>
                    {submitting
                      ? <><div className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> Creating…</>
                      : <><i className="bi bi-plus-circle-fill" /> Create Task</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
    <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  );
}
