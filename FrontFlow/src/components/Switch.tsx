import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

type Props = {
  onToggle?: (checked: boolean) => void
  initial?: boolean
  amberReady?: boolean
}

export default function Switch({ onToggle, initial = false, amberReady = true }: Props) {
  const [checked, setChecked] = useState<boolean>(initial)
  const switchBodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const updateDockCenter = () => {
      const el = switchBodyRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      document.documentElement.style.setProperty("--voice-dock-center", `${center}px`)
    }

    updateDockCenter()
    window.addEventListener('resize', updateDockCenter)
    return () => window.removeEventListener('resize', updateDockCenter)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const el = switchBodyRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const center = rect.top + rect.height / 2
    document.documentElement.style.setProperty("--voice-dock-center", `${center}px`)
  }, [checked])

  return (
    <Wrapper $amberReady={amberReady}>
      <div className="vertical-switch" ref={switchBodyRef}>
        <input
          type="checkbox"
          className="switch-input"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked)
            onToggle?.(e.target.checked)
          }}
          aria-label="Toggle voice/tiles"
        />

        {/* Kulka na górze */}
        <div className="switch-knob" />

        {/* Pasek */}
        <div className="switch-track" />

        {/* Podstawa na dole */}
        <div className="switch-base">
          <div className="switch-base-inner" />
        </div>
      </div>
    </Wrapper>
  )
}

const Wrapper = styled.div<{ $amberReady: boolean }>`
  position: fixed;
  left: clamp(12px, 3vw, 20px);
  bottom: clamp(1rem, 3vh, 1.5rem);
  z-index: 1000;

  .vertical-switch {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }
  
  .switch-input {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 2.5em;
    height: 2.5em;
    opacity: 0;
    cursor: pointer;
    z-index: 10;
  }
  
  /* Kulka z kolorem Amber status */
  .switch-knob {
    width: clamp(1.5em, 4vw, 2em);
    height: clamp(1.5em, 4vw, 2em);
    border-radius: 50%;
    background-image: ${props => props.$amberReady
    ? 'radial-gradient(farthest-corner at 70% 30%, #00ff77 4%, #00cc55 12% 24%, #009944 50% 65%, #00ff77 75%)'
    : 'radial-gradient(farthest-corner at 70% 30%, #ff4444 4%, #cc2222 12% 24%, #aa0000 50% 65%, #ff4444 75%)'
  };
    box-shadow: ${props => props.$amberReady
    ? '0 0 15px rgba(0, 255, 119, 0.6), inset 0 0 8px 2px rgb(255 255 255 / .4)'
    : '0 0 15px rgba(255, 68, 68, 0.6), inset 0 0 8px 2px rgb(255 255 255 / .4)'
  };
    transition: all 0.3s cubic-bezier(.65, 1.35, .5, 1);
    position: relative;
    z-index: 2;
  }
  
  .switch-input:hover ~ .switch-knob {
    transform: scale(1.1);
    filter: brightness(1.2);
  }
  
  /* Pasek pionowy */
  .switch-track {
    width: 0.4em;
    height: clamp(2.5em, 6vh, 3.5em);
    background: linear-gradient(to bottom,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0.1) 100%
    );
    border-radius: 0.2em;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
    margin-top: -0.2em;
    margin-bottom: -0.2em;
    position: relative;
    z-index: 1;
    transition: all 0.3s ease;
  }
  
  .switch-input:checked ~ .switch-track {
    background: linear-gradient(to bottom,
      rgba(0, 200, 255, 0.3) 0%,
      rgba(0, 200, 255, 0.15) 50%,
      rgba(0, 200, 255, 0.3) 100%
    );
  }
  
  /* Podstawa */
  .switch-base {
    position: relative;
    border-radius: 50%;
    padding: 0.25em;
    width: 1.2em;
    height: 1.2em;
    background-color: #222222;
    background-image: linear-gradient(to bottom, #444444, #222222);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .switch-base-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-image: linear-gradient(to bottom, #1f1f1f, #0f0f0f);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    position: relative;
    overflow: hidden;
  }
  
  .switch-base-inner::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    background-image: linear-gradient(to bottom, #00cfb6, #00a5bf);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .switch-input:checked ~ .switch-base .switch-base-inner::after {
    opacity: 1;
  }
  
  /* Mobile adjustments */
  @media (max-width: 768px) {
    left: 10px;
    bottom: 1rem;
    
    .switch-knob {
      width: 1.5em;
      height: 1.5em;
    }
    
    .switch-track {
      height: 2.5em;
    }
  }
  
  @media (max-width: 480px) {
    left: 8px;
    bottom: 0.85rem;
    
    .switch-knob {
      width: 1.3em;
      height: 1.3em;
    }
    
    .switch-track {
      height: 2em;
      width: 0.35em;
    }
    
    .switch-base {
      width: 1em;
      height: 1em;
    }
  }
  
  @media (max-width: 360px) {
    left: 6px;
    bottom: 0.75rem;
    
    .switch-knob {
      width: 1.2em;
      height: 1.2em;
    }
    
    .switch-track {
      height: 1.8em;
    }
  }
`
