import * as core from "./index.js";
import {
  createChart as coreCreateChart,
  createPage as coreCreatePage,
  createStory as coreCreateStory
} from "./scrollylite.js";

type AnyRecord = Record<string, any>;

export const availableChartIdioms = core.availableChartIdioms;
export const bar = core.bar;
export const createPage = coreCreatePage;
export const defineChartIdiom = core.defineChartIdiom;
export const line = core.line;
export const point = core.point;
export const registerChartIdiom = core.registerChartIdiom;
export const registerChartModule = core.registerChartModule;
export const story = core.story;
export const unit = core.unit;

export function createStory(spec: AnyRecord, options: AnyRecord = {}) {
  return coreCreateStory(spec, {
    ...options,
    d3: options.d3 || (globalThis as AnyRecord)['d3'],
    aq: options.aq || (globalThis as AnyRecord)['aq']
  });
}

export function createChart(spec: AnyRecord, options: AnyRecord = {}) {
  return coreCreateChart(spec, {
    ...options,
    d3: options.d3 || (globalThis as AnyRecord)['d3'],
    aq: options.aq || (globalThis as AnyRecord)['aq']
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

(globalThis as AnyRecord)['ScrollyLite'] = browserApi;
