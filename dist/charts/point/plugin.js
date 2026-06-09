import { createPointSpecCompiler } from './compile.js';
import { createPointRenderer } from './render.js';
import { createDefaultTransitionPlan } from '../transition-plan.js';
import { defineChartIdiom } from '../plugin.js';
export const plugin = defineChartIdiom({
    key: 'point',
    scenes: ['focus', 'guide', 'granularity', 'observation'],
    createRenderer: createPointRenderer,
    createSpecCompiler: createPointSpecCompiler,
    transition: {
        plan: (previousSpec, nextSpec) => createDefaultTransitionPlan(previousSpec, nextSpec, { reason: 'point-default-plan' })
    }
});
