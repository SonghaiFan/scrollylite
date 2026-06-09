import { createBarRenderer } from './render.js';
import { cloneSpec, uniqueTokens } from '../../runtime/utils.js';
import { barCollapseIntermediateSpec, barIntermediateSpecs, barSplitIntermediateSpec, resolveBarTransitionPlan } from './state.js';
export function createBarIdiom(deps) {
    const renderer = createBarRenderer(deps);
    return {
        key: 'bar',
        renderer,
        prepareSpec: prepareBarSpec,
        resolveTransitionPlan: resolveBarTransitionPlan,
        intermediateSpecs: barIntermediateSpecs,
        intermediateSpec(previousSpec, nextSpec) {
            const collapseSpec = barCollapseIntermediateSpec(previousSpec, nextSpec);
            if (collapseSpec)
                return { spec: collapseSpec, scene: 'guide' };
            const splitSpec = barSplitIntermediateSpec(previousSpec, nextSpec);
            if (splitSpec)
                return { spec: splitSpec, scene: 'granularity' };
            return null;
        },
        defaultMargin,
        scenes: ['focus', 'guide', 'granularity', 'observation'],
        stateOperations: { focus: 'filter', guide: 'coordinate', granularity: 'aggregate' },
        inspect: { transitionPlanKey: 'barTransitionPlan' }
    };
}
function defaultMargin(spec) {
    const enc = (spec.encoding ?? {});
    const horizontalBar = String(spec.mark ?? '').toLowerCase() === 'bar' &&
        enc.x?.type === 'quantitative' &&
        ['nominal', 'ordinal'].includes(enc.y?.type ?? '');
    return horizontalBar ? { left: 86, right: 42 } : {};
}
function prepareBarSpec(spec) {
    if (spec.mark !== 'bar')
        return spec;
    const next = cloneSpec(spec);
    const enc = (next.encoding ?? {});
    inferChannelTypes(enc);
    const timeUnitTransforms = timeUnitTransformsFromEncoding(enc);
    const aggregate = aggregateTransformFromEncoding(enc);
    if (timeUnitTransforms.length || aggregate) {
        next.transform = [
            ...(next.transform ?? []),
            ...timeUnitTransforms,
            ...(aggregate ? [{ aggregate }] : [])
        ];
    }
    return next;
}
function timeUnitTransformsFromEncoding(encoding) {
    return Object.values(encoding).flatMap((channel) => {
        if (!channel?.timeUnit || !channel.field)
            return [];
        const as = `${channel.field}_${channel.timeUnit}`;
        const transform = {
            timeUnit: { field: channel.field, unit: channel.timeUnit, as }
        };
        channel.field = as;
        delete channel.timeUnit;
        return [transform];
    });
}
function inferChannelTypes(encoding) {
    for (const [channelName, channel] of Object.entries(encoding)) {
        if (!channel || typeof channel !== 'object' || !channel.field || channel.type)
            continue;
        if (channel.aggregate) {
            channel.type = 'quantitative';
        }
        else {
            channel.type = 'nominal';
        }
    }
}
function aggregateTransformFromEncoding(encoding) {
    const measureEntry = ['x', 'y'].find((ch) => encoding[ch]?.aggregate);
    if (!measureEntry)
        return null;
    const measure = encoding[measureEntry];
    if (!measure)
        return null;
    const as = measure.field ?? `${measure.aggregate}_value`;
    const groupby = uniqueTokens(['x', 'y', 'color', 'xOffset', 'yOffset']
        .filter((ch) => ch !== measureEntry)
        .map((ch) => encoding[ch]?.field));
    const op = measure.aggregate === true ? 'count' : measure.aggregate;
    const fieldSpec = { op, as };
    if (measure.field)
        fieldSpec.field = measure.field;
    delete measure.aggregate;
    measure.field = as;
    measure.type = 'quantitative';
    return { groupby, fields: [fieldSpec] };
}
