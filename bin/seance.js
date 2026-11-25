#!/usr/bin/env node
// Séance CLI: find dead links in a file and resurrect them (Requirement 6).
import { readFile, writeFile } from 'node:fs/promises';
import { scan } from '../src/scan.js';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const target = args.find((a) => !a.startsWith('--'));

if (!target || flags.has('--help')) {
  console.log(`Séance: talk to the dead web

Usage:
  seance <file>          report dead links (exit code 1 if any are dead)
  seance <file> --fix    rewrite the file, pointing dead links at the Wayback Machine
  seance <file> --json   print a machine-readable report
  seance <file> --quiet  only print dead links`);
  process.exit(target ? 0 : 2);
}

const pretty = !flags.has('--json');
const tty = process.stdout.isTTY && pretty;
const c = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const ICON = { alive: c(32, '🕯  alive'), unknown: c(90, '🌫  fog  '), resurrected: c(36, '👻 risen'), lost: c(31, '🪦 lost ') };

const text = await readFile(target, 'utf8');
const quiet = flags.has('--quiet');
if (pretty) console.log(c(35, `\n  Séance for ${target}\n`));

const { results, summary, fixed } = await scan(text, {
  onEvent(type, data) {
    if (!pretty) return;
    if (type === 'found') console.log(c(90, `  Summoning ${data.total} links…\n`));
    if (type === 'result' && !(quiet && (data.state === 'alive' || data.state === 'unknown'))) {
      const extra = data.archive ? c(90, `\n           → ${data.archive}`) : '';
      console.log(`  ${ICON[data.state]}  ${data.url}  ${c(90, data.reason)}${extra}`);
    }
  },
});

if (flags.has('--json')) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  console.log(`\n  ${summary.total} links · ${summary.alive} alive · ${summary.resurrected} resurrected · ${summary.lost} lost · ${summary.unknown} uncertain`);
}

if (flags.has('--fix') && fixed !== text) {
  await writeFile(target, fixed);
  if (pretty) console.log(c(36, `  Exorcised ${target}: ${summary.resurrected} links now point to the Wayback Machine.`));
}

const dead = summary.resurrected + summary.lost;
// Set the code instead of calling process.exit(): exiting while sockets are still
// closing can crash Node on Windows.
process.exitCode = (dead > 0 && !flags.has("--fix")) || summary.lost > 0 ? 1 : 0;
