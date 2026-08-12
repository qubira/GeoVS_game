# GeoVS — Juego (web)

Versión web del multijugador GeoVS (estilo Geometry Dash, salas en tiempo
real). Construida con Vite + React + TypeScript y Canvas 2D. Se conecta al
mismo servidor Socket.io que ya usa la app móvil — no hay backend propio en
esta carpeta.

## Requisitos

El servidor multijugador vive en `MOVIL/GeoVS/server`. Debe estar corriendo
para que el juego funcione:

```bash
cd C:/PROYECTOS/MOVIL/GeoVS/server
npm install
npm run dev
```

Por defecto escucha en `http://localhost:3001` (CORS abierto a cualquier
origen, así que el cliente web se conecta sin configuración adicional).

## Correr el juego localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

Si el servidor corre en otra URL (por ejemplo ya desplegado), define
`VITE_SERVER_URL` en un `.env.local`:

```
VITE_SERVER_URL=https://tu-servidor.example.com
```

## Controles

- Espacio / flecha arriba, o clic/touch sobre el canvas: saltar (mantener
  presionado = seguir saltando al aterrizar, igual que en la versión móvil).

## Estructura

```
src/
  config.ts              Física, mundo, red (espejo de MOVIL/GeoVS/client/src/config.js)
  theme.css               Paleta neón de GeoVS
  game/PhysicsEngine.ts   Simulación de física (espejo exacto del servidor)
  network/
    SocketClient.ts        Wrapper de socket.io-client
    Interpolation.ts        Buffer de interpolación para jugadores remotos
    Reconciliation.ts       Predicción + reconciliación del jugador propio
    session.ts               Persistencia de sesión (localStorage)
  state/AppStateContext.tsx Estado global + "router" de escenas
  screens/                 Bootstrap → Login → LobbyList → RoomWaiting → Game → Results
  components/PlayerCube.ts  Dibujo del personaje en Canvas (cara procedural, sin sprites aún)
```

## Pendiente

- El personaje se dibuja como un cubo con cara diseñada por código, no como
  recorte de `imagen/fernanfloo.png`. Para sprites reales hace falta preparar
  esas poses con fondo transparente (herramienta de edición de imagen).
- Sonidos (`public/sounds/`) copiados del proyecto móvil.
