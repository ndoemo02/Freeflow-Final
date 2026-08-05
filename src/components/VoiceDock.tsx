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
import { Mic } from 'lucide-react';
import { useLiveUiSessionStore } from '../state/liveUiSession';

// ── Typy ──

type DockState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'error';

interface VoiceDockProps {
  onMicClick?: () => void;
  onTextSubmit?: (value: string) => boolean | void | Promise<boolean | void>;
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  error?: string | null;
}

// ── Poola stanów ──

function toDockState(raw: string): DockState {
  switch (raw) {
    case 'listening':
      return 'listening';
    case 'processing':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    case 'error':
      return 'error';
    case 'results_ready':
    case 'restaurant_selected':
    case 'item_selected':
    case 'cart_ready':
    case 'paused':
      return 'idle';
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
export const DOCK_PATH = 'M0,0.5 C0,0.19 0.02,0 0.09,0 C0.2,0 0.32,0.035 0.5,0.035 C0.68,0.035 0.8,0 0.91,0 C0.98,0 1,0.19 1,0.5 C1,0.81 0.98,1 0.91,1 C0.8,1 0.68,0.965 0.5,0.965 C0.32,0.965 0.2,1 0.09,1 C0.02,1 0,0.81 0,0.5 Z';

const WAVE_PRESETS = [
  { duration: '1.72s', delay: '-0.18s', blur: '0px', travel: '1.18' },
  { duration: '2.31s', delay: '-1.07s', blur: '0.5px', travel: '1.32' },
  { duration: '2.83s', delay: '-0.64s', blur: '1.2px', travel: '1.48' },
  { duration: '3.37s', delay: '-2.12s', blur: '2px', travel: '1.62' },
] as const;

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
        <path d="${DOCK_PATH}"/>
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
    .ff-voice-dock[data-state="idle"]      { --left: 0; --right: 0; --thinking: 0; }
    .ff-voice-dock[data-state="listening"] { --left: 1; --right: 0; --thinking: 0; }
    .ff-voice-dock[data-state="speaking"]  { --left: 0; --right: 1; --thinking: 0; }
    .ff-voice-dock[data-state="thinking"]  { --left: 0; --right: 0; --thinking: 1; }
    .ff-voice-dock[data-state="error"]     { --left: 0; --right: 0; --thinking: 1; }

    .ff-voice-dock.confirm {
      --ff-dock-confirm: 1;
      transition: --ff-dock-confirm 0ms;
    }
  `;
  document.head.appendChild(style);
}

// ── Komponent ──

export default function VoiceDock({
  onMicClick,
  onTextSubmit,
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  error = null,
}: VoiceDockProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSubmittingText, setIsSubmittingText] = useState(false);

  // Store — trzy punkty
  const sessionState = useLiveUiSessionStore((s) => s.sessionState);
  const userTx = useLiveUiSessionStore((s) => s.lastUserTranscript);
  const asstTx = useLiveUiSessionStore((s) => s.lastAssistantTranscript);

  const dockState: DockState = error
    ? 'error'
    : isThinking
      ? 'thinking'
      : isSpeaking
        ? 'speaking'
        : isListening
          ? 'listening'
          : toDockState(sessionState);
  const statusLabel = dockState === 'error'
    ? 'Awaria · tryb zapasowy'
    : dockState === 'thinking'
      ? 'Amber pracuje'
      : dockState === 'speaking'
      ? 'Amber odpowiada'
      : dockState === 'listening'
          ? 'Nasłuch aktywny'
          : 'Gotowa';

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

  const submit = async () => {
    if (!hasText || isSubmittingText || !onTextSubmit) return;
    const submittedValue = inputValue;
    setIsSubmittingText(true);
    try {
      const accepted = await onTextSubmit(submittedValue);
      if (accepted !== false) {
        setInputValue((current) => current === submittedValue ? '' : current);
      }
    } catch (submitError) {
      console.warn('[VoiceDock] Text submit failed; retaining input.', submitError);
    } finally {
      setIsSubmittingText(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (hasText) {
      void submit();
    } else {
      onMicClick?.();
    }
  };

  const inputPlaceholder =
    dockState === 'listening'
      ? 'Mów naturalnie…'
      : dockState === 'thinking'
        ? 'Szukam najlepszego dopasowania…'
        : dockState === 'speaking'
          ? 'Możesz wejść w słowo…'
          : dockState === 'error'
            ? 'Spróbuj ponownie lub wpisz wiadomość…'
            : 'Szybki lunch? Obiad na mieście? Kolacja dla dwojga?';

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
        style={{ '--level': dockState === 'listening' || dockState === 'speaking' ? 0.72 : dockState === 'thinking' ? 0.42 : 0 } as React.CSSProperties}
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
            <linearGradient id="ff-rim-grad-thinking" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#a855f7"/>
              <stop offset="0.5" stopColor="#7c3aed"/>
              <stop offset="1" stopColor="#c084fc"/>
            </linearGradient>
          </defs>
          <path
            className="ff-voice-dock__rim"
            pathLength="1"
            d={DOCK_PATH}
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
            <span className="ff-voice-dock__rings" aria-hidden="true" data-wave-count={WAVE_PRESETS.length}>
              {WAVE_PRESETS.map((wave, index) => (
                <span
                  key={index}
                  style={{
                    '--wave-duration': wave.duration,
                    '--wave-delay': wave.delay,
                    '--wave-blur': wave.blur,
                    '--wave-travel': wave.travel,
                  } as React.CSSProperties}
                />
              ))}
            </span>
            <img
              src="/logo/Logo%20Affinity/ff-speaker-2x.png"
              alt=""
              aria-hidden="true"
              className="ff-voice-dock__speaker-icon"
              width="32"
              height="32"
            />
          </button>

          {/* Center — transcript + input */}
          <div className="ff-voice-dock__inner" onClick={handleInnerClick} role="button" tabIndex={-1}>
            <div className="ff-voice-dock__status" role="status" aria-live="polite">
              <span className="ff-voice-dock__status-dot" aria-hidden="true" />
              <span>{statusLabel}</span>
            </div>
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
                onClick={() => { void submit(); }}
                className="ff-voice-dock__send"
                aria-label="Wyślij"
                disabled={isSubmittingText}
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
                <Mic className="ff-voice-dock__mic-icon" aria-hidden="true" strokeWidth={1.7} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
