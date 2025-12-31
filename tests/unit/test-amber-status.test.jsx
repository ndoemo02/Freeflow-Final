/**
 * Testy jednostkowe dla AmberStatus komponentu
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AmberStatus from '../../src/components/AmberStatus';

describe('AmberStatus Component', () => {
  it('should render with default ready state', () => {
    render(<AmberStatus />);
    
    const statusIndicator = screen.getByTitle(/Status: Gotowa/i);
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator).toHaveClass('w-3', 'h-3', 'rounded-full', 'bg-green-500');
  });

  it('should render thinking state correctly', () => {
    render(<AmberStatus state="thinking" />);
    
    const statusIndicator = screen.getByTitle(/Status: Myśli/i);
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator).toHaveClass('bg-purple-500', 'animate-pulse');
  });

  it('should render error state correctly', () => {
    render(<AmberStatus state="error" />);
    
    const statusIndicator = screen.getByTitle(/Status: Błąd/i);
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator).toHaveClass('bg-red-500');
  });

  it('should render idle state correctly', () => {
    render(<AmberStatus state="idle" />);
    
    const statusIndicator = screen.getByTitle(/Status: Oczekuje/i);
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator).toHaveClass('bg-yellow-400');
  });

  it('should display Polish labels correctly', () => {
    render(<AmberStatus state="ready" />);
    expect(screen.getByText(/Gotowa/i)).toBeInTheDocument();
    
    const { rerender } = render(<AmberStatus state="thinking" />);
    expect(screen.getByText(/Myśli/i)).toBeInTheDocument();
    
    rerender(<AmberStatus state="error" />);
    expect(screen.getByText(/Błąd/i)).toBeInTheDocument();
    
    rerender(<AmberStatus state="idle" />);
    expect(screen.getByText(/Oczekuje/i)).toBeInTheDocument();
  });

  it('should have consistent size and shape', () => {
    const { rerender } = render(<AmberStatus state="ready" />);
    
    const getStatusIndicator = () => screen.getByTitle(/Status:/i);
    
    // Test all states have same size classes
    const states = ['ready', 'thinking', 'error', 'idle'];
    
    states.forEach(state => {
      rerender(<AmberStatus state={state} />);
      const indicator = getStatusIndicator();
      expect(indicator).toHaveClass('w-3', 'h-3', 'rounded-full');
    });
  });

  it('should display Amber label', () => {
    render(<AmberStatus />);
    expect(screen.getByText('Amber:')).toBeInTheDocument();
  });
});

