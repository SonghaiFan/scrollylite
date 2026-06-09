import { compileCartesianCoordinate, compileCartesianScale, compileFilter, compileHighlight, identitySpec, selectorToFilter, withSceneState } from '../compiler-utils.js';
export function createLineSpecCompiler(_context = {}) {
    return {
        base: compileLineBase,
        operations: {
            filter: compileLineFilter,
            highlight: compileHighlight,
            coordinate: compileLineCoordinate,
            scale: compileLineScale,
            aggregate: compileLineAggregate,
            layout: compileLineLayout,
            series: compileLineSeries
        }
    };
}
function compileLineBase(spec, _context = {}) {
    return identitySpec(spec);
}
function compileLineFilter(spec, focusSpec = {}, _context = {}) {
    const filter = focusSpec['filter'] || selectorToFilter(focusSpec);
    if (!filter)
        return spec;
    if (focusSpec['mode'] === 'filter' || focusSpec['mode'] === 'highlight') {
        return focusSpec['mode'] === 'highlight'
            ? compileHighlight(spec, focusSpec)
            : compileFilter(spec, focusSpec);
    }
    return withSceneState({ ...spec }, {
        focus: {
            filter,
            mode: focusSpec['mode'] || 'rangeCrop',
            crop: focusSpec['crop'] !== false
        }
    });
}
function compileLineCoordinate(spec, operationSpec = {}, _context = {}) {
    return compileCartesianCoordinate(spec, operationSpec);
}
function compileLineScale(spec, operationSpec = {}, _context = {}) {
    return compileCartesianScale(spec, operationSpec);
}
function compileLineAggregate(spec, granularitySpec = {}, context = {}) {
    return compileLineSeries(spec, granularitySpec, context);
}
function compileLineSeries(spec, granularitySpec = {}, _context = {}) {
    const mode = granularitySpec['mode'] || 'series';
    const encoding = { ...(spec.encoding || {}) };
    const seriesField = granularitySpec['series'] ||
        granularitySpec['field'] ||
        encoding['color']?.['field'];
    if (mode === 'series' && seriesField) {
        encoding['color'] = granularitySpec['color'] || {
            field: seriesField,
            type: 'nominal',
            range: granularitySpec['range'] || [
                'var(--sl-series-1)',
                'var(--sl-series-2)',
                'var(--sl-series-3)'
            ]
        };
    }
    if (mode === 'single' && granularitySpec['color']) {
        encoding['color'] = granularitySpec['color'];
    }
    return withSceneState({ ...spec, encoding: encoding }, {
        granularity: {
            mode,
            seriesField: mode === 'series' ? seriesField : null
        }
    });
}
function compileLineLayout(spec, _operationSpec = {}, _context = {}) {
    return spec;
}
