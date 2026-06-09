import { defaultTransition } from './timing.js';
import type {
  FilterSpec,
  FocusSpec,
  GranularitySpec,
  GuideSpec,
  NarrativeObjectSpec,
  NarrativeSceneState,
  NarrativeSpec,
  NarrativeStateSpec,
  ResolvedNarrativeState,
  ScrollSpec,
  SemanticKey,
  TransformSpec,
  TransitionSpec,
  ViewSpec
} from './types/index.js';

export const NARRATIVE_KEY = 'narrative';

const INTERNAL_STATE_FIELDS = ['focus', 'granularity', 'guide', 'sceneState'] as const;

export function getNarrative(spec: ViewSpec | Record<string, unknown>): NarrativeSpec {
  return mergeNarrative((spec as Record<string, unknown>)[NARRATIVE_KEY] ?? {});
}

export function withNarrative<T extends ViewSpec>(spec: T, extension: Partial<NarrativeSpec>): T {
  return {
    ...spec,
    [NARRATIVE_KEY]: mergeNarrative(getNarrative(spec), extension)
  };
}

export function externalizeScrollyViewSpec(spec: ViewSpec): ViewSpec {
  if (!spec) return spec;
  const next = clonePlain(spec) as ViewSpec & Record<string, unknown>;
  const narrative = getNarrative(next);
  delete (next as Record<string, unknown>)[NARRATIVE_KEY];

  if (next.key !== undefined) {
    narrative.object = { ...(narrative.object ?? {}), key: next.key as NarrativeObjectSpec['key'] };
    delete next.key;
  }

  if (next.semanticKey !== undefined) {
    narrative.object = {
      ...(narrative.object ?? {}),
      semantic: semanticToNarrative(next.semanticKey as SemanticKey)
    };
    delete next.semanticKey;
  }

  if (next.transition !== undefined) {
    narrative.transition = { ...(narrative.transition ?? {}), ...clonePlain(next.transition) } as TransitionSpec;
    delete next.transition;
  }

  if (next.scroll !== undefined) {
    narrative.action = { ...(narrative.action ?? {}), scroll: clonePlain(next.scroll) as ScrollSpec };
    delete next.scroll;
  }

  if (next.unit !== undefined) {
    narrative.unit = clonePlain(next.unit) as Record<string, unknown>;
    delete next.unit;
  }

  const state: NarrativeStateSpec = { ...(narrative.state ?? {}) };
  for (const field of INTERNAL_STATE_FIELDS) {
    if ((next as Record<string, unknown>)[field] !== undefined) {
      (state as Record<string, unknown>)[field] = (next as Record<string, unknown>)[field];
      delete (next as Record<string, unknown>)[field];
    }
  }

  const sceneState: NarrativeSceneState = { ...(state.sceneState ?? {}) };
  delete (next as Record<string, unknown>).barLayout;
  delete (next as Record<string, unknown>).segmentField;
  delete (next as Record<string, unknown>).segmentDomain;
  delete (next as Record<string, unknown>).aggregate;

  if (Object.keys(sceneState).length) state.sceneState = sceneState;
  if (Object.keys(state).length) narrative.state = state;

  const narrativeTransforms = narrative.transform;
  if (narrativeTransforms?.length) {
    next.transform = dedupeArray([...(next.transform ?? []), ...narrativeTransforms]) as TransformSpec[];
    delete narrative.transform;
  }

  pruneDefaultNarrative(narrative);

  if (typeof next.data === 'string') {
    next.data = { name: next.data };
  }

  if (Object.keys(narrative).length) {
    (next as Record<string, unknown>)[NARRATIVE_KEY] = narrative;
  }

  return next;
}

export function normalizeScrollyViewSpec(spec: ViewSpec): ViewSpec & Record<string, unknown> {
  const narrative = getNarrative(spec);
  const state: NarrativeStateSpec = narrative.state ?? {};
  const object: NarrativeObjectSpec = narrative.object ?? {};
  const transforms: TransformSpec[] = [
    ...(spec.transform ?? []),
    ...(narrative.transform ?? [])
  ];
  const { narrative: _narrative, ...baseSpec } = spec as ViewSpec & { narrative?: NarrativeSpec };

  return {
    ...baseSpec,
    key: object.key ?? (spec.encoding?.key?.field ?? null) as string | null,
    semanticKey: semanticFromNarrative(object.semantic) ?? null,
    transition: (narrative.transition ?? {}) as TransitionSpec,
    scroll: narrative.action?.scroll,
    unit: narrative.unit ?? null,
    focus: state.focus ?? null,
    guide: state.guide ?? null,
    granularity: state.granularity ?? null,
    sceneState: state.sceneState ?? {},
    ...(transforms.length ? { transform: dedupeArray(transforms) as TransformSpec[] } : {})
  };
}

export function narrativeObjectKey(spec: ViewSpec): string | string[] | null {
  const narrative = getNarrative(spec);
  return narrative.object?.key ?? (spec.encoding?.key?.field as string | undefined) ?? null;
}

export function narrativeSemanticKey(spec: ViewSpec): SemanticKey | null {
  const narrative = getNarrative(spec);
  return semanticFromNarrative(narrative.object?.semantic) ?? null;
}

export function narrativeTransition(spec: ViewSpec): TransitionSpec {
  const narrative = getNarrative(spec);
  return narrative.transition ?? {};
}

export function narrativeScroll(spec: ViewSpec): ScrollSpec | null {
  const narrative = getNarrative(spec);
  return narrative.action?.scroll ?? null;
}

export function narrativeUnit(spec: ViewSpec): Record<string, unknown> | null {
  const narrative = getNarrative(spec);
  return narrative.unit ?? null;
}

export function narrativeState(spec: ViewSpec): ResolvedNarrativeState {
  const narrative = getNarrative(spec);
  const state: NarrativeStateSpec = narrative.state ?? {};
  return {
    focus: state.focus ?? null,
    guide: state.guide ?? null,
    granularity: state.granularity ?? null,
    sceneState: state.sceneState ?? {}
  };
}

export function dataName(dataSpec: unknown): string | null {
  if (typeof dataSpec === 'string') return dataSpec;
  return (dataSpec as { name?: string })?.name ?? null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mergeNarrative(...items: Array<Partial<NarrativeSpec>>): NarrativeSpec {
  return items.reduce<NarrativeSpec>(
    (merged, item) => mergePlain(merged, item ?? {}) as NarrativeSpec,
    {} as NarrativeSpec
  );
}

function mergePlain<T extends Record<string, unknown>>(
  base: T,
  next: Partial<T>
): T {
  const merged = { ...clonePlain(base) } as T;
  for (const [key, value] of Object.entries(next ?? {})) {
    if (isPlainObject(value) && isPlainObject((merged as Record<string, unknown>)[key])) {
      (merged as Record<string, unknown>)[key] = mergePlain(
        (merged as Record<string, unknown>)[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      (merged as Record<string, unknown>)[key] = clonePlain(value);
    }
  }
  return merged;
}

function semanticToNarrative(semanticKey: SemanticKey = {}): Record<string, unknown> {
  return {
    ...(semanticKey.entity !== undefined ? { entity: semanticPartToNarrative(semanticKey.entity) } : {}),
    ...(semanticKey.entities !== undefined ? { entity: semanticPartToNarrative(semanticKey.entities) } : {}),
    ...(semanticKey.measure !== undefined ? { measure: semanticPartToNarrative(semanticKey.measure) } : {}),
    ...(semanticKey.measures !== undefined ? { measure: semanticPartToNarrative(semanticKey.measures) } : {})
  };
}

function semanticFromNarrative(semantic: Record<string, unknown> | null | undefined): SemanticKey | null {
  if (!semantic) return null;
  return {
    ...(semantic.entity !== undefined ? { entity: semanticPartFromNarrative(semantic.entity) as SemanticKey['entity'] } : {}),
    ...(semantic.measure !== undefined ? { measure: semanticPartFromNarrative(semantic.measure) as SemanticKey['measure'] } : {})
  };
}

function semanticPartToNarrative(part: unknown): unknown {
  if (Array.isArray(part)) return part.map(semanticPartToNarrative);
  if (typeof part === 'string') return { field: part };
  return clonePlain(part);
}

function semanticPartFromNarrative(part: unknown): unknown {
  if (Array.isArray(part)) return part.map(semanticPartFromNarrative);
  const p = part as Record<string, unknown> | null;
  if (p?.field) return p.field;
  if (p?.value) return { value: p.value };
  return clonePlain(part);
}

function pruneDefaultNarrative(narrative: NarrativeSpec): void {
  if (narrative.transition !== undefined) {
    const pruned = diffFromDefaultTransition(narrative.transition);
    if (!Object.keys(pruned).length) {
      delete narrative.transition;
    } else {
      narrative.transition = pruned;
    }
  }
}

function diffFromDefaultTransition(transition: TransitionSpec): Partial<TransitionSpec> {
  const defaults = defaultTransition();
  const diff: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(transition ?? {})) {
    if (
      key === 'stagger' &&
      isPlainObject(value) &&
      isPlainObject(defaults.stagger)
    ) {
      const staggerDiff = diffPlain(
        value as Record<string, unknown>,
        defaults.stagger as Record<string, unknown>
      );
      if (Object.keys(staggerDiff).length) diff.stagger = staggerDiff;
    } else if (!sameValue(value, (defaults as Record<string, unknown>)[key])) {
      diff[key] = clonePlain(value);
    }
  }
  return diff as Partial<TransitionSpec>;
}

function diffPlain(
  value: Record<string, unknown>,
  defaults: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value ?? {})) {
    if (!sameValue(child, defaults[key])) result[key] = clonePlain(child);
  }
  return result;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function clonePlain<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function dedupeArray<T>(values: T[]): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = JSON.stringify(value ?? null);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
