import React, { useEffect, useMemo, useState } from "react";
import PlayerController from "../components/PlayerController.jsx";
import WebRTCConnection from "../logic/WebRTCConnection.js";
import useGyro from "../hooks/useGyro.js";
import { roleIcons } from "../utils/mappingPresets.js";

export default function PlayerScreen({ playerId, setPlayerId, config, onResetRole }) {
  const [role, setRole] = useState(config.roles?.[playerId] || "vent");
  const [intensity, setIntensity] = useState(0.5);
  const [tap, setTap] = useState(false);
  const gyro = useGyro();
  const [connection, setConnection] = useState(null);

  const payload = useMemo(
    () => ({
      id: playerId,
      gyroX: gyro.x,
      gyroY: gyro.y,
      gyroZ: gyro.z,
      tap,
      intensity,
    }),
    [gyro, tap, intensity, playerId]
  );

  useEffect(() => {
    const rtc = new WebRTCConnection({ mode: "client" });
    rtc.join();
    setConnection(rtc);
    return () => rtc.close();
  }, []);

  useEffect(() => {
    if (!connection) return;
    connection.send(payload);
  }, [payload, connection]);

  const handleTap = () => {
    setTap(true);
    connection?.send({ ...payload, tap: true });
    setTimeout(() => setTap(false), 200);
  };

  const handlePlayerChange = (value) => {
    setPlayerId(value);
    setRole(config.roles?.[value] || role);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Mode Joueur</h2>
          <p style={{ opacity: 0.7, margin: "4px 0" }}>
            Envoi gyro & TAP via DataChannel hypno-channel. Les messages OSC sont relayés côté
            orchestrateur.
          </p>
        </div>
        <select
          value={playerId}
          onChange={(e) => handlePlayerChange(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
          }}
        >
          {["1", "2", "3", "4", "5", "6"].map((id) => (
            <option key={id} value={id}>
              Player {id}
            </option>
          ))}
        </select>
      </header>

      <div
        style={{
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          Gyro x:{gyro.x.toFixed(2)} y:{gyro.y.toFixed(2)} z:{gyro.z.toFixed(2)}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              display: "grid",
              placeItems: "center",
              fontSize: 22,
            }}
            aria-hidden
          >
            {roleIcons[role]}
          </span>
          <div style={{ fontSize: 14 }}>
            Rôle : <strong>{role}</strong>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Config scène: {config.scene || "-"}</div>
          </div>
        </div>
      </div>

      <PlayerController
        role={role}
        intensity={intensity}
        onIntensityChange={setIntensity}
        onTap={handleTap}
        onReset={onResetRole}
      />
    </div>
  );
}
