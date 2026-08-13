import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { saveSession } from "../network/session";
import { useAppState } from "../state/AppStateContext";
import { loadAvatarFace, loadAvatarImageUrl } from "../network/avatarPrefs";
import { clearToken } from "../network/auth";
import Avatar from "../components/Avatar";
import RoomsModal from "../components/RoomsModal";
import ProfileModal from "../components/ProfileModal";
import StoreModal from "../components/StoreModal";
import type { FaceState } from "../components/avatars";

const ROLE_LABELS: Record<string, string> = {
  player: "Jugador",
  developer: "Desarrollador",
  moderator: "Moderador",
  admin: "Administrador",
};

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

// Cada cuanto se refresca solo (sin que el jugador tenga que recargar la
// pagina) la lista de niveles y el contador de salas — asi una pista nueva
// publicada desde el panel, o una sala recien creada por otro jugador,
// aparece sin intervencion mientras alguien esta parado en el lobby.
const LOBBY_REFRESH_MS = 15000;

export default function LobbyListScreen() {
  const { playerName, account, levels, setLevels, setRoom, setMyPlayerId, navigate } = useAppState();
  const [levelId, setLevelId] = useState<string | null>(null);
  const [mode, setMode] = useState<"race" | "elimination">("race");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRooms, setShowRooms] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [activeRoomCount, setActiveRoomCount] = useState<number | null>(null);
  const [face, setFace] = useState<FaceState>(loadAvatarFace);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(loadAvatarImageUrl);

  const onLogout = async () => {
    await socketClient.leaveRoom().catch(() => {});
    clearToken();
    navigate("auth");
  };

  // Se repite cada LOBBY_REFRESH_MS (no solo al montar) para que una pista
  // publicada mientras el jugador ya esta en el lobby aparezca sola. Si la
  // pista que tenia elegida deja de existir (se borro/despublico), cae a la
  // primera disponible en vez de quedar apuntando a un id invalido.
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      socketClient.listLevels().then(({ levels: list }) => {
        if (!mounted) return;
        setLevels(list || []);
        setLevelId((prev) => (prev && list?.some((l) => l.id === prev) ? prev : list?.[0]?.id ?? null));
      });
    };
    refresh();
    const interval = setInterval(refresh, LOBBY_REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Contador liviano en el botón para que se note, de un vistazo, que hay
  // salas para ver — sin tener que abrir el panel para descubrirlo.
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      socketClient.listRooms().then(({ rooms }) => {
        if (mounted) setActiveRoomCount(rooms?.length ?? 0);
      });
    };
    refresh();
    const interval = setInterval(refresh, LOBBY_REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
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
            <Avatar color={HEADER_AVATAR_COLOR} state={face} imageUrl={avatarImageUrl} size={56} />
          </span>
          <h1 className="font-display" style={{ margin: "10px 0 2px", fontSize: 24 }}>
            Hola, {playerName}
          </h1>
          {account && (
            <span style={{ fontSize: 11, color: "var(--geo-text-dim)", marginBottom: 8 }}>
              Rol: <strong style={{ color: "var(--geo-cyan)" }}>{ROLE_LABELS[account.role] || account.role}</strong>
            </span>
          )}
          <div className="row" style={{ justifyContent: "center" }}>
            <button type="button" className="rooms-trigger-btn" onClick={() => setShowRooms(true)}>
              🌐 Ver salas y jugadores
              {activeRoomCount !== null && <span className="rooms-trigger-count">{activeRoomCount}</span>}
            </button>
            <button type="button" className="btn-pill-link" onClick={() => setShowStore(true)}>
              🛒 Tienda
            </button>
            <button type="button" className="btn-pill-link" onClick={() => setShowProfile(true)}>
              ⚙️ Perfil
            </button>
            <button type="button" className="btn-pill-link" onClick={onLogout} style={{ borderColor: "rgba(239,47,176,0.4)", color: "var(--geo-pink)" }}>
              Salir
            </button>
          </div>
        </div>

        {showRooms && <RoomsModal onClose={() => setShowRooms(false)} />}
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        {showStore && (
          <StoreModal
            onClose={() => setShowStore(false)}
            onChanged={(f, url) => {
              setFace(f);
              setAvatarImageUrl(url);
            }}
          />
        )}

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
