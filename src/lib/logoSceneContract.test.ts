import { describe, expect, it } from 'vitest';
import { deriveLogoScenePhase, getLogoMotionPlan } from './logoSceneContract';

describe('logoSceneContract', () => {
  it('keeps the logo idle when no voice or result scene is active', () => {
    expect(deriveLogoScenePhase({ uiMode: 'idle' })).toBe('idle');
  });

  it('enters intent phase when voice listening starts from the home scene', () => {
    expect(deriveLogoScenePhase({ uiMode: 'idle', isListening: true })).toBe('intent');
  });

  it('ignores stale transient live state when the live session is not active', () => {
    expect(deriveLogoScenePhase({
      uiMode: 'idle',
      liveSessionActive: false,
      liveUiState: 'listening',
    })).toBe('idle');
  });

  it('compacts the logo while the assistant is processing without visible results', () => {
    expect(deriveLogoScenePhase({ uiMode: 'idle', isThinking: true })).toBe('compact');
    expect(deriveLogoScenePhase({ uiMode: 'idle', liveUiState: 'processing' })).toBe('compact');
  });

  it('uses results phase when restaurant cards are visible', () => {
    expect(deriveLogoScenePhase({ uiMode: 'list', hasSuggestedRestaurants: true })).toBe('results');
  });

  it('keeps structured restaurant or menu scenes compact instead of returning to hero', () => {
    expect(deriveLogoScenePhase({ uiMode: 'restaurant' })).toBe('compact');
    expect(deriveLogoScenePhase({ uiMode: 'checkout' })).toBe('compact');
  });

  it('returns static motion when reduced motion is requested', () => {
    expect(getLogoMotionPlan('intent', true)).toEqual({
      transitionMs: 0,
      visible: true,
      wobblePx: 0,
      pulse: false,
    });
  });

  it('uses a subtle wobble while voice intent is active', () => {
    expect(getLogoMotionPlan('intent', false)).toMatchObject({
      visible: true,
      wobblePx: 3,
      pulse: false,
    });
  });

  it('hides the hero instead of compacting it into the header', () => {
    expect(getLogoMotionPlan('compact', false)).toMatchObject({ visible: false, pulse: false });
    expect(getLogoMotionPlan('results', false)).toMatchObject({ visible: false, pulse: false });
  });
});
