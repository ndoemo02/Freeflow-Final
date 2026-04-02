import { render, screen } from "@testing-library/react";
import VoiceDock from "./VoiceDock";

describe("VoiceDock", () => {
  it("renders dock with placeholder", () => {
    render(
      <VoiceDock
        recording={false}
        onMicClick={() => {}}
        onTextSubmit={() => {}}
        visible={true}
      />
    );

    expect(screen.getByPlaceholderText(/napisz lub powiedz/i)).toBeInTheDocument();
  });

  it("shows listening placeholder when recording", () => {
    render(
      <VoiceDock
        recording={true}
        onMicClick={() => {}}
        visible={true}
      />
    );

    expect(screen.getByPlaceholderText(/słucham/i)).toBeInTheDocument();
  });
});
