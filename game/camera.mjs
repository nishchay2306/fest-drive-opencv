import { FilesetResolver, HandLandmarker } from "./vendor/mediapipe/package/vision_bundle.mjs";
import { decideControls, IntentSmoother, steeringAngle } from "./controls.mjs";

const button = document.querySelector("#camera-toggle");
const status = document.querySelector("#camera-status");
const preview = document.querySelector("#camera-preview");
const video = document.querySelector("#camera-video");
const context = preview.getContext("2d");
const smoother = new IntentSmoother();

let stream = null;
let landmarker = null;
let frameRequest = null;
let starting = false;
let previousVideoTime = -1;
let previousTimestamp = -1;
let frameTimes = [];

function sendControls(keys) {
  window.dispatchEvent(new CustomEvent("festdrive:controls", { detail: [...keys] }));
}

function setStatus(message) {
  status.textContent = message;
}

function stopCamera(message = "Camera off") {
  if (frameRequest !== null) cancelAnimationFrame(frameRequest);
  frameRequest = null;
  smoother.update(new Set(), false);
  sendControls(new Set());
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  try { landmarker?.close(); }
  catch (error) { console.warn("Could not close hand tracker cleanly", error); }
  landmarker = null;
  context.clearRect(0, 0, preview.width, preview.height);
  button.textContent = "Start camera";
  button.disabled = false;
  setStatus(message);
}

function drawPreview(hands) {
  context.save();
  context.translate(preview.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, preview.width, preview.height);
  context.restore();
  context.fillStyle = "#65e4d0";
  for (const hand of hands) {
    for (const point of hand) {
      context.beginPath();
      context.arc(point.x * preview.width, point.y * preview.height, 3, 0, 2 * Math.PI);
      context.fill();
    }
  }
}

function processFrame() {
  if (!stream || !landmarker) return;
  try {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== previousVideoTime) {
      previousVideoTime = video.currentTime;
      const timestamp = Math.max(previousTimestamp + 1, Math.floor(performance.now()));
      previousTimestamp = timestamp;
      const result = landmarker.detectForVideo(video, timestamp);
      const hands = result.landmarks.map(hand => hand.map(point => ({ x: 1 - point.x, y: point.y })));
      const frameSize = { width: video.videoWidth, height: video.videoHeight };
      const wanted = decideControls(hands, frameSize);
      const held = smoother.update(wanted, hands.length === 2);
      sendControls(held);
      drawPreview(hands);

      const now = performance.now();
      frameTimes.push(now);
      frameTimes = frameTimes.filter(time => now - time < 1000);
      const fps = frameTimes.length;
      const angle = steeringAngle(hands, frameSize);
      const direction = hands.length !== 2 ? "Show two hands" :
        held.size ? [...held].join(" + ").toUpperCase() : "NEUTRAL";
      setStatus(`${direction} · ${angle === null ? "--" : `${Math.round(angle)}°`} · ${fps} FPS`);
    }
    frameRequest = requestAnimationFrame(processFrame);
  } catch (error) {
    console.error("Camera tracking stopped", error);
    stopCamera("Tracking stopped. Try Start camera again.");
  }
}

async function startCamera() {
  if (starting || stream) return;
  starting = true;
  button.disabled = true;
  setStatus("Waiting for camera permission…");
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access requires localhost or HTTPS.");
    }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 640 }, height: { ideal: 480 }, aspectRatio: { ideal: 4 / 3 }, frameRate: { ideal: 30 } },
    });
    video.srcObject = stream;
    await video.play();
    stream.getVideoTracks()[0].addEventListener("ended", () => stopCamera("Camera disconnected"), { once: true });
    setStatus("Loading hand tracker…");
    const vision = await FilesetResolver.forVisionTasks("./vendor/mediapipe/package/wasm");
    landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "./models/hand_landmarker.task", delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    previousVideoTime = -1;
    previousTimestamp = -1;
    frameTimes = [];
    button.textContent = "Stop camera";
    button.disabled = false;
    setStatus("Show both hands");
    frameRequest = requestAnimationFrame(processFrame);
  } catch (error) {
    console.error("Could not start camera", error);
    stopCamera(error.message || "Could not start camera");
  } finally {
    starting = false;
  }
}

button.addEventListener("click", () => stream ? stopCamera() : startCamera());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    smoother.update(new Set(), false);
    sendControls(new Set());
  }
});
window.addEventListener("pagehide", () => stopCamera());
