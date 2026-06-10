import type { ChannelSpec, ViewSpec } from '../../types/index.js';
import { IdiomState, colorFrom, normalizeDataSource } from '../authoring.js';

export interface UnitViewState extends ViewSpec {
  mark: 'unit';
  unit?: Record<string, unknown>;
}

export function unit(data: unknown): UnitState {
  return new UnitState({ data: normalizeDataSource(data) as UnitViewState['data'], mark: 'unit', encoding: {}, unit: {} });
}

export class UnitState extends IdiomState<UnitViewState> {
  value(field: string, options: { maxUnits?: number } = {}): this {
    return this.with({
      unit: {
        ...(this.state['unit'] as Record<string, unknown> || {}),
        value: field,
        ...(options.maxUnits ? { maxUnits: options.maxUnits } : {})
      }
    });
  }

  label(field: string): this {
    return this.with({
      unit: { ...(this.state['unit'] as Record<string, unknown> || {}), label: field }
    });
  }

  columns(value: number): this {
    return this.with({
      unit: { ...(this.state['unit'] as Record<string, unknown> || {}), columns: value }
    });
  }

  radius(value: number): this {
    return this.with({
      unit: { ...(this.state['unit'] as Record<string, unknown> || {}), radius: value }
    });
  }

  group(field: string, options: Record<string, unknown> = {}): this {
    const { color, ...layoutOptions } = options;
    return unitGuide(this, {
      layout: 'groupedGrid',
      group: field,
      ...layoutOptions,
      ...(color ? { color: colorFrom(color as string) } : {})
    }) as unknown as this;
  }

  timeline(field: string, options: Record<string, unknown> = {}): this {
    return unitGuide(this, {
      layout: 'timeline',
      ...unitAxis(this, 'x', field, options)
    }) as unknown as this;
  }

  dodge(field: string, options: Record<string, unknown> = {}): this {
    return unitGuide(this, {
      layout: 'dodge',
      ...unitAxis(this, 'x', field, options)
    }) as unknown as this;
  }
}

function unitGuide(state: UnitState, guide: Record<string, unknown>): UnitState {
  return state.guide(guide) as unknown as UnitState;
}

function unitAxis(
  state: UnitState,
  channel: string,
  field: string,
  options: Record<string, unknown> = {}
): Record<string, unknown> {
  const { title, type, ...rest } = options;
  const current = (state.state['encoding'] as Record<string, ChannelSpec>)?.[channel];
  if ((field == null || field === current?.field) && title == null && type == null) {
    return rest;
  }
  return {
    [channel]: {
      field,
      type: (type as string) || 'quantitative',
      ...(title ? { title } : {})
    },
    ...rest
  };
}
