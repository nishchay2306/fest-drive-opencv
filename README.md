# Fest Drive

A 60-second webcam steering challenge for a college fest, inspired by Jayesh Vishwakarma's [virtual steering wheel](https://github.com/jayesh-cmd/virtual-steering-wheel). The camera, hand tracking, game, and leaderboard now run together in Chrome or Edge.

## Present from another laptop

Install [Git](https://git-scm.com/downloads) and Python 3 on the presentation laptop, then clone this repository and launch the game:

```powershell
git clone https://github.com/nishchay2306/fest-drive-opencv.git
cd fest-drive-opencv
python start_game.py
```

On Windows, `py start_game.py` also works if `python` is unavailable. On macOS or Linux, use `python3 start_game.py`. Open the printed local URL in Chrome or Edge if the browser does not open automatically. Keep the terminal running, grant camera permission, and use **Start camera** then **Start race**. The browser needs a working webcam and local camera permission. The included browser game needs no `pip install` or internet connection after cloning. If camera setup is delayed, the arrow keys can drive the game for a presentation.

Scores stay in that laptop's browser and do not transfer with the repository. For a quick handoff, follow [REHEARSAL.md](REHEARSAL.md) to check camera placement and lighting before presenting.

## Play

From this project folder, run:

```powershell
python start_game.py
```

The script opens a local game page. Keep its terminal open while playing.

1. Click **Start camera** on the game page and allow camera access in the browser.
2. Check that the mirrored preview shows dots on both hands and says **NEUTRAL** or a direction. Stand close enough that a bystander's hands do not replace yours.
3. Click **Start race**. Hold **two fists** to accelerate, tilt the line between your wrists to steer, and open **both hands** to brake. A missing hand releases the gesture controls immediately.
4. After 60 seconds, enter a name to save the score. The operator can then start the next run.
5. Click **Stop camera** when finished. Ctrl+C in the server terminal closes the local site.

The keyboard remains a fallback: **Up** accelerates, **Down** brakes, **Left/Right** steer, **Space** starts a race, and **F** enters fullscreen. Use **Clear scores** before opening a new leaderboard. Scores are stored only in this browser.

The local server is needed to load the bundled hand-tracking model and WebAssembly files. It uses `127.0.0.1`, which browsers treat as a secure context for camera permission. The game needs no internet connection or Python packages once this folder is set up. The browser processes camera frames on this computer; they are not uploaded.

## If the camera does not drive the car

- Check the browser's camera permission and look for two sets of 21 dots in the preview.
- Check the status under the preview: two fists should show **UP**, open hands **DOWN**, and a tilt **LEFT** or **RIGHT**.
- If the timer does not move, click **Start race**. If the timer moves but the car does not, try the physical arrow keys and reload the page.
- If another app owns the webcam, close it and click **Start camera** again. Do not run the older Python controller at the same time.

Steering begins at 8° of wrist tilt, with a three-frame majority vote. These settings were accepted in the earlier Python-controller rehearsal and are now mirrored in [controls.mjs](game/controls.mjs). Rehearse the browser version at the actual booth before changing them. [REHEARSAL.md](REHEARSAL.md) has the player and lighting checklist.

## Project structure

| Path | Purpose |
| --- | --- |
| `start_game.py` | Starts the local site and opens it in the browser |
| `game/index.html`, `game/style.css` | Game and camera interface |
| `game/game.js` | Racing loop, score, leaderboard, and input state |
| `game/camera.mjs` | Browser camera capture, MediaPipe tracking, mirrored preview |
| `game/controls.mjs` | Pure gesture decisions and smoothing |
| `game/models/hand_landmarker.task` | Local hand-tracking model |
| `game/vendor/mediapipe/` | MediaPipe Tasks Vision 1.2.3 browser runtime, Apache 2.0 |
| `controller/steering.py` | Earlier standalone Windows controller, kept as a fallback |
| `REHEARSAL.md` | Booth test results and checklist |

MediaPipe's [Hand Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js) documents the browser task used here. The bundled MediaPipe runtime is Apache 2.0 licensed; its license text is in `game/vendor/mediapipe/LICENSE-2.0.txt`.

## Checks

```powershell
node --test tests/browser_controls.test.mjs
node --check game/game.js
node --check game/camera.mjs
```

The earlier Python controller's tests still run with `.\.venv\Scripts\python.exe -m unittest discover -s tests -q` if its packages are installed. To use that controller instead, run `.\.venv\Scripts\python.exe controller\steering.py`, then click the game window. It sends arrow keys to the focused window; the built-in browser camera does not need it.
