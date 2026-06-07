import { BaseChart } from "../base.js";
import { narrativeState } from "../../scrolly-meta.js?v=semantic-key-10";
import { barCategoryChannel } from "./layout.js";
import { createBarRenderKit } from "./render-pattern.js?v=semantic-key-1";
import { createGroupedBarRenderer } from "./layout-grouped.js?v=semantic-key-2";
import { createSimpleBarRenderer } from "./layout-simple.js?v=semantic-key-1";
import { createStackedBarRenderer } from "./layout-stacked.js?v=semantic-key-1";

export function createBarRenderer(deps) {
  return new BarChart(deps, createBarDraw(deps)).renderer();
}

class BarChart extends BaseChart {
  constructor(deps, drawBar) {
    super(deps);
    this.drawBar = drawBar;
  }

  render(chart, rows, spec, tooltip, d3) {
    return this.drawBar(chart, rows, spec, tooltip, d3);
  }
}

function createBarDraw(deps) {
  const { drawLegend, fadeNonBarShapes } = deps;
  const kit = createBarRenderKit(deps);
  const renderers = {
    grouped: createGroupedBarRenderer(deps, kit),
    simple: createSimpleBarRenderer(deps, kit),
    stacked: createStackedBarRenderer(deps, kit)
  };

  return function drawBar(chart, rows, spec, tooltip, d3) {
    const state = narrativeState(spec);
    const barLayout = barLayoutForSpec(spec, state);
    const segmentField = barSegmentField(spec, state);
    const renderer = renderers[isSegmentedLayout(barLayout, segmentField) ? barLayout : "simple"];

    fadeNonBarShapes(chart);

    if (renderer === renderers.simple) {
      const duplicate = duplicateCategory(rows, barCategoryChannel(spec.encoding || {}));
      if (duplicate) {
        drawBarDataError(
          chart,
          `Bar chart needs one value per ${duplicate.field}. Found ${duplicate.count} rows for "${duplicate.value}". Use .where(...) or .agg(...) to make the grain explicit.`
        );
        return;
      }
    }

    renderer(chart, rows, spec, tooltip, d3, segmentField);
    drawLegend(chart, rows, spec.encoding?.color, d3);
  };
}

function isSegmentedLayout(layout, segmentField) {
  return Boolean(segmentField) && (layout === "grouped" || layout === "stacked");
}

function barLayoutForSpec(spec, state = narrativeState(spec)) {
  const enc = spec.encoding || {};
  const stateLayout =
    state.sceneState?.guide?.layout ||
    state.sceneState?.granularity?.layout ||
    state.guide?.layout ||
    state.granularity?.layout;
  if (stateLayout) return stateLayout;
  if (enc.xOffset?.field || enc.yOffset?.field) return "grouped";
  if (enc.color?.field && hasAggregateTransform(spec)) return "stacked";
  return "simple";
}

function barSegmentField(spec, state = narrativeState(spec)) {
  return (
    state.sceneState?.granularity?.segmentField ||
    state.granularity?.segmentField ||
    spec.encoding?.xOffset?.field ||
    spec.encoding?.yOffset?.field ||
    spec.encoding?.color?.field ||
    null
  );
}

function hasAggregateTransform(spec = {}) {
  return (spec.transform || []).some((transform) => transform?.aggregate);
}

function duplicateCategory(rows, channel = {}) {
  if (!channel.field) return null;

  const counts = new Map();
  for (const row of rows) {
    const value = row[channel.field];
    const count = (counts.get(value) || 0) + 1;
    if (count > 1) return { field: channel.field, value, count };
    counts.set(value, count);
  }

  return null;
}

function drawBarDataError(chart, message) {
  chart.scene.empty
    .style("display", "grid")
    .text(message);
  chart.g.selectAll("rect.sl-bar").transition(chart.transition.base).style("opacity", 0).remove();
  chart.scene.grid.transition(chart.transition.base).style("opacity", 0);
  chart.scene.xAxis.transition(chart.transition.base).style("opacity", 0);
  chart.scene.yAxis.transition(chart.transition.base).style("opacity", 0);
  chart.scene.xLabel.transition(chart.transition.base).style("opacity", 0);
  chart.scene.yLabel.transition(chart.transition.base).style("opacity", 0);
  chart.scene.legend.transition(chart.transition.base).style("opacity", 0);
}
