export function createBarRenderKit(deps: any): {
    axisTransition: (stage: any, axis: any, d3: any) => any;
    baselineEnterPlan: typeof baselineEnterPlan;
    baselineExitPlan: typeof baselineExitPlan;
    barFocusOpacity: typeof barFocusOpacity;
    collapseLineage: typeof collapseLineage;
    renderBarJoin: (options: any) => void;
    setRectGeometry: typeof setRectGeometry;
    splitLineage: typeof splitLineage;
    sourceBaselineExit: typeof sourceBaselineExit;
    stagedUpdate: (selection: any, stage: any, spec: any, dimensions: any, baseAttrs: any) => any;
    updateStage: (chart: any, rendererOrientation: any, d3: any) => {
        stages: any;
        duration: any;
        ease: any;
        stagger: any;
        transitionName: any;
    };
};
export function setRectGeometry(selection: any, geometry: any): void;
export function collapseLineage(chart: any, parentField: any): {
    start(d: any): any;
};
export function splitLineage(chart: any, parentField: any): {
    start(d: any): any;
};
export function baselineEnterPlan(chart: any, from: any): any;
export function baselineExitPlan(chart: any, to: any): any;
export function sourceBaselineExit(selection: any, { horizontal, plan, value }?: {
    horizontal?: boolean;
    plan?: any;
    value?: any;
}): any;
export function barFocusOpacity(row: any, spec?: {}): number;
