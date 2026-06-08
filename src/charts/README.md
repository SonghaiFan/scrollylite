# Chart Idiom Folders

ScrollyLite is designed to run as a browser ESM library from a CDN URL. That
means runtime code cannot scan `src/charts/` or discover new files dynamically.
Every built-in chart idiom is therefore represented by one folder plus a
generated static ESM manifest.

## Folder Contract

Each chart idiom lives in:

```text
src/charts/<idiom>/
```

The folder becomes a plugin when it exposes:

```text
src/charts/<idiom>/plugin.js
```

That file should export:

```js
export const plugin = defineChartIdiom({
  key: "<idiom>",
  scenes: ["focus", "guide", "granularity", "observation"],
  stateOperations: {
    focus: "filter",
    guide: "coordinate",
    granularity: "aggregate"
  },
  createRenderer,
  createSpecCompiler,
  prepareSpec,
  transition: {
    plan,
    intermediateSpecs
  },
  defaults: {
    margin
  },
  inspect
});
```

The runtime idiom produced by `createChartIdiom()` is intentionally flat:

```js
{
  key,
  renderer,
  prepareSpec,
  resolveTransitionPlan,
  intermediateSpecs,
  defaultMargin,
  inspect,
  scenes,
  stateOperations
}
```

Only `key` and `renderer` are required for rendering. `createSpecCompiler()` is
required when the idiom has authoring operations that compile into a Vega-ish
spec. `scenes` and `stateOperations` declare compiler capability, so transition
code does not need mark-specific switch statements. Do not add empty hook bags;
the plugin metadata is the contract.

## CDN-Compatible Registration

The runtime imports:

```js
import { chartModules } from "./charts/manifest.js";
```

`manifest.js` is static ESM so it can be served directly from a CDN. It is
generated from folders that expose `plugin.js`.

After adding or removing an idiom folder, run:

```sh
node scripts/sync-chart-manifest.mjs
```

Then publish or serve the updated source. The browser never scans directories;
the manifest is the CDN-safe list of built-in modules.

## Bar Ground Truth

All bar-specific code lives under `src/charts/bar/`, including authoring,
rendering, transition planning, layout renderers, keys, and semantic diff
helpers. The generic `src/grammar/` package may re-export `bar()` for
convenience, but it does not own the bar idiom implementation.

The current bar pipeline is:

```text
authoring.js / grammar.js
  -> compile.js
  -> semantic.js / diff.js
  -> state.js transition plan
  -> render.js + layout-*.js
  -> render-pattern.js D3 join/update staging
```

- `grammar.js` is the authoring entry for `bar()` and `BarState`.
- `plugin.js` is the runtime plugin entry. Keep it authoring-free so the CDN
  runtime can register the idiom without importing grammar code.
- `index.js` is a public barrel that can re-export authoring helpers.
- `compile.js` turns bar authoring operations such as filter/highlight,
  coordinate/scale/layout, breakdown, and rollup into Vega-ish `data`,
  `transform`, `mark`, `encoding`, and `narrative` spec fields.
- `semantic.js` is the canonical place to infer bar orientation, layout,
  segment field, aggregate state, guide state, granularity state, and x/y
  geometry from a compiled spec.
- `diff.js` owns bar semantic delta names such as `bar.layout`,
  `bar.orientation`, and `bar.x-geometry`.
- `state.js` reads the diff/semantic result and builds the transition plan,
  including staged updates and intermediate layout specs.
- `render.js` is the bar renderer entry point. Layout-specific drawing belongs
  in `layout/simple.js`, `layout/stacked.js`, or `layout/grouped.js`.
- `render-pattern.js` contains shared D3 join and staged update patterns.
  Bar exit geometry is source-aware: exit direction is determined from the
  existing rect/source step, not the target step's scale. For stacked bars,
  the transition plan's `stack-base` baseline means the segment's `__stack0`
  anchor, so a segment exits back to where it originally grew from.

Point, line, and unit now have authoring entry points, idiom-local spec
compilers, and minimal transition plans. They still use renderer-local
transition behavior rather than the full bar-style `semantic.js` / `diff.js` /
`state.js` transition-plan stack.
Future idioms should use the bar folder as the reference shape when they need
custom staged plans, intermediate specs, or inspector metadata.

## Non-Bar Authoring Alignment

Point, line, and unit authoring should follow the bar authoring vocabulary.
Keep the public chaining surface idiom-first:

- `bar`: `x`, `y`, `where`, `breakdown`, `rollup`, `layout`, `guide`
- `point`: `x`, `y`, `color`, `size`, `key`, `where`, `flip`, `rollup`,
  `breakdown`
- `line`: `x`, `y`, `color`, `key`, `where`, `series`, `rollup`
- `unit`: `x`, `color`, `key`, `where`, `group`

- shared: `x`, `y`, `channel`, `color`, `size`, `key`, `tooltip`, `sort`,
  `where`, `highlight`, `guide`, and `transition`
- point: `flip`, `breakdown`, and `rollup`
- line: `flip`, `breakdown`, and `rollup`
- unit: `value`, `label`, `columns`, `radius`, `group`, `timeline`, and `dodge`

Compiled authoring specs should be Vega-ish first: `data`, `mark`,
`encoding`, and `transform` stay in the root spec, while ScrollyLite-only
semantics live under `narrative`. Do not add invented Vega-Lite channels such
as `encoding.series`; line grouping is stored in
`narrative.state.sceneState.granularity.seriesField` and rendered through the
standard `color` encoding.

Point, line, and unit spec compilers now live in their idiom folders:
`src/charts/point/compile.js`, `src/charts/line/compile.js`, and
`src/charts/unit/compile.js`. The global transition module builds its compiler
map from the chart plugin manifest, so adding an idiom means adding a folder
with `plugin.js`. Runtime registry keys are canonical only: `bar`, `point`,
`line`, and `unit`.

## D3 Bar Checklist

This checklist tracks the D3 review findings for the bar idiom.

- [x] Use baseline-aware simple bar geometry.
  Horizontal bars use `x = min(x(0), x(v))` and `width = abs(x(v) - x(0))`.
  Vertical bars use `y = min(y(0), y(v))` and `height = abs(y(v) - y(0))`.
- [x] Use baseline-aware grouped bar geometry.
  Grouped enter and exit now return to the zero baseline instead of the chart
  bottom, and the previous vestigial zero-baseline enter hook is now consumed.
- [x] Make stacked bars robust for diverging values.
  Stacked bars use separate positive and negative accumulators, and the
  stacked value domain includes both `__stack0` and `__stack1` extents. Stacked
  enter and exit read the transition plan's `stack-base` baseline and collapse
  to each segment's `__stack0` anchor, not the global zero axis.
- [x] Include axes and grid in staged guide/layout transitions.
  Bar layouts pass x-stage transitions to the x-axis and y-stage transitions
  to the y-axis/grid, so contextual scale motion follows the same staged plan
  as rect geometry.
- [x] Account for explicit per-stage duration in scroll virtual phases.
  If `guide.staging.duration` is authored, virtual scroll timing multiplies it
  by the number of staged axes. Default staged timing still treats the step
  transition duration as the total duration.
- [x] Derive scroll phase timing directly from the transition plan.
  Staged bar plans expose `plan.update.totalDuration`, and virtual scroll
  sequencing prefers that value before falling back to authored transition
  duration and stagger defaults.
- [x] Keep `renderBarJoin` as the shared D3 join pattern for bar layouts.
  It remains bar-specific because it owns `rect.sl-bar`, bar lineage,
  baseline enter/exit, and highlight opacity.
- [x] Move each bar layout geometry contract into a small object.
  Simple, grouped, and stacked layouts now pass layout-local geometry contracts
  with `start`, `target`, `applyX`, `applyY`, `apply`, and `exit` hooks into the
  shared bar join pattern.
- [x] Centralize bar layout/state inference.
  `semantic.js` is the canonical source for orientation, layout, segment,
  aggregate, guide, granularity, and x/y geometry inference used by render,
  diff, and transition planning.
