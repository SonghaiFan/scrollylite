import {
  narrativeObjectKey,
  withNarrative
} from "../scrolly-meta.js?v=semantic-key-10";
import { titleize } from "../labels.js?v=semantic-key-1";

export function applyFilterFocus(spec, focusSpec = {}) {
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

export function applyXYGuide(spec, guideSpec = {}) {
  const encoding = cloneEncoding(spec.encoding);
  const shouldFlip = Boolean(guideSpec.flip);

  if (shouldFlip) {
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
      flip: shouldFlip,
      xScale: channelScaleType(encoding.x),
      yScale: channelScaleType(encoding.y),
      staging: resolveGuideStaging(guideSpec, "cartesian")
    }
  });
}

export function applyXYObservation(spec, observationSpec = {}) {
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

export function identitySpec(spec) {
  return spec;
}

export function withObject(spec, objectSpec = {}) {
  const object = {};
  if (objectSpec.key != null) object.key = objectSpec.key;
  if (objectSpec.semantic != null) object.semantic = semanticToNarrative(objectSpec.semantic);
  return Object.keys(object).length ? withNarrative(spec, { object }) : spec;
}

export function withSceneState(spec, sceneStatePatch = {}) {
  return withNarrative(spec, {
    state: {
      sceneState: sceneStatePatch
    }
  });
}

export function semanticToNarrative(semanticKey = {}) {
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

export function semanticPartToNarrative(part) {
  if (Array.isArray(part)) return part.map(semanticPartToNarrative);
  if (typeof part === "string") return { field: part };
  if (part == null || typeof part !== "object") return part;
  return { ...part };
}

export function selectorToFilter(selector = {}) {
  if (!selector.field) return null;
  return {
    field: selector.field,
    ...copyDefined(selector, ["equal", "notEqual", "oneOf", "gte", "gt", "lte", "lt"])
  };
}

export function resolveGuideStaging(guideSpec = {}, orientation) {
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

export function channelFromField(fieldOrChannel, title, fallbackType) {
  if (fieldOrChannel && typeof fieldOrChannel === "object") {
    const channel = { ...fieldOrChannel };
    if (!channel.type) channel.type = fallbackType;
    if (channel.field && !channel.title) channel.title = titleize(channel.field);
    return channel;
  }
  return {
    field: fieldOrChannel,
    type: fallbackType,
    title: title || titleize(fieldOrChannel)
  };
}

export function mergeXYChannel(base = {}, override = {}, fallbackType) {
  if (typeof override === "string") return channelFromField(override, null, fallbackType);
  const channel = { ...base, ...override };
  if (!channel.type) channel.type = fallbackType;
  if (channel.field && (!channel.title || override.field)) channel.title = override.title || titleize(channel.field);
  if (override.scale || base.scale) channel.scale = { ...(base.scale || {}), ...(override.scale || {}) };
  return channel;
}

export function channelScaleType(channel = {}) {
  return channel.scale?.type || channel.scaleType || "linear";
}

export function aggregateFieldSpec(channelSpec = {}, fallbackField, fallbackAs, fallbackOp) {
  return {
    op: channelSpec.op || fallbackOp,
    field: channelSpec.field || fallbackField,
    as: channelSpec.as || fallbackAs
  };
}

export function cloneViewSpec(viewSpec) {
  return {
    ...viewSpec,
    transform: [...(viewSpec.transform || [])],
    encoding: cloneEncoding(viewSpec.encoding)
  };
}

export function cloneEncoding(encoding = {}) {
  return Object.fromEntries(
    Object.entries(encoding).map(([channel, channelSpec]) => [
      channel,
      Array.isArray(channelSpec) ? channelSpec.map((item) => ({ ...item })) : { ...channelSpec }
    ])
  );
}

export function copyDefined(source, keys) {
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}
