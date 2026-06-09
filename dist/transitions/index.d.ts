import type { FocusSpec, GranularitySpec, GuideSpec, ViewSpec } from '../types/index.js';
export declare const SCENE_TRANSITIONS: readonly ["focus", "guide", "granularity", "observation"];
export type SceneTransitionType = typeof SCENE_TRANSITIONS[number];
interface SceneTransition {
    scene: string[];
    focus?: FocusSpec | null;
    guide?: GuideSpec | null;
    granularity?: GranularitySpec | null;
}
interface StepTransition {
    scene?: string[];
}
export declare function resolveSceneTransition(viewSpec?: ViewSpec, stepTransition?: StepTransition): SceneTransition;
export declare function withSceneTransitionDefaults(viewSpec: ViewSpec, sceneTransition: SceneTransition): ViewSpec;
export declare function compileViewSpec(viewSpec: ViewSpec, sceneTransition: SceneTransition): ViewSpec;
export declare function hasScene(sceneTransition: SceneTransition | null | undefined, type: string): boolean;
export {};
