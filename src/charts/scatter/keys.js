import { keyAccessor } from "../../identity/semantic-key.js";

export function scatterKeyAccessor(spec, fallbackField = "id") {
  const rawKey = keyAccessor(spec, fallbackField);
  const mode = spec.sceneState?.granularity?.mode;
  if (!mode) return rawKey;
  return (row, index) => `${mode}:${rawKey(row, index)}`;
}

export function scatterStoredKey(datum, index, key) {
  return datum?.__slScatterJoinKey || key(datum, index);
}

export function applyScatterIdentity(selection, key) {
  return selection
    .each((d, i) => {
      d.__slScatterJoinKey = key(d, i);
    })
    .attr("data-key", (d, i) => key(d, i));
}
