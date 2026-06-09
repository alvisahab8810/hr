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

  const [projectForm, setProjectForm] = useState({ name: "", description: "", status: "active", currentPhase: "development", startDate: "", endDate: "", clientId: "", brandId: "" });
  const [sprintForm,  setSprintForm]  = useState({ name: "", durationDays: 14, startDate: "", phase: "development" });
  const [featureForm, setFeatureForm] = useState({ title: "", sprintId: "", assignedTo: "" });
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
  }, []);

  const fetchWebBrands = async () => {
    try {
      const r = await fetch("/api/admin/brands", { credentials: "include" });
      const d = await r.json();
      if (d.success) {
        setWebBrands((d.brands || []).filter(b => b.services?.includes("website")));
      }
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
          projectId:   selectedId,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Sprint created!");
        setSprints(s => [d.sprint, ...s]);
        setShowAddSprint(false);
        setSprintForm({ name: "", durationDays: 14, startDate: "", phase: "development" });
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleAddFeature = async () => {
    if (!featureForm.title.trim()) return toast.error("Feature title required");
    if (!featureForm.sprintId)     return toast.error("Select a sprint");
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
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Feature added!");
        const sId = featureForm.sprintId;
        setFeatures(f => ({ ...f, [sId]: [...(f[sId] || []), d.feature] }));
        setExpandedSp(sId);
        setShowAddFeature(false);
        setFeatureForm({ title: "", sprintId: "", assignedTo: "" });
      } else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleUpdateStatus = async (featureId, sprintKey, newStatus) => {
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
          [sprintKey]: (f[sprintKey] || []).map(ft => ft._id === featureId ? { ...ft, status: newStatus } : ft),
        }));
      }
    } catch {}
  };

  const handleDeleteFeature = async (featureId, sprintKey) => {
    if (!confirm("Delete this feature?")) return;
    try {
      await fetch(`/api/admin/features/${featureId}`, { method: "DELETE", credentials: "include" });
      setFeatures(f => ({ ...f, [sprintKey]: (f[sprintKey] || []).filter(ft => ft._id !== featureId) }));
      toast.success("Feature deleted");
    } catch {}
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

  /* ── Sub-renders ── */
  const sprintsByPhase = (phaseKey) => sprints.filter(s => (s.phase || "development") === phaseKey);

  function FeatureTable({ sprint }) {
    const sprintKey = sprint._id;
    const fts = features[sprintKey] || [];
    const isExp = expandedSp === sprintKey;
    const ss = SPRINT_STATUS[sprint.status] || {};
    const ph = PHASE_MAP[sprint.phase || "development"] || {};

    return (
      <div className="wp-sprint-item">
        <div className="wp-sprint-header" onClick={() => toggleSprint(sprintKey)}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ss.color || "#94A3B8", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: "#1E293B" }}>{sprint.name}</span>
            {sprint.durationDays && (
              <span style={{ marginLeft: 8, fontSize: 11, color: "#94A3B8" }}>{sprint.durationDays} days</span>
            )}
          </div>
          <span className="wp-badge" style={{ background: ss.bg, color: ss.color, borderColor: "transparent" }}>{ss.label}</span>
          <span className="wp-badge" style={{ background: ph.bg, color: ph.color, borderColor: "transparent", fontSize: 10 }}>
            <i className={`bi ${ph.icon}`} style={{ fontSize: 9 }} /> {ph.short}
          </span>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{fts.length} features</span>
          <i className={`bi bi-chevron-${isExp ? "up" : "down"}`} style={{ color: "#94A3B8", fontSize: 12 }} />
        </div>

        {isExp && (
          <div style={{ borderTop: "1px solid #F1F5F9" }}>
            {fts.length === 0 ? (
              <div style={{ padding: "16px 20px", fontSize: 12, color: "#94A3B8" }}>
                No features yet.{" "}
                <button style={{ background: "none", border: "none", color: "#6366F1", fontWeight: 600, cursor: "pointer", fontSize: 12 }}
                  onClick={() => { setFeatureForm({ title: "", sprintId: sprintKey, assignedTo: "" }); setShowAddFeature(true); }}>
                  + Add Feature
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 130px 120px 36px", gap: 8, padding: "8px 16px", borderBottom: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                  {["ID","Feature","Assignee","Status",""].map((h, i) => (
                    <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</span>
                  ))}
                </div>
                {fts.map((f, idx) => {
                  const fs = FEAT_STATUS_MAP[f.status] || FEAT_STATUS_MAP.todo;
                  const spKey = (typeof f.sprintId === "object" ? f.sprintId?._id : f.sprintId) || sprintKey;
                  return (
                    <div key={f._id} className="wp-feature-row"
                      style={{ gridTemplateColumns: "80px 1fr 130px 120px 36px", borderTop: idx > 0 ? "1px solid #F8FAFC" : "none" }}>
                      <span className="f-id">F-{101 + idx}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#1E293B" }}>{f.title}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {f.assignedTo ? <AvatarCircle emp={f.assignedTo} size={22} /> : null}
                        <span style={{ fontSize: 11.5, color: f.assignedTo ? "#374151" : "#94A3B8" }}>
                          {f.assignedTo ? empName(f.assignedTo) : "Unassigned"}
                        </span>
                      </div>
                      <select
                        className="status-select"
                        value={f.status}
                        style={{ color: fs.color, background: fs.bg }}
                        onChange={e => handleUpdateStatus(f._id, spKey, e.target.value)}
                      >
                        {FEAT_STATUS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      <button
                        style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}
                        onClick={() => handleDeleteFeature(f._id, spKey)}
                        title="Delete"
                      >
                        <i className="bi bi-trash" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  );
                })}
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
                const spFts = features[sp._id] || [];
                return (
                  <div key={sp._id} style={{ background: "#FAFAFA", border: "1.5px solid #F1F5F9", borderRadius: 12, padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#1E293B", flex: 1 }}>{sp.name}</span>
                      <span className="wp-badge" style={{ background: ph.bg, color: ph.color, borderColor: "transparent", fontSize: 10 }}>
                        <i className={`bi ${ph.icon}`} style={{ fontSize: 9 }} /> {ph.short}
                      </span>
                      <span className="wp-badge" style={{ background: ss.bg, color: ss.color, borderColor: "transparent" }}>{ss.label}</span>
                      {sp.durationDays && (
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>{sp.durationDays}d</span>
                      )}
                    </div>
                    {spFts.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {spFts.slice(0, 6).map((f, i) => (
                          <span key={f._id} className="f-pill">F-{101 + i}</span>
                        ))}
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
                          <div style={{ fontSize: 10.5, color: "#94A3B8", marginBottom: 6 }}>{sp.name}</div>
                        )}
                        {f.assignedTo && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <AvatarCircle emp={f.assignedTo} size={18} />
                            <span style={{ fontSize: 11, color: "#6B7280" }}>{empName(f.assignedTo)}</span>
                          </div>
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
          .wp-project-card{cursor:pointer;background:#fff;border-radius:14px;border:2px solid #F1F5F9;padding:16px;min-width:210px;max-width:255px;flex-shrink:0;transition:all .15s;}
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
                <div style={{ display: "flex", gap: 8 }}>
                  {selectedProject && (
                    <>
                      <button className="wp-btn wp-btn-ghost" onClick={() => setShowAddSprint(true)}>
                        <i className="bi bi-lightning" /> New Sprint
                      </button>
                      <button className="wp-btn wp-btn-ghost" onClick={() => { setFeatureForm({ title: "", sprintId: sprints[0]?._id || "", assignedTo: "" }); setShowAddFeature(true); }}>
                        <i className="bi bi-plus-square" /> New Feature
                      </button>
                    </>
                  )}
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
                      return (
                        <div key={p._id} className={`wp-project-card${isSel ? " selected" : ""}`}
                          onClick={() => selectProject(p._id)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".04em", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.clientId?.name || p.clientId?.company || p.brandId?.name || "—"}
                            </span>
                            <span className="wp-badge" style={{ background: ph.bg, color: ph.color, borderColor: "transparent", fontSize: 10, padding: "2px 7px" }}>
                              {ph.short}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 6, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name}
                          </div>
                          <span className="wp-badge" style={{ background: sm.bg, color: sm.color, borderColor: "transparent", fontSize: 10, padding: "2px 7px" }}>{sm.label}</span>
                          {isSel && totalFeats > 0 && (
                            <>
                              <div className="wp-progress-bar">
                                <div className="wp-progress-fill" style={{ width: `${Math.round(doneFeats / totalFeats * 100)}%` }} />
                              </div>
                              <div style={{ fontSize: 10.5, color: "#94A3B8", marginTop: 5 }}>
                                {doneFeats}/{totalFeats} features done
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Detail panel */}
                  {selectedProject && (
                    <div className="wp-detail">
                      {/* Detail header */}
                      <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #F1F5F9", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="bi bi-kanban-fill" style={{ color: "#6366F1", fontSize: 18 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: "#1E293B" }}>{selectedProject.name}</div>
                          <div style={{ fontSize: 12, color: "#94A3B8" }}>
                            {selectedProject.clientId?.name || selectedProject.clientId?.company || selectedProject.brandId?.name || ""}
                            {loadingDetail ? " · Loading…" : sprints.length > 0 ? ` · ${sprints.length} sprint${sprints.length !== 1 ? "s" : ""}` : ""}
                          </div>
                        </div>
                        {(() => { const sm = PROJ_STATUS[selectedProject.status] || {}; return (
                          <span className="wp-badge" style={{ background: sm.bg, color: sm.color, borderColor: "transparent" }}>{sm.label}</span>
                        ); })()}
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
                  <label className="wp-label">Duration (days)</label>
                  <input type="number" className="wp-input" min={1} max={90} value={sprintForm.durationDays}
                    onChange={e => setSprintForm(f => ({ ...f, durationDays: e.target.value }))} />
                </div>
                <div>
                  <label className="wp-label">Start Date</label>
                  <input type="date" className="wp-input" value={sprintForm.startDate}
                    onChange={e => setSprintForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
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
    </>
  );
}
