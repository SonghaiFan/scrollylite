import { compileViewSpec } from "../transitions/index.js";
import { externalizeScrollyViewSpec } from "../scrolly-meta.js";
import { ViewState, cloneState } from "../grammar/view-state.js";
import { titleize } from "../labels.js";
export { titleize };
export class IdiomState extends ViewState {
    toSpec() {
        const spec = super.toSpec();
        return pruneAuthoringSpec(compileViewSpec(externalizeScrollyViewSpec(spec), { scene: [] }));
    }
    data(data) {
        return this.with({ data });
    }
    x(field, options = {}) {
        return this.channel("x", field, { type: "quantitative", ...options });
    }
    y(field, options = {}) {
        return this.channel("y", field, { type: "quantitative", ...options });
    }
    channel(name, field, options = {}) {
        return this.with({
            encoding: {
                [name]: channelFrom(field, options)
            }
        });
    }
    color(valueOrField, options = {}) {
        return this.with({ encoding: { color: colorFrom(valueOrField, options) } });
    }
    size(field, options = {}) {
        return this.channel("size", field, { type: "quantitative", ...options });
    }
    key(fields) {
        return this.with({ key: Array.isArray(fields) && fields.length === 1 ? fields[0] : fields });
    }
    tooltip(items) {
        const tooltip = Array.isArray(items) ? items : [items];
        return this.with({
            encoding: {
                tooltip: cloneState(tooltip.map((item) => (typeof item === "string" ? { field: item, title: titleize(item) } : item)))
            }
        });
    }
    sort(field, order = "ascending") {
        return this.with({
            transform: [
                ...(this.state.transform || []),
                { sort: { field, order } }
            ]
        });
    }
    transition(timing) {
        return this.with({ transition: timing });
    }
    filter(selector) {
        return this.with({ focus: selectorFrom(selector) }, "focus");
    }
    where(selector) {
        return this.filter(selector);
    }
    highlight(selector, options = {}) {
        return this.with({
            focus: {
                mode: "highlight",
                filter: selectorFrom(selector),
                ...(options.opacity != null ? { opacity: options.opacity } : {})
            }
        }, "focus");
    }
    guide(config = {}) {
        return this.with({ guide: cloneState(config) }, "guide");
    }
}
export function channelFrom(field, options = {}) {
    if (field && typeof field === "object") {
        const channel = { ...field, ...options };
        return {
            ...channel,
            ...(channel.field && !channel.title ? { title: titleize(channel.field) } : {})
        };
    }
    return {
        field,
        title: titleize(field),
        ...options
    };
}
export function colorFrom(valueOrField, options = {}) {
    if (valueOrField && typeof valueOrField === "object")
        return cloneState(valueOrField);
    if (typeof valueOrField === "string" && valueOrField.startsWith("#"))
        return { value: valueOrField };
    return options.value
        ? { value: options.value }
        : { field: valueOrField, type: "nominal", ...options };
}
export function selectorFrom(selector = {}) {
    if (selector?.field)
        return cloneState(selector);
    const entries = Object.entries(selector || {});
    if (entries.length === 1) {
        const [field, equal] = entries[0];
        return { field, equal };
    }
    return cloneState(selector);
}
function pruneAuthoringSpec(spec) {
    const next = pruneEmpty(cloneState(spec));
    if (Array.isArray(next.transform) && !next.transform.length)
        delete next.transform;
    const state = next.narrative?.state;
    if (!state)
        return next;
    const sceneState = state.sceneState || {};
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
function pruneSceneStateDefaults(sceneState = {}) {
    const guide = sceneState.guide;
    if (guide) {
        if (guide.xScale === "linear")
            delete guide.xScale;
        if (guide.yScale === "linear")
            delete guide.yScale;
        if (isDefaultStaging(guide.staging))
            delete guide.staging;
    }
}
function shouldPreserveGuideState(guide = null) {
    if (!guide || !isPlainObject(guide))
        return false;
    const semanticKeys = ["layout", "x", "y", "group", "value"];
    return semanticKeys.some((key) => guide[key] != null);
}
function isDefaultStaging(staging = null) {
    if (!staging || !Array.isArray(staging.order))
        return false;
    const hasCustomTiming = staging.duration != null || staging.stagger != null;
    if (hasCustomTiming)
        return false;
    return staging.order.join("|") === "x|y";
}
function pruneEmpty(value) {
    if (Array.isArray(value)) {
        return value
            .map(pruneEmpty)
            .filter((item) => item !== undefined);
    }
    if (!isPlainObject(value))
        return value == null ? undefined : value;
    const entries = Object.entries(value)
        .map(([key, child]) => [key, pruneEmpty(child)])
        .filter(([, child]) => child !== undefined)
        .filter(([, child]) => !isPlainObject(child) || Object.keys(child).length);
    return Object.fromEntries(entries);
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
