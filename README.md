# ScrollyLite

Declarative scrollytelling visualization grammar for browser ESM. Authors
describe story steps, chart idioms, semantic object identity, and transitions;
ScrollyLite renders the sticky visualization and scroll interaction with D3.

## CDN Usage

Load the runtime CSS, ScrollyLite, D3, and Arquero:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/scrollylite@0.1.0/dist/scrollylite.css">
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

The top-level package exports the small stable surface:

```js
import {
  createStory,
  story,
  bar,
  line,
  point,
  unit,
  defineChartIdiom,
  registerChartIdiom,
  registerChartModule,
  availableChartIdioms
} from "scrollylite";
```

Built-in chart idioms are canonical only: `bar`, `line`, `point`, and `unit`.
There are no alias keys.

Type definitions ship with the package at `dist/index.d.ts`.

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
https://cdn.jsdelivr.net/gh/SonghaiFan/scrolly-grammar-template@0.1.0/dist/scrollylite.esm.js
```

For GitHub CDN links, commit `dist/` before tagging because GitHub CDN does not
run the build step for you.

## Docs

- `docs/api-summary.md`: current story, view, and runtime API.
- `docs/spec-schema-and-authoring.md`: spec schema and authoring grammar.
- `docs/phase-1-scene-transitions.md`: scene transition compiler design.
- `src/charts/README.md`: chart idiom folder contract.

## License

MIT
