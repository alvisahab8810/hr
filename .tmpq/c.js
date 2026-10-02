import React, { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import { confirmDialog } from "../../../../../components/ConfirmDialog";
const SERVICES = [
  { key: "socialMedia", label: "Social Media", icon: "bi-instagram", color: "#E1306C" },
  { key: "website", label: "Website", icon: "bi-globe2", color: "#3B82F6" },
  { key: "seo", label: "SEO", icon: "bi-search", color: "#10B981" },
  { key: "ads", label: "Ads", icon: "bi-megaphone", color: "#F59E0B" },
  { key: "branding", label: "Branding", icon: "bi-palette", color: "#8B5CF6" }
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CTYPES = ["reel", "post", "carousel", "story"];
const CTYPE_META = {
  reel: { label: "Reel", color: "#E1306C" },
  post: { label: "Post", color: "#3B82F6" },
  carousel: { label: "Carousel", color: "#F59E0B" },
  story: { label: "Story", color: "#10B981" }
};
const AD_PLATFORMS = ["Google", "Meta", "YouTube", "LinkedIn", "Twitter", "TikTok"];
const PRESET_COLORS = [
  "#6366F1",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#64748B"
];
function getInitials(name) {
  return (name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function svcMeta(key) {
  return SERVICES.find((s) => s.key === key) || {};
}
function freshForm() {
  return {
    name: "",
    logo: "",
    color: "#6366F1",
    contactEmail: "",
    notes: "",
    clientId: null,
    services: [],
    monthlyDeliverables: { reels: 0, posts: 0, carousels: 0, stories: 0 },
    weeklySchedule: [],
    websiteSettings: { url: "", cms: "", hosting: "", notes: "" },
    seoSettings: { blogCount: 0, blogSchedule: [], technical: { enabled: false, notes: "" }, onPage: { enabled: false, notes: "" }, offPage: { enabled: false, notes: "" }, backlinks: { target: 0, notes: "" }, keywords: { count: 0, notes: "" }, notes: "", competitors: [] },
    adsSettings: { platforms: [], notes: "" },
    brandingSettings: { logoDesign: false, brandIdentityDesign: false, productPackaging: false },
    gsc: { siteUrl: "" }
  };
}
export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(freshForm());
  const [saving, setSaving] = useState(false);
  const [gscSites, setGscSites] = useState([]);
  const [gscSitesLoading, setGscSitesLoading] = useState(false);
  const [gscSelectedSite, setGscSelectedSite] = useState("");
  const [gscSaving, setGscSaving] = useState(false);
  const [gscDisconnecting, setGscDisconnecting] = useState(false);
  const [gscWarning, setGscWarning] = useState("");
  const loadBrands = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q ? `/api/admin/brands?search=${encodeURIComponent(q)}` : "/api/admin/brands";
      const r = await fetch(url, { credentials: "include" });
      const d = await r.json();
      if (d.success) {
        setBrands(d.brands);
        setSelected(
          (prev) => prev ? d.brands.find((b) => b._id === prev._id) || d.brands[0] || null : d.brands[0] || null
        );
      }
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadBrands();
  }, []);
  useEffect(() => {
    const { selectBrand: selectBrandId, gsc, email, msg } = router.query;
    if (gsc === "connected") toast.success(`Google Search Console connected${email ? ` as ${decodeURIComponent(email)}` : ""}!`);
    if (gsc === "error") toast.error(`GSC error: ${msg ? decodeURIComponent(msg) : "Unknown"}`);
    if (selectBrandId && brands.length > 0) {
      const found = brands.find((b) => b._id === selectBrandId);
      if (found) {
        setSelected(found);
        setActiveTab("seo");
      }
    }
  }, [router.query, brands]);
  const handedOver = useRef(false);
  useEffect(() => {
    const { newBrand, clientId, name, email } = router.query;
    if (newBrand !== "1" || handedOver.current) return;
    handedOver.current = true;
    setForm({ ...freshForm(), name: name ? String(name) : "", contactEmail: email ? String(email) : "", clientId: clientId ? String(clientId) : null });
    setEditMode(false);
    setShowModal(true);
  }, [router.query]);
  useEffect(() => {
    setGscSites([]);
    setGscWarning("");
    setGscSelectedSite(selected?.gsc?.siteUrl || "");
    if (selected?.gsc?.email && selected?._id) {
      setGscSitesLoading(true);
      fetch(`/api/admin/brands/${selected._id}/gsc/sites`, { credentials: "include" }).then((r) => r.json()).then((d) => {
        if (d.success) {
          setGscSites(d.sites || []);
          if (!d.connected) {
            setGscWarning(d.reason === "token_refresh_failed" ? `Google token expired \u2014 please disconnect and reconnect. (${d.error || ""})` : "Google token not found \u2014 please disconnect and reconnect your account.");
          } else if (d.connected && d.sites?.length === 0) {
            if (d.reason === "api_error") setGscWarning(`GSC API error: ${d.error}`);
            else if (d.reason === "no_properties") setGscWarning("No Search Console properties found for this Google account.");
          }
        }
      }).catch(() => {
      }).finally(() => setGscSitesLoading(false));
    }
  }, [selected?._id]);
  const debRef = useRef(null);
  function handleSearch(v) {
    setSearch(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => loadBrands(v), 400);
  }
  const loadGscSites = useCallback(async () => {
    if (!selected?._id) return;
    setGscSitesLoading(true);
    setGscWarning("");
    try {
      const res = await fetch(`/api/admin/brands/${selected._id}/gsc/sites`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setGscSites(data.sites || []);
        if (!data.connected) {
          setGscWarning(data.reason === "token_refresh_failed" ? `Google token expired \u2014 please disconnect and reconnect. (${data.error || ""})` : "Google token not found \u2014 please disconnect and reconnect your account.");
        } else if (data.connected && data.sites?.length === 0) {
          if (data.reason === "api_error") setGscWarning(`GSC API error: ${data.error}`);
          else if (data.reason === "no_properties") setGscWarning("No Search Console properties found for this Google account.");
        }
      } else {
        toast.error(data.message || "Could not load GSC sites");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setGscSitesLoading(false);
    }
  }, [selected?._id]);
  const saveGscSite = async () => {
    if (!gscSelectedSite || !selected?._id) return;
    setGscSaving(true);
    try {
      const res = await fetch(`/api/admin/brands/${selected._id}/gsc/save`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteUrl: gscSelectedSite }) });
      const data = await res.json();
      if (data.success) {
        toast.success("GSC property saved!");
        const upd = (b) => ({ ...b, gsc: { ...b.gsc || {}, siteUrl: gscSelectedSite } });
        setBrands((bs) => bs.map((b) => b._id === selected._id ? upd(b) : b));
        setSelected((s) => upd(s));
      } else toast.error(data.message || "Failed to save");
    } catch {
      toast.error("Network error");
    } finally {
      setGscSaving(false);
    }
  };
  const disconnectGsc = async () => {
    if (!await confirmDialog("Disconnect Google Search Console from this brand?") || !selected?._id) return;
    setGscDisconnecting(true);
    try {
      const res = await fetch(`/api/admin/brands/${selected._id}/gsc/disconnect`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        toast.success("GSC disconnected");
        const cleared = { siteUrl: "", email: "", connectedAt: null };
        setBrands((bs) => bs.map((b) => b._id === selected._id ? { ...b, gsc: cleared } : b));
        setSelected((s) => ({ ...s, gsc: cleared }));
        setGscSites([]);
        setGscSelectedSite("");
      } else toast.error(data.message || "Failed");
    } catch {
      toast.error("Network error");
    } finally {
      setGscDisconnecting(false);
    }
  };
  function selectBrand(b) {
    setSelected(b);
    setActiveTab(b.services?.[0] || null);
  }
  useEffect(() => {
    if (selected) {
      setActiveTab(
        (prev) => (selected.services || []).includes(prev) ? prev : selected.services?.[0] || null
      );
    }
  }, [selected?._id]);
  function toggleService(key) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(key) ? f.services.filter((s) => s !== key) : [...f.services, key]
    }));
  }
  function toggleWeeklySlot(day, ctype) {
    setForm((f) => {
      const exists = f.weeklySchedule.find((s) => s.day === day && s.contentType === ctype);
      return {
        ...f,
        weeklySchedule: exists ? f.weeklySchedule.filter((s) => !(s.day === day && s.contentType === ctype)) : [...f.weeklySchedule, { day, contentType: ctype }]
      };
    });
  }
  function toggleAdPlatform(p) {
    setForm((f) => ({
      ...f,
      adsSettings: {
        ...f.adsSettings,
        platforms: f.adsSettings.platforms.includes(p) ? f.adsSettings.platforms.filter((x) => x !== p) : [...f.adsSettings.platforms, p]
      }
    }));
  }
  function openCreate() {
    setForm(freshForm());
    setEditMode(false);
    setShowModal(true);
  }
  function openEdit(b) {
    setForm({
      name: b.name || "",
      logo: b.logo || "",
      color: b.color || "#6366F1",
      contactEmail: b.contactEmail || "",
      notes: b.notes || "",
      services: b.services || [],
      monthlyDeliverables: b.monthlyDeliverables || { reels: 0, posts: 0, carousels: 0, stories: 0 },
      weeklySchedule: b.weeklySchedule || [],
      websiteSettings: b.websiteSettings || { url: "", cms: "", hosting: "", notes: "" },
      seoSettings: {
        blogCount: b.seoSettings?.blogCount || 0,
        blogSchedule: b.seoSettings?.blogSchedule || [],
        technical: { enabled: b.seoSettings?.technical?.enabled || false, notes: b.seoSettings?.technical?.notes || "" },
        onPage: { enabled: b.seoSettings?.onPage?.enabled || false, notes: b.seoSettings?.onPage?.notes || "" },
        offPage: { enabled: b.seoSettings?.offPage?.enabled || false, notes: b.seoSettings?.offPage?.notes || "" },
        backlinks: { target: b.seoSettings?.backlinks?.target || 0, notes: b.seoSettings?.backlinks?.notes || "" },
        keywords: { count: b.seoSettings?.keywords?.count || 0, notes: b.seoSettings?.keywords?.notes || "" },
        notes: b.seoSettings?.notes || "",
        competitors: (b.seoSettings?.competitors || []).map((c) => ({ name: c.name || "", website: c.website || "", type: c.type || "" }))
      },
      adsSettings: b.adsSettings || { platforms: [], notes: "" },
      brandingSettings: b.brandingSettings || { logoDesign: false, brandIdentityDesign: false, productPackaging: false },
      gsc: { siteUrl: b.gsc?.siteUrl || "" }
    });
    setEditMode(true);
    setShowModal(true);
  }
  async function handleSave() {
    if (!form.name.trim()) return toast.error("Brand name is required");
    setSaving(true);
    try {
      const url = editMode ? `/api/admin/brands/${selected._id}` : "/api/admin/brands";
      const method = editMode ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || "Failed");
      toast.success(editMode ? "Brand updated" : "Brand created");
      setShowModal(false);
      await loadBrands(search);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete(b) {
    if (!await confirmDialog(`Delete brand "${b.name}"?`)) return;
    try {
      const r = await fetch(`/api/admin/brands/${b._id}`, { method: "DELETE", credentials: "include" });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      toast.success("Brand deleted");
      const next = brands.filter((x) => x._id !== b._id);
      setBrands(next);
      setSelected(next[0] || null);
    } catch (e) {
      toast.error(e.message);
    }
  }
  const filteredBrands = brands.filter(
    (b) => !search || b.name.toLowerCase().includes(search.toLowerCase())
  );
  return /* @__PURE__ */ React.createElement("div", { className: "leaves-management-admin" }, /* @__PURE__ */ React.createElement(Head, null, /* @__PURE__ */ React.createElement("title", null, "Brands | Viralon"), /* @__PURE__ */ React.createElement("link", { rel: "stylesheet", href: "/asets/css/bootstrap.min.css" }), /* @__PURE__ */ React.createElement("link", { rel: "stylesheet", href: "/asets/css/main.css" }), /* @__PURE__ */ React.createElement("link", { rel: "stylesheet", href: "/asets/css/admin.css" }), /* @__PURE__ */ React.createElement("link", { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" }), /* @__PURE__ */ React.createElement("style", null, `
          .brands-logobx {
            width: 30px; height: 30px;
            background: #fff;
            border-radius: 50px;
            padding: 5px;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-shrink: 0;
            box-shadow: 0 1px 4px rgba(0,0,0,.10);
            overflow: hidden;
          }
          .brands-logobx img { width: 100%; height: 100%; object-fit: contain; }
          .brands-logobx--lg {
            width: 50px; height: 50px;
            border-radius: 12px;
            padding: 6px;
          }
        `)), /* @__PURE__ */ React.createElement("div", { className: "add-employee-area" }, /* @__PURE__ */ React.createElement("div", { className: "main-nav" }, /* @__PURE__ */ React.createElement(SmartLeftbar, null), /* @__PURE__ */ React.createElement(LeftbarMobile, null), /* @__PURE__ */ React.createElement(Dashnav, null), /* @__PURE__ */ React.createElement("section", { className: "content home" }, /* @__PURE__ */ React.createElement("div", { className: "breadcrum-bx" }, /* @__PURE__ */ React.createElement("ul", { className: "breadcrumb bg-white" }, /* @__PURE__ */ React.createElement("li", { className: "breadcrumb-item" }, /* @__PURE__ */ React.createElement(Link, { href: "/dashboard/admin/tasks" }, /* @__PURE__ */ React.createElement("img", { src: "/icons/home.svg", alt: "" }), " Task Management")), /* @__PURE__ */ React.createElement("li", { className: "breadcrumb-item active" }, "Brands"))), /* @__PURE__ */ React.createElement("div", { className: "block-header add-emp-area", style: { padding: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", height: "calc(100vh - 150px)", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
    width: 270,
    minWidth: 240,
    borderRight: "1.5px solid #E5E7EB",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    height: "100%"
  } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 14px 10px", borderBottom: "1px solid #F1F5F9" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 15, color: "#1E293B" } }, "Brands"), /* @__PURE__ */ React.createElement("button", { onClick: openCreate, style: {
    background: "#6366F1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg" }), " New")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-search", style: {
    position: "absolute",
    left: 9,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94A3B8",
    fontSize: 13
  } }), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: search,
      onChange: (e) => handleSearch(e.target.value),
      placeholder: "Search brands\u2026",
      style: {
        width: "100%",
        border: "1.5px solid #E5E7EB",
        borderRadius: 8,
        padding: "7px 10px 7px 30px",
        fontSize: 13,
        outline: "none",
        background: "#F8FAFC"
      }
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto" } }, loading && /* @__PURE__ */ React.createElement("div", { style: { padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 } }, "Loading\u2026"), !loading && filteredBrands.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 } }, "No brands found"), filteredBrands.map((b) => {
    const isAct = selected?._id === b._id;
    return /* @__PURE__ */ React.createElement("div", { key: b._id, onClick: () => selectBrand(b), style: {
      padding: "10px 14px",
      cursor: "pointer",
      background: isAct ? "#EEF2FF" : "transparent",
      borderLeft: isAct ? "3px solid #6366F1" : "3px solid transparent"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, b.logo ? /* @__PURE__ */ React.createElement("div", { className: "brands-logobx" }, /* @__PURE__ */ React.createElement("img", { src: b.logo, alt: "" })) : /* @__PURE__ */ React.createElement("div", { style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      background: b.color || "#6366F1",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: 12,
      flexShrink: 0
    } }, getInitials(b.name)), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontWeight: 700,
      fontSize: 13,
      color: "#1E293B",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    } }, b.name), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 } }, (b.services || []).slice(0, 3).map((sk) => {
      const m = svcMeta(sk);
      return /* @__PURE__ */ React.createElement("span", { key: sk, style: {
        fontSize: 9,
        fontWeight: 600,
        color: m.color,
        background: (m.color || "#999") + "18",
        borderRadius: 4,
        padding: "1px 5px"
      } }, m.label);
    }), (b.services || []).length > 3 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#94A3B8" } }, "+", b.services.length - 3), (b.services || []).length === 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#CBD5E1" } }, "No services")))));
  }))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "24px 28px", background: "#F8FAFC" } }, !selected ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", paddingTop: 80, color: "#94A3B8" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-building", style: { fontSize: 48 } }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontSize: 15, fontWeight: 600 } }, "Select a brand"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, marginTop: 4 } }, "or create a new one")) : /* @__PURE__ */ React.createElement(
    BrandDetail,
    {
      brand: selected,
      activeTab,
      setActiveTab,
      onEdit: () => openEdit(selected),
      onDelete: () => handleDelete(selected),
      gscSites,
      gscSitesLoading,
      gscSelectedSite,
      setGscSelectedSite,
      gscSaving,
      gscDisconnecting,
      gscWarning,
      onLoadGscSites: loadGscSites,
      onSaveGscSite: saveGscSite,
      onDisconnectGsc: disconnectGsc
    }
  ))))))), showModal && /* @__PURE__ */ React.createElement(
    BrandModal,
    {
      form,
      setForm,
      editMode,
      saving,
      onSave: handleSave,
      onClose: () => setShowModal(false),
      toggleService,
      toggleWeeklySlot,
      toggleAdPlatform
    }
  ));
}
function BrandDetail({ brand, activeTab, setActiveTab, onEdit, onDelete, gscSites, gscSitesLoading, gscSelectedSite, setGscSelectedSite, gscSaving, gscDisconnecting, gscWarning, onLoadGscSites, onSaveGscSite, onDisconnectGsc }) {
  const activeSvc = SERVICES.filter((s) => (brand.services || []).includes(s.key));
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14 } }, brand.logo ? /* @__PURE__ */ React.createElement("div", { className: "brands-logobx brands-logobx--lg" }, /* @__PURE__ */ React.createElement("img", { src: brand.logo, alt: "" })) : /* @__PURE__ */ React.createElement("div", { style: {
    width: 50,
    height: 50,
    borderRadius: 12,
    background: brand.color || "#6366F1",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 18,
    flexShrink: 0
  } }, getInitials(brand.name)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontWeight: 800, color: "#1E293B", fontSize: 20 } }, brand.name), brand.contactEmail && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#64748B", marginTop: 2 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-envelope me-1" }), brand.contactEmail), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" } }, activeSvc.map((s) => /* @__PURE__ */ React.createElement("span", { key: s.key, style: {
    fontSize: 11,
    fontWeight: 700,
    color: s.color,
    background: s.color + "18",
    borderRadius: 6,
    padding: "2px 9px"
  } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${s.icon} me-1` }), s.label)), activeSvc.length === 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#94A3B8" } }, "No services")))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: onEdit, style: {
    background: "#EEF2FF",
    color: "#6366F1",
    border: "1.5px solid #C7D2FE",
    borderRadius: 8,
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-pencil me-1" }), "Edit"), /* @__PURE__ */ React.createElement("button", { onClick: onDelete, style: {
    background: "#FFF1F2",
    color: "#E11D48",
    border: "1.5px solid #FECDD3",
    borderRadius: 8,
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-trash me-1" }), "Delete"))), activeSvc.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1.5px solid #E5E7EB", padding: "40px 32px", textAlign: "center", color: "#94A3B8" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-grid", style: { fontSize: 36 } }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontSize: 14, fontWeight: 600 } }, "No services configured"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, marginTop: 4 } }, "Edit the brand to add services")), activeSvc.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, borderBottom: "2px solid #E5E7EB", marginBottom: 22 } }, activeSvc.map((s) => {
    const isAct = activeTab === s.key;
    return /* @__PURE__ */ React.createElement("button", { key: s.key, onClick: () => setActiveTab(s.key), style: {
      background: isAct ? s.color + "15" : "transparent",
      color: isAct ? s.color : "#64748B",
      border: "none",
      borderBottom: isAct ? `2.5px solid ${s.color}` : "2.5px solid transparent",
      padding: "8px 16px",
      fontSize: 13,
      fontWeight: isAct ? 700 : 500,
      cursor: "pointer",
      borderRadius: "8px 8px 0 0",
      marginBottom: -2,
      display: "flex",
      alignItems: "center",
      gap: 6
    } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${s.icon}` }), s.label);
  })), activeTab === "socialMedia" && /* @__PURE__ */ React.createElement(SocialMediaView, { brand }), activeTab === "website" && /* @__PURE__ */ React.createElement(WebsiteView, { brand }), activeTab === "seo" && /* @__PURE__ */ React.createElement(
    SeoView,
    {
      brand,
      gscSites,
      gscSitesLoading,
      gscSelectedSite,
      setGscSelectedSite,
      gscSaving,
      gscDisconnecting,
      gscWarning,
      onLoadGscSites,
      onSaveGscSite,
      onDisconnectGsc
    }
  ), activeTab === "ads" && /* @__PURE__ */ React.createElement(AdsView, { brand }), activeTab === "branding" && /* @__PURE__ */ React.createElement(BrandingView, { brand })), brand.notes && /* @__PURE__ */ React.createElement("div", { style: { background: "#FFFBEB", borderRadius: 12, border: "1.5px solid #FDE68A", padding: "14px 18px", marginTop: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: "#B45309", fontSize: 13, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-sticky me-1" }), "Notes"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#78350F", lineHeight: 1.6 } }, brand.notes)));
}
function InfoCard({ title, children }) {
  return /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1.5px solid #E5E7EB", padding: "16px 20px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: "#374151", fontSize: 14, marginBottom: 12 } }, title), children);
}
function Row({ label, value }) {
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F1F5F9" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "#64748B" } }, label), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: "#1E293B" } }, value || /* @__PURE__ */ React.createElement("span", { style: { color: "#CBD5E1" } }, "\u2014")));
}
function SocialMediaView({ brand }) {
  const md = brand.monthlyDeliverables || {};
  const ws = brand.weeklySchedule || [];
  const slotMap = {};
  ws.forEach((s) => {
    slotMap[`${s.day}_${s.contentType}`] = true;
  });
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(InfoCard, { title: "Monthly Deliverables" }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 } }, [["Reels", "reels", "#E1306C"], ["Posts", "posts", "#3B82F6"], ["Carousels", "carousels", "#F59E0B"], ["Stories", "stories", "#10B981"]].map(([lbl, k, c]) => /* @__PURE__ */ React.createElement("div", { key: k, style: { background: c + "10", borderRadius: 10, padding: "12px 8px", textAlign: "center", border: `1.5px solid ${c}30` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: 900, color: c } }, md[k] || 0), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#64748B", fontWeight: 600, marginTop: 2 } }, lbl))))), /* @__PURE__ */ React.createElement(InfoCard, { title: "Weekly Posting Schedule" }, ws.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { color: "#CBD5E1", fontSize: 13, textAlign: "center", padding: "10px 0" } }, "No schedule set") : /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { padding: "5px 10px", textAlign: "left", color: "#64748B", fontWeight: 600, width: 80 } }, "Content"), DAYS.map((d) => /* @__PURE__ */ React.createElement("th", { key: d, style: { padding: "5px 8px", textAlign: "center", color: "#64748B", fontWeight: 600 } }, d)))), /* @__PURE__ */ React.createElement("tbody", null, CTYPES.map((ct) => {
    const m = CTYPE_META[ct];
    return /* @__PURE__ */ React.createElement("tr", { key: ct }, /* @__PURE__ */ React.createElement("td", { style: { padding: "5px 10px", fontWeight: 700, color: m.color } }, /* @__PURE__ */ React.createElement("span", { style: { background: m.color + "15", borderRadius: 5, padding: "2px 7px" } }, m.label)), DAYS.map((d) => {
      const filled = slotMap[`${d}_${ct}`];
      return /* @__PURE__ */ React.createElement("td", { key: d, style: { padding: "5px 8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: {
        width: 20,
        height: 20,
        borderRadius: 6,
        margin: "0 auto",
        background: filled ? m.color : "#F1F5F9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      } }, filled && /* @__PURE__ */ React.createElement("i", { className: "bi bi-check2", style: { color: "#fff", fontSize: 11 } })));
    }));
  }))))));
}
function WebsiteView({ brand }) {
  const ws = brand.websiteSettings || {};
  return /* @__PURE__ */ React.createElement(InfoCard, { title: "Website Settings" }, /* @__PURE__ */ React.createElement(Row, { label: "URL", value: ws.url ? /* @__PURE__ */ React.createElement("a", { href: ws.url, target: "_blank", rel: "noreferrer", style: { color: "#6366F1" } }, ws.url) : null }), /* @__PURE__ */ React.createElement(Row, { label: "CMS", value: ws.cms }), /* @__PURE__ */ React.createElement(Row, { label: "Hosting", value: ws.hosting }), ws.notes && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: "#64748B", lineHeight: 1.6, borderTop: "1px solid #F1F5F9", paddingTop: 10 } }, ws.notes));
}
function SeoView({ brand, gscSites, gscSitesLoading, gscSelectedSite, setGscSelectedSite, gscSaving, gscDisconnecting, gscWarning, onLoadGscSites, onSaveGscSite, onDisconnectGsc }) {
  const ss = brand.seoSettings || {};
  const blogSchedule = ss.blogSchedule || [];
  const competitors = ss.competitors || [];
  const hasAny = ss.blogCount > 0 || blogSchedule.length > 0 || competitors.length > 0;
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 14, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 32, height: 32, borderRadius: 9, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-graph-up-arrow", style: { color: "#16A34A", fontSize: 14 } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: 13, color: "#1E293B" } }, "Google Search Console"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#94A3B8" } }, "Connect to show live SEO data in the client portal"))), /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 18px" } }, brand.gsc?.email ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "#F0FDF4", borderRadius: 9, border: "1.5px solid #BBF7D0" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-check-circle-fill", style: { color: "#16A34A" } }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#15803D" } }, "Connected"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#166534" } }, brand.gsc.email)), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onDisconnectGsc,
      disabled: gscDisconnecting,
      style: { background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }
    },
    gscDisconnecting ? "\u2026" : "Disconnect"
  )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 } }, "GSC Property"), brand.gsc?.siteUrl && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#15803D", fontWeight: 600, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-check2-circle me-1" }), "Active: ", brand.gsc.siteUrl), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: gscSelectedSite,
      onChange: (e) => setGscSelectedSite(e.target.value),
      style: { flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 12, outline: "none", background: "#F8FAFC" }
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 Select property \u2014"),
    gscSites.map((s) => /* @__PURE__ */ React.createElement("option", { key: s, value: s }, s))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onLoadGscSites,
      disabled: gscSitesLoading,
      style: { background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer" }
    },
    /* @__PURE__ */ React.createElement("i", { className: `bi ${gscSitesLoading ? "bi-arrow-repeat" : "bi-arrow-clockwise"}` })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onSaveGscSite,
      disabled: gscSaving || !gscSelectedSite,
      style: { background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: !gscSelectedSite ? 0.5 : 1 }
    },
    gscSaving ? "\u2026" : "Save"
  )), gscWarning && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#B45309", background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "8px 12px", marginTop: 6, display: "flex", alignItems: "flex-start", gap: 6 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-exclamation-triangle-fill", style: { marginTop: 1, flexShrink: 0 } }), /* @__PURE__ */ React.createElement("span", null, gscWarning)), !gscWarning && gscSites.length === 0 && !gscSitesLoading && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#94A3B8", marginTop: 5 } }, "Click ", /* @__PURE__ */ React.createElement("i", { className: "bi bi-arrow-clockwise" }), " to list available properties, or type the URL below."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 8 } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: gscSelectedSite,
      onChange: (e) => setGscSelectedSite(e.target.value),
      placeholder: "https://yourdomain.com/ or sc-domain:yourdomain.com",
      style: { flex: 1, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 11, outline: "none", background: "#F8FAFC", color: "#64748B" }
    }
  ))) : (
    /* Not connected */
    /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "8px 0 4px" } }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: "#64748B", marginBottom: 14, lineHeight: 1.6 } }, "Connect a Google account that has access to this brand's Search Console property."), /* @__PURE__ */ React.createElement(
      "a",
      {
        href: `/api/admin/brands/${brand._id}/gsc/connect`,
        style: { display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "9px 18px", fontWeight: 700, fontSize: 13, color: "#1E293B", textDecoration: "none", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }
      },
      /* @__PURE__ */ React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 48 48" }, /* @__PURE__ */ React.createElement("path", { fill: "#EA4335", d: "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z" }), /* @__PURE__ */ React.createElement("path", { fill: "#4285F4", d: "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" }), /* @__PURE__ */ React.createElement("path", { fill: "#FBBC05", d: "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" }), /* @__PURE__ */ React.createElement("path", { fill: "#34A853", d: "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" })),
      "Connect Google Account"
    ))
  ))), !hasAny && /* @__PURE__ */ React.createElement("div", { style: { background: "#F8FAFC", border: "1.5px dashed #E5E7EB", borderRadius: 12, padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: 12 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-search", style: { fontSize: 20, display: "block", marginBottom: 6 } }), "No SEO deliverables configured yet \u2014 edit the brand to add details."), hasAny && /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 14, padding: "18px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 38, height: 38, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-file-text", style: { color: "#6366F1", fontSize: 16 } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: 14, color: "#1E293B" } }, "Blogs"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#64748B" } }, ss.blogCount > 0 ? /* @__PURE__ */ React.createElement("span", { style: { color: "#6366F1", fontWeight: 700 } }, ss.blogCount, " blog", ss.blogCount !== 1 ? "s" : "", " / month") : /* @__PURE__ */ React.createElement("span", { style: { color: "#CBD5E1" } }, "No monthly target set")))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 } }, "Weekly Publishing Schedule"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, DAYS.map((day) => {
    const active = blogSchedule.includes(day);
    return /* @__PURE__ */ React.createElement("div", { key: day, style: {
      width: 38,
      height: 38,
      borderRadius: 9,
      background: active ? "#6366F1" : "#F8FAFC",
      border: `2px solid ${active ? "#6366F1" : "#E5E7EB"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 10,
      fontWeight: 800,
      color: active ? "#fff" : "#CBD5E1"
    } }, day);
  })), blogSchedule.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#CBD5E1", marginTop: 6 } }, "No schedule set"), blogSchedule.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6366F1", fontWeight: 600, marginTop: 6 } }, blogSchedule.length, " publishing day", blogSchedule.length !== 1 ? "s" : "", " \u2014 ", DAYS.filter((d) => blogSchedule.includes(d)).join(", ")))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 14, padding: "18px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: competitors.length > 0 ? 14 : 0 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 38, height: 38, borderRadius: 10, background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-trophy", style: { color: "#F59E0B", fontSize: 16 } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: 14, color: "#1E293B" } }, "Competitors"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#64748B" } }, competitors.length > 0 ? `${competitors.length} competitor${competitors.length !== 1 ? "s" : ""} tracked` : /* @__PURE__ */ React.createElement("span", { style: { color: "#CBD5E1" } }, "None added yet")))), competitors.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, competitors.map((c, i) => {
    const typeColors = { direct: ["#FEF2F2", "#DC2626"], indirect: ["#FFFBEB", "#B45309"], aspirational: ["#F5F3FF", "#7C3AED"], local: ["#ECFDF5", "#059669"] };
    const [tbg, tfg] = typeColors[c.type] || ["#F8FAFC", "#64748B"];
    return /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #F1F5F9", background: "#FAFAFA" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 32, height: 32, borderRadius: 8, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#6366F1", flexShrink: 0 } }, (c.name || "?").slice(0, 2).toUpperCase()), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, c.name || "\u2014"), c.website && /* @__PURE__ */ React.createElement(
      "a",
      {
        href: c.website.startsWith("http") ? c.website : `https://${c.website}`,
        target: "_blank",
        rel: "noopener noreferrer",
        style: { fontSize: 11, color: "#6366F1", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }
      },
      c.website
    )), c.type && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, background: tbg, color: tfg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap", textTransform: "capitalize" } }, c.type));
  }))));
}
function AdsView({ brand }) {
  const as = brand.adsSettings || {};
  return /* @__PURE__ */ React.createElement(InfoCard, { title: "Ads Settings" }, /* @__PURE__ */ React.createElement("div", { style: { padding: "6px 0", borderBottom: "1px solid #F1F5F9" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "#64748B" } }, "Platforms"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 } }, (as.platforms || []).length === 0 ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "#CBD5E1" } }, "\u2014") : (as.platforms || []).map((p) => /* @__PURE__ */ React.createElement("span", { key: p, style: { fontSize: 12, fontWeight: 600, background: "#EEF2FF", color: "#6366F1", borderRadius: 6, padding: "2px 9px" } }, p)))), as.notes && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: "#64748B", lineHeight: 1.6 } }, as.notes));
}
const BRANDING_ITEMS = [
  { key: "logoDesign", label: "Logo Design", icon: "bi-brush", color: "#8B5CF6" },
  { key: "brandIdentityDesign", label: "Brand Identity Design", icon: "bi-layers", color: "#6366F1" },
  { key: "productPackaging", label: "Product Packaging", icon: "bi-box-seam", color: "#EC4899" }
];
function BrandingView({ brand }) {
  const bs = brand.brandingSettings || {};
  const active = BRANDING_ITEMS.filter((it) => bs[it.key]);
  const inactive = BRANDING_ITEMS.filter((it) => !bs[it.key]);
  return /* @__PURE__ */ React.createElement(InfoCard, { title: "Branding Services" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, BRANDING_ITEMS.map((it) => {
    const on = bs[it.key];
    return /* @__PURE__ */ React.createElement("div", { key: it.key, style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 12px",
      borderRadius: 10,
      border: `1.5px solid ${on ? it.color + "40" : "#F1F5F9"}`,
      background: on ? it.color + "0D" : "#FAFAFA"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      flexShrink: 0,
      background: on ? it.color + "20" : "#F1F5F9",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${it.icon}`, style: { color: on ? it.color : "#CBD5E1", fontSize: 14 } })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: on ? 700 : 500, color: on ? "#1E293B" : "#94A3B8", flex: 1 } }, it.label), on ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: it.color, background: it.color + "15", borderRadius: 20, padding: "2px 8px" } }, "Included") : /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 600, color: "#CBD5E1", background: "#F1F5F9", borderRadius: 20, padding: "2px 8px" } }, "Not included"));
  })));
}
function BrandModal({ form, setForm, editMode, saving, onSave, onClose, toggleService, toggleWeeklySlot, toggleAdPlatform }) {
  function setField(path, val) {
    setForm((f) => {
      const parts = path.split(".");
      if (parts.length === 1) return { ...f, [path]: val };
      if (parts.length === 2) return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: val } };
      if (parts.length === 3) return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: { ...f[parts[0]]?.[parts[1]] || {}, [parts[2]]: val } } };
      return f;
    });
  }
  function toggleBlogDay(day) {
    setForm((f) => ({
      ...f,
      seoSettings: {
        ...f.seoSettings,
        blogSchedule: (f.seoSettings.blogSchedule || []).includes(day) ? (f.seoSettings.blogSchedule || []).filter((d) => d !== day) : [...f.seoSettings.blogSchedule || [], day]
      }
    }));
  }
  function addCompetitor() {
    setForm((f) => ({ ...f, seoSettings: { ...f.seoSettings, competitors: [...f.seoSettings.competitors || [], { name: "", website: "", type: "" }] } }));
  }
  function updateCompetitor(i, field, val) {
    setForm((f) => {
      const competitors = [...f.seoSettings.competitors || []];
      competitors[i] = { ...competitors[i], [field]: val };
      return { ...f, seoSettings: { ...f.seoSettings, competitors } };
    });
  }
  function removeCompetitor(i) {
    setForm((f) => ({ ...f, seoSettings: { ...f.seoSettings, competitors: (f.seoSettings.competitors || []).filter((_, idx) => idx !== i) } }));
  }
  const slotMap = {};
  (form.weeklySchedule || []).forEach((s) => {
    slotMap[`${s.day}_${s.contentType}`] = true;
  });
  return /* @__PURE__ */ React.createElement("div", { style: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.6)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  } }, /* @__PURE__ */ React.createElement("div", { style: {
    background: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 680,
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 24px 64px rgba(0,0,0,0.22)"
  } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 22px 14px", borderBottom: "1.5px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 17, color: "#1E293B" } }, editMode ? "Edit Brand" : "Add New Brand"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", fontSize: 19, cursor: "pointer", color: "#94A3B8" } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-x-lg" }))), /* @__PURE__ */ React.createElement("div", { style: { overflowY: "auto", flex: 1, padding: "18px 22px" } }, /* @__PURE__ */ React.createElement(MSect, { title: "Basic Info" }, /* @__PURE__ */ React.createElement("div", { className: "row g-3" }, /* @__PURE__ */ React.createElement("div", { className: "col-8" }, /* @__PURE__ */ React.createElement(MLabel, null, "Brand Name *"), /* @__PURE__ */ React.createElement("input", { value: form.name, onChange: (e) => setField("name", e.target.value), placeholder: "e.g. Coca-Cola", style: iSt })), /* @__PURE__ */ React.createElement("div", { className: "col-4" }, /* @__PURE__ */ React.createElement(MLabel, null, "Brand Color"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 } }, PRESET_COLORS.map((c) => /* @__PURE__ */ React.createElement("div", { key: c, onClick: () => setField("color", c), style: {
    width: 20,
    height: 20,
    borderRadius: 5,
    background: c,
    cursor: "pointer",
    outline: form.color === c ? "2.5px solid #1E293B" : "2px solid transparent",
    outlineOffset: 2
  } })))), /* @__PURE__ */ React.createElement("div", { className: "col-6" }, /* @__PURE__ */ React.createElement(MLabel, null, "Contact Email"), /* @__PURE__ */ React.createElement("input", { value: form.contactEmail, onChange: (e) => setField("contactEmail", e.target.value), placeholder: "brand@client.com", type: "email", style: iSt })), /* @__PURE__ */ React.createElement("div", { className: "col-6" }, /* @__PURE__ */ React.createElement(MLabel, null, "Logo URL ", /* @__PURE__ */ React.createElement("small", { style: { color: "#94A3B8", fontWeight: 400 } }, "(optional)")), /* @__PURE__ */ React.createElement("input", { value: form.logo, onChange: (e) => setField("logo", e.target.value), placeholder: "https://\u2026", style: iSt })), /* @__PURE__ */ React.createElement("div", { className: "col-12" }, /* @__PURE__ */ React.createElement(MLabel, null, "Notes"), /* @__PURE__ */ React.createElement("textarea", { value: form.notes, onChange: (e) => setField("notes", e.target.value), rows: 2, placeholder: "General notes\u2026", style: { ...iSt, resize: "vertical" } })))), /* @__PURE__ */ React.createElement(MSect, { title: "Services" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 7, flexWrap: "wrap" } }, SERVICES.map((s) => {
    const on = form.services.includes(s.key);
    return /* @__PURE__ */ React.createElement("button", { key: s.key, type: "button", onClick: () => toggleService(s.key), style: {
      border: `2px solid ${on ? s.color : "#E5E7EB"}`,
      background: on ? s.color + "15" : "#F8FAFC",
      color: on ? s.color : "#64748B",
      borderRadius: 10,
      padding: "7px 13px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 6
    } }, /* @__PURE__ */ React.createElement("i", { className: `bi ${s.icon}` }), s.label, on && /* @__PURE__ */ React.createElement("i", { className: "bi bi-check-circle-fill", style: { fontSize: 11 } }));
  }))), form.services.includes("socialMedia") && /* @__PURE__ */ React.createElement(MSect, { title: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("i", { className: "bi bi-instagram me-2", style: { color: "#E1306C" } }), "Social Media") }, /* @__PURE__ */ React.createElement(MLabel, null, "Monthly Deliverables"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16, marginTop: 6 } }, [["Reels", "reels", "#E1306C"], ["Posts", "posts", "#3B82F6"], ["Carousels", "carousels", "#F59E0B"], ["Stories", "stories", "#10B981"]].map(([lbl, k, c]) => /* @__PURE__ */ React.createElement("div", { key: k }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: c, marginBottom: 3 } }, lbl), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: 0,
      value: form.monthlyDeliverables[k],
      onChange: (e) => setForm((f) => ({ ...f, monthlyDeliverables: { ...f.monthlyDeliverables, [k]: Number(e.target.value) } })),
      style: { ...iSt, fontWeight: 700, color: c, textAlign: "center" }
    }
  )))), /* @__PURE__ */ React.createElement(MLabel, null, "Weekly Posting Schedule"), /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto", marginTop: 8, border: "1.5px solid #E5E7EB", borderRadius: 10 } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#F8FAFC" } }, /* @__PURE__ */ React.createElement("th", { style: { padding: "7px 10px", textAlign: "left", color: "#64748B", fontWeight: 700, borderBottom: "1.5px solid #E5E7EB" } }, "Content"), DAYS.map((d) => /* @__PURE__ */ React.createElement("th", { key: d, style: { padding: "7px 8px", textAlign: "center", color: "#64748B", fontWeight: 700, borderBottom: "1.5px solid #E5E7EB" } }, d)))), /* @__PURE__ */ React.createElement("tbody", null, CTYPES.map((ct, ri) => {
    const m = CTYPE_META[ct];
    return /* @__PURE__ */ React.createElement("tr", { key: ct, style: { borderBottom: ri < CTYPES.length - 1 ? "1px solid #F1F5F9" : "none" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontWeight: 700, color: m.color } }, /* @__PURE__ */ React.createElement("span", { style: { background: m.color + "15", borderRadius: 5, padding: "2px 7px" } }, m.label)), DAYS.map((d) => {
      const checked = slotMap[`${d}_${ct}`];
      return /* @__PURE__ */ React.createElement("td", { key: d, style: { padding: "6px 8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { onClick: () => toggleWeeklySlot(d, ct), style: {
        width: 22,
        height: 22,
        borderRadius: 7,
        cursor: "pointer",
        background: checked ? m.color : "#F1F5F9",
        border: `2px solid ${checked ? m.color : "#E5E7EB"}`,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all .12s"
      } }, checked && /* @__PURE__ */ React.createElement("i", { className: "bi bi-check2", style: { color: "#fff", fontSize: 12 } })));
    }));
  }))))), form.services.includes("website") && /* @__PURE__ */ React.createElement(MSect, { title: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("i", { className: "bi bi-globe2 me-2", style: { color: "#3B82F6" } }), "Website") }, /* @__PURE__ */ React.createElement("div", { className: "row g-3" }, /* @__PURE__ */ React.createElement("div", { className: "col-12" }, /* @__PURE__ */ React.createElement(MLabel, null, "Website URL"), /* @__PURE__ */ React.createElement("input", { value: form.websiteSettings.url, onChange: (e) => setField("websiteSettings.url", e.target.value), placeholder: "https://example.com", style: iSt })), /* @__PURE__ */ React.createElement("div", { className: "col-6" }, /* @__PURE__ */ React.createElement(MLabel, null, "CMS"), /* @__PURE__ */ React.createElement("select", { value: form.websiteSettings.cms, onChange: (e) => setField("websiteSettings.cms", e.target.value), style: iSt }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select CMS\u2026"), ["WordPress", "Webflow", "Shopify", "Wix", "Squarespace", "Custom", "Other"].map((c) => /* @__PURE__ */ React.createElement("option", { key: c }, c)))), /* @__PURE__ */ React.createElement("div", { className: "col-6" }, /* @__PURE__ */ React.createElement(MLabel, null, "Hosting"), /* @__PURE__ */ React.createElement("input", { value: form.websiteSettings.hosting, onChange: (e) => setField("websiteSettings.hosting", e.target.value), placeholder: "e.g. AWS, GoDaddy", style: iSt })), /* @__PURE__ */ React.createElement("div", { className: "col-12" }, /* @__PURE__ */ React.createElement(MLabel, null, "Notes"), /* @__PURE__ */ React.createElement("textarea", { value: form.websiteSettings.notes, onChange: (e) => setField("websiteSettings.notes", e.target.value), rows: 2, style: { ...iSt, resize: "vertical" } })))), form.services.includes("seo") && /* @__PURE__ */ React.createElement(MSect, { title: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("i", { className: "bi bi-search me-2", style: { color: "#10B981" } }), "SEO") }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20, background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-graph-up-arrow", style: { color: "#16A34A", fontSize: 15 } }), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700, fontSize: 13, color: "#15803D" } }, "Google Search Console")), /* @__PURE__ */ React.createElement(MLabel, null, "GSC Site URL"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: form.gsc?.siteUrl || "",
      onChange: (e) => setForm((f) => ({ ...f, gsc: { ...f.gsc, siteUrl: e.target.value.trim() } })),
      placeholder: "https://yourdomain.com/ or sc-domain:yourdomain.com",
      style: iSt
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#059669", marginTop: 5, lineHeight: 1.5 } }, "Enter the exact property URL as shown in Google Search Console. Add your service account email as a Full user in GSC to enable data access.")), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 18 } }, /* @__PURE__ */ React.createElement(MLabel, null, "No. of Blogs \u2014 Target per Month"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: 0,
      value: form.seoSettings.blogCount,
      onChange: (e) => setField("seoSettings.blogCount", Number(e.target.value)),
      placeholder: "0",
      style: { ...iSt, maxWidth: 140 }
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 18 } }, /* @__PURE__ */ React.createElement(MLabel, null, "Weekly Blog Schedule ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 400, color: "#94A3B8", textTransform: "none", fontSize: 10 } }, "\u2014 which days to publish")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6 } }, DAYS.map((day) => {
    const active = (form.seoSettings.blogSchedule || []).includes(day);
    return /* @__PURE__ */ React.createElement("div", { key: day, onClick: () => toggleBlogDay(day), style: {
      width: 44,
      height: 44,
      borderRadius: 10,
      cursor: "pointer",
      background: active ? "#10B981" : "#F8FAFC",
      border: `2px solid ${active ? "#10B981" : "#E5E7EB"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 800,
      color: active ? "#fff" : "#94A3B8",
      transition: "all .12s",
      userSelect: "none"
    } }, day);
  })), (form.seoSettings.blogSchedule || []).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 6 } }, (form.seoSettings.blogSchedule || []).length, " day", (form.seoSettings.blogSchedule || []).length !== 1 ? "s" : "", " selected \u2014 ", (form.seoSettings.blogSchedule || []).join(", "))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement(MLabel, { style: { marginBottom: 0 } }, "Competitors"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: addCompetitor, style: {
    background: "#ECFDF5",
    color: "#059669",
    border: "1.5px solid #6EE7B7",
    borderRadius: 7,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 5
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-plus-lg" }), " Add Competitor")), (form.seoSettings.competitors || []).length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#94A3B8", padding: "10px 0", textAlign: "center", border: "1.5px dashed #E5E7EB", borderRadius: 8 } }, "No competitors added yet"), (form.seoSettings.competitors || []).map((comp, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr auto", gap: 8, marginBottom: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: comp.name,
      onChange: (e) => updateCompetitor(i, "name", e.target.value),
      placeholder: "Competitor name",
      style: iSt
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: comp.website,
      onChange: (e) => updateCompetitor(i, "website", e.target.value),
      placeholder: "Website URL",
      style: iSt
    }
  ), /* @__PURE__ */ React.createElement("select", { value: comp.type, onChange: (e) => updateCompetitor(i, "type", e.target.value), style: iSt }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Type\u2026"), /* @__PURE__ */ React.createElement("option", { value: "direct" }, "Direct"), /* @__PURE__ */ React.createElement("option", { value: "indirect" }, "Indirect"), /* @__PURE__ */ React.createElement("option", { value: "aspirational" }, "Aspirational"), /* @__PURE__ */ React.createElement("option", { value: "local" }, "Local")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => removeCompetitor(i), style: {
    background: "#FEF2F2",
    color: "#DC2626",
    border: "1.5px solid #FECACA",
    borderRadius: 7,
    padding: "5px 9px",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1
  } }, /* @__PURE__ */ React.createElement("i", { className: "bi bi-trash3" })))))), form.services.includes("ads") && /* @__PURE__ */ React.createElement(MSect, { title: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("i", { className: "bi bi-megaphone me-2", style: { color: "#F59E0B" } }), "Ads") }, /* @__PURE__ */ React.createElement("div", { className: "row g-3" }, /* @__PURE__ */ React.createElement("div", { className: "col-12" }, /* @__PURE__ */ React.createElement(MLabel, null, "Platforms"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 7, flexWrap: "wrap", marginTop: 5 } }, AD_PLATFORMS.map((p) => {
    const on = (form.adsSettings.platforms || []).includes(p);
    return /* @__PURE__ */ React.createElement("label", { key: p, style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      background: on ? "#FEF3C7" : "#F8FAFC",
      border: `1.5px solid ${on ? "#FDE68A" : "#E5E7EB"}`,
      borderRadius: 8,
      padding: "5px 12px",
      color: on ? "#B45309" : "#64748B"
    } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: on, onChange: () => toggleAdPlatform(p), style: { accentColor: "#F59E0B", width: 13, height: 13 } }), p);
  }))), /* @__PURE__ */ React.createElement("div", { className: "col-12" }, /* @__PURE__ */ React.createElement(MLabel, null, "Notes"), /* @__PURE__ */ React.createElement("textarea", { value: form.adsSettings.notes, onChange: (e) => setField("adsSettings.notes", e.target.value), rows: 2, style: { ...iSt, resize: "vertical" } })))), form.services.includes("branding") && /* @__PURE__ */ React.createElement(MSect, { title: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("i", { className: "bi bi-palette me-2", style: { color: "#8B5CF6" } }), "Branding") }, /* @__PURE__ */ React.createElement(MLabel, null, "Select services included"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginTop: 6 } }, [
    { key: "logoDesign", label: "Logo Design", icon: "bi-brush", color: "#8B5CF6" },
    { key: "brandIdentityDesign", label: "Brand Identity Design", icon: "bi-layers", color: "#6366F1" },
    { key: "productPackaging", label: "Product Packaging", icon: "bi-box-seam", color: "#EC4899" }
  ].map((it) => {
    const on = form.brandingSettings[it.key];
    return /* @__PURE__ */ React.createElement("label", { key: it.key, style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      padding: "9px 12px",
      borderRadius: 10,
      border: `1.5px solid ${on ? it.color + "40" : "#E5E7EB"}`,
      background: on ? it.color + "0D" : "#F8FAFC"
    } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: on,
        onChange: (e) => setForm((f) => ({ ...f, brandingSettings: { ...f.brandingSettings, [it.key]: e.target.checked } })),
        style: { accentColor: it.color, width: 15, height: 15 }
      }
    ), /* @__PURE__ */ React.createElement("i", { className: `bi ${it.icon}`, style: { color: on ? it.color : "#94A3B8", fontSize: 15 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: on ? 700 : 500, color: on ? "#1E293B" : "#64748B" } }, it.label));
  })))), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 22px", borderTop: "1.5px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, disabled: saving, style: {
    background: "#F8FAFC",
    color: "#64748B",
    border: "1.5px solid #E5E7EB",
    borderRadius: 10,
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  } }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: onSave, disabled: saving, style: {
    background: "#6366F1",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 22px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    opacity: saving ? 0.7 : 1
  } }, saving ? "Saving\u2026" : editMode ? "Update Brand" : "Create Brand"))));
}
function MSect({ title, children }) {
  return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 9, display: "flex", alignItems: "center", paddingBottom: 6, borderBottom: "1px solid #F1F5F9" } }, title), children);
}
function MLabel({ children }) {
  return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" } }, children);
}
const iSt = {
  width: "100%",
  border: "1.5px solid #E5E7EB",
  borderRadius: 8,
  padding: "7px 10px",
  fontSize: 13,
  outline: "none",
  background: "#F8FAFC",
  color: "#1E293B"
};
