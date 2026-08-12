import { stepPlayer, makeInitialPlayerState, type Input, type Level, type PlayerPhysicsState } from "../game/PhysicsEngine";

export interface ServerPlayerState {
  x: number;
  y: number;
  vy: number;
  alive: boolean;
  eliminated: boolean;
  finished: boolean;
  progress: number;
}

// Predicción local + reconciliación contra el servidor, SOLO para el jugador
// propio. Como el avance horizontal es siempre constante, la única causa de
// divergencia es la latencia de red -> basta con corregir suavemente (lerp)
// diferencias pequeñas, y "teletransportar" (snap) ante saltos grandes.
const SNAP_DISTANCE = 120;
const SOFT_CORRECTION = 0.25;

export class Reconciliation {
  state: PlayerPhysicsState = makeInitialPlayerState();

  applyInput(input: Input, dt: number, level: Level) {
    return stepPlayer(this.state, input, dt, level);
  }

  reconcile(serverPlayer: ServerPlayerState) {
    this.state.alive = serverPlayer.alive;
    this.state.finished = serverPlayer.finished;
    this.state.eliminated = serverPlayer.eliminated;
    this.state.progress = serverPlayer.progress;

    const dx = serverPlayer.x - this.state.x;
    const dy = serverPlayer.y - this.state.y;
    const dist = Math.hypot(dx, dy);

    if (dist > SNAP_DISTANCE || !serverPlayer.alive) {
      this.state.x = serverPlayer.x;
      this.state.y = serverPlayer.y;
      this.state.vy = serverPlayer.vy;
      this.state.grounded = true;
    } else {
      this.state.x += dx * SOFT_CORRECTION;
      this.state.y += dy * SOFT_CORRECTION;
    }
  }
}
