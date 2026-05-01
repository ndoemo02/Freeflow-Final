import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Chip {
  id: string;
  emoji: string;
  labelPl: string;
  dimension: 'topGroup' | 'category' | 'tag' | 'vibe' | 'dietary';
}

interface ParserChipsEvent {
  chips: Chip[];
  confidence: 'deterministic' | 'partial' | 'empty';
}

const CHIP_VISIBLE_MS = 8000;

export default function IntentChips() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChips = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as ParserChipsEvent;
    if (!detail?.chips?.length) return;

    setChips(detail.chips);
    setVisible(true);

    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setVisible(false), CHIP_VISIBLE_MS);
    setTimer(t);
  }, [timer]);

  useEffect(() => {
    window.addEventListener('freeflow:parserChips', handleChips);
    return () => {
      window.removeEventListener('freeflow:parserChips', handleChips);
      if (timer) clearTimeout(timer);
    };
  }, [handleChips, timer]);

  return (
    <AnimatePresence>
      {visible && chips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.3 } }}
          className="flex flex-wrap items-center justify-center gap-2 px-2"
        >
          {chips.map((chip) => (
            <motion.span
              key={chip.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 300 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                         bg-white/10 backdrop-blur-md border border-white/20 text-white/90
                         shadow-lg shadow-black/10"
            >
              <span className="text-base leading-none">{chip.emoji}</span>
              <span className="leading-none">{chip.labelPl}</span>
            </motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
