import { render, screen } from '@testing-library/react';
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

    expect(screen.getByPlaceholderText('Słucham...')).toBeInTheDocument();
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
});
