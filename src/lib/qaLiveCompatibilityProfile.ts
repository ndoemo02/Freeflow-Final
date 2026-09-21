import { Behavior, type FunctionDeclaration } from '@google/genai';

export const QA_LIVE_COMPATIBILITY_PROFILE = 'gemini-live-v1beta-blocking-v1';
export const QA_LIVE_COMPATIBILITY_API_VERSION = 'v1beta';

export function getQaLiveCompatibilityProfile(): string | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as any).__FREEFLOW_GEMINI_LIVE_COMPATIBILITY_PROFILE__;
  return (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__ === 'phase1'
    && candidate === QA_LIVE_COMPATIBILITY_PROFILE
    ? candidate
    : null;
}

export function withBlockingFunctionDeclarations(
  declarations: FunctionDeclaration[],
): FunctionDeclaration[] {
  return declarations.map(declaration => ({ ...declaration, behavior: Behavior.BLOCKING }));
}

export function exposeQaLiveCompatibilityRuntime(metadata: Record<string, unknown>): void {
  if (!getQaLiveCompatibilityProfile() || typeof window === 'undefined') return;
  (window as any).__FREEFLOW_GEMINI_LIVE_COMPATIBILITY_RUNTIME__ = Object.freeze({ ...metadata });
}
