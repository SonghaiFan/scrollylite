import {
  narrativeObjectKey,
  narrativeSemanticKey,
  narrativeState
} from "../../scrolly-meta.js";
import {
  barOffsetChannelName,
  barOrientationFromEncoding
} from "./layout/index.js";
import { barSegmentField } from "./semantic.js";
import {
  channelFromField,
  cloneEncoding,
  compileFilter,
  compileHighlight,
  identitySpec,
  resolveGuideStaging,
  withObject,
  withSceneState
} from "../compiler-utils.js";

export function createBarSpecCompiler(context = {}) {
  return {
    base: compileBarBase,
    operations: {
      filter: compileFilter,
      highlight: compileHighlight,
      coordinate: compileBarCoordinate,
      scale: compileBarScale,
      aggregate: compileBarAggregate,
      layout: compileBarLayout
    }
  };
}

function compileBarBase(spec, context = {}) {
  return withDefaultBarSemanticKey(identitySpec(spec));
}

function compileBarCoordinate(spec, guideSpec = {}, context = {}) {
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

function compileBarScale(spec, operationSpec = {}, context = {}) {
  return compileBarCoordinate(spec, operationSpec, context);
}

function compileBarLayout(spec, operationSpec = {}, context = {}) {
  return compileBarCoordinate(spec, operationSpec, context);
}

function compileBarAggregate(spec, granularitySpec = {}, context = {}) {
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
        range: granularitySpec.range || ["var(--sl-series-1)", "var(--sl-series-2)"]
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

function oppositeOrientation(orientation) {
  return orientation === "horizontal" ? "vertical" : "horizontal";
}
