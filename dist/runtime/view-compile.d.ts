import type { ViewSpec } from '../types/index.js';
import { resolveSceneTransition } from '../transitions/index.js';
interface StepTransition {
    scene?: string[];
}
interface CompileResult {
    sceneTransition: ReturnType<typeof resolveSceneTransition>;
    effectiveViewSpec: ViewSpec | null;
}
export declare function compileEffectiveView(viewSpec: ViewSpec, stepTransition?: StepTransition): CompileResult;
export declare function compileTransitionSource(viewSpec: ViewSpec | null | undefined, stepTransition?: StepTransition): CompileResult;
export {};
