const TONE_URL = "https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js";

function loadToneScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Tone.js doit être chargé dans le navigateur"));
  }

  if (window.Tone) return Promise.resolve(window.Tone);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TONE_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Tone));
      existing.addEventListener("error", () => reject(new Error("Tone.js introuvable")));
      if (existing.dataset.loaded === "true") resolve(window.Tone);
      return;
    }

    const script = document.createElement("script");
    script.src = TONE_URL;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve(window.Tone);
    };
    script.onerror = () => reject(new Error("Tone.js introuvable"));
    document.head.appendChild(script);
  });
}

export default class AudioEngine {
  constructor() {
    this.tonePromise = null;
    this.players = [null, null, null];
    this.isReady = false;
  }

  async ensureTone() {
    if (!this.tonePromise) {
      this.tonePromise = loadToneScript();
    }
    return this.tonePromise;
  }

  async init() {
    const Tone = await this.ensureTone();
    if (!Tone?.start) {
      throw new Error("Impossible de démarrer l'audio (Tone.js)");
    }
    await Tone.start();
    this.isReady = true;
    return Tone;
  }

  async loadSample(slotIndex, file) {
    const Tone = await this.ensureTone();
    if (!Tone?.Player) {
      throw new Error("Le lecteur audio Tone.js est indisponible");
    }
    const url = URL.createObjectURL(file);
    const player = new Tone.Player({ url, loop: true, autostart: false }).toDestination();
    this.players[slotIndex] = player;
    return player;
  }

  async startSlot(slotIndex) {
    const player = this.players[slotIndex];
    if (!player || !this.isReady) return;
    if (player.state !== "started") {
      player.start();
    }
  }

  stopSlot(slotIndex) {
    const player = this.players[slotIndex];
    if (!player) return;
    if (player.state === "started") {
      player.stop();
    }
  }

  dispose() {
    this.players.forEach((p) => p?.dispose?.());
    this.players = [null, null, null];
  }
}
