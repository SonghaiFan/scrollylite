import type { StaggerSpec, TimingDefaults, TransitionSpec } from './types/index.js';

export const DEFAULT_TIMING: TimingDefaults = {
  transition: {
    duration: 900,
    ease: 'cubicInOut',
    stagger: { step: 10, max: 120 }
  },
  scene: {
    stagger: { step: 12, max: 160 }
  },
  stage: {
    minDuration: 180
  },
  unit: {
    axisDurationMultiplier: 1.35,
    xRatio: 0.42,
    stagger: { step: 10, max: 90 },
    xStagger: { step: 7, max: 126 }
  }
};

export function defaultTransition(overrides: Partial<TransitionSpec> = {}): Required<TransitionSpec> {
  const staggerPatch: Partial<StaggerSpec> = typeof overrides.stagger === 'object'
    ? overrides.stagger as Partial<StaggerSpec>
    : {};
  const stagger: StaggerSpec | number =
    overrides.stagger == null || typeof overrides.stagger === 'object'
      ? { ...(DEFAULT_TIMING.transition.stagger as StaggerSpec), ...staggerPatch }
      : overrides.stagger;

  return {
    ...DEFAULT_TIMING.transition,
    ...overrides,
    stagger
  } as Required<TransitionSpec>;
}

export function stagedDuration(totalDuration: number | undefined, stageCount: number): number {
  return Math.max(
    DEFAULT_TIMING.stage.minDuration,
    Math.round((totalDuration ?? DEFAULT_TIMING.transition.duration) / Math.max(stageCount, 1))
  );
}
