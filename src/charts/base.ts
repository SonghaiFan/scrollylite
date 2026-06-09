import type { ChartContext, D3Lib, EncodingSpec, ViewSpec } from '../types/index.js';

export abstract class BaseChart<S extends ViewSpec = ViewSpec> {
  constructor(protected readonly deps: Record<string, unknown> = {}) {}

  renderer(): (chart: ChartContext, rows: unknown[], spec: S, tooltip: unknown, d3: D3Lib) => void {
    return this.render.bind(this);
  }

  abstract render(
    chart: ChartContext,
    rows: unknown[],
    spec: S,
    tooltip: unknown,
    d3: D3Lib
  ): void;

  protected setCartesianState(
    chart: ChartContext,
    enc: EncodingSpec,
    scales: unknown,
    position: unknown
  ): void {
    chart.scales = { ...(scales as object), orientation: 'cartesian' };
    chart.channels = enc;
    chart.position = position;
  }

  protected drawCartesianAxes(
    chart: ChartContext,
    x: unknown,
    y: unknown,
    enc: EncodingSpec,
    d3: D3Lib
  ): void {
    const deps = this.deps as {
      drawGrid?: (chart: ChartContext, y: unknown, d3: D3Lib) => void;
      drawXAxis?: (chart: ChartContext, x: unknown, title: string | undefined, d3: D3Lib) => void;
      drawYAxis?: (chart: ChartContext, y: unknown, title: string | undefined, d3: D3Lib) => void;
    };
    deps.drawGrid?.(chart, y, d3);
    deps.drawXAxis?.(chart, x, enc.x?.title, d3);
    deps.drawYAxis?.(chart, y, enc.y?.title, d3);
  }
}
