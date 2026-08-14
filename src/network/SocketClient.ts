import { io, type Socket } from "socket.io-client";
import { NETWORK } from "../config";

// Envoltorio fino sobre socket.io-client, espejo de
// MOVIL/GeoVS/client/src/network/SocketClient.js. Expone los eventos con-ack
// como Promesas, y deja pasar los eventos de broadcast via on/off normales.
class SocketClient {
  socket: Socket | null = null;
  bootstrapped = false;
  // Listeners registrados ANTES de que exista `socket` (p. ej. componentes
  // montados a nivel de App, como ModerationManager, que escuchan desde el
  // arranque, antes de cualquier login) — sin esto `on()` los perdia en
  // silencio, ya que `this.socket?.on(...)` no hace nada si socket es null,
  // y una vez creado el socket via connect() esos listeners nunca se volvian
  // a registrar.
  private pendingListeners = new Map<string, Set<(...args: any[]) => void>>();

  connect() {
    if (this.socket) return this.socket;
    this.socket = io(NETWORK.SERVER_URL, { transports: ["websocket"] });
    for (const [event, callbacks] of this.pendingListeners) {
      for (const cb of callbacks) this.socket.on(event, cb);
    }
    return this.socket;
  }

  get id() {
    return this.socket?.id;
  }

  get connected() {
    return !!this.socket?.connected;
  }

  onceConnected(): Promise<void> {
    if (this.connected) return Promise.resolve();
    return new Promise((resolve) => this.socket!.once("connect", () => resolve()));
  }

  on(event: string, cb: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, cb);
      return;
    }
    if (!this.pendingListeners.has(event)) this.pendingListeners.set(event, new Set());
    this.pendingListeners.get(event)!.add(cb);
  }

  off(event: string, cb: (...args: any[]) => void) {
    this.socket?.off(event, cb);
    this.pendingListeners.get(event)?.delete(cb);
  }

  emit(event: string, payload: unknown) {
    this.socket?.emit(event, payload);
  }

  emitAck<T = any>(event: string, payload: unknown): Promise<T> {
    return new Promise((resolve) => {
      this.socket?.emit(event, payload, (response: T) => resolve(response));
    });
  }

  identify(name: string, faceState?: string, token?: string | null, avatarImageUrl?: string | null) {
    return this.emitAck<{ ok: boolean; playerId?: string; account?: { id: string; username: string; role: string }; error?: string }>(
      "player:identify",
      { name, faceState, token: token || undefined, avatarImageUrl: avatarImageUrl || undefined }
    );
  }

  // Cambiar de avatar (tienda) sin re-disparar todo lo que hace identify()
  // (registro de conexion, resolucion de pais, etc.) — ver handlers.js.
  updateAvatar(faceState: string, avatarImageUrl: string | null) {
    return this.emitAck<{ ok: boolean }>("player:updateAvatar", { faceState, avatarImageUrl: avatarImageUrl || undefined });
  }

  listLevels() {
    return this.emitAck<{ levels: { id: string; name: string; length: number }[] }>("levels:list", {});
  }

  listRooms() {
    return this.emitAck<{ rooms: import("../types").RoomSummaryDTO[] }>("rooms:list", {});
  }

  createRoom({ levelId, maxPlayers, mode }: { levelId?: string; maxPlayers?: number; mode?: string }) {
    return this.emitAck("room:create", { levelId, maxPlayers, mode });
  }

  joinRoom(roomCode: string) {
    return this.emitAck("room:join", { roomCode });
  }

  rejoinRoom(roomCode: string, token: string) {
    return this.emitAck("room:rejoin", { roomCode, token });
  }

  leaveRoom() {
    return this.emitAck("room:leave", {});
  }

  setReady(ready: boolean) {
    this.emit("room:setReady", { ready });
  }

  setLevel(levelId: string) {
    this.emit("room:setLevel", { levelId });
  }

  setMode(mode: string) {
    this.emit("room:setMode", { mode });
  }

  startGame(force = false) {
    return this.emitAck("room:startGame", { force });
  }

  playAgain() {
    return this.emitAck("room:playAgain", {});
  }

  sendInput(jumpHeld: boolean) {
    this.emit("game:input", { jumpHeld, clientTime: Date.now() });
  }

  sendChat(text: string) {
    this.emit("chat:message", { text });
  }

  // Relay punto a punto de señalización WebRTC (ver VoiceChat.ts) — el
  // servidor solo reenvia `data` al jugador `toPlayerId`, sin interpretarla.
  sendVoiceSignal(toPlayerId: string, data: unknown) {
    this.emit("voice:signal", { toPlayerId, data });
  }
}

export const socketClient = new SocketClient();
