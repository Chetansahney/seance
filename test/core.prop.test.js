// Property-based tests: one per correctness property in .kiro/specs/seance/design.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { extractLinks } from '../src/core/extract.js';
import { classify } from '../src/core/classify.js';
import { chooseSnapshot, archiveUrl } from '../src/core/snapshot.js';
import { rewrite } from '../src/core/rewrite.js';

const RUNS = { numRuns: 500 };

// URLs whose path ends in a URL-safe character (so trimming never applies).
const safeChar = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-/'.split(''));
const segment = fc.stringOf(safeChar, { minLength: 1, maxLength: 12 }).filter((s) => /[a-z0-9]$/.test(s));
const host = fc.tuple(fc.stringOf(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 1, maxLength: 8 }), fc.constantFrom('com', 'org', 'net', 'io'))
  .map(([a, b]) => `${a}.${b}`);
const urlArb = fc.tuple(fc.constantFrom('http', 'https'), host, segment).map(([s, h, p]) => `${s}://${h}/${p}`);

// Prose that never contains a URL by itself.
const prose = fc.stringOf(fc.constantFrom(...'Lorem ipsum dolor sit amet. Ghosts, (graves) & candles!\n#*-'.split('')), { maxLength: 60 });

test('Property 1: every extracted link is a real substring at its index and starts with http', () => {
  fc.assert(fc.property(fc.string({ maxLength: 300 }), fc.array(urlArb, { maxLength: 4 }), (noise, us) => {
    const text = noise + ' ' + us.join(' ') + ' ' + noise;
    for (const { url, index } of extractLinks(text)) {
      assert.equal(text.slice(index, index + url.length), url);
      assert.match(url, /^https?:\/\//);
    }
  }), RUNS);
});

test('Property 2: a Markdown link embedded in prose is extracted exactly', () => {
  fc.assert(fc.property(prose, urlArb, prose, (before, url, after) => {
    const text = `${before} [label](${url}) ${after}`;
    assert.deepEqual(extractLinks(text).map((l) => l.url), [url]);
  }), RUNS);
});

test('Property 2b: a bare URL followed by sentence punctuation is extracted exactly', () => {
  fc.assert(fc.property(urlArb, fc.constantFrom('.', ',', ';', ':', '!', '?', ')', '.)', '?!'), (url, punct) => {
    assert.deepEqual(extractLinks(`see ${url}${punct} next`).map((l) => l.url), [url]);
  }), RUNS);
});

const docArb = fc.tuple(fc.array(fc.tuple(prose, urlArb), { maxLength: 6 }), prose)
  .map(([parts, tail]) => parts.map(([p, u]) => `${p} ${u} `).join('') + tail);
const mapArb = (text) => {
  const found = [...new Set(extractLinks(text).map((l) => l.url))];
  return fc.subarray(found).chain((keys) => fc.tuple(...keys.map(() => fc.integer({ min: 19960101, max: 20261231 })))
    .map((ts) => new Map(keys.map((k, i) => [k, archiveUrl(`${ts[i]}000000`, k)]))));
};

test('Property 3: rewriting with an empty map changes nothing', () => {
  fc.assert(fc.property(fc.string({ maxLength: 300 }), (t) => {
    assert.equal(rewrite(t, new Map()), t);
  }), RUNS);
});

test('Property 4: rewriting is idempotent', () => {
  fc.assert(fc.property(docArb.chain((t) => fc.tuple(fc.constant(t), mapArb(t))), ([t, m]) => {
    const once = rewrite(t, m);
    assert.equal(rewrite(once, m), once);
  }), RUNS);
});

test('Property 5: rewriting only touches mapped links', () => {
  fc.assert(fc.property(docArb.chain((t) => fc.tuple(fc.constant(t), mapArb(t))), ([t, m]) => {
    const out = rewrite(t, m);
    // Undo the rewrite: replacing every archive URL with its original gives the input back.
    let undone = out;
    for (const [from, to] of m) undone = undone.split(to).join(from);
    assert.equal(undone, t);
    // Links not in the map survive unchanged and in order.
    const untouched = (s) => extractLinks(s).map((l) => l.url).filter((u) => !m.has(u) && !u.startsWith('https://web.archive.org/'));
    assert.deepEqual(untouched(out), untouched(t));
  }), RUNS);
});

const snapArb = fc.record({
  timestamp: fc.integer({ min: 19960101, max: 20261231 }).map((d) => `${d}120000`),
  original: urlArb,
  statuscode: fc.constantFrom('200', '204', '301', '302', '404', '500', '-'),
});

test('Property 6: the chosen snapshot is the newest healthy one, or null if none is healthy', () => {
  fc.assert(fc.property(fc.array(snapArb, { maxLength: 20 }), (rows) => {
    const healthy = rows.filter((r) => r.statuscode.startsWith('2'));
    const chosen = chooseSnapshot(rows);
    if (healthy.length === 0) return assert.equal(chosen, null);
    assert.ok(chosen.statuscode.startsWith('2'));
    for (const r of healthy) assert.ok(chosen.timestamp >= r.timestamp);
  }), RUNS);
});

test('Property 7: every status 100–599 maps to exactly one known state with a reason', () => {
  fc.assert(fc.property(fc.integer({ min: 100, max: 599 }), (status) => {
    const { state, reason } = classify({ status });
    assert.ok(['alive', 'dead', 'unknown'].includes(state));
    assert.ok(reason.length > 0);
    if (status >= 200 && status < 400) assert.equal(state, 'alive');
  }), RUNS);
});
