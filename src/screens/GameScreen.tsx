import { useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { socketClient } from "../network/SocketClient";
import { clearSession } from "../network/session";
import { Reconciliation } from "../network/Reconciliation";
import { InterpolationBuffer } from "../network/Interpolation";
import { PHYSICS, WORLD, RENDER } from "../config";
import { useAppState } from "../state/AppStateContext";
import { drawPlayerCube } from "../components/PlayerCube";
import Avatar from "../components/Avatar";
import { faceForStatus } from "../components/avatars";
import { drawObstacleTile } from "../components/obstacles";
import type { GameStartPayload, PlayerLobbyDTO } from "../types";

const FLASH_DURATION_MS = 500;

// El canvas se dibuja en coordenadas "logicas" (WORLD.WIDTH x WORLD.HEIGHT)
// pero el buffer real se crea mas grande segun la densidad de pixeles de la
// pantalla (retina/alta resolucion), si no la imagen sale borrosa al
// estirarse por CSS para llenar la ventana — mas notorio en movimientos
// rapidos como el salto. Tope en 2x para no gastar de mas en pantallas 3x/4x.
const DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

// Fondo personalizado de la pista (ver modulo "Crear" del panel). Cache por
// URL, mismo patron que obstacles.ts/avatars.ts.
const backgroundCache = new Map<string, HTMLImageElement>();
function getBackgroundImage(url: string): HTMLImageElement {
  let img = backgroundCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    backgroundCache.set(url, img);
  }
  return img;
}

interface PlayerStatus {
  progress: number;
  alive: boolean;
  finished: boolean;
  eliminated: boolean;
  connected: boolean;
  place?: number;
}

interface GameRef {
  level: GameStartPayload["levelData"];
  mode: GameStartPayload["mode"];
  roundStartTime: number;
  myId: string;
  reconciliation: Reconciliation;
  interpolation: InterpolationBuffer;
  input: { jumpHeld: boolean };
  playerInfo: Map<string, PlayerLobbyDTO>;
  playerStatus: Map<string, PlayerStatus>;
  elapsedSec: number;
  flash: { color: string; startedAt: number } | null;
}

function playSound(src: string) {
  try {
    const audio = new Audio(src);
    audio.volume = 0.6;
    void audio.play();
  } catch {
    // el audio es cosmético
  }
}

export default function GameScreen({ params }: { params: GameStartPayload }) {
  const { room, myPlayerId, navigate } = useAppState();
  const [, forceRender] = useReducer((n) => n + 1, 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameRef | null>(null);

  if (!gameRef.current) {
    const initialStatus = new Map<string, PlayerStatus>(
      (room?.players || []).map((p) => [p.id, { progress: 0, alive: true, finished: false, eliminated: false, connected: true }])
    );
    gameRef.current = {
      level: params.levelData,
      mode: params.mode,
      roundStartTime: params.serverStartTime,
      myId: myPlayerId!,
      reconciliation: new Reconciliation(),
      interpolation: new InterpolationBuffer(),
      input: { jumpHeld: false },
      playerInfo: new Map((room?.players || []).map((p) => [p.id, p])),
      playerStatus: initialStatus,
      elapsedSec: 0,
      flash: null,
    };
  }
  const game = gameRef.current;

  useEffect(() => {
    let mounted = true;

    const onState = ({ serverTime, players }: { serverTime: number; players: any[] }) => {
      for (const p of players) {
        const status = game.playerStatus.get(p.id) || ({} as PlayerStatus);
        Object.assign(status, {
          progress: p.progress,
          alive: p.alive,
          finished: p.finished,
          eliminated: p.eliminated,
          connected: p.connected,
        });
        game.playerStatus.set(p.id, status);

        if (p.id === game.myId) game.reconciliation.reconcile(p);
        else game.interpolation.push(p.id, serverTime, p.x, p.y);
      }
    };
    const onDied = ({ playerId }: { playerId: string }) => {
      const s = game.playerStatus.get(playerId);
      if (s) s.alive = false;
      if (playerId === game.myId) {
        game.flash = { color: "#e53935", startedAt: Date.now() };
        playSound("/sounds/death.wav");
      }
    };
    const onFinished = ({ playerId, place }: { playerId: string; place: number }) => {
      const s = game.playerStatus.get(playerId);
      if (s) {
        s.finished = true;
        s.place = place;
      }
      if (playerId === game.myId) {
        game.flash = { color: "#ffd54f", startedAt: Date.now() };
        playSound("/sounds/finish.wav");
      }
    };
    const onEliminated = ({ playerId }: { playerId: string }) => {
      const s = game.playerStatus.get(playerId);
      if (s) s.eliminated = true;
      if (playerId === game.myId) {
        game.flash = { color: "#e53935", startedAt: Date.now() };
        playSound("/sounds/death.wav");
      }
    };
    const onDisconnected = ({ playerId }: { playerId: string }) => {
      const s = game.playerStatus.get(playerId);
      if (s) s.connected = false;
    };
    const onRoundEnded = (payload: any) => navigate("results", payload);

    socketClient.on("game:state", onState);
    socketClient.on("game:playerDied", onDied);
    socketClient.on("game:playerFinished", onFinished);
    socketClient.on("game:playerEliminated", onEliminated);
    socketClient.on("room:playerDisconnected", onDisconnected);
    socketClient.on("game:roundEnded", onRoundEnded);

    // Musica de fondo de la pista (solo si la pista trae una — ver modulo
    // "Crear" del panel). Se reproduce SOLO el tramo recortado por el admin
    // (musicStartSec..musicEndSec, ver LevelEditor) y ese tramo se repite en
    // loop mientras dure la ronda — no se usa el atributo `loop` nativo
    // porque repetiria el archivo entero, no el recorte. Se detiene al
    // terminar/desmontar.
    let musicEl: HTMLAudioElement | null = null;
    if (game.level.musicUrl) {
      const musicStart = game.level.musicStartSec ?? 0;
      const musicEnd = game.level.musicEndSec ?? null;
      musicEl = new Audio(game.level.musicUrl);
      musicEl.volume = 0.4;
      const el = musicEl;
      el.addEventListener("loadedmetadata", () => {
        el.currentTime = musicStart;
        el.play().catch(() => {
          // el navegador puede bloquear el autoplay hasta la primera
          // interaccion del usuario; no es critico, se degrada en silencio
        });
      });
      el.addEventListener("timeupdate", () => {
        if (musicEnd != null && el.currentTime >= musicEnd) el.currentTime = musicStart;
      });
    }

    const setJump = (held: boolean) => {
      if (game.input.jumpHeld === held) return;
      game.input.jumpHeld = held;
      socketClient.sendInput(held);
      if (held) playSound("/sounds/jump.wav");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        setJump(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") setJump(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      setJump(true);
    };
    const onPointerUp = () => setJump(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const canvas = canvasRef.current;
    canvas?.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    let lastTime = Date.now();
    let raf: number;
    const loop = () => {
      if (!mounted) return;
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const myStatus = game.playerStatus.get(game.myId);
      if (myStatus?.alive && !myStatus.finished && !myStatus.eliminated) {
        game.reconciliation.applyInput(game.input, dt, game.level);
      }
      game.elapsedSec = Math.max(0, (Date.now() - game.roundStartTime) / 1000);

      forceRender();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      if (musicEl) {
        musicEl.pause();
        musicEl.src = "";
      }
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      socketClient.off("game:state", onState);
      socketClient.off("game:playerDied", onDied);
      socketClient.off("game:playerFinished", onFinished);
      socketClient.off("game:playerEliminated", onEliminated);
      socketClient.off("room:playerDisconnected", onDisconnected);
      socketClient.off("game:roundEnded", onRoundEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = Date.now();
  const myState = game.reconciliation.state;
  const myStatus = game.playerStatus.get(game.myId);

  let cameraFocusX = myState.x;
  if (myStatus?.eliminated) {
    const leader = [...game.playerInfo.keys()]
      .map((id) => ({ id, status: game.playerStatus.get(id) }))
      .filter((p): p is { id: string; status: PlayerStatus } => !!p.status && !p.status.eliminated)
      .sort((a, b) => (b.status.progress || 0) - (a.status.progress || 0))[0];
    if (leader) {
      const pos = leader.id === game.myId ? myState : game.interpolation.getPosition(leader.id, now);
      if (pos) cameraFocusX = pos.x;
    }
  }
  const cameraX = cameraFocusX - RENDER.CAMERA_OFFSET_X;

  // Draw imperatively into the canvas after every render tick (driven by the
  // rAF loop above via forceRender), mirroring the mobile SVG redraw.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // El buffer fisico es WORLD * DPR; este transform hace que todo el resto
    // del codigo pueda seguir dibujando en coordenadas logicas (0..WORLD.WIDTH)
    // sin cambiar nada mas.
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, WORLD.WIDTH, WORLD.HEIGHT);

    // fondo — se mueve con la camara (a menos velocidad que los obstaculos,
    // efecto parallax de profundidad) y se repite sin cortes, para que nunca
    // se "quede atras" ni los objetos terminen fuera de la ilustracion en
    // pistas largas. Antes quedaba fijo en pantalla, que se veia raro apenas
    // se avanzaba un poco.
    const bgUrl = game.level.backgroundImageUrl;
    const bgImg = bgUrl ? getBackgroundImage(bgUrl) : null;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      // "cover" por defecto, ajustable por pista con backgroundScale (ver
      // modulo Crear del panel): >1 acerca/agranda, <1 aleja/achica.
      const scale = Math.max(WORLD.WIDTH / bgImg.naturalWidth, WORLD.HEIGHT / bgImg.naturalHeight) * (game.level.backgroundScale ?? 1);
      const dw = bgImg.naturalWidth * scale;
      const dh = bgImg.naturalHeight * scale;
      const dy = (WORLD.HEIGHT - dh) / 2;
      const PARALLAX = 0.4; // <1 = el fondo se mueve mas lento que el nivel (profundidad)
      // modulo positivo: cuanto hay que correr el mosaico para que la
      // repeticion sea invisible sin importar que tan lejos se avanzo
      const offsetX = (((-cameraX * PARALLAX) % dw) + dw) % dw;
      for (let x = offsetX - dw; x < WORLD.WIDTH; x += dw) {
        ctx.drawImage(bgImg, x, dy, dw, dh);
      }
    } else {
      ctx.fillStyle = "#12122b";
      ctx.fillRect(0, 0, WORLD.WIDTH, WORLD.HEIGHT);
    }
    // piso
    ctx.fillStyle = "#33344a";
    ctx.fillRect(0, PHYSICS.GROUND_Y + PHYSICS.PLAYER_SIZE, WORLD.WIDTH, WORLD.HEIGHT - PHYSICS.GROUND_Y - PHYSICS.PLAYER_SIZE);
    ctx.strokeStyle = "rgba(139,47,224,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, PHYSICS.GROUND_Y + PHYSICS.PLAYER_SIZE);
    ctx.lineTo(WORLD.WIDTH, PHYSICS.GROUND_Y + PHYSICS.PLAYER_SIZE);
    ctx.stroke();

    for (const obstacle of game.level.obstacles) {
      const screenX = obstacle.x - cameraX;
      if (screenX + obstacle.w < 0 || screenX > WORLD.WIDTH) continue;
      drawObstacleTile(ctx, obstacle, screenX, obstacle.y);
    }

    for (const [id, info] of game.playerInfo.entries()) {
      if (id === game.myId) continue;
      const status = game.playerStatus.get(id);
      if (status?.eliminated) continue;
      const pos = game.interpolation.getPosition(id, now);
      if (!pos) continue;
      const screenX = pos.x - cameraX;
      if (screenX < -60 || screenX > WORLD.WIDTH + 60) continue;
      drawPlayerCube(ctx, {
        x: screenX,
        y: pos.y,
        size: PHYSICS.PLAYER_SIZE,
        color: info.color,
        name: info.name,
        baseFace: info.faceState,
        avatarImageUrl: info.avatarImageUrl || undefined,
        dimmed: status?.connected === false,
        dead: status ? !status.alive : false,
      });
    }

    if (!myStatus?.eliminated) {
      const info = game.playerInfo.get(game.myId);
      drawPlayerCube(ctx, {
        x: myState.x - cameraX,
        y: myState.y,
        size: PHYSICS.PLAYER_SIZE,
        color: info?.color || "#ffffff",
        name: info?.name || "Tú",
        baseFace: info?.faceState,
        avatarImageUrl: info?.avatarImageUrl || undefined,
        dead: !myState.alive,
        grounded: myState.grounded,
        vy: myState.vy,
        finished: myState.finished,
      });
    }
  });

  let banner: string | null = null;
  if (myStatus?.eliminated) banner = "Eliminado — modo espectador";
  else if (myStatus?.finished) banner = "¡Meta! Esperando a los demás...";
  else if (myStatus && !myStatus.alive) banner = "Reapareciendo...";

  let flashOpacity = 0;
  let flashColor = "#000000";
  if (game.flash) {
    const elapsed = now - game.flash.startedAt;
    flashOpacity = Math.max(0, 1 - elapsed / FLASH_DURATION_MS) * 0.5;
    flashColor = game.flash.color;
    if (elapsed > FLASH_DURATION_MS) game.flash = null;
  }

  const rows = [...game.playerInfo.entries()]
    .map(([id, info]) => ({ id, info, status: game.playerStatus.get(id) || ({} as PlayerStatus) }))
    .sort((a, b) => (b.status.progress || 0) - (a.status.progress || 0));

  const onLeave = async () => {
    if (!window.confirm("Perderás tu progreso en esta ronda. ¿Salir de todos modos?")) return;
    await socketClient.leaveRoom();
    clearSession();
    navigate("lobbyList");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#202235", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: `min(100vw, ${(WORLD.WIDTH / WORLD.HEIGHT) * 100}vh)`, aspectRatio: `${WORLD.WIDTH} / ${WORLD.HEIGHT}` }}>
        <canvas
          ref={canvasRef}
          width={WORLD.WIDTH * DPR}
          height={WORLD.HEIGHT * DPR}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "pointer" }}
        />

        {flashOpacity > 0 && (
          <div style={{ position: "absolute", inset: 0, background: flashColor, opacity: flashOpacity, pointerEvents: "none" }} />
        )}

        {!!banner && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: 170,
              textAlign: "center",
              background: "rgba(20,21,31,0.85)",
              borderRadius: 10,
              padding: "6px 10px",
              fontSize: 13,
              fontWeight: 600,
              pointerEvents: "none",
            }}
          >
            {banner}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 170,
            background: "rgba(20,21,31,0.85)",
            borderRadius: 10,
            padding: 10,
            pointerEvents: "none",
          }}
        >
          <div className="font-display" style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
            {game.mode === "race" ? "Carrera" : "Eliminación"}
          </div>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            {game.elapsedSec.toFixed(1)}s
          </div>
          {rows.map(({ id, info, status }) => (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
              <Avatar color={info.color} state={faceForStatus(status, info.faceState)} size={18} />
              <span style={{ fontSize: 10, width: 44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.name}</span>
              <span style={{ flex: 1, height: 5, background: "#333", borderRadius: 3, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${status.progress || 0}%`, background: info.color }} />
              </span>
              <span style={{ fontSize: 10, width: 34, textAlign: "right" }}>
                {status.finished ? "META" : status.eliminated ? "Elim." : status.connected === false ? "Desc." : `${Math.round(status.progress || 0)}%`}
              </span>
            </div>
          ))}
        </div>

        <button
          className="btn btn-secondary"
          onClick={onLeave}
          style={{ position: "absolute", bottom: 12, left: 12, width: "auto", padding: "6px 14px", fontSize: 12 }}
        >
          Salir
        </button>

        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            pointerEvents: "none",
          }}
        >
          Espacio / clic para saltar
        </div>
      </div>
    </div>
  );
}
