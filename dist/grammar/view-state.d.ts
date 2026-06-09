import type { GrammarMeta } from '../types/index.js';
type StateWithMeta<S extends object> = S & {
    __grammar?: GrammarMeta;
};
interface OperationConfig {
    name?: string;
    operation?: string;
    replaceLast?: string;
}
export declare class ViewState<S extends object = Record<string, unknown>> {
    readonly state: Readonly<StateWithMeta<S>>;
    constructor(state?: S | StateWithMeta<S>);
    with(patch: Partial<StateWithMeta<S>>, operation?: string | OperationConfig | null): this;
    toSpec(): Omit<S, '__grammar'>;
    operations(): string[];
}
export declare function cloneState<T>(value: T): T;
export declare function mergeState<T extends object>(base: T, patch: Partial<T>): T;
export {};
