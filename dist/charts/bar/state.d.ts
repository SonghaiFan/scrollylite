export function resolveBarTransitionPlan(previousSpec: any, nextSpec: any): {};
export function barCollapseIntermediateSpec(previousSpec: any, nextSpec: any): any;
export function barSplitIntermediateSpec(previousSpec: any, nextSpec: any): any;
export function barIntermediateSpecs(previousSpec: any, nextSpec: any): {
    spec: any;
    scene: string;
}[];
export function barState(spec: any): {
    orientation: string;
    barLayout: any;
    categoryField: any;
    measureField: any;
    hasGuide: boolean;
    hasGranularity: boolean;
    hasAggregate: boolean;
    segmentField: any;
    guideStaging: any;
};
