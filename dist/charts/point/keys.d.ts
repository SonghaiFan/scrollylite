import type { ViewSpec } from '../../types/index.js';
type KeyFn = (d: Record<string, unknown>, i: number) => string | number;
export declare function pointKeyAccessor(spec: ViewSpec, fallbackField?: string): KeyFn;
export declare function pointStoredKey(datum: Record<string, unknown>, index: number, key: KeyFn): string | number;
export declare function applyPointIdentity(selection: unknown, key: KeyFn): unknown;
export {};
