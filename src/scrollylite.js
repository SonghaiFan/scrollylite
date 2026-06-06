import {
  designSpaceClasses,
  designSpaceSignature,
  normalizeDesignSpace
} from "./design-space.js";
import { applyTransforms } from "./data/transforms.js";
import { keyAccessor } from "./identity/semantic-key.js";
import { createBarRenderer } from "./charts/bar/render.js?v=semantic-key-5";
import { resolveBarTransitionPlan } from "./charts/bar/state.js";
import { createLineRenderer } from "./charts/line/render.js?v=semantic-key-5";
import { createScatterRenderer } from "./charts/scatter/render.js?v=semantic-key-5";
import { createUnitRenderer } from "./charts/unit/render.js?v=semantic-key-5";
import { createChartRegistry, normalizeChartType } from "./charts/index.js";
import { layoutClasses } from "./layouts/index.js";
import {
  createScrollDriver,
  normalizeScrollDriverConfig
} from "./scroll-drivers/index.js";
import { DEFAULT_TIMING, defaultTransition } from "./timing.js";
import {
  clearSceneTransitionProgress,
  createSceneTransitionProgress,
  installTransitionProgress
} from "./transition-progress.js";
import {
  compileSceneViewSpec,
  hasScene,
  resolveSceneTransition,
  withSceneTransitionDefaults
} from "./transitions/index.js?v=semantic-key-5";

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
const DEFAULT_LUMINANCE_BASE = "#2f7d7e";
const SEMANTIC_CATEGORY_COLORS = {
  "hot": "#b05d3b",
  "hot days": "#b05d3b",
  "cold": "#536a9e",
  "cold days": "#536a9e"
};

const BUILT_IN_CHARTS = createChartRegistry();

export function registerChart(type, renderer) {
  BUILT_IN_CHARTS.register(type, renderer);
}

export function availableChartTypes() {
  return BUILT_IN_CHARTS.types();
}

export async function createStory(spec, options = {}) {
  const d3 = getD3();
  installTransitionProgress(d3);
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
  const scrollDriver = setupScroll(compiled, shell, renderer);
  setupNav(shell, renderer, scrollDriver);
  const disposeResize = setupResize(renderer, scrollDriver);
  restoreHashPosition(shell, renderer, scrollDriver);

  return {
    spec: compiled,
    data,
    signature: designSpaceSignature(compiled),
    renderStep: renderer.renderStep,
    renderScrollProgress: renderer.renderScrollProgress,
    scrollDriver,
    destroy() {
      disposeResize();
      scrollDriver?.destroy?.();
      renderer.destroy();
    }
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

  const layout = {
    offset: 0.55,
    nav: true,
    progress: true,
    scroll: {},
    ...(spec.layout || {})
  };
  layout.scroll = normalizeScrollDriverConfig(layout.scroll);

  return {
    ...spec,
    data: spec.data || {},
    designSpace: baseDesignSpace,
    views: spec.views || { main: {} },
    theme: spec.theme || {},
    layout,
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
  let progressFrame = null;
  let pendingProgress = null;

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
    const chartLabel = firstViewSpec.mark ? `chart: ${normalizeChartType(firstViewSpec.mark)}` : "";
    shell.markName.dataset.chartLabel = chartLabel;
    shell.markName.textContent = chartLabel;

    Object.entries(shell.views).forEach(([viewId, node]) => {
      const viewConfig = spec.views[viewId] || {};
      const viewSpec = step.views[viewId] || step.views.main || {};
      node.__scrollyLiteMarkName = shell.markName;
      drawView(node, viewSpec, viewConfig, datasets, shell.tooltip, d3, step.designSpace);
    });

    if (hasScrollAction(step)) {
      applyStepScrollProgress(shell, spec, bounded, options.scrollProgress ?? defaultScrollProgress(options.direction));
    }
  };

  const renderScrollProgress = (index, progress, direction = "down") => {
    const bounded = clamp(index, 0, spec.steps.length - 1);
    const step = spec.steps[bounded];
    if (!hasScrollAction(step)) return;

    pendingProgress = {
      index: bounded,
      progress: clamp(progress, 0, 1),
      direction
    };

    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(() => {
      progressFrame = null;
      if (!pendingProgress) return;
      const next = pendingProgress;
      pendingProgress = null;

      if (activeIndex !== next.index) return;

      updateStoryProgress(shell, spec, next.index, next.progress);
      applyStepScrollProgress(shell, spec, next.index, next.progress);
    });
  };

  const cancelScrollProgress = () => {
    pendingProgress = null;
    if (progressFrame) {
      window.cancelAnimationFrame(progressFrame);
      progressFrame = null;
    }
  };

  const resize = () => {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      if (activeIndex >= 0) renderStep(activeIndex, { force: true });
    });
  };

  return {
    renderStep,
    renderScrollProgress,
    cancelScrollProgress,
    resize,
    destroy() {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      cancelScrollProgress();
    }
  };
}

function drawView(node, viewSpec, viewConfig, datasets, tooltip, d3, designSpace = {}) {
  const scene = getScene(node, viewConfig, d3);
  scene.progressRoots = [
    node,
    node.__scrollyLiteMarkName
  ].filter(Boolean);

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
  const scrollDriven = hasScrollActionDesign(designSpace);
  clearSceneTransitionProgress(scene);
  const source = effectiveViewSpec.data ? datasets[effectiveViewSpec.data] || [] : [];
  const rows = applyTransforms(source, effectiveViewSpec.transform || []);
  const domainRows = applyTransforms(source, domainTransforms(effectiveViewSpec.transform || []));
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
      top: 58,
      right: 34,
      bottom: 64,
      left: 68,
      ...(effectiveViewSpec.margin || {})
    },
    transition: transitionSpec(effectiveViewSpec, previousSpec),
    transitionPlan: resolveBarTransitionPlan(previousSpec, effectiveViewSpec),
    sceneTransition,
    scrollDriven,
    sourceRows: source,
    domainRows
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

  if (chartType === "unit") hideUnitMetaLabel(scene);

  applySceneTransitions(chart, rows, effectiveViewSpec);
  if (scrollDriven) scene.transitionProgress = createSceneTransitionProgress(scene);
  scene.previousSpec = effectiveViewSpec;
}

function hideUnitMetaLabel(scene) {
  scene.unitLabel.interrupt().text("").style("opacity", 0);
}

function updateStoryProgress(shell, spec, index, progress = 0) {
  if (!shell.progressFill) return;
  const denominator = Math.max(1, spec.steps.length - 1);
  const pct = spec.steps.length === 1
    ? 100
    : ((index + clamp(progress, 0, 1)) / denominator) * 100;
  shell.progressFill.style.width = `${Math.min(100, pct)}%`;
}

function hasScrollAction(step = {}) {
  return (step.designSpace?.action || []).includes("scroll");
}

function hasScrollActionDesign(designSpace = {}) {
  return (designSpace.action || []).includes("scroll");
}

function domainTransforms(transforms = []) {
  return transforms.filter((transform) => !transform.filter && !transform.limit);
}

function defaultScrollProgress(direction) {
  return direction === "up" ? 1 : 0;
}

function applyStepScrollProgress(shell, spec, index, progress) {
  const step = spec.steps[index];
  if (!step || !hasScrollAction(step)) return;

  Object.entries(shell.views).forEach(([viewId, node]) => {
    const viewSpec = step.views[viewId] || step.views.main || {};
    applyScrollAction(node, viewSpec, progress);
  });
}

function applyScrollAction(node, viewSpec, progress) {
  const scene = node.__scrollyLiteScene;
  if (!scene || !viewSpec?.mark) return;

  const action = normalizeScrollAction(viewSpec.scroll);
  const eased = easeProgress(progress, action.ease);
  scene.transitionProgress?.progress(eased);
}

function normalizeScrollAction(scrollSpec = {}) {
  if (scrollSpec === true) return {};
  return {
    ease: "linear",
    ...scrollSpec
  };
}

function easeProgress(progress, name = "linear") {
  const d3 = getD3();
  const eases = {
    linear: d3.easeLinear,
    cubic: d3.easeCubic,
    cubicInOut: d3.easeCubicInOut,
    cubicOut: d3.easeCubicOut
  };
  const ease = eases[name] || d3.easeLinear;
  return clamp(ease(clamp(progress, 0, 1)), 0, 1);
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

  const frame = svg.append("g").attr("class", "sl-frame");
  const grid = frame.append("g").attr("class", "sl-grid");
  const markRoot = frame.append("g").attr("class", "sl-mark-root");

  const scene = {
    node,
    svg,
    frame,
    grid,
    markRoot,
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

  scene.granularityLayer = markRoot
    .append("g")
    .attr("class", "sl-scene-layer sl-granularity-layer");
  scene.guideLayer = frame.append("g").attr("class", "sl-scene-layer sl-guide-layer");

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
    ...defaultTransition(),
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
      scene.markRoot.append("g").attr("class", `sl-mark-layer sl-${mark}-layer`)
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

  const step = stagger.step ?? stagger.ms ?? DEFAULT_TIMING.transition.stagger.step;
  const max = stagger.max ?? DEFAULT_TIMING.transition.stagger.max;
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
  const labelPadding = 28;
  ensureClipRect(chart.scene, id, {
    x: -labelPadding,
    y: -8,
    width: chart.innerWidth + labelPadding * 2,
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

function channelDomain(rows, channel = {}) {
  if (Array.isArray(channel.domain)) return channel.domain;
  return Array.from(new Set(rows.map((row) => row[channel.field])));
}

function colorScale(rows, channel, d3) {
  const resolved = resolveColorChannel(rows, channel);
  if (!resolved) return () => "var(--sl-accent)";
  channel = resolved;
  if (channel.value) return () => channel.value;
  if (channel.hue || channel.luminance) return compositeColorScale(channel, d3);
  if (!channel.field) return () => "var(--sl-accent)";

  if (channel.type === "quantitative") return luminanceColorScale(rows, channel, d3);

  const domain = channelDomain(rows, channel);
  const scale = d3.scaleOrdinal(channel.range || categoricalRange(domain)).domain(domain);
  return (row) => scale(row[channel.field]);
}

function resolveColorChannel(rows, channel) {
  if (channel === false) return null;
  if (channel?.value) return channel;
  if (channel?.hue || channel?.luminance) {
    return {
      ...channel,
      ...(channel.hue ? { hue: normalizeColorSubchannel(rows, channel.hue) } : {}),
      ...(channel.luminance ? { luminance: normalizeColorSubchannel(rows, channel.luminance) } : {})
    };
  }
  if (channel?.field) {
    return {
      ...channel,
      type: channel.type || inferFieldType(rows, channel.field)
    };
  }

  const field = defaultColorField(rows);
  if (!field) return null;
  return {
    field,
    type: inferFieldType(rows, field),
    inferred: true
  };
}

function normalizeColorSubchannel(rows, channel = {}) {
  if (!channel.field) return channel;
  return {
    ...channel,
    type: channel.type || inferFieldType(rows, channel.field)
  };
}

function defaultColorField(rows) {
  const preferred = ["type", "kind", "category", "group", "series", "period"];
  return preferred.find((field) => rows.some((row) => row[field] != null));
}

function inferFieldType(rows, field) {
  const values = rows
    .map((row) => row[field])
    .filter((value) => value != null && value !== "");
  if (!values.length) return "nominal";
  return values.every((value) => Number.isFinite(Number(value))) ? "quantitative" : "nominal";
}

function categoricalRange(domain) {
  return domain.map((value, index) => (
    semanticCategoryColor(value) || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]
  ));
}

function semanticCategoryColor(value) {
  return SEMANTIC_CATEGORY_COLORS[String(value ?? "").trim().toLowerCase()];
}

function luminanceColorScale(rows, channel, d3) {
  const domain = quantitativeDomain(rows, channel);
  const base = channel.base || channel.value || DEFAULT_LUMINANCE_BASE;
  const lightness = channel.lightness || [22, -18];
  const scale = d3
    .scaleLinear()
    .domain(domain)
    .range(lightness)
    .clamp(true);

  return (row = {}) => adjustLightness(base, scale(Number(row[channel.field])), d3);
}

function compositeColorScale(channel, d3) {
  const hue = channel.hue || {};
  const luminance = channel.luminance || {};
  const hueDomain = hue.domain || [];
  const hueScale = d3.scaleOrdinal(hue.range || categoricalRange(hueDomain)).domain(hueDomain);
  const luminanceDomain = luminance.domain || [];
  const continuousLuminance =
    luminance.type === "quantitative" ||
    (luminanceDomain.length === 2 && luminanceDomain.every((value) => Number.isFinite(Number(value))));
  const lightness = luminance.lightness || [18, 0, -18];
  const lightnessScale = continuousLuminance
    ? d3.scaleLinear()
        .domain(luminanceDomain.map(Number))
        .range([lightness[0], lightness[lightness.length - 1]])
        .clamp(true)
    : d3
        .scaleOrdinal(lightness)
        .domain(luminanceDomain);

  return (row = {}) => {
    const base = hue.value || hueScale(row[hue.field]);
    const luminanceValue = row[luminance.field];
    const offset =
      luminance.field && (continuousLuminance || luminanceDomain.includes(luminanceValue))
        ? Number(lightnessScale(continuousLuminance ? Number(luminanceValue) : luminanceValue)) || 0
        : 0;
    return adjustLightness(base, offset, d3);
  };
}

function adjustLightness(color, offset, d3) {
  const hcl = d3.hcl(color || "var(--sl-accent)");
  if (!Number.isFinite(hcl.l)) return color || "var(--sl-accent)";
  hcl.l = clamp(hcl.l + offset, 0, 100);
  return hcl.formatHex();
}

function drawXAxis(chart, scale, title, d3) {
  if (!scale) {
    chart.scene.xAxis.transition(chart.transition.base).style("opacity", 0);
    chart.scene.xLabel.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  applyXAxisClip(chart);
  const axis = typeof scale.bandwidth === "function" ? d3.axisBottom(scale) : d3.axisBottom(scale).ticks(6);
  const xAxis = chart.scene.xAxis
    .interrupt()
    .style("opacity", 1);

  xAxis
    .transition(chart.transition.base)
    .attr("transform", `translate(${chart.margin.left},${chart.margin.top + chart.innerHeight})`)
    .call(axis)
    .on("end", () => {
      xAxis.selectAll(".tick text").attr("dy", "0.8em");
      alignEdgeTickLabels(xAxis, scale, d3);
    });

  xAxis.selectAll(".tick text").attr("dy", "0.8em");
  alignEdgeTickLabels(xAxis, scale, d3);

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

function alignEdgeTickLabels(axisGroup, scale, d3) {
  if (typeof scale.bandwidth === "function" || typeof scale.range !== "function") return;

  const range = scale.range();
  const min = Math.min(...range);
  const max = Math.max(...range);
  axisGroup.selectAll(".tick").each(function () {
    const tick = d3.select(this);
    const transform = tick.attr("transform") || "";
    const match = transform.match(/translate\(([-\d.]+)/);
    if (!match) return;

    const x = Number(match[1]);
    const text = tick.select("text");
    if (Math.abs(x - min) <= 1) text.attr("text-anchor", "start").attr("dx", "0.15em");
    else if (Math.abs(x - max) <= 1) text.attr("text-anchor", "end").attr("dx", "-0.15em");
    else text.attr("text-anchor", "middle").attr("dx", null);
  });
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
    .attr("transform", null)
    .call(d3.axisLeft(y).ticks(6).tickSize(-chart.innerWidth).tickFormat(""));
}

function drawLegend(chart, rows, channel, d3) {
  const colorRows = chart.domainRows?.length ? chart.domainRows : rows;
  channel = resolveColorChannel(colorRows, channel);
  if (!channel || channel.value || (!channel.field && !channel.hue && !channel.luminance)) {
    chart.scene.legend.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  const legendChannel = channel.hue?.field ? channel.hue : channel.luminance?.field ? channel.luminance : channel;
  const quantitativeLegend = legendChannel.type === "quantitative";
  const domain = quantitativeLegend
    ? quantitativeLegendDomain(colorRows, legendChannel, d3)
    : channelDomain(colorRows, legendChannel);
  const scale = channel.hue || channel.luminance
    ? compositeColorScale(channel, d3)
    : quantitativeLegend
      ? luminanceColorScale(colorRows, legendChannel, d3)
      : d3.scaleOrdinal(channel.range || categoricalRange(domain)).domain(domain);
  const legendRow = (value) => ({ [legendChannel.field]: value });
  const legend = chart.scene.legend
    .interrupt()
    .style("opacity", 1)
    .attr(
      "transform",
      `translate(${chart.margin.left},${Math.max(18, chart.margin.top - 32)})`
    );

  const items = legend.selectAll("g.sl-legend-item").data(domain, (d) => d);
  const entered = items
    .enter()
    .append("g")
    .attr("class", "sl-legend-item")
    .style("opacity", 0);

  entered.append("rect").attr("width", 9).attr("height", 9).attr("rx", 1.5);
  entered.append("text").attr("x", 15).attr("y", 8.5);

  items
    .merge(entered)
    .transition(chart.transition.base)
    .style("opacity", 1)
    .attr("transform", (_, index) => `translate(${legendItemX(domain, index)},0)`);

  items
    .merge(entered)
    .select("rect")
    .transition(chart.transition.base)
    .attr("fill", (d) => channel.hue || channel.luminance ? scale(legendRow(d)) : scale(d));

  items
    .merge(entered)
    .select("text")
    .text((d) => quantitativeLegend ? d3.format("~g")(d) : d);

  items.exit().transition(chart.transition.base).style("opacity", 0).remove();
}

function quantitativeLegendDomain(rows, channel, d3) {
  const [min, max] = quantitativeDomain(rows, channel);
  if (min === max) return [min];
  return d3.ticks(min, max, 3);
}

function legendItemX(domain, index) {
  return domain.slice(0, index).reduce((x, value) => x + String(value).length * 7 + 30, 0);
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
  const driver = createScrollDriver({
    steps: shell.steps,
    offset: spec.layout.offset,
    threshold: spec.layout.threshold || 4,
    config: spec.layout.scroll,
    isLocked: () => isNavigationLocked(shell),
    onEnter: ({ index, direction }) => {
      if (!shouldAcceptScrollEvent(shell, index)) return;
      renderer.renderStep(index, { direction });
    },
    onExit: ({ index, direction }) => {
      if (!shouldAcceptScrollEvent(shell, index)) return;
      renderer.renderScrollProgress(index, direction === "down" ? 1 : 0, direction);
    },
    onProgress: ({ index, progress, direction }) => {
      if (!shouldAcceptScrollEvent(shell, index)) return;
      renderer.renderScrollProgress(index, progress, direction);
    }
  });

  shell.story.dataset.scrollDriver = "native";
  shell.story.__scrollyLiteScrollDriver = driver;
  return driver;
}

function shouldAcceptScrollEvent(shell, index) {
  const navTargetIndex = shell.story.dataset.navTargetIndex;
  return !navTargetIndex || Number(navTargetIndex) === index;
}

function setupNav(shell, renderer, scrollDriver) {
  shell.navButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      lockRenderStep(shell, renderer, scrollDriver, index);
    });
  });
}

function setupResize(renderer, scrollDriver) {
  const resize = () => {
    renderer.resize();
    scrollDriver?.resize?.();
  };
  window.addEventListener("resize", resize);
  return () => window.removeEventListener("resize", resize);
}

function restoreHashPosition(shell, renderer, scrollDriver) {
  if (!window.location.hash) return;
  window.requestAnimationFrame(() => {
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    const index = Number(target.dataset.stepIndex);
    if (Number.isFinite(index)) lockRenderStep(shell, renderer, scrollDriver, index, target);
  });
}

function lockRenderStep(shell, renderer, scrollDriver, index, targetStep = null) {
  const step = targetStep || shell.steps[index];
  if (!step || !shell.story) return;
  const token = beginNavigationLock(shell, renderer, index);
  const targetTop = scrollDriver?.scrollToStep
    ? scrollDriver.scrollToStep(index)
    : scrollStepIntoView(step);
  renderer.renderStep(index, { force: true, scrollProgress: 1 });
  waitForNavigationScroll(shell, renderer, index, token, targetTop);
}

function scrollStepIntoView(step) {
  step.scrollIntoView({ behavior: "auto", block: "center" });
  return null;
}

function beginNavigationLock(shell, renderer, index) {
  clearNavigationTimers(shell);
  renderer.cancelScrollProgress?.();
  const token = String((Number(shell.story.dataset.navLockToken) || 0) + 1);
  shell.story.dataset.navLockToken = token;
  shell.story.dataset.navTargetIndex = String(index);
  return token;
}

function endNavigationLock(shell, token) {
  if (!isCurrentNavigation(shell, token)) return;
  delete shell.story.dataset.navTargetIndex;
  delete shell.story.dataset.navLockToken;
  clearNavigationTimers(shell);
}

function isNavigationLocked(shell) {
  return Boolean(shell.story?.dataset.navLockToken);
}

function isCurrentNavigation(shell, token) {
  return shell.story?.dataset.navLockToken === token;
}

function waitForNavigationScroll(shell, renderer, index, token, targetTop) {
  if (!Number.isFinite(targetTop)) {
    addNavigationTimer(shell, window.setTimeout(() => {
      finishNavigationLock(shell, renderer, index, token);
    }, 900));
    return;
  }

  const startedAt = now();
  const timeout = 1400;
  const tolerance = 2;
  const check = () => {
    if (!isCurrentNavigation(shell, token)) return;
    const reachedTarget = Math.abs(window.scrollY - targetTop) <= tolerance;
    const expired = now() - startedAt >= timeout;
    if (reachedTarget || expired) {
      finishNavigationLock(shell, renderer, index, token);
      return;
    }
    addNavigationTimer(shell, window.setTimeout(check, 50));
  };

  addNavigationTimer(shell, window.setTimeout(check, 50));
}

function finishNavigationLock(shell, renderer, index, token) {
  if (!isCurrentNavigation(shell, token)) return;
  renderer.renderStep(index, { force: true, scrollProgress: 1 });
  endNavigationLock(shell, token);
}

function now() {
  return window.performance?.now?.() ?? Date.now();
}

function addNavigationTimer(shell, timer) {
  const timers = shell.story.__scrollyLiteNavTimers || [];
  timers.push(timer);
  shell.story.__scrollyLiteNavTimers = timers;
}

function clearNavigationTimers(shell) {
  const timers = shell.story.__scrollyLiteNavTimers || [];
  timers.forEach((timer) => window.clearTimeout(timer));
  shell.story.__scrollyLiteNavTimers = [];
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
  .register(
    "scatter",
    createScatterRenderer({
      bandOrLinear,
      bindTooltip,
      colorScale,
      drawGrid,
      drawLegend,
      drawXAxis,
      drawYAxis,
      fadeNonPointShapes,
      position,
      quantitativeDomain,
      quantitativeScale,
      staggerDelay
    })
  )
  .register(
    "line",
    createLineRenderer({
      bandOrLinear,
      bindTooltip,
      colorScale,
      curveFor,
      drawGrid,
      drawLegend,
      drawPath,
      drawXAxis,
      drawYAxis,
      fadeNonLineShapes,
      niceExtent,
      position,
      quantitativeScale,
      staggerDelay
    })
  )
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
  )
  .register(
    "unit",
    createUnitRenderer({
      bandOrLinear,
      colorScale,
      drawGrid,
      drawLegend,
      drawXAxis,
      drawYAxis,
      escapeHtml,
      fadeNonUnitShapes,
      hideTooltip,
      moveTooltip,
      niceExtent,
      position,
      showTooltip,
      staggerDelay,
      updateGrid
    })
  );
