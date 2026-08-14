import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { RoomDTO, LevelSummary, Scene, SceneName, PendingWarning } from "../types";
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
  // Alertas de moderacion sin mostrar todavia (ver ModerationManager.tsx) —
  // cola global porque se pueden alimentar desde el login O desde la
  // pantalla de resultados de fin de partida, no una sola.
  pendingWarnings: PendingWarning[];
  addPendingWarnings: (warnings: PendingWarning[]) => void;
  dismissPendingWarning: (id: string) => void;
}

const AppContext = createContext<AppStateValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [scene, setScene] = useState<Scene>({ name: "bootstrap", params: {} });
  const [pendingWarnings, setPendingWarnings] = useState<PendingWarning[]>([]);

  const navigate = useCallback((name: SceneName, params: any = {}) => setScene({ name, params }), []);
  const addPendingWarnings = useCallback((warnings: PendingWarning[]) => {
    if (!warnings.length) return;
    setPendingWarnings((prev) => [...prev, ...warnings]);
  }, []);
  const dismissPendingWarning = useCallback((id: string) => {
    setPendingWarnings((prev) => prev.filter((w) => w.id !== id));
  }, []);

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
    pendingWarnings,
    addPendingWarnings,
    dismissPendingWarning,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState debe usarse dentro de <AppProvider>");
  return ctx;
}
