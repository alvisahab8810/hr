import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const STAGE_COLORS = ["#F59E0B", "#6366F1", "#10B981", "#EC4899"];
const STAGE_NAMES  = ["Script/Concept", "Shoot", "Design/Edit/Develop", "Posted/Live"];
const STAGE_KEYS   = ["S1", "S2", "S3", "S4"];

/* ── Drive helpers ──────────────────────────────────────────────────────── */
function getDriveFileId(url) {
  if (!url) return null;
  let m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
function getDriveFolderId(url) {
  if (!url) return null;
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
function getDriveEmbedUrl(url) {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}
function getFirstProofUrl(stg, task) {
  const urls = (stg?.proofUrls || []).filter(Boolean);
  return urls[urls.length - 1] || task?.proofLink || null;
}

/* ── Drive folder carousel (admin) ─────────────────────────────────────── */
function DriveCarousel({ folderId, proofUrl }) {
  const [files, setFiles] = useState(null);
  const [idx,   setIdx]   = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/client/drive-folder?folderId=${folderId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setError(d.message || "Failed to load"); return; }
        if (d.fallback || d.files.length === 0) { setFiles([]); return; }
        setFiles(d.files);
      })
      .catch(() => setError("Network error"));
  }, [folderId]);

  if (files === null) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#94a3b8" }}>
      <div className="spinner-border spinner-border-sm text-primary" />
      <span style={{ fontSize: 12 }}>Loading preview…</span>
    </div>
  );

  if (error || files.length === 0) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <iframe
        src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`}
        style={{ flex: 1, border: "none", width: "100%" }}
        title="Drive folder"
      />
      {error && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.7)", color: "#fca5a5", fontSize: 11, padding: "6px 12px", textAlign: "center" }}>
          {error} — showing folder view
        </div>
      )}
      <a href={proofUrl} target="_blank" rel="noreferrer"
        style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, padding: "4px 10px", borderRadius: 6, textDecoration: "none", zIndex: 2 }}>
        Open folder ↗
      </a>
    </div>
  );

  const file     = files[idx];
  const embedUrl = `https://drive.google.com/file/d/${file.id}/preview`;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative", background: "#0f172a" }}>
        <iframe
          key={file.id}
          src={embedUrl}
          style={{ width: "100%", height: "100%", border: "none", position: "absolute", inset: 0 }}
          allow="autoplay"
          allowFullScreen
          title={file.name}
        />
        {files.length > 1 && (<>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,.55)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.3 : 1, zIndex: 3 }}>
            <i className="bi bi-chevron-left" />
          </button>
          <button onClick={() => setIdx(i => Math.min(files.length - 1, i + 1))} disabled={idx === files.length - 1}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,.55)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === files.length - 1 ? 0.3 : 1, zIndex: 3 }}>
            <i className="bi bi-chevron-right" />
          </button>
          <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, zIndex: 3 }}>
            {idx + 1} / {files.length}
          </div>
        </>)}
      </div>
      {files.length > 1 && (
        <div style={{ display: "flex", gap: 4, padding: "6px 8px", background: "#0f172a", overflowX: "auto", flexShrink: 0 }}>
          {files.map((f, i) => (
            <button key={f.id} onClick={() => setIdx(i)}
              style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 6, border: i === idx ? "2px solid #4F46E5" : "2px solid transparent", background: "#1e293b", cursor: "pointer", overflow: "hidden", padding: 0, position: "relative" }}>
              {f.thumbnailLink
                ? <img src={f.thumbnailLink} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: i === idx ? "#4F46E5" : "#64748b", fontSize: 16 }}><i className="bi bi-image" /></div>
              }
            </button>
          ))}
        </div>
      )}
      <a href={proofUrl} target="_blank" rel="noreferrer"
        style={{ display: "block", textAlign: "center", background: "#1e293b", color: "#94a3b8", fontSize: 11, padding: "5px 0", textDecoration: "none", flexShrink: 0 }}>
        <i className="bi bi-folder2-open me-1" />Open folder in Drive
      </a>
    </div>
  );
}

/* ── Admin Preview Modal ────────────────────────────────────────────────── */
function AdminPreviewModal({ task, stg, stageIdx, type, onClose, onApprove, onReject, readOnly, saving }) {
  const [rejectMode,   setRejectMode]   = useState(false);
  const [rejectText,   setRejectText]   = useState("");
  const [newDeadline,  setNewDeadline]  = useState("");

  const proofUrl  = getFirstProofUrl(stg, task);
  const folderId  = getDriveFolderId(proofUrl);
  const embedUrl  = folderId ? null : getDriveEmbedUrl(proofUrl);
  const isVideo   = ["reel", "story"].includes(task.contentType);
  const stageName = stageIdx >= 0 ? STAGE_NAMES[stageIdx] : null;
  const stageColor= stageIdx >= 0 ? STAGE_COLORS[stageIdx] : "#4F46E5";

  function handleApprove() { onApprove(); onClose(); }
  function handleReject()  {
    if (!rejectText.trim()) { toast.error("Please enter a rejection reason"); return; }
    onReject(rejectText, newDeadline);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 940, maxHeight: "90vh", display: "flex", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.25)" }}>

        {/* Left — Drive preview */}
        <div style={{ flex: "0 0 56%", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 420, overflow: "hidden" }}>
          {folderId ? (
            <DriveCarousel folderId={folderId} proofUrl={proofUrl} />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              style={{ width: "100%", height: "100%", border: "none", position: "absolute", inset: 0 }}
              allow="autoplay; fullscreen"
              allowFullScreen
              title={task.nomenclature || task.title}
            />
          ) : (
            <div style={{ textAlign: "center", color: "#64748b", padding: 32 }}>
              <i className={`bi bi-${isVideo ? "camera-video" : "image"}`} style={{ fontSize: 52, marginBottom: 14, display: "block", opacity: .4 }} />
              <div style={{ fontSize: 13, marginBottom: 8 }}>No preview available</div>
              {proofUrl && (
                <a href={proofUrl} target="_blank" rel="noreferrer"
                  style={{ color: "#4F46E5", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <i className="bi bi-box-arrow-up-right" />Open file
                </a>
              )}
            </div>
          )}
          {/* Content type badge */}
          {!folderId && task.contentType && (
            <div style={{ position: "absolute", top: 12, left: 12, background: stageColor, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 5, zIndex: 2 }}>
              {task.contentType.toUpperCase()}
            </div>
          )}
          {/* Drive link for single files */}
          {!folderId && proofUrl && (
            <a href={proofUrl} target="_blank" rel="noreferrer"
              style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.12)", backdropFilter: "blur(6px)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6, textDecoration: "none", border: "1px solid rgba(255,255,255,.2)", zIndex: 2, display: "flex", alignItems: "center", gap: 5 }}>
              <i className="bi bi-google" />Open in Drive
            </a>
          )}
        </div>

        {/* Right — info + actions */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4, maxWidth: 260, wordBreak: "break-word" }}>
                {task.nomenclature || task.title}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {stageName
                  ? <span>Stage: <strong style={{ color: stageColor }}>{stageName}</strong></span>
                  : <span>Submitted: {stg?.doneAt ? new Date(stg.doneAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : fmtDate(task.updatedAt || task.createdAt)}</span>
                }
              </div>
              {task.brandId?.name && (
                <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 700, background: (task.brandId.color || "#6366F1") + "20", color: task.brandId.color || "#6366F1", borderRadius: 20, padding: "1px 8px" }}>
                  {task.brandId.name}
                </span>
              )}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, padding: "0 4px", flexShrink: 0 }}>
              <i className="bi bi-x-lg" />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {/* Open in Google Drive button */}
            {proofUrl && (
              <a href={proofUrl} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, color: "#3B82F6", fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 16, background: "#EFF6FF", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #BFDBFE" }}>
                <i className="bi bi-google" style={{ fontSize: 14 }} />Open in Google Drive
                <i className="bi bi-box-arrow-up-right" style={{ marginLeft: "auto", fontSize: 11 }} />
              </a>
            )}

            {/* Stage note */}
            {stg?.doneNote && (
              <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "#0369A1", marginBottom: 14 }}>
                <i className="bi bi-chat-text me-2" /><strong>Employee note:</strong> {stg.doneNote}
              </div>
            )}

            {/* Caption / description */}
            {task.caption && (
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#374151", marginBottom: 14, lineHeight: 1.7 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>Caption</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{task.caption}</div>
              </div>
            )}

            {/* All proof URLs */}
            {(stg?.proofUrls || []).filter(Boolean).length > 1 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>All Proof Files</div>
                {stg.proofUrls.filter(Boolean).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#4F46E5", textDecoration: "none", marginBottom: 4, fontWeight: 600 }}>
                    <i className="bi bi-link-45deg" />{url.length > 50 ? url.slice(0, 50) + "…" : url}
                  </a>
                ))}
              </div>
            )}

            {/* Decision area */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".5px" }}>
              Your Decision
            </div>

            {readOnly ? (
              type === "stage" ? (
                stg?.approved ? (
                  <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#15803D", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="bi bi-check-circle-fill" /> Stage Approved
                  </div>
                ) : (
                  <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", display: "flex", alignItems: "center", gap: 6 }}><i className="bi bi-x-circle-fill" /> Stage Rejected</div>
                    {stg?.rejectReason && <div style={{ fontSize: 12, color: "#991B1B", marginTop: 4 }}>Reason: {stg.rejectReason}</div>}
                  </div>
                )
              ) : (
                task.status === "completed" ? (
                  <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#15803D", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="bi bi-check-circle-fill" /> Task Approved
                  </div>
                ) : (
                  <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", display: "flex", alignItems: "center", gap: 6 }}><i className="bi bi-x-circle-fill" /> Task Rejected</div>
                    {task.reviewNote && <div style={{ fontSize: 12, color: "#991B1B", marginTop: 4 }}>Reason: {task.reviewNote}</div>}
                  </div>
                )
              )
            ) : !rejectMode ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleApprove} disabled={saving}
                  style={{ flex: 1, padding: "11px", border: "2px solid #16A34A", borderRadius: 8, background: "#DCFCE7", color: "#15803D", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  {saving ? "…" : <><i className="bi bi-check-circle" />Approve</>}
                </button>
                <button onClick={() => setRejectMode(true)} disabled={saving}
                  style={{ flex: 1, padding: "11px", border: "2px solid #E2E8F0", borderRadius: 8, background: "#fff", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <i className="bi bi-x-circle" />Reject
                </button>
              </div>
            ) : (
              <div>
                <textarea
                  placeholder="Enter rejection reason…"
                  value={rejectText}
                  onChange={e => setRejectText(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 68, marginBottom: 8 }}
                />
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 4 }}>
                    New Deadline <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span>
                  </label>
                  <input type="datetime-local" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "inherit", background: "#FFF5F5" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleReject} disabled={saving || !rejectText.trim()}
                    style={{ flex: 1, background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {saving ? "…" : <><i className="bi bi-send me-1" />Send Rejection</>}
                  </button>
                  <button onClick={() => { setRejectMode(false); setRejectText(""); setNewDeadline(""); }}
                    style={{ flex: 1, background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
            <button onClick={onClose} style={{ padding: "8px 18px", background: "none", color: "#64748b", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [allTasks,  setAllTasks]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState({});
  const [expanded,  setExpanded]  = useState({});
  const [statusTab, setStatusTab] = useState("pending"); // pending | approved | rejected | all
  const [preview,   setPreview]   = useState(null); // { task, stg, stageIdx, type }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/tasks?limit=500&hideCompleted=false", { credentials: "include" });
      const d = await r.json();
      if (d.success) {
        // Show ALL tasks that have gone through any approval activity
        const relevant = (d.tasks || []).filter(t =>
          (t.stages || []).some(s => s.done || s.approved || s.rejected)
          || ["review", "completed", "blocked", "in_progress"].includes(t.status)
        );
        setAllTasks(relevant);
      }
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approveStage(task, stageIdx) {
    const key = `${task._id}_${stageIdx}`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      const stages = (task.stages || []).map((s, i) =>
        i === stageIdx ? { ...s, done: true, approved: true, rejected: false, rejectReason: "", doneAt: s.doneAt || new Date().toISOString() } : s
      );
      const nextAssigned = (task.stages?.[stageIdx + 1]?.assignedTo || []);
      const isLast = stageIdx === 3;
      const updates = {
        stages,
        stage:  isLast ? "S4" : STAGE_KEYS[stageIdx + 1],
        status: isLast ? "completed"
               : (stageIdx === 0 && nextAssigned.length === 0) ? "completed"
               : nextAssigned.length > 0 ? "in_progress" : "review",
      };
      if (isLast || (stageIdx === 0 && nextAssigned.length === 0)) updates.stage = "S4";

      const res = await fetch(`/api/admin/tasks/${task._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) { toast.success("Approved!"); load(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  }

  async function rejectStage(task, stageIdx, reason, newDeadline) {
    if (!reason?.trim()) return toast.error("Rejection reason required");
    const key = `${task._id}_${stageIdx}_rej`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      const stages = (task.stages || []).map((s, i) =>
        i === stageIdx ? {
          ...s,
          done: false,
          approved: false,
          rejected: true,
          rejectReason: reason,
          doneAt: null,
          ...(newDeadline ? { deadline: new Date(newDeadline).toISOString() } : {}),
        } : s
      );
      const res = await fetch(`/api/admin/tasks/${task._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages, status: "in_progress", stage: STAGE_KEYS[stageIdx] }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Rejected & returned to employee"); load(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  }

  async function approveTask(task) {
    const key = `${task._id}_task`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      const now = new Date().toISOString();
      const updates = { status: "completed" };
      // For production tasks, also mark S1 stage as done + approved so calendars pick it up
      if (task.taskType === "production" && task.stages?.length > 0) {
        updates.stages = (task.stages || []).map((s, i) =>
          i === 0 ? { ...s, done: true, approved: true, rejected: false, rejectReason: "", doneAt: s.doneAt || now } : s
        );
      }
      const res = await fetch(`/api/admin/tasks/${task._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) { toast.success("Task approved!"); load(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  }

  async function rejectTask(task, reason, newDeadline) {
    if (!reason?.trim()) return toast.error("Rejection reason required");
    const key = `${task._id}_task_rej`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      const res = await fetch(`/api/admin/tasks/${task._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "blocked",
          reviewNote: reason,
          ...(newDeadline ? { dueDate: new Date(newDeadline).toISOString() } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Rejected & returned to employee"); load(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  }

  // Build flat list of all approval items (one entry per stage, plus task-level reviews)
  function buildItems(taskList) {
    const items = [];
    taskList.forEach(t => {
      const stages = t.stages || [];
      if (stages.length > 0) {
        let hasStageActivity = false;
        stages.forEach((s, i) => {
          if (s.done || s.approved || s.rejected) {
            hasStageActivity = true;
            items.push({ task: t, stageIdx: i, stg: s, type: "stage" });
          }
        });
        // Production task in "review" status but no stage marked done yet (e.g. submitted via old flow)
        if (!hasStageActivity && ["review", "completed", "blocked"].includes(t.status)) {
          items.push({ task: t, stageIdx: -1, stg: null, type: "task" });
        }
      } else {
        // Non-production task (no stages) - show at task level
        if (["review", "completed", "blocked", "in_progress"].includes(t.status)) {
          items.push({ task: t, stageIdx: -1, stg: null, type: "task" });
        }
      }
    });
    return items;
  }

  const allItems     = buildItems(allTasks);
  const pendingItems = allItems.filter(({ stg, task, type }) =>
    type === "stage"
      ? (stg.done && !stg.approved && !stg.rejected)
      : task.status === "review"
  );
  const approvedItems = allItems.filter(({ stg, task, type }) =>
    type === "stage" ? stg.approved : task.status === "completed"
  );
  const rejectedItems = allItems.filter(({ stg, task, type }) =>
    type === "stage" ? stg.rejected : task.status === "blocked"
  );

  const displayedItems = statusTab === "pending"  ? pendingItems
                       : statusTab === "approved" ? approvedItems
                       : statusTab === "rejected" ? rejectedItems
                       : allItems;

  const pendingCount  = pendingItems.length;
  const approvedCount = approvedItems.length;
  const rejectedCount = rejectedItems.length;
  const totalCount    = allItems.length;

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Approvals — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .ap-card { background:#fff; border-radius:14px; border:1.5px solid #F1F5F9; padding:0; margin-bottom:14px; overflow:hidden; transition:box-shadow .12s; }
          .ap-card:hover { box-shadow:0 4px 20px rgba(99,102,241,.08); }
          .ap-card-head { padding:14px 18px; display:flex; align-items:center; gap:12px; cursor:pointer; }
          .ap-card-body { padding:0 18px 16px; border-top:1px solid #F8FAFC; }
          .ap-content-box { background:#F8FAFC; border-radius:10px; padding:12px 14px; margin-bottom:12px; font-size:13px; color:#374151; white-space:pre-wrap; line-height:1.65; max-height:200px; overflow-y:auto; }
          .ap-stage-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
          .ap-actions { display:flex; gap:8px; margin-top:10px; }
          .ap-btn-approve { flex:1; background:#10B981; color:#fff; border:none; border-radius:8px; padding:9px 0; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
          .ap-btn-reject  { flex:1; background:#FEE2E2; color:#DC2626; border:1.5px solid #FCA5A5; border-radius:8px; padding:9px 0; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
          .ap-btn-view    { padding:8px 14px; background:#EEF2FF; color:#4F46E5; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-flex; align-items:center; gap:4px; }
          .ap-reject-input { width:100%; padding:8px 10px; border:1.5px solid #FCA5A5; border-radius:8px; font-size:12px; outline:none; font-family:inherit; resize:vertical; min-height:52px; margin-top:8px; }
          .ap-tab { padding:6px 14px; border-radius:8px; border:1.5px solid #E5E7EB; background:#fff; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; }
          .ap-tab.active { background:#4F46E5; color:#fff; border-color:#4F46E5; }
          .ap-proof-link { display:flex; align-items:center; gap:6px; font-size:12px; color:#4F46E5; text-decoration:none; margin-bottom:4px; word-break:break-all; }
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
                <li className="breadcrumb-item active">Approvals</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              {/* Header */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">
                    Approvals
                    {pendingCount > 0 && <span style={{ marginLeft: 10, background: "#EF4444", color: "#fff", fontSize: 12, fontWeight: 800, borderRadius: 20, padding: "2px 9px" }}>{pendingCount}</span>}
                  </h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Review and approve or reject submitted stage work</p>
                </div>
                <button onClick={load} style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="bi bi-arrow-clockwise" /> Refresh
                </button>
              </div>

              {/* Status tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                  { key: "pending",  label: "Pending",  count: pendingCount,  color: "#EF4444", bg: "#FEE2E2"  },
                  { key: "approved", label: "Approved", count: approvedCount, color: "#10B981", bg: "#DCFCE7"  },
                  { key: "rejected", label: "Rejected", count: rejectedCount, color: "#DC2626", bg: "#FEE2E2"  },
                  { key: "all",      label: "All",      count: totalCount,    color: "#4F46E5", bg: "#EEF2FF"  },
                ].map(tab => (
                  <button key={tab.key}
                    className={`ap-tab ${statusTab === tab.key ? "active" : ""}`}
                    onClick={() => setStatusTab(tab.key)}
                    style={statusTab !== tab.key ? { borderColor: tab.color + "50", color: tab.color } : {}}>
                    {tab.label}
                    <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 800,
                      background: statusTab === tab.key ? "rgba(255,255,255,.25)" : tab.bg,
                      color: statusTab === tab.key ? "#fff" : tab.color,
                      borderRadius: 20, padding: "1px 7px" }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Content */}
              {loading ? (
                <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" /> Loading…
                </div>
              ) : displayedItems.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", padding: "60px 40px", textAlign: "center", color: "#94A3B8" }}>
                  <i className="bi bi-check2-all" style={{ fontSize: 48, display: "block", marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>
                    {statusTab === "pending" ? "All caught up!" : `No ${statusTab} items`}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {statusTab === "pending" ? "No tasks are waiting for your approval" : `Nothing to show in this tab`}
                  </div>
                </div>
              ) : (
                displayedItems.map(({ task: t, stageIdx, stg, type }) => {
                  const key = stageIdx >= 0 ? `${t._id}_${stageIdx}` : t._id;
                  if (type === "stage") {
                    return (
                      <ApprovalCard
                        key={key}
                        task={t}
                        stageIdx={stageIdx}
                        stg={stg}
                        isOpen={!!expanded[key]}
                        onToggle={() => setExpanded(p => ({ ...p, [key]: !p[key] }))}
                        saving={!!saving[key] || !!saving[`${key}_rej`]}
                        onApprove={() => approveStage(t, stageIdx)}
                        onReject={(reason, deadline) => rejectStage(t, stageIdx, reason, deadline)}
                        readOnly={stg.approved || stg.rejected}
                        onPreview={() => setPreview({ task: t, stg, stageIdx, type: "stage" })}
                      />
                    );
                  }
                  return (
                    <ReviewCard
                      key={key}
                      task={t}
                      isOpen={!!expanded[key]}
                      onToggle={() => setExpanded(p => ({ ...p, [key]: !p[key] }))}
                      saving={!!saving[`${t._id}_task`] || !!saving[`${t._id}_task_rej`]}
                      onApprove={() => approveTask(t)}
                      onReject={(reason, deadline) => rejectTask(t, reason, deadline)}
                      readOnly={["completed", "blocked"].includes(t.status)}
                      onPreview={() => setPreview({ task: t, stg: null, stageIdx: -1, type: "task" })}
                    />
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Admin Drive Preview Modal */}
      {preview && (
        <AdminPreviewModal
          task={preview.task}
          stg={preview.stg}
          stageIdx={preview.stageIdx}
          type={preview.type}
          onClose={() => setPreview(null)}
          readOnly={
            preview.type === "stage"
              ? (preview.stg?.approved || preview.stg?.rejected)
              : ["completed", "blocked"].includes(preview.task.status)
          }
          saving={
            preview.type === "stage"
              ? (!!saving[`${preview.task._id}_${preview.stageIdx}`] || !!saving[`${preview.task._id}_${preview.stageIdx}_rej`])
              : (!!saving[`${preview.task._id}_task`] || !!saving[`${preview.task._id}_task_rej`])
          }
          onApprove={() => {
            if (preview.type === "stage") approveStage(preview.task, preview.stageIdx);
            else approveTask(preview.task);
          }}
          onReject={(reason, deadline) => {
            if (preview.type === "stage") rejectStage(preview.task, preview.stageIdx, reason, deadline);
            else rejectTask(preview.task, reason, deadline);
          }}
        />
      )}
    </div>
  );
}

/* ── Review Card (non-production tasks with status=review) ─────────────── */
function ReviewCard({ task: t, isOpen, onToggle, saving, onApprove, onReject, readOnly, onPreview }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectText, setRejectText] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const TYPE_LABELS = { project: "Project", sprint: "Sprint", manual: "Task", production: "Production" };
  const TYPE_COLORS = { project: "#7C3AED", sprint: "#F59E0B", manual: "#64748B", production: "#10B981" };
  const color = TYPE_COLORS[t.taskType] || "#64748B";

  return (
    <div className="ap-card">
      <div className="ap-card-head" onClick={onToggle}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="bi bi-send-check-fill" style={{ fontSize: 14, color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.nomenclature || t.title}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
            {t.brandId?.name && (
              <span style={{ fontSize: 11, fontWeight: 700, background: (t.brandId.color || "#6366F1") + "20", color: t.brandId.color || "#6366F1", borderRadius: 20, padding: "1px 8px" }}>
                {t.brandId.name}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, background: color + "18", color, borderRadius: 20, padding: "2px 8px" }}>
              {TYPE_LABELS[t.taskType] || t.taskType}
            </span>
            <span style={{ fontSize: 10, background: "#FEF3C7", color: "#B45309", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
              Pending Review
            </span>
            {t.dueDate && (
              <span style={{ fontSize: 10, color: "#94A3B8" }}>Due {fmtDate(t.dueDate)}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); onPreview(); }}
            style={{ padding: "6px 12px", background: "#EEF2FF", color: "#4F46E5", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <i className="bi bi-eye" />Preview
          </button>
          <a href={`/dashboard/admin/tasks/${t._id}`} target="_blank" rel="noreferrer" className="ap-btn-view" onClick={e => e.stopPropagation()}>
            <i className="bi bi-box-arrow-up-right" />View
          </a>
          <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`} style={{ color: "#94A3B8" }} />
        </div>
      </div>

      {isOpen && (
        <div className="ap-card-body" style={{ paddingTop: 14 }}>
          {/* Full content for production tasks — script, caption, hashtags, pillar, reference */}
          {t.taskType === "production" && (t.description || t.caption || t.tags?.length > 0 || t.pillar || t.referenceLink) ? (
            <div style={{ marginBottom: 14 }}>
              {t.pillar && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Content Pillar</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", background: "#EDE9FE", padding: "3px 10px", borderRadius: 20 }}>{t.pillar}</span>
                </div>
              )}
              {t.description && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Script / Content</div>
                  <div className="ap-content-box">{t.description}</div>
                </div>
              )}
              {t.caption && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Caption</div>
                  <div className="ap-content-box">{t.caption}</div>
                </div>
              )}
              {t.tags?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Hashtags</div>
                  <div style={{ fontSize: 12, color: "#6366F1", background: "#EEF2FF", borderRadius: 8, padding: "8px 12px", lineHeight: 1.8 }}>
                    {t.tags.map(tg => `#${tg}`).join("  ")}
                  </div>
                </div>
              )}
              {t.referenceLink && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Reference Link</div>
                  <a href={t.referenceLink} target="_blank" rel="noreferrer" className="ap-proof-link">
                    <i className="bi bi-link-45deg" />{t.referenceLink}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <>
          {t.description && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Work / Description</div>
              <div className="ap-content-box">{t.description}</div>
            </div>
          )}
          {t.reviewNote && (
            <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "#0369A1", marginBottom: 12 }}>
              <i className="bi bi-chat-text me-2" /><strong>Employee note:</strong> {t.reviewNote}
            </div>
          )}
          {t.proofLink && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Proof / Deliverable</div>
              <a href={t.proofLink} target="_blank" rel="noreferrer" className="ap-proof-link">
                <i className="bi bi-link-45deg" />{t.proofLink}
              </a>
            </div>
          )}
          </>
          )}

          {readOnly ? (
            t.status === "completed" ? (
              <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#15803D", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bi bi-check-circle-fill" /> Task Approved
              </div>
            ) : (
              <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: t.reviewNote ? 6 : 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-x-circle-fill" /> Task Rejected
                </div>
                {t.reviewNote && <div style={{ fontSize: 12, color: "#991B1B" }}>Reason: {t.reviewNote}</div>}
              </div>
            )
          ) : !rejectMode ? (
            <div className="ap-actions">
              <button className="ap-btn-approve" onClick={onApprove} disabled={saving}>
                {saving ? "…" : <><i className="bi bi-check2-circle me-1" />Approve Task</>}
              </button>
              <button className="ap-btn-reject" onClick={() => setRejectMode(true)} disabled={saving}>
                <i className="bi bi-x-circle me-1" />Reject
              </button>
            </div>
          ) : (
            <div>
              <textarea
                className="ap-reject-input"
                placeholder="Enter rejection reason for the employee…"
                value={rejectText}
                onChange={e => setRejectText(e.target.value)}
              />
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>
                  New Deadline <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "inherit", background: "#FFF5F5" }}
                />
              </div>
              <div className="ap-actions" style={{ marginTop: 8 }}>
                <button className="ap-btn-reject" onClick={() => onReject(rejectText, newDeadline)} disabled={saving || !rejectText.trim()}>
                  {saving ? "…" : <><i className="bi bi-send me-1" />Send Rejection</>}
                </button>
                <button onClick={() => { setRejectMode(false); setRejectText(""); setNewDeadline(""); }} style={{ flex: 1, background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Approval Card ─────────────────────────────────────────────────────── */
function ApprovalCard({ task: t, stageIdx, stg, isOpen, onToggle, saving, onApprove, onReject, readOnly, onPreview }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectText, setRejectText] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const brand = t.brandId || {};
  const color = STAGE_COLORS[stageIdx];
  const router = useRouter();

  return (
    <div className="ap-card">
      {/* Header — always visible */}
      <div className="ap-card-head" onClick={onToggle}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 900, fontSize: 14, color }}>{stageIdx + 1}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.nomenclature || t.title}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
            {brand.color && (
              <span style={{ fontSize: 11, fontWeight: 700, background: (brand.color || "#6366F1") + "20", color: brand.color || "#6366F1", borderRadius: 20, padding: "1px 8px" }}>
                {brand.name}
              </span>
            )}
            <span className="ap-stage-badge" style={{ background: color + "18", color }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{STAGE_NAMES[stageIdx]}
            </span>
            {stg.doneAt && (
              <span style={{ fontSize: 10, color: "#94A3B8" }}>Submitted {new Date(stg.doneAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); onPreview(); }}
            style={{ padding: "6px 12px", background: "#EEF2FF", color: "#4F46E5", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <i className="bi bi-eye" />Preview
          </button>
          <a href={`/dashboard/admin/tasks/${t._id}`} target="_blank" rel="noreferrer" className="ap-btn-view" onClick={e => e.stopPropagation()}>
            <i className="bi bi-box-arrow-up-right" />View
          </a>
          <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`} style={{ color: "#94A3B8" }} />
        </div>
      </div>

      {/* Body — expanded */}
      {isOpen && (
        <div className="ap-card-body" style={{ paddingTop: 14 }}>
          {/* Content to review */}
          {stageIdx === 0 && (t.description || t.caption || t.referenceLink || t.tags?.length > 0 || t.pillar) && (
            <div style={{ marginBottom: 14 }}>
              {t.pillar && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Content Pillar</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", background: "#EDE9FE", padding: "3px 10px", borderRadius: 20 }}>{t.pillar}</span>
                </div>
              )}
              {t.description && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Script / Content</div>
                  <div className="ap-content-box">{t.description}</div>
                </>
              )}
              {t.caption && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Caption</div>
                  <div className="ap-content-box">{t.caption}</div>
                </>
              )}
              {t.tags?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Hashtags</div>
                  <div style={{ fontSize: 12, color: "#6366F1", background: "#EEF2FF", borderRadius: 8, padding: "8px 12px", lineHeight: 1.8 }}>
                    {t.tags.map(tg => `#${tg}`).join("  ")}
                  </div>
                </div>
              )}
              {t.referenceLink && (
                <a href={t.referenceLink} target="_blank" rel="noreferrer" className="ap-proof-link" style={{ marginTop: 6 }}>
                  <i className="bi bi-link-45deg" />Reference: {t.referenceLink}
                </a>
              )}
            </div>
          )}

          {/* Proof links / attachments from stage */}
          {stg.proofUrls?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Proof / Deliverables</div>
              {stg.proofUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="ap-proof-link">
                  <i className="bi bi-link-45deg" />{url}
                </a>
              ))}
            </div>
          )}

          {/* Stage note */}
          {stg.doneNote && (
            <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "#0369A1", marginBottom: 12 }}>
              <i className="bi bi-chat-text me-2" />{stg.doneNote}
            </div>
          )}

          {/* Action buttons or read-only status */}
          {readOnly ? (
            stg.approved ? (
              <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#15803D", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bi bi-check-circle-fill" /> Stage Approved
              </div>
            ) : (
              <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: stg.rejectReason ? 6 : 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-x-circle-fill" /> Stage Rejected
                </div>
                {stg.rejectReason && <div style={{ fontSize: 12, color: "#991B1B" }}>Reason: {stg.rejectReason}</div>}
              </div>
            )
          ) : !rejectMode ? (
            <div className="ap-actions">
              <button className="ap-btn-approve" onClick={onApprove} disabled={saving}>
                {saving ? "…" : <><i className="bi bi-check2-circle me-1" />Approve</>}
              </button>
              <button className="ap-btn-reject" onClick={() => setRejectMode(true)} disabled={saving}>
                <i className="bi bi-x-circle me-1" />Reject
              </button>
            </div>
          ) : (
            <div>
              <textarea
                className="ap-reject-input"
                placeholder="Enter rejection reason for the employee…"
                value={rejectText}
                onChange={e => setRejectText(e.target.value)}
              />
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 5 }}>
                  New Deadline <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "inherit", background: "#FFF5F5" }}
                />
              </div>
              <div className="ap-actions" style={{ marginTop: 8 }}>
                <button className="ap-btn-reject" onClick={() => onReject(rejectText, newDeadline)} disabled={saving || !rejectText.trim()}>
                  {saving ? "…" : <><i className="bi bi-send me-1" />Send Rejection</>}
                </button>
                <button onClick={() => { setRejectMode(false); setRejectText(""); setNewDeadline(""); }} style={{ flex: 1, background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
