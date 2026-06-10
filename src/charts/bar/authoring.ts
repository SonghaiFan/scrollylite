import { compileViewSpec } from '../../transitions/index.js';
import { externalizeScrollyViewSpec } from '../../scrolly-meta.js';
import { cloneState } from '../../grammar/view-state.js';
import { labelFromValue, titleize } from '../../labels.js';
import { IdiomState, channelFrom, colorFrom, normalizeDataSource } from '../authoring.js';
import type {
  BarLayout,
  ChannelSpec,
  FilterSpec,
  GranularitySpec,
  GuideSpec,
  SemanticKey,
  StageSpec,
  ViewSpec
} from '../../types/index.js';

export interface BarViewState extends ViewSpec {
  mark: 'bar';
  where?: FilterSpec[];
  granularity?: GranularitySpec | null;
  guide?: GuideSpec | null;
  aggregate?: unknown;
  semanticKey?: SemanticKey | null;
}

export function bar(data: unknown): BarState {
  return new BarState({ data: normalizeDataSource(data), mark: 'bar', encoding: {} } as BarViewState);
}

export class BarState extends IdiomState<BarViewState> {
  override toSpec(): Omit<BarViewState, '__grammar'> {
    const spec = cloneState(this.state) as BarViewState & { __grammar?: unknown };
    delete spec.__grammar;

    const filters: FilterSpec[] = [
      ...((spec.where ?? []) as FilterSpec[]),
      ...(spec.filter ? [spec.filter as FilterSpec] : [])
    ];
    if (filters.length) {
      spec.transform = [
        ...filters.map((filter) => ({ filter })),
        ...(spec.transform ?? [])
      ];
    }
    delete spec.where;
    delete spec.filter;
    if (spec.granularity == null) delete spec.granularity;
    if (spec.guide == null) delete spec.guide;
    delete spec.aggregate;
    if (spec.semanticKey == null) delete spec.semanticKey;

    return pruneAuthoringState(
      compileViewSpec(externalizeScrollyViewSpec(spec as ViewSpec), { scene: [] })
    ) as Omit<BarViewState, '__grammar'>;
  }

  override x(field: string | ChannelSpec, options: Partial<ChannelSpec> = {}): this {
    const channel = channelFrom(field, { type: 'nominal', ...options });
    return this.with({
      key: (this.state as BarViewState).key ?? channel.field,
      encoding: { x: channel }
    } as Partial<BarViewState>);
  }

  override y(field: string | ChannelSpec, options: Partial<ChannelSpec> | string = {}): this {
    if (typeof options === 'string') options = { title: options };
    const { color, tooltip, ...channelOptions } = options as Partial<ChannelSpec> & {
      color?: unknown;
      tooltip?: unknown;
    };
    const channel = channelFrom(field, { type: 'quantitative', ...channelOptions });
    return this.with({
      encoding: {
        y: channel,
        ...(color ? { color: colorFrom(color as string | ChannelSpec) } : {}),
        ...(tooltip ? { tooltip: cloneState(tooltip) } : {})
      }
    } as Partial<BarViewState>);
  }

  where(selector: string | Record<string, unknown> | FilterSpec | null): this {
    if (selector == null) {
      return this.with({ where: [] } as Partial<BarViewState>, 'focus');
    }
    const selectors = normalizeSelectors(selector);
    const identity = identityFromSelectors(this.state as BarViewState, selectors);
    const measureTitle = measureTitleFromSelectors(this.state as BarViewState, selectors);
    return this.with({
      where: setConstraints((this.state as BarViewState).where ?? [], selectors),
      ...(identity ?? {}),
      ...(measureTitle
        ? {
            encoding: {
              y: {
                ...((this.state as BarViewState).encoding?.y ?? {}),
                title: measureTitle
              }
            }
          }
        : {}),
      __grammar: {
        lastWhere: {
          selectors: cloneState(selectors),
          fields: selectors.map((s) => s.field)
        },
        ...(measureTitle
          ? { measureSelector: { title: measureTitle, fields: selectors.map((s) => s.field) } }
          : {})
      }
    } as Partial<BarViewState>, 'focus');
  }

  flip(options: {
    domain?: unknown[];
    scale?: Record<string, unknown>;
    staging?: StageSpec;
    stage?: Array<'x' | 'y'>;
    order?: Array<'x' | 'y'>;
  } = {}): this {
    const domain = options.domain ?? (options.scale as Record<string, unknown> | undefined)?.domain;
    const scale = domain || options.scale
      ? { ...(options.scale ?? {}), ...(domain ? { domain } : {}) }
      : undefined;
    const staging = options.staging ?? options.stage ?? options.order
      ? {
          ...(typeof options.staging === 'object' ? options.staging : {}),
          order: options.order ?? options.stage ?? options.staging?.order ?? ['y', 'x']
        }
      : undefined;
    return this.guide({ flip: true, ...(scale ? { scale } : {}), ...(staging ? { staging } : {}) });
  }

  breakdown(
    segment = 'type',
    options: {
      category?: string;
      value?: string;
      by?: string | string[];
      layout?: BarLayout;
      op?: string;
      title?: string | false;
      color?: unknown;
      tooltip?: unknown;
      [key: string]: unknown;
    } = {}
  ): this {
    const category = options.category ?? (this.state as BarViewState).encoding?.x?.field;
    const value = options.value ?? (this.state as BarViewState).encoding?.y?.field ?? 'count';
    const { by, category: _cat, value: _val, ...rest } = options;
    const next = aggregateBarState(this, {
      ...rest,
      by: by ?? ([category, segment].filter(Boolean) as string[]),
      segment,
      value,
      layout: options.layout ?? 'stacked',
      op: options.op ?? 'sum'
    });
    return (options.title === false ? next : next.y(value, { title: options.title ?? titleize(value) })) as unknown as this;
  }

  rollup(
    groupbyOrOptions:
      | string
      | string[]
      | {
          groupby?: string | string[];
          by?: string | string[];
          value?: string;
          as?: string;
          op?: string;
          color?: unknown;
          title?: string;
          [key: string]: unknown;
        }
      | null = null,
    options: {
      groupby?: string | string[];
      by?: string | string[];
      value?: string;
      as?: string;
      op?: string;
      color?: unknown;
      title?: string;
      [key: string]: unknown;
    } = {}
  ): this {
    if (groupbyOrOptions && typeof groupbyOrOptions === 'object' && !Array.isArray(groupbyOrOptions)) {
      options = groupbyOrOptions;
      groupbyOrOptions = options.groupby ?? options.by ?? null;
    }
    const parent = groupbyOrOptions ?? options.groupby ?? options.by
      ?? (this.state as BarViewState).encoding?.x?.field;
    const fields = (asArray(parent as string | string[] | null).filter(Boolean) as string[]);
    const value = options.value ?? (this.state as BarViewState).encoding?.y?.field ?? 'count';
    const { color, title, by: _by, groupby: _groupby, value: _value, ...rest } = options;

    let nextState = aggregateBarState(this, {
      ...rest,
      groupby: fields,
      value,
      as: options.as ?? value,
      op: options.op ?? 'sum'
    });
    if (title) nextState = nextState.y(value, { title }) as BarState;
    if (color) nextState = nextState.color(color as string | ChannelSpec) as BarState;
    return nextState as unknown as this;
  }

  segment(
    fieldOrConfig:
      | string
      | {
          segment?: string;
          category?: string;
          value?: string;
          as?: [string, string];
          fields?: string[];
          labels?: Record<string, string>;
          categoryTitle?: string;
          valueTitle?: string;
          layout?: BarLayout;
          color?: ChannelSpec;
          domain?: unknown[];
          range?: unknown[];
          source?: string;
          groupby?: string[];
          key?: string | string[];
          tooltip?: unknown;
        } = {},
    maybeConfig: Record<string, unknown> = {}
  ): this {
    const config =
      typeof fieldOrConfig === 'string'
        ? { ...maybeConfig, segment: fieldOrConfig }
        : fieldOrConfig;

    const state = this.state as BarViewState;
    const category = config.category ?? state.encoding?.x?.field;
    const value = config.value ?? config.as?.[1] ?? 'value';
    const segment = config.segment ?? config.as?.[0] ?? 'segment';
    const fields = config.fields ?? [];
    const tidy = !fields.length && Boolean(config.segment);
    const labels = config.labels ?? Object.fromEntries(fields.map((f) => [f, titleize(f)]));

    return this.with({
      key: config.key ?? [category, segment],
      where: tidy ? clearConstraint(state.where ?? [], segment) : state.where,
      granularity: {
        category,
        categoryTitle: config.categoryTitle ?? state.encoding?.x?.title,
        fields,
        labels,
        segment,
        value,
        valueTitle: config.valueTitle ?? titleize(value),
        layout: config.layout ?? 'stacked',
        color: cloneState(config.color),
        domain: config.domain,
        range: config.range,
        source: tidy ? segment : config.source,
        groupby: tidy ? [category, segment].filter(Boolean) as string[] : config.groupby
      } as GranularitySpec,
      ...(config.tooltip
        ? { encoding: { tooltip: cloneState(config.tooltip) } }
        : {})
    } as Partial<BarViewState>, 'granularity');
  }

  layout(layout: BarLayout, options: { staging?: StageSpec; stage?: Array<'x' | 'y'> } = {}): this {
    const state = this.state as BarViewState;
    const next = this.with({
      granularity: state.granularity
        ? { ...state.granularity, layout }
        : undefined,
      guide: {
        ...(state.guide ?? {}),
        layout,
        staging: options.staging ?? (state.guide as GuideSpec | null | undefined)?.staging
      } as GuideSpec
    } as Partial<BarViewState>);
    return options.stage ? next.stage(options.stage) : next.with({} as Partial<BarViewState>, 'guide');
  }

  stage(order: Array<'x' | 'y'>, options: Partial<StageSpec> = {}): this {
    const state = this.state as BarViewState;
    return this.with({
      guide: {
        ...(state.guide ?? {}),
        staging: {
          ...((state.guide as GuideSpec | null | undefined)?.staging ?? {}),
          ...options,
          order
        } as StageSpec
      } as GuideSpec
    } as Partial<BarViewState>, 'guide');
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function aggregateBarState(
  view: BarState,
  config: {
    by?: string | string[];
    groupby?: string | string[];
    segment?: string;
    category?: string;
    categoryTitle?: string;
    value?: string;
    as?: string;
    valueTitle?: string;
    layout?: BarLayout;
    op?: string;
    color?: unknown;
    domain?: unknown[];
    range?: unknown[];
    tooltip?: unknown;
    key?: string | string[];
    semanticKey?: SemanticKey;
    [key: string]: unknown;
  }
): BarState {
  const normalized = normalizeAggregation(config, view.state as BarViewState);
  const { groupby, segment } = normalized;

  if (segment) {
    return view.with({
      key: normalized.key ?? [normalized.category, segment],
      where: clearConstraint((view.state as BarViewState).where ?? [], segment),
      granularity: {
        category: normalized.category,
        categoryTitle: normalized.categoryTitle,
        fields: [],
        labels: {},
        segment,
        value: normalized.value,
        valueTitle: normalized.valueTitle,
        layout: normalized.layout ?? 'stacked',
        color: cloneState(normalized.color) as ChannelSpec | undefined,
        domain: normalized.domain as unknown[] | undefined,
        range: normalized.range as unknown[] | undefined,
        source: segment,
        groupby,
        op: normalized.op
      } as GranularitySpec,
      __grammar: { measureSelector: null },
      ...(normalized.tooltip ? { encoding: { tooltip: cloneState(normalized.tooltip) } } : {})
    } as Partial<BarViewState>, 'granularity');
  }

  return view.with({
    key: normalized.key ?? (groupby.length === 1 ? groupby[0] : groupby),
    granularity: null,
    guide: null,
    semanticKey: normalized.semanticKey ?? null,
    where: (view.state as BarViewState).where,
    transform: [
      ...((view.state as BarViewState).transform ?? []),
      {
        aggregate: {
          groupby,
          fields: [{ op: normalized.op, field: normalized.value, as: normalized.as }]
        }
      }
    ],
    __grammar: { measureSelector: null }
  } as Partial<BarViewState>, 'granularity');
}

function normalizeSelectors(
  selector: string | Record<string, unknown> | FilterSpec
): FilterSpec[] {
  const sel = selector as Record<string, unknown>;
  if (sel.field) return [cloneState(sel) as FilterSpec];
  return Object.entries(sel).map(([field, equal]) => ({ field, equal }));
}

function setConstraints(constraints: FilterSpec[], selectors: FilterSpec[]): FilterSpec[] {
  const fields = new Set(selectors.map((s) => s.field));
  const next = constraints.filter((c) => !fields.has(c.field));
  return [...next, ...selectors.map(cloneState)];
}

function clearConstraint(constraints: FilterSpec[], field: string): FilterSpec[] {
  return constraints.filter((c) => c.field !== field);
}

function identityFromSelectors(
  state: BarViewState,
  selectors: FilterSpec[]
): Partial<BarViewState> | null {
  const category = state.encoding?.x?.field;
  const measure = selectors.find(
    (s) => s.field && Object.prototype.hasOwnProperty.call(s, 'equal') && isMeasureSelectorField(s.field)
  );
  if (!category || !measure) return null;
  return {
    key: [category, measure.field],
    semanticKey: {
      entity: { field: category },
      measure: { field: measure.field }
    }
  };
}

function measureTitleFromSelectors(state: BarViewState, selectors: FilterSpec[]): string | null {
  const y = state.encoding?.y;
  if (!y?.field) return null;
  const measure = selectors.find(
    (s) => s.field && Object.prototype.hasOwnProperty.call(s, 'equal') && isMeasureSelectorField(s.field)
  );
  if (!measure) return null;

  const currentTitle = y.title ?? titleize(y.field);
  const previousMeasureTitle = (state as Record<string, unknown>).__grammar
    ? ((state as Record<string, unknown>).__grammar as Record<string, unknown>)?.measureSelector
      ? ((
          (state as Record<string, unknown>).__grammar as Record<string, unknown>
        ).measureSelector as { title?: string })?.title
      : undefined
    : undefined;

  const titleCanFollowSelector =
    currentTitle === titleize(y.field) || currentTitle === previousMeasureTitle;
  return titleCanFollowSelector ? labelFromValue(measure.equal) : null;
}

function isMeasureSelectorField(field: string): boolean {
  return (
    field === 'type' ||
    field === 'kind' ||
    field.endsWith('_type') ||
    field.endsWith('_kind')
  );
}

function normalizeAggregation(
  config: Record<string, unknown>,
  state: BarViewState
): {
  groupby: string[];
  category: string | null;
  categoryTitle: string;
  segment: string | undefined;
  value: string;
  as: string;
  valueTitle: string;
  op: string;
  layout?: BarLayout;
  color?: unknown;
  domain?: unknown;
  range?: unknown;
  tooltip?: unknown;
  key?: string | string[];
  semanticKey?: SemanticKey;
} {
  const xField = state.encoding?.x?.field;
  const yField = state.encoding?.y?.field;
  const groupby = asArray((config.by ?? config.groupby ?? xField) as string | string[] | null).filter(Boolean) as string[];
  const value = (config.value ?? config.field ?? yField ?? 'value') as string;
  const as = (config.as ?? value) as string;
  const op = (config.op ?? config.use ?? 'sum') as string;
  const segment = (config.segment ?? groupby.find((f) => f !== xField)) as string | undefined;
  const category = (config.category ?? xField ?? groupby.find((f) => f !== segment)) as string | null;

  return {
    ...config,
    groupby,
    category,
    categoryTitle: (config.categoryTitle ?? titleize(category ?? '')) as string,
    segment,
    value,
    as,
    valueTitle: (config.valueTitle ?? (segment
      ? titleize(value)
      : state.encoding?.y?.title ?? titleize(as))) as string,
    op
  };
}

function asArray<T>(value: T | T[] | null | undefined): (T | undefined)[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function pruneAuthoringState(spec: ViewSpec): ViewSpec {
  const next = cloneState(spec) as ViewSpec;
  delete next.margin;
  const state = (next.narrative as Record<string, unknown> | undefined)?.state as
    | Record<string, unknown>
    | undefined;
  if (!state) return next;

  const sceneState = (state.sceneState ?? {}) as Record<string, unknown>;
  const preservedSceneState: Record<string, unknown> = {};

  const focus = sceneState.focus ?? state.focus;
  const guide = sceneState.guide ?? state.guide;

  if ((focus as Record<string, unknown> | undefined)?.mode === 'highlight') {
    preservedSceneState.focus = focus;
  }
  if (hasCustomGuideStaging(guide as Record<string, unknown> | null)) {
    const g = guide as Record<string, unknown>;
    preservedSceneState.guide = {
      ...(g.layout ? { layout: g.layout } : {}),
      ...(g.orientation ? { orientation: g.orientation } : {}),
      staging: g.staging
    };
  }

  delete state.focus;
  delete state.guide;
  delete state.granularity;
  state.sceneState = preservedSceneState;
  if (!Object.keys(state.sceneState as object).length) delete state.sceneState;
  if (!Object.keys(state).length) delete (next.narrative as Record<string, unknown>).state;
  if (next.narrative && !Object.keys(next.narrative as object).length) delete next.narrative;
  return next;
}

function hasCustomGuideStaging(guide: Record<string, unknown> | null): boolean {
  if (!guide?.staging) return false;
  const staging = guide.staging as Record<string, unknown>;
  if (staging.duration != null || staging.stagger != null) return true;
  if (!Array.isArray(staging.order)) return false;
  return (staging.order as string[]).join('|') !== defaultGuideOrder(guide).join('|');
}

function defaultGuideOrder(guide: Record<string, unknown>): string[] {
  return guide.orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y'];
}
