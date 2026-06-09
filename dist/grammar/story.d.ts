export function story(initialSpec?: {}): StoryBuilder;
export function authoredSteps(definitions?: any[], { action }?: {
    action?: string[];
}): {
    transition: {
        scene: any;
    };
    action: any[];
    views: {
        main: {
            narrative: any;
        };
    };
    inspector?: {
        authoringCode: any;
    };
    title: any;
    body: any;
}[];
export class StoryBuilder {
    constructor(initialSpec?: {});
    schema(value: any): this;
    title(value: any): this;
    description(value: any): this;
    data(nameOrDatasets: any, source: any): this;
    layout(presetOrConfig: any, options?: {}): this;
    theme(themeOrHref: any, options?: {}): this;
    action(actions: any): this;
    _stepAction: any[];
    view(idOrConfig: any, config: any): this;
    step(titleOrDefinition: any, view: any, options?: {}): this;
    steps(definitions?: any[]): this;
    _stepDefinitions: any[];
    toSpec(): any;
    #private;
}
