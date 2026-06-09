import type { TransformSpec } from '../types/index.js';
interface ArqueroTable {
    objects(): Record<string, unknown>[];
    filter(fn: unknown): ArqueroTable;
    derive(spec: Record<string, unknown>): ArqueroTable;
    fold(fields: string[], options: Record<string, unknown>): ArqueroTable;
    orderby(...fields: unknown[]): ArqueroTable;
    slice(start: number, end?: number): ArqueroTable;
    groupby(...fields: string[]): ArqueroTable;
    rollup(spec: Record<string, unknown>): ArqueroTable;
}
interface Arquero {
    from(data: Record<string, unknown>[]): ArqueroTable;
    escape<T>(fn: (row: T) => unknown): unknown;
    desc(field: string): unknown;
    op: {
        count(): unknown;
        mean(field: string): unknown;
        min(field: string): unknown;
        max(field: string): unknown;
        median(field: string): unknown;
        sum(field: string): unknown;
    };
}
export declare function applyTransforms(source: Record<string, unknown>[], transforms: TransformSpec[] | undefined, aq: Arquero): Record<string, unknown>[];
export {};
