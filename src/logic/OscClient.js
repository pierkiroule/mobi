import { OSC } from "osc-js";

const osc = new OSC({ plugin: new OSC.DatagramPlugin() });
osc.open({ host: "192.168.43.1", port: 8000 });

export function sendOsc(addr, value) {
  osc.send(new OSC.Message(addr, value));
}
