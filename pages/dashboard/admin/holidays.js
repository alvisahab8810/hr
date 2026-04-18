// pages/dashboard/admin/holidays.js
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Head from "next/head";

// ─── helpers ──────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "",
  startDate: "",
  endDate: "",
  type: "public",
  description: "",
};

const TYPE_META = {
  public:     { label: "Public",     bg: "#DCFCE7", color: "#15803D", icon: "bi-globe" },
  optional:   { label: "Optional",   bg: "#DBEAFE", color: "#1D4ED8", icon: "bi-calendar2-plus" },
  restricted: { label: "Restricted", bg: "#FEF3C7", color: "#B45309", icon: "bi-lock" },
};

const fmt = (d, opts) =>
  new Date(d).toLocaleDateString("en-IN", opts || { day: "numeric", month: "short", year: "numeric" });

const dayCount = (s, e) => {
  if (!s || !e) return 0;
  const diff = Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1;
  return diff > 0 ? diff : 0;
};

const statusOf = (h) => {
  const now   = new Date(); now.setHours(0,0,0,0);
  const start = new Date(h.startDate); start.setHours(0,0,0,0);
  const end   = new Date(h.endDate);   end.setHours(0,0,0,0);
  if (start <= now && end >= now) return "today";
  if (end < now)                  return "passed";
  return "upcoming";
};

const STATUS_BADGE = {
  today:    { bg: "#DBEAFE", color: "#1D4ED8", label: "Today" },
  passed:   { bg: "#F3F4F6", color: "#6B7280", label: "Passed" },
  upcoming: { bg: "#DCFCE7", color: "#15803D", label: "Upcoming" },
};

// ─── component ────────────────────────────────────────────────────────────────
export default function HolidaysAdmin() {
  const [holidays,        setHolidays]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [submitting,      setSubmitting]      = useState(false);
  const [globalError,     setGlobalError]     = useState("");
  const [formError,       setFormError]       = useState("");
  const [success,         setSuccess]         = useState("");
  const [showModal,       setShowModal]       = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [editId,          setEditId]          = useState(null);
  const [form,            setForm]            = useState(EMPTY_FORM);
  const [deleteId,        setDeleteId]        = useState(null);
  const [search,          setSearch]          = useState("");
  const [filterType,      setFilterType]      = useState("all");
  const [filterStatus,    setFilterStatus]    = useState("all");
  const [selectedYear,    setSelectedYear]    = useState(new Date().getFullYear());

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`/api/payroll/holidays?year=${selectedYear}`);
      const data = await res.json();
      if (data.success) setHolidays(data.data);
      else setGlobalError("Failed to load holidays.");
    } catch {
      setGlobalError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHolidays(); }, [selectedYear]);

  // ── form helpers ───────────────────────────────────────────────────────────
  const resetForm    = () => { setForm(EMPTY_FORM); setIsEditing(false); setEditId(null); setFormError(""); };
  const openCreate   = () => { resetForm(); setShowModal(true); };
  const openEdit     = (h) => {
    setForm({
      name:        h.name,
      startDate:   h.startDate?.substring(0, 10),
      endDate:     h.endDate?.substring(0, 10),
      type:        h.type || "public",
      description: h.description || "",
    });
    setIsEditing(true);
    setEditId(h._id);
    setShowModal(true);
  };
  const closeModal   = () => { setShowModal(false); resetForm(); };
  const flashSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); };

  // Auto-fill endDate when startDate changes (default: same day)
  const handleStartChange = (val) => {
    setForm((f) => ({ ...f, startDate: val, endDate: f.endDate || val }));
  };

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim())          return setFormError("Holiday name is required.");
    if (!form.startDate)            return setFormError("Start date is required.");
    if (!form.endDate)              return setFormError("End date is required.");
    if (form.endDate < form.startDate) return setFormError("End date cannot be before start date.");

    setSubmitting(true);
    try {
      const url    = isEditing ? `/api/payroll/holidays/${editId}` : "/api/payroll/holidays";
      const method = isEditing ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        flashSuccess(isEditing ? "Holiday updated!" : "Holiday created!");
        closeModal();
        fetchHolidays();
      } else {
        setFormError(data.message || "Failed to save.");
      }
    } catch {
      setFormError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res  = await fetch(`/api/payroll/holidays/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        flashSuccess("Holiday deleted.");
        setHolidays((prev) => prev.filter((h) => h._id !== id));
      } else {
        setGlobalError(data.message || "Delete failed.");
      }
    } catch {
      setGlobalError("Something went wrong.");
    } finally {
      setDeleteId(null);
    }
  };

  // ── filtered list ──────────────────────────────────────────────────────────
  const filtered = holidays
    .filter((h) => filterType === "all"   || h.type === filterType)
    .filter((h) => filterStatus === "all" || statusOf(h) === filterStatus)
    .filter((h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.description || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // ── stats ──────────────────────────────────────────────────────────────────
  const total    = holidays.length;
  const upcoming = holidays.filter((h) => statusOf(h) === "upcoming").length;
  const passed   = holidays.filter((h) => statusOf(h) === "passed").length;
  const todayH   = holidays.filter((h) => statusOf(h) === "today").length;
  const thisMonth= holidays.filter((h) => {
    const m = new Date(h.startDate).getMonth();
    return m === new Date().getMonth();
  }).length;

  const days = dayCount(form.startDate, form.endDate);

  // ── year options ───────────────────────────────────────────────────────────
  const cy = new Date().getFullYear();
  const yearOpts = [cy - 1, cy, cy + 1];

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <section className="main-dashboard-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
      </Head>

      <div className="main-nav">
        <SmartLeftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item">
                <Link href="/dashboard/dashboard">
                  <img src="/icons/home.svg" alt="" /> Home
                </Link>
              </li>
              {/* <li className="breadcrumb-item">HR</li> */}
              <li className="breadcrumb-item active">Holiday Management</li>
            </ul>
          </div>

          <div className="block-header">
            {/* ── Toast ──────────────────────────────────────────────────── */}
            {success && (
              <div className="alert alert-success d-flex align-items-center gap-2 mb-3"
                style={{ borderRadius: 10, fontSize: 14 }}>
                <i className="bi bi-check-circle-fill"></i> {success}
              </div>
            )}
            {globalError && (
              <div className="alert alert-danger d-flex align-items-center gap-2 mb-3"
                style={{ borderRadius: 10, fontSize: 14 }}>
                <i className="bi bi-exclamation-circle-fill"></i> {globalError}
                <button className="btn-close ms-auto" onClick={() => setGlobalError("")}></button>
              </div>
            )}

            {/* ── Page header ────────────────────────────────────────────── */}
            <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
              <div>
                <h4 className="fw-bold text-dark mb-1">Holiday Management</h4>
                <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                  Manage company holidays — supports single day &amp; multi-day ranges
                </p>
              </div>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                {/* Year switcher */}
                <div className="d-flex gap-1">
                  {yearOpts.map((y) => (
                    <button key={y}
                      onClick={() => setSelectedYear(y)}
                      className="btn btn-sm"
                      style={{
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        padding: "5px 12px", border: "1.5px solid",
                        borderColor: selectedYear === y ? "#4F46E5" : "#E5E7EB",
                        background:  selectedYear === y ? "#EEF2FF" : "#fff",
                        color:       selectedYear === y ? "#4F46E5" : "#6B7280",
                      }}>
                      {y}
                    </button>
                  ))}
                </div>
                <button className="notice-btn d-flex align-items-center gap-2" onClick={openCreate}>
                  <i className="bi bi-plus-lg"></i> Add Holiday
                </button>
              </div>
            </div>

            {/* ── Stats ──────────────────────────────────────────────────── */}
            <div className="row g-3 mb-4">
              {[
                { label: "Total",       value: total,     icon: "bi-calendar3",      bg: "#EEF2FF", color: "#4F46E5" },
                { label: "Upcoming",    value: upcoming,  icon: "bi-calendar-check", bg: "#DCFCE7", color: "#16A34A" },
                { label: "Passed",      value: passed,    icon: "bi-calendar-x",     bg: "#FEE2E2", color: "#DC2626" },
                { label: "This Month",  value: thisMonth, icon: "bi-calendar-event", bg: "#FEF3C7", color: "#D97706" },
              ].map((s, i) => (
                <div className="col-6 col-md-3" key={i}>
                  <div className="items-home card border-0 p-3 d-flex flex-row align-items-center gap-3">
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className={`bi ${s.icon}`} style={{ fontSize: 18, color: s.color }}></i>
                    </div>
                    <div>
                      <div className="fw-bold text-dark" style={{ fontSize: 22, lineHeight: 1 }}>{s.value}</div>
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{s.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filters ────────────────────────────────────────────────── */}
            <div className="items-home card border-0 p-3 mb-3">
              <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
                {/* Search */}
                <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 280 }}>
                  <i className="bi bi-search text-muted" style={{ fontSize: 13 }}></i>
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    className="form-control border-0 bg-transparent p-0"
                    placeholder="Search holidays..."
                    style={{ outline: "none", boxShadow: "none", fontSize: 14 }} />
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  {/* Type filter */}
                  {["all", "public", "optional", "restricted"].map((t) => (
                    <button key={t} onClick={() => setFilterType(t)}
                      className="btn btn-sm"
                      style={{
                        borderRadius: 20, fontSize: 12, fontWeight: 600, padding: "4px 14px", border: "none",
                        background: filterType === t ? "#4F46E5" : "#F3F4F6",
                        color:      filterType === t ? "#fff"    : "#374151",
                        textTransform: "capitalize",
                      }}>
                      {t === "all" ? "All Types" : TYPE_META[t].label}
                    </button>
                  ))}

                  {/* Status filter */}
                  <div style={{ width: 1, background: "#E5E7EB", margin: "0 4px" }}></div>
                  {["all", "upcoming", "today", "passed"].map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className="btn btn-sm"
                      style={{
                        borderRadius: 20, fontSize: 12, fontWeight: 600, padding: "4px 14px", border: "none",
                        background: filterStatus === s ? "#1e293b" : "#F3F4F6",
                        color:      filterStatus === s ? "#fff"    : "#374151",
                        textTransform: "capitalize",
                      }}>
                      {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Table ──────────────────────────────────────────────────── */}
            <div className="items-home card border-0 p-0 overflow-hidden">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="mt-2 text-muted small">Loading holidays...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x" style={{ fontSize: 44, color: "#D1D5DB" }}></i>
                  <p className="text-muted mt-3 mb-3">No holidays found</p>
                  <button className="notice-btn" onClick={openCreate}>
                    <i className="bi bi-plus-lg me-1"></i> Add Holiday
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0" style={{ fontSize: 13 }}>
                    <thead style={{ background: "#F9FAFB" }}>
                      <tr>
                        {["#", "Holiday", "Start Date", "End Date", "Days", "Type", "Status", "Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 border-0 text-muted" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((holiday, idx) => {
                        const st   = statusOf(holiday);
                        const sbadge = STATUS_BADGE[st];
                        const tbadge = TYPE_META[holiday.type] || TYPE_META.public;
                        const isMulti = holiday.totalDays > 1;
                        return (
                          <tr key={holiday._id} style={{ borderBottom: "1px solid #F3F4F6", opacity: st === "passed" ? 0.65 : 1 }}>
                            <td className="px-4 py-3 text-muted">{idx + 1}</td>

                            <td className="px-4 py-3">
                              <div className="d-flex align-items-center gap-2">
                                {/* multi-day indicator */}
                                {isMulti && (
                                  <span style={{ background: "#EEF2FF", color: "#4F46E5",
                                    borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>
                                    {holiday.totalDays}d
                                  </span>
                                )}
                                <span className="fw-semibold text-dark">{holiday.name}</span>
                              </div>
                              {holiday.description && (
                                <div className="text-muted mt-1" style={{ fontSize: 11,
                                  overflow: "hidden", display: "-webkit-box",
                                  WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                                  {holiday.description}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 text-dark" style={{ whiteSpace: "nowrap" }}>
                              {fmt(holiday.startDate, { day: "numeric", month: "short" })}
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {new Date(holiday.startDate).toLocaleDateString("en-IN", { weekday: "long" })}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-dark" style={{ whiteSpace: "nowrap" }}>
                              {fmt(holiday.endDate, { day: "numeric", month: "short" })}
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {new Date(holiday.endDate).toLocaleDateString("en-IN", { weekday: "long" })}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <span style={{ background: "#F9FAFB", color: "#374151",
                                border: "1px solid #E5E7EB", borderRadius: 8,
                                padding: "3px 10px", fontWeight: 700, fontSize: 12 }}>
                                {holiday.totalDays} {holiday.totalDays === 1 ? "day" : "days"}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <span style={{ background: tbadge.bg, color: tbadge.color,
                                fontWeight: 700, padding: "3px 10px", borderRadius: 8, fontSize: 11 }}>
                                {tbadge.label}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <span style={{ background: sbadge.bg, color: sbadge.color,
                                fontWeight: 700, padding: "3px 10px", borderRadius: 8, fontSize: 11 }}>
                                {sbadge.label}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="d-flex gap-2">
                                <button onClick={() => openEdit(holiday)}
                                  style={{ background: "#EEF2FF", color: "#4F46E5", border: "none",
                                    borderRadius: 8, padding: "5px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                  <i className="bi bi-pencil me-1"></i> Edit
                                </button>
                                <button onClick={() => setDeleteId(holiday._id)}
                                  style={{ background: "#FEE2E2", color: "#DC2626", border: "none",
                                    borderRadius: 8, padding: "5px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                  <i className="bi bi-trash me-1"></i> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!loading && filtered.length > 0 && (
              <p className="text-muted mt-2 mb-0" style={{ fontSize: 12 }}>
                Showing {filtered.length} of {holidays.length} holidays
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div onClick={closeModal}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1040 }} />

          {/* Modal */}
          <div style={{ position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)", zIndex: 1050,
            width: "100%", maxWidth: 540, padding: "0 16px" }}>
            <div className="card border-0 shadow-lg" style={{ borderRadius: 16, maxHeight: "90vh", overflowY: "auto" }}>
              <div className="card-body p-4">

                {/* Header */}
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">
                      {isEditing ? "Edit Holiday" : "Add New Holiday"}
                    </h5>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                      {isEditing
                        ? "Update the holiday details"
                        : "Enter a date range for multi-day holidays (e.g. Diwali holidays)"}
                    </p>
                  </div>
                  <button onClick={closeModal}
                    style={{ background: "#F3F4F6", border: "none", borderRadius: 8,
                      width: 32, height: 32, cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="bi bi-x-lg text-muted"></i>
                  </button>
                </div>

                {formError && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3"
                    style={{ borderRadius: 10, fontSize: 13 }}>
                    <i className="bi bi-exclamation-circle-fill"></i> {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Name */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark" style={{ fontSize: 13 }}>
                      Holiday Name <span className="text-danger">*</span>
                    </label>
                    <input type="text" className="form-control"
                      placeholder="e.g. Diwali, Republic Day, Summer Break"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={{ borderRadius: 10, fontSize: 14, padding: "10px 14px" }} />
                  </div>

                  {/* Date range row */}
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold text-dark" style={{ fontSize: 13 }}>
                        Start Date <span className="text-danger">*</span>
                      </label>
                      <input type="date" className="form-control"
                        value={form.startDate}
                        onChange={(e) => handleStartChange(e.target.value)}
                        style={{ borderRadius: 10, fontSize: 14, padding: "10px 14px" }} />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold text-dark" style={{ fontSize: 13 }}>
                        End Date <span className="text-danger">*</span>
                      </label>
                      <input type="date" className="form-control"
                        value={form.endDate}
                        min={form.startDate}
                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        style={{ borderRadius: 10, fontSize: 14, padding: "10px 14px" }} />
                    </div>
                  </div>

                  {/* Live day count pill */}
                  {days > 0 && (
                    <div className="mb-3">
                      <div style={{
                        background: days === 1 ? "#F9FAFB" : "#EEF2FF",
                        border: `1.5px solid ${days === 1 ? "#E5E7EB" : "#C7D2FE"}`,
                        borderRadius: 10, padding: "10px 14px",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <i className="bi bi-calendar-range"
                          style={{ fontSize: 16, color: days === 1 ? "#6B7280" : "#4F46E5" }}></i>
                        <div>
                          <span className="fw-bold text-dark" style={{ fontSize: 15 }}>
                            {days} {days === 1 ? "day" : "days"}
                          </span>
                          {days > 1 && (
                            <span className="text-muted ms-2" style={{ fontSize: 13 }}>
                              {fmt(form.startDate, { day: "numeric", month: "short" })}
                              {" → "}
                              {fmt(form.endDate,   { day: "numeric", month: "short" })}
                            </span>
                          )}
                          {days === 1 && (
                            <span className="text-muted ms-2" style={{ fontSize: 13 }}>
                              {new Date(form.startDate).toLocaleDateString("en-IN", { weekday: "long" })}
                            </span>
                          )}
                        </div>
                        {days > 1 && (
                          <span style={{
                            marginLeft: "auto", background: "#4F46E5", color: "#fff",
                            borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                          }}>
                            Multi-day
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Type */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark" style={{ fontSize: 13 }}>
                      Holiday Type
                    </label>
                    <div className="d-flex gap-2 flex-wrap">
                      {Object.entries(TYPE_META).map(([val, meta]) => (
                        <button key={val} type="button"
                          onClick={() => setForm({ ...form, type: val })}
                          style={{
                            borderRadius: 10, fontSize: 13, fontWeight: 600,
                            padding: "8px 16px", border: "2px solid", cursor: "pointer",
                            borderColor: form.type === val ? meta.color  : "#E5E7EB",
                            background:  form.type === val ? meta.bg     : "#fff",
                            color:       form.type === val ? meta.color  : "#6B7280",
                          }}>
                          <i className={`bi ${meta.icon} me-1`}></i> {meta.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2" style={{ fontSize: 12, color: "#9CA3AF" }}>
                      <b style={{ color: "#374151" }}>Public</b> — all employees off &nbsp;·&nbsp;
                      <b style={{ color: "#374151" }}>Optional</b> — employee chooses &nbsp;·&nbsp;
                      <b style={{ color: "#374151" }}>Restricted</b> — limited to certain teams
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold text-dark" style={{ fontSize: 13 }}>
                      Description <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <textarea className="form-control" rows={2}
                      placeholder="Short note or reason..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      style={{ borderRadius: 10, fontSize: 14, padding: "10px 14px", resize: "none" }} />
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" onClick={closeModal}
                      style={{ borderRadius: 10, padding: "9px 20px", fontSize: 14,
                        background: "#F3F4F6", color: "#374151", fontWeight: 600, border: "none", cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting}
                      className="notice-btn"
                      style={{ borderRadius: 10, padding: "9px 24px", fontSize: 14, fontWeight: 600, border: "none" }}>
                      {submitting
                        ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Saving...</>
                        : isEditing ? "Update Holiday" : `Create Holiday${days > 1 ? ` (${days} days)` : ""}`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DELETE CONFIRM
      ══════════════════════════════════════════════════════════════════════ */}
      {deleteId && (
        <>
          <div onClick={() => setDeleteId(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1040 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)", zIndex: 1050,
            width: "100%", maxWidth: 400, padding: "0 16px" }}>
            <div className="card border-0 shadow-lg text-center" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                <div style={{ width: 56, height: 56, background: "#FEE2E2", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <i className="bi bi-trash" style={{ fontSize: 22, color: "#DC2626" }}></i>
                </div>
                <h5 className="fw-bold text-dark mb-1">Delete Holiday?</h5>
                <p className="text-muted mb-4" style={{ fontSize: 13 }}>
                  This cannot be undone. The holiday will be removed from all dashboards.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <button onClick={() => setDeleteId(null)}
                    style={{ borderRadius: 10, padding: "9px 20px", fontSize: 14,
                      background: "#F3F4F6", color: "#374151", fontWeight: 600, border: "none", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={() => handleDelete(deleteId)}
                    style={{ borderRadius: 10, padding: "9px 20px", fontSize: 14,
                      background: "#DC2626", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer" }}>
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export async function getServerSideProps(context) {
  const { req } = context;
  const cookie  = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}