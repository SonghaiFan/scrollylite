import type { ViewSpec } from '../../types/index.js';
import { IdiomState } from '../authoring.js';
export interface UnitViewState extends ViewSpec {
    mark: 'unit';
    unit?: Record<string, unknown>;
}
export declare function unit(data: ViewSpec['data']): UnitState;
export declare class UnitState extends IdiomState<UnitViewState> {
    value(field: string, options?: {
        maxUnits?: number;
    }): this;
    label(field: string): this;
    columns(value: number): this;
    radius(value: number): this;
    group(field: string, options?: Record<string, unknown>): this;
    timeline(field: string, options?: Record<string, unknown>): this;
    dodge(field: string, options?: Record<string, unknown>): this;
}
