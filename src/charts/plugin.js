export function defineChartIdiom(config = {}) {
  const key = config.key;
  if (!key) throw new Error("Chart idiom plugin requires a key.");

  const aliases = uniqueStrings(config.aliases);
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
      aliases: uniqueStrings([...aliases, ...(idiom.aliases || [])]),
      scenes: idiom.scenes || scenes,
      stateOperations: {
        ...stateOperations,
        ...(idiom.stateOperations || {})
      }
    }, createSpecCompiler);
  }

  return {
    key,
    aliases,
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
  const hooks = idiom.hooks || {};
  const prepareSpec = idiom.prepareSpec || hooks.spec?.prepare || identityPrepare;
  const resolveTransitionPlan =
    idiom.resolveTransitionPlan ||
    hooks.transition?.plan ||
    emptyTransitionPlan;
  const intermediateSpecs = idiom.intermediateSpecs || hooks.transition?.intermediateSpecs;
  const intermediateSpec = idiom.intermediateSpec || hooks.transition?.intermediateSpec || null;
  const renderer = idiom.renderer || hooks.render?.renderer;
  const margin = idiom.defaultMargin || hooks.render?.defaultMargin || defaultMargin;
  const scenes = uniqueStrings(idiom.scenes || hooks.scenes || DEFAULT_SCENES);
  const stateOperations = {
    ...DEFAULT_STATE_OPERATIONS,
    ...(idiom.stateOperations || hooks.stateOperations || {})
  };

  return {
    inspect: {},
    ...idiom,
    aliases: uniqueStrings(idiom.aliases),
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
