import { narrativeUnit } from "../scrolly-meta.js";
import { normalizeChartIdiom as normalizeRuntimeChartIdiom } from "./plugin.js";

export function createChartIdiomRegistry() {
  const idioms = new Map();

  return {
    register(idiom) {
      const normalized = normalizeChartIdiom(idiom);
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

export function registerChartModules(registry, modules = [], deps = {}) {
  modules.forEach((module) => {
    const idiom = chartIdiomFromModule(module, deps);
    registry.register(idiom);
  });
  return registry;
}

export function createSpecCompilerRegistry(modules = [], context = {}) {
  return Object.fromEntries(
    modules
      .map((module) => {
        const plugin = pluginFromModule(module);
        const key = normalizeMarkRendererKey(moduleKey(module));
        const compiler = specCompilerFromModule(module, context);
        return key && compiler
          ? [
              key,
              {
                compiler,
                scenes: uniqueStrings(plugin.scenes),
                stateOperations: { ...(plugin.stateOperations || {}) }
              }
            ]
          : null;
      })
      .filter(Boolean)
  );
}

export function normalizeMarkRendererKey(markOrRenderer) {
  return normalizeMarkToken(markOrRenderer);
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

function normalizeChartIdiom(idiom) {
  const key = normalizeMarkRendererKey(idiom?.key);
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
  return {
    ...normalized,
    key
  };
}

function chartIdiomFromModule(module, deps) {
  const plugin = pluginFromModule(module);
  if (typeof plugin.createChartIdiom === "function") return plugin.createChartIdiom(deps);
  throw new Error("Chart module must export plugin.createChartIdiom(deps).");
}

function specCompilerFromModule(module, context) {
  const plugin = pluginFromModule(module);
  if (typeof plugin.createSpecCompiler === "function") return plugin.createSpecCompiler(context);
  return null;
}

function moduleKey(module) {
  const plugin = pluginFromModule(module);
  return plugin.key;
}

function pluginFromModule(module) {
  if (!module?.plugin) {
    throw new Error("Chart module must export plugin.");
  }
  return module.plugin;
}

function normalizeMarkToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\s+/g, "").toLowerCase();
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}
