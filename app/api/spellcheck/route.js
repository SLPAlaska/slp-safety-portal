// =====================================================================
// AnthroSafe Spell/Grammar Review API
// POST /api/spellcheck  { items: [{ key, text }] }
// Returns { results: [{ key, corrected }] }
// Uses ANTHROPIC_API_KEY (server-side env var on the portal Vercel project)
// =====================================================================

export const maxDuration = 60;

const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are a copy editor for industrial safety investigation reports on the Alaska North Slope. You will receive a JSON array of report fields. For each field, correct ONLY spelling, grammar, and punctuation.

STRICT RULES:
- Never change facts, meaning, times, dates, numbers, names of people, companies, equipment, or locations.
- Never add or remove information. Never rewrite for style. Fix errors only.
- Keep line breaks exactly as they appear in the original.
- Preserve technical/industry terms (ACB, THA, PSIF, STKY, tractor-trailer, Insta Cup, etc.) even if unusual.
- If a field has no errors, return its text unchanged.

Respond with ONLY a JSON array, no markdown fences, no commentary:
[{"key": "<same key>", "corrected": "<corrected text>"}]`;

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY is not configured on this project.' }, { status: 500 });
    }

    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return Response.json({ results: [] });
    }

    // Cap payload defensively: keys + up to ~6000 chars of text each.
    const payload = items.slice(0, 60).map(it => ({
      key: String(it.key || '').slice(0, 120),
      text: String(it.text || '').slice(0, 6000),
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `Anthropic API ${res.status}: ${errText.slice(0, 300)}` }, { status: 502 });
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    const clean = text.replace(/```json|```/g, '').trim();

    let results;
    try {
      results = JSON.parse(clean);
    } catch {
      return Response.json({ error: 'Model returned unparseable output.' }, { status: 502 });
    }

    if (!Array.isArray(results)) {
      return Response.json({ error: 'Model returned unexpected structure.' }, { status: 502 });
    }

    // Only pass through the fields we expect.
    const safe = results
      .filter(r => r && typeof r.key === 'string' && typeof r.corrected === 'string')
      .map(r => ({ key: r.key, corrected: r.corrected }));

    return Response.json({ results: safe });
  } catch (err) {
    return Response.json({ error: err?.message || 'Spell check failed.' }, { status: 500 });
  }
}
