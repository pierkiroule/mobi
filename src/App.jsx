import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AudioEngine from "./logic/AudioEngine";
import FaceMeshVisualizer from "./components/FaceMeshVisualizer";

const patterns = [
  {
    id: "nod",
    title: "Hochement",
    description: "Inclinez la tête vers le bas",
    color: "#00ffb4",
    icon: "↓",
    activate: (metrics) => metrics.pitch > 0.08,
    deactivate: (metrics) => metrics.pitch < 0.05,
  },
  {
    id: "turn",
    title: "Rotation",
    description: "Tournez la tête à gauche/droite",
    color: "#64d4ff",
    icon: "↔",
    activate: (metrics) => Math.abs(metrics.yaw) > 0.08,
    deactivate: (metrics) => Math.abs(metrics.yaw) < 0.05,
  },
  {
    id: "smile",
    title: "Sourire",
    description: "Souriez largement",
    color: "#ff7a9c",
    icon: "☺",
    activate: (metrics) => metrics.mouthWidth > 0.9 && metrics.mouthOpen < 0.45,
    deactivate: (metrics) => metrics.mouthWidth < 0.82 || metrics.mouthOpen > 0.55,
  },
];

function distance(a, b) {
  const dx = (a?.x || 0) - (b?.x || 0);
  const dy = (a?.y || 0) - (b?.y || 0);
  const dz = (a?.z || 0) - (b?.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function computeMetrics(landmarks) {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const mouthLeft = landmarks[61];
  const mouthRight = landmarks[291];
  const mouthTop = landmarks[13];
  const mouthBottom = landmarks[14];

  const faceWidth = distance(leftEye, rightEye) || 1;
  const yaw = (rightCheek?.z || 0) - (leftCheek?.z || 0);
  const pitch = (chin?.z || 0) - (forehead?.z || 0);
  const roll = (leftEye?.y || 0) - (rightEye?.y || 0);
  const mouthWidth = distance(mouthLeft, mouthRight) / faceWidth;
  const mouthOpen = distance(mouthTop, mouthBottom) / faceWidth;

  return { yaw, pitch, roll, mouthWidth, mouthOpen };
}

export default function App() {
  const audioRef = useRef(new AudioEngine());

  const [audioReady, setAudioReady] = useState(false);
  const [faceReady, setFaceReady] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const smoothedMetricsRef = useRef(null);
  const [activePatterns, setActivePatterns] = useState(() =>
    patterns.reduce((acc, p) => ({ ...acc, [p.id]: false }), {})
  );
  const [samples, setSamples] = useState([null, null, null]);

  const resetActive = useMemo(
    () => patterns.reduce((acc, p) => ({ ...acc, [p.id]: false }), {}),
    []
  );

  const smoothMetrics = useCallback((nextMetrics) => {
    const previous = smoothedMetricsRef.current;
    if (!previous) {
      smoothedMetricsRef.current = nextMetrics;
      return nextMetrics;
    }

    const alpha = 0.18;
    const smoothed = Object.fromEntries(
      Object.entries(nextMetrics).map(([key, value]) => [
        key,
        previous[key] + (value - previous[key]) * alpha,
      ])
    );
    smoothedMetricsRef.current = smoothed;
    return smoothed;
  }, []);

  // Callback pour les résultats du face tracking
  const handleFaceResults = useCallback((results) => {
    const firstFace = results?.multiFaceLandmarks?.[0];
    if (!firstFace) {
      setActivePatterns(resetActive);
      setMetrics(null);
      return;
    }
    
    if (!faceReady) setFaceReady(true);
    
    const nextMetrics = smoothMetrics(computeMetrics(firstFace));
    setMetrics(nextMetrics);
    
    setActivePatterns((prev) =>
      patterns.reduce((acc, pattern) => {
        const wasActive = prev[pattern.id];
        const shouldActivate = pattern.activate(nextMetrics);
        const shouldDeactivate = pattern.deactivate?.(nextMetrics);

        if (wasActive) {
          acc[pattern.id] = shouldDeactivate ? !shouldDeactivate : shouldActivate;
        } else {
          acc[pattern.id] = shouldActivate;
        }
        return acc;
      }, {})
    );
  }, [resetActive, smoothMetrics, faceReady]);

  // Déclencher les sons selon les patterns actifs
  useEffect(() => {
    patterns.forEach((pattern, index) => {
      if (activePatterns[pattern.id]) {
        audioRef.current.startSlot(index);
      } else {
        audioRef.current.stopSlot(index);
      }
    });
  }, [activePatterns]);

  const handleAudioStart = async () => {
    try {
      await audioRef.current.init();
      setAudioReady(true);
    } catch (error) {
      console.error("Erreur audio:", error);
    }
  };

  const handleSampleChange = async (slot, file) => {
    if (!file) return;
    setSamples((prev) => {
      const next = [...prev];
      next[slot] = file.name;
      return next;
    });
    await audioRef.current.loadSample(slot, file);
  };

  return (
    <div className="app-container">
      {/* Header avec effet glassmorphism */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="url(#gradient)" strokeWidth="2"/>
                <circle cx="16" cy="12" r="4" fill="url(#gradient)"/>
                <path d="M8 22c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#00ffb4"/>
                    <stop offset="1" stopColor="#64d4ff"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className="app-title">Face Sample Pad</h1>
              <p className="app-subtitle">Powered by p5.js + ml5.js</p>
            </div>
          </div>
          
          <button 
            className={`audio-btn ${audioReady ? "active" : ""}`}
            onClick={handleAudioStart} 
            disabled={audioReady}
          >
            <span className="audio-icon">{audioReady ? "🔊" : "🔇"}</span>
            {audioReady ? "Audio Actif" : "Activer Audio"}
          </button>
        </div>
      </header>

      {/* Section principale avec visualisation */}
      <main className="main-content">
        <section className="visualizer-section">
          <FaceMeshVisualizer 
            onResults={handleFaceResults}
            width={640}
            height={480}
            className="face-visualizer"
          />
          
          {/* Métriques en temps réel */}
          <div className="metrics-panel">
            <h3 className="metrics-title">
              <span className="metrics-dot" style={{ background: faceReady ? "#00ffb4" : "#666" }} />
              Métriques Temps Réel
            </h3>
            {metrics ? (
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-label">Yaw</span>
                  <span className="metric-value">{metrics.yaw.toFixed(3)}</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill" 
                      style={{ 
                        width: `${Math.min(Math.abs(metrics.yaw) * 500, 100)}%`,
                        background: metrics.yaw > 0 ? "#64d4ff" : "#ff7a9c"
                      }} 
                    />
                  </div>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Pitch</span>
                  <span className="metric-value">{metrics.pitch.toFixed(3)}</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill" 
                      style={{ 
                        width: `${Math.min(Math.abs(metrics.pitch) * 500, 100)}%`,
                        background: "#00ffb4"
                      }} 
                    />
                  </div>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Roll</span>
                  <span className="metric-value">{metrics.roll.toFixed(3)}</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill" 
                      style={{ 
                        width: `${Math.min(Math.abs(metrics.roll) * 500, 100)}%`,
                        background: "#ffc864"
                      }} 
                    />
                  </div>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Bouche</span>
                  <span className="metric-value">{metrics.mouthOpen.toFixed(3)}</span>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill" 
                      style={{ 
                        width: `${Math.min(metrics.mouthOpen * 200, 100)}%`,
                        background: "#ff7a9c"
                      }} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="metrics-placeholder">En attente de détection...</p>
            )}
          </div>
        </section>

        {/* Section des patterns/samples */}
        <section className="patterns-section">
          <h2 className="section-title">Sample Pads</h2>
          <p className="section-subtitle">
            Chaque mouvement détecté déclenche un sample. Importez vos propres sons !
          </p>
          
          <div className="patterns-grid">
            {patterns.map((pattern, index) => (
              <article 
                key={pattern.id} 
                className={`pattern-card ${activePatterns[pattern.id] ? "active" : ""}`}
                style={{ "--pattern-color": pattern.color }}
              >
                <div className="pattern-header">
                  <div className="pattern-icon" style={{ background: pattern.color }}>
                    {pattern.icon}
                  </div>
                  <div className="pattern-info">
                    <h3 className="pattern-title">{pattern.title}</h3>
                    <p className="pattern-desc">{pattern.description}</p>
                  </div>
                  <div 
                    className="pattern-indicator"
                    style={{
                      background: activePatterns[pattern.id] ? pattern.color : "rgba(255,255,255,0.1)",
                      boxShadow: activePatterns[pattern.id] ? `0 0 20px ${pattern.color}` : "none"
                    }}
                  />
                </div>
                
                <label className="sample-upload">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleSampleChange(index, e.target.files?.[0])}
                  />
                  <span className="upload-icon">
                    {samples[index] ? "🎵" : "📁"}
                  </span>
                  <span className="upload-text">
                    {samples[index] || "Importer un sample"}
                  </span>
                </label>
                
                {!audioReady && (
                  <p className="pattern-hint">Activez l'audio pour jouer les samples</p>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Footer avec infos tech */}
      <footer className="app-footer">
        <div className="tech-badges">
          <span className="tech-badge">p5.js</span>
          <span className="tech-badge">ml5.js</span>
          <span className="tech-badge">FaceMesh</span>
          <span className="tech-badge">Web Audio API</span>
        </div>
        <p className="footer-text">
          Détection faciale en temps réel avec visualisation p5.js
        </p>
      </footer>
    </div>
  );
}
