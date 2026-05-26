import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const TAG_META = {
  "Special Offer": { bg: "#DCFCE7", color: "#15803D" },
  "Announcement":  { bg: "#EEF2FF", color: "#4F46E5" },
  "New Feature":   { bg: "#DBEAFE", color: "#1D4ED8" },
  "Upgrade":       { bg: "#F5F3FF", color: "#7C3AED" },
  "Event":         { bg: "#FEE2E2", color: "#DC2626" },
};
const TAGS = Object.keys(TAG_META);

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

const isoDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : "";

const BLANK = {
  title: "", description: "", tag: "Announcement", target: "all",
  brandIds: [], ctaText: "", ctaUrl: "",
  validFrom: new Date().toISOString().slice(0, 10), validUntil: "", isActive: true,
};

const inputStyle = {
  width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0",
  borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box",
  color: "#0f172a", fontFamily: "inherit",
};

export default function OffersAdmin() {
  const [offers, setOffers]         = useState([]);
  const [brands, setBrands]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterTag, setFilterTag]   = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState(BLANK);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/offers");
      const d = await r.json();
      if (d.success) setOffers(d.offers || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadOffers();
    fetch("/api/admin/brands")
      .then(r => r.json())
      .then(d => { if (d.success) setBrands(d.brands || []); });
  }, [loadOffers]);

  function openCreate() {
    setForm({ ...BLANK, validFrom: new Date().toISOString().slice(0, 10) });
    setModal("create");
  }

  function openEdit(offer) {
    setForm({
      title:       offer.title || "",
      description: offer.description || "",
      tag:         offer.tag || "Announcement",
      target:      offer.target || "all",
      brandIds:    (offer.brandIds || []).map(b => String(b._id || b)),
      ctaText:     offer.ctaText || "",
      ctaUrl:      offer.ctaUrl || "",
      validFrom:   isoDate(offer.validFrom),
      validUntil:  isoDate(offer.validUntil),
      isActive:    offer.isActive !== false,
    });
    setModal(offer);
  }

  async function save() {
    if (!form.title.trim() || !form.description.trim()) {
      showToast("Title and description are required", "error");
      return;
    }
    setSaving(true);
    try {
      const isEdit = modal && modal !== "create";
      const url    = isEdit ? `/api/admin/offers/${modal._id}` : "/api/admin/offers";
      const method = isEdit ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, validUntil: form.validUntil || undefined }),
      });
      const d = await r.json();
      if (d.success) {
        showToast(isEdit ? "Offer updated" : "Offer created");
        setModal(null);
        loadOffers();
      } else {
        showToast(d.message || "Something went wrong", "error");
      }
    } finally { setSaving(false); }
  }

  async function toggleActive(offer) {
    const r = await fetch(`/api/admin/offers/${offer._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !offer.isActive }),
    });
    const d = await r.json();
    if (d.success) {
      setOffers(prev => prev.map(o => o._id === offer._id ? { ...o, isActive: !offer.isActive } : o));
    }
  }

  async function deleteOffer() {
    if (!deleteConfirm) return;
    const r = await fetch(`/api/admin/offers/${deleteConfirm._id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) {
      showToast("Offer deleted");
      setDeleteConfirm(null);
      setOffers(prev => prev.filter(o => o._id !== deleteConfirm._id));
    }
  }

  function toggleBrandId(id) {
    setForm(p => ({
      ...p,
      brandIds: p.brandIds.includes(id) ? p.brandIds.filter(b => b !== id) : [...p.brandIds, id],
    }));
  }

  const now = new Date();

  const filtered = offers.filter(o => {
    if (filterTag && o.tag !== filterTag) return false;
    if (filterTarget && o.target !== filterTarget) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!o.title.toLowerCase().includes(s) && !o.description.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const stats = {
    total:     offers.length,
    active:    offers.filter(o => o.isActive && new Date(o.validFrom) <= now && (!o.validUntil || new Date(o.validUntil) >= now)).length,
    allBrands: offers.filter(o => o.target === "all").length,
    specific:  offers.filter(o => o.target === "specific").length,
  };

  return (
    <>
      <Head>
        <title>Offers & Announcements · Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      </Head>
      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />
          <section className="content home">
            <div style={{ padding: "28px 24px" }}>

              {/* Page header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: 21, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-.3px" }}>
                    Offers &amp; Announcements
                  </h1>
                  <p style={{ fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 0 }}>
                    Create and manage client-facing offers, news, and updates
                  </p>
                </div>
                <button onClick={openCreate} style={{ padding: "9px 18px", background: "linear-gradient(135deg,#5A57FB,#4845d4)", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
                  <i className="bi bi-plus-lg" /> New Offer
                </button>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "Total",          val: stats.total,     icon: "bi-megaphone-fill",  color: "#4F46E5", bg: "#EEF2FF" },
                  { label: "Live Now",       val: stats.active,    icon: "bi-broadcast",        color: "#15803D", bg: "#DCFCE7" },
                  { label: "All Clients",    val: stats.allBrands, icon: "bi-people-fill",      color: "#0EA5E9", bg: "#E0F2FE" },
                  { label: "Specific Brands",val: stats.specific,  icon: "bi-building-check",   color: "#7C3AED", bg: "#F5F3FF" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 13, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`bi ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 3, textTransform: "uppercase", letterSpacing: ".5px" }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                  <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }} />
                  <input
                    placeholder="Search offers…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
                <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
                  style={{ padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", background: "#fff", cursor: "pointer" }}>
                  <option value="">All tags</option>
                  {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterTarget} onChange={e => setFilterTarget(e.target.value)}
                  style={{ padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", background: "#fff", cursor: "pointer" }}>
                  <option value="">All audiences</option>
                  <option value="all">All clients</option>
                  <option value="specific">Specific brands</option>
                </select>
              </div>

              {/* Offer grid */}
              {loading ? (
                <div style={{ textAlign: "center", padding: "72px 0" }}>
                  <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: "#5A57FB", borderRadius: "50%", animation: "adm-spin .7s linear infinite", margin: "0 auto 14px" }} />
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading…</div>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "72px 24px", textAlign: "center" }}>
                  <i className="bi bi-megaphone" style={{ fontSize: 44, color: "#CBD5E1", display: "block", marginBottom: 14 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                    {search || filterTag || filterTarget ? "No offers match your filters" : "No offers yet"}
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
                    {search || filterTag || filterTarget ? "Try clearing the filters" : "Create your first offer or announcement for clients"}
                  </div>
                  {!search && !filterTag && !filterTarget && (
                    <button onClick={openCreate} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#5A57FB,#4845d4)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      Create First Offer
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                  {filtered.map(offer => {
                    const tm = TAG_META[offer.tag] || TAG_META["Announcement"];
                    const isLive     = offer.isActive && new Date(offer.validFrom) <= now && (!offer.validUntil || new Date(offer.validUntil) >= now);
                    const isExpired  = offer.validUntil && new Date(offer.validUntil) < now;
                    const isUpcoming = new Date(offer.validFrom) > now;
                    return (
                      <div key={offer._id} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <div style={{ height: 4, background: tm.color, opacity: offer.isActive ? 1 : 0.25 }} />
                        <div style={{ padding: "16px 18px", flex: 1 }}>
                          {/* Badges row */}
                          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11, flexWrap: "wrap" }}>
                            <span style={{ padding: "2px 10px", background: tm.bg, color: tm.color, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{offer.tag}</span>
                            {isLive && <span style={{ padding: "2px 8px", background: "#DCFCE7", color: "#15803D", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>● Live</span>}
                            {!isLive && isExpired && <span style={{ padding: "2px 8px", background: "#F1F5F9", color: "#94a3b8", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Expired</span>}
                            {!isExpired && isUpcoming && <span style={{ padding: "2px 8px", background: "#EEF2FF", color: "#4F46E5", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Upcoming</span>}
                            {!offer.isActive && !isExpired && !isUpcoming && <span style={{ padding: "2px 8px", background: "#F1F5F9", color: "#64748b", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Paused</span>}
                            <span style={{ marginLeft: "auto", padding: "2px 8px", background: offer.target === "all" ? "#E0F2FE" : "#F5F3FF", color: offer.target === "all" ? "#0EA5E9" : "#7C3AED", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                              {offer.target === "all" ? "All clients" : `${(offer.brandIds || []).length} brand${(offer.brandIds || []).length !== 1 ? "s" : ""}`}
                            </span>
                          </div>

                          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 6, lineHeight: 1.3 }}>{offer.title}</div>
                          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {offer.description}
                          </div>

                          {/* Specific brand chips */}
                          {offer.target === "specific" && (offer.brandIds || []).length > 0 && (
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                              {(offer.brandIds || []).slice(0, 4).map(b => (
                                <span key={b._id || b} style={{ padding: "2px 8px", background: (b.color || "#5A57FB") + "18", color: b.color || "#5A57FB", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
                                  {b.name || "Brand"}
                                </span>
                              ))}
                              {(offer.brandIds || []).length > 4 && (
                                <span style={{ fontSize: 11, color: "#94a3b8", padding: "2px 0" }}>+{offer.brandIds.length - 4} more</span>
                              )}
                            </div>
                          )}

                          {offer.ctaText && (
                            <div style={{ fontSize: 12, color: "#4F46E5", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                              <i className="bi bi-cursor-fill" style={{ fontSize: 11 }} />{offer.ctaText}
                            </div>
                          )}

                          <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                            <i className="bi bi-calendar3" />
                            From {fmtDate(offer.validFrom)}{offer.validUntil ? ` · Until ${fmtDate(offer.validUntil)}` : " · No expiry"}
                          </div>
                        </div>

                        {/* Action footer */}
                        <div style={{ padding: "11px 18px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8 }}>
                          <button onClick={() => toggleActive(offer)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: `1.5px solid ${offer.isActive ? "#BBF7D0" : "#E2E8F0"}`, background: offer.isActive ? "#DCFCE7" : "#F8FAFC", color: offer.isActive ? "#15803D" : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            <i className={`bi ${offer.isActive ? "bi-pause-circle" : "bi-play-circle"}`} style={{ marginRight: 5 }} />
                            {offer.isActive ? "Pause" : "Activate"}
                          </button>
                          <button onClick={() => openEdit(offer)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #E2E8F0", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            <i className="bi bi-pencil" style={{ marginRight: 5 }} />Edit
                          </button>
                          <button onClick={() => setDeleteConfirm(offer)}
                            style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 7, border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            <i className="bi bi-trash3" style={{ marginRight: 5 }} />Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.52)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 72px rgba(0,0,0,.2)" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{modal === "create" ? "Create Offer" : "Edit Offer"}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Fill in the details below to publish to clients</div>
              </div>
              <button onClick={() => setModal(null)} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Title */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Title <span style={{ color: "#DC2626" }}>*</span></label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Get 2 Extra Posts This Month"
                  style={inputStyle} />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Description <span style={{ color: "#DC2626" }}>*</span></label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the offer or announcement…" rows={3}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} />
              </div>

              {/* Tag + Target */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Tag / Type</label>
                  <select value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))}
                    style={{ ...inputStyle, background: "#fff", cursor: "pointer" }}>
                    {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Audience</label>
                  <select value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value, brandIds: [] }))}
                    style={{ ...inputStyle, background: "#fff", cursor: "pointer" }}>
                    <option value="all">All clients</option>
                    <option value="specific">Specific brands only</option>
                  </select>
                </div>
              </div>

              {/* Brand multi-select (specific only) */}
              {form.target === "specific" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 7 }}>
                    Select Brands
                    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 6 }}>{form.brandIds.length} selected</span>
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px", border: "1.5px solid #E2E8F0", borderRadius: 8, maxHeight: 180, overflowY: "auto" }}>
                    {brands.map(b => {
                      const sel = form.brandIds.includes(String(b._id));
                      return (
                        <button key={b._id} type="button" onClick={() => toggleBrandId(String(b._id))}
                          style={{ padding: "5px 13px", borderRadius: 20, border: `1.5px solid ${sel ? (b.color || "#5A57FB") : "#E2E8F0"}`, background: sel ? (b.color || "#5A57FB") + "18" : "#F8FAFC", color: sel ? (b.color || "#5A57FB") : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                          {b.name}
                          {sel && <i className="bi bi-check-circle-fill" style={{ fontSize: 10 }} />}
                        </button>
                      );
                    })}
                    {brands.length === 0 && <span style={{ fontSize: 12, color: "#94a3b8" }}>No brands found</span>}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                    Button Text <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input value={form.ctaText} onChange={e => setForm(p => ({ ...p, ctaText: e.target.value }))}
                    placeholder="e.g. Claim Now" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                    Button URL <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input value={form.ctaUrl} onChange={e => setForm(p => ({ ...p, ctaUrl: e.target.value }))}
                    placeholder="https://…" style={inputStyle} />
                </div>
              </div>

              {/* Validity dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Valid From</label>
                  <input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                    Valid Until <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(empty = no expiry)</span>
                  </label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#F8FAFC", borderRadius: 10, border: "1.5px solid #F1F5F9" }}>
                <button type="button" onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                  style={{ width: 42, height: 24, borderRadius: 12, border: "none", background: form.isActive ? "#5A57FB" : "#CBD5E1", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: form.isActive ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)", display: "block" }} />
                </button>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: form.isActive ? "#0f172a" : "#64748b" }}>
                    {form.isActive ? "Active — visible to clients" : "Paused — hidden from clients"}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>Toggle to control visibility without deleting</div>
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)}
                style={{ padding: "9px 20px", background: "none", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                style={{ padding: "9px 22px", background: "linear-gradient(135deg,#5A57FB,#4845d4)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : modal === "create" ? "Create Offer" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.52)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px 24px", width: "100%", maxWidth: 380, boxShadow: "0 16px 52px rgba(0,0,0,.2)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <i className="bi bi-trash3" style={{ fontSize: 22, color: "#DC2626" }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Delete this offer?</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 22, lineHeight: 1.6 }}>
              <strong>"{deleteConfirm.title}"</strong> will be permanently removed. Clients will no longer see it.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding: "8px 18px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={deleteOffer}
                style={{ padding: "8px 20px", border: "none", borderRadius: 8, background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? "#DC2626" : "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 2000, boxShadow: "0 8px 28px rgba(0,0,0,.18)", display: "flex", alignItems: "center", gap: 8, maxWidth: 320 }}>
          <i className={`bi ${toast.type === "error" ? "bi-x-circle" : "bi-check-circle"}`} />
          {toast.text}
        </div>
      )}

      <style>{`@keyframes adm-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
