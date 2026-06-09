import type { AnyRecord, ChartOptions, ChartRuntime, PageOptions, PageRuntime, RuntimeOptions, StoryRuntime } from "./types.js";
export declare function registerChartIdiom(idiom: any): void;
export declare function registerChartModule(module: any): void;
export declare function availableChartIdioms(): string[];
export declare function createStory(spec: AnyRecord, options: RuntimeOptions): Promise<StoryRuntime>;
export declare function createPage(spec: AnyRecord, options?: PageOptions): Promise<PageRuntime>;
export declare function createChart(spec: AnyRecord, options: ChartOptions): Promise<ChartRuntime>;
