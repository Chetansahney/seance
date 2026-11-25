// Check whether a link is alive (Requirement 2.1).
import { checkHost } from './guard.js';
import { isAllowed } from './robots.js';

export const USER_AGENT = 'Mozilla/5.0 (compatible; Seance/0.1; dead-link checker; +https://github.com/Chetansahney/seance)';

function errorCode(err) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'TIMEOUT';
  const code = err?.cause?.code ?? err?.code;
  if (typeof code === 'string' && /CERT|SSL|TLS/i.test(code)) return 'CERT';
  return code ?? 'UNKNOWN';
}

async function attempt(fetchImpl, url, method, timeoutMs) {
  const res = await fetchImpl(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
  });
  // Don't download bodies we don't need.
  try { await res.body?.cancel(); } catch { /* ignore */ }
  return { status: res.status, finalUrl: res.url || url };
}

/**
 * HEAD first; fall back to GET when HEAD errors or answers >= 400, because
 * many servers mishandle HEAD. Checks robots.txt and retries once after a 429.
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, guard?: boolean, backoffMs?: number }} [opts]
 * @returns {Promise<{ status?: number, error?: string, finalUrl?: string }>}
 */
export async function probe(url, { fetchImpl = fetch, timeoutMs = 8000, guard = true, backoffMs = 2000 } = {}) {
  if (guard) {
    const host = await checkHost(url);
    if (host === 'blocked') return { error: 'BLOCKED' };
    if (host === 'nxdomain') return { error: 'ENOTFOUND' };
    if (host === 'servfail') return { error: 'ESERVFAIL' };
  }

  if (!(await isAllowed(url, { fetchImpl, timeoutMs }))) {
    return { error: 'ROBOTS_DISALLOWED' };
  }

  const tryOnce = async () => {
    let head;
    try {
      head = await attempt(fetchImpl, url, 'HEAD', timeoutMs);
      if (head.status < 400) return head;
      if (head.status === 429) return head;
    } catch { /* fall through to GET */ }
    try {
      return await attempt(fetchImpl, url, 'GET', timeoutMs);
    } catch (err) {
      return head ?? { error: errorCode(err) };
    }
  };

  const result = await tryOnce();
  if (result.status === 429 && backoffMs > 0) {
    await new Promise((r) => setTimeout(r, backoffMs));
    return tryOnce();
  }
  return result;
}

/**
 * A concurrency limiter with a global cap and a per-host cap (Requirement 2.6).
 * @param {{ global?: number, perHost?: number }} [limits]
 */
export function createPool({ global = 8, perHost = 2 } = {}) {
  let active = 0;
  const perHostActive = new Map();
  const queue = [];

  const pump = () => {
    for (let i = 0; i < queue.length && active < global; ) {
      const job = queue[i];
      if ((perHostActive.get(job.host) ?? 0) >= perHost) { i++; continue; }
      queue.splice(i, 1);
      active++;
      perHostActive.set(job.host, (perHostActive.get(job.host) ?? 0) + 1);
      Promise.resolve().then(job.fn).then(job.resolve, job.reject).finally(() => {
        active--;
        perHostActive.set(job.host, perHostActive.get(job.host) - 1);
        pump();
      });
    }
  };

  /**
   * @template T
   * @param {string} host
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  return function run(host, fn) {
    return new Promise((resolve, reject) => {
      queue.push({ host, fn, resolve, reject });
      pump();
    });
  };
}
