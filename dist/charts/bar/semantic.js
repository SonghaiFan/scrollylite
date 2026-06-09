import { narrativeState } from '../../scrolly-meta.js';
import { barCategoryChannel, barMeasureChannel, barOrientationFromEncoding, isSegmentLayout } from './layout/index.js';
export function semanticBarState(spec, semanticStateArg = null) {
    const enc = (spec.encoding ?? {});
    const state = semanticStateArg ?? semanticStateFromSpec(spec);
    const aggregate = barAggregateState(spec);
    const layout = barLayoutState(spec, state, aggregate);
    const orientation = barOrientationFromEncoding(enc);
    const categoryField = barCategoryChannel(enc).field ?? null;
    const measureField = barMeasureChannel(enc).field ?? null;
    const segmentField = barSegmentField(spec, state);
    const guide = barGuideState({ orientation, layout, state });
    const granularity = barGranularityState({ layout, categoryField, measureField, segmentField, state });
    const geometry = barGeometryState({ enc, filters: resolveFilters(spec, state), layout, orientation, categoryField, measureField, segmentField });
    return {
        orientation,
        layout,
        categoryField,
        measureField,
        guide,
        granularity,
        aggregate,
        segmentField,
        xGeometry: geometry.x,
        yGeometry: geometry.y
    };
}
export function barLayoutState(spec, state = semanticStateFromSpec(spec), aggregate = barAggregateState(spec)) {
    const enc = (spec.encoding ?? {});
    const sceneState = state.sceneState ?? {};
    const stateLayout = sceneState.guide?.layout ??
        sceneState.granularity?.layout ??
        state.guide?.layout ??
        state.granularity?.layout;
    if (stateLayout)
        return stateLayout;
    if (enc.xOffset?.field || enc.yOffset?.field)
        return 'grouped';
    if (enc.color?.field && aggregate)
        return 'stacked';
    return 'simple';
}
export function barGuideState({ orientation, layout, state = {} }) {
    const sceneState = state.sceneState ?? {};
    const explicit = sceneState.guide ?? state.guide;
    if (explicit)
        return explicit;
    if (orientation === 'horizontal') {
        return { orientation, staging: { order: ['y', 'x'] } };
    }
    if (layout === 'grouped') {
        return { layout, staging: { order: ['x', 'y'] } };
    }
    return null;
}
export function barGranularityState({ layout, categoryField, measureField, segmentField, state = {} }) {
    const sceneState = state.sceneState ?? {};
    const explicit = sceneState.granularity ?? state.granularity;
    if (explicit)
        return explicit;
    if (!isSegmentLayout(layout) || !segmentField)
        return null;
    return {
        layout,
        categoryField: categoryField ?? null,
        segmentField,
        valueField: measureField ?? null
    };
}
export function barAggregateState(spec) {
    const transforms = (spec.transform ?? []);
    const aggregates = transforms
        .filter((t) => t.aggregate)
        .map((t) => t.aggregate);
    if (!aggregates.length)
        return null;
    return aggregates.length === 1 ? aggregates[0] : aggregates;
}
export function barSegmentField(spec, state = semanticStateFromSpec(spec)) {
    const sceneState = state.sceneState ?? {};
    return (sceneState.granularity?.segmentField ??
        state.granularity?.segmentField ??
        spec.encoding?.xOffset?.field ??
        spec.encoding?.yOffset?.field ??
        spec.encoding?.color?.field ??
        null);
}
// ─── Internal ─────────────────────────────────────────────────────────────────
function semanticStateFromSpec(spec) {
    const state = narrativeState(spec);
    const transforms = (spec.transform ?? []);
    return {
        ...state,
        filters: [
            ...(spec.filter ? [spec.filter] : []),
            ...transforms.filter((t) => t.filter).map((t) => t.filter)
        ]
    };
}
function resolveFilters(spec, state) {
    const transforms = (spec.transform ?? []);
    return [
        ...(spec.filter ? [spec.filter] : []),
        ...transforms.filter((t) => t.filter).map((t) => t.filter)
    ];
}
function barGeometryState({ enc, filters, layout, orientation, categoryField, measureField, segmentField }) {
    const category = { role: 'category', field: categoryField, filters };
    const measure = { role: 'measure', field: measureField };
    const segment = segmentField
        ? { field: segmentField, color: channelSignature(enc.color) }
        : null;
    if (orientation === 'horizontal') {
        return {
            x: {
                orientation,
                layout,
                measure,
                segment: layout === 'stacked' ? segment : null,
                channel: channelSignature(enc.x)
            },
            y: {
                orientation,
                layout,
                category,
                segment: layout === 'grouped' ? segment : null,
                channel: channelSignature(enc.y)
            }
        };
    }
    return {
        x: {
            orientation,
            layout,
            category,
            segment: layout === 'grouped' ? segment : null,
            channel: channelSignature(enc.x)
        },
        y: {
            orientation,
            layout,
            measure,
            segment: layout === 'stacked' ? segment : null,
            channel: channelSignature(enc.y)
        }
    };
}
function channelSignature(channel = {}) {
    return {
        field: channel.field ?? null,
        title: channel.title ?? null,
        type: channel.type ?? null,
        aggregate: typeof channel.aggregate === 'string' ? channel.aggregate : null,
        domain: channel.domain ?? null,
        scale: channel.scale ?? null,
        sort: channel.sort ?? null,
        bin: channel.bin ?? null
    };
}
