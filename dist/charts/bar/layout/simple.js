import { applyBarIdentity, barKeyAccessor } from "../keys.js";
import { barCategoryChannel, barMeasureChannel, barOrientationFromEncoding } from "./index.js";
export function createSimpleBarRenderer(deps, kit) {
    const { bandOrLinear, bindTooltip, channelDomain, colorScale, drawGrid, drawXAxis, drawYAxis, position, quantitativeDomain, updateGrid } = deps;
    return function renderSimpleBar(chart, rows, spec, tooltip, d3) {
        const enc = spec.encoding || {};
        const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
        const orientation = barOrientationFromEncoding(enc);
        const horizontal = orientation === "horizontal";
        const categoryChannel = barCategoryChannel(enc);
        const measureChannel = barMeasureChannel(enc);
        const categoryField = categoryChannel?.field;
        const valueField = measureChannel?.field;
        const key = barKeyAccessor(chart, spec, categoryField || valueField);
        const categoryScale = horizontal
            ? d3.scaleBand().domain(channelDomain(rows, categoryChannel)).range([0, chart.innerHeight]).padding(0.22)
            : bandOrLinear(rows, categoryChannel, [0, chart.innerWidth], d3);
        const measureScale = d3
            .scaleLinear()
            .domain(quantitativeDomain(domainRows, measureChannel, 0))
            .range(horizontal ? [0, chart.innerWidth] : [chart.innerHeight, 0])
            .nice();
        const x = horizontal ? measureScale : categoryScale;
        const y = horizontal ? categoryScale : measureScale;
        const color = colorScale(domainRows, enc.color, d3);
        const geom = { x, y, categoryField, valueField, chart, horizontal, position };
        const updatePlan = kit.updateStage(chart, orientation, d3);
        const xAxisTransition = kit.axisTransition(updatePlan, "x", d3) || chart.transition.base;
        const yAxisTransition = kit.axisTransition(updatePlan, "y", d3) || chart.transition.base;
        const collapseLineage = kit.collapseLineage(chart, categoryField);
        const zeroBaselineExit = kit.baselineExitPlan(chart, "zero-baseline");
        const geometry = simpleBarGeometryContract(geom, collapseLineage, kit.sourceBaselineExit, zeroBaselineExit);
        chart.scales = { x, y, color, orientation };
        chart.channels = enc;
        chart.position = {
            x: (d) => horizontal ? x(d[valueField]) : position(x, d[categoryField]),
            y: (d) => horizontal ? position(y, d[categoryField]) : y(d[valueField])
        };
        if (horizontal)
            updateGrid(chart, null, d3, yAxisTransition);
        else
            drawGrid(chart, y, d3, yAxisTransition);
        drawXAxis(chart, x, enc.x?.title, d3, xAxisTransition);
        drawYAxis(chart, y, enc.y?.title, d3, yAxisTransition);
        kit.renderBarJoin({
            chart,
            rows,
            spec,
            tooltip,
            d3,
            bindTooltip,
            key,
            category: (d) => d[categoryField],
            className: "sl-bar",
            orientation,
            rx: 3,
            fill: (d) => color(d),
            applyIdentity: applyBarIdentity,
            updatePlan,
            geometry
        });
    };
}
function simpleBarGeometryContract(geom, collapseLineage, sourceBaselineExit, exitPlan) {
    return {
        start: (d) => collapseLineage?.start(d) || simpleBarEnterGeometry(d, geom),
        target: simpleBarGeometry(geom),
        applyX: (selection) => applySimpleBarX(selection, geom),
        applyY: (selection) => applySimpleBarY(selection, geom),
        apply: (selection) => applySimpleBarGeometry(selection, geom),
        exit: collapseLineage ? null : (selection) => applySimpleBarExitGeometry(selection, geom, sourceBaselineExit, exitPlan)
    };
}
function simpleBarEnterGeometry(d, geom) {
    const target = simpleBarGeometry(geom);
    if (geom.horizontal) {
        return {
            x: geom.x(0),
            y: target.y(d),
            width: 0,
            height: target.height
        };
    }
    return {
        x: target.x(d),
        y: geom.y(0),
        width: target.width,
        height: 0
    };
}
function applySimpleBarGeometry(selection, geom) {
    applySimpleBarX(selection, geom);
    applySimpleBarY(selection, geom);
    return selection;
}
function simpleBarGeometry(geom) {
    const { x, y, categoryField, valueField, chart, horizontal, position } = geom;
    if (horizontal) {
        return {
            x: (d) => Math.min(x(0), x(d[valueField])),
            y: (d) => y(d[categoryField]),
            width: (d) => Math.abs(x(d[valueField]) - x(0)),
            height: Math.max(1, y.bandwidth())
        };
    }
    const width = simpleCategoryWidth(x);
    return {
        x: (d) => position(x, d[categoryField]) - width / 2,
        y: (d) => Math.min(y(0), y(d[valueField])),
        width: Math.max(1, width),
        height: (d) => Math.abs(y(d[valueField]) - y(0))
    };
}
function applySimpleBarX(selection, geom) {
    const { x, categoryField, valueField, horizontal, position } = geom;
    if (horizontal) {
        return selection
            .attr("x", (d) => Math.min(x(0), x(d[valueField])))
            .attr("width", (d) => Math.abs(x(d[valueField]) - x(0)));
    }
    const width = simpleCategoryWidth(x);
    return selection
        .attr("x", (d) => position(x, d[categoryField]) - width / 2)
        .attr("width", Math.max(1, width));
}
function applySimpleBarY(selection, geom) {
    const { y, categoryField, valueField, horizontal } = geom;
    if (horizontal) {
        return selection
            .attr("y", (d) => y(d[categoryField]))
            .attr("height", Math.max(1, y.bandwidth()));
    }
    return selection
        .attr("y", (d) => Math.min(y(0), y(d[valueField])))
        .attr("height", (d) => Math.abs(y(d[valueField]) - y(0)));
}
function applySimpleBarExitGeometry(selection, geom, sourceBaselineExit, exitPlan) {
    return sourceBaselineExit(selection, {
        horizontal: geom.horizontal,
        plan: exitPlan,
        value: (d) => d[geom.valueField]
    });
}
function simpleCategoryWidth(scale) {
    return typeof scale.bandwidth === "function" ? scale.bandwidth() : 10;
}
