// The Quiet Courier — make.fun hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes the dossier buildDossier derives from them, so the
// sealed scorer's rebuild matches this one byte for byte.
import { chmodSync, cpSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stale output inherits the read-only repo's 444/555 modes via cpSync, so
// make it writable before removing it, or a second run fails with EACCES.
function makeWritable(p: string): void {
  const st = lstatSync(p);
  if (st.isDirectory()) {
    for (const e of readdirSync(p)) makeWritable(join(p, e));
  }
  chmodSync(p, st.isDirectory() ? 0o755 : 0o644);
}

mkdirSync(outDir, { recursive: true });
// Never remove outDir itself: the grader mounts /output writable but its
// parent read-only, so deleting the directory itself fails with EPERM.
// Clear only its contents, so a second run over a non-empty output works.
for (const entry of readdirSync(outDir)) {
  const p = join(outDir, entry);
  makeWritable(p);
  rmSync(p, { recursive: true, force: true });
}
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
