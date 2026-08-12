// Espejo EXACTO de MOVIL/GeoVS/server/src/config.js y client/src/config.js.
// Estos valores de PHYSICS deben coincidir con el servidor para que la
// predicción local del jugador propio no diverja de la simulación
// autoritativa (ver network/Reconciliation.ts).
export const PHYSICS = {
  GRAVITY: 2600,
  JUMP_VELOCITY: -900,
  MAX_FALL_SPEED: 1800,
  SPEED_X: 420,
  PLAYER_SIZE: 40,
  GROUND_Y: 500,
};

export const WORLD = {
  WIDTH: 960,
  HEIGHT: 540,
};

export const RENDER = {
  CAMERA_OFFSET_X: 220,
  INTERP_DELAY_MS: 100,
};

const DEFAULT_SERVER_URL = "http://localhost:3001";

export const NETWORK = {
  SERVER_URL: import.meta.env.VITE_SERVER_URL || DEFAULT_SERVER_URL,
};
