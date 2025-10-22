/*
  Enhanced Snake Game
  - Difficulty levels (easy/medium/hard)
  - Pause/Resume
  - Countdown before start
  - Mobile touch controls (buttons + swipe)
  - Random obstacles
  - Leaderboard (top 5) saved in localStorage
  - Dark/Light mode toggle
  - Background music (WebAudio) toggle and volume
  - Improved visuals & animations
*/

// Configuration and constants
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const difficultyEl = document.getElementById('difficulty');
const countdownEl = document.getElementById('countdown');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const leaderboardEl = document.getElementById('leaderboard');
const clearBoardBtn = document.getElementById('clearBoard');
const nameModal = new bootstrap.Modal(document.getElementById('nameModal'), { backdrop: 'static', keyboard: false });
const finalScoreEl = document.getElementById('finalScore');
const nameForm = document.getElementById('nameForm');
const playerNameInput = document.getElementById('playerName');
const cancelNameBtn = document.getElementById('cancelName');
const modeToggle = document.getElementById('modeToggle');
const musicToggleBtn = document.getElementById('musicToggle');
const musicVolume = document.getElementById('musicVolume');
const snakeColorInput = document.getElementById('snakeColor');

let width = 28; // grid width (cells)
let rows = 28;  // grid height
let cellSize = Math.floor(canvas.width / width);

window.addEventListener('resize', () => {
  // keep canvas pixel-perfect for gameplay but responsive width with CSS
  cellSize = Math.floor(canvas.width / width);
});

// Game state
let snake = [];
let dir = { x: 1, y: 0 }; // moving right initially
let nextDir = { x: 1, y: 0 }; // buffer to avoid reversing instantly
let apple = null;
let obstacles = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('snake_high') || '0', 10);
highScoreEl.textContent = highScore;
let gameInterval = null;
let tickRate = 10; // ticks per second (depends on difficulty)
let running = false;
let paused = false;
let countdownTimer = null;
let countdownValue = 0;
let allowInput = true; // prevent immediate reversing
let musicOn = true;
let audioCtx = null;
let masterGain = null;
let musicNode = null;

// Leaderboard storage (top 5)
const LB_KEY = 'snake_leaderboard';
function loadLeaderboard(){
  try {
    const raw = localStorage.getItem(LB_KEY) || '[]';
    return JSON.parse(raw);
  } catch(e){
    console.error('Failed to parse leaderboard', e);
    return [];
  }
}
function saveLeaderboard(list){
  localStorage.setItem(LB_KEY, JSON.stringify(list.slice(0,5)));
}
function renderLeaderboard(){
  const list = loadLeaderboard();
  leaderboardEl.innerHTML = '';
  if(list.length === 0){
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = 'No scores yet';
    leaderboardEl.appendChild(li);
    return;
  }
  list.forEach(item=>{
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = `<span>${escapeHtml(item.name)}</span><strong>${item.score}</strong>`;
    leaderboardEl.appendChild(li);
  });
}

// Utility
function escapeHtml(s){
  if(!s) return 'Anonymous';
  return s.replaceAll('<','&lt;').replaceAll('>','&gt;').trim();
}
function randInt(min,max){
  return Math.floor(Math.random()*(max-min+1))+min;
}
function posEq(a,b){ return a.x===b.x && a.y===b.y; }

// Initialize game
function resetGame(){
  stopMusicIfNeeded();
  snake = [{x: Math.floor(width/2), y: Math.floor(rows/2)}];
  dir = {x:1,y:0}; nextDir = {x:1,y:0};
  apple = null;
  obstacles = [];
  score = 0;
  scoreEl.textContent = score;
  allowInput = true;
  running = false;
  paused = false;
  clearInterval(gameInterval);
  countdownEl.textContent = '';
  spawnApple();
  spawnObstaclesInitial();
  draw(); // show initial frame
}

// Difficulty affects tickRate
function getTickRateForDifficulty(){
  const d = difficultyEl.value;
  if(d === 'easy') return 6;
  if(d === 'medium') return 10;
  if(d === 'hard') return 16;
  return 10;
}

// Spawn apple in empty spot
function spawnApple(){
  let attempts = 0;
  while(attempts < 500){
    attempts++;
    const p = { x: randInt(1,width-2), y: randInt(1,rows-2) };
    if(snake.some(s=>posEq(s,p))) continue;
    if(obstacles.some(o=>posEq(o,p))) continue;
    apple = p;
    return;
  }
  apple = null;
}

// Spawn some obstacles at game start based on difficulty
function spawnObstaclesInitial(){
  obstacles = [];
  const d = difficultyEl.value;
  let count = 3;
  if(d === 'easy') count = 2;
  if(d === 'medium') count = 4;
  if(d === 'hard') count = 6;
  let tries = 0;
  while(obstacles.length < count && tries < 1000){
    tries++;
    const o = { x: randInt(2,width-3), y: randInt(2,rows-3) };
    if(snake.some(s=>posEq(s,o))) continue;
    if(apple && posEq(apple,o)) continue;
    if(obstacles.some(ob=>posEq(ob,o))) continue;
    obstacles.push(o);
  }
}

// Add an obstacle occasionally during game
function maybeAddObstacle(){
  if(Math.random() < 0.08){ // 8% chance each tick
    const o = { x: randInt(1,width-2), y: randInt(1,rows-2) };
    if(snake.some(s=>posEq(s,o))) return;
    if(apple && posEq(apple,o)) return;
    if(obstacles.some(ob=>posEq(ob,o))) return;
    obstacles.push(o);
  }
}

// Game loop tick
function tick(){
  // Move snake
  dir = nextDir;
  const head = { x: (snake[0].x + dir.x + width) % width, y: (snake[0].y + dir.y + rows) % rows };

  // Collision with self
  if(snake.some((seg,idx)=> idx>0 && posEq(seg,head))){
    return gameOver();
  }
  // Collision with obstacles
  if(obstacles.some(o=>posEq(o,head))){
    return gameOver();
  }

  snake.unshift(head);

  // Eat apple
  if(apple && posEq(head,apple)){
    score += 10;
    scoreEl.textContent = score;
    spawnApple();
    // occasionally add obstacle on eating to increase difficulty
    if(Math.random() < 0.25) maybeAddObstacle();
  } else {
    snake.pop();
  }

  // Boundaries - wrap-around is allowed in this version; if you'd prefer walls cause game over,
  // change behavior here.
  draw();
  allowInput = true; // re-enable buffered input
}

// Draw everything
function draw(){
  // Clear
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Draw grid subtle
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#000';
  for(let x=0;x<width;x++){
    for(let y=0;y<rows;y++){
      if((x+y) % 2 === 0){
        ctx.fillRect(x*cellSize, y*cellSize, cellSize, cellSize);
      }
    }
  }
  ctx.restore();

  // Draw apple
  if(apple){
    drawRoundedRect(apple.x*cellSize, apple.y*cellSize, cellSize, cellSize, cellSize*0.2, getComputedStyle(document.documentElement).getPropertyValue('--apple') || '#dc3545');
    // little shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(apple.x*cellSize + cellSize*0.35, apple.y*cellSize + cellSize*0.35, cellSize*0.15, 0, Math.PI*2);
    ctx.fill();
  }

  // Draw obstacles
  ctx.fillStyle = '#7a7f86';
  obstacles.forEach(o=>{
    drawRoundedRect(o.x*cellSize, o.y*cellSize, cellSize, cellSize, cellSize*0.15, '#7a7f86');
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(o.x*cellSize + cellSize*0.12, o.y*cellSize + cellSize*0.12, cellSize*0.76, cellSize*0.76);
    ctx.fillStyle = '#7a7f86';
  });

  // Draw snake with gradient
  const baseColor = document.getElementById('snakeColor').value || getComputedStyle(document.documentElement).getPropertyValue('--snake').trim();
  for(let i=0;i<snake.length;i++){
    const s = snake[i];
    const t = i / Math.max(1, snake.length-1);
    const color = shadeColor(baseColor, -20 * t);
    drawRoundedRect(s.x*cellSize, s.y*cellSize, cellSize, cellSize, cellSize*0.25, color);
  }
}

// Utility to draw rect with rounded corners
function drawRoundedRect(x,y,w,h,r, fillStyle){
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  const rad = r || 4;
  ctx.moveTo(x+rad,y);
  ctx.arcTo(x+w,y,x+w,y+h,rad);
  ctx.arcTo(x+w,y+h,x,y+h,rad);
  ctx.arcTo(x,y+h,x,y,rad);
  ctx.arcTo(x,y,x+w,y,rad);
  ctx.closePath();
  ctx.fill();
}

// Color utility: lighten/darken hex color
function shadeColor(hex, percent) {
  try{
    const c = hex.replace('#','');
    const num = parseInt(c,16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00FF) + percent;
    let b = (num & 0x0000FF) + percent;
    r = Math.max(Math.min(255,r),0);
    g = Math.max(Math.min(255,g),0);
    b = Math.max(Math.min(255,b),0);
    return `rgb(${r},${g},${b})`;
  }catch(e){
    return hex;
  }
}

// Start sequence with countdown
function startWithCountdown(){
  if(running) return;
  countdownValue = 3;
  countdownEl.style.opacity = 1;
  countdownEl.textContent = countdownValue;
  startBtn.disabled = true;
  difficultyEl.disabled = true;
  countdownTimer = setInterval(()=>{
    countdownValue--;
    if(countdownValue > 0){
      countdownEl.textContent = countdownValue;
      pulseCanvas();
    } else {
      clearInterval(countdownTimer);
      countdownEl.textContent = '';
      beginGameLoop();
      startBtn.disabled = false;
      difficultyEl.disabled = false;
    }
  }, 1000);
}

// Minimal pulse animation to canvas to show countdown
function pulseCanvas(){
  canvas.style.transform = 'scale(1.02)';
  setTimeout(()=>canvas.style.transform = '', 220);
}

function beginGameLoop(){
  running = true;
  paused = false;
  tickRate = getTickRateForDifficulty();
  clearInterval(gameInterval);
  gameInterval = setInterval(()=> {
    if(!paused) tick();
  }, 1000 / tickRate);
  // Start periodic obstacle spawning
  // Also start music if enabled
  startMusicIfNeeded();
}

// Pause toggle
function togglePause(){
  if(!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  pauseBtn.classList.toggle('btn-warning', !paused);
  pauseBtn.classList.toggle('btn-success', paused);
  // visual feedback
  countdownEl.style.opacity = paused ? 0.9 : 0;
  countdownEl.textContent = paused ? 'Paused' : '';
}

// Game over flow
function gameOver(){
  running = false;
  paused = false;
  clearInterval(gameInterval);
  finalScoreEl.textContent = score;
  // Update high score
  if(score > highScore){
    highScore = score;
    localStorage.setItem('snake_high', highScore);
    highScoreEl.textContent = highScore;
  }
  // Prompt for name and save score
  nameModal.show();
  playerNameInput.value = '';
  stopMusicIfNeeded();
}

// Modal handlers
nameForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = playerNameInput.value.trim() || 'Anonymous';
  const list = loadLeaderboard();
  list.push({ name: name, score: score });
  list.sort((a,b)=> b.score - a.score);
  saveLeaderboard(list);
  renderLeaderboard();
  nameModal.hide();
  resetGame();
});
cancelNameBtn.addEventListener('click', ()=>{
  nameModal.hide();
  resetGame();
});

// Input handling
document.addEventListener('keydown', (e)=>{
  if(!allowInput) return;
  if(e.key === 'ArrowUp' && dir.y === 0){ nextDir = {x:0,y:-1}; allowInput=false; }
  if(e.key === 'ArrowDown' && dir.y === 0){ nextDir = {x:0,y:1}; allowInput=false; }
  if(e.key === 'ArrowLeft' && dir.x === 0){ nextDir = {x:-1,y:0}; allowInput=false; }
  if(e.key === 'ArrowRight' && dir.x === 0){ nextDir = {x:1,y:0}; allowInput=false; }
  if(e.key === 'p' || e.key === 'P'){ togglePause(); }
  if(e.key === ' '){ // space to start
    if(!running) startWithCountdown();
  }
});

// Mobile touch buttons
document.querySelectorAll('.touch-btn').forEach(btn=>{
  btn.addEventListener('touchstart', (ev)=>{
    ev.preventDefault();
    const dirStr = btn.dataset.dir;
    applyDirection(dirStr);
  }, {passive:false});
  btn.addEventListener('mousedown', ()=>{
    const dirStr = btn.dataset.dir;
    applyDirection(dirStr);
  });
});

function applyDirection(dirStr){
  if(!allowInput) return;
  const mapping = {
    up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0}
  };
  const newDir = mapping[dirStr];
  if(!newDir) return;
  if(newDir.x === -dir.x && newDir.y === -dir.y) return; // no reverse
  nextDir = newDir;
  allowInput = false;
}

// Canvas swipe detection
let touchStart = null;
canvas.addEventListener('touchstart', (e)=>{
  if(e.touches.length === 1){
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
}, {passive:true});
canvas.addEventListener('touchend', (e)=>{
  if(!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if(Math.hypot(dx,dy) < 30) { touchStart = null; return; }
  if(Math.abs(dx) > Math.abs(dy)){
    if(dx > 0) applyDirection('right'); else applyDirection('left');
  } else {
    if(dy > 0) applyDirection('down'); else applyDirection('up');
  }
  touchStart = null;
}, {passive:true});

// Leaderboard clear
clearBoardBtn.addEventListener('click', ()=>{
  if(confirm('Clear the leaderboard? This cannot be undone.')){
    saveLeaderboard([]);
    renderLeaderboard();
  }
});

// UI buttons
startBtn.addEventListener('click', ()=> {
  if(!running) startWithCountdown();
});
pauseBtn.addEventListener('click', ()=> {
  togglePause();
});
resetBtn.addEventListener('click', ()=> {
  if(confirm('Reset game?')) resetGame();
});

// Difficulty change while not running allowed
difficultyEl.addEventListener('change', ()=> {
  if(running){
    tickRate = getTickRateForDifficulty();
    clearInterval(gameInterval);
    gameInterval = setInterval(()=>{ if(!paused) tick(); }, 1000 / tickRate);
  }
});

// Dark mode toggle
function applyMode(dark){
  document.body.classList.toggle('dark-mode', dark);
  localStorage.setItem('snake_dark', dark ? '1' : '0');
}
modeToggle.addEventListener('change', (e)=>{
  applyMode(e.target.checked);
});
const savedDark = localStorage.getItem('snake_dark') === '1';
modeToggle.checked = savedDark;
applyMode(savedDark);

// Music using WebAudio (simple arpeggiated warmth)
function initAudio(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = parseFloat(musicVolume.value) || 0.2;
  masterGain.connect(audioCtx.destination);
  // create a simple sequence using oscillator and gain envelope
  const carrier = audioCtx.createOscillator();
  const carrierGain = audioCtx.createGain();
  carrier.type = 'sawtooth';
  carrier.frequency.value = 110; // base
  carrierGain.gain.value = 0;
  carrier.connect(carrierGain);
  carrierGain.connect(masterGain);
  carrier.start();
  musicNode = { carrier, carrierGain, startTime: audioCtx.currentTime };
  // schedule an LFO-ish pattern via interval
  musicNode.interval = setInterval(()=>{
    if(!audioCtx) return;
    // brief envelope
    const now = audioCtx.currentTime;
    const freq = 110 * (1 + Math.random()*2); // random harmonic
    carrier.frequency.setValueAtTime(freq, now);
    carrierGain.gain.cancelScheduledValues(now);
    carrierGain.gain.setValueAtTime(0, now);
    carrierGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    carrierGain.gain.linearRampToValueAtTime(0, now + 0.25);
  }, 300);
}

// Start/stop music controls
function startMusicIfNeeded(){
  if(!musicOn) return;
  try {
    if(!audioCtx) initAudio();
    // resume context if suspended due to user gesture rules
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e){
    console.warn('Audio init failed', e);
  }
}
function stopMusicIfNeeded(){
  if(!audioCtx) return;
  // leave audio context running but silence
  // Alternatively, to free resources, fully stop:
  if(musicNode && musicNode.interval) clearInterval(musicNode.interval);
  try {
    musicNode.carrier.stop();
  } catch(e){}
  musicNode = null;
  audioCtx.close().catch(()=>{});
  audioCtx = null;
}
musicToggleBtn.addEventListener('click', ()=>{
  musicOn = !musicOn;
  musicToggleBtn.textContent = `Music: ${musicOn ? 'On' : 'Off'}`;
  if(musicOn) startMusicIfNeeded(); else stopMusicIfNeeded();
  localStorage.setItem('snake_music', musicOn ? '1' : '0');
});

// Volume change
musicVolume.addEventListener('input', (e)=>{
  if(masterGain) masterGain.gain.value = parseFloat(e.target.value);
  localStorage.setItem('snake_music_vol', e.target.value);
});

// Snake color change
snakeColorInput.addEventListener('input', ()=> draw());

// Save and render leaderboard at init
renderLeaderboard();

// Persist music preference
musicOn = localStorage.getItem('snake_music') !== '0';
musicToggleBtn.textContent = `Music: ${musicOn ? 'On' : 'Off'}`;

// Load persisted volume
const savedVol = parseFloat(localStorage.getItem('snake_music_vol') || musicVolume.value);
musicVolume.value = savedVol;
if(savedVol && masterGain) masterGain.gain.value = savedVol;

// Setup initial canvas and start frame
resetGame();
draw();

// Small helpful debug to ensure no major runtime errors
window.addEventListener('error', (e)=>{
  console.error('Runtime error occurred:', e.message);
  // graceful reset to safe state
  resetGame();
});

// Helper to ensure apple/obstacle spacing - called periodically
setInterval(() => {
  // occasionally ensure apple exists and obstacles reasonable
  if(!apple) spawnApple();
  if(obstacles.length > 12) obstacles.splice(0, obstacles.length - 12);
}, 3000);

// Fixes/notes:
 // - Prevent immediate reversal by buffering nextDir and using allowInput flag
 // - Use localStorage guarded JSON parsing to avoid corruption issues

// Simple accessibility: focus canvas to allow keyboard control
canvas.addEventListener('click', ()=> canvas.focus());

/* End of app.js */