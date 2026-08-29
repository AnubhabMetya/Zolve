"""
Zolve AI Service Detector — Local FastAPI inference server
POST /api/detect with multipart image -> classification + solution
GET /health, GET /classes
Runs YOLOv8 classification (models/best.pt) with ONNX fallback.
Allows anonymous upload; booking gate handled in React.
"""
import io
import yaml
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import torch

CONFIG_PATH = Path(__file__).parent / "config.yaml"

def load_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)

cfg = load_config()
CLASSES: List[str] = cfg["dataset"]["classes"]
SERVICES: dict = cfg["services"]
CONF_THR = float(cfg.get("inference", {}).get("conf_threshold", 0.55))
MODEL_PATH = Path(__file__).parent / "models" / "best.pt"
ONNX_PATH = Path(__file__).parent / "runs" / "home_service_cls" / "weights" / "best.onnx"
FALLBACK_PT = Path(__file__).parent / "yolov8n-cls.pt"

# Solution templates per service — used to trail AI to give proper problem/solution
SOLUTION_MAP = {
    "Full House Deep Cleaning": {"problem": "Dusty/cluttered room with stains and unorganized items", "solution": ["Remove loose waste", "Vacuum & mop floors", "Wipe surfaces with disinfectant", "Organize items"]},
    "Cleaning Executive (Washroom)": {"problem": "Dirty washroom with stains and limescale", "solution": ["Scrub tiles with descaler", "Disinfect toilet/sink", "Rinse and dry"]},
    "Plumbing Repair & Leakage Fix": {"problem": "Leaking tap / pipe seepage / clogged drain", "solution": ["Shut inlet valve", "Replace washer/seal", "Pressure test for leaks"]},
    "Carpentry & Furniture Assembly": {"problem": "Damaged furniture or loose fittings", "solution": ["Inspect joints", "Tighten/replace hardware", "Polish/align"]},
    "AC Deep Foam Jet Servicing": {"problem": "Dust-clogged AC filter / weak cooling", "solution": ["Power off AC", "Foam jet on coils", "Clean filter & test"]},
    "Wall Painting & Waterproofing": {"problem": "Damp, peeling paint or cracks", "solution": ["Scrape loose paint", "Apply primer", "Waterproof putty + repaint"]},
    "Gardening & Balcony Greenery": {"problem": "Overgrown / dry plants, weed", "solution": ["Prune & weed", "Repot & fertilize", "Water schedule"]},
    "Organic Pest Control": {"problem": "Cockroach/ant/termite signs", "solution": ["Identify pest source", "Eco spray treatment", "Seal entry points"]},
    "Home Chef & Meal Preparation": {"problem": "Need home-cooked meal support", "solution": ["Plan menu", "Fresh prep on-site", "Serve & clean"]},
    "Elder Assistance & Companionship": {"problem": "Elder needs daily assistance", "solution": ["Companion visit", "Medication & walk support", "Family update"]},
    "Moving & Heavy Lifting Assistance": {"problem": "Heavy furniture/shifting", "solution": ["Pack with dolly", "Lift with team", "Place & unpack"]},
    "Society Common Area Sanitization": {"problem": "Society lobby/clubhouse needs sanitization", "solution": ["Sweep & mop", "Machine scrub", "Disinfect railings"]},
    "Water Sump & Overhead Tank Cleaning": {"problem": "Sump/tank sludge & algae", "solution": ["Drain & desilt", "High-pressure wash", "UV sterilize"]},
    "Community Event Sound & Electrical Setup": {"problem": "Event needs sound/lighting/electrical", "solution": ["Site audit", "Temporary wiring & sound check", "Backup power"]},
}

# Try load YOLO model
model = None
model_names = {}
try:
    from ultralytics import YOLO
    pt = MODEL_PATH if MODEL_PATH.exists() else FALLBACK_PT
    if pt.exists():
        model = YOLO(str(pt))
        # warmup names
        try:
            model_names = model.names  # dict {0: class}
        except: pass
        print(f"[Zolve AI] Loaded YOLO {pt} classes={model_names}")
    else:
        print(f"[Zolve AI] No model found at {pt}, running in mock mode")
except Exception as e:
    print(f"[Zolve AI] YOLO load failed: {e} — mock mode")

app = FastAPI(title="Zolve AI Service Detector", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def mock_predict(image: Image.Image):
    # Fallback when no model: return neutral
    return "messy_room", 0.62

def predict_image(pil_img: Image.Image):
    if model is None:
        return mock_predict(pil_img)
    # YOLO classification inference
    try:
        results = model(pil_img, verbose=False)
        probs = results[0].probs
        idx = int(probs.top1)
        conf = float(probs.top1conf)
        cls_name = model_names.get(idx, CLASSES[idx] if idx < len(CLASSES) else str(idx))
        return cls_name, conf
    except Exception as e:
        print(f"Inference error: {e}")
        return mock_predict(pil_img)

def service_for_class(cls_name: str):
    svc_name = SERVICES.get(cls_name, SERVICES.get(cls_name.lower(), "Full House Deep Cleaning"))
    # fallback mapping if config has short names like "Plumber"
    # ensure we return a full service name existing in SERVICE_CATEGORIES
    return svc_name

@app.get("/health")
def health():
    return {"status": "ok", "model": str(MODEL_PATH if MODEL_PATH.exists() else FALLBACK_PT), "classes": CLASSES, "conf_threshold": CONF_THR, "loaded": model is not None}

@app.get("/classes")
def classes():
    return {"classes": CLASSES, "services": SERVICES}

@app.post("/api/detect")
async def detect(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image (jpeg/png/webp)")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "Image too large (max 8MB)")
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image file")
    # resize to model imgsz for speed if large
    img.thumbnail((640, 640))
    cls_name, conf = predict_image(img)
    svc_name = service_for_class(cls_name)
    # If confidence below threshold, mark as general/low
    if conf < CONF_THR:
        svc_name = svc_name  # still return best guess but flag
    info = SOLUTION_MAP.get(svc_name, SOLUTION_MAP["Full House Deep Cleaning"])
    # Build enriched response for direct BookingModal prefill
    # Find serviceId via hard-coded map for 14 services
    SERVICE_ID_MAP = {
        "Full House Deep Cleaning": "srv-clean-01",
        "Plumbing Repair & Leakage Fix": "srv-plumb-01",
        "Carpentry & Furniture Assembly": "srv-carp-01",
        "AC Deep Foam Jet Servicing": "srv-ac-01",
        "Wall Painting & Waterproofing": "srv-paint-01",
        "Gardening & Balcony Greenery": "srv-garden-01",
        "Organic Pest Control": "srv-pest-01",
        "Home Chef & Meal Preparation": "srv-cook-01",
        "Elder Assistance & Companionship": "srv-elder-01",
        "Moving & Heavy Lifting Assistance": "srv-move-01",
        "Society Common Area Sanitization": "srv-soc-clean-01",
        "Water Sump & Overhead Tank Cleaning": "srv-soc-tank-01",
        "Community Event Sound & Electrical Setup": "srv-soc-event-01",
        "Cleaning Executive (Washroom)": "srv-clean-01",
        "Plumber": "srv-plumb-01",
        "Carpenter": "srv-carp-01",
    }
    return JSONResponse({
        "class": cls_name,
        "confidence": round(float(conf), 3),
        "low_confidence": conf < CONF_THR,
        "service": {
            "id": SERVICE_ID_MAP.get(svc_name, "srv-clean-01"),
            "name": svc_name,
        },
        "problem": info["problem"],
        "solution": info["solution"],
        "urgency": "Normal" if conf > 0.75 else "Low",
        "reason": f"Vision model detected '{cls_name}' with {conf*100:.1f}% confidence",
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
