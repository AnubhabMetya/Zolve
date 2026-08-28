"""
download_and_populate.py - Populate ai-service-detector/dataset from Kaggle caches + HuggingFace
Caches:
  cdawn1/messy-vs-clean-room
  robinreni/house-rooms-image-dataset
  udaysankarmukherjee/furniture-image-dataset
  + HF: Francesco/wall-damage (27MB)
"""
import shutil, random
from pathlib import Path
import kagglehub

ROOT = Path(__file__).parent
DATASET = ROOT / "dataset"
CACHE = Path.home() / ".cache" / "kagglehub" / "datasets"

def clear_and_ensure():
    for cls in ["messy_room","washroom_dirty","washroom_plumbing","furniture","ac_unit","walls"]:
        p = DATASET / cls
        # remove .gitkeep and old images but keep folder
        for f in p.glob("*"):
            if f.is_file() and f.suffix.lower() in [".jpg",".jpeg",".png",".webp"]:
                f.unlink()
        p.mkdir(parents=True, exist_ok=True)
    print("[INFO] Cleaned dataset folders")

def copy_images(src_dir, dest_cls, limit=200, exts=["*.jpg","*.png","*.jpeg","*.webp","*.JPG", "*.JPEG"]):
    dest = DATASET / dest_cls
    src_dir = Path(src_dir)
    src_files = []
    if src_dir.exists():
        for ext in exts:
            src_files.extend(list(src_dir.rglob(ext)))
    src_files = [p for p in src_files if p.is_file()]
    # dedup by resolve
    src_files = list({p.resolve(): p for p in src_files}.values())
    random.shuffle(src_files)
    copied = 0
    for f in src_files[:limit]:
        try:
            target = dest / f"{dest_cls}_{random.randint(100000,999999)}_{copied:04d}{f.suffix.lower()}"
            shutil.copy2(f, target)
            copied += 1
        except Exception as e:
            print(f"copy fail {f}: {e}")
    print(f"[COPY] {dest_cls}: {copied}/{len(src_files)} from {src_dir}")
    return copied

def main():
    random.seed(42)
    clear_and_ensure()

    # Resolve cache paths
    messy_cache = CACHE / "cdawn1" / "messy-vs-clean-room" / "versions" / "1"
    house_cache = CACHE / "robinreni" / "house-rooms-image-dataset" / "versions" / "1" / "House_Room_Dataset"
    furn_cache = CACHE / "udaysankarmukherjee" / "furniture-image-dataset" / "versions" / "1"

    print(f"[CHK] messy_cache {messy_cache.exists()} -> {messy_cache}")
    print(f"[CHK] house_cache {house_cache.exists()} -> {house_cache}")
    print(f"[CHK] furniture_cache {furn_cache.exists()} -> {furn_cache}")

    # 1. messy_room -> from cdawn1 messy + house bedroom
    copy_images(messy_cache / "images" / "images" / "train" / "messy", "messy_room", limit=120)
    copy_images(messy_cache / "images" / "images" / "val" / "messy", "messy_room", limit=30)
    # top up with bedroom images from house dataset
    copy_images(house_cache / "Bedroom", "messy_room", limit=80)  # adds variety, ~230 total

    # 2. washroom_dirty -> house Bathroom
    copy_images(house_cache / "Bathroom", "washroom_dirty", limit=200)
    # also try Bathroom alternatives if not enough, duplicate with augmentation later

    # 3. washroom_plumbing -> same Bathroom but will augment differently; also try to get leak images via HF fallback
    # For now copy Bathroom again as plumbing variant (will be distinguished by training augmentation + later you can replace with real leaks)
    copy_images(house_cache / "Bathroom", "washroom_plumbing", limit=180)
    # Try to enrich plumbing with Kitchen sink images (close to plumbing)
    if (house_cache / "Kitchen").exists():
        copy_images(house_cache / "Kitchen", "washroom_plumbing", limit=40)

    # 4. furniture -> from furniture dataset (chair, almirah, table)
    for sub in ["chair_dataset", "almirah_dataset", "table dataset"]:
        copy_images(furn_cache / sub, "furniture", limit=80)
    # also from house Furniture-rich rooms
    copy_images(house_cache / "Living", "furniture", limit=40)

    # 5. ac_unit -> fallback: use Living/Bedroom images that contain AC - we will use HuggingFace AC or scrape
    # First try: copy Living as proxy (not ideal but allows training to start)
    copy_images(house_cache / "Living", "ac_unit", limit=120)
    copy_images(house_cache / "Bedroom", "ac_unit", limit=60)
    # Try to download AC images from HF/images.cv if possible
    try_ac_download()

    # 6. walls -> HF wall-damage dataset (preferred) + fallback to dummy
    try_wall_download()
    # if walls still low, fallback to copying some house images and will be replaced
    walls_count = len(list((DATASET/"walls").glob("*.*")))
    if walls_count < 80:
        print(f"[WARN] walls only {walls_count}, duplicating + augmenting from available")
        copy_images(house_cache / "Living", "walls", limit=80)

    # Summary
    print("\n=== DATASET SUMMARY ===")
    for cls in ["messy_room","washroom_dirty","washroom_plumbing","furniture","ac_unit","walls"]:
        cnt = len([p for p in (DATASET/cls).glob("*") if p.suffix.lower() in [".jpg",".jpeg",".png",".webp"]])
        print(f"{cls:20s}: {cnt} images")

    # Also handle class imbalance by augment suggestion
    print("\n[NEXT] If any class <150, run augmentation or add manual photos.")
    print("Then run: python train.py")

def try_wall_download():
    try:
        from datasets import load_dataset
        from PIL import Image
        import io
        print("[HF] Downloading Francesco/wall-damage (461 images, 27MB)...")
        ds = load_dataset("Francesco/wall-damage", split="train")
        dest = DATASET / "walls"
        # Purge previous low-quality walls proxy if we will fill from HF
        # keep but add HF images
        for i, row in enumerate(ds):
            img = row["image"]
            # img is PIL
            if not isinstance(img, Image.Image):
                continue
            out = dest / f"walls_hf_{i:04d}.jpg"
            img.convert("RGB").save(out, "JPEG", quality=90)
            if i >= 200:
                break
        print(f"[HF] walls: saved {min(len(ds),201)} images to {dest}")
    except Exception as e:
        print(f"[HF walls FAIL] {e} - will use fallback")

def try_ac_download():
    # Try to get AC images from a small public HuggingFace or images.cv fallback
    # We try to download a few AC images via HuggingFace "keremberke/ac-detection" is model not dataset.
    # Fallback: synthesize by keeping Living images and user can replace with real AC phone photos.
    try:
        # Try kaggle AC dataset if cache exists
        ac_cache = Path.home() / ".cache" / "kagglehub" / "datasets" / "amitgold" / "acair-conditioner-data"
        if ac_cache.exists():
            copy_images(ac_cache, "ac_unit", limit=100)
            print("[KAGGLE] ac found")
            return
        # Try images.cv furniture approach - not needed
        print("[AC] No dedicated AC dataset cached. Using Living/Bedroom proxy. Please add 50 real AC photos with phone for best accuracy.")
    except Exception as e:
        print(f"[AC FAIL] {e}")

if __name__ == "__main__":
    main()
