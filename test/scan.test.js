import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../src/scan.js';
import { createPool } from '../src/net/probe.js';
import { isPrivateIp } from '../src/net/guard.js';

const fakeProbe = async (url) => {
  if (url.includes('alive')) return { status: 200 };
  if (url.includes('locked')) return { status: 403 };
  if (url.includes('gone')) return { status: 404 };
  return { error: 'ENOTFOUND' };
};
const fakeWayback = async (url) =>
  url.includes('gone') ? [{ timestamp: '20180101000000', original: url, statuscode: '200' }] : [];

test('scan resurrects, buries and leaves the living alone', async () => {
  const text = 'a https://alive.example/1 b https://gone.example/2 c https://vanished.example/3 d https://locked.example/4 e https://gone.example/2';
  const events = [];
  const { summary, fixed, results } = await scan(text, {
    probeImpl: fakeProbe, waybackImpl: fakeWayback, onEvent: (t) => events.push(t),
  });
  assert.deepEqual(summary, { total: 4, alive: 1, unknown: 1, resurrected: 1, lost: 1 });
  assert.equal(results.find((r) => r.url.includes('gone')).occurrences, 2);
  assert.equal(fixed,
    'a https://alive.example/1 b https://web.archive.org/web/20180101000000/https://gone.example/2 c https://vanished.example/3 d https://locked.example/4 e https://web.archive.org/web/20180101000000/https://gone.example/2');
  assert.equal(events[0], 'found');
  assert.equal(events.at(-1), 'done');
  assert.equal(events.filter((e) => e === 'result').length, 4);
});

test('a failing archive marks the link lost with an honest epitaph', async () => {
  const { results } = await scan('https://gone.example/x', {
    probeImpl: fakeProbe, waybackImpl: async () => { throw new Error('down'); },
  });
  assert.equal(results[0].state, 'lost');
  assert.match(results[0].epitaph, /did not answer/);
});

test('archived links and the skipped host are never probed', async () => {
  const probed = [];
  const text = 'https://web.archive.org/web/2019/https://gone.example/a https://self.example/nav https://alive.example/x';
  await scan(text, { probeImpl: async (u) => { probed.push(u); return { status: 200 }; }, skipHost: 'self.example' });
  assert.deepEqual(probed, ['https://alive.example/x']);
});

test('maxLinks caps the number of links checked', async () => {
  const text = Array.from({ length: 10 }, (_, i) => `https://alive.example/${i}`).join(' ');
  const { summary } = await scan(text, { probeImpl: fakeProbe, waybackImpl: fakeWayback, maxLinks: 3 });
  assert.equal(summary.total, 3);
});

test('pool respects global and per-host limits (Req 2.6)', async () => {
  const run = createPool({ global: 3, perHost: 2 });
  let active = 0, peak = 0;
  const perHost = new Map(), peakHost = new Map();
  const job = (h) => run(h, async () => {
    active++; peak = Math.max(peak, active);
    perHost.set(h, (perHost.get(h) ?? 0) + 1);
    peakHost.set(h, Math.max(peakHost.get(h) ?? 0, perHost.get(h)));
    await new Promise((r) => setTimeout(r, 5));
    active--; perHost.set(h, perHost.get(h) - 1);
  });
  await Promise.all([...'aaaaabbbbbcccc'].map(job));
  assert.ok(peak <= 3);
  for (const v of peakHost.values()) assert.ok(v <= 2);
});

test('guard recognizes private addresses', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.5.5', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1']) {
    assert.ok(isPrivateIp(ip), ip);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700::1111']) assert.ok(!isPrivateIp(ip), ip);
});
