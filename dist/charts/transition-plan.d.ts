import type { TransitionPlan, ViewSpec } from '../types/index.js';
interface TransitionPlanOptions {
    reason?: string;
}
export declare function createDefaultTransitionPlan(previousSpec: ViewSpec | null | undefined, nextSpec: ViewSpec | null | undefined, options?: TransitionPlanOptions): TransitionPlan;
export {};
