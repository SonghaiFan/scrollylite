import { keyAccessor } from "../../identity/semantic-key.js";
import { narrativeState } from "../../scrolly-meta.js";
export function pointKeyAccessor(spec, fallbackField = "id") {
    const rawKey = keyAccessor(spec, fallbackField);
    const mode = narrativeState(spec).sceneState?.granularity?.mode;
    if (!mode)
        return rawKey;
    return (row, index) => `${mode}:${rawKey(row, index)}`;
}
export function pointStoredKey(datum, index, key) {
    return datum?.__slPointJoinKey || key(datum, index);
}
export function applyPointIdentity(selection, key) {
    return selection
        .each((d, i) => {
        d.__slPointJoinKey = key(d, i);
    })
        .attr("data-key", (d, i) => key(d, i));
}
