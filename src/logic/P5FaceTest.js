const P5_URL = "https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js";
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

export default class P5FaceTest {
  constructor(statusCallback) {
    this.statusCallback = statusCallback;
    this.p5Instance = null;
    this.video = null;
    this.faceMesh = null;
    this.camera = null;
  }

  async ensureLibs() {
    if (!window.p5) await loadScript(P5_URL);
    if (!window.Camera) await loadScript(CAMERA_URL);
    if (!window.FaceMesh) await loadScript(FACE_MESH_URL);
    if (!window.p5 || !window.Camera || !window.FaceMesh) {
      throw new Error("p5 ou FaceMesh introuvable");
    }
  }

  stop() {
    this.camera?.stop?.();
    this.faceMesh?.close?.();
    const tracks = this.video?.elt?.srcObject?.getTracks?.();
    tracks?.forEach((t) => t.stop());
    this.video?.remove?.();
    this.p5Instance?.remove?.();
    this.camera = null;
    this.faceMesh = null;
    this.video = null;
    this.p5Instance = null;
    this.statusCallback?.("Flux arrêté");
  }

  async start(container) {
    if (!container) throw new Error("Container manquant");
    await this.ensureLibs();

    return new Promise((resolve, reject) => {
      const self = this;
      const sketch = (p) => {
        let landmarks = null;

        const onFace = (results) => {
          const firstFace = results?.multiFaceLandmarks?.[0];
          landmarks = firstFace || null;
          self.statusCallback?.(firstFace ? "Landmarks OK" : "Détection en cours...");
        };

        p.setup = () => {
          const canvas = p.createCanvas(640, 480);
          canvas.parent(container);

          self.video = p.createCapture({
            video: { facingMode: "user", width: 640, height: 480 },
            audio: false,
          });
          self.video.size(640, 480);
          self.video.hide();

          self.faceMesh = new window.FaceMesh({
            locateFile: (file) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
          });
          self.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          self.faceMesh.onResults(onFace);

          self.camera = new window.Camera(self.video.elt, {
            onFrame: async () => {
              await self.faceMesh.send({ image: self.video.elt });
            },
            width: 640,
            height: 480,
            facingMode: "user",
          });

          self.camera
            .start()
            .then(() => {
              self.statusCallback?.("Flux caméra actif + FaceMesh");
              resolve();
            })
            .catch((error) => {
              self.statusCallback?.(error.message);
              reject(error);
            });
        };

        p.draw = () => {
          p.background(0);
          if (self.video) {
            p.image(self.video, 0, 0, p.width, p.height);
          }
          if (landmarks) {
            p.noStroke();
            p.fill(0, 255, 0);
            landmarks.forEach((pt) => {
              const x = pt.x * p.width;
              const y = pt.y * p.height;
              p.circle(x, y, 3);
            });
          }
        };
      };

      try {
        self.p5Instance = new window.p5(sketch);
      } catch (error) {
        reject(error);
      }
    });
  }
}
