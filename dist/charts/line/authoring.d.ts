import type { ViewSpec } from '../../types/index.js';
import { IdiomState } from '../authoring.js';
export interface LineViewState extends ViewSpec {
    mark: 'line';
    curve?: string;
    strokeWidth?: number;
    pointSize?: number;
}
export declare function line(data: unknown): LineState;
export declare class LineState extends IdiomState<LineViewState> {
    x(field: string | import('../../types/index.js').ChannelSpec, options?: Partial<import('../../types/index.js').ChannelSpec>): this;
    y(field: string | import('../../types/index.js').ChannelSpec, options?: Partial<import('../../types/index.js').ChannelSpec>): this;
    curve(value: string): this;
    strokeWidth(value: number): this;
    pointSize(value: number): this;
    flip(options?: Record<string, unknown>): this;
    breakdown(field: string, options?: Record<string, unknown>): this;
    rollup(groupbyOrOptions?: Record<string, unknown>): this;
}
