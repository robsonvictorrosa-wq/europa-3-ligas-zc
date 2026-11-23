#!/usr/bin/env python3
"""Placeholders simples: sigla colorida. Não inventa escudos reais."""
import hashlib, os, sqlite3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "crests"
OUT.mkdir(parents=True, exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
db = sqlite3.connect(ROOT / "data" / "game.db")
rows = list(db.execute("SELECT club_id, name, abbr, league_key FROM lib_clubs ORDER BY ord"))

# paleta fixa (não são cores oficiais dos clubes)
PALETTE = [
    (0x1D, 0x4E, 0x89), (0x8B, 0x1E, 0x3F), (0x0F, 0x6B, 0x4F), (0xB85C, 0x38, 0x00) if False else (0xB8, 0x5C, 0x00),
    (0x3D, 0x2B, 0x5A), (0x1A, 0x6B, 0x8A), (0x7A, 0x2E, 0x12), (0x2E, 0x5A, 0x3C),
    (0x6B, 0x1D, 0x5A), (0x12, 0x4E, 0x6B), (0x5A, 0x3A, 0x12), (0x1F, 0x3A, 0x5C),
    (0x6E, 0x2C, 0x2C), (0x2C, 0x4A, 0x6E), (0x3A, 0x5C, 0x2C), (0x5C, 0x2C, 0x4A),
]

def color(s):
    h = int(hashlib.sha1(s.encode()).hexdigest()[:8], 16)
    return PALETTE[h % len(PALETTE)]

def lum(c):
    r,g,b=c; return 0.299*r+0.587*g+0.114*b

SIZE=256
font3=ImageFont.truetype(FONT, 92)
font2=ImageFont.truetype(FONT, 110)

for cid, name, abbr, lk in rows:
    dest=OUT/f"{cid}.png"
    if dest.exists() and dest.stat().st_size>800:
        continue  # preserva escudos oficiais já no repositório
    bg=color(name+"|"+str(cid))
    fg=(255,255,255) if lum(bg)<160 else (20,20,20)
    im=Image.new("RGBA",(SIZE,SIZE),(0,0,0,0))
    d=ImageDraw.Draw(im)
    m=8
    d.rounded_rectangle([m,m,SIZE-1-m,SIZE-1-m], radius=48, fill=bg)
    text=(abbr or name[:3]).upper()[:3]
    f=font3 if len(text)>=3 else font2
    bbox=d.textbbox((0,0), text, font=f)
    tw,th=bbox[2]-bbox[0], bbox[3]-bbox[1]
    d.text(((SIZE-tw)/2, (SIZE-th)/2 - bbox[1]), text, font=f, fill=fg)
    im.save(OUT/f"{cid}.png")

print("crests", len(rows), "em", OUT)
