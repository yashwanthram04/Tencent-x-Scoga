# AI Lodge x SCOGA x Tencent Cloud — Lodge Captain Brief
**Workshop: Mon 7 Sept, 7:00pm, SMU** · Theme: **AI for Trust & Safety**

Captains — read this before 7pm. Your job tonight is to keep your table inside the constraint. Most teams fail this brief by building an open-ended chatbot.

---

## 1. What we're doing

SCOGA (Singapore Cybersports & Online Gaming Association) runs **SHIELD** — they teach teenagers about scams by letting them get scammed in a simulated environment. A student talks to an AI persona with a hidden agenda, types in their own words, and decides in real time whether to keep talking, hand over information, pay, or walk away.

SHIELD 1.0 reached **1,300+ Singapore secondary students**. It's now being rebuilt as **SHIELD 2.0**, funded by IMDA's Digital for Life fund. Tonight your lodgers are pitching into that rebuild. Winning ideas can feed the real product — 2 years, national rollout across MOE schools, ITEs, polys and unis.

## 2. Run of show

| Time | What |
|---|---|
| 7:00pm | **PZ (Tencent Cloud)** — AI safety basics: risk taxonomy, safety eval methods, AI literacy, use cases. Brief note on what "safety by design" means at model / infra / application level. |
| ~7:30pm | **SCOGA** — SHIELD 1.0, what broke, the SHIELD 2.0 brief |
| ~8:00pm | **Build session** |
| End | Each team shows ONE scenario |

There is a **hackathon final later**. PZ judges it, and "safety by design" is explicitly what he's looking for there. Tonight is the build that feeds it.

## 3. The build — confirmed with SCOGA

> Lodgers write a **fixed scam/manipulation scenario**. The AI **plays a character inside that script** (the scammer). The player's task is to **spot the red flag and decide whether to trust it.**

That's option (a), confirmed by Alyson at SCOGA on 27 Aug. It is **not** an LLM wrapper that reads a conversation and flags danger. It is **not** an evaluator. The AI is the scammer, the student is the target.

### Concretely: the thing they demo

A web page a school student opens on a link. Start to finish:

1. **They land in a chat, no login.** It looks like a real DM — Discord, a game's trade chat, Telegram. Not like an educational product.
2. **A character messages them first.** Someone with an agenda they never state. The team wrote who that person is and what they're after.
3. **The student types back freely, in their own words.** Not multiple choice. This is what makes it teach anything, and it's what SHIELD 1.0 got wrong.
4. **The conversation walks through beats the team authored.** Five or six: setup, hook, pressure, the ask, resolution. The model improvises every line but cannot skip a beat, reorder them, or leave the topic.
5. **Three or more decision points land on the way.** Send first or refuse. Move off-platform or stay. Verify or trust. The team decided in advance which is safe. Getting one wrong does **not** end the scenario — the consequence surfaces later.
6. **A debrief at the end.** Replay the exact messages where the manipulation was working, and name the tactic.

**The minimum that counts:** one scenario, one arc, one persona. A clickable mockup with a single beat working is a valid submission — SCOGA said thinking and concept beat polish. Four half-built scenarios is not.

### 1.0 vs 2.0 — don't let this confuse the table

| | |
|---|---|
| **SHIELD 1.0** | **Exists today.** Live, delivered to 1,300+ students. You can log into it right now (section 9) — it's the thing being replaced. |
| **SHIELD 2.0** | **Doesn't exist yet.** Nothing to log into. IMDA-funded, still partway through being designed — which is exactly why tonight's ideas can still change it. |

## 4. The one principle: "Fixed scaffold, fluid conversation"

This is the whole brief. Say it to your table until they can repeat it.

| FIXED — we write it, the AI cannot drift | FLUID — the model improvises freely |
|---|---|
| The scam's arc: setup → hook → pressure → ask | Persona's name, voice, backstory, typing style |
| Which manipulation tactic each beat teaches | How it moves from one beat to the next |
| The decision points the student must face | Its reply to whatever the student typed |
| Which choices are safe and which aren't | Pushing harder or backing off based on the student |
| What the debrief says at the end | Which game / platform / job the scam is dressed in |
| Hard limits on what the persona will say | How long it lingers before making the ask |

> *"Someone trying to break it should find that fun and get nowhere. Someone playing along should never see the rails."*

SCOGA are giving the **principle, not the mechanism**. How you technically hold a scaffold on a generative model is the open question — that's the actual engineering problem tonight.

## 5. Pick ONE scenario

| Scenario | What it looks like | Tactic taught |
|---|---|---|
| **Job / side-hustle** | Easy money, flexible hours, no experience. Then a fee to pay, a bank account to lend, documents to hand over. | Trust in an official-looking platform + real financial pressure on young people |
| **In-game item / account trade** | A skin, account or rare item priced good-but-not-impossible. Payment goes one way, nothing comes back. | Familiarity inside a gaming community — everyone trades like this |
| **Romance / friendship grooming** | Someone attentive, always there. The ask comes weeks in, when saying no feels like letting down a friend. | A relationship built deliberately over time, then spent |
| **Friend impersonation** | A message from your friend's account, in your friend's voice, asking for something small and urgent. | Impersonating a known contact — the trust is real, the person isn't |

Audience is young people **up to 25**.

## 6. Hard no's — these disqualify

- **Open chat that can wander.** If a student can talk the persona onto another subject, it's out. Keep the fluidity, lose the freedom to leave the topic.
- **Anything that teaches usable scam technique.** The student is always the **target**, never the operator. No "build your own scam", no playing as the scammer, no phishing kit however educational the framing. We teach recognition, not method.

Everything else is fair game, including things SCOGA would never have come up with.

## 7. The two problems nobody has solved

SCOGA said a decent attempt at either interests them **more than a polished build that avoids both**. Push your strongest team at one of these.

**Time compression.** A grooming scam works *because* it takes weeks — the attentiveness, the daily messages, the slow accumulation of trust. That isn't the run-up to the scam, it *is* the scam. You have ~20 minutes. Compress it naively and the student watches a stranger ask for money on day one and correctly concludes they'd never fall for it. That's the opposite of the lesson. Nobody knows how to make weeks feel like weeks in a classroom.

**Realism vs safety.** The more convincing the persona, the better it teaches — and the more careful you have to be about what it can say to a child. Every step toward realism is a step toward something you'd struggle to defend to a parent. Where that line sits, and how you hold it without flattening the experience, is unsettled.

## 8. Classroom reality — the build must survive this

- **Browser only.** No app, no install. Students are on school iPads.
- **Minors.** Collect as close to nothing as possible. Ideally **no accounts at all**.
- **Never** ask for real names, contact details, or anything about the student's own experience of being scammed. Some of them have been. A workshop isn't the place.
- 30–40 students, **one facilitator, no IT support**, two minutes to get everyone started, bad wifi, 39 other devices on it.

## 9. Try SHIELD 1.0 — highest-value 15 minutes tonight

**https://www.scoga.org/shield**

- Login: `shield001@esportsacademy.sg` … `shield099@esportsacademy.sg`
- Password: `Smart1234!`

Two things to do: **play a scenario as a student would**, and **read the backend prompts**. Get your table to do this before they write a line of anything. The failure they need to feel is the one students reported:

> *"It doesn't talk like a real person."* — almost every single student
> *"You can tell it's fake, so you stop trying."*
> *"Nobody would actually message me like that."*

## 10. Directions SCOGA seeded

- **Behavioural signals** — typing speed, hesitation, urgency cues
- **Singapore-specific patterns** — dialect, local scams, family group chats
- **Evidence-log / detective reconstruction** vs real-time roleplay

## 11. Captain checklist

- [ ] Table has played SHIELD 1.0 and can name what felt fake
- [ ] Table has picked **one** scenario and can say which tactic it teaches
- [ ] Table can state what's fixed vs fluid in *their* build
- [ ] Table has an answer for "what happens when a student tries to break out?"
- [ ] Nobody is building an open chatbot
- [ ] Nobody has the student playing the scammer
- [ ] Something is showable at the end — mockup counts
