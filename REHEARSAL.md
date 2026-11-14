# Fest Drive booth rehearsal

Use the event laptop, webcam, screen, and lighting in their planned positions. Start the integrated browser game with `python start_game.py`, then click **Start camera**. Keep the current 8° steering dead zone and three-frame smoothing during the first pass so every player is testing the same setup. The results recorded below came from the earlier standalone Python controller; repeat the player checks with the browser camera before the booth opens.

## Player runs

Ask at least five people with different heights and hand positions to play a full 60-second run. Explain only the visible rules: two fists accelerate, tilt to steer, two open hands brake. Note whether each player overshoots turns, must tilt too far, or loses tracking. Change a threshold only if the same problem affects several players.

| Player | 60s completed? | Turns too early / too late? | Hand tracking drops? | Score or notes |
| --- | --- | --- | --- | --- |
| 1 | Yes, reported | No issue reported | No issue reported | |
| 2 | Yes, reported | No issue reported | No issue reported | |
| 3 | Yes, reported | No issue reported | No issue reported | |
| 4 | Yes, reported | No issue reported | No issue reported | |
| 5 | Yes, reported | No issue reported | No issue reported | |

## Venue checks

- **Lighting:** Watch the FPS under the browser camera preview for one minute in the planned lighting. Keep the webcam facing away from windows or lights behind the player. In dim light, check whether fast hand movements blur and lose the dots.
- **Bystanders:** Have someone wave behind the player while the browser camera is running. Watch whether the two tracked hands switch to the bystander. If they do, move the webcam closer and mark the player's standing spot before changing tracking code.
- **Long run:** With AC power connected, leave the browser camera running for ten minutes. Compare the early and late FPS and note any tracking loss or camera failure.
- **Browser controls:** Start a race, drive using gestures, stop the camera during a turn, and check that the car stops turning. Reload the page and check that the camera turns off. Enable Windows Do Not Disturb for the event.

## Operator flow

1. Run `python start_game.py`, click **Start camera**, allow access, and check the mirrored hand dots.
2. Clear scores immediately before visitors begin, if this is a new leaderboard.
3. The operator starts each run with Space or the Start button. The visitor drives with gestures.
4. After 60 seconds, the operator helps enter the visitor's name and save the score. Keep a keyboard under the table for this and as a driving fallback.
5. If steering is lost, check for two visible hands and the camera status. Click **Stop camera** when the booth closes; gesture controls should clear immediately.

## Results

### Development laptop check — 12 November 2026

- AC power confirmed connected by Windows.
- Ten-minute, preview-only webcam run completed: 17,893 frames in 600.0 seconds, 29.8 FPS overall.
- First / last / lowest five-second intervals: 28.7 / 29.9 / 21.7 FPS. The 21.7 FPS dip occurred once around minute three; subsequent intervals returned to about 30 FPS. A smaller 27.9 FPS dip around minute seven also recovered.
- This measured sustained capture and tracking processing on the current laptop in its current room. Player variety, venue lighting, bystanders, and full game focus still need rehearsal.

### Venue placement check — 12 November 2026

- One-minute preview-only run: 1,771 frames in 60.0 seconds, 29.5 FPS overall; first / last / lowest five-second intervals: 28.7 / 29.6 / 28.7 FPS.
- With another person waving behind the player, the hand dots stayed on the player. The user reported stable dots without visible blur or dropout.
- The user reported that five people completed full runs with no steering, tracking, or focus issues. The controller logged left/right/accelerate/brake key transitions during the trials.
- After the trials, the controller process exited and Windows reported all four arrow keys released.

### Integrated browser camera check — 12 November 2026

- Chrome loaded the local MediaPipe runtime and model from the project folder and showed the webcam preview inside Fest Drive.
- The user completed a race using fists and wrist tilts and reported that the car responded well.
- In a second race, the user clicked **Stop camera** while turning and reported that the car stopped immediately.
- One observed browser status reading was about 16 FPS. A longer browser-camera run and the five-player check have not yet been repeated with this version.
- The one-command launcher also opened the game at `http://127.0.0.1:8000/` in the default browser (Edge); its camera status showed tracking at about 24 FPS during a race.

Date and location:

Laptop, camera, and AC power:

Lighting and camera direction:

Five-second FPS first / last / lowest:

Bystander result:

Repeated player issue, if any:

Change made and retest result:
