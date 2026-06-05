# Grammar Authoring Notes

Phase 2 starts moving the demo API from hand-written view specs toward
state-transform authoring.

## Principle

Authors should write state transformations. The runtime should infer transition
semantics.

```txt
base state = f(data, encodings, key, timing)
next state = base.alter(...)
transition = infer(base, next)
```

The first implementation targets bar chart only and compiles back to the
existing phase-1 runtime spec. Renderers and transition implementations are not
rewritten.

The grammar expects tidy data. A value category such as hot/cold days should be
stored as one field, for example `temperature_kind`, with the measured value in
another field, for example `days`. Wide-to-long conversion is data preparation,
not a scene grammar operation.

## Current Bar API

```js
import { authoredSteps, bar } from "../grammar/index.js";

const base = bar("weatherDays")
  .x("decade", { title: "Decade" })
  .y("days", { title: "Hot days" })
  .where({ field: "temperature_kind", equal: "Hot days" })
  .color("#b05d3b")
  .key("decade")
  .sort("year")
  .tooltip([
    { field: "decade", title: "Decade" },
    { field: "temperature_kind", title: "Kind" },
    { field: "days", title: "Days" }
  ]);
```

State transforms:

```js
base.filter({ field: "period", equal: "recent" })
base.guide({ orientation: "horizontal", staging: { order: ["y", "x"] } })
base.observeWhere({ field: "temperature_kind", equal: "Cold days" })
base.segment("temperature_kind", { value: "days", layout: "stacked" })
base.segment(...).layout("grouped").stage(["x", "y"])
```

## Inference

The grammar layer records semantic operations when an altering function is
called:

- `.filter()` records `focus`
- `.guide()` records `guide`
- `.y()` records `observation` when it changes an existing y measure
- `.observe()` records `observation` explicitly
- `.observeWhere()` records `observation` when changing a tidy category
- `.segment()` records `granularity`
- `.layout()` and `.stage()` record `guide`

`authoredSteps()` converts those operations into the current design-space step
shape:

```js
{
  designSpace: {
    transition: {
      scene: ["granularity", "guide"]
    }
  },
  views: {
    main: compiledViewSpec
  }
}
```

This avoids relying only on structural diff. A pure diff would also mark
"leaving focus" or "leaving guide" as new transition intent. The operation log
better matches the author's authored delta, and the compiler compares the next
operation chain with the previous one so a derived state like
`base.segment("temperature_kind").layout("grouped")` records only the new
`guide` transition after the segmented state.

The compiled final view state is still complete. For example, the grouped bar
step applies both `granularity` state and `guide` state, while its transition
label remains only `guide`.

## Current Use

`createBarDemo()` in `src/specs/weather-demo.js` now uses this API:

```js
const base = bar("weatherDays")
  .x("decade")
  .y("days")
  .where({ field: "temperature_kind", equal: "Hot days" })
  .key("decade");

const segmented = base.segment("temperature_kind", { value: "days" });

steps: authoredSteps([
  { title: "Baseline", view: base },
  { title: "Focus", view: base.filter(...) },
  { title: "Observation", view: base.observeWhere(...) },
  { title: "Split", view: segmented },
  { title: "Grouped", view: segmented.layout("grouped").stage(["x", "y"]) }
])
```

## Next Work

- Add a story builder API so authors do not write object arrays manually.
- Generalize `ViewState` operations for scatter, line, and unit.
- Add validation and helpful errors for missing `x`, `y`, `key`, and segment
  fields.
- Decide whether operation inference should be explicit, automatic, or mixed:
  operation log first, structural diff as fallback.
