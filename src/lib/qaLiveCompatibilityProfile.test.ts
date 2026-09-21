import { Behavior, Type, type FunctionDeclaration } from '@google/genai';
import {
  getQaLiveCompatibilityProfile,
  QA_LIVE_COMPATIBILITY_API_VERSION,
  QA_LIVE_COMPATIBILITY_PROFILE,
  withBlockingFunctionDeclarations,
} from './qaLiveCompatibilityProfile';

afterEach(() => {
  delete (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__;
  delete (window as any).__FREEFLOW_GEMINI_LIVE_COMPATIBILITY_PROFILE__;
});

it('activates only for the exact compatibility marker inside the QA runner', () => {
  (window as any).__FREEFLOW_GEMINI_LIVE_COMPATIBILITY_PROFILE__ = QA_LIVE_COMPATIBILITY_PROFILE;
  expect(getQaLiveCompatibilityProfile()).toBeNull();
  (window as any).__FREEFLOW_TRACELAB_QA_RUNNER__ = 'phase1';
  expect(getQaLiveCompatibilityProfile()).toBe(QA_LIVE_COMPATIBILITY_PROFILE);
  expect(QA_LIVE_COMPATIBILITY_API_VERSION).toBe('v1beta');
});

it('copies existing schemas and explicitly pins every declaration to BLOCKING', () => {
  const source: FunctionDeclaration[] = [{
    name: 'add_item_to_cart',
    description: 'unchanged',
    parameters: { type: Type.OBJECT, properties: { dish: { type: Type.STRING } } },
  }];
  const result = withBlockingFunctionDeclarations(source);
  expect(result).toEqual([{ ...source[0], behavior: Behavior.BLOCKING }]);
  expect(source[0].behavior).toBeUndefined();
  expect(result[0]).not.toBe(source[0]);
});
