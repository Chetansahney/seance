// Pure link extraction. One pass finds every http(s) URL, which covers Markdown
// inline/reference links, autolinks, bare URLs and HTML href/src attributes.

// Characters that can never be part of a URL in prose or markup.
const URL_RE = /https?:\/\/[^\s<>"'`{}|\\^\[\]]+/g;

const TRAILING_PUNCT = new Set(['.', ',', ';', ':', '!', '?', '*', '_', '~']);
const PAIRS = { ')': '(', ']': '[' };

/**
 * Strip trailing punctuation that belongs to the sentence, not the URL.
 * Closing brackets are only stripped when they are unbalanced, so
 * `https://en.wikipedia.org/wiki/Foo_(bar)` keeps its parenthesis.
 * @param {string} url
 * @returns {string}
 */
export function trimTrailing(url) {
  let end = url.length;
  while (end > 0) {
    const ch = url[end - 1];
    if (TRAILING_PUNCT.has(ch)) { end--; continue; }
    if (ch in PAIRS) {
      const body = url.slice(0, end);
      const opens = count(body, PAIRS[ch]);
      const closes = count(body, ch);
      if (closes > opens) { end--; continue; }
    }
    break;
  }
  return url.slice(0, end);
}

function count(s, ch) {
  let n = 0;
  for (const c of s) if (c === ch) n++;
  return n;
}

function isValidHttpUrl(s) {
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.length > 0 && u.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Find every absolute http(s) link in a text.
 * @param {string} text
 * @returns {Array<{ url: string, index: number }>}
 */
export function extractLinks(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const out = [];
  for (const m of text.matchAll(URL_RE)) {
    const url = trimTrailing(m[0]);
    if (isValidHttpUrl(url)) out.push({ url, index: m.index });
  }
  return out;
}

/**
 * Group occurrences by URL, keeping first-seen order.
 * @param {Array<{ url: string, index: number }>} links
 * @returns {Array<{ url: string, occurrences: number }>}
 */
export function uniqueLinks(links) {
  const seen = new Map();
  for (const { url } of links) seen.set(url, (seen.get(url) ?? 0) + 1);
  return [...seen].map(([url, occurrences]) => ({ url, occurrences }));
}
