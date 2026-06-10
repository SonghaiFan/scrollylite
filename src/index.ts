export {
  availableChartIdioms,
  createChart,
  createPage,
  createStory,
  registerChartIdiom,
  registerChartModule
} from "./scrollylite.js";
export {
  bar,
  line,
  point,
  story,
  unit
} from "./grammar/index.js";
export { defineChartIdiom } from "./charts/plugin.js";

// ── Sequence builder ──────────────────────────────────────────────────────────
export { seq, Seq } from "./seq.js";
export type { SeqState } from "./seq.js";

// ── Short-form runtime aliases (import * as sl from 'scrollylite') ────────────
// These wrappers accept either a compiled StorySpec OR a Seq object directly.
// sl.chart(seq, opts)  — standalone animated chart
// sl.render(seq, opts) — full scrollytelling story with layout
// sl.page(spec, opts)  — layout shell only
import { createChart, createStory, createPage } from "./scrollylite.js";
import { Seq as SeqClass } from "./seq.js";

type AnyRecord = Record<string, unknown>;

function resolveSpec(input: SeqClass | AnyRecord): AnyRecord {
  return input instanceof SeqClass ? (input.toSpec() as AnyRecord) : input;
}

export async function chart(specOrSeq: SeqClass | AnyRecord, options: AnyRecord = {}) {
  const runtime = await createChart(resolveSpec(specOrSeq), options as never);
  // Sync Seq cursor to chart's initialStep so first sq.next() → step 1, not step 0
  if (specOrSeq instanceof SeqClass && specOrSeq.length > 0) {
    const init = typeof options['initialStep'] === 'number' ? (options['initialStep'] as number) : 0;
    specOrSeq.syncCursor(init);
  }
  return runtime;
}

export async function render(specOrSeq: SeqClass | AnyRecord, options: AnyRecord = {}) {
  const runtime = await createStory(resolveSpec(specOrSeq), options as never);
  if (specOrSeq instanceof SeqClass && specOrSeq.length > 0) {
    specOrSeq.syncCursor(0);
  }
  return runtime;
}

export function page(specOrSeq: SeqClass | AnyRecord, options: AnyRecord = {}) {
  return createPage(resolveSpec(specOrSeq), options as never);
}

export type {
  ActionEvent,
  ChartOptions,
  ChartRuntime,
  PageOptions,
  PageRuntime,
  RuntimeOptions,
  StoryRuntime
} from "./types.js";
