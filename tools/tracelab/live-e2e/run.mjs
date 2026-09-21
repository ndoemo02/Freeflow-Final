import { chromium } from 'playwright';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installFreeFlowAudioShim } from './audio-shim.mjs';
import { parseDeterministicPcmWav } from './wav.mjs';
import { blockedSideEffect } from './policy.mjs';
import { cartMatchesExpected, transcriptMatches } from './assertions.mjs';
import { createTurnLatchStore, installQaTurnLatch } from './turn-latch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const requireEnv = name => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};
const safe = value => String(value).replace(/[^a-zA-Z0-9_.-]/g, '_');
const QA_AUDIO_PROCESSING_TAIL_MS = 120; // one deterministic 1600-frame PCM block at 16 kHz is 100 ms
const QA_LIVE_COMPATIBILITY_PROFILE = 'gemini-live-v1beta-blocking-v1';
const compatibilityProfile = String(process.env.FREEFLOW_E2E_COMPATIBILITY_PROFILE || '').trim();
const expectedLiveModel = String(process.env.FREEFLOW_E2E_EXPECTED_LIVE_MODEL || '').trim();
if (compatibilityProfile && compatibilityProfile !== QA_LIVE_COMPATIBILITY_PROFILE) {
  throw new Error('Unsupported FREEFLOW_E2E_COMPATIBILITY_PROFILE');
}
if (compatibilityProfile && !expectedLiveModel) {
  throw new Error('Missing FREEFLOW_E2E_EXPECTED_LIVE_MODEL for compatibility smoke');
}
const scenarioPath = path.resolve(process.env.FREEFLOW_E2E_SCENARIO || path.join(here, 'scenario.json'));
const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
if (!scenario.stop_before_checkout || !Array.isArray(scenario.turns)
  || scenario.turns.length < 1 || scenario.turns.length > 5) {
  throw new Error('Scenario must contain between one and five bounded turns and stop before checkout');
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
await context.addInitScript(() => {
  for (const key of [
    'amber-session-id',
    'freeflow_cart',
    'freeflow_cart_restaurant',
    'freeflow_cart_session',
  ]) localStorage.removeItem(key);
});
if (compatibilityProfile) {
  await context.addInitScript(({ profile, model }) => {
    window.__FREEFLOW_GEMINI_LIVE_COMPATIBILITY_PROFILE__ = profile;
    localStorage.setItem('ff_live_model_override', model);
  }, { profile: compatibilityProfile, model: expectedLiveModel });
}
await context.addInitScript({
  content: `(${installFreeFlowAudioShim.toString()})(${parseDeterministicPcmWav.toString()});`,
});
await context.addInitScript({
  content: `window.__FREEFLOW_CREATE_TURN_LATCH_STORE__ = ${createTurnLatchStore.toString()};`,
});

const page = await context.newPage();
let runId;
let outputDir;
let sessionId;
let bootstrapFailureDir;
const scenarioResults = [];

const ensureFailureOutputDir = () => {
  if (outputDir) return outputDir;
  if (!bootstrapFailureDir) {
    bootstrapFailureDir = path.resolve(
      'output',
      'playwright',
      'tracelab',
      'bootstrap-failures',
      `${Date.now()}-${process.pid}`,
    );
    fs.mkdirSync(bootstrapFailureDir, { recursive: true });
  }
  return bootstrapFailureDir;
};

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

const scenarioReport = () => {
  const complete = scenarioResults.length === turnLimit;
  const status = scenarioResults.some(result => result.status === 'FAIL') ? 'FAIL'
    : scenarioResults.some(result => result.status === 'UNKNOWN') || !complete ? 'UNKNOWN' : 'PASS';
  return { schema: 'freeflow.tracelab.qa-scenario.v1', run_id: runId || null, status,
    completed_turns: scenarioResults.length, expected_turns: turnLimit, turns: scenarioResults };
};

const writeScenarioReport = () => {
  if (!outputDir) return scenarioReport();
  const report = scenarioReport();
  fs.writeFileSync(path.join(outputDir, 'scenario-report.json'), JSON.stringify(report, null, 2));
  return report;
};

const writeEventVolume = capture => {
  if (!outputDir || !capture) return null;
  const events = JSON.parse(capture).events || [];
  const counts = {};
  for (const event of events) counts[event.event] = (counts[event.event] || 0) + 1;
  const volume = {
    total: events.length,
    repetitive: {
      cart_sync_attempt: counts.cart_sync_attempt || 0,
      ui_cart_committed: counts.ui_cart_committed || 0,
    },
    by_event: counts,
  };
  fs.writeFileSync(path.join(outputDir, 'event-volume.json'), JSON.stringify(volume, null, 2));
  return volume;
};

const writeRunResult = failure => {
  if (!outputDir) return;
  const scenarioResult = writeScenarioReport();
  const tracePath = path.join(outputDir, 'report-persisted', 'report.json');
  const trace = fs.existsSync(tracePath) ? JSON.parse(fs.readFileSync(tracePath, 'utf8')) : null;
  const overall = scenarioResult.status === 'FAIL' || trace?.status === 'FAIL' ? 'FAIL'
    : scenarioResult.status === 'UNKNOWN' || !trace || trace.status === 'UNKNOWN' ? 'UNKNOWN' : 'PASS';
  fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify({
    schema: 'freeflow.tracelab.qa-result.v1', run_id: runId, status: overall,
    scenario_status: scenarioResult.status, trace_analyzer_status: trace?.status || 'UNKNOWN',
    failure: failure ? String(failure) : null,
  }, null, 2));
};

const collectBoundaryEvidence = async (failure = null) => {
  const evidenceDir = failure ? ensureFailureOutputDir() : outputDir;
  if (!evidenceDir) return;
  const runtime = await page.evaluate(() => ({
    bootstrap: {
      url: window.location.href,
      pathname: window.location.pathname,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      ready_state: document.readyState,
      voice_dock_exists: Boolean(document.querySelector('[data-ui-role="voice-dock-bar"]')),
      data_ui_roles: [...new Set([...document.querySelectorAll('[data-ui-role]')]
        .map(element => element.getAttribute('data-ui-role')).filter(Boolean))],
      overlays: [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].map(element => ({
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute('role'),
        aria_modal: element.getAttribute('aria-modal'),
        class_name: String(element.className || '').slice(0, 160),
      })).slice(0, 20),
    },
    audio_boundary: window.__FREEFLOW_AUDIO_BOUNDARY_DIAGNOSTICS__?.snapshot?.() || null,
    gemini_session: window.__FREEFLOW_GEMINI_QA_DIAGNOSTICS__?.snapshot?.() || null,
    audio_shim: window.__FREEFLOW_AUDIO_SHIM__?.state?.() || null,
    collector_event_count: window.__FREEFLOW_CART_AUDIT__?.events?.length ?? null,
    qa_turn_latch: window.__FREEFLOW_TRACELAB_TURN_LATCH__?.current?.() || null,
    compatibility_profile: window.__FREEFLOW_GEMINI_LIVE_COMPATIBILITY_RUNTIME__ || null,
  })).catch(error => ({ collection_error: String(error) }));
  fs.writeFileSync(path.join(evidenceDir, 'audio-boundary.json'), JSON.stringify({
    captured_at: Date.now(),
    failure: failure ? String(failure) : null,
    blocked_side_effect_count: blocked.length,
    ...runtime,
  }, null, 2));
  await page.screenshot({ path: path.join(evidenceDir, failure ? 'timeout.png' : 'final.png'), fullPage: true }).catch(() => {});

  if (!runId) {
    process.stderr.write(`${JSON.stringify({ bootstrap_failure_evidence: evidenceDir })}\n`);
    return;
  }

  const memoryCapture = await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__?.exportMemory?.(id) || null, runId).catch(() => null);
  if (memoryCapture) {
    const memoryPath = path.join(evidenceDir, 'capture-memory.json');
    fs.writeFileSync(memoryPath, memoryCapture);
    runAnalyzer(memoryPath, 'report-memory');
  }

  const persistedCapture = await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__?.exportRun?.(id) || null, runId).catch(() => null);
  if (persistedCapture) {
    const persistedPath = path.join(evidenceDir, 'capture-persisted.json');
    fs.writeFileSync(persistedPath, persistedCapture);
    writeEventVolume(persistedCapture);
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
  if (compatibilityProfile) fs.writeFileSync(path.join(outputDir, 'compatibility-profile.json'), JSON.stringify({
    schema: 'freeflow.gemini-live-compatibility-profile.v1',
    profile: compatibilityProfile,
    expected_api_version: 'v1beta',
    expected_thinking_config_present: false,
    expected_function_behavior: 'BLOCKING',
    expected_model: expectedLiveModel,
  }, null, 2), { flag: 'wx' });
  await page.evaluate(installQaTurnLatch);

  await page.getByRole('button', { name: 'Włącz mikrofon' }).first().click();
  await page.waitForFunction(() => window.__FREEFLOW_AUDIO_SHIM__?.ready(), null, { timeout: 15000 });
  await page.locator('[data-ui-role="voice-dock-bar"][data-state="listening"]').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__FREEFLOW_GEMINI_QA_DIAGNOSTICS__?.startFixture), null, { timeout: 15000 });
  if (compatibilityProfile) {
    const actual = await page.evaluate(() => window.__FREEFLOW_GEMINI_LIVE_COMPATIBILITY_RUNTIME__ || null);
    const valid = actual?.profile === compatibilityProfile
      && actual?.api_version === 'v1beta'
      && actual?.model === expectedLiveModel
      && actual?.thinking_config_present === false
      && Array.isArray(actual?.function_behaviors)
      && actual.function_behaviors.length === 1
      && actual.function_behaviors[0] === 'BLOCKING';
    fs.writeFileSync(path.join(outputDir, 'compatibility-profile.json'), JSON.stringify({
      schema: 'freeflow.gemini-live-compatibility-profile.v1',
      profile: compatibilityProfile,
      expected_api_version: 'v1beta',
      expected_thinking_config_present: false,
      expected_function_behavior: 'BLOCKING',
      expected_model: expectedLiveModel,
      actual,
      preflight_status: valid ? 'PASS' : 'FAIL',
    }, null, 2));
    if (!valid) throw new Error('compatibility_profile_preflight_failed');
  }

  for (let index = 0; index < turnLimit; index++) {
    const turn = scenario.turns[index];
    await page.evaluate(({ turnId, required }) => window.__FREEFLOW_TRACELAB_TURN_LATCH__.begin(turnId, required), {
      turnId: turn.id, required: turn.completion_events,
    });
    const audio = fs.readFileSync(path.resolve(path.dirname(scenarioPath), turn.audio)).toString('base64');
    const boundaryBefore = await page.evaluate(() => window.__FREEFLOW_AUDIO_BOUNDARY_DIAGNOSTICS__?.snapshot?.() || null);
    const playbackStartedAt = Date.now();
    const { playback, fixtureStart, explicitBoundary, processingTailMs } = await page.evaluate(async ({ encoded, tailMs }) => {
      const fixtureStart = window.__FREEFLOW_GEMINI_QA_DIAGNOSTICS__.startFixture();
      const playback = await window.__FREEFLOW_AUDIO_SHIM__.playBase64(encoded);
      await new Promise(resolve => setTimeout(resolve, tailMs));
      const explicitBoundary = window.__FREEFLOW_GEMINI_QA_DIAGNOSTICS__.endFixture();
      return { playback, fixtureStart, explicitBoundary, processingTailMs: tailMs };
    }, { encoded: audio, tailMs: QA_AUDIO_PROCESSING_TAIL_MS });
    const playbackFinishedAt = Date.now();
    const boundaryAfter = await page.evaluate(() => window.__FREEFLOW_AUDIO_BOUNDARY_DIAGNOSTICS__?.snapshot?.() || null);
    fs.appendFileSync(path.join(outputDir, 'wav-playback.jsonl'), `${JSON.stringify({
      turn_id: turn.id,
      playback_started_at: playbackStartedAt,
      playback_finished_at: playbackFinishedAt,
      fixture_start: fixtureStart,
      explicit_boundary: explicitBoundary,
      processing_tail_ms: processingTailMs,
      boundary_before: boundaryBefore,
      boundary_after: boundaryAfter,
      ...playback,
    })}\n`);
    try {
      await page.waitForFunction(turnId => window.__FREEFLOW_TRACELAB_TURN_LATCH__?.status(turnId)?.complete === true,
        turn.id, { timeout: scenario.turn_timeout_ms });
    } catch (error) {
      const observation = await page.evaluate(turnId => window.__FREEFLOW_TRACELAB_TURN_LATCH__?.status(turnId) || null, turn.id);
      scenarioResults.push({ turn_id: turn.id, status: 'UNKNOWN', reason: 'required_stage_timeout', observation });
      writeScenarioReport();
      fs.writeFileSync(path.join(outputDir, `${String(index + 1).padStart(2, '0')}-${safe(turn.id)}-timeout-observation.json`),
        JSON.stringify(observation, null, 2));
      throw error;
    }
    await page.locator('[data-ui-role="voice-dock-bar"][data-state="listening"]').waitFor({ timeout: scenario.turn_timeout_ms });
    const observation = await page.evaluate(turnId => window.__FREEFLOW_TRACELAB_TURN_LATCH__.end(turnId), turn.id);
    const evidence = {
      transcript: observation?.latest_events?.user_transcript?.payload?.text || '',
      cart: observation?.latest_events?.ui_cart_committed?.payload?.cart || null,
    };
    const transcriptOk = transcriptMatches(turn.expected_transcript, evidence.transcript);
    const cartOk = cartMatchesExpected(evidence.cart, turn.expected_cart);
    const turnResult = {
      turn_id: turn.id, status: transcriptOk && cartOk ? 'PASS' : 'FAIL',
      checks: {
        transcript_matches: { status: transcriptOk ? 'PASS' : 'FAIL', expected: turn.expected_transcript, actual: evidence.transcript },
        visible_cart_matches: { status: cartOk ? 'PASS' : 'FAIL', expected: turn.expected_cart, actual: evidence.cart },
      },
      observed_required_stages: observation?.observed || {},
      repetitive_event_counts: observation?.repetitive_event_counts || {},
    };
    scenarioResults.push(turnResult);
    writeScenarioReport();
    const cartLabel = await page.locator('button[aria-label^="Otwórz koszyk"]').first().getAttribute('aria-label').catch(() => null);
    await page.screenshot({ path: path.join(outputDir, `${String(index + 1).padStart(2, '0')}-${safe(turn.id)}.png`), fullPage: true });
    fs.appendFileSync(path.join(outputDir, 'turns.jsonl'), `${JSON.stringify({ turn_id: turn.id, transcript: evidence.transcript,
      cart: evidence.cart, cart_label: cartLabel, observation, status: turnResult.status })}\n`);
    if (blocked.length) throw new Error(`Blocked side-effect attempts detected: ${JSON.stringify(blocked)}`);
    if (!transcriptOk || !cartOk) throw new Error(`Scenario mismatch in ${turn.id}`);
  }

  let capture;
  for (let attempt = 0; attempt < 10; attempt++) {
    capture = await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__.exportRun(id), runId);
    const events = JSON.parse(capture).events;
    if (events.some(event => event.source === 'backend') && events.some(event => event.source === 'frontend')) break;
    await page.waitForTimeout(500);
  }
  fs.writeFileSync(path.join(outputDir, 'capture.json'), capture, { flag: 'wx' });
  writeEventVolume(capture);
  await collectBoundaryEvidence();
  await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__.stop(id), runId);

  execFileSync(process.execPath, [cli, '--run', runId, '--session', sessionId, '--out', outputDir, path.join(outputDir, 'capture.json')], {
    stdio: 'inherit', env: { ...process.env, FREEFLOW_TRACELAB_DEBUG: '1' },
  });
  if (blocked.length) throw new Error(`Blocked side-effect attempts detected: ${JSON.stringify(blocked)}`);
  writeRunResult(null);
  process.stdout.write(`${JSON.stringify({ ok: true, run_id: runId, session_id: sessionId, output: outputDir })}\n`);
} catch (error) {
  await collectBoundaryEvidence(error);
  writeRunResult(error);
  if (runId) await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__?.stop?.(id), runId).catch(() => {});
  throw error;
} finally {
  await context.close();
  await browser.close();
}
