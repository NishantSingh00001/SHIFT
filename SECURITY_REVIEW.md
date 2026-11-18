# Security Review — SHIFT (Factory Twin)

SHIFT's core simulator (`index.html` + `app.js`) is fully static and
client-side: a deterministic, local scenario scheduler with no persisted user
data and no network calls (confirmed no `fetch`/`XMLHttpRequest`/`WebSocket`
in `app.js`/`index.html`). The repo also ships one optional Netlify Function,
`netlify/functions/premium-plan.js`, described in the README as a "dormant"
paid-model connector that only activates if all three env vars
(`MODEL_API_URL`, `MODEL_API_KEY`, `MODEL_NAME`) are configured; confirmed the
frontend's "Premium" button (`app.js:206`) only opens an informational dialog
and never calls this function — the dialog explicitly states "No API key is
used and no paid model calls are made."

## 20-point pen-test checklist

| # | Check | Applicable? | Notes |
|---|-------|-------------|-------|
| 1 | HTTP/2 Rapid Reset (CVE-2023-44487) | N/A | Netlify's own edge/CDN layer handles HTTP/2; this repo defines no origin server. |
| 2 | bcrypt 72-byte truncation | N/A | No password hashing. |
| 3 | SAML signature bypass (CVE-2024-45409) | N/A | No SAML/SSO. |
| 4 | nOAuth | N/A | No OAuth/auth of any kind. |
| 5 | GraphQL alias batching | N/A | No GraphQL. |
| 6 | TOTP replay (RFC 6238 §5.2) | N/A | No TOTP/2FA. |
| 7 | ReDoS | No | No user-supplied-pattern regexes in `app.js` or `premium-plan.js`. |
| 8 | JWT algorithm confusion | N/A | No JWTs. |
| 9 | HTTP request smuggling | N/A | No custom server; Netlify's managed function runtime handles the HTTP layer. |
| 10 | Web cache poisoning | N/A | `premium-plan.js` sets `cache-control: no-store` on every response; no other cacheable server responses exist. |
| 11 | Spoofed X-Forwarded-For | N/A | `premium-plan.js` does not read or trust any client IP header. |
| 12 | Postgres views bypassing RLS | N/A | No database. |
| 13 | `Math.random()` for security tokens | No | `Math.random()` is not used anywhere in this repo. |
| 14 | Timing attacks on secret comparison | N/A | No secrets are compared (the function forwards a Bearer key it never compares). |
| 15 | Padding oracle | N/A | No encryption/decryption. |
| 16 | Server-side prototype pollution | No | `premium-plan.js` reads only the fixed fields `scenario`/`machines` off the parsed body (with length/count caps) — it never spreads or deep-merges the parsed JSON itself. |
| 17 | Server-side template injection | N/A | No templating engine; the scenario/machines data is only embedded as a JSON string in the upstream chat-completion request, not interpreted as code. |
| 18 | XXE | N/A | No XML parsing. |
| 19 | Cross-site WebSocket hijacking | N/A | No WebSockets. |
| 20 | Unicode username normalization | N/A | No usernames/accounts. |

## Findings outside the 20-point list

**`premium-plan.js` has no rate limiting or CORS restriction, for when it is
configured.** As shipped, the function is locked (returns HTTP 402) unless
the operator sets all three model env vars, and the frontend never calls it,
so there's no exposure in the repo as distributed. But if someone does wire
up those env vars to make the "premium" tier live, the function would accept
unlimited POST requests from any origin (no `Access-Control-Allow-Origin`
restriction is set, and there's no per-IP/per-key rate limit), each
forwarding a request to the configured paid model endpoint — the same
uncapped-AI-endpoint pattern seen in a few of this author's other serverless
repos. It does already cap payload size (`scenario` sliced to 5000 chars,
`machines` sliced to 30 entries), which limits the worst case per request.
Worth adding a rate limit before anyone actually configures the paid tier.
Not applied — pending your approval.
