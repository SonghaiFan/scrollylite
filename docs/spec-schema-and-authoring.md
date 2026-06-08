# Spec Schema and Authoring Grammar

This document describes the current ScrollyLite story spec and the authoring
grammar that compiles into it. It is a working schema for the current demo code,
not a finalized JSON Schema contract.

## Pipeline

```txt
authoring code
  -> grammar view state
  -> authored step spec
  -> effective view spec
  -> transition diff/plan
  -> chart idiom renderer
```

The runtime renders the effective view spec. Raw authoring fields such as
`where`, `guide`, `granularity`, `key`, and `transition` should not survive as
top-level view fields. The authoring compiler translates them into Vega-Lite-ish
`transform`/`encoding` plus the ScrollyLite `narrative` extension before the
runtime sees the step view.

## Top-Level Story Spec

```js
{
  title?: string,
  description?: string,
  data: Record<string, DataSource>,
  layout?: RuntimeLayout,
  action?: ActionType[],
  theme?: ThemeSpec,
  views?: Record<string, ViewConfig>,
  steps: StepSpec[],
  story?: {
    id?: string,
    label?: string,
    chart?: string
  }
}
```

`data` maps dataset ids to loadable sources:

```js
{
  weatherDays: {
    url: "./examples/weather/data/weather_days_tidy.csv",
    type: "csv"
  }
}
```

Current source types are plain objects with a `url` and `type`. The runtime loads
CSV data and stores it by dataset id.

`layout` controls runtime mechanics:

```js
{
  offset?: number,       // native scroll trigger offset, default 0.55
  nav?: boolean,         // show step navigation dots/buttons
  progress?: boolean,    // show top progress bar
  scroll?: {
    progress?: "geometry",
    threshold?: number
  }
}
```

`action` stores optional story-level action metadata. Step-level `action` is what
the runtime uses for rendering:

```js
action: ["header", "step", "tooltip", "enter"]
```

## Step Spec

```js
{
  id?: string,
  title?: string,
  body?: string,
  transition?: {
    scene?: SceneType[]
  },
  action?: ("step" | "scroll" | "tooltip" | "enter")[],
  inspector?: {
    authoringCode?: string
  },
  views: Record<string, ViewSpec>
}
```

`scene` is the inferred transition intent for this step relative to the previous
authored step. It is not the same as final scene state. For example, a grouped
bar step may contain both `granularity` and `guide` state in the final view spec,
but the transition intent can be only `["guide"]` when the authored delta is
stacked-to-grouped.

Supported scene types:

```ts
type SceneType = "focus" | "guide" | "granularity" | "observation";
```

## View Config

Top-level `views` defines per-view defaults. The demo uses `main`:

```js
views: {
  main: {
    title?: string,
    height?: number
  }
}
```

Step views override or complete this config.

## Shared View Spec

```js
{
  data?: { name?: string, values?: object[] },
  mark: "bar" | "point" | "line" | "unit",
  width?: number,
  height?: number,
  transform?: TransformSpec[],
  encoding?: EncodingSpec,
  narrative?: NarrativeExtension
}
```

`mark` follows Vega-Lite's primitive mark vocabulary where possible. The current
runtime intentionally supports bar-chart variants first. `unit` is the one
ScrollyLite custom mark/idiom that remains outside Vega-Lite's primitive marks.
At the plugin layer, `bar` is currently the complete chart idiom: it owns its
renderer, spec preparation, transition plan, intermediate staged specs, default
margin, and inspector metadata. `point`, `line`, and `unit` now have authoring
entry points and idiom-local scene compilers, but they still rely on
renderer-local transition behavior rather than bar-style staged transition
plans.

Narrative-specific view fields live in one `narrative` block. Removing that
block leaves a Vega-Lite-shaped UnitSpec for bar views. `narrative` should carry
story semantics and animation behavior; it should not repeat Vega-Lite-native
`data`, `mark`, `encoding`, or `transform` intent.

```js
narrative: {
  object?: {
    key?: string | string[],
    semantic?: {
      entity?: { field: string } | { field: string }[],
      measure?: { field: string } | { value: string } | Array<{ field: string } | { value: string }>
    }
  },
  annotation?: {
    title?: string,
    description?: string
  },
  transition?: TransitionTiming,
  action?: {
    scroll?: true | { ease?: "linear" | "cubic" | "cubicInOut" | "cubicOut" }
  },
  unit?: UnitMarkSpec
}
```

`UnitMarkSpec` is ScrollyLite-specific. It stays small and idiom-level:

```js
unit: {
  value?: string,       // count field expanded into repeated units
  label?: string,       // row label shown in unit tooltips
  layout?: "grid" | "groupedGrid" | "timeline" | "dodge" | "point",
  group?: string,       // category used by groupedGrid
  x?: string | ChannelSpec,
  y?: string | ChannelSpec,
  columns?: number,
  radius?: number,
  maxUnits?: number
}
```

Scene transition types are inferred by diffing the previous and next compiled
view specs. Authors should not write `transition.scene` or derived scene state
in the view spec.

## Encoding Schema

```js
encoding: {
  x?: ChannelSpec,
  y?: ChannelSpec,
  color?: ColorSpec,
  xOffset?: ChannelSpec,
  yOffset?: ChannelSpec,
  size?: ChannelSpec
}
```

Channel:

```js
{
  field?: string,
  title?: string,
  type?: "nominal" | "ordinal" | "quantitative" | "temporal",
  domain?: unknown[],
  range?: unknown[],
  scale?: {
    type?: string,
    domain?: unknown[],
    range?: unknown[]
  },
  aggregate?: string,
  sort?: string | { field?: string, order?: "ascending" | "descending" },
  bin?: boolean | object,
  value?: unknown
}
```

Color:

```js
{ value: string }
{ field: string, type?: "nominal" | "quantitative", domain?: unknown[], range?: string[] }
{
  hue: { value?: string, field?: string },
  luminance: {
    field: string,
    domain: unknown[],
    lightness: number[]
  }
}
```

Tooltips are a runtime default: when `encoding.tooltip` is absent, ScrollyLite
shows all displayable fields on the current row. Authors only set
`encoding.tooltip` when they intentionally want to override that default.

## Transform Schema

The runtime uses a small transform vocabulary:

```js
{ filter: { field: string, equal?: unknown, oneOf?: unknown[], range?: [number, number] } }
{ sort: { field: string, order?: "ascending" | "descending" } }
{ limit: number }
{
  aggregate: {
    groupby: string[],
    fields: [{ op: "sum" | "mean" | "count" | string, field: string, as: string }]
  }
}
{
  fold: {
    fields: string[],
    as: [string, string],
    sourceAs?: string,
    labels?: Record<string, string>
  }
}
```

## Transition Timing

```js
{
  duration?: number,
  ease?: "linear" | "cubicInOut" | "cubicOut" | string,
  stagger?: {
    step?: number,
    max?: number
  }
}
```

Scroll mode creates ordinary D3 transitions and then scrubs them with scroll
progress. Stepped mode lets D3 run them with time.

The runtime default is `{ duration: 900, ease: "cubicInOut", stagger: { step:
10, max: 120 } }`. Compiled specs only emit `narrative.transition` fields that
are different from that default.

## Bar View Spec

Minimal vertical bar:

```js
{
  data: { name: "weatherDays" },
  mark: "bar",
  transform: [
    { filter: { field: "type", equal: "Hot days" } },
    { sort: { field: "year", order: "ascending" } }
  ],
  encoding: {
    x: { field: "decade", title: "Decade", type: "nominal" },
    y: { field: "count", title: "Hot days", type: "quantitative" }
  },
  narrative: {
    object: {
      key: ["decade", "type"],
      semantic: {
        entity: { field: "decade" },
        measure: { field: "type" }
      }
    }
  }
}
```

Horizontal guide after authoring compilation:

```js
{
  encoding: {
    x: { field: "count", title: "Hot days", type: "quantitative" },
    y: { field: "decade", title: "Decade", type: "nominal" }
  }
}
```

The `guide` transition is inferred later by diffing this horizontal spec against
the previous vertical spec.

Segmented bar after authoring compilation:

```js
{
  transform: [
    {
      aggregate: {
        groupby: [categoryField, segmentField],
        fields: [{ op: "sum", field: valueField, as: valueField }]
      }
    }
  ],
  encoding: {
    x: { field: categoryField, type: "nominal" },
    y: { field: valueField, type: "quantitative" },
    color: { field: segmentField, type: "nominal" },
    xOffset?: { field: segmentField, type: "nominal" } // grouped only
  },
  narrative: {
    object: {
      key: [categoryField, segmentField],
      semantic: {
        entity: { field: categoryField },
        measure: { field: sourceField }
      }
    }
  }
}
```

The `granularity` and grouped-layout `guide` state is inferred later from
`transform.aggregate`, `encoding.color`, and `encoding.xOffset`.

## Authoring Grammar

Import:

```js
import { bar, story } from "scrollylite";
```

Create a base bar state:

```js
const base = bar("weatherDays")
  .x("decade")
  .y("count")
  .sort("year");
```

### StoryBuilder

```js
story(initialSpec?)
  .schema(url)
  .title(text)
  .description(text)
  .data(name, source)
  .data({ [name]: source })
  .layout("floatToText" | "textOverVis", options?)
  .layout(runtimeLayout)
  .action(actions)
  .view("main", viewConfig)
  .view(viewConfig)
  .step(title, viewState, bodyOrOptions?)
  .steps(definitions)
  .toSpec()
```

Step options:

```js
{
  body?: string,
  authoring?: string,
  authoringCode?: string,
  code?: string
}
```

The `authoring` string is only for the demo inspector. The executable spec comes
from the `viewState`.

### BarState API

```js
bar(data)
.x(field, options?)
.y(field, options?)
.channel(name, field, options?)
.color(valueOrField, options?)
.key(fieldOrFields)
.sort(field, order?)
.transition(timing)
.filter(selector)
.where(selector)
.highlight(selector, options?)
.guide(config)
.flip(options?)
.breakdown(segment?, options?)
.rollup(groupby?, options?)
.segment(fieldOrConfig?, config?)
.layout(layout, options?)
.toSpec()
```

Important mappings:

| Authoring | Compiled spec effect | Scene operation |
| --- | --- | --- |
| `.where({ type: "Hot days" })` | adds `{ filter: { field, equal } }` to `transform` | `focus` |
| `.where({ period: "recent" })` | adds another Vega-Lite-style filter transform | `focus` |
| `.highlight({ type: "Cold days" })` | keeps rows in the data and stores a focus highlight selector in `narrative.state.sceneState.focus` | `focus` |
| `.flip()` | records the guide intent `{ flip: true }`; the bar compiler materializes the target orientation and grouped offsets | `guide` |
| `.breakdown("type")` | writes aggregate transform and color encoding | `granularity` |
| `.layout("grouped")` | adds grouped offset on the category axis (`xOffset` for vertical bars, `yOffset` for horizontal bars) | `guide` |
| `.rollup("decade")` | writes aggregate transform grouped by the parent key; collapsed child keys are inferred from source/target object keys | `granularity` |

## Bar Weather Story

Current authoring sequence:

```js
const base = bar("weatherDays")
  .x("decade")
  .y("count")
  .sort("year");

story.demo()
  .layout("floatToText")
  .step("Baseline: vertical bar chart", base.where({ type: "Hot days" }), {
    body: "...",
    authoring: 'base.where({ type: "Hot days" })'
  })
  .step("Focus: filter to a subset", base.where({ type: "Hot days", period: "recent" }), {
    body: "...",
    authoring: 'base.where({ type: "Hot days", period: "recent" })'
  })
  .step("Guide: re-orient and rescale", base.where({ type: "Hot days", period: "recent" }).flip(), {
    body: "...",
    authoring: 'base.where({ type: "Hot days", period: "recent" }).flip()'
  })
  .step("Focus: switch selected type", base.where({ type: "Cold days" }).flip(), {
    body: "...",
    authoring: 'base.where({ type: "Cold days" }).flip()'
  })
  .step("Baseline: return to hot days", base.where({ type: "Hot days" }), {
    body: "...",
    authoring: 'base.where({ type: "Hot days" })'
  })
  .step("Granularity: break down into hot/cold segments", base.breakdown("type"), {
    body: "...",
    authoring: 'base.breakdown("type")'
  })
  .step("Guide: stacked to grouped segments", base.breakdown("type").layout("grouped"), {
    body: "...",
    authoring: 'base.breakdown("type").layout("grouped")'
  })
  .step("Granularity: roll up to total days", base.rollup("decade", { title: "Total days" }), {
    body: "...",
    authoring: 'base.rollup("decade", { title: "Total days" })'
  })
  .toSpec();
```

## Diff and Transition Planning Fields

The demo inspector shows both the compiled spec and the diff from the previous
compiled spec. `diffViewStates(previous, next)` returns:

```js
{
  changed: string[],
  deltas: [
    {
      type: string,
      action: "add" | "remove" | "change",
      previous: unknown,
      next: unknown
    }
  ],
  has(key),
  hasDelta(type, action?)
}
```

Bar-specific semantic deltas include:

```txt
bar.orientation
bar.layout
bar.category-field
bar.measure-field
bar.guide
bar.granularity
bar.aggregate
bar.segment-field
bar.x-geometry
bar.y-geometry
```

`resolveBarTransitionPlan(previousSpec, nextSpec)` consumes these deltas. The
important rule is:

```txt
only x geometry changed -> stage/update x
only y geometry changed -> stage/update y
x and y geometry changed -> staged x/y update
```

The renderer maps x geometry to `x` and `width`, and y geometry to `y` and
`height`.

The plan also emits an execution-oriented update block that the bar renderer
consumes directly:

```js
{
  key: {
    mode: "semantic",
    reason: "granularity-object-consistency"
  },
  enter: {
    mode: "baseline",
    from: "stack-base",
    target: "child",
    reason: "granularity-enter-baseline",
    targetLayout: "stacked",
    categoryKey: "decade",
    segmentKey: "type",
    valueKey: "count"
  },
  exit: {
    mode: "baseline",
    to: "stack-base",
    source: "child",
    reason: "granularity-exit-baseline",
    sourceLayout: "stacked",
    categoryKey: "decade",
    segmentKey: "type",
    valueKey: "count"
  },
  update: {
    mode: "staged",
    reason: "guide-orientation" | "guide-segment-layout" | "bar-geometry",
    target: {
      orientation: "vertical" | "horizontal",
      layout: "simple" | "stacked" | "grouped",
      renderer: "vertical" | "horizontal" | "stacked-vertical" | "grouped-vertical"
    },
    changedAxes: ["x", "y"],
    stages: [
      { axis: "y", attrs: ["y", "height"] },
      { axis: "x", attrs: ["x", "width"] }
    ],
    timing: {
      duration: 450,
      ease: "cubicInOut",
      stagger: { step: 10, max: 120 }
    }
  }
}
```

`enter.mode = "baseline"` covers ordinary segment entry. For stacked bars,
`from: "stack-base"` means each segment grows from its own stack base.
`exit.mode = "baseline"` is the matching exit-side instruction; stacked segment
exits use `to: "stack-base"`. For parent-child granularity changes,
`enter.mode = "parent-child-lineage"` points to either `from: "parent-bounds"`
or `from: "child-bounds"`.

The transition plan exposes only execution fields: `key`, `enter`, `exit`,
`update.stages`, and `update.timing`. The inspector reads the same fields as the
renderer, so transition decisions stay in the diff/plan layer instead of being
re-inferred inside the D3 renderer.

## Transition Plan Source Rules

Every chart idiom should derive its transition plan from the same contract:

```js
const preparedSource = idiom.prepareSpec(sourceSpec);
const preparedTarget = idiom.prepareSpec(targetSpec);
const diff = diffViewStates(preparedSource, preparedTarget);
const plan = idiom.resolveTransitionPlan(preparedSource, preparedTarget);
```

The plan is therefore a property of two real compiled specs, not of the current
DOM shape. Renderers consume the plan; they should not re-infer semantic changes
from scratch.

Scroll and stepped modes differ only in how they choose `sourceSpec`:

| Mode | Source spec | Target spec | Notes |
| --- | --- | --- | --- |
| Scroll forward | authored adjacent previous step | current step | The scroll progress scrubs 0 -> 1. |
| Scroll backward | authored adjacent previous step | current step | Same plan as forward; only the progress moves 1 -> 0. |
| Scroll nav jump | authored adjacent previous step | target step | The target is rendered at complete progress. It does not diff against an arbitrary on-screen step. |
| Stepped next/previous | last rendered scene spec | target step | Discrete mode transitions from what the user is actually seeing. |
| Stepped nav jump | last rendered scene spec | target step | Jumping Step 01 -> Step 03 computes `diff(Step 01, Step 03)`, so skipped intermediate deltas cancel out. |

This is why scroll mode can use one authored adjacent mechanism for both
directions: scrolling between steps is continuous, so Step 03 is always reached
through the Step 02 -> Step 03 interval. Stepped mode is discrete, so a jump can
skip Step 02 and must compare the true rendered source with the target.

When a bar transition needs intermediate phases and also changes orientation,
the bar idiom prioritizes orientation first. For example, collapsing from a
horizontal grouped bar to a vertical aggregate bar becomes:

```txt
grouped-horizontal -> grouped-vertical -> stacked-vertical -> aggregate-vertical
```

This keeps the staged layout/collapse transition in the target orientation,
instead of mixing orientation and grouped/stacked layout changes in the same
phase.

Layout-specific intermediate routes are owned by the layout definition, not by
the renderer. In code, `src/charts/bar/layout.js` defines routes such as:

```js
grouped: {
  transition: {
    collapse: { to: { simple: { via: ["stacked"] } } },
    split: { from: { simple: { via: ["stacked"] } } }
  }
}
```

The planner reads this metadata to build phase specs. That means adding another
bar layout should also add its preferred transition route there, so the planner
can infer which intermediate layouts to visit without hard-coding layout names
inside collapse/split logic.

## Materialized Bar Specs

`BarState` may use temporary authoring state internally while the chain is being
built. Public authoring records guide intent such as `{ flip: true }`; `.toSpec()`
then materializes that intent into a Vega-ish view. For example,
`.where(...).flip()` compiles to filters plus horizontal x/y encodings:

```js
{
  data: { name: "weatherDays" },
  mark: "bar",
  transform: [
    { filter: { field: "type", equal: "Hot days" } },
    { filter: { field: "period", equal: "recent" } },
    { sort: { field: "year", order: "ascending" } }
  ],
  encoding: {
    x: { field: "count", title: "Hot days", type: "quantitative" },
    y: { field: "decade", title: "Decade", type: "nominal" }
  },
  narrative: {
    object: {
      key: ["decade", "type"],
      semantic: {
        entity: { field: "decade" },
        measure: { field: "type" }
      }
    }
  }
}
```

`base.breakdown("type").layout("grouped")` materializes the grouped bar with
Vega-Lite's `xOffset` vocabulary:

```js
{
  data: { name: "weatherDays" },
  mark: "bar",
  transform: [
    { sort: { field: "year", order: "ascending" } },
    {
      aggregate: {
        groupby: ["decade", "type"],
        fields: [{ op: "sum", field: "count", as: "count" }]
      }
    }
  ],
  encoding: {
    x: { field: "decade", type: "nominal", title: "Decade" },
    y: { field: "count", type: "quantitative", title: "Count" },
    color: { field: "type", type: "nominal", range: ["#b05d3b", "#536a9e"] },
    xOffset: { field: "type", type: "nominal" }
  },
  narrative: {
    object: { ... }
  }
}
```

Diff, transition planning, and rendering use these materialized specs. The
inspector's transition diff also compares materialized specs so guide transitions
show the real `encoding.x`/`encoding.y` geometry changes. Derived guide and
granularity state, including default staging order, appears in the diff and
transition plan rather than in the step spec. This is why direct jumps in stepped
mode can compare step 1 to step 3 and still discover the real orientation and
geometry changes.
