import type { TransitionPlan, ViewSpec } from '../types/index.js';
import { diffViewStates } from '../grammar/diff.js';
import { narrativeTransition } from '../scrolly-meta.js';
import { defaultTransition } from '../timing.js';

interface TransitionPlanOptions {
  reason?: string;
}

export function createDefaultTransitionPlan(
  previousSpec: ViewSpec | null | undefined,
  nextSpec: ViewSpec | null | undefined,
  options: TransitionPlanOptions = {}
): TransitionPlan {
  if (!previousSpec || !nextSpec) return {} as TransitionPlan;

  const diff = diffViewStates(previousSpec, nextSpec);
  const timing = defaultTransition({
    ...narrativeTransition(previousSpec),
    ...narrativeTransition(nextSpec)
  });

  return {
    diff: diff.deltas.map(({ type, action, previous, next }) => ({ type, action, previous, next })),
    update: {
      mode: 'ordinary',
      reason: options.reason || 'default-idiom-update',
      timing,
      totalDuration: (timing.duration ?? 0) + staggerMax(timing.stagger)
    },
    enter: {
      mode: 'ordinary',
      reason: options.reason || 'default-idiom-enter'
    },
    exit: {
      mode: 'ordinary',
      reason: options.reason || 'default-idiom-exit'
    }
  } as TransitionPlan;
}

function staggerMax(stagger: unknown): number {
  if (stagger == null || typeof stagger !== 'object') return 0;
  const max = Number((stagger as Record<string, unknown>)['max']);
  return Number.isFinite(max) ? max : 0;
}
