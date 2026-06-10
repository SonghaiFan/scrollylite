import * as core from "./index.js";
import { createChart as coreCreateChart, createPage as coreCreatePage, createStory as coreCreateStory } from "./scrollylite.js";
import { seq as coreSeq, Seq } from "./seq.js";
export const availableChartIdioms = core.availableChartIdioms;
export const bar = core.bar;
export const defineChartIdiom = core.defineChartIdiom;
export const line = core.line;
export const point = core.point;
export const registerChartIdiom = core.registerChartIdiom;
export const registerChartModule = core.registerChartModule;
export const story = core.story;
export const unit = core.unit;
// ── Sequence builder ──────────────────────────────────────────────────────────
export { Seq };
export function seq() {
    return coreSeq();
}
// ── Runtime (verbose names — backward compat) ─────────────────────────────────
export const createPage = coreCreatePage;
export function createStory(spec, options = {}) {
    return coreCreateStory(spec, {
        ...options,
        d3: options.d3 || globalThis['d3'],
        aq: options.aq || globalThis['aq']
    });
}
export function createChart(spec, options = {}) {
    return coreCreateChart(spec, {
        ...options,
        d3: options.d3 || globalThis['d3'],
        aq: options.aq || globalThis['aq']
    });
}
// ── Short-form runtime aliases (import * as sl from 'scrollylite') ─────────────
// sl.chart(seq | spec, opts) — standalone chart; accepts Seq or raw spec
// sl.render(spec, opts)      — full scrollytelling story with layout
// sl.page(spec, opts)        — layout shell only
export function chart(specOrSeq, options = {}) {
    const spec = specOrSeq instanceof Seq ? specOrSeq.toSpec() : specOrSeq;
    return createChart(spec, options);
}
export function render(spec, options = {}) {
    return createStory(spec, options);
}
export function page(spec, options = {}) {
    return coreCreatePage(spec, options);
}
const browserApi = {
    // Spec builders
    bar, line, point, unit, story, seq,
    // Short-form runtime
    chart, render, page,
    // Verbose runtime (backward compat)
    createChart, createStory, createPage,
    // Registration
    availableChartIdioms, defineChartIdiom, registerChartIdiom, registerChartModule,
};
globalThis['ScrollyLite'] = browserApi;
// Also expose as `sl` for import * as sl from '...' convention
globalThis['sl'] = browserApi;
