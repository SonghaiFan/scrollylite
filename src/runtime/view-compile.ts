import type { ViewSpec } from '../types/index.js';
import { externalizeScrollyViewSpec } from '../scrolly-meta.js';
import {
  compileViewSpec,
  resolveSceneTransition,
  withSceneTransitionDefaults
} from '../transitions/index.js';

interface StepTransition {
  scene?: string[];
}

interface CompileResult {
  sceneTransition: ReturnType<typeof resolveSceneTransition>;
  effectiveViewSpec: ViewSpec | null;
}

export function compileEffectiveView(viewSpec: ViewSpec, stepTransition: StepTransition = {}): CompileResult {
  const authoredViewSpec = externalizeScrollyViewSpec(viewSpec);
  const sceneTransition = resolveSceneTransition(authoredViewSpec, stepTransition);
  const effectiveViewSpec = compileViewSpec(
    withSceneTransitionDefaults(authoredViewSpec, sceneTransition),
    sceneTransition
  );
  return { sceneTransition, effectiveViewSpec: externalizeScrollyViewSpec(effectiveViewSpec) };
}

export function compileTransitionSource(viewSpec: ViewSpec | null | undefined, stepTransition: StepTransition = {}): CompileResult {
  if (!viewSpec || !(viewSpec as Record<string, unknown>)['mark'] || (viewSpec as Record<string, unknown>)['mark'] === 'text') {
    return { effectiveViewSpec: null, sceneTransition: { scene: [], focus: null, guide: null, granularity: null } };
  }
  return compileEffectiveView(viewSpec, stepTransition);
}
