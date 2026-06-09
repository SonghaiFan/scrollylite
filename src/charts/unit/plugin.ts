import type { ChartPlugin } from '../../types/index.js';
import { createUnitSpecCompiler } from './compile.js';
import { createUnitRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartIdiom } from '../plugin.js';
import type { UnitViewState } from './authoring.js';

export const plugin: ChartPlugin<UnitViewState> = defineChartIdiom<UnitViewState>({
  key: 'unit',
  scenes: ['focus', 'guide'],
  stateOperations: { guide: 'layout' },
  createRenderer: createUnitRenderer,
  createSpecCompiler: createUnitSpecCompiler,
  transition: {
    plan: (previousSpec, nextSpec) =>
      createDefaultTransitionPlan(previousSpec, nextSpec, { reason: 'unit-default-plan' })
  }
});
