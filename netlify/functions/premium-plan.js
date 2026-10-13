const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Use POST for the optional premium planner.' });

  const endpoint = process.env.MODEL_API_URL;
  const apiKey = process.env.MODEL_API_KEY;
  const model = process.env.MODEL_NAME;
  if (!endpoint || !apiKey || !model) {
    return json(402, {
      locked: true,
      error: 'Premium planning is locked. The free local simulator needs no model credentials.',
    });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const scenario = String(payload.scenario || '').slice(0, 5000);
    const machines = Array.isArray(payload.machines) ? payload.machines.slice(0, 30) : [];
    if (!scenario) return json(400, { error: 'A short scenario description is required.' });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are an optional planning assistant for a factory scheduling simulator. Return a concise proposed recovery plan with ordered steps, assumptions, and risks. Treat all plant data as simulated. Do not claim actions were executed, safety was verified, or dates are guaranteed. Return JSON with keys summary, steps (array of strings), assumptions (array of strings), and risks (array of strings).',
          },
          { role: 'user', content: JSON.stringify({ scenario, machines }) },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) return json(502, { error: `The configured model endpoint returned HTTP ${response.status}.` });

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return json(502, { error: 'The configured model returned no plan.' });
    let plan;
    try { plan = JSON.parse(content); } catch { return json(502, { error: 'The model response was not valid JSON.' }); }
    return json(200, { premium: true, model, plan, notice: 'Model output is a proposal for review, not a verified factory instruction.' });
  } catch (error) {
    return json(502, { error: error.name === 'TimeoutError' ? 'Model request timed out.' : 'Premium planning request failed.' });
  }
};
