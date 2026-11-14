# Fest Drive plan

## Goal

Give each visitor a quick, understandable challenge: steer a car using hand gestures, finish a 60-second run, and see their name on the leaderboard. Show the game on a large screen with the webcam at hand height.

## Milestones

1. **Playable booth game:** keyboard driving, obstacles, collectables, 60-second timer, scoring, fullscreen, and a local leaderboard.
2. **Gesture integration:** camera capture and hand tracking are built into the game page; tune camera position, lighting, and steering dead zone on the event laptop.
3. **Fest polish:** add the fest name and colors, short on-screen instructions, sound if the venue permits it, and a clear queue/turn procedure.
4. **Event rehearsal:** test at least 10 consecutive players, record any camera or focus failures, and keep a keyboard ready as backup.

## Visitor flow

1. Operator starts the local site, clicks **Start camera**, allows access, and selects **Start race**.
2. Visitor holds both hands in view; fists accelerate, hand tilt steers, open palms brake.
3. Timer ends after 60 seconds. Visitor enters a short name.
4. Operator starts the next run.

## Current calibration and live checks

- Steering begins at 8° of wrist tilt. The game car moves sideways at a constant 320 canvas pixels per second. Gesture decisions use a three-frame majority vote.
- On the development laptop, the webcam and MediaPipe detected two real hands. Fists, open palms, left/right tilt, and one-hand loss were checked in preview mode.
- Synthetic arrow keys moved the Notepad caret and drove the game. The Q exit path released held Left and Up keys. A controlled Ctrl+C probe released a held Left key.
- The user accepted these steering settings for the demo. Rehearse again under fest lighting and with the final webcam placement.
- A plugged-in, preview-only ten-minute run on the development laptop completed at 29.8 FPS overall (28.7 FPS in the first five-second interval; 29.9 FPS in the last). See `REHEARSAL.md` for the brief FPS dips and remaining live checks.
- At the venue placement, a 60-second preview averaged 29.5 FPS; the player remained tracked while a bystander waved behind. The user reported five full player runs without steering, tracking, or focus trouble. The controller was stopped afterward and all arrow keys were up.
- The browser version now includes the camera and mirrors the accepted gesture rules. The user completed a browser-camera race and reported responsive controls; clicking **Stop camera** during a turn stopped the car. The earlier five-player and ten-minute checks were with the Python controller, so those should be repeated in the browser before the booth opens.

## Decisions still needed for the booth

- Fest name/logo and screen size.
- Windows or macOS event laptop and webcam model.
- Whether prizes use highest score, farthest distance, or both.
