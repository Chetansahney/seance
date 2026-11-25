// Refuse to contact private or local addresses, so a deployed Séance cannot be
// used to probe the network it runs on.
import { lookup, resolve4 } from 'node:dns/promises';
import { isIP } from 'node:net';

/** @param {string} ip */
export function isPrivateIp(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224;
  }
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
  }
  return true;
}

/**
 * @param {string} url
 * @returns {Promise<'ok' | 'blocked' | 'nxdomain' | 'servfail'>}
 */
export async function checkHost(url) {
  let host;
  try { host = new URL(url).hostname.replace(/^\[|\]$/g, ''); } catch { return 'blocked'; }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return 'blocked';
  if (isIP(host)) return isPrivateIp(host) ? 'blocked' : 'ok';
  try {
    const addrs = await lookup(host, { all: true });
    return addrs.some((a) => isPrivateIp(a.address)) ? 'blocked' : 'ok';
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_NONAME') return 'nxdomain';
    if (err.code === 'EAI_AGAIN') {
      // Ask DNS directly: seized or abandoned domains often answer SERVFAIL forever.
      try { await resolve4(host); return 'ok'; } catch (e) {
        if (e.code === 'ENOTFOUND') return 'nxdomain';
        if (e.code === 'ESERVFAIL') return 'servfail';
      }
    }
    return 'ok';
  }
}
