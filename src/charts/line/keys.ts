import type { ViewSpec } from '../../types/index.js';
import { keyAccessor } from '../../identity/semantic-key.js';

type KeyFn = (d: Record<string, unknown>, i: number) => string | number;
interface SeriesEntry { key: string }

export function linePointKeyAccessor(spec: ViewSpec, fallbackField = 'id'): KeyFn {
  return keyAccessor(spec, fallbackField);
}

export function lineSeriesKey(series: SeriesEntry): string {
  return series.key;
}
