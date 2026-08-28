"""
ai-service-detector:utils/prepare_dataset.py:1
Helper to create dummy structure and guide user to collect real data.
Also supports auto-download of sample images via OpenImages (optional).
"""
from pathlib import Path
import yaml

ROOT = Path(__file__).parent.parent
CONFIG = ROOT / "config.yaml"
DATASET = ROOT / "dataset"

def ensure_structure():
    with open(CONFIG) as f:
        cfg = yaml.safe_load(f)
    classes = cfg["dataset"]["classes"]
    for cls in classes:
        d = DATASET / cls
        d.mkdir(parents=True, exist_ok=True)
        # create .gitkeep + readme
        (d / ".gitkeep").touch(exist_ok=True)
        print(f"[OK] {d} ready")

    guide = DATASET / "README.md"
    guide.write_text("""# Dataset Guide

Put 150-300 images per class. Capture with phone:

- `messy_room/` : messy bed, clutter, unclean floor
- `washroom_dirty/` : dirty toilet, stains, unclean tiles
- `washroom_plumbing/` : leaking tap, pipe, water clog, broken flush
- `furniture/` : broken chair, sofa tear, bed damage
- `ac_unit/` : AC front view, dust on filter
- `walls/` : damp, peeling paint, seepage, cracks

Tips:
- Vertical + horizontal, good + low light, different angles
- 80% train / 20% val is auto-handled by YOLO
- After collecting, run: python train.py
- Use `live.py` + press 'C' to capture more live and auto-correct
""")
    print(f"[GUIDE] Written to {guide}")

    # Create split helper
    print("\n[NEXT STEP]")
    print("1. Fill each folder with images (jpg/png)")
    print("2. python train.py")
    print("3. python live.py")

if __name__ == "__main__":
    ensure_structure()
