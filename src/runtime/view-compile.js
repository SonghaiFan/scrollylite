import { externalizeScrollyViewSpec } from "../scrolly-meta.js?v=semantic-key-11";
import {
  compileViewSpec,
  resolveSceneTransition,
  withSceneTransitionDefaults
} from "../transitions/index.js?v=semantic-key-19";

export function compileEffectiveView(viewSpec, stepTransition = {}) {
  const authoredViewSpec = externalizeScrollyViewSpec(viewSpec);
  const sceneTransition = resolveSceneTransition(authoredViewSpec, stepTransition);
  const effectiveViewSpec = compileViewSpec(
    withSceneTransitionDefaults(authoredViewSpec, sceneTransition),
    sceneTransition
  );
  return { sceneTransition, effectiveViewSpec: externalizeScrollyViewSpec(effectiveViewSpec) };
}

export function compileTransitionSource(viewSpec, stepTransition = {}) {
  if (!viewSpec || !viewSpec.mark || viewSpec.mark === "text") {
    return {
      effectiveViewSpec: null,
      sceneTransition: {}
    };
  }
  return compileEffectiveView(viewSpec, stepTransition);
}
