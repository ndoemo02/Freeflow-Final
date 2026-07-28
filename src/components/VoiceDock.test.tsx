/* @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import VoiceDock from './VoiceDock';
import { useLiveUiSessionStore } from '../state/liveUiSession';

beforeEach(() => {
  // Reset store przed każdym testem
  useLiveUiSessionStore.getState().setIdle();
});

describe('VoiceDock', () => {
  it('renders dock with input placeholder by default', () => {
    const { container } = render(<VoiceDock />);
    expect(
      screen.getByPlaceholderText(/szybki lunch.*obiad na mieście.*kolacja dla dwojga/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Gotowa')).toBeInTheDocument();
    expect(container.querySelector('.ff-voice-dock__speaker-icon')).toHaveAttribute(
      'src',
      '/logo/Logo%20Affinity/ff-speaker-2x.png',
    );
  });

  it('shows listening placeholder when session state is listening', () => {
    useLiveUiSessionStore.getState().setListening();
    render(<VoiceDock />);
    expect(screen.getByText(/nasłuch aktywny/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mów naturalnie/i)).toBeInTheDocument();
  });

  it('uses four deterministic waves without requesting a second microphone stream', () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    useLiveUiSessionStore.getState().setListening();
    const { container } = render(<VoiceDock />);

    expect(container.querySelectorAll('.ff-voice-dock__rings > span')).toHaveLength(4);
    expect(container.querySelector('.ff-voice-dock__rings')).toHaveAttribute('data-wave-count', '4');
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('shows user transcript when listening', () => {
    useLiveUiSessionStore.getState().setListening();
    useLiveUiSessionStore.getState().setTranscript(
      'user',
      'Szukam lodow w Piekarach',
    );
    render(<VoiceDock />);
    expect(screen.getByText(/szukam lodow/i)).toBeInTheDocument();
  });

  it('shows assistant transcript after results are ready', () => {
    // Symuluj results_ready
    useLiveUiSessionStore
      .getState()
      .setSessionState('results_ready', { statusText: 'Gotowe.' });
    useLiveUiSessionStore.getState().setTranscript(
      'assistant',
      'W poblizu znalazlam 2 miejsca z deserami.',
    );
    render(<VoiceDock />);
    expect(
      screen.getByText(/2 miejsca z deserami/i),
    ).toBeInTheDocument();
  });

  it('strips markdown ** from transcript', () => {
    useLiveUiSessionStore
      .getState()
      .setSessionState('results_ready', { statusText: '' });
    useLiveUiSessionStore.getState().setTranscript(
      'assistant',
      'Znajduje **2 restauracje** w okolicy.',
    );
    render(<VoiceDock />);
    expect(
      screen.getByText(/znajduje 2 restauracje w okolicy/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\*\*/i)).not.toBeInTheDocument();
  });

  it('hides technical noise from transcript', () => {
    useLiveUiSessionStore
      .getState()
      .setSessionState('results_ready', { statusText: '' });
    useLiveUiSessionStore.getState().setTranscript(
      'assistant',
      '[tool_call] sessionId=abc',
    );
    render(<VoiceDock />);
    expect(
      screen.queryByText(/tool_call/i),
    ).not.toBeInTheDocument();
  });

  it('has data-state attribute reflecting dock state', () => {
    const { container, rerender } = render(<VoiceDock />);
    const dock = container.querySelector('.ff-voice-dock');
    expect(dock).toHaveAttribute('data-state', 'idle');

    act(() => {
      useLiveUiSessionStore.getState().setListening();
      rerender(<VoiceDock />);
    });
    expect(dock).toHaveAttribute('data-state', 'listening');
  });

  it('shows a solid processing state with an explicit label', () => {
    const { container } = render(<VoiceDock isThinking />);
    expect(container.querySelector('.ff-voice-dock')).toHaveAttribute('data-state', 'thinking');
    expect(screen.getByText('Amber pracuje')).toBeInTheDocument();
  });

  it('shows the fallback state only for an actual error', () => {
    const { container } = render(<VoiceDock error="live_token_unavailable" />);
    expect(container.querySelector('.ff-voice-dock')).toHaveAttribute('data-state', 'error');
    expect(screen.getByText(/awaria.*tryb zapasowy/i)).toBeInTheDocument();
  });
});
