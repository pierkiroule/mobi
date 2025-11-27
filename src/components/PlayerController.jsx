import React from "react";
import { roleIcons } from "../utils/mappingPresets.js";

export default function PlayerController({
  role,
  intensity,
  onIntensityChange,
  onTap,
  onReset,
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 16,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>{roleIcons[role] || "🎛️"}</div>
        <div style={{ fontWeight: 700, letterSpacing: 0.5 }}>{role || "role"}</div>
      </div>
      <label style={{ display: "grid", gap: 6 }}>
        Intensité : {Math.round(intensity * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={intensity}
          onChange={(e) => onIntensityChange(Number(e.target.value))}
        />
      </label>
      <button
        onClick={onTap}
        style={{
          padding: "14px 16px",
          borderRadius: 12,
          background: "linear-gradient(135deg, #ffb366, #ff7a7a)",
          border: "none",
          color: "#0c0c0f",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
        }}
      >
        TAP
      </button>
      <button
        onClick={onReset}
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.3)",
          background: "transparent",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Changer de rôle
      </button>
    </div>
  );
}
