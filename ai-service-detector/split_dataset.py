"""
ai-service-detector:split_dataset.py:1
Optional: Manually split dataset into train/val if you prefer explicit folders.
YOLO cls trainer can handle flat structure, but this helps for debugging.
"""
import shutil, random
from pathlib import Path

SRC = Path("dataset")
DST = Path("dataset_split")
RATIO = 0.8
random.seed(42)

def split():
    for cls_dir in SRC.iterdir():
        if not cls_dir.is_dir(): continue
        imgs = list(cls_dir.glob("*.jpg")) + list(cls_dir.glob("*.png")) + list(cls_dir.glob("*.jpeg"))
        if not imgs: continue
        random.shuffle(imgs)
        n_train = int(len(imgs)*RATIO)
        for i, p in enumerate(imgs):
            split = "train" if i < n_train else "val"
            dest = DST / split / cls_dir.name
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dest / p.name)
        print(f"{cls_dir.name}: {n_train} train / {len(imgs)-n_train} val")
    print(f"Done -> {DST.resolve()}")

if __name__ == "__main__":
    split()
