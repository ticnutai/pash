"""Generate Omer app icon PNGs for all Android densities using Pillow."""
from PIL import Image, ImageDraw, ImageFont
import math, os

SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
FG_SIZE = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "android-omer", "app", "src", "main", "res")

BG_DARK = (26, 26, 94)      # #1a1a5e
BG_DARKER = (13, 13, 58)    # #0d0d3a
GOLD = (255, 215, 0)        # #ffd700
GOLD_DIM = (218, 165, 32)   # #daa520
WHEAT = (240, 192, 64)      # #f0c040
WHITE_DIM = (255, 255, 255, 90)


def lerp_color(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def draw_icon(size: int, is_foreground=False):
    """Draw the Omer icon at given size. If is_foreground, uses transparent bg for adaptive icon."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    r = size * 0.48 if not is_foreground else size * 0.42

    # Background gradient circle
    for y in range(size):
        for x in range(size):
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= r:
                t = y / size
                color = lerp_color(BG_DARK, BG_DARKER, t)
                img.putpixel((x, y), (*color, 255))

    # Gold ring
    ring_w = max(1, int(size * 0.008))
    ring_r = r * 0.95
    draw.ellipse(
        [cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
        outline=(*GOLD, 128), width=ring_w
    )

    # Stars
    import random
    random.seed(42)
    for _ in range(7):
        sx = cx + random.uniform(-r * 0.7, r * 0.7)
        sy = cy + random.uniform(-r * 0.7, -r * 0.1)
        sr = max(1, int(size * 0.006))
        draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(*GOLD, 90))

    # Wheat stalks
    stalk_w = max(1, int(size * 0.01))
    base_y = cy + r * 0.35
    
    # Left stalk
    _draw_stalk(draw, cx - r * 0.14, base_y, cx - r * 0.22, cy - r * 0.35, stalk_w, size, r, cx, cy, -1)
    # Center stalk
    _draw_stalk(draw, cx, base_y, cx, cy - r * 0.45, stalk_w, size, r, cx, cy, 0)
    # Right stalk
    _draw_stalk(draw, cx + r * 0.14, base_y, cx + r * 0.22, cy - r * 0.35, stalk_w, size, r, cx, cy, 1)

    # Tie band
    band_w = max(1, int(size * 0.01))
    band_rx = r * 0.2
    band_ry = r * 0.045
    draw.ellipse(
        [cx - band_rx, base_y - band_ry, cx + band_rx, base_y + band_ry],
        outline=GOLD_DIM, width=band_w
    )

    # Hebrew text "מ״ט" at top
    top_y = cy - r * 0.68
    _draw_text(draw, "מ״ט", cx, top_y, size * 0.06, GOLD, size)

    # Hebrew text bottom
    bottom_y = cy + r * 0.6
    _draw_text(draw, "ספירת העומר", cx, bottom_y, size * 0.07, GOLD, size)

    return img


def _draw_stalk(draw, bx, by, tx, ty, w, size, r, cx, cy, side):
    """Draw a wheat stalk with grains."""
    draw.line([(bx, by), (tx, ty)], fill=WHEAT, width=w)
    
    # Grains along the stalk (top portion)
    num_grains = 4
    for i in range(num_grains):
        t = 0.1 + i * 0.22
        gx = bx + (tx - bx) * t + side * size * 0.015
        gy = by + (ty - by) * t
        grain_rx = max(2, int(size * 0.025))
        grain_ry = max(1, int(size * 0.012))
        draw.ellipse(
            [gx - grain_rx, gy - grain_ry, gx + grain_rx, gy + grain_ry],
            fill=WHEAT
        )


def _draw_text(draw, text, cx, cy, target_size, color, img_size):
    """Draw centered text. Uses default font scaled."""
    font_size = max(8, int(target_size))
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except (OSError, IOError):
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw / 2, cy - th / 2), text, fill=color, font=font)


def main():
    # Generate launcher icons
    for folder, size in SIZES.items():
        out_path = os.path.join(OUT_DIR, folder)
        os.makedirs(out_path, exist_ok=True)
        
        icon = draw_icon(size)
        icon.save(os.path.join(out_path, "ic_launcher.png"))
        icon.save(os.path.join(out_path, "ic_launcher_round.png"))
        print(f"  {folder}: {size}x{size}")

    # Generate foreground for adaptive icon
    for folder, size in FG_SIZE.items():
        out_path = os.path.join(OUT_DIR, folder)
        os.makedirs(out_path, exist_ok=True)
        
        fg = draw_icon(size, is_foreground=True)
        fg.save(os.path.join(out_path, "ic_launcher_foreground.png"))
        print(f"  {folder} fg: {size}x{size}")

    # Update adaptive icon background color
    bg_xml = os.path.join(OUT_DIR, "values", "ic_launcher_background.xml")
    with open(bg_xml, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<resources>\n')
        f.write('    <color name="ic_launcher_background">#1A1A5E</color>\n')
        f.write('</resources>\n')
    print("  Updated ic_launcher_background.xml")

    print("Done!")


if __name__ == "__main__":
    main()
