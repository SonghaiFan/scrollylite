import { BaseChart } from "../base.js";
import {
  linePointKeyAccessor,
  lineSeriesKey
} from "./keys.js";
import {
  focusedLineXScale,
  lineSeries,
  lineState
} from "./state.js";

export function createLineRenderer(deps) {
  return new LineChart(deps).renderer();
}

class LineChart extends BaseChart {
  render(chart, rows, spec, tooltip, d3) {
    const {
      bandOrLinear,
      bindTooltip,
      colorScale,
      curveFor,
      drawLegend,
      drawPath,
      fadeNonLineShapes,
      niceExtent,
      position,
      quantitativeScale,
      staggerDelay
    } = this.deps;

    const enc = spec.encoding || {};
    const t = chart.transition.base;
    const state = lineState(spec, enc);
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const x = focusedLineXScale(rows, enc.x, chart, state.focus, {
      bandOrLinear,
      d3,
      niceExtent,
      position
    });
    const y = quantitativeScale(rows, enc.y, [chart.innerHeight, 0], d3);
    const color = colorScale(domainRows, enc.color, d3);
    const key = linePointKeyAccessor(spec, enc.x?.field);
    const series = lineSeries(rows, state.seriesField);
    const line = d3
      .line()
      .x((d) => position(x, d[enc.x.field]))
      .y((d) => y(d[enc.y.field]))
      .curve(curveFor(spec, d3));

    fadeNonLineShapes(chart);
    this.setCartesianState(chart, enc, { x, y, color }, {
      x: (d) => position(x, d[enc.x.field]),
      y: (d) => y(d[enc.y.field])
    });
    this.drawCartesianAxes(chart, x, y, enc, d3);

    chart.g
      .selectAll("path.sl-line")
      .data(series, lineSeriesKey)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "sl-line")
            .attr("data-key", lineSeriesKey)
            .attr("fill", "none")
            .attr("stroke", (d) => color(d.rows[0]))
            .attr("stroke-width", spec.strokeWidth || 3)
            .attr("d", (d) => line(d.rows))
            .style("opacity", 0)
            .call((selection) => drawPath(selection, t, d3)),
        (update) =>
          update
            .attr("data-key", lineSeriesKey)
            .attr("stroke-dasharray", null)
            .attr("stroke-dashoffset", null)
            .transition(t)
            .style("opacity", 1)
            .attr("stroke", (d) => color(d.rows[0]))
            .attr("stroke-width", spec.strokeWidth || 3)
            .attr("d", (d) => line(d.rows)),
        (exit) =>
          exit
            .attr("stroke-dasharray", null)
            .attr("stroke-dashoffset", null)
            .transition(t)
            .style("opacity", 0)
            .remove()
      );

    chart.g
      .selectAll("circle.sl-line-point")
      .data(rows, key)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "sl-line-point")
            .attr("data-key", (d, i) => key(d, i))
            .attr("cx", (d) => position(x, d[enc.x.field]))
            .attr("cy", (d) => y(d[enc.y.field]))
            .attr("r", 0)
            .attr("data-scroll-radius", spec.pointSize || 4.5)
            .attr("fill", (d) => color(d))
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .call(bindTooltip, spec, tooltip)
            .transition(t)
            .delay((d, i) => 260 + staggerDelay(spec, d, i))
            .style("opacity", 1)
            .attr("r", spec.pointSize || 4.5),
        (update) =>
          update
            .attr("data-key", (d, i) => key(d, i))
            .call(bindTooltip, spec, tooltip)
            .transition(t)
            .style("opacity", 1)
            .attr("cx", (d) => position(x, d[enc.x.field]))
            .attr("cy", (d) => y(d[enc.y.field]))
            .attr("fill", (d) => color(d))
            .attr("data-scroll-radius", spec.pointSize || 4.5)
            .attr("r", spec.pointSize || 4.5),
        (exit) =>
          exit
            .transition(t)
            .style("opacity", 0)
            .attr("r", 0)
            .remove()
      );

    drawLegend(chart, rows, enc.color, d3);
  }
}
