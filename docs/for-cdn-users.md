# For CDN Users (No Build Tools Required)

This guide is for anyone who wants to drop a scrolling chart into a web page —
a blog post, a static site, a CMS "custom HTML" block — **without** npm,
bundlers, or a build step. If you can paste HTML into a page, you can use
ScrollyLite.

If you're a JavaScript developer setting up a project with npm/bundlers,
read the [Developer Guide](./for-developers.md) instead — it covers the same
ground with that workflow in mind.

## 1. The complete copy-paste template

Paste this into an HTML file (or your CMS's HTML block) and open it in a
browser. It renders a three-step bar chart story — no installation, no
terminal, nothing to compile:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/scrollylite@0.1.0/dist/scrollylite.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/scrollylite@0.1.0/dist/themes/default.css">
  </head>
  <body>
    <main id="app"></main>

    <script src="https://cdn.jsdelivr.net/npm/scrollylite@0.1.0"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    <script src="https://cdn.jsdelivr.net/npm/arquero@8/dist/arquero.min.js"></script>
    <script>
      (async () => {
        const { createStory, story, bar } = ScrollyLite;

        const spec = story()
          .title("Revenue")
          .data("rows", {
            values: [
              { category: "A", value: 12 },
              { category: "B", value: 18 },
              { category: "C", value: 9 }
            ]
          })
          .view("main", { height: 420 })
          .step("Baseline", bar("rows").x("category").y("value").key("category"))
          .step(
            "Highlight B",
            bar("rows").x("category").y("value").key("category")
              .highlight({ category: "B" })
          )
          .toSpec();

        await createStory(spec, { target: "#app" });
      })();
    </script>
  </body>
</html>
```

Scroll the page — the chart fades in, then highlights bar "B" as you reach the
second step. That's the whole interaction model: **you describe what each step
looks like, ScrollyLite figures out the animation between them.**

## 2. What each piece is for

| Tag | Purpose |
|---|---|
| `scrollylite.css` | Required structural styles — layout, sticky positioning, nav rail, progress bar. Always load this. |
| `themes/default.css` | The default color palette (backgrounds, text, accent color). Swap or override for your own look — see [Theming](#5-changing-colors-theming). |
| `scrollylite@…` `<script>` | The library itself. Exposes a global `ScrollyLite` object. |
| `d3@7` | Charting/animation engine ScrollyLite is built on. **Required.** |
| `arquero@8/.../arquero.min.js` | Data-shaping engine (filtering, grouping, aggregating). **Required.** |

All three libraries must finish loading before your script runs — that's why
the inline `<script>` block comes *after* them in the HTML.

> **Pin the version.** `@0.1.0` always points at exactly that release — your
> page won't break if a new version ships. `@latest` is tempting but can
> silently change the chart's behavior underneath you later. Always pin in
> anything you intend to keep online.

## 3. Swapping in your own data

Replace the `.data(...)` call with your own rows. Two ways:

**Inline data** (small datasets, prototyping):

```js
.data("rows", {
  values: [
    { month: "Jan", sales: 120 },
    { month: "Feb", sales: 98 },
    { month: "Mar", sales: 143 }
  ]
})
```

**A CSV or JSON file hosted somewhere** (your own site, a Gist, GitHub raw,
etc.):

```js
.data("rows", { url: "https://example.com/sales.csv", type: "csv" })
// or: { url: "https://example.com/sales.json", type: "json" }
```

Then point your chart at the field names in *your* data:

```js
.step("Baseline", bar("rows").x("month").y("sales").key("month"))
```

`.x(field)` / `.y(field)` choose which columns drive the chart's axes;
`.key(field)` tells ScrollyLite which column uniquely identifies each bar (so
it can smoothly morph bars between steps instead of popping them in and out —
pick whatever column names the "thing" each bar represents, e.g. `month`,
`country`, `product`).

For the full menu of chart types (`bar`, `line`, `point`, `unit`) and what
each chainable method does, see [Chart Idioms](./chart-idioms.md). For loading
and reshaping data (filtering, grouping, computing aggregates), see
[Data Sources & Transforms](./data-sources-and-transforms.md).

## 4. Adding more steps

Each `.step(title, chartState)` describes one "scene" of your story. Chain as
many as you like — ScrollyLite diffs each pair of consecutive steps and
animates the difference automatically:

```js
const spec = story()
  .data("rows", { url: "https://example.com/sales.csv", type: "csv" })
  .view("main", { height: 480 })
  .step("All months",      bar("rows").x("month").y("sales").key("month"))
  .step("Focus on March",  bar("rows").x("month").y("sales").key("month").highlight({ month: "Mar" }))
  .step("Filter to Q1",    bar("rows").x("month").y("sales").key("month").where({ quarter: "Q1" }))
  .toSpec();
```

You never write the animation yourself — change what a step *looks like* (a
filter, a highlight, a different field, a different chart orientation) and
ScrollyLite infers and plays the right transition. See
[Scenes & Transitions](./scenes-and-transitions.md) if you want to predict or
fine-tune exactly how a given change will animate.

## 5. Changing colors (theming)

Three CSS custom properties control the overall palette — pass a `theme`
object when you create the story (there's no chainable method for it; hand it
to `story({ … })` directly), or override the properties in your own `<style>`
block:

```js
story({
  theme: {
    background: "#fafafa",   // page/figure background
    foreground: "#222",      // text and axis color
    accent: "#b05d3b"        // highlight / emphasis color
  }
})
  .data(/* … */)
  // …
```

```css
/* or, in your own stylesheet, loaded after themes/default.css */
:root {
  --sl-bg: #fafafa;
  --sl-fg: #222;
  --sl-accent: #b05d3b;
}
```

For deeper visual customization (fonts, spacing, the nav rail, progress bar),
target the `.sl-*` classes — see
[Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md#theming).

## 6. Choosing a layout

`.layout(name)` controls where the chart sits relative to your narrative text:

```js
story().layout("floatToText")   // default: chart floats beside scrolling text (two columns)
story().layout("textOverVis")   // chart fills the screen; text scrolls as an overlay on top
```

See [Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md#layout-presets)
for a full comparison and configuration options (activation point, navigation
dots, progress bar, scroll behavior).

## 7. Common gotchas

- **Nothing renders / a console error about D3 or Arquero.** Check the
  `<script>` order — `d3` and `arquero` must load (and finish executing)
  before your inline script calls `createStory`. Open the browser console
  (F12) to see the exact error message.
- **"ScrollyLite target not found: #app".** Your `<main id="app">` (or
  whatever selector you pass as `target`) must exist in the HTML *before*
  your script runs — don't put the script in `<head>` without `defer`/DOMContentLoaded.
- **The chart looks unstyled / has no spacing.** You forgot to load
  `scrollylite.css` (structure) and/or `themes/default.css` (colors) — both
  `<link>` tags in the template above are required for the default look.
- **Bars/points "pop" in and out instead of smoothly moving.** Your `.key()`
  isn't stable across steps, or is missing. Pick a field that uniquely and
  consistently names each mark (see [§3](#3-swapping-in-your-own-data)).
- **I changed the spec but the page still shows the old chart.** Browsers
  cache CDN URLs aggressively — hard-refresh (Cmd/Ctrl+Shift+R), or bump the
  pinned version once you publish a new one.

## 8. Where to go deeper

Once you're comfortable with the basics above, these references cover
everything ScrollyLite can do — written for any reader, not just programmers
with a build setup:

- [Core Concepts](./concepts.md) — the mental model behind stories, steps, and scenes.
- [Chart Idioms](./chart-idioms.md) — every chart type and every chainable option.
- [Data Sources & Transforms](./data-sources-and-transforms.md) — loading and reshaping data.
- [Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md) — visual presets, theming, scroll behavior.
- [Scenes & Transitions](./scenes-and-transitions.md) — how animations are inferred and how to guide them.

If you later outgrow the CDN workflow (e.g. you want TypeScript, bundling, or
to contribute to the project), the [Developer Guide](./for-developers.md) and
[Getting Started](./getting-started.md) cover the npm/ESM path.
