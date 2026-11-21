// The tile grid: parsing a level map, movement collision, and the
// line-of-sight tests the vision cones and the guards' hearing rely on.
export const TILE = 40;

export function parseLevel(def) {
  const rows = def.map;
  const height = rows.length;
  const width = rows[0].length;
  const tiles = [];
  let playerStart = { x: 1, y: 1 };
  let exit = { x: width - 2, y: 1 };
  const files = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      if (ch === 'P') {
        playerStart = { x, y };
        row.push('.');
      } else if (ch === 'E') {
        exit = { x, y };
        row.push('.');
      } else if (ch === 'F') {
        files.push({ x, y, taken: false });
        row.push('.');
      } else {
        row.push(ch);
      }
    }
    tiles.push(row);
  }
  return { name: def.name, briefing: def.briefing, filesNeeded: def.filesNeeded, tiles, width, height, playerStart, exit, files, guards: def.guards };
}

export function tileAt(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return '#';
  return world.tiles[ty][tx];
}

export function blocksSight(world, tx, ty) {
  const t = tileAt(world, tx, ty);
  return t === '#' || t === 'C';
}

export function blocksMove(world, tx, ty) {
  const t = tileAt(world, tx, ty);
  return t === '#' || t === 'C';
}

export function isShadow(world, tx, ty) {
  return tileAt(world, tx, ty) === 's';
}

// Circle-versus-grid collision: try the move, sliding along one axis
// when the other is blocked, so the courier never sticks on corners.
export function moveCircle(world, pos, dx, dy, radius) {
  const tryAxis = (x, y) => {
    const minTx = Math.floor((x - radius) / TILE);
    const maxTx = Math.floor((x + radius) / TILE);
    const minTy = Math.floor((y - radius) / TILE);
    const maxTy = Math.floor((y + radius) / TILE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (blocksMove(world, tx, ty)) return false;
      }
    }
    return true;
  };
  let nx = pos.x;
  let ny = pos.y;
  if (tryAxis(pos.x + dx, pos.y)) nx = pos.x + dx;
  if (tryAxis(nx, pos.y + dy)) ny = pos.y + dy;
  return { x: nx, y: ny };
}

// Line of sight between two pixel points: step along the segment and
// stop at the first sight-blocking tile.
export function hasLineOfSight(world, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((ax + dx * t) / TILE);
    const ty = Math.floor((ay + dy * t) / TILE);
    if (blocksSight(world, tx, ty)) return false;
  }
  return true;
}

// Breadth-first path over open tiles, for chases and investigations.
// Returns a list of tile centres, start tile excluded.
export function findPath(world, fromTx, fromTy, toTx, toTy) {
  if (fromTx === toTx && fromTy === toTy) return [];
  const key = (x, y) => y * world.width + x;
  const prev = new Map();
  const seen = new Set([key(fromTx, fromTy)]);
  const queue = [[fromTx, fromTy]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      if (blocksMove(world, nx, ny)) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, [cx, cy]);
      if (nx === toTx && ny === toTy) {
        const path = [];
        let cur = [nx, ny];
        while (!(cur[0] === fromTx && cur[1] === fromTy)) {
          path.unshift({ x: (cur[0] + 0.5) * TILE, y: (cur[1] + 0.5) * TILE });
          cur = prev.get(key(cur[0], cur[1]));
        }
        return path;
      }
      queue.push([nx, ny]);
    }
  }
  return [];
}

export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}
