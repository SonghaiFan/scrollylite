import type { SpecCompiler, ViewSpec } from '../../types/index.js';
import {
  cloneEncoding,
  compileFilter,
  compileHighlight,
  copyDefined,
  identitySpec,
  resolveGuideStaging,
  withObject,
  withSceneState
} from '../compiler-utils.js';
import { narrativeObjectKey, narrativeUnit, withNarrative } from '../../scrolly-meta.js';

type AnyRecord = Record<string, unknown>;

export function createUnitSpecCompiler(_context: AnyRecord = {}): SpecCompiler {
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

function compileUnitBase(spec: ViewSpec, _context: AnyRecord = {}): ViewSpec {
  return identitySpec(spec);
}

function compileUnitLayout(spec: ViewSpec, guideSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  const unit = {
    ...(narrativeUnit(spec) || {}),
    ...copyDefined(guideSpec, [
      'layout', 'columns', 'groupColumns', 'radius', 'x', 'y',
      'group', 'value', 'label', 'maxUnits'
    ])
  };
  const encoding = cloneEncoding(spec.encoding);
  if (guideSpec['color']) (encoding as AnyRecord)['color'] = guideSpec['color'];

  return withSceneState(withObject(withNarrative({ ...spec, encoding: encoding as ViewSpec['encoding'] }, { unit }), {
    key: (guideSpec['key'] as string) || narrativeObjectKey(spec) as string
  }), {
    guide: {
      layout: (unit['layout'] as string) || 'grid',
      x: unit['x'] || null,
      y: unit['y'] || null,
      group: unit['group'] || null,
      value: unit['value'] || null,
      staging: resolveGuideStaging(guideSpec, 'unit')
    }
  });
}

function compileUnitEncoding(spec: ViewSpec, operationSpec: AnyRecord = {}, context: AnyRecord = {}): ViewSpec {
  return compileUnitLayout(spec, operationSpec, context);
}
