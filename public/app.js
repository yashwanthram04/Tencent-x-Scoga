// Client is deliberately dumb: render, send, retry. All state and every
// decision live on the server — this file never decides anything about the
// scenario, it only displays what the server already decided.

const $ = (id) => document.getElementById(id);
const thread = $('thread');
const input = $('input');
const sendBtn = $('send');

let sessionId = null;
let sending = false;

// Chrome's back/forward cache restores the previous DOM *without* re-running any
// script or making any request — which meant a paused overlay could come back and
// look permanently frozen, with the server seeing nothing at all. Force a real boot.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});

// ── clock, purely cosmetic realism ─────────────────────────────────────────
function tickClock() {
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
tickClock();
setInterval(tickClock, 15000);

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function addRow(from, text, { stamp = false, at } = {}) {
  const row = document.createElement('div');
  row.className = `row ${from === 'seller' ? 'them' : 'me'}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  thread.appendChild(row);
  if (stamp) {
    const s = document.createElement('div');
    s.className = 'stamp';
    s.style.textAlign = from === 'seller' ? 'left' : 'right';
    s.textContent = fmtTime(at ?? Date.now());
    thread.appendChild(s);
  }
  scrollDown();
  return row;
}

function scrollDown() {
  requestAnimationFrame(() => { thread.scrollTop = thread.scrollHeight; });
}

let typingEl = null;
function showTyping() {
  hideTyping();
  const row = document.createElement('div');
  row.className = 'row them typing';
  row.innerHTML = '<div class="bubble"><div class="dots"><i></i><i></i><i></i></div></div>';
  thread.appendChild(row);
  typingEl = row;
  scrollDown();
}
function hideTyping() {
  if (typingEl) { typingEl.remove(); typingEl = null; }
}

// Perceived latency was one of the five things that broke SHIELD 1.0 — a
// typing indicator whose length tracks the reply reads as a person thinking.
function typingDelayFor(text) {
  const base = 500 + Math.random() * 500;
  const perChar = text.length * 18;
  return Math.min(base + perChar, 3400);
}

async function playLines(lines) {
  for (const line of lines) {
    showTyping();
    await new Promise((r) => setTimeout(r, typingDelayFor(line.text ?? line)));
    hideTyping();
    addRow('seller', line.text ?? line, { stamp: true, at: line.at });
  }
}

// ── boot ─────────────────────────────────────────────────────────────────

async function start() {
  // Never inherit stale overlay state from a previous run — a fresh boot must
  // always land on a usable chat, whatever was on screen before.
  $('pauseOverlay').hidden = true;
  $('debrief').hidden = true;
  thread.innerHTML = '<div class="daysep"><span>Today</span></div>';
  sessionId = null;
  sending = false;
  input.value = '';
  input.disabled = true;
  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/session', { method: 'POST' });
    if (!res.ok) throw new Error('session failed');
    const data = await res.json();
    sessionId = data.sessionId;

    console.log(`SHIELD build ${data.build} · session ${data.code}`);
    $('build').textContent = `v${data.build}`;

    $('sellerName').textContent = data.persona.display;
    $('avatar').textContent = data.persona.avatar;
    $('listingTitle').textContent = data.listing.title;
    $('listingDetail').textContent = data.listing.detail;
    $('listingPrice').textContent = data.listing.price;

    // Render seeded history instantly (they didn't live it), then the live
    // opener with a natural typing delay.
    const seeded = data.messages.slice(0, -1);
    const opener = data.messages.slice(-1);
    for (const m of seeded) addRow(m.from, m.text, { stamp: true, at: m.at });
    await playLines(opener);

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  } catch (err) {
    thread.innerHTML = '';
    const d = document.createElement('div');
    d.className = 'sysline';
    d.textContent = "Couldn't connect. Check the server is running and refresh.";
    thread.appendChild(d);
  }
}

// ── sending ──────────────────────────────────────────────────────────────

async function send() {
  const text = input.value.trim();
  if (!text || sending) return;
  sending = true;
  sendBtn.disabled = true;

  addRow('them', text, { stamp: true, at: Date.now() });
  input.value = '';

  const attempt = async (isRetry = false) => {
    const res = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, text }),
    });

    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      if (body.retry && !isRetry) {
        const sys = document.createElement('div');
        sys.className = 'sysline';
        sys.textContent = 'connection wobbled, retrying…';
        thread.appendChild(sys);
        scrollDown();
        await new Promise((r) => setTimeout(r, 700));
        sys.remove();
        return attempt(true);
      }
      throw new Error('offline');
    }
    // 404 (server restarted, session gone) / 409 (session paused or ended) used to
    // surface as a generic "didn't send" with no way forward. Rebuild instead.
    if (res.status === 404 || res.status === 409) {
      const sys = document.createElement('div');
      sys.className = 'sysline';
      sys.textContent = 'This conversation has ended. Starting a new one…';
      thread.appendChild(sys);
      scrollDown();
      await new Promise((r) => setTimeout(r, 900));
      await start();
      throw new Error('restarted');
    }
    if (!res.ok) throw new Error('bad response');
    return res.json();
  };

  try {
    const data = await attempt();

    if (data.paused) {
      $('pauseOverlay').hidden = false;
      return;
    }

    await playLines(data.messages);

    if (data.ended) {
      await new Promise((r) => setTimeout(r, 500));
      showDebrief();
      return;
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  } catch (err) {
    if (err.message === 'restarted') return; // start() already rebuilt the screen
    const sys = document.createElement('div');
    sys.className = 'sysline';
    sys.textContent = "Message didn't send — check your connection and try again.";
    thread.appendChild(sys);
    scrollDown();
    input.value = text; // give it back so nothing is lost
    input.disabled = false;
    sendBtn.disabled = false;
  } finally {
    sending = false;
  }
}

sendBtn.addEventListener('click', send);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

// ── debrief ──────────────────────────────────────────────────────────────

async function showDebrief() {
  const panel = $('debrief');
  panel.hidden = false;

  try {
    const res = await fetch('/api/debrief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();

    const bad = data.outcome === 'scammed';
    $('debriefBadge').textContent = bad ? 'You got scammed' : 'You walked away safely';
    $('debriefBadge').className = 'debrief-badge ' + (bad ? 'bad' : 'good');
    $('debriefTitle').textContent = bad ? 'Here’s exactly how it happened' : 'Here’s why that was the right call';

    $('debriefProse').innerHTML = '';
    data.prose.split(/\n+/).filter(Boolean).forEach((p) => {
      const el = document.createElement('p');
      el.textContent = p;
      $('debriefProse').appendChild(el);
    });

    const replay = $('replay');
    replay.innerHTML = '<h2>Where it was visible</h2>';
    data.redFlagMoments.forEach((m) => {
      const el = document.createElement('div');
      el.className = 'moment';
      el.innerHTML = `<div class="msg">“${escapeHtml(m.message)}”</div><div class="tac">${escapeHtml(m.tactic)}</div>`;
      replay.appendChild(el);
    });

    const choices = $('choices');
    choices.innerHTML = '<h2>Your decisions</h2>';
    data.decisions.forEach((d) => {
      const el = document.createElement('div');
      el.className = 'choice';
      el.innerHTML = `<span class="pill ${d.decision}">${d.decision}</span>
        <div class="choice-body">
          <div class="what">${escapeHtml(d.label)}</div>
          <div class="said">“${escapeHtml(d.evidence)}”</div>
        </div>`;
      choices.appendChild(el);
    });
  } catch {
    $('debriefProse').innerHTML = '<p>Could not load the debrief — but here is what to remember: whoever pays first, or moves off the platform first, is the one taking all the risk.</p>';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Buttons call this directly — a real in-page reset that does not depend on
// location.reload() surviving whatever state the browser has got itself into.
window.restart = start;

start();
