import { useEffect, useRef, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { saveSession } from "../network/session";
import { useAppState } from "../state/AppStateContext";
import Avatar from "../components/Avatar";
import { countryLabel } from "../components/country";
import type { RoomSummaryDTO } from "../types";

const MODE_LABELS: Record<string, string> = { race: "Carrera", elimination: "Eliminación" };
const STATE_LABELS: Record<string, string> = {
  lobby: "Esperando",
  countdown: "Iniciando",
  playing: "En curso",
  finished: "Terminada",
};
const STATE_COLORS: Record<string, string> = {
  lobby: "#2e7d32",
  countdown: "var(--geo-yellow)",
  playing: "var(--geo-cyan)",
  finished: "#555",
};

const REFRESH_MS = 4000;

export default function RoomBrowserScreen() {
  const { playerName, levels, setLevels, setRoom, setMyPlayerId, navigate } = useAppState();
  const [rooms, setRooms] = useState<RoomSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const mountedRef = useRef(true);

  async function refresh() {
    const { rooms: list } = await socketClient.listRooms();
    if (mountedRef.current) setRooms(list || []);
  }

  useEffect(() => {
    mountedRef.current = true;
    if (!levels.length) {
      socketClient.listLevels().then(({ levels: list }) => setLevels(list || []));
    }
    refresh().finally(() => setLoading(false));
    const interval = setInterval(refresh, REFRESH_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const onJoin = async (code: string) => {
    setError("");
    setJoiningCode(code);
    try {
      const result = await socketClient.joinRoom(code);
      if (!result?.ok) {
        setError(
          result?.error === "ROOM_FULL"
            ? "Esa sala ya está llena."
            : result?.error === "ALREADY_STARTED"
              ? "Esa partida ya empezó."
              : "No se pudo unir a la sala."
        );
        return;
      }
      setRoom(result.room);
      setMyPlayerId(result.yourPlayerId);
      saveSession({ playerName: playerName!, roomCode: result.room.code, myPlayerId: result.yourPlayerId });
      navigate("roomWaiting");
    } finally {
      setJoiningCode(null);
    }
  };

  return (
    <div className="screen" style={{ justifyContent: "flex-start", paddingTop: "4vh" }}>
      <div className="scroll" style={{ maxWidth: 720 }}>
        <div className="row-between" style={{ marginBottom: 18 }}>
          <h1 className="font-display" style={{ fontSize: 24, margin: 0 }}>
            Salas activas
          </h1>
          <button className="btn btn-secondary" onClick={() => navigate("lobbyList")} style={{ width: "auto" }}>
            ← Volver
          </button>
        </div>

        {loading && <p style={{ color: "var(--geo-text-dim)", textAlign: "center" }}>Cargando salas...</p>}

        {!loading && rooms.length === 0 && (
          <div className="panel" style={{ maxWidth: "none", textAlign: "center" }}>
            <p style={{ color: "var(--geo-text-dim)", margin: 0 }}>
              No hay salas activas en este momento. ¡Crea una desde el lobby!
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rooms.map((room) => {
            const level = levels.find((l) => l.id === room.levelId);
            const joinable = room.state === "lobby" && room.players.length < room.maxPlayers;
            return (
              <div key={room.code} className="panel" style={{ maxWidth: "none" }}>
                <div className="row-between">
                  <div>
                    <span className="font-display" style={{ fontSize: 17, fontWeight: 800 }}>
                      Sala {room.code}
                    </span>
                    <span
                      style={{
                        marginLeft: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 10,
                        background: STATE_COLORS[room.state] || "#555",
                        color: room.state === "countdown" ? "var(--geo-bg)" : "#fff",
                      }}
                    >
                      {STATE_LABELS[room.state] || room.state}
                    </span>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: "auto", padding: "8px 18px" }}
                    disabled={!joinable || joiningCode === room.code}
                    onClick={() => onJoin(room.code)}
                  >
                    {joiningCode === room.code ? "Uniendo..." : joinable ? "Unirse" : "No disponible"}
                  </button>
                </div>

                <p style={{ color: "var(--geo-text-dim)", fontSize: 13, margin: "6px 0 12px" }}>
                  {MODE_LABELS[room.mode] || room.mode} · {level?.name || room.levelId} · {room.players.length}/
                  {room.maxPlayers} jugadores
                </p>

                {room.players.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {room.players.map((p) => (
                      <div
                        key={p.id}
                        title={countryLabel(p.country, p.countryCode)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: "rgba(255,255,255,0.05)",
                          borderRadius: 999,
                          padding: "4px 10px 4px 4px",
                        }}
                      >
                        <Avatar color={p.color} state={p.faceState} size={22} />
                        <span style={{ fontSize: 12 }}>{p.name}</span>
                        <span style={{ fontSize: 13 }}>{countryLabel(p.country, p.countryCode).split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!!error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
