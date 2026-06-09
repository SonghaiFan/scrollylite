import type {
  ChartDeps,
  ChartIdiom,
  ChartPlugin,
  CompilerContext,
  IntermediateSpec,
  MarginSpec,
  Renderer,
  SpecCompiler,
  StateOperations,
  TransitionPlan,
  ViewSpec
} from '../types/index.js';

export const DEFAULT_SCENES = ['focus', 'guide', 'granularity', 'observation'] as const;

export const DEFAULT_STATE_OPERATIONS: StateOperations = {
  focus: 'filter',
  guide: 'coordinate',
  granularity: 'aggregate'
};

export interface ChartIdiomConfig<S extends ViewSpec = ViewSpec> {
  key: string;
  scenes?: string[];
  stateOperations?: StateOperations;
  renderer?: Renderer<S>;
  createRenderer?: (deps: ChartDeps) => Renderer<S>;
  createIdiom?: (deps: ChartDeps) => ChartIdiom<S>;
  prepareSpec?: (spec: S) => S;
  defaults?: { margin?: (spec: S) => Partial<MarginSpec> };
  inspect?: Record<string, unknown>;
  transition?: {
    plan?: (prev: S | null, next: S | null) => TransitionPlan;
    intermediateSpecs?: (prev: S, next: S) => IntermediateSpec<S>[];
    intermediateSpec?: (prev: S, next: S) => IntermediateSpec<S> | null;
  };
  createSpecCompiler?: (context: CompilerContext) => SpecCompiler;
}

export function defineChartIdiom<S extends ViewSpec = ViewSpec>(
  config: ChartIdiomConfig<S>
): ChartPlugin<S> {
  if (!config.key) throw new Error('Chart idiom plugin requires a key.');

  const { createSpecCompiler } = config;
  const scenes = uniqueStrings(config.scenes ?? [...DEFAULT_SCENES]);
  const stateOperations: StateOperations = { ...DEFAULT_STATE_OPERATIONS, ...(config.stateOperations ?? {}) };

  function createChartIdiom(deps: ChartDeps): ChartIdiom<S> {
    const idiom = config.createIdiom
      ? config.createIdiom(deps)
      : createRuntimeIdiom(config, deps);

    return normalizeChartIdiom<S>(
      {
        ...idiom,
        key: idiom.key || config.key,
        scenes: idiom.scenes ?? scenes,
        stateOperations: { ...stateOperations, ...(idiom.stateOperations ?? {}) }
      },
      createSpecCompiler
    );
  }

  return {
    key: config.key,
    scenes,
    stateOperations,
    createChartIdiom,
    ...(createSpecCompiler ? { createSpecCompiler } : {})
  };
}

export function identityPrepare<S extends ViewSpec>(spec: S): S {
  return spec;
}

export function emptyTransitionPlan(): TransitionPlan {
  return {};
}

export function defaultMargin(): Partial<MarginSpec> {
  return {};
}

export function normalizeChartIdiom<S extends ViewSpec = ViewSpec>(
  idiom: Partial<ChartIdiom<S>> & { key: string },
  createSpecCompiler?: ((context: CompilerContext) => SpecCompiler) | null
): ChartIdiom<S> {
  const prepareSpec = idiom.prepareSpec ?? identityPrepare;
  const resolveTransitionPlan = idiom.resolveTransitionPlan ?? emptyTransitionPlan;
  const renderer = idiom.renderer;
  if (!renderer) throw new Error(`Chart idiom "${idiom.key}" must provide a renderer function.`);

  const scenes = uniqueStrings([...(idiom.scenes ?? DEFAULT_SCENES)]);
  const stateOperations: StateOperations = { ...DEFAULT_STATE_OPERATIONS, ...(idiom.stateOperations ?? {}) };

  return {
    inspect: {},
    ...idiom,
    scenes,
    stateOperations,
    renderer,
    prepareSpec,
    resolveTransitionPlan,
    intermediateSpecs: idiom.intermediateSpecs,
    intermediateSpec: idiom.intermediateSpec ?? null,
    defaultMargin: idiom.defaultMargin ?? defaultMargin,
    ...(createSpecCompiler ? { createSpecCompiler } : {})
  } as ChartIdiom<S>;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function createRuntimeIdiom<S extends ViewSpec>(
  config: ChartIdiomConfig<S>,
  deps: ChartDeps
): Partial<ChartIdiom<S>> & { key: string } {
  const renderer = config.createRenderer
    ? config.createRenderer(deps)
    : config.renderer;

  return {
    key: config.key,
    renderer,
    prepareSpec: config.prepareSpec ?? identityPrepare,
    resolveTransitionPlan: config.transition?.plan ?? emptyTransitionPlan,
    intermediateSpecs: config.transition?.intermediateSpecs,
    intermediateSpec: config.transition?.intermediateSpec,
    defaultMargin: config.defaults?.margin ?? defaultMargin,
    inspect: config.inspect ?? {},
    scenes: config.scenes,
    stateOperations: config.stateOperations
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean).map(String))];
}
