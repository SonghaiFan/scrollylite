import {
  narrativeObjectKey,
  narrativeSemanticKey,
  narrativeState
} from "../scrolly-meta.js";
import {
  appendBarSemanticDeltas,
  semanticBarState
} from "../charts/bar/diff.js";

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

  if (prev.mark === "bar" || curr.mark === "bar") {
    appendBarSemanticDeltas(deltas, prev, curr, { pushDelta, pushStateDelta });
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
    granularity: sceneState.granularity || stateFields.granularity || null
  };

  if (String(spec.mark || "").toLowerCase() === "bar") {
    state.bar = semanticBarState(spec, state);
  }

  return state;
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
