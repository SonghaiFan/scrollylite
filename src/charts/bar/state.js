import { normalizeChartType } from "../index.js";

export function resolveBarTransitionPlan(previousSpec, nextSpec) {
  const previous = barState(previousSpec);
  const next = barState(nextSpec);

  if (!previous || !next) return {};

  const plan = {};
  const crossesGranularity = previous.hasGranularity || next.hasGranularity;
  if (crossesGranularity) {
    plan.barKey = {
      mode: "semantic",
      reason: "granularity-object-consistency"
    };
  }

  const layoutChanged = previous.barLayout !== next.barLayout;
  const changesSegmentLayout =
    layoutChanged &&
    isSegmentLayout(previous.barLayout) &&
    isSegmentLayout(next.barLayout);
  if (changesSegmentLayout && (previous.hasGuide || next.hasGuide)) {
    const guideStaging = next.guideStaging || previous.guideStaging || {};
    const order = next.hasGuide
      ? segmentLayoutStageOrder(guideStaging, next.barLayout)
      : segmentLayoutStageOrder(guideStaging, next.barLayout).reverse();

    plan.barStage = {
      reason: "guide-segment-layout",
      fromLayout: previous.barLayout,
      toLayout: next.barLayout,
      order,
      duration: guideStaging.duration,
      ease: guideStaging.ease,
      stagger: guideStaging.stagger
    };

    return plan;
  }

  const crossesGuide = previous.hasGuide || next.hasGuide;
  const orientationChanged = previous.orientation !== next.orientation;
  if (!crossesGuide || !orientationChanged) return plan;

  const guideStaging = next.guideStaging || previous.guideStaging || {};
  const order = next.hasGuide
    ? stageOrder(guideStaging, next.orientation)
    : stageOrder(guideStaging, next.orientation).reverse();

  plan.barStage = {
    reason: "guide-orientation",
    fromOrientation: previous.orientation,
    toOrientation: next.orientation,
    order,
    duration: guideStaging.duration,
    ease: guideStaging.ease,
    stagger: guideStaging.stagger
  };

  return plan;
}

export function barState(spec) {
  if (!spec || normalizeChartType(spec.mark) !== "bar") return null;

  const enc = spec.encoding || {};
  const barLayout = spec.barLayout || spec.bar?.layout || "simple";
  const horizontal =
    barLayout === "simple" &&
    enc.x?.type === "quantitative" &&
    ["nominal", "ordinal"].includes(enc.y?.type);
  const orientation = horizontal ? "horizontal" : "vertical";

  return {
    orientation,
    barLayout,
    categoryField: horizontal ? enc.y?.field : enc.x?.field,
    measureField: horizontal ? enc.x?.field : enc.y?.field,
    hasGuide: Boolean(spec.sceneState?.guide),
    hasGranularity: Boolean(spec.sceneState?.granularity),
    guideStaging: spec.sceneState?.guide?.staging || null
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

function isSegmentLayout(layout) {
  return layout === "grouped" || layout === "stacked";
}
