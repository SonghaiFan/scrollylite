import { createBarSpecCompiler } from "./compile.js";
import { createBarIdiom } from "./idiom.js";
import { defineChartIdiom } from "../plugin.js";
export const plugin = defineChartIdiom({
    key: "bar",
    scenes: ["focus", "guide", "granularity", "observation"],
    createIdiom: createBarIdiom,
    createSpecCompiler: createBarSpecCompiler
});
