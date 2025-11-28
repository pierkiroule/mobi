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

export default class FaceTracker {
  constructor(videoElement, overlayCanvas, onResults) {
    this.video = videoElement;
    this.overlay = overlayCanvas;
    this.onResults = onResults;
    this.camera = null;
    this.mesh = null;
  }

  async ensureLibs() {
    if (!resolveCameraClass()) {
      await loadScript(CAMERA_URL);
    }
    if (!resolveFaceMeshClass()) {
      await loadScript(FACE_MESH_URL);
    }
    const CameraClass = resolveCameraClass();
    const FaceMeshClass = resolveFaceMeshClass();
    if (!CameraClass || !FaceMeshClass) {
      throw new Error("Impossible de charger MediaPipe FaceMesh");
    }
    return { CameraClass, FaceMeshClass };
  }

  async start() {
    const { CameraClass, FaceMeshClass } = await this.ensureLibs();
    this.mesh = new FaceMeshClass({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
    });
    this.mesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    this.mesh.onResults((results) => {
      this.draw(results);
      this.onResults?.(results);
    });

    this.camera = new CameraClass(this.video, {
      onFrame: async () => {
        await this.mesh.send({ image: this.video });
      },
      width: 480,
      height: 360,
    });

    await this.camera.start();
  }

  draw(results) {
    if (!this.overlay || !results?.multiFaceLandmarks?.length) return;
    const ctx = this.overlay.getContext("2d");
    const { width, height } = this.overlay;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(0, 255, 170, 0.8)";
    ctx.lineWidth = 1.2;

    const landmarks = results.multiFaceLandmarks[0];
    landmarks.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 255, 170, 0.7)";
      ctx.fill();
    });
  }

  stop() {
    this.camera?.stop();
    this.mesh?.close?.();
  }
}
