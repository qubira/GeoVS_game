// Caras recortadas de imagen/fernanfloo.png (ver imagen/extract_faces.py),
// servidas desde public/avatars. Un solo personaje de referencia: todos los
// jugadores usan la misma cara, diferenciados por el color de su cubo y por
// la expresión que cada uno elige como su "look" (ver AvatarCreator.tsx).
export type FaceState = "neutral" | "happy" | "dizzy" | "angry" | "sad";

const SOURCES: Record<FaceState, string> = {
  neutral: "/avatars/face_neutral.png",
  happy: "/avatars/face_happy.png",
  dizzy: "/avatars/face_dizzy.png",
  angry: "/avatars/face_angry.png",
  sad: "/avatars/face_sad.png",
};

// "dizzy" queda reservada como reacción a morir/ser eliminado — no es una
// expresión elegible como look permanente.
export const SELECTABLE_FACES: { state: FaceState; label: string }[] = [
  { state: "neutral", label: "Tranquilo" },
  { state: "happy", label: "Alegre" },
  { state: "angry", label: "Intenso" },
  { state: "sad", label: "Sensible" },
];

const cache = new Map<FaceState, HTMLImageElement>();

export function getFaceImage(state: FaceState): HTMLImageElement {
  let img = cache.get(state);
  if (!img) {
    img = new Image();
    img.src = SOURCES[state];
    cache.set(state, img);
  }
  return img;
}

// Precarga todas las variantes para que no falten frames al cambiar de
// estado en pleno juego.
export function preloadFaces() {
  (Object.keys(SOURCES) as FaceState[]).forEach(getFaceImage);
}

// `base` es el look elegido por el jugador (ver AvatarCreator); se muestra
// mientras está vivo y en juego, pero se reemplaza por una reacción cuando
// termina o muere.
export function faceForStatus(
  opts: { dead?: boolean; eliminated?: boolean; finished?: boolean },
  base: FaceState = "neutral"
): FaceState {
  if (opts.finished) return "happy";
  if (opts.dead || opts.eliminated) return "dizzy";
  return base;
}

export const AVATAR_SRC = SOURCES;
