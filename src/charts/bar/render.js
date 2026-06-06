import { BaseChart } from "../base.js";
import { stagedDuration } from "../../timing.js";
import { applyBarIdentity, barKeyAccessor } from "./keys.js";

export function createBarRenderer(deps) {
  return new BarChart(deps, createLegacyBarRenderer(deps)).renderer();
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

function createLegacyBarRenderer(deps) {
  const {
    bandOrLinear,
    bindTooltip,
    channelDomain,
    colorScale,
    drawGrid,
    drawLegend,
    drawXAxis,
    drawYAxis,
    easeFor,
    fadeNonBarShapes,
    position,
    quantitativeDomain,
    staggerDelay,
    updateGrid
  } = deps;

  function drawBar(chart, rows, spec, tooltip, d3) {
    const enc = spec.encoding || {};
    const t = chart.transition.base;
    const key = barKeyAccessor(chart, spec, enc.x?.field || enc.y?.field);
    const barLayout = spec.barLayout || spec.bar?.layout || "simple";
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const horizontal =
      enc.x?.type === "quantitative" && ["nominal", "ordinal"].includes(enc.y?.type);

    fadeNonBarShapes(chart);

    if (["stacked", "grouped"].includes(barLayout) && barSegmentField(spec)) {
      drawSegmentedBar(chart, rows, spec, tooltip, d3, barLayout);
      return;
    }

    const duplicate = duplicateCategory(rows, horizontal ? enc.y : enc.x);
    if (duplicate) {
      drawBarDataError(
        chart,
        `Bar chart needs one value per ${duplicate.field}. Found ${duplicate.count} rows for "${duplicate.value}". Use .where(...) or .agg(...) to make the grain explicit.`
      );
      return;
    }

    if (horizontal) {
      const x = d3
        .scaleLinear()
        .domain(quantitativeDomain(domainRows, enc.x, 0))
        .range([0, chart.innerWidth])
        .nice();
      const y = d3
        .scaleBand()
        .domain(channelDomain(rows, enc.y))
        .range([0, chart.innerHeight])
        .padding(0.22);
      const color = colorScale(domainRows, enc.color, d3);

      chart.scales = { x, y, color, orientation: "horizontal" };
      chart.channels = enc;
      chart.position = {
        x: (d) => x(d[enc.x.field]),
        y: (d) => position(y, d[enc.y.field])
      };

      updateGrid(chart, null, d3);
      drawXAxis(chart, x, enc.x.title, d3);
      drawYAxis(chart, y, enc.y.title, d3);

      const guideStage = barGuideStage(chart, spec, "horizontal", d3);
      chart.g
        .selectAll("rect.sl-bar")
        .data(rows, key)
        .join(
          (enter) =>
            enter
              .append("rect")
              .attr("class", "sl-bar")
              .call(applyBarIdentity, spec, key, (d) => d[enc.y.field])
              .attr("x", x(0))
              .attr("y", (d) => y(d[enc.y.field]))
              .attr("height", y.bandwidth())
              .attr("width", 0)
              .attr("rx", 3)
              .attr("fill", (d) => color(d))
              .style("opacity", 0)
              .call(bindTooltip, spec, tooltip)
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", 1)
              .attr("width", (d) => Math.abs(x(d[enc.x.field]) - x(0))),
          (update) => {
            const prepared = update
              .attr("class", "sl-bar")
              .call(applyBarIdentity, spec, key, (d) => d[enc.y.field])
              .call(bindTooltip, spec, tooltip);
            if (guideStage) {
              return stagedBarUpdate(
                prepared,
                guideStage,
                spec,
                {
                  x: (selection) =>
                    selection
                      .attr("x", x(0))
                      .attr("width", (d) => Math.abs(x(d[enc.x.field]) - x(0))),
                  y: (selection) =>
                    selection
                      .attr("y", (d) => y(d[enc.y.field]))
                      .attr("height", y.bandwidth())
                },
                (selection) =>
                  selection
                    .style("opacity", 1)
                    .attr("fill", (d) => color(d))
              );
            }

            return prepared
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", 1)
              .attr("x", x(0))
              .attr("y", (d) => y(d[enc.y.field]))
              .attr("height", y.bandwidth())
              .attr("width", (d) => Math.abs(x(d[enc.x.field]) - x(0)))
              .attr("fill", (d) => color(d));
          },
          (exit) =>
            exit
              .transition(t)
              .style("opacity", 0)
              .attr("height", 0)
              .remove()
        );
    } else {
      const x = bandOrLinear(rows, enc.x, [0, chart.innerWidth], d3);
      const y = d3
        .scaleLinear()
        .domain(quantitativeDomain(domainRows, enc.y, 0))
        .range([chart.innerHeight, 0])
        .nice();
      const color = colorScale(domainRows, enc.color, d3);

      chart.scales = { x, y, color, orientation: "vertical" };
      chart.channels = enc;
      chart.position = {
        x: (d) => position(x, d[enc.x.field]),
        y: (d) => y(d[enc.y.field])
      };

      drawGrid(chart, y, d3);
      drawXAxis(chart, x, enc.x?.title, d3);
      drawYAxis(chart, y, enc.y?.title, d3);

      const barWidth = typeof x.bandwidth === "function" ? x.bandwidth() : 10;
      const guideStage = barGuideStage(chart, spec, "vertical", d3);
      const collapseLineage = barCollapseLineage(chart, enc.x?.field);
      chart.g
        .selectAll("rect.sl-bar")
        .data(rows, key)
        .join(
          (enter) => {
            const entered = enter
              .append("rect")
              .attr("class", "sl-bar")
              .call(applyBarIdentity, spec, key, (d) => d[enc.x.field])
              .attr("rx", 3)
              .attr("fill", (d) => color(d))
              .style("opacity", 0)
              .call(bindTooltip, spec, tooltip);

            entered.each(function (d) {
              const target = verticalBarGeometry(d, enc, x, y, chart, barWidth);
              const start = collapseLineage?.start(d) || {
                ...target,
                y: chart.innerHeight,
                height: 0
              };
              setRectGeometry(d3.select(this), start);
            });

            return entered
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", 1)
              .attr("x", (d) => verticalBarGeometry(d, enc, x, y, chart, barWidth).x)
              .attr("y", (d) => verticalBarGeometry(d, enc, x, y, chart, barWidth).y)
              .attr("width", (d) => verticalBarGeometry(d, enc, x, y, chart, barWidth).width)
              .attr("height", (d) => verticalBarGeometry(d, enc, x, y, chart, barWidth).height);
          },
          (update) => {
            const prepared = update
              .attr("class", "sl-bar")
              .call(applyBarIdentity, spec, key, (d) => d[enc.x.field])
              .call(bindTooltip, spec, tooltip);
            if (guideStage) {
              return stagedBarUpdate(
                prepared,
                guideStage,
                spec,
                {
                  x: (selection) =>
                    selection
                      .attr(
                        "x",
                        (d) =>
                          position(x, d[enc.x.field]) -
                          (typeof x.bandwidth === "function" ? x.bandwidth() / 2 : barWidth / 2)
                      )
                      .attr("width", Math.max(1, barWidth)),
                  y: (selection) =>
                    selection
                      .attr("y", (d) => y(d[enc.y.field]))
                      .attr("height", (d) => chart.innerHeight - y(d[enc.y.field]))
                },
                (selection) =>
                  selection
                    .style("opacity", 1)
                    .attr("fill", (d) => color(d))
              );
            }

            return prepared
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", 1)
              .attr(
                "x",
                (d) =>
                  position(x, d[enc.x.field]) -
                  (typeof x.bandwidth === "function" ? x.bandwidth() / 2 : barWidth / 2)
              )
              .attr("width", Math.max(1, barWidth))
              .attr("y", (d) => y(d[enc.y.field]))
              .attr("height", (d) => chart.innerHeight - y(d[enc.y.field]))
              .attr("fill", (d) => color(d));
          },
          (exit) => {
            const leaving = exit.transition(t).style("opacity", 0);
            if (!collapseLineage) {
              leaving
                .attr("y", chart.innerHeight)
                .attr("height", 0);
            }
            return leaving.remove();
          }
        );
    }

    drawLegend(chart, rows, enc.color, d3);
  }

  function barGuideStage(chart, spec, orientation, d3) {
    const staging = chart.transitionPlan?.barStage;
    if (!staging) return null;
    const matchesOrientation = staging.toOrientation === orientation;
    const matchesSegmentLayout =
      staging.toLayout &&
      (orientation === `${staging.toLayout}-vertical` || orientation === staging.toLayout);
    if (!matchesOrientation && !matchesSegmentLayout) return null;

    const order = Array.isArray(staging.order)
      ? staging.order.filter((axis) => axis === "x" || axis === "y")
      : [];
    if (!order.length) return null;

    return {
      order,
      duration: staging.duration || stagedDuration(chart.transition.duration, order.length),
      ease: easeFor(staging.ease || chart.transition.ease, d3),
      stagger: staging.stagger
    };
  }

  function stagedBarUpdate(selection, stage, spec, dimensions, baseAttrs) {
    let current = null;

    stage.order.forEach((axis, index) => {
      const applyDimension = dimensions[axis];
      if (!applyDimension) return;

      current = index === 0
        ? selection
          .transition()
          .duration(stage.duration)
          .ease(stage.ease)
          .delay((d, i) => staggerDelay(spec, d, i, stage.stagger))
        : current
          .transition()
          .duration(stage.duration)
          .ease(stage.ease);

      if (index === 0 && baseAttrs) baseAttrs(current);
      applyDimension(current);
    });

    return current || selection;
  }

  function verticalBarGeometry(d, enc, x, y, chart, barWidth) {
    return {
      x:
        position(x, d[enc.x.field]) -
        (typeof x.bandwidth === "function" ? x.bandwidth() / 2 : barWidth / 2),
      y: y(d[enc.y.field]),
      width: Math.max(1, barWidth),
      height: chart.innerHeight - y(d[enc.y.field])
    };
  }

  function setRectGeometry(selection, geometry) {
    selection
      .attr("x", geometry.x)
      .attr("y", geometry.y)
      .attr("width", Math.max(0, geometry.width))
      .attr("height", Math.max(0, geometry.height));
  }

  function barCollapseLineage(chart, parentField) {
    const hasCollapsePlan = chart.transitionPlan?.barCollapse?.mode === "parent-child";
    const hasSegmentChildren = chart.g.selectAll("rect.sl-bar-segment").size() > 0;
    if ((!hasCollapsePlan && !hasSegmentChildren) || !parentField) {
      return null;
    }

    const bounds = new Map();
    chart.g.selectAll("rect.sl-bar").each(function () {
      const node = this;
      const parent = node.dataset.category || parentFromChildKey(node.dataset.key);
      const box = rectGeometry(node);
      if (!parent || !box) return;

      const current = bounds.get(parent);
      bounds.set(parent, current ? unionRect(current, box) : box);
    });

    if (!bounds.size) return null;

    return {
      start(d) {
        return bounds.get(String(d[parentField])) || null;
      }
    };
  }

  function drawSegmentedBar(chart, rows, spec, tooltip, d3, barLayout) {
    const enc = spec.encoding || {};
    const t = chart.transition.base;
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const categoryField = enc.x?.field;
    const valueField = enc.y?.field;
    const segmentField = barSegmentField(spec);
    const categories = channelDomain(rows, enc.x);
    const segments = channelDomain(rows, {
      field: segmentField,
      domain: spec.sceneState?.granularity?.segments || spec.segmentDomain
    });
    const color = colorScale(domainRows, enc.color, d3);
    const key = barKeyAccessor(chart, spec, [categoryField, segmentField]);

    const x = d3
      .scaleBand()
      .domain(categories)
      .range([0, chart.innerWidth])
      .padding(0.24);

    if (barLayout === "grouped") {
      const x1 = d3
        .scaleBand()
        .domain(segments)
        .range([0, x.bandwidth()])
        .padding(0.08);
      const y = d3
        .scaleLinear()
        .domain(quantitativeDomain(domainRows, enc.y, 0))
        .range([chart.innerHeight, 0])
        .nice();

      chart.scales = { x, x1, y, color, orientation: "grouped-vertical" };
      chart.channels = enc;
      chart.position = {
        x: (d) => x(d[categoryField]) + x1(d[segmentField]) + x1.bandwidth() / 2,
        y: (d) => y(d[valueField])
      };

      drawGrid(chart, y, d3);
      drawXAxis(chart, x, enc.x?.title, d3);
      drawYAxis(chart, y, enc.y?.title, d3);

      const guideStage = barGuideStage(chart, spec, "grouped-vertical", d3);
      chart.g
        .selectAll("rect.sl-bar")
        .data(rows, key)
        .join(
          (enter) =>
            enter
              .append("rect")
              .attr("class", "sl-bar sl-bar-segment sl-bar-grouped")
              .call(applyBarIdentity, spec, key, (d) => d[categoryField])
              .attr("x", (d) => x(d[categoryField]) + x1(d[segmentField]))
              .attr("y", chart.innerHeight)
              .attr("width", Math.max(1, x1.bandwidth()))
              .attr("height", 0)
              .attr("rx", 2)
              .attr("fill", (d) => color(d))
              .style("opacity", 0)
              .call(bindTooltip, spec, tooltip)
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", 1)
              .attr("y", (d) => y(d[valueField]))
              .attr("height", (d) => chart.innerHeight - y(d[valueField])),
          (update) => {
            const prepared = update
              .attr("class", "sl-bar sl-bar-segment sl-bar-grouped")
              .call(applyBarIdentity, spec, key, (d) => d[categoryField])
              .call(bindTooltip, spec, tooltip);

            if (guideStage) {
              return stagedBarUpdate(
                prepared,
                guideStage,
                spec,
                {
                  x: (selection) =>
                    selection
                      .attr("x", (d) => x(d[categoryField]) + x1(d[segmentField]))
                      .attr("width", Math.max(1, x1.bandwidth())),
                  y: (selection) =>
                    selection
                      .attr("y", (d) => y(d[valueField]))
                      .attr("height", (d) => chart.innerHeight - y(d[valueField]))
                },
                (selection) =>
                  selection
                    .style("opacity", 1)
                    .attr("fill", (d) => color(d))
              );
            }

            return prepared
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", 1)
              .attr("x", (d) => x(d[categoryField]) + x1(d[segmentField]))
              .attr("width", Math.max(1, x1.bandwidth()))
              .attr("y", (d) => y(d[valueField]))
              .attr("height", (d) => chart.innerHeight - y(d[valueField]))
              .attr("fill", (d) => color(d));
          },
          (exit) =>
            exit
              .transition(t)
              .style("opacity", 0)
              .attr("y", chart.innerHeight)
              .attr("height", 0)
              .remove()
        );
    } else {
      const stackedRows = stackBarRows(rows, categoryField, segmentField, valueField, segments);
      const domainStackedRows = stackBarRows(domainRows, categoryField, segmentField, valueField, segments);
      const y = d3
        .scaleLinear()
        .domain(enc.y?.domain || [0, d3.max(domainStackedRows, (d) => d.__stack1) || 1])
        .range([chart.innerHeight, 0])
        .nice();

      chart.scales = { x, y, color, orientation: "stacked-vertical" };
      chart.channels = enc;
      chart.position = {
        x: (d) => position(x, d[categoryField]),
        y: (d) => y((d.__stack0 + d.__stack1) / 2)
      };

      drawGrid(chart, y, d3);
      drawXAxis(chart, x, enc.x?.title, d3);
      drawYAxis(chart, y, enc.y?.title, d3);

      const guideStage = barGuideStage(chart, spec, "stacked-vertical", d3);
      chart.g
        .selectAll("rect.sl-bar")
        .data(stackedRows, key)
        .join(
          (enter) =>
            enter
              .append("rect")
              .attr("class", "sl-bar sl-bar-segment sl-bar-stacked")
              .call(applyBarIdentity, spec, key, (d) => d[categoryField])
              .attr("x", (d) => x(d[categoryField]))
              .attr("y", chart.innerHeight)
              .attr("width", Math.max(1, x.bandwidth()))
              .attr("height", 0)
              .attr("rx", 2)
              .attr("fill", (d) => color(d))
              .style("opacity", 0)
              .call(bindTooltip, spec, tooltip)
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", 1)
              .attr("y", (d) => y(d.__stack1))
              .attr("height", (d) => Math.max(0, y(d.__stack0) - y(d.__stack1))),
          (update) => {
            const prepared = update
              .attr("class", "sl-bar sl-bar-segment sl-bar-stacked")
              .call(applyBarIdentity, spec, key, (d) => d[categoryField])
              .call(bindTooltip, spec, tooltip);

            if (guideStage) {
              return stagedBarUpdate(
                prepared,
                guideStage,
                spec,
                {
                  x: (selection) =>
                    selection
                      .attr("x", (d) => x(d[categoryField]))
                      .attr("width", Math.max(1, x.bandwidth())),
                  y: (selection) =>
                    selection
                      .attr("y", (d) => y(d.__stack1))
                      .attr("height", (d) => Math.max(0, y(d.__stack0) - y(d.__stack1)))
                },
                (selection) =>
                  selection
                    .style("opacity", 1)
                    .attr("fill", (d) => color(d))
              );
            }

            return prepared
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", 1)
              .attr("x", (d) => x(d[categoryField]))
              .attr("width", Math.max(1, x.bandwidth()))
              .attr("y", (d) => y(d.__stack1))
              .attr("height", (d) => Math.max(0, y(d.__stack0) - y(d.__stack1)))
              .attr("fill", (d) => color(d));
          },
          (exit) =>
            exit
              .transition(t)
              .style("opacity", 0)
              .attr("y", chart.innerHeight)
              .attr("height", 0)
              .remove()
        );
    }

    drawLegend(chart, rows, enc.color, d3);
  }

  function barSegmentField(spec) {
    return (
      spec.sceneState?.granularity?.segmentField ||
      spec.segmentField ||
      spec.segment ||
      spec.bar?.segment ||
      spec.encoding?.color?.field ||
      null
    );
  }

  return drawBar;
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

function rectGeometry(node) {
  const x = rectNumber(node, "x");
  const y = rectNumber(node, "y");
  const width = rectNumber(node, "width");
  const height = rectNumber(node, "height");
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return { x, y, width, height };
}

function rectNumber(node, attr) {
  const value = Number(node.getAttribute(attr));
  return Number.isFinite(value) ? value : NaN;
}

function unionRect(a, b) {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.width, b.x + b.width);
  const y1 = Math.max(a.y + a.height, b.y + b.height);
  return {
    x: x0,
    y: y0,
    width: x1 - x0,
    height: y1 - y0
  };
}

function parentFromChildKey(key = "") {
  return String(key).includes("|") ? String(key).split("|")[0] : null;
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
