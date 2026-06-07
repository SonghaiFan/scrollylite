import { normalizeMarkRendererKey } from "../index.js";
import { narrativeTransition } from "../../scrolly-meta.js?v=semantic-key-10";
import { diffViewStates } from "../../grammar/diff.js?v=semantic-key-16";
import { defaultTransition, stagedDuration } from "../../timing.js";
import {
  barCategoryChannel,
  barLayoutTransitionRoute,
  barMeasureChannel,
  barOffsetChannelName,
  barRendererKey,
  isSegmentLayout
} from "./layout/index.js";
import { semanticBarState } from "./semantic.js?v=semantic-key-1";

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
    plan.key = {
      mode: "semantic",
      reason: "granularity-object-consistency"
    };
    plan.barKey = plan.key;
  }

  if (
    diff.hasDelta("bar.granularity", "remove") &&
    previous.hasGranularity &&
    next.hasAggregate &&
    !next.hasGranularity
  ) {
    const collapsePlan = {
      mode: "parent-child",
      reason: "granularity-parent-child-lineage",
      parentKey: next.categoryField,
      childKey: [previous.categoryField, previous.segmentField].filter(Boolean),
      fromLayout: previous.barLayout
    };
    plan.barCollapse = collapsePlan;
    plan.enter = {
      mode: "parent-child-lineage",
      from: "child-bounds",
      target: "parent",
      reason: collapsePlan.reason,
      parentKey: collapsePlan.parentKey,
      childKey: collapsePlan.childKey,
      sourceLayout: collapsePlan.fromLayout
    };
  }

  if (diff.hasDelta("bar.granularity", "remove") && previous.hasGranularity) {
    const baseline = barBaselinePlan(previous.barLayout);
    plan.exit = {
      mode: "baseline",
      to: baseline.name,
      baseline,
      source: "child",
      reason: "granularity-exit-baseline",
      sourceOrientation: previous.orientation,
      sourceLayout: previous.barLayout,
      categoryKey: previous.categoryField,
      segmentKey: previous.segmentField,
      valueKey: previous.measureField
    };
  }

  if (
    diff.hasDelta("bar.granularity", "add") &&
    previous.hasAggregate &&
    next.hasGranularity &&
    !previous.hasGranularity
  ) {
    const splitPlan = {
      mode: "parent-child",
      reason: "granularity-parent-child-lineage",
      parentKey: previous.categoryField,
      childKey: [next.categoryField, next.segmentField].filter(Boolean),
      toLayout: next.barLayout
    };
    plan.barSplit = splitPlan;
    plan.enter = {
      mode: "parent-child-lineage",
      from: "parent-bounds",
      target: "child",
      reason: splitPlan.reason,
      parentKey: splitPlan.parentKey,
      childKey: splitPlan.childKey,
      targetLayout: splitPlan.toLayout
    };
  }

  if (diff.hasDelta("bar.granularity", "add") && next.hasGranularity && !plan.enter) {
    const baseline = barBaselinePlan(next.barLayout);
    plan.enter = {
      mode: "baseline",
      from: baseline.name,
      baseline,
      target: "child",
      reason: "granularity-enter-baseline",
      targetLayout: next.barLayout,
      categoryKey: next.categoryField,
      segmentKey: next.segmentField,
      valueKey: next.measureField
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
  const stageTotalDuration = stageTiming.duration * stagedOrder.length + staggerMax(stageTiming.stagger);

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
    timing: stageTiming,
    totalDuration: stageTotalDuration
  };

  return plan;
}

function barBaselinePlan(layout) {
  if (layout === "stacked") {
    return {
      name: "stack-base",
      anchor: "__stack0",
      meaning: "segment-stack-base"
    };
  }

  return {
    name: "zero-baseline",
    value: 0,
    meaning: "measure-zero"
  };
}

function staggerMax(stagger) {
  if (stagger == null || typeof stagger !== "object") return 0;
  const max = Number(stagger.max);
  return Number.isFinite(max) ? max : 0;
}

export function barCollapseIntermediateSpec(previousSpec, nextSpec) {
  const plan = resolveBarTransitionPlan(previousSpec, nextSpec);
  if (plan.barCollapse?.mode !== "parent-child") {
    return null;
  }

  const previous = barState(previousSpec);
  if (!previous?.hasGranularity) return null;

  const route = barLayoutTransitionRoute({
    fromLayout: previous.barLayout,
    toLayout: barState(nextSpec)?.barLayout,
    change: "collapse"
  });
  const intermediateLayout = route[0];
  return intermediateLayout ? segmentLayoutSpec(previousSpec, intermediateLayout, nextSpec) : null;
}

export function barSplitIntermediateSpec(previousSpec, nextSpec) {
  const plan = resolveBarTransitionPlan(previousSpec, nextSpec);
  if (plan.barSplit?.mode !== "parent-child") {
    return null;
  }

  const next = barState(nextSpec);
  if (!next?.hasGranularity) return null;

  const route = barLayoutTransitionRoute({
    fromLayout: barState(previousSpec)?.barLayout,
    toLayout: next.barLayout,
    change: "split"
  });
  const intermediateLayout = route[0];
  return intermediateLayout ? segmentLayoutSpec(nextSpec, intermediateLayout, previousSpec) : null;
}

export function barIntermediateSpecs(previousSpec, nextSpec) {
  const direct = directBarIntermediateSpecs(previousSpec, nextSpec);
  if (!direct.length) return [];

  const previous = barState(previousSpec);
  const next = barState(nextSpec);
  if (!previous || !next || previous.orientation === next.orientation) return direct;

  const orientedSource = orientBarSpec(previousSpec, next.orientation);
  if (!orientedSource) return direct;

  return [
    { spec: orientedSource, scene: "guide" },
    ...directBarIntermediateSpecs(orientedSource, nextSpec)
  ];
}

export function barState(spec) {
  if (!spec || normalizeMarkRendererKey(spec.mark) !== "bar") return null;

  const semantic = semanticBarState(spec);

  return {
    orientation: semantic.orientation,
    barLayout: semantic.layout,
    categoryField: semantic.categoryField,
    measureField: semantic.measureField,
    hasGuide: Boolean(semantic.guide),
    hasGranularity: Boolean(semantic.granularity),
    hasAggregate: Boolean(semantic.aggregate),
    segmentField: semantic.segmentField,
    guideStaging: semantic.guide?.staging || null
  };
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
  return barRendererKey(state.barLayout, state.orientation);
}

function directBarIntermediateSpecs(previousSpec, nextSpec) {
  const collapseSpec = barCollapseIntermediateSpec(previousSpec, nextSpec);
  if (collapseSpec) return [{ spec: collapseSpec, scene: "guide" }];

  const splitSpec = barSplitIntermediateSpec(previousSpec, nextSpec);
  if (splitSpec) return [{ spec: splitSpec, scene: "granularity" }];

  return [];
}

function orientBarSpec(spec, orientation) {
  const state = barState(spec);
  if (!state || state.orientation === orientation) return null;

  const next = cloneSpec(spec);
  const encoding = { ...(next.encoding || {}) };
  const category = cloneSpec(barCategoryChannel(encoding));
  const measure = cloneSpec(barMeasureChannel(encoding));
  if (!category?.field || !measure?.field) return null;

  if (orientation === "horizontal") {
    encoding.x = measure;
    encoding.y = category;
  } else {
    encoding.x = category;
    encoding.y = measure;
  }

  delete encoding.xOffset;
  delete encoding.yOffset;
  if (state.barLayout === "grouped" && state.segmentField) {
    encoding[barOffsetChannelName(orientation)] = {
      field: state.segmentField,
      type: "nominal"
    };
  }

  const narrative = { ...(next.narrative || {}) };
  const narrativeStateBlock = { ...(narrative.state || {}) };
  const sceneState = { ...(narrativeStateBlock.sceneState || {}) };
  sceneState.guide = {
    ...(sceneState.guide || {}),
    ...(state.barLayout !== "simple" ? { layout: state.barLayout } : {}),
    orientation,
    staging: {
      ...(sceneState.guide?.staging || {}),
      order: orientation === "horizontal" ? ["y", "x"] : ["x", "y"]
    }
  };
  if (state.hasGranularity || sceneState.granularity) {
    sceneState.granularity = {
      ...sceneState.granularity,
      ...(state.barLayout !== "simple" ? { layout: state.barLayout } : {})
    };
  }
  narrativeStateBlock.sceneState = sceneState;
  narrative.state = narrativeStateBlock;

  return {
    ...next,
    encoding,
    margin: {
      ...(orientation === "horizontal" ? { left: 86, right: 42 } : {}),
      ...(next.margin || {})
    },
    narrative,
    transition: {
      ...narrativeTransition(spec)
    }
  };
}

function segmentLayoutSpec(spec, layout, transitionPeerSpec) {
  const state = barState(spec);
  const next = cloneSpec(spec);
  const encoding = { ...(next.encoding || {}) };
  delete encoding.xOffset;
  delete encoding.yOffset;
  if (layout === "grouped" && state?.segmentField) {
    encoding[barOffsetChannelName(state.orientation)] = {
      field: state.segmentField,
      type: "nominal"
    };
  }

  const narrative = { ...(next.narrative || {}) };
  const narrativeStateBlock = { ...(narrative.state || {}) };
  const sceneState = { ...(narrativeStateBlock.sceneState || {}) };
  sceneState.granularity = {
    ...(sceneState.granularity || {}),
    layout
  };
  sceneState.guide = {
    ...(sceneState.guide || {}),
    layout
  };
  narrativeStateBlock.sceneState = sceneState;
  narrative.state = narrativeStateBlock;

  return {
    ...next,
    encoding,
    narrative: {
      ...narrative,
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
