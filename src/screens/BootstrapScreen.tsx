import { useEffect } from "react";
import { socketClient } from "../network/SocketClient";
import { loadSession, clearSession } from "../network/session";
import { loadToken, clearToken, fetchMe } from "../network/auth";
import { loadAvatarFace, loadAvatarImageUrl } from "../network/avatarPrefs";
import { useAppState } from "../state/AppStateContext";

// Primera pantalla: valida si hay una sesion de cuenta guardada (token) y,
// de haberla, si ademas hay una sala a medio jugar (recarga de pagina en
// pleno partido) antes de decidir a donde navegar.
export default function BootstrapScreen() {
  const { setPlayerName, setAccount, setRoom, setMyPlayerId, navigate, addPendingWarnings } = useAppState();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = loadToken();
      if (!token) {
        socketClient.bootstrapped = true;
        return navigate("auth");
      }

      const me = await fetchMe(token);
      // Se entrega ANTES de mirar `cancelled` y a proposito fuera del bloque
      // de abajo: el servidor ya marco estas alertas como entregadas al
      // responder (ver deliverPendingWarnings), asi que si este efecto
      // resulta ser el que React descarta (p. ej. el doble-montaje de
      // StrictMode en desarrollo, o cualquier remontaje real), la alerta ya
      // se habria consumido en el servidor sin llegar a mostrarse nunca si
      // se descartaba aca tambien.
      addPendingWarnings(me.body.pendingWarnings || []);
      if (cancelled) return;
      if (me.status !== 200 || !me.body.user) {
        clearToken();
        socketClient.bootstrapped = true;
        return navigate("auth");
      }
      const account = me.body.user;
      setAccount(account);

      socketClient.connect();
      await socketClient.onceConnected();
      if (cancelled) return;

      const idResult = await socketClient.identify(account.username, loadAvatarFace(), token, loadAvatarImageUrl());
      if (cancelled) return;
      if (!idResult?.ok) {
        socketClient.bootstrapped = true;
        return navigate("auth");
      }
      setPlayerName(account.username);

      const session = loadSession();
      if (!session) {
        socketClient.bootstrapped = true;
        return navigate("lobbyList");
      }

      const rejoinResult = await socketClient.rejoinRoom(session.roomCode, session.myPlayerId);
      if (cancelled) return;
      socketClient.bootstrapped = true;

      if (!rejoinResult?.ok) {
        clearSession();
        return navigate("lobbyList");
      }

      setRoom(rejoinResult.room);
      setMyPlayerId(session.myPlayerId);

      if (rejoinResult.room.state === "playing" && rejoinResult.gameStart) {
        navigate("game", rejoinResult.gameStart);
      } else {
        navigate("roomWaiting");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="screen">
      <div style={{ textAlign: "center" }}>
        <div className="font-display" style={{ fontSize: 22, marginBottom: 8 }}>
          Geo<span style={{ color: "var(--geo-cyan)" }}>VS</span>
        </div>
        <p style={{ color: "var(--geo-text-dim)" }}>Conectando...</p>
      </div>
    </div>
  );
}
