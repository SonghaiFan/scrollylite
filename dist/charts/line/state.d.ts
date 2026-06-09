import type { ChannelSpec, FocusSpec, ViewSpec } from '../../types/index.js';
interface LineState {
    focus: FocusSpec | null;
    seriesField: string | null;
}
interface LineSeries {
    key: string;
    rows: Record<string, unknown>[];
}
export declare function lineState(spec?: ViewSpec, enc?: Record<string, ChannelSpec>): LineState;
export declare function lineSeries(rows: Record<string, unknown>[], seriesField: string | null): LineSeries[];
export declare function focusedLineXScale(rows: Record<string, unknown>[], channel: ChannelSpec | undefined, chart: Record<string, unknown>, focus: FocusSpec | null, deps: Record<string, unknown>): unknown;
export {};
