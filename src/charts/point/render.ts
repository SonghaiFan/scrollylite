// @ts-nocheck — D3 rendering code; typed via deps injection
import { BaseChart } from '../base.js';
import { applyPointIdentity, pointKeyAccessor, pointStoredKey } from './keys.js';
import { defaultPointRadius, parentAnchors, parentKey, pointState, radiusScale } from './state.js';

export function createPointRenderer(deps) {
  return new PointChart(deps).renderer();
}

class PointChart extends BaseChart {
  render(chart, rows, spec, tooltip, d3) {
    const {
      bandOrLinear,
      bindTooltip,
      colorScale,
      drawGrid,
      drawLegend,
      drawXAxis,
      drawYAxis,
      fadeNonPointShapes,
      niceExtent,
      position,
      quantitativeDomain,
      quantitativeScale,
      staggerDelay
    } = this.deps;

    const enc = spec.encoding || {};
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const state = pointState(spec, enc);
    const t = chart.transition.base;
    const x = quantitativeScale(rows, enc.x, [0, chart.innerWidth], d3);
    const y = quantitativeScale(rows, enc.y, [chart.innerHeight, 0], d3);
    const color = colorScale(domainRows, enc.color, d3);
    const radius = radiusScale(rows, enc.size, defaultPointRadius(rows.length), d3, quantitativeDomain);
    const key = pointKeyAccessor(spec, enc.x?.field || enc.y?.field);

    fadeNonPointShapes(chart);
    this.setCartesianState(chart, enc, { x, y, color }, {
      x: (d) => position(x, d[enc.x?.field]),
      y: (d) => position(y, d[enc.y?.field])
    });
    drawGrid(chart, y, d3);
    this.drawCartesianAxes(chart, x, y, enc, d3);
    drawLegend(chart, rows, enc.color, d3);

    chart.g.selectAll('circle.sl-point')
      .data(rows, (d, i) => pointStoredKey(d, i, key))
      .join(
        (enter) => enter
          .append('circle')
          .attr('class', 'sl-point')
          .call(applyPointIdentity, key)
          .attr('cx', (d) => position(x, d[enc.x?.field]))
          .attr('cy', (d) => position(y, d[enc.y?.field]))
          .attr('r', 0)
          .attr('fill', (d) => color(d))
          .attr('stroke', 'white')
          .attr('stroke-width', 1.5)
          .call(bindTooltip, spec, tooltip)
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .attr('r', (d) => radius(d))
          .style('opacity', 1),
        (update) => update
          .call(applyPointIdentity, key)
          .call(bindTooltip, spec, tooltip)
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .attr('cx', (d) => position(x, d[enc.x?.field]))
          .attr('cy', (d) => position(y, d[enc.y?.field]))
          .attr('r', (d) => radius(d))
          .attr('fill', (d) => color(d))
          .style('opacity', 1),
        (exit) => exit
          .transition(t)
          .attr('r', 0)
          .style('opacity', 0)
          .remove()
      );

    if (state.granularityMode === 'aggregate' && state.parentField) {
      const anchors = parentAnchors(rows, state.parentField, (d) => ({
        x: position(x, d[enc.x?.field]),
        y: position(y, d[enc.y?.field])
      }));

      chart.g.selectAll('circle.sl-point-parent')
        .data(Array.from(anchors.entries()), ([k]) => k)
        .join(
          (enter) => enter
            .append('circle')
            .attr('class', 'sl-point-parent')
            .attr('cx', ([, p]) => p.x)
            .attr('cy', ([, p]) => p.y)
            .attr('r', 0)
            .style('opacity', 0)
            .transition(t)
            .attr('r', 4)
            .style('opacity', 0.4),
          (update) => update.transition(t)
            .attr('cx', ([, p]) => p.x)
            .attr('cy', ([, p]) => p.y)
            .attr('r', 4)
            .style('opacity', 0.4),
          (exit) => exit.transition(t).attr('r', 0).style('opacity', 0).remove()
        );
    } else {
      chart.g.selectAll('circle.sl-point-parent')
        .transition(t)
        .attr('r', 0)
        .style('opacity', 0)
        .remove();
    }
  }
}
