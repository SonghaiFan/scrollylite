# Getting Started

ScrollyLite turns a declarative spec into a scrolling, narrated data
visualization. You describe **what the data is**, **what charts to show**, and
**what changes from step to step** — ScrollyLite figures out how to animate
between steps and wires up scroll and click navigation for you.

This guide follows the same shape as D3's getting-started flow: install with a
package manager for app projects, or use a browser-native ES module from a CDN
for plain HTML.

## 1. The three things you need

Every ScrollyLite story needs:

1. **D3** (`^7.0.0`) — rendering and transitions
2. **Arquero** (`^8.0.0`) — data loading and transforms
3. **A spec** — either hand-written JSON/JS, or built with the [story
   builder](./story-builder.md) and chart idiom helpers (`bar`, `line`,
   `point`, `unit`)

D3 and Arquero are **peer dependencies**. ScrollyLite does not bundle them:
you import the exact copies your page or app uses, then pass them to
`createStory()`.

## 2. Install with a package manager

```sh
npm install scrollylite d3 arquero
```

```sh
yarn add scrollylite d3 arquero
```

```sh
pnpm add scrollylite d3 arquero
```

Then import the libraries and create a story:

```js
import * as d3 from "d3";
import * as aq from "arquero";
import { createStory, story, bar } from "scrollylite";
import "scrollylite/style.css";
// Optional: a packaged theme
// import "scrollylite/themes/default.css";

const spec = story()
  .data("rows", {
    values: [
      { category: "A", value: 12 },
      { category: "B", value: 18 },
      { category: "C", value: 9 }
    ]
  })
  .view("main", { height: 520 })
  .step("Baseline", bar("rows").x("category").y("value").key("category"))
  .step(
    "Highlight B",
    bar("rows").x("category").y("value").key("category")
      .highlight({ category: "B" })
  )
  .toSpec();

await createStory(spec, { target: "#app", d3, aq });
```

## 3. Browser ESM from a CDN

For vanilla HTML, use a module script and jsDelivr's `+esm` endpoint, matching
D3's recommended CDN pattern:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/dist/scrollylite.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/dist/themes/default.css">
  </head>
  <body>
    <main id="app"></main>

    <script type="module">
      import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
      import * as aq from "https://cdn.jsdelivr.net/npm/arquero@8/+esm";
      import { createStory, story, bar } from "https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/+esm";

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

      await createStory(spec, { target: "#app", d3, aq });
    </script>
  </body>
</html>
```

A few important details:

- **The ESM entry is explicit.** Import `d3` and `aq`, then pass both to
  `createStory()`. This mirrors D3's own module-first examples and keeps
  agent-generated code easy to inspect.
- **Pin exact versions in production.** `@0.1.1` URLs are stable forever;
  `@latest` is convenient for experiments but will silently change underneath
  a published story.
- `target` defaults to `"#app"` — a CSS selector or DOM element where the
  story shell is rendered. ScrollyLite clears and owns everything inside it.

## 4. Plain script fallback

If a page cannot use module scripts, use the global build:

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/arquero@8/dist/arquero.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/dist/scrollylite.global.js"></script>
```

The global build exposes `window.ScrollyLite` and falls back to
`globalThis.d3` / `globalThis.aq` if you omit `d3` and `aq` in
`createStory()`.

## 5. What `createStory` does

`createStory(spec, options)`:

1. Validates and **compiles** your spec (normalizes steps and navigation
   metadata; builder-authored specs already include inferred transitions).
2. Applies the story's `theme` (sets `--sl-bg` / `--sl-fg` / `--sl-accent`
   CSS custom properties on `<html>`).
3. Loads every dataset declared in `spec.data` (CSV or JSON via D3, or inline
   arrays).
4. Clears `target` and renders the **story shell**: header, narrated steps,
   sticky chart figure(s), nav dots, progress bar, tooltip layer.
5. Renders step 0, wires up the scroll driver, nav-dot click navigation,
   and window resize handling.
6. Returns a `StoryRuntime` you can use to drive the story programmatically,
   inspect the compiled spec/data, or tear it down.

See [Runtime API](./runtime-api.md) for the full `StoryRuntime` shape.

## 6. Where to go next

- [Core Concepts](./concepts.md) — the mental model: stories, steps, views,
  scenes, semantic identity, idioms.
- [Story Builder](./story-builder.md) — the chainable `story()` API for
  authoring specs.
- [Chart Idioms](./chart-idioms.md) — full reference for `bar`, `line`,
  `point`, and `unit`, including every chainable method.
- [Data Sources & Transforms](./data-sources-and-transforms.md) — how to
  declare datasets and shape data with filters, folds, bins, aggregates.
- [Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md) — visual
  presets, CSS theming, and scroll-driver configuration.
- [Scenes & Transitions](./scenes-and-transitions.md) — how ScrollyLite infers
  what changed between steps and animates it.
- [Runtime API](./runtime-api.md) — `createStory`, the returned runtime
  object, and the scroll driver.
- [Extending with Plugins](./extending-with-plugins.md) — register your own
  chart idiom.

## 7. Run the bundled examples locally

```sh
git clone https://github.com/SonghaiFan/scrollylite.git
cd scrollylite
npm install
python3 -m http.server 5510
```

Then open:

```text
http://localhost:5510/examples/minimal/      # Smallest possible story
http://localhost:5510/examples/weather/      # Full demo: 4 idioms, 2 layouts, scroll/step modes
```

The weather demo accepts query parameters — try
`?layout=textOverVis&story=line&action=scroll`. See
[examples/weather/index.html](../examples/weather/index.html) for how the demo
wires `createStory` to the URL.
