const CHART_ALIASES = new Map([
  ["point", "scatter"],
  ["points", "scatter"],
  ["dot", "scatter"],
  ["dots", "scatter"],
  ["lineChart", "line"],
  ["barChart", "bar"],
  ["unitChart", "unit"],
  ["unitplot", "unit"],
  ["unitPlot", "unit"],
  ["units", "unit"]
]);

export function createChartRegistry() {
  const renderers = new Map();

  return {
    register(type, renderer) {
      const key = normalizeChartType(type);
      if (!key) throw new Error("Chart type is required.");
      if (typeof renderer !== "function") {
        throw new Error(`Renderer for chart "${key}" must be a function.`);
      }
      renderers.set(key, renderer);
      return this;
    },

    get(type) {
      return renderers.get(normalizeChartType(type));
    },

    has(type) {
      return renderers.has(normalizeChartType(type));
    },

    types() {
      return Array.from(renderers.keys()).sort();
    }
  };
}

export function normalizeChartType(type) {
  const raw = String(type || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "");
  const canonical = compact.charAt(0).toLowerCase() + compact.slice(1);
  return CHART_ALIASES.get(canonical) || canonical.toLowerCase();
}
