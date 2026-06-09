import type { ChartPlugin } from '../../types/index.js';
import { createPointSpecCompiler } from './compile.js';
import { createPointRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartIdiom } from '../plugin.js';
import type { PointViewState } from './authoring.js';

export const plugin: ChartPlugin<PointViewState> = defineChartIdiom<PointViewState>({
  key: 'point',
  scenes: ['focus', 'guide', 'granularity', 'observation'],
  createRenderer: createPointRenderer,
  createSpecCompiler: createPointSpecCompiler,
  transition: {
    plan: (previousSpec, nextSpec) =>
      createDefaultTransitionPlan(previousSpec, nextSpec, { reason: 'point-default-plan' })
  }
});
