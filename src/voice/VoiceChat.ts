import { socketClient } from "../network/SocketClient";

// Voz de la sala: malla WebRTC completa (cada jugador se conecta directo con
// cada otro), usando el socket de la sala solo como "cable" para pasar la
// señalización (voice:signal, ver handlers.js del servidor) — el audio en si
// nunca pasa por el servidor. Solo STUN publico y gratuito: para la gran
// mayoria de redes alcanza, pero sin un TURN de pago algunas conexiones
// detras de NAT muy restrictivo simplemente no lograran conectarse (esa
// pareja puntual se queda sin audio entre ellos, el resto de la sala sigue
// funcionando normal).
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

type SignalData =
  | { type: "description"; description: RTCSessionDescriptionInit }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

interface PeerEntry {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
}

// Patron "perfect negotiation" (recomendado por MDN) para evitar choques de
// ofertas cruzadas cuando ambos lados de una pareja intentan renegociar al
// mismo tiempo (p. ej. los dos activan el microfono casi a la vez): el lado
// "cortes" (polite) cede su propia oferta si choca con una entrante, el
// otro lado la ignora. Se decide de forma determinista comparando los ids
// de jugador, asi ambos lados llegan a la MISMA conclusion sin coordinarse.
function isPolite(myId: string, peerId: string): boolean {
  return myId < peerId;
}

class VoiceChat {
  private myId: string | null = null;
  private peers = new Map<string, PeerEntry>();
  private localStream: MediaStream | null = null;
  private micEnabled = false;
  private listenerAttached = false;
  private retryAutoplayAttached = false;

  private onSignal = ({ fromPlayerId, data }: { fromPlayerId: string; data: SignalData }) => {
    const entry = this.peers.get(fromPlayerId) || this.createPeer(fromPlayerId);
    this.handleSignal(entry, fromPlayerId, data).catch((err) => console.error("voz: error de señalización", err));
  };

  init(myPlayerId: string) {
    if (this.myId === myPlayerId) return;
    this.myId = myPlayerId;
    if (!this.listenerAttached) {
      socketClient.on("voice:signal", this.onSignal);
      this.listenerAttached = true;
    }
  }

  // Ajusta las conexiones activas para que coincidan EXACTAMENTE con el
  // roster actual de la sala (se llama cada vez que cambia la lista de
  // jugadores): crea peers nuevos, cierra los que ya no estan.
  syncPeers(otherPlayerIds: string[]) {
    if (!this.myId) return;
    const wanted = new Set(otherPlayerIds.filter((id) => id !== this.myId));
    for (const id of wanted) {
      if (!this.peers.has(id)) this.createPeer(id);
    }
    for (const id of [...this.peers.keys()]) {
      if (!wanted.has(id)) this.removePeer(id);
    }
  }

  isMicEnabled() {
    return this.micEnabled;
  }

  async setMicEnabled(enabled: boolean): Promise<boolean> {
    if (enabled === this.micEnabled) return this.micEnabled;

    if (enabled) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error("voz: no se pudo acceder al microfono", err);
        return false;
      }
      for (const entry of this.peers.values()) {
        for (const track of this.localStream.getTracks()) {
          entry.pc.addTrack(track, this.localStream!);
        }
      }
      this.micEnabled = true;
      return true;
    }

    for (const entry of this.peers.values()) {
      for (const sender of entry.pc.getSenders()) {
        if (sender.track) entry.pc.removeTrack(sender);
      }
    }
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.micEnabled = false;
    return true;
  }

  // Se llama al salir de la sala del todo (no solo al pasar de pantalla —
  // la voz vive mientras se esta en la sala, sea en la espera, jugando, o en
  // resultados).
  destroy() {
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.micEnabled = false;
    if (this.listenerAttached) {
      socketClient.off("voice:signal", this.onSignal);
      this.listenerAttached = false;
    }
    this.myId = null;
  }

  private createPeer(peerId: string): PeerEntry {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.style.display = "none";
    document.body.appendChild(audioEl);

    const entry: PeerEntry = { pc, audioEl, polite: isPolite(this.myId!, peerId), makingOffer: false, ignoreOffer: false };
    this.peers.set(peerId, entry);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketClient.sendVoiceSignal(peerId, { type: "candidate", candidate: candidate.toJSON() });
    };

    pc.ontrack = (e) => {
      audioEl.srcObject = e.streams[0];
      audioEl.play().catch(() => this.armAutoplayRetry());
    };

    // Se dispara solo cuando se agregan/quitan pistas (p. ej. al activar el
    // microfono) — mientras nadie active el mic, la conexion queda creada
    // pero inerte, sin gastar señalizacion de mas.
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        socketClient.sendVoiceSignal(peerId, { type: "description", description: pc.localDescription! });
      } catch (err) {
        console.error("voz: error negociando con", peerId, err);
      } finally {
        entry.makingOffer = false;
      }
    };

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) pc.addTrack(track, this.localStream);
    }

    return entry;
  }

  private removePeer(peerId: string) {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    entry.pc.close();
    entry.audioEl.srcObject = null;
    entry.audioEl.remove();
    this.peers.delete(peerId);
  }

  private async handleSignal(entry: PeerEntry, peerId: string, data: SignalData) {
    const { pc } = entry;
    if (data.type === "description") {
      const isOffer = data.description.type === "offer";
      const collision = isOffer && (entry.makingOffer || pc.signalingState !== "stable");
      entry.ignoreOffer = !entry.polite && collision;
      if (entry.ignoreOffer) return;

      await pc.setRemoteDescription(data.description);
      if (isOffer) {
        await pc.setLocalDescription();
        socketClient.sendVoiceSignal(peerId, { type: "description", description: pc.localDescription! });
      }
    } else if (data.type === "candidate") {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (err) {
        if (!entry.ignoreOffer) console.error("voz: error agregando candidato ICE", err);
      }
    }
  }

  // Las politicas de autoplay del navegador pueden bloquear el audio remoto
  // si esta pestaña todavia no tuvo NINGUNA interaccion del usuario (p. ej.
  // alguien que se une a una sala donde ya se estaba hablando, sin haber
  // tocado nada). Un solo click/tecla en cualquier lugar reintenta.
  private armAutoplayRetry() {
    if (this.retryAutoplayAttached) return;
    this.retryAutoplayAttached = true;
    const retry = () => {
      for (const entry of this.peers.values()) entry.audioEl.play().catch(() => {});
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      this.retryAutoplayAttached = false;
    };
    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("keydown", retry, { once: true });
  }
}

export const voiceChat = new VoiceChat();
