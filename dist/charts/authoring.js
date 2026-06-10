import { compileViewSpec } from '../transitions/index.js';
import { externalizeScrollyViewSpec } from '../scrolly-meta.js';
import { ViewState, cloneState } from '../grammar/view-state.js';
import { titleize } from '../labels.js';
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
export function normalizeDataSource(data) {
    if (typeof data === 'string' && isDataUrl(data)) {
        return { url: data };
    }
    return data;
}
function isDataUrl(s) {
    return (s.startsWith('http://') ||
        s.startsWith('https://') ||
        s.startsWith('./') ||
        s.startsWith('../') ||
        s.startsWith('/') ||
        /\.(csv|json|tsv|arrow)(\?.*)?$/i.test(s));
}
// ─── IdiomState ───────────────────────────────────────────────────────────────
export class IdiomState extends ViewState {
    toSpec() {
        const spec = super.toSpec();
        return pruneAuthoringSpec(compileViewSpec(externalizeScrollyViewSpec(spec), { scene: [] }));
    }
    data(data) {
        return this.with({ data });
    }
    x(field, options = {}) {
        return this.channel('x', field, { type: 'quantitative', ...options });
    }
    y(field, options = {}) {
        return this.channel('y', field, { type: 'quantitative', ...options });
    }
    channel(name, field, options = {}) {
        return this.with({
            encoding: { [name]: channelFrom(field, options) }
        });
    }
    color(valueOrField, options = {}) {
        return this.with({ encoding: { color: colorFrom(valueOrField, options) } });
    }
    size(field, options = {}) {
        return this.channel('size', field, { type: 'quantitative', ...options });
    }
    key(fields) {
        const value = Array.isArray(fields) && fields.length === 1 ? fields[0] : fields;
        return this.with({ key: value });
    }
    tooltip(items) {
        const list = Array.isArray(items) ? items : [items];
        return this.with({
            encoding: {
                tooltip: cloneState(list.map((item) => typeof item === 'string' ? { field: item, title: titleize(item) } : item))
            }
        });
    }
    sort(field, order = 'ascending') {
        return this.with({
            transform: [
                ...(this.state.transform ?? []),
                { sort: { field, order } }
            ]
        });
    }
    transition(timing) {
        return this.with({ transition: timing });
    }
    filter(selector) {
        return this.with({ focus: selectorFrom(selector) }, 'focus');
    }
    where(selector) {
        return this.filter(selector);
    }
    highlight(selector, options = {}) {
        return this.with({
            focus: {
                mode: 'highlight',
                filter: selectorFrom(selector),
                ...(options.opacity != null ? { opacity: options.opacity } : {})
            }
        }, 'focus');
    }
    guide(config = {}) {
        return this.with({ guide: cloneState(config) }, 'guide');
    }
}
// ─── Channel factories ────────────────────────────────────────────────────────
export function channelFrom(field, options = {}) {
    if (field && typeof field === 'object') {
        const channel = { ...field, ...options };
        return {
            ...channel,
            ...(channel.field && !channel.title ? { title: titleize(channel.field) } : {})
        };
    }
    return {
        field: field,
        title: titleize(field),
        ...options
    };
}
export function colorFrom(valueOrField, options = {}) {
    if (valueOrField && typeof valueOrField === 'object')
        return cloneState(valueOrField);
    if (typeof valueOrField === 'string' && valueOrField.startsWith('#'))
        return { value: valueOrField };
    return options.value
        ? { value: options.value }
        : { field: valueOrField, type: 'nominal', ...options };
}
export function selectorFrom(selector = {}) {
    const sel = selector;
    if (sel.field)
        return cloneState(sel);
    const entries = Object.entries(sel);
    if (entries.length === 1) {
        const [field, equal] = entries[0];
        return { field, equal };
    }
    return cloneState(sel);
}
// ─── Spec pruning ─────────────────────────────────────────────────────────────
function pruneAuthoringSpec(spec) {
    const next = pruneEmpty(cloneState(spec));
    if (Array.isArray(next.transform) && !next.transform.length)
        delete next.transform;
    const state = next.narrative?.state;
    if (!state)
        return next;
    const sceneState = (state.sceneState ?? {});
    if (!sceneState.guide && shouldPreserveGuideState(state.guide)) {
        sceneState.guide = state.guide;
    }
    delete state.focus;
    delete state.guide;
    delete state.granularity;
    state.sceneState = sceneState;
    pruneSceneStateDefaults(state.sceneState);
    state.sceneState = pruneEmpty(state.sceneState);
    if (!Object.keys(state.sceneState).length)
        delete state.sceneState;
    if (!Object.keys(state).length)
        delete next.narrative.state;
    if (next.narrative && !Object.keys(next.narrative).length)
        delete next.narrative;
    return pruneEmpty(next);
}
function pruneSceneStateDefaults(sceneState) {
    const guide = sceneState.guide;
    if (guide) {
        if (guide.xScale === 'linear')
            delete guide.xScale;
        if (guide.yScale === 'linear')
            delete guide.yScale;
        if (isDefaultStaging(guide.staging))
            delete guide.staging;
    }
}
function shouldPreserveGuideState(guide) {
    if (!guide || typeof guide !== 'object' || Array.isArray(guide))
        return false;
    const semanticKeys = ['layout', 'x', 'y', 'group', 'value'];
    return semanticKeys.some((k) => guide[k] != null);
}
function isDefaultStaging(staging) {
    if (!staging || !Array.isArray(staging.order))
        return false;
    const s = staging;
    if (s.duration != null || s.stagger != null)
        return false;
    return s.order.join('|') === 'x|y';
}
function pruneEmpty(value) {
    if (Array.isArray(value)) {
        return value.map(pruneEmpty).filter((item) => item !== undefined);
    }
    if (!isPlainObject(value))
        return value == null ? undefined : value;
    const entries = Object.entries(value)
        .map(([k, v]) => [k, pruneEmpty(v)])
        .filter(([, v]) => v !== undefined)
        .filter(([, v]) => !isPlainObject(v) || Object.keys(v).length > 0);
    return Object.fromEntries(entries);
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
