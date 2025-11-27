let oscClientPromise = null;
let oscModulePromise = null;
let oscModule = null;

function loadOscModule() {
  if (typeof window === "undefined") return null;
  if (!oscModulePromise) {
    const url =
      import.meta.env.VITE_OSC_JS_URL ||
      "https://cdn.jsdelivr.net/npm/osc-js@2.5.2/dist/osc.min.js";

    oscModulePromise = new Promise((resolve, reject) => {
      if (window.OSC) {
        resolve(window.OSC);
        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = () => (window.OSC ? resolve(window.OSC) : reject(new Error("OSC global missing")));
      script.onerror = () => reject(new Error(`Failed to load osc-js from ${url}`));
      document.head.appendChild(script);
    }).catch((error) => {
      console.error("[OSC] script load failed", error);
      return null;
    });
  }
  return oscModulePromise;
}

function resolveHost() {
  if (typeof window === "undefined") return null;
  return import.meta.env.VITE_OSC_HOST || window.location.hostname || "localhost";
}

function resolvePort() {
  const raw = import.meta.env.VITE_OSC_PORT;
  if (raw) return Number(raw);
  return 8000;
}

function ensureOsc() {
  if (typeof window === "undefined") return null;
  if (!oscClientPromise) {
    oscClientPromise = loadOscModule()
      .then((mod) => {
        oscModule = mod;
        if (!oscModule) {
          throw new Error("osc-js module missing OSC export");
        }
        const plugin = new oscModule.WebsocketClientPlugin();
        const osc = new oscModule({ plugin });
        osc.open({ host: resolveHost(), port: resolvePort() });
        return osc;
      })
      .catch((error) => {
        console.error("[OSC] init failed", error);
        return null;
      });
  }
  return oscClientPromise;
}

export function sendOsc(addr, value) {
  if (typeof window === "undefined") return;
  const maybePromise = ensureOsc();
  if (!maybePromise) return;
  maybePromise.then((osc) => {
    if (!osc || !oscModule) return;
    osc.send(new oscModule.Message(addr, value));
  });
}
