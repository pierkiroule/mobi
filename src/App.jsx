import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AudioEngine from "./logic/AudioEngine";
import FaceTracker from "./logic/FaceTracker";

const patterns = [
  {
    id: "nod",
    title: "Hochement",
    description: "Inclinez la tête vers le bas (pitch)",
    color: "#6ee7b7",
    activate: (metrics) => metrics.pitch > 0.08,
    deactivate: (metrics) => metrics.pitch < 0.05,
  },
  {
    id: "turn",
    title: "Rotation",
    description: "Tournez la tête à gauche/droite (yaw)",
    color: "#93c5fd",
    activate: (metrics) => Math.abs(metrics.yaw) > 0.08,
    deactivate: (metrics) => Math.abs(metrics.yaw) < 0.05,
  },
  {
    id: "smile",
    title: "Sourire",
    description: "Souriez largement (coin des lèvres)",
    color: "#fbbf24",
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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const trackerRef = useRef(null);
  const audioRef = useRef(new AudioEngine());

  const [status, setStatus] = useState("Camera non initialisée");
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

  useEffect(() => {
    if (!videoRef.current) return undefined;
    const tracker = new FaceTracker(videoRef.current, canvasRef.current, (results) => {
      const firstFace = results?.multiFaceLandmarks?.[0];
      if (!firstFace) {
        setActivePatterns(resetActive);
        setMetrics(null);
        return;
      }
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
    });

    tracker
      .start()
      .then(() => {
        trackerRef.current = tracker;
        setFaceReady(true);
        setStatus("Camera + FaceMesh prêts");
      })
      .catch((error) => setStatus(error.message));

    return () => tracker.stop();
  }, [resetActive, smoothMetrics]);

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
      setStatus(error.message);
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
    <div className="layout">
      <header className="hero">
        <div>
          <p className="eyebrow">Prototype</p>
          <h1>Pad de samples piloté par le visage</h1>
          <p className="muted">
            Trois patterns simples (hochement, rotation, sourire) déclenchent trois boucles audio.
            Importez vos samples, activez l&apos;audio, et laissez la caméra suivre votre visage.
          </p>
          <div className="inline-actions">
            <button className="primary" onClick={handleAudioStart} disabled={audioReady}>
              {audioReady ? "Audio actif" : "Activer l'audio"}
            </button>
            <span className="status">{status}</span>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="video-wrapper">
          <video 
            ref={videoRef} 
            className="preview" 
            playsInline
            webkit-playsinline=""
            muted 
            autoPlay
            style={{ transform: "scaleX(-1)" }}
          />
          <canvas 
            ref={canvasRef} 
            className="overlay" 
            width={480} 
            height={360} 
            style={{ transform: "scaleX(-1)" }}
          />
        </div>
        <div className="metrics">
          <h3>Métriques temps réel</h3>
          {metrics ? (
            <ul>
              <li>Yaw (rotation): {metrics.yaw.toFixed(3)}</li>
              <li>Pitch (inclinaison): {metrics.pitch.toFixed(3)}</li>
              <li>Roll (inclinaison latérale): {metrics.roll.toFixed(3)}</li>
              <li>Mouth width: {metrics.mouthWidth.toFixed(3)}</li>
              <li>Ouverture: {metrics.mouthOpen.toFixed(3)}</li>
            </ul>
          ) : (
            <p className="muted">Détection en cours...</p>
          )}
        </div>
      </section>

      <section className="grid">
        {patterns.map((pattern, index) => (
          <article key={pattern.id} className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Pattern #{index + 1}</p>
                <h3>{pattern.title}</h3>
                <p className="muted">{pattern.description}</p>
              </div>
              <span
                className="dot"
                style={{
                  background: activePatterns[pattern.id] ? pattern.color : "rgba(255,255,255,0.12)",
                  boxShadow: activePatterns[pattern.id]
                    ? `0 0 12px ${pattern.color}`
                    : "none",
                }}
                aria-label={activePatterns[pattern.id] ? "Actif" : "Inactif"}
              />
            </div>
            <label className="upload">
              <span>{samples[index] || "Importer un sample (wav/mp3)"}</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleSampleChange(index, e.target.files?.[0])}
              />
            </label>
            {!audioReady && <p className="muted">Activez l&apos;audio avant de jouer les boucles.</p>}
            {faceReady && (
              <p className="hint">
                Se déclenche dès que le pattern est détecté. Arrêt automatique lorsque le mouvement cesse.
              </p>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
