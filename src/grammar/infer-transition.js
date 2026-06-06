import { diffViewStates } from "./diff.js";

export function inferTransition(previous, next) {
  if (!previous) return [];
  const operations = next?.operations?.() || [];
  if (operations.length) {
    const previousOperations = previous?.operations?.() || [];
    const delta = operationDelta(previousOperations, operations);
    if (delta.length) return unique(delta);
  }

  const diff = diffViewStates(previous, next);
  const scenes = [];

  if (diff.has("filter")) scenes.push("focus");
  if (diff.has("observation")) scenes.push("observation");
  if (diff.has("granularity") && !onlyGranularityLayoutChanged(diff.previous, diff.next)) {
    scenes.push("granularity");
  }
  if (diff.has("guide")) scenes.push("guide");

  return unique(scenes);
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
