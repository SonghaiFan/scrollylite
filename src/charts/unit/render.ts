// @ts-nocheck — D3 rendering code; typed via deps injection
import { BaseChart } from '../base.js';
import { unitKey } from './keys.js';
import { expandUnits, unitLayout } from './state.js';

export function createUnitRenderer(deps) {
  return new UnitChart(deps).renderer();
}

class UnitChart extends BaseChart {
  render(chart, rows, spec, tooltip, d3) {
    const {
      bandOrLinear,
      bindTooltip,
      colorScale,
      drawGrid,
      drawXAxis,
      drawYAxis,
      fadeNonUnitShapes,
      niceExtent,
      position,
      staggerDelay,
      themeValue,
      updateGrid
    } = this.deps;

    const enc = spec.encoding || {};
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const t = chart.transition.base;
    const units = expandUnits(rows, spec, d3);
    const color = colorScale(domainRows, enc.color, d3);
    const layout = unitLayout(units, chart, spec, {
      bandOrLinear, d3, drawGrid, drawXAxis, drawYAxis, niceExtent, position, updateGrid
    });

    fadeNonUnitShapes(chart);
    chart.scales = { color };
    chart.channels = enc;

    chart.g.selectAll('circle.sl-unit')
      .data(units, unitKey)
      .join(
        (enter) => enter
          .append('circle')
          .attr('class', 'sl-unit')
          .attr('data-key', (d) => d.__unitKey)
          .attr('cx', layout.x)
          .attr('cy', layout.y)
          .attr('r', 0)
          .attr('fill', (d) => color(d.__row || d))
          .attr('stroke', themeValue('--sl-mark-stroke', 'white'))
          .attr('stroke-width', themeValue('--sl-unit-stroke-width', 0.5))
          .call(bindTooltip, spec, tooltip)
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .attr('r', layout.r)
          .style('opacity', 1),
        (update) => update
          .call(bindTooltip, spec, tooltip)
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .attr('cx', layout.x)
          .attr('cy', layout.y)
          .attr('r', layout.r)
          .attr('fill', (d) => color(d.__row || d))
          .style('opacity', 1),
        (exit) => exit
          .transition(t)
          .attr('r', 0)
          .style('opacity', 0)
          .remove()
      );
  }
}
