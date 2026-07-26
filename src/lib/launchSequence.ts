export const LAUNCH_SEQUENCE_STORAGE_KEY = 'ff-demo-disclosure-v1';
export const LAUNCH_SEQUENCE_FORCE_PARAM = 'launch';
export const LAUNCH_SEQUENCE_FORCE_VALUE = 'force';

export interface LaunchSequenceEnvironment {
  forced: boolean;
  seen: boolean;
}

export interface LaunchSequenceDecision {
  shouldShow: boolean;
  shouldPersist: boolean;
}

export function deriveLaunchSequenceDecision({
  forced,
  seen,
}: LaunchSequenceEnvironment): LaunchSequenceDecision {
  if (forced) {
    return {
      shouldShow: true,
      shouldPersist: false,
    };
  }

  return {
    shouldShow: !seen,
    shouldPersist: !seen,
  };
}

export function isLaunchSequenceForced(search = window.location.search): boolean {
  return new URLSearchParams(search).get(LAUNCH_SEQUENCE_FORCE_PARAM)
    === LAUNCH_SEQUENCE_FORCE_VALUE;
}

export function hasSeenLaunchSequence(storage: Pick<Storage, 'getItem'> = localStorage): boolean {
  try {
    return storage.getItem(LAUNCH_SEQUENCE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markLaunchSequenceSeen(storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(LAUNCH_SEQUENCE_STORAGE_KEY, '1');
  } catch {
    // Storage can be unavailable in private browsing. The launch still completes.
  }
}

export function getLaunchSequenceDecision(): LaunchSequenceDecision {
  const forced = isLaunchSequenceForced();

  return deriveLaunchSequenceDecision({
    forced,
    seen: hasSeenLaunchSequence(),
  });
}
