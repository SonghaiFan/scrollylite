import { diffViewStates, sameValue } from './diff.js';
export function inferTransition(previous, next) {
    if (!previous)
        return [];
    const scenes = [];
    const nextOps = getOperations(next);
    if (nextOps.length) {
        const prevOps = getOperations(previous);
        scenes.push(...operationDelta(prevOps, nextOps));
    }
    const prevSpec = toViewSpec(previous);
    const nextSpec = toViewSpec(next);
    const diff = diffViewStates(prevSpec, nextSpec);
    if (diff.has('filter') || diff.hasDelta('focus') || filterTransformChanged(diff.previous, diff.next)) {
        scenes.push('focus');
    }
    if (xyObservationChanged(diff)) {
        scenes.push('observation');
    }
    if ((diff.has('granularity') || diff.hasDelta('granularity') || diff.hasDelta('bar.granularity')) &&
        !onlyGranularityLayoutChanged(diff.delta('bar.granularity') ?? diff.delta('granularity'))) {
        scenes.push('granularity');
    }
    if (diff.has('guide') || diff.hasDelta('guide') || diff.hasDelta('bar.guide')) {
        scenes.push('guide');
    }
    return unique(scenes);
}
// ─── Internal helpers ─────────────────────────────────────────────────────────
function toViewSpec(value) {
    if (!value)
        return {};
    return typeof value.toSpec === 'function'
        ? value.toSpec()
        : value;
}
function getOperations(value) {
    if (!value)
        return [];
    return typeof value.operations === 'function'
        ? value.operations()
        : [];
}
function filterTransformChanged(previous, next) {
    return !sameValue(filterTransforms(previous.transform), filterTransforms(next.transform));
}
function filterTransforms(transforms = []) {
    return transforms
        .filter((t) => t?.filter)
        .map((t) => t.filter);
}
function onlyGranularityLayoutChanged(delta) {
    if (!delta?.previous || !delta?.next)
        return false;
    const prev = delta.previous;
    const curr = delta.next;
    const prevRest = { ...prev };
    const nextRest = { ...curr };
    delete prevRest.layout;
    delete nextRest.layout;
    return sameValue(prevRest, nextRest) && !sameValue(prev.layout, curr.layout);
}
function xyObservationChanged(diff) {
    if (diff.has('transform') || diff.has('filter') || diff.hasDelta('focus'))
        return false;
    const prevMark = String(diff.previous?.mark ?? '').toLowerCase();
    const nextMark = String(diff.next?.mark ?? '').toLowerCase();
    if (prevMark === 'bar' || nextMark === 'bar')
        return false;
    return ['x', 'y'].some((channel) => {
        const prev = diff.previous?.encoding?.[channel];
        const nextCh = diff.next?.encoding?.[channel];
        return prev?.field && nextCh?.field && prev.field !== nextCh.field;
    });
}
function operationDelta(previous, next) {
    let i = 0;
    while (i < previous.length && i < next.length && previous[i] === next[i])
        i++;
    if (i < previous.length && i === next.length)
        return previous.slice(i);
    return next.slice(i);
}
function unique(values) {
    return [...new Set(values.filter(Boolean))];
}
