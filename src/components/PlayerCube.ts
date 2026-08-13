import { faceForStatus, getFaceImage, getFaceImageByUrl, type FaceState } from "./avatars";

// Dibuja el cubo-personaje: cuerpo de color plano (mantiene la lectura
// instantánea del hitbox, clave en un plataformero de precisión) con la cara
// real recortada de imagen/fernanfloo.png superpuesta y recortada al cubo.
export interface PlayerCubeState {
  x: number;
  y: number;
  size: number;
  color: string;
  name: string;
  dimmed?: boolean;
  dead?: boolean;
  eliminated?: boolean;
  finished?: boolean;
  grounded?: boolean;
  vy?: number;
  /** Expresión "de reposo" elegida por el jugador (ver AvatarCreator). */
  baseFace?: FaceState;
  /** Avatar cubo personalizado subido desde el panel (ver avatars.ts). Si
   * está presente, reemplaza la cara integrada — sin variantes de reacción
   * (feliz/mareado), eso queda solo para el set de caras de siempre. */
  avatarImageUrl?: string;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPlayerCube(ctx: CanvasRenderingContext2D, p: PlayerCubeState) {
  const { x, y, size, color } = p;
  ctx.save();
  ctx.globalAlpha = p.dimmed ? 0.4 : 1;

  // Cubo rigido, sin squash/stretch — misma fisica "de cuadrado" que
  // Geometry Dash, donde el cubo no cambia de forma al saltar/caer (el
  // estirado que tenia antes se leia como un bug, no como un efecto).
  const cx = x + size / 2;

  const radius = size * 0.22;

  // Cuerpo
  roundRect(ctx, x, y, size, size, radius);
  ctx.fillStyle = p.eliminated ? "#3a3b4a" : color;
  ctx.fill();
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.strokeStyle = "#0a0b1e";
  ctx.stroke();

  // Cara real, recortada al cuerpo del cubo — un avatar personalizado
  // reemplaza el set de caras integrado (sin reaccion de feliz/mareado).
  const img = p.avatarImageUrl ? getFaceImageByUrl(p.avatarImageUrl) : getFaceImage(faceForStatus(p, p.baseFace));
  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    roundRect(ctx, x + 1, y + 1, size - 2, size - 2, radius * 0.9);
    ctx.clip();

    const pad = size * 0.06;
    const boxSize = size - pad * 2;
    const scale = Math.max(boxSize / img.naturalWidth, boxSize / img.naturalHeight) * 1.18;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = cx - dw / 2;
    const dy = y + size / 2 - dh / 2 + size * 0.03;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  ctx.restore();

  // Nombre
  ctx.save();
  ctx.font = `700 ${Math.max(11, size * 0.3)}px "Baloo 2", sans-serif`;
  ctx.textAlign = "center";
  const label = p.name;
  const labelW = ctx.measureText(label).width + 10;
  ctx.fillStyle = "rgba(10,11,30,0.7)";
  roundRect(ctx, cx - labelW / 2, y - size * 0.55, labelW, size * 0.4, size * 0.15);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, y - size * 0.35);
  ctx.restore();
}
