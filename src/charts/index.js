import { narrativeUnit } from "../scrolly-meta.js?v=semantic-key-11";
import { normalizeChartIdiom as normalizeRuntimeChartIdiom } from "./plugin.js?v=semantic-key-1";

const MARK_RENDERER_ALIASES = new Map();

export function createMarkRendererRegistry() {
  const renderers = new Map();

  return {
    register(markOrRenderer, renderer) {
      const key = normalizeMarkRendererKey(markOrRenderer);
      if (!key) throw new Error("Mark renderer key is required.");
      if (typeof renderer !== "function") {
        throw new Error(`Renderer for mark "${key}" must be a function.`);
      }
      renderers.set(key, renderer);
      return this;
    },

    get(markOrRenderer) {
      return renderers.get(normalizeMarkRendererKey(markOrRenderer));
    },

    has(markOrRenderer) {
      return renderers.has(normalizeMarkRendererKey(markOrRenderer));
    },

    types() {
      return Array.from(renderers.keys()).sort();
    }
  };
}

export function createChartIdiomRegistry() {
  const idioms = new Map();

  return {
    register(keyOrIdiom, idiom = null) {
      const normalized = normalizeChartIdiom(keyOrIdiom, idiom);
      idioms.set(normalized.key, normalized);
      return this;
    },

    get(markOrSpec) {
      const key = typeof markOrSpec === "object"
        ? resolveMarkRendererKey(markOrSpec)
        : normalizeMarkRendererKey(markOrSpec);
      return idioms.get(key);
    },

    has(markOrSpec) {
      return Boolean(this.get(markOrSpec));
    },

    types() {
      return Array.from(idioms.keys()).sort();
    }
  };
}

export function createChartRegistry() {
  return createChartIdiomRegistry();
}

export function registerChartModules(registry, modules = [], deps = {}) {
  modules.forEach((module) => {
    const idiom = chartIdiomFromModule(module, deps);
    registry.register(idiom);
  });
  return registry;
}

export function createSpecCompilerMap(modules = [], context = {}) {
  modules.forEach(registerModuleAliases);
  return Object.fromEntries(
    modules
      .map((module) => {
        const key = normalizeMarkRendererKey(moduleKey(module));
        const compiler = specCompilerFromModule(module, context);
        return key && compiler ? [key, compiler] : null;
      })
      .filter(Boolean)
  );
}

export function normalizeMarkRendererKey(markOrRenderer) {
  const token = normalizeMarkToken(markOrRenderer);
  return MARK_RENDERER_ALIASES.get(token) || token;
}

export function registerMarkRendererAlias(alias, key) {
  const aliasToken = normalizeMarkToken(alias);
  const keyToken = normalizeMarkToken(key);
  if (!aliasToken || !keyToken || aliasToken === keyToken) return;
  MARK_RENDERER_ALIASES.set(aliasToken, keyToken);
}

export function normalizeChartType(type) {
  return normalizeMarkRendererKey(type);
}

export function resolveMarkRendererKey(viewSpec = {}) {
  if (narrativeUnit(viewSpec)) return "unit";
  return normalizeMarkRendererKey(viewSpec?.mark);
}

export function resolveChartType(viewSpec = {}) {
  return resolveMarkRendererKey(viewSpec);
}

function normalizeChartIdiom(keyOrIdiom, maybeIdiom = null) {
  const idiom = maybeIdiom || keyOrIdiom;
  const key = normalizeMarkRendererKey(
    maybeIdiom ? keyOrIdiom : idiom.key || idiom.mark || idiom.type
  );
  if (!key) throw new Error("Chart idiom key is required.");
  if (!idiom || typeof idiom !== "object") {
    throw new Error(`Chart idiom "${key}" must be an object.`);
  }
  const normalized = normalizeRuntimeChartIdiom({
    ...idiom,
    key
  });
  const renderer = normalized.renderer;
  if (typeof renderer !== "function") {
    throw new Error(`Chart idiom "${key}" must provide a renderer function.`);
  }
  const aliases = uniqueStrings(normalized.aliases || []);
  aliases.forEach((alias) => registerMarkRendererAlias(alias, key));

  return {
    ...normalized,
    aliases,
    key
  };
}

function chartIdiomFromModule(module, deps) {
  const plugin = pluginFromModule(module);
  if (typeof plugin?.createChartIdiom === "function") return plugin.createChartIdiom(deps);
  if (typeof module?.createChartIdiom === "function") return module.createChartIdiom(deps);
  if (typeof module?.default === "function") return module.default(deps);
  if (module?.chartIdiom) return module.chartIdiom;
  if (module?.default && typeof module.default === "object") return module.default;
  throw new Error("Chart module must export createChartIdiom(deps) or chartIdiom.");
}

function specCompilerFromModule(module, context) {
  const plugin = pluginFromModule(module);
  if (typeof plugin?.createSpecCompiler === "function") return plugin.createSpecCompiler(context);
  if (typeof module?.createSpecCompiler === "function") return module.createSpecCompiler(context);
  return null;
}

function registerModuleAliases(module) {
  const key = moduleKey(module);
  moduleAliases(module).forEach((alias) => registerMarkRendererAlias(alias, key));
}

function moduleKey(module) {
  const plugin = pluginFromModule(module);
  return plugin?.key || module?.key || module?.chartPlugin?.key;
}

function moduleAliases(module) {
  const plugin = pluginFromModule(module);
  return uniqueStrings([
    ...(plugin?.aliases || []),
    ...(module?.aliases || []),
    ...(module?.chartPlugin?.aliases || [])
  ]);
}

function pluginFromModule(module) {
  return module?.plugin || module?.chartPlugin || null;
}

function normalizeMarkToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\s+/g, "").toLowerCase();
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}
