// pages/employee/profile.js
"use client";
import { toast } from "react-toastify";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import Link from "next/link";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/employee/Leftbar";
import LeftbarMobile from "@/components/employee/LeftbarMobile";

// ─── Image Crop Modal ─────────────────────────────────────────────────────────
function CropModal({ src, onCancel, onCrop }) {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(new Image());
  const stateRef   = useRef({ scale: 1, ox: 0, oy: 0, dragging: false, lastX: 0, lastY: 0, pinchDist: 0 });
  const SIZE = 280; // canvas / crop circle diameter

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext("2d");
    const s      = stateRef.current;
    const img    = imgRef.current;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Draw image centered
    const w = img.naturalWidth  * s.scale;
    const h = img.naturalHeight * s.scale;
    ctx.drawImage(img, SIZE / 2 - w / 2 + s.ox, SIZE / 2 - h / 2 + s.oy, w, h);

    // Darken outside circle
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Circle border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    const img    = imgRef.current;
    img.onload   = () => {
      // Fit image to fill the circle initially
      const s = stateRef.current;
      const ratio = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      s.scale = ratio * 1.05;
      s.ox = 0; s.oy = 0;
      draw();
    };
    img.src = src;
  }, [src, draw]);

  // ── Pointer events (mouse + touch) ──
  const onPointerDown = (e) => {
    e.preventDefault();
    const s = stateRef.current;
    if (e.touches && e.touches.length === 2) {
      s.pinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      return;
    }
    s.dragging = true;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    s.lastX = x; s.lastY = y;
  };

  const onPointerMove = (e) => {
    e.preventDefault();
    const s = stateRef.current;
    if (e.touches && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (s.pinchDist) {
        s.scale = Math.max(0.3, Math.min(5, s.scale * (dist / s.pinchDist)));
        s.pinchDist = dist;
        draw();
      }
      return;
    }
    if (!s.dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    s.ox += x - s.lastX;
    s.oy += y - s.lastY;
    s.lastX = x; s.lastY = y;
    draw();
  };

  const onPointerUp = () => { stateRef.current.dragging = false; stateRef.current.pinchDist = 0; };

  const onWheel = (e) => {
    e.preventDefault();
    const s  = stateRef.current;
    s.scale  = Math.max(0.3, Math.min(5, s.scale * (e.deltaY > 0 ? 0.92 : 1.08)));
    draw();
  };

  // ── Export cropped circle ──
  const handleSave = () => {
    const s      = stateRef.current;
    const img    = imgRef.current;
    const out    = document.createElement("canvas");
    out.width    = SIZE; out.height = SIZE;
    const ctx    = out.getContext("2d");
    // clip to circle
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const w = img.naturalWidth  * s.scale;
    const h = img.naturalHeight * s.scale;
    ctx.drawImage(img, SIZE / 2 - w / 2 + s.ox, SIZE / 2 - h / 2 + s.oy, w, h);
    out.toBlob(blob => onCrop(blob), "image/jpeg", 0.92);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.75)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"16px" }}>
      <div style={{ background:"#1a1a2e", borderRadius:20, padding:"20px 20px 16px",
        maxWidth:340, width:"100%", boxShadow:"0 24px 60px rgba(0,0,0,.5)" }}>

        <div style={{ color:"#fff", fontWeight:700, fontSize:15, marginBottom:4, textAlign:"center" }}>
          Crop Profile Photo
        </div>
        <div style={{ color:"rgba(255,255,255,.5)", fontSize:12, textAlign:"center", marginBottom:14 }}>
          Drag to reposition · Scroll / pinch to zoom
        </div>

        <canvas ref={canvasRef} width={SIZE} height={SIZE}
          style={{ borderRadius:"50%", display:"block", margin:"0 auto",
            cursor:"grab", touchAction:"none",
            boxShadow:"0 0 0 3px rgba(255,255,255,.15)" }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
          onWheel={onWheel}
        />

        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:"10px", borderRadius:10, border:"none",
              background:"rgba(255,255,255,.12)", color:"#fff", fontWeight:600,
              fontSize:13, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave}
            style={{ flex:2, padding:"10px", borderRadius:10, border:"none",
              background:"linear-gradient(135deg,#2C2269,#4F46E5)", color:"#fff",
              fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Save & Upload
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const getInitials = (f, l) =>
  `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase() || "?";

// Compute profile completion score
function calcCompletion(emp) {
  const checks = [
    // Personal
    emp?.personal?.mobile,
    emp?.personal?.email,
    emp?.personal?.dob,
    emp?.personal?.address,
    emp?.personal?.city,
    emp?.personal?.state,
    emp?.personal?.maritalStatus,
    emp?.personal?.fatherName,
    // Professional (filled by HR)
    emp?.professional?.department,
    emp?.professional?.designation,
    emp?.professional?.dateOfJoining,
    // Salary / Bank
    emp?.salary?.bankName,
    emp?.salary?.accountNumber,
    emp?.salary?.ifscCode,
    emp?.salary?.panNumber,
    // Documents
    emp?.documents?.appointmentLetter,
    emp?.documents?.salarySlips?.length > 0,
    // Profile photo
    emp?.personal?.avatar,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

// Which sections are complete
function sectionStatus(emp) {
  return {
    personal: !!(
      emp?.personal?.mobile && emp?.personal?.email && emp?.personal?.dob &&
      emp?.personal?.address && emp?.personal?.city && emp?.personal?.state
    ),
    professional: !!(
      emp?.professional?.department && emp?.professional?.designation && emp?.professional?.dateOfJoining
    ),
    bank: !!(
      emp?.salary?.bankName && emp?.salary?.accountNumber && emp?.salary?.ifscCode && emp?.salary?.panNumber
    ),
    documents: !!(
      emp?.documents?.appointmentLetter || emp?.documents?.salarySlips?.length > 0
    ),
  };
}

const DOC_FIELDS = [
  { key: "appointmentLetter", label: "Appointment Letter",  icon: "bi-file-earmark-text",  multi: false },
  { key: "salarySlips",       label: "Salary Slips",        icon: "bi-receipt",             multi: true  },
  { key: "relievingLetter",   label: "Relieving Letter",    icon: "bi-file-earmark-minus",  multi: false },
  { key: "experienceLetter",  label: "Experience Letter",   icon: "bi-award",               multi: false },
];

export default function EmployeeProfile() {
  const router   = useRouter();
  const tokenRef = useRef(null);

  const [emp,        setEmp]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("overview");
  const [uploading,       setUploading]       = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropSrc,         setCropSrc]         = useState(null); // base64 for crop modal
  const [docFiles,        setDocFiles]        = useState({});
  const [lightbox,        setLightbox]        = useState(null); // { url, name }
  const avatarInputRef = useRef(null);

  // ── Fetch employee ────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    if (!token) { router.replace("/employee/login"); return; }
    tokenRef.current = token;

    fetch("/api/employee/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setEmp(d.employee); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completion = emp ? calcCompletion(emp) : 0;
  const sections   = emp ? sectionStatus(emp)  : {};

  // ── Upload documents ──────────────────────────────────────────────────────
  const handleDocUpload = async () => {
    if (!Object.keys(docFiles).length) {
      toast.error("Please select at least one document");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      Object.entries(docFiles).forEach(([key, files]) => {
        if (Array.isArray(files)) files.forEach((f) => fd.append(key, f));
        else if (files) fd.append(key, files);
      });

      const res  = await fetch("/api/employee/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message || "Upload failed"); return; }

      toast.success("Documents uploaded successfully");
      setEmp((prev) => ({ ...prev, documents: data.documents }));
      setDocFiles({});
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  // ── Step 1: file selected → show crop modal ──────────────────────────────
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Step 2: user saved crop → upload blob ─────────────────────────────────
  const handleCroppedUpload = async (blob) => {
    setCropSrc(null);
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", blob, "avatar.jpg");
      const res  = await fetch("/api/employee/upload-avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message || "Upload failed"); return; }
      toast.success("Profile photo updated!");
      setEmp((prev) => ({ ...prev, personal: { ...prev?.personal, avatar: data.avatar } }));
    } catch { toast.error("Upload failed"); }
    finally { setAvatarUploading(false); }
  };

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim();
  const dept = emp?.professional?.department || "—";
  const desig = emp?.professional?.designation || "—";
  const docs  = emp?.documents || {};

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* ════════════════════════════════════════════════
             EMPLOYEE PROFILE PAGE
          ════════════════════════════════════════════════ */

          .ep-root { display:flex; gap:24px; align-items:flex-start; }
          @media(max-width:900px){ .ep-root{ flex-direction:column; } }

          /* ── Sidebar card ── */
          .ep-sidebar {
            width:280px; flex-shrink:0;
            background:#fff; border:1px solid #F0F0F0; border-radius:18px;
            overflow:hidden;
          }
          @media(max-width:900px){ .ep-sidebar{ width:100%; } }

          .ep-sidebar-banner {
            height:80px;
            background:linear-gradient(135deg, #1e1b4b 0%, #4F46E5 60%, #7C3AED 100%);
          }
          .ep-avatar-wrap {
            padding:0 24px; margin-top:-36px; margin-bottom:14px;
          }
          .ep-avatar {
            width:80px; height:80px; border-radius:50%;
            background:linear-gradient(135deg,#2C2269,#4F46E5); color:#fff;
            display:flex; align-items:center; justify-content:center;
            font-size:26px; font-weight:800;
            border:4px solid #fff; box-shadow:0 2px 16px rgba(44,34,105,.25);
            overflow:hidden; position:relative;
          }
          .ep-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
          .ep-avatar-wrap { position:relative; display:inline-block; padding:0 24px; margin-top:-40px; margin-bottom:14px; }
          .ep-avatar-upload-btn {
            position:absolute; bottom:4px; right:22px;
            width:26px; height:26px; border-radius:50%;
            background:#2C2269; color:#fff; border:2.5px solid #fff;
            display:flex; align-items:center; justify-content:center;
            font-size:11px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.2);
            transition:background .15s;
          }
          .ep-avatar-upload-btn:hover { background:#3D2F8A; }
          .ep-avatar-upload-btn.loading { background:#9CA3AF; cursor:not-allowed; }
          .ep-sidebar-body { padding:0 24px 24px; }
          .ep-name  { font-size:16px; font-weight:700; color:#111827; margin-bottom:2px; }
          .ep-role  { font-size:12px; color:#6B7280; margin-bottom:16px; }
          .ep-empid { display:inline-block; background:#EEF2FF; color:#4F46E5; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; margin-bottom:16px; }

          /* Progress */
          .ep-progress-label { display:flex; justify-content:space-between; font-size:12px; font-weight:600; color:#374151; margin-bottom:6px; }
          .ep-progress-bar-bg { height:8px; background:#F0F0F0; border-radius:10px; overflow:hidden; margin-bottom:16px; }
          .ep-progress-bar-fill { height:100%; border-radius:10px; background:linear-gradient(90deg,#4F46E5,#7C3AED); transition:width .6s ease; }

          /* Section checklist */
          .ep-checklist { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
          .ep-check-item { display:flex; align-items:center; gap:8px; font-size:12.5px; }
          .ep-check-icon { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; }
          .ep-check-icon.done { background:#DCFCE7; color:#15803D; }
          .ep-check-icon.todo { background:#F3F4F6; color:#9CA3AF; }
          .ep-check-label { color:#374151; }
          .ep-check-label.done { color:#6B7280; text-decoration:line-through; }

          /* Complete Profile CTA */
          .ep-cta {
            display:flex; align-items:center; gap:8px;
            background:linear-gradient(135deg,#4F46E5,#7C3AED);
            color:#fff; border:none; border-radius:10px;
            padding:10px 16px; font-size:13px; font-weight:600;
            cursor:pointer; width:100%; justify-content:center;
            text-decoration:none; transition:opacity .2s;
          }
          .ep-cta:hover { opacity:.9; color:#fff; }

          /* ── Main area ── */
          .ep-main { flex:1; min-width:0; }

          /* Tabs */
          .ep-tabs { display:flex; gap:4px; background:#F3F4F6; border-radius:12px; padding:3px; margin-bottom:20px; flex-wrap:wrap; }
          .ep-tab {
            padding:7px 18px; border-radius:9px; font-size:13px; font-weight:600;
            border:none; background:transparent; color:#6B7280; cursor:pointer;
            transition:all .15s; white-space:nowrap;
          }
          .ep-tab.active { background:#fff; color:#4F46E5; box-shadow:0 1px 4px rgba(0,0,0,.1); }

          /* Info card */
          .ep-card { background:#fff; border:1px solid #F0F0F0; border-radius:14px; padding:22px 24px; margin-bottom:16px; }
          .ep-card-title { font-size:13px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.5px; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
          .ep-card-title i { font-size:15px; color:#4F46E5; }
          .ep-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
          @media(max-width:600px){ .ep-grid{ grid-template-columns:1fr; } }
          .ep-field-label { font-size:11px; color:#9CA3AF; font-weight:600; text-transform:uppercase; margin-bottom:3px; }
          .ep-field-val   { font-size:13.5px; color:#111827; font-weight:500; }
          .ep-field-val.empty { color:#D1D5DB; font-style:italic; }

          /* Documents */
          .ep-doc-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
          @media(max-width:600px){ .ep-doc-grid{ grid-template-columns:1fr; } }

          .ep-doc-card {
            border:1.5px solid #F0F0F0; border-radius:12px; padding:16px;
            display:flex; flex-direction:column; gap:10px;
            transition:border-color .15s;
          }
          .ep-doc-card.has-file { border-color:#BBF7D0; background:#F0FDF4; }
          .ep-doc-card.no-file  { border-color:#E5E7EB; background:#FAFAFA; }
          .ep-doc-head { display:flex; align-items:center; gap:10px; }
          .ep-doc-icon {
            width:38px; height:38px; border-radius:10px;
            display:flex; align-items:center; justify-content:center;
            font-size:16px; flex-shrink:0;
          }
          .ep-doc-icon.done { background:#DCFCE7; color:#15803D; }
          .ep-doc-icon.todo { background:#F3F4F6; color:#9CA3AF; }
          .ep-doc-label { font-weight:600; color:#111827; font-size:13px; }
          .ep-doc-sub   { font-size:11px; color:#9CA3AF; margin-top:1px; }

          .ep-doc-view-btn {
            display:inline-flex; align-items:center; gap:5px;
            padding:4px 12px; border-radius:8px; font-size:12px; font-weight:600;
            background:#EEF2FF; color:#4F46E5; border:none; cursor:pointer; text-decoration:none;
          }
          .ep-doc-view-btn:hover { background:#E0E7FF; color:#4F46E5; }

          /* Upload area */
          .ep-upload-zone {
            border:2px dashed #C7D2FE; border-radius:10px; padding:14px;
            text-align:center; cursor:pointer; transition:all .2s;
            background:#EEF2FF;
          }
          .ep-upload-zone:hover { border-color:#4F46E5; background:#E0E7FF; }
          .ep-upload-zone label { cursor:pointer; font-size:12px; color:#4F46E5; font-weight:600; }
          .ep-selected-files { font-size:11.5px; color:#15803D; margin-top:6px; }

          /* Upload submit btn */
          .ep-upload-btn {
            display:flex; align-items:center; gap:6px;
            padding:10px 22px; border-radius:10px; border:none;
            background:#4F46E5; color:#fff; font-size:13px; font-weight:600;
            cursor:pointer; transition:background .15s; margin-top:8px;
          }
          .ep-upload-btn:hover:not(:disabled) { background:#4338CA; }
          .ep-upload-btn:disabled { opacity:.55; cursor:not-allowed; }

          /* Incomplete banner */
          .ep-incomplete-banner {
            display:flex; align-items:center; gap:14px;
            background:linear-gradient(135deg,#FEF3C7,#FFFBEB);
            border:1.5px solid #FCD34D; border-radius:14px;
            padding:16px 20px; margin-bottom:20px;
          }
          .ep-incomplete-banner i { font-size:22px; color:#D97706; flex-shrink:0; }
          .ep-incomplete-banner h6 { font-weight:700; color:#92400E; margin:0 0 2px; }
          .ep-incomplete-banner p  { font-size:12.5px; color:#B45309; margin:0; }

          /* Status badge */
          .ep-status-badge {
            display:inline-flex; align-items:center; gap:5px;
            padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700;
          }
          .ep-status-badge.complete  { background:#DCFCE7; color:#166534; }
          .ep-status-badge.partial   { background:#FEF9C3; color:#854D0E; }
          .ep-status-badge.incomplete{ background:#FEE2E2; color:#991B1B; }

          /* Lightbox */
          .ep-lightbox-bg {
            position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:2000;
            display:flex; align-items:center; justify-content:center;
          }
          .ep-lightbox {
            background:#fff; border-radius:14px; overflow:hidden;
            max-width:90vw; max-height:90vh; box-shadow:0 20px 60px rgba(0,0,0,.3);
            display:flex; flex-direction:column;
          }
          .ep-lightbox-header { padding:14px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #F0F0F0; }
          .ep-lightbox-header h6 { margin:0; font-weight:700; color:#111827; }
          .ep-lightbox-close { background:#F3F4F6; border:none; border-radius:8px; width:30px; height:30px; cursor:pointer; color:#6B7280; }
          .ep-lightbox-body { flex:1; overflow:auto; padding:16px; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <Leftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            {/* Breadcrumb */}
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/employee/dashboard"><img src="/icons/home.svg" alt="" /> Home</Link>
                </li>
                <li className="breadcrumb-item active">My Profile</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              {/* Incomplete profile banner */}
              {completion < 100 && (() => {
                const firstStep = !sections.personal ? 1 : !sections.professional ? 2 : !sections.bank ? 3 : 4;
                const missingLabel = firstStep === 1 ? "Personal Info" : firstStep === 2 ? "Professional Info" : firstStep === 3 ? "Bank Details" : "Documents";
                return (
                  <div className="ep-incomplete-banner">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <div style={{ flex:1 }}>
                      <h6>Profile {completion}% Complete — {missingLabel} missing</h6>
                      <p>Complete your profile to ensure accurate payroll processing and HR records.</p>
                    </div>
                    <Link href={`/employee/complete-profile?step=${firstStep}`} className="ep-cta" style={{ width:"auto", padding:"9px 18px" }}>
                      <i className="bi bi-pencil-fill"></i> Complete Now
                    </Link>
                  </div>
                );
              })()}

              <div className="ep-root">
                {/* ── Sidebar ── */}
                <div className="ep-sidebar">
                  <div className="ep-sidebar-banner"></div>
                  <div className="ep-avatar-wrap">
                    <div className="ep-avatar">
                      {emp?.personal?.avatar
                        ? <img src={emp.personal.avatar} alt="Profile" />
                        : getInitials(emp?.firstName, emp?.lastName)
                      }
                    </div>
                    {/* Hidden file input */}
                    <input ref={avatarInputRef} type="file" accept="image/*"
                      style={{ display:"none" }} onChange={handleAvatarUpload} />
                    {/* Camera button */}
                    <button
                      className={`ep-avatar-upload-btn ${avatarUploading ? "loading" : ""}`}
                      onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                      title="Upload profile photo">
                      {avatarUploading
                        ? <i className="bi bi-hourglass-split" style={{ fontSize:10 }} />
                        : <i className="bi bi-camera-fill" style={{ fontSize:11 }} />}
                    </button>
                  </div>
                  <div className="ep-sidebar-body">
                    <div className="ep-name">{name}</div>
                    <div className="ep-role">{desig} · {dept}</div>
                    {emp?.employeeId && <span className="ep-empid">{emp.employeeId}</span>}

                    {/* Completion progress */}
                    <div className="ep-progress-label">
                      <span>Profile Completion</span>
                      <span style={{ color: completion === 100 ? "#15803D" : "#B45309" }}>{completion}%</span>
                    </div>
                    <div className="ep-progress-bar-bg">
                      <div className="ep-progress-bar-fill" style={{ width:`${completion}%` }}></div>
                    </div>

                    {/* Section checklist */}
                    <div className="ep-checklist">
                      {[
                        { key:"photo",        label:"Profile Photo",   done:!!emp?.personal?.avatar },
                        { key:"personal",     label:"Personal Info",   done:sections.personal       },
                        { key:"professional", label:"Professional",    done:sections.professional   },
                        { key:"bank",         label:"Bank Details",    done:sections.bank           },
                        { key:"documents",    label:"Documents",       done:sections.documents      },
                      ].map(({ key, label, done }) => (
                        <div key={key} className="ep-check-item">
                          <div className={`ep-check-icon ${done ? "done" : "todo"}`}>
                            <i className={`bi bi-${done ? "check-lg" : "circle"}`}></i>
                          </div>
                          <span className={`ep-check-label ${done ? "done" : ""}`}>{label}</span>
                          {done && <i className="bi bi-check-circle-fill ms-auto" style={{ color:"#15803D", fontSize:12 }}></i>}
                        </div>
                      ))}
                    </div>

                    {completion < 100 && (
                      <Link href={`/employee/complete-profile?step=${!sections.personal ? 1 : !sections.professional ? 2 : !sections.bank ? 3 : 4}`} className="ep-cta">
                        <i className="bi bi-pencil-fill"></i>
                        {completion === 0 ? "Complete Profile" : "Update Profile"}
                      </Link>
                    )}
                    {completion === 100 && (
                      <span className="ep-status-badge complete" style={{ width:"100%", justifyContent:"center" }}>
                        <i className="bi bi-shield-fill-check"></i> Profile Complete
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Main content ── */}
                <div className="ep-main">
                  {/* Tabs */}
                  <div className="ep-tabs">
                    {[
                      { key:"overview",     label:"Overview",     icon:"bi-person"              },
                      { key:"professional", label:"Professional", icon:"bi-briefcase"            },
                      { key:"bank",         label:"Bank & Salary",icon:"bi-credit-card"          },
                      { key:"documents",    label:"Documents",    icon:"bi-folder2-open"         },
                    ].map((t) => (
                      <button key={t.key} className={`ep-tab ${activeTab === t.key ? "active" : ""}`}
                        onClick={() => setActiveTab(t.key)}>
                        <i className={`bi ${t.icon} me-1`}></i>{t.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Overview ── */}
                  {activeTab === "overview" && (
                    <div className="ep-card">
                      <div className="ep-card-title"><i className="bi bi-person-fill"></i>Personal Information</div>
                      <div className="ep-grid">
                        {[
                          ["Full Name",      `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim()],
                          ["Employee ID",    emp?.employeeId],
                          ["Mobile",         emp?.personal?.mobile],
                          ["Email",          emp?.personal?.email || emp?.email],
                          ["Date of Birth",  fmtDate(emp?.personal?.dob)],
                          ["Marital Status", emp?.personal?.maritalStatus],
                          ["Father's Name",  emp?.personal?.fatherName],
                          ["Mother's Name",  emp?.personal?.motherName],
                          ["Address",        emp?.personal?.address],
                          ["City",           emp?.personal?.city],
                          ["State",          emp?.personal?.state],
                          ["Zip Code",       emp?.personal?.zip],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <div className="ep-field-label">{label}</div>
                            <div className={`ep-field-val ${val ? "" : "empty"}`}>{val || "Not provided"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Professional ── */}
                  {activeTab === "professional" && (
                    <div className="ep-card">
                      <div className="ep-card-title"><i className="bi bi-briefcase-fill"></i>Professional Information</div>
                      <div className="ep-grid">
                        {[
                          ["Department",        emp?.professional?.department],
                          ["Designation",       emp?.professional?.designation],
                          ["Employee Type",     emp?.professional?.employeeType],
                          ["Employment Status", emp?.professional?.status],
                          ["Official Email",    emp?.professional?.officialEmail],
                          ["Date of Joining",   fmtDate(emp?.professional?.dateOfJoining)],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <div className="ep-field-label">{label}</div>
                            <div className={`ep-field-val ${val ? "" : "empty"}`}>{val || "Not provided"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Bank ── */}
                  {activeTab === "bank" && (
                    <>
                      <div className="ep-card">
                        <div className="ep-card-title"><i className="bi bi-bank"></i>Bank Details</div>
                        <div className="ep-grid">
                          {[
                            ["Account Holder", emp?.salary?.accountHolderName],
                            ["Bank Name",      emp?.salary?.bankName],
                            ["Branch",         emp?.salary?.branch],
                            ["Account Number", emp?.salary?.accountNumber ? "••••" + emp.salary.accountNumber.slice(-4) : null],
                            ["IFSC Code",      emp?.salary?.ifscCode],
                            ["PAN Number",     emp?.salary?.panNumber ? emp.salary.panNumber.slice(0,3) + "••••" + emp.salary.panNumber.slice(-1) : null],
                            ["UPI ID",         emp?.salary?.upiId],
                          ].map(([label, val]) => (
                            <div key={label}>
                              <div className="ep-field-label">{label}</div>
                              <div className={`ep-field-val ${val ? "" : "empty"}`}>{val || "Not provided"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="ep-card">
                        <div className="ep-card-title"><i className="bi bi-cash-coin"></i>Salary</div>
                        <div className="ep-grid">
                          {[
                            ["Monthly Salary", emp?.salary?.monthlySalary ? `₹${Number(emp.salary.monthlySalary).toLocaleString("en-IN")}` : null],
                            ["Annual Salary",  emp?.salary?.annualSalary  ? `₹${Number(emp.salary.annualSalary).toLocaleString("en-IN")}`  : null],
                          ].map(([label, val]) => (
                            <div key={label}>
                              <div className="ep-field-label">{label}</div>
                              <div className={`ep-field-val ${val ? "" : "empty"}`}>{val || "Set by HR"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Documents ── */}
                  {activeTab === "documents" && (
                    <>
                      {/* Existing docs */}
                      <div className="ep-card">
                        <div className="ep-card-title"><i className="bi bi-folder2-open"></i>Uploaded Documents</div>
                        <div className="ep-doc-grid">
                          {DOC_FIELDS.map(({ key, label, icon, multi }) => {
                            const val   = docs[key];
                            const files = multi
                              ? (Array.isArray(val) ? val : val ? [val] : [])
                              : val ? [val] : [];
                            const hasDocs = files.length > 0;

                            return (
                              <div key={key} className={`ep-doc-card ${hasDocs ? "has-file" : "no-file"}`}>
                                <div className="ep-doc-head">
                                  <div className={`ep-doc-icon ${hasDocs ? "done" : "todo"}`}>
                                    <i className={`bi ${icon}`}></i>
                                  </div>
                                  <div>
                                    <div className="ep-doc-label">{label}</div>
                                    <div className="ep-doc-sub">
                                      {hasDocs
                                        ? `${files.length} file${files.length > 1 ? "s" : ""} uploaded`
                                        : "Not uploaded"}
                                    </div>
                                  </div>
                                </div>

                                {hasDocs && (
                                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                                    {files.map((url, i) => (
                                      <button key={i} className="ep-doc-view-btn"
                                        onClick={() => setLightbox({ url, name: `${label} ${files.length > 1 ? i+1 : ""}` })}>
                                        <i className="bi bi-eye"></i>
                                        View {files.length > 1 ? `(${i+1})` : ""}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {!hasDocs && (
                                  <span style={{ fontSize:11, color:"#9CA3AF" }}>
                                    <i className="bi bi-upload me-1"></i>Upload below ↓
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Upload new docs */}
                      <div className="ep-card">
                        <div className="ep-card-title"><i className="bi bi-cloud-upload"></i>Upload / Update Documents</div>
                        <div className="ep-doc-grid">
                          {DOC_FIELDS.map(({ key, label, icon, multi }) => (
                            <div key={key}>
                              <div style={{ fontSize:12.5, fontWeight:600, color:"#374151", marginBottom:6 }}>
                                <i className={`bi ${icon} me-1`} style={{ color:"#4F46E5" }}></i>{label}
                              </div>
                              <div className="ep-upload-zone"
                                onClick={() => document.getElementById(`doc-input-${key}`).click()}>
                                <input id={`doc-input-${key}`} type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  multiple={multi} className="d-none"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setDocFiles((prev) => ({
                                      ...prev,
                                      [key]: multi ? files : files[0] || null,
                                    }));
                                  }}
                                />
                                <i className="bi bi-cloud-upload" style={{ fontSize:20, color:"#4F46E5", display:"block", marginBottom:4 }}></i>
                                <label htmlFor={`doc-input-${key}`}>
                                  {docFiles[key]
                                    ? (Array.isArray(docFiles[key])
                                        ? `${docFiles[key].length} file(s) selected`
                                        : docFiles[key].name)
                                    : "Click to select"}
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button className="ep-upload-btn" onClick={handleDocUpload} disabled={uploading || !Object.keys(docFiles).length}>
                          {uploading
                            ? <><div className="spinner-border spinner-border-sm" role="status"></div> Uploading…</>
                            : <><i className="bi bi-cloud-upload-fill"></i> Upload Documents</>}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Image Crop Modal ── */}
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onCrop={handleCroppedUpload}
        />
      )}

      {/* ── Lightbox / doc viewer ── */}
      {lightbox && (
        <div className="ep-lightbox-bg" onClick={() => setLightbox(null)}>
          <div className="ep-lightbox" onClick={(e) => e.stopPropagation()}>
            <div className="ep-lightbox-header">
              <h6>{lightbox.name}</h6>
              <button className="ep-lightbox-close" onClick={() => setLightbox(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="ep-lightbox-body">
              {lightbox.url?.endsWith(".pdf") || lightbox.url?.includes("pdf")
                ? <iframe src={lightbox.url} style={{ width:"70vw", height:"75vh", border:"none" }} title={lightbox.name} />
                : <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth:"70vw", maxHeight:"75vh", borderRadius:8 }} />
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
}