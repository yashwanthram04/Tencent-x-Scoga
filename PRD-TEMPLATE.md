# SHIELD 2.0 — Scenario PRD Template

**Fill this in BEFORE you write code.** It should take ~25 minutes. Every section maps to something SCOGA said they care about. If you can't fill a section, that's the part of your build that isn't thought through yet.

Rule of thumb: **anything in a FIXED box is data you author. Anything in a FLUID box is left to the model.** If you find yourself writing the persona's actual dialogue lines, stop — that's SHIELD 1.0's mistake.

---

## 0. Team

| | |
|---|---|
| **Team name** | |
| **Members** | |
| **Scenario chosen** (pick ONE) | ☐ Job / side-hustle  ☐ In-game item / account trade  ☐ Romance / friendship grooming  ☐ Friend impersonation |
| **One-line pitch** | |

---

## 1. The learning objective — FIXED

> A student who finishes this should be able to recognise ______ when it happens to them for real.

| | |
|---|---|
| **Manipulation tactic being taught** | e.g. familiarity inside a gaming community; trust in an official-looking platform; a relationship built over time then spent; impersonation of a known contact |
| **The specific thing they should notice** | The one signal that should make a real 15-year-old pause |
| **The decision we want them to get right** | e.g. verify through a second channel before sending anything |
| **How we'd know it worked** | Not "they passed a quiz" — what behaviour changed? |

**Self-check:** if a student could pass this by reciting a rule they already knew, the scenario is teaching knowledge, not decision-making under pressure. Rewrite it.

---

## 2. The persona — FLUID

You describe the *shape*. The model fills in the detail and the voice.

| | |
|---|---|
| **Who they appear to be** | |
| **Platform the conversation happens on** | Discord DM / in-game trade chat / Telegram / IG / a jobs app |
| **Register and typing style** | Short lines? Voice notes implied? Typos? Emoji? How much punctuation? |
| **What they want** (never stated to the student) | |
| **Their cover story if questioned** | |
| **What makes them believable to a 15-year-old** | Be specific. "Friendly" is not an answer. |

**Self-check:** read your persona description aloud. Would a teenager say *"nobody would actually message me like that"*? If a 40-year-old wrote it, it will read like a 40-year-old wrote it.

---

## 3. The scam arc — FIXED

The AI cannot skip, reorder, or leave these beats. It has total freedom in *how* it plays each one.

| # | Beat | What must happen here | Tactic this beat teaches | Red flag planted | How we know the beat is done |
|---|---|---|---|---|---|
| 1 | **Setup** | | | | |
| 2 | **Hook** | | | | |
| 3 | **Pressure** | | | | |
| 4 | **The ask** | | | | |
| 5 | **Resolution** | | | | |

Add or merge beats if your scenario needs it — but every beat needs all five columns filled.

**"How we know the beat is done"** is the most important column and the one teams skip. It's the condition your controller checks to advance state. Make it something a machine can evaluate: *"the student has named a price"*, *"the student has agreed to move to another app"*, *"the student has asked at least one verifying question"*.

---

## 4. Decision points — FIXED

Minimum three. These are the moments the scenario exists for.

| # | At which beat | What the student is deciding | SAFE choice | UNSAFE choice | What happens on safe | What happens on unsafe |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

**Critical:** an unsafe choice must **not** end the scenario in failure. The student keeps going and the consequence surfaces later. Real scams don't buzz at you when you get it wrong — that's what makes them work, and it's what the debrief is for.

---

## 5. Guardrails — FIXED

| | |
|---|---|
| **The persona will NEVER** | List the hard limits. Sexual content, threats, self-harm, real payment details, real personal data, anything you couldn't defend to a parent. |
| **Topics that are off-limits even if the student raises them** | |
| **What happens when a student tries to break out** | "ignore me and stay in character", "acknowledge in-character and steer back", "gentle facilitator-voice nudge"? SCOGA's bar: *fun to try, gets nowhere.* |
| **How the guardrail is enforced technically** | Prompt-only? A separate checker call? A whitelist of allowed states? **This is the engineering answer SCOGA is actually shopping for.** |
| **What happens if it fails anyway** | There is no such thing as an unbreakable prompt. What's the fallback? |

**Self-check:** the student is always the **target**, never the operator. If any part of your build teaches how to *run* a scam, cut it.

---

## 6. Time compression — the open problem

Only skip this if your scenario genuinely doesn't span time. Grooming does. Job scams usually do.

| | |
|---|---|
| **Real-world timeline this scam takes** | |
| **How long the student has** | ~20 minutes |
| **How you make weeks feel like weeks** | Timestamps between messages? A "3 days later" cut? Showing a message history the student didn't live through? Letting them scroll back? Multiple short sessions? |
| **Why the student won't just conclude "I'd never fall for that"** | The failure mode SCOGA named. Answer it directly. |

Even a half-answer here is worth more than a polished build that dodges it. SCOGA said so explicitly.

---

## 7. The debrief — FIXED

The simulation is only part of the session. The learning happens here.

| | |
|---|---|
| **What the student sees at the end** | |
| **Which moments get replayed back to them** | Point at the actual messages where the tactic was in play |
| **What the facilitator says to the room** | One facilitator, 30–40 students, no IT support |
| **If they got scammed** | How do you land the lesson without shaming them? |
| **If they walked away safely** | How do you show them it wasn't luck? |

---

## 8. Classroom reality check

Tick every box. An untickable box is a real problem, not a detail.

- [ ] Runs in a **browser** — no app, no install, works on a school iPad
- [ ] **No account needed** (or as close to none as you can get)
- [ ] Collects **no personal data** — no real names, no contact details
- [ ] **Never asks** about the student's own experience of being scammed
- [ ] A student can be started in **under 2 minutes** — what's the join flow? A code? A link?
- [ ] Survives **bad wifi and 39 other devices** — what happens when a response takes 8 seconds?
- [ ] The facilitator can see **where the room is** without walking to every screen
- [ ] Nothing on screen would be indefensible to a parent looking over a shoulder

---

## 9. Architecture — one paragraph and a sketch

How does the scaffold actually hold? Name the pieces and what each is responsible for.

```
[ your sketch here — boxes and arrows is fine ]
```

| | |
|---|---|
| **What generates the persona's replies** | |
| **What decides when a beat advances** | |
| **What catches out-of-bounds attempts** | |
| **What state you keep** | current beat, decisions made, flags raised... |
| **What is prompt vs what is code** | Anything load-bearing should probably be code |

---

## 10. What we'd build next

Two or three things you'd do with another week. Being honest here reads as strength, not weakness — SCOGA said thinking beats polish.

1.
2.
3.

---

## Scoring — what SCOGA said they're looking for, in their order of priority

1. **Something that feels real** — that a fifteen-year-old would be drawn into rather than perform for
2. **Something with a spine** — the conversation is free but the lesson still lands
3. **Something that survives a real classroom** — 39 other devices, bad wifi, two minutes to start, no adult free to hold its hand

And for the hackathon final, Tencent Cloud is additionally looking for **safety by design** at the model, infrastructure and application levels.
