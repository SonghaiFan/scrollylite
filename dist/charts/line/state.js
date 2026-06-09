import { narrativeState } from "../../scrolly-meta.js";
export function lineState(spec = {}, enc = {}) {
    const state = narrativeState(spec);
    const granularity = state.sceneState?.granularity || {};
    return {
        focus: state.sceneState?.focus || state.focus || null,
        seriesField: granularity.seriesField || enc.color?.field || null
    };
}
export function lineSeries(rows, seriesField) {
    if (!seriesField)
        return [{ key: "__line", rows }];
    const grouped = new Map();
    rows.forEach((row) => {
        const key = row[seriesField] ?? "__missing";
        if (!grouped.has(key))
            grouped.set(key, []);
        grouped.get(key).push(row);
    });
    return Array.from(grouped, ([key, values]) => ({
        key: String(key),
        rows: values
    }));
}
export function focusedLineXScale(rows, channel, chart, focus, deps) {
    const { bandOrLinear, d3, niceExtent, position } = deps;
    const baseRange = [0, chart.innerWidth];
    if (!focus?.filter || focus.mode !== "rangeCrop")
        return bandOrLinear(rows, channel, baseRange, d3);
    const focusedRows = rows.filter((row) => rowMatchesFilter(row, focus.filter));
    if (focusedRows.length < 2)
        return bandOrLinear(rows, channel, baseRange, d3);
    if (channel?.type === "quantitative" || channel?.type === "temporal") {
        return bandOrLinear(rows, { ...channel, domain: focusedDomain(focusedRows, channel, d3, niceExtent) }, baseRange, d3);
    }
    const base = bandOrLinear(rows, channel, baseRange, d3);
    const positions = focusedRows
        .map((row) => position(base, row[channel.field]))
        .filter(Number.isFinite);
    if (positions.length < 2)
        return base;
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    if (min === max)
        return base;
    const inset = Math.min(chart.innerWidth * 0.08, 44);
    const factor = (chart.innerWidth - inset * 2) / (max - min);
    return bandOrLinear(rows, channel, [inset - min * factor, inset + (chart.innerWidth - min) * factor], d3);
}
function focusedDomain(rows, channel = {}, d3, niceExtent) {
    if (channel.type === "temporal")
        return d3.extent(rows, (d) => new Date(d[channel.field]));
    return niceExtent(rows, channel.field);
}
function rowMatchesFilter(row, filter = {}) {
    if (!filter?.field)
        return true;
    const value = row[filter.field];
    if ("equal" in filter)
        return value === filter.equal;
    if ("notEqual" in filter)
        return value !== filter.notEqual;
    if ("oneOf" in filter)
        return filter.oneOf.includes(value);
    if ("gte" in filter && value < filter.gte)
        return false;
    if ("gt" in filter && value <= filter.gt)
        return false;
    if ("lte" in filter && value > filter.lte)
        return false;
    if ("lt" in filter && value >= filter.lt)
        return false;
    return Boolean(value);
}
