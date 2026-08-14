import { useAppState } from "./state/AppStateContext";
import BootstrapScreen from "./screens/BootstrapScreen";
import AuthScreen from "./screens/AuthScreen";
import LobbyListScreen from "./screens/LobbyListScreen";
import RoomWaitingScreen from "./screens/RoomWaitingScreen";
import GameScreen from "./screens/GameScreen";
import ResultsScreen from "./screens/ResultsScreen";
import AvatarPreview from "./screens/AvatarPreview";
import VoiceChatManager from "./voice/VoiceChatManager";
import ModerationManager from "./moderation/ModerationManager";
import RoomEndedNotice from "./rooms/RoomEndedNotice";

export default function App() {
  const { scene } = useAppState();

  if (new URLSearchParams(window.location.search).has("avatars")) {
    return <AvatarPreview />;
  }

  return (
    <>
      {(() => {
        switch (scene.name) {
          case "bootstrap":
            return <BootstrapScreen />;
          case "auth":
            return <AuthScreen />;
          case "lobbyList":
            return <LobbyListScreen />;
          case "roomWaiting":
            return <RoomWaitingScreen />;
          case "game":
            return <GameScreen params={scene.params} />;
          case "results":
            return <ResultsScreen params={scene.params} />;
          default:
            return null;
        }
      })()}
      <VoiceChatManager />
      <ModerationManager />
      <RoomEndedNotice />
    </>
  );
}
