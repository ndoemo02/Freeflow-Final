import { beforeEach, describe, expect, it } from 'vitest';
import {
  LAUNCH_SEQUENCE_STORAGE_KEY,
  deriveLaunchSequenceDecision,
  hasSeenLaunchSequence,
  isLaunchSequenceForced,
  markLaunchSequenceSeen,
} from './launchSequence';

describe('launch sequence contract', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows once before the browser or installed-app demo', () => {
    expect(deriveLaunchSequenceDecision({
      forced: false,
      seen: false,
    })).toEqual({
      shouldShow: true,
      shouldPersist: true,
    });

    expect(deriveLaunchSequenceDecision({
      forced: false,
      seen: true,
    }).shouldShow).toBe(false);
  });

  it('shows in an ordinary browser until acknowledged', () => {
    expect(deriveLaunchSequenceDecision({
      forced: false,
      seen: false,
    }).shouldShow).toBe(true);
  });

  it('supports a non-persistent force mode for visual review', () => {
    expect(isLaunchSequenceForced('?launch=force')).toBe(true);
    expect(deriveLaunchSequenceDecision({
      forced: true,
      seen: true,
    })).toEqual({
      shouldShow: true,
      shouldPersist: false,
    });
  });

  it('persists the completed installed-app sequence', () => {
    expect(hasSeenLaunchSequence()).toBe(false);
    markLaunchSequenceSeen();
    expect(localStorage.getItem(LAUNCH_SEQUENCE_STORAGE_KEY)).toBe('1');
    expect(hasSeenLaunchSequence()).toBe(true);
  });
});
