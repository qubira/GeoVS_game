import type { FaceState } from "../components/avatars";

const KEY = "geovs_avatar_face_v1";

export function saveAvatarFace(face: FaceState) {
  localStorage.setItem(KEY, face);
}

export function loadAvatarFace(): FaceState {
  const raw = localStorage.getItem(KEY);
  return (raw as FaceState) || "neutral";
}
