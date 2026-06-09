# Getting Started

ScrollyLite turns a declarative spec into a scrolling, narrated data
visualization. You describe **what the data is**, **what charts to show**, and
**what changes from step to step** — ScrollyLite figures out how to animate
between steps and wires up scroll and click navigation for you.

This guide gets a story on screen in two ways: straight from a CDN (no build
tools), and via npm for bundler-based projects.

## 1. The three things you need

Every ScrollyLite story needs:

1. **D3** (`^7.0.0`) — rendering and transitions
2. **Arquero** (`^8.0.0`) — data loading and transforms
3. **A spec** — either hand-written JSON/JS, or built with the [story
   builder](./story-builder.md) and chart idiom helpers (`bar`, `line`,
   `point`, `unit`)

D3 and Arquero are **peer dependencies** — ScrollyLite does not bundle them.
This keeps the library small and lets you share one copy of D3/Arquero across
your whole page.

## 2. CDN usage (no build step)

Load the runtime CSS, ScrollyLite, D3, and Arquero from jsDelivr, then call
`ScrollyLite.createStory()`:

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

    <script src="https://cdn.jsdelivr.net/npm/scrollylite@0.1.0/dist/scrollylite.global.js"></script>
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

A few important details:

- **Script order matters.** ScrollyLite's global build (`scrollylite.global.js`)
  reads `globalThis.d3` and `globalThis.aq` lazily inside `createStory()`, but
  D3/Arquero must be present on the page (loaded in any order, as long as
  they've executed) before you call `createStory`.
- **The global build injects D3/Arquero for you.** When you load
  `scrollylite.global.js`, `ScrollyLite.createStory(spec, options)` falls back
  to `globalThis.d3` / `globalThis.aq` if you don't pass `d3`/`aq` explicitly.
  If you use the ESM entry (`scrollylite.esm.js`) instead, you must pass them
  explicitly (see below).
- **Pin exact versions in production.** `@0.1.0` URLs are stable forever;
  `@latest` is convenient for experiments but will silently change underneath
  a published story.
- `target` defaults to `"#app"` — a CSS selector or DOM element where the
  story shell is rendered. ScrollyLite clears and owns everything inside it.

## 3. npm usage (bundlers, frameworks)

```sh
npm install scrollylite d3 arquero
```

```js
import * as aq from "arquero";
import * as d3 from "d3";
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
  .toSpec();

await createStory(spec, { target: "#app", d3, aq });
```

With the ESM entry, both `d3` and `aq` are currently **required**. D3 powers
rendering/loading; Arquero powers the transform pipeline used by filters,
aggregates, breakdowns, rollups, and other data shaping.

## 4. What `createStory` does

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

## 5. Where to go next

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

## 6. Run the bundled examples locally

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
