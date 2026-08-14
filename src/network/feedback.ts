import { NETWORK } from "../config";

// Comentarios/sugerencias que un jugador deja desde su perfil (ver
// ProfileModal.tsx) — el panel los lee en la "Bandeja de comentarios".
export function sendFeedback(token: string, text: string) {
  return fetch(`${NETWORK.SERVER_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text }),
  })
    .then(async (res) => ({ status: res.status, body: (await res.json().catch(() => ({}))) as { ok: boolean; error?: string } }))
    .catch(() => ({ status: 0, body: { ok: false, error: "NETWORK_ERROR" } as { ok: boolean; error?: string } }));
}
