# Chart Idiom Folders

ScrollyLite is designed to run as a browser ESM library from a CDN URL. That
means runtime code cannot scan `src/charts/` or discover new files dynamically.
Every built-in chart idiom is therefore represented by one folder plus a
generated static ESM manifest.

## Folder Contract

Each chart idiom lives in:

```text
src/charts/<idiom>/
```

The folder becomes a plugin when it exposes:

```text
src/charts/<idiom>/index.js
```

That file should export:

```js
export function createChartIdiom(deps = {}) {
  return {
    key: "<idiom>",
    renderer,
    prepareSpec,
    resolveTransitionPlan,
    intermediateSpecs,
    defaultMargin,
    inspect
  };
}
```

Only `key` and `renderer` are required. The rest are optional hooks filled by
the registry defaults.

## CDN-Compatible Registration

The runtime imports:

```js
import { chartModules } from "./charts/manifest.js";
```

`manifest.js` is static ESM so it can be served directly from a CDN. It is
generated from folders that expose `index.js`.

After adding or removing an idiom folder, run:

```sh
node scripts/sync-chart-manifest.mjs
```

Then publish or serve the updated source. The browser never scans directories;
the manifest is the CDN-safe list of built-in modules.

## Bar Ground Truth

All bar-specific code lives under `src/charts/bar/`, including authoring,
rendering, transition planning, layout renderers, keys, and semantic diff
helpers. The generic `src/grammar/` package may re-export `bar()` for
convenience, but it does not own the bar idiom implementation.
