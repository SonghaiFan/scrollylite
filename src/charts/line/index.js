import { createLineRenderer } from "./render.js?v=semantic-key-11";

export function createChartIdiom(deps = {}) {
  return {
    key: "line",
    renderer: createLineRenderer(deps),
    prepareSpec: (spec) => spec,
    resolveTransitionPlan: () => ({}),
    inspect: {}
  };
}

export { createLineRenderer };
export { line, LineState } from "./authoring.js?v=semantic-key-1";
