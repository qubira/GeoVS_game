import { useEffect, useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { loadToken, updateProfile } from "../network/auth";
import { sendFeedback } from "../network/feedback";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_IN_USE: "Ese correo ya está en uso. Prueba con otro.",
  USERNAME_IN_USE: "Ese nombre de usuario ya está en uso. Prueba con otro.",
  INVALID_EMAIL: "Ese correo no es válido.",
  INVALID_USERNAME: "El usuario debe tener 3-20 caracteres (letras, números, _).",
  INVALID_PASSWORD: "La contraseña debe tener al menos 6 caracteres.",
  INVALID_AGE: "Ingresa una edad válida.",
};

const ROLE_LABELS: Record<string, string> = {
  player: "Jugador",
  developer: "Desarrollador",
  moderator: "Moderador",
  admin: "Administrador",
};

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { account, setAccount, setPlayerName } = useAppState();
  const [email, setEmail] = useState(account?.email || "");
  const [username, setUsername] = useState(account?.username || "");
  const [age, setAge] = useState(String(account?.age ?? ""));
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [comment, setComment] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [commentSent, setCommentSent] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!account) return null;

  const onSendComment = async () => {
    const text = comment.trim();
    if (!text) return;
    const token = loadToken();
    if (!token) return;
    setCommentSending(true);
    setCommentError("");
    setCommentSent(false);
    const { status } = await sendFeedback(token, text);
    setCommentSending(false);
    if (status !== 201) {
      setCommentError("No se pudo enviar el comentario.");
      return;
    }
    setComment("");
    setCommentSent(true);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const token = loadToken();
    if (!token) return;

    const patch: Record<string, string | number> = {};
    if (email.trim() !== account.email) patch.email = email.trim();
    if (username.trim() !== account.username) patch.username = username.trim();
    if (String(age) !== String(account.age)) patch.age = Number(age);
    if (password.trim()) patch.password = password.trim();

    if (Object.keys(patch).length === 0) {
      setSuccess("No hay cambios para guardar.");
      return;
    }

    setSaving(true);
    try {
      const { status, body } = await updateProfile(token, patch);
      if (status !== 200 || !body.user) {
        setError(ERROR_MESSAGES[body.error || ""] || "No se pudo actualizar el perfil.");
        return;
      }
      setAccount(body.user);
      setPlayerName(body.user.username);
      setPassword("");
      setSuccess("Perfil actualizado.");
    } catch {
      setError("No se pudo conectar al servidor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="panel panel-glow modal-pop" onSubmit={onSave} style={{ maxWidth: 440, ["--panel-accent" as any]: "var(--geo-purple)" }}>
        <div className="row-between" style={{ marginBottom: 4 }}>
          <span className="font-display" style={{ fontSize: 19, fontWeight: 800 }}>
            Tu perfil
          </span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="subtitle" style={{ textAlign: "left", margin: "4px 0 16px" }}>
          Rol: <strong style={{ color: "var(--geo-text)" }}>{ROLE_LABELS[account.role] || account.role}</strong>
        </p>

        <div className="label" style={{ marginTop: 0 }}>
          Correo
        </div>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <div className="label">Usuario</div>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} required />

        <div className="label">Edad</div>
        <input className="input" type="number" value={age} onChange={(e) => setAge(e.target.value)} min={5} max={100} required />

        <div className="label">Nueva contraseña (opcional)</div>
        <input
          className="input"
          type="password"
          placeholder="Dejar en blanco para no cambiarla"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 8 }}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        {!!error && <p className="error-text">{error}</p>}
        {!!success && <p style={{ color: "var(--geo-cyan)", textAlign: "center", fontSize: 13, marginTop: 10 }}>{success}</p>}

        <div style={{ borderTop: "1px solid var(--geo-border)", margin: "18px 0 12px" }} />

        <div className="label" style={{ marginTop: 0 }}>
          💬 Sugerencias / comentarios
        </div>
        <p className="subtitle" style={{ textAlign: "left", margin: "0 0 8px", fontSize: 12 }}>
          ¿Algo que quieras contarnos? Un admin lo va a leer.
        </p>
        <textarea
          className="input"
          rows={3}
          maxLength={1000}
          placeholder="Escribe tu comentario..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ resize: "vertical", fontFamily: "inherit" }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={commentSending || !comment.trim()}
          onClick={onSendComment}
          style={{ marginTop: 4 }}
        >
          {commentSending ? "Enviando..." : "Enviar comentario"}
        </button>
        {!!commentError && <p className="error-text">{commentError}</p>}
        {commentSent && <p style={{ color: "var(--geo-cyan)", textAlign: "center", fontSize: 13, marginTop: 8 }}>¡Gracias! Tu comentario fue enviado.</p>}
      </form>
    </div>
  );
}
