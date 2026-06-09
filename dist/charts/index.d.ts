export function createChartIdiomRegistry(): {
    register(idiom: any): /*elided*/ any;
    get(markOrSpec: any): any;
    has(markOrSpec: any): boolean;
    types(): any[];
};
export function registerChartModules(registry: any, modules?: any[], deps?: {}): any;
export function createSpecCompilerRegistry(modules?: any[], context?: {}): any;
export function normalizeMarkRendererKey(markOrRenderer: any): string;
export function normalizeChartType(type: any): string;
export function resolveMarkRendererKey(viewSpec?: {}): string;
export function resolveChartType(viewSpec?: {}): string;
