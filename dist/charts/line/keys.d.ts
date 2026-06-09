import type { ViewSpec } from '../../types/index.js';
type KeyFn = (d: Record<string, unknown>, i: number) => string | number;
interface SeriesEntry {
    key: string;
}
export declare function linePointKeyAccessor(spec: ViewSpec, fallbackField?: string): KeyFn;
export declare function lineSeriesKey(series: SeriesEntry): string;
export {};
