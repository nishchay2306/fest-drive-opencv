"""Webcam steering for Fest Drive, using the current MediaPipe Tasks API."""

import argparse
from collections import deque
import math
from pathlib import Path
import time

import cv2
import mediapipe as mp
import numpy as np
from pynput.keyboard import Controller, Key


MODEL = Path(__file__).with_name("hand_landmarker.task")
KEYS = {"left": Key.left, "right": Key.right, "up": Key.up, "down": Key.down}
DEFAULT_DEAD_ZONE = 8


def hand_shape(hand):
    """Classify a hand using scale-free tip/knuckle distance ratios."""
    wrist = hand[0]
    extended = 0
    for tip, pip in ((8, 6), (12, 10), (16, 14), (20, 18)):
        tip_distance = math.hypot(hand[tip].x - wrist.x, hand[tip].y - wrist.y)
        pip_distance = math.hypot(hand[pip].x - wrist.x, hand[pip].y - wrist.y)
        extended += tip_distance > pip_distance * 1.13
    if extended >= 4:
        return "open"
    if extended <= 1:
        return "fist"
    return "neutral"


def steering_angle(hands, frame_size=(640, 480)):
    """Angle in degrees between screen-left and screen-right wrists."""
    if len(hands) != 2:
        return None
    hands = sorted(hands, key=lambda hand: hand[0].x)
    left, right = hands
    dx = (right[0].x - left[0].x) * frame_size[0]
    dy = (right[0].y - left[0].y) * frame_size[1]
    return math.degrees(math.atan2(dy, dx))


def decide_keys(hands, dead_zone=DEFAULT_DEAD_ZONE):
    """Pure landmark-to-intent stage. Return only the keys that should be held."""
    if len(hands) != 2:
        return set()
    angle = steering_angle(hands)
    keys = set()
    if angle < -dead_zone:
        keys.add("left")
    elif angle > dead_zone:
        keys.add("right")
    left, right = sorted(hands, key=lambda hand: hand[0].x)
    shapes = (hand_shape(left), hand_shape(right))
    if shapes == ("open", "open"):
        keys.add("down")
    elif shapes == ("fist", "fist"):
        keys.add("up")
    return keys


class IntentSmoother:
    """Use a short majority vote, with immediate release on tracking loss."""

    def __init__(self, window=3):
        self.history = deque(maxlen=window)

    def update(self, wanted, two_hands_visible):
        if not two_hands_visible:
            self.history.clear()
            return set()
        self.history.append(set(wanted))
        threshold = len(self.history) // 2 + 1
        return {name for name in KEYS if sum(name in frame for frame in self.history) >= threshold}


class KeyOutput:
    def __init__(self, keyboard=None, verbose=False):
        self.keyboard = keyboard if keyboard is not None else Controller()
        self.held = set()
        self.verbose = verbose

    def update(self, wanted):
        changed = wanted != self.held
        for name in sorted(self.held - wanted):
            self.keyboard.release(KEYS[name])
            self.held.remove(name)
        for name in sorted(wanted - self.held):
            self.keyboard.press(KEYS[name])
            self.held.add(name)
        if changed and self.verbose:
            print(f"Keys held: {sorted(self.held)}", flush=True)

    def release_all(self):
        if self.held and self.verbose:
            print(f"Releasing on exit: {sorted(self.held)}", flush=True)
        for name in tuple(self.held):
            try:
                self.keyboard.release(KEYS[name])
            except Exception:
                pass
            finally:
                self.held.discard(name)


def run(camera_index, dead_zone, preview_only=False, soak_seconds=None):
    if not MODEL.is_file():
        raise SystemExit(f"Missing model: {MODEL}\nRestore controller/hand_landmarker.task from the project files.")
    capture = cv2.VideoCapture(camera_index, cv2.CAP_MSMF)
    if not capture.isOpened():
        capture.release()
        capture = cv2.VideoCapture(camera_index)
    if not capture.isOpened():
        raise SystemExit(f"Could not open camera {camera_index}. Try --camera 1.")
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    options = mp.tasks.vision.HandLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(MODEL)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_hands=2,
        min_hand_detection_confidence=0.6,
        min_tracking_confidence=0.5,
    )
    output = None if preview_only else KeyOutput(verbose=True)
    smoother = IntentSmoother()
    last_timestamp = -1
    last_report = None
    last_report_at = 0.0
    started = time.monotonic()
    fps_window = deque(maxlen=60)
    fps_rates = []
    fps_period_started = started
    fps_period_frames = 0
    total_frames = 0
    last_frame_at = None
    try:
        with mp.tasks.vision.HandLandmarker.create_from_options(options) as landmarker:
            while True:
                ok, frame = capture.read()
                if not ok:
                    if output:
                        output.release_all()
                    break
                frame = cv2.flip(frame, 1)
                frame = cv2.resize(frame, (640, 480))
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
                timestamp = max(last_timestamp + 1, time.monotonic_ns() // 1_000_000)
                last_timestamp = timestamp
                result = landmarker.detect_for_video(image, timestamp)
                frame_now = time.monotonic()
                last_frame_at = frame_now
                fps_window.append(frame_now)
                fps_period_frames += 1
                total_frames += 1
                fps = (len(fps_window) - 1) / (fps_window[-1] - fps_window[0]) if len(fps_window) > 1 else 0.0
                if frame_now - fps_period_started >= 5:
                    period_fps = fps_period_frames / (frame_now - fps_period_started)
                    fps_rates.append(period_fps)
                    if soak_seconds is not None:
                        print(f"Elapsed {frame_now - started:.0f}s | last 5s FPS {period_fps:.1f}", flush=True)
                    fps_period_started = frame_now
                    fps_period_frames = 0
                raw = decide_keys(result.hand_landmarks, dead_zone)
                wanted = smoother.update(raw, len(result.hand_landmarks) == 2)
                angle = steering_angle(result.hand_landmarks)
                direction = " + ".join(sorted(wanted)).upper() if wanted else "NEUTRAL"
                if len(result.hand_landmarks) != 2:
                    direction = "SHOW TWO HANDS"
                if output:
                    output.update(wanted)
                elif soak_seconds is None:
                    shapes = tuple(hand_shape(hand) for hand in result.hand_landmarks)
                    report = (len(shapes), shapes, tuple(sorted(raw)), tuple(sorted(wanted)))
                    now = time.monotonic()
                    if report != last_report or now - last_report_at >= 0.8:
                        angle_text = "--" if angle is None else f"{angle:+.0f}°"
                        print(
                            f"hands={len(shapes)} shapes={shapes} tilt={angle_text} "
                            f"raw={sorted(raw)} held={sorted(wanted)}",
                            flush=True,
                        )
                        last_report = report
                        last_report_at = now
                for hand in result.hand_landmarks:
                    for point in hand:
                        cv2.circle(frame, (int(point.x * 640), int(point.y * 480)), 4, (90, 220, 255), -1)
                cv2.rectangle(frame, (0, 0), (640, 72), (9, 20, 36), -1)
                cv2.putText(frame, direction, (18, 33), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (90, 230, 200), 2)
                hint = "Preview only: no keys" if preview_only else "Click game window to drive | Q here to quit"
                cv2.putText(frame, hint, (18, 59), cv2.FONT_HERSHEY_SIMPLEX, 0.47, (240, 240, 240), 1)
                if angle is not None:
                    cv2.putText(frame, f"Tilt {angle:+.0f} deg", (475, 33), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (240, 240, 240), 1)
                cv2.putText(frame, f"FPS {fps:.1f}", (18, 456), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (90, 230, 200), 2)
                cv2.imshow("Fest Drive steering", frame)
                if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                    break
                if soak_seconds is not None and frame_now - started >= soak_seconds:
                    break
    finally:
        if output:
            output.release_all()
        capture.release()
        cv2.destroyAllWindows()
        if soak_seconds is not None and total_frames:
            elapsed = last_frame_at - started
            summary = f"Soak ended: {total_frames} frames in {elapsed:.1f}s | average {total_frames / elapsed:.1f} FPS"
            if fps_rates:
                summary += (
                    f" | first 5s {fps_rates[0]:.1f} FPS"
                    f" | last 5s {fps_rates[-1]:.1f} FPS"
                    f" | lowest 5s {min(fps_rates):.1f} FPS"
                )
            print(summary, flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Control Fest Drive using hand gestures")
    parser.add_argument("--camera", type=int, default=0, help="Camera index (default: 0)")
    parser.add_argument("--dead-zone", type=float, default=DEFAULT_DEAD_ZONE, help="Steering angle dead zone in degrees")
    parser.add_argument("--preview-only", action="store_true", help="Show hand dots and print intent without pressing keys")
    parser.add_argument("--soak-seconds", type=int, help="Preview without keys for this many seconds; print FPS every 5 seconds")
    args = parser.parse_args()
    if args.soak_seconds is not None and args.soak_seconds <= 0:
        parser.error("--soak-seconds must be positive")
    try:
        run(args.camera, args.dead_zone, args.preview_only or args.soak_seconds is not None, args.soak_seconds)
    except KeyboardInterrupt:
        print("Controller stopped; keys released.")
