import React from "react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

function doLogout(router) {
  fetch("/api/admin/logout", { method: "POST", credentials: "include" })
    .catch(() => {})
    .finally(() => router.push("/dashboard/login"));
}

export function confirmLogout(router) {
  confirmAlert({
    customUI: ({ onClose }) => (
      <div style={{
        background: "#fff", borderRadius: 16, padding: "26px 26px 22px", maxWidth: 340,
        boxShadow: "0 20px 60px rgba(15,23,42,.28)", textAlign: "center",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px",
          background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="bi bi-box-arrow-right" style={{ fontSize: 22, color: "#DC2626" }} />
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#111827" }}>Log out?</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
          You&rsquo;ll need to sign in again to access the dashboard.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid #E5E7EB",
              background: "#fff", color: "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onClose(); doLogout(router); }}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, border: "none",
              background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    ),
  });
}
