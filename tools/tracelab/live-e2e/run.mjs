import { chromium } from 'playwright';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installFreeFlowAudioShim } from './audio-shim.mjs';
import { blockedSideEffect } from './policy.mjs';
import { cartMatchesExpected, transcriptMatches } from './assertions.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const requireEnv = name => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};
const safe = value => String(value).replace(/[^a-zA-Z0-9_.-]/g, '_');
const scenarioPath = path.resolve(process.env.FREEFLOW_E2E_SCENARIO || path.join(here, 'scenario.json'));
const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
if (!scenario.stop_before_checkout || !Array.isArray(scenario.turns) || scenario.turns.length !== 5) {
  throw new Error('Scenario must contain the five bounded Phase 1 turns and stop before checkout');
}
const turnLimit = process.env.FREEFLOW_E2E_TURN_LIMIT
  ? Number.parseInt(process.env.FREEFLOW_E2E_TURN_LIMIT, 10)
  : scenario.turns.length;
if (!Number.isInteger(turnLimit) || turnLimit < 1 || turnLimit > scenario.turns.length) {
  throw new Error('FREEFLOW_E2E_TURN_LIMIT must be between 1 and the scenario turn count');
}

const baseURL = requireEnv('FREEFLOW_E2E_BASE_URL');
const storageState = path.resolve(requireEnv('FREEFLOW_E2E_STORAGE_STATE'));
const backendRoot = path.resolve(requireEnv('FREEFLOW_TRACELAB_BACKEND_ROOT'));
const cli = path.join(backendRoot, 'tools', 'tracelab', 'cli.mjs');
if (!fs.existsSync(storageState)) throw new Error('Storage state file not found');
if (!fs.existsSync(cli)) throw new Error('TraceLab CLI not found in FREEFLOW_TRACELAB_BACKEND_ROOT');

const browser = await chromium.launch({ headless: process.env.FREEFLOW_E2E_HEADED !== '1' });
const context = await browser.newContext({ storageState });
const blocked = [];
await context.route('**/*', async route => {
  const request = route.request();
  const label = blockedSideEffect(request.method(), request.url());
  if (!label) return route.continue();
  blocked.push({ label, url: request.url(), method: request.method() });
  return route.abort('blockedbyclient');
});
if (typeof context.routeWebSocket === 'function') {
  await context.routeWebSocket(/\/api\/voice\/live\/ws(?:\?|$)/, ws => ws.close());
}
await context.addInitScript(installFreeFlowAudioShim);

const page = await context.newPage();
let runId;
let outputDir;
let sessionId;

const writeJson = (name, value) => {
  if (!outputDir) return;
  fs.writeFileSync(path.join(outputDir, name), JSON.stringify(value, null, 2));
};

const runAnalyzer = (capturePath, reportName) => {
  if (!outputDir || !runId || !sessionId || !fs.existsSync(capturePath)) return null;
  const reportDir = path.join(outputDir, reportName);
  const result = spawnSync(process.execPath, [cli, '--run', runId, '--session', sessionId, '--out', reportDir, capturePath], {
    encoding: 'utf8', env: { ...process.env, FREEFLOW_TRACELAB_DEBUG: '1' },
  });
  writeJson(`${reportName}-exit.json`, {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
  });
  return result.status;
};

const collectBoundaryEvidence = async (failure = null) => {
  if (!outputDir || !runId) return;
  const runtime = await page.evaluate(() => ({
    audio_boundary: window.__FREEFLOW_AUDIO_BOUNDARY_DIAGNOSTICS__?.snapshot?.() || null,
    gemini_session: window.__FREEFLOW_GEMINI_QA_DIAGNOSTICS__?.snapshot?.() || null,
    audio_shim: window.__FREEFLOW_AUDIO_SHIM__?.state?.() || null,
    collector_event_count: window.__FREEFLOW_CART_AUDIT__?.events?.length ?? null,
  })).catch(error => ({ collection_error: String(error) }));
  writeJson('audio-boundary.json', {
    captured_at: Date.now(),
    failure: failure ? String(failure) : null,
    blocked_side_effect_count: blocked.length,
    ...runtime,
  });
  await page.screenshot({ path: path.join(outputDir, failure ? 'timeout.png' : 'final.png'), fullPage: true }).catch(() => {});

  const memoryCapture = await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__?.exportMemory?.(id) || null, runId).catch(() => null);
  if (memoryCapture) {
    const memoryPath = path.join(outputDir, 'capture-memory.json');
    fs.writeFileSync(memoryPath, memoryCapture);
    runAnalyzer(memoryPath, 'report-memory');
  }

  const persistedCapture = await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__?.exportRun?.(id) || null, runId).catch(() => null);
  if (persistedCapture) {
    const persistedPath = path.join(outputDir, 'capture-persisted.json');
    fs.writeFileSync(persistedPath, persistedCapture);
    runAnalyzer(persistedPath, 'report-persisted');
  }
};

try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-ui-role="voice-dock-bar"]').waitFor({ state: 'visible', timeout: 30000 });
  sessionId = await page.waitForFunction(() => /^sess_[a-z0-9_]+$/.test(localStorage.getItem('amber-session-id') || ''), null, { timeout: 15000 })
    .then(handle => handle.jsonValue()).then(() => page.evaluate(() => localStorage.getItem('amber-session-id')));
  await page.waitForFunction(() => Boolean(window.__FREEFLOW_TRACELAB_QA__?.start), null, { timeout: 15000 });
  const started = await page.evaluate(session => window.__FREEFLOW_TRACELAB_QA__.start(session), sessionId);
  runId = started.run_id;
  outputDir = path.resolve('output', 'playwright', 'tracelab', safe(runId));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'scenario.json'), JSON.stringify({ ...scenario, run_id: runId, session_id: sessionId }, null, 2), { flag: 'wx' });

  await page.getByRole('button', { name: 'Włącz mikrofon' }).first().click();
  await page.waitForFunction(() => window.__FREEFLOW_AUDIO_SHIM__?.ready(), null, { timeout: 15000 });
  await page.locator('[data-ui-role="voice-dock-bar"][data-state="listening"]').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__FREEFLOW_GEMINI_QA_DIAGNOSTICS__?.startFixture), null, { timeout: 15000 });

  for (let index = 0; index < turnLimit; index++) {
    const turn = scenario.turns[index];
    const before = await page.evaluate(() => window.__FREEFLOW_CART_AUDIT__?.events?.length || 0);
    const audio = fs.readFileSync(path.resolve(path.dirname(scenarioPath), turn.audio)).toString('base64');
    const boundaryBefore = await page.evaluate(() => window.__FREEFLOW_AUDIO_BOUNDARY_DIAGNOSTICS__?.snapshot?.() || null);
    const playbackStartedAt = Date.now();
    const { playback, fixtureStart, explicitBoundary } = await page.evaluate(async encoded => {
      const fixtureStart = window.__FREEFLOW_GEMINI_QA_DIAGNOSTICS__.startFixture();
      const playback = await window.__FREEFLOW_AUDIO_SHIM__.playBase64(encoded);
      const explicitBoundary = window.__FREEFLOW_GEMINI_QA_DIAGNOSTICS__.endFixture();
      return { playback, fixtureStart, explicitBoundary };
    }, audio);
    const playbackFinishedAt = Date.now();
    const boundaryAfter = await page.evaluate(() => window.__FREEFLOW_AUDIO_BOUNDARY_DIAGNOSTICS__?.snapshot?.() || null);
    fs.appendFileSync(path.join(outputDir, 'wav-playback.jsonl'), `${JSON.stringify({
      turn_id: turn.id,
      playback_started_at: playbackStartedAt,
      playback_finished_at: playbackFinishedAt,
      fixture_start: fixtureStart,
      explicit_boundary: explicitBoundary,
      boundary_before: boundaryBefore,
      boundary_after: boundaryAfter,
      ...playback,
    })}\n`);
    await page.waitForFunction(({ start, required }) => {
      const events = (window.__FREEFLOW_CART_AUDIT__?.events || []).slice(start);
      return required.every(name => events.some(event => event.event === name));
    }, { start: before, required: turn.completion_events }, { timeout: scenario.turn_timeout_ms });
    await page.locator('[data-ui-role="voice-dock-bar"][data-state="listening"]').waitFor({ timeout: scenario.turn_timeout_ms });
    const evidence = await page.evaluate(start => {
      const events = window.__FREEFLOW_CART_AUDIT__?.events || [];
      const current = events.slice(start);
      const transcript = [...current].reverse().find(event => event.event === 'user_transcript')?.payload?.text || '';
      const cart = [...events].reverse().find(event => event.event === 'ui_cart_committed')?.payload?.cart || null;
      return { transcript, cart };
    }, before);
    if (!transcriptMatches(turn.expected_transcript, evidence.transcript)) {
      throw new Error(`Transcript mismatch in ${turn.id}: ${JSON.stringify(evidence.transcript)}`);
    }
    if (!cartMatchesExpected(evidence.cart, turn.expected_cart)) {
      throw new Error(`Visible cart mismatch in ${turn.id}: ${JSON.stringify(evidence.cart)}`);
    }
    const cartLabel = await page.locator('button[aria-label^="Otwórz koszyk"]').first().getAttribute('aria-label').catch(() => null);
    await page.screenshot({ path: path.join(outputDir, `${String(index + 1).padStart(2, '0')}-${safe(turn.id)}.png`), fullPage: true });
    fs.appendFileSync(path.join(outputDir, 'turns.jsonl'), `${JSON.stringify({ turn_id: turn.id, transcript: evidence.transcript, cart: evidence.cart, cart_label: cartLabel })}\n`);
    if (blocked.length) throw new Error(`Blocked side-effect attempts detected: ${JSON.stringify(blocked)}`);
  }

  let capture;
  for (let attempt = 0; attempt < 10; attempt++) {
    capture = await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__.exportRun(id), runId);
    const events = JSON.parse(capture).events;
    if (events.some(event => event.source === 'backend') && events.some(event => event.source === 'frontend')) break;
    await page.waitForTimeout(500);
  }
  fs.writeFileSync(path.join(outputDir, 'capture.json'), capture, { flag: 'wx' });
  await collectBoundaryEvidence();
  await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__.stop(id), runId);

  execFileSync(process.execPath, [cli, '--run', runId, '--session', sessionId, '--out', outputDir, path.join(outputDir, 'capture.json')], {
    stdio: 'inherit', env: { ...process.env, FREEFLOW_TRACELAB_DEBUG: '1' },
  });
  if (blocked.length) throw new Error(`Blocked side-effect attempts detected: ${JSON.stringify(blocked)}`);
  process.stdout.write(`${JSON.stringify({ ok: true, run_id: runId, session_id: sessionId, output: outputDir })}\n`);
} catch (error) {
  await collectBoundaryEvidence(error);
  if (runId) await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__?.stop?.(id), runId).catch(() => {});
  throw error;
} finally {
  await context.close();
  await browser.close();
}
