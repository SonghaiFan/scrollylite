import { DEFAULT_TIMING } from "../timing.js";
import {
  externalizeScrollyViewSpec,
  narrativeState,
  narrativeTransition,
  narrativeUnit,
  withNarrative
} from "../scrolly-meta.js?v=semantic-key-10";
import { createBarSceneCompiler } from "../charts/bar/compile.js?v=semantic-key-1";
import { createLineSceneCompiler } from "../charts/line/compile.js?v=semantic-key-1";
import { createPointSceneCompiler } from "../charts/point/compile.js?v=semantic-key-1";
import { createUnitSceneCompiler } from "../charts/unit/compile.js?v=semantic-key-1";
import {
  applyFilterFocus,
  cloneViewSpec
} from "../charts/compiler-utils.js?v=semantic-key-1";

export const SCENE_TRANSITIONS = ["focus", "guide", "granularity", "observation"];
const STATE_APPLICATION_ORDER = ["focus", "observation", "granularity", "guide"];

const ALIASES = new Map(
  Object.entries({
    observe: "observation",
    observations: "observation",
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
    granularity: scene.includes("granularity") ? state.granularity || null : null,
    observation: scene.includes("observation") ? state.observation || null : null
  };
}

export function withSceneTransitionDefaults(viewSpec, sceneTransition) {
  const transition = { ...narrativeTransition(viewSpec) };

  if ((hasScene(sceneTransition, "observation") || hasScene(sceneTransition, "granularity")) && transition.stagger == null) {
    transition.stagger = { ...DEFAULT_TIMING.scene.stagger };
  }

  return withNarrative(viewSpec, { transition });
}

export function compileSceneViewSpec(viewSpec, sceneTransition) {
  const compiler = MARK_TRANSITION_COMPILERS[transitionRendererKey(viewSpec)];
  if (!compiler) return viewSpec;

  const compiled = stateApplicationOrder(viewSpec, sceneTransition, compiler).reduce((compiledSpec, sceneType) => {
    const handler = compiler.scenes[sceneType];
    const state = narrativeState(viewSpec);
    return handler ? handler(compiledSpec, state[sceneType] || sceneTransition[sceneType] || {}) : compiledSpec;
  }, compiler.base(cloneViewSpec(viewSpec)));
  return externalizeScrollyViewSpec(pruneCompiledViewSpec(compiled));
}

export function hasScene(sceneTransition, type) {
  return sceneTransition?.scene?.includes(type);
}

function supportedSceneTypes(mark) {
  const compiler = MARK_TRANSITION_COMPILERS[mark];
  return compiler ? Object.keys(compiler.scenes) : SCENE_TRANSITIONS;
}

function transitionRendererKey(viewSpec = {}) {
  const mark = String(viewSpec.mark || "").toLowerCase();
  if (narrativeUnit(viewSpec)) return "unit";
  if (mark === "point" || mark === "circle" || mark === "square") return "point";
  return mark;
}

function stateApplicationOrder(viewSpec, sceneTransition, compiler) {
  const supported = Object.keys(compiler.scenes);
  const state = narrativeState(viewSpec);
  return STATE_APPLICATION_ORDER.filter((type) =>
    supported.includes(type) &&
    (state[type] != null || sceneTransition[type] != null)
  );
}

const MARK_TRANSITION_COMPILERS = {
  bar: createBarSceneCompiler({ applyFilterFocus }),
  point: createPointSceneCompiler(),
  line: createLineSceneCompiler(),
  unit: createUnitSceneCompiler()
};

function pruneCompiledViewSpec(spec = {}) {
  const next = { ...spec };
  if (Array.isArray(next.transform) && !next.transform.length) delete next.transform;
  if (next.encoding && !Object.keys(next.encoding).length) delete next.encoding;
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
