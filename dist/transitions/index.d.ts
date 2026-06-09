export function resolveSceneTransition(viewSpec?: {}, stepTransition?: {}): {
    scene: any[];
    focus: any;
    guide: any;
    granularity: any;
};
export function withSceneTransitionDefaults(viewSpec: any, sceneTransition: any): {
    narrative: any;
};
export function compileViewSpec(viewSpec: any, sceneTransition: any): any;
export function hasScene(sceneTransition: any, type: any): any;
export const SCENE_TRANSITIONS: string[];
