import { narrativeUnit } from '../scrolly-meta.js';
import { normalizeChartIdiom } from './plugin.js';
import type {
  ChartDeps,
  ChartIdiom,
  ChartPlugin,
  CompilerContext,
  SpecCompiler,
  StateOperations,
  ViewSpec
} from '../types/index.js';

// ─── Registry ─────────────────────────────────────────────────────────────────

export interface ChartIdiomRegistry {
  register<S extends ViewSpec>(idiom: ChartIdiom<S>): this;
  get<S extends ViewSpec = ViewSpec>(markOrSpec: string | ViewSpec): ChartIdiom<S> | undefined;
  has(markOrSpec: string | ViewSpec): boolean;
  types(): string[];
}

export function createChartIdiomRegistry(): ChartIdiomRegistry {
  const idioms = new Map<string, ChartIdiom<ViewSpec>>();

  return {
    register(idiom) {
      const normalized = normalizeRegisteredIdiom(idiom as unknown as ChartIdiom<ViewSpec>);
      idioms.set(normalized.key, normalized);
      return this;
    },

    get(markOrSpec) {
      const key =
        typeof markOrSpec === 'object'
          ? resolveMarkRendererKey(markOrSpec)
          : normalizeMarkRendererKey(markOrSpec);
      return idioms.get(key) as ChartIdiom<any> | undefined;
    },

    has(markOrSpec) {
      return Boolean(this.get(markOrSpec));
    },

    types() {
      return [...idioms.keys()].sort();
    }
  };
}

export interface SpecCompilerEntry {
  compiler: SpecCompiler;
  scenes: string[];
  stateOperations: StateOperations;
}

export function registerChartModules(
  registry: ChartIdiomRegistry,
  modules: Array<{ plugin: ChartPlugin }>,
  deps: ChartDeps = {}
): ChartIdiomRegistry {
  for (const module of modules) {
    const idiom = chartIdiomFromModule(module, deps);
    registry.register(idiom);
  }
  return registry;
}

export function createSpecCompilerRegistry(
  modules: Array<{ plugin: ChartPlugin }>,
  context: CompilerContext = {}
): Record<string, SpecCompilerEntry> {
  const entries = modules
    .map((module) => {
      const plugin = pluginFromModule(module);
      const key = normalizeMarkRendererKey(plugin.key);
      const compiler = plugin.createSpecCompiler ? plugin.createSpecCompiler(context) : null;
      if (!key || !compiler) return null;
      return [
        key,
        {
          compiler,
          scenes: [...plugin.scenes],
          stateOperations: { ...plugin.stateOperations }
        }
      ] as [string, SpecCompilerEntry];
    })
    .filter((entry): entry is [string, SpecCompilerEntry] => entry !== null);

  return Object.fromEntries(entries);
}

// ─── Mark key resolution ──────────────────────────────────────────────────────

export function normalizeMarkRendererKey(markOrRenderer: unknown): string {
  return normalizeMarkToken(String(markOrRenderer ?? ''));
}

export function normalizeChartType(type: unknown): string {
  return normalizeMarkRendererKey(type);
}

export function resolveMarkRendererKey(viewSpec: ViewSpec): string {
  if (narrativeUnit(viewSpec)) return 'unit';
  return normalizeMarkRendererKey(viewSpec.mark);
}

export function resolveChartType(viewSpec: ViewSpec): string {
  return resolveMarkRendererKey(viewSpec);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function normalizeRegisteredIdiom(idiom: ChartIdiom<ViewSpec>): ChartIdiom<ViewSpec> {
  const key = normalizeMarkRendererKey(idiom.key);
  if (!key) throw new Error('Chart idiom key is required.');
  const normalized = normalizeChartIdiom({ ...idiom, key });
  if (typeof normalized.renderer !== 'function') {
    throw new Error(`Chart idiom "${key}" must provide a renderer function.`);
  }
  return { ...normalized, key };
}

function chartIdiomFromModule(
  module: { plugin: ChartPlugin },
  deps: ChartDeps
): ChartIdiom<ViewSpec> {
  const plugin = pluginFromModule(module);
  if (typeof plugin.createChartIdiom === 'function') {
    return plugin.createChartIdiom(deps) as ChartIdiom<ViewSpec>;
  }
  throw new Error('Chart module must export plugin.createChartIdiom(deps).');
}

function pluginFromModule(module: { plugin?: ChartPlugin }): ChartPlugin {
  if (!module.plugin) throw new Error('Chart module must export plugin.');
  return module.plugin;
}

function normalizeMarkToken(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}
