// Render the video's still cards (1280x720 PNG) with headless Edge.
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { launch } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, 'build');
const KIRO = join(HERE, '..', 'docs', 'kiro');
const LIVE = 'seance-sqcf.onrender.com';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const base = (body, extra = '') => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1280px; height: 720px; overflow: hidden; }
  body { background: radial-gradient(900px 500px at 85% -10%, #231d33, transparent 60%), #0b0a10; color: #ece6f5;
         font: 22px/1.5 'IM Fell English', Georgia, serif; padding: 56px 72px; }
  .sc { font-family: 'IM Fell English SC', Georgia, serif; }
  .eyebrow { font-family: 'IM Fell English SC', serif; letter-spacing: .18em; color: #a8a0b8; font-size: 18px; }
  h1 { font-family: 'IM Fell English SC', serif; font-weight: 400; font-size: 54px; line-height: 1.05; }
  .mono { font-family: 'Cascadia Code', Consolas, monospace; }
  .ghost { color: #b9f5d8; } .blood { color: #ff9b9b; } .ember { color: #ffb37a; } .ash { color: #a8a0b8; }
  ${extra}
</style></head><body>${body}</body></html>`;

// ---------- Scene 1: the rotted README ----------
const readmeLines = [
  ['# Awesome Web History', null],
  ['', null],
  ['- [Link rot on Wikipedia](https://en.wikipedia.org/wiki/Link_rot)', 'alive'],
  ['- Source code lives on [GitHub](https://github.com/)', 'alive'],
  ['- Mashups were built with [Yahoo! Pipes](https://pipes.yahoo.com/pipes/)', 'dead'],
  ['- Firefox extensions used the [Add-on SDK](https://developer.mozilla.org/en-US/Add-ons/SDK)', 'dead'],
  ['- Our photos lived on [Picasa Web Albums](https://picasaweb.google.com/)', 'dead'],
  ['- We read every feed in [Google Reader](https://www.google.com/reader/)', 'dead'],
  ['- File sharing at scale: http://www.megaupload.com/', 'dead'],
  ['- Collaboration before its time: [Google Wave](https://www.google.com/intl/en/landing/wave/)', 'dead'],
  ['- The HTML5 draft: https://www.w3.org/TR/2009/WD-html5-20090825/', 'alive'],
  ['- Reference docs: <https://developer.mozilla.org/>', 'alive'],
];
const scene1 = base(`
  <p class="eyebrow">an old README · last updated 2014</p>
  <h1 style="margin:6px 0 26px">6 of its 10 links are <span class="blood">dead</span>.</h1>
  <pre class="mono" style="font-size:17px;line-height:1.75;background:#08070c;border:1px solid #3d3948;border-radius:12px;padding:22px 26px">${
    readmeLines.map(([t, s]) => s === 'dead'
      ? `<span style="color:#ff9b9b;text-decoration:line-through;text-decoration-color:#ff9b9b99">${esc(t)}</span>  <span style="color:#ff9b9b">✗</span>`
      : s === 'alive' ? `<span style="color:#c9c4d6">${esc(t)}</span>  <span style="color:#b9f5d8">✓</span>` : `<span class="ash">${esc(t)}</span>`
    ).join('\n')}</pre>`);

// ---------- Scene 6: CLI + GitHub Action ----------
const cli = (await readFile(join(BUILD, 'cli.txt'), 'utf8')).replace(/\r/g, '').trimEnd().split('\n');
const colorLine = (l) => {
  const e = esc(l);
  if (/^\s+\S+\s+risen/u.test(l)) return `<span class="ghost">${e}</span>`;
  if (/^\s+\S+\s+lost/u.test(l)) return `<span class="blood">${e}</span>`;
  if (l.trim().startsWith('→')) return `<span class="ash">${e}</span>`;
  if (l.startsWith('exit=')) return `<span class="blood">${e}  ← the build fails</span>`;
  return e;
};
const scene6 = base(`
  <p class="eyebrow">the same engine, in your terminal and in CI</p>
  <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:22px;margin-top:18px;height:560px">
    <div style="background:#08070c;border:1px solid #3d3948;border-radius:12px;overflow:hidden">
      <div style="background:#1a1724;padding:8px 14px;font-size:15px" class="ash mono">● ● ●&nbsp;&nbsp; $ node bin/seance.js README.md --quiet</div>
      <pre class="mono" style="font-size:12.5px;line-height:1.6;padding:14px 16px;white-space:pre-wrap;word-break:break-all">${cli.map(colorLine).join('\n')}</pre>
    </div>
    <div style="background:#08070c;border:1px solid #3d3948;border-radius:12px;overflow:hidden">
      <div style="background:#1a1724;padding:8px 14px;font-size:15px" class="ash mono">.github/workflows/links.yml</div>
      <pre class="mono" style="font-size:15px;line-height:1.7;padding:16px 18px"><span class="ash">on:</span> pull_request
<span class="ash">jobs:</span>
  links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: <span class="ghost">Chetansahney/seance@main</span>
        with:
          files: README.md
          fix: false</pre>
      <p style="padding:6px 18px;font-size:19px">A dead link fails the pull request, <em>not your readers.</em></p>
    </div>
  </div>`);

// ---------- Scene 7: Kiro ----------
const kiroIntro = base(`
  <p class="eyebrow">how it was built</p>
  <h1 style="margin:6px 0 34px">Spec-driven, in <span class="ghost">Kiro</span></h1>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
    ${[
      ['Requirements', '6 user stories, EARS acceptance criteria', 'WHEN a response is 404 or 410 … THEN the system SHALL classify the link as dead'],
      ['Design', '7 numbered correctness properties', 'rewrite(rewrite(t, m), m) = rewrite(t, m)'],
      ['Task list', '16 tasks, each citing its requirement', '[x] 14. Respect robots.txt and back off on 429'],
    ].map(([h, s, q]) => `<div style="border:1px solid #3d3948;border-radius:14px;padding:22px;background:#ffffff07">
        <p class="sc" style="font-size:30px">${h}</p><p class="ash" style="font-size:19px;margin:4px 0 14px">${s}</p>
        <p class="mono" style="font-size:14px;color:#c9c4d6;background:#08070c;border-radius:8px;padding:10px">${esc(q)}</p></div>`).join('')}
  </div>
  <p style="margin-top:34px;font-size:24px">Steering docs · 4 agent hooks · <span class="ember">39 unit + property tests</span> · axe audit</p>`);

const slides = [
  ['01-task12-github-action-done', 'Spec tasks run from Kiro’s <b>Start task</b> button'],
  ['07-spec-mode-plan-before-edit', 'Spec mode proposes a plan <b>before</b> it edits'],
  ['02-task12-steering-conflict-actions-core', 'Steering: “zero runtime dependencies” stopped an <b>@actions/core</b> install'],
  ['05-hook-tests-fire-on-src-edit', 'Hook: the tests run on every <b>src/</b> edit…'],
  ['06-hook-tests-catch-429-bug', '…and caught a bug: a rate-limited server was <b>hit twice</b>'],
  ['03-hook-accessible-horror-fires', 'Hook: the accessibility check fires on every UI edit'],
  ['04-hook-accessible-horror-verdict', 'Contrast 12.5 : 1, reduced motion, keyboard: <b>verified</b>'],
  ['08-task16-axe-zero-violations', 'axe audit in Edge: <b>zero</b> accessibility violations'],
];
const slideHtml = ([file, caption]) => base(`
  <div style="position:absolute;inset:0;padding:28px 48px 0;display:flex;flex-direction:column;align-items:center">
    <img src="${pathToFileURL(join(KIRO, file + '.jpg'))}" style="max-width:1184px;max-height:590px;border-radius:10px;border:1px solid #3d3948;box-shadow:0 20px 60px #000a">
    <p style="margin-top:16px;font-size:28px;text-align:center">${caption}</p>
  </div>`, 'b { color: #b9f5d8; font-weight: 400; }');

// ---------- Scene 8: outro ----------
const outro = base(`
  <div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
    <svg viewBox="0 0 64 72" width="84" height="94" style="color:#b9f5d8;filter:drop-shadow(0 0 18px #b9f5d899)"><path d="M32 2C16 2 6 14 6 30v38l8-6 6 6 6-6 6 6 6-6 6 6 6-6 8 6V30C58 14 48 2 32 2z" fill="currentColor"/><circle cx="23" cy="30" r="4" fill="#0b0a10"/><circle cx="41" cy="30" r="4" fill="#0b0a10"/><ellipse cx="32" cy="44" rx="5" ry="6" fill="#0b0a10"/></svg>
    <h1 style="font-size:110px;margin-top:14px;text-shadow:0 0 30px #b9f5d833">Séance</h1>
    <p style="font-size:30px;margin-top:4px">Talk to the dead web.</p>
    <p class="mono ghost" style="font-size:26px;margin-top:34px">${LIVE}</p>
    <p class="mono ash" style="font-size:20px;margin-top:8px">github.com/Chetansahney/seance · MIT</p>
    <p class="ash" style="font-size:18px;margin-top:30px">Built with Kiro for Kiroween 2026 · Archived copies courtesy of the Internet Archive</p>
  </div>`);

const cards = { 'card-s1': scene1, 'card-s6': scene6, 'card-s7-00': kiroIntro, 'card-s8': outro };
slides.forEach((s, i) => { cards[`card-s7-${String(i + 1).padStart(2, '0')}`] = slideHtml(s); });

const b = await launch({ port: 9345 });
for (const [name, html] of Object.entries(cards)) {
  const file = join(BUILD, name + '.html');
  await writeFile(file, html);
  await b.goto(pathToFileURL(file).href, 1200);
  await b.evaluate('document.fonts.ready.then(() => true)');
  await writeFile(join(BUILD, name + '.png'), await b.screenshot('png'));
  console.log('rendered', name);
}
await b.close();
