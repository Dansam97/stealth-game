// The courier: position, sneaking, and file pickups.
import { TILE, isShadow, moveCircle, tileCenter } from './world.js';

export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 165;
export const SNEAK_SPEED = 95;

export function createPlayer(world) {
  const start = tileCenter(world.playerStart.x, world.playerStart.y);
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER_RADIUS,
    sneaking: false,
    moving: false,
    stepPhase: 0,
    faceAngle: 0,
    inShadow: false,
  };
}

export function updatePlayer(player, world, input, dt) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  player.sneaking = Boolean(input.sneak);
  player.moving = dx !== 0 || dy !== 0;
  if (!player.moving) return;
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
  const moved = moveCircle(world, player, dx * speed * dt, dy * speed * dt, player.radius);
  player.x = moved.x;
  player.y = moved.y;
  player.faceAngle = Math.atan2(dy, dx);
  player.stepPhase += (speed * dt) / 14;
  const tx = Math.floor(player.x / TILE);
  const ty = Math.floor(player.y / TILE);
  player.inShadow = isShadow(world, tx, ty);
}

export function collectFiles(player, world) {
  let gained = 0;
  for (const file of world.files) {
    if (file.taken) continue;
    const c = tileCenter(file.x, file.y);
    if (Math.hypot(player.x - c.x, player.y - c.y) < TILE * 0.62) {
      file.taken = true;
      gained++;
    }
  }
  return gained;
}

export function filesCollected(world) {
  return world.files.filter((f) => f.taken).length;
}

export function onExitTile(player, world) {
  const tx = Math.floor(player.x / TILE);
  const ty = Math.floor(player.y / TILE);
  return tx === world.exit.x && ty === world.exit.y;
}
