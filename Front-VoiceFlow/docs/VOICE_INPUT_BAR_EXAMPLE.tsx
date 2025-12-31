/**
 * PRZYKŁAD UŻYCIA VoiceInputBar
 * 
 * Umieść ten kod w komponencie głównym (np. Home.tsx lub App.tsx)
 */

import { useState } from "react";
import VoiceInputBar from "./components/VoiceInputBar";
import RestaurantBackground from "./components/RestaurantBackground";

export default function HomePage() {
    const [message, setMessage] = useState("");
    const [isRecording, setIsRecording] = useState(false);

    const handleSend = (msg: string) => {
        console.log("Wysyłam wiadomość:", msg);
        // Tutaj wyślij wiadomość do backendu/API
        setMessage(""); // Wyczyść pole po wysłaniu
    };

    const handleMicClick = () => {
        console.log("Rozpoczynam nagrywanie...");
        setIsRecording(true);

        // Symulacja nagrywania (3 sekundy)
        setTimeout(() => {
            setIsRecording(false);
            console.log("Nagrywanie zakończone");
        }, 3000);
    };

    return (
        <div style={{ position: "relative", minHeight: "100vh" }}>
            {/* Tło restauracji z 3D kieliszkiem */}
            <RestaurantBackground />

            {/* Główna treść strony */}
            <main style={{
                position: "relative",
                zIndex: 10,
                paddingBottom: "120px" // Miejsce dla VoiceInputBar na dole
            }}>
                {/* Tutaj reszta contentu (logo, menu, etc.) */}
                <h1 style={{ textAlign: "center", paddingTop: "50px", color: "white" }}>
                    Free Flow
                </h1>
            </main>

            {/* Voice Input Bar przyklejony do dołu */}
            <VoiceInputBar
                value={message}
                onChange={setMessage}
                onSend={handleSend}
                onMicClick={handleMicClick}
                isRecording={isRecording}
                placeholder="Napisz wiadomość lub nagraj głosem..."
            />
        </div>
    );
}
