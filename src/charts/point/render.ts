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
      staggerDelay,
      themeValue
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

    // Anchor tracking for gather/scatter animation across granularity transitions.
    // When rolling up (detail → aggregate), exiting points fly to the next cluster centroid.
    // When breaking down (aggregate → detail), entering points start at the previous cluster centroid.
    const previousAnchors = chart.scene.pointAnchors || { byParent: new Map() };

    function chartPosition(row) {
      return {
        x: position(x, row[enc.x?.field]),
        y: position(y, row[enc.y?.field])
      };
    }

    const nextParentAnchors = parentAnchors(rows, state.parentField, chartPosition);

    function enterAnchor(row) {
      const parent = parentKey(row, state.parentField);
      return previousAnchors.byParent?.get(parent) || chartPosition(row);
    }

    function exitAnchor(row) {
      const parent = parentKey(row, state.parentField);
      return nextParentAnchors.get(parent) || chartPosition(row);
    }

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
          .attr('cx', (d) => enterAnchor(d).x)
          .attr('cy', (d) => enterAnchor(d).y)
          .attr('r', 0)
          .attr('fill', (d) => color(d))
          .attr('stroke', themeValue('--sl-mark-stroke', 'white'))
          .attr('stroke-width', themeValue('--sl-point-stroke-width', 1.5))
          .call(bindTooltip, spec, tooltip)
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .attr('cx', (d) => chartPosition(d).x)
          .attr('cy', (d) => chartPosition(d).y)
          .attr('r', (d) => radius(d))
          .style('opacity', 1),
        (update) => update
          .call(applyPointIdentity, key)
          .call(bindTooltip, spec, tooltip)
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .attr('cx', (d) => chartPosition(d).x)
          .attr('cy', (d) => chartPosition(d).y)
          .attr('r', (d) => radius(d))
          .attr('fill', (d) => color(d))
          .style('opacity', 1),
        (exit) => exit
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .style('opacity', 0)
          .attr('cx', (d) => exitAnchor(d).x)
          .attr('cy', (d) => exitAnchor(d).y)
          .attr('r', 0)
          .remove()
      );

    // Persist per-step anchor positions for the next transition.
    chart.scene.pointAnchors = {
      byKey: new Map(rows.map((row, index) => [String(key(row, index)), chartPosition(row)])),
      byParent: nextParentAnchors
    };

    // Clean up any stale parent-centroid markers from previous renders.
    chart.g.selectAll('circle.sl-point-parent')
      .transition(t)
      .attr('r', 0)
      .style('opacity', 0)
      .remove();
  }
}
