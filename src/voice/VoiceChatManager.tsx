import { useEffect, useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { voiceChat } from "./VoiceChat";

// Vive por encima de RoomWaitingScreen/GameScreen/ResultsScreen — el
// microfono acompaña toda la estadia en la sala (espera + partida +
// resultados), no una pantalla puntual, asi que se monta siempre en App.tsx
// y no dentro de una pantalla que se desmonta al cambiar de escena.
const ROOM_SCENES = new Set(["roomWaiting", "game", "results"]);

export default function VoiceChatManager() {
  const { room, myPlayerId, scene } = useAppState();
  const [micOn, setMicOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [micError, setMicError] = useState(false);

  // `room` en AppStateContext no se vuelve a poner en null al salir de la
  // sala (el resto de la app tampoco depende de eso, navega de escena y ya)
  // asi que la señal confiable de "sigo en una sala" es la escena actual, no
  // la presencia de `room` — de lo contrario la voz quedaria conectada para
  // siempre tras volver al lobby.
  const inRoomScene = ROOM_SCENES.has(scene.name);

  useEffect(() => {
    if (inRoomScene && room && myPlayerId) voiceChat.init(myPlayerId);
  }, [inRoomScene, room?.code, myPlayerId]);

  useEffect(() => {
    if (!inRoomScene || !room || !myPlayerId) return;
    voiceChat.syncPeers(room.players.map((p) => p.id));
  }, [inRoomScene, room, myPlayerId]);

  useEffect(() => {
    if (!inRoomScene) {
      voiceChat.destroy();
      setMicOn(false);
    }
  }, [inRoomScene]);

  useEffect(() => () => voiceChat.destroy(), []);

  if (!inRoomScene || !room) return null;

  const onToggleMic = async () => {
    setBusy(true);
    setMicError(false);
    const next = !micOn;
    const ok = await voiceChat.setMicEnabled(next);
    if (next && !ok) setMicError(true);
    setMicOn(ok ? next : voiceChat.isMicEnabled());
    setBusy(false);
  };

  return (
    <div style={{ position: "fixed", right: 14, bottom: 14, zIndex: 500, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      {micError && (
        <span style={{ fontSize: 11, background: "#7d2e2e", color: "#fff", padding: "4px 8px", borderRadius: 8 }}>
          No se pudo acceder al micrófono.
        </span>
      )}
      <button
        type="button"
        onClick={onToggleMic}
        disabled={busy}
        title={micOn ? "Silenciar micrófono" : "Activar micrófono"}
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          border: "none",
          cursor: busy ? "default" : "pointer",
          fontSize: 20,
          background: micOn ? "linear-gradient(135deg, var(--geo-cyan), var(--geo-blue))" : "rgba(255,255,255,0.12)",
          color: micOn ? "#0a0b1e" : "#fff",
          boxShadow: micOn ? "0 0 14px rgba(34,211,238,0.5)" : "none",
        }}
      >
        {micOn ? "🎤" : "🔇"}
      </button>
    </div>
  );
}
