import {
  compileCartesianCoordinate,
  compileCartesianScale,
  compileFilter,
  compileHighlight,
  identitySpec,
  selectorToFilter,
  withSceneState
} from "../compiler-utils.js";

export function createLineSpecCompiler(context = {}) {
  return {
    base: compileLineBase,
    operations: {
      filter: compileLineFilter,
      highlight: compileHighlight,
      coordinate: compileLineCoordinate,
      scale: compileLineScale,
      aggregate: compileLineAggregate,
      layout: compileLineLayout,
      series: compileLineSeries
    }
  };
}

function compileLineBase(spec, context = {}) {
  return identitySpec(spec);
}

function compileLineFilter(spec, focusSpec = {}, context = {}) {
  const filter = focusSpec.filter || selectorToFilter(focusSpec);
  if (!filter) return spec;

  if (focusSpec.mode === "filter" || focusSpec.mode === "highlight") {
    return focusSpec.mode === "highlight"
      ? compileHighlight(spec, focusSpec, context)
      : compileFilter(spec, focusSpec, context);
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

function compileLineCoordinate(spec, operationSpec = {}, context = {}) {
  return compileCartesianCoordinate(spec, operationSpec, context);
}

function compileLineScale(spec, operationSpec = {}, context = {}) {
  return compileCartesianScale(spec, operationSpec, context);
}

function compileLineAggregate(spec, granularitySpec = {}, context = {}) {
  return compileLineSeries(spec, granularitySpec, context);
}

function compileLineSeries(spec, granularitySpec = {}, context = {}) {
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

function compileLineLayout(spec, operationSpec = {}, context = {}) {
  return spec;
}
