import type { ViewSpec } from '../../types/index.js';
import { IdiomState } from '../authoring.js';
export interface PointViewState extends ViewSpec {
    mark: 'point';
    size?: number;
}
export declare function point(data: ViewSpec['data']): PointState;
export declare class PointState extends IdiomState<PointViewState> {
    x(field: string | import('../../types/index.js').ChannelSpec, options?: Partial<import('../../types/index.js').ChannelSpec>): this;
    y(field: string | import('../../types/index.js').ChannelSpec, options?: Partial<import('../../types/index.js').ChannelSpec>): this;
    pointSize(value: number): this;
    radius(value: number): this;
    flip(options?: Record<string, unknown>): this;
    rollup(groupby: string | string[] | null, options?: Record<string, unknown>): this;
    breakdown(detail?: string | Record<string, unknown> | null, options?: Record<string, unknown>): this;
}
