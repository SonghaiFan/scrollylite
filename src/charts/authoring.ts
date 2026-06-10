import { compileViewSpec } from '../transitions/index.js';
import { externalizeScrollyViewSpec } from '../scrolly-meta.js';
import { ViewState, cloneState } from '../grammar/view-state.js';
import { titleize } from '../labels.js';
import type {
  ChannelSpec,
  ChannelType,
  EncodingSpec,
  FilterSpec,
  FocusSpec,
  GuideSpec,
  SortOrder,
  TransitionSpec,
  ViewSpec
} from '../types/index.js';

export { titleize };

// ─── Data source normalisation ────────────────────────────────────────────────
//
// Observable-Plot style: pass a URL (string or { url }) directly to bar() etc.
//
//   sl.bar('/data/weather.csv').x('decade').y('count')
//   sl.bar({ url: '/data/weather.csv', type: 'csv' }).x(...).y(...)
//
// A plain non-URL string is treated as a named dataset reference (existing
// behavior).  The runtime's collectViewDataSources() automatically hoists
// inline { url } objects into the top-level data registry, so seq().data()
// is no longer needed when using inline URLs.

export function normalizeDataSource(data: unknown): unknown {
  if (typeof data === 'string' && isDataUrl(data)) {
    return { url: data };
  }
  return data;
}

function isDataUrl(s: string): boolean {
  return (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('./') ||
    s.startsWith('../') ||
    s.startsWith('/') ||
    /\.(csv|json|tsv|arrow)(\?.*)?$/i.test(s)
  );
}

// ─── IdiomState ───────────────────────────────────────────────────────────────

export class IdiomState<S extends ViewSpec = ViewSpec> extends ViewState<S> {
  override toSpec(): Omit<S, '__grammar'> {
    const spec = super.toSpec() as ViewSpec;
    return pruneAuthoringSpec(
      compileViewSpec(externalizeScrollyViewSpec(spec), { scene: [] })
    ) as Omit<S, '__grammar'>;
  }

  data(data: unknown): this {
    return this.with({ data } as Partial<S>);
  }

  x(field: string | ChannelSpec, options: Partial<ChannelSpec> = {}): this {
    return this.channel('x', field, { type: 'quantitative', ...options });
  }

  y(field: string | ChannelSpec, options: Partial<ChannelSpec> = {}): this {
    return this.channel('y', field, { type: 'quantitative', ...options });
  }

  channel(name: string, field: string | ChannelSpec, options: Partial<ChannelSpec> = {}): this {
    return this.with({
      encoding: { [name]: channelFrom(field, options) } as Partial<EncodingSpec>
    } as Partial<S>);
  }

  color(valueOrField: string | ChannelSpec, options: Partial<ChannelSpec> = {}): this {
    return this.with({ encoding: { color: colorFrom(valueOrField, options) } } as Partial<S>);
  }

  size(field: string | ChannelSpec, options: Partial<ChannelSpec> = {}): this {
    return this.channel('size', field, { type: 'quantitative', ...options });
  }

  key(fields: string | string[]): this {
    const value = Array.isArray(fields) && fields.length === 1 ? fields[0] : fields;
    return this.with({ key: value } as Partial<S>);
  }

  tooltip(items: string | ChannelSpec | Array<string | ChannelSpec>): this {
    const list = Array.isArray(items) ? items : [items];
    return this.with({
      encoding: {
        tooltip: cloneState(
          list.map((item) =>
            typeof item === 'string' ? { field: item, title: titleize(item) } : item
          )
        )
      }
    } as Partial<S>);
  }

  sort(field: string, order: SortOrder = 'ascending'): this {
    return this.with({
      transform: [
        ...((this.state as ViewSpec).transform ?? []),
        { sort: { field, order } }
      ]
    } as Partial<S>);
  }

  transition(timing: TransitionSpec): this {
    return this.with({ transition: timing } as Partial<S>);
  }

  filter(selector: string | Record<string, unknown> | FilterSpec): this {
    return this.with({ focus: selectorFrom(selector) } as Partial<S>, 'focus');
  }

  where(selector: string | Record<string, unknown> | FilterSpec): this {
    return this.filter(selector);
  }

  highlight(
    selector: string | Record<string, unknown> | FilterSpec,
    options: { opacity?: number } = {}
  ): this {
    return this.with({
      focus: {
        mode: 'highlight',
        filter: selectorFrom(selector),
        ...(options.opacity != null ? { opacity: options.opacity } : {})
      } as FocusSpec
    } as Partial<S>, 'focus');
  }

  guide(config: Partial<GuideSpec> = {}): this {
    return this.with({ guide: cloneState(config) } as Partial<S>, 'guide');
  }
}

// ─── Channel factories ────────────────────────────────────────────────────────

export function channelFrom(
  field: string | ChannelSpec,
  options: Partial<ChannelSpec> = {}
): ChannelSpec {
  if (field && typeof field === 'object') {
    const channel = { ...field, ...options };
    return {
      ...channel,
      ...(channel.field && !channel.title ? { title: titleize(channel.field) } : {})
    };
  }
  return {
    field: field as string,
    title: titleize(field as string),
    ...options
  };
}

export function colorFrom(
  valueOrField: string | ChannelSpec,
  options: Partial<ChannelSpec> = {}
): ChannelSpec {
  if (valueOrField && typeof valueOrField === 'object') return cloneState(valueOrField);
  if (typeof valueOrField === 'string' && valueOrField.startsWith('#')) return { value: valueOrField };
  return options.value
    ? { value: options.value }
    : { field: valueOrField as string, type: 'nominal' as ChannelType, ...options };
}

export function selectorFrom(
  selector: string | Record<string, unknown> | FilterSpec = {}
): FocusSpec {
  const sel = selector as Record<string, unknown>;
  if (sel.field) return cloneState(sel) as FocusSpec;
  const entries = Object.entries(sel);
  if (entries.length === 1) {
    const [field, equal] = entries[0];
    return { field, equal };
  }
  return cloneState(sel) as FocusSpec;
}

// ─── Spec pruning ─────────────────────────────────────────────────────────────

function pruneAuthoringSpec(spec: ViewSpec): ViewSpec {
  const next = pruneEmpty(cloneState(spec)) as ViewSpec;
  if (Array.isArray(next.transform) && !next.transform.length) delete next.transform;

  const state = (next.narrative as Record<string, unknown> | undefined)?.state as
    | Record<string, unknown>
    | undefined;
  if (!state) return next;

  const sceneState = (state.sceneState ?? {}) as Record<string, unknown>;
  if (!sceneState.guide && shouldPreserveGuideState(state.guide)) {
    sceneState.guide = state.guide;
  }

  delete state.focus;
  delete state.guide;
  delete state.granularity;
  state.sceneState = sceneState;
  pruneSceneStateDefaults(state.sceneState as Record<string, unknown>);
  state.sceneState = pruneEmpty(state.sceneState);
  if (!Object.keys(state.sceneState as object).length) delete state.sceneState;
  if (!Object.keys(state).length) delete (next.narrative as Record<string, unknown>).state;
  if (next.narrative && !Object.keys(next.narrative as object).length) delete next.narrative;

  return pruneEmpty(next) as ViewSpec;
}

function pruneSceneStateDefaults(sceneState: Record<string, unknown>): void {
  const guide = sceneState.guide as Record<string, unknown> | undefined;
  if (guide) {
    if (guide.xScale === 'linear') delete guide.xScale;
    if (guide.yScale === 'linear') delete guide.yScale;
    if (isDefaultStaging(guide.staging)) delete guide.staging;
  }
}

function shouldPreserveGuideState(guide: unknown): boolean {
  if (!guide || typeof guide !== 'object' || Array.isArray(guide)) return false;
  const semanticKeys = ['layout', 'x', 'y', 'group', 'value'];
  return semanticKeys.some((k) => (guide as Record<string, unknown>)[k] != null);
}

function isDefaultStaging(staging: unknown): boolean {
  if (!staging || !Array.isArray((staging as Record<string, unknown>).order)) return false;
  const s = staging as Record<string, unknown>;
  if (s.duration != null || s.stagger != null) return false;
  return (s.order as string[]).join('|') === 'x|y';
}

function pruneEmpty(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(pruneEmpty).filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) return value == null ? undefined : value;

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => [k, pruneEmpty(v)] as const)
    .filter(([, v]) => v !== undefined)
    .filter(([, v]) => !isPlainObject(v) || Object.keys(v as object).length > 0);

  return Object.fromEntries(entries);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
