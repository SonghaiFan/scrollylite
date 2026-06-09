// @ts-nocheck — D3 rendering code; typed via deps injection
import { applyBarIdentity, barKeyAccessor } from '../keys.js';
import { barCategoryChannel, barMeasureChannel, barOrientationFromEncoding, barRendererKey } from './index.js';
import { narrativeState } from '../../../scrolly-meta.js';
export function createStackedBarRenderer(deps, kit) {
    const { bindTooltip, channelDomain, colorScale, drawGrid, drawXAxis, drawYAxis, position, updateGrid } = deps;
    return function renderStackedBar(chart, rows, spec, tooltip, d3, segmentField) {
        const enc = spec.encoding || {};
        const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
        const orientation = barOrientationFromEncoding(enc);
        const horizontal = orientation === 'horizontal';
        const rendererOrientation = barRendererKey('stacked', orientation);
        const categoryChannel = barCategoryChannel(enc);
        const measureChannel = barMeasureChannel(enc);
        const categoryField = categoryChannel?.field;
        const valueField = measureChannel?.field;
        const state = narrativeState(spec);
        const stateSegments = state.sceneState?.granularity?.segments || state.granularity?.segments;
        const categories = channelDomain(rows, categoryChannel);
        const segments = channelDomain(rows, { field: segmentField, domain: stateSegments });
        const color = colorScale(domainRows, enc.color, d3);
        const key = barKeyAccessor(chart, spec, [categoryField, segmentField]);
        const splitLineage = kit.splitLineage(chart, categoryField);
        const stackBaseEnter = kit.baselineEnterPlan(chart, 'stack-base');
        const stackBaseExit = kit.baselineExitPlan(chart, 'stack-base');
        const categoryScale = d3.scaleBand().domain(categories)
            .range(horizontal ? [0, chart.innerHeight] : [0, chart.innerWidth]).padding(0.24);
        const stackedRows = stackBarRows(rows, categoryField, segmentField, valueField, segments);
        const domainStackedRows = stackBarRows(domainRows, categoryField, segmentField, valueField, segments);
        const stackDomain = stackedValueDomain(domainStackedRows, measureChannel, d3);
        const measureScale = d3.scaleLinear().domain(stackDomain)
            .range(horizontal ? [0, chart.innerWidth] : [chart.innerHeight, 0]).nice();
        const x = horizontal ? measureScale : categoryScale;
        const y = horizontal ? categoryScale : measureScale;
        const geom = { x, y, categoryField, valueField, chart, horizontal };
        const updatePlan = kit.updateStage(chart, rendererOrientation, d3);
        const xAxisTransition = kit.axisTransition(updatePlan, 'x', d3) || chart.transition.base;
        const yAxisTransition = kit.axisTransition(updatePlan, 'y', d3) || chart.transition.base;
        const geometry = stackedSegmentGeometryContract(geom, splitLineage, stackBaseEnter, stackBaseExit, kit.sourceBaselineExit);
        chart.scales = { x, y, color, orientation: rendererOrientation };
        chart.channels = enc;
        chart.position = {
            x: (d) => horizontal ? x((d.__stack0 + d.__stack1) / 2) : position(x, d[categoryField]),
            y: (d) => horizontal ? position(y, d[categoryField]) : y((d.__stack0 + d.__stack1) / 2)
        };
        if (horizontal)
            updateGrid(chart, null, d3, yAxisTransition);
        else
            drawGrid(chart, y, d3, yAxisTransition);
        drawXAxis(chart, x, enc.x?.title, d3, xAxisTransition);
        drawYAxis(chart, y, enc.y?.title, d3, yAxisTransition);
        kit.renderBarJoin({
            chart, rows: stackedRows, spec, tooltip, d3, bindTooltip, key,
            category: (d) => d[categoryField],
            className: 'sl-bar sl-bar-segment sl-bar-stacked',
            orientation: rendererOrientation, rx: 2,
            fill: (d) => color(d),
            applyIdentity: applyBarIdentity, updatePlan, geometry
        });
    };
}
function stackedSegmentGeometryContract(geom, splitLineage, stackBaseEnter, stackBaseExit, sourceBaselineExit) {
    return {
        start: (d) => splitLineage?.start(d) || stackedSegmentEnterGeometry(d, geom, stackBaseEnter),
        target: stackedSegmentGeometry(geom),
        applyX: (selection) => applyStackedSegmentX(selection, geom),
        applyY: (selection) => applyStackedSegmentY(selection, geom),
        apply: (selection) => applyStackedSegmentGeometry(selection, geom),
        exit: splitLineage ? null : (selection) => applyStackedSegmentExitGeometry(selection, geom, stackBaseExit, sourceBaselineExit)
    };
}
function stackedSegmentEnterGeometry(d, geom, enterPlan = null) {
    const { x, y, categoryField, horizontal } = geom;
    const base = stackSegmentBase(d, enterPlan);
    if (horizontal) {
        return { x: x(base), y: y(d[categoryField]), width: 0, height: Math.max(1, y.bandwidth()) };
    }
    return { x: x(d[categoryField]), y: y(base), width: Math.max(1, x.bandwidth()), height: 0 };
}
function applyStackedSegmentGeometry(selection, geom) {
    applyStackedSegmentX(selection, geom);
    applyStackedSegmentY(selection, geom);
    return selection;
}
function stackedSegmentGeometry(geom) {
    const { x, y, categoryField, horizontal } = geom;
    if (horizontal) {
        return {
            x: (d) => Math.min(x(d.__stack0), x(d.__stack1)),
            width: (d) => Math.abs(x(d.__stack1) - x(d.__stack0)),
            y: (d) => y(d[categoryField]),
            height: Math.max(1, y.bandwidth())
        };
    }
    return {
        x: (d) => x(d[categoryField]),
        width: Math.max(1, x.bandwidth()),
        y: (d) => Math.min(y(d.__stack0), y(d.__stack1)),
        height: (d) => Math.abs(y(d.__stack1) - y(d.__stack0))
    };
}
function applyStackedSegmentX(selection, geom) {
    const { x, categoryField, horizontal } = geom;
    if (horizontal) {
        return selection.attr('x', (d) => Math.min(x(d.__stack0), x(d.__stack1))).attr('width', (d) => Math.abs(x(d.__stack1) - x(d.__stack0)));
    }
    return selection.attr('x', (d) => x(d[categoryField])).attr('width', Math.max(1, x.bandwidth()));
}
function applyStackedSegmentY(selection, geom) {
    const { y, categoryField, horizontal } = geom;
    if (horizontal) {
        return selection.attr('y', (d) => y(d[categoryField])).attr('height', Math.max(1, y.bandwidth()));
    }
    return selection.attr('y', (d) => Math.min(y(d.__stack0), y(d.__stack1))).attr('height', (d) => Math.abs(y(d.__stack1) - y(d.__stack0)));
}
function applyStackedSegmentExitGeometry(selection, geom, exitPlan = null, sourceBaselineExit) {
    return sourceBaselineExit(selection, { horizontal: geom.horizontal, plan: exitPlan, value: stackSegmentValue });
}
function stackSegmentBase(d, plan = null) {
    const anchor = plan?.baseline?.anchor;
    return anchor ? Number(d[anchor]) || 0 : Number(d.__stack0) || 0;
}
function stackSegmentValue(d) {
    if (Number.isFinite(Number(d.__stack0)) && Number.isFinite(Number(d.__stack1))) {
        return Number(d.__stack1) - Number(d.__stack0);
    }
    return 1;
}
function stackBarRows(rows, categoryField, segmentField, valueField, segments) {
    const positiveOffsets = new Map();
    const negativeOffsets = new Map();
    const segmentIndex = new Map(segments.map((segment, index) => [segment, index]));
    return rows.slice().sort((a, b) => {
        const cat = String(a[categoryField]).localeCompare(String(b[categoryField]));
        if (cat !== 0)
            return cat;
        return (segmentIndex.get(a[segmentField]) || 0) - (segmentIndex.get(b[segmentField]) || 0);
    }).map((row) => {
        const category = row[categoryField];
        const value = Number(row[valueField]) || 0;
        const offsets = value < 0 ? negativeOffsets : positiveOffsets;
        const start = offsets.get(category) || 0;
        const end = start + value;
        offsets.set(category, end);
        return { ...row, __stack0: start, __stack1: end };
    });
}
function stackedValueDomain(rows, measureChannel = {}, d3) {
    if (measureChannel?.domain)
        return measureChannel.domain;
    const values = rows.flatMap((row) => [row.__stack0, row.__stack1]);
    const min = Math.min(0, d3.min(values) ?? 0);
    const max = Math.max(0, d3.max(values) ?? 1);
    return min === max ? [0, max || 1] : [min, max];
}
