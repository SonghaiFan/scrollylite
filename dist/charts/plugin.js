export function defineChartIdiom(config = {}) {
  const key = config.key;
  if (!key) throw new Error("Chart idiom plugin requires a key.");

  const createSpecCompiler = config.createSpecCompiler || null;
  const scenes = uniqueStrings(config.scenes || DEFAULT_SCENES);
  const stateOperations = {
    ...DEFAULT_STATE_OPERATIONS,
    ...(config.stateOperations || {})
  };

  function createChartIdiom(deps = {}) {
    const idiom = config.createIdiom
      ? config.createIdiom(deps)
      : createRuntimeIdiom(config, deps);

    return normalizeChartIdiom({
      ...idiom,
      key: idiom.key || key,
      scenes: idiom.scenes || scenes,
      stateOperations: {
        ...stateOperations,
        ...(idiom.stateOperations || {})
      }
    }, createSpecCompiler);
  }

  return {
    key,
    scenes,
    stateOperations,
    createChartIdiom,
    ...(createSpecCompiler ? { createSpecCompiler } : {})
  };
}

export const DEFAULT_SCENES = ["focus", "guide", "granularity", "observation"];

export const DEFAULT_STATE_OPERATIONS = {
  focus: "filter",
  guide: "coordinate",
  granularity: "aggregate"
};

export function identityPrepare(spec) {
  return spec;
}

export function emptyTransitionPlan() {
  return {};
}

export function defaultMargin() {
  return {};
}

function createRuntimeIdiom(config, deps) {
  const renderer = config.createRenderer
    ? config.createRenderer(deps)
    : config.renderer;
  const prepareSpec = config.prepareSpec || identityPrepare;
  const transition = config.transition || {};
  const defaults = config.defaults || {};

  return {
    key: config.key,
    renderer,
    prepareSpec,
    resolveTransitionPlan: transition.plan || emptyTransitionPlan,
    intermediateSpecs: transition.intermediateSpecs,
    intermediateSpec: transition.intermediateSpec,
    defaultMargin: defaults.margin || defaultMargin,
    inspect: config.inspect || {},
    scenes: config.scenes,
    stateOperations: config.stateOperations
  };
}

export function normalizeChartIdiom(idiom, createSpecCompiler = null) {
  const prepareSpec = idiom.prepareSpec || identityPrepare;
  const resolveTransitionPlan =
    idiom.resolveTransitionPlan ||
    emptyTransitionPlan;
  const intermediateSpecs = idiom.intermediateSpecs;
  const intermediateSpec = idiom.intermediateSpec || null;
  const renderer = idiom.renderer;
  const margin = idiom.defaultMargin || defaultMargin;
  const scenes = uniqueStrings(idiom.scenes || DEFAULT_SCENES);
  const stateOperations = {
    ...DEFAULT_STATE_OPERATIONS,
    ...(idiom.stateOperations || {})
  };

  return {
    inspect: {},
    ...idiom,
    scenes,
    stateOperations,
    renderer,
    prepareSpec,
    resolveTransitionPlan,
    intermediateSpecs,
    intermediateSpec,
    defaultMargin: margin,
    ...(createSpecCompiler ? { createSpecCompiler } : {})
  };
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}
