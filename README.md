# ScrollyLite

Declarative scrollytelling visualization grammar for browser ESM. Authors
describe story steps, chart idioms, semantic object identity, and transitions;
ScrollyLite renders the sticky visualization and scroll interaction with D3.

```js
const spec = story()
  .data("weatherDays", { url: "./weather_days_tidy.csv", type: "csv" })
  .layout("floatToText")
  .step("Baseline",     bar("weatherDays").x("decade").y("count").key("decade"))
  .step("Focus",        bar("weatherDays").x("decade").y("count").key("decade").where({ period: "recent" }))
  .step("Granularity",  bar("weatherDays").x("decade").y("count").key("decade").breakdown("type"))
  .toSpec();

await createStory(spec, { target: "#app", d3, aq });
```

You write *what* each step looks like — ScrollyLite diffs consecutive steps,
infers what changed (filter? re-orientation? aggregation level? encoded
field?), and animates the transition for you.

📖 **[Read the full documentation →](docs/getting-started.md)**

## Install

Use your package manager, the same way you would install D3:

```sh
npm install scrollylite d3 arquero
```

```sh
yarn add scrollylite d3 arquero
```

```sh
pnpm add scrollylite d3 arquero
```

Then import ScrollyLite, D3, and Arquero explicitly:

```js
import * as d3 from "d3";
import * as aq from "arquero";
import { createStory, story, bar } from "scrollylite";
import "scrollylite/style.css";
// Optional: import "scrollylite/themes/default.css";

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

## Browser ESM from a CDN

For vanilla HTML, follow D3's modern CDN practice: use a module script and
jsDelivr's `+esm` endpoint.

```html
<div id="app"></div>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/dist/scrollylite.css">
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
```

Pin exact versions in production. `latest` URLs are convenient for experiments
but bad for durable stories.

`rows` is a dataset name. `.data("rows", ...)` defines it; `bar("rows")`
uses it.

The ESM entry follows D3's explicit dependency style: import the packages you
need and pass `d3` and `aq` to `createStory()`.

## Plain script fallback

If you cannot use module scripts, load the global bundle instead:

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/arquero@8/dist/arquero.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/dist/scrollylite.global.js"></script>
```

The global build exposes `window.ScrollyLite` and falls back to
`globalThis.d3` / `globalThis.aq` when `createStory()` runs.

## Public API

The top-level package exports a small, stable surface:

```js
import {
  createStory,        // async (spec, { target, d3, aq, debug }) => StoryRuntime
  story,              // chainable story-spec authoring builder
  bar, line, point, unit,            // chainable chart-idiom builders (the only built-ins — no aliases)
  defineChartIdiom,   // define a custom chart idiom plugin
  registerChartIdiom, // register a custom idiom at runtime
  registerChartModule,
  availableChartIdioms
} from "scrollylite";
```

Type definitions ship with the package at `dist/index.d.ts`. For the full
reference — every chainable method, every config option, the runtime object
shape, scene-inference rules, and how to plug in your own chart idiom — see
**[the docs](docs/getting-started.md)**.

## Development

Serve the demo:

```sh
python3 -m http.server 5510
```

Then open:

```text
http://localhost:5510/examples/weather/
```

Build the CDN-ready files:

```sh
npm run build
npm run smoke
```

The build writes:

- `dist/scrollylite.esm.js`
- `dist/scrollylite.browser.js`
- `dist/scrollylite.global.js`
- `dist/index.d.ts`
- `dist/browser.d.ts`
- `dist/scrollylite.css`
- `dist/themes/default.css`
- copied ESM modules under `dist/`

## Architecture

The runtime has four clean layers:

- `src/grammar/`: chainable story and idiom authoring API.
- `src/charts/`: chart idiom plugins, renderers, compilers, state, and keys.
- `src/transitions/`: scene inference and spec compilation from plugin
  capabilities.
- `src/scrollylite.ts`: story lifecycle, data loading, layout, scene rendering,
  scroll control, and cleanup.

Each idiom exposes one plugin:

```js
export const plugin = defineChartIdiom({
  key: "point",
  createRenderer,
  createSpecCompiler,
  scenes: ["focus", "guide", "granularity", "observation"],
  stateOperations: {
    focus: "filter",
    guide: "coordinate",
    granularity: "aggregate"
  },
  transition: {
    plan,
    intermediateSpecs
  },
  defaults: { margin }
});
```

The runtime idiom is flat: `key`, `renderer`, `prepareSpec`,
`resolveTransitionPlan`, `intermediateSpecs`, `defaultMargin`, `inspect`,
`scenes`, and `stateOperations`.

See [Extending with Plugins](docs/extending-with-plugins.md) for a full guide
to authoring and registering your own chart idiom.

## Publish

Release flow:

```sh
npm version patch
npm run release:check
npm publish
git push --follow-tags
```

Update `CHANGELOG.md` before tagging a release. `npm publish` runs
`npm run release:check` automatically.

jsDelivr can serve npm packages with:

```text
https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/dist/scrollylite.esm.js
https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/dist/scrollylite.browser.js
https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/dist/scrollylite.global.js
```

It can also serve tagged GitHub releases:

```text
https://cdn.jsdelivr.net/gh/SonghaiFan/scrollylite@0.1.1/dist/scrollylite.esm.js
```

For GitHub CDN links, commit `dist/` before tagging because GitHub CDN does not
run the build step for you.

## Docs

Pick the guide that matches how you're using ScrollyLite:

- [`docs/for-cdn-users.md`](docs/for-cdn-users.md): **browser ESM, no build tools** — paste a module script into any page and go. Start here if you're not running npm/bundlers.
- [`docs/for-developers.md`](docs/for-developers.md): **npm/bundler projects & contributors** — install, architecture, scripts, release flow, extending the library.
- [`llms.txt`](llms.txt): **AI agents / LLMs** — a dense, single-file reference covering the entire grammar and API, written for machine consumption.

Or start at [`docs/getting-started.md`](docs/getting-started.md), which links
to everything below in reading order:

- [`docs/getting-started.md`](docs/getting-started.md): package-manager install, browser ESM CDN usage, a full working example, and what `createStory` does.
- [`docs/concepts.md`](docs/concepts.md): the mental model — Story, Step, View, Idiom, Scene, semantic identity (`key`).
- [`docs/story-builder.md`](docs/story-builder.md): the chainable `story()` API — `.data()`, `.layout()`, `.view()`, `.step()`, `.toSpec()`, and reusable/branching narrative patterns.
- [`docs/chart-idioms.md`](docs/chart-idioms.md): every chart idiom (`bar`, `line`, `point`, `unit`) and every chainable method/option, with examples.
- [`docs/data-sources-and-transforms.md`](docs/data-sources-and-transforms.md): declaring datasets and the transform pipeline (filter, fold, bin, aggregate, sort, …).
- [`docs/layouts-themes-and-scrolling.md`](docs/layouts-themes-and-scrolling.md): layout presets, the `offset`/`scroll` config, step actions, and theming.
- [`docs/scenes-and-transitions.md`](docs/scenes-and-transitions.md): how ScrollyLite infers and animates `focus`/`observation`/`granularity`/`guide` transitions.
- [`docs/runtime-api.md`](docs/runtime-api.md): `createStory()`, the returned `StoryRuntime`, and driving stories programmatically.
- [`docs/extending-with-plugins.md`](docs/extending-with-plugins.md): defining and registering your own chart idiom with `defineChartIdiom`.
- [`src/charts/README.md`](src/charts/README.md): folder contract for built-in chart idioms.

## License

MIT
