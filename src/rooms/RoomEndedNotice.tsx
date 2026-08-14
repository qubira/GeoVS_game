import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { clearSession } from "../network/session";
import { useAppState } from "../state/AppStateContext";

// Vive a nivel de App (como VoiceChatManager/ModerationManager) — un admin
// puede finalizar la sala desde el panel en cualquier pantalla (espera,
// jugando, resultados), no solo desde una de ellas.
export default function RoomEndedNotice() {
  const { navigate } = useAppState();
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const onEnded = ({ reason }: { reason?: string } = {}) => {
      setReason(reason || "Un administrador finalizó esta sala.");
    };
    socketClient.on("room:endedByAdmin", onEnded);
    return () => socketClient.off("room:endedByAdmin", onEnded);
  }, []);

  if (!reason) return null;

  const onAcknowledge = () => {
    clearSession();
    setReason(null);
    navigate("lobbyList");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,11,30,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="panel" style={{ maxWidth: 380, textAlign: "center" }}>
        <h2 className="font-display title" style={{ fontSize: 20, color: "var(--geo-pink)" }}>
          Sala finalizada
        </h2>
        <p className="subtitle">{reason}</p>
        <button className="btn btn-primary" onClick={onAcknowledge} style={{ width: "100%" }}>
          Entendido
        </button>
      </div>
    </div>
  );
}
