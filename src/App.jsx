import React, { useEffect, useMemo, useRef, useState } from "react";
import AudioEngine from "./logic/AudioEngine";
import FaceTracker from "./logic/FaceTracker";
import Ml5Tracker from "./logic/Ml5Tracker";

const patterns = [
  {
    id: "nod",
    title: "Hochement",
    description: "Inclinez la tête vers le bas (pitch)",
    color: "#6ee7b7",
    check: (metrics) => metrics.pitch > 0.08,
  },
  {
    id: "turn",
    title: "Rotation",
    description: "Tournez la tête à gauche/droite (yaw)",
    color: "#93c5fd",
    check: (metrics) => Math.abs(metrics.yaw) > 0.08,
  },
  {
    id: "smile",
    title: "Sourire",
    description: "Souriez largement (coin des lèvres)",
    color: "#fbbf24",
    check: (metrics) => metrics.mouthWidth > 0.9 && metrics.mouthOpen < 0.45,
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
  const testVideoRef = useRef(null);
  const trackerRef = useRef(null);
  const audioRef = useRef(new AudioEngine());
  const testStreamRef = useRef(null);

  const [status, setStatus] = useState("Camera non initialisée");
  const [audioReady, setAudioReady] = useState(false);
  const [faceReady, setFaceReady] = useState(false);
  const [testStatus, setTestStatus] = useState("Flux en attente de lancement");
  const [isTesting, setIsTesting] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [activePatterns, setActivePatterns] = useState(() =>
    patterns.reduce((acc, p) => ({ ...acc, [p.id]: false }), {})
  );
  const [samples, setSamples] = useState([null, null, null]);
  const [view, setView] = useState("test");
  const [backend, setBackend] = useState("mediapipe");

  const resetActive = useMemo(
    () => patterns.reduce((acc, p) => ({ ...acc, [p.id]: false }), {}),
    []
  );

  useEffect(() => {
    if (view !== "tracker") {
      trackerRef.current?.stop?.();
      setMetrics(null);
      setActivePatterns(resetActive);
      setFaceReady(false);
      setStatus("Tracking en pause");
      return undefined;
    }

    if (!videoRef.current) return undefined;
    const TrackerClass = backend === "ml5" ? Ml5Tracker : FaceTracker;
    const tracker = new TrackerClass(videoRef.current, canvasRef.current, (results) => {
      const firstFace = results?.multiFaceLandmarks?.[0];
      if (!firstFace) {
        setActivePatterns(resetActive);
        setMetrics(null);
        return;
      }
      const nextMetrics = computeMetrics(firstFace);
      setMetrics(nextMetrics);
      setActivePatterns(
        patterns.reduce((acc, pattern) => {
          acc[pattern.id] = pattern.check(nextMetrics);
          return acc;
        }, {})
      );
    });

    tracker
      .start()
      .then(() => {
        trackerRef.current = tracker;
        setFaceReady(true);
        setStatus(
          backend === "ml5"
            ? "Camera + ml5.js Facemesh prêts"
            : "Camera + MediaPipe FaceMesh prêts"
        );
      })
      .catch((error) => setStatus(error.message));

    return () => tracker.stop();
  }, [backend, resetActive, view]);

  useEffect(() => {
    patterns.forEach((pattern, index) => {
      if (activePatterns[pattern.id]) {
        audioRef.current.startSlot(index);
      } else {
        audioRef.current.stopSlot(index);
      }
    });
  }, [activePatterns]);

  const stopCameraTest = () => {
    const tracks = testStreamRef.current?.getTracks?.();
    tracks?.forEach((t) => t.stop());
    testStreamRef.current = null;
    setIsTesting(false);
  };

  const handleCameraTest = async () => {
    if (isTesting) {
      stopCameraTest();
      setTestStatus("Flux arrêté");
      return;
    }

    try {
      setTestStatus("Demande d'autorisation...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = stream;
        await testVideoRef.current.play();
      }
      testStreamRef.current = stream;
      setIsTesting(true);
      setTestStatus("Flux caméra actif (caméra frontale)");
    } catch (error) {
      setTestStatus(error.message || "Impossible d'accéder à la caméra");
      setIsTesting(false);
    }
  };

  useEffect(() => () => stopCameraTest(), []);

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
      <div className="tabs">
        <button
          className={`tab ${view === "test" ? "active" : ""}`}
          type="button"
          onClick={() => setView("test")}
        >
          Test caméra
        </button>
        <button
          className={`tab ${view === "tracker" ? "active" : ""}`}
          type="button"
          onClick={() => setView("tracker")}
        >
          Tracking + audio
        </button>
      </div>

      {view === "test" && (
        <section className="panel">
          <div className="video-wrapper test-wrapper">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Test caméra</p>
                <h2>Vérifiez le flux avant le tracking</h2>
                <p className="muted">
                  Lancez le flux caméra frontale pour confirmer que la vidéo fonctionne avant d'activer le
                  tracking et l'audio.
                </p>
              </div>
              <button className="primary" onClick={handleCameraTest}>
                {isTesting ? "Arrêter le test" : "Lancer le test"}
              </button>
            </div>
            <video
              ref={testVideoRef}
              className="preview"
              playsInline
              muted
              autoPlay
              aria-label="Aperçu de test caméra"
            />
            <p className="status test-status">{testStatus}</p>
          </div>
        </section>
      )}

      {view === "tracker" && (
        <>
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
              <div className="backend-toggle" role="group" aria-label="Choix du tracker">
                <button
                  type="button"
                  className={`chip ${backend === "mediapipe" ? "active" : ""}`}
                  onClick={() => setBackend("mediapipe")}
                >
                  MediaPipe FaceMesh
                </button>
                <button
                  type="button"
                  className={`chip ${backend === "ml5" ? "active" : ""}`}
                  onClick={() => setBackend("ml5")}
                >
                  ml5.js facemesh
                </button>
              </div>
            </div>
          </header>

          <section className="panel">
            <div className="video-wrapper">
              <video
                ref={videoRef}
                className="preview"
                playsInline
                muted
                autoPlay
                aria-label="Aperçu caméra"
              />
              <canvas ref={canvasRef} className="overlay" width={480} height={360} />
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
                      background: activePatterns[pattern.id]
                        ? pattern.color
                        : "rgba(255,255,255,0.12)",
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
        </>
      )}
    </div>
  );
}
