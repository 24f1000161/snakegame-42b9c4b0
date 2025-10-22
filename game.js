// game.js
// Classic Snake game logic
// - Smooth continuous movement across a grid
// - Different colored food with different point values
// - High score persisted in localStorage
// - Start and Reset buttons
// - Sound effects via WebAudio
// - Mobile-friendly touch controls and control buttons

(() => {
  // Constants
  const STORAGE_KEY = 'snakeHighScore_v1';
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const controlBtns = document.querySelectorAll('.control-btn');

  // Game settings
  let cellSize = 24;         // px per grid cell (will be recalculated for responsiveness)
  let cols = 30;             // number of columns (adjusted based on canvas size)
  let rows = 20;             // number of rows
  const baseSpeedCellsPerSec = 6; // base movement speed in cells per second
  let speedMultiplier = 1; // can be used to speed up as score increases

  // Food types: color and point value
  const FOOD_TYPES = [
    { color: '#ff4d4d', points: 1 },  // red - common
    { color: '#ffd24d', points: 3 },  // yellow - uncommon
    { color: '#4da6ff', points: 5 }   // blue - rare
  ];

  // Weighted probability for food types (higher means more common)
  const FOOD_WEIGHTS = [0.7, 0.22, 0.08];

  // Game state
  let head = { x: 5, y: 5, px: 0, py: 0 }; // x,y in cell coords, px,py in pixels for smoothness
  let dir = { x: 1, y: 0 }; // current direction (cell steps)
  let pendingDir = null; // store quick direction changes to avoid reversing
  let snake = []; // array of cells {x,y}
  let snakeLength = 5;
  let lastCell = null;
  let food = null;
  let score = 0;
  let highScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
  let isRunning = false;
  let isGameOver = false;

  // Timing
  let lastTime = 0;
  let accumulator = 0;
  let moveInterval = 1000 / (baseSpeedCellsPerSec * speedMultiplier); // ms per cell
  let headPixel = { x: 0, y: 0 };
  let headPrevCell = { x: 0, y: 0 };

  // Audio (WebAudio)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playBeep(freq = 440, duration = 0.12, gain = 0.08, type = 'sine') {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playEatSound() {
    // multi-tone for satisfying eat
    playBeep(880, 0.06, 0.06, 'triangle');
    setTimeout(() => playBeep(660, 0.08, 0.05, 'sine'), 60);
  }
  function playGameOverSound() {
    // low descending tone
    playBeep(220, 0.25, 0.12, 'sawtooth');
    setTimeout(() => playBeep(110, 0.4, 0.10, 'sine'), 200);
  }

  // Utility - pick food type by weights
  function pickFoodType() {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < FOOD_WEIGHTS.length; i++) {
      acc += FOOD_WEIGHTS[i];
      if (r <= acc) return FOOD_TYPES[i];
    }
    return FOOD_TYPES[0];
  }

  // Resize canvas to fit container while maintaining integer number of cells
  function resizeCanvas() {
    const containerWidth = canvas.parentElement.clientWidth - 32; // padding
    // prefer width-based layout: set cols based on container width
    const targetCell =  Math.max(12, Math.round(containerWidth / 24)); // minimal cells
    // Choose cellSize to make canvas width an integer multiple
    cellSize = Math.max(14, Math.floor(containerWidth / targetCell));
    cols = Math.max(12, Math.floor(containerWidth / cellSize));
    // set canvas size using rows that fit 16:9-ish ratio
    rows = Math.max(12, Math.floor((cols * 9) / 16));
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    // Recompute pixel head location if inited
    head.px = head.x * cellSize;
    head.py = head.y * cellSize;

    // update move interval if speed changed
    moveInterval = 1000 / (baseSpeedCellsPerSec * speedMultiplier);
  }

  // Spawn food at random empty cell
  function spawnFood() {
    let attempts = 0;
    while (attempts < 200) {
      attempts++;
      const fx = Math.floor(Math.random() * cols);
      const fy = Math.floor(Math.random() * rows);
      if (!snake.some(s => s.x === fx && s.y === fy) && !(head.x === fx && head.y === fy)) {
        const type = pickFoodType();
        food = { x: fx, y: fy, color: type.color, points: type.points };
        return;
      }
    }
    // fallback: place at 0,0 if nothing found
    food = { x: 0, y: 0, color: FOOD_TYPES[0].color, points: FOOD_TYPES[0].points };
  }

  // Initialize or reset game state
  function initGame() {
    // Set starting position roughly centered
    head.x = Math.floor(cols / 3);
    head.y = Math.floor(rows / 2);
    head.px = head.x * cellSize;
    head.py = head.y * cellSize;
    dir = { x: 1, y: 0 };
    pendingDir = null;
    snake = [];
    snakeLength = 5;
    score = 0;
    isRunning = false;
    isGameOver = false;
    lastTime = 0;
    accumulator = 0;
    // Build initial snake following the head to the left
    for (let i = 0; i < snakeLength; i++) {
      snake.push({ x: head.x - i - 1, y: head.y });
    }
    spawnFood();
    updateScoreDisplays();
    draw(); // draw initial frame
  }

  function updateScoreDisplays() {
    scoreEl.textContent = score;
    highScoreEl.textContent = highScore;
  }

  // Direction change helper - prevent reversing
  function setDirection(nx, ny) {
    if (isGameOver) return;
    if (!isRunning) return; // allow direction only when running
    // Prevent 180 degree reversal
    if (nx === -dir.x && ny === -dir.y) return;
    pendingDir = { x: nx, y: ny };
  }

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': setDirection(0, -1); break;
      case 'ArrowDown': case 's': case 'S': setDirection(0, 1); break;
      case 'ArrowLeft': case 'a': case 'A': setDirection(-1, 0); break;
      case 'ArrowRight': case 'd': case 'D': setDirection(1, 0); break;
      case ' ': // space toggles start/pause
        if (!isRunning) startGame();
        break;
    }
  });

  // Control buttons (mobile)
  controlBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.getAttribute('data-dir');
      if (d === 'up') setDirection(0, -1);
      if (d === 'down') setDirection(0, 1);
      if (d === 'left') setDirection(-1, 0);
      if (d === 'right') setDirection(1, 0);
    });
  });

  // Swipe handling for touch devices
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!touchStart || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if (Math.max(absX, absY) > 20) {
      // Determine direction by greater delta
      if (absX > absY) {
        setDirection(dx > 0 ? 1 : -1, 0);
      } else {
        setDirection(0, dy > 0 ? 1 : -1);
      }
      touchStart = null; // reset to prevent continuous triggers
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => { touchStart = null; });

  // Start and reset buttons
  startBtn.addEventListener('click', () => {
    if (!isRunning) startGame();
  });

  resetBtn.addEventListener('click', () => {
    resetGame();
  });

  function startGame() {
    if (isGameOver) initGame(); // re-init if previously game over
    if (!isRunning) {
      isRunning = true;
      // resume audio context if suspended (autoplay policy)
      if (audioCtx.state === 'suspended' && audioCtx.resume) {
        audioCtx.resume().catch(() => {});
      }
      lastTime = performance.now();
      requestAnimationFrame(loop);
      startBtn.classList.add('btn-danger');
      startBtn.classList.remove('btn-success');
      startBtn.textContent = 'Running';
    }
  }

  function resetGame() {
    isRunning = false;
    initGame();
    startBtn.classList.remove('btn-danger');
    startBtn.classList.add('btn-success');
    startBtn.textContent = 'Start';
  }

  // Game over handling
  function triggerGameOver() {
    isRunning = false;
    isGameOver = true;
    playGameOverSound();
    // update high score
    if (score > highScore) {
      highScore = score;
      try {
        localStorage.setItem(STORAGE_KEY, String(highScore));
      } catch (e) {
        console.warn('Could not persist high score', e);
      }
    }
    updateScoreDisplays();
    startBtn.classList.remove('btn-danger');
    startBtn.classList.add('btn-success');
    startBtn.textContent = 'Start';
    // Flash effect
    flashCanvas();
  }

  function flashCanvas() {
    // simple red flash once
    const prevFill = ctx.fillStyle;
    ctx.fillStyle = 'rgba(255,0,0,0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = prevFill;
    // no need to redraw; next frame will draw normal
  }

  // Main loop
  function loop(now) {
    if (!lastTime) lastTime = now;
    const deltaMs = now - lastTime;
    lastTime = now;

    if (isRunning) {
      update(deltaMs / 1000); // convert ms to seconds
      draw();
    } else {
      // draw idle state occasionally
      draw();
    }

    requestAnimationFrame(loop);
  }

  // Update function: advances head by continuous movement
  function update(dt) {
    if (isGameOver) return;
    // Consume pendingDir if any and not reversing
    if (pendingDir) {
      if (!(pendingDir.x === -dir.x && pendingDir.y === -dir.y)) {
        dir = pendingDir;
      }
      pendingDir = null;
    }

    // Movement in pixels per second
    const speed = baseSpeedCellsPerSec * speedMultiplier * cellSize;
    // Advance head pixel position
    head.px += dir.x * speed * dt;
    head.py += dir.y * speed * dt;

    // Determine current cell (rounded)
    const cx = Math.round(head.px / cellSize);
    const cy = Math.round(head.py / cellSize);
    const newCell = { x: cx, y: cy };

    // Only register a new cell when we actually moved into a different cell center
    if (newCell.x !== headPrevCell.x || newCell.y !== headPrevCell.y) {
      headPrevCell = { x: newCell.x, y: newCell.y };
      head.x = newCell.x;
      head.y = newCell.y;

      // collision with walls
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        triggerGameOver();
        return;
      }

      // Check collision with self
      if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        triggerGameOver();
        return;
      }

      // Add previous head position to snake (grow in front)
      snake.unshift({ x: head.x, y: head.y });

      // Eating food?
      if (food && head.x === food.x && head.y === food.y) {
        score += food.points;
        playEatSound();
        // increase length by points (1-5)
        snakeLength += Math.max(1, food.points);
        // small speed up as score grows (optional)
        speedMultiplier = 1 + Math.min(1.0, score / 50);
        moveInterval = 1000 / (baseSpeedCellsPerSec * speedMultiplier);
        spawnFood();
      }

      // Ensure snake doesn't exceed length
      while (snake.length > snakeLength) snake.pop();

      updateScoreDisplays();
    }
  }

  // Draw function: paints canvas
  function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid (subtle)
    ctx.fillStyle = '#061226';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines lightly for visual aid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize + 0.5, 0);
      ctx.lineTo(x * cellSize + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize + 0.5);
      ctx.lineTo(canvas.width, y * cellSize + 0.5);
      ctx.stroke();
    }

    // Draw food
    if (food) {
      const fx = food.x * cellSize + cellSize / 2;
      const fy = food.y * cellSize + cellSize / 2;
      // circle with glow
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(fx, fy, cellSize*0.1, fx, fy, cellSize*0.7);
      gradient.addColorStop(0, lighten(food.color, 0.35));
      gradient.addColorStop(0.8, food.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = gradient;
      ctx.arc(fx, fy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.fill();
      // small inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(fx - cellSize * 0.12, fy - cellSize * 0.12, cellSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw snake body
    // Head pixel position (smoothed)
    const headPixelX = head.px;
    const headPixelY = head.py;

    // Draw each segment as rounded rect/circle
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      // Slight shading for segments
      const segX = seg.x * cellSize;
      const segY = seg.y * cellSize;
      // Neck vs body coloring
      if (i === 0) {
        // head: brighter green
        drawRoundedRect(ctx, segX + 1, segY + 1, cellSize - 2, cellSize - 2, 6, '#2ee06e');
      } else {
        const shade = i % 2 === 0 ? '#19b456' : '#149944';
        drawRoundedRect(ctx, segX + 1, segY + 1, cellSize - 2, cellSize - 2, 6, shade);
      }
    }

    // When game over, overlay message
    if (isGameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `${Math.max(20, Math.floor(cellSize * 1.2))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = `${Math.max(14, Math.floor(cellSize * 0.8))}px sans-serif`;
      ctx.fillText(`Score: ${score} — Press Reset to play again`, canvas.width / 2, canvas.height / 2 + 22);
    }
  }

  // Helpers
  function drawRoundedRect(c, x, y, w, h, r, fillStyle) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
    c.fillStyle = fillStyle;
    c.fill();
  }

  // Lighten a hex color by factor (0-1)
  function lighten(hex, amt=0.2) {
    const col = hex.replace('#','');
    const num = parseInt(col, 16);
    let r = (num >> 16) + Math.round(255*amt);
    let g = ((num >> 8) & 0x00FF) + Math.round(255*amt);
    let b = (num & 0x0000FF) + Math.round(255*amt);
    r = Math.min(255, r);
    g = Math.min(255, g);
    b = Math.min(255, b);
    return '#' + (r<<16 | g<<8 | b).toString(16).padStart(6,'0');
  }

  // Initialize on load
  function startUp() {
    highScoreEl.textContent = highScore;
    resizeCanvas();
    initGame();
    // keep canvas responsive on window resize
    window.addEventListener('resize', () => {
      resizeCanvas();
      draw();
    });
  }

  // Make sure headPrevCell has valid initial value
  headPrevCell = { x: head.x, y: head.y };

  // Start
  startUp();
})();