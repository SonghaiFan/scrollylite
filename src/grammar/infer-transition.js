import { diffViewStates } from "./diff.js?v=semantic-key-17";

export function inferTransition(previous, next) {
  if (!previous) return [];
  const scenes = [];
  const operations = next?.operations?.() || [];
  if (operations.length) {
    const previousOperations = previous?.operations?.() || [];
    const delta = operationDelta(previousOperations, operations);
    scenes.push(...delta);
  }

  const diff = diffViewStates(previous, next);

  if (diff.has("filter") || diff.hasDelta("focus") || filterTransformChanged(diff.previous, diff.next)) {
    scenes.push("focus");
  }
  if (xyObservationChanged(diff)) {
    scenes.push("observation");
  }
  if (
    (diff.has("granularity") || diff.hasDelta("granularity") || diff.hasDelta("bar.granularity")) &&
    !onlyGranularityLayoutChanged(diff.delta("bar.granularity") || diff.delta("granularity"))
  ) {
    scenes.push("granularity");
  }
  if (diff.has("guide") || diff.hasDelta("guide") || diff.hasDelta("bar.guide")) scenes.push("guide");

  return unique(scenes);
}

function filterTransformChanged(previous = {}, next = {}) {
  return !sameJSON(filterTransforms(previous.transform), filterTransforms(next.transform));
}

function filterTransforms(transforms = []) {
  return transforms
    .filter((transform) => transform?.filter)
    .map((transform) => transform.filter);
}

function onlyGranularityLayoutChanged(delta = null) {
  const prevGranularity = delta?.previous || {};
  const nextGranularity = delta?.next || {};
  const prevHasGranularity = Boolean(delta?.previous);
  const nextHasGranularity = Boolean(delta?.next);
  const prevRest = { ...prevGranularity };
  const nextRest = { ...nextGranularity };
  delete prevRest.layout;
  delete nextRest.layout;

  return (
    prevHasGranularity &&
    nextHasGranularity &&
    sameJSON(prevRest, nextRest) &&
    !sameJSON(prevGranularity.layout, nextGranularity.layout)
  );
}

function xyObservationChanged(diff) {
  if (diff.has("transform") || diff.has("filter") || diff.hasDelta("focus")) return false;
  const previousMark = String(diff.previous?.mark || "").toLowerCase();
  const nextMark = String(diff.next?.mark || "").toLowerCase();
  if (previousMark === "bar" || nextMark === "bar") return false;

  return ["x", "y"].some((channel) => {
    const previous = diff.previous?.encoding?.[channel];
    const next = diff.next?.encoding?.[channel];
    return previous?.field && next?.field && previous.field !== next.field;
  });
}

function sameJSON(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function operationDelta(previousOperations, nextOperations) {
  let index = 0;
  while (
    index < previousOperations.length &&
    index < nextOperations.length &&
    previousOperations[index] === nextOperations[index]
  ) {
    index += 1;
  }

  if (index < previousOperations.length && index === nextOperations.length) {
    return previousOperations.slice(index);
  }

  return nextOperations.slice(index);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
