import type { Delta, DiffResult, SemanticDiffResult, ViewSpec } from '../types/index.js';
export declare function diffViewStates(previous: ViewSpec | {
    toSpec(): ViewSpec;
} | null | undefined, next: ViewSpec | {
    toSpec(): ViewSpec;
} | null | undefined): DiffResult;
export declare function sameValue(a: unknown, b: unknown): boolean;
export declare function diffSemanticViewStates(previous?: ViewSpec, next?: ViewSpec): SemanticDiffResult;
export declare function pushStateDelta<T>(deltas: Delta[], type: string, previous: T | null | undefined, next: T | null | undefined): void;
export declare function pushDelta<T>(deltas: Delta[], type: string, previous: T | null | undefined, next: T | null | undefined): void;
