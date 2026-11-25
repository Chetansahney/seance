import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractLinks, trimTrailing, uniqueLinks } from '../src/core/extract.js';
import { classify } from '../src/core/classify.js';
import { chooseSnapshot, archiveUrl, snapshotDate } from '../src/core/snapshot.js';
import { rewrite } from '../src/core/rewrite.js';

const urls = (t) => extractLinks(t).map((l) => l.url);

test('extracts Markdown inline, reference, autolink and bare links (Req 1.1)', () => {
  const md = [
    'See [docs](https://a.example/docs) and <https://b.example/x>.',
    '[ref]: https://c.example/ref',
    'Bare: https://d.example/path?q=1#frag, then more.',
    '[titled](https://e.example/t "Title")',
  ].join('\n');
  assert.deepEqual(urls(md), [
    'https://a.example/docs', 'https://b.example/x', 'https://c.example/ref',
    'https://d.example/path?q=1#frag', 'https://e.example/t',
  ]);
});

test('extracts HTML href and src (Req 1.2)', () => {
  const html = `<a href="https://a.example/p">x</a><img src='https://b.example/i.png'>`;
  assert.deepEqual(urls(html), ['https://a.example/p', 'https://b.example/i.png']);
});

test('keeps balanced parentheses, drops sentence punctuation (Req 1.4)', () => {
  assert.equal(trimTrailing('https://en.wikipedia.org/wiki/Foo_(bar)'), 'https://en.wikipedia.org/wiki/Foo_(bar)');
  assert.equal(trimTrailing('https://en.wikipedia.org/wiki/Foo_(bar))'), 'https://en.wikipedia.org/wiki/Foo_(bar)');
  assert.equal(trimTrailing('https://a.example/x.'), 'https://a.example/x');
  assert.equal(trimTrailing('https://a.example/x?!'), 'https://a.example/x');
  assert.deepEqual(urls('[w](https://en.wikipedia.org/wiki/Foo_(bar))'), ['https://en.wikipedia.org/wiki/Foo_(bar)']);
});

test('ignores non-http and hostless links, and empty input (Req 1.5)', () => {
  assert.deepEqual(urls('mailto:a@b.c ftp://x.example http:// https://localhost/'), []);
  assert.deepEqual(extractLinks(''), []);
  assert.deepEqual(extractLinks(undefined), []);
});

test('groups duplicates (Req 1.3)', () => {
  const u = uniqueLinks(extractLinks('https://a.example https://b.example https://a.example'));
  assert.deepEqual(u, [{ url: 'https://a.example', occurrences: 2 }, { url: 'https://b.example', occurrences: 1 }]);
});

test('classifies HTTP outcomes (Req 2.2-2.7)', () => {
  assert.equal(classify({ status: 200 }).state, 'alive');
  assert.equal(classify({ status: 301 }).state, 'alive');
  assert.equal(classify({ status: 404 }).state, 'dead');
  assert.equal(classify({ status: 410 }).state, 'dead');
  assert.equal(classify({ status: 503 }).state, 'dead');
  assert.equal(classify({ status: 403 }).state, 'unknown');
  assert.equal(classify({ status: 401 }).state, 'unknown');
  assert.equal(classify({ status: 429 }).state, 'unknown');
  assert.equal(classify({ error: 'ENOTFOUND' }).state, 'dead');
  assert.equal(classify({ error: 'ESERVFAIL' }).state, 'dead');
  assert.equal(classify({ error: 'TIMEOUT' }).state, 'dead');
  assert.equal(classify({ error: 'BLOCKED' }).state, 'unknown');
  assert.equal(classify({ error: 'WEIRD' }).state, 'unknown');
  assert.equal(classify({}).state, 'unknown');
  assert.equal(classify({ status: 400 }).state, 'dead');
  assert.equal(classify({ status: 419 }).state, 'unknown');
});

test('chooses the newest healthy snapshot, never an archived 404 (Req 3.2)', () => {
  const rows = [
    { timestamp: '20150101000000', original: 'http://a', statuscode: '200' },
    { timestamp: '20190101000000', original: 'http://a', statuscode: '200' },
    { timestamp: '20220101000000', original: 'http://a', statuscode: '404' },
    { timestamp: '20200101000000', original: 'http://a', statuscode: '301' },
  ];
  assert.equal(chooseSnapshot(rows).timestamp, '20190101000000');
  assert.equal(chooseSnapshot([]), null);
  assert.equal(chooseSnapshot(null), null);
  assert.equal(chooseSnapshot([{ timestamp: 'bad', statuscode: '200' }]), null);
});

test('builds Wayback URLs and dates (Req 3.4)', () => {
  assert.equal(archiveUrl('20190101000000', 'https://a.example/x'), 'https://web.archive.org/web/20190101000000/https://a.example/x');
  assert.equal(snapshotDate('20190315123000'), '2019-03-15');
});

test('rewrites only whole links and is idempotent (Req 4)', () => {
  const map = new Map([['https://a.example/x', 'https://web.archive.org/web/2019/https://a.example/x']]);
  const doc = 'Go to https://a.example/x. Not https://a.example/xyz or [y](https://a.example/x).';
  const once = rewrite(doc, map);
  assert.equal(once, 'Go to https://web.archive.org/web/2019/https://a.example/x. Not https://a.example/xyz or [y](https://web.archive.org/web/2019/https://a.example/x).');
  assert.equal(rewrite(once, map), once);
  assert.equal(rewrite(doc, new Map()), doc);
});

