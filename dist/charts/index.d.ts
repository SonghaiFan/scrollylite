import type { ChartDeps, ChartIdiom, ChartPlugin, CompilerContext, SpecCompiler, StateOperations, ViewSpec } from '../types/index.js';
export interface ChartIdiomRegistry {
    register<S extends ViewSpec>(idiom: ChartIdiom<S>): this;
    get<S extends ViewSpec = ViewSpec>(markOrSpec: string | ViewSpec): ChartIdiom<S> | undefined;
    has(markOrSpec: string | ViewSpec): boolean;
    types(): string[];
}
export declare function createChartIdiomRegistry(): ChartIdiomRegistry;
export interface SpecCompilerEntry {
    compiler: SpecCompiler;
    scenes: string[];
    stateOperations: StateOperations;
}
export declare function registerChartModules(registry: ChartIdiomRegistry, modules: Array<{
    plugin: ChartPlugin;
}>, deps?: ChartDeps): ChartIdiomRegistry;
export declare function createSpecCompilerRegistry(modules: Array<{
    plugin: ChartPlugin;
}>, context?: CompilerContext): Record<string, SpecCompilerEntry>;
export declare function normalizeMarkRendererKey(markOrRenderer: unknown): string;
export declare function normalizeChartType(type: unknown): string;
export declare function resolveMarkRendererKey(viewSpec: ViewSpec): string;
export declare function resolveChartType(viewSpec: ViewSpec): string;
