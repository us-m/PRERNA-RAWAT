/*
  Find the Modak
  A small, modular maze game. The maze is generated with recursive
  backtracking, so every level is a fresh perfect maze with one connected path.
*/
(() => {
  "use strict";

  const LEVELS = [
    { size: 8, cats: 0, collectibles: 2, time: 60, name: "Courtyard" },
    { size: 10, cats: 1, collectibles: 3, time: 70, name: "Lantern lane" },
    { size: 12, cats: 2, collectibles: 4, time: 80, name: "Pandal paths" },
    { size: 14, cats: 2, collectibles: 5, time: 90, name: "Spark street" },
    { size: 16, cats: 3, collectibles: 6, time: 100, name: "Grand finale" }
  ];
  const MOVES = {
    up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
    ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    w: [-1, 0], W: [-1, 0], s: [1, 0], S: [1, 0],
    a: [0, -1], A: [0, -1], d: [0, 1], D: [0, 1]
  };
  const WALLS = ["top", "right", "bottom", "left"];
  const OPPOSITE = { top: "bottom", right: "left", bottom: "top", left: "right" };
  const DIRECTIONS = {
    top: [-1, 0], right: [0, 1], bottom: [1, 0], left: [0, -1]
  };

  const $ = id => document.getElementById(id);
  const mazeElement = $("maze");
  const modalBackdrop = $("modalBackdrop");
  const modalSymbol = $("modalSymbol");
  const modalKicker = $("modalKicker");
  const modalTitle = $("modalTitle");
  const modalCopy = $("modalCopy");
  const modalFootnote = $("modalFootnote");
  const howTo = $("howTo");
  const startLevels = $("startLevels");
  const modalPrimaryButton = $("modalPrimaryButton");
  const timerValue = $("timerValue");
  const scoreValue = $("scoreValue");
  const levelValue = $("levelValue");
  const levelName = $("levelName");
  const progressBar = $("progressBar");
  const pauseButton = $("pauseButton");
  const soundButton = $("soundButton");
  const stageBanner = $("stageBanner");
  const tutorialTip = $("tutorialTip");
  const tutorialText = $("tutorialText");

  let state = "start";
  let currentLevel = 0;
  let score = 0;
  let bestScore = Number(localStorage.getItem("findTheModakBest") || 0);
  let remainingTime = LEVELS[0].time;
  let levelElapsed = 0;
  let totalTime = 0;
  let maze = [];
  let player = { r: 0, c: 0 };
  let startCell = { r: 0, c: 0 };
  let goal = { r: 0, c: 0 };
  let collectibles = [];
  let cats = [];
  let sparks = [];
  let timerId = null;
  let animationId = null;
  let soundOn = false;
  let audioContext = null;
  let swipeStart = null;
  let noticeTimeout = null;
  let tutorialTimeout = null;
  let tutorialActive = false;
  let tutorialKey = null;
  let tutorialDismissOnInput = true;
  let timerStarted = false;
  let tutorialSeen = {
    level1: false,
    level2: false,
    level3: false,
    level4: false,
    level5: false
  };
  const MOVE_DURATION = 170;
  let movement = null;
  let movementTimeout = null;
  let inputQueue = [];
  const heldDirections = new Set();
  const repeatTimers = new Map();
  let cellElements = [];
  const playerToken = document.createElement("div");
  const playerBounce = document.createElement("span");
  const playerFace = document.createElement("span");
  playerToken.className = "player-token";
  playerBounce.className = "player-bounce";
  playerFace.className = "player-face face-right";
  playerFace.textContent = "🐭";
  playerBounce.appendChild(playerFace);
  playerToken.appendChild(playerBounce);

  function levelConfig() {
    return LEVELS[currentLevel];
  }

  /*
    Recursive backtracking maze generation:
    1. Start with every wall closed.
    2. Visit one neighboring unvisited cell at random.
    3. Remove the wall between the two cells.
    4. Backtrack when a cell has no unvisited neighbors.
    This visits every cell exactly once and produces a connected maze.
  */
  function generateMaze(size) {
    const nextMaze = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => ({
        r, c, visited: false,
        walls: { top: true, right: true, bottom: true, left: true }
      }))
    );
    const stack = [nextMaze[0][0]];
    nextMaze[0][0].visited = true;

    while (stack.length) {
      const current = stack[stack.length - 1];
      const candidates = [];
      for (const wall of WALLS) {
        const [dr, dc] = DIRECTIONS[wall];
        const r = current.r + dr;
        const c = current.c + dc;
        if (r >= 0 && r < size && c >= 0 && c < size && !nextMaze[r][c].visited) {
          candidates.push({ cell: nextMaze[r][c], wall });
        }
      }
      if (!candidates.length) {
        stack.pop();
        continue;
      }
      const choice = candidates[Math.floor(Math.random() * candidates.length)];
      current.walls[choice.wall] = false;
      choice.cell.walls[OPPOSITE[choice.wall]] = false;
      choice.cell.visited = true;
      stack.push(choice.cell);
    }
    return nextMaze;
  }

  function cellKey(cell) {
    return `${cell.r},${cell.c}`;
  }

  function centerCell(size) {
    const middle = Math.floor(size / 2);
    return { r: middle, c: middle };
  }

  function sameCell(a, b) {
    return a && b && a.r === b.r && a.c === b.c;
  }

  function availableNeighbors(cell) {
    const result = [];
    const current = maze[cell.r]?.[cell.c];
    if (!current) return result;
    for (const wall of WALLS) {
      if (current.walls[wall]) continue;
      const [dr, dc] = DIRECTIONS[wall];
      result.push({ r: cell.r + dr, c: cell.c + dc });
    }
    return result;
  }

  function distanceMap(start) {
    const distances = new Map([[cellKey(start), 0]]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift();
      const nextDistance = distances.get(cellKey(current)) + 1;
      for (const neighbor of availableNeighbors(current)) {
        const key = cellKey(neighbor);
        if (!distances.has(key)) {
          distances.set(key, nextDistance);
          queue.push(neighbor);
        }
      }
    }
    return distances;
  }

  function chooseLevelItems(config) {
    const distances = distanceMap(startCell);
    const allCells = [];
    for (let r = 0; r < config.size; r++) {
      for (let c = 0; c < config.size; c++) {
        const cell = { r, c };
        if (!sameCell(cell, startCell) && !sameCell(cell, goal)) allCells.push(cell);
      }
    }
    // Place the exit at the farthest reachable cell, then collectibles mostly
    // on the longer branches so exploration is more rewarding than a straight run.
    goal = allCells.sort((a, b) => distances.get(cellKey(b)) - distances.get(cellKey(a)))[0];
    const farCells = allCells
      .filter(cell => !sameCell(cell, goal) && distances.get(cellKey(cell)) > config.size * .8)
      .sort(() => Math.random() - .5);
    const pool = [...farCells, ...allCells.sort(() => Math.random() - .5)];
    const used = new Set([cellKey(startCell), cellKey(goal)]);
    collectibles = [];
    const icons = ["🪔", "🌸", "🪷", "✨", "🌼", "🪔"];
    for (const cell of pool) {
      if (collectibles.length >= config.collectibles) break;
      if (used.has(cellKey(cell))) continue;
      collectibles.push({ ...cell, icon: icons[collectibles.length] });
      used.add(cellKey(cell));
    }
  }

  function chooseCats(config) {
    cats = [];
    const reserved = new Set([
      cellKey(startCell), cellKey(goal), ...collectibles.map(cellKey)
    ]);
    const candidates = [];
    for (let r = 0; r < config.size; r++) {
      for (let c = 0; c < config.size; c++) {
        const cell = { r, c };
        if (!reserved.has(cellKey(cell))) candidates.push(cell);
      }
    }
    candidates.sort(() => Math.random() - .5);
    for (let i = 0; i < config.cats; i++) {
      const cell = candidates[i];
      cats.push({
        r: cell.r, c: cell.c,
        previous: null,
        direction: Math.random() > .5 ? 1 : -1,
        moveIn: 1.3 + Math.random() * .8
      });
    }
  }

  function buildLevel() {
    const config = levelConfig();
    clearTimer();
    cancelMovement();
    clearHeldDirections();
    inputQueue = [];
    state = "playing";
    maze = generateMaze(config.size);
    startCell = centerCell(config.size);
    player = { ...startCell };
    remainingTime = config.time;
    levelElapsed = 0;
    sparks = [];
    chooseLevelItems(config);
    chooseCats(config);
    renderMaze(true);
    positionToken(player, false);
    updateHud();
    hideModal();
    setBanner(`Level ${currentLevel + 1}: find the modak`);
    showLevelTutorial();
    if (!tutorialActive || tutorialKey !== "level1") startLevelTimer();
    if (!animationId) animationId = requestAnimationFrame(animate);
  }

  function startGame() {
    currentLevel = 0;
    score = 0;
    totalTime = 0;
    tutorialSeen = {
      level1: false,
      level2: false,
      level3: false,
      level4: false,
      level5: false
    };
    bestScore = Number(localStorage.getItem("findTheModakBest") || 0);
    buildLevel();
    playTone(440, .1, "sine");
  }

  function finishLevel() {
    clearTimer();
    const bonus = remainingTime * 2;
    score += bonus;
    state = "levelComplete";
    dismissTutorial();
    updateHud();
    showLevelComplete(bonus);
    playTone(660, .11, "sine");
  }

  function nextLevel() {
    if (currentLevel >= LEVELS.length - 1) {
      finishGame();
    } else {
      currentLevel++;
      buildLevel();
      playTone(520, .08, "sine");
    }
  }

  function finishGame() {
    clearTimer();
    state = "final";
    dismissTutorial();
    bestScore = Math.max(bestScore, score);
    localStorage.setItem("findTheModakBest", bestScore);
    showFinalSummary();
    createConfetti();
    playTone(880, .2, "sine");
  }

  function retryLevel() {
    // Score and current level stay intact; only the timed maze attempt resets.
    buildLevel();
    playTone(350, .08, "sine");
  }

  function tick() {
    if (state !== "playing") return;
    remainingTime--;
    levelElapsed++;
    totalTime++;
    updateHud();
    if (currentLevel >= 3) {
      const readySpark = Math.max(1.4, 4.2 - currentLevel * .25);
      if (Math.random() < 1 / readySpark) spawnSpark();
    }
    moveCats(1);
    if (remainingTime <= 0) {
      clearTimer();
      state = "timeout";
      dismissTutorial();
      showTimeout();
      setBanner("Time for a fresh route");
    }
  }

  function clearTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    timerStarted = false;
  }

  function startLevelTimer() {
    if (timerId || timerStarted) return;
    timerStarted = true;
    timerId = setInterval(tick, 1000);
  }

  function cancelMovement() {
    if (movementTimeout) clearTimeout(movementTimeout);
    movementTimeout = null;
    movement = null;
  }

  function clearHeldDirections() {
    repeatTimers.forEach(timer => {
      clearTimeout(timer.delay);
      if (timer.interval) clearInterval(timer.interval);
    });
    repeatTimers.clear();
    heldDirections.clear();
  }

  function showLevelTutorial() {
    const key = `level${currentLevel + 1}`;
    if (tutorialSeen[key]) return;
    if (currentLevel === 0) {
      showTutorial(
        key,
        "Use arrow keys/WASD (or swipe/D-pad on mobile) to guide Mushika through the maze to the glowing modak!",
        4000
      );
    } else if (currentLevel === 1 && cats[0]) {
      showTutorial(
        key,
        "Watch out — bumping the cat sends you back a few steps!",
        3000,
        cats[0]
      );
    } else if (currentLevel === 2) {
      showTutorial(
        key,
        "Tip: collectibles add extra time — grab them if they’re on your way!",
        3000
      );
    } else if (currentLevel === 4) {
      showTutorial(key, "The final stretch — Ganpati Bappa awaits!", 2600, null, false);
    }
  }

  function showTutorial(key, text, duration, contextCell = null, dismissOnInput = true) {
    tutorialSeen[key] = true;
    tutorialActive = true;
    tutorialKey = key;
    tutorialDismissOnInput = dismissOnInput;
    tutorialText.textContent = text;
    tutorialTip.classList.toggle("contextual", Boolean(contextCell));
    tutorialTip.setAttribute("aria-hidden", "false");
    positionTutorialTip(contextCell);
    requestAnimationFrame(() => tutorialTip.classList.add("visible"));
    clearTimeout(tutorialTimeout);
    tutorialTimeout = setTimeout(dismissTutorial, duration);
  }

  function positionTutorialTip(contextCell = null) {
    if (!contextCell) {
      tutorialTip.style.left = "50%";
      tutorialTip.style.top = "12%";
      return;
    }
    const frame = mazeElement.parentElement;
    const frameRect = frame.getBoundingClientRect();
    const mazeRect = mazeElement.getBoundingClientRect();
    const size = levelConfig().size;
    const x = mazeRect.left - frameRect.left + ((contextCell.c + .5) / size) * mazeRect.width;
    const y = mazeRect.top - frameRect.top + ((contextCell.r + .5) / size) * mazeRect.height;
    tutorialTip.style.left = `${Math.max(82, Math.min(frameRect.width - 82, x))}px`;
    tutorialTip.style.top = `${Math.max(46, Math.min(frameRect.height - 28, y))}px`;
  }

  function dismissTutorial() {
    if (!tutorialActive) return;
    clearTimeout(tutorialTimeout);
    tutorialTimeout = null;
    tutorialActive = false;
    tutorialKey = null;
    tutorialTip.classList.remove("visible", "contextual");
    tutorialTip.setAttribute("aria-hidden", "true");
    if (!timerStarted && currentLevel === 0 && state === "playing") startLevelTimer();
  }

  function isSparkBlocked(cell) {
    return sparks.some(spark => sameCell(spark, cell));
  }

  function spawnSpark() {
    const config = levelConfig();
    const choices = [];
    for (let r = 0; r < config.size; r++) {
      for (let c = 0; c < config.size; c++) {
        const cell = { r, c };
        const occupiedByCat = cats.some(cat => sameCell(cat, cell));
        const isCollectible = collectibles.some(item => sameCell(item, cell));
        if (!sameCell(cell, player) && !sameCell(cell, goal) && !occupiedByCat && !isCollectible && !isSparkBlocked(cell)) {
          choices.push(cell);
        }
      }
    }
    if (!choices.length) return;
    const cell = choices[Math.floor(Math.random() * choices.length)];
    sparks.push({ ...cell, expires: Date.now() + 2700 });
    if (currentLevel === 3 && !tutorialSeen.level4) {
      showTutorial(
        "level4",
        "Sparks block the path for a few seconds — find another way!",
        3000,
        cell
      );
    }
    setBanner("A firecracker spark is blocking a cell", true);
    renderMaze();
  }

  function pruneSparks() {
    const before = sparks.length;
    sparks = sparks.filter(spark => spark.expires > Date.now());
    if (before !== sparks.length) renderMaze();
  }

  function moveCats(dt) {
    pruneSparks();
    for (const cat of cats) {
      cat.moveIn -= dt;
      if (cat.moveIn > 0) continue;
      const choices = availableNeighbors(cat).filter(cell =>
        !sameCell(cell, startCell) && !sameCell(cell, goal) && !isSparkBlocked(cell)
      );
      if (choices.length) {
        const next = choices[Math.floor(Math.random() * choices.length)];
        cat.previous = { r: cat.r, c: cat.c };
        cat.r = next.r;
        cat.c = next.c;
      }
      cat.moveIn = .95 + Math.random() * .8;
      if (!movement && sameCell(cat, player)) bumpPlayerBack();
    }
    renderMaze();
  }

  function bumpPlayerBack() {
    const previous = player.history || [];
    const fallback = startCell;
    const safe = previous.length >= 3 ? previous[previous.length - 3] : fallback;
    player = { ...safe, history: previous.slice(0, Math.max(0, previous.length - 2)) };
    renderMaze();
    positionToken(player, true);
    triggerArrival();
    setBanner("A curious cat sent you back a few steps", true);
    playTone(180, .08, "square");
  }

  function requestMove(direction) {
    if (state !== "playing") return;
    if (tutorialActive && tutorialDismissOnInput) dismissTutorial();
    if (movement) {
      if (inputQueue[inputQueue.length - 1] !== direction && inputQueue.length < 3) {
        inputQueue.push(direction);
      }
      return;
    }
    startMove(direction);
  }

  function startMove(direction) {
    const vector = MOVES[direction];
    if (!vector) return false;
    const [dr, dc] = vector;
    const current = maze[player.r]?.[player.c];
    if (!current) return false;
    const wall = dr === -1 ? "top" : dr === 1 ? "bottom" : dc === -1 ? "left" : "right";
    if (current.walls[wall]) {
      setBanner("That path is part of the pandal wall");
      return false;
    }
    const next = { r: player.r + dr, c: player.c + dc };
    if (isSparkBlocked(next)) {
      setBanner("Wait for the spark to fade", true);
      return false;
    }
    movement = {
      from: { r: player.r, c: player.c },
      to: next,
      direction
    };
    setFacing(vector);
    renderMaze();
    positionToken(next, true);
    movementTimeout = setTimeout(completeMovement, MOVE_DURATION);
    return true;
  }

  function completeMovement() {
    if (!movement) return;
    const completed = movement;
    movement = null;
    movementTimeout = null;
    player.history ||= [];
    player.history.push(completed.from);
    if (player.history.length > 12) player.history.shift();
    player = { ...completed.to, history: player.history };
    collectAtPlayer();
    if (cats.some(cat => sameCell(cat, player))) bumpPlayerBack();
    renderMaze();
    triggerArrival();
    if (sameCell(player, goal)) {
      finishLevel();
      return;
    }
    processInputQueue();
    playTone(330 + Math.random() * 70, .035, "sine");
  }

  function processInputQueue() {
    if (state !== "playing" || movement) return;
    while (inputQueue.length) {
      if (startMove(inputQueue.shift())) return;
    }
  }

  function setFacing(vector) {
    const [dr, dc] = vector;
    playerFace.classList.remove("face-left", "face-right", "face-up", "face-down");
    playerFace.classList.add(
      dc < 0 ? "face-left" : dc > 0 ? "face-right" : dr < 0 ? "face-up" : "face-down"
    );
  }

  function positionToken(cell, animatePosition) {
    const size = levelConfig().size;
    updatePlayerTokenSizing();
    playerToken.style.transition = animatePosition
      ? `left ${MOVE_DURATION}ms cubic-bezier(.22, .75, .28, 1), top ${MOVE_DURATION}ms cubic-bezier(.22, .75, .28, 1)`
      : "none";
    playerToken.style.left = `${((cell.c + .5) / size) * 100}%`;
    playerToken.style.top = `${((cell.r + .5) / size) * 100}%`;
  }

  function updatePlayerTokenSizing() {
    const size = levelConfig().size;
    const cellSize = mazeElement.clientWidth / size;
    const tokenSize = Math.max(12, Math.min(31, cellSize * .62));
    const faceSize = Math.max(11, Math.min(25, cellSize * .45));
    playerToken.style.width = `${tokenSize}px`;
    playerToken.style.height = `${tokenSize}px`;
    playerFace.style.fontSize = `${faceSize}px`;
  }

  function triggerArrival() {
    playerBounce.classList.remove("arrival");
    void playerBounce.offsetWidth;
    playerBounce.classList.add("arrival");
  }

  function collectAtPlayer() {
    const index = collectibles.findIndex(item => sameCell(item, player));
    if (index === -1) return;
    collectibles.splice(index, 1);
    score += 10;
    remainingTime = Math.min(levelConfig().time + 10, remainingTime + 5);
    setBanner("A bright offering found • +10 • +5 seconds", true);
    playTone(600, .08, "sine");
    updateHud();
  }

  function renderMaze() {
    if (!maze.length) return;
    if (movement) return;
    const size = levelConfig().size;
    mazeElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    mazeElement.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    if (playerToken.parentElement) playerToken.remove();
    mazeElement.innerHTML = "";
    for (const row of maze) {
      for (const cell of row) {
        const element = document.createElement("div");
        const classes = ["cell"];
        for (const wall of WALLS) if (cell.walls[wall]) classes.push(`wall-${wall}`);
        if (sameCell(cell, player)) classes.push("player");
        if (sameCell(cell, goal)) classes.push("goal");
        if (collectibles.some(item => sameCell(item, cell))) classes.push("collectible");
        if (cats.some(cat => sameCell(cat, cell))) classes.push("cat");
        if (isSparkBlocked(cell)) classes.push("spark");
        element.className = classes.join(" ");
        element.setAttribute("role", "gridcell");
        element.setAttribute("aria-label", getCellLabel(cell));
        const content = document.createElement("span");
        content.className = "cell-content";
        if (sameCell(cell, player)) content.textContent = "";
        else if (sameCell(cell, goal)) content.textContent = "🥮";
        else {
          const item = collectibles.find(candidate => sameCell(candidate, cell));
          const cat = cats.find(candidate => sameCell(candidate, cell));
          if (item) content.textContent = item.icon;
          else if (cat) content.textContent = "🐱";
          else if (isSparkBlocked(cell)) content.textContent = "✦";
        }
        element.appendChild(content);
        mazeElement.appendChild(element);
      }
    }
    mazeElement.appendChild(playerToken);
  }

  function getCellLabel(cell) {
    if (sameCell(cell, player)) return "Mushika, your position";
    if (sameCell(cell, goal)) return "Glowing modak exit";
    if (cats.some(cat => sameCell(cat, cell))) return "Curious cat obstacle";
    if (collectibles.some(item => sameCell(item, cell))) return "Offering collectible";
    if (isSparkBlocked(cell)) return "Temporary firecracker spark";
    return "Maze path";
  }

  function updateHud() {
    const config = levelConfig();
    timerValue.textContent = `${Math.max(0, remainingTime)}s`;
    timerValue.classList.toggle("warning", remainingTime <= 10 && state === "playing");
    scoreValue.textContent = score;
    levelValue.textContent = currentLevel + 1;
    levelName.textContent = config.name;
    progressBar.style.width = `${((currentLevel + 1) / LEVELS.length) * 100}%`;
  }

  function setBanner(message, highlight = false) {
    stageBanner.textContent = message;
    stageBanner.classList.toggle("notice", highlight);
    clearTimeout(noticeTimeout);
    noticeTimeout = setTimeout(() => {
      if (state === "playing") stageBanner.textContent = `Level ${currentLevel + 1}: find the modak`;
      stageBanner.classList.remove("notice");
    }, 1800);
  }

  function showLevelComplete(bonus) {
    modalBackdrop.classList.remove("hidden");
    modalSymbol.textContent = "🥮";
    modalKicker.textContent = `Level ${currentLevel + 1} complete • शुभ`;
    modalTitle.textContent = currentLevel === LEVELS.length - 1 ? "The offering is ready!" : "Sweet progress!";
    modalCopy.textContent = currentLevel === LEVELS.length - 1
      ? "You found the final modak and completed the whole pandal journey."
      : "You found the glowing modak. The next part of the celebration awaits.";
    howTo.style.display = "none";
    startLevels.style.display = "none";
    modalPrimaryButton.textContent = currentLevel === LEVELS.length - 1 ? "See the final blessing" : "Next level";
    modalFootnote.textContent = `+${bonus} time bonus • Score ${score}`;
    modalPrimaryButton.onclick = nextLevel;
  }

  function showTimeout() {
    modalBackdrop.classList.remove("hidden");
    modalSymbol.textContent = "🪔";
    modalKicker.textContent = `Level ${currentLevel + 1} • A gentle reset`;
    modalTitle.textContent = "Try a new route";
    modalCopy.textContent = "The timer ran out, but the celebration continues. This level will generate a fresh maze.";
    howTo.style.display = "none";
    startLevels.style.display = "none";
    modalPrimaryButton.textContent = "Retry this level";
    modalFootnote.textContent = `Current score: ${score} • Best: ${bestScore}`;
    modalPrimaryButton.onclick = retryLevel;
  }

  function showFinalSummary() {
    modalBackdrop.classList.remove("hidden");
    modalSymbol.textContent = "🌼";
    modalKicker.textContent = "Ganesh Chaturthi • Final blessing";
    modalTitle.textContent = "You reached Ganesha!";
    modalCopy.textContent = "Mushika carried the sweet offering safely through every level. A beautiful festival journey!";
    howTo.style.display = "none";
    startLevels.style.display = "flex";
    startLevels.innerHTML = `<span><b>${score}</b> total points</span><span>•</span><span>${formatTime(totalTime)} journey</span>`;
    modalPrimaryButton.textContent = "Play again from level 1";
    modalFootnote.textContent = `Best offering: ${bestScore} points`;
    modalPrimaryButton.onclick = startGame;
  }

  function hideModal() {
    modalBackdrop.classList.add("hidden");
    howTo.style.display = "";
    startLevels.style.display = "";
    startLevels.innerHTML = "<span><b>5</b> levels</span><span>•</span><span>fresh maze each round</span>";
    document.querySelectorAll(".confetti").forEach(item => item.remove());
    modalPrimaryButton.onclick = startGame;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${String(secs).padStart(2, "0")}s`;
  }

  function togglePause() {
    if (state !== "playing" && state !== "paused") return;
    state = state === "playing" ? "paused" : "playing";
    pauseButton.textContent = state === "paused" ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-pressed", String(state === "paused"));
    setBanner(state === "paused" ? "Paused" : `Level ${currentLevel + 1}: find the modak`, state === "paused");
  }

  function animate() {
    pruneSparks();
    animationId = requestAnimationFrame(animate);
  }

  function pressDirection(direction) {
    if (heldDirections.has(direction)) return;
    heldDirections.add(direction);
    requestMove(direction);
    const delay = setTimeout(() => {
      if (!heldDirections.has(direction)) return;
      const interval = setInterval(() => requestMove(direction), 150);
      repeatTimers.set(direction, { delay: null, interval });
    }, 250);
    repeatTimers.set(direction, { delay, interval: null });
  }

  function releaseDirection(direction) {
    heldDirections.delete(direction);
    const timer = repeatTimers.get(direction);
    if (!timer) return;
    clearTimeout(timer.delay);
    if (timer.interval) clearInterval(timer.interval);
    repeatTimers.delete(direction);
  }

  function handleKey(event) {
    if (event.key === " " && (state === "playing" || state === "paused")) {
      event.preventDefault();
      togglePause();
      return;
    }
    const move = MOVES[event.key];
    if (!move) return;
    event.preventDefault();
    pressDirection(event.key);
  }

  function handleSwipeEnd(event) {
    if (!swipeStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - swipeStart.x;
    const dy = touch.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) requestMove(dx > 0 ? "right" : "left");
    else requestMove(dy > 0 ? "down" : "up");
  }

  function playTone(frequency, duration, type) {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.035, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Audio is optional and can be unavailable in some browsers. */ }
  }

  function createConfetti() {
    document.querySelectorAll(".confetti").forEach(item => item.remove());
    const colors = ["#ffc15a", "#ef6075", "#8bd4bd", "#fff1c8"];
    for (let i = 0; i < 24; i++) {
      const item = document.createElement("span");
      item.className = "confetti";
      item.style.left = `${8 + Math.random() * 84}%`;
      item.style.top = `${4 + Math.random() * 13}%`;
      item.style.background = colors[i % colors.length];
      item.style.animationDelay = `${Math.random() * .7}s`;
      item.style.transform = `rotate(${Math.random() * 90}deg)`;
      modalBackdrop.appendChild(item);
    }
  }

  window.addEventListener("keydown", handleKey);
  window.addEventListener("keyup", event => {
    if (MOVES[event.key]) releaseDirection(event.key);
  });
  window.addEventListener("blur", clearHeldDirections);
  window.addEventListener("resize", () => {
    updatePlayerTokenSizing();
    if (!movement) positionToken(player, false);
  });
  pauseButton.addEventListener("click", togglePause);
  modalPrimaryButton.onclick = startGame;
  soundButton.addEventListener("click", () => {
    soundOn = !soundOn;
    soundButton.textContent = soundOn ? "♫" : "♩";
    soundButton.setAttribute("aria-pressed", String(soundOn));
    soundButton.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
    if (soundOn) playTone(520, .08, "sine");
  });
  document.querySelectorAll("[data-move]").forEach(button => {
    button.addEventListener("click", () => {
      requestMove(button.dataset.move);
    });
  });
  mazeElement.addEventListener("touchstart", event => {
    const touch = event.touches[0];
    swipeStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  mazeElement.addEventListener("touchend", handleSwipeEnd, { passive: true });

  // Render the initial board under the start screen so the first frame feels alive.
  maze = generateMaze(LEVELS[0].size);
  startCell = centerCell(LEVELS[0].size);
  player = { ...startCell };
  chooseLevelItems(LEVELS[0]);
  chooseCats(LEVELS[0]);
  renderMaze();
  positionToken(player, false);
  updateHud();
  animationId = requestAnimationFrame(animate);
})();