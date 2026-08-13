import { AVATAR_SRC, type FaceState } from "./avatars";

export default function Avatar({
  color,
  state = "neutral",
  size = 28,
  imageUrl,
}: {
  color: string;
  state?: FaceState;
  size?: number;
  imageUrl?: string | null;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: "999px",
        overflow: "hidden",
        border: `2px solid ${color}`,
        background: "#0a0b1e",
        flexShrink: 0,
      }}
    >
      <img
        src={imageUrl || AVATAR_SRC[state]}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }}
      />
    </span>
  );
}
