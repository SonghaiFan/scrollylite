import type { Delta, SemanticViewState, ViewSpec } from '../types/index.js';
import { diffViewStates, sameValue } from './diff.js';

type SpecLike = ViewSpec | { toSpec(): ViewSpec; operations(): string[]; capabilities?(): Record<string, boolean> } | null | undefined;

export function inferTransition(previous: SpecLike, next: SpecLike): string[] {
  if (!previous) return [];

  const scenes: string[] = [];
  const nextOps = getOperations(next);

  if (nextOps.length) {
    const prevOps = getOperations(previous);
    scenes.push(...operationDelta(prevOps, nextOps));
  }

  const prevSpec = toViewSpec(previous);
  const nextSpec = toViewSpec(next);
  const diff = diffViewStates(prevSpec, nextSpec);

  if (diff.has('filter') || diff.hasDelta('focus') || filterTransformChanged(diff.previous as unknown as ViewSpec, diff.next as unknown as ViewSpec)) {
    scenes.push('focus');
  }

  if (supportsScene(previous, 'observation') && supportsScene(next, 'observation') && xyObservationChanged(diff)) {
    scenes.push('observation');
  }

  if (
    (diff.has('granularity') || diff.hasDelta('granularity') || diff.hasDelta('bar.granularity')) &&
    !onlyGranularityLayoutChanged(diff.delta('bar.granularity') ?? diff.delta('granularity'))
  ) {
    scenes.push('granularity');
  }

  if (diff.has('guide') || diff.hasDelta('guide') || diff.hasDelta('bar.guide')) {
    scenes.push('guide');
  }

  return unique(scenes);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toViewSpec(value: SpecLike): ViewSpec {
  if (!value) return {};
  return typeof (value as { toSpec?(): ViewSpec }).toSpec === 'function'
    ? (value as { toSpec(): ViewSpec }).toSpec()
    : (value as ViewSpec);
}

function getOperations(value: SpecLike): string[] {
  if (!value) return [];
  return typeof (value as { operations?(): string[] }).operations === 'function'
    ? (value as { operations(): string[] }).operations()
    : [];
}

// Idiom builders declare scene capabilities (ViewState.capabilities()); a raw
// hand-written spec supports every scene by default.
function supportsScene(value: SpecLike, scene: string): boolean {
  if (!value) return true;
  const capabilities =
    typeof (value as { capabilities?(): Record<string, boolean> }).capabilities === 'function'
      ? (value as { capabilities(): Record<string, boolean> }).capabilities()
      : null;
  return capabilities?.[scene] !== false;
}

function filterTransformChanged(previous: ViewSpec, next: ViewSpec): boolean {
  return !sameValue(filterTransforms(previous.transform), filterTransforms(next.transform));
}

function filterTransforms(transforms: ViewSpec['transform'] = []): unknown[] {
  return (transforms as Array<Record<string, unknown>>)
    .filter((t) => t?.filter)
    .map((t) => t.filter);
}

function onlyGranularityLayoutChanged(delta: Delta | null): boolean {
  if (!delta?.previous || !delta?.next) return false;
  const prev = delta.previous as Record<string, unknown>;
  const curr = delta.next as Record<string, unknown>;
  const prevRest = { ...prev };
  const nextRest = { ...curr };
  delete prevRest.layout;
  delete nextRest.layout;
  return sameValue(prevRest, nextRest) && !sameValue(prev.layout, curr.layout);
}

function xyObservationChanged(diff: ReturnType<typeof diffViewStates>): boolean {
  if (diff.has('transform') || diff.has('filter') || diff.hasDelta('focus')) return false;

  return (['x', 'y'] as const).some((channel) => {
    const prev = diff.previous?.encoding?.[channel];
    const nextCh = diff.next?.encoding?.[channel];
    return prev?.field && nextCh?.field && prev.field !== nextCh.field;
  });
}

function operationDelta(previous: string[], next: string[]): string[] {
  let i = 0;
  while (i < previous.length && i < next.length && previous[i] === next[i]) i++;
  if (i < previous.length && i === next.length) return previous.slice(i);
  return next.slice(i);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
