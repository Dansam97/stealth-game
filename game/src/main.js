// The Quiet Courier — game loop, screens, keyboard + mouse input, and
// the deterministic screenshot presets (?shot=cover|patrol|alert|win)
// the maker uses to photograph the real game.
import { LEVELS } from './levels.js';
import { parseLevel, tileCenter } from './world.js';
import { createPlayer, updatePlayer, collectFiles, filesCollected, onExitTile } from './player.js';
import { createGuard, updateGuard, distractGuards, highestDetection, anyChasing, caughtBy } from './guards.js';
import { render, VIEW_WIDTH, VIEW_HEIGHT } from './render.js';
import { createAudio, unlockAudio, playStep, playPickup, playAlert, playCaught, playWin, playPebble, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

const audio = createAudio();
const params = new URLSearchParams(location.search);
const shot = params.get('shot');

const input = { up: false, down: false, left: false, right: false, sneak: false };

const state = {
  screen: 'menu', // menu | briefing | play | caught | leveldone | win
  levelIndex: 0,
  world: null,
  player: null,
  guards: [],
  pebbles: [],
  pebbleCooldown: 0,
  elapsed: 0,
  frozen: false,
  wasChasing: false,
  hud: { levelName: '', levelIndex: 0, files: 0, filesNeeded: 0, detection: 0, statusText: 'UNSEEN', statusColor: '#40dc78', timeText: '0:00' },
};

function loadLevel(index) {
  state.levelIndex = index;
  state.world = parseLevel(LEVELS[index]);
  state.player = createPlayer(state.world);
  state.guards = state.world.guards.map((g, i) => createGuard(g, i));
  state.pebbles = [];
  state.pebbleCooldown = 0;
  state.wasChasing = false;
  state.screen = 'briefing';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function refreshHud() {
  const detection = highestDetection(state.guards);
  state.filesDone = filesCollected(state.world) >= state.world.filesNeeded;
  let statusText = 'UNSEEN';
  let statusColor = '#40dc78';
  if (anyChasing(state.guards)) {
    statusText = 'ALERT — RUN!';
    statusColor = '#ff5252';
  } else if (detection > 55) {
    statusText = 'SPOTTED';
    statusColor = '#ff5252';
  } else if (state.guards.some((g) => g.state === 'investigate' || g.state === 'search')) {
    statusText = 'SEARCHING';
    statusColor = '#ffb020';
  } else if (detection > 25) {
    statusText = 'SUSPICIOUS';
    statusColor = '#ffb020';
  }
  state.hud = {
    levelName: state.world.name,
    levelIndex: state.levelIndex,
    files: filesCollected(state.world),
    filesNeeded: state.world.filesNeeded,
    detection,
    statusText,
    statusColor,
    timeText: formatTime(state.elapsed),
  };
}

function throwPebble(clientX, clientY) {
  if (state.screen !== 'play' || state.pebbleCooldown > 0) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
  const y = ((clientY - rect.top) / rect.height) * VIEW_HEIGHT;
  const tx = Math.floor(x / 40);
  const ty = Math.floor(y / 40);
  state.pebbles.push({ x, y, at: performance.now() });
  if (state.pebbles.length > 6) state.pebbles.shift();
  distractGuards(state.guards, state.world, tx, ty);
  state.pebbleCooldown = 1;
  playPebble(audio);
}

function advance() {
  if (state.screen === 'menu') {
    loadLevel(0);
  } else if (state.screen === 'briefing') {
    state.screen = 'play';
  } else if (state.screen === 'leveldone') {
    if (state.levelIndex + 1 >= LEVELS.length) {
      state.screen = 'win';
    } else {
      loadLevel(state.levelIndex + 1);
    }
  } else if (state.screen === 'win') {
    state.elapsed = 0;
    loadLevel(0);
  }
}

function restartLevel() {
  state.elapsed = state.elapsed; // the clock keeps running across retries
  loadLevel(state.levelIndex);
  state.screen = 'play';
}

function update(dt) {
  if (state.screen !== 'play') return;
  state.elapsed += dt;
  state.pebbleCooldown = Math.max(0, state.pebbleCooldown - dt);
  updatePlayer(state.player, state.world, input, dt);
  if (state.player.moving) playStep(audio, state.player.sneaking);
  for (const guard of state.guards) updateGuard(guard, state.player, state.world, dt);
  if (collectFiles(state.player, state.world) > 0) playPickup(audio);
  const chasing = anyChasing(state.guards);
  if (chasing && !state.wasChasing) playAlert(audio);
  state.wasChasing = chasing;
  if (caughtBy(state.guards, state.player)) {
    state.screen = 'caught';
    playCaught(audio);
    return;
  }
  if (filesCollected(state.world) >= state.world.filesNeeded && onExitTile(state.player, state.world)) {
    if (state.levelIndex + 1 >= LEVELS.length) {
      state.screen = 'win';
      playWin(audio);
    } else {
      state.screen = 'leveldone';
      playWin(audio);
    }
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.frozen) update(dt);
  refreshHud();
  render(ctx, state);
  requestAnimationFrame(loop);
}

// ---- keyboard -------------------------------------------------------
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};
window.addEventListener('keydown', (e) => {
  unlockAudio(audio);
  if (KEYMAP[e.code] !== undefined) {
    input[KEYMAP[e.code]] = true;
    e.preventDefault();
  } else if (e.code === 'Enter' || e.code === 'Space') {
    if (state.screen !== 'play') advance();
    e.preventDefault();
  } else if (e.code === 'KeyR') {
    if (state.screen === 'play' || state.screen === 'caught') restartLevel();
  } else if (e.code === 'KeyM') {
    toggleMute(audio);
  }
});
window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code] !== undefined) input[KEYMAP[e.code]] = false;
});
canvas.addEventListener('mousedown', (e) => {
  unlockAudio(audio);
  if (state.screen === 'play') throwPebble(e.clientX, e.clientY);
  else advance();
});

// ---- deterministic screenshot presets -------------------------------
function applyShotPreset(kind) {
  state.frozen = true;
  if (kind === 'cover') {
    loadLevel(0);
    state.screen = 'menu';
    return;
  }
  if (kind === 'patrol') {
    loadLevel(0);
    state.screen = 'play';
    state.elapsed = 87;
    // Courier crouched behind a crate while a warden's cone sweeps past.
    state.player.x = tileCenter(4, 4).x;
    state.player.y = tileCenter(4, 4).y;
    state.player.sneaking = true;
    state.player.faceAngle = Math.PI;
    state.player.inShadow = false;
    const g = state.guards[0];
    g.x = tileCenter(8, 3).x;
    g.y = tileCenter(8, 3).y;
    g.angle = 2.9;
    g.detection = 38;
    g.state = 'patrol';
    const g2 = state.guards[1];
    g2.x = tileCenter(24, 11).x;
    g2.y = tileCenter(24, 11).y;
    g2.angle = -Math.PI / 2;
    g2.detection = 0;
    return;
  }
  if (kind === 'alert') {
    loadLevel(1);
    state.screen = 'play';
    state.elapsed = 214;
    // Spotted in the Stacks: a warden gives chase, cone burning red.
    state.player.x = tileCenter(13, 10).x;
    state.player.y = tileCenter(13, 10).y;
    state.player.faceAngle = 0;
    state.world.files[0].taken = true;
    const g = state.guards[0];
    g.x = tileCenter(13, 8).x;
    g.y = tileCenter(13, 8).y;
    g.angle = Math.PI / 2;
    g.detection = 100;
    g.state = 'chase';
    g.lastSeen = { x: state.player.x, y: state.player.y };
    const g2 = state.guards[1];
    g2.x = tileCenter(24, 7).x;
    g2.y = tileCenter(24, 7).y;
    g2.angle = Math.PI;
    g2.detection = 42;
    state.pebbles.push({ x: tileCenter(17, 8).x, y: tileCenter(17, 8).y, at: performance.now() - 400 });
    return;
  }
  if (kind === 'win') {
    loadLevel(2);
    state.screen = 'win';
    state.elapsed = 486;
    state.world.files.forEach((f) => { f.taken = true; });
    state.player.x = tileCenter(state.world.exit.x, state.world.exit.y).x;
    state.player.y = tileCenter(state.world.exit.x, state.world.exit.y).y;
    return;
  }
}

loadLevel(0);
state.screen = 'menu';
if (shot) applyShotPreset(shot);
requestAnimationFrame(loop);
