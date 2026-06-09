import type { ChartDeps, ChartIdiom, ChartPlugin, CompilerContext, IntermediateSpec, MarginSpec, Renderer, SpecCompiler, StateOperations, TransitionPlan, ViewSpec } from '../types/index.js';
export declare const DEFAULT_SCENES: readonly ["focus", "guide", "granularity", "observation"];
export declare const DEFAULT_STATE_OPERATIONS: StateOperations;
export interface ChartIdiomConfig<S extends ViewSpec = ViewSpec> {
    key: string;
    scenes?: string[];
    stateOperations?: StateOperations;
    renderer?: Renderer<S>;
    createRenderer?: (deps: ChartDeps) => Renderer<S>;
    createIdiom?: (deps: ChartDeps) => ChartIdiom<S>;
    prepareSpec?: (spec: S) => S;
    defaults?: {
        margin?: (spec: S) => Partial<MarginSpec>;
    };
    inspect?: Record<string, unknown>;
    transition?: {
        plan?: (prev: S | null, next: S | null) => TransitionPlan;
        intermediateSpecs?: (prev: S, next: S) => IntermediateSpec<S>[];
        intermediateSpec?: (prev: S, next: S) => IntermediateSpec<S> | null;
    };
    createSpecCompiler?: (context: CompilerContext) => SpecCompiler;
}
export declare function defineChartIdiom<S extends ViewSpec = ViewSpec>(config: ChartIdiomConfig<S>): ChartPlugin<S>;
export declare function identityPrepare<S extends ViewSpec>(spec: S): S;
export declare function emptyTransitionPlan(): TransitionPlan;
export declare function defaultMargin(): Partial<MarginSpec>;
export declare function normalizeChartIdiom<S extends ViewSpec = ViewSpec>(idiom: Partial<ChartIdiom<S>> & {
    key: string;
}, createSpecCompiler?: ((context: CompilerContext) => SpecCompiler) | null): ChartIdiom<S>;
