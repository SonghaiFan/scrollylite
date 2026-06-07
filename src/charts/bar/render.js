import { BaseChart } from "../base.js";
import { applyBarIdentity, barKeyAccessor } from "./keys.js?v=semantic-key-2";
import { narrativeState } from "../../scrolly-meta.js?v=semantic-key-10";
import {
  barCategoryChannel,
  barMeasureChannel,
  barOrientationFromEncoding,
  barRendererKey
} from "./layout.js";

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
    const state = narrativeState(spec);
    const barLayout = barLayoutForSpec(spec, state);
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const horizontal = barOrientationFromEncoding(enc) === "horizontal";

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

      const updatePlan = barUpdateStage(chart, "horizontal", d3);
      chart.g
        .selectAll("rect.sl-bar")
        .data(rows, key)
        .join(
          (enter) =>
            transitionBarEnter(enter, {
              className: "sl-bar",
              orientation: "horizontal",
              spec,
              key,
              category: (d) => d[enc.y.field],
              rx: 3,
              fill: (d) => color(d),
              tooltip,
              d3,
              transition: t,
              startGeometry: {
                x: x(0),
                y: (d) => y(d[enc.y.field]),
                height: y.bandwidth(),
                width: 0
              },
              targetGeometry: {
                x: x(0),
                y: (d) => y(d[enc.y.field]),
                height: y.bandwidth(),
                width: (d) => Math.abs(x(d[enc.x.field]) - x(0))
              }
            }),
          (update) => {
            const prepared = update
              .attr("class", "sl-bar")
              .attr("data-orientation", "horizontal")
              .call(applyBarIdentity, spec, key, (d) => d[enc.y.field])
              .call(bindTooltip, spec, tooltip);
            if (updatePlan) {
              return stagedBarUpdate(
                prepared,
                updatePlan,
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
                    .style("opacity", (d) => barFocusOpacity(d, spec))
                    .attr("fill", (d) => color(d))
              );
            }

            return prepared
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", (d) => barFocusOpacity(d, spec))
              .attr("x", x(0))
              .attr("y", (d) => y(d[enc.y.field]))
              .attr("height", y.bandwidth())
              .attr("width", (d) => Math.abs(x(d[enc.x.field]) - x(0)))
              .attr("fill", (d) => color(d));
          },
          (exit) => transitionBarExit(exit, {
            transition: t,
            geometry: simpleBarExitGeometry(chart)
          })
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
      const updatePlan = barUpdateStage(chart, "vertical", d3);
      const collapseLineage = barCollapseLineage(chart, enc.x?.field);
      chart.g
        .selectAll("rect.sl-bar")
        .data(rows, key)
        .join(
          (enter) => {
            const targetGeometry = (d) => verticalBarGeometry(d, enc, x, y, chart, barWidth);
            return transitionBarEnter(enter, {
              className: "sl-bar",
              orientation: "vertical",
              spec,
              key,
              category: (d) => d[enc.x.field],
              rx: 3,
              fill: (d) => color(d),
              tooltip,
              d3,
              transition: t,
              startGeometry: (d) => collapseLineage?.start(d) || {
                ...targetGeometry(d),
                y: chart.innerHeight,
                height: 0
              },
              targetGeometry
            });
          },
          (update) => {
            const prepared = update
              .attr("class", "sl-bar")
              .attr("data-orientation", "vertical")
              .call(applyBarIdentity, spec, key, (d) => d[enc.x.field])
              .call(bindTooltip, spec, tooltip);
            if (updatePlan) {
              return stagedBarUpdate(
                prepared,
                updatePlan,
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
                    .style("opacity", (d) => barFocusOpacity(d, spec))
                    .attr("fill", (d) => color(d))
              );
            }

            return prepared
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", (d) => barFocusOpacity(d, spec))
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
            if (!collapseLineage) {
              return transitionBarExit(exit, {
                transition: t,
                geometry: simpleBarExitGeometry(chart)
              });
            }
            return transitionBarExit(exit, {
              transition: t,
              geometry: null
            });
          }
        );
    }

    drawLegend(chart, rows, enc.color, d3);
  }

  function barUpdateStage(chart, rendererOrientation, d3) {
    const update = chart.transitionPlan?.update;
    if (update?.mode !== "staged") return null;
    if (update.target?.renderer !== rendererOrientation) return null;
    const stages = Array.isArray(update.stages)
      ? update.stages.filter((stage) => stage.axis === "x" || stage.axis === "y")
      : [];
    if (!stages.length) return null;
    const timing = update.timing || {};

    return {
      stages,
      duration: timing.duration || chart.transition.duration,
      ease: easeFor(timing.ease || chart.transition.ease, d3),
      stagger: timing.stagger,
      transitionName: chart.scrollDriven ? chart.scrollTransitionName : null
    };
  }

  function stagedBarUpdate(selection, stage, spec, dimensions, baseAttrs) {
    let current = null;

    stage.stages.forEach((step, index) => {
      const axis = step.axis;
      const applyDimension = dimensions[axis];
      if (!applyDimension) return;

      current = index === 0
        ? selection
          .transition(stage.transitionName)
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

  function transitionBarEnter(enter, options) {
    const entered = enter
      .append("rect")
      .attr("class", options.className || "sl-bar")
      .call((selection) => {
        if (options.orientation) selection.attr("data-orientation", options.orientation);
      })
      .call(applyBarIdentity, options.spec, options.key, options.category)
      .attr("rx", options.rx ?? 3)
      .attr("fill", options.fill)
      .style("opacity", 0)
      .call(bindTooltip, options.spec, options.tooltip);

    entered.each(function (d) {
      setRectGeometry(options.d3.select(this), options.startGeometry, d);
    });

    return applyRectGeometry(
      entered
        .transition(options.transition)
        .delay((d, i) => staggerDelay(options.spec, d, i))
        .style("opacity", (d) => barFocusOpacity(d, options.spec)),
      options.targetGeometry
    );
  }

  function transitionBarExit(exit, options) {
    const leaving = exit
      .transition(options.transition)
      .style("opacity", 0);

    if (options.geometry) applyRectGeometry(leaving, options.geometry);
    return leaving.remove();
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

  function setRectGeometry(selection, geometry, datum) {
    const rect = resolveGeometryObject(geometry, datum);
    selection
      .attr("x", rect.x)
      .attr("y", rect.y)
      .attr("width", Math.max(0, rect.width))
      .attr("height", Math.max(0, rect.height));
  }

  function applyRectGeometry(selection, geometry) {
    ["x", "y", "width", "height"].forEach((attr) => {
      if (typeof geometry === "function") {
        selection.attr(attr, (d) => resolveGeometryObject(geometry, d)[attr]);
      } else if (geometry[attr] !== undefined) {
        selection.attr(attr, geometry[attr]);
      }
    });
    return selection;
  }

  function resolveGeometry(geometry, datum) {
    return typeof geometry === "function" ? geometry(datum) : geometry;
  }

  function resolveGeometryObject(geometry, datum) {
    const rect = resolveGeometry(geometry, datum) || {};
    return {
      x: resolveGeometryValue(rect.x, datum),
      y: resolveGeometryValue(rect.y, datum),
      width: resolveGeometryValue(rect.width, datum),
      height: resolveGeometryValue(rect.height, datum)
    };
  }

  function resolveGeometryValue(value, datum) {
    return typeof value === "function" ? value(datum) : value;
  }

  function barCollapseLineage(chart, parentField) {
    const enterPlan = chart.transitionPlan?.enter;
    if (enterPlan?.mode !== "parent-child-lineage" || enterPlan.from !== "child-bounds" || !parentField) {
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

  function barSplitLineage(chart, parentField) {
    const enterPlan = chart.transitionPlan?.enter;
    if (enterPlan?.mode !== "parent-child-lineage" || enterPlan.from !== "parent-bounds" || !parentField) {
      return null;
    }

    const bounds = new Map();
    chart.g.selectAll("rect.sl-bar:not(.sl-bar-segment)").each(function () {
      const node = this;
      const parent = node.dataset.category || node.dataset.key;
      const box = rectGeometry(node);
      if (!parent || !box) return;
      bounds.set(parent, box);
    });

    if (!bounds.size) return null;

    return {
      start(d) {
        return bounds.get(String(d[parentField])) || null;
      }
    };
  }

  function baselineEnterPlan(chart, from) {
    const enterPlan = chart.transitionPlan?.enter;
    return enterPlan?.mode === "baseline" && enterPlan.from === from ? enterPlan : null;
  }

  function baselineExitPlan(chart, to) {
    const exitPlan = chart.transitionPlan?.exit;
    return exitPlan?.mode === "baseline" && exitPlan.to === to ? exitPlan : null;
  }

  function drawSegmentedBar(chart, rows, spec, tooltip, d3, barLayout) {
    const enc = spec.encoding || {};
    const t = chart.transition.base;
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const orientation = barOrientationFromEncoding(enc);
    const horizontal = orientation === "horizontal";
    const rendererOrientation = barRendererKey(barLayout, orientation);
    const categoryChannel = barCategoryChannel(enc);
    const measureChannel = barMeasureChannel(enc);
    const categoryField = categoryChannel?.field;
    const valueField = measureChannel?.field;
    const state = narrativeState(spec);
    const segmentField = barSegmentField(spec, state);
    const categories = channelDomain(rows, categoryChannel);
    const segments = channelDomain(rows, {
      field: segmentField,
      domain: state.sceneState?.granularity?.segments || state.granularity?.segments
    });
    const color = colorScale(domainRows, enc.color, d3);
    const key = barKeyAccessor(chart, spec, [categoryField, segmentField]);
    const splitLineage = barSplitLineage(chart, categoryField);
    const zeroBaselineEnter = baselineEnterPlan(chart, "zero-baseline");
    const stackBaseEnter = baselineEnterPlan(chart, "stack-base");
    const zeroBaselineExit = baselineExitPlan(chart, "zero-baseline");
    const stackBaseExit = baselineExitPlan(chart, "stack-base");

    const categoryScale = d3
      .scaleBand()
      .domain(categories)
      .range(horizontal ? [0, chart.innerHeight] : [0, chart.innerWidth])
      .padding(0.24);

    if (barLayout === "grouped") {
      const segmentScale = d3
        .scaleBand()
        .domain(segments)
        .range([0, categoryScale.bandwidth()])
        .padding(0.08);
      const measureScale = d3
        .scaleLinear()
        .domain(quantitativeDomain(domainRows, measureChannel, 0))
        .range(horizontal ? [0, chart.innerWidth] : [chart.innerHeight, 0])
        .nice();
      const x = horizontal ? measureScale : categoryScale;
      const y = horizontal ? categoryScale : measureScale;
      const x1 = horizontal ? null : segmentScale;
      const y1 = horizontal ? segmentScale : null;

      chart.scales = { x, ...(x1 ? { x1 } : {}), y, ...(y1 ? { y1 } : {}), color, orientation: rendererOrientation };
      chart.channels = enc;
      chart.position = {
        x: (d) => horizontal
          ? x(d[valueField])
          : x(d[categoryField]) + x1(d[segmentField]) + x1.bandwidth() / 2,
        y: (d) => horizontal
          ? y(d[categoryField]) + y1(d[segmentField]) + y1.bandwidth() / 2
          : y(d[valueField])
      };

      if (horizontal) updateGrid(chart, null, d3);
      else drawGrid(chart, y, d3);
      drawXAxis(chart, x, enc.x?.title, d3);
      drawYAxis(chart, y, enc.y?.title, d3);

      const updatePlan = barUpdateStage(chart, rendererOrientation, d3);
      chart.g
        .selectAll("rect.sl-bar")
        .data(rows, key)
        .join(
          (enter) =>
            transitionBarEnter(enter, {
              className: "sl-bar sl-bar-segment sl-bar-grouped",
              spec,
              key,
              category: (d) => d[categoryField],
              rx: 2,
              fill: (d) => color(d),
              tooltip,
              d3,
              transition: t,
              startGeometry: (d) =>
                splitLineage?.start(d) ||
                groupedSegmentEnterGeometry(d, { x, y, x1, y1, categoryField, segmentField, valueField, chart, horizontal }, zeroBaselineEnter),
              targetGeometry: groupedSegmentGeometry({ x, y, x1, y1, categoryField, segmentField, valueField, chart, horizontal })
            }),
          (update) => {
            const prepared = update
              .attr("class", "sl-bar sl-bar-segment sl-bar-grouped")
              .call(applyBarIdentity, spec, key, (d) => d[categoryField])
              .call(bindTooltip, spec, tooltip);

            if (updatePlan) {
              return stagedBarUpdate(
                prepared,
                updatePlan,
                spec,
                {
                  x: (selection) =>
                    applyGroupedSegmentX(selection, { x, x1, categoryField, segmentField, valueField, horizontal }),
                  y: (selection) =>
                    applyGroupedSegmentY(selection, { y, y1, categoryField, segmentField, valueField, chart, horizontal })
                },
                (selection) =>
                  selection
                    .style("opacity", (d) => barFocusOpacity(d, spec))
                    .attr("fill", (d) => color(d))
              );
            }

            return prepared
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", (d) => barFocusOpacity(d, spec))
              .call((selection) =>
                applyGroupedSegmentGeometry(selection, { x, y, x1, y1, categoryField, segmentField, valueField, chart, horizontal })
              )
              .attr("fill", (d) => color(d));
          },
          (exit) => {
            return transitionBarExit(exit, {
              transition: t,
              geometry: splitLineage
                ? null
                : groupedSegmentExitGeometry({ chart, horizontal }, zeroBaselineExit)
            });
          }
        );
    } else {
      const stackedRows = stackBarRows(rows, categoryField, segmentField, valueField, segments);
      const domainStackedRows = stackBarRows(domainRows, categoryField, segmentField, valueField, segments);
      const measureScale = d3
        .scaleLinear()
        .domain(measureChannel?.domain || [0, d3.max(domainStackedRows, (d) => d.__stack1) || 1])
        .range(horizontal ? [0, chart.innerWidth] : [chart.innerHeight, 0])
        .nice();
      const x = horizontal ? measureScale : categoryScale;
      const y = horizontal ? categoryScale : measureScale;

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

      const updatePlan = barUpdateStage(chart, rendererOrientation, d3);
      chart.g
        .selectAll("rect.sl-bar")
        .data(stackedRows, key)
        .join(
          (enter) =>
            transitionBarEnter(enter, {
              className: "sl-bar sl-bar-segment sl-bar-stacked",
              spec,
              key,
              category: (d) => d[categoryField],
              rx: 2,
              fill: (d) => color(d),
              tooltip,
              d3,
              transition: t,
              startGeometry: (d) =>
                splitLineage?.start(d) ||
                stackedSegmentEnterGeometry(d, { x, y, categoryField, chart, horizontal }, stackBaseEnter),
              targetGeometry: stackedSegmentGeometry({ x, y, categoryField, chart, horizontal })
            }),
          (update) => {
            const prepared = update
              .attr("class", "sl-bar sl-bar-segment sl-bar-stacked")
              .call(applyBarIdentity, spec, key, (d) => d[categoryField])
              .call(bindTooltip, spec, tooltip);

            if (updatePlan) {
              return stagedBarUpdate(
                prepared,
                updatePlan,
                spec,
                {
                  x: (selection) =>
                    applyStackedSegmentX(selection, { x, categoryField, horizontal }),
                  y: (selection) =>
                    applyStackedSegmentY(selection, { y, categoryField, chart, horizontal })
                },
                (selection) =>
                  selection
                    .style("opacity", (d) => barFocusOpacity(d, spec))
                    .attr("fill", (d) => color(d))
              );
            }

            return prepared
              .transition(t)
              .delay((d, i) => staggerDelay(spec, d, i))
              .style("opacity", (d) => barFocusOpacity(d, spec))
              .call((selection) =>
                applyStackedSegmentGeometry(selection, { x, y, categoryField, chart, horizontal })
              )
              .attr("fill", (d) => color(d));
          },
          (exit) => {
            return transitionBarExit(exit, {
              transition: t,
              geometry: splitLineage
                ? null
                : stackedSegmentExitGeometry({ x, y, chart, horizontal }, stackBaseExit)
            });
          }
        );
    }

    drawLegend(chart, rows, enc.color, d3);
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

function simpleBarExitGeometry(chart) {
  return {
    width: function () {
      return this.dataset.orientation === "horizontal" ? 0 : Number(this.getAttribute("width")) || 0;
    },
    y: function () {
      return this.dataset.orientation === "horizontal" ? Number(this.getAttribute("y")) || 0 : chart.innerHeight;
    },
    height: function () {
      return this.dataset.orientation === "horizontal" ? Number(this.getAttribute("height")) || 0 : 0;
    }
  };
}

function groupedSegmentEnterGeometry(d, geom, _enterPlan = null) {
  const { x, y, x1, y1, categoryField, segmentField, chart, horizontal } = geom;
  if (horizontal) {
    return {
      x: x(0),
      y: y(d[categoryField]) + y1(d[segmentField]),
      width: 0,
      height: Math.max(1, y1.bandwidth())
    };
  }

  return {
    x: x(d[categoryField]) + x1(d[segmentField]),
    y: chart.innerHeight,
    width: Math.max(1, x1.bandwidth()),
    height: 0
  };
}

function applyGroupedSegmentGeometry(selection, geom) {
  applyGroupedSegmentX(selection, geom);
  applyGroupedSegmentY(selection, geom);
  return selection;
}

function groupedSegmentGeometry(geom) {
  const { x, y, x1, y1, categoryField, segmentField, valueField, chart, horizontal } = geom;
  if (horizontal) {
    return {
      x: x(0),
      width: (d) => Math.abs(x(d[valueField]) - x(0)),
      y: (d) => y(d[categoryField]) + y1(d[segmentField]),
      height: Math.max(1, y1.bandwidth())
    };
  }

  return {
    x: (d) => x(d[categoryField]) + x1(d[segmentField]),
    width: Math.max(1, x1.bandwidth()),
    y: (d) => y(d[valueField]),
    height: (d) => chart.innerHeight - y(d[valueField])
  };
}

function applyGroupedSegmentX(selection, geom) {
  const { x, x1, categoryField, segmentField, valueField, horizontal } = geom;
  if (horizontal) {
    return selection
      .attr("x", x(0))
      .attr("width", (d) => Math.abs(x(d[valueField]) - x(0)));
  }

  return selection
    .attr("x", (d) => x(d[categoryField]) + x1(d[segmentField]))
    .attr("width", Math.max(1, x1.bandwidth()));
}

function applyGroupedSegmentY(selection, geom) {
  const { y, y1, categoryField, segmentField, valueField, chart, horizontal } = geom;
  if (horizontal) {
    return selection
      .attr("y", (d) => y(d[categoryField]) + y1(d[segmentField]))
      .attr("height", Math.max(1, y1.bandwidth()));
  }

  return selection
    .attr("y", (d) => y(d[valueField]))
    .attr("height", (d) => chart.innerHeight - y(d[valueField]));
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
  const { x, y, categoryField, chart, horizontal } = geom;
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
  const { y, categoryField, chart, horizontal } = geom;
  if (horizontal) {
    return selection
      .attr("y", (d) => y(d[categoryField]))
      .attr("height", Math.max(1, y.bandwidth()));
  }

  return selection
    .attr("y", (d) => y(d.__stack1))
    .attr("height", (d) => Math.max(0, y(d.__stack0) - y(d.__stack1)));
}

function groupedSegmentExitGeometry({ chart, horizontal }, _exitPlan = null) {
  if (horizontal) {
    return { width: 0 };
  }

  return {
    y: chart.innerHeight,
    height: 0
  };
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

function barFocusOpacity(row, spec = {}) {
  const focus = narrativeState(spec).sceneState?.focus || narrativeState(spec).focus || null;
  if (focus?.mode !== "highlight" || !focus.filter) return 1;
  return rowMatchesFilter(row?.__row || row, focus.filter)
    ? 1
    : Number(focus.opacity ?? 0.22);
}

function rowMatchesFilter(row = {}, filter = {}) {
  if (!filter?.field) return true;
  const value = row[filter.field];
  if ("equal" in filter) return value === filter.equal;
  if ("notEqual" in filter) return value !== filter.notEqual;
  if ("oneOf" in filter) return filter.oneOf.includes(value);
  if ("gte" in filter && value < filter.gte) return false;
  if ("gt" in filter && value <= filter.gt) return false;
  if ("lte" in filter && value > filter.lte) return false;
  if ("lt" in filter && value >= filter.lt) return false;
  return true;
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
