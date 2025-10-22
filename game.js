/*
  game.js
  Complete Snake game logic with:
  - Smooth movement using requestAnimationFrame
  - Arrow / WASD and touch controls
  - Score and high score persisted in localStorage
  - Different colored food items with different point values
  - WebAudio sound effects for eating and game over
  - Start and Reset buttons
  - Responsive canvas resizing
*/

/* ======= Configuration ======= */
const CONFIG = {
  cellSize: 22,          // grid cell size in pixels (visual spacing for foods & segments)
  initialLength: 5,     // starting segments
  speed: 160,            // pixels per second (snake head speed)
  minSpeed: 80,
  maxSpeed: 420,
  localStorageKey: 'snakeHighScore_v1',
  foodTypes: [
    { color: '#ff4d4d', points: 1 },   // red
    { color: '#4caf50', points: 3 },   // green
    { color: '#2196f3', points: 5 },   // blue
    { color: '#f0ad4e', points: 10 }   // gold
  ],
  collisionThreshold: 14 // threshold in pixels for self-collision detection
};

/* ======= DOM Elements ======= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayReset = document.getElementById('overlayReset');
const overlayStart = document.getElementById('overlayStart');
const touchButtons = document.querySelectorAll('.touch-btn');

/* ======= Game State Variables ======= */
let canvasWidth = 800;
let canvasHeight = 600;
let lastTimestamp = 0;
let running = false;
let paused = true;
let gameOver = false;
let score = 0;
let highScore = 0;
let snake = {
  head: { x: 0, y: 0 },
  dir: { x: 1, y: 0 }, // normalized direction vector (unit)
  length: CONFIG.initialLength,
  // segments will store sampled positions for body following
  segments: []
};
let food = null; // { x, y, color, points }
let audioCtx = null;

/* ======= Utility Functions ======= */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function distance(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return Math.sqrt(dx*dx + dy*dy); }

/* ======= WebAudio Sound Effects ======= */
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

/* Short beep for eating; frequency can vary with points */
function playEatSound(points = 1) {
  ensureAudio();
  const freq = 550 + Math.min(points * 60, 500);
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t);
  o.stop(t + 0.3);
}

/* Descending tones for game over */
function playGameOverSound() {
  ensureAudio();
  const t0 = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
  g.connect(audioCtx.destination);

  const freqs = [260, 220, 180, 140, 100];
  freqs.forEach((f, i) => {
    const o = audioCtx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t0 + i * 0.12);
    o.connect(g);
    o.start(t0 + i * 0.12);
    o.stop(t0 + i * 0.12 + 0.18);
  });
}

/* ======= Canvas & Resize Handling ======= */
function resizeCanvas() {
  // Use parent width to set canvas size responsively
  const parent = canvas.parentElement;
  const style = window.getComputedStyle(parent);
  const parentWidth = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  // Choose a square canvas scaled by width; cap to a max and min
  const maxSize = Math.min(parentWidth, window.innerHeight * 0.65);
  const size = Math.max(280, Math.floor(maxSize));
  canvasWidth = size;
  canvasHeight = Math.floor(size * 0.625); // slightly rectangular for better gameplay
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  // Avoid blurriness on high-DPI devices:
  const ratio = window.devicePixelRatio || 1;
  if (ratio !== 1) {
    canvas.width = Math.floor(canvasWidth * ratio);
    canvas.height = Math.floor(canvasHeight * ratio);
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  } else {
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

/* ======= Game Reset & Initialization ======= */
function resetGameState() {
  score = 0;
  scoreEl.textContent = score;
  highScore = parseInt(localStorage.getItem(CONFIG.localStorageKey) || '0', 10);
  highScoreEl.textContent = highScore;
  snake.length = CONFIG.initialLength;
  // Start in center area
  snake.head.x = canvasWidth / 2;
  snake.head.y = canvasHeight / 2;
  // Default direction to right
  snake.dir = { x: 1, y: 0 };
  snake.segments = [];
  // Seed segments behind head
  for (let i = 0; i < snake.length; i++) {
    snake.segments.push({ x: snake.head.x - i * CONFIG.cellSize, y: snake.head.y });
  }
  spawnFood();
  gameOver = false;
  paused = true;
  running = false;
  lastTimestamp = 0;
  hideOverlay();
}

/* ======= Food Handling ======= */
function spawnFood() {
  // Place food aligned to grid defined by cellSize to keep it neat
  const margin = CONFIG.cellSize;
  const cols = Math.floor((canvasWidth - margin * 2) / CONFIG.cellSize);
  const rows = Math.floor((canvasHeight - margin * 2) / CONFIG.cellSize);
  const fx = margin + randInt(0, cols - 1) * CONFIG.cellSize + CONFIG.cellSize / 2;
  const fy = margin + randInt(0, rows - 1) * CONFIG.cellSize + CONFIG.cellSize / 2;
  const type = CONFIG.foodTypes[randInt(0, CONFIG.foodTypes.length - 1)];
  food = { x: fx, y: fy, color: type.color, points: type.points };
  // Ensure food does not spawn inside snake segments
  if (snake.segments.some(s => distance({ x: s.x, y: s.y }, food) < CONFIG.cellSize * 0.9)) {
    spawnFood(); // try again (rare)
  }
}

/* ======= Input Handling ======= */
let pendingDir = null; // to prevent reversing instantly
function setDirection(dx, dy) {
  // Prevent reversing into itself
  const current = snake.dir;
  if (dx === -current.x && dy === -current.y) {
    return;
  }
  pendingDir = { x: dx, y: dy };
}

window.addEventListener('keydown', (e) => {
  // Prevent arrow keys from scrolling the page
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
  switch (e.key) {
    case 'ArrowUp': case 'w': case 'W': setDirection(0, -1); break;
    case 'ArrowDown': case 's': case 'S': setDirection(0, 1); break;
    case 'ArrowLeft': case 'a': case 'A': setDirection(-1, 0); break;
    case 'ArrowRight': case 'd': case 'D': setDirection(1, 0); break;
    case ' ': // space to pause
      togglePause();
      break;
  }
});

/* Touch controls */
touchButtons.forEach(btn => {
  btn.addEventListener('touchstart', (ev) => {
    ev.preventDefault();
    const dir = btn.dataset.dir;
    switch (dir) {
      case 'up': setDirection(0, -1); break;
      case 'down': setDirection(0, 1); break;
      case 'left': setDirection(-1, 0); break;
      case 'right': setDirection(1, 0); break;
    }
  });
});

/* Buttons */
startBtn.addEventListener('click', () => {
  startGame();
});
resetBtn.addEventListener('click', () => {
  resetGameState();
  startGame();
});
overlayReset.addEventListener('click', () => {
  resetGameState();
  startGame();
});
overlayStart.addEventListener('click', () => {
  hideOverlay();
  startGame();
});

/* Pause toggle */
function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTimestamp = 0;
    requestAnimationFrame(loop);
    startBtn.textContent = 'Resume';
  } else {
    startBtn.textContent = 'Paused';
  }
}

/* ======= Game Loop and Movement ======= */
function startGame() {
  if (gameOver) {
    resetGameState();
  }
  paused = false;
  running = true;
  lastTimestamp = 0;
  startBtn.textContent = 'Playing';
  requestAnimationFrame(loop);
}

function stopGame() {
  running = false;
  paused = true;
}

/* Move the head, sample positions for body, and manage segments */
function update(dt) {
  // Apply pending direction change (disallow immediate diagonal)
  if (pendingDir) {
    snake.dir = pendingDir;
    pendingDir = null;
  }
  // Move head
  const vx = snake.dir.x;
  const vy = snake.dir.y;
  const dist = CONFIG.speed * dt;
  snake.head.x += vx * dist;
  snake.head.y += vy * dist;

  // Keep head inside canvas (we check collision separately)
  // Sample positions: sample when distance since last sample >= cellSize/1.1
  const last = snake.segments[0] || { x: snake.head.x, y: snake.head.y };
  const d = distance(last, snake.head);
  if (d >= CONFIG.cellSize * 0.85) {
    // add new front segment
    snake.segments.unshift({ x: snake.head.x, y: snake.head.y });
  }

  // Trim segments to length * cellSize spacing
  const maxSegments = Math.max(3, Math.floor((snake.length) + 2));
  while (snake.segments.length > maxSegments) {
    snake.segments.pop();
  }

  // Collision with food
  if (food && distance(snake.head, food) < CONFIG.cellSize * 0.9) {
    // Eat it
    score += food.points;
    snake.length += Math.max(1, Math.floor(food.points / 1));
    scoreEl.textContent = score;
    playEatSound(food.points);
    spawnFood();
    // Update high score in place
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem(CONFIG.localStorageKey, String(highScore));
    }
  }

  // Wall collision
  if (
    snake.head.x < 0 ||
    snake.head.y < 0 ||
    snake.head.x > canvasWidth ||
    snake.head.y > canvasHeight
  ) {
    endGame('You hit the wall!');
    return;
  }

  // Self-collision: check head against body segments excluding the immediate few ones
  const startIdx = 4; // ignore very near head segments
  for (let i = startIdx; i < snake.segments.length; i++) {
    if (distance(snake.head, snake.segments[i]) < CONFIG.collisionThreshold) {
      endGame('You ran into yourself!');
      return;
    }
  }
}

/* ======= Drawing ======= */
function drawGrid() {
  // subtle background grid based on cell size
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvasWidth; x += CONFIG.cellSize) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvasHeight);
    ctx.stroke();
  }
  for (let y = 0; y < canvasHeight; y += CONFIG.cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvasWidth, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  // Clear
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Background gradient
  const g = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  g.addColorStop(0, '#021029');
  g.addColorStop(1, '#001018');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  drawGrid();

  // Draw food
  if (food) {
    ctx.beginPath();
    ctx.fillStyle = food.color;
    ctx.shadowColor = food.color;
    ctx.shadowBlur = 12;
    ctx.arc(food.x, food.y, CONFIG.cellSize * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // small highlight
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.arc(food.x - CONFIG.cellSize * 0.15, food.y - CONFIG.cellSize * 0.18, CONFIG.cellSize * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw snake body (from tail to head for correct layering)
  for (let i = snake.segments.length - 1; i >= 0; i--) {
    const p = snake.segments[i];
    const t = i / Math.max(1, snake.segments.length);
    const size = CONFIG.cellSize * (0.95 - t * 0.35);
    // color gradient
    const color = `hsl(${120 - t * 120}, ${60 - t * 20}%, ${30 + t * 30}%)`;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10;
    ctx.ellipse(p.x, p.y, size * 0.6, size * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Draw head with eye
  ctx.beginPath();
  ctx.fillStyle = '#e6f2ff';
  ctx.ellipse(snake.head.x, snake.head.y, CONFIG.cellSize * 0.9, CONFIG.cellSize * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye position based on direction
  const ex = snake.head.x + snake.dir.x * CONFIG.cellSize * 0.3;
  const ey = snake.head.y + snake.dir.y * CONFIG.cellSize * 0.3;
  ctx.beginPath();
  ctx.fillStyle = '#000';
  ctx.ellipse(ex, ey, CONFIG.cellSize * 0.18, CONFIG.cellSize * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // HUD elements (we already display via DOM, but also can show subtle text)
}

/* ======= Game End Handling ======= */
function endGame(reason = 'Game Over') {
  gameOver = true;
  running = false;
  paused = true;
  playGameOverSound();
  // Save high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(CONFIG.localStorageKey, String(highScore));
    highScoreEl.textContent = highScore;
  }
  // Show overlay
  overlayTitle.textContent = 'Game Over';
  overlayText.textContent = reason + ' — Score: ' + score;
  showOverlay();
  startBtn.textContent = 'Start';
}

/* ======= Overlay Helpers ======= */
function showOverlay() {
  overlay.classList.remove('d-none');
}
function hideOverlay() {
  overlay.classList.add('d-none');
}

/* ======= Main Loop ======= */
function loop(timestamp) {
  if (!running || paused || gameOver) return;
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min(0.1, (timestamp - lastTimestamp) / 1000); // cap dt for big pauses
  lastTimestamp = timestamp;

  update(dt);
  draw();

  if (running && !paused && !gameOver) {
    requestAnimationFrame(loop);
  }
}

/* ======= Initialization on Load ======= */
function init() {
  // Setup canvas size and event listeners for resizing
  resizeCanvas();
  window.addEventListener('resize', () => {
    const oldWidth = canvasWidth;
    const oldHeight = canvasHeight;
    resizeCanvas();
    // Keep snake inside new bounds
    snake.head.x = clamp(snake.head.x, 0, canvasWidth);
    snake.head.y = clamp(snake.head.y, 0, canvasHeight);
  });

  // Load high score
  highScore = parseInt(localStorage.getItem(CONFIG.localStorageKey) || '0', 10);
  highScoreEl.textContent = highScore;

  // Initial placement
  resetGameState();

  // Start rendering a paused frame so the canvas looks ready
  draw();

  // Provide a visual hint for starting on mobile (if user hasn't interacted)
  startBtn.focus();
}

/* Kick off when DOM loaded */
document.addEventListener('DOMContentLoaded', init);