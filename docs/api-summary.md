# ScrollyLite API Summary

This is the current phase-1 API surface after consolidating the scroll system
to the native controller.

## Top-Level Story Spec

```js
{
  title,
  description,
  data,
  layout,
  designSpace,
  views,
  steps
}
```

`data` maps dataset names to sources:

```js
data: {
  weatherDays: {
    url: "./src/data/weather_days_tidy.csv",
    type: "csv"
  }
}
```

The current bar grammar assumes long data in a compact
`entity/time/type/count` shape. For the weather demo, `type` is `Hot days` or
`Cold days`, and `count` is the measured value. If one x category maps to
multiple y values, use `.where(...)` to choose a subset, or
`.split(...)` / `.collapse(...)` to change granularity. A future data-preparation
API should convert wide tables to this long flavour.

`layout` controls story mechanics:

```js
layout: {
  offset: 0.58,
  nav: true,
  progress: true,
  scroll: {
    progress: "geometry",
    clamp: true,
    navigation: {
      behavior: "instant",
      progress: 0.98
    }
  }
}
```

`designSpace` records the thesis vocabulary:

```js
designSpace: {
  layout: {
    preset: "floatToText" // or "textOverVis"
  },
  action: ["header", "step", "tooltip", "enter"]
}
```

Structure is intentionally out of scope for the current implementation.

## Step Spec

Each step can declare a transition type and a view state:

```js
{
  title: "Guide: change scale",
  body: "Narrative copy.",
  designSpace: {
    transition: {
      scene: ["guide"]
    },
    action: ["scroll", "tooltip"]
  },
  views: {
    main: {
      mark: "bar",
      data: "weatherDays",
      key: "decade",
      guide: { orientation: "horizontal" },
      transform: [
        { filter: { field: "type", equal: "Hot days" } }
      ],
      encoding: {
        x: { field: "decade", type: "nominal" },
        y: { field: "count", type: "quantitative" }
      }
    }
  }
}
```

In stepped mode, transitions run with time. In scroll mode, transition steps add
`action: ["scroll"]`, and the native controller scrubs the D3 transition.

## Chart View Spec

Supported marks:

- `bar`
- `scatter`
- `line`
- `unit`

Shared view fields:

- `data`: dataset name
- `mark`: chart type
- `key`: semantic identity key
- `transform`: Arquero-backed transform list
- `encoding`: visual channels
- `transition`: timing override
- `focus`, `guide`, `granularity`, `observation`: scene-state parameters

Supported encoding channels:

- `x`
- `y`
- `color`
- `tooltip`
- `size` for scatter-style marks

Color can be direct, categorical, or composite:

```js
color: { value: "#b05d3b" }
color: { field: "period", type: "nominal" }
color: { field: "count", type: "quantitative" } // same hue, luminance varies
color: {
  hue: { value: "#b05d3b" },
  luminance: {
    field: "period",
    domain: ["early", "middle", "recent"],
    lightness: [18, 0, -18]
  }
}
```

When `encoding.color` is omitted, the runtime applies a default schema. It looks
for semantic categorical fields such as `type`, `kind`, `category`, `group`,
`series`, or `period`, and assigns hue. Hot/Cold values use the case-study
red/blue mapping. Explicit quantitative color fields use luminance.

## Scene Semantics

Scene-state fields and transition labels are related but separate. A step can
carry `granularity` state because the final chart is segmented while declaring
only `scene: ["guide"]` because the authored delta is stacked-to-grouped
repositioning.

`focus`: change data size through filtering or unfiltering. Visual elements
enter and exit.

`guide`: change scale, coordinate mapping, axis mapping, or layout while the
data and observation stay the same.

`granularity`: change visual element grain, such as stacked segments merging to
one aggregate bar or one aggregate bar splitting into segments.

`observation`: change which variable is encoded while preserving the same
entity key.

Unit chart does not implement observation. Its observation is count.

## Authoring API Prototype

Phase 2 introduces a small grammar layer for story authoring. A story may use
one chart idiom or several; the current weather demo simply uses one chart idiom
per story.

```js
import { bar, story } from "./src/grammar/index.js";

const base = bar("weatherDays")
  .x("decade")
  .y("count")
  .where({ type: "Hot days" });

const segmented = base.split("type");

const spec = story()
  .data("weatherDays", {
    url: "./src/data/weather_days_tidy.csv",
    type: "csv"
  })
  .layout("floatToText", {
    runtime: {
      offset: 0.58,
      nav: true,
      progress: true
    }
  })
  .view("main", { title: "Melbourne weather sample", height: 540 })
  .step("Baseline", base)
  .step("Focus recent", base.where({ period: "recent" }))
  .step("Flip coordinates", base.flip())
  .step("Cold days", base.where({ type: "Cold days" }))
  .step("Split", segmented)
  .step("Grouped", segmented.layout("grouped").stage(["x", "y"]))
  .step("Collapse", segmented.collapse("type", { title: "Total days" }))
  .toSpec();
```

This layer compiles to the same executable view specs described above. It is an
authoring convenience, not a second renderer.

## Runtime API

```js
const story = await createStory(spec, { target: "#app" });
```

Returned fields:

- `spec`: compiled spec
- `data`: loaded datasets
- `signature`: design-space signature
- `renderStep(index, options)`
- `renderScrollProgress(index, progress, direction)`
- `scrollDriver`: native scroll controller
- `destroy()`

## Current Design Commitments

- One native scroll controller only.
- D3 remains the mark-rendering and transition engine.
- Scroll mode scrubs D3 transition schedules instead of duplicating animation
  logic in chart renderers.
- Scroll-driven steps use authored source states, not last-rendered scene
  state: step `i` scrubs from step `i - 1`, while step 1 scrubs from an empty
  scene. This keeps forward and reverse scroll paths symmetric.
- Semantic keys are the primary mechanism for object consistency.
- Chart idioms extend through `BaseChart` and `src/charts/<type>/`.

## TODO

- Add a data-preparation API for converting wide tables into the long flavour
  expected by the bar grammar, for example folding `hot_days` and `cold_days`
  into `type` plus `count`.
