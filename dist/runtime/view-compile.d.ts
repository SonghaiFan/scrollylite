export function compileEffectiveView(viewSpec: any, stepTransition?: {}): {
    sceneTransition: {
        scene: any[];
        focus: any;
        guide: any;
        granularity: any;
    };
    effectiveViewSpec: any;
};
export function compileTransitionSource(viewSpec: any, stepTransition?: {}): {
    sceneTransition: {
        scene: any[];
        focus: any;
        guide: any;
        granularity: any;
    };
    effectiveViewSpec: any;
} | {
    effectiveViewSpec: any;
    sceneTransition: {};
};
