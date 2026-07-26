import { useCallback, useEffect, useRef, useState } from 'react';
import './LaunchSequence.css';

interface LaunchSequenceProps {
  onComplete: () => void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function LaunchSequence({ onComplete }: LaunchSequenceProps) {
  const completedRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = prefersReducedMotion();
  const [leaving, setLeaving] = useState(false);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setLeaving(true);
    exitTimerRef.current = window.setTimeout(
      onComplete,
      reducedMotion ? 80 : 360,
    );
  }, [onComplete, reducedMotion]);

  useEffect(() => {
    actionRef.current?.focus({ preventScroll: true });
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  return (
    <section
      className={`ff-launch${leaving ? ' ff-launch--leaving' : ''}`}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ff-launch-title"
      aria-describedby="ff-launch-description"
    >
      <div className="ff-launch__atmosphere" aria-hidden="true">
        <span className="ff-launch__orb ff-launch__orb--cyan" />
        <span className="ff-launch__orb ff-launch__orb--amber" />
        <span className="ff-launch__horizon" />
      </div>

      <div className="ff-launch__content">
        <p className="ff-launch__wordmark" aria-hidden="true">
          Lokalnie.
        </p>

        <div className="ff-launch__disclosure">
          <p className="ff-launch__eyebrow">FreeFlow</p>
          <h1 id="ff-launch-title" className="ff-launch__title">
            Wersja demonstracyjna
          </h1>
          <p id="ff-launch-description" className="ff-launch__description">
            Lokale i menu są fikcyjne, ale wszystkie rekomendacje opieram
            wyłącznie na danych widocznych w aplikacji.
          </p>
          <button
            ref={actionRef}
            className="ff-launch__action"
            type="button"
            onClick={complete}
          >
            Rozumiem — uruchom demo
          </button>
        </div>
      </div>
    </section>
  );
}
