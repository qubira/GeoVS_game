import { useEffect } from "react";
import { socketClient } from "../network/SocketClient";
import { loadSession, clearSession } from "../network/session";
import { useAppState } from "../state/AppStateContext";

// Primera pantalla: intenta restaurar una sesión guardada (recarga de página
// a mitad de partida) antes de decidir si vamos a Login o directo a la sala.
export default function BootstrapScreen() {
  const { setPlayerName, setRoom, setMyPlayerId, navigate } = useAppState();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      socketClient.connect();
      await socketClient.onceConnected();
      if (cancelled) return;

      const session = loadSession();
      if (!session) {
        socketClient.bootstrapped = true;
        return navigate("login");
      }

      const idResult = await socketClient.identify(session.playerName);
      if (cancelled) return;
      if (!idResult?.ok) {
        clearSession();
        socketClient.bootstrapped = true;
        return navigate("login");
      }

      const rejoinResult = await socketClient.rejoinRoom(session.roomCode, session.myPlayerId);
      if (cancelled) return;
      socketClient.bootstrapped = true;

      if (!rejoinResult?.ok) {
        clearSession();
        return navigate("login");
      }

      setPlayerName(session.playerName);
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
