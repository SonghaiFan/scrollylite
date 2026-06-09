import type { ChannelSpec, ViewSpec } from '../../types/index.js';
import { narrativeState } from '../../scrolly-meta.js';
import { colorField } from './encoding.js';

interface PointState {
  parentField: string | string[] | null;
  granularityMode: string | null;
}

interface ParentAnchor {
  x: number;
  y: number;
}

interface DodgeCircle {
  x: number;
  y: number;
  data: Record<string, unknown>;
  next?: DodgeCircle;
}

export function pointState(spec: ViewSpec = {}, enc: Record<string, ChannelSpec> = {}): PointState {
  const state = narrativeState(spec);
  const granularity = ((state.sceneState as Record<string, unknown> | undefined)?.['granularity'] as Record<string, unknown> | undefined)
    || (state.granularity as Record<string, unknown> | undefined)
    || {};
  return {
    parentField: parentFromGroupby(granularity['groupby'] as string[] | null) || (granularity['parentField'] as string | null) || colorField(enc),
    granularityMode: (granularity['mode'] as string) || null
  };
}

export function parentAnchors(
  rows: Record<string, unknown>[],
  parentField: string | string[] | null,
  positionForRow: (row: Record<string, unknown>) => { x: number; y: number }
): Map<string, ParentAnchor> {
  const grouped = new Map<string, { x: number; y: number; count: number }>();
  rows.forEach((row) => {
    const key = parentKey(row, parentField);
    const point = positionForRow(row);
    if (!grouped.has(key)) grouped.set(key, { x: 0, y: 0, count: 0 });
    const anchor = grouped.get(key)!;
    anchor.x += point.x;
    anchor.y += point.y;
    anchor.count += 1;
  });

  return new Map(
    Array.from(grouped, ([key, anchor]) => [
      key,
      { x: anchor.x / anchor.count, y: anchor.y / anchor.count }
    ])
  );
}

export function parentKey(row: Record<string, unknown>, parentField: string | string[] | null): string {
  if (!row || !parentField) return '__all';
  if (Array.isArray(parentField)) return parentField.map((field) => row[field]).join('|');
  return String(row[parentField] ?? '__all');
}

export function radiusScale(
  rows: Record<string, unknown>[],
  channel: ChannelSpec | null | undefined,
  fallback: number,
  d3: unknown,
  quantitativeDomain: (rows: unknown[], channel: unknown, floor?: number) => [number, number]
): (row: Record<string, unknown>) => number {
  if (!channel?.field) return () => fallback;
  const range = (channel as Record<string, unknown>)['range'] as [number, number] || defaultRadiusRange(rows.length);
  const d3Obj = d3 as Record<string, unknown>;
  const scale = (d3Obj['scaleSqrt'] as () => unknown)() as {
    domain(d: [number, number]): { range(r: [number, number]): (v: number) => number };
    range(r: [number, number]): (v: number) => number;
  };
  const scaleWithDomain = scale.domain(quantitativeDomain(rows, channel, 0)).range(range) as (v: number) => number;
  return (row: Record<string, unknown>) => scaleWithDomain(Number(row[channel.field!]) || 0);
}

export function defaultPointRadius(count: number): number {
  if (count <= 4) return 9;
  if (count <= 12) return 7;
  if (count <= 60) return 5.5;
  return 4.5;
}

function defaultRadiusRange(count: number): [number, number] {
  const radius = defaultPointRadius(count);
  return [Math.max(3, radius * 0.75), Math.max(7, radius * 2.4)];
}

function parentFromGroupby(groupby: string[] | null): string | string[] | null {
  if (!groupby) return null;
  if (Array.isArray(groupby)) return groupby.length === 1 ? groupby[0] : groupby;
  return groupby;
}
