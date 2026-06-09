import { externalizeScrollyViewSpec, withNarrative } from '../scrolly-meta.js';
import { cloneState } from './view-state.js';
import { inferTransition } from './infer-transition.js';
export function story(initialSpec = {}) {
    return new StoryBuilder(initialSpec);
}
export function authoredSteps(definitions, { action = ['step', 'tooltip'] } = {}) {
    let previousView = null;
    return definitions.map((definition, index) => {
        const view = definition.view ?? null;
        const scenes = inferTransition(previousView, view);
        const step = compileStep(definition, view, scenes, index === 0, action);
        previousView = view;
        return step;
    });
}
export class StoryBuilder {
    constructor(initialSpec = {}) {
        this._spec = cloneState(initialSpec);
        this._stepDefinitions = [];
        this._stepAction = ['step', 'tooltip'];
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
        const datasets = typeof nameOrDatasets === 'string'
            ? { [nameOrDatasets]: source }
            : nameOrDatasets;
        this._spec.data = { ...(this._spec.data ?? {}), ...cloneState(datasets ?? {}) };
        return this;
    }
    layout(presetOrConfig, options = {}) {
        if (typeof presetOrConfig === 'string') {
            this._spec.layout = {
                ...(this._spec.layout ?? {}),
                preset: presetOrConfig,
                ...cloneState(options)
            };
        }
        else {
            this._spec.layout = { ...(this._spec.layout ?? {}), ...cloneState(presetOrConfig) };
        }
        return this;
    }
    theme(themeOrHref, options = {}) {
        const theme = typeof themeOrHref === 'string'
            ? { href: themeOrHref, ...cloneState(options) }
            : cloneState(themeOrHref);
        this._spec.theme = { ...(this._spec.theme ?? {}), ...theme };
        return this;
    }
    action(actions) {
        this._stepAction = normalizeStepActions(actions);
        this._compileSteps();
        return this;
    }
    view(idOrConfig, config) {
        const views = typeof idOrConfig === 'string'
            ? { [idOrConfig]: config }
            : { main: idOrConfig };
        this._spec.views = { ...(this._spec.views ?? {}), ...cloneState(views) };
        return this;
    }
    step(titleOrDefinition, view, options = {}) {
        const normalizedOptions = typeof options === 'string' ? { body: options } : options;
        const definition = typeof titleOrDefinition === 'object'
            ? titleOrDefinition
            : { title: titleOrDefinition, view, ...normalizedOptions };
        this._stepDefinitions.push(definition);
        this._compileSteps();
        return this;
    }
    steps(definitions) {
        this._stepDefinitions = [...definitions];
        this._compileSteps();
        return this;
    }
    toSpec() {
        return cloneState(this._spec);
    }
    _compileSteps() {
        this._spec.steps = authoredSteps(this._stepDefinitions, { action: this._stepAction });
    }
}
// ─── Internal helpers ─────────────────────────────────────────────────────────
function compileStep(definition, view, scenes, isFirst, action) {
    const authoringCode = definition.authoringCode ?? definition.authoring ?? definition.code;
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
        ...(authoringCode ? { inspector: { authoringCode } } : {}),
        transition: scenes.length ? { scene: scenes } : undefined,
        action: (isFirst ? withEnterAction(stepAction) : stepAction),
        views: { main: compiledView }
    };
}
function normalizeStepActions(actions = ['step', 'tooltip']) {
    const values = Array.isArray(actions) ? actions : [actions];
    return uniqueActions(values.flatMap(expandActionAlias));
}
function expandActionAlias(action) {
    if (action === 'stepper')
        return ['step', 'tooltip'];
    if (action === 'scroller')
        return ['scroll', 'tooltip'];
    return [action];
}
function withEnterAction(actions) {
    return uniqueActions([...actions, 'enter']);
}
function uniqueActions(actions) {
    return [...new Set(actions.filter(Boolean))];
}
function compileView(view) {
    const spec = view && typeof view.toSpec === 'function'
        ? view.toSpec()
        : cloneState((view ?? {}));
    return externalizeScrollyViewSpec(spec);
}
