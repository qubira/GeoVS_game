import { useAppState } from "./state/AppStateContext";
import BootstrapScreen from "./screens/BootstrapScreen";
import LoginScreen from "./screens/LoginScreen";
import LobbyListScreen from "./screens/LobbyListScreen";
import RoomBrowserScreen from "./screens/RoomBrowserScreen";
import RoomWaitingScreen from "./screens/RoomWaitingScreen";
import GameScreen from "./screens/GameScreen";
import ResultsScreen from "./screens/ResultsScreen";
import AvatarPreview from "./screens/AvatarPreview";

export default function App() {
  const { scene } = useAppState();

  if (new URLSearchParams(window.location.search).has("avatars")) {
    return <AvatarPreview />;
  }

  switch (scene.name) {
    case "bootstrap":
      return <BootstrapScreen />;
    case "login":
      return <LoginScreen />;
    case "lobbyList":
      return <LobbyListScreen />;
    case "roomBrowser":
      return <RoomBrowserScreen />;
    case "roomWaiting":
      return <RoomWaitingScreen />;
    case "game":
      return <GameScreen params={scene.params} />;
    case "results":
      return <ResultsScreen params={scene.params} />;
    default:
      return null;
  }
}
