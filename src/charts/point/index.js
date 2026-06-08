import { createPointRenderer, createScatterRenderer } from "./render.js?v=semantic-key-12";

export function createChartIdiom(deps = {}) {
  return {
    key: "point",
    renderer: createPointRenderer(deps),
    prepareSpec: (spec) => spec,
    resolveTransitionPlan: () => ({}),
    inspect: {}
  };
}

export { createPointRenderer, createScatterRenderer };
export { point, scatter, PointState } from "./authoring.js?v=semantic-key-1";
