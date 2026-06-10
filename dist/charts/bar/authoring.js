import { compileViewSpec } from '../../transitions/index.js';
import { externalizeScrollyViewSpec } from '../../scrolly-meta.js';
import { cloneState } from '../../grammar/view-state.js';
import { labelFromValue, titleize } from '../../labels.js';
import { IdiomState, channelFrom, colorFrom, normalizeDataSource } from '../authoring.js';
export function bar(data) {
    return new BarState({ data: normalizeDataSource(data), mark: 'bar', encoding: {} });
}
export class BarState extends IdiomState {
    toSpec() {
        const spec = cloneState(this.state);
        delete spec.__grammar;
        const filters = [
            ...(spec.where ?? []),
            ...(spec.filter ? [spec.filter] : [])
        ];
        if (filters.length) {
            spec.transform = [
                ...filters.map((filter) => ({ filter })),
                ...(spec.transform ?? [])
            ];
        }
        delete spec.where;
        delete spec.filter;
        if (spec.granularity == null)
            delete spec.granularity;
        if (spec.guide == null)
            delete spec.guide;
        delete spec.aggregate;
        if (spec.semanticKey == null)
            delete spec.semanticKey;
        return pruneAuthoringState(compileViewSpec(externalizeScrollyViewSpec(spec), { scene: [] }));
    }
    x(field, options = {}) {
        const channel = channelFrom(field, { type: 'nominal', ...options });
        return this.with({
            key: this.state.key ?? channel.field,
            encoding: { x: channel }
        });
    }
    y(field, options = {}) {
        if (typeof options === 'string')
            options = { title: options };
        const { color, tooltip, ...channelOptions } = options;
        const channel = channelFrom(field, { type: 'quantitative', ...channelOptions });
        return this.with({
            encoding: {
                y: channel,
                ...(color ? { color: colorFrom(color) } : {}),
                ...(tooltip ? { tooltip: cloneState(tooltip) } : {})
            }
        });
    }
    where(selector) {
        if (selector == null) {
            return this.with({ where: [] }, 'focus');
        }
        const selectors = normalizeSelectors(selector);
        const identity = identityFromSelectors(this.state, selectors);
        const measureTitle = measureTitleFromSelectors(this.state, selectors);
        return this.with({
            where: setConstraints(this.state.where ?? [], selectors),
            ...(identity ?? {}),
            ...(measureTitle
                ? {
                    encoding: {
                        y: {
                            ...(this.state.encoding?.y ?? {}),
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
        }, 'focus');
    }
    flip(options = {}) {
        const domain = options.domain ?? options.scale?.domain;
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
    breakdown(segment = 'type', options = {}) {
        const category = options.category ?? this.state.encoding?.x?.field;
        const value = options.value ?? this.state.encoding?.y?.field ?? 'count';
        const { by, category: _cat, value: _val, ...rest } = options;
        const next = aggregateBarState(this, {
            ...rest,
            by: by ?? [category, segment].filter(Boolean),
            segment,
            value,
            layout: options.layout ?? 'stacked',
            op: options.op ?? 'sum'
        });
        return (options.title === false ? next : next.y(value, { title: options.title ?? titleize(value) }));
    }
    rollup(groupbyOrOptions = null, options = {}) {
        if (groupbyOrOptions && typeof groupbyOrOptions === 'object' && !Array.isArray(groupbyOrOptions)) {
            options = groupbyOrOptions;
            groupbyOrOptions = options.groupby ?? options.by ?? null;
        }
        const parent = groupbyOrOptions ?? options.groupby ?? options.by
            ?? this.state.encoding?.x?.field;
        const fields = asArray(parent).filter(Boolean);
        const value = options.value ?? this.state.encoding?.y?.field ?? 'count';
        const { color, title, by: _by, groupby: _groupby, value: _value, ...rest } = options;
        let nextState = aggregateBarState(this, {
            ...rest,
            groupby: fields,
            value,
            as: options.as ?? value,
            op: options.op ?? 'sum'
        });
        if (title)
            nextState = nextState.y(value, { title });
        if (color)
            nextState = nextState.color(color);
        return nextState;
    }
    segment(fieldOrConfig = {}, maybeConfig = {}) {
        const config = typeof fieldOrConfig === 'string'
            ? { ...maybeConfig, segment: fieldOrConfig }
            : fieldOrConfig;
        const state = this.state;
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
                groupby: tidy ? [category, segment].filter(Boolean) : config.groupby
            },
            ...(config.tooltip
                ? { encoding: { tooltip: cloneState(config.tooltip) } }
                : {})
        }, 'granularity');
    }
    layout(layout, options = {}) {
        const state = this.state;
        const next = this.with({
            granularity: state.granularity
                ? { ...state.granularity, layout }
                : undefined,
            guide: {
                ...(state.guide ?? {}),
                layout,
                staging: options.staging ?? state.guide?.staging
            }
        });
        return options.stage ? next.stage(options.stage) : next.with({}, 'guide');
    }
    stage(order, options = {}) {
        const state = this.state;
        return this.with({
            guide: {
                ...(state.guide ?? {}),
                staging: {
                    ...(state.guide?.staging ?? {}),
                    ...options,
                    order
                }
            }
        }, 'guide');
    }
}
// ─── Internal helpers ─────────────────────────────────────────────────────────
function aggregateBarState(view, config) {
    const normalized = normalizeAggregation(config, view.state);
    const { groupby, segment } = normalized;
    if (segment) {
        return view.with({
            key: normalized.key ?? [normalized.category, segment],
            where: clearConstraint(view.state.where ?? [], segment),
            granularity: {
                category: normalized.category,
                categoryTitle: normalized.categoryTitle,
                fields: [],
                labels: {},
                segment,
                value: normalized.value,
                valueTitle: normalized.valueTitle,
                layout: normalized.layout ?? 'stacked',
                color: cloneState(normalized.color),
                domain: normalized.domain,
                range: normalized.range,
                source: segment,
                groupby,
                op: normalized.op
            },
            __grammar: { measureSelector: null },
            ...(normalized.tooltip ? { encoding: { tooltip: cloneState(normalized.tooltip) } } : {})
        }, 'granularity');
    }
    return view.with({
        key: normalized.key ?? (groupby.length === 1 ? groupby[0] : groupby),
        granularity: null,
        guide: null,
        semanticKey: normalized.semanticKey ?? null,
        where: view.state.where,
        transform: [
            ...(view.state.transform ?? []),
            {
                aggregate: {
                    groupby,
                    fields: [{ op: normalized.op, field: normalized.value, as: normalized.as }]
                }
            }
        ],
        __grammar: { measureSelector: null }
    }, 'granularity');
}
function normalizeSelectors(selector) {
    const sel = selector;
    if (sel.field)
        return [cloneState(sel)];
    return Object.entries(sel).map(([field, equal]) => ({ field, equal }));
}
function setConstraints(constraints, selectors) {
    const fields = new Set(selectors.map((s) => s.field));
    const next = constraints.filter((c) => !fields.has(c.field));
    return [...next, ...selectors.map(cloneState)];
}
function clearConstraint(constraints, field) {
    return constraints.filter((c) => c.field !== field);
}
function identityFromSelectors(state, selectors) {
    const category = state.encoding?.x?.field;
    const measure = selectors.find((s) => s.field && Object.prototype.hasOwnProperty.call(s, 'equal') && isMeasureSelectorField(s.field));
    if (!category || !measure)
        return null;
    return {
        key: [category, measure.field],
        semanticKey: {
            entity: { field: category },
            measure: { field: measure.field }
        }
    };
}
function measureTitleFromSelectors(state, selectors) {
    const y = state.encoding?.y;
    if (!y?.field)
        return null;
    const measure = selectors.find((s) => s.field && Object.prototype.hasOwnProperty.call(s, 'equal') && isMeasureSelectorField(s.field));
    if (!measure)
        return null;
    const currentTitle = y.title ?? titleize(y.field);
    const previousMeasureTitle = state.__grammar
        ? state.__grammar?.measureSelector
            ? state.__grammar.measureSelector?.title
            : undefined
        : undefined;
    const titleCanFollowSelector = currentTitle === titleize(y.field) || currentTitle === previousMeasureTitle;
    return titleCanFollowSelector ? labelFromValue(measure.equal) : null;
}
function isMeasureSelectorField(field) {
    return (field === 'type' ||
        field === 'kind' ||
        field.endsWith('_type') ||
        field.endsWith('_kind'));
}
function normalizeAggregation(config, state) {
    const xField = state.encoding?.x?.field;
    const yField = state.encoding?.y?.field;
    const groupby = asArray((config.by ?? config.groupby ?? xField)).filter(Boolean);
    const value = (config.value ?? config.field ?? yField ?? 'value');
    const as = (config.as ?? value);
    const op = (config.op ?? config.use ?? 'sum');
    const segment = (config.segment ?? groupby.find((f) => f !== xField));
    const category = (config.category ?? xField ?? groupby.find((f) => f !== segment));
    return {
        ...config,
        groupby,
        category,
        categoryTitle: (config.categoryTitle ?? titleize(category ?? '')),
        segment,
        value,
        as,
        valueTitle: (config.valueTitle ?? (segment
            ? titleize(value)
            : state.encoding?.y?.title ?? titleize(as))),
        op
    };
}
function asArray(value) {
    if (Array.isArray(value))
        return value;
    return value == null ? [] : [value];
}
function pruneAuthoringState(spec) {
    const next = cloneState(spec);
    delete next.margin;
    const state = next.narrative?.state;
    if (!state)
        return next;
    const sceneState = (state.sceneState ?? {});
    const preservedSceneState = {};
    const focus = sceneState.focus ?? state.focus;
    const guide = sceneState.guide ?? state.guide;
    if (focus?.mode === 'highlight') {
        preservedSceneState.focus = focus;
    }
    if (hasCustomGuideStaging(guide)) {
        const g = guide;
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
    if (!Object.keys(state.sceneState).length)
        delete state.sceneState;
    if (!Object.keys(state).length)
        delete next.narrative.state;
    if (next.narrative && !Object.keys(next.narrative).length)
        delete next.narrative;
    return next;
}
function hasCustomGuideStaging(guide) {
    if (!guide?.staging)
        return false;
    const staging = guide.staging;
    if (staging.duration != null || staging.stagger != null)
        return true;
    if (!Array.isArray(staging.order))
        return false;
    return staging.order.join('|') !== defaultGuideOrder(guide).join('|');
}
function defaultGuideOrder(guide) {
    return guide.orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y'];
}
