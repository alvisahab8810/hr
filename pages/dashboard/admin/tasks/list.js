import { useEffect, useState, useCallback, useMemo } from "react";
import { useTaskSync } from "@/utils/hooks/useTaskSync";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import { gradeTask, pointsToGrade } from "@/utils/tasks/gradeTask";

/* ─── Grade badge component ────────────────────────────── */
function GradeBadge({ task }) {
  const g = gradeTask(task);
  if (!g) return <span style={{ color: "#CBD5E1", fontSize: 11 }}>—</span>;
  const { label, color, bg } = pointsToGrade(g.points);
  return (
    <span title={`${g.points}/5 pts · ${g.hoursLate <= 0 ? "On time" : `${g.hoursLate.toFixed(1)}h late`}`} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 800,
      background: bg, color,
    }}>
      {label}
    </span>
  );
}

/* ─── Constants ─────────────────────────────────────────── */

const TABS = [
  { key: "smm",      label: "Social Media", icon: "bi-instagram",   color: "#E1306C", bg: "#FFF0F5", border: "#F9A8D4" },
  { key: "seo",      label: "SEO",          icon: "bi-search",      color: "#10B981", bg: "#ECFDF5", border: "#6EE7B7" },
  { key: "ads",      label: "Ads",          icon: "bi-megaphone",   color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { key: "branding", label: "Branding",     icon: "bi-palette",     color: "#8B5CF6", bg: "#F5F3FF", border: "#C4B5FD" },
];

const STAGE_META = {
  S1: { label: "Script/Concept", color: "#F59E0B", bg: "#FEF3C7", border: "#FDE68A" },
  S2: { label: "Shoot/Design",   color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
  S3: { label: "Edit/Develop",   color: "#10B981", bg: "#DCFCE7", border: "#BBF7D0" },
  S4: { label: "Posted/Live",    color: "#EC4899", bg: "#FCE7F3", border: "#FBCFE8" },
};

const STATUS_META = {
  todo:        { label: "To Do",       color: "#64748B", bg: "#F1F5F9" },
  in_progress: { label: "In Progress", color: "#1D4ED8", bg: "#DBEAFE" },
  review:      { label: "Review",      color: "#B45309", bg: "#FEF3C7" },
  completed:   { label: "Done",        color: "#15803D", bg: "#DCFCE7" },
  blocked:     { label: "Blocked",     color: "#DC2626", bg: "#FEE2E2" },
};

const CONTENT_META = {
  reel:     { label: "Reel",     icon: "bi-camera-video-fill", color: "#F59E0B" },
  post:     { label: "Post",     icon: "bi-image-fill",        color: "#6366F1" },
  carousel: { label: "Carousel", icon: "bi-images",            color: "#10B981" },
  story:    { label: "Story",    icon: "bi-phone-fill",        color: "#EC4899" },
};

const SEO_CAT_META = {
  blog:      { label: "Blog",      color: "#6366F1", bg: "#EEF2FF" },
  technical: { label: "Technical", color: "#EF4444", bg: "#FEF2F2" },
  onpage:    { label: "On-Page",   color: "#3B82F6", bg: "#DBEAFE" },
  offpage:   { label: "Off-Page",  color: "#F59E0B", bg: "#FFFBEB" },
  backlinks: { label: "Backlinks", color: "#10B981", bg: "#ECFDF5" },
  keywords:  { label: "Keywords",  color: "#8B5CF6", bg: "#F5F3FF" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STAGE_KEYS = ["S1","S2","S3","S4"];

const EMPTY_GEN_FORM  = { title: "", description: "", priority: "medium", assignedTo: "", projectId: "", sprintId: "", dueDate: "", estimatedHours: "", brandId: "" };
const SEO_CATS = [
  { key: "blog",      label: "Blog Post",      icon: "bi-file-text",             color: "#6366F1" },
  { key: "technical", label: "Technical SEO",  icon: "bi-code-slash",            color: "#EF4444" },
  { key: "onpage",    label: "On-Page",         icon: "bi-file-earmark-richtext", color: "#3B82F6" },
  { key: "offpage",   label: "Off-Page",        icon: "bi-link-45deg",            color: "#F59E0B" },
  { key: "backlinks", label: "Backlinks",        icon: "bi-arrow-left-right",      color: "#10B981" },
];
const EMPTY_SEO_FORM = { seoCategory: "blog", title: "", primaryKeywords: "", pageUrls: [""], internalLinking: false, internalLinkingTask: "", externalLinking: false, externalLinkingTask: "", description: "", priority: "medium", assignedTo: "", dueDate: "" };
const BLOG_SCHED_DAY_ORDER = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const SVC_LABELS = { socialMedia: "Social Media", website: "Website", seo: "SEO", ads: "Ads", branding: "Branding" };
const SVC_COLORS = { socialMedia: ["#EDE9FE","#7C3AED"], website: ["#DBEAFE","#1D4ED8"], seo: ["#D1FAE5","#065F46"], ads: ["#FEF3C7","#B45309"], branding: ["#FCE7F3","#BE185D"] };
const PRIORITIES_LIST = ["low","medium","high","urgent"];
const PRIORITY_META_C = { low: { label:"Low" }, medium: { label:"Medium" }, high: { label:"High" }, urgent: { label:"Urgent" } };

function seoDayName(dateStr) {
  if (!dateStr) return "";
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const d = new Date(dateStr);
  return `${days[d.getDay()]}, ${d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
}
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
const STAGE_NAMES_DEFAULT = ["Script/Concept","Shoot","Design/Edit/Develop","Posted/Live"];
const freshStages = () => STAGE_NAMES_DEFAULT.map(name => ({ name, assignedTo: [], deadline: "" }));
const EMPTY_PROD_FORM = { brandId: "", contentType: "reel", stages: freshStages() };
const STAGE_COLORS = ["#F59E0B","#6366F1","#10B981","#EC4899"];
// Each stage: { include: [...], exclude: [...] }
// Inclusion matches department only; exclusion checks both dept + designation
// Using longer strings (e.g. "content team") avoids false positives from designations
// like "Content Creator" in Production dept showing up in S1.
const STAGE_DEPT_KEYWORDS = [
  { include: ["content team"],                              exclude: [] },
  { include: ["production"],                                exclude: ["design", "creative"] },
  { include: ["editing team", "design team", "tech"],      exclude: [] },
  { include: ["digital marketing"],                         exclude: [] },
];
const AVATAR_COLORS_LIST = [
  ["#EEF2FF","#4F46E5"],["#FEF3C7","#B45309"],["#DCFCE7","#15803D"],
  ["#FEE2E2","#DC2626"],["#F3E8FF","#7C3AED"],["#DBEAFE","#1D4ED8"],["#FCE7F3","#BE185D"],
];

function avatarColor(name) { return AVATAR_COLORS_LIST[(name?.charCodeAt(0) || 0) % AVATAR_COLORS_LIST.length]; }
function getInitials(name) { return (name || "?").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase(); }
function filterByDept(employees, { include, exclude }) {
  return employees.filter(emp => {
    const dept  = (emp.professional?.department  || "").toLowerCase();
    const desig = (emp.professional?.designation || "").toLowerCase();
    // Exclusion: check both dept and designation (catches mixed dept like "Production/Design")
    if (exclude.some(kw => dept.includes(kw) || desig.includes(kw))) return false;
    // Inclusion: check department ONLY — avoids false positives from designation names
    return include.some(kw => dept.includes(kw));
  });
}
function normalizeAssignedTo(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(item => typeof item === "object" ? String(item._id || item) : String(item)).filter(Boolean);
  return [typeof v === "object" ? String(v._id || v) : String(v)].filter(Boolean);
}
function getStageEmps(stg, employees) {
  const ids = normalizeAssignedTo(stg?.assignedTo);
  return ids.map(id => employees.find(e => String(e._id) === id)).filter(Boolean);
}
function empShortName(emp) {
  return (emp?.personal?.firstName || emp?.firstName || "").trim();
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} '${String(dt.getFullYear()).slice(2)}`;
}
function fmtDateTimeInput(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 16);
}
function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const pad = n => String(n).padStart(2,"0");
  return `${pad(dt.getDate())}-${pad(dt.getMonth()+1)}-${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function isOverdue(t) {
  return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
}
// True if any stage has an overdue deadline that isn't yet submitted
function hasLateStage(t) {
  if (t.status === "completed") return false;
  const now = new Date();
  return (t.stages || []).some(s => s.deadline && !s.done && new Date(s.deadline) < now);
}
function getEmpName(t) {
  const a = t.assignedTo;
  if (!a) return "Unassigned";
  if (a.personal?.firstName) return `${a.personal.firstName} ${a.personal.lastName || ""}`.trim();
  return a.email || "—";
}

/* ─── Component ─────────────────────────────────────────── */

export default function TasksListPage() {
  const router = useRouter();

  const [activeTab,  setActiveTab]  = useState("smm");
  const [tasks,      setTasks]      = useState([]);
  const [brands,     setBrands]     = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [adminUser,  setAdminUser]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);

  const [filters, setFilters] = useState({ search: "", brandId: "", status: "", assignedTo: "", dateFrom: "", dateTo: "" });
  const [hideCompleted, setHideCompleted] = useState(false);

  /* Create form state */
  const [showCreate,          setShowCreate]          = useState(false);
  const [createMode,          setCreateMode]          = useState("production");
  const [submitting,          setSubmitting]          = useState(false);
  const [prodForm,            setProdForm]            = useState(EMPTY_PROD_FORM);
  const [genForm,             setGenForm]             = useState(EMPTY_GEN_FORM);
  const [seoForm,             setSeoForm]             = useState(EMPTY_SEO_FORM);
  const [webForm,             setWebForm]             = useState({ title:"", description:"", priority:"medium", assignedTo:"", webTaskType:"feature", projectId:"", sprintId:"", dueDate:"", estimatedHours:"" });
  const [topBrandId,          setTopBrandId]          = useState("");
  const [nomenclaturePreview, setNomenclaturePreview] = useState("");
  const [nomenclatureLoading, setNomenclatureLoading] = useState(false);
  const [projects,            setProjects]            = useState([]);
  const [sprints,             setSprints]             = useState([]);

  /* Stage editor */
  const [stageModal,        setStageModal]        = useState(false);
  const [stageTask,         setStageTask]         = useState(null);
  const [stageIdx,          setStageIdx]          = useState(0);
  const [stageForm,         setStageForm]         = useState({ name: "", assignedTo: [], deadline: "" });
  const [stageSaving,       setStageSaving]       = useState(false);
  const [stageRejectMode,   setStageRejectMode]   = useState(false);
  const [stageRejectReason, setStageRejectReason] = useState("");

  useEffect(() => {
    fetch("/api/admin-users/me", { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setAdminUser(d.user); }).catch(() => {});
    Promise.all([
      fetch("/api/admin/brands",          { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/assets/employees",{ credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/projects",        { credentials: "include" }).then(r => r.json()),
    ]).then(([bData, eData, pData]) => {
      if (bData.success) setBrands(bData.brands || []);
      if (eData.success) setEmployees(eData.employees || []);
      if (pData.success) setProjects(pData.projects || []);
    }).catch(() => {});
  }, []);

  /* Load sprints when project selected */
  useEffect(() => {
    if (!genForm.projectId) { setSprints([]); return; }
    fetch(`/api/admin/sprints?projectId=${genForm.projectId}`, { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setSprints(d.sprints || []); }).catch(() => {});
  }, [genForm.projectId]);

  /* Auto-fill blog due date from brand schedule */
  useEffect(() => {
    if (createMode !== "seo" || seoForm.seoCategory !== "blog" || seoForm.dueDate) return;
    const brand = brands.find(b => b._id === topBrandId) || null;
    const schedule = brand?.seoSettings?.blogSchedule || [];
    if (schedule.length === 0) return;
    const firstDay = BLOG_SCHED_DAY_ORDER.find(d => schedule.includes(d));
    if (!firstDay) return;
    const date = nextDateForDay(firstDay);
    if (date) setSeoForm(f => ({ ...f, dueDate: date }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createMode, seoForm.seoCategory, topBrandId]);

  /* Live nomenclature preview */
  useEffect(() => {
    if (!prodForm.brandId || !prodForm.contentType) { setNomenclaturePreview(""); return; }
    setNomenclatureLoading(true);
    fetch(`/api/admin/tasks/nomenclature?brandId=${prodForm.brandId}&contentType=${prodForm.contentType}`, { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.success) setNomenclaturePreview(d.nomenclature); })
      .catch(() => {}).finally(() => setNomenclatureLoading(false));
  }, [prodForm.brandId, prodForm.contentType]);

  /* Create form derived state */
  const selectedBrand = useMemo(() => brands.find(b => b._id === topBrandId) || null, [brands, topBrandId]);

  const dmEmployees = useMemo(() => employees.filter(emp => {
    const dept  = (emp.professional?.department  || "").toLowerCase();
    const desig = (emp.professional?.designation || "").toLowerCase();
    return dept.includes("digital") || dept.includes("marketing") || dept.includes("seo") ||
           desig.includes("digital") || desig.includes("marketing") || desig.includes("seo");
  }), [employees]);

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

  const closeCreateModal = () => {
    setShowCreate(false);
    setTopBrandId("");
    setNomenclaturePreview("");
    setProdForm(EMPTY_PROD_FORM);
    setGenForm(EMPTY_GEN_FORM);
    setSeoForm(EMPTY_SEO_FORM);
    setWebForm({ title:"", description:"", priority:"medium", assignedTo:"", webTaskType:"feature", projectId:"", sprintId:"", dueDate:"", estimatedHours:"" });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let body = {};
      if (createMode === "production") {
        if (!prodForm.brandId)    { toast.error("Please select a brand"); setSubmitting(false); return; }
        if (!prodForm.contentType){ toast.error("Please select creative type"); setSubmitting(false); return; }
        const stageNames = ["S1 Script/Concept", "S2 Shoot/Design", "S3 Edit/Develop", "S4 Posted/Live"];
        for (let i = 0; i < prodForm.stages.length; i++) {
          const stg = prodForm.stages[i];
          if ((stg.assignedTo || []).length > 0 && !stg.deadline) {
            toast.error(`Deadline is required for ${stageNames[i]}`);
            setSubmitting(false); return;
          }
        }
        const anyDeadline = prodForm.stages.some(s => s.deadline);
        if (!anyDeadline) { toast.error("At least one stage deadline is required"); setSubmitting(false); return; }
        body = { taskType: "production", brandId: prodForm.brandId, contentType: prodForm.contentType, stage: "S1",
          stages: prodForm.stages.map(s => ({ name: s.name, assignedTo: s.assignedTo || [], deadline: s.deadline || null })),
          assignedById: adminUser?._id, assignedByModel: "AdminUser", assignedByName: adminUser?.name || "Admin" };
      } else if (createMode === "website") {
        if (!webForm.title.trim()) { toast.error("Title is required");    setSubmitting(false); return; }
        if (!webForm.dueDate)      { toast.error("Deadline is required"); setSubmitting(false); return; }
        const wType = webForm.webTaskType;
        body = { title: webForm.title, description: webForm.description, priority: webForm.priority,
          assignedTo: webForm.assignedTo || null,
          taskType: wType === "sprint" ? "sprint" : (wType === "feature" || wType === "page") ? "project" : "manual",
          brandId: topBrandId || null, projectId: webForm.projectId || null, sprintId: webForm.sprintId || null,
          dueDate: webForm.dueDate || null, estimatedHours: webForm.estimatedHours ? Number(webForm.estimatedHours) : null,
          tags: [wType], assignedById: adminUser?._id, assignedByModel: "AdminUser", assignedByName: adminUser?.name || "Admin" };
      } else if (createMode === "seo") {
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
        if (!seoTitle)       { toast.error("Title is required");    setSubmitting(false); return; }
        if (!seoForm.dueDate){ toast.error("Deadline is required"); setSubmitting(false); return; }
        body = { title: seoTitle, description: seoDesc, pillar: pillarVal, priority: seoForm.priority,
          assignedTo: seoForm.assignedTo || null, taskType: "manual", brandId: topBrandId || null,
          seoCategory: seoForm.seoCategory, tags: ["seo", seoForm.seoCategory], dueDate: seoForm.dueDate || null,
          assignedById: adminUser?._id, assignedByModel: "AdminUser", assignedByName: adminUser?.name || "Admin" };
      } else if (["ads","branding"].includes(createMode)) {
        if (!genForm.title.trim()) { toast.error("Title is required");    setSubmitting(false); return; }
        if (!genForm.dueDate)      { toast.error("Deadline is required"); setSubmitting(false); return; }
        body = { ...genForm, taskType: "manual", brandId: topBrandId || genForm.brandId || null, tags: [createMode],
          assignedById: adminUser?._id, assignedByModel: "AdminUser", assignedByName: adminUser?.name || "Admin" };
      } else {
        if (!genForm.title.trim()) { toast.error("Title is required");    setSubmitting(false); return; }
        if (!genForm.dueDate)      { toast.error("Deadline is required"); setSubmitting(false); return; }
        body = { ...genForm, taskType: genForm.taskType || "manual", brandId: topBrandId || genForm.brandId || null,
          assignedById: adminUser?._id, assignedByModel: "AdminUser", assignedByName: adminUser?.name || "Admin" };
      }

      const res  = await fetch("/api/admin/tasks", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        toast.success(`Task created! ${data.task?.nomenclature ? `(${data.task.nomenclature})` : ""}`);
        closeCreateModal();
        fetchTasks();
      } else toast.error(data.message || "Failed to create task");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit: 25 });
      if (filters.search)    q.set("search",    filters.search);
      if (filters.brandId)   q.set("brandId",   filters.brandId);
      if (filters.status)    q.set("status",    filters.status);
      if (filters.assignedTo) q.set("assignedTo", filters.assignedTo);
      if (filters.dateFrom)   q.set("dateStart", new Date(filters.dateFrom).toISOString());
      if (filters.dateTo)     q.set("dateEnd",   new Date(filters.dateTo + "T23:59:59").toISOString());
      if (hideCompleted)     q.set("hideCompleted", "true");
      // Tab-specific filter
      if (activeTab === "smm")      q.set("taskType", "production");
      else if (activeTab === "seo") q.set("tags", "seo");
      else if (activeTab === "ads") q.set("tags", "ads");
      else if (activeTab === "branding") q.set("tags", "branding");

      const res  = await fetch(`/api/admin/tasks?${q}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) { setTasks(data.tasks || []); setPagination(data.pagination || {}); }
      else toast.error("Failed to load tasks");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, [filters, hideCompleted, page, activeTab]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Auto-refresh: socket events + tab visibility + polling
  useTaskSync(fetchTasks, { room: "admin-tasks" });

  function switchTab(tab) {
    setActiveTab(tab);
    setPage(1);
    setFilters({ search: "", brandId: "", status: "", assignedTo: "", dateFrom: "", dateTo: "" });
  }

  /* Stage editor helpers */
  const openStageEditor = (task, idx) => {
    const stg = task.stages?.[idx] || {};
    setStageTask(task); setStageIdx(idx);
    setStageForm({ name: stg.name || STAGE_NAMES_DEFAULT[idx], assignedTo: normalizeAssignedTo(stg.assignedTo), deadline: fmtDateTimeInput(stg.deadline) });
    setStageRejectMode(false); setStageRejectReason(""); setStageModal(true);
  };

  const buildStages = (task, overrideIdx, overrideData) =>
    STAGE_KEYS.map((_, i) => {
      const s = task.stages?.[i] || {};
      if (i === overrideIdx) return { ...overrideData };
      return { name: s.name || STAGE_NAMES_DEFAULT[i], assignedTo: normalizeAssignedTo(s.assignedTo), deadline: s.deadline || null, done: s.done || false, doneAt: s.doneAt || null, approved: s.approved || false, rejected: s.rejected || false, rejectReason: s.rejectReason || "", proofUrls: s.proofUrls || [] };
    });

  const saveStage = async () => {
    if (!stageTask) return;
    if (stageForm.assignedTo.length > 0 && !stageForm.deadline) {
      toast.error("Deadline is required when a stage has assignees"); return;
    }
    setStageSaving(true);
    try {
      const cur    = stageTask.stages?.[stageIdx] || {};
      const stages = buildStages(stageTask, stageIdx, { name: stageForm.name, assignedTo: stageForm.assignedTo, deadline: stageForm.deadline || null, done: cur.done || false, doneAt: cur.doneAt || null, approved: cur.approved || false, rejected: cur.rejected || false, rejectReason: cur.rejectReason || "", proofUrls: cur.proofUrls || [] });
      const res  = await fetch(`/api/admin/tasks/${stageTask._id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages, performedByName: adminUser?.name || "Admin" }) });
      const data = await res.json();
      if (data.success) { toast.success("Stage saved!"); setStageModal(false); fetchTasks(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setStageSaving(false); }
  };

  const approveStage = async () => {
    if (!stageTask) return;
    setStageSaving(true);
    try {
      const cur    = stageTask.stages?.[stageIdx] || {};
      const stages = buildStages(stageTask, stageIdx, { name: stageForm.name, assignedTo: stageForm.assignedTo, deadline: stageForm.deadline || null, done: true, doneAt: cur.doneAt || new Date().toISOString(), approved: true, rejected: false, rejectReason: "", proofUrls: cur.proofUrls || [] });
      const updates = { stages, performedByName: adminUser?.name || "Admin" };
      if (stageIdx === 3) {
        updates.stage  = "S4";
        updates.status = "completed";
      } else {
        const nextStg      = stageTask.stages?.[stageIdx + 1] || {};
        const nextAssigned = normalizeAssignedTo(nextStg.assignedTo);
        updates.stage = STAGE_KEYS[stageIdx + 1];

        if (stageIdx === 0) {
          // S1 (Content/Script) approved — no client review needed for this stage.
          // If nobody is assigned to S2 (next stage), consider the task complete.
          if (nextAssigned.length === 0) {
            updates.status = "completed";
            updates.stage  = "S4";
          } else {
            updates.status = "in_progress";
          }
        } else if (stageIdx === 1) {
          updates.status = nextAssigned.length > 0 ? "in_progress" : "review";
        } else {
          // S3 approved → goes to client review only if S4 has no assignees yet
          updates.status = nextAssigned.length > 0 ? "in_progress" : "review";
        }
      }
      const res  = await fetch(`/api/admin/tasks/${stageTask._id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      const data = await res.json();
      if (data.success) { toast.success("Stage approved!"); setStageModal(false); fetchTasks(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setStageSaving(false); }
  };

  const rejectStage = async () => {
    if (!stageRejectReason.trim() || !stageTask) return;
    setStageSaving(true);
    try {
      const cur    = stageTask.stages?.[stageIdx] || {};
      const stages = buildStages(stageTask, stageIdx, { name: stageForm.name, assignedTo: stageForm.assignedTo, deadline: stageForm.deadline || null, done: false, doneAt: null, approved: false, rejected: true, rejectReason: stageRejectReason.trim(), proofUrls: cur.proofUrls || [] });
      const res  = await fetch(`/api/admin/tasks/${stageTask._id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages, performedByName: adminUser?.name || "Admin" }) });
      const data = await res.json();
      if (data.success) { toast.success("Stage rejected"); setStageModal(false); setStageRejectMode(false); setStageRejectReason(""); fetchTasks(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setStageSaving(false); }
  };

  const currentTab = TABS.find(t => t.key === activeTab) || TABS[0];

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Tasks — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .tl-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
          .tl-btn { border:none; cursor:pointer; border-radius:10px; padding:7px 14px; font-size:13px; font-weight:600; transition:all .15s; display:inline-flex; align-items:center; gap:5px; }
          .tl-btn-primary { background:#4F46E5; color:#fff; }
          .tl-btn-ghost { background:#F1F5F9; color:#475569; }
          .tl-btn-ghost:hover { background:#E2E8F0; }
          .tl-input { padding:7px 11px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; background:#fff; }
          .tl-input:focus { border-color:#6366F1; }
          .tl-select { padding:7px 10px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:12px; outline:none; background:#fff; cursor:pointer; }
          .tl-table { width:100%; border-collapse:collapse; }
          .tl-table th { padding:10px 12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#94A3B8; border-bottom:2px solid #F1F5F9; background:#FAFAFA; text-align:left; white-space:nowrap; }
          .tl-table td { padding:11px 12px; border-bottom:1px solid #F8FAFC; font-size:13px; vertical-align:middle; }
          .tl-table tr:hover td { background:#FAFBFF; }
          .stage-dot { width:22px; height:22px; border-radius:6px; border:2px solid; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; transition:all .12s; }
          .stage-dot:hover { transform:scale(1.12); }
          .tl-page-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid #E5E7EB; background:#fff; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center; }
          .tl-page-btn.active { background:#4F46E5; color:#fff; border-color:#4F46E5; }
          .tl-page-btn:disabled { opacity:.4; cursor:default; }
          .tl-overlay { position:fixed; inset:0; background:rgba(15,15,35,.55); backdrop-filter:blur(4px); z-index:1050; display:flex; align-items:center; justify-content:center; padding:16px; }
          .tl-modal { background:#fff; border-radius:20px; width:100%; max-width:480px; box-shadow:0 24px 64px rgba(0,0,0,.18); }
          .tl-field-label { font-size:10.5px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:.06em; display:block; margin-bottom:5px; }
          .tl-field-input { padding:8px 12px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; width:100%; background:#fff; }
          .tl-field-input:focus { border-color:#6366F1; }
          .overdue-row td { background:#FFF5F5 !important; }
          .tl-tab { display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; border:1.5px solid transparent; transition:all .14s; white-space:nowrap; }
          .tmd-btn { border:none; cursor:pointer; border-radius:10px; padding:8px 18px; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px; transition:all .15s; }
          .tmd-btn-primary { background:#4F46E5; color:#fff; }
          .tmd-btn-primary:hover { background:#4338CA; }
          .tmd-btn-ghost { background:#F1F5F9; color:#475569; }
          .tmd-btn-ghost:hover { background:#E2E8F0; }
          .tmd-input { padding:8px 12px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; width:100%; background:#fff; box-sizing:border-box; }
          .tmd-input:focus { border-color:#6366F1; }
          .tmd-select { padding:8px 12px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; width:100%; background:#fff; cursor:pointer; }
          .tmd-overlay { position:fixed; inset:0; background:rgba(15,15,35,.55); backdrop-filter:blur(4px); z-index:1050; display:flex; align-items:stretch; justify-content:flex-end; }
          .tmd-drawer { background:#fff; width:740px; max-width:100vw; height:100vh; display:flex; flex-direction:column; box-shadow:-10px 0 60px rgba(0,0,0,.2); animation:drawerSlideIn .22s cubic-bezier(.4,0,.2,1); }
          @keyframes drawerSlideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
          .tmd-drawer-header { padding:18px 26px; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #F1F5F9; flex-shrink:0; }
          .tmd-drawer-body { flex:1; overflow-y:auto; padding:22px 26px; }
          .tmd-drawer-footer { padding:14px 26px; display:flex; gap:8px; justify-content:flex-end; border-top:1.5px solid #F1F5F9; flex-shrink:0; background:#fff; }
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
                  <Link href="/dashboard/admin/tasks"><img src="/icons/home.svg" alt="" /> Task Management</Link>
                </li>
                <li className="breadcrumb-item active">Tasks</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* ── Header ── */}
              <div className="attendance-topbar leave-management-topbar" style={{ flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">Tasks</h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                    {pagination.total || 0} task{pagination.total !== 1 ? "s" : ""} · {currentTab.label}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="tl-btn tl-btn-ghost" style={{ fontSize: 12 }}
                    onClick={() => setHideCompleted(h => !h)}>
                    <i className={`bi ${hideCompleted ? "bi-eye" : "bi-eye-slash"}`} />
                    {hideCompleted ? "Show completed" : "Hide completed"}
                  </button>
                  <button className="invite-btn tl-btn-primary"
                    onClick={() => setShowCreate(true)}>
                    <i className="bi bi-plus-circle" /> New Task
                  </button>
                </div>
              </div>

              {/* ── Tabs ── */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {TABS.map(tab => {
                  const active = activeTab === tab.key;
                  return (
                    <button key={tab.key} className="tl-tab"
                      onClick={() => switchTab(tab.key)}
                      style={{
                        background: active ? tab.bg : "#fff",
                        color: active ? tab.color : "#64748B",
                        borderColor: active ? tab.border : "#E5E7EB",
                        boxShadow: active ? `0 0 0 3px ${tab.color}18` : "none",
                      }}>
                      <i className={`bi ${tab.icon}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── Filters ── */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <i className="bi bi-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 13 }} />
                  <input className="tl-input" style={{ paddingLeft: 28, width: 190 }}
                    placeholder="Search tasks…" value={filters.search}
                    onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
                </div>
                <select className="tl-select" value={filters.brandId}
                  onChange={e => { setFilters(f => ({ ...f, brandId: e.target.value })); setPage(1); }}>
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <select className="tl-select" value={filters.status}
                  onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
                  <option value="">All Status</option>
                  {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="tl-select" value={filters.assignedTo}
                  onChange={e => { setFilters(f => ({ ...f, assignedTo: e.target.value })); setPage(1); }}>
                  <option value="">All Assignees</option>
                  {employees.map(emp => {
                    const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                    return <option key={emp._id} value={emp._id}>{n}</option>;
                  })}
                </select>
                <input type="date" className="tl-select" style={{ cursor: "pointer" }} value={filters.dateFrom}
                  onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
                  title="From date" />
                <input type="date" className="tl-select" style={{ cursor: "pointer" }} value={filters.dateTo}
                  onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }}
                  title="To date" />
                {(Object.values(filters).some(Boolean) || hideCompleted) && (
                  <button className="tl-btn tl-btn-ghost" style={{ fontSize: 12 }}
                    onClick={() => { setFilters({ search: "", brandId: "", status: "", assignedTo: "", dateFrom: "", dateTo: "" }); setHideCompleted(false); setPage(1); }}>
                    <i className="bi bi-x-circle" /> Clear
                  </button>
                )}
              </div>

              {/* ── Table ── */}
              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" />
                  <div style={{ marginTop: 10 }}>Loading…</div>
                </div>
              ) : tasks.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <i className={`bi ${currentTab.icon}`} style={{ fontSize: 44, color: currentTab.color + "60" }} />
                  <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: "#1E293B" }}>No {currentTab.label} tasks</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>Create one with the New Task button above</div>
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>

                    {/* ══ SOCIAL MEDIA TABLE ══ */}
                    {activeTab === "smm" && (
                      <table className="tl-table">
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}>ID</th>
                            <th style={{ width: 170 }}>Title</th>
                            <th style={{ width: 130 }}>Brand</th>
                            <th style={{ width: 90 }}>Type</th>
                            <th style={{ width: 110 }}>Pipeline</th>
                            <th style={{ width: 110 }}>S1 Script</th>
                            <th style={{ width: 110 }}>S2 Shoot</th>
                            <th style={{ width: 110 }}>S3 Edit</th>
                            <th style={{ width: 110 }}>S4 Posted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => {
                            const over = isOverdue(t);
                            const late = hasLateStage(t);
                            const ct   = CONTENT_META[t.contentType];
                            return (
                              <tr key={t._id} className={over ? "overdue-row" : ""}
                                style={{ cursor: "pointer", background: late ? "#FFF5F5" : "" }}
                                onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#6366F1", fontSize: 12, whiteSpace: "nowrap" }}>
                                  {t.taskId || `#${String(t._id).slice(-4).toUpperCase()}`}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", display: "flex", alignItems: "center", gap: 6 }}>
                                    {late && <span style={{ background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 20, padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0 }}>LATE</span>}
                                    {over && <i className="bi bi-exclamation-circle-fill text-danger" style={{ fontSize: 10, flexShrink: 0 }} />}
                                    {t.nomenclature || t.title}
                                  </div>
                                  {t.nomenclature && <div style={{ fontSize: 10, color: "#94A3B8" }}>{t.title}</div>}
                                  {t.status === "review" && (
                                    <span style={{ display: "inline-flex", gap: 4, marginTop: 3, padding: "2px 7px", borderRadius: 20, background: "#DBEAFE", color: "#1D4ED8", fontSize: 10, fontWeight: 700 }}>
                                      <i className="bi bi-hourglass-split" />Admin Review
                                    </span>
                                  )}
                                  {t.status === "todo" && t.reviewNote && (
                                    <span style={{ display: "inline-flex", gap: 4, marginTop: 3, padding: "2px 7px", borderRadius: 20, background: "#FEF3C7", color: "#B45309", fontSize: 10, fontWeight: 700 }}>
                                      <i className="bi bi-arrow-counterclockwise" />Client Revision
                                    </span>
                                  )}
                                  {t.status === "completed" && (
                                    <span style={{ display: "inline-flex", gap: 4, marginTop: 3, padding: "2px 7px", borderRadius: 20, background: "#DCFCE7", color: "#15803D", fontSize: 10, fontWeight: 700 }}>
                                      <i className="bi bi-check-circle-fill" />Done
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {t.brandId
                                    ? <span className="tl-badge" style={{ background: (t.brandId.color || "#6366F1") + "20", color: t.brandId.color || "#6366F1" }}>{t.brandId.name}</span>
                                    : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                <td>
                                  {ct ? <span style={{ color: ct.color, fontWeight: 700, fontSize: 12 }}><i className={`bi ${ct.icon} me-1`} />{ct.label}</span> : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                {/* Pipeline dots */}
                                <td onClick={e => e.stopPropagation()}>
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {STAGE_KEYS.map((key, i) => {
                                      const meta = STAGE_META[key];
                                      const stg  = t.stages?.[i] || {};
                                      const done = stg.done; const approved = stg.approved; const rejected = stg.rejected;
                                      const pending = done && !approved && !rejected;
                                      const bg = rejected ? "#DC2626" : pending ? "#F59E0B" : approved ? "#10B981" : done ? meta.color : t.stage === key ? meta.color : "transparent";
                                      const border = rejected ? "#DC2626" : pending ? "#F59E0B" : approved ? "#10B981" : done ? meta.color : t.stage === key ? meta.color : "#E5E7EB";
                                      return (
                                        <div key={key} className="stage-dot"
                                          style={{ background: bg, borderColor: border, color: (done || t.stage === key) ? "#fff" : "#CBD5E1" }}
                                          onClick={() => openStageEditor(t, i)}>
                                          {rejected ? "✗" : pending ? "?" : done ? "✓" : i + 1}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                                {STAGE_KEYS.map((key, i) => {
                                  const stg  = t.stages?.[i] || {};
                                  const emps = getStageEmps(stg, employees);
                                  return (
                                    <td key={key} onClick={e => { e.stopPropagation(); openStageEditor(t, i); }} style={{ cursor: "pointer" }}>
                                      {emps.length > 0 ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                          {emps.slice(0, 3).map(emp => {
                                            const n = empShortName(emp);
                                            const [bg, fg] = avatarColor(n);
                                            return <div key={emp._id} title={n} style={{ width: 22, height: 22, borderRadius: 6, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 }}>{getInitials(n)}</div>;
                                          })}
                                          {stg.deadline && <div style={{ fontSize: 9, color: "#94A3B8", whiteSpace: "nowrap", marginLeft: 2 }}>{fmtDate(stg.deadline)}</div>}
                                        </div>
                                      ) : <span style={{ color: "#CBD5E1" }}>—</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* ══ SEO TABLE ══ */}
                    {activeTab === "seo" && (
                      <table className="tl-table">
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}>ID</th>
                            <th>Title</th>
                            <th style={{ width: 130 }}>Brand</th>
                            <th style={{ width: 110 }}>Category</th>
                            <th style={{ width: 140 }}>Assignee</th>
                            <th style={{ width: 110 }}>Due Date</th>
                            <th style={{ width: 110 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => {
                            const over    = isOverdue(t);
                            const empName = getEmpName(t);
                            const sm      = (t.status === "todo" && t.reviewNote)
                              ? { label: "Client Revision", color: "#B45309", bg: "#FEF3C7" }
                              : STATUS_META[t.status] || STATUS_META.todo;
                            const seoCat  = t.seoCategory || (t.tags || []).find(tag => SEO_CAT_META[tag]) || "";
                            const catMeta = SEO_CAT_META[seoCat];
                            return (
                              <tr key={t._id} className={over ? "overdue-row" : ""}
                                style={{ cursor: "pointer" }}
                                onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#10B981", fontSize: 12, whiteSpace: "nowrap" }}>
                                  {t.taskId || `#${String(t._id).slice(-4).toUpperCase()}`}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>
                                    {over && <i className="bi bi-exclamation-circle-fill text-danger me-1" style={{ fontSize: 10 }} />}
                                    {t.title}
                                  </div>
                                  {t.pillar && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}><i className="bi bi-key me-1" />{t.pillar}</div>}
                                </td>
                                <td>
                                  {t.brandId
                                    ? <span className="tl-badge" style={{ background: (t.brandId.color || "#10B981") + "20", color: t.brandId.color || "#10B981" }}>{t.brandId.name}</span>
                                    : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                <td>
                                  {catMeta
                                    ? <span className="tl-badge" style={{ background: catMeta.bg, color: catMeta.color }}>{catMeta.label}</span>
                                    : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 7, ...(() => { const [bg,fg]=avatarColor(empName); return {background:bg,color:fg}; })(), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 }}>{getInitials(empName)}</div>
                                    <span style={{ fontSize: 12, color: "#374151" }}>{empName}</span>
                                  </div>
                                </td>
                                <td style={{ fontSize: 12, color: over ? "#DC2626" : "#64748B", fontWeight: over ? 700 : 400 }}>
                                  {over && <i className="bi bi-exclamation-circle me-1" style={{ fontSize: 10 }} />}
                                  {fmtDate(t.dueDate)}
                                </td>
                                <td>
                                  <span className="tl-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* ══ ADS / BRANDING TABLE ══ */}
                    {(activeTab === "ads" || activeTab === "branding") && (
                      <table className="tl-table">
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}>ID</th>
                            <th>Title</th>
                            <th style={{ width: 130 }}>Brand</th>
                            <th style={{ width: 140 }}>Assignee</th>
                            <th style={{ width: 110 }}>Due Date</th>
                            <th style={{ width: 90 }}>Priority</th>
                            <th style={{ width: 110 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => {
                            const over    = isOverdue(t);
                            const empName = getEmpName(t);
                            const sm      = (t.status === "todo" && t.reviewNote)
                              ? { label: "Client Revision", color: "#B45309", bg: "#FEF3C7" }
                              : STATUS_META[t.status] || STATUS_META.todo;
                            const PCOLOR  = { low: "#16A34A", medium: "#2563EB", high: "#D97706", urgent: "#E11D48" };
                            return (
                              <tr key={t._id} className={over ? "overdue-row" : ""}
                                style={{ cursor: "pointer" }}
                                onClick={() => router.push(`/dashboard/admin/tasks/${t._id}`)}>
                                <td style={{ fontFamily: "monospace", fontWeight: 700, color: currentTab.color, fontSize: 12, whiteSpace: "nowrap" }}>
                                  {t.taskId || `#${String(t._id).slice(-4).toUpperCase()}`}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>
                                    {over && <i className="bi bi-exclamation-circle-fill text-danger me-1" style={{ fontSize: 10 }} />}
                                    {t.title}
                                  </div>
                                  {t.description && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{t.description.slice(0, 70)}</div>}
                                </td>
                                <td>
                                  {t.brandId
                                    ? <span className="tl-badge" style={{ background: (t.brandId.color || currentTab.color) + "20", color: t.brandId.color || currentTab.color }}>{t.brandId.name}</span>
                                    : <span style={{ color: "#CBD5E1" }}>—</span>}
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 7, ...(() => { const [bg,fg]=avatarColor(empName); return {background:bg,color:fg}; })(), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 }}>{getInitials(empName)}</div>
                                    <span style={{ fontSize: 12, color: "#374151" }}>{empName}</span>
                                  </div>
                                </td>
                                <td style={{ fontSize: 12, color: over ? "#DC2626" : "#64748B", fontWeight: over ? 700 : 400 }}>
                                  {fmtDate(t.dueDate)}
                                </td>
                                <td>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: PCOLOR[t.priority] || "#64748B" }}>{(t.priority || "—").charAt(0).toUpperCase() + (t.priority || "").slice(1)}</span>
                                </td>
                                <td>
                                  <span className="tl-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>
                        {((page - 1) * 25) + 1}–{Math.min(page * 25, pagination.total)} of {pagination.total}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="tl-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><i className="bi bi-chevron-left" /></button>
                        {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                          .map((p, i, arr) => (
                            <span key={p} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: "#CBD5E1" }}>…</span>}
                              <button className={`tl-page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                            </span>
                          ))}
                        <button className="tl-page-btn" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}><i className="bi bi-chevron-right" /></button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </section>
        </div>
      </div>

      {/* ════ CREATE TASK DRAWER ════ */}
      {showCreate && (() => {
        const LBL = { fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 };
        const CTYPE_COLORS = { reel:"#7C3AED", post:"#1D4ED8", carousel:"#B45309", story:"#065F46" };
        return (
          <div className="tmd-overlay" onClick={closeCreateModal}>
            <div className="tmd-drawer" onClick={e => e.stopPropagation()}>
              <div className="tmd-drawer-header">
                <div>
                  <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0, fontSize: 16 }}>+ New Task</h5>
                  {selectedBrand && <div style={{ fontSize: 12, color: "#6366F1", marginTop: 2, fontWeight: 600 }}>{selectedBrand.name}</div>}
                </div>
                <button className="tmd-btn tmd-btn-ghost" style={{ padding: "5px 9px" }} onClick={closeCreateModal}>
                  <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
                </button>
              </div>

              <div className="tmd-drawer-body">
                {/* Brand selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={LBL}>Brand <span style={{ fontWeight: 400, color: "#94A3B8", textTransform: "none", fontSize: 10 }}>(select to see available task types)</span></label>
                  <select className="tmd-select" value={topBrandId} onChange={e => handleBrandChange(e.target.value)}>
                    <option value="">— No specific brand —</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  {selectedBrand?.services?.length > 0 && (
                    <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                      {selectedBrand.services.map(s => {
                        const [bg, fg] = SVC_COLORS[s] || ["#F1F5F9","#475569"];
                        return <span key={s} style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{SVC_LABELS[s] || s}</span>;
                      })}
                    </div>
                  )}
                </div>

                {/* Mode tabs */}
                <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "#F8FAFC", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
                  {availableModes.map(([mode, label]) => (
                    <button key={mode} type="button" onClick={() => setCreateMode(mode)}
                      style={{ flex: 1, minWidth: 90, padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                        background: createMode === mode ? "#fff" : "transparent", color: createMode === mode ? "#4F46E5" : "#64748B",
                        boxShadow: createMode === mode ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .15s" }}>
                      {label}
                    </button>
                  ))}
                </div>

                <form id="create-task-form-list" onSubmit={handleCreate}>

                  {/* ══ PRODUCTION ══ */}
                  {createMode === "production" && (<>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                      <span style={{ fontSize: 16 }}>🤖</span>
                      <div style={{ fontSize: 12, color: "#4338CA", lineHeight: 1.5 }}>ID + nomenclature auto-generated. Each stage has its own deadline &amp; assignee.</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={LBL}>Creative Type</label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {availableContentTypes.map(([val, lbl]) => {
                          const active = prodForm.contentType === val;
                          return (
                            <button key={val} type="button" onClick={() => setProdForm(f => ({ ...f, contentType: val }))}
                              style={{ padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${active ? CTYPE_COLORS[val] : "#E5E7EB"}`,
                                background: active ? CTYPE_COLORS[val] + "18" : "#fff", color: active ? CTYPE_COLORS[val] : "#374151",
                                fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}>
                              {lbl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
                                Assignees · {["Content","Production","Design/Editing","Digital Mktg"][i]} team
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
                                Deadline <span style={{ color: "#EF4444" }}>*</span>
                              </label>
                              <input type="datetime-local" className="tmd-input" value={stg.deadline} required
                                style={{ borderColor: (prodForm.stages[i].assignedTo?.length > 0 && !prodForm.stages[i].deadline) ? "#FCA5A5" : "" }}
                                onChange={e => setProdForm(f => { const stages = [...f.stages]; stages[i] = { ...stages[i], deadline: e.target.value }; return { ...f, stages }; })} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>)}

                  {/* ══ WEBSITE redirect ══ */}
                  {createMode === "website" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "32px 20px", textAlign: "center", background: "#F0F9FF", border: "1.5px dashed #BAE6FD", borderRadius: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="bi bi-code-slash" style={{ fontSize: 24, color: "#1D4ED8" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Use the Web Development Projects page</div>
                        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, maxWidth: 340 }}>Web development tasks are managed through the dedicated Projects page.</div>
                      </div>
                      <button type="button" onClick={() => router.push("/dashboard/admin/tasks/projects")}
                        style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "#1D4ED8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="bi bi-arrow-right-circle" />Go to Web Dev Projects
                      </button>
                    </div>
                  )}

                  {/* ══ SEO ══ */}
                  {createMode === "seo" && (() => {
                    const cat = SEO_CATS.find(c => c.key === seoForm.seoCategory) || SEO_CATS[0];
                    const isBlog = seoForm.seoCategory === "blog";
                    const isOnPage = seoForm.seoCategory === "onpage";
                    const isOffPage = seoForm.seoCategory === "offpage";
                    const isTechnical = seoForm.seoCategory === "technical";
                    const isBacklinks = seoForm.seoCategory === "backlinks";
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                          <label style={LBL}>SEO Category</label>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {SEO_CATS.map(c => {
                              const active = seoForm.seoCategory === c.key;
                              return (
                                <button key={c.key} type="button" onClick={() => setSeoForm(f => ({ ...EMPTY_SEO_FORM, seoCategory: c.key, priority: f.priority, assignedTo: f.assignedTo }))}
                                  style={{ padding: "6px 13px", borderRadius: 8, border: `1.5px solid ${active ? c.color : "#E5E7EB"}`, background: active ? c.color + "18" : "#fff", color: active ? c.color : "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all .15s" }}>
                                  <i className={`bi ${c.icon}`} />{c.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{ background: cat.color + "0D", border: `1px solid ${cat.color}40`, borderRadius: 10, padding: "9px 13px", fontSize: 12, color: "#374151", display: "flex", gap: 8, alignItems: "center" }}>
                          <i className={`bi ${cat.icon}`} style={{ color: cat.color }} />
                          <span><strong>{cat.label}</strong> task for <strong>{selectedBrand?.name || "this brand"}</strong></span>
                        </div>
                        {isBlog && (
                          <>
                            <div><label style={LBL}>Blog Title <span style={{ color: "#EF4444" }}>*</span></label><input className="tmd-input" placeholder="e.g. Top 10 Hotels in Goa" value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} /></div>
                            <div><label style={LBL}>Primary Keywords</label><input className="tmd-input" placeholder="e.g. hotels in goa, best hotels goa" value={seoForm.primaryKeywords} onChange={e => setSeoForm(f => ({ ...f, primaryKeywords: e.target.value }))} /></div>
                          </>
                        )}
                        {isOnPage && (
                          <>
                            <div><label style={LBL}>Task Title <span style={{ color: "#EF4444" }}>*</span></label><input className="tmd-input" placeholder="e.g. Optimise homepage meta tags" value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} /></div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <label style={LBL}>Page URLs</label>
                                <button type="button" onClick={() => setSeoForm(f => ({ ...f, pageUrls: [...(f.pageUrls || [""]), ""] }))} style={{ background: "#EEF2FF", color: "#4F46E5", border: "1.5px solid #C7D2FE", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add URL</button>
                              </div>
                              {(seoForm.pageUrls || [""]).map((url, i) => (
                                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                  <input className="tmd-input" placeholder={`https://example.com/page-${i + 1}`} value={url} onChange={e => { const urls = [...(seoForm.pageUrls || [""])]; urls[i] = e.target.value; setSeoForm(f => ({ ...f, pageUrls: urls })); }} />
                                  {(seoForm.pageUrls || []).length > 1 && <button type="button" onClick={() => setSeoForm(f => ({ ...f, pageUrls: (f.pageUrls || []).filter((_, idx) => idx !== i) }))} style={{ background: "#FEF2F2", color: "#DC2626", border: "1.5px solid #FECACA", borderRadius: 7, padding: "0 9px", cursor: "pointer", fontSize: 13 }}><i className="bi bi-x-lg" /></button>}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        {(isOffPage || isTechnical) && (
                          <>
                            <div><label style={LBL}>Task Title</label><input className="tmd-input" placeholder={isOffPage ? "e.g. Guest post on travelblog.com" : "e.g. Fix Core Web Vitals"} value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} /></div>
                            <div><label style={LBL}>Description <span style={{ color: "#EF4444" }}>*</span></label><textarea className="tmd-input" style={{ height: 90, resize: "vertical" }} placeholder="Describe the task…" value={seoForm.description} onChange={e => setSeoForm(f => ({ ...f, description: e.target.value }))} /></div>
                          </>
                        )}
                        {isBacklinks && (
                          <>
                            <div><label style={LBL}>Task Title</label><input className="tmd-input" placeholder="e.g. Build 5 DoFollow backlinks from DA40+ sites" value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} /></div>
                            <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: seoForm.internalLinking ? "#059669" : "#374151", marginBottom: seoForm.internalLinking ? 10 : 0 }}>
                                <input type="checkbox" checked={seoForm.internalLinking} onChange={e => setSeoForm(f => ({ ...f, internalLinking: e.target.checked }))} style={{ accentColor: "#059669", width: 15, height: 15 }} />
                                Internal Linking
                              </label>
                              {seoForm.internalLinking && <textarea className="tmd-input" style={{ height: 72, resize: "vertical" }} placeholder="Describe internal linking task…" value={seoForm.internalLinkingTask} onChange={e => setSeoForm(f => ({ ...f, internalLinkingTask: e.target.value }))} />}
                            </div>
                            <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: seoForm.externalLinking ? "#4F46E5" : "#374151", marginBottom: seoForm.externalLinking ? 10 : 0 }}>
                                <input type="checkbox" checked={seoForm.externalLinking} onChange={e => setSeoForm(f => ({ ...f, externalLinking: e.target.checked }))} style={{ accentColor: "#4F46E5", width: 15, height: 15 }} />
                                External Linking
                              </label>
                              {seoForm.externalLinking && <textarea className="tmd-input" style={{ height: 72, resize: "vertical" }} placeholder="Describe external linking task…" value={seoForm.externalLinkingTask} onChange={e => setSeoForm(f => ({ ...f, externalLinkingTask: e.target.value }))} />}
                            </div>
                          </>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div><label style={LBL}>Priority</label><select className="tmd-select" value={seoForm.priority} onChange={e => setSeoForm(f => ({ ...f, priority: e.target.value }))}>{PRIORITIES_LIST.map(p => <option key={p} value={p}>{PRIORITY_META_C[p].label}</option>)}</select></div>
                          <div><label style={LBL}>Assigned To</label><select className="tmd-select" value={seoForm.assignedTo} onChange={e => setSeoForm(f => ({ ...f, assignedTo: e.target.value }))}><option value="">Unassigned</option>{(dmEmployees.length > 0 ? dmEmployees : employees).map(emp => { const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim(); return <option key={emp._id} value={emp._id}>{n || "Employee"}</option>; })}</select></div>
                        </div>
                        <div>
                          <label style={LBL}>Due Date</label>
                          <input type="date" className="tmd-input" value={seoForm.dueDate} onChange={e => setSeoForm(f => ({ ...f, dueDate: e.target.value }))} />
                          {seoForm.dueDate && <div style={{ fontSize: 11, color: "#4F46E5", fontWeight: 700, marginTop: 5 }}><i className="bi bi-calendar-check me-1" />{seoDayName(seoForm.dueDate)}</div>}
                          {isBlog && (selectedBrand?.seoSettings?.blogSchedule || []).length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 5 }}>Brand schedule — pick a day</div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {BLOG_SCHED_DAY_ORDER.filter(d => (selectedBrand.seoSettings.blogSchedule || []).includes(d)).map(day => {
                                  const date = nextDateForDay(day);
                                  const isSelected = seoForm.dueDate === date;
                                  return (
                                    <button key={day} type="button" onClick={() => setSeoForm(f => ({ ...f, dueDate: date }))}
                                      style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: isSelected ? "#6366F1" : "#EEF2FF", color: isSelected ? "#fff" : "#4F46E5", border: `1.5px solid ${isSelected ? "#6366F1" : "#C7D2FE"}`, transition: "all .12s" }}>
                                      {day} · {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        {(isBlog || isOnPage || isBacklinks) && <div><label style={LBL}>Notes</label><textarea className="tmd-input" style={{ height: 60, resize: "vertical" }} placeholder="Additional notes…" value={seoForm.description} onChange={e => setSeoForm(f => ({ ...f, description: e.target.value }))} /></div>}
                      </div>
                    );
                  })()}

                  {/* ══ ADS / BRANDING ══ */}
                  {["ads","branding"].includes(createMode) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ background: createMode === "ads" ? "#FFFBEB" : "#FDF2F8", border: `1px solid ${createMode === "ads" ? "#FDE68A" : "#F9A8D4"}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", display: "flex", gap: 8 }}>
                        <span>{createMode === "ads" ? "📢" : "🎨"}</span>
                        {createMode === "ads" ? `Ad task for ${selectedBrand?.name || "this brand"}` : `Branding task for ${selectedBrand?.name || "this brand"}`}
                      </div>
                      <div><label style={LBL}>Title <span style={{ color: "#EF4444" }}>*</span></label><input className="tmd-input" placeholder="Task title" value={genForm.title} onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))} /></div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div><label style={LBL}>Priority</label><select className="tmd-select" value={genForm.priority} onChange={e => setGenForm(f => ({ ...f, priority: e.target.value }))}>{PRIORITIES_LIST.map(p => <option key={p} value={p}>{PRIORITY_META_C[p].label}</option>)}</select></div>
                        <div><label style={LBL}>Assigned To</label><select className="tmd-select" value={genForm.assignedTo} onChange={e => setGenForm(f => ({ ...f, assignedTo: e.target.value }))}><option value="">Unassigned</option>{employees.map(emp => { const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim(); return <option key={emp._id} value={emp._id}>{n || "Employee"}</option>; })}</select></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div><label style={LBL}>Due Date</label><input type="date" className="tmd-input" value={genForm.dueDate} onChange={e => setGenForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
                        <div><label style={LBL}>Est. Hours</label><input type="number" className="tmd-input" placeholder="0" min="0" value={genForm.estimatedHours} onChange={e => setGenForm(f => ({ ...f, estimatedHours: e.target.value }))} /></div>
                      </div>
                      <div><label style={LBL}>Description</label><textarea className="tmd-input" style={{ height: 70, resize: "vertical" }} placeholder="Task details…" value={genForm.description} onChange={e => setGenForm(f => ({ ...f, description: e.target.value }))} /></div>
                    </div>
                  )}

                  {/* ══ GENERAL ══ */}
                  {createMode === "general" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div><label style={LBL}>Title <span style={{ color: "#EF4444" }}>*</span></label><input className="tmd-input" placeholder="Task title" value={genForm.title} onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))} /></div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div><label style={LBL}>Priority</label><select className="tmd-select" value={genForm.priority} onChange={e => setGenForm(f => ({ ...f, priority: e.target.value }))}>{PRIORITIES_LIST.map(p => <option key={p} value={p}>{PRIORITY_META_C[p].label}</option>)}</select></div>
                        <div><label style={LBL}>Assigned To</label><select className="tmd-select" value={genForm.assignedTo} onChange={e => setGenForm(f => ({ ...f, assignedTo: e.target.value }))}><option value="">Unassigned</option>{employees.map(emp => { const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim(); return <option key={emp._id} value={emp._id}>{n || "Employee"}</option>; })}</select></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div><label style={LBL}>Project</label><select className="tmd-select" value={genForm.projectId} onChange={e => setGenForm(f => ({ ...f, projectId: e.target.value, sprintId: "" }))}><option value="">No project</option>{projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
                        <div><label style={LBL}>Sprint</label><select className="tmd-select" value={genForm.sprintId} disabled={!genForm.projectId} onChange={e => setGenForm(f => ({ ...f, sprintId: e.target.value }))}><option value="">No sprint</option>{sprints.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div><label style={LBL}>Due Date</label><input type="date" className="tmd-input" value={genForm.dueDate} onChange={e => setGenForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
                        <div><label style={LBL}>Est. Hours</label><input type="number" className="tmd-input" placeholder="0" min="0" value={genForm.estimatedHours} onChange={e => setGenForm(f => ({ ...f, estimatedHours: e.target.value }))} /></div>
                      </div>
                      <div><label style={LBL}>Description</label><textarea className="tmd-input" style={{ height: 80, resize: "vertical" }} placeholder="Task description…" value={genForm.description} onChange={e => setGenForm(f => ({ ...f, description: e.target.value }))} /></div>
                    </div>
                  )}

                </form>
              </div>

              <div className="tmd-drawer-footer">
                <button type="button" className="tmd-btn tmd-btn-ghost" onClick={closeCreateModal}>Cancel</button>
                {createMode !== "website" && (
                  <button type="submit" form="create-task-form-list" className="tmd-btn tmd-btn-primary" disabled={submitting}>
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

      {/* ════ STAGE EDITOR MODAL ════ */}
      {stageModal && stageTask && (
        <div className="tl-overlay" onClick={() => setStageModal(false)}>
          <div className="tl-modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: STAGE_COLORS[stageIdx], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{stageIdx + 1}</div>
                <h6 style={{ margin: 0, fontWeight: 800, color: "#1E293B", fontSize: 15 }}>Edit Stage S{stageIdx + 1}</h6>
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#64748B" }} onClick={() => setStageModal(false)}>✕</button>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", marginBottom: 14, borderLeft: `3px solid ${STAGE_COLORS[stageIdx]}` }}>
                <div style={{ fontSize: 10.5, color: "#94A3B8", marginBottom: 3 }}>Task</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#4F46E5", fontSize: 14 }}>
                  {stageTask.taskId || `#${stageTask._id?.slice(-4).toUpperCase()}`} · {stageTask.nomenclature || stageTask.title}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="tl-field-label">Stage Name</label>
                <input className="tl-field-input" value={stageForm.name} onChange={e => setStageForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="tl-field-label">Assignees · {["Content","Production","Design/Editing","Digital Mktg"][stageIdx]}</label>
                <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, maxHeight: 130, overflowY: "auto" }}>
                  {filterByDept(employees, STAGE_DEPT_KEYWORDS[stageIdx]).map((emp, ei, arr) => {
                    const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                    const checked = stageForm.assignedTo.includes(emp._id);
                    return (
                      <label key={emp._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer", borderBottom: ei < arr.length - 1 ? "1px solid #F8FAFC" : "none", background: checked ? STAGE_COLORS[stageIdx] + "12" : "transparent" }}>
                        <input type="checkbox" checked={checked} style={{ accentColor: STAGE_COLORS[stageIdx], width: 14, height: 14 }}
                          onChange={e => setStageForm(f => ({ ...f, assignedTo: e.target.checked ? [...f.assignedTo, emp._id] : f.assignedTo.filter(id => id !== emp._id) }))} />
                        <span style={{ fontSize: 13, color: checked ? "#1E293B" : "#374151", fontWeight: checked ? 700 : 400 }}>{n || "Employee"}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="tl-field-label">
                  Deadline {stageForm.assignedTo.length > 0 && <span style={{ color: "#EF4444" }}>*</span>}
                </label>
                <input type="datetime-local" className="tl-field-input" value={stageForm.deadline}
                  style={{ borderColor: stageForm.assignedTo.length > 0 && !stageForm.deadline ? "#FCA5A5" : "" }}
                  onChange={e => setStageForm(f => ({ ...f, deadline: e.target.value }))} />
                {stageForm.assignedTo.length > 0 && !stageForm.deadline && (
                  <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>Required — stage has assignees</div>
                )}
              </div>
              {(() => {
                const stg = stageTask?.stages?.[stageIdx] || {};
                if (stg.done && !stg.approved && !stg.rejected) return (
                  <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, color: "#B45309", fontSize: 13, marginBottom: 8 }}><i className="bi bi-hourglass-split me-2" />Pending Review</div>
                    {stg.proofUrls?.length > 0 && stg.proofUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 11, color: "#4F46E5", marginBottom: 2 }}><i className="bi bi-link-45deg" />{url}</a>
                    ))}
                    {!stageRejectMode ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={approveStage} disabled={stageSaving} style={{ flex: 1, background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          <i className="bi bi-check2-circle me-1" />Approve
                        </button>
                        <button onClick={() => setStageRejectMode(true)} style={{ flex: 1, background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 8, padding: "8px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          <i className="bi bi-x-circle me-1" />Reject
                        </button>
                      </div>
                    ) : (
                      <div>
                        <textarea placeholder="Rejection reason…" value={stageRejectReason} onChange={e => setStageRejectReason(e.target.value)} style={{ width: "100%", padding: "8px", border: "1.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, resize: "vertical", minHeight: 60, marginBottom: 6, outline: "none", fontFamily: "inherit" }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setStageRejectMode(false); setStageRejectReason(""); }} style={{ flex: 1, background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 8, padding: "7px 0", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                          <button onClick={rejectStage} disabled={stageSaving || !stageRejectReason.trim()} style={{ flex: 1, background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "7px 0", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: !stageRejectReason.trim() ? 0.5 : 1 }}>Confirm Reject</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
                if (stg.approved) return (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#15803D", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span><i className="bi bi-check-circle-fill me-2" />Approved</span>
                      <button
                        onClick={async () => {
                          if (!confirm("Reset this stage for re-review? The employee will need to re-submit.")) return;
                          setStageSaving(true);
                          try {
                            const cur = stageTask.stages?.[stageIdx] || {};
                            const stages = buildStages(stageTask, stageIdx, { ...cur, done: false, doneAt: null, approved: false, rejected: false, rejectReason: "", proofUrls: cur.proofUrls || [] });
                            const prevStage = STAGE_KEYS[Math.max(0, stageIdx)];
                            await fetch(`/api/admin/tasks/${stageTask._id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages, stage: prevStage, status: "in_progress", performedByName: adminUser?.name || "Admin" }) });
                            toast.success("Stage reset for re-review");
                            setStageModal(false);
                            fetchTasks();
                          } catch { toast.error("Failed to reset"); }
                          finally { setStageSaving(false); }
                        }}
                        disabled={stageSaving}
                        style={{ fontSize: 11, fontWeight: 700, background: "#FEF3C7", color: "#B45309", border: "1.5px solid #FDE68A", borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>
                        <i className="bi bi-arrow-counterclockwise me-1" />Re-review
                      </button>
                    </div>
                  </div>
                );
                if (stg.rejected) return <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}><i className="bi bi-x-circle-fill me-2" />Rejected</div>{stg.rejectReason && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 3 }}>Reason: {stg.rejectReason}</div>}</div>;
                return null;
              })()}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
                <button style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => setStageModal(false)}>Cancel</button>
                <button style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={saveStage} disabled={stageSaving}>
                  {stageSaving ? <div className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> : <i className="bi bi-check2" />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
