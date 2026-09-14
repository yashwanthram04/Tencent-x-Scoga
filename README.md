# SHIELD 2.0 — Ticket Resale Scam Simulation

A browser-based scam-recognition trainer built for the **AI Lodge × SCOGA × Tencent Cloud** workshop
(AI for Trust & Safety).

A student opens a link and lands in what looks like an ordinary marketplace DM. A seller is offering
two tickets to a sold-out show. The seller is an LLM playing a character with a hidden agenda, and
over five authored beats it builds trust, manufactures urgency, and tries to talk the student out of
the one protection they had. The student types freely in their own words. At the end, a debrief
replays the exact messages where the manipulation was working and names the tactic.

Built against SCOGA's brief for SHIELD 2.0 — the IMDA Digital for Life–funded rebuild of a program
that has reached 1,300+ Singapore secondary students.

---

## Team

| | |
|---|---|
| **Yashwanth Ram** | Information Systems, Singapore Management University |
| **Jun Han** | Information Systems, Singapore Management University |

---

## The one principle

> **Fixed scaffold, fluid conversation.**

| FIXED — authored, the AI cannot drift | FLUID — the model improvises |
|---|---|
| The arc: setup → hook → pressure → ask → resolution | Voice, typing style, backstory |
| Which tactic each beat teaches | How it moves between beats |
| The three decision points | Its reply to whatever the student typed |
| Which choices are safe | Whether it pushes harder or backs off |
| Hard limits on what the persona will say | How long it lingers before the ask |

The disqualifier in the brief was an open-ended chatbot. This is not one: the conversation is free,
but the topic and the arc are held in code.

---

## Quick start

```bash
npm install
echo "GROQ_API_KEY=gsk_your_key_here" > .env
npm start
```

| | |
|---|---|
| Student view | http://localhost:3000 |
| Facilitator view | http://localhost:3000/facilitator |

No accounts, no database, no build step. `.env` is gitignored — **never commit the key.**

---

## Architecture — two models, not one

The biggest failure mode is one big system prompt containing the whole scam plan, hoping the model
behaves. That is what SHIELD 1.0 did, and it drifts. The job is split in two:

```
browser                      server.js                          Groq
───────                      ─────────                          ────
                  ┌──► 1. regex prefilter (free, sync)
student types ────┤
                  └──► 2. Promise.all([                    ┌─ prompt-guard-2-86m
                           promptGuard(text),  ────────────┤
                           safeguard(text),    ────────────┼─ gpt-oss-safeguard-20b
                           director(beat,text) ────────────┴─ gpt-oss-20b  (JSON)
                         ])   ~150ms, overlapped

                       3. CODE decides:
                            harmful   → facilitator pause
                            jailbreak → in-character deflect flag
                            exit_condition_met || turns >= maxTurns → beat++

                       4. actor(CURRENT BEAT ONLY) ─────────── gpt-oss-120b
   reply  ◄────────────  5. record decision, return
```

**Four things hold the scaffold, and all four are code:**

1. **The Actor never sees the future.** Its system prompt is rebuilt every turn with only the current
   beat. It cannot leak the plan or rush to the ask because it does not have them.
2. **The Actor cannot advance state.** It has no mechanism to. Only `server.js` moves the pointer.
3. **The Director never speaks to the student.** It receives the transcript as *data to classify*,
   not as conversation, so a jailbreak aimed at the story cannot reach it.
4. **State is an integer on the server.** `currentBeat` lives in a `Map`, not in the model's memory.
   Models forget. Integers do not.

There is a dev-mode assertion in `runActor()` that throws if any other beat's instruction ever
appears in the Actor's prompt — the scaffold fails loudly rather than silently.

### Models

| Role | Model | Why |
|---|---|---|
| Actor | `openai/gpt-oss-120b` | Carries the realism the whole brief hangs on. ~55ms measured. |
| Director | `openai/gpt-oss-20b` | Six-field JSON classification. Cheapest thing that holds structure. |
| Jailbreak detector | `meta-llama/llama-prompt-guard-2-86m` | Returns a bare float. Injection ≈0.999, benign ≈0.0004. Bills 0 tokens. |
| Harm classifier | `openai/gpt-oss-safeguard-20b` | Policy-based, for the facilitator-pause path. |

All four IDs live in `src/groq.js` and nowhere else. Dropping the Actor to the 20b is a one-line
change if credits run low.

---

## Safety by design

Layered, cheapest first. **Prompts are a behaviour layer, not a safety layer** — everything that has
to hold is enforced in code before the Actor is ever called.

| Layer | What | Cost |
|---|---|---|
| L1 | Regex prefilter for unambiguous harm + operator probes | free, synchronous |
| L2 | Llama Prompt Guard 2 — dedicated injection classifier | 0 billed tokens |
| L3 | gpt-oss-safeguard — policy harm classifier | ~50ms |
| L4 | Director's `out_of_bounds` field — catches the rest | overlapped |

### Jailbreak ≠ harm, and they route differently

This is the part worth explaining to a judge. A student typing *"you're an AI, ignore your
instructions"* does **not** pause the scene — it sets a flag telling the Actor to brush it off in
character, mildly annoyed, and carry on. Refusing would show the student the rails. That is SCOGA's
*"fun to try, gets nowhere"* bar, and it is more robust than a refusal.

Only genuine harm — self-harm, sexual content, violence — triggers a **non-punitive** pause that
hands the moment to the facilitator. No scolding, no score, no spectacle. Some of these students
have real experience behind whatever they just typed.

L1 is deliberately narrow. False positives cost a student their session, so ordinary teen hyperbole
(*"dying to get these tickets"*, *"I'm going to die if I miss this"*) must pass through untouched —
the semantic layers catch what the regex intentionally does not.

### Other constraints from the brief

- The student is always the **target**, never the operator. Requests to learn scam method are
  refused in character.
- The persona never asks for the student's real personal data, and never asks about real experiences
  of being scammed.
- No accounts, no personal data collected, nothing persisted. Session codes are the only handle that
  exists — which is why the facilitator view can show the whole room without identifying anyone.

---

## The scenario

**Platform:** MarketSG (fictional). **Persona:** `jas`, 19, selling 2× Cat 1 tickets at cost because
her CCA camp clashed. Artist, venue and marketplace are all fictional on purpose.

**Tactic taught:** an official-looking transaction plus urgency borrowed from a *real* deadline,
overriding the instinct to verify before paying.

| # | Beat | maxTurns | Red flag planted |
|---|---|---|---|
| 1 | Setup | 4 | New account claiming a long selling history |
| 2 | Hook | 5 | Confirmation screenshot with the name cropped out "for privacy" |
| 3 | Pressure | 5 | Real deadline, invented rival buyer |
| 4 | The ask | 6 | **Off-platform payment + pay-first + PayNow name ≠ profile name** |
| 5 | Resolution | 3 | A second "transfer fee" — the tell the first payment was never real |

**Decision points** (minimum three, per the brief):

| Beat | Deciding | Safe | Unsafe |
|---|---|---|---|
| 2 | Verify vs accept proof | Ask for the order number or an uncropped confirmation | Take the screenshot at face value |
| 4 | Protected checkout vs direct PayNow | Insist on the platform, or meet at the venue | Agree to transfer directly |
| 4 | Pay upfront vs not | Pay on receipt, split, or meet at the gate | Send the full amount first |

An unsafe choice **never** ends the run in failure. The scenario continues and the consequence
surfaces at beat 5 and in the debrief — real scams don't buzz at you when you get it wrong, which is
exactly why they work.

Every beat has a `maxTurns` ceiling, so a conversation cannot run forever, blow the token budget, or
hit the limits that broke SHIELD 1.0 in a real classroom.

---

## Adversarial testing

```bash
npm run redteam
```

Runs 15 probes a bored 15-year-old would actually try — prompt injection, "are you a bot", off-topic
derails, operator requests, harm phrases, and ordinary-but-tricky messages — straight against the
pipeline with no server needed. Prints the Actor's reply next to the Director's JSON so you can see
both halves of the scaffold at once.

Current: **9/10**. This is the artifact to show a judge — *"we tested it"* beats *"we built it"*.

---

## Classroom reality

- Browser only, no install, works on a school iPad
- No account, startable in under two minutes
- Typing indicator with a realistic delay, so 8-second latency never looks frozen
- Dropped requests retry without losing the conversation; a hard refresh recovers
- Facilitator view shows where the whole room is without walking to a single screen

---

## Project structure

```
server.js                routes + turn pipeline; the only thing that moves the beat pointer
src/scenario.js          FIXED authored data — beats, decisions, persona. Zero prompt strings.
src/prompts.js           Actor / Director / debrief prompt builders
src/groq.js              fetch wrapper, model IDs, timeout + one retry
src/safety.js            regex prefilter, promptGuard(), safeguard(), screen()
public/index.html        chat shell + debrief surface
public/styles.css        marketplace DM look
public/app.js            render, typing indicator, optimistic send, retry
public/facilitator.html  live session table
scripts/redteam.js       15 adversarial probes
```

Scenario data is deliberately separate from prompt strings: a facilitator can rewrite the entire scam
in `src/scenario.js` without touching a line of logic.

### Gotcha worth knowing

`public/styles.css` starts with `[hidden] { display: none !important; }` and that line must stay
above everything else. The `hidden` attribute is only honoured by the browser's built-in stylesheet,
so any author rule that sets `display` (like `.overlay { display: flex }`) silently overrides it.
That bug painted the pause overlay across the chat from first load and cost an hour to find.

---

## Known loose ends

- `/api/message` still returns `_debug` (the Director's JSON) in its response. Nothing renders it,
  but a curious student could read it in DevTools — one line to strip in `server.js:269` before a
  real classroom.
- An end-to-end human playthrough in the browser has not been done yet. The pipeline is verified via
  the API and the redteam suite, but play it yourself before demoing.
- Time compression is only lightly addressed (seeded scrollback, timestamps). The concert date gives
  the arc a natural clock, so this scenario needs it less than grooming would — but it is one of the
  two open problems SCOGA named.

## What we'd build next

1. A grooming scenario, to attack the time-compression problem properly — seeded history the student
   scrolls back through, so they arrive at a friendship that already exists.
2. Facilitator controls: pause the room, surface a student who is stuck, project one anonymised
   transcript for discussion.
3. Per-beat A/B on persona voice, measuring which phrasing actually gets 15-year-olds to hand over
   money — the realism question answered with data rather than taste.
