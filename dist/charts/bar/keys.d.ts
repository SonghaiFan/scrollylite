import type { ChartContext, DataRow, ViewSpec } from '../../types/index.js';
type KeyFn = (this: Element, d: DataRow, i: number) => string | number;
export declare function barKeyAccessor(chart: ChartContext, spec: ViewSpec, fallbackField?: string): KeyFn;
export declare function applyBarIdentity(selection: unknown, spec: ViewSpec, key: KeyFn, categoryValue: (d: DataRow) => unknown): unknown;
export {};
