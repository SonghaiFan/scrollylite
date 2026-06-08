import { DEFAULT_TIMING } from "../timing.js";
import {
  externalizeScrollyViewSpec,
  narrativeState,
  narrativeTransition,
  withNarrative
} from "../scrolly-meta.js";
import { chartModules } from "../charts/manifest.js";
import {
  cloneViewSpec
} from "../charts/compiler-utils.js";
import {
  createSpecCompilerRegistry,
  resolveMarkRendererKey
} from "../charts/index.js";

export const SCENE_TRANSITIONS = ["focus", "guide", "granularity", "observation"];
const STATE_APPLICATION_ORDER = ["focus", "granularity", "guide"];
const DEFAULT_STATE_OPERATION = {
  focus: "filter",
  guide: "coordinate",
  granularity: "aggregate"
};

export function resolveSceneTransition(viewSpec = {}, stepTransition = {}) {
  const rendererKey = resolveMarkRendererKey(viewSpec);
  const supportedScenes = supportedSceneTypes(rendererKey);
  const state = narrativeState(viewSpec);
  const scene = uniqueTokens([
    ...(stepTransition.scene || [])
  ]).filter((token) => SCENE_TRANSITIONS.includes(token) && supportedScenes.includes(token));

  return {
    scene,
    focus: scene.includes("focus") ? state.focus || null : null,
    guide: scene.includes("guide") ? state.guide || null : null,
    granularity: scene.includes("granularity") ? state.granularity || null : null
  };
}

export function withSceneTransitionDefaults(viewSpec, sceneTransition) {
  const transition = { ...narrativeTransition(viewSpec) };

  if ((hasScene(sceneTransition, "observation") || hasScene(sceneTransition, "granularity")) && transition.stagger == null) {
    transition.stagger = { ...DEFAULT_TIMING.scene.stagger };
  }

  return withNarrative(viewSpec, { transition });
}

export function compileViewSpec(viewSpec, sceneTransition) {
  const rendererKey = resolveMarkRendererKey(viewSpec);
  const compilerEntry = MARK_SPEC_COMPILERS[rendererKey];
  if (!compilerEntry?.compiler) return viewSpec;

  const context = { rendererKey };
  const compiled = stateOperationOrder(viewSpec, sceneTransition, compilerEntry).reduce((compiledSpec, entry) => {
    const handler = compilerEntry.compiler.operations[entry.operation];
    return handler ? handler(compiledSpec, entry.operationSpec, context) : compiledSpec;
  }, compilerEntry.compiler.base(cloneViewSpec(viewSpec), context));
  return externalizeScrollyViewSpec(pruneCompiledViewSpec(pruneConsumedSceneState(compiled)));
}

export function hasScene(sceneTransition, type) {
  return sceneTransition?.scene?.includes(type);
}

function supportedSceneTypes(mark) {
  const scenes = MARK_SPEC_COMPILERS[mark]?.scenes;
  return scenes?.length ? scenes : SCENE_TRANSITIONS;
}

function stateOperationOrder(viewSpec, sceneTransition, compilerEntry) {
  const supported = Object.keys(compilerEntry.compiler.operations);
  const state = narrativeState(viewSpec);
  const stateOperations = {
    ...DEFAULT_STATE_OPERATION,
    ...(compilerEntry.stateOperations || {})
  };
  return STATE_APPLICATION_ORDER
    .map((stateKey) => {
      const operationSpec = state[stateKey] || sceneTransition[stateKey] || null;
      const operation = operationForState(stateKey, operationSpec, stateOperations);
      return { stateKey, operation, operationSpec };
    })
    .filter((entry) =>
      entry.operationSpec != null &&
      supported.includes(entry.operation)
    );
}

function operationForState(stateKey, operationSpec = {}, stateOperations = DEFAULT_STATE_OPERATION) {
  if (stateKey === "focus" && operationSpec?.mode === "highlight") return "highlight";
  return stateOperations[stateKey] || DEFAULT_STATE_OPERATION[stateKey];
}

const MARK_SPEC_COMPILERS = createSpecCompilerRegistry(chartModules);

function pruneCompiledViewSpec(spec = {}) {
  const next = { ...spec };
  if (Array.isArray(next.transform) && !next.transform.length) delete next.transform;
  if (next.encoding && !Object.keys(next.encoding).length) delete next.encoding;
  return next;
}

function pruneConsumedSceneState(spec = {}) {
  const next = cloneViewSpec(spec);
  const state = next.narrative?.state;
  if (!state) return next;

  delete state.focus;
  delete state.guide;
  delete state.granularity;
  if (!Object.keys(state).length) delete next.narrative.state;
  return next;
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.map(normalizeToken) : [normalizeToken(value)];
}

function normalizeToken(value) {
  if (value == null) return "";
  return String(value).trim();
}

function uniqueTokens(values) {
  return [...new Set(values.map(normalizeToken).filter(Boolean))];
}
