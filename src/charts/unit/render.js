import { BaseChart } from "../base.js";
import { unitKey } from "./keys.js";
import { expandUnits, unitLayout } from "./state.js";
import { DEFAULT_TIMING } from "../../timing.js";

export function createUnitRenderer(deps) {
  return new UnitChart(deps).renderer();
}

class UnitChart extends BaseChart {
  render(chart, rows, spec, tooltip, d3) {
    const {
      colorScale,
      drawLegend,
      escapeHtml,
      fadeNonUnitShapes,
      hideTooltip,
      moveTooltip,
      showTooltip,
      staggerDelay
    } = this.deps;

    const enc = spec.encoding || {};
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const units = expandUnits(rows, spec, d3);
    const layout = unitLayout(units, chart, spec, { ...this.deps, d3 });
    const color = colorScale(domainRows, enc.color, d3);

    hideAxesForUnit(chart, layout.axes);
    chart.scales = { color, orientation: layout.name };
    chart.channels = enc;
    chart.position = {
      x: (d) => layout.x(d),
      y: (d) => layout.y(d)
    };

    drawLegend(chart, rows, enc.color, d3);
    fadeNonUnitShapes(chart);
    hideSceneLabel(chart);

    const hasXAxis = Boolean(layout.axes);
    const motion = unitMotionTiming(spec, chart, d3, hasXAxis);
    const previousPositions = chart.scene.unitPositions || new Map();
    const rowKey = spec.unit?.key || spec.key || "id";
    const unitDelay = (datum, index) => Math.min(staggerDelay(spec, datum, index), motion.staggerMax);
    const xDelay = (datum, index) => Math.min(staggerDelay(spec, datum, index, motion.xStagger), motion.xStagger.max);

    chart.g.selectAll("circle.sl-unit").interrupt();

    chart.g
      .selectAll("circle.sl-unit")
      .data(units, unitKey)
      .join(
        (enter) => enterUnit(enter),
        (update) => updateUnit(update),
        (exit) => exitUnit(exit)
      );
    chart.scene.unitPositions = new Map(
      units.map((datum, index) => [
        unitKey(datum),
        {
          x: layout.x(datum, index),
          y: layout.y(datum, index)
        }
      ])
    );

    function enterUnit(enter) {
      const selection = enter
        .append("circle")
        .attr("class", "sl-unit")
        .attr("data-key", unitKey)
        .attr("cx", (d, i) => enterAnchor(d, i).x)
        .attr("cy", (d, i) => enterAnchor(d, i).y)
        .attr("r", 0)
        .attr("fill", (d) => color(d.__row))
        .attr("fill-opacity", 0.9)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .call(bindUnitTooltip);

      return hasXAxis ? gravityTransition(selection) : ordinaryTransition(selection);
    }

    function updateUnit(update) {
      update.attr("data-key", unitKey).call(bindUnitTooltip);
      return hasXAxis ? gravityTransition(update) : ordinaryTransition(update);
    }

    function ordinaryTransition(selection) {
      return selection
        .transition(motion.whole)
        .delay(unitDelay)
        .ease(d3.easeCubicOut)
        .style("opacity", 1)
        .attr("cx", (d, i) => layout.x(d, i))
        .attr("cy", (d, i) => layout.y(d, i))
        .attr("r", layout.r)
        .attr("fill", (d) => color(d.__row));
    }

    function gravityTransition(selection) {
      return selection
        .transition(motion.xPhase)
        .delay(xDelay)
        .style("opacity", 1)
        .attr("fill", (d) => color(d.__row))
        .attr("cx", (d, i) => layout.x(d, i))
        .attr("r", layout.r)
        .transition(motion.yPhase)
        .easeVarying(function (d, i) {
          const origin = numberAttr(this, "cy", layout.y(d, i));
          const target = layout.y(d, i);
          return origin < target - layout.r ? d3.easeBounceOut : d3.easeExpOut;
        })
        .attr("cy", (d, i) => layout.y(d, i));
    }

    function exitUnit(exit) {
      const transition = exit
        .transition(motion.whole)
        .delay(unitDelay)
        .ease(d3.easeCubicOut)
        .style("opacity", 0)
        .attr("r", 0);

      if (hasXAxis) transition.attr("cy", chart.innerHeight + layout.r);
      return transition.remove();
    }

    function enterAnchor(datum, index) {
      const previous = previousPositions.get(unitKey(datum));
      if (previous) return previous;

      const rowAnchor = previousRowAnchor(datum);
      if (rowAnchor) return rowAnchor;

      return {
        x: layout.x(datum, index),
        y: hasXAxis ? -layout.r : Math.min(chart.innerHeight - layout.r, layout.y(datum, index) + layout.r * 2)
      };
    }

    function previousRowAnchor(datum) {
      const prefix = `${datum.__row[rowKey] ?? datum.__rowIndex}-`;
      for (let unitIndex = datum.__unitIndex - 1; unitIndex >= 0; unitIndex -= 1) {
        const previous = previousPositions.get(`${prefix}${unitIndex}`);
        if (previous) return previous;
      }
      return null;
    }

    function numberAttr(node, name, fallback) {
      const value = Number(node.getAttribute(name));
      return Number.isFinite(value) ? value : fallback;
    }

    function bindUnitTooltip(selection) {
      const unit = spec.unit || {};
      const valueField = unit.valueField;
      const labelField = unit.labelField;
      selection
        .on("mouseenter", (event, d) => {
          const bits = [];
          if (labelField) bits.push(`${escapeHtml(labelField)}: ${escapeHtml(d.__row[labelField])}`);
          if (valueField) bits.push(`${escapeHtml(valueField)}: ${escapeHtml(d.__row[valueField])}`);
          bits.push(`unit: ${escapeHtml(d.__unitIndex + 1)}`);
          showTooltip(tooltip, event, bits.join("<br>"));
        })
        .on("mousemove", (event) => moveTooltip(tooltip, event))
        .on("mouseleave", () => hideTooltip(tooltip));
    }
  }
}

function unitMotionTiming(spec, chart, d3, hasXAxis) {
  const motion = spec.unit?.motion || {};
  const baseDuration = spec.unit?.duration || chart.transition.duration || DEFAULT_TIMING.transition.duration;
  const duration =
    motion.duration || Math.round(baseDuration * (hasXAxis ? DEFAULT_TIMING.unit.axisDurationMultiplier : 1));
  const xRatio = motion.xRatio ?? DEFAULT_TIMING.unit.xRatio;
  const xDuration = motion.xDuration || Math.round(duration * xRatio);
  const yDuration = motion.yDuration || duration - xDuration;
  const xStagger = mergeStagger(
    DEFAULT_TIMING.unit.xStagger,
    motion.xStagger ?? spec.unit?.xStagger ?? motion.gravityStagger ?? spec.unit?.gravityStagger
  );
  return {
    duration,
    staggerMax: motion.staggerMax ?? spec.unit?.staggerMax ?? DEFAULT_TIMING.unit.stagger.max,
    xStagger,
    whole: d3.transition().duration(duration),
    xPhase: d3.transition().duration(xDuration).ease(d3.easeCubicOut),
    yPhase: d3.transition().duration(yDuration)
  };
}

function mergeStagger(defaults, override) {
  if (override == null) return { ...defaults };
  if (typeof override === "number") return { step: override, max: defaults.max };
  return { ...defaults, ...override };
}

function hideAxesForUnit(chart, visible) {
  if (visible) return;
  chart.scene.xAxis.transition(chart.transition.base).style("opacity", 0);
  chart.scene.yAxis.transition(chart.transition.base).style("opacity", 0);
  chart.scene.xLabel.transition(chart.transition.base).style("opacity", 0);
  chart.scene.yLabel.transition(chart.transition.base).style("opacity", 0);
  chart.scene.grid.transition(chart.transition.base).style("opacity", 0);
}

function hideSceneLabel(chart) {
  chart.scene.unitLabel.text("").style("opacity", 0);
}
