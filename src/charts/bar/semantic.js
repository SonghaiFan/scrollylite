import { narrativeState } from "../../scrolly-meta.js?v=semantic-key-11";
import {
  barCategoryChannel,
  barMeasureChannel,
  barOrientationFromEncoding,
  isSegmentLayout
} from "./layout/index.js";

export function semanticBarState(spec = {}, semanticState = null) {
  const enc = spec.encoding || {};
  const state = semanticState || semanticStateFromSpec(spec);
  const aggregate = barAggregateState(spec);
  const layout = barLayoutState(spec, state, aggregate);
  const orientation = barOrientationFromEncoding(enc);
  const categoryField = barCategoryChannel(enc)?.field;
  const measureField = barMeasureChannel(enc)?.field;
  const segmentField = barSegmentField(spec, state);
  const guide = barGuideState({ orientation, layout, state });
  const granularity = barGranularityState({ layout, categoryField, measureField, segmentField, state });
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
    guide,
    granularity,
    aggregate,
    segmentField,
    xGeometry: geometry.x,
    yGeometry: geometry.y
  };
}

export function barLayoutState(spec = {}, state = semanticStateFromSpec(spec), aggregate = barAggregateState(spec)) {
  const enc = spec.encoding || {};
  const stateLayout =
    state.sceneState?.guide?.layout ||
    state.sceneState?.granularity?.layout ||
    state.guide?.layout ||
    state.granularity?.layout;
  if (stateLayout) return stateLayout;
  if (enc.xOffset?.field || enc.yOffset?.field) return "grouped";
  if (enc.color?.field && aggregate) return "stacked";
  return "simple";
}

export function barGuideState({ orientation, layout, state = {} }) {
  const explicit = state.sceneState?.guide || state.guide;
  if (explicit) return explicit;
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

export function barGranularityState({ layout, categoryField, measureField, segmentField, state = {} }) {
  const explicit = state.sceneState?.granularity || state.granularity;
  if (explicit) return explicit;
  if (!isSegmentLayout(layout) || !segmentField) return null;
  return {
    layout,
    categoryField: categoryField || null,
    segmentField,
    valueField: measureField || null
  };
}

export function barAggregateState(spec = {}) {
  const aggregateTransforms = (spec.transform || [])
    .filter((transform) => transform?.aggregate)
    .map((transform) => transform.aggregate);
  if (!aggregateTransforms.length) return null;
  return aggregateTransforms.length === 1 ? aggregateTransforms[0] : aggregateTransforms;
}

export function barSegmentField(spec = {}, state = semanticStateFromSpec(spec)) {
  return (
    state.sceneState?.granularity?.segmentField ||
    state.granularity?.segmentField ||
    spec.encoding?.xOffset?.field ||
    spec.encoding?.yOffset?.field ||
    spec.encoding?.color?.field ||
    null
  );
}

function semanticStateFromSpec(spec = {}) {
  const state = narrativeState(spec);
  return {
    ...state,
    filters: [
      ...(spec.filter ? [spec.filter] : []),
      ...(spec.transform || []).filter((transform) => transform?.filter).map((transform) => transform.filter)
    ]
  };
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
        segment: layout === "stacked" ? segment : null,
        channel: channelSignature(enc.x)
      },
      y: {
        orientation,
        layout,
        category,
        segment: layout === "grouped" ? segment : null,
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
