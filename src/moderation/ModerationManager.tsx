import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { clearToken } from "../network/auth";
import { clearSession } from "../network/session";
import { useAppState } from "../state/AppStateContext";

const OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(10,11,30,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// Vive a nivel de App (como VoiceChatManager) — un bloqueo puede llegar en
// cualquier pantalla mientras se esta jugando, y una alerta pendiente puede
// venir tanto del login como de la pantalla de resultados.
export default function ModerationManager() {
  const { pendingWarnings, dismissPendingWarning, navigate } = useAppState();
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    const onBlocked = ({ reason }: { reason?: string } = {}) => {
      setBlockedReason(reason || "Tu cuenta fue bloqueada.");
    };
    socketClient.on("account:blocked", onBlocked);
    return () => socketClient.off("account:blocked", onBlocked);
  }, []);

  const onAcknowledgeBlock = () => {
    clearToken();
    clearSession();
    setBlockedReason(null);
    navigate("auth");
  };

  if (blockedReason) {
    return (
      <div style={OVERLAY_STYLE}>
        <div className="panel" style={{ maxWidth: 380, textAlign: "center" }}>
          <h2 className="font-display title" style={{ fontSize: 20, color: "var(--geo-pink)" }}>
            Cuenta bloqueada
          </h2>
          <p className="subtitle">{blockedReason}</p>
          <button className="btn btn-primary" onClick={onAcknowledgeBlock} style={{ width: "100%" }}>
            Entendido
          </button>
        </div>
      </div>
    );
  }

  if (pendingWarnings.length > 0) {
    const warning = pendingWarnings[0];
    return (
      <div style={OVERLAY_STYLE}>
        <div className="panel" style={{ maxWidth: 380, textAlign: "center" }}>
          <h2 className="font-display title" style={{ fontSize: 20 }}>
            ⚠️ Llamado de atención
          </h2>
          <p className="subtitle">Motivo: {warning.reasonLabel}</p>
          {warning.messageText && (
            <p style={{ fontStyle: "italic", color: "var(--geo-text-dim)", fontSize: 13 }}>"{warning.messageText}"</p>
          )}
          <button className="btn btn-secondary" onClick={() => dismissPendingWarning(warning.id)} style={{ width: "100%", marginTop: 10 }}>
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return null;
}
