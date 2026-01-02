/**
 * Testy jednostkowe dla LoadingScreen komponentu
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
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

    ['F', 'R', 'E', 'E'].forEach(letter => {
      expect(screen.getAllByText(letter)[0]).toBeInTheDocument();
    });
    expect(screen.getByText('Flow')).toBeInTheDocument();
  });

  it('should have correct CSS classes and styling', () => {
    const { container } = render(<LoadingScreen onComplete={mockOnComplete} />);
    
    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveClass('fixed', 'inset-0', 'bg-black', 'z-50');
    
    const logoDiv = container.querySelector('div.flex.text-7xl');
    expect(logoDiv).toHaveClass('flex', 'text-7xl', 'md:text-8xl', 'lg:text-9xl', 'font-bold', 'uppercase');
  });

  it('should call onComplete after animation duration', async () => {
    render(<LoadingScreen onComplete={mockOnComplete} />);

    await act(async () => {
      vi.advanceTimersByTime(9000);
      vi.runAllTimers();
    });

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
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
    vi.advanceTimersByTime(9000);
    
    // Should not crash even without onComplete
    expect(true).toBe(true);
  });

  it('should apply correct font family', () => {
    const { container } = render(<LoadingScreen onComplete={mockOnComplete} />);

    const logoDiv = container.querySelector('div.flex.text-7xl');
    expect(logoDiv).toHaveStyle('font-family: Poppins, sans-serif');
  });

  it('should have proper animation delays for letters', () => {
    render(<LoadingScreen onComplete={mockOnComplete} />);
    
    const letterElements = screen.getAllByText(/^[FRE]$/);
    const expectedDelays = ['2.5s', '2.7s', '2.9s', '3.1s'];

    expectedDelays.forEach((delay, index) => {
      expect(letterElements[index]).toHaveStyle(`animation-delay: ${delay}`);
    });
  });

  it('should clean up timers on unmount', () => {
    const { unmount } = render(<LoadingScreen onComplete={mockOnComplete} />);
    
    // Fast-forward partway
    vi.advanceTimersByTime(2000);
    
    // Unmount component
    unmount();
    
    // Fast-forward remaining time
    vi.advanceTimersByTime(8000);
    
    // onComplete should not be called after unmount
    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});

