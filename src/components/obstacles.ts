import type { Obstacle, ObstacleType } from "../game/PhysicsEngine";

// Íconos recortados de imagen/objetos.png (ver imagen/extract_obstacles.py).
// A diferencia de las caras, este sheet tiene fondo degradado (no plano), así
// que no se intenta transparencia: cada ícono se dibuja como una "baldosa"
// que cubre todo el obstáculo (drawImage en modo cover) con un borde de neón
// encima para integrarlo a la estética del juego.
const SOURCES: Record<ObstacleType, string> = {
  spike: "/obstacles/spike.png",
  block: "/obstacles/block.png",
  platform: "/obstacles/platform.png",
};

const BORDER_COLOR: Record<ObstacleType, string> = {
  spike: "#ff6b4a",
  block: "#c084fc",
  platform: "#f7c948",
};

const cache = new Map<ObstacleType, HTMLImageElement>();

export function getObstacleImage(type: ObstacleType): HTMLImageElement {
  let img = cache.get(type);
  if (!img) {
    img = new Image();
    img.src = SOURCES[type];
    cache.set(type, img);
  }
  return img;
}

// Objetos personalizados subidos desde el modulo "Crear" del panel (ver
// GeoVS_Control): imagen propia en vez del PNG por defecto del tipo. El
// `type` sigue determinando la colision, la imagen es puramente visual.
const urlCache = new Map<string, HTMLImageElement>();

export function getObstacleImageByUrl(url: string): HTMLImageElement {
  let img = urlCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    urlCache.set(url, img);
  }
  return img;
}

export function borderColorFor(type: ObstacleType) {
  return BORDER_COLOR[type];
}

export function preloadObstacles() {
  (Object.keys(SOURCES) as ObstacleType[]).forEach(getObstacleImage);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Dibuja la imagen del obstáculo en modo "cover" (llena todo el rect,
// recortando el sobrante) y le agrega un borde de neón coherente con el
// resto de la interfaz.
export function drawObstacleTile(
  ctx: CanvasRenderingContext2D,
  obstacle: Pick<Obstacle, "type" | "w" | "h" | "imageUrl">,
  screenX: number,
  y: number
) {
  const { type, w, h, imageUrl } = obstacle;
  const img = imageUrl ? getObstacleImageByUrl(imageUrl) : getObstacleImage(type);

  ctx.save();
  if (type === "spike") {
    ctx.beginPath();
    ctx.moveTo(screenX, y + h);
    ctx.lineTo(screenX + w / 2, y);
    ctx.lineTo(screenX + w, y + h);
    ctx.closePath();
  } else {
    roundRect(ctx, screenX, y, w, h, 6);
  }
  ctx.clip();

  if (img.complete && img.naturalWidth > 0) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = screenX + w / 2 - dw / 2;
    const dy = y + h / 2 - dh / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    // fallback mientras carga la imagen
    ctx.fillStyle = type === "spike" ? "#e53935" : type === "block" ? "#5c6bc0" : "#8d6e63";
    ctx.fillRect(screenX, y, w, h);
  }
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = borderColorFor(type);
  ctx.shadowColor = borderColorFor(type);
  ctx.shadowBlur = 6;
  if (type === "spike") {
    ctx.beginPath();
    ctx.moveTo(screenX, y + h);
    ctx.lineTo(screenX + w / 2, y);
    ctx.lineTo(screenX + w, y + h);
    ctx.closePath();
    ctx.stroke();
  } else {
    roundRect(ctx, screenX, y, w, h, 6);
    ctx.stroke();
  }
  ctx.restore();
}
