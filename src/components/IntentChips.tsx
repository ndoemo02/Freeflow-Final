import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { derivePresentedTaxonomyChips } from '../lib/taxonomyPresentation';

interface IntentChipsProps {
  response?: unknown;
  maxVisible?: number;
}

const STATE_MARKERS = {
  recognized: '',
  verified: '✓',
  unknown: '?',
  no_match: '×',
  unresolved: '?',
} as const;

export default function IntentChips({ response, maxVisible = 3 }: IntentChipsProps) {
  const reduceMotion = useReducedMotion();
  const chips = useMemo(
    () => derivePresentedTaxonomyChips(response, maxVisible),
    [response, maxVisible],
  );

  return (
    <AnimatePresence initial={false}>
      {chips.length > 0 && (
        <motion.div
          className="ff-intent-chips"
          aria-label="Rozpoznane kryteria wyszukiwania"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
        >
          {chips.map((chip) => {
            const marker = STATE_MARKERS[chip.state];
            return (
              <motion.span
                layout={!reduceMotion}
                className="ff-intent-chip"
                data-state={chip.state}
                key={chip.id}
                title={`${chip.labelPl}: ${chip.stateLabel}`}
              >
                <span className="ff-intent-chip__emoji" aria-hidden="true">{chip.emoji}</span>
                <span className="ff-intent-chip__label">{chip.labelPl}</span>
                {marker && (
                  <span className="ff-intent-chip__state" aria-hidden="true">{marker}</span>
                )}
                <span className="sr-only">{chip.stateLabel}</span>
              </motion.span>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
