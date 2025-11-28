const ML5_URL = "https://cdn.jsdelivr.net/npm/ml5@latest/dist/ml5.min.js";

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

export default class Ml5Tracker {
  constructor(videoElement, overlayCanvas, onResults) {
    this.video = videoElement;
    this.overlay = overlayCanvas;
    this.onResults = onResults;
    this.stream = null;
    this.model = null;
    this.handlePredict = this.handlePredict.bind(this);
  }

  async ensureLib() {
    if (!window.ml5) {
      await loadScript(ML5_URL);
    }
    if (!window.ml5?.facemesh) {
      throw new Error("Impossible de charger ml5.js facemesh");
    }
    return window.ml5;
  }

  resizeOverlay() {
    if (!this.overlay || !this.video) return;
    const width = this.video.videoWidth || 480;
    const height = this.video.videoHeight || 360;
    this.overlay.width = width;
    this.overlay.height = height;
  }

  async start() {
    const ml5 = await this.ensureLib();
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    this.resizeOverlay();

    this.model = await new Promise((resolve, reject) => {
      const instance = ml5.facemesh(this.video, () => resolve(instance));
      if (!instance) {
        reject(new Error("Initialisation facemesh échouée"));
      }
    });

    this.model.on("predict", this.handlePredict);
  }

  handlePredict(results) {
    if (!Array.isArray(results) || results.length === 0) {
      this.draw(null);
      this.onResults?.({ multiFaceLandmarks: [] });
      return;
    }

    const first = results[0];
    const scaledMesh = first.scaledMesh || [];
    const landmarks = scaledMesh.map(([x, y, z]) => ({ x, y, z }));
    const payload = { multiFaceLandmarks: [landmarks] };
    this.draw(payload);
    this.onResults?.(payload);
  }

  draw(results) {
    if (!this.overlay) return;
    const ctx = this.overlay.getContext("2d");
    const width = this.overlay.width;
    const height = this.overlay.height;
    ctx.clearRect(0, 0, width, height);

    const points = results?.multiFaceLandmarks?.[0];
    if (!points) return;

    ctx.strokeStyle = "rgba(255, 200, 120, 0.8)";
    ctx.lineWidth = 1.2;

    points.forEach((point) => {
      const px = point.x > 1 ? point.x : point.x * width;
      const py = point.y > 1 ? point.y : point.y * height;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 200, 120, 0.8)";
      ctx.fill();
    });
  }

  stop() {
    if (this.model?.off) {
      this.model.off("predict", this.handlePredict);
    }
    this.model = null;
    this.stream?.getTracks?.().forEach((t) => t.stop());
    this.stream = null;
  }
}
