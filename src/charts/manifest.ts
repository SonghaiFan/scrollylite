import type { ChartPlugin } from '../types/index.js';
// Generated from src/charts/*/plugin.ts.
// Run scripts/sync-chart-manifest.mjs after adding or removing a chart idiom folder.
import * as bar from "./bar/plugin.js";
import * as line from "./line/plugin.js";
import * as point from "./point/plugin.js";
import * as unit from "./unit/plugin.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chartModules: Array<{ plugin: ChartPlugin<any> }> = [
  bar,
  line,
  point,
  unit
];
