// The wardens: patrol loops, vision cones, and the detection meter.
// A guard's suspicion builds only while the courier is inside the cone
// with a clear line of sight, and drains the moment sight is broken —
// so a near miss is a scare, not an instant failure.
import { TILE, findPath, hasLineOfSight, isShadow, tileCenter } from './world.js';

export const GUARD_RADIUS = 14;
export const PATROL_SPEED = 62;
export const CHASE_SPEED = 132;
export const CONE_RANGE = 215;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const LOSE_SIGHT_SECONDS = 3.5;

export function createGuard(def, index = 0) {
  const start = tileCenter(def.x, def.y);
  const waypoints = def.path.map(([x, y]) => tileCenter(x, y));
  return {
    x: start.x,
    y: start.y,
    radius: GUARD_RADIUS,
    angle: 0,
    waypoints,
    waypointIndex: 1 % waypoints.length,
    pauseLeft: 0,
    pauseSeconds: def.pause ?? 1,
    state: 'patrol', // patrol | investigate | chase | search | return
    detection: 0,
    seen: false,
    lastSeen: null,
    unseenFor: 0,
    path: [],
    pathIndex: 0,
    repathIn: 0,
    bobPhase: index * 1.7,
  };
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(guard, targetAngle, rate, dt) {
  const diff = angleDifference(targetAngle, guard.angle);
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.angle += step;
}

function followPath(guard, speed, dt) {
  if (guard.pathIndex >= guard.path.length) return true;
  const target = guard.path[guard.pathIndex];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    guard.pathIndex++;
    return guard.pathIndex >= guard.path.length;
  }
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  turnToward(guard, Math.atan2(dy, dx), 9, dt);
  return false;
}

function planPath(guard, world, tx, ty) {
  const fromTx = Math.floor(guard.x / TILE);
  const fromTy = Math.floor(guard.y / TILE);
  guard.path = findPath(world, fromTx, fromTy, tx, ty);
  guard.pathIndex = 0;
}

// How clearly the guard can see the courier right now (0..1).
export function visibilityOf(guard, player, world) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE) return 0;
  const toPlayer = Math.atan2(dy, dx);
  const off = Math.abs(angleDifference(toPlayer, guard.angle));
  if (off > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(world, guard.x, guard.y, player.x, player.y)) return 0;
  const closeness = 1 - (dist / CONE_RANGE) * 0.7;
  const edge = 1 - (off / CONE_HALF_ANGLE) * 0.35;
  let rate = closeness * edge;
  if (player.sneaking) rate *= 0.45;
  if (player.inShadow) rate *= 0.5;
  if (isShadow(world, Math.floor(player.x / TILE), Math.floor(player.y / TILE))) rate *= 0.5;
  return Math.max(0, Math.min(1, rate));
}

export function updateGuard(guard, player, world, dt) {
  guard.bobPhase += dt * 6;
  const vis = visibilityOf(guard, player, world);
  guard.seen = vis > 0;
  if (guard.seen) {
    guard.detection = Math.min(100, guard.detection + vis * 78 * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenFor = 0;
  } else {
    guard.unseenFor += dt;
    if (guard.state === 'patrol' || guard.state === 'return') {
      guard.detection = Math.max(0, guard.detection - 26 * dt);
    }
  }

  if (guard.detection >= 100 && guard.state !== 'chase') {
    guard.state = 'chase';
    guard.path = [];
  }

  if (guard.state === 'patrol') {
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      const next = guard.waypoints[guard.waypointIndex];
      turnToward(guard, Math.atan2(next.y - guard.y, next.x - guard.x), 2.4, dt);
    } else {
      const target = guard.waypoints[guard.waypointIndex];
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 5) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = guard.pauseSeconds;
      } else {
        const step = Math.min(dist, PATROL_SPEED * dt);
        guard.x += (dx / dist) * step;
        guard.y += (dy / dist) * step;
        turnToward(guard, Math.atan2(dy, dx), 9, dt);
      }
    }
  } else if (guard.state === 'chase') {
    guard.repathIn -= dt;
    if (guard.repathIn <= 0 && guard.lastSeen) {
      planPath(guard, world, Math.floor(guard.lastSeen.x / TILE), Math.floor(guard.lastSeen.y / TILE));
      guard.repathIn = 0.4;
    }
    if (guard.path.length > 0) {
      followPath(guard, CHASE_SPEED, dt);
    } else if (guard.lastSeen) {
      const dx = guard.lastSeen.x - guard.x;
      const dy = guard.lastSeen.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const step = Math.min(dist, CHASE_SPEED * dt);
        guard.x += (dx / dist) * step;
        guard.y += (dy / dist) * step;
        turnToward(guard, Math.atan2(dy, dx), 9, dt);
      }
    }
    if (!guard.seen && guard.unseenFor > LOSE_SIGHT_SECONDS) {
      guard.state = 'search';
      guard.path = [];
      guard.detection = 55;
    }
  } else if (guard.state === 'investigate') {
    if (guard.path.length === 0) {
      guard.pauseLeft -= dt;
      if (guard.pauseLeft <= 0) {
        guard.state = 'return';
        guard.path = [];
      }
    } else if (followPath(guard, PATROL_SPEED * 1.5, dt)) {
      guard.path = [];
      guard.pauseLeft = 1.6;
    }
  } else if (guard.state === 'search') {
    if (guard.lastSeen) {
      const dx = guard.lastSeen.x - guard.x;
      const dy = guard.lastSeen.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        const step = Math.min(dist, PATROL_SPEED * 1.4 * dt);
        guard.x += (dx / dist) * step;
        guard.y += (dy / dist) * step;
        turnToward(guard, Math.atan2(dy, dx), 9, dt);
      } else {
        guard.pauseLeft += dt;
        turnToward(guard, guard.angle + dt * 1.8, 2, dt);
        if (guard.pauseLeft > 2.2) {
          guard.state = 'return';
          guard.pauseLeft = 0;
          guard.path = [];
        }
      }
    } else {
      guard.state = 'return';
    }
  } else if (guard.state === 'return') {
    guard.detection = Math.max(0, guard.detection - 20 * dt);
    let nearest = guard.waypoints[0];
    let best = Infinity;
    for (const wp of guard.waypoints) {
      const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
      if (d < best) {
        best = d;
        nearest = wp;
      }
    }
    if (guard.path.length === 0) {
      planPath(guard, world, Math.floor(nearest.x / TILE), Math.floor(nearest.y / TILE));
      if (guard.path.length === 0) {
        guard.waypointIndex = guard.waypoints.indexOf(nearest);
        guard.state = 'patrol';
      }
    } else if (followPath(guard, PATROL_SPEED * 1.3, dt)) {
      guard.waypointIndex = guard.waypoints.indexOf(nearest);
      guard.state = 'patrol';
      guard.path = [];
    }
    if (guard.detection <= 0 && guard.state === 'return' && guard.path.length === 0) {
      guard.state = 'patrol';
    }
  }
}

// A thrown pebble draws every nearby guard to investigate the landing spot.
export function distractGuards(guards, world, tx, ty) {
  for (const guard of guards) {
    if (guard.state === 'chase') continue;
    const dist = Math.hypot(guard.x - (tx + 0.5) * TILE, guard.y - (ty + 0.5) * TILE);
    if (dist > 340) continue;
    guard.state = 'investigate';
    guard.detection = Math.max(guard.detection, 35);
    planPath(guard, world, tx, ty);
    guard.pauseLeft = 0;
  }
}

export function highestDetection(guards) {
  return guards.reduce((m, g) => Math.max(m, g.detection), 0);
}

export function anyChasing(guards) {
  return guards.some((g) => g.state === 'chase');
}

export function caughtBy(guards, player) {
  for (const guard of guards) {
    if (guard.state !== 'chase') continue;
    if (Math.hypot(guard.x - player.x, guard.y - player.y) < guard.radius + player.radius - 2) return guard;
  }
  return null;
}
