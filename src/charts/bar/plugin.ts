import { defineChartIdiom } from '../plugin.js';
import { createBarIdiom } from './idiom.js';
import type { ChartPlugin } from '../../types/index.js';
import type { BarSpec } from './idiom.js';

// createBarSpecCompiler is still in compile.js (not yet migrated)
import { createBarSpecCompiler } from './compile.js';

export const plugin: ChartPlugin<BarSpec> = defineChartIdiom<BarSpec>({
  key: 'bar',
  scenes: ['focus', 'guide', 'granularity', 'observation'],
  createIdiom: createBarIdiom,
  createSpecCompiler: createBarSpecCompiler
});
