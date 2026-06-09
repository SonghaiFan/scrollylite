import { keyAccessor } from '../../identity/semantic-key.js';
import { narrativeState } from '../../scrolly-meta.js';
export function pointKeyAccessor(spec, fallbackField = 'id') {
    const rawKey = keyAccessor(spec, fallbackField);
    const mode = narrativeState(spec).sceneState?.['granularity'];
    const granularityMode = mode?.['mode'];
    if (!granularityMode)
        return rawKey;
    return (row, index) => `${granularityMode}:${rawKey(row, index)}`;
}
export function pointStoredKey(datum, index, key) {
    return datum['__slPointJoinKey'] || key(datum, index);
}
export function applyPointIdentity(selection, key) {
    const sel = selection;
    return sel
        .each(function (d, i) {
        d['__slPointJoinKey'] = key(d, i);
    })
        .attr('data-key', (d, i) => key(d, i));
}
