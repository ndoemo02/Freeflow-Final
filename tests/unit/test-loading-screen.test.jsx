/**
 * Testy jednostkowe dla LoadingScreen komponentu
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LoadingScreen from '../../src/components/LoadingScreen';

// Mock timers
vi.useFakeTimers();

describe('LoadingScreen Component', () => {
  let mockOnComplete;

  beforeEach(() => {
    mockOnComplete = vi.fn();
    vi.clearAllMocks();
  });

  it('should render loading screen with FreeFlow text', () => {
    render(<LoadingScreen onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Flow')).toBeInTheDocument();
  });

  it('should have correct CSS classes and styling', () => {
    const { container } = render(<LoadingScreen onComplete={mockOnComplete} />);
    
    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveClass('fixed', 'inset-0', 'bg-black', 'z-50');
    
    const logoDiv = screen.getByText('Free').closest('div');
    expect(logoDiv).toHaveClass('flex', 'text-8xl', 'md:text-9xl', 'font-bold', 'uppercase');
  });

  it('should call onComplete after animation duration', async () => {
    render(<LoadingScreen onComplete={mockOnComplete} />);
    
    // Fast-forward through the animation (4.5s + 0.5s fade)
    vi.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call onComplete before animation completes', () => {
    render(<LoadingScreen onComplete={mockOnComplete} />);
    
    // Fast-forward partway through animation
    vi.advanceTimersByTime(2000);
    
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('should handle missing onComplete prop gracefully', () => {
    expect(() => {
      render(<LoadingScreen />);
    }).not.toThrow();
    
    // Fast-forward through animation
    vi.advanceTimersByTime(5000);
    
    // Should not crash even without onComplete
    expect(true).toBe(true);
  });

  it('should apply correct font family', () => {
    render(<LoadingScreen onComplete={mockOnComplete} />);
    
    const logoDiv = screen.getByText('Free').closest('div');
    expect(logoDiv).toHaveStyle('font-family: Poppins, sans-serif');
  });

  it('should have proper animation delays for letters', () => {
    render(<LoadingScreen onComplete={mockOnComplete} />);
    
    const freeLetters = ['F', 'R', 'E', 'E'];
    freeLetters.forEach((letter, index) => {
      const letterElement = screen.getByText(letter);
      const expectedDelay = `${0.1 + index * 0.1}s`;
      expect(letterElement).toHaveStyle(`animation-delay: ${expectedDelay}`);
    });
  });

  it('should clean up timers on unmount', () => {
    const { unmount } = render(<LoadingScreen onComplete={mockOnComplete} />);
    
    // Fast-forward partway
    vi.advanceTimersByTime(2000);
    
    // Unmount component
    unmount();
    
    // Fast-forward remaining time
    vi.advanceTimersByTime(3000);
    
    // onComplete should not be called after unmount
    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});

