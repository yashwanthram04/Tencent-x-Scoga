// Thin Groq client. Model IDs live here and nowhere else — swapping the Actor
// down to the 20b if credits run low is a one-line change.

const API = 'https://api.groq.com/openai/v1/chat/completions';

export const MODELS = {
  // Carries the realism the whole brief hangs on. Measured ~55ms on Groq.
  ACTOR: 'openai/gpt-oss-120b',
  // Six-field classification call. Cheapest thing that can hold JSON.
  DIRECTOR: 'openai/gpt-oss-20b',
  // Returns a bare float. Injection ~0.999, benign ~0.0004. Bills 0 tokens.
  PROMPT_GUARD: 'meta-llama/llama-prompt-guard-2-86m',
  // Policy-based harm classifier for the facilitator-pause path.
  SAFEGUARD: 'openai/gpt-oss-safeguard-20b',
};

function key() {
  const k = process.env.GROQ_API_KEY;
  if (!k) throw new Error('GROQ_API_KEY missing — run with: npm start');
  return k.trim();
}

/**
 * One chat completion. Retries once on network/5xx, because a dropped request
 * must never cost a student their conversation.
 */
export async function chat({ model, messages, temperature = 0.8, maxTokens = 300, json = false, reasoning = 'low', timeoutMs = 12000 }) {
  const body = {
    model,
    messages,
    temperature,
    max_completion_tokens: maxTokens,
  };
  // gpt-oss models expose a reasoning budget; keep it minimal so a one-line
  // chat reply doesn't pay for a paragraph of hidden thinking.
  if (model.startsWith('openai/')) body.reasoning_effort = reasoning;
  if (json) body.response_format = { type: 'json_object' };

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`groq ${res.status}`);
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      if (!res.ok) {
        throw new Error(`groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }

      const data = await res.json();
      return (data.choices?.[0]?.message?.content ?? '').trim();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
  }
  throw lastErr;
}
