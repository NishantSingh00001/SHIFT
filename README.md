# SHIFT — Factory Twin

An interactive digital-factory scheduling simulator. Inject a machine outage, rush order, or supplier delay, compare the baseline with a recovery plan, and see the projected trade-offs across throughput, recovery time, idle time, and on-time orders.

## Run it free

Open `index.html` in a modern browser. The core simulation runs locally in the browser. It needs no account, API key, database, or paid service.

## Publish with GitHub and Netlify

1. Extract `SHIFT-Factory-Twin-Netlify.zip` on your computer.
2. Create a GitHub repository and upload the extracted project files and folders to the repository root. Upload `index.html`, `styles.css`, `app.js`, `netlify.toml`, and the `netlify/` folder. Do not upload only the ZIP as the repository contents.
3. In Netlify, select **Add new project → Import an existing project**, connect GitHub, and choose the repository.
4. Keep the settings in `netlify.toml`: publish directory `.` and no build command. Deploy.

The base site requires no environment variables. The Netlify Function in `netlify/functions/premium-plan.js` is a dormant optional extension. It only calls a model if you deliberately configure all three Netlify environment variables: `MODEL_API_URL`, `MODEL_API_KEY`, and `MODEL_NAME`. The endpoint must use an OpenAI-compatible chat-completions request format. Without those settings, the function returns a locked response and makes no external request. The website's premium card is informational; it does not trigger paid calls.

## What works in the free demo

- Animated isometric factory floor with machine states, job flow, zoom, and simulation clock controls.
- Three injectable disruption scenarios: machine outage, rush order, and supplier delay.
- A deterministic local scheduler proposal with an ordered recovery sequence.
- Baseline/recovery comparisons, a production timeline, and outcome metrics.
- Responsive layout, keyboard-usable dialogs, and reduced-motion support.

## Scope and honesty

This is a simulated digital twin, not connected factory-control software. Machines, jobs, disruptions, forecasts, and all performance figures are illustrative. The free planner uses deterministic scenario rules, not an AI agent. The premium Netlify Function is an optional connector for a paid model endpoint; it returns proposals for human review and never executes factory changes.

## Files

- `index.html` — application shell, simulator, timeline, metrics, and dialogs
- `styles.css` — responsive control-room visual design and animation
- `app.js` — local scenario state and recovery simulation
- `netlify.toml` — Netlify publish and function settings
- `netlify/functions/premium-plan.js` — optional, locked paid-model connector
