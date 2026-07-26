/* @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LaunchSequence from './LaunchSequence';

afterEach(() => {
  vi.useRealTimers();
});

describe('LaunchSequence', () => {
  it('holds the app behind the disclosure until the user accepts it', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(<LaunchSequence onComplete={onComplete} />);

    expect(screen.getByText('Lokalnie.')).toBeInTheDocument();
    expect(screen.getByRole('heading', {
      name: 'Wersja demonstracyjna',
    })).toBeInTheDocument();
    expect(screen.getByText(
      /Lokale i menu są fikcyjne, ale wszystkie rekomendacje/,
    )).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Rozumiem — uruchom demo',
    })).toHaveFocus();
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('completes after the acceptance transition and never completes twice', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(<LaunchSequence onComplete={onComplete} />);
    const action = screen.getByRole('button', {
      name: 'Rozumiem — uruchom demo',
    });
    fireEvent.click(action);
    fireEvent.click(action);

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(360);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('uses a short static handoff when reduced motion is requested', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    const { container } = render(<LaunchSequence onComplete={onComplete} />);
    expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'true');
    fireEvent.click(screen.getByRole('button', {
      name: 'Rozumiem — uruchom demo',
    }));

    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  });
});
