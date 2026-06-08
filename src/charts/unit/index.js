import { createUnitRenderer } from "./render.js?v=semantic-key-12";

export function createChartIdiom(deps = {}) {
  return {
    key: "unit",
    renderer: createUnitRenderer(deps),
    prepareSpec: (spec) => spec,
    resolveTransitionPlan: () => ({}),
    inspect: {}
  };
}

export { createUnitRenderer };
export { unit, UnitState } from "./authoring.js?v=semantic-key-1";
