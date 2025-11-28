const P5_URL = "https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js";

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

export default class P5Sketch {
  constructor(videoRef, getLandmarks) {
    this.videoRef = videoRef;
    this.getLandmarks = getLandmarks;
    this.instance = null;
  }

  async start(container) {
    if (!container) return;
    if (!window.p5) {
      await loadScript(P5_URL);
    }

    if (this.instance) return;

    this.instance = new window.p5((p) => {
      const width = 640;
      const height = 480;

      p.setup = () => {
        const canvas = p.createCanvas(width, height);
        canvas.parent(container);
      };

      p.draw = () => {
        p.background(0);
        const video = this.videoRef.current;
        if (video) {
          p.image(video, 0, 0, width, height);
        }

        const landmarks = this.getLandmarks?.();
        if (landmarks?.length) {
          p.noStroke();
          p.fill(0, 255, 0);
          landmarks.forEach((pt) => {
            const x = pt.x * width;
            const y = pt.y * height;
            p.circle(x, y, 4);
          });
        }
      };
    });
  }

  stop() {
    this.instance?.remove?.();
    this.instance = null;
  }
}
