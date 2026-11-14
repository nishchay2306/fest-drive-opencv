"""Manual OS-key cleanup probe. Run, then send Ctrl+C while LEFT is held."""

import sys
from pathlib import Path
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "controller"))
from steering import KeyOutput


output = KeyOutput(verbose=True)
try:
    output.update({"left"})
    print("LEFT is held; interrupt this process now.", flush=True)
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Interrupted.", flush=True)
finally:
    output.release_all()
