// Minimal headless Edge driver over the Chrome DevTools Protocol (no dependencies).
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const EDGE = process.env.EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 1280, height = 720, port = 9344 } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'seance-video-'));
  const proc = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`, '--hide-scrollbars', '--force-device-scale-factor=1',
    '--autoplay-policy=no-user-gesture-required', 'about:blank',
  ], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 60 && !targets; i++) {
    await sleep(250);
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { /* not up yet */ }
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));

  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method && listeners.has(m.method)) for (const fn of listeners.get(m.method)) fn(m.params);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const on = (method, fn) => { if (!listeners.has(method)) listeners.set(method, []); listeners.get(method).push(fn); };
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails).slice(0, 400));
    return res.result?.result?.value;
  };

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  const goto = async (url, settleMs = 1500) => {
    const loaded = new Promise((r) => on('Page.loadEventFired', r));
    await send('Page.navigate', { url });
    await Promise.race([loaded, sleep(30000)]);
    await sleep(settleMs);
  };
  const screenshot = async (format = 'png', quality) =>
    Buffer.from((await send('Page.captureScreenshot', { format, ...(quality ? { quality } : {}) })).result.data, 'base64');

  const close = async () => { try { ws.close(); } catch {} proc.kill(); await sleep(500); await rm(profile, { recursive: true, force: true }).catch(() => {}); };
  return { send, on, evaluate, goto, screenshot, close };
}
