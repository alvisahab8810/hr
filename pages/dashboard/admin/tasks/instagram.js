import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

function fmtDate(d) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtNum(n) {
  if (!n) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(n);
}

const PAGE_CSS = `
.ig-modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px; }
.ig-modal { background:#fff;border-radius:16px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden; }
.ig-modal-head { padding:20px 24px 16px;border-bottom:1px solid #F1F5F9;display:flex;align-items:flex-start;justify-content:space-between; }
.ig-modal-body { padding:20px 24px;max-height:60vh;overflow-y:auto; }
.ig-modal-foot { padding:14px 24px;border-top:1px solid #F1F5F9;display:flex;gap:10px;justify-content:flex-end; }
.ig-account-option { display:flex;align-items:center;gap:14px;padding:14px;border:2px solid #E2E8F0;border-radius:10px;cursor:pointer;margin-bottom:10px;transition:all .12s; }
.ig-account-option:hover { border-color:#5A57FB;background:#F0F0FF; }
.ig-account-option.selected { border-color:#5A57FB;background:#EEF2FF; }
.ig-account-avatar { width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px;flex-shrink:0; }
.ig-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
.ig-card { background: #fff; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 20px; }
.ig-card.connected { border-color: #C7D2FE; }
.ig-brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.ig-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.ig-brand-name { font-size: 15px; font-weight: 800; color: #0f172a; }
.ig-status-pill { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.ig-connected { background: #DCFCE7; color: #15803D; }
.ig-disconnected { background: #F1F5F9; color: #64748b; }
.ig-meta { font-size: 12px; color: #64748b; margin-bottom: 14px; display: flex; flex-direction: column; gap: 4px; }
.ig-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.ig-stat { background: #F8FAFC; border-radius: 8px; padding: 8px 10px; text-align: center; }
.ig-stat-val { font-size: 15px; font-weight: 800; color: #0f172a; }
.ig-stat-label { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
.ig-btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; font-family: inherit; transition: opacity .15s; }
.ig-btn:disabled { opacity: .5; cursor: not-allowed; }
.ig-btn-connect { background: linear-gradient(135deg,#5A57FB,#4845d4); color: #fff; }
.ig-btn-sync { background: #EEF2FF; color: #4F46E5; }
.ig-btn-disconnect { background: #FEE2E2; color: #DC2626; }
.ig-btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ig-posts-preview { margin-top: 14px; border-top: 1px solid #F1F5F9; padding-top: 14px; }
.ig-post-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
.ig-post-row:last-child { border-bottom: none; }
.ig-post-thumb { width: 40px; height: 40px; border-radius: 7px; object-fit: cover; background: #F1F5F9; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.ig-post-cap { font-size: 12px; color: #374151; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.ig-post-reach { font-size: 11px; color: #64748b; flex-shrink: 0; }
.alert-banner { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
.alert-success { background: #DCFCE7; border: 1px solid #86EFAC; color: #15803D; }
.alert-error   { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; }
.alert-info    { background: #EEF2FF; border: 1px solid #C7D2FE; color: #3730A3; }
`;

export default function InstagramManagement() {
  const router = useRouter();
  const [brands,      setBrands]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState({});
  const [alert,       setAlert]       = useState(null);
  const [origin,      setOrigin]      = useState(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");
  const [selectModal, setSelectModal] = useState(null); // { brandId, brandName, accounts[] }
  const [selectedIg,  setSelectedIg]  = useState("");
  const [finalizing,  setFinalizing]  = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/brands");
      const d = await r.json();
      if (d.success) setBrands(d.brands || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Handle OAuth callback params
  useEffect(() => {
    const { connected, username, error, selectFor } = router.query;
    if (connected) {
      setAlert({ type: "success", msg: `@${username || "account"} connected successfully! Syncing posts…` });
      router.replace("/dashboard/admin/tasks/instagram", undefined, { shallow: true });
      load();
    } else if (selectFor) {
      // Multiple accounts found — fetch them and show selection modal
      router.replace("/dashboard/admin/tasks/instagram", undefined, { shallow: true });
      fetch(`/api/admin/brands/${selectFor}/instagram/pending`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.accounts.length > 0) {
            setSelectModal({ brandId: selectFor, brandName: d.brandName, accounts: d.accounts });
            setSelectedIg(d.accounts[0].igId);
          } else {
            setAlert({ type: "error", msg: "Could not load Instagram accounts. Please try again." });
          }
        });
    } else if (error) {
      setAlert({ type: "error", msg: decodeURIComponent(error) });
      router.replace("/dashboard/admin/tasks/instagram", undefined, { shallow: true });
    }
  }, [router.query]);

  async function startConnect(brandId) {
    const r = await fetch(`/api/admin/brands/${brandId}/instagram/connect`);
    const d = await r.json();
    if (d.success) {
      window.location.href = d.oauthUrl;
    } else {
      setAlert({ type: "error", msg: d.message });
    }
  }

  async function syncNow(brandId) {
    setSyncing(p => ({ ...p, [brandId]: true }));
    try {
      const r = await fetch(`/api/admin/brands/${brandId}/instagram/sync`, { method: "POST" });
      const d = await r.json();
      if (d.success) {
        setAlert({ type: "success", msg: d.message });
        load();
      } else {
        setAlert({ type: "error", msg: d.message });
      }
    } finally { setSyncing(p => ({ ...p, [brandId]: false })); }
  }

  async function finalizeSelection() {
    if (!selectModal || !selectedIg) return;
    setFinalizing(true);
    try {
      const r = await fetch(`/api/admin/brands/${selectModal.brandId}/instagram/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igId: selectedIg }),
      });
      const d = await r.json();
      if (d.success) {
        setAlert({ type: "success", msg: `@${d.username} connected to ${selectModal.brandName}! Syncing posts…` });
        setSelectModal(null);
        load();
      } else {
        setAlert({ type: "error", msg: d.message });
      }
    } finally { setFinalizing(false); }
  }

  async function disconnect(brandId, brandName) {
    if (!confirm(`Disconnect Instagram from ${brandName}? This will remove cached post data.`)) return;
    const r = await fetch(`/api/admin/brands/${brandId}/instagram/disconnect`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) { setAlert({ type: "success", msg: "Instagram disconnected" }); load(); }
    else setAlert({ type: "error", msg: d.message });
  }

  const smBrands = brands;

  return (
    <div id="main-content" style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      <Head>
        <title>Instagram Connect · Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      </Head>
      <style>{PAGE_CSS}</style>

      <SmartLeftbar />
      <LeftbarMobile />
      <Dashnav />

      <section className="content" style={{ marginLeft: 250, padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Instagram Connect</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>Connect each brand's Instagram to pull real reach, likes, saves & shares into the client portal</p>
          </div>
          <button onClick={load} style={{ padding: "8px 16px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#374151" }}>
            <i className="bi bi-arrow-clockwise" style={{ marginRight: 6 }} />Refresh
          </button>
        </div>

        {/* How it works */}
        <div className="alert-banner alert-info" style={{ marginBottom: 20 }}>
          <i className="bi bi-info-circle-fill" style={{ fontSize: 16, flexShrink: 0 }} />
          <div>
            <strong>How it works:</strong> Click "Connect Instagram" → log in with the Facebook account that owns the brand's Instagram Business page → grant permissions → done. We pull the last 30 posts with reach, likes, saves, and shares. Sync whenever you want fresh data.
          </div>
        </div>

        {alert && (
          <div className={`alert-banner alert-${alert.type}`} style={{ marginBottom: 20 }}>
            <i className={`bi ${alert.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`} style={{ fontSize: 16, flexShrink: 0 }} />
            {alert.msg}
            <button onClick={() => setAlert(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", opacity: .6 }}>×</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading brands…</div>
        ) : smBrands.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
            <i className="bi bi-instagram" style={{ fontSize: 36, display: "block", marginBottom: 12 }} />
            No brands found. Add a brand first.
          </div>
        ) : (
          <div className="ig-grid">
            {smBrands.map(brand => {
              const ig = brand.instagram || {};
              const isConnected = !!ig.connected;
              const posts = ig.posts || [];
              const topPosts = [...posts].sort((a, b) => (b.reach || 0) - (a.reach || 0)).slice(0, 3);

              return (
                <div key={brand._id} className={`ig-card ${isConnected ? "connected" : ""}`}>
                  <div className="ig-brand-row">
                    <div className="ig-dot" style={{ background: brand.color || "#5A57FB" }} />
                    <div style={{ flex: 1 }}>
                      <div className="ig-brand-name">{brand.name}</div>
                      {ig.username && <div style={{ fontSize: 12, color: "#64748b" }}>@{ig.username}</div>}
                    </div>
                    <span className={`ig-status-pill ${isConnected ? "ig-connected" : "ig-disconnected"}`}>
                      {isConnected ? "● Connected" : "Not connected"}
                    </span>
                  </div>

                  {isConnected && (
                    <>
                      <div className="ig-stats-row">
                        {[
                          { label: "Followers", val: fmtNum(ig.followersCount) },
                          { label: "Posts cached", val: posts.length },
                          { label: "Last sync", val: ig.lastSync ? new Date(ig.lastSync).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Never" },
                        ].map(s => (
                          <div key={s.label} className="ig-stat">
                            <div className="ig-stat-val">{s.val}</div>
                            <div className="ig-stat-label">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {topPosts.length > 0 && (
                        <div className="ig-posts-preview">
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Top posts by reach</div>
                          {topPosts.map(p => (
                            <div key={p.igId} className="ig-post-row">
                              <div className="ig-post-thumb">
                                {p.thumbnailUrl
                                  ? <img src={p.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 7 }} />
                                  : <i className={`bi ${p.mediaType === "video" || p.mediaType === "reel" ? "bi-play-circle" : "bi-image"}`} style={{ color: "#94a3b8" }} />
                                }
                              </div>
                              <div className="ig-post-cap">{p.caption || "No caption"}</div>
                              <div className="ig-post-reach">
                                <span style={{ color: "#5A57FB", fontWeight: 700 }}>{fmtNum(p.reach)}</span>
                                <span style={{ color: "#94a3b8" }}> reach</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {!isConnected && (
                    <div className="ig-meta">
                      <span>Connect this brand's Instagram Business account to pull real-time metrics into the client portal.</span>
                    </div>
                  )}

                  <div className="ig-btn-row" style={{ marginTop: 14 }}>
                    {isConnected ? (
                      <>
                        <button className="ig-btn ig-btn-sync" onClick={() => syncNow(brand._id)} disabled={syncing[brand._id]}>
                          <i className="bi bi-arrow-repeat" style={{ marginRight: 5 }} />
                          {syncing[brand._id] ? "Syncing…" : "Sync Now"}
                        </button>
                        <button className="ig-btn ig-btn-disconnect" onClick={() => disconnect(brand._id, brand.name)}>
                          <i className="bi bi-x-circle" style={{ marginRight: 5 }} />Disconnect
                        </button>
                      </>
                    ) : (
                      <button className="ig-btn ig-btn-connect" onClick={() => startConnect(brand._id)}>
                        <i className="bi bi-instagram" style={{ marginRight: 6 }} />Connect Instagram
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Setup instructions */}
        <div style={{ marginTop: 40, background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: "0 0 16px" }}>
            <i className="bi bi-gear" style={{ marginRight: 8, color: "#5A57FB" }} />First-time setup (do once)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { n: 1, title: "Create Facebook Developer App", body: "Go to developers.facebook.com → My Apps → Create App → Choose 'Business' type. Add 'Instagram' product.", link: "https://developers.facebook.com/apps/" },
              { n: 2, title: "Add OAuth Redirect URI", body: `In App → Facebook Login → Settings → Valid OAuth Redirect URIs, add:\n${origin}/api/admin/brands/instagram/callback` },
              { n: 3, title: "Set environment variables", body: "In your .env file add:\nFACEBOOK_APP_ID=your_app_id\nFACEBOOK_APP_SECRET=your_app_secret" },
              { n: 4, title: "Add required permissions in App Review", body: "In App Review → Permissions, add: instagram_basic, instagram_manage_insights, pages_show_list, pages_read_engagement. For testing, use your own account without App Review." },
            ].map(s => (
              <div key={s.n} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#5A57FB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.n}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.title}</div>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", whiteSpace: "pre-line", lineHeight: 1.7 }}>{s.body}</div>
                {s.link && <a href={s.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#5A57FB", fontWeight: 600 }}>Open →</a>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Account selection modal */}
      {selectModal && (
        <div className="ig-modal-overlay" onClick={e => e.target === e.currentTarget && setSelectModal(null)}>
          <div className="ig-modal">
            <div className="ig-modal-head">
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Select Instagram Account</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                  Multiple accounts found. Choose the one for <strong>{selectModal.brandName}</strong>
                </div>
              </div>
              <button onClick={() => setSelectModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>×</button>
            </div>
            <div className="ig-modal-body">
              {selectModal.accounts.map(acc => (
                <div key={acc.igId}
                  className={`ig-account-option ${selectedIg === acc.igId ? "selected" : ""}`}
                  onClick={() => setSelectedIg(acc.igId)}>
                  <div className="ig-account-avatar">{acc.username?.[0]?.toUpperCase() || "I"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>@{acc.username}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {fmtNum(acc.followersCount)} followers · via {acc.pageName}
                    </div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selectedIg === acc.igId ? "#5A57FB" : "#E2E8F0"}`, background: selectedIg === acc.igId ? "#5A57FB" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selectedIg === acc.igId && <i className="bi bi-check" style={{ color: "#fff", fontSize: 12 }} />}
                  </div>
                </div>
              ))}
            </div>
            <div className="ig-modal-foot">
              <button onClick={() => setSelectModal(null)} style={{ padding: "9px 20px", background: "none", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#64748b" }}>
                Cancel
              </button>
              <button onClick={finalizeSelection} disabled={!selectedIg || finalizing}
                style={{ padding: "9px 20px", background: "linear-gradient(135deg,#5A57FB,#4845d4)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: finalizing ? .6 : 1 }}>
                {finalizing ? "Connecting…" : "Connect this account →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
