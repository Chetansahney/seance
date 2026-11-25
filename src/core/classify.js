// Pure mapping from a probe outcome to a link state (Requirement 2).

/** @typedef {'alive' | 'dead' | 'unknown'} PulseState */

const DEAD_ERRORS = {
  ENOTFOUND: 'The domain no longer exists (DNS lookup failed)',
  EAI_NONAME: 'The domain no longer exists (DNS lookup failed)',
  ESERVFAIL: "The domain's name servers no longer answer",
  ECONNREFUSED:'The server refused the connection',
  ECONNRESET: 'The connection was cut off',
  EHOSTUNREACH: 'The host is unreachable',
  TIMEOUT: 'No answer within 8 seconds',
};

const UNKNOWN_ERRORS = {
  BLOCKED: 'Private or local address, not checked',
  ROBOTS_DISALLOWED: 'Blocked by robots.txt',
  CERT: 'TLS certificate problem',
  EAI_AGAIN: 'Temporary DNS failure',
};

/**
 * @param {{ status?: number, error?: string }} outcome
 * @returns {{ state: PulseState, reason: string }}
 */
export function classify(outcome) {
  const { status, error } = outcome ?? {};
  if (error) {
    if (DEAD_ERRORS[error]) return { state: 'dead', reason: DEAD_ERRORS[error] };
    if (UNKNOWN_ERRORS[error]) return { state: 'unknown', reason: UNKNOWN_ERRORS[error] };
    return { state: 'unknown', reason: `Network error (${error})` };
  }
  if (!Number.isInteger(status)) return { state: 'unknown', reason: 'No response' };
  if (status >= 200 && status < 400) return { state: 'alive', reason: `Answered ${status}` };
  if (status === 400) return { state: 'dead', reason: '400: malformed request (bad URL)' };
  if (status === 404) return { state: 'dead', reason: '404: the page is gone' };
  if (status === 410) return { state: 'dead', reason: '410: deliberately removed' };
  if (status >= 400 && status < 500) return { state: 'unknown', reason: `${status}: server declined (may be bot protection)` };
  if (status >= 500 && status < 600) return { state: 'dead', reason: `${status}: the server is failing` };
  return { state: 'unknown', reason: `Unusual answer (${status})` };
}
