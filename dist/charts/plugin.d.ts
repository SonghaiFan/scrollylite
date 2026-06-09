export function defineChartIdiom(config?: {}): {
    createSpecCompiler?: any;
    key: any;
    scenes: string[];
    stateOperations: any;
    createChartIdiom: (deps?: {}) => any;
};
export function identityPrepare(spec: any): any;
export function emptyTransitionPlan(): {};
export function defaultMargin(): {};
export function normalizeChartIdiom(idiom: any, createSpecCompiler?: any): any;
export const DEFAULT_SCENES: string[];
export namespace DEFAULT_STATE_OPERATIONS {
    let focus: string;
    let guide: string;
    let granularity: string;
}
