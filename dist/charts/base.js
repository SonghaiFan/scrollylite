export class BaseChart {
    constructor(deps = {}) {
        this.deps = deps;
    }
    renderer() {
        return this.render.bind(this);
    }
    setCartesianState(chart, enc, scales, position) {
        chart.scales = { ...scales, orientation: 'cartesian' };
        chart.channels = enc;
        chart.position = position;
    }
    drawCartesianAxes(chart, x, y, enc, d3) {
        const deps = this.deps;
        deps.drawGrid?.(chart, y, d3);
        deps.drawXAxis?.(chart, x, enc.x?.title, d3);
        deps.drawYAxis?.(chart, y, enc.y?.title, d3);
    }
}
