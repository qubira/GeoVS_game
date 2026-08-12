import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme.css";
import App from "./App";
import { AppProvider } from "./state/AppStateContext";
import { preloadFaces } from "./components/avatars";
import { preloadObstacles } from "./components/obstacles";

preloadFaces();
preloadObstacles();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);
