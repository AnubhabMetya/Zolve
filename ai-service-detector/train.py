"""
ai-service-detector:train.py:1
Train YOLOv8 classification model on custom home-service dataset.
Dataset structure expected:
  dataset/
    messy_room/*.jpg
    washroom_dirty/*.jpg
    washroom_plumbing/*.jpg
    furniture/*.jpg
    ac_unit/*.jpg
    walls/*.jpg
Ultralytics will auto-split train/val (or create dataset/train & dataset/val).
"""
import yaml
from pathlib import Path
from ultralytics import YOLO

CONFIG_PATH = Path(__file__).parent / "config.yaml"

def load_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)

def validate_dataset(dataset_root: Path, classes):
    missing = []
    for cls in classes:
        p = dataset_root / cls
        if not p.exists():
            missing.append(str(p))
        else:
            count = len([x for x in p.iterdir() if x.is_file() and x.suffix.lower() in {".jpg",".jpeg",".png",".webp",".bmp"}])
            print(f"[DATASET] {cls}: {count} images")
            if count < 20:
                print(f"  -> WARNING: {cls} has <20 images. Aim for 150-300 per class for good accuracy.")
    if missing:
        print(f"[ERROR] Missing folders: {missing}")
        return False
    return True

def main():
    cfg = load_config()
    dataset_root = Path(__file__).parent / cfg["dataset"]["root"]
    classes = cfg["dataset"]["classes"]

    print(f"[INFO] Checking dataset at {dataset_root.resolve()}")
    if not validate_dataset(dataset_root, classes):
        print("[HINT] Run: python utils/prepare_dataset.py  OR manually create folders and add images")
        return

    base_model = cfg["model"]["base"]
    print(f"[INFO] Loading base model {base_model}")
    model = YOLO(base_model)

    print(f"[INFO] Training for {cfg['model']['epochs']} epochs, imgsz={cfg['model']['imgsz']}")
    results = model.train(
        data=str(dataset_root),
        epochs=cfg["model"]["epochs"],
        imgsz=cfg["model"]["imgsz"],
        batch=cfg["model"]["batch"],
        patience=cfg["model"]["patience"],
        project=str(Path(__file__).parent / "runs"),
        name="home_service_cls",
        exist_ok=True,
        verbose=True
    )

    # Validate
    print("[INFO] Validation...")
    metrics = model.val()
    print(f"[RESULT] Top1 Acc: {metrics.top1:.4f} | Top5 Acc: {metrics.top5:.4f}")

    # Export best model to models/
    best = Path(results.save_dir) / "weights" / "best.pt"
    target = Path(__file__).parent / "models" / "best.pt"
    if best.exists():
        target.parent.mkdir(exist_ok=True)
        target.write_bytes(best.read_bytes())
        print(f"[SAVED] Best model copied to {target}")
        # Also export ONNX for deployment
        try:
            model.export(format="onnx")
            print("[EXPORT] ONNX exported for web/mobile deployment")
        except Exception as e:
            print(f"[EXPORT WARN] {e}")

if __name__ == "__main__":
    main()
