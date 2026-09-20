# TraceLab Live E2E Phase 1

This runner drives the existing FreeFlow Gemini Live UI with committed synthetic
Polish WAV fixtures. It creates a fresh TraceLab run after the page creates its
actual `session_id`, captures frontend and backend events through the existing
Supabase tables, runs the existing backend CLI analyzer and writes one screenshot
after each turn. It never clicks checkout.

The backend feature is OFF unless both settings are present:

```text
FREEFLOW_TRACELAB_QA_ENABLED=1
FREEFLOW_TRACELAB_TEST_USER_IDS=<comma-separated Supabase Auth UUID allowlist>
```

These are stable QA authorization settings, not per-run selectors. Each execution
creates its own server-generated run with an automatic 20-minute database window.
The existing Phase B env-window capture remains separate and unchanged.

The runner requires a Playwright storage-state file for the allowlisted test
account. Keep it outside the repository. It is consumed by the browser context
and is never copied to output or logged.

```powershell
$env:FREEFLOW_E2E_BASE_URL='https://<frontend>'
$env:FREEFLOW_E2E_STORAGE_STATE='C:\secure\freeflow-test-account.json'
$env:FREEFLOW_TRACELAB_BACKEND_ROOT='C:\path\to\freeflow-backend'
npm run test:live:e2e
```

Optional: `FREEFLOW_E2E_HEADED=1` shows the browser. Output is written under
`output/playwright/tracelab/<run_id>/` and includes the scenario manifest,
per-turn screenshots, persisted capture, `run.json`, `report.json` and
`report.md`.

The browser policy aborts and fails the run on every `/api/payments` request,
Stripe navigation or `POST /api/orders`. The FreeFlow application WebSocket is
closed for this test so Gemini tool calls use the existing authenticated HTTP
relay; the Gemini Live provider connection remains unchanged.
