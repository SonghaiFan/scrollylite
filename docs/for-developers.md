# For Developers

This guide is for JavaScript developers integrating ScrollyLite into a
bundled/framework project (Vite, webpack, Next.js, …), contributing to the
library itself, or building custom chart idioms. If you just want to drop a
chart into a static page with `<script>` tags and no build step, see
[For CDN Users](./for-cdn-users.md) instead — the underlying grammar is
identical either way, only the loading mechanics differ.

## 1. Install

```sh
npm install scrollylite d3 arquero
```

`d3` and `arquero` are **peer dependencies** — ScrollyLite doesn't bundle
them, so your project controls the versions and there's only one copy on the
page. ScrollyLite requires `d3@^7` and `arquero@^8`.

## 2. Minimal integration

```js
import * as aq from "arquero";
import * as d3 from "d3";
import { createStory, story, bar } from "scrollylite";
import "scrollylite/style.css";
// Optional packaged theme:
// import "scrollylite/themes/default.css";

const spec = story()
  .data("rows", { url: "./sales.csv", type: "csv" })
  .view("main", { height: 520 })
  .step("Baseline", bar("rows").x("month").y("sales").key("month"))
  .toSpec();

const runtime = await createStory(spec, { target: "#app", d3, aq });

// later, e.g. on component unmount:
runtime.destroy();
```

With the ESM entry (`import { createStory } from "scrollylite"`), `d3` is
**always required** and `aq` is required as soon as your spec uses any data
transform (filter, fold, bin, aggregate, …). Pass both up front — it's the
simplest, safest default. (The CDN/global build behaves differently: it falls
back to `globalThis.d3`/`globalThis.aq`. See
[Runtime API](./runtime-api.md#createstoryspec-options) for the full
ESM-vs-browser distinction.)

A second entry point, `scrollylite/browser`, exposes the same API pre-wired
for `<script>`-tag globals if you need that shape inside a bundled project.

## 3. Package layout (what you're importing)

| Export | What it is |
|---|---|
| `dist/scrollylite.esm.js` | Main ESM entry — `import { createStory, story, … } from "scrollylite"` |
| `dist/scrollylite.browser.js` | ESM entry pre-wired for browser-global D3/Arquero — `scrollylite/browser` |
| `dist/scrollylite.global.js` | IIFE/UMD bundle exposing `window.ScrollyLite` — what the CDN serves |
| `dist/index.d.ts` / `dist/browser.d.ts` | TypeScript definitions (`types` field — automatic with most tooling) |
| `dist/scrollylite.css` | Required structural styles — `scrollylite/style.css` |
| `dist/themes/default.css` | Default color theme — `scrollylite/themes/default.css` |

TypeScript users get types automatically via the `types`/`exports` fields in
`package.json` — no `@types/` package needed.

## 4. The grammar, in brief

You build a **spec** — a plain JS object describing datasets, layout, and a
sequence of **steps** — and hand it to `createStory`. The chainable `story()`
/ `bar()`/`line()`/`point()`/`unit()` builders are sugar for producing that
object; you can also hand-author the spec JSON directly (e.g. for
serialization, server-side generation, or storing stories in a CMS).

```js
story()
  .data("rows", { url: "...", type: "csv" })
  .layout("floatToText")
  .step("A", bar("rows").x("category").y("value").key("category"))
  .step("B", bar("rows").x("category").y("value").key("category").highlight({ category: "X" }))
  .toSpec();   // → plain object, JSON-serializable
```

Each `.step(title, chartState)` describes *what that step's chart looks like*.
ScrollyLite diffs every consecutive pair of steps, classifies the differences
into one or more **scenes** (`focus`, `observation`, `granularity`, `guide`),
and computes/plays the corresponding D3 transition — you never hand-write
animation code. This is the project's core idea; see
[Core Concepts](./concepts.md) and
[Scenes & Transitions](./scenes-and-transitions.md) for the full model.

Full references for every part of the grammar:

- [Story Builder](./story-builder.md) — `story()` chainable API
- [Chart Idioms](./chart-idioms.md) — `bar`/`line`/`point`/`unit` and every chainable method
- [Data Sources & Transforms](./data-sources-and-transforms.md) — datasets and the transform pipeline
- [Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md) — visual presets, theming, scroll config
- [Runtime API](./runtime-api.md) — `createStory`, `StoryRuntime`, programmatic control

## 5. Project architecture (for contributors)

```
src/
  grammar/          chainable story/idiom authoring API, scene inference (inferTransition)
  charts/           chart idiom plugins: renderer, spec compiler, authoring state, per-idiom folders
  layouts/          layout preset registry (floatToText, textOverVis)
  scroll-drivers/   geometry-based native scroll tracking
  data/             dataset loading + transform pipeline (filter, fold, bin, aggregate, sort, …)
  transitions/      spec compilation from plugin transition capabilities
  identity/         semantic-key resolution across steps
  runtime/          step actions, scroll-progress easing
  themes/           default theme CSS
  scrollylite.js    createStory: lifecycle, theming, layout, rendering, cleanup
  index.js          public exports (ESM)
  index.d.ts        TypeScript definitions
```

Each built-in chart idiom lives in `src/charts/<idiom>/` and exports a
`plugin.js` built with `defineChartIdiom`, plus an `authoring.js` exposing a
chainable builder (`bar()`, `line()`, …). See
[`src/charts/README.md`](../src/charts/README.md) for the exact folder
contract, and [Extending with Plugins](./extending-with-plugins.md) for how to
build a new one (the built-ins use the *same* public plugin API — nothing is
special-cased).

## 6. Scripts and workflows

```sh
npm run check          # lint/structural checks
npm run manifest:check # regenerate + validate src/charts/manifest.js (run after add/remove idiom folders)
npm run build          # produce dist/ (ESM, browser, global bundles, .d.ts, CSS)
npm run examples:check # validate example specs compile
npm run package:check  # validate package.json / exports shape
npm run pack:check     # smoke-test the package as an npm consumer would see it
npm run smoke          # end-to-end smoke test of the built bundles
npm test               # check + manifest:check + build + examples:check + package:check + smoke
```

`npm test` is the full gate — it's what `prepack`/`prepublishOnly` run
automatically, and what `release:check` wraps for the release flow below.

## 7. Running the examples locally

```sh
git clone https://github.com/SonghaiFan/scrollylite.git
cd scrollylite
npm install
python3 -m http.server 5510
```

```text
http://localhost:5510/examples/minimal/      # smallest possible story
http://localhost:5510/examples/weather/      # full demo: 4 idioms, 2 layouts, scroll/step modes
```

The weather demo accepts query params for quick exploration, e.g.
`?layout=textOverVis&story=line&action=scroll` — see
[`examples/weather/index.html`](../examples/weather/index.html) for how it
wires `createStory` to the URL, and
[`examples/weather/specs/`](../examples/weather/specs/) for real authored
story specs across all four idioms.

## 8. Release flow (maintainers)

```sh
npm version patch          # bump version, tag
npm run release:check      # full test gate + dry-run pack
npm publish                # publish to npm (mirrors automatically to jsDelivr/unpkg)
git push --follow-tags
```

Update `CHANGELOG.md` before tagging. `npm publish` re-runs
`release:check` via `prepublishOnly` regardless — the manual run above is for
catching problems *before* you bump the version.

jsDelivr serves the published npm package directly:

```text
https://cdn.jsdelivr.net/npm/scrollylite@<version>/dist/scrollylite.global.js
https://cdn.jsdelivr.net/npm/scrollylite@<version>/dist/scrollylite.esm.js
```

It can also serve tagged GitHub releases — but for that path you must commit
`dist/` before tagging, since GitHub's CDN mirror doesn't run a build step:

```text
https://cdn.jsdelivr.net/gh/<org>/<repo>@<tag>/dist/scrollylite.esm.js
```

## 9. Extending ScrollyLite

Need a chart type ScrollyLite doesn't ship (area, map, custom pictogram
layout, …)? Build it as a plugin via `defineChartIdiom` and register it with
`registerChartIdiom`/`registerChartModule` — the four built-ins use exactly
this API, so a custom idiom participates fully in scene-driven transitions,
the story builder, and `.toSpec()` serialization. Full guide:
[Extending with Plugins](./extending-with-plugins.md).
