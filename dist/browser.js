import * as core from "./index.js";
export const availableChartIdioms = core.availableChartIdioms;
export const bar = core.bar;
export const createPage = core.createPage;
export const defineChartIdiom = core.defineChartIdiom;
export const line = core.line;
export const point = core.point;
export const registerChartIdiom = core.registerChartIdiom;
export const registerChartModule = core.registerChartModule;
export const story = core.story;
export const unit = core.unit;
export function createChart(spec, options = {}) {
    return core.createChart(spec, {
        ...options,
        d3: options.d3 || globalThis.d3,
        aq: options.aq || globalThis.aq
    });
}
export function createStory(spec, options = {}) {
    return core.createStory(spec, {
        ...options,
        d3: options.d3 || globalThis.d3,
        aq: options.aq || globalThis.aq
    });
}
const browserApi = {
    availableChartIdioms,
    bar,
    createChart,
    createPage,
    createStory,
    defineChartIdiom,
    line,
    point,
    registerChartIdiom,
    registerChartModule,
    story,
    unit
};
globalThis.ScrollyLite = browserApi;
