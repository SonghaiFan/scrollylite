import type { ChannelSpec, SpecCompiler, ViewSpec } from '../../types/index.js';
import { narrativeObjectKey } from '../../scrolly-meta.js';
import { titleize } from '../../labels.js';
import { colorField } from './encoding.js';
import {
  aggregateFieldSpec,
  compileCartesianCoordinate,
  compileCartesianScale,
  compileFilter,
  compileHighlight,
  identitySpec,
  mergeXYChannel,
  withObject,
  withSceneState
} from '../compiler-utils.js';

type AnyRecord = Record<string, unknown>;

export function createPointSpecCompiler(_context: AnyRecord = {}): SpecCompiler {
  return {
    base: compilePointBase,
    operations: {
      filter: compileFilter,
      highlight: compileHighlight,
      coordinate: compilePointCoordinate,
      scale: compilePointScale,
      aggregate: compilePointAggregate,
      layout: compilePointLayout
    }
  };
}

function compilePointBase(spec: ViewSpec, _context: AnyRecord = {}): ViewSpec {
  return identitySpec(spec);
}

function compilePointCoordinate(spec: ViewSpec, operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return compileCartesianCoordinate(spec, operationSpec);
}

function compilePointScale(spec: ViewSpec, operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return compileCartesianScale(spec, operationSpec);
}

function compilePointAggregate(spec: ViewSpec, granularitySpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  const mode = (granularitySpec['mode'] as string) || 'detail';
  const authoredGroupby = normalizeFields(granularitySpec['groupby']);
  const parentField =
    (granularitySpec['parentField'] as string) ||
    parentFromGroupby(authoredGroupby) ||
    colorField(spec.encoding as Record<string, ChannelSpec>);
  const detail =
    (granularitySpec['detail'] as string) ||
    narrativeObjectKey(spec) as string ||
    (spec.encoding?.['key'] as ChannelSpec)?.field ||
    (spec.encoding?.['x'] as ChannelSpec)?.field;

  if (mode === 'aggregate') {
    const groupby = authoredGroupby.length ? authoredGroupby : [parentField].filter(Boolean) as string[];
    const x = mergeXYChannel(spec.encoding?.['x'] as ChannelSpec, (granularitySpec['x'] as ChannelSpec) || spec.encoding?.['x'] as ChannelSpec, 'quantitative');
    const y = mergeXYChannel(spec.encoding?.['y'] as ChannelSpec, (granularitySpec['y'] as ChannelSpec) || spec.encoding?.['y'] as ChannelSpec, 'quantitative');
    const xAs = (granularitySpec['x'] as ChannelSpec & { as?: string })?.as || x.field!;
    const yAs = (granularitySpec['y'] as ChannelSpec & { as?: string })?.as || y.field!;
    const countAs = (granularitySpec['countAs'] as string) || 'count';
    const xAggregate = aggregateFieldSpec(granularitySpec['x'] as ChannelSpec, x.field!, xAs, 'mean');
    const yAggregate = aggregateFieldSpec(granularitySpec['y'] as ChannelSpec, y.field!, yAs, 'mean');
    const fields = [xAggregate, yAggregate, { op: 'count', as: countAs }];

    return withSceneState(withObject({
      ...spec,
      transform: [...(spec.transform || []), { aggregate: { groupby, fields } }],
      encoding: {
        ...spec.encoding,
        x: { ...x, field: xAs, title: (granularitySpec['x'] as ChannelSpec & { title?: string })?.title || aggregateTitle(xAggregate.op, x.title || x.field!) },
        y: { ...y, field: yAs, title: (granularitySpec['y'] as ChannelSpec & { title?: string })?.title || aggregateTitle(yAggregate.op, y.title || y.field!) },
        ...(granularitySpec['size'] !== false
          ? { size: { field: countAs, type: 'quantitative', ...(granularitySpec['sizeRange'] ? { range: granularitySpec['sizeRange'] } : {}) } as ChannelSpec }
          : {})
      }
    }, { key: (granularitySpec['key'] as string) || groupby as unknown as string }), {
      granularity: { mode, groupby, countAs }
    });
  }

  return withSceneState(withObject({ ...spec }, {
    key: (granularitySpec['key'] as string) || detail as string
  }), {
    granularity: { mode: 'detail', detail }
  });
}

function compilePointLayout(spec: ViewSpec, _operationSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  return spec;
}

function aggregateTitle(op: string, title: string): string {
  if (!op || op === 'sum' || new RegExp(`^${op}\\s`, 'i').test(title)) return titleize(title);
  return `${titleize(op)} ${lowerFirst(titleize(title))}`;
}

function lowerFirst(value: string): string {
  return String(value || '').replace(/^\w/, (letter) => letter.toLowerCase());
}

function normalizeFields(value: unknown): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean) as string[];
}

function parentFromGroupby(groupby: string[]): string | string[] | null {
  if (!groupby.length) return null;
  return groupby.length === 1 ? groupby[0] : groupby;
}
