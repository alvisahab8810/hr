import React, { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

/* ─── Constants ──────────────────────────────────────────────────────────── */

const SERVICES = [
  { key: "socialMedia", label: "Social Media", icon: "bi-instagram",    color: "#E1306C" },
  { key: "website",     label: "Website",       icon: "bi-globe2",       color: "#3B82F6" },
  { key: "seo",         label: "SEO",           icon: "bi-search",       color: "#10B981" },
  { key: "ads",         label: "Ads",           icon: "bi-megaphone",    color: "#F59E0B" },
  { key: "branding",    label: "Branding",      icon: "bi-palette",      color: "#8B5CF6" },
];

const DAYS   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const CTYPES = ["reel","post","carousel","story"];
const CTYPE_META = {
  reel:     { label: "Reel",     color: "#E1306C" },
  post:     { label: "Post",     color: "#3B82F6" },
  carousel: { label: "Carousel", color: "#F59E0B" },
  story:    { label: "Story",    color: "#10B981" },
};
const AD_PLATFORMS = ["Google","Meta","YouTube","LinkedIn","Twitter","TikTok"];

const PRESET_COLORS = [
  "#6366F1","#3B82F6","#10B981","#F59E0B","#EF4444",
  "#8B5CF6","#EC4899","#14B8A6","#F97316","#64748B",
];

function getInitials(name) {
  return (name || "?").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();
}
function svcMeta(key) { return SERVICES.find(s => s.key === key) || {}; }

function freshForm() {
  return {
    name: "", logo: "", color: "#6366F1", contactEmail: "", notes: "",
    services: [],
    monthlyDeliverables: { reels: 0, posts: 0, carousels: 0, stories: 0 },
    weeklySchedule: [],
    websiteSettings:  { url: "", cms: "", hosting: "", notes: "" },
    seoSettings:      { blogCount: 0, blogSchedule: [], technical: { enabled: false, notes: "" }, onPage: { enabled: false, notes: "" }, offPage: { enabled: false, notes: "" }, backlinks: { target: 0, notes: "" }, keywords: { count: 0, notes: "" }, notes: "", competitors: [] },
    adsSettings:      { platforms: [], notes: "" },
    brandingSettings: { logoDesign: false, brandIdentityDesign: false, productPackaging: false },
    gsc:              { siteUrl: "" },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function BrandsPage() {
  const router = useRouter();

  const [brands,    setBrands]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [form,      setForm]      = useState(freshForm());
  const [saving,    setSaving]    = useState(false);

  /* GSC connection state */
  const [gscSites,         setGscSites]         = useState([]);
  const [gscSitesLoading,  setGscSitesLoading]  = useState(false);
  const [gscSelectedSite,  setGscSelectedSite]  = useState("");
  const [gscSaving,        setGscSaving]        = useState(false);
  const [gscDisconnecting, setGscDisconnecting] = useState(false);

  /* ─── Fetch ──────────────────────────────────────────────────────────── */

  const loadBrands = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q ? `/api/admin/brands?search=${encodeURIComponent(q)}` : "/api/admin/brands";
      const r   = await fetch(url, { credentials: "include" });
      const d   = await r.json();
      if (d.success) {
        setBrands(d.brands);
        setSelected(prev =>
          prev ? (d.brands.find(b => b._id === prev._id) || d.brands[0] || null) : (d.brands[0] || null)
        );
      }
    } catch { toast.error("Failed to load brands"); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { loadBrands(); }, []);

  /* Handle OAuth callback query params */
  useEffect(() => {
    const { selectBrand: selectBrandId, gsc, email, msg } = router.query;
    if (gsc === "connected") toast.success(`Google Search Console connected${email ? ` as ${decodeURIComponent(email)}` : ""}!`);
    if (gsc === "error")     toast.error(`GSC error: ${msg ? decodeURIComponent(msg) : "Unknown"}`);
    if (selectBrandId && brands.length > 0) {
      const found = brands.find(b => b._id === selectBrandId);
      if (found) { setSelected(found); setActiveTab("seo"); }
    }
  }, [router.query, brands]); // eslint-disable-line

  /* Reset GSC sites when selected brand changes */
  useEffect(() => {
    setGscSites([]);
    setGscSelectedSite(selected?.gsc?.siteUrl || "");
  }, [selected?._id]);

  /* ─── Search debounce ────────────────────────────────────────────────── */

  const debRef = useRef(null);
  function handleSearch(v) {
    setSearch(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => loadBrands(v), 400);
  }

  /* ─── GSC helpers ───────────────────────────────────────────────────── */

  const loadGscSites = useCallback(async () => {
    if (!selected?._id) return;
    setGscSitesLoading(true);
    try {
      const res  = await fetch(`/api/admin/brands/${selected._id}/gsc/sites`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setGscSites(data.sites || []);
      else toast.error(data.message || "Could not load GSC sites");
    } catch { toast.error("Network error"); }
    finally { setGscSitesLoading(false); }
  }, [selected?._id]);

  const saveGscSite = async () => {
    if (!gscSelectedSite || !selected?._id) return;
    setGscSaving(true);
    try {
      const res  = await fetch(`/api/admin/brands/${selected._id}/gsc/save`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteUrl: gscSelectedSite }) });
      const data = await res.json();
      if (data.success) {
        toast.success("GSC property saved!");
        const upd = b => ({ ...b, gsc: { ...(b.gsc || {}), siteUrl: gscSelectedSite } });
        setBrands(bs => bs.map(b => b._id === selected._id ? upd(b) : b));
        setSelected(s => upd(s));
      } else toast.error(data.message || "Failed to save");
    } catch { toast.error("Network error"); }
    finally { setGscSaving(false); }
  };

  const disconnectGsc = async () => {
    if (!confirm("Disconnect Google Search Console from this brand?") || !selected?._id) return;
    setGscDisconnecting(true);
    try {
      const res  = await fetch(`/api/admin/brands/${selected._id}/gsc/disconnect`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        toast.success("GSC disconnected");
        const cleared = { siteUrl: "", email: "", connectedAt: null };
        setBrands(bs => bs.map(b => b._id === selected._id ? { ...b, gsc: cleared } : b));
        setSelected(s => ({ ...s, gsc: cleared }));
        setGscSites([]);
        setGscSelectedSite("");
      } else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setGscDisconnecting(false); }
  };

  /* ─── Select brand ───────────────────────────────────────────────────── */

  function selectBrand(b) {
    setSelected(b);
    setActiveTab(b.services?.[0] || null);
  }

  useEffect(() => {
    if (selected) {
      setActiveTab(prev =>
        (selected.services || []).includes(prev) ? prev : (selected.services?.[0] || null)
      );
    }
  }, [selected?._id]);

  /* ─── Form helpers ───────────────────────────────────────────────────── */

  function toggleService(key) {
    setForm(f => ({
      ...f,
      services: f.services.includes(key)
        ? f.services.filter(s => s !== key)
        : [...f.services, key],
    }));
  }

  function toggleWeeklySlot(day, ctype) {
    setForm(f => {
      const exists = f.weeklySchedule.find(s => s.day === day && s.contentType === ctype);
      return {
        ...f,
        weeklySchedule: exists
          ? f.weeklySchedule.filter(s => !(s.day === day && s.contentType === ctype))
          : [...f.weeklySchedule, { day, contentType: ctype }],
      };
    });
  }

  function toggleAdPlatform(p) {
    setForm(f => ({
      ...f,
      adsSettings: {
        ...f.adsSettings,
        platforms: f.adsSettings.platforms.includes(p)
          ? f.adsSettings.platforms.filter(x => x !== p)
          : [...f.adsSettings.platforms, p],
      },
    }));
  }

  /* ─── Modal ──────────────────────────────────────────────────────────── */

  function openCreate() { setForm(freshForm()); setEditMode(false); setShowModal(true); }

  function openEdit(b) {
    setForm({
      name: b.name || "", logo: b.logo || "", color: b.color || "#6366F1",
      contactEmail: b.contactEmail || "", notes: b.notes || "",
      services: b.services || [],
      monthlyDeliverables: b.monthlyDeliverables || { reels: 0, posts: 0, carousels: 0, stories: 0 },
      weeklySchedule: b.weeklySchedule || [],
      websiteSettings:  b.websiteSettings  || { url: "", cms: "", hosting: "", notes: "" },
      seoSettings: {
        blogCount:    b.seoSettings?.blogCount    || 0,
        blogSchedule: b.seoSettings?.blogSchedule || [],
        technical: { enabled: b.seoSettings?.technical?.enabled || false, notes: b.seoSettings?.technical?.notes || "" },
        onPage:    { enabled: b.seoSettings?.onPage?.enabled    || false, notes: b.seoSettings?.onPage?.notes    || "" },
        offPage:   { enabled: b.seoSettings?.offPage?.enabled   || false, notes: b.seoSettings?.offPage?.notes   || "" },
        backlinks: { target: b.seoSettings?.backlinks?.target   || 0,     notes: b.seoSettings?.backlinks?.notes || "" },
        keywords:  { count:  b.seoSettings?.keywords?.count     || 0,     notes: b.seoSettings?.keywords?.notes  || "" },
        notes: b.seoSettings?.notes || "",
        competitors: (b.seoSettings?.competitors || []).map(c => ({ name: c.name || "", website: c.website || "", type: c.type || "" })),
      },
      adsSettings:      b.adsSettings      || { platforms: [], notes: "" },
      brandingSettings: b.brandingSettings || { logoDesign: false, brandIdentityDesign: false, productPackaging: false },
      gsc:              { siteUrl: b.gsc?.siteUrl || "" },
    });
    setEditMode(true);
    setShowModal(true);
  }

  /* ─── Save ───────────────────────────────────────────────────────────── */

  async function handleSave() {
    if (!form.name.trim()) return toast.error("Brand name is required");
    setSaving(true);
    try {
      const url    = editMode ? `/api/admin/brands/${selected._id}` : "/api/admin/brands";
      const method = editMode ? "PATCH" : "POST";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || "Failed");
      toast.success(editMode ? "Brand updated" : "Brand created");
      setShowModal(false);
      await loadBrands(search);
    } catch (e) { toast.error(e.message); }
    finally     { setSaving(false); }
  }

  /* ─── Delete ─────────────────────────────────────────────────────────── */

  async function handleDelete(b) {
    if (!confirm(`Delete brand "${b.name}"?`)) return;
    try {
      const r = await fetch(`/api/admin/brands/${b._id}`, { method: "DELETE", credentials: "include" });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success("Brand deleted");
      const next = brands.filter(x => x._id !== b._id);
      setBrands(next);
      setSelected(next[0] || null);
    } catch (e) { toast.error(e.message); }
  }

  const filteredBrands = brands.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Brands | Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
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
                <li className="breadcrumb-item active">Brands</li>
              </ul>
            </div>

            <div className="block-header add-emp-area" style={{ padding: 0 }}>
              {/* ── Split panel ── */}
              <div style={{ display: "flex", height: "calc(100vh - 150px)", overflow: "hidden" }}>

                {/* Left sidebar */}
                <div style={{
                  width: 270, minWidth: 240, borderRight: "1.5px solid #E5E7EB",
                  background: "#fff", display: "flex", flexDirection: "column", height: "100%",
                }}>
                  <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "#1E293B" }}>Brands</span>
                      <button onClick={openCreate} style={{
                        background: "#6366F1", color: "#fff", border: "none", borderRadius: 8,
                        padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <i className="bi bi-plus-lg" /> New
                      </button>
                    </div>
                    <div style={{ position: "relative" }}>
                      <i className="bi bi-search" style={{
                        position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
                        color: "#94A3B8", fontSize: 13,
                      }} />
                      <input
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search brands…"
                        style={{
                          width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8,
                          padding: "7px 10px 7px 30px", fontSize: 13, outline: "none", background: "#F8FAFC",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {loading && <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Loading…</div>}
                    {!loading && filteredBrands.length === 0 && (
                      <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No brands found</div>
                    )}
                    {filteredBrands.map(b => {
                      const isAct = selected?._id === b._id;
                      return (
                        <div key={b._id} onClick={() => selectBrand(b)} style={{
                          padding: "10px 14px", cursor: "pointer",
                          background: isAct ? "#EEF2FF" : "transparent",
                          borderLeft: isAct ? "3px solid #6366F1" : "3px solid transparent",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {b.logo ? (
                              <img src={b.logo} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover" }} />
                            ) : (
                              <div style={{
                                width: 30, height: 30, borderRadius: 8, background: b.color || "#6366F1",
                                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 800, fontSize: 12, flexShrink: 0,
                              }}>
                                {getInitials(b.name)}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 700, fontSize: 13, color: "#1E293B",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>{b.name}</div>
                              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
                                {(b.services || []).slice(0, 3).map(sk => {
                                  const m = svcMeta(sk);
                                  return (
                                    <span key={sk} style={{
                                      fontSize: 9, fontWeight: 600, color: m.color,
                                      background: (m.color || "#999") + "18", borderRadius: 4, padding: "1px 5px",
                                    }}>{m.label}</span>
                                  );
                                })}
                                {(b.services || []).length > 3 && (
                                  <span style={{ fontSize: 9, color: "#94A3B8" }}>+{b.services.length - 3}</span>
                                )}
                                {(b.services || []).length === 0 && (
                                  <span style={{ fontSize: 9, color: "#CBD5E1" }}>No services</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right detail panel */}
                <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "#F8FAFC" }}>
                  {!selected ? (
                    <div style={{ textAlign: "center", paddingTop: 80, color: "#94A3B8" }}>
                      <i className="bi bi-building" style={{ fontSize: 48 }} />
                      <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>Select a brand</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>or create a new one</div>
                    </div>
                  ) : (
                    <BrandDetail
                      brand={selected}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      onEdit={() => openEdit(selected)}
                      onDelete={() => handleDelete(selected)}
                      gscSites={gscSites}
                      gscSitesLoading={gscSitesLoading}
                      gscSelectedSite={gscSelectedSite}
                      setGscSelectedSite={setGscSelectedSite}
                      gscSaving={gscSaving}
                      gscDisconnecting={gscDisconnecting}
                      onLoadGscSites={loadGscSites}
                      onSaveGscSite={saveGscSite}
                      onDisconnectGsc={disconnectGsc}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showModal && (
        <BrandModal
          form={form}
          setForm={setForm}
          editMode={editMode}
          saving={saving}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          toggleService={toggleService}
          toggleWeeklySlot={toggleWeeklySlot}
          toggleAdPlatform={toggleAdPlatform}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Brand Detail
═══════════════════════════════════════════════════════════════════════════ */

function BrandDetail({ brand, activeTab, setActiveTab, onEdit, onDelete, gscSites, gscSitesLoading, gscSelectedSite, setGscSelectedSite, gscSaving, gscDisconnecting, onLoadGscSites, onSaveGscSite, onDisconnectGsc }) {
  const activeSvc = SERVICES.filter(s => (brand.services || []).includes(s.key));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {brand.logo ? (
            <img src={brand.logo} alt="" style={{ width: 50, height: 50, borderRadius: 12, objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 50, height: 50, borderRadius: 12, background: brand.color || "#6366F1",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 18, flexShrink: 0,
            }}>
              {getInitials(brand.name)}
            </div>
          )}
          <div>
            <h4 style={{ margin: 0, fontWeight: 800, color: "#1E293B", fontSize: 20 }}>{brand.name}</h4>
            {brand.contactEmail && (
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                <i className="bi bi-envelope me-1" />{brand.contactEmail}
              </div>
            )}
            <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
              {activeSvc.map(s => (
                <span key={s.key} style={{
                  fontSize: 11, fontWeight: 700, color: s.color, background: s.color + "18",
                  borderRadius: 6, padding: "2px 9px",
                }}>
                  <i className={`bi ${s.icon} me-1`} />{s.label}
                </span>
              ))}
              {activeSvc.length === 0 && <span style={{ fontSize: 12, color: "#94A3B8" }}>No services</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={{
            background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #C7D2FE",
            borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            <i className="bi bi-pencil me-1" />Edit
          </button>
          <button onClick={onDelete} style={{
            background: "#FFF1F2", color: "#E11D48", border: "1.5px solid #FECDD3",
            borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            <i className="bi bi-trash me-1" />Delete
          </button>
        </div>
      </div>

      {/* No services state */}
      {activeSvc.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #E5E7EB", padding: "40px 32px", textAlign: "center", color: "#94A3B8" }}>
          <i className="bi bi-grid" style={{ fontSize: 36 }} />
          <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>No services configured</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Edit the brand to add services</div>
        </div>
      )}

      {/* Service tabs */}
      {activeSvc.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #E5E7EB", marginBottom: 22 }}>
            {activeSvc.map(s => {
              const isAct = activeTab === s.key;
              return (
                <button key={s.key} onClick={() => setActiveTab(s.key)} style={{
                  background: isAct ? s.color + "15" : "transparent",
                  color: isAct ? s.color : "#64748B",
                  border: "none", borderBottom: isAct ? `2.5px solid ${s.color}` : "2.5px solid transparent",
                  padding: "8px 16px", fontSize: 13, fontWeight: isAct ? 700 : 500,
                  cursor: "pointer", borderRadius: "8px 8px 0 0", marginBottom: -2,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <i className={`bi ${s.icon}`} />{s.label}
                </button>
              );
            })}
          </div>
          {activeTab === "socialMedia" && <SocialMediaView brand={brand} />}
          {activeTab === "website"     && <WebsiteView brand={brand} />}
          {activeTab === "seo"         && <SeoView brand={brand}
            gscSites={gscSites} gscSitesLoading={gscSitesLoading}
            gscSelectedSite={gscSelectedSite} setGscSelectedSite={setGscSelectedSite}
            gscSaving={gscSaving} gscDisconnecting={gscDisconnecting}
            onLoadGscSites={onLoadGscSites} onSaveGscSite={onSaveGscSite} onDisconnectGsc={onDisconnectGsc} />}
          {activeTab === "ads"         && <AdsView brand={brand} />}
          {activeTab === "branding"    && <BrandingView brand={brand} />}
        </>
      )}

      {brand.notes && (
        <div style={{ background: "#FFFBEB", borderRadius: 12, border: "1.5px solid #FDE68A", padding: "14px 18px", marginTop: 20 }}>
          <div style={{ fontWeight: 700, color: "#B45309", fontSize: 13, marginBottom: 4 }}>
            <i className="bi bi-sticky me-1" />Notes
          </div>
          <div style={{ fontSize: 13, color: "#78350F", lineHeight: 1.6 }}>{brand.notes}</div>
        </div>
      )}
    </div>
  );
}

/* ── Service views ─────────────────────────────────────────────────────── */

function InfoCard({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #E5E7EB", padding: "16px 20px", marginBottom: 16 }}>
      <div style={{ fontWeight: 700, color: "#374151", fontSize: 14, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ fontSize: 13, color: "#64748B" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{value || <span style={{ color: "#CBD5E1" }}>—</span>}</span>
    </div>
  );
}

function SocialMediaView({ brand }) {
  const md = brand.monthlyDeliverables || {};
  const ws = brand.weeklySchedule || [];
  const slotMap = {};
  ws.forEach(s => { slotMap[`${s.day}_${s.contentType}`] = true; });

  return (
    <>
      <InfoCard title="Monthly Deliverables">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[["Reels","reels","#E1306C"],["Posts","posts","#3B82F6"],["Carousels","carousels","#F59E0B"],["Stories","stories","#10B981"]].map(([lbl,k,c]) => (
            <div key={k} style={{ background: c + "10", borderRadius: 10, padding: "12px 8px", textAlign: "center", border: `1.5px solid ${c}30` }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: c }}>{md[k] || 0}</div>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </InfoCard>

      <InfoCard title="Weekly Posting Schedule">
        {ws.length === 0 ? (
          <div style={{ color: "#CBD5E1", fontSize: 13, textAlign: "center", padding: "10px 0" }}>No schedule set</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: "5px 10px", textAlign: "left", color: "#64748B", fontWeight: 600, width: 80 }}>Content</th>
                  {DAYS.map(d => <th key={d} style={{ padding: "5px 8px", textAlign: "center", color: "#64748B", fontWeight: 600 }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {CTYPES.map(ct => {
                  const m = CTYPE_META[ct];
                  return (
                    <tr key={ct}>
                      <td style={{ padding: "5px 10px", fontWeight: 700, color: m.color }}>
                        <span style={{ background: m.color + "15", borderRadius: 5, padding: "2px 7px" }}>{m.label}</span>
                      </td>
                      {DAYS.map(d => {
                        const filled = slotMap[`${d}_${ct}`];
                        return (
                          <td key={d} style={{ padding: "5px 8px", textAlign: "center" }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: 6, margin: "0 auto",
                              background: filled ? m.color : "#F1F5F9",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {filled && <i className="bi bi-check2" style={{ color: "#fff", fontSize: 11 }} />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </InfoCard>
    </>
  );
}

function WebsiteView({ brand }) {
  const ws = brand.websiteSettings || {};
  return (
    <InfoCard title="Website Settings">
      <Row label="URL"     value={ws.url ? <a href={ws.url} target="_blank" rel="noreferrer" style={{ color: "#6366F1" }}>{ws.url}</a> : null} />
      <Row label="CMS"     value={ws.cms} />
      <Row label="Hosting" value={ws.hosting} />
      {ws.notes && <div style={{ marginTop: 10, fontSize: 13, color: "#64748B", lineHeight: 1.6, borderTop: "1px solid #F1F5F9", paddingTop: 10 }}>{ws.notes}</div>}
    </InfoCard>
  );
}

function SeoView({ brand, gscSites, gscSitesLoading, gscSelectedSite, setGscSelectedSite, gscSaving, gscDisconnecting, onLoadGscSites, onSaveGscSite, onDisconnectGsc }) {
  const ss = brand.seoSettings || {};
  const blogSchedule = ss.blogSchedule || [];
  const competitors  = ss.competitors  || [];
  const hasAny = ss.blogCount > 0 || blogSchedule.length > 0 || competitors.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── GSC Connection Card ── */}
      <div style={{ background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-graph-up-arrow" style={{ color: "#16A34A", fontSize: 14 }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#1E293B" }}>Google Search Console</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>Connect to show live SEO data in the client portal</div>
          </div>
        </div>
        <div style={{ padding: "16px 18px" }}>
          {brand.gsc?.email ? (
            <>
              {/* Connected */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "#F0FDF4", borderRadius: 9, border: "1.5px solid #BBF7D0" }}>
                <i className="bi bi-check-circle-fill" style={{ color: "#16A34A" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#15803D" }}>Connected</div>
                  <div style={{ fontSize: 11, color: "#166534" }}>{brand.gsc.email}</div>
                </div>
                <button onClick={onDisconnectGsc} disabled={gscDisconnecting}
                  style={{ background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {gscDisconnecting ? "…" : "Disconnect"}
                </button>
              </div>
              {/* Site picker */}
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>GSC Property</div>
              {brand.gsc?.siteUrl && (
                <div style={{ fontSize: 11, color: "#15803D", fontWeight: 600, marginBottom: 8 }}>
                  <i className="bi bi-check2-circle me-1" />Active: {brand.gsc.siteUrl}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <select value={gscSelectedSite} onChange={e => setGscSelectedSite(e.target.value)}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 12, outline: "none", background: "#F8FAFC" }}>
                  <option value="">— Select property —</option>
                  {gscSites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={onLoadGscSites} disabled={gscSitesLoading}
                  style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <i className={`bi ${gscSitesLoading ? "bi-arrow-repeat" : "bi-arrow-clockwise"}`} />
                </button>
                <button onClick={onSaveGscSite} disabled={gscSaving || !gscSelectedSite}
                  style={{ background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: !gscSelectedSite ? 0.5 : 1 }}>
                  {gscSaving ? "…" : "Save"}
                </button>
              </div>
              {gscSites.length === 0 && !gscSitesLoading && (
                <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 5 }}>
                  Click <i className="bi bi-arrow-clockwise" /> to list available properties, or type the URL below.
                </div>
              )}
              {/* Manual input */}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input value={gscSelectedSite} onChange={e => setGscSelectedSite(e.target.value)}
                  placeholder="https://yourdomain.com/ or sc-domain:yourdomain.com"
                  style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 11, outline: "none", background: "#F8FAFC", color: "#64748B" }} />
              </div>
            </>
          ) : (
            /* Not connected */
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <p style={{ fontSize: 12, color: "#64748B", marginBottom: 14, lineHeight: 1.6 }}>
                Connect a Google account that has access to this brand's Search Console property.
              </p>
              <a href={`/api/admin/brands/${brand._id}/gsc/connect`}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "9px 18px", fontWeight: 700, fontSize: 13, color: "#1E293B", textDecoration: "none", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
                <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Connect Google Account
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Blogs card ── */}
      {!hasAny && (
        <div style={{ background: "#F8FAFC", border: "1.5px dashed #E5E7EB", borderRadius: 12, padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
          <i className="bi bi-search" style={{ fontSize: 20, display: "block", marginBottom: 6 }} />
          No SEO deliverables configured yet — edit the brand to add details.
        </div>
      )}
      {hasAny && <div style={{ background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-file-text" style={{ color: "#6366F1", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B" }}>Blogs</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              {ss.blogCount > 0 ? <span style={{ color: "#6366F1", fontWeight: 700 }}>{ss.blogCount} blog{ss.blogCount !== 1 ? "s" : ""} / month</span> : <span style={{ color: "#CBD5E1" }}>No monthly target set</span>}
            </div>
          </div>
        </div>

        {/* Weekly schedule */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Weekly Publishing Schedule</div>
          <div style={{ display: "flex", gap: 6 }}>
            {DAYS.map(day => {
              const active = blogSchedule.includes(day);
              return (
                <div key={day} style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: active ? "#6366F1" : "#F8FAFC",
                  border: `2px solid ${active ? "#6366F1" : "#E5E7EB"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                  color: active ? "#fff" : "#CBD5E1",
                }}>
                  {day}
                </div>
              );
            })}
          </div>
          {blogSchedule.length === 0 && (
            <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 6 }}>No schedule set</div>
          )}
          {blogSchedule.length > 0 && (
            <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 600, marginTop: 6 }}>
              {blogSchedule.length} publishing day{blogSchedule.length !== 1 ? "s" : ""} — {DAYS.filter(d => blogSchedule.includes(d)).join(", ")}
            </div>
          )}
        </div>
      </div>}

      {/* ── Competitors card ── */}
      <div style={{ background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: competitors.length > 0 ? 14 : 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-trophy" style={{ color: "#F59E0B", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B" }}>Competitors</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              {competitors.length > 0 ? `${competitors.length} competitor${competitors.length !== 1 ? "s" : ""} tracked` : <span style={{ color: "#CBD5E1" }}>None added yet</span>}
            </div>
          </div>
        </div>

        {competitors.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {competitors.map((c, i) => {
              const typeColors = { direct: ["#FEF2F2","#DC2626"], indirect: ["#FFFBEB","#B45309"], aspirational: ["#F5F3FF","#7C3AED"], local: ["#ECFDF5","#059669"] };
              const [tbg, tfg] = typeColors[c.type] || ["#F8FAFC","#64748B"];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #F1F5F9", background: "#FAFAFA" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#6366F1", flexShrink: 0 }}>
                    {(c.name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name || "—"}</div>
                    {c.website && (
                      <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "#6366F1", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {c.website}
                      </a>
                    )}
                  </div>
                  {c.type && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: tbg, color: tfg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                      {c.type}
                    </span>
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

function AdsView({ brand }) {
  const as = brand.adsSettings || {};
  return (
    <InfoCard title="Ads Settings">
      <div style={{ padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
        <span style={{ fontSize: 13, color: "#64748B" }}>Platforms</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
          {(as.platforms || []).length === 0
            ? <span style={{ fontSize: 13, color: "#CBD5E1" }}>—</span>
            : (as.platforms || []).map(p => (
                <span key={p} style={{ fontSize: 12, fontWeight: 600, background: "#EEF2FF", color: "#6366F1", borderRadius: 6, padding: "2px 9px" }}>{p}</span>
              ))
          }
        </div>
      </div>
      {as.notes && <div style={{ marginTop: 10, fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>{as.notes}</div>}
    </InfoCard>
  );
}

const BRANDING_ITEMS = [
  { key: "logoDesign",          label: "Logo Design",           icon: "bi-brush",        color: "#8B5CF6" },
  { key: "brandIdentityDesign", label: "Brand Identity Design", icon: "bi-layers",       color: "#6366F1" },
  { key: "productPackaging",    label: "Product Packaging",     icon: "bi-box-seam",     color: "#EC4899" },
];

function BrandingView({ brand }) {
  const bs = brand.brandingSettings || {};
  const active = BRANDING_ITEMS.filter(it => bs[it.key]);
  const inactive = BRANDING_ITEMS.filter(it => !bs[it.key]);
  return (
    <InfoCard title="Branding Services">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {BRANDING_ITEMS.map(it => {
          const on = bs[it.key];
          return (
            <div key={it.key} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
              borderRadius: 10, border: `1.5px solid ${on ? it.color + "40" : "#F1F5F9"}`,
              background: on ? it.color + "0D" : "#FAFAFA",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: on ? it.color + "20" : "#F1F5F9",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className={`bi ${it.icon}`} style={{ color: on ? it.color : "#CBD5E1", fontSize: 14 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: on ? 700 : 500, color: on ? "#1E293B" : "#94A3B8", flex: 1 }}>{it.label}</span>
              {on
                ? <span style={{ fontSize: 10, fontWeight: 700, color: it.color, background: it.color + "15", borderRadius: 20, padding: "2px 8px" }}>Included</span>
                : <span style={{ fontSize: 10, fontWeight: 600, color: "#CBD5E1", background: "#F1F5F9", borderRadius: 20, padding: "2px 8px" }}>Not included</span>
              }
            </div>
          );
        })}
      </div>
    </InfoCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Brand Modal
═══════════════════════════════════════════════════════════════════════════ */

function BrandModal({ form, setForm, editMode, saving, onSave, onClose, toggleService, toggleWeeklySlot, toggleAdPlatform }) {

  function setField(path, val) {
    setForm(f => {
      const parts = path.split(".");
      if (parts.length === 1) return { ...f, [path]: val };
      if (parts.length === 2) return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: val } };
      if (parts.length === 3) return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: { ...(f[parts[0]]?.[parts[1]] || {}), [parts[2]]: val } } };
      return f;
    });
  }

  function toggleBlogDay(day) {
    setForm(f => ({
      ...f,
      seoSettings: {
        ...f.seoSettings,
        blogSchedule: (f.seoSettings.blogSchedule || []).includes(day)
          ? (f.seoSettings.blogSchedule || []).filter(d => d !== day)
          : [...(f.seoSettings.blogSchedule || []), day],
      },
    }));
  }

  function addCompetitor() {
    setForm(f => ({ ...f, seoSettings: { ...f.seoSettings, competitors: [...(f.seoSettings.competitors || []), { name: "", website: "", type: "" }] } }));
  }
  function updateCompetitor(i, field, val) {
    setForm(f => {
      const competitors = [...(f.seoSettings.competitors || [])];
      competitors[i] = { ...competitors[i], [field]: val };
      return { ...f, seoSettings: { ...f.seoSettings, competitors } };
    });
  }
  function removeCompetitor(i) {
    setForm(f => ({ ...f, seoSettings: { ...f.seoSettings, competitors: (f.seoSettings.competitors || []).filter((_, idx) => idx !== i) } }));
  }

  const slotMap = {};
  (form.weeklySchedule || []).forEach(s => { slotMap[`${s.day}_${s.contentType}`] = true; });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 680,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1.5px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#1E293B" }}>
            {editMode ? "Edit Brand" : "Add New Brand"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 19, cursor: "pointer", color: "#94A3B8" }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "18px 22px" }}>

          {/* Basic Info */}
          <MSect title="Basic Info">
            <div className="row g-3">
              <div className="col-8">
                <MLabel>Brand Name *</MLabel>
                <input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="e.g. Coca-Cola" style={iSt} />
              </div>
              <div className="col-4">
                <MLabel>Brand Color</MLabel>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                  {PRESET_COLORS.map(c => (
                    <div key={c} onClick={() => setField("color", c)} style={{
                      width: 20, height: 20, borderRadius: 5, background: c, cursor: "pointer",
                      outline: form.color === c ? "2.5px solid #1E293B" : "2px solid transparent",
                      outlineOffset: 2,
                    }} />
                  ))}
                </div>
              </div>
              <div className="col-6">
                <MLabel>Contact Email</MLabel>
                <input value={form.contactEmail} onChange={e => setField("contactEmail", e.target.value)} placeholder="brand@client.com" type="email" style={iSt} />
              </div>
              <div className="col-6">
                <MLabel>Logo URL <small style={{ color: "#94A3B8", fontWeight: 400 }}>(optional)</small></MLabel>
                <input value={form.logo} onChange={e => setField("logo", e.target.value)} placeholder="https://…" style={iSt} />
              </div>
              <div className="col-12">
                <MLabel>Notes</MLabel>
                <textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={2} placeholder="General notes…" style={{ ...iSt, resize: "vertical" }} />
              </div>
            </div>
          </MSect>

          {/* Services */}
          <MSect title="Services">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {SERVICES.map(s => {
                const on = form.services.includes(s.key);
                return (
                  <button key={s.key} type="button" onClick={() => toggleService(s.key)} style={{
                    border: `2px solid ${on ? s.color : "#E5E7EB"}`,
                    background: on ? s.color + "15" : "#F8FAFC",
                    color: on ? s.color : "#64748B",
                    borderRadius: 10, padding: "7px 13px", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <i className={`bi ${s.icon}`} />{s.label}
                    {on && <i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} />}
                  </button>
                );
              })}
            </div>
          </MSect>

          {/* Social Media */}
          {form.services.includes("socialMedia") && (
            <MSect title={<><i className="bi bi-instagram me-2" style={{ color: "#E1306C" }} />Social Media</>}>
              <MLabel>Monthly Deliverables</MLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16, marginTop: 6 }}>
                {[["Reels","reels","#E1306C"],["Posts","posts","#3B82F6"],["Carousels","carousels","#F59E0B"],["Stories","stories","#10B981"]].map(([lbl,k,c]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: c, marginBottom: 3 }}>{lbl}</div>
                    <input type="number" min={0}
                      value={form.monthlyDeliverables[k]}
                      onChange={e => setForm(f => ({ ...f, monthlyDeliverables: { ...f.monthlyDeliverables, [k]: Number(e.target.value) } }))}
                      style={{ ...iSt, fontWeight: 700, color: c, textAlign: "center" }}
                    />
                  </div>
                ))}
              </div>

              <MLabel>Weekly Posting Schedule</MLabel>
              <div style={{ overflowX: "auto", marginTop: 8, border: "1.5px solid #E5E7EB", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      <th style={{ padding: "7px 10px", textAlign: "left", color: "#64748B", fontWeight: 700, borderBottom: "1.5px solid #E5E7EB" }}>Content</th>
                      {DAYS.map(d => (
                        <th key={d} style={{ padding: "7px 8px", textAlign: "center", color: "#64748B", fontWeight: 700, borderBottom: "1.5px solid #E5E7EB" }}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CTYPES.map((ct, ri) => {
                      const m = CTYPE_META[ct];
                      return (
                        <tr key={ct} style={{ borderBottom: ri < CTYPES.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 700, color: m.color }}>
                            <span style={{ background: m.color + "15", borderRadius: 5, padding: "2px 7px" }}>{m.label}</span>
                          </td>
                          {DAYS.map(d => {
                            const checked = slotMap[`${d}_${ct}`];
                            return (
                              <td key={d} style={{ padding: "6px 8px", textAlign: "center" }}>
                                <div onClick={() => toggleWeeklySlot(d, ct)} style={{
                                  width: 22, height: 22, borderRadius: 7, cursor: "pointer",
                                  background: checked ? m.color : "#F1F5F9",
                                  border: `2px solid ${checked ? m.color : "#E5E7EB"}`,
                                  margin: "0 auto",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all .12s",
                                }}>
                                  {checked && <i className="bi bi-check2" style={{ color: "#fff", fontSize: 12 }} />}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </MSect>
          )}

          {/* Website */}
          {form.services.includes("website") && (
            <MSect title={<><i className="bi bi-globe2 me-2" style={{ color: "#3B82F6" }} />Website</>}>
              <div className="row g-3">
                <div className="col-12"><MLabel>Website URL</MLabel>
                  <input value={form.websiteSettings.url} onChange={e => setField("websiteSettings.url", e.target.value)} placeholder="https://example.com" style={iSt} />
                </div>
                <div className="col-6"><MLabel>CMS</MLabel>
                  <select value={form.websiteSettings.cms} onChange={e => setField("websiteSettings.cms", e.target.value)} style={iSt}>
                    <option value="">Select CMS…</option>
                    {["WordPress","Webflow","Shopify","Wix","Squarespace","Custom","Other"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-6"><MLabel>Hosting</MLabel>
                  <input value={form.websiteSettings.hosting} onChange={e => setField("websiteSettings.hosting", e.target.value)} placeholder="e.g. AWS, GoDaddy" style={iSt} />
                </div>
                <div className="col-12"><MLabel>Notes</MLabel>
                  <textarea value={form.websiteSettings.notes} onChange={e => setField("websiteSettings.notes", e.target.value)} rows={2} style={{ ...iSt, resize: "vertical" }} />
                </div>
              </div>
            </MSect>
          )}

          {/* SEO */}
          {form.services.includes("seo") && (
            <MSect title={<><i className="bi bi-search me-2" style={{ color: "#10B981" }} />SEO</>}>
              {/* Google Search Console */}
              <div style={{ marginBottom: 20, background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <i className="bi bi-graph-up-arrow" style={{ color: "#16A34A", fontSize: 15 }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#15803D" }}>Google Search Console</span>
                </div>
                <MLabel>GSC Site URL</MLabel>
                <input type="text" value={form.gsc?.siteUrl || ""}
                  onChange={e => setForm(f => ({ ...f, gsc: { ...f.gsc, siteUrl: e.target.value.trim() } }))}
                  placeholder="https://yourdomain.com/ or sc-domain:yourdomain.com"
                  style={iSt} />
                <div style={{ fontSize: 11, color: "#059669", marginTop: 5, lineHeight: 1.5 }}>
                  Enter the exact property URL as shown in Google Search Console. Add your service account email as a Full user in GSC to enable data access.
                </div>
              </div>

              {/* No. of Blogs */}
              <div style={{ marginBottom: 18 }}>
                <MLabel>No. of Blogs — Target per Month</MLabel>
                <input type="number" min={0} value={form.seoSettings.blogCount}
                  onChange={e => setField("seoSettings.blogCount", Number(e.target.value))}
                  placeholder="0" style={{ ...iSt, maxWidth: 140 }} />
              </div>

              {/* Weekly Blog Schedule */}
              <div style={{ marginBottom: 18 }}>
                <MLabel>Weekly Blog Schedule <span style={{ fontWeight: 400, color: "#94A3B8", textTransform: "none", fontSize: 10 }}>— which days to publish</span></MLabel>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
                  {DAYS.map(day => {
                    const active = (form.seoSettings.blogSchedule || []).includes(day);
                    return (
                      <div key={day} onClick={() => toggleBlogDay(day)} style={{
                        width: 44, height: 44, borderRadius: 10, cursor: "pointer",
                        background: active ? "#10B981" : "#F8FAFC",
                        border: `2px solid ${active ? "#10B981" : "#E5E7EB"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800,
                        color: active ? "#fff" : "#94A3B8",
                        transition: "all .12s",
                        userSelect: "none",
                      }}>
                        {day}
                      </div>
                    );
                  })}
                </div>
                {(form.seoSettings.blogSchedule || []).length > 0 && (
                  <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 6 }}>
                    {(form.seoSettings.blogSchedule || []).length} day{(form.seoSettings.blogSchedule || []).length !== 1 ? "s" : ""} selected — {(form.seoSettings.blogSchedule || []).join(", ")}
                  </div>
                )}
              </div>

              {/* Competitors */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <MLabel style={{ marginBottom: 0 }}>Competitors</MLabel>
                  <button type="button" onClick={addCompetitor} style={{
                    background: "#ECFDF5", color: "#059669", border: "1.5px solid #6EE7B7",
                    borderRadius: 7, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <i className="bi bi-plus-lg" /> Add Competitor
                  </button>
                </div>

                {(form.seoSettings.competitors || []).length === 0 && (
                  <div style={{ fontSize: 12, color: "#94A3B8", padding: "10px 0", textAlign: "center", border: "1.5px dashed #E5E7EB", borderRadius: 8 }}>
                    No competitors added yet
                  </div>
                )}

                {(form.seoSettings.competitors || []).map((comp, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <input value={comp.name} onChange={e => updateCompetitor(i, "name", e.target.value)}
                      placeholder="Competitor name" style={iSt} />
                    <input value={comp.website} onChange={e => updateCompetitor(i, "website", e.target.value)}
                      placeholder="Website URL" style={iSt} />
                    <select value={comp.type} onChange={e => updateCompetitor(i, "type", e.target.value)} style={iSt}>
                      <option value="">Type…</option>
                      <option value="direct">Direct</option>
                      <option value="indirect">Indirect</option>
                      <option value="aspirational">Aspirational</option>
                      <option value="local">Local</option>
                    </select>
                    <button type="button" onClick={() => removeCompetitor(i)} style={{
                      background: "#FEF2F2", color: "#DC2626", border: "1.5px solid #FECACA",
                      borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: 14, lineHeight: 1,
                    }}>
                      <i className="bi bi-trash3" />
                    </button>
                  </div>
                ))}
              </div>
            </MSect>
          )}

          {/* Ads */}
          {form.services.includes("ads") && (
            <MSect title={<><i className="bi bi-megaphone me-2" style={{ color: "#F59E0B" }} />Ads</>}>
              <div className="row g-3">
                <div className="col-12"><MLabel>Platforms</MLabel>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 5 }}>
                    {AD_PLATFORMS.map(p => {
                      const on = (form.adsSettings.platforms || []).includes(p);
                      return (
                        <label key={p} style={{
                          display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
                          fontSize: 13, fontWeight: 600,
                          background: on ? "#FEF3C7" : "#F8FAFC",
                          border: `1.5px solid ${on ? "#FDE68A" : "#E5E7EB"}`,
                          borderRadius: 8, padding: "5px 12px",
                          color: on ? "#B45309" : "#64748B",
                        }}>
                          <input type="checkbox" checked={on} onChange={() => toggleAdPlatform(p)} style={{ accentColor: "#F59E0B", width: 13, height: 13 }} />
                          {p}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="col-12"><MLabel>Notes</MLabel>
                  <textarea value={form.adsSettings.notes} onChange={e => setField("adsSettings.notes", e.target.value)} rows={2} style={{ ...iSt, resize: "vertical" }} />
                </div>
              </div>
            </MSect>
          )}

          {/* Branding */}
          {form.services.includes("branding") && (
            <MSect title={<><i className="bi bi-palette me-2" style={{ color: "#8B5CF6" }} />Branding</>}>
              <MLabel>Select services included</MLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {[
                  { key: "logoDesign",          label: "Logo Design",           icon: "bi-brush",    color: "#8B5CF6" },
                  { key: "brandIdentityDesign", label: "Brand Identity Design", icon: "bi-layers",   color: "#6366F1" },
                  { key: "productPackaging",    label: "Product Packaging",     icon: "bi-box-seam", color: "#EC4899" },
                ].map(it => {
                  const on = form.brandingSettings[it.key];
                  return (
                    <label key={it.key} style={{
                      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                      padding: "9px 12px", borderRadius: 10,
                      border: `1.5px solid ${on ? it.color + "40" : "#E5E7EB"}`,
                      background: on ? it.color + "0D" : "#F8FAFC",
                    }}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={e => setForm(f => ({ ...f, brandingSettings: { ...f.brandingSettings, [it.key]: e.target.checked } }))}
                        style={{ accentColor: it.color, width: 15, height: 15 }}
                      />
                      <i className={`bi ${it.icon}`} style={{ color: on ? it.color : "#94A3B8", fontSize: 15 }} />
                      <span style={{ fontSize: 13, fontWeight: on ? 700 : 500, color: on ? "#1E293B" : "#64748B" }}>{it.label}</span>
                    </label>
                  );
                })}
              </div>
            </MSect>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px", borderTop: "1.5px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{
            background: "#F8FAFC", color: "#64748B", border: "1.5px solid #E5E7EB",
            borderRadius: 10, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{
            background: "#6366F1", color: "#fff", border: "none",
            borderRadius: 10, padding: "8px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Saving…" : (editMode ? "Update Brand" : "Create Brand")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tiny modal helpers ─────────────────────────────────────────────────── */

function MSect({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 9, display: "flex", alignItems: "center", paddingBottom: 6, borderBottom: "1px solid #F1F5F9" }}>{title}</div>
      {children}
    </div>
  );
}

function MLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</div>;
}

const iSt = {
  width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8,
  padding: "7px 10px", fontSize: 13, outline: "none", background: "#F8FAFC", color: "#1E293B",
};
