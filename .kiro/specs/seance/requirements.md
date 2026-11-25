# Requirements: Séance

## Introduction
Séance scans a document or web page for hyperlinks, checks whether each one still
works, and, for dead links, finds an archived copy in the Internet Archive's Wayback
Machine. It can rewrite the document so dead links point to their archived copies.

## Requirement 1: Summon links
**User story:** As a docs maintainer, I want every link in my document found, so that none rot unnoticed.

### Acceptance criteria
1. WHEN the user submits Markdown THEN the system SHALL extract inline links `[text](url)`, reference links `[id]: url`, autolinks `<url>` and bare `http(s)://` URLs.
2. WHEN the user submits HTML THEN the system SHALL extract `href` and `src` values that are absolute http(s) URLs.
3. WHEN the same URL appears several times THEN the system SHALL check it once and report every occurrence.
4. WHEN a bare URL ends in trailing punctuation (`.,;:!?` or an unbalanced `)`) THEN the system SHALL exclude that punctuation from the URL.
5. IF the input has no http(s) links THEN the system SHALL report an empty result, not an error.

## Requirement 2: Check the pulse
**User story:** As a user, I want to know which links are really dead, so that I don't "fix" working links.

### Acceptance criteria
1. WHEN checking a link THEN the system SHALL send HEAD and, IF HEAD fails or returns a status of 400 or higher, SHALL retry with GET (many servers mishandle HEAD).
2. WHEN a response is 2xx or 3xx (after following redirects) THEN the system SHALL classify the link as `alive`.
3. WHEN a response is 400, 404, or 410, or DNS lookup fails THEN the system SHALL classify the link as `dead`.
4. WHEN a response is 5xx or the request times out after 8 seconds THEN the system SHALL classify the link as `dead` with the reason recorded.
5. WHEN a response is any other 4xx (including 401, 403, 429, or any non-standard 4xx) THEN the system SHALL classify the link as `unknown` (the server declined, but the page may still exist).
6. The system SHALL check at most 8 links at once overall and at most 2 at once per host.
7. WHEN a host's `robots.txt` disallows the Séance user-agent for a URL's path THEN the system SHALL classify that link as `unknown` and SHALL NOT fetch it.

## Requirement 3: Resurrect
**User story:** As a user, I want an archived copy of each dead link, so that readers still reach the content.

### Acceptance criteria
1. WHEN a link is `dead` THEN the system SHALL query the Wayback Machine for snapshots.
2. WHEN snapshots exist THEN the system SHALL choose the most recent snapshot whose recorded status was 2xx, so that an archived 404 page is never chosen.
3. IF no successful snapshot exists THEN the system SHALL mark the link `lost` (beyond resurrection).
4. The resurrected URL SHALL have the form `https://web.archive.org/web/<timestamp>/<original-url>`.

## Requirement 4: Exorcise the document
**User story:** As a maintainer, I want a corrected copy of my document, so that I can commit it.

### Acceptance criteria
1. WHEN the user asks for a fix THEN the system SHALL replace every occurrence of each resurrected URL with its archived URL.
2. The system SHALL NOT change any text other than the replaced URLs.
3. Applying the fix twice SHALL give the same result as applying it once (idempotence).
4. Links that are `alive`, `unknown` or `lost` SHALL be left unchanged.

## Requirement 5: Haunted interface
**User story:** As a user, I want to watch the scan happen, so that a long scan feels alive and clear.

### Acceptance criteria
1. WHILE a scan runs THEN the UI SHALL stream results as they arrive (Server-Sent Events).
2. The UI SHALL show alive links as candles, dead links as tombstones, resurrected links as ghosts and unknown links as fog.
3. WHEN `prefers-reduced-motion` is set THEN the UI SHALL turn off animations.
4. The UI SHALL be fully usable with a keyboard and SHALL meet WCAG AA contrast.
5. WHEN the scan finishes THEN the UI SHALL offer the fixed document for download and a summary ("the death certificate").

## Requirement 6: Command line
**User story:** As a maintainer, I want a CLI, so that I can catch link rot in CI.

### Acceptance criteria
1. `seance <file>` SHALL print a report and exit with code 1 IF any dead link is found, and 0 otherwise.
2. `seance <file> --fix` SHALL rewrite the file in place with resurrected links.
3. `seance <file> --json` SHALL print the machine-readable report.

