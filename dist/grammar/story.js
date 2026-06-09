var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _StoryBuilder_instances, _StoryBuilder_compileSteps;
import { cloneState } from "./view-state.js";
import { inferTransition } from "./infer-transition.js";
import { externalizeScrollyViewSpec, withNarrative } from "../scrolly-meta.js";
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
        _StoryBuilder_instances.add(this);
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
    theme(themeOrHref, options = {}) {
        const theme = typeof themeOrHref === "string"
            ? { href: themeOrHref, ...cloneState(options || {}) }
            : cloneState(themeOrHref || {});
        this._spec.theme = {
            ...(this._spec.theme || {}),
            ...theme
        };
        return this;
    }
    action(actions) {
        this._stepAction = normalizeStepActions(actions);
        __classPrivateFieldGet(this, _StoryBuilder_instances, "m", _StoryBuilder_compileSteps).call(this);
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
        __classPrivateFieldGet(this, _StoryBuilder_instances, "m", _StoryBuilder_compileSteps).call(this);
        return this;
    }
    steps(definitions = []) {
        this._stepDefinitions = [...definitions];
        __classPrivateFieldGet(this, _StoryBuilder_instances, "m", _StoryBuilder_compileSteps).call(this);
        return this;
    }
    toSpec() {
        return cloneState(this._spec);
    }
}
_StoryBuilder_instances = new WeakSet(), _StoryBuilder_compileSteps = function _StoryBuilder_compileSteps() {
    this._spec.steps = authoredSteps(this._stepDefinitions, { action: this._stepAction });
};
function compileStep(definition, view, scenes, isFirst, action) {
    const authoringCode = definition.authoringCode || definition.authoring || definition.code;
    const stepAction = normalizeStepActions(definition.action ?? action);
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
        action: isFirst ? withEnterAction(stepAction) : stepAction,
        views: {
            main: compiledView
        }
    };
}
function normalizeStepActions(actions = ["step", "tooltip"]) {
    const values = Array.isArray(actions) ? actions : [actions];
    return uniqueActions(values.flatMap(expandActionAlias));
}
function expandActionAlias(action) {
    if (action === "stepper")
        return ["step", "tooltip"];
    if (action === "scroller")
        return ["scroll", "tooltip"];
    return [action];
}
function withEnterAction(actions) {
    return uniqueActions([...actions, "enter"]);
}
function uniqueActions(actions) {
    return [...new Set(actions.filter(Boolean))];
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
