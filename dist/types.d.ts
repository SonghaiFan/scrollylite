export type AnyRecord = Record<string, any>;
export type Target = string | Element;
export type Direction = "up" | "down" | string;
export type StepAction = "step" | "scroll" | "tooltip" | "enter" | "stepper" | "scroller" | string;
export type ActionEvent = number | string | Event | {
    type?: string;
    step?: number;
    index?: number;
    value?: number;
    progress?: number;
    scrollProgress?: number;
    direction?: Direction;
    action?: StepAction | StepAction[];
    force?: boolean;
};
export interface RuntimeOptions {
    target?: Target;
    d3: AnyRecord;
    aq?: AnyRecord;
    debug?: boolean;
}
export interface PageOptions {
    target?: Target;
    debug?: boolean;
}
export interface ChartOptions extends RuntimeOptions {
    view?: string;
    viewId?: string;
    initialStep?: number;
}
export interface StoryRuntime {
    spec: AnyRecord;
    data: AnyRecord;
    signature: AnyRecord[];
    action(event: ActionEvent, options?: AnyRecord): void;
    scrollDriver: AnyRecord;
    destroy(): void;
}
export interface PageRuntime {
    spec: AnyRecord;
    shell: AnyRecord;
    root: Element;
    story: Element;
    steps: Element[];
    views: Record<string, Element>;
    tooltip: Element;
    destroy(): void;
}
export interface ChartRuntime {
    spec: AnyRecord;
    data: AnyRecord;
    view: Element;
    tooltip: Element;
    action(event: ActionEvent, options?: AnyRecord): void;
    resize(): void;
    destroy(): void;
}
