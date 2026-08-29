from pathlib import Path
import random
import shutil

DATASET = Path("dataset")

CLASSES = [
    "messy_room",
    "washroom_dirty",
    "washroom_plumbing",
    "furniture",
    "ac_unit",
    "walls",
    "gardening",
    "pest_control",
    "home_chef",
    "elder_care",
    "moving",
    "society_sanitization",
    "sump_tank",
    "event_setup",
]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

random.seed(42)

for class_name in CLASSES:
    source = DATASET / class_name
    train_dir = DATASET / "train" / class_name
    val_dir = DATASET / "val" / class_name

    # Clear stale outputs before writing new split — prevents deleted/moved
    # source images from remaining in dataset/train or dataset/val and
    # causing reported counts to diverge from actual training data.
    for d in (train_dir, val_dir):
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True, exist_ok=True)

    images = [
        p for p in source.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    ]

    random.shuffle(images)

    split_index = int(len(images) * 0.8)

    train_images = images[:split_index]
    val_images = images[split_index:]

    for image in train_images:
        shutil.copy2(image, train_dir / image.name)

    for image in val_images:
        shutil.copy2(image, val_dir / image.name)

    print(
        f"{class_name}: "
        f"{len(train_images)} train, "
        f"{len(val_images)} validation"
    )

print("\nDataset split completed.")