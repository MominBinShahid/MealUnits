// Rasterises the icon at the sizes Android and iOS actually require (§12).
// Chrome is the rasteriser because it is already on the machine and native;
// adding an image dependency to a project that ships none would be the wrong
// trade for four PNGs that change roughly never.
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { icon } from './icon.svg.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('../public/icons/', import.meta.url).pathname;
const work = join(tmpdir(), `mealunits-icons-${process.pid}`);
mkdirSync(work, { recursive: true });
mkdirSync(OUT, { recursive: true });

// §12: Android install criteria need 192 and 512, and a maskable icon needs a
// SEPARATE file — never "any maskable" on one file, which makes the launcher
// crop artwork that was not drawn to be cropped.
const targets = [
  { file: 'icon-192.png', size: 192, opts: {} },
  { file: 'icon-512.png', size: 512, opts: {} },
  { file: 'icon-maskable-512.png', size: 512, opts: { maskable: true, background: '#ffffff' } },
  // iOS composites onto white anyway and does not honour transparency, so the
  // background is drawn rather than left to the platform.
  { file: 'apple-touch-icon.png', size: 180, opts: { background: '#ffffff' } },
];

for (const { file, size, opts } of targets) {
  const html = join(work, `${file}.html`);
  writeFileSync(
    html,
    `<!doctype html><meta charset=utf-8><style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${icon(opts)}`,
  );
  execFileSync(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `--screenshot=${join(OUT, file)}`,
    `--window-size=${size},${size}`,
    `file://${html}`,
  ], { stdio: 'ignore' });
  console.log(`${file}  ${size}x${size}`);
}
rmSync(work, { recursive: true, force: true });
