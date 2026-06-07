import {
  keyAccessor,
  semanticKeyForDatum,
  semanticMeasureForDatum
} from "../../identity/semantic-key.js";
import { narrativeSemanticKey } from "../../scrolly-meta.js?v=semantic-key-10";

export function barKeyAccessor(chart, spec, fallbackField = "id") {
  const fallback = keyAccessor(spec, fallbackField);
  const keyPlan = chart.transitionPlan?.key || chart.transitionPlan?.barKey;
  if (keyPlan?.mode !== "semantic" || !narrativeSemanticKey(spec)) {
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
