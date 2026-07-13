import { describe, expect, it } from 'vitest';
import { composeLiveSystemInstruction } from './liveSystemInstruction';

describe('composeLiveSystemInstruction', () => {
  it('keeps base grounding rules when a custom style prompt is configured', () => {
    const instruction = composeLiveSystemInstruction({
      baseInstruction: 'BASE: korzystaj z narzędzi.',
      customStylePrompt: 'Mów ciepło i lokalnie.',
      gpsSafetyPrefix: 'Backend ma GPS.',
    });

    expect(instruction).toContain('BASE: korzystaj z narzędzi.');
    expect(instruction).toContain('Mów ciepło i lokalnie.');
    expect(instruction).toContain('PRAWDA MENU');
    expect(instruction).toContain('Nie wymyślaj produktu');
    expect(instruction).toContain('restauracji przypisanej do koszyka');
    expect(instruction).toContain('Nie proponuj osobnego zamówienia z innego lokalu');
    expect(instruction).toContain('Backend ma GPS.');
  });
});
