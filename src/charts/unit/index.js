import { createUnitRenderer } from "./render.js?v=semantic-key-12";

export function createChartIdiom(deps = {}) {
  return {
    key: "unit",
    renderer: createUnitRenderer(deps)
  };
}

export { createUnitRenderer };
