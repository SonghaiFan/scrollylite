import type { ChartContext, D3Lib, EncodingSpec, ViewSpec } from '../types/index.js';
export declare abstract class BaseChart<S extends ViewSpec = ViewSpec> {
    protected readonly deps: Record<string, unknown>;
    constructor(deps?: Record<string, unknown>);
    renderer(): (chart: ChartContext, rows: unknown[], spec: S, tooltip: unknown, d3: D3Lib) => void;
    abstract render(chart: ChartContext, rows: unknown[], spec: S, tooltip: unknown, d3: D3Lib): void;
    protected setCartesianState(chart: ChartContext, enc: EncodingSpec, scales: unknown, position: unknown): void;
    protected drawCartesianAxes(chart: ChartContext, x: unknown, y: unknown, enc: EncodingSpec, d3: D3Lib): void;
}
