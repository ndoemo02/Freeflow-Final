/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import VoiceDock from './VoiceDock';
import { useLiveUiSessionStore } from '../state/liveUiSession';

beforeEach(() => {
  // Reset store przed każdym testem
  useLiveUiSessionStore.getState().setIdle();
});

describe('VoiceDock', () => {
  it('renders dock with input placeholder by default', () => {
    render(<VoiceDock />);
    expect(
      screen.getByPlaceholderText(/napisz lub powiedz/i),
    ).toBeInTheDocument();
  });

  it('shows listening placeholder when session state is listening', () => {
    useLiveUiSessionStore.getState().setListening();
    render(<VoiceDock />);
    expect(screen.getByPlaceholderText(/słucham/i)).toBeInTheDocument();
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

    useLiveUiSessionStore.getState().setListening();
    rerender(<VoiceDock />);
    expect(dock).toHaveAttribute('data-state', 'listening');
  });
});
