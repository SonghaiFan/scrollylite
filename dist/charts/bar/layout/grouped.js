// @ts-nocheck — D3 rendering code; typed via deps injection
import { applyBarIdentity, barKeyAccessor } from '../keys.js';
import { barCategoryChannel, barMeasureChannel, barOrientationFromEncoding, barRendererKey } from './index.js';
import { narrativeState } from '../../../scrolly-meta.js';
export function createGroupedBarRenderer(deps, kit) {
    const { bindTooltip, channelDomain, colorScale, drawGrid, drawXAxis, drawYAxis, quantitativeDomain, updateGrid } = deps;
    return function renderGroupedBar(chart, rows, spec, tooltip, d3, segmentField) {
        const enc = spec.encoding || {};
        const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
        const orientation = barOrientationFromEncoding(enc);
        const horizontal = orientation === 'horizontal';
        const rendererOrientation = barRendererKey('grouped', orientation);
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
        const zeroBaselineEnter = kit.baselineEnterPlan(chart, 'zero-baseline');
        const zeroBaselineExit = kit.baselineExitPlan(chart, 'zero-baseline');
        const categoryScale = d3.scaleBand().domain(categories)
            .range(horizontal ? [0, chart.innerHeight] : [0, chart.innerWidth]).padding(0.24);
        const segmentScale = d3.scaleBand().domain(segments)
            .range([0, categoryScale.bandwidth()]).padding(0.08);
        const measureScale = d3.scaleLinear()
            .domain(quantitativeDomain(domainRows, measureChannel, 0))
            .range(horizontal ? [0, chart.innerWidth] : [chart.innerHeight, 0]).nice();
        const x = horizontal ? measureScale : categoryScale;
        const y = horizontal ? categoryScale : measureScale;
        const x1 = horizontal ? null : segmentScale;
        const y1 = horizontal ? segmentScale : null;
        const geom = { x, y, x1, y1, categoryField, segmentField, valueField, chart, horizontal };
        const updatePlan = kit.updateStage(chart, rendererOrientation, d3);
        const xAxisTransition = kit.axisTransition(updatePlan, 'x', d3) || chart.transition.base;
        const yAxisTransition = kit.axisTransition(updatePlan, 'y', d3) || chart.transition.base;
        const geometry = groupedSegmentGeometryContract(geom, splitLineage, zeroBaselineEnter, kit.sourceBaselineExit, zeroBaselineExit);
        chart.scales = { x, ...(x1 ? { x1 } : {}), y, ...(y1 ? { y1 } : {}), color, orientation: rendererOrientation };
        chart.channels = enc;
        chart.position = {
            x: (d) => horizontal ? x(d[valueField]) : x(d[categoryField]) + x1(d[segmentField]) + x1.bandwidth() / 2,
            y: (d) => horizontal ? y(d[categoryField]) + y1(d[segmentField]) + y1.bandwidth() / 2 : y(d[valueField])
        };
        if (horizontal)
            updateGrid(chart, null, d3, yAxisTransition);
        else
            drawGrid(chart, y, d3, yAxisTransition);
        drawXAxis(chart, x, enc.x?.title, d3, xAxisTransition);
        drawYAxis(chart, y, enc.y?.title, d3, yAxisTransition);
        kit.renderBarJoin({
            chart, rows, spec, tooltip, d3, bindTooltip, key,
            category: (d) => d[categoryField],
            className: 'sl-bar sl-bar-segment sl-bar-grouped',
            orientation: rendererOrientation, rx: 2,
            fill: (d) => color(d),
            applyIdentity: applyBarIdentity, updatePlan, geometry
        });
    };
}
function groupedSegmentGeometryContract(geom, splitLineage, zeroBaselineEnter, sourceBaselineExit, exitPlan) {
    return {
        start: (d) => splitLineage?.start(d) || groupedSegmentEnterGeometry(d, geom, zeroBaselineEnter),
        target: groupedSegmentGeometry(geom),
        applyX: (selection) => applyGroupedSegmentX(selection, geom),
        applyY: (selection) => applyGroupedSegmentY(selection, geom),
        apply: (selection) => applyGroupedSegmentGeometry(selection, geom),
        exit: splitLineage ? null : (selection) => applyGroupedSegmentExitGeometry(selection, geom, sourceBaselineExit, exitPlan)
    };
}
function groupedSegmentEnterGeometry(d, geom, enterPlan = null) {
    const { x, y, x1, y1, categoryField, segmentField, horizontal } = geom;
    const fromZero = !enterPlan || enterPlan.from === 'zero-baseline';
    if (horizontal) {
        return {
            x: fromZero ? x(0) : Math.min(x(0), x(d[geom.valueField])),
            y: y(d[categoryField]) + y1(d[segmentField]),
            width: 0, height: Math.max(1, y1.bandwidth())
        };
    }
    return {
        x: x(d[categoryField]) + x1(d[segmentField]),
        y: fromZero ? y(0) : Math.min(y(0), y(d[geom.valueField])),
        width: Math.max(1, x1.bandwidth()), height: 0
    };
}
function applyGroupedSegmentGeometry(selection, geom) {
    applyGroupedSegmentX(selection, geom);
    applyGroupedSegmentY(selection, geom);
    return selection;
}
function groupedSegmentGeometry(geom) {
    const { x, y, x1, y1, categoryField, segmentField, valueField, horizontal } = geom;
    if (horizontal) {
        return {
            x: (d) => Math.min(x(0), x(d[valueField])),
            width: (d) => Math.abs(x(d[valueField]) - x(0)),
            y: (d) => y(d[categoryField]) + y1(d[segmentField]),
            height: Math.max(1, y1.bandwidth())
        };
    }
    return {
        x: (d) => x(d[categoryField]) + x1(d[segmentField]),
        width: Math.max(1, x1.bandwidth()),
        y: (d) => Math.min(y(0), y(d[valueField])),
        height: (d) => Math.abs(y(d[valueField]) - y(0))
    };
}
function applyGroupedSegmentX(selection, geom) {
    const { x, x1, categoryField, segmentField, valueField, horizontal } = geom;
    if (horizontal) {
        return selection.attr('x', (d) => Math.min(x(0), x(d[valueField]))).attr('width', (d) => Math.abs(x(d[valueField]) - x(0)));
    }
    return selection.attr('x', (d) => x(d[categoryField]) + x1(d[segmentField])).attr('width', Math.max(1, x1.bandwidth()));
}
function applyGroupedSegmentY(selection, geom) {
    const { y, y1, categoryField, segmentField, valueField, horizontal } = geom;
    if (horizontal) {
        return selection.attr('y', (d) => y(d[categoryField]) + y1(d[segmentField])).attr('height', Math.max(1, y1.bandwidth()));
    }
    return selection.attr('y', (d) => Math.min(y(0), y(d[valueField]))).attr('height', (d) => Math.abs(y(d[valueField]) - y(0)));
}
function applyGroupedSegmentExitGeometry(selection, geom, sourceBaselineExit, exitPlan) {
    return sourceBaselineExit(selection, { horizontal: geom.horizontal, plan: exitPlan, value: (d) => d[geom.valueField] });
}
