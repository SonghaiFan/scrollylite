import {
  barCategoryChannel,
  barMeasureChannel,
  barOrientationFromEncoding,
  isSegmentLayout
} from "./layout.js";

export function semanticBarState(spec = {}, state = {}) {
  const enc = spec.encoding || {};
  const aggregate = barAggregateState(spec);
  const layout = barLayoutState(spec, state, aggregate);
  const orientation = barOrientationFromEncoding(enc);
  const categoryField = barCategoryChannel(enc)?.field;
  const measureField = barMeasureChannel(enc)?.field;
  const segmentField =
    state.granularity?.segmentField ||
    enc.xOffset?.field ||
    enc.yOffset?.field ||
    enc.color?.field ||
    null;
  const geometry = barGeometryState({
    enc,
    filters: state.filters,
    layout,
    orientation,
    categoryField,
    measureField,
    segmentField
  });

  return {
    orientation,
    layout,
    categoryField,
    measureField,
    guide: barGuideState({ orientation, layout, state }),
    granularity: barGranularityState({ layout, categoryField, measureField, segmentField, state }),
    aggregate,
    segmentField,
    xGeometry: geometry.x,
    yGeometry: geometry.y
  };
}

function barLayoutState(spec = {}, state = {}, aggregate = null) {
  const enc = spec.encoding || {};
  const stateLayout = state.guide?.layout || state.granularity?.layout;
  if (stateLayout) return stateLayout;
  if (enc.xOffset?.field || enc.yOffset?.field) return "grouped";
  if (enc.color?.field && aggregate) return "stacked";
  return "simple";
}

function barGuideState({ orientation, layout, state = {} }) {
  if (state.guide) return state.guide;
  if (orientation === "horizontal") {
    return {
      orientation,
      staging: { order: ["y", "x"] }
    };
  }
  if (layout === "grouped") {
    return {
      layout,
      staging: { order: ["x", "y"] }
    };
  }
  return null;
}

function barGranularityState({ layout, categoryField, measureField, segmentField, state = {} }) {
  if (state.granularity) return state.granularity;
  if (!isSegmentLayout(layout) || !segmentField) return null;
  return {
    layout,
    segmentField,
    valueField: measureField || null,
    categoryField: categoryField || null
  };
}

function barAggregateState(spec = {}) {
  const aggregateTransforms = (spec.transform || [])
    .filter((transform) => transform?.aggregate)
    .map((transform) => transform.aggregate);
  if (!aggregateTransforms.length) return null;
  return aggregateTransforms.length === 1 ? aggregateTransforms[0] : aggregateTransforms;
}

function barGeometryState({ enc, filters, layout, orientation, categoryField, measureField, segmentField }) {
  const category = {
    role: "category",
    field: categoryField || null,
    filters
  };
  const measure = {
    role: "measure",
    field: measureField || null
  };
  const segment = segmentField
    ? {
        field: segmentField,
        color: channelSignature(enc.color)
      }
    : null;

  if (orientation === "horizontal") {
    return {
      x: {
        orientation,
        layout,
        measure,
        channel: channelSignature(enc.x)
      },
      y: {
        orientation,
        layout,
        category,
        channel: channelSignature(enc.y)
      }
    };
  }

  return {
    x: {
      orientation,
      layout,
      category,
      segment: layout === "grouped" ? segment : null,
      channel: channelSignature(enc.x)
    },
    y: {
      orientation,
      layout,
      measure,
      segment: layout === "stacked" ? segment : null,
      channel: channelSignature(enc.y)
    }
  };
}

function channelSignature(channel = {}) {
  return {
    field: channel.field || null,
    title: channel.title || null,
    type: channel.type || null,
    aggregate: channel.aggregate || null,
    domain: channel.domain || null,
    scale: channel.scale || null,
    sort: channel.sort || null,
    bin: channel.bin || null
  };
}
