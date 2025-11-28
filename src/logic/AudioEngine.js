const TONE_URL = "https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js";

async function loadTone() {
  const module = await import(TONE_URL);
  return module.default || module;
}

export default class AudioEngine {
  constructor() {
    this.tonePromise = null;
    this.players = [null, null, null];
    this.isReady = false;
  }

  async ensureTone() {
    if (!this.tonePromise) {
      this.tonePromise = loadTone();
    }
    return this.tonePromise;
  }

  async init() {
    const Tone = await this.ensureTone();
    await Tone.start();
    this.isReady = true;
    return Tone;
  }

  async loadSample(slotIndex, file) {
    const Tone = await this.ensureTone();
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
