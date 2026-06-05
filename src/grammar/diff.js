export function diffViewStates(previous, next) {
  const prev = previous?.toSpec ? previous.toSpec() : previous || {};
  const curr = next?.toSpec ? next.toSpec() : next || {};
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

  return {
    changed,
    has: (key) => changed.includes(key),
    previous: prev,
    next: curr
  };
}

export function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
