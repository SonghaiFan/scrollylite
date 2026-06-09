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

## CDN Usage

Load the runtime CSS, ScrollyLite, D3, and Arquero:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/scrollylite@0.1.0/dist/scrollylite.css">
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
      .step("Baseline", bar("rows")
        .x("category")
        .y("value")
        .key("category"))
      .step("Highlight B", bar("rows")
        .x("category")
        .y("value")
        .key("category")
        .highlight({ category: "B" }))
      .toSpec();

    await createStory(spec, { target: "#app" });
  })();
</script>
```

Pin exact versions in production. `latest` URLs are convenient for experiments
but bad for durable stories.

`rows` is a dataset name. `.data("rows", ...)` defines it; `bar("rows")`
uses it.

The global build reads `globalThis.d3` and `globalThis.aq` when
`createStory()` runs. The core ESM entry, `scrollylite.esm.js`, still requires
dependencies to be passed explicitly.

## npm Usage

```sh
npm install scrollylite d3 arquero
```

```js
import * as aq from "arquero";
import * as d3 from "d3";
import { createStory, story, bar } from "scrollylite";
import "scrollylite/style.css";

const spec = story()
  .data("rows", {
    values: [
      { category: "A", value: 12 },
      { category: "B", value: 18 },
      { category: "C", value: 9 }
    ]
  })
  .view("main", { height: 520 })
  .step("Baseline", bar("rows")
    .x("category")
    .y("value")
    .key("category"))
  .toSpec();

await createStory(spec, {
  target: "#app",
  d3,
  aq
});
```

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
- `src/scrollylite.js`: story lifecycle, data loading, layout, scene rendering,
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
https://cdn.jsdelivr.net/npm/scrollylite@0.1.0/dist/scrollylite.esm.js
https://cdn.jsdelivr.net/npm/scrollylite@0.1.0/dist/scrollylite.browser.js
https://cdn.jsdelivr.net/npm/scrollylite@0.1.0/dist/scrollylite.global.js
```

It can also serve tagged GitHub releases:

```text
https://cdn.jsdelivr.net/gh/SonghaiFan/scrollylite@0.1.0/dist/scrollylite.esm.js
```

For GitHub CDN links, commit `dist/` before tagging because GitHub CDN does not
run the build step for you.

## Docs

Pick the guide that matches how you're using ScrollyLite:

- [`docs/for-cdn-users.md`](docs/for-cdn-users.md): **no build tools** — paste `<script>` tags into any page and go. Start here if you're not running npm/bundlers.
- [`docs/for-developers.md`](docs/for-developers.md): **npm/bundler projects & contributors** — install, architecture, scripts, release flow, extending the library.
- [`llms.txt`](llms.txt): **AI agents / LLMs** — a dense, single-file reference covering the entire grammar and API, written for machine consumption.

Or start at [`docs/getting-started.md`](docs/getting-started.md), which links
to everything below in reading order:

- [`docs/getting-started.md`](docs/getting-started.md): install (CDN or npm), a full working example, and what `createStory` does.
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
