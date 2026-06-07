import {
  narrativeObjectKey,
  narrativeSemanticKey,
  narrativeState
} from "../scrolly-meta.js?v=semantic-key-10";
import {
  barCategoryChannel,
  barMeasureChannel,
  barOrientationFromEncoding,
  isSegmentLayout
} from "../charts/bar/layout.js";

export function diffViewStates(previous, next) {
  const prev = comparableSpec(previous);
  const curr = comparableSpec(next);
  const changed = [];

  if (!sameValue(prev.mark, curr.mark)) changed.push("mark");
  if (!sameValue(prev.key, curr.key)) changed.push("key");
  if (!sameValue(prev.transform, curr.transform)) changed.push("transform");
  if (!sameValue(prev.filter, curr.filter)) changed.push("filter");
  if (!sameValue(prev.encoding?.x, curr.encoding?.x)) changed.push("encoding.x");
  if (!sameValue(prev.encoding?.y, curr.encoding?.y)) changed.push("encoding.y");
  if (!sameValue(prev.encoding?.color, curr.encoding?.color)) changed.push("encoding.color");
  if (!sameValue(prev.guide, curr.guide)) changed.push("guide");
  if (!sameValue(prev.granularity, curr.granularity)) changed.push("granularity");
  if (!sameValue(prev.observation, curr.observation)) changed.push("observation");

  const semantic = diffSemanticViewStates(prev, curr);

  return {
    changed,
    has: (key) => changed.includes(key),
    deltas: semantic.deltas,
    delta: (type) => semantic.deltas.find((item) => item.type === type) || null,
    hasDelta: (type, action = null) =>
      semantic.deltas.some((item) => item.type === type && (action == null || item.action === action)),
    semantic,
    previous: prev,
    next: curr
  };
}

function comparableSpec(value) {
  const spec = value?.toSpec ? value.toSpec() : value || {};
  return spec;
}

export function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function diffSemanticViewStates(previous = {}, next = {}) {
  const prev = semanticState(previous);
  const curr = semanticState(next);
  const deltas = [];

  pushDelta(deltas, "mark", prev.mark, curr.mark);
  pushDelta(deltas, "key", prev.key, curr.key);
  pushDelta(deltas, "semantic-key", prev.semanticKey, curr.semanticKey);
  pushCollectionDelta(deltas, "filter", prev.filters, curr.filters);
  pushDelta(deltas, "transform", prev.nonFilterTransforms, curr.nonFilterTransforms);
  pushDelta(deltas, "encoding.x", prev.encoding.x, curr.encoding.x);
  pushDelta(deltas, "encoding.y", prev.encoding.y, curr.encoding.y);
  pushDelta(deltas, "encoding.color", prev.encoding.color, curr.encoding.color);
  pushStateDelta(deltas, "focus", prev.focus, curr.focus);
  pushStateDelta(deltas, "guide", prev.guide, curr.guide);
  pushStateDelta(deltas, "granularity", prev.granularity, curr.granularity);
  pushStateDelta(deltas, "observation", prev.observation, curr.observation);

  if (prev.mark === "bar" || curr.mark === "bar") {
    pushDelta(deltas, "bar.orientation", prev.bar?.orientation, curr.bar?.orientation);
    pushDelta(deltas, "bar.layout", prev.bar?.layout, curr.bar?.layout);
    pushDelta(deltas, "bar.category-field", prev.bar?.categoryField, curr.bar?.categoryField);
    pushDelta(deltas, "bar.measure-field", prev.bar?.measureField, curr.bar?.measureField);
    pushStateDelta(deltas, "bar.guide", prev.bar?.guide, curr.bar?.guide);
    pushStateDelta(deltas, "bar.granularity", prev.bar?.granularity, curr.bar?.granularity);
    pushStateDelta(deltas, "bar.aggregate", prev.bar?.aggregate, curr.bar?.aggregate);
    pushDelta(deltas, "bar.segment-field", prev.bar?.segmentField, curr.bar?.segmentField);
    pushDelta(deltas, "bar.x-geometry", prev.bar?.xGeometry, curr.bar?.xGeometry);
    pushDelta(deltas, "bar.y-geometry", prev.bar?.yGeometry, curr.bar?.yGeometry);
  }

  return {
    previous: prev,
    next: curr,
    deltas,
    has: (type, action = null) =>
      deltas.some((item) => item.type === type && (action == null || item.action === action)),
    get: (type) => deltas.find((item) => item.type === type) || null
  };
}

function semanticState(spec = {}) {
  const stateFields = narrativeState(spec);
  const sceneState = stateFields.sceneState || {};
  const transforms = spec.transform || [];
  const state = {
    mark: spec.mark || null,
    key: narrativeObjectKey(spec),
    semanticKey: narrativeSemanticKey(spec),
    encoding: spec.encoding || {},
    filters: [
      ...(spec.filter ? [spec.filter] : []),
      ...transforms.filter((transform) => transform?.filter).map((transform) => transform.filter)
    ],
    nonFilterTransforms: transforms.filter((transform) => !transform?.filter),
    focus: sceneState.focus || stateFields.focus || null,
    guide: sceneState.guide || stateFields.guide || null,
    granularity: sceneState.granularity || stateFields.granularity || null,
    observation: sceneState.observation || stateFields.observation || null
  };

  if (String(spec.mark || "").toLowerCase() === "bar") {
    state.bar = semanticBarState(spec, state);
  }

  return state;
}

function semanticBarState(spec = {}, state = semanticState(spec)) {
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

function pushStateDelta(deltas, type, previous, next) {
  if (sameValue(previous, next)) return;
  deltas.push({
    type,
    action: deltaAction(previous, next),
    previous: previous ?? null,
    next: next ?? null
  });
}

function pushDelta(deltas, type, previous, next) {
  if (sameValue(previous, next)) return;
  deltas.push({
    type,
    action: "change",
    previous: previous ?? null,
    next: next ?? null
  });
}

function pushCollectionDelta(deltas, type, previous = [], next = []) {
  if (sameValue(previous, next)) return;
  deltas.push({
    type,
    action: collectionDeltaAction(previous, next),
    previous,
    next
  });
}

function deltaAction(previous, next) {
  if (previous == null && next != null) return "add";
  if (previous != null && next == null) return "remove";
  return "change";
}

function collectionDeltaAction(previous = [], next = []) {
  if (!previous.length && next.length) return "add";
  if (previous.length && !next.length) return "remove";
  return "change";
}
