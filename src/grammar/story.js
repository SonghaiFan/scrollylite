import { cloneState } from "./view-state.js";
import { inferTransition } from "./infer-transition.js";

export function authoredSteps(definitions = [], { action = ["step", "tooltip"] } = {}) {
  let previousView = null;
  return definitions.map((definition, index) => {
    const view = definition.view;
    const scenes = inferTransition(previousView, view);
    const step = compileStep(definition, view, scenes, index === 0, action);
    previousView = view;
    return step;
  });
}

function compileStep(definition, view, scenes, isFirst, action) {
  return {
    title: definition.title,
    body: definition.body,
    designSpace: {
      transition: scenes.length ? { scene: scenes } : undefined,
      action: isFirst ? ["step", "tooltip", "enter"] : action
    },
    views: {
      main: compileView(view)
    }
  };
}

function compileView(view) {
  const spec = view?.toSpec ? view.toSpec() : cloneState(view || {});
  const compiled = {
    ...spec
  };

  if (compiled.filter) {
    compiled.focus = compiled.filter;
    delete compiled.filter;
  }

  return compiled;
}
