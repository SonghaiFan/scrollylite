import { cloneState } from "./view-state.js?v=semantic-key-10";
import { inferTransition } from "./infer-transition.js?v=semantic-key-13";
import {
  externalizeScrollyViewSpec,
  withNarrative
} from "../scrolly-meta.js?v=semantic-key-10";

export function story(initialSpec = {}) {
  return new StoryBuilder(initialSpec);
}

story.init = function initStory(initialSpec = {}) {
  return story(initialSpec);
};

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
      this._spec.layout = {
        ...(this._spec.layout || {}),
        ...layoutPreset(presetOrConfig),
        ...cloneState(options.runtime || options.layout || {})
      };
      return this;
    }

    this._spec.layout = {
      ...(this._spec.layout || {}),
      ...cloneState(presetOrConfig || {})
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
  const authoringCode = definition.authoringCode || definition.authoring || definition.code;
  const compiledView = withNarrative(compileView(view), {
    annotation: {
      title: definition.title,
      ...(definition.body ? { description: definition.body } : {})
    }
  });
  return {
    title: definition.title,
    body: definition.body,
    ...(authoringCode ? {
      inspector: {
        authoringCode
      }
    } : {}),
    transition: scenes.length ? { scene: scenes } : undefined,
    action: isFirst ? ["step", "tooltip", "enter"] : action,
    views: {
      main: compiledView
    }
  };
}

function compileView(view) {
  const spec = view?.toSpec ? view.toSpec() : cloneState(view || {});
  return externalizeScrollyViewSpec(spec);
}

function layoutPreset(name) {
  return {
    preset: name
  };
}
