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
import { bar, story } from "../grammar/index.js";

const base = bar("weatherDays")
  .x("decade")
  .y("days", { title: "Days" })
  .color("#b05d3b")
  .key("decade")
  .sort("year")
  .tooltip([
    { field: "decade", title: "Decade" },
    { field: "temperature_kind", title: "Kind" },
    { field: "days", title: "Days" }
  ]);
```

Channel titles default from field names, so `.x("decade")` compiles to a
channel titled `Decade`. Authors only need to provide `{ title: ... }` when the
display label carries extra story semantics, such as showing `days` as
`Hot days`.

State transforms:

```js
base.where({ period: "recent" })
base.flip()
base.y("cold_days", { title: "Cold days" })
base.agg({ by: "decade", value: "days", op: "sum" })
base.agg({ by: ["decade", "temperature_kind"], value: "days", op: "sum", layout: "stacked" })
base.agg(...).layout("grouped").stage(["x", "y"])
```

## Inference

The grammar layer records semantic operations when an altering function is
called:

- `.filter()` records `focus`
- `.where()` records `focus`; `.where()` with no argument resets filters
- `.flip()` and `.guide()` record `guide`
- `.y()` records `observation` when it changes an existing y measure
- `.observe()` records `observation` explicitly
- `.agg()` records `granularity`
- `.layout()` and `.stage()` record `guide`

`story().step()` converts those operations into the current design-space step
shape. `authoredSteps()` remains available as the lower-level helper behind the
builder:

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
`base.agg({ by: ["decade", "temperature_kind"] }).layout("grouped")` records only the new
`guide` transition after the segmented state.

The compiled final view state is still complete. For example, the grouped bar
step applies both `granularity` state and `guide` state, while its transition
label remains only `guide`.

## Current Use

The bar weather story in `src/specs/weather/bar-story.js` now uses this API:

```js
const base = bar("weather")
  .x("decade")
  .y("hot_days", { title: "Hot days" })
  .key("decade");

const segmented = bar("weatherDays")
  .x("decade")
  .y("days", { title: "Days" })
  .agg({ by: ["decade", "temperature_kind"], value: "days", op: "sum", layout: "stacked" });

return story()
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
  .view("main", {
    title: "Melbourne weather sample",
    height: 540
  })
  .step("Baseline", base)
  .step("Focus", base.where({ period: "recent" }))
  .step("Observation", base.y("cold_days", { title: "Cold days" }))
  .step("Split", segmented)
  .step("Grouped", segmented.layout("grouped").stage(["x", "y"]))
  .toSpec();
```

## Next Work

- Add richer validation and better author-facing error messages.
- Generalize `ViewState` operations for scatter, line, and unit.
- Decide whether operation inference should be explicit, automatic, or mixed:
  operation log first, structural diff as fallback.
