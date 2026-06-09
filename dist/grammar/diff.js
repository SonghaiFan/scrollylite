import { narrativeObjectKey, narrativeSemanticKey, narrativeState } from '../scrolly-meta.js';
import { appendBarSemanticDeltas, semanticBarState } from '../charts/bar/diff.js';
export function diffViewStates(previous, next) {
    const prev = toComparableSpec(previous);
    const curr = toComparableSpec(next);
    const changed = [];
    if (!sameValue(prev.mark, curr.mark))
        changed.push('mark');
    if (!sameValue(prev.key, curr.key))
        changed.push('key');
    if (!sameValue(prev.transform, curr.transform))
        changed.push('transform');
    if (!sameValue(prev.filter, curr.filter))
        changed.push('filter');
    if (!sameValue(prev.encoding?.x, curr.encoding?.x))
        changed.push('encoding.x');
    if (!sameValue(prev.encoding?.y, curr.encoding?.y))
        changed.push('encoding.y');
    if (!sameValue(prev.encoding?.color, curr.encoding?.color))
        changed.push('encoding.color');
    if (!sameValue(prev.guide, curr.guide))
        changed.push('guide');
    if (!sameValue(prev.granularity, curr.granularity))
        changed.push('granularity');
    const semantic = diffSemanticViewStates(prev, curr);
    return {
        changed,
        has: (key) => changed.includes(key),
        deltas: semantic.deltas,
        delta: (type) => (semantic.deltas.find((d) => d.type === type) ?? null),
        hasDelta: (type, action = null) => semantic.deltas.some((d) => d.type === type && (action == null || d.action === action)),
        semantic,
        previous: semantic.previous,
        next: semantic.next
    };
}
function toComparableSpec(value) {
    if (!value)
        return {};
    return typeof value.toSpec === 'function'
        ? value.toSpec()
        : value;
}
export function sameValue(a, b) {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
export function diffSemanticViewStates(previous = {}, next = {}) {
    const prev = toSemanticState(previous);
    const curr = toSemanticState(next);
    const deltas = [];
    pushDelta(deltas, 'mark', prev.mark, curr.mark);
    pushDelta(deltas, 'key', prev.key, curr.key);
    pushDelta(deltas, 'semantic-key', prev.semanticKey, curr.semanticKey);
    pushCollectionDelta(deltas, 'filter', prev.filters, curr.filters);
    pushDelta(deltas, 'transform', prev.nonFilterTransforms, curr.nonFilterTransforms);
    pushDelta(deltas, 'encoding.x', prev.encoding.x, curr.encoding.x);
    pushDelta(deltas, 'encoding.y', prev.encoding.y, curr.encoding.y);
    pushDelta(deltas, 'encoding.color', prev.encoding.color, curr.encoding.color);
    pushStateDelta(deltas, 'focus', prev.focus, curr.focus);
    pushStateDelta(deltas, 'guide', prev.guide, curr.guide);
    pushStateDelta(deltas, 'granularity', prev.granularity, curr.granularity);
    if (prev.mark === 'bar' || curr.mark === 'bar') {
        appendBarSemanticDeltas(deltas, prev, curr, { pushDelta, pushStateDelta });
    }
    return {
        previous: prev,
        next: curr,
        deltas,
        has: (type, action = null) => deltas.some((d) => d.type === type && (action == null || d.action === action)),
        get: (type) => (deltas.find((d) => d.type === type) ?? null)
    };
}
function toSemanticState(spec) {
    const stateFields = narrativeState(spec);
    const sceneState = stateFields.sceneState ?? {};
    const transforms = (spec.transform ?? []);
    const state = {
        mark: spec.mark ?? null,
        key: narrativeObjectKey(spec),
        semanticKey: narrativeSemanticKey(spec),
        encoding: (spec.encoding ?? {}),
        filters: [
            ...(spec.filter ? [spec.filter] : []),
            ...transforms.filter((t) => t.filter).map((t) => t.filter)
        ],
        nonFilterTransforms: transforms.filter((t) => !t.filter),
        focus: sceneState.focus ?? stateFields.focus ?? null,
        guide: sceneState.guide ?? stateFields.guide ?? null,
        granularity: (sceneState.granularity ?? stateFields.granularity ?? null)
    };
    if (String(spec.mark ?? '').toLowerCase() === 'bar') {
        state.bar = semanticBarState(spec, stateFields);
    }
    return state;
}
export function pushStateDelta(deltas, type, previous, next) {
    if (sameValue(previous, next))
        return;
    deltas.push({ type, action: deltaAction(previous, next), previous: previous ?? null, next: next ?? null });
}
export function pushDelta(deltas, type, previous, next) {
    if (sameValue(previous, next))
        return;
    deltas.push({ type, action: 'change', previous: previous ?? null, next: next ?? null });
}
function pushCollectionDelta(deltas, type, previous = [], next = []) {
    if (sameValue(previous, next))
        return;
    deltas.push({ type, action: collectionDeltaAction(previous, next), previous, next });
}
function deltaAction(previous, next) {
    if (previous == null && next != null)
        return 'add';
    if (previous != null && next == null)
        return 'remove';
    return 'change';
}
function collectionDeltaAction(previous, next) {
    if (!previous.length && next.length)
        return 'add';
    if (previous.length && !next.length)
        return 'remove';
    return 'change';
}
