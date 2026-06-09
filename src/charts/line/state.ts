import type { ChannelSpec, FocusSpec, ViewSpec } from '../../types/index.js';
import { narrativeState } from '../../scrolly-meta.js';

interface LineState {
  focus: FocusSpec | null;
  seriesField: string | null;
}

interface LineSeries {
  key: string;
  rows: Record<string, unknown>[];
}

export function lineState(spec: ViewSpec = {}, enc: Record<string, ChannelSpec> = {}): LineState {
  const state = narrativeState(spec);
  const granularity = (state.sceneState as Record<string, unknown> | undefined)?.['granularity'] as Record<string, unknown> | undefined ?? {};
  return {
    focus: ((state.sceneState as Record<string, unknown> | undefined)?.['focus'] || state.focus || null) as FocusSpec | null,
    seriesField: (granularity['seriesField'] as string) || enc['color']?.field || null
  };
}

export function lineSeries(rows: Record<string, unknown>[], seriesField: string | null): LineSeries[] {
  if (!seriesField) return [{ key: '__line', rows }];

  const grouped = new Map<string, Record<string, unknown>[]>();
  rows.forEach((row) => {
    const key = String(row[seriesField] ?? '__missing');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  });

  return Array.from(grouped, ([key, values]) => ({ key, rows: values }));
}

export function focusedLineXScale(
  rows: Record<string, unknown>[],
  channel: ChannelSpec | undefined,
  chart: Record<string, unknown>,
  focus: FocusSpec | null,
  deps: Record<string, unknown>
): unknown {
  const { bandOrLinear, d3, niceExtent, position } = deps;
  const baseRange = [0, chart['innerWidth'] as number];
  if (!focus?.filter || (focus as Record<string, unknown>)['mode'] !== 'rangeCrop') {
    return (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(rows, channel, baseRange, d3);
  }

  const focusedRows = rows.filter((row) => rowMatchesFilter(row, focus.filter as Record<string, unknown>));
  if (focusedRows.length < 2) {
    return (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(rows, channel, baseRange, d3);
  }

  const base = (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(rows, channel, baseRange, d3);

  if (channel?.type === 'quantitative' || channel?.type === 'temporal') {
    const domain = focusedDomain(focusedRows, channel, d3 as unknown, niceExtent as unknown);
    return (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(
      rows,
      { ...channel, domain },
      baseRange,
      d3
    );
  }

  const positionFn = position as (scale: unknown, value: unknown) => number;
  const positions = focusedRows
    .map((row) => positionFn(base, row[channel?.field ?? '']))
    .filter(Number.isFinite);
  if (positions.length < 2) return base;

  const min = Math.min(...positions);
  const max = Math.max(...positions);
  if (min === max) return base;

  const innerWidth = chart['innerWidth'] as number;
  const inset = Math.min(innerWidth * 0.08, 44);
  const factor = (innerWidth - inset * 2) / (max - min);
  return (bandOrLinear as (rows: unknown[], ch: unknown, range: number[], d3: unknown) => unknown)(
    rows,
    channel,
    [inset - min * factor, inset + (innerWidth - min) * factor],
    d3
  );
}

function focusedDomain(
  rows: Record<string, unknown>[],
  channel: ChannelSpec,
  d3: unknown,
  niceExtent: unknown
): unknown[] {
  const d3Obj = d3 as Record<string, unknown>;
  if (channel.type === 'temporal') {
    return (d3Obj['extent'] as (rows: unknown[], fn: (d: unknown) => unknown) => unknown[])(
      rows,
      (d) => new Date((d as Record<string, unknown>)[channel.field!] as string)
    );
  }
  return (niceExtent as (rows: unknown[], field: string) => unknown[])(rows, channel.field!);
}

function rowMatchesFilter(row: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  if (!filter?.['field']) return true;
  const value = row[filter['field'] as string];
  if ('equal' in filter) return value === filter['equal'];
  if ('notEqual' in filter) return value !== filter['notEqual'];
  if ('oneOf' in filter) return (filter['oneOf'] as unknown[]).includes(value);
  if ('gte' in filter && (value as number) < (filter['gte'] as number)) return false;
  if ('gt' in filter && (value as number) <= (filter['gt'] as number)) return false;
  if ('lte' in filter && (value as number) > (filter['lte'] as number)) return false;
  if ('lt' in filter && (value as number) >= (filter['lt'] as number)) return false;
  return Boolean(value);
}
