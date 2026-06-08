import { createBarSpecCompiler } from "./compile.js?v=semantic-key-3";
import { createBarIdiom } from "./idiom.js?v=semantic-key-12";
import { defineChartIdiom } from "../plugin.js?v=semantic-key-1";

export const plugin = defineChartIdiom({
  key: "bar",
  aliases: ["barChart"],
  createIdiom: createBarIdiom,
  createSpecCompiler: createBarSpecCompiler
});

export const key = plugin.key;
export const aliases = plugin.aliases;
export const createChartIdiom = plugin.createChartIdiom;
export const createSpecCompiler = plugin.createSpecCompiler;
export const chartPlugin = plugin;
