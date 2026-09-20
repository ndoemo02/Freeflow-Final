import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installFreeFlowAudioShim } from './audio-shim.mjs';
import { blockedSideEffect } from './policy.mjs';
import { cartMatchesExpected, transcriptMatches } from './assertions.mjs';
import { parseDeterministicPcmWav, pcm16Metrics } from './wav.mjs';

test('audio shim intercepts audio getUserMedia only inside the marked runner page', async () => {
  const original = async () => 'native-stream';
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: original } } });
  globalThis.window = {
    AudioContext: class {
      state = 'running';
      createMediaStreamDestination() { return { stream: { getAudioTracks: () => [{ readyState: 'live' }] } }; }
      async resume() {}
    },
  };
  installFreeFlowAudioShim(parseDeterministicPcmWav);
  assert.equal(window.__FREEFLOW_TRACELAB_QA_RUNNER__, 'phase1');
  assert.equal(await navigator.mediaDevices.getUserMedia({ video: true }), 'native-stream');
  assert.equal((await navigator.mediaDevices.getUserMedia({ audio: true })).getAudioTracks()[0].readyState, 'live');
  assert.equal(window.__FREEFLOW_AUDIO_SHIM__.ready(), true);
});

test('baseline plan contains exactly six bounded runs with the main scenario repeated three times', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const plan = JSON.parse(fs.readFileSync(path.join(here, 'baseline-plan.json'), 'utf8'));
  assert.equal(plan.model, 'gemini-3.1-flash-live-preview');
  assert.equal(plan.runs.length, 6);
  assert.deepEqual(plan.runs.slice(0, 3).map(run => run.scenario), ['scenario.json', 'scenario.json', 'scenario.json']);
  const fixtureManifest = JSON.parse(fs.readFileSync(path.join(here, 'fixtures.json'), 'utf8'));
  const fixturePaths = new Set(fixtureManifest.fixtures.map(fixture => path.resolve(here, fixture.path)));
  for (const run of plan.runs) {
    const scenarioPath = path.join(here, run.scenario);
    const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
    assert.equal(scenario.stop_before_checkout, true);
    assert.ok(scenario.turns.length >= 1 && scenario.turns.length <= 5);
    for (const turn of scenario.turns) {
      const fixturePath = path.resolve(path.dirname(scenarioPath), turn.audio);
      assert.ok(fixturePaths.has(fixturePath), `${run.id}/${turn.id} is not frozen in fixtures.json`);
      assert.ok(fs.existsSync(fixturePath), `${run.id}/${turn.id} fixture is missing`);
    }
  }
});

test('frozen fixtures conform to PCM16 mono 16kHz and their manifest hashes and metrics', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(fs.readFileSync(path.join(here, 'fixtures.json'), 'utf8'));
  assert.deepEqual(manifest.standard, {
    container: 'WAV',
    encoding: 'PCM16 little-endian',
    channels: 1,
    sample_rate_hz: 16000,
    runtime_resampling: false,
    runtime_zero_padding: false,
    source: 'WAV data chunk PCM bytes',
    chunk_frames: 1600,
    chunk_bytes: 3200,
    chunk_duration_ms: 100,
    final_partial_chunk_allowed: true,
    audio_stream_end_count: 1,
    qa_outbound_gate: 'existing',
  });
  assert.equal(manifest.fixtures.length, 8);
  for (const fixture of manifest.fixtures) {
    const bytes = fs.readFileSync(path.join(here, fixture.path));
    const parsed = parseDeterministicPcmWav(bytes);
    const metrics = pcm16Metrics(parsed.pcm);
    assert.equal(parsed.sample_rate, 16000, fixture.id);
    assert.equal(parsed.channels, 1, fixture.id);
    assert.equal(parsed.bits_per_sample, 16, fixture.id);
    assert.equal(parsed.duration_ms, fixture.duration_ms, fixture.id);
    assert.equal(parsed.pcm_byte_count, fixture.pcm_byte_count, fixture.id);
    assert.equal(metrics.peak, fixture.peak, fixture.id);
    assert.ok(Math.abs(metrics.rms - fixture.rms) < 1e-8, fixture.id);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), fixture.sha256, fixture.id);
    assert.ok(fixture.critical_semantic_assertions.length > 0, fixture.id);
    for (const semantic of fixture.critical_semantic_assertions) {
      for (const evidence of semantic.evidence) {
        assert.ok(fixture.normalized_asr_transcript.includes(evidence), `${fixture.id}: ${semantic.field}/${evidence}`);
      }
    }
  }
});

test('side-effect policy blocks payments, Stripe and order creation only', () => {
  assert.equal(blockedSideEffect('POST', 'https://backend.example/api/orders?source=e2e'), 'order_submit');
  assert.equal(blockedSideEffect('GET', 'https://backend.example/api/payments/status'), 'payment_api');
  assert.equal(blockedSideEffect('GET', 'https://checkout.stripe.com/c/pay/test'), 'stripe');
  assert.equal(blockedSideEffect('GET', 'https://backend.example/api/orders'), null);
  assert.equal(blockedSideEffect('POST', 'https://backend.example/api/voice/live/tool-call'), null);
});

test('scenario assertions tolerate ASR punctuation but enforce visible quantity and variant', () => {
  assert.equal(transcriptMatches('Dodaj małą lemoniadę', 'Dodaj mala lemoniade.'), true);
  assert.equal(transcriptMatches('Dodaj małą lemoniadę', 'Dodaj ravioli'), false);
  const cart = { items: [{ name: 'Ravioli z dynią', qty: 2 }, { name: 'Lemoniada', qty: 1, variant: 'duża' }] };
  assert.equal(cartMatchesExpected(cart, [{ name: 'Ravioli z dynią', qty: 2 }, { name: 'Lemoniada', qty: 1, variant: 'duża' }]), true);
  assert.equal(cartMatchesExpected(cart, [{ name: 'Lemoniada', qty: 1, variant: 'mała' }]), false);
});
