import type { BarLayout, BarOrientation, IntermediateSpec, TransitionPlan, ViewSpec } from '../../types/index.js';
export declare function resolveBarTransitionPlan(previousSpec: ViewSpec | null, nextSpec: ViewSpec | null): TransitionPlan;
interface BarInternalState {
    orientation: BarOrientation;
    barLayout: BarLayout;
    categoryField: string | null;
    measureField: string | null;
    hasGuide: boolean;
    hasGranularity: boolean;
    hasAggregate: boolean;
    segmentField: string | null;
    guideStaging: Record<string, unknown> | null;
}
export declare function barState(spec: ViewSpec | null | undefined): BarInternalState | null;
export declare function barCollapseIntermediateSpec(previousSpec: ViewSpec | null, nextSpec: ViewSpec | null): ViewSpec | null;
export declare function barSplitIntermediateSpec(previousSpec: ViewSpec | null, nextSpec: ViewSpec | null): ViewSpec | null;
export declare function barIntermediateSpecs(previousSpec: ViewSpec, nextSpec: ViewSpec): IntermediateSpec[];
export {};
