# Scrolly Grammar Template

This is a from-scratch template for a declarative scrollytelling visualization
library. The idea is close to Vega-Lite's high-level grammar: authors describe
semantic pieces of a visualization, and the runtime compiles that specification
into DOM, scroll states, data transforms, scales, axes, marks, and animated
transitions.

## Why This Exists

The five sibling projects in this folder repeat the same hidden pattern:

- load one or more CSV files
- create a sticky visualization region
- define narrative scroll steps
- change chart state when the active step changes
- preserve object identity with keyed joins
- animate marks between layouts with enter/update/exit transitions
- reuse marks such as line, bar, point, unit chart, and Sankey-like relationship
  diagrams

The essential abstraction is not just "a chart per step." It is a sequence of
keyed scene states. The same objects can move from a timeline to a scatterplot,
then into a dodged distribution or grouped unit grid.

## Run

Serve this directory over HTTP:

```sh
cd /Users/songhaifan/Documents/scrollytelling_design_space/scrolly-grammar-template
python3 -m http.server 5510
```

Then open:

```text
http://localhost:5510/
```

## Current Grammar Sketch

The grammar has two layers:

- `designSpace`: thesis vocabulary for Layout, Transition, and Action.
  Structure is intentionally not implemented yet.
- `views`: executable visual grammar for data, marks, encodings, transforms,
  keyed joins, and animation timing.

The core runtime should not grow one `if/else` branch per chart or layout. Chart
types and layout modes are managed as registries:

- `src/charts/index.js` normalizes chart aliases and exposes a registry pattern.
- `src/layouts/index.js` resolves layout presets such as `floatToText` and
  `textOverVis`.
- `src/transitions/index.js` resolves scene transition tokens and compiles the
  first bar-chart scene states for `focus`, `guide`, `granularity`, and
  `observation`.
- `src/scrollylite.js` owns story flow, data loading, scenes, actions, and
  transitions; it delegates chart rendering and layout selection.

```js
const sharedTransition = {
  duration: 1200,
  ease: "cubicInOut",
  stagger: { step: 18, max: 360 }
};

export default {
  title: "Story title",
  description: "Short story description",
  data: {
    weather: {
      url: "./src/data/weather_sample.csv",
      type: "csv"
    }
  },
  layout: {
    offset: 0.58,
    nav: true,
    progress: true
  },
  designSpace: {
    layout: {
      preset: "textOverVis",
      axis: "vertical",
      binding: "floatToText",
      container: "visContainer",
      layering: "textOverVis"
    },
    action: ["header", "step", "tooltip", "enter"]
  },
  views: {
    main: {
      height: 520
    }
  },
  steps: [
    {
      title: "Narrative state",
      body: "Text shown beside the sticky chart.",
      designSpace: {
        transition: {
          scene: ["focus"],
          segue: ["packUnpack"]
        },
        action: ["step", "tooltip"]
      },
      views: {
        main: {
          data: "weather",
          mark: "bar",
          key: "decade",
          focus: { field: "period", equal: "recent" },
          transition: sharedTransition,
          transform: [{ sort: { field: "year", order: "ascending" } }],
          encoding: {
            x: { field: "decade", type: "nominal" },
            y: { field: "hot_days", type: "quantitative" },
            color: { field: "period", type: "nominal" },
            tooltip: [{ field: "decade" }]
          }
        }
      }
    }
  ]
};
```

## Implemented In This Template

- Static ES-module runtime, no build step
- Thesis-aligned `designSpace` annotations for `Layout`, `Transition`, and
  `Action`
- Scrollama-driven active steps
- CSV loading through D3
- Structured transforms: `filter`, `fold`, `aggregate`, `bin`, `sort`, `limit`
- Chart registry starting with `scatter`, `line`, and `bar`
- Chart aliases such as `point`, `dot`, and `barChart`
- Encoding channels: `x`, `y`, `color`, `tooltip`
- Persistent SVG scene layers instead of clearing and redrawing
- Keyed enter/update/exit transitions
- Pairwise transition planning from previous scene state to next scene state
- Declarative transition timing: `duration`, `ease`, and `stagger`
- First bar-chart scene transition compiler:
  - `focus` adds a filter transform for a specific data subset
  - `guide` can re-orient bars and change scale with staged x/y transitions;
    visual guide cues are opt-in through `guide.cue`
  - `granularity` folds/aggregates wide fields into stacked segmented bars
  - `observation` changes the encoded quantitative variable for the same
    categories
- Layout registry starting with `floatToText` and `textOverVis`
- Generated progress/nav UI

## Next Abstractions

- Keep Structure out of v0 implementation until branch/merge/path orchestration
  is designed separately
- Add a JSON Schema for validation and editor autocomplete
- Move built-in chart renderers into separate modules:
  `charts/scatter.js`, `charts/line.js`, `charts/bar.js`
- Add plugin renderers such as `@scrolly-lite/chart-sankey`,
  `@scrolly-lite/chart-unit`, and `@scrolly-lite/chart-map`
- Add control grammar for station/date/type selectors
- Extend transition grammar from scene transitions into segue transitions:
  path drawing, Sankey link reveals, and compatible mark morphing
- Add `compose` support for multiple sticky figures and inset charts
- Add a compiler output that can be inspected like Vega-Lite-to-Vega
