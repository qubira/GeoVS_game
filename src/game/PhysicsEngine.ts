import { PHYSICS } from "../config";

// Espejo EXACTO de MOVIL/GeoVS/server/src/game/PhysicsEngine.js. Se usa
// únicamente para la predicción local del jugador propio: el cliente simula
// su cubo con esta misma lógica para responder al instante al input, y luego
// se reconcilia contra la posición autoritativa que llega del servidor.
const { GRAVITY, JUMP_VELOCITY, MAX_FALL_SPEED, SPEED_X, PLAYER_SIZE, GROUND_Y } = PHYSICS;

// Debe coincidir con HITBOX_MARGIN de server/src/game/PhysicsEngine.js.
const HITBOX_MARGIN = 6;

// Debe coincidir con MAX_JUMPS de server/src/game/PhysicsEngine.js.
const MAX_JUMPS = 2;

export type ObstacleType = "spike" | "block" | "platform";

export interface Obstacle {
  type: ObstacleType;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl?: string;
}

export interface Level {
  id: string;
  name: string;
  length: number;
  checkpoints: number[];
  obstacles: Obstacle[];
  speedX?: number;
  jumpVelocity?: number;
  backgroundImageUrl?: string;
  backgroundScale?: number;
  musicUrl?: string;
  musicStartSec?: number;
  musicEndSec?: number;
}

export interface PlayerPhysicsState {
  x: number;
  y: number;
  vy: number;
  grounded: boolean;
  jumpsUsed: number;
  prevJumpHeld: boolean;
  alive: boolean;
  eliminated: boolean;
  finished: boolean;
  progress: number;
}

export interface PhysicsEvent {
  type: "death" | "finished";
}

export interface Input {
  jumpHeld: boolean;
}

// ESPEJO EXACTO de server/src/game/PhysicsEngine.js. `prevY` es la posicion Y
// del jugador ANTES de moverse este tick — el chequeo vertical es un barrido
// (swept) sobre todo el rango recorrido, no solo la posicion final, para que
// a velocidades altas (caida rapida) el jugador no "atraviese" un objeto
// fino (plataforma de poco alto) sin que ningun tick llegue a detectar el
// overlap.
function resolveObstacle(
  player: PlayerPhysicsState,
  obstacle: Obstacle,
  prevY: number
): { type: "death" } | { type: "land"; landY: number } | null {
  const left = player.x + HITBOX_MARGIN;
  const right = player.x + PLAYER_SIZE - HITBOX_MARGIN;
  const obsLeft = obstacle.x;
  const obsRight = obstacle.x + obstacle.w;
  const obsTop = obstacle.y;
  const obsBottom = obstacle.y + obstacle.h;

  const horizontalOverlap = right > obsLeft && left < obsRight;
  if (!horizontalOverlap) return null;

  const prevTop = prevY + HITBOX_MARGIN;
  const prevBottom = prevY + PLAYER_SIZE - HITBOX_MARGIN;
  const newTop = player.y + HITBOX_MARGIN;
  const newBottom = player.y + PLAYER_SIZE - HITBOX_MARGIN;
  const sweepTop = Math.min(prevTop, newTop);
  const sweepBottom = Math.max(prevBottom, newBottom);
  const verticalHit = sweepBottom > obsTop && sweepTop < obsBottom;
  if (!verticalHit) return null;

  if (obstacle.type === "spike") {
    return { type: "death" };
  }

  const wasAbove = prevBottom <= obsTop + 1 && player.vy >= 0;
  if (wasAbove) {
    return { type: "land", landY: obsTop - PLAYER_SIZE };
  }
  if (obstacle.type === "block") {
    return { type: "death" };
  }
  return null;
}

export function stepPlayer(
  player: PlayerPhysicsState,
  input: Input,
  dt: number,
  level: Level
): PhysicsEvent[] {
  const events: PhysicsEvent[] = [];
  if (!player.alive || player.finished || player.eliminated) return events;

  const prevY = player.y;

  // ESPEJO EXACTO de server/src/game/PhysicsEngine.js — level.speedX/
  // level.jumpVelocity permiten a las pistas creadas desde el panel
  // sobreescribir la velocidad/salto globales.
  player.x += (level.speedX ?? SPEED_X) * dt;

  player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL_SPEED);
  const jumpPressed = input.jumpHeld && !player.prevJumpHeld;
  player.prevJumpHeld = input.jumpHeld;
  if (jumpPressed && player.jumpsUsed < MAX_JUMPS) {
    player.vy = level.jumpVelocity ?? JUMP_VELOCITY;
    player.grounded = false;
    player.jumpsUsed += 1;
  }
  player.y += player.vy * dt;

  player.grounded = false;
  if (player.y + PLAYER_SIZE >= GROUND_Y) {
    player.y = GROUND_Y - PLAYER_SIZE;
    player.vy = 0;
    player.grounded = true;
    player.jumpsUsed = 0;
  }

  for (const obstacle of level.obstacles) {
    if (obstacle.x + obstacle.w < player.x - 50 || obstacle.x > player.x + PLAYER_SIZE + 50) continue;
    const result = resolveObstacle(player, obstacle, prevY);
    if (!result) continue;
    if (result.type === "death") {
      player.alive = false;
      events.push({ type: "death" });
      break;
    }
    if (result.type === "land") {
      player.y = result.landY;
      player.vy = 0;
      player.grounded = true;
      player.jumpsUsed = 0;
    }
  }

  if (player.alive) {
    player.progress = Math.max(0, Math.min(100, (player.x / level.length) * 100));
    if (player.x >= level.length) {
      player.finished = true;
      player.x = level.length;
      events.push({ type: "finished" });
    }
  }

  return events;
}

export function makeInitialPlayerState(): PlayerPhysicsState {
  return {
    x: 0,
    y: GROUND_Y - PLAYER_SIZE,
    vy: 0,
    grounded: true,
    jumpsUsed: 0,
    prevJumpHeld: false,
    alive: true,
    eliminated: false,
    finished: false,
    progress: 0,
  };
}
