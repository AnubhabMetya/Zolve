import cv2
from ultralytics import YOLO

MODEL_PATH = "models/best.pt"

print("[INFO] Loading YOLO model...")

model = YOLO(MODEL_PATH)

print("[INFO] Model loaded!")
print("[INFO] Opening camera...")

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

if not cap.isOpened():
    print("[ERROR] Camera could not be opened.")
    input("Press Enter to exit...")
    exit()

print("[INFO] Camera opened!")
print("[INFO] Starting live detection...")
print("[INFO] Press Q to quit.")

while True:

    ret, frame = cap.read()

    if not ret:
        print("[ERROR] Failed to read camera frame.")
        break

    # Run YOLO
    results = model(frame, verbose=False)

    result = results[0]

    # Classification model
    if result.probs is not None:

        class_id = result.probs.top1
        confidence = float(result.probs.top1conf)

        class_name = result.names[class_id]

        text = f"{class_name} - {confidence * 100:.1f}%"

        cv2.putText(
            frame,
            text,
            (20, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )

    # Display camera
    cv2.imshow("Zolve - Messy Room Detector", frame)

    # Q = quit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()