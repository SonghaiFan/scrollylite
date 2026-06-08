import { defaultTransition } from "./timing.js";

export const NARRATIVE_KEY = "narrative";
export const LEGACY_SCROLLY_META_KEY = "scrollyLite";

const INTERNAL_STATE_FIELDS = [
  "focus",
  "granularity",
  "guide",
  "observation",
  "sceneState"
];

export function getNarrative(spec = {}) {
  return mergeNarrative(
    legacyNarrative(spec.usermeta?.[LEGACY_SCROLLY_META_KEY] || {}),
    spec.usermeta?.[NARRATIVE_KEY] || {},
    spec[NARRATIVE_KEY] || {}
  );
}

export function withNarrative(spec = {}, extension = {}) {
  return {
    ...spec,
    [NARRATIVE_KEY]: mergeNarrative(getNarrative(spec), extension)
  };
}

export function externalizeScrollyViewSpec(spec = {}) {
  if (!spec) return spec;
  const next = clonePlain(spec);
  const narrative = getNarrative(next);
  delete next[NARRATIVE_KEY];

  if (next.key !== undefined) {
    narrative.object = {
      ...(narrative.object || {}),
      key: next.key
    };
    delete next.key;
  }

  if (next.semanticKey !== undefined) {
    narrative.object = {
      ...(narrative.object || {}),
      semantic: semanticToNarrative(next.semanticKey)
    };
    delete next.semanticKey;
  }

  if (next.transition !== undefined) {
    narrative.transition = {
      ...(narrative.transition || {}),
      ...clonePlain(next.transition)
    };
    delete next.transition;
  }

  if (next.scroll !== undefined) {
    narrative.action = {
      ...(narrative.action || {}),
      scroll: clonePlain(next.scroll)
    };
    delete next.scroll;
  }

  if (next.unit !== undefined) {
    narrative.unit = clonePlain(next.unit);
    delete next.unit;
  }

  const state = { ...(narrative.state || {}) };
  for (const field of INTERNAL_STATE_FIELDS) {
    if (next[field] !== undefined) {
      state[field] = next[field];
      delete next[field];
    }
  }

  const sceneState = { ...(state.sceneState || {}) };
  delete next.barLayout;
  delete next.segmentField;
  delete next.segmentDomain;
  if (Object.keys(sceneState).length) state.sceneState = sceneState;
  delete next.aggregate;

  if (Object.keys(state).length) narrative.state = state;

  if (narrative.transform?.length) {
    next.transform = dedupeArray([
      ...(next.transform || []),
      ...narrative.transform
    ]);
    delete narrative.transform;
  }

  pruneDefaultNarrative(narrative);

  if (typeof next.data === "string") {
    next.data = { name: next.data };
  }

  if (Object.keys(narrative).length) {
    next[NARRATIVE_KEY] = narrative;
  }

  return next;
}

export function normalizeScrollyViewSpec(spec = {}) {
  const narrative = getNarrative(spec);
  const state = narrative.state || {};
  const object = narrative.object || {};
  const transform = [
    ...(spec.transform || []),
    ...(narrative.transform || [])
  ];
  const {
    narrative: _narrative,
    usermeta: _usermeta,
    ...baseSpec
  } = spec;

  return {
    ...baseSpec,
    key: object.key ?? narrative.key ?? spec.key,
    semanticKey:
      semanticFromNarrative(object.semantic) ||
      narrative.semanticKey ||
      spec.semanticKey,
    transition: narrative.transition || spec.transition,
    scroll: narrative.action?.scroll ?? narrative.scroll ?? spec.scroll,
    unit: narrative.unit || spec.unit,
    focus: state.focus || narrative.focus || spec.focus,
    guide: state.guide || narrative.guide || spec.guide,
    granularity: state.granularity || narrative.granularity || spec.granularity,
    observation: state.observation || narrative.observation || spec.observation,
    sceneState: state.sceneState || narrative.sceneState || spec.sceneState,
    ...(transform.length ? { transform: dedupeArray(transform) } : {})
  };
}

export function narrativeObjectKey(spec = {}) {
  const narrative = getNarrative(spec);
  return narrative.object?.key ?? narrative.key ?? spec.key ?? spec.encoding?.key?.field ?? null;
}

export function narrativeSemanticKey(spec = {}) {
  const narrative = getNarrative(spec);
  return (
    semanticFromNarrative(narrative.object?.semantic) ||
    narrative.semanticKey ||
    spec.semanticKey ||
    null
  );
}

export function narrativeTransition(spec = {}) {
  const narrative = getNarrative(spec);
  return narrative.transition || spec.transition || {};
}

export function narrativeScroll(spec = {}) {
  const narrative = getNarrative(spec);
  return narrative.action?.scroll ?? narrative.scroll ?? spec.scroll ?? null;
}

export function narrativeUnit(spec = {}) {
  const narrative = getNarrative(spec);
  return narrative.unit || spec.unit || null;
}

export function narrativeState(spec = {}) {
  const narrative = getNarrative(spec);
  const state = narrative.state || {};
  return {
    focus: state.focus || narrative.focus || spec.focus || null,
    guide: state.guide || narrative.guide || spec.guide || null,
    granularity: state.granularity || narrative.granularity || spec.granularity || null,
    observation: state.observation || narrative.observation || spec.observation || null,
    sceneState: state.sceneState || narrative.sceneState || spec.sceneState || {}
  };
}

export function getScrollyMeta(spec = {}) {
  return getNarrative(spec);
}

export function withScrollyMeta(spec = {}, extension = {}) {
  return withNarrative(spec, legacyNarrative(extension));
}

export function dataName(dataSpec) {
  if (typeof dataSpec === "string") return dataSpec;
  return dataSpec?.name || null;
}

function legacyNarrative(extension = {}) {
  const narrative = { ...clonePlain(extension) };
  if (extension.key !== undefined || extension.semanticKey !== undefined) {
    narrative.object = {
      ...(narrative.object || {}),
      ...(extension.key !== undefined ? { key: extension.key } : {}),
      ...(extension.semanticKey !== undefined
        ? { semantic: semanticToNarrative(extension.semanticKey) }
        : {})
    };
    delete narrative.key;
    delete narrative.semanticKey;
  }
  if (extension.scroll !== undefined) {
    narrative.action = {
      ...(narrative.action || {}),
      scroll: extension.scroll
    };
    delete narrative.scroll;
  }
  return narrative;
}

function mergeNarrative(...items) {
  return items.reduce((merged, item) => mergePlain(merged, item || {}), {});
}

function mergePlain(base, next) {
  const merged = { ...clonePlain(base) };
  for (const [key, value] of Object.entries(next || {})) {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergePlain(merged[key], value);
    } else {
      merged[key] = clonePlain(value);
    }
  }
  return merged;
}

function semanticToNarrative(semanticKey = {}) {
  return {
    ...(semanticKey.entity !== undefined
      ? { entity: semanticPartToNarrative(semanticKey.entity) }
      : {}),
    ...(semanticKey.entities !== undefined
      ? { entity: semanticPartToNarrative(semanticKey.entities) }
      : {}),
    ...(semanticKey.measure !== undefined
      ? { measure: semanticPartToNarrative(semanticKey.measure) }
      : {}),
    ...(semanticKey.measures !== undefined
      ? { measure: semanticPartToNarrative(semanticKey.measures) }
      : {})
  };
}

function semanticFromNarrative(semantic = null) {
  if (!semantic) return null;
  return {
    ...(semantic.entity !== undefined ? { entity: semanticPartFromNarrative(semantic.entity) } : {}),
    ...(semantic.measure !== undefined ? { measure: semanticPartFromNarrative(semantic.measure) } : {})
  };
}

function semanticPartToNarrative(part) {
  if (Array.isArray(part)) return part.map(semanticPartToNarrative);
  if (typeof part === "string") return { field: part };
  return clonePlain(part);
}

function semanticPartFromNarrative(part) {
  if (Array.isArray(part)) return part.map(semanticPartFromNarrative);
  if (part?.field) return part.field;
  if (part?.value) return { value: part.value };
  return clonePlain(part);
}

function pruneDefaultNarrative(narrative = {}) {
  if (narrative.transition !== undefined) {
    narrative.transition = diffFromDefaultTransition(narrative.transition);
    if (!Object.keys(narrative.transition).length) delete narrative.transition;
  }
}

function diffFromDefaultTransition(transition = {}) {
  const defaults = defaultTransition();
  const diff = {};
  for (const [key, value] of Object.entries(transition || {})) {
    if (key === "stagger" && isPlainObject(value) && isPlainObject(defaults.stagger)) {
      const staggerDiff = diffPlain(value, defaults.stagger);
      if (Object.keys(staggerDiff).length) diff.stagger = staggerDiff;
    } else if (!sameValue(value, defaults[key])) {
      diff[key] = clonePlain(value);
    }
  }
  return diff;
}

function diffPlain(value = {}, defaults = {}) {
  const diff = {};
  for (const [key, child] of Object.entries(value || {})) {
    if (!sameValue(child, defaults[key])) diff[key] = clonePlain(child);
  }
  return diff;
}

function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function clonePlain(value) {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value));
}

function dedupeArray(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    const key = JSON.stringify(value ?? null);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
