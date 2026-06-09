type AnyRecord = Record<string, any>;
export declare function hasScrollAction(stepOrAction?: string[] | AnyRecord): any;
export declare function normalizeActionTokens(action?: string | string[]): any[];
export declare function normalizeActionEvent(event: any, options?: AnyRecord, context?: AnyRecord): {
    type: any;
    index: number;
    value: number;
    direction: any;
    action: any[];
    force: any;
    progress: boolean;
};
export declare function defaultScrollProgress(direction: any): 0 | 1;
export declare function normalizeScrollAction(scrollSpec?: true | AnyRecord): {};
export declare function easeProgress(progress: any, name: string, d3: any): number;
export {};
