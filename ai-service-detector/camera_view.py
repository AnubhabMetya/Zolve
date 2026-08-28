import cv2

print("Starting camera...")

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

if not cap.isOpened():
    print("ERROR: Camera cannot be opened")
    input("Press Enter to exit...")
    exit()

print("Camera opened successfully")
print("A camera window should appear now.")
print("Press Q INSIDE THE CAMERA WINDOW to quit.")

cv2.namedWindow("Camera Test", cv2.WINDOW_NORMAL)
cv2.resizeWindow("Camera Test", 800, 600)

while True:
    ret, frame = cap.read()

    if not ret:
        print("Could not read frame")
        break

    cv2.imshow("Camera Test", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
cv2.waitKey(1)

print("Camera test finished.")