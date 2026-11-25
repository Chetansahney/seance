// Pure document rewrite (Requirement 4).
import { extractLinks } from './extract.js';

/**
 * Replace each extracted link whose URL is a key of `map` with its value.
 * Only whole extracted links are replaced, so a URL that is a prefix of a
 * longer one is never corrupted. An archived link such as
 * `https://web.archive.org/web/2019.../https://a.com` is extracted as one
 * link, so the original inside it is never replaced again: the rewrite is
 * idempotent.
 * @param {string} text
 * @param {Map<string, string>} map
 * @returns {string}
 */
export function rewrite(text, map) {
  if (!map || map.size === 0) return text;
  let out = '';
  let last = 0;
  for (const { url, index } of extractLinks(text)) {
    const to = map.get(url);
    if (to === undefined) continue;
    out += text.slice(last, index) + to;
    last = index + url.length;
  }
  return out + text.slice(last);
}
