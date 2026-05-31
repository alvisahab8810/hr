import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const PLATFORM_META = {
  meta:     { label: "Meta",     color: "#1877F2", bg: "#EEF6FF", icon: "bi-facebook" },
  google:   { label: "Google",   color: "#EA4335", bg: "#FEF2F2", icon: "bi-google" },
  youtube:  { label: "YouTube",  color: "#FF0000", bg: "#FFF0F0", icon: "bi-youtube" },
  linkedin: { label: "LinkedIn", color: "#0A66C2", bg: "#EFF6FF", icon: "bi-linkedin" },
};

const STATUS_META = {
  planned:   { label: "Planned",   color: "#6366F1", bg: "#EEF2FF" },
  active:    { label: "Active",    color: "#16A34A", bg: "#DCFCE7" },
  paused:    { label: "Paused",    color: "#F59E0B", bg: "#FFFBEB" },
  completed: { label: "Completed", color: "#64748B", bg: "#F8FAFC" },
};

const TABS = [
  { key: "all",      label: "All Campaigns",   icon: "bi-grid" },
  { key: "meta",     label: "Meta Ads",         icon: "bi-facebook" },
  { key: "google",   label: "Google Ads",       icon: "bi-google" },
  { key: "monthly",  label: "Monthly Planning", icon: "bi-calendar3" },
  { key: "accounts", label: "Ad Accounts",      icon: "bi-plug" },
];

const STAGE_LABELS = ["Campaign", "Ad Set", "Ads", "Live", "Optimize"];

function fmtINR(n) {
  if (!n) return "₹0";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
  if (n >= 1000)   return "₹" + (n / 1000).toFixed(0) + "K";
  return "₹" + n;
}
function fmtNum(n) {
  if (!n) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(n);
}

const EMPTY_FORM = {
  name: "", brandId: "", platform: "meta", budget: "", agenda: "",
  stages: [
    { key: "creative", label: "Creative production", owner: "", deadline: "" },
    { key: "setup",    label: "Setup & targeting",   owner: "", deadline: "" },
    { key: "budget",   label: "Budget approval",     owner: "", deadline: "" },
    { key: "live",     label: "Live monitoring",      owner: "", deadline: "" },
    { key: "optimize", label: "Optimization",         owner: "", deadline: "" },
  ],
};

export default function AdCampaignsPage() {
  const [tab,          setTab]          = useState("all");
  const [campaigns,    setCampaigns]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [brands,       setBrands]       = useState([]);
  const [allBrands,    setAllBrands]    = useState([]);  // for Ad Accounts tab
  const [employees,    setEmployees]    = useState([]);
  const [showModal,    setShowModal]    = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [editCamp,     setEditCamp]     = useState(null);
  const [syncing,      setSyncing]      = useState({});  // { brandId_meta: bool, brandId_google: bool }
  const [alert,        setAlert]        = useState(null);
  const [brandFilter,  setBrandFilter]  = useState("");
  // Ad account selection modals
  const [metaSelect,   setMetaSelect]   = useState(null); // { brandId, brandName, accounts[] }
  const [googleSelect, setGoogleSelect] = useState(null); // { brandId, brandName, customers[] }
  const [selectedAcct, setSelectedAcct] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/campaigns");
      const d = await r.json();
      if (d.success) setCampaigns(d.campaigns || []);
    } finally { setLoading(false); }
  }, []);

  const loadAllBrands = useCallback(async () => {
    const r = await fetch("/api/admin/brands");
    const d = await r.json();
    if (d.success) setAllBrands(d.brands || []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "accounts") loadAllBrands(); }, [tab, loadAllBrands]);

  // Handle OAuth callback params from Meta/Google redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const adConnected = params.get("adConnected");
    const adError     = params.get("adError");
    const adSelectFor = params.get("adSelectFor");
    const adSource    = params.get("adSource");

    if (adConnected) {
      setAlert({ type: "success", msg: `Ad account connected successfully! Syncing campaigns…` });
      window.history.replaceState({}, "", window.location.pathname);
      load(); loadAllBrands();
    } else if (adError) {
      setAlert({ type: "error", msg: decodeURIComponent(adError) });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (adSelectFor && adSource === "meta") {
      window.history.replaceState({}, "", window.location.pathname);
      fetch(`/api/admin/brands/${adSelectFor}/meta-ads/accounts`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.accounts?.length) {
            setMetaSelect({ brandId: adSelectFor, brandName: d.brandName, accounts: d.accounts });
            // Auto-select the account whose name best matches the brand name
            const lower = (d.brandName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const match = d.accounts.find(a => {
              const n = (a.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const b = (a.business || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              return n.includes(lower) || lower.includes(n) || b.includes(lower) || lower.includes(b);
            });
            setSelectedAcct((match || d.accounts.find(a => a.status === "active") || d.accounts[0]).id);
          } else {
            setAlert({ type: "error", msg: "Could not load Meta ad accounts." });
          }
        });
    } else if (adSelectFor && adSource === "google") {
      window.history.replaceState({}, "", window.location.pathname);
      fetch(`/api/admin/brands/${adSelectFor}/google-ads/accounts`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.customers?.length) {
            setGoogleSelect({ brandId: adSelectFor, brandName: d.brandName, customers: d.customers });
            setSelectedAcct(d.customers[0].id);
          } else {
            setAlert({ type: "error", msg: "Could not load Google Ads customers." });
          }
        });
    }
  }, []);

  const connectMeta = async (brandId) => {
    const r = await fetch(`/api/admin/brands/${brandId}/meta-ads/connect`);
    const d = await r.json();
    if (d.success) window.location.href = d.oauthUrl;
    else setAlert({ type: "error", msg: d.message });
  };

  const connectGoogle = async (brandId) => {
    const r = await fetch(`/api/admin/brands/${brandId}/google-ads/connect`);
    const d = await r.json();
    if (d.success) window.location.href = d.oauthUrl;
    else setAlert({ type: "error", msg: d.message });
  };

  const syncAds = async (brandId, source) => {
    const key = `${brandId}_${source}`;
    setSyncing(p => ({ ...p, [key]: true }));
    try {
      const r = await fetch(`/api/admin/brands/${brandId}/${source}-ads/sync`, { method: "POST" });
      const d = await r.json();
      setAlert({ type: d.success ? "success" : "error", msg: d.message });
      if (d.success) { load(); loadAllBrands(); }
    } finally { setSyncing(p => ({ ...p, [key]: false })); }
  };

  const disconnectAds = async (brandId, source) => {
    if (!confirm(`Disconnect ${source === "meta" ? "Meta" : "Google"} Ads from this brand?`)) return;
    await fetch(`/api/admin/brands/${brandId}/${source}-ads/disconnect`, { method: "DELETE" });
    loadAllBrands();
  };

  const finalizeMetaSelect = async () => {
    if (!metaSelect || !selectedAcct) return;
    const r = await fetch(`/api/admin/brands/${metaSelect.brandId}/meta-ads/finalize`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: selectedAcct }),
    });
    const d = await r.json();
    if (d.success) {
      setAlert({ type: "success", msg: `${d.accountName} connected! Syncing campaigns…` });
      setMetaSelect(null); load(); loadAllBrands();
    } else setAlert({ type: "error", msg: d.message });
  };

  const finalizeGoogleSelect = async () => {
    if (!googleSelect || !selectedAcct) return;
    const r = await fetch(`/api/admin/brands/${googleSelect.brandId}/google-ads/finalize`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: selectedAcct }),
    });
    const d = await r.json();
    if (d.success) {
      setAlert({ type: "success", msg: `${d.customerName} connected! Syncing campaigns…` });
      setGoogleSelect(null); load(); loadAllBrands();
    } else setAlert({ type: "error", msg: d.message });
  };

  useEffect(() => {
    if (!showModal) return;
    fetch("/api/admin/brands").then(r => r.json()).then(d => setBrands(d.brands || []));
    fetch("/api/admin/assets/employees").then(r => r.json()).then(d => setEmployees(d.employees || []));
  }, [showModal]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditCamp(null); setShowModal(true); };
  const openEdit   = (c) => {
    setForm({
      name: c.name, brandId: c.brandId?._id || c.brandId || "", platform: c.platform,
      budget: c.budget || "", agenda: c.agenda || "",
      stages: c.stages?.length
        ? c.stages.map(s => ({ ...s, deadline: s.deadline ? s.deadline.slice(0, 10) : "" }))
        : EMPTY_FORM.stages,
    });
    setEditCamp(c);
    setShowModal(true);
  };

  const setStage = (i, field, val) =>
    setForm(f => ({ ...f, stages: f.stages.map((s, j) => j === i ? { ...s, [field]: val } : s) }));

  const submit = async () => {
    if (!form.name.trim()) return alert("Campaign name required");
    if (!form.brandId)     return alert("Please select a brand");
    setSaving(true);
    try {
      const body = {
        ...form, budget: Number(form.budget) || 0,
        stages: form.stages.map(s => ({ ...s, deadline: s.deadline || null })),
      };
      const url    = editCamp ? `/api/admin/campaigns/${editCamp._id}` : "/api/admin/campaigns";
      const method = editCamp ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { setShowModal(false); load(); }
      else alert(d.message || "Error saving campaign");
    } finally { setSaving(false); }
  };

  const deleteCampaign = async (id) => {
    if (!confirm("Delete this campaign?")) return;
    await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
    load();
  };

  const toggleStage = async (campId, stageIdx) => {
    // Optimistically update UI first
    setCampaigns(prev => prev.map(c => {
      if (c._id !== campId) return c;
      const stages = (c.stages || []).map((s, i) =>
        i === stageIdx ? { ...s, completed: !s.completed } : s
      );
      return { ...c, stages };
    }));
    // Persist to DB
    const camp = campaigns.find(c => c._id === campId);
    if (!camp) return;
    const stages = (camp.stages || []).map((s, i) =>
      i === stageIdx ? { ...s, completed: !s.completed } : s
    );
    await fetch(`/api/admin/campaigns/${campId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages }),
    });
  };

  const updateStatus = async (id, status) => {
    await fetch(`/api/admin/campaigns/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const displayed = campaigns.filter(c => {
    if (tab === "meta")   { if (c.platform !== "meta")   return false; }
    if (tab === "google") { if (c.platform !== "google") return false; }
    if (brandFilter) {
      const bId = c.brandId?._id || c.brandId;
      if (String(bId) !== String(brandFilter)) return false;
    }
    return true;
  });

  const statBase    = brandFilter ? campaigns.filter(c => String(c.brandId?._id || c.brandId) === String(brandFilter)) : campaigns;
  const active      = statBase.filter(c => c.status === "active");
  const totalBudget = statBase.reduce((s, c) => s + (c.budget || 0), 0);
  const totalSpent  = statBase.reduce((s, c) => s + (c.performance?.spent || 0), 0);
  const totalConv   = statBase.reduce((s, c) => s + (c.performance?.conversions || 0), 0);
  const roasVals    = statBase.filter(c => c.performance?.roas).map(c => c.performance.roas);
  const avgRoas     = roasVals.length ? (roasVals.reduce((a, b) => a + b, 0) / roasVals.length).toFixed(2) : "—";

  const brandMap = {};
  for (const c of campaigns) {
    const b = c.brandId;
    if (!b) continue;
    const key = b._id || b;
    if (!brandMap[key]) brandMap[key] = { name: b.name || "—", color: b.color || "#6366F1", slug: b.slug, activeCampaigns: [], totalSpent: 0, totalConv: 0, roasVals: [] };
    if (c.status === "active") brandMap[key].activeCampaigns.push(c.name);
    brandMap[key].totalSpent += c.performance?.spent || 0;
    brandMap[key].totalConv  += c.performance?.conversions || 0;
    if (c.performance?.roas) brandMap[key].roasVals.push(c.performance.roas);
  }

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Ad Campaigns — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .ad-tab{padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .14s;}
          .ad-tab.active{background:#4F46E5;color:#fff;border-color:#4F46E5;}
          .ad-tab:not(.active):hover{border-color:#A5B4FC;color:#4F46E5;}
          .ad-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
          .ad-card{background:#fff;border-radius:14px;border:1.5px solid #F1F5F9;padding:20px;margin-bottom:14px;transition:box-shadow .14s;}
          .ad-card:hover{box-shadow:0 4px 20px rgba(99,102,241,.08);}
          .ad-table{width:100%;border-collapse:collapse;}
          .ad-table th{padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#94A3B8;border-bottom:2px solid #F1F5F9;background:#FAFAFA;text-align:left;}
          .ad-table td{padding:12px 14px;border-bottom:1px solid #F8FAFC;font-size:13px;vertical-align:middle;}
          .ad-table tr:hover td{background:#FAFBFF;}
          .ad-stat{border-radius:14px;padding:16px 20px;border:1.5px solid;display:flex;align-items:center;gap:12px;}
          .coming-block{display:flex;flex-direction:column;align-items:center;padding:80px 40px;text-align:center;color:#94A3B8;}
          .camp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;}
          .stage-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;background:#F1F5F9;color:#64748B;border:1.5px solid #E5E7EB;}
          .stage-chip.done{background:#DCFCE7;color:#15803D;border-color:#86EFAC;}
          .ad-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
          .ad-modal{background:#fff;border-radius:16px;width:100%;max-width:560px;box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;max-height:90vh;display:flex;flex-direction:column;}
          .ad-modal-head{padding:20px 24px 16px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
          .ad-modal-body{padding:20px 24px;overflow-y:auto;}
          .ad-modal-foot{padding:14px 24px;border-top:1px solid #F1F5F9;display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;}
          .ad-field{margin-bottom:14px;}
          .ad-field label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;}
          .ad-input{width:100%;padding:9px 12px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;color:#0f172a;outline:none;font-family:inherit;background:#fff;}
          .ad-input:focus{border-color:#4F46E5;}
          .ad-select{width:100%;padding:9px 12px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;color:#0f172a;outline:none;font-family:inherit;background:#fff;cursor:pointer;}
          .ad-select:focus{border-color:#4F46E5;}
          .ad-textarea{width:100%;padding:9px 12px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;color:#0f172a;outline:none;font-family:inherit;resize:vertical;min-height:72px;background:#fff;}
          .ad-textarea:focus{border-color:#4F46E5;}
          .ad-textarea{width:100%;padding:9px 12px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;color:#0f172a;outline:none;font-family:inherit;resize:vertical;min-height:72px;background:#fff;}
          .ad-textarea:focus{border-color:#4F46E5;}
          .stage-row-form{display:grid;grid-template-columns:24px 1fr 1fr 1fr;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F8FAFC;}
          .stage-row-form:last-child{border-bottom:none;}
          .acct-row{display:grid;grid-template-columns:180px 1fr 1fr 1fr;gap:12px;align-items:center;padding:14px 16px;border-bottom:1px solid #F8FAFC;}
          .acct-row:last-child{border-bottom:none;}
          .acct-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
          .acct-select-opt{display:flex;align-items:center;gap:12px;padding:12px 14px;border:2px solid #E2E8F0;border-radius:10px;cursor:pointer;margin-bottom:8px;transition:border-color .12s,background .12s;}
          .acct-select-opt:hover{border-color:#4F46E5;background:#F0F0FF;}
          .acct-select-opt.selected{border-color:#4F46E5;background:#EEF2FF;}
          .alert-box{padding:12px 16px;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:10px;margin-bottom:16px;}
          .alert-success{background:#DCFCE7;border:1px solid #86EFAC;color:#15803D;}
          .alert-error{background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;}
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
                <li className="breadcrumb-item active">Ad Campaigns</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              {/* Alert banner */}
              {alert && (
                <div className={`alert-box alert-${alert.type}`}>
                  <i className={`bi ${alert.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`} style={{ flexShrink: 0 }} />
                  {alert.msg}
                  <button onClick={() => setAlert(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", opacity: .6, fontSize: 16 }}>×</button>
                </div>
              )}

              {/* Header */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">Ad Campaigns</h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Track Meta &amp; Google ad campaigns, ROAS, and performance</p>
                </div>
                <button onClick={openCreate} style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                  <i className="bi bi-plus-circle" /> New Campaign
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
                {[
                  { label: "Active Campaigns", value: active.length,  icon: "bi-broadcast",    color: "#10B981", bg: "#ECFDF5", border: "#BBF7D0" },
                  { label: "Total Budget",      value: fmtINR(totalBudget), icon: "bi-cash-stack",   color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
                  { label: "Total Spent",       value: fmtINR(totalSpent),  icon: "bi-credit-card",  color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
                  { label: "Avg. ROAS",         value: avgRoas === "—" ? "—" : avgRoas + "x", icon: "bi-graph-up-arrow", color: "#7C3AED", bg: "#F3E8FF", border: "#D8B4FE" },
                  { label: "Conversions",       value: totalConv || "—", icon: "bi-arrow-repeat",  color: "#0EA5E9", bg: "#F0F9FF", border: "#BAE6FD" },
                ].map(s => (
                  <div key={s.label} className="ad-stat" style={{ flex: 1, minWidth: 130, background: s.bg, borderColor: s.border }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 15 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabs + Brand filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {TABS.map(t => (
                  <button key={t.key} className={`ad-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                    <i className={`bi ${t.icon}`} /> {t.label}
                  </button>
                ))}
                {tab !== "accounts" && tab !== "monthly" && (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      value={brandFilter}
                      onChange={e => setBrandFilter(e.target.value)}
                      style={{ padding: "7px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: brandFilter ? "#4F46E5" : "#64748B", background: brandFilter ? "#EEF2FF" : "#fff", cursor: "pointer", fontFamily: "inherit", outline: "none" }}
                    >
                      <option value="">All Brands</option>
                      {[...new Map(campaigns.filter(c => c.brandId).map(c => [c.brandId?._id || c.brandId, c.brandId])).values()].map(b => (
                        <option key={b._id || b} value={b._id || b}>{b.name || b}</option>
                      ))}
                    </select>
                    {brandFilter && (
                      <button onClick={() => setBrandFilter("")} style={{ padding: "6px 10px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 12, background: "#fff", cursor: "pointer", color: "#64748B", fontFamily: "inherit" }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Campaign cards */}
              {tab !== "monthly" && (
                loading ? (
                  <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}>Loading campaigns…</div>
                ) : displayed.length === 0 ? (
                  <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", padding: "60px 40px", textAlign: "center", color: "#94A3B8" }}>
                    <i className="bi bi-megaphone" style={{ fontSize: 44, display: "block", marginBottom: 12 }} />
                    <div style={{ fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>No campaigns yet</div>
                    <div style={{ fontSize: 13 }}>Click "+ New Campaign" to create your first campaign</div>
                  </div>
                ) : (
                  <>
                    <div className="camp-grid">
                      {displayed.map(c => {
                        const pm = PLATFORM_META[c.platform] || PLATFORM_META.meta;
                        const sm = STATUS_META[c.status]   || STATUS_META.planned;
                        const brand = c.brandId || {};
                        const perf  = c.performance || {};
                        const spentPct = c.budget ? Math.min(100, Math.round((perf.spent / c.budget) * 100)) : 0;
                        const cpr = perf.conversions > 0 ? Math.round((perf.spent || 0) / perf.conversions) : null;
                        return (
                          <div key={c._id} className="ad-card">
                            {/* Header */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: brand.color || "#6366F1", flexShrink: 0 }} />
                              <span style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                              <span className="ad-badge" style={{ background: pm.bg, color: pm.color }}>
                                <i className={`bi ${pm.icon}`} style={{ fontSize: 10 }} /> {pm.label}
                              </span>
                              <span className="ad-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                            </div>

                            {/* Brand name */}
                            <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 10 }}>{brand.name || "—"}</div>

                            {/* Stage chips — click to toggle done */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                              {(c.stages || []).map((s, i) => (
                                <span
                                  key={i}
                                  onClick={() => toggleStage(c._id, i)}
                                  title={s.completed ? "Click to mark incomplete" : "Click to mark done"}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: 4,
                                    padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                                    cursor: "pointer", userSelect: "none", transition: "all .12s",
                                    background: s.completed ? "#DCFCE7" : "#F1F5F9",
                                    color: s.completed ? "#15803D" : "#64748B",
                                    border: `1.5px solid ${s.completed ? "#86EFAC" : "#E5E7EB"}`,
                                  }}
                                >
                                  {s.completed
                                    ? <i className="bi bi-check-circle-fill" style={{ fontSize: 9 }} />
                                    : <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid #CBD5E1", display: "inline-block" }} />
                                  }
                                  {i + 1} {STAGE_LABELS[i] || s.label}
                                </span>
                              ))}
                            </div>

                            {/* Budget bar */}
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                                <span style={{ fontWeight: 700, color: "#374151" }}>Budget</span>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>{fmtINR(perf.spent || 0)} / {fmtINR(c.budget || 0)}</span>
                              </div>
                              <div style={{ height: 4, background: "#F1F5F9", borderRadius: 10 }}>
                                <div style={{ height: "100%", borderRadius: 10, width: `${spentPct}%`, background: spentPct > 85 ? "#EF4444" : "#6366F1", transition: "width .4s" }} />
                              </div>
                            </div>

                            {/* Metrics grid: Result | Reach | CPR | Amount Spent */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
                              {[
                                { label: "Result",  value: perf.conversions > 0 ? perf.conversions : "—",       color: "#10B981" },
                                { label: "Reach",   value: fmtNum(perf.reach),                                   color: "#8B5CF6" },
                                { label: "CPR",     value: cpr ? fmtINR(cpr) : "—",                             color: "#F59E0B" },
                                { label: "Spent",   value: perf.spent > 0 ? fmtINR(perf.spent) : "₹0",          color: "#F97316" },
                              ].map(m => (
                                <div key={m.label} style={{ background: "#F8FAFC", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: m.color }}>{m.value}</div>
                                  <div style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .3, marginTop: 2 }}>{m.label}</div>
                                </div>
                              ))}
                            </div>

                            {/* Agenda */}
                            {c.agenda && (
                              <div style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic", marginBottom: 12, borderTop: "1px solid #F8FAFC", paddingTop: 10 }}>
                                {c.agenda}
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button onClick={() => openEdit(c)} style={{ padding: "5px 12px", background: "#EEF2FF", color: "#4F46E5", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                <i className="bi bi-pencil" style={{ marginRight: 4 }} />Edit
                              </button>
                              <select
                                value={c.status}
                                onChange={e => updateStatus(c._id, e.target.value)}
                                style={{ padding: "5px 8px", border: "1.5px solid #E2E8F0", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#374151", background: "#fff" }}
                              >
                                {Object.entries(STATUS_META).map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                              <button onClick={() => deleteCampaign(c._id)} style={{ padding: "5px 10px", background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginLeft: "auto" }}>
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Campaign Tracker by brand */}
                    {Object.keys(brandMap).length > 0 && (
                      <div style={{ marginTop: 32, background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1.5px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8 }}>
                          <i className="bi bi-table" style={{ color: "#6366F1" }} />
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#1E293B" }}>Campaign Tracker</span>
                          <span style={{ fontSize: 12, color: "#94A3B8" }}>— which campaign is running for which brand</span>
                        </div>
                        <table className="ad-table">
                          <thead>
                            <tr>
                              <th>Brand</th>
                              <th>Active Campaigns</th>
                              <th>Total Spent</th>
                              <th>Conversions</th>
                              <th>Avg ROAS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(brandMap)
                              .filter(([key]) => !brandFilter || String(key) === String(brandFilter))
                              .map(([key, b]) => {
                              const br = b.roasVals.length ? (b.roasVals.reduce((a, x) => a + x, 0) / b.roasVals.length).toFixed(2) + "x" : "—";
                              return (
                                <tr key={key}>
                                  <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.color }} />
                                      <span style={{ fontWeight: 700, color: "#1E293B" }}>{b.name}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {b.activeCampaigns.length ? b.activeCampaigns.map((n, i) => (
                                        <span key={i} className="ad-badge" style={{ background: "#DCFCE7", color: "#15803D" }}>{n}</span>
                                      )) : <span style={{ color: "#94A3B8", fontSize: 12 }}>None active</span>}
                                    </div>
                                  </td>
                                  <td style={{ fontWeight: 600, color: "#374151" }}>{fmtINR(b.totalSpent)}</td>
                                  <td>{b.totalConv || "—"}</td>
                                  <td style={{ fontWeight: 700, color: "#7C3AED" }}>{br}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )
              )}

              {/* Monthly Planning placeholder */}
              {tab === "monthly" && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9" }}>
                  <div className="coming-block">
                    <i className="bi bi-calendar3" style={{ fontSize: 52, marginBottom: 16 }} />
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1E293B", marginBottom: 8 }}>Monthly Planning</div>
                    <div style={{ fontSize: 14, color: "#94A3B8", maxWidth: 360 }}>Campaign schedule and budget allocation calendar coming soon.</div>
                    <div style={{ marginTop: 20, padding: "10px 20px", borderRadius: 10, background: "#EEF2FF", color: "#6366F1", fontWeight: 700, fontSize: 13 }}>
                      <i className="bi bi-tools me-2" /> Coming Soon
                    </div>
                  </div>
                </div>
              )}

              {/* ── Ad Accounts tab ── */}
              {tab === "accounts" && (
                <div>
                  {/* Setup info */}
                  <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#3730A3" }}>
                    <i className="bi bi-info-circle-fill" style={{ marginRight: 8 }} />
                    <strong>How to connect:</strong> Click "Connect Meta" or "Connect Google" for each brand → log in → grant permissions → campaigns sync automatically.
                    For Google Ads, set <code>GOOGLE_ADS_DEVELOPER_TOKEN</code> in your .env first.
                  </div>

                  {/* .env variables needed */}
                  <div style={{ background: "#1E293B", borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontFamily: "monospace", fontSize: 12, color: "#94A3B8", lineHeight: 1.9 }}>
                    <div style={{ color: "#64748B", marginBottom: 6, fontSize: 11, fontFamily: "inherit" }}>Required .env variables:</div>
                    <div><span style={{ color: "#86EFAC" }}>FACEBOOK_APP_ID</span>=your_app_id <span style={{ color: "#64748B" }}># already set (from Instagram)</span></div>
                    <div><span style={{ color: "#86EFAC" }}>FACEBOOK_APP_SECRET</span>=your_app_secret <span style={{ color: "#64748B" }}># already set</span></div>
                    <div><span style={{ color: "#FCD34D" }}>GOOGLE_ADS_CLIENT_ID</span>=your_google_oauth_client_id</div>
                    <div><span style={{ color: "#FCD34D" }}>GOOGLE_ADS_CLIENT_SECRET</span>=your_google_oauth_client_secret</div>
                    <div><span style={{ color: "#FCD34D" }}>GOOGLE_ADS_DEVELOPER_TOKEN</span>=your_developer_token <span style={{ color: "#64748B" }}># apply at ads.google.com → Tools → API Center</span></div>
                    <div style={{ marginTop: 8, color: "#64748B" }}>Also add to Google OAuth Redirect URIs: <span style={{ color: "#A5B4FC" }}>{typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/admin/brands/google-ads/callback</span></div>
                  </div>

                  {/* Brand table */}
                  <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1.5px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8 }}>
                      <i className="bi bi-plug" style={{ color: "#6366F1" }} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Brand Ad Account Connections</span>
                      <button onClick={loadAllBrands} style={{ marginLeft: "auto", padding: "5px 12px", border: "1.5px solid #E2E8F0", borderRadius: 7, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        <i className="bi bi-arrow-clockwise" style={{ marginRight: 4 }} />Refresh
                      </button>
                    </div>

                    {/* Header row */}
                    <div className="acct-row" style={{ background: "#FAFAFA", borderBottom: "2px solid #F1F5F9" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5 }}>Brand</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5 }}>Meta Ads</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5 }}>Google Ads</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5 }}>Last Sync</span>
                    </div>

                    {allBrands.length === 0 ? (
                      <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>No brands found</div>
                    ) : allBrands.map(b => {
                      const meta   = b.metaAds   || {};
                      const google = b.googleAds  || {};
                      const metaKey   = `${b._id}_meta`;
                      const googleKey = `${b._id}_google`;
                      const lastSync  = meta.lastSync || google.lastSync;

                      return (
                        <div key={b._id} className="acct-row">
                          {/* Brand */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.color || "#6366F1", flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>{b.name}</span>
                          </div>

                          {/* Meta Ads */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {meta.connected ? (
                              <>
                                <span className="acct-pill" style={{ background: "#DCFCE7", color: "#15803D" }}>
                                  <i className="bi bi-facebook" style={{ fontSize: 10 }} /> {meta.adAccountName || meta.adAccountId}
                                </span>
                                <button onClick={() => syncAds(b._id, "meta")} disabled={syncing[metaKey]} style={{ padding: "3px 9px", background: "#EEF2FF", color: "#4F46E5", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                  {syncing[metaKey] ? "Syncing…" : "Sync"}
                                </button>
                                <button onClick={() => disconnectAds(b._id, "meta")} style={{ padding: "3px 9px", background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                  Disconnect
                                </button>
                              </>
                            ) : (
                              <button onClick={() => connectMeta(b._id)} style={{ padding: "5px 12px", background: "linear-gradient(135deg,#1877F2,#0f5fd4)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                <i className="bi bi-facebook" style={{ marginRight: 5 }} />Connect Meta
                              </button>
                            )}
                          </div>

                          {/* Google Ads */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {google.connected ? (
                              <>
                                <span className="acct-pill" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                                  <i className="bi bi-google" style={{ fontSize: 10 }} /> {google.customerName || google.customerId}
                                </span>
                                <button onClick={() => syncAds(b._id, "google")} disabled={syncing[googleKey]} style={{ padding: "3px 9px", background: "#FEF2F2", color: "#EA4335", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                  {syncing[googleKey] ? "Syncing…" : "Sync"}
                                </button>
                                <button onClick={() => disconnectAds(b._id, "google")} style={{ padding: "3px 9px", background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                  Disconnect
                                </button>
                              </>
                            ) : (
                              <button onClick={() => connectGoogle(b._id)} style={{ padding: "5px 12px", background: "linear-gradient(135deg,#EA4335,#C5221F)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                <i className="bi bi-google" style={{ marginRight: 5 }} />Connect Google
                              </button>
                            )}
                          </div>

                          {/* Last sync */}
                          <span style={{ fontSize: 12, color: "#94A3B8" }}>
                            {lastSync ? new Date(lastSync).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never synced"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* New / Edit Campaign Modal */}
      {showModal && (
        <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ad-modal">
            <div className="ad-modal-head">
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  {editCamp ? "Edit Campaign" : "+ New Ad Campaign"}
                </div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                  {editCamp ? "Update campaign details" : "Define your campaign goals and assign stage owners"}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 20 }}>×</button>
            </div>

            <div className="ad-modal-body">
              {/* Row 1: Name + Brand */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="ad-field">
                  <label>Campaign Name *</label>
                  <input className="ad-input" placeholder="e.g. Summer Lead Gen 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="ad-field">
                  <label>Brand *</label>
                  <select className="ad-select" value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}>
                    <option value="">Select brand…</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: Platform + Budget */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="ad-field">
                  <label>Platform</label>
                  <select className="ad-select" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                    <option value="meta">Meta</option>
                    <option value="google">Google</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
                <div className="ad-field">
                  <label>Budget (₹)</label>
                  <input className="ad-input" type="number" placeholder="50000" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
                </div>
              </div>

              {/* Agenda */}
              <div className="ad-field">
                <label>Agenda — what this campaign aims to achieve</label>
                <textarea className="ad-textarea" placeholder="e.g. Lead generation for new IIT/NEET batch · target 200 sign-ups · ₹250 CPL" value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} />
              </div>

              {/* Stages */}
              <div className="ad-field">
                <label>Campaign stages — per-stage owner &amp; deadline</label>
                <div style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "4px 12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 1fr", gap: 8, padding: "6px 0", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, borderBottom: "1px solid #F1F5F9" }}>
                    <span>#</span><span>Stage</span><span>Owner</span><span>Deadline</span>
                  </div>
                  {form.stages.map((s, i) => (
                    <div key={i} className="stage-row-form">
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#6366F1" }}>{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{s.label}</span>
                      <select className="ad-select" style={{ fontSize: 12, padding: "5px 8px" }} value={s.owner} onChange={e => setStage(i, "owner", e.target.value)}>
                        <option value="">— assign —</option>
                        {employees.map(e => (
                          <option key={e._id} value={`${e.firstName} ${e.lastName}`}>{e.firstName} {e.lastName}</option>
                        ))}
                      </select>
                      <input type="date" className="ad-input" style={{ fontSize: 12, padding: "5px 8px" }} value={s.deadline} onChange={e => setStage(i, "deadline", e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ad-modal-foot">
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 20px", background: "none", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#64748B" }}>
                Cancel
              </button>
              <button onClick={submit} disabled={saving} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#4F46E5,#4845d4)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? .6 : 1 }}>
                {saving ? "Saving…" : (editCamp ? "Save Changes" : "+ Launch Campaign")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meta Ad Account selection modal */}
      {metaSelect && (
        <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && setMetaSelect(null)}>
          <div className="ad-modal" style={{ maxWidth: 480 }}>
            <div className="ad-modal-head">
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Select Meta Ad Account</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Choose the account for <strong>{metaSelect.brandName}</strong></div>
              </div>
              <button onClick={() => setMetaSelect(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 20 }}>×</button>
            </div>
            <div className="ad-modal-body">
              {(() => {
                const brandLower = (metaSelect.brandName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                return metaSelect.accounts.map(acc => {
                  const n = (acc.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  const b = (acc.business || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  const isRecommended = n.includes(brandLower) || brandLower.includes(n) || b.includes(brandLower) || brandLower.includes(b);
                  const isSelected = selectedAcct === acc.id;
                  return (
                    <div key={acc.id} className={`acct-select-opt ${isSelected ? "selected" : ""}`} onClick={() => setSelectedAcct(acc.id)}
                      style={{ opacity: acc.status === "inactive" ? 0.55 : 1 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: isSelected ? "#1877F2" : "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className="bi bi-facebook" style={{ color: isSelected ? "#fff" : "#1877F2", fontSize: 18 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{acc.name}</span>
                          {isRecommended && (
                            <span style={{ fontSize: 9, fontWeight: 800, background: "#DCFCE7", color: "#15803D", borderRadius: 20, padding: "1px 7px", letterSpacing: .3 }}>
                              ✓ Recommended
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                          {acc.id} · {acc.currency} · {acc.business || "Personal"}
                          <span style={{ marginLeft: 8, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: acc.status === "active" ? "#DCFCE7" : "#F1F5F9", color: acc.status === "active" ? "#15803D" : "#64748B" }}>{acc.status}</span>
                        </div>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isSelected ? "#1877F2" : "#E2E8F0"}`, background: isSelected ? "#1877F2" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isSelected && <i className="bi bi-check" style={{ color: "#fff", fontSize: 11 }} />}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="ad-modal-foot">
              <button onClick={() => setMetaSelect(null)} style={{ padding: "9px 20px", background: "none", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#64748B" }}>Cancel</button>
              <button onClick={finalizeMetaSelect} disabled={!selectedAcct} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#1877F2,#0f5fd4)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Connect this account →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Customer selection modal */}
      {googleSelect && (
        <div className="ad-modal-overlay" onClick={e => e.target === e.currentTarget && setGoogleSelect(null)}>
          <div className="ad-modal" style={{ maxWidth: 480 }}>
            <div className="ad-modal-head">
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Select Google Ads Account</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Choose the customer for <strong>{googleSelect.brandName}</strong></div>
              </div>
              <button onClick={() => setGoogleSelect(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 20 }}>×</button>
            </div>
            <div className="ad-modal-body">
              {googleSelect.customers.map(cust => (
                <div key={cust.id} className={`acct-select-opt ${selectedAcct === cust.id ? "selected" : ""}`} onClick={() => setSelectedAcct(cust.id)}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: selectedAcct === cust.id ? "#EA4335" : "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="bi bi-google" style={{ color: selectedAcct === cust.id ? "#fff" : "#EA4335", fontSize: 18 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{cust.name}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                      ID: {cust.id} · {cust.currency}
                      {cust.testAccount && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "#FFFBEB", color: "#B45309" }}>Test Account</span>}
                    </div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selectedAcct === cust.id ? "#EA4335" : "#E2E8F0"}`, background: selectedAcct === cust.id ? "#EA4335" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selectedAcct === cust.id && <i className="bi bi-check" style={{ color: "#fff", fontSize: 11 }} />}
                  </div>
                </div>
              ))}
            </div>
            <div className="ad-modal-foot">
              <button onClick={() => setGoogleSelect(null)} style={{ padding: "9px 20px", background: "none", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#64748B" }}>Cancel</button>
              <button onClick={finalizeGoogleSelect} disabled={!selectedAcct} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#EA4335,#C5221F)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Connect this account →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
