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
    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("webkit-playsinline", "");
    this.video.setAttribute("autoplay", "");
    this.video.setAttribute("muted", "");
    this.video.muted = true;
    this.video.playsInline = true;
    
    // Ne pas définir width/height via attributs - laisse le CSS gérer
    // Cela évite les conflits de dimensionnement sur mobile

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
      const cleanup = () => {
        this.video.onloadedmetadata = null;
        this.video.onerror = null;
      };
      
      this.video.onloadedmetadata = () => {
        cleanup();
        // Force le recalcul des dimensions sur mobile
        this.video.style.width = "100%";
        this.video.style.height = "auto";
        this.video.play()
          .then(resolve)
          .catch((err) => {
            // Sur mobile, l'autoplay peut être bloqué sans interaction utilisateur
            console.warn("Autoplay bloqué, tentative avec muted:", err);
            this.video.muted = true;
            this.video.play().then(resolve).catch(reject);
          });
      };
      
      this.video.onerror = (e) => {
        cleanup();
        reject(new Error("Erreur de chargement vidéo: " + (e.message || "inconnue")));
      };
      
      // Timeout de sécurité
      setTimeout(() => {
        cleanup();
        reject(new Error("Timeout: la vidéo n'a pas pu démarrer"));
      }, 10000);
    });
  }

  async start() {
    ensureMl5();
    await this.startCamera();

    // ml5.js v1.0+ API
    const options = {
      maxFaces: 1,
      refineLandmarks: true,
      flipped: true,
    };

    this.mesh = await new Promise((resolve) => {
      const model = window.ml5.faceMesh(options, () => {
        resolve(model);
      });
    });

    // Démarrer la boucle de détection
    this._detectLoop();
  }

  _detectLoop() {
    if (!this.mesh || !this.video) return;

    this.mesh.detect(this.video, (predictions) => {
      const first = predictions?.[0];
      const landmarks = this._normalizePrediction(first);
      const results = landmarks 
        ? { multiFaceLandmarks: [landmarks] } 
        : { multiFaceLandmarks: [] };

      this.draw(results);
      this.onResults?.(results);

      // Continuer la boucle
      if (this.mesh) {
        requestAnimationFrame(() => this._detectLoop());
      }
    });
  }

  _normalizePrediction(prediction) {
    if (!prediction?.keypoints) return null;
    
    return prediction.keypoints.map((kp) => ({
      x: kp.x / VIDEO_WIDTH,
      y: kp.y / VIDEO_HEIGHT,
      z: (kp.z || 0) / VIDEO_WIDTH,
    }));
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
    // Arrêter la boucle de détection en mettant mesh à null
    this.mesh = null;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
