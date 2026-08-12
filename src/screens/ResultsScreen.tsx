import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { clearSession } from "../network/session";
import { useAppState } from "../state/AppStateContext";
import Avatar from "../components/Avatar";
import type { FaceState } from "../components/avatars";
import type { RoundEndedPayload } from "../types";

function faceForRow(status: string, base: FaceState = "neutral"): FaceState {
  if (status === "finished") return "happy";
  if (status === "eliminated") return "dizzy";
  return base;
}

const STATUS_LABELS: Record<string, string> = {
  finished: "Meta",
  eliminated: "Eliminado",
  "in-progress": "En progreso",
  disconnected: "Desconectado",
};

const REASON_LABELS: Record<string, string> = {
  allFinished: "Todos terminaron / tiempo de gracia cumplido",
  allDeadOrEliminated: "Todos murieron o fueron eliminados",
  timeout: "Se alcanzó el tiempo límite de la ronda",
};

function formatTime(ms: number | null) {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function ResultsScreen({ params }: { params: RoundEndedPayload }) {
  const { room, setRoom, myPlayerId, navigate } = useAppState();
  const [error, setError] = useState("");
  const isHost = room?.hostId === myPlayerId;

  useEffect(() => {
    const onBackToLobby = ({ room: updated }: { room: any }) => {
      setRoom(updated);
      navigate("roomWaiting");
    };
    socketClient.on("room:backToLobby", onBackToLobby);
    return () => socketClient.off("room:backToLobby", onBackToLobby);
  }, []);

  const onPlayAgain = async () => {
    const result = await socketClient.playAgain();
    if (!result?.ok) setError("No se pudo reiniciar la sala.");
  };

  const onLeave = async () => {
    await socketClient.leaveRoom();
    clearSession();
    navigate("lobbyList");
  };

  return (
    <div className="screen">
      <div className="panel" style={{ maxWidth: 560 }}>
        <h1 className="font-display title" style={{ fontSize: 22 }}>
          Resultados de la ronda
        </h1>
        <p className="subtitle">{REASON_LABELS[params.reason] || params.reason}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="row-between" style={{ color: "var(--geo-text-dim)", fontSize: 12, fontWeight: 700, borderBottom: "1px solid var(--geo-border)", paddingBottom: 6 }}>
            <span style={{ width: 24 }}>#</span>
            <span style={{ flex: 2 }}>Nombre</span>
            <span style={{ width: 50, textAlign: "right" }}>%</span>
            <span style={{ width: 70, textAlign: "right" }}>Tiempo</span>
            <span style={{ width: 90, textAlign: "right" }}>Estado</span>
          </div>
          {params.results.map((r) => {
            const player = room?.players.find((p) => p.id === r.playerId);
            const color = player?.color || "#888";
            return (
              <div key={r.playerId} className="row-between" style={{ fontSize: 14, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                <span style={{ width: 24 }}>{r.place}</span>
                <span style={{ flex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar color={color} state={faceForRow(r.status, player?.faceState)} size={24} />
                  {r.name}
                </span>
                <span style={{ width: 50, textAlign: "right" }}>{r.progress}%</span>
                <span style={{ width: 70, textAlign: "right" }}>{formatTime(r.time)}</span>
                <span style={{ width: 90, textAlign: "right" }}>{STATUS_LABELS[r.status] || r.status}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {isHost ? (
            <button className="btn btn-primary" onClick={onPlayAgain}>
              Jugar de nuevo
            </button>
          ) : (
            <p style={{ color: "var(--geo-text-dim)", fontStyle: "italic", textAlign: "center" }}>
              Esperando a que el host inicie otra ronda...
            </p>
          )}
          <button className="btn btn-secondary" onClick={onLeave}>
            Salir de la sala
          </button>
        </div>
        {!!error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
