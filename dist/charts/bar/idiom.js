import { createBarRenderer } from "./render.js";
import {
  barCollapseIntermediateSpec,
  barIntermediateSpecs,
  barSplitIntermediateSpec,
  resolveBarTransitionPlan
} from "./state.js";
import { cloneSpec, uniqueTokens } from "../../runtime/utils.js";

export function createBarIdiom(deps = {}) {
  const renderer = createBarRenderer(deps);
  const transition = {
    plan: resolveBarTransitionPlan,
    intermediateSpecs: barIntermediateSpecs,
    intermediateSpec(previousSpec, nextSpec) {
      const collapseSpec = barCollapseIntermediateSpec(previousSpec, nextSpec);
      if (collapseSpec) return { spec: collapseSpec, scene: "guide" };

      const splitSpec = barSplitIntermediateSpec(previousSpec, nextSpec);
      if (splitSpec) return { spec: splitSpec, scene: "granularity" };

      return null;
    }
  };

  return {
    key: "bar",
    renderer,
    prepareSpec: prepareBarSpec,
    resolveTransitionPlan: resolveBarTransitionPlan,
    intermediateSpecs: barIntermediateSpecs,
    intermediateSpec: transition.intermediateSpec,
    defaultMargin,
    inspect: {
      transitionPlanKey: "barTransitionPlan"
    }
  };
}

function defaultMargin(spec = {}) {
  const enc = spec.encoding || {};
  const horizontalBar =
    String(spec.mark || "").toLowerCase() === "bar" &&
    enc.x?.type === "quantitative" &&
    ["nominal", "ordinal"].includes(enc.y?.type);
  return horizontalBar ? { left: 86, right: 42 } : {};
}

function prepareBarSpec(spec = {}) {
  if (spec.mark !== "bar") return spec;

  const next = cloneSpec(spec);
  const enc = next.encoding || {};
  inferChannelTypes(enc);
  const timeUnitTransforms = timeUnitTransformsFromEncoding(enc);

  const aggregate = aggregateTransformFromEncoding(enc);
  if (timeUnitTransforms.length || aggregate) {
    next.transform = [
      ...(next.transform || []),
      ...timeUnitTransforms,
      ...(aggregate ? [{ aggregate }] : [])
    ];
  }

  return next;
}

function timeUnitTransformsFromEncoding(encoding = {}) {
  return Object.values(encoding).flatMap((channel) => {
    if (!channel?.timeUnit || !channel.field) return [];
    const as = `${channel.field}_${channel.timeUnit}`;
    const transform = {
      timeUnit: {
        field: channel.field,
        unit: channel.timeUnit,
        as
      }
    };
    channel.field = as;
    delete channel.timeUnit;
    return [transform];
  });
}

function inferChannelTypes(encoding = {}) {
  Object.entries(encoding).forEach(([channelName, channel]) => {
    if (!channel || typeof channel !== "object" || !channel.field || channel.type) return;
    if (channel.aggregate) {
      channel.type = "quantitative";
      return;
    }
    channel.type = channelName === "x" || channelName === "y" ? "nominal" : "nominal";
  });
}

function aggregateTransformFromEncoding(encoding = {}) {
  const measureEntry = ["x", "y"].find((channelName) => encoding[channelName]?.aggregate);
  if (!measureEntry) return null;

  const measure = encoding[measureEntry];
  const as = measure.field || `${measure.aggregate}_value`;
  const groupby = uniqueTokens(
    ["x", "y", "color", "xOffset", "yOffset"]
      .filter((channelName) => channelName !== measureEntry)
      .map((channelName) => encoding[channelName]?.field)
  );
  const op = measure.aggregate === true ? "count" : measure.aggregate;
  const fieldSpec = {
    op,
    as
  };
  if (measure.field) fieldSpec.field = measure.field;

  delete measure.aggregate;
  measure.field = as;
  measure.type = "quantitative";

  return {
    groupby,
    fields: [fieldSpec]
  };
}
