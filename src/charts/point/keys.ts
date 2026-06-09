import type { ViewSpec } from '../../types/index.js';
import { keyAccessor } from '../../identity/semantic-key.js';
import { narrativeState } from '../../scrolly-meta.js';

type KeyFn = (d: Record<string, unknown>, i: number) => string | number;

export function pointKeyAccessor(spec: ViewSpec, fallbackField = 'id'): KeyFn {
  const rawKey = keyAccessor(spec, fallbackField);
  const mode = (narrativeState(spec).sceneState as Record<string, unknown> | undefined)?.['granularity'] as Record<string, unknown> | undefined;
  const granularityMode = mode?.['mode'] as string | undefined;
  if (!granularityMode) return rawKey;
  return (row: Record<string, unknown>, index: number) =>
    `${granularityMode}:${rawKey(row, index)}`;
}

export function pointStoredKey(
  datum: Record<string, unknown>,
  index: number,
  key: KeyFn
): string | number {
  return (datum['__slPointJoinKey'] as string | number) || key(datum, index);
}

export function applyPointIdentity(
  selection: unknown,
  key: KeyFn
): unknown {
  type Sel = {
    each(fn: (this: unknown, d: Record<string, unknown>, i: number) => void): Sel;
    attr(name: string, fn: (d: Record<string, unknown>, i: number) => unknown): Sel;
  };
  const sel = selection as Sel;
  return sel
    .each(function(this: unknown, d: Record<string, unknown>, i: number) {
      d['__slPointJoinKey'] = key(d, i);
    })
    .attr('data-key', (d: Record<string, unknown>, i: number) => key(d, i));
}
