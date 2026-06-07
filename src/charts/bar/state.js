import { normalizeMarkRendererKey } from "../index.js";
import {
  narrativeState,
  narrativeTransition
} from "../../scrolly-meta.js?v=semantic-key-10";
import { diffViewStates } from "../../grammar/diff.js?v=semantic-key-14";
import { defaultTransition, stagedDuration } from "../../timing.js";

export function resolveBarTransitionPlan(previousSpec, nextSpec) {
  const previous = barState(previousSpec);
  const next = barState(nextSpec);

  if (!previous || !next) return {};

  const diff = diffViewStates(previousSpec, nextSpec);
  const plan = {
    diff: diff.deltas.map(({ type, action, previous, next }) => ({ type, action, previous, next }))
  };
  const crossesGranularity = diff.hasDelta("bar.granularity") || previous.hasGranularity || next.hasGranularity;
  if (crossesGranularity) {
    plan.barKey = {
      mode: "semantic",
      reason: "granularity-object-consistency"
    };
  }

  if (
    diff.hasDelta("bar.granularity", "remove") &&
    previous.hasGranularity &&
    next.hasAggregate &&
    !next.hasGranularity
  ) {
    plan.barCollapse = {
      mode: "parent-child",
      reason: "granularity-parent-child-lineage",
      parentKey: next.categoryField,
      childKey: [previous.categoryField, previous.segmentField].filter(Boolean),
      fromLayout: previous.barLayout
    };
  }

  if (
    diff.hasDelta("bar.granularity", "add") &&
    previous.hasAggregate &&
    next.hasGranularity &&
    !previous.hasGranularity
  ) {
    plan.barSplit = {
      mode: "parent-child",
      reason: "granularity-parent-child-lineage",
      parentKey: previous.categoryField,
      childKey: [next.categoryField, next.segmentField].filter(Boolean),
      toLayout: next.barLayout
    };
  }

  const layoutChanged = diff.hasDelta("bar.layout");
  const changesSegmentLayout =
    layoutChanged &&
    isSegmentLayout(previous.barLayout) &&
    isSegmentLayout(next.barLayout);
  const crossesGuide = diff.hasDelta("bar.guide") || previous.hasGuide || next.hasGuide;
  const orientationChanged = diff.hasDelta("bar.orientation");
  const geometryAxes = changedBarGeometryAxes(diff);
  if (!geometryAxes.length) return plan;

  const guideStaging = next.guideStaging || previous.guideStaging || {};
  const reason = barStageReason({ changesSegmentLayout, crossesGuide, orientationChanged });
  const timing = defaultTransition({
    ...narrativeTransition(previousSpec || {}),
    ...narrativeTransition(nextSpec || {}),
    ...guideStaging
  });
  const stagedOrder = geometryStageOrder({
    staging: guideStaging,
    target: next,
    changesSegmentLayout,
    reverse: crossesGuide && !next.hasGuide,
    axes: geometryAxes
  });

  if (!stagedOrder.length) return plan;

  const stageTiming = {
    duration: guideStaging.duration || stagedDuration(timing.duration, stagedOrder.length),
    ease: timing.ease,
    stagger: timing.stagger
  };

  plan.barStage = {
    reason,
    fromOrientation: previous.orientation,
    toOrientation: next.orientation,
    fromLayout: previous.barLayout,
    toLayout: next.barLayout,
    order: stagedOrder,
    changedAxes: geometryAxes,
    duration: timing.duration,
    ease: timing.ease,
    stagger: timing.stagger
  };
  plan.update = {
    mode: "staged",
    reason,
    target: {
      orientation: next.orientation,
      layout: next.barLayout,
      renderer: barRendererOrientation(next)
    },
    changedAxes: geometryAxes,
    stages: stagedOrder.map((axis) => ({
      axis,
      attrs: axis === "x" ? ["x", "width"] : ["y", "height"]
    })),
    timing: stageTiming
  };

  return plan;
}

export function barCollapseIntermediateSpec(previousSpec, nextSpec) {
  const plan = resolveBarTransitionPlan(previousSpec, nextSpec);
  if (plan.barCollapse?.mode !== "parent-child" || plan.barCollapse.fromLayout !== "grouped") {
    return null;
  }

  const previous = barState(previousSpec);
  if (!previous?.hasGranularity) return null;

  return stackedSegmentSpec(previousSpec, nextSpec);
}

export function barSplitIntermediateSpec(previousSpec, nextSpec) {
  const plan = resolveBarTransitionPlan(previousSpec, nextSpec);
  if (plan.barSplit?.mode !== "parent-child" || plan.barSplit.toLayout !== "grouped") {
    return null;
  }

  const next = barState(nextSpec);
  if (!next?.hasGranularity) return null;

  return stackedSegmentSpec(nextSpec, previousSpec);
}

export function barState(spec) {
  if (!spec || normalizeMarkRendererKey(spec.mark) !== "bar") return null;

  const enc = spec.encoding || {};
  const state = narrativeState(spec);
  const sceneState = state.sceneState || {};
  const aggregate = barAggregateState(spec);
  const barLayout = barLayoutState(spec, state, aggregate);
  const horizontal =
    barLayout === "simple" &&
    enc.x?.type === "quantitative" &&
    ["nominal", "ordinal"].includes(enc.y?.type);
  const orientation = horizontal ? "horizontal" : "vertical";
  const segmentField =
    sceneState.granularity?.segmentField ||
    state.granularity?.segmentField ||
    enc.xOffset?.field ||
    enc.yOffset?.field ||
    enc.color?.field ||
    null;
  const guideState = barGuideState({ orientation, barLayout, state });
  const granularityState = barGranularityState({ barLayout, categoryField: horizontal ? enc.y?.field : enc.x?.field, measureField: horizontal ? enc.x?.field : enc.y?.field, segmentField, state });

  return {
    orientation,
    barLayout,
    categoryField: horizontal ? enc.y?.field : enc.x?.field,
    measureField: horizontal ? enc.x?.field : enc.y?.field,
    hasGuide: Boolean(guideState),
    hasGranularity: Boolean(granularityState),
    hasAggregate: Boolean(aggregate),
    segmentField,
    guideStaging: guideState?.staging || null
  };
}

function barLayoutState(spec = {}, state = {}, aggregate = null) {
  const enc = spec.encoding || {};
  const stateLayout =
    state.sceneState?.guide?.layout ||
    state.sceneState?.granularity?.layout ||
    state.guide?.layout ||
    state.granularity?.layout;
  if (stateLayout) return stateLayout;
  if (enc.xOffset?.field || enc.yOffset?.field) return "grouped";
  if (enc.color?.field && aggregate) return "stacked";
  return "simple";
}

function barGuideState({ orientation, barLayout, state = {} }) {
  const explicit = state.sceneState?.guide || state.guide;
  if (explicit) return explicit;
  if (orientation === "horizontal") {
    return {
      orientation,
      staging: { order: ["y", "x"] }
    };
  }
  if (barLayout === "grouped") {
    return {
      layout: barLayout,
      staging: { order: ["x", "y"] }
    };
  }
  return null;
}

function barGranularityState({ barLayout, categoryField, measureField, segmentField, state = {} }) {
  const explicit = state.sceneState?.granularity || state.granularity;
  if (explicit) return explicit;
  if (!isSegmentLayout(barLayout) || !segmentField) return null;
  return {
    layout: barLayout,
    categoryField: categoryField || null,
    segmentField,
    valueField: measureField || null
  };
}

function barAggregateState(spec = {}) {
  return (spec.transform || []).some((transform) => transform?.aggregate)
    ? (spec.transform || []).filter((transform) => transform?.aggregate).map((transform) => transform.aggregate)
    : null;
}

function stageOrder(staging = {}, orientation) {
  if (Array.isArray(staging.order) && staging.order.length) {
    return staging.order.filter((axis) => axis === "x" || axis === "y");
  }
  return orientation === "horizontal" ? ["y", "x"] : ["x", "y"];
}

function segmentLayoutStageOrder(staging = {}, layout) {
  if (Array.isArray(staging.order) && staging.order.length) {
    return staging.order.filter((axis) => axis === "x" || axis === "y");
  }
  return layout === "stacked" ? ["y", "x"] : ["x", "y"];
}

function changedBarGeometryAxes(diff) {
  return [
    diff.hasDelta("bar.x-geometry") ? "x" : null,
    diff.hasDelta("bar.y-geometry") ? "y" : null
  ].filter(Boolean);
}

function geometryStageOrder({ staging, target, changesSegmentLayout, reverse, axes }) {
  const baseOrder = changesSegmentLayout
    ? segmentLayoutStageOrder(staging, target.barLayout)
    : stageOrder(staging, target.orientation);
  const ordered = reverse ? baseOrder.slice().reverse() : baseOrder.slice();
  const axisSet = new Set(axes);
  const staged = ordered.filter((axis) => axisSet.has(axis));

  for (const axis of axes) {
    if (!staged.includes(axis)) staged.push(axis);
  }

  return staged;
}

function barStageReason({ changesSegmentLayout, crossesGuide, orientationChanged }) {
  if (changesSegmentLayout && crossesGuide) return "guide-segment-layout";
  if (orientationChanged && crossesGuide) return "guide-orientation";
  return "bar-geometry";
}

function barRendererOrientation(state) {
  if (state.barLayout === "grouped") return "grouped-vertical";
  if (state.barLayout === "stacked") return "stacked-vertical";
  return state.orientation;
}

function isSegmentLayout(layout) {
  return layout === "grouped" || layout === "stacked";
}

function stackedSegmentSpec(spec, transitionPeerSpec) {
  const next = cloneSpec(spec);
  const encoding = { ...(next.encoding || {}) };
  delete encoding.xOffset;
  delete encoding.yOffset;

  return {
    ...cloneSpec(spec),
    encoding,
    narrative: {
      ...(next.narrative || {}),
      transition: {
        ...narrativeTransition(transitionPeerSpec || {}),
        ...narrativeTransition(spec)
      }
    }
  };
}

function cloneSpec(spec) {
  return spec == null ? spec : JSON.parse(JSON.stringify(spec));
}
