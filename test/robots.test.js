// Tests for robots.txt compliance and 429 backoff (Task 14).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { isAllowed, parseRobots, clearRobotsCache } from '../src/net/robots.js';
import { probe } from '../src/net/probe.js';

// --- parseRobots unit tests ---

test('parseRobots: disallows path for wildcard agent', () => {
  const body = `
User-agent: *
Disallow: /private/
`;
  const result = parseRobots(body);
  assert.deepEqual(result.disallows, ['/private/']);
  assert.deepEqual(result.allows, []);
});

test('parseRobots: disallows path for Seance agent (case-insensitive)', () => {
  const body = `
User-agent: Seance
Disallow: /no-bots/

User-agent: *
Disallow: /public-no/
`;
  const result = parseRobots(body);
  assert.ok(result.disallows.includes('/no-bots/'));
  assert.ok(result.disallows.includes('/public-no/'));
});

test('parseRobots: empty body returns no disallows', () => {
  assert.deepEqual(parseRobots(''), { allows: [], disallows: [] });
});

test('parseRobots: ignores unrelated agents', () => {
  const body = `
User-agent: Googlebot
Disallow: /secret/
`;
  assert.deepEqual(parseRobots(body), { allows: [], disallows: [] });
});

test('parseRobots: User-agent after a rule line starts a new group (RFC 9309)', () => {
  // No blank line between SomeBot's block and *'s block — Medium-style
  const body = [
    'User-agent: SomeBot',
    'Disallow: /',
    'User-agent: *',
    'Disallow: /private/',
  ].join('\n');
  const { disallows } = parseRobots(body);
  // * group must only have /private/, NOT /
  assert.deepEqual(disallows, ['/private/']);
});

test('parseRobots: Allow with longer path can override Disallow on shorter prefix', () => {
  const body = [
    'User-agent: *',
    'Disallow: /private/',
    'Allow: /private/open/',
  ].join('\n');
  const { allows, disallows } = parseRobots(body);
  assert.ok(allows.includes('/private/open/'));
  assert.ok(disallows.includes('/private/'));
});

// --- isAllowed integration tests ---

test('isAllowed: returns false when robots.txt disallows the path', async () => {
  clearRobotsCache();
  const robotsBody = 'User-agent: *\nDisallow: /blocked/\n';
  const fakeFetch = async (url) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.endsWith('/robots.txt')) {
      return { ok: true, text: async () => robotsBody };
    }
    throw new Error('unexpected fetch');
  };
  const result = await isAllowed('https://example.com/blocked/page', { fetchImpl: fakeFetch });
  assert.equal(result, false);
});

test('isAllowed: returns true when robots.txt allows the path', async () => {
  clearRobotsCache();
  const robotsBody = 'User-agent: *\nDisallow: /private/\n';
  const fakeFetch = async (url) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.endsWith('/robots.txt')) {
      return { ok: true, text: async () => robotsBody };
    }
    throw new Error('unexpected fetch');
  };
  const result = await isAllowed('https://example.com/public/page', { fetchImpl: fakeFetch });
  assert.equal(result, true);
});

test('isAllowed: returns true when robots.txt fetch fails (permissive-on-error)', async () => {
  clearRobotsCache();
  const fakeFetch = async () => { throw new Error('network down'); };
  const result = await isAllowed('https://example.com/any/path', { fetchImpl: fakeFetch });
  assert.equal(result, true);
});

test('isAllowed: returns true when robots.txt returns non-200', async () => {
  clearRobotsCache();
  const fakeFetch = async () => ({ ok: false, status: 404, text: async () => '' });
  const result = await isAllowed('https://example.com/any/path', { fetchImpl: fakeFetch });
  assert.equal(result, true);
});

test('isAllowed: caches robots.txt per host (fetches only once)', async () => {
  clearRobotsCache();
  let fetchCount = 0;
  const robotsBody = 'User-agent: *\nDisallow: /x/\n';
  const fakeFetch = async (url) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.endsWith('/robots.txt')) {
      fetchCount++;
      return { ok: true, text: async () => robotsBody };
    }
    throw new Error('unexpected fetch');
  };
  await isAllowed('https://cached.example/a', { fetchImpl: fakeFetch });
  await isAllowed('https://cached.example/b', { fetchImpl: fakeFetch });
  await isAllowed('https://cached.example/x/secret', { fetchImpl: fakeFetch });
  assert.equal(fetchCount, 1);
});

test('isAllowed: Allow on longer path overrides Disallow on shorter prefix', async () => {
  clearRobotsCache();
  const robotsBody = [
    'User-agent: *',
    'Disallow: /private/',
    'Allow: /private/open/',
  ].join('\n');
  const fakeFetch = async (url) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.endsWith('/robots.txt')) return { ok: true, text: async () => robotsBody };
    throw new Error('unexpected fetch');
  };
  assert.equal(await isAllowed('https://example.com/private/secret', { fetchImpl: fakeFetch }), false);
  clearRobotsCache();
  assert.equal(await isAllowed('https://example.com/private/open/page', { fetchImpl: fakeFetch }), true);
});

// --- probe integration tests ---

test('probe returns ROBOTS_DISALLOWED for a disallowed URL', async () => {
  clearRobotsCache();
  const robotsBody = 'User-agent: *\nDisallow: /locked/\n';
  let fetchCallCount = 0;
  const fakeFetch = async (url) => {
    const u = typeof url === 'string' ? url : url.toString();
    fetchCallCount++;
    if (u.endsWith('/robots.txt')) {
      return { ok: true, text: async () => robotsBody };
    }
    return { status: 200, url: u, body: { cancel: async () => {} } };
  };
  const result = await probe('https://robotblocked.example/locked/page', { fetchImpl: fakeFetch, guard: false });
  assert.equal(result.error, 'ROBOTS_DISALLOWED');
  assert.equal(fetchCallCount, 1);
});

test('probe retries after 429 and returns the second result', async () => {
  clearRobotsCache();
  let callCount = 0;
  const fakeFetch = async (url) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.endsWith('/robots.txt')) {
      return { ok: true, text: async () => '' };
    }
    callCount++;
    if (callCount === 1) {
      return { status: 429, url: u, body: { cancel: async () => {} } };
    }
    return { status: 200, url: u, body: { cancel: async () => {} } };
  };
  const result = await probe('https://ratelimited.example/page', { fetchImpl: fakeFetch, guard: false, backoffMs: 1 });
  assert.equal(result.status, 200);
  assert.equal(callCount, 2);
});

test('probe does not retry 429 when backoffMs is 0', async () => {
  clearRobotsCache();
  let callCount = 0;
  const fakeFetch = async (url) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.endsWith('/robots.txt')) {
      return { ok: true, text: async () => '' };
    }
    callCount++;
    return { status: 429, url: u, body: { cancel: async () => {} } };
  };
  const result = await probe('https://ratelimited2.example/page', { fetchImpl: fakeFetch, guard: false, backoffMs: 0 });
  assert.equal(result.status, 429);
  assert.equal(callCount, 1);
});

// --- Property-based test ---

test("Property: rules in another agent's group never affect the * result", () => {
  const pathArb = fc.stringOf(fc.constantFrom(...'/abcdefghij'.split('')), { minLength: 1, maxLength: 20 })
    .map((s) => (s.startsWith('/') ? s : '/' + s));
  const agentNameArb = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 10 })
    .filter((a) => a !== '*' && a !== 'seance');

  fc.assert(fc.property(agentNameArb, fc.array(pathArb, { minLength: 1, maxLength: 5 }), (agent, paths) => {
    // Build a robots.txt where only `agent` has disallow rules, and `*` has an empty Disallow
    const lines = [`User-agent: ${agent}`, ...paths.map((p) => `Disallow: ${p}`), '', 'User-agent: *', 'Disallow:'];
    const { disallows } = parseRobots(lines.join('\n'));
    // The * section has an empty Disallow, so nothing should be in disallows
    assert.deepEqual(disallows, []);
  }), { numRuns: 500 });
});
