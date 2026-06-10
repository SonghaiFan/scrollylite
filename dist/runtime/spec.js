import { dataName } from '../scrolly-meta.js';
import { normalizeScrollDriverConfig } from '../scroll-drivers/index.js';
import { uniqueTokens } from './utils.js';
export function compileSpec(spec) {
    if (!spec || typeof spec !== 'object') {
        throw new Error('ScrollyLite requires a story spec object.');
    }
    const steps = Array.isArray(spec.steps) ? spec.steps : [];
    if (!steps.length) {
        throw new Error('ScrollyLite spec must contain at least one step.');
    }
    const layout = {
        offset: 0.55,
        nav: true,
        progress: true,
        scroll: {},
        ...(spec.layout || {}),
        preset: spec.layout?.['preset'] || 'floatToText'
    };
    layout['scroll'] = normalizeScrollDriverConfig(layout['scroll'] || {});
    const normalizedSteps = steps.map((step, index) => ({
        ...step,
        id: step.id || `step-${index + 1}`,
        transition: normalizeStepTransition(step.transition),
        action: normalizeStepAction(step, index),
        views: normalizeStepViews(step)
    }));
    const viewData = collectViewDataSources(normalizedSteps);
    return {
        ...spec,
        data: { ...(spec.data || {}), ...viewData.data },
        views: (spec.views || { main: {} }),
        theme: (spec.theme || {}),
        layout,
        steps: viewData.steps
    };
}
export function storySignature(spec) {
    return (spec.steps || []).map((step, index) => ({
        index,
        id: step.id,
        title: step.title,
        transition: step.transition?.['scene'] || [],
        action: step['action'] || []
    }));
}
export async function loadData(dataSpec, d3) {
    if (!d3) {
        throw new Error('ScrollyLite data loading requires D3. Pass { d3 } to createStory().');
    }
    const entries = await Promise.all(Object.entries(dataSpec).map(async ([name, source]) => {
        if (Array.isArray(source))
            return [name, source];
        const src = source;
        if (Array.isArray(src['values']))
            return [name, src['values']];
        if (!src['url'])
            return [name, []];
        if ((src['type'] || 'csv') === 'csv') {
            const rows = await d3['csv'](src['url'], d3['autoType']);
            return [name, rows];
        }
        if (src['type'] === 'json') {
            const rows = await d3['json'](src['url']);
            return [name, Array.isArray(rows) ? rows : rows['values'] || []];
        }
        throw new Error(`Unsupported data type for "${name}": ${src['type']}`);
    }));
    return Object.fromEntries(entries);
}
export function viewRows(dataSpec, datasets) {
    if (Array.isArray(dataSpec))
        return dataSpec;
    if (Array.isArray(dataSpec?.['values']))
        return dataSpec['values'];
    const name = dataName(dataSpec);
    return name ? (datasets[name] || []) : [];
}
export function domainTransforms(transforms = []) {
    return transforms.filter((transform) => {
        const t = transform;
        return !t['filter'] && !t['limit'];
    });
}
function normalizeStepTransition(transition = {}) {
    return { scene: uniqueTokens(transition['scene'] || []) };
}
function normalizeStepAction(step = {}, index = 0) {
    const fallback = index === 0 ? ['step', 'tooltip', 'enter'] : ['step', 'tooltip'];
    const action = step['action'];
    return uniqueTokens(action?.length ? action : fallback);
}
function normalizeStepViews(step) {
    if (step['views'])
        return step['views'];
    if (step['view'])
        return { main: step['view'] };
    return {};
}
function collectViewDataSources(steps) {
    const data = {};
    // Deduplicate: same URL → same generated name, loaded only once
    const urlToName = new Map();
    const normalizedSteps = steps.map((step, stepIndex) => ({
        ...step,
        views: Object.fromEntries(Object.entries(step['views'] || {}).map(([viewId, viewSpec]) => {
            if (!viewSpec?.['data']?.['url'])
                return [viewId, viewSpec];
            const url = viewSpec['data']['url'];
            const explicitName = viewSpec['data']['name'];
            let name;
            if (explicitName) {
                name = explicitName;
            }
            else if (urlToName.has(url)) {
                name = urlToName.get(url); // reuse existing name for same URL
            }
            else {
                name = `__data_${stepIndex + 1}_${viewId}`;
                urlToName.set(url, name);
            }
            data[name] = normalizeUrlDataSource(viewSpec['data']);
            return [viewId, { ...viewSpec, data: { name } }];
        }))
    }));
    return { data, steps: normalizedSteps };
}
function normalizeUrlDataSource(dataSpec) {
    return {
        ...dataSpec,
        type: dataSpec['type'] || dataSpec['format']?.['type'] || dataTypeFromUrl(dataSpec['url'])
    };
}
function dataTypeFromUrl(url = '') {
    return String(url).toLowerCase().endsWith('.json') ? 'json' : 'csv';
}
