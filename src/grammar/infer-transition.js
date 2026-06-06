import { diffViewStates } from "./diff.js";

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

  if (diff.has("filter") || filterTransformChanged(diff.previous, diff.next)) {
    scenes.push("focus");
  }
  if (diff.has("observation")) scenes.push("observation");
  if (diff.has("granularity") && !onlyGranularityLayoutChanged(diff.previous, diff.next)) {
    scenes.push("granularity");
  }
  if (diff.has("guide")) scenes.push("guide");

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

function onlyGranularityLayoutChanged(previous = {}, next = {}) {
  const prevGranularity = previous.granularity || {};
  const nextGranularity = next.granularity || {};
  const prevRest = { ...prevGranularity };
  const nextRest = { ...nextGranularity };
  delete prevRest.layout;
  delete nextRest.layout;

  return (
    previous.granularity &&
    next.granularity &&
    sameJSON(prevRest, nextRest) &&
    !sameJSON(prevGranularity.layout, nextGranularity.layout)
  );
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
