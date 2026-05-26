import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const TEMPLATE_CATEGORIES = [
  { key: "onboarding",   label: "Client Onboarding",  icon: "bi-person-plus-fill",      color: "#6366F1" },
  { key: "delivery",     label: "Content Delivery",   icon: "bi-send-fill",             color: "#10B981" },
  { key: "approval",     label: "Approval Request",   icon: "bi-check-circle-fill",     color: "#F59E0B" },
  { key: "followup",     label: "Follow Up",          icon: "bi-arrow-clockwise",       color: "#EC4899" },
  { key: "report",       label: "Monthly Report",     icon: "bi-bar-chart-fill",        color: "#8B5CF6" },
  { key: "feedback",     label: "Feedback Request",   icon: "bi-star-fill",             color: "#EF4444" },
];

const SAMPLE_TEMPLATES = [
  {
    id: 1, category: "onboarding", name: "Welcome New Client",
    subject: "Welcome to Viralon — Let's Get Started! 🚀",
    preview: "Hi {client_name}, We're thrilled to have you on board! Here's what you can expect from our partnership…",
    lastUsed: "2 days ago",
  },
  {
    id: 2, category: "delivery", name: "Content Ready for Review",
    subject: "{brand_name} — {month} Content Ready for Your Review",
    preview: "Hi {client_name}, Your {content_count} pieces of content for {month} are ready! Please review and share your feedback…",
    lastUsed: "1 week ago",
  },
  {
    id: 3, category: "approval", name: "Content Calendar Approval",
    subject: "Please Approve Your {month} Content Calendar",
    preview: "Hi {client_name}, We've prepared your content calendar for {month}. Please take a moment to review and approve…",
    lastUsed: "3 days ago",
  },
  {
    id: 4, category: "report", name: "Monthly Performance Report",
    subject: "{brand_name} — {month} Performance Summary",
    preview: "Hi {client_name}, Here's a summary of your brand performance for {month}. We've seen great results in engagement…",
    lastUsed: "2 weeks ago",
  },
  {
    id: 5, category: "followup", name: "Pending Approval Follow-up",
    subject: "Friendly Reminder: {brand_name} Content Awaiting Approval",
    preview: "Hi {client_name}, Just a friendly reminder that your content is ready and waiting for your approval…",
    lastUsed: "5 days ago",
  },
];

export default function EmailCenterPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [composeMode, setComposeMode] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = SAMPLE_TEMPLATES.filter(t => {
    const matchCat   = !selectedCategory || t.category === selectedCategory;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Email Center — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .ec-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
          .ec-btn { border:none; cursor:pointer; border-radius:10px; padding:7px 14px; font-size:13px; font-weight:600; display:inline-flex; align-items:center; gap:6px; transition:all .14s; }
          .ec-btn-primary { background:#4F46E5; color:#fff; }
          .ec-btn-primary:hover { background:#4338CA; }
          .ec-btn-ghost { background:#F1F5F9; color:#475569; }
          .ec-btn-ghost:hover { background:#E2E8F0; }
          .ec-input { padding:8px 12px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:13px; outline:none; width:100%; background:#fff; }
          .ec-input:focus { border-color:#6366F1; }
          .ec-cat-chip { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:10px; border:1.5px solid #E5E7EB; cursor:pointer; font-size:12px; font-weight:600; transition:all .14s; background:#fff; }
          .ec-cat-chip.active { border-color:currentColor; }
          .ec-template-card { background:#fff; border-radius:14px; border:1.5px solid #F1F5F9; padding:16px 18px; margin-bottom:12px; cursor:pointer; transition:all .14s; }
          .ec-template-card:hover { border-color:#A5B4FC; box-shadow:0 4px 16px rgba(99,102,241,.08); }
          .ec-template-card.selected { border-color:#6366F1; background:#F5F3FF; }
          .ec-detail { background:#fff; border-radius:16px; border:1.5px solid #F1F5F9; padding:24px; }
          .ec-var { display:inline-block; background:#EEF2FF; color:#4F46E5; border-radius:5px; padding:1px 6px; font-size:11px; font-weight:700; font-family:monospace; margin:0 2px; }
          .ec-layout { display:grid; grid-template-columns:340px 1fr; gap:20px; align-items:start; }
          @media(max-width:900px) { .ec-layout { grid-template-columns:1fr; } }
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
                <li className="breadcrumb-item active">Email Center</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* Header */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">Email Center</h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Automated email templates for client communication</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ec-btn ec-btn-ghost" onClick={() => setComposeMode(true)}>
                    <i className="bi bi-pencil-square" /> Compose
                  </button>
                  <button className="ec-btn ec-btn-primary">
                    <i className="bi bi-plus-circle" /> New Template
                  </button>
                </div>
              </div>

              {/* Category filters */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                <div className={`ec-cat-chip ${!selectedCategory ? "active" : ""}`}
                  style={{ color: "#4F46E5", borderColor: !selectedCategory ? "#6366F1" : "#E5E7EB" }}
                  onClick={() => setSelectedCategory("")}>
                  <i className="bi bi-grid-fill" style={{ fontSize: 12 }} /> All
                </div>
                {TEMPLATE_CATEGORIES.map(cat => (
                  <div key={cat.key}
                    className={`ec-cat-chip ${selectedCategory === cat.key ? "active" : ""}`}
                    style={{ color: cat.color, borderColor: selectedCategory === cat.key ? cat.color : "#E5E7EB", background: selectedCategory === cat.key ? cat.color + "10" : "#fff" }}
                    onClick={() => setSelectedCategory(c => c === cat.key ? "" : cat.key)}>
                    <i className={`bi ${cat.icon}`} style={{ fontSize: 12 }} /> {cat.label}
                  </div>
                ))}
              </div>

              {/* Main layout */}
              <div className="ec-layout">
                {/* Template list */}
                <div>
                  {/* Search */}
                  <div style={{ position: "relative", marginBottom: 12 }}>
                    <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 13 }} />
                    <input className="ec-input" style={{ paddingLeft: 30 }} placeholder="Search templates…"
                      value={search} onChange={e => setSearch(e.target.value)} />
                  </div>

                  {filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>
                      <i className="bi bi-envelope" style={{ fontSize: 36 }} />
                      <div style={{ marginTop: 10, fontSize: 13 }}>No templates found</div>
                    </div>
                  ) : (
                    filtered.map(t => {
                      const cat = TEMPLATE_CATEGORIES.find(c => c.key === t.category) || {};
                      return (
                        <div key={t.id}
                          className={`ec-template-card ${selectedTemplate?.id === t.id ? "selected" : ""}`}
                          onClick={() => { setSelectedTemplate(t); setEditMode(false); }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: (cat.color || "#6366F1") + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <i className={`bi ${cat.icon || "bi-envelope"}`} style={{ color: cat.color || "#6366F1", fontSize: 14 }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", marginBottom: 2 }}>{t.name}</div>
                              <div style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {t.subject}
                              </div>
                              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Last used: {t.lastUsed}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Template detail / compose */}
                {selectedTemplate && !composeMode ? (
                  <div className="ec-detail">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#1E293B", marginBottom: 4 }}>{selectedTemplate.name}</div>
                        {(() => {
                          const cat = TEMPLATE_CATEGORIES.find(c => c.key === selectedTemplate.category) || {};
                          return (
                            <span className="ec-badge" style={{ background: (cat.color || "#6366F1") + "18", color: cat.color || "#6366F1" }}>
                              <i className={`bi ${cat.icon || "bi-envelope"}`} style={{ fontSize: 10 }} /> {cat.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="ec-btn ec-btn-ghost" onClick={() => setEditMode(!editMode)}>
                          <i className="bi bi-pencil" /> Edit
                        </button>
                        <button className="ec-btn ec-btn-primary" onClick={() => toast.success("Email sent! (demo)")}>
                          <i className="bi bi-send-fill" /> Use Template
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Subject Line</label>
                      {editMode ? (
                        <input className="ec-input" defaultValue={selectedTemplate.subject} />
                      ) : (
                        <div style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#1E293B" }}>
                          {selectedTemplate.subject}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Email Body</label>
                      {editMode ? (
                        <textarea className="ec-input" defaultValue={selectedTemplate.preview} style={{ height: 200, resize: "vertical" }} />
                      ) : (
                        <div style={{ padding: "12px 14px", background: "#F8FAFC", borderRadius: 10, fontSize: 13, color: "#374151", lineHeight: 1.7, minHeight: 100 }}>
                          {selectedTemplate.preview}
                        </div>
                      )}
                    </div>

                    {/* Variables */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                        Template Variables
                      </label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["{client_name}","{brand_name}","{month}","{content_count}","{agency_name}"].map(v => (
                          <span key={v} className="ec-var">{v}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>
                        These variables will be auto-filled when sending
                      </div>
                    </div>

                    {editMode && (
                      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                        <button className="ec-btn ec-btn-ghost" style={{ flex: 1 }} onClick={() => setEditMode(false)}>Cancel</button>
                        <button className="ec-btn ec-btn-primary" style={{ flex: 1 }} onClick={() => { toast.success("Template saved!"); setEditMode(false); }}>
                          <i className="bi bi-check-circle-fill" /> Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                ) : composeMode ? (
                  <div className="ec-detail">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <h5 style={{ fontWeight: 800, color: "#1E293B", margin: 0 }}>Compose Email</h5>
                      <button className="ec-btn ec-btn-ghost" onClick={() => setComposeMode(false)}>
                        <i className="bi bi-x" /> Cancel
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 5 }}>TO</label>
                        <input className="ec-input" placeholder="recipient@email.com" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 5 }}>SUBJECT</label>
                        <input className="ec-input" placeholder="Email subject…" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 5 }}>MESSAGE</label>
                        <textarea className="ec-input" style={{ height: 200, resize: "vertical" }} placeholder="Type your message…" />
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button className="ec-btn ec-btn-ghost" style={{ flex: 1 }} onClick={() => setComposeMode(false)}>Discard</button>
                        <button className="ec-btn ec-btn-primary" style={{ flex: 1 }} onClick={() => { toast.success("Email sent! (demo)"); setComposeMode(false); }}>
                          <i className="bi bi-send-fill" /> Send Email
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "#F8FAFC", borderRadius: 16, border: "2px dashed #E5E7EB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center", color: "#94A3B8" }}>
                    <i className="bi bi-envelope-open" style={{ fontSize: 44, marginBottom: 14 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>Select a template</div>
                    <div style={{ fontSize: 13 }}>Click any template from the left to preview and use it</div>
                  </div>
                )}
              </div>

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
