# Core Concepts

ScrollyLite has a small vocabulary. Once these pieces click, every part of the
API — the story builder, the chart idioms, the runtime — reads the same way.

## Story

A **story** is the top-level spec: title, description, datasets, layout,
theme, named views, and an ordered list of **steps**. It's a plain JSON-like
object — you can write it by hand, generate it, or build it with the
[`story()`](./story-builder.md) chainable API. Either way, `createStory(spec,
options)` is what brings it to life in the browser.

```js
{
  title: "Melbourne Weather",
  description: "How hot and cold days have shifted across a century.",
  data: { weatherDays: { url: "./weather_days.csv", type: "csv" } },
  layout: { preset: "floatToText", offset: 0.58 },
  theme: { background: "#fafafa", accent: "#b05d3b" },
  views: { main: { title: "Melbourne weather", height: 540 } },
  steps: [ /* … */ ]
}
```

## Step

A **step** is one beat of the narrative: a title, body text, and one
**view spec** per named view (usually just `main`). Steps are what the reader
scrolls or clicks through. Each step also carries:

- `transition.scene` — which kinds of change happened since the previous step
  (inferred automatically; see [Scenes](#scene))
- `action` — how the step is driven: discrete nav/programmatic jumps (`"step"`),
  continuous scroll-scrubbing (`"scroll"`), tooltips (`"tooltip"`), or
  play-on-load (`"enter"`)

You rarely write steps by hand. The story builder's `.step(title, chartState,
options)` compiles all of this for you from a chart idiom chain.

## View

A **view** is one rendered chart inside a story. Most stories use a single
view named `"main"`, declared once via `.view("main", { title, height })` and
then re-encoded differently at each step. Multi-view stories are possible —
declare more named views and provide a spec for each in every step's `views`
map.

A view's **spec** is a small Vega-Lite-flavored object: `mark` (the idiom key,
e.g. `"bar"`), `data`, `encoding` (channel → field/value bindings), `transform`
(data-shaping pipeline), plus idiom-specific extras like `key`, `guide`,
`granularity`, `unit`. The chart idiom builders (`bar()`, `line()`, …) are
just ergonomic factories for this object — `.toSpec()` returns the compiled
form.

## Idiom

An **idiom** is a chart type plugin: `bar`, `line`, `point`, `unit` ship
built in. An idiom bundles together:

- a **renderer** (draws marks with D3, handles enter/update/exit and
  transitions)
- a **spec compiler** (normalizes/derives encoding from authored shorthand)
- a list of **scenes** it supports and how each scene maps to a state
  operation (e.g. `focus → filter`)
- optional **transition plans** (custom multi-stage animation sequencing,
  e.g. bar's flip does y-then-x staging)

You can register your own idiom with [`defineChartIdiom` /
`registerChartIdiom`](./extending-with-plugins.md). From the author's side,
each idiom exposes a chainable builder — `bar("dataset")`, `line("dataset")`,
etc. — documented in full in [Chart Idioms](./chart-idioms.md).

## Scene

A **scene** is ScrollyLite's vocabulary for *what kind of thing changed*
between two consecutive steps. There are four:

| Scene         | Question it answers                          | Typical authoring trigger |
|---------------|----------------------------------------------|---------------------------|
| `focus`       | Which rows are emphasized or visible?        | `.where()`, `.filter()`, `.highlight()` |
| `guide`       | How is the same data being read (orientation, scale, layout)? | `.flip()`, `.guide()`, `.layout()` |
| `granularity` | What level of aggregation/grouping is shown?  | `.breakdown()`, `.rollup()`, `.segment()` |
| `observation` | Which variable/field is encoded?              | `.x()`, `.y()`, `.color()` with a new field |

You almost never set scenes manually. When you chain `.step(title, viewState)`
in the story builder, ScrollyLite **diffs** the current view state against the
previous step's and infers `transition.scene` automatically — see
[Scenes & Transitions](./scenes-and-transitions.md) for the full inference
rules and how each idiom animates each scene.

## Semantic identity (`key`)

Scrollytelling lives and dies by object permanence: when a bar splits into two
segments, or a scatter point's axes change, does the reader still recognize
"that's the same thing, now shown differently"? ScrollyLite tracks this with a
**semantic key** — `.key("decade")` or `.key(["decade", "type"])`. The
renderer uses the key to match marks across steps with D3's data-join, so
marks animate (move/resize/recolor) instead of disappearing and reappearing.

Pick a key that uniquely identifies a "thing" in your narrative — usually the
field(s) that stay constant across the steps where that thing appears.

## Authoring vs. compiled spec

The chart builders carry extra **authoring-only** state — e.g. the last
`.where()` selectors, used to infer titles and identity — that doesn't belong
in the final spec. Calling `.toSpec()` runs the compiler, which:

- expands shorthand (`.y("count", "Total")` → `{ field: "count", title:
  "Total" }`)
- folds `.where()`/`.filter()` into `transform: [{ filter }, …]`
- prunes authoring-only bookkeeping (`__grammar`, default guide staging, …)
- hands the result to `compileViewSpec`, which finalizes margins, narrative
  metadata, and idiom-specific defaults

The result is a plain object — safe to `JSON.stringify`, store, or hand-edit.

## Putting it together

```js
import { story, bar } from "scrollylite";

const base = bar("weatherDays").x("decade").y("count").key("decade");

const spec = story()
  .title("Hot Days Over Time")
  .data("weatherDays", { url: "./weather_days_tidy.csv", type: "csv" })
  .layout("floatToText")
  .view("main", { title: "Melbourne", height: 540 })
  .step("Baseline", base.where({ type: "Hot days" }))            // observation: count by decade
  .step("Focus", base.where({ type: "Hot days", period: "recent" })) // scene: focus
  .step("Guide", base.where({ type: "Hot days", period: "recent" }).flip()) // scene: guide
  .step("Granularity", base.breakdown("type"))                   // scene: granularity
  .toSpec();

await createStory(spec, { target: "#app", d3, aq });
```

Each `.step()` call records a chart state; the builder diffs consecutive
states, infers the scene(s), compiles the view, and appends a finished step to
`spec.steps`. By the time `.toSpec()` runs, the whole story — narrative,
scenes, and chart specs — is ready to render.
