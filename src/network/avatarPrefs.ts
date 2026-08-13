import type { FaceState } from "../components/avatars";

const KEY = "geovs_avatar_face_v1";
const IMAGE_KEY = "geovs_avatar_image_v1";

export function saveAvatarFace(face: FaceState) {
  localStorage.setItem(KEY, face);
}

export function loadAvatarFace(): FaceState {
  const raw = localStorage.getItem(KEY);
  return (raw as FaceState) || "neutral";
}

// Avatar cubo personalizado elegido (URL de imagen subida desde el panel).
// null = usa el set de caras integrado de siempre (ver avatars.ts).
export function saveAvatarImageUrl(url: string | null) {
  if (url) localStorage.setItem(IMAGE_KEY, url);
  else localStorage.removeItem(IMAGE_KEY);
}

export function loadAvatarImageUrl(): string | null {
  return localStorage.getItem(IMAGE_KEY);
}
