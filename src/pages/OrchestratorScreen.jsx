import React, { useEffect, useState } from "react";
import OrchestratorPanel from "../components/OrchestratorPanel.jsx";
import WebRTCConnection from "../logic/WebRTCConnection.js";
import { sendOsc } from "../logic/OscClient.js";
import { mapRoleToMidi } from "../logic/MidiMapping.js";

const defaultPlayers = Array.from({ length: 6 }, (_, index) => ({
  id: `${index + 1}`,
  role: null,
  active: true,
  gyro: { x: 0, y: 0, z: 0 },
  intensity: 0,
  tap: false,
}));

export default function OrchestratorScreen({ config, onConfigChange, onResetRole }) {
  const [players, setPlayers] = useState(defaultPlayers);
  const [globalIntensity, setGlobalIntensity] = useState(0.6);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const rtc = new WebRTCConnection({
      mode: "host",
      onMessage: (payload) => {
        if (!payload?.id) return;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === String(payload.id)
              ? {
                  ...p,
                  gyro: {
                    x: Number(payload.gyroX ?? 0),
                    y: Number(payload.gyroY ?? 0),
                    z: Number(payload.gyroZ ?? 0),
                  },
                  intensity: payload.intensity ?? p.intensity,
                  tap: Boolean(payload.tap),
                }
              : p
          )
        );
      },
    });

    rtc.host();
    setConnection(rtc);
    return () => rtc.close();
  }, []);

  const handleRoleChange = (id, role) => {
    const updated = players.map((p) => (p.id === id ? { ...p, role } : p));
    setPlayers(updated);
    onConfigChange({ ...config, roles: { ...config.roles, [id]: role } });
  };

  const handleToggleActive = (id) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const handleSceneChange = (scene) => {
    onConfigChange({ ...config, scene });
    sendOsc("/scene/set", scene);
  };

  const triggerMidiFromRole = (player) => {
    if (!player.role) return;
    const mapped = mapRoleToMidi(player.role, player.gyro, player.intensity, player.tap);
    if (!mapped) return;
    Object.entries(mapped).forEach(([key, value]) => {
      const addr = `/player/${player.id}/${key}`;
      sendOsc(addr, value);
    });
  };

  const handleCrescendo = () => {
    setGlobalIntensity(1);
    players.forEach((p) => sendOsc(`/player/${p.id}/volume`, 1));
  };

  const handleSilence = () => {
    setGlobalIntensity(0);
    players.forEach((p) => sendOsc(`/player/${p.id}/volume`, 0));
  };

  const handleMuteAll = () => {
    players.forEach((p) => sendOsc(`/player/${p.id}/cc10`, 0));
  };

  useEffect(() => {
    players.forEach((player) => triggerMidiFromRole(player));
  }, [players]);

  useEffect(() => {
    players.forEach((p) => sendOsc(`/player/${p.id}/volume`, globalIntensity));
  }, [globalIntensity, players]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Mode Orchestrateur</h2>
          <p style={{ margin: "4px 0", opacity: 0.75 }}>
            WebRTC DataChannel actif (hypno-channel). Diffusion OSC &rarr; Ableton Live :8000.
          </p>
        </div>
        <button
          onClick={onResetRole}
          style={{
            background: "transparent",
            color: "#fefefe",
            border: "1px solid rgba(255,255,255,0.4)",
            padding: "10px 14px",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          Changer de rôle
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Scène & dynamique</h3>
          <label style={{ display: "block", marginBottom: 10 }}>
            Scène actuelle
            <select
              value={config.scene}
              onChange={(e) => handleSceneChange(e.target.value)}
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.35)",
                color: "#fdfdfd",
              }}
            >
              <option value="foret">Forêt</option>
              <option value="feu">Feu</option>
              <option value="eau">Eau</option>
              <option value="vent">Vent</option>
              <option value="oiseaux">Oiseaux</option>
              <option value="tonnerre">Tonnerre</option>
            </select>
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            Intensité globale : {Math.round(globalIntensity * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={globalIntensity}
              onChange={(e) => setGlobalIntensity(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={handleMuteAll} style={buttonStyle}>Mute all</button>
            <button onClick={handleSilence} style={buttonStyle}>Silence</button>
            <button onClick={handleCrescendo} style={buttonStyle}>Crescendo</button>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Flux gyro en temps réel</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {players.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.02)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Player {p.id}</div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    x:{p.gyro.x.toFixed ? p.gyro.x.toFixed(2) : p.gyro.x} y:
                    {p.gyro.y.toFixed ? p.gyro.y.toFixed(2) : p.gyro.y} z:
                    {p.gyro.z.toFixed ? p.gyro.z.toFixed(2) : p.gyro.z}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: p.tap ? "#ffb366" : "rgba(255,255,255,0.2)",
                      boxShadow: p.tap
                        ? "0 0 12px rgba(255, 179, 102, 0.8)"
                        : "none",
                    }}
                  />
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {Math.round((p.intensity || 0) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <OrchestratorPanel
        players={players}
        onRoleChange={handleRoleChange}
        onToggleActive={handleToggleActive}
      />

      <footer style={{ fontSize: 13, opacity: 0.7 }}>
        DataChannel: hypno-channel — {connection ? "en ligne" : "initialisation"}
      </footer>
    </div>
  );
}

const buttonStyle = {
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.06)",
  color: "#fefefe",
  padding: "10px 12px",
  cursor: "pointer",
};
