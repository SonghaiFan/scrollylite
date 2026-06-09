export function createBarIdiom(deps?: {}): {
    key: string;
    renderer: any;
    prepareSpec: typeof prepareBarSpec;
    resolveTransitionPlan: typeof resolveBarTransitionPlan;
    intermediateSpecs: typeof barIntermediateSpecs;
    intermediateSpec: (previousSpec: any, nextSpec: any) => {
        spec: any;
        scene: string;
    };
    defaultMargin: typeof defaultMargin;
    inspect: {
        transitionPlanKey: string;
    };
};
declare function prepareBarSpec(spec?: {}): any;
import { resolveBarTransitionPlan } from "./state.js";
import { barIntermediateSpecs } from "./state.js";
declare function defaultMargin(spec?: {}): {
    left: number;
    right: number;
} | {
    left?: undefined;
    right?: undefined;
};
export {};
