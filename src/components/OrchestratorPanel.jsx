import React from "react";
import { roleIcons } from "../utils/mappingPresets.js";

const roles = ["vent", "eau", "foret", "feu", "oiseaux", "tonnerre"];

export default function OrchestratorPanel({ players, onRoleChange, onToggleActive }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        padding: 16,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Gestion des joueurs</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {players.map((player) => (
          <div
            key={player.id}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.06)",
              background: player.active
                ? "rgba(128,255,190,0.04)"
                : "rgba(255,255,255,0.02)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>Player {player.id}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {player.role ? `Rôle: ${player.role}` : "Aucun rôle"}
              </div>
            </div>
            <select
              value={player.role || ""}
              onChange={(e) => onRoleChange(player.id, e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(0,0,0,0.35)",
                color: "#fdfdfd",
              }}
            >
              <option value="">Choisir un rôle</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 18,
                }}
                aria-hidden
              >
                {player.role ? roleIcons[player.role] || "🌀" : "?"}
              </div>
              <button
                onClick={() => onToggleActive(player.id)}
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: player.active
                    ? "rgba(128,255,190,0.15)"
                    : "rgba(255,255,255,0.08)",
                  color: "#fefefe",
                  padding: "10px 12px",
                  cursor: "pointer",
                  width: 120,
                }}
              >
                {player.active ? "Désactiver" : "Activer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
