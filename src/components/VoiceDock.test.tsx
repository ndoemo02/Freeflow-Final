/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import VoiceDock from './VoiceDock';

describe('VoiceDock', () => {
  it('renders dock with placeholder', () => {
    render(
      <VoiceDock
        recording={false}
        onMicClick={() => {}}
        onTextSubmit={() => {}}
        visible
      />,
    );

    expect(screen.getByPlaceholderText(/napisz lub powiedz/i)).toBeInTheDocument();
  });

  it('shows listening placeholder when recording', () => {
    render(
      <VoiceDock
        recording
        onMicClick={() => {}}
        visible
      />,
    );

    expect(screen.getByPlaceholderText(/słucham/i)).toBeInTheDocument();
  });

  it('hides idle and technical status text from the user-facing transcript line', () => {
    render(
      <VoiceDock
        recording={false}
        liveUiState="idle"
        liveStatusText="Gotowe."
        amberResponse="[InteractionBridge] tool_call session=abc"
        visible
      />,
    );

    expect(screen.queryByText(/gotowe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/interactionbridge/i)).not.toBeInTheDocument();
  });

  it('keeps natural assistant text visible', () => {
    render(
      <VoiceDock
        recording={false}
        amberResponse="Jasne, dodaje burgera do koszyka."
        visible
      />,
    );

    expect(screen.getByText(/dodaje burgera/i)).toBeInTheDocument();
  });

  it('prefers live user transcript while listening even if an older assistant transcript exists', () => {
    render(
      <VoiceDock
        recording
        liveUiState="listening"
        liveUserTranscript="Szukam lodow w Piekarach Slaskich"
        liveAssistantTranscript="W poblizu znalazlam piekarnie."
        visible
      />,
    );

    expect(screen.getByText(/szukam lodow/i)).toBeInTheDocument();
    expect(screen.queryByText(/piekarnie/i)).not.toBeInTheDocument();
  });

  it('shows the accumulated assistant transcript once results are ready', () => {
    render(
      <VoiceDock
        recording={false}
        liveUiState="results_ready"
        liveAssistantTranscript="W poblizu znalazlam 2 miejsca z deserami. Ktora wybierasz?"
        visible
      />,
    );

    expect(screen.getByText(/2 miejsca z deserami/i)).toBeInTheDocument();
  });
});
