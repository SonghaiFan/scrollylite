import { createPointRenderer, createScatterRenderer } from "./render.js?v=semantic-key-12";

export function createChartIdiom(deps = {}) {
  return {
    key: "point",
    renderer: createPointRenderer(deps)
  };
}

export { createPointRenderer, createScatterRenderer };
