const defaultIce = [{ urls: "stun:stun.l.google.com:19302" }];

export default class WebRTCConnection {
  constructor({ mode = "host", onMessage } = {}) {
    this.mode = mode;
    this.onMessage = onMessage;
    this.peer = null;
    this.channel = null;
  }

  host() {
    this.peer = new RTCPeerConnection({ iceServers: defaultIce });
    this.channel = this.peer.createDataChannel("hypno-channel");
    this.attachChannel();
    this.peer.createOffer().then((offer) => this.peer.setLocalDescription(offer));
    console.info("[WebRTC] Host ready — share SDP with clients", this.peer.localDescription);
  }

  join() {
    this.peer = new RTCPeerConnection({ iceServers: defaultIce });
    this.peer.ondatachannel = (event) => {
      this.channel = event.channel;
      this.attachChannel();
    };
    console.info("[WebRTC] Client awaiting host SDP to join room");
  }

  attachChannel() {
    if (!this.channel) return;
    this.channel.onopen = () => console.info("[WebRTC] DataChannel open (hypno-channel)");
    this.channel.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.onMessage?.(payload);
      } catch (error) {
        console.warn("[WebRTC] Message parse error", error);
      }
    };
  }

  send(payload) {
    if (!this.channel || this.channel.readyState !== "open") return;
    this.channel.send(JSON.stringify(payload));
  }

  close() {
    this.channel?.close();
    this.peer?.close();
  }
}
