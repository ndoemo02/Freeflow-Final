import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installFreeFlowAudioShim } from './audio-shim.mjs';
import { blockedSideEffect } from './policy.mjs';
import { cartMatchesExpected, transcriptMatches } from './assertions.mjs';

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
  installFreeFlowAudioShim();
  assert.equal(window.__FREEFLOW_TRACELAB_QA_RUNNER__, 'phase1');
  assert.equal(await navigator.mediaDevices.getUserMedia({ video: true }), 'native-stream');
  assert.equal((await navigator.mediaDevices.getUserMedia({ audio: true })).getAudioTracks()[0].readyState, 'live');
  assert.equal(window.__FREEFLOW_AUDIO_SHIM__.ready(), true);
});

test('scenario is bounded and all committed WAV fixtures have valid RIFF headers', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const scenario = JSON.parse(fs.readFileSync(path.join(here, 'scenario.json'), 'utf8'));
  assert.equal(scenario.stop_before_checkout, true);
  assert.deepEqual(scenario.turns.map(turn => turn.id), ['first-item', 'quantity', 'size-variant', 'correction', 'cart-truth']);
  for (const turn of scenario.turns) {
    const wav = fs.readFileSync(path.join(here, turn.audio));
    assert.equal(wav.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(wav.subarray(8, 12).toString('ascii'), 'WAVE');
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
