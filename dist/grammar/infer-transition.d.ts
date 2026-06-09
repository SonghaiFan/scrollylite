import type { ViewSpec } from '../types/index.js';
type SpecLike = ViewSpec | {
    toSpec(): ViewSpec;
    operations(): string[];
} | null | undefined;
export declare function inferTransition(previous: SpecLike, next: SpecLike): string[];
export {};
