// Persiste la membresía de sala actual para poder recuperar la sesión si la
// pestaña se recarga a mitad de partida. Equivalente web de
// MOVIL/GeoVS/client/src/network/session.js (AsyncStorage -> localStorage).
const KEY = "geovs_web_session_v1";

export interface Session {
  playerName: string;
  roomCode: string;
  myPlayerId: string;
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadSession(): Session | null {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
