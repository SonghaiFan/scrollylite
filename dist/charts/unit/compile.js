import { cloneEncoding, compileFilter, compileHighlight, copyDefined, identitySpec, resolveGuideStaging, withObject, withSceneState } from '../compiler-utils.js';
import { narrativeObjectKey, narrativeUnit, withNarrative } from '../../scrolly-meta.js';
export function createUnitSpecCompiler(_context = {}) {
    return {
        base: compileUnitBase,
        operations: {
            filter: compileFilter,
            highlight: compileHighlight,
            layout: compileUnitLayout,
            unitLayout: compileUnitLayout,
            encode: compileUnitEncoding
        }
    };
}
function compileUnitBase(spec, _context = {}) {
    return identitySpec(spec);
}
function compileUnitLayout(spec, guideSpec = {}, _context = {}) {
    const unit = {
        ...(narrativeUnit(spec) || {}),
        ...copyDefined(guideSpec, [
            'layout', 'columns', 'groupColumns', 'radius', 'x', 'y',
            'group', 'value', 'label', 'maxUnits'
        ])
    };
    const encoding = cloneEncoding(spec.encoding);
    if (guideSpec['color'])
        encoding['color'] = guideSpec['color'];
    return withSceneState(withObject(withNarrative({ ...spec, encoding: encoding }, { unit }), {
        key: guideSpec['key'] || narrativeObjectKey(spec)
    }), {
        guide: {
            layout: unit['layout'] || 'grid',
            x: unit['x'] || null,
            y: unit['y'] || null,
            group: unit['group'] || null,
            value: unit['value'] || null,
            staging: resolveGuideStaging(guideSpec, 'unit')
        }
    });
}
function compileUnitEncoding(spec, operationSpec = {}, context = {}) {
    return compileUnitLayout(spec, operationSpec, context);
}
