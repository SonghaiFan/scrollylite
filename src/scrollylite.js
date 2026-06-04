import {
  designSpaceClasses,
  designSpaceSignature,
  normalizeDesignSpace
} from "./design-space.js";
import { applyTransforms } from "./data/transforms.js";
import { keyAccessor } from "./identity/semantic-key.js";
import { createBarRenderer } from "./charts/bar/render.js";
import { resolveBarTransitionPlan } from "./charts/bar/state.js";
import { createChartRegistry, normalizeChartType } from "./charts/index.js";
import { layoutClasses } from "./layouts/index.js";
import {
  compileSceneViewSpec,
  hasScene,
  resolveSceneTransition,
  withSceneTransitionDefaults
} from "./transitions/index.js";

const DEFAULT_PALETTE = [
  "#2f7d7e",
  "#b05d3b",
  "#536a9e",
  "#8d6e3f",
  "#557f4d",
  "#9b4f6d",
  "#c18f2f",
  "#4f7f99"
];

const BUILT_IN_CHARTS = createChartRegistry();

export function registerChart(type, renderer) {
  BUILT_IN_CHARTS.register(type, renderer);
}

export function availableChartTypes() {
  return BUILT_IN_CHARTS.types();
}

export async function createStory(spec, options = {}) {
  const d3 = getD3();
  const target = resolveTarget(options.target || "#app");
  const compiled = compileSpec(spec);

  applyTheme(compiled.theme);
  target.innerHTML = "";
  target.className = [
    "sl-root",
    ...designSpaceClasses(compiled.designSpace),
    ...layoutClasses(compiled.designSpace)
  ].join(" ");

  const data = await loadData(compiled.data);
  const shell = renderShell(target, compiled);
  const renderer = createRenderer(shell, compiled, data, d3);

  renderer.renderStep(0);
  setupScroll(compiled, shell, renderer);
  setupNav(compiled, shell, renderer);
  setupResize(renderer);
  restoreHashPosition(renderer);

  return {
    spec: compiled,
    data,
    signature: designSpaceSignature(compiled),
    renderStep: renderer.renderStep,
    destroy: renderer.destroy
  };
}

function compileSpec(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error("ScrollyLite requires a story spec object.");
  }

  const steps = Array.isArray(spec.steps) ? spec.steps : [];
  if (!steps.length) {
    throw new Error("ScrollyLite spec must contain at least one step.");
  }

  const baseDesignSpace = normalizeDesignSpace(spec.designSpace || {});

  return {
    ...spec,
    data: spec.data || {},
    designSpace: baseDesignSpace,
    views: spec.views || { main: {} },
    theme: spec.theme || {},
    layout: {
      offset: 0.55,
      nav: true,
      progress: true,
      ...(spec.layout || {})
    },
    steps: steps.map((step, index) => ({
      ...step,
      id: step.id || `step-${index + 1}`,
      designSpace: normalizeDesignSpace(step.designSpace || {}, baseDesignSpace),
      views: normalizeStepViews(step)
    }))
  };
}

function normalizeStepViews(step) {
  if (step.views) return step.views;
  if (step.view) return { main: step.view };
  return {};
}

async function loadData(dataSpec) {
  const d3 = getD3();
  const entries = await Promise.all(
    Object.entries(dataSpec).map(async ([name, source]) => {
      if (Array.isArray(source)) return [name, source];
      if (Array.isArray(source.values)) return [name, source.values];
      if (!source.url) return [name, []];

      if ((source.type || "csv") === "csv") {
        const rows = await d3.csv(source.url, d3.autoType);
        return [name, rows];
      }

      if (source.type === "json") {
        const rows = await d3.json(source.url);
        return [name, Array.isArray(rows) ? rows : rows.values || []];
      }

      throw new Error(`Unsupported data type for "${name}": ${source.type}`);
    })
  );

  return Object.fromEntries(entries);
}

function renderShell(target, spec) {
  const intro = document.createElement("section");
  intro.className = "sl-intro";
  intro.innerHTML = `
    <div class="sl-intro-inner">
      <p class="sl-kicker">Scrolly grammar template</p>
      <h1 class="sl-title">${escapeHtml(spec.title || "Untitled story")}</h1>
      <p class="sl-description">${escapeHtml(spec.description || "")}</p>
    </div>
  `;
  target.append(intro);

  const story = document.createElement("section");
  story.className = "sl-story";

  const steps = document.createElement("article");
  steps.className = "sl-steps";

  spec.steps.forEach((step, index) => {
    const node = document.createElement("section");
    node.className = ["sl-step", ...designSpaceClasses(step.designSpace)].join(" ");
    node.id = step.id;
    node.dataset.stepIndex = String(index);
    node.dataset.layout = Object.values(step.designSpace.layout || {}).filter(Boolean).join(" ");
    node.dataset.transitionScene = (step.designSpace.transition?.scene || []).join(" ");
    node.dataset.transitionSegue = (step.designSpace.transition?.segue || []).join(" ");
    node.dataset.action = (step.designSpace.action || []).join(" ");
    node.innerHTML = `
      <div class="sl-step-card">
        <div class="sl-step-number">${String(index + 1).padStart(2, "0")}</div>
        <h2>${escapeHtml(step.title || `Step ${index + 1}`)}</h2>
        <p>${escapeHtml(step.body || "")}</p>
      </div>
    `;
    steps.append(node);
  });

  const figureWrap = document.createElement("aside");
  figureWrap.className = "sl-figure-wrap";

  const figure = document.createElement("figure");
  figure.className = "sl-figure";
  figure.innerHTML = `
    <figcaption class="sl-figure-header">
      <p class="sl-figure-title"></p>
      <span class="sl-mark-name"></span>
    </figcaption>
  `;

  const viewNodes = {};
  Object.entries(spec.views).forEach(([viewId]) => {
    const view = document.createElement("div");
    view.className = "sl-view";
    view.dataset.viewId = viewId;
    figure.append(view);
    viewNodes[viewId] = view;
  });

  figureWrap.append(figure);
  story.append(steps, figureWrap);
  target.append(story);

  const progress = document.createElement("div");
  progress.className = "sl-progress";
  progress.innerHTML = `<div class="sl-progress-fill"></div>`;
  if (spec.layout.progress) target.append(progress);

  const nav = document.createElement("nav");
  nav.className = "sl-nav";
  nav.setAttribute("aria-label", "Story steps");
  spec.steps.forEach((step, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.stepIndex = String(index);
    button.setAttribute("aria-label", step.title || `Step ${index + 1}`);
    nav.append(button);
  });
  if (spec.layout.nav) target.append(nav);

  const tooltip = document.createElement("div");
  tooltip.className = "sl-tooltip";
  target.append(tooltip);

  return {
    root: target,
    story,
    figure,
    figureTitle: figure.querySelector(".sl-figure-title"),
    markName: figure.querySelector(".sl-mark-name"),
    steps: Array.from(steps.querySelectorAll(".sl-step")),
    navButtons: Array.from(nav.querySelectorAll("button")),
    progressFill: progress.querySelector(".sl-progress-fill"),
    views: viewNodes,
    tooltip
  };
}

function createRenderer(shell, spec, datasets, d3) {
  let activeIndex = -1;
  let resizeFrame = null;

  const renderStep = (index, options = {}) => {
    const bounded = clamp(index, 0, spec.steps.length - 1);
    if (bounded === activeIndex && !options.force) return;

    const step = spec.steps[bounded];
    activeIndex = bounded;

    shell.steps.forEach((node, nodeIndex) => {
      node.classList.toggle("is-active", nodeIndex === bounded);
    });
    shell.navButtons.forEach((node, nodeIndex) => {
      node.classList.toggle("is-active", nodeIndex === bounded);
    });
    if (shell.progressFill) {
      const pct = spec.steps.length === 1 ? 100 : (bounded / (spec.steps.length - 1)) * 100;
      shell.progressFill.style.width = `${pct}%`;
    }

    const firstViewSpec = Object.values(step.views)[0] || {};
    shell.figureTitle.textContent = spec.views.main?.title || step.title || "";
    shell.markName.textContent = firstViewSpec.mark
      ? `chart: ${normalizeChartType(firstViewSpec.mark)}`
      : "";

    Object.entries(shell.views).forEach(([viewId, node]) => {
      const viewConfig = spec.views[viewId] || {};
      const viewSpec = step.views[viewId] || step.views.main || {};
      drawView(node, viewSpec, viewConfig, datasets, shell.tooltip, d3, step.designSpace);
    });
  };

  const resize = () => {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      if (activeIndex >= 0) renderStep(activeIndex, { force: true });
    });
  };

  return {
    renderStep,
    resize,
    destroy() {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    }
  };
}

function drawView(node, viewSpec, viewConfig, datasets, tooltip, d3, designSpace = {}) {
  const scene = getScene(node, viewConfig, d3);

  if (!viewSpec || !viewSpec.mark) {
    scene.empty.style("display", "grid").text("No view for this step.");
    fadeLayers(scene, null);
    return;
  }

  scene.empty.style("display", "none");

  if (viewSpec.mark === "text") {
    fadeLayers(scene, "text");
    drawTextBoard(scene, viewSpec);
    return;
  }

  const sceneTransition = resolveSceneTransition(viewSpec, designSpace);
  const effectiveViewSpec = compileSceneViewSpec(
    withSceneTransitionDefaults(viewSpec, sceneTransition),
    sceneTransition
  );
  const source = effectiveViewSpec.data ? datasets[effectiveViewSpec.data] || [] : [];
  const rows = applyTransforms(source, effectiveViewSpec.transform || []);
  if (!rows.length) {
    scene.empty.style("display", "grid").text("No rows after transforms.");
    fadeLayers(scene, null);
    return;
  }

  const width = Math.max(320, node.clientWidth || 720);
  const height = viewConfig.height || viewSpec.height || 500;
  resizeScene(scene, width, height);

  const chartType = normalizeChartType(effectiveViewSpec.mark);
  const previousSpec = scene.previousSpec;
  const chart = {
    scene,
    type: chartType,
    width,
    height,
    margin: {
      top: 38,
      right: 34,
      bottom: 64,
      left: 68,
      ...(effectiveViewSpec.margin || {})
    },
    transition: transitionSpec(effectiveViewSpec, previousSpec),
    transitionPlan: resolveBarTransitionPlan(previousSpec, effectiveViewSpec),
    sceneTransition
  };
  chart.innerWidth = chart.width - chart.margin.left - chart.margin.right;
  chart.innerHeight = chart.height - chart.margin.top - chart.margin.bottom;
  chart.frame = scene.frame.transition(chart.transition.base).attr(
    "transform",
    `translate(${chart.margin.left},${chart.margin.top})`
  );
  chart.g = activeMarkLayer(scene, chartType, chart.transition);
  applyPlotClip(chart, true);

  if (chartType !== "unit") {
    scene.unitLabel.transition(chart.transition.base).style("opacity", 0);
  }

  const renderer = BUILT_IN_CHARTS.get(chartType);
  if (renderer) renderer(chart, rows, effectiveViewSpec, tooltip, d3);
  else drawUnsupported(chart, effectiveViewSpec, BUILT_IN_CHARTS.types());

  applySceneTransitions(chart, rows, effectiveViewSpec);
  scene.previousSpec = effectiveViewSpec;
}

function applySceneTransitions(chart, rows, spec) {
  const sceneTypes = chart.sceneTransition?.scene || [];
  chart.scene.node.dataset.sceneTransition = sceneTypes.join(" ");
  chart.scene.node.dataset.sceneState = Object.keys(spec.sceneState || {}).join(" ");
  chart.scene.node.dataset.transitionPlan = chart.transitionPlan?.barStage
    ? chart.transitionPlan.barStage.order.join(" ")
    : "";

  clearSceneLayer(chart.scene.granularityLayer, chart.transition.base);
  applyGuideScene(chart, rows, spec);
}

function applyGuideScene(chart, rows, spec) {
  const enabled = hasScene(chart.sceneTransition, "guide");
  const cue = spec.guide?.cue;
  const layer = chart.scene.guideLayer;

  if (!enabled || !cue || !chart.position || !rows.length) {
    clearSceneLayer(layer, chart.transition.base);
    return;
  }

  const guideSpec = cue === true ? { select: "max", by: spec.encoding?.y?.field } : cue;
  const row = pickSceneRow(rows, guideSpec, spec.encoding || {});
  const x = row ? chart.position.x(row) : NaN;
  const y = row ? chart.position.y(row) : NaN;
  const data = Number.isFinite(x) && Number.isFinite(y) ? [{ row, x, y }] : [];

  layer.raise().interrupt().style("opacity", 1);
  joinGuideLine(
    layer,
    "sl-guide-rule-x",
    data,
    chart.transition.base,
    (d) => ({
      x1: d.x,
      x2: d.x,
      y1: 0,
      y2: chart.innerHeight
    })
  );
  joinGuideLine(
    layer,
    "sl-guide-rule-y",
    data,
    chart.transition.base,
    (d) => ({
      x1: 0,
      x2: chart.innerWidth,
      y1: d.y,
      y2: d.y
    })
  );

  layer
    .selectAll("circle.sl-guide-dot")
    .data(data, (d) => sceneRowKey(d.row, spec))
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "sl-guide-dot")
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", 0)
          .transition(chart.transition.base)
          .attr("r", 5),
      (update) =>
        update
          .transition(chart.transition.base)
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", 5),
      (exit) => exit.transition(chart.transition.base).attr("r", 0).remove()
    );
}

function joinGuideLine(layer, className, data, transition, attrs) {
  const setAttrs = (selection) =>
    selection
      .attr("x1", (d) => attrs(d).x1)
      .attr("x2", (d) => attrs(d).x2)
      .attr("y1", (d) => attrs(d).y1)
      .attr("y2", (d) => attrs(d).y2);

  layer
    .selectAll(`line.${className}`)
    .data(data, (d) => sceneRowKey(d.row))
    .join(
      (enter) =>
        setAttrs(
          enter
          .append("line")
          .attr("class", `sl-guide-rule ${className}`)
        )
          .style("opacity", 0)
          .transition(transition)
          .style("opacity", 1),
      (update) => setAttrs(update.transition(transition)).style("opacity", 1),
      (exit) => exit.transition(transition).style("opacity", 0).remove()
    );
}

function clearSceneLayer(layer, transition) {
  layer.interrupt().style("opacity", 1);
  layer.selectAll("*").transition(transition).style("opacity", 0).remove();
}

function pickSceneRow(rows, selector = {}, encoding = {}) {
  if (!rows.length) return null;
  if (Number.isFinite(selector.index)) return rows[clamp(selector.index, 0, rows.length - 1)];
  if (selector.select === "first") return rows[0];
  if (selector.select === "last") return rows[rows.length - 1];

  if (selector.field || selector.equal != null || selector.value != null || selector.oneOf) {
    return rows.find((row) => rowMatchesScene(row, selector)) || null;
  }

  const field = selector.by || encoding.y?.field || encoding.x?.field;
  if (field && selector.select === "min") {
    return rows.reduce((best, row) => (Number(row[field]) < Number(best[field]) ? row : best), rows[0]);
  }
  if (field) {
    return rows.reduce((best, row) => (Number(row[field]) > Number(best[field]) ? row : best), rows[0]);
  }

  return rows[rows.length - 1];
}

function rowMatchesScene(row, selector = {}, selectedRow = null) {
  if (!row) return false;
  if (selector.field) {
    const value = row[selector.field];
    if ("equal" in selector) return value === selector.equal;
    if ("value" in selector) return value === selector.value;
    if ("oneOf" in selector) return selector.oneOf.includes(value);
    if ("gte" in selector && value < selector.gte) return false;
    if ("gt" in selector && value <= selector.gt) return false;
    if ("lte" in selector && value > selector.lte) return false;
    if ("lt" in selector && value >= selector.lt) return false;
    return Boolean(value);
  }
  return selectedRow ? row === selectedRow : false;
}

function sceneRowKey(row, spec = {}) {
  if (!row) return "guide";
  const key = keyAccessor(spec, spec.encoding?.x?.field || spec.encoding?.y?.field);
  return String(key(row, 0));
}

function drawLine(chart, rows, spec, tooltip, d3) {
  const enc = spec.encoding || {};
  const t = chart.transition.base;
  const focus = spec.sceneState?.focus;
  const x = focusedLineXScale(rows, enc.x, chart, focus, d3);
  const y = quantitativeScale(rows, enc.y, [chart.innerHeight, 0], d3);
  const color = colorScale(rows, enc.color, d3);
  const key = keyAccessor(spec, enc.x?.field);
  const series = lineSeries(rows, spec, enc);
  const line = d3
    .line()
    .x((d) => position(x, d[enc.x.field]))
    .y((d) => y(d[enc.y.field]))
    .curve(curveFor(spec, d3));

  fadeNonLineShapes(chart);
  chart.scales = { x, y, color, orientation: "cartesian" };
  chart.channels = enc;
  chart.position = {
    x: (d) => position(x, d[enc.x.field]),
    y: (d) => y(d[enc.y.field])
  };
  drawGrid(chart, y, d3);
  drawXAxis(chart, x, enc.x?.title, d3);
  drawYAxis(chart, y, enc.y?.title, d3);

  chart.g
    .selectAll("path.sl-line")
    .data(series, (d) => d.key)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "sl-line")
          .attr("fill", "none")
          .attr("stroke", (d) => color(d.rows[0]))
          .attr("stroke-width", spec.strokeWidth || 3)
          .attr("d", (d) => line(d.rows))
          .style("opacity", 0)
          .call((selection) => drawPath(selection, t)),
      (update) =>
        update
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
          .attr("cx", (d) => position(x, d[enc.x.field]))
          .attr("cy", (d) => y(d[enc.y.field]))
          .attr("r", 0)
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
          .call(bindTooltip, spec, tooltip)
          .transition(t)
          .style("opacity", 1)
          .attr("cx", (d) => position(x, d[enc.x.field]))
          .attr("cy", (d) => y(d[enc.y.field]))
          .attr("fill", (d) => color(d))
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

function drawScatter(chart, rows, spec, tooltip, d3) {
  const enc = spec.encoding || {};
  const t = chart.transition.base;
  const x = bandOrLinear(rows, enc.x, [0, chart.innerWidth], d3);
  const y = quantitativeScale(rows, enc.y, [chart.innerHeight, 0], d3);
  const color = colorScale(rows, enc.color, d3);
  const rawKey = keyAccessor(spec, enc.x?.field);
  const key = scatterKeyAccessor(spec, rawKey);
  const radius = radiusScale(rows, enc.size, spec.size || 7, d3);
  const parentField = spec.sceneState?.granularity?.parentField || spec.granularity?.parentField || enc.color?.field;
  const previousAnchors = chart.scene.scatterAnchors || { byParent: new Map() };
  const nextParentAnchors = parentAnchors(rows, parentField, chartPosition);

  fadeNonPointShapes(chart);
  chart.scales = { x, y, color, orientation: "cartesian" };
  chart.channels = enc;
  chart.position = {
    x: (d) => position(x, d[enc.x.field]),
    y: (d) => y(d[enc.y.field])
  };
  drawGrid(chart, y, d3);
  drawXAxis(chart, x, enc.x?.title, d3);
  drawYAxis(chart, y, enc.y?.title, d3);

  chart.g
    .selectAll("circle.sl-point")
    .data(rows, function (d, i) {
      return d?.__slScatterJoinKey || key(d, i);
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
          .each((d, i) => {
            d.__slScatterJoinKey = key(d, i);
          })
          .call(bindTooltip, spec, tooltip)
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .attr("cx", (d) => chartPosition(d).x)
          .attr("cy", (d) => chartPosition(d).y)
          .attr("r", (d) => radius(d)),
      (update) =>
        update
          .each((d, i) => {
            d.__slScatterJoinKey = key(d, i);
          })
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

function drawUnit(chart, rows, spec, tooltip, d3) {
  const unit = spec.unit || {};
  const enc = spec.encoding || {};
  const t = chart.transition.base;
  const units = expandUnits(rows, spec, d3);
  const layout = unitLayout(units, chart, spec, d3);
  const color = colorScale(rows, enc.color, d3);

  hideAxesForUnit(chart, layout.axes, d3);
  chart.scales = { color, orientation: layout.name };
  chart.channels = enc;
  chart.position = {
    x: (d) => layout.x(d),
    y: (d) => layout.y(d)
  };
  drawLegend(chart, rows, enc.color, d3);
  fadeNonUnitShapes(chart);

  sceneLabel(chart, `${units.length} keyed units · layout: ${layout.name}`);

  chart.g
    .selectAll("circle.sl-unit")
    .data(units, (d) => d.__unitKey)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "sl-unit")
          .attr("cx", (d) => layout.x(d))
          .attr("cy", (d) => layout.y(d))
          .attr("r", 0)
          .attr("fill", (d) => color(d.__row))
          .attr("fill-opacity", 0.9)
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .call(bindUnitTooltip, spec, tooltip)
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .attr("r", layout.r),
      (update) =>
        update
          .call(bindUnitTooltip, spec, tooltip)
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .style("opacity", 1)
          .attr("cx", (d) => layout.x(d))
          .attr("cy", (d) => layout.y(d))
          .attr("r", layout.r)
          .attr("fill", (d) => color(d.__row)),
      (exit) =>
        exit
          .transition(t)
          .delay((d, i) => staggerDelay(spec, d, i))
          .style("opacity", 0)
          .attr("r", 0)
          .remove()
    );
}

function getScene(node, viewConfig, d3) {
  if (node.__scrollyLiteScene) return node.__scrollyLiteScene;

  const width = Math.max(320, node.clientWidth || 720);
  const height = viewConfig.height || 500;
  node.innerHTML = "";

  const svg = d3
    .select(node)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img");

  const scene = {
    node,
    svg,
    frame: svg.append("g").attr("class", "sl-frame"),
    grid: svg.append("g").attr("class", "sl-grid"),
    xAxis: svg.append("g").attr("class", "sl-axis sl-x-axis"),
    yAxis: svg.append("g").attr("class", "sl-axis sl-y-axis"),
    xLabel: svg.append("text").attr("class", "sl-axis-label sl-x-label"),
    yLabel: svg.append("text").attr("class", "sl-axis-label sl-y-label"),
    legend: svg.append("g").attr("class", "sl-legend"),
    unitLabel: svg.append("text").attr("class", "sl-unit-label"),
    textLayer: svg.append("foreignObject").attr("class", "sl-text-layer"),
    markLayers: new Map(),
    previousSpec: null,
    width,
    height
  };

  scene.granularityLayer = scene.frame
    .append("g")
    .attr("class", "sl-scene-layer sl-granularity-layer");
  scene.guideLayer = scene.frame.append("g").attr("class", "sl-scene-layer sl-guide-layer");

  scene.empty = d3
    .select(node)
    .append("div")
    .attr("class", "sl-empty")
    .style("display", "none");

  node.__scrollyLiteScene = scene;
  return scene;
}

function resizeScene(scene, width, height) {
  scene.width = width;
  scene.height = height;
  scene.svg.attr("viewBox", `0 0 ${width} ${height}`);
}

function transitionSpec(spec, previousSpec) {
  const local = spec.transition || {};
  const previous = previousSpec?.transition || {};
  const transition = {
    duration: 1000,
    ease: "cubicInOut",
    ...previous,
    ...local
  };
  const d3 = getD3();
  const ease = easeFor(transition.ease, d3);
  const base = d3.transition().duration(transition.duration).ease(ease);
  return { ...transition, base };
}

function easeFor(name, d3) {
  const eases = {
    linear: d3.easeLinear,
    cubic: d3.easeCubic,
    cubicInOut: d3.easeCubicInOut,
    exp: d3.easeExp,
    expInOut: d3.easeExpInOut,
    elastic: d3.easeElasticOut,
    back: d3.easeBackOut
  };
  return eases[name] || d3.easeCubicInOut;
}

function activeMarkLayer(scene, mark, transition) {
  fadeLayers(scene, mark, transition);
  if (!scene.markLayers.has(mark)) {
    scene.markLayers.set(
      mark,
      scene.frame.append("g").attr("class", `sl-mark-layer sl-${mark}-layer`)
    );
  }

  const layer = scene.markLayers.get(mark);
  layer.interrupt().style("display", null).transition(transition.base).style("opacity", 1);
  return layer;
}

function fadeLayers(scene, activeMark, transition = { base: getD3().transition().duration(300) }) {
  scene.markLayers.forEach((layer, mark) => {
    if (mark === activeMark) return;
    layer.interrupt().transition(transition.base).style("opacity", 0);
  });

  scene.textLayer
    .interrupt()
    .transition(transition.base)
    .style("opacity", activeMark === "text" ? 1 : 0);
}

function staggerDelay(spec, datum, index, override) {
  const stagger = override === undefined ? spec.transition?.stagger : override;
  if (!stagger) return 0;
  if (typeof stagger === "number") return index * stagger;

  const step = stagger.step ?? stagger.ms ?? 8;
  const max = stagger.max ?? 900;
  if (stagger.by) {
    const value = Number(datum[stagger.by] ?? datum.__row?.[stagger.by] ?? index);
    if (Number.isFinite(value)) return Math.min(value * step, max);
  }
  return Math.min(index * step, max);
}

function curveFor(spec, d3) {
  const curves = {
    linear: d3.curveLinear,
    monotoneX: d3.curveMonotoneX,
    basis: d3.curveBasis,
    step: d3.curveStep
  };
  return curves[spec.curve] || d3.curveMonotoneX;
}

function drawPath(selection, transition) {
  selection.each(function () {
    const path = getD3().select(this);
    const total = this.getTotalLength();
    path
      .attr("stroke-dasharray", `${total} ${total}`)
      .attr("stroke-dashoffset", total)
      .style("opacity", 1)
      .transition(transition)
      .attr("stroke-dashoffset", 0)
      .on("end", function () {
        getD3()
          .select(this)
          .attr("stroke-dasharray", null)
          .attr("stroke-dashoffset", null);
      });
  });
}

function fadeNonBarShapes(chart) {
  chart.g.selectAll("circle,path:not(.sl-line)").transition(chart.transition.base).style("opacity", 0);
}

function fadeNonLineShapes(chart) {
  chart.g.selectAll("rect.sl-bar,circle.sl-point,circle.sl-unit").transition(chart.transition.base).style("opacity", 0);
}

function fadeNonPointShapes(chart) {
  chart.g.selectAll("rect.sl-bar,path.sl-line,circle.sl-line-point,circle.sl-unit").transition(chart.transition.base).style("opacity", 0);
}

function fadeNonUnitShapes(chart) {
  chart.g.selectAll("rect.sl-bar,path.sl-line,circle.sl-line-point,circle.sl-point").transition(chart.transition.base).style("opacity", 0);
}

function lineSeries(rows, spec, enc = {}) {
  const seriesField = spec.lineSeries || spec.series || enc.series?.field;
  if (!seriesField) return [{ key: "__line", rows }];

  const grouped = new Map();
  rows.forEach((row) => {
    const key = row[seriesField] ?? "__missing";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  return Array.from(grouped, ([key, values]) => ({
    key: String(key),
    rows: values
  }));
}

function focusedLineXScale(rows, channel, chart, focus, d3) {
  const baseRange = [0, chart.innerWidth];
  if (!focus?.filter || focus.mode !== "rangeCrop") return bandOrLinear(rows, channel, baseRange, d3);

  const focusedRows = rows.filter((row) => rowMatchesFilter(row, focus.filter));
  if (focusedRows.length < 2) return bandOrLinear(rows, channel, baseRange, d3);

  if (channel?.type === "quantitative" || channel?.type === "temporal") {
    return bandOrLinear(rows, { ...channel, domain: focusedDomain(focusedRows, channel) }, baseRange, d3);
  }

  const base = bandOrLinear(rows, channel, baseRange, d3);
  const positions = focusedRows
    .map((row) => position(base, row[channel.field]))
    .filter(Number.isFinite);
  if (positions.length < 2) return base;

  const min = Math.min(...positions);
  const max = Math.max(...positions);
  if (min === max) return base;

  const inset = Math.min(chart.innerWidth * 0.08, 44);
  const factor = (chart.innerWidth - inset * 2) / (max - min);
  return bandOrLinear(
    rows,
    channel,
    [inset - min * factor, inset + (chart.innerWidth - min) * factor],
    d3
  );
}

function focusedDomain(rows, channel = {}) {
  if (channel.type === "temporal") return getD3().extent(rows, (d) => new Date(d[channel.field]));
  return niceExtent(rows, channel.field);
}

function applyPlotClip(chart, enabled) {
  if (!enabled) {
    chart.g.attr("clip-path", null);
    return;
  }

  const id = `sl-mark-clip-${chart.scene.node.dataset.viewId || "main"}`;
  ensureClipRect(chart.scene, id, {
    x: 0,
    y: 0,
    width: chart.innerWidth,
    height: chart.innerHeight
  });

  chart.g.attr("clip-path", `url(#${id})`);
}

function applyXAxisClip(chart) {
  const id = `sl-x-axis-clip-${chart.scene.node.dataset.viewId || "main"}`;
  ensureClipRect(chart.scene, id, {
    x: 0,
    y: -8,
    width: chart.innerWidth,
    height: 72
  });

  chart.scene.xAxis.attr("clip-path", `url(#${id})`);
}

function ensureClipRect(scene, id, rect) {
  let defs = scene.svg.select("defs");
  if (defs.empty()) defs = scene.svg.append("defs");

  defs
    .selectAll(`#${id}`)
    .data([null])
    .join("clipPath")
    .attr("id", id)
    .selectAll("rect")
    .data([null])
    .join("rect")
    .attr("x", rect.x)
    .attr("y", rect.y)
    .attr("width", rect.width)
    .attr("height", rect.height);
}

function rowMatchesFilter(row, filter = {}) {
  if (!filter?.field) return true;
  const value = row[filter.field];
  if ("equal" in filter) return value === filter.equal;
  if ("notEqual" in filter) return value !== filter.notEqual;
  if ("oneOf" in filter) return filter.oneOf.includes(value);
  if ("gte" in filter && value < filter.gte) return false;
  if ("gt" in filter && value <= filter.gt) return false;
  if ("lte" in filter && value > filter.lte) return false;
  if ("lt" in filter && value >= filter.lt) return false;
  return Boolean(value);
}

function expandUnits(rows, spec, d3) {
  const unit = spec.unit || {};
  const valueField = unit.valueField;
  const rowKey = unit.key || spec.key || "id";
  const maxUnits = unit.maxUnits || 240;
  const units = [];

  rows.forEach((row, rowIndex) => {
    const count = Math.max(0, Math.round(Number(valueField ? row[valueField] : 1) || 1));
    d3.range(count).forEach((unitIndex) => {
      units.push({
        ...row,
        __row: row,
        __unitIndex: unitIndex,
        __rowIndex: rowIndex,
        __unitKey: `${row[rowKey] ?? rowIndex}-${unitIndex}`
      });
    });
  });

  return units.slice(0, maxUnits);
}

function unitLayout(units, chart, spec, d3) {
  const unit = spec.unit || {};
  const layout = unit.layout || "grid";
  const columns = unit.columns || Math.max(8, Math.floor(Math.sqrt(units.length) * 1.4));
  const radius = unit.radius || Math.max(4, Math.min(12, chart.innerWidth / Math.max(columns * 2.4, 1)));
  const cell = radius * 2.45;
  const rowsNeeded = Math.ceil(units.length / columns);
  const groupField = unit.groupField || spec.encoding?.color?.field;
  const xField = unit.xField || spec.encoding?.x?.field;
  const yField = unit.yField || spec.encoding?.y?.field;

  if (layout === "timeline" && xField) {
    const x = bandOrLinear(units.map((d) => d.__row), { field: xField, type: unit.xType || "quantitative" }, [0, chart.innerWidth], d3);
    const base = chart.innerHeight - radius;
    const stackByX = stackIndex(units, (d) => d.__row[xField]);
    drawXAxis(chart, x, unit.xTitle || xField, d3);
    drawYAxis(chart, null, null, d3);
    updateGrid(chart, null, d3);
    return {
      name: "timeline",
      axes: true,
      r: radius,
      x: (d) => position(x, d.__row[xField]),
      y: (d) => base - stackByX(d) * cell
    };
  }

  if (layout === "dodge" && xField) {
    const x = bandOrLinear(units.map((d) => d.__row), { field: xField, type: unit.xType || "quantitative" }, [radius, chart.innerWidth - radius], d3);
    const centers = units.map((d) => position(x, d.__row[xField]));
    const yOffsets = dodge(centers, radius * 2.15, chart.innerHeight - radius * 2);
    const yByKey = new Map(units.map((d, i) => [d.__unitKey, yOffsets[i]]));
    drawXAxis(chart, x, unit.xTitle || xField, d3);
    drawYAxis(chart, null, null, d3);
    updateGrid(chart, null, d3);
    return {
      name: "dodge",
      axes: true,
      r: radius,
      x: (d) => position(x, d.__row[xField]),
      y: (d) => chart.innerHeight - radius - yByKey.get(d.__unitKey)
    };
  }

  if (layout === "groupedGrid" && groupField) {
    const groups = Array.from(new Set(units.map((d) => d.__row[groupField])));
    const groupScale = d3.scaleBand().domain(groups).range([0, chart.innerWidth]).padding(0.18);
    const groupColumns = Math.max(3, unit.groupColumns || Math.floor(groupScale.bandwidth() / cell));
    const stackByGroup = stackIndex(units, (d) => d.__row[groupField]);
    drawXAxis(chart, groupScale, unit.xTitle || groupField, d3);
    drawYAxis(chart, null, null, d3);
    updateGrid(chart, null, d3);
    return {
      name: "groupedGrid",
      axes: true,
      r: radius,
      x: (d) => groupScale(d.__row[groupField]) + (stackByGroup(d) % groupColumns) * cell + radius,
      y: (d) => chart.innerHeight - radius - Math.floor(stackByGroup(d) / groupColumns) * cell
    };
  }

  if (layout === "scatter" && xField && yField) {
    const x = bandOrLinear(units.map((d) => d.__row), { field: xField, type: unit.xType || "quantitative" }, [radius, chart.innerWidth - radius], d3);
    const y = d3
      .scaleLinear()
      .domain(niceExtent(units.map((d) => d.__row), yField))
      .range([chart.innerHeight - radius, radius])
      .nice();
    drawGrid(chart, y, d3);
    drawXAxis(chart, x, unit.xTitle || xField, d3);
    drawYAxis(chart, y, unit.yTitle || yField, d3);
    return {
      name: "scatter",
      axes: true,
      r: radius,
      x: (d) => position(x, d.__row[xField]),
      y: (d) => y(d.__row[yField]) + ((d.__unitIndex % 5) - 2) * radius * 0.35
    };
  }

  updateGrid(chart, null, d3);
  drawXAxis(chart, null, null, d3);
  drawYAxis(chart, null, null, d3);
  const startX = Math.max(0, (chart.innerWidth - columns * cell) / 2);
  const startY = Math.max(0, (chart.innerHeight - rowsNeeded * cell) / 2);
  return {
    name: "grid",
    axes: false,
    r: radius,
    x: (_, i) => startX + (i % columns) * cell + radius,
    y: (_, i) => startY + Math.floor(i / columns) * cell + radius
  };
}

function stackIndex(values, group) {
  const counts = new Map();
  const indexes = new Map();
  values.forEach((value) => {
    const key = group(value);
    const index = counts.get(key) || 0;
    counts.set(key, index + 1);
    indexes.set(value.__unitKey, index);
  });
  return (value) => indexes.get(value.__unitKey) || 0;
}

function dodge(X, radius, height) {
  const Y = new Float64Array(X.length);
  const radius2 = radius ** 2;
  const epsilon = 1e-3;
  let head = null;
  let tail = null;

  function intersects(x, y) {
    let a = head;
    while (a) {
      const ai = a.index;
      if (radius2 - epsilon > (X[ai] - x) ** 2 + (Y[ai] - y) ** 2) return true;
      a = a.next;
    }
    return false;
  }

  for (const bi of getD3().range(X.length).sort((i, j) => X[i] - X[j])) {
    while (head && X[head.index] < X[bi] - radius2) head = head.next;
    if (intersects(X[bi], (Y[bi] = 0))) {
      let a = head;
      Y[bi] = Infinity;
      do {
        const ai = a.index;
        const y = Y[ai] + Math.sqrt(radius2 - (X[ai] - X[bi]) ** 2);
        if (y < Y[bi] && !intersects(X[bi], y)) Y[bi] = y;
        a = a.next;
      } while (a);
    }
    const b = { index: bi, next: null };
    if (head === null) head = tail = b;
    else tail = tail.next = b;
  }

  if (height < getD3().max(Y) && radius > 2) return dodge(X, radius - 1, height);
  return Y;
}

function hideAxesForUnit(chart, visible) {
  if (visible) return;
  chart.scene.xAxis.transition(chart.transition.base).style("opacity", 0);
  chart.scene.yAxis.transition(chart.transition.base).style("opacity", 0);
  chart.scene.xLabel.transition(chart.transition.base).style("opacity", 0);
  chart.scene.yLabel.transition(chart.transition.base).style("opacity", 0);
  chart.scene.grid.transition(chart.transition.base).style("opacity", 0);
}

function sceneLabel(chart, text) {
  chart.scene.unitLabel
    .attr("x", chart.margin.left)
    .attr("y", chart.margin.top - 14)
    .attr("fill", "var(--sl-muted)")
    .attr("font-size", 13)
    .style("opacity", 0)
    .text(text)
    .transition(chart.transition.base)
    .style("opacity", 1);
}

function bindUnitTooltip(selection, spec, tooltip) {
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

function drawTextBoard(scene, spec) {
  const items = Array.isArray(spec.text) ? spec.text : [spec.text || ""];
  scene.textLayer
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", scene.width)
    .attr("height", scene.height)
    .html(
      `<div class="sl-text-board">
        <ul>
          ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>`
    );
}

function drawUnsupported(chart, spec, availableTypes = []) {
  chart.g
    .append("text")
    .attr("x", chart.innerWidth / 2)
    .attr("y", chart.innerHeight / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--sl-muted)")
    .text(
      `Unsupported chart: ${spec.mark}${
        availableTypes.length ? ` · available: ${availableTypes.join(", ")}` : ""
      }`
    );
}

function bandOrLinear(rows, channel, range, d3) {
  if (!channel) return d3.scaleLinear().domain([0, 1]).range(range);
  if (channel.type === "quantitative") {
    return quantitativeScale(rows, channel, range, d3);
  }
  if (channel.type === "temporal") {
    return d3
      .scaleTime()
      .domain(channel.domain || d3.extent(rows, (d) => new Date(d[channel.field])))
      .range(range);
  }
  return d3
    .scaleBand()
    .domain(channelDomain(rows, channel))
    .range(range)
    .padding(0.24);
}

function quantitativeScale(rows, channel = {}, range, d3) {
  const scaleType = channel.scale?.type || channel.scaleType || "linear";
  const domain = quantitativeDomain(rows, channel, scaleType === "log" ? 1 : undefined);
  if (scaleType === "log") {
    const safeDomain = domain.map((value) => Math.max(Number(value) || 1, 0.1));
    return d3.scaleLog().domain(safeDomain).range(range).nice();
  }
  if (scaleType === "sqrt") return d3.scaleSqrt().domain(domain).range(range).nice();
  return d3.scaleLinear().domain(domain).range(range).nice();
}

function position(scale, value) {
  const scaled = scale(value);
  if (typeof scale.bandwidth === "function") return scaled + scale.bandwidth() / 2;
  return scaled;
}

function niceExtent(rows, field, floor) {
  const values = rows.map((row) => Number(row[field])).filter(Number.isFinite);
  if (!values.length) return [0, 1];
  const min = floor ?? Math.min(...values);
  const max = Math.max(...values);
  return min === max ? [min - 1, max + 1] : [min, max];
}

function quantitativeDomain(rows, channel = {}, floor) {
  if (Array.isArray(channel.domain)) return channel.domain;
  return niceExtent(rows, channel.field, floor);
}

function radiusScale(rows, channel, fallback, d3) {
  if (!channel?.field) return () => fallback;
  const range = channel.range || [4, 16];
  const scale = d3
    .scaleSqrt()
    .domain(quantitativeDomain(rows, channel, 0))
    .range(range);
  return (row) => scale(Number(row[channel.field]) || 0);
}

function scatterKeyAccessor(spec, rawKey) {
  const mode = spec.sceneState?.granularity?.mode;
  if (!mode) return rawKey;
  return (row, index) => `${mode}:${rawKey(row, index)}`;
}

function parentAnchors(rows, parentField, positionForRow) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = parentKey(row, parentField);
    const point = positionForRow(row);
    if (!grouped.has(key)) grouped.set(key, { x: 0, y: 0, count: 0 });
    const anchor = grouped.get(key);
    anchor.x += point.x;
    anchor.y += point.y;
    anchor.count += 1;
  });

  return new Map(
    Array.from(grouped, ([key, anchor]) => [
      key,
      {
        x: anchor.x / anchor.count,
        y: anchor.y / anchor.count
      }
    ])
  );
}

function parentKey(row, parentField) {
  if (!row || !parentField) return "__all";
  if (Array.isArray(parentField)) return parentField.map((field) => row[field]).join("|");
  return String(row[parentField] ?? "__all");
}

function channelDomain(rows, channel = {}) {
  if (Array.isArray(channel.domain)) return channel.domain;
  return Array.from(new Set(rows.map((row) => row[channel.field])));
}

function colorScale(rows, channel, d3) {
  if (!channel) return () => "var(--sl-accent)";
  if (channel.value) return () => channel.value;
  if (!channel.field) return () => "var(--sl-accent)";

  const domain = channelDomain(rows, channel);
  const scale = d3.scaleOrdinal(channel.range || DEFAULT_PALETTE).domain(domain);
  return (row) => scale(row[channel.field]);
}

function drawXAxis(chart, scale, title, d3) {
  if (!scale) {
    chart.scene.xAxis.transition(chart.transition.base).style("opacity", 0);
    chart.scene.xLabel.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  applyXAxisClip(chart);
  const axis = typeof scale.bandwidth === "function" ? d3.axisBottom(scale) : d3.axisBottom(scale).ticks(6);
  chart.scene.xAxis
    .interrupt()
    .style("opacity", 1)
    .transition(chart.transition.base)
    .attr("transform", `translate(${chart.margin.left},${chart.margin.top + chart.innerHeight})`)
    .call(axis)
    .call((g) => g.selectAll(".tick text").attr("dy", "0.8em"));

  if (title) {
    chart.scene.xLabel
      .attr("x", chart.innerWidth / 2)
      .attr("y", chart.margin.top + chart.innerHeight + 48)
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${chart.margin.left},0)`)
      .text(title)
      .transition(chart.transition.base)
      .style("opacity", 1);
  } else {
    chart.scene.xLabel.transition(chart.transition.base).style("opacity", 0);
  }
}

function drawYAxis(chart, scale, title, d3) {
  if (!scale) {
    chart.scene.yAxis.transition(chart.transition.base).style("opacity", 0);
    chart.scene.yLabel.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  const axis = typeof scale.bandwidth === "function" ? d3.axisLeft(scale) : d3.axisLeft(scale).ticks(6);
  chart.scene.yAxis
    .interrupt()
    .style("opacity", 1)
    .transition(chart.transition.base)
    .attr("transform", `translate(${chart.margin.left},${chart.margin.top})`)
    .call(axis);

  if (title) {
    chart.scene.yLabel
      .attr("x", -chart.innerHeight / 2)
      .attr("y", chart.margin.left - 48)
      .attr("text-anchor", "middle")
      .attr("transform", `translate(0,${chart.margin.top}) rotate(-90)`)
      .text(title)
      .transition(chart.transition.base)
      .style("opacity", 1);
  } else {
    chart.scene.yLabel.transition(chart.transition.base).style("opacity", 0);
  }
}

function drawGrid(chart, y, d3) {
  updateGrid(chart, y, d3);
}

function updateGrid(chart, y, d3) {
  if (!y) {
    chart.scene.grid.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  chart.scene.grid
    .interrupt()
    .style("opacity", 1)
    .transition(chart.transition.base)
    .attr("transform", `translate(${chart.margin.left},${chart.margin.top})`)
    .call(d3.axisLeft(y).ticks(6).tickSize(-chart.innerWidth).tickFormat(""));
}

function drawLegend(chart, rows, channel, d3) {
  if (!channel || channel.value || !channel.field) {
    chart.scene.legend.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  const domain = Array.from(new Set(rows.map((row) => row[channel.field])));
  const scale = d3.scaleOrdinal(channel.range || DEFAULT_PALETTE).domain(domain);
  const legend = chart.scene.legend
    .interrupt()
    .style("opacity", 1)
    .attr(
      "transform",
      `translate(${chart.margin.left + Math.max(0, chart.innerWidth - 150)},${chart.margin.top})`
    );

  const items = legend.selectAll("g.sl-legend-item").data(domain, (d) => d);
  const entered = items
    .enter()
    .append("g")
    .attr("class", "sl-legend-item")
    .style("opacity", 0);

  entered.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2);
  entered.append("text").attr("x", 16).attr("y", 9);

  items
    .merge(entered)
    .transition(chart.transition.base)
    .style("opacity", 1)
    .attr("transform", (_, index) => `translate(0,${index * 20})`);

  items
    .merge(entered)
    .select("rect")
    .transition(chart.transition.base)
    .attr("fill", (d) => scale(d));

  items
    .merge(entered)
    .select("text")
    .text((d) => d);

  items.exit().transition(chart.transition.base).style("opacity", 0).remove();
}

function bindTooltip(selection, spec, tooltip) {
  selection
    .on("mouseenter", (event, row) => {
      const html = tooltipHtml(row, spec.encoding?.tooltip);
      if (html) showTooltip(tooltip, event, html);
    })
    .on("mousemove", (event) => moveTooltip(tooltip, event))
    .on("mouseleave", () => hideTooltip(tooltip));
}

function tooltipHtml(row, tooltipSpec) {
  if (!Array.isArray(tooltipSpec)) return "";
  return tooltipSpec
    .map((item) => `<strong>${escapeHtml(item.title || item.field)}</strong>: ${escapeHtml(row[item.field])}`)
    .join("<br>");
}

function showTooltip(tooltip, event, html) {
  tooltip.innerHTML = html;
  tooltip.style.opacity = "1";
  moveTooltip(tooltip, event);
}

function moveTooltip(tooltip, event) {
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}

function hideTooltip(tooltip) {
  tooltip.style.opacity = "0";
}

function setupScroll(spec, shell, renderer) {
  if (typeof globalThis.scrollama !== "function") {
    shell.steps.forEach((node, index) => {
      node.addEventListener("click", () => renderer.renderStep(index));
    });
    return;
  }

  const scroller = globalThis
    .scrollama()
    .setup({
      step: ".sl-step",
      offset: spec.layout.offset
    })
    .onStepEnter((response) => {
      const index = Number(response.element.dataset.stepIndex);
      renderer.renderStep(index);
    });

  window.addEventListener("resize", () => {
    scroller.resize();
    renderer.resize();
  });
}

function setupNav(spec, shell, renderer) {
  shell.navButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      shell.steps[index].scrollIntoView({ behavior: "smooth", block: "center" });
      renderer.renderStep(index);
    });
  });
}

function setupResize(renderer) {
  window.addEventListener("resize", renderer.resize);
}

function restoreHashPosition(renderer) {
  if (!window.location.hash) return;
  window.requestAnimationFrame(() => {
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    const index = Number(target.dataset.stepIndex);
    target.scrollIntoView({ block: "center" });
    if (Number.isFinite(index)) renderer.renderStep(index);
  });
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme.background) root.style.setProperty("--sl-bg", theme.background);
  if (theme.foreground) root.style.setProperty("--sl-fg", theme.foreground);
  if (theme.accent) root.style.setProperty("--sl-accent", theme.accent);
}

function resolveTarget(target) {
  if (typeof target !== "string") return target;
  const node = document.querySelector(target);
  if (!node) throw new Error(`ScrollyLite target not found: ${target}`);
  return node;
}

function getD3() {
  if (!globalThis.d3) {
    throw new Error("ScrollyLite requires D3 on globalThis.d3.");
  }
  return globalThis.d3;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

BUILT_IN_CHARTS
  .register("scatter", drawScatter)
  .register("line", drawLine)
  .register(
    "bar",
    createBarRenderer({
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
    })
  );
