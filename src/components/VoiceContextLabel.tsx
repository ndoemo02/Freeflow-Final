import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getVoiceContextLabel, VoiceContext } from '../lib/voiceContext';

interface VoiceContextLabelProps {
  context: VoiceContext;
  className?: string;
}

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  return reduceMotion;
}

export default function VoiceContextLabel({ context, className = '' }: VoiceContextLabelProps) {
  const reduceMotion = usePrefersReducedMotion();
  const changingWord = getVoiceContextLabel(context);

  return (
    <div
      className={`voice-context-label ${className}`.trim()}
      data-voice-context={context}
      aria-label={`Voice to ${changingWord}`}
    >
      <span className="voice-context-label__prefix" aria-hidden="true">Voice to</span>
      <div className="voice-context-label__word" aria-hidden="true">
        <motion.div
          key={changingWord}
          className="voice-context-label__word-motion"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {changingWord}
        </motion.div>
      </div>
    </div>
  );
}
