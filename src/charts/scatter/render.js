import { BaseChart } from "../base.js";
import {
  applyScatterIdentity,
  scatterKeyAccessor,
  scatterStoredKey
} from "./keys.js?v=semantic-key-1";
import {
  parentAnchors,
  parentKey,
  radiusScale,
  scatterState
} from "./state.js?v=semantic-key-1";

export function createPointRenderer(deps) {
  return new PointMarkRenderer(deps).renderer();
}

export function createScatterRenderer(deps) {
  return createPointRenderer(deps);
}

class PointMarkRenderer extends BaseChart {
  render(chart, rows, spec, tooltip, d3) {
    const {
      bandOrLinear,
      bindTooltip,
      colorScale,
      drawLegend,
      fadeNonPointShapes,
      position,
      quantitativeDomain,
      quantitativeScale,
      staggerDelay
    } = this.deps;

    const enc = spec.encoding || {};
    const t = chart.transition.base;
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const x = bandOrLinear(rows, enc.x, [0, chart.innerWidth], d3);
    const y = quantitativeScale(rows, enc.y, [chart.innerHeight, 0], d3);
    const color = colorScale(domainRows, enc.color, d3);
    const key = scatterKeyAccessor(spec, enc.x?.field);
    const radius = radiusScale(rows, enc.size, spec.size || 7, d3, quantitativeDomain);
    const state = scatterState(spec, enc);
    const parentField = state.parentField;
    const previousAnchors = chart.scene.scatterAnchors || { byParent: new Map() };
    const nextParentAnchors = parentAnchors(rows, parentField, chartPosition);

    fadeNonPointShapes(chart);
    this.setCartesianState(chart, enc, { x, y, color }, {
      x: (d) => position(x, d[enc.x.field]),
      y: (d) => y(d[enc.y.field])
    });
    this.drawCartesianAxes(chart, x, y, enc, d3);

    chart.g
      .selectAll("circle.sl-point")
      .data(rows, function (d, i) {
        return scatterStoredKey(d, i, key);
      })
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "sl-point")
            .attr("cx", (d) => enterAnchor(d).x)
            .attr("cy", (d) => enterAnchor(d).y)
            .attr("r", 0)
            .attr("fill", (d) => color(d))
            .attr("fill-opacity", 0.86)
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .call(applyScatterIdentity, key)
            .call(bindTooltip, spec, tooltip)
            .transition(t)
            .delay((d, i) => staggerDelay(spec, d, i))
            .attr("cx", (d) => chartPosition(d).x)
            .attr("cy", (d) => chartPosition(d).y)
            .attr("r", (d) => radius(d)),
        (update) =>
          update
            .call(applyScatterIdentity, key)
            .call(bindTooltip, spec, tooltip)
            .transition(t)
            .delay((d, i) => staggerDelay(spec, d, i))
            .style("opacity", 1)
            .attr("cx", (d) => chartPosition(d).x)
            .attr("cy", (d) => chartPosition(d).y)
            .attr("fill", (d) => color(d))
            .attr("r", (d) => radius(d)),
        (exit) =>
          exit
            .transition(t)
            .delay((d, i) => staggerDelay(spec, d, i))
            .style("opacity", 0)
            .attr("cx", (d) => exitAnchor(d).x)
            .attr("cy", (d) => exitAnchor(d).y)
            .attr("r", 0)
            .remove()
      );

    drawLegend(chart, rows, enc.color, d3);
    chart.scene.scatterAnchors = {
      byKey: new Map(rows.map((row, index) => [String(key(row, index)), chartPosition(row)])),
      byParent: nextParentAnchors
    };

    function chartPosition(row) {
      return {
        x: position(x, row[enc.x.field]),
        y: y(row[enc.y.field])
      };
    }

    function enterAnchor(row) {
      const parent = parentKey(row, parentField);
      return previousAnchors.byParent?.get(parent) || chartPosition(row);
    }

    function exitAnchor(row) {
      const parent = parentKey(row, parentField);
      return nextParentAnchors.get(parent) || chartPosition(row);
    }
  }
}
