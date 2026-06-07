import { createLineRenderer } from "./render.js?v=semantic-key-11";

export function createChartIdiom(deps = {}) {
  return {
    key: "line",
    renderer: createLineRenderer(deps)
  };
}
