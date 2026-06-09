import { keyAccessor } from "../identity/semantic-key.js";
import { narrativeState } from "../scrolly-meta.js";
import { clearSceneTransitionProgress } from "../transition-progress.js";
import { hasScene } from "../transitions/index.js";
import { markAxisInactive } from "./marks.js";
import { clamp } from "./utils.js";
export function getScene(node, viewConfig, d3) {
    if (node.__scrollyLiteScene)
        return node.__scrollyLiteScene;
    const width = Math.max(320, node.clientWidth || 720);
    const height = viewConfig.height || 500;
    node.innerHTML = "";
    const svg = d3
        .select(node)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img");
    const frame = svg.append("g").attr("class", "sl-frame");
    const grid = frame.append("g").attr("class", "sl-grid");
    const markRoot = frame.append("g").attr("class", "sl-mark-root");
    const scene = {
        node,
        svg,
        frame,
        grid,
        markRoot,
        xAxis: svg.append("g").attr("class", "sl-axis sl-x-axis"),
        yAxis: svg.append("g").attr("class", "sl-axis sl-y-axis"),
        xLabel: svg.append("text").attr("class", "sl-axis-label sl-x-label"),
        yLabel: svg.append("text").attr("class", "sl-axis-label sl-y-label"),
        legend: svg.append("g").attr("class", "sl-legend"),
        unitLabel: svg.append("text").attr("class", "sl-unit-label"),
        textLayer: svg.append("foreignObject").attr("class", "sl-text-layer"),
        markLayers: new Map(),
        previousSpec: null,
        width,
        height
    };
    scene.granularityLayer = markRoot
        .append("g")
        .attr("class", "sl-scene-layer sl-granularity-layer");
    scene.guideLayer = frame.append("g").attr("class", "sl-scene-layer sl-guide-layer");
    scene.empty = d3
        .select(node)
        .append("div")
        .attr("class", "sl-empty")
        .style("display", "none");
    node.__scrollyLiteScene = scene;
    return scene;
}
export function resizeScene(scene, width, height) {
    scene.width = width;
    scene.height = height;
    scene.svg.attr("viewBox", `0 0 ${width} ${height}`);
}
export function resetSceneToEmptySource(scene) {
    clearSceneTransitionProgress(scene, { finish: false });
    scene.grid.interrupt().selectAll("*").remove();
    scene.xAxis.interrupt().style("opacity", 0).selectAll("*").remove();
    scene.yAxis.interrupt().style("opacity", 0).selectAll("*").remove();
    markAxisInactive(scene.grid);
    markAxisInactive(scene.xAxis);
    markAxisInactive(scene.yAxis);
    scene.xLabel.interrupt().style("opacity", 0).text("");
    scene.yLabel.interrupt().style("opacity", 0).text("");
    scene.legend.interrupt().style("opacity", 0).selectAll("*").remove();
    scene.guideLayer?.interrupt().selectAll("*").remove();
    scene.granularityLayer?.interrupt().selectAll("*").remove();
    scene.markLayers?.forEach((layer) => {
        layer.interrupt().selectAll("*").remove();
    });
    scene.unitLabel.interrupt().text("").style("opacity", 0);
    scene.textLayer.interrupt().html("").style("opacity", 0);
    scene.previousSpec = null;
}
export function applySceneTransitions(chart, rows, spec) {
    const sceneTypes = chart.sceneTransition?.scene || [];
    const state = narrativeState(spec);
    chart.scene.node.dataset.sceneTransition = sceneTypes.join(" ");
    chart.scene.node.dataset.sceneState = Object.keys(state.sceneState || {}).join(" ");
    chart.scene.node.dataset.transitionPlan = chart.transitionPlan?.update?.stages
        ? chart.transitionPlan.update.stages.map((stage) => stage.axis).join(" ")
        : "";
    clearSceneLayer(chart.scene.granularityLayer, chart.transition.base);
    applyGuideScene(chart, rows, spec);
}
function applyGuideScene(chart, rows, spec) {
    const enabled = hasScene(chart.sceneTransition, "guide");
    const cue = narrativeState(spec).guide?.cue;
    const layer = chart.scene.guideLayer;
    if (!enabled || !cue || !chart.position || !rows.length) {
        clearSceneLayer(layer, chart.transition.base);
        return;
    }
    const guideSpec = cue === true ? { select: "max", by: spec.encoding?.y?.field } : cue;
    const row = pickSceneRow(rows, guideSpec, spec.encoding || {});
    const x = row ? chart.position.x(row) : NaN;
    const y = row ? chart.position.y(row) : NaN;
    const data = Number.isFinite(x) && Number.isFinite(y) ? [{ row, x, y }] : [];
    layer.raise().interrupt().style("opacity", 1);
    joinGuideLine(layer, "sl-guide-rule-x", data, chart.transition.base, (d) => ({
        x1: d.x,
        x2: d.x,
        y1: 0,
        y2: chart.innerHeight
    }));
    joinGuideLine(layer, "sl-guide-rule-y", data, chart.transition.base, (d) => ({
        x1: 0,
        x2: chart.innerWidth,
        y1: d.y,
        y2: d.y
    }));
    layer
        .selectAll("circle.sl-guide-dot")
        .data(data, (d) => sceneRowKey(d.row, spec))
        .join((enter) => enter
        .append("circle")
        .attr("class", "sl-guide-dot")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", 0)
        .transition(chart.transition.base)
        .attr("r", 5), (update) => update
        .transition(chart.transition.base)
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", 5), (exit) => exit.transition(chart.transition.base).attr("r", 0).remove());
}
function joinGuideLine(layer, className, data, transition, attrs) {
    const setAttrs = (selection) => selection
        .attr("x1", (d) => attrs(d).x1)
        .attr("x2", (d) => attrs(d).x2)
        .attr("y1", (d) => attrs(d).y1)
        .attr("y2", (d) => attrs(d).y2);
    layer
        .selectAll(`line.${className}`)
        .data(data, (d) => sceneRowKey(d.row))
        .join((enter) => setAttrs(enter
        .append("line")
        .attr("class", `sl-guide-rule ${className}`))
        .style("opacity", 0)
        .transition(transition)
        .style("opacity", 1), (update) => setAttrs(update.transition(transition)).style("opacity", 1), (exit) => exit.transition(transition).style("opacity", 0).remove());
}
function clearSceneLayer(layer, transition) {
    layer.interrupt().style("opacity", 1);
    layer.selectAll("*").transition(transition).style("opacity", 0).remove();
}
function pickSceneRow(rows, selector = {}, encoding = {}) {
    if (!rows.length)
        return null;
    if (Number.isFinite(selector.index))
        return rows[clamp(selector.index, 0, rows.length - 1)];
    if (selector.select === "first")
        return rows[0];
    if (selector.select === "last")
        return rows[rows.length - 1];
    if (selector.field || selector.equal != null || selector.value != null || selector.oneOf) {
        return rows.find((row) => rowMatchesScene(row, selector)) || null;
    }
    const field = selector.by || encoding.y?.field || encoding.x?.field;
    if (field && selector.select === "min") {
        return rows.reduce((best, row) => (Number(row[field]) < Number(best[field]) ? row : best), rows[0]);
    }
    if (field) {
        return rows.reduce((best, row) => (Number(row[field]) > Number(best[field]) ? row : best), rows[0]);
    }
    return rows[rows.length - 1];
}
function rowMatchesScene(row, selector = {}, selectedRow = null) {
    if (!row)
        return false;
    if (selector.field) {
        const value = row[selector.field];
        if ("equal" in selector)
            return value === selector.equal;
        if ("value" in selector)
            return value === selector.value;
        if ("oneOf" in selector)
            return selector.oneOf.includes(value);
        if ("gte" in selector && value < selector.gte)
            return false;
        if ("gt" in selector && value <= selector.gt)
            return false;
        if ("lte" in selector && value > selector.lte)
            return false;
        if ("lt" in selector && value >= selector.lt)
            return false;
        return Boolean(value);
    }
    return selectedRow ? row === selectedRow : false;
}
function sceneRowKey(row, spec = {}) {
    if (!row)
        return "guide";
    const key = keyAccessor(spec, spec.encoding?.x?.field || spec.encoding?.y?.field);
    return String(key(row, 0));
}
