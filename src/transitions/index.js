import { DEFAULT_TIMING } from "../timing.js";
import {
  externalizeScrollyViewSpec,
  narrativeObjectKey,
  narrativeState,
  narrativeTransition,
  narrativeUnit,
  withNarrative
} from "../scrolly-meta.js?v=semantic-key-10";
import { createBarSceneCompiler } from "../charts/bar/compile.js?v=semantic-key-1";

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
  return externalizeScrollyViewSpec(compiled);
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
  point: {
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

  if (focusSpec.mode === "highlight") {
    return withSceneState(spec, {
      focus: {
        mode: "highlight",
        filter,
        ...(focusSpec.opacity != null ? { opacity: focusSpec.opacity } : {})
      }
    });
  }

  return withSceneState({
    ...spec,
    transform: [{ filter }, ...(spec.transform || [])]
  }, {
    focus: { filter }
  });
}

function applyLineFocus(spec, focusSpec = {}) {
  const filter = focusSpec.filter || selectorToFilter(focusSpec);
  if (!filter) return spec;

  if (focusSpec.mode === "filter") {
    return applyFilterFocus(spec, focusSpec);
  }

  return withSceneState({
    ...spec,
  }, {
    focus: {
      filter,
      mode: focusSpec.mode || "rangeCrop",
      crop: focusSpec.crop !== false
    }
  });
}

function applyXYGuide(spec, guideSpec = {}) {
  const encoding = cloneEncoding(spec.encoding);

  if (guideSpec.swap) {
    [encoding.x, encoding.y] = [encoding.y, encoding.x];
  }

  if (guideSpec.x) encoding.x = mergeXYChannel(encoding.x, guideSpec.x, "quantitative");
  if (guideSpec.y) encoding.y = mergeXYChannel(encoding.y, guideSpec.y, "quantitative");

  return withSceneState(withObject({
    ...spec,
    encoding
  }, {
    key: guideSpec.key || narrativeObjectKey(spec)
  }), {
    guide: {
      swap: Boolean(guideSpec.swap),
      xScale: channelScaleType(encoding.x),
      yScale: channelScaleType(encoding.y),
      staging: resolveGuideStaging(guideSpec, "cartesian")
    }
  });
}

function applyXYObservation(spec, observationSpec = {}) {
  const encoding = cloneEncoding(spec.encoding);
  if (observationSpec.x) encoding.x = mergeXYChannel(encoding.x, observationSpec.x, "quantitative");
  if (observationSpec.y) encoding.y = mergeXYChannel(encoding.y, observationSpec.y, "quantitative");

  return withSceneState({
    ...spec,
    encoding
  }, {
    observation: {
      x: encoding.x?.field,
      y: encoding.y?.field
    }
  });
}

function applyScatterGranularity(spec, granularitySpec = {}) {
  const mode = granularitySpec.mode || "detail";
  const parentField = granularitySpec.parentField || granularitySpec.groupby?.[0] || spec.encoding?.color?.field;
  const detailField = granularitySpec.detailField || narrativeObjectKey(spec) || spec.encoding?.key?.field || spec.encoding?.x?.field;

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

    return withSceneState(withObject({
      ...spec,
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
      }
    }, {
      key: granularitySpec.key || groupby
    }), {
      granularity: {
        mode,
        parentField,
        detailField,
        countAs
      }
    });
  }

  return withSceneState(withObject({
    ...spec,
  }, {
    key: granularitySpec.key || detailField
  }), {
    granularity: {
      mode: "detail",
      parentField,
      detailField
    }
  });
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

  return withSceneState({
    ...spec,
    encoding
  }, {
    granularity: {
      mode,
      seriesField: mode === "series" ? seriesField : null
    }
  });
}

function applyUnitGuide(spec, guideSpec = {}) {
  const unit = {
    ...(narrativeUnit(spec) || {}),
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

  return withSceneState(withObject(withNarrative({
    ...spec,
    encoding
  }, {
    unit
  }), {
    key: guideSpec.key || narrativeObjectKey(spec)
  }), {
    guide: {
      layout: unit.layout || "grid",
      xField: unit.xField || null,
      yField: unit.yField || null,
      groupField: unit.groupField || null,
      valueField: unit.valueField || null,
      staging: resolveGuideStaging(guideSpec, "unit")
    }
  });
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

function identitySpec(spec) {
  return spec;
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
