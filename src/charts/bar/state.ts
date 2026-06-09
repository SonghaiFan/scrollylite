import { narrativeTransition } from '../../scrolly-meta.js';
import { diffViewStates } from '../../grammar/diff.js';
import { defaultTransition, stagedDuration } from '../../timing.js';
import { normalizeMarkRendererKey } from '../index.js';
import type {
  BarLayout,
  BarOrientation,
  GranularitySpec,
  IntermediateSpec,
  TransitionPlan,
  TransitionPlanEnterExit,
  ViewSpec
} from '../../types/index.js';
import {
  barCategoryChannel,
  barLayoutTransitionRoute,
  barMeasureChannel,
  barOffsetChannelName,
  barRendererKey,
  isSegmentLayout
} from './layout/index.js';
import { semanticBarState } from './semantic.js';

export function resolveBarTransitionPlan(
  previousSpec: ViewSpec | null,
  nextSpec: ViewSpec | null
): TransitionPlan {
  const previous = barState(previousSpec);
  const next = barState(nextSpec);
  if (!previous || !next) return {};

  const diff = diffViewStates(previousSpec, nextSpec);
  const plan: TransitionPlan = {
    diff: diff.deltas.map(({ type, action, previous: p, next: n }) => ({
      type, action, previous: p, next: n
    }))
  };

  const crossesGranularity =
    diff.hasDelta('bar.granularity') || previous.hasGranularity || next.hasGranularity;
  if (crossesGranularity) {
    plan.key = { mode: 'semantic', reason: 'granularity-object-consistency' };
  }

  // Collapse: child → parent
  if (
    diff.hasDelta('bar.granularity', 'remove') &&
    previous.hasGranularity && next.hasAggregate && !next.hasGranularity
  ) {
    plan.enter = {
      mode: 'parent-child-lineage',
      from: 'child-bounds',
      target: 'parent',
      reason: 'granularity-parent-child-lineage',
      parentKey: next.categoryField,
      childKey: [previous.categoryField, previous.segmentField].filter(Boolean) as string[],
      sourceLayout: previous.barLayout
    };
  }

  if (diff.hasDelta('bar.granularity', 'remove') && previous.hasGranularity) {
    const baseline = barBaselinePlan(previous.barLayout);
    plan.exit = {
      mode: 'baseline',
      to: baseline.name,
      baseline,
      source: 'child',
      reason: 'granularity-exit-baseline',
      sourceOrientation: previous.orientation,
      sourceLayout: previous.barLayout,
      categoryKey: previous.categoryField,
      segmentKey: previous.segmentField,
      valueKey: previous.measureField
    } as TransitionPlanEnterExit;
  }

  // Split: parent → child
  if (
    diff.hasDelta('bar.granularity', 'add') &&
    previous.hasAggregate && next.hasGranularity && !previous.hasGranularity
  ) {
    plan.enter = {
      mode: 'parent-child-lineage',
      from: 'parent-bounds',
      target: 'child',
      reason: 'granularity-parent-child-lineage',
      parentKey: previous.categoryField,
      childKey: [next.categoryField, next.segmentField].filter(Boolean) as string[],
      targetLayout: next.barLayout
    };
  }

  if (diff.hasDelta('bar.granularity', 'add') && next.hasGranularity && !plan.enter) {
    const baseline = barBaselinePlan(next.barLayout);
    plan.enter = {
      mode: 'baseline',
      from: baseline.name,
      baseline,
      target: 'child',
      reason: 'granularity-enter-baseline',
      targetLayout: next.barLayout,
      categoryKey: next.categoryField,
      segmentKey: next.segmentField,
      valueKey: next.measureField
    } as TransitionPlanEnterExit;
  }

  const layoutChanged = diff.hasDelta('bar.layout');
  const changesSegmentLayout =
    layoutChanged &&
    isSegmentLayout(previous.barLayout) &&
    isSegmentLayout(next.barLayout);
  const crossesGuide = diff.hasDelta('bar.guide') || previous.hasGuide || next.hasGuide;
  const orientationChanged = diff.hasDelta('bar.orientation');
  const geometryAxes = changedBarGeometryAxes(diff);
  if (!geometryAxes.length) return plan;

  const guideStaging = (next.guideStaging ?? previous.guideStaging ?? {}) as Record<string, unknown>;
  const reason = stagedUpdateReason({ changesSegmentLayout, crossesGuide, orientationChanged });
  const timing = defaultTransition({
    ...narrativeTransition(previousSpec ?? {}),
    ...narrativeTransition(nextSpec ?? {}),
    ...(guideStaging as object)
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
    duration: (guideStaging.duration as number | undefined) ?? stagedDuration(timing.duration, stagedOrder.length),
    ease: timing.ease,
    stagger: timing.stagger
  };
  const staggerMaxVal = staggerMax(stageTiming.stagger);
  const stageTotalDuration = stageTiming.duration * stagedOrder.length + staggerMaxVal;

  plan.update = {
    mode: 'staged',
    reason,
    target: {
      orientation: next.orientation,
      layout: next.barLayout,
      renderer: barRendererKey(next.barLayout, next.orientation)
    },
    changedAxes: geometryAxes,
    stages: stagedOrder.map((axis) => ({
      axis,
      attrs: axis === 'x' ? ['x', 'width'] : ['y', 'height']
    })),
    timing: stageTiming,
    totalDuration: stageTotalDuration
  };

  return plan;
}

interface BarInternalState {
  orientation: BarOrientation;
  barLayout: BarLayout;
  categoryField: string | null;
  measureField: string | null;
  hasGuide: boolean;
  hasGranularity: boolean;
  hasAggregate: boolean;
  segmentField: string | null;
  guideStaging: Record<string, unknown> | null;
}

export function barState(spec: ViewSpec | null | undefined): BarInternalState | null {
  if (!spec || normalizeMarkRendererKey(spec.mark) !== 'bar') return null;
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
    guideStaging: (semantic.guide as Record<string, unknown> | null)?.staging as Record<string, unknown> | null ?? null
  };
}

export function barCollapseIntermediateSpec(
  previousSpec: ViewSpec | null,
  nextSpec: ViewSpec | null
): ViewSpec | null {
  const plan = resolveBarTransitionPlan(previousSpec, nextSpec);
  if (plan.enter?.mode !== 'parent-child-lineage' || plan.enter.from !== 'child-bounds') return null;

  const previous = barState(previousSpec);
  if (!previous?.hasGranularity) return null;

  const route = barLayoutTransitionRoute({
    fromLayout: previous.barLayout,
    toLayout: barState(nextSpec)?.barLayout,
    change: 'collapse'
  });
  return route[0] ? segmentLayoutSpec(previousSpec!, route[0], nextSpec) : null;
}

export function barSplitIntermediateSpec(
  previousSpec: ViewSpec | null,
  nextSpec: ViewSpec | null
): ViewSpec | null {
  const plan = resolveBarTransitionPlan(previousSpec, nextSpec);
  if (plan.enter?.mode !== 'parent-child-lineage' || plan.enter.from !== 'parent-bounds') return null;

  const next = barState(nextSpec);
  if (!next?.hasGranularity) return null;

  const route = barLayoutTransitionRoute({
    fromLayout: barState(previousSpec)?.barLayout,
    toLayout: next.barLayout,
    change: 'split'
  });
  return route[0] ? segmentLayoutSpec(nextSpec!, route[0], previousSpec) : null;
}

export function barIntermediateSpecs(
  previousSpec: ViewSpec,
  nextSpec: ViewSpec
): IntermediateSpec[] {
  const direct = directBarIntermediateSpecs(previousSpec, nextSpec);
  if (!direct.length) return [];

  const previous = barState(previousSpec);
  const next = barState(nextSpec);
  if (!previous || !next || previous.orientation === next.orientation) return direct;

  const orientedSource = orientBarSpec(previousSpec, next.orientation);
  if (!orientedSource) return direct;

  return [
    { spec: orientedSource, scene: 'guide' },
    ...directBarIntermediateSpecs(orientedSource, nextSpec)
  ];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function barBaselinePlan(layout: BarLayout): {
  name: string;
  anchor?: string;
  value?: number;
  meaning: string;
} {
  if (layout === 'stacked') {
    return { name: 'stack-base', anchor: '__stack0', meaning: 'segment-stack-base' };
  }
  return { name: 'zero-baseline', value: 0, meaning: 'measure-zero' };
}

function staggerMax(stagger: unknown): number {
  if (stagger == null || typeof stagger !== 'object') return 0;
  const max = Number((stagger as Record<string, unknown>).max);
  return Number.isFinite(max) ? max : 0;
}

function directBarIntermediateSpecs(
  previousSpec: ViewSpec,
  nextSpec: ViewSpec
): IntermediateSpec[] {
  const collapseSpec = barCollapseIntermediateSpec(previousSpec, nextSpec);
  if (collapseSpec) return [{ spec: collapseSpec, scene: 'guide' }];

  const splitSpec = barSplitIntermediateSpec(previousSpec, nextSpec);
  if (splitSpec) return [{ spec: splitSpec, scene: 'granularity' }];

  return [];
}

function stageOrder(staging: Record<string, unknown>, orientation: BarOrientation): Array<'x' | 'y'> {
  const order = staging.order as Array<'x' | 'y'> | undefined;
  if (Array.isArray(order) && order.length) return order.filter((a) => a === 'x' || a === 'y');
  return orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y'];
}

function segmentLayoutStageOrder(staging: Record<string, unknown>, layout: BarLayout): Array<'x' | 'y'> {
  const order = staging.order as Array<'x' | 'y'> | undefined;
  if (Array.isArray(order) && order.length) return order.filter((a) => a === 'x' || a === 'y');
  return layout === 'stacked' ? ['y', 'x'] : ['x', 'y'];
}

function changedBarGeometryAxes(diff: ReturnType<typeof diffViewStates>): Array<'x' | 'y'> {
  return (
    [
      diff.hasDelta('bar.x-geometry') ? 'x' : null,
      diff.hasDelta('bar.y-geometry') ? 'y' : null
    ] as Array<'x' | 'y' | null>
  ).filter((v): v is 'x' | 'y' => v !== null);
}

function geometryStageOrder({
  staging,
  target,
  changesSegmentLayout,
  reverse,
  axes
}: {
  staging: Record<string, unknown>;
  target: BarInternalState;
  changesSegmentLayout: boolean;
  reverse: boolean;
  axes: Array<'x' | 'y'>;
}): Array<'x' | 'y'> {
  const baseOrder = changesSegmentLayout
    ? segmentLayoutStageOrder(staging, target.barLayout)
    : stageOrder(staging, target.orientation);
  const ordered = reverse ? [...baseOrder].reverse() : [...baseOrder];
  const axisSet = new Set(axes);
  const staged = ordered.filter((a) => axisSet.has(a));
  for (const axis of axes) {
    if (!staged.includes(axis)) staged.push(axis);
  }
  return staged;
}

function stagedUpdateReason({
  changesSegmentLayout,
  crossesGuide,
  orientationChanged
}: {
  changesSegmentLayout: boolean;
  crossesGuide: boolean;
  orientationChanged: boolean;
}): string {
  if (changesSegmentLayout && crossesGuide) return 'guide-segment-layout';
  if (orientationChanged && crossesGuide) return 'guide-orientation';
  return 'bar-geometry';
}

function orientBarSpec(spec: ViewSpec, orientation: BarOrientation): ViewSpec | null {
  const state = barState(spec);
  if (!state || state.orientation === orientation) return null;

  const next = cloneSpec(spec) as ViewSpec;
  const encoding = { ...(next.encoding ?? {}) } as Record<string, unknown>;
  const categoryEnc = barCategoryChannel(encoding as Record<string, any>);
  const measureEnc = barMeasureChannel(encoding as Record<string, any>);
  const category = cloneSpec(categoryEnc);
  const measure = cloneSpec(measureEnc);
  if (!category?.field || !measure?.field) return null;

  if (orientation === 'horizontal') {
    encoding.x = measure;
    encoding.y = category;
  } else {
    encoding.x = category;
    encoding.y = measure;
  }

  delete encoding.xOffset;
  delete encoding.yOffset;
  if (state.barLayout === 'grouped' && state.segmentField) {
    encoding[barOffsetChannelName(orientation)] = { field: state.segmentField, type: 'nominal' };
  }

  const narrative = { ...(next.narrative ?? {}) } as Record<string, unknown>;
  const narrativeState = { ...(narrative.state ?? {}) } as Record<string, unknown>;
  const sceneState = { ...(narrativeState.sceneState ?? {}) } as Record<string, unknown>;
  sceneState.guide = {
    ...(sceneState.guide as object ?? {}),
    ...(state.barLayout !== 'simple' ? { layout: state.barLayout } : {}),
    orientation,
    staging: {
      ...(((sceneState.guide as Record<string, unknown> | undefined)?.staging as object) ?? {}),
      order: orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y']
    }
  };
  if (state.hasGranularity || sceneState.granularity) {
    sceneState.granularity = {
      ...(sceneState.granularity as object ?? {}),
      ...(state.barLayout !== 'simple' ? { layout: state.barLayout } : {})
    };
  }
  narrativeState.sceneState = sceneState;
  narrative.state = narrativeState;

  return {
    ...next,
    encoding: encoding as ViewSpec['encoding'],
    margin: {
      ...(orientation === 'horizontal' ? { left: 86, right: 42 } : {}),
      ...(next.margin ?? {})
    },
    narrative: narrative as ViewSpec['narrative'],
    transition: { ...narrativeTransition(spec) }
  };
}

function segmentLayoutSpec(
  spec: ViewSpec,
  layout: BarLayout,
  transitionPeerSpec: ViewSpec | null
): ViewSpec {
  const state = barState(spec);
  const next = cloneSpec(spec) as ViewSpec;
  const encoding = { ...(next.encoding ?? {}) } as Record<string, unknown>;
  delete encoding.xOffset;
  delete encoding.yOffset;
  if (layout === 'grouped' && state?.segmentField) {
    encoding[barOffsetChannelName(state.orientation)] = {
      field: state.segmentField,
      type: 'nominal'
    };
  }

  const narrative = { ...(next.narrative ?? {}) } as Record<string, unknown>;
  const narrativeStateBlock = { ...(narrative.state ?? {}) } as Record<string, unknown>;
  const sceneState = { ...(narrativeStateBlock.sceneState ?? {}) } as Record<string, unknown>;
  sceneState.granularity = { ...(sceneState.granularity as object ?? {}), layout };
  sceneState.guide = { ...(sceneState.guide as object ?? {}), layout };
  narrativeStateBlock.sceneState = sceneState;
  narrative.state = narrativeStateBlock;

  return {
    ...next,
    encoding: encoding as ViewSpec['encoding'],
    narrative: {
      ...narrative,
      transition: {
        ...narrativeTransition(transitionPeerSpec ?? {}),
        ...narrativeTransition(spec)
      }
    } as ViewSpec['narrative']
  };
}

function cloneSpec<T>(spec: T): T {
  if (spec == null) return spec;
  return JSON.parse(JSON.stringify(spec)) as T;
}
