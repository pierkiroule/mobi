import { useEffect } from "react";

const FACE_MESH_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js";
const CAMERA_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1627441595/camera_utils.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      if (existing.dataset.loaded === "true") resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function resolveFaceMeshClass() {
  return window.FaceMesh || window.faceMesh?.FaceMesh || window.face_mesh?.FaceMesh;
}

function resolveCameraClass() {
  return window.Camera || window.cameraUtils?.Camera || window.camera_utils?.Camera;
}

export default function useFaceMesh(videoRef, onUpdate, options = {}) {
  const { enabled = true, onStatus } = options;

  useEffect(() => {
    if (!enabled) return undefined;
    if (!videoRef?.current) return undefined;

    let mesh;
    let camera;
    let cancelled = false;

    const setStatus = (message) => onStatus?.(message);

    const ensureLibs = async () => {
      if (!resolveCameraClass()) await loadScript(CAMERA_URL);
      if (!resolveFaceMeshClass()) await loadScript(FACE_MESH_URL);
      const CameraClass = resolveCameraClass();
      const FaceMeshClass = resolveFaceMeshClass();
      if (!CameraClass || !FaceMeshClass) {
        throw new Error("MediaPipe FaceMesh introuvable");
      }
      return { CameraClass, FaceMeshClass };
    };

    const start = async () => {
      setStatus?.("Initialisation FaceMesh...");
      const { CameraClass, FaceMeshClass } = await ensureLibs();
      if (cancelled) return;

      mesh = new FaceMeshClass({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
      });
      mesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      mesh.onResults((results) => {
        if (cancelled) return;
        const firstFace = results?.multiFaceLandmarks?.[0] || null;
        onUpdate?.(firstFace);
      });

      camera = new CameraClass(videoRef.current, {
        onFrame: async () => {
          await mesh.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
        facingMode: "user",
      });

      await camera.start();
      if (!cancelled) setStatus?.("Caméra frontale + FaceMesh actifs");
    };

    start().catch((error) => setStatus?.(error.message));

    return () => {
      cancelled = true;
      camera?.stop?.();
      mesh?.close?.();
    };
  }, [enabled, onStatus, onUpdate, videoRef]);
}
