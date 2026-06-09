import { applyTransforms } from "./data/transforms.js";
import { chartModules } from "./charts/manifest.js";
import {
  createChartIdiomRegistry,
  registerChartModules,
  resolveMarkRendererKey
} from "./charts/index.js";
import {
  externalizeScrollyViewSpec,
  narrativeScroll,
  narrativeState
} from "./scrolly-meta.js";
import {
  defaultScrollProgress,
  easeProgress,
  hasScrollAction,
  normalizeActionEvent,
  normalizeActionTokens,
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
  escapeHtml
} from "./runtime/utils.js";
import {
  SCROLL_TRANSITION_NAME,
  clearSceneTransitionProgress,
  createSceneTransitionProgress,
  installTransitionProgress
} from "./transition-progress.js";
import { compileEffectiveView, compileTransitionSource } from "./runtime/view-compile.js";
import type {
  AnyRecord,
  ChartOptions,
  ChartRuntime,
  PageOptions,
  PageRuntime,
  RuntimeOptions,
  StoryRuntime
} from "./types.js";
const BUILT_IN_CHART_IDIOMS = createChartIdiomRegistry();

export function registerChartIdiom(idiom) {
  BUILT_IN_CHART_IDIOMS.register(idiom);
}

export function registerChartModule(module) {
  registerChartModules(BUILT_IN_CHART_IDIOMS, [module], CHART_RUNTIME_DEPS);
}

export function availableChartIdioms() {
  return BUILT_IN_CHART_IDIOMS.types();
}

export async function createStory(spec: AnyRecord, options: RuntimeOptions): Promise<StoryRuntime> {
  const runtime = resolveRuntimeDependencies(options);
  const { d3 } = runtime;
  installTransitionProgress(d3);
  const target = resolveTarget(options.target || "#app");
  const compiled = compileSpec(spec);

  const disposeTheme = await applyTheme(compiled.theme);
  target.innerHTML = "";

  const data = await loadData(compiled.data, d3);
  const shell = renderShell(target, compiled, {
    debug: options.debug === true,
    idioms: BUILT_IN_CHART_IDIOMS
  });
  const renderer = createRenderer(shell, compiled, data, runtime);

  renderer.action({ type: "enter", step: 0, force: true });
  const scrollDriver = setupScroll(compiled, shell, renderer);
  setupNav(shell, renderer, scrollDriver);
  const disposeResize = setupResize(renderer, scrollDriver);
  restoreHashPosition(shell, renderer, scrollDriver);

  return {
    spec: compiled,
    data,
    signature: storySignature(compiled),
    action: renderer.action,
    scrollDriver,
    destroy() {
      disposeResize();
      scrollDriver?.destroy?.();
      renderer.destroy();
      disposeTheme();
    }
  };
}

export async function createPage(spec: AnyRecord, options: PageOptions = {}): Promise<PageRuntime> {
  const target = resolveTarget(options.target || "#app");
  const compiled = compileSpec(spec);
  const disposeTheme = await applyTheme(compiled.theme);
  target.innerHTML = "";
  const shell = renderShell(target, compiled, {
    debug: options.debug === true,
    idioms: BUILT_IN_CHART_IDIOMS
  });

  return {
    spec: compiled,
    shell,
    root: shell.root,
    story: shell.story,
    steps: shell.steps,
    views: shell.views as Record<string, Element>,
    tooltip: shell.tooltip,
    destroy() {
      disposeTheme();
    }
  };
}

export async function createChart(spec: AnyRecord, options: ChartOptions): Promise<ChartRuntime> {
  const runtime = resolveRuntimeDependencies(options);
  const { d3 } = runtime;
  installTransitionProgress(d3);
  const target = resolveTarget(options.target || "#app");
  const compiled = compileSpec(spec);
  const viewId = options.view || options.viewId || "main";

  const disposeTheme = await applyTheme(compiled.theme);
  target.innerHTML = "";
  const data = await loadData(compiled.data, d3);
  const shell = renderChartShell(target, compiled, viewId);
  const renderer = createRenderer(shell, compiled, data, runtime);
  const initialStep = clamp(options.initialStep ?? 0, 0, compiled.steps.length - 1);

  renderer.action({
    type: "enter",
    step: initialStep,
    action: "stepper",
    force: true
  });

  return {
    spec: compiled,
    data,
    view: shell.views[viewId],
    tooltip: shell.tooltip,
    action: renderer.action,
    resize: renderer.resize,
    destroy() {
      renderer.destroy();
      disposeTheme();
    }
  };
}

function createRenderer(shell: AnyRecord, spec: AnyRecord, datasets: AnyRecord, runtime: AnyRecord) {
  const { d3, aq } = runtime;
  let activeIndex = -1;
  let activeAction = null;
  let resizeFrame = null;
  let progressFrame = null;
  let pendingProgress = null;

  const action = (event, options = {}) => {
    const command = normalizeActionEvent(event, options, {
      activeIndex,
      stepCount: spec.steps.length
    });

    if (command.progress) {
      applyDiscreteStep(command.index, {
        action: command.action,
        direction: command.direction,
        force: command.force === true,
        scrollProgress: command.value
      });
      applyProgressStep(command.index, command.value, command.direction, {
        force: true
      });
      return;
    }

    applyDiscreteStep(command.index, {
      action: command.action,
      direction: command.direction,
      force: command.force !== false
    });
  };

  const applyDiscreteStep = (index: number, options: AnyRecord = {}) => {
    const bounded = clamp(index, 0, spec.steps.length - 1);
    const step = spec.steps[bounded];
    const stepAction = normalizeActionTokens(options.action || step.action);
    const actionSignature = stepAction.join(" ");
    if (bounded === activeIndex && actionSignature === activeAction && !options.force) return;
    activeIndex = bounded;
    activeAction = actionSignature;

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

    const firstViewSpec = (Object.values(step.views)[0] || {}) as AnyRecord;
    if (shell.figureTitle) {
      shell.figureTitle.textContent = spec.views.main?.title || step.title || "";
    }
    const markLabel = firstViewSpec.mark ? `mark: ${firstViewSpec.mark}` : "";
    if (shell.markName) {
      shell.markName.dataset.chartLabel = markLabel;
      shell.markName.textContent = markLabel;
    }

    Object.entries(shell.views).forEach(([viewId, node]: [string, any]) => {
      const viewConfig = spec.views[viewId] || {};
      const viewSpec = step.views[viewId] || step.views.main || {};
      node.__scrollyLiteMarkName = shell.markName;
      const previousStep = bounded > 0 ? spec.steps[bounded - 1] : null;
      const previousViewSpec = previousStep
        ? previousStep.views[viewId] || previousStep.views.main || null
        : null;
      drawView(node, viewSpec, viewConfig, datasets, shell.tooltip, d3, aq, step.transition, stepAction, {
        previousViewSpec,
        previousTransition: previousStep?.transition || {}
      });
    });

    if (hasScrollAction(stepAction)) {
      applyStepScrollProgress(shell, spec, bounded, options.scrollProgress ?? defaultScrollProgress(options.direction), d3, {
        force: true
      });
    }
  };

  const applyProgressStep = (index: number, progress: number, direction = "down", options: AnyRecord = {}) => {
    const bounded = clamp(index, 0, spec.steps.length - 1);
    const step = spec.steps[bounded];
    if (!options.force && !hasScrollAction(step)) return;

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
      applyStepScrollProgress(shell, spec, next.index, next.progress, d3, {
        force: options.force === true
      });
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
      if (activeIndex >= 0) applyDiscreteStep(activeIndex, { force: true });
    });
  };

  return {
    action,
    cancelScrollProgress,
    resize,
    destroy() {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      cancelScrollProgress();
    }
  };
}

function renderChartShell(target: Element, spec: AnyRecord, viewId = "main") {
  target.className = ["sl-chart-root", target.className].filter(Boolean).join(" ");

  const figure = document.createElement("figure");
  figure.className = "sl-figure sl-chart-figure";
  figure.innerHTML = `
    <figcaption class="sl-figure-header">
      <p class="sl-figure-title"></p>
      <span class="sl-mark-name"></span>
    </figcaption>
  `;

  const view = document.createElement("div");
  view.className = "sl-view";
  view.dataset.viewId = viewId;
  figure.append(view);
  target.append(figure);

  const tooltip = document.createElement("div");
  tooltip.className = "sl-tooltip";
  target.append(tooltip);

  return {
    root: target,
    story: null,
    figure,
    figureTitle: figure.querySelector(".sl-figure-title"),
    markName: figure.querySelector(".sl-mark-name"),
    steps: [],
    navButtons: [],
    progressFill: null,
    views: { [viewId]: view },
    tooltip
  };
}

function drawView(node: any, viewSpec: AnyRecord, viewConfig: AnyRecord, datasets: AnyRecord, tooltip: Element, d3: AnyRecord, aq: AnyRecord, stepTransition: AnyRecord = {}, stepAction: string[] = [], options: AnyRecord = {}) {
  const scene = getScene(node, viewConfig, d3);
  scene.progressRoots = [
    node,
    node.__scrollyLiteMarkName
  ].filter(Boolean);

  if (!viewSpec || !viewSpec.mark) {
    clearVirtualScrollSequence(scene);
    scene.empty.style("display", "grid").text("No view for this step.");
    fadeLayers(scene, null, null, d3);
    return;
  }

  scene.empty.style("display", "none");

  if (viewSpec.mark === "text") {
    clearVirtualScrollSequence(scene);
    fadeLayers(scene, "text", null, d3);
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
      idiom,
      node,
      finalSpec: effectiveViewSpec,
      viewConfig,
      datasets,
      tooltip,
      d3,
      aq,
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
  renderCompiledView(node, effectiveViewSpec, viewConfig, datasets, tooltip, d3, aq, stepAction, sceneTransition, {
    transitionSource
  });
}

function renderCompiledView(node: any, effectiveViewSpec: AnyRecord, viewConfig: AnyRecord, datasets: AnyRecord, tooltip: Element, d3: AnyRecord, aq: AnyRecord, stepAction: string[] = [], sceneTransition: AnyRecord = {}, renderOptions: AnyRecord = {}) {
  const scene = getScene(node, viewConfig, d3);
  const scrollDriven = renderOptions.scrollDriven ?? hasScrollAction(stepAction);
  if (scrollDriven && !renderOptions.skipScrollSourcePrep) {
    prepareScrollSourceState(
      node,
      viewConfig,
      datasets,
      tooltip,
      d3,
      aq,
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
  const rows = applyTransforms(source, renderSpec.transform || [], aq);
  const domainRows = applyTransforms(source, domainTransforms(renderSpec.transform || []), aq);
  if (!rows.length) {
    scene.empty.style("display", "grid").text("No rows after transforms.");
    fadeLayers(scene, null, null, d3);
    return;
  }

  const width = Math.max(320, node.clientWidth || 720);
  const height = viewConfig.height || effectiveViewSpec.height || 500;
  resizeScene(scene, width, height);

  const rendererKey = resolveMarkRendererKey(renderSpec);
  const chart: AnyRecord = {
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
    transition: transitionSpec(renderSpec, previousSpec, { scrollDriven, d3 } as AnyRecord),
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
    const transitionPlanDuration = transitionPlanDurationForPhase(context.idiom, source?.effectiveViewSpec, phase.spec);
    const config = {
      node: context.node,
      spec: phase.spec,
      viewConfig: context.viewConfig,
      datasets: context.datasets,
      tooltip: context.tooltip,
      d3: context.d3,
      aq: context.aq,
      stepAction: context.stepAction,
      sceneTransition,
      transitionSource: source,
      transitionPlanDuration
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
    aq: context.aq,
    stepAction: context.stepAction,
    sceneTransition: context.finalSceneTransition,
    transitionSource: source,
    transitionPlanDuration: transitionPlanDurationForPhase(context.idiom, source?.effectiveViewSpec, context.finalSpec)
  });

  return phases;
}

function transitionPlanDurationForPhase(idiom, previousSpec, nextSpec) {
  const plan = idiom?.resolveTransitionPlan?.(
    prepareIdiomSpec(idiom, previousSpec),
    prepareIdiomSpec(idiom, nextSpec)
  );
  const duration = Number(plan?.update?.totalDuration);
  return Number.isFinite(duration) ? duration : null;
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

function prepareScrollSourceState(node: any, viewConfig: AnyRecord, datasets: AnyRecord, tooltip: Element, d3: AnyRecord, aq: AnyRecord, transitionSource: AnyRecord = {}) {
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
    aq,
    ["scroll"],
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


function virtualRenderDelay(phaseOrSpec: AnyRecord = {}) {
  const spec = phaseOrSpec.spec || phaseOrSpec;
  const plannedDuration = Number(phaseOrSpec.transitionPlanDuration);
  if (Number.isFinite(plannedDuration)) return Math.max(1, plannedDuration);
  const transition = effectiveTransitionSpec(spec);
  const duration = Number(transition.duration);
  const fallbackDuration = Number(effectiveTransitionSpec({}).duration) || 900;
  const guideStaging = narrativeState(spec).sceneState?.guide?.staging || narrativeState(spec).guide?.staging || {};
  const stageOrder = Array.isArray(guideStaging.order)
    ? guideStaging.order.filter((axis) => axis === "x" || axis === "y")
    : [];
  const stagedDuration = Number(guideStaging.duration);
  const effectiveDuration =
    stageOrder.length > 1 && Number.isFinite(stagedDuration)
      ? stagedDuration * stageOrder.length
      : duration;
  const stagger = transition.stagger;
  const staggerMax =
    typeof stagger === "object"
      ? Number(stagger.max ?? 0)
      : 0;
  return Math.max(1, Number.isFinite(effectiveDuration) ? effectiveDuration : fallbackDuration) + (Number.isFinite(staggerMax) ? staggerMax : 0);
}

function clearVirtualScrollSequence(scene) {
  scene.virtualScrollSequence = null;
}

function createVirtualScrollSequence(phases = []) {
  const durations = phases.map((phase) => virtualRenderDelay(phase));
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
    config.aq,
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
  }, virtualRenderDelay(config));
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
    config.aq,
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



function applyStepScrollProgress(shell: AnyRecord, spec: AnyRecord, index: number, progress: number, d3: AnyRecord, options: AnyRecord = {}) {
  const step = spec.steps[index];
  if (!step || (!options.force && !hasScrollAction(step))) return;

  Object.entries(shell.views).forEach(([viewId, node]) => {
    const viewSpec = step.views[viewId] || step.views.main || {};
    applyScrollAction(node, viewSpec, progress, d3);
  });
}

function applyScrollAction(node, viewSpec, progress, d3) {
  const scene = node.__scrollyLiteScene;
  if (!scene || !viewSpec?.mark) return;

  const action = normalizeScrollAction(narrativeScroll(viewSpec)) as AnyRecord;
  const eased = easeProgress(progress, action.ease, d3);
  if (applyVirtualScrollSequence(scene, eased)) return;
  scene.transitionProgress?.progress(eased);
}






async function applyTheme(theme: AnyRecord = {}) {
  const root = document.documentElement;
  const previous = new Map();
  const insertedLinks = await installThemeStylesheets(theme);
  const variables = themeVariables(theme);

  Object.entries(variables).forEach(([name, value]) => {
    previous.set(name, root.style.getPropertyValue(name));
    root.style.setProperty(name, value);
  });

  return () => {
    insertedLinks.forEach((link) => link.remove());
    previous.forEach((value, name) => {
      if (value) {
        root.style.setProperty(name, value);
      } else {
        root.style.removeProperty(name);
      }
    });
  };
}

async function installThemeStylesheets(theme: AnyRecord = {}) {
  const hrefs = themeStylesheetHrefs(theme);
  const inserted = [];
  await Promise.all(hrefs.map((href) => new Promise((resolve, reject) => {
    const absoluteHref = new URL(href, document.baseURI).href;
    const existing = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]'))
      .find((link) => link.href === absoluteHref);
    if (existing) {
      resolve(existing);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.scrollyliteTheme = "true";
    link.addEventListener("load", () => resolve(link), { once: true });
    link.addEventListener("error", () => reject(new Error(`ScrollyLite theme stylesheet failed to load: ${href}`)), { once: true });
    document.head.append(link);
    inserted.push(link);
  })));
  return inserted;
}

function themeStylesheetHrefs(theme: AnyRecord = {}) {
  const candidates = [
    theme.href,
    theme.url,
    theme.css,
    theme.stylesheet,
    ...(Array.isArray(theme.stylesheets) ? theme.stylesheets : [])
  ];
  return Array.from(new Set(candidates.filter((href) => typeof href === "string" && href.trim())));
}

function themeVariables(theme: AnyRecord = {}) {
  return {
    ...themeVariableAliases(theme),
    ...themeSeriesVariables(theme),
    ...themeSemanticVariables(theme),
    ...normalizeThemeVariables(theme.variables || theme.customProperties || {})
  };
}

function themeVariableAliases(theme: AnyRecord = {}) {
  const aliases = {
    background: "--sl-bg",
    foreground: "--sl-fg",
    surface: "--sl-surface",
    muted: "--sl-muted",
    border: "--sl-border",
    accent: "--sl-accent",
    accent2: "--sl-accent-2",
    grid: "--sl-grid",
    axis: "--sl-axis",
    shadow: "--sl-shadow",
    fontFamily: "--sl-font-family"
  };
  return Object.fromEntries(
    Object.entries(aliases)
      .filter(([key]) => theme[key] != null)
      .map(([key, variable]) => [variable, theme[key]])
  );
}

function themeSeriesVariables(theme: AnyRecord = {}) {
  const series = theme.series || theme.palette || theme.colorScheme;
  if (!Array.isArray(series)) return {};
  return Object.fromEntries(
    series
      .filter((value) => value != null)
      .map((value, index) => [`--sl-series-${index + 1}`, value])
  );
}

function themeSemanticVariables(theme: AnyRecord = {}) {
  const semantic = theme.semantic || {};
  return Object.fromEntries(
    Object.entries({
      hot: "--sl-semantic-hot",
      cold: "--sl-semantic-cold"
    })
      .filter(([key]) => semantic[key] != null)
      .map(([key, variable]) => [variable, semantic[key]])
  );
}

function normalizeThemeVariables(variables: AnyRecord = {}) {
  return Object.fromEntries(
    Object.entries(variables)
      .filter(([, value]) => value != null)
      .map(([name, value]) => [
        name.startsWith("--") ? name : `--sl-${dash(name)}`,
        value
      ])
  );
}

function dash(value) {
  return String(value).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function resolveTarget(target) {
  if (typeof target !== "string") return target;
  const node = document.querySelector(target);
  if (!node) throw new Error(`ScrollyLite target not found: ${target}`);
  return node;
}

function resolveRuntimeDependencies(options: AnyRecord = {}) {
  if (!options.d3) {
    throw new Error("ScrollyLite requires D3. Pass { d3 } to createStory().");
  }
  if (!options.aq) {
    throw new Error("ScrollyLite data transforms require Arquero. Pass { aq } to createStory().");
  }
  return {
    d3: options.d3,
    aq: options.aq
  };
}




const CHART_RUNTIME_DEPS = {
  bandOrLinear,
  bindTooltip,
  channelDomain,
  colorScale,
  curveFor,
  drawGrid,
  drawLegend,
  drawPath,
  drawXAxis,
  drawYAxis,
  easeFor,
  escapeHtml,
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
  updateGrid
};

registerChartModules(BUILT_IN_CHART_IDIOMS, chartModules, CHART_RUNTIME_DEPS);
