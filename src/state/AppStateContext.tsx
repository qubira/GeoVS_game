import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { RoomDTO, LevelSummary, Scene, SceneName } from "../types";
import type { Account } from "../network/auth";

interface AppStateValue {
  playerName: string | null;
  setPlayerName: (name: string | null) => void;
  account: Account | null;
  setAccount: (account: Account | null) => void;
  room: RoomDTO | null;
  setRoom: React.Dispatch<React.SetStateAction<RoomDTO | null>>;
  myPlayerId: string | null;
  setMyPlayerId: (id: string | null) => void;
  levels: LevelSummary[];
  setLevels: (levels: LevelSummary[]) => void;
  scene: Scene;
  navigate: (name: SceneName, params?: any) => void;
}

const AppContext = createContext<AppStateValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [scene, setScene] = useState<Scene>({ name: "bootstrap", params: {} });

  const navigate = useCallback((name: SceneName, params: any = {}) => setScene({ name, params }), []);

  const value: AppStateValue = {
    playerName,
    setPlayerName,
    account,
    setAccount,
    room,
    setRoom,
    myPlayerId,
    setMyPlayerId,
    levels,
    setLevels,
    scene,
    navigate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState debe usarse dentro de <AppProvider>");
  return ctx;
}
