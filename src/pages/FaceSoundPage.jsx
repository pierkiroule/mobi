import React, { useEffect, useRef, useState } from "react";

const SCRIPTS = [
  "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js",
  "https://unpkg.com/ml5@latest/dist/ml5.min.js",
];

const MUSIC_URL = "https://pierkiroule.github.io/mp3/Mok.mp3";

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", reject);
    document.body.appendChild(script);
  });

export default function FaceSoundPage() {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("Chargement des librairies visage...");

  useEffect(() => {
    let isCancelled = false;
    let p5Instance = null;
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.15;

    const run = async () => {
      try {
        for (const src of SCRIPTS) {
          await loadScript(src);
        }
        if (isCancelled) return;
        setStatus("Active ta webcam puis ouvre la bouche pour contrôler le son.");
        p5Instance = createSketch(containerRef.current, audio, () =>
          setStatus("Mets-toi face caméra : bouche grande ouverte = volume max.")
        );
      } catch (err) {
        console.error(err);
        if (!isCancelled) {
          setStatus("Impossible de charger p5 / ml5 : vérifie ta connexion.");
        }
      }
    };

    run();

    return () => {
      isCancelled = true;
      p5Instance?.remove();
      audio.pause();
    };
  }, []);

  return (
    <div className="face-page">
      <div className="face-overlay">
        <h1>Matrix, Œil Unique & Particules Cash</h1>
        <p>{status}</p>
        <ul>
          <li>Autorise la webcam puis place ton visage au centre.</li>
          <li>Ouvre grand la bouche pour booster la musique et l'effet Matrix.</li>
          <li>Aucune détection des mains : uniquement le visage pilote l'audio.</li>
        </ul>
      </div>
      <div ref={containerRef} className="canvas-holder" aria-hidden />
    </div>
  );
}

function createSketch(container, audio, onReady) {
  const sketch = (p) => {
    let faceMesh;
    let video;
    let faces = [];
    let isYawning = false;
    let isMusicPlaying = false;
    let targetVolume = audio.volume;
    let eyeAlpha = 200;
    let eyeX = 0;
    let eyeY = 0;
    const particles = [];
    const matrixRain = [];
    const options = { maxFaces: 1, refineLandmarks: false, flipHorizontal: false };

    const adjustVolume = () => {
      // Smoothly blend toward the desired level
      audio.volume = p.lerp(audio.volume, targetVolume, 0.1);
    };

    p.preload = () => {
      // ml5 attaches itself to window
      // eslint-disable-next-line no-undef
      faceMesh = ml5.faceMesh(options);
    };

    p.setup = () => {
      const width = container?.clientWidth || window.innerWidth;
      const height = window.innerHeight;
      const canvas = p.createCanvas(width, height);
      if (container) {
        canvas.parent(container);
      }

      video = p.createCapture(p.VIDEO);
      video.size(640, 480);
      video.hide();
      faceMesh.detectStart(video.elt, (results) => {
        faces = results || [];
        if (results && results.length && typeof onReady === "function") {
          onReady();
        }
      });

      setupMatrixRain();
    };

    p.windowResized = () => {
      const width = container?.clientWidth || window.innerWidth;
      const height = window.innerHeight;
      p.resizeCanvas(width, height);
      matrixRain.length = 0;
      setupMatrixRain();
    };

    p.draw = () => {
      p.background(0);

      if (isYawning) {
        drawMatrixEffect();
      }

      p.push();
      p.image(video, 0, 0, p.width, p.height);
      if (isYawning) {
        p.filter(p.INVERT);
      }
      p.pop();

      drawMatrixRain();

      if (faces.length > 0) {
        const face = faces[0];
        detectYawning(face);
        drawForeheadEye(face);
        generateCashParticles(face);
      } else {
        targetVolume = 0.15;
      }

      updateAndDisplayParticles();
      drawTexts();
      adjustVolume();
    };

    const detectYawning = (face) => {
      const mouthHeight = face.keypoints[14].y - face.keypoints[13].y;
      const openness = p.constrain((mouthHeight - 10) / 25, 0, 1);
      isYawning = openness > 0.3;

      if (isYawning) {
        if (!isMusicPlaying) {
          audio
            .play()
            .then(() => {
              isMusicPlaying = true;
            })
            .catch((err) => console.warn("Lecture bloquée :", err));
        }
        targetVolume = p.map(openness, 0.3, 1, 0.35, 1, true);
      } else if (isMusicPlaying) {
        targetVolume = 0.2;
      }
    };

    const drawForeheadEye = (face) => {
      const foreheadX = (face.keypoints[10].x + face.keypoints[152].x) / 2;
      const foreheadY = (face.keypoints[10].y + face.keypoints[152].y) / 2;

      eyeX = p.map(foreheadX, 0, video.width, 0, p.width);
      eyeY = p.map(foreheadY, 0, video.height, 0, p.height) - 60;
      eyeAlpha = isYawning ? 169 : 50;

      const haloOpacity = isYawning ? 60 : 8;
      const haloSize = isYawning ? 20 : 50;
      p.noStroke();
      for (let i = 0; i < 5; i++) {
        const alpha = p.map(i, 0, 4, haloOpacity, 5);
        p.fill(255, 255, 255, alpha);
        p.ellipse(eyeX, eyeY, haloSize + i * 5);
      }

      p.fill(0, 0, 0, eyeAlpha);
      p.textSize(25);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("X", eyeX, eyeY);
    };

    const generateCashParticles = (face) => {
      if (!isYawning) return;
      const mouthX = p.map(face.keypoints[13].x, 0, video.width, 0, p.width);
      const mouthY = p.map(face.keypoints[13].y, 0, video.height, 0, p.height);
      if (p.frameCount % 5 === 0) {
        particles.push(new CashParticle(mouthX, mouthY));
      }
    };

    class CashParticle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = p.random(-2, 2);
        this.vy = p.random(-2, -5);
        this.scale = p.random(0.3, 0.9);
        this.growth = p.random(0.02, 0.05);
        this.alpha = 255;
      }

      update() {
        this.x += this.vx + p.random(-1, 1);
        this.y += this.vy + p.random(-1, 1);
        this.scale += this.growth;
        this.alpha -= 15;
      }

      display() {
        p.noStroke();
        p.fill(0, 255, 0, this.alpha);
        p.textSize(35 * this.scale);
        p.text(randomCash(), this.x, this.y);
      }

      isDead() {
        return this.alpha <= 0;
      }
    }

    const randomCash = () => {
      const symbols = ["💲", "Musk", "🤑"];
      return symbols[Math.floor(p.random(symbols.length))];
    };

    const updateAndDisplayParticles = () => {
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        particles[i].update();
        particles[i].display();
        if (particles[i].isDead()) particles.splice(i, 1);
      }
    };

    const setupMatrixRain = () => {
      const spacing = 20;
      for (let x = 0; x < p.width; x += spacing) {
        matrixRain.push(new MatrixDrop(x));
      }
    };

    const drawMatrixRain = () => {
      p.push();
      p.blendMode(p.SCREEN);
      for (const drop of matrixRain) {
        drop.update();
        drop.display();
      }
      p.pop();
    };

    class MatrixDrop {
      constructor(x) {
        this.x = x;
        this.y = p.random(-100, p.height);
        this.speed = p.random(5, 15);
        this.textSize = 16;
        this.alpha = 100;
      }

      update() {
        this.y = (this.y + this.speed) % p.height;
      }

      display() {
        p.fill(0, 255, 0, this.alpha);
        p.textSize(this.textSize);
        p.text(randomBinary(), this.x, this.y);
      }
    }

    const randomBinary = () => (p.random() > 0.5 ? "0" : "1");

    const drawMatrixEffect = () => {
      p.push();
      p.fill(0, 50);
      p.rect(0, 0, p.width, p.height);
      p.pop();
    };

    const drawTexts = () => {
      p.fill(255);
      p.textSize(16);
      p.textAlign(p.CENTER, p.TOP);
      p.text("⚠️ Reste réveillé : la musique suit tes bâillements", p.width / 2, 20);
      p.text("Détection visage uniquement — aucun geste des mains.", p.width / 2, 44);
    };
  };

  // eslint-disable-next-line no-undef
  return new p5(sketch, container || undefined);
}
