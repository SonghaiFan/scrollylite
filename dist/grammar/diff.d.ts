export function diffViewStates(previous: any, next: any): {
    changed: string[];
    has: (key: any) => boolean;
    deltas: any[];
    delta: (type: any) => any;
    hasDelta: (type: any, action?: any) => boolean;
    semantic: {
        previous: {
            mark: any;
            key: any;
            semanticKey: {
                measure?: any;
                entity?: any;
            };
            encoding: any;
            filters: any[];
            nonFilterTransforms: any;
            focus: any;
            guide: any;
            granularity: any;
        };
        next: {
            mark: any;
            key: any;
            semanticKey: {
                measure?: any;
                entity?: any;
            };
            encoding: any;
            filters: any[];
            nonFilterTransforms: any;
            focus: any;
            guide: any;
            granularity: any;
        };
        deltas: any[];
        has: (type: any, action?: any) => boolean;
        get: (type: any) => any;
    };
    previous: any;
    next: any;
};
export function sameValue(a: any, b: any): boolean;
export function diffSemanticViewStates(previous?: {}, next?: {}): {
    previous: {
        mark: any;
        key: any;
        semanticKey: {
            measure?: any;
            entity?: any;
        };
        encoding: any;
        filters: any[];
        nonFilterTransforms: any;
        focus: any;
        guide: any;
        granularity: any;
    };
    next: {
        mark: any;
        key: any;
        semanticKey: {
            measure?: any;
            entity?: any;
        };
        encoding: any;
        filters: any[];
        nonFilterTransforms: any;
        focus: any;
        guide: any;
        granularity: any;
    };
    deltas: any[];
    has: (type: any, action?: any) => boolean;
    get: (type: any) => any;
};
