import {
  keyAccessor,
  semanticKeyForDatum,
  semanticMeasureForDatum
} from "../../identity/semantic-key.js";

export function barKeyAccessor(chart, spec, fallbackField = "id") {
  const fallback = keyAccessor(spec, fallbackField);
  if (chart.transitionPlan?.barKey?.mode !== "semantic" || !spec.semanticKey) {
    return fallback;
  }

  return function semanticJoinKey(d, i) {
    if (this?.dataset?.semanticKey) return this.dataset.semanticKey;
    return semanticKeyForDatum(d, spec) ?? fallback.call(this, d, i);
  };
}

export function applyBarIdentity(selection, spec, key, categoryValue) {
  return selection
    .attr("data-key", function (d, i) {
      return key.call(this, d, i);
    })
    .attr("data-category", categoryValue)
    .attr("data-measure", (d) => semanticMeasureForDatum(d, spec))
    .attr("data-semantic-key", (d) => semanticKeyForDatum(d, spec));
}
