import { cloneState } from "./view-state.js";
import { inferTransition } from "./infer-transition.js?v=semantic-agg-1";

export function story(initialSpec = {}) {
  return new StoryBuilder(initialSpec);
}

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

export class StoryBuilder {
  constructor(initialSpec = {}) {
    Object.defineProperty(this, "_spec", {
      value: cloneState(initialSpec),
      enumerable: false,
      writable: true
    });
    Object.defineProperty(this, "_stepDefinitions", {
      value: [],
      enumerable: false,
      writable: true
    });
    Object.defineProperty(this, "_stepAction", {
      value: ["step", "tooltip"],
      enumerable: false,
      writable: true
    });
  }

  schema(value) {
    this._spec.$schema = value;
    return this;
  }

  title(value) {
    this._spec.title = value;
    return this;
  }

  description(value) {
    this._spec.description = value;
    return this;
  }

  data(nameOrDatasets, source) {
    const datasets = typeof nameOrDatasets === "string"
      ? { [nameOrDatasets]: source }
      : nameOrDatasets;
    this._spec.data = {
      ...(this._spec.data || {}),
      ...cloneState(datasets || {})
    };
    return this;
  }

  layout(presetOrConfig, options = {}) {
    if (typeof presetOrConfig === "string") {
      this._spec.designSpace = {
        ...(this._spec.designSpace || {}),
        layout: {
          ...(this._spec.designSpace?.layout || {}),
          ...layoutPreset(presetOrConfig),
          ...(options.designSpace || {})
        }
      };

      if (options.runtime || options.layout) {
        this._spec.layout = {
          ...(this._spec.layout || {}),
          ...cloneState(options.runtime || options.layout)
        };
      }
      return this;
    }

    this._spec.layout = {
      ...(this._spec.layout || {}),
      ...cloneState(presetOrConfig || {})
    };
    return this;
  }

  designSpace(config = {}) {
    this._spec.designSpace = {
      ...(this._spec.designSpace || {}),
      ...cloneState(config)
    };
    return this;
  }

  action(actions) {
    this._stepAction = Array.isArray(actions) ? [...actions] : [actions];
    this.#compileSteps();
    return this;
  }

  view(idOrConfig, config) {
    const views = typeof idOrConfig === "string"
      ? { [idOrConfig]: config }
      : { main: idOrConfig };
    this._spec.views = {
      ...(this._spec.views || {}),
      ...cloneState(views || {})
    };
    return this;
  }

  step(titleOrDefinition, view, options = {}) {
    const normalizedOptions = typeof options === "string" ? { body: options } : options;
    const definition = typeof titleOrDefinition === "object"
      ? titleOrDefinition
      : {
          title: titleOrDefinition,
          view,
          ...normalizedOptions
        };

    this._stepDefinitions.push(definition);
    this.#compileSteps();
    return this;
  }

  steps(definitions = []) {
    this._stepDefinitions = [...definitions];
    this.#compileSteps();
    return this;
  }

  toSpec() {
    return cloneState(this._spec);
  }

  #compileSteps() {
    this._spec.steps = authoredSteps(this._stepDefinitions, { action: this._stepAction });
  }
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

function layoutPreset(name) {
  if (name === "textOverVis") {
    return {
      preset: "textOverVis",
      axis: "vertical",
      binding: "floatToText",
      container: "visContainer",
      layering: "textOverVis"
    };
  }

  return {
    preset: name,
    axis: "vertical",
    binding: "floatToText",
    container: "visContainer"
  };
}
