import { narrativeState } from '../../scrolly-meta.js';
import type {
  AggregateTransform,
  BarGeometryState,
  BarLayout,
  BarOrientation,
  BarSemanticState,
  ChannelSignature,
  ChannelSpec,
  EncodingSpec,
  FilterSpec,
  GranularitySpec,
  GuideSpec,
  NarrativeSceneState,
  ResolvedNarrativeState,
  ViewSpec
} from '../../types/index.js';
import {
  barCategoryChannel,
  barMeasureChannel,
  barOrientationFromEncoding,
  isSegmentLayout
} from './layout/index.js';

export function semanticBarState(
  spec: ViewSpec,
  semanticStateArg: Partial<ResolvedNarrativeState> | null = null
): BarSemanticState {
  const enc = (spec.encoding ?? {}) as Record<string, ChannelSpec | undefined>;
  const state = semanticStateArg ?? semanticStateFromSpec(spec);
  const aggregate = barAggregateState(spec);
  const layout = barLayoutState(spec, state, aggregate);
  const orientation = barOrientationFromEncoding(enc);
  const categoryField = barCategoryChannel(enc).field ?? null;
  const measureField = barMeasureChannel(enc).field ?? null;
  const segmentField = barSegmentField(spec, state);
  const guide = barGuideState({ orientation, layout, state });
  const granularity = barGranularityState({ layout, categoryField, measureField, segmentField, state });
  const geometry = barGeometryState({ enc, filters: resolveFilters(spec, state), layout, orientation, categoryField, measureField, segmentField });

  return {
    orientation,
    layout,
    categoryField,
    measureField,
    guide,
    granularity,
    aggregate,
    segmentField,
    xGeometry: geometry.x,
    yGeometry: geometry.y
  };
}

export function barLayoutState(
  spec: ViewSpec,
  state: Partial<ResolvedNarrativeState> = semanticStateFromSpec(spec),
  aggregate: AggregateTransform | AggregateTransform[] | null = barAggregateState(spec)
): BarLayout {
  const enc = (spec.encoding ?? {}) as Record<string, ChannelSpec | undefined>;
  const sceneState = (state as { sceneState?: NarrativeSceneState }).sceneState ?? {};
  const stateLayout =
    sceneState.guide?.layout ??
    sceneState.granularity?.layout ??
    (state as { guide?: { layout?: BarLayout } }).guide?.layout ??
    (state as { granularity?: { layout?: BarLayout } }).granularity?.layout;

  if (stateLayout) return stateLayout;
  if (enc.xOffset?.field || enc.yOffset?.field) return 'grouped';
  if (enc.color?.field && aggregate) return 'stacked';
  return 'simple';
}

export function barGuideState({
  orientation,
  layout,
  state = {}
}: {
  orientation: BarOrientation;
  layout: BarLayout;
  state?: Partial<ResolvedNarrativeState>;
}): GuideSpec | null {
  const sceneState = (state as { sceneState?: NarrativeSceneState }).sceneState ?? {};
  const explicit = sceneState.guide ?? (state as { guide?: GuideSpec }).guide;
  if (explicit) return explicit;
  if (orientation === 'horizontal') {
    return { orientation, staging: { order: ['y', 'x'] } };
  }
  if (layout === 'grouped') {
    return { layout, staging: { order: ['x', 'y'] } };
  }
  return null;
}

export function barGranularityState({
  layout,
  categoryField,
  measureField,
  segmentField,
  state = {}
}: {
  layout: BarLayout;
  categoryField: string | null;
  measureField: string | null;
  segmentField: string | null;
  state?: Partial<ResolvedNarrativeState>;
}): GranularitySpec | null {
  const sceneState = (state as { sceneState?: NarrativeSceneState }).sceneState ?? {};
  const explicit =
    sceneState.granularity ?? (state as { granularity?: GranularitySpec }).granularity;
  if (explicit) return explicit;
  if (!isSegmentLayout(layout) || !segmentField) return null;
  return {
    layout,
    categoryField: categoryField ?? null,
    segmentField,
    valueField: measureField ?? null
  };
}

export function barAggregateState(
  spec: ViewSpec
): AggregateTransform | AggregateTransform[] | null {
  const transforms = (spec.transform ?? []) as Array<Record<string, unknown>>;
  const aggregates = transforms
    .filter((t) => t.aggregate)
    .map((t) => t.aggregate as AggregateTransform);
  if (!aggregates.length) return null;
  return aggregates.length === 1 ? aggregates[0] : aggregates;
}

export function barSegmentField(
  spec: ViewSpec,
  state: Partial<ResolvedNarrativeState> = semanticStateFromSpec(spec)
): string | null {
  const sceneState = (state as { sceneState?: NarrativeSceneState }).sceneState ?? {};
  return (
    sceneState.granularity?.segmentField ??
    (state as { granularity?: GranularitySpec }).granularity?.segmentField ??
    (spec.encoding as Record<string, ChannelSpec | undefined>)?.xOffset?.field ??
    (spec.encoding as Record<string, ChannelSpec | undefined>)?.yOffset?.field ??
    (spec.encoding as Record<string, ChannelSpec | undefined>)?.color?.field ??
    null
  );
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function semanticStateFromSpec(spec: ViewSpec): ResolvedNarrativeState & { filters: FilterSpec[] } {
  const state = narrativeState(spec);
  const transforms = (spec.transform ?? []) as Array<Record<string, unknown>>;
  return {
    ...state,
    filters: [
      ...(spec.filter ? [spec.filter as FilterSpec] : []),
      ...transforms.filter((t) => t.filter).map((t) => t.filter as FilterSpec)
    ]
  };
}

function resolveFilters(spec: ViewSpec, state: Partial<ResolvedNarrativeState>): FilterSpec[] {
  const transforms = (spec.transform ?? []) as Array<Record<string, unknown>>;
  return [
    ...(spec.filter ? [spec.filter as FilterSpec] : []),
    ...transforms.filter((t) => t.filter).map((t) => t.filter as FilterSpec)
  ];
}

function barGeometryState({
  enc,
  filters,
  layout,
  orientation,
  categoryField,
  measureField,
  segmentField
}: {
  enc: Record<string, ChannelSpec | undefined>;
  filters: FilterSpec[];
  layout: BarLayout;
  orientation: BarOrientation;
  categoryField: string | null;
  measureField: string | null;
  segmentField: string | null;
}): { x: BarGeometryState; y: BarGeometryState } {
  const category = { role: 'category' as const, field: categoryField, filters };
  const measure = { role: 'measure' as const, field: measureField };
  const segment = segmentField
    ? { field: segmentField, color: channelSignature(enc.color) }
    : null;

  if (orientation === 'horizontal') {
    return {
      x: {
        orientation,
        layout,
        measure,
        segment: layout === 'stacked' ? segment : null,
        channel: channelSignature(enc.x)
      },
      y: {
        orientation,
        layout,
        category,
        segment: layout === 'grouped' ? segment : null,
        channel: channelSignature(enc.y)
      }
    };
  }

  return {
    x: {
      orientation,
      layout,
      category,
      segment: layout === 'grouped' ? segment : null,
      channel: channelSignature(enc.x)
    },
    y: {
      orientation,
      layout,
      measure,
      segment: layout === 'stacked' ? segment : null,
      channel: channelSignature(enc.y)
    }
  };
}

function channelSignature(channel: ChannelSpec | undefined = {}): ChannelSignature {
  return {
    field: channel.field ?? null,
    title: channel.title ?? null,
    type: channel.type ?? null,
    aggregate: typeof channel.aggregate === 'string' ? channel.aggregate : null,
    domain: (channel.domain as unknown[] | undefined) ?? null,
    scale: (channel.scale as Record<string, unknown> | undefined) ?? null,
    sort: channel.sort ?? null,
    bin: channel.bin ?? null
  };
}
