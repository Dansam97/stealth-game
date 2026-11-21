// All drawing: the archive floor, walls and cover, the guards' vision
// cones (raycast against walls and crates), the courier, the HUD and the
// menu / caught / win overlays. Everything is drawn with canvas shapes —
// no image files, no fonts fetched over the network.
import { CONE_HALF_ANGLE, CONE_RANGE } from './guards.js';
import { TILE, blocksSight, tileCenter } from './world.js';

const VIEW_W = 1280;
const VIEW_H = 720;

// A stable per-tile shade so the floor reads as old stone, identical
// on every run without storing any random state.
function tileShade(x, y) {
  const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  return (h % 1000) / 1000;
}

function conePolygon(ctx, guard, world) {
  const rays = 26;
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i++) {
    const a = guard.angle - CONE_HALF_ANGLE + ((CONE_HALF_ANGLE * 2 * i) / rays);
    let r = CONE_RANGE;
    for (let d = 8; d <= CONE_RANGE; d += 8) {
      const px = guard.x + Math.cos(a) * d;
      const py = guard.y + Math.sin(a) * d;
      if (blocksSight(world, Math.floor(px / TILE), Math.floor(py / TILE))) {
        r = d;
        break;
      }
    }
    points.push({ x: guard.x + Math.cos(a) * r, y: guard.y + Math.sin(a) * r });
  }
  return points;
}

function coneColor(guard) {
  if (guard.state === 'chase') return { fill: 'rgba(255,64,64,0.20)', edge: 'rgba(255,80,80,0.55)' };
  if (guard.detection > 45 || guard.state === 'investigate' || guard.state === 'search') {
    return { fill: 'rgba(255,166,0,0.15)', edge: 'rgba(255,166,0,0.45)' };
  }
  return { fill: 'rgba(255,214,64,0.10)', edge: 'rgba(255,214,64,0.35)' };
}

function drawFloor(ctx, world) {
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const t = world.tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      const s = tileShade(x, y);
      if (t === '#') {
        ctx.fillStyle = '#2a2f45';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#39406a';
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(px + 3, py + 8, 5, 5);
      } else if (t === 's') {
        ctx.fillStyle = '#1d1830';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = 'rgba(120,90,220,0.10)';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      } else {
        ctx.fillStyle = s < 0.5 ? '#3a3230' : '#403835';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(px, py, TILE, 1);
        if (s > 0.86) {
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(px + 9, py + 11, 8, 5);
        }
      }
      if (t === 'C') {
        ctx.fillStyle = '#6b4a26';
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = '#7d5a30';
        ctx.fillRect(px + 3, py + 3, TILE - 6, 8);
        ctx.strokeStyle = '#4a3016';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3);
        ctx.lineTo(px + TILE - 3, py + TILE - 3);
        ctx.moveTo(px + TILE - 3, py + 3);
        ctx.lineTo(px + 3, py + TILE - 3);
        ctx.stroke();
      }
    }
  }
}

function drawExit(ctx, world, filesDone) {
  const c = tileCenter(world.exit.x, world.exit.y);
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 380);
  ctx.save();
  ctx.translate(c.x, c.y);
  if (filesDone) {
    ctx.fillStyle = `rgba(64,220,120,${0.18 + pulse * 0.12})`;
    ctx.fillRect(-TILE / 2, -TILE / 2, TILE, TILE);
    ctx.fillStyle = '#2fae5f';
    ctx.fillRect(-14, -18, 28, 36);
    ctx.fillStyle = '#d9ffe6';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', 0, 1);
    ctx.strokeStyle = 'rgba(120,255,170,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-TILE / 2 + 1, -TILE / 2 + 1, TILE - 2, TILE - 2);
  } else {
    ctx.fillStyle = '#3d4a3d';
    ctx.fillRect(-14, -18, 28, 36);
    ctx.fillStyle = '#c8a24a';
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3, 0, 6, 10);
    ctx.fillStyle = '#e8e0c8';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKED', 0, 27);
  }
  ctx.restore();
}

function drawFiles(ctx, world) {
  for (const file of world.files) {
    if (file.taken) continue;
    const c = tileCenter(file.x, file.y);
    const bob = Math.sin(performance.now() / 300 + file.x) * 2;
    ctx.save();
    ctx.translate(c.x, c.y + bob);
    ctx.fillStyle = 'rgba(255,235,150,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5ecd0';
    ctx.fillRect(-7, -9, 14, 18);
    ctx.strokeStyle = '#8a7d4f';
    ctx.lineWidth = 1;
    ctx.strokeRect(-7, -9, 14, 18);
    ctx.strokeStyle = '#5a6f9e';
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, -4);
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.moveTo(-4, 4);
    ctx.lineTo(1, 4);
    ctx.stroke();
    ctx.restore();
  }
}

function drawGuard(ctx, guard, world) {
  const color = coneColor(guard);
  const poly = conePolygon(ctx, guard, world);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = color.fill;
  ctx.fill();
  ctx.strokeStyle = color.edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const bob = Math.sin(guard.bobPhase) * 1.5;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob);
  ctx.fillStyle = guard.state === 'chase' ? '#c0392b' : '#7a1f2b';
  ctx.beginPath();
  ctx.arc(0, 0, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8d9b0';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Helmet brim and facing tick.
  ctx.fillStyle = '#e8d9b0';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.angle) * 6, Math.sin(guard.angle) * 6, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath();
  ctx.arc(-Math.cos(guard.angle) * 5, -Math.sin(guard.angle) * 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Suspicion marks above the head.
  if (guard.detection > 25) {
    ctx.save();
    ctx.translate(guard.x, guard.y - guard.radius - 14);
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff5252';
      ctx.fillText('!', 0, 0);
    } else if (guard.state === 'investigate' || guard.state === 'search') {
      ctx.fillStyle = '#ffb020';
      ctx.fillText('?', 0, 0);
    } else {
      ctx.fillStyle = `rgba(255,210,74,${0.5 + guard.detection / 200})`;
      ctx.fillText('!', 0, 0);
    }
    ctx.restore();
  }
  // Detection arc under the guard.
  if (guard.detection > 2) {
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.detection) / 100);
    ctx.strokeStyle = guard.detection > 70 ? '#ff5252' : '#ffb020';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawPlayer(ctx, player) {
  const crouch = player.sneaking ? 0.82 : 1;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e6f8e';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius * crouch + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#bfe9ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point in the facing direction.
  ctx.fillStyle = '#bfe9ff';
  ctx.beginPath();
  ctx.arc(Math.cos(player.faceAngle) * 8, Math.sin(player.faceAngle) * 8, 4, 0, Math.PI * 2);
  ctx.fill();
  // A faint ring when standing in shadow — the game telling you you are hidden.
  if (player.inShadow) {
    ctx.strokeStyle = 'rgba(150,110,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPebbles(ctx, pebbles, now) {
  for (const p of pebbles) {
    const age = (now - p.at) / 1000;
    if (age > 1.2) continue;
    ctx.strokeStyle = `rgba(255,255,255,${0.8 - age * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6 + age * 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#cfc4a0';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, hud) {
  ctx.fillStyle = 'rgba(10,12,24,0.82)';
  ctx.fillRect(0, 0, VIEW_W, 46);
  ctx.fillStyle = '#e8e0c8';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(hud.levelName, 14, 24);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#bfe9ff';
  ctx.fillText(`Files ${hud.files}/${hud.filesNeeded}`, 330, 24);
  ctx.fillText(`Level ${hud.levelIndex + 1}/3`, 450, 24);
  ctx.fillText(`Time ${hud.timeText}`, 540, 24);

  // Detection meter.
  const mx = 700;
  const mw = 260;
  ctx.fillStyle = '#20242e';
  ctx.fillRect(mx, 14, mw, 18);
  const d = hud.detection / 100;
  ctx.fillStyle = d > 0.7 ? '#ff5252' : d > 0.3 ? '#ffb020' : '#ffd24a';
  ctx.fillRect(mx, 14, mw * d, 18);
  ctx.strokeStyle = '#8a8f9e';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 0.5, 14.5, mw, 18);
  ctx.fillStyle = '#e8e0c8';
  ctx.font = '13px monospace';
  ctx.fillText('SEEN', mx + mw + 10, 24);

  ctx.fillStyle = hud.statusColor;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(hud.statusText, VIEW_W - 14, 24);
  ctx.textAlign = 'left';

  // Controls line.
  ctx.fillStyle = 'rgba(10,12,24,0.72)';
  ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
  ctx.fillStyle = '#9aa0b5';
  ctx.font = '13px monospace';
  ctx.fillText('WASD / arrows move · Shift sneak · Click throw a pebble to distract · R restart level · M mute', 14, VIEW_H - 13);
}

function overlayPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,20,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 640;
  const h = 130 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = '#141828';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = accent;
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, VIEW_W / 2, y + 52);
  ctx.fillStyle = '#e8e0c8';
  ctx.font = '16px monospace';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 100 + i * 30));
  ctx.textAlign = 'left';
}

export function render(ctx, state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, state.world);
  drawExit(ctx, state.world, state.filesDone);
  drawFiles(ctx, state.world);
  drawPebbles(ctx, state.pebbles, performance.now());
  for (const guard of state.guards) drawGuard(ctx, guard, state.world);
  if (state.screen === 'play' || state.screen === 'caught' || state.screen === 'leveldone') {
    drawPlayer(ctx, state.player);
  }
  // Soft vignette for the night mood.
  const grad = ctx.createRadialGradient(640, 360, 320, 640, 360, 760);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawHud(ctx, state.hud);

  if (state.screen === 'menu') {
    overlayPanel(ctx, 'THE QUIET COURIER', [
      'A stealth game in the Night Archive.',
      'Lift the files. Reach the green exit. Stay out of the cones.',
      'WASD / arrows to move · Shift to sneak · Click to throw a pebble',
      '',
      'Press Enter or click to begin',
    ], '#ffd24a');
  } else if (state.screen === 'briefing') {
    overlayPanel(ctx, state.world.name, [state.world.briefing, '', 'Press Enter or click to slip in'], '#bfe9ff');
  } else if (state.screen === 'caught') {
    overlayPanel(ctx, 'CAUGHT!', [
      'A warden laid hands on the courier.',
      `Level ${state.hud.levelIndex + 1} — the archive keeps its secrets.`,
      '',
      'Press R to try the wing again',
    ], '#ff5252');
  } else if (state.screen === 'leveldone') {
    overlayPanel(ctx, 'WING CLEARED', [
      `${state.world.name} — unseen, files in hand.`,
      `Time so far: ${state.hud.timeText}`,
      '',
      'Press Enter for the next wing',
    ], '#40dc78');
  } else if (state.screen === 'win') {
    overlayPanel(ctx, 'THE ARCHIVE IS YOURS', [
      'All three wings cleared. Not one warden saw a thing.',
      `Total time: ${state.hud.timeText} · Files lifted: ${state.hud.files}`,
      '',
      'Press Enter to play again',
    ], '#40dc78');
  }
}

export const VIEW_WIDTH = VIEW_W;
export const VIEW_HEIGHT = VIEW_H;
