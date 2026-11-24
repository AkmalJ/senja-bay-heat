// Senja Bay Heat — the hand-in program (Node 22, standard library
// only). The game is this directory's game/ folder: plain static
// files a desktop browser loads offline, an open-world crime game
// in a sunset-locked Indonesian port city, built on a vendored
// three.js. This program copies game/ and screenshots/ from beside
// itself into the output directory and writes dossier.json there
// with the vendored make.fun library, byte for byte as the gate
// will rebuild it.
//
// Run it the way the kit prescribes:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play the game locally with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The four frames that sell the game ride in screenshots/, first by
// name is the cover: the boulevard chase, the port duel, the title
// vista, the town board. Everything else the judge reads is game/.
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The gate's own caps, passed to the dossier builder so an entry
// that would be refused is refused here first: at most 4 shots of
// 256 KiB, at most 993 files and 48 MiB under game/, no game path
// over 1,000 bytes, and the dossier text capped at 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Say what was handed in, so a local run shows the entry is whole
// and inside the gate's caps before anyone ships it anywhere. The
// builder returns the dossier as bytes; decode before reading it.
const dossierText = typeof dossier === 'string' ? dossier : new TextDecoder().decode(dossier);
const parsed = JSON.parse(dossierText) as { images?: unknown[] };
console.log(
  `Senja Bay Heat handed in: dossier ${(dossierText.length / 1024).toFixed(1)} KiB, ` +
  `${parsed.images?.length ?? 0} screenshots on the contact sheet.`,
);
