export type AccountRole = "player" | "developer" | "moderator" | "admin";

export interface PlayerLobbyDTO {
  id: string;
  name: string;
  color: string;
  faceState: import("./components/avatars").FaceState;
  country: string | null;
  countryCode: string | null;
  role: AccountRole | null;
  ready: boolean;
  connected: boolean;
}

export interface RoomDTO {
  code: string;
  hostId: string | null;
  levelId: string;
  mode: "race" | "elimination";
  maxPlayers: number;
  state: "lobby" | "countdown" | "playing" | "finished";
  players: PlayerLobbyDTO[];
}

export interface RoomSummaryDTO {
  code: string;
  mode: "race" | "elimination";
  levelId: string;
  state: "lobby" | "countdown" | "playing" | "finished";
  maxPlayers: number;
  players: PlayerLobbyDTO[];
}

export interface LevelSummary {
  id: string;
  name: string;
  length: number;
}

export interface GameStartPayload {
  levelId: string;
  levelData: import("./game/PhysicsEngine").Level;
  mode: "race" | "elimination";
  tickRate: number;
  serverStartTime: number;
}

export interface RoundResult {
  playerId: string;
  name: string;
  progress: number;
  time: number | null;
  status: "finished" | "eliminated" | "in-progress" | "disconnected";
  place: number;
}

export interface RoundEndedPayload {
  reason: string;
  results: RoundResult[];
}

export type SceneName = "bootstrap" | "auth" | "lobbyList" | "roomWaiting" | "game" | "results";

export interface Scene {
  name: SceneName;
  params: any;
}
