"""
Generate all app icons and splash screens in the circle + תורה style.

Outputs:
  assets/icon.png            - 512x512 main icon (circle on white bg)
  assets/icon-foreground.png - 512x512 adaptive icon foreground (circle + text, transparent bg)
  assets/icon-background.png - 1024x1024 adaptive icon background (solid white)
  assets/icon-only.png       - 512x512 same as icon.png
  assets/splash.png          - 2732x2732 splash screen (light)
  assets/splash-dark.png     - 2732x2732 splash screen (dark)
  public/icon-192x192.png    - 192x192 PWA icon
  public/icon-512x512.png    - 512x512 PWA icon
  public/favicon.ico         - multi-size favicon
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

# ── Colors ──────────────────────────────────────────────────────────────
WHITE = (255, 255, 255)
NAVY = (17, 42, 71)          # hsl(220, 60%, 20%) ≈ #112A47
GOLD_STROKE = (190, 170, 110) # hsl(44, 55%, 58%) ≈ #BEAA6E
DARK_BG = (30, 58, 95)       # #1e3a5f  (used for splash-dark)

# ── Font ────────────────────────────────────────────────────────────────
FONTS_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
FONT_PATH = os.path.join(FONTS_DIR, "frank.ttf")  # Frank Ruehl


def draw_circle_torah(size, transparent_bg=False, scale=1.0):
    """Draw the circle + תורה icon at given size.
    
    scale: how much of the canvas the circle occupies (0-1).
           For adaptive icons, use ~0.6 to stay in safe zone.
    """
    if transparent_bg:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        img = Image.new("RGB", (size, size), WHITE)
    
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    
    # Circle radius: ~216/512 of size * scale
    base_ratio = 216 / 512
    r = int(size * base_ratio * scale)
    stroke_w = max(2, int(size * 12 / 512 * scale))
    
    # White filled circle
    draw.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        fill=WHITE,
        outline=GOLD_STROKE,
        width=stroke_w,
    )
    
    # Hebrew text "תורה" - reversed because Pillow renders LTR
    font_size = int(size * 168 / 512 * scale)
    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except (OSError, IOError):
        font = ImageFont.load_default()
        print("WARNING: Could not load Frank Ruehl font, using default")
    
    text = "תורה"[::-1]  # Reverse for Pillow's LTR rendering
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    # Center the text (adjust Y slightly up for visual centering)
    tx = cx - tw // 2
    ty = cy - th // 2 - int(font_size * 0.08)
    
    # Draw with navy color and slight opacity effect
    text_color = NAVY if not transparent_bg else (*NAVY, 235)  # 235/255 ≈ 0.92 opacity
    draw.text((tx, ty), text, fill=text_color, font=font)
    
    return img


def generate_icon(size, filepath, transparent_bg=False, scale=1.0):
    """Generate and save an icon."""
    img = draw_circle_torah(size, transparent_bg=transparent_bg, scale=scale)
    
    # Convert RGBA to RGB if saving as non-transparent
    if not transparent_bg and img.mode == "RGBA":
        bg = Image.new("RGB", img.size, WHITE)
        bg.paste(img, mask=img.split()[3])
        img = bg
    
    img.save(filepath)
    print(f"  ✓ {filepath} ({size}x{size})")


def generate_splash(size, filepath, dark=False):
    """Generate splash screen with centered circle + תורה on solid background."""
    bg_color = DARK_BG if dark else WHITE
    
    if dark:
        img = Image.new("RGB", (size, size), bg_color)
    else:
        img = Image.new("RGB", (size, size), bg_color)
    
    # Draw the circle icon in the center, smaller relative to splash
    icon_size = size // 3  # Icon takes ~1/3 of splash
    icon_img = draw_circle_torah(icon_size, transparent_bg=True)
    
    # Paste centered
    offset = (size - icon_size) // 2
    img.paste(icon_img, (offset, offset), icon_img)
    
    img.save(filepath)
    print(f"  ✓ {filepath} ({size}x{size})")


def generate_favicon(filepath):
    """Generate multi-size .ico favicon."""
    sizes = [16, 32, 48, 64, 128, 256]
    images = []
    for s in sizes:
        img = draw_circle_torah(s)
        if img.mode == "RGBA":
            bg = Image.new("RGB", img.size, WHITE)
            bg.paste(img, mask=img.split()[3])
            img = bg
        images.append(img)
    
    images[0].save(filepath, format="ICO", sizes=[(s, s) for s in sizes], append_images=images[1:])
    print(f"  ✓ {filepath} (favicon, {len(sizes)} sizes)")


def generate_android_splash(width, height, filepath, dark=False):
    """Generate Android splash screen at specific dimensions."""
    bg_color = DARK_BG if dark else WHITE
    img = Image.new("RGB", (width, height), bg_color)
    
    # Icon size: 1/4 of smallest dimension
    icon_size = min(width, height) // 3
    icon_img = draw_circle_torah(icon_size, transparent_bg=True)
    
    ox = (width - icon_size) // 2
    oy = (height - icon_size) // 2
    img.paste(icon_img, (ox, oy), icon_img)
    
    img.save(filepath)
    print(f"  ✓ {os.path.basename(os.path.dirname(filepath))}/splash.png ({width}x{height})")


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)
    
    assets_dir = os.path.join(root, "assets")
    public_dir = os.path.join(root, "public")
    android_res = os.path.join(root, "android", "app", "src", "main", "res")
    
    print("Generating icons in circle + תורה style...\n")
    
    # ── Assets ──
    print("Assets:")
    generate_icon(512, os.path.join(assets_dir, "icon.png"))
    generate_icon(512, os.path.join(assets_dir, "icon-only.png"))
    generate_icon(512, os.path.join(assets_dir, "icon-foreground.png"), 
                  transparent_bg=True, scale=0.72)
    
    bg = Image.new("RGBA", (1024, 1024), WHITE + (255,))
    bg.save(os.path.join(assets_dir, "icon-background.png"))
    print(f"  ✓ icon-background.png (1024x1024)")
    
    # ── Splash screens (assets) ──
    print("\nSplash screens (assets):")
    generate_splash(2732, os.path.join(assets_dir, "splash.png"), dark=False)
    generate_splash(2732, os.path.join(assets_dir, "splash-dark.png"), dark=True)
    
    # ── PWA icons ──
    print("\nPWA icons:")
    generate_icon(192, os.path.join(public_dir, "icon-192x192.png"))
    generate_icon(512, os.path.join(public_dir, "icon-512x512.png"))
    
    # ── Favicon ──
    print("\nFavicon:")
    generate_favicon(os.path.join(public_dir, "favicon.ico"))
    
    # ── Android mipmap icons ──
    print("\nAndroid mipmap icons:")
    mipmap_sizes = {
        "mipmap-ldpi": 36,
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    
    for density, size in mipmap_sizes.items():
        d = os.path.join(android_res, density)
        if not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
        
        # ic_launcher - full icon
        generate_icon(size, os.path.join(d, "ic_launcher.png"))
        # ic_launcher_round - same (circle already)
        generate_icon(size, os.path.join(d, "ic_launcher_round.png"))
        # ic_launcher_foreground - transparent bg, smaller for safe zone
        generate_icon(size, os.path.join(d, "ic_launcher_foreground.png"),
                      transparent_bg=True, scale=0.72)
        # ic_launcher_background - solid white
        bg_icon = Image.new("RGBA", (size, size), WHITE + (255,))
        bg_icon.save(os.path.join(d, "ic_launcher_background.png"))
    
    # ── Android splash screens ──
    print("\nAndroid splash screens:")
    splash_configs = {
        # drawable (default)
        "drawable": (320, 480, False),
        "drawable-night": (320, 240, True),
        # Portrait
        "drawable-port-ldpi": (240, 320, False),
        "drawable-port-mdpi": (320, 480, False),
        "drawable-port-hdpi": (480, 800, False),
        "drawable-port-xhdpi": (720, 1280, False),
        "drawable-port-xxhdpi": (960, 1600, False),
        "drawable-port-xxxhdpi": (1280, 1920, False),
        # Portrait night
        "drawable-port-night-ldpi": (240, 320, True),
        "drawable-port-night-mdpi": (320, 480, True),
        "drawable-port-night-hdpi": (480, 800, True),
        "drawable-port-night-xhdpi": (720, 1280, True),
        "drawable-port-night-xxhdpi": (960, 1600, True),
        "drawable-port-night-xxxhdpi": (1280, 1920, True),
        # Landscape
        "drawable-land-ldpi": (320, 240, False),
        "drawable-land-mdpi": (480, 320, False),
        "drawable-land-hdpi": (800, 480, False),
        "drawable-land-xhdpi": (1280, 720, False),
        "drawable-land-xxhdpi": (1600, 960, False),
        "drawable-land-xxxhdpi": (1920, 1280, False),
        # Landscape night
        "drawable-land-night-ldpi": (320, 240, True),
        "drawable-land-night-mdpi": (480, 320, True),
        "drawable-land-night-hdpi": (800, 480, True),
        "drawable-land-night-xhdpi": (1280, 720, True),
        "drawable-land-night-xxhdpi": (1600, 960, True),
        "drawable-land-night-xxxhdpi": (1920, 1280, True),
    }
    
    for folder, (w, h, dark) in splash_configs.items():
        d = os.path.join(android_res, folder)
        if not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
        generate_android_splash(w, h, os.path.join(d, "splash.png"), dark=dark)
    
    print("\n✅ All icons and splash screens generated successfully!")


if __name__ == "__main__":
    main()
