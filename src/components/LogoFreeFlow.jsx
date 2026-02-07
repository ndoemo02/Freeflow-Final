import React from "react";
import styled from "styled-components";

// Usunięto animacje (scan, cut) na prośbę użytkownika
// Zostawiono statyczne podkreślenie

const LoaderWrapper = styled.div`
  max-width: fit-content;
  position: relative;
  font-family: "Poppins", sans-serif;
  font-size: 2rem;
  font-weight: 700;
  font-style: italic;
  display: flex;
  flex-direction: column;
  align-items: center;

  /* ===== Animacja Letter Reveal przy załadowaniu ===== */
  @keyframes letterReveal {
    0% {
      opacity: 0;
      transform: translateY(10px) scale(0.9);
      filter: blur(4px);
    }
    60% {
      opacity: 1;
      transform: translateY(-2px) scale(1.02);
      filter: blur(0);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  /* ===== Animacja Glow Pulse (cykliczna) ===== */
  @keyframes brandGlowFree {
    0%, 100% { 
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
      filter: brightness(1);
    }
    50% { 
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.9), 0 0 40px rgba(255, 255, 255, 0.4);
      filter: brightness(1.15);
    }
  }

  @keyframes brandGlowFlow {
    0%, 100% { 
      text-shadow: 0 0 10px rgba(255, 123, 0, 0.4);
      filter: brightness(1);
    }
    50% { 
      text-shadow: 0 0 25px rgba(255, 123, 0, 0.9), 0 0 50px rgba(255, 123, 0, 0.5);
      filter: brightness(1.2);
    }
  }

  .logo-main {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Kontenery dla poszczególnych słów - potrzebne żeby miały własne ::before/::after */
  .word-wrapper {
    position: relative;
    display: inline-block;
  }

  /* FREE - Letter reveal + subtle white glow */
  .free {
    color: #f2fff0;       
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
    display: inline-block;
    animation: 
      letterReveal 0.8s ease-out forwards,
      brandGlowFree 4s ease-in-out 1s infinite;
  }

  /* FLOW - Letter reveal (delayed) + orange glow pulse */
  .flow {
    color: #ff7b00;
    text-shadow: 0 0 10px rgba(255, 123, 0, 0.4);
    display: inline-block;
    animation: 
      letterReveal 0.8s ease-out 0.3s forwards,
      brandGlowFlow 3s ease-in-out 1.3s infinite;
    opacity: 0; /* Start hidden for reveal animation */
  }

  /* Statyczne podkreślenie dla FREE (na dole) */
  .word-wrapper.free-wrap::before {
    position: absolute;
    content: "";
    width: 100%;
    height: 3px;
    background-color: #ff7b00; /* Orange FreeFlow */
    bottom: 2px; /* Przybliżone */
    left: 0;
    z-index: 1;
    box-shadow: 0 0 10px rgba(255, 123, 0, 0.5);
  }

  /* Statyczne nadkreślenie dla FLOW (na górze) */
  .word-wrapper.flow-wrap::before {
    position: absolute;
    content: "";
    width: 100%;
    height: 3px;
    background-color: #f2fff0; /* Biały */
    top: 0px; /* Przybliżone */
    left: 0;
    z-index: 1;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }

  .subtitle {
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--muted, #9ca3af);
    letter-spacing: 2px;
    margin-top: -5px;
    text-transform: uppercase;
  }
`;

export default function LogoFreeFlow() {
  return (
    <LoaderWrapper className="loader">
      <div className="logo-main">
        <div className="word-wrapper free-wrap">
          <span className="free">Free</span>
        </div>
        <div className="word-wrapper flow-wrap">
          <span className="flow">Flow</span>
        </div>
      </div>
    </LoaderWrapper>
  );
}
