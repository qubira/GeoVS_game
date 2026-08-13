import { useEffect, useRef } from "react";
import { drawPlayerCube } from "./PlayerCube";
import type { FaceState } from "./avatars";

// Vista previa en vivo del cubo tal como se ve en el juego real (mismo
// drawPlayerCube que usa GameScreen), fuera de una partida.
export default function CubePreview({
  color,
  faceState,
  size = 100,
  avatarImageUrl,
}: {
  color: string;
  faceState: FaceState;
  size?: number;
  avatarImageUrl?: string | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let raf: number;
    const cubeSize = size * 0.8;
    const margin = (size - cubeSize) / 2;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      drawPlayerCube(ctx, {
        x: margin,
        y: margin,
        size: cubeSize,
        color,
        name: "",
        baseFace: faceState,
        avatarImageUrl: avatarImageUrl || undefined,
        dead: faceState === "dizzy",
        finished: faceState === "happy",
        grounded: true,
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [color, faceState, size, avatarImageUrl]);

  return <canvas ref={ref} width={size} height={size} style={{ background: "#12122b", borderRadius: 12 }} />;
}
