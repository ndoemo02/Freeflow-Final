import { describe, expect, it } from 'vitest';
import {
  buildDemoGuideInstruction,
  composeLiveSystemInstruction,
} from './liveSystemInstruction';

describe('composeLiveSystemInstruction', () => {
  it('keeps base grounding rules when a custom style prompt is configured', () => {
    const instruction = composeLiveSystemInstruction({
      baseInstruction: 'BASE: korzystaj z narzędzi.',
      customStylePrompt: 'Mów ciepło i lokalnie.',
      gpsSafetyPrefix: 'Backend ma GPS.',
      demoContext: {
        scenario_id: 'krakow-tourist',
        preferred_locale: 'pl',
      },
    });

    expect(instruction).toContain('BASE: korzystaj z narzędzi.');
    expect(instruction).toContain('Mów ciepło i lokalnie.');
    expect(instruction).toContain('PRAWDA MENU');
    expect(instruction).toContain('nie ogólnym chatbotem');
    expect(instruction).toContain('query "pizza"');
    expect(instruction).toContain('Nie wymyślaj produktu');
    expect(instruction).toContain('restauracji przypisanej do koszyka');
    expect(instruction).toContain('Nie proponuj osobnego zamówienia z innego lokalu');
    expect(instruction).toContain('demonstracyjnym katalogu Krakowa');
    expect(instruction).toContain('odpowiedz od razu po angielsku');
    expect(instruction).toContain('Zmiana języka nigdy nie zmienia miasta');
    expect(instruction).toContain('Backend ma GPS.');
  });

  it('keeps language independent from the selected city scenario', () => {
    const instruction = buildDemoGuideInstruction({
      scenario_id: 'piekary-local',
      preferred_locale: 'en',
    });

    expect(instruction).toContain('Piekar Śląskich');
    expect(instruction).toContain('JĘZYK STARTOWY: angielski');
    expect(instruction).toContain('gdy wraca do polskiego');
  });

  it('forbids naming dishes when a tool returned restaurant cards only', () => {
    const instruction = composeLiveSystemInstruction({
      baseInstruction: 'BASE',
    });

    expect(instruction).toContain('wynik zawiera tylko lokale');
    expect(instruction).toContain('nie wymieniaj konkretnych dań');
    expect(instruction).toContain('alergeny');
    expect(instruction).toContain('PYTANIE TO NIE ZAMÓWIENIE');
    expect(instruction).toContain('Samo wymienienie nazwy pozycji nie jest zgodą');
  });
});
