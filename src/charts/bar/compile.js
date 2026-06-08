import {
  narrativeObjectKey,
  narrativeSemanticKey,
  narrativeState,
  withNarrative
} from "../../scrolly-meta.js?v=semantic-key-10";
import {
  barOffsetChannelName,
  barOrientationFromEncoding
} from "./layout/index.js";
import { barSegmentField } from "./semantic.js?v=semantic-key-1";

export function createBarSceneCompiler({ applyFilterFocus }) {
  return {
    base: withDefaultBarSemanticKey,
    scenes: {
      focus: applyFilterFocus,
      guide: applyBarGuide,
      granularity: applyBarGranularity,
      observation: applyBarObservation
    }
  };
}

function applyBarGuide(spec, guideSpec = {}) {
  let workingSpec = spec;
  const layout = guideSpec.layout || null;
  const flipsOrientation = Boolean(guideSpec.flip);
  if (guideSpec.layout) {
    const segmentField = barSegmentField(workingSpec);
    const state = narrativeState(workingSpec);
    const granularity = state.sceneState?.granularity || state.granularity || {};
    const orientation = flipsOrientation
      ? oppositeOrientation(barOrientationFromEncoding(workingSpec.encoding || {}))
      : barOrientationFromEncoding(workingSpec.encoding || {});
    workingSpec = withSceneState({
      ...workingSpec,
      encoding: encodingWithBarLayout(workingSpec.encoding, layout, segmentField, orientation)
    }, {
      guide: {
        layout,
        staging: resolveGuideStaging(guideSpec, orientation)
      },
      ...(segmentField
        ? {
            granularity: {
              ...granularity,
              layout
            }
          }
        : {})
    });

    if (!flipsOrientation && !guideSpec.scale) {
      return workingSpec;
    }
  }

  let encoding = cloneEncoding(workingSpec.encoding);
  const currentOrientation = barOrientationFromEncoding(encoding);
  const category = channelFromField(
    categoryChannel(encoding),
    categoryChannel(encoding)?.title,
    "nominal"
  );
  const measure = channelFromField(
    measureChannel(encoding),
    measureChannel(encoding)?.title,
    "quantitative"
  );
  const orientation = flipsOrientation ? oppositeOrientation(currentOrientation) : currentOrientation;

  if (orientation === "horizontal") {
    encoding.x = { ...measure, ...(guideSpec.scale ? { domain: guideSpec.scale.domain } : {}) };
    encoding.y = category;
  } else {
    encoding.x = category;
    encoding.y = { ...measure, ...(guideSpec.scale ? { domain: guideSpec.scale.domain } : {}) };
  }

  const state = narrativeState(workingSpec);
  const resolvedLayout =
    layout ||
    state.sceneState?.granularity?.layout ||
    state.granularity?.layout ||
    state.sceneState?.guide?.layout ||
    state.guide?.layout ||
    null;
  encoding = encodingWithBarLayout(encoding, resolvedLayout, barSegmentField(workingSpec), orientation);

  return withSceneState(withObject({
    ...workingSpec,
    margin: {
      ...(orientation === "horizontal" ? { left: 86, right: 42 } : {}),
      ...(workingSpec.margin || {})
    },
    encoding
  }, {
    key: guideSpec.key || narrativeObjectKey(workingSpec) || category.field
  }), {
    guide: {
      ...(resolvedLayout ? { layout: resolvedLayout } : {}),
      orientation,
      ...(flipsOrientation ? { flip: true } : {}),
      scale: guideSpec.scale || null,
      staging: resolveGuideStaging(guideSpec, orientation)
    }
  });
}

function applyBarGranularity(spec, granularitySpec = {}) {
  const categoryField = granularitySpec.category || spec.encoding?.x?.field || "category";
  const segmentField = granularitySpec.segment || granularitySpec.segmentAs || "segment";
  const valueField = granularitySpec.value || granularitySpec.valueAs || spec.encoding?.y?.field || "value";
  const sourceField = granularitySpec.source || granularitySpec.sourceAs || "__measure";
  const fields = granularitySpec.fields || [];
  const labels = granularitySpec.labels || {};
  const segmentDomain =
    granularitySpec.domain ||
    granularitySpec.color?.domain ||
    fields.map((field) => labels[field] || field);
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

  const layout = granularitySpec.layout || "stacked";
  const encoding = {
    ...cloneEncoding(spec.encoding),
    x: channelFromField(categoryField, granularitySpec.categoryTitle || spec.encoding?.x?.title, "nominal"),
    y: channelFromField(valueField, granularitySpec.valueTitle || spec.encoding?.y?.title, "quantitative"),
    color:
      granularitySpec.color || {
        field: segmentField,
        type: "nominal",
        ...(segmentDomain.length ? { domain: segmentDomain } : {}),
        range: granularitySpec.range || ["#b05d3b", "#536a9e"]
      }
  };
  if (layout === "grouped") {
    encoding.xOffset = {
      field: segmentField,
      type: "nominal"
    };
  } else {
    delete encoding.xOffset;
    delete encoding.yOffset;
  }

  return withSceneState(withObject({
    ...spec,
    transform,
    encoding
  }, {
    key: granularitySpec.key || [categoryField, segmentField],
    semantic:
      granularitySpec.semantic ||
      granularitySpec.semanticKey ||
      semanticKeyFromParts(
        { field: categoryField },
        { field: sourceField }
      )
  }), {
    granularity: {
      layout,
      fields,
      segmentField,
      sourceField,
      segments: segmentDomain.length ? segmentDomain : null,
      valueField
    }
  });
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

  const categoryKey = observationSpec.category
    ? semanticCategoryPart(observationSpec.category)
    : null;

  return withSceneState(withObject({
    ...spec,
    encoding
  }, {
    semantic:
      observationSpec.semantic ||
      observationSpec.semanticKey ||
      (categoryKey
        ? semanticKeyFromParts(
            narrativeSemanticKey(spec)?.entity || narrativeSemanticKey(spec)?.entities || categoryChannel(encoding),
            categoryKey
          )
        : semanticKeyFromEncoding(encoding, narrativeSemanticKey(spec)))
  }), {
    observation: {
      measure: measure.field,
      category: observationSpec.category || null
    }
  });
}

function withDefaultBarSemanticKey(spec) {
  if (narrativeSemanticKey(spec)) return spec;
  const semanticKey = semanticKeyFromEncoding(spec.encoding || {});
  return semanticKey ? withObject(spec, { semantic: semanticKey }) : spec;
}

function encodingWithBarLayout(encoding = {}, layout = "stacked", segmentField = null, orientation = barOrientationFromEncoding(encoding)) {
  const next = cloneEncoding(encoding);
  if (layout === "grouped" && segmentField) {
    delete next.xOffset;
    delete next.yOffset;
    next[barOffsetChannelName(orientation)] = {
      field: segmentField,
      type: "nominal"
    };
    return next;
  }

  delete next.xOffset;
  delete next.yOffset;
  return next;
}

function withObject(spec, objectSpec = {}) {
  const object = {};
  if (objectSpec.key != null) object.key = objectSpec.key;
  if (objectSpec.semantic != null) object.semantic = semanticToNarrative(objectSpec.semantic);
  return Object.keys(object).length ? withNarrative(spec, { object }) : spec;
}

function withSceneState(spec, sceneStatePatch = {}) {
  return withNarrative(spec, {
    state: {
      sceneState: sceneStatePatch
    }
  });
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

function semanticPartToNarrative(part) {
  if (Array.isArray(part)) return part.map(semanticPartToNarrative);
  if (typeof part === "string") return { field: part };
  if (part == null || typeof part !== "object") return part;
  return { ...part };
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

function semanticCategoryPart(category) {
  if (!category) return null;
  if (Object.prototype.hasOwnProperty.call(category, "equal")) {
    return { value: category.equal };
  }
  if (category.field) return { field: category.field };
  return null;
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

function oppositeOrientation(orientation) {
  return orientation === "horizontal" ? "vertical" : "horizontal";
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

function cloneEncoding(encoding = {}) {
  return Object.fromEntries(
    Object.entries(encoding).map(([channel, channelSpec]) => [
      channel,
      Array.isArray(channelSpec) ? channelSpec.map((item) => ({ ...item })) : { ...channelSpec }
    ])
  );
}
