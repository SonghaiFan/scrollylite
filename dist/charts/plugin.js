export const DEFAULT_SCENES = ['focus', 'guide', 'granularity', 'observation'];
export const DEFAULT_STATE_OPERATIONS = {
    focus: 'filter',
    guide: 'coordinate',
    granularity: 'aggregate'
};
export function defineChartIdiom(config) {
    if (!config.key)
        throw new Error('Chart idiom plugin requires a key.');
    const { createSpecCompiler } = config;
    const scenes = uniqueStrings(config.scenes ?? [...DEFAULT_SCENES]);
    const stateOperations = { ...DEFAULT_STATE_OPERATIONS, ...(config.stateOperations ?? {}) };
    function createChartIdiom(deps) {
        const idiom = config.createIdiom
            ? config.createIdiom(deps)
            : createRuntimeIdiom(config, deps);
        return normalizeChartIdiom({
            ...idiom,
            key: idiom.key || config.key,
            scenes: idiom.scenes ?? scenes,
            stateOperations: { ...stateOperations, ...(idiom.stateOperations ?? {}) }
        }, createSpecCompiler);
    }
    return {
        key: config.key,
        scenes,
        stateOperations,
        createChartIdiom,
        ...(createSpecCompiler ? { createSpecCompiler } : {})
    };
}
export function identityPrepare(spec) {
    return spec;
}
export function emptyTransitionPlan() {
    return {};
}
export function defaultMargin() {
    return {};
}
export function normalizeChartIdiom(idiom, createSpecCompiler) {
    const prepareSpec = idiom.prepareSpec ?? identityPrepare;
    const resolveTransitionPlan = idiom.resolveTransitionPlan ?? emptyTransitionPlan;
    const renderer = idiom.renderer;
    if (!renderer)
        throw new Error(`Chart idiom "${idiom.key}" must provide a renderer function.`);
    const scenes = uniqueStrings([...(idiom.scenes ?? DEFAULT_SCENES)]);
    const stateOperations = { ...DEFAULT_STATE_OPERATIONS, ...(idiom.stateOperations ?? {}) };
    return {
        inspect: {},
        ...idiom,
        scenes,
        stateOperations,
        renderer,
        prepareSpec,
        resolveTransitionPlan,
        intermediateSpecs: idiom.intermediateSpecs,
        intermediateSpec: idiom.intermediateSpec ?? null,
        defaultMargin: idiom.defaultMargin ?? defaultMargin,
        ...(createSpecCompiler ? { createSpecCompiler } : {})
    };
}
// ─── Internal ─────────────────────────────────────────────────────────────────
function createRuntimeIdiom(config, deps) {
    const renderer = config.createRenderer
        ? config.createRenderer(deps)
        : config.renderer;
    return {
        key: config.key,
        renderer,
        prepareSpec: config.prepareSpec ?? identityPrepare,
        resolveTransitionPlan: config.transition?.plan ?? emptyTransitionPlan,
        intermediateSpecs: config.transition?.intermediateSpecs,
        intermediateSpec: config.transition?.intermediateSpec,
        defaultMargin: config.defaults?.margin ?? defaultMargin,
        inspect: config.inspect ?? {},
        scenes: config.scenes,
        stateOperations: config.stateOperations
    };
}
function uniqueStrings(values) {
    return [...new Set(values.filter(Boolean).map(String))];
}
