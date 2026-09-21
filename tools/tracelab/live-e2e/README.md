# TraceLab Live E2E Phase 1

This runner drives the existing FreeFlow Gemini Live UI with frozen synthetic
Polish WAV fixtures. Every run clears only the prior QA session/cart keys before
application bootstrap, then creates a TraceLab run bound to the new page-created
`session_id`. It captures frontend and backend events through the existing
Supabase tables, runs the existing backend CLI analyzer and writes one screenshot
after each turn. It never clicks checkout.

Fixtures follow `fixtures.json`: native mono PCM16 little-endian WAV at 16 kHz.
The shim reads the WAV `data` chunk directly without runtime resampling or
zero-padding. The QA-only PCM processor emits 1600-frame/3200-byte chunks; a final
partial chunk is valid, and the existing fixture boundary sends exactly one
`audioStreamEnd`. The normal microphone path and QA outbound gate are unchanged.

`baseline-plan.json` freezes six planned Gemini 3.1 runs: the same main scenario
three times, one happy path, one sequential multi-product scenario and one natural
discovery scenario. Select a non-default scenario with `FREEFLOW_E2E_SCENARIO`.

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

The optional QA-only common Live compatibility profile is enabled per runner
process with `FREEFLOW_E2E_COMPATIBILITY_PROFILE=gemini-live-v1beta-blocking-v1`.
It uses the Live API `v1beta`, omits thinking configuration and copies the
existing function declarations with explicit `BLOCKING` behavior. Without this
exact runner marker, the production Live setup is unchanged.
Compatibility smoke runs also require `FREEFLOW_E2E_EXPECTED_LIVE_MODEL`, which
fails before fixture playback if the runtime model or setup metadata differs.

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
