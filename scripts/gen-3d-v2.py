import os
from PIL import Image, ImageDraw, ImageFilter

OUT = r"C:\Users\Anubhab Metya\Zolve\public\illustrations\partner-3d"
os.makedirs(OUT, exist_ok=True)
W,H = 512,512
def hex_rgb(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))

# Define per-service accent and drawing function
services = ["ac-appliances","plumbing","electrical","cleaning","carpentry","painting","gardening","home-chef","elder-care","child-care","drivers","home-nursing","pest-control","moving","community-services"]
colors = {
 "ac-appliances": ("#E0F2FE","#0284C7"),
 "plumbing": ("#ECFEFF","#0891B2"),
 "electrical": ("#FEF3C7","#D97706"),
 "cleaning": ("#ECFDF5","#059669"),
 "carpentry": ("#FFF7ED","#9A3412"),
 "painting": ("#F5F3FF","#7C3AED"),
 "gardening": ("#F0FDF4","#16A34A"),
 "home-chef": ("#FFF7ED","#EA580C"),
 "elder-care": ("#FFF1F2","#E11D48"),
 "child-care": ("#FDF2F8","#DB2777"),
 "drivers": ("#F1F5F9","#334155"),
 "home-nursing": ("#FEF2F2","#DC2626"),
 "pest-control": ("#F7FEE7","#65A30D"),
 "moving": ("#FFFBEB","#92400E"),
 "community-services": ("#EEF2FF","#4F46E5"),
}

def base_studio(bg1_hex, accent_hex):
    img = Image.new("RGBA",(W,H),(0,0,0,0))
    d = ImageDraw.Draw(img)
    c_bg = hex_rgb(bg1_hex)
    c_ac = hex_rgb(accent_hex)
    # soft blob background
    bg = Image.new("RGBA",(W,H),(0,0,0,0))
    bd = ImageDraw.Draw(bg)
    bd.ellipse([28,28,484,484], fill=c_bg+(255,))
    bd.ellipse([70,70,442,400], fill=(255,255,255,190))
    bg = bg.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, bg)
    # shadow
    sh = Image.new("RGBA",(W,H),(0,0,0,0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([142,385,370,418], fill=(15,23,42,30))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img, sh)
    return img, hex_rgb(accent_hex), hex_rgb(bg1_hex)

def draw_ac(img, ac):
    d = ImageDraw.Draw(img)
    # AC unit body - rounded rect with vent lines
    d.rounded_rectangle([108,130,404,268], radius=22, fill=(255,255,255,255), outline=ac+(28,), width=2)
    # top highlight
    d.rounded_rectangle([108,130,404,158], radius=22, fill=(255,255,255,255))
    d.rectangle([108,148,404,160], fill=(255,255,255,255))
    # vent lines
    for y in range(190, 250, 12):
        d.rounded_rectangle([132, y, 380, y+6], radius=3, fill=ac+(18,))
    # brand strip
    d.rounded_rectangle([148, 162, 320, 176], radius=6, fill=ac+(14,))
    # bottom shadow line
    d.rounded_rectangle([122, 258, 390, 268], radius=6, fill=(15,23,42,6))
    # small led
    d.ellipse([360,168,372,180], fill=(34,197,94))
    d.ellipse([362,170,368,176], fill=(255,255,255,180))
def draw_plumbing(img, ac):
    d = ImageDraw.Draw(img)
    # pipe
    d.rounded_rectangle([120,180,392,220], radius=20, fill=(226,232,240,255), outline=ac+(30,), width=2)
    d.rounded_rectangle([120,180,392,198], radius=20, fill=(255,255,255,220))
    # joint
    d.rounded_rectangle([210,160,270,240], radius=14, fill=(203,213,225,255), outline=ac+(20,), width=1)
    # faucet head
    d.rounded_rectangle([300,140,360,240], radius=16, fill=(241,245,249,255), outline=ac+(20,), width=1)
    d.ellipse([322,120,338,152], fill=ac+(255,))
    d.ellipse([326,126,334,138], fill=(255,255,255,180))
    # handle
    d.rounded_rectangle([316,210,344,252], radius=8, fill=ac+(255,))
    # water drop
    d.ellipse([328,252,340,272], fill=(56,189,248,180))
def draw_electrical(img, ac):
    d = ImageDraw.Draw(img)
    # wall plate
    d.rounded_rectangle([140,140,372,280], radius=18, fill=(255,255,255,255), outline=ac+(22,), width=2)
    d.rounded_rectangle([140,140,372,168], radius=18, fill=(255,255,255,255))
    # switches
    for i, x in enumerate([162,232,302]):
        col = ac if i==1 else (226,232,240)
        d.rounded_rectangle([x,190, x+58, 252], radius=10, fill=col+(255 if i==1 else 255,), outline=(15,23,42,12) if i!=1 else ac+(30,), width=1)
        if i==1:
            d.ellipse([x+22,206, x+36,220], fill=(255,255,255,220))
    # cable
    d.rounded_rectangle([220,280,292,320], radius=12, fill=(30,41,59,255))
    d.rounded_rectangle([228,286,284,304], radius=6, fill=(71,85,105,255))
def draw_cleaning(img, ac):
    d = ImageDraw.Draw(img)
    # bucket
    d.rounded_rectangle([150,160,340,300], radius=22, fill=(255,255,255,255), outline=ac+(20,), width=2)
    d.ellipse([150,160,340,196], fill=(255,255,255,255))
    d.ellipse([164,168,326,188], fill=ac+(14,))
    # handle
    d.arc([170,120,320,200], 180, 360, fill=ac+(70,), width=6)
    # spray bottle
    d.rounded_rectangle([300,120,360,280], radius=12, fill=(255,255,255,255), outline=ac+(18,), width=1)
    d.rounded_rectangle([308,128,352,148], radius=6, fill=ac+(255,))
    d.rounded_rectangle([314,116,346,132], radius=6, fill=(15,23,42,200))
    # liquid
    d.rounded_rectangle([314,200,346,268], radius=8, fill=ac+(28,))
    # bubbles
    for cx,cy,r in [(200,220,10),(220,240,7),(250,230,6)]:
        d.ellipse([cx-r,cy-r,cx+r,cy+r], fill=(255,255,255,180), outline=ac+(18,), width=1)
def draw_carpentry(img, ac):
    d = ImageDraw.Draw(img)
    # wood plank
    d.rounded_rectangle([120,200,392,248], radius=10, fill=(253,230,138,255), outline=ac+(22,), width=2)
    for x in range(140,380,28):
        d.line([x,208,x+10,240], fill=(120,53,15,18), width=2)
    # hammer
    d.rounded_rectangle([180,120,320,156], radius=10, fill=(68,64,60,255))
    d.rounded_rectangle([184,124,316,142], radius=8, fill=(120,113,108,255))
    d.rounded_rectangle([238,156,262,300], radius=8, fill=(124,45,18,255))
    d.ellipse([242,284,258,298], fill=(255,255,255,30))
def draw_painting(img, ac):
    d = ImageDraw.Draw(img)
    # paint bucket
    d.rounded_rectangle([160,170,300,300], radius=18, fill=(255,255,255,255), outline=ac+(18,), width=2)
    d.ellipse([160,170,300,200], fill=(255,255,255,255))
    d.ellipse([172,176,288,194], fill=ac+(32,))
    # drip
    d.ellipse([210,194,242,230], fill=ac+(80,))
    # roller
    d.rounded_rectangle([280,120,360,162], radius=12, fill=ac+(255,))
    d.rounded_rectangle([284,124,356,148], radius=8, fill=(255,255,255,40))
    d.rectangle([316,162,324,260], fill=(226,232,240,255))
    d.rounded_rectangle([300,250,340,282], radius=8, fill=(30,41,59,255))
def draw_gardening(img, ac):
    d = ImageDraw.Draw(img)
    # pot
    d.rounded_rectangle([170,220,342,310], radius=16, fill=(255,247,237,255), outline=ac+(18,), width=2)
    d.ellipse([170,220,342,250], fill=(255,255,255,255))
    d.ellipse([182,226,330,244], fill=(101,163,13,18))
    # soil
    d.ellipse([182,232,330,248], fill=(120,53,15,40))
    # plant leaves
    for pts, col in [
        ([256,232,220,180,240,160,260,190], (34,197,94)),
        ([256,232,292,180,272,160,256,190], (22,163,74)),
        ([256,210,240,150,250,130,262,150], (74,222,128)),
    ]:
        d.polygon(pts, fill=col+(255,), outline=(15,23,42,10), width=1)
        d.line([256,232, pts[2], pts[3]], fill=(101,163,13,40), width=2)
    # small trowel
    d.ellipse([300,250,336,286], fill=(203,213,225,255), outline=ac+(14,), width=1)
    d.rounded_rectangle([312,286,324,310], radius=4, fill=(124,45,18,255))
def draw_home_chef(img, ac):
    d = ImageDraw.Draw(img)
    # pan
    d.ellipse([140,200,372,268], fill=(30,41,59,255), outline=ac+(18,), width=2)
    d.ellipse([148,206,364,252], fill=(51,65,85,255))
    d.ellipse([160,212,352,240], fill=ac+(22,))
    # handle
    d.rounded_rectangle([350,218,392,246], radius=8, fill=(15,23,42,255))
    # steam
    for x, y in [(200,160),(230,140),(260,150)]:
        d.ellipse([x, y, x+14, y+30], fill=(255,255,255,28))
    # chef hat
    d.ellipse([180,120,280,172], fill=(255,255,255,255), outline=ac+(12,), width=1)
    d.rounded_rectangle([200,162,260,192], radius=8, fill=(255,255,255,255), outline=ac+(12,), width=1)
def draw_elder(img, ac):
    d = ImageDraw.Draw(img)
    # chair
    d.rounded_rectangle([140,180,372,280], radius=18, fill=(255,255,255,255), outline=ac+(18,), width=2)
    d.rounded_rectangle([140,180,372,208], radius=18, fill=(255,255,255,255))
    # backrest slats
    for x in range(170,350,28):
        d.rounded_rectangle([x,148, x+18, 188], radius=6, fill=ac+(14,), outline=ac+(10,), width=1)
    # heart
    d.ellipse([230,210,260,240], fill=ac+(255,))
    d.ellipse([252,210,282,240], fill=ac+(255,))
    d.polygon([(230,228),(282,228),(256,258)], fill=ac+(255,))
    d.ellipse([240,218,252,230], fill=(255,255,255,160))
    # armrests
    d.rounded_rectangle([132,208,150,272], radius=8, fill=(226,232,240,255))
    d.rounded_rectangle([362,208,380,272], radius=8, fill=(226,232,240,255))
def draw_child(img, ac):
    d = ImageDraw.Draw(img)
    # toy blocks
    d.rounded_rectangle([140,220,210,280], radius=10, fill=(251,113,133,255), outline=ac+(14,), width=1)
    d.rounded_rectangle([212,200,282,270], radius=10, fill=(96,165,250,255), outline=ac+(14,), width=1)
    d.rounded_rectangle([284,220,354,280], radius=10, fill=(251,191,36,255), outline=ac+(14,), width=1)
    for cx, label in [(175, "A"),(247,"B"),(319,"C")]:
        d.ellipse([cx-10,232,cx+10,252], fill=(255,255,255,180))
    # teddy head
    d.ellipse([214,120,298,192], fill=(253,230,138,255), outline=ac+(14,), width=1)
    d.ellipse([190,124,220,154], fill=(253,230,138,255))
    d.ellipse([292,124,322,154], fill=(253,230,138,255))
    d.ellipse([196,132,214,148], fill=(120,53,15,40))
    d.ellipse([298,132,316,148], fill=(120,53,15,40))
    d.ellipse([236,150,276,178], fill=(255,251,235,255))
    d.ellipse([242,162,256,174], fill=(15,23,42,200))
    d.ellipse([262,162,276,174], fill=(15,23,42,200))
def draw_drivers(img, ac):
    d = ImageDraw.Draw(img)
    # steering wheel
    d.ellipse([150,140,362,352], fill=(15,23,42,255), outline=ac+(16,), width=2)
    d.ellipse([176,166,336,326], fill=(255,255,255,255))
    d.ellipse([196,186,316,306], fill=(15,23,42,255))
    d.ellipse([232,222,280,270], fill=(51,65,85,255))
    # spokes
    for ang in [0,120,240]:
        import math
        cx,cy=256,246
        x = cx + 70*math.cos(math.radians(ang))
        y = cy + 70*math.sin(math.radians(ang))
        d.line([cx,cy,x,y], fill=(15,23,42,255), width=12)
    # center logo
    d.ellipse([240,230,272,262], fill=ac+(255,))
    d.ellipse([248,238,264,252], fill=(255,255,255,180))
    # key
    d.rounded_rectangle([300,300,360,322], radius=8, fill=(226,232,240,255), outline=ac+(14,), width=1)
    d.ellipse([360,304,374,318], fill=(226,232,240,255))
def draw_nursing(img, ac):
    d = ImageDraw.Draw(img)
    # kit
    d.rounded_rectangle([140,160,372,300], radius=18, fill=(255,255,255,255), outline=ac+(18,), width=2)
    d.rounded_rectangle([140,160,372,190], radius=18, fill=(255,255,255,255))
    d.rectangle([140,178,372,192], fill=(255,255,255,255))
    d.rounded_rectangle([200,188,312,214], radius=8, fill=ac+(14,))
    # cross
    d.rounded_rectangle([244,170,268,214], radius=4, fill=ac+(255,))
    d.rounded_rectangle([228,186,284,198], radius=4, fill=ac+(255,))
    d.rounded_rectangle([248,176,264,208], radius=3, fill=(255,255,255,90))
    # stethoscope
    d.ellipse([180,212,240,272], fill=(30,41,59,255))
    d.ellipse([188,220,232,264], fill=(71,85,105,255))
    d.ellipse([200,232,220,252], fill=ac+(40,))
    d.arc([240,210,320,270], 0, 180, fill=(30,41,59,255), width=6)
    d.ellipse([300,248,324,272], fill=(203,213,225,255), outline=ac+(14,), width=1)
def draw_pest(img, ac):
    d = ImageDraw.Draw(img)
    # sprayer tank
    d.rounded_rectangle([160,160,300,300], radius=18, fill=(255,255,255,255), outline=ac+(18,), width=2)
    d.ellipse([160,160,300,190], fill=(255,255,255,255))
    d.rounded_rectangle([180,200,280,286], radius=10, fill=ac+(14,))
    # nozzle
    d.rounded_rectangle([280,140,320,210], radius=8, fill=(30,41,59,255))
    d.rectangle([292,210,308,260], fill=(51,65,85,255))
    d.ellipse([286,118,314,146], fill=ac+(255,))
    # shield
    d.rounded_rectangle([306,190,374,286], radius=14, fill=(255,255,255,255), outline=ac+(18,), width=1)
    d.ellipse([320,206,360,246], fill=ac+(255,))
    d.ellipse([324,210,344,230], fill=(255,255,255,180))
    # check
    d.line([328,222,336,234], fill=(255,255,255,255), width=3)
    d.line([336,234,352,214], fill=(255,255,255,255), width=3)
def draw_moving(img, ac):
    d = ImageDraw.Draw(img)
    # boxes
    d.rounded_rectangle([140,180,240,280], radius=10, fill=(253,230,138,255), outline=ac+(16,), width=1)
    d.rounded_rectangle([148,188,232,202], radius=4, fill=(120,53,15,14))
    d.line([190,188,190,280], fill=(120,53,15,18), width=2)
    d.rounded_rectangle([240,200,340,300], radius=10, fill=(254,249,195,255), outline=ac+(14,), width=1)
    d.rounded_rectangle([248,208,332,222], radius=4, fill=(120,53,15,14))
    d.line([290,208,290,300], fill=(120,53,15,18), width=2)
    # trolley
    d.rounded_rectangle([160,270,360,286], radius=8, fill=(51,65,85,255))
    d.ellipse([170,284,194,308], fill=(15,23,42,255))
    d.ellipse([318,284,342,308], fill=(15,23,42,255))
    d.ellipse([176,290,188,302], fill=(100,116,139,255))
    d.ellipse([324,290,336,302], fill=(100,116,139,255))
    d.line([340,220,360,272], fill=(51,65,85,255), width=6)
def draw_community(img, ac):
    d = ImageDraw.Draw(img)
    # buildings
    for x, w, h, col in [(140,60,120,(255,255,255)),(212,70,140,(248,250,252)),(294,70,110,(241,245,249))]:
        y0 = 280 - h
        d.rounded_rectangle([x, y0, x+w, 280], radius=10, fill=col+(255,), outline=ac+(14,), width=1)
        # windows
        for wy in range(y0+18, 272, 18):
            for wx in [x+12, x+30]:
                if wx+10 < x+w:
                    d.rounded_rectangle([wx, wy, wx+10, wy+10], radius=2, fill=ac+(18,))
        # roof
        d.rounded_rectangle([x+8, y0-8, x+w-8, y0+8], radius=4, fill=ac+(18,))
    # tree
    d.ellipse([330,160,370,200], fill=(34,197,94,255), outline=ac+(10,), width=1)
    d.rounded_rectangle([344,200,356,240], radius=4, fill=(120,53,15,255))
    # ground
    d.rounded_rectangle([132,280,380,294], radius=6, fill=(226,232,240,255))

draw_map = {
 "ac-appliances": draw_ac,
 "plumbing": draw_plumbing,
 "electrical": draw_electrical,
 "cleaning": draw_cleaning,
 "carpentry": draw_carpentry,
 "painting": draw_painting,
 "gardening": draw_gardening,
 "home-chef": draw_home_chef,
 "elder-care": draw_elder,
 "child-care": draw_child,
 "drivers": draw_drivers,
 "home-nursing": draw_nursing,
 "pest-control": draw_pest,
 "moving": draw_moving,
 "community-services": draw_community,
}

for slug in services:
    bg1, ac_hex = colors[slug]
    img, ac, _ = base_studio(bg1, ac_hex)
    draw_map[slug](img, ac)
    # vignette
    overlay = Image.new("RGBA",(W,H),(0,0,0,0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([0,0,W,H], outline=(37,99,235,14), width=22)
    overlay = overlay.filter(ImageFilter.GaussianBlur(8))
    img = Image.alpha_composite(img, overlay)
    out = os.path.join(OUT, f"{slug}.png")
    img.save(out, "PNG", optimize=True)
    try:
        img.save(os.path.join(OUT, f"{slug}.webp"), "WEBP", quality=88, method=6)
    except: pass
    print("saved",slug)
print("done v2")
