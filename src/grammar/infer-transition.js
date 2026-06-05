import { diffViewStates } from "./diff.js";

export function inferTransition(previous, next) {
  if (!previous) return [];
  const operations = next?.operations?.() || [];
  if (operations.length) return unique(operations);

  const diff = diffViewStates(previous, next);
  const scenes = [];

  if (diff.has("filter")) scenes.push("focus");
  if (diff.has("observation")) scenes.push("observation");
  if (diff.has("granularity")) scenes.push("granularity");
  if (diff.has("guide")) scenes.push("guide");

  return unique(scenes);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
