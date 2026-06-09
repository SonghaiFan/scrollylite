export class BaseChart {
    constructor(deps = {}) {
        this.deps = deps;
    }
    renderer() {
        return this.render.bind(this);
    }
    render() {
        throw new Error(`${this.constructor.name} must implement render().`);
    }
    setCartesianState(chart, enc, scales, position) {
        chart.scales = { ...scales, orientation: "cartesian" };
        chart.channels = enc;
        chart.position = position;
    }
    drawCartesianAxes(chart, x, y, enc, d3) {
        this.deps.drawGrid(chart, y, d3);
        this.deps.drawXAxis(chart, x, enc.x?.title, d3);
        this.deps.drawYAxis(chart, y, enc.y?.title, d3);
    }
}
