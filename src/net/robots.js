// robots.txt compliance check (Task 14).
import { USER_AGENT } from './probe.js';

/** Module-level cache: hostname → parsed rules */
const cache = new Map();

/**
 * Parse a robots.txt body and return the allow/disallow paths that apply to
 * the Séance user-agent (matched as `Seance` or `*`).
 * Implements RFC 9309: a User-agent line after any rule line starts a new group.
 * Longest-match wins; Allow wins on a tie.
 * @param {string} body
 * @returns {{ allows: string[], disallows: string[] }}
 */
export function parseRobots(body) {
  const lines = body.split(/\r?\n/);
  const sections = [];   // { agents: string[], allows: string[], disallows: string[] }
  let current = null;
  let inRules = false;   // true once we have seen at least one rule line in the current group

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) {
      current = null;
      inRules = false;
      continue;
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === 'user-agent') {
      if (current === null || inRules) {
        // Start a fresh group: either we had no group, or the previous group already has rules
        current = { agents: [value.toLowerCase()], allows: [], disallows: [] };
        sections.push(current);
        inRules = false;
      } else {
        // Still in the agent-list header of the current group (no rules yet)
        current.agents.push(value.toLowerCase());
      }
    } else if ((key === 'disallow' || key === 'allow') && current) {
      inRules = true;
      if (value) {
        if (key === 'disallow') current.disallows.push(value);
        else current.allows.push(value);
      }
    }
    // Other directives (Sitemap, Crawl-delay) are ignored; they do not end a group
  }

  // Collect rules from sections that match `seance` or `*`
  const allows = new Set();
  const disallows = new Set();
  for (const section of sections) {
    if (section.agents.some((a) => a === 'seance' || a === '*')) {
      for (const p of section.allows) allows.add(p);
      for (const p of section.disallows) disallows.add(p);
    }
  }
  return { allows: [...allows], disallows: [...disallows] };
}

/**
 * Returns true if Séance is allowed to fetch the given URL per the host's robots.txt.
 * On any fetch or parse error, returns true (permissive-on-error).
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<boolean>}
 */
export async function isAllowed(url, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  let parsed;
  try { parsed = new URL(url); } catch { return true; }

  const host = parsed.hostname;
  const path = parsed.pathname + parsed.search;

  if (cache.has(host)) {
    return checkPath(cache.get(host), path);
  }

  const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
  let rules;
  try {
    const res = await fetchImpl(robotsUrl, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (!res.ok) {
      cache.set(host, { allows: [], disallows: [] });
      return true;
    }
    const body = await res.text();
    rules = parseRobots(body);
  } catch {
    // Network error or timeout — allow by default
    cache.set(host, { allows: [], disallows: [] });
    return true;
  }

  cache.set(host, rules);
  return checkPath(rules, path);
}

/**
 * Longest-match wins. Allow wins on a tie.
 * @param {{ allows: string[], disallows: string[] }} rules
 * @param {string} path
 * @returns {boolean}
 */
function checkPath(rules, path) {
  const { allows, disallows } = rules;
  const bestAllow = allows
    .filter((p) => path.startsWith(p))
    .reduce((a, b) => (b.length > a.length ? b : a), '');
  const bestDisallow = disallows
    .filter((p) => path.startsWith(p))
    .reduce((a, b) => (b.length > a.length ? b : a), '');
  if (!bestDisallow) return true;
  if (!bestAllow) return false;
  return bestAllow.length >= bestDisallow.length;
}

/**
 * Clear the cache (useful in tests).
 */
export function clearRobotsCache() {
  cache.clear();
}
