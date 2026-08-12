import Avatar from "./Avatar";
import CubePreview from "./CubePreview";
import { SELECTABLE_FACES, type FaceState } from "./avatars";

// Módulo de creación de avatar: el jugador elige su expresión de reposo
// (color se sigue asignando automáticamente por sala, como siempre). Solo
// depende del set de caras ya recortado de imagen/fernanfloo.png — no
// genera arte nuevo, compone lo que ya existe.
export default function AvatarCreator({
  color,
  value,
  onChange,
}: {
  color: string;
  value: FaceState;
  onChange: (state: FaceState) => void;
}) {
  return (
    <div>
      <div className="label" style={{ marginTop: 0 }}>
        Tu avatar
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <CubePreview color={color} faceState={value} size={72} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1 }}>
          {SELECTABLE_FACES.map(({ state, label }) => (
            <button
              key={state}
              type="button"
              onClick={() => onChange(state)}
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
                  boxShadow: value === state ? `0 0 0 2px ${color}` : "0 0 0 2px transparent",
                  transition: "box-shadow 0.15s",
                }}
              >
                <Avatar color={value === state ? color : "#333"} state={state} size={36} />
              </span>
              <span style={{ fontSize: 10, color: value === state ? "var(--geo-text)" : "var(--geo-text-dim)" }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
