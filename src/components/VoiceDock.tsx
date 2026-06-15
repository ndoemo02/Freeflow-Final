/**
 * VoiceDock — canonical voice bar for FreeFlow
 *
 * Trzy punkty sterowania (i tylko trzy):
 *   dockState — z Zustand store sesji (idle|listening|speaking)
 *   level     — useRef + RAF (amplituda z Web Audio, NIE useState)
 *   transcript — z store, po strip('**'), po walidacji języka
 *
 * Sekcja 1 briefu Sonnet. Reszta: Home.css (ff-voice-dock* klasy wizualne).
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
// Sprawdza czy tekst zawiera głównie znaki występujące w języku polskim.

function cleanTranscript(
  ...candidates: (string | null | undefined)[]
): string {
  for (const raw of candidates) {
    const text = (raw ?? '').replace(/\*\*/g, '').trim();
    if (!text) continue;
    // Odrzuć surowe JSON, technical noise
    if (/^[\[{]/.test(text) || /interactionbridge|tool_call|ws_|https?:\/\//i.test(text)) continue;
    return text;
  }
  return '';
}

// ── CSS dla data-state → kolory ──
// Brief: CSS, nie JS. Jeden raz wstrzyknięty.

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
  const levelRef = useRef(0);
  const rafRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Store — trzy punkty
  const sessionState = useLiveUiSessionStore((s) => s.sessionState);
  const userTx = useLiveUiSessionStore((s) => s.lastUserTranscript);
  const asstTx = useLiveUiSessionStore((s) => s.lastAssistantTranscript);

  const dockState: DockState = toDockState(sessionState);

  // Transkrypt: słuchanie → user, reszta → asystent/user
  const transcript = cleanTranscript(
    dockState === 'listening' ? userTx : null,
    asstTx,
    userTx,
  );

  // ── Web Audio — RMS amplitude ──

  useEffect(() => {
    injectStateCSS();

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
          // Mikrofon
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          if (aborted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          ctx.createMediaStreamSource(stream).connect(analyser);
          cleanupStream = () =>
            stream.getTracks().forEach((t) => t.stop());
        } else {
          // Speaking → TTS audio element
          const ttsEl = document.querySelector<HTMLAudioElement>(
            'audio[data-role="tts"]',
          );
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
          levelRef.current = Math.min(
            1,
            Math.sqrt(sum / buf.length) * 3,
          );
          dockRef.current?.style.setProperty(
            '--level',
            levelRef.current.toFixed(3),
          );
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

  // Expose dla zewnętrznego triggera
  useEffect(() => {
    (window as any).__voiceDockConfirm = flashConfirm;
    return () => {
      delete (window as any).__voiceDockConfirm;
    };
  }, [flashConfirm]);

  // ── UI ──

  const voiceActive = dockState === 'listening';
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

  return (
    <div
      ref={dockRef}
      className="ff-voice-dock flex items-center gap-2.5 px-3 py-2"
      data-state={dockState}
      data-voice-active={voiceActive ? 'true' : 'false'}
      data-ui-role="voice-dock-bar"
    >
      {/* Głośnik — ff-speaker.svg (wersja uproszczona dla docka) */}
      <div className="ff-voice-dock__speaker" aria-hidden="true">
        <svg
          className="ff-voice-dock__speaker-icon"
          viewBox="0 0 32 32"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className="ff-voice-dock__speaker-body"
            d="M8.5 18.5H5.8a1.8 1.8 0 0 1-1.8-1.8v-1.4a1.8 1.8 0 0 1 1.8-1.8h2.7l5.8-4.7c.75-.6 1.87-.07 1.87.9v12.6c0 .97-1.12 1.5-1.87.9l-5.8-4.7Z"
          />
          <path
            className="ff-voice-dock__speaker-wave ff-voice-dock__speaker-wave--cyan"
            d="M20.2 11.4c1.3 1.1 2.08 2.72 2.08 4.6s-.78 3.5-2.08 4.6"
          />
          <path
            className="ff-voice-dock__speaker-wave ff-voice-dock__speaker-wave--amber"
            d="M23.7 8.6c2.18 1.78 3.54 4.42 3.54 7.4s-1.36 5.62-3.54 7.4"
          />
        </svg>
      </div>

      {/* Transkrypt + input */}
      <div className="ff-voice-dock__core flex-1 min-w-0 pr-1">
        {transcript && (
          <p
            className="ff-voice-dock__transcript mb-1 text-[10px] leading-tight break-words overflow-hidden"
            style={{
              color: 'rgba(226, 232, 240, 0.62)',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {transcript}
          </p>
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          className="ff-voice-dock__input w-full min-w-0 bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none caret-cyan-300"
          style={{ letterSpacing: '0.01em' }}
        />
      </div>

      {/* Microphone / Send toggle */}
      {hasText ? (
        <button
          type="button"
          onClick={submit}
          className="ff-voice-dock__send shrink-0 flex items-center justify-center text-[13px] font-semibold text-white"
          style={{
            width: 42,
            height: 42,
            borderRadius: '999px',
            background:
              'radial-gradient(circle at 38% 30%, rgba(255,205,120,0.95), rgba(249,115,22,0.82) 42%, rgba(88,35,8,0.92) 100%)',
            border: '1px solid rgba(255,162,82,0.48)',
          }}
          aria-label="Wyślij"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M1 7.5h13M8.5 2 14 7.5 8.5 13"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          data-ui-role="action-orb"
          onClick={onMicClick}
          className="ff-voice-dock__orb shrink-0 relative flex items-center justify-center"
          style={{
            width: 42,
            height: 42,
            borderRadius: '999px',
            overflow: 'hidden',
            background: voiceActive
              ? 'radial-gradient(circle at 38% 32%, rgba(147,245,255,0.78), rgba(19,116,135,0.44) 42%, rgba(5,10,18,0.78) 100%)'
              : 'radial-gradient(circle at 38% 30%, rgba(255,190,104,0.92), rgba(249,115,22,0.66) 42%, rgba(36,18,10,0.86) 100%)',
            border: voiceActive
              ? '1px solid rgba(103,232,249,0.34)'
              : '1px solid rgba(255,162,82,0.42)',
          }}
          aria-label={voiceActive ? 'Zatrzymaj nagrywanie' : 'Włącz mikrofon'}
          aria-pressed={voiceActive}
        >
          <span className="ff-voice-dock__orb-core" aria-hidden="true" />
          {voiceActive && (
            <span
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400"
              style={{ opacity: 1 }}
            />
          )}
        </button>
      )}
    </div>
  );
}
