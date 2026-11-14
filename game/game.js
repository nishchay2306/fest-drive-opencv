(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const overlay = document.querySelector("#overlay");
  const panel = document.querySelector("#panel");
  const timeEl = document.querySelector("#time");
  const scoreEl = document.querySelector("#score");
  const distanceEl = document.querySelector("#distance");
  const leaderboardEl = document.querySelector("#leaderboard");
  const W = canvas.width, H = canvas.height;
  const ROAD_LEFT = 250, ROAD_RIGHT = 710;
  const DURATION = 60;
  const STORAGE_KEY = "fest-drive-scores-v1";
  const keys = new Set();
  const cameraKeys = new Set();
  let state = "ready";
  let game = null;
  let lastFrame = performance.now();
  let seed = 19;

  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function readScores() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter(v => typeof v.name === "string" && Number.isFinite(v.score)).slice(0, 10) : [];
    } catch { return []; }
  }

  function renderScores() {
    leaderboardEl.replaceChildren();
    const scores = readScores();
    if (!scores.length) {
      const li = document.createElement("li");
      li.textContent = "First driver takes the lead!";
      leaderboardEl.append(li);
      return;
    }
    scores.forEach((entry, i) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      const score = document.createElement("span");
      name.textContent = `${i + 1}. ${entry.name}`;
      score.textContent = Math.floor(entry.score).toLocaleString();
      li.append(name, score);
      leaderboardEl.append(li);
    });
  }

  function showReady() {
    state = "ready";
    overlay.classList.remove("hidden");
    panel.innerHTML = '<span class="eyebrow">60-second challenge</span><h2>Ready to race?</h2><p>Start the camera on the right, allow access, then drive with your hands. Collect stars, dodge cones, and go as far as you can.</p><button class="primary" id="start" type="button">Start race · Space</button>';
    panel.querySelector("#start").addEventListener("click", start);
    timeEl.textContent = String(DURATION);
    scoreEl.textContent = "0";
    distanceEl.textContent = "0 m";
  }

  function start() {
    keys.clear();
    cameraKeys.clear();
    game = {x: W / 2, speed: 0, distance: 0, stars: 0, hits: 0, objects: [], spawn: 0.8, scroll: 0, invulnerable: 0, endsAt: performance.now() + DURATION * 1000};
    state = "running";
    overlay.classList.add("hidden");
    canvas.focus();
  }

  function totalScore() {
    return Math.max(0, Math.floor(game.distance + game.stars * 100 - game.hits * 100));
  }

  function finish() {
    state = "finished";
    keys.clear();
    cameraKeys.clear();
    const score = totalScore();
    overlay.classList.remove("hidden");
    panel.innerHTML = '<span class="eyebrow">Finish line</span><h2>Race complete!</h2><p id="result"></p><form id="save-form"><input id="driver-name" maxlength="16" placeholder="Driver name" aria-label="Driver name" required autocomplete="off"><button class="primary" type="submit">Save score</button></form><button class="text-button" id="again" type="button">Race again</button>';
    panel.querySelector("#result").textContent = `${score.toLocaleString()} points · ${Math.floor(game.distance)} m · ${game.stars} stars`;
    panel.querySelector("#save-form").addEventListener("submit", event => {
      event.preventDefault();
      const name = panel.querySelector("#driver-name").value.trim().slice(0, 16);
      if (!name) return;
      const scores = readScores();
      scores.push({name, score});
      scores.sort((a, b) => b.score - a.score);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, 10))); }
      catch { panel.querySelector("#result").textContent += " · Browser could not save this score"; return; }
      renderScores();
      showReady();
    });
    panel.querySelector("#again").addEventListener("click", start);
    panel.querySelector("#driver-name").focus();
  }

  function spawnObject() {
    const lanes = [ROAD_LEFT + 78, ROAD_LEFT + 230, ROAD_RIGHT - 78];
    const lane = Math.floor(random() * lanes.length);
    const kind = random() < 0.4 ? "star" : "cone";
    game.objects.push({x: lanes[lane], y: -40, kind});
    game.spawn = Math.max(0.48, 1.05 - game.speed / 600) + random() * 0.38;
  }

  function update(dt, now) {
    if (now >= game.endsAt) { finish(); return; }
    const pressed = code => keys.has(code) || cameraKeys.has(code);
    const up = pressed("ArrowUp"), down = pressed("ArrowDown");
    game.speed += (up ? 255 : down ? -400 : -115) * dt;
    game.speed = Math.max(0, Math.min(310, game.speed));
    const turn = (pressed("ArrowRight") ? 1 : 0) - (pressed("ArrowLeft") ? 1 : 0);
    game.x = Math.max(ROAD_LEFT + 38, Math.min(ROAD_RIGHT - 38, game.x + turn * 320 * dt));
    game.distance += game.speed * dt / 5;
    game.scroll = (game.scroll + game.speed * dt * 1.8) % 90;
    game.invulnerable = Math.max(0, game.invulnerable - dt);
    game.spawn -= dt;
    if (game.spawn <= 0) spawnObject();
    for (const item of game.objects) {
      item.y += (145 + game.speed * 1.45) * dt;
      if (Math.abs(item.x - game.x) < 43 && Math.abs(item.y - 490) < 45) {
        if (item.kind === "star") game.stars++;
        else if (game.invulnerable <= 0) { game.hits++; game.speed *= 0.45; game.invulnerable = 1.3; }
        item.y = H + 100;
      }
    }
    game.objects = game.objects.filter(item => item.y < H + 40);
    timeEl.textContent = String(Math.max(0, Math.ceil((game.endsAt - now) / 1000)));
    scoreEl.textContent = totalScore().toLocaleString();
    distanceEl.textContent = `${Math.floor(game.distance)} m`;
  }

  function roundRect(x, y, w, h, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  }

  function draw() {
    const scroll = game ? game.scroll : (performance.now() / 35) % 90;
    ctx.fillStyle = "#153b41";
    ctx.fillRect(0, 0, W, H);
    for (let y = -80 + scroll; y < H + 80; y += 90) {
      roundRect(95, y, 12, 48, 6, "#285e57");
      roundRect(845, y + 30, 12, 48, 6, "#285e57");
    }
    ctx.fillStyle = "#25334b";
    ctx.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, H);
    ctx.fillStyle = "#ebf0f0";
    ctx.fillRect(ROAD_LEFT + 9, 0, 7, H);
    ctx.fillRect(ROAD_RIGHT - 16, 0, 7, H);
    for (let y = -80 + scroll; y < H + 80; y += 90) {
      roundRect(ROAD_LEFT + 152, y, 6, 44, 3, "#bdcad498");
      roundRect(ROAD_LEFT + 304, y, 6, 44, 3, "#bdcad498");
    }
    if (game) {
      for (const item of game.objects) {
        if (item.kind === "cone") {
          ctx.fillStyle = "#ff824b";
          ctx.beginPath(); ctx.moveTo(item.x, item.y - 23); ctx.lineTo(item.x - 19, item.y + 19); ctx.lineTo(item.x + 19, item.y + 19); ctx.closePath(); ctx.fill();
          roundRect(item.x - 13, item.y + 4, 26, 5, 2, "#fff2ca");
        } else {
          ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 11 : 23; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fillStyle = "#ffce58"; ctx.shadowBlur = 20; ctx.shadowColor = "#ffce58"; ctx.fill(); ctx.restore();
        }
      }
    }
    const x = game ? game.x : W / 2;
    const blinking = game && game.invulnerable > 0 && Math.floor(performance.now() / 90) % 2;
    if (!blinking) {
      ctx.save(); ctx.translate(x, 490);
      roundRect(-36, -44, 72, 92, 14, "#07122088");
      roundRect(-31, -49, 62, 90, 13, "#ffca5c");
      roundRect(-22, -20, 44, 37, 8, "#173951");
      roundRect(-25, -42, 16, 9, 3, "#f8faff"); roundRect(9, -42, 16, 9, 3, "#f8faff");
      roundRect(-25, 31, 15, 7, 3, "#ff5969"); roundRect(10, 31, 15, 7, 3, "#ff5969");
      ctx.restore();
    }
    if (state !== "running") {
      ctx.fillStyle = "#ffffff14";
      ctx.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, H);
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (state === "running") update(dt, now);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", event => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code) && event.target.tagName !== "INPUT") event.preventDefault();
    if (event.code === "KeyF" && event.target.tagName !== "INPUT") document.querySelector(".shell").requestFullscreen?.();
    if (event.code === "Space" && state === "ready" && event.target.tagName !== "INPUT") start();
    if (event.code.startsWith("Arrow") && state === "running") keys.add(event.code);
  });
  window.addEventListener("keyup", event => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());
  window.addEventListener("festdrive:controls", event => {
    cameraKeys.clear();
    const codes = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" };
    for (const name of event.detail) if (codes[name]) cameraKeys.add(codes[name]);
  });
  document.querySelector("#fullscreen").addEventListener("click", () => document.querySelector(".shell").requestFullscreen?.());
  document.querySelector("#clear-scores").addEventListener("click", () => {
    if (!confirm("Clear all local leaderboard scores?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    renderScores();
  });
  canvas.tabIndex = 0;
  renderScores();
  showReady();
  requestAnimationFrame(frame);
})();
