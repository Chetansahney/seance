// Accessibility audit: runs axe on the home page and on the results page
// after loading the sample README. Requires the app server on port 3666.
import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import net from 'node:net';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3666;

// ---- Server lifecycle -------------------------------------------------------

let serverProcess = null;

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createConnection({ port }, () => {
      tester.end();
      resolve(true);
    });
    tester.on('error', () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortInUse(port)) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not start on port ${port} within ${timeoutMs}ms`);
}

test.beforeAll(async () => {
  const alreadyUp = await isPortInUse(PORT);
  if (alreadyUp) {
    console.log(`  ℹ  Server already running on port ${PORT} — skipping spawn.`);
    return;
  }
  serverProcess = spawn('node', ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout.on('data', (d) => process.stdout.write('  [server] ' + d));
  serverProcess.stderr.on('data', (d) => process.stderr.write('  [server] ' + d));
  await waitForPort(PORT);
  console.log(`  ✓  Server started on port ${PORT}`);
});

test.afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

// ---- Helper -----------------------------------------------------------------

function formatViolations(violations) {
  if (violations.length === 0) return '';
  return violations
    .map((v) => {
      const nodes = v.nodes
        .map((n) => `    target: ${JSON.stringify(n.target)}\n    html: ${n.html}`)
        .join('\n');
      return `  [${v.impact}] ${v.id}: ${v.description}\n  Help: ${v.helpUrl}\n${nodes}`;
    })
    .join('\n\n');
}

// ---- Tests ------------------------------------------------------------------

test('home page has zero axe violations', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
    .analyze();

  if (results.violations.length > 0) {
    console.log('\nHome page violations:\n' + formatViolations(results.violations));
  }

  expect(
    results.violations,
    `Found ${results.violations.length} accessibility violation(s) on the home page:\n` +
      formatViolations(results.violations),
  ).toHaveLength(0);
});

test('results page (after sample README scan) has zero axe violations', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Load the sample README into the textarea via the "Try a haunted README" button.
  await page.click('#sample');
  // Wait for the textarea to be populated.
  await page.waitForFunction(() => {
    const ta = document.getElementById('doc');
    return ta && ta.value.length > 0;
  });

  // Start the scan.
  await page.click('#begin');

  // Wait for the done event — the certificate section becomes visible.
  await page.waitForSelector('#certificate:not([hidden])', { timeout: 120_000 });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
    .analyze();

  if (results.violations.length > 0) {
    console.log('\nResults page violations:\n' + formatViolations(results.violations));
  }

  expect(
    results.violations,
    `Found ${results.violations.length} accessibility violation(s) on the results page:\n` +
      formatViolations(results.violations),
  ).toHaveLength(0);
});
