export const DEAD_ZONE_DEGREES = 8;
const FINGERS = [[8, 6], [12, 10], [16, 14], [20, 18]];
const CONTROL_NAMES = ["left", "right", "up", "down"];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function handShape(hand) {
  const wrist = hand[0];
  const extended = FINGERS.filter(([tip, knuckle]) =>
    distance(hand[tip], wrist) > distance(hand[knuckle], wrist) * 1.13
  ).length;
  if (extended >= 4) return "open";
  if (extended <= 1) return "fist";
  return "neutral";
}

export function steeringAngle(hands, frameSize = { width: 640, height: 480 }) {
  if (hands.length !== 2) return null;
  const [left, right] = [...hands].sort((a, b) => a[0].x - b[0].x);
  const dx = (right[0].x - left[0].x) * frameSize.width;
  const dy = (right[0].y - left[0].y) * frameSize.height;
  return Math.atan2(dy, dx) * 180 / Math.PI;
}

export function decideControls(hands, frameSize, deadZone = DEAD_ZONE_DEGREES) {
  if (hands.length !== 2) return new Set();
  const angle = steeringAngle(hands, frameSize);
  const wanted = new Set();
  if (angle < -deadZone) wanted.add("left");
  else if (angle > deadZone) wanted.add("right");
  const shapes = [...hands].sort((a, b) => a[0].x - b[0].x).map(handShape);
  if (shapes.every(shape => shape === "open")) wanted.add("down");
  else if (shapes.every(shape => shape === "fist")) wanted.add("up");
  return wanted;
}

export class IntentSmoother {
  constructor(windowSize = 3) {
    this.windowSize = windowSize;
    this.history = [];
  }

  update(wanted, twoHandsVisible) {
    if (!twoHandsVisible) {
      this.history = [];
      return new Set();
    }
    this.history.push(new Set(wanted));
    if (this.history.length > this.windowSize) this.history.shift();
    const majority = Math.floor(this.history.length / 2) + 1;
    return new Set(CONTROL_NAMES.filter(name =>
      this.history.filter(frame => frame.has(name)).length >= majority
    ));
  }
}
