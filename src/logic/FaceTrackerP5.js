/**
 * FaceTrackerP5 - Face tracking avec ml5.js et visualisation p5.js
 * Utilise ml5.faceMesh pour détecter les landmarks du visage
 * et p5.js pour le rendu visuel en temps réel.
 */

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

// Connexions pour dessiner le mesh du visage (tessellation simplifiée)
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33];
const RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362];
const LEFT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const RIGHT_EYEBROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61];
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78];
const NOSE = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2];

export default class FaceTrackerP5 {
  constructor(p5Instance, onResults) {
    this.p = p5Instance;
    this.onResults = onResults;
    this.video = null;
    this.faceMesh = null;
    this.predictions = [];
    this.isRunning = false;
    this.colorScheme = {
      primary: null,
      secondary: null,
      accent: null,
      glow: null
    };
  }

  /**
   * Initialise les couleurs du scheme basé sur p5
   */
  initColors() {
    const p = this.p;
    this.colorScheme = {
      primary: p.color(0, 255, 180, 200),
      secondary: p.color(100, 200, 255, 180),
      accent: p.color(255, 100, 150, 220),
      glow: p.color(0, 255, 180, 60),
      eyeColor: p.color(80, 220, 255, 255),
      lipColor: p.color(255, 120, 150, 200),
      meshColor: p.color(0, 255, 180, 40)
    };
  }

  /**
   * Démarre la capture vidéo et le tracking
   */
  async start() {
    const p = this.p;
    
    if (!window.ml5) {
      throw new Error("ml5.js n'est pas chargé");
    }

    this.initColors();

    // Créer la capture vidéo avec p5
    this.video = p.createCapture(p.VIDEO, { flipped: true });
    this.video.size(VIDEO_WIDTH, VIDEO_HEIGHT);
    this.video.hide(); // Cacher l'élément vidéo HTML

    // Attendre que la vidéo soit prête
    await new Promise((resolve) => {
      this.video.elt.onloadeddata = resolve;
    });

    // Initialiser ml5 faceMesh
    const options = {
      maxFaces: 1,
      refineLandmarks: true,
      flipped: true
    };

    this.faceMesh = window.ml5.faceMesh(options, () => {
      console.log("ml5 faceMesh prêt");
      this.isRunning = true;
      this.detectLoop();
    });
  }

  /**
   * Boucle de détection continue
   */
  detectLoop() {
    if (!this.isRunning || !this.faceMesh || !this.video) return;

    this.faceMesh.detect(this.video, (results) => {
      this.predictions = results || [];
      
      // Normaliser et envoyer les résultats
      if (this.onResults) {
        const normalized = this.normalizePredictions(results);
        this.onResults(normalized);
      }

      // Continuer la boucle
      if (this.isRunning) {
        requestAnimationFrame(() => this.detectLoop());
      }
    });
  }

  /**
   * Normalise les prédictions pour compatibilité avec l'ancien format
   */
  normalizePredictions(predictions) {
    if (!predictions || predictions.length === 0) {
      return { multiFaceLandmarks: [] };
    }

    const landmarks = predictions[0].keypoints.map((kp) => ({
      x: kp.x / VIDEO_WIDTH,
      y: kp.y / VIDEO_HEIGHT,
      z: (kp.z || 0) / VIDEO_WIDTH
    }));

    return { multiFaceLandmarks: [landmarks] };
  }

  /**
   * Dessine la visualisation du face mesh
   */
  draw() {
    const p = this.p;
    
    // Dessiner la vidéo en fond (miroir)
    if (this.video) {
      p.push();
      p.translate(p.width, 0);
      p.scale(-1, 1);
      p.image(this.video, 0, 0, p.width, p.height);
      p.pop();
    }

    // Dessiner le mesh si des prédictions existent
    if (this.predictions.length > 0) {
      const face = this.predictions[0];
      const keypoints = face.keypoints;

      // Facteur d'échelle pour adapter à la taille du canvas
      const scaleX = p.width / VIDEO_WIDTH;
      const scaleY = p.height / VIDEO_HEIGHT;

      // Dessiner le mesh de fond avec effet glow
      this.drawMeshGlow(keypoints, scaleX, scaleY);
      
      // Dessiner les contours du visage
      this.drawFaceContours(keypoints, scaleX, scaleY);
      
      // Dessiner les points clés avec animation
      this.drawKeypoints(keypoints, scaleX, scaleY);
      
      // Dessiner les yeux avec effet spécial
      this.drawEyes(keypoints, scaleX, scaleY);
      
      // Dessiner les lèvres
      this.drawLips(keypoints, scaleX, scaleY);
    }
  }

  /**
   * Dessine l'effet de glow du mesh
   */
  drawMeshGlow(keypoints, scaleX, scaleY) {
    const p = this.p;
    
    p.push();
    p.noFill();
    p.stroke(this.colorScheme.glow);
    p.strokeWeight(8);
    
    // Dessiner quelques triangles du mesh pour l'effet
    for (let i = 0; i < keypoints.length - 2; i += 3) {
      const k1 = keypoints[i];
      const k2 = keypoints[i + 1];
      const k3 = keypoints[i + 2];
      
      if (k1 && k2 && k3) {
        p.beginShape();
        p.vertex(k1.x * scaleX, k1.y * scaleY);
        p.vertex(k2.x * scaleX, k2.y * scaleY);
        p.vertex(k3.x * scaleX, k3.y * scaleY);
        p.endShape(p.CLOSE);
      }
    }
    p.pop();
  }

  /**
   * Dessine les contours du visage
   */
  drawFaceContours(keypoints, scaleX, scaleY) {
    const p = this.p;
    
    // Ovale du visage
    this.drawContour(keypoints, FACE_OVAL, this.colorScheme.primary, 2, scaleX, scaleY);
    
    // Sourcils
    this.drawContour(keypoints, LEFT_EYEBROW, this.colorScheme.secondary, 1.5, scaleX, scaleY, false);
    this.drawContour(keypoints, RIGHT_EYEBROW, this.colorScheme.secondary, 1.5, scaleX, scaleY, false);
    
    // Nez
    this.drawContour(keypoints, NOSE, this.colorScheme.secondary, 1, scaleX, scaleY, false);
  }

  /**
   * Dessine un contour à partir d'indices de keypoints
   */
  drawContour(keypoints, indices, color, weight, scaleX, scaleY, closed = true) {
    const p = this.p;
    
    p.push();
    p.noFill();
    p.stroke(color);
    p.strokeWeight(weight);
    
    p.beginShape();
    for (const idx of indices) {
      const kp = keypoints[idx];
      if (kp) {
        p.vertex(kp.x * scaleX, kp.y * scaleY);
      }
    }
    if (closed) {
      p.endShape(p.CLOSE);
    } else {
      p.endShape();
    }
    p.pop();
  }

  /**
   * Dessine les points clés avec animation
   */
  drawKeypoints(keypoints, scaleX, scaleY) {
    const p = this.p;
    const time = p.millis() * 0.001;
    
    p.push();
    p.noStroke();
    
    // Points principaux avec pulsation
    const mainPoints = [1, 33, 263, 61, 291, 199]; // Nez, yeux, bouche
    
    for (const idx of mainPoints) {
      const kp = keypoints[idx];
      if (!kp) continue;
      
      const x = kp.x * scaleX;
      const y = kp.y * scaleY;
      const pulse = p.sin(time * 3 + idx) * 0.3 + 1;
      
      // Glow
      p.fill(this.colorScheme.glow);
      p.ellipse(x, y, 12 * pulse, 12 * pulse);
      
      // Point central
      p.fill(this.colorScheme.primary);
      p.ellipse(x, y, 4, 4);
    }
    p.pop();
  }

  /**
   * Dessine les yeux avec effet spécial
   */
  drawEyes(keypoints, scaleX, scaleY) {
    const p = this.p;
    
    // Contours des yeux
    this.drawContour(keypoints, LEFT_EYE, this.colorScheme.eyeColor, 1.5, scaleX, scaleY);
    this.drawContour(keypoints, RIGHT_EYE, this.colorScheme.eyeColor, 1.5, scaleX, scaleY);
    
    // Iris (approximation avec les centres des yeux)
    const leftIris = keypoints[468]; // Centre iris gauche (si refineLandmarks)
    const rightIris = keypoints[473]; // Centre iris droit
    
    if (leftIris && rightIris) {
      p.push();
      p.noStroke();
      
      // Glow iris
      p.fill(this.colorScheme.eyeColor);
      p.ellipse(leftIris.x * scaleX, leftIris.y * scaleY, 8, 8);
      p.ellipse(rightIris.x * scaleX, rightIris.y * scaleY, 8, 8);
      
      // Centre pupille
      p.fill(255);
      p.ellipse(leftIris.x * scaleX, leftIris.y * scaleY, 3, 3);
      p.ellipse(rightIris.x * scaleX, rightIris.y * scaleY, 3, 3);
      p.pop();
    }
  }

  /**
   * Dessine les lèvres
   */
  drawLips(keypoints, scaleX, scaleY) {
    const p = this.p;
    
    // Lèvres externes avec remplissage léger
    p.push();
    p.fill(this.colorScheme.lipColor);
    p.stroke(this.colorScheme.accent);
    p.strokeWeight(1.5);
    
    p.beginShape();
    for (const idx of LIPS_OUTER) {
      const kp = keypoints[idx];
      if (kp) {
        p.vertex(kp.x * scaleX, kp.y * scaleY);
      }
    }
    p.endShape(p.CLOSE);
    
    // Lèvres internes
    p.noFill();
    p.stroke(this.colorScheme.accent);
    p.strokeWeight(1);
    
    p.beginShape();
    for (const idx of LIPS_INNER) {
      const kp = keypoints[idx];
      if (kp) {
        p.vertex(kp.x * scaleX, kp.y * scaleY);
      }
    }
    p.endShape(p.CLOSE);
    p.pop();
  }

  /**
   * Arrête le tracking et libère les ressources
   */
  stop() {
    this.isRunning = false;
    
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
    
    this.faceMesh = null;
    this.predictions = [];
  }
}
