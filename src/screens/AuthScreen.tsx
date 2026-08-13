import { useState } from "react";
import { socketClient } from "../network/SocketClient";
import { useAppState } from "../state/AppStateContext";
import { register, login, saveToken } from "../network/auth";
import AvatarCreator from "../components/AvatarCreator";
import { loadAvatarFace, saveAvatarFace, loadAvatarImageUrl, saveAvatarImageUrl } from "../network/avatarPrefs";
import type { FaceState } from "../components/avatars";

const PREVIEW_COLOR = "#22d3ee";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_IN_USE: "Ese correo ya está en uso. Prueba con otro o inicia sesión.",
  USERNAME_IN_USE: "Ese nombre de usuario ya está en uso. Prueba con otro.",
  INVALID_EMAIL: "Ese correo no es válido.",
  INVALID_USERNAME: "El usuario debe tener 3-20 caracteres (letras, números, _).",
  INVALID_PASSWORD: "La contraseña debe tener al menos 6 caracteres.",
  INVALID_AGE: "Ingresa una edad válida.",
  INVALID_CREDENTIALS: "Usuario o contraseña incorrectos.",
  ACCOUNT_BLOCKED: "Esta cuenta está bloqueada.",
};

export default function AuthScreen() {
  const { setPlayerName, setAccount, navigate } = useAppState();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [face, setFace] = useState<FaceState>(loadAvatarFace);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(loadAvatarImageUrl);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function enterGame(token: string, accountUsername: string) {
    saveToken(token);
    socketClient.connect();
    await socketClient.onceConnected();
    const result = await socketClient.identify(accountUsername, face, token, avatarImageUrl);
    if (!result?.ok) {
      setError("No se pudo conectar al servidor.");
      return false;
    }
    saveAvatarFace(face);
    saveAvatarImageUrl(avatarImageUrl);
    setPlayerName(accountUsername);
    navigate("lobbyList");
    return true;
  }

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { status, body } = await login({ username: username.trim(), password });
      if (status !== 200 || !body.token || !body.user) {
        setError(ERROR_MESSAGES[body.error || ""] || "No se pudo iniciar sesión.");
        return;
      }
      setAccount(body.user);
      await enterGame(body.token, body.user.username);
    } catch {
      setError("No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ageNum = Number(age);
    if (!ageNum || ageNum < 5 || ageNum > 100) {
      setError(ERROR_MESSAGES.INVALID_AGE);
      return;
    }
    setLoading(true);
    try {
      const { status, body } = await register({
        email: email.trim(),
        username: username.trim(),
        password,
        age: ageNum,
      });
      if (status !== 201 || !body.token || !body.user) {
        setError(ERROR_MESSAGES[body.error || ""] || "No se pudo crear la cuenta.");
        return;
      }
      setAccount(body.user);
      await enterGame(body.token, body.user.username);
    } catch {
      setError("No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <form className="panel" onSubmit={mode === "login" ? onLogin : onRegister} style={{ maxWidth: 440 }}>
        <h1 className="font-display title">
          Geo<span style={{ color: "var(--geo-cyan)" }}>VS</span>
        </h1>
        <p className="subtitle">{mode === "login" ? "Inicia sesión para jugar" : "Crea tu cuenta de GeoVS"}</p>

        <div className="row" style={{ justifyContent: "center", marginBottom: 18 }}>
          <button
            type="button"
            className={`chip ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={`chip ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Crear cuenta
          </button>
        </div>

        {mode === "register" && (
          <input
            className="input"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}

        <input
          className="input"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          autoCapitalize="none"
          required
        />

        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {mode === "register" && (
          <>
            <input
              className="input"
              type="number"
              placeholder="Edad"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={5}
              max={100}
              required
            />
            <AvatarCreator
              color={PREVIEW_COLOR}
              value={face}
              onChange={setFace}
              avatarImageUrl={avatarImageUrl}
              onChangeAvatarImageUrl={setAvatarImageUrl}
            />
          </>
        )}

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? "Un momento..." : mode === "login" ? "Entrar" : "Crear cuenta y entrar"}
        </button>
        {!!error && <p className="error-text">{error}</p>}
      </form>
    </div>
  );
}
