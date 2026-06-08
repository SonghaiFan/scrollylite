import {
  applyFilterFocus,
  applyXYGuide,
  applyXYObservation,
  identitySpec,
  selectorToFilter,
  withSceneState
} from "../compiler-utils.js?v=semantic-key-1";

export function createLineSceneCompiler() {
  return {
    base: identitySpec,
    scenes: {
      focus: applyLineFocus,
      guide: applyXYGuide,
      granularity: applyLineGranularity,
      observation: applyXYObservation
    }
  };
}

function applyLineFocus(spec, focusSpec = {}) {
  const filter = focusSpec.filter || selectorToFilter(focusSpec);
  if (!filter) return spec;

  if (focusSpec.mode === "filter" || focusSpec.mode === "highlight") {
    return applyFilterFocus(spec, focusSpec);
  }

  return withSceneState({
    ...spec
  }, {
    focus: {
      filter,
      mode: focusSpec.mode || "rangeCrop",
      crop: focusSpec.crop !== false
    }
  });
}

function applyLineGranularity(spec, granularitySpec = {}) {
  const mode = granularitySpec.mode || "series";
  const encoding = { ...(spec.encoding || {}) };
  const seriesField = granularitySpec.series || granularitySpec.field || encoding.color?.field;

  if (mode === "series" && seriesField) {
    encoding.color =
      granularitySpec.color || {
        field: seriesField,
        type: "nominal",
        range: granularitySpec.range || ["#2f7d7e", "#8d6e3f", "#b05d3b"]
      };
  }

  if (mode === "single" && granularitySpec.color) {
    encoding.color = granularitySpec.color;
  }

  return withSceneState({
    ...spec,
    encoding
  }, {
    granularity: {
      mode,
      seriesField: mode === "series" ? seriesField : null
    }
  });
}
