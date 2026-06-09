import type { FocusSpec, GranularitySpec, GuideSpec, TransitionSpec, ViewSpec } from '../types/index.js';
import { DEFAULT_TIMING } from '../timing.js';
import {
  externalizeScrollyViewSpec,
  narrativeState,
  narrativeTransition,
  withNarrative
} from '../scrolly-meta.js';
import { chartModules } from '../charts/manifest.js';
import { cloneViewSpec } from '../charts/compiler-utils.js';
import { createSpecCompilerRegistry, resolveMarkRendererKey } from '../charts/index.js';
import type { SpecCompilerEntry } from '../charts/index.js';

export const SCENE_TRANSITIONS = ['focus', 'guide', 'granularity', 'observation'] as const;
export type SceneTransitionType = typeof SCENE_TRANSITIONS[number];

const STATE_APPLICATION_ORDER = ['focus', 'granularity', 'guide'] as const;

const DEFAULT_STATE_OPERATION: Record<string, string> = {
  focus: 'filter',
  guide: 'coordinate',
  granularity: 'aggregate'
};

interface SceneTransition {
  scene: string[];
  focus?: FocusSpec | null;
  guide?: GuideSpec | null;
  granularity?: GranularitySpec | null;
}

interface StepTransition {
  scene?: string[];
}

const MARK_SPEC_COMPILERS = createSpecCompilerRegistry(chartModules);

export function resolveSceneTransition(viewSpec: ViewSpec = {}, stepTransition: StepTransition = {}): SceneTransition {
  const rendererKey = resolveMarkRendererKey(viewSpec);
  const supportedScenes = supportedSceneTypes(rendererKey);
  const state = narrativeState(viewSpec);
  const scene = uniqueTokens([...(stepTransition.scene || [])]).filter(
    (token) => SCENE_TRANSITIONS.includes(token as SceneTransitionType) && supportedScenes.includes(token)
  );

  return {
    scene,
    focus: scene.includes('focus') ? (state.focus || null) : null,
    guide: scene.includes('guide') ? (state.guide || null) : null,
    granularity: scene.includes('granularity') ? (state.granularity || null) : null
  };
}

export function withSceneTransitionDefaults(viewSpec: ViewSpec, sceneTransition: SceneTransition): ViewSpec {
  const transition: TransitionSpec = { ...narrativeTransition(viewSpec) };

  if ((hasScene(sceneTransition, 'observation') || hasScene(sceneTransition, 'granularity')) && transition.stagger == null) {
    transition.stagger = { ...DEFAULT_TIMING.scene.stagger };
  }

  return withNarrative(viewSpec, { transition });
}

export function compileViewSpec(viewSpec: ViewSpec, sceneTransition: SceneTransition): ViewSpec {
  const rendererKey = resolveMarkRendererKey(viewSpec);
  const compilerEntry = MARK_SPEC_COMPILERS[rendererKey] as SpecCompilerEntry | undefined;
  if (!compilerEntry?.compiler) return viewSpec;

  const context = { rendererKey };
  const compiled = stateOperationOrder(viewSpec, sceneTransition, compilerEntry).reduce(
    (compiledSpec, entry) => {
      const handler = compilerEntry.compiler.operations[entry.operation];
      return handler ? handler(compiledSpec, entry.operationSpec, context) : compiledSpec;
    },
    compilerEntry.compiler.base(cloneViewSpec(viewSpec), context)
  );

  return externalizeScrollyViewSpec(pruneCompiledViewSpec(pruneConsumedSceneState(compiled)));
}

export function hasScene(sceneTransition: SceneTransition | null | undefined, type: string): boolean {
  return Boolean(sceneTransition?.scene?.includes(type));
}

function supportedSceneTypes(mark: string): string[] {
  const entry = MARK_SPEC_COMPILERS[mark] as SpecCompilerEntry | undefined;
  const scenes = entry?.scenes;
  return scenes?.length ? [...scenes] : [...SCENE_TRANSITIONS];
}

interface StateOperationEntry {
  stateKey: string;
  operation: string;
  operationSpec: unknown;
}

function stateOperationOrder(
  viewSpec: ViewSpec,
  sceneTransition: SceneTransition,
  compilerEntry: SpecCompilerEntry
): StateOperationEntry[] {
  const supported = Object.keys(compilerEntry.compiler.operations);
  const state = narrativeState(viewSpec);
  const stateOperations: Record<string, string> = {
    ...DEFAULT_STATE_OPERATION,
    ...(compilerEntry.stateOperations || {})
  };
  const stateRecord = state as unknown as Record<string, unknown>;
  const sceneRecord = sceneTransition as unknown as Record<string, unknown>;

  return STATE_APPLICATION_ORDER
    .map((stateKey) => {
      const operationSpec = stateRecord[stateKey] || sceneRecord[stateKey] || null;
      const operation = operationForState(stateKey, operationSpec as Record<string, unknown> | null, stateOperations);
      return { stateKey, operation, operationSpec };
    })
    .filter((entry) => entry.operationSpec != null && supported.includes(entry.operation));
}

function operationForState(
  stateKey: string,
  operationSpec: Record<string, unknown> | null,
  stateOperations: Record<string, string>
): string {
  if (stateKey === 'focus' && operationSpec?.['mode'] === 'highlight') return 'highlight';
  return stateOperations[stateKey] || DEFAULT_STATE_OPERATION[stateKey];
}

function pruneCompiledViewSpec(spec: ViewSpec): ViewSpec {
  const next = { ...spec } as ViewSpec & Record<string, unknown>;
  if (Array.isArray(next['transform']) && !(next['transform'] as unknown[]).length) delete next['transform'];
  if (next['encoding'] && !Object.keys(next['encoding'] as object).length) delete next['encoding'];
  return next;
}

function pruneConsumedSceneState(spec: ViewSpec): ViewSpec {
  const next = cloneViewSpec(spec) as ViewSpec & { narrative?: Record<string, unknown> };
  const state = next.narrative?.['state'] as Record<string, unknown> | undefined;
  if (!state) return next;

  delete state['focus'];
  delete state['guide'];
  delete state['granularity'];
  if (!Object.keys(state).length) delete next.narrative?.['state'];
  return next;
}

function normalizeToken(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function uniqueTokens(values: unknown[]): string[] {
  return [...new Set(values.map(normalizeToken).filter(Boolean))];
}
