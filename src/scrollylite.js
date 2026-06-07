import { applyTransforms } from "./data/transforms.js";
import { createBarIdiom } from "./charts/bar/idiom.js?v=semantic-key-6";
import { createLineRenderer } from "./charts/line/render.js?v=semantic-key-11";
import { createPointRenderer } from "./charts/scatter/render.js?v=semantic-key-12";
import { createUnitRenderer } from "./charts/unit/render.js?v=semantic-key-12";
import {
  createChartIdiomRegistry,
  resolveMarkRendererKey
} from "./charts/index.js?v=semantic-key-4";
import {
  externalizeScrollyViewSpec,
  narrativeScroll,
  narrativeState
} from "./scrolly-meta.js?v=semantic-key-10";
import {
  defaultScrollProgress,
  easeProgress,
  hasScrollAction,
  normalizeScrollAction
} from "./runtime/actions.js";
import {
  activeMarkLayer,
  applyPlotClip,
  bandOrLinear,
  bindTooltip,
  channelDomain,
  colorScale,
  curveFor,
  drawGrid,
  drawLegend,
  drawPath,
  drawTextBoard,
  drawUnsupported,
  drawXAxis,
  drawYAxis,
  easeFor,
  effectiveTransitionSpec,
  fadeLayers,
  fadeNonBarShapes,
  fadeNonLineShapes,
  fadeNonPointShapes,
  fadeNonUnitShapes,
  hideTooltip,
  moveTooltip,
  niceExtent,
  position,
  quantitativeDomain,
  quantitativeScale,
  showTooltip,
  staggerDelay,
  transitionSpec,
  updateGrid
} from "./runtime/marks.js";
import {
  restoreHashPosition,
  setupNav,
  setupResize,
  setupScroll
} from "./runtime/navigation.js";
import {
  compileSpec,
  domainTransforms,
  loadData,
  storySignature,
  viewRows
} from "./runtime/spec.js";
import { renderShell } from "./runtime/shell.js";
import {
  applySceneTransitions,
  getScene,
  resetSceneToEmptySource,
  resizeScene
} from "./runtime/scene.js";
import {
  clamp,
  escapeHtml,
  getD3
} from "./runtime/utils.js";
import {
  SCROLL_TRANSITION_NAME,
  clearSceneTransitionProgress,
  createSceneTransitionProgress,
  installTransitionProgress
} from "./transition-progress.js?v=scroll-transition-name-2";
import { compileEffectiveView, compileTransitionSource } from "./runtime/view-compile.js";
const BUILT_IN_CHART_IDIOMS = createChartIdiomRegistry();

const BUILT_IN_MARK_RENDERERS = {
  register(markOrRenderer, renderer = null) {
    if (renderer && typeof renderer === "object") {
      BUILT_IN_CHART_IDIOMS.register(markOrRenderer, renderer);
      return this;
    }
    if (typeof renderer === "function") {
      BUILT_IN_CHART_IDIOMS.register(markOrRenderer, { renderer });
      return this;
    }
    if (markOrRenderer && typeof markOrRenderer === "object") {
      BUILT_IN_CHART_IDIOMS.register(markOrRenderer);
      return this;
    }
    throw new Error("registerMarkRenderer requires a renderer function or chart idiom object.");
  },
  get(markOrRenderer) {
    return BUILT_IN_CHART_IDIOMS.get(markOrRenderer)?.renderer;
  },
  has(markOrRenderer) {
    return BUILT_IN_CHART_IDIOMS.has(markOrRenderer);
  },
  types() {
    return BUILT_IN_CHART_IDIOMS.types();
  }
};

export function registerMarkRenderer(markOrRenderer, renderer) {
  BUILT_IN_MARK_RENDERERS.register(markOrRenderer, renderer);
}

export function availableMarkRenderers() {
  return BUILT_IN_MARK_RENDERERS.types();
}

export function registerChartIdiom(keyOrIdiom, idiom) {
  BUILT_IN_CHART_IDIOMS.register(keyOrIdiom, idiom);
}

export function availableChartIdioms() {
  return BUILT_IN_CHART_IDIOMS.types();
}

export function registerChart(type, rendererOrIdiom) {
  registerMarkRenderer(type, rendererOrIdiom);
}

export function availableChartTypes() {
  return availableChartIdioms();
}

export async function createStory(spec, options = {}) {
  const d3 = getD3();
  installTransitionProgress(d3);
  const target = resolveTarget(options.target || "#app");
  const compiled = compileSpec(spec);

  applyTheme(compiled.theme);
  target.innerHTML = "";

  const data = await loadData(compiled.data);
  const shell = renderShell(target, compiled, { idioms: BUILT_IN_CHART_IDIOMS });
  const renderer = createRenderer(shell, compiled, data, d3);

  renderer.renderStep(0);
  const scrollDriver = setupScroll(compiled, shell, renderer);
  setupNav(shell, renderer, scrollDriver);
  const disposeResize = setupResize(renderer, scrollDriver);
  restoreHashPosition(shell, renderer, scrollDriver);

  return {
    spec: compiled,
    data,
    signature: storySignature(compiled),
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
    const markLabel = firstViewSpec.mark ? `mark: ${firstViewSpec.mark}` : "";
    shell.markName.dataset.chartLabel = markLabel;
    shell.markName.textContent = markLabel;

    Object.entries(shell.views).forEach(([viewId, node]) => {
      const viewConfig = spec.views[viewId] || {};
      const viewSpec = step.views[viewId] || step.views.main || {};
      node.__scrollyLiteMarkName = shell.markName;
      const previousStep = bounded > 0 ? spec.steps[bounded - 1] : null;
      const previousViewSpec = previousStep
        ? previousStep.views[viewId] || previousStep.views.main || null
        : null;
      drawView(node, viewSpec, viewConfig, datasets, shell.tooltip, d3, step.transition, step.action, {
        previousViewSpec,
        previousTransition: previousStep?.transition || {}
      });
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

function drawView(node, viewSpec, viewConfig, datasets, tooltip, d3, stepTransition = {}, stepAction = [], options = {}) {
  const scene = getScene(node, viewConfig, d3);
  scene.progressRoots = [
    node,
    node.__scrollyLiteMarkName
  ].filter(Boolean);

  if (!viewSpec || !viewSpec.mark) {
    clearVirtualScrollSequence(scene);
    scene.empty.style("display", "grid").text("No view for this step.");
    fadeLayers(scene, null);
    return;
  }

  scene.empty.style("display", "none");

  if (viewSpec.mark === "text") {
    clearVirtualScrollSequence(scene);
    fadeLayers(scene, "text");
    drawTextBoard(scene, viewSpec);
    return;
  }

  const { sceneTransition, effectiveViewSpec } = compileEffectiveView(viewSpec, stepTransition);
  const transitionSource = compileTransitionSource(
    options.previousViewSpec,
    options.previousTransition
  );

  if (scene.virtualRenderTimer) {
    window.clearTimeout(scene.virtualRenderTimer);
    scene.virtualRenderTimer = null;
  }

  // Scroll is continuous, so each scroll step scrubs from its authored adjacent
  // source. Stepped rendering is discrete and diffs from the currently rendered
  // state held in scene.previousSpec.
  const scrollDrivenStep = hasScrollAction(stepAction);
  const rawSourceSpec = scrollDrivenStep
    ? transitionSource.effectiveViewSpec
    : scene.previousSpec;
  const idiom = BUILT_IN_CHART_IDIOMS.get(effectiveViewSpec);
  const targetForPlan = prepareIdiomSpec(idiom, effectiveViewSpec);
  const sourceForPlan = prepareIdiomSpec(idiom, rawSourceSpec);
  const intermediatePhases = intermediateRenderPhases(idiom, sourceForPlan, targetForPlan);
  if (intermediatePhases.length) {
    const renderPhases = renderPhaseConfigs(intermediatePhases, {
      node,
      finalSpec: effectiveViewSpec,
      viewConfig,
      datasets,
      tooltip,
      d3,
      stepAction,
      finalSceneTransition: sceneTransition,
      transitionSource
    });

    if (scrollDrivenStep) {
      scene.virtualScrollSequence = createVirtualScrollSequence(renderPhases);
      renderVirtualScrollPhase(scene, 0);
      return;
    }

    clearVirtualScrollSequence(scene);
    renderPhaseSequence(scene, renderPhases, 0);
    return;
  }

  clearVirtualScrollSequence(scene);
  renderCompiledView(node, effectiveViewSpec, viewConfig, datasets, tooltip, d3, stepAction, sceneTransition, {
    transitionSource
  });
}

function renderCompiledView(node, effectiveViewSpec, viewConfig, datasets, tooltip, d3, stepAction = [], sceneTransition = {}, renderOptions = {}) {
  const scene = getScene(node, viewConfig, d3);
  const scrollDriven = renderOptions.scrollDriven ?? hasScrollAction(stepAction);
  if (scrollDriven && !renderOptions.skipScrollSourcePrep) {
    prepareScrollSourceState(
      node,
      viewConfig,
      datasets,
      tooltip,
      d3,
      renderOptions.transitionSource
    );
  }
  clearSceneTransitionProgress(scene, { finish: !scrollDriven });
  const idiom = BUILT_IN_CHART_IDIOMS.get(effectiveViewSpec);
  const renderSpec = idiom?.prepareSpec?.(effectiveViewSpec) || effectiveViewSpec;
  const previousRawSpec = scrollDriven
    ? renderOptions.transitionSource?.effectiveViewSpec || null
    : scene.previousSpec;
  const previousSpec = prepareIdiomSpec(idiom, previousRawSpec);
  const source = viewRows(renderSpec.data, datasets);
  const rows = applyTransforms(source, renderSpec.transform || []);
  const domainRows = applyTransforms(source, domainTransforms(renderSpec.transform || []));
  if (!rows.length) {
    scene.empty.style("display", "grid").text("No rows after transforms.");
    fadeLayers(scene, null);
    return;
  }

  const width = Math.max(320, node.clientWidth || 720);
  const height = viewConfig.height || effectiveViewSpec.height || 500;
  resizeScene(scene, width, height);

  const rendererKey = resolveMarkRendererKey(renderSpec);
  const chart = {
    scene,
    type: rendererKey,
    width,
    height,
    margin: {
      top: 58,
      right: 34,
      bottom: 64,
      left: 68,
      ...(idiom?.defaultMargin?.(renderSpec) || {}),
      ...(effectiveViewSpec.margin || {})
    },
    transition: transitionSpec(renderSpec, previousSpec, { scrollDriven }),
    transitionPlan: idiom?.resolveTransitionPlan?.(previousSpec, renderSpec) || {},
    sceneTransition,
    scrollDriven,
    scrollTransitionName: SCROLL_TRANSITION_NAME,
    sourceRows: source,
    domainRows
  };
  chart.innerWidth = chart.width - chart.margin.left - chart.margin.right;
  chart.innerHeight = chart.height - chart.margin.top - chart.margin.bottom;
  chart.frame = scene.frame.transition(chart.transition.base).attr(
    "transform",
    `translate(${chart.margin.left},${chart.margin.top})`
  );
  chart.g = activeMarkLayer(scene, rendererKey, chart.transition);
  applyPlotClip(chart, true);

  if (rendererKey !== "unit") {
    scene.unitLabel.transition(chart.transition.base).style("opacity", 0);
  }

  const renderer = idiom?.renderer;
  if (renderer) renderer(chart, rows, renderSpec, tooltip, d3);
  else drawUnsupported(chart, renderSpec, BUILT_IN_CHART_IDIOMS.types());

  if (rendererKey === "unit") hideUnitMetaLabel(scene);

  applySceneTransitions(chart, rows, renderSpec);
  if (scrollDriven) {
    scene.transitionProgress = createSceneTransitionProgress(scene, {
      transitionName: SCROLL_TRANSITION_NAME
    });
  }
  scene.previousSpec = renderSpec;
}

function prepareIdiomSpec(idiom, spec) {
  if (!spec) return null;
  return idiom?.prepareSpec?.(spec) || spec;
}

function intermediateRenderPhases(idiom, sourceSpec, targetSpec) {
  const raw = idiom?.intermediateSpecs?.(sourceSpec, targetSpec) ??
    idiom?.intermediateSpec?.(sourceSpec, targetSpec) ??
    [];
  const phases = Array.isArray(raw) ? raw : raw?.sequence || [raw];
  return phases
    .map((phase) => ({
      ...phase,
      spec: externalizeScrollyViewSpec(phase?.spec || null)
    }))
    .filter((phase) => phase.spec);
}

function renderPhaseConfigs(intermediatePhases, context) {
  let source = context.transitionSource;
  const phases = intermediatePhases.map((phase) => {
    const sceneTransition = sceneTransitionForPhase(phase);
    const config = {
      node: context.node,
      spec: phase.spec,
      viewConfig: context.viewConfig,
      datasets: context.datasets,
      tooltip: context.tooltip,
      d3: context.d3,
      stepAction: context.stepAction,
      sceneTransition,
      transitionSource: source
    };
    source = {
      effectiveViewSpec: phase.spec,
      sceneTransition
    };
    return config;
  });

  phases.push({
    node: context.node,
    spec: context.finalSpec,
    viewConfig: context.viewConfig,
    datasets: context.datasets,
    tooltip: context.tooltip,
    d3: context.d3,
    stepAction: context.stepAction,
    sceneTransition: context.finalSceneTransition,
    transitionSource: source
  });

  return phases;
}

function sceneTransitionForPhase(phase) {
  const sceneType = phase.scene || "guide";
  const state = narrativeState(phase.spec);
  return {
    scene: [sceneType],
    [sceneType]:
      state[sceneType] ||
      state.sceneState?.[sceneType] ||
      null
  };
}

function prepareScrollSourceState(node, viewConfig, datasets, tooltip, d3, transitionSource = {}) {
  const scene = getScene(node, viewConfig, d3);
  const sourceSpec = transitionSource?.effectiveViewSpec || null;
  if (!sourceSpec) {
    resetSceneToEmptySource(scene);
    return;
  }

  renderCompiledView(
    node,
    sourceSpec,
    viewConfig,
    datasets,
    tooltip,
    d3,
    { action: ["scroll"] },
    transitionSource.sceneTransition || {},
    {
      scrollDriven: true,
      skipScrollSourcePrep: true,
      transitionSource: null
    }
  );
  scene.transitionProgress?.progress(1);
  clearSceneTransitionProgress(scene, { finish: true });
}


function virtualRenderDelay(spec = {}) {
  const transition = effectiveTransitionSpec(spec);
  const duration = Number(transition.duration);
  const fallbackDuration = Number(effectiveTransitionSpec({}).duration) || 900;
  const stagger = transition.stagger;
  const staggerMax =
    typeof stagger === "object"
      ? Number(stagger.max ?? 0)
      : 0;
  return Math.max(1, Number.isFinite(duration) ? duration : fallbackDuration) + (Number.isFinite(staggerMax) ? staggerMax : 0);
}

function clearVirtualScrollSequence(scene) {
  scene.virtualScrollSequence = null;
}

function createVirtualScrollSequence(phases = []) {
  const durations = phases.map((phase) => virtualRenderDelay(phase.spec));
  const total = Math.max(1, durations.reduce((sum, duration) => sum + duration, 0));
  let cursor = 0;
  return {
    phase: null,
    phases: phases.map((phase, index) => {
      const start = cursor / total;
      cursor += durations[index];
      const end = index === phases.length - 1 ? 1 : cursor / total;
      return { ...phase, start, end };
    })
  };
}

function renderPhaseSequence(scene, phases = [], index = 0) {
  const config = phases[index];
  if (!config) return;

  renderCompiledView(
    config.node,
    config.spec,
    config.viewConfig,
    config.datasets,
    config.tooltip,
    config.d3,
    config.stepAction,
    config.sceneTransition,
    {
      transitionSource: config.transitionSource
    }
  );

  if (index >= phases.length - 1) return;
  scene.virtualRenderTimer = window.setTimeout(() => {
    scene.virtualRenderTimer = null;
    renderPhaseSequence(scene, phases, index + 1);
  }, virtualRenderDelay(config.spec));
}

function renderVirtualScrollPhase(scene, phaseIndex) {
  const sequence = scene.virtualScrollSequence;
  const config = sequence?.phases?.[phaseIndex];
  if (!sequence || !config || sequence.phase === phaseIndex) return;

  sequence.phase = phaseIndex;
  renderCompiledView(
    config.node,
    config.spec,
    config.viewConfig,
    config.datasets,
    config.tooltip,
    config.d3,
    config.stepAction,
    config.sceneTransition,
    {
      transitionSource: config.transitionSource
    }
  );
}

function applyVirtualScrollSequence(scene, progress) {
  const sequence = scene.virtualScrollSequence;
  if (!sequence?.phases?.length) return false;

  const bounded = clamp(progress, 0, 1);
  const phases = sequence.phases;
  const phaseIndex = phases.findIndex((phase, index) =>
    bounded <= phase.end || index === phases.length - 1
  );
  const phase = phases[Math.max(0, phaseIndex)];
  const span = Math.max(0.001, phase.end - phase.start);

  renderVirtualScrollPhase(scene, Math.max(0, phaseIndex));
  scene.transitionProgress?.progress(clamp((bounded - phase.start) / span, 0, 1));
  return true;
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

  const action = normalizeScrollAction(narrativeScroll(viewSpec));
  const eased = easeProgress(progress, action.ease);
  if (applyVirtualScrollSequence(scene, eased)) return;
  scene.transitionProgress?.progress(eased);
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




BUILT_IN_MARK_RENDERERS
  .register(
    "point",
    createPointRenderer({
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
    createBarIdiom({
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
