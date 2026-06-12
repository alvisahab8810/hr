/**
 * TaskAssignDrawer
 * Side-drawer shown when a client request is marked "In Scope".
 * Replicates the "+ New Task" drawer from /dashboard/admin/tasks/list.
 *
 * Props:
 *   request        — populated client request ({ _id, title, brief, priority, contentType, clientId, brandId })
 *   onClose        — called when drawer is dismissed
 *   onTaskCreated  — called with { _id, title } when task is created successfully
 *   createTask     — async (body) => { success, task } — caller provides the actual API call
 *   fetchBrand     — async (brandId) => brand object (with services, monthlyDeliverables, seoSettings)
 *   fetchNomenclature — async (brandId, contentType) => string nomenclature
 *   fetchEmployees  — async () => array of { _id, name, dept }
 */
import { useEffect, useState, useRef } from "react";

/* ─── Constants ────────────────────────────────── */
const STAGE_NAMES_DEFAULT = ["Script/Concept", "Shoot", "Design/Edit/Develop", "Posted/Live"];
const freshStages = () => STAGE_NAMES_DEFAULT.map(name => ({ name, assignedTo: [], deadline: "" }));

const STAGE_COLORS = ["#F97316", "#3B82F6", "#EAB308", "#22C55E"];
const STAGE_DEPT_KEYWORDS = [
  { include: ["content team"],                           exclude: [] },
  { include: ["production"],                             exclude: ["design", "creative"] },
  { include: ["editing team", "design team", "tech"],    exclude: [] },
  { include: ["digital marketing"],                      exclude: [] },
];
const STAGE_TEAM_LABELS = ["Content", "Production", "Design/Editing", "Digital Mktg"];

const CTYPE_COLORS = { reel: "#7C3AED", post: "#1D4ED8", carousel: "#B45309", story: "#065F46" };

const SEO_CATS = [
  { key: "blog",      label: "Blog Post",     icon: "bi-file-text",             color: "#6366F1" },
  { key: "technical", label: "Technical SEO", icon: "bi-code-slash",            color: "#EF4444" },
  { key: "onpage",    label: "On-Page",        icon: "bi-file-earmark-richtext", color: "#3B82F6" },
  { key: "offpage",   label: "Off-Page",       icon: "bi-link-45deg",            color: "#F59E0B" },
  { key: "backlinks", label: "Backlinks",      icon: "bi-arrow-left-right",      color: "#10B981" },
];
const EMPTY_SEO_FORM = {
  seoCategory: "blog", title: "", primaryKeywords: "", pageUrls: [""],
  internalLinking: false, internalLinkingTask: "", externalLinking: false, externalLinkingTask: "",
  description: "", priority: "medium", assignedTo: "", dueDate: "",
};
const EMPTY_GEN_FORM = { title: "", description: "", priority: "medium", assignedTo: "", dueDate: "" };

const SVC_TO_MODE = { socialMedia: "production", website: "website", seo: "seo", ads: "ads", branding: "branding" };
const SVC_LABELS  = { socialMedia: "Social Media", website: "Website", seo: "SEO", ads: "Ads", branding: "Branding" };
const SVC_COLORS  = { socialMedia: ["#EDE9FE","#7C3AED"], website: ["#DBEAFE","#1D4ED8"], seo: ["#D1FAE5","#065F46"], ads: ["#FEF3C7","#B45309"], branding: ["#FCE7F3","#BE185D"] };
const PRIORITIES  = ["low","medium","high","urgent"];
const PRIORITY_LABELS = { low:"Low", medium:"Medium", high:"High", urgent:"Urgent" };

const BLOG_SCHED_DAY_ORDER = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

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
function filterByDept(employees, { include, exclude }) {
  return employees.filter(emp => {
    const dept  = (emp.dept || emp.professional?.department || "").toLowerCase();
    const desig = (emp.professional?.designation || emp.designation || "").toLowerCase();
    if (exclude.some(kw => dept.includes(kw) || desig.includes(kw))) return false;
    return include.some(kw => dept.includes(kw));
  });
}

export default function TaskAssignDrawer({
  request,
  onClose,
  onTaskCreated,
  createTask,
  fetchBrand,
  fetchNomenclature,
  fetchEmployees,
}) {
  const brand = request.brandId;

  const [fullBrand,     setFullBrand]     = useState(null);
  const [employees,     setEmployees]     = useState([]);
  const [createMode,    setCreateMode]    = useState(null);   // set after brand loads
  const [submitting,    setSubmitting]    = useState(false);
  const [done,          setDone]          = useState(false);

  // Production state
  const [prodForm, setProdForm] = useState({ contentType: "reel", stages: freshStages() });
  const [taskTitle, setTaskTitle] = useState(request.title || "");
  const [nomenclature, setNomenclature]   = useState("");
  const [nomLoading,   setNomLoading]     = useState(false);
  const [brandCounts,  setBrandCounts]    = useState({});

  // SEO state
  const [seoForm, setSeoForm] = useState({ ...EMPTY_SEO_FORM });

  // General / Ads / Branding state
  const [genForm, setGenForm] = useState({ ...EMPTY_GEN_FORM, title: request.title || "" });

  const drawerRef = useRef(null);

  // Load brand + employees on mount
  useEffect(() => {
    if (!brand?._id) return;
    Promise.all([
      fetchBrand(brand._id),
      fetchEmployees(),
    ]).then(([b, emps]) => {
      setFullBrand(b);
      setEmployees(emps || []);
      // Auto-select the mode matching request.contentType
      const svcMode = SVC_TO_MODE[request.contentType] || null;
      const services = b?.services || [];
      const modes = buildModes(services);
      const firstMode = svcMode && modes.some(m => m[0] === svcMode) ? svcMode : (modes[0]?.[0] || "general");
      setCreateMode(firstMode);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildModes(services) {
    return [
      ...(services.includes("socialMedia") ? [["production","🎬 Social Media"]] : []),
      ...(services.includes("website")     ? [["website",   "🌐 Website"]]      : []),
      ...(services.includes("seo")         ? [["seo",       "🔍 SEO"]]          : []),
      ...(services.includes("ads")         ? [["ads",       "📢 Ads"]]          : []),
      ...(services.includes("branding")    ? [["branding",  "🎨 Branding"]]     : []),
      ["general","📝 General"],
    ];
  }

  // Live nomenclature preview
  useEffect(() => {
    if (!brand?._id || !prodForm.contentType || createMode !== "production") {
      setNomenclature(""); return;
    }
    setNomLoading(true);
    fetchNomenclature(brand._id, prodForm.contentType)
      .then(n => setNomenclature(n || ""))
      .catch(() => {})
      .finally(() => setNomLoading(false));
  }, [brand?._id, prodForm.contentType, createMode, fetchNomenclature]);

  const availableModes     = buildModes(fullBrand?.services || []);
  const availableCtypes    = (() => {
    const all = [["reel","Reel"],["post","Post"],["carousel","Carousel"],["story","Story"]];
    if (!fullBrand) return all;
    const md = fullBrand.monthlyDeliverables || {};
    return all.filter(([k]) => {
      const limitMap = { reel: md.reels, post: md.posts, carousel: md.carousels, story: md.stories };
      return limitMap[k] == null || limitMap[k] > 0;
    }).length > 0 ? all : all;
  })();

  const md = fullBrand?.monthlyDeliverables || {};
  const deliverableInfo = {
    reel:     { limit: md.reels     || 0, used: brandCounts.reel     || 0 },
    post:     { limit: md.posts     || 0, used: brandCounts.post     || 0 },
    carousel: { limit: md.carousels || 0, used: brandCounts.carousel || 0 },
    story:    { limit: md.stories   || 0, used: brandCounts.story    || 0 },
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let body = {};
      if (createMode === "production") {
        const missing = prodForm.stages.some(s => s.assignedTo.length > 0 && !s.deadline);
        if (missing) { alert("Set a deadline for every stage with assignees."); setSubmitting(false); return; }
        if (!taskTitle.trim()) { alert("Task title is required."); setSubmitting(false); return; }
        body = {
          taskType:    "production",
          taskTitle:   taskTitle.trim(),
          contentType: prodForm.contentType,
          stages:      prodForm.stages.map(s => ({ name: s.name, assignedTo: s.assignedTo, deadline: s.deadline || null })),
        };
      } else if (createMode === "seo") {
        body = { taskType: "seo", taskTitle: seoForm.title, ...seoForm };
      } else if (["ads","branding","general"].includes(createMode)) {
        if (!genForm.title.trim()) { alert("Title is required."); setSubmitting(false); return; }
        body = { taskType: createMode, taskTitle: genForm.title, ...genForm };
      } else if (createMode === "website") {
        onClose();
        return;
      }
      const result = await createTask(body);
      if (result.success) {
        setDone(true);
        setTimeout(() => { onTaskCreated(result.task); }, 1800);
      } else { alert(result.message || "Failed to create task"); }
    } catch { alert("Network error"); }
    setSubmitting(false);
  }

  const LBL = { fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 };

  return (
    <>
      <style>{`
        .tad-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2100;display:flex;align-items:stretch;justify-content:flex-end}
        .tad-drawer{width:680px;max-width:100vw;background:#fff;display:flex;flex-direction:column;height:100vh;box-shadow:-8px 0 40px rgba(0,0,0,.18);animation:tad-slide-in .22s cubic-bezier(.4,0,.2,1)}
        @keyframes tad-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .tad-header{padding:18px 22px;border-bottom:1px solid #F1F5F9;display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0}
        .tad-body{flex:1;overflow-y:auto;padding:20px 22px}
        .tad-footer{padding:14px 22px;border-top:1px solid #F1F5F9;display:flex;gap:10px;justify-content:flex-end;flex-shrink:0}
        .tad-input{width:100%;padding:8px 11px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;color:#1E293B;outline:none;font-family:inherit;background:#fff}
        .tad-input:focus{border-color:#6366F1}
        .tad-select{width:100%;padding:8px 11px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;color:#1E293B;outline:none;font-family:inherit;background:#fff;cursor:pointer}
        .tad-btn{padding:9px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:7px;border:none}
        .tad-btn-ghost{background:none;color:#64748b;border:1.5px solid #E2E8F0}
        .tad-btn-primary{background:linear-gradient(135deg,#4F46E5,#4338CA);color:#fff}
        .tad-btn-primary:disabled{opacity:.65;cursor:not-allowed}
      `}</style>

      <div className="tad-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="tad-drawer" ref={drawerRef} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="tad-header">
            <div>
              <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0, fontSize: 16 }}>
                + New Task
              </h5>
              <div style={{ fontSize: 12, color: "#6366F1", marginTop: 2, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: brand?.color || "#6366F1", display: "inline-block" }} />
                {brand?.name || "—"}
                <span style={{ background: "#DCFCE7", color: "#15803D", padding: "1px 8px", borderRadius: 20, fontWeight: 700, fontSize: 10, marginLeft: 4 }}>✓ In Scope</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: "4px 8px" }}>
              <i className="bi bi-x-lg" />
            </button>
          </div>

          {/* Body */}
          <div className="tad-body">
            {done ? (
              <div style={{ textAlign: "center", padding: "64px 24px" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <i className="bi bi-check-lg" style={{ fontSize: 32, color: "#15803D" }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Task Created!</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>The task has been assigned and the client notified.</div>
              </div>
            ) : (
              <>
                {/* Brand services badges */}
                {(fullBrand?.services || []).length > 0 && (
                  <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
                    {fullBrand.services.map(s => {
                      const [bg, fg] = SVC_COLORS[s] || ["#F1F5F9","#475569"];
                      return <span key={s} style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{SVC_LABELS[s] || s}</span>;
                    })}
                  </div>
                )}

                {/* Mode tabs */}
                {availableModes.length > 0 && (
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
                )}

                <form id="tad-form" onSubmit={handleSubmit}>

                  {/* ── PRODUCTION ── */}
                  {createMode === "production" && (<>
                    {/* Task title */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={LBL}>Task Title <span style={{ color: "#EF4444" }}>*</span></label>
                      <input className="tad-input" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                        placeholder="e.g. New Instagram reel for product launch" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                      <span style={{ fontSize: 16 }}>🤖</span>
                      <div style={{ fontSize: 12, color: "#4338CA", lineHeight: 1.5 }}>ID + nomenclature auto-generated. Each stage has its own deadline &amp; assignee.</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={LBL}>Creative Type</label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {availableCtypes.map(([val, lbl]) => {
                          const active = prodForm.contentType === val;
                          const di = deliverableInfo[val];
                          const over = di.limit > 0 && di.used >= di.limit;
                          return (
                            <button key={val} type="button" onClick={() => setProdForm(f => ({ ...f, contentType: val }))}
                              style={{ padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${active ? CTYPE_COLORS[val] : over ? "#FCA5A5" : "#E5E7EB"}`,
                                background: active ? CTYPE_COLORS[val] + "18" : over ? "#FEF2F2" : "#fff",
                                color: active ? CTYPE_COLORS[val] : over ? "#DC2626" : "#374151",
                                fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .15s",
                                display: "flex", alignItems: "center", gap: 5 }}>
                              {lbl}
                              {di.limit > 0 && <span style={{ fontSize: 10, opacity: .7 }}>({di.used}/{di.limit})</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {brand?._id && (
                      <div style={{ background: "#F8FAFC", borderRadius: 8, borderLeft: "3px solid #6366F1", padding: "10px 14px", marginBottom: 18 }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Auto-generated</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 6 }}>
                          <div>
                            <div style={{ fontSize: 10, color: "#94A3B8" }}>Task ID</div>
                            <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#6366F1", fontSize: 15 }}>
                              {nomLoading ? "…" : nomenclature || "—"}
                            </div>
                          </div>
                          {nomenclature && (
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
                      {prodForm.stages.map((stg, i) => {
                        const stageEmps = filterByDept(employees, STAGE_DEPT_KEYWORDS[i]);
                        return (
                          <div key={i} style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <div style={{ width: 26, height: 26, borderRadius: 7, background: STAGE_COLORS[i], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                              <input type="text" className="tad-input" value={stg.name} style={{ flex: 1, padding: "5px 10px", fontSize: 13 }}
                                onChange={e => setProdForm(f => { const stages = [...f.stages]; stages[i] = { ...stages[i], name: e.target.value }; return { ...f, stages }; })} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                                  Assignees · {STAGE_TEAM_LABELS[i]} team
                                </label>
                                {stageEmps.length === 0 ? (
                                  <div style={{ fontSize: 12, color: "#94a3b8", padding: "6px 10px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff" }}>No employees in this department</div>
                                ) : (
                                  <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, maxHeight: 120, overflowY: "auto", background: "#fff" }}>
                                    {stageEmps.map((emp, ei) => {
                                      const n = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                                      const checked = (stg.assignedTo || []).includes(String(emp._id));
                                      return (
                                        <label key={emp._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", borderBottom: ei < stageEmps.length - 1 ? "1px solid #F1F5F9" : "none", background: checked ? STAGE_COLORS[i] + "12" : "transparent" }}>
                                          <input type="checkbox" checked={checked} style={{ accentColor: STAGE_COLORS[i], width: 14, height: 14 }}
                                            onChange={e => setProdForm(f => { const stages = [...f.stages]; const curr = stages[i].assignedTo || []; stages[i] = { ...stages[i], assignedTo: e.target.checked ? [...curr, String(emp._id)] : curr.filter(id => id !== String(emp._id)) }; return { ...f, stages }; })} />
                                          <span style={{ fontSize: 12, color: checked ? "#1E293B" : "#374151", fontWeight: checked ? 700 : 400 }}>{n || "Employee"}</span>
                                          {emp.dept && <span style={{ fontSize: 10, color: "#94a3b8" }}>({emp.dept})</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                                  Deadline {(stg.assignedTo || []).length > 0 && <span style={{ color: "#EF4444" }}>*</span>}
                                </label>
                                <input type="datetime-local" className="tad-input" value={stg.deadline}
                                  style={{ borderColor: ((stg.assignedTo || []).length > 0 && !stg.deadline) ? "#FCA5A5" : "" }}
                                  onChange={e => setProdForm(f => { const stages = [...f.stages]; stages[i] = { ...stages[i], deadline: e.target.value }; return { ...f, stages }; })} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>)}

                  {/* ── WEBSITE redirect ── */}
                  {createMode === "website" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "32px 20px", textAlign: "center", background: "#F0F9FF", border: "1.5px dashed #BAE6FD", borderRadius: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="bi bi-code-slash" style={{ fontSize: 24, color: "#1D4ED8" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Use the Web Development Projects page</div>
                        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, maxWidth: 340 }}>Web tasks are managed through the dedicated Projects page.</div>
                      </div>
                    </div>
                  )}

                  {/* ── SEO ── */}
                  {createMode === "seo" && (() => {
                    const cat      = SEO_CATS.find(c => c.key === seoForm.seoCategory) || SEO_CATS[0];
                    const isBlog   = seoForm.seoCategory === "blog";
                    const isOnPage = seoForm.seoCategory === "onpage";
                    const isOffPage    = seoForm.seoCategory === "offpage";
                    const isTechnical  = seoForm.seoCategory === "technical";
                    const isBacklinks  = seoForm.seoCategory === "backlinks";
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
                          <span><strong>{cat.label}</strong> task for <strong>{brand?.name || "this brand"}</strong></span>
                        </div>
                        {isBlog && (<>
                          <div><label style={LBL}>Blog Title <span style={{ color: "#EF4444" }}>*</span></label><input className="tad-input" placeholder="e.g. Top 10 Hotels in Goa" value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} /></div>
                          <div><label style={LBL}>Primary Keywords</label><input className="tad-input" placeholder="e.g. hotels in goa, best hotels goa" value={seoForm.primaryKeywords} onChange={e => setSeoForm(f => ({ ...f, primaryKeywords: e.target.value }))} /></div>
                        </>)}
                        {isOnPage && (<>
                          <div><label style={LBL}>Task Title <span style={{ color: "#EF4444" }}>*</span></label><input className="tad-input" placeholder="e.g. Optimise homepage meta tags" value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} /></div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                              <label style={LBL}>Page URLs</label>
                              <button type="button" onClick={() => setSeoForm(f => ({ ...f, pageUrls: [...(f.pageUrls || [""]), ""] }))} style={{ background: "#EEF2FF", color: "#4F46E5", border: "1.5px solid #C7D2FE", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add URL</button>
                            </div>
                            {(seoForm.pageUrls || [""]).map((url, i) => (
                              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                <input className="tad-input" placeholder={`https://example.com/page-${i + 1}`} value={url} onChange={e => { const urls = [...(seoForm.pageUrls || [""])]; urls[i] = e.target.value; setSeoForm(f => ({ ...f, pageUrls: urls })); }} />
                                {(seoForm.pageUrls || []).length > 1 && <button type="button" onClick={() => setSeoForm(f => ({ ...f, pageUrls: (f.pageUrls || []).filter((_, idx) => idx !== i) }))} style={{ background: "#FEF2F2", color: "#DC2626", border: "1.5px solid #FECACA", borderRadius: 7, padding: "0 9px", cursor: "pointer", fontSize: 13 }}><i className="bi bi-x-lg" /></button>}
                              </div>
                            ))}
                          </div>
                        </>)}
                        {(isOffPage || isTechnical) && (<>
                          <div><label style={LBL}>Task Title</label><input className="tad-input" placeholder={isOffPage ? "e.g. Guest post on travelblog.com" : "e.g. Fix Core Web Vitals"} value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} /></div>
                          <div><label style={LBL}>Description <span style={{ color: "#EF4444" }}>*</span></label><textarea className="tad-input" style={{ height: 90, resize: "vertical" }} placeholder="Describe the task…" value={seoForm.description} onChange={e => setSeoForm(f => ({ ...f, description: e.target.value }))} /></div>
                        </>)}
                        {isBacklinks && (<>
                          <div><label style={LBL}>Task Title</label><input className="tad-input" placeholder="e.g. Build 5 DoFollow backlinks from DA40+ sites" value={seoForm.title} onChange={e => setSeoForm(f => ({ ...f, title: e.target.value }))} /></div>
                          <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: seoForm.internalLinking ? "#059669" : "#374151", marginBottom: seoForm.internalLinking ? 10 : 0 }}>
                              <input type="checkbox" checked={seoForm.internalLinking} onChange={e => setSeoForm(f => ({ ...f, internalLinking: e.target.checked }))} style={{ accentColor: "#059669", width: 15, height: 15 }} />
                              Internal Linking
                            </label>
                            {seoForm.internalLinking && <textarea className="tad-input" style={{ height: 72, resize: "vertical" }} placeholder="Describe internal linking task…" value={seoForm.internalLinkingTask} onChange={e => setSeoForm(f => ({ ...f, internalLinkingTask: e.target.value }))} />}
                          </div>
                          <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: seoForm.externalLinking ? "#4F46E5" : "#374151", marginBottom: seoForm.externalLinking ? 10 : 0 }}>
                              <input type="checkbox" checked={seoForm.externalLinking} onChange={e => setSeoForm(f => ({ ...f, externalLinking: e.target.checked }))} style={{ accentColor: "#4F46E5", width: 15, height: 15 }} />
                              External Linking
                            </label>
                            {seoForm.externalLinking && <textarea className="tad-input" style={{ height: 72, resize: "vertical" }} placeholder="Describe external linking task…" value={seoForm.externalLinkingTask} onChange={e => setSeoForm(f => ({ ...f, externalLinkingTask: e.target.value }))} />}
                          </div>
                        </>)}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={LBL}>Priority</label>
                            <select className="tad-select" value={seoForm.priority} onChange={e => setSeoForm(f => ({ ...f, priority: e.target.value }))}>
                              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={LBL}>Assigned To</label>
                            <select className="tad-select" value={seoForm.assignedTo} onChange={e => setSeoForm(f => ({ ...f, assignedTo: e.target.value }))}>
                              <option value="">Unassigned</option>
                              {employees.filter(e => { const d = (e.dept || "").toLowerCase(); return d.includes("digital") || d.includes("marketing") || d.includes("seo"); }).map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.name || "Employee"}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={LBL}>Due Date</label>
                          <input type="date" className="tad-input" value={seoForm.dueDate} onChange={e => setSeoForm(f => ({ ...f, dueDate: e.target.value }))} />
                          {seoForm.dueDate && <div style={{ fontSize: 11, color: "#4F46E5", fontWeight: 700, marginTop: 5 }}><i className="bi bi-calendar-check me-1" />{seoDayName(seoForm.dueDate)}</div>}
                          {/* Brand blog schedule */}
                          {seoForm.seoCategory === "blog" && (fullBrand?.seoSettings?.blogSchedule || []).length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 5 }}>Brand schedule — pick a day</div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {BLOG_SCHED_DAY_ORDER.filter(d => (fullBrand.seoSettings.blogSchedule || []).includes(d)).map(day => {
                                  const date = nextDateForDay(day);
                                  const isSel = seoForm.dueDate === date;
                                  return (
                                    <button key={day} type="button" onClick={() => setSeoForm(f => ({ ...f, dueDate: date }))}
                                      style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: isSel ? "#6366F1" : "#EEF2FF", color: isSel ? "#fff" : "#4F46E5", border: `1.5px solid ${isSel ? "#6366F1" : "#C7D2FE"}` }}>
                                      {day} · {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        {(isBlog || isOnPage || isBacklinks) && (
                          <div><label style={LBL}>Notes</label><textarea className="tad-input" style={{ height: 60, resize: "vertical" }} placeholder="Additional notes…" value={seoForm.description} onChange={e => setSeoForm(f => ({ ...f, description: e.target.value }))} /></div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── ADS / BRANDING / GENERAL ── */}
                  {["ads","branding","general"].includes(createMode) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {createMode !== "general" && (
                        <div style={{ background: createMode === "ads" ? "#FFFBEB" : "#FDF2F8", border: `1px solid ${createMode === "ads" ? "#FDE68A" : "#F9A8D4"}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#374151", display: "flex", gap: 8 }}>
                          <span>{createMode === "ads" ? "📢" : "🎨"}</span>
                          {createMode === "ads" ? `Ad task for ${brand?.name || "this brand"}` : `Branding task for ${brand?.name || "this brand"}`}
                        </div>
                      )}
                      <div><label style={LBL}>Title <span style={{ color: "#EF4444" }}>*</span></label><input className="tad-input" placeholder="Task title" value={genForm.title} onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))} /></div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={LBL}>Priority</label>
                          <select className="tad-select" value={genForm.priority} onChange={e => setGenForm(f => ({ ...f, priority: e.target.value }))}>
                            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={LBL}>Assigned To</label>
                          <select className="tad-select" value={genForm.assignedTo} onChange={e => setGenForm(f => ({ ...f, assignedTo: e.target.value }))}>
                            <option value="">Unassigned</option>
                            {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name || "Employee"}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={LBL}>Due Date &amp; Time</label>
                        <input type="datetime-local" className="tad-input" value={genForm.dueDate} onChange={e => setGenForm(f => ({ ...f, dueDate: e.target.value }))} />
                      </div>
                      <div><label style={LBL}>Description</label><textarea className="tad-input" style={{ height: 80, resize: "vertical" }} placeholder="Task details…" value={genForm.description} onChange={e => setGenForm(f => ({ ...f, description: e.target.value }))} /></div>
                    </div>
                  )}

                </form>
              </>
            )}
          </div>

          {/* Footer */}
          {!done && (
            <div className="tad-footer">
              <button type="button" className="tad-btn tad-btn-ghost" onClick={onClose}>
                {createMode === "website" ? "Close" : "Skip (scope saved)"}
              </button>
              {createMode !== "website" && (
                <button type="submit" form="tad-form" className="tad-btn tad-btn-primary" disabled={submitting}>
                  {submitting
                    ? <><div className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }} />Creating…</>
                    : <><i className="bi bi-plus-circle-fill" />Create Task</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
