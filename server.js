import express from 'express';
import { randomUUID } from 'node:crypto';
import { chat, MODELS } from './src/groq.js';
import { buildActorPrompt, buildDirectorPrompt, buildDebriefPrompt } from './src/prompts.js';
import { screen } from './src/safety.js';
import {
  BEATS,
  DECISIONS,
  LISTING,
  PERSONA,
  SEEDED_HISTORY,
  getBeat,
} from './src/scenario.js';

const BUILD = new Date().toTimeString().slice(0, 5);

const app = express();
app.use(express.json({ limit: '32kb' }));

// Every request, with status and duration. Without this we are debugging blind —
// a successful call used to produce no output at all, which made "did the browser
// even reach us?" unanswerable.
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - t0}ms`);
  });
  next();
});

// No caching of the app shell during the workshop — removes the entire class of
// "am I looking at stale code?" doubt. Trivial to relax later.
app.use(
  express.static('public', {
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-store, must-revalidate'),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// State lives HERE, in code. currentBeat is an integer in a Map on the server.
// The model is never asked to remember where we are, because models forget and
// integers do not. Nothing is persisted and nothing identifies a student — the
// session code is the only handle that exists.
// ─────────────────────────────────────────────────────────────────────────────
const sessions = new Map();

const shortCode = () => randomUUID().slice(0, 4).toUpperCase();

function newSession() {
  const id = randomUUID();
  const s = {
    id,
    code: shortCode(),
    beat: 0,            // index into BEATS — the spine
    turnCount: 0,       // turns spent in the current beat
    decisions: [],      // what the player chose, with quoted evidence
    redFlagMoments: [], // seller messages where the tactic was visible
    messages: [],       // {from, text, at}
    engagement: 'engaged',
    jailbreakAttempts: 0,
    paused: false,
    ended: false,
    startedAt: Date.now(),
  };
  sessions.set(id, s);
  return s;
}

// Housekeeping — a classroom set runs for an hour, not forever.
setInterval(() => {
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  for (const [id, s] of sessions) if (s.startedAt < cutoff) sessions.delete(id);
}, 15 * 60 * 1000);

// ── Model calls ──────────────────────────────────────────────────────────────

// Last 6 turns only. The Actor gets recent context and the CURRENT BEAT, and
// structurally cannot receive a beat it has not reached.
function transcriptFor(session) {
  return session.messages.slice(-6).map((m) => ({
    role: m.from === 'seller' ? 'assistant' : 'user',
    content: m.text,
  }));
}

async function runActor(session, { deflect = false } = {}) {
  const beat = getBeat(session.beat);
  const system = buildActorPrompt(session.beat, { deflect });

  // Guard rail on the guard rail: assert the prompt carries only this beat.
  if (process.env.NODE_ENV !== 'production') {
    for (const other of BEATS) {
      if (other.id !== beat.id && system.includes(other.instruction)) {
        throw new Error(`ACTOR LEAK: beat ${other.id} instruction reached beat ${beat.id} prompt`);
      }
    }
  }

  const raw = await chat({
    model: MODELS.ACTOR,
    messages: [{ role: 'system', content: system }, ...transcriptFor(session)],
    temperature: 0.9,
    maxTokens: 160,
  });

  // A real person sometimes fires two short messages instead of one long one.
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2);
}

const EMPTY_VERDICT = {
  exit_condition_met: false,
  decision_id: null,
  decision: 'none',
  decision_evidence: '',
  red_flag_noticed: false,
  verification_attempted: false,
  out_of_bounds: 'none',
  engagement: 'engaged',
};

async function runDirector(session, playerText) {
  const beat = getBeat(session.beat);
  const last = [...session.messages].reverse().find((m) => m.from === 'seller');

  try {
    const raw = await chat({
      model: MODELS.DIRECTOR,
      messages: [
        { role: 'system', content: buildDirectorPrompt(session.beat, session.turnCount) },
        {
          role: 'user',
          content: `## Exchange to classify\nSeller said: ${last?.text ?? '(nothing yet)'}\nPlayer replied: ${playerText}`,
        },
      ],
      temperature: 0,
      maxTokens: 220,
      json: true,
      timeoutMs: 8000,
    });
    return { ...EMPTY_VERDICT, ...JSON.parse(raw) };
  } catch {
    // A malformed classification must never crash a student's session. Failing
    // closed here just means the beat does not advance this turn; maxTurns will
    // carry it forward regardless.
    return { ...EMPTY_VERDICT, _degraded: true };
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.post('/api/session', async (req, res) => {
  try {
    const s = newSession();

    const now = Date.now();
    for (const h of SEEDED_HISTORY) {
      s.messages.push({ from: h.from, text: h.text, at: now - h.minutesAgo * 60000 });
    }

    const lines = await runActor(s);
    const at = Date.now();
    lines.forEach((text, i) => s.messages.push({ from: 'seller', text, at: at + i }));

    res.json({
      sessionId: s.id,
      code: s.code,
      build: BUILD,
      listing: LISTING,
      persona: { display: PERSONA.display, handle: PERSONA.handle, avatar: PERSONA.avatar },
      messages: s.messages,
    });
  } catch (err) {
    console.error('session:', err.message);
    res.status(500).json({ error: 'could not start session' });
  }
});

app.post('/api/message', async (req, res) => {
  const { sessionId, text } = req.body ?? {};
  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: 'session not found' });
  if (s.ended || s.paused) return res.status(409).json({ error: 'session closed' });

  const clean = String(text ?? '').slice(0, 600).trim();
  if (!clean) return res.status(400).json({ error: 'empty message' });

  try {
    s.messages.push({ from: 'them', text: clean, at: Date.now() });

    // Screening and classification run together — the safety layers cost no
    // extra wall-clock because they overlap the Director call.
    const [screening, verdict] = await Promise.all([screen(clean), runDirector(s, clean)]);

    // ── Harm → non-punitive facilitator hand-off. The Actor never sees it.
    if (screening.route === 'pause' || verdict.out_of_bounds === 'harmful') {
      const layer =
        screening.route === 'pause' ? `screen:${screening.reason}` : 'director:harmful';
      console.log(`  ⚠ PAUSE by ${layer} — "${clean}"`);
      s.paused = true;
      return res.json({
        paused: true,
        reason: 'Your facilitator will pick this up with the room.',
      });
    }

    // ── Jailbreak / operator probe → absorbed by the fiction, scene continues.
    const deflect =
      screening.route === 'deflect' ||
      verdict.out_of_bounds === 'meta' ||
      verdict.out_of_bounds === 'off_topic';
    if (deflect) s.jailbreakAttempts++;

    // ── Record the decision, with the player's own words as evidence.
    if (verdict.decision && verdict.decision !== 'none') {
      const def = DECISIONS.find((d) => d.id === verdict.decision_id) ??
        DECISIONS.find((d) => d.beat === getBeat(s.beat).id);
      if (def && !s.decisions.some((d) => d.id === def.id)) {
        s.decisions.push({
          id: def.id,
          label: def.description,
          teaches: def.teaches,
          decision: verdict.decision,
          evidence: verdict.decision_evidence || clean.slice(0, 60),
          beat: getBeat(s.beat).id,
        });
      }
    }
    if (verdict.engagement) s.engagement = verdict.engagement;

    // ── THE SPINE: only this code moves the pointer. The model has no
    //    mechanism to advance state and is never asked to.
    s.turnCount++;
    const beat = getBeat(s.beat);
    const advance = verdict.exit_condition_met || s.turnCount >= beat.maxTurns;

    if (advance) {
      // The seller's last message in a completed beat is where that beat's
      // tactic was visible — the debrief quotes it straight back.
      const lastSeller = [...s.messages].reverse().find((m) => m.from === 'seller');
      if (lastSeller) {
        s.redFlagMoments.push({ message: lastSeller.text, tactic: beat.tactic, flag: beat.redFlag });
      }
      if (s.beat < BEATS.length - 1) {
        s.beat++;
        s.turnCount = 0;
      } else {
        s.ended = true;
      }
    }

    const lines = await runActor(s, { deflect });
    const at = Date.now();
    lines.forEach((t, i) => s.messages.push({ from: 'seller', text: t, at: at + i }));

    res.json({
      messages: lines.map((t, i) => ({ from: 'seller', text: t, at: at + i })),
      beat: getBeat(s.beat).id,
      beatName: getBeat(s.beat).name,
      advanced: advance,
      ended: s.ended,
      // Never shown to the student — surfaced only for the facilitator view.
      _debug: { verdict, screening },
    });
  } catch (err) {
    console.error('message:', err.message);
    // Roll back the optimistic push so a retry does not duplicate the turn.
    const i = s.messages.findLastIndex((m) => m.from === 'them' && m.text === clean);
    if (i !== -1) s.messages.splice(i, 1);
    res.status(503).json({ error: 'connection wobbled', retry: true });
  }
});

app.post('/api/debrief', async (req, res) => {
  const s = sessions.get(req.body?.sessionId);
  if (!s) return res.status(404).json({ error: 'session not found' });

  const outcome = s.decisions.some((d) => d.decision === 'unsafe') ? 'scammed' : 'walked_away';

  try {
    // Built entirely from state the code collected. The model is never asked to
    // recall the conversation — it only writes prose around facts we hand it.
    const prose = await chat({
      model: MODELS.ACTOR,
      messages: [{ role: 'user', content: buildDebriefPrompt(s) }],
      temperature: 0.6,
      maxTokens: 400,
    });

    res.json({
      outcome,
      prose,
      decisions: s.decisions,
      redFlagMoments: s.redFlagMoments,
      jailbreakAttempts: s.jailbreakAttempts,
    });
  } catch (err) {
    console.error('debrief:', err.message);
    res.status(503).json({ error: 'could not write debrief' });
  }
});

// One facilitator, 40 devices, no walking around the room. Session codes only —
// there is nothing here that identifies a student, because we never collected it.
app.get('/api/facilitator', (_req, res) => {
  res.json({
    sessions: [...sessions.values()].map((s) => ({
      code: s.code,
      beat: getBeat(s.beat).id,
      beatName: getBeat(s.beat).name,
      decisions: s.decisions.map((d) => ({ id: d.id, decision: d.decision })),
      engagement: s.engagement,
      jailbreakAttempts: s.jailbreakAttempts,
      paused: s.paused,
      ended: s.ended,
      minutes: Math.round((Date.now() - s.startedAt) / 60000),
    })),
  });
});

app.get('/facilitator', (_req, res) => res.sendFile('facilitator.html', { root: 'public' }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`\n  SHIELD 2.0 — ticket resale scenario   [build ${BUILD}]`);
  console.log(`  student  →  http://localhost:${port}`);
  console.log(`  teacher  →  http://localhost:${port}/facilitator\n`);
});
