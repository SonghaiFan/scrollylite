# Extending with Plugins

The four built-in chart idioms (`bar`, `line`, `point`, `unit`) are not
special-cased — they're registered through the **same plugin API** available
to you. This page is for advanced users who want to add a new chart type
(e.g. an area chart, a map, a custom pictogram layout) that participates
fully in ScrollyLite's scene-driven transition system.

> This is an advanced/extension topic. Most stories never need it — the
> built-in idioms cover bar, line, scatter, and unit/pictogram charts. Reach
> for this when you need a genuinely new visual grammar.

## The shape of a chart idiom plugin

```js
import { defineChartIdiom } from "scrollylite";

export const plugin = defineChartIdiom({
  key: "area",                                     // required: unique idiom identifier
  scenes: ["focus", "guide", "granularity"],       // which scenes this idiom supports
  stateOperations: {                               // how each scene maps to a state-transform strategy
    focus: "filter",
    guide: "coordinate",
    granularity: "aggregate"
  },
  createRenderer:     (deps) => areaRenderer,      // (chart, rows, spec, tooltip, d3, …) => void
  createSpecCompiler: (deps) => compileAreaSpec,   // normalizes/derives encoding from authored shorthand
  prepareSpec:        (spec) => spec,              // optional: pre-render spec normalization
  transition: {
    plan:             (sourceSpec, targetSpec) => ({ /* staging plan */ }),
    intermediateSpecs:(sourceSpec, targetSpec, plan) => [ /* … */ ]
  },
  defaults: {
    margin: (spec) => ({ top: 24, right: 24, bottom: 36, left: 56 })
  },
  inspect: { /* optional metadata surfaced in debug tooling */ }
});
```

`defineChartIdiom` validates and normalizes this config into a `ChartPlugin`
— an object with `key`, `scenes`, `stateOperations`, and a
`createChartIdiom(deps)` factory that the runtime calls to produce the actual
runtime idiom (renderer + compiler + transition plan, wired with runtime
dependencies like `d3`/`aq`).

### Config fields

| Field | Type | Default | Purpose |
|---|---|---|---|
| `key` | `string` | — (**required**) | Unique idiom identifier; matches `mark: "<key>"` in view specs |
| `scenes` | `string[]` | `["focus", "guide", "granularity", "observation"]` | Which of the four scenes this idiom can express |
| `stateOperations` | `Record<scene, operation>` | `{ focus: "filter", guide: "coordinate", granularity: "aggregate" }` | Maps each supported scene to a state-transform strategy name |
| `createRenderer` | `(deps) => renderFn` | — | Factory returning the function that draws/updates marks for a step |
| `createSpecCompiler` | `(deps) => compiler` | — | Factory returning `{ base, operations }` — normalizes authored shorthand into a full spec |
| `prepareSpec` | `(spec) => spec` | identity | Last-mile spec normalization right before rendering |
| `transition.plan` | `(source, target) => plan` | returns `{}` | Computes a staging/sequencing plan between two specs (used for multi-stage transitions like bar's flip) |
| `transition.intermediateSpecs` | `(source, target, plan) => spec[]` | — | Produces intermediate spec snapshots for staged transitions |
| `transition.intermediateSpec` | `(...) => spec` | — | Single-intermediate variant |
| `defaults.margin` | `(spec) => margin` | `() => ({})` | Default chart margins for this idiom |
| `inspect` | `object` | `{}` | Arbitrary metadata surfaced in debug/inspector tooling |

`createIdiom` (an alternative to `createRenderer`/`createSpecCompiler`/etc.)
is also accepted if you'd rather assemble the whole runtime idiom yourself —
`defineChartIdiom` will normalize whatever it returns.

### Scenes and state operations

Declare only the scenes your idiom can meaningfully express via `scenes`.
ScrollyLite's [scene inference](./scenes-and-transitions.md) still runs the
same diff regardless — but an idiom that doesn't list e.g. `"observation"`
should ensure its renderer/compiler doesn't depend on that scene being
animated specially (the built-in `unit` idiom is the model for this: it
declares only `["focus", "guide"]` and its renderer handles exactly those two
kinds of change).

`stateOperations` documents — for tooling and for your own renderer logic —
*how* each scene is realized as a state transformation: `"filter"` (rows
in/out), `"coordinate"` (re-projection/re-scaling), `"aggregate"`
(grouping/ungrouping). These are conventions the built-in idioms follow; your
renderer is free to interpret them however makes sense for your visual
grammar.

## Registering your idiom

Two functions, both re-exported from the package root:

```js
import { registerChartIdiom, registerChartModule } from "scrollylite";

// Register a single plugin object directly
registerChartIdiom(plugin);

// Register a module shaped like { plugin } — mirrors the built-in
// `src/charts/<idiom>/plugin.js` convention
registerChartModule({ plugin });
```

Call either **before** `createStory()` runs (registration happens against the
shared built-in registry that every story instance reads from). Once
registered, your idiom's authoring factory becomes usable just like the
built-ins:

```js
// Your own factory function, mirroring bar()/line()/etc.
export function area(data) {
  return new AreaState({ data, mark: "area", encoding: {} });
}

// Now usable in stories:
const spec = story()
  .step("Trend", area("rows").x("year").y("value").key("series"))
  .toSpec();
```

Check what's currently registered with `availableChartIdioms()`:

```js
import { availableChartIdioms } from "scrollylite";
console.log(availableChartIdioms());   // e.g. ["bar", "line", "point", "unit", "area"]
```

## Authoring a builder for your idiom

Authors interact with idioms through chainable builders (`bar(data)`,
`line(data)`, …). To give your idiom the same ergonomics, extend the shared
`IdiomState` base (re-exported as `ChartState` in the type definitions) the
same way the built-ins do — see
[`src/charts/authoring.js`](../src/charts/authoring.js) and any of
[`src/charts/bar/authoring.js`](../src/charts/bar/authoring.js),
[`line/authoring.js`](../src/charts/line/authoring.js),
[`point/authoring.js`](../src/charts/point/authoring.js), or
[`unit/authoring.js`](../src/charts/unit/authoring.js) for working examples
at increasing levels of customization:

```js
import { IdiomState, channelFrom, colorFrom } from "scrollylite/charts/authoring"; // (internal — adjust import to your build setup)

export class AreaState extends IdiomState {
  // Override .x()/.y() to set idiom-specific default channel types:
  x(field, options = {}) { return super.x(field, { type: "temporal", ...options }); }

  // Add idiom-specific chainable methods. Each should:
  //  1. compute the new state via `this.with(patch, sceneTag?)`
  //  2. return the result (which is itself chainable)
  baseline(field) {
    return this.with({ encoding: { y2: channelFrom(field) } }, "observation");
  }
}

export function area(data) {
  return new AreaState({ data, mark: "area", encoding: {} });
}
```

`this.with(patch, operation?)` is `ViewState`'s immutable updater: it merges
`patch` into the current state, returns a *new* state, and — if you pass an
`operation` string — records it for [scene inference](./scenes-and-transitions.md#how-inference-works)
(use the scene name your method represents: `"focus"`, `"guide"`,
`"granularity"`, or `"observation"`).

## The folder contract (for contributing back to ScrollyLite itself)

If you're proposing a new built-in idiom for ScrollyLite itself (rather than
registering one in your own app), follow the folder contract documented in
[`src/charts/README.md`](../src/charts/README.md): each idiom lives in
`src/charts/<idiom>/` and exposes a `plugin.js` exporting `plugin =
defineChartIdiom({...})`. Because ScrollyLite runs as a CDN-loaded ESM
library (no dynamic file-system scanning at runtime), built-in idioms are
wired together through a generated static manifest
(`src/charts/manifest.js`) — run `npm run manifest:check` after adding or
removing an idiom folder, which regenerates and validates the manifest.

This contract only applies to **built-in** idioms shipped with the package.
Idioms registered at runtime via `registerChartIdiom`/`registerChartModule`
in your own application code don't need to follow it — register them however
fits your project's structure.
