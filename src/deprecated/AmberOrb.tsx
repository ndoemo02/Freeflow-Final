import React from 'react';
import styled, { css } from 'styled-components';
import { AmberStatus } from '../types/amber';

// Mapa kolorów dla różnych statusów
const STATUS_COLORS = {
  idle: {
    one: '#9AA7C2', // szary
    two: '#54607A',
  },
  listening: {
    one: '#38BDF8', // błękitny neon
    two: '#2563EB',
  },
  thinking: {
    one: '#FBBF24', // bursztyn
    two: '#D97706',
  },
  speaking: {
    one: '#A855F7', // fiolet
    two: '#7C3AED',
  },
  presenting: {
    one: '#A855F7', // fiolet (tak samo jak speaking)
    two: '#7C3AED',
  },
  success: {
    one: '#4ADE80', // zielony
    two: '#16A34A',
  },
  error: {
    one: '#F87171', // czerwony
    two: '#DC2626',
  }
};

interface AmberOrbProps {
  status: AmberStatus;
  size?: number; // skalowanie, domyślnie 1
}

const AmberOrb: React.FC<AmberOrbProps> = ({ status, size = 1 }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.idle;

  return (
    <StyledWrapper
      $size={size}
      $colorOne={colors.one}
      $colorTwo={colors.two}
      className="amber-orb"
    >
      <div className="loader">
        <svg width={100} height={100} viewBox="0 0 100 100">
          <defs>
            <mask id="clipping">
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              <polygon points="25,25 75,25 50,75" fill="white" />
              <polygon points="50,25 75,75 25,75" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
            </mask>
          </defs>
        </svg>
        <div className="box" />
      </div>
    </StyledWrapper>
  );
};

// Styled components z obsługą props
const StyledWrapper = styled.div<{ $size: number; $colorOne: string; $colorTwo: string }>`
  .loader {
    --color-one: ${props => props.$colorOne};
    --color-two: ${props => props.$colorTwo};
    --color-three: ${props => `${props.$colorOne}80`};
    --color-four: ${props => `${props.$colorTwo}80`};
    --color-five: ${props => `${props.$colorOne}40`};
    
    --time-animation: 2s;
    --size: ${props => props.$size * 0.4}; /* Skalujemy w dół domyślnie bo oryginał jest ogromny (100px) */
    
    position: relative;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    transform: scale(var(--size));
    
    /* Subtelniejszy cień */
    /* box-shadow: 0 0 25px 0 var(--color-three); */
    
    transition: all 0.5s ease-in-out;
  }

  .loader::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border-top: solid 1px var(--color-one);
    border-bottom: solid 1px var(--color-two);
    background: linear-gradient(180deg, var(--color-five), var(--color-four));
    box-shadow:
      inset 0 10px 10px 0 var(--color-three),
      inset 0 -10px 10px 0 var(--color-four);
    
    transition: border-color 0.5s, background 0.5s;
  }

  .loader .box {
    width: 100px;
    height: 100px;
    background: linear-gradient(
      180deg,
      var(--color-one) 30%,
      var(--color-two) 70%
    );
    mask: url(#clipping);
    -webkit-mask: url(#clipping);
    transition: background 0.5s;
  }

  .loader svg {
    position: absolute;
    top: 0;
    left: 0;
  }

  .loader svg #clipping {
    filter: contrast(15);
    animation: roundness calc(var(--time-animation) / 2) linear infinite;
  }

  .loader svg #clipping polygon {
    filter: blur(7px);
  }

  /* Animacja rotacji wielokątów - zostawiamy oryginalną 'organiczną' choreografię */
  .loader svg #clipping polygon:nth-child(1) { transform-origin: 75% 25%; transform: rotate(90deg); }
  .loader svg #clipping polygon:nth-child(2) { transform-origin: 50% 50%; animation: rotation var(--time-animation) linear infinite reverse; }
  .loader svg #clipping polygon:nth-child(3) { transform-origin: 50% 60%; animation: rotation var(--time-animation) linear infinite; animation-delay: calc(var(--time-animation) / -3); }
  .loader svg #clipping polygon:nth-child(4) { transform-origin: 40% 40%; animation: rotation var(--time-animation) linear infinite reverse; }
  .loader svg #clipping polygon:nth-child(5) { transform-origin: 40% 40%; animation: rotation var(--time-animation) linear infinite reverse; animation-delay: calc(var(--time-animation) / -2); }
  .loader svg #clipping polygon:nth-child(6) { transform-origin: 60% 40%; animation: rotation var(--time-animation) linear infinite; }
  .loader svg #clipping polygon:nth-child(7) { transform-origin: 60% 40%; animation: rotation var(--time-animation) linear infinite; animation-delay: calc(var(--time-animation) / -1.5); }

  @keyframes rotation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes roundness {
    0% { filter: contrast(15); }
    20% { filter: contrast(3); }
    40% { filter: contrast(3); }
    60% { filter: contrast(15); }
    100% { filter: contrast(15); }
  }
`;

export default AmberOrb;
