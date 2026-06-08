import { narrativeState } from "../../scrolly-meta.js";
import { colorField } from "./encoding.js";

export function pointState(spec = {}, enc = {}) {
  const state = narrativeState(spec);
  const granularity = state.sceneState?.granularity || state.granularity || {};
  return {
    parentField: parentFromGroupby(granularity.groupby) || granularity.parentField || colorField(enc),
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
  const range = channel.range || defaultRadiusRange(rows.length);
  const scale = d3
    .scaleSqrt()
    .domain(quantitativeDomain(rows, channel, 0))
    .range(range);
  return (row) => scale(Number(row[channel.field]) || 0);
}

export function defaultPointRadius(count) {
  if (count <= 4) return 9;
  if (count <= 12) return 7;
  if (count <= 60) return 5.5;
  return 4.5;
}

function defaultRadiusRange(count) {
  const radius = defaultPointRadius(count);
  return [
    Math.max(3, radius * 0.75),
    Math.max(7, radius * 2.4)
  ];
}

function parentFromGroupby(groupby = null) {
  if (!groupby) return null;
  if (Array.isArray(groupby)) return groupby.length === 1 ? groupby[0] : groupby;
  return groupby;
}
