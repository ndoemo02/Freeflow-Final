/**
 * VoiceDock — premium glass capsule for FreeFlow
 *
 * Referencja wizualna: .claude/files/freeflow-voice-dock.html
 *
 * Trzy punkty sterowania:
 *   dockState — z Zustand store sesji (idle|listening|speaking)
 *   level     — useRef + RAF (amplituda z Web Audio, NIE useState)
 *   transcript — z store, po strip('**'), po walidacji języka
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useLiveUiSessionStore } from '../state/liveUiSession';

// ── Typy ──

type DockState = 'idle' | 'listening' | 'speaking';

interface VoiceDockProps {
  onMicClick?: () => void;
  onTextSubmit?: (value: string) => void;
}

// ── Poola stanów ──

function toDockState(raw: string): DockState {
  switch (raw) {
    case 'listening':
      return 'listening';
    case 'processing':
    case 'results_ready':
    case 'restaurant_selected':
    case 'item_selected':
    case 'cart_ready':
    case 'paused':
      return 'speaking';
    default:
      return 'idle';
  }
}

// ── Strip ** + podstawowa walidacja języka ──

function cleanTranscript(
  ...candidates: (string | null | undefined)[]
): string {
  for (const raw of candidates) {
    const text = (raw ?? '').replace(/\*\*/g, '').trim();
    if (!text) continue;
    if (/^[\[{]/.test(text) || /interactionbridge|tool_call|ws_|https?:\/\//i.test(text)) continue;
    return text;
  }
  return '';
}

// ── Iniekcja SVG defs (clip-path + rim gradient) ──

const DEFS_ID = 'ff-voice-dock-defs';

function injectDockDefs() {
  if (document.getElementById(DEFS_ID)) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = DEFS_ID;
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('style', 'position:absolute');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <clipPath id="ff-dock-clip" clipPathUnits="objectBoundingBox">
        <path d="M0,0.5 C0,0.2 0.02,0 0.09,0 C0.2,0 0.32,0.1 0.5,0.1 C0.68,0.1 0.8,0 0.91,0 C0.98,0 1,0.2 1,0.5 C1,0.8 0.98,1 0.91,1 C0.8,1 0.68,0.9 0.5,0.9 C0.32,0.9 0.2,1 0.09,1 C0.02,1 0,0.8 0,0.5 Z"/>
      </clipPath>
      <linearGradient id="ff-rim-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#3FA9FF"/>
        <stop offset="0.5" stop-color="#4a5159"/>
        <stop offset="1" stop-color="#FF7A1C"/>
      </linearGradient>
    </defs>
  `;
  document.body.appendChild(svg);
}

// ── CSS dla data-state → kolory (jeden raz wstrzyknięty) ──

const STATE_STYLE_ID = 'ff-voice-dock-state';

function injectStateCSS() {
  if (document.getElementById(STATE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STATE_STYLE_ID;
  style.textContent = `
    .ff-voice-dock[data-state="idle"]      { --left: 0; --right: 0; }
    .ff-voice-dock[data-state="listening"] { --left: 1; --right: 0; }
    .ff-voice-dock[data-state="speaking"]  { --left: 0; --right: 1; }

    .ff-voice-dock.confirm {
      --ff-dock-confirm: 1;
      transition: --ff-dock-confirm 0ms;
    }
  `;
  document.head.appendChild(style);
}

// ── Komponent ──

export default function VoiceDock({ onMicClick, onTextSubmit }: VoiceDockProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const levelRef = useRef(0);
  const rafRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Store — trzy punkty
  const sessionState = useLiveUiSessionStore((s) => s.sessionState);
  const userTx = useLiveUiSessionStore((s) => s.lastUserTranscript);
  const asstTx = useLiveUiSessionStore((s) => s.lastAssistantTranscript);

  const dockState: DockState = toDockState(sessionState);

  // Transkrypt
  const transcript = cleanTranscript(
    dockState === 'listening' ? userTx : null,
    asstTx,
    userTx,
  );

  // ── Iniekcja defs + state CSS ──

  useEffect(() => {
    injectDockDefs();
    injectStateCSS();
  }, []);

  // ── Web Audio — RMS amplitude ──

  useEffect(() => {
    if (dockState === 'idle') {
      cancelAnimationFrame(rafRef.current);
      dockRef.current?.style.setProperty('--level', '0');
      return;
    }

    let aborted = false;
    let cleanupStream: (() => void) | null = null;

    (async () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const buf = new Uint8Array(analyser.fftSize);

        if (dockState === 'listening') {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (aborted) { stream.getTracks().forEach((t) => t.stop()); return; }
          ctx.createMediaStreamSource(stream).connect(analyser);
          cleanupStream = () => stream.getTracks().forEach((t) => t.stop());
        } else {
          const ttsEl = document.querySelector<HTMLAudioElement>('audio[data-role="tts"]');
          if (!ttsEl) return;
          ctx.createMediaElementSource(ttsEl).connect(analyser);
        }

        const tick = () => {
          if (aborted) return;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const n = (buf[i] - 128) / 128;
            sum += n * n;
          }
          levelRef.current = Math.min(1, Math.sqrt(sum / buf.length) * 3);
          dockRef.current?.style.setProperty('--level', levelRef.current.toFixed(3));
          rafRef.current = requestAnimationFrame(tick);
        };

        tick();
      } catch (e) {
        console.warn('[VoiceDock] Web Audio setup:', e);
      }
    })();

    return () => {
      aborted = true;
      cancelAnimationFrame(rafRef.current);
      dockRef.current?.style.setProperty('--level', '0');
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      cleanupStream?.();
    };
  }, [dockState]);

  // ── Flash potwierdzenia (teal, 600ms) ──

  const flashConfirm = useCallback(() => {
    dockRef.current?.classList.add('confirm');
    setTimeout(() => dockRef.current?.classList.remove('confirm'), 600);
  }, []);

  useEffect(() => {
    (window as any).__voiceDockConfirm = flashConfirm;
    return () => { delete (window as any).__voiceDockConfirm; };
  }, [flashConfirm]);

  // ── UI helpers ──

  const hasText = inputValue.trim().length > 0;

  const submit = () => {
    if (hasText) {
      onTextSubmit?.(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (hasText) {
      submit();
    } else {
      onMicClick?.();
    }
  };

  const inputPlaceholder =
    dockState === 'listening'
      ? 'Słucham...'
      : 'Napisz lub powiedz...';

  const handleInnerClick = () => {
    inputRef.current?.focus();
  };

  // ── Render ──

  return (
    <div className="ff-voice-dock-wrap">

      <div
        ref={dockRef}
        className="ff-voice-dock"
        data-state={dockState}
        data-ui-role="voice-dock-bar"
      >
        {/* Glass backdrop */}
        <div className="ff-voice-dock__glass" />

        {/* Frost overlay */}
        <div className="ff-voice-dock__frost" />

        {/* Neon rim outline */}
        <svg className="ff-voice-dock__skin" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="ff-rim-grad-inline" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3FA9FF"/>
              <stop offset="0.5" stopColor="#4a5159"/>
              <stop offset="1" stopColor="#FF7A1C"/>
            </linearGradient>
          </defs>
          <path
            className="ff-voice-dock__rim"
            pathLength="1"
            d="M0,0.5 C0,0.2 0.02,0 0.09,0 C0.2,0 0.32,0.1 0.5,0.1 C0.68,0.1 0.8,0 0.91,0 C0.98,0 1,0.2 1,0.5 C1,0.8 0.98,1 0.91,1 C0.8,1 0.68,0.9 0.5,0.9 C0.32,0.9 0.2,1 0.09,1 C0.02,1 0,0.8 0,0.5 Z"
          />
        </svg>

        {/* Content */}
        <div className="ff-voice-dock__content">
          {/* Left node — mic */}
          <button
            type="button"
            className="ff-voice-dock__node ff-voice-dock__node--left"
            onClick={onMicClick}
            aria-label={
              dockState === 'listening'
                ? 'Zatrzymaj nagrywanie'
                : 'Włącz mikrofon'
            }
            aria-pressed={dockState === 'listening'}
          >
            <span className="ff-voice-dock__rings" aria-hidden="true">
              <span /><span /><span />
            </span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M4 9v6h3l5 4V5L7 9H4z"/>
              <path d="M16 8.5a4 4 0 0 1 0 7" opacity=".8"/>
              <path d="M18.5 6a7 7 0 0 1 0 12" opacity=".5"/>
            </svg>
          </button>

          {/* Center — transcript + input */}
          <div className="ff-voice-dock__inner" onClick={handleInnerClick} role="button" tabIndex={-1}>
            {transcript && (
              <div className="ff-voice-dock__transcript">
                {dockState === 'listening' ? (
                  <><span className="ff-voice-dock__label">Ty: </span>{transcript}</>
                ) : (
                  <><span className="ff-voice-dock__label">Amber: </span>{transcript}</>
                )}
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={transcript ? '' : inputPlaceholder}
              className="ff-voice-dock__input"
              aria-label="Tekstowa wiadomość"
            />
          </div>

          {/* Right node — orb / send */}
          <div className="ff-voice-dock__node ff-voice-dock__node--right">
            {hasText ? (
              <button
                type="button"
                onClick={submit}
                className="ff-voice-dock__send"
                aria-label="Wyślij"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M1 7.5h13M8.5 2 14 7.5 8.5 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={onMicClick}
                className="ff-voice-dock__mic-btn"
                aria-label={dockState === 'listening' ? 'Zatrzymaj nagrywanie' : 'Włącz mikrofon'}
                aria-pressed={dockState === 'listening'}
              >
                <span className="ff-voice-dock__orb" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
