import type { LayoutSpec, StepActionInput, StepDefinition, StepSpec, StorySpec, ThemeSpec, ViewSpec } from '../types/index.js';
type ViewLike = ViewSpec | {
    toSpec(): ViewSpec;
    operations(): string[];
};
export declare function story(initialSpec?: Partial<StorySpec>): StoryBuilder;
export declare function authoredSteps(definitions: StepDefinition[], { action }?: {
    action?: string[] | undefined;
}): StepSpec[];
export declare class StoryBuilder {
    private _spec;
    private _stepDefinitions;
    private _stepAction;
    constructor(initialSpec?: Partial<StorySpec>);
    schema(value: string): this;
    title(value: string): this;
    description(value: string): this;
    data(name: string, source: unknown): this;
    data(datasets: Record<string, unknown>): this;
    layout(presetOrConfig: string | Partial<LayoutSpec>, options?: Partial<LayoutSpec>): this;
    theme(themeOrHref: string | Partial<ThemeSpec>, options?: Partial<ThemeSpec>): this;
    action(actions: StepActionInput | StepActionInput[]): this;
    view(idOrConfig: string | ViewSpec, config?: ViewSpec): this;
    step(titleOrDefinition: string | StepDefinition, view?: ViewLike, options?: Partial<StepDefinition> | string): this;
    steps(definitions: StepDefinition[]): this;
    toSpec(): StorySpec;
    private _compileSteps;
}
export {};
