/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IntentChips from './IntentChips';

describe('IntentChips', () => {
  it('communicates the grounded state accessibly', () => {
    render(
      <IntentChips response={{
        events: [{
          type: 'parser_chips',
          confidence: 'deterministic',
          chips: [{
            id: 'gluten_free',
            emoji: 'GF',
            labelPl: 'Bez glutenu',
            dimension: 'dietary',
          }],
        }],
        restaurants: [{
          discovery_filter_feedback: [{
            id: 'gluten_free',
            dimension: 'dietary',
            state: 'verified',
          }],
        }],
      }} />,
    );

    expect(screen.getByLabelText('Rozpoznane kryteria wyszukiwania')).toBeInTheDocument();
    expect(screen.getByText('Bez glutenu').closest('.ff-intent-chip')).toHaveAttribute(
      'data-state',
      'verified',
    );
    expect(screen.getByText('Potwierdzone w menu')).toBeInTheDocument();
  });
});
