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

  /* Kolory marki - STATYCZNE */
  .free {
    color: #f2fff0;       
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
    display: inline-block;
  }

  .flow {
    color: #ff7b00;
    text-shadow: 0 0 10px rgba(255, 123, 0, 0.4);
    display: inline-block;
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
      <div className="subtitle">Voice to order</div>
    </LoaderWrapper>
  );
}
