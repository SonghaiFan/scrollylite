export function semanticBarState(spec?: {}, semanticState?: any): {
    orientation: string;
    layout: any;
    categoryField: any;
    measureField: any;
    guide: any;
    granularity: any;
    aggregate: any;
    segmentField: any;
    xGeometry: {
        orientation: any;
        layout: any;
        measure: {
            role: string;
            field: any;
        };
        segment: {
            field: any;
            color: {
                field: any;
                title: any;
                type: any;
                aggregate: any;
                domain: any;
                scale: any;
                sort: any;
                bin: any;
            };
        };
        channel: {
            field: any;
            title: any;
            type: any;
            aggregate: any;
            domain: any;
            scale: any;
            sort: any;
            bin: any;
        };
        category?: undefined;
    } | {
        orientation: any;
        layout: any;
        category: {
            role: string;
            field: any;
            filters: any;
        };
        segment: {
            field: any;
            color: {
                field: any;
                title: any;
                type: any;
                aggregate: any;
                domain: any;
                scale: any;
                sort: any;
                bin: any;
            };
        };
        channel: {
            field: any;
            title: any;
            type: any;
            aggregate: any;
            domain: any;
            scale: any;
            sort: any;
            bin: any;
        };
        measure?: undefined;
    };
    yGeometry: {
        orientation: any;
        layout: any;
        category: {
            role: string;
            field: any;
            filters: any;
        };
        segment: {
            field: any;
            color: {
                field: any;
                title: any;
                type: any;
                aggregate: any;
                domain: any;
                scale: any;
                sort: any;
                bin: any;
            };
        };
        channel: {
            field: any;
            title: any;
            type: any;
            aggregate: any;
            domain: any;
            scale: any;
            sort: any;
            bin: any;
        };
        measure?: undefined;
    } | {
        orientation: any;
        layout: any;
        measure: {
            role: string;
            field: any;
        };
        segment: {
            field: any;
            color: {
                field: any;
                title: any;
                type: any;
                aggregate: any;
                domain: any;
                scale: any;
                sort: any;
                bin: any;
            };
        };
        channel: {
            field: any;
            title: any;
            type: any;
            aggregate: any;
            domain: any;
            scale: any;
            sort: any;
            bin: any;
        };
        category?: undefined;
    };
};
export function barLayoutState(spec?: {}, state?: {
    filters: any[];
    focus: any;
    guide: any;
    granularity: any;
    sceneState: any;
}, aggregate?: any): any;
export function barGuideState({ orientation, layout, state }: {
    orientation: any;
    layout: any;
    state?: {};
}): any;
export function barGranularityState({ layout, categoryField, measureField, segmentField, state }: {
    layout: any;
    categoryField: any;
    measureField: any;
    segmentField: any;
    state?: {};
}): any;
export function barAggregateState(spec?: {}): any;
export function barSegmentField(spec?: {}, state?: {
    filters: any[];
    focus: any;
    guide: any;
    granularity: any;
    sceneState: any;
}): any;
