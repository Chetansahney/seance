// Query the Internet Archive's Wayback Machine (Requirement 3.1).
import { USER_AGENT } from './probe.js';

/**
 * Return recent successful captures of a URL from the CDX API, falling back to
 * the availability API if CDX is down.
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<Array<{ timestamp: string, original: string, statuscode: string }>>}
 */
export async function findSnapshots(url, { fetchImpl = fetch, timeoutMs = 20000 } = {}) {
  const headers = { 'user-agent': USER_AGENT };
  try {
    const cdx = new URL('https://web.archive.org/cdx/search/cdx');
    cdx.searchParams.set('url', url);
    cdx.searchParams.set('output', 'json');
    cdx.searchParams.set('fl', 'timestamp,original,statuscode');
    cdx.searchParams.set('filter', 'statuscode:2..');
    cdx.searchParams.set('limit', '-3');
    const res = await fetchImpl(cdx, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (res.ok) {
      const text = await res.text();
      const rows = text.trim() ? JSON.parse(text) : [];
      if (rows.length > 1) {
        const [header, ...data] = rows;
        return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
      }
      return [];
    }
  } catch { /* try the availability API */ }

  const avail = new URL('https://archive.org/wayback/available');
  avail.searchParams.set('url', url);
  const res = await fetchImpl(avail, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Wayback availability API answered ${res.status}`);
  const snap = (await res.json())?.archived_snapshots?.closest;
  if (!snap?.available) return [];
  return [{ timestamp: snap.timestamp, original: url, statuscode: String(snap.status) }];
}
