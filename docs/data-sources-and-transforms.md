# Data Sources & Transforms

ScrollyLite loads datasets once at story startup (via D3) and reshapes them
per-view at render time (via Arquero). This page covers both halves: how to
declare data sources, and how the transform pipeline reshapes rows before
they reach the renderer.

## Declaring datasets

Datasets live in `spec.data`, a name → source map. Register them with
`.data()` on the story builder, or write `data` directly in a hand-authored
spec:

```js
story()
  .data("weatherDays", { url: "./weather_days_tidy.csv", type: "csv" })
  .data({
    weather:     { url: "./weather_sample.csv", type: "csv" },
    annotations: { values: [{ year: 1939, label: "Black Friday bushfires" }] }
  })
```

A `source` is one of:

| Form | Example | Behavior |
|---|---|---|
| Remote CSV | `{ url: "./data.csv", type: "csv" }` | Loaded with `d3.csv(url)` |
| Remote JSON | `{ url: "./data.json", type: "json" }` | Loaded with `d3.json(url)` |
| Inline rows (object form) | `{ values: [{ a: 1 }, { a: 2 }] }` | Used directly, no request |
| Inline rows (array form) | `[{ a: 1 }, { a: 2 }]` | Same as `{ values: [...] }` |

All datasets are loaded **once**, in parallel, before the first step renders
(`createStory` awaits `loadData(spec.data, d3)`). Reference a dataset by name
from any chart idiom factory: `bar("weatherDays")`, `line("weather")`, etc.

### Tidy data works best

ScrollyLite's built-in idioms assume **long ("tidy") format**: one row per
observation, with separate columns for the category, the measure, and the
value — rather than one column per measure. For example:

```text
year,decade,period,type,count        ← tidy / long (preferred)
1910,1910s,early,Hot days,7
1910,1910s,early,Cold days,16
```

vs.

```text
year,decade,tmax,tmin,hot_days,cold_days,period   ← wide
1910,1910s,19.8,9.6,7,16,early
```

Wide data isn't a dead end — `bar`'s `.segment({ fields: [...] })` (and
`.breakdown()` under the hood) can **fold** wide columns into long rows at
render time via the `fold` transform (below). But if you control the data
pipeline, exporting tidy CSVs up front keeps your authoring code simpler.

## The transform pipeline

Each view spec carries an optional `transform` array — a sequence of
reshaping operations applied **in order** to the bound dataset before it's
encoded and rendered. `applyTransforms(rows, transforms, aq)` runs this
pipeline using Arquero under the hood; you rarely call it directly — it's
invoked by the renderer for every step.

Most transforms get attached for you by chart-idiom methods (`.where()` →
`filter`, `.sort()` → `sort`, `.breakdown()`/`.rollup()` → `aggregate`/`fold`,
…). You can also push raw transform objects into a spec by hand, or via
`.channel`/`.guide`-level escape hatches when a builder method doesn't cover
your case.

The supported transform kinds, in the order they're checked (a single
transform object may combine more than one key — they're applied in this
fixed precedence):

### `filter`

Keeps rows matching a selector — the workhorse behind `.where()`/`.filter()`.

```js
{ filter: { field: "type", equal: "Hot days" } }
{ filter: { field: "year", gte: 1980, lte: 2020 } }
{ filter: { field: "type", oneOf: ["Hot days", "Cold days"] } }
{ filter: "datum.year >= 1980" }   // string expression form
```

Selector operators: `equal`, `notEqual`, `oneOf` (array membership), `gte`,
`gt`, `lte`, `lt`. You can combine multiple operators in one selector object
(all must pass). String expressions support a single comparison of the form
`datum.<field> <op> <literal>` where `<op>` is one of `== === != !== >= > <= <`
and `<literal>` is a quoted string or a number.

### `timeUnit`

Derives a calendar-unit label from a date field. Currently supports
`unit: "month"`, producing short month names (`"Jan"`, `"Feb"`, …) via
`Date#toLocaleString`.

```js
{ timeUnit: { field: "observedAt", unit: "month", as: "month" } }
// as defaults to `${field}_${unit}` if omitted
```

### `fold`

Converts **wide columns into long rows** — the "melt"/"unpivot" operation.
This is how `.segment({ fields: [...] })` turns `hot_days`/`cold_days`
columns into `type`/`count` rows.

```js
{
  fold: {
    fields: ["hot_days", "cold_days"],
    as: ["type", "count"],                                   // [keyColumn, valueColumn], default ["key", "value"]
    labels: { hot_days: "Hot days", cold_days: "Cold days" } // optional: remap raw column names to display labels
  }
}
```

Each input row becomes `fields.length` output rows, one per folded column,
with the column name (or its mapped label) in the key column and that
column's value in the value column.

### `bin`

Buckets a quantitative field into ranges, producing a categorical label plus
numeric bounds.

```js
{ bin: { field: "temperature", maxbins: 8, as: "tempBin" } }
// or fixed bin width:
{ bin: { field: "temperature", step: 5, as: "tempBin" } }
```

Produces three derived columns: `<as>` (a `"start-end"` label string),
`<as>_start`, and `<as>_end` (numeric bounds). `step` takes precedence over
`maxbins` (default `10`) when both are given; otherwise the bin width is
computed as `ceil((max - min) / maxbins)`.

### `aggregate`

Groups rows and computes summary statistics — the engine behind
`.breakdown()`/`.rollup()`'s `op`/`groupby`/`as` options.

```js
{
  aggregate: {
    groupby: ["decade", "type"],
    fields: [
      { op: "sum", field: "count", as: "total" },
      { op: "mean", field: "count", as: "average" },
      { op: "count", as: "n" }
    ]
  }
}
```

Supported `op` values: `count`, `sum`, `mean`, `min`, `max`, `median`. `field`
is required for every op except `count`. If `as` is omitted, it defaults to
`<op>_<field-or-"rows">`.

### `sort`

Orders rows — the transform `.sort(field, order)` appends.

```js
{ sort: { field: "year", order: "ascending" } }     // or "descending"
{ sort: { fields: [{ field: "decade" }, { field: "count", order: "descending" }] } } // multi-key sort
```

### `limit`

Truncates to the first `n` rows after all preceding transforms run:

```js
{ limit: 10 }
```

## Putting it together

A spec's `transform` array composes naturally — e.g. filter, then fold, then
aggregate, then sort:

```js
{
  transform: [
    { filter: { field: "period", equal: "recent" } },
    { fold: { fields: ["hot_days", "cold_days"], as: ["type", "count"],
              labels: { hot_days: "Hot days", cold_days: "Cold days" } } },
    { aggregate: { groupby: ["decade", "type"], fields: [{ op: "sum", field: "count", as: "count" }] } },
    { sort: { field: "decade" } }
  ]
}
```

When authoring through the chart builders, you'll rarely hand-write this —
`.where()`, `.segment()`, `.breakdown()`, `.rollup()`, and `.sort()` build it
for you, in the right order, while also updating encodings, keys, and titles
to match. Reach for raw `transform` entries only when you need a reshape the
builders don't expose yet.
