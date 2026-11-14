import test from "node:test";
import assert from "node:assert/strict";
import { decideControls, handShape, IntentSmoother } from "../game/controls.mjs";

function hand(x, y, extended = 0) {
  const points = Array.from({ length: 21 }, () => ({ x, y }));
  [[8, 6], [12, 10], [16, 14], [20, 18]].forEach(([tip, knuckle], index) => {
    points[knuckle] = { x, y: y - 0.05 };
    points[tip] = { x, y: y - (index < extended ? 0.12 : 0.03) };
  });
  return points;
}

const controls = hands => [...decideControls(hands, { width: 640, height: 480 })].sort();

test("fists accelerate while steering left", () => {
  assert.deepEqual(controls([hand(0.7, 0.3), hand(0.3, 0.6)]), ["left", "up"]);
});

test("open hands brake and can steer", () => {
  assert.deepEqual(controls([hand(0.3, 0.3, 4), hand(0.7, 0.6, 4)]), ["down", "right"]);
});

test("neutral hands and small tilt do not drive", () => {
  assert.equal(handShape(hand(0.3, 0.5, 2)), "neutral");
  assert.deepEqual(controls([hand(0.3, 0.5, 2), hand(0.7, 0.52, 2)]), []);
});

test("one missing hand releases every gesture", () => {
  assert.deepEqual(controls([hand(0.3, 0.5)]), []);
});

test("three-frame vote ignores one bad frame but switches after two", () => {
  const smoother = new IntentSmoother();
  for (let i = 0; i < 3; i++) smoother.update(new Set(["left", "up"]), true);
  assert.deepEqual([...smoother.update(new Set(["right"]), true)].sort(), ["left", "up"]);
  assert.deepEqual([...smoother.update(new Set(["right"]), true)], ["right"]);
  assert.deepEqual([...smoother.update(new Set(), false)], []);
});
