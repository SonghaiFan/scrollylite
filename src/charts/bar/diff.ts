import type { Delta, SemanticViewState } from '../../types/index.js';
import { semanticBarState } from './semantic.js';

export { semanticBarState };

type PushDeltaFn = <T>(
  deltas: Delta[],
  type: string,
  previous: T | null | undefined,
  next: T | null | undefined
) => void;

interface DiffHelpers {
  pushDelta: PushDeltaFn;
  pushStateDelta: PushDeltaFn;
}

export function appendBarSemanticDeltas(
  deltas: Delta[],
  previous: Partial<SemanticViewState>,
  next: Partial<SemanticViewState>,
  { pushDelta, pushStateDelta }: DiffHelpers
): void {
  pushDelta(deltas, 'bar.orientation', previous.bar?.orientation, next.bar?.orientation);
  pushDelta(deltas, 'bar.layout', previous.bar?.layout, next.bar?.layout);
  pushDelta(deltas, 'bar.category-field', previous.bar?.categoryField, next.bar?.categoryField);
  pushDelta(deltas, 'bar.measure-field', previous.bar?.measureField, next.bar?.measureField);
  pushStateDelta(deltas, 'bar.guide', previous.bar?.guide, next.bar?.guide);
  pushStateDelta(deltas, 'bar.granularity', previous.bar?.granularity, next.bar?.granularity);
  pushStateDelta(deltas, 'bar.aggregate', previous.bar?.aggregate, next.bar?.aggregate);
  pushDelta(deltas, 'bar.segment-field', previous.bar?.segmentField, next.bar?.segmentField);
  pushDelta(deltas, 'bar.x-geometry', previous.bar?.xGeometry, next.bar?.xGeometry);
  pushDelta(deltas, 'bar.y-geometry', previous.bar?.yGeometry, next.bar?.yGeometry);
}
