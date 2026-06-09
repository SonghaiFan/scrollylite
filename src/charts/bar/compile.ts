import type { BarOrientation, ChannelSpec, SpecCompiler, ViewSpec } from '../../types/index.js';
import {
  narrativeObjectKey,
  narrativeSemanticKey,
  narrativeState
} from '../../scrolly-meta.js';
import {
  barOffsetChannelName,
  barOrientationFromEncoding
} from './layout/index.js';
import { barSegmentField } from './semantic.js';
import {
  channelFromField,
  cloneEncoding,
  compileFilter,
  compileHighlight,
  identitySpec,
  resolveGuideStaging,
  withObject,
  withSceneState
} from '../compiler-utils.js';

type AnyRecord = Record<string, unknown>;
type Encoding = Record<string, ChannelSpec>;

export function createBarSpecCompiler(_context: AnyRecord = {}): SpecCompiler {
  return {
    base: compileBarBase,
    operations: {
      filter: compileFilter,
      highlight: compileHighlight,
      coordinate: compileBarCoordinate,
      scale: compileBarScale,
      aggregate: compileBarAggregate,
      layout: compileBarLayout
    }
  };
}

function compileBarBase(spec: ViewSpec, _context: AnyRecord = {}): ViewSpec {
  return withDefaultBarSemanticKey(identitySpec(spec));
}

function compileBarCoordinate(spec: ViewSpec, guideSpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  let workingSpec = spec;
  const layout = (guideSpec['layout'] as string) || null;
  const flipsOrientation = Boolean(guideSpec['flip']);

  if (guideSpec['layout']) {
    const segmentField = barSegmentField(workingSpec);
    const state = narrativeState(workingSpec);
    const stateRecord = state as unknown as AnyRecord;
    const granularity = (stateRecord['sceneState'] as AnyRecord | undefined)?.['granularity'] || stateRecord['granularity'] || {};
    const orientation: BarOrientation = flipsOrientation
      ? oppositeOrientation(barOrientationFromEncoding(workingSpec.encoding as Encoding || {}))
      : barOrientationFromEncoding(workingSpec.encoding as Encoding || {});
    workingSpec = withSceneState({
      ...workingSpec,
      encoding: encodingWithBarLayout(workingSpec.encoding as Encoding, layout, segmentField, orientation) as ViewSpec['encoding']
    }, {
      guide: { layout, staging: resolveGuideStaging(guideSpec, orientation) },
      ...(segmentField ? { granularity: { ...(granularity as AnyRecord), layout } } : {})
    });

    if (!flipsOrientation && !guideSpec['scale']) return workingSpec;
  }

  let encoding = cloneEncoding(workingSpec.encoding) as Encoding;
  const currentOrientation = barOrientationFromEncoding(encoding);
  const catCh = categoryChannel(encoding);
  const measCh = measureChannel(encoding);
  const category = channelFromField(catCh as ChannelSpec, (catCh as ChannelSpec)?.title || null, 'nominal');
  const measure = channelFromField(measCh as ChannelSpec, (measCh as ChannelSpec)?.title || null, 'quantitative');
  const orientation: BarOrientation = flipsOrientation ? oppositeOrientation(currentOrientation) : currentOrientation;

  if (orientation === 'horizontal') {
    encoding['x'] = { ...measure, ...((guideSpec['scale'] as AnyRecord | undefined) ? { domain: (guideSpec['scale'] as AnyRecord)['domain'] as unknown[] } : {}) };
    encoding['y'] = category;
  } else {
    encoding['x'] = category;
    encoding['y'] = { ...measure, ...((guideSpec['scale'] as AnyRecord | undefined) ? { domain: (guideSpec['scale'] as AnyRecord)['domain'] as unknown[] } : {}) };
  }

  const state = narrativeState(workingSpec);
  const stateRecord = state as unknown as AnyRecord;
  const resolvedLayout =
    layout ||
    (stateRecord['sceneState'] as AnyRecord | undefined)?.['granularity'] as AnyRecord | undefined && ((stateRecord['sceneState'] as AnyRecord)['granularity'] as AnyRecord)?.['layout'] ||
    (stateRecord['granularity'] as AnyRecord | undefined)?.['layout'] ||
    (stateRecord['sceneState'] as AnyRecord | undefined)?.['guide'] as AnyRecord | undefined && ((stateRecord['sceneState'] as AnyRecord)['guide'] as AnyRecord)?.['layout'] ||
    (stateRecord['guide'] as AnyRecord | undefined)?.['layout'] ||
    null;

  encoding = encodingWithBarLayout(encoding, resolvedLayout as string | null, barSegmentField(workingSpec), orientation) as Encoding;

  return withSceneState(withObject({
    ...workingSpec,
    margin: {
      ...(orientation === 'horizontal' ? { left: 86, right: 42 } : {}),
      ...((workingSpec as AnyRecord)['margin'] || {})
    },
    encoding: encoding as ViewSpec['encoding']
  }, {
    key: (guideSpec['key'] as string) || narrativeObjectKey(workingSpec) as string || (category as ChannelSpec).field || ''
  }), {
    guide: {
      ...(resolvedLayout ? { layout: resolvedLayout } : {}),
      orientation,
      ...(flipsOrientation ? { flip: true } : {}),
      scale: guideSpec['scale'] || null,
      staging: resolveGuideStaging(guideSpec, orientation)
    }
  });
}

function compileBarScale(spec: ViewSpec, operationSpec: AnyRecord = {}, context: AnyRecord = {}): ViewSpec {
  return compileBarCoordinate(spec, operationSpec, context);
}

function compileBarLayout(spec: ViewSpec, operationSpec: AnyRecord = {}, context: AnyRecord = {}): ViewSpec {
  return compileBarCoordinate(spec, operationSpec, context);
}

function compileBarAggregate(spec: ViewSpec, granularitySpec: AnyRecord = {}, _context: AnyRecord = {}): ViewSpec {
  const encoding = spec.encoding as Encoding || {};
  const categoryField = (granularitySpec['category'] as string) || (encoding['x'] as ChannelSpec)?.field || 'category';
  const segmentField = (granularitySpec['segment'] as string) || (granularitySpec['segmentAs'] as string) || 'segment';
  const valueField = (granularitySpec['value'] as string) || (granularitySpec['valueAs'] as string) || (encoding['y'] as ChannelSpec)?.field || 'value';
  const sourceField = (granularitySpec['source'] as string) || (granularitySpec['sourceAs'] as string) || '__measure';
  const fields = (granularitySpec['fields'] as string[]) || [];
  const labels = (granularitySpec['labels'] as Record<string, string>) || {};
  const segmentDomain = (granularitySpec['domain'] as string[]) ||
    ((granularitySpec['color'] as AnyRecord | undefined)?.['domain'] as string[]) ||
    fields.map((field) => labels[field] || field);
  const groupby = (granularitySpec['groupby'] as string[]) || [categoryField, sourceField, segmentField];
  const transform = [...(spec.transform || [])];

  if (fields.length) {
    transform.push({ fold: { fields, as: [segmentField, valueField], sourceAs: sourceField, labels } });
  }

  if (granularitySpec['aggregate'] !== false) {
    transform.push({
      aggregate: {
        groupby,
        fields: [{ op: (granularitySpec['op'] as string) || 'sum', field: valueField, as: valueField }]
      }
    });
  }

  const layout = (granularitySpec['layout'] as string) || 'stacked';
  const newEncoding: Encoding = {
    ...cloneEncoding(spec.encoding) as Encoding,
    x: channelFromField(categoryField, (granularitySpec['categoryTitle'] as string) || (encoding['x'] as ChannelSpec)?.title || null, 'nominal'),
    y: channelFromField(valueField, (granularitySpec['valueTitle'] as string) || (encoding['y'] as ChannelSpec)?.title || null, 'quantitative'),
    color: (granularitySpec['color'] as ChannelSpec) || {
      field: segmentField,
      type: 'nominal',
      ...(segmentDomain.length ? { domain: segmentDomain } : {}),
      range: (granularitySpec['range'] as string[]) || ['var(--sl-series-1)', 'var(--sl-series-2)']
    }
  };

  if (layout === 'grouped') {
    (newEncoding as AnyRecord)['xOffset'] = { field: segmentField, type: 'nominal' };
  } else {
    delete (newEncoding as AnyRecord)['xOffset'];
    delete (newEncoding as AnyRecord)['yOffset'];
  }

  return withSceneState(withObject({
    ...spec,
    transform,
    encoding: newEncoding as ViewSpec['encoding']
  }, {
    key: (granularitySpec['key'] as string) || [categoryField, segmentField] as unknown as string,
    semantic: (granularitySpec['semantic'] as AnyRecord) ||
      (granularitySpec['semanticKey'] as AnyRecord) ||
      semanticKeyFromParts({ field: categoryField }, { field: sourceField }) as unknown
  }), {
    granularity: {
      layout,
      fields,
      segmentField,
      sourceField,
      segments: segmentDomain.length ? segmentDomain : null,
      valueField
    }
  });
}

function withDefaultBarSemanticKey(spec: ViewSpec): ViewSpec {
  if (narrativeSemanticKey(spec)) return spec;
  const semanticKey = semanticKeyFromEncoding(spec.encoding as Encoding || {});
  return semanticKey ? withObject(spec, { semantic: semanticKey as unknown as import('../../types/index.js').SemanticKey }) : spec;
}

function encodingWithBarLayout(
  encoding: Encoding = {},
  layout: string | null = 'stacked',
  segmentField: string | null = null,
  orientation = barOrientationFromEncoding(encoding)
): Encoding {
  const next = cloneEncoding(encoding) as Encoding;
  if (layout === 'grouped' && segmentField) {
    delete (next as AnyRecord)['xOffset'];
    delete (next as AnyRecord)['yOffset'];
    (next as AnyRecord)[barOffsetChannelName(orientation)] = { field: segmentField, type: 'nominal' };
    return next;
  }
  delete (next as AnyRecord)['xOffset'];
  delete (next as AnyRecord)['yOffset'];
  return next;
}

function semanticKeyFromEncoding(encoding: Encoding, previousSemanticKey: AnyRecord | null = null): AnyRecord | null {
  const cat = categoryChannel(encoding);
  const meas = measureChannel(encoding);
  if (!cat?.field || !meas?.field) return previousSemanticKey;
  return semanticKeyFromParts(
    (previousSemanticKey?.['entity'] || previousSemanticKey?.['entities'] || { field: cat.field }) as AnyRecord,
    { value: meas.field }
  );
}

function semanticKeyFromParts(entity: AnyRecord, measure: AnyRecord): AnyRecord {
  return { entity, measure };
}

function categoryChannel(encoding: Encoding = {}): ChannelSpec | null {
  if (['nominal', 'ordinal'].includes((encoding['x'] as ChannelSpec)?.type || '')) return encoding['x'] as ChannelSpec;
  if (['nominal', 'ordinal'].includes((encoding['y'] as ChannelSpec)?.type || '')) return encoding['y'] as ChannelSpec;
  return (encoding['x'] as ChannelSpec)?.field ? (encoding['x'] as ChannelSpec) : (encoding['y'] as ChannelSpec) || null;
}

function measureChannel(encoding: Encoding = {}): ChannelSpec | null {
  if ((encoding['y'] as ChannelSpec)?.type === 'quantitative') return encoding['y'] as ChannelSpec;
  if ((encoding['x'] as ChannelSpec)?.type === 'quantitative') return encoding['x'] as ChannelSpec;
  return (encoding['y'] as ChannelSpec)?.field ? (encoding['y'] as ChannelSpec) : (encoding['x'] as ChannelSpec) || null;
}

function oppositeOrientation(orientation: BarOrientation): BarOrientation {
  return orientation === 'horizontal' ? 'vertical' : 'horizontal';
}
