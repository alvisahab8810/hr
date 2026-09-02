// pages/dashboard/website/positions.js — Job Positions
// Create / edit / delete the career position posts that render on the
// website's /jobs page (internship & experienced tabs). Writes to the shared
// Mongo "jobposts" collection; viralon-new reads it to build the page.
// Long-form fields use a rich-text editor; the website renders that HTML
// inside its existing .job_description styles, so the design stays identical.
import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import RichFieldEditor from "@/components/RichFieldEditor";

const IMAGES = [
  { value: "/assets/img/careers/img1.webp", label: "Image 1" },
  { value: "/assets/img/careers/img2.webp", label: "Image 2" },
  { value: "/assets/img/careers/img3.webp", label: "Image 3" },
];

const EMPTY_FORM = {
  title: "", category: "internship", status: "open",
  jobType: "Full Time", experience: "", location: "Lucknow", qualification: "",
  image: IMAGES[0].value,
  highlights: "", aboutUs: "", jobOverview: "",
  responsibilities: "", requiredQualifications: "", whatWeOffer: "", howToApply: "",
};

/* ── Convert stored values (plain strings / legacy arrays) into editor HTML ── */
const escapeHtml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toListHtml = (v) => {
  if (Array.isArray(v)) {
    // Heal docs saved through a stale [String] schema (HTML inside an array).
    if (v.some(x => typeof x === "string" && x.includes("<"))) return v.join("");
    return v.length ? `<ul>${v.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : "";
  }
  return typeof v === "string" ? v : "";
};
const toParaHtml = (v) => {
  const s0 = String(v || "").trim();
  if (!s0) return "";
  return s0.includes("<") ? s0 : s0.split("\n").filter(Boolean).map(l => `<p>${escapeHtml(l)}</p>`).join("");
};

/* ─── Reusable top stat card (same design as payroll home) ────────── */
function KpiCard({ icon, label, value, accent }) {
  return (
    <div className="kpi-card" style={{
      background: `linear-gradient(160deg, #fff 55%, ${accent.bg} 165%)`,
      borderRadius: 16, padding: "17px 18px 16px",
      border: `1px solid ${accent.bg}`, boxShadow: "0 3px 12px rgba(15,23,42,.06)",
      display: "flex", alignItems: "center", gap: 14, height: "100%",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon }} />
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0,
        background: accent.icon,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 6px 16px ${accent.shadow}`,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 19, color: "#fff" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1.05, letterSpacing: "-0.8px" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function JobPositions({ websiteOrigin }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // view: "list" | "form"; editingId null = create
  const [view, setView]           = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/job-posts", { credentials: "include" });
      const data = await r.json();
      if (data.success) setPosts(data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const _v = (val) => loading ? "—" : val;
  const internshipCount  = useMemo(() => posts.filter(p => p.category === "internship").length, [posts]);
  const experiencedCount = useMemo(() => posts.filter(p => p.category === "experienced").length, [posts]);
  const openCount        = useMemo(() => posts.filter(p => p.status === "open").length, [posts]);

  const set     = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setRich = (key) => (html) => setForm(f => ({ ...f, [key]: html }));

  const startCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setView("form"); };
  const startEdit = (p) => {
    setForm({
      title: p.title || "", category: p.category || "internship", status: p.status || "open",
      jobType: p.jobType || "Full Time", experience: p.experience || "",
      location: p.location || "", qualification: p.qualification || "",
      image: p.image || IMAGES[0].value,
      highlights: toListHtml(p.highlights),
      aboutUs: toParaHtml(p.aboutUs),
      jobOverview: toParaHtml(p.jobOverview),
      responsibilities: toListHtml(p.responsibilities),
      requiredQualifications: toListHtml(p.requiredQualifications),
      whatWeOffer: toListHtml(p.whatWeOffer),
      howToApply: toParaHtml(p.howToApply),
    });
    setEditingId(p._id);
    setView("form");
  };
  const backToList = () => { setView("list"); setEditingId(null); };

  const savePost = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const url    = editingId ? `/api/admin/job-posts/${editingId}` : "/api/admin/job-posts";
      const method = editingId ? "PUT" : "POST";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (data.success) {
        toast.success(editingId ? "Position updated" : "Position published");
        await fetchPosts();
        backToList();
      } else {
        toast.error(data.message || "Save failed");
      }
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (p) => {
    try {
      const r = await fetch(`/api/admin/job-posts/${p._id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, status: p.status === "open" ? "closed" : "open" }),
      });
      const data = await r.json();
      if (data.success) {
        toast.success(p.status === "open" ? "Position closed" : "Position reopened");
        fetchPosts();
      } else toast.error(data.message || "Update failed");
    } catch { toast.error("Update failed"); }
  };

  const deletePost = async (p) => {
    if (!window.confirm(`Delete "${p.title}"? This removes it from the website too.`)) return;
    try {
      const r = await fetch(`/api/admin/job-posts/${p._id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json();
      if (data.success) { toast.success("Position deleted"); fetchPosts(); }
      else toast.error(data.message || "Delete failed");
    } catch { toast.error("Delete failed"); }
  };

  return (
    <section className="main-dashboard-area">
      <Head>
        <title>Job Positions — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .jp-table tbody tr:hover { background: #F8FAFF; }
          .jp-input:focus, .jp-select:focus { border-color: #6366F1 !important; }
          .rfe-wrap:focus-within { border-color: #6366F1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.08); }
          .rfe-content .ProseMirror {
            padding: 12px 15px; outline: none; font-size: 13.5px; color: #1E293B;
            line-height: 1.6; min-height: inherit;
          }
          .rfe-content .ProseMirror p { margin: 0 0 6px; }
          .rfe-content .ProseMirror ul, .rfe-content .ProseMirror ol { margin: 0 0 6px; padding-left: 22px; }
          .rfe-content .ProseMirror li { margin-bottom: 3px; }
          .rfe-content .ProseMirror li p { margin: 0; }
        `}</style>
      </Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            {/* ── Compact header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {view === "form" ? (
                  <button onClick={backToList} title="Back" style={{
                    width: 38, height: 38, borderRadius: 10, border: "1px solid #E2E8F0",
                    background: "#fff", color: "#475569", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <i className="bi bi-arrow-left" style={{ fontSize: 15 }} />
                  </button>
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: "linear-gradient(135deg,#6366F1,#818CF8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 5px 14px rgba(99,102,241,.25)",
                  }}>
                    <i className="bi bi-megaphone-fill" style={{ fontSize: 17, color: "#fff" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>
                    {view === "form" ? (editingId ? "Edit Position" : "New Position") : "Job Positions"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                    {view === "form"
                      ? "This post renders on the website's /jobs page exactly as designed."
                      : "Openings shown on the website's careers page — internship & experienced tabs."}
                  </div>
                </div>
              </div>
              {view === "list" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={fetchPosts} disabled={loading} style={{
                    width: 38, height: 38, borderRadius: 10, border: "1px solid #E2E8F0",
                    background: "#fff", color: "#475569", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }} title="Refresh">
                    <i className="bi bi-arrow-clockwise" style={{ fontSize: 15 }} />
                  </button>
                  <button onClick={startCreate} style={{
                    border: "none", borderRadius: 10, padding: "9px 18px",
                    background: "linear-gradient(135deg,#6366F1,#818CF8)",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    boxShadow: "0 4px 12px rgba(99,102,241,.3)",
                  }}>
                    <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />
                    New Position
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={backToList} disabled={saving} style={{
                    height: 38, padding: "0 16px", borderRadius: 10,
                    border: "1px solid #E2E8F0", background: "#fff", color: "#475569",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>
                    Cancel
                  </button>
                  <button onClick={savePost} disabled={saving} style={{
                    border: "none", borderRadius: 10, padding: "0 20px", height: 38,
                    background: "linear-gradient(135deg,#6366F1,#818CF8)",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    boxShadow: "0 4px 12px rgba(99,102,241,.3)",
                    opacity: saving ? 0.6 : 1,
                  }}>
                    <i className="bi bi-check-lg" style={{ fontSize: 15 }} />
                    {saving ? "Saving…" : (editingId ? "Update Position" : "Publish Position")}
                  </button>
                </div>
              )}
            </div>

            {view === "list" ? (
              <>
                {/* ── KPI stat cards ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 22, marginBottom: 26 }}>
                  <KpiCard icon="bi-collection-fill"   label="Total Positions" value={_v(posts.length)}      accent={{ bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" }} />
                  <KpiCard icon="bi-mortarboard-fill"  label="Internship"      value={_v(internshipCount)}   accent={{ bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)" }} />
                  <KpiCard icon="bi-award-fill"        label="Experienced"     value={_v(experiencedCount)}  accent={{ bg: "#FFEDD5", icon: "#EA580C", shadow: "rgba(249,115,22,.18)" }} />
                  <KpiCard icon="bi-unlock-fill"       label="Open"            value={_v(openCount)}         accent={{ bg: "#F3E8FF", icon: "#9333EA", shadow: "rgba(168,85,247,.18)" }} />
                </div>

                {/* ── Positions table ── */}
                <div style={{
                  background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
                  boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden", marginBottom: 14,
                }}>
                  <div style={{
                    padding: "14px 18px 12px", borderBottom: "1px solid #F4F4FD",
                    display: "flex", alignItems: "center", gap: 9,
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9, background: "#6366F118",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <i className="bi bi-megaphone-fill" style={{ fontSize: 14, color: "#6366F1" }} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Positions</span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, background: "#EEF2FF", color: "#6366F1",
                      borderRadius: 20, padding: "2px 10px",
                    }}>
                      {loading ? "…" : posts.length}
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="jp-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                          {["Position", "Category", "Type", "Experience", "Status", "Created", "Actions"].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={7} style={s.emptyCell}>Loading positions…</td></tr>
                        ) : posts.length === 0 ? (
                          <tr><td colSpan={7} style={s.emptyCell}>
                            No positions yet — click <b>New Position</b> to publish the first opening.
                          </td></tr>
                        ) : posts.map(p => (
                          <tr key={p._id}>
                            <td style={{ ...s.td, fontWeight: 700, color: "#0F172A" }}>
                              {p.title}
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginTop: 2 }}>/jobs/{p.slug}</div>
                            </td>
                            <td style={s.td}>
                              <span style={{
                                display: "inline-block", padding: "4px 10px", borderRadius: 999,
                                background: p.category === "internship" ? "#DCFCE7" : "#FFEDD5",
                                color: p.category === "internship" ? "#15803D" : "#C2410C",
                                fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", textTransform: "capitalize",
                              }}>
                                {p.category}
                              </span>
                            </td>
                            <td style={{ ...s.td, color: "#64748B", whiteSpace: "nowrap" }}>{p.jobType}</td>
                            <td style={{ ...s.td, color: "#64748B" }}>{p.experience || "—"}</td>
                            <td style={s.td}>
                              <span style={{
                                display: "inline-block", padding: "4px 10px", borderRadius: 999,
                                background: p.status === "open" ? "#EEF2FF" : "#FEE2E2",
                                color: p.status === "open" ? "#6366F1" : "#DC2626",
                                fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", textTransform: "capitalize",
                              }}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ ...s.td, color: "#64748B", whiteSpace: "nowrap" }}>
                              {new Date(p.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </td>
                            <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                              <button onClick={() => startEdit(p)} title="Edit" style={s.actionBtn("#EEF2FF", "#6366F1")}>
                                <i className="bi bi-pencil-fill" style={{ fontSize: 11 }} /> Edit
                              </button>
                              <button onClick={() => toggleStatus(p)} title={p.status === "open" ? "Close position" : "Reopen position"}
                                style={s.actionBtn(p.status === "open" ? "#FFF7ED" : "#F0FDF4", p.status === "open" ? "#C2410C" : "#15803D")}>
                                <i className={`bi ${p.status === "open" ? "bi-lock-fill" : "bi-unlock-fill"}`} style={{ fontSize: 11 }} />
                                {p.status === "open" ? "Close" : "Reopen"}
                              </button>
                              <button onClick={() => deletePost(p)} title="Delete" style={s.actionBtn("#FEF2F2", "#DC2626")}>
                                <i className="bi bi-trash-fill" style={{ fontSize: 11 }} /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* ── ADD / EDIT FORM ── */
              <div style={{ marginTop: 22 }}>

                {/* Basics */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelChip}><i className="bi bi-card-heading" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                    <div>
                      <div style={s.panelTitle}>Listing Card</div>
                      <div style={s.panelSub}>What visitors see on the /jobs page card</div>
                    </div>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Position Title <span style={{ color: "#DC2626" }}>*</span></label>
                        <input className="jp-input" style={s.input} placeholder="e.g. Content Writer Intern"
                          value={form.title} onChange={set("title")} />
                      </div>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Category</label>
                        <select className="jp-select" style={s.input} value={form.category} onChange={set("category")}>
                          <option value="internship">Internship Program</option>
                          <option value="experienced">Experienced Professional</option>
                        </select>
                      </div>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Status</label>
                        <select className="jp-select" style={s.input} value={form.status} onChange={set("status")}>
                          <option value="open">Open — visible on website</option>
                          <option value="closed">Closed — hidden</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Job Type</label>
                        <input className="jp-input" style={s.input} placeholder="Full Time" value={form.jobType} onChange={set("jobType")} />
                      </div>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Experience</label>
                        <input className="jp-input" style={s.input} placeholder="3-5 years of experience" value={form.experience} onChange={set("experience")} />
                      </div>
                    </div>

                    <div style={{ ...s.field, marginBottom: 14 }}>
                      <label style={s.fieldLabel}>Card Image</label>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {IMAGES.map(img => {
                          const selected = form.image === img.value;
                          return (
                            <div key={img.value} onClick={() => setForm(f => ({ ...f, image: img.value }))} style={{
                              width: 150, borderRadius: 12, overflow: "hidden", cursor: "pointer",
                              border: selected ? "2px solid #6366F1" : "2px solid #E2E8F0",
                              boxShadow: selected ? "0 4px 12px rgba(99,102,241,.25)" : "none",
                              position: "relative", transition: "border-color .15s, box-shadow .15s",
                            }}>
                              <img src={`${websiteOrigin}${img.value}`} alt={img.label}
                                style={{ width: "100%", height: 84, objectFit: "cover", display: "block" }} />
                              <div style={{
                                padding: "6px 10px", fontSize: 11.5, fontWeight: 700,
                                color: selected ? "#6366F1" : "#64748B",
                                background: selected ? "#EEF2FF" : "#F8FAFC",
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                              }}>
                                {img.label}
                                {selected && <i className="bi bi-check-circle-fill" style={{ fontSize: 13 }} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={s.field}>
                      <label style={s.fieldLabel}>Card Highlights</label>
                      <div style={s.fieldHint}>The 2 bullet points on the listing card — use the bullet-list button, one point per line.</div>
                      <RichFieldEditor value={form.highlights} onChange={setRich("highlights")} minHeight={90}
                        placeholder={"Bachelor's degree in English, Communications, or a related field.\nStrong portfolio showcasing diverse writing samples."} />
                    </div>
                  </div>
                </div>

                {/* Detail page */}
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelChip}><i className="bi bi-file-text-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                    <div>
                      <div style={s.panelTitle}>Detail Page</div>
                      <div style={s.panelSub}>Shown on /jobs/&lt;slug&gt; — sections left empty are hidden on the website</div>
                    </div>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, marginBottom: 16 }}>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Job Location</label>
                        <input className="jp-input" style={s.input} placeholder="Lucknow" value={form.location} onChange={set("location")} />
                      </div>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Qualification</label>
                        <input className="jp-input" style={s.input}
                          placeholder="Bachelor's Degree in English, Communications, or a related field"
                          value={form.qualification} onChange={set("qualification")} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 16 }}>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>About Us</label>
                        <RichFieldEditor value={form.aboutUs} onChange={setRich("aboutUs")} minHeight={100}
                          placeholder="Viralon is a dynamic, creative-driven company specializing in Marketing…" />
                      </div>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Job Overview</label>
                        <RichFieldEditor value={form.jobOverview} onChange={setRich("jobOverview")} minHeight={100}
                          placeholder="As a Content Writer Intern, you will work closely with our senior content team…" />
                      </div>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Key Responsibilities</label>
                        <div style={s.fieldHint}>Use the bullet-list button — each point becomes a bullet on the website.</div>
                        <RichFieldEditor value={form.responsibilities} onChange={setRich("responsibilities")} minHeight={130}
                          placeholder="Assist in writing, editing, and proofreading content…" />
                      </div>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>Required Qualifications</label>
                        <div style={s.fieldHint}>Use the bullet-list button — each point becomes a bullet on the website.</div>
                        <RichFieldEditor value={form.requiredQualifications} onChange={setRich("requiredQualifications")} minHeight={130}
                          placeholder="Bachelor's degree in English, Communications, Journalism, or a related field…" />
                      </div>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>What We Offer</label>
                        <div style={s.fieldHint}>Use the bullet-list button — each point becomes a bullet on the website.</div>
                        <RichFieldEditor value={form.whatWeOffer} onChange={setRich("whatWeOffer")} minHeight={110}
                          placeholder="Mentorship and professional development opportunities…" />
                      </div>
                      <div style={s.field}>
                        <label style={s.fieldLabel}>How to Apply</label>
                        <RichFieldEditor value={form.howToApply} onChange={setRich("howToApply")} minHeight={100}
                          placeholder="Please submit your updated resume, a cover letter, and a portfolio…" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form footer */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 20 }}>
                  <button onClick={backToList} disabled={saving} style={{
                    height: 40, padding: "0 18px", borderRadius: 10,
                    border: "1px solid #E2E8F0", background: "#fff", color: "#475569",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>
                    Cancel
                  </button>
                  <button onClick={savePost} disabled={saving} style={{
                    border: "none", borderRadius: 10, padding: "0 22px", height: 40,
                    background: "linear-gradient(135deg,#6366F1,#818CF8)",
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    boxShadow: "0 4px 12px rgba(99,102,241,.3)",
                    opacity: saving ? 0.6 : 1,
                  }}>
                    <i className="bi bi-check-lg" style={{ fontSize: 15 }} />
                    {saving ? "Saving…" : (editingId ? "Update Position" : "Publish Position")}
                  </button>
                </div>
              </div>
            )}

          </div>
        </section>
      </div>
    </section>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  // Card-image thumbnails live on the website's server (same origin the
  // career resumes use) — local dev: http://localhost:3000.
  const websiteOrigin = (process.env.WEBSITE_ORIGIN || "https://admin.viralon.in").replace(/\/+$/, "");
  return { props: { websiteOrigin } };
}

/* ══ Styles ══ */
const s = {
  panel: {
    background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
    boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden", marginBottom: 16,
  },
  panelHead: {
    padding: "14px 18px 12px", borderBottom: "1px solid #F4F4FD",
    display: "flex", alignItems: "center", gap: 10,
  },
  panelChip: {
    width: 30, height: 30, borderRadius: 9, background: "#6366F118",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  panelTitle: { fontWeight: 800, fontSize: 13, color: "#0F172A", lineHeight: 1.3 },
  panelSub:   { fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 1 },
  field:      { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748B" },
  fieldHint:  { fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: -2 },
  input:      { height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13.5, color: "#1E293B", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  th:         { textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B", borderBottom: "1px solid #EEF0F7", whiteSpace: "nowrap" },
  td:         { padding: "13px 16px", fontSize: 13.5, color: "#334155", borderBottom: "1px solid #F4F4FD", verticalAlign: "middle" },
  emptyCell:  { textAlign: "center", padding: "40px 16px", color: "#94A3B8", fontSize: 13.5 },
  actionBtn: (bg, color) => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer",
    background: bg, color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    marginRight: 6,
  }),
};
