import { RENDER } from "../config";

interface Snapshot {
  t: number;
  x: number;
  y: number;
}

// Buffer de snapshots por jugador remoto ("fantasma"). Renderizamos con un
// pequeño retraso (INTERP_DELAY_MS) e interpolamos entre los dos snapshots
// que rodean ese instante, para que el movimiento remoto se vea fluido pese
// al jitter de red.
export class InterpolationBuffer {
  private buffers = new Map<string, Snapshot[]>();

  push(playerId: string, serverTime: number, x: number, y: number) {
    if (!this.buffers.has(playerId)) this.buffers.set(playerId, []);
    const buf = this.buffers.get(playerId)!;
    buf.push({ t: serverTime, x, y });
    while (buf.length > 2 && serverTime - buf[0].t > 1000) buf.shift();
  }

  removePlayer(playerId: string) {
    this.buffers.delete(playerId);
  }

  getPosition(playerId: string, now: number): { x: number; y: number } | null {
    const buf = this.buffers.get(playerId);
    if (!buf || buf.length === 0) return null;

    const renderTime = now - RENDER.INTERP_DELAY_MS;
    if (buf.length === 1) return { x: buf[0].x, y: buf[0].y };

    for (let i = 0; i < buf.length - 1; i++) {
      const a = buf[i];
      const b = buf[i + 1];
      if (a.t <= renderTime && renderTime <= b.t) {
        const span = b.t - a.t || 1;
        const t = (renderTime - a.t) / span;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
    }

    if (renderTime < buf[0].t) return { x: buf[0].x, y: buf[0].y };
    const last = buf[buf.length - 1];
    return { x: last.x, y: last.y };
  }
}
