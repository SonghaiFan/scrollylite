import { narrativeUnit } from '../scrolly-meta.js';
import { normalizeChartIdiom } from './plugin.js';
export function createChartIdiomRegistry() {
    const idioms = new Map();
    return {
        register(idiom) {
            const normalized = normalizeRegisteredIdiom(idiom);
            idioms.set(normalized.key, normalized);
            return this;
        },
        get(markOrSpec) {
            const key = typeof markOrSpec === 'object'
                ? resolveMarkRendererKey(markOrSpec)
                : normalizeMarkRendererKey(markOrSpec);
            return idioms.get(key);
        },
        has(markOrSpec) {
            return Boolean(this.get(markOrSpec));
        },
        types() {
            return [...idioms.keys()].sort();
        }
    };
}
export function registerChartModules(registry, modules, deps = {}) {
    for (const module of modules) {
        const idiom = chartIdiomFromModule(module, deps);
        registry.register(idiom);
    }
    return registry;
}
export function createSpecCompilerRegistry(modules, context = {}) {
    const entries = modules
        .map((module) => {
        const plugin = pluginFromModule(module);
        const key = normalizeMarkRendererKey(plugin.key);
        const compiler = plugin.createSpecCompiler ? plugin.createSpecCompiler(context) : null;
        if (!key || !compiler)
            return null;
        return [
            key,
            {
                compiler,
                scenes: [...plugin.scenes],
                stateOperations: { ...plugin.stateOperations }
            }
        ];
    })
        .filter((entry) => entry !== null);
    return Object.fromEntries(entries);
}
// ─── Mark key resolution ──────────────────────────────────────────────────────
export function normalizeMarkRendererKey(markOrRenderer) {
    return normalizeMarkToken(String(markOrRenderer ?? ''));
}
export function normalizeChartType(type) {
    return normalizeMarkRendererKey(type);
}
export function resolveMarkRendererKey(viewSpec) {
    if (narrativeUnit(viewSpec))
        return 'unit';
    return normalizeMarkRendererKey(viewSpec.mark);
}
export function resolveChartType(viewSpec) {
    return resolveMarkRendererKey(viewSpec);
}
// ─── Internal ─────────────────────────────────────────────────────────────────
function normalizeRegisteredIdiom(idiom) {
    const key = normalizeMarkRendererKey(idiom.key);
    if (!key)
        throw new Error('Chart idiom key is required.');
    const normalized = normalizeChartIdiom({ ...idiom, key });
    if (typeof normalized.renderer !== 'function') {
        throw new Error(`Chart idiom "${key}" must provide a renderer function.`);
    }
    return { ...normalized, key };
}
function chartIdiomFromModule(module, deps) {
    const plugin = pluginFromModule(module);
    if (typeof plugin.createChartIdiom === 'function') {
        return plugin.createChartIdiom(deps);
    }
    throw new Error('Chart module must export plugin.createChartIdiom(deps).');
}
function pluginFromModule(module) {
    if (!module.plugin)
        throw new Error('Chart module must export plugin.');
    return module.plugin;
}
function normalizeMarkToken(value) {
    return value.replace(/\s+/g, '').toLowerCase();
}
