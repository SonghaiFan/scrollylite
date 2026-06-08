import { createLineSpecCompiler } from "./compile.js?v=semantic-key-3";
import { createLineRenderer } from "./render.js?v=semantic-key-11";
import { createDefaultTransitionPlan } from "../transition-plan.js?v=semantic-key-1";
import { defineChartIdiom } from "../plugin.js?v=semantic-key-1";

const plan = (previousSpec, nextSpec) =>
  createDefaultTransitionPlan(previousSpec, nextSpec, { reason: "line-default-plan" });

export const plugin = defineChartIdiom({
  key: "line",
  aliases: ["lineChart"],
  createRenderer: createLineRenderer,
  createSpecCompiler: createLineSpecCompiler,
  transition: { plan }
});

export const key = plugin.key;
export const aliases = plugin.aliases;
export const createChartIdiom = plugin.createChartIdiom;
export const createSpecCompiler = plugin.createSpecCompiler;
export const chartPlugin = plugin;
