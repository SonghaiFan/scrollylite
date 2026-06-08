# Story Builder

`story()` returns a `StoryBuilder`: a chainable, immutable-feeling (but
internally mutating) authoring API that produces a compiled story spec via
`.toSpec()`. Every method below returns `this`, so calls chain freely and in
any reasonable order — the builder recompiles steps lazily whenever something
that affects them changes.

```js
import { story, bar } from "scrollylite";

const spec = story()
  .title("…")
  .data(/* … */)
  .layout(/* … */)
  .view(/* … */)
  .step(/* … */)
  .toSpec();
```

## `story(initialSpec?)`

Creates a new builder. `initialSpec`, if given, seeds the internal spec object
(deep-cloned) — useful for extending an existing spec or sharing common
boilerplate (see `story.demo()` pattern in
[examples/weather/specs/shared.js](../examples/weather/specs/shared.js)).

```js
const base = story({ data: { rows: { url: "./data.csv", type: "csv" } } });
```

## Metadata

```js
.schema(value: string)       // Sets `$schema` — a JSON Schema URI for tooling/validation. Optional.
.title(value: string)        // Story title, shown in the header.
.description(value: string)  // Narrative subtitle / summary text.
```

## `.data(name, source)` / `.data(datasets)`

Registers one or more datasets. Two call forms:

```js
.data("weatherDays", { url: "./weather_days_tidy.csv", type: "csv" })

.data({
  weather:     { url: "./weather_sample.csv", type: "csv" },
  weatherDays: { url: "./weather_days_tidy.csv", type: "csv" }
})
```

Each `source` may be:

- **Remote file**: `{ url: "path/or/URL", type: "csv" | "json" }` — loaded via
  D3's `d3.csv` / `d3.json` at story start
- **Inline rows**: `{ values: [{ field: value, … }, …] }` — used as-is, no
  network request
- **A plain array**: `[{ field: value, … }, …]` — same as `{ values: […] }`

Multiple `.data()` calls merge into `spec.data` (later calls add/override
dataset names; they don't clear earlier ones). Reference a dataset by name
from a chart idiom builder: `bar("weatherDays")`.

## `.layout(presetOrConfig, options?)`

Two call forms:

```js
// Preset shorthand — sets `layout.preset` and merges `options.runtime`
// (or `options.layout`) on top
.layout("floatToText")
.layout("floatToText", { runtime: { offset: 0.58, nav: true, progress: true } })

// Raw config object — merged directly into `layout`
.layout({ preset: "textOverVis", offset: 0.6, nav: true })
```

Either form merges into the existing `spec.layout` (it doesn't replace it), so
you can call `.layout()` more than once to layer options. See
[Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md) for every
field `layout` accepts (presets, `offset`, `nav`, `progress`, `scroll`, …).

## `.view(idOrConfig, config?)`

Registers named view(s):

```js
.view("main", { title: "Melbourne weather", height: 540 })

// Shorthand: registers under id "main"
.view({ title: "Melbourne weather", height: 540 })

// Multiple views in one call — pass an id/config map directly to the spec
.view({ main: { title: "Trend", height: 480 }, detail: { title: "Detail", height: 320 } })
```

> The two-arg form takes a single id; to register several views in one call,
> pass an `{ id: config, … }` map as the sole argument (it's merged directly
> into `spec.views`, same as the metadata-merge pattern used by `.data()`).

Each view's `config` typically includes `title` (figure caption) and `height`
(pixel height of the chart canvas) — both are read by the renderer and shell.

## `.action(actions)`

Sets the **default action list** applied to every subsequent `.step()` call
(until you call `.action()` again). Accepts a string or array:

```js
.action("step")                    // discrete: click/keyboard navigation only
.action(["scroll", "tooltip"])     // continuous: scroll-scrubbed transitions + tooltips
```

Recognized action values:

| Action     | Meaning |
|------------|---------|
| `"step"`   | Render the step fully on click/keyboard navigation (discrete jumps) |
| `"scroll"` | Interpolate the transition continuously as the reader scrolls through the step (only applies to steps that have a `transition.scene`) |
| `"tooltip"`| Enable hover tooltips on marks |
| `"enter"`  | Play this step's entrance automatically on load — reserved for the **first** step; the builder adds it for you |

The builder's default is `["step", "tooltip"]`. The very first step always
gets `"enter"` appended automatically, regardless of `.action()`.

> Calling `.action()` recompiles all previously-defined steps with the new
> default — so it's safe to call before *or* after `.step()` calls, though
> calling it once up front is the clearest pattern.

## `.step(titleOrDefinition, view?, options?)`

Appends one step. Three call shapes:

```js
// 1) Full definition object — anything you'd put in a compiled step,
//    plus `view` (a chart-state builder or raw view spec)
.step({ title: "…", body: "…", view: bar("rows").x("a").y("b"), authoring: "…" })

// 2) (title, chartState, optionsObject)
.step("Baseline", bar("rows").x("a").y("b"), {
  body: "Narrative copy shown beside/above the chart.",
  authoring: 'bar("rows").x("a").y("b")'   // optional: source snippet shown in the inspector
})

// 3) (title, chartState, "body text shorthand")
.step("Baseline", bar("rows").x("a").y("b"), "Narrative copy as a plain string")
```

`view` may be:
- a **chart idiom builder** (e.g. `bar(...)`, the result of chaining `.x()`,
  `.where()`, …) — its `.toSpec()` is called for you
- a **raw view spec object** — used as-is (after `externalizeScrollyViewSpec`
  normalization)

What happens when you call `.step()`:

1. The builder takes the *previous* step's view state and **diffs** it
   against this one, inferring `transition.scene` (see
   [Scenes & Transitions](./scenes-and-transitions.md)).
2. It compiles the view spec and attaches narrative annotation (`title`,
   `description` from `body`).
3. If you passed `authoring`/`authoringCode`/`code`, it's stored under
   `inspector.authoringCode` (shown in the demo's source-code inspector
   panel — handy for tutorials and live-coding walkthroughs).
4. It assigns `action`: `["step", "tooltip", "enter"]` for the first step,
   or your current `.action()` default for the rest.
5. It pushes the compiled step and **recompiles the whole step list** —
   ScrollyLite always re-derives transitions from scratch so reordering or
   inserting steps stays consistent.

## `.steps(definitions)`

Replaces the entire step list at once and recompiles:

```js
.steps([
  { title: "Step 1", view: bar("rows").x("a").y("b"), body: "…" },
  { title: "Step 2", view: bar("rows").x("a").y("b").where({ a: "x" }), body: "…" }
])
```

Useful when generating steps programmatically (e.g. mapping over a list of
filter values) rather than chaining `.step()` calls one by one.

## `.toSpec()`

Returns a deep clone of the compiled spec — the object you pass to
`createStory()`. Calling it doesn't mutate the builder; you can keep chaining
and call `.toSpec()` again to get an updated snapshot.

```js
const spec = story().title("…")./* … */.toSpec();
await createStory(spec, { target: "#app", d3, aq });
```

## Reusable bases and branching narratives

Because chart-idiom builders are immutable (`.x()` etc. return *new* states),
you can build a `base` chain once and branch off it for each step — exactly
the pattern the bundled examples use:

```js
const base = bar("weatherDays").x("decade").y("count").sort("year");

story()
  .step("Baseline", base.where({ type: "Hot days" }))
  .step("Focus", base.where({ type: "Hot days", period: "recent" }))
  .step("Guide", base.where({ type: "Hot days", period: "recent" }).flip())
  .step("Granularity", base.breakdown("type"))
  .step("Guide: grouped", base.breakdown("type").layout("grouped").flip())
  .toSpec();
```

`base` is never mutated — each `.where()`/`.flip()`/`.breakdown()` call
returns a fresh state, so you can freely branch, reuse, and recombine without
steps leaking state into each other.
