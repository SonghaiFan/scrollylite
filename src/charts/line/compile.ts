import type { FocusSpec, SpecCompiler, ViewSpec } from '../../types/index.js';
import {
  compileCartesianCoordinate,
  compileCartesianScale,
  compileFilter,
  compileHighlight,
  identitySpec,
  selectorToFilter,
  withSceneState
} from '../compiler-utils.js';

type AnyRecord = Record<string, unknown>;

export function createLineSpecCompiler(_context: AnyRecord = {}): SpecCompiler {
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

function compileLineBase(spec: ViewSpec, _context: AnyRecord = {}): ViewSpec {
  return identitySpec(spec);
}

function compileLineFilter(spec: ViewSpec, focusSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  const filter = (focusSpec['filter'] as FocusSpec | undefined) || selectorToFilter(focusSpec);
  if (!filter) return spec;

  if (focusSpec['mode'] === 'filter' || focusSpec['mode'] === 'highlight') {
    return focusSpec['mode'] === 'highlight'
      ? compileHighlight(spec, focusSpec as FocusSpec)
      : compileFilter(spec, focusSpec as FocusSpec);
  }

  return withSceneState({ ...spec }, {
    focus: {
      filter,
      mode: (focusSpec['mode'] as string) || 'rangeCrop',
      crop: focusSpec['crop'] !== false
    }
  });
}

function compileLineCoordinate(spec: ViewSpec, operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return compileCartesianCoordinate(spec, operationSpec);
}

function compileLineScale(spec: ViewSpec, operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return compileCartesianScale(spec, operationSpec);
}

function compileLineAggregate(spec: ViewSpec, granularitySpec: AnyRecord = {}, context: AnyRecord = {}): ViewSpec {
  return compileLineSeries(spec, granularitySpec, context);
}

function compileLineSeries(spec: ViewSpec, granularitySpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  const mode = (granularitySpec['mode'] as string) || 'series';
  const encoding = { ...(spec.encoding || {}) } as Record<string, unknown>;
  const seriesField =
    (granularitySpec['series'] as string) ||
    (granularitySpec['field'] as string) ||
    (encoding['color'] as AnyRecord | undefined)?.['field'] as string | undefined;

  if (mode === 'series' && seriesField) {
    encoding['color'] = granularitySpec['color'] || {
      field: seriesField,
      type: 'nominal',
      range: (granularitySpec['range'] as string[]) || [
        'var(--sl-series-1)',
        'var(--sl-series-2)',
        'var(--sl-series-3)'
      ]
    };
  }

  if (mode === 'single' && granularitySpec['color']) {
    encoding['color'] = granularitySpec['color'];
  }

  return withSceneState(
    { ...spec, encoding: encoding as ViewSpec['encoding'] },
    {
      granularity: {
        mode,
        seriesField: mode === 'series' ? seriesField : null
      }
    }
  );
}

function compileLineLayout(spec: ViewSpec, _operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return spec;
}
