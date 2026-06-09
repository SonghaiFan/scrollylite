export class BaseChart {
    constructor(deps?: {});
    deps: {};
    renderer(): any;
    render(): void;
    setCartesianState(chart: any, enc: any, scales: any, position: any): void;
    drawCartesianAxes(chart: any, x: any, y: any, enc: any, d3: any): void;
}
