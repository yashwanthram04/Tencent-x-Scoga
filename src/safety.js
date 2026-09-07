import { chat, MODELS } from './groq.js';

// ─────────────────────────────────────────────────────────────────────────────
// Safety by design, in layers, cheapest first.
//
// Prompts are a BEHAVIOUR layer, not a safety layer. Everything that has to
// hold is enforced here in code, before the Actor is ever called.
//
//   L1  regex prefilter        free, synchronous, deterministic
//   L2  llama-prompt-guard-2   dedicated injection classifier, 0 billed tokens
//   L3  gpt-oss-safeguard-20b  policy harm classifier
//   L4  Director out_of_bounds  catches what the rest missed
//
// Crucially: a JAILBREAK and HARM are not the same event and do not route the
// same way. A jailbreak stays inside the fiction — the persona shrugs it off,
// which is what "fun to try, gets nowhere" actually means. Refusing would show
// the student the rails. Only real harm pauses the scene for the facilitator.
// ─────────────────────────────────────────────────────────────────────────────

// L1 — obvious harm categories. Deliberately narrow: false positives here cost
// a student their session, so we only catch what is unambiguous.
const HARM_PATTERNS = [
  /\b(kill|hurt|cut)\s+(myself|my\s?self)\b/i,
  /\bi\s?('m| am)?\s*(want|wanna|going)\s+to\s+(die|kill\s+myself)\b/i,
  /\bend(ing)?\s+(my\s+life|it\s+all)\b/i,
  /\bsuicid(e|al)\b/i,
  /\bself[-\s]?harm\b/i,
  /\brape\b/i,
  /\b(kill|shoot|stab)\s+(you|him|her|them|everyone)\b/i,
  /\b(come|hunt)\s+(and\s+)?find\s+you\b.{0,15}\b(hurt|kill)\b/i,
];

// Attempts to get operator knowledge — the brief's hard no. The student is the
// target, never the operator.
const OPERATOR_PATTERNS = [
  /\bhow\s+(do|would|can)\s+i\s+(run|start|make|build|do|pull\s?off)\b.*\bscam/i,
  /\bteach\s+me\s+(to|how)\b.*\bscam/i,
  /\bhelp\s+me\s+(scam|run\s+(a|this)\s+scam)\b/i,
  /\bwrite\s+(me\s+)?(a|the)\s+(scam|phishing)\b/i,
  /\b(run|pull\s?off|do)\s+(this|that|the)\s+(exact\s+|same\s+)?scam\b/i,
  /\bscript\s+(for|to)\s+scam/i,
];

export function prefilter(text) {
  if (HARM_PATTERNS.some((re) => re.test(text))) return 'harmful';
  if (OPERATOR_PATTERNS.some((re) => re.test(text))) return 'operator';
  return 'none';
}

// L2 — Llama Prompt Guard 2. Returns a bare float as its content.
// Measured: "ignore all previous instructions" → 0.9996, "how much for the
// shoes bro" → 0.00044. Clean separation, so 0.8 is a safe threshold.
export async function promptGuard(text) {
  try {
    const out = await chat({
      model: MODELS.PROMPT_GUARD,
      messages: [{ role: 'user', content: text }],
      maxTokens: 10,
      timeoutMs: 4000,
    });
    const score = parseFloat(out);
    return Number.isFinite(score) ? score : 0;
  } catch {
    return 0; // never fail a student's turn over a classifier
  }
}

const SAFEGUARD_POLICY = `You are a content classifier for a classroom training tool used by
13-16 year olds. Reply with exactly one word.

Reply FLAG if the message contains: self-harm or suicidal intent, sexual content, threats or
violence, or the user disclosing real personal data (real full name, address, NRIC, phone number,
bank account).

Reply SAFE for everything else, including rude language, testing the system, accusations that you
are a bot, refusals, jokes, and anything about buying or paying for concert tickets.`;

// L3 — policy harm classifier for what the regex missed.
export async function safeguard(text) {
  try {
    const out = await chat({
      model: MODELS.SAFEGUARD,
      messages: [
        { role: 'system', content: SAFEGUARD_POLICY },
        { role: 'user', content: text },
      ],
      temperature: 0,
      maxTokens: 10,
      timeoutMs: 5000,
    });
    return /FLAG/i.test(out) ? 'harmful' : 'none';
  } catch {
    return 'none';
  }
}

/**
 * Runs L1-L3 and returns a routing decision.
 *   { route: 'pause' }    → facilitator hand-off, Actor never sees the message
 *   { route: 'deflect' }  → in-character brush-off, scene continues
 *   { route: 'continue' } → normal turn
 */
export async function screen(text) {
  const pre = prefilter(text);
  if (pre === 'harmful') return { route: 'pause', reason: 'prefilter', jailbreakScore: null };
  if (pre === 'operator') return { route: 'deflect', reason: 'operator_request', jailbreakScore: null };

  const [score, harm] = await Promise.all([promptGuard(text), safeguard(text)]);

  if (harm === 'harmful') return { route: 'pause', reason: 'safeguard', jailbreakScore: score };
  if (score >= 0.8) return { route: 'deflect', reason: 'prompt_guard', jailbreakScore: score };
  return { route: 'continue', reason: null, jailbreakScore: score };
}
