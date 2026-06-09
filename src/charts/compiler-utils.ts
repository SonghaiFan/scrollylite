import type {
  ChannelSpec,
  FilterSpec,
  FocusSpec,
  SemanticKey,
  ViewSpec
} from '../types/index.js';
import { narrativeObjectKey, withNarrative } from '../scrolly-meta.js';
import { titleize } from '../labels.js';

type AnyRecord = Record<string, unknown>;

interface ObjectSpec {
  key?: string | string[] | null;
  semantic?: SemanticKey;
}

interface GuideStaging {
  order: string[];
  duration?: number;
  stagger?: unknown;
}

export function compileFilter(spec: ViewSpec, operationSpec: FocusSpec = {}): ViewSpec {
  const filter = operationSpec.filter || selectorToFilter(operationSpec);
  if (!filter) return spec;
  return withSceneState({
    ...spec,
    transform: [{ filter }, ...(spec.transform || [])]
  }, { focus: { filter } });
}

export function compileHighlight(spec: ViewSpec, operationSpec: FocusSpec = {}): ViewSpec {
  const filter = operationSpec.filter || selectorToFilter(operationSpec);
  if (!filter) return spec;
  return withSceneState(spec, {
    focus: {
      mode: 'highlight',
      filter,
      ...(operationSpec.opacity != null ? { opacity: operationSpec.opacity } : {})
    }
  });
}

export function compileCartesianCoordinate(spec: ViewSpec, operationSpec: AnyRecord = {}): ViewSpec {
  const encoding = cloneEncoding(spec.encoding);
  const shouldFlip = Boolean(operationSpec['flip']);

  if (shouldFlip) {
    [encoding['x'], encoding['y']] = [encoding['y'], encoding['x']];
  }

  if (operationSpec['x']) encoding['x'] = mergeXYChannel(encoding['x'] as ChannelSpec, operationSpec['x'] as ChannelSpec, 'quantitative');
  if (operationSpec['y']) encoding['y'] = mergeXYChannel(encoding['y'] as ChannelSpec, operationSpec['y'] as ChannelSpec, 'quantitative');

  return withSceneState(withObject({ ...spec, encoding }, {
    key: (operationSpec['key'] as string) || narrativeObjectKey(spec)
  }), {
    guide: {
      flip: shouldFlip,
      xScale: channelScaleType(encoding['x'] as ChannelSpec),
      yScale: channelScaleType(encoding['y'] as ChannelSpec),
      staging: resolveGuideStaging(operationSpec as AnyRecord, 'cartesian')
    }
  });
}

export function compileCartesianScale(spec: ViewSpec, operationSpec: AnyRecord = {}): ViewSpec {
  return compileCartesianCoordinate(spec, operationSpec);
}

export function identitySpec(spec: ViewSpec): ViewSpec {
  return spec;
}

export function withObject(spec: ViewSpec, objectSpec: ObjectSpec = {}): ViewSpec {
  const object: AnyRecord = {};
  if (objectSpec.key != null) object['key'] = objectSpec.key;
  if (objectSpec.semantic != null) object['semantic'] = semanticToNarrative(objectSpec.semantic);
  return Object.keys(object).length ? withNarrative(spec, { object: object as AnyRecord }) : spec;
}

export function withSceneState(spec: ViewSpec, sceneStatePatch: AnyRecord = {}): ViewSpec {
  return withNarrative(spec, { state: { sceneState: sceneStatePatch } });
}

export function semanticToNarrative(semanticKey: SemanticKey = {}): AnyRecord {
  const sk = semanticKey as AnyRecord;
  return {
    ...(sk['entity'] !== undefined ? { entity: semanticPartToNarrative(sk['entity']) } : {}),
    ...(sk['entities'] !== undefined ? { entity: semanticPartToNarrative(sk['entities']) } : {}),
    ...(sk['measure'] !== undefined ? { measure: semanticPartToNarrative(sk['measure']) } : {}),
    ...(sk['measures'] !== undefined ? { measure: semanticPartToNarrative(sk['measures']) } : {})
  };
}

export function semanticPartToNarrative(part: unknown): unknown {
  if (Array.isArray(part)) return part.map(semanticPartToNarrative);
  if (typeof part === 'string') return { field: part };
  if (part == null || typeof part !== 'object') return part;
  return { ...(part as AnyRecord) };
}

export function selectorToFilter(selector: AnyRecord = {}): FilterSpec | null {
  if (!selector['field']) return null;
  return {
    field: selector['field'] as string,
    ...copyDefined(selector, ['equal', 'notEqual', 'oneOf', 'gte', 'gt', 'lte', 'lt'])
  } as FilterSpec;
}

export function resolveGuideStaging(guideSpec: AnyRecord = {}, orientation: string): GuideStaging | null {
  if (guideSpec['staging'] === false) return null;

  const staging = guideSpec['staging'] && typeof guideSpec['staging'] === 'object'
    ? guideSpec['staging'] as AnyRecord
    : {};

  return {
    order: (staging['order'] as string[]) ||
      (guideSpec['stageOrder'] as string[]) ||
      (orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y']),
    duration: (staging['duration'] as number) || (guideSpec['stageDuration'] as number),
    stagger: staging['stagger'] || guideSpec['stagger']
  };
}

export function channelFromField(
  fieldOrChannel: string | ChannelSpec,
  title: string | null,
  fallbackType: string
): ChannelSpec {
  if (fieldOrChannel && typeof fieldOrChannel === 'object') {
    const channel = { ...fieldOrChannel } as ChannelSpec & { type?: string; title?: string };
    if (!channel.type) channel.type = fallbackType as ChannelSpec['type'];
    if (channel.field && !channel.title) channel.title = titleize(channel.field);
    return channel;
  }
  return {
    field: fieldOrChannel as string,
    type: fallbackType as ChannelSpec['type'],
    title: title || titleize(fieldOrChannel as string)
  };
}

export function mergeXYChannel(
  base: ChannelSpec = {},
  override: string | ChannelSpec = {},
  fallbackType: string
): ChannelSpec {
  if (typeof override === 'string') return channelFromField(override, null, fallbackType);
  const channel = { ...base, ...override } as ChannelSpec & { type?: string; title?: string; scale?: AnyRecord };
  if (!channel.type) channel.type = fallbackType as ChannelSpec['type'];
  if (channel.field && (!channel.title || (override as ChannelSpec).field)) {
    channel.title = (override as ChannelSpec & { title?: string }).title || titleize(channel.field);
  }
  if ((override as ChannelSpec & { scale?: AnyRecord }).scale || (base as ChannelSpec & { scale?: AnyRecord }).scale) {
    channel.scale = {
      ...((base as ChannelSpec & { scale?: AnyRecord }).scale || {}),
      ...((override as ChannelSpec & { scale?: AnyRecord }).scale || {})
    };
  }
  return channel;
}

export function channelScaleType(channel: ChannelSpec = {}): string {
  const ch = channel as ChannelSpec & { scale?: { type?: string }; scaleType?: string };
  return ch.scale?.type || ch.scaleType || 'linear';
}

export function aggregateFieldSpec(
  channelSpec: ChannelSpec = {},
  fallbackField: string,
  fallbackAs: string,
  fallbackOp: string
): { op: string; field: string; as: string } {
  const ch = channelSpec as ChannelSpec & { op?: string; as?: string };
  return {
    op: ch.op || fallbackOp,
    field: ch.field || fallbackField,
    as: ch.as || fallbackAs
  };
}

export function cloneViewSpec(viewSpec: ViewSpec): ViewSpec {
  return {
    ...viewSpec,
    transform: [...(viewSpec.transform || [])],
    encoding: cloneEncoding(viewSpec.encoding)
  };
}

export function cloneEncoding(encoding: ViewSpec['encoding'] = {}): Record<string, ChannelSpec | ChannelSpec[]> {
  return Object.fromEntries(
    Object.entries(encoding || {}).map(([channel, channelSpec]) => [
      channel,
      Array.isArray(channelSpec)
        ? channelSpec.map((item) => ({ ...item }))
        : { ...(channelSpec as ChannelSpec) }
    ])
  );
}

export function copyDefined(source: AnyRecord, keys: string[]): AnyRecord {
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}
