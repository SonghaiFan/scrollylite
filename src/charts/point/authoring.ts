import type { StageSpec, ViewSpec } from '../../types/index.js';
import { IdiomState, normalizeDataSource } from '../authoring.js';

export interface PointViewState extends ViewSpec {
  mark: 'point';
  size?: number;
}

export function point(data: unknown): PointState {
  return new PointState({ data: normalizeDataSource(data) as PointViewState['data'], mark: 'point', encoding: {} });
}

export class PointState extends IdiomState<PointViewState> {
  override x(field: string | import('../../types/index.js').ChannelSpec, options: Partial<import('../../types/index.js').ChannelSpec> = {}): this {
    return super.x(field, { type: 'quantitative', ...options });
  }

  override y(field: string | import('../../types/index.js').ChannelSpec, options: Partial<import('../../types/index.js').ChannelSpec> = {}): this {
    return super.y(field, { type: 'quantitative', ...options });
  }

  pointSize(value: number): this {
    return this.with({ size: value });
  }

  radius(value: number): this {
    return this.pointSize(value);
  }

  flip(options: Record<string, unknown> = {}): this {
    return this.guide({
      flip: true,
      ...(options['x'] ? { x: options['x'] } : {}),
      ...(options['y'] ? { y: options['y'] } : {}),
      ...(options['staging'] || options['stage'] || options['order']
        ? {
            staging: {
              ...(typeof options['staging'] === 'object' ? options['staging'] as Partial<StageSpec> : {}),
              order: ((options['order'] || options['stage'] || (options['staging'] as Record<string, unknown>)?.['order'] || ['x', 'y']) as Array<'x' | 'y'>)
            } as StageSpec
          }
        : {})
    });
  }

  rollup(groupby: string | string[] | null, options: Record<string, unknown> = {}): this {
    const fields = Array.isArray(groupby) ? groupby : [groupby].filter(Boolean) as string[];
    const key = options['key'] || (fields.length === 1 ? fields[0] : fields);
    return this.with({
      granularity: definedState({
        mode: 'aggregate',
        groupby: fields,
        key,
        x: options['x'],
        y: options['y'],
        countAs: options['countAs'],
        sizeRange: options['sizeRange']
      })
    }, 'granularity') as this;
  }

  breakdown(detail: string | Record<string, unknown> | null = null, options: Record<string, unknown> = {}): this {
    const config = detail && typeof detail === 'object'
      ? detail as Record<string, unknown>
      : { detail, ...options };
    const detailKey = config['detail'] || this.state['key'];
    return this.with({
      granularity: definedState({
        mode: 'detail',
        key: config['key'] || detailKey,
        detail: detailKey
      })
    }, 'granularity') as this;
  }
}

function definedState(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}
