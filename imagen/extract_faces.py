from PIL import Image
import numpy as np
from collections import deque
import os

SRC = r"c:/PROYECTOS/WEB/GeoVS/GeoVS_juego/imagen/fernanfloo.png"
OUT_DIR = r"c:/PROYECTOS/WEB/GeoVS/GeoVS_juego/public/avatars"
os.makedirs(OUT_DIR, exist_ok=True)

img = Image.open(SRC).convert("RGBA")
row = img.crop((0, 626, 1536, 826))

# (name, x_start, x_end) within the row crop
PANELS = [
    ("neutral", 4, 215),
    ("happy", 253, 465),
    ("angry", 503, 700),
    ("sad", 753, 960),
    ("dizzy", 990, 1160),
]

WHITE_THRESHOLD = 232


def flood_remove_background(arr):
    """arr: HxWx4 uint8. Makes background (white, connected to border) transparent
    in-place, leaving enclosed white regions (like eye highlights) opaque."""
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    is_bg_color = np.all(rgb >= WHITE_THRESHOLD, axis=2)

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg_color[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg_color[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx] and is_bg_color[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))

    arr[visited, 3] = 0
    return arr


def trim(img_rgba):
    arr = np.array(img_rgba)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 10)
    if len(xs) == 0:
        return img_rgba
    pad = 6
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + pad)
    return img_rgba.crop((x0, y0, x1, y1))


for name, xs, xe in PANELS:
    panel = row.crop((xs, 0, xe, row.height))
    arr = np.array(panel)
    arr = flood_remove_background(arr)
    cleaned = Image.fromarray(arr, mode="RGBA")
    cleaned = trim(cleaned)
    out_path = os.path.join(OUT_DIR, f"face_{name}.png")
    cleaned.save(out_path)
    print(name, cleaned.size, "->", out_path)
