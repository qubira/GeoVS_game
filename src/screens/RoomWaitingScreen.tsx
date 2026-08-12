import { useEffect, useRef, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { clearSession } from "../network/session";
import { useAppState } from "../state/AppStateContext";
import Avatar from "../components/Avatar";
import type { PlayerLobbyDTO } from "../types";

const MODE_LABELS: Record<string, string> = { race: "Carrera", elimination: "Eliminación" };

const START_ERROR_MESSAGES: Record<string, string> = {
  NOT_ALL_READY: "No todos los jugadores están listos.",
  NOT_ENOUGH_PLAYERS: "Se necesitan al menos 2 jugadores conectados.",
};

interface ChatEntry {
  playerId: string;
  name: string;
  text: string;
  ts: number;
}

export default function RoomWaitingScreen() {
  const { room, setRoom, myPlayerId, levels, navigate } = useAppState();
  const [ready, setReady] = useState(false);
  const [forceStart, setForceStart] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [hostError, setHostError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isHost = room?.hostId === myPlayerId;

  useEffect(() => {
    const onPlayerJoined = ({ player }: { player: PlayerLobbyDTO }) => {
      setRoom((r) => (r ? { ...r, players: [...r.players, player] } : r));
    };
    const onPlayerLeft = ({ playerId }: { playerId: string }) => {
      setRoom((r) => (r ? { ...r, players: r.players.filter((p) => p.id !== playerId) } : r));
    };
    const onPlayerUpdated = ({ playerId, patch }: { playerId: string; patch: Partial<PlayerLobbyDTO> }) => {
      setRoom((r) => (r ? { ...r, players: r.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)) } : r));
    };
    const onRoomUpdated = ({ room: updated }: { room: any }) => setRoom(updated);
    const onHostChanged = ({ newHostId }: { newHostId: string }) =>
      setRoom((r) => (r ? { ...r, hostId: newHostId } : r));
    const onCountdown = ({ secondsLeft }: { secondsLeft: number }) => setCountdown(secondsLeft > 0 ? secondsLeft : null);
    const onGameStart = (payload: any) => navigate("game", payload);
    const onChat = (msg: ChatEntry) => setChatMessages((list) => [...list, msg]);

    socketClient.on("room:playerJoined", onPlayerJoined);
    socketClient.on("room:playerLeft", onPlayerLeft);
    socketClient.on("room:playerUpdated", onPlayerUpdated);
    socketClient.on("room:updated", onRoomUpdated);
    socketClient.on("room:hostChanged", onHostChanged);
    socketClient.on("room:countdown", onCountdown);
    socketClient.on("game:start", onGameStart);
    socketClient.on("chat:message", onChat);

    return () => {
      socketClient.off("room:playerJoined", onPlayerJoined);
      socketClient.off("room:playerLeft", onPlayerLeft);
      socketClient.off("room:playerUpdated", onPlayerUpdated);
      socketClient.off("room:updated", onRoomUpdated);
      socketClient.off("room:hostChanged", onHostChanged);
      socketClient.off("room:countdown", onCountdown);
      socketClient.off("game:start", onGameStart);
      socketClient.off("chat:message", onChat);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [chatMessages]);

  const onToggleReady = () => {
    const next = !ready;
    setReady(next);
    socketClient.setReady(next);
  };

  const onStart = async () => {
    setHostError("");
    const result = await socketClient.startGame(forceStart);
    if (!result?.ok) setHostError(START_ERROR_MESSAGES[result?.error] || "No se pudo iniciar.");
  };

  const onLeave = async () => {
    await socketClient.leaveRoom();
    clearSession();
    navigate("lobbyList");
  };

  const onSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    socketClient.sendChat(text);
    setChatInput("");
  };

  if (!room) return null;

  const currentLevel = levels.find((l) => l.id === room.levelId);

  return (
    <div className="screen">
      <div className="scroll" style={{ maxWidth: 560 }}>
        <div className="panel" style={{ maxWidth: "none", marginBottom: 16 }}>
          <h1 className="font-display title" style={{ fontSize: 22 }}>
            Sala {room.code}
          </h1>
          <p className="subtitle" style={{ marginBottom: 14 }}>
            Nivel: {currentLevel?.name || room.levelId} · Modo: {MODE_LABELS[room.mode] || room.mode}
          </p>

          {isHost ? (
            <>
              <div className="label" style={{ marginTop: 0 }}>
                Nivel (host)
              </div>
              <div className="row">
                {levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    className={`chip ${room.levelId === lvl.id ? "active" : ""}`}
                    onClick={() => socketClient.setLevel(lvl.id)}
                    type="button"
                  >
                    {lvl.name}
                  </button>
                ))}
              </div>
              <div className="label">Modo (host)</div>
              <div className="row">
                {Object.entries(MODE_LABELS).map(([id, label]) => (
                  <button
                    key={id}
                    className={`chip ${room.mode === id ? "active" : ""}`}
                    onClick={() => socketClient.setMode(id)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="row-between" style={{ marginTop: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--geo-text-dim)" }}>
                  <input type="checkbox" checked={forceStart} onChange={(e) => setForceStart(e.target.checked)} />
                  Forzar inicio
                </label>
                <button className="btn btn-primary" onClick={onStart} style={{ width: "auto" }}>
                  Iniciar partida
                </button>
              </div>
              {!!hostError && <p className="error-text">{hostError}</p>}
            </>
          ) : (
            <p style={{ color: "var(--geo-text-dim)", fontStyle: "italic" }}>Esperando a que el host inicie la partida...</p>
          )}

          {countdown != null && (
            <p style={{ color: "var(--geo-cyan)", fontSize: 20, fontWeight: 700, textAlign: "center", margin: "12px 0" }}>
              Empieza en {countdown}...
            </p>
          )}

          <div className="label">Jugadores</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {room.players.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                <Avatar color={p.color} state={p.faceState} />
                <span style={{ flex: 1, fontSize: 14 }}>
                  {p.name}
                  {p.id === room.hostId ? " (host)" : ""}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: p.connected === false ? "#7d2e2e" : p.ready ? "#2e7d32" : "#444",
                  }}
                >
                  {p.connected === false ? "Desconectado" : p.ready ? "Listo" : "Esperando"}
                </span>
              </div>
            ))}
          </div>

          <div className="row-between">
            <button className={`btn ${ready ? "btn-primary" : "btn-secondary"}`} onClick={onToggleReady} style={{ width: "auto" }}>
              {ready ? "Listo ✓" : "Marcar listo"}
            </button>
            <button className="btn btn-secondary" onClick={onLeave} style={{ width: "auto" }}>
              Salir de la sala
            </button>
          </div>
        </div>

        <div className="panel" style={{ maxWidth: "none" }}>
          <div className="label" style={{ marginTop: 0 }}>
            Chat
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 10 }}>
            {chatMessages.map((m, i) => (
              <p key={i} style={{ fontSize: 13, margin: "0 0 6px" }}>
                <strong style={{ color: "var(--geo-cyan)" }}>{m.name}: </strong>
                {m.text}
              </p>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={onSendChat} className="row" style={{ flexWrap: "nowrap" }}>
            <input
              className="input"
              style={{ marginBottom: 0, flex: 1 }}
              placeholder="Mensaje..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              maxLength={200}
            />
            <button className="btn btn-secondary" type="submit" style={{ width: "auto" }}>
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
