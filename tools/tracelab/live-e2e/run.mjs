import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
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
try {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-ui-role="voice-dock-bar"]').waitFor({ state: 'visible', timeout: 30000 });
  const sessionId = await page.waitForFunction(() => /^sess_[a-z0-9_]+$/.test(localStorage.getItem('amber-session-id') || ''), null, { timeout: 15000 })
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

  for (let index = 0; index < scenario.turns.length; index++) {
    const turn = scenario.turns[index];
    const before = await page.evaluate(() => window.__FREEFLOW_CART_AUDIT__?.events?.length || 0);
    const audio = fs.readFileSync(path.resolve(path.dirname(scenarioPath), turn.audio)).toString('base64');
    await page.evaluate(encoded => window.__FREEFLOW_AUDIO_SHIM__.playBase64(encoded), audio);
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
  await page.evaluate(id => window.__FREEFLOW_TRACELAB_QA__.stop(id), runId);

  execFileSync(process.execPath, [cli, '--run', runId, '--session', sessionId, '--out', outputDir, path.join(outputDir, 'capture.json')], {
    stdio: 'inherit', env: { ...process.env, FREEFLOW_TRACELAB_DEBUG: '1' },
  });
  if (blocked.length) throw new Error(`Blocked side-effect attempts detected: ${JSON.stringify(blocked)}`);
  process.stdout.write(`${JSON.stringify({ ok: true, run_id: runId, session_id: sessionId, output: outputDir })}\n`);
} finally {
  await context.close();
  await browser.close();
}
