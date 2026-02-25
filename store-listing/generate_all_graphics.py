"""Generate all store listing graphics with correct RTL Hebrew text."""
from PIL import Image, ImageDraw, ImageFont
from bidi.algorithm import get_display
import os
import math

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCREENSHOTS_DIR = os.path.join(SCRIPT_DIR, "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

# Colors
BG_COLOR = (30, 58, 95)       # #1e3a5f
ACCENT_BLUE = (59, 130, 246)
TEXT_WHITE = (255, 255, 255)
GOLD = (212, 175, 55)
DARK_BG = (20, 40, 70)
LIGHT_BG = (248, 249, 250)
TEXT_DARK = (51, 51, 51)

def heb(text):
    """Convert Hebrew text to display form (fixes RTL)."""
    return get_display(text)

def get_fonts(sizes):
    """Get fonts at specified sizes."""
    fonts = {}
    for name, size in sizes.items():
        try:
            fonts[name] = ImageFont.truetype("arial.ttf", size)
        except:
            try:
                fonts[name] = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", size)
            except:
                fonts[name] = ImageFont.load_default()
    return fonts

def draw_centered_text(draw, y, text, font, fill, width):
    """Draw text centered horizontally."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (width - tw) // 2
    draw.text((x, y), text, fill=fill, font=font)

def draw_hexagon(draw, cx, cy, size, color, width=2):
    """Draw a hexagon."""
    points = []
    for i in range(6):
        angle = math.radians(60 * i - 30)
        x = cx + int(size * math.cos(angle))
        y = cy + int(size * math.sin(angle))
        points.append((x, y))
    points.append(points[0])
    draw.line(points, fill=color, width=width)

# ============================================================
# 1. Feature Graphic (1024x500)
# ============================================================
def generate_feature_graphic():
    W, H = 1024, 500
    img = Image.new('RGB', (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Gradient background
    for y in range(H):
        r = int(30 + (y / H) * 20)
        g = int(58 + (y / H) * 15)
        b = int(95 + (y / H) * 30)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Decorative borders
    draw.rectangle([20, 20, W-20, H-20], outline=GOLD, width=2)
    draw.rectangle([30, 30, W-30, H-30], outline=GOLD, width=1)

    # Hexagon decoration
    draw_hexagon(draw, W // 2, H // 2 - 10, 60, GOLD, 2)

    fonts = get_fonts({'title': 64, 'subtitle': 32, 'small': 24})

    # Title - Hebrew (RTL fixed)
    title = heb("חמישה חומשי תורה")
    draw_centered_text(draw, 120, title, fonts['title'], TEXT_WHITE, W)

    # English subtitle
    draw_centered_text(draw, 220, "Five Books of Torah", fonts['subtitle'], ACCENT_BLUE, W)

    # Book names - Hebrew (RTL fixed)
    tagline = heb("בראשית · שמות · ויקרא · במדבר · דברים")
    draw_centered_text(draw, 330, tagline, fonts['small'], GOLD, W)

    # Bottom accent bar
    draw.rectangle([100, H - 60, W - 100, H - 55], fill=GOLD)

    path = os.path.join(SCRIPT_DIR, "feature_graphic.png")
    img.save(path, "PNG")
    print(f"[OK] Feature graphic: {path} ({os.path.getsize(path) / 1024:.0f} KB)")

# ============================================================
# 2. Screenshots (1080x1920 - phone portrait)
# ============================================================
def create_phone_frame(title_text, subtitle_text, features=None, bg_color=BG_COLOR):
    """Create a phone-style screenshot."""
    W, H = 1080, 1920
    img = Image.new('RGB', (W, H), bg_color)
    draw = ImageDraw.Draw(img)

    fonts = get_fonts({'title': 72, 'subtitle': 40, 'feature': 36, 'small': 28})

    # Top gradient area
    for y in range(600):
        alpha = y / 600
        r = int(bg_color[0] + alpha * 15)
        g = int(bg_color[1] + alpha * 10)
        b = int(bg_color[2] + alpha * 20)
        draw.line([(0, y), (W, y)], fill=(min(r, 255), min(g, 255), min(b, 255)))

    # Gold decorative line
    draw.rectangle([80, 160, W - 80, 163], fill=GOLD)

    # Title
    title = heb(title_text)
    draw_centered_text(draw, 220, title, fonts['title'], TEXT_WHITE, W)

    # Subtitle
    if subtitle_text:
        sub = heb(subtitle_text)
        draw_centered_text(draw, 320, sub, fonts['subtitle'], GOLD, W)

    # Features list
    if features:
        y_start = 500
        for i, feat in enumerate(features):
            feat_text = heb(feat)
            # Draw bullet
            draw.ellipse([W - 140, y_start + i * 90 + 10, W - 120, y_start + i * 90 + 30], fill=GOLD)
            # Draw text right-aligned
            bbox = draw.textbbox((0, 0), feat_text, font=fonts['feature'])
            tw = bbox[2] - bbox[0]
            draw.text((W - 160 - tw, y_start + i * 90), feat_text, fill=TEXT_WHITE, font=fonts['feature'])

    # Decorative bottom
    draw.rectangle([80, H - 160, W - 80, H - 157], fill=GOLD)

    # App name at bottom
    app_name = heb("חמישה חומשי תורה")
    draw_centered_text(draw, H - 120, app_name, fonts['small'], ACCENT_BLUE, W)

    return img

def generate_screenshots():
    # Screenshot 1: Main - app overview
    img1 = create_phone_frame(
        "חמישה חומשי תורה",
        "האפליקציה המושלמת ללימוד תורה",
        [
            "בראשית · שמות · ויקרא · במדבר · דברים",
            "פירושי רש\"י, רמב\"ן, אבן עזרא, ספורנו",
            "חיפוש חכם בכל התורה",
            "סימניות והערות אישיות",
            "הדגשת טקסט בצבעים",
            "מצב כהה ובהיר",
        ]
    )
    img1.save(os.path.join(SCREENSHOTS_DIR, "screenshot_1_main.png"), "PNG")
    print(f"[OK] Screenshot 1: Main")

    # Screenshot 2: Reading experience
    img2 = create_phone_frame(
        "קריאה נוחה",
        "ניקוד וטעמים מלאים",
        [
            "גלילה חלקה בין פסוקים",
            "ניווט מהיר בין פרקים",
            "גודל גופן מותאם אישית",
            "תצוגה קומפקטית או מורחבת",
            "תמיכה מלאה בעברית",
        ]
    )
    img2.save(os.path.join(SCREENSHOTS_DIR, "screenshot_2_scroll.png"), "PNG")
    print(f"[OK] Screenshot 2: Reading")

    # Screenshot 3: Commentaries
    img3 = create_phone_frame(
        "פירושים ומפרשים",
        "גישה ישירה לפירושים",
        [
            "רש\"י - פירוש מקיף",
            "רמב\"ן - פירוש מעמיק",
            "אבן עזרא - פשט הכתוב",
            "ספורנו - הסבר ברור",
            "תצוגה נוחה לצד הפסוק",
        ]
    )
    img3.save(os.path.join(SCREENSHOTS_DIR, "screenshot_3_nav.png"), "PNG")
    print(f"[OK] Screenshot 3: Commentaries")

    # Screenshot 4: Personal features
    img4 = create_phone_frame(
        "כלים אישיים",
        "שמרו את הלימוד שלכם",
        [
            "סימניות לגישה מהירה",
            "הערות אישיות לכל פסוק",
            "שאלות ותשובות",
            "הדגשות בצבעים שונים",
            "סנכרון בענן בין מכשירים",
        ]
    )
    img4.save(os.path.join(SCREENSHOTS_DIR, "screenshot_4_back.png"), "PNG")
    print(f"[OK] Screenshot 4: Personal tools")

    # Screenshot 5: Search
    img5 = create_phone_frame(
        "חיפוש חכם",
        "מצאו כל פסוק במהירות",
        [
            "חיפוש בכל חמשת החומשים",
            "תוצאות מדויקות מיידיות",
            "הדגשה אוטומטית של תוצאות",
            "ניווט ישיר לפסוק",
            "היסטוריית חיפושים",
        ]
    )
    img5.save(os.path.join(SCREENSHOTS_DIR, "screenshot_5_landscape.png"), "PNG")
    print(f"[OK] Screenshot 5: Search")

# ============================================================
# Run all
# ============================================================
if __name__ == "__main__":
    print("Generating store listing graphics...")
    print("=" * 50)
    generate_feature_graphic()
    generate_screenshots()
    print("=" * 50)
    print("All graphics generated successfully!")
    print(f"\nFiles location:")
    print(f"  Feature graphic: store-listing/feature_graphic.png")
    print(f"  Screenshots: store-listing/screenshots/")
