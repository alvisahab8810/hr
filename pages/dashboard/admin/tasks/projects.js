import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const PHASES = [
  { key: "uiux",        label: "UI/UX Design",  short: "UI/UX",  color: "#7C3AED", bg: "#F5F3FF", icon: "bi-palette"          },
  { key: "development", label: "Development",    short: "Dev",    color: "#1D4ED8", bg: "#EFF6FF", icon: "bi-code-slash"       },
  { key: "testing",     label: "Testing",        short: "Testing",color: "#B45309", bg: "#FFFBEB", icon: "bi-bug"              },
  { key: "launch",      label: "Launch",         short: "Launch", color: "#059669", bg: "#ECFDF5", icon: "bi-rocket-takeoff"   },
];
const PHASE_MAP = Object.fromEntries(PHASES.map(p => [p.key, p]));

const SPRINT_STATUS = {
  planned:   { label: "Planned",   color: "#6B7280", bg: "#F3F4F6" },
  active:    { label: "Active",    color: "#1D4ED8", bg: "#EFF6FF" },
  completed: { label: "Completed", color: "#059669", bg: "#ECFDF5" },
  cancelled: { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2" },
};

const PROJ_STATUS = {
  active:    { label: "Active",    color: "#059669", bg: "#ECFDF5" },
  on_hold:   { label: "On Hold",   color: "#D97706", bg: "#FFFBEB" },
  completed: { label: "Completed", color: "#6366F1", bg: "#EEF2FF" },
  cancelled: { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2" },
};

const FEAT_STATUS = [
  { key: "todo",        label: "To Do",      color: "#6B7280", bg: "#F3F4F6" },
  { key: "in_progress", label: "In Progress",color: "#1D4ED8", bg: "#EFF6FF" },
  { key: "review",      label: "Review",     color: "#D97706", bg: "#FFFBEB" },
  { key: "completed",   label: "Done",       color: "#059669", bg: "#ECFDF5" },
  { key: "blocked",     label: "Blocked",    color: "#DC2626", bg: "#FEF2F2" },
];
const FEAT_STATUS_MAP = Object.fromEntries(FEAT_STATUS.map(s => [s.key, s]));

const BOARD_COLS = [
  { key: "todo",        label: "Backlog",     color: "#6B7280", bg: "#F3F4F6" },
  { key: "in_progress", label: "In Progress", color: "#1D4ED8", bg: "#EFF6FF" },
  { key: "review",      label: "Review",      color: "#D97706", bg: "#FFFBEB" },
  { key: "completed",   label: "Done",        color: "#059669", bg: "#ECFDF5" },
];

function empName(emp) {
  if (!emp) return "—";
  const fn = emp.personal?.firstName || emp.firstName || "";
  const ln = emp.personal?.lastName  || emp.lastName  || "";
  return `${fn} ${ln}`.trim() || emp.email || "—";
}

function empInitials(emp) {
  if (!emp) return "?";
  const fn = emp.personal?.firstName || emp.firstName || "?";
  const ln = emp.personal?.lastName  || emp.lastName  || "";
  return `${fn[0]}${ln[0] || ""}`.toUpperCase();
}

function toDateInput(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  return dt.toISOString().slice(0, 10);
}

function toDateTimeInput(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function AvatarCircle({ emp, size = 28, colors = ["#6366F1","#8B5CF6","#EC4899","#F59E0B","#10B981","#3B82F6"] }) {
  const idx = empName(emp).charCodeAt(0) % colors.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: emp?.personal?.avatar ? "transparent" : colors[idx],
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
      border: "2px solid #fff", flexShrink: 0, overflow: "hidden",
    }}>
      {emp?.personal?.avatar
        ? <img src={emp.personal.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : empInitials(emp)
      }
    </div>
  );
}

export default function WebProjectsPage() {
  const [projects,      setProjects]      = useState([]);
  const [employees,     setEmployees]     = useState([]);
  const [selectedId,    setSelectedId]    = useState(null);
  const [sprints,       setSprints]       = useState([]);
  const [features,      setFeatures]      = useState({});  // sprintId -> []
  const [expandedSp,    setExpandedSp]    = useState(null);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [loading,       setLoading]       = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [allFeatLoaded, setAllFeatLoaded] = useState(false);

  const [showNewProject,  setShowNewProject]  = useState(false);
  const [showAddSprint,   setShowAddSprint]   = useState(false);
  const [showAddFeature,  setShowAddFeature]  = useState(false);
  const [editTeamPhase,   setEditTeamPhase]   = useState(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [webBrands,       setWebBrands]       = useState([]);
  const [brandFilter,     setBrandFilter]     = useState("");

  const [showEditProject, setShowEditProject] = useState(false);
  const [showEditSprint,  setShowEditSprint]  = useState(false);
  const [editingSprintId, setEditingSprintId] = useState(null);
  const [showEditFeature, setShowEditFeature] = useState(false);
  const [editingFeature,  setEditingFeature]  = useState(null); // { id, sprintKey }

  const [pendingReviews,  setPendingReviews]  = useState([]);
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const [projectForm, setProjectForm] = useState({ name: "", description: "", status: "active", currentPhase: "development", startDate: "", endDate: "", clientId: "", brandId: "" });
  const [sprintForm,  setSprintForm]  = useState({ name: "", durationDays: 14, startDate: "", endDate: "", phase: "development" });
  const [featureForm, setFeatureForm] = useState({ title: "", sprintId: "", assignedTo: "", dueDate: "" });
  const [editProjectForm, setEditProjectForm] = useState({ name: "", description: "", status: "active", currentPhase: "development", startDate: "", endDate: "" });
  const [editSprintForm,  setEditSprintForm]  = useState({ name: "", status: "planned", phase: "development", durationDays: "", startDate: "", endDate: "" });
  const [editFeatureForm, setEditFeatureForm] = useState({ title: "", sprintId: "", assignedTo: "", dueDate: "", status: "todo" });
  const [teamMembers, setTeamMembers] = useState([]);

  const selectedProject = projects.find(p => p._id === selectedId) || null;
  const allFeatures     = Object.values(features).flat();
  const totalFeats      = allFeatures.length;
  const doneFeats       = allFeatures.filter(f => f.status === "completed").length;

  /* ── Initial load ── */
  useEffect(() => {
    fetchProjects();
    fetchEmployees();
    fetchWebBrands();
    fetchPendingReviews();
  }, []);

  /* ── Dynamic approval notifications: poll for features employees submitted for review ── */
  useEffect(() => {
    const t = setInterval(fetchPendingReviews, 30000);
    const onFocus = () => fetchPendingReviews();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, []);

  const fetchPendingReviews = async () => {
    try {
      const r = await fetch("/api/admin/features?status=review", { credentials: "include" });
      const d = await r.json();
      if (d.success) setPendingReviews(d.features || []);
    } catch {}
  };

  const fetchWebBrands = async () => {
    try {
      const r = await fetch("/api/admin/brands", { credentials: "include" });
      const d = await r.json();
      if (d.success) setWebBrands(d.brands || []);
    } catch {}
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/projects", { credentials: "include" });
      const d = await r.json();
      if (d.success) {
        setProjects(d.projects || []);
        if (d.projects?.length > 0) selectProject(d.projects[0]._id, true);
      }
    } catch { toast.error("Failed to load projects"); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const r = await fetch("/api/admin/assets/employees", { credentials: "include" });
      const d = await r.json();
      if (d.success) setEmployees(d.employees || []);
    } catch {}
  };

  /* ── Local progress bumps (kept in sync with server-computed progress) ── */
  const bumpProjectProgress = (deltaTotal, deltaDone) => {
    setProjects(ps => ps.map(p => p._id === selectedId ? {
      ...p,
      progress: { total: Math.max(0, (p.progress?.total || 0) + deltaTotal), done: Math.max(0, (p.progress?.done || 0) + deltaDone) },
    } : p));
  };
  const bumpSprintProgress = (sprintId, deltaTotal, deltaDone) => {
    setSprints(ss => ss.map(s => s._id === sprintId ? {
      ...s,
      progress: { total: Math.max(0, (s.progress?.total || 0) + deltaTotal), done: Math.max(0, (s.progress?.done || 0) + deltaDone) },
    } : s));
  };

  const selectProject = async (id, force = false) => {
    if (selectedId === id && !force) return;
    setSelectedId(id);
    setActiveTab("overview");
    setExpandedSp(null);
    setFeatures({});
    setAllFeatLoaded(false);
    setLoadingDetail(true);
    try {
      const r = await fetch(`/api/admin/sprints?projectId=${id}`, { credentials: "include" });
      const d = await r.json();
      if (d.success) setSprints(d.sprints || []);
    } catch {}
    setLoadingDetail(false);
  };

  const loadFeatures = async (sprintId) => {
    if (features[sprintId]) return;
    try {
      const r = await fetch(`/api/admin/features?sprintId=${sprintId}`, { credentials: "include" });
      const d = await r.json();
      if (d.success) setFeatures(f => ({ ...f, [sprintId]: d.features || [] }));
    } catch {}
  };

  const loadAllFeatures = useCallback(async () => {
    if (allFeatLoaded || !selectedId) return;
    try {
      const r = await fetch(`/api/admin/features?projectId=${selectedId}`, { credentials: "include" });
      const d = await r.json();
      if (d.success) {
        const grp = {};
        (d.features || []).forEach(f => {
          const key = (typeof f.sprintId === "object" ? f.sprintId?._id : f.sprintId) || "none";
          if (!grp[key]) grp[key] = [];
          grp[key].push(f);
        });
        setFeatures(grp);
        setAllFeatLoaded(true);
      }
    } catch {}
  }, [allFeatLoaded, selectedId]);

  useEffect(() => {
    if (activeTab === "board") loadAllFeatures();
  }, [activeTab]);

  const toggleSprint = (sprintId) => {
    if (expandedSp === sprintId) { setExpandedSp(null); return; }
    setExpandedSp(sprintId);
    loadFeatures(sprintId);
  };

  /* ── Handlers ── */
  const handleCreateProject = async () => {
    if (!projectForm.brandId) return toast.error("Please select a client brand");
    if (!projectForm.name.trim()) return toast.error("Project name required");
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/projects", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Project created!");
        setProjects(ps => [d.project, ...ps]);
        setShowNewProject(false);
        setProjectForm({ name: "", description: "", status: "active", currentPhase: "development", startDate: "", endDate: "", clientId: "", brandId: "" });
        selectProject(d.project._id, true);
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleAddSprint = async () => {
    if (!sprintForm.name.trim()) return toast.error("Sprint name required");
    if (!sprintForm.endDate)     return toast.error("End date (deadline) is required");
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/sprints", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        sprintForm.name,
          phase:       sprintForm.phase,
          durationDays:sprintForm.durationDays ? Number(sprintForm.durationDays) : null,
          startDate:   sprintForm.startDate || null,
          endDate:     sprintForm.endDate   || null,
          projectId:   selectedId,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Sprint created!");
        setSprints(s => [d.sprint, ...s]);
        setShowAddSprint(false);
        setSprintForm({ name: "", durationDays: 14, startDate: "", endDate: "", phase: "development" });
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleAddFeature = async () => {
    if (!featureForm.title.trim()) return toast.error("Feature title required");
    if (!featureForm.sprintId)     return toast.error("Select a sprint");
    if (!featureForm.dueDate)      return toast.error("Deadline is required");
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/features", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:      featureForm.title,
          sprintId:   featureForm.sprintId,
          projectId:  selectedId,
          assignedTo: featureForm.assignedTo || null,
          dueDate:    featureForm.dueDate    || null,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Feature added!");
        const sId = featureForm.sprintId;
        setFeatures(f => ({ ...f, [sId]: [...(f[sId] || []), d.feature] }));
        bumpProjectProgress(1, 0);
        bumpSprintProgress(sId, 1, 0);
        setExpandedSp(sId);
        setShowAddFeature(false);
        setFeatureForm({ title: "", sprintId: "", assignedTo: "", dueDate: "" });
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleUpdateStatus = async (featureId, sprintKey, newStatus) => {
    const prev = (features[sprintKey] || []).find(ft => ft._id === featureId);
    const wasDone = prev?.status === "completed";
    try {
      const r = await fetch(`/api/admin/features/${featureId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const d = await r.json();
      if (d.success) {
        setFeatures(f => ({
          ...f,
          [sprintKey]: (f[sprintKey] || []).map(ft =>
            ft._id === featureId
              ? { ...ft, status: newStatus, statusUpdatedAt: d.feature?.statusUpdatedAt, statusUpdatedBy: d.feature?.statusUpdatedBy }
              : ft
          ),
        }));
        const isDone = newStatus === "completed";
        if (wasDone !== isDone) {
          const delta = isDone ? 1 : -1;
          bumpProjectProgress(0, delta);
          bumpSprintProgress(sprintKey, 0, delta);
        }
        if (newStatus === "review" || prev?.status === "review") fetchPendingReviews();
      }
    } catch {}
  };

  const handleDeleteFeature = async (featureId, sprintKey) => {
    if (!confirm("Delete this feature?")) return;
    const ft = (features[sprintKey] || []).find(f => f._id === featureId);
    try {
      await fetch(`/api/admin/features/${featureId}`, { method: "DELETE", credentials: "include" });
      setFeatures(f => ({ ...f, [sprintKey]: (f[sprintKey] || []).filter(ft => ft._id !== featureId) }));
      bumpProjectProgress(-1, ft?.status === "completed" ? -1 : 0);
      bumpSprintProgress(sprintKey, -1, ft?.status === "completed" ? -1 : 0);
      if (ft?.status === "review") fetchPendingReviews();
      toast.success("Feature deleted");
    } catch {}
  };

  const openEditFeature = (f, sprintKey) => {
    setEditingFeature({ id: f._id, sprintKey });
    setEditFeatureForm({
      title:      f.title || "",
      sprintId:   sprintKey,
      assignedTo: (typeof f.assignedTo === "object" ? f.assignedTo?._id : f.assignedTo) || "",
      dueDate:    toDateTimeInput(f.dueDate),
      status:     f.status || "todo",
    });
    setShowEditFeature(true);
  };

  const handleUpdateFeature = async () => {
    if (!editFeatureForm.title.trim()) return toast.error("Feature title required");
    if (!editingFeature) return;
    const { id, sprintKey: oldSprintKey } = editingFeature;
    const prev = (features[oldSprintKey] || []).find(ft => ft._id === id);
    const wasDone = prev?.status === "completed";
    const newSprintId = editFeatureForm.sprintId || oldSprintKey;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/admin/features/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:      editFeatureForm.title,
          sprintId:   newSprintId,
          assignedTo: editFeatureForm.assignedTo || null,
          dueDate:    editFeatureForm.dueDate || null,
          status:     editFeatureForm.status,
        }),
      });
      const d = await r.json();
      if (d.success) {
        const isDone = editFeatureForm.status === "completed";
        if (newSprintId !== oldSprintKey) {
          setFeatures(f => ({
            ...f,
            [oldSprintKey]: (f[oldSprintKey] || []).filter(ft => ft._id !== id),
            [newSprintId]: [...(f[newSprintId] || []), d.feature],
          }));
          bumpSprintProgress(oldSprintKey, -1, wasDone ? -1 : 0);
          bumpSprintProgress(newSprintId, 1, isDone ? 1 : 0);
        } else {
          setFeatures(f => ({
            ...f,
            [oldSprintKey]: (f[oldSprintKey] || []).map(ft => ft._id === id ? d.feature : ft),
          }));
          if (wasDone !== isDone) bumpSprintProgress(oldSprintKey, 0, isDone ? 1 : -1);
        }
        if (wasDone !== isDone) bumpProjectProgress(0, isDone ? 1 : -1);
        if (prev?.status === "review" || editFeatureForm.status === "review") fetchPendingReviews();
        toast.success("Feature updated!");
        setShowEditFeature(false);
        setEditingFeature(null);
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleSaveTeam = async () => {
    if (!selectedId || !editTeamPhase) return;
    const updated = (selectedProject?.phaseTeams || []).filter(t => t.phase !== editTeamPhase);
    updated.push({ phase: editTeamPhase, members: teamMembers });
    try {
      const r = await fetch(`/api/admin/projects/${selectedId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseTeams: updated }),
      });
      const d = await r.json();
      if (d.success) {
        setProjects(ps => ps.map(p => p._id === selectedId ? { ...p, phaseTeams: updated } : p));
        setEditTeamPhase(null);
        toast.success("Team updated!");
      }
    } catch { toast.error("Failed to save team"); }
  };

  /* ── Edit / Delete Project ── */
  const openEditProject = () => {
    if (!selectedProject) return;
    setEditProjectForm({
      name:         selectedProject.name || "",
      description:  selectedProject.description || "",
      status:       selectedProject.status || "active",
      currentPhase: selectedProject.currentPhase || "development",
      startDate:    toDateInput(selectedProject.startDate),
      endDate:      toDateInput(selectedProject.endDate),
    });
    setShowEditProject(true);
  };

  const handleUpdateProject = async () => {
    if (!editProjectForm.name.trim()) return toast.error("Project name required");
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/admin/projects/${selectedId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProjectForm),
      });
      const d = await r.json();
      if (d.success) {
        setProjects(ps => ps.map(p => p._id === selectedId ? { ...p, ...d.project, progress: p.progress } : p));
        setShowEditProject(false);
        toast.success("Project updated!");
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    if (!confirm(`Delete project "${selectedProject.name}"? This will also delete its sprints.`)) return;
    try {
      const r = await fetch(`/api/admin/projects/${selectedId}`, { method: "DELETE", credentials: "include" });
      const d = await r.json();
      if (d.success) {
        const remaining = projects.filter(p => p._id !== selectedId);
        setProjects(remaining);
        setSprints([]);
        setFeatures({});
        toast.success("Project deleted");
        if (remaining.length > 0) selectProject(remaining[0]._id, true);
        else setSelectedId(null);
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
  };

  /* ── Edit / Delete Sprint ── */
  const openEditSprint = (sp) => {
    setEditingSprintId(sp._id);
    setEditSprintForm({
      name:         sp.name || "",
      status:       sp.status || "planned",
      phase:        sp.phase || "development",
      durationDays: sp.durationDays || "",
      startDate:    toDateTimeInput(sp.startDate),
      endDate:      toDateTimeInput(sp.endDate),
    });
    setShowEditSprint(true);
  };

  const handleUpdateSprint = async () => {
    if (!editSprintForm.name.trim()) return toast.error("Sprint name required");
    if (!editSprintForm.endDate)     return toast.error("End date (deadline) is required");
    if (!editingSprintId) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/admin/sprints/${editingSprintId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         editSprintForm.name,
          status:       editSprintForm.status,
          phase:        editSprintForm.phase,
          durationDays: editSprintForm.durationDays ? Number(editSprintForm.durationDays) : null,
          startDate:    editSprintForm.startDate || null,
          endDate:      editSprintForm.endDate   || null,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setSprints(ss => ss.map(s => s._id === editingSprintId ? { ...s, ...d.sprint, progress: s.progress } : s));
        setShowEditSprint(false);
        setEditingSprintId(null);
        toast.success("Sprint updated!");
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleDeleteSprint = async (sprintId) => {
    const sp = sprints.find(s => s._id === sprintId);
    if (!confirm(`Delete sprint "${sp?.name || ""}"? Its features will remain but become unassigned from this sprint.`)) return;
    try {
      const r = await fetch(`/api/admin/sprints/${sprintId}`, { method: "DELETE", credentials: "include" });
      const d = await r.json();
      if (d.success) {
        bumpProjectProgress(-(sp?.progress?.total || 0), -(sp?.progress?.done || 0));
        setSprints(ss => ss.filter(s => s._id !== sprintId));
        setFeatures(f => { const nf = { ...f }; delete nf[sprintId]; return nf; });
        if (expandedSp === sprintId) setExpandedSp(null);
        toast.success("Sprint deleted");
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
  };

  /* ── Sub-renders ── */
  const sprintsByPhase = (phaseKey) => sprints.filter(s => (s.phase || "development") === phaseKey);

  function FeatureTable({ sprint }) {
    const sprintKey = sprint._id;
    const fts = features[sprintKey] || [];
    const isExp = expandedSp === sprintKey;
    const ss = SPRINT_STATUS[sprint.status] || {};
    const ph = PHASE_MAP[sprint.phase || "development"] || {};
    const loaded = !!features[sprintKey];
    const spTotal = loaded ? fts.length : (sprint.progress?.total || 0);
    const spDone  = loaded ? fts.filter(f => f.status === "completed").length : (sprint.progress?.done || 0);

    return (
      <div className="wp-sprint-item">
        <div className="wp-sprint-header" onClick={() => toggleSprint(sprintKey)}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ss.color || "#94A3B8", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: "#1E293B" }}>{sprint.name}</span>
            {sprint.durationDays && (
              <span style={{ marginLeft: 8, fontSize: 11, color: "#94A3B8" }}>{sprint.durationDays} days</span>
            )}
            {sprint.endDate && (
              <span style={{ marginLeft: 8, fontSize: 10.5, color: new Date(sprint.endDate) < new Date() && sprint.status !== "completed" ? "#EF4444" : "#94A3B8", fontWeight: 600 }}>
                · Deadline {new Date(sprint.endDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" })} {new Date(sprint.endDate).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
              </span>
            )}
            {spTotal > 0 && (
              <span style={{ marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 50, height: 4, borderRadius: 10, background: "#E5E7EB", overflow: "hidden", display: "inline-block" }}>
                  <span style={{ height: "100%", display: "block", width: `${Math.round(spDone / spTotal * 100)}%`, background: "linear-gradient(90deg,#6366F1,#8B5CF6)", borderRadius: 10 }} />
                </span>
                <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700 }}>{spDone}/{spTotal}</span>
              </span>
            )}
          </div>
          <span className="wp-badge" style={{ background: ss.bg, color: ss.color, borderColor: "transparent" }}>{ss.label}</span>
          <span className="wp-badge" style={{ background: ph.bg, color: ph.color, borderColor: "transparent", fontSize: 10 }}>
            <i className={`bi ${ph.icon}`} style={{ fontSize: 9 }} /> {ph.short}
          </span>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{fts.length} features</span>
          <button
            style={{ border: "none", background: "none", cursor: "pointer", color: "#6366F1", padding: 4 }}
            onClick={e => { e.stopPropagation(); openEditSprint(sprint); }}
            title="Edit sprint"
          >
            <i className="bi bi-pencil" style={{ fontSize: 12 }} />
          </button>
          <button
            style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}
            onClick={e => { e.stopPropagation(); handleDeleteSprint(sprintKey); }}
            title="Delete sprint"
          >
            <i className="bi bi-trash" style={{ fontSize: 12 }} />
          </button>
          <i className={`bi bi-chevron-${isExp ? "up" : "down"}`} style={{ color: "#94A3B8", fontSize: 12 }} />
        </div>

        {isExp && (
          <div style={{ borderTop: "1px solid #F1F5F9" }}>
            {fts.length === 0 ? (
              <div style={{ padding: "16px 20px", fontSize: 12, color: "#94A3B8" }}>
                No features yet.{" "}
                <button style={{ background: "none", border: "none", color: "#6366F1", fontWeight: 600, cursor: "pointer", fontSize: 12 }}
                  onClick={() => { setFeatureForm({ title: "", sprintId: sprintKey, assignedTo: "", dueDate: "" }); setShowAddFeature(true); }}>
                  + Add Feature
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 150px 160px auto", gap: 8, padding: "8px 16px", borderBottom: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                  {["ID","Feature","Assignee","Status",""].map((h, i) => (
                    <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</span>
                  ))}
                </div>
                {fts.map((f, idx) => {
                  const fs = FEAT_STATUS_MAP[f.status] || FEAT_STATUS_MAP.todo;
                  const spKey = (typeof f.sprintId === "object" ? f.sprintId?._id : f.sprintId) || sprintKey;
                  const dept = f.assignedTo?.professional?.department || "";
                  const isTechDev = dept && /tech|dev|engineer|software|web/i.test(dept);
                  const updater = f.statusUpdatedBy;
                  const updatedAt = f.statusUpdatedAt ? new Date(f.statusUpdatedAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short" }) : null;
                  return (
                    <div key={f._id} className="wp-feature-row"
                      style={{ gridTemplateColumns: "80px 1fr 150px 160px auto", borderTop: idx > 0 ? "1px solid #F8FAFC" : "none" }}>
                      <span className="f-id">{f.taskId || `F-${101 + idx}`}</span>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#1E293B" }}>{f.title}</span>
                        {(() => {
                          const dl = f.dueDate || sprint.endDate || selectedProject?.endDate;
                          const src = f.dueDate ? "Due" : sprint.endDate ? "Sprint ends" : "Project deadline";
                          return dl ? (
                            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>
                              {src} {new Date(dl).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" })}{" "}{new Date(dl).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {f.assignedTo ? <AvatarCircle emp={f.assignedTo} size={22} /> : null}
                        <div>
                          <div style={{ fontSize: 11.5, color: f.assignedTo ? "#374151" : "#94A3B8" }}>
                            {f.assignedTo ? empName(f.assignedTo) : "Unassigned"}
                          </div>
                          {dept && (
                            <div style={{ fontSize: 10, color: isTechDev ? "#6366F1" : "#94A3B8", fontWeight: isTechDev ? 700 : 400 }}>
                              {dept}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        {f.status === "review" ? (
                          <Link href={`/dashboard/admin/tasks/${f._id}`} style={{
                            display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7,
                            fontSize: 11.5, fontWeight: 700, color: fs.color, background: fs.bg,
                            border: `1.5px solid ${fs.color}30`, textDecoration: "none",
                          }}>
                            <i className="bi bi-hourglass-split" style={{ fontSize: 11 }} />{fs.label} →
                          </Link>
                        ) : (
                          <span style={{
                            display: "inline-block", padding: "4px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 700,
                            color: fs.color, background: fs.bg, border: `1.5px solid ${fs.color}30`,
                          }}>
                            {fs.label}
                          </span>
                        )}
                        {(updater || updatedAt) && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                            {updater && <AvatarCircle emp={updater} size={14} />}
                            <span style={{ fontSize: 9.5, color: "#94A3B8" }}>
                              {updater ? empName(updater) : ""}
                              {updatedAt ? ` · ${updatedAt}` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button
                          style={{ border: "none", background: "none", cursor: "pointer", color: "#6366F1", padding: 4 }}
                          onClick={() => openEditFeature(f, spKey)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil" style={{ fontSize: 12 }} />
                        </button>
                        <button
                          style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}
                          onClick={() => handleDeleteFeature(f._id, spKey)}
                          title="Delete"
                        >
                          <i className="bi bi-trash" style={{ fontSize: 12 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div style={{ padding: "8px 16px", borderTop: "1px solid #F1F5F9" }}>
                  <button
                    style={{ background: "none", border: "none", color: "#6366F1", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={() => { setFeatureForm({ title: "", sprintId: sprintKey, assignedTo: "", dueDate: "" }); setShowAddFeature(true); }}
                  >
                    <i className="bi bi-plus-circle" /> Add Feature
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  function OverviewTab() {
    return (
      <div style={{ padding: 20 }}>
        {/* Team Allotment per Phase */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 14 }}>
            <i className="bi bi-people-fill" style={{ color: "#6366F1", marginRight: 6 }} />
            Team Allotment per Phase
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {PHASES.map(ph => {
              const pt = selectedProject?.phaseTeams?.find(t => t.phase === ph.key);
              const members = pt?.members || [];
              return (
                <div key={ph.key} className="wp-phase-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: ph.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className={`bi ${ph.icon}`} style={{ color: ph.color, fontSize: 15 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: "#1E293B" }}>{ph.label}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>{members.length} member{members.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 10, minHeight: 28 }}>
                    {members.length === 0 ? (
                      <span style={{ fontSize: 11, color: "#CBD5E1" }}>No members assigned</span>
                    ) : (
                      <div style={{ display: "flex", gap: -6 }}>
                        {members.slice(0, 4).map((m, i) => (
                          <div key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                            <AvatarCircle emp={m} size={26} />
                          </div>
                        ))}
                        {members.length > 4 && (
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#6B7280", border: "2px solid #fff", marginLeft: -8 }}>
                            +{members.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button className="wp-btn wp-btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "6px 10px" }}
                    onClick={() => {
                      setTeamMembers(members.map(m => typeof m === "object" ? m._id : m));
                      setEditTeamPhase(ph.key);
                    }}>
                    <i className="bi bi-pencil" /> Edit Team
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* All Sprints */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 14 }}>
            <i className="bi bi-lightning-fill" style={{ color: "#F59E0B", marginRight: 6 }} />
            All Sprints
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>{sprints.length}</span>
          </div>
          {sprints.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
              No sprints yet.{" "}
              <button style={{ background: "none", border: "none", color: "#6366F1", fontWeight: 600, cursor: "pointer" }}
                onClick={() => setShowAddSprint(true)}>+ Add Sprint</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sprints.map(sp => {
                const ss = SPRINT_STATUS[sp.status] || {};
                const ph = PHASE_MAP[sp.phase || "development"] || {};
                const loaded = !!features[sp._id];
                const spFts = features[sp._id] || [];
                const doneFts = spFts.filter(f => f.status === "completed").length;
                const spTotal = loaded ? spFts.length : (sp.progress?.total || 0);
                const spDone  = loaded ? doneFts : (sp.progress?.done || 0);
                return (
                  <div key={sp._id} style={{ background: "#FAFAFA", border: "1.5px solid #F1F5F9", borderRadius: 12, padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (spFts.length > 0 || spTotal > 0) ? 8 : 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: ss.color || "#94A3B8", flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#1E293B", flex: 1 }}>{sp.name}</span>
                      <span className="wp-badge" style={{ background: ph.bg, color: ph.color, borderColor: "transparent", fontSize: 10 }}>
                        <i className={`bi ${ph.icon}`} style={{ fontSize: 9 }} /> {ph.short}
                      </span>
                      <span className="wp-badge" style={{ background: ss.bg, color: ss.color, borderColor: "transparent" }}>{ss.label}</span>
                      {sp.durationDays && (
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>{sp.durationDays}d</span>
                      )}
                      {sp.endDate && (
                        <span style={{ fontSize: 10.5, color: new Date(sp.endDate) < new Date() && sp.status !== "completed" ? "#EF4444" : "#6B7280", fontWeight: 600 }}>
                          <i className="bi bi-calendar-event" style={{ marginRight: 3, fontSize: 10 }} />
                          {new Date(sp.endDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" })} {new Date(sp.endDate).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                        </span>
                      )}
                      <button
                        style={{ border: "none", background: "none", cursor: "pointer", color: "#6366F1", padding: 4 }}
                        onClick={() => openEditSprint(sp)} title="Edit sprint"
                      >
                        <i className="bi bi-pencil" style={{ fontSize: 12 }} />
                      </button>
                      <button
                        style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}
                        onClick={() => handleDeleteSprint(sp._id)} title="Delete sprint"
                      >
                        <i className="bi bi-trash" style={{ fontSize: 12 }} />
                      </button>
                      <button
                        style={{ border: "1.5px solid #C7D2FE", background: "#EEF2FF", color: "#6366F1", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                        onClick={() => { setFeatureForm({ title: "", sprintId: sp._id, assignedTo: "", dueDate: "" }); setShowAddFeature(true); }}
                      >
                        <i className="bi bi-plus" /> Feature
                      </button>
                    </div>
                    {spTotal > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: spFts.length > 0 ? 8 : 0 }}>
                        <div className="wp-progress-bar" style={{ flex: 1, margin: 0 }}>
                          <div className="wp-progress-fill" style={{ width: `${Math.round(spDone / spTotal * 100)}%` }} />
                        </div>
                        <span style={{ fontSize: 10.5, color: "#6B7280", fontWeight: 600, flexShrink: 0 }}>{spDone}/{spTotal} done</span>
                      </div>
                    )}
                    {spFts.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                        {spFts.slice(0, 6).map((f, i) => {
                          const fs = FEAT_STATUS_MAP[f.status] || FEAT_STATUS_MAP.todo;
                          return (
                            <span key={f._id} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background: fs.bg, color: fs.color }}>
                              {f.taskId || `F-${101+i}`}
                            </span>
                          );
                        })}
                        {spFts.length > 6 && (
                          <span className="f-pill">+{spFts.length - 6} more</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  function PhaseTab({ phaseKey }) {
    const pSprints = sprintsByPhase(phaseKey);
    const ph = PHASE_MAP[phaseKey] || {};
    return (
      <div style={{ padding: 20 }}>
        {pSprints.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
            <i className={`bi ${ph.icon}`} style={{ fontSize: 36, color: ph.bg === "#F3F4F6" ? "#CBD5E1" : ph.color, opacity: .4 }} />
            <div style={{ marginTop: 12, fontSize: 13 }}>No sprints in {ph.label} phase yet.</div>
            <button className="wp-btn wp-btn-ghost" style={{ marginTop: 12 }}
              onClick={() => { setSprintForm(f => ({ ...f, phase: phaseKey })); setShowAddSprint(true); }}>
              <i className="bi bi-plus" /> Add Sprint
            </button>
          </div>
        ) : (
          pSprints.map(sp => <FeatureTable key={sp._id} sprint={sp} />)
        )}
      </div>
    );
  }

  function SprintBoard() {
    if (!allFeatLoaded) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#94A3B8" }}>
          <div className="spinner-border spinner-border-sm text-primary" />
          <div style={{ marginTop: 8, fontSize: 12 }}>Loading features…</div>
        </div>
      );
    }
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {BOARD_COLS.map(col => {
            const cards = allFeatures.filter(f => f.status === col.key);
            return (
              <div key={col.key} className="wp-kanban-col">
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: col.color }}>{col.label}</span>
                  <span style={{ marginLeft: "auto", background: col.bg, color: col.color, borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                    {cards.length}
                  </span>
                </div>
                <div>
                  {cards.map(f => {
                    const sp = sprints.find(s => s._id === (typeof f.sprintId === "object" ? f.sprintId?._id : f.sprintId));
                    return (
                      <div key={f._id} className="wp-kanban-card">
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: "#1E293B", marginBottom: 6 }}>{f.title}</div>
                        {sp && (
                          <div style={{ fontSize: 10.5, color: "#94A3B8", marginBottom: 4 }}>{sp.name}</div>
                        )}
                        {(f.dueDate || sp?.endDate || selectedProject?.endDate) && (
                          <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 6 }}>
                            {(() => { const d = new Date(f.dueDate || sp?.endDate || selectedProject?.endDate); return `${f.dueDate ? "Due" : sp?.endDate ? "Sprint ends" : "Project deadline"} ${d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" })} ${d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}`; })()}
                          </div>
                        )}
                        {f.assignedTo && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: f.status === "review" ? 6 : 0 }}>
                            <AvatarCircle emp={f.assignedTo} size={18} />
                            <span style={{ fontSize: 11, color: "#6B7280" }}>{empName(f.assignedTo)}</span>
                          </div>
                        )}
                        {f.status === "review" && (
                          <Link href={`/dashboard/admin/tasks/${f._id}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 6, background: "#FFFBEB", color: "#D97706", border: "1.5px solid #FDE68A", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                            <i className="bi bi-hourglass-split" style={{ fontSize: 10 }} /> Review
                          </Link>
                        )}
                      </div>
                    );
                  })}
                  {cards.length === 0 && (
                    <div style={{ border: "2px dashed #E5E7EB", borderRadius: 8, padding: "20px 12px", textAlign: "center", color: "#CBD5E1", fontSize: 12 }}>
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const TABS = [
    { key: "overview",     label: "Overview",     icon: "bi-grid-1x2"     },
    { key: "uiux",         label: "UI/UX",        icon: "bi-palette"       },
    { key: "development",  label: "Development",  icon: "bi-code-slash"    },
    { key: "testing",      label: "Testing",      icon: "bi-bug"           },
    { key: "launch",       label: "Launch",       icon: "bi-rocket-takeoff"},
    { key: "board",        label: "Sprint Board", icon: "bi-kanban"        },
  ];

  return (
    <>
      <Head>
        <title>Web Projects — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .wp-project-card{cursor:pointer;background:#fff;border-radius:14px;border:2px solid #F1F5F9;padding:16px;min-width:220px;max-width:270px;flex-shrink:0;transition:all .15s;}
          .wp-project-card:hover{border-color:#C7D2FE;box-shadow:0 4px 16px rgba(99,102,241,.09);}
          .wp-project-card.selected{border-color:#6366F1;background:#FAFAFF;box-shadow:0 4px 20px rgba(99,102,241,.14);}
          .wp-detail{background:#fff;border-radius:16px;border:1.5px solid #F1F5F9;overflow:hidden;}
          .wp-tab{padding:10px 18px;border:none;background:transparent;cursor:pointer;font-size:13px;font-weight:600;color:#94A3B8;border-bottom:2.5px solid transparent;transition:all .15s;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;}
          .wp-tab.active{color:#4F46E5;border-bottom-color:#4F46E5;}
          .wp-tab:hover:not(.active){color:#475569;}
          .wp-phase-card{background:#fff;border-radius:12px;border:1.5px solid #F1F5F9;padding:14px 16px;}
          .wp-sprint-item{border:1.5px solid #F1F5F9;border-radius:12px;margin-bottom:10px;overflow:hidden;}
          .wp-sprint-header{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;background:#fff;}
          .wp-sprint-header:hover{background:#FAFBFF;}
          .wp-feature-row{display:grid;align-items:center;padding:10px 16px;font-size:12.5px;gap:8px;}
          .wp-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
          .wp-btn{border:none;cursor:pointer;border-radius:9px;padding:7px 14px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:5px;transition:all .14s;}
          .wp-btn-primary{background:#4F46E5;color:#fff;}
          .wp-btn-primary:hover{background:#4338CA;}
          .wp-btn-ghost{background:#F1F5F9;color:#475569;}
          .wp-btn-ghost:hover{background:#E2E8F0;}
          .wp-input{padding:8px 12px;border-radius:9px;border:1.5px solid #E5E7EB;font-size:13px;outline:none;width:100%;background:#fff;}
          .wp-input:focus{border-color:#6366F1;}
          .wp-label{font-size:11.5px;font-weight:700;color:#6B7280;display:block;margin-bottom:5px;letter-spacing:.04em;text-transform:uppercase;}
          .wp-overlay{position:fixed;inset:0;background:rgba(15,15,35,.55);backdrop-filter:blur(4px);z-index:1050;display:flex;align-items:center;justify-content:center;padding:16px;}
          .wp-modal{background:#fff;border-radius:20px;width:100%;max-width:440px;box-shadow:0 24px 64px rgba(0,0,0,.18);padding:28px;}
          .wp-modal-lg{max-width:580px;}
          .wp-progress-bar{height:5px;border-radius:10px;background:#E5E7EB;overflow:hidden;margin-top:8px;}
          .wp-progress-fill{height:100%;border-radius:10px;background:linear-gradient(90deg,#6366F1,#8B5CF6);transition:width .4s;}
          .wp-kanban-col{min-width:200px;flex:1;background:#F8FAFC;border-radius:12px;padding:12px;}
          .wp-kanban-card{background:#fff;border-radius:10px;border:1.5px solid #F1F5F9;padding:10px 12px;margin-bottom:8px;}
          .status-select{border:1.5px solid #E5E7EB;border-radius:8px;padding:3px 8px;font-size:11.5px;font-weight:600;outline:none;cursor:pointer;background:#fff;}
          .f-id{font-size:11px;font-weight:700;color:#9CA3AF;font-family:monospace;}
          .f-pill{display:inline-flex;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;background:#EEF2FF;color:#6366F1;margin:1px;}
          .emp-check-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F8FAFC;cursor:pointer;}
          .emp-check-item:last-child{border-bottom:none;}
        `}</style>
      </Head>

      <div className="leaves-management-admin">
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
                <li className="breadcrumb-item active">Web Projects</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              {/* Page header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">
                    <i className="bi bi-kanban" style={{ color: "#6366F1", marginRight: 8 }} />
                    Web Projects
                  </h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                    {projects.length} project{projects.length !== 1 ? "s" : ""}
                    {selectedProject && sprints.length > 0 && ` · ${sprints.length} sprints`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ position: "relative" }}>
                    <button
                      className="wp-btn wp-btn-ghost"
                      style={{ position: "relative" }}
                      onClick={() => setShowReviewPanel(s => !s)}
                      title="Pending approvals"
                    >
                      <i className="bi bi-bell-fill" style={{ color: pendingReviews.length > 0 ? "#D97706" : "#94A3B8" }} />
                      {pendingReviews.length > 0 && (
                        <span style={{
                          position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9,
                          background: "#EF4444", color: "#fff", fontSize: 10.5, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                        }}>
                          {pendingReviews.length}
                        </span>
                      )}
                    </button>
                    {showReviewPanel && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, maxHeight: 380, overflowY: "auto",
                        background: "#fff", borderRadius: 14, border: "1.5px solid #F1F5F9", boxShadow: "0 16px 40px rgba(0,0,0,.14)",
                        zIndex: 1100, padding: 10,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px 8px" }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#1E293B" }}>
                            <i className="bi bi-hourglass-split" style={{ color: "#D97706", marginRight: 6 }} />
                            Pending Approvals
                          </span>
                          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700 }}>{pendingReviews.length}</span>
                        </div>
                        {pendingReviews.length === 0 ? (
                          <div style={{ padding: "20px 8px", textAlign: "center", color: "#94A3B8", fontSize: 12.5 }}>
                            No features waiting for approval.
                          </div>
                        ) : pendingReviews.map(rv => (
                          <Link key={rv._id} href={`/dashboard/admin/tasks/${rv._id}`} style={{
                            display: "block", padding: "9px 10px", borderRadius: 10, textDecoration: "none",
                            border: "1px solid #FDE68A", background: "#FFFBEB", marginBottom: 6,
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 12.5, color: "#1E293B" }}>{rv.title}</div>
                            <div style={{ fontSize: 11, color: "#92400E", marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                              <span>{rv.projectId?.name || "—"}{rv.sprintId?.name ? ` · ${rv.sprintId.name}` : ""}</span>
                              <span style={{ fontWeight: 700 }}>Review →</span>
                            </div>
                            {rv.assignedTo && (
                              <div style={{ fontSize: 10.5, color: "#92400E", marginTop: 2 }}>Submitted by {empName(rv.assignedTo)}</div>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="wp-btn wp-btn-primary" onClick={() => setShowNewProject(true)}>
                    <i className="bi bi-plus-circle" /> New Project
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
                  <div className="spinner-border text-primary" />
                </div>
              ) : projects.length === 0 ? (
                <div style={{ padding: 80, textAlign: "center" }}>
                  <i className="bi bi-kanban" style={{ fontSize: 52, color: "#C7D2FE" }} />
                  <div style={{ marginTop: 14, fontSize: 16, fontWeight: 800, color: "#1E293B" }}>No web projects yet</div>
                  <p style={{ color: "#94A3B8", fontSize: 13, marginTop: 6 }}>Create your first project to get started.</p>
                  <button className="wp-btn wp-btn-primary" style={{ marginTop: 16 }} onClick={() => setShowNewProject(true)}>
                    <i className="bi bi-plus-circle" /> Create First Project
                  </button>
                </div>
              ) : (
                <>
                  {/* Brand filter + Project cards row */}
                  {(() => {
                    const brandOpts = [];
                    const seen = new Set();
                    for (const p of projects) {
                      const bId = typeof p.brandId === "object" ? p.brandId?._id?.toString() : p.brandId?.toString() || "";
                      const bName = p.brandId?.name || p.clientId?.name || p.clientId?.company || "Unknown";
                      if (bId && !seen.has(bId)) { seen.add(bId); brandOpts.push({ id: bId, label: bName }); }
                    }
                    const activeBrand = brandFilter || brandOpts[0]?.id || "";
                    if (!brandFilter && brandOpts[0]?.id) setBrandFilter(brandOpts[0].id);
                    return brandOpts.length > 1 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>Brand:</span>
                        <select
                          value={activeBrand}
                          onChange={e => setBrandFilter(e.target.value)}
                          className="wp-input"
                          style={{ width: "auto", minWidth: 160 }}
                        >
                          {brandOpts.map(b => {
                            const cnt = projects.filter(p => (typeof p.brandId === "object" ? p.brandId?._id?.toString() : p.brandId?.toString()) === b.id).length;
                            return <option key={b.id} value={b.id}>{b.label} ({cnt})</option>;
                          })}
                        </select>
                      </div>
                    ) : null;
                  })()}
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 14, marginBottom: 20 }}>
                    {projects.filter(p => {
                      const bId = typeof p.brandId === "object" ? p.brandId?._id?.toString() : p.brandId?.toString() || "";
                      return !brandFilter || bId === brandFilter;
                    }).map(p => {
                      const sm  = PROJ_STATUS[p.status] || {};
                      const ph  = PHASE_MAP[p.currentPhase || "development"] || {};
                      const isSel = p._id === selectedId;
                      const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" }) : null;
                      const startFmt = fmtDate(p.startDate);
                      const endFmt   = fmtDate(p.endDate);
                      const desc     = p.description?.trim();
                      return (
                        <div key={p._id} className={`wp-project-card${isSel ? " selected" : ""}`}
                          onClick={() => selectProject(p._id)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".04em", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.clientId?.name || p.clientId?.company || p.brandId?.name || "—"}
                            </span>
                            <span className="wp-badge" style={{ background: ph.bg, color: ph.color, borderColor: "transparent", fontSize: 10, padding: "2px 7px" }}>
                              {ph.short}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 4, lineHeight: 1.3 }}>
                            {p.name}
                          </div>
                          {desc && (
                            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {desc}
                            </div>
                          )}
                          <span className="wp-badge" style={{ background: sm.bg, color: sm.color, borderColor: "transparent", fontSize: 10, padding: "2px 7px" }}>{sm.label}</span>
                          {(startFmt || endFmt) && (
                            <div style={{ display: "flex", gap: 6, marginTop: 7, fontSize: 10.5, color: "#64748B", alignItems: "center" }}>
                              <i className="bi bi-calendar3" style={{ fontSize: 10, color: "#94A3B8" }} />
                              {startFmt && <span>{startFmt}</span>}
                              {startFmt && endFmt && <span style={{ color: "#CBD5E1" }}>→</span>}
                              {endFmt && <span style={{ color: p.endDate && new Date(p.endDate) < new Date() && p.status !== "completed" ? "#EF4444" : "#64748B", fontWeight: p.endDate && new Date(p.endDate) < new Date() ? 700 : 400 }}>{endFmt}</span>}
                            </div>
                          )}
                          {(() => {
                            const liveTotal = isSel ? totalFeats : 0;
                            const total = liveTotal > 0 ? liveTotal : (p.progress?.total || 0);
                            const done  = liveTotal > 0 ? doneFeats : (p.progress?.done || 0);
                            if (total === 0) return null;
                            return (
                              <>
                                <div className="wp-progress-bar" style={{ marginTop: 8 }}>
                                  <div className="wp-progress-fill" style={{ width: `${Math.round(done / total * 100)}%` }} />
                                </div>
                                <div style={{ fontSize: 10.5, color: "#94A3B8", marginTop: 4, fontWeight: 600 }}>
                                  {done}/{total} features done
                                </div>
                              </>
                            );
                          })()}
                          {(() => {
                            const cnt = pendingReviews.filter(r => (typeof r.projectId === "object" ? r.projectId?._id : r.projectId) === p._id).length;
                            return cnt > 0 ? (
                              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: "#D97706", background: "#FFFBEB", borderRadius: 8, padding: "2px 8px" }}>
                                <i className="bi bi-bell-fill" style={{ fontSize: 9 }} /> {cnt} awaiting approval
                              </div>
                            ) : null;
                          })()}
                        </div>
                      );
                    })}
                  </div>

                  {/* Detail panel */}
                  {selectedProject && (
                    <div className="wp-detail">
                      {/* Detail header */}
                      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #F1F5F9" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                            <i className="bi bi-kanban-fill" style={{ color: "#6366F1", fontSize: 18 }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 16, color: "#1E293B" }}>{selectedProject.name}</div>
                            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                              {selectedProject.clientId?.name || selectedProject.clientId?.company || selectedProject.brandId?.name || ""}
                              {loadingDetail ? " · Loading…" : sprints.length > 0 ? ` · ${sprints.length} sprint${sprints.length !== 1 ? "s" : ""}` : ""}
                            </div>
                            {selectedProject.description && (
                              <div style={{ fontSize: 12, color: "#64748B", marginTop: 5, lineHeight: 1.5 }}>{selectedProject.description}</div>
                            )}
                          </div>
                          {(() => {
                            const sm = PROJ_STATUS[selectedProject.status] || {};
                            const ph = PHASE_MAP[selectedProject.currentPhase || "development"] || {};
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <span className="wp-badge" style={{ background: sm.bg, color: sm.color, borderColor: "transparent" }}>{sm.label}</span>
                                  <span className="wp-badge" style={{ background: ph.bg, color: ph.color, borderColor: "transparent", fontSize: 10 }}>
                                    <i className={`bi ${ph.icon}`} style={{ fontSize: 9 }} /> {ph.label}
                                  </span>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button className="wp-btn wp-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }} title="Edit project" onClick={openEditProject}>
                                    <i className="bi bi-pencil" />
                                  </button>
                                  <button className="wp-btn wp-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5, color: "#DC2626" }} title="Delete project" onClick={handleDeleteProject}>
                                    <i className="bi bi-trash" />
                                  </button>
                                  <button className="wp-btn wp-btn-ghost" style={{ padding: "5px 12px", fontSize: 11.5 }} onClick={() => setShowAddSprint(true)}>
                                    <i className="bi bi-lightning" /> New Sprint
                                  </button>
                                  <button className="wp-btn wp-btn-primary" style={{ padding: "5px 12px", fontSize: 11.5 }}
                                    onClick={() => { setFeatureForm({ title: "", sprintId: sprints[0]?._id || "", assignedTo: "", dueDate: "" }); setShowAddFeature(true); }}>
                                    <i className="bi bi-plus-square" /> New Feature
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        {(() => {
                          const liveTotal = totalFeats > 0 ? totalFeats : 0;
                          const pTotal = liveTotal > 0 ? totalFeats : (selectedProject.progress?.total || 0);
                          const pDone  = liveTotal > 0 ? doneFeats  : (selectedProject.progress?.done  || 0);
                          if (!selectedProject.startDate && !selectedProject.endDate && pTotal === 0) return null;
                          return (
                            <div style={{ display: "flex", gap: 20, marginTop: 10, paddingTop: 10, borderTop: "1px dashed #F1F5F9" }}>
                              {selectedProject.startDate && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>Start Date</div>
                                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151" }}>
                                    {new Date(selectedProject.startDate).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })}
                                  </div>
                                </div>
                              )}
                              {selectedProject.endDate && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>Deadline</div>
                                  <div style={{ fontSize: 12.5, fontWeight: 700, color: new Date(selectedProject.endDate) < new Date() && selectedProject.status !== "completed" ? "#EF4444" : "#374151" }}>
                                    {new Date(selectedProject.endDate).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })}
                                    {new Date(selectedProject.endDate) < new Date() && selectedProject.status !== "completed" && (
                                      <span style={{ marginLeft: 6, fontSize: 10, background: "#FEF2F2", color: "#EF4444", borderRadius: 6, padding: "1px 6px" }}>Overdue</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {pTotal > 0 && (
                                <div style={{ marginLeft: "auto" }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 2 }}>Progress</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 80, height: 6, borderRadius: 10, background: "#E5E7EB", overflow: "hidden" }}>
                                      <div style={{ height: "100%", width: `${Math.round(pDone/pTotal*100)}%`, background: "linear-gradient(90deg,#6366F1,#8B5CF6)", borderRadius: 10 }} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{pDone}/{pTotal}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Tabs */}
                      <div style={{ display: "flex", borderBottom: "1.5px solid #F1F5F9", overflowX: "auto" }}>
                        {TABS.map(t => (
                          <button key={t.key} className={`wp-tab${activeTab === t.key ? " active" : ""}`}
                            onClick={() => setActiveTab(t.key)}>
                            <i className={`bi ${t.icon}`} style={{ fontSize: 12 }} /> {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Tab content */}
                      {loadingDetail ? (
                        <div style={{ padding: "40px 0", textAlign: "center", color: "#94A3B8" }}>
                          <div className="spinner-border spinner-border-sm text-primary" />
                        </div>
                      ) : activeTab === "overview" ? (
                        <OverviewTab />
                      ) : activeTab === "board" ? (
                        <SprintBoard />
                      ) : (
                        <PhaseTab phaseKey={activeTab} />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── New Project Modal ── */}
      {showNewProject && (
        <div className="wp-overlay" onClick={() => setShowNewProject(false)}>
          <div className="wp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0 }}>
                <i className="bi bi-kanban" style={{ color: "#6366F1", marginRight: 6 }} />
                New Project
              </h5>
              <button onClick={() => setShowNewProject(false)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Client / Brand selector */}
              <div>
                <label className="wp-label">Client Brand *</label>
                {webBrands.length === 0 ? (
                  <div style={{ padding: "10px 12px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 12, color: "#92400E" }}>
                    <i className="bi bi-exclamation-triangle me-2" />
                    No brands with Web Development service found. Add the service to a brand first.
                  </div>
                ) : (
                  <select
                    className="wp-input"
                    value={projectForm.brandId}
                    onChange={e => {
                      const b = webBrands.find(x => x._id === e.target.value);
                      setProjectForm(f => ({
                        ...f,
                        brandId:  e.target.value,
                        clientId: b?.clientId?._id || b?.clientId || "",
                      }));
                    }}
                  >
                    <option value="">— Select brand —</option>
                    {webBrands.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.name}{b.clientId?.name ? ` — ${b.clientId.name}` : b.clientId?.company ? ` — ${b.clientId.company}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="wp-label">Project Name *</label>
                <input className="wp-input" placeholder="e.g. Website Redesign 2026" value={projectForm.name}
                  onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="wp-label">Status</label>
                  <select className="wp-input" value={projectForm.status} onChange={e => setProjectForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.entries(PROJ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="wp-label">Starting Phase</label>
                  <select className="wp-input" value={projectForm.currentPhase} onChange={e => setProjectForm(f => ({ ...f, currentPhase: e.target.value }))}>
                    {PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="wp-label">Start Date</label>
                  <input type="date" className="wp-input" value={projectForm.startDate} onChange={e => setProjectForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="wp-label">End Date</label>
                  <input type="date" className="wp-input" value={projectForm.endDate} onChange={e => setProjectForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="wp-label">Description</label>
                <textarea className="wp-input" style={{ height: 68, resize: "vertical" }} placeholder="Project description…"
                  value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="wp-btn wp-btn-ghost" style={{ flex: 1 }} onClick={() => setShowNewProject(false)}>Cancel</button>
                <button className="wp-btn wp-btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={handleCreateProject}>
                  {submitting ? "Creating…" : <><i className="bi bi-plus-circle" /> Create Project</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Sprint Modal ── */}
      {showAddSprint && (
        <div className="wp-overlay" onClick={() => setShowAddSprint(false)}>
          <div className="wp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0 }}>
                <i className="bi bi-lightning" style={{ color: "#F59E0B", marginRight: 6 }} />
                New Sprint
              </h5>
              <button onClick={() => setShowAddSprint(false)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="wp-label">Sprint Name *</label>
                <input className="wp-input" placeholder="e.g. Sprint 1 — Landing Page" value={sprintForm.name}
                  onChange={e => setSprintForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="wp-label">Phase</label>
                <select className="wp-input" value={sprintForm.phase} onChange={e => setSprintForm(f => ({ ...f, phase: e.target.value }))}>
                  {PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="wp-label">Start Date &amp; Time</label>
                  <input type="datetime-local" className="wp-input" value={sprintForm.startDate}
                    onChange={e => setSprintForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="wp-label">End Date &amp; Time (Deadline) *</label>
                  <input type="datetime-local" className="wp-input" value={sprintForm.endDate}
                    onChange={e => setSprintForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="wp-label">Duration (days)</label>
                <input type="number" className="wp-input" min={1} max={90} value={sprintForm.durationDays}
                  onChange={e => setSprintForm(f => ({ ...f, durationDays: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="wp-btn wp-btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddSprint(false)}>Cancel</button>
                <button className="wp-btn wp-btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={handleAddSprint}>
                  {submitting ? "Adding…" : <><i className="bi bi-lightning" /> Add Sprint</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Feature Modal ── */}
      {showAddFeature && (
        <div className="wp-overlay" onClick={() => setShowAddFeature(false)}>
          <div className="wp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0 }}>
                <i className="bi bi-plus-square" style={{ color: "#6366F1", marginRight: 6 }} />
                New Feature
              </h5>
              <button onClick={() => setShowAddFeature(false)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="wp-label">Feature Title *</label>
                <input className="wp-input" placeholder="e.g. Hero section with CTA" value={featureForm.title}
                  onChange={e => setFeatureForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="wp-label">Sprint *</label>
                <select className="wp-input" value={featureForm.sprintId} onChange={e => setFeatureForm(f => ({ ...f, sprintId: e.target.value }))}>
                  <option value="">— Select sprint —</option>
                  {sprints.map(s => {
                    const ph = PHASE_MAP[s.phase || "development"] || {};
                    return <option key={s._id} value={s._id}>{s.name} ({ph.short})</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="wp-label">Assignee</label>
                <select className="wp-input" value={featureForm.assignedTo} onChange={e => setFeatureForm(f => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">— Unassigned —</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{empName(emp)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="wp-label">Deadline (Date &amp; Time) *</label>
                <input type="datetime-local" className="wp-input" value={featureForm.dueDate}
                  onChange={e => setFeatureForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="wp-btn wp-btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddFeature(false)}>Cancel</button>
                <button className="wp-btn wp-btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={handleAddFeature}>
                  {submitting ? "Adding…" : <><i className="bi bi-plus-square" /> Add Feature</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Team Modal ── */}
      {editTeamPhase && (
        <div className="wp-overlay" onClick={() => setEditTeamPhase(null)}>
          <div className="wp-modal wp-modal-lg" onClick={e => e.stopPropagation()}>
            {(() => {
              const ph = PHASE_MAP[editTeamPhase] || {};
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0 }}>
                      <i className={`bi ${ph.icon}`} style={{ color: ph.color, marginRight: 6 }} />
                      {ph.label} — Team
                    </h5>
                    <button onClick={() => setEditTeamPhase(null)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>
                      <i className="bi bi-x" />
                    </button>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 16 }}>
                    {employees.length === 0 ? (
                      <p style={{ color: "#94A3B8", fontSize: 13 }}>No employees found.</p>
                    ) : employees.map(emp => {
                      const isSelected = teamMembers.includes(emp._id);
                      return (
                        <div key={emp._id} className="emp-check-item"
                          onClick={() => setTeamMembers(tm => isSelected ? tm.filter(id => id !== emp._id) : [...tm, emp._id])}>
                          <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isSelected ? ph.color : "#E5E7EB"}`, background: isSelected ? ph.bg : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isSelected && <i className="bi bi-check" style={{ fontSize: 12, color: ph.color, fontWeight: 700 }} />}
                          </div>
                          <AvatarCircle emp={emp} size={30} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#1E293B" }}>{empName(emp)}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>
                              {emp.professional?.designation || emp.professional?.department || ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="wp-btn wp-btn-ghost" style={{ flex: 1 }} onClick={() => setEditTeamPhase(null)}>Cancel</button>
                    <button className="wp-btn wp-btn-primary" style={{ flex: 1 }} onClick={handleSaveTeam}>
                      <i className="bi bi-check2" /> Save Team ({teamMembers.length})
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Edit Project Modal ── */}
      {showEditProject && selectedProject && (
        <div className="wp-overlay" onClick={() => setShowEditProject(false)}>
          <div className="wp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0 }}>
                <i className="bi bi-pencil-square" style={{ color: "#6366F1", marginRight: 6 }} />
                Edit Project
              </h5>
              <button onClick={() => setShowEditProject(false)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="wp-label">Project Name *</label>
                <input className="wp-input" value={editProjectForm.name}
                  onChange={e => setEditProjectForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="wp-label">Status</label>
                  <select className="wp-input" value={editProjectForm.status} onChange={e => setEditProjectForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.entries(PROJ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="wp-label">Current Phase</label>
                  <select className="wp-input" value={editProjectForm.currentPhase} onChange={e => setEditProjectForm(f => ({ ...f, currentPhase: e.target.value }))}>
                    {PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="wp-label">Start Date</label>
                  <input type="date" className="wp-input" value={editProjectForm.startDate} onChange={e => setEditProjectForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="wp-label">Deadline (End Date)</label>
                  <input type="date" className="wp-input" value={editProjectForm.endDate} onChange={e => setEditProjectForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="wp-label">Description</label>
                <textarea className="wp-input" style={{ height: 68, resize: "vertical" }}
                  value={editProjectForm.description} onChange={e => setEditProjectForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="wp-btn wp-btn-ghost" style={{ flex: 1 }} onClick={() => setShowEditProject(false)}>Cancel</button>
                <button className="wp-btn wp-btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={handleUpdateProject}>
                  {submitting ? "Saving…" : <><i className="bi bi-check2" /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Sprint Modal ── */}
      {showEditSprint && (
        <div className="wp-overlay" onClick={() => setShowEditSprint(false)}>
          <div className="wp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0 }}>
                <i className="bi bi-pencil-square" style={{ color: "#F59E0B", marginRight: 6 }} />
                Edit Sprint
              </h5>
              <button onClick={() => setShowEditSprint(false)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="wp-label">Sprint Name *</label>
                <input className="wp-input" value={editSprintForm.name}
                  onChange={e => setEditSprintForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="wp-label">Phase</label>
                  <select className="wp-input" value={editSprintForm.phase} onChange={e => setEditSprintForm(f => ({ ...f, phase: e.target.value }))}>
                    {PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="wp-label">Status</label>
                  <select className="wp-input" value={editSprintForm.status} onChange={e => setEditSprintForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.entries(SPRINT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="wp-label">Start Date &amp; Time</label>
                  <input type="datetime-local" className="wp-input" value={editSprintForm.startDate}
                    onChange={e => setEditSprintForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="wp-label">End Date &amp; Time (Deadline) *</label>
                  <input type="datetime-local" className="wp-input" value={editSprintForm.endDate}
                    onChange={e => setEditSprintForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="wp-label">Duration (days)</label>
                <input type="number" className="wp-input" min={1} max={90} value={editSprintForm.durationDays}
                  onChange={e => setEditSprintForm(f => ({ ...f, durationDays: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="wp-btn wp-btn-ghost" style={{ flex: 1 }} onClick={() => setShowEditSprint(false)}>Cancel</button>
                <button className="wp-btn wp-btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={handleUpdateSprint}>
                  {submitting ? "Saving…" : <><i className="bi bi-check2" /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Feature Modal ── */}
      {showEditFeature && (
        <div className="wp-overlay" onClick={() => setShowEditFeature(false)}>
          <div className="wp-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0 }}>
                <i className="bi bi-pencil-square" style={{ color: "#6366F1", marginRight: 6 }} />
                Edit Feature
              </h5>
              <button onClick={() => setShowEditFeature(false)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="wp-label">Feature Title *</label>
                <input className="wp-input" value={editFeatureForm.title}
                  onChange={e => setEditFeatureForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="wp-label">Sprint</label>
                  <select className="wp-input" value={editFeatureForm.sprintId} onChange={e => setEditFeatureForm(f => ({ ...f, sprintId: e.target.value }))}>
                    {sprints.map(s => {
                      const ph = PHASE_MAP[s.phase || "development"] || {};
                      return <option key={s._id} value={s._id}>{s.name} ({ph.short})</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="wp-label">Status</label>
                  <select className="wp-input" value={editFeatureForm.status} onChange={e => setEditFeatureForm(f => ({ ...f, status: e.target.value }))}>
                    {FEAT_STATUS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="wp-label">Assignee</label>
                <select className="wp-input" value={editFeatureForm.assignedTo} onChange={e => setEditFeatureForm(f => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">— Unassigned —</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{empName(emp)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="wp-label">Deadline (Date &amp; Time)</label>
                <input type="datetime-local" className="wp-input" value={editFeatureForm.dueDate}
                  onChange={e => setEditFeatureForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="wp-btn wp-btn-ghost" style={{ flex: 1 }} onClick={() => setShowEditFeature(false)}>Cancel</button>
                <button className="wp-btn wp-btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={handleUpdateFeature}>
                  {submitting ? "Saving…" : <><i className="bi bi-check2" /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
