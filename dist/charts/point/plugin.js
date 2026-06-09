import { createPointSpecCompiler } from "./compile.js";
import { createPointRenderer } from "./render.js";
import { createDefaultTransitionPlan } from "../transition-plan.js";
import { defineChartIdiom } from "../plugin.js";
const plan = (previousSpec, nextSpec) => createDefaultTransitionPlan(previousSpec, nextSpec, { reason: "point-default-plan" });
export const plugin = defineChartIdiom({
    key: "point",
    scenes: ["focus", "guide", "granularity", "observation"],
    createRenderer: createPointRenderer,
    createSpecCompiler: createPointSpecCompiler,
    transition: { plan }
});
