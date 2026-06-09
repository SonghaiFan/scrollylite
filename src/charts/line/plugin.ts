import type { ChartPlugin } from '../../types/index.js';
import { createLineSpecCompiler } from './compile.js';
import { createLineRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartIdiom } from '../plugin.js';
import type { LineViewState } from './authoring.js';

export const plugin: ChartPlugin<LineViewState> = defineChartIdiom<LineViewState>({
  key: 'line',
  scenes: ['focus', 'guide', 'granularity', 'observation'],
  createRenderer: createLineRenderer,
  createSpecCompiler: createLineSpecCompiler,
  transition: {
    plan: (previousSpec, nextSpec) =>
      createDefaultTransitionPlan(previousSpec, nextSpec, { reason: 'line-default-plan' })
  }
});
