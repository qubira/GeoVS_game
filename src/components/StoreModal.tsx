import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { loadAvatarFace, saveAvatarFace, loadAvatarImageUrl, saveAvatarImageUrl } from "../network/avatarPrefs";
import AvatarCreator from "./AvatarCreator";
import type { FaceState } from "./avatars";

const PREVIEW_COLOR = "#22d3ee";

// "Tienda" de avatares: reutiliza el mismo AvatarCreator del registro para
// que el jugador pueda cambiar de avatar en cualquier momento antes de
// jugar (incluye los avatares personalizados subidos desde GeoVS_Control,
// ver AvatarCreator -> GET /content/custom-avatars). Al guardar, se
// re-manda player:identify por el socket ya conectado para que el server
// tenga el avatar nuevo listo para la proxima sala que cree/una el jugador.
export default function StoreModal({ onClose, onChanged }: { onClose: () => void; onChanged: (face: FaceState, avatarImageUrl: string | null) => void }) {
  const [face, setFace] = useState<FaceState>(loadAvatarFace);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(loadAvatarImageUrl);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function onSave() {
    setSaving(true);
    setSuccess("");
    try {
      saveAvatarFace(face);
      saveAvatarImageUrl(avatarImageUrl);
      await socketClient.updateAvatar(face, avatarImageUrl);
      onChanged(face, avatarImageUrl);
      setSuccess("Avatar actualizado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel panel-glow modal-pop" style={{ maxWidth: 480, ["--panel-accent" as any]: "var(--geo-yellow)" }}>
        <div className="row-between" style={{ marginBottom: 4 }}>
          <span className="font-display" style={{ fontSize: 19, fontWeight: 800 }}>
            🛒 Tienda de avatares
          </span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="subtitle" style={{ textAlign: "left", margin: "4px 0 16px" }}>
          Elige tu avatar para las próximas partidas. Se ve igual en la sala de espera y dentro del juego.
        </p>

        <AvatarCreator
          color={PREVIEW_COLOR}
          value={face}
          onChange={setFace}
          avatarImageUrl={avatarImageUrl}
          onChangeAvatarImageUrl={setAvatarImageUrl}
        />

        <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{ marginTop: 16 }}>
          {saving ? "Guardando..." : "Usar este avatar"}
        </button>
        {!!success && <p style={{ color: "var(--geo-cyan)", textAlign: "center", fontSize: 13, marginTop: 10 }}>{success}</p>}
      </div>
    </div>
  );
}
