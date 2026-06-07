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

The current bar grammar assumes long data in the shape used by tidy-data
teaching examples: identifier fields plus a `type` field and a `count` field.
For the weather demo, one row is one `year/decade/type` observation, where
`type` is `Hot days` or `Cold days`, and `count` is the measured value. If one x
category maps to multiple y values, authors should use `.where(...)` to choose
a subset or `.agg(...)` to define the aggregation. Wide-to-long conversion is
planned as a future data-preparation helper, but the bar demo does not use wide
input.

## Current Bar API

```js
import { bar, story } from "../grammar/index.js";

const base = bar("weatherDays")
  .x("decade")
  .y("count")
  .where({ type: "Hot days" })
  .sort("year");
```

Channel titles default from field names, so `.x("decade")` compiles to a
channel titled `Decade`. Authors only need to provide `{ title: ... }` when the
display label carries extra story semantics, such as showing `count` as
`Hot days`.

Color is optional for the common case. If no color channel is declared, the
runtime looks for semantic category fields such as `type` and assigns hue. The
weather demo therefore keeps Hot/Cold red/blue without writing color in the
story script. If a declared color field is quantitative, it maps to luminance
instead of a categorical palette.

In tidy `type/count` data, choosing hot or cold days is just a keyed filter.
The grammar uses `x + type` as the semantic identity when a `type` selector is
present, so a hot-day baseline bar and a hot-day split segment share the same D3
key.

State transforms:

```js
base.where({ period: "recent" })
base.where({ type: "Cold days" })
base.flip()
base.split("type")
base.split("type").layout("grouped")
base.split("type").collapse("type", { title: "Total days" })
```

## Inference

The grammar layer records semantic operations when an altering function is
called:

- `.filter()` records `focus`
- `.where()` records `focus`; `.where({ type: ... })` also contributes to the
  semantic object key
- `.flip()` and `.guide()` materialize guide-relevant encoding changes
- `.agg()` records `granularity`
- `.split()` and `.collapse()` are short `type/count` aliases for changing grain
- `.layout()` materializes grouped-bar offsets; default staged order is inferred

`story().step()` converts those operations into the current runtime step shape.
`authoredSteps()` remains available as the lower-level helper behind the builder:

```js
{
  transition: {
    scene: ["granularity", "guide"]
  },
  action: ["step", "tooltip"],
  views: {
    main: compiledViewSpec
  }
}
```

This avoids relying only on structural diff. A pure diff would also mark
"leaving focus" or "leaving guide" as new transition intent. The operation log
better matches the author's authored delta, and the compiler compares the next
operation chain with the previous one so a derived state like
`base.split("type").layout("grouped")` records only the new
`guide` transition after the segmented state.

The compiled final view state is still complete. For example, the grouped bar
step applies both `granularity` state and `guide` state, while its transition
label remains only `guide`.

## Current Use

The bar weather story in `src/specs/weather/bar-story.js` now uses this API:

```js
const base = bar("weatherDays")
  .x("decade")
  .y("count")
  .where({ type: "Hot days" });

const segmented = base.split("type");

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
  .step("Cold days", base.where({ type: "Cold days" }))
  .step("Split", segmented)
  .step("Grouped", segmented.layout("grouped"))
  .step("Collapse", segmented.collapse("type", { title: "Total days" }))
  .toSpec();
```

## Next Work

- Add richer validation and better author-facing error messages.
- Add a data-preparation helper for converting wide tables to the long flavour
  expected by the bar grammar.
- Generalize `ViewState` operations for point, line, and circle-unit views.
- Decide whether operation inference should be explicit, automatic, or mixed:
  operation log first, structural diff as fallback.
