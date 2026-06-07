import { narrativeState } from "../../scrolly-meta.js?v=semantic-key-10";

export function createBarRenderKit(deps) {
  const { easeFor, staggerDelay } = deps;

  function updateStage(chart, rendererOrientation, d3) {
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

  function stagedUpdate(selection, stage, spec, dimensions, baseAttrs) {
    let current = null;

    stage.stages.forEach((step, index) => {
      const applyDimension = dimensions[step.axis];
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

  return {
    baselineEnterPlan,
    baselineExitPlan,
    barFocusOpacity,
    collapseLineage,
    renderBarJoin,
    setRectGeometry,
    splitLineage,
    stagedUpdate,
    updateStage
  };

  function renderBarJoin(options) {
    const {
      chart,
      rows,
      spec,
      tooltip,
      d3,
      bindTooltip,
      key,
      category,
      className,
      orientation,
      rx = 3,
      fill,
      startGeometry,
      targetGeometry,
      updatePlan,
      dimensions,
      applyGeometry,
      exitGeometry
    } = options;

    chart.g
      .selectAll("rect.sl-bar")
      .data(rows, key)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", className)
            .attr("data-orientation", orientation)
            .call(options.applyIdentity, spec, key, category)
            .attr("rx", rx)
            .attr("fill", fill)
            .style("opacity", 0)
            .call(bindTooltip, spec, tooltip)
            .each(function (d) {
              setRectGeometry(d3.select(this), startGeometry(d));
            })
            .transition(chart.transition.base)
            .delay((d, i) => staggerDelay(spec, d, i))
            .style("opacity", (d) => barFocusOpacity(d, spec))
            .attr("x", targetGeometry.x)
            .attr("y", targetGeometry.y)
            .attr("width", targetGeometry.width)
            .attr("height", targetGeometry.height),
        (update) => {
          const prepared = update
            .attr("class", className)
            .attr("data-orientation", orientation)
            .call(options.applyIdentity, spec, key, category)
            .call(bindTooltip, spec, tooltip);

          if (updatePlan) {
            return stagedUpdate(
              prepared,
              updatePlan,
              spec,
              dimensions,
              (selection) =>
                selection
                  .style("opacity", (d) => barFocusOpacity(d, spec))
                  .attr("fill", fill)
            );
          }

          return prepared
            .transition(chart.transition.base)
            .delay((d, i) => staggerDelay(spec, d, i))
            .style("opacity", (d) => barFocusOpacity(d, spec))
            .call(applyGeometry)
            .attr("fill", fill);
        },
        (exit) => {
          const leaving = exit
            .transition(chart.transition.base)
            .style("opacity", 0);
          if (exitGeometry) exitGeometry(leaving);
          return leaving.remove();
        }
      );
  }
}

export function setRectGeometry(selection, geometry) {
  const rect = geometry || {};
  selection
    .attr("x", rect.x)
    .attr("y", rect.y)
    .attr("width", Math.max(0, rect.width))
    .attr("height", Math.max(0, rect.height));
}

export function collapseLineage(chart, parentField) {
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

export function splitLineage(chart, parentField) {
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

export function baselineEnterPlan(chart, from) {
  const enterPlan = chart.transitionPlan?.enter;
  return enterPlan?.mode === "baseline" && enterPlan.from === from ? enterPlan : null;
}

export function baselineExitPlan(chart, to) {
  const exitPlan = chart.transitionPlan?.exit;
  return exitPlan?.mode === "baseline" && exitPlan.to === to ? exitPlan : null;
}

export function barFocusOpacity(row, spec = {}) {
  const focus = narrativeState(spec).sceneState?.focus || narrativeState(spec).focus || null;
  if (focus?.mode !== "highlight" || !focus.filter) return 1;
  return rowMatchesFilter(row?.__row || row, focus.filter)
    ? 1
    : Number(focus.opacity ?? 0.22);
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
