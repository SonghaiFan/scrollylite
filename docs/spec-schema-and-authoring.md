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
  -> mark renderer
```

The runtime renders the effective view spec. Raw authoring fields such as
`focus`, `guide`, and `granularity` are scene-state instructions that are applied
by `compileSceneViewSpec()` before D3 receives the effective view spec.

## Top-Level Story Spec

```js
{
  $schema?: string,
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
    url: "./src/data/weather_days_tidy.csv",
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
  mark: "bar" | "unit",
  width?: number,
  height?: number,
  margin?: {
    top?: number,
    right?: number,
    bottom?: number,
    left?: number
  },
  transform?: TransformSpec[],
  encoding?: EncodingSpec,
  narrative?: NarrativeExtension
}
```

`mark` follows Vega-Lite's primitive mark vocabulary where possible. The current
runtime intentionally supports bar-chart variants first. `unit` is the one
ScrollyLite custom mark/idiom that remains outside Vega-Lite's primitive marks.

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
  state?: {
    focus?: FocusSpec,
    guide?: GuideSpec,
    granularity?: GranularitySpec,
    observation?: ObservationSpec,
    sceneState?: Record<string, unknown>
  },
  transform?: TransformSpec[],
  unit?: UnitMarkSpec
}
```

Scene transition types are inferred by diffing the previous and next compiled
view specs. Authors should not write `transition.scene` in the view spec.

## Encoding Schema

```js
encoding: {
  x?: ChannelSpec,
  y?: ChannelSpec,
  color?: ColorSpec,
  tooltip?: TooltipItem[],
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

Tooltip:

```js
[
  { field: "decade", title: "Decade" },
  { field: "count", title: "Count" }
]
```

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

## Bar View Spec

Minimal vertical bar:

```js
{
  data: "weatherDays",
  mark: "bar",
  key: "decade",
  transform: [
    { filter: { field: "type", equal: "Hot days" } },
    { sort: { field: "year", order: "ascending" } }
  ],
  encoding: {
    x: { field: "decade", title: "Decade", type: "nominal" },
    y: { field: "count", title: "Hot days", type: "quantitative" }
  }
}
```

Horizontal guide state before compilation:

```js
guide: {
  orientation: "horizontal",
  category: { field: "decade", title: "Decade", type: "nominal" },
  measure: { field: "count", title: "Hot days", type: "quantitative" },
  staging?: {
    order?: ("x" | "y")[],
    duration?: number,
    ease?: string,
    stagger?: object
  }
}
```

Compiled horizontal bar changes `encoding.x` to the quantitative measure and
`encoding.y` to the category channel. It also writes:

```js
sceneState: {
  guide: {
    orientation: "horizontal",
    scale: null,
    staging: { order: ["y", "x"] }
  }
}
```

Segmented bar state before compilation:

```js
granularity: {
  category?: string,
  segment?: string,
  value?: string,
  layout?: "stacked" | "grouped",
  color?: ColorSpec,
  domain?: unknown[],
  range?: string[],
  groupby?: string[],
  op?: "sum" | string,
  aggregate?: boolean
}
```

Compiled segmented bar writes:

```js
{
  barLayout: "stacked" | "grouped",
  key: [categoryField, segmentField],
  semanticKey: {
    entity: { field: categoryField },
    measure: { field: sourceField }
  },
  encoding: {
    x: { field: categoryField, type: "nominal" },
    y: { field: valueField, type: "quantitative" },
    color: { field: segmentField, type: "nominal" }
  },
  sceneState: {
    granularity: {
      layout,
      fields,
      segmentField,
      sourceField,
      segments,
      valueField
    }
  }
}
```

## Authoring Grammar

Import:

```js
import { bar, story } from "../../grammar/index.js";
```

Create a base bar state:

```js
const base = bar("weatherDays")
  .x("decade")
  .y("count")
  .transition(sharedTiming)
  .sort("year")
  .tooltip(["decade", "period", "type", "count"]);
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
.tooltip(items)
.key(fieldOrFields)
.sort(field, order?)
.transition(timing)
.filter(selector)
.where(selector)
.guide(config)
.flip(options?)
.agg(config?)
.split(segment?, options?)
.collapse(drop?, options?)
.segment(fieldOrConfig?, config?)
.layout(layout, options?)
.stage(order, options?)
.toSpec()
```

Important mappings:

| Authoring | Raw state effect | Scene operation |
| --- | --- | --- |
| `.where({ type: "Hot days" })` | adds `where`, later compiled to filter transform | `focus` |
| `.where({ period: "recent" })` | adds another filter constraint | `focus` |
| `.flip()` | writes `guide.orientation = "horizontal"` | `guide` |
| `.split("type")` | writes segmented `granularity` state | `granularity` |
| `.layout("grouped")` | changes segmented layout through `guide` | `guide` |
| `.collapse("type")` | writes aggregate transform and clears segment state | `granularity` |
| `.stage(["y", "x"])` | writes guide staging order | `guide` |

## Bar Weather Story

Current authoring sequence:

```js
const base = bar("weatherDays")
  .x("decade")
  .y("count")
  .transition(sharedTiming)
  .sort("year")
  .tooltip(["decade", "period", "type", "count"]);

story(createBaseDemo())
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
  .step("Granularity: split into hot/cold segments", base.split("type"), {
    body: "...",
    authoring: 'base.split("type")'
  })
  .step("Guide: stacked to grouped segments", base.split("type").layout("grouped"), {
    body: "...",
    authoring: 'base.split("type").layout("grouped")'
  })
  .step("Granularity: collapse to total days", base.collapse("type", { title: "Total days" }), {
    body: "...",
    authoring: 'base.collapse("type", { title: "Total days" })'
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

## Effective Versus Raw Spec

Raw step view:

```js
{
  mark: "bar",
  guide: { orientation: "horizontal" },
  encoding: {
    x: { field: "decade", type: "nominal" },
    y: { field: "count", type: "quantitative" }
  }
}
```

Effective view after scene compilation:

```js
{
  mark: "bar",
  encoding: {
    x: { field: "count", type: "quantitative" },
    y: { field: "decade", type: "nominal" }
  },
  sceneState: {
    guide: { orientation: "horizontal", scale: null, staging: { order: ["y", "x"] } }
  }
}
```

Diff, transition planning, and rendering use the effective view. This is why
direct jumps in stepped mode can compare step 1 to step 3 and still discover the
real orientation and geometry changes.
