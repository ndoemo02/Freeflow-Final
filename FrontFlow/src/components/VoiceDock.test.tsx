import { render, screen } from "@testing-library/react";
import VoiceDock from "./VoiceDock";

describe("VoiceDock", () => {
  it("renders dock", () => {
    render(
      <VoiceDock
        messages={[]}               // pusta lista
        value=""                    // pusty input
        onChange={() => {}}         // fake handler
        onSubmit={() => {}}         // fake handler
        recording={false}           // mikrofon wyłączony
        onMicClick={() => {}}       // fake handler
      />
    );

    // sprawdzamy czy placeholder inputu istnieje
    expect(screen.getByPlaceholderText(/Powiedz lub wpisz/i)).toBeInTheDocument();
  });
});
