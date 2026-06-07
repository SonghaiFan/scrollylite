import { applyBarIdentity, barKeyAccessor } from "./keys.js?v=semantic-key-2";
import {
  barCategoryChannel,
  barMeasureChannel,
  barOrientationFromEncoding
} from "./layout.js";

export function createSimpleBarRenderer(deps, kit) {
  const {
    bandOrLinear,
    bindTooltip,
    channelDomain,
    colorScale,
    drawGrid,
    drawXAxis,
    drawYAxis,
    position,
    quantitativeDomain,
    updateGrid
  } = deps;

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
    const targetGeometry = simpleBarGeometry(geom);
    const updatePlan = kit.updateStage(chart, orientation, d3);
    const collapseLineage = kit.collapseLineage(chart, categoryField);

    chart.scales = { x, y, color, orientation };
    chart.channels = enc;
    chart.position = {
      x: (d) => horizontal ? x(d[valueField]) : position(x, d[categoryField]),
      y: (d) => horizontal ? position(y, d[categoryField]) : y(d[valueField])
    };

    if (horizontal) updateGrid(chart, null, d3);
    else drawGrid(chart, y, d3);
    drawXAxis(chart, x, enc.x?.title, d3);
    drawYAxis(chart, y, enc.y?.title, d3);

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
      startGeometry: (d) => collapseLineage?.start(d) || simpleBarEnterGeometry(d, geom),
      targetGeometry,
      updatePlan,
      dimensions: {
        x: (selection) => applySimpleBarX(selection, geom),
        y: (selection) => applySimpleBarY(selection, geom)
      },
      applyGeometry: (selection) => applySimpleBarGeometry(selection, geom),
      exitGeometry: collapseLineage ? null : (selection) => applySimpleBarExitGeometry(selection, chart)
    });
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
    y: geom.chart.innerHeight,
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
      x: x(0),
      y: (d) => y(d[categoryField]),
      width: (d) => Math.abs(x(d[valueField]) - x(0)),
      height: Math.max(1, y.bandwidth())
    };
  }

  const width = simpleCategoryWidth(x);
  return {
    x: (d) => position(x, d[categoryField]) - width / 2,
    y: (d) => y(d[valueField]),
    width: Math.max(1, width),
    height: (d) => chart.innerHeight - y(d[valueField])
  };
}

function applySimpleBarX(selection, geom) {
  const { x, categoryField, valueField, horizontal, position } = geom;
  if (horizontal) {
    return selection
      .attr("x", x(0))
      .attr("width", (d) => Math.abs(x(d[valueField]) - x(0)));
  }

  const width = simpleCategoryWidth(x);
  return selection
    .attr("x", (d) => position(x, d[categoryField]) - width / 2)
    .attr("width", Math.max(1, width));
}

function applySimpleBarY(selection, geom) {
  const { y, categoryField, valueField, chart, horizontal } = geom;
  if (horizontal) {
    return selection
      .attr("y", (d) => y(d[categoryField]))
      .attr("height", Math.max(1, y.bandwidth()));
  }

  return selection
    .attr("y", (d) => y(d[valueField]))
    .attr("height", (d) => chart.innerHeight - y(d[valueField]));
}

function applySimpleBarExitGeometry(selection, chart) {
  return selection
    .attr("width", function () {
      return this.dataset.orientation === "horizontal" ? 0 : Number(this.getAttribute("width")) || 0;
    })
    .attr("y", function () {
      return this.dataset.orientation === "horizontal" ? Number(this.getAttribute("y")) || 0 : chart.innerHeight;
    })
    .attr("height", function () {
      return this.dataset.orientation === "horizontal" ? Number(this.getAttribute("height")) || 0 : 0;
    });
}

function simpleCategoryWidth(scale) {
  return typeof scale.bandwidth === "function" ? scale.bandwidth() : 10;
}
