// Screen-capture the live site in headless Edge, timing each action to the narration.
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { launch, sleep } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, 'build');
const FRAMES = join(BUILD, 'demo-frames');
const URL_LIVE = process.env.SEANCE_URL ?? 'https://seance-sqcf.onrender.com/';
const PAD = 0.6; // seconds of silence after each narration clip

const dur = (id) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(BUILD, id + '.wav')]).toString());
const seg = ['s2', 's3', 's4', 's5'].map((id) => ({ id, len: dur(id) + PAD }));
const start = {};
let t = 0;
for (const s of seg) { start[s.id] = t; t += s.len; }
const TOTAL = t;
console.log('segments', seg.map((s) => `${s.id}@${start[s.id].toFixed(1)}`).join(' '), 'total', TOTAL.toFixed(1));

// Wake the free Render instance first.
await fetch(URL_LIVE + 'healthz').catch(() => {});

await rm(FRAMES, { recursive: true, force: true });
await mkdir(FRAMES, { recursive: true });

const b = await launch({ port: 9346 });
await b.goto(URL_LIVE, 2500);
await b.evaluate('document.fonts.ready.then(() => true)');

const smooth = (expr) => b.evaluate(`(() => { const y = ${expr}; window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); return y; })()`);
const actions = [
  // Scene 3: "Paste a document, or try the haunted README…"
  [start.s3 + 1.2, () => b.evaluate("document.getElementById('sample').click(); true")],
  [start.s3 + 2.0, () => smooth("document.getElementById('doc').getBoundingClientRect().top + scrollY - 120")],
  [start.s3 + 4.2, () => b.evaluate("document.getElementById('begin').click(); true")],
  [start.s3 + 5.0, () => smooth("document.getElementById('ritual').getBoundingClientRect().top + scrollY - 30")],
  // Scene 4: "Some links are beyond reach…": show the lost tombstones.
  [start.s4 + 0.3, () => smooth("(document.querySelector('.plot[data-state=lost]') || document.getElementById('graveyard')).getBoundingClientRect().top + scrollY - 140")],
  // Scene 5: the certificate.
  [start.s5 + 0.3, () => smooth("document.getElementById('certificate').getBoundingClientRect().top + scrollY - 140")],
];

const frames = [];
const t0 = Date.now();
const runActions = (async () => {
  for (const [at, fn] of actions) {
    const wait = at * 1000 - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    await fn().catch((e) => console.error('action failed', e.message));
  }
})();

let n = 0;
while ((Date.now() - t0) / 1000 < TOTAL) {
  const at = (Date.now() - t0) / 1000;
  const img = await b.screenshot('jpeg', 85);
  const name = `f${String(n++).padStart(5, '0')}.jpg`;
  await writeFile(join(FRAMES, name), img);
  frames.push({ name, at });
}
await runActions;
const state = await b.evaluate("({ cert: !document.getElementById('certificate').hidden, risen: document.querySelectorAll('.plot[data-state=resurrected]').length, lost: document.querySelectorAll('.plot[data-state=lost]').length })");
await b.close();

// ffmpeg concat list: each frame lasts until the next one.
let list = '';
frames.forEach((f, i) => {
  const next = i + 1 < frames.length ? frames[i + 1].at : TOTAL;
  list += `file '${f.name}'\nduration ${Math.max(0.01, next - f.at).toFixed(3)}\n`;
});
list += `file '${frames.at(-1).name}'\n`;
await writeFile(join(FRAMES, 'list.txt'), list);
console.log(`captured ${frames.length} frames over ${TOTAL.toFixed(1)} s (${(frames.length / TOTAL).toFixed(1)} fps)`, state);
