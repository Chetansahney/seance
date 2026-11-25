// Séance front end: streams a scan and raises the graveyard as results arrive.
const $ = (id) => document.getElementById(id);
const els = {
  form: $('offering'), doc: $('doc'), page: $('page'), begin: $('begin'), sample: $('sample'), error: $('form-error'),
  ritual: $('ritual'), wax: $('wax'), status: $('status'),
  tally: $('tally'), graveyard: $('graveyard'), plots: $('plots'),
  cert: $('certificate'), certText: $('cert-text'), download: $('download'), copy: $('copy'), again: $('again'),
  template: $('plot-template'),
};

const ORDER = { resurrected: 0, lost: 1, unknown: 2, alive: 3, pending: 4 };
const RIP = { resurrected: 'risen', lost: 'r · i · p', unknown: 'unclear', pending: 'listening' };
const STATUS_LINES = [
  'Lighting the candles…', 'Knocking on old doors…', 'Listening for a heartbeat…',
  'Consulting the archive…', 'The spirits are stirring…', 'Reading the tombstones…',
];

let mode = 'text';
let fixed = '';
let sourceName = 'document.md';
let controller = null;

/* ---------- Tabs (arrow-key accessible) ---------- */
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
  }
  mode = tab.id === 'tab-url' ? 'url' : 'text';
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

/* ---------- Sample ---------- */
els.sample.addEventListener('click', async () => {
  selectTab(tabs[0]);
  els.doc.value = await (await fetch('sample.md')).text();
  sourceName = 'README.md';
  els.doc.focus();
});

/* ---------- Filters ---------- */
document.querySelectorAll('.count').forEach((btn) => btn.addEventListener('click', () => {
  const on = btn.getAttribute('aria-pressed') !== 'true';
  document.querySelectorAll('.count').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  btn.setAttribute('aria-pressed', String(on));
  if (on) els.plots.dataset.filter = btn.dataset.filter;
  else delete els.plots.dataset.filter;
}));

/* ---------- Rendering ---------- */
const plotsByUrl = new Map();

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function makePlot(url) {
  const li = els.template.content.firstElementChild.cloneNode(true);
  li.dataset.state = 'pending';
  li.querySelector('.host').textContent = hostOf(url);
  li.querySelector('.url').textContent = url;
  li.querySelector('.rip').textContent = RIP.pending;
  li.querySelector('.cause').textContent = 'Listening';
  return li;
}

function updatePlot(r) {
  const li = plotsByUrl.get(r.url);
  if (!li) return;
  li.dataset.state = r.state;
  li.querySelector('.rip').textContent = RIP[r.state] ?? '';
  const times = r.occurrences > 1 ? ` · appears ${r.occurrences}×` : '';
  li.querySelector('.cause').textContent = r.reason + times;
  const visit = li.querySelector('.visit');
  const epitaph = li.querySelector('.epitaph');
  if (r.state === 'resurrected') {
    epitaph.textContent = `Last seen alive on ${formatDate(r.snapshotDate)}.`;
    visit.href = r.archive;
    visit.textContent = 'Visit the ghost ↗';
    visit.setAttribute('aria-label', `Visit the archived copy of ${r.url} (opens in a new tab)`);
  } else if (r.state === 'lost') {
    epitaph.textContent = r.epitaph ?? 'No successful copy exists in the Wayback Machine.';
  } else if (r.state === 'alive') {
    visit.href = r.url;
    visit.textContent = 'Open ↗';
    visit.setAttribute('aria-label', `Open ${r.url} (opens in a new tab)`);
  } else if (r.state === 'unknown') {
    epitaph.textContent = 'Not counted as dead: we only bury links when we have proof.';
  }
}

function formatDate(iso) {
  if (!iso) return 'an unknown date';
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function setCounts(counts) {
  for (const k of ['resurrected', 'lost', 'unknown', 'alive']) $(`n-${k}`).textContent = counts[k] ?? 0;
}

function sortPlots() {
  const items = [...els.plots.children].sort((a, b) => ORDER[a.dataset.state] - ORDER[b.dataset.state]);
  els.plots.append(...items);
}

/* ---------- Streaming ---------- */
async function* readEvents(response) {
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let cut;
    while ((cut = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      let type = 'message';
      let data = '';
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) type = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (data) yield { type, data: JSON.parse(data) };
    }
  }
}

function reset() {
  plotsByUrl.clear();
  els.plots.replaceChildren();
  delete els.plots.dataset.filter;
  document.querySelectorAll('.count').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  setCounts({});
  els.cert.hidden = true;
  els.error.textContent = '';
  els.wax.style.transform = 'scaleX(1)';
}

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = mode === 'url' ? { url: els.page.value.trim() } : { text: els.doc.value };
  if (mode === 'url' && !/^https?:\/\/\S+\.\S+/.test(body.url)) {
    els.error.textContent = 'Enter the full address of a page, starting with https://';
    els.page.focus();
    return;
  }
  if (mode === 'text' && !body.text.trim()) {
    els.error.textContent = 'The spirits need something to read. Paste a document, or try the haunted README.';
    els.doc.focus();
    return;
  }
  if (mode === 'url') sourceName = (hostOf(body.url) || 'page') + '.html';
  else if (sourceName !== 'README.md') sourceName = 'document.md';

  controller?.abort();
  controller = new AbortController();
  reset();
  els.begin.disabled = true;
  els.begin.lastChild.textContent = 'The séance is in progress…';
  els.ritual.hidden = false;
  els.status.textContent = STATUS_LINES[0];

  let total = 0;
  let answered = 0;
  const counts = { resurrected: 0, lost: 0, unknown: 0, alive: 0 };
  const ticker = setInterval(() => {
    if (answered < total) els.status.textContent = `${STATUS_LINES[Math.floor(Math.random() * STATUS_LINES.length)]} ${answered} of ${total} have answered.`;
  }, 2200);

  try {
    const res = await fetch('/api/scan', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `The séance failed (${res.status})`);
    }
    for await (const { type, data } of readEvents(res)) {
      if (type === 'found') {
        total = data.total;
        if (total === 0) {
          els.status.textContent = 'No links found. Nothing here has ever lived.';
          break;
        }
        els.status.textContent = `Summoned ${total} link${total === 1 ? '' : 's'}. Listening for a heartbeat…`;
        els.tally.hidden = false;
        els.graveyard.hidden = false;
        for (const url of data.urls) {
          const li = makePlot(url);
          plotsByUrl.set(url, li);
          els.plots.append(li);
        }
      } else if (type === 'result') {
        answered++;
        counts[data.state]++;
        updatePlot(data);
        setCounts(counts);
        els.wax.style.transform = `scaleX(${Math.max(0.04, 1 - answered / total)})`;
      } else if (type === 'warning') {
        els.error.textContent = data.message;
      } else if (type === 'error') {
        throw new Error(data.message);
      } else if (type === 'done') {
        fixed = data.fixed;
        sortPlots();
        showCertificate(data.summary);
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      els.error.textContent = err.message;
      els.ritual.hidden = true;
    }
  } finally {
    clearInterval(ticker);
    els.begin.disabled = false;
    els.begin.lastChild.textContent = 'Begin the séance';
  }
});

function showCertificate(s) {
  const dead = s.resurrected + s.lost;
  els.status.textContent = `The séance is over. ${s.total} links examined.`;
  els.wax.style.transform = 'scaleX(0.04)';
  const parts = [];
  if (dead === 0) {
    parts.push(`All ${s.alive} links are alive. This document is in good health. Come back next year.`);
  } else {
    parts.push(`Of ${s.total} links examined, ${dead} had passed on.`);
    if (s.resurrected) parts.push(`${s.resurrected} ${s.resurrected === 1 ? 'was' : 'were'} raised from the Wayback Machine.`);
    if (s.lost) parts.push(`${s.lost} ${s.lost === 1 ? 'is' : 'are'} beyond reach; consider removing or replacing ${s.lost === 1 ? 'it' : 'them'}.`);
  }
  if (s.unknown) parts.push(`${s.unknown} remain${s.unknown === 1 ? 's' : ''} in the fog (blocked or rate-limited), so we left ${s.unknown === 1 ? 'it' : 'them'} untouched.`);
  els.certText.textContent = parts.join(' ');
  const changed = s.resurrected > 0;
  els.download.hidden = !changed;
  els.copy.hidden = !changed;
  els.cert.hidden = false;
  els.cert.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
}

els.download.addEventListener('click', () => {
  const blob = new Blob([fixed], { type: 'text/plain;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: sourceName.replace(/(\.\w+)?$/, '.exorcised$1') });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

els.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(fixed);
    els.copy.textContent = 'Copied ✓';
  } catch {
    els.copy.textContent = 'Copy failed';
  }
  setTimeout(() => { els.copy.textContent = 'Copy it'; }, 2000);
});

els.again.addEventListener('click', () => {
  reset();
  els.tally.hidden = els.graveyard.hidden = els.ritual.hidden = true;
  window.scrollTo({ top: 0 });
  (mode === 'url' ? els.page : els.doc).focus();
});
