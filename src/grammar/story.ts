import { externalizeScrollyViewSpec, withNarrative } from '../scrolly-meta.js';
import { cloneState } from './view-state.js';
import { inferTransition } from './infer-transition.js';
import type {
  LayoutSpec,
  StepActionInput,
  StepActionToken,
  StepDefinition,
  StepSpec,
  StorySpec,
  ThemeSpec,
  ViewSpec
} from '../types/index.js';

type ViewLike = ViewSpec | { toSpec(): ViewSpec; operations(): string[] };

export function story(initialSpec: Partial<StorySpec> = {}): StoryBuilder {
  return new StoryBuilder(initialSpec);
}

export function authoredSteps(
  definitions: StepDefinition[],
  { action = ['step', 'tooltip'] as StepActionInput[] } = {}
): StepSpec[] {
  let previousView: ViewLike | null = null;
  return definitions.map((definition, index) => {
    const view = definition.view ?? null;
    const scenes = inferTransition(previousView, view as ViewLike);
    const step = compileStep(definition, view, scenes, index === 0, action);
    previousView = view as ViewLike;
    return step;
  });
}

export class StoryBuilder {
  private _spec: StorySpec;
  private _stepDefinitions: StepDefinition[];
  private _stepAction: StepActionInput[];

  constructor(initialSpec: Partial<StorySpec> = {}) {
    this._spec = cloneState(initialSpec) as StorySpec;
    this._stepDefinitions = [];
    this._stepAction = ['step', 'tooltip'];
  }

  schema(value: string): this {
    this._spec.$schema = value;
    return this;
  }

  title(value: string): this {
    this._spec.title = value;
    return this;
  }

  description(value: string): this {
    this._spec.description = value;
    return this;
  }

  data(name: string, source: unknown): this;
  data(datasets: Record<string, unknown>): this;
  data(nameOrDatasets: string | Record<string, unknown>, source?: unknown): this {
    const datasets =
      typeof nameOrDatasets === 'string'
        ? { [nameOrDatasets]: source }
        : nameOrDatasets;
    this._spec.data = { ...(this._spec.data ?? {}), ...cloneState(datasets ?? {}) };
    return this;
  }

  layout(presetOrConfig: string | Partial<LayoutSpec>, options: Partial<LayoutSpec> = {}): this {
    if (typeof presetOrConfig === 'string') {
      this._spec.layout = {
        ...(this._spec.layout ?? {}),
        preset: presetOrConfig,
        ...cloneState(options)
      };
    } else {
      this._spec.layout = { ...(this._spec.layout ?? {}), ...cloneState(presetOrConfig) };
    }
    return this;
  }

  theme(themeOrHref: string | Partial<ThemeSpec>, options: Partial<ThemeSpec> = {}): this {
    const theme: ThemeSpec =
      typeof themeOrHref === 'string'
        ? { href: themeOrHref, ...cloneState(options) }
        : cloneState(themeOrHref);
    this._spec.theme = { ...(this._spec.theme ?? {}), ...theme };
    return this;
  }

  action(actions: StepActionInput | StepActionInput[]): this {
    this._stepAction = normalizeStepActions(actions);
    return this;
  }

  view(idOrConfig: string | ViewSpec, config?: ViewSpec): this {
    const views: Record<string, ViewSpec> =
      typeof idOrConfig === 'string'
        ? { [idOrConfig]: config as ViewSpec }
        : { main: idOrConfig };
    this._spec.views = { ...(this._spec.views ?? {}), ...cloneState(views) };
    return this;
  }

  add(
    titleOrDefinition: string | StepDefinition,
    view?: ViewLike,
    options: Partial<StepDefinition> | string = {}
  ): this {
    const normalizedOptions = typeof options === 'string' ? { body: options } : options;
    const definition: StepDefinition =
      typeof titleOrDefinition === 'object'
        ? titleOrDefinition
        : { title: titleOrDefinition, view, ...normalizedOptions };

    this._stepDefinitions.push(definition);
    return this;
  }

  toSpec(): StorySpec {
    const spec = cloneState(this._spec) as StorySpec;
    if (this._stepDefinitions.length) {
      spec.steps = authoredSteps(this._stepDefinitions, { action: this._stepAction });
    }
    return spec;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function compileStep(
  definition: StepDefinition,
  view: ViewLike | null | undefined,
  scenes: string[],
  isFirst: boolean,
  action: StepActionInput[]
): StepSpec {
  const code = definition.code;
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
    ...(code ? { inspector: { code } } : {}),
    transition: scenes.length ? { scene: scenes } : undefined,
    action: (isFirst ? withEnterAction(stepAction) : stepAction) as StepActionToken[],
    views: { main: compiledView }
  };
}

function normalizeStepActions(
  actions: StepActionInput | StepActionInput[] = ['step', 'tooltip']
): StepActionInput[] {
  const values = Array.isArray(actions) ? actions : [actions];
  return uniqueActions(values);
}

function withEnterAction(actions: StepActionInput[]): StepActionInput[] {
  return uniqueActions([...actions, 'enter']);
}

function uniqueActions(actions: StepActionInput[]): StepActionInput[] {
  return [...new Set(actions.filter(Boolean))];
}

function compileView(view: ViewLike | null | undefined): ViewSpec {
  const spec =
    view && typeof (view as { toSpec?(): ViewSpec }).toSpec === 'function'
      ? (view as { toSpec(): ViewSpec }).toSpec()
      : cloneState((view ?? {}) as ViewSpec);
  return externalizeScrollyViewSpec(spec);
}
