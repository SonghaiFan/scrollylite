import { DEFAULT_TIMING } from "../timing.js";
import {
  externalizeScrollyViewSpec,
  narrativeState,
  narrativeTransition,
  narrativeUnit,
  withNarrative
} from "../scrolly-meta.js?v=semantic-key-11";
import { chartModules } from "../charts/manifest.js?v=semantic-key-4";
import {
  cloneViewSpec
} from "../charts/compiler-utils.js?v=semantic-key-3";
import {
  createSpecCompilerMap
} from "../charts/index.js?v=semantic-key-6";

export const SCENE_TRANSITIONS = ["focus", "guide", "granularity", "observation"];
const STATE_APPLICATION_ORDER = ["focus", "granularity", "guide"];
const DEFAULT_STATE_OPERATION = {
  focus: "filter",
  guide: "coordinate",
  granularity: "aggregate"
};
const STATE_OPERATION_BY_MARK = {
  unit: {
    guide: "layout"
  }
};

const ALIASES = new Map(
  Object.entries({
    focused: "focus",
    guiding: "guide",
    granular: "granularity"
  })
);

export function resolveSceneTransition(viewSpec = {}, stepTransition = {}) {
  const rendererKey = transitionRendererKey(viewSpec);
  const supportedScenes = supportedSceneTypes(rendererKey);
  const state = narrativeState(viewSpec);
  const scene = uniqueTokens([
    ...(stepTransition.scene || []),
    ...asArray(viewSpec.scene),
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
  const rendererKey = transitionRendererKey(viewSpec);
  const compiler = MARK_SPEC_COMPILERS[rendererKey];
  if (!compiler) return viewSpec;

  const context = { rendererKey };
  const compiled = stateOperationOrder(viewSpec, sceneTransition, compiler).reduce((compiledSpec, entry) => {
    const handler = compiler.operations[entry.operation];
    return handler ? handler(compiledSpec, entry.operationSpec, context) : compiledSpec;
  }, compiler.base(cloneViewSpec(viewSpec), context));
  return externalizeScrollyViewSpec(pruneCompiledViewSpec(pruneConsumedSceneState(compiled)));
}

export function hasScene(sceneTransition, type) {
  return sceneTransition?.scene?.includes(type);
}

function supportedSceneTypes(mark) {
  if (mark === "unit") return ["focus", "guide"];
  return SCENE_TRANSITIONS;
}

function transitionRendererKey(viewSpec = {}) {
  const mark = String(viewSpec.mark || "").toLowerCase();
  if (narrativeUnit(viewSpec)) return "unit";
  if (mark === "point" || mark === "circle" || mark === "square") return "point";
  return mark;
}

function stateOperationOrder(viewSpec, sceneTransition, compiler) {
  const supported = Object.keys(compiler.operations);
  const rendererKey = transitionRendererKey(viewSpec);
  const state = narrativeState(viewSpec);
  return STATE_APPLICATION_ORDER
    .map((stateKey) => {
      const operationSpec = state[stateKey] || sceneTransition[stateKey] || null;
      const operation = operationForState(rendererKey, stateKey, operationSpec);
      return { stateKey, operation, operationSpec };
    })
    .filter((entry) =>
      entry.operationSpec != null &&
      supported.includes(entry.operation)
    );
}

function operationForState(mark, stateKey, operationSpec = {}) {
  if (stateKey === "focus" && operationSpec?.mode === "highlight") return "highlight";
  return STATE_OPERATION_BY_MARK[mark]?.[stateKey] || DEFAULT_STATE_OPERATION[stateKey];
}

const MARK_SPEC_COMPILERS = createSpecCompilerMap(chartModules);

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
  const raw = String(value).trim();
  return ALIASES.get(raw) || ALIASES.get(raw.toLowerCase()) || raw;
}

function uniqueTokens(values) {
  return [...new Set(values.map(normalizeToken).filter(Boolean))];
}
