import type { StageSpec, ViewSpec } from '../../types/index.js';
import { IdiomState, colorFrom, normalizeDataSource } from '../authoring.js';

export interface LineViewState extends ViewSpec {
  mark: 'line';
  curve?: string;
  strokeWidth?: number;
  pointSize?: number;
}

export function line(data: unknown): LineState {
  return new LineState({ data: normalizeDataSource(data) as LineViewState['data'], mark: 'line', encoding: {} });
}

export class LineState extends IdiomState<LineViewState> {
  override x(field: string | import('../../types/index.js').ChannelSpec, options: Partial<import('../../types/index.js').ChannelSpec> = {}): this {
    return super.x(field, { type: 'nominal', ...options });
  }

  override y(field: string | import('../../types/index.js').ChannelSpec, options: Partial<import('../../types/index.js').ChannelSpec> = {}): this {
    return super.y(field, { type: 'quantitative', ...options });
  }

  curve(value: string): this {
    return this.with({ curve: value });
  }

  strokeWidth(value: number): this {
    return this.with({ strokeWidth: value });
  }

  pointSize(value: number): this {
    return this.with({ pointSize: value });
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

  breakdown(field: string, options: Record<string, unknown> = {}): this {
    return this.with({
      granularity: {
        mode: 'series',
        series: field,
        ...(options['color']
          ? Array.isArray(options['color'])
            ? { range: options['color'] as unknown[] }
            : { color: colorFrom(options['color'] as string) }
          : {}),
        ...(options['range'] ? { range: options['range'] as unknown[] } : {})
      }
    }, 'granularity') as this;
  }

  rollup(groupbyOrOptions: Record<string, unknown> = {}): this {
    const options = groupbyOrOptions && typeof groupbyOrOptions === 'object'
      ? groupbyOrOptions
      : {};
    return this.with({
      granularity: {
        mode: 'single',
        ...(options['color'] ? { color: colorFrom(options['color'] as string) } : {})
      }
    }, 'granularity') as this;
  }
}
