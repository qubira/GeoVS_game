import { useState } from "react";
import Avatar from "../components/Avatar";
import CubePreview from "../components/CubePreview";
import AvatarCreator from "../components/AvatarCreator";
import type { FaceState } from "../components/avatars";

const STATES: { state: FaceState; label: string }[] = [
  { state: "neutral", label: "neutral (vivo)" },
  { state: "happy", label: "happy (meta / listo)" },
  { state: "dizzy", label: "dizzy (muerto / eliminado)" },
  { state: "angry", label: "angry (elegible)" },
  { state: "sad", label: "sad (elegible)" },
];

const COLORS = ["#ff5252", "#4fc3f7", "#69f0ae", "#ffd54f", "#ba68c8", "#ff8a65"];

// Pantalla de depuración: /?avatars — todas las variantes del avatar y el
// módulo creador en aislamiento, sin pasar por login/lobby/sala.
export default function AvatarPreview() {
  const [face, setFace] = useState<FaceState>("neutral");
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

  return (
    <div className="screen" style={{ justifyContent: "flex-start", paddingTop: 40 }}>
      <div style={{ width: "100%", maxWidth: 900 }}>
        <h1 className="font-display" style={{ marginBottom: 4 }}>
          Vista previa de avatares
        </h1>
        <p style={{ color: "var(--geo-text-dim)", marginBottom: 24, fontSize: 13 }}>
          <code>localhost:5173/?avatars</code> — recarga la página después de cada cambio en{" "}
          <code>PlayerCube.ts</code> / <code>Avatar.tsx</code> / <code>public/avatars/*.png</code>.
        </p>

        <h2 className="font-display" style={{ fontSize: 16, marginBottom: 10 }}>
          Módulo creador (el que se usa en Login)
        </h2>
        <div className="panel" style={{ maxWidth: 480, marginBottom: 32 }}>
          <AvatarCreator
            color="#22d3ee"
            value={face}
            onChange={setFace}
            avatarImageUrl={avatarImageUrl}
            onChangeAvatarImageUrl={setAvatarImageUrl}
          />
        </div>

        <h2 className="font-display" style={{ fontSize: 16, marginBottom: 10 }}>
          Círculo (lobby / HUD / resultados) — por estado y color
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
          {STATES.map(({ state, label }) => (
            <div key={state} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 170, fontSize: 12, color: "var(--geo-text-dim)" }}>{label}</span>
              {COLORS.map((c) => (
                <Avatar key={c} color={c} state={state} size={40} />
              ))}
            </div>
          ))}
        </div>

        <h2 className="font-display" style={{ fontSize: 16, marginBottom: 10 }}>
          Cubo real de juego (Canvas) — por estado y color
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, paddingBottom: 40 }}>
          {(["neutral", "happy", "dizzy", "angry", "sad"] as FaceState[]).map((state) =>
            COLORS.slice(0, 4).map((c) => (
              <div key={state + c} style={{ textAlign: "center" }}>
                <CubePreview faceState={state} color={c} size={100} />
                <div style={{ fontSize: 10, color: "var(--geo-text-dim)", marginTop: 4 }}>{state}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
