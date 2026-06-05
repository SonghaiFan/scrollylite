import { DEFAULT_TIMING } from "../timing.js";

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

export function resolveSceneTransition(viewSpec = {}, designSpace = {}) {
  const mark = String(viewSpec.mark || "").toLowerCase();
  const supportedScenes = supportedSceneTypes(mark);
  const scene = uniqueTokens([
    ...(designSpace.transition?.scene || []),
    ...asArray(viewSpec.scene),
    ...asArray(viewSpec.transition?.scene)
  ]).filter((token) => SCENE_TRANSITIONS.includes(token) && supportedScenes.includes(token));

  return {
    scene,
    focus: scene.includes("focus") ? viewSpec.focus || null : null,
    guide: scene.includes("guide") ? viewSpec.guide || null : null,
    granularity: scene.includes("granularity") ? viewSpec.granularity || null : null,
    observation: scene.includes("observation") ? viewSpec.observation || null : null
  };
}

export function withSceneTransitionDefaults(viewSpec, sceneTransition) {
  const transition = { ...(viewSpec.transition || {}) };

  if ((hasScene(sceneTransition, "observation") || hasScene(sceneTransition, "granularity")) && transition.stagger == null) {
    transition.stagger = { ...DEFAULT_TIMING.scene.stagger };
  }

  return {
    ...viewSpec,
    transition,
    sceneTransition
  };
}

export function compileSceneViewSpec(viewSpec, sceneTransition) {
  const mark = String(viewSpec.mark || "").toLowerCase();
  const compiler = CHART_TRANSITION_COMPILERS[mark];
  if (!compiler) return viewSpec;

  return stateApplicationOrder(viewSpec, sceneTransition, compiler).reduce((compiled, sceneType) => {
    const handler = compiler.scenes[sceneType];
    return handler ? handler(compiled, viewSpec[sceneType] || sceneTransition[sceneType] || {}) : compiled;
  }, compiler.base(cloneViewSpec(viewSpec)));
}

export function hasScene(sceneTransition, type) {
  return sceneTransition?.scene?.includes(type);
}

function supportedSceneTypes(mark) {
  const compiler = CHART_TRANSITION_COMPILERS[mark];
  return compiler ? Object.keys(compiler.scenes) : SCENE_TRANSITIONS;
}

function stateApplicationOrder(viewSpec, sceneTransition, compiler) {
  const supported = Object.keys(compiler.scenes);
  return STATE_APPLICATION_ORDER.filter((type) =>
    supported.includes(type) &&
    (viewSpec[type] != null || sceneTransition.scene.includes(type))
  );
}

const CHART_TRANSITION_COMPILERS = {
  bar: {
    base: withDefaultBarSemanticKey,
    scenes: {
      focus: applyFilterFocus,
      guide: applyBarGuide,
      granularity: applyBarGranularity,
      observation: applyBarObservation
    }
  },
  scatter: {
    base: identitySpec,
    scenes: {
      focus: applyFilterFocus,
      guide: applyXYGuide,
      granularity: applyScatterGranularity,
      observation: applyXYObservation
    }
  },
  line: {
    base: identitySpec,
    scenes: {
      focus: applyLineFocus,
      guide: applyXYGuide,
      granularity: applyLineGranularity,
      observation: applyXYObservation
    }
  },
  unit: {
    base: identitySpec,
    scenes: {
      focus: applyFilterFocus,
      guide: applyUnitGuide
    }
  }
};

function applyFilterFocus(spec, focusSpec = {}) {
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
  if (guideSpec.layout || guideSpec.barLayout) {
    const layout = guideSpec.layout || guideSpec.barLayout;
    return {
      ...spec,
      barLayout: layout,
      sceneState: {
        ...(spec.sceneState || {}),
        guide: {
          layout,
          staging: resolveGuideStaging(guideSpec, "vertical")
        }
      }
    };
  }

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
      color:
        granularitySpec.color || {
          field: segmentField,
          type: "nominal",
          domain: segmentDomain,
          range: granularitySpec.range || ["#b05d3b", "#536a9e"]
        }
    },
    sceneState: {
      ...(spec.sceneState || {}),
      granularity: {
        layout: granularitySpec.layout || "stacked",
        fields,
        segmentField,
        sourceField,
        segments: segmentDomain.length ? segmentDomain : null,
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

  const categoryKey = observationSpec.category
    ? semanticCategoryPart(observationSpec.category)
    : null;

  return {
    ...spec,
    semanticKey:
      observationSpec.semanticKey ||
      (categoryKey
        ? semanticKeyFromParts(
            spec.semanticKey?.entity || spec.semanticKey?.entities || categoryChannel(encoding),
            categoryKey
          )
        : semanticKeyFromEncoding(encoding, spec.semanticKey)),
    encoding,
    sceneState: {
      ...(spec.sceneState || {}),
      observation: {
        measure: measure.field,
        category: observationSpec.category || null
      }
    }
  };
}

function applyLineFocus(spec, focusSpec = {}) {
  const filter = focusSpec.filter || selectorToFilter(focusSpec);
  if (!filter) return spec;

  if (focusSpec.mode === "filter") {
    return applyFilterFocus(spec, focusSpec);
  }

  return {
    ...spec,
    sceneState: {
      ...(spec.sceneState || {}),
      focus: {
        filter,
        mode: focusSpec.mode || "rangeCrop",
        crop: focusSpec.crop !== false
      }
    }
  };
}

function applyXYGuide(spec, guideSpec = {}) {
  const encoding = cloneEncoding(spec.encoding);

  if (guideSpec.swap) {
    [encoding.x, encoding.y] = [encoding.y, encoding.x];
  }

  if (guideSpec.x) encoding.x = mergeXYChannel(encoding.x, guideSpec.x, "quantitative");
  if (guideSpec.y) encoding.y = mergeXYChannel(encoding.y, guideSpec.y, "quantitative");

  return {
    ...spec,
    encoding,
    key: guideSpec.key || spec.key,
    sceneState: {
      ...(spec.sceneState || {}),
      guide: {
        swap: Boolean(guideSpec.swap),
        xScale: channelScaleType(encoding.x),
        yScale: channelScaleType(encoding.y),
        staging: resolveGuideStaging(guideSpec, "cartesian")
      }
    }
  };
}

function applyXYObservation(spec, observationSpec = {}) {
  const encoding = cloneEncoding(spec.encoding);
  if (observationSpec.x) encoding.x = mergeXYChannel(encoding.x, observationSpec.x, "quantitative");
  if (observationSpec.y) encoding.y = mergeXYChannel(encoding.y, observationSpec.y, "quantitative");

  return {
    ...spec,
    encoding,
    sceneState: {
      ...(spec.sceneState || {}),
      observation: {
        x: encoding.x?.field,
        y: encoding.y?.field
      }
    }
  };
}

function applyScatterGranularity(spec, granularitySpec = {}) {
  const mode = granularitySpec.mode || "detail";
  const parentField = granularitySpec.parentField || granularitySpec.groupby?.[0] || spec.encoding?.color?.field;
  const detailField = granularitySpec.detailField || spec.key || spec.encoding?.key?.field || spec.encoding?.x?.field;

  if (mode === "aggregate") {
    const groupby = granularitySpec.groupby || [parentField].filter(Boolean);
    const x = mergeXYChannel(spec.encoding?.x, granularitySpec.x || spec.encoding?.x, "quantitative");
    const y = mergeXYChannel(spec.encoding?.y, granularitySpec.y || spec.encoding?.y, "quantitative");
    const xAs = granularitySpec.x?.as || x.field;
    const yAs = granularitySpec.y?.as || y.field;
    const countAs = granularitySpec.countAs || "count";
    const fields = [
      aggregateFieldSpec(granularitySpec.x, x.field, xAs, "mean"),
      aggregateFieldSpec(granularitySpec.y, y.field, yAs, "mean"),
      { op: "count", as: countAs }
    ];

    return {
      ...spec,
      key: granularitySpec.key || groupby,
      transform: [
        ...(spec.transform || []),
        {
          aggregate: {
            groupby,
            fields
          }
        }
      ],
      encoding: {
        ...cloneEncoding(spec.encoding),
        x: { ...x, field: xAs },
        y: { ...y, field: yAs },
        ...(granularitySpec.size !== false
          ? {
              size: {
                field: countAs,
                type: "quantitative",
                range: granularitySpec.sizeRange || [9, 24]
              }
            }
          : {})
      },
      sceneState: {
        ...(spec.sceneState || {}),
        granularity: {
          mode,
          parentField,
          detailField,
          countAs
        }
      }
    };
  }

  return {
    ...spec,
    key: granularitySpec.key || detailField,
    sceneState: {
      ...(spec.sceneState || {}),
      granularity: {
        mode: "detail",
        parentField,
        detailField
      }
    }
  };
}

function applyLineGranularity(spec, granularitySpec = {}) {
  const mode = granularitySpec.mode || "series";
  const encoding = cloneEncoding(spec.encoding);
  const seriesField = granularitySpec.series || granularitySpec.field || encoding.color?.field;

  if (mode === "series" && seriesField) {
    encoding.series = channelFromField(seriesField, granularitySpec.title || "Series", "nominal");
    encoding.color =
      granularitySpec.color || {
        field: seriesField,
        type: "nominal",
        range: granularitySpec.range || ["#2f7d7e", "#8d6e3f", "#b05d3b"]
      };
  }

  if (mode === "single") {
    delete encoding.series;
    if (granularitySpec.color) encoding.color = granularitySpec.color;
  }

  return {
    ...spec,
    encoding,
    sceneState: {
      ...(spec.sceneState || {}),
      granularity: {
        mode,
        seriesField: mode === "series" ? seriesField : null
      }
    }
  };
}

function applyUnitGuide(spec, guideSpec = {}) {
  const unit = {
    ...(spec.unit || {}),
    ...copyDefined(guideSpec, [
      "layout",
      "columns",
      "groupColumns",
      "radius",
      "xField",
      "xType",
      "xTitle",
      "yField",
      "yTitle",
      "groupField",
      "valueField",
      "labelField",
      "maxUnits"
    ])
  };
  const encoding = cloneEncoding(spec.encoding);
  if (guideSpec.color) encoding.color = guideSpec.color;

  return {
    ...spec,
    unit,
    key: guideSpec.key || spec.key,
    encoding,
    sceneState: {
      ...(spec.sceneState || {}),
      guide: {
        layout: unit.layout || "grid",
        xField: unit.xField || null,
        yField: unit.yField || null,
        groupField: unit.groupField || null,
        valueField: unit.valueField || null,
        staging: resolveGuideStaging(guideSpec, "unit")
      }
    }
  };
}

function identitySpec(spec) {
  return spec;
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

function mergeXYChannel(base = {}, override = {}, fallbackType) {
  if (typeof override === "string") return channelFromField(override, base?.title, fallbackType);
  const channel = { ...base, ...override };
  if (!channel.type) channel.type = fallbackType;
  if (override.scale || base.scale) channel.scale = { ...(base.scale || {}), ...(override.scale || {}) };
  return channel;
}

function channelScaleType(channel = {}) {
  return channel.scale?.type || channel.scaleType || "linear";
}

function aggregateFieldSpec(channelSpec = {}, fallbackField, fallbackAs, fallbackOp) {
  return {
    op: channelSpec.op || fallbackOp,
    field: channelSpec.field || fallbackField,
    as: channelSpec.as || fallbackAs
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
