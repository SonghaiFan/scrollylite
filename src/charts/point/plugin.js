import { createPointSpecCompiler } from "./compile.js?v=semantic-key-3";
import { createPointRenderer } from "./render.js?v=semantic-key-12";
import { createDefaultTransitionPlan } from "../transition-plan.js?v=semantic-key-1";
import { defineChartIdiom } from "../plugin.js?v=semantic-key-1";

const plan = (previousSpec, nextSpec) =>
  createDefaultTransitionPlan(previousSpec, nextSpec, { reason: "point-default-plan" });

export const plugin = defineChartIdiom({
  key: "point",
  aliases: ["circle", "points", "square", "dot", "dots", "scatter", "scatterplot", "scatterPlot"],
  createRenderer: createPointRenderer,
  createSpecCompiler: createPointSpecCompiler,
  transition: { plan }
});

export const key = plugin.key;
export const aliases = plugin.aliases;
export const createChartIdiom = plugin.createChartIdiom;
export const createSpecCompiler = plugin.createSpecCompiler;
export const chartPlugin = plugin;
