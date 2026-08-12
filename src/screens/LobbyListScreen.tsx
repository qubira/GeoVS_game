import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { saveSession } from "../network/session";
import { useAppState } from "../state/AppStateContext";
import { loadAvatarFace } from "../network/avatarPrefs";
import Avatar from "../components/Avatar";

const MODES = [
  { id: "race", label: "Carrera" },
  { id: "elimination", label: "Eliminación" },
];

const ERROR_MESSAGES: Record<string, string> = {
  ROOM_NOT_FOUND: "Esa sala no existe.",
  ALREADY_STARTED: "La partida ya empezó.",
  ROOM_FULL: "La sala está llena.",
  NOT_IDENTIFIED: "Vuelve a iniciar sesión.",
};

const HEADER_AVATAR_COLOR = "#22d3ee";

export default function LobbyListScreen() {
  const { playerName, levels, setLevels, setRoom, setMyPlayerId, navigate } = useAppState();
  const [levelId, setLevelId] = useState<string | null>(null);
  const [mode, setMode] = useState<"race" | "elimination">("race");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    socketClient.listLevels().then(({ levels: list }) => {
      setLevels(list || []);
      if (list?.length) setLevelId(list[0].id);
    });
  }, []);

  const onPlaySolo = async () => {
    setError("");
    setBusy(true);
    try {
      const soloLevelId = levelId || levels[0]?.id;
      const result = await socketClient.createRoom({ levelId: soloLevelId, maxPlayers: 1, mode: "race" });
      if (!result?.ok) return setError("No se pudo crear la partida individual.");
      setRoom(result.room);
      setMyPlayerId(result.yourPlayerId);
      saveSession({ playerName: playerName!, roomCode: result.room.code, myPlayerId: result.yourPlayerId });
      socketClient.setReady(true);
      await socketClient.startGame(true);
      navigate("roomWaiting");
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await socketClient.createRoom({ levelId: levelId || undefined, maxPlayers, mode });
      if (!result?.ok) return setError("No se pudo crear la sala.");
      setRoom(result.room);
      setMyPlayerId(result.yourPlayerId);
      saveSession({ playerName: playerName!, roomCode: result.room.code, myPlayerId: result.yourPlayerId });
      navigate("roomWaiting");
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    setError("");
    const clean = roomCode.trim().toUpperCase();
    if (clean.length !== 6) return setError("El código debe tener 6 caracteres.");
    setBusy(true);
    try {
      const result = await socketClient.joinRoom(clean);
      if (!result?.ok) return setError(ERROR_MESSAGES[result?.error] || "No se pudo unir a la sala.");
      setRoom(result.room);
      setMyPlayerId(result.yourPlayerId);
      saveSession({ playerName: playerName!, roomCode: result.room.code, myPlayerId: result.yourPlayerId });
      navigate("roomWaiting");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen" style={{ justifyContent: "flex-start", paddingTop: "3.5vh" }}>
      <div style={{ width: "100%", maxWidth: 980 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <span className="avatar-hero-ring">
            <Avatar color={HEADER_AVATAR_COLOR} state={loadAvatarFace()} size={56} />
          </span>
          <h1 className="font-display" style={{ margin: "10px 0 2px", fontSize: 24 }}>
            Hola, {playerName}
          </h1>
          <button type="button" className="btn-pill-link" onClick={() => navigate("roomBrowser")} style={{ marginTop: 6 }}>
            🌐 Ver salas activas y jugadores conectados
          </button>
        </div>

        <div className="lobby-split">
          {/* Columna izquierda: practicar solo */}
          <div className="panel panel-glow" style={{ maxWidth: "none", ["--panel-accent" as any]: "var(--geo-blue)" }}>
            <div className="section-header">
              <span className="icon-badge" style={{ ["--badge-a" as any]: "var(--geo-blue)", ["--badge-b" as any]: "var(--geo-cyan)" }}>
                🗺️
              </span>
              <span className="section-title">Nivel</span>
            </div>
            <div className="row" style={{ marginTop: 12, marginBottom: 18 }}>
              {levels.map((lvl, i) => (
                <button
                  key={lvl.id}
                  className={`chip ${levelId === lvl.id ? "active" : ""}`}
                  onClick={() => setLevelId(lvl.id)}
                  type="button"
                >
                  {i + 1}. {lvl.name.replace(/^Nivel \d+\s*-\s*/, "")}
                </button>
              ))}
            </div>

            <div className="section-header">
              <span className="icon-badge" style={{ ["--badge-a" as any]: "var(--geo-purple)", ["--badge-b" as any]: "var(--geo-blue)" }}>
                🏃
              </span>
              <span className="section-title">Jugar solo</span>
            </div>
            <p style={{ color: "var(--geo-text-dim)", fontSize: 13, margin: "8px 0 14px" }}>
              Practica el nivel sin esperar a nadie más.
            </p>
            <button className="btn btn-secondary" onClick={onPlaySolo} disabled={busy} style={{ width: "100%" }}>
              ▶ Jugar solo
            </button>
          </div>

          {/* Columna derecha: multijugador */}
          <div className="panel panel-glow" style={{ maxWidth: "none", ["--panel-accent" as any]: "var(--geo-pink)" }}>
            <div className="section-header">
              <span className="icon-badge" style={{ ["--badge-a" as any]: "var(--geo-pink)", ["--badge-b" as any]: "var(--geo-yellow)" }}>
                🚪
              </span>
              <span className="section-title">Crear sala</span>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={`chip ${mode === m.id ? "active" : ""}`}
                  onClick={() => setMode(m.id as "race" | "elimination")}
                  type="button"
                >
                  {m.id === "race" ? "🏁" : "💀"} {m.label}
                </button>
              ))}
            </div>
            <div className="row-between" style={{ marginTop: 14 }}>
              <span style={{ fontSize: 13, color: "var(--geo-text-dim)" }}>
                Máximo: <strong style={{ color: "var(--geo-text)" }}>{maxPlayers}</strong>
              </span>
              <div className="row" style={{ marginBottom: 0 }}>
                <button className="chip" type="button" onClick={() => setMaxPlayers((n) => Math.max(2, n - 1))}>
                  −
                </button>
                <button className="chip" type="button" onClick={() => setMaxPlayers((n) => Math.min(8, n + 1))}>
                  +
                </button>
              </div>
            </div>
            <button className="btn btn-primary" onClick={onCreate} disabled={busy} style={{ marginTop: 16 }}>
              🚪 Crear sala
            </button>

            <div style={{ borderTop: "1px solid var(--geo-border)", margin: "20px 0" }} />

            <div className="section-header">
              <span className="icon-badge" style={{ ["--badge-a" as any]: "var(--geo-cyan)", ["--badge-b" as any]: "var(--geo-purple)" }}>
                🔑
              </span>
              <span className="section-title">Unirse a sala</span>
            </div>
            <div className="row" style={{ flexWrap: "nowrap", marginTop: 12 }}>
              <input
                className="input"
                style={{ marginBottom: 0, flex: 1, textTransform: "uppercase", letterSpacing: "0.1em" }}
                placeholder="Código de 6 caracteres"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button className="btn btn-secondary" onClick={onJoin} disabled={busy} style={{ width: "auto" }}>
                Unirse
              </button>
            </div>
          </div>
        </div>

        {!!error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
