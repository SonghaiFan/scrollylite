import { createUnitSpecCompiler } from "./compile.js?v=semantic-key-3";
import { createUnitRenderer } from "./render.js?v=semantic-key-13";
import { createDefaultTransitionPlan } from "../transition-plan.js?v=semantic-key-1";
import { defineChartIdiom } from "../plugin.js?v=semantic-key-1";

const plan = (previousSpec, nextSpec) =>
  createDefaultTransitionPlan(previousSpec, nextSpec, { reason: "unit-default-plan" });

export const plugin = defineChartIdiom({
  key: "unit",
  aliases: ["unitChart", "unitplot", "unitPlot", "units"],
  createRenderer: createUnitRenderer,
  createSpecCompiler: createUnitSpecCompiler,
  transition: { plan }
});

export const key = plugin.key;
export const aliases = plugin.aliases;
export const createChartIdiom = plugin.createChartIdiom;
export const createSpecCompiler = plugin.createSpecCompiler;
export const chartPlugin = plugin;
