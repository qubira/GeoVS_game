import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import CubePreview from "./CubePreview";
import { SELECTABLE_FACES, type FaceState } from "./avatars";
import { NETWORK } from "../config";

interface CustomAvatarOption {
  id: string;
  name: string;
  imageUrl: string;
}

// Módulo de creación de avatar: el jugador elige su expresión de reposo
// (color se sigue asignando automáticamente por sala, como siempre) o, si
// hay avatares cubo subidos desde el panel de administración (ver
// GeoVS_Control -> módulo Crear), puede elegir uno de esos en su lugar.
export default function AvatarCreator({
  color,
  value,
  onChange,
  avatarImageUrl,
  onChangeAvatarImageUrl,
}: {
  color: string;
  value: FaceState;
  onChange: (state: FaceState) => void;
  avatarImageUrl?: string | null;
  onChangeAvatarImageUrl?: (url: string | null) => void;
}) {
  const [customAvatars, setCustomAvatars] = useState<CustomAvatarOption[]>([]);

  useEffect(() => {
    fetch(`${NETWORK.SERVER_URL}/content/custom-avatars`)
      .then((r) => r.json())
      .then((body) => setCustomAvatars(body?.avatars || []))
      .catch(() => setCustomAvatars([]));
  }, []);

  return (
    <div>
      <div className="label" style={{ marginTop: 0 }}>
        Tu avatar
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <CubePreview color={color} faceState={value} avatarImageUrl={avatarImageUrl} size={72} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1 }}>
          {SELECTABLE_FACES.map(({ state, label }) => (
            <button
              key={state}
              type="button"
              onClick={() => {
                onChange(state);
                onChangeAvatarImageUrl?.(null);
              }}
              title={label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  borderRadius: "999px",
                  padding: 2,
                  boxShadow: !avatarImageUrl && value === state ? `0 0 0 2px ${color}` : "0 0 0 2px transparent",
                  transition: "box-shadow 0.15s",
                }}
              >
                <Avatar color={!avatarImageUrl && value === state ? color : "#333"} state={state} size={36} />
              </span>
              <span style={{ fontSize: 10, color: !avatarImageUrl && value === state ? "var(--geo-text)" : "var(--geo-text-dim)" }}>
                {label}
              </span>
            </button>
          ))}

          {customAvatars.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onChangeAvatarImageUrl?.(a.imageUrl)}
              title={a.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  borderRadius: "999px",
                  padding: 2,
                  boxShadow: avatarImageUrl === a.imageUrl ? `0 0 0 2px ${color}` : "0 0 0 2px transparent",
                  transition: "box-shadow 0.15s",
                }}
              >
                <Avatar color={avatarImageUrl === a.imageUrl ? color : "#333"} imageUrl={a.imageUrl} size={36} />
              </span>
              <span style={{ fontSize: 10, color: avatarImageUrl === a.imageUrl ? "var(--geo-text)" : "var(--geo-text-dim)" }}>
                {a.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
