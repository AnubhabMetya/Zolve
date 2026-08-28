# Zolve - Live Home Service AI (YOLOv8 Classification)

Live video -> Detects room/issue -> Routes to correct service executive.

**Services:** `messy_room` -> Deep Cleaning | `washroom_dirty` -> Cleaning Executive | `washroom_plumbing` -> Plumber | `furniture` -> Carpenter | `ac_unit` -> AC Cleaning | `walls` -> Painting & Waterproofing

## 1. Setup (Windows)

```powershell
cd "C:\Users\Anubhab Metya\Zolve\ai-service-detector"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python utils/prepare_dataset.py
```

## 2. Collect Data

Fill `dataset/<class>/` with 150-300 images each. Aim for varied lighting/angles. Minimum 50 to start testing.

```
dataset/
  messy_room/*.jpg
  washroom_dirty/*.jpg
  washroom_plumbing/*.jpg
  furniture/*.jpg
  ac_unit/*.jpg
  walls/*.jpg
```

Tip: Use phone to click 2 min per class. Or press `C` in live mode to auto-save captures.

## 3. Train

```powershell
python train.py
# Best model saved to models/best.pt
# Logs in runs/home_service_cls/
```

Expected accuracy: >92% with 200 imgs/class, 50 epochs.

## 4. Live Inference

```powershell
# With your trained model
python live.py

# With specific model / camera
python live.py --model models/best.pt --camera 0 --conf 0.55

# Test on video/image
yolo predict model=models/best.pt source="test.jpg"
```

Keys: `q`=quit, `s`=book service (logs to bookings.log), `c`=save frame to dataset for retraining

## 5. Booking Hook

Edit `live.py:handle_booking()` to call your backend:

```python
import requests
requests.post("https://zolve.com/api/book", json={"service": service, "confidence": conf})
```

## 6. Deploy Options

- Desktop: `live.py` as .exe via `pyinstaller`
- Web: Convert to ONNX + use `onnxruntime-web` or host FastAPI `app.py` with WebRTC
- Mobile: Export to `best.onnx` -> `best.tflite`

## 7. Improve Washroom Logic (Cleaner vs Plumber)

Current: two separate classes `washroom_dirty` vs `washroom_plumbing`.
If confusion, add second-stage object detector:

```python
detector = YOLO('yolov8n.pt')
# if washroom detected and detector finds 'sink' + water leak -> plumber
```

## Model Choice

`yolov8n-cls.pt` = 1.4M params, ~45 FPS on CPU, 150 FPS on GPU. Use `yolov8s-cls.pt` for +3% acc if you have GPU.

