"""Generate feature graphic (1024x500) for Google Play Store listing."""
from PIL import Image, ImageDraw, ImageFont
import os

WIDTH, HEIGHT = 1024, 500
BG_COLOR = (30, 58, 95)  # #1e3a5f - matches app theme
ACCENT_COLOR = (59, 130, 246)  # blue accent
TEXT_COLOR = (255, 255, 255)
GOLD_COLOR = (212, 175, 55)  # gold accent

img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
draw = ImageDraw.Draw(img)

# Create gradient effect with rectangles
for y in range(HEIGHT):
    r = int(30 + (y / HEIGHT) * 20)
    g = int(58 + (y / HEIGHT) * 15)
    b = int(95 + (y / HEIGHT) * 30)
    draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

# Decorative elements - border lines
draw.rectangle([20, 20, WIDTH-20, HEIGHT-20], outline=GOLD_COLOR, width=2)
draw.rectangle([30, 30, WIDTH-30, HEIGHT-30], outline=(*GOLD_COLOR, 128), width=1)

# Draw decorative star pattern (Star of David style)
cx, cy = WIDTH // 2, HEIGHT // 2 - 20
star_size = 60
# Simple decorative triangles
for i in range(6):
    import math
    angle = math.radians(60 * i)
    x1 = cx + int(star_size * math.cos(angle))
    y1 = cy + int(star_size * math.sin(angle))
    x2 = cx + int(star_size * math.cos(angle + math.radians(60)))
    y2 = cy + int(star_size * math.sin(angle + math.radians(60)))
    draw.line([(x1, y1), (x2, y2)], fill=GOLD_COLOR, width=2)

# Try to use a nice font, fallback to default
try:
    # Try Arial for Hebrew support
    title_font = ImageFont.truetype("arial.ttf", 64)
    subtitle_font = ImageFont.truetype("arial.ttf", 32)
    small_font = ImageFont.truetype("arial.ttf", 24)
except:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()
    small_font = ImageFont.load_default()

# Main title - Hebrew
title = "\u05D7\u05DE\u05D9\u05E9\u05D4 \u05D7\u05D5\u05DE\u05E9\u05D9 \u05EA\u05D5\u05E8\u05D4"
subtitle = "Five Books of Torah"
tagline = "\u05D1\u05E8\u05D0\u05E9\u05D9\u05EA \u00B7 \u05E9\u05DE\u05D5\u05EA \u00B7 \u05D5\u05D9\u05E7\u05E8\u05D0 \u00B7 \u05D1\u05DE\u05D3\u05D1\u05E8 \u00B7 \u05D3\u05D1\u05E8\u05D9\u05DD"

# Draw title
bbox = draw.textbbox((0, 0), title, font=title_font)
tw = bbox[2] - bbox[0]
draw.text(((WIDTH - tw) // 2, 120), title, fill=TEXT_COLOR, font=title_font)

# Draw subtitle
bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
tw = bbox[2] - bbox[0]
draw.text(((WIDTH - tw) // 2, 210), subtitle, fill=ACCENT_COLOR, font=subtitle_font)

# Draw tagline (book names)
bbox = draw.textbbox((0, 0), tagline, font=small_font)
tw = bbox[2] - bbox[0]
draw.text(((WIDTH - tw) // 2, 320), tagline, fill=GOLD_COLOR, font=small_font)

# Bottom accent bar
draw.rectangle([100, HEIGHT - 60, WIDTH - 100, HEIGHT - 55], fill=GOLD_COLOR)

output_path = os.path.join(os.path.dirname(__file__), "feature_graphic.png")
img.save(output_path, "PNG")
print(f"Feature graphic saved: {output_path}")
print(f"Size: {os.path.getsize(output_path) / 1024:.1f} KB")
print(f"Dimensions: {WIDTH}x{HEIGHT}")
