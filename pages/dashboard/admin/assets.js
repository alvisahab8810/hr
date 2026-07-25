// pages/dashboard/admin/assets.js
import Head from "next/head";
import Link from "next/link";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

// ── constants ────────────────────────────────────────────────────────────────
const CATEGORIES  = ["Electronics","Furniture","Accessories","Equipment","Vehicles","Other"];
const CONDITIONS  = ["Good","Fair","Damaged","Under Repair"];
const STATUSES    = ["Available","Assigned","Retired"];

const CAT_META = {
  Electronics:  { icon:"bi-laptop-fill",       bg:"#DBEAFE", color:"#1D4ED8" },
  Furniture:    { icon:"bi-house-fill",         bg:"#F3F4F6", color:"#374151" },
  Accessories:  { icon:"bi-headphones",         bg:"#FEF3C7", color:"#B45309" },
  Equipment:    { icon:"bi-tools",              bg:"#EDE9FE", color:"#5B21B6" },
  Vehicles:     { icon:"bi-car-front-fill",     bg:"#ECFDF5", color:"#059669" },
  Other:        { icon:"bi-box-seam-fill",      bg:"#F3F4F6", color:"#6B7280" },
};
const COND_META = {
  Good:          { bg:"#D1FAE5", color:"#065F46" },
  Fair:          { bg:"#FEF3C7", color:"#92400E" },
  Damaged:       { bg:"#FEE2E2", color:"#991B1B" },
  "Under Repair":{ bg:"#EDE9FE", color:"#5B21B6" },
};
const STATUS_META = {
  Available:{ bg:"#D1FAE5", color:"#065F46" },
  Assigned: { bg:"#DBEAFE", color:"#1D4ED8" },
  Retired:  { bg:"#F3F4F6", color:"#6B7280" },
};
const LOG_ICON = {
  Created:         "bi-plus-circle-fill",
  Assigned:        "bi-person-check-fill",
  Returned:        "bi-arrow-return-left",
  Updated:         "bi-pencil-fill",
  "Damage Reported":"bi-exclamation-triangle-fill",
  Retired:         "bi-archive-fill",
  Reassigned:      "bi-arrow-repeat",
};
const LOG_COLOR = {
  Created:"#059669",Assigned:"#1D4ED8",Returned:"#B45309",
  Updated:"#4F46E5","Damage Reported":"#DC2626",Retired:"#6B7280",Reassigned:"#7C3AED",
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN",{ day:"numeric",month:"short",year:"numeric" }) : "—";
const fmtMoney= (n) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const empName = (e) => {
  if (!e) return "—";
  const fn = e.personal?.firstName || e.firstName || "";
  const ln = e.personal?.lastName  || e.lastName  || "";
  return `${fn} ${ln}`.trim() || e.email || "—";
};

function Pill({ label, meta }) {
  if (!label) return null;
  const m = meta[label] || { bg:"#F3F4F6", color:"#374151" };
  return (
    <span style={{ background:m.bg, color:m.color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

// ── FormField helper ─────────────────────────────────────────────────────────
function FF({ label, name, value, onChange, type="text", options, span, required }) {
  const s = {
    width:"100%", padding:"9px 12px", fontSize:13, borderRadius:8,
    border:"1.5px solid #E5E7EB", outline:"none", color:"#111827", fontWeight:500,
  };
  return (
    <div style={{ gridColumn: span ? "1/-1" : undefined, marginBottom:2 }}>
      <label style={{ fontSize:11.5, fontWeight:600, color:"#6B7280", display:"block", marginBottom:4 }}>
        {label}{required && <span style={{ color:"#DC2626" }}> *</span>}
      </label>
      {options ? (
        <select name={name} value={value||""} onChange={onChange} style={s}>
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} name={name} value={value||""} onChange={onChange} style={s} />
      )}
    </div>
  );
}

// ── BLANK FORM ────────────────────────────────────────────────────────────────
const BLANK = {
  name:"", category:"", brand:"", model:"", serialNumber:"",
  purchaseDate:"", purchaseValue:"", warrantyExpiry:"",
  vendor:"", location:"", quantity:1, condition:"Good",
  status:"Available", remarks:"",
};

export default function AssetsAdmin() {
  const [tab, setTab]       = useState("assets");   // assets | mapping | logs
  const [assets, setAssets] = useState([]);
  const [stats, setStats]   = useState(null);
  const [logs, setLogs]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);

  // filters
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterSt,  setFilterSt]  = useState("");
  const [filterCond,setFilterCond]= useState("");

  // drawer
  const [drawer, setDrawer] = useState(null); // asset object

  // add/edit modal
  const [showModal, setShowModal]   = useState(false);
  const [editAsset, setEditAsset]   = useState(null); // null = add, obj = edit
  const [form, setForm]             = useState(BLANK);
  const [saving, setSaving]         = useState(false);

  // assign modal
  const [assignModal, setAssignModal]   = useState(null); // asset object
  const [assignEmpId, setAssignEmpId]   = useState("");
  const [assignDate,  setAssignDate]    = useState(new Date().toISOString().slice(0,10));
  const [assigning,   setAssigning]     = useState(false);

  // return modal
  const [returnModal,   setReturnModal]   = useState(null);
  const [returnCond,    setReturnCond]    = useState("Good");
  const [returning,     setReturning]     = useState(false);

  // delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // toast
  const [toast, setToast] = useState(null);

  const showToast = (text, type="success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load data ────────────────────────────────────────────────────────────
  const loadAssets = useCallback(async () => {
    const res  = await fetch("/api/admin/assets");
    const data = await res.json();
    if (data.success) setAssets(data.assets);
  }, []);

  const loadStats = useCallback(async () => {
    const res  = await fetch("/api/admin/assets/stats");
    const data = await res.json();
    if (data.success) setStats(data.stats);
  }, []);

  const loadLogs = useCallback(async () => {
    const res  = await fetch("/api/admin/assets/logs?limit=200");
    const data = await res.json();
    if (data.success) setLogs(data.logs);
  }, []);

  const loadEmployees = useCallback(async () => {
    const res  = await fetch("/api/admin/assets/employees");
    const data = await res.json();
    if (data.success) setEmployees(data.employees || []);
  }, []);

  useEffect(() => {
    Promise.all([loadAssets(), loadStats(), loadLogs(), loadEmployees()])
      .finally(() => setLoading(false));
  }, []);

  // ── Filtered assets ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return assets.filter(a => {
      if (filterCat  && a.category  !== filterCat)  return false;
      if (filterSt   && a.status    !== filterSt)   return false;
      if (filterCond && a.condition !== filterCond)  return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.name?.toLowerCase().includes(q)   ||
          a.assetId?.toLowerCase().includes(q) ||
          a.brand?.toLowerCase().includes(q)   ||
          a.serialNumber?.toLowerCase().includes(q) ||
          empName(a.assignedTo).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assets, search, filterCat, filterSt, filterCond]);

  // ── Employee mapping ──────────────────────────────────────────────────────
  const empMapping = useMemo(() => {
    const map = new Map();
    assets.forEach(a => {
      if (!a.assignedTo) return;
      const id = a.assignedTo._id;
      if (!map.has(id)) map.set(id, { emp: a.assignedTo, assets: [] });
      map.get(id).assets.push(a);
    });
    return [...map.values()];
  }, [assets]);

  // ── Sync drawer with live assets list ────────────────────────────────────
  const liveDrawer = useMemo(() => {
    if (!drawer) return null;
    return assets.find(a => a._id === drawer._id) || drawer;
  }, [drawer, assets]);

  // ── Form helpers ─────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const openAdd  = () => { setForm(BLANK); setEditAsset(null); setShowModal(true); };
  const openEdit = (asset) => {
    setForm({
      name:          asset.name          || "",
      category:      asset.category      || "",
      brand:         asset.brand         || "",
      model:         asset.model         || "",
      serialNumber:  asset.serialNumber  || "",
      purchaseDate:  asset.purchaseDate  ? new Date(asset.purchaseDate).toISOString().slice(0,10)  : "",
      purchaseValue: asset.purchaseValue || "",
      warrantyExpiry:asset.warrantyExpiry? new Date(asset.warrantyExpiry).toISOString().slice(0,10): "",
      vendor:        asset.vendor        || "",
      location:      asset.location      || "",
      quantity:      asset.quantity      || 1,
      condition:     asset.condition     || "Good",
      status:        asset.status        || "Available",
      remarks:       asset.remarks       || "",
    });
    setEditAsset(asset);
    setShowModal(true);
  };

  const handleSaveAsset = async () => {
    if (!form.name || !form.category) { showToast("Name and category are required", "error"); return; }
    setSaving(true);
    try {
      let res, data;
      if (editAsset) {
        res  = await fetch(`/api/admin/assets/${editAsset._id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
        data = await res.json();
        if (!data.success) throw new Error(data.message);
        setAssets(prev => prev.map(a => a._id === editAsset._id ? data.asset : a));
        if (drawer?._id === editAsset._id) setDrawer(data.asset);
        showToast("Asset updated successfully");
      } else {
        res  = await fetch("/api/admin/assets", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
        data = await res.json();
        if (!data.success) throw new Error(data.message);
        setAssets(prev => [data.asset, ...prev]);
        showToast("Asset added to inventory");
      }
      setShowModal(false);
      loadStats();
      loadLogs();
    } catch (err) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assignEmpId) { showToast("Please select an employee", "error"); return; }
    setAssigning(true);
    try {
      const res  = await fetch("/api/admin/assets/assign", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ assetId: assignModal._id, employeeId: assignEmpId, assignedDate: assignDate }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setAssets(prev => prev.map(a => a._id === assignModal._id ? data.asset : a));
      if (drawer?._id === assignModal._id) setDrawer(data.asset);
      setAssignModal(null); setAssignEmpId(""); showToast("Asset assigned successfully");
      loadStats(); loadLogs();
    } catch (err) {
      showToast(err.message || "Failed to assign", "error");
    } finally {
      setAssigning(false);
    }
  };

  const handleReturn = async () => {
    setReturning(true);
    try {
      const res  = await fetch("/api/admin/assets/return", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ assetId: returnModal._id, condition: returnCond }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setAssets(prev => prev.map(a => a._id === returnModal._id ? data.asset : a));
      if (drawer?._id === returnModal._id) setDrawer(data.asset);
      setReturnModal(null); showToast("Asset returned to inventory");
      loadStats(); loadLogs();
    } catch (err) {
      showToast(err.message || "Failed to return", "error");
    } finally {
      setReturning(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/admin/assets/${deleteConfirm._id}`, { method:"DELETE" });
      setAssets(prev => prev.filter(a => a._id !== deleteConfirm._id));
      if (drawer?._id === deleteConfirm._id) setDrawer(null);
      setDeleteConfirm(null);
      showToast("Asset deleted");
      loadStats();
    } catch { showToast("Failed to delete", "error"); }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          @keyframes spin    { to { transform:rotate(360deg); } }
          @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
          @keyframes fadeIn  { from { opacity:0;transform:translateY(-8px); } to { opacity:1;transform:translateY(0); } }
          .ams-toast   { animation: fadeIn .2s ease; }
          .ams-drawer  { animation: slideIn .25s cubic-bezier(0.22,1,0.36,1); }
          .ams-row:hover { background:#F9FAFB; cursor:pointer; }
          .ams-tab-btn { background:transparent; border:none; cursor:pointer; padding:10px 18px; font-size:13px; font-weight:600; transition:all .15s; border-bottom:2px solid transparent; }
          .ams-tab-btn.active { color:#4F46E5; border-bottom-color:#4F46E5; background:#EEF2FF; border-radius:8px 8px 0 0; }
          .ams-tab-btn:not(.active) { color:#9CA3AF; }
          .ams-tab-btn:not(.active):hover { color:#374151; }
          .ams-filter-input { padding:8px 12px; font-size:13px; border:1.5px solid #E5E7EB; border-radius:8px; outline:none; background:#fff; }
          .ams-filter-input:focus { border-color:#4F46E5; }
          .ams-btn { display:inline-flex; align-items:center; gap:5px; padding:7px 14px; border-radius:9px; font-size:12px; font-weight:700; border:none; cursor:pointer; transition:all .15s; }
          .ams-btn-primary { background:#4F46E5; color:#fff; }
          .ams-btn-primary:hover { background:#4338CA; }
          .ams-btn-danger  { background:#FEE2E2; color:#DC2626; border:1.5px solid #FECACA; }
          .ams-btn-danger:hover { background:#DC2626; color:#fff; }
          .ams-btn-outline { background:#fff; color:#374151; border:1.5px solid #E5E7EB; }
          .ams-btn-outline:hover { background:#F3F4F6; }
          .ams-btn-green  { background:#D1FAE5; color:#065F46; border:1.5px solid #A7F3D0; }
          .ams-btn-green:hover  { background:#059669; color:#fff; }
          .ams-emp-card { background:#fff; border-radius:14px; padding:16px 18px; border:1.5px solid #F3F4F6; cursor:pointer; transition:all .15s; }
          .ams-emp-card:hover { border-color:#C7D2FE; box-shadow:0 2px 12px rgba(79,70,229,.08); }

          .ams-stat {
            box-sizing:border-box; height:104px; border-radius:16px;
            padding:17px 18px 16px; display:flex; flex-direction:column;
            justify-content:space-between; border:1px solid;
            box-shadow:0 3px 12px rgba(15,23,42,.06); position:relative;
            overflow:hidden; transition:transform .2s ease, box-shadow .2s ease;
          }
          .ams-stat:hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(15,23,42,.12); }
          .ams-stat::before { content:""; position:absolute; top:0; left:0; right:0; height:3px; }
          .ams-stat-top { display:flex; align-items:center; gap:14px; }
          .ams-stat-icon { width:46px; height:46px; border-radius:13px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:19px; flex-shrink:0; }
          .ams-stat-body { flex:1; min-width:0; }
          .ams-stat-val { font-size:22px; font-weight:900; color:#0F172A; line-height:1.05; letter-spacing:-.6px; white-space:nowrap; }
          .ams-stat-label { font-size:12px; color:#475569; font-weight:700; margin-top:3px; white-space:nowrap; }
          .ams-stat-track { height:6px; background:#F1F5F9; border-radius:6px; }
          .ams-stat-fill { height:6px; border-radius:6px; transition:width .4s; }

          .ams-stat.indigo::before { background:#4F46E5; }
          .ams-stat.indigo { background:linear-gradient(160deg,#fff 55%,#EEF2FF 165%); border-color:#C7D2FE; }
          .ams-stat.indigo .ams-stat-icon { background:#4F46E5; box-shadow:0 6px 16px #4F46E533; }
          .ams-stat.indigo .ams-stat-fill { background:#4F46E5; }

          .ams-stat.blue::before { background:#2563EB; }
          .ams-stat.blue { background:linear-gradient(160deg,#fff 55%,#DBEAFE 165%); border-color:#BFDBFE; }
          .ams-stat.blue .ams-stat-icon { background:#2563EB; box-shadow:0 6px 16px #2563EB33; }
          .ams-stat.blue .ams-stat-fill { background:#2563EB; }

          .ams-stat.green::before { background:#16A34A; }
          .ams-stat.green { background:linear-gradient(160deg,#fff 55%,#DCFCE7 165%); border-color:#BBF7D0; }
          .ams-stat.green .ams-stat-icon { background:#16A34A; box-shadow:0 6px 16px #16A34A33; }
          .ams-stat.green .ams-stat-fill { background:#16A34A; }

          .ams-stat.red::before { background:#DC2626; }
          .ams-stat.red { background:linear-gradient(160deg,#fff 55%,#FEE2E2 165%); border-color:#FECACA; }
          .ams-stat.red .ams-stat-icon { background:#DC2626; box-shadow:0 6px 16px #DC262633; }
          .ams-stat.red .ams-stat-fill { background:#DC2626; }

          .ams-stat.purple::before { background:#7C3AED; }
          .ams-stat.purple { background:linear-gradient(160deg,#fff 55%,#EDE9FE 165%); border-color:#DDD6FE; }
          .ams-stat.purple .ams-stat-icon { background:#7C3AED; box-shadow:0 6px 16px #7C3AED33; }
          .ams-stat.purple .ams-stat-fill { background:#7C3AED; }

          .ams-stat.gray::before { background:#6B7280; }
          .ams-stat.gray { background:linear-gradient(160deg,#fff 55%,#F3F4F6 165%); border-color:#E5E7EB; }
          .ams-stat.gray .ams-stat-icon { background:#6B7280; box-shadow:0 6px 16px #6B728033; }
          .ams-stat.gray .ams-stat-fill { background:#6B7280; }
        `}</style>
      </Head>

      <div className="main-nav">
        <SmartLeftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          {/* Toast */}
          {toast && (
            <div className="ams-toast" style={{
              position:"fixed", top:24, right:24, zIndex:9999,
              background: toast.type === "success" ? "#ECFDF5" : "#FEF2F2",
              border:`1.5px solid ${toast.type === "success" ? "#6EE7B7" : "#FCA5A5"}`,
              borderRadius:12, padding:"12px 18px",
              display:"flex", alignItems:"center", gap:10,
              fontSize:13, fontWeight:600,
              color: toast.type === "success" ? "#065F46" : "#991B1B",
              boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
            }}>
              <i className={`bi bi-${toast.type === "success" ? "check-circle-fill" : "x-circle-fill"}`} style={{ fontSize:16 }} />
              {toast.text}
            </div>
          )}

          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item">
                <Link href="/dashboard/admin/employee-management">
                  <i className="bi bi-house-fill" style={{ marginRight:6 }} />Dashboard
                </Link>
              </li>
              <li className="breadcrumb-item active" style={{ color:"#6B7280" }}>Asset Management</li>
            </ul>
          </div>

          <div className="block-header" style={{ padding:"24px 20px 40px", minHeight:"90vh" }}>

            {/* Page header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <div className="pt-4">
                <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", margin:0 }}>Asset Management</h2>
                <p style={{ fontSize:13, color:"#9CA3AF", margin:"4px 0 0" }}>Track, assign and manage all company assets</p>
              </div>
              <button className="ams-btn ams-btn-primary" onClick={openAdd} style={{ fontSize:13, padding:"10px 18px" }}>
                <i className="bi bi-plus-lg" /> Add Asset
              </button>
            </div>

            {/* Stats */}
            {stats && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:22, alignItems:"start" }}>
                {[
                  { accent:"indigo", icon:"bi-box-seam-fill",             val:stats.total,      label:"Total Assets", pct:100 },
                  { accent:"blue",   icon:"bi-person-check-fill",         val:stats.assigned,   label:"Assigned",     pct: stats.total ? (stats.assigned / stats.total) * 100 : 0 },
                  { accent:"green",  icon:"bi-check-circle-fill",         val:stats.available,  label:"Available",    pct: stats.total ? (stats.available / stats.total) * 100 : 0 },
                  { accent:"red",    icon:"bi-exclamation-triangle-fill", val:stats.damaged,    label:"Damaged",      pct: stats.total ? (stats.damaged / stats.total) * 100 : 0 },
                  { accent:"purple", icon:"bi-tools",                     val:stats.underRepair,label:"Under Repair", pct: stats.total ? (stats.underRepair / stats.total) * 100 : 0 },
                  { accent:"gray",   icon:"bi-archive-fill",              val:stats.retired,    label:"Retired",      pct: stats.total ? (stats.retired / stats.total) * 100 : 0 },
                ].map((s, i) => (
                  <div key={i} className={`ams-stat ${s.accent}`}>
                    <div className="ams-stat-top">
                      <div className="ams-stat-icon"><i className={`bi ${s.icon}`} /></div>
                      <div className="ams-stat-body">
                        <div className="ams-stat-val">{s.val ?? "—"}</div>
                        <div className="ams-stat-label">{s.label}</div>
                      </div>
                    </div>
                    <div className="ams-stat-track">
                      <div className="ams-stat-fill" style={{ width:`${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display:"flex", gap:4, marginBottom:18, borderBottom:"2px solid #F3F4F6" }}>
              {[
                { key:"assets",  label:"All Assets",        icon:"bi-list-ul" },
                { key:"mapping", label:"Employee Mapping",   icon:"bi-people-fill" },
                { key:"logs",    label:"Audit Logs",         icon:"bi-clock-history" },
              ].map(t => (
                <button key={t.key} className={`ams-tab-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                  <i className={`bi ${t.icon}`} style={{ marginRight:6 }} />{t.label}
                </button>
              ))}
            </div>

            {/* ── ALL ASSETS TAB ─────────────────────────────────────────── */}
            {tab === "assets" && (
              <div style={{ display:"flex", gap:16 }}>
                {/* Main content */}
                <div style={{ flex:1, minWidth:0 }}>
                  {/* Filters bar */}
                  <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
                    <div style={{ position:"relative", flex:"1 1 220px" }}>
                      <i className="bi bi-search" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF", fontSize:13 }} />
                      <input
                        className="ams-filter-input" placeholder="Search name, ID, brand…"
                        style={{ paddingLeft:32, width:"100%", boxSizing:"border-box" }}
                        value={search} onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    <select className="ams-filter-input" value={filterCat}  onChange={e => setFilterCat(e.target.value)}>
                      <option value="">All Categories</option>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select className="ams-filter-input" value={filterSt}   onChange={e => setFilterSt(e.target.value)}>
                      <option value="">All Statuses</option>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className="ams-filter-input" value={filterCond} onChange={e => setFilterCond(e.target.value)}>
                      <option value="">All Conditions</option>
                      {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {(search || filterCat || filterSt || filterCond) && (
                      <button className="ams-btn ams-btn-outline" onClick={() => { setSearch(""); setFilterCat(""); setFilterSt(""); setFilterCond(""); }}>
                        <i className="bi bi-x-lg" /> Clear
                      </button>
                    )}
                  </div>

                  {/* Count */}
                  <div style={{ fontSize:12, color:"#9CA3AF", fontWeight:500, marginBottom:10 }}>
                    {filtered.length} asset{filtered.length !== 1 ? "s" : ""} {search || filterCat || filterSt || filterCond ? "(filtered)" : ""}
                  </div>

                  {/* Table */}
                  <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 6px rgba(0,0,0,0.07)", overflow:"hidden" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                      <thead>
                        <tr style={{ background:"#F9FAFB", borderBottom:"1.5px solid #F3F4F6" }}>
                          {["Asset ID","Name","Category","Assigned To","Status","Condition","Value",""].map(h => (
                            <th key={h} style={{ padding:"12px 14px", fontWeight:700, fontSize:12, color:"#6B7280", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan="8" style={{ textAlign:"center", padding:"40px 0", color:"#9CA3AF" }}>
                            <i className="bi bi-hourglass-split" style={{ fontSize:20, marginRight:8 }} />Loading…
                          </td></tr>
                        ) : filtered.length === 0 ? (
                          <tr><td colSpan="8" style={{ textAlign:"center", padding:"50px 0" }}>
                            <i className="bi bi-box-seam" style={{ fontSize:36, color:"#E5E7EB", display:"block", marginBottom:8 }} />
                            <span style={{ color:"#9CA3AF", fontSize:13 }}>No assets found</span>
                          </td></tr>
                        ) : filtered.map(a => {
                          const cat = CAT_META[a.category] || CAT_META.Other;
                          return (
                            <tr key={a._id} className="ams-row" onClick={() => setDrawer(a)}
                              style={{ borderBottom:"1px solid #F3F4F6", transition:"background .12s" }}>
                              <td style={{ padding:"11px 14px" }}>
                                <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"#4F46E5", background:"#EEF2FF", borderRadius:6, padding:"2px 7px" }}>{a.assetId}</span>
                              </td>
                              <td style={{ padding:"11px 14px" }}>
                                <div style={{ fontWeight:600, color:"#111827" }}>{a.name}</div>
                                {a.brand && <div style={{ fontSize:11, color:"#9CA3AF" }}>{a.brand}{a.model ? ` · ${a.model}` : ""}</div>}
                              </td>
                              <td style={{ padding:"11px 14px" }}>
                                <span style={{ display:"flex", alignItems:"center", gap:6, background:cat.bg, color:cat.color, borderRadius:20, padding:"3px 10px", width:"fit-content", fontSize:11, fontWeight:700 }}>
                                  <i className={`bi ${cat.icon}`} />{a.category}
                                </span>
                              </td>
                              <td style={{ padding:"11px 14px" }}>
                                {a.assignedTo ? (
                                  <div>
                                    <div style={{ fontWeight:600, color:"#111827", fontSize:12 }}>{empName(a.assignedTo)}</div>
                                    <div style={{ fontSize:11, color:"#9CA3AF" }}>{a.assignedTo.professional?.department || ""}</div>
                                  </div>
                                ) : <span style={{ color:"#D1D5DB", fontSize:12 }}>—</span>}
                              </td>
                              <td style={{ padding:"11px 14px" }}><Pill label={a.status}    meta={STATUS_META} /></td>
                              <td style={{ padding:"11px 14px" }}><Pill label={a.condition} meta={COND_META}   /></td>
                              <td style={{ padding:"11px 14px", fontWeight:600, color:"#374151" }}>{fmtMoney(a.purchaseValue)}</td>
                              <td style={{ padding:"11px 14px" }}>
                                <button className="ams-btn ams-btn-outline" style={{ fontSize:11, padding:"5px 10px" }}
                                  onClick={e => { e.stopPropagation(); setDrawer(a); }}>
                                  Details <i className="bi bi-chevron-right" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── SIDE DRAWER ─────────────────────────────────────── */}
                {liveDrawer && typeof document !== "undefined" && createPortal(
                  <>
                    <div onClick={() => setDrawer(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.18)", zIndex:1040 }} />
                    <div className="ams-drawer" style={{
                      position:"fixed", top:0, right:0, bottom:0, width:420,
                      background:"#fff", boxShadow:"-4px 0 30px rgba(0,0,0,0.12)",
                      zIndex:1041, display:"flex", flexDirection:"column", overflowY:"auto",
                    }}>
                      {/* Drawer header */}
                      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#4338CA)", padding:"20px 22px" }}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                          <div>
                            <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"#A5B4FC", background:"rgba(255,255,255,0.1)", borderRadius:6, padding:"2px 8px" }}>
                              {liveDrawer.assetId}
                            </span>
                            <h3 style={{ color:"#fff", fontWeight:800, fontSize:18, margin:"6px 0 0" }}>{liveDrawer.name}</h3>
                            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12, marginTop:3 }}>
                              {liveDrawer.brand}{liveDrawer.model ? ` · ${liveDrawer.model}` : ""}
                            </div>
                          </div>
                          <button onClick={() => setDrawer(null)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, color:"#fff", padding:"6px 10px", cursor:"pointer", fontSize:14 }}>
                            <i className="bi bi-x-lg" />
                          </button>
                        </div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          <Pill label={liveDrawer.status}    meta={STATUS_META} />
                          <Pill label={liveDrawer.condition} meta={COND_META} />
                          <Pill label={liveDrawer.category}  meta={CAT_META} />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ padding:"14px 22px", display:"flex", gap:8, flexWrap:"wrap", borderBottom:"1px solid #F3F4F6" }}>
                        <button className="ams-btn ams-btn-outline" onClick={() => openEdit(liveDrawer)}>
                          <i className="bi bi-pencil-fill" /> Edit
                        </button>
                        {liveDrawer.status !== "Assigned" && (
                          <button className="ams-btn ams-btn-primary" onClick={() => { setAssignModal(liveDrawer); setAssignEmpId(""); setAssignDate(new Date().toISOString().slice(0,10)); }}>
                            <i className="bi bi-person-check-fill" /> Assign
                          </button>
                        )}
                        {liveDrawer.status === "Assigned" && (
                          <button className="ams-btn ams-btn-green" onClick={() => { setReturnModal(liveDrawer); setReturnCond("Good"); }}>
                            <i className="bi bi-arrow-return-left" /> Return
                          </button>
                        )}
                        {liveDrawer.status === "Assigned" && (
                          <button className="ams-btn ams-btn-outline" onClick={() => { setAssignModal(liveDrawer); setAssignEmpId(""); setAssignDate(new Date().toISOString().slice(0,10)); }}>
                            <i className="bi bi-arrow-repeat" /> Reassign
                          </button>
                        )}
                        <button className="ams-btn ams-btn-danger" onClick={() => setDeleteConfirm(liveDrawer)}>
                          <i className="bi bi-trash3-fill" /> Delete
                        </button>
                      </div>

                      {/* Details */}
                      <div style={{ padding:"16px 22px", flex:1 }}>
                        {/* Assigned to */}
                        {liveDrawer.assignedTo && (
                          <div style={{ background:"#EEF2FF", borderRadius:12, padding:"12px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
                            <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#818CF8,#A78BFA)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"#fff", flexShrink:0 }}>
                              {empName(liveDrawer.assignedTo)[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:"#1E1B4B" }}>{empName(liveDrawer.assignedTo)}</div>
                              <div style={{ fontSize:11, color:"#6366F1" }}>
                                {liveDrawer.assignedTo.professional?.department || ""} · Assigned {fmtDate(liveDrawer.assignedDate)}
                              </div>
                            </div>
                          </div>
                        )}

                        {[
                          ["Serial Number", liveDrawer.serialNumber, true],
                          ["Category",      liveDrawer.category],
                          ["Purchase Date", fmtDate(liveDrawer.purchaseDate)],
                          ["Purchase Value",fmtMoney(liveDrawer.purchaseValue)],
                          ["Warranty Until",fmtDate(liveDrawer.warrantyExpiry)],
                          ["Vendor",        liveDrawer.vendor],
                          ["Location",      liveDrawer.location],
                          ["Quantity",      liveDrawer.quantity !== 1 ? liveDrawer.quantity : null],
                          ["Last Returned", fmtDate(liveDrawer.lastReturnDate)],
                          ["Remarks",       liveDrawer.remarks],
                          ["Added On",      fmtDate(liveDrawer.createdAt)],
                        ].filter(([,v]) => v && v !== "—").map(([label, val, mono]) => (
                          <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"9px 0", borderBottom:"1px solid #F3F4F6", gap:12 }}>
                            <span style={{ fontSize:12, color:"#9CA3AF", fontWeight:500, flexShrink:0 }}>{label}</span>
                            <span style={{ fontSize:13, fontWeight:600, color:"#111827", textAlign:"right", fontFamily:mono?"monospace":undefined, wordBreak:"break-all" }}>{val}</span>
                          </div>
                        ))}

                        {/* Warranty warning */}
                        {liveDrawer.warrantyExpiry && new Date(liveDrawer.warrantyExpiry) < new Date(Date.now() + 30*24*60*60*1000) && (
                          <div style={{ marginTop:14, background:"#FEF3C7", borderRadius:10, padding:"10px 14px", display:"flex", gap:8, fontSize:12, color:"#92400E" }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ color:"#D97706", flexShrink:0, marginTop:1 }} />
                            <span>Warranty expires {new Date(liveDrawer.warrantyExpiry) < new Date() ? "— already expired!" : `on ${fmtDate(liveDrawer.warrantyExpiry)}`}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>
            )}

            {/* ── EMPLOYEE MAPPING TAB ─────────────────────────────────── */}
            {tab === "mapping" && (
              <div>
                {empMapping.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"60px 20px" }}>
                    <i className="bi bi-people" style={{ fontSize:48, color:"#E5E7EB", display:"block", marginBottom:12 }} />
                    <span style={{ color:"#9CA3AF", fontSize:14 }}>No assets are currently assigned to any employee</span>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
                    {empMapping.map(({ emp, assets: empAssets }) => {
                      const name = empName(emp);
                      const initials = name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0,2).toUpperCase();
                      return (
                        <div key={emp._id} className="ams-emp-card">
                          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                            <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#818CF8,#A78BFA)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"#fff", flexShrink:0 }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>{name}</div>
                              <div style={{ fontSize:11, color:"#9CA3AF" }}>{emp.professional?.department || emp.professional?.designation || ""}</div>
                            </div>
                            <span style={{ marginLeft:"auto", background:"#EEF2FF", color:"#4F46E5", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                              {empAssets.length} asset{empAssets.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            {empAssets.map(a => {
                              const cat = CAT_META[a.category] || CAT_META.Other;
                              return (
                                <div key={a._id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:"#F9FAFB", borderRadius:8, cursor:"pointer" }}
                                  onClick={() => { setTab("assets"); setTimeout(() => setDrawer(a), 50); }}>
                                  <div style={{ width:28, height:28, borderRadius:7, background:cat.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                    <i className={`bi ${cat.icon}`} style={{ color:cat.color, fontSize:12 }} />
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontSize:12, fontWeight:600, color:"#111827", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.name}</div>
                                    <div style={{ fontSize:10, color:"#9CA3AF" }}>{a.assetId}</div>
                                  </div>
                                  <Pill label={a.condition} meta={COND_META} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── AUDIT LOGS TAB ───────────────────────────────────────── */}
            {tab === "logs" && (
              <div style={{ background:"#fff", borderRadius:16, padding:"20px 22px", boxShadow:"0 1px 6px rgba(0,0,0,0.07)" }}>
                <h4 style={{ fontSize:14, fontWeight:700, color:"#111827", marginBottom:16 }}>Audit Trail</h4>
                {logs.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:"#9CA3AF" }}>No activity yet</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                    {logs.map((log, i) => {
                      const ic = LOG_ICON[log.action] || "bi-circle";
                      const cl = LOG_COLOR[log.action] || "#6B7280";
                      const fromName = log.fromEmployee ? empName(log.fromEmployee) : null;
                      const toName   = log.toEmployee   ? empName(log.toEmployee)   : null;
                      return (
                        <div key={log._id} style={{ display:"flex", gap:14, paddingBottom:16, position:"relative" }}>
                          {i < logs.length - 1 && (
                            <div style={{ position:"absolute", left:15, top:28, bottom:0, width:2, background:"#F3F4F6" }} />
                          )}
                          <div style={{ width:30, height:30, borderRadius:"50%", background:`${cl}18`, border:`2px solid ${cl}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, zIndex:1 }}>
                            <i className={`bi ${ic}`} style={{ color:cl, fontSize:12 }} />
                          </div>
                          <div style={{ flex:1, paddingTop:4 }}>
                            <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                              <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>{log.assetName}</span>
                              <span style={{ fontSize:11, background:`${cl}18`, color:cl, borderRadius:5, padding:"1px 7px", fontWeight:700 }}>{log.action}</span>
                              <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:"monospace" }}>{log.assetId}</span>
                            </div>
                            {(fromName || toName || log.notes) && (
                              <div style={{ fontSize:12, color:"#6B7280", marginTop:3 }}>
                                {fromName && toName && `${fromName} → ${toName}`}
                                {fromName && !toName && `from ${fromName}`}
                                {!fromName && toName && `to ${toName}`}
                                {log.notes && ` · ${log.notes}`}
                              </div>
                            )}
                            <div style={{ fontSize:11, color:"#D1D5DB", marginTop:2 }}>
                              {log.performedBy} · {new Date(log.createdAt).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ══ ADD / EDIT ASSET MODAL ══════════════════════════════════════════ */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:1050, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={() => setShowModal(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.35)" }} />
          <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ padding:"20px 24px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:800, color:"#111827", margin:0 }}>{editAsset ? "Edit Asset" : "Add New Asset"}</h3>
                <p style={{ fontSize:12, color:"#9CA3AF", margin:"2px 0 0" }}>{editAsset ? "Update asset information" : "Add a new asset to inventory"}</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background:"#F3F4F6", border:"none", borderRadius:8, padding:"7px 10px", cursor:"pointer", fontSize:14, color:"#374151" }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div style={{ padding:"20px 24px" }}>
              {/* Basic info */}
              <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:0.8, marginBottom:12 }}>Basic Information</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
                <FF label="Asset Name"  name="name"     value={form.name}     onChange={handleFormChange} required />
                <FF label="Category"    name="category" value={form.category} onChange={handleFormChange} options={CATEGORIES} required />
                <FF label="Brand"       name="brand"    value={form.brand}    onChange={handleFormChange} />
                <FF label="Model"       name="model"    value={form.model}    onChange={handleFormChange} />
                <FF label="Serial Number" name="serialNumber" value={form.serialNumber} onChange={handleFormChange} />
                <FF label="Quantity"    name="quantity" value={form.quantity}  onChange={handleFormChange} type="number" />
              </div>

              <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:0.8, marginBottom:12 }}>Purchase & Warranty</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
                <FF label="Purchase Date"   name="purchaseDate"   value={form.purchaseDate}   onChange={handleFormChange} type="date" />
                <FF label="Purchase Value (₹)" name="purchaseValue" value={form.purchaseValue} onChange={handleFormChange} type="number" />
                <FF label="Warranty Expiry" name="warrantyExpiry" value={form.warrantyExpiry} onChange={handleFormChange} type="date" />
                <FF label="Vendor"          name="vendor"         value={form.vendor}          onChange={handleFormChange} />
              </div>

              <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:0.8, marginBottom:12 }}>Status & Location</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
                <FF label="Condition" name="condition" value={form.condition} onChange={handleFormChange} options={CONDITIONS} />
                <FF label="Status"    name="status"    value={form.status}    onChange={handleFormChange} options={STATUSES} />
                <FF label="Location (e.g. Meeting Room A)" name="location" value={form.location} onChange={handleFormChange} span />
              </div>

              <FF label="Remarks / Notes" name="remarks" value={form.remarks} onChange={handleFormChange} span />
            </div>

            <div style={{ padding:"16px 24px", borderTop:"1px solid #F3F4F6", display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button className="ams-btn ams-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="ams-btn ams-btn-primary" onClick={handleSaveAsset} disabled={saving}>
                {saving ? <><i className="bi bi-arrow-repeat" style={{ animation:"spin .7s linear infinite" }} /> Saving…</> : <><i className="bi bi-check-lg" /> {editAsset ? "Update Asset" : "Add to Inventory"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ASSIGN MODAL ════════════════════════════════════════════════════ */}
      {assignModal && (
        <div style={{ position:"fixed", inset:0, zIndex:1060, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={() => setAssignModal(null)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)" }} />
          <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:440, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", padding:"24px" }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:"#111827", marginBottom:4 }}>
              {assignModal.status === "Assigned" ? "Reassign Asset" : "Assign to Employee"}
            </h3>
            <p style={{ fontSize:12, color:"#9CA3AF", marginBottom:20 }}>{assignModal.assetId} · {assignModal.name}</p>

            {assignModal.status === "Assigned" && assignModal.assignedTo && (
              <div style={{ background:"#FEF3C7", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#92400E" }}>
                <i className="bi bi-info-circle-fill" style={{ marginRight:6 }} />
                Currently assigned to <strong>{empName(assignModal.assignedTo)}</strong>. Reassigning will unlink them.
              </div>
            )}

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Select Employee *</label>
              <select style={{ width:"100%", padding:"10px 12px", fontSize:13, borderRadius:8, border:"1.5px solid #E5E7EB", outline:"none" }}
                value={assignEmpId} onChange={e => setAssignEmpId(e.target.value)}>
                <option value="">— Choose employee —</option>
                {employees.map(e => (
                  <option key={e._id} value={e._id}>{empName(e)}{e.professional?.department ? ` (${e.professional.department})` : ""}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Assigned Date</label>
              <input type="date" style={{ width:"100%", padding:"10px 12px", fontSize:13, borderRadius:8, border:"1.5px solid #E5E7EB", outline:"none" }}
                value={assignDate} onChange={e => setAssignDate(e.target.value)} />
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="ams-btn ams-btn-outline" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="ams-btn ams-btn-primary" onClick={handleAssign} disabled={assigning}>
                {assigning ? "Assigning…" : <><i className="bi bi-person-check-fill" /> {assignModal.status === "Assigned" ? "Reassign" : "Assign"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ RETURN MODAL ════════════════════════════════════════════════════ */}
      {returnModal && (
        <div style={{ position:"fixed", inset:0, zIndex:1060, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={() => setReturnModal(null)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)" }} />
          <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", padding:"24px" }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:"#111827", marginBottom:4 }}>Mark as Returned</h3>
            <p style={{ fontSize:12, color:"#9CA3AF", marginBottom:20 }}>{returnModal.assetId} · {returnModal.name}</p>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Condition on Return</label>
              <select style={{ width:"100%", padding:"10px 12px", fontSize:13, borderRadius:8, border:"1.5px solid #E5E7EB", outline:"none" }}
                value={returnCond} onChange={e => setReturnCond(e.target.value)}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="ams-btn ams-btn-outline" onClick={() => setReturnModal(null)}>Cancel</button>
              <button className="ams-btn ams-btn-green" onClick={handleReturn} disabled={returning}>
                {returning ? "Returning…" : <><i className="bi bi-arrow-return-left" /> Confirm Return</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, zIndex:1060, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={() => setDeleteConfirm(null)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)" }} />
          <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:380, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", padding:"24px" }}>
            <div style={{ width:52, height:52, borderRadius:14, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
              <i className="bi bi-trash3-fill" style={{ fontSize:22, color:"#DC2626" }} />
            </div>
            <h3 style={{ fontSize:16, fontWeight:800, color:"#111827", marginBottom:6 }}>Delete Asset?</h3>
            <p style={{ fontSize:13, color:"#6B7280", marginBottom:20 }}>
              <strong>{deleteConfirm.name}</strong> ({deleteConfirm.assetId}) will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="ams-btn ams-btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="ams-btn ams-btn-danger" onClick={handleDelete} style={{ background:"#DC2626", color:"#fff" }}>
                <i className="bi bi-trash3-fill" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}
