import React from 'react';
import './FreeFlowWordmark.css';

export type FreeFlowWordmarkVariant = 'clean-premium' | 'neon-soft-glow' | 'closest-to-logo';

interface FreeFlowWordmarkProps {
  variant?: FreeFlowWordmarkVariant;
  className?: string;
}

export default function FreeFlowWordmark({
  variant = 'clean-premium',
  className = '',
}: FreeFlowWordmarkProps) {
  return (
    <span
      className={`ff-wordmark ff-wordmark--${variant} ${className}`.trim()}
      aria-label="FreeFlow"
      title={`FreeFlow (${variant})`}
    >
      <span className="ff-wordmark__free">Free</span>
      <span className="ff-wordmark__flow">Flow</span>
    </span>
  );
}

