import { useState, useEffect } from "react";
import styles from "./VoiceInputBar.module.css";

interface VoiceInputBarProps {
    value: string;
    onChange: (value: string) => void;
    onSend: (message: string) => void;
    onMicClick: () => void;
    isRecording?: boolean;
    placeholder?: string;
}

export default function VoiceInputBar({
    value,
    onChange,
    onSend,
    onMicClick,
    isRecording = false,
    placeholder = "Napisz wiadomość...",
}: VoiceInputBarProps) {
    // Określ tryb przycisku: mic lub send
    const mode = (value.trim().length > 0 || isRecording) ? "send" : "mic";

    const handleButtonClick = () => {
        if (mode === "send") {
            if (value.trim()) {
                onSend(value);
            }
        } else {
            onMicClick();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && value.trim()) {
            onSend(value);
        }
    };

    return (
        <div className={styles.voiceInputBar}>
            {/* Avatar / Status po lewej (opcjonalny) */}
            <div className={styles.avatar}>
                <div className={styles.avatarCircle}>
                    <span className={styles.avatarIcon}>🎤</span>
                </div>
            </div>

            {/* Pole tekstowe (środek) */}
            <input
                type="text"
                className={styles.input}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
            />

            {/* Inteligentny przycisk (prawa strona) */}
            <button
                className={`${styles.actionButton} ${styles[mode]} ${isRecording ? styles.recording : ""
                    }`}
                onClick={handleButtonClick}
                aria-label={mode === "mic" ? "Rozpocznij nagrywanie" : "Wyślij wiadomość"}
            >
                {/* Ikona mikrofonu */}
                <svg
                    className={`${styles.icon} ${styles.micIcon}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z"
                        fill="currentColor"
                    />
                    <path
                        d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z"
                        fill="currentColor"
                    />
                </svg>

                {/* Ikona wysyłki (papierowy samolot) */}
                <svg
                    className={`${styles.icon} ${styles.sendIcon}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
                        fill="currentColor"
                    />
                </svg>

                {/* Pulsujący efekt podczas nagrywania */}
                {isRecording && <div className={styles.recordingPulse} />}
            </button>
        </div>
    );
}
