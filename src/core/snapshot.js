// Pure Wayback snapshot selection (Requirement 3).

/** @typedef {{ timestamp: string, original: string, statuscode: string }} Snapshot */

const TS_RE = /^\d{14}$/;

/**
 * Pick the newest snapshot that was recorded with a 2xx status, so we never
 * resurrect a link as an archived copy of its own 404 page.
 * @param {Snapshot[] | null | undefined} snapshots
 * @returns {Snapshot | null}
 */
export function chooseSnapshot(snapshots) {
  if (!Array.isArray(snapshots)) return null;
  let best = null;
  for (const s of snapshots) {
    if (!s || !TS_RE.test(String(s.timestamp)) || !/^2\d\d$/.test(String(s.statuscode))) continue;
    if (!best || s.timestamp > best.timestamp) best = s;
  }
  return best;
}

/**
 * @param {string} timestamp 14-digit Wayback timestamp
 * @param {string} url original URL
 */
export function archiveUrl(timestamp, url) {
  return `https://web.archive.org/web/${timestamp}/${url}`;
}

/**
 * Turn a 14-digit timestamp into an ISO date (YYYY-MM-DD).
 * @param {string} timestamp
 */
export function snapshotDate(timestamp) {
  return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
}
