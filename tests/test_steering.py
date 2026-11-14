import sys
from pathlib import Path
from types import SimpleNamespace
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "controller"))
from steering import IntentSmoother, KeyOutput, KEYS, decide_keys, hand_shape


def hand(x, y, extended=0):
    points = [SimpleNamespace(x=x, y=y) for _ in range(21)]
    for index, (tip, pip) in enumerate(((8, 6), (12, 10), (16, 14), (20, 18))):
        points[pip] = SimpleNamespace(x=x, y=y - 0.05)
        points[tip] = SimpleNamespace(x=x, y=y - (0.12 if index < extended else 0.03))
    return points


class SteeringTests(unittest.TestCase):
    def test_missing_hand_releases_controls(self):
        self.assertEqual(decide_keys([hand(0.3, 0.5)]), set())

    def test_fists_accelerate_and_tilt_left(self):
        self.assertEqual(decide_keys([hand(0.7, 0.3), hand(0.3, 0.6)]), {"up", "left"})

    def test_open_palms_brake(self):
        self.assertEqual(decide_keys([hand(0.3, 0.5, 4), hand(0.7, 0.5, 4)]), {"down"})

    def test_neutral_hands_and_dead_zone(self):
        self.assertEqual(hand_shape(hand(0.3, 0.5, 2)), "neutral")
        self.assertEqual(decide_keys([hand(0.3, 0.5, 2), hand(0.7, 0.52, 2)]), set())

    def test_small_deliberate_tilt_starts_steering(self):
        self.assertEqual(decide_keys([hand(0.3, 0.5), hand(0.7, 0.585)]), {"up", "right"})

    def test_steer_and_brake_together(self):
        self.assertEqual(decide_keys([hand(0.3, 0.3, 4), hand(0.7, 0.6, 4)]), {"right", "down"})

    def test_smoothing_ignores_one_flicker_and_releases_on_loss(self):
        smoother = IntentSmoother()
        for _ in range(5):
            self.assertEqual(smoother.update({"up", "left"}, True), {"up", "left"})
        self.assertEqual(smoother.update({"right"}, True), {"up", "left"})
        self.assertEqual(smoother.update(set(), False), set())

    def test_smoothing_switches_after_two_consistent_frames(self):
        smoother = IntentSmoother()
        for _ in range(3):
            smoother.update({"left"}, True)
        self.assertEqual(smoother.update({"right"}, True), {"left"})
        self.assertEqual(smoother.update({"right"}, True), {"right"})

    def test_output_only_sends_key_transitions(self):
        class FakeKeyboard:
            def __init__(self):
                self.events = []

            def press(self, key):
                self.events.append(("press", key))

            def release(self, key):
                self.events.append(("release", key))

        fake = FakeKeyboard()
        output = KeyOutput(fake)
        output.update({"up"})
        output.update({"up"})
        output.update({"right"})
        output.release_all()
        self.assertEqual(fake.events, [
            ("press", KEYS["up"]),
            ("release", KEYS["up"]),
            ("press", KEYS["right"]),
            ("release", KEYS["right"]),
        ])


if __name__ == "__main__":
    unittest.main()
