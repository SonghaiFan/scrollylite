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
  weather: {
    url: "./src/data/weather_sample.csv",
    type: "csv"
  }
}
```

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
      behavior: "auto",
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
      data: "weather",
      key: "decade",
      guide: { orientation: "horizontal" },
      encoding: {
        x: { field: "decade", type: "nominal" },
        y: { field: "hot_days", type: "quantitative" }
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
color: {
  hue: { value: "#b05d3b" },
  luminance: {
    field: "period",
    domain: ["early", "middle", "recent"],
    lightness: [18, 0, -18]
  }
}
```

## Scene Semantics

`focus`: change the subset or visible range.

`guide`: change orientation, scale, axis mapping, or unit/bar layout while
preserving the same observation.

`granularity`: change aggregation/detail level, such as aggregate bars to
segmented bars, or scatter parent points to child points.

`observation`: change which variable is encoded while preserving the same
entity key.

Unit chart does not implement observation. Its observation is count.

## Authoring API Prototype

Phase 2 introduces a small grammar layer for bar chart authoring:

```js
const base = bar("weather")
  .x("decade")
  .y("hot_days")
  .key("decade");

authoredSteps([
  { title: "Baseline", view: base },
  { title: "Focus recent", view: base.filter({ field: "period", equal: "recent" }) },
  { title: "Cold days", view: base.observe("cold_days") },
  { title: "Split", view: base.segment({ fields: ["hot_days", "cold_days"] }) }
]);
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
- Semantic keys are the primary mechanism for object consistency.
- Chart idioms extend through `BaseChart` and `src/charts/<type>/`.
