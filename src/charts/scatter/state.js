export function scatterState(spec = {}, enc = {}) {
  const granularity = spec.sceneState?.granularity || spec.granularity || {};
  return {
    parentField: granularity.parentField || enc.color?.field,
    granularityMode: granularity.mode || null
  };
}

export function parentAnchors(rows, parentField, positionForRow) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = parentKey(row, parentField);
    const point = positionForRow(row);
    if (!grouped.has(key)) grouped.set(key, { x: 0, y: 0, count: 0 });
    const anchor = grouped.get(key);
    anchor.x += point.x;
    anchor.y += point.y;
    anchor.count += 1;
  });

  return new Map(
    Array.from(grouped, ([key, anchor]) => [
      key,
      {
        x: anchor.x / anchor.count,
        y: anchor.y / anchor.count
      }
    ])
  );
}

export function parentKey(row, parentField) {
  if (!row || !parentField) return "__all";
  if (Array.isArray(parentField)) return parentField.map((field) => row[field]).join("|");
  return String(row[parentField] ?? "__all");
}

export function radiusScale(rows, channel, fallback, d3, quantitativeDomain) {
  if (!channel?.field) return () => fallback;
  const range = channel.range || [4, 16];
  const scale = d3
    .scaleSqrt()
    .domain(quantitativeDomain(rows, channel, 0))
    .range(range);
  return (row) => scale(Number(row[channel.field]) || 0);
}
