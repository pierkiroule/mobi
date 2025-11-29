import React, { useEffect, useRef, useState, useCallback } from "react";
import FaceTrackerP5 from "../logic/FaceTrackerP5.js";

/**
 * Composant de visualisation du Face Mesh avec p5.js et ml5.js
 * Affiche la vidéo avec overlay de détection faciale en temps réel
 */
export default function FaceMeshVisualizer({ 
  onResults, 
  width = 640, 
  height = 480,
  className,
  style 
}) {
  const containerRef = useRef(null);
  const p5Ref = useRef(null);
  const trackerRef = useRef(null);
  const [status, setStatus] = useState("Initialisation...");
  const [isReady, setIsReady] = useState(false);

  // Callback stable pour les résultats
  const handleResults = useCallback((results) => {
    onResults?.(results);
  }, [onResults]);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    // Vérifier que p5 et ml5 sont chargés
    if (!window.p5) {
      setStatus("Erreur: p5.js non chargé");
      return;
    }
    if (!window.ml5) {
      setStatus("Erreur: ml5.js non chargé");
      return;
    }

    setStatus("Démarrage de la caméra...");

    // Créer le sketch p5.js
    const sketch = (p) => {
      let tracker = null;

      p.setup = async () => {
        // Créer le canvas avec le bon ratio
        const canvas = p.createCanvas(width, height);
        canvas.style("display", "block");
        canvas.style("border-radius", "12px");
        
        p.pixelDensity(1);
        p.frameRate(30);

        // Initialiser le tracker
        tracker = new FaceTrackerP5(p, handleResults);
        trackerRef.current = tracker;

        try {
          await tracker.start();
          setStatus("Caméra + FaceMesh prêts");
          setIsReady(true);
        } catch (error) {
          console.error("Erreur tracker:", error);
          setStatus(`Erreur: ${error.message}`);
        }
      };

      p.draw = () => {
        // Fond sombre si pas de vidéo
        p.background(15, 17, 23);
        
        // Dessiner la visualisation du tracker
        if (tracker) {
          tracker.draw();
        }

        // Indicateur de status en haut à gauche
        if (!isReady) {
          p.push();
          p.fill(255, 200);
          p.noStroke();
          p.textSize(14);
          p.textAlign(p.LEFT, p.TOP);
          p.text(status, 12, 12);
          p.pop();
        }
      };

      p.windowResized = () => {
        // Adapter si le conteneur change de taille
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const newWidth = Math.min(rect.width, width);
          const newHeight = (newWidth / width) * height;
          p.resizeCanvas(newWidth, newHeight);
        }
      };
    };

    // Créer l'instance p5
    p5Ref.current = new window.p5(sketch, containerRef.current);

    // Cleanup
    return () => {
      if (trackerRef.current) {
        trackerRef.current.stop();
        trackerRef.current = null;
      }
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, [width, height, handleResults]);

  return (
    <div 
      className={className}
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#0f1117",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        ...style
      }}
    >
      <div ref={containerRef} style={{ width: "100%", aspectRatio: `${width}/${height}` }} />
      
      {/* Badge de status */}
      <div 
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          padding: "6px 12px",
          borderRadius: 8,
          background: isReady 
            ? "rgba(0, 255, 180, 0.15)" 
            : "rgba(255, 200, 100, 0.15)",
          border: `1px solid ${isReady ? "rgba(0, 255, 180, 0.3)" : "rgba(255, 200, 100, 0.3)"}`,
          fontSize: 12,
          color: isReady ? "#00ffb4" : "#ffc864",
          fontWeight: 500,
          backdropFilter: "blur(8px)"
        }}
      >
        {isReady ? "● Tracking actif" : status}
      </div>
    </div>
  );
}
