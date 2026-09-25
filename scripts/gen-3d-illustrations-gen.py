#!/usr/bin/env python3
"""Generate premium 3D-style PNG illustrations for Zolve Partner service cards.
Each PNG: 512x512, transparent-ready look, soft studio lighting, premium product-render style.
Uses Pillow to composite shapes with gradients, shadows, highlights.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = r"C:\Users\Anubhab Metya\Zolve\public\illustrations\partner-3d"
os.makedirs(OUT, exist_ok=True)

# Service definitions with icon emoji + colors (premium flat 3D style)
services = [
    ("ac-appliances", "AC", "#E0F2FE", "#0284C7", "❄"),
    ("plumbing", "Pipe", "#ECFEFF", "#0891B2", "🚿"),
    ("electrical", "Plug", "#FEF3C7", "#D97706", "⚡"),
    ("cleaning", "Clean", "#ECFDF5", "#059669", "✨"),
    ("carpentry", "Hammer", "#FFF7ED", "#C2410C", "🔨"),
    ("painting", "Paint", "#F5F3FF", "#7C3AED", "🎨"),
    ("gardening", "Garden", "#F0FDF4", "#16A34A", "🌿"),
    ("home-chef", "Chef", "#FFF7ED", "#EA580C", "🍳"),
    ("elder-care", "Elder", "#FFF1F2", "#E11D48", "❤"),
    ("child-care", "Child", "#FDF2F8", "#DB2777", "🧸"),
    ("drivers", "Driver", "#F8FAFC", "#334155", "🚗"),
    ("home-nursing", "Nursing", "#FEF2F2", "#DC2626", "🩺"),
    ("pest-control", "Pest", "#F7FEE7", "#65A30D", "🛡"),
    ("moving", "Moving", "#FFFBEB", "#B45309", "📦"),
    ("community-services", "Community", "#EEF2FF", "#4F46E5", "🏢"),
]

W, H = 512, 512

def rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)

def make_image(slug, label, bg1, accent, emoji):
    # Base transparent
    img = Image.new("RGBA", (W, H), (0,0,0,0))
    draw = ImageDraw.Draw(img)

    # Soft blue-tinted card background circle (studio lighting)
    # Background blob
    bg = Image.new("RGBA", (W, H), (0,0,0,0))
    bgd = ImageDraw.Draw(bg)
    # parse colors
    def hex_to_rgb(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
    c_bg1 = hex_to_rgb(bg1)
    c_accent = hex_to_rgb(accent)

    # large soft blob
    bgd.ellipse([32,32,480,480], fill=c_bg1+(255,))
    # inner highlight
    bgd.ellipse([80,80,432,380], fill=(255,255,255,180))
    bg = bg.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, bg)
    draw = ImageDraw.Draw(img)

    # Soft drop shadow under object
    shadow = Image.new("RGBA", (W, H), (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse([140, 380, 372, 420], fill=(15,23,42,28))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)

    # 3D object - rounded box representing the service
    # Main body with slight perspective (trapezoid)
    # Use rounded rect + highlight
    # Body
    body_color = tuple(int(c_accent[i]*0.12 + 255*0.88) for i in range(3))  # very light tint
    # main rounded box
    rounded_rect(draw, [110, 110, 402, 360], 36, fill=body_color+(255,))
    # border subtle
    draw.rounded_rectangle([110,110,402,360], radius=36, outline=c_accent+(30,), width=2)

    # Top face (perspective) - lighter
    top_poly = [(110,110),(148,78),(440,78),(402,110)]
    draw.polygon(top_poly, fill=(255,255,255,220), outline=c_accent+(20,))

    # Front highlight strip
    highlight = Image.new("RGBA", (W,H), (0,0,0,0))
    hd = ImageDraw.Draw(highlight)
    hd.rounded_rectangle([126,126,380,160], radius=12, fill=(255,255,255,160))
    highlight = highlight.filter(ImageFilter.GaussianBlur(1))
    img = Image.alpha_composite(img, highlight)
    draw = ImageDraw.Draw(img)

    # Icon/emoji centered - use text
    # Try to load a font
    try:
        # try segoe ui emoji or arial
        font_large = ImageFont.truetype("seguiemj.ttf", 140)
    except:
        try:
            font_large = ImageFont.truetype("arial.ttf", 120)
        except:
            font_large = ImageFont.load_default()

    # Use colored box with letter if emoji not render well, fallback to initials
    # draw emoji/text
    text = emoji
    # measure
    try:
        bbox = draw.textbbox((0,0), text, font=font_large)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    except:
        tw, th = 120,120
    tx, ty = (W - tw)//2, (H - th)//2 - 10
    # subtle text shadow
    draw.text((tx+3, ty+6), text, font=font_large, fill=(15,23,42,18))
    draw.text((tx, ty), text, font=font_large, fill=c_accent+(255,), embedded_color=True)

    # Small accent dot bottom
    draw.ellipse([238, 330, 274, 342], fill=c_accent+(255,))
    draw.ellipse([242, 332, 256, 338], fill=(255,255,255,200))

    # subtle bottom label pill
    pill_bg = Image.new("RGBA", (W,H), (0,0,0,0))
    pd = ImageDraw.Draw(pill_bg)
    pd.rounded_rectangle([176, 390, 336, 414], radius=12, fill=(255,255,255,230), outline=c_accent+(18,), width=1)
    pill_bg = pill_bg.filter(ImageFilter.GaussianBlur(0.5))
    img = Image.alpha_composite(img, pill_bg)

    draw = ImageDraw.Draw(img)
    try:
        font_small = ImageFont.truetype("arial.ttf", 14)
    except:
        font_small = ImageFont.load_default()
    # label text disabled for clean look - keep pill subtle

    # add subtle blue studio light vignette
    overlay = Image.new("RGBA", (W,H), (0,0,0,0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([0,0,W,H], outline=(37,99,235,18), width=24)
    overlay = overlay.filter(ImageFilter.GaussianBlur(8))
    img = Image.alpha_composite(img, overlay)

    out_path = os.path.join(OUT, f"{slug}.png")
    img.save(out_path, "PNG", optimize=True)
    print(f"saved {out_path} ({img.size})")

    # also save webp
    try:
        img.save(os.path.join(OUT, f"{slug}.webp"), "WEBP", quality=88, method=6)
    except Exception as e:
        print("webp skip", e)

for slug, label, bg1, accent, emoji in services:
    make_image(slug, label, bg1, accent, emoji)

print("Done: generated", len(services), "illustrations")
