const VIDEO_WIDTH = 480;
const VIDEO_HEIGHT = 360;

function ensureMl5() {
  if (typeof window === "undefined") {
    throw new Error("ml5 non disponible côté serveur");
  }
  if (!window.ml5) {
    throw new Error("ml5 n'est pas chargé. Vérifiez les balises de script.");
  }
}

function normalizeLandmarks(prediction, video) {
  const width = video.videoWidth || VIDEO_WIDTH;
  const height = video.videoHeight || VIDEO_HEIGHT;
  const scaledMesh = prediction?.scaledMesh;
  if (!scaledMesh) return null;

  return scaledMesh.map(([x, y, z]) => ({
    x: x / width,
    y: y / height,
    z: z / width,
  }));
}

export default class FaceTracker {
  constructor(videoElement, overlayCanvas, onResults) {
    this.video = videoElement;
    this.overlay = overlayCanvas;
    this.onResults = onResults;
    this.mesh = null;
    this.stream = null;
  }

  async startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia non supporté par ce navigateur");
    }

    // Attributs essentiels pour mobile iOS/Android
    this.video.setAttribute("playsinline", "true");
    this.video.setAttribute("autoplay", "true");
    this.video.setAttribute("muted", "true");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.width = VIDEO_WIDTH;
    this.video.height = VIDEO_HEIGHT;

    try {
      // Utiliser facingMode: "user" pour la caméra frontale sur mobile
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: VIDEO_WIDTH },
          height: { ideal: VIDEO_HEIGHT },
          facingMode: "user",
        },
        audio: false,
      });
    } catch (error) {
      // Fallback sans facingMode si non supporté
      console.warn("Caméra frontale non disponible, essai avec caméra par défaut:", error);
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: VIDEO_WIDTH },
          height: { ideal: VIDEO_HEIGHT },
        },
        audio: false,
      });
    }

    this.video.srcObject = this.stream;
    
    // Attendre que le flux vidéo soit prêt avant de jouer
    await new Promise((resolve, reject) => {
      this.video.onloadedmetadata = () => {
        this.video.play()
          .then(resolve)
          .catch(reject);
      };
      this.video.onerror = () => reject(new Error("Erreur de chargement vidéo"));
      // Timeout de sécurité
      setTimeout(() => reject(new Error("Timeout: la vidéo n'a pas pu démarrer")), 10000);
    });
  }

  async start() {
    ensureMl5();
    await this.startCamera();

    this.mesh = await window.ml5.facemesh(this.video, {
      maxFaces: 1,
      flipHorizontal: true,
    });

    this.mesh.on("predict", (predictions) => {
      const first = predictions?.[0];
      const landmarks = normalizeLandmarks(first, this.video);
      const results = landmarks ? { multiFaceLandmarks: [landmarks] } : { multiFaceLandmarks: [] };

      this.draw(results);
      this.onResults?.(results);
    });
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
    if (this.mesh?.removeAllListeners) {
      this.mesh.removeAllListeners("predict");
    }
    this.mesh = null;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
