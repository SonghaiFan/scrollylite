import { narrativeState } from '../../scrolly-meta.js';
export function lineState(spec = {}, enc = {}) {
    const state = narrativeState(spec);
    const granularity = state.sceneState?.['granularity'] ?? {};
    return {
        focus: (state.sceneState?.['focus'] || state.focus || null),
        seriesField: granularity['seriesField'] || enc['color']?.field || null
    };
}
export function lineSeries(rows, seriesField) {
    if (!seriesField)
        return [{ key: '__line', rows }];
    const grouped = new Map();
    rows.forEach((row) => {
        const key = String(row[seriesField] ?? '__missing');
        if (!grouped.has(key))
            grouped.set(key, []);
        grouped.get(key).push(row);
    });
    return Array.from(grouped, ([key, values]) => ({ key, rows: values }));
}
export function focusedLineXScale(rows, channel, chart, focus, deps) {
    const { bandOrLinear, d3, niceExtent, position } = deps;
    const baseRange = [0, chart['innerWidth']];
    if (!focus?.filter || focus['mode'] !== 'rangeCrop') {
        return bandOrLinear(rows, channel, baseRange, d3);
    }
    const focusedRows = rows.filter((row) => rowMatchesFilter(row, focus.filter));
    if (focusedRows.length < 2) {
        return bandOrLinear(rows, channel, baseRange, d3);
    }
    const base = bandOrLinear(rows, channel, baseRange, d3);
    if (channel?.type === 'quantitative' || channel?.type === 'temporal') {
        const domain = focusedDomain(focusedRows, channel, d3, niceExtent);
        return bandOrLinear(rows, { ...channel, domain }, baseRange, d3);
    }
    const positionFn = position;
    const positions = focusedRows
        .map((row) => positionFn(base, row[channel?.field ?? '']))
        .filter(Number.isFinite);
    if (positions.length < 2)
        return base;
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    if (min === max)
        return base;
    const innerWidth = chart['innerWidth'];
    const inset = Math.min(innerWidth * 0.08, 44);
    const factor = (innerWidth - inset * 2) / (max - min);
    return bandOrLinear(rows, channel, [inset - min * factor, inset + (innerWidth - min) * factor], d3);
}
function focusedDomain(rows, channel, d3, niceExtent) {
    const d3Obj = d3;
    if (channel.type === 'temporal') {
        return d3Obj['extent'](rows, (d) => new Date(d[channel.field]));
    }
    return niceExtent(rows, channel.field);
}
function rowMatchesFilter(row, filter) {
    if (!filter?.['field'])
        return true;
    const value = row[filter['field']];
    if ('equal' in filter)
        return value === filter['equal'];
    if ('notEqual' in filter)
        return value !== filter['notEqual'];
    if ('oneOf' in filter)
        return filter['oneOf'].includes(value);
    if ('gte' in filter && value < filter['gte'])
        return false;
    if ('gt' in filter && value <= filter['gt'])
        return false;
    if ('lte' in filter && value > filter['lte'])
        return false;
    if ('lt' in filter && value >= filter['lt'])
        return false;
    return Boolean(value);
}
