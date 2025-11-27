import React from "react";

function OptionCard({ title, description, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "18px 16px",
        textAlign: "left",
        background: "rgba(255,255,255,0.04)",
        color: "#f8f9ff",
        border: `1px solid ${accent}`,
        borderRadius: 14,
        cursor: "pointer",
        boxShadow: "0 10px 35px rgba(0,0,0,0.25)",
        transition: "transform 160ms ease, border-color 160ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
    >
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{description}</div>
    </button>
  );
}

export default function RoleSelect({ onSelectRole }) {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Hypnosonore Proto 1</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Sélectionnez votre mode pour démarrer la session locale. Les données
        transitent uniquement en peer-to-peer (WebRTC DataChannel), et
        l&apos;Orchestrateur diffuse en OSC vers Ableton Live.
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        <OptionCard
          title="Je suis Orchestrateur"
          description="Contrôler la scène, router les flux OSC/MIDI, surveiller les gyro."
          accent="rgba(128, 208, 255, 0.7)"
          onClick={() => onSelectRole("orchestrator")}
        />
        <OptionCard
          title="Je suis Joueur"
          description="Transformer le téléphone en mobistrument connecté."
          accent="rgba(255, 179, 102, 0.7)"
          onClick={() => onSelectRole("player")}
        />
      </div>
    </div>
  );
}
