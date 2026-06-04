export const SCENE_TRANSITIONS = ["focus", "guide", "granularity", "observation"];

const ALIASES = new Map(
  Object.entries({
    observe: "observation",
    observations: "observation",
    focused: "focus",
    guiding: "guide",
    granular: "granularity"
  })
);

export function resolveSceneTransition(viewSpec = {}, designSpace = {}) {
  const scene = uniqueTokens([
    ...(designSpace.transition?.scene || []),
    ...asArray(viewSpec.scene),
    ...asArray(viewSpec.transition?.scene)
  ]).filter((token) => SCENE_TRANSITIONS.includes(token));

  return {
    scene,
    focus: viewSpec.focus || null,
    guide: viewSpec.guide || null,
    granularity: viewSpec.granularity || null,
    observation: viewSpec.observation || null
  };
}

export function withSceneTransitionDefaults(viewSpec, sceneTransition) {
  const transition = { ...(viewSpec.transition || {}) };

  if ((hasScene(sceneTransition, "observation") || hasScene(sceneTransition, "granularity")) && transition.stagger == null) {
    transition.stagger = { step: 24, max: 480 };
  }

  return {
    ...viewSpec,
    transition,
    sceneTransition
  };
}

export function compileSceneViewSpec(viewSpec, sceneTransition) {
  const mark = String(viewSpec.mark || "").toLowerCase();
  if (mark !== "bar") return viewSpec;

  let compiled = withDefaultBarSemanticKey(cloneViewSpec(viewSpec));

  if (hasScene(sceneTransition, "focus")) {
    compiled = applyBarFocus(compiled, sceneTransition.focus);
  }

  if (hasScene(sceneTransition, "guide")) {
    compiled = applyBarGuide(compiled, sceneTransition.guide);
  }

  if (hasScene(sceneTransition, "granularity")) {
    compiled = applyBarGranularity(compiled, sceneTransition.granularity);
  }

  if (hasScene(sceneTransition, "observation")) {
    compiled = applyBarObservation(compiled, sceneTransition.observation);
  }

  return compiled;
}

export function hasScene(sceneTransition, type) {
  return sceneTransition?.scene?.includes(type);
}

function applyBarFocus(spec, focusSpec = {}) {
  const filter = focusSpec.filter || selectorToFilter(focusSpec);
  if (!filter) return spec;

  return {
    ...spec,
    transform: [{ filter }, ...(spec.transform || [])],
    sceneState: {
      ...(spec.sceneState || {}),
      focus: { filter }
    }
  };
}

function applyBarGuide(spec, guideSpec = {}) {
  const encoding = cloneEncoding(spec.encoding);
  const category = channelFromField(
    guideSpec.category || encoding.x?.field || encoding.y?.field,
    guideSpec.categoryTitle || encoding.x?.title || encoding.y?.title,
    "nominal"
  );
  const measure = channelFromField(
    guideSpec.measure || encoding.y?.field || encoding.x?.field,
    guideSpec.measureTitle || encoding.y?.title || encoding.x?.title,
    "quantitative"
  );
  const orientation = guideSpec.orientation || "horizontal";

  if (orientation === "horizontal") {
    encoding.x = { ...measure, ...(guideSpec.scale ? { domain: guideSpec.scale.domain } : {}) };
    encoding.y = category;
  } else {
    encoding.x = category;
    encoding.y = { ...measure, ...(guideSpec.scale ? { domain: guideSpec.scale.domain } : {}) };
  }

  return {
    ...spec,
    key: guideSpec.key || spec.key || category.field,
    margin: {
      ...(orientation === "horizontal" ? { left: 86, right: 42 } : {}),
      ...(spec.margin || {})
    },
    encoding,
    sceneState: {
      ...(spec.sceneState || {}),
      guide: {
        orientation,
        scale: guideSpec.scale || null,
        staging: resolveGuideStaging(guideSpec, orientation)
      }
    }
  };
}

function applyBarGranularity(spec, granularitySpec = {}) {
  const categoryField = granularitySpec.category || spec.encoding?.x?.field || "category";
  const segmentField = granularitySpec.segment || granularitySpec.segmentAs || "segment";
  const valueField = granularitySpec.value || granularitySpec.valueAs || spec.encoding?.y?.field || "value";
  const sourceField = granularitySpec.source || granularitySpec.sourceAs || "__measure";
  const fields = granularitySpec.fields || [];
  const labels = granularitySpec.labels || {};
  const groupby = granularitySpec.groupby || [categoryField, sourceField, segmentField];
  const transform = [...(spec.transform || [])];

  if (fields.length) {
    transform.push({
      fold: {
        fields,
        as: [segmentField, valueField],
        sourceAs: sourceField,
        labels
      }
    });
  }

  if (granularitySpec.aggregate !== false) {
    transform.push({
      aggregate: {
        groupby,
        fields: [{ op: granularitySpec.op || "sum", field: valueField, as: valueField }]
      }
    });
  }

  return {
    ...spec,
    key: granularitySpec.key || [categoryField, segmentField],
    semanticKey:
      granularitySpec.semanticKey ||
      semanticKeyFromParts(
        { field: categoryField },
        { field: sourceField }
      ),
    barLayout: granularitySpec.layout || "stacked",
    transform,
    encoding: {
      ...cloneEncoding(spec.encoding),
      x: channelFromField(categoryField, granularitySpec.categoryTitle || spec.encoding?.x?.title, "nominal"),
      y: channelFromField(valueField, granularitySpec.valueTitle || spec.encoding?.y?.title, "quantitative"),
      color: {
        field: segmentField,
        type: "nominal",
        domain: granularitySpec.domain || fields.map((field) => labels[field] || field),
        range: granularitySpec.range || ["#b05d3b", "#536a9e"]
      }
    },
    sceneState: {
      ...(spec.sceneState || {}),
      granularity: {
        layout: granularitySpec.layout || "stacked",
        fields,
        segmentField,
        valueField
      }
    }
  };
}

function applyBarObservation(spec, observationSpec = {}) {
  const encoding = cloneEncoding(spec.encoding);
  const orientation =
    encoding.x?.type === "quantitative" && ["nominal", "ordinal"].includes(encoding.y?.type)
      ? "horizontal"
      : "vertical";
  const currentMeasure = orientation === "horizontal" ? encoding.x : encoding.y;
  const measure = channelFromField(
    observationSpec.measure || observationSpec.field || currentMeasure?.field,
    observationSpec.title || currentMeasure?.title,
    "quantitative"
  );

  if (observationSpec.domain) measure.domain = observationSpec.domain;

  if (orientation === "horizontal") encoding.x = measure;
  else encoding.y = measure;

  return {
    ...spec,
    semanticKey:
      observationSpec.semanticKey ||
      semanticKeyFromEncoding(encoding, spec.semanticKey),
    encoding,
    sceneState: {
      ...(spec.sceneState || {}),
      observation: { measure: measure.field }
    }
  };
}

function withDefaultBarSemanticKey(spec) {
  if (spec.semanticKey) return spec;
  const semanticKey = semanticKeyFromEncoding(spec.encoding || {});
  return semanticKey ? { ...spec, semanticKey } : spec;
}

function semanticKeyFromEncoding(encoding = {}, previousSemanticKey = null) {
  const category = categoryChannel(encoding);
  const measure = measureChannel(encoding);
  if (!category?.field || !measure?.field) return previousSemanticKey;

  return semanticKeyFromParts(
    previousSemanticKey?.entity || previousSemanticKey?.entities || { field: category.field },
    { value: measure.field }
  );
}

function semanticKeyFromParts(entity, measure) {
  return {
    entity,
    measure
  };
}

function categoryChannel(encoding = {}) {
  if (["nominal", "ordinal"].includes(encoding.x?.type)) return encoding.x;
  if (["nominal", "ordinal"].includes(encoding.y?.type)) return encoding.y;
  return encoding.x?.field ? encoding.x : encoding.y;
}

function measureChannel(encoding = {}) {
  if (encoding.y?.type === "quantitative") return encoding.y;
  if (encoding.x?.type === "quantitative") return encoding.x;
  return encoding.y?.field ? encoding.y : encoding.x;
}

function selectorToFilter(selector = {}) {
  if (!selector.field) return null;
  return {
    field: selector.field,
    ...copyDefined(selector, ["equal", "notEqual", "oneOf", "gte", "gt", "lte", "lt"])
  };
}

function resolveGuideStaging(guideSpec = {}, orientation) {
  if (guideSpec.staging === false) return null;

  const staging = guideSpec.staging && typeof guideSpec.staging === "object"
    ? guideSpec.staging
    : {};

  return {
    order:
      staging.order ||
      guideSpec.stageOrder ||
      (orientation === "horizontal" ? ["y", "x"] : ["x", "y"]),
    duration: staging.duration || guideSpec.stageDuration,
    stagger: staging.stagger || guideSpec.stagger
  };
}

function channelFromField(fieldOrChannel, title, fallbackType) {
  if (fieldOrChannel && typeof fieldOrChannel === "object") return { ...fieldOrChannel };
  return {
    field: fieldOrChannel,
    type: fallbackType,
    ...(title ? { title } : {})
  };
}

function cloneViewSpec(viewSpec) {
  return {
    ...viewSpec,
    transform: [...(viewSpec.transform || [])],
    encoding: cloneEncoding(viewSpec.encoding)
  };
}

function cloneEncoding(encoding = {}) {
  return Object.fromEntries(
    Object.entries(encoding).map(([channel, channelSpec]) => [
      channel,
      Array.isArray(channelSpec) ? channelSpec.map((item) => ({ ...item })) : { ...channelSpec }
    ])
  );
}

function copyDefined(source, keys) {
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
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
