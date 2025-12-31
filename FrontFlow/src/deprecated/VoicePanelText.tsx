import React, { useState, KeyboardEvent } from "react"
import styled, { keyframes, css } from "styled-components"

type Props = {
  amberResponse?: string
  interimText?: string
  finalText?: string
  recording?: boolean
  visible?: boolean
  onMicClick?: () => void
  onSubmitText?: (value: string) => void
}

export default function VoicePanelText({
  amberResponse = "",
  interimText = "",
  finalText = "",
  recording = false,
  visible = false,
  onMicClick,
  onSubmitText,
}: Props) {
  const trimmedFinal = finalText?.trim() ?? ""
  const trimmedInterim = interimText?.trim() ?? ""
  const displayText = amberResponse || trimmedFinal || trimmedInterim || "Transkrypcja..."
  const isActive = visible
  const [manualText, setManualText] = useState("")

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const value = manualText.trim()
      if (!value) return
      onSubmitText?.(value)
      setManualText("")
    }
  }

  return (
    <BarShell>
      <BarSurface $active={isActive}>
        <Glow />
        <Pill>
          <PillText aria-live="polite">
            <TextInput
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={displayText}
            />
          </PillText>
          <MicIcon
            type="button"
            onClick={onMicClick}
            $recording={recording}
            $active={isActive}
          >
            <span />
          </MicIcon>
        </Pill>
      </BarSurface>
    </BarShell>
  )
}

const BarShell = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  top: calc(var(--voice-dock-center, 90vh) - 29px);
  z-index: 60;
  display: flex;
  justify-content: center;
  pointer-events: none;
  padding: 0 12px;
  transition: top 0.35s ease;
`

const BarSurface = styled.div<{ $active: boolean }>`
  width: min(420px, 80vw);
  position: relative;
  pointer-events: ${props => (props.$active ? "auto" : "none")};
  opacity: ${props => (props.$active ? 1 : 0)};
  transform: translateY(${props => (props.$active ? "0" : "36px")});
  transition: opacity 0.35s ease, transform 0.55s cubic-bezier(0.19, 1, 0.22, 1);

  @media (max-width: 520px) {
    width: min(360px, 92vw);
  }
`

const glowShift = keyframes`
  0% { opacity: 0.55; transform: translateY(0); filter: blur(12px); }
  50% { opacity: 0.95; transform: translateY(-4px); filter: blur(18px); }
  100% { opacity: 0.55; transform: translateY(0); filter: blur(12px); }
`

const Glow = styled.div`
  position: absolute;
  inset: -18px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.7), transparent 60%),
    radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.7), transparent 65%);
  filter: blur(14px);
  opacity: 0.8;
  pointer-events: none;
  animation: ${glowShift} 3s ease-in-out infinite;
`

const Pill = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 20px;
  height: 58px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(0, 255, 213, 0.9);
  box-shadow: 0 0 20px rgba(0, 255, 213, 0.4);
`

const PillText = styled.div`
  flex: 1;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TextInput = styled.input`
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  padding: 0;

  &::placeholder {
    color: rgba(148, 163, 184, 0.9);
  }

  @media (max-width: 520px) {
    font-size: 0.9rem;
  }
`

const micPulse = keyframes`
  0% { box-shadow: 0 0 15px rgba(0, 255, 213, 0.5); transform: scale(1); }
  50% { box-shadow: 0 0 25px rgba(0, 255, 213, 0.9); transform: scale(1.08); }
  100% { box-shadow: 0 0 15px rgba(0, 255, 213, 0.5); transform: scale(1); }
`

const micGlow = keyframes`
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
`

const MicIcon = styled.button<{ $recording: boolean; $active: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(145deg, rgba(0, 255, 213, 0.95), rgba(0, 180, 255, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
  box-shadow: 0 0 18px rgba(0, 255, 213, 0.45);

  span {
    width: 16px;
    height: 20px;
    border-radius: 8px;
    background: #001d26;
    position: relative;
  }

  span::after {
    content: "";
    position: absolute;
    width: 10px;
    height: 6px;
    border: 2px solid #001d26;
    border-top: none;
    border-radius: 0 0 10px 10px;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
  }

  ${({ $recording }) =>
    $recording &&
    css`
      animation: ${micPulse} 1.5s ease-in-out infinite;
    `}

  ${({ $active, $recording }) =>
    $active &&
    !$recording &&
    css`
      animation: ${micGlow} 1.8s ease-in-out infinite;
    `}

  &:hover {
    transform: scale(1.05);
  }
`
