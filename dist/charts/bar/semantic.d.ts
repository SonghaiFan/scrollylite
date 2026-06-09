import type { AggregateTransform, BarLayout, BarOrientation, BarSemanticState, GranularitySpec, GuideSpec, ResolvedNarrativeState, ViewSpec } from '../../types/index.js';
export declare function semanticBarState(spec: ViewSpec, semanticStateArg?: Partial<ResolvedNarrativeState> | null): BarSemanticState;
export declare function barLayoutState(spec: ViewSpec, state?: Partial<ResolvedNarrativeState>, aggregate?: AggregateTransform | AggregateTransform[] | null): BarLayout;
export declare function barGuideState({ orientation, layout, state }: {
    orientation: BarOrientation;
    layout: BarLayout;
    state?: Partial<ResolvedNarrativeState>;
}): GuideSpec | null;
export declare function barGranularityState({ layout, categoryField, measureField, segmentField, state }: {
    layout: BarLayout;
    categoryField: string | null;
    measureField: string | null;
    segmentField: string | null;
    state?: Partial<ResolvedNarrativeState>;
}): GranularitySpec | null;
export declare function barAggregateState(spec: ViewSpec): AggregateTransform | AggregateTransform[] | null;
export declare function barSegmentField(spec: ViewSpec, state?: Partial<ResolvedNarrativeState>): string | null;
