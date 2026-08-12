import { useState } from "react";
import { socketClient } from "../network/SocketClient";
import { useAppState } from "../state/AppStateContext";
import AvatarCreator from "../components/AvatarCreator";
import { loadAvatarFace, saveAvatarFace } from "../network/avatarPrefs";
import type { FaceState } from "../components/avatars";

// Color solo de vista previa: el color real lo asigna el servidor al entrar
// a una sala (ver Room.addPlayer). Aquí es una referencia neutra para que el
// jugador vea cómo se ve su expresión en el cubo antes de jugar.
const PREVIEW_COLOR = "#22d3ee";

export default function LoginScreen() {
  const { setPlayerName, navigate } = useAppState();
  const [name, setName] = useState("");
  const [face, setFace] = useState<FaceState>(loadAvatarFace);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setLoading(true);
    setError("");
    try {
      socketClient.connect();
      await socketClient.onceConnected();
      const result = await socketClient.identify(clean, face);
      if (!result?.ok) {
        setError("No se pudo conectar al servidor.");
        return;
      }
      saveAvatarFace(face);
      setPlayerName(clean);
      navigate("lobbyList");
    } catch {
      setError("No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <form className="panel" onSubmit={onSubmit}>
        <h1 className="font-display title">
          Geo<span style={{ color: "var(--geo-cyan)" }}>VS</span>
        </h1>
        <p className="subtitle">Escribe tu nombre y elige tu avatar</p>

        <input
          className="input"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          autoFocus
        />

        <AvatarCreator color={PREVIEW_COLOR} value={face} onChange={setFace} />

        <button className="btn btn-primary" type="submit" disabled={loading || !name.trim()} style={{ marginTop: 4 }}>
          {loading ? "Conectando..." : "Entrar"}
        </button>
        {!!error && <p className="error-text">{error}</p>}
      </form>
    </div>
  );
}
