import { narrativeUnit } from "../scrolly-meta.js?v=semantic-key-10";

const MARK_RENDERER_ALIASES = new Map([
  ["circle", "point"],
  ["points", "point"],
  ["square", "point"],
  ["dot", "point"],
  ["dots", "point"],
  ["scatter", "point"],
  ["scatterplot", "point"],
  ["scatterPlot", "point"],
  ["lineChart", "line"],
  ["barChart", "bar"],
  ["unitChart", "unit"],
  ["unitplot", "unit"],
  ["unitPlot", "unit"],
  ["units", "unit"]
]);

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

export function createChartRegistry() {
  return createMarkRendererRegistry();
}

export function normalizeMarkRendererKey(markOrRenderer) {
  const raw = String(markOrRenderer || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "");
  const canonical = compact.charAt(0).toLowerCase() + compact.slice(1);
  return MARK_RENDERER_ALIASES.get(canonical) || canonical.toLowerCase();
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
