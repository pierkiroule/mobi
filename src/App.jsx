import React, { useMemo, useState } from "react";
import RoleSelect from "./pages/RoleSelect.jsx";
import OrchestratorScreen from "./pages/OrchestratorScreen.jsx";
import PlayerScreen from "./pages/PlayerScreen.jsx";
import { loadConfig, saveConfig } from "./logic/SaveLoadConfig.js";

const initialConfig = loadConfig() || {
  scene: "foret",
  roles: {},
};

function App() {
  const [role, setRole] = useState(null);
  const [playerId, setPlayerId] = useState("1");
  const [config, setConfig] = useState(initialConfig);

  const setRoleAndPersist = (selectedRole) => {
    setRole(selectedRole);
    const updated = { ...config, lastRole: selectedRole };
    setConfig(updated);
    saveConfig(updated);
  };

  const handleUpdateConfig = (nextConfig) => {
    setConfig(nextConfig);
    saveConfig(nextConfig);
  };

  const screens = useMemo(
    () => ({
      orchestrator: (
        <OrchestratorScreen
          config={config}
          onConfigChange={handleUpdateConfig}
          onResetRole={() => setRole(null)}
        />
      ),
      player: (
        <PlayerScreen
          playerId={playerId}
          setPlayerId={setPlayerId}
          config={config}
          onResetRole={() => setRole(null)}
        />
      ),
    }),
    [config, playerId]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
        }}
      >
        {!role && <RoleSelect onSelectRole={setRoleAndPersist} />}
        {role === "orchestrator" && screens.orchestrator}
        {role === "player" && screens.player}
      </div>
    </div>
  );
}

export default App;
