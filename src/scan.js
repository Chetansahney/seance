// Orchestrate a séance: extract, probe, resurrect, rewrite.
import { extractLinks, uniqueLinks } from './core/extract.js';
import { classify } from './core/classify.js';
import { chooseSnapshot, archiveUrl, snapshotDate } from './core/snapshot.js';
import { rewrite } from './core/rewrite.js';
import { probe, createPool } from './net/probe.js';
import { findSnapshots } from './net/wayback.js';

/**
 * @typedef {'alive' | 'unknown' | 'resurrected' | 'lost'} FinalState
 * @typedef {{ url: string, occurrences: number, state: FinalState, reason: string,
 *   status?: number, archive?: string, snapshotDate?: string }} LinkResult
 */

/**
 * @param {string} text
 * @param {{
 *   onEvent?: (type: string, data: any) => void,
 *   probeImpl?: (url: string) => Promise<{ status?: number, error?: string }>,
 *   waybackImpl?: (url: string) => Promise<any[]>,
 *   limits?: { global?: number, perHost?: number },
 *   signal?: AbortSignal,
 *   maxLinks?: number,
 *   skipHost?: string,
 * }} [opts]
 */
export async function scan(text, opts = {}) {
  const { onEvent = () => {}, probeImpl = probe, waybackImpl = findSnapshots, limits, signal, maxLinks = Infinity, skipHost } = opts;
  // Links that already point at the archive are already resurrected; links back to the
  // scanned page's own site are navigation, not citations.
  const all = uniqueLinks(extractLinks(text)).filter(({ url }) => {
    const host = new URL(url).hostname;
    return host !== 'web.archive.org' && host !== skipHost;
  });
  const links = all.slice(0, maxLinks);
  onEvent('found', { total: links.length, skipped: all.length - links.length, urls: links.map((l) => l.url) });

  const run = createPool(limits);
  const waybackRun = createPool({ global: 3, perHost: 3 });

  /** @type {LinkResult[]} */
  const results = await Promise.all(links.map(({ url, occurrences }) =>
    run(new URL(url).hostname, async () => {
      if (signal?.aborted) return { url, occurrences, state: 'unknown', reason: 'Séance interrupted' };
      const outcome = await probeImpl(url);
      const { state, reason } = classify(outcome);
      /** @type {LinkResult} */
      let result = { url, occurrences, state, reason, status: outcome.status };
      if (state === 'dead') {
        let snaps = null;
        let archiveError = false;
        try { snaps = await waybackRun('wayback', () => waybackImpl(url)); } catch { archiveError = true; }
        const snap = chooseSnapshot(snaps);
        result = snap
          ? { ...result, state: 'resurrected', archive: archiveUrl(snap.timestamp, snap.original || url), snapshotDate: snapshotDate(snap.timestamp) }
          : { ...result, state: 'lost', epitaph: archiveError ? 'The archive did not answer. Try again later.' : 'No successful copy exists in the Wayback Machine.' };
      }
      onEvent('result', result);
      return result;
    })));

  const map = new Map(results.filter((r) => r.archive).map((r) => [r.url, r.archive]));
  const fixed = rewrite(text, map);
  const summary = { total: results.length, alive: 0, unknown: 0, resurrected: 0, lost: 0 };
  for (const r of results) summary[r.state]++;
  onEvent('done', { summary, fixed });
  return { results, summary, fixed };
}
