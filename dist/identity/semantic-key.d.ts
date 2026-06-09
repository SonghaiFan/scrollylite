import type { ViewSpec } from '../types/index.js';
type KeyFn = (d: Record<string, unknown>, i: number) => string | number;
export declare function keyAccessor(spec: ViewSpec, fallbackField?: string): KeyFn;
export declare function semanticKeyForDatum(datum: Record<string, unknown> | null, spec?: ViewSpec): string | null;
export declare function semanticMeasureForDatum(datum: Record<string, unknown> | null, spec?: ViewSpec): unknown;
export {};
