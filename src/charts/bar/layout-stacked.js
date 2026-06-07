import { applyBarIdentity, barKeyAccessor } from "./keys.js?v=semantic-key-2";
import {
  barCategoryChannel,
  barMeasureChannel,
  barOrientationFromEncoding,
  barRendererKey
} from "./layout.js";
import { narrativeState } from "../../scrolly-meta.js?v=semantic-key-10";

export function createStackedBarRenderer(deps, kit) {
  const {
    bindTooltip,
    channelDomain,
    colorScale,
    drawGrid,
    drawXAxis,
    drawYAxis,
    position,
    updateGrid
  } = deps;

  return function renderStackedBar(chart, rows, spec, tooltip, d3, segmentField) {
    const enc = spec.encoding || {};
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const orientation = barOrientationFromEncoding(enc);
    const horizontal = orientation === "horizontal";
    const rendererOrientation = barRendererKey("stacked", orientation);
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
    const stackBaseEnter = kit.baselineEnterPlan(chart, "stack-base");
    const stackBaseExit = kit.baselineExitPlan(chart, "stack-base");

    const categoryScale = d3
      .scaleBand()
      .domain(categories)
      .range(horizontal ? [0, chart.innerHeight] : [0, chart.innerWidth])
      .padding(0.24);
    const stackedRows = stackBarRows(rows, categoryField, segmentField, valueField, segments);
    const domainStackedRows = stackBarRows(domainRows, categoryField, segmentField, valueField, segments);
    const measureScale = d3
      .scaleLinear()
      .domain(measureChannel?.domain || [0, d3.max(domainStackedRows, (d) => d.__stack1) || 1])
      .range(horizontal ? [0, chart.innerWidth] : [chart.innerHeight, 0])
      .nice();
    const x = horizontal ? measureScale : categoryScale;
    const y = horizontal ? categoryScale : measureScale;
    const geom = { x, y, categoryField, chart, horizontal };
    const targetGeometry = stackedSegmentGeometry(geom);
    const updatePlan = kit.updateStage(chart, rendererOrientation, d3);

    chart.scales = { x, y, color, orientation: rendererOrientation };
    chart.channels = enc;
    chart.position = {
      x: (d) => horizontal ? x((d.__stack0 + d.__stack1) / 2) : position(x, d[categoryField]),
      y: (d) => horizontal ? position(y, d[categoryField]) : y((d.__stack0 + d.__stack1) / 2)
    };

    if (horizontal) updateGrid(chart, null, d3);
    else drawGrid(chart, y, d3);
    drawXAxis(chart, x, enc.x?.title, d3);
    drawYAxis(chart, y, enc.y?.title, d3);

    kit.renderBarJoin({
      chart,
      rows: stackedRows,
      spec,
      tooltip,
      d3,
      bindTooltip,
      key,
      category: (d) => d[categoryField],
      className: "sl-bar sl-bar-segment sl-bar-stacked",
      orientation: rendererOrientation,
      rx: 2,
      fill: (d) => color(d),
      applyIdentity: applyBarIdentity,
      startGeometry: (d) =>
        splitLineage?.start(d) || stackedSegmentEnterGeometry(d, geom, stackBaseEnter),
      targetGeometry,
      updatePlan,
      dimensions: {
        x: (selection) => applyStackedSegmentX(selection, geom),
        y: (selection) => applyStackedSegmentY(selection, geom)
      },
      applyGeometry: (selection) => applyStackedSegmentGeometry(selection, geom),
      exitGeometry: splitLineage ? null : (selection) => {
        const exitGeometry = stackedSegmentExitGeometry({ x, y, chart, horizontal }, stackBaseExit);
        if (horizontal) selection.attr("x", exitGeometry.x).attr("width", exitGeometry.width);
        else selection.attr("y", exitGeometry.y).attr("height", exitGeometry.height);
      }
    });
  };
}

function stackedSegmentEnterGeometry(d, geom, enterPlan = null) {
  const { x, y, categoryField, chart, horizontal } = geom;
  const fromStackBase = !enterPlan || enterPlan.from === "stack-base";
  if (horizontal) {
    return {
      x: fromStackBase ? x(d.__stack0) : x(0),
      y: y(d[categoryField]),
      width: 0,
      height: Math.max(1, y.bandwidth())
    };
  }

  return {
    x: x(d[categoryField]),
    y: fromStackBase ? y(d.__stack0) : chart.innerHeight,
    width: Math.max(1, x.bandwidth()),
    height: 0
  };
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
      x: (d) => x(d.__stack0),
      width: (d) => Math.max(0, x(d.__stack1) - x(d.__stack0)),
      y: (d) => y(d[categoryField]),
      height: Math.max(1, y.bandwidth())
    };
  }

  return {
    x: (d) => x(d[categoryField]),
    width: Math.max(1, x.bandwidth()),
    y: (d) => y(d.__stack1),
    height: (d) => Math.max(0, y(d.__stack0) - y(d.__stack1))
  };
}

function applyStackedSegmentX(selection, geom) {
  const { x, categoryField, horizontal } = geom;
  if (horizontal) {
    return selection
      .attr("x", (d) => x(d.__stack0))
      .attr("width", (d) => Math.max(0, x(d.__stack1) - x(d.__stack0)));
  }

  return selection
    .attr("x", (d) => x(d[categoryField]))
    .attr("width", Math.max(1, x.bandwidth()));
}

function applyStackedSegmentY(selection, geom) {
  const { y, categoryField, horizontal } = geom;
  if (horizontal) {
    return selection
      .attr("y", (d) => y(d[categoryField]))
      .attr("height", Math.max(1, y.bandwidth()));
  }

  return selection
    .attr("y", (d) => y(d.__stack1))
    .attr("height", (d) => Math.max(0, y(d.__stack0) - y(d.__stack1)));
}

function stackedSegmentExitGeometry(geom, exitPlan = null) {
  const { x, y, chart, horizontal } = geom;
  const toStackBase = !exitPlan || exitPlan.to === "stack-base";
  if (horizontal) {
    return {
      x: (d) => (toStackBase ? x(d.__stack0) : x(0)),
      width: 0
    };
  }

  return {
    y: (d) => (toStackBase ? y(d.__stack0) : chart.innerHeight),
    height: 0
  };
}

function stackBarRows(rows, categoryField, segmentField, valueField, segments) {
  const offsets = new Map();
  const segmentIndex = new Map(segments.map((segment, index) => [segment, index]));

  return rows
    .slice()
    .sort((a, b) => {
      const categoryOrder = String(a[categoryField]).localeCompare(String(b[categoryField]));
      if (categoryOrder !== 0) return categoryOrder;
      return (segmentIndex.get(a[segmentField]) || 0) - (segmentIndex.get(b[segmentField]) || 0);
    })
    .map((row) => {
      const category = row[categoryField];
      const start = offsets.get(category) || 0;
      const value = Number(row[valueField]) || 0;
      const stacked = {
        ...row,
        __stack0: start,
        __stack1: start + value
      };
      offsets.set(category, start + value);
      return stacked;
    });
}
