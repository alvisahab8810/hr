// components/employee/FaceRecognitionModal.js
"use client";
import { useEffect, useRef, useState } from "react";
import { preloadFaceModels, isFaceReady, getFaceApi } from "@/utils/faceModels";

// Pose instructions for 5 enrollment samples
const POSES = [
  { label: "Look straight",      icon: "bi-arrow-up",         tip: "Face the camera directly" },
  { label: "Tilt slightly left",  icon: "bi-arrow-left",       tip: "Small turn — keep face visible" },
  { label: "Tilt slightly right", icon: "bi-arrow-right",      tip: "Small turn — keep face visible" },
  { label: "Look slightly up",    icon: "bi-arrow-up-circle",  tip: "Chin down a little" },
  { label: "Final capture",       icon: "bi-camera-fill",      tip: "Look straight one more time" },
];

// Detect interval: fast for verify (instant feel), moderate for enroll
const VERIFY_INTERVAL_MS = 80;
const ENROLL_INTERVAL_MS = 280;

function getCameraError(err) {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { hint: "Camera requires HTTPS", detail: "Access this page via HTTPS or localhost.", type: "https" };
  }
  if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
    return { hint: "Camera permission denied", detail: "Allow camera access in your browser settings, then retry.", type: "permission" };
  }
  if (err?.name === "NotFoundError") {
    return { hint: "No camera found", detail: "Connect or enable a camera and try again.", type: "notfound" };
  }
  return { hint: "Camera unavailable", detail: err?.message || "Could not start camera.", type: "generic" };
}

export default function FaceRecognitionModal({
  mode = "verify",         // "enroll" | "verify"
  storedDescriptor = null,
  onSuccess,
  onClose,
  employeeName = "",
  action = "",
}) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const loopRef    = useRef(null);
  const samplesRef = useRef([]);
  const aliveRef   = useRef(true);
  const pausedRef  = useRef(false);

  // phase: loading | scanning | captured | success | fail | no_enroll | camera_error
  const [phase,         setPhase]         = useState("loading");
  const [loadPct,       setLoadPct]       = useState(isFaceReady() ? 100 : 0);
  const [loadMsg,       setLoadMsg]       = useState(isFaceReady() ? "Ready" : "Loading AI…");
  const [faceReady,     setFaceReady]     = useState(false);
  const [enrollCount,   setEnrollCount]   = useState(0);
  const [capturing,     setCapturing]     = useState(false);
  const [cameraErrType, setCameraErrType] = useState(null);
  const [errHint,       setErrHint]       = useState("");
  const [errDetail,     setErrDetail]     = useState("");
  const [successMsg,    setSuccessMsg]    = useState("");
  const [failHint,      setFailHint]      = useState("");
  const [failDetail,    setFailDetail]    = useState("");
  const [matchPct,      setMatchPct]      = useState(null);

  const ENROLL_TOTAL = 5;

  // ── Boot ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    aliveRef.current = true;
    boot();
    return () => {
      aliveRef.current = false;
      stopAll();
    };
  }, []);

  async function boot() {
    try {
      // If already preloaded by TimeTracker, skip straight to camera
      if (!isFaceReady()) {
        await preloadFaceModels(pct => {
          if (!aliveRef.current) return;
          setLoadPct(pct);
          if (pct < 25)  setLoadMsg("Loading face detector…");
          else if (pct < 60) setLoadMsg("Loading landmark model…");
          else if (pct < 90) setLoadMsg("Loading recognition model…");
          else setLoadMsg("Almost ready…");
        });
      }
      if (!aliveRef.current) return;
      setLoadPct(100);
      await startCamera();
      if (!aliveRef.current) return;
      setPhase("scanning");
      startLoop();
    } catch (e) {
      if (!aliveRef.current) return;
      const info = getCameraError(e);
      setCameraErrType(info.type);
      setErrHint(info.hint);
      setErrDetail(info.detail);
      setPhase("camera_error");
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      const e = new Error("HTTP"); e.name = "HTTPSRequired"; throw e;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await new Promise(res => {
        videoRef.current.onloadedmetadata = res;
        setTimeout(res, 3000); // fallback
      });
      await videoRef.current.play();
    }
  }

  function stopAll() {
    clearInterval(loopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  // ── Continuous detection loop ──────────────────────────────────────────────
  function startLoop() {
    clearInterval(loopRef.current);
    const interval = mode === "verify" ? VERIFY_INTERVAL_MS : ENROLL_INTERVAL_MS;

    loopRef.current = setInterval(async () => {
      if (!aliveRef.current || pausedRef.current) return;
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const fa = getFaceApi();
        if (!fa) return;

        // Use smaller inputSize for verify (faster) — still accurate for 1:1 match
        const inputSize = mode === "verify" ? 224 : 320;
        const opts = new fa.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.4 });

        const det = await fa
          .detectSingleFace(videoRef.current, opts)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!aliveRef.current || pausedRef.current) return;

        if (!det) {
          setFaceReady(false);
          clearCanvas();
          return;
        }

        drawDet(det);

        if (mode === "verify") {
          // One-shot on first good detection
          clearInterval(loopRef.current);
          pausedRef.current = true;

          if (!storedDescriptor || storedDescriptor.length === 0) {
            setPhase("no_enroll");
            setFailHint("No Face ID registered");
            setFailDetail("Set up your Face ID first from the attendance tracker.");
            return;
          }

          const stored   = new Float32Array(storedDescriptor);
          const distance = fa.euclideanDistance(det.descriptor, stored);
          const pct      = Math.round((1 - distance) * 100);
          setMatchPct(pct);

          if (distance < 0.55) {
            // Slightly tighter threshold for accuracy
            setPhase("success");
            setSuccessMsg(`Identity verified — ${pct}% match`);
            setTimeout(() => { stopAll(); onSuccess?.(); }, 950);
          } else if (distance < 0.65) {
            // Borderline — retry automatically once with fresh frame
            await new Promise(r => setTimeout(r, 200));
            if (!aliveRef.current) return;
            const det2 = await fa
              .detectSingleFace(videoRef.current, opts)
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (det2) {
              const d2   = fa.euclideanDistance(det2.descriptor, stored);
              const p2   = Math.round((1 - d2) * 100);
              if (d2 < 0.6) {
                setPhase("success");
                setSuccessMsg(`Identity verified — ${p2}% match`);
                setTimeout(() => { stopAll(); onSuccess?.(); }, 950);
                return;
              }
            }
            setPhase("fail");
            setFailHint("Face not recognised");
            setFailDetail(`Match: ${pct}%. Try better lighting or re-enrol.`);
          } else {
            setPhase("fail");
            setFailHint("Face not recognised");
            setFailDetail(`Match: ${pct}%. Move closer or improve lighting.`);
          }
          return;
        }

        // ENROLL: mark face as ready for button
        setFaceReady(true);
      } catch { /* silent */ }
    }, interval);
  }

  function clearCanvas() {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }

  function drawDet(det) {
    const fa = getFaceApi();
    if (!canvasRef.current || !videoRef.current || !fa) return;
    const dims = fa.matchDimensions(canvasRef.current, videoRef.current, true);
    const res  = fa.resizeResults(det, dims);
    const ctx  = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    fa.draw.drawFaceLandmarks(canvasRef.current, res);
  }

  // ── Capture sample (enroll) ────────────────────────────────────────────────
  async function handleCapture() {
    if (!faceReady || pausedRef.current || capturing) return;
    pausedRef.current = true;
    setCapturing(true);
    setFaceReady(false);

    try {
      const fa = getFaceApi();
      if (!fa || !videoRef.current) return;
      const opts = new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
      const det  = await fa
        .detectSingleFace(videoRef.current, opts)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!det) {
        pausedRef.current = false;
        setCapturing(false);
        return;
      }

      const newSamples    = [...samplesRef.current, Array.from(det.descriptor)];
      samplesRef.current  = newSamples;
      const count         = newSamples.length;
      setEnrollCount(count);

      if (count >= ENROLL_TOTAL) {
        clearInterval(loopRef.current);
        // Weighted average: later samples count slightly more (better pose coverage)
        const avg = newSamples[0].map((_, i) =>
          newSamples.reduce((s, d) => s + d[i], 0) / newSamples.length
        );
        setPhase("success");
        setSuccessMsg("Face ID enrolled successfully!");
        setTimeout(() => { stopAll(); onSuccess?.(avg); }, 900);
        return;
      }

      setCurrentPose(count);
      setTimeout(() => {
        if (!aliveRef.current) return;
        setCapturing(false);
        pausedRef.current = false;
      }, 650);
    } catch {
      pausedRef.current = false;
      setCapturing(false);
    }
  }

  // Need currentPose as state for enroll steps
  const [currentPose, setCurrentPose] = useState(0);

  // ── Retry ──────────────────────────────────────────────────────────────────
  async function handleRetry() {
    pausedRef.current = false;
    setFaceReady(false);
    setCapturing(false);
    setMatchPct(null);
    clearCanvas();

    if (!streamRef.current) {
      setPhase("loading");
      setLoadPct(80);
      try { await startCamera(); }
      catch (e) {
        const info = getCameraError(e);
        setCameraErrType(info.type);
        setErrHint(info.hint);
        setErrDetail(info.detail);
        setPhase("camera_error");
        return;
      }
    }
    setPhase("scanning");
    startLoop();
  }

  const handleClose = () => { stopAll(); onClose?.(); };

  // ── Derived UI ─────────────────────────────────────────────────────────────
  const ringGreen = "#10B981";
  const ringBlue  = "#4F46E5";
  const ringRed   = "#EF4444";
  const ringColor =
    phase === "success"                                              ? ringGreen
    : (phase === "fail" || phase === "no_enroll" || phase === "camera_error") ? ringRed
    : faceReady && !capturing                                       ? ringGreen
    : ringBlue;

  const pose  = POSES[currentPose] || POSES[0];
  const isErr = phase === "fail" || phase === "no_enroll";

  // Loading message for the progress bar
  const alreadyReady = isFaceReady();

  return (
    <>
      <div onClick={handleClose} style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.78)",
        zIndex:9998, backdropFilter:"blur(4px)",
      }} />

      <div style={{
        position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        zIndex:9999, width:"calc(100% - 28px)", maxWidth:430,
        background:"#fff", borderRadius:24, overflow:"hidden",
        boxShadow:"0 28px 90px rgba(0,0,0,0.4)",
      }}>

        {/* ── Header ── */}
        <div style={{
          background:"linear-gradient(135deg,#1e1b4b,#4F46E5)",
          padding:"15px 18px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:"rgba(255,255,255,0.15)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <i className="bi bi-shield-lock-fill" style={{ color:"#fff", fontSize:16 }} />
            </div>
            <div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:14, lineHeight:1.2 }}>
                {mode === "enroll" ? "Set Up Face ID" : `Face Scan — ${action}`}
              </div>
              {employeeName && (
                <div style={{ color:"rgba(255,255,255,0.55)", fontSize:11 }}>{employeeName}</div>
              )}
            </div>
          </div>
          <button onClick={handleClose} style={{
            background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8,
            width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.8)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:13,
          }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* ── Enroll progress dots ── */}
        {mode === "enroll" && (
          <div style={{ padding:"10px 18px 0", display:"flex", gap:5, alignItems:"center" }}>
            {Array.from({ length: ENROLL_TOTAL }).map((_, i) => (
              <div key={i} style={{
                flex:1, height:5, borderRadius:10, overflow:"hidden",
                background: i < enrollCount ? "transparent" : "#F3F4F6",
              }}>
                {i < enrollCount && (
                  <div style={{ height:"100%", borderRadius:10,
                    background:"linear-gradient(90deg,#4F46E5,#7C3AED)" }} />
                )}
                {i === enrollCount && (
                  <div style={{ height:"100%", borderRadius:10,
                    background:"linear-gradient(90deg,#4F46E5,#7C3AED)",
                    animation:"barPulse 1.4s ease-in-out infinite", opacity:0.4 }} />
                )}
              </div>
            ))}
            <span style={{ fontSize:11, color:"#9CA3AF", whiteSpace:"nowrap", fontWeight:600 }}>
              {enrollCount}/{ENROLL_TOTAL}
            </span>
          </div>
        )}

        {/* ── Camera area ── */}
        <div style={{
          position:"relative", margin:"12px 18px 0",
          borderRadius:16, overflow:"hidden", background:"#090916",
          aspectRatio:"4/3",
        }}>
          {/* Scanning ring */}
          <div style={{
            position:"absolute", inset:10, borderRadius:12,
            border:`2.5px solid ${ringColor}`,
            zIndex:10, pointerEvents:"none",
            boxShadow:`0 0 24px ${ringColor}55`,
            transition:"border-color 0.2s, box-shadow 0.2s",
            animation: faceReady && !capturing && phase === "scanning"
              ? "ringPulse 1.1s ease-in-out infinite" : "none",
          }}>
            {[
              { top:0,    left:0,  borderTop:"3px solid",    borderLeft:"3px solid"   },
              { top:0,    right:0, borderTop:"3px solid",    borderRight:"3px solid"  },
              { bottom:0, left:0,  borderBottom:"3px solid", borderLeft:"3px solid"   },
              { bottom:0, right:0, borderBottom:"3px solid", borderRight:"3px solid"  },
            ].map((s, i) => (
              <span key={i} style={{
                position:"absolute", width:20, height:20, borderRadius:2,
                borderColor:ringColor, ...s, transition:"border-color 0.2s",
              }} />
            ))}
          </div>

          <video ref={videoRef} autoPlay muted playsInline style={{
            width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)",
          }} />
          <canvas ref={canvasRef} style={{
            position:"absolute", top:0, left:0, width:"100%", height:"100%",
            transform:"scaleX(-1)", pointerEvents:"none",
          }} />

          {/* Loading overlay — skip entirely if models already preloaded */}
          {phase === "loading" && (
            <div style={{
              position:"absolute", inset:0, background:"rgba(9,9,22,0.96)",
              display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:14, zIndex:15,
            }}>
              {alreadyReady ? (
                <>
                  <div style={{ width:48, height:48, borderRadius:"50%",
                    border:"3px solid #10B981", borderTopColor:"transparent",
                    animation:"spinRing 0.7s linear infinite" }} />
                  <div style={{ color:"#6EE7B7", fontSize:13, fontWeight:600 }}>Starting camera…</div>
                </>
              ) : (
                <>
                  <div style={{ width:50, height:50, borderRadius:"50%",
                    border:"3px solid #4F46E5", borderTopColor:"transparent",
                    animation:"spinRing 0.9s linear infinite" }} />
                  <div style={{ color:"#fff", fontSize:13, fontWeight:600 }}>{loadMsg}</div>
                  <div style={{ width:150, height:4, background:"rgba(255,255,255,0.1)", borderRadius:10 }}>
                    <div style={{
                      height:"100%", width:`${loadPct}%`,
                      background:"linear-gradient(90deg,#4F46E5,#7C3AED)",
                      borderRadius:10, transition:"width 0.35s ease",
                    }} />
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>
                    First load only — instant next time
                  </div>
                </>
              )}
            </div>
          )}

          {/* Camera error */}
          {phase === "camera_error" && (
            <div style={{
              position:"absolute", inset:0, background:"rgba(9,9,22,0.95)",
              display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:12, zIndex:15, padding:24,
            }}>
              <div style={{ width:60, height:60, borderRadius:"50%",
                background:"rgba(239,68,68,0.15)", border:"2px solid rgba(239,68,68,0.4)",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <i className="bi bi-camera-video-off" style={{ color:"#EF4444", fontSize:26 }} />
              </div>
              <div style={{ color:"#FCA5A5", fontSize:13, fontWeight:700, textAlign:"center" }}>{errHint}</div>
              <div style={{ color:"rgba(255,255,255,0.45)", fontSize:11, textAlign:"center", lineHeight:1.6 }}>{errDetail}</div>
            </div>
          )}

          {/* Face detected glow */}
          {faceReady && !capturing && phase === "scanning" && (
            <div style={{
              position:"absolute", inset:0, zIndex:8, pointerEvents:"none",
              background:"radial-gradient(ellipse at center, rgba(16,185,129,0.1) 0%, transparent 70%)",
            }} />
          )}

          {/* Verify scanning pulse — shows user it's actively scanning */}
          {phase === "scanning" && mode === "verify" && !faceReady && (
            <div style={{
              position:"absolute", inset:0, zIndex:7, pointerEvents:"none",
              background:"radial-gradient(ellipse at center, rgba(79,70,229,0.06) 0%, transparent 65%)",
              animation:"scanPulse 1.6s ease-in-out infinite",
            }} />
          )}

          {/* Capture flash */}
          {capturing && (
            <div style={{
              position:"absolute", inset:0, zIndex:20, pointerEvents:"none",
              background:"rgba(255,255,255,0.35)",
              animation:"flashOut 0.5s ease-out forwards",
            }} />
          )}

          {/* Success overlay */}
          {phase === "success" && (
            <div style={{
              position:"absolute", inset:0, background:"rgba(16,185,129,0.2)",
              display:"flex", alignItems:"center", justifyContent:"center", zIndex:15,
            }}>
              <div style={{ width:72, height:72, borderRadius:"50%",
                background:"rgba(16,185,129,0.92)",
                display:"flex", alignItems:"center", justifyContent:"center",
                animation:"popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}>
                <i className="bi bi-check-lg" style={{ fontSize:36, color:"#fff" }} />
              </div>
            </div>
          )}

          {/* Fail overlay */}
          {isErr && (
            <div style={{
              position:"absolute", inset:0, background:"rgba(239,68,68,0.15)",
              display:"flex", alignItems:"center", justifyContent:"center", zIndex:15,
            }}>
              <div style={{ width:72, height:72, borderRadius:"50%",
                background:"rgba(239,68,68,0.9)",
                display:"flex", alignItems:"center", justifyContent:"center",
                animation:"popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}>
                <i className="bi bi-x-lg" style={{ fontSize:32, color:"#fff" }} />
              </div>
            </div>
          )}

          {/* Live status chip */}
          {phase === "scanning" && (
            <div style={{
              position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)",
              background:"rgba(0,0,0,0.72)", borderRadius:22, padding:"5px 14px",
              display:"flex", alignItems:"center", gap:7, zIndex:15,
              backdropFilter:"blur(6px)", whiteSpace:"nowrap",
            }}>
              <span style={{
                width:8, height:8, borderRadius:"50%",
                background: faceReady ? "#10B981" : "#6B7280",
                animation: faceReady ? "dotBlink 0.9s ease-in-out infinite" : "none",
                flexShrink:0, transition:"background 0.15s",
              }} />
              <span style={{
                fontSize:12, fontWeight:700,
                color: faceReady ? "#6EE7B7" : "rgba(255,255,255,0.6)",
                transition:"color 0.15s",
              }}>
                {capturing     ? "✓ Captured!"
                : faceReady   ? (mode === "verify" ? "Face detected — verifying…" : "Ready! Press Capture")
                : mode === "verify" ? "Scanning for face…"
                : "Position face in frame…"}
              </span>
            </div>
          )}
        </div>

        {/* ── Info panel ── */}
        <div style={{ padding:"10px 18px 0", minHeight:54 }}>

          {phase === "scanning" && mode === "enroll" && (
            <div style={{
              display:"flex", alignItems:"center", gap:10,
              background: faceReady ? "#F0FDF4" : "#F8F7FF",
              border:`1.5px solid ${faceReady ? "#BBF7D0" : "#DDD6FE"}`,
              borderRadius:12, padding:"9px 13px", transition:"all 0.25s",
            }}>
              <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                background: faceReady ? "#DCFCE7" : "#EEF2FF",
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"background 0.25s" }}>
                <i className={`bi ${faceReady ? "bi-check-circle-fill" : pose.icon}`} style={{
                  fontSize:16, color: faceReady ? "#10B981" : "#4F46E5", transition:"color 0.25s",
                }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700,
                  color: faceReady ? "#065F46" : "#1F2937", transition:"color 0.25s" }}>
                  {faceReady
                    ? `Ready! Press Capture (${enrollCount + 1}/${ENROLL_TOTAL})`
                    : `Step ${enrollCount + 1}: ${pose.label}`}
                </div>
                <div style={{ fontSize:11, color:"#6B7280", marginTop:2 }}>
                  {faceReady ? "Hold still and click the green button" : pose.tip}
                </div>
              </div>
            </div>
          )}

          {phase === "scanning" && mode === "verify" && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
              gap:8, padding:"6px 0" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#4F46E5",
                animation:"dotBlink 1.1s ease-in-out infinite" }} />
              <span style={{ fontSize:13, color:"#6B7280", fontWeight:500 }}>
                Look straight at the camera…
              </span>
            </div>
          )}

          {phase === "success" && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
              gap:8, padding:"6px 0" }}>
              <i className="bi bi-check-circle-fill" style={{ color:"#10B981", fontSize:15 }} />
              <span style={{ fontSize:13, fontWeight:700, color:"#059669" }}>{successMsg}</span>
            </div>
          )}

          {isErr && (
            <div style={{ padding:"4px 0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                <i className="bi bi-exclamation-circle-fill" style={{ color:"#EF4444", fontSize:14 }} />
                <span style={{ fontSize:13, fontWeight:700, color:"#DC2626" }}>{failHint}</span>
              </div>
              {failDetail && (
                <p style={{ fontSize:11, color:"#6B7280", margin:"0 0 0 20px", lineHeight:1.5 }}>
                  {failDetail}
                </p>
              )}
              {matchPct !== null && (
                <div style={{ marginTop:8, marginLeft:20 }}>
                  <div style={{ height:4, background:"#F3F4F6", borderRadius:10, overflow:"hidden", width:160 }}>
                    <div style={{ height:"100%", width:`${matchPct}%`,
                      background: matchPct >= 45 ? "#F59E0B" : "#EF4444",
                      borderRadius:10, transition:"width 0.4s" }} />
                  </div>
                  <span style={{ fontSize:10, color:"#9CA3AF", marginTop:2, display:"block" }}>
                    Match score: {matchPct}% (need ≥ 45%)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Buttons ── */}
        <div style={{ padding:"10px 18px 20px", display:"flex", flexDirection:"column", gap:8 }}>

          {phase === "scanning" && mode === "enroll" && (
            <button onClick={handleCapture} disabled={!faceReady || capturing} style={{
              background: faceReady && !capturing
                ? "linear-gradient(135deg,#059669,#10B981)"
                : "#F3F4F6",
              color: faceReady && !capturing ? "#fff" : "#D1D5DB",
              border:"none", borderRadius:13,
              padding:"14px 20px", fontSize:14, fontWeight:700,
              cursor: faceReady && !capturing ? "pointer" : "default",
              width:"100%",
              display:"flex", alignItems:"center", justifyContent:"center", gap:9,
              transition:"all 0.2s",
              boxShadow: faceReady && !capturing ? "0 4px 20px rgba(16,185,129,0.45)" : "none",
              animation: faceReady && !capturing ? "btnGlow 1.4s ease-in-out infinite" : "none",
            }}>
              <i className={`bi bi-${capturing ? "check-circle-fill" : faceReady ? "camera-fill" : "camera"}`}
                style={{ fontSize:16 }} />
              {capturing     ? "Captured!"
               : faceReady  ? `Capture ${enrollCount + 1} / ${ENROLL_TOTAL}`
               :               "Waiting for face…"}
            </button>
          )}

          {isErr && (
            <button onClick={handleRetry} style={{
              background:"linear-gradient(135deg,#4F46E5,#7C3AED)",
              color:"#fff", border:"none", borderRadius:13,
              padding:"14px 20px", fontSize:14, fontWeight:700,
              cursor:"pointer", width:"100%",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              boxShadow:"0 4px 16px rgba(79,70,229,0.35)",
            }}>
              <i className="bi bi-arrow-clockwise" /> Try Again
            </button>
          )}

          {phase === "camera_error" && cameraErrType !== "https" && (
            <button onClick={handleRetry} style={{
              background:"linear-gradient(135deg,#4F46E5,#7C3AED)",
              color:"#fff", border:"none", borderRadius:13,
              padding:"14px 20px", fontSize:14, fontWeight:700,
              cursor:"pointer", width:"100%",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              <i className="bi bi-arrow-clockwise" /> Retry Camera
            </button>
          )}

          {phase !== "loading" && phase !== "success" && (
            <button onClick={handleClose} style={{
              background:"#F3F4F6", color:"#6B7280", border:"none",
              borderRadius:13, padding:"12px 20px",
              fontSize:13, fontWeight:600, cursor:"pointer", width:"100%",
            }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spinRing   { to { transform: rotate(360deg); } }
        @keyframes ringPulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes popIn      { 0% { transform:scale(0.35);opacity:0; } 100% { transform:scale(1);opacity:1; } }
        @keyframes dotBlink   { 0%,100% { opacity:1;transform:scale(1); } 50% { opacity:0.35;transform:scale(0.6); } }
        @keyframes flashOut   { 0% { opacity:1; } 100% { opacity:0; } }
        @keyframes barPulse   { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes scanPulse  { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes btnGlow    {
          0%,100% { box-shadow: 0 4px 20px rgba(16,185,129,0.45); }
          50%      { box-shadow: 0 4px 30px rgba(16,185,129,0.75); }
        }
      `}</style>
    </>
  );
}
